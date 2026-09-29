import { HarmonyIsotype } from "@/components/harmony/isotype";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <HarmonyIsotype className="size-10 opacity-40" />
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">404</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La página que buscas no existe.
        </p>
      </div>
      <Link
        href="/"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
