import { addDays, startOfWeek, toISODate, todayISO } from './date';
import type { AppData, MicroEntry, Session, SessionExercise, StandardTest, TestResult } from './types';

/* ------------------------------------------------------------------ Sessions */

export function isFinished(session: Session): boolean {
  return typeof session.finishedAt === 'number';
}

export function finishedSessions(data: AppData): Session[] {
  return data.sessions.filter(isFinished).sort((a, b) => b.startedAt - a.startedAt);
}

export function activeSession(data: AppData): Session | undefined {
  return data.sessions.find((s) => !isFinished(s));
}

export function sessionDurationSeconds(session: Session): number {
  const end = session.finishedAt ?? Date.now();
  return Math.max(0, (end - session.startedAt) / 1000);
}

export function doneSets(session: Session): number {
  return session.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.done).length, 0);
}

export function totalSets(session: Session): number {
  return session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

/** Summe aller Wiederholungen abgehakter Sätze. */
export function sessionReps(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.done).reduce((n, s) => n + (s.reps ?? 0), 0),
    0,
  );
}

/** Hebe-Volumen in kg (Gewicht x Wiederholungen) über alle abgehakten Sätze. */
export function sessionVolume(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter((s) => s.done)
        .reduce((n, s) => n + (s.weight ?? 0) * (s.reps ?? 0), 0),
    0,
  );
}

/** Zurückgelegte Distanz in Metern über alle abgehakten Sätze. */
export function sessionDistance(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.done).reduce((n, s) => n + (s.meters ?? 0), 0),
    0,
  );
}

/* ------------------------------------------------------------------- Mikro */

/** Summe einer Mikro-Übung an einem Tag. */
export function microTotal(entries: MicroEntry[], microId: string, date: string): number {
  return entries.reduce((sum, e) => (e.microId === microId && e.date === date ? sum + e.amount : sum), 0);
}

/** Map Datum -> Summe für eine Mikro-Übung. */
export function microTotalsByDate(entries: MicroEntry[], microId: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (entry.microId !== microId) continue;
    map.set(entry.date, (map.get(entry.date) ?? 0) + entry.amount);
  }
  return map;
}

/** Summe aller Mikro-Übungen an einem Tag. */
export function microTotalAll(entries: MicroEntry[], date: string): number {
  return entries.reduce((sum, e) => (e.date === date ? sum + e.amount : sum), 0);
}

/* ------------------------------------------------------------------ Streaks */

/** Tage mit abgeschlossenem Workout oder mindestens einer Mikro-Erfassung. */
export function activeDays(data: AppData): Set<string> {
  const days = new Set<string>();
  for (const session of data.sessions) {
    if (isFinished(session)) days.add(toISODate(new Date(session.startedAt)));
  }
  for (const entry of data.microEntries) days.add(entry.date);
  return days;
}

/**
 * Länge der aktuellen Serie. Ein noch leerer heutiger Tag bricht die Serie
 * nicht ab - gezählt wird ab gestern, heute zählt als Bonus.
 */
export function currentStreak(days: Set<string>): number {
  const today = new Date();
  let streak = 0;
  const startOffset = days.has(toISODate(today)) ? 0 : 1;
  for (let i = startOffset; i < 400; i++) {
    if (!days.has(toISODate(addDays(today, -i)))) break;
    streak++;
  }
  return streak;
}

export function longestStreak(days: Set<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    if (previous !== null) {
      const gap = Math.round(
        (new Date(`${day}T00:00`).getTime() - new Date(`${previous}T00:00`).getTime()) / 86_400_000,
      );
      run = gap === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

/* ------------------------------------------------------------------- Wochen */

export interface WeekBucket {
  /** ISO-Datum des Wochenstarts. */
  start: string;
  label: string;
  sessions: number;
  sets: number;
  volume: number;
  micro: number;
  seconds: number;
}

export function weeklyBuckets(data: AppData, weeks: number): WeekBucket[] {
  const weekStart = data.settings.weekStart;
  const thisWeek = startOfWeek(new Date(), weekStart);
  const buckets: WeekBucket[] = [];
  const index = new Map<string, WeekBucket>();

  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    const startISO = toISODate(start);
    const bucket: WeekBucket = {
      start: startISO,
      label: `${start.getDate()}.${start.getMonth() + 1}.`,
      sessions: 0,
      sets: 0,
      volume: 0,
      micro: 0,
      seconds: 0,
    };
    buckets.push(bucket);
    index.set(startISO, bucket);
  }

  for (const session of data.sessions) {
    if (!isFinished(session)) continue;
    const key = toISODate(startOfWeek(new Date(session.startedAt), weekStart));
    const bucket = index.get(key);
    if (!bucket) continue;
    bucket.sessions++;
    bucket.sets += doneSets(session);
    bucket.volume += sessionVolume(session);
    bucket.seconds += sessionDurationSeconds(session);
  }

  for (const entry of data.microEntries) {
    const key = toISODate(startOfWeek(new Date(`${entry.date}T00:00`), weekStart));
    const bucket = index.get(key);
    if (bucket) bucket.micro += entry.amount;
  }

  return buckets;
}

/* ---------------------------------------------------------------- Bestwerte */

export interface PersonalRecord {
  name: string;
  kind: SessionExercise['kind'];
  /** Bester Einzelsatz - Bedeutung hängt von der Art der Übung ab. */
  best: number;
  /** Gewicht des besten Satzes (nur bei 'weighted'). */
  bestWeight?: number;
  bestReps?: number;
  date: string;
  /** Geschätztes 1RM nach Epley (nur bei 'weighted'). */
  estimatedOneRm?: number;
}

/** Bester Satz je Übungsname über alle abgeschlossenen Workouts. */
export function personalRecords(data: AppData): PersonalRecord[] {
  const records = new Map<string, PersonalRecord>();

  for (const session of data.sessions) {
    if (!isFinished(session)) continue;
    const date = toISODate(new Date(session.startedAt));
    for (const exercise of session.exercises) {
      const key = `${exercise.name.toLowerCase()}|${exercise.kind}`;
      for (const set of exercise.sets) {
        if (!set.done) continue;
        const score = scoreOf(exercise.kind, set);
        if (score === null) continue;
        const existing = records.get(key);
        if (existing && existing.best >= score) continue;
        records.set(key, {
          name: exercise.name,
          kind: exercise.kind,
          best: score,
          bestWeight: set.weight,
          bestReps: set.reps,
          date,
          estimatedOneRm:
            exercise.kind === 'weighted' && set.weight && set.reps
              ? Math.round(set.weight * (1 + set.reps / 30))
              : undefined,
        });
      }
    }
  }

  return [...records.values()].sort((a, b) => a.name.localeCompare(b.name, 'de-CH'));
}

/** Vergleichswert eines Satzes - bei 'weighted' das Satzvolumen. */
function scoreOf(kind: SessionExercise['kind'], set: { reps?: number; weight?: number; seconds?: number; meters?: number }): number | null {
  switch (kind) {
    case 'reps':
      return set.reps ?? null;
    case 'weighted':
      return set.weight && set.reps ? set.weight * set.reps : null;
    case 'time':
      return set.seconds ?? null;
    case 'distance':
      return set.meters ?? null;
  }
}

/** Letzte absolvierte Sätze einer Übung - Referenz während des Workouts. */
export function lastPerformance(
  data: AppData,
  exerciseName: string,
  excludeSessionId?: string,
): { date: string; sets: SessionExercise['sets'] } | undefined {
  const needle = exerciseName.toLowerCase();
  const candidates = data.sessions
    .filter((s) => isFinished(s) && s.id !== excludeSessionId)
    .sort((a, b) => b.startedAt - a.startedAt);
  for (const session of candidates) {
    const match = session.exercises.find((ex) => ex.name.toLowerCase() === needle);
    const done = match?.sets.filter((s) => s.done) ?? [];
    if (done.length > 0) return { date: toISODate(new Date(session.startedAt)), sets: done };
  }
  return undefined;
}

/* -------------------------------------------------------------------- Tests */

export interface TestProgress {
  test: StandardTest;
  latest?: TestResult;
  best?: TestResult;
  history: TestResult[];
  /** 0..1 - wie nah der beste Wert am Ziel ist. */
  ratio: number;
  reached: boolean;
}

export function testProgress(data: AppData): TestProgress[] {
  return [...data.tests]
    .sort((a, b) => a.order - b.order)
    .map((test) => {
      const history = data.testResults
        .filter((r) => r.testId === test.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      const latest = history[history.length - 1];
      const best = history.reduce<TestResult | undefined>((acc, r) => {
        if (!acc) return r;
        return (test.higherIsBetter ? r.value > acc.value : r.value < acc.value) ? r : acc;
      }, undefined);

      let ratio = 0;
      if (best && test.goal > 0) {
        ratio = test.higherIsBetter ? best.value / test.goal : test.goal / Math.max(best.value, 0.0001);
      }
      return {
        test,
        latest,
        best,
        history,
        ratio: Math.max(0, Math.min(1, ratio)),
        reached: Boolean(best) && ratio >= 1,
      };
    });
}

/* ------------------------------------------------------------------ Übersicht */

export interface Summary {
  totalSessions: number;
  sessionsThisWeek: number;
  microToday: number;
  streak: number;
  longest: number;
}

export function summary(data: AppData): Summary {
  const days = activeDays(data);
  const weekStartISO = toISODate(startOfWeek(new Date(), data.settings.weekStart));
  const finished = data.sessions.filter(isFinished);
  return {
    totalSessions: finished.length,
    sessionsThisWeek: finished.filter((s) => toISODate(new Date(s.startedAt)) >= weekStartISO).length,
    microToday: microTotalAll(data.microEntries, todayISO()),
    streak: currentStreak(days),
    longest: longestStreak(days),
  };
}
