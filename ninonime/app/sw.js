// NinoNime service worker: kerangka aplikasi bisa dibuka offline. Naikkan VER tiap rilis.
const VER = "ninonime-0.1.9";
const SHELL = ["./", "index.html", "config.js", "manifest.webmanifest", "css/base.css", "css/anime.css", "css/app.css",
  "js/main.js", "js/shell.js", "js/gate.js", "js/auth.js", "js/akun.js", "js/navbar.js", "js/keyboard.js", "js/api.js", "js/ui.js", "js/icons.js", "js/anime.js", "js/const.js", "js/icons-anime.js", "js/data.js", "js/lib.js", "js/access.js", "js/home.js", "js/jadwal.js", "js/search.js", "js/fav.js", "js/fly.js", "js/detail.js", "js/player.js", "js/admin.js", "js/sources.js", "icons/logo.png", "icons/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VER).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("ninonime-") && k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // utamakan jaringan (selalu versi terbaru), cadangan dari cache saat offline
  e.respondWith(fetch(req, { cache: "no-cache" }).then((r) => { if (r.ok) caches.open(VER).then((c) => c.put(req, r.clone())); return r; })
    .catch(() => caches.match(req).then((m) => m || caches.match("index.html"))));
});
