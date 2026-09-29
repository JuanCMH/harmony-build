/**
 * Las clases del armazón de página, tal y como las fija `03 §2.1`.
 *
 * Viven separadas del componente por dos motivos: son lo único de `page-shell`
 * que se puede probar sin montar React, y tenerlas aquí convierte la directriz
 * en algo ejecutable — si alguien cambia una altura o un desenfoque, la prueba
 * lo dice antes que una revisión visual.
 */

/** La barra superior: 48px, sticky, translúcida. Idéntica en toda página. */
export const PAGE_HEADER_CLASS =
  "z-10 flex sticky top-0 h-12 shrink-0 p-2 items-center border-b bg-background/40 backdrop-blur-lg transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12";

export const PAGE_SHELL_CLASS = "w-full h-full flex-1 flex flex-col";

/**
 * Las cuatro variantes de `<main>`, y sólo cuatro.
 *
 * Fueron dos hasta el 1 de septiembre de 2026. Ese día ya había dos pantallas
 * anulando el padding por `className` —ajustes con el aire de una vista de
 * lectura, y el constructor de plantillas a sangre—, que es exactamente la
 * variante inventada que `03 §2.1` prohíbe. Una variante con nombre se prueba;
 * una anulación suelta no.
 */
export const PAGE_MAIN_VARIANTS = {
  /** Tablas y listados a pantalla completa. Quien se desplaza es la ventana:
   *  esta sección no tiene un alto acotado y crece con su contenido. Hasta el
   *  22 de septiembre de 2026 llevaba `overflow-y-auto`, que nunca desplazaba
   *  nada pero sí la convertía en contenedor de scroll, y ahí se anclaba todo
   *  `sticky` de dentro: la columna fija del resumen financiero no se quedaba.
   *  `overflow-x-clip` recorta lo que se salga por los lados sin ese efecto. */
  listado: "flex-1 overflow-x-clip p-2 space-y-4",
  /** Vistas con paneles internos que gestionan su propio scroll.
   *  `h-1` no es un error: fuerza al flex a repartir la altura en vez de crecer
   *  con el contenido, y sin él el scroll interno no funciona. */
  compuesta: "flex flex-col flex-1 min-h-0 gap-2 h-1 p-4",
  /** Una pantalla que se lee, no que se rastrea: un área de ajustes. Columna
   *  única centrada con el aire de la referencia (`03 §1.2`, nota). */
  lectura:
    "flex-1 overflow-y-auto mx-auto w-full max-w-3xl space-y-10 px-6 pt-8 pb-16",
  /** Un editor cuyos paneles dibujan sus propios bordes —el constructor de
   *  plantillas—. Como la compuesta, pero a sangre: el padding lo pone cada
   *  panel, no el armazón. */
  editor:
    // En escritorio, el alto exacto de la ventana menos la cabecera (3rem) y
    // los márgenes del inset (1rem). Sin un alto definido la columna del
    // constructor crecía con su contenido y desplazaba el documento entero:
    // al guardar se iban la cabecera y el lienzo y quedaba un hueco en blanco.
    "flex flex-col flex-1 min-h-0 h-1 p-0 lg:h-[calc(100svh-4rem)] lg:flex-none",
} as const;

export type PageMainVariant = keyof typeof PAGE_MAIN_VARIANTS;
