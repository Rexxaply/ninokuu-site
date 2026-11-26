// NinoNime · modul anime/fav (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $, ask } from "./ui.js";
import { A } from "./data.js";
import { aHref, acv, hist } from "./lib.js";

// --- Favorit anime (di HP): dibedakan Ongoing & Tamat ---
export const FK = "animeFav";
export const favs = () => api.lsGet(FK, []);
export const isFav = (id) => favs().some((f) => f.id === id);
const favItem = (a) => ({ id: a.id, title: a.title, cover: a.cover, eps: a.eps, status: a.status, airing: a.airing, score: a.score, type: a.type, year: a.year, at: Date.now(), chk: Date.now() });
export function toggleFav(a) {
  const on = isFav(a.id);
  api.lsSet(FK, on ? favs().filter((f) => f.id !== a.id) : [favItem(a), ...favs()].slice(0, 300));
  return !on;
}
const isDone = (f) => !f.airing && /finished/i.test(f.status || "");
export const statusName = (a) => (a.airing || /currently/i.test(a.status || "") ? "Ongoing" : /finished/i.test(a.status || "") ? "Tamat" : /not yet/i.test(a.status || "") ? "Segera tayang" : a.status || "");
// status anime yang masih tayang dicek ulang (maks 4 judul tiap buka Favorit, masing-masing paling cepat 12 jam sekali)
async function refreshFavs() {
  const due = favs().filter((f) => !isDone(f) && Date.now() - (f.chk || 0) > 12 * 3600e3).slice(0, 4);
  let changed = false;
  for (const f of due) {
    try {
      const a = await A.detail(f.id);
      api.lsSet(FK, favs().map((y) => (y.id === f.id ? { ...y, status: a.status, airing: a.airing, eps: a.eps, score: a.score, chk: Date.now() } : y)));
      changed = changed || a.airing !== f.airing || a.status !== f.status;
    } catch {}
  }
  return changed;
}
/* ---------- Favorit (disusun seperti Favorit Ninokuu) ----------
   Tab Koleksi / Riwayat · catatan "tersimpan di HP" · cari di koleksi + urutan + tampilan · chip filter */
const SORTS = [["added", "Terakhir ditambah"], ["az", "Judul A-Z"], ["za", "Judul Z-A"], ["score", "Skor tertinggi"]];
let fv = { tab: "lib", q: "", filter: "all" };
const ago = (t) => {
  const m = Math.round((Date.now() - (t || 0)) / 60e3);
  if (m < 1) return "baru saja"; if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60); if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24); return d < 30 ? `${d} hari lalu` : new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};
const fmtT = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
// pilihan kecil (urutan) seperti lembar Ninokuu
function pick(title, list, cur) {
  return new Promise((resolve) => {
    const host = document.createElement("div"); host.className = "ask-host";
    host.innerHTML = `<div class="ask-bg" data-v=""></div><div class="ask glass pick" role="dialog" aria-modal="true"><b class="ask-ttl">${esc(title)}</b>
      ${list.map(([k, n]) => `<button class="pick-b" data-v="${k}" aria-pressed="${k === cur}">${esc(n)}${k === cur ? icon("check", 18, 2.4) : ""}</button>`).join("")}</div>`;
    document.body.append(host); requestAnimationFrame(() => host.classList.add("on"));
    host.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (!b) return; host.classList.remove("on"); host.classList.add("off"); setTimeout(() => host.remove(), 180); resolve(b.dataset.v || null); });
  });
}
export async function vFav(view, x) {
  const want = api.lsGet("favTab"); if (want) { fv.tab = want; fv.q = ""; api.lsSet("favTab", null); }
  const grid = () => api.lsGet("favView", "grid") === "grid";
  const sortKey = () => (SORTS.some(([k]) => k === api.lsGet("favSort")) ? api.lsGet("favSort") : "added");
  const draw = () => {
    const all = favs(), on = all.filter((f) => !isDone(f)), done = all.filter(isDone), hs = hist();
    const sk = sortKey(), byT = (a, b) => String(a.title || "").localeCompare(String(b.title || ""), "id", { sensitivity: "base", numeric: true });
    const sorted = [...all].sort(sk === "az" ? byT : sk === "za" ? (a, b) => byT(b, a) : sk === "score" ? (a, b) => (b.score || 0) - (a.score || 0) : (a, b) => (b.at || 0) - (a.at || 0));
    const q = fv.q.trim().toLowerCase();
    const lib = sorted.filter((f) => (!q || String(f.title || "").toLowerCase().includes(q)) && (fv.filter === "all" || (fv.filter === "on" ? !isDone(f) : isDone(f))));
    const hl = q ? hs.filter((h) => String(h.title || "").toLowerCase().includes(q)) : hs;
    const tabs = [["lib", "Koleksi"], ["hist", "Riwayat"]];
    const card = (f, i) => `<a class="an-card" href="${aHref(f.id)}" style="--i:${i}"><span class="an-cv">${acv(f.cover, f.title)}<span class="an-new ${isDone(f) ? "done" : ""}">${isDone(f) ? "Tamat" : "Ongoing"}</span>${f.eps ? `<span class="an-eps">${f.eps} eps</span>` : ""}</span><b class="t2">${esc(f.title)}</b></a>`;
    const row = (f, i) => `<a class="mn-row" href="${aHref(f.id)}" style="--i:${i}">${acv(f.cover, f.title, "sm")}<span class="mn-mid"><b class="mn-t">${esc(f.title)}</b>
      <span class="fa-meta">${[f.type, f.year, f.eps ? f.eps + " eps" : ""].filter(Boolean).map(esc).join('<span class="fa-sep">·</span>')}</span>
      <span class="fa-meta"><b class="st-${isDone(f) ? "done" : "on"}">${isDone(f) ? "Tamat" : "Ongoing"}</b><span class="fa-sep">·</span>disimpan ${esc(ago(f.at))}</span></span><span class="mu">${icon("chev", 18)}</span></a>`;
    const hrow = (h, i) => { const p = h.dur ? Math.max(4, Math.min(100, Math.round((h.t / h.dur) * 100))) : 0;
      return `<a class="fa-row" href="${aHref(h.id)}" style="--i:${i}">${acv(h.cover, h.title, "sm")}<span class="fa-mid"><b class="fa-t">${esc(h.title)}</b>
      <span class="fa-meta"><b class="fa-rd">Episode ${esc(h.ep ?? "?")}</b>${h.dur ? `<span class="fa-sep">·</span>${fmtT(h.t)} / ${fmtT(h.dur)}` : ""}</span>
      <span class="fa-meta">${esc(ago(h.at))}</span>${p ? `<span class="fa-bar"><i style="width:${p}%"></i></span>` : ""}</span>
      <span class="hl-go">${icon("play", 12, 2.6)}Lanjut</span></a>`; };
    const empty = (ic, t, s, btn) => `<div class="empty"><span class="empty-ic">${icon(ic, 24)}</span><b>${t}</b><span>${s}</span>${btn ? `<a class="btn ghost" href="#/cari">${btn}</a>` : ""}</div>`;
    view.innerHTML = `<div class="page-h"><h1>Favorit</h1></div>
<div class="px"><div class="seg" role="tablist">${tabs.map(([k, n]) => `<button role="tab" aria-selected="${fv.tab === k}" data-act="tab" data-v="${k}">${n}</button>`).join("")}</div>
<div class="note">${icon("cloud", 18)}<span>Tersimpan di HP ini saja. Buat cadangan di <a href="#/akun">Akun → Backup data offline</a>.</span></div>
<div class="row g8 mt14"><label class="search sm grow">${icon("search", 18)}<input id="fq" type="search" autocomplete="off" placeholder="${fv.tab === "hist" ? "Cari di riwayat" : "Cari di koleksimu"}" value="${esc(fv.q)}"></label>
${fv.tab === "lib" ? `<button class="sq-btn lg" data-act="sort" aria-label="Urutkan: ${esc(SORTS.find(([k]) => k === sk)[1])}">${icon("sort", 18, 2)}</button><button class="sq-btn lg" data-act="view" aria-label="${grid() ? "Tampilan daftar" : "Tampilan grid"}">${icon(grid() ? "list" : "grid", 18, 2)}</button>`
  : hs.length ? `<button class="sq-btn lg" data-act="clearHist" aria-label="Hapus riwayat">${icon("trash", 18, 2)}</button>` : ""}</div>
${fv.tab === "lib" ? `<div class="chips fv-chips" role="group">${[["all", "Semua", all.length], ["on", "Ongoing", on.length], ["done", "Tamat", done.length]].map(([k, n, c]) => `<button aria-pressed="${fv.filter === k}" data-act="ftab" data-v="${k}">${n}<b>${c}</b></button>`).join("")}</div>` : ""}</div>
<div class="px" id="fvBody">${fv.tab === "hist"
  ? (hl.length ? `<div class="fa-rows">${hl.map(hrow).join("")}</div>` : hs.length ? empty("search", "Tidak ditemukan", "Coba kata lain.") : empty("clock", "Riwayat masih kosong", "Anime yang kamu tonton muncul di sini.", "Cari anime"))
  : !all.length ? empty("heart", "Koleksi masih kosong", "Tekan Simpan di halaman info anime untuk menyimpannya di sini.", "Cari anime")
  : !lib.length ? empty("search", "Tidak ditemukan", q ? "Coba kata lain." : "Belum ada anime di kelompok ini.")
  : grid() ? `<div class="an-grid mt8">${lib.map(card).join("")}</div>` : `<div class="mn-rows">${lib.map(row).join("")}</div>`}</div>
<div class="pad-nav"></div>`;
    const fq = $("#fq");
    let t = 0; fq.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { fv.q = fq.value; const pos = fq.selectionStart; draw(); const n = $("#fq"); n.focus(); n.setSelectionRange(pos, pos); }, 250); });
  };
  draw();
  x.setActs({
    tab: (el) => { if (fv.tab === el.dataset.v) return; fv.tab = el.dataset.v; fv.q = ""; draw(); },
    ftab: (el) => { fv.filter = el.dataset.v; draw(); },
    view: () => { api.lsSet("favView", grid() ? "list" : "grid"); draw(); },
    sort: async () => { const v = await pick("Urutkan koleksi", SORTS, sortKey()); if (v) { api.lsSet("favSort", v); draw(); } },
    clearHist: async () => { if (await ask("Semua riwayat tonton di HP ini akan dihapus.", { title: "Hapus riwayat?", ok: "Hapus", danger: true })) { api.lsSet("animeHist", []); draw(); } },
  });
  if (await refreshFavs()) draw();
}
