export type SlowMotionPreset = 'classic' | 'cinematic' | 'party' | 'luxury' | 'sport';

export interface AutoTrimWindow {
  start: number;
  duration: number;
  trimmedStart: number;
  trimmedEnd: number;
}

export interface SlowMotionPresetConfig {
  id: SlowMotionPreset;
  label: string;
  description: string;
  /** Speed applied only to the center highlight segment. */
  highlightSpeed: number;
  /** Portion of the usable clip that becomes the highlighted slow-motion zone. */
  highlightRatio: number;
}

const MIN_TRIMMED_DURATION_SECONDS = 2.4;

export const SLOW_MOTION_PRESETS: SlowMotionPresetConfig[] = [
  {
    id: 'classic',
    label: 'Classique',
    description: 'Ralentit toute la vidéo, comme avant.',
    highlightSpeed: 0.5,
    highlightRatio: 1,
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Highlight central large avec rendu fluide et premium.',
    highlightSpeed: 0.45,
    highlightRatio: 0.46,
  },
  {
    id: 'party',
    label: 'Party',
    description: 'Ralentissement court et énergique pour les moments fun.',
    highlightSpeed: 0.55,
    highlightRatio: 0.34,
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Ralentissement plus marqué pour un effet luxe/dramatique.',
    highlightSpeed: 0.38,
    highlightRatio: 0.42,
  },
  {
    id: 'sport',
    label: 'Sport',
    description: 'Highlight rapide et focalisé sur le mouvement central.',
    highlightSpeed: 0.5,
    highlightRatio: 0.28,
  },
];

export function getSlowMotionPreset(preset: SlowMotionPreset = 'cinematic'): SlowMotionPresetConfig {
  return SLOW_MOTION_PRESETS.find((item) => item.id === preset) ?? SLOW_MOTION_PRESETS[1];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Lightweight local heuristic for photobooth captures.
 *
 * Most unusable content is operator latency at the start/end. We trim a small,
 * duration-aware handle while guaranteeing the majority of the clip is kept.
 * This is intentionally deterministic and does not upload frames anywhere.
 */
export function resolveAutoTrimWindow(durationSeconds: number): AutoTrimWindow {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= MIN_TRIMMED_DURATION_SECONDS) {
    return { start: 0, duration: Math.max(0, durationSeconds), trimmedStart: 0, trimmedEnd: 0 };
  }

  const maxTotalTrim = Math.max(0, durationSeconds - MIN_TRIMMED_DURATION_SECONDS);
  const startHandle = clamp(durationSeconds * 0.055, 0.25, 0.95);
  const endHandle = clamp(durationSeconds * 0.075, 0.3, 1.2);
  const scale = Math.min(1, maxTotalTrim / (startHandle + endHandle));
  const trimmedStart = Number((startHandle * scale).toFixed(3));
  const trimmedEnd = Number((endHandle * scale).toFixed(3));
  const duration = Math.max(MIN_TRIMMED_DURATION_SECONDS, durationSeconds - trimmedStart - trimmedEnd);

  return {
    start: trimmedStart,
    duration: Number(duration.toFixed(3)),
    trimmedStart,
    trimmedEnd,
  };
}

export function buildSmartSlowMotionSetptsFilter(
  preset: SlowMotionPresetConfig,
  durationSeconds: number,
): string {
  const safeDuration = Math.max(MIN_TRIMMED_DURATION_SECONDS, durationSeconds);
  const highlightDuration = clamp(safeDuration * preset.highlightRatio, 0.9, Math.max(0.9, safeDuration * 0.72));
  const highlightStart = Number(((safeDuration - highlightDuration) / 2).toFixed(3));
  const highlightEnd = Number((highlightStart + highlightDuration).toFixed(3));
  const slowFactor = Number((1 / preset.highlightSpeed).toFixed(3));
  const extraFactor = Number((slowFactor - 1).toFixed(3));

  return `setpts='PTS+if(between(T,${highlightStart},${highlightEnd}),(T-${highlightStart})*${extraFactor}/TB,if(gte(T,${highlightEnd}),(${highlightEnd}-${highlightStart})*${extraFactor}/TB,0))'`;
}
