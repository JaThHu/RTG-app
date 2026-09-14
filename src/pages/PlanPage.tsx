import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/ui';
import { IconChevron, IconPlay, IconPlus } from '../components/Icons';
import { createTemplate, startSession } from '../lib/actions';
import { WEEKDAYS_SHORT } from '../lib/date';
import { useData } from '../lib/store';

export function PlanPage() {
  const data = useData();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);

  const active = data.templates.filter((t) => !t.archived);
  const archived = data.templates.filter((t) => t.archived);

  const addTemplate = () => {
    const template = createTemplate('Neues Workout');
    navigate(`/plan/${template.id}`);
  };

  return (
    <main className="page">
      <PageHeader
        eyebrow="Trainingsplan"
        title="Workouts"
        action={
          <button className="btn btn--primary btn--sm" onClick={addTemplate}>
            <IconPlus size={17} /> Neu
          </button>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="Noch keine Workouts"
          text="Ein Workout ist eine Vorlage - Übungen, Sätze, Zielwerte. Du startest sie später mit einem Tap und hakst die Sätze direkt ab."
          action={
            <button className="btn btn--primary" onClick={addTemplate}>
              <IconPlus size={18} /> Erstes Workout anlegen
            </button>
          }
        />
      ) : (
        <>
          <div className="stack">
            {active.map((template) => {
              const sets = template.exercises.reduce((sum, ex) => sum + ex.sets, 0);
              return (
                <Link key={template.id} to={`/plan/${template.id}`} className="list-item">
                  <span className="accent-bar" style={{ background: template.accent }} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <strong className="truncate" style={{ display: 'block' }}>
                      {template.name}
                    </strong>
                    <span className="small muted">
                      {template.exercises.length} Übungen · {sets} Sätze
                      {template.weekdays.length > 0 && (
                        <>
                          {' · '}
                          {template.weekdays
                            .slice()
                            .sort((a, b) => a - b)
                            .map((day) => WEEKDAYS_SHORT[day - 1])
                            .join(' ')}
                        </>
                      )}
                    </span>
                  </span>
                  <IconChevron className="faint" />
                </Link>
              );
            })}
          </div>

          <section className="section">
            <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Wochenplan</h2>
            <div className="card stack">
              {WEEKDAYS_SHORT.map((label, index) => {
                const day = index + 1;
                const forDay = active.filter((t) => t.weekdays.includes(day));
                return (
                  <div key={day} className="row" style={{ alignItems: 'flex-start' }}>
                    <span
                      className="tiny"
                      style={{ width: 26, flex: 'none', fontWeight: 700, color: 'var(--text-muted)', paddingTop: 3 }}
                    >
                      {label}
                    </span>
                    <span className="row wrap grow" style={{ gap: 6 }}>
                      {forDay.length === 0 ? (
                        <span className="small faint">Ruhetag</span>
                      ) : (
                        forDay.map((t) => (
                          <span
                            key={t.id}
                            className="chip"
                            style={{ borderColor: t.accent, color: t.accent }}
                          >
                            {t.name}
                          </span>
                        ))
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {active.length > 0 && (
        <button
          className="btn btn--ghost btn--block"
          style={{ marginTop: 'var(--gap-xl)' }}
          onClick={() => {
            const session = startSession();
            navigate(`/workout/${session.id}`);
          }}
        >
          <IconPlay size={17} /> Freies Workout starten
        </button>
      )}

      {archived.length > 0 && (
        <section className="section">
          <button className="btn btn--quiet" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Archiv ausblenden' : `Archiv (${archived.length})`}
          </button>
          {showArchived && (
            <div className="stack" style={{ marginTop: 'var(--gap-sm)' }}>
              {archived.map((template) => (
                <Link key={template.id} to={`/plan/${template.id}`} className="list-item" style={{ opacity: 0.62 }}>
                  <span className="grow truncate">{template.name}</span>
                  <IconChevron className="faint" />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
