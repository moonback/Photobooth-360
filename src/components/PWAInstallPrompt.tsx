import { X, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Détecter si déjà installé
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Si déjà installé, ne rien afficher
    if (standalone) return;

    // Pour iOS, afficher le prompt après un délai
    if (iOS) {
      const hasSeenIOSPrompt = localStorage.getItem('pwa-ios-prompt-dismissed');
      if (!hasSeenIOSPrompt) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
      return;
    }

    // Pour Android/Desktop
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      const hasSeenPrompt = localStorage.getItem('pwa-prompt-dismissed');
      if (!hasSeenPrompt) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('pwa-ios-prompt-dismissed', 'true');
    } else {
      localStorage.setItem('pwa-prompt-dismissed', 'true');
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-purple-900/95 to-pink-900/95 backdrop-blur-lg rounded-2xl shadow-2xl p-4 border border-white/10">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="bg-white/10 p-2 rounded-xl">
            <Download className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg mb-1">
              Installer NeuroBooth 360
            </h3>
            
            {isIOS ? (
              <div className="text-white/80 text-sm space-y-2">
                <p>Installez l'application pour une meilleure expérience :</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Appuyez sur le bouton Partager <span className="inline-block">⎙</span></li>
                  <li>Sélectionnez "Sur l'écran d'accueil"</li>
                  <li>Appuyez sur "Ajouter"</li>
                </ol>
              </div>
            ) : (
              <>
                <p className="text-white/80 text-sm mb-3">
                  Accédez rapidement à l'app et utilisez-la hors ligne
                </p>
                
                <button
                  onClick={handleInstall}
                  className="bg-white text-purple-900 px-4 py-2 rounded-lg font-medium text-sm hover:bg-white/90 transition-colors"
                >
                  Installer maintenant
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
