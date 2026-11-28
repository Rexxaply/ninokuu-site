// NinoNime · pintu masuk: router (hash), render halaman, dan menyalakan modul lain.
// Bagian-bagiannya dipisah supaya perubahan satu halaman tidak merusak yang lain:
//   shell.js (bersama) · gate.js (gerbang keypass) · auth.js (masuk/daftar/lupa) · akun.js (halaman Akun)
//   navbar.js (bar bawah) · keyboard.js (keyboard layar) · anime.js (beranda, jadwal, cari, detail, pemutar, admin)
import { initKeyboard } from "./keyboard.js";
import * as api from "./api.js";
import * as AN from "./anime.js";
import { icon, $$, closeAsk } from "./ui.js";
import { view, go, goReplace, setActs, setRender, topbar, loading } from "./shell.js";
import { TABS, setActiveTab } from "./navbar.js";
import { gate, OPEN } from "./gate.js";
import { vAkun } from "./akun.js";
import { vPage } from "./pages.js";

/* ---------- router ---------- */
// #/home  #/jadwal  #/cari  #/favorit  #/akun  #/anime/<id>  #/admin  #/p/<halaman> (turunan Akun)
let route = { name: "home", params: [] }, prevName = "home", cleanup = null, navDepth = 0, ownScroll = false, returning = false;
const scrollMem = new Map();
const DEPTH = { home: 0, jadwal: 0, cari: 0, favorit: 0, akun: 0, anime: 1, admin: 1, p: 1 };
const parse = () => { const p = (location.hash.replace(/^#\/?/, "").split("?")[0] || "home").split("/").map(decodeURIComponent); return { name: p[0], params: p.slice(1) }; };
const back = (fallback = "#/home") => (navDepth > 0 ? history.back() : goReplace(fallback));
const ctx = () => ({
  topbar, setActs, go, back, loading, setCleanup: (f) => { cleanup = f; },
  // halaman yang mengatur gulirnya sendiri (Jadwal): router tidak memulihkan posisi; savedY = posisi terakhir bila kembali dari halaman turunan
  keepScroll: () => { ownScroll = true; }, savedY: returning ? scrollMem.get(route.name + route.params.join("/")) || 0 : 0,
  topRight: `<a class="gl-btn" href="#/cari" aria-label="Cari">${icon("search", 20)}</a><a class="gl-btn" href="#/akun" aria-label="Akun">${icon("user", 20)}</a>`,
});

// tautan dari bot WhatsApp: #/home?kp=NK-XXXX-XXXX-XXXX → simpan (dipakai kartu keypass), lalu bersihkan alamat
{ const kp = (location.hash.match(/[?&]kp=([A-Za-z0-9-]+)/) || [])[1]; if (kp) { api.lsSet("pendingKp", kp.toUpperCase()); history.replaceState(null, "", location.pathname + location.search + "#/home"); } }

/* ---------- render ---------- */
const VIEWS = {
  home: () => AN.vHome(view, ctx()).then(() => AN.flyBack(view)),
  jadwal: () => AN.vJadwal(view, ctx()).then(() => AN.flyBack(view)),
  cari: () => AN.vSearch(view, ctx()).then(() => AN.flyBack(view)),
  favorit: () => AN.vFav(view, ctx()).then(() => AN.flyBack(view)),
  anime: (id) => AN.vDetail(view, ctx(), id),
  akun: vAkun,
  admin: () => AN.vKeypassAdmin(view, ctx()),
  p: (name) => vPage(name),
};
async function render() {
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  closeAsk();
  scrollMem.set(route.name + route.params.join("/"), window.scrollY);
  route = parse();
  if (!VIEWS[route.name]) { goReplace("#/home"); return; }
  const depth = DEPTH[route.name] ?? 0, prevDepth = DEPTH[prevName] ?? 0;
  navDepth = depth > 0 ? navDepth + (prevDepth < depth ? 1 : 0) : 0;
  const fwd = depth !== prevDepth ? depth > prevDepth : TABS.indexOf(route.name) >= TABS.indexOf(prevName);
  returning = prevDepth > depth; ownScroll = false;
  prevName = route.name;
  document.body.dataset.screen = route.name;
  const authOnly = !api.currentUser();   // belum masuk: halaman login murni, tanpa bar bawah
  document.body.classList.toggle("nav-off", authOnly || !TABS.includes(route.name));
  document.body.classList.toggle("is-auth", authOnly);
  setActiveTab(route.name);
  view.classList.remove("in", "in-f", "in-b"); view.innerHTML = "";
  const job = !OPEN.has(route.name) && !AN.hasAccess() ? (gate(), null) : VIEWS[route.name](...route.params);
  void view.offsetWidth; view.classList.add("in", fwd ? "in-f" : "in-b");
  await job;
  if (ownScroll) return;
  const y = scrollMem.get(route.name + route.params.join("/"));
  requestAnimationFrame(() => window.scrollTo(0, y || 0));
}
setRender(render);
window.addEventListener("hashchange", render);

/* ---------- menyalakan ---------- */
initKeyboard();   // keyboard layar (logika sama dengan Ninokuu)

// tombol kembali browser/HP saat pemutar penuh → kecilkan pemutar dulu
addEventListener("keydown", (e) => { if (e.key === "Escape" && (AN.closeKeypass() || AN.player.onBack())) e.preventDefault(); });

api.onAuth((s) => { if (!s) render(); });
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
render();
// akses dicek ulang ke server tiap aplikasi dibuka (keypass bisa dicabut admin)
if (api.userId()) AN.loadAccess().then(() => { if (!AN.hasAccess() && !OPEN.has(route.name)) render(); }).catch(() => {});
