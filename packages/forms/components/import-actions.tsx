"use client";

import { Hint } from "@/components/harmony/hint";
import { Button } from "@/components/ui/button";
import type { FormSection } from "@/convex/lib/form_types";
import { usePermissions } from "@/packages/roles/store/use-permissions";
import { FileClock, FileUp } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import type { ImportForm } from "../lib/use-import-wizard";
import { ImportsSheet } from "./sheets/imports-sheet";

// El asistente arrastra el lector de archivos: sólo se carga al abrirlo
// (`02 §1`).
const ImportModal = dynamic(
  () => import("./modals/import-modal").then((module) => module.ImportModal),
  { ssr: false },
);

interface ImportActionsProps {
  form: ImportForm;
  /** Las secciones de la versión publicada. */
  sections: readonly FormSection[];
  /** Si el formato está publicado: sólo entonces se importa. */
  canImportNow: boolean;
}

/**
 * «Importar» y el historial de importaciones, en la barra de un formato o de
 * un listado.
 *
 * Sólo para quien tiene la llave, y sólo desde `md`: asignar columnas y
 * valores es una tarea de escritorio (diseño, «Desde qué tamaño se diseñó»).
 * El servidor vuelve a comprobar la llave en cada paso.
 */
export const ImportActions = ({
  form,
  sections,
  canImportNow,
}: ImportActionsProps) => {
  const { can } = usePermissions();
  const [isImporting, setIsImporting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  // El modal se monta la primera vez que se abre, y ya no se desmonta: así
  // cierra con su animación.
  const [wasOpened, setWasOpened] = useState(false);

  if (!can(["importResponses"])) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <Hint label="Importaciones">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Importaciones"
          onClick={() => setIsHistoryOpen(true)}
        >
          <FileClock />
        </Button>
      </Hint>
      {canImportNow ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setWasOpened(true);
            setIsImporting(true);
          }}
        >
          <FileUp />
          Importar
        </Button>
      ) : null}
      <ImportsSheet
        form={form}
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />
      {wasOpened ? (
        <ImportModal
          form={form}
          sections={sections}
          open={isImporting}
          onOpenChange={setIsImporting}
        />
      ) : null}
    </div>
  );
};
