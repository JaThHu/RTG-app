import { useCallback, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ExerciseSheet } from '../components/ExerciseSheet';
import type { ExerciseDraft } from '../components/ExerciseSheet';
import { SetRow } from '../components/SetRow';
import { ConfirmSheet, ProgressBar, Sheet } from '../components/ui';
import { useToast } from '../components/Toast';
import { IconClose, IconPlus, IconTimer, IconTrash } from '../components/Icons';
import {
  addSessionExercise,
  addSessionSet,
  deleteSession,
  finishSession,
  removeSessionExercise,
  removeSessionSet,
  updateSessionSet,
} from '../lib/actions';
import { formatDuration, formatDurationShort, formatRelativeDay } from '../lib/date';
import { formatSet, formatTarget } from '../lib/format';
import { restDone, tick } from '../lib/feedback';
import { doneSets, lastPerformance, sessionVolume, totalSets } from '../lib/stats';
import { useData } from '../lib/store';
import { useCountdown, useElapsed } from '../lib/timers';
import { useWakeLock } from '../lib/wakeLock';
import type { SessionExercise, SessionSet } from '../lib/types';

/** Welchen Satz der laufende Countdown betrifft. */
type TimerContext = { mode: 'rest' } | { mode: 'work'; exerciseId: string; setIndex: number };

export function WorkoutPage() {
  const { sessionId } = useParams();
  const data = useData();
  const navigate = useNavigate();
  const toast = useToast();

  const session = data.sessions.find((s) => s.id === sessionId);
  const settings = data.settings;

  const [addOpen, setAddOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [rpe, setRpe] = useState<number | undefined>();
  const [note, setNote] = useState('');

  const timerContext = useRef<TimerContext>({ mode: 'rest' });
  const elapsed = useElapsed(session?.startedAt);
  useWakeLock(settings.keepAwake && Boolean(session) && !session?.finishedAt);

  const onTimerDone = useCallback(() => {
    restDone(settings.timerSound, settings.timerVibrate);
    const context = timerContext.current;
    if (context.mode === 'work' && session) {
      // Zeit-Übung: Satz mit der abgelaufenen Zeit abhaken.
      const exercise = session.exercises.find((ex) => ex.id === context.exerciseId);
      const target = exercise?.targetValue;
      updateSessionSet(session.id, context.exerciseId, context.setIndex, {
        done: true,
        seconds: exercise?.sets[context.setIndex]?.seconds ?? target,
      });
    }
    timerContext.current = { mode: 'rest' };
  }, [session, settings.timerSound, settings.timerVibrate]);

  const timer = useCountdown(onTimerDone);

  if (!session) return <Navigate to="/" replace />;
  if (session.finishedAt) return <Navigate to={`/verlauf/${session.id}`} replace />;

  const done = doneSets(session);
  const total = totalSets(session);

  const toggleSet = (exercise: SessionExercise, index: number) => {
    const set = exercise.sets[index];
    if (!set) return;

    if (set.done) {
      updateSessionSet(session.id, exercise.id, index, { done: false });
      return;
    }

    // Leere Felder beim Abhaken mit dem Zielwert bzw. dem Wert des Vorsatzes füllen.
    const previous = exercise.sets.slice(0, index).reverse().find((s) => s.done);
    const patch: Partial<SessionSet> = { done: true };
    if (exercise.kind === 'reps' || exercise.kind === 'weighted') {
      patch.reps = set.reps ?? previous?.reps ?? exercise.targetValue;
    }
    if (exercise.kind === 'weighted') {
      patch.weight = set.weight ?? previous?.weight ?? exercise.targetWeight;
    }
    if (exercise.kind === 'time') patch.seconds = set.seconds ?? previous?.seconds ?? exercise.targetValue;
    if (exercise.kind === 'distance') patch.meters = set.meters ?? previous?.meters ?? exercise.targetValue;

    updateSessionSet(session.id, exercise.id, index, patch);
    tick(settings.timerVibrate);

    const rest = exercise.restSeconds ?? 0;
    const isLastSet = index === exercise.sets.length - 1;
    if (settings.autoRest && rest > 0 && !isLastSet) {
      timerContext.current = { mode: 'rest' };
      timer.start(rest);
    }
  };

  const startWorkTimer = (exercise: SessionExercise, index: number) => {
    const seconds = exercise.sets[index]?.seconds ?? exercise.targetValue ?? 60;
    timerContext.current = { mode: 'work', exerciseId: exercise.id, setIndex: index };
    timer.start(seconds);
  };

  const addExercise = (draft: ExerciseDraft) => {
    addSessionExercise(session.id, draft);
  };

  const finish = () => {
    finishSession(session.id, { rpe, note: note.trim() || undefined });
    toast('Workout gespeichert 💪');
    navigate(`/verlauf/${session.id}`, { replace: true });
  };

  const volume = sessionVolume(session);

  return (
    <main className="page page--workout">
      <div className="workout-top">
        <div className="row-between">
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="page-header__eyebrow" style={{ color: session.accent }}>
              Läuft · {formatDuration(elapsed)}
            </div>
            <h1 className="truncate" style={{ fontSize: '1.25rem' }}>
              {session.name}
            </h1>
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => setFinishOpen(true)}>
            Beenden
          </button>
          <button className="icon-btn" onClick={() => setDiscardOpen(true)} aria-label="Workout verwerfen">
            <IconClose />
          </button>
        </div>
        <div className="workout-top__bar">
          <ProgressBar value={total > 0 ? done / total : 0} color={session.accent} />
          <div className="row-between tiny faint" style={{ marginTop: 5 }}>
            <span>
              {done} / {total} Sätze
            </span>
            {volume > 0 && <span>{Math.round(volume)} kg Volumen</span>}
          </div>
        </div>
      </div>

      <div className="stack-lg">
        {session.exercises.map((exercise) => {
          const last = lastPerformance(data, exercise.name, session.id);
          const allDone = exercise.sets.every((s) => s.done);
          return (
            <section
              key={exercise.id}
              className="card"
              style={{ borderColor: allDone ? session.accent : undefined }}
            >
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <strong className="truncate" style={{ display: 'block' }}>
                    {exercise.name}
                  </strong>
                  <span className="small muted">{formatTarget({ ...exercise, sets: exercise.sets.length })}</span>
                </div>
                <button
                  className="icon-btn"
                  style={{ width: 32, height: 32 }}
                  onClick={() => removeSessionExercise(session.id, exercise.id)}
                  aria-label={`${exercise.name} aus dem Workout entfernen`}
                >
                  <IconTrash size={15} />
                </button>
              </div>

              {exercise.note && <p className="tiny faint" style={{ marginTop: 4 }}>{exercise.note}</p>}

              {last && (
                <p className="tiny faint" style={{ marginTop: 4 }}>
                  {formatRelativeDay(last.date)}:{' '}
                  {last.sets.map((set) => formatSet(exercise.kind, set)).join(' · ')}
                </p>
              )}

              <div style={{ marginTop: 8 }}>
                {exercise.sets.map((set, index) => (
                  <SetRow
                    key={index}
                    index={index}
                    kind={exercise.kind}
                    set={set}
                    placeholderValue={exercise.targetValue}
                    placeholderWeight={exercise.targetWeight}
                    onChange={(patch) => updateSessionSet(session.id, exercise.id, index, patch)}
                    onToggle={() => toggleSet(exercise, index)}
                    onStartTimer={
                      exercise.kind === 'time' ? () => startWorkTimer(exercise, index) : undefined
                    }
                  />
                ))}
              </div>

              <div className="row" style={{ marginTop: 8, gap: 6 }}>
                <button className="btn btn--sm btn--ghost grow" onClick={() => addSessionSet(session.id, exercise.id)}>
                  <IconPlus size={15} /> Satz
                </button>
                {exercise.sets.length > 1 && (
                  <button
                    className="btn btn--sm btn--quiet"
                    onClick={() => removeSessionSet(session.id, exercise.id, exercise.sets.length - 1)}
                  >
                    Satz entfernen
                  </button>
                )}
                {(exercise.restSeconds ?? 0) > 0 && (
                  <button
                    className="btn btn--sm btn--ghost"
                    onClick={() => {
                      timerContext.current = { mode: 'rest' };
                      timer.start(exercise.restSeconds!);
                    }}
                    aria-label="Pause starten"
                  >
                    <IconTimer size={15} /> {formatDuration(exercise.restSeconds!)}
                  </button>
                )}
              </div>
            </section>
          );
        })}

        <button className="btn btn--ghost btn--block" onClick={() => setAddOpen(true)}>
          <IconPlus /> Übung hinzufügen
        </button>
      </div>

      {timer.running && (
        <div
          className={`rest-bar ${timerContext.current.mode === 'work' ? 'rest-bar--work' : ''}`}
          style={{ ['--rest-progress' as string]: `${timer.progress * 100}%` }}
          role="timer"
          aria-live="off"
        >
          <span className="rest-bar__time">{formatDuration(timer.remaining)}</span>
          <span className="grow tiny faint">
            {timerContext.current.mode === 'work' ? 'Übung läuft' : 'Satzpause'}
          </span>
          <button className="btn btn--sm" onClick={() => timer.adjust(-15)}>
            -15
          </button>
          <button className="btn btn--sm" onClick={() => timer.adjust(30)}>
            +30
          </button>
          <button className="btn btn--sm btn--primary" onClick={timer.stop}>
            Skip
          </button>
        </div>
      )}

      <ExerciseSheet
        open={addOpen}
        defaultRest={settings.defaultRestSeconds}
        onSave={addExercise}
        onClose={() => setAddOpen(false)}
      />

      <Sheet open={finishOpen} title="Workout beenden" onClose={() => setFinishOpen(false)}>
        <div className="stack-lg">
          <div className="stat-grid">
            <div className="stat">
              <div className="stat__value">{formatDurationShort(elapsed)}</div>
              <div className="stat__label">Dauer</div>
            </div>
            <div className="stat">
              <div className="stat__value">{done}</div>
              <div className="stat__label">Sätze</div>
            </div>
            {volume > 0 && (
              <div className="stat">
                <div className="stat__value">{Math.round(volume)}</div>
                <div className="stat__label">kg Volumen</div>
              </div>
            )}
          </div>

          {done < total && (
            <p className="small muted">
              {total - done} Sätze sind nicht abgehakt. Sie werden nicht mitgezählt.
            </p>
          )}

          <div className="field">
            <span className="field__label">Anstrengung (RPE)</span>
            <div className="rpe-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <button
                  key={value}
                  aria-pressed={rpe === value}
                  onClick={() => setRpe(rpe === value ? undefined : value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Notiz</span>
            <textarea
              className="textarea"
              value={note}
              placeholder="Wie lief es? Was war schwer?"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <button className="btn btn--primary btn--block btn--lg" onClick={finish}>
            Workout speichern
          </button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={discardOpen}
        title="Workout verwerfen?"
        text="Alle Eingaben dieses Workouts gehen verloren."
        confirmLabel="Verwerfen"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          deleteSession(session.id);
          navigate('/', { replace: true });
        }}
      />
    </main>
  );
}
