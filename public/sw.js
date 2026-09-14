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
 */

const PRECACHE = '__PRECACHE_MANIFEST__';
const VERSION = '__CACHE_VERSION__';
const BASE = '__BASE_URL__';

const CACHE = `rtg-${VERSION}`;
const START_URL = BASE;
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
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
