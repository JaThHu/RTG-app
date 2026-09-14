import { getState, update } from './store';
import { uid } from './id';
import { todayISO } from './date';
import type {
  ExerciseKind,
  MicroExercise,
  PlanExercise,
  Session,
  SessionExercise,
  SessionSet,
  Settings,
  StandardTest,
  WorkoutTemplate,
} from './types';

export const ACCENTS = [
  '#4fd67f',
  '#5aa9e6',
  '#f5b544',
  '#ef6f6f',
  '#b98cf0',
  '#3fd2c7',
  '#f08bb4',
  '#9bb33f',
];

export function nextAccent(usedCount: number): string {
  return ACCENTS[usedCount % ACCENTS.length] ?? ACCENTS[0]!;
}

/* ---------------------------------------------------------------- Vorlagen */

export function createTemplate(name: string): WorkoutTemplate {
  const template: WorkoutTemplate = {
    id: uid(),
    name: name.trim() || 'Neues Workout',
    accent: nextAccent(getState().templates.length),
    weekdays: [],
    exercises: [],
    createdAt: Date.now(),
  };
  update((data) => ({ ...data, templates: [...data.templates, template] }));
  return template;
}

export function updateTemplate(id: string, patch: Partial<WorkoutTemplate>): void {
  update((data) => ({
    ...data,
    templates: data.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }));
}

export function deleteTemplate(id: string): void {
  update((data) => ({ ...data, templates: data.templates.filter((t) => t.id !== id) }));
}

export function duplicateTemplate(id: string): WorkoutTemplate | undefined {
  const source = getState().templates.find((t) => t.id === id);
  if (!source) return undefined;
  const copy: WorkoutTemplate = {
    ...source,
    id: uid(),
    name: `${source.name} (Kopie)`,
    weekdays: [],
    createdAt: Date.now(),
    exercises: source.exercises.map((ex) => ({ ...ex, id: uid() })),
  };
  update((data) => ({ ...data, templates: [...data.templates, copy] }));
  return copy;
}

export function addPlanExercise(templateId: string, exercise: Omit<PlanExercise, 'id'>): void {
  const withId: PlanExercise = { ...exercise, id: uid() };
  update((data) => ({
    ...data,
    templates: data.templates.map((t) =>
      t.id === templateId ? { ...t, exercises: [...t.exercises, withId] } : t,
    ),
  }));
}

export function updatePlanExercise(
  templateId: string,
  exerciseId: string,
  patch: Partial<PlanExercise>,
): void {
  update((data) => ({
    ...data,
    templates: data.templates.map((t) =>
      t.id === templateId
        ? {
            ...t,
            exercises: t.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, ...patch } : ex)),
          }
        : t,
    ),
  }));
}

export function deletePlanExercise(templateId: string, exerciseId: string): void {
  update((data) => ({
    ...data,
    templates: data.templates.map((t) =>
      t.id === templateId ? { ...t, exercises: t.exercises.filter((ex) => ex.id !== exerciseId) } : t,
    ),
  }));
}

/** Verschiebt eine Übung um `delta` Positionen (-1 hoch, +1 runter). */
export function movePlanExercise(templateId: string, exerciseId: string, delta: number): void {
  update((data) => ({
    ...data,
    templates: data.templates.map((t) => {
      if (t.id !== templateId) return t;
      const index = t.exercises.findIndex((ex) => ex.id === exerciseId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= t.exercises.length) return t;
      const exercises = [...t.exercises];
      const [moved] = exercises.splice(index, 1);
      exercises.splice(target, 0, moved!);
      return { ...t, exercises };
    }),
  }));
}

/* ---------------------------------------------------------------- Sessions */

function emptySet(): SessionSet {
  return { done: false };
}

/** Startet ein Workout aus einer Vorlage (oder leer) und gibt die Session zurück. */
export function startSession(template?: WorkoutTemplate): Session {
  const session: Session = {
    id: uid(),
    templateId: template?.id,
    name: template?.name ?? 'Freies Workout',
    accent: template?.accent ?? ACCENTS[0]!,
    startedAt: Date.now(),
    exercises: (template?.exercises ?? []).map<SessionExercise>((ex) => ({
      id: uid(),
      planExerciseId: ex.id,
      name: ex.name,
      kind: ex.kind,
      targetValue: ex.targetValue,
      targetWeight: ex.targetWeight,
      restSeconds: ex.restSeconds,
      note: ex.note,
      sets: Array.from({ length: Math.max(1, ex.sets) }, emptySet),
    })),
  };
  update((data) => ({ ...data, sessions: [session, ...data.sessions] }));
  return session;
}

export function updateSession(id: string, patch: Partial<Session>): void {
  update((data) => ({
    ...data,
    sessions: data.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  }));
}

export function deleteSession(id: string): void {
  update((data) => ({ ...data, sessions: data.sessions.filter((s) => s.id !== id) }));
}

export function updateSessionSet(
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  patch: Partial<SessionSet>,
): void {
  update((data) => ({
    ...data,
    sessions: data.sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            exercises: s.exercises.map((ex) =>
              ex.id === exerciseId
                ? { ...ex, sets: ex.sets.map((set, i) => (i === setIndex ? { ...set, ...patch } : set)) }
                : ex,
            ),
          }
        : s,
    ),
  }));
}

export function addSessionSet(sessionId: string, exerciseId: string): void {
  update((data) => ({
    ...data,
    sessions: data.sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            exercises: s.exercises.map((ex) =>
              ex.id === exerciseId ? { ...ex, sets: [...ex.sets, emptySet()] } : ex,
            ),
          }
        : s,
    ),
  }));
}

export function removeSessionSet(sessionId: string, exerciseId: string, setIndex: number): void {
  update((data) => ({
    ...data,
    sessions: data.sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            exercises: s.exercises.map((ex) =>
              ex.id === exerciseId
                ? { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) }
                : ex,
            ),
          }
        : s,
    ),
  }));
}

/** Hängt eine Übung spontan an ein laufendes Workout an. */
export function addSessionExercise(
  sessionId: string,
  input: { name: string; kind: ExerciseKind; sets: number; targetValue?: number; targetWeight?: number; restSeconds?: number },
): void {
  const exercise: SessionExercise = {
    id: uid(),
    name: input.name,
    kind: input.kind,
    targetValue: input.targetValue,
    targetWeight: input.targetWeight,
    restSeconds: input.restSeconds,
    sets: Array.from({ length: Math.max(1, input.sets) }, emptySet),
  };
  update((data) => ({
    ...data,
    sessions: data.sessions.map((s) =>
      s.id === sessionId ? { ...s, exercises: [...s.exercises, exercise] } : s,
    ),
  }));
}

export function removeSessionExercise(sessionId: string, exerciseId: string): void {
  update((data) => ({
    ...data,
    sessions: data.sessions.map((s) =>
      s.id === sessionId ? { ...s, exercises: s.exercises.filter((ex) => ex.id !== exerciseId) } : s,
    ),
  }));
}

export function finishSession(id: string, patch?: Partial<Session>): void {
  updateSession(id, { ...patch, finishedAt: Date.now() });
}

/* ------------------------------------------------------------ Mikro-Übungen */

export function createMicro(input: Omit<MicroExercise, 'id' | 'createdAt'>): MicroExercise {
  const micro: MicroExercise = { ...input, id: uid(), createdAt: Date.now() };
  update((data) => ({ ...data, micros: [...data.micros, micro] }));
  return micro;
}

export function updateMicro(id: string, patch: Partial<MicroExercise>): void {
  update((data) => ({
    ...data,
    micros: data.micros.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  }));
}

/** Löscht die Mikro-Übung samt allen Einträgen. */
export function deleteMicro(id: string): void {
  update((data) => ({
    ...data,
    micros: data.micros.filter((m) => m.id !== id),
    microEntries: data.microEntries.filter((e) => e.microId !== id),
  }));
}

export function logMicro(microId: string, amount: number, date = todayISO()): void {
  if (!Number.isFinite(amount) || amount === 0) return;
  const entry = { id: uid(), microId, date, at: Date.now(), amount };
  update((data) => ({ ...data, microEntries: [entry, ...data.microEntries] }));
}

export function deleteMicroEntry(id: string): void {
  update((data) => ({ ...data, microEntries: data.microEntries.filter((e) => e.id !== id) }));
}

/** Nimmt die letzte Erfassung einer Mikro-Übung an einem Tag zurück. */
export function undoLastMicro(microId: string, date = todayISO()): void {
  const latest = getState()
    .microEntries.filter((e) => e.microId === microId && e.date === date)
    .sort((a, b) => b.at - a.at)[0];
  if (latest) deleteMicroEntry(latest.id);
}

/* ------------------------------------------------------------------- Tests */

export function createTest(input: Omit<StandardTest, 'id' | 'order'>): StandardTest {
  const test: StandardTest = { ...input, id: uid(), order: getState().tests.length };
  update((data) => ({ ...data, tests: [...data.tests, test] }));
  return test;
}

export function updateTest(id: string, patch: Partial<StandardTest>): void {
  update((data) => ({
    ...data,
    tests: data.tests.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }));
}

export function deleteTest(id: string): void {
  update((data) => ({
    ...data,
    tests: data.tests.filter((t) => t.id !== id),
    testResults: data.testResults.filter((r) => r.testId !== id),
  }));
}

export function logTestResult(testId: string, value: number, date = todayISO(), note?: string): void {
  const result = { id: uid(), testId, value, date, note };
  update((data) => ({ ...data, testResults: [result, ...data.testResults] }));
}

export function deleteTestResult(id: string): void {
  update((data) => ({ ...data, testResults: data.testResults.filter((r) => r.id !== id) }));
}

/* -------------------------------------------------------------- Einstellungen */

export function updateSettings(patch: Partial<Settings>): void {
  update((data) => ({ ...data, settings: { ...data.settings, ...patch } }));
}
