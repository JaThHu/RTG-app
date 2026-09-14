import { useSyncExternalStore } from 'react';
import { loadData, saveData } from './storage';
import type { AppData } from './types';

/**
 * Minimaler globaler Store: ein Objekt, ein Listener-Set, Persistenz nach jedem
 * Update. Bewusst ohne externe State-Library - die App hat genau einen Nutzer
 * und ein paar Kilobyte Daten.
 */

let state: AppData = loadData();
const listeners = new Set<() => void>();

/** Letzter Speicherfehler (z.B. Quota voll), damit die UI ihn anzeigen kann. */
let lastError: string | null = null;
const errorListeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function emitError() {
  for (const listener of errorListeners) listener();
}

export function getState(): AppData {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Ersetzt den State und persistiert ihn. */
export function update(recipe: (draft: AppData) => AppData): void {
  state = recipe(state);
  const result = saveData(state);
  const nextError = result.ok ? null : result.error;
  if (nextError !== lastError) {
    lastError = nextError;
    emitError();
  }
  emit();
}

/** Überschreibt alle Daten (Import / Zurücksetzen). */
export function replaceAll(data: AppData): void {
  update(() => data);
}

export function useStore<T>(selector: (data: AppData) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

/** Kompletter State - für Seiten, die ohnehin fast alles brauchen. */
export function useData(): AppData {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useStorageError(): string | null {
  return useSyncExternalStore(
    (listener) => {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
    () => lastError,
    () => lastError,
  );
}

export function dismissStorageError(): void {
  if (lastError === null) return;
  lastError = null;
  emitError();
}

/** Änderungen aus einem anderen Tab übernehmen. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => {
    state = loadData();
    emit();
  });
}
