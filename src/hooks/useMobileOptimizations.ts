import { useEffect, useState } from 'react';

interface MobileOptimizations {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasNotch: boolean;
  supportsVibration: boolean;
  supportsOrientation: boolean;
  orientation: 'portrait' | 'landscape';
  installPromptSupported: boolean;
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
      const angle = window.screen.orientation?.angle ?? (window as any).orientation ?? 0;
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
  }, [isMobile, isIOS, isAndroid, supportsOrientation]);

  return {
    isMobile,
    isIOS,
    isAndroid,
    hasNotch,
    supportsVibration,
    supportsOrientation,
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
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error('Erreur lors du passage en plein écran:', err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
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
      setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
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
