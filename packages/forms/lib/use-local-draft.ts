"use client";

import type { FormSection, FormValues } from "@/convex/lib/form_types";
import { useEffect, useRef, useState } from "react";

import {
  browserStorage,
  clearDraft,
  type DraftScope,
  draftKey,
  type LocalDraft,
  readDraft,
  writeDraft,
} from "./local-draft";

/** Cuánto se espera tras la última tecla para guardar: escribir en
 *  `localStorage` en cada pulsación bloquearía el hilo en un teléfono lento. */
const SAVE_DELAY_MS = 400;

interface LocalDraftOptions {
  /** Qué se está diligenciando. `null` mientras no se sabe —cargando—: no se
   *  lee ni se escribe nada. */
  scope: DraftScope | null;
  sections: readonly FormSection[] | undefined;
  values: FormValues;
  /** Pone en el formulario lo recuperado. Se llama una vez, al abrir. */
  onRestore: (values: FormValues) => void;
}

export interface LocalDraftState {
  /** El borrador que se recuperó al abrir, para la franja; `null` si no
   *  había o si ya se descartó. */
  recovered: LocalDraft | null;
  /** «Empezar de cero»: borra lo guardado y olvida la franja. Quien llama
   *  vacía el formulario. */
  discard: () => void;
  /** Tras enviar: borra lo guardado y deja de guardar. */
  clear: () => void;
}

/**
 * El borrador local de un formato a medio diligenciar (decisiones §4): lo
 * escrito se guarda en el dispositivo mientras no se envíe, y al volver se
 * recupera. La lógica —qué se guarda, con qué clave, cuándo caduca— es de
 * `local-draft.ts`; aquí sólo se decide **cuándo** leer y escribir.
 *
 * Nunca rompe: sin `localStorage` —modo privado, almacenamiento lleno o
 * negado— el formulario funciona igual y simplemente no hay borrador.
 */
export function useLocalDraft({
  scope,
  sections,
  values,
  onRestore,
}: LocalDraftOptions): LocalDraftState {
  const [recovered, setRecovered] = useState<LocalDraft | null>(null);
  // La clave ya leída: se lee una vez por formato y versión, y no se escribe
  // antes de haber leído —se pisaría el borrador que se iba a recuperar—.
  const [readKey, setReadKey] = useState<string | null>(null);
  const stopped = useRef(false);
  const restore = useRef(onRestore);
  restore.current = onRestore;

  const key = scope ? draftKey(scope) : null;
  const hasSections = sections !== undefined;

  useEffect(() => {
    if (!scope || !key || !hasSections || readKey === key) return;
    const draft = readDraft(browserStorage(), scope, Date.now());
    if (draft) {
      restore.current(draft.values);
      setRecovered(draft);
    }
    setReadKey(key);
  }, [scope, key, hasSections, readKey]);

  useEffect(() => {
    if (!scope || !sections || readKey !== key || stopped.current) return;
    const wait = window.setTimeout(() => {
      if (!stopped.current) {
        writeDraft(browserStorage(), scope, sections, values, Date.now());
      }
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(wait);
  }, [scope, sections, values, readKey, key]);

  return {
    recovered,
    discard: () => {
      if (scope) clearDraft(browserStorage(), scope);
      setRecovered(null);
    },
    clear: () => {
      stopped.current = true;
      if (scope) clearDraft(browserStorage(), scope);
    },
  };
}
