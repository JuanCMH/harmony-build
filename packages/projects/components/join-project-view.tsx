"use client";

import {
  HarmonyModalContent,
  HarmonyModalFooter,
} from "@/components/harmony/harmony-modal";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { JOIN_CODE_LENGTH } from "@/convex/lib/join_codes";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { Loader2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useJoinProject } from "../api";
import { JoinCodeField } from "./join-code-field";

interface JoinProjectViewProps {
  /** El botón que acompaña al de unirse: «Cancelar» en el modal, «Volver» en
   *  la bienvenida. */
  secondaryAction: ReactNode;
  onJoined: (projectId: Id<"projects">) => void;
}

/** El cuerpo y el pie de unirse a un proyecto con su código. */
export const JoinProjectView = ({
  secondaryAction,
  onJoined,
}: JoinProjectViewProps) => {
  const formId = useId();
  const [joinCode, setJoinCode] = useState("");
  const { mutate: joinProject, isPending } = useJoinProject();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Sin esto el formulario navegaba y recargaba la página al enviar.
    e.preventDefault();

    joinProject(
      { joinCode },
      {
        onSuccess: (projectId) => {
          toast.success("Te has unido correctamente al proyecto");
          onJoined(projectId);
        },
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <>
      <HarmonyModalContent>
        <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
          <p className="text-sm text-muted-foreground">
            Pide el código a alguien del proyecto que pueda invitar. Entras como
            miembro, y un administrador te asigna después tu rol.
          </p>
          <JoinCodeField
            id={`${formId}-code`}
            label="Código del proyecto"
            codeLength={JOIN_CODE_LENGTH}
            value={joinCode}
            disabled={isPending}
            onChange={setJoinCode}
          />
        </form>
      </HarmonyModalContent>
      <HarmonyModalFooter>
        {secondaryAction}
        <Button
          type="submit"
          form={formId}
          disabled={isPending || joinCode.length !== JOIN_CODE_LENGTH}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Unirse
        </Button>
      </HarmonyModalFooter>
    </>
  );
};
