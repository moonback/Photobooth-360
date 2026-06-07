import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { AppSettings } from "./SettingsModal";

interface SplashScreenProps {
  settings: AppSettings;
  onEnter: () => void;
}

export default function SplashScreen({ settings, onEnter }: SplashScreenProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <motion.div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden premium-gradient grain-overlay px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] text-neuro-text transition-opacity duration-700 safe-top safe-bottom ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={onEnter}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2 rounded-full bg-neuro-accent/20 blur-[80px]"
          animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[30%] right-[-4rem] h-48 w-48 rounded-full bg-neuro-violet/15 blur-[60px]"
          animate={{ y: [0, -12, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      <motion.div
        className="relative z-10 flex w-full max-w-sm flex-col items-center text-center"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <motion.div
          className="mb-7 flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[1.5rem] border border-white/12 bg-white/[0.06] shadow-[0_0_40px_rgba(99,102,241,0.25)] backdrop-blur-xl"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo de l'événement" className="max-h-16 max-w-16 rounded-xl object-contain" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-neuro-accent to-neuro-violet shadow-lg">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
          )}
        </motion.div>

        <p className="text-label text-neuro-accent mb-2">Photobooth 360°</p>

        <h1 className="font-display text-title-xl text-white drop-shadow-lg">
          {settings.eventName}
        </h1>

        <p className="mt-3 max-w-[280px] text-body text-neuro-muted">
          Posez, tournez, partagez votre vidéo en quelques secondes.
        </p>

        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEnter(); }}
          className="btn-primary mt-8 w-full gap-2.5"
          whileTap={{ scale: 0.97 }}
          aria-label="Commencer la capture"
        >
          Commencer
          <ArrowRight className="h-[18px] w-[18px]" />
        </motion.button>

        <motion.p
          className="mt-5 text-caption text-neuro-muted/70"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          Touchez n'importe où pour démarrer
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
