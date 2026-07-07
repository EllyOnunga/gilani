// GilaniAI Service Worker — v2.2.1
// Bump CACHE_NAME when you release a new version (npm version patch/minor/major)
// Strategy:
//  - Navigation requests (HTML pages) → always pass through to the SSR server (never intercept)
//  - Static assets in /assets/* → cache-first with network fallback
//  - PWA files (icons, manifest) → cache-first with network fallback
//  - Everything else → network-only (pass through)

const CACHE_NAME = "gilaniai-v2.2.1";

const STATIC_ASSETS = [
  "/favicon.png", // was /favicon.svg
  "/gilanilogo.png",
  "/manifest.json",
  "/icon-192.png",
  "/icon-192-maskable.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
];

// ── Install: pre-cache only known static PWA assets ──────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            /* skip failures */
          }),
        ),
      );
    }),
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: smart routing ──────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // 2. Skip non-GET requests (POST, etc.)
  if (request.method !== "GET") return;

  // 3. CRITICAL for SSR: Never intercept navigation (document) requests.
  //    These must always hit the Vercel SSR server so the HTML is fresh.
  if (request.mode === "navigate") return;

  // 4. Skip TanStack server-fn and API routes entirely
  if (url.pathname.startsWith("/_server") || url.pathname.startsWith("/api/")) return;

  // 5. For hashed static assets (/assets/*): cache-first strategy
  //    Vite hashes filenames so these are safe to cache indefinitely.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => new Response("Asset not available offline.", { status: 503 }));
      }),
    );
    return;
  }

  // 6. For known PWA static files (icons, manifest, etc.): cache-first
  const isStaticPWAFile = STATIC_ASSETS.some((a) => url.pathname === a);
  if (isStaticPWAFile) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => new Response("File not available offline.", { status: 503 }));
      }),
    );
    return;
  }

  // 7. Everything else → pass through to network (no SW interception)
});

// ── Web Push: receive notification ───────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "GilaniAI",
      body: event.data ? event.data.text() : "You have a new notification.",
    };
  }

  const title = data.title || "GilaniAI";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192-maskable.png",
    tag: data.tag || "gilani-notification",
    data: { url: data.url || "/" },
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Web Push: notification click → open app ──────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if already open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
