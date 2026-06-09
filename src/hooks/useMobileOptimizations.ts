import { useEffect, useState } from 'react';

interface MobileOptimizations {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasNotch: boolean;
  supportsVibration: boolean;
  supportsOrientation: boolean;
  supportsWebShare: boolean;
  supportsShareFiles: boolean;
  isStandalone: boolean;
  orientation: 'portrait' | 'landscape';
  installPromptSupported: boolean;
}

interface LegacyScreen extends Screen {
  mozOrientation?: number;
}

interface LegacyDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

interface LegacyHTMLElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export function useMobileOptimizations(): MobileOptimizations {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Détection du type d'appareil
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  
  // Détection de la notch (encoche)
  const hasNotch = 
    'CSS' in window && 
    CSS.supports('padding-top: env(safe-area-inset-top)') &&
    parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0') > 0;

  // Support des fonctionnalités
  const supportsVibration = 'vibrate' in navigator;
  const supportsOrientation = 'orientation' in window.screen || 'mozOrientation' in window.screen;
  const supportsWebShare = typeof navigator.share === 'function';
  const supportsShareFiles =
    supportsWebShare &&
    (typeof navigator.canShare !== 'function' ||
      navigator.canShare({ files: [new File([], 'probe.webm', { type: 'video/webm' })] }));
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const installPromptSupported = 'BeforeInstallPromptEvent' in window || isIOS;

  useEffect(() => {
    // Empêcher le zoom sur double-tap (iOS)
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Empêcher le pull-to-refresh sur mobile
    let lastTouchY = 0;
    const preventPullToRefresh = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const touchYDelta = touchY - lastTouchY;
      lastTouchY = touchY;

      if (e.cancelable && window.scrollY === 0 && touchYDelta > 0) {
        e.preventDefault();
      }
    };

    // Gérer l'orientation
    const handleOrientationChange = () => {
      const legacyScreen = window.screen as LegacyScreen;
      const angle = window.screen.orientation?.angle ?? legacyScreen.mozOrientation ?? 0;
      setOrientation(Math.abs(angle) === 90 ? 'landscape' : 'portrait');
    };

    // Optimiser les performances sur mobile
    if (isMobile) {
      document.addEventListener('touchstart', preventZoom, { passive: false });
      document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
      
      // Ajouter une classe CSS pour les styles mobile
      document.documentElement.classList.add('is-mobile');
      if (isIOS) document.documentElement.classList.add('is-ios');
      if (isAndroid) document.documentElement.classList.add('is-android');
      if (isStandalone) document.documentElement.classList.add('is-standalone');
    }

    if (supportsOrientation) {
      window.addEventListener('orientationchange', handleOrientationChange);
      window.screen.orientation?.addEventListener('change', handleOrientationChange);
      handleOrientationChange();
    }

    // Empêcher le menu contextuel sur long press
    const preventContextMenu = (e: Event) => {
      if (isMobile) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventPullToRefresh);
      document.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.screen.orientation?.removeEventListener('change', handleOrientationChange);
    };
  }, [isMobile, isIOS, isAndroid, isStandalone, supportsOrientation]);

  return {
    isMobile,
    isIOS,
    isAndroid,
    hasNotch,
    supportsVibration,
    supportsOrientation,
    supportsWebShare,
    supportsShareFiles,
    isStandalone,
    orientation,
    installPromptSupported,
  };
}

// Hook pour le feedback haptique
export function useHapticFeedback() {
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return {
    light: () => vibrate(10),
    medium: () => vibrate(20),
    heavy: () => vibrate(30),
    success: () => vibrate([50, 30, 50]),
    error: () => vibrate([100, 50, 100, 50, 100]),
    selection: () => vibrate(5),
  };
}

// Hook pour le mode plein écran
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = async () => {
    try {
      const element = document.documentElement as LegacyHTMLElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error('Erreur lors du passage en plein écran:', err);
    }
  };

  const exitFullscreen = async () => {
    try {
      const legacyDocument = document as LegacyDocument;
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (legacyDocument.webkitExitFullscreen) {
        await legacyDocument.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error('Erreur lors de la sortie du plein écran:', err);
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const legacyDocument = document as LegacyDocument;
      setIsFullscreen(Boolean(document.fullscreenElement || legacyDocument.webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
