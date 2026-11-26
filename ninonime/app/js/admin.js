// NinoNime · modul anime/admin (dipecah dari anime.js)
import * as api from "./api.js";
import { esc, icon, $, toast, ask } from "./ui.js";
import { fmtDate } from "./detail.js";

/* =====================================================================
   Panel developer: buat & kelola keypass
   ===================================================================== */
export async function vKeypassAdmin(view, x) {
  view.innerHTML = x.topbar("Panel developer") + `<div class="px col g14 mt6">
  <div class="card col g10"><b>Buat keypass baru</b><span class="mu sm lh">Satu keypass untuk satu akun. Kirim ke pengguna lewat WhatsApp; setelah dipakai, keypass terikat ke akun itu.</span>
    <div class="row g8"><input class="kp-in" id="kpNote" maxlength="80" placeholder="Catatan (mis. nama pembeli)"><input class="kp-in kp-n" id="kpCount" type="number" min="1" max="50" value="1" aria-label="Jumlah"></div>
    <button class="btn primary" data-act="make">${icon("key", 18, 2)}Buat keypass</button><div id="kpNew"></div></div>
  <div class="card col g10"><b>Kunci bot WhatsApp</b><span class="mu sm lh">Bot memakai kunci ini untuk membuat keypass otomatis dari pesan berisi kode aktivasi + email. Kunci hanya tampil sekali; simpan di pengaturan bot. Panduan: docs/bot-keypass.md di repo</span>
    <div class="row g8"><input class="kp-in" id="bkLabel" maxlength="60" placeholder="Nama bot (mis. Bot Termux)"><button class="btn ghost sm" data-act="mkBot">Buat kunci</button></div>
    <div id="bkNew"></div><div id="bkList"></div></div>
  <div class="sec-h"><h2>Daftar keypass</h2><button class="sq-btn" data-act="reload" aria-label="Muat ulang">${icon("refresh", 18, 2)}</button></div>
  <div id="kpTools"></div><div id="kpList">${x.loading(3, "sk-lrow")}</div></div><div class="pad-nav"></div>`;
  // status tiap keypass: dipakai, belum dipakai, kedaluwarsa (keypass bot > 30 menit), dicabut, dilepas pemiliknya
  const stat = (r) => {
    if (r.released_at) return ["off", "Dilepas pemiliknya"];
    if (r.revoked) return ["off", "Dicabut"];
    if (r.redeemed_at) return ["on", "Dipakai"];
    if (r.expires_at && Date.parse(r.expires_at) < Date.now()) return ["exp", "Kedaluwarsa"];
    return ["new", "Belum dipakai"];
  };
  const inUse = (r) => !!r.redeemed_at && !r.revoked;
  const loadList = async () => {
    try {
      let rows;
      try { rows = (await api.rpc("nn_keypass_list2", { p_limit: 200 })) || []; }
      catch { rows = (await api.rpc("nn_keypass_list", { p_limit: 200 })) || []; }
      const unused = rows.filter((r) => !r.redeemed_at).length;
      $("#kpTools").innerHTML = unused ? `<button class="btn ghost sm kp-clean" data-act="delUnused">${icon("trash", 16, 2)}Hapus semua yang tidak dipakai (${unused})</button>` : "";
      $("#kpList").innerHTML = rows.length ? `<div class="group">${rows.map((r) => { const [k, label] = stat(r); return `<div class="mrow kp-li${r.revoked ? " rev" : ""}"><span class="rc-mid g4"><code>${esc(r.code)}</code><span class="mu xs kp-meta"><span class="kp-st ${k}">${label}</span>${r.redeemed_at ? esc(r.email || "akun terhapus") : r.reserved_email ? `Untuk ${esc(r.reserved_email)}` : "Belum ada pemilik"}${r.wa ? " · WA " + esc(r.wa) : ""}${r.note && !/^bot:/.test(r.note) ? " · " + esc(r.note) : r.note ? " · dari bot" : ""} · ${esc(fmtDate(r.created_at))}</span></span>
        <button class="sq-btn" data-act="cp" data-v="${esc(r.code)}" aria-label="Salin">${icon("copy", 16, 2)}</button>${inUse(r) || r.revoked ? `<button class="sq-btn" data-act="rev" data-v="${esc(r.code)}" data-r="${r.revoked ? 0 : 1}" aria-label="${r.revoked ? "Pulihkan" : "Cabut"}">${icon(r.revoked ? "restore" : "ban", 16, 2)}</button>` : ""}${inUse(r) ? "" : `<button class="sq-btn kp-del" data-act="del" data-v="${esc(r.code)}" aria-label="Hapus keypass">${icon("trash", 16, 2)}</button>`}</div>`; }).join("")}</div>` : `<div class="empty"><b>Belum ada keypass</b></div>`;
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
    del: async (el) => {
      if (!(await ask(`Hapus ${el.dataset.v}? Keypass ini hilang dari daftar dan tidak bisa dipakai.`, { title: "Hapus keypass", ok: "Hapus", danger: true }))) return;
      try { const r = await api.rpc("nn_delete_keypass", { p_code: el.dataset.v }); if (r && r.ok === false) throw new Error(r.error); toast("Keypass dihapus"); loadList(); }
      catch (e) { toast(/nn_delete_keypass|function/i.test(e.message) ? "Jalankan dulu supabase/schema.sql terbaru." : e.message); }
    },
    delUnused: async () => {
      if (!(await ask("Semua keypass yang belum pernah dipakai (termasuk yang sudah kedaluwarsa) akan dihapus. Keypass yang sedang dipakai tidak tersentuh.", { title: "Bersihkan keypass", ok: "Hapus", danger: true }))) return;
      try { const r = await api.rpc("nn_delete_unused_keypass"); toast(`${r?.deleted ?? 0} keypass dihapus`); loadList(); }
      catch (e) { toast(/nn_delete_unused_keypass|function/i.test(e.message) ? "Jalankan dulu supabase/schema.sql terbaru." : e.message); }
    },
    cp: async (el) => { try { await navigator.clipboard.writeText(el.dataset.v); toast("Disalin"); } catch { toast("Tidak bisa menyalin otomatis"); } },
    rev: async (el) => { try { await api.rpc("nn_revoke_keypass", { p_code: el.dataset.v, p_revoked: el.dataset.r === "1" }); toast(el.dataset.r === "1" ? "Keypass dicabut" : "Keypass dipulihkan"); loadList(); } catch (e) { toast(e.message); } },
  });
  await Promise.all([loadList(), loadBots()]);
}

