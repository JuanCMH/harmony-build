"use client";

import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_FILE_SIZE_MB,
  FIELD_SIZES,
  type FieldSize,
  type FieldType,
  type FormField,
  FULL_WIDTH_TYPES,
  MAX_FILE_SIZE_MB,
  RECIPES_BY_TYPE,
} from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import {
  type CatalogNames,
  describeTypeConfig,
  parseOptionalNumber,
} from "../lib/field-config-text";
import {
  describeFormats,
  FILE_FORMAT_GROUPS,
  hasFormatGroup,
  toggleFormatGroup,
} from "../lib/file-formats";
import { describeComputed, describeVisibility } from "../lib/field-rules";
import { FIELD_SIZE_LABEL } from "../lib/grid";
import {
  type BehaviorFocus,
  useFieldBehaviorSheet,
} from "../store/use-field-behavior-sheet";
import { useFieldTypeSheet } from "../store/use-field-type-sheet";
import { FormOptionsEditor } from "./form-options-editor";
import { allowsAutoValue } from "./sheets/field-behavior-sheet";

/**
 * El ejemplo del «Texto de ejemplo», por tipo. Un tipo que no está no enseña
 * texto de ejemplo. En una casilla es el texto que va a su lado.
 */
const PLACEHOLDER_EXAMPLE: Partial<Record<FieldType, string>> = {
  text: "Ej.: Juan Pérez",
  textarea: "Ej.: Detalles del hallazgo",
  email: "Ej.: nombre@empresa.com",
  phone: "Ej.: 300 123 4567",
  url: "Ej.: https://empresa.com",
  number: "Ej.: 8",
  currency: "Ej.: 1.500.000",
  select: "Ej.: Elige",
  checkbox: "Sí",
};

/** Lo que abre el editor propio del tipo, dicho en su botón. */
const TYPE_EDITOR_ACTION: Partial<Record<FieldType, string>> = {
  checklist: "Editar ítems y escala",
  table: "Editar columnas",
  reference: "Elegir listado y datos",
};

/** Un apartado del panel: título, una línea de ayuda y lo que se configura. */
export const ConfigBlock = ({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: ReactNode;
}) => (
  <section className="space-y-3">
    <div className="space-y-1">
      <h3 className="text-sm font-medium tracking-tight">{title}</h3>
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
    {children}
  </section>
);

/** Una fila de estado: el nombre a la izquierda, el estado en gris a la
 *  derecha y un chevrón, porque abre algo. */
export const StatusRow = ({
  title,
  status,
  onOpen,
}: {
  title: string;
  status: string;
  onOpen: () => void;
}) => (
  <button
    type="button"
    onClick={onOpen}
    className="flex min-h-10 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
  >
    <span className="shrink-0 text-sm">{title}</span>
    <span className="ml-auto line-clamp-2 min-w-0 text-right text-ui text-muted-foreground">
      {status}
    </span>
    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
  </button>
);

/** Dos números de un rango —longitud, valor—, uno al lado del otro. */
const RangeInputs = ({
  idPrefix,
  labels,
  min,
  max,
  integer,
  onChange,
}: {
  idPrefix: string;
  labels: [string, string];
  min: number | undefined;
  max: number | undefined;
  integer: boolean;
  onChange: (min: number | undefined, max: number | undefined) => void;
}) => (
  <div className="grid grid-cols-2 gap-2">
    {([0, 1] as const).map((side) => (
      <div key={side} className="space-y-2">
        <Label htmlFor={`${idPrefix}-${side}`}>{labels[side]}</Label>
        <Input
          id={`${idPrefix}-${side}`}
          type="number"
          inputMode={integer ? "numeric" : "decimal"}
          min={integer ? 0 : undefined}
          placeholder="Sin límite"
          value={(side === 0 ? min : max) ?? ""}
          onChange={(event) => {
            const value = parseOptionalNumber(event.target.value, integer);
            if (side === 0) onChange(value, max);
            else onChange(min, value);
          }}
        />
      </div>
    ))}
  </div>
);

/**
 * La configuración de un campo: **lo que un campo es** —etiqueta, ayuda,
 * tamaño, texto de ejemplo, opciones, límites— y su configuración propia.
 *
 * Lo que un campo **hace** —cuándo se muestra, cómo se calcula, qué sugiere—
 * se resume aquí en filas de estado y se edita en el sheet de comportamiento;
 * lo que su tipo necesita y no cabe aquí —los ítems de una lista de chequeo,
 * las columnas de una tabla—, en su propio sheet.
 */
export const FormFieldConfig = ({
  field,
  fields,
  catalogNames,
  onChange,
}: {
  field: FormField;
  /** Los del formato y los datos de la respuesta: la frase de una regla
   *  nombra a otros campos. */
  fields: readonly FormField[];
  catalogNames: CatalogNames;
  onChange: (next: FormField) => void;
}) => {
  const [, setBehavior] = useFieldBehaviorSheet();
  const [, setTypeSheet] = useFieldTypeSheet();
  const openBehavior = (focus: BehaviorFocus) =>
    setBehavior({ fieldId: field.id, focus });

  const set = (patch: Partial<FormField>) => onChange({ ...field, ...patch });
  const setConfig = (patch: Partial<FormField["config"]>) =>
    onChange({ ...field, config: { ...field.config, ...patch } });

  const example = PLACEHOLDER_EXAMPLE[field.type];
  const isFullWidth = FULL_WIDTH_TYPES.includes(field.type);
  const hasCondition = (field.config.visibility?.rules.length ?? 0) > 0;
  const suggestions = field.config.autoValue?.rules.length ?? 0;
  const formats = field.config.acceptedFormats ?? [];
  const typeSummary = describeTypeConfig(field, catalogNames);
  const typeAction = TYPE_EDITOR_ACTION[field.type];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="field-config-label">Etiqueta</Label>
          <Input
            id="field-config-label"
            value={field.label}
            onChange={(event) => set({ label: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="field-config-description">Ayuda</Label>
          <Textarea
            id="field-config-description"
            className="h-16 resize-none"
            placeholder="Se muestra bajo la etiqueta. Opcional."
            value={field.description ?? ""}
            onChange={(event) =>
              set({ description: event.target.value || undefined })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={cn("space-y-2", !example && "col-span-2")}>
            <Label htmlFor="field-config-size">Tamaño</Label>
            <Select
              value={field.size}
              disabled={isFullWidth}
              onValueChange={(size) => set({ size: size as FieldSize })}
            >
              <SelectTrigger id="field-config-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {FIELD_SIZE_LABEL[size]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {example ? (
            <div className="space-y-2">
              <Label htmlFor="field-config-placeholder">
                {field.type === "checkbox"
                  ? "Texto al lado"
                  : "Texto de ejemplo"}
              </Label>
              <Input
                id="field-config-placeholder"
                placeholder={example}
                value={field.placeholder ?? ""}
                onChange={(event) =>
                  set({ placeholder: event.target.value || undefined })
                }
              />
            </div>
          ) : null}
        </div>
        {isFullWidth ? (
          <p className="text-xs text-muted-foreground">
            {field.type === "textarea"
              ? "Un texto largo"
              : field.type === "table"
                ? "Una tabla"
                : "Una lista de chequeo"}{" "}
            ocupa siempre la fila entera.
          </p>
        ) : null}

        <div className="divide-y divide-border/60 rounded-lg border">
          <label className="flex min-h-10 items-center justify-between gap-3 px-3 py-2 text-sm">
            {/* Un condicional sí puede exigirse: se exige cuando se muestra.
                Un calculado no, porque no lo rellena nadie. */}
            {hasCondition ? "Obligatorio (cuando se muestra)" : "Obligatorio"}
            <Switch
              checked={field.required}
              disabled={!!field.config.computed}
              onCheckedChange={(checked) => set({ required: checked })}
            />
          </label>
          <label className="flex min-h-10 items-center justify-between gap-3 px-3 py-2 text-sm">
            Columna en la tabla de respuestas
            <Switch
              checked={field.showInTable}
              onCheckedChange={(checked) => set({ showInTable: checked })}
            />
          </label>
        </div>
      </div>

      {typeAction ? (
        <>
          <Separator className="opacity-40" />
          <ConfigBlock title="Configuración" help={typeSummary ?? undefined}>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setTypeSheet(field.id)}
            >
              {typeAction}
              <ChevronRight className="size-4 text-muted-foreground" />
            </Button>
          </ConfigBlock>
        </>
      ) : null}

      {field.type === "signature" ? (
        <>
          <Separator className="opacity-40" />
          <ConfigBlock
            title="Quién firma"
            help="Si firma otra persona —quien recibe la dotación—, el campo pide su nombre y su documento."
          >
            <Select
              value={field.config.signature?.signer ?? "author"}
              onValueChange={(signer) =>
                setConfig({
                  signature: { signer: signer as "author" | "other" },
                })
              }
            >
              <SelectTrigger aria-label="Quién firma" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="author">Quien diligencia</SelectItem>
                <SelectItem value="other">Otra persona</SelectItem>
              </SelectContent>
            </Select>
          </ConfigBlock>
        </>
      ) : null}

      {field.type === "select" || field.type === "multiSelect" ? (
        <>
          <Separator className="opacity-40" />
          <ConfigBlock title="Opciones">
            <FormOptionsEditor
              options={field.config.options ?? []}
              onChange={(options) => setConfig({ options })}
            />
          </ConfigBlock>
        </>
      ) : null}

      {field.type === "text" || field.type === "textarea" ? (
        <>
          <Separator className="opacity-40" />
          <ConfigBlock
            title="Longitud"
            help="En caracteres. Vacío es sin límite."
          >
            <RangeInputs
              idPrefix="field-config-length"
              labels={["Mínima", "Máxima"]}
              min={field.config.minLength}
              max={field.config.maxLength}
              integer
              onChange={(minLength, maxLength) =>
                setConfig({ minLength, maxLength })
              }
            />
          </ConfigBlock>
        </>
      ) : null}

      {field.type === "number" || field.type === "currency" ? (
        <>
          <Separator className="opacity-40" />
          <ConfigBlock title="Valores admitidos" help="Vacío es sin límite.">
            <RangeInputs
              idPrefix="field-config-value"
              labels={["Mínimo", "Máximo"]}
              min={field.config.minValue}
              max={field.config.maxValue}
              integer={false}
              onChange={(minValue, maxValue) =>
                setConfig({ minValue, maxValue })
              }
            />
          </ConfigBlock>
        </>
      ) : null}

      {field.type === "file" || field.type === "image" ? (
        <>
          <Separator className="opacity-40" />
          <ConfigBlock
            title="Archivo"
            help="Lo que se admite al adjuntar. Se comprueba también al guardar."
          >
            {field.type === "file" ? (
              <div className="space-y-2">
                <p id="field-config-formats" className="text-sm font-medium">
                  Formatos admitidos
                </p>
                <div
                  role="group"
                  aria-labelledby="field-config-formats"
                  className="flex flex-wrap gap-2"
                >
                  {FILE_FORMAT_GROUPS.map((group) => {
                    const isActive = hasFormatGroup(formats, group);
                    return (
                      <Badge
                        key={group.id}
                        asChild
                        variant={isActive ? "default" : "outline"}
                      >
                        <button
                          type="button"
                          aria-pressed={isActive}
                          className="min-h-6 cursor-pointer"
                          onClick={() =>
                            setConfig({
                              acceptedFormats: toggleFormatGroup(
                                formats,
                                group,
                              ),
                            })
                          }
                        >
                          {group.label}
                        </button>
                      </Badge>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formats.length === 0
                    ? "Sin elegir ninguno se admite cualquier formato."
                    : `Sólo se admite ${describeFormats(formats)}.`}
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="field-config-max-size">Tamaño máximo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="field-config-max-size"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_FILE_SIZE_MB}
                  className="w-24"
                  // Vacío es «el de siempre», y se enseña como ejemplo. Fuera
                  // de rango lo dice la validación, no un recorte silencioso.
                  placeholder={String(DEFAULT_FILE_SIZE_MB)}
                  value={field.config.maxFileSize ?? ""}
                  onChange={(event) =>
                    setConfig({
                      maxFileSize: parseOptionalNumber(
                        event.target.value,
                        true,
                      ),
                    })
                  }
                />
                <span className="text-sm text-muted-foreground">
                  MB, hasta {MAX_FILE_SIZE_MB}
                </span>
              </div>
            </div>
          </ConfigBlock>
        </>
      ) : null}

      <Separator className="opacity-40" />
      <ConfigBlock
        title="Comportamiento"
        help="Cuándo se muestra, cómo se calcula y qué valor sugiere."
      >
        <div className="divide-y divide-border/60 rounded-lg border">
          <StatusRow
            title="Visibilidad"
            status={describeVisibility(field, fields) ?? "Siempre visible"}
            onOpen={() => openBehavior("visibility")}
          />
          {RECIPES_BY_TYPE[field.type] ? (
            <StatusRow
              title="Valor"
              status={
                describeComputed(field, fields) ?? "Lo escribe quien diligencia"
              }
              onOpen={() => openBehavior("value")}
            />
          ) : null}
          {allowsAutoValue(field) ? (
            <StatusRow
              title="Valor sugerido"
              status={
                suggestions === 0
                  ? "Ninguno"
                  : `${suggestions} ${suggestions === 1 ? "regla" : "reglas"}`
              }
              onOpen={() => openBehavior("autoValue")}
            />
          ) : null}
        </div>
      </ConfigBlock>
    </div>
  );
};
