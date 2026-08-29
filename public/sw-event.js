const CACHE = "eventsliner-event-v1";

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/"])));
  (self as ServiceWorkerGlobalScope).skipWaiting();
});

self.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
  );
});

export {};
