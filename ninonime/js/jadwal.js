// NinoNime · modul anime/jadwal (dipecah dari anime.js)
import { esc, $, $$ } from "./ui.js";
import { DAYS, DAYS_S, MONTHS } from "./const.js";
import { hhmm, scheduleFor, wibNow } from "./data.js";
import { aHref, acv, errHtml, fmtScore } from "./lib.js";

// --- Jadwal: pilihan hari + garis waktu dengan penanda SEKARANG ---
let jDay = null;
export async function vJadwal(view, x) {
  const wn = wibNow();
  if (jDay == null) jDay = wn.day;
  // minggu berjalan (Minggu–Sabtu) dengan tanggalnya
  const start = new Date(wn.date); start.setUTCDate(start.getUTCDate() - wn.day);
  const week = DAYS_S.map((s, i) => { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); return { i, s, n: d.getUTCDate(), m: d.getUTCMonth() }; });
  view.innerHTML = `
<div class="page-h jd-h"><h1>Jadwal</h1><span class="mu sm">Jam tayang WIB</span></div>
<div class="jd-days" role="tablist" style="--di:${jDay}"><span class="jd-pill" aria-hidden="true"></span>
  ${week.map((d) => `<button role="tab" class="jd-day${d.i === wn.day ? " today" : ""}" aria-selected="${d.i === jDay}" data-act="day" data-v="${d.i}"><span>${d.s}</span><b>${d.n}</b><i></i></button>`).join("")}</div>
<div id="jdBody"></div><div class="pad-nav"></div>`;
  let seq = 0;
  const draw = async (dir = 0) => {
    const my = ++seq, body = $("#jdBody"), d = week[jDay];
    $(".jd-days").style.setProperty("--di", jDay);
    $$(".jd-day").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.v === jDay)));
    body.innerHTML = `<div class="jd-sum"><b>${DAYS[jDay]}</b><span class="mu sm">${d.n} ${MONTHS[d.m]}</span><span class="grow"></span><span class="mu sm" id="jdN"></span></div>
      <div class="jd-line jd-load">${`<div class="jd-it"><span class="jd-tm"><span class="sk sk-l"></span></span><span class="jd-dot"></span><span class="jd-card"><span class="sk jd-skc"></span><span class="col g6 grow"><span class="sk sk-l"></span><span class="sk sk-l s"></span></span></span></div>`.repeat(4)}</div>`;
    body.dataset.dir = dir > 0 ? "f" : dir < 0 ? "b" : "";
    try {
      const list = await scheduleFor(jDay);
      if (my !== seq || !$("#jdBody")) return;
      const now = wibNow(), isToday = jDay === now.day;
      $("#jdN").textContent = `${list.length} anime`;
      let html = "", nowPut = false, k = 0;
      const nowRow = () => `<div class="jd-now" style="--i:${k++}"><span class="jd-tm"><b>${hhmm(now.min)}</b></span><span class="jd-dot now"></span><span class="jd-nl"><i class="jd-tag">SEKARANG</i></span></div>`;
      for (const a of list) {
        if (isToday && !nowPut && a.slot.min > now.min) { html += nowRow(); nowPut = true; }
        const past = isToday && a.slot.min <= now.min, diff = a.slot.min - now.min;
        const left = isToday && diff > 0 ? `${diff >= 60 ? Math.floor(diff / 60) + "j " : ""}${diff % 60}m` : "";
        html += `<a class="jd-it${past ? " past" : ""}" href="${aHref(a.id)}" style="--i:${k++}"><span class="jd-tm"><b>${hhmm(a.slot.min)}</b>${left ? `<i>${left}</i>` : past && now.min - a.slot.min < 30 ? `<i class="live">Tayang</i>` : ""}</span><span class="jd-dot"></span>
          <span class="jd-card">${acv(a.cover, a.title, "jd")}<span class="col g4 grow"><b class="t2">${esc(a.title)}</b><span class="mu xs">${esc([a.eps ? `${a.eps} episode` : "Episode baru", fmtScore(a.score) ? "★ " + fmtScore(a.score) : ""].filter(Boolean).join(" · "))}</span></span></span></a>`;
      }
      if (isToday && !nowPut && list.length) html += nowRow();
      body.innerHTML = body.firstElementChild.outerHTML + (list.length ? `<div class="jd-line">${html}</div>` : `<div class="empty"><b>Belum ada jadwal</b><span class="mu sm">Tidak ada anime yang tayang hari ini.</span></div>`);
      body.dataset.dir = dir > 0 ? "f" : dir < 0 ? "b" : "";
      requestAnimationFrame(() => body.querySelector(".jd-line")?.classList.add("on"));
      // gulir pelan ke penanda SEKARANG
      if (isToday) setTimeout(() => { const n = $(".jd-now"); if (n && n.getBoundingClientRect().top > innerHeight * .6) window.scrollTo({ top: window.scrollY + n.getBoundingClientRect().top - innerHeight * .35, behavior: "smooth" }); }, 450);
    } catch (e) { if (my === seq && $("#jdBody")) $("#jdBody").innerHTML = errHtml(e); }
  };
  // geser kiri/kanan untuk pindah hari
  let sx = 0, sy = 0;
  const ts = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
  const te = (e) => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) { const n = Math.min(6, Math.max(0, jDay + (dx < 0 ? 1 : -1))); if (n !== jDay) { const dir = n - jDay; jDay = n; draw(dir); } } };
  view.addEventListener("touchstart", ts, { passive: true }); view.addEventListener("touchend", te, { passive: true });
  // penanda SEKARANG ikut bergerak tiap menit
  const tick = setInterval(() => { if (jDay === wibNow().day && document.visibilityState === "visible") draw(0); }, 60e3);
  x.setCleanup(() => { clearInterval(tick); view.removeEventListener("touchstart", ts); view.removeEventListener("touchend", te); });
  x.setActs({ day: (el) => { const n = +el.dataset.v; if (n === jDay) return; const dir = n - jDay; jDay = n; draw(dir); }, retry: () => draw(0) });
  await draw(0);
}

