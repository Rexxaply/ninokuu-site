// NinoNime · kontrol pemutar kustom untuk <video> (MP4/HLS).
// - Ketuk video: tampil/sembunyikan kontrol (hilang sendiri 3 dtk saat diputar).
// - Ketuk dua kali sisi kiri/kanan, atau tombol ↺5 / 5↻: mundur/maju 5 detik.
// - Garis waktu bisa digeser; rentang intro (emas) dan ending (abu) ditandai.
// - "Lewati intro" muncul di rentang intro. Ending: dilewati otomatis bila diaktifkan, selain itu ada tombol "Lewati ending".
// - Selesai: hitung mundur 5 dtk ke episode berikutnya (bila "Episode berikutnya otomatis" aktif).
// Pengaturan (server, kecepatan, lewati ending, episode berikutnya) disimpan di HP: lsGet("playerPrefs").
import * as api from "./api.js";
import { icon, $ } from "./ui.js";

export const PREF_DEF = { speed: 1, autoEnd: true, autoNext: true };
export const prefs = () => ({ ...PREF_DEF, ...(api.lsGet("playerPrefs") || {}) });
export const setPref = (k, v) => api.lsSet("playerPrefs", { ...prefs(), [k]: v });
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; };
// ikon putar balik/maju dengan angka 5
const jump = (dir) => `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  ${dir < 0 ? `<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 3.5v4h4"/>` : `<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M20 3.5v4h-4"/>`}
  <text x="12" y="15.6" text-anchor="middle" font-size="8.6" font-weight="800" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">5</text></svg>`;

export function mountControls(box, vid, o) {
  // o: { intro:[a,b], endingFromEnd, hasNext(), onNext(), onError() }
  const el = document.createElement("div"); el.className = "vc on";
  el.innerHTML = `<div class="vc-tap" aria-hidden="true"></div>
  <span class="vc-rip l" aria-hidden="true">${jump(-1)}<b>−5 detik</b></span><span class="vc-rip r" aria-hidden="true">${jump(1)}<b>+5 detik</b></span>
  <div class="vc-mid"><button class="vc-b" data-v="back" aria-label="Mundur 5 detik">${jump(-1)}</button>
    <button class="vc-b vc-pp" data-v="pp" aria-label="Putar / jeda">${icon("pause", 30, 2.4)}</button>
    <button class="vc-b" data-v="fwd" aria-label="Maju 5 detik">${jump(1)}</button></div>
  <span class="vc-spin" aria-hidden="true"></span>
  <button class="vc-skip" data-v="skipIntro" hidden>Lewati intro ${icon("chev", 16, 2.6)}</button>
  <button class="vc-skip" data-v="skipEnd" hidden>Lewati ending ${icon("chev", 16, 2.6)}</button>
  <div class="vc-next" hidden><span class="vc-nt">Episode berikutnya dalam <b>5</b></span>
    <span class="vc-nb"><button class="vc-np" data-v="nextNow">${icon("play", 15, 2.4)}Putar sekarang</button><button class="vc-nc" data-v="cancelNext">Batal</button></span></div>
  <div class="vc-bot"><span class="vc-t">0:00</span>
    <div class="vc-seek" role="slider" aria-label="Posisi video" tabindex="0"><span class="vc-track"><i class="vc-buf"></i><i class="vc-in"></i><i class="vc-en"></i><i class="vc-fill"></i></span><span class="vc-knob"></span></div>
    <span class="vc-d">0:00</span></div>`;
  box.append(el);
  const q = (s) => $(s, el);
  const ppB = q(".vc-pp"), fill = q(".vc-fill"), knob = q(".vc-knob"), buf = q(".vc-buf"), tEl = q(".vc-t"), dEl = q(".vc-d"), seek = q(".vc-seek");
  const skipIn = q('[data-v="skipIntro"]'), skipEnd = q('[data-v="skipEnd"]'), nextBox = q(".vc-next"), nextN = q(".vc-nt b");
  const intro = o.intro || null;
  let hideT = 0, scrub = null, cd = 0, cdLeft = 0, endDone = false, introDone = false;

  const endStart = () => (vid.duration && o.endingFromEnd ? Math.max(0, vid.duration - o.endingFromEnd) : Infinity);
  const show = (stay) => { el.classList.add("on"); clearTimeout(hideT); if (!stay && !vid.paused) hideT = setTimeout(() => { if (!scrub && !vid.paused) el.classList.remove("on"); }, 3000); };
  const hide = () => { clearTimeout(hideT); if (!vid.paused) el.classList.remove("on"); };
  const pct = (t) => (vid.duration ? Math.min(100, Math.max(0, (t / vid.duration) * 100)) : 0);
  const paint = (t = vid.currentTime) => {
    const p = pct(t); fill.style.width = p + "%"; knob.style.left = p + "%";
    tEl.textContent = fmt(t); seek.setAttribute("aria-valuetext", `${fmt(t)} dari ${fmt(vid.duration)}`);
  };
  const marks = () => {
    dEl.textContent = fmt(vid.duration);
    const im = q(".vc-in"), em = q(".vc-en");
    if (intro && vid.duration) { im.style.left = pct(intro[0]) + "%"; im.style.width = pct(intro[1]) - pct(intro[0]) + "%"; } else im.style.width = "0";
    if (isFinite(endStart())) { em.style.left = pct(endStart()) + "%"; em.style.width = 100 - pct(endStart()) + "%"; } else em.style.width = "0";
  };
  const syncPP = () => { ppB.innerHTML = icon(vid.paused ? "play" : "pause", 30, 2.4); el.classList.toggle("paused", vid.paused); if (vid.paused) show(true); else show(); };
  const go = (dt) => { if (!vid.duration) return; vid.currentTime = Math.min(vid.duration - 0.2, Math.max(0, vid.currentTime + dt)); paint(); };

  // hitung mundur ke episode berikutnya
  const stopCd = () => { clearInterval(cd); cd = 0; nextBox.hidden = true; };
  const startCd = () => {
    if (!o.hasNext()) return;
    cdLeft = 5; nextN.textContent = cdLeft; nextBox.hidden = false; show(true);
    clearInterval(cd); cd = setInterval(() => { cdLeft--; nextN.textContent = Math.max(0, cdLeft); if (cdLeft <= 0) { stopCd(); o.onNext(); } }, 1000);
  };

  vid.addEventListener("loadedmetadata", () => { vid.playbackRate = prefs().speed; marks(); paint(); });
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
    const b = e.target.closest("[data-v]"); if (!b) return;
    e.stopPropagation(); const v = b.dataset.v;
    if (v === "pp") { if (cd) stopCd(); vid.paused ? vid.play().catch(() => {}) : vid.pause(); }
    else if (v === "back") go(-5);
    else if (v === "fwd") go(5);
    else if (v === "skipIntro" && intro) { introDone = true; vid.currentTime = intro[1]; skipIn.hidden = true; }
    else if (v === "skipEnd") { endDone = true; vid.currentTime = vid.duration; vid.dispatchEvent(new Event("nn-end")); }
    else if (v === "nextNow") { stopCd(); o.onNext(); }
    else if (v === "cancelNext") stopCd();
    show();
  });

  // garis waktu: geser untuk mencari posisi
  const at = (x) => { const r = seek.getBoundingClientRect(); return Math.min(1, Math.max(0, (x - r.left) / r.width)) * (vid.duration || 0); };
  seek.addEventListener("pointerdown", (e) => { if (!vid.duration) return; e.preventDefault(); e.stopPropagation(); scrub = { t: at(e.clientX) }; el.classList.add("scrub"); paint(scrub.t); show(true); try { seek.setPointerCapture(e.pointerId); } catch {} });
  seek.addEventListener("pointermove", (e) => { if (!scrub) return; scrub.t = at(e.clientX); paint(scrub.t); });
  const drop = () => { if (!scrub) return; vid.currentTime = scrub.t; if (intro && scrub.t >= intro[1]) introDone = true; scrub = null; el.classList.remove("scrub"); show(); };
  seek.addEventListener("pointerup", drop); seek.addEventListener("pointercancel", drop);
  seek.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(-5); else if (e.key === "ArrowRight") go(5); });

  show(true);
  return { el, stopCd, setSpeed: (s) => { vid.playbackRate = s; }, destroy: () => { stopCd(); clearTimeout(hideT); clearTimeout(tapT); el.remove(); } };
}
