// NinoNime · bagian bersama: elemen utama, navigasi hash, penangan [data-act], dan potongan HTML kecil.
// Modul lain (auth, akun, gerbang, bar bawah) hanya memakai ini, jadi tidak saling bergantung.
import { icon, $ } from "./ui.js";

export const VERSION = window.NINONIME_CONFIG?.VERSION || "0.1.0";
export const view = $("#view");
export const nav = $("#nav");

export const go = (h) => { location.hash = h; };
export const goReplace = (h) => { if (h !== location.hash) location.replace(h); };

// render() milik main.js; modul lain memanggilnya lewat sini (tanpa impor melingkar)
let renderFn = () => {};
export const setRender = (f) => { renderFn = f; };
export const rerender = () => renderFn();

// aksi tombol [data-act] di halaman aktif
let acts = {};
export const setActs = (a) => { acts = a; };
view.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]"); if (!el || !view.contains(el)) return;
  const fn = acts[el.dataset.act]; if (fn) { e.preventDefault(); fn(el, e); }
});

export const topbar = (title, right = "") => `<div class="topbar"><button class="icon-btn" data-act="back" aria-label="Kembali">${icon("back", 22)}</button><h1>${title}</h1>${right || '<span class="tb-sp"></span>'}</div>`;
export const loading = (n, cls) => `<div class="sk-wrap">${`<div class="sk ${cls}"></div>`.repeat(n)}</div>`;
export const group = (t, inner) => `<section class="sec"><h2 class="cap">${t}</h2><div class="group">${inner}</div></section>`;
export const mrow = (ic, label, sub, act, danger = false) => `<button class="mrow${danger ? " danger" : ""}" data-act="${act}"><span class="mrow-ic">${icon(ic, 19)}</span><span class="rc-mid"><b>${label}</b>${sub ? `<span class="mu sm">${sub}</span>` : ""}</span>${danger ? "" : `<span class="mu">${icon("chev", 18)}</span>`}</button>`;
