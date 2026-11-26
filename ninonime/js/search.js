// NinoNime · modul anime/search (dipecah dari anime.js)
import { esc, icon, $ } from "./ui.js";
import { A } from "./data.js";
import { acard, errHtml, skCards } from "./lib.js";

// --- Cari ---
export let sq = "", sMem = null;
export async function vSearch(view, x) {
  view.innerHTML = `<div class="page-h"><h1>Cari anime</h1></div>
<form class="search mx" id="asf" role="search"><span class="mu">${icon("search", 19)}</span><input id="asq" type="search" enterkeyhint="search" placeholder="Judul anime, mis. One Piece" value="${esc(sq)}" autocomplete="off"></form>
<div id="ares" class="px mt14"></div><div class="pad-nav"></div>`;
  const drawRes = (r) => { $("#ares").innerHTML = r.items.length ? `<div class="an-grid">${r.items.map((a, i) => acard(a, i)).join("")}</div>` : `<div class="empty"><b>Tidak ditemukan</b><span class="mu sm">Coba judul lain atau ejaan Jepang/Inggris.</span></div>`; };
  const run = async () => {
    const q = $("#asq").value.trim(); sq = q;
    if (!q) { const r = await A.now(1).catch(() => null); if (r && $("#ares")) $("#ares").innerHTML = `<h2 class="cap">Sedang tayang</h2><div class="an-grid">${r.items.map((a, i) => acard(a, i)).join("")}</div>`; return; }
    if (sMem?.q === q) return drawRes(sMem.r);
    $("#ares").innerHTML = skCards(6);
    try { const r = await A.search(q); sMem = { q, r }; if ($("#ares") && sq === q) drawRes(r); } catch (e) { if ($("#ares")) $("#ares").innerHTML = errHtml(e); }
  };
  $("#asf").addEventListener("submit", (e) => { e.preventDefault(); $("#asq").blur(); run(); });
  let t = 0; $("#asq").addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 650); });
  x.setActs({ retry: run });
  await run();
}

