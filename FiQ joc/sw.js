// Service Worker básico: permite instalar la app y que funcione sin conexión.
// Estrategia: red primero (así siempre ves la última versión) y, si no hay red, lo guardado en caché.
// Al publicar una versión nueva del juego, cambia el número de CACHE para limpiar la caché antigua.
const CACHE = 'fiq-demolicion-v1';
const ARCHIVOS = ['./', './index.html', './manifest.json', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // add() uno a uno: si falta algún archivo (p. ej. el icono) no se rompe la instalación
      .then((c) => Promise.all(ARCHIVOS.map((a) => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp && resp.ok && new URL(e.request.url).origin === location.origin) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('./index.html')))
  );
});
