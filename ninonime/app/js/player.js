// NinoNime · modul anime/player (dipecah dari anime.js)
import { esc, icon, $, $$, toast } from "./ui.js";
import { episodeSource } from "./sources.js";
import { AUTO_OPTS, GEAR, mountControls, prefs, setPref, swRow } from "./vctl.js";
import * as api from "./api.js";
import { aHref, acv, hist, saveHist } from "./lib.js";

// layar penuh status bar (APK/Capacitor) bisa disambungkan di sini; di PWA cukup Fullscreen API
const setFullscreen = async () => {};

/* =====================================================================
   Pemutar + mini player
   - Geser video ke bawah → mengecil menjadi jendela melayang di atas bar bawah (video tetap berjalan).
   - Ketuk / geser ke atas jendela melayang → kembali penuh. Geser ke samping / ✕ → tutup.
   Sumber video: trailer YouTube resmi (dari data MyAnimeList) dan episodeSource() di js/sources.js
   (MP4/HLS langsung atau video YouTube).
   ===================================================================== */
// Sumber video episode: lihat js/sources.js

export const player = (() => {
  let root = null, st = "closed", cur = null, ep = 0, list = [], yt = null, ytState = -1, vid = null, ctl = null, src0 = null, srvI = 0, opts = [];
  const build = () => {
    root = document.createElement("div");
    root.className = "ap"; root.hidden = true;
    root.innerHTML = `<div class="ap-dim"></div>
<div class="ap-sheet" role="dialog" aria-label="Pemutar anime">
  <div class="ap-vid"><div class="ap-media"></div>
    <div class="ap-ctl"><button class="ap-ib" data-p="min" aria-label="Kecilkan">${icon("minim", 24, 2.2)}</button><span class="grow"></span><button class="ap-ib" data-p="fs" aria-label="Layar penuh">${icon("fs", 20, 2)}</button></div>
    <span class="ap-mt"><b></b><span></span></span>
    <button class="ap-mb" data-p="pp" aria-label="Putar / jeda">${icon("pause", 22, 2.2)}</button>
    <button class="ap-mb" data-p="close" aria-label="Tutup">${icon("x", 22, 2.2)}</button>
    <span class="ap-bar"><i></i></span><span class="ap-grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
  <div class="ap-body"><span class="ap-grab" aria-hidden="true"></span><div class="ap-info"></div></div>
</div>`;
    document.body.append(root);
    root.addEventListener("click", onClick);
    root.addEventListener("change", onSetting);
    bindDrag();
    window.addEventListener("message", onYtMsg);
  };
  const setState = (s) => { st = s; root.classList.toggle("full", s === "full"); root.classList.toggle("mini", s === "mini"); document.body.classList.toggle("ap-mini", s === "mini"); document.body.classList.toggle("ap-full", s === "full"); };

  /* ----- media ----- */
  const media = () => $(".ap-media", root);
  function load(src, poster) {
    stopMedia();
    const m = media();
    if (!src) {
      m.innerHTML = `<div class="ap-empty" style="--bg:url('${esc(poster ? new URL(poster, location.href).href : "")}')"><span>${icon("tv", 30, 1.8)}</span><b>Video episode ${ep} belum tersedia</b><i>Sumber video untuk episode ini belum ada (js/sources.js).${cur?.trailer ? " Trailer bisa diputar." : ""}</i>${cur?.trailer ? `<button class="btn ghost" data-p="trailer">${icon("play", 16, 2)}Putar trailer</button>` : ""}</div>`;
      syncPP(); return;
    }
    if (src.kind === "yt") {
      const o = encodeURIComponent(location.origin.startsWith("http") ? location.origin : "https://localhost");
      m.innerHTML = `<iframe class="ap-yt" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(src.id)}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&modestbranding=1&origin=${o}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="Pemutar video"></iframe>`;
      yt = $("iframe", m); ytState = -1;
      yt.addEventListener("load", () => { try { yt.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"); } catch {} });
    } else {
      // pemutar kustom: tanpa kontrol bawaan browser, kontrol NinoNime di atas video (js/vctl.js)
      m.innerHTML = `<video class="ap-v" playsinline autoplay preload="metadata" ${poster ? `poster="${esc(poster)}"` : ""}></video>`;
      vid = $("video", m);
      // pilihan sumber: tiap server × resolusi menjadi satu pilihan (resolusi yang terakhir dipilih diingat)
      src0 = src; opts = flatOpts(src);
      const want = api.lsGet("playerSrc") || {};
      srvI = Math.max(0, opts.findIndex((o) => o.s === want.s && o.q === want.q)); if (srvI < 0 || !opts[srvI]) srvI = 0;
      if (want.q && opts[srvI].q !== want.q) { const k = opts.findIndex((o) => o.q === want.q); if (k >= 0) srvI = k; }
      vid.src = opts[srvI].url;
      const myVid = vid, epNow = ep;
      ctl = mountControls(m, vid, {
        intro: src.intro, endingFromEnd: src.endingFromEnd,
        title: () => `Ep ${ep} - ${cur.title}`,
        hasPrev: () => ep > 1, onPrev: () => { if (vid === myVid && ep > 1) go(ep - 1); },
        hasNext: () => !!(ep && (!cur.eps || ep < cur.eps)),
        onNext: () => { if (vid === myVid && ep === epNow) go(ep + 1); },
        onMin: () => minimize(), onFs: () => (fs ? exitFs() : enterFs()),
        res: () => ({ cur: srvI, items: resItems() }), onRes: (k) => setServer(Number(k)),
        eps: () => ({ cur: ep, n: epTotal() }), onEp: (n) => { if (n !== ep) go(n); },
        // server gagal dimuat → coba server berikutnya otomatis
        // sumber gagal dimuat → pindah ke server berikutnya (resolusi sama bila ada)
        onError: () => { if (vid !== myVid) return; const cur0 = opts[srvI];
          const k = opts.findIndex((o, i) => i > srvI && o.s !== cur0.s && o.q === cur0.q), n = k >= 0 ? k : opts.findIndex((o, i) => i > srvI && o.s !== cur0.s);
          if (n >= 0) { toast(`${cur0.s} gagal dimuat, pindah ke ${opts[n].s}`); setServer(n); } else toast("Video gagal dimuat di semua server."); },
      });
      drawSettings();
      const h = hist().find((y) => y.id === cur.id && Number(y.ep) === ep);
      const v = vid, a0 = cur, e0 = ep;   // pendengar memakai video ini sendiri (vid bisa sudah berganti episode)
      v.addEventListener("loadedmetadata", () => { if (h?.t > 5 && h.t < v.duration - 10) v.currentTime = h.t; }, { once: true });
      let lastSave = 0;
      v.addEventListener("timeupdate", () => { if (vid !== v) return; const b = $(".ap-bar i", root); if (b && v.duration) b.style.width = (v.currentTime / v.duration) * 100 + "%"; if (Date.now() - lastSave > 5000) { lastSave = Date.now(); saveHist(a0, e0, v.currentTime, v.duration); } });
      vid.addEventListener("play", syncPP); vid.addEventListener("pause", syncPP);
    }
    syncPP();
  }
  // { s: nama server, q: resolusi, url } untuk tiap pilihan
  const flatOpts = (src) => { const svs = src.servers?.length ? src.servers : [{ name: "Server 1", url: src.url }];
    return svs.flatMap((v) => (v.q?.length ? v.q.map((q) => ({ s: v.name, q: q.label, url: q.url })) : [{ s: v.name, q: "", url: v.url }])); };
  // pindah server / resolusi: posisi & status putar dipertahankan
  function setServer(i) {
    if (!vid || !src0 || !opts[i]) return;
    const t = vid.currentTime, playing = !vid.paused; srvI = i; api.lsSet("playerSrc", { s: opts[i].s, q: opts[i].q });
    const v = vid; v.src = opts[i].url;
    v.addEventListener("loadedmetadata", () => { if (t > 1) v.currentTime = t; if (playing) v.play().catch(() => {}); }, { once: true });
    drawSettings();
  }
  const RES_TAG = { "2160p": "4K", "1440p": "2K", "1080p": "FHD", "720p": "HD", "480p": "SD", "360p": "SD" };
  const servers = () => [...new Set(opts.map((o) => o.s))];
  // resolusi di server yang sedang dipakai
  const resItems = () => opts.map((o, i) => [o, i]).filter(([o]) => o.s === opts[srvI]?.s).map(([o, i]) => ({ v: i, label: o.q || o.s, tag: RES_TAG[o.q] || "" }));
  const epTotal = () => Math.max(cur?.eps || 0, list.length, ep);
  // chip [720p | Ganti] dan [S1 | Ganti Server] + kartu sakelar putar otomatis
  function drawSettings() {
    const chips = root && $(".ap-chips", root);
    const has = !!(vid && src0 && opts[srvI]);
    if (chips) { chips.classList.toggle("nosrc", !has); if (has) { $('[data-lbl="res"]', chips).textContent = opts[srvI].q || "Auto"; $('[data-lbl="srv"]', chips).textContent = "S" + (servers().indexOf(opts[srvI].s) + 1); } }
    ctl?.labels();
  }
  // menu Pengaturan (sakelar putar otomatis) di dekat chip; tetap terbuka saat sakelar diketuk
  function setMenu(anchor) {
    popClose?.();
    const p = prefs(), host = document.createElement("div"); host.className = "pop-host";
    host.innerHTML = `<div class="pop menu" role="dialog" aria-label="Pengaturan putar"><div class="pop-h"><b>Pengaturan putar</b><button class="pop-x" data-pp="x" aria-label="Tutup">${icon("x", 18, 2.4)}</button></div>
      <div class="sw-list">${AUTO_OPTS.map(([k, t, sub]) => swRow(k, t, sub, !!p[k])).join("")}</div>
      ${src0?.demo ? `<p class="pop-note">Video demo: “Big Buck Bunny” © Blender Foundation (CC BY 3.0). Di demo, semua resolusi satu server memutar file yang sama.</p>` : ""}</div>`;
    document.body.append(host);
    const card = $(".pop", host), r = anchor.getBoundingClientRect(), w = Math.min(innerWidth - 24, 340);
    card.style.width = w + "px"; const left = Math.min(innerWidth - w - 12, Math.max(12, r.right - w));
    const h = card.offsetHeight, below = r.bottom + 8 + h < innerHeight - 12;
    card.style.left = left + "px"; card.style.top = (below ? r.bottom + 8 : Math.max(12, r.top - 8 - h)) + "px";
    card.style.transformOrigin = `${Math.round(r.left + r.width / 2 - left)}px ${below ? 0 : h}px`;
    requestAnimationFrame(() => host.classList.add("on"));
    const close = popClose = () => { popClose = null; host.classList.remove("on"); host.classList.add("off"); setTimeout(() => host.remove(), 200); };
    host.addEventListener("click", (e) => {
      const sw = e.target.closest("[data-sw]");
      if (sw) { const on = sw.getAttribute("aria-checked") !== "true"; setPref(sw.dataset.sw, on); sw.setAttribute("aria-checked", String(on)); return; }
      if (!e.target.closest(".pop") || e.target.closest('[data-pp="x"]')) close();
    });
  }
  // kartu pilihan melayang di dekat chip (Pilih Resolusi / Ganti Server)
  let popClose = null;
  function popCard(anchor, { title, items, cur: curV, onPick, compact }) {
    popClose?.();
    const host = document.createElement("div"); host.className = "pop-host";
    host.innerHTML = `<div class="pop${compact ? " compact" : ""}" role="dialog" aria-label="${esc(title)}">${compact ? "" : `<div class="pop-h"><b>${esc(title)}</b><button class="pop-x" data-pp="x" aria-label="Tutup">${icon("x", 18, 2.4)}</button></div>`}
      <div class="pop-l">${items.map((it) => { const on = String(it.v) === String(curV); return `<button class="pop-o${on ? " on" : ""}" data-pp="v" data-k="${esc(it.v)}" aria-pressed="${on}">${it.badge ? `<i class="pop-b">${esc(it.badge)}</i>` : ""}<b>${esc(it.label)}</b>${it.tag ? `<span>${esc(it.tag)}</span>` : ""}</button>`; }).join("")}</div></div>`;
    document.body.append(host);
    const card = $(".pop", host), r = anchor.getBoundingClientRect(), w = Math.min(innerWidth - 24, compact ? 240 : 360);
    card.style.width = w + "px";
    const left = compact ? Math.min(innerWidth - w - 12, Math.max(12, r.left)) : (innerWidth - w) / 2;
    const h = card.offsetHeight, below = r.bottom + 8 + h < innerHeight - 12;
    card.style.left = left + "px"; card.style.top = (below ? r.bottom + 8 : Math.max(12, r.top - 8 - h)) + "px";
    card.style.transformOrigin = `${Math.round(r.left + r.width / 2 - left)}px ${below ? 0 : h}px`;
    requestAnimationFrame(() => host.classList.add("on"));
    const close = popClose = (v) => { popClose = null; host.classList.remove("on"); host.classList.add("off"); setTimeout(() => host.remove(), 200); if (v != null) onPick(v); };
    host.addEventListener("click", (e) => { const b = e.target.closest("[data-pp]"); if (!b) { close(); return; } if (b.dataset.pp === "x") close(); else close(b.dataset.k); });
  }
  function pickRes(anchor) {
    popCard(anchor, { title: "Pilih Resolusi", items: resItems(), cur: srvI, onPick: (k) => { if (Number(k) !== srvI) setServer(Number(k)); } });
  }
  function pickSrv(anchor) {
    const sv = servers(), q0 = opts[srvI]?.q;
    popCard(anchor, { title: "Ganti Server", compact: true, cur: opts[srvI]?.s, items: sv.map((n, i) => ({ v: n, label: n, badge: "S" + (i + 1) })),
      onPick: (name) => { if (name === opts[srvI]?.s) return; let k = opts.findIndex((o) => o.s === name && o.q === q0); if (k < 0) k = opts.findIndex((o) => o.s === name); if (k >= 0) { setServer(k); toast(`Server ${name}${opts[k].q ? " · " + opts[k].q : ""}`); } } });
  }
  function onSetting(e) {
    const t = e.target.closest?.("[data-ps]"); if (!t) return;
    const k = t.dataset.ps;
    setPref(k, t.checked);
  }
  function stopMedia() { ctl?.destroy(); ctl = null; src0 = null; if (vid) { try { vid.pause(); } catch {} vid.removeAttribute("src"); vid.load?.(); } vid = null; yt = null; ytState = -1; const m = root && media(); if (m) m.innerHTML = ""; }
  const ytCmd = (func) => { try { yt?.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*"); } catch {} };
  function onYtMsg(e) {
    if (!yt || e.source !== yt.contentWindow) return;
    let d; try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
    const s = d?.info?.playerState ?? (d?.event === "onStateChange" ? d.info : undefined);
    if (typeof s === "number") { ytState = s; syncPP(); }
    const ct = d?.info?.currentTime, du = d?.info?.duration;
    if (ct != null && du) { const b = $(".ap-bar i", root); if (b) b.style.width = (ct / du) * 100 + "%"; }
  }
  const playing = () => (vid ? !vid.paused : yt ? ytState === 1 || ytState === 3 || ytState === -1 : false);
  const syncPP = () => { const b = $("[data-p=pp]", root); if (b) { b.innerHTML = icon(playing() ? "pause" : "play", 22, 2.2); b.hidden = !vid && !yt; } };
  const toggle = () => { if (vid) vid.paused ? vid.play() : vid.pause(); else if (yt) { ytCmd(playing() ? "pauseVideo" : "playVideo"); ytState = playing() ? 2 : 1; syncPP(); } };

  /* ----- isi info di bawah video ----- */
  function info() {
    const a = cur, n = Math.max(a.eps || 0, list.length, ep);
    const e = list.find((y) => y.n === ep);
    $(".ap-mt b", root).textContent = a.title;
    $(".ap-mt span", root).textContent = ep ? `Episode ${ep}` : "Trailer";
    $(".ap-info", root).innerHTML = `
  <div class="ap-hd"><b class="ap-t">${esc(a.title)}</b><span class="ap-sub">${ep ? `Episode ${ep}${e?.title && !/^episode\s*\d+$/i.test(e.title) ? " · " + esc(e.title) : ""}` : "Trailer resmi"}</span></div>
  <div class="ap-chips nosrc">
    <button class="pc" data-p="res" aria-label="Ganti resolusi"><i class="pc-b" data-lbl="res">720p</i>Ganti</button>
    <button class="pc" data-p="srv" aria-label="Ganti server"><i class="pc-b" data-lbl="srv">S1</i>Ganti Server</button>
    <button class="pc" data-p="set" aria-label="Pengaturan putar">${GEAR}Pengaturan</button>
    ${a.trailer ? `<button class="pc" data-p="trailer">${icon("tv", 16, 2)}Trailer</button>` : ""}
    <button class="pc" data-p="info">${icon("info", 16, 2)}Info</button></div>
  ${n ? `<div class="ap-eph"><b>Episode</b><span class="mu sm">${n} episode</span></div><div class="ap-eps">${Array.from({ length: n }, (_, i) => `<button class="ap-e${i + 1 === ep ? " on" : ""}" data-p="ep" data-v="${i + 1}" aria-label="Episode ${i + 1}">${i + 1}</button>`).join("")}</div>` : ""}
  ${a.synopsis ? `<p class="ap-syn">${esc(a.synopsis.slice(0, 360))}${a.synopsis.length > 360 ? "…" : ""}</p>` : ""}
  <div style="height:calc(40px + env(safe-area-inset-bottom))"></div>`;
    drawSettings();
    requestAnimationFrame(() => { const b = $(".ap-eps .ap-e.on", root); if (b) b.parentElement.scrollLeft = b.offsetLeft - b.parentElement.clientWidth / 2 + b.offsetWidth / 2; });
  }
  async function go(n) {
    ep = n; info();
    if (!n) { load(cur.trailer ? { kind: "yt", id: cur.trailer } : null, cur.cover); return; }
    saveHist(cur, n);
    load(null, cur.cover); $(".ap-empty b", root) && ($(".ap-empty b", root).textContent = "Memuat video…");
    let src = null; try { src = await episodeSource(cur, n); } catch {}
    if (cur && ep === n) load(src, cur.cover);
  }

  /* ----- buka / kecilkan / tutup (animasi FLIP: video berpindah halus antara penuh ↔ melayang) ----- */
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* penuh → melayang: seluruh kotak pemutar menyusut dari posisi video ke kotak melayang (bukan hanya videonya,
     yang dulu terpotong oleh kotak mini → kotak tampak kosong sesaat). Halaman di bawahnya langsung terlihat. */
  let morphing = null;
  function toMini() {
    const v = media(), sh = $(".ap-sheet", root);
    const a = v.getBoundingClientRect();   // posisi video saat ini (termasuk pratinjau geser)
    const vid0 = $(".ap-vid", root); vid0.style.transform = ""; vid0.style.transformOrigin = ""; vid0.style.borderRadius = ""; vid0.style.overflow = ""; vid0.style.transition = "";
    sh.style.backgroundColor = ""; sh.style.transform = ""; sh.style.transition = ""; v.style.transform = ""; root.style.removeProperty("--p");
    applyMiniPos(); setState("mini");
    if (reduce()) return;
    const b = sh.getBoundingClientRect(), mw = v.getBoundingClientRect().width;
    morphing?.cancel?.();
    root.classList.add("morph");
    const ease = "cubic-bezier(.32,.72,0,1)", dur = 420;
    const k = sh.animate([
      { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px", borderRadius: "0px", backgroundColor: "rgba(0,0,0,1)" },
      { left: b.left + "px", top: b.top + "px", width: b.width + "px", height: b.height + "px", borderRadius: "18px" }],
      { duration: dur, easing: ease });
    v.animate([{ width: a.width + "px" }, { width: mw + "px" }], { duration: dur, easing: ease });
    $$(".ap-mt, .ap-mb, .ap-bar", root).forEach((el) => el.animate([{ opacity: 0, transform: "translateX(-8px)" }, { opacity: 1, transform: "none" }], { duration: 220, delay: dur * 0.55, easing: "ease-out", fill: "backwards" }));
    morphing = k;
    const done = () => { if (morphing === k) { morphing = null; root.classList.remove("morph"); } };
    k.onfinish = done; k.oncancel = done;
  }
  function flip(to) {
    if (to === "mini") return toMini();
    morphing?.cancel?.(); pushEntry();
    const v = media(), sh = $(".ap-sheet", root);
    const a = v.getBoundingClientRect();
    sh.style.transform = ""; sh.style.transition = ""; v.style.transform = ""; root.style.removeProperty("--p");
    setState(to);
    if (reduce()) return;
    const b = v.getBoundingClientRect();
    const sx = a.width / b.width, sy = a.height / b.height;
    v.animate([{ transformOrigin: "0 0", transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${sx}, ${sy})` }, { transformOrigin: "0 0", transform: "none" }], { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)" });
    if (to === "full") { $(".ap-body", root).animate([{ opacity: 0, transform: "translateY(40px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" }); $(".ap-dim", root).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 }); }
  }
  function open(a, n = 1, eps = []) {
    if (!root) build();
    const same = cur && cur.id === a.id && ep === n && st !== "closed";
    cur = a; list = eps || [];
    if (st === "closed") { root.hidden = false; setState("full"); pushEntry(); if (!reduce()) $(".ap-sheet", root).animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)" }); }
    else if (st === "mini") flip("full");
    if (!same) go(n);
  }
  /* Tombol / gestur kembali HP saat pemutar terbuka penuh → jadi jendela melayang, halaman di bawahnya tetap
     (bukan pindah halaman). Caranya: selama penuh ada satu entri riwayat tambahan dengan alamat yang sama. */
  let histOn = false, popSkip = 0, afterPop = null;
  const pushEntry = () => { if (histOn) return; try { history.pushState({ nnPlayer: 1 }, ""); histOn = true; } catch {} };
  const dropEntry = (then) => { if (!histOn) { then?.(); return; } histOn = false; popSkip++; afterPop = then || null; history.back(); };
  addEventListener("popstate", () => {
    if (popSkip) { popSkip--; const f = afterPop; afterPop = null; f?.(); return; }
    if (histOn) { histOn = false; if (popClose) popClose(); ctl?.closePanel(); if (st === "full") { exitFs(); flip("mini"); } }
  });
  function minimize(then) { if (st === "full") { exitFs(); flip("mini"); } dropEntry(then); }
  function close() {
    if (st === "closed") return;
    dropEntry();
    exitFs();
    const sh = $(".ap-sheet", root);
    const end = () => { stopMedia(); root.hidden = true; setState("closed"); sh.style.transform = ""; sh.style.opacity = ""; };
    if (reduce()) return end();
    sh.animate([{ transform: sh.style.transform || "none", opacity: 1 }, { transform: (sh.style.transform || "") + (st === "mini" ? " translateY(120%)" : " translateY(100%)"), opacity: st === "mini" ? 0 : 1 }], { duration: 240, easing: "ease-in" }).onfinish = end;
  }
  // tombol kembali HP (dipanggil dari main.js): pemutar penuh → kecilkan dulu, tidak meninggalkan halaman
  const onBack = () => { if (popClose) { popClose(); return true; } if (ctl?.closePanel()) return true; if (fs) { exitFs(); return true; } if (st === "full") { minimize(); return true; } return false; };

  /* ----- layar penuh (miring) ----- */
  let fs = false;
  async function enterFs() {
    const v = $(".ap-vid", root); fs = true; document.body.classList.add("ap-fs"); root.classList.add("fs");
    try { await (v.requestFullscreen?.() || v.webkitRequestFullscreen?.()); } catch {}
    try { await screen.orientation?.lock?.("landscape"); } catch {}
    setFullscreen(true).catch?.(() => {});
  }
  function exitFs() {
    if (!fs) return; fs = false; document.body.classList.remove("ap-fs"); root?.classList.remove("fs");
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
    try { screen.orientation?.unlock?.(); } catch {}
    setFullscreen(false, false)?.catch?.(() => {});
  }
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && fs) exitFs(); });

  function onClick(e) {
    const b = e.target.closest("[data-p]");
    if (st === "mini" && Date.now() - dragged < 400) return;
    if (st === "mini" && !b) { flip("full"); return; }
    if (!b) return;
    const p = b.dataset.p;
    if (p === "res") { if (vid && src0) pickRes(b); }
    else if (p === "set") setMenu(b);
    else if (p === "srv") { if (vid && src0) pickSrv(b); }
    else if (p === "min") minimize();
    else if (p === "close") close();
    else if (p === "pp") toggle();
    else if (p === "fs") fs ? exitFs() : enterFs();
    else if (p === "prev" && ep > 1) go(ep - 1);
    else if (p === "next") go(ep + 1);
    else if (p === "ep") go(Number(b.dataset.v));
    else if (p === "trailer") go(0);
    else if (p === "info") { const h = aHref(cur.id); minimize(() => { location.hash = h; }); }
  }

  /* ----- geser: penuh → bawah (kecilkan), melayang → atas (buka) / samping (tutup) ----- */
  // posisi jendela melayang: tepi kiri/kanan + geser vertikal (diingat selama aplikasi terbuka)
  const miniPos = { side: "right", y: 0 }; let dragged = 0;
  const applyMiniPos = () => { root.classList.toggle("mleft", miniPos.side === "left"); root.style.setProperty("--my", miniPos.y + "px"); };
  function bindDrag() {
    const sh = $(".ap-sheet", root), body = $(".ap-body", root);
    let y0 = 0, x0 = 0, dy = 0, dx = 0, t0 = 0, on = false, axis = "", A = null, M = null;
    const H = () => window.innerHeight;
    const vEl = () => $(".ap-vid", root);
    // tujuan pratinjau: kotak video di jendela melayang (kanan/kiri bawah)
    const miniVideoRect = () => {
      const w = 216, h = w * 9 / 16, card = h + 52, nav = document.body.classList.contains("nav-off") ? 14 : 14 + 68 + 12;
      const bottom = innerHeight - nav + Math.min(0, miniPos.y), top = bottom - card;
      return { left: miniPos.side === "left" ? 12 : innerWidth - 12 - w, top, width: w, height: h };
    };
    // geser ke bawah: video ikut jari langsung menuju posisi jendela melayang, latar pemutar memudar
    const preview = (p) => {
      const R = { left: A.left + (M.left - A.left) * p, top: A.top + (M.top - A.top) * p, width: A.width + (M.width - A.width) * p };
      const v = vEl(); v.style.transition = "none"; v.style.transformOrigin = "0 0";
      v.style.transform = `translate(${(R.left - A.left).toFixed(1)}px, ${(R.top - A.top).toFixed(1)}px) scale(${(R.width / A.width).toFixed(4)})`;
      v.style.borderRadius = `${(p * 14).toFixed(1)}px`; v.style.overflow = "hidden";
      sh.style.backgroundColor = `rgba(11, 16, 24, ${(1 - p).toFixed(3)})`;
      root.style.setProperty("--p", p.toFixed(3));
    };
    const clearPreview = () => { const v = vEl(); v.style.transform = ""; v.style.transformOrigin = ""; v.style.borderRadius = ""; v.style.overflow = ""; v.style.transition = ""; sh.style.backgroundColor = ""; root.style.removeProperty("--p"); };
    sh.addEventListener("touchstart", (e) => {
      if (fs || e.touches.length > 1) return;
      const inBody = body.contains(e.target);
      if (st === "full" && inBody && body.scrollTop > 0) return;
      if (e.target.closest("iframe, video, .vc-seek, .vc-b, .vc-i, .vc-sp, .vc-pn, .vc-skip, .vc-next, .ap-set, .ap-chips, .ap-eps")) return;
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = dx = 0; t0 = Date.now(); on = true; axis = "";
      if (st === "full") { clearPreview(); A = vEl().getBoundingClientRect(); M = miniVideoRect(); }
    }, { passive: true });
    sh.addEventListener("touchmove", (e) => {
      if (!on) return;
      dy = e.touches[0].clientY - y0; dx = e.touches[0].clientX - x0;
      if (!axis) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; axis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x"; }
      if (st === "full") {
        if (axis !== "y" || dy < 0) { if (dy < 0) on = false; return; }
        if (e.cancelable) e.preventDefault();
        preview(Math.min(1, dy / (H() * 0.6)));
      } else if (st === "mini") {
        if (e.cancelable) e.preventDefault();
        sh.style.transition = "none"; sh.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }, { passive: false });
    const end = () => {
      if (!on) return; on = false;
      const v = (Date.now() - t0) || 1, vel = dy / v;
      sh.style.transition = "";
      if (st === "full") {
        if (axis === "y" && (dy > 110 || (vel > 0.6 && dy > 30))) minimize();
        else if (axis === "y" && A) {   // batal: video kembali ke atas
          const v = vEl(), from = v.style.transform, bg = sh.style.backgroundColor; clearPreview();
          v.animate([{ transform: from, transformOrigin: "0 0" }, { transform: "none", transformOrigin: "0 0" }], { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
          sh.animate([{ backgroundColor: bg }, { backgroundColor: "rgb(11, 16, 24)" }], { duration: 240 });
        }
      } else if (st === "mini") {
        if (!axis) return;   // hanya ketukan → onClick membuka penuh
        dragged = Date.now();   // klik sesudah menyeret tidak membuka pemutar
        // dilempar keluar layar ke samping → tutup; selain itu menempel ke tepi kiri / kanan terdekat
        const r = sh.getBoundingClientRect(), cx = r.left + r.width / 2;
        if (r.right < 70 || r.left > innerWidth - 70) { sh.style.opacity = "0"; close(); return; }
        const side = cx < innerWidth / 2 ? "left" : "right";
        miniPos.side = side; miniPos.y = Math.min(0, Math.max(-(innerHeight - 260), miniPos.y + dy));
        const a = sh.getBoundingClientRect(); sh.style.transform = ""; applyMiniPos(); const b = sh.getBoundingClientRect();
        sh.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(.32,.72,0,1)" });
      }
    };
    sh.addEventListener("touchend", end); sh.addEventListener("touchcancel", end);
  }
  return { open, close, minimize, onBack, state: () => st };
})();
