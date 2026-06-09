import type { AppSettings } from '../components/settings/types';
import type { ExportFormat } from '../hooks/useSlowMotion';

export type SocialPlatform = 'native' | 'whatsapp' | 'instagram' | 'tiktok' | 'copy_link' | 'copy_caption';

export interface ShareContent {
  title: string;
  text: string;
  url: string;
  file?: File;
}

export function supportsWebShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export function supportsShareFiles(): boolean {
  if (!supportsWebShare()) return false;
  return typeof navigator.canShare !== 'function' || navigator.canShare({ files: [new File([], 'test.webm', { type: 'video/webm' })] });
}

export function buildShareCaption(settings: Pick<AppSettings, 'eventName' | 'socialHashtags' | 'socialSponsorMention' | 'socialShareMessage'>): string {
  const parts: string[] = [];

  if (settings.socialShareMessage.trim()) {
    parts.push(settings.socialShareMessage.trim());
  } else {
    parts.push(`Ma vidéo ${settings.eventName} 360° 🎥`);
  }

  if (settings.socialSponsorMention.trim()) {
    parts.push(settings.socialSponsorMention.trim());
  }

  if (settings.socialHashtags.trim()) {
    parts.push(settings.socialHashtags.trim());
  }

  return parts.join('\n');
}

export function resolveDefaultExportFormat(
  setting: AppSettings['defaultExportFormat'],
  isMobile: boolean,
): ExportFormat {
  if (setting !== 'auto') return setting;
  return isMobile ? '9:16' : '16:9';
}

export async function blobUrlToFile(blobUrl: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'video/webm' });
  } catch {
    return null;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function buildWhatsAppUrl(text: string, url: string): string {
  const message = url ? `${text}\n${url}` : text;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function shareNative(content: ShareContent): Promise<'shared' | 'cancelled' | 'unsupported' | 'error'> {
  if (!supportsWebShare()) return 'unsupported';

  try {
    const shareData: ShareData = {
      title: content.title,
      text: content.text,
      url: content.url || undefined,
    };

    if (content.file) {
      const withFiles = { ...shareData, files: [content.file] };
      if (typeof navigator.canShare === 'function' && !navigator.canShare(withFiles)) {
        await navigator.share(shareData);
      } else {
        await navigator.share(withFiles);
      }
    } else {
      await navigator.share(shareData);
    }

    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  native: 'Partager',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  copy_link: 'Copier le lien',
  copy_caption: 'Copier le texte',
};

export const PLATFORM_HINTS: Partial<Record<SocialPlatform, string>> = {
  instagram: 'Télécharge la vidéo, ouvre Instagram → Reels → Importer, puis colle le texte copié.',
  tiktok: 'Télécharge la vidéo, ouvre TikTok → Créer → Importer, puis colle le texte copié.',
};
