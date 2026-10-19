"use client";

import {
  HarmonySheet,
  HarmonySheetContent,
  HarmonySheetHeader,
} from "@/components/harmony/harmony-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import type { FormKind } from "@/convex/lib/form_types";
import { useConfirm } from "@/hooks/use-confirm";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { FileClock, Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useListImports, useRevertImport } from "../../api";
import {
  importCountsText,
  importStatusBadge,
  pendingRows,
  revertMessage,
} from "../../lib/import-history";
import { momentText } from "../../lib/response-reading";
import { STATUS_TONE_CLASS } from "../../lib/status";
import { ListEmpty } from "../list-empty";

type ImportRecord = NonNullable<
  ReturnType<typeof useListImports>["data"]
>[number];

interface ImportsSheetProps {
  form: { _id: Id<"forms">; kind: FormKind; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Las importaciones de un formato: quién trajo qué, cuándo, y «Deshacer».
 *
 * Deshacer retira la importación **entera**; es el único borrado de
 * respuestas que existe, y por eso confirma con su recuento (`03 §3.3`).
 */
export const ImportsSheet = ({
  form,
  open,
  onOpenChange,
}: ImportsSheetProps) => {
  const { data: imports, isLoading } = useListImports(
    open ? { formId: form._id } : "skip",
  );
  const { mutate: revert, isPending } = useRevertImport();
  const [target, setTarget] = useState<ImportRecord | null>(null);

  const [ConfirmDialog, confirm] = useConfirm({
    title: "Deshacer la importación",
    message: target ? revertMessage(target.counts, form.kind) : "",
    type: "critical",
    confirmText: "Deshacer",
  });

  const handleRevert = async (record: ImportRecord) => {
    setTarget(record);
    if (!(await confirm())) return;
    revert(
      { importId: record._id },
      {
        onSuccess: () => toast.success("Importación deshecha correctamente"),
        onError: (error) => handleConvexErrorCallback(error),
      },
    );
  };

  return (
    <>
      <ConfirmDialog />
      <HarmonySheet open={open} onOpenChange={onOpenChange}>
        <HarmonySheetHeader
          icon={FileClock}
          title="Importaciones"
          description={`Lo que se trajo a ${form.name} desde un archivo.`}
        />
        <HarmonySheetContent>
          {isLoading ? (
            <div aria-busy="true" className="space-y-3">
              <span className="sr-only">Cargando las importaciones…</span>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : !imports || imports.length === 0 ? (
            <ListEmpty
              icon={FileClock}
              title="Todavía no se ha importado nada aquí."
              hint="Cada importación queda en esta lista, y desde ella se puede deshacer entera."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {imports.map((record) => {
                const badge = importStatusBadge(record.status);
                const pending = pendingRows(record.counts);
                return (
                  <li
                    key={record._id}
                    className="flex items-start gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="min-w-0 text-sm font-medium break-all">
                          {record.fileName}
                        </p>
                        {badge ? (
                          <Badge
                            variant="outline"
                            className={STATUS_TONE_CLASS[badge.tone]}
                          >
                            {badge.label}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-ui text-muted-foreground tabular-nums">
                        {importCountsText(record.counts, form.kind)}
                        {record.status === "running" && pending > 0
                          ? ` · ${pending.toLocaleString("es-CO")} sin enviar`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {record.author} · {momentText(record._creationTime)}
                      </p>
                      {record.revertedAt !== null ? (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          Deshecha por {record.revertedBy ?? "alguien"} ·{" "}
                          {momentText(record.revertedAt)}
                        </p>
                      ) : null}
                    </div>
                    {record.canRevert ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => void handleRevert(record)}
                      >
                        {isPending && target?._id === record._id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Undo2 />
                        )}
                        Deshacer
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </HarmonySheetContent>
      </HarmonySheet>
    </>
  );
};
