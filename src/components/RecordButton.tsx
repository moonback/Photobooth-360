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
      className="group flex min-h-[96px] min-w-[96px] flex-col items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45"
      aria-label={isRecording ? "Arrêter l'enregistrement" : `Lancer une capture vidéo de ${durationSeconds} secondes`}
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.02 }}
    >
      <span className="relative grid h-20 w-20 place-items-center sm:h-24 sm:w-24">
        <span className={`absolute inset-0 rounded-full border ${isRecording ? "border-red-400/45" : "border-white/18"} bg-white/5 backdrop-blur-xl`} />
        <span className={`absolute inset-1 rounded-full border-2 ${isRecording ? "border-red-400/80 animate-record-ring" : "border-white/55 animate-breathe"}`} />
        <span className={`absolute inset-3 rounded-full ${isRecording ? "bg-red-500 shadow-[0_0_38px_rgba(239,68,68,0.72)]" : "bg-white shadow-[0_0_34px_rgba(255,255,255,0.3)]"} transition-all duration-300 group-hover:scale-105`} />
        <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full">
          {isRecording ? <StopCircle className="h-8 w-8 text-white" /> : <Video className="h-7 w-7 text-black" />}
        </span>
      </span>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[0.18em] ${isRecording ? "bg-red-500/15 text-red-200" : "bg-white/10 text-white/75"}`}>
        {isRecording ? "Stop" : `${durationSeconds}s`}
      </span>
    </motion.button>
  );
}
