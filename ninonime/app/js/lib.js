// NinoNime · modul anime/lib (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $ } from "./ui.js";


/* ---------- riwayat tonton (di HP) ---------- */
const HK = "animeHist";
export const hist = () => api.lsGet(HK, []);
export function saveHist(a, ep, t = 0, dur = 0) {
  const list = hist().filter((x) => x.id !== a.id);
  list.unshift({ id: a.id, title: a.title, cover: a.cover, ep, t: Math.round(t), dur: Math.round(dur), at: Date.now() });
  api.lsSet(HK, list.slice(0, 60));
}

/* =====================================================================
   Tampilan
   ===================================================================== */
export const aHref = (id) => `#/anime/${id}`;
export const fmtScore = (n) => (Number(n) > 0 ? Number(n).toFixed(2).replace(".", ",") : "");
export const acv = (url, title, cls = "") => `<span class="cover ${cls}${url ? "" : " cv-none"}" data-ini="${esc((title || "?").trim()[0] || "?")}">${url ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}</span>`;
export const acard = (a, i = 0) => `<a class="an-card" href="${aHref(a.id)}" style="--i:${i}"><span class="an-cv">${acv(a.cover, a.title)}${a.airing ? `<span class="an-new">Tayang</span>` : ""}${fmtScore(a.score) ? `<span class="cv-score">${icon("star", 10, 2)}${fmtScore(a.score)}</span>` : ""}${a.eps ? `<span class="an-eps">${a.eps} eps</span>` : ""}</span><b class="t2">${esc(a.title)}</b><span class="mu xs">${esc([a.type, a.year].filter(Boolean).join(" · "))}</span></a>`;
export const skCards = (n) => `<div class="an-grid">${Array.from({ length: n }, () => `<span class="an-card"><span class="an-cv sk"></span><span class="sk sk-l"></span><span class="sk sk-l s"></span></span>`).join("")}</div>`;
export const errHtml = (e) => `<div class="empty"><b>${esc(e.message || "Gagal memuat")}</b><button class="btn ghost mt8" data-act="retry">Coba lagi</button></div>`;

// baris anime (tampilan daftar, seperti Ninokuu): sampul kecil, judul, jenis · tahun · episode, skor
export const statusOf = (a) => (a.airing || /currently/i.test(a.status || "") ? "Ongoing" : /finished/i.test(a.status || "") ? "Tamat" : /not yet/i.test(a.status || "") ? "Segera tayang" : "");
export const arow = (a, i = 0) => `<a class="mn-row" href="${aHref(a.id)}" style="--i:${i}">${acv(a.cover, a.title, "sm")}<span class="mn-mid"><b class="mn-t">${esc(a.title)}</b>
  <span class="fa-meta">${[a.type, a.year, a.eps ? a.eps + " eps" : ""].filter(Boolean).map(esc).join('<span class="fa-sep">·</span>')}</span>
  <span class="fa-meta">${statusOf(a) ? `<b class="st-${statusOf(a) === "Ongoing" ? "on" : statusOf(a) === "Tamat" ? "done" : "soon"}">${statusOf(a)}</b>` : ""}${fmtScore(a.score) ? `<span class="fa-sep">·</span>${icon("star", 11, 2)}${fmtScore(a.score)}` : ""}</span></span>
  <span class="mu">${icon("chev", 18)}</span></a>`;
export const viewBtn = (grid, act) => `<button class="sq-btn" data-act="${act}" aria-label="${grid ? "Tampilan daftar" : "Tampilan grid"}">${icon(grid ? "list" : "grid", 18, 2)}</button>`;
