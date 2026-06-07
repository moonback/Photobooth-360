import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Camera, Download, Loader2, AlertCircle, Gauge, CheckCircle2,
  Wifi, WifiOff, RectangleHorizontal, RectangleVertical, Square, Music, Sparkles, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loadVideo } from '../lib/videoStore';
import { loadSettings } from '../lib/settingsStore';
import { BACKGROUND_TRACKS, type MusicSelection } from '../lib/backgroundMusic';
import { useSlowMotion, SlowMotionSpeed, ExportFormat } from '../hooks/useSlowMotion';
import { useVideoComposer } from '../hooks/useVideoComposer';
import type { AppSettings } from '../components/SettingsModal';

type Speed = 1 | SlowMotionSpeed;

const SPEEDS: { value: Speed; label: string; sublabel: string }[] = [
  { value: 1,    label: '1×',  sublabel: 'Vitesse normale' },
  { value: 0.5,  label: '½×',  sublabel: 'Slow-Mo' },
  { value: 0.25, label: '¼×',  sublabel: 'Ultra Slow' },
];

const EXPORT_FORMATS: {
  value: ExportFormat;
  icon: typeof RectangleHorizontal;
  label: string;
  sublabel: string;
  aspectRatio: string;
}[] = [
  { value: '16:9', icon: RectangleHorizontal, label: '16:9', sublabel: 'Écrans & projection', aspectRatio: '16 / 9' },
  { value: '9:16', icon: RectangleVertical, label: '9:16', sublabel: 'Reels & Stories', aspectRatio: '9 / 16' },
  { value: '1:1', icon: Square, label: '1:1', sublabel: 'Instagram & bornes', aspectRatio: '1 / 1' },
];

type Phase = 'loading' | 'choose' | 'encoding' | 'ready' | 'error';
type Source = 'cloud' | 'local';

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neuro-accent/15 text-neuro-accent">
        {icon}
      </span>
      <h2 className="font-display text-[15px] font-bold text-white">{title}</h2>
    </div>
  );
}

function OptionCard({
  selected,
  disabled,
  onClick,
  children,
  className = '',
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border text-left transition-all touch-manipulation active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none ${
        selected
          ? 'border-neuro-accent bg-neuro-accent/12 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          : 'border-white/10 bg-white/[0.04] text-neuro-muted'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const [phase, setPhase] = useState<Phase>('loading');
  const [source, setSource] = useState<Source>('local');
  const [originalUrl, setOriginalUrl] = useState('');
  const [selectedSpeed, setSelectedSpeed] = useState<Speed>(1);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('16:9');
  const [selectedMusic, setSelectedMusic] = useState<MusicSelection>('none');
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolume] = useState(35);
  const [recordAudio, setRecordAudio] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const { processVideo, status, progress } = useSlowMotion();
  const { composeWithJingles, compositionStage, compositionProgress } = useVideoComposer();

  useEffect(() => {
    loadSettings().then((settings: AppSettings) => {
      setAppSettings(settings);
      setMusicEnabled(settings.backgroundMusicEnabled);
      setMusicVolume(settings.backgroundMusicVolume);
      setRecordAudio(settings.recordAudio);
      if (settings.backgroundMusicEnabled) {
        setSelectedMusic(settings.backgroundMusicDefault);
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

  const selectedFormatConfig = EXPORT_FORMATS.find((f) => f.value === selectedFormat) ?? EXPORT_FORMATS[0];
  const selectedTrackLabel = selectedMusic === 'none'
    ? null
    : BACKGROUND_TRACKS.find((t) => t.id === selectedMusic)?.label;
  const speedSlug = selectedSpeed === 1 ? 'normal' : selectedSpeed === 0.5 ? 'slowmo' : 'ultraslowmo';
  const formatSlug = selectedFormat.replace(':', 'x');
  const musicSlug = selectedMusic === 'none' ? '' : `-${selectedMusic}`;
  const filename = `photobooth360-${formatSlug}-${speedSlug}${musicSlug}.webm`;

  const encodingLabel =
    compositionStage === 'intro' ? "Ajout de l'intro…"
    : compositionStage === 'main' ? 'Traitement vidéo…'
    : compositionStage === 'outro' ? "Ajout de l'outro…"
    : compositionStage === 'finalizing' ? 'Finalisation…'
    : status === 'loading' ? 'Chargement FFmpeg…'
    : `Encodage… ${progress}%`;

  const encodingPct =
    compositionStage === 'idle' || compositionStage === 'done'
      ? (status === 'loading' ? 3 : progress)
      : compositionProgress;

  return (
    <div className="min-h-dvh bg-neuro-bg text-neuro-text font-sans flex flex-col">
      <div className="pointer-events-none fixed inset-0 premium-gradient grain-overlay opacity-60" />

      {/* Header sticky */}
      <header className="relative z-10 shrink-0 border-b border-white/6 bg-neuro-bg/80 backdrop-blur-xl px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neuro-accent/15">
              <Camera className="h-5 w-5 text-neuro-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-label text-neuro-accent">NeuroBooth 360</p>
              <h1 className="font-display text-[17px] font-bold text-white leading-tight truncate">
                {phase === 'ready' ? 'Export prêt' : 'Personnaliser'}
              </h1>
            </div>
          </div>
          <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            source === 'cloud' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/8 text-neuro-muted'
          }`}>
            {source === 'cloud' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {source === 'cloud' ? 'Cloud' : 'Local'}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto overscroll-contain no-bounce smooth-scroll">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">

          {phase === 'loading' && (
            <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3">
              <Loader2 className="h-9 w-9 animate-spin text-neuro-accent" />
              <p className="text-body text-neuro-muted">Chargement de la vidéo…</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <p className="font-display text-[16px] font-bold text-red-300">{errorMsg}</p>
                <p className="mt-2 text-caption text-neuro-muted">
                  Cette page fonctionne depuis l'appareil où la vidéo a été enregistrée, ou via un lien cloud.
                </p>
              </div>
            </div>
          )}

          {(phase === 'choose' || phase === 'encoding') && originalUrl && (
            <>
              <div className="glass-panel overflow-hidden rounded-2xl" style={{ aspectRatio: selectedFormatConfig.aspectRatio }}>
                <video
                  ref={videoRef}
                  src={originalUrl}
                  autoPlay
                  loop
                  playsInline
                  muted={false}
                  className="h-full w-full object-cover"
                />
              </div>

              <section>
                <SectionHeader icon={<RectangleHorizontal className="h-3.5 w-3.5" />} title="Format d'export" />
                <div className="grid grid-cols-3 gap-2">
                  {EXPORT_FORMATS.map(({ value, icon: Icon, label, sublabel }) => (
                    <OptionCard
                      key={value}
                      selected={selectedFormat === value}
                      disabled={phase === 'encoding'}
                      onClick={() => setSelectedFormat(value)}
                      className="flex min-h-[96px] flex-col items-center justify-center gap-1.5 px-2 py-3 text-center"
                    >
                      <Icon className="h-5 w-5" strokeWidth={selectedFormat === value ? 2.5 : 2} />
                      <span className="text-[13px] font-bold">{label}</span>
                      <span className="text-[10px] leading-tight opacity-60">{sublabel}</span>
                    </OptionCard>
                  ))}
                </div>
                <p className="mt-2 text-center text-caption text-neuro-muted/70">
                  Recadrage automatique centré pour chaque plateforme.
                </p>
              </section>

              <section>
                <SectionHeader icon={<Gauge className="h-3.5 w-3.5" />} title="Effet vitesse" />
                <div className="flex flex-col gap-2">
                  {SPEEDS.map(({ value, label, sublabel }) => (
                    <OptionCard
                      key={value}
                      selected={selectedSpeed === value}
                      disabled={phase === 'encoding'}
                      onClick={() => setSelectedSpeed(value)}
                      className="flex items-center gap-3 px-3.5 py-3"
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-black ${
                        selectedSpeed === value ? 'bg-neuro-accent/20 text-white' : 'bg-white/6 text-neuro-muted'
                      }`}>
                        {label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-inherit">{sublabel}</p>
                        {value !== 1 && (
                          <p className="text-caption opacity-60 mt-0.5">Aperçu en direct</p>
                        )}
                      </div>
                      {selectedSpeed === value && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-neuro-accent" />
                      )}
                    </OptionCard>
                  ))}
                </div>
              </section>

              {musicEnabled && (
                <section>
                  <SectionHeader icon={<Music className="h-3.5 w-3.5" />} title="Musique de fond" />
                  <div className="grid grid-cols-2 gap-2">
                    <OptionCard
                      selected={selectedMusic === 'none'}
                      disabled={phase === 'encoding'}
                      onClick={() => setSelectedMusic('none')}
                      className="flex h-11 items-center justify-center text-[12px] font-bold"
                    >
                      Sans musique
                    </OptionCard>
                    {BACKGROUND_TRACKS.map((track) => (
                      <OptionCard
                        key={track.id}
                        selected={selectedMusic === track.id}
                        disabled={phase === 'encoding'}
                        onClick={() => setSelectedMusic(track.id)}
                        className="flex h-11 items-center justify-center px-2 text-[12px] font-bold"
                      >
                        {track.label}
                      </OptionCard>
                    ))}
                  </div>
                  <p className="mt-2 text-center text-caption text-neuro-muted/70">
                    {selectedMusic === 'none'
                      ? 'Export sans musique ajoutée.'
                      : `Piste « ${selectedTrackLabel} » mixée au téléchargement.`}
                  </p>
                </section>
              )}

              <AnimatePresence>
                {phase === 'encoding' && (
                  <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-panel rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between text-caption text-neuro-muted mb-2">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-neuro-accent" />
                        {encodingLabel}
                      </span>
                      <span className="font-mono text-white">{encodingPct}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-neuro-accent"
                        animate={{ width: `${encodingPct}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="mt-2.5 text-center text-caption text-neuro-muted/70">
                      Traitement 100% local — aucune donnée envoyée
                    </p>
                  </motion.section>
                )}
              </AnimatePresence>

              {phase === 'choose' && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="btn-accent w-full"
                >
                  <Download className="h-5 w-5" />
                  Préparer le téléchargement · {selectedFormat}
                </button>
              )}
            </>
          )}

          {phase === 'ready' && (
            <>
              <div className="glass-panel-strong overflow-hidden rounded-2xl ring-1 ring-neuro-accent/20" style={{ aspectRatio: selectedFormatConfig.aspectRatio }}>
                <video
                  src={downloadUrl}
                  autoPlay
                  loop
                  playsInline
                  controls
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="glass-panel rounded-2xl p-4 text-center">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-label text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Export terminé
                </div>
                <p className="text-body text-neuro-muted">
                  {selectedSpeed === 1
                    ? `Format ${selectedFormat}${selectedTrackLabel ? ` · ${selectedTrackLabel}` : ''}`
                    : `Slow-motion ${selectedSpeed === 0.5 ? '½×' : '¼×'} · ${selectedFormat}`}
                </p>
              </div>

              <a
                href={downloadUrl}
                download={filename}
                className="btn-accent w-full"
              >
                <Download className="h-5 w-5" />
                Télécharger sur mon téléphone
              </a>

              <button
                type="button"
                onClick={() => { setPhase('choose'); setDownloadUrl(''); }}
                className="btn-secondary w-full gap-2 rounded-xl text-[13px] touch-manipulation"
              >
                <RotateCcw className="h-4 w-4" />
                Changer l'effet
              </button>
            </>
          )}

          <p className="flex items-center justify-center gap-1.5 text-caption text-neuro-muted/50 pt-1">
            <Sparkles className="h-3 w-3" />
            {source === 'cloud' ? 'Hébergé sur Supabase' : 'Stocké localement'}
          </p>
        </div>
      </main>
    </div>
  );
}
