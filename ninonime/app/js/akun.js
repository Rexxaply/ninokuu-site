// NinoNime · halaman Akun (sudah masuk), disusun seperti halaman "Lainnya" di Ninokuu Manga:
// profil, akun, keypass (lihat/salin/hapus), developer, aplikasi Android, data & penyimpanan, dukungan, keluar.
import * as api from "./api.js";
import * as AN from "./anime.js";
import { esc, icon, $, toast, ask } from "./ui.js";
import { checkUpdate } from "./update.js";
import { VERSION, view, go, setActs, group, mrow } from "./shell.js";
import { authPage } from "./auth.js";
import * as L from "./level.js";

const SITE = "https://ninokuu.site/";
const isApp = () => { try { return !!window.Capacitor?.isNativePlatform?.(); } catch { return false; } };

export async function vAkun() {
  const user = api.currentUser();
  if (!user) { authPage(); return; }
  const uname = api.lsGet("username");
  const acc = AN.cachedAccess(), p = L.cachedProfile(), lv = L.levelOf(p), admin = api.lsGet("isAdmin:" + user.id) === true;
  const name = p?.name || (uname ? "@" + uname : user.email || "");
  const meCard = () => { const p2 = L.cachedProfile(), lv2 = L.levelOf(p2);
    return `<button class="me mx" data-act="level">${L.avatar(p2, lv2, 56, uname || user.email)}
    <span class="rc-mid g5"><span class="me-name"><b class="t1">${esc(p2?.name || name)}</b>${L.roleBadge(p2)}</span>
      <span class="row g8 mu sm">${L.rankPill(lv2)}Lv ${lv2.lv}${lv2.max ? " · level maksimal" : ` · ${(lv2.need - lv2.cur).toLocaleString("id-ID")} EXP lagi`}</span>
      <span class="prog"><span style="width:${lv2.max ? 100 : Math.round((lv2.cur / lv2.need) * 100)}%"></span></span></span><span class="mu">${icon("chev", 18)}</span></button>`; };
  view.innerHTML = `<div class="page-h"><h1>Akun</h1></div>
${!api.configured ? `<p class="note-warn mx">${icon("info", 18)}Isi SUPABASE_URL dan SUPABASE_ANON_KEY di config.js.</p>` : ""}
${window.NINONIME_CONFIG?.DEMO_DATA ? `<div class="note mx">${icon("info", 18)}<span><b>Versi demo.</b> Daftar anime, jadwal, dan sampul memakai data contoh.</span></div>` : ""}
<div id="meBox">${meCard()}</div>
${group("Akun", mrow("user", "Akun", "Username · email · password", "akun"))}
<div id="kpSec">${AN.keypassSection()}</div>
<div id="devRow">${admin ? devGroup() : ""}</div>
${group("Tontonanmu", mrow("star", "Level &amp; Rank", `<span id="lvSub">${esc(lv.rank)} · Lv ${lv.lv} · dari akun Ninokuu</span>`, "level") + mrow("clock", "Riwayat tonton", `${api.lsGet("animeHist", []).length} judul`, "hist"))}
${isApp() ? group("Aplikasi", mrow("down", "Periksa pembaruan", "Versi terpasang " + esc(VERSION), "checkupd")) : group("Aplikasi Android", mrow("down", "Pasang aplikasi Android (APK)", "Halaman unduh di ninokuu.site", "getapk"))}
${group("Data &amp; penyimpanan", mrow("cloud", "Backup data offline", "Simpan favorit &amp; riwayat tonton ke file", "backup") + mrow("restore", "Pulihkan data", "Dari file backup", "restore") + mrow("trash", "Bersihkan cache", `<span id="cacheSub">Menghitung…</span>`, "cache"))}
${group("Dukungan", mrow("info", "Tentang aplikasi", "Versi " + esc(VERSION), "about") + mrow("shield", "Kebijakan privasi", "", "privacy") + mrow("doc", "Ketentuan pengguna", "", "terms"))}
${group("Sesi", mrow("out", "Keluar", "", "logout", true))}
<p class="mu xs center mt18">NinoNime versi ${esc(VERSION)}</p>
<div class="pad-nav"></div>`;
  const redrawKp = () => { const el = $("#kpSec"); if (el) el.innerHTML = AN.keypassSection(); };
  const cacheSize = () => { let n = 0; try { for (const k of Object.keys(localStorage)) if (k.startsWith("ninonime:jk:")) n += (localStorage.getItem(k) || "").length; } catch {} return n; };
  const showCache = () => { const el = $("#cacheSub"); if (el) { const n = cacheSize(); el.textContent = n ? `±${Math.max(1, Math.round(n / 1024))} KB di HP · jadwal & info anime` : "Cache kosong"; } };
  showCache();
  setActs({
    ...AN.keypassActs(redrawKp),
    kpDel: async () => {
      if (!(await ask("Keypass ini akan dihapus dari akunmu dan tidak bisa dipakai lagi. NinoNime akan terkunci sampai kamu memasukkan keypass baru (bisa diminta lagi lewat bot WhatsApp).", { title: "Hapus keypass?", ok: "Hapus", danger: true }))) return;
      try {
        const r = await api.rpc("nn_release_keypass");
        if (!r?.ok) throw new Error(r?.error || "Gagal menghapus keypass.");
        await AN.loadAccess().catch(() => {}); redrawKp(); toast("Keypass dihapus");
      } catch (e) { toast(/nn_release_keypass|404|function/i.test(e.message) ? "Fitur ini butuh pembaruan database (schema.sql)." : e.message); }
    },
    level: () => go("#/p/level"), akun: () => go("#/p/akun"), hist: () => { api.lsSet("favTab", "hist"); go("#/favorit"); },
    dev: () => go("#/admin"),
    getapk: () => window.open(SITE, "_blank", "noopener"),
    checkupd: () => checkUpdate(true),
    backup: () => go("#/p/backup"), restore: () => go("#/p/restore"),
    cache: async () => {
      try { for (const k of Object.keys(localStorage)) if (k.startsWith("ninonime:jk:")) localStorage.removeItem(k); } catch {}
      try { if (window.caches) for (const k of await caches.keys()) if (k.startsWith("ninonime-")) await caches.delete(k); } catch {}
      showCache(); toast("Cache dibersihkan");
    },
    about: () => go("#/p/about"), privacy: () => go("#/p/privacy"), terms: () => go("#/p/terms"),
    logout: async () => { if (!(await ask("Keluar dari akun?", { ok: "Keluar", danger: true }))) return; AN.player.close(); await api.signOut(); api.lsSet("username", null); toast("Kamu sudah keluar"); vAkun(); },
  });
  if (!uname) api.rpc("nn_claim_username").then((r) => { if (r?.username) { api.lsSet("username", r.username); const b = $("#meBox"); if (b) b.innerHTML = meCard(); } }).catch(() => {});
  AN.loadAccess().then(redrawKp).catch(() => {});
  // data dari server diperbarui di tempat (tanpa menggambar ulang halaman) supaya posisi gulir tidak melompat
  L.loadProfile().then(() => { const b = $("#meBox"); if (b) b.innerHTML = meCard(); const s = $("#lvSub"), l2 = L.levelOf(L.cachedProfile()); if (s) s.textContent = `${l2.rank} · Lv ${l2.lv} · dari akun Ninokuu`; }).catch(() => {});
  api.rpc("nn_is_admin").then((ok) => { api.lsSet("isAdmin:" + user.id, !!ok); const el = $("#devRow"); if (el && !!ok !== !!el.innerHTML) el.innerHTML = ok ? devGroup() : ""; }).catch(() => {});
}
const devGroup = () => group("Developer", mrow("dev", "Panel developer", "Keypass · kunci bot WhatsApp", "dev"));
