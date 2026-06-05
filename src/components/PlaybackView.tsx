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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/82 via-black/25 to-transparent" />

      <motion.div
        className="absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 glass-panel rounded-[1.35rem] p-3 sm:left-5 sm:right-5"
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">Capture prête</p>
            <h2 className="truncate text-[15px] font-black text-white">{eventName}</h2>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.8rem)] left-4 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl">
        <RotateCcw className="h-3.5 w-3.5 text-neuro-accent" /> Loop
      </div>
    </div>
  );
}
