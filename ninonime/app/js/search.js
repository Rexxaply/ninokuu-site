// NinoNime · Pencarian (disusun seperti Pencarian Ninokuu): kotak cari + tombol hapus, chip jenis + tombol tampilan,
// keterangan hasil, hasil daftar/grid, muat lainnya otomatis.
import * as api from "./api.js";
import { esc, icon, $ } from "./ui.js";
import { A } from "./data.js";
import { acard, arow, viewBtn, errHtml, skCards } from "./lib.js";

const TYPES = [["", "Semua"], ["tv", "TV"], ["movie", "Movie"], ["ova", "OVA"], ["ona", "ONA"], ["special", "Spesial"]];
export let sq = "", sMem = null;
let sType = "";
const isGrid = () => api.lsGet("searchView", "list") === "grid";

export async function vSearch(view, x) {
  view.innerHTML = `<div class="page-h"><h1>Pencarian</h1></div>
<form class="px" id="asf" role="search"><label class="search"><span class="mu">${icon("search", 20)}</span><span class="sr">Cari judul</span>
  <input id="asq" type="search" enterkeyhint="search" autocomplete="off" placeholder="Cari judul anime, mis. One Piece" value="${esc(sq)}">
  <button type="button" class="clr" data-act="clear" aria-label="Hapus pencarian" ${sq ? "" : "hidden"}>${icon("x", 16, 2.2)}</button></label></form>
<div class="px t-row"><div class="chips" id="tchips" role="group" aria-label="Jenis">${TYPES.map(([v, n]) => `<button type="button" aria-pressed="${sType === v}" data-act="type" data-v="${v}">${n}</button>`).join("")}</div><span id="vbtn">${viewBtn(isGrid(), "view")}</span></div>
<div class="sec-h px mt6"><span class="mu sm" id="sinfo"></span></div>
<div id="ares" class="px"></div>
<button class="more-auto" data-act="more" id="sMore" hidden><span class="spin-s" aria-hidden="true"></span>Memuat lainnya…</button>
<div class="pad-nav"></div>`;
  let items = [], page = 1, next = false, seq = 0, busy = false;
  const typeName = () => TYPES.find(([v]) => v === sType)?.[1] || "";
  const draw = () => {
    $("#sinfo").textContent = (sq ? `Hasil “${sq}”` : "Sedang tayang musim ini") + (sType ? ` · ${typeName()}` : "") + (items.length ? ` · ${items.length} judul` : "");
    $("#ares").innerHTML = items.length ? (isGrid() ? `<div class="an-grid">${items.map((a, i) => acard(a, i)).join("")}</div>` : `<div class="mn-rows">${items.map((a, i) => arow(a, i)).join("")}</div>`)
      : `<div class="empty"><span class="empty-ic">${icon("search", 24)}</span><b>Tidak ditemukan</b><span>Coba judul lain, ejaan Jepang/Inggris, atau jenis lain.</span></div>`;
    $("#sMore").hidden = !next;
  };
  const key = () => JSON.stringify([sq, sType]);
  const load = async (more = false) => {
    if (more && (busy || !next)) return;
    const my = ++seq; busy = more;
    if (!more) {
      if (sMem?.key === key()) { ({ items, page, next } = sMem); draw(); return; }
      page = 1; $("#ares").innerHTML = isGrid() ? skCards(6) : `<div class="sk-wrap">${'<div class="sk sk-lrow"></div>'.repeat(6)}</div>`; $("#sMore").hidden = true;
    }
    try {
      const p = more ? page + 1 : 1;
      const r = sq ? await A.search(sq, p, sType) : await A.now(p, sType);
      if (my !== seq || !$("#ares")) return;
      const seen = new Set(more ? items.map((a) => a.id) : []);
      items = (more ? items : []).concat(r.items.filter((a) => !seen.has(a.id))); page = p; next = r.next;
      sMem = { key: key(), items, page, next };
      draw();
    } catch (e) { if (my === seq && $("#ares") && !more) $("#ares").innerHTML = errHtml(e); }
    finally { if (my === seq) busy = false; }
  };
  const inp = $("#asq"), clr = $(".clr");
  let t = 0;
  inp.addEventListener("input", () => { clr.hidden = !inp.value; clearTimeout(t); t = setTimeout(() => { sq = inp.value.trim(); load(); }, 600); });
  $("#asf").addEventListener("submit", (e) => { e.preventDefault(); inp.blur(); clearTimeout(t); sq = inp.value.trim(); load(); });
  // muat lainnya otomatis saat tombol "Memuat lainnya" terlihat
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => { if (es.some((en) => en.isIntersecting)) load(true); }, { rootMargin: "300px" }) : null;
  io?.observe($("#sMore"));
  x.setActs({
    retry: () => load(),
    more: () => load(true),
    clear: () => { inp.value = ""; clr.hidden = true; sq = ""; load(); inp.focus(); },
    type: (el) => { sType = el.dataset.v; document.querySelectorAll("#tchips button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === sType))); load(); },
    view: () => { api.lsSet("searchView", isGrid() ? "list" : "grid"); $("#vbtn").innerHTML = viewBtn(isGrid(), "view"); draw(); },
  });
  await load();
}
