import { AuthScreen } from "@/packages/auth/components/auth-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceder",
  description:
    "Inicia sesión o crea tu cuenta de Harmony Build para digitalizar los formatos de tu obra.",
};

const AuthPage = () => {
  return <AuthScreen />;
};

export default AuthPage;
