// SaGo Staff Portal — Service Worker for PWA installability & offline fallback
const CACHE_NAME = 'sago-portal-v1.4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/theme.css',
  './css/app.css',
  './js/app.js',
  './js/ui.js',
  './js/config.js',
  './assets/favicon-32.png',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/logo-hd.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW cache.addAll partially failed', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle GET requests and skip Supabase/API or external domains for standard caching
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // If Supabase or external API, fetch directly from network
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Update cache with freshly fetched version
        if (response && response.status === 200 && response.type === 'basic') {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
