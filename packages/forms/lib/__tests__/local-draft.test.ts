import type { FormField, FormSection } from "@/convex/lib/form_types";
import { describe, expect, it } from "vitest";
import {
  clearDraft,
  DRAFT_MAX_AGE_MS,
  draftAgeText,
  draftKey,
  type DraftStorage,
  omittedText,
  parseDraft,
  readDraft,
  serializeDraft,
  staleDraftKeys,
  stripFiles,
  writeDraft,
} from "../local-draft";

const field = (
  id: string,
  type: FormField["type"],
  label: string,
  config: FormField["config"] = {},
): FormField => ({
  id,
  type,
  label,
  required: false,
  size: "medium",
  showInTable: false,
  config,
});

const SECTIONS: FormSection[] = [
  {
    id: "general",
    label: "General",
    order: 1,
    fields: [
      field("placa", "text", "Placa"),
      field("kilometraje", "number", "Kilometraje"),
      field("foto", "image", "Foto del vehículo"),
      field("firma", "signature", "Firma del conductor"),
      field("elementos", "table", "Elementos entregados", {
        table: {
          rowLabel: "Elemento",
          columns: [
            { id: "detalle", label: "Detalle", type: "text", required: true },
            {
              id: "recibido",
              label: "Recibí",
              type: "signature",
              required: true,
            },
          ],
        },
      }),
    ],
  },
];

const SCOPE = { projectId: "p1", formId: "f1", versionNumber: 4 };

const pending = (name: string) => ({
  file: new File(["x"], name, { type: "image/png" }),
  name,
});

/** Un instante dicho en hora de Colombia (UTC−5). */
const colombia = (day: number, hour: number, minute = 0) =>
  Date.UTC(2026, 8, day, hour + 5, minute);

const memoryStorage = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial));
  const storage: DraftStorage = {
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
  return { storage, items };
};

describe("la clave de un borrador", () => {
  it("distingue proyecto, formato y versión", () => {
    const keys = new Set([
      draftKey(SCOPE),
      draftKey({ ...SCOPE, projectId: "p2" }),
      draftKey({ ...SCOPE, formId: "f2" }),
      draftKey({ ...SCOPE, versionNumber: 5 }),
    ]);
    expect(keys.size).toBe(4);
  });

  it("los borradores de otra versión del mismo formato sobran", () => {
    const keys = [
      draftKey(SCOPE),
      draftKey({ ...SCOPE, versionNumber: 3 }),
      draftKey({ ...SCOPE, formId: "f2", versionNumber: 3 }),
      "otra-cosa",
    ];
    expect(staleDraftKeys(keys, SCOPE)).toEqual([
      draftKey({ ...SCOPE, versionNumber: 3 }),
    ]);
  });

  it("un formato cuyo id empieza igual que otro no se confunde", () => {
    const other = draftKey({ ...SCOPE, formId: "f10" });
    expect(staleDraftKeys([other], SCOPE)).toEqual([]);
  });
});

describe("lo que se guarda", () => {
  it("quita los archivos y las firmas, y recuerda de qué campos eran", () => {
    const { values, omitted } = stripFiles(SECTIONS, {
      placa: "SLP-835",
      foto: pending("frente.png"),
      firma: { ...pending("firma.png"), signerName: "Ana" },
    });
    expect(values).toEqual({ placa: "SLP-835" });
    expect(omitted).toEqual(["Foto del vehículo", "Firma del conductor"]);
  });

  it("quita también los de las celdas de una tabla, y deja el resto", () => {
    const { values, omitted } = stripFiles(SECTIONS, {
      elementos: [
        {
          rowId: "fila-1",
          cells: [
            { columnId: "detalle", value: "Casco" },
            {
              columnId: "recibido",
              value: { ...pending("firma.png"), signerName: "Ana" },
            },
          ],
        },
      ],
    });
    expect(values.elementos).toEqual([
      { rowId: "fila-1", cells: [{ columnId: "detalle", value: "Casco" }] },
    ]);
    expect(omitted).toEqual(["Elementos entregados"]);
  });

  it("un archivo ya subido tampoco se guarda: caduca en una hora", () => {
    const { values, omitted } = stripFiles(SECTIONS, {
      foto: { storageId: "s1", name: "frente.png" },
    });
    expect(values).toEqual({});
    expect(omitted).toEqual(["Foto del vehículo"]);
  });

  it("lo que no es de ningún campo del formato no entra", () => {
    expect(
      stripFiles(SECTIONS, { placa: "SLP-835", "@autor": "u1", viejo: "x" })
        .values,
    ).toEqual({ placa: "SLP-835" });
  });

  it("sin nada escrito no hay borrador", () => {
    expect(serializeDraft(SECTIONS, {}, 1)).toBeNull();
    expect(serializeDraft(SECTIONS, { placa: "  " }, 1)).toBeNull();
    expect(
      serializeDraft(
        SECTIONS,
        { elementos: [{ rowId: "fila-1", cells: [] }] },
        1,
      ),
    ).toBeNull();
  });

  it("sólo una firma tampoco es un borrador: no se podría recuperar", () => {
    expect(
      serializeDraft(
        SECTIONS,
        { firma: { ...pending("firma.png"), signerName: "Ana" } },
        1,
      ),
    ).toBeNull();
  });

  it("lo guardado se recupera igual", () => {
    const now = colombia(29, 10);
    const raw = serializeDraft(
      SECTIONS,
      { placa: "SLP-835", kilometraje: 45230, foto: pending("frente.png") },
      now,
    );
    expect(parseDraft(raw, now)).toEqual({
      savedAt: now,
      values: { placa: "SLP-835", kilometraje: 45230 },
      omitted: ["Foto del vehículo"],
    });
  });
});

describe("si un borrador sirve", () => {
  const now = colombia(29, 10);
  const raw = (savedAt: number) =>
    serializeDraft(SECTIONS, { placa: "SLP-835" }, savedAt);

  it("no sirve si es de hace más de una semana", () => {
    expect(parseDraft(raw(now - DRAFT_MAX_AGE_MS - 1), now)).toBeNull();
    expect(parseDraft(raw(now - DRAFT_MAX_AGE_MS + 1000), now)).not.toBeNull();
  });

  it("no sirve si está corrupto o tiene otra forma", () => {
    expect(parseDraft("{no es json", now)).toBeNull();
    expect(parseDraft("null", now)).toBeNull();
    expect(parseDraft('"texto"', now)).toBeNull();
    expect(
      parseDraft(JSON.stringify({ shape: 99, savedAt: now, values: {} }), now),
    ).toBeNull();
    expect(
      parseDraft(
        JSON.stringify({ shape: 1, savedAt: "ayer", values: { a: 1 } }),
        now,
      ),
    ).toBeNull();
    expect(
      parseDraft(JSON.stringify({ shape: 1, savedAt: now, values: [] }), now),
    ).toBeNull();
  });

  it("sin nada guardado no hay borrador", () => {
    expect(parseDraft(null, now)).toBeNull();
    expect(parseDraft("", now)).toBeNull();
  });
});

describe("de cuándo es el borrador", () => {
  it("de hace un momento, si no ha pasado una hora", () => {
    expect(draftAgeText(colombia(29, 9, 30), colombia(29, 10))).toBe(
      "de hace un momento",
    );
  });

  it("del mismo día, por la parte del día", () => {
    const evening = colombia(29, 22);
    expect(draftAgeText(colombia(29, 6, 40), evening)).toBe("de esta mañana");
    expect(draftAgeText(colombia(29, 14), evening)).toBe("de esta tarde");
    expect(draftAgeText(colombia(29, 19, 30), evening)).toBe("de esta noche");
  });

  it("de ayer y de hace días", () => {
    expect(draftAgeText(colombia(28, 23), colombia(29, 6))).toBe("de ayer");
    expect(draftAgeText(colombia(26, 8), colombia(29, 6))).toBe(
      "de hace 3 días",
    );
  });
});

describe("lo que no se pudo guardar", () => {
  it("no dice nada si se guardó todo", () => {
    expect(omittedText([])).toBeNull();
  });

  it("nombra el campo, o los campos", () => {
    expect(omittedText(["Firma del conductor"])).toBe(
      "«Firma del conductor» no se guardó en el dispositivo: vuelve a ponerlo.",
    );
    expect(omittedText(["Foto", "Firma", "Foto"])).toBe(
      "«Foto» y «Firma» no se guardaron en el dispositivo: vuelve a ponerlos.",
    );
  });
});

describe("el almacenamiento", () => {
  const now = colombia(29, 10);

  it("guarda y recupera", () => {
    const { storage } = memoryStorage();
    expect(
      writeDraft(storage, SCOPE, SECTIONS, { placa: "SLP-835" }, now),
    ).toBe(true);
    expect(readDraft(storage, SCOPE, now)?.values).toEqual({
      placa: "SLP-835",
    });
  });

  it("al leer, borra los borradores de otra versión del formato", () => {
    const old = { ...SCOPE, versionNumber: 3 };
    const { storage, items } = memoryStorage();
    writeDraft(storage, old, SECTIONS, { placa: "VIEJA" }, now);

    expect(readDraft(storage, SCOPE, now)).toBeNull();
    expect(items.has(draftKey(old))).toBe(false);
  });

  it("al leer, borra el borrador que ya no sirve", () => {
    const { storage, items } = memoryStorage({ [draftKey(SCOPE)]: "{roto" });
    expect(readDraft(storage, SCOPE, now)).toBeNull();
    expect(items.size).toBe(0);
  });

  it("si se borra todo lo escrito, se borra el borrador", () => {
    const { storage, items } = memoryStorage();
    writeDraft(storage, SCOPE, SECTIONS, { placa: "SLP-835" }, now);
    expect(writeDraft(storage, SCOPE, SECTIONS, { placa: "" }, now)).toBe(
      false,
    );
    expect(items.size).toBe(0);
  });

  it("se borra al enviar", () => {
    const { storage, items } = memoryStorage();
    writeDraft(storage, SCOPE, SECTIONS, { placa: "SLP-835" }, now);
    clearDraft(storage, SCOPE);
    expect(items.size).toBe(0);
  });

  it("sin almacenamiento no guarda ni rompe", () => {
    expect(writeDraft(null, SCOPE, SECTIONS, { placa: "SLP-835" }, now)).toBe(
      false,
    );
    expect(readDraft(null, SCOPE, now)).toBeNull();
    expect(() => clearDraft(null, SCOPE)).not.toThrow();
  });

  it("con el almacenamiento lleno o negado no rompe", () => {
    const broken: DraftStorage = {
      length: 1,
      key: () => {
        throw new Error("SecurityError");
      },
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(writeDraft(broken, SCOPE, SECTIONS, { placa: "SLP-835" }, now)).toBe(
      false,
    );
    expect(readDraft(broken, SCOPE, now)).toBeNull();
    expect(() => clearDraft(broken, SCOPE)).not.toThrow();
    // Borrar lo guardado también pasa por un almacenamiento que lanza.
    expect(writeDraft(broken, SCOPE, SECTIONS, {}, now)).toBe(false);
  });
});
