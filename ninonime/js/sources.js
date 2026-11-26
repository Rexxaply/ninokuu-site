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

export async function episodeSource(anime, ep) {
  return CATALOG[anime.id]?.[ep] || null;
}
