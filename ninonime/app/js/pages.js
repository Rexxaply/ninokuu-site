// NinoNime · halaman turunan dari Akun (#/p/<nama>), seperti halaman di menu "Lainnya" Ninokuu:
// level, akun, ganti password, backup, pulihkan, tentang, kebijakan privasi, ketentuan pengguna.
import * as api from "./api.js";
import { esc, icon, $, toast } from "./ui.js";
import { VERSION, view, go, setActs, topbar, mrow } from "./shell.js";
import { vLevel } from "./level.js";

const isApp = () => { try { return !!window.Capacitor?.isNativePlatform?.(); } catch { return false; } };
const UPDATED = "26 November 2026";
const DOCS = {
  privacy: { title: "Kebijakan privasi", intro: "Halaman ini menjelaskan data apa yang dipakai NinoNime dan untuk apa.", secs: [
    ["Data akun", "Email, username, dan password dipakai untuk masuk. Password disimpan terenkripsi oleh Supabase, bukan teks asli. Akunnya satu dengan Ninokuu Manga."],
    ["Keypass", "Keypass terikat ke akunmu. Saat meminta keypass lewat bot WhatsApp, nomor WhatsApp pengirim dicatat untuk membatasi permintaan (maks. 3 per 24 jam)."],
    ["Data di HP", "Favorit dan riwayat tonton hanya disimpan di HP ini. Kamu bisa membuat cadangannya lewat Akun → Backup data offline."],
    ["Level &amp; Rank", "Level dan rank dibaca dari profil Ninokuu Manga (nama, EXP, foto profil). NinoNime tidak mengubah data tersebut."],
    ["Pihak ketiga", "Info anime diambil dari MyAnimeList lewat Jikan. Tombol tonton membuka layanan resmi; aturan privasi layanan itu berlaku di sana."],
  ] },
  terms: { title: "Ketentuan pengguna", intro: "Dengan memakai NinoNime, kamu setuju dengan ketentuan berikut.", secs: [
    ["Penggunaan", "NinoNime hanya untuk pengguna yang diundang pemiliknya. Jangan memakai aplikasi untuk hal yang melanggar hukum."],
    ["Konten", "NinoNime tidak menyediakan atau menautkan sumber bajakan. Tombol tonton hanya mengarah ke layanan resmi. Hak cipta tiap karya milik pemiliknya."],
    ["Keypass", "Keypass bersifat pribadi: jangan dibagikan atau dijual. Pemilik dapat mencabut keypass bila ada penyalahgunaan."],
    ["Perubahan", "Fitur dan ketentuan bisa berubah sewaktu-waktu. Perubahan penting diumumkan di aplikasi."],
  ] },
};

export async function vPage(name) {
  const ctx = { topbar, setActs, back: (f) => (history.length > 1 ? history.back() : go(f)) };
  const back = () => ctx.back("#/akun");
  const user = api.currentUser();
  if (!user) { go("#/akun"); return; }
  if (name === "level") { await vLevel(view, ctx); return; }
  const acts = { back };
  let html = "";
  if (name === "akun") {
    html = topbar("Akun") + `<div class="px col g14 mt6">
  <section class="sec p0"><h2 class="cap">Profil</h2><div class="group">${mrow("user", "Username", esc(api.lsGet("username") ? "@" + api.lsGet("username") : "Belum ada"), "noop")}</div></section>
  <section class="sec p0"><h2 class="cap">Masuk &amp; keamanan</h2><div class="group">${mrow("mail", "Email", esc(user.email || ""), "noop") + mrow("lock", "Ganti password", "", "goPass")}</div></section></div>`;
    acts.goPass = () => go("#/p/pass"); acts.noop = () => {};
  } else if (name === "pass") {
    html = topbar("Ganti password") + `<form class="px col g14 mt6 pf" id="pf" novalidate>
  <label class="fld">Password baru<input name="v" type="password" minlength="8" autocomplete="new-password" placeholder="Minimal 8 karakter"></label>
  <label class="fld">Ulangi password baru<input name="v2" type="password" minlength="8" autocomplete="new-password"></label><span class="err" id="perr"></span>
  <button class="btn primary">Simpan password</button><p class="mu xs lh m0">Password ini juga berlaku untuk Ninokuu Manga, karena akunnya satu.</p></form>`;
    acts.submit = async (f) => {
      const v = String(f.get("v") || ""), v2 = String(f.get("v2") || "");
      if (!v) throw new Error("Password baru tidak boleh kosong.");
      if (v.length < 8) throw new Error("Password minimal 8 karakter.");
      if (v !== v2) throw new Error("Kedua password tidak sama.");
      await api.updateUser({ password: v }); toast("Password baru disimpan"); back();
    };
  } else if (name === "backup") {
    const fav = api.lsGet("animeFav", []), hist = api.lsGet("animeHist", []);
    html = topbar("Backup data offline") + `<div class="px col g14 mt6"><p class="mu sm lh m0">Simpan salinan data NinoNime ke file di HP. Berguna sebelum ganti HP atau memasang ulang aplikasi.</p>
  <div class="card col g6"><b>Isi backup</b><span class="mu sm">${fav.length} anime favorit · ${hist.length} riwayat tonton</span></div>
  <button class="btn primary" data-act="dl">${icon("down", 18, 2)}Simpan file backup</button></div>`;
    acts.dl = () => {
      const data = { app: "NinoNime", v: 1, at: new Date().toISOString(), data: { animeFav: fav, animeHist: hist } };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
      a.download = `ninonime-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast("File backup diunduh");
    };
  } else if (name === "restore") {
    html = topbar("Pulihkan data") + `<div class="px col g14 mt6"><p class="mu sm lh m0">Pilih file backup (.json) dari HP. Data di file digabung dengan data yang sudah ada; judul yang sama tidak dobel.</p>
  <label class="btn primary">${icon("restore", 18, 2)}Pilih file backup<input type="file" accept="application/json,.json" id="rf" hidden></label><span class="err" id="perr"></span></div>`;
  } else if (name === "about") {
    html = topbar("Tentang aplikasi") + `<div class="px col g14 mt10"><div class="card col center g10 big-card"><img src="icons/logo.png" alt="NinoNime" class="about-logo">
    <span class="mu sm lh">Jadwal tayang dan info anime, satu akun dengan Ninokuu Manga.</span><span class="row g8 jc"><span class="pill">Versi ${esc(VERSION)}</span><span class="pill">${isApp() ? "Android" : "Web"}</span>${window.NINONIME_CONFIG?.DEMO_DATA ? `<span class="pill gold">Demo</span>` : ""}</span></div>
  <div class="group">${mrow("tv", "Data anime", "MyAnimeList lewat Jikan · jam tayang dalam WIB", "noop")}${mrow("cloud", "Akun", "Supabase · satu akun dengan Ninokuu", "noop")}</div>
  <div class="card lh sm"><b class="block mb6">Penting diketahui</b>NinoNime tidak menyimpan atau mengunggah video. Tombol tonton hanya membuka layanan resmi. Hak cipta tiap karya milik pemiliknya.</div>
  <p class="mu xs center lh">Dibuat dengan ♥ oleh Rexxaply<br>© 2026 NinoNime</p></div>`;
    acts.noop = () => {};
  } else if (DOCS[name]) {
    const d = DOCS[name];
    html = topbar(d.title) + `<div class="px col g14 mt10"><span class="mu xs">Terakhir diperbarui ${UPDATED}</span><p class="lh m0">${d.intro}</p>
  ${d.secs.map(([h, b], i) => `<section class="card"><h2 class="doc-h"><span class="gold">${String(i + 1).padStart(2, "0")}</span>${h}</h2><div class="doc-b">${b}</div></section>`).join("")}</div>`;
  } else { go("#/akun"); return; }
  view.innerHTML = html + `<div class="pad-nav"></div>`;
  const pf = $("#pf");
  if (pf) pf.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = pf.querySelector("button"); btn.disabled = true; $("#perr").textContent = "";
    try { await acts.submit(new FormData(pf)); } catch (ex) { $("#perr").textContent = ex.message; btn.disabled = false; }
  });
  const rf = $("#rf");
  if (rf) rf.addEventListener("change", async () => {
    const f = rf.files?.[0]; rf.value = ""; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j?.app !== "NinoNime" || !j.data) throw new Error("Ini bukan file backup NinoNime.");
      const ok = (x) => x && Number.isFinite(Number(x.id)) && typeof x.title === "string";
      const fav = (Array.isArray(j.data.animeFav) ? j.data.animeFav : []).filter(ok), hist = (Array.isArray(j.data.animeHist) ? j.data.animeHist : []).filter(ok);
      const merge = (cur, add) => { const seen = new Set(cur.map((x) => x.id)); return [...cur, ...add.filter((x) => !seen.has(x.id))]; };
      const before = api.lsGet("animeFav", []).length;
      api.lsSet("animeFav", merge(api.lsGet("animeFav", []), fav).slice(0, 300));
      api.lsSet("animeHist", merge(api.lsGet("animeHist", []), hist).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 60));
      toast(`Data dipulihkan · ${api.lsGet("animeFav", []).length - before} anime baru di favorit`, 3500); go("#/favorit");
    } catch (ex) { $("#perr").textContent = ex.message || "File tidak bisa dibaca."; }
  });
  setActs(acts);
}
