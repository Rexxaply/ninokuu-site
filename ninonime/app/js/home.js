// NinoNime · modul anime/home (dipecah dari anime.js)
import { esc, icon, $, $$, toast } from "./ui.js";
import { DAYS, MONTHS } from "./const.js";
import { A, hhmm, scheduleFor, uniq, wibNow } from "./data.js";
import { rememberCover } from "./fly.js";
import { aHref, acard, acv, errHtml, fmtScore, hist, skCards } from "./lib.js";


// --- Top 10: carousel melingkar. Kartu tengah lebih besar (mahkota + bingkai emas), kiri/kanan mengecil & redup.
// Bergeser sendiri tiap 3,5 dtk (berhenti saat disentuh / di luar layar), bisa digeser jari, dan berputar terus.
const CROWN = `<svg class="t10-crown" viewBox="0 0 64 52" aria-hidden="true"><defs><linearGradient id="crG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A3"/><stop offset=".55" stop-color="#F2B33D"/><stop offset="1" stop-color="#B9771A"/></linearGradient></defs>
<path d="M6 40 2 12l16 12L32 4l14 20 16-12-4 28Z" fill="url(#crG)" stroke="#7A4A0E" stroke-width="2.4" stroke-linejoin="round"/>
<rect x="5" y="39" width="54" height="9" rx="3" fill="url(#crG)" stroke="#7A4A0E" stroke-width="2.4"/>
<circle cx="32" cy="27" r="4.2" fill="#E0242B" stroke="#7A0E12" stroke-width="1.4"/><circle cx="17" cy="31" r="3" fill="#5AA9FF" stroke="#13406E" stroke-width="1.2"/><circle cx="47" cy="31" r="3" fill="#5DD39E" stroke="#12603E" stroke-width="1.2"/>
<circle cx="2" cy="12" r="3" fill="#FFE9A3" stroke="#7A4A0E" stroke-width="1.6"/><circle cx="32" cy="4" r="3.4" fill="#FFE9A3" stroke="#7A4A0E" stroke-width="1.6"/><circle cx="62" cy="12" r="3" fill="#FFE9A3" stroke="#7A4A0E" stroke-width="1.6"/></svg>`;

/* Top 10: carousel tengah seperti Ninokuu Manga (kartu ikut jari, meluncur ke kartu terdekat, parallax sampul,
   berputar tanpa ujung) + tetap berganti otomatis tiap 3,5 detik (berhenti sebentar setelah disentuh). */
function carousel(root, list, extraCleanup) {
  const n = list.length;
  root.innerHTML = list.map((a, i) => { const sc = Number(a.score);
    return `<a class="cf-card ${i < 3 ? "r" + (i + 1) : ""}" href="${aHref(a.id)}" aria-label="Peringkat ${i + 1}: ${esc(a.title)}">
      ${i === 0 ? `<span class="cf-crown">${CROWN}</span>` : ""}<span class="cf-in">${acv(a.cover, a.title, "cf")}<span class="cf-shade"></span>
      <span class="cf-rank" aria-hidden="true">${i + 1}</span>${fmtScore(a.score) ? `<span class="cv-score">${icon("star", 10, 2)}${fmtScore(a.score)}</span>` : ""}
      <span class="cf-info"><b class="cf-t">${esc(a.title)}</b>${sc > 0 ? `<span class="cf-stars" style="--p:${Math.round(sc * 10)}%" aria-hidden="true">★★★★★</span>` : `<span class="cf-sub">${esc(a.type || "")}</span>`}</span></span></a>`; }).join("");
  const box = root, cards = [...box.querySelectorAll(".cf-card")], loop = n >= 4 ? n : 0;
  box.classList.add("cfx");
  const short = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let step = 0, pos = 0, on = null, anim = 0, drag = null, moved = false, timer = 0, hidden = false, pauseUntil = 0;
  const pics = cards.map((c) => c.querySelector(".cf-in .cover img")), PX = short ? 0 : 0.08;
  const measure = () => { step = (cards[0].offsetWidth || 200) + 10; };
  const off = (k) => { let d = k - pos; if (loop) { d = ((d % n) + n) % n; if (d > n / 2) d -= n; } return d; };
  const tick = () => {
    if (!step) measure();
    for (let k = 0; k < n; k++) {
      const el = cards[k], d = off(k), a = Math.abs(d);
      if (a > 2.6) { if (el.style.visibility !== "hidden") el.style.visibility = "hidden"; continue; }
      el.style.visibility = "";
      const m = Math.min(1, a);
      el.style.transform = `translate3d(${(d * step).toFixed(2)}px,0,0) scale(${(1 - m * 0.15).toFixed(4)})`;
      el.style.opacity = (1 - m * 0.5).toFixed(3); el.style.zIndex = String(10 - Math.round(a * 2));
      const pic = pics[k]; if (pic && PX) pic.style.transform = `translate3d(${(-Math.max(-1.3, Math.min(1.3, d)) * PX * (step - 10)).toFixed(1)}px,0,0) scale(1.24)`;
    }
    const i = loop ? ((Math.round(pos) % n) + n) % n : Math.max(0, Math.min(n - 1, Math.round(pos)));
    const best = cards[i];
    if (best !== on) { on?.classList.remove("on"); best.classList.add("on"); on = best; const lab = $("#tcN"); if (lab) lab.textContent = `#${i + 1} dari ${n}`; }
  };
  const norm = () => { if (loop) pos = ((pos % n) + n) % n; };
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const glide = (to) => {
    cancelAnimationFrame(anim);
    if (!loop) to = Math.max(0, Math.min(n - 1, to));
    const from = pos, dist = to - from;
    if (Math.abs(dist) < 0.002) { pos = to; norm(); tick(); return; }
    const t0 = performance.now(), dur = short ? 140 : Math.min(620, Math.max(300, 420 * Math.min(1.6, Math.abs(dist))));
    const frame = (t) => { const k = Math.min(1, (t - t0) / dur); pos = from + dist * ease(k); tick(); if (k < 1) anim = requestAnimationFrame(frame); else { anim = 0; pos = to; norm(); tick(); } };
    anim = requestAnimationFrame(frame);
  };
  const hold = () => { pauseUntil = performance.now() + 6000; };   // disentuh: pergantian otomatis menunggu dulu
  const start = (x, y) => { cancelAnimationFrame(anim); anim = 0; drag = { x, y, p: pos, h: false, v: false, pts: [[x, performance.now()]] }; moved = false; hold(); };
  const move = (x, y, e) => {
    if (!drag || drag.v) return;
    const dx = x - drag.x, dy = y - drag.y;
    if (!drag.h) {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      if (Math.abs(dx) < Math.abs(dy) * 0.85) { drag.v = true; return; }
      drag.h = true; moved = true; drag.x = x; drag.p = pos;
    }
    if (e?.cancelable) e.preventDefault();
    let p = drag.p - (x - drag.x) / step;
    if (!loop) p = p < 0 ? p / 3 : p > n - 1 ? n - 1 + (p - n + 1) / 3 : p;
    pos = p; tick();
    drag.pts.push([x, performance.now()]); if (drag.pts.length > 6) drag.pts.shift();
  };
  const release = () => {
    if (!drag) return;
    const d = drag; drag = null; hold();
    if (!d.h) { if (anim === 0 && pos !== Math.round(pos)) glide(Math.round(pos)); return; }
    const [a, b] = [d.pts[0], d.pts[d.pts.length - 1]], v = (b[0] - a[0]) / Math.max(1, b[1] - a[1]);
    let i = Math.abs(v) > 0.35 ? (v < 0 ? Math.floor(pos) + 1 : Math.ceil(pos) - 1) : Math.round(pos);
    if (Math.abs(v) > 1.4) i += v < 0 ? 1 : -1;
    glide(i);
  };
  box.addEventListener("touchstart", (e) => { if (e.touches.length !== 1) { drag = null; return; } const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
  box.addEventListener("touchmove", (e) => { if (e.touches.length !== 1) return; const t = e.touches[0]; move(t.clientX, t.clientY, e); }, { passive: false });
  box.addEventListener("touchend", release); box.addEventListener("touchcancel", release);
  box.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button > 0) return; start(e.clientX, e.clientY); try { box.setPointerCapture(e.pointerId); } catch {} });
  box.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") move(e.clientX, e.clientY, e); });
  box.addEventListener("pointerup", (e) => { if (e.pointerType === "mouse") release(); });
  box.addEventListener("dragstart", (e) => e.preventDefault());
  box.addEventListener("click", (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
    const c = e.target.closest(".cf-card"); if (!c) return;
    if (c.classList.contains("on")) { rememberCover(c.querySelector(".tc-cv") || c.querySelector(".cover")); return; }
    e.preventDefault(); hold(); glide(pos + Math.round(off(cards.indexOf(c))));
  });
  const onResize = () => { if (!box.isConnected) return; measure(); tick(); };
  addEventListener("resize", onResize, { passive: true });
  // berganti otomatis: hanya saat terlihat di layar, aplikasi terbuka, dan tidak sedang disentuh
  timer = setInterval(() => { if (!hidden && box.offsetParent && !drag && !anim && document.visibilityState === "visible" && performance.now() > pauseUntil) glide(Math.round(pos) + 1); }, 3500);
  const io = new IntersectionObserver((es) => { hidden = !es[0].isIntersecting; }, { threshold: 0.3 });
  io.observe(box);
  measure(); tick();
  return () => { clearInterval(timer); cancelAnimationFrame(anim); io.disconnect(); removeEventListener("resize", onResize); extraCleanup?.(); };
}

// --- Beranda anime ---
// "Terakhir Ditonton": baris geser (gambar lebar, label episode, garis progres, judul) + "Lihat Lainnya" → Riwayat.
// Digambar ulang saat kembali ke Beranda (riwayat bisa berubah karena menonton).
const resumeHtml = () => {
  const list = hist().slice(0, 12); if (!list.length) return "";
  return `<section class="sec s16 nox"><div class="sec-h px"><h2>Terakhir Ditonton</h2><a class="more-pill" href="#/favorit?tab=hist">Lihat Lainnya${icon("chev", 15, 2.4)}</a></div>
  <div class="hs lw-row">${list.map((h, i) => { const p = h.dur ? Math.max(3, Math.min(100, Math.round((h.t / h.dur) * 100))) : 0;
    return `<a class="lw" href="${aHref(h.id)}" style="--i:${i}"><span class="lw-th">${acv(h.cover, h.title, "lw-cv")}<span class="lw-shade"></span><b class="lw-ep">Eps ${esc(h.ep ?? "?")}</b></span>
      <span class="lw-bar"><i style="width:${p}%"></i></span><span class="lw-t">${esc(h.title)}</span></a>`; }).join("")}</div></section>`;
};

export async function vHome(view, x) {
  const wn = wibNow();
  view.innerHTML = `
<header class="top"><span class="an-logo"><img class="logo nn-logo" src="icons/logo.png" alt="NinoNime" width="147" height="34"></span>
  <span class="top-r">${x.topRight || ""}</span></header>
<section class="hello"><h1>Mau nonton apa <span class="gold">hari ini</span>?</h1><span class="mu sm">${DAYS[wn.day]}, ${wn.date.getUTCDate()} ${MONTHS[wn.date.getUTCMonth()]} · jam tayang dalam WIB</span></section>
<div id="resumeBox">${resumeHtml()}</div>
<section class="sec s24 nox"><div class="sec-h px"><h2>Tayang hari ini</h2><a class="link-red" href="#/jadwal">Lihat jadwal</a></div><div class="hs an-today" id="today">${`<span class="an-tm"><span class="sk an-tm-sk"></span></span>`.repeat(4)}</div></section>
<section class="sec s26 nox"><div class="sec-h px"><h2>10 Hot Anime</h2><span class="mu sm" id="tcN"></span></div><div class="cf" id="atop"><div class="cf-sk sk"></div><div class="cf-sk sk"></div><div class="cf-sk sk"></div></div></section>
<section class="sec s26"><div class="sec-h"><h2>Musim ini</h2><span class="mu sm" id="seasonN"></span></div><div id="season">${skCards(6)}</div>
  <button class="more-auto" id="aMore" hidden><span class="spin-s" aria-hidden="true"></span>Memuat lainnya…</button></section>
<div class="pad-nav"></div>`;
  let page = 1, items = [], next = false, busy = false;
  const loadSeason = async (more) => {
    if (busy) return; busy = true;
    try {
      const r = await A.now(page);
      items = more ? uniq(items.concat(r.items)) : r.items; next = r.next;
      if (!x.alive() || !$("#season")) return;
      $("#season").innerHTML = items.length ? `<div class="an-grid">${items.map((a, i) => acard(a, more ? 0 : i)).join("")}</div>` : `<div class="empty"><b>Belum ada data</b></div>`;
      $("#aMore").hidden = !next;
    } catch (e) { if (more) { page--; toast(e.message); } else if ($("#season")) $("#season").innerHTML = errHtml(e); }
    finally { busy = false; }
  };
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && next && !busy) { page++; loadSeason(true); } }, { rootMargin: "500px" });
  io.observe($("#aMore"));
  x.setCleanup(() => io.disconnect());
  x.setActs({ retry: () => vHome(view, x), ...x.topActs });
  x.setReturn?.(() => { const el = $("#resumeBox", view); if (el) { const v = resumeHtml(); if (el.innerHTML !== v) el.innerHTML = v; } });
  x.refreshDots?.();
  const loadToday = async () => {
    try {
      const list = await scheduleFor(wn.day), el = $("#today"); if (!el) return;
      const up = list.filter((a) => a.slot.min >= wn.min - 30);
      const show = (up.length ? up : list).slice(0, 12);
      el.innerHTML = show.length ? show.map((a, i) => `<a class="an-tm" href="${aHref(a.id)}" style="--i:${i}">${acv(a.cover, a.title)}<span class="an-tm-t"><b>${hhmm(a.slot.min)}</b>${a.slot.min <= wn.min ? `<i class="live">Tayang</i>` : ""}</span><span class="t2 b13">${esc(a.title)}</span></a>`).join("") : `<span class="mu sm px">Tidak ada jadwal tayang hari ini</span>`;
    } catch (e) { const el = $("#today"); if (el) el.innerHTML = `<span class="mu sm px">${esc(e.message)}</span>`; }
  };
  const loadTop = async () => {
    try {
      const list = (await A.hot()).slice(0, 10), el = $("#atop"); if (!el || !list.length) return;
      x.setCleanup(carousel(el, list, () => io.disconnect()));
    } catch (e) { const el = $("#atop"); if (el) el.innerHTML = `<span class="mu sm px">${esc(e.message)}</span>`; }
  };
  // berurutan (bukan bersamaan): Jikan membatasi jumlah permintaan per detik
  await loadToday(); await loadTop(); await loadSeason(false);
}

