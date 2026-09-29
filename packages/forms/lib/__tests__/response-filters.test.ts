import type { Id } from "@/convex/_generated/dataModel";
import type { FormField, FormSection } from "@/convex/lib/form_types";
import { describe, expect, it } from "vitest";
import {
  type ResponseFilters,
  entriesQueryArgs,
  hasResponseFilters,
  relatedCatalogs,
  responsesQueryArgs,
} from "../response-filters";

const FORM = "m17fpftnkgypnsr7nzy1hzxe118fattw" as Id<"forms">;
const ENTRY = "k573mthrvwaz2by7b92bgt9eyh8fbh47";
const VEHICLES = "m177zj2bbwfwp5fje3yy2y7sy18fbh6p";
const STAFF = "m176h32a8dvb64heffkj95qsg18fbcg8";

const NONE: ResponseFilters = {
  from: null,
  to: null,
  mine: false,
  entryId: null,
};

describe("los argumentos del listado de respuestas", () => {
  it("sin filtros sólo lleva el formato", () => {
    const args = responsesQueryArgs(FORM, NONE, true);
    expect(args).toEqual({ formId: FORM });
    expect(hasResponseFilters(args)).toBe(false);
  });

  it("lleva el rango, las mías y el elemento", () => {
    const args = responsesQueryArgs(
      FORM,
      { from: "2026-09-01", to: "2026-09-30", mine: true, entryId: ENTRY },
      true,
    );
    expect(args).toEqual({
      formId: FORM,
      from: "2026-09-01",
      to: "2026-09-30",
      mine: true,
      targetResponseId: ENTRY,
    });
    expect(hasResponseFilters(args)).toBe(true);
  });

  it("un rango abierto por un lado es válido", () => {
    expect(
      responsesQueryArgs(FORM, { ...NONE, from: "2026-09-01" }, true),
    ).toEqual({ formId: FORM, from: "2026-09-01" });
  });

  it("endereza un rango escrito al revés", () => {
    expect(
      responsesQueryArgs(
        FORM,
        { ...NONE, from: "2026-09-30", to: "2026-09-01" },
        true,
      ),
    ).toEqual({ formId: FORM, from: "2026-09-01", to: "2026-09-30" });
  });

  it("ignora lo que en la dirección no es una fecha", () => {
    expect(
      responsesQueryArgs(
        FORM,
        { ...NONE, from: "ayer", to: "2026-02-30" },
        true,
      ),
    ).toEqual({ formId: FORM });
  });

  it("ignora un elemento que no tiene forma de id", () => {
    expect(
      responsesQueryArgs(FORM, { ...NONE, entryId: "../otro" }, true),
    ).toEqual({ formId: FORM });
  });

  it("a quien sólo ve las suyas no le manda «las mías»: ya lo son", () => {
    const args = responsesQueryArgs(FORM, { ...NONE, mine: true }, false);
    expect(args).toEqual({ formId: FORM });
    expect(hasResponseFilters(args)).toBe(false);
  });
});

describe("los argumentos del listado de elementos", () => {
  it("sin búsqueda ni inactivos sólo lleva el listado", () => {
    expect(
      entriesQueryArgs(FORM, { search: "   ", includeInactive: false }),
    ).toEqual({ formId: FORM });
  });

  it("lleva la búsqueda recortada y los inactivos", () => {
    expect(
      entriesQueryArgs(FORM, { search: " slp ", includeInactive: true }),
    ).toEqual({ formId: FORM, search: "slp", includeInactive: true });
  });
});

describe("los listados que un formato relaciona", () => {
  const reference = (id: string, label: string, formId: string): FormField => ({
    id,
    type: "reference",
    label,
    required: false,
    size: "medium",
    showInTable: true,
    config: { reference: { formId, fill: [] } },
  });

  const section = (fields: FormField[]): FormSection => ({
    id: "general",
    label: "General",
    order: 1,
    fields,
  });

  it("un formato sin relaciones no ofrece el filtro", () => {
    expect(relatedCatalogs([section([])])).toEqual([]);
  });

  it("da una entrada por listado, con el nombre de su campo", () => {
    expect(
      relatedCatalogs([
        section([
          reference("vehiculo", "Vehículo", VEHICLES),
          reference("conductor", "Conductor", STAFF),
        ]),
      ]),
    ).toEqual([
      { formId: VEHICLES, label: "Vehículo" },
      { formId: STAFF, label: "Conductor" },
    ]);
  });

  it("dos campos del mismo listado son una sola entrada", () => {
    expect(
      relatedCatalogs([
        section([
          reference("conductor", "Conductor", STAFF),
          reference("ayudante", "Ayudante", STAFF),
        ]),
      ]),
    ).toEqual([{ formId: STAFF, label: "Conductor / Ayudante" }]);
  });

  it("cuenta la relación que es columna de una tabla", () => {
    const table: FormField = {
      id: "entregas",
      type: "table",
      label: "Entregas",
      required: false,
      size: "full",
      showInTable: false,
      config: {
        table: {
          rowLabel: "Elemento",
          columns: [
            {
              id: "persona",
              label: "Recibe",
              type: "reference",
              required: true,
              reference: { formId: STAFF, fill: [] },
            },
          ],
        },
      },
    };
    expect(relatedCatalogs([section([table])])).toEqual([
      { formId: STAFF, label: "Entregas › Recibe" },
    ]);
  });

  it("una relación a medio configurar no entra", () => {
    expect(
      relatedCatalogs([section([reference("vehiculo", "Vehículo", "")])]),
    ).toEqual([]);
  });
});
