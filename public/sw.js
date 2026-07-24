// Minimal service worker - just pass all requests through to the network
// Avoid caching to prevent hydration mismatches
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // For all requests, just fetch from network without caching
  // This prevents stale cache issues that cause hydration mismatches
  if (event.request.method === "GET") {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If network fails, return a minimal offline page instead of cached content
        if (event.request.mode === "navigate") {
          return new Response("Offline - please check your connection", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ "Content-Type": "text/plain" }),
          });
        }
        throw new Error("Network unavailable");
      })
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
