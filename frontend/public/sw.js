const CACHE_NAME = 'dr-agri-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/logo-192.png',
  '/logo-512.png',
  '/logo-maskable-512.png'
];

self.addEventListener('install', event => {
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // Clean up all legacy caches (agrivision-v1, agrivision-v2, etc.)
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting legacy cache:', cacheName);
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

  // Network-first for manifest.json and page navigation (HTML)
  // Ensures updated branding, splash screen, and theme color are never trapped by stale cache
  const isNav = event.request.mode === 'navigate';
  const isManifest = event.request.url.includes('manifest.json');

  if (isNav || isManifest) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // If offline, fall back to cached version
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(isNav ? '/index.html' : '/manifest.json');
          if (cachedResponse) return cachedResponse;
          return new Response('Network error occurred. Please check your internet connection.', { 
            status: 408, 
            headers: { 'Content-Type': 'text/plain' } 
          });
        })
    );
    return;
  }

  // Cache-first with background revalidation for static assets
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const respClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, respClone);
            });
          }
          return networkResponse;
        }).catch(async () => {
          return new Response('Offline asset unavailable.', { status: 404 });
        });
      })
  );
});
