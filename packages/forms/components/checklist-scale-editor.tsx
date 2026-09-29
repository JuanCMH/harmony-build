"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CHECKLIST_MEANINGS,
  type ChecklistConfig,
  type ChecklistMeaning,
  type ChecklistNoteMode,
  type ChecklistOption,
  FORM_LIMITS,
} from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

import {
  CHECKLIST_SCALES,
  type ChecklistScaleId,
  MEANING_OPTION_LABEL,
  matchScale,
  newScaleOption,
  scaleOptions,
} from "../lib/checklist-scales";
import { MEANING_DOT, MEANING_TINT } from "../lib/checklist-styles";

/** «Personalizada» en el selector de plantilla: una escala cambiada a mano. */
const CUSTOM_SCALE = "custom";

const NOTE_LABEL: Record<ChecklistNoteMode, string> = {
  never: "No se pide",
  optional: "Opcional en todos los ítems",
  onFail: "Obligatoria al marcar no conforme",
};

/** Un dato más por ítem —cantidad o fecha—, con el nombre de su columna. */
const ExtraColumn = ({
  id,
  title,
  help,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  title: string;
  help: string;
  placeholder: string;
  value: { label: string } | undefined;
  onChange: (value: { label: string } | undefined) => void;
}) => (
  <div className="space-y-2 px-3 py-3">
    <label
      htmlFor={`${id}-switch`}
      className="flex items-center justify-between gap-3 text-sm"
    >
      <span className="space-y-0.5">
        <span className="block">{title}</span>
        <span className="block text-xs text-muted-foreground">{help}</span>
      </span>
      <Switch
        id={`${id}-switch`}
        checked={value !== undefined}
        onCheckedChange={(checked) =>
          onChange(checked ? { label: placeholder } : undefined)
        }
      />
    </label>
    {value ? (
      <Input
        aria-label={`Nombre de la columna: ${title.toLowerCase()}`}
        className="h-8"
        placeholder={placeholder}
        value={value.label}
        onChange={(event) => onChange({ label: event.target.value })}
      />
    ) : null}
  </div>
);

const OptionRow = ({
  option,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  option: ChecklistOption;
  index: number;
  canRemove: boolean;
  onChange: (option: ChecklistOption) => void;
  onRemove: () => void;
}) => (
  <li className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,10rem)_2rem] items-center gap-2">
    <Input
      aria-label={`Nombre de la opción ${index + 1}`}
      className="h-8"
      value={option.label}
      onChange={(event) => onChange({ ...option, label: event.target.value })}
    />
    <Input
      aria-label={`Letra de la opción ${index + 1}`}
      className="h-8 text-center"
      maxLength={FORM_LIMITS.maxChecklistShort}
      value={option.short}
      onChange={(event) => onChange({ ...option, short: event.target.value })}
    />
    <Select
      value={option.meaning}
      onValueChange={(meaning) =>
        onChange({ ...option, meaning: meaning as ChecklistMeaning })
      }
    >
      <SelectTrigger
        size="sm"
        aria-label={`Sentido de la opción ${index + 1}`}
        className="w-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CHECKLIST_MEANINGS.map((meaning) => (
          <SelectItem key={meaning} value={meaning}>
            <span
              aria-hidden
              className={cn("size-2 rounded-full", MEANING_DOT[meaning])}
            />
            {MEANING_OPTION_LABEL[meaning]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button
      size="icon"
      variant="ghost"
      className="size-8 text-muted-foreground hover:text-destructive"
      aria-label={`Quitar la opción ${option.label || index + 1}`}
      disabled={!canRemove}
      onClick={onRemove}
    >
      <Trash2 className="size-3.5" />
    </Button>
  </li>
);

/**
 * La escala con que se responde cada ítem y lo que se pide además de ella.
 *
 * Se parte de una de las cinco plantillas del cliente y se puede cambiar a
 * mano: el nombre, la letra que se lee en el botón y el **sentido** —conforme,
 * no conforme, no aplica—, que es lo que pinta el color y lo que exige la
 * observación.
 */
export const ChecklistScaleEditor = ({
  config,
  onChange,
}: {
  config: ChecklistConfig;
  onChange: (config: ChecklistConfig) => void;
}) => {
  const scaleId = matchScale(config.options) ?? CUSTOM_SCALE;
  const options = config.options;
  const setOptions = (next: ChecklistOption[]) =>
    onChange({ ...config, options: next });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium tracking-tight">Escala</h3>
          <p className="text-xs text-muted-foreground">
            Con qué se responde cada ítem. El sentido de cada opción decide su
            color y cuenta los no conformes.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="checklist-scale">Plantilla</Label>
          <Select
            value={scaleId}
            onValueChange={(id) => {
              if (id !== CUSTOM_SCALE) {
                setOptions(scaleOptions(id as ChecklistScaleId));
              }
            }}
          >
            <SelectTrigger id="checklist-scale" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHECKLIST_SCALES.map((scale) => (
                <SelectItem key={scale.id} value={scale.id}>
                  {scale.label}
                </SelectItem>
              ))}
              {scaleId === CUSTOM_SCALE ? (
                <SelectItem value={CUSTOM_SCALE} disabled>
                  Personalizada
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div
            aria-hidden
            className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,10rem)_2rem] gap-2 text-xs text-muted-foreground"
          >
            <span>Nombre</span>
            <span className="text-center">Letra</span>
            <span>Sentido</span>
          </div>
          <ol className="space-y-2">
            {options.map((option, index) => (
              <OptionRow
                // La posición es la identidad mientras se edita: el valor de
                // una opción no cambia, pero dos pueden coincidir un instante.
                key={index}
                option={option}
                index={index}
                canRemove={options.length > FORM_LIMITS.minChecklistOptions}
                onChange={(next) =>
                  setOptions(
                    options.map((current, position) =>
                      position === index ? next : current,
                    ),
                  )
                }
                onRemove={() =>
                  setOptions(
                    options.filter((_, position) => position !== index),
                  )
                }
              />
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={options.length >= FORM_LIMITS.maxChecklistOptions}
              onClick={() => setOptions([...options, newScaleOption(options)])}
            >
              <Plus className="size-4" />
              Añadir opción
            </Button>
            <div className="flex flex-wrap items-center gap-1" aria-hidden>
              {options.map((option, index) => (
                <span
                  key={index}
                  className={cn(
                    "rounded-sm border px-2 py-0.5 text-ui font-medium",
                    MEANING_TINT[option.meaning],
                  )}
                >
                  {option.short || "?"}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium tracking-tight">
            Además, por ítem
          </h3>
          <p className="text-xs text-muted-foreground">
            Lo que se pide junto a la escala. Cantidad y fecha convierten la
            lista en la inspección de un botiquín.
          </p>
        </div>
        <div className="divide-y divide-border/60 rounded-lg border">
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <Label htmlFor="checklist-note" className="font-normal">
              Observación
            </Label>
            <Select
              value={config.note}
              onValueChange={(note) =>
                onChange({ ...config, note: note as ChecklistNoteMode })
              }
            >
              <SelectTrigger
                id="checklist-note"
                size="sm"
                className="w-full sm:w-80"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(NOTE_LABEL) as ChecklistNoteMode[]).map(
                  (mode) => (
                    <SelectItem key={mode} value={mode}>
                      {NOTE_LABEL[mode]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <ExtraColumn
            id="checklist-quantity"
            title="Pedir cantidad"
            help="Un número por ítem: la cantidad actual."
            placeholder="Cantidad"
            value={config.quantity}
            onChange={(quantity) => onChange({ ...config, quantity })}
          />
          <ExtraColumn
            id="checklist-date"
            title="Pedir fecha"
            help="Una fecha por ítem: la de vencimiento."
            placeholder="Fecha de vencimiento"
            value={config.date}
            onChange={(date) => onChange({ ...config, date })}
          />
        </div>
      </section>
    </div>
  );
};
