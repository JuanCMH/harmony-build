import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { DataModel } from "./_generated/dataModel";
import { authErrors } from "./lib/error_messages";
import { isPasswordAcceptable } from "./lib/password_policy";
import { ResendOTPPasswordReset } from "./resend";

const CustomPassword = Password<DataModel>({
  profile(params) {
    return {
      name: params.name as string,
      email: params.email as string,
    };
  },
  // The strength meter in the sign-up and reset forms is UX only; this is the
  // check that actually gates account creation and password changes.
  validatePasswordRequirements(password) {
    if (!isPasswordAcceptable(password)) {
      throw new ConvexError(authErrors.weakPassword);
    }
  },
  reset: ResendOTPPasswordReset,
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [CustomPassword, Google],
  session: {
    totalDurationMs: 7 * 24 * 60 * 60 * 1000, // 7 días
    inactiveDurationMs: 7 * 24 * 60 * 60 * 1000, // 7 días
  },
  // `jwt.durationMs` se deja en su valor por defecto (1 hora) a propósito: el
  // JWT no es revocable, así que `signOut` sólo invalida el refresh token. Una
  // duración larga mantendría vivo un token filtrado después de cerrar sesión.
});
