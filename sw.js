// Service Worker: permite instalar la app y que funcione sin conexión.
// Estrategia "red primero, sin caché del navegador": siempre se pide la versión más reciente al servidor
// (cache: 'no-store' evita que la caché HTTP del navegador o del hosting devuelva una versión vieja).
// La copia guardada solo se usa si no hay conexión o si el servidor tarda más de 4 s en responder.
// Al publicar cambios no hace falta tocar nada; si quieres limpiar a la fuerza las copias viejas, sube el número de CACHE.
const CACHE = 'fiq-demolicion-v2';
const ESPERA_RED_MS = 4000;
const ARCHIVOS = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // add() uno a uno: si falta algún archivo (p. ej. un icono) no se rompe la instalación
      .then((c) => Promise.all(ARCHIVOS.map((a) => c.add(new Request(a, { cache: 'reload' })).catch(() => {}))))
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

async function redPrimero(req) {
  const red = fetch(req, { cache: 'no-store' }).then((resp) => {
    if (resp && resp.ok && new URL(req.url).origin === location.origin) {
      const copia = resp.clone();
      caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
    }
    return resp;
  });
  red.catch(() => {});   // evita avisos si la respuesta llega tarde y ya servimos la copia
  const copiaGuardada = async () =>
    (await caches.match(req, { ignoreSearch: true })) ||
    (req.mode === 'navigate' ? await caches.match('./index.html') : undefined);
  try {
    return await Promise.race([
      red,
      new Promise((_, no) => setTimeout(() => no(new Error('lento')), ESPERA_RED_MS)),
    ]);
  } catch (err) {
    const m = await copiaGuardada();
    if (m) return m;
    return red;   // sin copia: esperar a la red
  }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || !/^https?:$/.test(url.protocol)) return;
  e.respondWith(redPrimero(e.request));
});
