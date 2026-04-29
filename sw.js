const CACHE_VERSION = 'alex-runner-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './alex_detoure.png',
  './nut_nut.mp3',
  './je_m-apelle-moumede.mp3',
  './ouais_mamouaselle.mp3',
  './oulala_moumed.mp3',
  './deception_pour_le_joueur_fr.mp3',
  './icons/icon-64.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

const FIREBASE_MODULES = [
  'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll([...APP_ASSETS, ...FIREBASE_MODULES]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => ![STATIC_CACHE, RUNTIME_CACHE].includes(name))
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET' || request.headers.has('range')) {
    return;
  }

  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate';
  const isSameOrigin = url.origin === self.location.origin;
  const isFirebaseModule = url.origin === 'https://www.gstatic.com' && url.pathname.includes('/firebasejs/');

  if (isNavigation) {
    event.respondWith(networkFirst(request, STATIC_CACHE, './index.html'));
    return;
  }

  if (isSameOrigin || isFirebaseModule) {
    const targetCache = isSameOrigin ? STATIC_CACHE : RUNTIME_CACHE;
    event.respondWith(staleWhileRevalidate(request, targetCache));
  }
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    const fallbackResponse = await cache.match(fallbackUrl);
    if (fallbackResponse) {
      return fallbackResponse;
    }
    return new Response('Offline', {
      status: 503,
      statusText: 'Offline'
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response('Offline', {
    status: 503,
    statusText: 'Offline'
  });
}