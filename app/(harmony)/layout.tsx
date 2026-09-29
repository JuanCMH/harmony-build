import { HarmonyLayoutClient } from "@/components/harmony/harmony-layout-client";

export default function HarmonyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <HarmonyLayoutClient>{children}</HarmonyLayoutClient>;
}
