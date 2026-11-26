// NinoNime · modul anime/const (dipecah dari anime.js)
import * as api from "./api.js";

export const WA_BOT = String(window.NINONIME_CONFIG?.WA_BOT || "").replace(/\D/g, "");
export const JIKAN = "https://api.jikan.moe/v4";
export const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const DAYS_S = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const JP_DAYS = ["sundays", "mondays", "tuesdays", "wednesdays", "thursdays", "fridays", "saturdays"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
