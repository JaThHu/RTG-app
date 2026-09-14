import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, posix, relative, resolve, sep } from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const BASE_PROD = '/RTG-app/';

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * Traegt die gebauten Dateien in den Service Worker ein.
 *
 * Ohne diese Liste waere die App erst ab dem zweiten Besuch offline nutzbar:
 * beim ersten Laden sind JS und CSS schon durch, bevor der Service Worker
 * ueberhaupt aktiv ist, und landen deshalb nie in seinem Cache.
 */
function precacheServiceWorker(base: string): Plugin {
  return {
    name: 'rtg-sw-precache',
    apply: 'build',
    closeBundle() {
      const dist = resolve('dist');
      const swPath = join(dist, 'sw.js');

      const assets = listFiles(dist)
        .map((file) => base + relative(dist, file).split(sep).join(posix.sep))
        .filter((url) => !url.endsWith('/sw.js'))
        .sort();

      // Version aus dem Inhalt ableiten, damit ein neuer Build alte Caches raeumt.
      const version = assets.join('|').length.toString(36) + '-' + assets.length;

      // Die Anfuehrungszeichen mit ersetzen - im Quelltext sind die
      // Platzhalter Strings, damit sw.js gueltiges JavaScript bleibt.
      const source = readFileSync(swPath, 'utf8')
        .replace("'__PRECACHE_MANIFEST__'", JSON.stringify(assets))
        .replace("'__CACHE_VERSION__'", JSON.stringify(version))
        .replace("'__BASE_URL__'", JSON.stringify(base));

      writeFileSync(swPath, source);
      console.log(`  sw.js: ${assets.length} Dateien im Precache (${version})`);
    },
  };
}

/**
 * Produktion wird auf GitHub Pages unter /RTG-app/ ausgeliefert, der Dev-Server
 * laeuft unter /. Beim Hosten auf einer eigenen Domain hier auf '/' stellen.
 */
export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? BASE_PROD : '/';
  return {
    base,
    plugins: [react(), precacheServiceWorker(base)],
    build: {
      target: 'es2022',
      outDir: 'dist',
    },
  };
});
