// FadFada Service Worker
// Strategy: Network-first for HTML/API, Cache-first for static assets
// This prevents hydration mismatches while enabling offline support

const CACHE_NAME = "fadfada-static-v1";
const OFFLINE_CACHE = "fadfada-offline-v1";

// Static assets that can be safely cached (never change per-deployment)
const STATIC_ASSETS = [
  "/icon.svg",
  "/avatars/",
  "/icons/",
];

// Assets to pre-cache on install (app shell)
const APP_SHELL_ASSETS = [
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch(() => undefined);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Strategy 1: Cache-first for static assets (avatars, icons, fonts, images)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Strategy 2: Network-first for HTML pages (prevents hydration mismatch)
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Strategy 3: Network-first for API and dynamic requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // Strategy 4: Stale-while-revalidate for JS/CSS chunks
  if (isJsOrCss(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  // Default: Network-first with offline fallback
  event.respondWith(networkFirstWithOfflineFallback(request));
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/avatars/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".gif") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff")
  );
}

function isJsOrCss(url) {
  return (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.includes("/_next/static/")
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 408, statusText: "Offline" });
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // For navigation requests, return a minimal offline page
    if (request.mode === "navigate") {
      const offlineResponse = await caches.match("/offline");
      if (offlineResponse) return offlineResponse;

      return new Response(
        `<!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>فضفضة - بدون اتصال</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #0E0D10;
              color: #F7F3EC;
              font-family: "Cairo", sans-serif;
              text-align: center;
              padding: 2rem;
            }
            .container { max-width: 400px; }
            .icon { font-size: 4rem; margin-bottom: 1.5rem; }
            h1 { font-size: 1.5rem; margin: 0 0 0.75rem; color: #C9A86A; }
            p { font-size: 0.875rem; color: rgba(247,243,236,0.6); line-height: 1.6; }
            .retry {
              margin-top: 1.5rem;
              padding: 0.75rem 2rem;
              border: 1px solid rgba(201,168,106,0.35);
              border-radius: 9999px;
              background: rgba(201,168,106,0.1);
              color: #C9A86A;
              font-size: 0.875rem;
              font-weight: 600;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🌍</div>
            <h1>بدون اتصال</h1>
            <p>يبدو أنك غير متصل بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.</p>
            <button class="retry" onclick="window.location.reload()">إعادة المحاولة</button>
          </div>
        </body>
        </html>`,
        {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }
    throw new Error("Network unavailable");
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "CACHE_URLS") {
    const urlsToCache = event.data.urls || [];
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => undefined);
    });
  }
});
