/**
 * Haefit Service Worker v10
 *
 * Strategy:
 *   - HTML navigation → NETWORK-FIRST (so a new deploy shows immediately),
 *     falling back to the cached shell when offline or the network is slow.
 *     (v9 was cache-first; on iOS the background refresh often never finished,
 *     leaving phones stuck on an old app whose page files no longer exist.)
 *   - Hashed Vite assets (/assets/*) → Cache-first, but ONLY real JS/CSS/etc.
 *     (never cache an HTML fallback or error as a script — that broke pages)
 *   - API / Supabase / auth → Network only (never cache)
 *   - Other same-origin → Stale-while-revalidate
 */

const CACHE_NAME = 'haefit-v10';
const NAV_TIMEOUT_MS = 4000;
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
              const type = res.headers.get('content-type') || '';
              if (res.ok && !type.includes('text/html')) {
                cache.put(request, res.clone());
              }
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
          .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
          .catch(() => null);
        return cached || networkFetch;
      })
    )
  );
});

/**
 * Navigation handler — network-first:
 *   1. Network (Navigation Preload if available), with a timeout
 *   2. Cached app shell (offline / very slow network)
 *   3. Minimal "Loading…" page
 * A successful network response refreshes the cached shell.
 */
async function handleNavigate(event) {
  const cache = await caches.open(CACHE_NAME);

  const fromNetwork = (async () => {
    const preloaded = await (event.preloadResponse || Promise.resolve(null));
    const res = preloaded || (await fetch(event.request, { cache: 'no-store' }));
    if (res && res.ok) {
      event.waitUntil(cache.put(APP_SHELL, res.clone()));
    }
    return res;
  })();

  try {
    const res = await Promise.race([
      fromNetwork,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NAV_TIMEOUT_MS)),
    ]);
    if (res && res.ok) return res;
    throw new Error('bad response');
  } catch (e) {
    const cached = await cache.match(APP_SHELL);
    if (cached) return cached;
    try {
      return await fromNetwork; // slow network but no cache — keep waiting
    } catch (e2) {
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
        '<body style="background:#E0F2FE;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">' +
        '<div style="text-align:center"><h2 style="color:#10b981">Haefit</h2><p style="color:#475569">You are offline. Please reconnect.</p></div></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  }
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
