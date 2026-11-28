// NinoNime · modul anime/data (dipecah dari anime.js)
import * as api from "./api.js";
import { $ } from "./ui.js";
import { JIKAN, JP_DAYS } from "./const.js";
import { DEMO_API } from "./demo.js";

/* =====================================================================
   Jikan API: antrean (maks ±3 permintaan/detik) + cache
   ===================================================================== */
const mem = new Map();
let qTail = Promise.resolve(), lastAt = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function jget(path, ttlMin = 30) {
  const k = "jk:" + path, now = Date.now();
  const m = mem.get(k); if (m && now - m.at < ttlMin * 60e3) return m.v;
  const ls = api.lsGet(k); if (ls && now - ls.at < ttlMin * 60e3) { mem.set(k, ls); return ls.v; }
  const job = qTail.then(async () => {
    for (let i = 0; i < 4; i++) {
      const wait = lastAt + 380 - Date.now(); if (wait > 0) await sleep(wait);
      lastAt = Date.now();
      let r;
      try { r = await fetch(JIKAN + path); } catch { if (ls) return ls.v; throw new Error("Tidak ada koneksi internet."); }
      if (r.status === 429 || r.status >= 500) { await sleep(900 * (i + 1)); continue; }
      if (!r.ok) throw new Error(r.status === 404 ? "Anime tidak ditemukan." : `Gagal memuat data anime (HTTP ${r.status}).`);
      const v = await r.json();
      const e = { at: Date.now(), v }; mem.set(k, e);
      if (JSON.stringify(v).length < 180000) api.lsSet(k, e);
      return v;
    }
    if (ls) return ls.v;
    throw new Error("Server data anime sedang sibuk. Coba lagi sebentar.");
  });
  qTail = job.catch(() => {});
  return job;
}
// buang cache Jikan lama dari penyimpanan HP (dipanggil sesekali)
function trimCache() {
  try { Object.keys(localStorage).filter((k) => k.startsWith("ninonime:jk:")).forEach((k) => { const v = JSON.parse(localStorage.getItem(k)); if (!v || Date.now() - v.at > 2 * 86400e3) localStorage.removeItem(k); }); } catch {}
}
setTimeout(trimCache, 8000);

const ytId = (t) => t?.youtube_id || (String(t?.embed_url || "").match(/embed\/([\w-]{11})/) || [])[1] || "";
const DEMO = window.NINONIME_CONFIG?.DEMO_COVERS ? "icons/demo-cover.jpg" : "";   // versi demo: sampul NinoNime
const mapA = (a) => ({
  id: a.mal_id, title: a.title || a.title_english || "", alt: a.title_english && a.title_english !== a.title ? a.title_english : "",
  cover: DEMO || a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
  score: a.score, eps: a.episodes, status: a.status, airing: !!a.airing, type: a.type, year: a.year || a.aired?.prop?.from?.year,
  season: a.season, members: a.members, rating: a.rating, duration: a.duration, studios: (a.studios || []).map((s) => s.name),
  genres: [...(a.genres || []), ...(a.themes || [])].map((g) => g.name), synopsis: a.synopsis || "",
  bc: a.broadcast?.time ? { day: String(a.broadcast.day || "").toLowerCase(), time: a.broadcast.time } : null, trailer: ytId(a.trailer),
  from: a.aired?.from || "",
});
export const uniq = (list) => { const s = new Set(); return list.filter((x) => !s.has(x.id) && s.add(x.id)); };
const SFW = "sfw=true";
export const A = {
  now: async (page = 1, type = "") => { const r = await jget(`/seasons/now?${SFW}&limit=24&page=${page}${type ? "&filter=" + type : ""}`, 60); return { items: uniq((r.data || []).map(mapA)), next: !!r.pagination?.has_next_page }; },
  top: async () => uniq(((await jget(`/top/anime?filter=airing&${SFW}&limit=10`, 180)).data || []).map(mapA)),
  // Anime Terkait: relasi MyAnimeList (sekuel, prekuel, …) tanpa sampul → { id, title, rel }; tidak ada relasi → rekomendasi (dengan sampul)
  related: async (id) => {
    const r = await jget(`/anime/${id}/relations`, 720), seen = new Set([Number(id)]);
    const rel = (r.data || []).flatMap((g) => (g.entry || []).filter((e) => e.type === "anime").map((e) => ({ id: e.mal_id, title: e.name, rel: g.relation })))
      .filter((e) => !seen.has(e.id) && seen.add(e.id)).slice(0, 10);
    if (rel.length) return rel;
    const rc = await jget(`/anime/${id}/recommendations`, 720);
    return (rc.data || []).slice(0, 10).map((x) => ({ id: x.entry?.mal_id, title: x.entry?.title, rel: "Mirip", cover: DEMO || x.entry?.images?.webp?.large_image_url || x.entry?.images?.jpg?.image_url || "" })).filter((e) => e.id);
  },
  // 10 Hot Anime: anime musim ini yang paling banyak ditonton (jumlah anggota MyAnimeList)
  hot: async () => [...(await A.now(1)).items].sort((a, b) => (b.members || 0) - (a.members || 0)).slice(0, 10),
  search: async (q, page = 1, type = "") => { const r = await jget(`/anime?q=${encodeURIComponent(q)}&${SFW}&limit=24&page=${page}&order_by=members&sort=desc${type ? "&type=" + type : ""}`, 60); return { items: uniq((r.data || []).map(mapA)), next: !!r.pagination?.has_next_page }; },
  detail: async (id) => mapA((await jget(`/anime/${id}/full`, 360)).data || {}),
  // gambar per episode (kalau ada di MyAnimeList): { nomor: url }
  epThumbs: async (id) => { if (DEMO) return {}; const o = {}; ((await jget(`/anime/${id}/videos/episodes`, 360)).data || []).forEach((v) => { const n = Number(String(v.episode || "").replace(/\D+/g, "")) || v.mal_id; const u = v.images?.jpg?.image_url; if (n && u) o[n] = u; }); return o; },
  episodes: async (id) => ((await jget(`/anime/${id}/episodes`, 120)).data || []).map((e) => ({ n: e.mal_id, title: e.title || "", aired: e.aired, filler: e.filler, recap: e.recap })),
  // jadwal satu hari JST (semua halaman, maks 3)
  jpDay: async (d) => {
    let out = [];
    for (let p = 1; p <= 3; p++) { const r = await jget(`/schedules?filter=${JP_DAYS[d].slice(0, -1)}&${SFW}&kids=false&limit=25&page=${p}`, 180); out = out.concat((r.data || []).map(mapA)); if (!r.pagination?.has_next_page) break; }
    return uniq(out);
  },
};
// versi demo (config.js → DEMO_DATA): semua data dari js/demo.js, tanpa internet
if (window.NINONIME_CONFIG?.DEMO_DATA) Object.assign(A, DEMO_API);


/* ---------- waktu tayang: JST → WIB (WIB = JST − 2 jam) ---------- */
// mengembalikan { day: 0..6 (WIB), min: menit sejak 00.00 WIB } atau null
export function wibSlot(bc) {
  if (!bc?.time) return null;
  const jd = JP_DAYS.indexOf(bc.day); if (jd < 0) return null;
  const [h, m] = bc.time.split(":").map(Number); let min = h * 60 + (m || 0) - 120, day = jd;
  if (min < 0) { min += 1440; day = (day + 6) % 7; }
  return { day, min };
}
export const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
// waktu sekarang di WIB (tidak bergantung zona waktu HP)
export const wibNow = () => { const d = new Date(Date.now() + 7 * 3600e3); return { day: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), date: d }; };
export async function scheduleFor(day) {
  // anime tayang hari WIB `day` = jadwal JST hari yang sama (jam ≥ 02.00) + JST hari berikutnya (jam < 02.00)
  const [a, b] = await Promise.all([A.jpDay(day), A.jpDay((day + 1) % 7)]);
  return uniq([...a, ...b]).map((x) => ({ ...x, slot: wibSlot(x.bc) })).filter((x) => x.slot && x.slot.day === day).sort((p, q) => p.slot.min - q.slot.min);
}
