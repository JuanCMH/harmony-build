"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  mode: "home" | "app";
  onComplete: () => void;
}

/** Lo que dura la salida en `globals.css` (`splash-exit`). */
const EXIT_MS = 420;

// Los trazos del isotipo, separados: las dos columnas y la banda se dibujan
// cada una por su cuenta. Son los de `HarmonyIsotype`, con la primera ruta
// partida en dos para que cada columna tenga su propio contorno.
const PILLAR_LEFT =
  "M12.25 16c0 1.41-.13 2.79-.38 4.13-.61 3.3-1.94 6.34-3.82 8.96-.09.12-.18.25-.27.37a3.72 3.72 0 0 1-3.33 1.52C2.46 30.83.93 29.11 1 27.12c.03-.79.3-1.52.74-2.11.01-.01.02-.02.02-.03A14.928 14.928 0 0 0 4.74 16c0-3.21-1-6.17-2.71-8.61-.08-.12-.17-.24-.26-.36-.01-.02-.02-.03-.03-.04C1.3 6.4 1.03 5.67 1 4.88a3.77 3.77 0 0 1 3.45-3.87c1.18-.09 2.28.37 3.04 1.14l.01.01c.19.24.37.49.55.74 1.88 2.62 3.21 5.67 3.82 8.96.25 1.35.38 2.73.38 4.14z";
const PILLAR_RIGHT =
  "M19.75 16c0-1.41.13-2.79.38-4.13.61-3.3 1.94-6.34 3.82-8.96.09-.12.18-.25.27-.37a3.72 3.72 0 0 1 3.33-1.52c1.99.16 3.52 1.88 3.45 3.87-.03.79-.3 1.52-.74 2.11q-.015 0-.03.03c-.09.12-.18.24-.27.37-1.71 2.44-2.71 5.4-2.71 8.61s1 6.17 2.71 8.61c.09.12.18.25.27.37.01.01.02.02.02.03.44.59.71 1.32.74 2.11A3.77 3.77 0 0 1 27.54 31c-1.18.09-2.28-.37-3.04-1.14l-.01-.01c-.19-.24-.37-.49-.55-.74a22.4 22.4 0 0 1-3.82-8.96 24 24 0 0 1-.37-4.15z";
const BAND =
  "M27.25 16c0 3.2 1 6.17 2.71 8.61a22.4 22.4 0 0 0-9.84-4.48c-1.34-.25-2.72-.38-4.13-.38s-2.79.13-4.13.38a22.4 22.4 0 0 0-9.84 4.48c1.71-2.44 2.71-5.4 2.71-8.61s-1-6.17-2.71-8.61a22.4 22.4 0 0 0 9.84 4.48c1.34.25 2.72.38 4.13.38s2.79-.13 4.13-.38a22.4 22.4 0 0 0 9.84-4.48A14.95 14.95 0 0 0 27.25 16z";

/**
 * Pantalla de arranque: el isotipo se dibuja trazo a trazo, el color lo
 * rellena y el nombre se descubre de izquierda a derecha. Mientras la app
 * termina de hidratar, un destello cruza el logo cada dos segundos.
 *
 * Todo es SVG y CSS (`globals.css`, bloque «Splash screen»): reemplazó el 22
 * de septiembre de 2026 al campo de partículas de tsparticles, que pesaba
 * tres paquetes para un fondo que duraba segundo y medio.
 */
export function SplashScreen({ mode, onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"visible" | "exiting" | "done">("visible");
  const minTimeReached = useRef(false);
  const contentReady = useRef(false);

  const tryExit = useCallback(() => {
    if (minTimeReached.current && contentReady.current) {
      setPhase("exiting");
    }
  }, []);

  // Minimum display time (1.5s): lo que tarda el trazo en dibujarse entero.
  useEffect(() => {
    const timer = setTimeout(() => {
      minTimeReached.current = true;
      tryExit();
    }, 1500);
    return () => clearTimeout(timer);
  }, [tryExit]);

  // Content ready signal — wait for next frame after mount to ensure hydration
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      contentReady.current = true;
      tryExit();
    });
    return () => cancelAnimationFrame(raf);
  }, [tryExit]);

  // Fade-out complete → notify parent
  useEffect(() => {
    if (phase === "exiting") {
      const timer = setTimeout(() => {
        setPhase("done");
        onComplete();
      }, EXIT_MS);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  if (phase === "done") return null;

  return (
    <div
      className={cn(
        "splash fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background",
        // Invisible pero encima: durante la salida seguía capturando los
        // clics, y la aplicación parecía lista sin responder.
        phase === "exiting" && "splash-exit pointer-events-none",
      )}
      data-mode={mode}
    >
      <svg
        viewBox="0 0 32 32"
        className="size-20 overflow-visible sm:size-24 md:size-28"
        role="img"
        aria-label="Harmony Build"
      >
        <defs>
          <clipPath id="splash-isotype">
            <path d={PILLAR_LEFT} />
            <path d={PILLAR_RIGHT} />
            <path d={BAND} />
          </clipPath>
          <linearGradient id="splash-sheen" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".7" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="splash-stroke"
          d={PILLAR_LEFT}
          pathLength={1}
          fill="#6f00ff"
          stroke="#818cf8"
        />
        <path
          className="splash-stroke"
          d={PILLAR_RIGHT}
          pathLength={1}
          fill="#6f00ff"
          stroke="#818cf8"
        />
        <path
          className="splash-stroke splash-stroke-band"
          d={BAND}
          pathLength={1}
          fill="#818cf8"
          stroke="#6f00ff"
        />
        <g clipPath="url(#splash-isotype)">
          <rect
            className="splash-sheen"
            x="-12"
            y="-4"
            width="10"
            height="40"
            fill="url(#splash-sheen)"
          />
        </g>
      </svg>

      <span className="splash-word mt-8 font-space-grotesk text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Harmony Build
      </span>
    </div>
  );
}
