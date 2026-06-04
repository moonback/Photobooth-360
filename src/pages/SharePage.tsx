import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Camera, Download, Loader2, AlertCircle, Gauge, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { loadVideo } from '../lib/videoStore';
import { useSlowMotion, SlowMotionSpeed } from '../hooks/useSlowMotion';

type Speed = 1 | SlowMotionSpeed;

const SPEEDS: { value: Speed; emoji: string; label: string; sublabel: string }[] = [
  { value: 1,    emoji: '▶️',  label: '1×',  sublabel: 'Vitesse normale'  },
  { value: 0.5,  emoji: '🐢',  label: '½×',  sublabel: 'Slow-Mo'          },
  { value: 0.25, emoji: '✨',  label: '¼×',  sublabel: 'Ultra Slow'       },
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
  const [downloadUrl, setDownloadUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const { processVideo, status, progress } = useSlowMotion();

  useEffect(() => {
    if (!id) {
      setErrorMsg('Identifiant manquant dans le lien.');
      setPhase('error');
      return;
    }

    // Case 1: The QR Code points to a full Supabase public URL
    // We encode it as ?url=<base64> to keep the route clean, OR
    // the id IS the full URL (Supabase public URLs contain slashes so we
    // encode the whole thing as a search param instead)
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

    // Case 2: Local IndexedDB share (same-device / same-network)
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

  // Apply playbackRate preview instantly
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = selectedSpeed;
  }, [selectedSpeed]);

  const handleConfirm = async () => {
    if (selectedSpeed === 1) {
      setDownloadUrl(originalUrl);
      setPhase('ready');
      return;
    }
    setPhase('encoding');
    const result = await processVideo(originalUrl, selectedSpeed as SlowMotionSpeed);
    if (result) {
      setDownloadUrl(result);
      setPhase('ready');
    } else {
      setErrorMsg("L'encodage a échoué. Réessayez ou choisissez la vitesse normale.");
      setPhase('choose');
    }
  };

  const filename = selectedSpeed === 1
    ? 'photobooth360.webm'
    : `photobooth360-${selectedSpeed === 0.5 ? 'slowmo' : 'ultraslowmo'}.webm`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-8 font-sans">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center p-2.5 bg-indigo-500/10 rounded-full mb-1">
            <Camera className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            NeuroBooth <span className="text-indigo-400">360</span>
          </h1>
          <p className="text-zinc-400 text-sm">Ta vidéo est prête 🎉</p>
          <div className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full mt-1 ${
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

        {/* ── LOADING ── */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-12 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <span className="text-sm">Chargement de ta vidéo…</span>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <p className="text-zinc-600 text-xs">
              Cette page fonctionne uniquement depuis l'appareil où la vidéo a été enregistrée.
            </p>
          </div>
        )}

        {/* ── CHOOSE SPEED ── */}
        {(phase === 'choose' || phase === 'encoding') && originalUrl && (
          <>
            {/* Preview player */}
            <div className="w-full rounded-2xl overflow-hidden bg-black aspect-video ring-1 ring-white/10">
              <video
                ref={videoRef}
                src={originalUrl}
                autoPlay
                loop
                playsInline
                muted={false}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Speed picker */}
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold">Choisis ton effet</span>
              </div>

              <div className="flex flex-col gap-2">
                {SPEEDS.map(({ value, emoji, label, sublabel }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedSpeed(value)}
                    disabled={phase === 'encoding'}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all active:scale-[0.98] disabled:opacity-50 ${
                      selectedSpeed === value
                        ? 'bg-indigo-500/10 border-indigo-500 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{label} — {sublabel}</div>
                      {value !== 1 && (
                        <div className="text-xs opacity-60 mt-0.5">
                          Aperçu en direct · export encodé au téléchargement
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

            {/* Encoding progress */}
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

            {/* CTA */}
            {phase === 'choose' && (
              <button
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-semibold rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                <Download className="w-5 h-5" />
                Préparer le téléchargement
              </button>
            )}
          </>
        )}

        {/* ── READY TO DOWNLOAD ── */}
        {phase === 'ready' && (
          <>
            {/* Playback */}
            <div className="w-full rounded-2xl overflow-hidden bg-black aspect-video ring-1 ring-indigo-500/30">
              <video
                src={downloadUrl}
                autoPlay
                loop
                playsInline
                controls
                className="w-full h-full object-contain"
              />
            </div>

            <div className="w-full flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                {selectedSpeed === 1
                  ? 'Vidéo originale prête'
                  : `Slow-motion ${selectedSpeed === 0.5 ? '½×' : '¼×'} encodé`}
              </div>

              <a
                href={downloadUrl}
                download={filename}
                className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-semibold rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                <Download className="w-5 h-5" />
                Télécharger sur mon téléphone
              </a>

              <button
                onClick={() => {
                  setPhase('choose');
                  setDownloadUrl('');
                }}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
              >
                Changer l'effet
              </button>
            </div>
          </>
        )}

        <p className="text-xs text-zinc-700 text-center mt-2">
          NeuroBooth 360 · {source === 'cloud' ? 'Vidéo hébergée sur Supabase Storage' : 'Vidéo stockée localement sur cet appareil'}
        </p>
      </div>
    </div>
  );
}
