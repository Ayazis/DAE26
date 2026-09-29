// Offline support: precache the app shell, then code (html/css/js) is network-first so updates arrive on the next load and never mix versions; images and fonts are cache-first.
const CACHE = "dae26-v16";
const SHELL = ["./", "index.html", "styles.css", "app.js", "analytics.js", "data.js", "plan.js", "plan.jpg",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !fonts) return; // exhibitor pages etc. go straight to the network
  const code = same && (req.mode === "navigate" || /\.(js|css|html)$/.test(url.pathname) || url.pathname.endsWith("/"));
  if (code) {
    e.respondWith(caches.open(CACHE).then(async c => {
      try { const res = await fetch(req, {cache: "no-cache"}); if (res.ok) c.put(req, res.clone()); return res; }
      catch { return (await c.match(req, {ignoreSearch: true})) || (await c.match("index.html")) || Response.error(); }
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, {ignoreSearch: same});
    const fresh = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; });
    if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh.catch(() => req.mode === "navigate" ? c.match("index.html") : Response.error());
  }));
});
