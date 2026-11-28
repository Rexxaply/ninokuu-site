// NinoNime · titik sambung sumber video episode.
//
// Pemutar memanggil episodeSource(anime, nomorEpisode) setiap kali episode dibuka.
//   anime = { id (MyAnimeList), title, alt, eps, cover, trailer, ... }  (lihat mapA() di anime.js)
// Kembalikan salah satu bentuk berikut, atau null kalau episode itu belum tersedia:
//   { kind: "yt",  id: "ID_VIDEO_YOUTUBE" }               → diputar dengan pemutar YouTube
//   { kind: "mp4", url: "https://.../episode.mp4" }       → <video> biasa
//   { kind: "hls", url: "https://.../index.m3u8" }        → HLS (didukung bawaan Chrome Android / WebView)
//
// Contoh di bawah memakai daftar manual: nomor MyAnimeList → { nomor episode: sumber }.
// Isi dengan video yang memang boleh kamu putar (milik sendiri, berlisensi, atau unggahan resmi di YouTube).
// Jangan lupa menambahkan domain video ke Content-Security-Policy di index.html (media-src / frame-src).
const CATALOG = {
  // 12345: { 1: { kind: "yt", id: "xxxxxxxxxxx" }, 2: { kind: "mp4", url: "https://cdn.contoh.com/anime/12345/2.mp4" } },
};

// Bentuk lengkap (dipakai pemutar kustom), semua kolom selain kind/url boleh dihilangkan:
//   { kind: "mp4", url, servers: [{ name, url }], intro: [mulaiDtk, selesaiDtk], endingFromEnd: dtkSebelumAkhir }
//   servers  → pilihan "Server" (dropdown) di bawah video; url pertama = servers[0].url
//   intro    → tombol "Lewati intro" muncul di rentang ini
//   endingFromEnd → ending dianggap mulai N detik sebelum video selesai (untuk "Lewati ending otomatis")

// Versi demo (config.js → DEMO_DATA): setiap episode memutar film animasi terbuka "Big Buck Bunny"
// (© Blender Foundation, lisensi Creative Commons Attribution 3.0) dari dua host berbeda, supaya fitur
// pemutar (lewati intro, ±5 detik, server, kecepatan, lewati ending, episode berikutnya) bisa dicoba.
const DEMO_SERVERS = [
  { name: "Server 1 · Google", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
  { name: "Server 2 · Archive", url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" },
];
const demoSource = () => ({ kind: "mp4", url: DEMO_SERVERS[0].url, servers: DEMO_SERVERS, intro: [0, 24], endingFromEnd: 45, demo: true });

export async function episodeSource(anime, ep) {
  if (CATALOG[anime.id]?.[ep]) return CATALOG[anime.id][ep];
  if (window.NINONIME_CONFIG?.DEMO_DATA && ep > 0) return demoSource();
  return null;
}
