import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { MicroCard } from '../components/MicroCard';
import { EmptyState } from '../components/ui';
import { IconChevron, IconPlay, IconPlus } from '../components/Icons';
import { startSession } from '../lib/actions';
import { addDays, daysBetween, isoWeekday, toISODate, todayISO, WEEKDAYS_SHORT } from '../lib/date';
import { activeDays, activeSession, summary } from '../lib/stats';
import { useData } from '../lib/store';
import type { WorkoutTemplate } from '../lib/types';

export function TodayPage() {
  const data = useData();
  const navigate = useNavigate();
  const today = todayISO();
  const weekday = isoWeekday();

  const running = activeSession(data);
  const stats = summary(data);
  const days = activeDays(data);
  const planned = data.templates.filter((t) => !t.archived && t.weekdays.includes(weekday));
  const micros = data.micros.filter((m) => !m.archived);

  const start = (template?: WorkoutTemplate) => {
    const session = startSession(template);
    navigate(`/workout/${session.id}`);
  };

  const daysToTarget = data.settings.targetDate
    ? daysBetween(today, data.settings.targetDate)
    : null;

  const dateLabel = new Date().toLocaleDateString('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <main className="page">
      <PageHeader eyebrow="Road To Grenadier" title={dateLabel} />

      {daysToTarget !== null && (
        <div className="card card--accent">
          <div className="row-between">
            <div>
              <div className="page-header__eyebrow">{data.settings.targetLabel}</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 750, letterSpacing: '-0.03em' }} className="tabular">
                {daysToTarget > 0 ? `${daysToTarget} Tage` : daysToTarget === 0 ? 'Heute!' : 'geschafft'}
              </div>
            </div>
            {daysToTarget > 0 && (
              <div className="center">
                <div className="tabular" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {Math.ceil(daysToTarget / 7)}
                </div>
                <div className="tiny faint">Wochen</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Laufendes Workout hat immer Vorrang. */}
      {running && (
        <Link
          to={`/workout/${running.id}`}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--gap)',
            marginTop: 'var(--gap)',
            borderColor: running.accent,
          }}
        >
          <span className="accent-bar" style={{ background: running.accent }} />
          <span className="grow">
            <span className="page-header__eyebrow" style={{ color: running.accent }}>
              Läuft gerade
            </span>
            <strong style={{ display: 'block' }}>{running.name}</strong>
          </span>
          <IconChevron />
        </Link>
      )}

      <section className="section">
        <div className="section__head">
          <h2>Heute im Plan</h2>
          <Link to="/plan" className="small muted">
            Plan
          </Link>
        </div>

        {planned.length === 0 && data.templates.length === 0 && (
          <EmptyState
            icon="🗂️"
            title="Noch kein Trainingsplan"
            text="Lege dein erstes Workout an - danach startest du es hier mit einem Tap."
            action={
              <Link to="/plan" className="btn btn--primary">
                <IconPlus size={18} /> Workout anlegen
              </Link>
            }
          />
        )}

        {planned.length === 0 && data.templates.length > 0 && (
          <div className="card center">
            <p className="muted small">Heute ist kein Workout geplant. Ruhetag oder freies Training.</p>
            <button
              className="btn btn--ghost btn--block"
              style={{ marginTop: 'var(--gap-sm)' }}
              onClick={() => start()}
            >
              <IconPlay size={17} /> Freies Workout starten
            </button>
          </div>
        )}

        <div className="stack">
          {planned.map((template) => {
            const sets = template.exercises.reduce((sum, ex) => sum + ex.sets, 0);
            return (
              <div key={template.id} className="card" style={{ borderColor: template.accent }}>
                <div className="row-between">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <strong className="truncate" style={{ display: 'block' }}>
                      {template.name}
                    </strong>
                    <span className="small muted">
                      {template.exercises.length} Übungen · {sets} Sätze
                    </span>
                  </div>
                  <button
                    className="btn btn--primary"
                    style={{ background: template.accent, borderColor: template.accent }}
                    onClick={() => start(template)}
                    disabled={Boolean(running)}
                  >
                    <IconPlay size={17} /> Start
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Mikro-Übungen</h2>
          <Link to="/mikro" className="small muted">
            alle
          </Link>
        </div>
        {micros.length === 0 ? (
          <EmptyState
            icon="⚡"
            title="Keine Mikro-Übungen"
            text="Klimmzüge, Liegestützen, Planks - alles was über den Tag verteilt läuft."
            action={
              <Link to="/mikro" className="btn btn--primary">
                <IconPlus size={18} /> Anlegen
              </Link>
            }
          />
        ) : (
          <div className="stack">
            {micros.map((micro) => (
              <MicroCard key={micro.id} micro={micro} date={today} compact />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Diese Woche</h2>
          <Link to="/verlauf" className="small muted">
            Verlauf
          </Link>
        </div>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            {Array.from({ length: 7 }, (_, index) => {
              const date = addDays(new Date(), index - 6);
              const iso = toISODate(date);
              const active = days.has(iso);
              const isToday = iso === today;
              return (
                <div key={iso} className="center" style={{ flex: 1 }}>
                  <div className="tiny faint">{WEEKDAYS_SHORT[(date.getDay() + 6) % 7]}</div>
                  <div
                    style={{
                      margin: '5px auto 0',
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      display: 'grid',
                      placeItems: 'center',
                      background: active ? 'var(--accent)' : 'var(--surface-2)',
                      color: active ? 'var(--accent-text)' : 'var(--text-faint)',
                      border: isToday ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="divider" />
          <div className="stat-grid">
            <div className="stat" style={{ background: 'transparent', border: 'none', padding: 4 }}>
              <div className="stat__value">{stats.streak}</div>
              <div className="stat__label">Serie (Tage)</div>
            </div>
            <div className="stat" style={{ background: 'transparent', border: 'none', padding: 4 }}>
              <div className="stat__value">{stats.sessionsThisWeek}</div>
              <div className="stat__label">Workouts</div>
            </div>
            <div className="stat" style={{ background: 'transparent', border: 'none', padding: 4 }}>
              <div className="stat__value">{stats.microToday}</div>
              <div className="stat__label">Mikro heute</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
