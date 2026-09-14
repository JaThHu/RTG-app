import { IconCheck, IconTimer } from './Icons';
import type { ExerciseKind, SessionSet } from '../lib/types';

/**
 * Eine Satzzeile im laufenden Workout: Eingabefelder passend zur Übungsart
 * und ein grosser Haken. Die Felder sind bewusst breit - bedient wird das
 * Ganze mit verschwitzten Fingern.
 */
export function SetRow({
  index,
  kind,
  set,
  placeholderValue,
  placeholderWeight,
  onChange,
  onToggle,
  onStartTimer,
}: {
  index: number;
  kind: ExerciseKind;
  set: SessionSet;
  placeholderValue?: number;
  placeholderWeight?: number;
  onChange: (patch: Partial<SessionSet>) => void;
  onToggle: () => void;
  /** Nur bei Zeit-Übungen: Countdown für diesen Satz starten. */
  onStartTimer?: () => void;
}) {
  const numberField = (
    value: number | undefined,
    placeholder: number | undefined,
    label: string,
    apply: (parsed: number | undefined) => Partial<SessionSet>,
    step?: string,
  ) => (
    <input
      className="set-input"
      type="number"
      inputMode={step ? 'decimal' : 'numeric'}
      step={step}
      min={0}
      aria-label={`${label}, Satz ${index + 1}`}
      placeholder={placeholder !== undefined ? String(placeholder) : label}
      value={value ?? ''}
      onFocus={(event) => event.target.select()}
      onChange={(event) => {
        const raw = event.target.value.trim().replace(',', '.');
        const parsed = raw === '' ? undefined : Number(raw);
        onChange(apply(Number.isFinite(parsed as number) ? parsed : undefined));
      }}
    />
  );

  return (
    <div className="set-row" data-done={set.done}>
      <span className="set-row__index">{index + 1}</span>

      {kind === 'weighted' && (
        <>
          {numberField(set.weight, placeholderWeight, 'kg', (v) => ({ weight: v }), '0.5')}
          <span className="set-row__x">x</span>
          {numberField(set.reps, placeholderValue, 'Wdh.', (v) => ({ reps: v }))}
        </>
      )}
      {kind === 'reps' && numberField(set.reps, placeholderValue, 'Wdh.', (v) => ({ reps: v }))}
      {kind === 'time' && numberField(set.seconds, placeholderValue, 'Sek.', (v) => ({ seconds: v }))}
      {kind === 'distance' && numberField(set.meters, placeholderValue, 'Meter', (v) => ({ meters: v }))}

      {kind === 'time' && onStartTimer && (
        <button
          className="icon-btn"
          style={{ width: 44, height: 46 }}
          onClick={onStartTimer}
          aria-label={`Timer für Satz ${index + 1} starten`}
        >
          <IconTimer size={19} />
        </button>
      )}

      <button
        className="set-check"
        data-done={set.done}
        onClick={onToggle}
        aria-pressed={set.done}
        aria-label={`Satz ${index + 1} ${set.done ? 'zurücksetzen' : 'abhaken'}`}
      >
        <IconCheck size={22} />
      </button>
    </div>
  );
}
