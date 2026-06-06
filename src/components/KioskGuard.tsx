/**
 * KioskGuard
 *
 * Geste secret pour ouvrir le PIN de sortie kiosque :
 *   → 5 taps dans la zone "coin bas-droit" (80×80 px) en moins de 3 secondes
 *
 * Pourquoi cette approche :
 *   - La zone est visible et de taille raisonnable (80×80 px)
 *   - La détection est 100% via refs (pas de state React dans le hot-path)
 *     → aucun problème de timing / batch de setState
 *   - Le touchstart natif sur document garantit la capture même si un autre
 *     composant a stoppé la propagation du pointer event
 *   - Un indicateur visuel discret (opacité quasi-nulle) guide l'admin sans
 *     trahir l'emplacement aux utilisateurs finaux
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lock, Maximize2, Shield, WifiOff, X } from "lucide-react";
import type { KioskState } from "../hooks/useKiosk";

// ─── Config ───────────────────────────────────────────────────────────────────

const TAPS_REQUIRED  = 5;    // nombre de taps pour ouvrir le PIN
const TAP_WINDOW_MS  = 3000; // fenêtre de temps (ms)
const ZONE_SIZE      = 80;   // px — taille du coin tactile secret

// ─── Props ────────────────────────────────────────────────────────────────────

interface KioskGuardProps {
  kioskState: KioskState;
  adminPin: string;
  /** Called after successful PIN — opens admin settings */
  onAdminAccess: () => void;
  onReEnterFullscreen: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KioskGuard({
  kioskState,
  adminPin,
  onAdminAccess,
  onReEnterFullscreen,
}: KioskGuardProps) {
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [pinInput, setPinInput]             = useState("");
  const [pinError, setPinError]             = useState(false);
  const [tapFeedback, setTapFeedback]       = useState(0); // 0–TAPS_REQUIRED

  // Pure refs for tap counting — no React state in the hot path
  const tapCountRef  = useRef(0);
  const tapTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showPromptRef = useRef(false); // sync mirror of showExitPrompt

  const showReEnterBanner =
    kioskState.active && !kioskState.isFullscreen && !showExitPrompt;

  // ── Tap detection ──────────────────────────────────────────────────────────
  //
  // Listen on the document so we catch taps even if child components call
  // stopPropagation. We filter to taps that land in the bottom-right corner.

  const resetTapCounter = useCallback(() => {
    tapCountRef.current = 0;
    setTapFeedback(0);
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }, []);

  const openExitPrompt = useCallback(() => {
    showPromptRef.current = true;
    setShowExitPrompt(true);
    resetTapCounter();
  }, [resetTapCounter]);

  useEffect(() => {
    // Tap detection runs always — not just in kiosk mode
    const onTouchStart = (e: TouchEvent) => {
      if (showPromptRef.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const fromRight  = window.innerWidth  - touch.clientX;
      const fromBottom = window.innerHeight - touch.clientY;

      if (fromRight > ZONE_SIZE || fromBottom > ZONE_SIZE) return;

      tapCountRef.current += 1;
      const count = tapCountRef.current;
      setTapFeedback(count);

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(resetTapCounter, TAP_WINDOW_MS);

      if (count >= TAPS_REQUIRED) {
        openExitPrompt();
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
    };
  }, [resetTapCounter, openExitPrompt]);

  // Keep the ref in sync with state
  useEffect(() => {
    showPromptRef.current = showExitPrompt;
  }, [showExitPrompt]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // Auto-submit when PIN length matches
  useEffect(() => {
    if (pinInput.length > 0 && pinInput.length >= Math.max(4, adminPin.length)) {
      // Small delay so the last dot animates before validation
      const t = setTimeout(handlePinSubmit, 120);
      return () => clearTimeout(t);
    }
  }, [pinInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PIN validation ─────────────────────────────────────────────────────────

  const handlePinSubmit = () => {
    if (pinInput === adminPin) {
      setPinInput("");
      setPinError(false);
      setShowExitPrompt(false);
      onAdminAccess();  // open settings — kiosk stays active
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  const closePrompt = () => {
    setShowExitPrompt(false);
    setPinInput("");
    setPinError(false);
  };

  if (!kioskState.active && !showExitPrompt && tapFeedback === 0) return null;

  return (
    <>
      {/* ── Status indicators — only in kiosk mode ─────────────────────── */}
      {kioskState.active && (
        <motion.div
          className="pointer-events-none fixed left-3 top-[calc(env(safe-area-inset-top)+0.6rem)] z-[199] flex items-center gap-1.5"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-black/60 px-2 py-0.5 backdrop-blur-xl">
            <Shield className="h-2.5 w-2.5 text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-400">
              Kiosque
            </span>
          </div>

          {!kioskState.isWakeLocked && (
            <div className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-black/60 px-2 py-0.5 backdrop-blur-xl">
              <WifiOff className="h-2.5 w-2.5 text-amber-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-400">
                Veille
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Secret tap zone — bottom-right corner ──────────────────────── */}
      {/* Nearly invisible — just a subtle dot so the admin knows where to tap */}
      <div
        className="fixed bottom-0 right-0 z-[198]"
        style={{ width: ZONE_SIZE, height: ZONE_SIZE }}
        aria-hidden="true"
      >
        {/* Progress dots — visible only while tapping */}
        <AnimatePresence>
          {tapFeedback > 0 && (
            <motion.div
              className="absolute bottom-3 right-3 flex gap-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {Array.from({ length: TAPS_REQUIRED }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < tapFeedback ? "bg-indigo-400" : "bg-white/20"
                  }`}
                  animate={i < tapFeedback ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invisible marker dot — 4px, opacity 3% */}
        <div className="absolute bottom-2 right-2 h-1 w-1 rounded-full bg-white opacity-[0.03]" />
      </div>

      {/* ── Re-enter fullscreen banner ─────────────────────────────────── */}
      <AnimatePresence>
        {showReEnterBanner && (
          <motion.div
            className="fixed inset-x-0 top-0 z-[201] flex items-center justify-between gap-3 bg-indigo-600 px-4 shadow-2xl"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            exit={{ y: -80 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          >
            <div className="flex items-center gap-2.5">
              <Maximize2 className="h-4 w-4 shrink-0 text-white" />
              <p className="text-[13px] font-bold text-white">
                Kiosque interrompu — touchez pour reprendre
              </p>
            </div>
            <button
              type="button"
              onClick={onReEnterFullscreen}
              className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-[12px] font-black text-white active:scale-95 touch-manipulation"
            >
              Reprendre
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Exit PIN prompt ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showExitPrompt && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-5 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-panel w-full max-w-[320px] rounded-[1.5rem] p-5"
              initial={{ scale: 0.88, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {/* Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-[17px] font-black text-white leading-tight">
                    Accès administrateur
                  </h2>
                  <p className="text-[12px] text-white/50">
                    Code administrateur
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePrompt}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/50 active:scale-90 touch-manipulation"
                  aria-label="Annuler"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* PIN dots */}
              <div className="mb-5 flex justify-center gap-3">
                {Array.from({ length: Math.max(4, adminPin.length) }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
                      i < pinInput.length
                        ? "border-indigo-400 bg-indigo-400"
                        : "border-white/25 bg-transparent"
                    }`}
                    animate={i === pinInput.length - 1 ? { scale: [1.3, 1] } : {}}
                    transition={{ duration: 0.15 }}
                  />
                ))}
              </div>

              {/* Error shake */}
              <AnimatePresence>
                {pinError && (
                  <motion.p
                    className="mb-3 text-center text-[12px] font-bold text-red-400"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    Code incorrect
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Numeric keypad */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (pinInput.length < Math.max(4, adminPin.length)) {
                        setPinError(false);
                        setPinInput((p) => p + String(n));
                      }
                    }}
                    className="flex h-[3.75rem] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[22px] font-black text-white active:bg-white/15 touch-manipulation"
                  >
                    {n}
                  </motion.button>
                ))}

                {/* Row: [empty] [0] [⌫] */}
                <div />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setPinError(false);
                    setPinInput((p) => p + "0");
                  }}
                  className="flex h-[3.75rem] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[22px] font-black text-white active:bg-white/15 touch-manipulation"
                >
                  0
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setPinError(false);
                    setPinInput((p) => p.slice(0, -1));
                  }}
                  className="flex h-[3.75rem] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[20px] text-white/60 active:bg-white/15 touch-manipulation"
                  aria-label="Effacer"
                >
                  ⌫
                </motion.button>
              </div>

              {/* Confirm — auto-submits when PIN length matches */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handlePinSubmit}
                disabled={pinInput.length === 0}
                className="flex h-[3.25rem] w-full items-center justify-center rounded-xl bg-indigo-500 text-[14px] font-black text-white shadow-[0_0_24px_rgba(99,102,241,0.4)] disabled:opacity-40 touch-manipulation"
              >
                Confirmer
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
