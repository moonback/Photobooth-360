import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

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
      console.log('Service Worker enregistré:', swUrl);
      
      // Vérifier les mises à jour toutes les heures
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Erreur lors de l\'enregistrement du Service Worker:', error);
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
