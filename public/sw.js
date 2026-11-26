/* Service worker for eFootball League Manager.
 *
 * Deliberately minimal. League data changes all the time and pages are personalised, so this
 * NEVER caches pages or data. Its only job is to show a friendly "you are offline" screen when
 * the network is down (and to make the app installable). Bump VERSION to refresh the cache.
 */
const VERSION = "v1";
const CACHE = "efl-offline-" + VERSION;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("efl-offline-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only page navigations. Everything else (API calls, images, server actions) goes straight to the network.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
    })
  );
});
