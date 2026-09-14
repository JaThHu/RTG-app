import { addDays, toISODate, WEEKDAYS_SHORT } from '../lib/date';

/**
 * Schlanke SVG-Charts ohne Chart-Library - bei dieser Datenmenge wäre eine
 * Abhängigkeit grösser als die Auswertung selbst.
 */

export function BarChart({
  data,
  color = 'var(--accent)',
  height = 120,
  format = (value: number) => String(Math.round(value)),
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  // Ab etwa 8 Balken wird es unter 40px pro Spalte eng fuer ein volles Datum.
  const labelEvery = data.length > 8 ? Math.ceil(data.length / 5) : 1;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          height,
          padding: '14px 0 0',
        }}
      >
        {data.map((item, index) => {
          const ratio = item.value / max;
          const isLast = index === data.length - 1;
          return (
            <div key={index} className="grow" style={{ textAlign: 'center', minWidth: 0 }}>
              <div
                className="tiny tabular"
                style={{
                  color: item.value > 0 ? 'var(--text-muted)' : 'transparent',
                  marginBottom: 3,
                  fontSize: '0.62rem',
                }}
              >
                {format(item.value)}
              </div>
              <div
                title={`${item.label}: ${format(item.value)}`}
                style={{
                  height: `${Math.max(ratio * (height - 34), item.value > 0 ? 4 : 2)}px`,
                  borderRadius: 5,
                  background: item.value > 0 ? color : 'var(--surface-3)',
                  opacity: isLast ? 1 : 0.72,
                  transition: 'height 0.35s var(--ease)',
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
        {data.map((item, index) => (
          <div
            key={index}
            className="grow tiny faint"
            style={{ textAlign: 'center', fontSize: '0.6rem', whiteSpace: 'nowrap' }}
          >
            {/* Bei vielen Balken nur jedes n-te Label zeigen, sonst ueberlappen sie. */}
            {index % labelEvery === 0 || index === data.length - 1 ? item.label : '\u00a0'}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kalender-Heatmap der aktiven Tage, Spalten = Wochen. */
export function Heatmap({ days, weeks = 16 }: { days: Set<string>; weeks?: number }) {
  const today = new Date();
  const offsetToMonday = (today.getDay() + 6) % 7;
  const lastMonday = addDays(today, -offsetToMonday);

  const columns = Array.from({ length: weeks }, (_, weekIndex) => {
    const monday = addDays(lastMonday, -(weeks - 1 - weekIndex) * 7);
    return Array.from({ length: 7 }, (_, dayIndex) => addDays(monday, dayIndex));
  });

  const todayISO = toISODate(today);

  return (
    <div className="row" style={{ gap: 6, alignItems: 'flex-start' }}>
      <div style={{ display: 'grid', gap: 3, flex: 'none' }}>
        {WEEKDAYS_SHORT.map((label, index) => (
          <span
            key={label}
            className="tiny faint"
            style={{ height: 13, lineHeight: '13px', fontSize: '0.58rem', opacity: index % 2 ? 0 : 1 }}
          >
            {label}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto' }} className="grow">
        {columns.map((column, weekIndex) => (
          <div key={weekIndex} style={{ display: 'grid', gap: 3 }}>
            {column.map((date) => {
              const iso = toISODate(date);
              const future = iso > todayISO;
              const active = days.has(iso);
              return (
                <div
                  key={iso}
                  title={iso}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    background: future
                      ? 'var(--surface)'
                      : active
                        ? 'var(--accent)'
                        : 'var(--surface-3)',
                    opacity: future ? 0.5 : 1,
                    outline: iso === todayISO ? '1.5px solid var(--text-muted)' : 'none',
                    outlineOffset: 1,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Verlaufslinie mit Zielmarke - für die Testergebnisse. */
export function Sparkline({
  points,
  goal,
  higherIsBetter,
  color = 'var(--accent)',
  height = 56,
}: {
  points: number[];
  goal?: number;
  higherIsBetter?: boolean;
  color?: string;
  height?: number;
}) {
  if (points.length === 0) return null;

  const width = 240;
  const values = goal !== undefined ? [...points, goal] : points;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;

  const x = (index: number) =>
    points.length === 1 ? width / 2 : (index / (points.length - 1)) * (width - pad * 2) + pad;
  const y = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2);

  const path = points.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(value)}`).join(' ');
  const lastValue = points[points.length - 1]!;
  const reached =
    goal !== undefined && (higherIsBetter ? lastValue >= goal : lastValue <= goal);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {goal !== undefined && (
        <line
          x1={0}
          x2={width}
          y1={y(goal)}
          y2={y(goal)}
          stroke="var(--text-faint)"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={reached ? 'var(--accent)' : color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((value, index) => (
        <circle key={index} cx={x(index)} cy={y(value)} r={2.5} fill={reached ? 'var(--accent)' : color} />
      ))}
    </svg>
  );
}
