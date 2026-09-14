/** Haptik und Ton für Timer und Bestätigungen - alles best effort. */

let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContext ??= new Ctor();
  return audioContext;
}

/**
 * iOS erlaubt Audio nur nach einer Nutzergeste. Einmal beim ersten Tap
 * aufwecken, damit der Timer später auch wirklich piepst.
 */
export function primeAudio(): void {
  const ctx = context();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

export function beep(times = 1, frequency = 880): void {
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  for (let i = 0; i < times; i++) {
    const start = ctx.currentTime + i * 0.28;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.24);
  }
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* Gerät unterstützt keine Vibration */
    }
  }
}

/** Kurzes taktiles Feedback beim Abhaken eines Satzes. */
export function tick(enabled: boolean): void {
  if (enabled) vibrate(12);
}

/** Signal am Ende der Satzpause. */
export function restDone(sound: boolean, vibration: boolean): void {
  if (sound) beep(2);
  if (vibration) vibrate([120, 80, 120]);
}
