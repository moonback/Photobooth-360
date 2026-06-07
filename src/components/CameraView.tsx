import { RefObject } from "react";
import { Camera, Radio, RefreshCw, Maximize2, Minimize2, SwitchCamera } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface CameraViewProps {
  liveVideoRef: RefObject<HTMLVideoElement>;
  isRecording: boolean;
  countdown: number | null;
  isSyncing?: boolean;
  showFlash: boolean;
  eventName: string;
  hidden: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onSwitchCamera?: () => void;
  facingMode?: "user" | "environment";
}

export default function CameraView({
  liveVideoRef,
  isRecording,
  countdown,
  isSyncing = false,
  showFlash,
  eventName,
  hidden,
  isFullscreen,
  onToggleFullscreen,
  onSwitchCamera,
  facingMode = "user",
}: CameraViewProps) {
  const countdownLabel = countdown === 0 ? "GO" : countdown;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-black ${hidden ? "hidden" : "block"}`}>
      <video
        ref={liveVideoRef}
        autoPlay
        playsInline
        muted
        webkit-playsinline="true"
        x5-playsinline="true"
        x5-video-player-type="h5"
        x5-video-player-fullscreen="false"
        className="h-full w-full object-cover"
        aria-label="Aperçu caméra en direct"
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.30)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/65 to-transparent" />

      <motion.div
        className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+0.625rem)] z-20 flex items-center justify-between gap-2 sm:inset-x-4"
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="glass-panel flex min-h-11 min-w-0 max-w-[55%] items-center gap-2.5 rounded-2xl px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <Camera className="h-3.5 w-3.5 text-white/90" />
          </div>
          <p className="min-w-0 truncate text-[13px] font-semibold text-white">{eventName}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="glass-panel flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2" aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${isRecording ? "bg-neuro-error animate-pulse" : "bg-neuro-success"}`} />
            <span className={`text-label ${isRecording ? "text-red-300" : "text-emerald-300"}`}>
              {isRecording ? "REC" : "LIVE"}
            </span>
          </div>

          {onSwitchCamera && !isRecording && (
            <motion.button
              type="button"
              onClick={onSwitchCamera}
              className="glass-panel grid h-11 w-11 place-items-center rounded-2xl text-white active:bg-white/15 touch-manipulation"
              whileTap={{ scale: 0.92 }}
              aria-label={facingMode === "user" ? "Passer à la caméra arrière" : "Passer à la caméra avant"}
            >
              <SwitchCamera className="h-[18px] w-[18px]" />
            </motion.button>
          )}

          <motion.button
            type="button"
            onClick={onToggleFullscreen}
            className="glass-panel grid h-11 w-11 place-items-center rounded-2xl text-white active:bg-white/15 touch-manipulation"
            whileTap={{ scale: 0.92 }}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}
          >
            {isFullscreen ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
          </motion.button>
        </div>
      </motion.div>

      {isRecording && (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 ring-2 ring-neuro-error/70 ring-inset"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.75, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+4.5rem)] z-20 -translate-x-1/2 rounded-full border border-red-400/25 bg-red-500/15 px-4 py-1.5 text-label text-red-200 backdrop-blur-xl"
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5" /> Enregistrement
            </span>
          </motion.div>
        </>
      )}

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] left-3 z-20 pointer-events-none opacity-60">
        <span className="text-label text-white/70">NeuroBooth</span>
      </div>

      <AnimatePresence mode="wait">
        {isSyncing && !countdown && (
          <motion.div
            key="motor-sync"
            className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-full border border-indigo-500/25 bg-indigo-500/10"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="h-9 w-9 text-indigo-300" />
              <motion.div
                className="absolute inset-[-2px] rounded-full border-2 border-transparent border-t-indigo-400"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            <div className="text-center">
              <p className="text-label text-indigo-300">Plateau en démarrage</p>
              <p className="mt-1 text-caption text-white/45">Synchronisation…</p>
            </div>
          </motion.div>
        )}

        {countdown !== null && (
          <motion.div
            key="countdown"
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              key={countdownLabel}
              className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] font-display text-[72px] font-extrabold leading-none text-white shadow-[0_0_60px_rgba(99,102,241,0.40)] backdrop-blur-xl sm:h-40 sm:w-40 sm:text-[88px]"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.15, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="absolute inset-0 rounded-full bg-neuro-accent/15 blur-xl" />
              <span className="relative">{countdownLabel}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showFlash && <div className="absolute inset-0 z-50 animate-flash bg-white pointer-events-none" />}
    </div>
  );
}
