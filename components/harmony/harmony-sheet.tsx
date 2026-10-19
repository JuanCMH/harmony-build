"use client";

import * as React from "react";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/* ---------------------------------- Root ---------------------------------- */

interface HarmonySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxWidth?: string;
  /** Un panel que se abre para mirar, no para escribir: sin foco en el
   *  primer campo, que en el teléfono saca el teclado y tapa el panel. */
  noAutoFocus?: boolean;
  children: React.ReactNode;
}

function HarmonySheet({
  open,
  onOpenChange,
  maxWidth = "sm:max-w-lg",
  noAutoFocus = false,
  children,
}: HarmonySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* `w-full` gana al `w-3/4` del primitivo: en móvil un panel que deja
          ver un cuarto de la pantalla detrás sólo sirve para truncar títulos.
          A partir de `sm` manda el `maxWidth` de cada panel. */}
      <SheetContent
        className={cn("flex w-full flex-col gap-0", maxWidth)}
        onOpenAutoFocus={
          noAutoFocus ? (event) => event.preventDefault() : undefined
        }
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

/* --------------------------------- Header --------------------------------- */

interface HarmonySheetHeaderProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  description?: string;
}

function HarmonySheetHeader({
  icon: Icon,
  iconClassName = "bg-h-indigo/10 border-h-indigo/10 text-h-indigo",
  title,
  description,
}: HarmonySheetHeaderProps) {
  return (
    <>
      <SheetHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center size-10 rounded-xl border",
              iconClassName,
            )}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <SheetTitle className="text-base font-semibold tracking-tight">
              {title}
            </SheetTitle>
            {description && (
              <SheetDescription className="text-sm">
                {description}
              </SheetDescription>
            )}
          </div>
        </div>
      </SheetHeader>
      <Separator className="opacity-40" />
    </>
  );
}

/* --------------------------------- Toolbar -------------------------------- */

interface HarmonySheetToolbarProps {
  children: React.ReactNode;
  className?: string;
}

function HarmonySheetToolbar({
  children,
  className,
}: HarmonySheetToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------- Content -------------------------------- */

interface HarmonySheetContentProps {
  children: React.ReactNode;
  className?: string;
}

/** El cuerpo del panel. `p-4`, el mismo aire que el header y el footer.
 *
 *  Era `px-2 pb-4`: sin espacio arriba y con la mitad de margen lateral que el
 *  header, así que todo contenido arrancaba pegado al separador y ocho píxeles
 *  a la izquierda del título que lo nombra. Ocho de los veintiún sheets lo
 *  parcheaban a mano con `px-4` o `pt-2`, cada uno a su manera; el 21 de
 *  septiembre de 2026 se corrigió aquí y se retiraron los parches. */
function HarmonySheetContent({
  children,
  className,
}: HarmonySheetContentProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className={cn("flex flex-col gap-2 p-4", className)}>{children}</div>
    </div>
  );
}

/* --------------------------------- Footer --------------------------------- */

interface HarmonySheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

function HarmonySheetFooter({ children, className }: HarmonySheetFooterProps) {
  return (
    <>
      <Separator className="opacity-40" />
      <div className={cn("flex items-center gap-2 p-4", className)}>
        {children}
      </div>
    </>
  );
}

/* --------------------------------- Exports -------------------------------- */

export {
  HarmonySheet,
  HarmonySheetHeader,
  HarmonySheetToolbar,
  HarmonySheetContent,
  HarmonySheetFooter,
  SheetClose,
};
