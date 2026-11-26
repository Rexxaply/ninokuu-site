// Koneksi ke Supabase (Auth + RPC). Tanpa library: semua lewat fetch.
const C = window.NINONIME_CONFIG || {};
const BASE = String(C.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = String(C.SUPABASE_ANON_KEY || "");
export const configured = !!(BASE && KEY);

const LS = "ninonime:";
export const lsGet = (k, d = null) => { try { const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
export const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(LS + k) : localStorage.setItem(LS + k, JSON.stringify(v)); } catch {} };

export class ApiError extends Error { constructor(msg, status = 0) { super(msg); this.status = status; } }
const NET_MSG = "Tidak ada koneksi internet. Periksa jaringanmu lalu coba lagi.";
const T = [
  [/Invalid login credentials/i, "Username/email atau password salah."],
  [/Email not confirmed/i, "Email belum dikonfirmasi. Cek kotak masuk (dan folder spam)."],
  [/User already registered/i, "Email ini sudah terdaftar. Silakan masuk."],
  [/Password should be at least/i, "Password minimal 8 karakter."],
  [/rate limit/i, "Terlalu banyak percobaan. Coba lagi beberapa saat lagi."],
  [/JWT expired/i, "Sesi berakhir, silakan masuk lagi."],
];
const translate = (m) => (T.find(([re]) => re.test(m)) || [0, m])[1];
async function readErr(r) {
  let j = null; try { j = await r.json(); } catch {}
  return new ApiError(translate(String(j?.error_description || j?.msg || j?.message || j?.error || `HTTP ${r.status}`)), r.status);
}

/* ---------- sesi login ---------- */
// Sesi bisa dibagi dengan Ninokuu bila keduanya satu alamat situs (SESSION_KEY: "ninokuu:session").
// Satu kunci untuk dua aplikasi + dibaca ulang tiap dipakai, supaya refresh token yang berputar tidak basi.
const SKEY = String(C.SESSION_KEY || "");
const readSess = () => { if (!SKEY) return lsGet("session"); try { const v = localStorage.getItem(SKEY); return v ? JSON.parse(v) : null; } catch { return null; } };
const writeSess = (v) => { if (!SKEY) return lsSet("session", v); try { v == null ? localStorage.removeItem(SKEY) : localStorage.setItem(SKEY, JSON.stringify(v)); } catch {} };
let session = readSess();
const syncSess = () => { const s = readSess(); if (JSON.stringify(s) !== JSON.stringify(session)) { session = s; listeners.forEach((f) => { try { f(session); } catch {} }); } };
addEventListener("storage", (e) => { if (!SKEY || e.key === SKEY) syncSess(); });
addEventListener("focus", syncSess);
const listeners = new Set();
export const onAuth = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function setSession(s) {
  session = s && s.access_token ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600), user: s.user } : null;
  writeSess(session);
  listeners.forEach((f) => { try { f(session); } catch {} });
}
export const currentUser = () => session?.user || null;
export const userId = () => session?.user?.id || null;

async function authCall(path, body, { method = "POST", token } = {}) {
  if (!configured) throw new ApiError("Aplikasi belum tersambung ke server (isi config.js).");
  let r;
  try {
    r = await fetch(BASE + "/auth/v1" + path, { method, headers: { apikey: KEY, "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new ApiError(NET_MSG); }
  if (!r.ok) throw await readErr(r);
  return r.status === 204 ? null : r.json().catch(() => null);
}
let refreshing = null;
async function accessToken() {
  syncSess();
  if (!session) return null;
  if (session.expires_at * 1000 - Date.now() > 60e3) return session.access_token;
  refreshing ||= authCall("/token?grant_type=refresh_token", { refresh_token: session.refresh_token })
    .then((s) => { setSession(s); return s.access_token; })
    .catch((e) => { if (e.status === 400 || e.status === 401) setSession(null); return null; })
    .finally(() => { refreshing = null; });
  return refreshing;
}
export async function signIn(email, password) { setSession(await authCall("/token?grant_type=password", { email: email.trim(), password })); return session; }
const RESET_URL = String(C.RESET_URL || "https://ninokuu.site/ninonime/resetpassword/");
const VERIFY_URL = String(C.VERIFY_URL || "https://ninokuu.site/ninonime/verified/");
// "Lupa password?": mengirim tautan reset ke email (halaman reset NinoNime di ninokuu.site/ninonime/resetpassword/; akunnya tetap satu dengan Ninokuu)
export async function recover(email) { await authCall("/recover?redirect_to=" + encodeURIComponent(RESET_URL), { email: email.trim() }); }
export async function signUp(email, password, username = "") {
  const r = await authCall("/signup?redirect_to=" + encodeURIComponent(VERIFY_URL), { email: email.trim(), password, ...(username ? { data: { nn_username: username } } : {}) });
  if (r?.access_token) { setSession(r); return { session }; }
  return { confirm: true };   // "Confirm email" aktif di Supabase: tunggu konfirmasi
}
// ganti password / email akun yang sedang masuk (berlaku juga untuk Ninokuu: akunnya satu)
export async function updateUser(attrs) { const t = await accessToken(); if (!t) throw new ApiError("Masuk dulu."); const u = await authCall("/user", attrs, { method: "PUT", token: t }); if (u?.id && session) setSession({ ...session, user: u }); return u; }
export async function signOut() { const t = session?.access_token; setSession(null); if (t) authCall("/logout", null, { token: t }).catch(() => {}); }

/* ---------- tabel (REST) — dipakai untuk membaca profil Ninokuu (satu proyek Supabase) ---------- */
export async function rest(path) {
  if (!configured) throw new ApiError("Aplikasi belum tersambung ke server (isi config.js).");
  const t = (await accessToken()) || KEY;
  let r;
  try { r = await fetch(BASE + "/rest/v1/" + path, { headers: { apikey: KEY, Authorization: "Bearer " + t } }); } catch { throw new ApiError(NET_MSG); }
  if (!r.ok) throw await readErr(r);
  return r.json();
}
export const publicUrl = (bucket, path) => `${BASE}/storage/v1/object/public/${bucket}/${String(path).split("/").map(encodeURIComponent).join("/")}`;

/* ---------- RPC (fungsi SQL di supabase/schema.sql) ---------- */
export async function rpc(fn, args = {}) {
  if (!configured) throw new ApiError("Aplikasi belum tersambung ke server (isi config.js).");
  const t = (await accessToken()) || KEY;
  let r;
  try {
    r = await fetch(BASE + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  } catch { throw new ApiError(NET_MSG); }
  if (!r.ok) throw await readErr(r);
  return r.status === 204 ? null : r.json();
}
