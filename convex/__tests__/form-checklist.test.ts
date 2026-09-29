import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  checklistConfig,
  checklistField,
  field,
  oneSection,
  rule,
  SCALE_BMNA,
  when,
} from "../lib/__tests__/form.fixtures";
import {
  formProblems,
  formResponsesErrors,
  valueProblems,
} from "../lib/error_messages";
import type {
  ChecklistAnswer,
  ChecklistBlock,
  FormSection,
} from "../lib/form_types";
import { fromStoredValues } from "../lib/stored_values";
import {
  FIRST_PAGE,
  grant,
  type Seed,
  seedForm,
  seedProject,
  setupTest,
  stored,
  type TestConvex,
} from "./helpers";

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

/** La inspección preoperacional de vehículos (`SST-F-010`), a escala: nueve
 *  bloques de siete ítems, los sesenta y tres del papel. */
const BLOCKS: ChecklistBlock[] = Array.from({ length: 9 }, (_, block) => ({
  id: `bloque-${block + 1}`,
  label: `${block + 1}. Bloque`,
  items: Array.from({ length: 7 }, (_, item) => ({
    id: `item-${block + 1}-${item + 1}`,
    label: `Ítem ${block + 1}.${item + 1}`,
  })),
}));

const PREOPERATIONAL: FormSection[] = oneSection(
  field("placa", { label: "Placa", required: true }),
  checklistField(
    "inspeccion",
    { label: "Inspección", required: true, showInTable: true },
    { blocks: BLOCKS },
  ),
);

const ITEM_IDS = BLOCKS.flatMap((block) => block.items.map((item) => item.id));

/** Todo conforme, salvo lo que se diga. */
const answers = (
  overrides: Record<string, Partial<ChecklistAnswer> | null> = {},
): ChecklistAnswer[] =>
  ITEM_IDS.flatMap((itemId) => {
    const override = overrides[itemId];
    if (override === null) return [];
    return [{ itemId, value: "b", ...override }];
  });

async function seedInspection(
  t: TestConvex,
  s: Seed,
  sections: FormSection[] = PREOPERATIONAL,
) {
  await grant(t, s.roleId, "fillForms", "viewResponses");
  authState.userId = s.roleHolderId;
  return await seedForm(t, {
    projectId: s.projectId,
    createdBy: s.adminId,
    sections,
    name: "Inspección preoperacional de vehículos",
    code: "SST-F-010",
  });
}

const submit = (
  t: TestConvex,
  formId: Id<"forms">,
  inspeccion: ChecklistAnswer[],
  sections: FormSection[] = PREOPERATIONAL,
) =>
  t.mutation(api.formResponses.submit, {
    formId,
    values: stored(sections, { placa: "SLP-835", inspeccion }),
  });

describe("lista de chequeo", () => {
  it("guarda los sesenta y tres ítems y se lee igual que se escribió", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedInspection(t, s);
    const given = answers({
      "item-2-3": { value: "m", note: "Fuga en la manguera" },
      "item-9-7": { value: "na" },
    });

    const id = await submit(t, formId, given);

    const response = await t.query(api.formResponses.getById, { id });
    expect(fromStoredValues(response?.values ?? []).inspeccion).toEqual(given);
    expect(response?.sections).toEqual(PREOPERATIONAL);
  });

  it("en el listado sale resumida por el sentido de cada respuesta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedInspection(t, s);
    await submit(
      t,
      formId,
      answers({
        "item-2-3": { value: "m", note: "Fuga en la manguera" },
        "item-4-1": { value: "m", note: "Pastillas gastadas" },
      }),
    );

    const { page } = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: FIRST_PAGE,
    });
    expect(page[0].columns).toEqual([
      {
        fieldId: "inspeccion",
        text: "61 conformes · 2 no conformes · 0 no aplica",
      },
    ]);
  });

  it("obligatoria significa todos los ítems respondidos", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedInspection(t, s);

    await expect(
      submit(t, formId, answers({ "item-5-4": null })),
    ).rejects.toThrow(`«Inspección»: ${valueProblems.checklistIncomplete}`);
    // Y sin ninguno, es un obligatorio que falta.
    await expect(submit(t, formId, [])).rejects.toThrow(
      `${formResponsesErrors.missingRequiredFields}: Inspección`,
    );
  });

  it("marcar «Malo» exige la observación", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedInspection(t, s);

    await expect(
      submit(t, formId, answers({ "item-2-3": { value: "m" } })),
    ).rejects.toThrow(`«Inspección»: ${valueProblems.checklistNoteRequired}`);
    await expect(
      submit(t, formId, answers({ "item-2-3": { value: "m", note: "   " } })),
    ).rejects.toThrow(`«Inspección»: ${valueProblems.checklistNoteRequired}`);
    await submit(
      t,
      formId,
      answers({ "item-2-3": { value: "m", note: "Fuga" } }),
    );
  });

  it("cada ítem y cada opción tienen que existir", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedInspection(t, s);

    await expect(
      submit(t, formId, [...answers(), { itemId: "item-10-1", value: "b" }]),
    ).rejects.toThrow(`«Inspección»: ${valueProblems.checklistUnknownItem}`);
    await expect(
      submit(t, formId, answers({ "item-1-1": { value: "regular" } })),
    ).rejects.toThrow(`«Inspección»: ${valueProblems.checklistOptionMissing}`);
    await expect(
      submit(t, formId, [...answers(), { itemId: "item-1-1", value: "b" }]),
    ).rejects.toThrow(`«Inspección»: ${valueProblems.checklistDuplicateItem}`);
  });

  it("un encabezado no se responde, y sus subítems sí", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(
      checklistField("luces", { label: "Luces", required: true }),
    );
    const { formId } = await seedInspection(t, s, sections);
    const send = (inspeccion: ChecklistAnswer[]) =>
      t.mutation(api.formResponses.submit, {
        formId,
        values: stored(sections, { luces: inspeccion }),
      });
    const every = ["aceite", "refrigerante", "altas", "medias"].map(
      (itemId) => ({ itemId, value: "b" }),
    );

    // Con los cuatro que se responden está completa: «Luces frontales» no
    // cuenta.
    await send(every);
    await expect(
      send([...every, { itemId: "frontales", value: "b" }]),
    ).rejects.toThrow(`«Luces»: ${valueProblems.checklistUnknownItem}`);
  });

  it("cantidad y fecha por ítem: la inspección de botiquín", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(
      checklistField(
        "botiquin",
        { label: "Botiquín" },
        {
          note: "optional",
          quantity: { label: "Cant. actual" },
          date: { label: "Fecha de vencimiento" },
        },
      ),
    );
    const { formId } = await seedInspection(t, s, sections);
    const send = (botiquin: ChecklistAnswer[]) =>
      t.mutation(api.formResponses.submit, {
        formId,
        values: stored(sections, { botiquin }),
      });

    const given = [
      { itemId: "aceite", value: "b", quantity: 4, date: "2027-06-30" },
      { itemId: "altas", value: "m", quantity: 0 },
    ];
    const id = await send(given);
    expect(
      fromStoredValues((await t.run((ctx) => ctx.db.get(id)))?.values ?? [])
        .botiquin,
    ).toEqual(given);

    await expect(
      send([{ itemId: "aceite", value: "b", date: "30/06/2027" }]),
    ).rejects.toThrow(`«Botiquín»: ${valueProblems.checklistInvalidDate}`);
    await expect(
      send([{ itemId: "aceite", value: "b", quantity: -2 }]),
    ).rejects.toThrow(`«Botiquín»: ${valueProblems.checklistInvalidQuantity}`);
  });

  it("no guarda cantidad, fecha ni observación que la lista no pide", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(
      checklistField("lista", { label: "Lista" }, { note: "never" }),
    );
    const { formId } = await seedInspection(t, s, sections);

    for (const extra of [
      { note: "Todo bien" },
      { quantity: 3 },
      { date: "2026-09-29" },
    ]) {
      await expect(
        t.mutation(api.formResponses.submit, {
          formId,
          values: stored(sections, {
            lista: [{ itemId: "aceite", value: "b", ...extra }],
          }),
        }),
      ).rejects.toThrow(`«Lista»: ${valueProblems.checklistExtraNotAllowed}`);
    }
  });

  it("una lista oculta ni se valida ni se guarda", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(
      field("aplica", { type: "checkbox", label: "¿Aplica?" }),
      checklistField("lista", {
        label: "Lista",
        required: true,
        config: {
          checklist: checklistConfig(),
          visibility: when(rule("aplica", "isChecked")),
        },
      }),
    );
    const { formId } = await seedInspection(t, s, sections);

    const id = await t.mutation(api.formResponses.submit, {
      formId,
      values: stored(sections, {
        aplica: false,
        lista: [{ itemId: "aceite", value: "m" }],
      }),
    });
    expect((await t.run((ctx) => ctx.db.get(id)))?.values).toEqual([
      { fieldId: "aplica", value: { kind: "boolean", value: false } },
    ]);
  });

  it("una respuesta antigua se resume con la escala de su versión", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(
      checklistField("lista", { label: "Lista", showInTable: true }),
    );
    const { formId } = await seedInspection(t, s, sections);
    await t.mutation(api.formResponses.submit, {
      formId,
      values: stored(sections, {
        lista: [
          { itemId: "aceite", value: "b" },
          { itemId: "altas", value: "m", note: "Fundida" },
        ],
      }),
    });

    // La versión 2 cambia la escala a C/NC: «b» y «m» ya no existen en ella.
    authState.userId = s.adminId;
    await t.mutation(api.formVersions.saveDraft, {
      id: formId,
      sections: oneSection(
        checklistField(
          "lista",
          { label: "Lista", showInTable: true },
          {
            options: [
              { value: "c", label: "Cumple", short: "C", meaning: "ok" },
              { value: "nc", label: "No cumple", short: "NC", meaning: "fail" },
            ],
          },
        ),
      ),
    });
    await t.mutation(api.formVersions.publish, { id: formId });

    const { page } = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: FIRST_PAGE,
    });
    expect(page[0].columns[0].text).toBe(
      "1 conforme · 1 no conforme · 0 no aplica · 2 sin responder",
    );
  });
});

describe("definición de una lista de chequeo, al guardar el borrador", () => {
  it("el servidor aplica las reglas del tipo", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: PREOPERATIONAL,
    });
    const save = (config: Parameters<typeof checklistConfig>[0]) =>
      t.mutation(api.formVersions.saveDraft, {
        id: formId,
        sections: oneSection(checklistField("lista", {}, config)),
      });

    await expect(save({ options: SCALE_BMNA.slice(0, 1) })).rejects.toThrow(
      formProblems.checklistOptionsCount,
    );
    await expect(save({ blocks: [] })).rejects.toThrow(
      formProblems.checklistNoItems,
    );
    await expect(
      save({
        options: [SCALE_BMNA[0], SCALE_BMNA[2]],
        note: "onFail",
      }),
    ).rejects.toThrow(formProblems.checklistNoteNeedsFail);
    await save({ blocks: BLOCKS });
  });
});
