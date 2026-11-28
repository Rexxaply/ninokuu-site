// NinoNime · bar bawah: isi tab, penanda tab aktif, mengecil saat menggulir, lebar untuk animasi.
import { icon, $$ } from "./ui.js";
import { nav } from "./shell.js";

let lastY = null, acc = 0, idle = 0, quiet = 0;
export const TABS = ["home", "jadwal", "cari", "favorit", "akun"];
const NAV = [["home", "home", "Beranda"], ["jadwal", "cal", "Jadwal"], ["cari", "search", "Cari"], ["favorit", "heart", "Favorit"], ["akun", "user", "Akun"]];
nav.insertAdjacentHTML("beforeend", NAV.map(([t, ic, l]) => `<a href="#/${t}" data-tab="${t}">${icon(ic, 22)}<span>${l}</span></a>`).join(""));

// tab aktif
export function setActiveTab(name) {
  // pindah halaman: bar bawah selalu kembali ke ukuran penuh (tidak tertinggal dalam keadaan mengecil)
  document.body.classList.remove("nav-min"); lastY = null; acc = 0; quiet = performance.now() + 700;   // gulir pemulihan posisi diabaikan
  if (TABS.includes(name)) nav.style.setProperty("--ti", TABS.indexOf(name));
  $$("#nav a").forEach((a) => a.setAttribute("aria-current", String(a.dataset.tab === name)));
}

// gulir oleh aplikasi (mis. Jadwal meluncur ke SEKARANG / ke tanggal yang diketuk) diabaikan, bar tidak mengecil
export const quietNav = (ms = 800) => { quiet = Math.max(quiet, performance.now() + ms); acc = 0; };
const setMin = (on) => document.body.classList.toggle("nav-min", on);
addEventListener("scroll", () => {
  const y = scrollY; if (performance.now() < quiet) { lastY = y; acc = 0; return; }
  clearTimeout(idle); idle = setTimeout(() => { acc = 0; setMin(false); }, 2500);
  if (lastY == null || Math.abs(y - lastY) > 400) { lastY = y; acc = 0; return; }
  const d = y - lastY; lastY = y;
  if (y < 30) { acc = 0; setMin(false); return; }
  if (d > 0) { acc += d; if (acc > 48) setMin(true); } else acc = 0;
}, { passive: true });
nav.addEventListener("click", (e) => { if (!document.body.classList.contains("nav-min")) return; e.preventDefault(); e.stopPropagation(); acc = 0; setMin(false); }, true);
const navW = () => { const w = nav.offsetWidth; if (w) { nav.style.setProperty("--nw", w + "px"); nav.style.setProperty("--nwn", String(w)); } };
navW(); new ResizeObserver(navW).observe(nav);
