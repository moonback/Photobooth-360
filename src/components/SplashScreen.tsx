import { useEffect, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden premium-gradient px-6 text-neuro-text transition-opacity duration-700 safe-top safe-bottom ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={() => {
        if (!showPin) onEnter();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-1/2 top-[24%] h-60 w-60 -translate-x-1/2 rounded-full bg-neuro-accent/22 blur-3xl"
          animate={{ scale: [1, 1.16, 1], opacity: [0.32, 0.7, 0.32] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[18%] right-[-5rem] h-52 w-52 rounded-full bg-neuro-violet/18 blur-3xl"
          animate={{ y: [0, -18, 0], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/35 to-transparent" />
      </div>

      <motion.div
        className="relative z-10 flex w-full max-w-[350px] flex-col items-center text-center"
        initial={{ y: 16, opacity: 0, filter: "blur(8px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.65rem] border border-white/10 bg-white/5 shadow-[0_0_48px_rgba(99,102,241,0.32)] backdrop-blur-xl"
          animate={{ y: [0, -5, 0], scale: [1, 1.025, 1] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo de l'événement" className="max-h-18 max-w-18 rounded-2xl object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-neuro-accent to-neuro-violet">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          )}
        </motion.div>

        
        <h1 className="text-[30px] font-black leading-[1.02] tracking-[-0.05em] text-white drop-shadow-2xl sm:text-[38px]">
          {settings.eventName}
        </h1>
        

        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEnter();
          }}
          className="mt-8 min-h-13 w-full rounded-full bg-white px-5 py-3.5 text-[15px] font-bold text-black shadow-[0_0_34px_rgba(255,255,255,0.24)] transition-colors hover:bg-zinc-100 active:scale-[0.98]"
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.012 }}
          aria-label="Touchez pour commencer"
        >
          Touchez pour commencer
        </motion.button>
        <div className="mt-4 h-1.5 w-1.5 rounded-full bg-neuro-accent shadow-[0_0_22px_rgba(99,102,241,1)] animate-slow-pulse" />
      </motion.div>

      <button
        type="button"
        className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-20 flex min-h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-neuro-muted backdrop-blur-xl transition-all hover:text-white active:scale-95"
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
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-panel w-full max-w-xs rounded-[1.5rem] p-5"
              initial={{ scale: 0.94, y: 14, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neuro-accent/15 text-neuro-accent">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-white">Admin</h2>
                  <p className="text-caption text-neuro-muted">Réglages exploitant.</p>
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

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setShowPin(false); setPinInput(""); setError(false); }}
                  className="min-h-11 rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-neuro-muted transition-all hover:text-white active:scale-95"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handlePinSubmit}
                  className="min-h-11 rounded-2xl bg-neuro-accent text-sm font-bold text-white shadow-[0_0_22px_rgba(99,102,241,0.32)] transition-all hover:bg-indigo-500 active:scale-95"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
