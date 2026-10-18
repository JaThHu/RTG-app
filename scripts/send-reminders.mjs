#!/usr/bin/env node
/**
 * Verschickt die Push-Erinnerungen der RTG-App.
 *
 * Läuft per GitHub Actions alle 30 Minuten (.github/workflows/reminders.yml).
 * Alles, was es braucht - Push-Abo des Handys, VAPID-Schlüssel, Zeitzone und
 * Erinnerungszeiten -, steckt im Secret RTG_PUSH. Den Code dafür erzeugt die
 * App unter Mehr -> Erinnerungen (Format: src/lib/push.ts).
 *
 * Geschickt wird nur die Art der Erinnerung; den Text baut der Service Worker
 * auf dem Handy aus dem aktuellen Stand (public/sw.js).
 *
 * Bewusst ohne Abhängigkeiten: Verschlüsselung (RFC 8291) und VAPID
 * (RFC 8292) erledigt node:crypto.
 *
 *   node scripts/send-reminders.mjs             fällige Erinnerungen senden
 *   node scripts/send-reminders.mjs --test      Test-Benachrichtigung senden
 *   node scripts/send-reminders.mjs --dry-run --now=2026-10-19T15:07:00Z
 *                                               nur anzeigen, was fällig wäre
 */
import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const CODE_PREFIX = 'RTG1.';
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/**
 * Cron-Ausdrücke aus dem Workflow -> Minute des Halbstunden-Slots, den sie
 * bedienen. Am Auslöser statt an der Uhrzeit festgemacht, weil GitHub
 * geplante Läufe oft deutlich verspätet startet.
 */
const SCHEDULE_SLOTS = { '7 * * * *': 0, '37 * * * *': 30 };

/** Eine Erinnerung, die nach zwei Stunden noch nicht zugestellt ist, braucht es nicht mehr. */
const TTL_SECONDS = 2 * 60 * 60;

export function parseCode(code) {
  const body = code.trim().startsWith(CODE_PREFIX) ? code.trim().slice(CODE_PREFIX.length) : code.trim();
  let config;
  try {
    config = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new Error('RTG_PUSH ist kein gültiger Push-Code. In der App unter Mehr → Erinnerungen neu kopieren.');
  }
  const { subscription, vapid } = config ?? {};
  if (
    config?.v !== 1 ||
    typeof subscription?.endpoint !== 'string' ||
    !subscription.endpoint.startsWith('https://') ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth ||
    !vapid?.publicKey ||
    !vapid?.privateKey ||
    typeof config.subject !== 'string'
  ) {
    throw new Error('RTG_PUSH ist unvollständig. In der App unter Mehr → Erinnerungen neu kopieren.');
  }
  // Wirft bei unbekannter Zeitzone.
  new Intl.DateTimeFormat('en-GB', { timeZone: config.tz });
  return config;
}

/** Beginn des Slots, den dieser Lauf bedient: die letzte volle oder halbe Stunde. */
export function slotStart(now, schedule) {
  const minute = schedule in SCHEDULE_SLOTS ? SCHEDULE_SLOTS[schedule] : now.getUTCMinutes() >= 30 ? 30 : 0;
  const slot = new Date(now);
  slot.setUTCMinutes(minute, 0, 0);
  if (slot > now) slot.setUTCHours(slot.getUTCHours() - 1);
  return slot;
}

/** Uhrzeit "HH:MM" und Wochentag (1 = Montag) in der Zeitzone des Handys. */
export function localTime(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday) + 1;
  return { time: `${parts.hour}:${parts.minute}`, weekday };
}

/** Welche Erinnerungen im Slot fällig sind. */
export function dueMessages(config, slot) {
  const { time, weekday } = localTime(slot, config.tz);
  const messages = [];
  const names = config.workout?.days?.[weekday];
  if (config.workout?.time === time && names?.length > 0) messages.push({ type: 'workout', names });
  if (config.micro?.times?.includes(time)) messages.push({ type: 'micro' });
  return { time, weekday, messages };
}

function hkdf(salt, ikm, info, length) {
  return Buffer.from(hkdfSync('sha256', ikm, salt, info, length));
}

/** Verschlüsselt die Nachricht für das Abo (RFC 8291, aes128gcm, ein Record). */
export function encrypt(payload, subscription) {
  const clientPublic = Buffer.from(subscription.keys.p256dh, 'base64url');
  const authSecret = Buffer.from(subscription.keys.auth, 'base64url');

  const ecdh = createECDH('prime256v1');
  const serverPublic = ecdh.generateKeys();
  const sharedSecret = ecdh.computeSecret(clientPublic);

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), clientPublic, serverPublic]);
  const ikm = hkdf(authSecret, sharedSecret, keyInfo, 32);
  const salt = randomBytes(16);
  const contentKey = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);

  const cipher = createCipheriv('aes-128-gcm', contentKey, nonce);
  // 0x02 markiert den letzten (hier einzigen) Record.
  const record = Buffer.concat([
    cipher.update(Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(serverPublic.length, 20);
  return Buffer.concat([header, serverPublic, record]);
}

/** Authorization-Header nach RFC 8292: signiertes JWT plus öffentlicher Schlüssel. */
export function vapidAuthorization(endpoint, vapid, subject, now = Date.now()) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const claims = { aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 60 * 60, sub: subject };
  const unsigned = `${encode({ typ: 'JWT', alg: 'ES256' })}.${encode(claims)}`;

  const publicKey = Buffer.from(vapid.publicKey, 'base64url');
  const key = createPrivateKey({
    format: 'jwk',
    key: {
      kty: 'EC',
      crv: 'P-256',
      d: vapid.privateKey,
      x: publicKey.subarray(1, 33).toString('base64url'),
      y: publicKey.subarray(33, 65).toString('base64url'),
    },
  });
  const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${unsigned}.${signature.toString('base64url')}, k=${vapid.publicKey}`;
}

export async function sendPush(config, message) {
  const { endpoint } = config.subscription;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidAuthorization(endpoint, config.vapid, config.subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(TTL_SECONDS),
      // Sonst hält Android die Nachricht im Energiesparmodus womöglich zurück.
      Urgency: 'high',
    },
    body: encrypt(JSON.stringify(message), config.subscription),
  });
  if (response.status === 404 || response.status === 410) {
    throw new Error(
      'Das Push-Abo gibt es nicht mehr (z.B. App neu installiert oder Push ausgeschaltet). ' +
        'In der App unter Mehr → Erinnerungen Push aktivieren und den neuen Code als RTG_PUSH speichern.',
    );
  }
  if (!response.ok) {
    throw new Error(`Push-Dienst antwortet mit ${response.status}: ${await response.text()}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const nowArg = args.find((arg) => arg.startsWith('--now='));
  const now = nowArg ? new Date(nowArg.slice('--now='.length)) : new Date();
  const dryRun = args.includes('--dry-run');
  // Von Hand im Actions-Tab gestartet: Test schicken.
  const test = args.includes('--test') || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';

  const code = process.env.RTG_PUSH;
  if (!code) {
    console.log('Kein Secret RTG_PUSH gesetzt - nichts zu tun.');
    return;
  }
  const config = parseCode(code);

  let messages;
  if (test) {
    messages = [{ type: 'test' }];
    console.log('Test-Benachrichtigung');
  } else {
    const due = dueMessages(config, slotStart(now, process.env.SCHEDULE ?? ''));
    messages = due.messages;
    const what = messages.map((m) => m.type).join(', ') || 'nichts fällig';
    console.log(`${WEEKDAYS[due.weekday - 1]} ${due.time} (${config.tz}): ${what}`);
  }

  for (const message of messages) {
    if (dryRun) {
      console.log(`Würde senden: ${JSON.stringify(message)}`);
      continue;
    }
    await sendPush(config, message);
    console.log(`Gesendet: ${message.type}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    // fetch() meldet Netzwerkprobleme nur als "fetch failed", der Grund steckt in cause.
    const cause = error.cause?.message ? ` (${error.cause.message})` : '';
    // ::error:: hebt die Meldung in der Actions-Übersicht hervor.
    console.error(`::error::${error.message}${cause}`);
    process.exitCode = 1;
  });
}
