import { useEffect, useState } from "react";
import { Lock, LogOut, Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export type PinModalVariant = "admin" | "exit" | "default";

interface PinModalProps {
  isOpen: boolean;
  adminPin: string;
  onUnlock: () => void;
  onCancel: () => void;
  variant?: PinModalVariant;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
}

const VARIANT_CONFIG: Record<PinModalVariant, {
  icon: typeof Lock;
  iconClass: string;
  defaultTitle: string;
  defaultSubtitle: string;
  defaultConfirm: string;
  confirmClass: string;
  confirmIcon: typeof Settings;
}> = {
  admin: {
    icon: Lock,
    iconClass: "bg-neuro-accent/15 text-neuro-accent",
    defaultTitle: "Administrateur",
    defaultSubtitle: "Gestion du photobooth",
    defaultConfirm: "Confirmer",
    confirmClass: "btn-accent rounded-xl min-h-[3.25rem] w-full shadow-none",
    confirmIcon: Settings,
  },
  exit: {
    icon: LogOut,
    iconClass: "bg-red-500/15 text-red-400",
    defaultTitle: "Quitter le kiosque",
    defaultSubtitle: "Entrez le PIN pour désactiver",
    defaultConfirm: "Quitter le kiosque",
    confirmClass: "flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-red-500 text-[14px] font-bold text-white shadow-[0_4px_20px_rgba(239,68,68,0.35)] active:scale-[0.97] disabled:opacity-40 touch-manipulation",
    confirmIcon: LogOut,
  },
  default: {
    icon: Lock,
    iconClass: "bg-neuro-accent/15 text-neuro-accent",
    defaultTitle: "Accès administrateur",
    defaultSubtitle: "Entrez votre code PIN",
    defaultConfirm: "Déverrouiller",
    confirmClass: "btn-accent rounded-xl min-h-[3.25rem] w-full shadow-none",
    confirmIcon: Lock,
  },
};

export default function PinModal({
  isOpen,
  adminPin,
  onUnlock,
  onCancel,
  variant = "default",
  title,
  subtitle,
  confirmLabel,
}: PinModalProps) {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const ConfirmIcon = config.confirmIcon;
  const pinLength = Math.max(4, adminPin.length);

  useEffect(() => {
    if (!isOpen) {
      setPinInput("");
      setPinError(false);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (pinInput === adminPin) {
      setPinInput("");
      setPinError(false);
      onUnlock();
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  useEffect(() => {
    if (!isOpen || pinInput.length === 0 || pinInput.length < pinLength) return;
    const t = setTimeout(handleSubmit, 120);
    return () => clearTimeout(t);
  }, [pinInput, isOpen, pinLength]); // eslint-disable-line react-hooks/exhaustive-deps

  const appendDigit = (digit: string) => {
    if (pinInput.length >= pinLength) return;
    setPinError(false);
    setPinInput((p) => p + digit);
  };

  const backspace = () => {
    setPinError(false);
    setPinInput((p) => p.slice(0, -1));
  };

  const displayTitle = title ?? config.defaultTitle;
  const displaySubtitle = subtitle ?? config.defaultSubtitle;
  const displayConfirm = confirmLabel ?? config.defaultConfirm;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/80 p-4 backdrop-blur-xl sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="glass-panel-strong w-full max-w-[340px] rounded-2xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5"
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-center sm:hidden">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            <div className="mb-5 flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-label text-neuro-accent">Sécurité</p>
                <h2 className="font-display text-[17px] font-bold leading-tight text-white">{displayTitle}</h2>
                <p className="mt-0.5 text-caption text-neuro-muted">{displaySubtitle}</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-neuro-muted active:scale-92 touch-manipulation"
                aria-label="Annuler"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="mb-5 flex justify-center gap-3">
              {Array.from({ length: pinLength }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
                    i < pinInput.length
                      ? "border-neuro-accent bg-neuro-accent"
                      : "border-white/20 bg-transparent"
                  }`}
                  animate={i === pinInput.length - 1 ? { scale: [1.3, 1] } : {}}
                  transition={{ duration: 0.15 }}
                />
              ))}
            </div>

            <AnimatePresence>
              {pinError && (
                <motion.p
                  className="mb-3 text-center text-caption font-semibold text-red-400"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  Code incorrect — réessayez
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <motion.button
                  key={n}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => appendDigit(String(n))}
                  className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-display text-[22px] font-bold text-white active:bg-white/10 touch-manipulation"
                >
                  {n}
                </motion.button>
              ))}
              <div aria-hidden="true" />
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => appendDigit("0")}
                className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-display text-[22px] font-bold text-white active:bg-white/10 touch-manipulation"
              >
                0
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={backspace}
                className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[18px] text-neuro-muted active:bg-white/10 touch-manipulation"
                aria-label="Effacer"
              >
                ⌫
              </motion.button>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={pinInput.length === 0}
              className={`${config.confirmClass} gap-2 disabled:opacity-40 touch-manipulation`}
            >
              <ConfirmIcon className="h-4 w-4" />
              {displayConfirm}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
