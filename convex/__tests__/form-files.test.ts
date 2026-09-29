import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { field, oneSection } from "../lib/__tests__/form.fixtures";
import { formResponsesErrors } from "../lib/error_messages";
import type { FormSection, FormValues } from "../lib/form_types";
import {
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

/** El registro fotográfico del informe de gestión, con su soporte. */
const REPORT: FormSection[] = oneSection(
  field("foto", { type: "image", label: "Fotografía" }),
  field("soporte", {
    type: "file",
    label: "Soporte",
    config: { acceptedFormats: ["application/pdf", ".xlsx"], maxFileSize: 2 },
  }),
  field("anexo", { type: "file", label: "Anexo" }),
);

async function seedReport(t: TestConvex, s: Seed) {
  await grant(t, s.roleId, "fillForms");
  authState.userId = s.roleHolderId;
  return await seedForm(t, {
    projectId: s.projectId,
    createdBy: s.adminId,
    sections: REPORT,
    name: "Registro fotográfico",
  });
}

const exists = (t: TestConvex, id: Id<"_storage">) =>
  t.run(async (ctx) => (await ctx.db.system.get(id)) !== null);

const MINUTE = 60 * 1000;

describe("formFiles.generateUploadUrl", () => {
  it("la pide quien puede diligenciar el formato", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedReport(t, s);

    expect(
      await t.mutation(api.formFiles.generateUploadUrl, { formId }),
    ).toEqual(expect.any(String));

    // Sin la llave, o con el formato archivado, no hay dónde subir.
    authState.userId = s.plainId;
    await expect(
      t.mutation(api.formFiles.generateUploadUrl, { formId }),
    ).rejects.toThrow(formResponsesErrors.insufficientPermissions);

    await t.run((ctx) => ctx.db.patch(formId, { status: "archived" }));
    authState.userId = s.adminId;
    await expect(
      t.mutation(api.formFiles.generateUploadUrl, { formId }),
    ).rejects.toThrow(formResponsesErrors.insufficientPermissions);
  });

  it("en un listado, quien mantiene sus elementos", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: oneSection(field("placa", { required: true })),
      kind: "catalog",
      titleFieldId: "placa",
    });
    await grant(t, s.roleId, "fillForms", "viewResponses");

    authState.userId = s.roleHolderId;
    await expect(
      t.mutation(api.formFiles.generateUploadUrl, { formId }),
    ).rejects.toThrow(formResponsesErrors.insufficientPermissions);

    await grant(t, s.roleId, "editCatalogs");
    expect(
      await t.mutation(api.formFiles.generateUploadUrl, { formId }),
    ).toEqual(expect.any(String));
  });
});

describe("archivos de una respuesta", () => {
  const submit = (t: TestConvex, formId: Id<"forms">, values: FormValues) =>
    t.mutation(api.formResponses.submit, {
      formId,
      values: stored(REPORT, values),
    });

  it("guarda el archivo recién subido y lo devuelve con su dirección", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedReport(t, s);
    const photo = await storeFile(t, { contentType: "image/jpeg" });
    const pdf = await storeFile(t, { contentType: "application/pdf" });

    const id = await submit(t, formId, {
      foto: { storageId: photo, name: "frente-norte.jpg" },
      soporte: { storageId: pdf, name: "acta.pdf" },
    });

    const response = await t.query(api.formResponses.getById, { id });
    expect(response?.values).toEqual([
      {
        fieldId: "foto",
        value: { kind: "file", storageId: photo, name: "frente-norte.jpg" },
      },
      {
        fieldId: "soporte",
        value: { kind: "file", storageId: pdf, name: "acta.pdf" },
      },
    ]);
    expect(response?.files.map((file) => file.storageId).sort()).toEqual(
      [photo, pdf].sort(),
    );
    for (const file of response?.files ?? []) {
      expect(file.url).toMatch(/^https:\/\//);
    }
  });

  it("rechaza un archivo que no existe", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedReport(t, s);
    const gone = await storeFile(t, { contentType: "image/png" });
    await t.run((ctx) => ctx.storage.delete(gone));

    await expect(
      submit(t, formId, { foto: { storageId: gone, name: "foto.png" } }),
    ).rejects.toThrow(formResponsesErrors.fileInvalid);
  });

  it("rechaza un archivo subido hace más de una hora", async () => {
    // Un `storageId` viejo no es de esta subida: podría ser el de otra
    // respuesta, o el logo del proyecto.
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedReport(t, s);

    // `convex-test` fecha los archivos con el reloj real, no con el falso:
    // las horas se cuentan desde ahora, no desde una fecha escrita, o la
    // prueba pasa por la mañana y falla por la tarde.
    const realNow = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(realNow);
    const photo = await storeFile(t, { contentType: "image/png" });

    vi.setSystemTime(realNow + 61 * MINUTE);
    await expect(
      submit(t, formId, { foto: { storageId: photo, name: "foto.png" } }),
    ).rejects.toThrow(formResponsesErrors.fileInvalid);

    vi.setSystemTime(realNow + 59 * MINUTE);
    await submit(t, formId, { foto: { storageId: photo, name: "foto.png" } });
  });

  it("el logo del proyecto no sirve como archivo de una respuesta", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedReport(t, s);

    // `convex-test` fecha los archivos con el reloj real, no con el falso:
    // las horas se cuentan desde ahora, no desde una fecha escrita, o la
    // prueba pasa por la mañana y falla por la tarde.
    const realNow = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(realNow);
    const logo = await storeFile(t, { contentType: "image/png" });
    await t.run((ctx) => ctx.db.patch(s.projectId, { logo }));

    vi.setSystemTime(realNow + 28 * 24 * 60 * MINUTE);
    await expect(
      submit(t, formId, { foto: { storageId: logo, name: "logo.png" } }),
    ).rejects.toThrow(formResponsesErrors.fileInvalid);
    expect(await exists(t, logo)).toBe(true);
  });

  it("una imagen tiene que ser una imagen", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedReport(t, s);
    const pdf = await storeFile(t, { contentType: "application/pdf" });

    await expect(
      submit(t, formId, { foto: { storageId: pdf, name: "foto.png" } }),
    ).rejects.toThrow(formResponsesErrors.fileWrongType);
  });

  it("un archivo respeta los formatos del campo, por tipo o por extensión", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedReport(t, s);
    const sheet = await storeFile(t, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const word = await storeFile(t, { contentType: "application/msword" });

    await submit(t, formId, {
      soporte: { storageId: sheet, name: "Ausentismo.XLSX" },
    });
    await expect(
      submit(t, formId, { soporte: { storageId: word, name: "acta.doc" } }),
    ).rejects.toThrow(formResponsesErrors.fileWrongType);
    // Sin lista de formatos, cualquiera.
    await submit(t, formId, { anexo: { storageId: word, name: "acta.doc" } });
  });

  it("respeta el tamaño máximo del campo, y 10 MB si no dice otra cosa", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedReport(t, s);
    const file = (sizeMb: number) =>
      storeFile(t, { contentType: "application/pdf", sizeMb });

    await expect(
      submit(t, formId, {
        soporte: { storageId: await file(3), name: "acta.pdf" },
      }),
    ).rejects.toThrow(formResponsesErrors.fileTooLarge);
    await submit(t, formId, {
      soporte: { storageId: await file(2), name: "acta.pdf" },
    });

    await expect(
      submit(t, formId, {
        anexo: { storageId: await file(11), name: "plano.pdf" },
      }),
    ).rejects.toThrow(formResponsesErrors.fileTooLarge);
    await submit(t, formId, {
      anexo: { storageId: await file(10), name: "plano.pdf" },
    });
  });

  it("el archivo de un campo oculto ni se valida ni se guarda", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await grant(t, s.roleId, "fillForms");
    const sections = oneSection(
      field("hay", { type: "checkbox", label: "¿Hay evidencia?" }),
      field("foto", {
        type: "image",
        label: "Fotografía",
        config: {
          visibility: {
            match: "all",
            rules: [{ fieldId: "hay", operator: "isChecked", values: [] }],
          },
        },
      }),
    );
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections,
    });
    const pdf = await storeFile(t, { contentType: "application/pdf" });

    authState.userId = s.roleHolderId;
    const id = await t.mutation(api.formResponses.submit, {
      formId,
      values: stored(sections, {
        hay: false,
        foto: { storageId: pdf, name: "no-es-foto.pdf" },
      }),
    });
    expect((await t.run((ctx) => ctx.db.get(id)))?.values).toEqual([
      { fieldId: "hay", value: { kind: "boolean", value: false } },
    ]);
  });
});

describe("archivos de un elemento de un listado", () => {
  const EQUIPMENT: FormSection[] = oneSection(
    field("nombre", { label: "Equipo", required: true }),
    field("foto", { type: "image", label: "Foto" }),
    field("ficha", { type: "file", label: "Ficha técnica" }),
  );

  it("al editar, lo que ya tenía no vuelve a pasar por la ventana de subida", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: EQUIPMENT,
      kind: "catalog",
      name: "Equipos",
      titleFieldId: "nombre",
    });

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T14:00:00Z"));
    const photo = await storeFile(t, { contentType: "image/png" });
    authState.userId = s.adminId;
    const id = await t.mutation(api.formEntries.createEntry, {
      formId,
      values: stored(EQUIPMENT, {
        nombre: "Pulidora",
        foto: { storageId: photo, name: "pulidora.png" },
      }),
    });

    // Un mes después se corrige el nombre: la foto sigue siendo la misma.
    vi.setSystemTime(new Date("2026-10-01T14:00:00Z"));
    await t.mutation(api.formEntries.updateEntry, {
      id,
      values: stored(EQUIPMENT, {
        nombre: "Pulidora de 7 pulgadas",
        foto: { storageId: photo, name: "pulidora.png" },
      }),
    });
    expect(await exists(t, photo)).toBe(true);
  });

  it("el archivo que el elemento reemplaza o suelta se borra del almacenamiento", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    const { formId } = await seedForm(t, {
      projectId: s.projectId,
      createdBy: s.adminId,
      sections: EQUIPMENT,
      kind: "catalog",
      name: "Equipos",
      titleFieldId: "nombre",
    });
    const [first, second, sheet] = await Promise.all([
      storeFile(t, { contentType: "image/png" }),
      storeFile(t, { contentType: "image/png" }),
      storeFile(t, { contentType: "application/pdf" }),
    ]);

    authState.userId = s.adminId;
    const id = await t.mutation(api.formEntries.createEntry, {
      formId,
      values: stored(EQUIPMENT, {
        nombre: "Pulidora",
        foto: { storageId: first, name: "vieja.png" },
        ficha: { storageId: sheet, name: "ficha.pdf" },
      }),
    });
    await t.mutation(api.formEntries.updateEntry, {
      id,
      values: stored(EQUIPMENT, {
        nombre: "Pulidora",
        foto: { storageId: second, name: "nueva.png" },
      }),
    });

    expect(await exists(t, first)).toBe(false);
    expect(await exists(t, sheet)).toBe(false);
    expect(await exists(t, second)).toBe(true);
  });
});
