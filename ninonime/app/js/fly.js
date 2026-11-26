// NinoNime · modul anime/fly (dipecah dari anime.js)
import { $, $$ } from "./ui.js";
import { aHref } from "./lib.js";

// --- Animasi sampul berpindah (daftar ↔ info anime) ---
// Sampul yang diketuk "terbang" ke poster besar di info anime; saat kembali, poster terbang lagi ke sampulnya.
let morph = null;
export function rememberCover(cv) {
  if (!cv) return;
  const r = cv.getBoundingClientRect(), img = cv.querySelector("img");
  morph = { r, src: img?.currentSrc || img?.src || "", at: Date.now() };
}
document.addEventListener("click", (e) => {
  const a = e.target.closest?.('a[href^="#/anime/"]'); if (!a || a.closest(".tc")) return;
  rememberCover(a.querySelector(".cover"));
}, true);
export function fly(from, toEl, src, dur = 420) {
  if (!toEl || !from || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const to = toEl.getBoundingClientRect(); if (!to.width) return;
  const g = document.createElement("div"); g.className = "fly";
  g.style.cssText = `left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px;background-image:url("${String(src).replace(/"/g, "%22")}")`;
  document.body.append(g);
  toEl.style.visibility = "hidden";
  const k = g.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, borderRadius: "10px" }, { transform: "none", borderRadius: getComputedStyle(toEl).borderRadius }],
    { duration: dur, easing: "cubic-bezier(.2,.8,.2,1)" });
  const done = () => { toEl.style.visibility = ""; g.remove(); };
  k.onfinish = done; setTimeout(done, dur + 200);
}
// dipakai detail.js: ambil niat "terbang" sekali pakai, dan catat poster yang ditinggalkan
export const takeMorph = () => { const m = morph && Date.now() - morph.at < 1500 ? morph : null; morph = null; return m; };
let backFly = null;   // poster info anime saat ditinggalkan → sampul di daftar
export const setBackFly = (v) => { backFly = v; };
export function flyBack(view) {
  if (!backFly || Date.now() - backFly.at > 1500) { backFly = null; return; }
  const b = backFly; backFly = null;
  const el = $$(`a[href="${aHref(b.id)}"] .cover`, view).find((c) => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
  if (el) fly(b.r, el, b.src, 380);
}

