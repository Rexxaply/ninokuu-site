// Bantuan tampilan kecil: escape HTML, ikon, toast, dialog konfirmasi.
import { ICONS } from "./icons.js";
export { ICONS };

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const icon = (name, size = 22, sw = 1.8) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let toastTimer = null;
export function toast(msg, ms = 2600) {
  const el = $("#toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

// dialog konfirmasi → Promise<boolean>
let askOpen = null;
export const closeAsk = () => { if (!askOpen) return false; askOpen(false); return true; };
export function ask(msg, { title = "", ok = "OK", cancel = "Batal", danger = false } = {}) {
  closeAsk();
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.className = "ask-host";
    host.innerHTML = `<div class="ask-bg" data-a="no"></div><div class="ask glass" role="alertdialog" aria-modal="true">
      ${title ? `<b class="ask-ttl">${esc(title)}</b>` : ""}${msg ? `<p class="ask-msg">${esc(msg)}</p>` : ""}
      <div class="ask-acts">${cancel ? `<button class="ask-b" data-a="no">${esc(cancel)}</button>` : ""}<button class="ask-b ${danger ? "danger" : "ok"}" data-a="yes">${esc(ok)}</button></div></div>`;
    document.body.append(host);
    requestAnimationFrame(() => host.classList.add("on"));
    const finish = (v) => { askOpen = null; host.classList.remove("on"); host.classList.add("off"); setTimeout(() => host.remove(), 180); resolve(v); };
    host.addEventListener("click", (e) => { const a = e.target.closest("[data-a]")?.dataset.a; if (a) finish(a === "yes"); });
    askOpen = finish;
  });
}
