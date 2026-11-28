// NinoNime · data contoh untuk versi demo (config.js → DEMO_DATA). Tidak ada permintaan ke internet:
// semua judul rekaan, sampul memakai sampul demo NinoNime. Dipakai untuk melihat tata letak & arah pengembangan.
import { JP_DAYS } from "./const.js";

const COVER = "icons/demo-cover.jpg";
const TITLES = [
  "Pedang Langit Senja", "Akademi Sihir Kirana", "Detektif Kota Hujan", "Naga Terakhir di Utara", "Klub Memasak Tengah Malam",
  "Pilot Bintang Biru", "Ninja dari Desa Kabut", "Kafe di Ujung Waktu", "Ratu Es dan Pangeran Api", "Robot Penjaga Kebun",
  "Pemburu Roh Akhir Pekan", "Band Sekolah Fajar", "Kapten Laut Selatan", "Penyihir Pemula Lily", "Kesatria Kartu Cahaya",
  "Hari-hari Kucing Kantor", "Sang Penjelajah Dungeon", "Taman Bunga Bulan", "Pelari Lintas Dimensi", "Rumah Sewa Para Dewa",
  "Pertarungan di Arena Kristal", "Surat untuk Masa Depan", "Pengawal Putri Kecil", "Legenda Gunung Merapi",
  "Misi Rahasia Kelas 2-B", "Pahlawan Kesiangan", "Musim Panas di Pulau Kecil", "Raja Catur Jalanan",
];
const GENRES = [["Action", "Fantasy"], ["Fantasy", "School"], ["Mystery", "Drama"], ["Action", "Adventure"], ["Comedy", "Slice of Life"], ["Sci-Fi", "Mecha"], ["Action", "Martial Arts"], ["Romance", "Slice of Life"], ["Romance", "Fantasy"], ["Sci-Fi", "Comedy"]];
const TYPES = ["TV", "TV", "TV", "Movie", "TV", "ONA", "TV", "OVA", "TV", "TV"];
const STUDIOS = ["Studio Senja", "Kirana Works", "Animasi Fajar", "Bintang Pictures"];
const TIMES = ["17:00", "19:30", "21:00", "22:30", "23:00", "00:30", "01:00", "18:00"];

export const DEMO_ANIME = TITLES.map((title, i) => {
  const airing = i % 3 !== 2, type = TYPES[i % TYPES.length];
  return {
    id: 900001 + i, title, alt: "", cover: COVER,
    score: Math.round((7.1 + ((i * 37) % 21) / 10) * 100) / 100, eps: type === "Movie" ? 1 : [12, 24, 13, 25][i % 4],
    status: airing ? "Currently Airing" : i % 6 === 5 ? "Not yet aired" : "Finished Airing", airing, type, year: 2026 - (i % 3),
    season: ["fall", "summer", "spring"][i % 3], members: 250000 - i * 7300, rating: "PG-13 - Teens 13 or older", duration: type === "Movie" ? "1 hr 52 min" : "24 min per ep",
    studios: [STUDIOS[i % STUDIOS.length]], genres: GENRES[i % GENRES.length],
    synopsis: `Ini sinopsis contoh untuk "${title}". Versi demo NinoNime memakai data rekaan supaya tata letak bisa dicek tanpa koneksi ke MyAnimeList. Nanti teks ini diganti sinopsis asli.`,
    bc: airing ? { day: JP_DAYS[i % 7], time: TIMES[i % TIMES.length] } : null, trailer: "", from: `${2026 - (i % 3)}-10-0${(i % 9) + 1}`,
  };
});
const page = (list, p = 1, n = 12) => ({ items: list.slice((p - 1) * n, p * n), next: p * n < list.length });
const byType = (t) => (a) => !t || a.type.toLowerCase() === t;
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 250));   // sedikit jeda supaya kerangka muat ikut terlihat

export const DEMO_API = {
  now: (p = 1, t = "") => delay(page(DEMO_ANIME.filter((a) => a.airing).filter(byType(t)), p)),
  related: (id) => { const i = DEMO_ANIME.findIndex((a) => a.id === Number(id)), L = ["Sequel", "Prequel", "Side Story", "Spin-Off", "Alternative Version"];
    return delay([1, 2, 3, 5, 8].map((k, j) => { const a = DEMO_ANIME[(i + k) % DEMO_ANIME.length]; return { id: a.id, title: a.title, rel: L[j] }; })); },
  hot: () => delay([...DEMO_ANIME].filter((a) => a.airing).sort((a, b) => b.members - a.members).slice(0, 10)),
  top: () => delay([...DEMO_ANIME].filter((a) => a.airing).sort((a, b) => b.score - a.score).slice(0, 10)),
  search: (q, p = 1, t = "") => { const w = String(q || "").toLowerCase(); return delay(page(DEMO_ANIME.filter((a) => a.title.toLowerCase().includes(w)).filter(byType(t)), p)); },
  detail: (id) => delay(DEMO_ANIME.find((a) => a.id === Number(id)) || DEMO_ANIME[0]),
  epThumbs: () => delay({}),
  episodes: (id) => { const a = DEMO_ANIME.find((x) => x.id === Number(id)) || DEMO_ANIME[0]; return delay(Array.from({ length: a.eps || 12 }, (_, i) => ({ n: i + 1, title: `Episode contoh ${i + 1}`, aired: "", filler: false, recap: false }))); },
  jpDay: (d) => delay(DEMO_ANIME.filter((a) => a.bc && a.bc.day === JP_DAYS[d])),
};
