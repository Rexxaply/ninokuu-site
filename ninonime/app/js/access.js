// NinoNime · modul anime/access (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $, toast } from "./ui.js";
import { WA_BOT } from "./const.js";
import { A } from "./data.js";


/* =====================================================================
   Akses (keypass) dan mode
   ===================================================================== */
const accKey = () => "animeAcc:" + (api.userId() || "-");
export const cachedAccess = () => (api.userId() ? api.lsGet(accKey()) : null);
export const hasAccess = () => !!cachedAccess()?.access;
export async function loadAccess() {
  if (!api.userId()) return null;
  const r = await api.rpc("nn_access");
  const v = { access: !!r?.access, code: r?.code || "" };
  api.lsSet(accKey(), v);
  return v;
}
// pesan otomatis untuk bot: kode aktivasi acak (dibuat server, terkait email akun) + email + larangan mengubah pesan
export const waText = (code, email) =>
  `Kode aktivasi : ${code}\nEmail : ${email}\n\n⚠️ Jangan hapus atau ubah pesan ini. Langsung kirim saja.`;
const waLink = (text) => `https://wa.me/${WA_BOT}?text=${encodeURIComponent(text)}`;
export async function openWa() {
  const w = window.open("", "_blank"); // dibuka dulu supaya tidak diblokir pemblokir pop-up
  try {
    const r = await api.rpc("nn_request_activation");
    if (!r?.ok) throw new Error(r?.error || "Gagal membuat kode aktivasi.");
    const url = waLink(waText(r.code, r.email));
    if (w) w.location.href = url; else location.href = url;
  } catch (e) {
    w?.close();
    toast(e?.message || "Gagal membuka WhatsApp.");
  }
}

// format otomatis saat mengetik: huruf besar + tanda hubung → NK-ABCD-EFGH-JKLM; mengembalikan true bila sudah lengkap (12 karakter)
export function fmtKeypass(inp) {
  const all = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const pre = all.startsWith("NK") && all.length !== 12, body = (pre ? all.slice(2) : all).slice(0, 12);
  inp.value = (pre ? (body ? "NK-" : "NK") : "") + (body.match(/.{1,4}/g) || []).join("-");
  return body.length === 12;
}
// tukar keypass ke server; berhasil → akses tersimpan. Gagal → Error dengan pesan untuk ditampilkan.
export async function redeemKeypass(code) {
  const r = await api.rpc("nn_redeem_keypass", { p_code: code });
  if (!r?.access) throw new Error(r?.error || "Keypass tidak valid.");
  api.lsSet(accKey(), { access: true, code: r.code });
  return r.code;
}

// pop-up keypass. Selesai → resolve(true) bila akses didapat.
export function openKeypass() {
  return new Promise((resolve) => {
    $(".kp-host")?.remove();
    const host = document.createElement("div");
    host.className = "ask-host kp-host";
    host.innerHTML = `<div class="ask-bg" data-k="close"></div>
<form class="ask glass kp" role="dialog" aria-modal="true" aria-labelledby="kpT" autocomplete="off">
  <span class="kp-ic">${icon("tv", 26, 2)}</span>
  <b class="ask-ttl" id="kpT">Masukkan keypass</b>
  <img class="kp-logo" src="icons/logo.png" alt="NinoNime" width="138" height="32">
  <p class="ask-msg">NinoNime dibuka dengan keypass. Cukup sekali, setelah itu keypass tersimpan di halaman Akun.</p>
  <label class="kp-f">${icon("key", 18, 2)}<input name="kp" required maxlength="20" spellcheck="false" autocapitalize="characters" placeholder="NK-XXXX-XXXX-XXXX" aria-label="Keypass"></label>
  <span class="err" id="kpErr" role="alert"></span>
  <button class="btn primary kp-go" type="submit">Buka NinoNime</button>
  <button class="kp-wa" type="button" data-k="wa">${icon("wa", 16, 2)}Belum mempunyai keypass</button>
  <span class="kp-hint">Bot WhatsApp akan mengirim keypass untuk email <b>${esc(api.currentUser()?.email || "")}</b>. Tinggal tekan kirim di WhatsApp.</span>
  <button class="ask-b kp-x" type="button" data-k="close">Nanti saja</button>
</form>`;
    document.body.append(host);
    host._close = () => finish(false);
    const form = $("form", host), inp = $("input", host), err = $("#kpErr", host);
    requestAnimationFrame(() => { host.classList.add("on"); setTimeout(() => inp.focus({ preventScroll: true }), 220); });
    let done = false;
    const finish = (v) => {
      if (done) return; done = true;
      host.classList.remove("on"); host.classList.add("off");
      setTimeout(() => host.remove(), 180);
      document.removeEventListener("keydown", onKey, true);
      resolve(v);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); finish(false); } };
    document.addEventListener("keydown", onKey, true);
    // huruf besar & tanda hubung otomatis saat mengetik: NK-ABCD-EFGH-JKLM
    inp.addEventListener("input", () => {
      fmtKeypass(inp); err.textContent = "";
    });
    host.addEventListener("click", (e) => {
      const k = e.target.closest("[data-k]")?.dataset.k;
      if (k === "close") finish(false);
      if (k === "wa") openWa();
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $(".kp-go", host); btn.disabled = true; btn.textContent = "Memeriksa…"; err.textContent = "";
      try {
        await redeemKeypass(inp.value);
        form.classList.add("kp-ok");
        setTimeout(() => finish(true), 520);
      } catch (ex) {
        err.textContent = ex.message || "Gagal memeriksa keypass."; form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
        btn.disabled = false; btn.textContent = "Buka NinoNime";
      }
    });
  });
}

export const closeKeypass = () => { const h = $(".kp-host:not(.off)"); if (!h) return false; h._close?.(); return true; };

// baris keypass di halaman Akun: tampil sebagai bintang, dengan tombol Tampilkan & Salin
export function keypassSection() {
  const a = cachedAccess();
  if (!a?.access) return `<section class="sec"><h2 class="cap">Keypass</h2><div class="group">
    <button class="mrow" data-act="kpOpen"><span class="mrow-ic">${icon("key", 20)}</span><span class="rc-mid"><b>Keypass NinoNime</b><span class="mu sm">Belum ada · ketuk untuk memasukkan keypass</span></span><span class="mu">${icon("chev", 18)}</span></button>
    <button class="mrow" data-act="kpWa"><span class="mrow-ic">${icon("wa", 20)}</span><span class="rc-mid"><b>Belum mempunyai keypass</b><span class="mu sm">Minta otomatis ke bot WhatsApp</span></span><span class="mu">${icon("chev", 18)}</span></button></div></section>`;
  return `<section class="sec"><h2 class="cap">Keypass</h2><div class="group">
    <div class="mrow kp-row"><span class="mrow-ic">${icon("key", 20)}</span><span class="rc-mid"><b>Keypass NinoNime</b><code class="kp-code" id="kpCode" data-shown="0">${"•".repeat(14)}</code></span>
      <button class="sq-btn" data-act="kpShow" aria-label="Tampilkan keypass" aria-pressed="false">${icon("eye", 18, 2)}</button>
      <button class="sq-btn" data-act="kpCopy" aria-label="Salin keypass">${icon("copy", 18, 2)}</button></div>
    <button class="mrow danger" data-act="kpDel"><span class="mrow-ic">${icon("trash", 19)}</span><span class="rc-mid"><b>Hapus keypass</b><span class="mu sm">Lepas keypass dari akun ini</span></span></button></div>
    <p class="mu xs lh px6">Keypass ini terikat ke akunmu. Jangan dibagikan.</p></section>`;
}
export function keypassActs(redraw) {
  return {
    kpOpen: async () => { if (await openKeypass()) { toast("NinoNime terbuka. Selamat menonton!"); redraw(); } },
    kpWa: () => openWa(),
    kpShow: (el) => {
      const c = $("#kpCode"), on = c.dataset.shown !== "1";
      c.dataset.shown = on ? "1" : "0"; c.textContent = on ? cachedAccess()?.code || "" : "•".repeat(14);
      el.setAttribute("aria-pressed", String(on)); el.innerHTML = icon(on ? "eyeOff" : "eye", 18, 2);
    },
    kpCopy: async () => { try { await navigator.clipboard.writeText(cachedAccess()?.code || ""); toast("Keypass disalin"); } catch { toast("Tidak bisa menyalin otomatis"); } },
  };
}

