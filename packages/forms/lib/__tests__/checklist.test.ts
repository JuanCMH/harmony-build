import { describe, expect, it } from "vitest";
import type { ChecklistConfig } from "@/convex/lib/form_types";
import {
  allAnswerableItems,
  checklistProgress,
  describeProgress,
  fillBlock,
  firstIncompleteItem,
  needsNote,
  patchAnswer,
} from "../checklist";

const config: ChecklistConfig = {
  options: [
    { value: "b", label: "Bueno", short: "B", meaning: "ok" },
    { value: "m", label: "Malo", short: "M", meaning: "fail" },
    { value: "na", label: "No aplica", short: "N.A", meaning: "na" },
  ],
  note: "onFail",
  blocks: [
    {
      id: "niveles",
      label: "1. Niveles",
      items: [
        { id: "aceite", label: "De aceite" },
        { id: "agua", label: "De agua" },
      ],
    },
    {
      id: "luces",
      label: "2. Luces",
      items: [
        { id: "frontales", label: "Luces frontales", heading: true },
        { id: "altas", label: "Altas", indented: true },
        { id: "medias", label: "Medias", indented: true },
      ],
    },
  ],
};

describe("patchAnswer", () => {
  it("la fila que agrupa no se responde", () => {
    expect(allAnswerableItems(config).map((item) => item.id)).toEqual([
      "aceite",
      "agua",
      "altas",
      "medias",
    ]);
  });

  it("guarda en el orden de la definición, se pulse en el orden que se pulse", () => {
    let answers = patchAnswer(config, [], "medias", { value: "b" });
    answers = patchAnswer(config, answers, "aceite", { value: "m" });

    expect(answers).toEqual([
      { itemId: "aceite", value: "m" },
      { itemId: "medias", value: "b" },
    ]);
  });

  it("quitar la respuesta conserva la observación; quitar las dos borra el ítem", () => {
    let answers = patchAnswer(config, [], "aceite", {
      value: "m",
      note: "Fuga en el cárter",
    });
    answers = patchAnswer(config, answers, "aceite", { value: undefined });
    expect(answers).toEqual([{ itemId: "aceite", note: "Fuga en el cárter" }]);

    answers = patchAnswer(config, answers, "aceite", { note: "" });
    expect(answers).toEqual([]);
  });
});

describe("fillBlock", () => {
  it("responde sólo lo que faltaba y no sale del bloque", () => {
    const before = patchAnswer(config, [], "agua", {
      value: "m",
      note: "Nivel bajo",
    });
    const after = fillBlock(config, before, "niveles", "b");

    expect(after).toEqual([
      { itemId: "aceite", value: "b" },
      { itemId: "agua", value: "m", note: "Nivel bajo" },
    ]);
  });

  it("un bloque que no existe no cambia nada", () => {
    expect(fillBlock(config, [], "otro", "b")).toEqual([]);
  });
});

describe("la observación obligatoria", () => {
  it("se exige sólo cuando la respuesta es no conforme", () => {
    expect(needsNote(config, { itemId: "aceite", value: "m" })).toBe(true);
    expect(needsNote(config, { itemId: "aceite", value: "m", note: " " })).toBe(
      true,
    );
    expect(
      needsNote(config, { itemId: "aceite", value: "m", note: "Fuga" }),
    ).toBe(false);
    expect(needsNote(config, { itemId: "aceite", value: "b" })).toBe(false);
    expect(needsNote(config, undefined)).toBe(false);
  });

  it("con la observación opcional no se exige nunca", () => {
    expect(
      needsNote({ ...config, note: "optional" }, { itemId: "a", value: "m" }),
    ).toBe(false);
  });
});

describe("checklistProgress", () => {
  const answers = [
    { itemId: "aceite", value: "b" },
    { itemId: "agua", value: "m" },
    { itemId: "altas", value: "na" },
  ];

  it("cuenta por lo que la opción significa, no por su letra", () => {
    expect(checklistProgress(config, answers)).toEqual({
      total: 4,
      answered: 3,
      byMeaning: { ok: 1, fail: 1, na: 1 },
      missingNotes: 1,
    });
  });

  it("se puede medir un bloque solo", () => {
    expect(
      checklistProgress(config, answers, config.blocks[0].items).answered,
    ).toBe(2);
  });

  it("una opción que ya no existe cuenta como sin responder", () => {
    expect(
      checklistProgress(config, [{ itemId: "aceite", value: "vieja" }])
        .answered,
    ).toBe(0);
  });

  it("se describe sin nombrar lo que no ocurrió", () => {
    expect(describeProgress(checklistProgress(config, answers))).toBe(
      "1 conforme · 1 no conforme · 1 no aplica",
    );
    expect(
      describeProgress(
        checklistProgress(config, [
          { itemId: "aceite", value: "b" },
          { itemId: "agua", value: "b" },
        ]),
      ),
    ).toBe("2 conformes");
  });
});

describe("firstIncompleteItem", () => {
  it("si es obligatoria, el primero sin responder", () => {
    const answers = [{ itemId: "aceite", value: "b" }];
    expect(firstIncompleteItem(config, answers, true)).toBe("agua");
  });

  it("si no lo es, sólo estorba la observación que falta", () => {
    expect(firstIncompleteItem(config, [], false)).toBeUndefined();
    expect(
      firstIncompleteItem(config, [{ itemId: "altas", value: "m" }], false),
    ).toBe("altas");
  });
});
