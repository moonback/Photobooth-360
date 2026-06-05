import { useEffect, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppSettings } from "./SettingsModal";

interface SplashScreenProps {
  settings: AppSettings;
  /** Called to simply dismiss the splash and enter the app */
  onEnter: () => void;
  /** Called when admin PIN is validated — dismiss splash AND open settings */
  onAdmin: () => void;
}

export default function SplashScreen({ settings, onEnter, onAdmin }: SplashScreenProps) {
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handlePinSubmit = () => {
    if (pinInput === settings.adminPin) {
      onAdmin();
      return;
    }
    setError(true);
    setPinInput("");
  };

  return (
    <motion.div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden premium-gradient px-6 text-neuro-text transition-opacity duration-700 safe-top safe-bottom ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={() => {
        if (!showPin) onEnter();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2 rounded-full bg-neuro-accent/25 blur-3xl"
          animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />
      </div>

      <motion.div
        className="relative z-10 flex w-full max-w-[390px] flex-col items-center text-center"
        initial={{ y: 22, opacity: 0, filter: "blur(10px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="mb-8 flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_0_60px_rgba(99,102,241,0.35)] backdrop-blur-xl"
          animate={{ scale: [1, 1.035, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo de l'événement" className="max-h-24 max-w-24 rounded-2xl object-contain" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-neuro-accent to-neuro-violet">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
          )}
        </motion.div>

        <p className="mb-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-caption font-semibold uppercase tracking-[0.22em] text-neuro-muted backdrop-blur-xl">
          NeuroBooth 360
        </p>
        <h1 className="text-title-xl font-black text-white drop-shadow-2xl sm:text-[44px]">
          {settings.eventName}
        </h1>
        <p className="mt-4 max-w-[310px] text-body text-neuro-muted">
          Une capture vidéo immersive, prête à scanner en quelques secondes.
        </p>

        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEnter();
          }}
          className="mt-10 min-h-14 w-full rounded-full bg-white px-6 py-4 text-body font-bold text-black shadow-[0_0_40px_rgba(255,255,255,0.28)] transition-colors hover:bg-zinc-100 active:scale-[0.98]"
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.015 }}
          aria-label="Touchez pour commencer"
        >
          Touchez pour commencer
        </motion.button>
        <div className="mt-5 h-2 w-2 rounded-full bg-neuro-accent shadow-[0_0_24px_rgba(99,102,241,1)] animate-slow-pulse" />
      </motion.div>

      <button
        type="button"
        className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] right-6 z-20 flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-caption font-semibold text-neuro-muted backdrop-blur-xl transition-all hover:text-white active:scale-95"
        onClick={(event) => {
          event.stopPropagation();
          setShowPin(true);
        }}
        aria-label="Ouvrir l'accès administrateur"
      >
        <Lock className="h-3.5 w-3.5" />
        Admin
      </button>

      <AnimatePresence>
        {showPin && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-panel w-full max-w-sm rounded-[2rem] p-6"
              initial={{ scale: 0.94, y: 18, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neuro-accent/15 text-neuro-accent">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-subtitle font-bold text-white">Accès administrateur</h2>
                  <p className="text-caption text-neuro-muted">Réglages borne et événement.</p>
                </div>
              </div>

              <label className="mb-2 block text-caption font-semibold text-neuro-muted" htmlFor="admin-pin">
                Code PIN
              </label>
              <input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                value={pinInput}
                autoFocus
                onChange={(event) => { setPinInput(event.target.value); setError(false); }}
                onKeyDown={(event) => event.key === "Enter" && handlePinSubmit()}
                className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-body text-white placeholder:text-zinc-600 transition-colors focus:border-neuro-accent focus:outline-none"
                placeholder="••••"
                aria-invalid={error}
              />
              {error && <p className="mt-2 text-caption text-neuro-error">Code incorrect.</p>}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setShowPin(false); setPinInput(""); setError(false); }}
                  className="min-h-12 rounded-2xl border border-white/10 bg-white/5 text-body font-semibold text-neuro-muted transition-all hover:text-white active:scale-95"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handlePinSubmit}
                  className="min-h-12 rounded-2xl bg-neuro-accent text-body font-bold text-white shadow-[0_0_24px_rgba(99,102,241,0.35)] transition-all hover:bg-indigo-500 active:scale-95"
                >
                  Déverrouiller
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
