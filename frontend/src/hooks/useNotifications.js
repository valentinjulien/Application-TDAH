import { useState, useEffect, useCallback } from 'react';

// Convertir la clé VAPID base64 en Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [subscription, setSubscription] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);

  // Vérifier le support
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 
      'Notification' in window && 
      'serviceWorker' in navigator && 
      'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      // Enregistrer le service worker
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[Notifications] SW registered');
          setSwRegistration(registration);
          
          // Vérifier si déjà abonné
          return registration.pushManager.getSubscription();
        })
        .then((sub) => {
          if (sub) {
            setSubscription(sub);
          }
        })
        .catch((error) => {
          console.error('[Notifications] SW registration failed:', error);
        });
    }
  }, []);

  // Demander la permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('[Notifications] Not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('[Notifications] Permission error:', error);
      return false;
    }
  }, [isSupported]);

  // S'abonner aux notifications push
  const subscribe = useCallback(async () => {
    if (!isSupported || !swRegistration) {
      return null;
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    try {
      // Clé VAPID publique (à remplacer par la vraie en production)
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      setSubscription(sub);
      console.log('[Notifications] Subscribed:', sub);
      
      // Envoyer la subscription au serveur
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subscription: sub.toJSON()
        })
      });
      
      return sub;
    } catch (error) {
      console.error('[Notifications] Subscribe error:', error);
      return null;
    }
  }, [isSupported, swRegistration, permission, requestPermission]);

  // Se désabonner
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      
      // Informer le serveur
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        credentials: 'include'
      });
      
      console.log('[Notifications] Unsubscribed');
    } catch (error) {
      console.error('[Notifications] Unsubscribe error:', error);
    }
  }, [subscription]);

  // Envoyer une notification locale
  const showNotification = useCallback(async (title, options = {}) => {
    if (permission !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      tag: 'tdah-notification',
      ...options
    };

    if (swRegistration) {
      await swRegistration.showNotification(title, defaultOptions);
    } else {
      new Notification(title, defaultOptions);
    }
  }, [permission, swRegistration]);

  // Planifier une notification (rappel)
  const scheduleNotification = useCallback(async (title, body, delayMs) => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    // Utiliser setTimeout pour simuler le scheduling
    // En production, cela devrait être géré côté serveur
    setTimeout(() => {
      showNotification(title, { body });
    }, delayMs);

    return true;
  }, [permission, requestPermission, showNotification]);

  return {
    isSupported,
    permission,
    subscription,
    isSubscribed: !!subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    scheduleNotification
  };
};

export default useNotifications;
