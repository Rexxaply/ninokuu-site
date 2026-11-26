// NinoNime · halaman Akun (sudah masuk): profil, keypass, panel admin, keluar.
import * as api from "./api.js";
import * as AN from "./anime.js";
import { esc, icon, $, toast, ask } from "./ui.js";
import { VERSION, view, go, setActs, group, mrow } from "./shell.js";
import { authPage } from "./auth.js";

/* ---------- Akun ---------- */
let authMode = "in";
export async function vAkun() {
  const user = api.currentUser();
  if (!user) { authPage(); return; }
  view.innerHTML = `<div class="page-h"><h1>Akun</h1></div>
${!api.configured ? `<p class="note-warn mx">${icon("info", 18)}Isi SUPABASE_URL dan SUPABASE_ANON_KEY di config.js.</p>` : ""}
${user ? `<div class="me-card mx"><span class="me-ini">${esc((user.email || "?")[0].toUpperCase())}</span><span class="rc-mid"><b>${esc(api.lsGet("username") ? "@" + api.lsGet("username") : user.email || "")}</b><span class="mu sm">${api.lsGet("username") ? esc(user.email || "") + " · " : ""}${AN.hasAccess() ? "Keypass aktif" : "Belum ada keypass"}</span></span></div>
  <div class="px"><div id="kpSec">${AN.keypassSection()}</div></div>
  <div id="adminRow"></div>
  ${group("Aplikasi", mrow("info", "Tentang NinoNime", "Versi " + esc(VERSION), "about") + mrow("out", "Keluar", "", "logout", true))}`
  : ""}
<div class="pad-nav"></div>`;
  const redrawKp = () => { const el = $("#kpSec"); if (el) el.innerHTML = AN.keypassSection(); };
  setActs({
    ...AN.keypassActs(redrawKp),
    about: () => toast(`NinoNime v${VERSION}`),
    admin: () => go("#/admin"),
    logout: async () => { if (!(await ask("Keluar dari akun?", { ok: "Keluar", danger: true }))) return; AN.player.close(); await api.signOut(); api.lsSet("username", null); toast("Kamu sudah keluar"); vAkun(); },
  });
  if (user) {
    if (!api.lsGet("username")) api.rpc("nn_claim_username").then((r) => { if (r?.username) { api.lsSet("username", r.username); vAkun(); } }).catch(() => {});
    AN.loadAccess().then(redrawKp).catch(() => {});
    api.rpc("nn_is_admin").then((ok) => { const el = $("#adminRow"); if (ok && el) el.innerHTML = group("Admin", mrow("key", "Keypass & bot WhatsApp", "Buat, salin, dan cabut keypass · kunci bot", "admin")); }).catch(() => {});
  }
}
