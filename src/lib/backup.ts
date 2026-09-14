import { migrate } from './storage';
import { getState, replaceAll } from './store';
import { toISODate } from './date';
import type { AppData } from './types';

/** Lädt die kompletten Daten als JSON-Datei herunter. */
export function exportBackup(): void {
  const json = JSON.stringify(getState(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rtg-backup-${toISODate()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Nicht sofort widerrufen - Safari braucht den Blob noch einen Moment.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export type ImportResult =
  | { ok: true; data: AppData }
  | { ok: false; error: string };

/** Liest eine Backup-Datei ein und ersetzt die aktuellen Daten. */
export async function importBackup(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Die Datei enthält keine gültigen Daten.' };
    }
    const data = migrate(parsed);
    replaceAll(data);
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Datei konnte nicht gelesen werden. Ist es ein RTG-Backup?' };
  }
}

/** Kurze Beschreibung des Datenbestands für die Einstellungen. */
export function dataSummary(data: AppData): string {
  const bytes = new Blob([JSON.stringify(data)]).size;
  const size = bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
  return `${data.sessions.length} Workouts · ${data.microEntries.length} Mikro-Einträge · ${size}`;
}
