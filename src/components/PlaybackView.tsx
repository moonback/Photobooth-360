import { CheckCircle2, RotateCcw } from "lucide-react";
import { motion } from "motion/react";

interface PlaybackViewProps {
  videoUrl: string;
  eventName: string;
}

export default function PlaybackView({ videoUrl, eventName }: PlaybackViewProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video src={videoUrl} autoPlay loop playsInline controls className="h-full w-full object-cover" aria-label="Aperçu de la vidéo capturée" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 to-transparent" />

      <motion.div
        className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+0.625rem)] z-20 sm:inset-x-4"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="glass-panel-strong flex items-center gap-3 rounded-2xl p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-label text-emerald-300">Capture prête</p>
            <h2 className="truncate font-display text-[15px] font-bold leading-tight text-white">
              {eventName}
            </h2>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] left-3 z-20 flex items-center gap-1.5 rounded-full border border-white/12 bg-black/35 px-2.5 py-1 text-label text-white/75 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <RotateCcw className="h-3 w-3 text-neuro-accent" /> Aperçu
      </motion.div>
    </div>
  );
}
