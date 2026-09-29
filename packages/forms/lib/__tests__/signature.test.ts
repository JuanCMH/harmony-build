import { describe, expect, it } from "vitest";
import {
  isSignatureDrawn,
  signatureFileName,
  strokeToPath,
  strokesLength,
} from "../signature";

describe("el trazo de una firma", () => {
  it("un toque no es una firma", () => {
    expect(isSignatureDrawn([])).toBe(false);
    expect(isSignatureDrawn([[{ x: 10, y: 10 }]])).toBe(false);
    expect(
      isSignatureDrawn([
        [
          { x: 0, y: 0 },
          { x: 3, y: 4 },
        ],
      ]),
    ).toBe(false);
  });

  it("la longitud suma todos los trazos", () => {
    const strokes = [
      [
        { x: 0, y: 0 },
        { x: 30, y: 40 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ],
    ];
    expect(strokesLength(strokes)).toBe(60);
    expect(isSignatureDrawn(strokes)).toBe(true);
  });

  it("un punto solo se pinta como un punto", () => {
    expect(strokeToPath([{ x: 5, y: 6 }])).toBe("M 5 6 L 5 6");
    expect(strokeToPath([])).toBe("");
  });

  it("varios puntos se unen con curvas por sus puntos medios", () => {
    expect(
      strokeToPath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 10 },
      ]),
    ).toBe("M 0 0 Q 10 0 15 5 L 20 10");
  });
});

describe("signatureFileName", () => {
  it("dice de quién es, sin tildes ni espacios", () => {
    expect(signatureFileName("José Ángel Peña")).toBe(
      "firma-jose-angel-pena.png",
    );
    expect(signatureFileName("  ")).toBe("firma-sin-nombre.png");
  });
});
