// =====================================================================
// 🏬 백화점 + 🎰 Monster Gotcha (screens/gotcha.js draws them)
//
// 🏬 백화점 — every good except monsters, at the admin's price, found by search.
//    One visit per season (the turn of the first purchase), up to 3 purchases in it.
//    Entry: a roulette once per round — refused 35% · 1,000 / 3,000 / 5,000 / 10,000G or free (13% each).
//    In Dead Land maps: refused 65% · the other five 7% each.
//
// 🎰 Monster Gotcha — a capsule machine that sells monsters.
//    Door: 60% let in / 40% turned away, decided once per round. 1 purchase per round.
//    Each machine has a monster pool (per map, set in 🌍 지역·맵 관리 → settings "maps".gotcha[locId])
//    and odds by rarity (★1 Common · ★2 Uncommon · ★3 Rare · ★4 Epic · ★5 Legendary);
//    a 꽝 캡슐 (item gotcha_blank) may come out instead — ♻️ 수거 trades them all for 100~1,000 G.
// =====================================================================
import { Store } from "../core/store.js";
import { CATS, saleOf } from "../data/catalogAdmin.js";
import { SHOPS, LOC_BY_ID } from "../data/catalog.js";
import { S, log, name } from "./season.js";
import { cat, species, emoItem, EMO_ITEMS, LAB_ONLY, EMO, weaponPrice, traitPrice, monOn, weaponOn, traitOn } from "../emomon/data.js";
import * as M from "../emomon/game.js";
import { emoSlots } from "./extra.js";

const ps_ = pid => S()?.ps?.[pid];

// ---------------------------------------------------------------- 🏬 백화점
export const DEPT_BUYS = 3;
const deptKey = locId => `${S().round}:${locId}`;
// → { left, locked } — locked: this season's visit already happened somewhere else / an earlier round
export function deptStatus(pid, locId) {
    const d = ps_(pid)?.dept;
    if (!d) return { left: DEPT_BUYS, locked: false };
    if (d.key !== deptKey(locId)) return { left: 0, locked: true };
    return { left: Math.max(0, DEPT_BUYS - d.buys), locked: false };
}
export function deptNoteBuy(pid, locId) {
    const ps = ps_(pid);
    if (!ps.dept) ps.dept = { key: deptKey(locId), buys: 0 };
    ps.dept.buys++;
}
// 🎡 entry roulette (once per round): refused 35% · the other five 13% each — the fee is paid on the spot
export const DEPT_DOOR = [
    { id: "no", label: "입장 거절", emoji: "🙅", fee: null, w: 35, color: "#7f1d1d" },
    { id: "g1k", label: "1,000G 지불 후 입장", emoji: "💵", fee: 1000, w: 13, color: "#166534" },
    { id: "g3k", label: "3,000G 지불 후 입장", emoji: "💵", fee: 3000, w: 13, color: "#1d4ed8" },
    { id: "g5k", label: "5,000G 지불 후 입장", emoji: "💰", fee: 5000, w: 13, color: "#7c3aed" },
    { id: "g10k", label: "10,000G 지불 후 입장", emoji: "💰", fee: 10000, w: 13, color: "#b45309" },
    { id: "free", label: "무료 입장", emoji: "🎉", fee: 0, w: 13, color: "#0e7490" }
];
// ☠️ Dead Land 백화점: refused 65% · the other five 7% each
export const DEPT_DOOR_DEAD = DEPT_DOOR.map(d => ({ ...d, w: d.id === "no" ? 65 : 7 }));
export const deptDoorFor = locId => LOC_BY_ID[locId]?.region === "deadland" ? DEPT_DOOR_DEAD : DEPT_DOOR;
// → null (not spun this round) | { round, id, ok, fee, broke }
export const deptDoorState = pid => { const d = ps_(pid)?.deptDoor; return d?.round === S().round ? d : null; };
export function deptDoorRoll(pid, locId) {
    const ps = ps_(pid), s = S();
    if (ps.deptDoor?.round === s.round) return ps.deptDoor;
    const odds = deptDoorFor(locId);
    let x = Math.random() * 100, pick = odds[0];
    for (const d of odds) { if ((x -= d.w) < 0) { pick = d; break; } }
    const r = { round: s.round, id: pick.id, ok: pick.fee != null, fee: pick.fee || 0, broke: false };
    if (r.ok && r.fee > ps.money) { r.ok = false; r.broke = true; }        // can't pay the fee → turned away
    if (r.ok && r.fee) ps.money -= r.fee;
    ps.deptDoor = r;
    log(`🎡 ${name(pid)} 백화점 입장 룰렛 → ${pick.label}${r.broke ? " (골드 부족으로 입장 실패)" : ""}`);
    Store.saveSeason(true);
    return r;
}
// already shopping here this round (the visit started) → no roulette again
export const deptInside = (pid, locId) => ps_(pid)?.dept?.key === deptKey(locId);
// every good on sale anywhere (admin price · currency), monsters excluded
// → [{ src: "game"|"emo", cat, id, name, price: { gold, pts } }]
export function deptGoods() {
    const out = [];
    for (const cat_ of Object.keys(CATS)) for (const e of CATS[cat_].list) {
        const s = saleOf(cat_, e.id);
        if (s.off || !s.shop || !SHOPS[s.shop] || !s.price) continue;
        const price = s.cur === "PG" ? { pts: s.price, gold: s.gold || 0 } : s.cur === "P" ? { pts: s.price, gold: 0 } : { pts: 0, gold: s.price };
        out.push({ src: "game", cat: cat_, id: e.id, name: e.name, price });
    }
    const C = cat();
    if (C) {
        const kindTxt = { ball: "볼", potion: "HP 약", pp: "PP 약", cure: "치료제", delete: "티켓", radar: "레이더", breaker: "Breaker" };
        const emoIds = [...EMO_ITEMS.filter(i => !i.noSale && !LAB_ONLY.has(i.id)).map(i => i.id),
            ...C.items.filter(i => ["evolution", "material"].includes(i.category) && !LAB_ONLY.has(i.id)).map(i => i.id)];
        for (const id of new Set(emoIds)) {
            const it = emoItem(id);
            if (!it || !(it.gold || it.pts)) continue;
            out.push({ src: "emo", cat: "emoitem", id, name: it.name, kind: it.attr ? "속성 볼" : kindTxt[it.kind] || (it.orb ? "진화 Orb" : it.kind === "material" ? "LAB 재료" : "진화 아이템"), price: { gold: it.gold || 0, pts: it.pts || 0 } });
        }
        for (const w of C.weapons.filter(w => w.attribute && weaponOn(w.id) && !(w.allowed_monster_ids || []).map(Number).includes(EMO.BOT_ID)))
            out.push({ src: "emo", cat: "emoweapon", id: w.id, name: w.name, kind: `몬스터 무기 · ${w.attribute}`, price: weaponPrice(w) });
        for (const t of C.traits.filter(t => traitOn(t.id)))
            out.push({ src: "emo", cat: "emotrait", id: t.id, name: t.name, kind: "몬스터 특성", price: traitPrice(t) });
    }
    return out;
}
export function giveEmoGood(pid, g) {
    if (g.cat === "emoitem") M.giveItem(pid, g.id);
    else if (g.cat === "emoweapon") M.giveWeapon(pid, g.id);
    else if (g.cat === "emotrait") M.giveTrait(pid, g.id);
}

// ---------------------------------------------------------------- 🎰 Monster Gotcha
export const RARITY_NAME = { 1: "Common", 2: "Uncommon", 3: "Rare", 4: "Epic", 5: "Legendary", 6: "Mythic" };
export const GOTCHA_OK = 0.6;
// pools are species ids (EmoMonster ids) — Single: one monster per map, spread over SINGLE_DEFAULT
export const SINGLE_DEFAULT = [83, 9, 76, 44, 1, 2]; // Poopi · Mago · Epie · Eggie · Fishy · Hearty
export const GOTCHAS = {
    single:  { name: "Single Gotcha",    emoji: "🥚", price: { gold: 30000, pts: 0 }, miss: 50, rates: null, max: 1, note: "몬스터 1마리 · 꽝 캡슐 50%" },
    basic:   { name: "Basic Gotcha",     emoji: "🎁", price: { gold: 50000, pts: 0 }, miss: 40, rates: { 1: 57, 2: 3 }, pool: [65, 26, 61, 3, 90], note: "몬스터 5마리 + 꽝 캡슐 · 운이 좋으면 Uncommon" },
    good:    { name: "Good Gotcha",      emoji: "💚", price: { gold: 100000, pts: 0 }, miss: 0, rates: { 1: 70, 2: 25, 3: 5 }, pool: [83, 9, 55, 65, 26, 95, 100, 90, 149, 89], note: "꽝 없음 · 운이 좋으면 Rare" },
    premium: { name: "Premium Gotcha",   emoji: "💜", price: { gold: 300000, pts: 0 }, miss: 0, rates: { 2: 55, 3: 40, 4: 5 }, pool: [90, 17, 28, 51, 149, 89, 25, 7, 94, 78], note: "꽝 없음 · 운이 좋으면 Epic" },
    legend:  { name: "Legendary Gotcha", emoji: "🌟", price: { gold: 0, pts: 500 }, miss: 0, rates: { 3: 60, 4: 37, 5: 3 }, pool: [149, 89, 25, 7, 211, 78, 64, 94, 160, 21], note: "꽝 없음 · 운이 좋으면 Legendary" }
};
const seedIdx = (str, n) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % n; };
export const defaultPool = (kind, locId) => kind === "single" ? [SINGLE_DEFAULT[seedIdx("gotcha-" + locId, SINGLE_DEFAULT.length)]] : [...GOTCHAS[kind].pool];
// the admin's pool for this map (settings "maps".gotcha[locId][kind]) or the default
export const gotchaPool = (kind, locId) => {
    const ov = Store.maps?.gotcha?.[locId]?.[kind];
    return (Array.isArray(ov) ? ov : defaultPool(kind, locId)).map(Number);
};
// rarity shares among the monsters really in the pool: a rarity without its own share joins the
// nearest one that has a share (lower first); shares of rarities nobody fills are spread over the rest
export function gotchaOdds(kind, locId) {
    const G_ = GOTCHAS[kind];
    const mons = gotchaPool(kind, locId).map(species).filter(s => s && monOn(s.id));
    const miss = G_.miss || 0;
    if (!mons.length) return { miss: 100, rows: [] };
    if (!G_.rates) return { miss, rows: mons.map(s => ({ s, pct: (100 - miss) / mons.length })) };
    const tiers = Object.keys(G_.rates).map(Number);
    const tierOf = r => tiers.includes(r) ? r : [...tiers].sort((a, b) => Math.abs(a - r) - Math.abs(b - r) || a - b)[0];
    const groups = {};
    for (const s of mons) (groups[tierOf(s.rarity || 1)] ||= []).push(s);
    const used = Object.keys(groups).map(Number), tot = used.reduce((a, t) => a + G_.rates[t], 0);
    const rows = [];
    for (const t of used) for (const s of groups[t]) rows.push({ s, pct: (100 - miss) * G_.rates[t] / tot / groups[t].length });
    return { miss, rows };
}
export const gotchaDoorState = pid => { const d = ps_(pid)?.gotchaDoor; return d?.round === S().round ? d.ok : null; };
export function gotchaDoor(pid) {
    const ps = ps_(pid), s = S();
    if (ps.gotchaDoor?.round !== s.round) { ps.gotchaDoor = { round: s.round, ok: Math.random() < GOTCHA_OK }; Store.saveSeason(); }
    return ps.gotchaDoor.ok;
}
export const gotchaBought = pid => ps_(pid)?.gotchaBuy === S().round;
export const slotsFull = pid => M.mons(pid).length >= emoSlots(pid);
// → { ok, why } or { ok, blank: true } or { ok, mon, s }
export function buyGotcha(pid, kind, locId) {
    const ps = ps_(pid), G_ = GOTCHAS[kind];
    if (!G_) return { ok: false, why: "없는 Gotcha" };
    if (gotchaDoorState(pid) !== true) return { ok: false, why: "먼저 입장하기를 눌러 입장 승인을 받아야 합니다" };
    if (gotchaBought(pid)) return { ok: false, why: "이번 라운드에는 이미 Gotcha를 뽑았습니다 (라운드당 1회)" };
    if (slotsFull(pid)) return { ok: false, why: "몬스터 칸이 가득 찼습니다. 칸을 비우거나 늘린 뒤 뽑아 주세요" };
    if (ps.money < (G_.price.gold || 0) || ps.points < (G_.price.pts || 0)) return { ok: false, why: "골드 · 포인트가 부족합니다" };
    const odds = gotchaOdds(kind, locId);
    if (!odds.rows.length) return { ok: false, why: "이 Gotcha에는 아직 몬스터가 없습니다" };
    ps.money -= G_.price.gold || 0; ps.points -= G_.price.pts || 0;
    ps.gotchaBuy = S().round;
    let roll = Math.random() * 100;
    if (roll < odds.miss) {
        ps.items.gotcha_blank = (ps.items.gotcha_blank || 0) + 1;
        log(`🥚 ${name(pid)} ${G_.name} → 꽝 캡슐`);
        Store.saveSeason(true);
        return { ok: true, blank: true };
    }
    roll -= odds.miss;
    let pick = odds.rows[odds.rows.length - 1].s;
    for (const r of odds.rows) { if (roll < r.pct) { pick = r.s; break; } roll -= r.pct; }
    const mon = M.newMon(pick.id, { from: "gotcha" });
    M.addMon(pid, mon);
    log(`🎰 ${name(pid)} ${G_.name} → ${RARITY_NAME[pick.rarity || 1]} ${pick.name}!`);
    Store.saveSeason(true);
    return { ok: true, mon, s: pick };
}
// ♻️ 꽝 캡슐 수거: all of them at once — 1개 100~190G … 10개 이상 1,000G
export function blankReward(n) { return n <= 0 ? 0 : Math.min(1000, n * 100 + Math.floor(Math.random() * 10) * 10); }
export function recycleBlanks(pid) {
    const ps = ps_(pid), n = ps.items.gotcha_blank || 0;
    if (n <= 0) return { ok: false, why: "수거할 꽝 캡슐이 없습니다" };
    const gold = blankReward(n);
    delete ps.items.gotcha_blank;
    ps.money += gold;
    log(`♻️ ${name(pid)} 꽝 캡슐 ${n}개 수거 → +${gold.toLocaleString()}G`);
    Store.saveSeason(true);
    return { ok: true, n, gold };
}
