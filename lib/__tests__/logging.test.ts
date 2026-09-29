import { describe, expect, it } from "vitest";

import {
  deserializeLoggedError,
  logError,
  registerLogSink,
  unregisterLogSink,
} from "../logging";
import type { LogEntry } from "../logging";

/**
 * El par `logError` → `deserializeLoggedError` es lo que decide si una
 * excepción llega a PostHog **con traza o sin ella**. Un sink que haga
 * `error instanceof Error` aquí es SIEMPRE falso, porque `logError` serializa
 * antes de emitir: todas las excepciones llegarían sin stack y agrupadas por
 * el nombre del evento. Estos tests fijan el viaje de ida y vuelta completo.
 */

/** Captura lo que un sink recibiría, ejecutando `logError` de verdad. */
function captureEntry(run: () => void): LogEntry {
  const entries: LogEntry[] = [];
  registerLogSink((entry) => entries.push(entry));
  try {
    run();
  } finally {
    unregisterLogSink();
  }
  expect(entries).toHaveLength(1);
  return entries[0];
}

describe("deserializeLoggedError", () => {
  it("recupera name, message y stack de un Error que pasó por logError", () => {
    const original = new TypeError("turno sin puesto");
    const entry = captureEntry(() => logError("shift.save", original));

    // Lo que viaja NO es un Error: si esto cambia, el sink puede simplificarse.
    expect(entry.context.error).not.toBeInstanceOf(Error);

    const restored = deserializeLoggedError(entry.event, entry.context.error);
    expect(restored).toBeInstanceOf(Error);
    expect(restored.name).toBe("TypeError");
    expect(restored.message).toBe("turno sin puesto");
    expect(restored.stack).toBe(original.stack);
  });

  it("usa el nombre del evento cuando lo logueado no era un error", () => {
    const entry = captureEntry(() => logError("shift.save", "falló y ya"));

    const restored = deserializeLoggedError(entry.event, entry.context.error);
    expect(restored.message).toBe("shift.save");
  });

  it("conserva un Error si alguna vez llega sin serializar", () => {
    const original = new Error("directo");
    expect(deserializeLoggedError("evento", original)).toBe(original);
  });

  it("no pisa el stack propio cuando el serializado no trae uno", () => {
    const restored = deserializeLoggedError("evento", { message: "sin traza" });
    expect(restored.message).toBe("sin traza");
    expect(restored.stack).toBeTruthy();
  });

  it("un sink que lanza no tumba al emisor", () => {
    registerLogSink(() => {
      throw new Error("sink roto");
    });
    try {
      expect(() => logError("evento", new Error("x"))).not.toThrow();
    } finally {
      unregisterLogSink();
    }
  });
});
