import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Camera, Download, Loader2, AlertCircle, Gauge, CheckCircle, Wifi, WifiOff, RectangleHorizontal, RectangleVertical, Square, Music } from 'lucide-react';
import { loadVideo } from '../lib/videoStore';
import { loadSettings } from '../lib/settingsStore';
import { BACKGROUND_TRACKS, type MusicSelection } from '../lib/backgroundMusic';
import { useSlowMotion, SlowMotionSpeed, ExportFormat } from '../hooks/useSlowMotion';
import type { AppSettings } from '../components/SettingsModal';

type Speed = 1 | SlowMotionSpeed;

const SPEEDS: { value: Speed; emoji: string; label: string; sublabel: string }[] = [
  { value: 1,    emoji: '▶️',  label: '1×',  sublabel: 'Vitesse normale'  },
  { value: 0.5,  emoji: '🐢',  label: '½×',  sublabel: 'Slow-Mo'          },
  { value: 0.25, emoji: '✨',  label: '¼×',  sublabel: 'Ultra Slow'       },
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
  const [downloadUrl, setDownloadUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const { processVideo, status, progress } = useSlowMotion();

  useEffect(() => {
    loadSettings().then((settings: AppSettings) => {
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
    const result = await processVideo(originalUrl, selectedSpeed, selectedFormat, {
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
    <div className="min-h-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center font-sans overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center gap-3 px-3 py-4 pb-8">

        <div className="text-center space-y-0.5 flex-shrink-0">
          <div className="inline-flex items-center justify-center p-2 bg-indigo-500/10 rounded-full mb-0.5">
            <Camera className="w-5 h-5 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white">
            NeuroBooth <span className="text-indigo-400">360</span>
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
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
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
              <video
                ref={videoRef}
                src={originalUrl}
                autoPlay
                loop
                playsInline
                muted={false}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                <RectangleHorizontal className="w-4 h-4 text-indigo-400" />
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
                        ? 'bg-indigo-500/10 border-indigo-500 text-white'
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
                <Gauge className="w-4 h-4 text-indigo-400" />
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
                        ? 'bg-indigo-500/10 border-indigo-500 text-white'
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
                      <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {musicEnabled && (
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold">Musique de fond (optionnel)</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setSelectedMusic('none')}
                    disabled={phase === 'encoding'}
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-[12px] font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
                      selectedMusic === 'none'
                        ? 'bg-indigo-500/10 border-indigo-500 text-white'
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
                          ? 'bg-indigo-500/10 border-indigo-500 text-white'
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
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {status === 'loading' ? 'Chargement FFmpeg…' : `Encodage… ${progress}%`}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${status === 'loading' ? 3 : progress}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-600 text-center">
                  Traitement 100% local — aucune donnée envoyée
                </p>
              </div>
            )}

            {phase === 'choose' && (
              <button
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                <Download className="w-5 h-5" />
                Préparer le téléchargement {selectedFormat}
              </button>
            )}
          </>
        )}

        {phase === 'ready' && (
          <>
            <div className="w-full rounded-2xl overflow-hidden bg-black ring-1 ring-indigo-500/30" style={{ aspectRatio: selectedFormatConfig.aspectRatio }}>
              <video
                src={downloadUrl}
                autoPlay
                loop
                playsInline
                controls
                className="w-full h-full object-cover"
              />
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
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
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
          NeuroBooth 360 · {source === 'cloud' ? 'Vidéo hébergée sur Supabase Storage' : 'Vidéo stockée localement sur cet appareil'}
        </p>
      </div>
    </div>
  );
}
