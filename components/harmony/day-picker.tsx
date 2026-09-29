import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import React from "react";

interface DayPickerProps {
  value?: string;
  disabled?: boolean;
  onChange: (day: string) => void;
  month?: string;
}

export const DayPicker = ({
  value,
  onChange,
  disabled = false,
  month,
}: DayPickerProps) => {
  const currentMonth = month || format(new Date(), "yyyy-MM");
  const [year, monthNum] = currentMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(new Date(year, monthNum));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  React.useEffect(() => {
    if (!value && days.length > 0) {
      const today = new Date().getDate();
      const currentDay = today <= daysInMonth ? today : 1;
      onChange(currentDay.toString());
    }
  }, [value, days.length, daysInMonth, onChange]);

  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(value) => onChange(value)}
    >
      <SelectTrigger className="w-full md:w-auto capitalize h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm">
        <SelectValue placeholder="Seleccionar día">
          {value && `${value} de ${format(new Date(year, monthNum), "MMMM", { locale: es })}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="flex max-h-48">
        {days.map((day) => (
          <SelectItem
            key={day}
            value={day.toString()}
            className="flex cursor-pointer text-main"
          >
            {day} de {format(new Date(year, monthNum), "MMMM", { locale: es })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
