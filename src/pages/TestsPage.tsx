import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Sparkline } from '../components/Charts';
import { ConfirmSheet, EmptyState, Field, ProgressBar, SegmentedControl, Sheet } from '../components/ui';
import { useToast } from '../components/Toast';
import { IconEdit, IconPlus, IconTrash } from '../components/Icons';
import { createTest, deleteTest, deleteTestResult, logTestResult, updateTest } from '../lib/actions';
import { formatDate, todayISO } from '../lib/date';
import { testProgress } from '../lib/stats';
import { useData } from '../lib/store';
import type { StandardTest } from '../lib/types';

/**
 * Startvorlage für die Selektions-Disziplinen. Bewusst als Vorschlag mit
 * runden Richtwerten - die verbindlichen Zahlen holt sich Janick aus den
 * offiziellen Unterlagen und passt die Ziele hier an.
 */
const TEMPLATE: Omit<StandardTest, 'id' | 'order'>[] = [
  { name: 'Klimmzüge', unit: 'Wdh.', goal: 12, higherIsBetter: true },
  { name: 'Liegestützen (60 Sek.)', unit: 'Wdh.', goal: 45, higherIsBetter: true },
  { name: 'Rumpfheben (60 Sek.)', unit: 'Wdh.', goal: 40, higherIsBetter: true },
  { name: 'Standweitsprung', unit: 'cm', goal: 220, higherIsBetter: true },
  { name: '12-Min-Lauf', unit: 'm', goal: 2800, higherIsBetter: true },
  { name: '200 m Schwimmen', unit: 'Sek.', goal: 240, higherIsBetter: false },
  { name: 'Marsch 12 km mit Gepäck', unit: 'Min.', goal: 120, higherIsBetter: false },
];

interface TestDraft {
  name: string;
  unit: string;
  goal: number;
  higherIsBetter: boolean;
  note: string;
}

export function TestsPage() {
  const data = useData();
  const toast = useToast();
  const progress = testProgress(data);

  const [editing, setEditing] = useState<StandardTest | undefined>();
  const [draft, setDraft] = useState<TestDraft | null>(null);
  const [logging, setLogging] = useState<StandardTest | undefined>();
  const [logValue, setLogValue] = useState('');
  const [logDate, setLogDate] = useState(todayISO());
  const [confirmDelete, setConfirmDelete] = useState<StandardTest | undefined>();

  const openEditor = (test?: StandardTest) => {
    setEditing(test);
    setDraft(
      test
        ? { name: test.name, unit: test.unit, goal: test.goal, higherIsBetter: test.higherIsBetter, note: test.note ?? '' }
        : { name: '', unit: 'Wdh.', goal: 10, higherIsBetter: true, note: '' },
    );
  };

  const saveTest = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return;
    const payload = {
      name,
      unit: draft.unit.trim() || 'Wdh.',
      goal: Number(draft.goal) || 0,
      higherIsBetter: draft.higherIsBetter,
      note: draft.note.trim() || undefined,
    };
    if (editing) updateTest(editing.id, payload);
    else createTest(payload);
    setDraft(null);
    setEditing(undefined);
  };

  const saveResult = () => {
    if (!logging) return;
    const value = Number(logValue.replace(',', '.'));
    if (!Number.isFinite(value)) return;
    logTestResult(logging.id, value, logDate);
    const better = logging.higherIsBetter ? value >= logging.goal : value <= logging.goal;
    toast(better ? '🎯 Ziel erreicht!' : 'Ergebnis gespeichert');
    setLogging(undefined);
    setLogValue('');
  };

  const loadTemplate = () => {
    TEMPLATE.forEach((test) => createTest(test));
    toast('Vorlage geladen - Ziele anpassen nicht vergessen');
  };

  return (
    <main className="page">
      <PageHeader
        eyebrow="Anforderungen"
        title="Grenadier-Tests"
        back="/mehr"
        action={
          <button className="btn btn--primary btn--sm" onClick={() => openEditor()}>
            <IconPlus size={17} /> Neu
          </button>
        }
      />

      {progress.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Noch keine Tests"
          text="Lege die Disziplinen an, an denen du dich misst - oder starte mit der Vorlage und passe die Zielwerte an."
          action={
            <div className="stack" style={{ width: '100%' }}>
              <button className="btn btn--primary btn--block" onClick={loadTemplate}>
                Vorlage laden
              </button>
              <button className="btn btn--ghost btn--block" onClick={() => openEditor()}>
                <IconPlus size={18} /> Eigenen Test anlegen
              </button>
            </div>
          }
        />
      ) : (
        <div className="stack">
          {progress.map(({ test, best, latest, history, ratio, reached }) => (
            <div key={test.id} className="card" style={{ borderColor: reached ? 'var(--accent)' : undefined }}>
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 7 }}>
                    <strong className="truncate">{test.name}</strong>
                    {reached && <span className="chip chip--on tiny">erreicht</span>}
                  </div>
                  <span className="small muted tabular">
                    Ziel {test.goal} {test.unit}
                    {test.higherIsBetter ? ' oder mehr' : ' oder weniger'}
                  </span>
                </div>
                <button
                  className="icon-btn"
                  style={{ width: 32, height: 32 }}
                  onClick={() => openEditor(test)}
                  aria-label={`${test.name} bearbeiten`}
                >
                  <IconEdit size={15} />
                </button>
              </div>

              <div style={{ margin: '11px 0 7px' }}>
                <ProgressBar value={ratio} color={reached ? 'var(--accent)' : 'var(--amber)'} />
              </div>

              <div className="row-between small">
                <span className="muted">
                  {best ? (
                    <>
                      Best: <strong className="tabular">{best.value} {test.unit}</strong>
                    </>
                  ) : (
                    'Noch kein Ergebnis'
                  )}
                </span>
                {latest && best && latest.id !== best.id && (
                  <span className="faint tabular">zuletzt {latest.value}</span>
                )}
              </div>

              {history.length > 1 && (
                <div style={{ marginTop: 8 }}>
                  <Sparkline
                    points={history.map((r) => r.value)}
                    goal={test.goal}
                    higherIsBetter={test.higherIsBetter}
                    color="var(--blue)"
                  />
                </div>
              )}

              {test.note && <p className="tiny faint" style={{ marginTop: 6 }}>{test.note}</p>}

              <button
                className="btn btn--ghost btn--block btn--sm"
                style={{ marginTop: 'var(--gap-sm)' }}
                onClick={() => {
                  setLogging(test);
                  setLogValue('');
                  setLogDate(todayISO());
                }}
              >
                <IconPlus size={15} /> Ergebnis erfassen
              </button>

              {history.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary className="small muted" style={{ cursor: 'pointer' }}>
                    Verlauf ({history.length})
                  </summary>
                  <ul className="stack" style={{ marginTop: 8, gap: 5 }}>
                    {[...history].reverse().map((result) => (
                      <li key={result.id} className="row small">
                        <span className="grow faint tabular">{formatDate(result.date)}</span>
                        <span className="tabular">
                          {result.value} {test.unit}
                        </span>
                        <button
                          className="icon-btn"
                          style={{ width: 26, height: 26, color: 'var(--red)' }}
                          onClick={() => deleteTestResult(result.id)}
                          aria-label="Ergebnis löschen"
                        >
                          <IconTrash size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {progress.length > 0 && (
        <p className="tiny faint center" style={{ marginTop: 'var(--gap-lg)' }}>
          Die Zielwerte setzt du selbst. Gleiche sie mit den offiziellen Vorgaben deiner Selektion ab.
        </p>
      )}

      {/* Ergebnis erfassen */}
      <Sheet open={Boolean(logging)} title={logging?.name} onClose={() => setLogging(undefined)}>
        <div className="stack-lg">
          <Field label={`Ergebnis in ${logging?.unit ?? ''}`}>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              autoFocus
              value={logValue}
              onChange={(event) => setLogValue(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && saveResult()}
            />
          </Field>
          <Field label="Datum">
            <input
              className="input"
              type="date"
              value={logDate}
              max={todayISO()}
              onChange={(event) => setLogDate(event.target.value)}
            />
          </Field>
          <button className="btn btn--primary btn--block btn--lg" onClick={saveResult} disabled={logValue === ''}>
            Speichern
          </button>
        </div>
      </Sheet>

      {/* Test anlegen / bearbeiten */}
      <Sheet
        open={Boolean(draft)}
        title={editing ? 'Test bearbeiten' : 'Test anlegen'}
        onClose={() => {
          setDraft(null);
          setEditing(undefined);
        }}
      >
        {draft && (
          <div className="stack-lg">
            <Field label="Bezeichnung">
              <input
                className="input"
                value={draft.name}
                placeholder="z.B. Klimmzüge"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <div className="field-row">
              <Field label="Einheit">
                <input
                  className="input"
                  value={draft.unit}
                  placeholder="Wdh. / m / Sek."
                  onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
                />
              </Field>
              <Field label="Zielwert">
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  value={draft.goal}
                  onChange={(event) => setDraft({ ...draft, goal: Number(event.target.value) })}
                />
              </Field>
            </div>
            <div className="field">
              <span className="field__label">Bewertung</span>
              <SegmentedControl
                value={draft.higherIsBetter ? 'more' : 'less'}
                options={[
                  { value: 'more', label: 'Mehr ist besser' },
                  { value: 'less', label: 'Weniger ist besser' },
                ]}
                onChange={(value) => setDraft({ ...draft, higherIsBetter: value === 'more' })}
              />
            </div>
            <Field label="Notiz">
              <input
                className="input"
                value={draft.note}
                placeholder="Bedingungen, Ausrüstung ..."
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              />
            </Field>
            <button className="btn btn--primary btn--block btn--lg" onClick={saveTest} disabled={!draft.name.trim()}>
              Speichern
            </button>
            {editing && (
              <button
                className="btn btn--danger btn--block"
                onClick={() => {
                  setConfirmDelete(editing);
                  setDraft(null);
                }}
              >
                <IconTrash /> Test löschen
              </button>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        title={`"${confirmDelete?.name}" löschen?`}
        text="Alle erfassten Ergebnisse dieses Tests werden ebenfalls entfernt."
        onCancel={() => setConfirmDelete(undefined)}
        onConfirm={() => {
          if (confirmDelete) deleteTest(confirmDelete.id);
          setConfirmDelete(undefined);
          setEditing(undefined);
        }}
      />
    </main>
  );
}
