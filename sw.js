const CACHE_PREFIX = 'nanhe-kadam-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest', './sw.js',
  './src/core/storage.js', './src/core/clock.js', './src/core/state.js', './src/core/environment.js',
  './src/parent/pin.js', './src/parent/data.js', './src/parent/vault.js', './src/ai/gemini.js', './src/speech/speech.js', './src/session/engine.js', './src/session/lock.js', './src/session/schedule.js',
  './src/activities/activities.js', './src/revision/spaced.js', './src/family/media.js', './assets/character-sparrow.svg', './assets/character-rabbit.svg', './assets/character-tortoise.svg', './assets/character-calf.svg',
  './src/ui/app.js', './src/ui/styles.css',
  './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable-512.png'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  // Deliberately do not call skipWaiting here; updates wait until parent approval.
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'APPLY_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin + '/')) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (!response.ok) return response;
    const copy = response.clone();
    return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).then(() => response).catch(() => response);
  }).catch(() => request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});

