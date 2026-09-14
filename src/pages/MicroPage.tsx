import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { MicroCard } from '../components/MicroCard';
import { ConfirmSheet, EmptyState, Field, Sheet } from '../components/ui';
import { IconBack, IconChevron, IconEdit, IconPlus, IconTrash } from '../components/Icons';
import { ACCENTS, createMicro, deleteMicro, deleteMicroEntry, nextAccent, updateMicro } from '../lib/actions';
import { addDays, formatRelativeDay, formatTime, toISODate, todayISO } from '../lib/date';
import { microTotal } from '../lib/stats';
import { useData } from '../lib/store';
import type { MicroExercise } from '../lib/types';

const ICONS = ['💪', '🔥', '⚡', '🏋️', '🦵', '🧗', '🤸', '🧱', '🎯', '⏱️', '🥊', '🪖'];

interface MicroDraft {
  name: string;
  icon: string;
  unit: 'reps' | 'seconds';
  dailyGoal: number;
  quickAdd: string;
  accent: string;
}

export function MicroPage() {
  const data = useData();
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState<MicroExercise | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<MicroDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MicroExercise | undefined>();

  const micros = data.micros.filter((m) => !m.archived);
  const entries = data.microEntries
    .filter((entry) => entry.date === date)
    .sort((a, b) => b.at - a.at);
  const isToday = date === todayISO();

  const openSheet = (micro?: MicroExercise) => {
    setEditing(micro);
    setDraft(
      micro
        ? {
            name: micro.name,
            icon: micro.icon,
            unit: micro.unit,
            dailyGoal: micro.dailyGoal,
            quickAdd: micro.quickAdd.join(', '),
            accent: micro.accent,
          }
        : {
            name: '',
            icon: ICONS[data.micros.length % ICONS.length]!,
            unit: 'reps',
            dailyGoal: 50,
            quickAdd: '5, 10, 20',
            accent: nextAccent(data.micros.length),
          },
    );
    setSheetOpen(true);
  };

  const save = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return;
    const quickAdd = draft.quickAdd
      .split(/[,\s]+/)
      .map((part) => Number(part))
      .filter((value) => Number.isFinite(value) && value > 0)
      .slice(0, 5);

    const payload = {
      name,
      icon: draft.icon,
      unit: draft.unit,
      dailyGoal: Math.max(0, Math.round(draft.dailyGoal || 0)),
      quickAdd: quickAdd.length > 0 ? quickAdd : [5, 10],
      accent: draft.accent,
    };

    if (editing) updateMicro(editing.id, payload);
    else createMicro(payload);

    setSheetOpen(false);
    setEditing(undefined);
  };

  return (
    <main className="page">
      <PageHeader
        eyebrow="Über den Tag verteilt"
        title="Mikro-Übungen"
        action={
          <button className="btn btn--primary btn--sm" onClick={() => openSheet()}>
            <IconPlus size={17} /> Neu
          </button>
        }
      />

      <div className="row-between card" style={{ padding: '8px 10px' }}>
        <button
          className="icon-btn"
          onClick={() => setDate(toISODate(addDays(new Date(`${date}T00:00`), -1)))}
          aria-label="Vorheriger Tag"
        >
          <IconBack size={18} />
        </button>
        <strong>{formatRelativeDay(date)}</strong>
        <button
          className="icon-btn"
          onClick={() => setDate(toISODate(addDays(new Date(`${date}T00:00`), 1)))}
          disabled={isToday}
          style={{ opacity: isToday ? 0.35 : 1 }}
          aria-label="Nächster Tag"
        >
          <IconChevron size={18} />
        </button>
      </div>

      {micros.length === 0 ? (
        <div style={{ marginTop: 'var(--gap)' }}>
          <EmptyState
            icon="⚡"
            title="Noch keine Mikro-Übungen"
            text="Klimmzüge im Türrahmen, Liegestützen zwischendurch, Planks am Abend - hier zählst du sie mit einem Tap."
            action={
              <button className="btn btn--primary" onClick={() => openSheet()}>
                <IconPlus size={18} /> Mikro-Übung anlegen
              </button>
            }
          />
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 'var(--gap)' }}>
          {micros.map((micro) => (
            <div key={micro.id}>
              <MicroCard micro={micro} date={date} />
              <div className="row" style={{ justifyContent: 'space-between', padding: '4px 6px 0' }}>
                <span className="tiny faint">
                  {lastSevenDays(micro, data.microEntries)
                    .map((value) => (value > 0 ? '▪' : '·'))
                    .join(' ')}{' '}
                  letzte 7 Tage
                </span>
                <button className="btn btn--quiet btn--sm" onClick={() => openSheet(micro)}>
                  <IconEdit size={15} /> Bearbeiten
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <section className="section">
          <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Erfassungen</h2>
          <ul className="card card--flush">
            {entries.map((entry, index) => {
              const micro = data.micros.find((m) => m.id === entry.microId);
              return (
                <li
                  key={entry.id}
                  className="row"
                  style={{
                    padding: '11px var(--gap)',
                    borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <span aria-hidden="true">{micro?.icon ?? '•'}</span>
                  <span className="grow truncate">{micro?.name ?? 'Gelöscht'}</span>
                  <span className="tabular" style={{ fontWeight: 650 }}>
                    +{entry.amount}
                  </span>
                  <span className="tiny faint tabular">{formatTime(entry.at)}</span>
                  <button
                    className="icon-btn"
                    style={{ width: 30, height: 30, color: 'var(--red)' }}
                    onClick={() => deleteMicroEntry(entry.id)}
                    aria-label="Erfassung löschen"
                  >
                    <IconTrash size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Sheet
        open={sheetOpen}
        title={editing ? 'Mikro-Übung bearbeiten' : 'Mikro-Übung anlegen'}
        onClose={() => setSheetOpen(false)}
      >
        {draft && (
          <div className="stack-lg">
            <Field label="Name">
              <input
                className="input"
                value={draft.name}
                placeholder="z.B. Klimmzüge"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>

            <div className="field">
              <span className="field__label">Symbol</span>
              <div className="row wrap" style={{ gap: 6 }}>
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    className={`chip ${draft.icon === icon ? 'chip--on' : ''}`}
                    style={{ minHeight: 40, minWidth: 44, justifyContent: 'center', fontSize: '1.1rem' }}
                    aria-pressed={draft.icon === icon}
                    onClick={() => setDraft({ ...draft, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-row">
              <Field label="Einheit">
                <select
                  className="select"
                  value={draft.unit}
                  onChange={(event) =>
                    setDraft({ ...draft, unit: event.target.value as 'reps' | 'seconds' })
                  }
                >
                  <option value="reps">Wiederholungen</option>
                  <option value="seconds">Sekunden</option>
                </select>
              </Field>
              <Field label="Tagesziel" hint="0 = kein Ziel">
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.dailyGoal}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => setDraft({ ...draft, dailyGoal: Number(event.target.value) })}
                />
              </Field>
            </div>

            <Field label="Schnell-Buttons" hint="Komma-getrennt, max. 5 Werte">
              <input
                className="input"
                value={draft.quickAdd}
                placeholder="5, 10, 20"
                onChange={(event) => setDraft({ ...draft, quickAdd: event.target.value })}
              />
            </Field>

            <div className="field">
              <span className="field__label">Farbe</span>
              <div className="row wrap">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent}
                    onClick={() => setDraft({ ...draft, accent })}
                    aria-label={`Farbe ${accent}`}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: accent,
                      border: draft.accent === accent ? '3px solid var(--text)' : '3px solid transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            <button className="btn btn--primary btn--block btn--lg" onClick={save} disabled={!draft.name.trim()}>
              Speichern
            </button>

            {editing && (
              <button
                className="btn btn--danger btn--block"
                onClick={() => {
                  setSheetOpen(false);
                  setConfirmDelete(editing);
                }}
              >
                <IconTrash /> Löschen
              </button>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        title={`"${confirmDelete?.name}" löschen?`}
        text="Alle erfassten Einträge dieser Übung werden ebenfalls entfernt."
        onCancel={() => setConfirmDelete(undefined)}
        onConfirm={() => {
          if (confirmDelete) deleteMicro(confirmDelete.id);
          setConfirmDelete(undefined);
          setEditing(undefined);
        }}
      />
    </main>
  );
}

/** Tagessummen der letzten 7 Tage, ältester Tag zuerst. */
function lastSevenDays(micro: MicroExercise, entries: ReturnType<typeof useData>['microEntries']) {
  return Array.from({ length: 7 }, (_, index) =>
    microTotal(entries, micro.id, toISODate(addDays(new Date(), index - 6))),
  );
}
