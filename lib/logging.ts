/**
 * Logging estructurado del cliente.
 *
 * - En **desarrollo** imprime en consola con formato legible (prefijo + objeto).
 * - En **producción** emite una línea JSON por evento y suprime el ruido de
 *   `debug`.
 * - Un **sink remoto** (hoy PostHog, vía `ObservabilityProvider`) se conecta
 *   con `registerLogSink()` cuando hay credenciales, sin tocar este archivo.
 *   Hasta entonces el punto de envío existe pero es un no-op silencioso.
 *
 * El contexto que se pasa a `logError` debe ser **ids y nombres de acción**,
 * nunca datos de negocio: viaja tal cual al servicio de observabilidad.
 *
 * Uso:
 *
 *   import { logError } from "@/lib/logging";
 *   logError("project.logo_upload", err, { projectId, status: 413 });
 */

type LogContext = Record<string, unknown>;

type LogLevel = "error" | "warn" | "info" | "debug";

export type LogEntry = {
  level: LogLevel;
  event: string;
  timestamp: string;
  env: string;
  context: LogContext;
};

const LEVEL_PREFIX: Record<LogLevel, string> = {
  error: "🔴",
  warn: "🟡",
  info: "🔵",
  debug: "⚪",
};

const isProd = process.env.NODE_ENV === "production";

// En producción `debug` no aporta y ensucia el agregador.
const ENABLED: Record<LogLevel, boolean> = {
  error: true,
  warn: true,
  info: true,
  debug: !isProd,
};

/**
 * Sink remoto opcional. Se registra una sola vez, desde el provider que
 * inicializa el servicio. Nunca debe lanzar: los errores del sink se tragan
 * para no romper el flujo que estaba logueando.
 */
type LogSink = (entry: LogEntry) => void;
let remoteSink: LogSink | null = null;

export function registerLogSink(sink: LogSink): void {
  remoteSink = sink;
}

/**
 * Suelta el sink activo. Lo usan el cleanup del provider que lo instaló y los
 * tests: sin esto, un sink registrado en una prueba sigue vivo para las
 * siguientes y contamina lo que reciben.
 */
export function unregisterLogSink(): void {
  remoteSink = null;
}

function emit(entry: LogEntry): void {
  const consoleMethod = entry.level === "debug" ? "log" : entry.level;
  if (isProd) {
    console[consoleMethod](JSON.stringify(entry));
  } else {
    console[consoleMethod](
      `${LEVEL_PREFIX[entry.level]} [${entry.event}]`,
      entry.context,
    );
  }

  if (remoteSink) {
    try {
      remoteSink(entry);
    } catch {
      // Un sink que falla nunca debe tumbar al emisor.
    }
  }
}

function log(level: LogLevel, event: string, context: LogContext = {}): void {
  if (!ENABLED[level]) return;
  emit({
    level,
    event,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
    context,
  });
}

export function logError(
  event: string,
  err: unknown,
  context: LogContext = {},
) {
  log("error", event, {
    ...context,
    error:
      err instanceof Error
        ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          }
        : err,
  });
}

/**
 * Inversa de la serialización que hace `logError`: rehace un `Error` a partir
 * del `{ name, message, stack }` que viaja dentro de `entry.context.error`.
 *
 * Vive pegada a `logError` **a propósito**: son un par. Quien cambie el formato
 * de arriba tiene delante lo que hay que cambiar abajo. Sin esto, el sink que
 * reporta la excepción a PostHog recibe un objeto plano, no un `Error`, y
 * pierde el stack, que es justo lo único que se quería ver.
 */
export function deserializeLoggedError(
  event: string,
  serialized: unknown,
): Error {
  if (serialized instanceof Error) return serialized;
  if (
    serialized !== null &&
    typeof serialized === "object" &&
    typeof (serialized as { message?: unknown }).message === "string"
  ) {
    const { name, message, stack } = serialized as {
      name?: unknown;
      message: string;
      stack?: unknown;
    };
    const error = new Error(message);
    if (typeof name === "string" && name) error.name = name;
    // Un stack ausente es normal (errores lanzados sin traza); uno vacío
    // también, y en ambos casos conviene quedarse con el que genera `new Error`
    // antes que pisarlo con nada.
    if (typeof stack === "string" && stack) error.stack = stack;
    return error;
  }
  // Lo que se logueó no era un error (un string, un número, `undefined`): el
  // nombre del evento pasa a ser la identidad del fallo, que es lo que agrupa
  // bien en el reporte.
  return new Error(event);
}

export function logWarn(event: string, context: LogContext = {}) {
  log("warn", event, context);
}

export function logInfo(event: string, context: LogContext = {}) {
  log("info", event, context);
}

export function logDebug(event: string, context: LogContext = {}) {
  log("debug", event, context);
}
