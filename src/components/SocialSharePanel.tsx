import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Copy, Instagram, Link2, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AppSettings } from './settings/types';
import { useSocialShare } from '../hooks/useSocialShare';
import { blobUrlToFile } from '../lib/socialShare';
import type { SocialPlatform } from '../lib/socialShare';

interface SocialSharePanelProps {
  settings: Pick<
    AppSettings,
    'eventName' | 'socialHashtags' | 'socialSponsorMention' | 'socialShareMessage' | 'socialShareEnabled' | 'accentColor'
  >;
  shareUrl: string;
  videoId: string;
  videoBlobUrl?: string;
  filename: string;
  eventId?: string;
  accentClass: string;
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

const ACCENT_RING: Record<AppSettings['accentColor'], string> = {
  indigo: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  rose: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
};

export default function SocialSharePanel({
  settings,
  shareUrl,
  videoId,
  videoBlobUrl,
  filename,
  eventId,
  accentClass,
}: SocialSharePanelProps) {
  const { caption, canNativeShare, feedback, isSharing, share, clearFeedback } = useSocialShare({
    settings,
    shareUrl,
    videoId,
    eventId,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const ringClass = ACCENT_RING[settings.accentColor];

  useEffect(() => {
    if (!videoBlobUrl) {
      setVideoFile(null);
      return;
    }

    let cancelled = false;
    blobUrlToFile(videoBlobUrl, filename).then((file) => {
      if (!cancelled) setVideoFile(file);
    });

    return () => {
      cancelled = true;
    };
  }, [videoBlobUrl, filename]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(clearFeedback, 4000);
    return () => window.clearTimeout(timer);
  }, [feedback, clearFeedback]);

  const handleShare = useCallback(
    (platform: SocialPlatform) => {
      void share(platform, videoFile ?? undefined);
    },
    [share, videoFile],
  );

  if (!settings.socialShareEnabled) return null;

  const buttons: {
    platform: SocialPlatform;
    label: string;
    icon: ReactNode;
    className: string;
    hidden?: boolean;
  }[] = [
    {
      platform: 'native',
      label: 'Partager',
      icon: <Share2 className="h-5 w-5" />,
      className: `${accentClass} text-white shadow-lg`,
      hidden: !canNativeShare,
    },
    {
      platform: 'whatsapp',
      label: 'WhatsApp',
      icon: <MessageCircle className="h-5 w-5" />,
      className: 'bg-[#25D366]/15 border-[#25D366]/30 text-[#25D366]',
    },
    {
      platform: 'instagram',
      label: 'Instagram',
      icon: <Instagram className="h-5 w-5" />,
      className: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-pink-500/30 text-pink-300',
    },
    {
      platform: 'tiktok',
      label: 'TikTok',
      icon: <TikTokIcon className="h-5 w-5" />,
      className: 'bg-white/10 border-white/20 text-white',
    },
    {
      platform: 'copy_link',
      label: 'Lien',
      icon: <Link2 className="h-5 w-5" />,
      className: 'bg-zinc-800/80 border-zinc-700 text-zinc-300',
    },
    {
      platform: 'copy_caption',
      label: 'Texte',
      icon: <Copy className="h-5 w-5" />,
      className: 'bg-zinc-800/80 border-zinc-700 text-zinc-300',
    },
  ];

  const visibleButtons = buttons.filter((b) => !b.hidden);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3"
    >
      <div className="flex items-center gap-2.5">
        <Sparkles className={`h-5 w-5 ${ringClass.split(' ').pop()}`} />
        <span className="text-base font-bold">Partager sur les réseaux</span>
      </div>

      <div className={`rounded-2xl border px-3 py-2.5 text-left ${ringClass}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">Texte prérempli</p>
        <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-white/90">{caption}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {visibleButtons.map(({ platform, label, icon, className }) => (
          <motion.button
            key={platform}
            type="button"
            disabled={isSharing}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleShare(platform)}
            className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-2.5 text-[11px] font-bold transition-all disabled:opacity-50 touch-manipulation ${className}`}
          >
            {icon}
            {label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs font-medium text-emerald-400"
            role="status"
          >
            {feedback}
          </motion.p>
        )}
      </AnimatePresence>

      {!canNativeShare && (
        <p className="text-center text-[11px] leading-4 text-zinc-600">
          Téléchargez la vidéo puis importez-la dans Instagram ou TikTok. Le texte est copiable en un tap.
        </p>
      )}
    </motion.div>
  );
}
