import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock3, Film, Loader2, MonitorPlay, QrCode, RefreshCw, Sparkles, Wifi, WifiOff } from "lucide-react";

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
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(99,102,241,0.38),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.20),transparent_36%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative flex min-h-screen flex-col p-4 sm:p-6 lg:p-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.07] px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:px-5">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-[0_0_28px_rgba(99,102,241,0.45)]">
              <div className="absolute inset-0 bg-white/15 [clip-path:polygon(0_0,100%_0,42%_100%,0_100%)]" />
              <MonitorPlay className="relative h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-cyan-200/80">Écran client</p>
              <h1 className="text-xl font-black tracking-[-0.04em] sm:text-3xl">Vidéo originale & QR Code</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-xs font-bold text-white/70 shadow-inner shadow-white/5">
            {SUPABASE_CONFIGURED && !hasCloudError ? <Wifi className="h-4 w-4 text-emerald-300" /> : <WifiOff className="h-4 w-4 text-amber-300" />}
            <span>{syncLabel}</span>
          </div>
        </header>

        {capture ? (
          <section className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="relative min-h-[48vh] overflow-hidden rounded-[2.25rem] border border-white/10 bg-black shadow-2xl shadow-indigo-950/40">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),transparent_24%,transparent_72%,rgba(34,211,238,0.10))]" />
              <video
                key={capture.videoUrl}
                ref={videoRef}
                src={capture.videoUrl}
                className="relative h-full w-full object-contain"
                autoPlay
                muted
                loop
                playsInline
                controls
              />
              <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  <Film className="h-3.5 w-3.5 text-cyan-200" />
                  Vidéo originale
                </div>
                <div className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-amber-100 backdrop-blur-md">
                  Sans effets appliqués
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-[1.5rem] border border-white/10 bg-black/55 p-4 backdrop-blur-xl sm:left-auto sm:max-w-md">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100">Base avant montage</p>
                    <p className="mt-1 text-sm leading-5 text-white/75">Cette prévisualisation montre la vidéo brute. Les effets, filtres et habillages seront appliqués ensuite.</p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="flex flex-col justify-between rounded-[2.25rem] border border-white/10 bg-white/[0.075] p-5 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div>
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/20 text-emerald-100 ring-1 ring-white/10">
                  <QrCode className="h-8 w-8" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/75">Scan & téléchargement</p>
                <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">Récupérez la vidéo en un scan</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-5 text-white/60">Le lien partage la vidéo originale, prête à être récupérée ou traitée avec les effets.</p>
              </div>

              <div className="my-6 rounded-[2rem] border border-white/10 bg-white p-4 shadow-[0_0_50px_rgba(34,211,238,0.18)]">
                <QRCodeSVG value={capture.shareUrl} size={300} level="M" includeMargin className="h-auto w-full" />
              </div>

              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                  <p className="text-sm text-white/85">Le QR code ouvre la page de partage pour télécharger la vidéo originale.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <Sparkles className="h-5 w-5 shrink-0 text-amber-200" />
                  <p className="text-sm text-white/85">Aucun effet n'est visible ici : ils seront ajoutés après cette étape.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <Clock3 className="h-5 w-5 shrink-0 text-cyan-300" />
                  <p className="text-sm text-white/85">Capture reçue à {formatTime(capture.updatedAt)}.</p>
                </div>
              </div>
            </aside>
          </section>
        ) : (
          <section className="grid flex-1 place-items-center rounded-[2.25rem] border border-white/10 bg-white/[0.055] p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <div className="max-w-xl">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-indigo-500/25 to-cyan-400/20 text-indigo-100 ring-1 ring-white/10">
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
