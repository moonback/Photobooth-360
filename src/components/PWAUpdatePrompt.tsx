import { RefreshCw, X } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export function PWAUpdatePrompt() {
  const { needRefresh, offlineReady, updateAvailable, update, close } = usePWA();

  if (!needRefresh && !offlineReady && !updateAvailable) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-gradient-to-r from-blue-900/95 to-purple-900/95 backdrop-blur-lg rounded-2xl shadow-2xl p-4 border border-white/10 max-w-sm">
        <button
          onClick={close}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="bg-white/10 p-2 rounded-xl">
            <RefreshCw className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            {offlineReady && !needRefresh ? (
              <>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Mode hors ligne activé
                </h3>
                <p className="text-white/80 text-sm">
                  L'application est prête à fonctionner sans connexion
                </p>
              </>
            ) : (
              <>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Mise à jour disponible
                </h3>
                <p className="text-white/80 text-sm mb-3">
                  Une nouvelle version de l'application est disponible
                </p>
                
                <button
                  onClick={update}
                  className="bg-white text-purple-900 px-4 py-2 rounded-lg font-medium text-sm hover:bg-white/90 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Mettre à jour
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
