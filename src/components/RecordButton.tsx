import { Video, StopCircle } from "lucide-react";

interface RecordButtonProps {
  isRecording: boolean;
  isCountingDown: boolean;
  hasStream: boolean;
  durationSeconds: number;
  onStart: () => void;
  onStop: () => void;
}

export default function RecordButton({
  isRecording,
  isCountingDown,
  hasStream,
  durationSeconds,
  onStart,
  onStop,
}: RecordButtonProps) {
  if (isRecording) {
    return (
      <button
        onClick={onStop}
        className="flex flex-col items-center gap-1 group"
        aria-label="Arrêter l'enregistrement"
      >
        <div className="w-20 h-20 rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] flex items-center justify-center active:scale-95 transition-transform">
          <StopCircle className="w-9 h-9 text-white group-active:scale-95 transition-transform" />
        </div>
        <span className="text-xs text-red-400 font-medium tracking-wide">Stop</span>
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={isCountingDown || !hasStream}
      className="flex flex-col items-center gap-1 group disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label={`Enregistrer ${durationSeconds}s`}
    >
      {/* Outer ring */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-white/30" />
        <div className="absolute inset-1.5 rounded-full bg-white flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.3)] active:scale-95 transition-transform group-active:scale-95">
          <Video className="w-8 h-8 text-zinc-900" />
        </div>
      </div>
      <span className="text-xs text-white/70 font-medium tracking-wide">{durationSeconds}s</span>
    </button>
  );
}
