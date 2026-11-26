// NinoNime · halaman Akun (sudah masuk), disusun seperti halaman "Lainnya" di Ninokuu Manga:
// profil, akun, keypass (lihat/salin/hapus), developer, aplikasi Android, data & penyimpanan, dukungan, keluar.
import * as api from "./api.js";
import * as AN from "./anime.js";
import { esc, icon, $, toast, ask } from "./ui.js";
import { VERSION, view, go, setActs, group, mrow } from "./shell.js";
import { authPage, TERMS } from "./auth.js";

const SITE = "https://ninokuu.site/";
const isApp = () => { try { return !!window.Capacitor?.isNativePlatform?.(); } catch { return false; } };
// data yang tersimpan di HP ini (ikut backup): favorit & riwayat tonton
const BACKUP_KEYS = ["animeFav", "animeHist"];

export async function vAkun() {
  const user = api.currentUser();
  if (!user) { authPage(); return; }
  const uname = api.lsGet("username");
  const acc = AN.cachedAccess();
  view.innerHTML = `<div class="page-h"><h1>Akun</h1></div>
${!api.configured ? `<p class="note-warn mx">${icon("info", 18)}Isi SUPABASE_URL dan SUPABASE_ANON_KEY di config.js.</p>` : ""}
<div class="me-card mx"><span class="me-ini">${esc(((uname || user.email || "?")[0] || "?").toUpperCase())}</span>
  <span class="rc-mid g4"><b>${esc(uname ? "@" + uname : user.email || "")}</b><span class="mu sm" id="meSub">${acc?.access ? "Keypass aktif" : "Belum ada keypass"}</span></span></div>
${group("Akun", mrow("mail", "Email", esc(user.email || ""), "email") + mrow("lock", "Ganti password", "Kirim tautan untuk membuat password baru", "pass"))}
<div id="kpSec">${AN.keypassSection()}</div>
<div id="devRow"></div>
${isApp() ? "" : group("Aplikasi Android", mrow("down", "Pasang aplikasi Android (APK)", "Halaman unduh di ninokuu.site", "getapk"))}
${group("Data &amp; penyimpanan", mrow("cloud", "Backup data offline", "Simpan favorit &amp; riwayat tonton ke file", "backup") + mrow("restore", "Pulihkan data", "Dari file backup", "restore") + mrow("trash", "Bersihkan cache", `<span id="cacheSub">Data jadwal &amp; info anime yang disimpan sementara</span>`, "cache"))}
${group("Dukungan", mrow("info", "Tentang aplikasi", "Versi " + esc(VERSION), "about") + mrow("shield", "Kebijakan privasi", "", "privacy") + mrow("doc", "Ketentuan pengguna", "", "terms"))}
${group("Sesi", mrow("out", "Keluar", "", "logout", true))}
<p class="mu xs center mt18">NinoNime versi ${esc(VERSION)}</p>
<input type="file" id="rsFile" accept="application/json,.json" hidden>
<div class="pad-nav"></div>`;
  const redrawKp = () => { const el = $("#kpSec"); if (el) el.innerHTML = AN.keypassSection(); const s = $("#meSub"); if (s) s.textContent = AN.cachedAccess()?.access ? "Keypass aktif" : "Belum ada keypass"; };
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
    email: () => toast(user.email || ""),
    pass: async () => {
      if (!(await ask(`Tautan untuk membuat password baru akan dikirim ke ${user.email}. Buka emailmu lalu tekan tautannya.`, { title: "Ganti password", ok: "Kirim tautan" }))) return;
      try { await api.recover(user.email); toast("Tautan dikirim. Cek email (dan folder spam).", 4000); } catch (e) { toast(e.message); }
    },
    dev: () => go("#/admin"),
    getapk: () => window.open(SITE, "_blank", "noopener"),
    backup: () => {
      const data = { app: "NinoNime", v: 1, at: new Date().toISOString(), data: Object.fromEntries(BACKUP_KEYS.map((k) => [k, api.lsGet(k, [])])) };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
      a.download = `ninonime-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast(`Backup dibuat: ${api.lsGet("animeFav", []).length} favorit, ${api.lsGet("animeHist", []).length} riwayat`);
    },
    restore: () => $("#rsFile").click(),
    cache: async () => {
      try { for (const k of Object.keys(localStorage)) if (k.startsWith("ninonime:jk:")) localStorage.removeItem(k); } catch {}
      try { if (window.caches) for (const k of await caches.keys()) if (k.startsWith("ninonime-")) await caches.delete(k); } catch {}
      showCache(); toast("Cache dibersihkan");
    },
    about: () => ask(`NinoNime v${VERSION}\n\nJadwal tayang dan info anime. Data anime dari MyAnimeList (lewat Jikan). Tombol tonton hanya mengarah ke layanan resmi.`, { title: "Tentang NinoNime", ok: "Tutup", cancel: "" }),
    privacy: () => ask("", { title: "Kebijakan privasi", html: TERMS, ok: "Mengerti", cancel: "" }),
    terms: () => ask("", { title: "Ketentuan pengguna", html: TERMS, ok: "Mengerti", cancel: "" }),
    logout: async () => { if (!(await ask("Keluar dari akun?", { ok: "Keluar", danger: true }))) return; AN.player.close(); await api.signOut(); api.lsSet("username", null); toast("Kamu sudah keluar"); vAkun(); },
  });
  $("#rsFile").addEventListener("change", async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j?.app !== "NinoNime" || !j.data) throw new Error("Bukan file backup NinoNime.");
      const fav = Array.isArray(j.data.animeFav) ? j.data.animeFav : [], hist = Array.isArray(j.data.animeHist) ? j.data.animeHist : [];
      if (!(await ask(`File berisi ${fav.length} favorit dan ${hist.length} riwayat. Digabung dengan data di HP ini (yang sama tidak dobel).`, { title: "Pulihkan data?", ok: "Pulihkan" }))) return;
      const merge = (cur, add) => { const seen = new Set(cur.map((x) => x.id)); return [...cur, ...add.filter((x) => x && x.id && !seen.has(x.id))]; };
      api.lsSet("animeFav", merge(api.lsGet("animeFav", []), fav).slice(0, 300));
      api.lsSet("animeHist", merge(api.lsGet("animeHist", []), hist).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 60));
      toast("Data dipulihkan");
    } catch (ex) { toast(ex.message || "File tidak bisa dibaca"); }
  });
  if (!uname) api.rpc("nn_claim_username").then((r) => { if (r?.username) { api.lsSet("username", r.username); vAkun(); } }).catch(() => {});
  AN.loadAccess().then(redrawKp).catch(() => {});
  api.rpc("nn_is_admin").then((ok) => { const el = $("#devRow"); if (ok && el) el.innerHTML = group("Developer", mrow("dev", "Panel developer", "Keypass · kunci bot WhatsApp", "dev")); }).catch(() => {});
}
