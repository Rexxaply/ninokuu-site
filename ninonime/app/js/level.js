// NinoNime · Level & Rank — dibaca dari profil Ninokuu (proyek Supabase yang sama, tabel "profiles").
// Rumus & daftar rank sama persis dengan Ninokuu Manga (js/store.js levelOf). EXP didapat dari aktivitas di Ninokuu.
import * as api from "./api.js";
import { esc, icon, $ } from "./ui.js";

export const RANK_LIST = [
  ["Peasant", 1, 12, "#AEB6C4"], ["Apprentice", 13, 24, "#F0BE84"], ["Adventurer", 25, 37, "#FFA36B"],
  ["Fighter", 38, 50, "#6FC3F2"], ["Paladin", 51, 62, "#5DD39E"], ["Archmage", 63, 75, "#B48CFF"],
  ["Hero of Legend", 76, 87, "#FF9CC0"], ["Dragon Emperor", 88, 99, "#F2B33D"],
];
const need = (lv) => 100 + lv * 40;
const rankOf = (lv) => { let ri = 0; RANK_LIST.forEach((r, i) => { if (lv >= r[1]) ri = i; }); return ri; };
export function levelOf(p) {
  if (!p) return { lv: 1, rank: RANK_LIST[0][0], ri: 0, cur: 0, need: need(1), max: false, color: RANK_LIST[0][3] };
  if (p.role === "developer") return { lv: 99, rank: RANK_LIST[7][0], ri: 7, cur: 0, need: 0, max: true, color: RANK_LIST[7][3] };
  let lv = 1, e = Math.max(0, Number(p.exp) || 0);
  while (lv < 99 && e >= need(lv)) { e -= need(lv); lv++; }
  const ri = rankOf(lv);
  return { lv, rank: RANK_LIST[ri][0], ri, cur: e, need: need(lv), max: lv >= 99, color: RANK_LIST[ri][3] };
}
const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0);
const num = (n) => Number(n || 0).toLocaleString("id-ID");

// profil Ninokuu milik akun ini (disimpan di HP supaya halaman langsung tampil)
const PK = () => "nkProfile:" + (api.userId() || "-");
export const cachedProfile = () => api.lsGet(PK());
export async function loadProfile() {
  if (!api.userId()) return null;
  const rows = await api.rest(`profiles?id=eq.${api.userId()}&select=name,exp,role,verified,avatar_path`)
    .catch(() => api.rest(`profiles?id=eq.${api.userId()}&select=name,exp,role,verified`));
  const p = rows?.[0] || null; api.lsSet(PK(), p); return p;
}

export const rankPill = (lv) => `<span class="rk-pill" style="--rc:${lv.color}">${icon("star", 11, 2.4)}${esc(lv.rank)}</span>`;
export const roleBadge = (p) => (p?.role === "developer" ? `<span class="pill-dev">DEV</span>` : p?.role === "moderator" ? `<span class="pill-mod">MOD</span>` : "") + (p?.verified ? `<span class="verif" title="Terverifikasi">${icon("check", 10, 3.2)}</span>` : "");
export function avatar(p, lv, size = 56, fallback = "?") {
  const ini = esc(((p?.name || fallback || "?")[0] || "?").toUpperCase());
  const img = p?.avatar_path ? `<img src="${esc(api.publicUrl("avatars", p.avatar_path))}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : "";
  return `<span class="lv-av" style="--rc:${lv.color};--s:${size}px"><span class="lv-av-in">${ini}${img}</span><span class="lv-av-lv">${lv.lv}</span></span>`;
}

// halaman Level & Rank (topbar + Ringkasan / Tangga)
export async function vLevel(view, x) {
  let tab = "sum";
  const draw = () => {
    const p = cachedProfile(), lv = levelOf(p);
    const tabs = `<div class="seg" role="tablist">${[["sum", "Ringkasan"], ["lad", "Tangga rank"]].map(([k, n]) => `<button role="tab" aria-selected="${tab === k}" data-act="tab" data-v="${k}">${n}</button>`).join("")}</div>`;
    const body = tab === "sum" ? `<div class="lv-card">
        <div class="row g14">${avatar(p, lv, 76, api.lsGet("username") || api.currentUser()?.email)}<span class="col g6 grow">${rankPill(lv)}<b class="lv-exp">${num(p?.exp)} EXP</b>
          <span class="mu xs">${lv.max ? (p?.role === "developer" ? "Developer · Lv 99" : "Level maksimal tercapai") : `${num(lv.need - lv.cur)} EXP lagi ke level ${lv.lv + 1}`}</span>
          <span class="prog"><span style="width:${lv.max ? 100 : pct(lv.cur, lv.need)}%;background:linear-gradient(90deg,var(--gold),${lv.color})"></span></span></span></div>
        <div class="lv-stats"><span><b>Lv ${lv.lv}</b><small>Level</small></span><span><b>${esc(lv.rank)}</b><small>Rank</small></span><span><b>${lv.max ? "—" : "Lv " + Math.min(99, lv.lv + 1)}</b><small>Berikutnya</small></span></div></div>
      <div class="note">${icon("info", 18)}<span>Level &amp; Rank memakai akun yang sama dengan <b>Ninokuu Manga</b>. EXP bertambah dari aktivitas membaca dan login harian di Ninokuu.${p ? "" : " Profil Ninokuu belum ditemukan untuk akun ini."}</span></div>`
      : `<div class="group">${RANK_LIST.map(([n, a, b, c], i) => `<div class="mrow lad${i === lv.ri ? " cur" : ""}" style="--rc:${c}"><span class="lad-ic">${icon("star", 18, 2.2)}</span><span class="rc-mid"><b>${esc(n)}</b><span class="mu sm">Level ${a}–${b}</span></span>${i === lv.ri ? `<span class="lad-me">Kamu</span>` : i < lv.ri ? `<span class="ok">${icon("check", 18, 2.4)}</span>` : ""}</div>`).join("")}</div>`;
    view.innerHTML = x.topbar("Level &amp; Rank") + `<div class="px col g14 mt6">${tabs}${body}</div><div class="pad-nav"></div>`;
  };
  draw();
  x.setActs({ back: () => x.back("#/akun"), tab: (el) => { if (tab !== el.dataset.v) { tab = el.dataset.v; draw(); } } });
  await loadProfile().then(draw).catch(() => {});
}
