import { useCallback, useMemo, useState } from 'react';
import type { AppSettings } from '../components/settings/types';
import { trackShare } from '../lib/analytics';
import {
  buildShareCaption,
  buildWhatsAppUrl,
  copyToClipboard,
  shareNative,
  supportsShareFiles,
  supportsWebShare,
  type ShareContent,
  type SocialPlatform,
} from '../lib/socialShare';
import { useHapticFeedback } from './useMobileOptimizations';

interface UseSocialShareOptions {
  settings: Pick<AppSettings, 'eventName' | 'socialHashtags' | 'socialSponsorMention' | 'socialShareMessage' | 'socialShareEnabled'>;
  shareUrl: string;
  videoId: string;
  eventId?: string;
}

interface UseSocialShareReturn {
  caption: string;
  canNativeShare: boolean;
  canShareVideoFile: boolean;
  feedback: string | null;
  isSharing: boolean;
  share: (platform: SocialPlatform, file?: File) => Promise<void>;
  clearFeedback: () => void;
}

export function useSocialShare({
  settings,
  shareUrl,
  videoId,
  eventId,
}: UseSocialShareOptions): UseSocialShareReturn {
  const haptic = useHapticFeedback();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const caption = useMemo(
    () => buildShareCaption(settings),
    [settings],
  );

  const canNativeShare = supportsWebShare();
  const canShareVideoFile = supportsShareFiles();

  const clearFeedback = useCallback(() => setFeedback(null), []);

  const share = useCallback(async (platform: SocialPlatform, file?: File) => {
    if (!settings.socialShareEnabled && platform !== 'copy_link') return;

    setIsSharing(true);
    setFeedback(null);

    try {
      const content: ShareContent = {
        title: `${settings.eventName} 360°`,
        text: caption,
        url: shareUrl,
        file,
      };

      switch (platform) {
        case 'native': {
          const result = await shareNative(content);
          if (result === 'shared') {
            haptic.success();
            setFeedback('Partage lancé !');
            trackShare(videoId, 'native_share', eventId);
          } else if (result === 'cancelled') {
            setFeedback(null);
          } else if (result === 'unsupported') {
            setFeedback('Partage natif indisponible sur cet appareil.');
          } else {
            setFeedback('Impossible de partager. Réessayez ou téléchargez la vidéo.');
          }
          break;
        }
        case 'whatsapp': {
          window.open(buildWhatsAppUrl(caption, shareUrl), '_blank', 'noopener,noreferrer');
          haptic.medium();
          setFeedback('WhatsApp ouvert — envoyez votre message.');
          trackShare(videoId, 'whatsapp', eventId);
          break;
        }
        case 'instagram':
        case 'tiktok': {
          if (file && canNativeShare) {
            const result = await shareNative({ ...content, file });
            if (result === 'shared') {
              haptic.success();
              setFeedback(platform === 'instagram' ? 'Choisissez Instagram dans le menu.' : 'Choisissez TikTok dans le menu.');
              trackShare(videoId, platform, eventId);
              break;
            }
          }
          await copyToClipboard(caption);
          haptic.light();
          setFeedback(
            platform === 'instagram'
              ? 'Texte copié — téléchargez la vidéo puis importez-la dans Instagram Reels.'
              : 'Texte copié — téléchargez la vidéo puis importez-la dans TikTok.',
          );
          trackShare(videoId, `${platform}_hint`, eventId);
          break;
        }
        case 'copy_link': {
          const ok = await copyToClipboard(shareUrl);
          haptic.light();
          setFeedback(ok ? 'Lien copié !' : 'Impossible de copier le lien.');
          if (ok) trackShare(videoId, 'copy_link', eventId);
          break;
        }
        case 'copy_caption': {
          const ok = await copyToClipboard(caption);
          haptic.light();
          setFeedback(ok ? 'Texte copié — collez-le dans votre publication.' : 'Impossible de copier le texte.');
          if (ok) trackShare(videoId, 'copy_caption', eventId);
          break;
        }
      }
    } finally {
      setIsSharing(false);
    }
  }, [settings, caption, shareUrl, videoId, eventId, haptic, canNativeShare]);

  return {
    caption,
    canNativeShare,
    canShareVideoFile,
    feedback,
    isSharing,
    share,
    clearFeedback,
  };
}
