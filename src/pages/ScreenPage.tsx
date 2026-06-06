import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock3, Loader2, MonitorPlay, QrCode, RefreshCw, Wifi, WifiOff } from "lucide-react";

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
    if (isPolling) return "Recherche de la dernière capture…";
    if (lastSyncAt) return `Synchronisé à ${formatTime(lastSyncAt)}`;
    return SUPABASE_CONFIGURED ? "Synchronisation cloud active" : "En attente d'une capture locale";
  }, [isPolling, lastSyncAt]);

  return (
    <main className="min-h-screen overflow-hidden bg-neuro-bg text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.16),transparent_34%)]" />
      <div className="relative flex min-h-screen flex-col p-4 sm:p-6 lg:p-8">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20 text-indigo-200">
              <MonitorPlay className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-neuro-muted">Écran client</p>
              <h1 className="text-xl font-black tracking-[-0.04em] sm:text-2xl">Vidéo & QR Code</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-neuro-muted">
            {SUPABASE_CONFIGURED && !hasCloudError ? <Wifi className="h-4 w-4 text-emerald-300" /> : <WifiOff className="h-4 w-4 text-amber-300" />}
            <span>{syncLabel}</span>
          </div>
        </header>

        {capture ? (
          <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="relative min-h-[45vh] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
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
              <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                Dernière capture
              </div>
            </div>

            <aside className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 text-center shadow-2xl backdrop-blur-xl">
              <div>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-200">
                  <QrCode className="h-7 w-7" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-neuro-muted">Scan & téléchargement</p>
                <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">Scannez pour récupérer la vidéo</h2>
              </div>

              <div className="my-6 rounded-[1.75rem] bg-white p-4 shadow-[0_0_40px_rgba(255,255,255,0.12)]">
                <QRCodeSVG value={capture.shareUrl} size={300} level="M" includeMargin className="h-auto w-full" />
              </div>

              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 rounded-2xl bg-black/25 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                  <p className="text-sm text-white/85">Le QR code ouvre la page de partage pour télécharger la vidéo.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-black/25 px-4 py-3">
                  <Clock3 className="h-5 w-5 shrink-0 text-cyan-300" />
                  <p className="text-sm text-white/85">Capture reçue à {formatTime(capture.updatedAt)}.</p>
                </div>
              </div>
            </aside>
          </section>
        ) : (
          <section className="grid flex-1 place-items-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
            <div className="max-w-xl">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-indigo-500/20 text-indigo-200">
                {isPolling ? <Loader2 className="h-9 w-9 animate-spin" /> : <RefreshCw className="h-9 w-9" />}
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-neuro-muted">En attente</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">Lancez une capture sur la borne</h2>
              <p className="mt-3 text-base text-neuro-muted">
                La vidéo et son QR code apparaîtront automatiquement ici après l'upload cloud, ou dans cet onglet via la synchronisation locale.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
