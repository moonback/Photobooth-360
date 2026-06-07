export type TriggerSoundId = 'flash' | 'beep' | 'short-music' | 'none';

export interface TriggerSound {
  id: TriggerSoundId;
  label: string;
  file?: string;
  isCustom?: boolean;
}

export const TRIGGER_SOUNDS: TriggerSound[] = [
  { id: 'none', label: 'Aucun' },
  { id: 'flash', label: 'Flash photo', file: '/sounds/flash.mp3' },
  { id: 'beep', label: 'Bip', file: '/sounds/beep.mp3' },
  { id: 'short-music', label: 'Musique courte', file: '/sounds/short-music.mp3' },
];

export function getTriggerSoundById(id: TriggerSoundId): TriggerSound {
  return TRIGGER_SOUNDS.find((s) => s.id === id) ?? TRIGGER_SOUNDS[0];
}

export function isValidTriggerSoundId(value: string): value is TriggerSoundId {
  return TRIGGER_SOUNDS.some((s) => s.id === value);
}

/**
 * Play the trigger sound with the given volume (0-100)
 */
export function playTriggerSound(id: TriggerSoundId, volume: number = 70): void {
  if (id === 'none') return;
  
  const sound = getTriggerSoundById(id);
  if (!sound.file) return;
  
  const audio = new Audio(sound.file);
  audio.volume = volume / 100;
  audio.play().catch(err => {
    console.error('[TriggerSound] Failed to play sound:', err);
  });
}
