import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bgCustomColors,
  customColors,
  type CustomColor,
} from "@/lib/custom-colors";
import { cn } from "@/lib/utils";

export const isCustomColor = (value: unknown): value is CustomColor =>
  typeof value === "string" && Object.keys(customColors).includes(value);

interface ColorSelectProps {
  id?: string;
  value: CustomColor;
  onChange: (color: CustomColor) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/** Selector de la paleta de dominio (`lib/custom-colors.ts`). */
export const ColorSelect = ({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: ColorSelectProps) => (
  <Select
    value={value}
    disabled={disabled}
    onValueChange={(next) => {
      if (isCustomColor(next)) onChange(next);
    }}
  >
    <SelectTrigger id={id} className={cn("w-full", className)}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent align="start" className="max-h-48">
      {Object.entries(customColors).map(([color, name]) => (
        <SelectItem key={color} value={color}>
          <span
            className={cn(
              "size-4 rounded-full",
              isCustomColor(color) && bgCustomColors[color],
            )}
          />
          {name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
