/** La biblioteca SST son datos, y estos son los contratos de su forma: que
 *  cada formato sea una definición válida, que las relaciones apunten a donde
 *  deben y que el formulario aproveche la fila.
 *
 *  Es autosuficiente: no depende de `validateForm`. La fidelidad al papel
 *  está en `paper.test.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  FIELD_TYPE_KINDS,
  FORM_CODE_MAX,
  FORM_DESCRIPTION_MAX,
  FORM_LIMITS,
  FORM_NAME_MAX,
  FORM_NAME_MIN,
  FULL_WIDTH_TYPES,
  RECIPES_BY_TYPE,
} from "../../lib/form_types";
import { SST_LIBRARY } from "../index";
import { LIBRARY_REFERENCE_PREFIX } from "../types";
import {
  catalogs,
  DATE_PATTERN,
  duplicates,
  EACH_FORM,
  fieldOf,
  fieldsOf,
  ID_PATTERN,
  idsOf,
  indexOfKey,
  labelsOf,
  records,
  referencesOf,
  rowsOf,
} from "./readers";

/* ─────────────────────────────── La biblioteca ──────────────────────────── */

describe("biblioteca SST", () => {
  it("trae cinco listados y diecinueve formatos, los listados primero", () => {
    expect(catalogs.map((form) => form.key)).toEqual([
      "centros-de-trabajo",
      "personal",
      "vehiculos",
      "equipos",
      "extintores",
    ]);
    expect(records).toHaveLength(19);
    const firstRecord = SST_LIBRARY.findIndex((form) => form.kind === "record");
    expect(
      SST_LIBRARY.slice(firstRecord).every((f) => f.kind === "record"),
    ).toBe(true);
  });

  it("no repite ninguna clave ni ningún código", () => {
    expect(duplicates(SST_LIBRARY.map((form) => form.key))).toEqual([]);
    expect(
      duplicates(SST_LIBRARY.flatMap((form) => (form.code ? [form.code] : []))),
    ).toEqual([]);
  });

  it("cada formato lleva el código de su documento, y su clave sale de él", () => {
    for (const form of records) {
      expect(form.code, form.key).toMatch(/^SST-F-\d{3}(-A\d)?$/);
      expect(form.key).toBe(form.code?.toLowerCase());
    }
  });

  it("usa sólo las categorías acordadas", () => {
    expect([...new Set(records.map((form) => form.category))]).toEqual([
      "Inspecciones preoperacionales",
      "Inspecciones de emergencia",
      "Dotación",
      "Informe de gestión",
    ]);
  });
});

/* ──────────────────────────────── Cada formato ──────────────────────────── */

describe.each(EACH_FORM)("%s", (_key, form) => {
  const fields = fieldsOf(form);

  it("tiene nombre, código y descripción dentro de sus límites", () => {
    expect(form.key).toMatch(ID_PATTERN);
    expect(form.name.length).toBeGreaterThanOrEqual(FORM_NAME_MIN);
    expect(form.name.length).toBeLessThanOrEqual(FORM_NAME_MAX);
    expect(form.code?.length ?? 0).toBeLessThanOrEqual(FORM_CODE_MAX);
    expect(form.description?.length ?? 0).toBeLessThanOrEqual(
      FORM_DESCRIPTION_MAX,
    );
    expect(form.category.trim()).not.toBe("");
  });

  it("sus ids son estables, legibles y únicos", () => {
    const ids = idsOf(form);
    expect(ids.filter((id) => !ID_PATTERN.test(id))).toEqual([]);
    expect(duplicates(ids)).toEqual([]);
  });

  it("sus secciones van numeradas en orden y ninguna está vacía", () => {
    expect(form.sections.map((section) => section.order)).toEqual(
      form.sections.map((_, index) => index),
    );
    for (const section of form.sections) {
      expect(section.fields.length, section.id).toBeGreaterThan(0);
    }
  });

  it("cabe en los límites de un formato", () => {
    expect(form.sections.length).toBeGreaterThan(0);
    expect(form.sections.length).toBeLessThanOrEqual(FORM_LIMITS.maxSections);
    expect(fields.length).toBeLessThanOrEqual(FORM_LIMITS.maxFields);
    expect(
      labelsOf(form).filter(
        (label) => label.length > FORM_LIMITS.maxLabelLength,
      ),
    ).toEqual([]);

    for (const field of fields) {
      const { options, checklist, table, reference } = field.config;
      const lists = [
        options,
        ...(table?.columns ?? []).map((column) => column.options),
      ];
      for (const list of lists) {
        expect(list?.length ?? 0, field.id).toBeLessThanOrEqual(
          FORM_LIMITS.maxOptions,
        );
      }
      if (checklist) {
        const items = checklist.blocks.flatMap((block) => block.items);
        expect(items.length, field.id).toBeLessThanOrEqual(
          FORM_LIMITS.maxChecklistItems,
        );
        expect(checklist.options.length, field.id).toBeGreaterThanOrEqual(
          FORM_LIMITS.minChecklistOptions,
        );
        expect(checklist.options.length, field.id).toBeLessThanOrEqual(
          FORM_LIMITS.maxChecklistOptions,
        );
        for (const option of checklist.options) {
          expect(option.short.length, option.value).toBeGreaterThan(0);
          expect(option.short.length, option.value).toBeLessThanOrEqual(
            FORM_LIMITS.maxChecklistShort,
          );
        }
      }
      if (table) {
        expect(table.columns.length, field.id).toBeGreaterThan(0);
        expect(table.columns.length, field.id).toBeLessThanOrEqual(
          FORM_LIMITS.maxTableColumns,
        );
        expect(table.minRows ?? 0, field.id).toBeLessThanOrEqual(
          table.maxRows ?? FORM_LIMITS.maxTableRows,
        );
        expect(table.maxRows ?? 0, field.id).toBeLessThanOrEqual(
          FORM_LIMITS.maxTableRows,
        );
        expect(table.rowLabel.trim(), field.id).not.toBe("");
      }
      if (reference) {
        expect(reference.fill.length, field.id).toBeLessThanOrEqual(
          FORM_LIMITS.maxReferenceFill,
        );
      }
    }
  });

  it("cada campo trae la configuración de su tipo, y sólo esa", () => {
    const own = {
      checklist: "checklist",
      table: "table",
      reference: "reference",
      signature: "signature",
    } as const;
    for (const field of fields) {
      for (const [key, type] of Object.entries(own)) {
        expect(
          field.config[key as keyof typeof own] !== undefined,
          `${field.id}.${key}`,
        ).toBe(field.type === type);
      }
      const hasOptions = (field.config.options?.length ?? 0) > 0;
      expect(hasOptions, `${field.id}.options`).toBe(
        field.type === "select" || field.type === "multiSelect",
      );
      expect(field.label.trim(), field.id).not.toBe("");
    }
  });

  it("los tipos de fila entera van en `full` y los de una clase, en la suya", () => {
    for (const field of fields) {
      if (FULL_WIDTH_TYPES.includes(field.type)) {
        expect(field.size, field.id).toBe("full");
      }
      const kinds = FIELD_TYPE_KINDS[field.type];
      if (kinds) expect(kinds, field.id).toContain(form.kind);
      for (const column of field.config.table?.columns ?? []) {
        const columnKinds = FIELD_TYPE_KINDS[column.type];
        if (columnKinds) expect(columnKinds, column.id).toContain(form.kind);
      }
    }
  });

  it("sólo un listado tiene título y ejemplos, y el título es un texto obligatorio", () => {
    if (form.kind === "record") {
      expect(form.titleFieldId).toBeUndefined();
      expect(form.sampleEntries).toBeUndefined();
      return;
    }
    const title = fieldOf(form, form.titleFieldId ?? "");
    expect(title?.type).toBe("text");
    expect(title?.required).toBe(true);
    expect(title?.config.visibility).toBeUndefined();
  });

  it("cada relación apunta a un listado anterior, y trae campos que existen", () => {
    for (const { where, formId, fill } of referencesOf(form)) {
      expect(formId.startsWith(LIBRARY_REFERENCE_PREFIX), where).toBe(true);
      const key = formId.slice(LIBRARY_REFERENCE_PREFIX.length);
      const target = SST_LIBRARY.find((candidate) => candidate.key === key);
      expect(target?.kind, `${where} → ${formId}`).toBe("catalog");
      expect(indexOfKey(key), `${where} → ${formId}`).toBeLessThan(
        indexOfKey(form.key),
      );
      expect(duplicates(fill), where).toEqual([]);
      const known = target ? fieldsOf(target).map((field) => field.id) : [];
      expect(
        fill.filter((id) => !known.includes(id)),
        `${where} → ${formId}`,
      ).toEqual([]);
    }
  });

  it("ninguna fila de escritorio queda incompleta", () => {
    for (const section of form.sections) {
      const rows = rowsOf(section.fields);
      const last = rows.pop() ?? 12;
      expect(rows, `${section.id}: filas intermedias`).toEqual(
        rows.map(() => 12),
      );
      expect(last, `${section.id}: última fila`).toBeGreaterThanOrEqual(6);
    }
  });

  it("enseña entre tres y cinco columnas en el listado de respuestas", () => {
    const shown = fields.filter((field) => field.showInTable);
    expect(shown.length).toBeGreaterThanOrEqual(3);
    expect(shown.length).toBeLessThanOrEqual(5);
    if (form.titleFieldId) {
      expect(shown.map((field) => field.id)).toContain(form.titleFieldId);
    }
  });

  it("sus reglas y sus cálculos miran campos que existen y van antes", () => {
    const order = fields.map((field) => field.id);
    for (const field of fields) {
      const position = order.indexOf(field.id);
      const controllers = [
        ...(field.config.visibility?.rules ?? []),
        ...(field.config.autoValue?.rules ?? []),
      ];
      for (const rule of controllers) {
        const controller = fieldOf(form, rule.fieldId);
        expect(controller, `${field.id} ← ${rule.fieldId}`).toBeDefined();
        expect(order.indexOf(rule.fieldId)).toBeLessThan(position);
        if (controller?.type === "select" && rule.values.length > 0) {
          const values = controller.config.options?.map((o) => o.value);
          for (const value of rule.values) expect(values).toContain(value);
        }
      }
      const { computed } = field.config;
      if (!computed) continue;
      expect(RECIPES_BY_TYPE[field.type], field.id).toContain(computed.kind);
      expect(field.required, field.id).toBe(false);
      if (computed.kind !== "formula") continue;
      const kinds = computed.terms.map((term) => term.type === "op");
      // Operando, operador, operando…: empieza y termina en operando.
      expect(kinds).toEqual(kinds.map((_, index) => index % 2 === 1));
      expect(kinds.length % 2).toBe(1);
      for (const term of computed.terms) {
        if (term.type !== "field") continue;
        const operand = fieldOf(form, term.fieldId);
        expect(operand?.type, `${field.id} ← ${term.fieldId}`).toBe("number");
        expect(order.indexOf(term.fieldId)).toBeLessThan(position);
      }
    }
  });

  it("cada ejemplo usa campos del listado, con valores que su campo admite", () => {
    for (const entry of form.sampleEntries ?? []) {
      const title = entry[form.titleFieldId ?? ""];
      expect(typeof title).toBe("string");
      expect(String(title).trim()).not.toBe("");

      for (const [id, value] of Object.entries(entry)) {
        const field = fieldOf(form, id);
        expect(field, `${title}.${id}`).toBeDefined();
        if (!field) continue;
        const where = `${title}.${id}`;
        if (field.type === "checkbox") {
          expect(typeof value, where).toBe("boolean");
        } else if (field.type === "number") {
          expect(typeof value, where).toBe("number");
        } else {
          expect(typeof value, where).toBe("string");
        }
        if (field.type === "date") expect(value, where).toMatch(DATE_PATTERN);
        if (field.type === "select") {
          expect(
            field.config.options?.map((option) => option.value),
            where,
          ).toContain(value);
        }
        if (field.config.reference) {
          // Una relación de ejemplo nombra, por su título, otro ejemplo.
          const key = field.config.reference.formId.slice(
            LIBRARY_REFERENCE_PREFIX.length,
          );
          const target = SST_LIBRARY.find((c) => c.key === key);
          const titles = (target?.sampleEntries ?? []).map(
            (other) => other[target?.titleFieldId ?? ""],
          );
          expect(titles, where).toContain(value);
        }
      }

      for (const field of fields.filter((f) => f.required)) {
        expect(entry[field.id], `${title}.${field.id}`).toBeDefined();
      }
    }
  });

  it("un listado trae tres o cuatro ejemplos, con títulos distintos", () => {
    if (form.kind !== "catalog") return;
    const titles = (form.sampleEntries ?? []).map((entry) =>
      String(entry[form.titleFieldId ?? ""]),
    );
    expect(titles.length).toBeGreaterThanOrEqual(3);
    expect(titles.length).toBeLessThanOrEqual(4);
    expect(duplicates(titles)).toEqual([]);
  });
});
