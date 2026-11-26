// NinoNime · modul anime/home (dipecah dari anime.js)
import { esc, icon, $, $$, toast } from "./ui.js";
import { DAYS, MONTHS } from "./const.js";
import { A, hhmm, scheduleFor, uniq, wibNow } from "./data.js";
import { rememberCover } from "./fly.js";
import { aHref, acard, acv, errHtml, fmtScore, hist, skCards } from "./lib.js";


// --- Top 10: carousel melingkar. Kartu tengah lebih besar (mahkota + bingkai emas), kiri/kanan mengecil & redup.
// Bergeser sendiri tiap 3,5 dtk (berhenti saat disentuh / di luar layar), bisa digeser jari, dan berputar terus.
const CROWN_SVG = '<svg class="tc-crown" viewBox="0 0 64 44" aria-hidden="true"><defs><linearGradient id="tcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#E39B1B"/></linearGradient></defs><path d="M6 14l13 11L32 4l13 21 13-11-6 26H12z" fill="url(#tcg)" stroke="#8A5A0B" stroke-width="2" stroke-linejoin="round"/><circle cx="32" cy="29" r="4" fill="#E0242B"/></svg>';
function carousel(root, list, extraCleanup) {
  const n = list.length;
  let cur = 0, timer = 0, hidden = false, drag = null;
  root.innerHTML = `<div class="tc-track">${list.map((a, i) => `<a class="tc-it" href="${aHref(a.id)}" data-i="${i}" aria-label="Peringkat ${i + 1}: ${esc(a.title)}">
    <span class="tc-cv">${acv(a.cover, a.title)}<span class="tc-shade"></span><span class="tc-rank">${i + 1}</span>${fmtScore(a.score) ? `<span class="cv-score">${icon("star", 10, 2)}${fmtScore(a.score)}</span>` : ""}
      <span class="tc-cap"><b>${esc(a.title)}</b><span class="tc-stars" style="--s:${Math.max(0, Math.min(5, (Number(a.score) || 0) / 2)).toFixed(2)}" aria-label="Skor ${fmtScore(a.score) || "-"}"></span></span></span>${i === 0 ? CROWN_SVG : ""}</a>`).join("")}</div>
    <div class="tc-dots" aria-hidden="true">${list.map((_, i) => `<i data-i="${i}"></i>`).join("")}</div>`;
  const items = $$(".tc-it", root), dots = $$(".tc-dots i", root);
  // posisi relatif terhadap kartu tengah, dibungkus melingkar: -n/2 .. n/2
  const rel = (i, c) => { let d = (i - c) % n; if (d > n / 2) d -= n; if (d < -n / 2) d += n; return d; };
  let prev = null;
  const layout = (dx = 0) => {
    items.forEach((el, i) => {
      const d = rel(i, cur), was = prev ? rel(i, prev) : d;
      // kartu yang melompat dari ujung kiri ke ujung kanan (atau sebaliknya) dipindah tanpa animasi supaya tidak melintas
      el.style.transition = Math.abs(d - was) > 1.5 || drag ? "none" : "";
      el.style.setProperty("--d", d); el.style.setProperty("--dx", dx + "px");
      el.classList.toggle("on", d === 0); el.setAttribute("tabindex", Math.abs(d) <= 1 ? "0" : "-1");
      el.setAttribute("aria-hidden", String(Math.abs(d) > 2));
    });
    dots.forEach((dt, i) => dt.classList.toggle("on", i === cur));
    const crown = $(".tc-crown", root); if (crown && crown.parentElement !== items[cur]) items[cur].append(crown);
    const lab = $("#tcN"); if (lab) lab.textContent = `#${cur + 1} dari ${n}`;
    prev = cur;
  };
  const goTo = (c) => { cur = (c + n) % n; layout(); };
  const auto = () => { clearInterval(timer); timer = setInterval(() => { if (!hidden && !drag && document.visibilityState === "visible") goTo(cur + 1); }, 3500); };
  root.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, dx: 0, moved: false, id: e.pointerId }; });
  root.addEventListener("pointermove", (e) => {
    if (!drag) return; drag.dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(drag.dx) > 8 && Math.abs(drag.dx) > Math.abs(e.clientY - drag.y)) { drag.moved = true; try { root.setPointerCapture(drag.id); } catch {} }
    if (drag.moved) layout(drag.dx);
  });
  const up = () => {
    if (!drag) return; const d = drag; drag = null;
    if (d.moved) { root.dataset.justDragged = "1"; setTimeout(() => delete root.dataset.justDragged, 60); const step = Math.abs(d.dx) > 40 ? (d.dx < 0 ? 1 : -1) * Math.max(1, Math.round(Math.abs(d.dx) / 160)) : 0; goTo(cur + step); }
    auto();
  };
  root.addEventListener("pointerup", up); root.addEventListener("pointercancel", up);
  // ketuk kartu samping → kartu itu ke tengah (bukan langsung dibuka); kartu tengah → buka info anime
  root.addEventListener("click", (e) => {
    const a = e.target.closest(".tc-it"); if (!a) return;
    if (root.dataset.justDragged) { e.preventDefault(); return; }
    if (!a.classList.contains("on")) { e.preventDefault(); goTo(+a.dataset.i); auto(); }
    else rememberCover(a.querySelector(".cover"));
  });
  const io = new IntersectionObserver((es) => { hidden = !es[0].isIntersecting; }, { threshold: 0.3 });
  io.observe(root);
  layout(); auto();
  return () => { clearInterval(timer); io.disconnect(); extraCleanup?.(); };
}

// --- Beranda anime ---
export async function vHome(view, x) {
  const h = hist(), last = h[0];
  const wn = wibNow();
  view.innerHTML = `
<header class="top"><span class="an-logo"><img class="logo nn-logo" src="icons/logo.png" alt="NinoNime" width="147" height="34"></span>
  <span class="top-r">${x.topRight || ""}</span></header>
<section class="hello"><h1>Mau nonton apa <span class="gold">hari ini</span>?</h1><span class="mu sm">${DAYS[wn.day]}, ${wn.date.getUTCDate()} ${MONTHS[wn.date.getUTCMonth()]} · jam tayang dalam WIB</span></section>
${last ? `<section class="sec s16"><h2 class="cap">Lanjut nonton</h2>
  <a class="resume an-res" href="${aHref(last.id)}" data-act="resume">${acv(last.cover, last.title, "rs")}
    <span class="rc-mid g6"><span class="meta"><span class="tag-s">Episode ${esc(last.ep)}</span></span><span class="rs-t">${esc(last.title)}</span>
      <span class="mu sm">${last.dur ? `${hhmm(Math.floor(last.t / 60))} dari ${hhmm(Math.floor(last.dur / 60))}` : "Ketuk untuk lanjut"}</span>
      <span class="prog"><span style="width:${last.dur ? Math.max(4, Math.round((last.t / last.dur) * 100)) : 6}%"></span></span></span>
    <span class="play">${icon("play", 19, 2)}</span></a></section>` : ""}
<section class="sec s24 nox"><div class="sec-h px"><h2>Tayang hari ini</h2><a class="link-red" href="#/jadwal">Lihat jadwal</a></div><div class="hs an-today" id="today">${`<span class="an-tm"><span class="sk an-tm-sk"></span></span>`.repeat(4)}</div></section>
<section class="sec s26 nox"><div class="sec-h px"><h2>Top 10 sedang tayang</h2><span class="mu sm" id="tcN"></span></div><div class="tc" id="atop"><div class="tc-track"><span class="tc-it sk" style="--d:0"></span><span class="tc-it sk" style="--d:-1"></span><span class="tc-it sk" style="--d:1"></span></div></div></section>
<section class="sec s26"><div class="sec-h"><h2>Musim ini</h2><span class="mu sm" id="seasonN"></span></div><div id="season">${skCards(6)}</div>
  <button class="more-auto" id="aMore" hidden><span class="spin-s" aria-hidden="true"></span>Memuat lainnya…</button></section>
<div class="pad-nav"></div>`;
  let page = 1, items = [], next = false, busy = false;
  const loadSeason = async (more) => {
    if (busy) return; busy = true;
    try {
      const r = await A.now(page);
      items = more ? uniq(items.concat(r.items)) : r.items; next = r.next;
      if (!$("#season")) return;
      $("#season").innerHTML = items.length ? `<div class="an-grid">${items.map((a, i) => acard(a, more ? 0 : i)).join("")}</div>` : `<div class="empty"><b>Belum ada data</b></div>`;
      $("#aMore").hidden = !next;
    } catch (e) { if (more) { page--; toast(e.message); } else if ($("#season")) $("#season").innerHTML = errHtml(e); }
    finally { busy = false; }
  };
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && next && !busy) { page++; loadSeason(true); } }, { rootMargin: "500px" });
  io.observe($("#aMore"));
  x.setCleanup(() => io.disconnect());
  x.setActs({ retry: () => vHome(view, x), ...x.topActs });
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
      const list = (await A.top()).slice(0, 10), el = $("#atop"); if (!el || !list.length) return;
      x.setCleanup(carousel(el, list, () => io.disconnect()));
    } catch (e) { const el = $("#atop"); if (el) el.innerHTML = `<span class="mu sm px">${esc(e.message)}</span>`; }
  };
  // berurutan (bukan bersamaan): Jikan membatasi jumlah permintaan per detik
  await loadToday(); await loadTop(); await loadSeason(false);
}

