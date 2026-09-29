import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { field, oneSection, tableField } from "../lib/__tests__/form.fixtures";
import {
  formProblems,
  formResponsesErrors,
  valueProblems,
} from "../lib/error_messages";
import type { FormSection, FormValues, TableRow } from "../lib/form_types";
import { fromStoredValues } from "../lib/stored_values";
import {
  FIRST_PAGE,
  grant,
  type Seed,
  seedForm,
  seedProject,
  setupTest,
  stored,
  storeFile,
  type TestConvex,
} from "./helpers";

type StoredValue = Doc<"formResponses">["values"][number]["value"];
type StoredCell = Extract<
  StoredValue,
  { kind: "table" }
>["rows"][number]["cells"][number]["value"];

const authState = vi.hoisted(() => ({
  userId: null as Id<"users"> | null,
}));

vi.mock("@convex-dev/auth/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@convex-dev/auth/server")>();
  return {
    ...actual,
    getAuthUserId: async () => authState.userId,
  };
});

/** La entrega de dotación y EPP (`SST-F-007`): una fila por elemento, con la
 *  firma de quien recibe y la foto de lo entregado. */
const DELIVERY: FormSection[] = oneSection(
  field("trabajador", { label: "Trabajador", required: true }),
  tableField(
    "entregas",
    { label: "Elementos entregados", required: true, showInTable: true },
    {
      rowLabel: "Elemento entregado",
      minRows: 1,
      maxRows: 3,
      columns: [
        { id: "elemento", label: "Elemento", type: "text", required: true },
        { id: "cantidad", label: "Cantidad", type: "number", required: true },
        { id: "fecha", label: "Fecha", type: "date", required: false },
        {
          id: "talla",
          label: "Talla",
          type: "select",
          required: false,
          options: [
            { label: "M", value: "m" },
            { label: "L", value: "l" },
          ],
        },
        { id: "nuevo", label: "¿Nuevo?", type: "checkbox", required: false },
        { id: "foto", label: "Foto", type: "image", required: false },
        { id: "recibe", label: "Recibe", type: "signature", required: false },
      ],
    },
  ),
);

const row = (rowId: string, cells: Record<string, unknown>): TableRow => ({
  rowId,
  cells: Object.entries(cells).map(([columnId, value]) => ({
    columnId,
    value: value as TableRow["cells"][number]["value"],
  })),
});

async function seedDelivery(t: TestConvex, s: Seed) {
  await grant(t, s.roleId, "fillForms", "viewResponses");
  authState.userId = s.roleHolderId;
  return await seedForm(t, {
    projectId: s.projectId,
    createdBy: s.adminId,
    sections: DELIVERY,
    name: "Entrega de dotación y EPP",
    code: "SST-F-007",
  });
}

const submit = (t: TestConvex, formId: Id<"forms">, entregas: TableRow[]) =>
  t.mutation(api.formResponses.submit, {
    formId,
    values: stored(DELIVERY, {
      trabajador: "Luis Pardo",
      entregas,
    } satisfies FormValues),
  });

describe("tabla", () => {
  it("guarda tres elementos con su firma y su foto, y se lee igual", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDelivery(t, s);
    const [photo, first, second] = await Promise.all([
      storeFile(t, { contentType: "image/jpeg" }),
      storeFile(t, { contentType: "image/png" }),
      storeFile(t, { contentType: "image/png" }),
    ]);
    const signed = (storageId: Id<"_storage">) => ({
      storageId,
      name: "firma.png",
      signerName: "Luis Pardo",
      signerDocument: "1020304050",
    });
    const given = [
      row("r1", {
        elemento: "Casco",
        cantidad: 1,
        fecha: "2026-09-29",
        nuevo: true,
        foto: { storageId: photo, name: "casco.jpg" },
        recibe: signed(first),
      }),
      row("r2", { elemento: "Botas", cantidad: 1, talla: "l", nuevo: false }),
      row("r3", { elemento: "Guantes", cantidad: 6, recibe: signed(second) }),
    ];

    const id = await submit(t, formId, given);

    const response = await t.query(api.formResponses.getById, { id });
    expect(fromStoredValues(response?.values ?? []).entregas).toEqual(given);
    // Los archivos de las celdas salen con su dirección, como los sueltos.
    expect(response?.files.map((file) => file.storageId).sort()).toEqual(
      [photo, first, second].sort(),
    );

    const { page } = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: FIRST_PAGE,
    });
    expect(page[0].columns).toEqual([{ fieldId: "entregas", text: "3 filas" }]);
  });

  it("no guarda las celdas vacías ni las filas que nadie llenó", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDelivery(t, s);

    const id = await submit(t, formId, [
      row("r1", { elemento: "Casco", cantidad: 1, fecha: "", talla: "" }),
      row("r2", { elemento: "", cantidad: undefined }),
    ]);

    expect(
      fromStoredValues((await t.run((ctx) => ctx.db.get(id)))?.values ?? [])
        .entregas,
    ).toEqual([row("r1", { elemento: "Casco", cantidad: 1 })]);
  });

  it("respeta las filas mínimas y máximas", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDelivery(t, s);
    const many = Array.from({ length: 4 }, (_, index) =>
      row(`r${index}`, { elemento: "Guantes", cantidad: 1 }),
    );

    await expect(submit(t, formId, many)).rejects.toThrow(
      `«Elementos entregados»: ${valueProblems.tableTooManyRows}`,
    );
    // Obligatoria y sin filas: es un obligatorio que falta.
    await expect(submit(t, formId, [])).rejects.toThrow(
      `${formResponsesErrors.missingRequiredFields}: Elementos entregados`,
    );
  });

  it("las celdas obligatorias se exigen en cada fila", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDelivery(t, s);

    await expect(
      submit(t, formId, [
        row("r1", { elemento: "Casco", cantidad: 1 }),
        row("r2", { elemento: "Botas" }),
      ]),
    ).rejects.toThrow(
      `«Elementos entregados»: ${valueProblems.tableCellRequired}`,
    );
  });

  it("cada celda es del tipo de su columna, y de una columna que existe", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDelivery(t, s);
    const bad = (cells: Record<string, unknown>) =>
      submit(t, formId, [
        row("r1", { elemento: "Casco", cantidad: 1, ...cells }),
      ]);

    for (const cells of [{ fecha: "29/09/2026" }, { talla: "xxl" }]) {
      await expect(bad(cells), JSON.stringify(cells)).rejects.toThrow(
        `«Elementos entregados»: ${valueProblems.tableCellInvalid}`,
      );
    }

    // Lo que el formulario no dejaría salir, mandado a mano: una celda con
    // el `kind` de otra columna, y una de una columna que no existe.
    const photo = await storeFile(t, { contentType: "image/png" });
    const raw = (columnId: string, value: StoredCell) =>
      t.mutation(api.formResponses.submit, {
        formId,
        values: [
          { fieldId: "trabajador", value: { kind: "text", value: "Luis" } },
          {
            fieldId: "entregas",
            value: {
              kind: "table",
              rows: [
                {
                  rowId: "r1",
                  cells: [
                    {
                      columnId: "elemento",
                      value: { kind: "text", value: "Casco" },
                    },
                    {
                      columnId: "cantidad",
                      value: { kind: "number", value: 1 },
                    },
                    { columnId, value },
                  ],
                },
              ],
            },
          },
        ],
      });
    for (const [columnId, value] of [
      ["fecha", { kind: "number", value: 29 }],
      ["nuevo", { kind: "text", value: "sí" }],
      // Una imagen en la columna de firma: le falta quién firma.
      ["recibe", { kind: "file", storageId: photo, name: "firma.png" }],
    ] satisfies [string, StoredCell][]) {
      await expect(raw(columnId, value), columnId).rejects.toThrow(
        `«Elementos entregados»: ${valueProblems.tableCellInvalid}`,
      );
    }
    await expect(raw("color", { kind: "text", value: "rojo" })).rejects.toThrow(
      `«Elementos entregados»: ${valueProblems.tableUnknownColumn}`,
    );
  });

  it("los archivos de las celdas pasan por las mismas comprobaciones", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedDelivery(t, s);
    const pdf = await storeFile(t, { contentType: "application/pdf" });
    const jpg = await storeFile(t, { contentType: "image/jpeg" });
    const big = await storeFile(t, { contentType: "image/png", sizeMb: 11 });
    const cell = (cells: Record<string, unknown>) =>
      submit(t, formId, [
        row("r1", { elemento: "Casco", cantidad: 1, ...cells }),
      ]);

    await expect(
      cell({ foto: { storageId: pdf, name: "casco.pdf" } }),
    ).rejects.toThrow(formResponsesErrors.fileWrongType);
    await expect(
      cell({ foto: { storageId: big, name: "casco.png" } }),
    ).rejects.toThrow(formResponsesErrors.fileTooLarge);
    // La firma de una fila es un PNG, como la suelta.
    await expect(
      cell({
        recibe: { storageId: jpg, name: "firma.jpg", signerName: "Luis" },
      }),
    ).rejects.toThrow(formResponsesErrors.signatureInvalid);
    await expect(
      cell({
        recibe: { storageId: pdf, name: "firma.png", signerName: "" },
      }),
    ).rejects.toThrow(
      `«Elementos entregados»: ${valueProblems.signerNameRequired}`,
    );
  });
});

describe("definición de una tabla, al guardar el borrador", () => {
  it("el servidor aplica las reglas del tipo", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: DELIVERY,
    });
    const save = (config: Parameters<typeof tableField>[2]) =>
      t.mutation(api.formVersions.saveDraft, {
        id: formId,
        sections: oneSection(tableField("tabla", {}, config)),
      });

    await expect(save({ columns: [] })).rejects.toThrow(
      formProblems.tableColumnsCount,
    );
    await expect(save({ minRows: 4, maxRows: 2 })).rejects.toThrow(
      formProblems.tableRowsRange,
    );
    await expect(save({ maxRows: 101 })).rejects.toThrow(
      formProblems.tableRowsRange,
    );
    await expect(
      save({
        columns: [
          { id: "talla", label: "Talla", type: "select", required: false },
        ],
      }),
    ).rejects.toThrow(formProblems.tableColumnOptions);
    await save({ minRows: 1, maxRows: 100 });
  });
});
