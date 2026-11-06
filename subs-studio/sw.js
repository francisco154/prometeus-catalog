// Service worker v2 · NETWORK-FIRST para el shell: los cambios del estudio
// propagan al recargar (v1 era cache-first y servía código viejo para
// siempre); el cache queda como respaldo OFFLINE solamente.
const CACHE = 'substudio-v2';
const SHELL = ['./', 'index.html', 'app.js', 'style.css', 'i18n.js', 'srt.js',
  'tsdemux.js', 'audio.js', 'whisper.js', 'groq.js', 'penc1.js', 'github.js',
  'publish.js', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;      // red: tal cual
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copia = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia));
      return r;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
