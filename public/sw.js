/* Luna Wave service worker: app shell, read-only offline cache, push alerts. */
const VERSION = "v1";
const STATIC = `lw-static-${VERSION}`;
const PAGES = `lw-pages-${VERSION}`;
const API = `lw-api-${VERSION}`;
const SHELL = ["/offline.html", "/logo.png", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, PAGES, API]);
      for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

// The page asks us to forget cached data on sign-out so the next person on a shared device sees nothing.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear-user-data") {
    event.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(API)]));
  }
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok && !res.redirected) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // never cache sign-in, session or cron endpoints
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/me") || url.pathname.startsWith("/api/cron")) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      networkFirst(req, API).catch(() => new Response(JSON.stringify({ error: "You're offline" }), { status: 503, headers: { "content-type": "application/json" } })),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, PAGES).catch(async () => (await caches.match("/offline.html")) || Response.error()));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/geo/") || url.pathname === "/logo.png") {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone(); // clone before the page starts reading the body
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Luna Wave", body: "You have a new alert", url: "/colleges" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/colleges";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) await c.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
