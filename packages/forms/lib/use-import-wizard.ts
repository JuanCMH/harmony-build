"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { todayInColombia } from "@/convex/lib/dates";
import type { FormKind, FormSection } from "@/convex/lib/form_types";
import { IMPORT_LIMITS } from "@/convex/lib/import_types";
import { handleConvexErrorCallback } from "@/lib/convex-error-handler";
import { useMemo, useState } from "react";

import { useFinishImport, useStartImport, useWriteImportBatch } from "../api";
import {
  fileProblem,
  fingerprintOf,
  readImportFile,
  sheetProblem,
} from "./import-file";
import type { ImportCounts } from "./import-history";
import {
  type ColumnMapping,
  type ValueChoice,
  type ValueMap,
  assignColumn,
  groupChoices,
  groupValues,
  isTooManyValues,
  mappedColumns,
  resolveValueMap,
  suggestDateColumn,
  suggestMapping,
  suggestValueMap,
  targetsOf,
  valueGroups,
  valueMapsByTarget,
} from "./import-mapping";
import {
  type BuiltRow,
  batchesOf,
  buildRows,
  groupProblems,
  summarizeRows,
} from "./import-rows";
import type { ImportSheet } from "./import-sheet";
import type { SubmittedValues } from "./use-form-submission";

export type ImportStep =
  | "file"
  | "columns"
  | "values"
  | "review"
  | "running"
  | "done";

/** Los elementos de un listado, a medida que se leen. */
export interface CatalogEntries {
  choices: ValueChoice[];
  /** Si ya se leyeron todos: antes, una relación sin coincidencia puede ser
   *  sólo una que no ha llegado. */
  complete: boolean;
}

export interface ImportForm {
  _id: Id<"forms">;
  kind: FormKind;
  name: string;
  titleFieldId?: string;
}

interface ImportFile {
  name: string;
  fingerprint: string;
  sheet: ImportSheet;
}

export interface ImportOutcome {
  counts: ImportCounts;
  /** Las filas que el servidor dejó fuera, con su motivo. */
  problems: { row: number; message: string }[];
  /** Si se interrumpió antes de terminar. */
  interrupted: boolean;
}

const EMPTY_COUNTS: ImportCounts = {
  total: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  rejected: 0,
};

/**
 * El estado de una importación, de elegir el archivo a escribir sus lotes
 * (`docs/plans/2026-10-10-importacion-de-registros-design.md §1`).
 *
 * Todo lo que decide algo es una función pura de `import-*.ts`: aquí sólo se
 * guarda lo que quien importa eligió y se encadenan las llamadas.
 */
export function useImportWizard(
  form: ImportForm,
  sections: readonly FormSection[],
) {
  const [step, setStep] = useState<ImportStep>("file");
  const [file, setFile] = useState<ImportFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [dateColumn, setDateColumn] = useState<number | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [overrides, setOverrides] = useState<Record<string, ValueMap>>({});
  const [catalogs, setCatalogs] = useState<Record<string, CatalogEntries>>({});
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  const { mutate: start } = useStartImport();
  const { mutate: writeBatch } = useWriteImportBatch();
  const { mutate: finish } = useFinishImport();

  const isRecord = form.kind === "record";
  const targets = useMemo(() => targetsOf(sections), [sections]);
  const mapped = useMemo(
    () => mappedColumns(mapping, targets),
    [mapping, targets],
  );
  const groups = useMemo(() => valueGroups(mapped), [mapped]);

  /** Cada grupo con sus valores, sus opciones y su correspondencia. */
  const groupStates = useMemo(() => {
    const rows = file?.sheet.rows ?? [];
    return groups.map((group) => {
      const values = groupValues(rows, group);
      const entries = group.catalogId ? catalogs[group.catalogId] : undefined;
      const choices = group.catalogId
        ? (entries?.choices ?? [])
        : groupChoices(group);
      const suggested = suggestValueMap(values, choices);
      const map = resolveValueMap(suggested, overrides[group.key]);
      return {
        group,
        // Lo que la plataforma no supo asignar va arriba: es lo que hay que
        // mirar. El orden sale de lo propuesto, no de lo corregido, para que
        // una fila no salte al asignarla.
        values: [
          ...values.filter((value) => suggested[value.key] === undefined),
          ...values.filter((value) => suggested[value.key] !== undefined),
        ],
        choices,
        map,
        isLoading: group.catalogId !== null && entries?.complete !== true,
        tooMany: isTooManyValues(values),
        unmatched: values.filter((value) => map[value.key] === undefined)
          .length,
      };
    });
  }, [groups, file, catalogs, overrides]);

  const titleMapped =
    isRecord ||
    !form.titleFieldId ||
    mapped.some((entry) => entry.target.key === form.titleFieldId);
  const columnsProblem = !file
    ? null
    : mapped.length === 0
      ? "Asigna al menos una columna."
      : isRecord && dateColumn === null
        ? "Elige la columna que trae la fecha del hecho."
        : !titleMapped
          ? "Asigna la columna que titula cada elemento: sin ella no se sabe cuál es cuál."
          : null;

  // Revisar cinco mil filas no es gratis: sólo se hace al llegar al paso.
  const isReviewing = step === "review" || step === "running";
  const built = useMemo<BuiltRow[]>(() => {
    if (!file || !isReviewing) return [];
    return buildRows(
      file.sheet,
      {
        kind: form.kind,
        sections,
        titleFieldId: form.titleFieldId,
        dateColumn,
        mapping,
        valueMaps: valueMapsByTarget(
          groups,
          Object.fromEntries(
            groupStates.map((state) => [state.group.key, state.map]),
          ),
        ),
      },
      todayInColombia(Date.now()),
    );
  }, [
    file,
    isReviewing,
    form.kind,
    form.titleFieldId,
    sections,
    dateColumn,
    mapping,
    groups,
    groupStates,
  ]);
  const summary = useMemo(() => summarizeRows(built), [built]);
  const problems = useMemo(() => groupProblems(built), [built]);

  const reset = () => {
    setStep("file");
    setFile(null);
    setFileError(null);
    setIsReading(false);
    setDateColumn(null);
    setMapping({});
    setOverrides({});
    setCatalogs({});
    setMode("skip");
    setOutcome(null);
  };

  const chooseFile = async (chosen: File) => {
    const before = fileProblem(chosen);
    if (before) {
      setFileError(before);
      return;
    }
    setIsReading(true);
    setFileError(null);
    try {
      const [sheet, fingerprint] = await Promise.all([
        readImportFile(chosen),
        fingerprintOf(chosen),
      ]);
      const after = sheetProblem(sheet);
      if (after) {
        setFileError(after);
        return;
      }
      setFile({ name: chosen.name, fingerprint, sheet });
      setMapping(suggestMapping(sheet.headers, targets));
      setDateColumn(isRecord ? suggestDateColumn(sheet.headers) : null);
      setOverrides({});
    } catch {
      setFileError(
        "No se pudo leer el archivo. Comprueba que no esté dañado ni protegido con contraseña.",
      );
    } finally {
      setIsReading(false);
    }
  };

  const setColumn = (column: number, targetKey: string | null) =>
    setMapping((current) => assignColumn(current, column, targetKey));

  /** `choice` vacío deja el valor sin correspondencia. */
  const setValueChoice = (groupKey: string, valueKey: string, choice: string) =>
    setOverrides((current) => ({
      ...current,
      [groupKey]: { ...current[groupKey], [valueKey]: choice },
    }));

  const setCatalogEntries = (catalogId: string, entries: CatalogEntries) =>
    setCatalogs((current) => ({ ...current, [catalogId]: entries }));

  const STEPS: ImportStep[] = ["file", "columns", "values", "review"];
  const skipsValues = groups.length === 0;
  const move = (direction: 1 | -1) => {
    let index = STEPS.indexOf(step) + direction;
    if (STEPS[index] === "values" && skipsValues) index += direction;
    const next = STEPS[index];
    if (next) setStep(next);
  };

  const canContinue =
    step === "file"
      ? file !== null && !isReading
      : step === "columns"
        ? columnsProblem === null
        : step === "values"
          ? !groupStates.some((state) => state.isLoading)
          : step === "review"
            ? summary.ready > 0
            : false;

  /** Escribe las filas que entran, lote a lote. Si un lote falla, lo ya
   *  escrito se queda: la importación sale «sin terminar» y se puede
   *  deshacer. */
  const run = async () => {
    if (!file || summary.ready === 0) return;
    const ready = built.filter((row) => row.problems.length === 0);
    let counts: ImportCounts = { ...EMPTY_COUNTS, total: ready.length };
    const rejected: ImportOutcome["problems"] = [];
    setOutcome({ counts, problems: rejected, interrupted: false });
    setStep("running");

    try {
      const importId = await start(
        {
          formId: form._id,
          fileName: file.name,
          fingerprint: file.fingerprint,
          mode: isRecord ? "add" : mode,
          total: ready.length,
        },
        { throwError: true },
      );
      if (!importId) throw new Error("La importación no empezó");

      for (const batch of batchesOf(ready, IMPORT_LIMITS.batchSize)) {
        const result = await writeBatch(
          {
            importId,
            rows: batch.map((row) => ({
              row: row.line,
              ...(row.date ? { date: row.date } : {}),
              // Los ids de una relación salieron de los títulos del listado:
              // son de verdad, y el servidor comprueba cada uno.
              values: row.values as SubmittedValues,
            })),
          },
          { throwError: true },
        );
        if (!result) throw new Error("El lote no se escribió");
        counts = result.counts;
        rejected.push(...result.problems);
        setOutcome({ counts, problems: [...rejected], interrupted: false });
      }

      await finish({ importId }, { throwError: true });
      setOutcome({ counts, problems: rejected, interrupted: false });
    } catch (error) {
      handleConvexErrorCallback(error);
      setOutcome({ counts, problems: rejected, interrupted: true });
    } finally {
      setStep("done");
    }
  };

  return {
    step,
    isRecord,
    file,
    fileError,
    isReading,
    chooseFile,
    targets,
    mapped,
    mapping,
    setColumn,
    dateColumn,
    setDateColumn,
    columnsProblem,
    groupStates,
    setValueChoice,
    setCatalogEntries,
    mode,
    setMode,
    summary,
    problems,
    canContinue,
    back: () => move(-1),
    next: () => move(1),
    run,
    outcome,
    reset,
  };
}

export type ImportWizard = ReturnType<typeof useImportWizard>;
