import { useCallback, useEffect, useState } from 'react';

/**
 * Lokale Benachrichtigungen - alles best effort. Angezeigt wird über den
 * Service Worker: Chrome auf Android kennt `new Notification()` gar nicht,
 * dort geht nur registration.showNotification().
 */

export type NotificationState =
  | 'granted'
  | 'denied'
  | 'default'
  /** iPhone/iPad im Safari-Tab - Benachrichtigungen gibt es erst in der installierten App. */
  | 'ios-browser'
  | 'unsupported';

/** Läuft die App vom Home-Bildschirm (ohne Browserleiste)? */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  // iPadOS meldet sich als Mac - erkennbar am Touchscreen.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

export function notificationState(): NotificationState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return isIos() && !isStandalone() ? 'ios-browser' : 'unsupported';
  return Notification.permission;
}

/** Fragt nach der Erlaubnis. Muss aus einem Tap heraus aufgerufen werden (iOS). */
export async function requestNotificationPermission(): Promise<NotificationState> {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      /* Ältere Safari-Versionen kennen nur die Callback-Variante */
    }
  }
  return notificationState();
}

/**
 * Aktueller Erlaubnis-Status. Wird beim Zurückkommen in die App neu gelesen -
 * man kann ihn ja zwischendurch in den Systemeinstellungen ändern.
 */
export function useNotificationState(): [NotificationState, () => Promise<NotificationState>] {
  const [state, setState] = useState<NotificationState>(notificationState);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setState(notificationState());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const request = useCallback(async () => {
    const next = await requestNotificationPermission();
    setState(next);
    return next;
  }, []);

  return [state, request];
}

/** Aktiver Service Worker - nur im Produktions-Build registriert. */
export async function activeRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
  if (!registration) return undefined;
  if (registration.active) return registration;
  // Gerade erst installiert: kurz auf die Aktivierung warten.
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), 3000)),
  ]);
}

export interface LocalNotification {
  title: string;
  body?: string;
  /** Gleicher Tag ersetzt die vorherige Benachrichtigung statt sie zu stapeln. */
  tag?: string;
  /** Route, die beim Antippen geöffnet wird, z.B. "/workout/abc". */
  path?: string;
}

export async function showNotification({ title, body, tag, path = '/' }: LocalNotification): Promise<boolean> {
  if (notificationState() !== 'granted') return false;
  const options: NotificationOptions = {
    body,
    tag,
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
    lang: 'de-CH',
    data: { url: new URL(`${import.meta.env.BASE_URL}#${path}`, location.origin).href },
  };
  try {
    const registration = await activeRegistration();
    if (registration) {
      await registration.showNotification(title, options);
    } else {
      // Dev-Server ohne Service Worker, Desktop-Browser.
      const notification = new Notification(title, options);
      notification.onclick = () => window.focus();
    }
    return true;
  } catch {
    return false;
  }
}

/** Räumt Benachrichtigungen weg, die sich erledigt haben. */
export async function closeNotifications(tag: string): Promise<void> {
  try {
    const registration = await activeRegistration();
    const open = (await registration?.getNotifications({ tag })) ?? [];
    for (const notification of open) notification.close();
  } catch {
    /* nichts zu tun */
  }
}
