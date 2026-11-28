// NinoNime · modul anime/detail (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $, toast } from "./ui.js";
import { DAYS, MONTHS } from "./const.js";
import { A, hhmm, wibSlot } from "./data.js";
import { FK, favs, isFav, statusName, toggleFav } from "./fav.js";
import { adoptFly, fly, setBackFly, shot, takeMorph } from "./fly.js";
import { aHref, acv, errHtml, fmtScore, hist } from "./lib.js";
import { player } from "./player.js";

// --- Info anime (poster di tengah, sinopsis, daftar episode bergambar) ---
export const fmtDate = (iso) => { const t = Date.parse(iso || ""); if (!t) return ""; const d = new Date(t + 7 * 3600e3); return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
let epDesc = false, epGridView = false;
const REL = { Sequel: "Sekuel", Prequel: "Prekuel", "Side Story": "Cerita sampingan", "Side story": "Cerita sampingan", "Alternative Version": "Versi lain", "Alternative version": "Versi lain",
  "Alternative Setting": "Latar lain", Summary: "Ringkasan", "Spin-Off": "Spin-off", "Spin-off": "Spin-off", "Parent Story": "Cerita utama", "Parent story": "Cerita utama", "Full Story": "Cerita lengkap", "Full story": "Cerita lengkap", Character: "Karakter", Other: "Lainnya", Mirip: "Mirip" };
// kartu Anime Terkait (sampul menyusul bila datanya belum ada)
const relCard = (r, i) => `<a class="rl-card" href="${aHref(r.id)}" data-rid="${r.id}" style="--i:${i}"><span class="rl-cv">${r.cover ? acv(r.cover, r.title) : `<span class="cover sk"></span>`}
  <span class="rl-tag">${esc(REL[r.rel] || r.rel || "Terkait")}</span>${fmtScore(r.score) ? `<span class="cv-score">${icon("star", 10, 2)}${fmtScore(r.score)}</span>` : ""}${r.eps ? `<span class="rl-eps">Eps ${r.eps}</span>` : ""}</span>
  <b class="rl-t">${esc(r.title || "")}</b>${r.type ? `<span class="mu xs">${esc([r.type, r.year].filter(Boolean).join(" · "))}</span>` : ""}</a>`;
export async function vDetail(view, x, id) {
  id = Number(id);
  const from = takeMorph();
  const bar = (title = "") => `<div class="ad-bar"><button class="icon-btn" data-act="back" aria-label="Kembali">${icon("back", 22)}</button><b class="ad-bar-t">${esc(title)}</b>
    <button class="ad-save${isFav(id) ? " on" : ""}" data-act="save" aria-pressed="${isFav(id)}">${icon(isFav(id) ? "heartF" : "heart", 17, 2)}<span>${isFav(id) ? "Tersimpan" : "Simpan"}</span></button></div>`;
  // kerangka langsung tampil (poster dari sampul yang diketuk), data menyusul
  view.innerHTML = `<div class="ad">${bar()}<div class="ad-hero"><span class="ad-bg"${from?.src ? ` style="background-image:url('${esc(from.src)}')"` : ""}></span>
    <span class="cover adp${from?.src ? "" : " sk"}">${from?.src ? `<img src="${esc(from.src)}" alt="">` : ""}</span><span class="sk sk-l ad-skt"></span><span class="sk sk-l s ad-skt"></span></div></div>`;
  if (from) fly(from, $(".cover.adp", view), 460);
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
  <span class="ad-htx"><h1 class="ad-t">${esc(a.title)}</h1>${a.alt ? `<span class="ad-alt">${esc(a.alt)}</span>` : ""}
  <span class="ad-meta">${meta}</span>
  ${a.genres.length ? `<span class="ad-gen">${a.genres.slice(0, 5).map((g) => `<i>${esc(g)}</i>`).join("")}</span>` : ""}
  ${slot ? `<span class="ad-slot">${icon("clock", 12, 2)}Tayang tiap ${DAYS[slot.day]} ${hhmm(slot.min)} WIB</span>` : ""}</span>
</div>
<div class="px col g14 ad-body">
  <div class="row g8 ad-cta"><button class="btn primary grow" data-act="play">${icon("play", 18, 2)}${h ? `Lanjut episode ${esc(h.ep)}` : "Tonton episode 1"}</button>${a.trailer ? `<button class="btn ghost" data-act="trailer">${icon("tv", 18, 2)}Trailer</button>` : ""}</div>
  <div class="ad-card"><b>Sinopsis</b><p class="ad-syn" id="syn">${esc(a.synopsis || "Belum ada sinopsis.").replace(/\n+/g, "<br>")}</p>
    ${a.synopsis.length > 220 ? `<button class="ad-more" data-act="syn">Lihat selengkapnya ${icon("chev", 14, 2.2)}</button>` : ""}</div>
  <section class="rl-sec" id="rel"><div class="ep-h"><h2>Anime Terkait</h2></div><div class="hs rl-row">${`<span class="rl-card"><span class="rl-cv"><span class="cover sk"></span></span><span class="sk sk-l"></span></span>`.repeat(3)}</div></section>
  <div class="ep-h"><h2>Episode <span class="mu">(${total()})</span></h2><span class="row g6"><button class="sq-btn" data-act="epGrid" aria-label="${epGridView ? "Tampilan daftar" : "Tampilan kotak"}">${icon(epGridView ? "list" : "grid", 17, 2)}</button><button class="sq-btn${epDesc ? " on" : ""}" data-act="epSort" aria-label="Urutkan episode">${icon("sort", 17, 2)}</button></span></div>
  <div id="eps">${epList()}</div>
  ${a.studios.length ? `<p class="mu xs">Studio: ${esc(a.studios.join(", "))}${a.duration ? " · " + esc(a.duration) : ""}</p>` : ""}
</div><div class="pad-nav"></div></div>`;
  };
  draw();
  adoptFly($(".cover.adp", view));   // poster baru (setelah data tiba) tetap tersembunyi sampai sampul yang terbang mendarat
  // judul muncul di bar atas setelah poster tergulir lewat
  // parallax: latar & poster bergerak lebih lambat dari gulir lalu memudar, lembar isi naik menutupinya
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let pr = 0;
  const parallax = () => { pr = 0; const y = Math.max(0, window.scrollY), bg = $(".ad-bg", view), po = $(".cover.adp", view), tx = $(".ad-htx", view);
    if (still || !po) return;
    const k = Math.min(1, y / 340);
    // latar hanya digeser (skala tetap): mengubah skala lapisan ber-blur besar tiap frame bikin gulir tersendat di HP
    if (bg) bg.style.transform = `translate3d(0, ${(y * 0.55).toFixed(1)}px, 0) scale(1.15)`;
    po.style.transform = y ? `translate3d(0, ${(y * 0.42).toFixed(1)}px, 0) scale(${(1 - k * 0.12).toFixed(3)})` : "";
    po.style.opacity = y ? (1 - k * 0.85).toFixed(3) : "";
    if (tx) { tx.style.transform = y ? `translate3d(0, ${(y * 0.25).toFixed(1)}px, 0)` : ""; tx.style.opacity = y ? Math.max(0, 1 - y / 260).toFixed(3) : ""; } };
  // bar atas muncul bertahap mengikuti gulir (latar & judul memudar masuk bersama poster yang memudar keluar)
  const barK = () => { const b = $(".ad-bar", view); if (!b) return; const k = Math.min(1, Math.max(0, (window.scrollY - 110) / 170));
    b.style.setProperty("--bk", k.toFixed(3)); b.classList.toggle("solid", k > 0.5); b.classList.toggle("glass", k > 0.02); };
  const onScroll = () => { if (!pr) pr = requestAnimationFrame(() => { parallax(); barK(); }); };
  addEventListener("scroll", onScroll, { passive: true }); parallax(); barK();
  x.setCleanup(() => {
    removeEventListener("scroll", onScroll); cancelAnimationFrame(pr);
    const p = $(".cover.adp", view); if (p) { const r = p.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) setBackFly({ id, ...shot(p), at: Date.now() }); }
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
  // Anime Terkait: daftar dulu, sampul & detail menyusul satu per satu (Jikan dibatasi ±3 permintaan/detik)
  const relSec = $("#rel", view); if (!relSec) return;
  let rels = []; try { rels = await A.related(id); } catch {}
  if (!relSec.isConnected) return;
  if (!rels.length) { relSec.remove(); return; }
  const row = $(".rl-row", relSec); row.innerHTML = rels.map(relCard).join("");
  for (const r of rels) {
    if (r.cover && r.score != null) continue;
    let d; try { d = await A.detail(r.id); } catch { continue; }
    if (!relSec.isConnected) return;
    const el = row.querySelector(`[data-rid="${r.id}"]`); if (!el) continue;
    const n = document.createElement("div"); n.innerHTML = relCard({ ...r, cover: d.cover, score: d.score, eps: d.eps, type: d.type, year: d.year, title: r.title || d.title }, 0);
    const c = n.firstElementChild; c.style.animation = "none"; el.replaceWith(c);
  }
}

