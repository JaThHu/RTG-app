import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Field, Switch } from '../components/ui';
import { useToast } from '../components/Toast';
import { IconBell, IconCheck } from '../components/Icons';
import { updateSettings } from '../lib/actions';
import { WEEKDAYS_SHORT } from '../lib/date';
import { showNotification, useNotificationState } from '../lib/notifications';
import type { NotificationState } from '../lib/notifications';
import {
  copiedCode,
  ensureVapidKeys,
  githubRepoUrl,
  pushCode,
  pushSupported,
  rememberCopiedCode,
  subscribePush,
  unsubscribePush,
  usePushSubscription,
} from '../lib/push';
import { plannedDays } from '../lib/stats';
import { useData } from '../lib/store';

function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Halbstunden von 05:00 bis 23:30 - der Absender läuft im 30-Minuten-Takt. */
const WORKOUT_TIMES = Array.from({ length: 38 }, (_, i) => hhmm(5 * 60 + i * 30));
const MICRO_TIMES = Array.from({ length: 16 }, (_, i) => hhmm((7 + i) * 60));

export function RemindersPage() {
  const data = useData();
  const { settings } = data;
  const toast = useToast();
  const [permission, requestPermission] = useNotificationState();
  const push = usePushSubscription();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(copiedCode);

  const days = plannedDays(data);
  const plannedLabel = WEEKDAYS_SHORT.filter((_, index) => days[index + 1]).join(', ');
  const hasMicros = data.micros.some((m) => !m.archived && m.dailyGoal > 0);
  const code = pushCode(data, push.subscription);
  const repo = githubRepoUrl();
  const canPush = pushSupported() && permission !== 'ios-browser' && permission !== 'unsupported';

  // Schlüssel vorab erzeugen: Auf iOS soll zwischen Tap und Abo nichts Langes liegen.
  useEffect(() => {
    if (pushSupported()) void ensureVapidKeys().catch(() => undefined);
  }, []);

  const enablePush = async () => {
    setBusy(true);
    setError(null);
    try {
      if ((await requestPermission()) !== 'granted') {
        setError('Ohne Erlaubnis für Benachrichtigungen geht es nicht.');
        return;
      }
      await subscribePush();
      await push.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push konnte nicht aktiviert werden.');
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    try {
      await unsubscribePush();
      setCopied(undefined);
      await push.refresh();
      toast('Push aus - Secret RTG_PUSH in GitHub löschen');
    } finally {
      setBusy(false);
    }
  };

  const markCopied = () => {
    if (!code) return;
    rememberCopiedCode(code);
    setCopied(code);
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      markCopied();
      toast('Code kopiert');
    } catch {
      toast('Kopieren ging nicht - Code im Feld markieren und kopieren');
    }
  };

  const toggleMicroTime = (time: string) => {
    const times = settings.remindMicroTimes.includes(time)
      ? settings.remindMicroTimes.filter((t) => t !== time)
      : [...settings.remindMicroTimes, time].sort();
    updateSettings({ remindMicroTimes: times });
  };

  const subscribed = Boolean(push.subscription);
  const codeCurrent = Boolean(code) && copied === code;
  const codeOutdated = Boolean(code) && Boolean(copied) && copied !== code;

  return (
    <main className="page">
      <PageHeader eyebrow="Benachrichtigungen" title="Erinnerungen" back="/mehr" />

      <PermissionCard state={permission} onRequest={() => void requestPermission()} />

      <section className="section">
        <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Im Workout</h2>
        <div className="card">
          <Switch
            label="Pause vorbei melden"
            hint="Wenn die Satzpause abläuft, während du in einer anderen App bist. Klappt auf Android - iOS hält Web-Apps im Hintergrund an."
            checked={settings.notifyTimer}
            onChange={(notifyTimer) => updateSettings({ notifyTimer })}
          />
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Erinnerungen</h2>
          {!subscribed && !push.loading && <span className="chip chip--amber">Push noch nicht eingerichtet</span>}
        </div>
        <div className="card">
          <Switch
            label="Training"
            hint={plannedLabel ? `An Trainingstagen laut Plan (${plannedLabel})` : 'Im Plan sind noch keine Wochentage gesetzt'}
            checked={settings.remindWorkout}
            onChange={(remindWorkout) => updateSettings({ remindWorkout })}
          />
          {settings.remindWorkout && (
            <div style={{ marginTop: 'var(--gap-sm)' }}>
              <Field label="Uhrzeit">
                <select
                  className="select"
                  value={settings.remindWorkoutTime}
                  onChange={(event) => updateSettings({ remindWorkoutTime: event.target.value })}
                >
                  {WORKOUT_TIMES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          <div className="divider" />

          <Switch
            label="Mikro-Übungen"
            hint={hasMicros ? 'Sagt, was bis zum Tagesziel noch fehlt' : 'Noch keine Mikro-Übung mit Tagesziel angelegt'}
            checked={settings.remindMicro}
            onChange={(remindMicro) => updateSettings({ remindMicro })}
          />
          {settings.remindMicro && (
            <div className="field" style={{ marginTop: 'var(--gap-sm)' }}>
              <span className="field__label">Uhrzeiten</span>
              <div className="row wrap" style={{ gap: 6 }}>
                {MICRO_TIMES.map((time) => {
                  const on = settings.remindMicroTimes.includes(time);
                  return (
                    <button
                      key={time}
                      className={`chip ${on ? 'chip--on' : ''}`}
                      style={{ minHeight: 36, minWidth: 54, justifyContent: 'center' }}
                      aria-pressed={on}
                      onClick={() => toggleMicroTime(time)}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Push einrichten</h2>
        {!canPush ? (
          <div className="card">
            <p className="small muted">
              Push braucht einen Browser mit Benachrichtigungen - auf dem iPhone die App vom Home-Bildschirm.
            </p>
          </div>
        ) : (
          <div className="card stack-lg">
            <p className="small muted">
              Damit Erinnerungen auch bei geschlossener App kommen, verschickt sie ein geplanter Lauf in deinem
              GitHub-Repo - alle 30 Minuten, kostenlos. Einmal einrichten:
            </p>

            <ol className="steps">
              <li data-done={subscribed}>
                <div className="stack">
                  <strong>Push auf diesem Gerät aktivieren</strong>
                  {subscribed ? (
                    <div className="row-between">
                      <span className="small" style={{ color: 'var(--accent)' }}>
                        Aktiv
                      </span>
                      <button className="btn btn--sm btn--quiet" onClick={() => void disablePush()} disabled={busy}>
                        Ausschalten
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn--primary btn--block"
                      onClick={() => void enablePush()}
                      disabled={busy || push.loading || permission === 'denied'}
                    >
                      <IconBell size={18} /> Push aktivieren
                    </button>
                  )}
                  {error && <p className="small" style={{ color: 'var(--red)' }}>{error}</p>}
                </div>
              </li>

              <li data-done={codeCurrent}>
                <div className="stack">
                  <strong>Push-Code kopieren</strong>
                  {code ? (
                    <>
                      <textarea
                        className="textarea code-box"
                        readOnly
                        value={code}
                        aria-label="Push-Code"
                        onFocus={(event) => event.target.select()}
                        onCopy={markCopied}
                      />
                      <button className="btn btn--block" onClick={() => void copy()}>
                        {codeCurrent ? <IconCheck size={17} /> : null} {codeCurrent ? 'Kopiert' : 'Code kopieren'}
                      </button>
                      {codeOutdated && (
                        <p className="small" style={{ color: 'var(--amber)' }}>
                          Plan oder Zeiten haben sich geändert. Code neu kopieren und das Secret ersetzen.
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="small faint">Erscheint, sobald Push aktiv ist.</span>
                  )}
                </div>
              </li>

              <li>
                <div className="stack">
                  <strong>Als Secret im Repo speichern</strong>
                  <span className="small muted">
                    Settings → Secrets and variables → Actions → New repository secret. Name{' '}
                    <code className="code-inline">RTG_PUSH</code>, als Wert den Code einfügen.
                  </span>
                  {repo && (
                    <a className="btn btn--ghost btn--block" href={`${repo}/settings/secrets/actions/new`} target="_blank" rel="noreferrer">
                      Secret anlegen ↗
                    </a>
                  )}
                </div>
              </li>

              <li>
                <div className="stack">
                  <strong>Testen</strong>
                  <span className="small muted">
                    Actions → Erinnerungen → Run workflow. Nach etwa einer Minute kommt eine Test-Benachrichtigung.
                  </span>
                  {repo && (
                    <a className="btn btn--ghost btn--block" href={`${repo}/actions/workflows/reminders.yml`} target="_blank" rel="noreferrer">
                      Workflow öffnen ↗
                    </a>
                  )}
                </div>
              </li>
            </ol>

            <p className="tiny faint">
              Erinnerungen kommen meist ein paar Minuten nach der eingestellten Zeit. Zeiten oder Trainingstage
              geändert? Code neu kopieren und das Secret ersetzen. Passiert 60 Tage lang nichts im Repo, pausiert
              GitHub den Lauf - dann unter Actions wieder einschalten.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function PermissionCard({ state, onRequest }: { state: NotificationState; onRequest: () => void }) {
  const [testSent, setTestSent] = useState(false);

  if (state === 'granted') {
    return (
      <div className="card row-between">
        <span className="row" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          <IconCheck size={18} /> Benachrichtigungen erlaubt
        </span>
        <button
          className="btn btn--sm btn--ghost"
          onClick={() => {
            void showNotification({ title: 'RTG', body: 'So sieht eine Benachrichtigung aus.', tag: 'rtg-test', path: '/mehr/erinnerungen' });
            setTestSent(true);
          }}
        >
          {testSent ? 'Nochmal' : 'Test'}
        </button>
      </div>
    );
  }

  const text: Record<Exclude<NotificationState, 'granted'>, string> = {
    default: 'Damit RTG sich melden darf, braucht es einmal deine Erlaubnis.',
    denied: 'Benachrichtigungen sind blockiert. In den Einstellungen des Handys bei RTG bzw. beim Browser wieder erlauben.',
    'ios-browser':
      'Auf dem iPhone gibt es Benachrichtigungen nur in der installierten App: in Safari Teilen → Zum Home-Bildschirm, dann RTG vom Home-Bildschirm aus öffnen (ab iOS 16.4).',
    unsupported: 'Dieser Browser kann keine Benachrichtigungen anzeigen.',
  };

  return (
    <div className="card card--accent stack">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <IconBell size={20} />
        <p className="small grow">{text[state]}</p>
      </div>
      {state === 'default' && (
        <button className="btn btn--primary btn--block" onClick={onRequest}>
          Benachrichtigungen erlauben
        </button>
      )}
    </div>
  );
}
