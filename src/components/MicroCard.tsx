import { useState } from 'react';
import { logMicro, undoLastMicro } from '../lib/actions';
import { tick } from '../lib/feedback';
import { microTotal } from '../lib/stats';
import { useStore } from '../lib/store';
import type { MicroExercise } from '../lib/types';
import { IconPlus, IconUndo } from './Icons';
import { ProgressRing } from './ui';
import { useToast } from './Toast';

/**
 * Schnellerfassung einer Mikro-Übung: Ring mit Tagesstand plus die
 * Quick-Add-Buttons. Wird auf "Heute" und auf der Mikro-Seite verwendet.
 */
export function MicroCard({
  micro,
  date,
  compact = false,
}: {
  micro: MicroExercise;
  date: string;
  compact?: boolean;
}) {
  const total = useStore((data) => microTotal(data.microEntries, micro.id, date));
  const vibration = useStore((data) => data.settings.timerVibrate);
  const toast = useToast();
  const [custom, setCustom] = useState('');

  const goal = micro.dailyGoal > 0 ? micro.dailyGoal : 0;
  const ratio = goal > 0 ? total / goal : total > 0 ? 1 : 0;
  const unit = micro.unit === 'reps' ? 'Wdh.' : 'Sek.';
  const reached = goal > 0 && total >= goal;

  const add = (amount: number) => {
    logMicro(micro.id, amount, date);
    tick(vibration);
    if (goal > 0 && total < goal && total + amount >= goal) {
      toast(`${micro.icon} Tagesziel erreicht!`);
    }
  };

  const addCustom = () => {
    const value = Number(custom.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;
    add(Math.round(value));
    setCustom('');
  };

  return (
    <div className="card" style={{ borderColor: reached ? micro.accent : undefined }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <ProgressRing value={ratio} size={compact ? 58 : 68} color={micro.accent}>
          <span style={{ fontSize: compact ? '1.05rem' : '1.2rem' }} aria-hidden="true">
            {micro.icon}
          </span>
        </ProgressRing>
        <div className="grow">
          <div className="row-between">
            <strong className="truncate">{micro.name}</strong>
            {reached && <span className="chip chip--on tiny">Ziel</span>}
          </div>
          <div className="tabular" style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.2 }}>
            {total}
            <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
              {goal > 0 ? ` / ${goal}` : ''} {unit}
            </span>
          </div>
          {goal > 0 && !reached && (
            <div className="tiny faint">noch {goal - total} {unit}</div>
          )}
        </div>
      </div>

      <div className="row wrap" style={{ marginTop: 'var(--gap)' }}>
        {micro.quickAdd.map((amount) => (
          <button
            key={amount}
            className="btn btn--sm"
            style={{ minHeight: 40, flex: '1 1 56px', fontSize: '0.92rem' }}
            onClick={() => add(amount)}
          >
            +{amount}
          </button>
        ))}
        {!compact && (
          <div className="row" style={{ flex: '1 1 120px', gap: 6 }}>
            <input
              className="input"
              style={{ minHeight: 40, padding: '8px 10px' }}
              type="number"
              inputMode="numeric"
              placeholder="Anz."
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && addCustom()}
              aria-label={`Eigene Anzahl für ${micro.name}`}
            />
            <button
              className="icon-btn"
              style={{ height: 40, width: 40 }}
              onClick={addCustom}
              aria-label="Hinzufügen"
            >
              <IconPlus size={18} />
            </button>
          </div>
        )}
        {total > 0 && (
          <button
            className="icon-btn"
            style={{ height: 40, width: 40 }}
            onClick={() => {
              undoLastMicro(micro.id, date);
              tick(vibration);
            }}
            aria-label="Letzte Erfassung rückgängig"
          >
            <IconUndo size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
