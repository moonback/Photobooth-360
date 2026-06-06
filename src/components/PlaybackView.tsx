import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface PlaybackViewProps {
  videoUrl: string;
  eventName: string;
}

export default function PlaybackView({ videoUrl, eventName }: PlaybackViewProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video src={videoUrl} autoPlay loop playsInline controls className="h-full w-full object-cover" aria-label="Aperçu de la vidéo capturée" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Banner "Capture prête" avec animation premium */}
      <motion.div
        className="absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 overflow-hidden rounded-[1.5rem] sm:left-5 sm:right-5"
        initial={{ y: -20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Effet de brillance animé */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        />
        
        <div className="glass-panel relative p-3.5">
          <div className="flex items-center gap-3">
            {/* Icône check animée */}
            <motion.div 
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-emerald-500/10"
              animate={{ 
                boxShadow: [
                  "0 0 15px rgba(16, 185, 129, 0.3)",
                  "0 0 25px rgba(16, 185, 129, 0.5)",
                  "0 0 15px rgba(16, 185, 129, 0.3)",
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CheckCircle2 className="h-5.5 w-5.5 text-emerald-300" strokeWidth={2.5} />
              
              {/* Particules de succès */}
              <motion.div
                className="absolute -right-0.5 -top-0.5"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />
              </motion.div>
            </motion.div>

            {/* Texte */}
            <div className="min-w-0 flex-1">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  ✓ Capture prête
                </p>
              </motion.div>
              <motion.h2 
                className="truncate text-[16px] font-black leading-tight text-white"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                {eventName}
              </motion.h2>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Badge Loop */}
      <motion.div 
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.8rem)] left-4 z-20 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/90 backdrop-blur-xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <RotateCcw className="h-3.5 w-3.5 text-neuro-accent" /> Loop
      </motion.div>
    </div>
  );
}
