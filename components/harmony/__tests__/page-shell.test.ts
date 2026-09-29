import { describe, expect, it } from "vitest";

import {
  PAGE_HEADER_CLASS,
  PAGE_MAIN_VARIANTS,
  PAGE_SHELL_CLASS,
} from "../page-shell.utils";

/** Estas pruebas son la directriz `03 §2.1` hecha ejecutable. No comprueban que
 *  el componente «funcione»: comprueban que nadie mueva el canon sin darse
 *  cuenta. El recorrido del 29 de agosto encontró cinco alturas de cabecera
 *  distintas conviviendo en la aplicación; esto es lo que impide la sexta. */
describe("armazón de página (03 §2.1)", () => {
  const clases = (valor: string) => new Set(valor.split(/\s+/));

  describe("cabecera", () => {
    const c = clases(PAGE_HEADER_CLASS);

    it("mide 48px de alto", () => {
      expect(c.has("h-12")).toBe(true);
      expect(PAGE_HEADER_CLASS).not.toMatch(/\bh-(14|16)\b/);
    });

    it("usa el desenfoque estándar, no el ligero (03 §0.3)", () => {
      expect(c.has("backdrop-blur-lg")).toBe(true);
      expect(c.has("backdrop-blur-sm")).toBe(false);
      expect(c.has("backdrop-blur")).toBe(false);
    });

    it("usa la translucidez del canon", () => {
      expect(c.has("bg-background/40")).toBe(true);
      expect(PAGE_HEADER_CLASS).not.toMatch(/bg-background\/(80|95)/);
    });

    it("lleva el padding de la retícula y el borde inferior", () => {
      expect(c.has("p-2")).toBe(true);
      expect(c.has("border-b")).toBe(true);
      expect(c.has("border-border/40")).toBe(false);
    });

    it("es pegajosa y no se encoge", () => {
      expect(c.has("sticky")).toBe(true);
      expect(c.has("top-0")).toBe(true);
      expect(c.has("shrink-0")).toBe(true);
    });
  });

  describe("contenido", () => {
    it("ofrece exactamente cinco variantes", () => {
      expect(Object.keys(PAGE_MAIN_VARIANTS)).toEqual([
        "listado",
        "compuesta",
        "lectura",
        "editor",
        "documento",
      ]);
    });

    it("la de documento parte del teléfono y deja sitio a la barra de envío", () => {
      const c = clases(PAGE_MAIN_VARIANTS.documento);
      expect(c.has("px-4")).toBe(true);
      expect(c.has("pb-24")).toBe(true);
      expect(c.has("max-w-5xl")).toBe(true);
      // Un contenedor de scroll anclaría los títulos `sticky` de una lista de
      // chequeo a él y no a la ventana.
      expect(c.has("overflow-y-auto")).toBe(false);
    });

    it("la de listado recorta sin ser contenedor de scroll, con el padding denso", () => {
      const c = clases(PAGE_MAIN_VARIANTS.listado);
      // `overflow-y-auto` anclaba en esta sección todo `sticky` de dentro, y
      // la sección nunca se desplaza: se desplaza la ventana.
      expect(c.has("overflow-y-auto")).toBe(false);
      expect(c.has("overflow-x-clip")).toBe(true);
      expect(c.has("p-2")).toBe(true);
    });

    it("la compuesta conserva `h-1`, que reparte la altura", () => {
      const c = clases(PAGE_MAIN_VARIANTS.compuesta);
      expect(c.has("h-1")).toBe(true);
      expect(c.has("min-h-0")).toBe(true);
      expect(c.has("p-4")).toBe(true);
    });

    it("la de lectura lleva el aire medido contra la referencia (03 §1.2)", () => {
      const c = clases(PAGE_MAIN_VARIANTS.lectura);
      expect(c.has("max-w-3xl")).toBe(true);
      expect(c.has("mx-auto")).toBe(true);
      expect(c.has("px-6")).toBe(true);
      expect(c.has("pt-8")).toBe(true);
      expect(c.has("pb-16")).toBe(true);
      expect(c.has("space-y-10")).toBe(true);
    });

    it("la de editor va a sangre y reparte la altura como la compuesta", () => {
      const c = clases(PAGE_MAIN_VARIANTS.editor);
      expect(c.has("p-0")).toBe(true);
      expect(c.has("h-1")).toBe(true);
      expect(c.has("min-h-0")).toBe(true);
    });

    it("ninguna variante de trabajo airea la retícula por encima de p-4 (03 §1.2)", () => {
      for (const variante of [
        PAGE_MAIN_VARIANTS.listado,
        PAGE_MAIN_VARIANTS.compuesta,
        PAGE_MAIN_VARIANTS.editor,
      ]) {
        expect(variante).not.toMatch(/\bp-[68]\b/);
      }
    });
  });

  it("el armazón reparte la altura sin envolver", () => {
    const c = clases(PAGE_SHELL_CLASS);
    expect(c.has("flex")).toBe(true);
    expect(c.has("flex-col")).toBe(true);
    expect(c.has("flex-1")).toBe(true);
  });
});
