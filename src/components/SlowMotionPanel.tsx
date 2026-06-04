import { useState } from 'react';
import { Gauge, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useSlowMotion, SlowMotionSpeed } from '../hooks/useSlowMotion';

interface SlowMotionPanelProps {
  originalUrl: string;
  /** Called when the processed video is ready — replaces current preview */
  onProcessed: (url: string) => void;
  accentBg: string;
  accentBgHover: string;
  accentText: string;
  accentShadow: string;
}

const SPEEDS: { value: SlowMotionSpeed; label: string; sublabel: string }[] = [
  { value: 0.5,  label: '½×',  sublabel: 'Slow-Mo' },
  { value: 0.25, label: '¼×',  sublabel: 'Ultra Slow' },
];

export default function SlowMotionPanel({
  originalUrl,
  onProcessed,
  accentBg,
  accentBgHover,
  accentText,
  accentShadow,
}: SlowMotionPanelProps) {
  const [selectedSpeed, setSelectedSpeed] = useState<SlowMotionSpeed>(0.5);
  const { processVideo, status, progress, errorMessage, cancel } = useSlowMotion();

  const isProcessing = status === 'loading' || status === 'processing';
  const isDone = status === 'done';

  const handleProcess = async () => {
    const result = await processVideo(originalUrl, selectedSpeed);
    if (result) onProcessed(result);
  };

  return (
    <div className="mt-6 border-t border-zinc-800 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Gauge className={`w-4 h-4 ${accentText}`} />
        <span className="text-sm font-semibold text-white">Slow-Motion</span>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">FFmpeg WASM</span>
      </div>

      {/* Speed selector */}
      <div className="flex gap-3 mb-4">
        {SPEEDS.map(({ value, label, sublabel }) => (
          <button
            key={value}
            onClick={() => !isProcessing && setSelectedSpeed(value)}
            disabled={isProcessing}
            className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all disabled:cursor-not-allowed ${
              selectedSpeed === value
                ? `${accentBg.replace('bg-', 'bg-').replace('-500', '-500/10')} border-current ${accentText}`
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <div className="text-lg font-bold">{label}</div>
            <div className="text-xs opacity-70">{sublabel}</div>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {status === 'loading' ? 'Chargement FFmpeg…' : `Traitement en cours… ${progress}%`}
            </span>
            <button
              onClick={cancel}
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${accentBg} rounded-full transition-all duration-300`}
              style={{ width: `${status === 'loading' ? 5 : progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600">
            Le traitement s'effectue entièrement dans votre navigateur, aucune donnée n'est envoyée.
          </p>
        </div>
      )}

      {/* Done notice */}
      {isDone && (
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Slow-motion appliqué — la prévisualisation a été mise à jour.
        </div>
      )}

      {/* Error notice */}
      {status === 'error' && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* CTA */}
      {!isProcessing && (
        <button
          onClick={handleProcess}
          className={`w-full flex items-center justify-center gap-2 py-3 ${accentBg} ${accentBgHover} text-white font-semibold rounded-xl transition-all active:scale-95 ${accentShadow}`}
        >
          <Gauge className="w-4 h-4" />
          Appliquer le slow-motion {selectedSpeed === 0.5 ? '½×' : '¼×'}
        </button>
      )}
    </div>
  );
}
