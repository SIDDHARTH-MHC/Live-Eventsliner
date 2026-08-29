const CACHE = "eventsliner-event-v2";
const TICKET_CACHE = "eventsliner-ticket";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/app", "/discover"]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_TICKET" && event.data.url) {
    event.waitUntil(
      caches.open(TICKET_CACHE).then((cache) => cache.add(event.data.url)),
    );
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/v1/tickets/")) {
    event.respondWith(
      caches.open(TICKET_CACHE).then((cache) =>
        cache.match(event.request).then((cached) =>
          cached ??
          fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }),
        ),
      ),
    );
    return;
  }

  if (url.pathname.startsWith("/e/") && url.pathname.includes("/app")) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
