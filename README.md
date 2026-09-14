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

**Pausen-Timer** — Läuft zeitstempelbasiert, stimmt also auch, wenn der Browser im
Hintergrund drosselt. Signalton und Vibration am Ende, ±15/30 Sekunden und Skip.
Bei Zeit-Übungen lässt sich der Timer als Übungs-Countdown starten — läuft er ab,
ist der Satz abgehakt.

**Mikro** — Klimmzüge im Türrahmen, Liegestützen zwischendurch. Tagesziel pro Übung,
Ring füllt sich, Quick-Add-Buttons mit eigenen Werten, Rückgängig-Knopf, Tage
zurückblättern.

**Stats** — 12-Wochen-Verlauf (Workouts, Sätze, Volumen, Mikro), Heatmap der aktiven
Tage, Mikro-Trend über 14 Tage, Bestleistungen je Übung inkl. geschätztem 1RM.

**Grenadier-Tests** — Eigene Disziplinen mit Zielwert und Richtung ("mehr ist besser"
bzw. "weniger ist besser" für Laufzeiten). Fortschrittsbalken, Verlaufslinie mit
Zielmarke. Eine Startvorlage mit den üblichen Disziplinen ist hinterlegt — **die
Zielwerte darin sind Richtwerte und müssen gegen die offiziellen Vorgaben abgeglichen
werden.**

## Daten

Alles liegt in `localStorage` dieses Browsers. Kein Konto, keine Übertragung, kein Tracking.

Das heisst auch: **Browserdaten löschen löscht die Trainingsdaten.** Unter *Mehr → Daten*
gibt es Export und Import als JSON — ab und zu ein Backup ziehen.

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
├─ lib/          Datenmodell, Store, Persistenz, Auswertungen, Timer
├─ components/   Wiederverwendbare Bausteine
├─ pages/        Eine Datei pro Route
└─ styles/       Design-Tokens und CSS
```

## Deployment

Jeder Push auf `main` baut und deployt via GitHub Actions nach GitHub Pages
(`.github/workflows/deploy.yml`). Einmalig nötig: **Settings → Pages → Source:
GitHub Actions**.

Die App läuft unter `/RTG-app/`; für eine eigene Domain in `vite.config.ts`
`base` auf `'/'` setzen.
