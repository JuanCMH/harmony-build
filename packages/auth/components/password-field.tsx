"use client";

import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock } from "lucide-react";
import { ReactNode, useState } from "react";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  disabled?: boolean;
  /** Name used by the show/hide button, e.g. "la confirmación". */
  accessibleName?: string;
  /** Rendered to the right of the label — e.g. the "forgot password" button. */
  action?: ReactNode;
  /** Rendered under the input — e.g. the strength meter. */
  children?: ReactNode;
}

export const PasswordField = ({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  accessibleName = "la contraseña",
  action,
  children,
}: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground/50">
          <Lock className="size-4" />
        </span>
        <Input
          id={id}
          required
          type={visible ? "text" : "password"}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          className="pl-9 pr-10"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
          aria-label={
            visible ? `Ocultar ${accessibleName}` : `Mostrar ${accessibleName}`
          }
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {children}
    </div>
  );
};
