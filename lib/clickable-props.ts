import type { KeyboardEvent } from "react";

/**
 * Las props que convierten un contenedor en un control alcanzable.
 *
 * Un `<div onClick>` se pulsa con el ratón y no existe para el tabulador: ni se
 * enfoca, ni responde a Enter o Espacio. Lo correcto casi siempre es un
 * `<button>`, y así se resolvieron los que podían serlo. Esto es para los que
 * **no** pueden: los que llevan dentro otro botón —un asa de arrastre, un menú
 * de fila—, porque anidar botones es HTML inválido.
 *
 * El 7 de septiembre de 2026 había dieciséis contenedores así repartidos por
 * trece ficheros, cada uno con su propia versión del mismo bloque de teclado o
 * sin ninguna. Esto es esa versión, una sola vez.
 *
 * `role="button"` además hace que la regla de `globals.css` le dé el cursor de
 * mano, así que no hay que acordarse de `cursor-pointer`.
 *
 * ```tsx
 * <div {...clickableProps(() => abrirFicha(id))} className="…">
 * ```
 */
export function clickableProps(onActivate: () => void) {
  return {
    role: "button",
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent) => {
      // Sólo si la tecla es para este control: si el foco está en un botón de
      // dentro, el evento burbujea hasta aquí y activaría las dos cosas.
      if (event.target !== event.currentTarget) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onActivate();
    },
  } as const;
}
