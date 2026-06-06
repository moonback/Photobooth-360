/**
 * KioskGuard
 *
 * Zone haut-centre (160×60 px) — deux seuils, un seul listener :
 *   5 taps  → ouvre le clavier PIN → accès réglages admin
 *   10 taps → ouvre le clavier PIN → quitte le kiosque (si PIN valide)
 *
 * Le listener est monté une seule fois (deps vides).
 * Toutes les valeurs dynamiques passent par des refs pour éviter
 * les re-enregistrements qui remettent le compteur à zéro.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lock, Maximize2, Shield, WifiOff, X, LogOut, Settings } from "lucide-react";
import type { KioskState } from "../hooks/useKiosk";

// ─── Config ───────────────────────────────────────────────────────────────────

const TAP_WINDOW_MS  = 4000;
const ZONE_HEIGHT    = 60;    // px depuis le haut de l'écran
const ZONE_HALF_W    = 80;    // px de chaque côté du centre horizontal
const ADMIN_TAPS     = 5;     // → ouvre le PIN admin
const EXIT_TAPS      = 10;    // → désactive le kiosque (kiosk only)

// ─── Props ────────────────────────────────────────────────────────────────────

interface KioskGuardProps {
  kioskState: KioskState;
  adminPin: string;
  onAdminAccess: () => void;
  onReEnterFullscreen: () => void;
  onExitKiosk: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KioskGuard({
  kioskState,
  adminPin,
  onAdminAccess,
  onReEnterFullscreen,
  onExitKiosk,
}: KioskGuardProps) {
  const [showPrompt,   setShowPrompt]   = useState(false);
  const [pinInput,     setPinInput]     = useState("");
  const [pinError,     setPinError]     = useState(false);
  const [tapFeedback,  setTapFeedback]  = useState(0);
  // "admin" → ouvre les réglages après PIN, "exit" → quitte le kiosque après PIN
  const [pendingAction, setPendingAction] = useState<"admin" | "exit">("admin");

  // Stable refs — never trigger effect re-runs
  const tapCountRef      = useRef(0);
  const tapTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showPromptRef    = useRef(false);
  const kioskActiveRef   = useRef(kioskState.active);
  const onAdminAccessRef = useRef(onAdminAccess);
  const onExitKioskRef   = useRef(onExitKiosk);

  // Keep refs in sync with latest props/state
  useEffect(() => { showPromptRef.current    = showPrompt;         }, [showPrompt]);
  useEffect(() => { kioskActiveRef.current   = kioskState.active;  }, [kioskState.active]);
  useEffect(() => { onAdminAccessRef.current = onAdminAccess;      }, [onAdminAccess]);
  useEffect(() => { onExitKioskRef.current   = onExitKiosk;        }, [onExitKiosk]);

  const showReEnterBanner =
    kioskState.active && !kioskState.isFullscreen && !showPrompt;

  // ── Open admin prompt (called from inside the stable listener) ────────────

  const openAdminPrompt = useCallback((action: "admin" | "exit" = "admin") => {
    setPendingAction(action);
    showPromptRef.current = true;
    setShowPrompt(true);
  }, []);

  const openAdminPromptRef = useRef(openAdminPrompt);
  useEffect(() => { openAdminPromptRef.current = openAdminPrompt; }, [openAdminPrompt]);

  // ── Single stable listener — mouse + touch, mounted once ────────────────

  useEffect(() => {
    const handlePoint = (clientX: number, clientY: number) => {
      if (showPromptRef.current) return;

      // Filter: top-center zone only
      const fromTop    = clientY;
      const fromCenter = Math.abs(clientX - window.innerWidth / 2);
      if (fromTop > ZONE_HEIGHT || fromCenter > ZONE_HALF_W) return;

      tapCountRef.current += 1;
      const count = tapCountRef.current;
      setTapFeedback(count);

      // Restart window timer — on expiry, decide what to do with the count
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        const finalCount = tapCountRef.current;
        tapCountRef.current = 0;
        setTapFeedback(0);
        tapTimerRef.current = null;

        // Exactly 5 taps and no more → open admin PIN
        if (finalCount === ADMIN_TAPS) {
          openAdminPromptRef.current("admin");
        }
        // 6–9 taps: ignore (incomplete exit gesture)
      }, TAP_WINDOW_MS);

      // 10+ taps → demande le PIN pour quitter le kiosque
      if (count >= EXIT_TAPS && kioskActiveRef.current) {
        tapCountRef.current = 0;
        setTapFeedback(0);
        if (tapTimerRef.current) { clearTimeout(tapTimerRef.current); tapTimerRef.current = null; }
        openAdminPromptRef.current("exit");
      }
    };

    let lastTouchTime = 0;

    const onTouch = (e: TouchEvent) => {
      lastTouchTime = Date.now();
      const touch = e.touches[0];
      if (touch) handlePoint(touch.clientX, touch.clientY);
    };

    // Ignore mousedown fired right after a touchstart (same physical tap)
    const onMouse = (e: MouseEvent) => {
      if (Date.now() - lastTouchTime < 500) return;
      handlePoint(e.clientX, e.clientY);
    };

    document.addEventListener("touchstart", onTouch, { passive: true, capture: true });
    document.addEventListener("mousedown",  onMouse, { capture: true });
    return () => {
      document.removeEventListener("touchstart", onTouch, { capture: true });
      document.removeEventListener("mousedown",  onMouse, { capture: true });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
  }, []);

  // ── Auto-submit PIN when length matches ───────────────────────────────────

  useEffect(() => {
    if (pinInput.length > 0 && pinInput.length >= Math.max(4, adminPin.length)) {
      const t = setTimeout(handlePinSubmit, 120);
      return () => clearTimeout(t);
    }
  }, [pinInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PIN validation ─────────────────────────────────────────────────────────

  const handlePinSubmit = () => {
    if (pinInput === adminPin) {
      setPinInput(""); setPinError(false); setShowPrompt(false);
      if (pendingAction === "exit") {
        onExitKioskRef.current();
      } else {
        onAdminAccessRef.current();
      }
    } else {
      setPinError(true); setPinInput("");
    }
  };

  const closePrompt = () => {
    setShowPrompt(false); setPinInput(""); setPinError(false);
  };

  // Don't render anything if idle and no kiosk
  if (!kioskState.active && !showPrompt && tapFeedback === 0) return null;

  return (
    <>
      {/* ── Kiosk status badges — below top bar, left side ── */}
      {kioskState.active && (
        <motion.div
          className="pointer-events-none fixed left-2 top-[calc(env(safe-area-inset-top)+2.6rem)] z-[199] flex items-center gap-1"
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-black/60 px-2 py-0.5 backdrop-blur-xl">
            <Shield className="h-2.5 w-2.5 text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-400">Kiosque</span>
          </div>
          {!kioskState.isWakeLocked && (
            <div className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-black/60 px-2 py-0.5 backdrop-blur-xl">
              <WifiOff className="h-2.5 w-2.5 text-amber-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-400">Veille</span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Tap zone (invisible) + progress dots ─────────────────────── */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 z-[198]"
        style={{ width: ZONE_HALF_W * 2, height: ZONE_HEIGHT }}
        aria-hidden="true"
      >
        <AnimatePresence>
          {tapFeedback > 0 && (
            <motion.div
              className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1.5"
              initial={{ opacity: 0, y: -4, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.18 }}
            >
              {/* 5 puces indigo → réglages */}
              {Array.from({ length: ADMIN_TAPS }).map((_, i) => (
                <motion.div
                  key={`admin-${i}`}
                  className={`h-2 w-2 rounded-full transition-colors duration-100 ${
                    i < tapFeedback ? "bg-indigo-400" : "bg-white/20"
                  }`}
                  animate={i === tapFeedback - 1 ? { scale: [1, 1.7, 1] } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              ))}

              {/* Séparateur */}
              <div className="w-px self-stretch bg-white/20 mx-0.5" />

              {/* 5 puces rouge → exit kiosque */}
              {Array.from({ length: EXIT_TAPS - ADMIN_TAPS }).map((_, i) => {
                const globalIndex = ADMIN_TAPS + i;
                return (
                  <motion.div
                    key={`exit-${i}`}
                    className={`h-2 w-2 rounded-full transition-colors duration-100 ${
                      globalIndex < tapFeedback ? "bg-red-400" : "bg-white/20"
                    }`}
                    animate={globalIndex === tapFeedback - 1 ? { scale: [1, 1.7, 1] } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Re-enter fullscreen banner ────────────────────────────────── */}
      <AnimatePresence>
        {showReEnterBanner && (
          <motion.div
            className="fixed inset-x-0 top-0 z-[201] flex items-center justify-between gap-3 bg-indigo-600 px-4 shadow-2xl"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}
            initial={{ y: -80 }} animate={{ y: 0 }} exit={{ y: -80 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          >
            <div className="flex items-center gap-2.5">
              <Maximize2 className="h-4 w-4 shrink-0 text-white" />
              <p className="text-[13px] font-bold text-white">Kiosque interrompu — touchez pour reprendre</p>
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

      {/* ── Admin PIN prompt ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-5 backdrop-blur-2xl"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${pendingAction === "exit" ? "bg-red-500/15 text-red-400" : "bg-indigo-500/15 text-indigo-400"}`}>
                  {pendingAction === "exit" ? <LogOut className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <h2 className="text-[17px] font-black text-white leading-tight">
                    {pendingAction === "exit" ? "Quitter le kiosque" : "Administrateur"}
                  </h2>
                  <p className="text-[12px] text-white/50">
                    {pendingAction === "exit" ? "Entrez le PIN pour désactiver" : "Gestion du PhotoBooth360"}
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

              {/* Error */}
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

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (pinInput.length < Math.max(4, adminPin.length)) {
                        setPinError(false);
                        setPinInput((p: string) => p + String(n));
                      }
                    }}
                    className="flex h-[3.75rem] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[22px] font-black text-white active:bg-white/15 touch-manipulation"
                  >
                    {n}
                  </motion.button>
                ))}
                <div />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setPinError(false); setPinInput((p: string) => p + "0"); }}
                  className="flex h-[3.75rem] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[22px] font-black text-white active:bg-white/15 touch-manipulation"
                >
                  0
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setPinError(false); setPinInput((p: string) => p.slice(0, -1)); }}
                  className="flex h-[3.75rem] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[20px] text-white/60 active:bg-white/15 touch-manipulation"
                  aria-label="Effacer"
                >
                  ⌫
                </motion.button>
              </div>

              {/* Confirm */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handlePinSubmit}
                disabled={pinInput.length === 0}
                className={`flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl text-[14px] font-black text-white disabled:opacity-40 touch-manipulation ${
                  pendingAction === "exit"
                    ? "bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)]"
                    : "bg-indigo-500 shadow-[0_0_24px_rgba(99,102,241,0.4)]"
                }`}
              >
                {pendingAction === "exit" ? <LogOut className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                {pendingAction === "exit" ? "Quitter le kiosque" : "Confirmer"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
