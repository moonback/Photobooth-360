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

// Cache preloaded audio elements
const audioCache = new Map<string, HTMLAudioElement>();

/**
 * Play the trigger sound with the given volume (0-100)
 */
export function playTriggerSound(id: TriggerSoundId, volume: number = 70): void {
  if (id === 'none') return;
  
  const sound = getTriggerSoundById(id);
  if (!sound.file) return;
  
  try {
    // Try to use cached audio element
    let audio = audioCache.get(sound.file);
    if (!audio) {
      audio = new Audio(sound.file);
      audio.preload = 'auto';
      audioCache.set(sound.file, audio);
    }
    
    // Reset audio to start
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(100, volume)) / 100;
    
    // Play with error handling
    audio.play().catch(err => {
      // Only log once per sound, or at lower severity
      console.warn('[TriggerSound] Could not play sound (may be blocked by browser):', err);
    });
  } catch (err) {
    console.warn('[TriggerSound] Failed to initialize audio:', err);
  }
}
