"use client";

import { PageLoading } from "@/components/harmony/page-loading";
import {
  ResponsiveBreadcrumb,
  type BreadcrumbItemData,
} from "@/components/ui/responsive-breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  PAGE_HEADER_CLASS,
  PAGE_MAIN_VARIANTS,
  PAGE_SHELL_CLASS,
  type PageMainVariant,
} from "@/components/harmony/page-shell.utils";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ReactNode, Ref } from "react";

/**
 * El armazón de página de `03 §2.1`, en un solo sitio.
 *
 * Antes de existir, la aplicación tenía **cinco alturas de cabecera** medidas en
 * vivo —36, 48, 56, 57 y 96 píxeles—, dos pantallas con dos cabeceras, dos con
 * tres y **diecisiete** variantes de clase de `<main>`, de las que la directriz
 * sólo documentaba dos. Es lo que producía la sensación de que dos pantallas no
 * eran de la misma aplicación.
 *
 * No inventa nada: reproduce el canon literal. Si el canon cambia, cambia aquí.
 */

export const PageShell = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <div className={cn(PAGE_SHELL_CLASS, className)}>
    {children}
  </div>
);

interface PageHeaderProps {
  /** Migas de pan. `03 §2.2` las exige en toda vista anidada. */
  breadcrumb?: BreadcrumbItemData[];
  /** Acciones de la vista. Van a la derecha y **nunca** flotando sobre el
   *  contenido (`03 §2.2`). */
  actions?: ReactNode;
  /** Para las pocas cabeceras que necesitan algo entre las migas y las
   *  acciones. Si acaba usándose en todas partes, es que falta una regla. */
  children?: ReactNode;
}

export const PageHeader = ({
  breadcrumb,
  actions,
  children,
}: PageHeaderProps) => {
  // El nombre de la pantalla es la última miga: la que no lleva enlace.
  const titulo = breadcrumb?.[breadcrumb.length - 1]?.label;

  return (
  <header className={PAGE_HEADER_CLASS}>
    {/* Ninguna pantalla de Harmony tenía encabezado: el nombre vivía sólo
        dentro del `<nav>` de las migas, así que el documento no tenía `h1` y
        los `h2` de secciones —los de `/ajustes`, por ejemplo— colgaban de la
        nada. Se emite oculto porque el diseño ya muestra ese nombre en las
        migas y repetirlo a la vista sería redundante (`03 §2.2`). */}
    {titulo && <h1 className="sr-only">{titulo}</h1>}
    <div className="flex items-center gap-2 px-2 w-full min-w-0">
      <SidebarTrigger />
      {/* Las migas se encogen antes que las acciones: sin `min-w-0 flex-1`
          la barra tomaba el ancho de las tres migas más los botones y, con
          el menú abierto a 1024px, abría un scroll horizontal en toda la
          pantalla. */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="min-w-0 flex-1">
          <ResponsiveBreadcrumb items={breadcrumb} />
        </div>
      )}
      {children}
      {actions && (
        <div className="ml-auto flex shrink-0 items-end gap-2">{actions}</div>
      )}
    </div>
  </header>
  );
};

/**
 * El contenido de la página.
 *
 * Renderiza un `<section>`, no un `<main>`, aunque `03 §2.1` escriba `<main>`:
 * `SidebarInset` (`components/ui/sidebar.tsx:309`) **ya es** el `<main>` de la
 * página, así que seguir el canon al pie de la letra deja dos landmarks `main`
 * en el documento —HTML inválido, y un lector de pantalla anunciando dos
 * contenidos principales—. Medido en la aplicación antes de esta pieza: las
 * páginas de listado ya traían dos. La directriz queda corregida en `03 §2.1`.
 */
interface PageMainProps {
  variant: PageMainVariant;
  /** El estado de carga se pinta **dentro** del armazón, nunca en su lugar.
   *  Devolverlo antes que la cabecera hace que la barra desaparezca y
   *  reaparezca: es el salto de retícula que prohíbe `03 §2.4`, y hoy lo hacen
   *  cuatro listados. */
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
  /** Alguna vista mide o desplaza su propio contenido. React 19 pasa `ref` como
   *  una prop más, así que no hace falta `forwardRef`. */
  ref?: Ref<HTMLElement>;
  /** Opcional: una pantalla que sólo está cargando no tiene contenido que dar. */
  children?: ReactNode;
}

export const PageMain = ({
  variant,
  isLoading,
  loadingText,
  className,
  ref,
  children,
}: PageMainProps) => (
  <section ref={ref} className={cn(PAGE_MAIN_VARIANTS[variant], className)}>
    {isLoading ? (
      <PageLoading icon={Loader2} iconSpin text={loadingText} />
    ) : (
      children
    )}
  </section>
);
