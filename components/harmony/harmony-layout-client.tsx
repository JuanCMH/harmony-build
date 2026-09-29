"use client";

import { SplashScreen } from "@/components/harmony/splash-screen";
import { useLayoutEffect, useState } from "react";

interface HarmonyLayoutClientProps {
  children: React.ReactNode;
}

export function HarmonyLayoutClient({ children }: HarmonyLayoutClientProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShow, setShouldShow] = useState(true);

  useLayoutEffect(() => {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const isReload = navigation?.type === "reload";
    const isDirectNavigation = navigation?.type === "navigate";

    // Show splash on first load or reload (PWA cold start, browser refresh)
    const shouldShowSplash = isReload || isDirectNavigation;

    if (!shouldShowSplash) {
      setIsLoading(false);
      setShouldShow(false);
    }
  }, []);

  const handleComplete = () => {
    setIsLoading(false);
    setShouldShow(false);
  };

  return (
    <>
      {children}
      {isLoading && shouldShow && (
        <SplashScreen mode="app" onComplete={handleComplete} />
      )}
    </>
  );
}
