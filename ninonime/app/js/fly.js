// NinoNime · modul anime/fly (dipecah dari anime.js)
import { $$ } from "./ui.js";
import { aHref } from "./lib.js";

/* --- Animasi sampul berpindah (daftar ↔ info anime) ---
   Sampul yang diketuk "terbang" ke poster besar di info anime; saat kembali, poster terbang lagi ke sampul YANG DIKETUK
   (bukan sampul lain berjudul sama, mis. di Terakhir Ditonton / 10 Hot Anime).
   Bayangan terbang = kotak berisi <img> asli (object-fit: cover): ukuran kotak, sudut, bayangan, potongan gambar
   (object-position) dan zoom gambar (transform) berubah halus dari bentuk asal ke bentuk tujuan, jadi gambar tidak
   pernah gepeng walau bentuknya berbeda (poster tegak → kartu lebar). Di akhir memudar ke sampul aslinya. */

// potret sebuah sampul: posisi, bentuk, dan cara gambarnya dipotong
export function shot(cv) {
  const r = cv.getBoundingClientRect(), img = cv.querySelector("img"), c = getComputedStyle(cv), ci = img && getComputedStyle(img);
  return { r, rad: c.borderRadius || "12px", shadow: c.boxShadow && c.boxShadow !== "none" ? c.boxShadow : "0 0 0 0 rgba(0,0,0,0)",
    src: img?.currentSrc || img?.src || "", pos: ci?.objectPosition || "50% 50%", tf: ci && ci.transform && ci.transform !== "none" ? ci.transform : "matrix(1, 0, 0, 1, 0, 0)" };
}
const idOf = (a) => Number((a.getAttribute("href") || "").split("/").pop());

let morph = null, tapped = null;   // tapped: sampul yang terakhir diketuk (tujuan saat kembali)
export function rememberCover(cv) {
  if (!cv) return;
  morph = { ...shot(cv), at: Date.now() };
  const a = cv.closest('a[href^="#/anime/"]'); tapped = a ? { id: idOf(a), el: cv } : null;
}
document.addEventListener("click", (e) => {
  const a = e.target.closest?.('a[href^="#/anime/"]'); if (!a || a.closest(".tc") || e.defaultPrevented) return;
  rememberCover(a.querySelector(".cover"));
}, true);

// sampul yang sedang terbang: tujuan (dan pengganti tujuan bila halaman digambar ulang) disembunyikan sampai mendarat
let flight = null;
export function adoptFly(el) { if (!flight || !el || flight.hide.has(el)) return; el.style.visibility = "hidden"; flight.hide.add(el); }
export function fly(from, toEl, dur = 460) {
  if (!toEl || !from?.r || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  flight?.done(true);
  const to = shot(toEl), a = from.r, b = to.r; if (!b.width || !a.width) return;
  const src = to.src || from.src; if (!src) return;
  const g = document.createElement("div"); g.className = "fly";
  const img = document.createElement("img"); img.alt = ""; img.decoding = "sync"; img.src = src; g.append(img);
  document.body.append(g);
  toEl.style.visibility = "hidden";
  const f = { hide: new Set([toEl]), done: () => {} }; flight = f;
  const ease = "cubic-bezier(.32,.72,0,1)";
  const box = (r, s) => ({ left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: s.rad, boxShadow: s.shadow });
  const k = g.animate([box(a, from), box(b, to)], { duration: dur, easing: ease, fill: "forwards" });
  img.animate([{ objectPosition: from.pos || "50% 50%", transform: from.tf || "none" }, { objectPosition: to.pos, transform: to.tf }], { duration: dur, easing: ease, fill: "forwards" });
  // mendarat: sampul asli muncul di bawahnya, bayangan terbang memudar singkat (tanpa loncatan di frame terakhir)
  const done = f.done = (now) => {
    if (f.end) return; f.end = true;
    f.hide.forEach((e) => { e.style.visibility = ""; }); if (flight === f) flight = null;
    if (now) { g.remove(); return; }
    g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-out", fill: "forwards" }).onfinish = () => g.remove();
    setTimeout(() => g.remove(), 400);
  };
  k.onfinish = () => done(); setTimeout(() => done(), dur + 250);
}

// dipakai detail.js: ambil niat "terbang" sekali pakai, dan catat poster yang ditinggalkan
export const takeMorph = () => { const m = morph && Date.now() - morph.at < 1500 ? morph : null; morph = null; return m; };
let backFly = null;   // poster info anime saat ditinggalkan → sampul di daftar
export const setBackFly = (v) => { backFly = v; };
const onScreen = (c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(c).visibility !== "hidden"; };
export function flyBack(view) {
  if (!backFly || Date.now() - backFly.at > 1500) { backFly = null; return; }
  const b = backFly; backFly = null;
  // 1) sampul yang tadi diketuk (halaman daftar disimpan utuh, jadi elemennya masih sama)
  let el = tapped && tapped.id === b.id && tapped.el.isConnected && view.contains(tapped.el) ? tapped.el : null;
  // 2) halaman digambar ulang (mis. Favorit): sampul berjudul sama yang terlihat
  if (!el) el = $$(`a[href="${aHref(b.id)}"] .cover`, view).find(onScreen) || null;
  if (el && onScreen(el)) fly(b, el, 440);
}
