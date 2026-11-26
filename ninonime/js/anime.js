// NinoNime · pintu masuk modul anime (fasad). Isinya sudah dipecah per fitur:
//   const.js · icons-anime.js · data.js (Jikan API) · lib.js (potongan bersama) · access.js (keypass)
//   home.js · jadwal.js · search.js · fav.js · fly.js (animasi sampul) · detail.js · player.js · admin.js
import "./icons-anime.js";
export { WA_BOT } from "./const.js";
export { cachedAccess, hasAccess, loadAccess, waText, openWa, openKeypass, closeKeypass, keypassSection, keypassActs } from "./access.js";
export { A, wibSlot } from "./data.js";
export { hist } from "./lib.js";
export { vHome } from "./home.js";
export { vJadwal } from "./jadwal.js";
export { vSearch } from "./search.js";
export { vFav, favs } from "./fav.js";
export { flyBack } from "./fly.js";
export { vDetail } from "./detail.js";
export { player } from "./player.js";
export { vKeypassAdmin } from "./admin.js";
