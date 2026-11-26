// NinoNime · modul anime/admin (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $, toast } from "./ui.js";
import { fmtDate } from "./detail.js";

/* =====================================================================
   Panel developer: buat & kelola keypass
   ===================================================================== */
export async function vKeypassAdmin(view, x) {
  view.innerHTML = x.topbar("Keypass &amp; bot") + `<div class="px col g14 mt6">
  <div class="card col g10"><b>Buat keypass baru</b><span class="mu sm lh">Satu keypass untuk satu akun. Kirim ke pengguna lewat WhatsApp; setelah dipakai, keypass terikat ke akun itu.</span>
    <div class="row g8"><input class="kp-in" id="kpNote" maxlength="80" placeholder="Catatan (mis. nama pembeli)"><input class="kp-in kp-n" id="kpCount" type="number" min="1" max="50" value="1" aria-label="Jumlah"></div>
    <button class="btn primary" data-act="make">${icon("key", 18, 2)}Buat keypass</button><div id="kpNew"></div></div>
  <div class="card col g10"><b>Kunci bot WhatsApp</b><span class="mu sm lh">Bot memakai kunci ini untuk membuat keypass otomatis dari pesan berisi kode aktivasi + email. Kunci hanya tampil sekali; simpan di pengaturan bot. Panduan: docs/bot-keypass.md di repo</span>
    <div class="row g8"><input class="kp-in" id="bkLabel" maxlength="60" placeholder="Nama bot (mis. Bot Termux)"><button class="btn ghost sm" data-act="mkBot">Buat kunci</button></div>
    <div id="bkNew"></div><div id="bkList"></div></div>
  <div class="sec-h"><h2>Daftar keypass</h2><button class="sq-btn" data-act="reload" aria-label="Muat ulang">${icon("refresh", 18, 2)}</button></div>
  <div id="kpList">${x.loading(3, "sk-lrow")}</div></div><div class="pad-nav"></div>`;
  const loadList = async () => {
    try {
      const rows = (await api.rpc("nn_keypass_list", { p_limit: 200 })) || [];
      $("#kpList").innerHTML = rows.length ? `<div class="group">${rows.map((r) => `<div class="mrow kp-li${r.revoked ? " rev" : ""}"><span class="rc-mid"><code>${esc(r.code)}</code><span class="mu xs">${r.redeemed_at ? `Dipakai ${esc(r.name || "")} · ${esc(r.email || "")}` : r.reserved_email ? `Untuk ${esc(r.reserved_email)} · belum dipakai` : "Belum dipakai"}${r.wa ? " · WA " + esc(r.wa) : ""}${r.note && !/^bot:/.test(r.note) ? " · " + esc(r.note) : r.note ? " · dari bot" : ""}${r.revoked ? " · DICABUT" : ""}</span></span>
        <button class="sq-btn" data-act="cp" data-v="${esc(r.code)}" aria-label="Salin">${icon("copy", 16, 2)}</button><button class="sq-btn" data-act="rev" data-v="${esc(r.code)}" data-r="${r.revoked ? 0 : 1}" aria-label="${r.revoked ? "Pulihkan" : "Cabut"}">${icon(r.revoked ? "restore" : "ban", 16, 2)}</button></div>`).join("")}</div>` : `<div class="empty"><b>Belum ada keypass</b></div>`;
    } catch (e) { $("#kpList").innerHTML = `<div class="empty"><b>${esc(e.message)}</b><span class="mu sm">Pastikan supabase/schema.sql sudah dijalankan.</span></div>`; }
  };
  const loadBots = async () => {
    try {
      const rows = (await api.rpc("nn_list_bot_keys")) || [];
      $("#bkList").innerHTML = rows.length ? `<div class="group">${rows.map((r) => `<div class="mrow kp-li${r.revoked ? " rev" : ""}"><span class="rc-mid"><b>${esc(r.label || "Bot")}</b><span class="mu xs">Dibuat ${esc(fmtDate(r.created_at))}${r.last_used_at ? " · terakhir dipakai " + esc(fmtDate(r.last_used_at)) : " · belum dipakai"}${r.revoked ? " · DICABUT" : ""}</span></span>${r.revoked ? "" : `<button class="sq-btn" data-act="rvBot" data-v="${r.id}" aria-label="Cabut kunci bot">${icon("ban", 16, 2)}</button>`}</div>`).join("")}</div>` : "";
    } catch {}
  };
  x.setActs({
    back: () => x.back("#/akun"), reload: () => { loadList(); loadBots(); },
    mkBot: async (el) => {
      el.disabled = true;
      try {
        const k = await api.rpc("nn_make_bot_key", { p_label: $("#bkLabel").value });
        $("#bkNew").innerHTML = `<div class="kp-new"><code class="bk-code">${esc(k)}</code><span class="mu xs">Salin sekarang. Kunci ini tidak bisa dilihat lagi.</span><button class="btn ghost" data-act="cpBot">${icon("copy", 16, 2)}Salin kunci bot</button></div>`;
        $("#bkNew").dataset.k = k; loadBots();
      } catch (e) { toast(e.message); }
      el.disabled = false;
    },
    cpBot: async () => { try { await navigator.clipboard.writeText($("#bkNew").dataset.k || ""); toast("Kunci bot disalin"); } catch { toast("Tidak bisa menyalin otomatis"); } },
    rvBot: async (el) => { try { await api.rpc("nn_revoke_bot_key", { p_id: Number(el.dataset.v) }); toast("Kunci bot dicabut"); loadBots(); } catch (e) { toast(e.message); } },
    make: async (el) => {
      el.disabled = true;
      try {
        const codes = (await api.rpc("nn_make_keypass", { p_count: Number($("#kpCount").value) || 1, p_note: $("#kpNote").value })) || [];
        $("#kpNew").innerHTML = `<div class="kp-new">${codes.map((c) => `<code>${esc(c)}</code>`).join("")}<button class="btn ghost" data-act="cpAll">${icon("copy", 16, 2)}Salin semua</button></div>`;
        $("#kpNew").dataset.codes = codes.join("\n");
        loadList();
      } catch (e) { toast(e.message); }
      el.disabled = false;
    },
    cpAll: async () => { try { await navigator.clipboard.writeText($("#kpNew").dataset.codes || ""); toast("Keypass disalin"); } catch { toast("Tidak bisa menyalin otomatis"); } },
    cp: async (el) => { try { await navigator.clipboard.writeText(el.dataset.v); toast("Disalin"); } catch { toast("Tidak bisa menyalin otomatis"); } },
    rev: async (el) => { try { await api.rpc("nn_revoke_keypass", { p_code: el.dataset.v, p_revoked: el.dataset.r === "1" }); toast(el.dataset.r === "1" ? "Keypass dicabut" : "Keypass dipulihkan"); loadList(); } catch (e) { toast(e.message); } },
  });
  await Promise.all([loadList(), loadBots()]);
}

