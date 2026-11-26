/* Keyboard layar — logika yang sama dengan Ninokuu (js/main.js "setKeyboard/applyKb").
   - APK: tinggi keyboard dari plugin Capacitor Keyboard (will/did show/hide).
   - Browser/PWA (tanpa plugin): keyboard disimpulkan dari visualViewport saat kolom isian fokus.
   --kb = bagian keyboard yang MENUTUPI layar (0 bila layar sudah menyusut karena adjustResize).
   body.kb-open = keyboard terbuka: menu bawah disembunyikan, halaman login dirapatkan. */
let kbBase = innerHeight, kbOpen = false, kbH = 0;
const root = document.documentElement;
const plugin = () => { try { const C = window.Capacitor; return C?.isNativePlatform?.() ? C.Plugins?.Keyboard || null : null; } catch { return null; } };
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
  const K = plugin();
  if (K) {
    native = true; document.body.classList.add("kb-native");
    K.addListener("keyboardWillShow", (i) => setKeyboard(Number(i?.keyboardHeight) || 0, "will"));
    K.addListener("keyboardDidShow", (i) => setKeyboard(Number(i?.keyboardHeight) || 0, "did"));
    K.addListener("keyboardWillHide", () => setKeyboard(0, "will"));
    K.addListener("keyboardDidHide", () => setKeyboard(0, "did"));
    return;
  }
  // tanpa plugin (browser/PWA): sama dengan Ninokuu Manga di browser. Chrome sendiri yang menyusutkan layar
  // (interactive-widget=resizes-content); aplikasi TIDAK merapatkan, menganimasikan, atau menambah ruang.
  // Satu-satunya bantuan (seperti Ninokuu saat keyboard muncul): setelah layar selesai menyusut, kolom yang
  // disentuh digulir ke tengah area yang terlihat, sekali.
  const center = () => {
    const a = typingEl(); if (!a || innerHeight > kbBase - 80) return;      // keyboard tidak terbuka
    const box = (a.closest("label") || a).getBoundingClientRect();
    if (box.top >= 8 && box.bottom <= innerHeight - 12) return;              // sudah terlihat
    scrollBy({ top: (box.top + box.bottom) / 2 - innerHeight / 2, behavior: "smooth" });
  };
  // Halaman login dirapatkan (logo mengecil, teks "Masuk dulu…" hilang) begitu kolom DISENTUH, sebelum keyboard
  // mulai bergerak, dan baru dilepas setelah keyboard benar-benar tertutup. Jadi tata letak tidak berubah di
  // tengah gerak keyboard (itu yang dulu membuat keyboard naik-turun).
  const B = document.body;
  const compact = (on) => B.classList.toggle("kb-compact", on);
  let rt = 0, small = false;
  addEventListener("resize", () => {
    if (!typingEl() && innerHeight > kbBase) kbBase = innerHeight;
    clearTimeout(rt); rt = setTimeout(() => {                                // tunggu layar berhenti berubah
      const isSmall = innerHeight < kbBase - 80;
      if (small && !isSmall) compact(false);                                 // keyboard ditutup (kolom masih fokus)
      small = isSmall;
      center();
    }, 150);
  });
  addEventListener("focusin", () => { if (!typingEl()) return; B.classList.add("kb-typing"); compact(true); setTimeout(center, 350); });
  addEventListener("focusout", () => setTimeout(() => { if (!typingEl()) { B.classList.remove("kb-typing"); compact(false); } }, 200));
  // sentuh lagi kolom yang masih fokus setelah keyboard ditutup → keyboard muncul lagi, halaman dirapatkan lagi
  addEventListener("pointerdown", (e) => { if (e.target === typingEl()) compact(true); });
}
