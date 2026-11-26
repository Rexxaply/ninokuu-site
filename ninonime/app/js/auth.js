// NinoNime · halaman masuk / daftar / lupa password (kartu berbalik, pegas Apple-like) + validasi form.
import * as api from "./api.js";
import * as AN from "./anime.js";
import { esc, icon, $, $$, toast, ask, closeAsk } from "./ui.js";
import { view, go, setActs, rerender } from "./shell.js";

let authMode = "in";
/* ---------- halaman masuk / daftar (kartu berbalik) ---------- */
// Masuk di sisi depan, Daftar di sisi belakang. "Tidak memiliki akun" membalik kartu ke kiri; "Sudah punya akun" membaliknya ke kanan.
// Balik kartu digerakkan pegas (bukan durasi tetap): bisa disentuh ulang di tengah jalan, lalu berbalik dari posisinya saat itu.
const TERMS = `<div class="terms">
  <h4>Penggunaan</h4>
  <ul><li>NinoNime hanya untuk pengguna yang diundang pemiliknya.</li>
  <li>NinoNime tidak menyediakan atau menautkan sumber bajakan. Tombol tonton hanya mengarah ke layanan resmi.</li></ul>
  <h4>Akun &amp; keypass</h4>
  <ul><li>Keypass bersifat pribadi: jangan dibagikan atau dijual.</li>
  <li>Pemilik dapat mencabut keypass bila ada penyalahgunaan.</li></ul>
  <h4>Data &amp; privasi</h4>
  <ul><li>Email, username, dan data akunmu disimpan di server untuk login dan akses.</li>
  <li>Password disimpan terenkripsi, bukan teks asli.</li>
  <li>Daftar favorit hanya disimpan di perangkatmu.</li></ul></div>`;
let flipUp = false;
const FG_HINT = "Kami kirim tautan untuk membuat password baru.";
const EMAIL_RE = /^(?!.*\.\.)[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const validEmail = (v) => v.length <= 254 && !/^[.]|[.]@/.test(v) && EMAIL_RE.test(v);
const USER_RE = /^[a-z][a-z0-9_.]{2,19}$/;
const COMMON = /^(password|passw0rd|12345678|123456789|1234567890|qwertyui|qwerty123|iloveyou|abc12345|11111111)/i;
// kekuatan password: 1 = lemah (merah), 2 = sedang (oranye), 3 = kuat (hijau)
export function strength(p) {
  if (p.length < 8 || COMMON.test(p) || /^(.)\1+$/.test(p)) return 1;
  let sc = 0;
  if (p.length >= 12) sc++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) sc++;
  if (/\d/.test(p)) sc++;
  if (/[^A-Za-z0-9]/.test(p)) sc++;
  if (sc >= 3 && p.length >= 10) return 3;
  return sc >= 1 ? 2 : 1;
}
const SLABEL = ["", "Lemah", "Sedang", "Kuat"];
const pwField = (up) => `<label>Password<span class="pw"><input name="pw" type="password" required minlength="8" autocomplete="${up ? "new-password" : "current-password"}" placeholder="Minimal 8 karakter"><button type="button" class="eye" data-act="eye" aria-label="Tampilkan password" aria-pressed="false">${icon("eye", 20)}</button></span></label>`;

export function authPage() {
  const front = `<form class="auth-face front" data-up="0" novalidate><div class="fc">
      <div class="pane p-login">
        <b class="b17">Masuk ke NinoNime</b>
        <label>Username atau email<input name="email" type="text" required autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" placeholder="username atau nama@email.com"></label>
        ${pwField(false)}
        <span class="err" role="alert"></span>
        <div class="acts"><button class="btn primary" type="submit">Masuk</button>
        <button class="btn ghost" type="button" data-act="flip">Tidak memiliki akun? Daftar</button></div></div>
      <div class="pane p-forgot" hidden>
        <b class="b17">Lupa password?</b>
        <label>Email<input name="femail" type="email" autocomplete="email" inputmode="email" placeholder="nama@email.com"></label>
        <span class="fg-msg" role="status">Kami kirim tautan untuk membuat password baru.</span>
        <div class="acts"><button class="btn primary" type="submit">Kirim tautan reset</button>
        <button class="btn ghost" type="button" data-act="fgback">Kembali ke Masuk</button></div></div></div></form>`;
  const back = `<form class="auth-face back" data-up="1" novalidate><div class="fc">
      <b class="b17">Daftar akun NinoNime</b>
      <label>Username<input name="username" required autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="contoh: nino_fan"><span class="hint" data-for="username" aria-live="polite"></span></label>
      <label>Email<input name="email" type="email" required autocomplete="email" inputmode="email" placeholder="nama@email.com"><span class="hint" data-for="email" aria-live="polite"></span></label>
      ${pwField(true)}
      <span class="meter" data-s="0" aria-live="polite"><i></i><i></i><i></i><em>Kekuatan password</em></span>
      <label class="agree"><input name="agree" type="checkbox" required><span>Saya menyetujui <a href="#" data-act="terms">Ketentuan &amp; Privasi</a> NinoNime.</span></label>
      <span class="err" role="alert"></span>
      <div class="acts"><button class="btn primary" type="submit">Daftar</button>
      <button class="btn ghost" type="button" data-act="flip">Sudah punya akun? Masuk</button></div></div></form>`;
  view.innerHTML = `<div class="auth-page"><img class="gate-logo" src="icons/logo.png" alt="NinoNime" width="207" height="48">
    <p class="mu lh ct">Masuk dulu untuk membuka NinoNime.</p>
    <div class="flip${flipUp ? " is-up" : ""}" id="flip"><div class="flip-in" id="flipIn">${front}${back}<span class="gloss" aria-hidden="true"></span></div></div>
    <div class="forgot" id="forgot"><button class="link" type="button" data-act="forgot">Lupa password?</button></div></div><div class="pad-nav"></div>`;
  const flip = $("#flip"), inner = $("#flipIn"), gloss = $(".gloss", flip), forgot = $("#forgot");
  const faces = $$(".auth-face", flip), faceOf = (up) => faces.find((f) => (f.dataset.up === "1") === up);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let fgMode = false;

  /* pegas untuk sudut balik: mulai dari nilai saat ini, bisa dibalik di tengah jalan, tanpa kunci input */
  let ang = flipUp ? -180 : 0, vel = 0, tgt = ang, raf = 0, last = 0;
  let hF = 0, hFt = 0, hFv = 0, hB = 0, hBt = 0, hBv = 0, hRaf = 0, hLast = 0;   // hF: tinggi sisi depan yang sedang tampil (berpegas ke hFt)
  const draw = () => {
    if (hF && hB) flip.style.height = hF + (hB - hF) * Math.min(1, Math.abs(ang) / 180) + "px";
    const dip = Math.sin(Math.min(1, Math.abs(ang) / 180) * Math.PI);          // 0 di ujung, 1 di tengah balikan
    inner.style.transform = `translateZ(${-70 * dip}px) rotateY(${ang}deg) scale(${1 - 0.035 * dip})`;
    gloss.style.opacity = String(dip * 0.55);
    flip.style.setProperty("--lift", String(dip));
  };
  const step = (t) => {
    const dt = Math.min(0.032, (t - last) / 1000); last = t;
    const w = (2 * Math.PI) / 0.58, z = 0.9;                                   // response 0,58 dtk, sedikit memantul
    vel += (-w * w * (ang - tgt) - 2 * z * w * vel) * dt; ang += vel * dt; draw();
    if (Math.abs(ang - tgt) < 0.04 && Math.abs(vel) < 0.6) { ang = tgt; vel = 0; draw(); raf = 0; return; }
    raf = requestAnimationFrame(step);
  };
  const go2 = (up) => { tgt = up ? -180 : 0; if (reduce) { ang = tgt; vel = 0; draw(); return; } if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
  draw();

  /* tinggi alami tiap sisi (isi + padding + border); kartu berubah tinggi bersama sudut balikan */
  const nat = (f) => $(".fc", f).offsetHeight + 42;
  const hStep = (t) => {
    const dt = Math.min(0.032, (t - hLast) / 1000); hLast = t; const w = (2 * Math.PI) / 0.4;             // respons 0,4 dtk, tanpa memantul: kurva mulus
    hFv += (-w * w * (hF - hFt) - 2 * w * hFv) * dt; hF += hFv * dt;
    hBv += (-w * w * (hB - hBt) - 2 * w * hBv) * dt; hB += hBv * dt; draw();
    if (Math.abs(hF - hFt) < 0.3 && Math.abs(hFv) < 2 && Math.abs(hB - hBt) < 0.3 && Math.abs(hBv) < 2) { hF = hFt; hFv = 0; hB = hBt; hBv = 0; draw(); hRaf = 0; return; }
    hRaf = requestAnimationFrame(hStep);
  };
  const fit = () => {
    faces.forEach((f) => f.style.setProperty("--ah", ($(".acts", f)?.offsetHeight || 108) + "px"));
    hFt = nat(faceOf(false)); hBt = nat(faceOf(true));
    if (!hF || reduce) { hF = hFt; hB = hBt; draw(); return; }
    if (!hRaf) { hLast = performance.now(); hRaf = requestAnimationFrame(hStep); }
  };
  const ro = "ResizeObserver" in window ? new ResizeObserver(fit) : null; faces.forEach((f) => ro?.observe($(".fc", f)));
  const sync = () => { faces.forEach((f) => { const hide = (f.dataset.up === "1") !== flipUp; f.inert = hide; f.setAttribute("aria-hidden", String(hide)); }); forgot.classList.toggle("off", flipUp || fgMode); };
  sync(); requestAnimationFrame(fit);

  /* tampil/sembunyi password */
  const eye = (btn) => { const inp = btn.parentElement.querySelector("input"), on = inp.type === "password"; inp.type = on ? "text" : "password"; btn.setAttribute("aria-pressed", String(on)); btn.setAttribute("aria-label", on ? "Sembunyikan password" : "Tampilkan password"); };

  /* validasi langsung di form daftar */
  const bf = faceOf(true), q = (n) => bf.elements[n], hint = (n) => $(`.hint[data-for="${n}"]`, bf);
  const setHint = (n, txt, kind) => { const h = hint(n); h.textContent = txt; h.dataset.k = kind || ""; };
  let uOk = null, uTimer = 0, uSeq = 0;
  const checkUser = () => {
    const v = q("username").value.trim().toLowerCase(); clearTimeout(uTimer); uOk = null; const my = ++uSeq;
    if (!v) { setHint("username", "", ""); return; }
    if (!USER_RE.test(v)) { setHint("username", "3–20 karakter: huruf kecil, angka, titik, garis bawah; diawali huruf.", "bad"); uOk = false; return; }
    setHint("username", "Memeriksa…", "wait");
    uTimer = setTimeout(async () => {
      try { const r = await api.rpc("nn_username_free", { p_username: v }); if (my !== uSeq) return;
        uOk = !!r?.free; setHint("username", uOk ? "Username tersedia" : (r?.error || "Username sudah dipakai"), uOk ? "ok" : "bad");
      } catch { if (my === uSeq) { uOk = null; setHint("username", "Tidak bisa memeriksa sekarang. Dicek lagi saat mendaftar.", "wait"); } }
    }, 450);
  };
  const checkMail = (final) => {
    const v = q("email").value.trim();
    if (!v) { setHint("email", "", ""); return false; }
    const ok = validEmail(v);
    setHint("email", ok ? (final ? "Format email benar" : "") : (final ? "Format email belum benar. Contoh: nama@email.com" : ""), ok ? "ok" : "bad");
    return ok;
  };
  const meter = $(".meter", bf);
  const checkPw = () => { const p = q("pw").value, s = p ? strength(p) : 0; meter.dataset.s = String(s); $("em", meter).textContent = s ? `Password ${SLABEL[s].toLowerCase()}${s === 1 && p.length < 8 ? " (minimal 8 karakter)" : ""}` : "Kekuatan password"; return s; };
  q("username").addEventListener("input", checkUser);
  q("email").addEventListener("input", () => checkMail(false)); q("email").addEventListener("blur", () => checkMail(true));
  q("pw").addEventListener("input", checkPw);
  faces.forEach((f) => f.addEventListener("input", (e) => {
    e.target.classList.remove("inv");
    if (e.target.name === "agree" && e.target.checked) { e.target.closest(".agree")?.classList.remove("inv", "shake"); const er = $(".err", f); if (/Ketentuan/.test(er.textContent)) er.textContent = ""; }
  }));

  /* lupa password: kartu Masuk berubah isi di tempat dan mengecil mengikuti kolomnya */
  const pLogin = $(".p-login", flip), pForgot = $(".p-forgot", flip), fgMsg = $(".fg-msg", flip), fEmail = faceOf(false).elements.femail;
  const setFg = (on) => {
    if (on === fgMode) return; fgMode = on;
    const cur = on ? pLogin : pForgot, nxt = on ? pForgot : pLogin;
    forgot.classList.toggle("off", flipUp || on);
    cur.hidden = true; nxt.hidden = false;                       // tukar isi seketika: tinggi kartu mulai berpegas di frame yang sama
    if (on) { const m = faceOf(false).elements.email.value.trim(); if (m && !fEmail.value) fEmail.value = m; fgMsg.textContent = FG_HINT; fgMsg.dataset.k = ""; }
    if (!reduce) { nxt.classList.add("in"); nxt.getBoundingClientRect(); nxt.classList.remove("in"); }   // isi baru muncul dari transparan + sedikit bergeser
    fit();
    (on ? fEmail : faceOf(false).elements.email).focus({ preventScroll: true });
  };
  const sendReset = async (form) => {
    const em = fEmail.value.trim(), btn = form.querySelector(".p-forgot button[type=submit]");
    fEmail.classList.toggle("inv", !em);
    if (!em) { fgMsg.dataset.k = "bad"; fgMsg.textContent = "Email tidak boleh kosong."; fEmail.focus({ preventScroll: true }); return; }
    if (!validEmail(em)) { fgMsg.dataset.k = "bad"; fgMsg.textContent = "Isi email yang formatnya benar."; return; }
    btn.disabled = true; fgMsg.dataset.k = ""; fgMsg.textContent = "Mengirim…";
    try { await api.recover(em); fgMsg.dataset.k = "ok"; fgMsg.textContent = "Jika email itu terdaftar, tautan reset sudah dikirim. Cek kotak masuk dan folder spam.";
      await ask(`Jika ${em} terdaftar, tautan reset password sudah dikirim. Buka emailmu (cek juga folder spam) lalu tekan tautannya: kamu akan diarahkan ke halaman reset password NinoNime. Setelah password baru tersimpan, kembali ke NinoNime dan masuk.`, { title: "Tautan reset terkirim", ok: "Mengerti", cancel: "" }); }
    catch (ex) { fgMsg.dataset.k = "bad"; fgMsg.textContent = ex.message; }
    setTimeout(() => { btn.disabled = false; }, 30000);
  };

  const setSide = (up) => { flipUp = up; authMode = up ? "up" : "in"; flip.classList.toggle("is-up", up); sync(); go2(up); };
  setActs({
    eye: (el) => eye(el),
    flip: () => setSide(!flipUp),
    terms: (_el, e) => { e?.preventDefault?.(); ask("", { title: "Ketentuan & Privasi", html: TERMS, ok: "Mengerti", cancel: "" }); },
    forgot: () => setFg(true),
    fgback: () => setFg(false),
  });

  faces.forEach((form) => form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.dataset.up === "0" && fgMode) { sendReset(form); return; }
    const up = form.dataset.up === "1", f = new FormData(form), btn = form.querySelector("button[type=submit]"), err = form.querySelector(".err");
    const email = String(f.get("email") || "").trim(), pw = String(f.get("pw") || ""), fail = (m, el) => { err.textContent = m; el?.focus({ preventScroll: true }); };
    err.textContent = "";
    $$(".inv", form).forEach((x) => x.classList.remove("inv"));
    // kolom kosong dicek lebih dulu, urut dari atas
    const empty = up ? [["username", "Username"], ["email", "Email"], ["pw", "Password"]] : [["email", "Username atau email"], ["pw", "Password"]];
    for (const [n, label] of empty) {
      const el = form.elements[n];
      if (!String(el.value || "").trim()) { el.classList.add("inv"); return fail(`${label} tidak boleh kosong.`, el); }
    }
    const byName = !up && !email.includes("@");
    if (!byName && !validEmail(email)) { if (up) checkMail(true); return fail("Format email belum benar. Contoh: nama@email.com", form.elements.email); }
    if (byName && !USER_RE.test(email.toLowerCase())) return fail("Username/email atau password salah.", form.elements.email);
    if (pw.length < 8) return fail("Password minimal 8 karakter.", form.elements.pw);
    let username = "";
    if (up) {
      username = String(f.get("username") || "").trim().toLowerCase();
      if (!USER_RE.test(username)) return fail("Username belum benar: 3–20 karakter, huruf kecil/angka/titik/garis bawah, diawali huruf.", form.elements.username);
      if (uOk === false) return fail("Username sudah dipakai atau tidak valid.", form.elements.username);
      if (!f.get("agree")) {
        const ag = form.querySelector(".agree"); ag.classList.remove("inv", "shake"); void ag.offsetWidth; ag.classList.add("inv", "shake");
        return fail("Centang persetujuan Ketentuan & Privasi terlebih dahulu.");
      }
    }
    btn.disabled = true;
    try {
      if (up) {
        const rv = await api.rpc("nn_reserve_username", { p_username: username, p_email: email.toLowerCase() });
        if (!rv?.ok) { uOk = false; setHint("username", rv?.error || "Username sudah dipakai", "bad"); throw new Error(rv?.error || "Username sudah dipakai. Coba yang lain."); }
        const r = await api.signUp(email, pw, username);
        if (r.confirm) {   // pop-up info dulu, lalu kartu berbalik mulus kembali ke Masuk (tanpa render ulang), email terisi
          faceOf(false).elements.email.value = email; faceOf(false).elements.pw.value = "";
          btn.disabled = false;
          await ask(`Kami mengirim tautan konfirmasi ke ${email}. Lihat di kotak masuk, atau cek folder spam kalau belum ada. Setelah dikonfirmasi, kembali ke sini lalu masuk.`, { title: "Email berhasil dikirim", ok: "Mengerti", cancel: "" });
          setSide(false);
          setTimeout(() => { form.reset(); setHint("username", "", ""); setHint("email", "", ""); checkPw(); uOk = null; }, 800);   // dikosongkan setelah kartu selesai berbalik
          return;
        }
      } else {
        try {
          let em = email;
          if (byName) { const r = await api.rpc("nn_login_email", { p_username: email.toLowerCase() }); em = r?.email || ""; if (!em) throw Object.assign(new Error("x"), { status: 400 }); }
          await api.signIn(em, pw);
        }
        catch (ex) { if (ex.status === 400 || ex.status === 401 || ex.status === 422) { if (/confirm|konfirm/i.test(ex.message)) throw new Error("Email belum dikonfirmasi. Cek kotak masuk atau spam."); throw new Error("Username/email atau password salah."); } throw ex; }
      }
      api.rpc("nn_claim_username").then((r) => { if (r?.username) api.lsSet("username", r.username); }).catch(() => {});
      await AN.loadAccess().catch(() => {});
      toast("Berhasil masuk");
      // berhasil masuk → langsung ke Beranda (tanpa keypass: kartu keypass tampil di sana)
      if (location.hash !== "#/home") go("#/home"); else rerender();
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
  }));
}
