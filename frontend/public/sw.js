const CACHE_NAME = 'agrivision-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim clients immediately so the updated SW takes control
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Never cache API requests or Vite development requests
  if (
    event.request.url.includes('/api/v1/') || 
    event.request.url.includes('@vite') || 
    event.request.url.includes('@react-refresh') ||
    event.request.url.includes('/src/') ||
    event.request.url.includes('node_modules')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit
        if (response) {
          return response;
        }

        // Network request
        return fetch(event.request).catch(async () => {
          // If the network fetch fails (e.g. offline) and it's a page navigation,
          // return the cached index.html so React Router can handle it.
          if (event.request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return cache.match('/index.html');
          }
          return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        });
      })
  );
});
