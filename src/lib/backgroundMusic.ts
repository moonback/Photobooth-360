/** Identifiants des 5 pistes du dossier public/song */
export type SongId = 'track1' | 'track2' | 'track3' | 'track4' | 'track5';

export type MusicSelection = SongId | 'none';

export interface BackgroundTrack {
  id: SongId;
  label: string;
  file: string;
  /** Instant (secondes) du meilleur moment : drop, refrain, climax */
  highlightAt: number;
}

/** Bibliothèque fixe — placer les fichiers MP3 dans public/song/ */
export const BACKGROUND_TRACKS: BackgroundTrack[] = [
  { id: 'track1', label: 'Énergique', file: '/song/track1.mp3', highlightAt: 12 },
  { id: 'track2', label: 'Chill', file: '/song/track2.mp3', highlightAt: 18 },
  { id: 'track3', label: 'Festif', file: '/song/track3.mp3', highlightAt: 10 },
  { id: 'track4', label: 'Élégant', file: '/song/track4.mp3', highlightAt: 22 },
  { id: 'track5', label: 'Dynamique', file: '/song/track5.mp3', highlightAt: 8 },
];

export function getTrackById(id: SongId): BackgroundTrack {
  return BACKGROUND_TRACKS.find((t) => t.id === id) ?? BACKGROUND_TRACKS[0];
}

export function isValidSongId(value: string): value is SongId {
  return BACKGROUND_TRACKS.some((t) => t.id === value);
}
