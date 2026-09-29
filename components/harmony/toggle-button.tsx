import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";
import { Toggle } from "@/components/ui/toggle";

interface ToggleButtonProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  icon?: ReactNode;
  children?: ReactNode;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
  className?: string;
  "aria-label"?: string;
  activeColor?: string;
}

export const ToggleButton = ({
  pressed,
  onPressedChange,
  icon,
  children,
  size = "sm",
  variant = "outline",
  className,
  "aria-label": ariaLabel,
  activeColor = "blue"
}: ToggleButtonProps) => {
  const activeClasses = `data-[state=on]:bg-transparent data-[state=on]:text-${activeColor}-600 data-[state=on]:border-${activeColor}-500`;
  const iconWithColor = icon && pressed ? React.cloneElement(icon as any, {
    className: cn((icon as any).props?.className || '', `text-${activeColor}-500`)
  }) : icon;

  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      size={size}
      variant={variant}
      className={cn(activeClasses, className)}
      aria-label={ariaLabel}
    >
      {pressed ? iconWithColor : icon}
      {children}
    </Toggle>
  );
};