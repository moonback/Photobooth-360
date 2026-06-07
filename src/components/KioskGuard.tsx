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
import { Maximize2, Shield, WifiOff } from "lucide-react";
import PinModal from "./PinModal";
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

  // ── PIN validation ─────────────────────────────────────────────────────────

  const handlePinUnlock = () => {
    setShowPrompt(false);
    if (pendingAction === "exit") {
      onExitKioskRef.current();
    } else {
      onAdminAccessRef.current();
    }
  };

  const closePrompt = () => {
    setShowPrompt(false);
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
            <span className="text-label text-emerald-400">Kiosque</span>
          </div>
          {!kioskState.isWakeLocked && (
            <div className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-black/60 px-2 py-0.5 backdrop-blur-xl">
              <WifiOff className="h-2.5 w-2.5 text-amber-400" />
              <span className="text-label text-amber-400">Veille</span>
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
            className="fixed inset-x-0 top-0 z-[201] flex items-center justify-between gap-3 border-b border-neuro-accent/30 bg-neuro-bg/95 px-4 backdrop-blur-xl"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}
            initial={{ y: -80 }} animate={{ y: 0 }} exit={{ y: -80 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          >
            <div className="flex items-center gap-2.5">
              <Maximize2 className="h-4 w-4 shrink-0 text-neuro-accent" />
              <p className="text-[13px] font-semibold text-white">Kiosque interrompu</p>
            </div>
            <button
              type="button"
              onClick={onReEnterFullscreen}
              className="btn-accent shrink-0 min-h-0 h-9 rounded-xl px-3.5 text-[12px] touch-manipulation"
            >
              Reprendre
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Admin PIN prompt ──────────────────────────────────────────── */}
      <PinModal
        isOpen={showPrompt}
        adminPin={adminPin}
        variant={pendingAction === "exit" ? "exit" : "admin"}
        onUnlock={handlePinUnlock}
        onCancel={closePrompt}
      />
    </>
  );
}
