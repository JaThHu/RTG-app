/** Datums-Helfer. Alles rechnet in lokaler Zeit - der Nutzer trainiert nicht in UTC. */

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_LONG = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
];

/** YYYY-MM-DD in lokaler Zeit (nicht toISOString - das wäre UTC). */
export function toISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate();
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** 1 = Montag ... 7 = Sonntag (ISO-Zählung, nicht getDay()). */
export function isoWeekday(date: Date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeek(date: Date = new Date(), weekStart: 1 | 7 = 1): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const diff = weekStart === 1 ? isoWeekday(copy) - 1 : copy.getDay();
  return addDays(copy, -diff);
}

/** Ganze Kalendertage zwischen zwei ISO-Daten (b - a). */
export function daysBetween(aISO: string, bISO: string): number {
  const a = fromISODate(aISO).getTime();
  const b = fromISODate(bISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  return fromISODate(iso).toLocaleDateString('de-CH', { day: '2-digit', month: 'short' });
}

/** "Heute" / "Gestern" / "Mo, 14. Sep." */
export function formatRelativeDay(iso: string): string {
  const diff = daysBetween(iso, todayISO());
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (diff === -1) return 'Morgen';
  const date = fromISODate(iso);
  return date.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: 'short' });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

/** Sekunden als mm:ss bzw. h:mm:ss. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Kompakte Dauer für Listen: "48 Min." / "1 h 12" */
export function formatDurationShort(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} Min.`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}
