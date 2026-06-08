import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Camera, Download, Loader2, AlertCircle, Gauge, CheckCircle, Wifi, WifiOff, RectangleHorizontal, RectangleVertical, Square, Music, Sparkles } from 'lucide-react';
import { loadVideo } from '../lib/videoStore';
import { loadSettings } from '../lib/settingsStore';
import { BACKGROUND_TRACKS, type MusicSelection } from '../lib/backgroundMusic';
import { getPresentationBackground } from '../lib/presentationTemplates';
import { useSlowMotion, SlowMotionSpeed, ExportFormat } from '../hooks/useSlowMotion';
import { useVideoComposer } from '../hooks/useVideoComposer';
import type { AppSettings } from '../components/SettingsModal';

type Speed = 1 | SlowMotionSpeed;

const SPEEDS: { value: Speed; emoji: string; label: string; sublabel: string }[] = [
  { value: 1,    emoji: '▶️',  label: '1×',  sublabel: 'Vitesse normale' },
  { value: 0.5,  emoji: '🐢',  label: '½×',  sublabel: 'Slow-Motion' },
  { value: 0.25, emoji: '✨',  label: '¼×',  sublabel: 'Ultra Slow' },
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
  const [errorMsg, setErrorMsg] = useState('');
  const [videoError, setVideoError] = useState(false);
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
  }, []);

  useEffect(() => {
    if (!id) {
      setErrorMsg('Identifiant manquant dans le lien.');
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
        setErrorMsg('Vidéo introuvable. Elle a peut-être expiré ou été enregistrée sur un autre appareil.');
        setPhase('error');
      }
    }).catch(() => {
      setErrorMsg('Erreur lors de la récupération de la vidéo.');
      setPhase('error');
    });
  }, [id, searchParams]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = selectedSpeed;
  }, [selectedSpeed]);

  const handleConfirm = async () => {
    setPhase('encoding');
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
        setErrorMsg("L'encodage a échoué. Réessayez avec un autre format ou choisissez la vitesse normale.");
        setPhase('choose');
      }
    } catch {
      setErrorMsg("L'encodage a échoué. Réessayez avec un autre format ou choisissez la vitesse normale.");
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

  return (
    <div className="min-h-screen h-screen text-zinc-100 flex flex-col items-center font-sans overflow-y-auto" style={backgroundStyle}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full blur-3xl motion-safe:animate-pulse" style={{ backgroundColor: `${bg.colors[1]}20` }} />
        <div className="absolute -right-24 bottom-16 h-80 w-80 rounded-full blur-3xl motion-safe:animate-pulse" style={{ backgroundColor: `${bg.colors[1]}20` }} />
      </div>
      <div className="w-full max-w-sm flex flex-col items-center gap-3 px-3 py-4 pb-8 relative z-10">

        <div className="text-center space-y-0.5 flex-shrink-0">
          {(appSettings?.logoUrl) ? (
            <div className="mx-auto mb-2 flex items-center justify-center">
              <img
                src={appSettings.logoUrl}
                alt="Logo de l'événement"
                className="max-h-16 max-w-28 rounded-2xl object-contain"
              />
            </div>
          ) : (
            <div className={`inline-flex items-center justify-center p-3 rounded-full mb-2 ${
              accentClass === "indigo" ? "bg-indigo-500/10" :
              accentClass === "rose" ? "bg-rose-500/10" :
              accentClass === "amber" ? "bg-amber-500/10" :
              accentClass === "emerald" ? "bg-emerald-500/10" : "bg-cyan-500/10"
            }`}>
              <Sparkles className={`w-6 h-6 ${
                accentClass === "indigo" ? "text-indigo-400" :
                accentClass === "rose" ? "text-rose-400" :
                accentClass === "amber" ? "text-amber-400" :
                accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
              }`} />
            </div>
          )}
          <h1 className="text-xl font-bold text-white">
            {appSettings?.eventName || "NeuroBooth"} <span className={
              accentClass === "indigo" ? "text-indigo-400" :
              accentClass === "rose" ? "text-rose-400" :
              accentClass === "amber" ? "text-amber-400" :
              accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
            }>360</span>
          </h1>
          <p className="text-zinc-400 text-xs">Ta vidéo est prête 🎉</p>
          <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-0.5 ${
            source === 'cloud'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-zinc-800 text-zinc-500'
          }`}>
            {source === 'cloud'
              ? <><Wifi className="w-3 h-3" /> Partagé depuis le cloud</>
              : <><WifiOff className="w-3 h-3" /> Partagé en local</>
            }
          </div>
        </div>

        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-12 text-zinc-400 flex-shrink-0">
            <Loader2 className={`w-8 h-8 animate-spin ${
              accentClass === "indigo" ? "text-indigo-400" :
              accentClass === "rose" ? "text-rose-400" :
              accentClass === "amber" ? "text-amber-400" :
              accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
            }`} />
            <span className="text-sm">Chargement de ta vidéo…</span>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-3 py-12 text-center flex-shrink-0">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <p className="text-zinc-600 text-xs">
              Cette page fonctionne uniquement depuis l'appareil où la vidéo a été enregistrée.
            </p>
          </div>
        )}

        {(phase === 'choose' || phase === 'encoding') && originalUrl && (
          <>
            <div className="w-full rounded-2xl overflow-hidden bg-black ring-1 ring-white/10" style={{ aspectRatio: selectedFormatConfig.aspectRatio }}>
              {videoError ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <p className="text-red-400 text-sm">Impossible de charger la vidéo</p>
                  <button 
                    onClick={() => {
                      setVideoError(false);
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }}
                    className="text-xs text-zinc-400 hover:text-white underline"
                  >
                    Réessayer
                  </button>
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
                        // Ignore autoplay errors, user will press play manually
                      });
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                <RectangleHorizontal className={`w-4 h-4 ${
                  accentClass === "indigo" ? "text-indigo-400" :
                  accentClass === "rose" ? "text-rose-400" :
                  accentClass === "amber" ? "text-amber-400" :
                  accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
                }`} />
                <span className="text-sm font-semibold">Choisis ton format d'export</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {EXPORT_FORMATS.map(({ value, icon: Icon, label, sublabel }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedFormat(value)}
                    disabled={phase === 'encoding'}
                    className={`flex min-h-[102px] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-2 text-center transition-all active:scale-[0.98] disabled:opacity-50 ${
                      selectedFormat === value
                        ? (
                          accentClass === "indigo" ? "bg-indigo-500/10 border-indigo-500 text-white" :
                          accentClass === "rose" ? "bg-rose-500/10 border-rose-500 text-white" :
                          accentClass === "amber" ? "bg-amber-500/10 border-amber-500 text-white" :
                          accentClass === "emerald" ? "bg-emerald-500/10 border-emerald-500 text-white" : "bg-cyan-500/10 border-cyan-500 text-white"
                        )
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <div>
                      <div className="text-sm font-bold">{label}</div>
                      <div className="mt-0.5 text-[10px] leading-tight opacity-60">{sublabel}</div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-center text-[11px] text-zinc-600">
                Recadrage automatique centré, optimisé pour chaque plateforme.
              </p>
            </div>

            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                <Gauge className={`w-4 h-4 ${
                  accentClass === "indigo" ? "text-indigo-400" :
                  accentClass === "rose" ? "text-rose-400" :
                  accentClass === "amber" ? "text-amber-400" :
                  accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
                }`} />
                <span className="text-sm font-semibold">Choisis ton effet</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {SPEEDS.map(({ value, emoji, label, sublabel }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedSpeed(value)}
                    disabled={phase === 'encoding'}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all active:scale-[0.98] disabled:opacity-50 ${
                      selectedSpeed === value
                        ? (
                          accentClass === "indigo" ? "bg-indigo-500/10 border-indigo-500 text-white" :
                          accentClass === "rose" ? "bg-rose-500/10 border-rose-500 text-white" :
                          accentClass === "amber" ? "bg-amber-500/10 border-amber-500 text-white" :
                          accentClass === "emerald" ? "bg-emerald-500/10 border-emerald-500 text-white" : "bg-cyan-500/10 border-cyan-500 text-white"
                        )
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{label} — {sublabel}</div>
                      {value !== 1 && (
                        <div className="text-xs opacity-60 mt-0.5">
                          Aperçu en direct
                        </div>
                      )}
                    </div>
                    {selectedSpeed === value && (
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        accentClass === "indigo" ? "bg-indigo-400" :
                        accentClass === "rose" ? "bg-rose-400" :
                        accentClass === "amber" ? "bg-amber-400" :
                        accentClass === "emerald" ? "bg-emerald-400" : "bg-cyan-400"
                      }`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {musicEnabled && (
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2">
                  <Music className={`w-4 h-4 ${
                    accentClass === "indigo" ? "text-indigo-400" :
                    accentClass === "rose" ? "text-rose-400" :
                    accentClass === "amber" ? "text-amber-400" :
                    accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
                  }`} />
                  <span className="text-sm font-semibold">Musique de fond (optionnel)</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setSelectedMusic('none')}
                    disabled={phase === 'encoding'}
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
                      selectedMusic === 'none'
                        ? (
                          accentClass === "indigo" ? "bg-indigo-500/10 border-indigo-500 text-white" :
                          accentClass === "rose" ? "bg-rose-500/10 border-rose-500 text-white" :
                          accentClass === "amber" ? "bg-amber-500/10 border-amber-500 text-white" :
                          accentClass === "emerald" ? "bg-emerald-500/10 border-emerald-500 text-white" : "bg-cyan-500/10 border-cyan-500 text-white"
                        )
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    Sans musique
                  </button>
                  {BACKGROUND_TRACKS.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => setSelectedMusic(track.id)}
                      disabled={phase === 'encoding'}
                      className={`flex h-10 items-center justify-center rounded-xl border px-2 text-[12px] font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
                        selectedMusic === track.id
                          ? (
                            accentClass === "indigo" ? "bg-indigo-500/10 border-indigo-500 text-white" :
                            accentClass === "rose" ? "bg-rose-500/10 border-rose-500 text-white" :
                            accentClass === "amber" ? "bg-amber-500/10 border-amber-500 text-white" :
                            accentClass === "emerald" ? "bg-emerald-500/10 border-emerald-500 text-white" : "bg-cyan-500/10 border-cyan-500 text-white"
                          )
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                    >
                      {track.label}
                    </button>
                  ))}
                </div>
                <p className="text-center text-[11px] text-zinc-600">
                  {selectedMusic === 'none'
                    ? 'La vidéo sera exportée sans musique ajoutée.'
                    : `Piste « ${selectedTrackLabel} » mixée lors du téléchargement.`}
                </p>
              </div>
            )}

            {phase === 'encoding' && (
              // Modal overlay
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className={`w-10 h-10 animate-spin ${
                      accentClass === "indigo" ? "text-indigo-400" :
                      accentClass === "rose" ? "text-rose-400" :
                      accentClass === "amber" ? "text-amber-400" :
                      accentClass === "emerald" ? "text-emerald-400" : "text-cyan-400"
                    }`} />
                    
                    <div className="text-center space-y-1">
                      <h3 className="text-lg font-semibold text-white">
                        Préparation de la vidéo…
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

                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Progression</span>
                        <span className="font-semibold">
                          {compositionStage === 'idle' || compositionStage === 'done'
                            ? `${progress}%`
                            : `${compositionProgress}%`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            accentClass === "indigo" ? "bg-indigo-500" :
                            accentClass === "rose" ? "bg-rose-500" :
                            accentClass === "amber" ? "bg-amber-500" :
                            accentClass === "emerald" ? "bg-emerald-500" : "bg-cyan-500"
                          }`}
                          style={{
                            width: `${
                              compositionStage === 'idle' || compositionStage === 'done'
                                ? (status === 'loading' ? 3 : progress)
                                : compositionProgress
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 text-center">
                      Traitement 100% local — aucune donnée envoyée
                    </p>
                  </div>
                </div>
              </div>
            )}

            {phase === 'choose' && (
              <button
                onClick={handleConfirm}
                className={`w-full flex items-center justify-center gap-2 py-3 hover:brightness-110 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] ${
                  accentClass === "indigo" ? "bg-indigo-500 hover:bg-indigo-600" :
                  accentClass === "rose" ? "bg-rose-500 hover:bg-rose-600" :
                  accentClass === "amber" ? "bg-amber-500 hover:bg-amber-600" :
                  accentClass === "emerald" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-cyan-500 hover:bg-cyan-600"
                }`}
              >
                <Download className="w-5 h-5" />
                Préparer le téléchargement {selectedFormat}
              </button>
            )}
          </>
        )}

        {phase === 'ready' && (
          <>
            <div className="w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: selectedFormatConfig.aspectRatio, boxShadow: accentClass === "indigo" ? "0 0 0 1px rgba(99, 102, 241, 0.3)" :
              accentClass === "rose" ? "0 0 0 1px rgba(244, 63, 94, 0.3)" :
              accentClass === "amber" ? "0 0 0 1px rgba(245, 158, 11, 0.3)" :
              accentClass === "emerald" ? "0 0 0 1px rgba(16, 185, 129, 0.3)" : "0 0 0 1px rgba(6, 182, 212, 0.3)" }}>
              {videoError ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <p className="text-red-400 text-sm">Impossible de charger la vidéo</p>
                  <button 
                    onClick={() => {
                      setVideoError(false);
                    }}
                    className="text-xs text-zinc-400 hover:text-white underline"
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
            </div>

            <div className="w-full flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                {selectedSpeed === 1
                  ? `Export ${selectedFormat} prêt${selectedTrackLabel ? ` · ${selectedTrackLabel}` : ''}`
                  : `Export ${selectedFormat} · Slow-motion ${selectedSpeed === 0.5 ? '½×' : '¼×'} encodé`}
              </div>

              <a
                href={downloadUrl}
                download={filename}
                className={`w-full flex items-center justify-center gap-2 py-3 hover:brightness-110 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] ${
                  accentClass === "indigo" ? "bg-indigo-500 hover:bg-indigo-600" :
                  accentClass === "rose" ? "bg-rose-500 hover:bg-rose-600" :
                  accentClass === "amber" ? "bg-amber-500 hover:bg-amber-600" :
                  accentClass === "emerald" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-cyan-500 hover:bg-cyan-600"
                }`}
              >
                <Download className="w-5 h-5" />
                Télécharger sur mon téléphone
              </a>

              <button
                onClick={() => {
                  setPhase('choose');
                  setDownloadUrl('');
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
              >
                Changer l'effet
              </button>
            </div>
          </>
        )}

        <p className="text-xs text-zinc-700 text-center mt-1">
          {appSettings?.eventName || "NeuroBooth"} 360 · {source === 'cloud' ? 'Vidéo hébergée sur Supabase Storage' : 'Vidéo stockée localement sur cet appareil'}
        </p>
      </div>
    </div>
  );
}
