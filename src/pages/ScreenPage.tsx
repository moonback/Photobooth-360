import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  CheckCircle2, 
  Clock3, 
  Download, 
  Film, 
  Loader2, 
  MonitorPlay, 
  QrCode, 
  RefreshCw, 
  Sparkles, 
  Wifi, 
  WifiOff,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { SUPABASE_CONFIGURED } from "../lib/supabase";
import { listVideosFromBucket } from "../lib/uploadVideo";
import { getPresentationBackground } from "../lib/presentationTemplates";
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

// Helper function to get accent color values
const getAccentColors = (accent: AppSettings["accentColor"]) => {
  switch (accent) {
    case "indigo":
      return { primary: "rgba(99, 102, 241, 1)", secondary: "rgba(168, 85, 247, 1)" };
    case "rose":
      return { primary: "rgba(244, 63, 94, 1)", secondary: "rgba(249, 115, 22, 1)" };
    case "amber":
      return { primary: "rgba(245, 158, 11, 1)", secondary: "rgba(251, 146, 60, 1)" };
    case "emerald":
      return { primary: "rgba(16, 185, 129, 1)", secondary: "rgba(5, 150, 105, 1)" };
    case "cyan":
      return { primary: "rgba(6, 182, 212, 1)", secondary: "rgba(34, 211, 238, 1)" };
    default:
      return { primary: "rgba(99, 102, 241, 1)", secondary: "rgba(168, 85, 247, 1)" };
  }
};

export default function ScreenPage() {
  const [capture, setCapture] = useState<ScreenCapturePayload | null>(() => readScreenCapture());
  const [isPolling, setIsPolling] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>("");
  const [hasCloudError, setHasCloudError] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [showActivation, setShowActivation] = useState(false);
  const [hasNoVideos, setHasNoVideos] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const accentColor = useMemo(() => appSettings?.accentColor || "indigo", [appSettings]);
  const bg = useMemo(() => getPresentationBackground(appSettings?.appBackground || "midnight"), [appSettings]);
  const accentColors = getAccentColors(accentColor);
  const backgroundStyle = appSettings?.appBackgroundUrl
    ? { backgroundImage: `url(${appSettings.appBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    : { background: `radial-gradient(circle at 50% 20%, ${bg.colors[1]}55, transparent 55%), linear-gradient(135deg, ${bg.colors.join(", ")})` };

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
        
        if (videos.length === 0) {
          setHasNoVideos(true);
          setCapture(null);
        } else {
          setHasNoVideos(false);
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
    if (videoRef.current && appSettings) {
      videoRef.current.playbackRate = appSettings.slowMotionEnabled ? appSettings.slowMotionSpeed : 1;
    }
  }, [capture?.videoUrl, appSettings]);

  const syncLabel = useMemo(() => {
    if (isPolling) return "Recherche de la dernière capture…";
    if (lastSyncAt) return `Synchronisé à ${formatTime(lastSyncAt)}`;
    return SUPABASE_CONFIGURED ? "Synchronisation cloud active" : "En attente d'une capture locale";
  }, [isPolling, lastSyncAt]);

  return (
    <main className="relative h-screen overflow-hidden text-white" style={backgroundStyle}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient blobs */}
        <motion.div
          className="absolute -left-32 top-10 h-80 w-80 rounded-full blur-3xl opacity-40"
          style={{ background: accentColors.primary }}
          animate={{ 
            x: [0, 30, 0], 
            y: [0, -20, 0], 
            scale: [1, 1.1, 1] 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-32 bottom-10 h-96 w-96 rounded-full blur-3xl opacity-30"
          style={{ background: accentColors.secondary }}
          animate={{ 
            x: [0, -30, 0], 
            y: [0, 20, 0], 
            scale: [1, 1.05, 1] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Light gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/50" />
      </div>
      
      <AnimatePresence>
        {showActivation && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [1, 1.2, 1], 
              opacity: [0.8, 0.3, 0] 
            }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-50 pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${accentColors.primary}40, transparent 60%)`,
            }}
          />
        )}
      </AnimatePresence>
      
      <div className="relative flex h-screen min-h-0 flex-col p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 flex shrink-0 items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            {/* Logo/Icon */}
            <div className="relative">
              <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                {/* Animated border */}
                <div className="absolute inset-0 rounded-2xl">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 -translate-x-full group-hover:animate-[shine_1.5s_infinite]" />
                </div>
                <MonitorPlay className="relative h-7 w-7" style={{ color: accentColors.primary }} />
              </div>
            </div>
            
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">Écran client</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                {appSettings?.eventName || "NeuroBooth"}
              </h1>
            </div>
          </div>
          
          {/* Sync status */}
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/30 backdrop-blur-xl px-5 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
            {SUPABASE_CONFIGURED && !hasCloudError ? (
              <div className="relative">
                <Wifi className="h-5 w-5" style={{ color: accentColors.primary }} />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: accentColors.primary }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColors.primary }} />
                </span>
              </div>
            ) : (
              <WifiOff className="h-5 w-5 text-amber-400" />
            )}
            <span className="text-sm font-medium text-white/80">{syncLabel}</span>
          </div>
        </motion.header>

        {capture ? (
          /* Content with capture */
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(300px,400px)] xl:grid-cols-[minmax(0,3fr)_minmax(350px,450px)]"
          >
            {/* Video section */}
            <motion.div
              layout
              className="group relative h-full min-h-[50vh] lg:min-h-0 overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.4)]"
            >
              {/* Subtle glass frame */}
              <div className="absolute inset-0 border border-white/5 rounded-[2rem] pointer-events-none" />
              
              {/* Video shine */}
              <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_35%,transparent_65%,rgba(255,255,255,0.08))]" />
              
              {/* Video element */}
              <motion.video
                key={capture.videoUrl}
                ref={videoRef}
                src={capture.videoUrl}
                className="relative h-full w-full object-contain"
                autoPlay
                muted
                loop
                playsInline
                controls
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              
              {/* Video badges */}
              <div className="pointer-events-none absolute left-5 top-5 z-20 flex flex-wrap gap-3">
                {appSettings?.slowMotionEnabled ? (
                  <div className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 backdrop-blur-xl px-4 py-2 shadow-lg">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-amber-100">
                      Slow-motion {appSettings.slowMotionSpeed === 0.5 ? '½×' : '¼×'}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/50 backdrop-blur-xl px-4 py-2 shadow-lg">
                      <Film className="h-4 w-4" style={{ color: accentColors.primary }} />
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-white/90">Vidéo originale</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 backdrop-blur-xl px-4 py-2 shadow-lg">
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-amber-100">Sans effets</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* QR Code section */}
            <motion.aside
              layout
              className="group/qr relative flex min-h-0 flex-col justify-between rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.3)] overflow-hidden"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            >
              {/* Decorative top gradient */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              
              <div className="p-6 lg:p-8 flex-1 flex flex-col">
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div 
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 mb-4"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColors.primary, boxShadow: `0 0 10px ${accentColors.primary}` }} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Scan disponible</span>
                  </motion.div>
                  
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div 
                        className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 shadow-xl"
                        style={{ background: `linear-gradient(135deg, ${accentColors.primary}25, ${accentColors.secondary}25)` }}
                      >
                        <QrCode className="h-8 w-8" style={{ color: accentColors.primary }} />
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/60 mb-2">Scan & Téléchargement</p>
                  <h2 className="text-2xl lg:text-3xl font-black leading-tight tracking-tight mb-3">Récupérez votre vidéo</h2>
                  <p className="text-sm text-white/60 max-w-xs mx-auto">
                    Scannez le QR code pour accéder à votre vidéo et la télécharger.
                  </p>
                </div>
                
                {/* QR Code container */}
                <div className="flex-1 flex items-center justify-center mb-8">
                  <motion.div
                    key={capture.shareUrl}
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 250, damping: 20 }}
                    className="relative"
                  >
                    {/* Glow behind QR */}
                    <div 
                      className="absolute -inset-6 rounded-[3rem] opacity-40 blur-2xl"
                      style={{ background: `radial-gradient(circle, ${accentColors.primary}40, transparent 70%)` }}
                    />
                    
                    {/* QR Card */}
                    <div className="relative bg-white rounded-[2.5rem] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                      {/* Decorative corners */}
                      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-gray-200 rounded-tl-lg" />
                      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-gray-200 rounded-tr-lg" />
                      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-gray-200 rounded-bl-lg" />
                      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-gray-200 rounded-br-lg" />
                      
                      <QRCodeSVG 
                        value={capture.shareUrl} 
                        size={240} 
                        level="H" 
                        includeMargin 
                        fgColor="#111827"
                        bgColor="white"
                        className="rounded-2xl"
                      />
                    </div>
                  </motion.div>
                </div>
                
                {/* CTA Button */}
                <div className="mb-8">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg text-slate-900 shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all duration-300"
                    style={{ background: `linear-gradient(135deg, ${accentColors.primary}, ${accentColors.secondary})` }}
                  >
                    <Download className="h-5 w-5" />
                    Approchez, scannez !
                  </motion.button>
                </div>
                
                
              </div>
            </motion.aside>
          </motion.section>
        ) : (
          /* Waiting state */
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="grid flex-1 place-items-center"
          >
            <div className="text-center max-w-2xl">
              <motion.div
                className="mx-auto mb-8"
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="relative">
                  <div 
                    className="grid h-32 w-32 place-items-center rounded-[2.5rem] border border-white/15 shadow-2xl backdrop-blur-2xl"
                    style={{ background: `linear-gradient(135deg, ${accentColors.primary}20, ${accentColors.secondary}20)` }}
                  >
                    {isPolling ? (
                      <Loader2 className="h-14 w-14 animate-spin" style={{ color: accentColors.primary }} />
                    ) : hasNoVideos ? (
                      <Film className="h-14 w-14" style={{ color: accentColors.primary }} />
                    ) : (
                      <RefreshCw className="h-14 w-14" style={{ color: accentColors.primary }} />
                    )}
                  </div>
                </div>
              </motion.div>
              
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/50 mb-4">
                {hasNoVideos ? "Aucune vidéo trouvée" : "En attente de capture"}
              </p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6">
                {hasNoVideos 
                  ? "Aucune vidéo en mémoires !"
                  : "Lancez une<br />capture sur la borne !"
                }
              </h2>
              <p className="text-lg text-white/60 max-w-lg mx-auto mb-10">
                {hasNoVideos 
                  ? "Videz la mémoires via les paramètres de la borne, puis capturez une nouvelle vidéo pour commencer."
                  : "Votre vidéo et son QR code apparaîtront automatiquement ici dès qu'ils seront prêts."
                }
              </p>
              
              {!hasNoVideos && (
                <motion.div 
                  className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/30 backdrop-blur-xl px-6 py-3"
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight className="h-5 w-5 text-white/50" />
                  <span className="text-sm font-medium text-white/70">La magie arrive...</span>
                </motion.div>
              )}
            </div>
          </motion.section>
        )}
      </div>
    </main>
  );
}
