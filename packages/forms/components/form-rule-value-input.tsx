"use client";

import { CurrencyInput } from "@/components/harmony/currency-input";
import { DatePicker } from "@/components/harmony/date-picker";
import { SearchableMultiSelect } from "@/components/harmony/searchable-multi-select";
import { SearchableSelect } from "@/components/harmony/searchable-select";
import { TimePicker } from "@/components/harmony/time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import {
  type FormField,
  UNARY_OPERATORS,
  type VisibilityOperator,
} from "@/convex/lib/form_types";
import { cn } from "@/lib/utils";
import { useId, useState } from "react";

import { useSearchEntries } from "../api";
import { toDate, toDateValue } from "../lib/date-value";

/**
 * Una pieza dentro del grupo de la frase de una regla: sin caja propia, porque
 * la caja es el grupo.
 */
export const RULE_PIECE = "h-8 w-full min-w-0";

/** «Es alguno de» sobre un texto: varios valores separados por comas. Guarda
 *  lo tecleado aparte, o la coma recién escrita desaparecería al instante. */
const TextList = ({
  values,
  onChange,
  label,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
}) => {
  const [text, setText] = useState(values.join(", "));
  return (
    <Input
      value={text}
      aria-label={label}
      placeholder="Valores separados por comas"
      className={RULE_PIECE}
      onChange={(event) => {
        setText(event.target.value);
        onChange(
          event.target.value
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        );
      }}
    />
  );
};

type Option = { label: string; value: string; description?: string };

/** Hasta cuántas opciones «es alguno de» las pinta como fichas. Con más, las
 *  fichas llenan la fila y no se encuentra nada: selector con búsqueda. */
export const CHIPS_UP_TO = 8;

const OptionChips = ({
  options,
  values,
  label,
  onChange,
}: {
  options: readonly Option[];
  values: string[];
  label: string;
  onChange: (values: string[]) => void;
}) => (
  <div
    role="group"
    aria-label={label}
    className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border px-2 py-1"
  >
    {options.map((option) => {
      const isChecked = values.includes(option.value);
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={isChecked}
          onClick={() =>
            onChange(
              isChecked
                ? values.filter((value) => value !== option.value)
                : [...values, option.value],
            )
          }
          className={cn(
            "min-h-6 rounded-sm border px-2 text-ui transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            isChecked
              ? "border-h-indigo/30 bg-h-indigo/10 text-foreground"
              : "text-muted-foreground hover:bg-accent/40",
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

/**
 * Los elementos de un listado, para comparar una relación. Lo guardado es el
 * id del elemento; lo que se lee, su título.
 *
 * Trae los treinta primeros por título, que es lo que da `searchEntries` sin
 * búsqueda: una regla sobre una relación compara con uno o dos elementos
 * concretos, y el listado de un proyecto rara vez pasa de ahí.
 */
const EntryPicker = ({
  catalogId,
  operator,
  values,
  label,
  onChange,
}: {
  catalogId: string;
  operator: VisibilityOperator;
  values: string[];
  label: string;
  onChange: (values: string[]) => void;
}) => {
  const { data: entries } = useSearchEntries(
    catalogId ? { formId: catalogId as Id<"forms">, search: "" } : "skip",
  );
  const options = (entries ?? []).map((entry) => ({
    value: entry._id,
    label: entry.title,
  }));

  if (!catalogId) {
    return (
      <div className="flex h-8 items-center rounded-md border border-dashed px-3 text-ui text-muted-foreground">
        <span className="truncate">Primero elige su listado</span>
      </div>
    );
  }
  if (operator === "anyOf") {
    return (
      <SearchableMultiSelect
        size="sm"
        aria-label={label}
        className={RULE_PIECE}
        placeholder="Elige elementos"
        searchPlaceholder="Buscar un elemento…"
        emptyText="El listado no tiene elementos activos."
        value={values}
        onValueChange={onChange}
        groups={[{ label: "", options }]}
      />
    );
  }
  return (
    <SearchableSelect
      size="sm"
      aria-label={label}
      className={RULE_PIECE}
      placeholder="Elige un elemento"
      searchPlaceholder="Buscar un elemento…"
      emptyText="El listado no tiene elementos activos."
      value={values[0] ?? ""}
      options={options}
      onValueChange={(value) => onChange(value === "" ? [] : [value])}
    />
  );
};

/**
 * El valor de una regla, con el control que corresponde al tipo del campo:
 * las opciones de una lista, el selector de fecha o de hora, pesos para una
 * moneda, los elementos del listado para una relación. Con un operador que se
 * basta solo —«está vacío»— no se pinta nada.
 *
 * Sirve también para el valor que toma un campo con valor sugerido: ahí el
 * «campo» es el propio y el operador, una igualdad.
 */
export const FormRuleValueInput = ({
  field,
  operator,
  values,
  onChange,
  label,
}: {
  field: FormField;
  operator: VisibilityOperator;
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
}) => {
  const id = useId();
  if (UNARY_OPERATORS.includes(operator)) return null;

  const current = values[0] ?? "";
  const setOne = (value: string) => onChange(value === "" ? [] : [value]);
  const options: readonly Option[] = field.config.options ?? [];

  if (
    (field.type === "select" || field.type === "multiSelect") &&
    operator === "anyOf"
  ) {
    return options.length > CHIPS_UP_TO ? (
      <SearchableMultiSelect
        size="sm"
        aria-label={label}
        className={RULE_PIECE}
        placeholder="Elige opciones"
        searchPlaceholder="Buscar una opción…"
        value={values}
        onValueChange={onChange}
        groups={[{ label: "", options }]}
      />
    ) : (
      <OptionChips
        options={options}
        values={values}
        label={label}
        onChange={onChange}
      />
    );
  }

  switch (field.type) {
    case "reference":
      return (
        <EntryPicker
          catalogId={field.config.reference?.formId ?? ""}
          operator={operator}
          values={values}
          label={label}
          onChange={onChange}
        />
      );

    case "select":
    case "multiSelect":
      return (
        <SearchableSelect
          size="sm"
          aria-label={label}
          className={RULE_PIECE}
          placeholder="Elige una opción"
          value={current}
          options={options}
          onValueChange={setOne}
        />
      );

    case "checkbox":
      return (
        <Select value={current} onValueChange={setOne}>
          <SelectTrigger size="sm" aria-label={label} className={RULE_PIECE}>
            <SelectValue placeholder="Elige" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Marcada</SelectItem>
            <SelectItem value="false">Sin marcar</SelectItem>
          </SelectContent>
        </Select>
      );

    case "date":
      return (
        <DatePicker
          date={toDate(current)}
          onSelect={(date) => setOne(date ? toDateValue(date) : "")}
          className={RULE_PIECE}
        />
      );

    case "time":
      return (
        <div className="w-full">
          <TimePicker value={current} ariaLabel={label} onChange={setOne} />
        </div>
      );

    case "currency":
      return (
        <div className="w-full">
          <Label htmlFor={id} className="sr-only">
            {label}
          </Label>
          <CurrencyInput
            id={id}
            value={current === "" ? undefined : Number(current)}
            onChange={(amount) =>
              setOne(amount === undefined ? "" : String(amount))
            }
            className={RULE_PIECE}
          />
        </div>
      );

    case "number":
      return (
        <Input
          type="number"
          inputMode="decimal"
          value={current}
          aria-label={label}
          placeholder="0"
          className={RULE_PIECE}
          onChange={(event) => setOne(event.target.value)}
        />
      );

    default:
      return operator === "anyOf" ? (
        <TextList values={values} onChange={onChange} label={label} />
      ) : (
        <Input
          value={current}
          aria-label={label}
          placeholder="Valor"
          className={RULE_PIECE}
          onChange={(event) => setOne(event.target.value)}
        />
      );
  }
};
