// =====================================================================
// 🛂 Passport · Visas · All-maps visit reward (2026-11) — the state side (UI: screens/passport.js)
//   Store.bank.passport = { <pid>: { no, issued, season, visas: [{ id, loc, at, season, used }], reward } }
//   · the passport is an ID: issued once (free) at 🛎️ 공항 서비스, kept for life — never stolen, sold or lost
//     (it is not a bag item, so no NPC / donation / revival rule can take it; the bag shows it as a chip)
//   · visas: one-use, bought at 🛎️ 공항 서비스 (8,000 / 9,000 / 10,000G) — a map pass (or the random map ticket)
//     into a map that is closed to this player by nationality / age / gender / record also needs that map's visa
//   · 🏆 visit every map of every region (Survival Land too) → 1,000,000G, once in a player's life
// =====================================================================
import { Store } from "../core/store.js";
import { LOCATIONS, LOC_BY_ID, REGIONS } from "../data/catalog.js";
import * as G from "./season.js";
import { whoOk } from "./extra.js";
import { belongsTo } from "./nation.js";

const S = () => Store.season;
const ps_ = pid => S()?.ps?.[pid];
const now = () => new Date().toISOString();
const wallet = ps => (ps?.money || 0) + (ps?.loanGold || 0);
const payGold = (ps, g) => { const fromLoan = Math.min(ps.loanGold || 0, g); ps.loanGold = (ps.loanGold || 0) - fromLoan; ps.money -= g - fromLoan; };

export const VISIT_REWARD = 1000000;
// [visa id, map id, price]  (Foggy Nation Casino 2 = ☁️ Cloud Casino, the second Foggy Nation-only casino)
export const VISAS = [
    ["visa_emo", "emo", 8000], ["visa_mj", "mj", 8000], ["visa_poly", "poly", 8000], ["visa_ground", "ground", 8000], ["visa_foggy", "foggy", 8000], ["visa_dungtown", "dungtown", 8000],
    ["visa_emo2", "emo2", 9000], ["visa_mj2", "mj2", 9000], ["visa_poly2", "poly2", 9000], ["visa_ground2", "ground2", 9000], ["visa_cloud", "cloud", 9000, "Foggy Nation Casino 2"], ["visa_dung2", "dung2", 9000],
    ["visa_baby", "baby_town", 10000], ["visa_nogirls", "no_girls", 10000], ["visa_noboys", "no_boys", 10000], ["visa_lgbt", "lgbt_nation", 10000], ["visa_senior", "senior_casino", 10000], ["visa_vip", "vip_casino", 10000], ["visa_other", "other_casino", 10000]
].map(([id, loc, price, label]) => ({ id, loc, price, label }));
export const VISA_BY_ID = Object.fromEntries(VISAS.map(v => [v.id, v]));
export const VISA_BY_LOC = Object.fromEntries(VISAS.map(v => [v.loc, v]));
export const visaName = v => v.label || LOC_BY_ID[v.loc]?.name || v.loc;
export const visaEmoji = v => LOC_BY_ID[v.loc]?.emoji || "🛂";

// ---------------------------------------------------------------- the book
const book = () => { const b = (Store.bank ||= {}); return (b.passport ||= {}); };
const save = () => Store.saveBank?.();
export const passportOf = pid => book()[pid] || null;
export const hasPassport = pid => !!passportOf(pid);
const passNo = pid => "GB" + String(pid).padStart(4, "0") + Math.random().toString(36).slice(2, 6).toUpperCase();
export function issuePassport(pid) {
    if (hasPassport(pid)) return { ok: false, why: "이미 여권이 있습니다" };
    book()[pid] = { no: passNo(pid), issued: now(), season: S()?.number ?? null, visas: [], reward: null };
    G.log?.(`🛂 ${G.name(pid)} 여권 발급 (무료)`);
    save(); Store.saveSeason?.(true);
    return { ok: true, pp: book()[pid] };
}

// ---------------------------------------------------------------- visas
export const visasOf = pid => passportOf(pid)?.visas || [];
export const validVisa = (pid, locId) => visasOf(pid).find(v => v.loc === locId && !v.used) || null;
export function buyVisa(pid, visaId) {
    const v = VISA_BY_ID[visaId], ps = ps_(pid);
    if (!v || !ps) return { ok: false, why: "비자를 고르세요" };
    if (!hasPassport(pid)) return { ok: false, why: "🛂 여권부터 발급받으세요" };
    if (validVisa(pid, v.loc)) return { ok: false, why: "아직 쓰지 않은 같은 비자가 있습니다" };
    if (wallet(ps) < v.price) return { ok: false, why: `골드 부족 (${v.price.toLocaleString()}G)` };
    payGold(ps, v.price);
    passportOf(pid).visas.push({ id: v.id, loc: v.loc, at: now(), season: S()?.number ?? null, used: null });
    G.log(`🛂 ${G.name(pid)} ${visaName(v)} 비자 구입 (${v.price.toLocaleString()}G)`);
    save(); Store.saveSeason(true);
    return { ok: true };
}
// is this map closed to the player by nationality / age / gender / record (so a pass alone is not enough)?
export function needsVisa(pid, loc) {
    const r = loc?.req;
    if (!r || !VISA_BY_LOC[loc.id]) return false;
    if (r.country) return !belongsTo(pid, r.country); // citizen · naturalized · 🪪 영주권자 need no visa
    if (r.who) return !whoOk(pid, r.who);
    return false;
}
export const visaWhy = (pid, loc) => needsVisa(pid, loc) && !validVisa(pid, loc.id)
    ? `🛂 ${loc.name} 비자가 필요합니다 (🛎️ 공항 서비스에서 구입 · ${(VISA_BY_LOC[loc.id]?.price || 0).toLocaleString()}G${hasPassport(pid) ? "" : " · 여권 먼저"})` : null;
export function useVisa(pid, loc) {
    if (!needsVisa(pid, loc)) return false;
    const v = validVisa(pid, loc.id);
    if (!v) return false;
    v.used = now(); v.usedSeason = S()?.number ?? null;
    G.log(`🛂 ${G.name(pid)} ${loc.name} 비자 사용`);
    save();
    return true;
}

// ---------------------------------------------------------------- visited maps (every region · Survival Land too)
export const regionsForBook = () => REGIONS.filter(r => !r.off || r.id === "survival");
export const allMaps = () => { const ok = new Set(regionsForBook().map(r => r.id)); return LOCATIONS.filter(l => ok.has(l.region) && !l.kidnap && !l.sub && !l.off); };
export function visitedIds(pid) {
    const life = Store.bank?.lifelog?.visits?.[pid] || [];
    return new Set([...life, ...(ps_(pid)?.visited || [])]);
}
export function visitStats(pid) {
    const all = allMaps(), seen = visitedIds(pid);
    const done = all.filter(l => seen.has(l.id));
    const byRegion = regionsForBook().map(r => ({ r, maps: all.filter(l => l.region === r.id), seen: done.filter(l => l.region === r.id) })).filter(x => x.maps.length);
    return { total: all.length, n: done.length, done, byRegion, all: done.length === all.length && all.length > 0 };
}
export function claimReward(pid) {
    const pp = passportOf(pid), ps = ps_(pid);
    if (!pp) return { ok: false, why: "🛂 여권부터 발급받으세요" };
    if (pp.reward) return { ok: false, why: "이미 보상을 받았습니다 (평생 1회)" };
    const st = visitStats(pid);
    if (!st.all) return { ok: false, why: `아직 ${st.total - st.n}곳을 방문하지 않았습니다 (${st.n} / ${st.total})` };
    if (!ps) return { ok: false, why: "시즌 중에만 받을 수 있습니다" };
    pp.reward = now();
    ps.money += VISIT_REWARD;
    G.log(`🏆 ${G.name(pid)} 모든 맵 방문 보상 +${VISIT_REWARD.toLocaleString()}G`);
    save(); Store.saveSeason(true);
    return { ok: true, gold: VISIT_REWARD };
}

// ---------------------------------------------------------------- hooks into game/season.js
// a map pass / random map ticket into a closed map also needs its visa (the visa is used up with the pass)
G.passChecks.push((pid, loc) => visaWhy(pid, loc));
G.passUseHooks.push((pid, loc) => useVisa(pid, loc));
