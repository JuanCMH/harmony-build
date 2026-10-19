"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { fitRows } from "./fit-rows";

/**
 * El alto y el ancho que la tarjeta le deja a un contenedor, medidos antes de
 * pintar y otra vez si cambian (otro ancho, un título en dos líneas). `null`
 * hasta la primera medida.
 *
 * El contenedor que lleva `ref` tiene que tomar el alto que sobra, no el de
 * lo que lleva dentro: `flex-1 basis-0 min-h-0`.
 */
export function useMeasuredBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ height: number; width: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      setBox({ height: element.clientHeight, width: element.clientWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, height: box?.height ?? null, width: box?.width ?? null };
}

/** Cuántas filas enseña una lista dentro de su tarjeta (`fitRows`). Antes de
 *  la primera medida, todas: la medida llega antes de pintar. */
export function useFitRows(
  total: number,
  rowHeight: number,
  moreHeight: number,
  /** Hay más de las que llegaron: la línea de «y N más» va siempre. */
  more = false,
) {
  const { ref, height } = useMeasuredBox();
  const visible =
    height === null
      ? total
      : fitRows({ space: height, total, rowHeight, moreHeight, more });
  return { ref, visible, hidden: total - visible };
}
