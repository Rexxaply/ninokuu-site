/* Keyboard layar — logika yang sama dengan Ninokuu (js/main.js "setKeyboard/applyKb").
   - APK: tinggi keyboard dari plugin Capacitor Keyboard (will/did show/hide).
   - Browser/PWA (tanpa plugin): keyboard disimpulkan dari visualViewport saat kolom isian fokus.
   --kb = bagian keyboard yang MENUTUPI layar (0 bila layar sudah menyusut karena adjustResize).
   body.kb-open = keyboard terbuka: menu bawah disembunyikan, halaman login dirapatkan. */
import { plug } from "./native.js";
let kbBase = innerHeight, kbOpen = false, kbH = 0;
const root = document.documentElement;
const plugin = () => plug("Keyboard");
const kbCss = (h) => { const dpr = devicePixelRatio || 1; return h > kbBase * 0.62 && dpr > 1.2 ? h / dpr : h; };   // sebagian HP melapor piksel fisik
const typingEl = () => { const a = document.activeElement; return a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && !/^(checkbox|radio|button|submit|range|file)$/.test(a.type))) ? a : null; };

const applyKb = () => {
  const shrink = Math.max(0, kbBase - innerHeight), vv = window.visualViewport;
  const vvKnows = vv && innerHeight - vv.height > 40;
  const vvCover = vv ? Math.max(0, innerHeight - (vv.height + vv.offsetTop)) : 0;
  const lift = vvKnows ? vvCover : shrink > 80 ? 0 : kbCss(kbH) - shrink;
  root.style.setProperty("--kb", (lift > 40 ? Math.round(Math.min(lift, innerHeight * 0.7)) : 0) + "px");
};

// kolom yang diketik digulir ke area yang kelihatan (tidak tertutup keyboard)
const reveal = () => {
  const a = typingEl(); if (!a) return;
  const vv = window.visualViewport, vis = (vv ? vv.height : innerHeight) - parseFloat(getComputedStyle(root).getPropertyValue("--kb") || 0);
  const r = (a.closest("label") || a).getBoundingClientRect(), b = a.getBoundingClientRect();
  const bottom = Math.max(r.bottom, b.bottom), top = Math.min(r.top, b.top);
  if (bottom > vis - 16) scrollBy({ top: bottom - vis + 24, behavior: "smooth" }); else if (top < 12) scrollBy({ top: top - 12, behavior: "smooth" });
};

function setKeyboard(h, phase) {
  if (h > 0) {
    kbOpen = true;
    if (phase !== "did") return;
    kbH = h; applyKb();
    document.body.classList.add("kb-open");
    setTimeout(reveal, 60);
  } else {
    kbOpen = false; kbH = 0;
    if (phase === "did") setTimeout(() => { if (!kbOpen) kbBase = innerHeight; }, 250);
    root.style.setProperty("--kb", "0px");
    document.body.classList.remove("kb-open");
  }
  dispatchEvent(new CustomEvent("nn:kb", { detail: { open: h > 0, phase } }));
}

// layar menyusut/membesar saat keyboard: kartu & isi meluncur halus dari posisi lama (bukan melompat)
let flipH = innerHeight, native = false;
addEventListener("resize", () => {
  if (!native) return;
  if (kbOpen) { if (kbH) { applyKb(); setTimeout(reveal, 80); } } else if (innerHeight > kbBase) kbBase = innerHeight;
  const d = innerHeight - flipH; flipH = innerHeight;
  const pg = document.querySelector(".auth-page");
  if (Math.abs(d) < 80 || !pg || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  pg.animate([{ transform: `translate3d(0, ${-d / 3}px, 0)` }, { transform: "translate3d(0, 0, 0)" }], { duration: 280, easing: "cubic-bezier(.2, .8, .2, 1)" });
});
window.visualViewport?.addEventListener("resize", () => { if (native && kbOpen) applyKb(); });
window.visualViewport?.addEventListener("scroll", () => { if (native && kbOpen) applyKb(); });
addEventListener("orientationchange", () => setTimeout(() => { if (!kbOpen) kbBase = innerHeight; }, 400));

export function initKeyboard() {
  // APK juga memakai cara browser di bawah ini: plugin Capacitor Keyboard (resize "native") sudah menyusutkan layar
  // seperti Chrome. Dulu APK memakai jalur sendiri (ruang --kb + animasi kartu + gulir halus + geser formulir)
  // yang bertumpuk dengan penyusutan layar → halaman login tersendat/melompat saat keyboard muncul.
  // browser/PWA/APK: sama dengan Ninokuu Manga di browser. Chrome sendiri yang menyusutkan layar
  // (interactive-widget=resizes-content); aplikasi TIDAK merapatkan, menganimasikan, atau menambah ruang.
  // Satu-satunya bantuan (seperti Ninokuu saat keyboard muncul): setelah layar selesai menyusut, kolom yang
  // disentuh digulir ke tengah area yang terlihat, sekali.
  const center = () => {
    const a = typingEl(); if (!a || innerHeight > kbBase - 80) return;      // keyboard tidak terbuka
    const box = (a.closest("label") || a).getBoundingClientRect();
    if (box.top >= 8 && box.bottom <= innerHeight - 12) return;              // sudah terlihat
    scrollBy({ top: (box.top + box.bottom) / 2 - innerHeight / 2, behavior: "smooth" });
  };
  // Halaman login dirapatkan selama ada kolom yang fokus (berpindah kolom tidak melepasnya). Keyboard ditarik turun
  // sementara kolom masih fokus → halaman langsung kembali normal begitu layar memanjang, dan kolom dilepas (blur).
  // Kedipan keyboard sesaat setelah pindah kolom (< 0,45 dtk sejak kolom baru disentuh) diabaikan.
  const B = document.body;
  const compact = (on) => B.classList.toggle("kb-compact", on);
  // keyboard ditutup (tombol ▽ / kembali) sementara kolom masih fokus → kolom dilepas, halaman kembali normal
  let sawKb = false;
  const closed = () => { const a = typingEl(); sawKb = false; compact(false); if (a) a.blur(); };
  // Dulu perubahan layar < 0,45 dtk sejak pindah kolom diabaikan begitu saja. Di APK keyboard berkedip saat
  // pindah kolom username ⇄ password, jadi kejadian "layar memanjang" saat keyboard benar-benar ditutup bisa
  // ikut terlewat → halaman tetap rapat & menu bawah tetap tersembunyi. Sekarang keadaan dicek ulang setelah
  // layar berhenti berubah (bukan diabaikan), dan di APK sinyal tutup keyboard dari Android dipakai langsung.
  let rt = 0, ct = 0, lastFocus = 0;
  const check = () => {
    const a = typingEl(); if (!a) return;
    if (innerHeight < kbBase - 80) { sawKb = true; compact(true); }
    else if (performance.now() - lastFocus > 700) closed();
    else ct = setTimeout(check, 300);   // baru pindah kolom: keyboard mungkin sedang muncul lagi, cek sebentar lagi
  };
  addEventListener("resize", () => {
    if (!typingEl() && innerHeight > kbBase) kbBase = innerHeight;
    clearTimeout(ct); ct = setTimeout(check, 220);
    clearTimeout(rt); rt = setTimeout(center, 160);                          // tunggu layar berhenti berubah
  });
  // Pengaman: isi otomatis (Samsung Pass/Google) menutup keyboard lewat jendela sistem lain; selama jendela itu tampil
  // aplikasi tidak menerima kejadian ukuran layar/keyboard, jadi halaman bisa tertinggal dalam mode rapat (terpotong).
  // Selama mode rapat aktif, keadaan dicek berkala: layar sudah penuh lagi > 0,6 dtk → keyboard dianggap tertutup.
  // (hanya bila keyboard layar memang sempat terlihat: di komputer tanpa keyboard layar kolom tidak dilepas)
  let fullSince = 0;
  setInterval(() => {
    if (!B.classList.contains("kb-compact")) { fullSince = 0; return; }
    if (!typingEl()) { compact(false); return; }
    if (innerHeight < kbBase - 80) { fullSince = 0; sawKb = true; return; }
    if (!sawKb) return;
    const t = performance.now();
    if (!fullSince) fullSince = t;
    else if (t - fullSince > 600 && t - lastFocus > 900) { fullSince = 0; closed(); }
  }, 300);
  addEventListener("focus", () => { clearTimeout(ct); ct = setTimeout(check, 300); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { clearTimeout(ct); ct = setTimeout(check, 300); } });
  const K = plugin();
  if (K?.addListener) {
    let hideT = 0;
    K.addListener("keyboardWillShow", () => { clearTimeout(hideT); if (typingEl()) compact(true); });
    // kedipan saat pindah kolom: sembunyi lalu langsung muncul lagi → tunggu sebentar sebelum dianggap ditutup
    K.addListener("keyboardDidHide", () => { clearTimeout(hideT); hideT = setTimeout(closed, 250); });
  }
  addEventListener("focusin", () => { if (!typingEl()) return; lastFocus = performance.now(); B.classList.add("kb-typing"); compact(true); setTimeout(center, 420); });
  addEventListener("focusout", () => setTimeout(() => { if (!typingEl()) { B.classList.remove("kb-typing"); compact(false); } }, 120));
}
