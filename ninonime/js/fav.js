// NinoNime · modul anime/fav (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $ } from "./ui.js";
import { A } from "./data.js";
import { aHref, acv } from "./lib.js";

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
let favTab = "all";
export async function vFav(view, x) {
  const draw = () => {
    const list = favs(), on = list.filter((f) => !isDone(f)), done = list.filter(isDone);
    const card = (f, i) => `<a class="an-card" href="${aHref(f.id)}" style="--i:${i}"><span class="an-cv">${acv(f.cover, f.title)}<span class="an-new ${isDone(f) ? "done" : ""}">${isDone(f) ? "Tamat" : "Ongoing"}</span>${f.eps ? `<span class="an-eps">${f.eps} eps</span>` : ""}</span><b class="t2">${esc(f.title)}</b><span class="mu xs">${esc([f.type, f.year].filter(Boolean).join(" · "))}</span></a>`;
    const sec = (title, arr, cls) => arr.length ? `<section class="fv-sec"><h2 class="fv-h ${cls}">${title}<span>${arr.length}</span></h2><div class="an-grid">${arr.map(card).join("")}</div></section>` : "";
    const tabs = [["all", "Semua", list.length], ["on", "Ongoing", on.length], ["done", "Tamat", done.length]];
    view.innerHTML = `<div class="page-h"><h1>Favorit</h1><span class="mu sm">${list.length} anime · ${on.length} masih tayang</span>
  <div class="chips fv-chips" role="group">${tabs.map(([k, n, c]) => `<button aria-pressed="${favTab === k}" data-act="ftab" data-v="${k}">${n}<b>${c}</b></button>`).join("")}</div></div>
<div class="px" id="fvBody" data-t="${favTab}">${!list.length ? `<div class="empty"><span class="empty-ic">${icon("heart", 24)}</span><b>Belum ada anime favorit</b><span class="mu sm">Tekan Simpan di halaman info anime.</span></div>`
  : favTab === "on" ? sec("Ongoing", on, "on") || `<div class="empty"><b>Tidak ada yang masih tayang</b></div>`
  : favTab === "done" ? sec("Tamat", done, "done") || `<div class="empty"><b>Belum ada yang tamat</b></div>`
  : sec("Ongoing", on, "on") + sec("Tamat", done, "done")}</div><div class="pad-nav"></div>`;
  };
  draw();
  x.setActs({ ftab: (el) => { favTab = el.dataset.v; draw(); } });
  if (await refreshFavs()) draw();
}

