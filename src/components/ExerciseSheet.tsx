import { useEffect, useState } from 'react';
import { Field, SegmentedControl, Sheet } from './ui';
import { EXERCISE_SUGGESTIONS, targetFieldLabel, targetUnit } from '../lib/format';
import type { ExerciseKind, PlanExercise } from '../lib/types';

export interface ExerciseDraft {
  name: string;
  kind: ExerciseKind;
  sets: number;
  targetValue?: number;
  targetWeight?: number;
  restSeconds?: number;
  note?: string;
}

const KIND_OPTIONS: { value: ExerciseKind; label: string }[] = [
  { value: 'reps', label: 'Wiederholungen' },
  { value: 'weighted', label: 'Gewicht' },
  { value: 'time', label: 'Zeit' },
  { value: 'distance', label: 'Distanz' },
];

function emptyDraft(defaultRest: number): ExerciseDraft {
  return { name: '', kind: 'reps', sets: 3, restSeconds: defaultRest };
}

/** Zahl aus einem Textfeld - leer bleibt undefined statt 0. */
function num(value: string): number | undefined {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Formular zum Anlegen und Bearbeiten einer Übung. */
export function ExerciseSheet({
  open,
  exercise,
  defaultRest,
  onSave,
  onClose,
}: {
  open: boolean;
  /** Vorhandene Übung zum Bearbeiten, sonst leeres Formular. */
  exercise?: PlanExercise;
  defaultRest: number;
  onSave: (draft: ExerciseDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ExerciseDraft>(() => emptyDraft(defaultRest));

  useEffect(() => {
    if (!open) return;
    setDraft(exercise ? { ...exercise } : emptyDraft(defaultRest));
  }, [open, exercise, defaultRest]);

  const patch = (changes: Partial<ExerciseDraft>) => setDraft((current) => ({ ...current, ...changes }));

  const save = () => {
    const name = draft.name.trim();
    if (!name) return;
    onSave({ ...draft, name, sets: Math.max(1, Math.round(draft.sets || 1)) });
    onClose();
  };

  return (
    <Sheet open={open} title={exercise ? 'Übung bearbeiten' : 'Übung hinzufügen'} onClose={onClose}>
      <div className="stack-lg">
        <Field label="Name">
          <input
            className="input"
            list="exercise-suggestions"
            value={draft.name}
            placeholder="z.B. Klimmzüge"
            autoComplete="off"
            onChange={(event) => patch({ name: event.target.value })}
          />
          <datalist id="exercise-suggestions">
            {EXERCISE_SUGGESTIONS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>

        <div className="field">
          <span className="field__label">Art</span>
          <SegmentedControl
            value={draft.kind}
            options={KIND_OPTIONS}
            onChange={(kind) => patch({ kind })}
          />
        </div>

        <div className="field-row">
          <Field label="Sätze">
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              value={draft.sets}
              onFocus={(event) => event.target.select()}
              onChange={(event) => patch({ sets: num(event.target.value) ?? 1 })}
            />
          </Field>
          <Field label={targetUnit(draft.kind)} hint={targetFieldLabel(draft.kind)}>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="optional"
              value={draft.targetValue ?? ''}
              onFocus={(event) => event.target.select()}
              onChange={(event) => patch({ targetValue: num(event.target.value) })}
            />
          </Field>
        </div>

        <div className="field-row">
          {draft.kind === 'weighted' && (
            <Field label="Gewicht (kg)">
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder="optional"
                value={draft.targetWeight ?? ''}
                onFocus={(event) => event.target.select()}
                onChange={(event) => patch({ targetWeight: num(event.target.value) })}
              />
            </Field>
          )}
          <Field label="Satzpause (Sek.)">
            <input
              className="input"
              type="number"
              inputMode="numeric"
              step="15"
              value={draft.restSeconds ?? ''}
              onFocus={(event) => event.target.select()}
              placeholder="0 = keine"
              onChange={(event) => patch({ restSeconds: num(event.target.value) })}
            />
          </Field>
        </div>

        <Field label="Notiz">
          <input
            className="input"
            value={draft.note ?? ''}
            placeholder="z.B. Tempo 3-1-1, breiter Griff"
            onChange={(event) => patch({ note: event.target.value })}
          />
        </Field>

        <button className="btn btn--primary btn--block btn--lg" onClick={save} disabled={!draft.name.trim()}>
          {exercise ? 'Speichern' : 'Hinzufügen'}
        </button>
      </div>
    </Sheet>
  );
}
