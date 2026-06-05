import { RefObject } from "react";
import { Camera, Radio, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface CameraViewProps {
  liveVideoRef: RefObject<HTMLVideoElement>;
  isRecording: boolean;
  countdown: number | null;
  showFlash: boolean;
  eventName: string;
  hidden: boolean;
}

export default function CameraView({
  liveVideoRef,
  isRecording,
  countdown,
  showFlash,
  eventName,
  hidden,
}: CameraViewProps) {
  const countdownLabel = countdown === 0 ? "GO" : countdown;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-black ${hidden ? "hidden" : "block"}`}>
      <video
        ref={liveVideoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover transition-opacity duration-500"
        aria-label="Aperçu caméra en direct"
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.38)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/70 via-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 flex items-center justify-between gap-3 sm:left-6 sm:right-6">
        <div className="glass-panel min-h-12 min-w-0 rounded-full px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-caption font-semibold uppercase tracking-[0.18em] text-neuro-muted">Événement</p>
              <p className="truncate text-sm font-bold text-white">{eventName}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 py-2" aria-live="polite">
          <span className={`h-2.5 w-2.5 rounded-full ${isRecording ? "bg-neuro-error animate-pulse" : "bg-neuro-success"}`} />
          <span className={`text-caption font-bold uppercase tracking-[0.16em] ${isRecording ? "text-red-300" : "text-emerald-300"}`}>
            {isRecording ? "REC" : "Caméra"}
          </span>
        </div>
      </div>

      {isRecording && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 ring-4 ring-neuro-error/80 ring-inset" />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+8.75rem)] left-1/2 z-20 -translate-x-1/2 rounded-full border border-red-400/25 bg-red-500/15 px-4 py-2 text-caption font-bold uppercase tracking-[0.18em] text-red-100 backdrop-blur-xl shadow-[0_0_34px_rgba(239,68,68,0.28)]">
            <span className="inline-flex items-center gap-2"><Radio className="h-4 w-4" /> Enregistrement</span>
          </div>
        </>
      )}

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-5 z-20 flex items-center gap-2 opacity-80 pointer-events-none">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-xl">
          <Camera className="h-4 w-4 text-white" />
        </div>
        <span className="text-caption font-black uppercase tracking-[0.22em] text-white drop-shadow-lg">
          NeuroBooth 360
        </span>
      </div>

      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/58 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              key={countdownLabel}
              className="relative flex h-52 w-52 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[96px] font-black leading-none text-white shadow-[0_0_90px_rgba(99,102,241,0.55)] backdrop-blur-xl sm:h-64 sm:w-64 sm:text-[132px]"
              initial={{ scale: 0.45, opacity: 0, filter: "blur(18px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 1.32, opacity: 0, filter: "blur(12px)" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="absolute inset-0 rounded-full bg-neuro-accent/20 blur-2xl" />
              <span className="relative text-center drop-shadow-2xl">{countdownLabel}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showFlash && <div className="absolute inset-0 z-50 animate-flash bg-white pointer-events-none" />}
    </div>
  );
}
