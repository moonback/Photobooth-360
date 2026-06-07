import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock3, Download, Film, Loader2, MonitorPlay, QrCode, RefreshCw, Sparkles, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { SUPABASE_CONFIGURED } from "../lib/supabase";
import { listVideosFromBucket } from "../lib/uploadVideo";
import {
  buildCloudShareUrl,
  readScreenCapture,
  subscribeScreenCapture,
  type ScreenCapturePayload,
} from "../lib/screenCapture";
import { loadSettings } from "../lib/settingsStore";
import type { AppSettings } from "../components/SettingsModal";

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

export default function ScreenPage() {
  const [capture, setCapture] = useState<ScreenCapturePayload | null>(() => readScreenCapture());
  const [isPolling, setIsPolling] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>("");
  const [hasCloudError, setHasCloudError] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [showActivation, setShowActivation] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const accentColor = useMemo(() => appSettings?.accentColor || "indigo", [appSettings]);

  useEffect(() => {
    loadSettings().then((settings) => setAppSettings(settings)).catch(() => undefined);
  }, []);

  useEffect(() => {
    subscribeScreenCapture((payload) => {
      setCapture((current) => {
        const newCapture = newerCapture(current, payload);
        if (newCapture !== current) {
          setShowActivation(true);
          setTimeout(() => setShowActivation(false), 2000);
        }
        return newCapture;
      });
    });
  }, []);

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
          setCapture((current) => {
            const newCapture = newerCapture(current, {
              videoUrl: latest.url,
              shareUrl: buildCloudShareUrl(latest.url),
              source: "cloud",
              updatedAt: latest.createdAt || new Date().toISOString(),
            });
            if (newCapture !== current) {
              setShowActivation(true);
              setTimeout(() => setShowActivation(false), 2000);
            }
            return newCapture;
          });
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
    if (isPolling) return "Recherche de la dernière capture…";
    if (lastSyncAt) return `Synchronisé à ${formatTime(lastSyncAt)}`;
    return SUPABASE_CONFIGURED ? "Synchronisation cloud active" : "En attente d'une capture locale";
  }, [isPolling, lastSyncAt]);

  return (
    <main className="relative h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle at 12%_8%,rgba(99,102,241,0.38),transparent_30%),radial-gradient(circle at 82%_18%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle at 50%_100%,rgba(168,85,247,0.20),transparent_36%)]" />
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl motion-safe:animate-pulse" />
      <div className="absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl motion-safe:animate-pulse" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,transparent_44%,rgba(255,255,255,0.09)_50%,transparent_56%,transparent_100%)] [background-size:220%_220%] motion-safe:animate-[pulse_5s_ease-in-out_infinite]" />
      
      <AnimatePresence>
        {showActivation && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.3, opacity: [0.6, 0, 0.6, 0] }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-50 pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${
                accentColor === "indigo" ? "rgba(99, 102, 241, 0.4)" :
                accentColor === "rose" ? "rgba(244, 63, 94, 0.4)" :
                accentColor === "amber" ? "rgba(245, 158, 11, 0.4)" :
                accentColor === "emerald" ? "rgba(16, 185, 129, 0.4)" : "rgba(6, 182, 212, 0.4)"
              }, transparent 60%)`,
            }}
          />
        )}
      </AnimatePresence>
      
      <div className="relative flex h-screen min-h-0 flex-col p-4 sm:p-6 lg:p-8">
        <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.07] px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl transition-all duration-500 hover:border-cyan-300/30 hover:bg-white/[0.09] sm:px-5 lg:mb-5">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-[0_0_28px_rgba(99,102,241,0.45)] transition-transform duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-white/15 [clip-path:polygon(0_0,100%_0,42%_100%,0_100%)]" />
              <div className="absolute inset-[-35%] bg-[conic-gradient(from_90deg,transparent,rgba(255,255,255,0.45),transparent_35%)] motion-safe:animate-spin" />
              <MonitorPlay className="relative h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-cyan-200/80">Écran client</p>
              <h1 className="text-xl font-black tracking-[-0.04em] sm:text-3xl">{appSettings?.eventName || "NeuroBooth"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-xs font-bold text-white/70 shadow-inner shadow-white/5 transition-colors duration-300 hover:border-emerald-300/30 hover:text-white">
            {SUPABASE_CONFIGURED && !hasCloudError ? <Wifi className="h-4 w-4 text-emerald-300" /> : <WifiOff className="h-4 w-4 text-amber-300" />}
            <span>{syncLabel}</span>
          </div>
        </header>

        {capture ? (
          <section className="grid min-h-0 flex-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] xl:grid-cols-[minmax(0,1fr)_380px]">
            <motion.div
              layout
              className="group relative h-full min-h-[42vh] overflow-hidden rounded-[2.25rem] border border-white/10 bg-black shadow-2xl shadow-indigo-950/40 transition-all duration-500 hover:border-cyan-300/30 hover:shadow-[0_0_60px_rgba(34,211,238,0.22)] lg:min-h-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),transparent_24%,transparent_72%,rgba(34,211,238,0.10))]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-32 -translate-y-full bg-gradient-to-b from-cyan-300/25 to-transparent transition-transform duration-1000 group-hover:translate-y-[65vh]" />
              <motion.video
                key={capture.videoUrl}
                ref={videoRef}
                src={capture.videoUrl}
                className="relative h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.01]"
                autoPlay
                muted
                loop
                playsInline
                controls
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, type: "spring", bounce: 0.2 }}
              />
              <div className="pointer-events-none absolute left-4 top-4 z-30 flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur-md shadow-[0_0_24px_rgba(34,211,238,0.18)]">
                  <Film className="h-3.5 w-3.5 text-cyan-200" />
                  Vidéo originale
                </div>
                <div className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-amber-100 backdrop-blur-md">
                  Sans effets appliqués
                </div>
              </div>
            </motion.div>

            <motion.aside
              layout
              className="group/qr relative flex min-h-0 flex-col justify-between overflow-y-auto rounded-[2.25rem] border border-white/10 bg-white/[0.075] p-4 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl transition-all duration-500 hover:border-emerald-300/30 hover:bg-white/[0.09] xl:p-5"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
              <div>
                <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 motion-safe:animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,1)]" />
                  Scan disponible
                </div>
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/20 text-emerald-100 ring-1 ring-white/10 transition-transform duration-500 group-hover/qr:scale-110 xl:mb-4 xl:h-16 xl:w-16">
                  <QrCode className="h-7 w-7 xl:h-8 xl:w-8" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/75">Scan & téléchargement</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] xl:text-3xl">Récupérez la vidéo en un scan</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-5 text-white/60">Le lien partage la vidéo originale, prête à être récupérée ou traitée avec les effets.</p>
              </div>

              <motion.div
                key={capture.shareUrl}
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative mx-auto my-4 w-full max-w-[min(280px,34vh)] rounded-[2rem] border border-white/10 bg-white p-3 shadow-[0_0_50px_rgba(34,211,238,0.18)] transition-transform duration-500 group-hover/qr:scale-[1.03] xl:my-6 xl:max-w-[300px] xl:p-4"
              >
                <div className="pointer-events-none absolute -inset-2 rounded-[2.25rem] border border-cyan-200/25 opacity-0 transition-opacity duration-500 group-hover/qr:opacity-100" />
                <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] bg-gradient-to-b from-cyan-300/0 via-cyan-300/20 to-cyan-300/0 opacity-0 transition-opacity duration-500 group-hover/qr:opacity-100" />
                <QRCodeSVG value={capture.shareUrl} size={300} level="M" includeMargin className="relative h-auto w-full" />
              </motion.div>

              <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-300 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.28)] transition-transform duration-300 group-hover/qr:scale-[1.02]">
                <Download className="h-4 w-4" />
                Approchez, scannez, téléchargez
              </div>

              <div className="space-y-2.5 text-left xl:space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 xl:py-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                  <p className="text-sm text-white/85">Le QR code ouvre la page de partage pour télécharger la vidéo originale.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 xl:py-3">
                  <Sparkles className="h-5 w-5 shrink-0 text-amber-200" />
                  <p className="text-sm text-white/85">Aucun effet n'est visible ici : ils seront ajoutés après cette étape.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 xl:py-3">
                  <Clock3 className="h-5 w-5 shrink-0 text-cyan-300" />
                  <p className="text-sm text-white/85">Capture reçue à {formatTime(capture.updatedAt)}.</p>
                </div>
              </div>
            </motion.aside>
          </section>
        ) : (
          <section className="grid flex-1 place-items-center rounded-[2.25rem] border border-white/10 bg-white/[0.055] p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-2xl transition-all duration-500 hover:border-cyan-300/30 hover:bg-white/[0.08]">
            <div className="max-w-xl">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-indigo-500/25 to-cyan-400/20 text-indigo-100 ring-1 ring-white/10 shadow-[0_0_45px_rgba(99,102,241,0.25)] motion-safe:animate-pulse">
                {isPolling ? <Loader2 className="h-9 w-9 animate-spin" /> : <RefreshCw className="h-9 w-9" />}
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/75">En attente</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">Lancez une capture sur la borne</h2>
              <p className="mt-3 text-base text-white/60">
                La vidéo originale sans effets et son QR code apparaîtront automatiquement ici après l'upload cloud, ou dans cet onglet via la synchronisation locale.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
