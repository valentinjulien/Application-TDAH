// Service Worker pour TDAH Companion PWA
const CACHE_NAME = 'tdah-companion-v1.1.0';
const OFFLINE_URL = '/offline.html';

// Fichiers à mettre en cache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de fetch : Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorer les requêtes API (toujours réseau)
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la nouvelle réponse
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback au cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Si c'est une navigation, montrer la page offline
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'TDAH Companion',
    body: 'Nouvelle notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'tdah-notification',
    data: {}
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Ignorer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clic sur une notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  if (action === 'dismiss') {
    return;
  }
  
  // Ouvrir ou focus sur l'app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Chercher une fenêtre existante
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Naviguer vers la bonne page si spécifiée
            if (data.url) {
              client.navigate(data.url);
            }
            return client.focus();
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          const url = data.url || '/';
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync pour les tâches offline
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  // Récupérer les tâches en attente du cache
  const cache = await caches.open('tdah-pending-tasks');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await cache.match(request);
      const taskData = await response.json();
      
      // Envoyer au serveur
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      
      // Supprimer du cache
      await cache.delete(request);
      
      console.log('[SW] Task synced:', taskData.text);
    } catch (error) {
      console.error('[SW] Sync failed:', error);
    }
  }
}

// Message du main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
