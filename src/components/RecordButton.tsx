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
      className="group flex flex-col items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
      aria-label={isRecording ? "Arrêter l'enregistrement" : `Lancer une capture vidéo de ${durationSeconds} secondes`}
      whileTap={{ scale: 0.93 }}
    >
      <span className="relative grid h-[4.75rem] w-[4.75rem] place-items-center sm:h-20 sm:w-20">
        <span
          className={`absolute inset-0 rounded-full ${
            isRecording
              ? "border border-red-400/30 bg-red-500/10"
              : "border border-white/15 bg-white/[0.06] backdrop-blur-xl"
          }`}
        />
        {!isRecording && (
          <span className="absolute inset-[5px] rounded-full border-2 border-white/40 animate-breathe" />
        )}
        {isRecording && (
          <span className="absolute inset-[5px] rounded-full border-2 border-red-400/70 animate-record-ring" />
        )}
        <span
          className={`absolute inset-[14px] rounded-full transition-all duration-300 ${
            isRecording
              ? "bg-red-500 shadow-[0_0_32px_rgba(239,68,68,0.65)]"
              : "bg-white shadow-[0_0_28px_rgba(255,255,255,0.25)] group-active:scale-95"
          }`}
        />
        <span className="relative z-10 grid h-9 w-9 place-items-center">
          {isRecording ? (
            <StopCircle className="h-7 w-7 text-white" strokeWidth={2} />
          ) : (
            <Video className="h-6 w-6 text-black" strokeWidth={2.5} />
          )}
        </span>
      </span>

      <span
        className={`rounded-full px-3 py-1 text-label ${
          isRecording
            ? "bg-red-500/15 text-red-300"
            : "bg-white/10 text-white/80"
        }`}
      >
        {isRecording ? "Arrêter" : `${durationSeconds}s`}
      </span>
    </motion.button>
  );
}
