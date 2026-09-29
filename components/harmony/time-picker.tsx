"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildTimeValue,
  getNextMinuteSelection,
  getNextTypedHourSelection,
  HOUR_OPTIONS,
  parseTimeValue,
  MINUTE_OPTIONS,
  resolveCommittedMinute,
} from "@/components/harmony/time-picker.utils";
import { cn } from "@/lib/utils";
import { Clock3, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface TimePickerProps {
  value: string;
  disabled?: boolean;
  label?: string;
  /** Nombre accesible del botón cuando `label` no sirve de marcador. */
  ariaLabel?: string;
  onChange: (time: string) => void;
  className?: string;
}

export const TimePicker = ({
  label,
  ariaLabel,
  value,
  onChange,
  className,
  disabled = false,
}: TimePickerProps) => {
  const [open, setOpen] = useState(false);
  const hourRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hourTypeaheadBufferRef = useRef("");
  const hourTypeaheadTimeoutRef = useRef<number | null>(null);

  const parsedValue = useMemo(() => parseTimeValue(value), [value]);
  const displayValue = parsedValue.hour && parsedValue.minute
    ? buildTimeValue(parsedValue.hour, parsedValue.minute)
    : "";

  const [selectedHour, setSelectedHour] = useState<string | null>(
    parsedValue.hour,
  );
  const [selectedMinute, setSelectedMinute] = useState<string | null>(
    parsedValue.minute,
  );

  useEffect(() => {
    setSelectedHour(parsedValue.hour);
    setSelectedMinute(parsedValue.minute);
  }, [parsedValue.hour, parsedValue.minute]);

  const clearHourTypeahead = useCallback(() => {
    hourTypeaheadBufferRef.current = "";

    if (hourTypeaheadTimeoutRef.current !== null) {
      window.clearTimeout(hourTypeaheadTimeoutRef.current);
      hourTypeaheadTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      clearHourTypeahead();
    }
  }, [clearHourTypeahead, open]);

  useEffect(() => {
    return () => {
      if (hourTypeaheadTimeoutRef.current !== null) {
        window.clearTimeout(hourTypeaheadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || !selectedHour) return;

    const hourIndex = HOUR_OPTIONS.indexOf(selectedHour);
    if (hourIndex < 0) return;

    const frame = window.requestAnimationFrame(() => {
      hourRefs.current[hourIndex]?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, selectedHour]);

  const scheduleHourTypeaheadReset = useCallback(() => {
    if (hourTypeaheadTimeoutRef.current !== null) {
      window.clearTimeout(hourTypeaheadTimeoutRef.current);
    }

    hourTypeaheadTimeoutRef.current = window.setTimeout(() => {
      hourTypeaheadBufferRef.current = "";
      hourTypeaheadTimeoutRef.current = null;
    }, 700);
  }, []);

  const commitTime = useCallback(
    (hour: string, minute: string, closeOnCommit: boolean) => {
      setSelectedHour(hour);
      setSelectedMinute(minute);
      onChange(buildTimeValue(hour, minute));

      if (closeOnCommit) {
        setOpen(false);
      }
    },
    [onChange],
  );

  const handleHourSelect = useCallback(
    (hour: string) => {
      const nextMinute = resolveCommittedMinute(selectedMinute, parsedValue.minute);
      commitTime(hour, nextMinute, false);
    },
    [commitTime, parsedValue.minute, selectedMinute],
  );

  const handleMinuteSelect = useCallback(
    (minute: string) => {
      const nextHour = selectedHour ?? parsedValue.hour ?? HOUR_OPTIONS[0];
      commitTime(nextHour, minute, true);
    },
    [commitTime, parsedValue.hour, selectedHour],
  );

  const handleClear = useCallback(() => {
    setSelectedHour(null);
    setSelectedMinute(null);
    clearHourTypeahead();
    onChange("");
    setOpen(false);
  }, [clearHourTypeahead, onChange]);

  const handleHourTypeahead = useCallback(
    (digit: string) => {
      const nextSelection = getNextTypedHourSelection(
        hourTypeaheadBufferRef.current,
        digit,
      );

      if (!nextSelection.hour) {
        return;
      }

      hourTypeaheadBufferRef.current = nextSelection.buffer;
      scheduleHourTypeaheadReset();
      handleHourSelect(nextSelection.hour);

      const hourIndex = HOUR_OPTIONS.indexOf(nextSelection.hour);
      if (hourIndex < 0) return;

      window.requestAnimationFrame(() => {
        hourRefs.current[hourIndex]?.focus();
      });
    },
    [handleHourSelect, scheduleHourTypeaheadReset],
  );

  const handlePopoverKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const nextHour = selectedHour ?? parsedValue.hour;
        if (!nextHour) return;

        event.preventDefault();

        const currentMinute = selectedMinute ?? parsedValue.minute;
        const nextMinute = getNextMinuteSelection(
          currentMinute,
          event.key === "ArrowUp" ? "up" : "down",
        );

        commitTime(nextHour, nextMinute, false);
        return;
      }

      if (!/^\d$/.test(event.key)) return;

      event.preventDefault();
      handleHourTypeahead(event.key);
    },
    [commitTime, handleHourTypeahead, parsedValue.hour, parsedValue.minute, selectedHour, selectedMinute],
  );

  const placeholder = label || "Sin hora";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between border-border/40 px-3 font-normal",
            !displayValue && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
          aria-label={ariaLabel}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Clock3 className="size-4 opacity-70" />
            <span className="truncate">{displayValue || placeholder}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] border-border/40 p-0 sm:w-[300px]"
        onKeyDownCapture={handlePopoverKeyDown}
      >
        <div className="grid grid-cols-[1.5fr_1fr] gap-0">
          <div className="border-r border-border/40 p-2">
            <p className="mb-1.5 text-2xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Horas
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {HOUR_OPTIONS.map((hour, index) => {
                const isActive = selectedHour === hour;

                return (
                  <button
                    key={hour}
                    ref={(element) => {
                      hourRefs.current[index] = element;
                    }}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`Seleccionar ${hour} horas`}
                    className={cn(
                      "h-8 cursor-pointer rounded-md border border-border/40 px-0 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-sm",
                      isActive
                        ? "bg-h-indigo/10 text-h-indigo border-h-indigo/20"
                        : "hover:bg-accent text-foreground",
                    )}
                    onClick={() => handleHourSelect(hour)}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-2">
            <p className="mb-1.5 text-2xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Minutos
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {MINUTE_OPTIONS.map((minute) => {
                const isActive = selectedMinute === minute;
                const canSelectMinute = Boolean(selectedHour ?? parsedValue.hour);

                return (
                  <button
                    key={minute}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`Seleccionar ${minute} minutos`}
                    disabled={!canSelectMinute}
                    className={cn(
                      "h-8 cursor-pointer rounded-md border border-border/40 px-0 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm",
                      isActive
                        ? "bg-h-indigo/10 text-h-indigo border-h-indigo/20"
                        : "hover:bg-accent text-foreground",
                    )}
                    onClick={() => handleMinuteSelect(minute)}
                  >
                    {minute}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 rounded-md border border-dashed border-border/40 bg-muted/30 px-2.5 py-2">
              <p className="text-2xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Vista previa
              </p>
              <p className="mt-1 text-sm font-semibold tracking-tight">
                {(selectedHour ?? parsedValue.hour ?? "--") + ":" + (selectedMinute ?? parsedValue.minute ?? "--")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/40 px-2.5 py-2">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={handleClear}
          >
            <X className="size-4" />
            Sin hora
          </button>
          <span className="text-xs text-muted-foreground">
            {displayValue || "Ninguna"}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
};
