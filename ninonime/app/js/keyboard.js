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
  // tanpa plugin (browser/PWA): halaman TIDAK dirapatkan dan tidak dianimasikan saat keyboard bergerak (itu membuat
  // keyboard Chrome Android buka-tutup terus). Yang dilakukan hanya:
  //   1. "kb-typing": menu bawah disembunyikan + ruang kosong di bawah halaman, supaya halaman bisa digulir naik;
  //   2. keyboard selesai muncul → kolom yang disentuh digulir SEKALI ke atas keyboard bila tertutup;
  //   3. keyboard ditutup (tombol kembali / panah bawah) → ruang kosong dilepas, halaman kembali ke posisi semula.
  let t = 0, offT = 0, shown = false, prevY = 0, lifted = false;
  const visible = () => {
    const vv = window.visualViewport, bottomVis = vv ? vv.offsetTop + vv.height : innerHeight;
    return innerHeight < kbBase - 80 || innerHeight - bottomVis > 80;
  };
  const lift = () => {
    const a = typingEl(); if (!a) return;
    const vv = window.visualViewport, bottomVis = vv ? vv.offsetTop + vv.height : innerHeight;
    const box = (a.closest("label") || a).getBoundingClientRect(), need = box.bottom - (bottomVis - 20);
    if (need > 0) { if (!lifted) prevY = scrollY; lifted = true; scrollBy({ top: need, behavior: "smooth" }); }
  };
  const settle = () => {                                                    // keyboard tertutup
    document.body.classList.remove("kb-typing");
    if (lifted) scrollTo({ top: prevY, behavior: "smooth" });
    lifted = false;
  };
  const check = () => {
    const v = visible();
    if (v && !shown) { shown = true; if (typingEl()) { document.body.classList.add("kb-typing"); setTimeout(lift, 60); } }
    else if (!v && shown) { shown = false; settle(); }
    else if (v && typingEl()) setTimeout(lift, 60);
    if (!v && !typingEl()) kbBase = Math.max(kbBase, innerHeight);
  };
  const mark = () => { clearTimeout(t); t = setTimeout(() => {
    const on = !!typingEl();
    if (on) { clearTimeout(offT); document.body.classList.add("kb-typing"); setTimeout(() => (visible() ? lift() : 0), 450); }
    else offT = setTimeout(() => { if (!typingEl()) settle(); }, 350);     // pindah kolom: ruang tidak hilang-muncul
    dispatchEvent(new CustomEvent("nn:kb", { detail: { open: on, phase: "did" } }));
  }, 30); };
  addEventListener("focusin", mark); addEventListener("focusout", mark);
  // sentuh ulang kolom yang masih fokus setelah keyboard ditutup: keyboard muncul lagi → naik lagi
  addEventListener("pointerup", (e) => { if (e.target === typingEl()) { document.body.classList.add("kb-typing"); setTimeout(() => (visible() ? lift() : 0), 450); } });
  window.visualViewport?.addEventListener("resize", () => setTimeout(check, 60));
  addEventListener("resize", () => setTimeout(check, 60));
}
