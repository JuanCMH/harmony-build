"use client";

import { DatePicker } from "@/components/harmony/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type ChecklistAnswer,
  type ChecklistBlock,
  type ChecklistConfig,
  type ChecklistItem,
  FORM_LIMITS,
} from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { ListChecks } from "lucide-react";
import { useState } from "react";

import {
  answerableItems,
  answersByItem,
  checklistProgress,
  defaultOkOption,
  fillBlock,
  needsNote,
  optionByValue,
  patchAnswer,
} from "../lib/checklist";
import {
  MEANING_DOT,
  MEANING_SELECTED,
  OPTION_COLUMNS,
} from "../lib/checklist-styles";
import { toDate, toDateValue } from "../lib/date-value";

interface ChecklistFieldControlProps {
  /** El id del campo: de él salen los de cada ítem, para llevar el foco al
   *  primero que falta. */
  id: string;
  config: ChecklistConfig;
  value: readonly ChecklistAnswer[];
  disabled: boolean;
  /** Tras un intento de envío: se señala lo que falta. */
  showMissing: boolean;
  required: boolean;
  onChange: (value: ChecklistAnswer[]) => void;
}

export const checklistItemId = (fieldId: string, itemId: string) =>
  `${fieldId}-item-${itemId}`;

/**
 * La lista de chequeo para diligenciar.
 *
 * Pensada para el pulgar (`03 §6.2`): en el teléfono cada ítem es su texto y,
 * debajo, la escala a lo ancho, con botones de 40px de alto. En escritorio la
 * escala se va a la derecha del texto y la lista gana densidad. La observación
 * aparece sola al marcar no conforme, que es cuando hace falta.
 */
export const ChecklistFieldControl = ({
  id,
  config,
  value,
  disabled,
  showMissing,
  required,
  onChange,
}: ChecklistFieldControlProps) => {
  const answers = answersByItem(value);
  const progress = checklistProgress(config, value);
  const okOption = defaultOkOption(config);
  const showBlockTitles =
    config.blocks.length > 1 || Boolean(config.blocks[0]?.label);

  return (
    <div className="overflow-clip rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-ui text-muted-foreground">
        <p className="tabular-nums">
          <span className="font-medium text-foreground">
            {progress.answered}
          </span>{" "}
          de {progress.total} respondidos
        </p>
        {(["fail", "na"] as const).map((meaning) =>
          progress.byMeaning[meaning] > 0 ? (
            <p key={meaning} className="flex items-center gap-1.5 tabular-nums">
              <span
                aria-hidden
                className={cn("size-2 rounded-full", MEANING_DOT[meaning])}
              />
              {progress.byMeaning[meaning]}{" "}
              {meaning === "fail" ? "no conformes" : "no aplica"}
            </p>
          ) : null,
        )}
      </div>

      {config.blocks.map((block, index) => (
        <ChecklistBlockRows
          key={block.id}
          fallbackTitle={`Bloque ${index + 1}`}
          fieldId={id}
          block={block}
          config={config}
          answers={answers}
          disabled={disabled}
          showMissing={showMissing}
          required={required}
          showTitle={showBlockTitles}
          onAnswer={(itemId, patch) =>
            onChange(patchAnswer(config, value, itemId, patch))
          }
          onFill={
            okOption
              ? () =>
                  onChange(fillBlock(config, value, block.id, okOption.value))
              : undefined
          }
          fillLabel={okOption ? `Todo «${okOption.label}»` : ""}
        />
      ))}
    </div>
  );
};

interface ChecklistBlockRowsProps {
  fieldId: string;
  block: ChecklistBlock;
  config: ChecklistConfig;
  answers: Map<string, ChecklistAnswer>;
  disabled: boolean;
  showMissing: boolean;
  required: boolean;
  showTitle: boolean;
  /** Lo que se lee cuando el bloque no tiene título y hay más de uno. */
  fallbackTitle: string;
  fillLabel: string;
  onAnswer: (
    itemId: string,
    patch: Partial<Omit<ChecklistAnswer, "itemId">>,
  ) => void;
  onFill?: () => void;
}

/** 40px en teléfono y 36px desde `sm`, como todo control del formulario
 *  (`03 §6.2`). Se repite aquí y no se importa de `form-field.tsx` porque ese
 *  módulo importa éste. */
const EXTRA_CONTROL_HEIGHT = "h-10 sm:h-9";

const ChecklistBlockRows = ({
  fieldId,
  block,
  config,
  answers,
  disabled,
  showMissing,
  required,
  showTitle,
  fallbackTitle,
  fillLabel,
  onAnswer,
  onFill,
}: ChecklistBlockRowsProps) => {
  const items = answerableItems(block);
  const answered = items.filter(
    (item) => optionByValue(config, answers.get(item.id)?.value) !== undefined,
  ).length;
  const isComplete = answered === items.length;

  return (
    <section aria-label={block.label || fallbackTitle}>
      {/* Se queda a la vista al desplazar: en una lista de sesenta ítems es lo
          que dice en qué parte del equipo se está. */}
      <div className="sticky top-12 z-[1] flex min-h-11 items-center gap-2 border-y bg-muted px-3 py-1.5">
        <div className="min-w-0 flex-1">
          {showTitle && (
            <h3 className="truncate text-sm font-medium">
              {block.label || fallbackTitle}
            </h3>
          )}
          <p className="text-xs text-muted-foreground tabular-nums">
            {answered} de {items.length}
          </p>
        </div>
        {onFill && !disabled && !isComplete && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onFill}
          >
            <ListChecks />
            {fillLabel}
          </Button>
        )}
      </div>

      <ul className="divide-y divide-border/60">
        {block.items.map((item) =>
          item.heading ? (
            <li
              key={item.id}
              className="px-3 pt-3 pb-1 text-ui font-medium text-muted-foreground"
            >
              {item.label}
            </li>
          ) : (
            <ChecklistItemRow
              key={item.id}
              elementId={checklistItemId(fieldId, item.id)}
              item={item}
              config={config}
              answer={answers.get(item.id)}
              disabled={disabled}
              showMissing={showMissing}
              required={required}
              onAnswer={(patch) => onAnswer(item.id, patch)}
            />
          ),
        )}
      </ul>
    </section>
  );
};

interface ChecklistItemRowProps {
  elementId: string;
  item: ChecklistItem;
  config: ChecklistConfig;
  answer: ChecklistAnswer | undefined;
  disabled: boolean;
  showMissing: boolean;
  required: boolean;
  onAnswer: (patch: Partial<Omit<ChecklistAnswer, "itemId">>) => void;
}

const ChecklistItemRow = ({
  elementId,
  item,
  config,
  answer,
  disabled,
  showMissing,
  required,
  onAnswer,
}: ChecklistItemRowProps) => {
  const selected = optionByValue(config, answer?.value);
  const noteIsRequired =
    config.note === "onFail" && selected?.meaning === "fail";
  const noteIsMissing = needsNote(config, answer);
  const isUnanswered = selected === undefined;

  // La observación opcional se abre a mano; la obligatoria y la ya escrita,
  // solas.
  const [noteOpened, setNoteOpened] = useState(false);
  const showNote =
    config.note !== "never" &&
    (noteIsRequired || Boolean(answer?.note) || noteOpened);
  const canOpenNote = config.note !== "never" && !showNote && !disabled;

  const missing = showMissing
    ? isUnanswered && required
      ? "Falta responder"
      : noteIsMissing
        ? "Escribe qué encontraste"
        : null
    : null;

  const labelId = `${elementId}-label`;
  const hasExtras = Boolean(config.quantity || config.date);

  return (
    <li
      id={elementId}
      tabIndex={-1}
      className={cn(
        "scroll-mt-28 space-y-2 px-3 py-3 outline-none",
        item.indented && "pl-6",
        missing && "bg-destructive/5",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <p id={labelId} className="text-sm leading-snug">
            {item.label}
          </p>
          {missing && (
            <p className="mt-0.5 text-xs font-medium text-destructive">
              {missing}
            </p>
          )}
        </div>

        <div
          role="radiogroup"
          aria-labelledby={labelId}
          className={cn(
            "grid shrink-0 gap-1.5 sm:flex",
            OPTION_COLUMNS[config.options.length] ?? "grid-cols-3",
          )}
        >
          {config.options.map((option) => {
            const isSelected = selected?.value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={option.label}
                title={option.label}
                disabled={disabled}
                onClick={() =>
                  onAnswer({ value: isSelected ? undefined : option.value })
                }
                className={cn(
                  "h-10 min-w-14 rounded-md border px-2 text-sm font-medium outline-none transition-colors sm:h-8",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "disabled:pointer-events-none disabled:opacity-50",
                  isSelected
                    ? MEANING_SELECTED[option.meaning]
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30",
                )}
              >
                {option.short}
              </button>
            );
          })}
        </div>
      </div>

      {hasExtras && (
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          {/* Las dos celdas tienen la misma forma —rótulo en bloque, control
              debajo, la misma altura—: con el rótulo en línea en una y en
              bloque en la otra, la cantidad quedaba 4px por debajo de la
              fecha. */}
          {config.quantity && (
            <label className="flex min-w-0 flex-col gap-1">
              <span className="block text-xs text-muted-foreground">
                {config.quantity.label}
              </span>
              <Input
                type="number"
                className={EXTRA_CONTROL_HEIGHT}
                inputMode="numeric"
                min={0}
                value={answer?.quantity ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  onAnswer({
                    quantity:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  })
                }
              />
            </label>
          )}
          {config.date && (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="block text-xs text-muted-foreground">
                {config.date.label}
              </span>
              <DatePicker
                className={cn("w-full", EXTRA_CONTROL_HEIGHT)}
                clearable
                placeholder="Sin fecha"
                date={toDate(answer?.date)}
                disabled={disabled}
                onSelect={(date) =>
                  onAnswer({ date: date ? toDateValue(date) : undefined })
                }
              />
            </div>
          )}
        </div>
      )}

      {showNote && (
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">
            Observación{noteIsRequired ? " (obligatoria)" : ""}
          </span>
          <Textarea
            value={answer?.note ?? ""}
            disabled={disabled}
            maxLength={FORM_LIMITS.maxNoteLength}
            aria-invalid={showMissing && noteIsMissing}
            placeholder="Qué encontraste y dónde"
            onChange={(event) => onAnswer({ note: event.target.value })}
          />
        </label>
      )}

      {canOpenNote && !isUnanswered && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-6 px-0 text-xs text-muted-foreground"
          onClick={() => setNoteOpened(true)}
        >
          Añadir observación
        </Button>
      )}
    </li>
  );
};
