import { HarmonyIsotype } from "@/components/harmony/isotype";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <HarmonyIsotype className="size-8 animate-pulse" />
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
