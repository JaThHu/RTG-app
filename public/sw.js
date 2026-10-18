/**
 * Service Worker der RTG-App.
 *
 * Die Platzhalter unten werden beim Build durch vite.config.ts ersetzt
 * (siehe Plugin "rtg-sw-precache"). Im Dev-Modus wird der Service Worker
 * gar nicht registriert, die Platzhalter stoeren dort also nicht.
 *
 * Strategie:
 *  - Beim Installieren alle gebauten Dateien vorab cachen. Damit ist die App
 *    schon nach dem ersten Besuch vollstaendig offline nutzbar.
 *  - Navigationen: erst Netz, bei Fehler die gecachte Startseite. So kommen
 *    Updates sofort an und offline laeuft es trotzdem.
 *  - Uebrige Anfragen: aus dem Cache bedienen und im Hintergrund erneuern.
 *
 * Dazu kommen Push-Erinnerungen (siehe src/lib/push.ts): Der Absender
 * schickt nur die Art der Erinnerung, den Text baut der Service Worker hier
 * aus dem Stand, den die App in den Cache spiegelt (src/lib/snapshot.ts).
 */

const PRECACHE = '__PRECACHE_MANIFEST__';
const VERSION = '__CACHE_VERSION__';
const BASE = '__BASE_URL__';

const CACHE = `rtg-${VERSION}`;
const START_URL = BASE;
/** Muss mit src/lib/snapshot.ts uebereinstimmen. */
const STATE_CACHE = 'rtg-state';
const STATE_URL = `${BASE}__rtg-state.json`;
const assets = Array.isArray(PRECACHE) ? PRECACHE : [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Einzeln statt addAll: eine fehlende Datei soll nicht die ganze
      // Installation scheitern lassen.
      .then((cache) =>
        Promise.all(
          [START_URL, ...assets].map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE && key !== STATE_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * ignoreVary ist hier entscheidend: Server senden fuer Assets oft
 * "Vary: Origin". Beim Vorab-Cachen entsteht der Eintrag ohne Origin-Header,
 * der spaetere Request eines Modul-Skripts schickt aber einen - ohne
 * ignoreVary faende der Cache den Eintrag nicht und die App bliebe offline
 * weiss. Eigene Assets haben ohnehin keine Origin-abhaengigen Varianten.
 */
const MATCH_OPTIONS = { ignoreVary: true };

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(START_URL, copy));
          return response;
        })
        .catch(async () => (await caches.match(START_URL, MATCH_OPTIONS)) ?? Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request, MATCH_OPTIONS).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? network;
    }),
  );
});

/* ------------------------------------------------------- Benachrichtigungen */

function localISODate(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

async function readState() {
  try {
    const cache = await caches.open(STATE_CACHE);
    const response = await cache.match(STATE_URL);
    return response ? await response.json() : null;
  } catch {
    return null;
  }
}

/** In der App abgeschaltet, das Secret aber noch nicht ersetzt. */
const SWITCHED_OFF = {
  title: 'Erinnerung ausgeschaltet',
  body: 'Push-Code in der App neu kopieren und das Secret RTG_PUSH ersetzen.',
  silent: true,
  path: '/mehr/erinnerungen',
};

/**
 * Text der Erinnerung. Jede Push-Nachricht muss eine Benachrichtigung zeigen
 * - Safari kuendigt das Abo sonst. Ist nichts mehr zu tun, kommt sie darum
 * als stille Bestaetigung statt gar nicht.
 */
function composeReminder(message, state) {
  const now = new Date();
  // Summen im Snapshot gelten nur fuer seinen Tag. Von gestern heisst: heute noch nichts.
  const fresh = state !== null && state.date === localISODate(now);
  const weekday = ((now.getDay() + 6) % 7) + 1;

  if (message.type === 'workout') {
    if (state && state.remindWorkout === false) return SWITCHED_OFF;
    if (fresh && state.trainedToday) {
      return { title: 'Heute schon trainiert ✓', body: 'Stark. Erholung gehört auch dazu.', silent: true, path: '/' };
    }
    const names = (state && state.plan && state.plan[weekday]) || message.names || [];
    return {
      title: names.length > 0 ? `Heute: ${names.join(' + ')}` : 'Zeit fürs Training',
      body: 'Tippen, um das Workout zu starten.',
      path: '/',
    };
  }

  if (message.type === 'micro') {
    if (state && state.remindMicro === false) return SWITCHED_OFF;
    const micros = (state && state.micros) || [];
    const open = micros
      .map((m) => ({ ...m, left: m.goal - (fresh ? m.total : 0) }))
      .filter((m) => m.goal > 0 && m.left > 0);
    if (micros.length > 0 && open.length === 0) {
      return { title: 'Mikro-Ziele erreicht ✓', body: 'Alle Tagesziele für heute geschafft.', silent: true, path: '/mikro' };
    }
    return {
      title: 'Zeit für Mikro-Übungen',
      body:
        open.length > 0
          ? open.map((m) => `${m.icon} ${m.name}: noch ${m.left} ${m.unit === 'seconds' ? 'Sek.' : 'Wdh.'}`).join('\n')
          : 'Ein paar Wiederholungen zwischendurch.',
      path: '/mikro',
    };
  }

  if (message.type === 'test') {
    return { title: 'RTG: Push funktioniert ✓', body: 'Die Erinnerungen sind eingerichtet.', path: '/mehr/erinnerungen' };
  }

  return { title: message.title || 'RTG', body: message.body || '', path: '/' };
}

self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = {};
  }
  event.waitUntil(
    readState().then((state) => {
      const reminder = composeReminder(message, state);
      return self.registration.showNotification(reminder.title, {
        body: reminder.body,
        tag: `rtg-${message.type || 'push'}`,
        silent: Boolean(reminder.silent),
        icon: `${BASE}icon-192.png`,
        lang: 'de-CH',
        data: { url: new URL(`${BASE}#${reminder.path}`, self.location.origin).href },
      });
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || new URL(BASE, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find((w) => w.url.startsWith(new URL(BASE, self.location.origin).href));
      if (client) {
        await client.focus();
        // Nur der Hash aendert sich - das ist ein Seitenwechsel ohne Neuladen.
        if (client.url !== url) await client.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
