"use client";

import { DatePicker } from "@/components/harmony/date-picker";
import { TimePicker } from "@/components/harmony/time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/harmony/currency-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  ChecklistAnswer,
  FormField,
  TableColumn,
} from "@/convex/lib/form_types";
import { isEmptyValue } from "@/convex/lib/stored_values";
import { cn } from "@/lib/utils";

import { toDate, toDateValue } from "../lib/date-value";
import { ChecklistFieldControl } from "./checklist-field-control";
import {
  MultiSelectFieldControl,
  SelectFieldControl,
} from "./choice-field-control";
import { ComputedFieldValue } from "./computed-field-value";
import { FileFieldControl } from "./file-field-control";
import { ReferenceFieldControl } from "./reference-field-control";
import { SignatureFieldControl } from "./signature-field-control";
import { TableFieldControl } from "./table-field-control";

/** Lo que un control necesita saber de dónde está, además de su campo. */
export interface FormFieldContext {
  /** El formato que tiene el campo: autoriza la subida de archivos y dice de
   *  qué listado sale una relación. `null` en el lienzo del constructor, donde
   *  el campo se enseña y no se usa. */
  formId: Id<"forms"> | null;
  /** Quién diligencia: firma cuando el campo es de firma del autor. */
  authorName: string;
}

export interface FormFieldInputProps {
  /** El id del control en el documento: a él apunta su `Label`. */
  id: string;
  field: FormField;
  /** El valor en memoria (`FieldValue`), o un archivo o firma todavía sin
   *  subir (`PendingFile`, `PendingSignature`). En un campo derivado, lo que
   *  vale ahora: quien envuelve el control lo calcula. */
  value: unknown;
  disabled: boolean;
  /** Tras un intento de envío: se señala lo que falta. */
  showMissing: boolean;
  context: FormFieldContext;
  onChange: (value: unknown) => void;
}

/** 40px en teléfono, 36px desde `sm` (`03 §6.2`). */
export const CONTROL_HEIGHT = "h-10 sm:h-9";

/** Una celda de tabla, vista como un campo pequeño: así se pinta con los
 *  mismos controles que el formato. Una firma en una celda la hace siempre
 *  otra persona —quien recibe—, así que pide su nombre. */
const columnAsField = (column: TableColumn): FormField => ({
  id: column.id,
  type: column.type,
  label: column.label,
  required: column.required,
  size: "full",
  showInTable: false,
  config: {
    ...(column.options ? { options: column.options } : {}),
    ...(column.reference ? { reference: column.reference } : {}),
    ...(column.type === "signature"
      ? { signature: { signer: "other" as const } }
      : {}),
  },
});

/** En una celda de relación, el campo que la tiene es la tabla. */
interface ReferenceOwner {
  fieldId: string;
  columnId?: string;
}

const inputType = (type: FormField["type"]) => {
  switch (type) {
    case "number":
      return "number";
    case "email":
      return "email";
    case "phone":
      return "tel";
    case "url":
      return "url";
    default:
      return "text";
  }
};

/**
 * El control de un campo, según su tipo. Lo usan el formulario de captura y el
 * lienzo del constructor, que lo pinta deshabilitado: lo que se ve al diseñar
 * es lo que sale.
 *
 * Sólo pinta el control. La etiqueta, la ayuda y el mensaje de error son de
 * quien lo envuelve (`FormFieldFrame`).
 */
export const FormFieldInput = (props: FormFieldInputProps) => (
  <FieldControl {...props} owner={{ fieldId: props.field.id }} />
);

const FieldControl = ({
  id,
  field,
  value,
  disabled,
  showMissing,
  context,
  onChange,
  owner,
}: FormFieldInputProps & { owner: ReferenceOwner }) => {
  const text = typeof value === "string" ? value : "";
  const isMissing =
    showMissing && field.required && isEmptyValue(field, value);

  // Un derivado no se escribe: se lee lo que vale, y se ve que se calcula.
  if (field.config.computed) {
    return <ComputedFieldValue id={id} field={field} value={value} />;
  }

  switch (field.type) {
    case "checklist":
      return field.config.checklist ? (
        <ChecklistFieldControl
          id={id}
          config={field.config.checklist}
          value={Array.isArray(value) ? (value as ChecklistAnswer[]) : []}
          disabled={disabled}
          showMissing={showMissing}
          required={field.required}
          onChange={onChange}
        />
      ) : null;

    case "signature":
      return (
        <SignatureFieldControl
          id={id}
          config={field.config.signature ?? { signer: "author" }}
          value={value}
          authorName={context.authorName}
          disabled={disabled}
          invalid={isMissing}
          onChange={onChange}
        />
      );

    case "file":
    case "image":
      return (
        <FileFieldControl
          id={id}
          label={field.label}
          kind={field.type}
          acceptedFormats={field.config.acceptedFormats}
          maxFileSize={field.config.maxFileSize}
          value={value}
          disabled={disabled}
          invalid={isMissing}
          onChange={onChange}
        />
      );

    case "reference":
      return (
        <ReferenceFieldControl
          id={id}
          label={field.label}
          config={field.config.reference}
          formId={context.formId}
          fieldId={owner.fieldId}
          columnId={owner.columnId}
          value={value}
          placeholder={field.placeholder}
          required={field.required}
          disabled={disabled}
          invalid={isMissing}
          onChange={onChange}
        />
      );

    case "table":
      return field.config.table ? (
        <TableFieldControl
          id={id}
          label={field.label}
          config={field.config.table}
          required={field.required}
          value={value}
          disabled={disabled}
          showMissing={showMissing}
          onChange={onChange}
          renderCell={(cell) => (
            <FieldControl
              id={cell.id}
              field={columnAsField(cell.column)}
              value={cell.value}
              disabled={disabled}
              // La celda ya sabe si falta: lo decide la tabla, que sabe si
              // su fila está vacía.
              showMissing={cell.invalid}
              context={context}
              owner={{ fieldId: field.id, columnId: cell.column.id }}
              onChange={cell.onChange}
            />
          )}
        />
      ) : null;

    case "textarea":
      return (
        <Textarea
          id={id}
          // `md:` también: el `Textarea` base baja a 40px desde `md`.
          className="min-h-24 md:min-h-24"
          placeholder={field.placeholder}
          value={text}
          disabled={disabled}
          maxLength={field.config.maxLength}
          aria-invalid={isMissing}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "select":
      return (
        <SelectFieldControl
          id={id}
          label={field.label}
          options={field.config.options ?? []}
          value={value}
          placeholder={field.placeholder}
          disabled={disabled}
          invalid={isMissing}
          onChange={onChange}
        />
      );

    case "multiSelect":
      return (
        <MultiSelectFieldControl
          id={id}
          label={field.label}
          options={field.config.options ?? []}
          value={value}
          placeholder={field.placeholder}
          disabled={disabled}
          invalid={isMissing}
          onChange={onChange}
        />
      );

    case "checkbox":
      return (
        <div className={cn("flex items-center gap-3", CONTROL_HEIGHT)}>
          <Checkbox
            id={id}
            className="size-5"
            checked={value === true || value === "true"}
            disabled={disabled}
            aria-invalid={isMissing}
            aria-label={field.placeholder ? undefined : field.label}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {field.placeholder ? (
            // La frase también marca: la casilla sola es un blanco de 20px.
            <label htmlFor={id} className="text-sm text-muted-foreground">
              {field.placeholder}
            </label>
          ) : null}
        </div>
      );

    case "date":
      return (
        <DatePicker
          className={cn("w-full", CONTROL_HEIGHT)}
          clearable={!field.required}
          date={toDate(value)}
          disabled={disabled}
          placeholder={field.placeholder}
          onSelect={(date) => onChange(date ? toDateValue(date) : undefined)}
        />
      );

    case "time":
      return (
        <TimePicker
          className={cn(CONTROL_HEIGHT, isMissing && "border-destructive")}
          value={text}
          label={field.placeholder}
          ariaLabel={field.label}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case "currency":
      return (
        <CurrencyInput
          id={id}
          className={CONTROL_HEIGHT}
          value={
            typeof value === "number"
              ? value
              : text !== "" && Number.isFinite(Number(text))
                ? Number(text)
                : undefined
          }
          placeholder={field.placeholder}
          disabled={disabled}
          aria-invalid={isMissing}
          onChange={onChange}
        />
      );

    default: {
      const isNumber = field.type === "number";
      return (
        <Input
          id={id}
          className={CONTROL_HEIGHT}
          type={inputType(field.type)}
          inputMode={isNumber ? "decimal" : undefined}
          placeholder={field.placeholder}
          value={typeof value === "number" ? String(value) : text}
          disabled={disabled}
          minLength={field.config.minLength}
          maxLength={field.config.maxLength}
          min={field.config.minValue}
          max={field.config.maxValue}
          aria-invalid={isMissing}
          onChange={(event) =>
            onChange(
              isNumber && event.target.value !== ""
                ? Number(event.target.value)
                : event.target.value,
            )
          }
        />
      );
    }
  }
};
