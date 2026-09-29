import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  field,
  oneSection,
  rule,
  signatureField,
  when,
} from "../lib/__tests__/form.fixtures";
import {
  formProblems,
  formResponsesErrors,
  valueProblems,
} from "../lib/error_messages";
import type { FormSection, FormValues } from "../lib/form_types";
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

afterEach(() => {
  vi.useRealTimers();
});

/** Firma quien opera, que es quien diligencia; y quien recibe, que puede no
 *  tener cuenta y firma en el teléfono de quien entrega. */
const SIGNED: FormSection[] = oneSection(
  field("equipo", { label: "Equipo", required: true }),
  signatureField("operador", "author", {
    label: "Firma del operador",
    required: true,
    showInTable: true,
  }),
  signatureField("recibe", "other", { label: "Firma de quien recibe" }),
);

async function seedSigned(t: TestConvex, s: Seed, sections = SIGNED) {
  await grant(t, s.roleId, "fillForms", "viewResponses");
  authState.userId = s.roleHolderId;
  return await seedForm(t, {
    projectId: s.projectId,
    createdBy: s.adminId,
    sections,
    name: "Entrega de equipo",
  });
}

const png = (t: TestConvex) => storeFile(t, { contentType: "image/png" });

const submit = (t: TestConvex, formId: Id<"forms">, values: FormValues) =>
  t.mutation(api.formResponses.submit, {
    formId,
    values: stored(SIGNED, { equipo: "Pulidora", ...values }),
  });

const saved = async (t: TestConvex, id: Id<"formResponses">) =>
  fromStoredValues((await t.run((ctx) => ctx.db.get(id)))?.values ?? []);

describe("firma", () => {
  it("quien diligencia firma con su nombre, que sale de la sesión", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedSigned(t, s);
    const storageId = await png(t);

    const id = await submit(t, formId, {
      operador: {
        storageId,
        name: "firma.png",
        // Lo que escriba el navegador no cuenta: ni el nombre ni el documento.
        signerName: "Gerente General",
        signerDocument: "1",
      },
    });

    expect((await saved(t, id)).operador).toEqual({
      storageId,
      name: "firma.png",
      signerName: "Inspectora",
    });
  });

  it("también cuando el navegador no manda ningún nombre", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedSigned(t, s);

    const id = await submit(t, formId, {
      operador: { storageId: await png(t), name: "firma.png", signerName: "" },
    });
    expect((await saved(t, id)).operador).toMatchObject({
      signerName: "Inspectora",
    });
  });

  it("quien firma sin ser quien diligencia escribe su nombre y su documento", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedSigned(t, s);
    const operador = {
      storageId: await png(t),
      name: "firma.png",
      signerName: "",
    };
    const recibe = {
      storageId: await png(t),
      name: "firma.png",
      signerName: "  Luis Pardo ",
      signerDocument: " 1020304050 ",
    };

    const id = await submit(t, formId, { operador, recibe });
    expect((await saved(t, id)).recibe).toEqual({
      ...recibe,
      signerName: "Luis Pardo",
      signerDocument: "1020304050",
    });

    await expect(
      submit(t, formId, {
        operador,
        recibe: { ...recibe, signerName: "   " },
      }),
    ).rejects.toThrow(
      `«Firma de quien recibe»: ${valueProblems.signerNameRequired}`,
    );
  });

  it("es una imagen PNG recién subida", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedSigned(t, s);
    const sign = (storageId: Id<"_storage">) =>
      submit(t, formId, {
        operador: { storageId, name: "firma.png", signerName: "" },
      });

    await expect(
      sign(await storeFile(t, { contentType: "image/jpeg" })),
    ).rejects.toThrow(formResponsesErrors.signatureInvalid);
    await expect(
      sign(await storeFile(t, { contentType: "application/pdf" })),
    ).rejects.toThrow(formResponsesErrors.signatureInvalid);

    const gone = await png(t);
    await t.run((ctx) => ctx.storage.delete(gone));
    await expect(sign(gone)).rejects.toThrow(
      formResponsesErrors.signatureInvalid,
    );

    // `convex-test` fecha los archivos con el reloj real, no con el falso:
    // las horas se cuentan desde ahora, no desde una fecha escrita, o la
    // prueba pasa por la mañana y falla por la tarde.
    const realNow = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(realNow);
    const old = await png(t);
    vi.setSystemTime(realNow + 90 * 60 * 1000);
    await expect(sign(old)).rejects.toThrow(
      formResponsesErrors.signatureInvalid,
    );
  });

  it("una imagen sin quien firma no es una firma", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedSigned(t, s);
    const storageId = await png(t);

    await expect(
      t.mutation(api.formResponses.submit, {
        formId,
        values: [
          { fieldId: "equipo", value: { kind: "text", value: "Pulidora" } },
          {
            fieldId: "operador",
            value: { kind: "file", storageId, name: "firma.png" },
          },
        ],
      }),
    ).rejects.toThrow(`«Firma del operador»: ${valueProblems.wrongKind}`);
  });

  it("obligatoria y sin firmar, es un obligatorio que falta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedSigned(t, s);

    await expect(submit(t, formId, {})).rejects.toThrow(
      `${formResponsesErrors.missingRequiredFields}: Firma del operador`,
    );
  });

  it("se lee con su dirección y, en el listado, con quién firmó", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedSigned(t, s);
    const storageId = await png(t);
    const id = await submit(t, formId, {
      operador: { storageId, name: "firma.png", signerName: "" },
    });

    const response = await t.query(api.formResponses.getById, { id });
    expect(response?.files).toEqual([
      { storageId, url: expect.stringMatching(/^https:\/\//) },
    ]);

    const { page } = await t.query(api.formResponses.list, {
      formId,
      paginationOpts: FIRST_PAGE,
    });
    expect(page[0].columns).toEqual([
      { fieldId: "operador", text: "Firmado por Inspectora" },
    ]);
  });

  it("un campo puede depender de que esté firmado", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const sections = oneSection(
      signatureField("recibe", "other", { label: "Firma de quien recibe" }),
      field("motivo", {
        label: "¿Por qué no firmó?",
        required: true,
        config: { visibility: when(rule("recibe", "isEmpty")) },
      }),
    );
    const { formId } = await seedSigned(t, s, sections);
    const send = (values: FormValues) =>
      t.mutation(api.formResponses.submit, {
        formId,
        values: stored(sections, values),
      });

    await expect(send({})).rejects.toThrow(
      `${formResponsesErrors.missingRequiredFields}: ¿Por qué no firmó?`,
    );
    const id = await send({
      recibe: {
        storageId: await png(t),
        name: "firma.png",
        signerName: "Luis Pardo",
      },
      motivo: "No estaba",
    });
    expect(await saved(t, id)).not.toHaveProperty("motivo");
  });

  it("una respuesta firmada no se edita: no hay con qué", async () => {
    // Las únicas escrituras sobre una respuesta de un formato son enviarla y
    // anularla. `updateEntry` es de los listados, que no admiten firma.
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedSigned(t, s);
    const id = await submit(t, formId, {
      operador: { storageId: await png(t), name: "firma.png", signerName: "" },
    });

    await grant(t, s.roleId, "editCatalogs");
    await expect(
      t.mutation(api.formEntries.updateEntry, {
        id,
        values: stored(SIGNED, { equipo: "Otro" }),
      }),
    ).rejects.toThrow(formResponsesErrors.notCatalog);
    await expect(
      t.mutation(api.formEntries.setEntryActive, { id, active: false }),
    ).rejects.toThrow(formResponsesErrors.notCatalog);
  });
});

describe("firma en un listado", () => {
  it("no se puede guardar un borrador de listado con una firma", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    authState.userId = s.adminId;
    const formId = await t.mutation(api.forms.create, {
      projectId: s.projectId,
      kind: "catalog",
      name: "Equipos",
    });

    await expect(
      t.mutation(api.formVersions.saveDraft, {
        id: formId,
        sections: oneSection(
          field("nombre", { required: true }),
          signatureField("firma"),
        ),
      }),
    ).rejects.toThrow(formProblems.typeNotAllowed);
  });
});
