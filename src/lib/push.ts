import { useCallback, useEffect, useState } from 'react';
import { activeRegistration } from './notifications';
import { plannedDays } from './stats';
import type { AppData } from './types';

/**
 * Push-Erinnerungen ohne eigenen Server.
 *
 * Damit eine Erinnerung auch bei geschlossener App ankommt, braucht es echtes
 * Web Push - und jemanden, der die Nachricht zur richtigen Zeit verschickt.
 * Das übernimmt ein geplanter GitHub-Actions-Lauf im eigenen Repo
 * (.github/workflows/reminders.yml mit scripts/send-reminders.mjs).
 *
 *  1. Die App erzeugt einmalig ein VAPID-Schlüsselpaar und abonniert damit
 *     Push beim Browser. Die Schlüssel bleiben auf diesem Gerät und gehören
 *     bewusst nicht ins Backup - ein Abo gilt immer nur für ein Gerät.
 *  2. Abo, Schlüssel, Zeitzone und Erinnerungszeiten ergeben den Push-Code.
 *     Der kommt als Secret RTG_PUSH ins Repo.
 *  3. Der Workflow schaut alle 30 Minuten, ob etwas fällig ist, und schickt
 *     nur die Art der Erinnerung. Den Text baut der Service Worker beim
 *     Empfang aus dem aktuellen Stand auf dem Gerät (siehe snapshot.ts).
 */

const STORAGE_KEY = 'rtg-push-v1';
const CODE_PREFIX = 'RTG1.';

interface VapidKeys {
  /** Unkomprimierter P-256-Punkt, base64url. */
  publicKey: string;
  /** Privater Skalar d, base64url. */
  privateKey: string;
}

interface PushLocal {
  keys?: VapidKeys;
  /** Zuletzt kopierter Code - zum Erkennen, ob das Secret veraltet ist. */
  copiedCode?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Inhalt des Push-Codes. Das Format liest scripts/send-reminders.mjs. */
export interface PushConfig {
  v: 1;
  /** IANA-Zeitzone des Geräts, z.B. "Europe/Zurich". */
  tz: string;
  /** VAPID-Kontakt: die Adresse der App. */
  subject: string;
  vapid: VapidKeys;
  subscription: PushSubscriptionData;
  /** Uhrzeit und Wochentag ("1" = Montag) -> geplante Workouts. */
  workout?: { time: string; days: Record<string, string[]> };
  micro?: { times: string[] };
}

function loadLocal(): PushLocal {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as PushLocal;
  } catch {
    return {};
  }
}

function saveLocal(patch: Partial<PushLocal>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadLocal(), ...patch }));
  } catch {
    /* Ohne Speicher gibt es eben kein Push */
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): ArrayBuffer {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/** Schlüsselpaar holen oder einmalig erzeugen. */
export async function ensureVapidKeys(): Promise<VapidKeys> {
  const stored = loadLocal().keys;
  if (stored) return stored;
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const keys: VapidKeys = { publicKey: toBase64Url(publicKey), privateKey: privateJwk.d! };
  saveLocal({ keys });
  return keys;
}

function toData(subscription: PushSubscription): PushSubscriptionData | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

function usesKey(subscription: PushSubscription, keys: VapidKeys): boolean {
  const key = subscription.options.applicationServerKey;
  return key !== null && toBase64Url(new Uint8Array(key)) === keys.publicKey;
}

/** Bestehendes Abo dieser App, falls vorhanden. */
async function currentSubscription(): Promise<PushSubscriptionData | null> {
  const keys = loadLocal().keys;
  const registration = await activeRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!keys || !subscription || !usesKey(subscription, keys)) return null;
  return toData(subscription);
}

/** Push abonnieren. Die Erlaubnis für Benachrichtigungen muss schon da sein. */
export async function subscribePush(): Promise<PushSubscriptionData> {
  const registration = await activeRegistration();
  if (!registration) {
    throw new Error('Push geht nur in der installierten App - im Entwicklungsmodus läuft kein Service Worker.');
  }
  const keys = await ensureVapidKeys();
  const existing = await registration.pushManager.getSubscription();
  if (existing && usesKey(existing, keys)) {
    const data = toData(existing);
    if (data) return data;
  }
  await existing?.unsubscribe();
  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: fromBase64Url(keys.publicKey),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Der Browser konnte Push nicht einrichten (${reason}).`);
  }
  const data = toData(subscription);
  if (!data) throw new Error('Der Browser hat ein unvollständiges Push-Abo geliefert.');
  return data;
}

export async function unsubscribePush(): Promise<void> {
  const registration = await activeRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
  saveLocal({ copiedCode: undefined });
}

/** Abo-Status für die Einstellungen; `refresh` nach (De-)Aktivieren aufrufen. */
export function usePushSubscription() {
  const [state, setState] = useState<{ loading: boolean; subscription: PushSubscriptionData | null }>({
    loading: pushSupported(),
    subscription: null,
  });

  const refresh = useCallback(async () => {
    if (!pushSupported()) return;
    const subscription = await currentSubscription().catch(() => null);
    setState({ loading: false, subscription });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export function buildPushConfig(data: AppData, keys: VapidKeys, subscription: PushSubscriptionData): PushConfig {
  const { settings } = data;
  const days = plannedDays(data);
  const hasMicros = data.micros.some((m) => !m.archived && m.dailyGoal > 0);
  return {
    v: 1,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    subject: new URL(import.meta.env.BASE_URL, location.origin).href,
    vapid: keys,
    subscription,
    workout:
      settings.remindWorkout && Object.keys(days).length > 0
        ? { time: settings.remindWorkoutTime, days }
        : undefined,
    micro:
      settings.remindMicro && hasMicros && settings.remindMicroTimes.length > 0
        ? { times: settings.remindMicroTimes }
        : undefined,
  };
}

export function encodePushCode(config: PushConfig): string {
  return CODE_PREFIX + toBase64Url(new TextEncoder().encode(JSON.stringify(config)));
}

/** Push-Code für das aktuelle Abo - null, solange keins besteht. */
export function pushCode(data: AppData, subscription: PushSubscriptionData | null): string | null {
  const keys = loadLocal().keys;
  if (!subscription || !keys) return null;
  return encodePushCode(buildPushConfig(data, keys, subscription));
}

export function rememberCopiedCode(code: string): void {
  saveLocal({ copiedCode: code });
}

export function copiedCode(): string | undefined {
  return loadLocal().copiedCode;
}

/** Repo-Adresse, abgeleitet aus der GitHub-Pages-URL (user.github.io/repo/). */
export function githubRepoUrl(): string | undefined {
  const host = location.hostname;
  if (!host.endsWith('.github.io')) return undefined;
  const owner = host.slice(0, -'.github.io'.length);
  const repo = import.meta.env.BASE_URL.replace(/^\/+|\/+$/g, '') || host;
  return `https://github.com/${owner}/${repo}`;
}
