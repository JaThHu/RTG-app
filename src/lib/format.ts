import { formatDuration } from './date';
import type { ExerciseKind, SessionSet } from './types';

/** Einheit des Zielwerts je Übungsart. */
export function targetUnit(kind: ExerciseKind): string {
  switch (kind) {
    case 'reps':
    case 'weighted':
      return 'Wdh.';
    case 'time':
      return 'Sek.';
    case 'distance':
      return 'm';
  }
}

export function targetFieldLabel(kind: ExerciseKind): string {
  switch (kind) {
    case 'reps':
    case 'weighted':
      return 'Wiederholungen pro Satz';
    case 'time':
      return 'Sekunden pro Satz';
    case 'distance':
      return 'Meter pro Satz';
  }
}

/** Kompakte Zielbeschreibung: "4 x 8 @ 60 kg", "3 x 60 Sek." */
export function formatTarget(exercise: {
  kind: ExerciseKind;
  sets: number;
  targetValue?: number;
  targetWeight?: number;
}): string {
  const parts: string[] = [];
  if (exercise.targetValue) {
    const value =
      exercise.kind === 'time' ? formatDuration(exercise.targetValue) : String(exercise.targetValue);
    parts.push(`${exercise.sets} x ${value}`);
    if (exercise.kind !== 'time') parts.push(targetUnit(exercise.kind));
  } else {
    parts.push(`${exercise.sets} Sätze`);
  }
  if (exercise.kind === 'weighted' && exercise.targetWeight) {
    parts.push(`@ ${exercise.targetWeight} kg`);
  }
  return parts.join(' ');
}

/** Ergebnis eines geloggten Satzes als Text. */
export function formatSet(kind: ExerciseKind, set: SessionSet): string {
  switch (kind) {
    case 'reps':
      return set.reps ? `${set.reps} Wdh.` : '-';
    case 'weighted':
      if (!set.reps && !set.weight) return '-';
      return `${set.weight ?? 0} kg x ${set.reps ?? 0}`;
    case 'time':
      return set.seconds ? formatDuration(set.seconds) : '-';
    case 'distance':
      return set.meters ? formatDistance(set.meters) : '-';
  }
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2).replace(/\.?0+$/, '')} km` : `${meters} m`;
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${Math.round(kg)} kg`;
}

/** Vorschläge für das Namensfeld - reine Eingabehilfe, kein fixer Katalog. */
export const EXERCISE_SUGGESTIONS = [
  'Klimmzüge',
  'Chin-ups',
  'Liegestützen',
  'Dips',
  'Kniebeugen',
  'Ausfallschritte',
  'Kreuzheben',
  'Bankdrücken',
  'Schulterdrücken',
  'Rudern',
  'Plank',
  'Situps',
  'Beinheben',
  'Burpees',
  'Bergsteiger',
  'Kastensprung',
  'Seilspringen',
  'Dauerlauf',
  'Intervalllauf',
  'Bergsprints',
  'Marsch mit Rucksack',
  'Schwimmen',
  'Rudergerät',
  'Velo',
  'Farmers Walk',
  'Sandsack tragen',
];
