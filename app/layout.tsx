import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { JotaiProvider } from "@/components/providers/jotai-provider";
import { ModalProvider } from "@/components/providers/modal-provider";
import { ObservabilityProvider } from "@/components/providers/observability-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import ServiceWorkerRegister from "@/components/harmony/service-worker-register";
import { cn } from "@/lib/utils";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { Poppins, Space_Grotesk } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
});

const DESCRIPTION =
  "Harmony Build es la plataforma para digitalizar los formatos de obra de las empresas de construcción: del papel de la obra al dato que decide.";

export const metadata: Metadata = {
  title: {
    default: "Harmony Build",
    template: "%s | Harmony Build",
  },
  description: DESCRIPTION,
  authors: [{ name: "Harmony Build" }],
  creator: "Harmony Build",
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Harmony Build",
    title: "Harmony Build",
    description: DESCRIPTION,
  },
  // Toda la aplicación vive detrás del inicio de sesión: no hay nada que
  // indexar.
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="es" suppressHydrationWarning>
        <body
          className={cn(
            poppins.className,
            poppins.variable,
            spaceGrotesk.variable,
            "antialiased",
          )}
        >
          <NuqsAdapter>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              storageKey="harmony-build-theme"
            >
              <ConvexClientProvider>
                <JotaiProvider>
                  <ServiceWorkerRegister />
                  <ObservabilityProvider />
                  <Toaster />
                  <ModalProvider />
                  {children}
                </JotaiProvider>
              </ConvexClientProvider>
            </ThemeProvider>
          </NuqsAdapter>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
