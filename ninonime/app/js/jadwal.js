// NinoNime · Jadwal: satu minggu kalender (Minggu–Sabtu) dalam satu gulungan, seperti aplikasi anime pada umumnya.
// - Tiap hari punya judul menempel (nama hari, tanggal, jumlah anime) di bawah bilah tanggal.
// - Ketuk tanggal → meluncur ke hari itu. Menggulir → tanggal yang aktif ikut berpindah (realtime).
// - Hari ini: penanda SEKARANG ikut bergerak tiap menit, hitung mundur jam tayang, tombol "Hari ini" bila sudah jauh.
import { esc, icon, $, $$ } from "./ui.js";
import { DAYS, DAYS_S, MONTHS } from "./const.js";
import { hhmm, scheduleFor, wibNow } from "./data.js";
import { aHref, acv, errHtml, fmtScore } from "./lib.js";
import { quietNav } from "./navbar.js";

export async function vJadwal(view, x) {
  const wn = wibNow();
  // minggu kalender berjalan (Minggu–Sabtu) dengan tanggalnya, dalam WIB
  const start = new Date(wn.date); start.setUTCDate(start.getUTCDate() - wn.day);
  const week = DAYS_S.map((s, i) => { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); return { i, s, n: d.getUTCDate(), m: d.getUTCMonth() }; });
  let active = wn.day;
  const sk = `<div class="jd-it"><span class="jd-tm"><span class="sk sk-l"></span></span><span class="jd-dot"></span><span class="jd-card"><span class="sk jd-skc"></span><span class="col g6 grow"><span class="sk sk-l"></span><span class="sk sk-l s"></span></span></span></div>`;
  view.innerHTML = `
<div class="page-h jd-h"><h1>Jadwal</h1><span class="mu sm">Jam tayang WIB</span></div>
<div class="jd-days" role="tablist" style="--di:${active}"><span class="jd-pill" aria-hidden="true"></span>
  ${week.map((d) => `<button role="tab" class="jd-day${d.i === wn.day ? " today" : ""}" aria-selected="${d.i === active}" data-act="day" data-v="${d.i}"><span>${d.s}</span><b>${d.n}</b><i></i></button>`).join("")}</div>
<div id="jdWeek">${week.map((d) => `<section class="jd-sec${d.i === wn.day ? " is-today" : ""}" data-d="${d.i}">
  <div class="jd-sh"><b>${DAYS[d.i]}</b><span class="mu sm">${d.n} ${MONTHS[d.m]}</span><span class="grow"></span><span class="mu sm jd-n"></span></div>
  <div class="jd-line jd-load">${sk.repeat(3)}</div></section>`).join("")}</div>
<button class="jd-today" data-act="today" hidden>${icon("back", 15, 2.6)}<span>Hari ini</span></button>
<div class="pad-nav"></div>`;
  const bar = $(".jd-days"), secs = $$(".jd-sec"), todayBtn = $(".jd-today"), wk = $("#jdWeek");
  const lists = new Array(7).fill(null);
  x.keepScroll?.();
  const alive = () => (x.alive ? x.alive() : view.contains(wk));   // posisi gulir diatur halaman ini (ke SEKARANG, atau posisi terakhir saat kembali dari detail)
  // tepi bawah bilah tanggal SAAT MENEMPEL (bukan posisi sekarang: di puncak halaman bilah masih di bawah judul)
  const stuck = () => parseFloat(getComputedStyle(bar).top) + bar.offsetHeight;
  const shown = () => !!wk.offsetParent;   // false selama halaman disimpan (info anime sedang terbuka)
  const fitSticky = () => { if (shown()) wk.style.setProperty("--jdb", stuck() + "px"); };
  fitSticky();

  // ---- isi satu hari ----
  const draw = (d) => {
    const sec = secs[d], list = lists[d]; if (!sec || !list) return;
    const now = wibNow(), isToday = d === now.day, past = d < now.day;
    $(".jd-n", sec).textContent = `${list.length} anime`;
    let html = "", nowPut = false, k = 0;
    const nowRow = () => `<div class="jd-now" style="--i:${k++}"><span class="jd-tm"><b>${hhmm(now.min)}</b></span><span class="jd-dot now"></span><span class="jd-nl"><i class="jd-tag">SEKARANG</i></span></div>`;
    for (const a of list) {
      if (isToday && !nowPut && a.slot.min > now.min) { html += nowRow(); nowPut = true; }
      const done = past || (isToday && a.slot.min <= now.min), diff = a.slot.min - now.min;
      const left = isToday && diff > 0 ? `${diff >= 60 ? Math.floor(diff / 60) + "j " : ""}${diff % 60}m` : "";
      html += `<a class="jd-it${done ? " past" : ""}" href="${aHref(a.id)}" style="--i:${k++}"><span class="jd-tm"><b>${hhmm(a.slot.min)}</b>${left ? `<i>${left}</i>` : isToday && done && now.min - a.slot.min < 30 ? `<i class="live">Tayang</i>` : ""}</span><span class="jd-dot"></span>
        <span class="jd-card">${acv(a.cover, a.title, "jd")}<span class="col g4 grow"><b class="t2">${esc(a.title)}</b><span class="mu xs">${esc([a.eps ? `${a.eps} episode` : "Episode baru", fmtScore(a.score) ? "★ " + fmtScore(a.score) : ""].filter(Boolean).join(" · "))}</span></span></span></a>`;
    }
    if (isToday && !nowPut && list.length) html += nowRow();
    const line = $(".jd-line", sec);
    line.outerHTML = list.length ? `<div class="jd-line">${html}</div>` : `<div class="jd-line jd-empty"><span class="mu sm">Tidak ada anime yang tayang hari ini.</span></div>`;
    requestAnimationFrame(() => $(".jd-line", sec)?.classList.add("on"));
  };
  const fail = (d, e) => { const line = $(".jd-line", secs[d]); if (line) line.outerHTML = `<div class="jd-line">${errHtml(e)}</div>`; };

  // ---- tanggal aktif ikut posisi gulir ----
  let lock = 0;                                                     // sedang meluncur karena ketukan tanggal
  const barBottom = () => Math.max(stuck(), bar.getBoundingClientRect().bottom);
  const setActive = (d) => {
    if (d === active) return; active = d;
    bar.style.setProperty("--di", d);
    $$(".jd-day", bar).forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.v === d)));
  };
  const sync = () => {
    if (!shown()) return;
    const edge = barBottom() + 60;
    let d = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= edge) d = i; });
    // sudah di dasar halaman: hari terakhir yang terlihat
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) d = Math.max(d, secs.findLastIndex((s) => s.getBoundingClientRect().top < innerHeight - 80));
    if (!lock) setActive(d);
    // tombol "Hari ini": muncul bila hari ini sudah keluar layar, panah ke arahnya
    const r = secs[wn.day].getBoundingClientRect(), away = r.bottom < barBottom() + 40 || r.top > innerHeight - 60;
    todayBtn.hidden = !away; todayBtn.classList.toggle("up", r.bottom < barBottom() + 40);
  };
  let raf = 0; const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); };
  addEventListener("scroll", onScroll, { passive: true });

  const goDay = (d, smooth = true) => {
    const s = secs[d]; if (!s) return;
    const top = scrollY + s.getBoundingClientRect().top - stuck() + 1;
    setActive(d); clearTimeout(lock); lock = setTimeout(() => { lock = 0; sync(); }, smooth ? 700 : 50); quietNav(smooth ? 900 : 300);
    scrollTo({ top: Math.max(0, top), behavior: smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
  };
  const goNow = (smooth = true) => {
    const n = $(".jd-now", secs[wn.day]);
    if (!n) return goDay(wn.day, smooth);
    setActive(wn.day); clearTimeout(lock); lock = setTimeout(() => { lock = 0; sync(); }, smooth ? 700 : 50); quietNav(smooth ? 900 : 300);
    // SEKARANG di ±42% tinggi layar, tapi paling tidak sampai judul hari ini menempel (supaya tanggal aktif = hari ini)
    const toNow = scrollY + n.getBoundingClientRect().top - innerHeight * 0.42, toDay = scrollY + secs[wn.day].getBoundingClientRect().top - stuck() + 1;
    scrollTo({ top: Math.max(0, toNow, toDay), behavior: smooth ? "smooth" : "auto" });
  };

  // geser kiri/kanan di daftar → hari sebelumnya / berikutnya
  let sx = 0, sy = 0;
  const ts = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
  const te = (e) => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) { const n = Math.min(6, Math.max(0, active + (dx < 0 ? 1 : -1))); if (n !== active) goDay(n); } };
  wk.addEventListener("touchstart", ts, { passive: true }); wk.addEventListener("touchend", te, { passive: true });
  // penanda SEKARANG & hitung mundur diperbarui tiap menit (hanya hari ini, tanpa menggulir)
  const tick = setInterval(() => { if (document.visibilityState === "visible" && shown() && lists[wn.day]) { const y = scrollY; draw(wn.day); scrollTo(0, y); } }, 60e3);
  addEventListener("resize", fitSticky, { passive: true });
  x.setCleanup(() => { clearInterval(tick); removeEventListener("scroll", onScroll); removeEventListener("resize", fitSticky); cancelAnimationFrame(raf); clearTimeout(lock); });
  x.setActs({ day: (el) => goDay(+el.dataset.v), today: () => goNow(), retry: () => vJadwal(view, x) });

  // muat: hari ini dulu (langsung ditampilkan & digulir ke SEKARANG), lalu hari-hari lain berurutan
  // kembali dari detail anime: posisi baca terakhir dipulihkan setelah semua hari termuat (tanpa meluncur ke SEKARANG)
  const backY = x.savedY || 0;
  if (!backY) requestAnimationFrame(() => goDay(wn.day, false));
  const order = [wn.day, ...[1, 2, 3, 4, 5, 6].map((k) => (wn.day + k) % 7)];
  let first = !backY;
  for (const d of order) {
    try { lists[d] = await scheduleFor(d); } catch (e) { if (!alive()) return; fail(d, e); continue; }
    if (!alive()) return;
    // hari sebelum hari ini yang dimuat → tinggi berubah di atas posisi baca: posisi dijaga supaya tidak melompat
    const before = d < wn.day && shown() && secs[wn.day].getBoundingClientRect().top;
    draw(d);
    if (before !== false) { quietNav(300); scrollBy(0, secs[wn.day].getBoundingClientRect().top - before); }
    if (first) { first = false; setTimeout(() => { if (shown()) goNow(false); }, 30); }
    sync();
  }
  if (backY && shown()) { quietNav(300); scrollTo(0, backY); sync(); }
}
