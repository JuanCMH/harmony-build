"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSignIn } from "../api";
import { SignInFlow } from "../types";
import { GoogleSignInButton } from "./google-sign-in-button";
import { PasswordField } from "./password-field";

interface SignInCardProps {
  setState: (state: SignInFlow) => void;
}

export const SignInCard = ({ setState }: SignInCardProps) => {
  const signIn = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const onPasswordSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    signIn("password", { email, password, flow: "signIn" })
      // Deliberately generic: saying which half was wrong turns this form into
      // an account oracle. Ver 03 §7.
      .catch(() => toast.error("Correo o contraseña incorrectos"))
      .finally(() => setPending(false));
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardContent className="space-y-4 px-0 py-0">
        <form className="space-y-3" onSubmit={onPasswordSignIn}>
          <div className="space-y-1.5">
            <label
              htmlFor="signin-email"
              className="block text-sm font-medium text-foreground"
            >
              Correo
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground/50">
                <Mail className="size-4" />
              </span>
              <Input
                id="signin-email"
                required
                type="email"
                value={email}
                disabled={pending}
                autoComplete="email"
                placeholder="ejemplo@mail.com"
                className="pl-9"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <PasswordField
            id="signin-password"
            label="Contraseña"
            value={password}
            onChange={setPassword}
            disabled={pending}
            autoComplete="current-password"
            action={
              <button
                type="button"
                onClick={() => setState("reset")}
                className="inline-flex min-h-6 items-center text-xs text-muted-foreground hover:text-h-purple transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            }
          />

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-h-purple to-h-indigo hover:from-h-purple/90 hover:to-h-indigo/90 text-white shadow-sm"
            size="lg"
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>

        <GoogleSignInButton disabled={pending} />
      </CardContent>
    </Card>
  );
};
