import { useEffect } from 'react';
import { Gauge, Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useSlowMotion, SlowMotionSpeed } from '../hooks/useSlowMotion';

interface SlowMotionPanelProps {
  originalUrl: string;
  /** The playback speed already applied to the preview (via playbackRate) */
  playbackSpeed: SlowMotionSpeed | 1;
  onSpeedChange: (speed: SlowMotionSpeed | 1) => void;
  /** Called when the FFmpeg-encoded export is ready */
  onExportReady: (url: string) => void;
  accentBg: string;
  accentBgHover: string;
  accentText: string;
  accentShadow: string;
}

const SPEEDS: { value: SlowMotionSpeed | 1; label: string; sublabel: string }[] = [
  { value: 1,    label: '1×',  sublabel: 'Normal'      },
  { value: 0.5,  label: '½×',  sublabel: 'Slow-Mo'     },
  { value: 0.25, label: '¼×',  sublabel: 'Ultra Slow'  },
];

export default function SlowMotionPanel({
  originalUrl,
  playbackSpeed,
  onSpeedChange,
  onExportReady,
  accentBg,
  accentBgHover,
  accentText,
  accentShadow,
}: SlowMotionPanelProps) {
  const { processVideo, status, progress, errorMessage } = useSlowMotion();

  // Whenever a slow speed is selected, kick off the background FFmpeg export automatically
  useEffect(() => {
    if (playbackSpeed === 1) return;

    let cancelled = false;

    (async () => {
      const result = await processVideo(originalUrl, playbackSpeed as SlowMotionSpeed);
      if (!cancelled && result) onExportReady(result);
    })();

    return () => { cancelled = true; };
  // processVideo is stable (useCallback), originalUrl and playbackSpeed are the triggers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalUrl, playbackSpeed]);

  const isEncoding = status === 'loading' || status === 'processing';
  const exportReady = status === 'done';

  return (
    <div className="mt-6 border-t border-zinc-800/50 pt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Gauge className={`w-4 h-4 ${accentText}`} />
        <span className="text-sm font-semibold text-white">Slow-Motion</span>
        {isEncoding && (
          <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full ml-auto">
            <Loader2 className="w-3 h-3 animate-spin" />
            Export en cours…
          </span>
        )}
        {exportReady && playbackSpeed !== 1 && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto">
            <CheckCircle className="w-3 h-3" />
            Export prêt
          </span>
        )}
      </div>

      {/* Speed selector — instant preview via playbackRate */}
      <div className="flex gap-2">
        {SPEEDS.map(({ value, label, sublabel }) => (
          <button
            key={value}
            onClick={() => onSpeedChange(value)}
            className={`flex-1 py-3 rounded-2xl border text-sm font-medium premium-interactive hover:scale-[1.02] active:scale-[0.98] ${
              playbackSpeed === value
                ? `bg-opacity-10 ${accentBg.replace('bg-', 'bg-').replace('-500', '-500/10')} border-current ${accentText}`
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <div className="text-lg font-bold">{label}</div>
            <div className="text-xs opacity-70">{sublabel}</div>
          </button>
        ))}
      </div>

      {/* Background encoding progress — shown only when a slow speed is active */}
      {playbackSpeed !== 1 && (
        <div className="space-y-1.5">
          {isEncoding && (
            <>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{status === 'loading' ? 'Chargement FFmpeg…' : `Encodage fichier export… ${progress}%`}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${accentBg} rounded-full transition-all duration-300`}
                  style={{ width: `${status === 'loading' ? 3 : progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600">
                La prévisualisation est déjà active. L'encodage se fait en arrière-plan pour le téléchargement.
              </p>
            </>
          )}

          {exportReady && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Download className="w-3.5 h-3.5" />
              Le fichier encodé est prêt — le bouton Télécharger utilise la version slow-motion.
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMessage} — le téléchargement utilisera la vitesse normale.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
