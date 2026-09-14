import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { BarChart, Heatmap } from '../components/Charts';
import { EmptyState, ProgressBar, SegmentedControl } from '../components/ui';
import { addDays, formatDurationShort, toISODate } from '../lib/date';
import { formatDistance, formatSet, formatVolume } from '../lib/format';
import {
  activeDays,
  finishedSessions,
  microTotalsByDate,
  personalRecords,
  summary,
  testProgress,
  weeklyBuckets,
} from '../lib/stats';
import { useData } from '../lib/store';

type Metric = 'sessions' | 'sets' | 'volume' | 'micro';

const METRICS: { value: Metric; label: string }[] = [
  { value: 'sessions', label: 'Workouts' },
  { value: 'sets', label: 'Sätze' },
  { value: 'volume', label: 'Volumen' },
  { value: 'micro', label: 'Mikro' },
];

export function StatsPage() {
  const data = useData();
  const [metric, setMetric] = useState<Metric>('sessions');

  const stats = summary(data);
  const days = activeDays(data);
  const sessions = finishedSessions(data);
  const weeks = weeklyBuckets(data, 12);
  const records = personalRecords(data);
  const tests = testProgress(data).filter((t) => t.best);
  const micros = data.micros.filter((m) => !m.archived);

  if (sessions.length === 0 && data.microEntries.length === 0) {
    return (
      <main className="page">
        <PageHeader eyebrow="Fortschritt" title="Statistik" />
        <EmptyState
          icon="📈"
          title="Noch keine Daten"
          text="Sobald du dein erstes Workout abschliesst oder Mikro-Übungen erfasst, entsteht hier deine Auswertung."
        />
      </main>
    );
  }

  const chartData = weeks.map((week) => ({
    label: week.label,
    value:
      metric === 'sessions'
        ? week.sessions
        : metric === 'sets'
          ? week.sets
          : metric === 'volume'
            ? week.volume
            : week.micro,
  }));

  const formatMetric = (value: number) =>
    metric === 'volume' ? (value > 0 ? formatVolume(value) : '') : String(Math.round(value));

  const totalDistance = sessions.reduce(
    (sum, session) =>
      sum +
      session.exercises.reduce(
        (inner, ex) =>
          inner + ex.sets.filter((s) => s.done).reduce((n, s) => n + (s.meters ?? 0), 0),
        0,
      ),
    0,
  );
  const totalMicro = data.microEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <main className="page">
      <PageHeader eyebrow="Fortschritt" title="Statistik" />

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat">
          <div className="stat__value">{stats.streak}</div>
          <div className="stat__label">Serie</div>
        </div>
        <div className="stat">
          <div className="stat__value">{stats.longest}</div>
          <div className="stat__label">Rekordserie</div>
        </div>
        <div className="stat">
          <div className="stat__value">{stats.totalSessions}</div>
          <div className="stat__label">Workouts</div>
        </div>
        <div className="stat">
          <div className="stat__value">{totalMicro}</div>
          <div className="stat__label">Mikro total</div>
        </div>
      </div>

      <section className="section">
        <div className="section__head">
          <h2>Letzte 12 Wochen</h2>
        </div>
        <div className="card">
          <SegmentedControl value={metric} options={METRICS} onChange={setMetric} />
          <BarChart data={chartData} format={formatMetric} />
        </div>
      </section>

      <section className="section">
        <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Aktive Tage</h2>
        <div className="card">
          <Heatmap days={days} />
        </div>
      </section>

      {micros.length > 0 && (
        <section className="section">
          <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Mikro-Übungen, letzte 14 Tage</h2>
          <div className="stack">
            {micros.map((micro) => {
              const totals = microTotalsByDate(data.microEntries, micro.id);
              const series = Array.from({ length: 14 }, (_, index) => {
                const date = addDays(new Date(), index - 13);
                return {
                  label: String(date.getDate()),
                  value: totals.get(toISODate(date)) ?? 0,
                };
              });
              const sum = series.reduce((total, day) => total + day.value, 0);
              return (
                <div key={micro.id} className="card">
                  <div className="row-between">
                    <strong>
                      {micro.icon} {micro.name}
                    </strong>
                    <span className="small muted tabular">
                      {sum} total · Ø {Math.round(sum / 14)}/Tag
                    </span>
                  </div>
                  <BarChart data={series} color={micro.accent} height={92} format={(v) => (v > 0 ? String(v) : '')} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tests.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2>Grenadier-Tests</h2>
            <Link to="/mehr/tests" className="small muted">
              alle
            </Link>
          </div>
          <div className="stack">
            {tests.map(({ test, best, ratio, reached }) => (
              <div key={test.id} className="card">
                <div className="row-between" style={{ marginBottom: 7 }}>
                  <strong>{test.name}</strong>
                  <span className="small tabular" style={{ color: reached ? 'var(--accent)' : undefined }}>
                    {best?.value} / {test.goal} {test.unit}
                  </span>
                </div>
                <ProgressBar value={ratio} color={reached ? 'var(--accent)' : 'var(--amber)'} />
              </div>
            ))}
          </div>
        </section>
      )}

      {records.length > 0 && (
        <section className="section">
          <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Bestleistungen</h2>
          <ul className="card card--flush">
            {records.map((record, index) => (
              <li
                key={record.name + record.kind}
                className="row"
                style={{
                  padding: '11px var(--gap)',
                  borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                <span className="grow truncate">{record.name}</span>
                <span className="tabular" style={{ fontWeight: 650 }}>
                  {formatSet(record.kind, {
                    done: true,
                    reps: record.bestReps,
                    weight: record.bestWeight,
                    seconds: record.kind === 'time' ? record.best : undefined,
                    meters: record.kind === 'distance' ? record.best : undefined,
                  })}
                </span>
                {record.estimatedOneRm && (
                  <span className="tiny faint tabular" title="Geschätztes 1RM">
                    ~{record.estimatedOneRm} kg
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Gesamt</h2>
        <div className="card stack">
          <div className="row-between">
            <span className="muted">Trainingszeit</span>
            <strong className="tabular">
              {formatDurationShort(weeks.reduce((sum, week) => sum + week.seconds, 0))} (12 Wo.)
            </strong>
          </div>
          <div className="row-between">
            <span className="muted">Hebe-Volumen</span>
            <strong className="tabular">
              {formatVolume(weeks.reduce((sum, week) => sum + week.volume, 0))} (12 Wo.)
            </strong>
          </div>
          {totalDistance > 0 && (
            <div className="row-between">
              <span className="muted">Distanz total</span>
              <strong className="tabular">{formatDistance(totalDistance)}</strong>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
