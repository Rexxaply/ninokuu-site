// Bantuan tampilan kecil: escape HTML, ikon, toast, dialog konfirmasi.
import { ICONS } from "./icons.js";
export { ICONS };

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const icon = (name, size = 22, sw = 1.8) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let toastTimer = null;
export function toast(msg, ms = 2600) {
  const el = $("#toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

// dialog konfirmasi → Promise<boolean>
let askOpen = null;
export const closeAsk = () => { if (!askOpen) return false; askOpen(false); return true; };
export function ask(msg, { title = "", ok = "OK", cancel = "Batal", danger = false, html = "" } = {}) {
  closeAsk();
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.className = "ask-host";
    host.innerHTML = `<div class="ask-bg" data-a="no"></div><div class="ask glass" role="alertdialog" aria-modal="true">
      ${title ? `<b class="ask-ttl">${esc(title)}</b>` : ""}${html ? `<div class="ask-msg ask-html">${html}</div>` : msg ? `<p class="ask-msg">${esc(msg)}</p>` : ""}
      <div class="ask-acts">${cancel ? `<button class="ask-b" data-a="no">${esc(cancel)}</button>` : ""}<button class="ask-b ${danger ? "danger" : "ok"}" data-a="yes">${esc(ok)}</button></div></div>`;
    document.body.append(host);
    requestAnimationFrame(() => host.classList.add("on"));
    const finish = (v) => { askOpen = null; host.classList.remove("on"); host.classList.add("off"); setTimeout(() => host.remove(), 180); resolve(v); };
    host.addEventListener("click", (e) => { const a = e.target.closest("[data-a]")?.dataset.a; if (a) finish(a === "yes"); });
    askOpen = finish;
  });
}

/* ---------- Pilihan bersegmen (Koleksi/Riwayat, Semua/Ongoing/Tamat, jenis anime…) gaya iOS ----------
   Satu "jempol" (latar pilihan aktif) meluncur ke pilihan baru dengan pegas, bukan latar yang berpindah
   tiba-tiba. Ringan: hanya transform (dikerjakan GPU) + lebar 1 elemen kosong; tanpa pustaka.
   Berlaku otomatis untuk .seg, .fseg, .chips, juga yang digambar ulang (posisi lama diingat ±0,8 dtk). */
const SEG_SEL = ".seg, .fseg, .chips";
const SEG_ON = '[aria-selected="true"], [aria-checked="true"], [aria-pressed="true"]';
const segLast = new Map();
const segReduce = matchMedia("(prefers-reduced-motion: reduce)");
// kunci ingatan posisi jempol: aksi + jumlah pilihan + wadah ber-id terdekat. Wadah ikut dihitung karena satu layar
// bisa punya 2 pilihan kembar (Favorit: tab di judul & tab di bilah menempel) yang posisinya beda beberapa px;
// dulu keduanya berbagi ingatan, jadi jempol tab judul mulai dari posisi tab bilah → tampak "terlempar" ke tujuan.
const segKey = (el) => { const b = el.querySelector(":scope > button[data-act], :scope > button[data-f]"); return b ? `${b.dataset.act || b.dataset.f}|${el.querySelectorAll(":scope > button").length}|${el.parentElement?.closest("[id]")?.id || ""}` : ""; };
const segRo = "ResizeObserver" in window ? new ResizeObserver((es) => es.forEach((e) => placeSeg(e.target, false))) : null;
function placeSeg(el, anim) {
  const on = el.querySelector(`:scope > button:is(${SEG_ON})`);
  let th = el.querySelector(":scope > .seg-th");
  // belum terlihat (mis. di dalam menu yang tertutup): diawasi ResizeObserver, dipasang saat muncul
  // (posisi lama dilupakan, supaya saat muncul lagi jempol dipasang ulang & terlihat, bukan tetap tersembunyi)
  if (!on || !on.offsetWidth) { if (th) th.style.opacity = "0"; el._th = null; segRo?.observe(el); return; }
  if (!th) {
    th = document.createElement("span"); th.className = "seg-th no-tr"; th.setAttribute("aria-hidden", "true");
    el.prepend(th); el.classList.add("has-th"); segRo?.observe(el);
  }
  const k = segKey(el), saved = k ? segLast.get(k) : null;
  // daftar yang bisa digeser (chip): digambar ulang → posisi geser lama dipulihkan dulu (tidak melompat ke awal)
  if (!el._th && saved?.sl != null && saved.t > Date.now() - 800 && el.scrollWidth > el.clientWidth) el.scrollLeft = saved.sl;
  const box = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight };
  // ukuran berubah (layar diputar dll.): pindahkan tanpa animasi; panggilan tanpa perubahan diabaikan
  // (ResizeObserver memanggil sekali saat mulai diamati: jangan sampai memotong animasi yang sedang jalan)
  if (!anim && el._th && el._th.x === box.x && el._th.w === box.w && el._th.y === box.y && el._th.h === box.h) return;
  const prev = el._th || (anim && k && segLast.get(k)?.t > Date.now() - 800 ? segLast.get(k) : null);
  if (k) segLast.set(k, { ...box, sl: el.scrollLeft, t: Date.now() });
  // Lebar tidak dianimasikan (itu dikerjakan CPU dan tersendat bila halaman sedang memuat hasil):
  // ukuran akhir dipasang langsung, perbedaan lebar ditiru dengan scaleX → seluruh gerak murni transform (GPU).
  const set = (b) => { th.style.width = box.w + "px"; th.style.height = box.h + "px"; th.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) scaleX(${b.w / box.w})`; };
  th.style.borderRadius = getComputedStyle(on).borderRadius;
  if (anim && prev && !segReduce.matches && (prev.x !== box.x || prev.w !== box.w)) {
    // daftar baru (digambar ulang): tulisan pilihan baru ikut memudar ke warna aktif, bukan langsung berganti
    if (!el._th) { th.classList.add("no-tr"); on.classList.add("seg-pre"); set(prev); void th.offsetWidth; on.classList.remove("seg-pre"); }
    th.classList.remove("no-tr");
  } else th.classList.add("no-tr");
  set(box); th.style.opacity = "1";
  el._th = box;
  // pilihan aktif terpotong di tepi daftar yang bisa digeser → geser halus sampai terlihat penuh
  if (anim && el.scrollWidth > el.clientWidth) {
    const pad = 16, l = box.x - el.scrollLeft, r = l + box.w;
    if (l < 0 || r > el.clientWidth) el.scrollTo({ left: Math.max(0, l < 0 ? box.x - pad : box.x + box.w - el.clientWidth + pad), behavior: segReduce.matches ? "auto" : "smooth" });
  }
}
// dipasang langsung di callback MutationObserver (sebelum layar digambar), jadi tidak ada 1 frame tanpa jempol
// (sekali per daftar per callback, walau beberapa tombolnya berubah sekaligus)
const queueSeg = (el, anim) => { if (el?.isConnected) placeSeg(el, anim); };
new MutationObserver((ms) => {
  const todo = new Set();
  for (const m of ms) {
    if (m.type === "attributes") { const el = m.target.parentElement?.closest(SEG_SEL); if (el) todo.add(el); continue; }
    m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return; if (n.matches(SEG_SEL)) todo.add(n); n.querySelectorAll?.(SEG_SEL).forEach((x) => todo.add(x)); });
  }
  todo.forEach((el) => queueSeg(el, true));
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected", "aria-checked", "aria-pressed"] });
document.querySelectorAll(SEG_SEL).forEach((s) => queueSeg(s, false));
// ketukan pada pilihan: catat posisi jempol sekarang, supaya bila daftar digambar ulang, jempol meluncur dari sini
document.addEventListener("click", (e) => {
  const el = e.target.closest?.(SEG_SEL); if (!el || !el._th) return;
  const k = segKey(el); if (k) segLast.set(k, { ...el._th, sl: el.scrollLeft, t: Date.now() });
}, true);


/* ---------- Lembar pilihan (pengganti <select> bawaan Android/Chrome) ----------
   choose({ title, value, groups: [{ label, items: [{ v, label, sub, tag }] }] }) → Promise<nilai | null>
   Muncul dari bawah layar, dikelompokkan per judul, pilihan aktif bertanda bulat merah. Tutup: ketuk latar / tombol ✕ / Escape. */
let chooseOpen = null;
export const closeChoose = () => { if (!chooseOpen) return false; chooseOpen(null); return true; };
export function choose({ title = "", value = null, groups = [] } = {}) {
  closeChoose();
  return new Promise((resolve) => {
    const host = document.createElement("div"); host.className = "cs-host";
    host.innerHTML = `<div class="cs-bg" data-cs="x"></div><div class="cs" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <span class="cs-grab" aria-hidden="true"></span>
      <div class="cs-h"><b>${esc(title)}</b><button class="cs-x" data-cs="x" aria-label="Tutup">${icon("x", 20, 2.2)}</button></div>
      <div class="cs-list">${groups.map((g) => `${g.label ? `<div class="cs-g">${esc(g.label)}</div>` : ""}<div class="cs-card">${g.items.map((it) => { const on = String(it.v) === String(value);
        return `<button class="cs-it${on ? " on" : ""}" data-cs="v" data-v="${esc(it.v)}" role="radio" aria-checked="${on}"><span class="cs-l"><b>${esc(it.label)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ""}</span>${it.tag ? `<i class="cs-tag">${esc(it.tag)}</i>` : ""}<span class="cs-r" aria-hidden="true"></span></button>`; }).join("")}</div>`).join("")}</div></div>`;
    document.body.append(host);
    requestAnimationFrame(() => { host.classList.add("on"); host.querySelector(".cs-it.on")?.scrollIntoView({ block: "nearest" }); });
    const finish = (v) => { chooseOpen = null; host.classList.remove("on"); host.classList.add("off"); setTimeout(() => host.remove(), 260); resolve(v); };
    host.addEventListener("click", (e) => { const b = e.target.closest("[data-cs]"); if (!b) return; if (b.dataset.cs === "x") finish(null); else { host.querySelectorAll(".cs-it").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); }); setTimeout(() => finish(b.dataset.v), 140); } });
    // geser lembar ke bawah untuk menutup
    const sh = host.querySelector(".cs"); let y0 = null, dy = 0;
    sh.addEventListener("touchstart", (e) => { if (host.querySelector(".cs-list").scrollTop > 0 && !e.target.closest(".cs-h, .cs-grab")) return; y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    sh.addEventListener("touchmove", (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transition = "none"; sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
    sh.addEventListener("touchend", () => { if (y0 == null) return; y0 = null; sh.style.transition = ""; sh.style.transform = ""; if (dy > 90) finish(null); });
    chooseOpen = finish;
  });
}
addEventListener("keydown", (e) => { if (e.key === "Escape" && closeChoose()) e.stopImmediatePropagation(); }, true);
