"use client";

import {
  PageHeader,
  PageMain,
  PageShell,
} from "@/components/harmony/page-shell";
import type { BreadcrumbItemData } from "@/components/ui/responsive-breadcrumb";
import { createContext, useContext, type ReactNode } from "react";

/**
 * Un área de ajustes: la unidad que el sidebar de ajustes abre a su derecha.
 *
 * Todas las áreas comparten migas, ancho y ritmo; lo único suyo es el
 * contenido. El ancho es **uno solo** —`max-w-3xl`, centrado—: con un ancho
 * por área, el contenido salta al cambiar de pantalla.
 *
 * Una fila de catálogo que cruza 1.800px para poner un nombre a la izquierda y
 * un valor a la derecha no se lee, se rastrea.
 */

/** Verdadero mientras se pinta dentro de un área de ajustes. */
const DentroDelArea = createContext(false);

/**
 * Lo usan `SettingsSection` y `CollectionItem` para saber dónde están montados.
 *
 * La misma sección se puede ver en dos sitios: sola, ocupando su área de
 * ajustes, y acompañada de otras dentro de una ficha. En el primer caso el
 * sidebar ya dice qué es —el icono y el título repetidos dentro son la
 * redundancia que prohíbe `03 §2.2`—; en el segundo, el icono es lo que
 * distingue una sección de la siguiente. Es contexto y no una prop porque si no
 * habría que pasarla por cada sección y sus filas, una por una.
 */
export const useEstaEnAreaDeAjustes = () => useContext(DentroDelArea);

export const SettingsArea = ({
  breadcrumb,
  children,
}: {
  /** `Torre Mirador ▸ Ajustes ▸ Roles`. `03 §2.2` las exige. */
  breadcrumb: BreadcrumbItemData[];
  children: ReactNode;
}) => (
  <PageShell>
    <PageHeader breadcrumb={breadcrumb} />
    {/* El aire es del tamaño de la referencia: en Linear el título de la
        pantalla no arranca pegado a la barra, y el contenido no termina a ras
        del borde inferior. Es la variante `lectura` de `03 §2.1`, no una
        anulación del padding de la de listado. */}
    <PageMain variant="lectura">
      <DentroDelArea.Provider value>{children}</DentroDelArea.Provider>
    </PageMain>
  </PageShell>
);

/**
 * El bloque de contenido de un área.
 *
 * Linear encajona lo que es **finito** —los cuatro métodos de notificación, los
 * estados de un flujo— y deja a sangre lo que crece sin tope. La caja no está
 * ahí de adorno: agrupa un conjunto que se lee entero.
 */
export const SettingsCard = ({ children }: { children: ReactNode }) => (
  <div className="divide-y divide-border/60 overflow-hidden rounded-xl border bg-card">
    {children}
  </div>
);

/**
 * La lista de datos de un área: etiqueta a la izquierda, valor a la derecha.
 *
 * Es la forma que toma un ajuste que se lee más de lo que se cambia —el
 * código, la fecha de creación, los colores—. Sin ella cada área inventaba su propia
 * tarjeta, y una tarjeta de 100px flotando en un panel vacío es exactamente el
 * hueco raro que este rediseño venía a quitar.
 */
export const SettingsFieldList = ({ children }: { children: ReactNode }) => (
  <dl className="divide-y divide-border/60">{children}</dl>
);

export const SettingsField = ({
  label,
  action,
  children,
}: {
  label: string;
  /** El control que cambia este dato, si se cambia desde aquí. */
  action?: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
    {/* En móvil la etiqueta va encima: con 390px de ancho, una columna fija de
        160px deja el valor partido en dos líneas. */}
    <dt className="text-ui text-muted-foreground sm:w-44 sm:shrink-0">
      {label}
    </dt>
    <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

/**
 * Una acción del pie de un área: qué hace, qué implica y su botón.
 *
 * Transferir la propiedad y eliminar no son datos que se lean: son decisiones
 * que se explican antes de tomarse. Van al pie porque son las más raras, y sin
 * el bloque rojo permanente que ocupaba alto fijo en la pantalla anterior.
 */
export const SettingsActionRow = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) => (
  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-ui leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
    <div className="shrink-0">{action}</div>
  </div>
);
