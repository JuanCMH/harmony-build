/** La fidelidad al papel: que en cada lista de chequeo estén los ítems del
 *  formato original, ni uno más ni uno menos, y que toda inspección siga las
 *  decisiones de diseño (observación al marcar no conforme, observaciones
 *  generales y firma de quien diligencia).
 */

import { describe, expect, it } from "vitest";
import { SST_LIBRARY } from "../index";
import { answerable, checklistsOf, EACH_FORM } from "./readers";

/* ──────────────────────────────── El papel ──────────────────────────────── */

/** Cuántas filas se responden en cada lista de chequeo, contadas en los
 *  Excel originales: `formato → campo → filas`. Los subítems cuentan; las
 *  filas que sólo agrupan («Pedales», «Luces frontales»), no. */
const EXPECTED_ITEMS: Record<string, Record<string, number>> = {
  "sst-f-010": { "estado-vehiculo": 63 },
  "sst-f-031": { inspeccion: 16 },
  "sst-f-038": { inspeccion: 14 },
  "sst-f-080": { inspeccion: 34, "condiciones-operario": 2 },
  "sst-f-083": { inspeccion: 14 },
  "sst-f-090": { inspeccion: 16 },
  "sst-f-115": { inspeccion: 26 },
  "sst-f-116": { inspeccion: 20 },
  "sst-f-118": { inspeccion: 16 },
  "sst-f-075": { inspeccion: 33, "condiciones-botiquin": 4 },
  "sst-f-066": { inspeccion: 9 },
  "sst-f-065": { inspeccion: 18 },
  "sst-f-074": { inspeccion: 8 },
};

/** Los bloques de SST-F-010, que son las nueve secciones del papel. */
const EXPECTED_BLOCKS_010 = [3, 7, 4, 12, 13, 13, 2, 2, 7];

/** Las categorías de las inspecciones: las que llevan lista y firma. */
const INSPECTION_CATEGORIES = [
  "Inspecciones preoperacionales",
  "Inspecciones de emergencia",
];

describe("biblioteca SST frente al papel", () => {
  it("cuenta en cada lista de chequeo los ítems del papel", () => {
    const counted = Object.fromEntries(
      SST_LIBRARY.filter((form) => checklistsOf(form).length > 0).map(
        (form) => [
          form.key,
          Object.fromEntries(
            checklistsOf(form).map(({ field, checklist }) => [
              field.id,
              answerable(checklist).length,
            ]),
          ),
        ],
      ),
    );
    expect(counted).toEqual(EXPECTED_ITEMS);
  });

  it("reparte los 63 ítems de SST-F-010 en los nueve bloques del papel", () => {
    const form = SST_LIBRARY.find((candidate) => candidate.key === "sst-f-010");
    const [list] = form ? checklistsOf(form) : [];
    expect(list.checklist.blocks.map((block) => block.label)).toEqual([
      "1. Niveles",
      "2. Mecánico",
      "3. Sistema de carga",
      "4. Interior del vehículo",
      "5. Exterior del vehículo",
      "6. Llantas según las posiciones",
      "7. Equipo de contingencia",
      "8. Sistema de seguridad",
      "9. Equipo de carretera",
    ]);
    expect(
      list.checklist.blocks.map(
        (block) => block.items.filter((item) => !item.heading).length,
      ),
    ).toEqual(EXPECTED_BLOCKS_010);
  });
});

/** Las listas donde «No» no es un hallazgo que haya que explicar: un botiquín
 *  portátil no está instalado en la pared, y eso no es un defecto. */
const OPTIONAL_NOTES = new Set(["sst-f-075/condiciones-botiquin"]);

describe.each(EACH_FORM)("%s", (_key, form) => {
  it("una inspección pide observación al marcar no conforme, y cierra con observaciones y firma", () => {
    for (const { field, checklist } of checklistsOf(form)) {
      expect(checklist.note, field.id).toBe(
        OPTIONAL_NOTES.has(`${form.key}/${field.id}`) ? "optional" : "onFail",
      );
      expect(field.required, field.id).toBe(true);
      const meanings = checklist.options.map((option) => option.meaning);
      expect(meanings, field.id).toContain("ok");
      expect(meanings, field.id).toContain("fail");
      for (const block of checklist.blocks) {
        // Una fila que agrupa va seguida de sus subítems, y sólo ellos
        // llevan sangría.
        block.items.forEach((item, index) => {
          const previous = block.items[index - 1];
          if (item.heading) {
            expect(block.items[index + 1]?.indented, item.id).toBe(true);
            expect(item.indented, item.id).toBeUndefined();
          }
          if (item.indented) {
            expect(
              previous?.heading === true || previous?.indented === true,
              item.id,
            ).toBe(true);
          }
        });
      }
    }
    if (!INSPECTION_CATEGORIES.includes(form.category)) return;

    expect(checklistsOf(form).length).toBeGreaterThan(0);
    // Una inspección es una sola sección, que termina en las observaciones y
    // la firma.
    expect(form.sections).toHaveLength(1);
    const closing = form.sections[0].fields.slice(-2);
    expect(closing.map((field) => field.type)).toEqual([
      "textarea",
      "signature",
    ]);
    const [notes, signature] = closing;
    expect(notes.required).toBe(false);
    expect(signature.required).toBe(true);
    expect(signature.config.signature?.signer).toBe("author");
  });
});
