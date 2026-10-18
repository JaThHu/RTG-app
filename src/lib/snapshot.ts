import { getState, subscribe } from './store';
import { toISODate } from './date';
import { isFinished, microTotal, plannedDays } from './stats';
import type { AppData } from './types';

/**
 * Spiegelt, was der Service Worker für Erinnerungstexte braucht, in den Cache
 * Storage - an localStorage kommt er nicht heran. So kann eine Push-Nachricht
 * "Liegestützen: noch 30" sagen, auch wenn sie bei geschlossener App ankommt.
 *
 * Name und Pfad müssen mit public/sw.js übereinstimmen.
 */
const STATE_CACHE = 'rtg-state';
const STATE_PATH = '__rtg-state.json';

export interface StateSnapshot {
  /** Lokales Datum, auf das sich `trainedToday` und die Mikro-Summen beziehen. */
  date: string;
  trainedToday: boolean;
  /** Wochentag ("1" = Montag) -> Namen der geplanten Workouts. */
  plan: Record<string, string[]>;
  micros: { name: string; icon: string; unit: 'reps' | 'seconds'; goal: number; total: number }[];
  /** Damit der Service Worker merkt, wenn eine Erinnerung inzwischen abgeschaltet ist. */
  remindWorkout: boolean;
  remindMicro: boolean;
}

export function buildSnapshot(data: AppData, now = new Date()): StateSnapshot {
  const date = toISODate(now);
  return {
    date,
    trainedToday: data.sessions.some((s) => isFinished(s) && toISODate(new Date(s.startedAt)) === date),
    plan: plannedDays(data),
    micros: data.micros
      .filter((m) => !m.archived)
      .map((m) => ({
        name: m.name,
        icon: m.icon,
        unit: m.unit,
        goal: m.dailyGoal,
        total: microTotal(data.microEntries, m.id, date),
      })),
    remindWorkout: data.settings.remindWorkout,
    remindMicro: data.settings.remindMicro,
  };
}

async function writeSnapshot(): Promise<void> {
  try {
    const cache = await caches.open(STATE_CACHE);
    await cache.put(
      `${import.meta.env.BASE_URL}${STATE_PATH}`,
      new Response(JSON.stringify(buildSnapshot(getState())), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  } catch {
    /* Private Mode o.ä. - die Erinnerung kommt dann mit Standardtext */
  }
}

/** Hält den Snapshot aktuell: nach jeder Änderung und beim Verlassen der App. */
export function startSnapshotSync(): void {
  if (typeof caches === 'undefined') return;
  let timeout: number | undefined;
  subscribe(() => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => void writeSnapshot(), 400);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void writeSnapshot();
  });
  void writeSnapshot();
}
