/**
 * Haefit Service Worker v8
 *
 * Strategy:
 *   - HTML navigation → Cache-first (instant) + background revalidate
 *     Uses Navigation Preload so the network fetch runs IN PARALLEL with
 *     SW cold-start. If cache is slow (cold IndexedDB), preload is the fallback.
 *   - Hashed Vite assets (/assets/*) → Cache-first (immutable by hash)
 *   - API / Supabase / auth → Network only (never cache)
 *   - Other same-origin → Stale-while-revalidate
 */

const CACHE_NAME = 'haefit-v8';
const APP_SHELL = '/';

const PRECACHE = [
  APP_SHELL,
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

// ── Activate ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      ),
      // Enable Navigation Preload — browser starts network fetch
      // simultaneously with SW boot, so cold-start doesn't block HTML delivery
      self.registration.navigationPreload && self.registration.navigationPreload.enable(),
    ])
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

  // 3. HTML navigation → cache-first with preload fallback
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(event));
    return;
  }

  // 4. Hashed Vite assets → cache-first (immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((res) => {
              cache.put(request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // 5. Everything else → stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((res) => { cache.put(request, res.clone()); return res; })
          .catch(() => null);
        return cached || networkFetch;
      })
    )
  );
});

/**
 * Navigation handler — 3-layer fallback for instant HTML delivery:
 *
 *  Layer 1: Serve from cache (fastest, <50ms when cache is warm)
 *  Layer 2: Use Navigation Preload response (browser started this fetch
 *           while the SW was still cold-booting — covers the 1-3s IndexedDB
 *           cold-start delay that causes white screen on mobile PWA reopen)
 *  Layer 3: Direct network fetch (last resort)
 *
 * After serving, background-revalidate the cache for next visit.
 */
async function handleNavigate(event) {
  // Start all three sources in parallel
  const cachePromise = caches.open(CACHE_NAME)
    .then((cache) => cache.match(APP_SHELL))
    .catch(() => null);

  const preloadPromise = event.preloadResponse || Promise.resolve(null);

  try {
    // Layer 1: Try cache first
    const cached = await cachePromise;
    if (cached) {
      // Background: update cache from network (don't await)
      backgroundRevalidate(event);
      return cached;
    }

    // Layer 2: Try Navigation Preload
    const preloaded = await preloadPromise;
    if (preloaded && preloaded.ok) {
      // Store in cache for next time
      const cache = await caches.open(CACHE_NAME);
      cache.put(APP_SHELL, preloaded.clone());
      return preloaded;
    }

    // Layer 3: Direct fetch
    const res = await fetch(event.request);
    if (res.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(APP_SHELL, res.clone());
    }
    return res;
  } catch (e) {
    // Absolute last resort: try cache one more time or return basic HTML
    const lastChance = await caches.match(APP_SHELL);
    return lastChance || new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
      '<body style="background:#E0F2FE;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">' +
      '<div style="text-align:center"><h2 style="color:#10b981">Haefit</h2><p style="color:#475569">Loading...</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/** Revalidate cache in background without blocking the response */
function backgroundRevalidate(event) {
  const doRevalidate = async () => {
    try {
      const preloaded = await (event.preloadResponse || Promise.resolve(null));
      const res = preloaded && preloaded.ok ? preloaded : await fetch(event.request);
      if (res && res.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(APP_SHELL, res.clone());
      }
    } catch (e) {
      // Revalidation failure is non-critical
    }
  };
  doRevalidate();
}

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
