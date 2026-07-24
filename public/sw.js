const CACHE_VERSION = "venture-app-v4";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline";
const OFFLINE_SAVED_URL = "/offline/saved";

const PRECACHE = [
  "/",
  OFFLINE_URL,
  OFFLINE_SAVED_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png"
];

function isPrivateOrUnsafe(url) {
  return (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/profile") ||
    url.pathname.startsWith("/saved") ||
    url.pathname.startsWith("/newsletter/confirm") ||
    url.pathname.startsWith("/newsletter/unsubscribe")
  );
}

function isStaticAsset(request, url) {
  return (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image" ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("venture-") &&
                key !== SHELL_CACHE &&
                key !== RUNTIME_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (
    url.origin !== self.location.origin ||
    isPrivateOrUnsafe(url)
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches
              .open(RUNTIME_CACHE)
              .then((cache) =>
                cache.put(request, copy)
              );
          }

          return response;
        })
        .catch(async () => {
          const cached =
            await caches.match(request);

          return cached ||
            caches.match(OFFLINE_URL);
        })
    );

    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches
                .open(RUNTIME_CACHE)
                .then((cache) =>
                  cache.put(request, copy)
                );
            }

            return response;
          })
          .catch(() => cached);

        return cached || network;
      })
    );
  }
});
