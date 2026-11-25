// Garden OS — Service Worker
// Strategy: network-first for HTML, cache-first for fonts, stale-while-revalidate for assets
//
// CACHE_VERSION: the Pages deploy (.github/workflows/pages.yml, "Stamp service
// worker cache version") rewrites this line with the deploy date and commit
// SHA, so every deploy gets a new cache and activate purges the old one. The
// value below is only what a local checkout or an unstamped preview uses.
const CACHE_VERSION = '2026-11-25-h5-unstamped';
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
  'gos-time.js',
  'gos-experiments.js',
  'gos-suitability-core.js',
  'gos-suitability.js',
  'data/mom-garden-data.json',
  'data/mom-garden-data.js',
  'journal.html',
  'garden-os-theme.css',
  'garden-theme.js',
  'garden-pwa.js',
  'garden-theme-compat.css',
  'gos-journal.js',
  'specs/CROP_SCORING_DATA.json',
  'vendor/react-18.3.1.production.min.js',
  'vendor/react-dom-18.3.1.production.min.js',
  'vendor/babel-standalone-7.29.0.min.js',
  'story-mode/',
  'garden-cage-build-guide.html',
  'garden-cage-ops-guide.html',
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

// Documents a navigation may fall back to when the network fails, per area.
// Story Mode must never fall back to the planner's index.html (H5).
const STORY_PREFIX = 'story-mode/';
const STORY_FALLBACKS = ['story-mode/', 'story-mode/index.html'];
const SITE_FALLBACKS = ['index.html', './'];

function scopePath() {
  return new URL('./', self.location.href).pathname;
}

/** Path of `url` relative to this worker's directory ('' for the root). */
function relativePath(url) {
  const base = scopePath();
  const path = new URL(url, self.location.href).pathname;
  return path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, '');
}

/** Ordered cache keys to try for an offline navigation to `url`. */
function navigationFallbacks(url) {
  const rel = relativePath(url);
  if (rel === 'story-mode' || rel.startsWith(STORY_PREFIX)) return STORY_FALLBACKS;
  const keys = [];
  if (rel && !rel.endsWith('/') && !/\.[a-z0-9]+$/i.test(rel)) keys.push(rel + '.html');
  if (rel.endsWith('/')) keys.push(rel + 'index.html');
  return keys.concat(SITE_FALLBACKS);
}

function isStoryPath(url) {
  const rel = relativePath(url);
  return rel === 'story-mode' || rel.startsWith(STORY_PREFIX);
}

function offlineStoryResponse() {
  const body = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Garden OS Story Mode</title>'
    + '<body style="font:16px/1.5 system-ui,sans-serif;background:#171b16;color:#f7f2ea;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center">'
    + '<main><h1 style="font-size:22px">Story Mode is offline</h1>'
    + '<p>Connect once so Story Mode can load, then it works offline.</p>'
    + '<button onclick="location.reload()" style="font:inherit;padding:10px 20px;border-radius:999px;min-height:44px">Try again</button></main>';
  return new Response(body, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function matchFirst(keys) {
  for (const key of keys) {
    const hit = await caches.match(key, { ignoreSearch: true });
    if (hit) return hit;
  }
  return undefined;
}

async function navigationFallback(request) {
  const exact = await caches.match(request, { ignoreSearch: true });
  if (exact) return exact;
  const hit = await matchFirst(navigationFallbacks(request.url));
  if (hit) return hit;
  return isStoryPath(request.url) ? offlineStoryResponse() : Response.error();
}

function putInCache(request, response) {
  // A full or closed cache must not surface as an unhandled rejection.
  return caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, response))
    .catch(() => {});
}

// ── Install: precache core assets ──
// One asset at a time and best effort: a single 404 or network blip used to
// fail the all-or-nothing addAll and leave the worker uninstalled (H5).
async function precache() {
  const cache = await caches.open(CACHE_NAME);
  const results = await Promise.allSettled(CORE_ASSETS.map(async (asset) => {
    const response = await fetch(new Request(asset, { cache: 'reload' }));
    if (!response.ok) throw new Error(asset + ' ' + response.status);
    await cache.put(asset, response);
  }));
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    console.warn('[Garden OS] Precache skipped', failed.length, 'asset(s):', failed.map((r) => r.reason?.message ?? r.reason));
  }
  return { cached: results.length - failed.length, failed: failed.length };
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precache()
      .catch((error) => console.warn('[Garden OS] Precache failed:', error))
      .then(() => self.skipWaiting())
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
          if (response.ok) putInCache(event.request, response.clone());
          return response;
        });
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML navigation: network-first, cache fallback for the same area
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) putInCache(event.request, response.clone());
        return response;
      }).catch(() => navigationFallback(event.request))
    );
    return;
  }

  // All other assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) putInCache(event.request, response.clone());
        return response;
      }).catch(() => cached || Response.error());

      return cached || fetchPromise;
    })
  );
});
