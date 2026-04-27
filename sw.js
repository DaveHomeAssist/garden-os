// Garden OS — Service Worker
// Strategy: network-first for HTML, cache-first for fonts, stale-while-revalidate for assets
// Update CACHE_VERSION on every deploy to bust stale caches.

const CACHE_VERSION = '2026-04-27-file-mom-garden-v5-1';
const CACHE_NAME = 'garden-os-' + CACHE_VERSION;

const CORE_ASSETS = [
  './',
  'index.html',
  'index-v5.html',
  'garden-painting.html',
  'garden-planner-v5.html',
  'garden-doctor-v5.html',
  'how-it-thinks-v5.html',
  'gos-bed.js',
  'gos-suitability.js',
  'data/mom-garden-data.json',
  'data/mom-garden-data.js',
  'journal.html',
  'garden-planner-v4.html',
  'garden-painting.html',
  'garden-doctor-v5.html',
  'how-it-thinks-v5.html',
  'garden-os-theme.css',
  'gos-bed.js',
  'gos-journal.js',
  'specs/CROP_SCORING_DATA.json',
  'vendor/react-18.3.1.production.min.js',
  'vendor/react-dom-18.3.1.production.min.js',
  'vendor/babel-standalone-7.29.0.min.js',
  'garden-league-simulator-v4.html',
  'garden-doctor.html',
  'garden-cage-build-guide.html',
  'garden-cage-ops-guide.html',
  'how-it-thinks.html',
  'brand-guide.html',
  'scoring-visualizer.html',
  'scoring-map.html',
  'fairness-tester.html',
  'system-map.html',
  'system-topology.html',
  'manifest.json',
  'assets/icons/favicon/favicon.svg',
  'assets/icons/favicon/android-chrome-192.png',
  'assets/icons/favicon/android-chrome-512.png',
  'assets/icons/favicon/apple-touch-icon.png'
];

// ── Install: precache core assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k.startsWith('garden-os-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: strategy per request type ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin except Google Fonts
  if (event.request.method !== 'GET') return;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;

  // Google Fonts: cache-first (fonts rarely change)
  if (isFont) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML navigation: network-first, cache fallback
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('index.html');
        });
      })
    );
    return;
  }

  // All other assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
