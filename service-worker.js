// Bump this release value when preparing a new app release.
const CACHE_PREFIX = "resettable-app-";
const CACHE_NAME = `${CACHE_PREFIX}v1.11.1`;
const SCOPE_URL = new URL(self.registration.scope);
const SHELL_URL = new URL("./index.html", SCOPE_URL).href;

// Keep this offline shell in step with local files referenced by index.html.
const CORE_FILES = [
  "index.html",
  "styles.css",
  "script.js?v=mobile-interface-v2",
  "manifest.webmanifest",
  "assets/resettable-future-logo.png",
  "assets/hero-desktop.jpg",
  "assets/hero-tablet.jpg",
  "assets/hero-mobile.jpg",
  "assets/home-card.jpg",
  "assets/outdoor-card.jpg",
  "assets/workspaces-card.jpg",
  "assets/icons/icon-192-v3.png",
  "assets/icons/icon-512-v3.png",
  "assets/icons/apple-touch-icon-v3.png"
];
const CORE_URLS = CORE_FILES.map(path => new URL(path, SCOPE_URL).href);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  const scopePath = SCOPE_URL.pathname;

  if (request.method !== "GET"
      || requestUrl.origin !== self.location.origin
      || !requestUrl.pathname.startsWith(scopePath)) return;

  const isNavigation = request.mode === "navigate";
  const isAppCode = /\.(?:html|css|js|webmanifest)$/.test(requestUrl.pathname);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (isNavigation || isAppCode) {
      try {
        // Revalidate app code and page markup instead of trusting the browser HTTP cache.
        const response = await fetch(request, { cache: "no-cache" });
        if (response.ok) {
          await cache.put(request, response.clone());
          return response;
        }
        const cachedResponse = await cache.match(request, { ignoreSearch: true });
        return cachedResponse || response;
      } catch {
        const cachedResponse = await cache.match(request, { ignoreSearch: true });
        if (cachedResponse) return cachedResponse;
        if (isNavigation) {
          const appShell = await cache.match(SHELL_URL);
          if (appShell) return appShell;
        }
        return new Response("This Resettable app file is not available offline yet.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    }

    const cachedAsset = await cache.match(request, { ignoreSearch: true });
    if (cachedAsset) return cachedAsset;

    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return new Response("This Resettable app asset is not available offline yet.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
