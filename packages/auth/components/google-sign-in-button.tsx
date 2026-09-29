"use client";

import { GoogleIcon } from "@/components/icons/google";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSignIn } from "../api";

interface GoogleSignInButtonProps {
  disabled?: boolean;
}

export const GoogleSignInButton = ({ disabled }: GoogleSignInButtonProps) => {
  const signIn = useSignIn();
  const [pending, setPending] = useState(false);

  const onClick = () => {
    setPending(true);
    signIn("google", { redirectTo: "/projects" })
      .catch(() =>
        toast.error("No se pudo continuar con Google. Inténtalo de nuevo"),
      )
      .finally(() => setPending(false));
  };

  return (
    <>
      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground/60">
          o
        </span>
      </div>

      <Button
        type="button"
        size="lg"
        variant="outline"
        className="w-full relative"
        disabled={disabled || pending}
        onClick={onClick}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <GoogleIcon className="size-4 mr-2" />
            Continuar con Google
          </>
        )}
      </Button>
    </>
  );
};
