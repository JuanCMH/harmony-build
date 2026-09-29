"use client";

import {
  HarmonyModal,
  HarmonyModalContent,
  HarmonyModalFooter,
  HarmonyModalHeader,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { useSignOut } from "@/packages/auth/api";
import { ChevronRight, HardHat, LogIn, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useCreateProjectJoinModal,
  useIsLoggingOut,
} from "../../store/use-create-project-join-modal";
import { CreateProjectView } from "../create-project-view";
import { JoinProjectView } from "../join-project-view";

type View = "welcome" | "create" | "join";

/** El título repite la opción que abrió la vista: quien pulsó «Unirse con
 *  código» tiene que leer eso arriba, no otra cosa. */
const HEADERS: Record<
  View,
  { icon: LucideIcon; title: string; description: string }
> = {
  welcome: {
    icon: HardHat,
    title: "¡Bienvenido a Harmony Build!",
    description: "Para comenzar, elige una de las dos opciones.",
  },
  create: {
    icon: HardHat,
    title: "Crear un proyecto",
    description: "Un proyecto reúne a su equipo, sus roles y sus registros.",
  },
  join: {
    icon: LogIn,
    title: "Unirse con código",
    description: "Entra a un proyecto que ya existe.",
  },
};

const OPTIONS: {
  view: Exclude<View, "welcome">;
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    view: "create",
    icon: HardHat,
    title: "Crear un proyecto",
    description: "Empieza una obra nueva y luego invita a tu equipo.",
  },
  {
    view: "join",
    icon: LogIn,
    title: "Unirse con código",
    description: "Alguien del proyecto te compartió un código de unión.",
  },
];

/**
 * La bienvenida: lo que ve quien entra sin pertenecer a ningún proyecto.
 *
 * La abre `/projects`, y la vuelve a abrir si se cierra sin elegir: sin
 * proyecto no hay aplicación que enseñar. La única otra salida es cerrar
 * sesión.
 */
export const CreateProjectJoinModal = () => {
  const router = useRouter();
  const signOut = useSignOut();
  const [open, setOpen] = useCreateProjectJoinModal();
  const [, setIsLoggingOut] = useIsLoggingOut();
  const [view, setView] = useState<View>("welcome");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setView("welcome");
  };

  const handleDone = (projectId: Id<"projects">) => {
    handleOpenChange(false);
    router.push(`/projects/${projectId}`);
  };

  const handleSignOut = () => {
    setIsLoggingOut(true);
    handleOpenChange(false);
    void signOut();
  };

  const back = (
    <Button variant="outline" onClick={() => setView("welcome")}>
      Volver
    </Button>
  );

  return (
    <HarmonyModal open={open} onOpenChange={handleOpenChange}>
      <HarmonyModalHeader {...HEADERS[view]} />
      {view === "welcome" ? (
        <>
          <HarmonyModalContent className="space-y-2">
            {OPTIONS.map((option) => (
              <button
                key={option.view}
                type="button"
                onClick={() => setView(option.view)}
                className="group flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-h-indigo/10 bg-h-indigo/10 text-h-indigo">
                  <option.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{option.title}</p>
                  <p className="mt-0.5 text-ui text-muted-foreground">
                    {option.description}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </HarmonyModalContent>
          <HarmonyModalFooter className="justify-start">
            <Button variant="ghost" onClick={handleSignOut}>
              Cerrar sesión
            </Button>
          </HarmonyModalFooter>
        </>
      ) : view === "create" ? (
        <CreateProjectView secondaryAction={back} onCreated={handleDone} />
      ) : (
        <JoinProjectView secondaryAction={back} onJoined={handleDone} />
      )}
    </HarmonyModal>
  );
};
