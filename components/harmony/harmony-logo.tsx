"use client";

import { HarmonyIsotype } from "@/components/harmony/isotype";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { icon: "size-6", text: "text-xl", gap: "gap-1.5" },
  md: { icon: "size-7", text: "text-2xl", gap: "gap-2" },
  lg: { icon: "size-10", text: "text-3xl", gap: "gap-3" },
} as const;

export function HarmonyLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  const s = sizes[size];

  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <HarmonyIsotype className={s.icon} />
      <span
        className={cn(
          "font-semibold tracking-tight font-space-grotesk",
          "bg-gradient-to-r from-h-purple via-h-indigo to-h-purple bg-[length:200%_100%] bg-clip-text text-transparent",
          "animate-gradient-shift",
          s.text,
        )}
      >
        Harmony Build
      </span>
    </span>
  );
}
