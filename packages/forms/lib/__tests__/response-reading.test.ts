import type {
  FieldConfig,
  FieldType,
  FormField,
  FormSection,
  StoredFieldValue,
} from "@/convex/lib/form_types";
import { describe, expect, it } from "vitest";
import {
  columnAsField,
  fileUrlsById,
  momentText,
  outdatedEntryNotice,
  personName,
  readResponse,
  timeText,
  versionLine,
  importedNotice,
} from "../response-reading";

const field = (
  id: string,
  type: FieldType,
  config: FieldConfig = {},
): FormField => ({
  id,
  type,
  label: id,
  required: false,
  size: "medium",
  showInTable: false,
  config,
});

const section = (
  id: string,
  order: number,
  fields: FormField[],
  visibility?: FormSection["visibility"],
): FormSection => ({ id, label: id, order, fields, visibility });

const text = (fieldId: string, value: string): StoredFieldValue => ({
  fieldId,
  value: { kind: "text", value },
});

const read = (
  sections: FormSection[],
  values: StoredFieldValue[],
  today = "2026-09-29",
) =>
  readResponse(
    { sections, values, date: "2026-09-20", authorId: "user-1" },
    today,
  );

const shownIds = (sections: FormSection[], values: StoredFieldValue[]) =>
  read(sections, values).sections.flatMap((visible) =>
    visible.fields.map((shown) => shown.id),
  );

describe("leer una respuesta", () => {
  it("enseña los campos en el orden de sus secciones", () => {
    const sections = [
      section("b", 2, [field("tres", "text")]),
      section("a", 1, [field("uno", "text"), field("dos", "text")]),
    ];
    expect(shownIds(sections, [text("uno", "x")])).toEqual([
      "uno",
      "dos",
      "tres",
    ]);
  });

  it("un campo que quedó oculto al responder no se enseña", () => {
    const sections = [
      section("a", 1, [
        field("tipo", "select", {
          options: [
            { label: "Eléctrico", value: "electric" },
            { label: "Manual", value: "manual" },
          ],
        }),
        field("voltaje", "text", {
          visibility: {
            match: "all",
            rules: [{ fieldId: "tipo", operator: "eq", values: ["electric"] }],
          },
        }),
      ]),
    ];
    expect(shownIds(sections, [text("tipo", "manual")])).toEqual(["tipo"]);
    expect(shownIds(sections, [text("tipo", "electric")])).toEqual([
      "tipo",
      "voltaje",
    ]);
  });

  it("una sección que no aplicaba no sale, ni con su título", () => {
    const sections = [
      section("equipo", 1, [field("electrico", "checkbox")]),
      section("conexiones", 2, [field("cable", "text")], {
        match: "all",
        rules: [{ fieldId: "electrico", operator: "isChecked", values: [] }],
      }),
    ];
    const result = read(sections, [
      { fieldId: "electrico", value: { kind: "boolean", value: false } },
    ]);
    expect(result.sections.map((visible) => visible.section.id)).toEqual([
      "equipo",
    ]);
  });

  it("una regla sobre la fecha de la respuesta usa la suya, no la de hoy", () => {
    const sections = [
      section("a", 1, [
        field("nota", "text", {
          visibility: {
            match: "all",
            rules: [
              { fieldId: "@fecha", operator: "before", values: ["2026-09-25"] },
            ],
          },
        }),
      ]),
    ];
    // La respuesta es del 20; hoy es 29. Si se evaluara con hoy, no saldría.
    expect(shownIds(sections, [])).toEqual(["nota"]);
  });

  it("calcula al leer los derivados que dependen de hoy", () => {
    const sections = [
      section("a", 1, [
        field("vence", "date"),
        field("faltan", "number", {
          computed: { kind: "daysUntil", of: "vence" },
        }),
      ]),
    ];
    const values = [text("vence", "2026-10-09")];
    expect(read(sections, values, "2026-09-29").values.faltan).toBe(10);
    expect(read(sections, values, "2026-10-08").values.faltan).toBe(1);
  });

  it("los demás derivados se leen como se guardaron", () => {
    const sections = [
      section("a", 1, [
        field("personas", "number"),
        field("horas", "number"),
        field("total", "number", {
          computed: {
            kind: "arithmetic",
            operands: ["personas", "horas"],
            op: "*",
          },
        }),
      ]),
    ];
    const result = read(sections, [
      { fieldId: "personas", value: { kind: "number", value: 4 } },
      { fieldId: "horas", value: { kind: "number", value: 8 } },
      // Lo que el servidor guardó, aunque hoy el motor diría 32.
      { fieldId: "total", value: { kind: "number", value: 30 } },
    ]);
    expect(result.values.total).toBe(30);
  });

  it("titula las secciones sólo si la versión tiene más de una", () => {
    const one = [section("a", 1, [field("uno", "text")])];
    const two = [...one, section("b", 2, [field("dos", "text")])];
    expect(read(one, []).hasSectionTitles).toBe(false);
    expect(read(two, []).hasSectionTitles).toBe(true);
  });

  it("una respuesta sin autor se lee igual", () => {
    const sections = [section("a", 1, [field("uno", "text")])];
    const result = readResponse(
      {
        sections,
        values: [text("uno", "x")],
        date: "2026-09-20",
        authorId: null,
      },
      "2026-09-29",
    );
    expect(result.values.uno).toBe("x");
  });
});

describe("los archivos de una respuesta", () => {
  it("se buscan por su storageId, y el que ya no está no entra", () => {
    const urls = fileUrlsById([
      { storageId: "a", url: "https://files/a" },
      { storageId: "b", url: null },
    ]);
    expect(urls.get("a")).toBe("https://files/a");
    expect(urls.has("b")).toBe(false);
  });
});

describe("la columna de una tabla como campo", () => {
  it("conserva sus opciones, para leer la etiqueta y no el valor", () => {
    const asField = columnAsField({
      id: "talla",
      label: "Talla",
      type: "select",
      required: true,
      options: [{ label: "Mediana", value: "m" }],
    });
    expect(asField.type).toBe("select");
    expect(asField.config.options).toEqual([{ label: "Mediana", value: "m" }]);
    expect(asField.required).toBe(true);
  });

  it("no inventa configuración que la columna no tiene", () => {
    const asField = columnAsField({
      id: "cantidad",
      label: "Cantidad",
      type: "number",
      required: false,
    });
    expect(asField.config).toEqual({});
  });
});

describe("la línea de versión", () => {
  it("dice el número y el día en que se publicó, en Colombia", () => {
    // 16 de mayo a las 02:00 UTC son las 21:00 del 15 en Colombia.
    const publishedAt = Date.UTC(2026, 4, 16, 2, 0);
    expect(versionLine({ number: 4, publishedAt })).toBe(
      "Versión 4 · publicada el 15/05/2026",
    );
  });

  it("sin fecha de publicación dice sólo el número", () => {
    expect(versionLine({ number: 2, publishedAt: null })).toBe("Versión 2");
  });

  it("una respuesta cuya versión ya no existe lo dice", () => {
    expect(versionLine(null)).toBe("Versión no disponible");
  });
});

describe("el aviso de un elemento en una versión anterior", () => {
  const entry = (versionId: string, published: string | null) => ({
    version: { _id: versionId, number: 2 },
    form: { publishedVersionId: published },
  });

  it("no avisa si está en la vigente", () => {
    expect(outdatedEntryNotice(entry("v4", "v4"), 4)).toBeNull();
  });

  it("dice con qué versión se guardó y a cuál pasará", () => {
    expect(outdatedEntryNotice(entry("v2", "v4"), 4)).toBe(
      "Este elemento se guardó con la versión 2 del listado; al editarlo pasará a la 4.",
    );
  });

  it("sin el número de la vigente no lo inventa", () => {
    expect(outdatedEntryNotice(entry("v2", "v4"), null)).toBe(
      "Este elemento se guardó con la versión 2 del listado; al editarlo pasará a la vigente.",
    );
  });

  it("no avisa si no hay con qué comparar", () => {
    expect(outdatedEntryNotice(entry("v2", null), null)).toBeNull();
    expect(
      outdatedEntryNotice(
        { version: null, form: { publishedVersionId: "v4" } },
        4,
      ),
    ).toBeNull();
  });
});

describe("el nombre de una persona", () => {
  it("usa el nombre, y si no tiene, el correo", () => {
    expect(personName({ name: "Ana Ruiz" })).toBe("Ana Ruiz");
    expect(personName({ name: "  ", email: "ana@obra.co" })).toBe(
      "ana@obra.co",
    );
  });

  it("quien ya no existe es un usuario desconocido", () => {
    expect(personName(null)).toBe("Usuario desconocido");
  });
});

describe("el momento de un registro", () => {
  // 2026-09-15 11:40 UTC es 06:40 en Colombia (UTC−5, sin horario de verano).
  const morning = Date.UTC(2026, 8, 15, 11, 40);
  // 2026-09-16 03:10 UTC todavía es el 15 en Colombia.
  const lateNight = Date.UTC(2026, 8, 16, 3, 10);

  it("la hora es la de Colombia, con dos cifras y en 24 horas", () => {
    expect(timeText(morning)).toBe("06:40");
    expect(timeText(lateNight)).toBe("22:10");
  });

  it("el día también es el de Colombia, con el año entero", () => {
    expect(momentText(morning)).toBe("15/09/2026 a las 06:40");
    expect(momentText(lateNight)).toBe("15/09/2026 a las 22:10");
  });
});

describe("importedNotice", () => {
  // Las 15:30 UTC son las 10:30 en Colombia.
  const at = Date.UTC(2026, 9, 12, 15, 30);

  it("dice cuándo, quién y de qué archivo, y lo que no trae", () => {
    expect(
      importedNotice(
        { at, by: { name: "Nidia" }, fileName: "historia.xlsx" },
        false,
      ),
    ).toBe(
      `Respuesta importada el ${momentText(at)} por Nidia, desde historia.xlsx. No se diligenció aquí: no trae firmas, fotos, archivos ni tablas.`,
    );
  });

  it("en un elemento, y sin el registro de la importación", () => {
    expect(importedNotice({ at, by: null, fileName: null }, true)).toBe(
      `Elemento importado el ${momentText(at)} por Usuario desconocido.`,
    );
  });
});
