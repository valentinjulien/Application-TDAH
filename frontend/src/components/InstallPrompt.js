import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    const checkIfInstalled = () => {
      // Méthode 1: Vérifier si on est en mode standalone
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }

      // Méthode 2: Vérifier si on est dans une PWA installée
      if (window.navigator.standalone === true) {
        setIsInstalled(true);
        return;
      }

      // Méthode 3: Vérifier le localStorage
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const dismissedDate = new Date(dismissed);
        const now = new Date();
        const diffTime = Math.abs(now - dismissedDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Réafficher après 7 jours
        if (diffDays < 7) {
          setIsDismissed(true);
          return;
        }
      }

      setIsVisible(true);
    };

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      checkIfInstalled();
    };

    // Écouter l'événement appinstalled
    const handleAppInstalled = (e) => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);

      // Analytics: track installation
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'pwa_install', {
          event_category: 'engagement',
          event_label: 'pwa_install'
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Vérifier initialement
    checkIfInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback: ouvrir les instructions d'installation manuelle
      showManualInstallInstructions();
      return;
    }

    try {
      // Afficher le prompt d'installation natif
      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setIsInstalled(true);
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }

      setDeferredPrompt(null);
      setIsVisible(false);
    } catch (error) {
      console.error('[PWA] Error during installation:', error);
      showManualInstallInstructions();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  const showManualInstallInstructions = () => {
    // Pour Chrome/Edge
    if (navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Edge')) {
      alert('Pour installer l\'app :\n1. Cliquez sur l\'icône d\'installation dans la barre d\'adresse\n2. Ou allez dans le menu (⋮) > "Installer TDAH Bot Assistant"');
    }
    // Pour Safari
    else if (navigator.userAgent.includes('Safari')) {
      alert('Pour installer l\'app sur iOS :\n1. Tapez sur le bouton de partage\n2. Sélectionnez "Sur l\'écran d\'accueil"');
    }
    // Pour Firefox
    else if (navigator.userAgent.includes('Firefox')) {
      alert('Pour installer l\'app :\n1. Cliquez sur l\'icône d\'installation dans la barre d\'adresse\n2. Ou allez dans le menu > "Installer cette application"');
    }
    // Par défaut
    else {
      alert('Votre navigateur ne supporte pas l\'installation automatique. Utilisez les options d\'installation de votre navigateur.');
    }
  };

  // Ne rien afficher si l'app est déjà installée ou si l'utilisateur a refusé
  if (isInstalled || isDismissed || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-large border border-neutral-200 p-4">
        <div className="flex items-start space-x-3">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-display font-semibold text-neutral-900 mb-1">
              Installer TDAH Assistant
            </h3>
            <p className="text-sm text-neutral-600 mb-3">
              Installez l'application sur votre bureau pour un accès rapide et une expérience native.
            </p>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleInstallClick}
                className="btn-primary flex-1 flex items-center justify-center space-x-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Installer</span>
              </button>

              <button
                onClick={handleDismiss}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Fermer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Indicateurs de fonctionnalités */}
        <div className="mt-3 pt-3 border-t border-neutral-200">
          <div className="flex items-center justify-center space-x-4 text-xs text-neutral-500">
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="w-3 h-3 text-accent-500" />
              <span>Accès rapide</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="w-3 h-3 text-accent-500" />
              <span>Hors ligne</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="w-3 h-3 text-accent-500" />
              <span>Notifications</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;