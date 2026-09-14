/** Zentrales Datenmodell der RTG-App. Alles lebt lokal im Browser. */

/** Art einer Übung - bestimmt, welche Felder beim Loggen erfasst werden. */
export type ExerciseKind = 'reps' | 'weighted' | 'time' | 'distance';

export const EXERCISE_KIND_LABEL: Record<ExerciseKind, string> = {
  reps: 'Wiederholungen',
  weighted: 'Gewicht x Wdh.',
  time: 'Zeit',
  distance: 'Distanz',
};

/** Übung innerhalb einer Workout-Vorlage. */
export interface PlanExercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** Anzahl geplanter Sätze. */
  sets: number;
  /** Zielwert pro Satz: Wdh. bei reps/weighted, Sekunden bei time, Meter bei distance. */
  targetValue?: number;
  /** Zielgewicht in kg (nur bei kind === 'weighted'). */
  targetWeight?: number;
  /** Satzpause in Sekunden. */
  restSeconds?: number;
  note?: string;
}

/** Eine Workout-Vorlage ("Push A", "Marsch", "Intervalle"). */
export interface WorkoutTemplate {
  id: string;
  name: string;
  /** Akzentfarbe als CSS-Farbwert. */
  accent: string;
  /** Geplante Wochentage, 1 = Montag ... 7 = Sonntag. */
  weekdays: number[];
  exercises: PlanExercise[];
  note?: string;
  archived?: boolean;
  createdAt: number;
}

/** Ein einzelner geloggter Satz. */
export interface SessionSet {
  done: boolean;
  reps?: number;
  weight?: number;
  seconds?: number;
  meters?: number;
}

export interface SessionExercise {
  id: string;
  /** Verweis auf die Vorlagen-Übung, falls vorhanden. */
  planExerciseId?: string;
  name: string;
  kind: ExerciseKind;
  targetValue?: number;
  targetWeight?: number;
  restSeconds?: number;
  note?: string;
  sets: SessionSet[];
}

/** Ein durchgeführtes (oder laufendes) Workout. */
export interface Session {
  id: string;
  templateId?: string;
  name: string;
  accent: string;
  startedAt: number;
  /** Gesetzt, sobald das Workout abgeschlossen ist. */
  finishedAt?: number;
  exercises: SessionExercise[];
  note?: string;
  /** Subjektive Anstrengung 1-10. */
  rpe?: number;
}

/** Über den Tag verteilte Mikro-Übung (Klimmzüge, Liegestützen, ...). */
export interface MicroExercise {
  id: string;
  name: string;
  icon: string;
  unit: 'reps' | 'seconds';
  dailyGoal: number;
  /** Buttons für die Schnellerfassung, z.B. [5, 10, 20]. */
  quickAdd: number[];
  accent: string;
  archived?: boolean;
  createdAt: number;
}

/** Eine einzelne Erfassung einer Mikro-Übung. */
export interface MicroEntry {
  id: string;
  microId: string;
  /** ISO-Datum YYYY-MM-DD in lokaler Zeit. */
  date: string;
  at: number;
  amount: number;
}

/** Anforderung der Grenadier-Selektion, gegen die getestet wird. */
export interface StandardTest {
  id: string;
  name: string;
  unit: string;
  goal: number;
  /** false = kleinerer Wert ist besser (z.B. Laufzeit). */
  higherIsBetter: boolean;
  note?: string;
  order: number;
}

export interface TestResult {
  id: string;
  testId: string;
  date: string;
  value: number;
  note?: string;
}

export interface Settings {
  /** Zieldatum der Selektion / RS als YYYY-MM-DD. */
  targetDate?: string;
  targetLabel: string;
  theme: 'dark' | 'light';
  /** Bildschirm während des Workouts wachhalten. */
  keepAwake: boolean;
  /** Ton beim Ablauf des Pausen-Timers. */
  timerSound: boolean;
  timerVibrate: boolean;
  /** Pausen-Timer nach einem abgehakten Satz automatisch starten. */
  autoRest: boolean;
  defaultRestSeconds: number;
  /** Wochentag, an dem die Trainingswoche beginnt (1 = Montag). */
  weekStart: 1 | 7;
}

export interface AppData {
  version: number;
  templates: WorkoutTemplate[];
  sessions: Session[];
  micros: MicroExercise[];
  microEntries: MicroEntry[];
  tests: StandardTest[];
  testResults: TestResult[];
  settings: Settings;
}

export const CURRENT_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  targetLabel: 'Selektion',
  theme: 'dark',
  keepAwake: true,
  timerSound: true,
  timerVibrate: true,
  autoRest: true,
  defaultRestSeconds: 90,
  weekStart: 1,
};

export function emptyData(): AppData {
  return {
    version: CURRENT_VERSION,
    templates: [],
    sessions: [],
    micros: [],
    microEntries: [],
    tests: [],
    testResults: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
