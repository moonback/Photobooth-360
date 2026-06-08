import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Camera, Download, Loader2, AlertCircle, Wifi, WifiOff, Sparkles } from 'lucide-react';
import { loadVideo } from '../lib/videoStore';
import { loadSettings } from '../lib/settingsStore';
import { getPresentationBackground } from '../lib/presentationTemplates';
import { AppSettings } from '../components/SettingsModal';

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [source, setSource] = useState<'cloud' | 'local'>('local');
  const [videoUrl, setVideoUrl] = useState('');
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  const bg = getPresentationBackground(appSettings?.appBackground || 'midnight');
  const backgroundStyle = appSettings?.appBackgroundUrl
    ? { backgroundImage: `url(${appSettings.appBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : { background: `radial-gradient(circle at 50% 20%, ${bg.colors[1]}55, transparent 55%), linear-gradient(135deg, ${bg.colors.join(', ')})` };

  useEffect(() => {
    loadSettings().then((settings) => setAppSettings(settings)).catch(() => undefined);
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
        setVideoUrl(decoded);
        setPhase('ready');
        return;
      } catch {
        // fall through to IndexedDB
      }
    }

    loadVideo(id)
      .then((url) => {
        if (url) {
          setSource('local');
          setVideoUrl(url);
          setPhase('ready');
        } else {
          setErrorMsg('Vidéo introuvable. Elle a peut-être expiré ou été enregistrée sur un autre appareil.');
          setPhase('error');
        }
      })
      .catch(() => {
        setErrorMsg('Erreur lors de la récupération de la vidéo.');
        setPhase('error');
      });
  }, [id, searchParams]);

  const [errorMsg, setErrorMsg] = useState('');

  const filename = `neurobooth360-video-${Date.now()}.webm`;

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
            <div className="inline-flex items-center justify-center p-3 rounded-full mb-2 bg-indigo-500/10">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
          )}
          <h1 className="text-xl font-bold text-white">
            {appSettings?.eventName || 'NeuroBooth'} <span className="text-indigo-400">360</span>
          </h1>
          <p className="text-zinc-400 text-xs">Téléchargez votre vidéo !</p>
          <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-0.5 ${
            source === 'cloud' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
          }`}>
            {source === 'cloud' ? <><Wifi className="w-3 h-3" /> Vidéo cloud</> : <><WifiOff className="w-3 h-3" /> Vidéo locale</>}
          </div>
        </div>

        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-12 text-zinc-400 flex-shrink-0">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <span className="text-sm">Chargement de votre vidéo...</span>
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

        {phase === 'ready' && videoUrl && (
          <>
            <div className="w-full rounded-2xl overflow-hidden bg-black">
              <video
                src={videoUrl}
                autoPlay
                loop
                playsInline
                muted
                controls
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full flex flex-col items-center gap-3">
              <a
                href={videoUrl}
                download={filename}
                className="w-full flex items-center justify-center gap-2 py-3 hover:brightness-110 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] bg-indigo-500"
              >
                <Download className="w-5 h-5" />
                Télécharger la vidéo
              </a>
            </div>
          </>
        )}

        <p className="text-xs text-zinc-700 text-center mt-1">
          {appSettings?.eventName || 'NeuroBooth'} 360 · {source === 'cloud' ? 'Vidéo hébergée sur Supabase Storage' : 'Vidéo stockée localement sur cet appareil'}
        </p>
      </div>
    </div>
  );
}
