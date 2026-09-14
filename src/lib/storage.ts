import { CURRENT_VERSION, DEFAULT_SETTINGS, emptyData } from './types';
import type { AppData } from './types';

export const STORAGE_KEY = 'rtg-app-data-v1';

/** Fängt Quota- und Privacy-Mode-Fehler ab, damit die App nie hart abstürzt. */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadData(): AppData {
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export function saveData(data: AppData): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    const quotaExceeded =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return {
      ok: false,
      error: quotaExceeded
        ? 'Speicher voll. Exportiere ein Backup und lösche alte Einträge.'
        : 'Speichern fehlgeschlagen. Läuft der Browser im privaten Modus?',
    };
  }
}

/**
 * Bringt beliebige (auch importierte oder ältere) Daten auf die aktuelle Form.
 * Fehlende Felder werden ergänzt, unbekannte Felder bleiben unangetastet.
 */
export function migrate(input: unknown): AppData {
  const base = emptyData();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Partial<AppData>;
  const arr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

  return {
    version: CURRENT_VERSION,
    templates: arr(raw.templates),
    sessions: arr(raw.sessions),
    micros: arr(raw.micros),
    microEntries: arr(raw.microEntries),
    tests: arr(raw.tests),
    testResults: arr(raw.testResults),
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
  };
}
