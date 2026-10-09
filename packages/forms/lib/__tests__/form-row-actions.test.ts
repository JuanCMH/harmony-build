import { describe, expect, it } from "vitest";

import {
  type FormRowState,
  type FormViewerKeys,
  REMOVE_BLOCKED_REASON,
  REMOVE_BLOCKED_REASON_CATALOG,
  canOpenResponses,
  countForms,
  formRowActionLabel,
  formRowActions,
  primaryRowAction,
} from "../form-row-actions";

const row = (overrides: Partial<FormRowState> = {}): FormRowState => ({
  kind: "record",
  status: "published",
  publishedVersionNumber: 1,
  responseCount: 0,
  canFill: false,
  canEdit: false,
  ...overrides,
});

const keys = (overrides: Partial<FormViewerKeys> = {}): FormViewerKeys => ({
  createForms: false,
  deleteForms: false,
  fillForms: false,
  viewResponses: false,
  editCatalogs: false,
  ...overrides,
});

const ALL_KEYS = keys({
  createForms: true,
  deleteForms: true,
  fillForms: true,
  viewResponses: true,
  editCatalogs: true,
});

const keysOf = (state: FormRowState, viewer: FormViewerKeys) =>
  formRowActions(state, viewer).map((action) => action.key);

describe("formRowActions", () => {
  it("al administrador le ofrece todo sobre un formato publicado", () => {
    expect(keysOf(row({ canFill: true, canEdit: true }), ALL_KEYS)).toEqual([
      "fill",
      "responses",
      "results",
      "edit",
      "duplicate",
      "archive",
      "remove",
    ]);
  });

  it("quien sólo diligencia puede diligenciar y ver sus respuestas", () => {
    expect(keysOf(row({ canFill: true }), keys({ fillForms: true }))).toEqual([
      "fill",
      "responses",
    ]);
  });

  it("un borrador no se diligencia ni tiene respuestas que abrir", () => {
    expect(
      keysOf(
        row({
          status: "draft",
          publishedVersionNumber: null,
          canFill: true,
          canEdit: true,
        }),
        ALL_KEYS,
      ),
    ).toEqual(["edit", "duplicate", "archive", "remove"]);
  });

  it("un archivado no se diligencia ni se edita: se reactiva", () => {
    expect(
      keysOf(
        row({ status: "archived", canFill: true, canEdit: true }),
        ALL_KEYS,
      ),
    ).toEqual(["responses", "results", "duplicate", "unarchive", "remove"]);
  });

  it("en un listado se añade un elemento, no se diligencia", () => {
    expect(
      keysOf(row({ kind: "catalog", canFill: true, canEdit: true }), ALL_KEYS),
    ).toEqual([
      "addEntry",
      "responses",
      "results",
      "edit",
      "duplicate",
      "archive",
      "remove",
    ]);
  });

  it("sin `editCatalogs` no ofrece añadir elementos", () => {
    expect(
      keysOf(row({ kind: "catalog" }), keys({ viewResponses: true })),
    ).toEqual(["responses", "results"]);
  });

  it("con respuestas, eliminar sale apagado y dice por qué", () => {
    const remove = formRowActions(
      row({ responseCount: 3 }),
      keys({ deleteForms: true }),
    ).find((action) => action.key === "remove");
    expect(remove?.blockedReason).toBe(REMOVE_BLOCKED_REASON);

    const removeCatalog = formRowActions(
      row({ kind: "catalog", responseCount: 1 }),
      keys({ deleteForms: true }),
    ).find((action) => action.key === "remove");
    expect(removeCatalog?.blockedReason).toBe(REMOVE_BLOCKED_REASON_CATALOG);
  });

  it("sin respuestas, eliminar se ofrece sin reparos", () => {
    const remove = formRowActions(row(), keys({ deleteForms: true })).find(
      (action) => action.key === "remove",
    );
    expect(remove).toEqual({ key: "remove" });
  });

  it("sin ninguna llave no ofrece nada", () => {
    expect(formRowActions(row(), keys())).toEqual([]);
  });
});

describe("canOpenResponses", () => {
  it("los elementos de un listado no se abren sólo con `fillForms`", () => {
    expect(
      canOpenResponses(row({ kind: "catalog" }), keys({ fillForms: true })),
    ).toBe(false);
    expect(
      canOpenResponses(row({ kind: "catalog" }), keys({ editCatalogs: true })),
    ).toBe(true);
  });

  it("lo que nunca se publicó no tiene respuestas", () => {
    expect(
      canOpenResponses(
        row({ status: "draft", publishedVersionNumber: null }),
        ALL_KEYS,
      ),
    ).toBe(false);
  });
});

describe("primaryRowAction", () => {
  it("quien sólo diligencia, diligencia", () => {
    expect(
      primaryRowAction(row({ canFill: true }), keys({ fillForms: true })),
    ).toBe("fill");
  });

  it("quien además consulta o construye abre el formato", () => {
    expect(primaryRowAction(row({ canFill: true }), ALL_KEYS)).toBe(
      "responses",
    );
    expect(
      primaryRowAction(
        row({ canFill: true, canEdit: true }),
        keys({ fillForms: true }),
      ),
    ).toBe("responses");
  });

  it("quien consulta abre las respuestas", () => {
    expect(primaryRowAction(row(), keys({ viewResponses: true }))).toBe(
      "responses",
    );
  });

  it("un listado abre sus elementos aunque se pueda diligenciar", () => {
    expect(
      primaryRowAction(row({ kind: "catalog", canFill: true }), ALL_KEYS),
    ).toBe("responses");
  });

  it("un borrador abre el constructor", () => {
    expect(
      primaryRowAction(
        row({ status: "draft", publishedVersionNumber: null, canEdit: true }),
        ALL_KEYS,
      ),
    ).toBe("edit");
  });

  it("sin nada que hacer, la fila no lleva a ningún sitio", () => {
    expect(
      primaryRowAction(
        row({ status: "draft", publishedVersionNumber: null }),
        keys({ deleteForms: true }),
      ),
    ).toBeNull();
  });
});

describe("formRowActionLabel", () => {
  it("nombra las respuestas según la clase", () => {
    expect(formRowActionLabel("responses", "record")).toBe("Ver respuestas");
    expect(formRowActionLabel("responses", "catalog")).toBe("Ver elementos");
  });
});

describe("countForms", () => {
  it("cuenta en singular y en plural", () => {
    expect(countForms(1, "record")).toBe("1 formato");
    expect(countForms(19, "record")).toBe("19 formatos");
    expect(countForms(1, "catalog")).toBe("1 listado");
    expect(countForms(0, "catalog")).toBe("0 listados");
  });
});
