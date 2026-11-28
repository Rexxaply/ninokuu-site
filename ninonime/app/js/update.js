// Pembaruan APK (seperti Ninokuu): saat aplikasi dibuka, kembali dari latar belakang, dan tiap 15 menit dipakai,
// versi terpasang dibandingkan dengan rilis GitHub. Ada yang lebih baru → jendela "Pembaruan tersedia".
//   APK Dev  (versi "0.1.7-dev") → rilis "apk-dev"     (ninonime-dev.apk)
//   APK Main (versi "0.1.7")     → rilis "apk-terbaru" (ninonime.apk)
// Versi web/PWA tidak memakai ini (sudah selalu terbaru lewat service worker).
import { ask, esc, toast } from "./ui.js";
import { VERSION } from "./shell.js";

const REPO = "Rexxaply/NinoNime";
export const isApp = (() => { try { return !!window.Capacitor?.isNativePlatform?.(); } catch { return false; } })();
export const DEV = /-dev$/i.test(VERSION);
const TAG = DEV ? "apk-dev" : "apk-terbaru";
const APK = `https://github.com/${REPO}/releases/download/${TAG}/${DEV ? "ninonime-dev.apk" : "ninonime.apk"}`;
const CACHE = "ninonime:updCache", LATER = "ninonime:updLater";

const nums = (v) => (String(v).match(/\d+(?:\.\d+)*/)?.[0] || "0").split(".").map((n) => parseInt(n, 10) || 0);
export function cmpVersion(a, b) {
  const x = nums(a), y = nums(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? 1 : -1;
  return 0;
}
const kindOf = (from, to) => { const x = nums(from), y = nums(to); return DEV ? "Build baru" : y[0] !== x[0] ? "Pembaruan besar" : y[1] !== x[1] ? "Fitur baru" : "Perbaikan"; };

// judul rilis: "NinoNime Dev v0.1.5-dev" / "NinoNime v0.1.12"; catatan: "Dev v…: <pesan commit>" / "v…: <pesan commit>"
export function fromRelease(j) {
  const version = String(j?.name || "").match(/v(\d+\.\d+\.\d+(?:-dev)?)/i)?.[1];
  if (!version) return null;
  const notes = String(j?.body || "").split(/\r?\n/).map((x) => x.trim().replace(/^(Dev )?v[\d.]+(-dev)?( dari cabang dev)?:\s*/i, "").replace(/^[-•*]\s*/, ""))
    .filter((x) => x && !/^(Co-Authored-By|Claude-Session)/i.test(x)).slice(0, 10);
  return { version, notes, at: j?.published_at || null };
}

// API GitHub tanpa login: 60 permintaan/jam per jaringan → hasil disimpan 10 menit (cek saat dibuka & manual selalu baru)
export async function latest(force = false) {
  let info = null;
  try { const c = JSON.parse(localStorage.getItem(CACHE) || "null"); if (!force && c?.k === TAG && Date.now() - c.t < 10 * 60e3) info = c.info; } catch {}
  if (!info) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${TAG}`, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    info = fromRelease(await r.json());
    if (!info) return null;
    try { localStorage.setItem(CACHE, JSON.stringify({ k: TAG, t: Date.now(), info })); } catch {}
  }
  return { ...info, newer: cmpVersion(info.version, VERSION) > 0, kind: kindOf(VERSION, info.version) };
}

let open = false;
async function show(r) {
  if (open) return; open = true;
  const html = `<span class="upd-kind">${esc(r.kind)}</span>
    <p class="upd-ver">Versi <b>${esc(r.version)}</b> · kamu memakai ${esc(VERSION)}</p>
    ${r.notes.length ? `<div class="upd-notes"><b>Yang baru</b>${r.notes.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
    <p class="upd-hint">Unduh lalu pasang menimpa aplikasi ini. Login, favorit, dan riwayat tetap aman.</p>`;
  const ok = await ask("", { title: "Pembaruan tersedia", html, ok: "Perbarui sekarang", cancel: "Nanti" });
  open = false;
  if (ok) window.open(APK, "_blank");
  else try { sessionStorage.setItem(LATER, r.version); } catch {}
}

let last = 0, shown = "";
export async function checkUpdate(manual = false, fresh = false) {
  if (!isApp && !manual) return;
  if (manual) toast("Memeriksa pembaruan…", 1500);
  last = Date.now();
  let r = null;
  try { r = await latest(manual || fresh); } catch { r = null; }
  if (!r) { if (manual) toast("Tidak bisa memeriksa pembaruan. Periksa koneksi internet."); return; }
  if (!r.newer) { if (manual) toast(`Kamu sudah memakai versi terbaru (${VERSION}).`); return; }
  let later = ""; try { later = sessionStorage.getItem(LATER) || ""; } catch {}
  if (!manual && (later === r.version || shown === r.version)) return;   // tiap versi diumumkan sekali per sesi
  shown = r.version;
  show(r);
}

export function initUpdate() {
  if (!isApp) return;
  setTimeout(() => checkUpdate(false, true), 2500);   // aplikasi dibuka
  setInterval(() => { if (document.visibilityState === "visible" && Date.now() - last > 14 * 60e3) checkUpdate(false); }, 60e3);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - last > 5 * 60e3) setTimeout(() => checkUpdate(false, true), 1200);
  });
}
