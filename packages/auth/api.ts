import { api } from "@/convex/_generated/api";
import { useFetch } from "@/hooks/use-fetch";
import { useAuthActions } from "@convex-dev/auth/react";

/** Acepta `"skip"` para no suscribirse antes de tener sesión (`02 §6`). */
export const useCurrentUser = (args: Record<string, never> | "skip" = {}) =>
  useFetch(api.users.current, args);

/** The auth actions live behind this package like every other data access:
 *  components consume them from here, never from `@convex-dev/auth/react`. */
export const useSignIn = () => useAuthActions().signIn;

export const useSignOut = () => useAuthActions().signOut;
