/** Position du meilleur moment dans la vidéo (35 % = build-up puis drop) */
export const HIGHLIGHT_VIDEO_RATIO = 0.35;

/**
 * Calcule le décalage de départ de la piste pour aligner le highlight
 * sur le meilleur moment relatif à la durée de la vidéo.
 */
export function computeMusicStartOffset(
  videoDurationSec: number,
  musicDurationSec: number,
  highlightAtSec: number,
): number {
  if (videoDurationSec <= 0 || musicDurationSec <= 0) return 0;

  const targetHighlightPos = videoDurationSec * HIGHLIGHT_VIDEO_RATIO;
  let offset = highlightAtSec - targetHighlightPos;
  offset = Math.max(0, offset);

  if (musicDurationSec > videoDurationSec) {
    const maxOffset = musicDurationSec - videoDurationSec;
    offset = Math.min(offset, maxOffset);
  }

  return offset;
}

/** Lit la durée d'un média (vidéo ou audio) via les métadonnées du navigateur. */
export function getMediaDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const isAudio = /\.(mp3|wav|ogg|m4a|aac)$/i.test(url);
    const el = document.createElement(isAudio ? 'audio' : 'video');
    el.preload = 'metadata';

    const cleanup = () => {
      el.src = '';
      el.remove();
    };

    el.onloadedmetadata = () => {
      const duration = el.duration;
      cleanup();
      if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error('Durée média invalide'));
    };

    el.onerror = () => {
      cleanup();
      reject(new Error('Échec chargement métadonnées média'));
    };

    el.src = url;
  });
}
