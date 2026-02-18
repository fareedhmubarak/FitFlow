/**
 * Haefit Service Worker v7
 *
 * Strategy:
 *   - HTML navigation (app shell) → Cache-first, revalidate in background
 *     (serves cached HTML instantly so pre-splash shows immediately,
 *      then updates cache from network for next visit)
 *   - Hashed Vite assets (/assets/*) → Cache-first (immutable by hash)
 *   - API / Supabase / auth → Network only (never cache)
 *   - Other same-origin → Stale-while-revalidate
 *   - Offline → show cached shell
 */

const CACHE_NAME = 'haefit-v7';

// Minimal shell to pre-cache on install
const PRECACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate (clean old caches) ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET
  if (request.method !== 'GET') return;

  // 2. Skip external / API / auth / Supabase
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.href.includes('supabase')
  ) {
    return;
  }

  // 3. HTML navigation requests → cache-first + background revalidate
  //    This is the KEY fix: serve cached HTML instantly so the pre-splash
  //    renders in <50ms instead of waiting 3-4s for a network response.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cached) => {
        // Always revalidate in background
        const networkUpdate = fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put('/', clone));
            }
            return res;
          })
          .catch(() => null);

        // Return cache immediately if available, otherwise wait for network
        return cached || networkUpdate;
      })
    );
    return;
  }

  // 4. Hashed Vite assets → cache-first (immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  // 5. Everything else → stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => null);

      return cached || networkFetch || caches.match('/');
    })
  );
});

// ── Push notifications (future use) ─────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
