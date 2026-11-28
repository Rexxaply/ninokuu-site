// NinoNime · modul anime/player (dipecah dari anime.js)
import { choose, esc, icon, $, $$, toast } from "./ui.js";
import { episodeSource } from "./sources.js";
import { mountControls, prefs, setPref, SPEEDS } from "./vctl.js";
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
    <span class="ap-bar"><i></i></span></div>
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
        hasNext: () => !!(ep && (!cur.eps || ep < cur.eps)),
        onNext: () => { if (vid === myVid && ep === epNow) go(ep + 1); },
        // server gagal dimuat → coba server berikutnya otomatis
        // sumber gagal dimuat → pindah ke server berikutnya (resolusi sama bila ada)
        onError: () => { if (vid !== myVid) return; const cur0 = opts[srvI];
          const k = opts.findIndex((o, i) => i > srvI && o.s !== cur0.s && o.q === cur0.q), n = k >= 0 ? k : opts.findIndex((o, i) => i > srvI && o.s !== cur0.s);
          if (n >= 0) { toast(`${cur0.s} gagal dimuat, pindah ke ${opts[n].s}`); setServer(n); } else toast("Video gagal dimuat di semua server."); },
      });
      drawSettings();
      const h = hist().find((y) => y.id === cur.id && Number(y.ep) === ep);
      vid.addEventListener("loadedmetadata", () => { if (h?.t > 5 && h.t < vid.duration - 10) vid.currentTime = h.t; }, { once: true });
      let lastSave = 0;
      vid.addEventListener("timeupdate", () => { const b = $(".ap-bar i", root); if (b && vid.duration) b.style.width = (vid.currentTime / vid.duration) * 100 + "%"; if (Date.now() - lastSave > 5000) { lastSave = Date.now(); saveHist(cur, ep, vid.currentTime, vid.duration); } });
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
    vid.src = opts[i].url;
    vid.addEventListener("loadedmetadata", () => { if (t > 1) vid.currentTime = t; if (playing) vid.play().catch(() => {}); }, { once: true });
    drawSettings();
  }
  // pengaturan di bawah video: server (dropdown), kecepatan, lewati ending otomatis, episode berikutnya otomatis
  function drawSettings() {
    const box = root && $(".ap-set", root); if (!box) return;
    if (!vid || !src0) { box.innerHTML = ""; return; }
    const p = prefs();
    const sw = (k, t, sub) => `<label class="ps-row ps-sw"><span class="ps-l"><b>${t}</b><span>${sub}</span></span><input type="checkbox" role="switch" data-ps="${k}" ${p[k] ? "checked" : ""}><i class="ps-tg" aria-hidden="true"></i></label>`;
    box.innerHTML = `<div class="ps">
      <div class="ps-row"><span class="ps-l"><b>Server</b><span>Server &amp; resolusi video</span></span><button class="ps-pick" data-pk="server" aria-haspopup="dialog">${esc(optName(opts[srvI]))}${icon("chev", 14, 2.4)}</button></div>
      <div class="ps-row"><span class="ps-l"><b>Kecepatan</b><span>Kecepatan putar video</span></span><button class="ps-pick" data-pk="speed" aria-haspopup="dialog">${speedName(p.speed)}${icon("chev", 14, 2.4)}</button></div>
      ${sw("autoEnd", "Lewati ending otomatis", "Langsung ke akhir saat lagu penutup mulai")}
      ${sw("autoNext", "Episode berikutnya otomatis", "Hitung mundur 5 detik setelah selesai")}
      ${src0.demo ? `<p class="ps-note">Video demo: “Big Buck Bunny” © Blender Foundation (CC BY 3.0). Di demo, semua resolusi satu server memutar file yang sama.</p>` : ""}</div>`;
  }
  const optName = (o) => (o ? (o.q ? `${o.q} ${o.s}` : o.s) : "");
  const speedName = (v) => (Number(v) === 1 ? "Normal" : `${v}×`);
  const RES_TAG = { "2160p": "4K", "1440p": "2K", "1080p": "FHD", "720p": "HD", "480p": "SD", "360p": "SD" };
  // tombol Server / Kecepatan → lembar pilihan NinoNime (bukan dropdown bawaan)
  async function pickSetting(k) {
    if (k === "server") {
      const groups = [...new Set(opts.map((o) => o.s))].map((g) => ({ label: g, items: opts.map((o, i) => [o, i]).filter(([o]) => o.s === g).map(([o, i]) => ({ v: i, label: o.q || g, sub: o.q ? g : "", tag: RES_TAG[o.q] || "" })) }));
      const v = await choose({ title: "Server & resolusi", value: srvI, groups });
      if (v != null && Number(v) !== srvI) setServer(Number(v));
    } else if (k === "speed") {
      const v = await choose({ title: "Kecepatan putar", value: prefs().speed, groups: [{ items: SPEEDS.map((x) => ({ v: x, label: speedName(x), sub: x === 1 ? "Kecepatan asli" : "" })) }] });
      if (v != null) { setPref("speed", Number(v)); if (vid) vid.playbackRate = Number(v); drawSettings(); }
    }
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
  <div class="ap-h">${acv(a.cover, a.title, "sm")}<div class="col g4 grow"><b class="ap-t">${esc(a.title)}</b><span class="mu sm">${ep ? `Episode ${ep}${e?.title && !/^episode\s*\d+$/i.test(e.title) ? " · " + esc(e.title) : ""}` : "Trailer resmi"}</span></div></div>
  <div class="ap-acts">
    <button class="pill-btn" data-p="prev" ${ep > 1 ? "" : "disabled"}>${icon("back", 16, 2)}Sebelumnya</button>
    <button class="pill-btn" data-p="next" ${ep && (!a.eps || ep < a.eps) && (!n || ep < n) ? "" : "disabled"}>Berikutnya${icon("next", 16, 2)}</button>
    ${a.trailer ? `<button class="pill-btn" data-p="trailer">${icon("tv", 16, 2)}Trailer</button>` : ""}
    <button class="pill-btn" data-p="info">${icon("info", 16, 2)}Info</button></div>
  <div class="ap-set"></div>
  ${a.synopsis ? `<p class="ap-syn">${esc(a.synopsis.slice(0, 360))}${a.synopsis.length > 360 ? "…" : ""}</p>` : ""}
  ${n ? `<div class="sec-h"><h2>Daftar episode</h2><span class="mu sm">${n} episode</span></div><div class="ep-grid">${Array.from({ length: n }, (_, i) => `<button class="ep-b${i + 1 === ep ? " on" : ""}" data-p="ep" data-v="${i + 1}">${i + 1}</button>`).join("")}</div>` : ""}
  <div style="height:calc(40px + env(safe-area-inset-bottom))"></div>`;
    drawSettings();
    requestAnimationFrame(() => $(".ap-info .ep-b.on", root)?.scrollIntoView({ block: "nearest", inline: "center" }));
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
    const a = v.getBoundingClientRect();
    sh.style.transform = ""; sh.style.transition = ""; v.style.transform = ""; root.style.removeProperty("--p");
    setState("mini");
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
    morphing?.cancel?.();
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
    if (st === "closed") { root.hidden = false; setState("full"); if (!reduce()) $(".ap-sheet", root).animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)" }); }
    else if (st === "mini") flip("full");
    if (!same) go(n);
  }
  function minimize() { if (st === "full") { exitFs(); flip("mini"); } }
  function close() {
    if (st === "closed") return;
    exitFs();
    const sh = $(".ap-sheet", root);
    const end = () => { stopMedia(); root.hidden = true; setState("closed"); sh.style.transform = ""; sh.style.opacity = ""; };
    if (reduce()) return end();
    sh.animate([{ transform: sh.style.transform || "none", opacity: 1 }, { transform: (sh.style.transform || "") + (st === "mini" ? " translateY(120%)" : " translateY(100%)"), opacity: st === "mini" ? 0 : 1 }], { duration: 240, easing: "ease-in" }).onfinish = end;
  }
  // tombol kembali HP (dipanggil dari main.js): pemutar penuh → kecilkan dulu, tidak meninggalkan halaman
  const onBack = () => { if (fs) { exitFs(); return true; } if (st === "full") { minimize(); return true; } return false; };

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
    const pk = e.target.closest("[data-pk]"); if (pk && st === "full") { pickSetting(pk.dataset.pk); return; }
    const b = e.target.closest("[data-p]");
    if (st === "mini" && !b) { flip("full"); return; }
    if (!b) return;
    const p = b.dataset.p;
    if (p === "min") minimize();
    else if (p === "close") close();
    else if (p === "pp") toggle();
    else if (p === "fs") fs ? exitFs() : enterFs();
    else if (p === "prev" && ep > 1) go(ep - 1);
    else if (p === "next") go(ep + 1);
    else if (p === "ep") go(Number(b.dataset.v));
    else if (p === "trailer") go(0);
    else if (p === "info") { minimize(); location.hash = aHref(cur.id); }
  }

  /* ----- geser: penuh → bawah (kecilkan), melayang → atas (buka) / samping (tutup) ----- */
  function bindDrag() {
    const sh = $(".ap-sheet", root), body = $(".ap-body", root);
    let y0 = 0, x0 = 0, dy = 0, dx = 0, t0 = 0, on = false, axis = "";
    const H = () => window.innerHeight;
    sh.addEventListener("touchstart", (e) => {
      if (fs || e.touches.length > 1) return;
      const inBody = body.contains(e.target);
      if (st === "full" && inBody && body.scrollTop > 0) return;
      if (e.target.closest("iframe, video, .vc-seek, .vc-b, .vc-skip, .vc-next, .ap-set")) return;
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = dx = 0; t0 = Date.now(); on = true; axis = "";
    }, { passive: true });
    sh.addEventListener("touchmove", (e) => {
      if (!on) return;
      dy = e.touches[0].clientY - y0; dx = e.touches[0].clientX - x0;
      if (!axis) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; axis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x"; }
      if (st === "full") {
        if (axis !== "y" || dy < 0) { if (dy < 0) on = false; return; }
        if (e.cancelable) e.preventDefault();
        const p = Math.min(1, dy / (H() * 0.55));
        sh.style.transition = "none"; sh.style.transform = `translateY(${dy}px)`;
        root.style.setProperty("--p", p.toFixed(3));
      } else if (st === "mini") {
        if (e.cancelable) e.preventDefault();
        sh.style.transition = "none";
        if (axis === "x") { sh.style.transform = `translateX(${dx}px)`; sh.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 260)); }
        else if (dy < 0) sh.style.transform = `translateY(${Math.max(dy, -140) * 0.6}px)`;
      }
    }, { passive: false });
    const end = () => {
      if (!on) return; on = false;
      const v = (Date.now() - t0) || 1, vel = dy / v;
      sh.style.transition = "";
      if (st === "full") {
        if (axis === "y" && (dy > 110 || (vel > 0.6 && dy > 30))) minimize();
        else { sh.animate([{ transform: sh.style.transform }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }); sh.style.transform = ""; root.style.removeProperty("--p"); }
      } else if (st === "mini") {
        if (axis === "x" && Math.abs(dx) > 90) { sh.style.opacity = ""; close(); return; }
        if (axis === "y" && dy < -40) { sh.style.transform = ""; flip("full"); return; }
        sh.animate([{ transform: sh.style.transform, opacity: sh.style.opacity || 1 }, { transform: "none", opacity: 1 }], { duration: 200, easing: "ease-out" });
        sh.style.transform = ""; sh.style.opacity = "";
      }
    };
    sh.addEventListener("touchend", end); sh.addEventListener("touchcancel", end);
  }
  return { open, close, minimize, onBack, state: () => st };
})();
