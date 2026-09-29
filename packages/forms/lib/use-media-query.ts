"use client";

import { useEffect, useState } from "react";

/** Desde `lg` (`03 §6.2`): donde una tabla es una tabla y las secciones son
 *  pestañas. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/** Un dispositivo que se maneja con el dedo: el que tiene cámara a mano. */
export const TOUCH_QUERY = "(pointer: coarse)";

/**
 * Si la pantalla cumple una consulta de medios.
 *
 * Es para lo que CSS no puede hacer solo: **elegir qué se monta**. Una tabla
 * pintada dos veces —como tarjetas y como tabla, una de las dos oculta—
 * duplicaría los `id` de sus controles y el trazo de cada firma.
 *
 * Empieza en `false` —el teléfono, que es de donde se parte— y se corrige al
 * montar: `matchMedia` no existe en el render del servidor (`02 §7`).
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
};
