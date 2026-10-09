"use client";

import { HarmonyLogo } from "@/components/harmony/harmony-logo";
import { HarmonyIsotype } from "@/components/harmony/isotype";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "motion/react";
import { useState } from "react";
import { SignInFlow } from "../types";
import { ResetCard } from "./reset-card";
import { SignInCard } from "./sign-in-card";
import { SignUpCard } from "./sign-up-card";

export const AuthScreen = () => {
  const [state, setState] = useState<SignInFlow>("signIn");

  return (
    <div className="min-h-svh grid w-full grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      {/* Form Panel */}
      <div className="flex relative flex-col items-center justify-center px-6 py-10 md:px-12 md:py-16">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <HarmonyLogo size="lg" />
        </div>

        {/* Auth Forms */}
        <div className="w-full max-w-[420px]">
          {state !== "reset" ? (
            <p className="text-sm text-muted-foreground/80 text-center mb-3">
              {state === "signIn"
                ? "Inicia sesión con tu correo o con Google."
                : "Crea tu cuenta con tu correo o con Google."}
            </p>
          ) : null}
          <Tabs
            value={state}
            onValueChange={(val) => setState(val as SignInFlow)}
            className="w-full"
          >
            {state !== "reset" ? (
              <TabsList className="w-full">
                <TabsTrigger value="signIn">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signUp">Registro</TabsTrigger>
              </TabsList>
            ) : null}

            <TabsContent value="signIn">
              <SignInCard setState={setState} />
            </TabsContent>
            <TabsContent value="signUp">
              <SignUpCard />
            </TabsContent>
            <TabsContent value="reset">
              <ResetCard setState={setState} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Disclaimer */}
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-6 text-center text-xs text-muted-foreground/70 leading-relaxed">
          Al entrar puedes crear tu propio proyecto o unirte a uno existente con
          el código que te comparta su equipo.
        </p>
      </div>

      {/* Brand Panel — animated visual identity */}
      <div className="relative hidden lg:flex overflow-hidden">
        <AuthBrandPanel />
      </div>
    </div>
  );
};

/* ─── Animated brand panel ─── */

function AuthBrandPanel() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Deep base */}
      <div className="absolute inset-0 bg-gradient-to-br from-h-deep via-h-deeper to-h-deepest" />

      {/* Single static glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[150px] bg-h-purple" />

      {/* Isotype with subtle glow */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-[200px] h-[200px] rounded-full bg-h-purple/15 blur-[60px]" />
        <motion.div
          className="relative z-10 w-[160px] h-[160px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <HarmonyIsotype className="size-full" />
        </motion.div>
      </div>

      {/* Brand name below logo */}
      <motion.p
        className="relative z-10 mt-8 text-4xl font-semibold tracking-wide font-space-grotesk bg-gradient-to-r from-h-purple via-h-indigo to-h-purple bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-shift"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        Harmony Build
      </motion.p>
    </div>
  );
}
