#!/usr/bin/env node
/**
 * Las reglas de `03` que Biome no puede vigilar.
 *
 * Biome lee imports y sintaxis, pero no mira **dentro** de una cadena de clases
 * de Tailwind. Ahí viven dos reglas que el proyecto ya se saltó a lo grande:
 * 129 tamaños tipográficos escritos a mano y ~200 usos de escala de color
 * cruda, acumulados durante meses porque nada los comprobaba.
 *
 * Funciona como trinquete, igual que `noRestrictedImports` en `biome.json`:
 * lo que ya está queda congelado en `scripts/estilo-deuda.json` y **no crece**;
 * lo nuevo se bloquea. Cada fichero sale de la lista al saldarlo, y el número
 * sólo puede bajar. Es `03 §8` —«no se crea deuda nueva; la existente se salda
 * al tocar el archivo»— hecho ejecutable.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RAICES = ["app", "packages", "components", "lib", "hooks"];
const IGNORA = new Set(["node_modules", ".next", "__tests__", "_generated"]);

/** `03 §4`: la escala tipográfica es cerrada y llega hasta `text-2xs`. */
const TAMANO_CRUDO = /\btext-\[\d+px\]/g;

/**
 * `03 §1.4`: la escala Tailwind cruda sólo es legítima en los colores de
 * estado —`green`, `yellow`, `red`, `sky`, `gray`—, que codifican una semántica
 * de dominio cerrada. El resto va por token.
 */
const COLOR_CRUDO =
  /\b(?:text|bg|border|ring|from|to|via|shadow|fill|stroke|decoration|outline|divide|accent|caret|placeholder)-(?:violet|rose|emerald|indigo|blue|orange|zinc|slate|purple|teal|cyan|amber|lime|fuchsia|pink|stone|neutral)-\d{2,3}\b/g;

const deuda = JSON.parse(
  readFileSync(new URL("./estilo-deuda.json", import.meta.url), "utf8"),
);

function* ficheros(dir) {
  for (const entrada of readdirSync(dir)) {
    if (IGNORA.has(entrada)) continue;
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) yield* ficheros(ruta);
    else if (ruta.endsWith(".tsx")) yield ruta;
  }
}

const fallos = [];
const saldados = [];

for (const raiz of RAICES) {
  for (const ruta of ficheros(raiz)) {
    const texto = readFileSync(ruta, "utf8");

    const tamanos = texto.match(TAMANO_CRUDO) ?? [];
    if (tamanos.length > 0) {
      fallos.push(
        `${ruta}: ${tamanos.length} tamaño(s) tipográfico(s) a mano ` +
          `(${[...new Set(tamanos)].join(", ")}) — usa la escala de 03 §4, ` +
          `que llega hasta text-2xs.`,
      );
    }

    const colores = texto.match(COLOR_CRUDO) ?? [];
    const permitidos = deuda.colorCrudo[ruta] ?? 0;
    if (colores.length > permitidos) {
      fallos.push(
        `${ruta}: ${colores.length} color(es) de escala cruda, congelados ${permitidos} ` +
          `(${[...new Set(colores)].slice(0, 4).join(", ")}) — usa un token de 03 §1.4. ` +
          `La escala cruda sólo vale para los colores de estado.`,
      );
    } else if (colores.length < permitidos) {
      saldados.push(`${ruta}: ${permitidos} → ${colores.length}`);
    }
  }
}

if (saldados.length > 0) {
  console.log(
    `✔ deuda de color saldada en ${saldados.length} fichero(s). ` +
      `Actualiza scripts/estilo-deuda.json para que el trinquete no retroceda:`,
  );
  for (const s of saldados) console.log(`   ${s}`);
}

if (fallos.length > 0) {
  console.error(`\n✖ ${fallos.length} incumplimiento(s) de 03:\n`);
  for (const f of fallos) console.error(`   ${f}`);
  console.error("");
  process.exit(1);
}

console.log("✔ estilo: sin tamaños ni colores crudos nuevos.");
