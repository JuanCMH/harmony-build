"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import { useGetProjects } from "@/packages/projects/api";
import { pickDefaultProject } from "@/packages/projects/lib/default-project";
import {
  useCreateProjectJoinModal,
  useIsLoggingOut,
} from "@/packages/projects/store/use-create-project-join-modal";
import { useIsLeavingProject } from "@/packages/projects/store/use-is-leaving-project";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * La puerta de la aplicación: no enseña nada suyo, decide a dónde ir.
 *
 * Con proyectos, abre el primero activo; sin ninguno, la bienvenida. Es el
 * destino tras iniciar sesión y el de la aplicación instalada.
 */
export default function ProjectsPage() {
  const router = useRouter();
  const [welcomeOpen, setWelcomeOpen] = useCreateProjectJoinModal();
  const [isLoggingOut, setIsLoggingOut] = useIsLoggingOut();
  const [, setIsLeaving] = useIsLeavingProject();
  const { data: projects } = useGetProjects();

  // Quien llega aquí ya salió del proyecto que dejaba, y quien llega con
  // sesión ya no la está cerrando: las dos banderas son de la visita anterior.
  useEffect(() => {
    setIsLeaving(false);
    setIsLoggingOut(false);
  }, [setIsLeaving, setIsLoggingOut]);

  useEffect(() => {
    // `undefined` mientras carga; `null` si la sesión ya no está.
    if (!projects) return;

    const project = pickDefaultProject(projects);
    if (project) {
      setWelcomeOpen(false);
      router.replace(`/projects/${project._id}`);
      return;
    }

    // Depende de `welcomeOpen` a propósito: si la bienvenida se cierra sin
    // elegir, se vuelve a abrir. Sin proyecto no hay aplicación que enseñar.
    if (!welcomeOpen && !isLoggingOut) setWelcomeOpen(true);
  }, [projects, welcomeOpen, isLoggingOut, setWelcomeOpen, router]);

  // Decidir lleva una consulta: sin esto la pantalla quedaba en blanco y no
  // se sabía si había cargado mal. No se pinta si la bienvenida está delante,
  // que entonces el fondo es suyo.
  if (welcomeOpen) return null;

  return (
    <div className="flex min-h-svh w-full flex-col">
      <PageLoading
        icon={Loader2}
        iconSpin
        text="Se está abriendo tu proyecto."
      />
    </div>
  );
}
