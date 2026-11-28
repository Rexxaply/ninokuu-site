// NinoNime · modul anime/lib (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $ } from "./ui.js";


/* ---------- riwayat tonton (di HP) ---------- */
const HK = "animeHist";
export const hist = () => api.lsGet(HK, []);
// histEps(): catatan per episode (mode Multi di Riwayat): satu baris untuk tiap pasangan anime + episode
const HEK = "animeHistEp";
export const histEps = () => api.lsGet(HEK, []);
export function saveHist(a, ep, t = 0, dur = 0) {
  // membuka lagi episode yang sama (t = 0) tidak menghapus posisi tonton terakhirnya
  const old = hist().find((x) => x.id === a.id && Number(x.ep) === Number(ep)), oldE = histEps().find((x) => x.id === a.id && Number(x.ep) === Number(ep));
  const row = (o) => ({ id: a.id, title: a.title, cover: a.cover, ep, t: Math.round(t || o?.t || 0), dur: Math.round(dur || o?.dur || 0), at: Date.now() });
  api.lsSet(HK, [row(old), ...hist().filter((x) => x.id !== a.id)].slice(0, 60));
  api.lsSet(HEK, [row(oldE), ...histEps().filter((x) => !(x.id === a.id && Number(x.ep) === Number(ep)))].slice(0, 300));
}
// hapus riwayat: seluruh anime (Single) atau episode tertentu (Multi)
export function dropHist(ids = [], eps = []) {
  const idS = new Set(ids), epS = new Set(eps.map(([i, e]) => `${i}:${e}`));
  const leftE = histEps().filter((x) => !idS.has(x.id) && !epS.has(`${x.id}:${x.ep}`));
  api.lsSet(HEK, leftE);
  // anime yang semua episodenya dihapus ikut hilang dari daftar Single; yang tersisa menunjuk episode terbaru yang masih ada
  api.lsSet(HK, hist().filter((x) => !idS.has(x.id)).map((x) => {
    if (!epS.has(`${x.id}:${x.ep}`)) return x;
    const n = leftE.filter((y) => y.id === x.id).sort((p, q) => q.at - p.at)[0];
    return n ? { ...n } : null;
  }).filter(Boolean));
}

/* =====================================================================
   Tampilan
   ===================================================================== */
export const aHref = (id) => `#/anime/${id}`;
export const fmtScore = (n) => (Number(n) > 0 ? Number(n).toFixed(2).replace(".", ",") : "");
// versi demo: semua sampul diganti sampul NinoNime (config.js → DEMO_COVERS)
export const DEMO_COVER = window.NINONIME_CONFIG?.DEMO_COVERS ? "icons/demo-cover.jpg" : "";
export const acv = (url, title, cls = "") => (url = DEMO_COVER || url, `<span class="cover ${cls}${url ? "" : " cv-none"}" data-ini="${esc((title || "?").trim()[0] || "?")}">${url ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}</span>`);
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
