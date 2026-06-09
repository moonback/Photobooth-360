import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, Loader2, AlertCircle, Gauge, CheckCircle, Wifi, WifiOff, RectangleHorizontal, RectangleVertical, Square, Music, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loadVideo } from '../lib/videoStore';
import { loadSettings } from '../lib/settingsStore';
import { BACKGROUND_TRACKS, type MusicSelection } from '../lib/backgroundMusic';
import { getPresentationBackground } from '../lib/presentationTemplates';
import { useSlowMotion, SlowMotionSpeed, ExportFormat } from '../hooks/useSlowMotion';
import { useVideoComposer } from '../hooks/useVideoComposer';
import { useMobileOptimizations, useHapticFeedback } from '../hooks/useMobileOptimizations';
import { resolveDefaultExportFormat } from '../lib/socialShare';
import { trackDownload } from '../lib/analytics';
import SocialSharePanel from '../components/SocialSharePanel';
import type { AppSettings } from '../components/SettingsModal';

type Speed = 1 | SlowMotionSpeed;

const SPEEDS: { value: Speed; emoji: string; label: string; sublabel: string; gradient: string }[] = [
  { value: 1,    emoji: '⚡',  label: '1×',  sublabel: 'Vitesse normale', gradient: 'from-gray-500 to-zinc-600' },
  { value: 0.5,  emoji: '🐢',  label: '½×',  sublabel: 'Slow-Motion', gradient: 'from-indigo-500 to-purple-600' },
  { value: 0.25, emoji: '✨',  label: '¼×',  sublabel: 'Ultra Slow', gradient: 'from-pink-500 to-rose-600' },
];

const EXPORT_FORMATS: {
  value: ExportFormat;
  icon: typeof RectangleHorizontal;
  label: string;
  sublabel: string;
  aspectRatio: string;
}[] = [
  { value: '16:9', icon: RectangleHorizontal, label: '16:9', sublabel: "Projection et écrans d'ambiance", aspectRatio: '16 / 9' },
  { value: '9:16', icon: RectangleVertical, label: '9:16', sublabel: 'Reels, TikTok, Stories', aspectRatio: '9 / 16' },
  { value: '1:1', icon: Square, label: '1:1', sublabel: 'Feed Instagram, bornes', aspectRatio: '1 / 1' },
];

type Phase = 'loading' | 'choose' | 'encoding' | 'ready' | 'error';
type Source = 'cloud' | 'local';

const ACCENT_COLOR_MAP: Record<AppSettings["accentColor"], string> = {
  indigo: "indigo",
  rose: "rose",
  amber: "amber",
  emerald: "emerald",
  cyan: "cyan",
};

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const mobile = useMobileOptimizations();
  const haptic = useHapticFeedback();

  const [phase, setPhase] = useState<Phase>('loading');
  const [source, setSource] = useState<Source>('local');
  const [originalUrl, setOriginalUrl] = useState('');
  const [selectedSpeed, setSelectedSpeed] = useState<Speed>(0.5);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('16:9');
  const [selectedMusic, setSelectedMusic] = useState<MusicSelection>('none');
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolume] = useState(35);
  const [recordAudio, setRecordAudio] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { processVideo, status, progress } = useSlowMotion();
  const { composeWithJingles, compositionStage, compositionProgress } = useVideoComposer();

  const accentColor = useMemo(() => appSettings?.accentColor || "indigo", [appSettings]);
  const accentClass = ACCENT_COLOR_MAP[accentColor];
  const bg = useMemo(() => getPresentationBackground(appSettings?.appBackground || "midnight"), [appSettings]);
  const backgroundStyle = appSettings?.appBackgroundUrl
    ? { backgroundImage: `url(${appSettings.appBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    : { background: `radial-gradient(circle at 50% 20%, ${bg.colors[1]}55, transparent 55%), linear-gradient(135deg, ${bg.colors.join(", ")})` };

  useEffect(() => {
    loadSettings().then((settings: AppSettings) => {
      setAppSettings(settings);
      setSelectedFormat(resolveDefaultExportFormat(settings.defaultExportFormat, mobile.isMobile));
      setMusicEnabled(settings.backgroundMusicEnabled);
      setMusicVolume(settings.backgroundMusicVolume);
      setRecordAudio(settings.recordAudio);
      if (settings.backgroundMusicEnabled) {
        setSelectedMusic(settings.backgroundMusicDefault);
      }
      if (settings.slowMotionEnabled) {
        setSelectedSpeed(settings.slowMotionSpeed);
      } else {
        setSelectedSpeed(1);
      }
    }).catch(() => undefined);
  }, [mobile.isMobile]);

  const sharePageUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, [phase, id, searchParams]);

  const handleDownloadClick = useCallback(() => {
    haptic.medium();
    trackDownload(id || `share_${Date.now()}`, appSettings?.eventName || 'default');
  }, [haptic, id, appSettings?.eventName]);

  useEffect(() => {
    if (!id) {
      setErrorMessage('Identifiant manquant dans le lien.');
      setPhase('error');
      return;
    }

    const encodedUrl = searchParams.get('url');
    if (encodedUrl) {
      try {
        const decoded = decodeURIComponent(atob(encodedUrl));
        setSource('cloud');
        setOriginalUrl(decoded);
        setPhase('choose');
        return;
      } catch {
        // fall through to IndexedDB
      }
    }

    loadVideo(id).then((url) => {
      if (url) {
        setSource('local');
        setOriginalUrl(url);
        setPhase('choose');
      } else {
        setErrorMessage('Vidéo introuvable. Elle a peut-être expiré ou été enregistrée sur un autre appareil.');
        setPhase('error');
      }
    }).catch(() => {
      setErrorMessage('Erreur lors de la récupération de la vidéo.');
      setPhase('error');
    });
  }, [id, searchParams]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = selectedSpeed;
  }, [selectedSpeed]);

  const handleConfirm = async () => {
    setPhase('encoding');
    setStartTime(Date.now());
    try {
      let sourceUrl = originalUrl;

      if (appSettings?.jingleEnabled) {
        sourceUrl = await composeWithJingles(originalUrl, appSettings, selectedFormat);
      }

      const result = await processVideo(sourceUrl, selectedSpeed, selectedFormat, {
        music: musicEnabled ? selectedMusic : 'none',
        musicVolume,
        mixWithVideoAudio: recordAudio,
      });

      if (result) {
        setDownloadUrl(result);
        setPhase('ready');
      } else {
        setErrorMessage("L'encodage a échoué. Réessayez avec un autre format ou choisissez la vitesse normale.");
        setPhase('choose');
      }
    } catch {
      setErrorMessage("L'encodage a échoué. Réessayez avec un autre format ou choisissez la vitesse normale.");
      setPhase('choose');
    }
  };

  const selectedFormatConfig = EXPORT_FORMATS.find((format) => format.value === selectedFormat) ?? EXPORT_FORMATS[0];
  const selectedTrackLabel = selectedMusic === 'none'
    ? null
    : BACKGROUND_TRACKS.find((t) => t.id === selectedMusic)?.label;
  const speedSlug = selectedSpeed === 1 ? 'normal' : selectedSpeed === 0.5 ? 'slowmo' : 'ultraslowmo';
  const formatSlug = selectedFormat.replace(':', 'x');
  const musicSlug = selectedMusic === 'none' ? '' : `-${selectedMusic}`;
  const filename = `photobooth360-${formatSlug}-${speedSlug}${musicSlug}.webm`;

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen h-screen text-zinc-100 flex flex-col items-center font-sans overflow-y-auto no-bounce smooth-scroll safe-top pb-safe-bottom"
      style={backgroundStyle}
    >
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -left-24 top-20 h-72 w-72 rounded-full blur-3xl"
          style={{ backgroundColor: `${bg.colors[1]}20` }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -right-24 bottom-16 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: `${bg.colors[1]}20` }}
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={phase !== 'loading' ? "visible" : "hidden"}
        className="w-full max-w-sm flex flex-col items-center gap-4 px-4 py-6 pb-10 relative z-10"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center space-y-2 flex-shrink-0">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {(appSettings?.logoUrl) ? (
              <div className="mx-auto mb-3 flex items-center justify-center">
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  src={appSettings.logoUrl}
                  alt="Logo de l'événement"
                  className="max-h-20 max-w-32 rounded-3xl object-contain shadow-2xl"
                />
              </div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`inline-flex items-center justify-center p-4 rounded-full mb-3 shadow-xl ${
                  accentClass === "indigo" ? "bg-indigo-500/20 border-2 border-indigo-500/50" :
                  accentClass === "rose" ? "bg-rose-500/20 border-2 border-rose-500/50" :
                  accentClass === "amber" ? "bg-amber-500/20 border-2 border-amber-500/50" :
                  accentClass === "emerald" ? "bg-emerald-500/20 border-2 border-emerald-500/50" : "bg-cyan-500/20 border-2 border-cyan-500/50"
                }`}
              >
                <Sparkles className={`w-8 h-8 ${
                  accentClass === "indigo" ? "text-indigo-400" :
                  accentClass === "rose" ? "text-rose-400" :
                  accentClass === "amber" ? "text-amber-400" :
                  accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
                }`} />
              </motion.div>
            )}
          </motion.div>

          <motion.h1
            className="text-2xl font-extrabold tracking-tight text-white"
            animate={{
              textShadow: [
                `0 0 20px ${accentClass === "indigo" ? "#6366f1" :
                  accentClass === "rose" ? "#f43f5e" :
                  accentClass === "amber" ? "#f59e0b" :
                  accentClass === "emerald" ? "#10b981" : "#06b6d4"}40`,
                `0 0 40px ${accentClass === "indigo" ? "#6366f1" :
                  accentClass === "rose" ? "#f43f5e" :
                  accentClass === "amber" ? "#f59e0b" :
                  accentClass === "emerald" ? "#10b981" : "#06b6d4"}30`,
                `0 0 20px ${accentClass === "indigo" ? "#6366f1" :
                  accentClass === "rose" ? "#f43f5e" :
                  accentClass === "amber" ? "#f59e0b" :
                  accentClass === "emerald" ? "#10b981" : "#06b6d4"}40`,
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {appSettings?.eventName || "NeuroBooth"} <span className={
              accentClass === "indigo" ? "text-indigo-400" :
              accentClass === "rose" ? "text-rose-400" :
              accentClass === "amber" ? "text-amber-400" :
              accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
            }>360</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-zinc-400 text-sm font-medium"
          >
            Ta vidéo est prête 🎉
          </motion.p>

          <motion.div
            variants={itemVariants}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full mt-1 backdrop-blur-sm ${
              source === 'cloud'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-500'
            }`}
          >
            {source === 'cloud'
              ? <><Wifi className="w-3.5 h-3.5" /> Partagé depuis le cloud</>
              : <><WifiOff className="w-3.5 h-3.5" /> Partagé en local</>
            }
          </motion.div>
        </motion.div>

        {/* Loading State */}
        {phase === 'loading' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-16 text-zinc-400 flex-shrink-0"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className={`w-12 h-12 ${
                accentClass === "indigo" ? "text-indigo-400" :
                accentClass === "rose" ? "text-rose-400" :
                accentClass === "amber" ? "text-amber-400" :
                accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
              }`} />
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base font-medium"
            >
              Chargement de ta vidéo…
            </motion.span>
          </motion.div>
        )}

        {/* Error State */}
        {phase === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-16 text-center flex-shrink-0"
          >
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
            >
              <AlertCircle className="w-12 h-12 text-red-400" />
            </motion.div>
            <p className="text-red-400 text-base font-medium">{errorMessage}</p>
            <p className="text-zinc-600 text-sm max-w-[250px]">
              Cette page fonctionne uniquement depuis l'appareil où la vidéo a été enregistrée.
            </p>
          </motion.div>
        )}

        {/* Choose / Encoding State */}
        {(phase === 'choose' || phase === 'encoding') && originalUrl && (
          <>
            {/* Video Preview */}
            <motion.div
              variants={itemVariants}
              className="w-full rounded-3xl overflow-hidden bg-black/50 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl"
              style={{ aspectRatio: selectedFormatConfig.aspectRatio }}
            >
              {videoError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <AlertCircle className="w-12 h-12 text-red-400" />
                  </motion.div>
                  <p className="text-red-400 text-base font-medium">Impossible de charger la vidéo</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setVideoError(false);
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }}
                    className="text-sm text-zinc-400 hover:text-white underline underline-offset-2"
                  >
                    Réessayer
                  </motion.button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={originalUrl}
                  autoPlay
                  loop
                  playsInline
                  muted
                  controls
                  onError={() => setVideoError(true)}
                  onLoadedMetadata={(e) => {
                    if (e.currentTarget.duration > 0) {
                      setVideoError(false);
                      e.currentTarget.play().catch(() => {
                        // Ignore autoplay errors
                      });
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>

            {/* Format Selection */}
            <motion.div variants={itemVariants} className="w-full space-y-3">
              <div className="flex items-center gap-2.5">
                <RectangleHorizontal className={`w-5 h-5 ${
                  accentClass === "indigo" ? "text-indigo-400" :
                  accentClass === "rose" ? "text-rose-400" :
                  accentClass === "amber" ? "text-amber-400" :
                  accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
                }`} />
                <span className="text-base font-bold">Choisis ton format</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {EXPORT_FORMATS.map(({ value, icon: Icon, label, sublabel }) => (
                  <motion.button
                    key={value}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedFormat(value)}
                    disabled={phase === 'encoding'}
                    className={`flex min-h-[110px] flex-col items-center justify-center gap-2.5 rounded-2xl border-2 px-3 py-3 text-center transition-all disabled:opacity-50 ${
                      selectedFormat === value
                        ? (
                          accentClass === "indigo" ? "bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border-indigo-500 text-white shadow-[0_0_25px_rgba(99,102,241,0.2)]" :
                          accentClass === "rose" ? "bg-gradient-to-br from-rose-500/20 to-rose-600/10 border-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.2)]" :
                          accentClass === "amber" ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500 text-white shadow-[0_0_25px_rgba(245,158,11,0.2)]" :
                          accentClass === "emerald" ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.2)]" : "bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.2)]"
                        )
                        : 'bg-zinc-800/70 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white backdrop-blur-xl'
                    }`}
                  >
                    <Icon className="h-8 w-8" />
                    <div>
                      <div className="text-base font-extrabold">{label}</div>
                      <div className="mt-1 text-[11px] leading-tight opacity-70">{sublabel}</div>
                    </div>
                    {selectedFormat === value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      >
                        <Check className="w-5 h-5 text-emerald-400" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
              <p className="text-center text-xs text-zinc-600">
                Recadrage automatique centré, optimisé pour chaque plateforme.
              </p>
            </motion.div>

            {/* Speed Selection */}
            <motion.div variants={itemVariants} className="w-full space-y-3">
              <div className="flex items-center gap-2.5">
                <Gauge className={`w-5 h-5 ${
                  accentClass === "indigo" ? "text-indigo-400" :
                  accentClass === "rose" ? "text-rose-400" :
                  accentClass === "amber" ? "text-amber-400" :
                  accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
                }`} />
                <span className="text-base font-bold">Choisis ton effet</span>
              </div>

              <div className="flex flex-col gap-2">
                {SPEEDS.map(({ value, emoji, label, sublabel, gradient }) => (
                  <motion.button
                    key={value}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSpeed(value)}
                    disabled={phase === 'encoding'}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all disabled:opacity-50 ${
                      selectedSpeed === value
                        ? (
                          `bg-gradient-to-r ${gradient}/20 border-white/30 text-white shadow-xl backdrop-blur-xl`
                        )
                        : 'bg-zinc-800/70 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white backdrop-blur-xl'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{label} — {sublabel}</div>
                      {value !== 1 && (
                        <div className="text-xs opacity-70 mt-1">
                          Aperçu en direct
                        </div>
                      )}
                    </div>
                    {selectedSpeed === value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          accentClass === "indigo" ? "bg-indigo-400" :
                          accentClass === "rose" ? "bg-rose-400" :
                          accentClass === "amber" ? "bg-amber-400" :
                          accentClass === "emerald" ? "bg-emerald-400" : "bg-cyan-400"
                        }`}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Music Selection */}
            {musicEnabled && (
              <motion.div variants={itemVariants} className="w-full space-y-3">
                <div className="flex items-center gap-2.5">
                  <Music className={`w-5 h-5 ${
                    accentClass === "indigo" ? "text-indigo-400" :
                    accentClass === "rose" ? "text-rose-400" :
                    accentClass === "amber" ? "text-amber-400" :
                    accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
                  }`} />
                  <span className="text-base font-bold">Musique de fond</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedMusic('none')}
                    disabled={phase === 'encoding'}
                    className={`flex h-12 items-center justify-center gap-1.5 rounded-2xl border-2 text-sm font-bold transition-all disabled:opacity-50 ${
                      selectedMusic === 'none'
                        ? (
                          accentClass === "indigo" ? "bg-gradient-to-r from-indigo-500/20 to-indigo-600/10 border-indigo-500 text-white shadow-lg" :
                          accentClass === "rose" ? "bg-gradient-to-r from-rose-500/20 to-rose-600/10 border-rose-500 text-white shadow-lg" :
                          accentClass === "amber" ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500 text-white shadow-lg" :
                          accentClass === "emerald" ? "bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border-emerald-500 text-white shadow-lg" : "bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border-cyan-500 text-white shadow-lg"
                        )
                        : 'bg-zinc-800/70 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white backdrop-blur-xl'
                    }`}
                  >
                    Sans musique
                  </motion.button>
                  {BACKGROUND_TRACKS.map((track) => (
                    <motion.button
                      key={track.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedMusic(track.id)}
                      disabled={phase === 'encoding'}
                      className={`flex h-12 items-center justify-center rounded-2xl border-2 px-3 text-sm font-bold transition-all disabled:opacity-50 ${
                        selectedMusic === track.id
                          ? (
                            accentClass === "indigo" ? "bg-gradient-to-r from-indigo-500/20 to-indigo-600/10 border-indigo-500 text-white shadow-lg" :
                            accentClass === "rose" ? "bg-gradient-to-r from-rose-500/20 to-rose-600/10 border-rose-500 text-white shadow-lg" :
                            accentClass === "amber" ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500 text-white shadow-lg" :
                            accentClass === "emerald" ? "bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border-emerald-500 text-white shadow-lg" : "bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border-cyan-500 text-white shadow-lg"
                          )
                          : 'bg-zinc-800/70 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white backdrop-blur-xl'
                    }`}
                    >
                      {track.label}
                    </motion.button>
                  ))}
                </div>
                <p className="text-center text-xs text-zinc-600">
                  {selectedMusic === 'none'
                    ? 'La vidéo sera exportée sans musique ajoutée.'
                    : `Piste « ${selectedTrackLabel} » mixée lors du téléchargement.`}
                </p>
              </motion.div>
            )}

            {/* Confirm Button */}
            {phase === 'choose' && (
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                className={`w-full flex items-center justify-center gap-3 py-4 text-white font-bold rounded-2xl transition-all shadow-2xl ${
                  accentClass === "indigo" ? "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)]" :
                  accentClass === "rose" ? "bg-gradient-to-r from-rose-500 to-rose-600 shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.5)]" :
                  accentClass === "amber" ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)]" :
                  accentClass === "emerald" ? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]" : "bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]"
                }`}
              >
                <Download className="w-6 h-6" />
                Préparer le téléchargement {selectedFormat}
              </motion.button>
            )}
          </>
        )}

        {/* Encoding Modal */}
        <AnimatePresence>
          {phase === 'encoding' && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-zinc-900/90 backdrop-blur-2xl border border-zinc-700/50 rounded-3xl p-8 w-full max-w-sm mx-4 shadow-[0_0_60px_rgba(0,0,0,0.5)]"
              >
                <div className="flex flex-col items-center gap-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className={`w-14 h-14 ${
                      accentClass === "indigo" ? "text-indigo-400" :
                      accentClass === "rose" ? "text-rose-400" :
                      accentClass === "amber" ? "text-amber-400" :
                      accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
                    }`} />
                  </motion.div>

                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-extrabold text-white">
                      Préparation de ta vidéo…
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {compositionStage === 'intro' && 'Ajout de l\'intro…'}
                      {compositionStage === 'main' && 'Traitement vidéo…'}
                      {compositionStage === 'outro' && 'Ajout de l\'outro…'}
                      {compositionStage === 'finalizing' && 'Finalisation intro/outro…'}
                      {(compositionStage === 'idle' || compositionStage === 'done') && (
                        status === 'loading' ? 'Chargement FFmpeg…' : `Encodage…`
                      )}
                    </p>
                  </div>

                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between text-sm text-zinc-400 font-semibold">
                      <span>Progression</span>
                      <span>
                        {compositionStage === 'idle' || compositionStage === 'done'
                          ? `${progress}%`
                          : `${compositionProgress}%`}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${
                            compositionStage === 'idle' || compositionStage === 'done'
                              ? (status === 'loading' ? 3 : progress)
                              : compositionProgress
                          }%`,
                        }}
                        className={`h-full rounded-full ${
                          accentClass === "indigo" ? "bg-gradient-to-r from-indigo-500 to-indigo-400" :
                          accentClass === "rose" ? "bg-gradient-to-r from-rose-500 to-rose-400" :
                          accentClass === "amber" ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                          accentClass === "emerald" ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-cyan-500 to-cyan-400"
                        }`}
                      />
                    </div>
                  </div>

                  {(() => {
                    const currentProgress = compositionStage === 'idle' || compositionStage === 'done' ? progress : compositionProgress;
                    if (currentProgress > 0 && currentProgress < 100) {
                      const elapsed = (Date.now() - startTime) / 1000;
                      const estimatedTotal = elapsed / (currentProgress / 100);
                      const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);

                      let timeText = '';
                      if (estimatedRemaining < 60) {
                        timeText = `~${Math.ceil(estimatedRemaining)}s`;
                      } else {
                        const minutes = Math.floor(estimatedRemaining / 60);
                        const seconds = Math.ceil(estimatedRemaining % 60);
                        timeText = `~${minutes}m${seconds}s`;
                      }

                      return (
                        <p className="text-sm text-zinc-400 text-center">
                          Temps restant estimé: <span className="font-semibold">{timeText}</span>
                        </p>
                      );
                    }
                    return null;
                  })()}

                  <p className="text-xs text-zinc-600 text-center">
                    Traitement 100% local — aucune donnée envoyée
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ready State */}
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6"
          >
            {/* Result Video */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-full rounded-3xl overflow-hidden bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl"
              style={{ aspectRatio: selectedFormatConfig.aspectRatio }}
            >
              {videoError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                  <p className="text-red-400 text-base font-medium">Impossible de charger la vidéo</p>
                  <button
                    onClick={() => setVideoError(false)}
                    className="text-sm text-zinc-400 hover:text-white underline underline-offset-2"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                <video
                  src={downloadUrl}
                  autoPlay
                  loop
                  playsInline
                  muted
                  controls
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="flex items-center gap-2 text-emerald-400"
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  {selectedSpeed === 1
                    ? `Export ${selectedFormat} prêt${selectedTrackLabel ? ` · ${selectedTrackLabel}` : ''}`
                    : `Export ${selectedFormat} · Slow-motion ${selectedSpeed === 0.5 ? '½×' : '¼×'} encodé`}
                </span>
              </motion.div>

              <motion.a
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                href={downloadUrl}
                download={filename}
                onClick={handleDownloadClick}
                className={`w-full flex items-center justify-center gap-3 py-4 text-white font-bold rounded-2xl transition-all shadow-2xl ${
                  accentClass === "indigo" ? "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)]" :
                  accentClass === "rose" ? "bg-gradient-to-r from-rose-500 to-rose-600 shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.5)]" :
                  accentClass === "amber" ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)]" :
                  accentClass === "emerald" ? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]" : "bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]"
                }`}
              >
                <Download className="w-6 h-6" />
                Télécharger sur mon téléphone
              </motion.a>

              {appSettings && (
                <SocialSharePanel
                  settings={appSettings}
                  shareUrl={sharePageUrl}
                  videoId={id || filename}
                  videoBlobUrl={downloadUrl}
                  filename={filename}
                  eventId={appSettings.eventName || 'default'}
                  accentClass={
                    accentClass === "indigo" ? "bg-gradient-to-r from-indigo-500 to-indigo-600" :
                    accentClass === "rose" ? "bg-gradient-to-r from-rose-500 to-rose-600" :
                    accentClass === "amber" ? "bg-gradient-to-r from-amber-500 to-amber-600" :
                    accentClass === "emerald" ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-gradient-to-r from-cyan-500 to-cyan-600"
                  }
                />
              )}

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setPhase('choose');
                  setDownloadUrl('');
                }}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4"
              >
                Changer l'effet
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-center"
        >
          <p className="text-xs text-zinc-700">
            {appSettings?.eventName || "NeuroBooth"} 360 · {source === 'cloud' ? 'Vidéo hébergée sur Supabase Storage' : 'Vidéo stockée localement sur cet appareil'}
          </p>
        </motion.footer>
      </motion.div>
    </motion.div>
  );
}
