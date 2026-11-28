// NinoNime · kontrol pemutar kustom untuk <video> (MP4/HLS).
// Tata letak (juga di layar penuh):
//   atas   : kecilkan · "▷ Ep N - Judul" · resolusi (HD) · daftar episode · layar penuh
//   tengah : episode sebelumnya · mundur 5 dtk · putar/jeda · maju 5 dtk · episode berikutnya
//   bawah  : kecepatan (1.0x) · waktu · garis waktu (intro emas, ending abu) · durasi
// - Ketuk video: tampil/sembunyi (hilang sendiri 3 dtk saat diputar; garis waktu ikut hilang).
// - Ketuk dua kali sisi kiri/kanan: ∓5 detik. "Lewati intro" muncul selama intro.
// - Ending: dilewati otomatis bila diaktifkan (selain itu tombol "Lewati ending"), lalu hitung mundur 5 dtk ke
//   episode berikutnya bila "Episode berikutnya otomatis" aktif.
// - Panel di dalam video (tetap tampil di layar penuh): Pilih Resolusi, Kecepatan, Pilih Episode.
import * as api from "./api.js";
import { esc, icon, $ } from "./ui.js";

export const PREF_DEF = { speed: 1, autoEnd: true, autoNext: true };
export const prefs = () => ({ ...PREF_DEF, ...(api.lsGet("playerPrefs") || {}) });
export const setPref = (k, v) => api.lsSet("playerPrefs", { ...prefs(), [k]: v });
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export const speedName = (v) => (Number(v) % 1 ? `${Number(v)}x` : `${Number(v).toFixed(1)}x`);   // 1 → "1.0x", 1.25 → "1.25x"

const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${String(m).padStart(2, "0")}:${x}`; };
const jump = (dir, n = 26) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  ${dir < 0 ? `<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 3.5v4h4"/>` : `<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M20 3.5v4h-4"/>`}
  <text x="12" y="15.6" text-anchor="middle" font-size="8.6" font-weight="800" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">5</text></svg>`;
const skipI = (dir) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" ${dir < 0 ? 'style="transform:scaleX(-1)"' : ""}><path d="M6 5.5v13l9.5-6.5z"/><rect x="16.5" y="5.5" width="2.4" height="13" rx="1"/></svg>`;

export function mountControls(box, vid, o) {
  // o: { intro, endingFromEnd, title(), hasPrev(), hasNext(), onPrev(), onNext(), onMin(), onFs(),
  //      res() → { cur, items:[{ v, label, tag }] }, onRes(v), eps() → { cur, n }, onEp(n), onError() }
  const el = document.createElement("div"); el.className = "vc on";
  el.innerHTML = `<div class="vc-tap" aria-hidden="true"></div>
  <span class="vc-rip l" aria-hidden="true">${jump(-1, 34)}<b>−5 detik</b></span><span class="vc-rip r" aria-hidden="true">${jump(1, 34)}<b>+5 detik</b></span>
  <div class="vc-top">
    <button class="vc-i" data-v="min" aria-label="Kecilkan">${icon("minim", 22, 2.2)}</button>
    <span class="vc-ttl">${icon("play", 13, 2.4)}<b></b></span>
    <button class="vc-i vc-hd" data-v="res" aria-label="Pilih resolusi"><i>HD</i></button>
    <button class="vc-i" data-v="eps" aria-label="Pilih episode">${icon("list", 20, 2.2)}</button>
    <button class="vc-i" data-v="fs" aria-label="Layar penuh">${icon("fs", 19, 2.2)}</button>
  </div>
  <div class="vc-mid">
    <button class="vc-b sm" data-v="prev" aria-label="Episode sebelumnya">${skipI(-1)}</button>
    <button class="vc-b" data-v="back" aria-label="Mundur 5 detik">${jump(-1)}</button>
    <button class="vc-b vc-pp" data-v="pp" aria-label="Putar / jeda">${icon("pause", 28, 2.4)}</button>
    <button class="vc-b" data-v="fwd" aria-label="Maju 5 detik">${jump(1)}</button>
    <button class="vc-b sm" data-v="next" aria-label="Episode berikutnya">${skipI(1)}</button>
  </div>
  <span class="vc-spin" aria-hidden="true"></span>
  <button class="vc-skip" data-v="skipIntro" hidden>${jump(1, 18)}Lewati intro</button>
  <button class="vc-skip" data-v="skipEnd" hidden>${skipI(1)}Lewati ending</button>
  <div class="vc-bot">
    <button class="vc-sp" data-v="speed" aria-label="Kecepatan putar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4.6 17a8.5 8.5 0 1 1 14.8 0"/><path d="m12 13 4-5"/></svg><b></b></button>
    <span class="vc-t">00:00</span>
    <div class="vc-seek" role="slider" aria-label="Posisi video" tabindex="0"><span class="vc-track"><i class="vc-buf"></i><i class="vc-in"></i><i class="vc-en"></i><i class="vc-fill"></i></span><span class="vc-knob"></span></div>
    <span class="vc-d">00:00</span>
  </div>
  <div class="vc-next" hidden><span class="vc-nt">Episode berikutnya dalam <b>5</b></span>
    <span class="vc-nb"><button class="vc-np" data-v="nextNow">${icon("play", 15, 2.4)}Putar sekarang</button><button class="vc-nc" data-v="cancelNext">Batal</button></span></div>
  <div class="vc-pn" hidden role="dialog"></div>`;
  box.append(el);
  const q = (s) => $(s, el);
  const ppB = q(".vc-pp"), fill = q(".vc-fill"), knob = q(".vc-knob"), buf = q(".vc-buf"), tEl = q(".vc-t"), dEl = q(".vc-d"), seek = q(".vc-seek"), pn = q(".vc-pn");
  const skipIn = q('[data-v="skipIntro"]'), skipEnd = q('[data-v="skipEnd"]'), nextBox = q(".vc-next"), nextN = q(".vc-nt b");
  const intro = o.intro || null;
  let hideT = 0, scrub = null, cd = 0, cdLeft = 0, endDone = false, introDone = false;

  const endStart = () => (vid.duration && o.endingFromEnd ? Math.max(0, vid.duration - o.endingFromEnd) : Infinity);
  const show = (stay) => { el.classList.add("on"); clearTimeout(hideT); if (!stay && !vid.paused) hideT = setTimeout(() => { if (!scrub && !vid.paused && pn.hidden) el.classList.remove("on"); }, 3000); };
  const hide = () => { clearTimeout(hideT); if (!vid.paused && pn.hidden) el.classList.remove("on"); };
  const pct = (t) => (vid.duration ? Math.min(100, Math.max(0, (t / vid.duration) * 100)) : 0);
  const paint = (t = vid.currentTime) => { const p = pct(t); fill.style.width = p + "%"; knob.style.left = p + "%"; tEl.textContent = fmt(t); seek.setAttribute("aria-valuetext", `${fmt(t)} dari ${fmt(vid.duration)}`); };
  const marks = () => {
    dEl.textContent = fmt(vid.duration);
    const im = q(".vc-in"), em = q(".vc-en");
    if (intro && vid.duration) { im.style.left = pct(intro[0]) + "%"; im.style.width = pct(intro[1]) - pct(intro[0]) + "%"; } else im.style.width = "0";
    if (isFinite(endStart())) { em.style.left = pct(endStart()) + "%"; em.style.width = 100 - pct(endStart()) + "%"; } else em.style.width = "0";
  };
  // label yang bergantung pada keadaan: judul, resolusi, kecepatan, tombol episode
  const labels = () => {
    q(".vc-ttl b").textContent = o.title?.() || "";
    const r = o.res?.(); q(".vc-hd i").textContent = r?.items.find((x) => String(x.v) === String(r.cur))?.tag || "HD";
    q(".vc-sp b").textContent = speedName(prefs().speed);
    q('[data-v="prev"]').disabled = !o.hasPrev?.(); q('[data-v="next"]').disabled = !o.hasNext?.();
  };
  const syncPP = () => { ppB.innerHTML = icon(vid.paused ? "play" : "pause", 28, 2.4); el.classList.toggle("paused", vid.paused); if (vid.paused) show(true); else show(); };
  const go = (dt) => { if (!vid.duration) return; vid.currentTime = Math.min(vid.duration - 0.2, Math.max(0, vid.currentTime + dt)); paint(); };

  // panel di dalam video
  const closePn = () => { pn.hidden = true; pn.innerHTML = ""; el.classList.remove("pn-on"); show(); };
  const openPn = (title, ic, items, cur, onPick, kind = "chips") => {
    pn.innerHTML = `<div class="vc-pc ${kind}"><div class="vc-ph">${ic}<b>${esc(title)}</b><button class="vc-px" data-v="pnx" aria-label="Tutup">${icon("x", 18, 2.4)}</button></div>
      <div class="vc-pl">${items.map((it) => `<button class="vc-po${String(it.v) === String(cur) ? " on" : ""}" data-v="pick" data-k="${esc(it.v)}" aria-pressed="${String(it.v) === String(cur)}"><b>${esc(it.label)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ""}</button>`).join("")}</div></div>`;
    pn.hidden = false; el.classList.add("on", "pn-on"); clearTimeout(hideT);
    pn._pick = (k) => { closePn(); onPick(k); };
    pn.querySelector(".vc-po.on")?.scrollIntoView({ block: "nearest", inline: "center" });
  };

  // hitung mundur ke episode berikutnya
  const stopCd = () => { clearInterval(cd); cd = 0; nextBox.hidden = true; };
  const startCd = () => {
    if (!o.hasNext()) return;
    cdLeft = 5; nextN.textContent = cdLeft; nextBox.hidden = false; show(true);
    clearInterval(cd); cd = setInterval(() => { cdLeft--; nextN.textContent = Math.max(0, cdLeft); if (cdLeft <= 0) { stopCd(); o.onNext(); } }, 1000);
  };

  vid.addEventListener("loadedmetadata", () => { vid.playbackRate = prefs().speed; marks(); paint(); labels(); });
  vid.addEventListener("durationchange", marks);
  vid.addEventListener("play", syncPP); vid.addEventListener("pause", syncPP);
  vid.addEventListener("waiting", () => el.classList.add("load")); vid.addEventListener("playing", () => el.classList.remove("load")); vid.addEventListener("canplay", () => el.classList.remove("load"));
  vid.addEventListener("ratechange", () => { if (Math.abs(vid.playbackRate - prefs().speed) > 0.01) vid.playbackRate = prefs().speed; });
  vid.addEventListener("progress", () => { try { const b = vid.buffered; if (b.length && vid.duration) buf.style.width = (b.end(b.length - 1) / vid.duration) * 100 + "%"; } catch {} });
  vid.addEventListener("timeupdate", () => {
    const t = vid.currentTime; if (!scrub) paint(t);
    skipIn.hidden = !(intro && !introDone && t >= intro[0] && t < intro[1] - 1);
    const inEnd = t >= endStart() && t < vid.duration - 1;
    if (inEnd && prefs().autoEnd && !endDone) { endDone = true; vid.currentTime = vid.duration; if (!vid.paused) vid.pause(); vid.dispatchEvent(new Event("nn-end")); return; }
    skipEnd.hidden = !(inEnd && !prefs().autoEnd);
    if (t < endStart()) endDone = false;
  });
  const finished = () => { syncPP(); if (prefs().autoNext && o.hasNext()) startCd(); else show(true); };
  vid.addEventListener("ended", () => { if (!cd) finished(); });
  vid.addEventListener("nn-end", finished);
  vid.addEventListener("error", () => o.onError?.());

  // ketuk: tampil/sembunyi; ketuk dua kali di sisi kiri/kanan: ∓5 detik
  let lastTap = 0, tapT = 0;
  q(".vc-tap").addEventListener("click", (e) => {
    if (!pn.hidden) { closePn(); return; }
    const now = Date.now(), r = el.getBoundingClientRect(), side = e.clientX - r.left < r.width * 0.38 ? -1 : e.clientX - r.left > r.width * 0.62 ? 1 : 0;
    if (now - lastTap < 300 && side) {
      clearTimeout(tapT); lastTap = now; go(side * 5);
      const rp = q(side < 0 ? ".vc-rip.l" : ".vc-rip.r"); rp.classList.remove("go"); void rp.offsetWidth; rp.classList.add("go");
      return;
    }
    lastTap = now; clearTimeout(tapT);
    tapT = setTimeout(() => { el.classList.contains("on") ? hide() : show(); }, side ? 260 : 0);
  });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]"); if (!b || b.disabled) return;
    e.stopPropagation(); const v = b.dataset.v;
    if (v === "pp") { if (cd) stopCd(); vid.paused ? vid.play().catch(() => {}) : vid.pause(); }
    else if (v === "back") go(-5);
    else if (v === "fwd") go(5);
    else if (v === "prev") { stopCd(); o.onPrev(); }
    else if (v === "next") { stopCd(); o.onNext(); }
    else if (v === "min") o.onMin?.();
    else if (v === "fs") o.onFs?.();
    else if (v === "skipIntro" && intro) { introDone = true; vid.currentTime = intro[1]; skipIn.hidden = true; }
    else if (v === "skipEnd") { endDone = true; vid.currentTime = vid.duration; vid.dispatchEvent(new Event("nn-end")); }
    else if (v === "nextNow") { stopCd(); o.onNext(); }
    else if (v === "cancelNext") stopCd();
    else if (v === "res") { const r = o.res(); openPn("Pilih Resolusi", `<i class="vc-hdi">HD</i>`, r.items.map((x) => ({ v: x.v, label: x.label, sub: x.tag })), r.cur, (k) => o.onRes(k)); return; }
    else if (v === "speed") { openPn("Kecepatan", icon("clock", 16, 2.2), SPEEDS.map((x) => ({ v: x, label: x === 1 ? "Normal" : speedName(x) })), prefs().speed, (k) => { setPref("speed", Number(k)); vid.playbackRate = Number(k); labels(); o.onSpeed?.(); }); return; }
    else if (v === "eps") { const ep = o.eps(); openPn("Pilih Episode", icon("list", 16, 2.2), Array.from({ length: ep.n }, (_, i) => ({ v: i + 1, label: String(i + 1) })), ep.cur, (k) => o.onEp(Number(k)), "grid"); return; }
    else if (v === "pnx") { closePn(); return; }
    else if (v === "pick") { pn._pick?.(b.dataset.k); return; }
    show();
  });

  // garis waktu: geser untuk mencari posisi
  const at = (x) => { const r = seek.getBoundingClientRect(); return Math.min(1, Math.max(0, (x - r.left) / r.width)) * (vid.duration || 0); };
  seek.addEventListener("pointerdown", (e) => { if (!vid.duration) return; e.preventDefault(); e.stopPropagation(); scrub = { t: at(e.clientX) }; el.classList.add("scrub"); paint(scrub.t); show(true); try { seek.setPointerCapture(e.pointerId); } catch {} });
  seek.addEventListener("pointermove", (e) => { if (!scrub) return; scrub.t = at(e.clientX); paint(scrub.t); });
  const drop = () => { if (!scrub) return; vid.currentTime = scrub.t; if (intro && scrub.t >= intro[1]) introDone = true; scrub = null; el.classList.remove("scrub"); show(); };
  seek.addEventListener("pointerup", drop); seek.addEventListener("pointercancel", drop);
  seek.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(-5); else if (e.key === "ArrowRight") go(5); });

  labels(); show(true);
  return { el, labels, stopCd, closePanel: () => { if (pn.hidden) return false; closePn(); return true; }, destroy: () => { stopCd(); clearTimeout(hideT); clearTimeout(tapT); el.remove(); } };
}
