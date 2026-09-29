"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type ChecklistBlock,
  type ChecklistConfig,
  type ChecklistItem,
  FORM_LIMITS,
} from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ClipboardPaste,
  CornerDownRight,
  Heading,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  addBlock,
  addItem,
  appendPasted,
  canIndent,
  countChecklistItems,
  moveBlock,
  moveChecklistItem,
  removeBlock,
  removeItem,
  renameBlock,
  renameItem,
  toggleHeading,
  toggleIndented,
} from "../lib/checklist-editing";
import { ChecklistPastePanel } from "./checklist-paste-panel";
import { ChecklistScaleEditor } from "./checklist-scale-editor";

const ItemRow = ({
  item,
  index,
  items,
  autoFocus,
  onRename,
  onEnter,
  onMove,
  onToggleHeading,
  onToggleIndented,
  onRemove,
}: {
  item: ChecklistItem;
  index: number;
  items: readonly ChecklistItem[];
  autoFocus: boolean;
  onRename: (label: string) => void;
  onEnter: () => void;
  onMove: (offset: -1 | 1) => void;
  onToggleHeading: () => void;
  onToggleIndented: () => void;
  onRemove: () => void;
}) => {
  const name = item.label || `Ítem ${index + 1}`;
  return (
    <li
      className={cn(
        "flex items-center gap-2",
        // La sangría es la del papel: el subítem cuelga de su fila.
        item.indented && "pl-6",
      )}
    >
      {item.indented ? (
        <CornerDownRight
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
      <Input
        autoFocus={autoFocus}
        aria-label={
          item.heading
            ? `Fila que agrupa ${index + 1}`
            : item.indented
              ? `Subítem ${index + 1}`
              : `Ítem ${index + 1}`
        }
        placeholder={item.heading ? "Fila que agrupa, sin respuesta" : "Ítem"}
        className={cn("h-8", item.heading && "font-medium")}
        value={item.label}
        onChange={(event) => onRename(event.target.value)}
        onKeyDown={(event) => {
          // Enter escribe el siguiente, como en una lista de papel.
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter();
          }
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 shrink-0 text-muted-foreground"
            aria-label={`Acciones de ${name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
            <ArrowUp className="size-4" />
            Subir
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === items.length - 1}
            onSelect={() => onMove(1)}
          >
            <ArrowDown className="size-4" />
            Bajar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onToggleHeading}>
            <Heading className="size-4" />
            {item.heading
              ? "Convertir en ítem"
              : "Convertir en fila que agrupa"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={
              !!item.heading || (!item.indented && !canIndent(items, index))
            }
            onSelect={onToggleIndented}
          >
            <CornerDownRight className="size-4" />
            {item.indented ? "Sacar del grupo" : "Convertir en subítem"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onRemove}>
            <Trash2 className="size-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
};

const BlockCard = ({
  block,
  index,
  count,
  focusItemId,
  isFull,
  onChange,
  onAddItem,
}: {
  block: ChecklistBlock;
  index: number;
  count: number;
  focusItemId: string | null;
  isFull: boolean;
  onChange: (change: (config: ChecklistConfig) => ChecklistConfig) => void;
  onAddItem: (afterItemId?: string) => void;
}) => {
  const name = block.label || `Bloque ${index + 1}`;
  return (
    <li className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          aria-label={`Título del bloque ${index + 1}`}
          placeholder={
            count > 1
              ? `Bloque ${index + 1}, sin título`
              : "Sin título: la lista es un solo bloque"
          }
          className="h-8 font-medium"
          value={block.label}
          onChange={(event) =>
            onChange((config) =>
              renameBlock(config, block.id, event.target.value),
            )
          }
        />
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 text-muted-foreground"
          aria-label={`Subir ${name}`}
          disabled={index === 0}
          onClick={() => onChange((config) => moveBlock(config, block.id, -1))}
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 text-muted-foreground"
          aria-label={`Bajar ${name}`}
          disabled={index === count - 1}
          onClick={() => onChange((config) => moveBlock(config, block.id, 1))}
        >
          <ArrowDown className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Eliminar ${name}`}
          disabled={count <= 1}
          onClick={() => onChange((config) => removeBlock(config, block.id))}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {block.items.length > 0 ? (
        <ol className="space-y-1.5">
          {block.items.map((item, itemIndex) => (
            <ItemRow
              key={item.id}
              item={item}
              index={itemIndex}
              items={block.items}
              autoFocus={item.id === focusItemId}
              onRename={(label) =>
                onChange((config) =>
                  renameItem(config, block.id, item.id, label),
                )
              }
              onEnter={() => onAddItem(item.id)}
              onMove={(offset) =>
                onChange((config) =>
                  moveChecklistItem(config, block.id, item.id, offset),
                )
              }
              onToggleHeading={() =>
                onChange((config) => toggleHeading(config, block.id, item.id))
              }
              onToggleIndented={() =>
                onChange((config) => toggleIndented(config, block.id, item.id))
              }
              onRemove={() =>
                onChange((config) => removeItem(config, block.id, item.id))
              }
            />
          ))}
        </ol>
      ) : (
        <p className="text-ui text-muted-foreground">
          Este bloque no tiene ítems.
        </p>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        disabled={isFull}
        onClick={() => onAddItem()}
      >
        <Plus className="size-4" />
        Añadir ítem
      </Button>
    </li>
  );
};

/**
 * Los ítems de una lista de chequeo y su escala.
 *
 * Dos pestañas: los ítems, que es lo que se edita casi siempre y lo que crece
 * —sesenta y tres en una preoperacional—, y la escala con lo que se pide por
 * ítem, que se elige una vez. Enter en un ítem escribe el siguiente, y «Pegar
 * lista» añade de una vez los que ya están en Word o en la hoja de cálculo.
 */
export const ChecklistEditor = ({
  config,
  onChange,
}: {
  config: ChecklistConfig;
  onChange: (config: ChecklistConfig) => void;
}) => {
  const [tab, setTab] = useState<"items" | "scale">("items");
  const [isPasting, setIsPasting] = useState(false);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);

  const total = countChecklistItems(config);
  const isFull = total >= FORM_LIMITS.maxChecklistItems;
  const apply = (change: (current: ChecklistConfig) => ChecklistConfig) =>
    onChange(change(config));

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as "items" | "scale")}
      className="gap-0"
    >
      <TabsList>
        <TabsTrigger value="items" className="min-w-fit px-3">
          Ítems
        </TabsTrigger>
        <TabsTrigger value="scale" className="min-w-fit px-3">
          Escala y observación
        </TabsTrigger>
      </TabsList>

      <TabsContent value="items" className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-ui text-muted-foreground tabular-nums">
            {total} de {FORM_LIMITS.maxChecklistItems} ítems ·{" "}
            {config.blocks.length}{" "}
            {config.blocks.length === 1 ? "bloque" : "bloques"}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={isPasting}
            onClick={() => setIsPasting(true)}
          >
            <ClipboardPaste className="size-4" />
            Pegar lista
          </Button>
          <Button size="sm" variant="outline" onClick={() => apply(addBlock)}>
            <Plus className="size-4" />
            Añadir bloque
          </Button>
        </div>

        {isPasting ? (
          <ChecklistPastePanel
            onCancel={() => setIsPasting(false)}
            onAdd={(blocks, splitBlocks) => {
              apply((current) => appendPasted(current, blocks, splitBlocks));
              setIsPasting(false);
            }}
          />
        ) : null}

        <ol className="space-y-3">
          {config.blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              count={config.blocks.length}
              focusItemId={focusItemId}
              isFull={isFull}
              onChange={apply}
              onAddItem={(afterItemId) => {
                if (isFull) return;
                const added = addItem(config, block.id, afterItemId);
                onChange(added.config);
                setFocusItemId(added.itemId);
              }}
            />
          ))}
        </ol>
      </TabsContent>

      <TabsContent value="scale" className="mt-3">
        <ChecklistScaleEditor config={config} onChange={onChange} />
      </TabsContent>
    </Tabs>
  );
};
