"use client";

import { useCurrentUser } from "@/packages/auth/api";
import {
  deserializeLoggedError,
  registerLogSink,
  unregisterLogSink,
  type LogEntry,
} from "@/lib/logging";
import { useConvexAuth } from "convex/react";
import { useParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

/**
 * Observabilidad del **cliente**: envía a PostHog lo que hoy moría en la
 * consola del navegador.
 *
 * QUÉ CUBRE Y QUÉ NO. Esto es la mitad del cuadro: los errores de render,
 * navegación y red del frontend. Las excepciones de las funciones Convex
 * (mutations, crons, actions) llegan por otra vía: la integración nativa de
 * Convex (Settings → Integrations → Exception Reporting), que exige plan
 * Professional y se configura con el token del proyecto, sin código.
 *
 * SIN CLAVE NO HACE NADA. Si `NEXT_PUBLIC_POSTHOG_KEY` no está definida, el
 * provider no inicializa nada y `logError` sigue escribiendo sólo en consola.
 * Es lo que permite desarrollar y correr los tests sin cuenta ni red.
 *
 * PRIVACIDAD. Un proyecto nuevo de PostHog llega con grabación de sesión y
 * autocaptura ENCENDIDAS desde su configuración remota. Aquí eso grabaría
 * nombres, documentos y datos reales de la obra, y la autocaptura manda el
 * texto de cada elemento pulsado. Se desactivan **desde el código** y
 * no desde el dashboard a propósito: así la decisión viaja con el repo y no
 * depende de una casilla que alguien puede volver a marcar sin enterarse.
 *
 * Queda encendido lo que sirve para depurar sin exponer a nadie: excepciones
 * (con su traza) y `$pageview`. Las URLs llevan ids opacos de Convex, no datos
 * personales. `person_profiles: "identified_only"` evita además crear un perfil
 * por cada visitante anónimo.
 *
 * Si algún día se quiere grabación de sesión para soporte, no basta con darle
 * la vuelta a esta bandera: hay que configurar antes el enmascarado de campos.
 */
export function ObservabilityProvider() {
  const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_exceptions: true,
      // Ver el bloque PRIVACIDAD de arriba antes de tocar cualquiera de estas.
      disable_session_recording: true,
      autocapture: false,
      disable_surveys: true,
    });

    // El sink recibe TODO lo que pasa por `lib/logging.ts`. Sólo se reenvían
    // los `error`: los `warn`/`info` son ruido operativo y consumirían cupo de
    // excepciones sin decir nada que no diga ya el log de consola.
    registerLogSink((entry: LogEntry) => {
      if (entry.level !== "error") return;
      const { error, ...context } = entry.context;
      posthog.captureException(deserializeLoggedError(entry.event, error), {
        event: entry.event,
        env: entry.env,
        ...context,
      });
    });

    return () => unregisterLogSink();
  }, []);

  return enabled ? <ObservabilityIdentity /> : null;
}

/**
 * Ata cada error a **quién** lo sufrió y **dónde**. Sin esto un fallo en
 * PostHog es anónimo y no hay forma de saber a qué proyecto avisar.
 *
 * Se envía el id opaco del usuario y el del proyecto de la URL, nada más: ni
 * nombre, ni correo. Es un componente aparte para que la consulta del usuario
 * sólo se suscriba cuando la observabilidad está activa; con `"skip"` tampoco
 * se paga antes de iniciar sesión.
 */
function ObservabilityIdentity() {
  const { isAuthenticated } = useConvexAuth();
  const { data: user } = useCurrentUser(isAuthenticated ? {} : "skip");
  const params = useParams<{ projectId?: string }>();
  const projectId = params?.projectId;

  useEffect(() => {
    if (user?._id) {
      posthog.identify(user._id);
    } else if (!isAuthenticated) {
      // Al cerrar sesión se suelta la identidad para que el siguiente usuario
      // del mismo navegador no herede los errores del anterior.
      posthog.reset();
    }
  }, [user?._id, isAuthenticated]);

  useEffect(() => {
    // Propiedad que viaja con cada evento mientras se está dentro de un
    // proyecto; se retira al salir para no atribuir errores de la lista de
    // proyectos al último visitado.
    if (projectId) posthog.register({ projectId });
    else posthog.unregister("projectId");
  }, [projectId]);

  return null;
}
