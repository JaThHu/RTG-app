import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/ui';
import { IconChevron } from '../components/Icons';
import { formatDurationShort, formatRelativeDay, toISODate } from '../lib/date';
import { formatVolume } from '../lib/format';
import { doneSets, finishedSessions, sessionDurationSeconds, sessionVolume } from '../lib/stats';
import { useData } from '../lib/store';
import type { Session } from '../lib/types';

export function HistoryPage() {
  const data = useData();
  const sessions = finishedSessions(data);

  if (sessions.length === 0) {
    return (
      <main className="page">
        <PageHeader eyebrow="Abgeschlossen" title="Verlauf" back="/" />
        <EmptyState icon="📓" title="Noch keine Workouts" text="Dein erstes abgeschlossenes Workout landet hier." />
      </main>
    );
  }

  // Nach Monat gruppieren, damit lange Listen lesbar bleiben.
  const groups = new Map<string, Session[]>();
  for (const session of sessions) {
    const key = new Date(session.startedAt).toLocaleDateString('de-CH', {
      month: 'long',
      year: 'numeric',
    });
    const bucket = groups.get(key);
    if (bucket) bucket.push(session);
    else groups.set(key, [session]);
  }

  return (
    <main className="page">
      <PageHeader eyebrow={`${sessions.length} abgeschlossen`} title="Verlauf" back="/" />

      {[...groups.entries()].map(([month, items]) => (
        <section className="section" key={month} style={{ marginTop: 'var(--gap-lg)' }}>
          <h2 style={{ marginBottom: 'var(--gap-sm)', textTransform: 'capitalize' }}>{month}</h2>
          <div className="stack">
            {items.map((session) => {
              const volume = sessionVolume(session);
              return (
                <Link key={session.id} to={`/verlauf/${session.id}`} className="list-item">
                  <span className="accent-bar" style={{ background: session.accent }} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="row" style={{ gap: 7 }}>
                      <strong className="truncate">{session.name}</strong>
                      {session.rpe && <span className="chip tiny">RPE {session.rpe}</span>}
                    </span>
                    <span className="small muted">
                      {formatRelativeDay(toISODate(new Date(session.startedAt)))} ·{' '}
                      {formatDurationShort(sessionDurationSeconds(session))} · {doneSets(session)} Sätze
                      {volume > 0 && ` · ${formatVolume(volume)}`}
                    </span>
                  </span>
                  <IconChevron className="faint" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
