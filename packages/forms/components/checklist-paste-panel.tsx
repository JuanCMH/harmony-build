"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChecklistItem } from "@/convex/lib/form_types";
import { useMemo, useState } from "react";

import { describePaste } from "../lib/checklist-editing";
import { parseChecklistItems } from "../lib/checklist-scales";

/**
 * Pegar los ítems de una vez, desde Word o desde una hoja de cálculo: nadie va
 * a teclear sesenta y tres ítems uno a uno.
 *
 * Una línea es un ítem; la que acaba en «:» agrupa a las siguientes con
 * sangría o guion; con «bloques», una línea vacía empieza uno nuevo. La
 * conversión es `parseChecklistItems`, y aquí sólo se enseña su resultado.
 */
export const ChecklistPastePanel = ({
  onAdd,
  onCancel,
}: {
  onAdd: (blocks: ChecklistItem[][], splitBlocks: boolean) => void;
  onCancel: () => void;
}) => {
  const [text, setText] = useState("");
  const [splitBlocks, setSplitBlocks] = useState(false);
  const parsed = useMemo(
    () => parseChecklistItems(text, { splitBlocks }),
    [text, splitBlocks],
  );

  return (
    <section
      aria-labelledby="checklist-paste-title"
      className="space-y-3 rounded-lg border bg-muted/30 p-3"
    >
      <div className="space-y-1">
        <h3
          id="checklist-paste-title"
          className="text-sm font-medium tracking-tight"
        >
          Pegar lista
        </h3>
        <p className="text-xs text-muted-foreground">
          Un ítem por línea. Una línea que acaba en «:» agrupa a las siguientes
          que lleven sangría o guion.
        </p>
      </div>
      <Label htmlFor="checklist-paste-text" className="sr-only">
        Ítems pegados
      </Label>
      <Textarea
        id="checklist-paste-text"
        autoFocus
        className="min-h-40 bg-background font-mono text-sm"
        placeholder={
          "Nivel de aceite\nNivel de refrigerante\nLuces:\n  - Altas\n  - Bajas"
        }
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <label
        htmlFor="checklist-paste-split"
        className="flex items-center gap-2 text-sm"
      >
        <Checkbox
          id="checklist-paste-split"
          checked={splitBlocks}
          onCheckedChange={(checked) => setSplitBlocks(checked === true)}
        />
        Una línea vacía empieza un bloque nuevo
      </label>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-ui text-muted-foreground" role="status">
          {describePaste(parsed, splitBlocks)}
        </p>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          disabled={parsed.length === 0}
          onClick={() => onAdd(parsed, splitBlocks)}
        >
          Añadir a la lista
        </Button>
      </div>
    </section>
  );
};
