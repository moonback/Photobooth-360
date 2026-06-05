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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/75 via-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      <motion.div
        className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 glass-panel rounded-[1.75rem] p-4 sm:left-6 sm:right-6"
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-caption font-bold uppercase tracking-[0.18em] text-emerald-300">Capture réussie</p>
            <h2 className="text-subtitle font-black text-white">{eventName}</h2>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-5 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-caption font-bold uppercase tracking-[0.16em] text-white backdrop-blur-xl">
        <RotateCcw className="h-4 w-4 text-neuro-accent" /> Lecture en boucle
      </div>
    </div>
  );
}
