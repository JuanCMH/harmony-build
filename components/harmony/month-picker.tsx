import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import React, { useState } from "react";

interface MonthPickerProps {
  value?: string; // formato: yyyy-00 .. yyyy-11
  disabled?: boolean;
  onChange: (month: string) => void;
  align?: "start" | "center" | "end";
  className?: string;
}

const months = Array.from({ length: 12 }, (_, i) => i);
const MIN_YEAR = 2024;
const MAX_YEAR = 2027;

const pad2 = (n: number) => String(n).padStart(2, "0");

export const MonthPicker = ({
  value,
  onChange,
  disabled = false,
  align = "end",
  className,
}: MonthPickerProps) => {
  const now = new Date();
  const currentMonth = `${format(now, "yyyy")}-${pad2(now.getMonth())}`;
  const displayValue = value ?? currentMonth;

  const [selectedYear, selectedMonth] = displayValue.split("-").map(Number);
  const [viewYear, setViewYear] = useState(selectedYear);
  const [open, setOpen] = useState(false);

  React.useEffect(() => {
    if (!value) {
      onChange(currentMonth);
    }
  }, [value, currentMonth, onChange]);

  const handleMonthSelect = (month: number) => {
    onChange(`${viewYear}-${pad2(month)}`);
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setViewYear(selectedYear);
    }
  };

  const displayLabel = (() => {
    const [year, month] = displayValue.split("-");
    const date = new Date(Number(year), Number(month), 1);
    return format(date, "MMMM yyyy", { locale: es });
  })();

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn("capitalize h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm font-normal gap-2 border-border/40 shrink-0", className)}
        >
          <Calendar className="size-3.5 text-muted-foreground" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[280px] p-3">
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={viewYear <= MIN_YEAR}
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={viewYear >= MAX_YEAR}
            onClick={() => setViewYear((y) => y + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {months.map((month) => {
            const isSelected =
              viewYear === selectedYear && month === selectedMonth;
            const isCurrentMonth =
              viewYear === now.getFullYear() && month === now.getMonth();
            const label = format(new Date(viewYear, month, 1), "MMM", {
              locale: es,
            });

            return (
              <Button
                key={month}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 capitalize text-sm",
                  isCurrentMonth &&
                    !isSelected &&
                    "border border-border/60",
                )}
                onClick={() => handleMonthSelect(month)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
