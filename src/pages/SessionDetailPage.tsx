import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ConfirmSheet } from '../components/ui';
import { IconPlay, IconTrash } from '../components/Icons';
import { deleteSession, startSession } from '../lib/actions';
import { formatDate, formatDurationShort, formatTime, toISODate } from '../lib/date';
import { formatSet, formatVolume } from '../lib/format';
import { doneSets, sessionDurationSeconds, sessionReps, sessionVolume } from '../lib/stats';
import { useData } from '../lib/store';

export function SessionDetailPage() {
  const { sessionId } = useParams();
  const data = useData();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return <Navigate to="/verlauf" replace />;
  if (!session.finishedAt) return <Navigate to={`/workout/${session.id}`} replace />;

  const volume = sessionVolume(session);
  const template = data.templates.find((t) => t.id === session.templateId);

  return (
    <main className="page">
      <PageHeader
        eyebrow={`${formatDate(toISODate(new Date(session.startedAt)))} · ${formatTime(session.startedAt)}`}
        title={session.name}
        back="/verlauf"
        action={
          <button
            className="icon-btn"
            style={{ color: 'var(--red)' }}
            onClick={() => setConfirmDelete(true)}
            aria-label="Workout löschen"
          >
            <IconTrash />
          </button>
        }
      />

      <div className="stat-grid">
        <div className="stat">
          <div className="stat__value">{formatDurationShort(sessionDurationSeconds(session))}</div>
          <div className="stat__label">Dauer</div>
        </div>
        <div className="stat">
          <div className="stat__value">{doneSets(session)}</div>
          <div className="stat__label">Sätze</div>
        </div>
        <div className="stat">
          <div className="stat__value">{sessionReps(session)}</div>
          <div className="stat__label">Wdh.</div>
        </div>
        {volume > 0 && (
          <div className="stat">
            <div className="stat__value">{formatVolume(volume)}</div>
            <div className="stat__label">Volumen</div>
          </div>
        )}
        {session.rpe && (
          <div className="stat">
            <div className="stat__value">{session.rpe}</div>
            <div className="stat__label">RPE</div>
          </div>
        )}
      </div>

      {session.note && (
        <div className="card" style={{ marginTop: 'var(--gap)' }}>
          <div className="field__label">Notiz</div>
          <p className="small" style={{ marginTop: 4 }}>
            {session.note}
          </p>
        </div>
      )}

      <section className="section">
        <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Übungen</h2>
        <div className="stack">
          {session.exercises.map((exercise) => {
            const completed = exercise.sets.filter((s) => s.done);
            return (
              <div key={exercise.id} className="card">
                <div className="row-between">
                  <strong className="truncate">{exercise.name}</strong>
                  <span className="small faint tabular">
                    {completed.length}/{exercise.sets.length}
                  </span>
                </div>
                {completed.length === 0 ? (
                  <span className="small faint">nicht absolviert</span>
                ) : (
                  <div className="row wrap" style={{ marginTop: 7, gap: 6 }}>
                    {completed.map((set, index) => (
                      <span key={index} className="chip tabular">
                        {formatSet(exercise.kind, set)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <button
        className="btn btn--primary btn--block btn--lg"
        style={{ marginTop: 'var(--gap-xl)' }}
        onClick={() => {
          const next = startSession(template);
          navigate(`/workout/${next.id}`);
        }}
        disabled={!template}
      >
        <IconPlay /> {template ? 'Nochmal starten' : 'Vorlage nicht mehr vorhanden'}
      </button>

      <ConfirmSheet
        open={confirmDelete}
        title="Workout löschen?"
        text="Dieses abgeschlossene Workout wird aus dem Verlauf und der Statistik entfernt."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteSession(session.id);
          navigate('/verlauf', { replace: true });
        }}
      />
    </main>
  );
}
