import { useEffect, useState } from 'react';

export const usePWA = () => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Enregistrer le Service Worker
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });

          console.log('[PWA] Service Worker enregistré:', reg);

          setRegistration(reg);

          // Écouter les mises à jour
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setIsUpdateAvailable(true);
                }
              });
            }
          });

          // Vérifier immédiatement s'il y a une mise à jour
          if (reg.waiting) {
            setIsUpdateAvailable(true);
          }

        } catch (error) {
          console.error('[PWA] Erreur enregistrement SW:', error);
        }
      }
    };

    // Gérer l'état de connexion
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    registerSW();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateApp = () => {
    if (registration && registration.waiting) {
      // Envoyer un message au SW pour qu'il s'active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Recharger la page quand le nouveau SW est activé
      registration.waiting.addEventListener('statechange', (event) => {
        if (event.target.state === 'activated') {
          window.location.reload();
        }
      });
    }
  };

  const getSWVersion = async () => {
    return new Promise((resolve) => {
      if (navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.version);
        };
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_VERSION' },
          [messageChannel.port2]
        );
      } else {
        resolve(null);
      }
    });
  };

  return {
    isUpdateAvailable,
    isOffline,
    registration,
    updateApp,
    getSWVersion
  };
};