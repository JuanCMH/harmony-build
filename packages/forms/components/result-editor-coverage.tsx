"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import type { FormField } from "@/convex/lib/form_types";
import { referenceFields } from "@/convex/lib/result_definition";
import {
  COVERAGE_SCOPES,
  type CoverageScope,
  RESULT_INTERVALS,
  type ResultInterval,
  WEEKDAYS,
} from "@/convex/lib/result_types";

import {
  COVERAGE_SCOPE_LABEL,
  EVERY_LABEL,
  WEEKDAY_LABEL,
} from "../lib/result-catalog";
import type { ResultDraft } from "../lib/result-draft";
import { FieldSelect } from "./result-editor-parts";

interface CoverageEditorProps {
  draft: ResultDraft;
  fields: readonly FormField[];
  disabled: boolean;
  onChange: (changes: Partial<ResultDraft>) => void;
}

/**
 * Lo que pide un programa: qué elementos hay que inspeccionar, cada cuánto
 * —y, si es cada día, qué días cuentan— y a quién se espera.
 */
export const CoverageEditor = ({
  draft,
  fields,
  disabled,
  onChange,
}: CoverageEditorProps) => (
  <>
    <FieldSelect
      id="result-coverage-by"
      label="Qué hay que inspeccionar"
      fields={referenceFields(fields)}
      value={draft.rowFieldId}
      disabled={disabled}
      emptyText="Este formato no relaciona ningún listado."
      onChange={(rowFieldId) => onChange({ rowFieldId })}
    />
    <div className="space-y-2">
      <Label htmlFor="result-coverage-every">Cada cuánto le toca</Label>
      <Select
        value={draft.interval}
        disabled={disabled}
        onValueChange={(interval) =>
          onChange({ interval: interval as ResultInterval })
        }
      >
        <SelectTrigger id="result-coverage-every" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RESULT_INTERVALS.map((interval) => (
            <SelectItem key={interval} value={interval}>
              {EVERY_LABEL[interval]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    {draft.interval === "day" ? (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Qué días cuentan</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((day) => (
            <Toggle
              key={day}
              variant="outline"
              size="sm"
              className="w-9"
              aria-label={WEEKDAY_LABEL[day].long}
              pressed={draft.weekdays.includes(day)}
              disabled={disabled}
              onPressedChange={(pressed) =>
                onChange({
                  weekdays: pressed
                    ? [...draft.weekdays, day]
                    : draft.weekdays.filter((other) => other !== day),
                })
              }
            >
              {WEEKDAY_LABEL[day].short}
            </Toggle>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Un día sin marcar no se espera: lo que se inspeccione ese día no suma
          ni resta.
        </p>
      </fieldset>
    ) : null}
    <div className="space-y-2">
      <Label htmlFor="result-coverage-scope">A quién se espera</Label>
      <Select
        value={draft.coverageScope}
        disabled={disabled}
        onValueChange={(scope) =>
          onChange({ coverageScope: scope as CoverageScope })
        }
      >
        <SelectTrigger id="result-coverage-scope" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COVERAGE_SCOPES.map((scope) => (
            <SelectItem key={scope} value={scope}>
              {COVERAGE_SCOPE_LABEL[scope]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {draft.coverageScope === "catalog"
          ? "Encuentra al que nunca se inspeccionó."
          : "Para un listado que mezcla clases: no se le pide a este formato lo que no inspecciona."}
      </p>
    </div>
  </>
);
