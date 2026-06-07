import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2, Clock3, Download, Film, Loader2, MonitorPlay,
  QrCode, RefreshCw, Sparkles, Wifi, WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { SUPABASE_CONFIGURED } from "../lib/supabase";
import { listVideosFromBucket } from "../lib/uploadVideo";
import {
  buildCloudShareUrl,
  readScreenCapture,
  subscribeScreenCapture,
  type ScreenCapturePayload,
} from "../lib/screenCapture";

const POLL_INTERVAL_MS = 5000;

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  } catch {
    return "maintenant";
  }
}

function newerCapture(current: ScreenCapturePayload | null, next: ScreenCapturePayload) {
  if (!current) return next;
  return new Date(next.updatedAt).getTime() >= new Date(current.updatedAt).getTime() ? next : current;
}

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
      <span className="mt-0.5 shrink-0 text-neuro-accent">{icon}</span>
      <p className="text-caption leading-relaxed text-neuro-muted">{children}</p>
    </div>
  );
}

export default function ScreenPage() {
  const [capture, setCapture] = useState<ScreenCapturePayload | null>(() => readScreenCapture());
  const [isPolling, setIsPolling] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>("");
  const [hasCloudError, setHasCloudError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => subscribeScreenCapture((payload) => setCapture((current) => newerCapture(current, payload))), []);

  useEffect(() => {
    let cancelled = false;

    const loadLatestCloudVideo = async (silent = false) => {
      if (!SUPABASE_CONFIGURED) return;
      if (!silent) setIsPolling(true);
      try {
        const videos = await listVideosFromBucket();
        if (cancelled) return;
        const latest = videos[0];
        if (latest?.url) {
          setCapture((current) => newerCapture(current, {
            videoUrl: latest.url,
            shareUrl: buildCloudShareUrl(latest.url),
            source: "cloud",
            updatedAt: latest.createdAt || new Date().toISOString(),
          }));
          setHasCloudError(false);
        }
        setLastSyncAt(new Date().toISOString());
      } catch {
        if (!cancelled) setHasCloudError(true);
      } finally {
        if (!cancelled) setIsPolling(false);
      }
    };

    loadLatestCloudVideo();
    const interval = window.setInterval(() => loadLatestCloudVideo(true), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    videoRef.current?.load();
    void videoRef.current?.play().catch(() => undefined);
  }, [capture?.videoUrl]);

  const syncLabel = useMemo(() => {
    if (isPolling) return "Synchronisation…";
    if (lastSyncAt) return formatTime(lastSyncAt);
    return SUPABASE_CONFIGURED ? "Cloud actif" : "Sync locale";
  }, [isPolling, lastSyncAt]);

  const isOnline = SUPABASE_CONFIGURED && !hasCloudError;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-neuro-bg text-neuro-text font-sans">
      <div className="pointer-events-none fixed inset-0 premium-gradient grain-overlay opacity-50" />

      {/* Header */}
      <header className="relative z-10 shrink-0 border-b border-white/6 bg-neuro-bg/85 backdrop-blur-xl px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 lg:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neuro-accent/15">
              <MonitorPlay className="h-5 w-5 text-neuro-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-label text-neuro-accent">Écran client</p>
              <h1 className="font-display truncate text-[17px] font-bold text-white leading-tight lg:text-xl">
                Vidéo & QR Code
              </h1>
            </div>
          </div>
          <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${
            isOnline ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/12 text-amber-300"
          }`}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className="hidden sm:inline">{isPolling ? "Sync…" : isOnline ? "Connecté" : "Hors ligne"}</span>
            <span className="font-mono opacity-80">{syncLabel}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-bounce smooth-scroll p-4 lg:p-6">
        <AnimatePresence mode="wait">
          {capture ? (
            <motion.section
              key="capture"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[1fr_minmax(300px,360px)] lg:gap-5 xl:grid-cols-[1fr_380px]"
            >
              {/* Video */}
              <div className="glass-panel relative min-h-[38dvh] overflow-hidden rounded-2xl bg-black lg:min-h-0 lg:h-full">
                <video
                  key={capture.videoUrl}
                  ref={videoRef}
                  src={capture.videoUrl}
                  className="h-full w-full object-contain"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 rounded-full border border-white/12 bg-black/50 px-2.5 py-1 text-label text-white backdrop-blur-md">
                    <Film className="h-3 w-3 text-neuro-accent" />
                    Original
                  </span>
                  <span className="rounded-full border border-amber-400/20 bg-amber-500/12 px-2.5 py-1 text-label text-amber-200">
                    Sans effets
                  </span>
                </div>
              </div>

              {/* QR panel */}
              <aside className="glass-panel-strong flex flex-col rounded-2xl p-4 text-center lg:overflow-y-auto lg:p-5">
                <div className="mb-3 inline-flex items-center gap-1.5 self-center rounded-full bg-emerald-500/15 px-3 py-1 text-label text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-slow-pulse" />
                  Scan disponible
                </div>

                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neuro-accent/12">
                  <QrCode className="h-6 w-6 text-neuro-accent" />
                </div>

                <p className="text-label text-neuro-muted">Téléchargement</p>
                <h2 className="font-display mt-1 text-[20px] font-bold leading-tight tracking-[-0.03em] text-white lg:text-[22px]">
                  Scannez pour récupérer
                </h2>
                <p className="mx-auto mt-2 max-w-[280px] text-caption leading-relaxed text-neuro-muted">
                  Vidéo originale, prête à télécharger ou à personnaliser avec des effets.
                </p>

                <div className="relative mx-auto my-4 w-full max-w-[240px] rounded-2xl bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.30)] lg:my-5 lg:max-w-[260px]">
                  <QRCodeSVG
                    value={capture.shareUrl}
                    size={260}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#070709"
                    className="h-auto w-full"
                  />
                </div>

                <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-4 py-3 text-[13px] font-semibold text-white">
                  <Download className="h-4 w-4 text-neuro-accent" />
                  Approchez · Scannez · Téléchargez
                </div>

                <div className="space-y-2 text-left">
                  <InfoRow icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}>
                    Le QR ouvre la page de partage pour télécharger la vidéo originale.
                  </InfoRow>
                  <InfoRow icon={<Sparkles className="h-4 w-4 text-amber-300" />}>
                    Les effets slow-motion s'appliquent après le scan, sur la page de partage.
                  </InfoRow>
                  <InfoRow icon={<Clock3 className="h-4 w-4" />}>
                    Capture reçue à {formatTime(capture.updatedAt)}.
                  </InfoRow>
                </div>
              </aside>
            </motion.section>
          ) : (
            <motion.section
              key="waiting"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center py-8 text-center"
            >
              <div className="glass-panel-strong flex w-full flex-col items-center rounded-2xl px-6 py-10">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-neuro-accent/12">
                  {isPolling ? (
                    <Loader2 className="h-8 w-8 animate-spin text-neuro-accent" />
                  ) : (
                    <RefreshCw className="h-8 w-8 text-neuro-accent" />
                  )}
                </div>
                <p className="text-label text-neuro-accent">En attente</p>
                <h2 className="font-display mt-2 text-title text-white">
                  Lancez une capture
                </h2>
                <p className="mt-3 max-w-sm text-body text-neuro-muted">
                  La vidéo et le QR code apparaîtront ici automatiquement après chaque capture, via le cloud ou la sync locale.
                </p>
                <div className="mt-6 flex items-center gap-2 text-caption text-neuro-muted/60">
                  <MonitorPlay className="h-3.5 w-3.5" />
                  NeuroBooth 360 · Écran client
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
