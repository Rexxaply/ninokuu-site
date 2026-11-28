// NinoNime · modul anime/fav (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $, ask } from "./ui.js";
import { A } from "./data.js";
import { aHref, acv, dropHist, hist, histEps } from "./lib.js";
import { player } from "./player.js";
import { toast } from "./ui.js";

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
let fv = { tab: "lib", q: "", filter: "all", sel: null };

/* ---------- Riwayat: Single (satu baris per anime, kartu LANJUTKAN) / Multi (semua episode), dikelompokkan per tanggal ---------- */
const WIB = (t) => new Date((t || 0) + 7 * 3600e3);
const dayKey = (t) => { const d = WIB(t); return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`; };
const MON = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
const dayName = (t, cap) => { const k = dayKey(t), now = Date.now();
  if (k === dayKey(now)) return cap ? "HARI INI" : "Hari ini"; if (k === dayKey(now - 864e5)) return cap ? "KEMARIN" : "Kemarin";
  const d = WIB(t), s = `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; return cap ? s : s.charAt(0) + s.slice(1).toLowerCase().replace(/^(\d+ )(\w)/, (m, a, b) => a + b.toUpperCase()); };
const clock = (t) => { const d = WIB(t); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };
const mmss = (s) => { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${String(m).padStart(2, "0")}:${x}`; };
const hMode = () => (api.lsGet("histMode") === "multi" ? "multi" : "single");
// daftar episode untuk mode Multi (riwayat lama yang belum punya catatan per episode ikut dimasukkan)
const multiList = () => { const e = histEps(), have = new Set(e.map((x) => `${x.id}:${x.ep}`)); return [...e, ...hist().filter((x) => !have.has(`${x.id}:${x.ep}`))].sort((a, b) => b.at - a.at); };
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
  // dari "Lihat Lainnya" di Beranda: #/favorit?tab=hist → langsung tab Riwayat (alamat dibersihkan)
  const qTab = (location.hash.match(/[?&]tab=(lib|hist)\b/) || [])[1];
  if (qTab) { fv.tab = qTab; fv.q = ""; history.replaceState(null, "", location.pathname + location.search + "#/favorit"); }
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
    const body = (l, k = 0) => grid() ? `<div class="an-grid mt8">${l.map((f, i) => card(f, i + k)).join("")}</div>` : `<div class="mn-rows">${l.map((f, i) => row(f, i + k)).join("")}</div>`;
    // tab Semua: bagian ONGOING dan TAMAT terpisah (bagian kosong tidak ditampilkan)
    const groups = (l) => { const a = l.filter((f) => !isDone(f)), b = l.filter(isDone);
      return [["ONGOING", a, 0], ["TAMAT", b, a.length]].filter(([, xs]) => xs.length)
        .map(([t, xs, k]) => `<section class="fv-sec"><h2 class="fv-sh"><span>${t}</span><i>${xs.length}</i></h2>${body(xs, k)}</section>`).join(""); };
    // --- Riwayat ---
    const selOn = !!fv.sel, multi = hMode() === "multi";
    const hvBar = () => selOn
      ? `<div class="hv-bar sel"><button class="sq-btn" data-act="hsel" aria-label="Selesai memilih">${icon("back", 18, 2.2)}</button><b class="hv-n">${fv.sel.size} dipilih</b>
         <button class="hv-all" data-act="hall">Pilih semua</button><button class="sq-btn danger" data-act="hdel" aria-label="Hapus yang dipilih" ${fv.sel.size ? "" : "disabled"}>${icon("trash", 18, 2)}</button></div>`
      : `<div class="hv-bar"><div class="chips hv-mode" role="group" aria-label="Tampilan riwayat"><button aria-pressed="${!multi}" data-act="hmode" data-v="single">Single</button><button aria-pressed="${multi}" data-act="hmode" data-v="multi">Multi</button></div>
         <span class="grow"></span>${hs.length ? `<button class="sq-btn" data-act="hsel" aria-label="Pilih untuk dihapus">${icon("check", 18, 2.2)}</button>` : ""}</div>`;
    const epBox = (e) => { const p = e.dur ? Math.max(2, Math.min(100, Math.round((e.t / e.dur) * 100))) : 0;
      return `<${selOn ? "span" : "button"} class="hv-ep" ${selOn ? "" : `data-act="hplay" data-id="${e.id}" data-ep="${esc(e.ep)}" aria-label="Lanjut ${esc(e.title)} episode ${esc(e.ep)}"`}><span class="hv-eh"><b>Episode ${esc(e.ep ?? "?")}</b><span>${e.dur ? `${mmss(e.t)} / ${mmss(e.dur)}` : "Baru dibuka"}</span></span><span class="hv-bar2"><i style="width:${p}%"></i></span></${selOn ? "span" : "button"}>`; };
    const hvRow = (key, first, eps, i) => { const on = fv.sel?.has(key);
      const inner = `${acv(first.cover, first.title, "hv-cv")}<span class="hv-mid"><span class="hv-top"><b class="hv-t">${esc(first.title)}</b><span class="hv-time">${icon("clock", 13, 2.2)}${clock(first.at)}</span></span>${eps.map(epBox).join("")}</span>${selOn ? `<span class="hv-ck" aria-hidden="true">${on ? icon("check", 14, 3) : ""}</span>` : ""}`;
      return selOn ? `<button class="hv-row pick${on ? " on" : ""}" data-act="hpick" data-k="${esc(key)}" aria-pressed="${!!on}" style="--i:${i}">${inner}</button>`
        : `<div class="hv-row" style="--i:${i}"><a class="hv-lk" href="${aHref(first.id)}" aria-label="Info ${esc(first.title)}"></a>${inner}</div>`; };
    const histBody = () => {
      const match = (h) => !q || String(h.title || "").toLowerCase().includes(q);
      let hero = "", rows;
      if (!multi) {
        const l = hs.filter(match); if (!l.length) return "";
        if (!selOn && !q) { const h = l.shift(), left = h.dur ? Math.max(1, Math.round((h.dur - h.t) / 60)) : 0, p = h.dur ? Math.max(2, Math.round((h.t / h.dur) * 100)) : 0;
          hero = `<div class="hv-hero"><a class="hv-lk" href="${aHref(h.id)}" aria-label="Info ${esc(h.title)}"></a>${acv(h.cover, h.title, "hv-hbg")}<span class="hv-hsh"></span><span class="hv-chip">LANJUTKAN</span>
            <span class="hv-hi"><b class="hv-ht">${esc(h.title)}</b><span class="hv-hm">${icon("clock", 14, 2.2)}${dayName(h.at)} · Eps ${esc(h.ep)}${left ? ` · sisa ${left} menit` : ""}</span></span>
            <button class="hv-play" data-act="hplay" data-id="${h.id}" data-ep="${esc(h.ep)}" aria-label="Lanjut menonton ${esc(h.title)}">${icon("play", 24, 2.4)}</button><span class="hv-hbar"><i style="width:${p}%"></i></span></div>`; }
        rows = l.map((h) => ({ day: dayKey(h.at), at: h.at, key: String(h.id), first: h, eps: [h] }));
      } else {
        const by = new Map();
        multiList().filter(match).forEach((e) => { const k = `${dayKey(e.at)}|${e.id}`; if (!by.has(k)) by.set(k, { day: dayKey(e.at), at: e.at, key: k, first: e, eps: [] }); by.get(k).eps.push(e); });
        rows = [...by.values()];
        if (!rows.length) return "";
      }
      const days = []; rows.forEach((r) => { const d = days.at(-1); if (d && d.day === r.day) d.rows.push(r); else days.push({ day: r.day, at: r.at, rows: [r] }); });
      let i = 0;
      return hero + days.map((d) => `<section class="hv-day"><h2 class="fv-sh hv-dh"><span>${dayName(d.at, true)}</span></h2>${d.rows.map((r) => hvRow(r.key, r.first, r.eps, i++)).join("")}</section>`).join("");
    };
    const empty = (ic, t, s, btn) => `<div class="empty"><span class="empty-ic">${icon(ic, 24)}</span><b>${t}</b><span>${s}</span>${btn ? `<a class="btn ghost" href="#/cari">${btn}</a>` : ""}</div>`;
    view.innerHTML = `<div class="page-h"><h1>Favorit</h1></div>
<div class="px"><div class="seg" role="tablist">${tabs.map(([k, n]) => `<button role="tab" aria-selected="${fv.tab === k}" data-act="tab" data-v="${k}">${n}</button>`).join("")}</div>
<div class="note">${icon("cloud", 18)}<span>Tersimpan di HP ini saja. Buat cadangan di <a href="#/akun">Akun → Backup data offline</a>.</span></div>
<div class="row g8 mt14"><label class="search sm grow">${icon("search", 18)}<input id="fq" type="search" autocomplete="off" placeholder="${fv.tab === "hist" ? "Cari di riwayat" : "Cari di koleksimu"}" value="${esc(fv.q)}"></label>
${fv.tab === "lib" ? `<button class="sq-btn lg" data-act="sort" aria-label="Urutkan: ${esc(SORTS.find(([k]) => k === sk)[1])}">${icon("sort", 18, 2)}</button><button class="sq-btn lg" data-act="view" aria-label="${grid() ? "Tampilan daftar" : "Tampilan grid"}">${icon(grid() ? "list" : "grid", 18, 2)}</button>`
  : ""}</div>
${fv.tab === "hist" ? hvBar() : ""}${fv.tab === "lib" ? `<div class="chips fv-chips" role="group">${[["all", "Semua", all.length], ["on", "Ongoing", on.length], ["done", "Tamat", done.length]].map(([k, n, c]) => `<button aria-pressed="${fv.filter === k}" data-act="ftab" data-v="${k}">${n}<b>${c}</b></button>`).join("")}</div>` : ""}</div>
<div class="px" id="fvBody">${fv.tab === "hist"
  ? (hs.length ? histBody() || empty("search", "Tidak ditemukan", "Coba kata lain.") : empty("clock", "Riwayat masih kosong", "Anime yang kamu tonton muncul di sini.", "Cari anime"))
  : !all.length ? empty("heart", "Koleksi masih kosong", "Tekan Simpan di halaman info anime untuk menyimpannya di sini.", "Cari anime")
  : !lib.length ? empty("search", "Tidak ditemukan", q ? "Coba kata lain." : "Belum ada anime di kelompok ini.")
  : fv.filter === "all" && !q ? groups(lib)
  : body(lib)}</div>
<div class="pad-nav"></div>`;
    const fq = $("#fq");
    let t = 0; fq.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { fv.q = fq.value; const pos = fq.selectionStart; draw(); const n = $("#fq"); n.focus(); n.setSelectionRange(pos, pos); }, 250); });
  };
  draw();
  x.setActs({
    tab: (el) => { if (fv.tab === el.dataset.v) return; fv.tab = el.dataset.v; fv.q = ""; fv.sel = null; draw(); },
    hmode: (el) => { api.lsSet("histMode", el.dataset.v); draw(); },
    hsel: () => { fv.sel = fv.sel ? null : new Set(); draw(); },
    hpick: (el) => { const k = el.dataset.k; fv.sel.has(k) ? fv.sel.delete(k) : fv.sel.add(k); draw(); },
    hall: () => { const keys = [...view.querySelectorAll(".hv-row.pick")].map((b) => b.dataset.k); fv.sel = fv.sel.size === keys.length ? new Set() : new Set(keys); draw(); },
    hdel: async () => {
      const n = fv.sel.size; if (!n) return;
      if (!(await ask(`${n} riwayat yang dipilih akan dihapus dari HP ini.`, { title: "Hapus riwayat?", ok: "Hapus", danger: true }))) return;
      if (hMode() === "multi") { const eps = []; fv.sel.forEach((k) => { const [d, id] = k.split("|"); multiList().filter((e) => String(e.id) === id && dayKey(e.at) === d).forEach((e) => eps.push([e.id, e.ep])); }); dropHist([], eps); }
      else dropHist([...fv.sel].map(Number));
      fv.sel = null; draw(); toast(`${n} riwayat dihapus`);
    },
    // ketuk episode / tombol putar: langsung lanjut menonton
    hplay: async (el) => { el.disabled = true; try { const a = await A.detail(Number(el.dataset.id)); player.open(a, Number(el.dataset.ep) || 1, []); } catch (e) { toast(e.message || "Gagal membuka"); } finally { el.disabled = false; } },
    ftab: (el) => { fv.filter = el.dataset.v; draw(); },
    view: () => { api.lsSet("favView", grid() ? "list" : "grid"); draw(); },
    sort: async () => { const v = await pick("Urutkan koleksi", SORTS, sortKey()); if (v) { api.lsSet("favSort", v); draw(); } },
  });
  if (await refreshFavs()) draw();
}
