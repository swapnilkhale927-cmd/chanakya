const CACHE = "chanakya-ui-v1";
const ASSETS = ["/", "/styles.css", "/app.js", "/icon.svg", "/manifest.webmanifest"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || e.request.url.includes("/api/")) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
