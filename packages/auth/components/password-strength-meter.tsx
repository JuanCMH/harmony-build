"use client";

import { cn } from "@/lib/utils";
import {
  PASSWORD_STRENGTH_SEGMENTS,
  PasswordStrength,
} from "../lib/password-strength";

const SEGMENTS = Array.from(
  { length: PASSWORD_STRENGTH_SEGMENTS },
  (_, index) => index + 1,
);

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
}

export const PasswordStrengthMeter = ({
  strength,
}: PasswordStrengthMeterProps) => {
  return (
    <div className="space-y-1 pt-0.5" aria-live="polite">
      <div className="flex gap-1">
        {SEGMENTS.map((segment) => (
          <div
            key={segment}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              segment <= strength.score ? strength.barClass : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{strength.label}</p>
    </div>
  );
};
