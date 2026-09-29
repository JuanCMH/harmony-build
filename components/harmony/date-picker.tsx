"use client";

import { Hint } from "@/components/harmony/hint";
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
import { Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Desde qué año se puede elegir: una fecha de nacimiento cabe de sobra. */
const PRIMER_ANIO = 1900;

interface DatePickerProps {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
  /** Añade «Quitar fecha» al calendario, para un campo que puede quedar vacío. */
  clearable?: boolean;
  /** Lo que se lee sin fecha. */
  placeholder?: string;
}

/**
 * Un día, elegido en un calendario con mes y año en desplegables.
 *
 * Hasta el 15 de septiembre de 2026 el calendario sólo avanzaba mes a mes: una
 * fecha de nacimiento de 1990 eran más de 400 pulsaciones. Además no se
 * cerraba al elegir, y pulsar otra vez el día elegido lo borraba: rellenar dos
 * fechas seguidas vaciaba la primera sin avisar. Ahora elegir cierra, repetir
 * el día no cambia nada y borrar es una acción explícita (`clearable`).
 */
export function DatePicker({
  date,
  onSelect,
  disabled,
  className,
  align,
  clearable = false,
  placeholder = "Selecciona una fecha",
}: DatePickerProps) {
  const dateText = date ? format(date, "PPP", { locale: es }) : placeholder;
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
      }
    };

    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [dateText]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          {isTruncated ? (
            <Hint label={dateText} side="top">
              <span ref={textRef} className="truncate">
                {dateText}
              </span>
            </Hint>
          ) : (
            <span ref={textRef} className="truncate">
              {dateText}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          captionLayout="dropdown-buttons"
          fromYear={PRIMER_ANIO}
          toYear={new Date().getFullYear() + 20}
          // Sin el año en cada opción del desplegable de meses.
          formatters={{
            formatMonthCaption: (mes) => format(mes, "LLLL", { locale: es }),
          }}
          onSelect={(dia) => {
            // `undefined` es volver a pulsar el día elegido: no es borrar.
            if (dia) onSelect(dia);
            setOpen(false);
          }}
          initialFocus
        />
        {clearable && date ? (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onSelect(undefined);
                setOpen(false);
              }}
            >
              Quitar fecha
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
