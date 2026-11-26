// NinoNime · modul anime/detail (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $, toast } from "./ui.js";
import { DAYS, MONTHS } from "./const.js";
import { A, hhmm, wibSlot } from "./data.js";
import { FK, favs, isFav, statusName, toggleFav } from "./fav.js";
import { fly, setBackFly, takeMorph } from "./fly.js";
import { errHtml, fmtScore, hist } from "./lib.js";
import { player } from "./player.js";

// --- Info anime (poster di tengah, sinopsis, daftar episode bergambar) ---
export const fmtDate = (iso) => { const t = Date.parse(iso || ""); if (!t) return ""; const d = new Date(t + 7 * 3600e3); return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
let epDesc = false, epGridView = false;
export async function vDetail(view, x, id) {
  id = Number(id);
  const from = takeMorph();
  const bar = (title = "") => `<div class="ad-bar"><button class="icon-btn" data-act="back" aria-label="Kembali">${icon("back", 22)}</button><b class="ad-bar-t">${esc(title)}</b>
    <button class="ad-save${isFav(id) ? " on" : ""}" data-act="save" aria-pressed="${isFav(id)}">${icon(isFav(id) ? "heartF" : "heart", 17, 2)}<span>${isFav(id) ? "Tersimpan" : "Simpan"}</span></button></div>`;
  // kerangka langsung tampil (poster dari sampul yang diketuk), data menyusul
  view.innerHTML = `<div class="ad">${bar()}<div class="ad-hero"><span class="ad-bg"${from?.src ? ` style="background-image:url('${esc(from.src)}')"` : ""}></span>
    <span class="cover adp${from?.src ? "" : " sk"}">${from?.src ? `<img src="${esc(from.src)}" alt="">` : ""}</span><span class="sk sk-l ad-skt"></span><span class="sk sk-l s ad-skt"></span></div></div>`;
  if (from) fly(from.r, $(".cover.adp", view), from.src);
  x.setActs({ back: () => x.back("#/home"), retry: () => vDetail(view, x, id) });
  let a, eps = [], thumbs = {};
  try { a = await A.detail(id); } catch (e) { view.innerHTML = `<div class="ad">${bar()}${errHtml(e)}</div>`; return; }
  if (!view.querySelector(".ad")) return;
  const h = hist().find((y) => y.id === id);
  const slot = wibSlot(a.bc);
  const total = () => Math.max(a.eps || 0, eps.length || 0, h?.ep || 0);
  const epRow = (n, i) => {
    const e = eps.find((y) => y.n === n), cur = Number(h?.ep) === n, t = e?.title && !/^episode\s*\d+$/i.test(e.title) ? e.title : "";
    return `<button class="ep-row${cur ? " on" : ""}" data-act="ep" data-v="${n}" style="--i:${Math.min(i, 16)}"><span class="ep-th"${thumbs[n] || a.cover ? ` style="background-image:url('${esc(thumbs[n] || a.cover)}')"` : ""}>${cur ? `<i>Terakhir</i>` : ""}<span class="ep-pl">${icon("play", 14, 2.4)}</span></span>
      <span class="col g4 grow"><b>Episode ${n}</b><span class="mu xs">${esc([t, fmtDate(e?.aired)].filter(Boolean).join(" · ") || (a.airing && n === total() ? "Episode terbaru" : ""))}</span></span>${e?.filler ? `<span class="ep-tag">Filler</span>` : ""}</button>`;
  };
  const epList = () => {
    const n = total(); if (!n) return `<span class="mu sm">Belum ada episode.</span>`;
    const nums = Array.from({ length: n }, (_, i) => i + 1); if (epDesc) nums.reverse();
    return epGridView ? `<div class="ep-grid">${nums.map((k, i) => `<button class="ep-b${k === Number(h?.ep) ? " on" : ""}" data-act="ep" data-v="${k}" style="--i:${Math.min(i, 24)}">${k}</button>`).join("")}</div>`
      : `<div class="ep-rows">${nums.map(epRow).join("")}</div>`;
  };
  const draw = () => {
    const meta = [a.studios[0] ? `<b class="ad-studio">${esc(a.studios[0])}</b>` : "", esc(a.type || ""), esc(statusName(a)), esc(fmtDate(a.from))].filter(Boolean).join('<i class="ad-sep">|</i>');
    view.innerHTML = `<div class="ad">${bar(a.title)}
<div class="ad-hero"><span class="ad-bg" style="background-image:url('${esc(a.cover)}')"></span>
  <span class="cover adp">${a.cover ? `<img src="${esc(a.cover)}" alt="">` : ""}${fmtScore(a.score) ? `<span class="adp-score">${icon("star", 12, 2)}${fmtScore(a.score).replace(/,?0$/, "")}</span>` : ""}</span>
  <h1 class="ad-t">${esc(a.title)}</h1>${a.alt ? `<span class="ad-alt">${esc(a.alt)}</span>` : ""}
  <span class="ad-meta">${meta}</span>
  ${a.genres.length ? `<span class="ad-gen">${a.genres.slice(0, 5).map((g) => `<i>${esc(g)}</i>`).join("")}</span>` : ""}
  ${slot ? `<span class="ad-slot">${icon("clock", 12, 2)}Tayang tiap ${DAYS[slot.day]} ${hhmm(slot.min)} WIB</span>` : ""}
</div>
<div class="px col g14">
  <div class="row g8 ad-cta"><button class="btn primary grow" data-act="play">${icon("play", 18, 2)}${h ? `Lanjut episode ${esc(h.ep)}` : "Tonton episode 1"}</button>${a.trailer ? `<button class="btn ghost" data-act="trailer">${icon("tv", 18, 2)}Trailer</button>` : ""}</div>
  <div class="ad-card"><b>Sinopsis</b><p class="ad-syn" id="syn">${esc(a.synopsis || "Belum ada sinopsis.").replace(/\n+/g, "<br>")}</p>
    ${a.synopsis.length > 220 ? `<button class="ad-more" data-act="syn">Lihat selengkapnya ${icon("chev", 14, 2.2)}</button>` : ""}</div>
  <div class="ep-h"><h2>Episode <span class="mu">(${total()})</span></h2><span class="row g6"><button class="sq-btn" data-act="epGrid" aria-label="${epGridView ? "Tampilan daftar" : "Tampilan kotak"}">${icon(epGridView ? "list" : "grid", 17, 2)}</button><button class="sq-btn${epDesc ? " on" : ""}" data-act="epSort" aria-label="Urutkan episode">${icon("sort", 17, 2)}</button></span></div>
  <div id="eps">${epList()}</div>
  ${a.studios.length ? `<p class="mu xs">Studio: ${esc(a.studios.join(", "))}${a.duration ? " · " + esc(a.duration) : ""}</p>` : ""}
</div><div class="pad-nav"></div></div>`;
  };
  draw();
  // judul muncul di bar atas setelah poster tergulir lewat
  const onScroll = () => { const b = $(".ad-bar", view); if (b) b.classList.toggle("solid", window.scrollY > 260); };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  x.setCleanup(() => {
    removeEventListener("scroll", onScroll);
    const p = $(".cover.adp", view); if (p) { const r = p.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) setBackFly({ id, r, src: a.cover, at: Date.now() }); }
  });
  const redrawEps = () => { const el = $("#eps"); if (el) el.innerHTML = epList(); };
  x.setActs({
    back: () => x.back("#/home"), retry: () => vDetail(view, x, id),
    play: () => player.open(a, h?.ep || 1, eps),
    ep: (el) => player.open(a, Number(el.dataset.v), eps),
    trailer: () => player.open(a, 0, eps),
    save: (el) => {
      const on = toggleFav(a);
      el.classList.toggle("on", on); el.setAttribute("aria-pressed", String(on));
      el.innerHTML = `${icon(on ? "heartF" : "heart", 17, 2)}<span>${on ? "Tersimpan" : "Simpan"}</span>`;
      el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
      toast(on ? (a.airing ? "Disimpan di Favorit · Ongoing" : "Disimpan di Favorit · Tamat") : "Dihapus dari Favorit");
    },
    syn: (el) => { const o = $("#syn").classList.toggle("open"); el.innerHTML = `${o ? "Sembunyikan" : "Lihat selengkapnya"} ${icon("chev", 14, 2.2)}`; el.classList.toggle("up", o); },
    epSort: (el) => { epDesc = !epDesc; el.classList.toggle("on", epDesc); redrawEps(); },
    epGrid: (el) => { epGridView = !epGridView; el.innerHTML = icon(epGridView ? "list" : "grid", 17, 2); redrawEps(); },
  });
  // favorit: status ikut diperbarui saat info anime dibuka
  if (isFav(id)) api.lsSet(FK, favs().map((f) => (f.id === id ? { ...f, status: a.status, airing: a.airing, eps: a.eps, score: a.score, chk: Date.now() } : f)));
  try { eps = await A.episodes(id); } catch {}
  try { thumbs = await A.epThumbs(id); } catch {}
  if ($("#eps")) { const hEl = $(".ep-h h2 .mu"); if (hEl) hEl.textContent = `(${total()})`; redrawEps(); }
}

