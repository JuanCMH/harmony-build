"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authErrors } from "@/convex/lib/error_messages";
import { ArrowLeft, Loader2, Mail, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSignIn } from "../api";
import { calculatePasswordStrength } from "../lib/password-strength";
import { SignInFlow } from "../types";
import { PasswordField } from "./password-field";
import { PasswordStrengthMeter } from "./password-strength-meter";

interface ResetCardProps {
  setState: (state: SignInFlow) => void;
}

export const ResetCard = ({ setState }: ResetCardProps) => {
  const signIn = useSignIn();

  const [step, setStep] = useState<"code" | "email">("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  const passwordStrength = newPassword
    ? calculatePasswordStrength(newPassword)
    : null;

  const onSendCode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    signIn("password", { email, flow: "reset" })
      // The same message either way, on purpose: a different outcome for an
      // unknown address would reveal who has an account. Ver 03 §7.
      .catch(() => undefined)
      .finally(() => {
        toast.success(
          "Si el correo está registrado, recibirás un código de verificación",
        );
        setStep("code");
        setPending(false);
      });
  };

  const onPasswordReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!calculatePasswordStrength(newPassword).isAcceptable) {
      toast.error(authErrors.weakPassword);
      return;
    }

    setPending(true);
    signIn("password", {
      email,
      newPassword,
      code: code.trim().toLowerCase(),
      flow: "reset-verification",
    })
      .catch(() => toast.error("Código incorrecto o expirado"))
      .finally(() => setPending(false));
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4 space-y-2">
        <button
          type="button"
          onClick={() => setState("signIn")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <CardTitle className="text-base font-semibold tracking-tight">
          Restablecer contraseña
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {step === "email"
            ? "Ingresa tu correo y te enviaremos un código de verificación."
            : "Ingresa el código que recibiste y tu nueva contraseña. El código caduca en 15 minutos."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {step === "email" ? (
          <form className="space-y-3" onSubmit={onSendCode}>
            <div className="space-y-1.5">
              <label
                htmlFor="reset-email"
                className="block text-sm font-medium text-foreground"
              >
                Correo
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground/50">
                  <Mail className="size-4" />
                </span>
                <Input
                  id="reset-email"
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
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-h-purple to-h-indigo hover:from-h-purple/90 hover:to-h-indigo/90 text-white shadow-sm"
              size="lg"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Enviar código"
              )}
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={onPasswordReset}>
            <PasswordField
              id="reset-new-password"
              label="Nueva contraseña"
              value={newPassword}
              onChange={setNewPassword}
              disabled={pending}
              autoComplete="new-password"
              accessibleName="la nueva contraseña"
            >
              {passwordStrength ? (
                <PasswordStrengthMeter strength={passwordStrength} />
              ) : null}
            </PasswordField>

            <div className="space-y-1.5">
              <label
                htmlFor="reset-code"
                className="block text-sm font-medium text-foreground"
              >
                Código de verificación
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground/50">
                  <ShieldAlert className="size-4" />
                </span>
                <Input
                  id="reset-code"
                  required
                  value={code}
                  disabled={pending}
                  autoComplete="one-time-code"
                  placeholder="a1b2c3"
                  className="pl-9 font-mono tracking-widest"
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-h-purple to-h-indigo hover:from-h-purple/90 hover:to-h-indigo/90 text-white shadow-sm"
              size="lg"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Restablecer contraseña"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
