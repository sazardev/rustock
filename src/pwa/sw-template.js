/**
 * Service worker de Rustock — plantilla.
 *
 * No se sirve tal cual: el plugin `rustock-pwa` de `vite.config.ts` la
 * materializa en `dist/sw.js` sustituyendo los dos marcadores de abajo por la
 * versión de `package.json` y por la lista real de artefactos del arranque.
 * En desarrollo no se registra ningún worker.
 *
 * Reglas del sistema:
 *  - El API del backend Rust vive en otro origen (`127.0.0.1:1421`): el
 *    worker nunca lo intercepta ni lo cachea. Los datos de negocio siempre
 *    vienen del backend en vivo (STACK.md).
 *  - Solo se precachea el shell de arranque (HTML, JS/CSS de entrada, fuentes
 *    e iconos). Los fragmentos de cada ruta se guardan la primera vez que se
 *    visitan: instalar la app no descarga la aplicación entera.
 *  - Una versión nueva nunca se activa sola: espera a que la persona lo
 *    acepte (mensaje `SKIP_WAITING`), para no recargar la app a mitad de un
 *    movimiento sin guardar.
 */
const VERSION = "__RUSTOCK_VERSION__";
const CACHE = `rustock-shell-${VERSION}`;
const PRECACHE = __RUSTOCK_PRECACHE__;
const SHELL = "/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // `reload` evita que el propio caché HTTP del navegador sirva una copia
      // vieja del shell al precachear.
      cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres
          .filter((n) => n.startsWith("rustock-shell-") && n !== CACHE)
          .map((n) => caches.delete(n)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/** ¿Es un artefacto inmutable del build (nombre con hash) o un recurso estático? */
function esEstatico(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    /\.(?:woff2?|png|svg|ico|webmanifest)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: red primero (para ver despliegues nuevos al instante), shell
  // cacheado como red de seguridad cuando no hay conexión.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) return preload;
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(SHELL)) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Estáticos con hash: caché primero — son inmutables, así que la app
  // arranca sin tocar la red.
  if (esEstatico(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const guardado = await cache.match(request);
        if (guardado) return guardado;
        const respuesta = await fetch(request);
        if (respuesta.ok && respuesta.type === "basic") {
          cache.put(request, respuesta.clone());
        }
        return respuesta;
      })(),
    );
  }
});
