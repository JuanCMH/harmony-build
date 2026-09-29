import { describe, expect, it } from "vitest";

import {
  cellFrameId,
  checklistItemDomId,
  fieldDomId,
  fieldFrameId,
  problemTargets,
} from "../field-dom";

describe("problemTargets", () => {
  it("va al campo cuando el problema es del campo entero", () => {
    expect(
      problemTargets({
        fieldId: "vehiculo",
        sectionId: "identificacion",
        kind: "missing",
        message: "Este campo es obligatorio",
      }),
    ).toEqual([fieldFrameId("vehiculo")]);
  });

  it("prefiere el ítem de la lista de chequeo y cae al campo", () => {
    const targets = problemTargets({
      fieldId: "estado",
      sectionId: "inspeccion",
      kind: "missing",
      message: "Falta",
      itemId: "aceite",
    });
    expect(targets).toEqual([
      checklistItemDomId("estado", "aceite"),
      fieldFrameId("estado"),
    ]);
    // El mismo id que escribe `ChecklistFieldControl` con el id del control.
    expect(targets[0]).toBe(`${fieldDomId("estado")}-item-aceite`);
  });

  it("prefiere la celda de la tabla y cae al campo", () => {
    expect(
      problemTargets({
        fieldId: "elementos",
        sectionId: "entrega",
        kind: "missing",
        message: "Falta",
        rowId: "fila-2",
        columnId: "recibido",
      }),
    ).toEqual([
      cellFrameId(fieldDomId("elementos"), "fila-2", "recibido"),
      fieldFrameId("elementos"),
    ]);
  });
});
