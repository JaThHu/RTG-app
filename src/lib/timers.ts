import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Zeitbasierter Countdown. Rechnet aus einem Ziel-Zeitstempel statt einen
 * Zähler herunterzuzählen - so stimmt die Restzeit auch, wenn der Browser
 * das Intervall im Hintergrund drosselt.
 */
export function useCountdown(onDone: () => void) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const left = (endsAt - Date.now()) / 1000;
      if (left <= 0) {
        setRemaining(0);
        setEndsAt(null);
        onDoneRef.current();
      } else {
        setRemaining(left);
      }
    };
    tick();
    const handle = window.setInterval(tick, 200);
    return () => window.clearInterval(handle);
  }, [endsAt]);

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setTotal(seconds);
    setEndsAt(Date.now() + seconds * 1000);
    setRemaining(seconds);
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
  }, []);

  const adjust = useCallback((seconds: number) => {
    setEndsAt((current) => {
      if (current === null) return current;
      const next = current + seconds * 1000;
      return next > Date.now() ? next : Date.now() + 1000;
    });
    setTotal((current) => Math.max(1, current + seconds));
  }, []);

  return {
    running: endsAt !== null,
    remaining,
    total,
    progress: total > 0 ? 1 - remaining / total : 0,
    start,
    stop,
    adjust,
  };
}

/** Laufende Zeit seit einem Zeitstempel, aktualisiert jede Sekunde. */
export function useElapsed(since: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === undefined) return;
    const handle = window.setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(handle);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [since]);
  if (since === undefined) return 0;
  return Math.max(0, (now - since) / 1000);
}

/** Stoppuhr für Zeit-Übungen (Planks, Hangs, Intervalle). */
export function useStopwatch() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const tick = () => setElapsed((Date.now() - startedAt) / 1000);
    tick();
    const handle = window.setInterval(tick, 100);
    return () => window.clearInterval(handle);
  }, [startedAt]);

  return {
    running: startedAt !== null,
    elapsed,
    start: () => setStartedAt(Date.now() - elapsed * 1000),
    pause: () => setStartedAt(null),
    reset: () => {
      setStartedAt(null);
      setElapsed(0);
    },
  };
}
