/**
 * useKiosk — Mode kiosque pour smartphone
 *
 * Ce hook orchestre plusieurs API pour créer une expérience plein écran
 * verrouillée, sans accès au navigateur ni aux paramètres système :
 *
 *  1. Fullscreen API           — plein écran natif (Chrome Android)
 *  2. Screen Wake Lock API     — empêche la mise en veille de l'écran
 *  3. Keyboard / navigation lock — intercepte Retour, Home, App Switcher
 *  4. Pointer Lock             — désactive le curseur système
 *  5. Viewport + overscroll    — bloque le pull-to-refresh et le bounce iOS
 *  6. Visibilitychange watcher — ré-active le verrou si l'app repasse au 1er plan
 *  7. beforeunload guard       — empêche la fermeture accidentelle de l'onglet
 *
 * Limitations platform :
 *  - iOS (Safari) : pas de Fullscreen API ni de WakeLock. L'app doit être
 *    installée en PWA (Add to Home Screen) pour avoir le vrai plein écran.
 *    Le hook guide l'utilisateur via `installRequired`.
 *  - Android Chrome : fullscreen + WakeLock fonctionnent en navigateur ET en PWA.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KioskState {
  /** Kiosk mode is currently active */
  active: boolean;
  /** Fullscreen is currently engaged */
  isFullscreen: boolean;
  /** Wake lock is currently held */
  isWakeLocked: boolean;
  /** Platform cannot do fullscreen without PWA install */
  installRequired: boolean;
  /** Last error message */
  error: string | null;
}

export interface UseKioskReturn extends KioskState {
  /** Enter kiosk mode — call from a user-gesture handler */
  enter: () => Promise<void>;
  /** Exit kiosk mode (requires admin PIN verification upstream) */
  exit: () => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isPWA(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isFullscreenSupported(): boolean {
  const el = document.documentElement;
  return (
    "requestFullscreen" in el ||
    "webkitRequestFullscreen" in el ||
    "mozRequestFullScreen" in el
  );
}

async function requestFullscreen(): Promise<void> {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
  };
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
}

async function exitFullscreenAPI(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
  };
  if (doc.exitFullscreen) return doc.exitFullscreen();
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
  if (doc.mozCancelFullScreen) return doc.mozCancelFullScreen();
}

function getFullscreenElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
  };
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    null
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKiosk(): UseKioskReturn {
  const [active, setActive]           = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const activeRef   = useRef(false); // sync ref for event callbacks

  // iOS without PWA can't do fullscreen
  const installRequired = isIOS() && !isPWA();

  // ── Wake Lock ──────────────────────────────────────────────────────────────

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setIsWakeLocked(true);
      wakeLockRef.current.addEventListener("release", () => {
        setIsWakeLocked(false);
        // Re-acquire if still in kiosk mode (e.g. tab became visible again)
        if (activeRef.current) acquireWakeLock();
      });
    } catch {
      // WakeLock denied — non-fatal
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release().catch(() => undefined);
      wakeLockRef.current = null;
      setIsWakeLocked(false);
    }
  }, []);

  // ── Fullscreen ─────────────────────────────────────────────────────────────

  const enterFullscreen = useCallback(async () => {
    if (!isFullscreenSupported()) return;
    if (getFullscreenElement()) return; // already fullscreen
    try {
      await requestFullscreen();
    } catch {
      // Ignored — may fail if not triggered by a gesture
    }
  }, []);

  // ── Keyboard / navigation lock (Android Chrome 92+) ───────────────────────

  const acquireNavigationLock = useCallback(async () => {
    const nav = navigator as Navigator & {
      keyboard?: { lock(keys?: string[]): Promise<void>; unlock(): void };
    };
    if (!nav.keyboard?.lock) return;
    try {
      // Lock Escape so users can't exit fullscreen, lock navigation keys
      await nav.keyboard.lock(["Escape", "MetaLeft", "MetaRight"]);
    } catch {
      // Non-critical
    }
  }, []);

  const releaseNavigationLock = useCallback(() => {
    const nav = navigator as Navigator & {
      keyboard?: { lock(keys?: string[]): Promise<void>; unlock(): void };
    };
    nav.keyboard?.unlock?.();
  }, []);

  // ── CSS body locks (overscroll, pull-to-refresh) ──────────────────────────

  const applyBodyLocks = useCallback((lock: boolean) => {
    const body = document.body;
    const html = document.documentElement;
    if (lock) {
      body.style.overscrollBehavior = "none";
      body.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      // Prevent iOS rubber-band / pull-to-refresh
      body.style.position = "fixed";
      body.style.width = "100%";
      body.style.height = "100%";
    } else {
      body.style.overscrollBehavior = "";
      body.style.overflow = "";
      html.style.overscrollBehavior = "";
      body.style.position = "";
      body.style.width = "";
      body.style.height = "";
    }
  }, []);

  // ── beforeunload guard ─────────────────────────────────────────────────────

  const beforeUnloadHandler = useCallback((e: BeforeUnloadEvent) => {
    if (!activeRef.current) return;
    e.preventDefault();
    e.returnValue = "";
  }, []);

  // ── Context menu / long-press prevention ──────────────────────────────────

  const contextMenuHandler = useCallback((e: Event) => {
    if (activeRef.current) e.preventDefault();
  }, []);

  // ── Fullscreen change listener ─────────────────────────────────────────────

  const onFullscreenChange = useCallback(() => {
    const inFS = Boolean(getFullscreenElement());
    setIsFullscreen(inFS);

    // If user somehow exited fullscreen while kiosk is active, re-enter
    if (activeRef.current && !inFS && isFullscreenSupported()) {
      setTimeout(() => {
        if (activeRef.current) enterFullscreen();
      }, 300);
    }
  }, [enterFullscreen]);

  // ── Visibility change — re-acquire WakeLock when tab is visible ───────────

  const onVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible" && activeRef.current) {
      acquireWakeLock();
    }
  }, [acquireWakeLock]);

  // ── Enter kiosk ───────────────────────────────────────────────────────────

  const enter = useCallback(async () => {
    setError(null);
    activeRef.current = true;

    try {
      await enterFullscreen();
      await acquireWakeLock();
      await acquireNavigationLock();
      applyBodyLocks(true);

      // Event listeners
      document.addEventListener("fullscreenchange", onFullscreenChange);
      document.addEventListener("webkitfullscreenchange", onFullscreenChange);
      document.addEventListener("mozfullscreenchange", onFullscreenChange);
      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("beforeunload", beforeUnloadHandler);
      document.addEventListener("contextmenu", contextMenuHandler);

      setActive(true);
      setIsFullscreen(Boolean(getFullscreenElement()) || isPWA());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      activeRef.current = false;
    }
  }, [
    enterFullscreen,
    acquireWakeLock,
    acquireNavigationLock,
    applyBodyLocks,
    onFullscreenChange,
    onVisibilityChange,
    beforeUnloadHandler,
    contextMenuHandler,
  ]);

  // ── Exit kiosk ────────────────────────────────────────────────────────────

  const exit = useCallback(async () => {
    activeRef.current = false;

    await releaseWakeLock();
    releaseNavigationLock();
    applyBodyLocks(false);

    if (getFullscreenElement()) {
      await exitFullscreenAPI().catch(() => undefined);
    }

    // Remove event listeners
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    document.removeEventListener("mozfullscreenchange", onFullscreenChange);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    document.removeEventListener("contextmenu", contextMenuHandler);

    setActive(false);
    setIsFullscreen(false);
    setError(null);
  }, [
    releaseWakeLock,
    releaseNavigationLock,
    applyBodyLocks,
    onFullscreenChange,
    onVisibilityChange,
    beforeUnloadHandler,
    contextMenuHandler,
  ]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (activeRef.current) {
        activeRef.current = false;
        wakeLockRef.current?.release().catch(() => undefined);
        applyBodyLocks(false);
        document.removeEventListener("fullscreenchange", onFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
        document.removeEventListener("mozfullscreenchange", onFullscreenChange);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("beforeunload", beforeUnloadHandler);
        document.removeEventListener("contextmenu", contextMenuHandler);
      }
    };
  }, [applyBodyLocks, onFullscreenChange, onVisibilityChange, beforeUnloadHandler, contextMenuHandler]);

  return {
    active,
    isFullscreen,
    isWakeLocked,
    installRequired,
    error,
    enter,
    exit,
  };
}
