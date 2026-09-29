import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { flattenFields } from "../lib/form_evaluation";
import { validateForm } from "../lib/form_validation";
import { SST_LIBRARY } from "../sst_library";
import { seedProject, setupTest } from "./helpers";

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

describe("la biblioteca, como datos", () => {
  it.each(SST_LIBRARY.map((form) => [form.key, form] as const))(
    "%s pasa la misma validación que un formato hecho a mano",
    (_key, form) => {
      // Una relación `@clave` todavía no es un id: la forma es lo que se
      // valida aquí; que el listado exista lo comprueba la instalación.
      expect(
        validateForm(form.sections, {
          kind: form.kind,
          titleFieldId: form.titleFieldId,
        }),
      ).toEqual([]);
    },
  );
});

describe("formLibrary.installSst", () => {
  it("instala todo publicado, con sus relaciones apuntando a este proyecto", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    const result = await t.mutation(internal.formLibrary.installSst, {
      projectId: s.projectId,
    });
    expect(result.created).toHaveLength(SST_LIBRARY.length);
    expect(result.skipped).toEqual([]);
    expect(result.entries).toBe(0);

    const { forms, versions, neighbours } = await t.run(async (ctx) => ({
      forms: await ctx.db
        .query("forms")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
      versions: await ctx.db
        .query("formVersions")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
      neighbours: await ctx.db
        .query("forms")
        .withIndex("projectId", (q) => q.eq("projectId", s.otherProjectId))
        .collect(),
    }));

    expect(forms).toHaveLength(SST_LIBRARY.length);
    expect(forms.every((form) => form.status === "published")).toBe(true);
    expect(forms.every((form) => !form.hasDraftChanges)).toBe(true);
    // Un borrador y una versión publicada por formato.
    expect(versions).toHaveLength(SST_LIBRARY.length * 2);
    expect(neighbours).toHaveLength(0);

    const ids = new Set<string>(forms.map((form) => form._id));
    const published = versions.filter(
      (version) => version.status === "published",
    );
    for (const version of published) {
      for (const field of flattenFields(version.sections)) {
        const columns = field.config.table?.columns ?? [];
        const references = [
          field.config.reference,
          ...columns.map((column) => column.reference),
        ];
        for (const reference of references) {
          if (reference) expect(ids.has(reference.formId)).toBe(true);
        }
      }
    }
  });

  it("es idempotente", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    await t.mutation(internal.formLibrary.installSst, {
      projectId: s.projectId,
    });
    const again = await t.mutation(internal.formLibrary.installSst, {
      projectId: s.projectId,
    });

    expect(again.created).toEqual([]);
    expect(again.skipped).toHaveLength(SST_LIBRARY.length);
  });

  it("al actualizar, publica una versión nueva sólo de lo que cambió", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await t.mutation(internal.formLibrary.installSst, {
      projectId: s.projectId,
    });

    // Una etiqueta distinta en lo publicado: la biblioteca ya no coincide.
    const formId = await t.run(async (ctx) => {
      const form = (
        await ctx.db
          .query("forms")
          .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
          .collect()
      ).find((candidate) => candidate.code === "SST-F-031");
      if (!form?.publishedVersionId) throw new Error("sin versión");
      const version = await ctx.db.get(form.publishedVersionId);
      if (!version) throw new Error("sin versión");
      const sections = structuredClone(version.sections);
      sections[0].label = "Otra etiqueta";
      await ctx.db.patch(version._id, { sections });
      return form._id;
    });

    const result = await t.mutation(internal.formLibrary.installSst, {
      projectId: s.projectId,
      update: true,
    });
    expect(result.updated).toEqual([
      "Inspección preoperacional para soldadura eléctrica",
    ]);

    const form = await t.run((ctx) => ctx.db.get(formId));
    expect(form?.publishedVersionNumber).toBe(2);
    expect(form?.hasDraftChanges).toBe(false);
  });

  it("con ejemplos, los elementos quedan activos, titulados y relacionados", async () => {
    const t = setupTest();
    const s = await seedProject(t);

    const result = await t.mutation(internal.formLibrary.installSst, {
      projectId: s.projectId,
      withSamples: true,
    });
    const expected = SST_LIBRARY.reduce(
      (total, form) => total + (form.sampleEntries?.length ?? 0),
      0,
    );
    expect(result.entries).toBe(expected);

    const { entries, links, forms } = await t.run(async (ctx) => ({
      entries: await ctx.db
        .query("formResponses")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
      links: await ctx.db
        .query("formResponseLinks")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
      forms: await ctx.db
        .query("forms")
        .withIndex("projectId", (q) => q.eq("projectId", s.projectId))
        .collect(),
    }));

    expect(entries).toHaveLength(expected);
    expect(entries.every((entry) => entry.active && entry.title)).toBe(true);
    // Cada extintor de ejemplo está en un centro de trabajo de ejemplo.
    const extinguishers = SST_LIBRARY.find((form) => form.key === "extintores");
    expect(links).toHaveLength(extinguishers?.sampleEntries?.length ?? 0);
    expect(
      forms.reduce((total, form) => total + form.responseCount, 0),
    ).toBe(expected);
  });

  it("quien es propietario ve lo instalado como cualquier otro formato", async () => {
    const t = setupTest();
    const s = await seedProject(t);
    await t.mutation(internal.formLibrary.installSst, {
      projectId: s.projectId,
    });

    authState.userId = s.ownerId;
    const records = await t.query(api.forms.get, {
      projectId: s.projectId,
      kind: "record",
    });
    const catalogs = await t.query(api.forms.get, {
      projectId: s.projectId,
      kind: "catalog",
    });

    expect(records).toHaveLength(
      SST_LIBRARY.filter((form) => form.kind === "record").length,
    );
    expect(catalogs).toHaveLength(
      SST_LIBRARY.filter((form) => form.kind === "catalog").length,
    );
  });
});
