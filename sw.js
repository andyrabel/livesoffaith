/* ============================================================
   Lives of Faith — Service Worker
   Makes the site installable and usable offline.

   Caching strategy:
     - App shell (HTML pages, CSS, JS, header logo, icons):
       precached on install, served network-first for HTML so
       daily content stays fresh, stale-while-revalidate for
       CSS/JS.
     - data/*.json: stale-while-revalidate — instant from cache,
       refreshed in the background, still works fully offline.
     - Portrait images: cache-first with a capped cache.
     - Cross-origin requests (Google Analytics, Leaflet/OSM tiles
       on the map page): passed straight through, never touched.

   Bump CACHE_VERSION on any change to the precached shell.
   ============================================================ */
const CACHE_VERSION = 'v1';
const PRECACHE = `laf-precache-${CACHE_VERSION}`;
const RUNTIME = `laf-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `laf-images-${CACHE_VERSION}`;
const IMAGE_CACHE_MAX = 120;

// Core app shell — every page a visitor can reach directly, plus
// the assets they all share. Kept deliberately small; content data
// and portraits are cached at runtime as they are requested.
const SHELL = [
  'index.html',
  'people.html',
  'person.html',
  'hymns.html',
  'hymn.html',
  'connections.html',
  'timeline.html',
  'map.html',
  'quiz.html',
  'about.html',
  'css/style.css',
  'js/app.js',
  'js/consent.js',
  'js/pwa.js',
  'favicon.svg',
  'images/logos/livesoffaith_logo_128.png',
  'images/icons/icon-192.png',
  'images/icons/icon-512.png',
  'images/icons/maskable-192.png',
  'images/icons/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([PRECACHE, RUNTIME, IMAGE_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('laf-') && !keep.has(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Let the page tell a waiting worker to take over immediately.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length <= maxItems) return;
      cache.delete(keys[0]).then(() => trimCache(cacheName, maxItems));
    });
  });
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || network || fetch(request);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last resort for a navigation: the cached home page.
    const home = await caches.match('index.html');
    if (home) return home;
    throw err;
  }
}

async function cacheFirst(request, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
    if (maxItems) trimCache(cacheName, maxItems);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // GA, map tiles, etc.

  // HTML navigations — network-first so daily content is current.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PRECACHE));
    return;
  }

  if (url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME));
    return;
  }

  if (url.pathname.startsWith('/images/portraits/')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, IMAGE_CACHE_MAX));
    return;
  }

  if (/\.(css|js)$/.test(url.pathname) || url.pathname.startsWith('/images/')) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
