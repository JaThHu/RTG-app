import { IconMinus, IconPlus } from './Icons';
import { formatRelativeDay } from '../lib/date';
import { formatWeight, parseDecimal } from '../lib/format';
import { lastWeight } from '../lib/stats';
import type { AppData, Session, SessionExercise } from '../lib/types';

/** Entwurf der Gewichtsfelder: Übungs-ID -> Text im Feld. */
export type WeightDraft = Record<string, string>;

/** Schritt der +/- Knöpfe - eine 1.25er-Scheibe pro Seite. */
const STEP = 2.5;

/**
 * Was zu einer Übung gespeichert ist. 'mixed' heisst: Gewicht-Übung mit
 * verschieden schweren Sätzen. Das Feld bleibt dann leer und überschreibt die
 * Sätze nur, wenn man etwas einträgt.
 */
function storedWeight(exercise: SessionExercise): number | undefined | 'mixed' {
  if (exercise.kind !== 'weighted') return exercise.weight;
  const weights = new Set(exercise.sets.filter((s) => s.done).map((s) => s.weight));
  if (weights.size > 1) return 'mixed';
  return [...weights][0];
}

/** Übungen, für die ein Gewicht notiert werden kann - nur tatsächlich gemachte. */
export function weightExercises(session: Session): SessionExercise[] {
  return session.exercises.filter((ex) => ex.sets.some((s) => s.done));
}

/**
 * Startwerte der Felder: was schon notiert ist, sonst das Gewicht vom letzten
 * Mal. Bleibt es gleich, kostet das Notieren damit keinen einzigen Tap.
 */
export function initialWeightDraft(data: AppData, session: Session): WeightDraft {
  const draft: WeightDraft = {};
  for (const exercise of weightExercises(session)) {
    const stored = storedWeight(exercise);
    const value =
      stored === 'mixed' ? undefined : (stored ?? lastWeight(data, exercise.name, session.startedAt)?.weight);
    draft[exercise.id] = value !== undefined ? String(value) : '';
  }
  return draft;
}

/** Nur die Felder, die vom Gespeicherten abweichen - als Eingabe für setExerciseWeights. */
export function weightChanges(session: Session, draft: WeightDraft): Record<string, number | undefined> {
  const changes: Record<string, number | undefined> = {};
  for (const exercise of weightExercises(session)) {
    const text = draft[exercise.id];
    if (text === undefined) continue;
    const parsed = parseDecimal(text);
    const value = parsed !== undefined && parsed > 0 ? parsed : undefined;
    const stored = storedWeight(exercise);
    if (stored === 'mixed' ? value === undefined : value === stored) continue;
    changes[exercise.id] = value;
  }
  return changes;
}

/** Eine Zeile pro gemachter Übung: Name, Gewicht vom letzten Mal, Feld mit +/-. */
export function WeightFields({
  data,
  session,
  draft,
  onChange,
}: {
  data: AppData;
  session: Session;
  draft: WeightDraft;
  onChange: (exerciseId: string, text: string) => void;
}) {
  const exercises = weightExercises(session);
  if (exercises.length === 0) {
    return <p className="small faint">Noch kein Satz abgehakt.</p>;
  }

  return (
    <div>
      {exercises.map((exercise) => {
        const text = draft[exercise.id] ?? '';
        const stored = storedWeight(exercise);
        const last = lastWeight(data, exercise.name, session.startedAt);
        const setWeights = exercise.sets.filter((s) => s.done && s.weight).map((s) => s.weight);
        const hint =
          stored === 'mixed'
            ? `Sätze: ${setWeights.join(' · ')} kg`
            : last
              ? `Letztes Mal ${formatWeight(last.weight)} · ${formatRelativeDay(last.date)}`
              : undefined;

        const step = (delta: number) => {
          const next = Math.max(0, Math.round(((parseDecimal(text) ?? 0) + delta) * 100) / 100);
          onChange(exercise.id, next > 0 ? String(next) : '');
        };

        return (
          <div key={exercise.id} className="weight-row">
            <div className="grow">
              <div className="truncate" style={{ fontWeight: 600 }}>
                {exercise.name}
              </div>
              {hint && <div className="tiny faint truncate">{hint}</div>}
            </div>
            <button
              className="icon-btn"
              onClick={() => step(-STEP)}
              disabled={!text}
              aria-label={`${exercise.name}: ${STEP} kg weniger`}
            >
              <IconMinus size={16} />
            </button>
            <input
              className="set-input weight-row__input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={stored === 'mixed' ? 'versch.' : 'kg'}
              value={text}
              aria-label={`Gewicht ${exercise.name} in kg`}
              onFocus={(event) => event.target.select()}
              onChange={(event) => onChange(exercise.id, event.target.value)}
            />
            <button
              className="icon-btn"
              onClick={() => step(STEP)}
              aria-label={`${exercise.name}: ${STEP} kg mehr`}
            >
              <IconPlus size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
