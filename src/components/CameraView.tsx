import { RefObject } from "react";
import { Camera, Radio, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface CameraViewProps {
  liveVideoRef: RefObject<HTMLVideoElement>;
  isRecording: boolean;
  countdown: number | null;
  showFlash: boolean;
  eventName: string;
  hidden: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function CameraView({
  liveVideoRef,
  isRecording,
  countdown,
  showFlash,
  eventName,
  hidden,
  isFullscreen,
  onToggleFullscreen,
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

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgba(0,0,0,0.35)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/62 via-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />

      <motion.div
        className="absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 flex items-center justify-between gap-2 sm:left-5 sm:right-5"
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="glass-panel flex min-h-10 min-w-0 items-center gap-2 rounded-full px-3 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <p className="min-w-0 truncate text-[13px] font-bold text-white">{eventName}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="glass-panel flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 py-1.5" aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${isRecording ? "bg-neuro-error animate-pulse" : "bg-neuro-success"}`} />
            <span className={`text-[11px] font-black uppercase tracking-[0.18em] ${isRecording ? "text-red-300" : "text-emerald-300"}`}>
              {isRecording ? "REC" : "LIVE"}
            </span>
          </div>
          
          <motion.button
            type="button"
            onClick={onToggleFullscreen}
            className="glass-panel grid min-h-10 min-w-10 shrink-0 place-items-center rounded-full text-white transition-all hover:bg-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}
          >
            {isFullscreen ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
          </motion.button>
        </div>
      </motion.div>

      {isRecording && (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 ring-2 ring-neuro-error/80 ring-inset"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.35, 0.9, 0.35] }}
            transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+13rem)] left-1/2 z-20 -translate-x-1/2 rounded-full border border-red-400/20 bg-red-500/12 px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-red-100 backdrop-blur-xl shadow-[0_0_28px_rgba(239,68,68,0.3)] md:bottom-[calc(env(safe-area-inset-bottom)+15rem)]"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <span className="inline-flex items-center gap-1.5"><Radio className="h-4 w-4" /> Enregistrement</span>
          </motion.div>
        </>
      )}

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.8rem)] left-4 z-20 flex items-center gap-2 opacity-70 pointer-events-none">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/8 backdrop-blur-xl">
          <Camera className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white drop-shadow-lg">
          NeuroBooth
        </span>
      </div>

      <AnimatePresence mode="wait">
        {countdown !== null && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/48 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              key={countdownLabel}
              className="relative flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[64px] font-black leading-none text-white shadow-[0_0_72px_rgba(99,102,241,0.48)] backdrop-blur-xl sm:h-48 sm:w-48 sm:text-[96px]"
              initial={{ scale: 0.55, opacity: 0, filter: "blur(14px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 1.22, opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="absolute inset-0 rounded-full bg-neuro-accent/18 blur-2xl" />
              <span className="relative text-center drop-shadow-2xl">{countdownLabel}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showFlash && <div className="absolute inset-0 z-50 animate-flash bg-white pointer-events-none" />}
    </div>
  );
}
