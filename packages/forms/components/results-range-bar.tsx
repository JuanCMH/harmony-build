"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { toDate, toDateValue } from "../lib/date-value";
import {
  RANGE_PRESETS,
  type ResultsRange,
  presetOf,
} from "../lib/results-range";

interface ResultsRangeBarProps {
  range: ResultsRange;
  /** El día de hoy en Colombia: de él salen los atajos. */
  today: string;
  onChange: (range: ResultsRange) => void;
  /** Hacia qué lado se abre: el del borde al que está pegado el control. */
  align?: "start" | "end";
  className?: string;
}

/** «10 sep – 9 oct 2026»: el año del principio sólo si es otro. */
const rangeText = (range: ResultsRange): string => {
  const from = toDate(range.from);
  const to = toDate(range.to);
  if (!from || !to) return "";
  const sameYear = from.getFullYear() === to.getFullYear();
  return `${format(from, sameYear ? "d MMM" : "d MMM y", { locale: es })} – ${format(to, "d MMM y", { locale: es })}`;
};

/**
 * El periodo con que se miran los resultados, en un solo control: dice el
 * atajo mientras el rango coincida con uno, y si no las fechas. Al abrirlo,
 * los atajos van primero y el rango exacto al lado.
 *
 * Es de quien mira y vale para todo lo que hay en pantalla; un resultado no
 * guarda su propio periodo.
 */
export const ResultsRangeBar = ({
  range,
  today,
  onChange,
  align = "end",
  className,
}: ResultsRangeBarProps) => {
  const [open, setOpen] = useState(false);
  // Un rango a medio elegir —sólo el primer día— vive aquí: todavía no se pide.
  const [draft, setDraft] = useState<DateRange | undefined>();
  const active = presetOf(range, today);
  const dates = rangeText(range);

  const pick = (next: ResultsRange) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDraft(undefined);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Periodo: ${active ? `${active.label}, ` : ""}${dates}`}
          className={cn("justify-start gap-2 px-3 font-normal", className)}
        >
          <CalendarIcon aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">Periodo</span>
          {active ? <span className="font-medium">{active.label}</span> : null}
          <span
            className={cn(
              "truncate tabular-nums",
              active ? "hidden text-muted-foreground sm:inline" : "font-medium",
            )}
          >
            {dates}
          </span>
          <ChevronDown aria-hidden className="ml-auto text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="flex w-auto max-w-[calc(100vw-2rem)] flex-col p-0 sm:flex-row"
      >
        <div
          role="group"
          aria-label="Atajos"
          className="grid grid-cols-2 gap-0.5 border-b p-2 sm:flex sm:w-44 sm:flex-col sm:border-r sm:border-b-0"
        >
          {RANGE_PRESETS.map((preset) => {
            const selected = active?.id === preset.id;
            return (
              <Button
                key={preset.id}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={selected}
                className={cn(
                  "justify-between font-normal",
                  selected && "bg-accent font-medium",
                )}
                onClick={() => pick(preset.range(today))}
              >
                {preset.label}
                {selected ? <Check aria-hidden /> : null}
              </Button>
            );
          })}
        </div>
        <div>
          <p className="px-3 pt-3 text-xs text-muted-foreground">
            O elige el día inicial y el final.
          </p>
          <Calendar
            mode="range"
            locale={es}
            numberOfMonths={1}
            defaultMonth={toDate(range.to)}
            toDate={toDate(today)}
            selected={
              draft ?? { from: toDate(range.from), to: toDate(range.to) }
            }
            onSelect={(_, day) => {
              // El primer toque empieza un rango nuevo; el segundo lo cierra,
              // en el orden que sea.
              if (!draft?.from || draft.to) {
                setDraft({ from: day, to: undefined });
                return;
              }
              const [from, to] =
                day < draft.from ? [day, draft.from] : [draft.from, day];
              pick({ from: toDateValue(from), to: toDateValue(to) });
              setDraft(undefined);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
