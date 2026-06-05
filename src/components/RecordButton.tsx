import { StopCircle, Video } from "lucide-react";
import { motion } from "motion/react";

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
  const disabled = isCountingDown || !hasStream;

  return (
    <motion.button
      type="button"
      onClick={isRecording ? onStop : onStart}
      disabled={disabled && !isRecording}
      className="group flex min-h-[112px] min-w-[112px] flex-col items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-45"
      aria-label={isRecording ? "Arrêter l'enregistrement" : `Lancer une capture vidéo de ${durationSeconds} secondes`}
      whileTap={{ scale: 0.94 }}
    >
      <span className="relative grid h-24 w-24 place-items-center sm:h-28 sm:w-28">
        <span className={`absolute inset-0 rounded-full border ${isRecording ? "border-red-400/50" : "border-white/20"} bg-white/5 backdrop-blur-xl`} />
        <span className={`absolute inset-1 rounded-full border-2 ${isRecording ? "border-red-400/80 animate-record-ring" : "border-white/55 animate-breathe"}`} />
        <span className={`absolute inset-3 rounded-full ${isRecording ? "bg-red-500 shadow-[0_0_44px_rgba(239,68,68,0.78)]" : "bg-white shadow-[0_0_42px_rgba(255,255,255,0.36)]"} transition-all duration-300 group-hover:scale-105`} />
        <span className="relative z-10 grid h-16 w-16 place-items-center rounded-full">
          {isRecording ? <StopCircle className="h-9 w-9 text-white" /> : <Video className="h-8 w-8 text-black" />}
        </span>
      </span>
      <span className={`rounded-full px-3 py-1 text-caption font-bold uppercase tracking-[0.18em] ${isRecording ? "bg-red-500/15 text-red-200" : "bg-white/10 text-white/80"}`}>
        {isRecording ? "Stop" : `${durationSeconds}s`}
      </span>
    </motion.button>
  );
}
