"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authErrors } from "@/convex/lib/error_messages";
import { Loader2, Mail, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSignIn } from "../api";
import { calculatePasswordStrength } from "../lib/password-strength";
import { GoogleSignInButton } from "./google-sign-in-button";
import { PasswordField } from "./password-field";
import { PasswordStrengthMeter } from "./password-strength-meter";

export const SignUpCard = () => {
  const signIn = useSignIn();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);

  const passwordStrength = password
    ? calculatePasswordStrength(password)
    : null;

  const onPasswordSignUp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    // Mirrors the check the server enforces in `convex/auth.ts`; this one is
    // only here to fail fast with a clear message.
    if (!calculatePasswordStrength(password).isAcceptable) {
      toast.error(authErrors.weakPassword);
      return;
    }

    setPending(true);
    signIn("password", { name, email, password, flow: "signUp" })
      .catch(() =>
        toast.error("No se pudo crear la cuenta. Verifica los datos"),
      )
      .finally(() => setPending(false));
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardContent className="space-y-4 px-0 py-0">
        <form className="space-y-3" onSubmit={onPasswordSignUp}>
          <div className="space-y-1.5">
            <label
              htmlFor="signup-name"
              className="block text-sm font-medium text-foreground"
            >
              Nombre
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground/50">
                <User className="size-4" />
              </span>
              <Input
                id="signup-name"
                required
                value={name}
                disabled={pending}
                autoComplete="name"
                placeholder="Juan Perez"
                className="pl-9"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium text-foreground"
            >
              Correo
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground/50">
                <Mail className="size-4" />
              </span>
              <Input
                id="signup-email"
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
            id="signup-password"
            label="Contraseña"
            value={password}
            onChange={setPassword}
            disabled={pending}
            autoComplete="new-password"
          >
            {passwordStrength ? (
              <PasswordStrengthMeter strength={passwordStrength} />
            ) : null}
          </PasswordField>

          <PasswordField
            id="signup-confirm-password"
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={pending}
            autoComplete="new-password"
            accessibleName="la confirmación"
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
              "Crear cuenta"
            )}
          </Button>
        </form>

        <GoogleSignInButton disabled={pending} />
      </CardContent>
    </Card>
  );
};
