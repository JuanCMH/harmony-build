"use client";

import { format, isSameDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useCallback, useRef } from "react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { es } from "date-fns/locale";

interface DateRangePickerProps {
  to?: Date;
  from?: Date;
  className?: string;
  onSelect: (dateRange: DateRange | undefined) => void;
  side?: "top" | "bottom" | "right" | "left";
  align?: "center" | "end" | "start";
  fromDate?: Date;
  toDate?: Date;
  disabled?: boolean;
  clearOnStartClick?: boolean;
}

export function DateRangePicker({
  className,
  from,
  to,
  onSelect,
  side,
  align,
  fromDate,
  toDate,
  disabled,
  clearOnStartClick = false,
}: DateRangePickerProps) {
  const date = { from, to };
  const skipNextSelectRef = useRef(false);

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      if (skipNextSelectRef.current) {
        skipNextSelectRef.current = false;
        return;
      }

      onSelect(range);
    },
    [onSelect],
  );

  const handleDayClick = useCallback(
    (day: Date, _modifiers: unknown, event: React.MouseEvent) => {
      if (!clearOnStartClick || !from || !isSameDay(day, from)) return;

      skipNextSelectRef.current = true;
      event.preventDefault();
      onSelect(undefined);
    },
    [clearOnStartClick, from, onSelect],
  );

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "flex items-center justify-start text-left font-normal border rounded-md",
              !date && "text-muted-foreground",
              className,
            )}
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: es })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: es })
              )
            ) : (
              <span>Seleccionar Rango</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 poppins"
          side={side}
          align={align}
        >
          <Calendar
            fromDate={fromDate}
            toDate={toDate}
            locale={es}
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            onDayClick={handleDayClick}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
