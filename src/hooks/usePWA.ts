import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { logger } from '../shared/utils/logger';

let serviceWorkerUpdateTimer: number | null = null;

export function usePWA() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const {
    needRefresh: [needRefreshValue, setNeedRefreshValue],
    offlineReady: [offlineReadyValue, setOfflineReadyValue],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      logger.info('[PWA] Service Worker registered', { swUrl });

      if (registration && serviceWorkerUpdateTimer === null) {
        serviceWorkerUpdateTimer = window.setInterval(() => {
          if (document.visibilityState === 'visible') {
            void registration.update();
          }
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      logger.error('[PWA] Service Worker registration failed', error);
    },
  });

  useEffect(() => {
    setNeedRefresh(needRefreshValue);
    setOfflineReady(offlineReadyValue);
    setUpdateAvailable(needRefreshValue);
  }, [needRefreshValue, offlineReadyValue]);

  const update = async () => {
    await updateServiceWorker(true);
    setNeedRefreshValue(false);
    setUpdateAvailable(false);
  };

  const close = () => {
    setNeedRefreshValue(false);
    setOfflineReadyValue(false);
    setUpdateAvailable(false);
  };

  return {
    needRefresh,
    offlineReady,
    updateAvailable,
    update,
    close,
  };
}
