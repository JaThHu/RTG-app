import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ConfirmSheet, Field, Switch } from '../components/ui';
import { useToast } from '../components/Toast';
import { IconChevron, IconTarget } from '../components/Icons';
import { updateSettings } from '../lib/actions';
import { dataSummary, exportBackup, importBackup } from '../lib/backup';
import { replaceAll, useData } from '../lib/store';
import { emptyData } from '../lib/types';

export function MorePage() {
  const data = useData();
  const settings = data.settings;
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState<File | null>(null);

  const runImport = async (file: File) => {
    const result = await importBackup(file);
    toast(result.ok ? 'Backup eingespielt' : result.error);
  };

  return (
    <main className="page">
      <PageHeader eyebrow="Einstellungen" title="Mehr" />

      <div className="stack">
        <Link to="/mehr/tests" className="list-item">
          <IconTarget />
          <span className="grow">
            <strong style={{ display: 'block' }}>Grenadier-Tests</strong>
            <span className="small muted">
              {data.tests.length > 0 ? `${data.tests.length} Disziplinen` : 'Anforderungen festlegen'}
            </span>
          </span>
          <IconChevron className="faint" />
        </Link>
        <Link to="/verlauf" className="list-item">
          <span className="grow">
            <strong style={{ display: 'block' }}>Verlauf</strong>
            <span className="small muted">Alle abgeschlossenen Workouts</span>
          </span>
          <IconChevron className="faint" />
        </Link>
      </div>

      <section className="section">
        <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Ziel</h2>
        <div className="card stack-lg">
          <Field label="Bezeichnung">
            <input
              className="input"
              value={settings.targetLabel}
              placeholder="Selektion, RS, Marschtest ..."
              onChange={(event) => updateSettings({ targetLabel: event.target.value })}
            />
          </Field>
          <Field label="Zieldatum" hint="Leer lassen, um den Countdown auszublenden">
            <input
              className="input"
              type="date"
              value={settings.targetDate ?? ''}
              onChange={(event) => updateSettings({ targetDate: event.target.value || undefined })}
            />
          </Field>
        </div>
      </section>

      <section className="section">
        <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Workout</h2>
        <div className="card">
          <Switch
            label="Bildschirm wachhalten"
            hint="Verhindert, dass das Handy mitten im Satz zugeht"
            checked={settings.keepAwake}
            onChange={(keepAwake) => updateSettings({ keepAwake })}
          />
          <div className="divider" />
          <Switch
            label="Pause automatisch starten"
            hint="Startet den Timer, sobald ein Satz abgehakt ist"
            checked={settings.autoRest}
            onChange={(autoRest) => updateSettings({ autoRest })}
          />
          <div className="divider" />
          <Switch
            label="Signalton"
            checked={settings.timerSound}
            onChange={(timerSound) => updateSettings({ timerSound })}
          />
          <div className="divider" />
          <Switch
            label="Vibration"
            checked={settings.timerVibrate}
            onChange={(timerVibrate) => updateSettings({ timerVibrate })}
          />
          <div className="divider" />
          <Field label="Standard-Satzpause (Sek.)">
            <input
              className="input"
              type="number"
              inputMode="numeric"
              step="15"
              min={0}
              value={settings.defaultRestSeconds}
              onFocus={(event) => event.target.select()}
              onChange={(event) =>
                updateSettings({ defaultRestSeconds: Math.max(0, Number(event.target.value) || 0) })
              }
            />
          </Field>
        </div>
      </section>

      <section className="section">
        <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Darstellung</h2>
        <div className="card">
          <Switch
            label="Helles Design"
            hint="Standard ist dunkel - besser im Gym"
            checked={settings.theme === 'light'}
            onChange={(light) => updateSettings({ theme: light ? 'light' : 'dark' })}
          />
          <div className="divider" />
          <Switch
            label="Woche beginnt am Sonntag"
            checked={settings.weekStart === 7}
            onChange={(sunday) => updateSettings({ weekStart: sunday ? 7 : 1 })}
          />
        </div>
      </section>

      <section className="section">
        <h2 style={{ marginBottom: 'var(--gap-sm)' }}>Daten</h2>
        <div className="card stack">
          <p className="small muted">
            Alle Daten liegen nur auf diesem Gerät. Lade regelmässig ein Backup herunter - beim Leeren
            der Browserdaten wären sie sonst weg.
          </p>
          <p className="tiny faint">{dataSummary(data)}</p>
          <button
            className="btn btn--block"
            onClick={() => {
              exportBackup();
              toast('Backup heruntergeladen');
            }}
          >
            Backup exportieren
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => fileInput.current?.click()}>
            Backup importieren
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) setConfirmImport(file);
            }}
          />
          <button className="btn btn--danger btn--block" onClick={() => setConfirmReset(true)}>
            Alle Daten löschen
          </button>
        </div>
      </section>

      <p className="tiny faint center" style={{ marginTop: 'var(--gap-xl)' }}>
        RTG · Road To Grenadier
        <br />
        Läuft offline. Zum Homescreen hinzufügen für den App-Start.
      </p>

      <ConfirmSheet
        open={Boolean(confirmImport)}
        title="Backup einspielen?"
        text="Die aktuellen Daten auf diesem Gerät werden vollständig durch das Backup ersetzt."
        confirmLabel="Ersetzen"
        onCancel={() => setConfirmImport(null)}
        onConfirm={() => {
          const file = confirmImport;
          setConfirmImport(null);
          if (file) void runImport(file);
        }}
      />

      <ConfirmSheet
        open={confirmReset}
        title="Wirklich alles löschen?"
        text="Plan, Verlauf, Mikro-Übungen und Tests werden unwiderruflich entfernt. Exportiere vorher ein Backup."
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          replaceAll(emptyData());
          setConfirmReset(false);
          toast('Alle Daten gelöscht');
        }}
      />
    </main>
  );
}
