// NinoNime · layar gerbang: belum masuk → halaman login; sudah masuk tapi belum punya keypass → minta keypass.
import * as api from "./api.js";
import * as AN from "./anime.js";
import { esc, icon, $, toast } from "./ui.js";
import { redeemKeypass, fmtKeypass } from "./access.js";
import { view, go, setActs, rerender } from "./shell.js";
import { authPage } from "./auth.js";

export const OPEN = new Set(["akun"]);

// Beranda (dan tab lain) untuk akun tanpa keypass: kartu "Masukkan keypass".
// Tulis 12 karakter → langsung diperiksa; salah → teks validasi; benar → NinoNime terbuka penuh.
export function gate() {
  if (!api.currentUser()) { authPage(); return; }
  view.innerHTML = `<div class="kg">
    <img class="gate-logo" src="icons/logo.png" alt="NinoNime" width="207" height="48">
    <form class="kg-card" autocomplete="off" novalidate>
      <span class="kp-ic">${icon("key", 26, 2)}</span>
      <b class="kg-t">Masukkan keypass</b>
      <p class="kg-d">NinoNime dibuka dengan keypass. Cukup sekali, setelah itu tersimpan di halaman Akun.</p>
      <label class="kp-f">${icon("key", 18, 2)}<input name="kp" maxlength="17" inputmode="text" spellcheck="false" autocapitalize="characters" autocomplete="off" placeholder="NK-XXXX-XXXX-XXXX" aria-label="Keypass"></label>
      <span class="kg-msg" role="alert" aria-live="polite"></span>
      <button class="kp-wa" type="button" data-act="wa">${icon("wa", 16, 2)}Belum mempunyai keypass</button>
    </form></div>`;
  const form = $(".kg-card", view), inp = $("input", form), msg = $(".kg-msg", form);
  let busy = false;
  const check = async () => {
    if (busy) return; busy = true; form.classList.add("busy"); msg.textContent = "Memeriksa…"; msg.dataset.k = "wait";
    try {
      await redeemKeypass(inp.value);
      msg.textContent = "Keypass benar. Membuka NinoNime…"; msg.dataset.k = "ok"; form.classList.add("kp-ok");
      setTimeout(() => { toast("NinoNime terbuka. Selamat menonton!"); rerender(); }, 650);
    } catch (e) {
      msg.textContent = e.message || "Keypass tidak valid."; msg.dataset.k = "bad"; form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
      busy = false; form.classList.remove("busy");
    }
  };
  inp.addEventListener("input", () => { const full = fmtKeypass(inp); if (!busy) { msg.textContent = ""; msg.dataset.k = ""; } if (full) check(); });
  form.addEventListener("submit", (e) => { e.preventDefault(); if (fmtKeypass(inp)) check(); else { msg.textContent = "Keypass belum lengkap. Contoh: NK-ABCD-EFGH-JKLM"; msg.dataset.k = "bad"; } });
  setActs({ wa: () => AN.openWa() });
  // keypass dari tautan bot (#/home?kp=NK-…): terisi dan langsung diperiksa
  const pend = api.lsGet("pendingKp");
  if (pend) { api.lsSet("pendingKp", null); inp.value = String(pend); if (fmtKeypass(inp)) check(); }
}
