# RTG — Road To Grenadier

Trainings-App fürs Handy: Trainingsplan während des Workouts griffbereit, Mikro-Übungen
über den Tag mittracken, Fortschritt gegen die Selektions-Anforderungen messen.

Läuft komplett offline im Browser, ohne Login und ohne Server. Alle Daten liegen
lokal auf dem Gerät.

## Features

**Heute** — Der Startbildschirm. Countdown bis zum Zieldatum, das für heute geplante
Workout mit Start-Button, Mikro-Übungen zum direkt Abhaken, Wochenübersicht und Serie.

**Plan** — Workout-Vorlagen mit Übungen, Sätzen, Zielwerten und Satzpausen. Jede Vorlage
lässt sich Wochentagen zuordnen; daraus entsteht der Wochenplan.

Vier Übungsarten, jede mit passenden Eingabefeldern:

| Art | Beispiel | erfasst |
|---|---|---|
| Wiederholungen | Klimmzüge | Wdh. pro Satz |
| Gewicht | Bankdrücken | kg × Wdh. |
| Zeit | Plank | Sekunden, mit Countdown |
| Distanz | Dauerlauf | Meter |

**Workout-Modus** — Vollbild, grosse Touch-Flächen. Satz antippen zum Abhaken; leere
Felder werden dabei automatisch mit dem Zielwert oder dem Wert des Vorsatzes gefüllt,
sodass ein Standard-Satz genau ein Tap kostet. Danach startet die Satzpause von selbst.
Der Bildschirm bleibt während des Trainings an (Wake Lock), die Werte vom letzten Mal
stehen bei jeder Übung als Referenz. Übungen und Sätze lassen sich spontan ergänzen.

**Gewichte notieren** — Beim Beenden eines Workouts gibt es für jede gemachte Übung ein
Gewichtsfeld, vorausgefüllt mit dem Gewicht vom letzten Mal; ±2.5 kg per Knopf. Das
geht bei jeder Übungsart (Zusatzgewicht bei Klimmzügen, Rucksack beim Marsch). Bei
Gewicht-Übungen landet der Wert in allen Sätzen, damit Volumen und Bestwerte stimmen —
Pyramiden mit verschiedenen Gewichten bleiben unangetastet, solange man nichts einträgt.
Nachträglich änderbar im Verlauf beim jeweiligen Workout.

**Pausen-Timer** — Läuft zeitstempelbasiert, stimmt also auch, wenn der Browser im
Hintergrund drosselt. Signalton und Vibration am Ende, ±15/30 Sekunden und Skip.
Bei Zeit-Übungen lässt sich der Timer als Übungs-Countdown starten — läuft er ab,
ist der Satz abgehakt.

**Mikro** — Klimmzüge im Türrahmen, Liegestützen zwischendurch. Tagesziel pro Übung,
Ring füllt sich, Quick-Add-Buttons mit eigenen Werten, Rückgängig-Knopf, Tage
zurückblättern.

**Stats** — 12-Wochen-Verlauf (Workouts, Sätze, Volumen, Mikro), Heatmap der aktiven
Tage, Mikro-Trend über 14 Tage, aktuelles Gewicht je Übung mit Veränderung seit dem
ersten Eintrag, Bestleistungen je Übung inkl. geschätztem 1RM.

**Erinnerungen** — Unter *Mehr → Erinnerungen*:

- *Pause vorbei*: Benachrichtigung, wenn die Satzpause abläuft, während man in einer
  anderen App ist. Funktioniert ohne Einrichtung auf Android; iOS hält Web-Apps im
  Hintergrund an.
- *Training*: an Tagen mit geplantem Workout zur eingestellten Uhrzeit ("Heute: Push A").
- *Mikro-Übungen*: zu frei wählbaren Uhrzeiten, mit dem, was bis zum Tagesziel fehlt
  ("Liegestützen: noch 30 Wdh."). Ist alles erledigt, kommt nur eine stille Bestätigung.

Training- und Mikro-Erinnerungen kommen per Push, also auch bei geschlossener App —
siehe [Push-Erinnerungen einrichten](#push-erinnerungen-einrichten).

**Grenadier-Tests** — Eigene Disziplinen mit Zielwert und Richtung ("mehr ist besser"
bzw. "weniger ist besser" für Laufzeiten). Fortschrittsbalken, Verlaufslinie mit
Zielmarke. Eine Startvorlage mit den üblichen Disziplinen ist hinterlegt — **die
Zielwerte darin sind Richtwerte und müssen gegen die offiziellen Vorgaben abgeglichen
werden.**

## Daten

Alles liegt in `localStorage` dieses Browsers. Kein Konto, keine Übertragung, kein Tracking.

Das heisst auch: **Browserdaten löschen löscht die Trainingsdaten.** Unter *Mehr → Daten*
gibt es Export und Import als JSON — ab und zu ein Backup ziehen.

Ausnahme, nur wenn man sie einrichtet: Für Push-Erinnerungen liegen das Push-Abo des
Handys, die Erinnerungszeiten und die Namen der geplanten Workouts als Secret im eigenen
GitHub-Repo. Trainingsdaten verlassen das Gerät auch dann nicht — der Text der
Erinnerung entsteht erst auf dem Handy.

## Push-Erinnerungen einrichten

Web Push braucht jemanden, der die Nachricht zur richtigen Zeit verschickt. Statt eines
eigenen Servers erledigt das ein geplanter GitHub-Actions-Lauf in diesem Repo
(`.github/workflows/reminders.yml`, alle 30 Minuten, für öffentliche Repos kostenlos).

1. **App installieren.** Auf dem iPhone geht Push nur vom Home-Bildschirm aus (ab iOS 16.4).
2. In der App *Mehr → Erinnerungen*: Zeiten wählen, **Push aktivieren**, **Code kopieren**.
3. Im Repo **Settings → Secrets and variables → Actions → New repository secret**:
   Name `RTG_PUSH`, als Wert den Code einfügen.
4. Testen: **Actions → Erinnerungen → Run workflow**. Nach etwa einer Minute kommt eine
   Test-Benachrichtigung.

Gut zu wissen:

- Erinnerungen kommen meist ein paar Minuten nach der eingestellten Zeit — GitHub
  startet geplante Läufe nicht auf die Minute.
- Zeiten oder Trainingstage geändert? Die App zeigt an, dass der Code veraltet ist:
  neu kopieren und das Secret ersetzen.
- Neues Handy oder App neu installiert: Push dort neu aktivieren und das Secret ersetzen.
  Ein abgelaufenes Abo lässt den Workflow mit einer klaren Meldung scheitern, GitHub
  schickt dann eine Mail.
- Passiert 60 Tage lang nichts im Repo, pausiert GitHub geplante Läufe. Unter *Actions*
  wieder einschalten.
- Ausschalten: in der App *Push ausschalten* und das Secret löschen.

Den Versand lokal ausprobieren (Node 22, ohne Abhängigkeiten):

```bash
RTG_PUSH='RTG1....' node scripts/send-reminders.mjs --dry-run --now=2026-10-19T15:07:00Z
RTG_PUSH='RTG1....' node scripts/send-reminders.mjs --test
```

## Installation auf dem Handy

1. Die Seite in Safari (iOS) bzw. Chrome (Android) öffnen
2. Teilen → *Zum Home-Bildschirm* bzw. Menü → *App installieren*

Danach startet sie im Vollbild ohne Browserleiste und funktioniert offline.

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server auf http://localhost:5173
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
npm run typecheck
```

Stack: React 18, TypeScript, Vite, React Router. Kein UI-Framework, keine
State-Library, keine Chart-Library — der Store sind rund 90 Zeilen auf
`useSyncExternalStore`, die Charts sind handgeschriebenes SVG.

```
src/
├─ lib/          Datenmodell, Store, Persistenz, Auswertungen, Timer, Push
├─ components/   Wiederverwendbare Bausteine
├─ pages/        Eine Datei pro Route
└─ styles/       Design-Tokens und CSS
public/sw.js     Service Worker: Offline-Cache, Push-Empfang
scripts/         Versand der Push-Erinnerungen (läuft in GitHub Actions)
```

## Deployment

Jeder Push auf `main` baut und deployt via GitHub Actions nach GitHub Pages
(`.github/workflows/deploy.yml`). Einmalig nötig: **Settings → Pages → Source:
GitHub Actions**.

Die App läuft unter `/RTG-app/`; für eine eigene Domain in `vite.config.ts`
`base` auf `'/'` setzen.
