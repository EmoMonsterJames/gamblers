// =====================================================================
// 🍚 Food gauge · 🏪 food corners · 🌦️ weather · 🏨 lodging — rules.
// Season state:
//   ps.food                       0–100 (starts at 30)
//   ps.foodUse = { round, n, pantry, door: { <key>: { in, paid } }, stock: { <key>: [foodIds] } }
//   turn.life = { sec, map, mapSec, wxHits }   (play seconds of the turn / on the current map)
//   s.lodge   = { <locId>: { <lodgeKey>: { <roomKey>: { pid, from, until } } } }
//   s.wx      = { <locId>: { round, w } }      (maps whose weather is "random")
// Definitions: data/life.js · screens: screens/lifeCorners.js
// =====================================================================
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { LOC_BY_ID } from "../data/catalog.js";
import * as L from "../data/life.js";
import { S, log, name, roundHooks, killPlayer, hpToll } from "./season.js";
import { ownsTypes } from "./extra.js";
import { activeBiz } from "./bank.js";

const rnd = () => Math.random();
const ps_ = pid => S()?.ps?.[pid];
const round = () => S()?.round || 0;
const pay = (ps, g) => { const fromLoan = Math.min(ps.loanGold || 0, g); ps.loanGold = (ps.loanGold || 0) - fromLoan; ps.money -= g - fromLoan; };
const wallet = ps => (ps?.money || 0) + (ps?.loanGold || 0);

// ================================================================ 🍚 food gauge
export const foodOf = pid => { const ps = ps_(pid); return ps ? Math.max(0, Math.min(L.FOOD_MAX, ps.food ?? L.FOOD_START)) : L.FOOD_START; };
export function addFood(pid, n) {
    const ps = ps_(pid);
    if (!ps) return 0;
    const before = foodOf(pid);
    ps.food = Math.max(0, Math.min(L.FOOD_MAX, before + n));
    return ps.food - before;
}
// one second of play (the turn clock ran): −10 food every 3 minutes → { drained, food }
export function foodTick(t) {
    const life = (t.life ||= { sec: 0 });
    life.sec = (life.sec || 0) + 1;
    if (life.sec % L.FOOD_DRAIN_SEC) return null;
    const got = addFood(t.pid, -L.FOOD_DRAIN);
    if (got) log(`🍚 ${name(t.pid)} 식량 게이지 −${-got} (플레이 ${Math.round(life.sec / 60)}분) → ${foodOf(t.pid)}`);
    Store.saveSeason();
    return { drained: -got, food: foodOf(t.pid) };
}
export const nextDrainIn = t => L.FOOD_DRAIN_SEC - ((t?.life?.sec || 0) % L.FOOD_DRAIN_SEC);
// end of a turn: an empty food gauge costs HP −10 · HP 0 → starved to death → { hp } | { dead } | null
export function starveCheck(pid) {
    const ps = ps_(pid);
    if (!ps || ps.out && !S()?.revival) return null;
    if (foodOf(pid) > 0) return null;
    if (ps.hp <= L.STARVE_HP) {
        if (killPlayer(pid, "🍽️ 굶주림으로 바로 사망", { quiet: true, hl: "starve" }) === false) return { hp: ps.hp, shield: true };
        return { dead: true };
    }
    ps.hp -= L.STARVE_HP;
    log(`🍽️ ${name(pid)} 식량 게이지 0 — 굶주림으로 HP −${L.STARVE_HP} (남은 HP ${Math.round(ps.hp)})`);
    Store.saveSeason(true);
    return { hp: ps.hp };
}
// eat one food → { ok, got, why }
export function eat(pid, foodId, how = "") {
    const f = L.FOOD_BY_ID[foodId], p = Store.player(pid);
    if (!f) return { ok: false, why: "없는 음식입니다" };
    if (!L.canEatRace(f, p?.ethnicity)) return { ok: false, why: `${f.name}은(는) ${f.races.join(" · ")} 종족만 먹을 수 있습니다` };
    const got = addFood(pid, f.food);
    log(`${f.emoji} ${name(pid)} ${f.name} 먹음${how ? ` (${how})` : ""} → 식량 ${got >= 0 ? "+" : ""}${got} (${foodOf(pid)})`);
    Store.saveSeason(true);
    return { ok: true, got, food: foodOf(pid) };
}
// 🎒 a food in the bag (Self-Business markets · gifts)
export function eatFromBag(pid, itemId) {
    const ps = ps_(pid), f = L.foodOfItem(itemId);
    if (!f || !(ps?.items[itemId] > 0)) return { ok: false, why: "가방에 없습니다" };
    const r = eat(pid, f.id, "가방");
    if (r.ok) { ps.items[itemId]--; Store.saveSeason(true); }
    return r;
}

// ================================================================ 🏪 food corners
// a map's corner config → the template merged with the admin's settings
export function cornerCfg(c) {
    const T = L.FOOD_CORNERS[c?.k];
    if (!T) return null;
    const items = (c.items || T.items.map(id => ({ id }))).filter(x => L.FOOD_BY_ID[x.id]);
    return { ...T, ...c, k: c.k, name: c.name || T.name, entry: c.entry || T.entry, fee: c.fee ?? T.fee, items };
}
export const foodCornersAt = loc => (loc?.food || []).map(cornerCfg).filter(Boolean);
export const innerCorner = (k, extra = {}) => cornerCfg({ k, ...extra });
export const foodPrice = (corner, it) => corner.free ? 0 : Math.max(0, Math.round(it.price ?? L.FOOD_BY_ID[it.id]?.price ?? 0));
const useOf = pid => { const ps = ps_(pid), r = round(); if (ps.foodUse?.round !== r) ps.foodUse = { round: r, n: 0, pantry: 0, door: {}, stock: {} }; return ps.foodUse; };
export const foodUsesLeft = pid => Math.max(0, L.FOOD_USES_PER_ROUND - (useOf(pid).n || 0));
export const pantryLeft = pid => Math.max(0, 1 - (useOf(pid).pantry || 0));
export const doorOf = (pid, key) => useOf(pid).door[key] || null;
// the door: free · paid (fee) · random (60%) — decided once per corner per round
export function foodDoor(pid, key, corner) {
    const u = useOf(pid), ps = ps_(pid);
    if (u.door[key]) return u.door[key];
    if (corner.entry === "paid" && corner.fee > 0) {
        if (wallet(ps) < corner.fee) return { in: false, why: `입장료 ${corner.fee.toLocaleString()}G가 부족합니다`, short: true };
        pay(ps, corner.fee);
        log(`${corner.emoji} ${name(pid)} ${corner.name} 입장료 ${corner.fee.toLocaleString()}G`);
    }
    const ok = corner.entry === "random" ? rnd() < L.RANDOM_ENTRY : true;
    u.door[key] = { in: ok, paid: corner.entry === "paid" ? corner.fee : 0, rolled: corner.entry === "random" };
    log(`${corner.emoji} ${name(pid)} ${corner.name} ${ok ? "입장" : "입장 거절"}`);
    Store.saveSeason(true);
    return u.door[key];
}
// all goods on sale are drawn at random: every round each corner shows its own random pick of its list
export function stockOf(pid, key, corner) {
    const u = useOf(pid);
    const ids = corner.items.map(x => x.id);
    const cur = u.stock[key];
    if (cur && cur.every(id => ids.includes(id))) return corner.items.filter(x => cur.includes(x.id));
    const n = ids.length <= 3 ? ids.length : Math.max(3, Math.ceil(ids.length * (0.5 + rnd() * 0.3)));
    const pick = [...ids].sort(() => rnd() - 0.5).slice(0, n);
    u.stock[key] = pick;
    Store.saveSeason();
    return corner.items.filter(x => pick.includes(x.id));
}
// buy + eat on the spot → { ok, got, why }
export function buyFood(pid, key, corner, it, { discount = 0 } = {}) {
    const ps = ps_(pid), f = L.FOOD_BY_ID[it.id], u = useOf(pid);
    if (!f) return { ok: false, why: "없는 음식입니다" };
    if (corner.pantry ? pantryLeft(pid) <= 0 : foodUsesLeft(pid) <= 0) return { ok: false, why: corner.pantry ? "HYHG Pantry는 라운드당 1번만 이용할 수 있습니다" : `푸드 코너는 라운드당 ${L.FOOD_USES_PER_ROUND}번만 이용할 수 있습니다` };
    if (!doorOf(pid, key)?.in) return { ok: false, why: "먼저 입장하세요" };
    if (!L.canEatRace(f, Store.player(pid)?.ethnicity)) return { ok: false, why: `${f.name}은(는) ${f.races.join(" · ")} 종족만 먹을 수 있습니다` };
    const price = Math.round(foodPrice(corner, it) * (1 - discount));
    if (wallet(ps) < price) return { ok: false, why: "골드가 부족합니다" };
    if (price) pay(ps, price);
    if (corner.pantry) u.pantry = (u.pantry || 0) + 1; else u.n = (u.n || 0) + 1;
    const r = eat(pid, f.id, `${corner.name}${price ? ` ${price.toLocaleString()}G` : " 무료"}`);
    return { ...r, price };
}

// ================================================================ 🌦️ weather
export function weatherAt(locId) {
    const loc = LOC_BY_ID[locId];
    if (!loc || loc.kidnap) return L.WEATHERS.sun;
    let w = loc.weather;
    if (w == null || w === "") w = L.WEATHER_DEFAULT_BY_REGION[loc.region] || "sun";
    if (w === "random") {
        const s = S();
        if (!s) return L.WEATHERS.sun;
        const wx = (s.wx ||= {});
        if (wx[locId]?.round !== s.round) {
            const ids = Object.keys(L.WEATHERS);
            wx[locId] = { round: s.round, w: ids[Math.floor(rnd() * ids.length)] };
            Store.saveSeason();
        }
        w = wx[locId].w;
    }
    return L.WEATHERS[w] || L.WEATHERS.sun;
}
// seconds until the weather hits again on this map (null = no harm)
export function weatherNextIn(t) {
    const w = weatherAt(t?.loc);
    if (!w.hp || !t) return null;
    const sec = t.life?.map === t.loc ? t.life.mapSec || 0 : 0;
    if (sec < L.WEATHER_FIRST) return L.WEATHER_FIRST - sec;
    const k = (sec - L.WEATHER_FIRST) % L.WEATHER_EVERY;
    return k === 0 ? L.WEATHER_EVERY : L.WEATHER_EVERY - k;
}
// one second on the map → null | { w, sheltered } | { w, dmg, hp } | { w, dead }
export function weatherTick(t) {
    const life = (t.life ||= { sec: 0 });
    if (life.map !== t.loc) { life.map = t.loc; life.mapSec = 0; }
    life.mapSec = (life.mapSec || 0) + 1;
    const w = weatherAt(t.loc);
    if (!w.hp) return null;
    const s = life.mapSec;
    if (s < L.WEATHER_FIRST || (s - L.WEATHER_FIRST) % L.WEATHER_EVERY) return null;
    if (sheltered(t.pid, t.loc)) { log(`${w.emoji} ${name(t.pid)} ${w.name} — 🏨 숙소 덕분에 무사`); return { w, sheltered: true }; }
    life.wxHits = (life.wxHits || 0) + 1;
    const r = hpToll(t.pid, w.hp, `${w.emoji} ${w.name}`);
    return { w, dmg: w.hp, ...r };
}

// ================================================================ 🏨 lodging
const lodgeKey = c => c.k;
export function lodgeCfg(c) {
    const T = c?.k === "owner_room" ? L.OWNER_ROOM : L.LODGES[c?.k];
    if (!T) return null;
    return { ...T, ...c, k: c.k, name: c.name || T.name, entry: c.entry || T.entry, fee: c.fee ?? T.fee };
}
// the map's lodging (+ 🔑 the owner's room on a map where this player runs a Self-Business)
export function lodgesAt(loc, pid = null) {
    const list = (loc?.lodge || []).map(lodgeCfg).filter(Boolean);
    if (pid != null && loc && activeBiz().some(b => b.loc === loc.id && b.owner === +pid)) list.push(lodgeCfg({ k: "owner_room" }));
    return list;
}
const occ = (locId, k) => { const s = S(); return ((s.lodge ||= {})[locId] ||= {})[k] ||= {}; };
export const roomKey = (rt, i) => `${rt.k}-${i + 1}`;
export function roomsOf(locId, lodge) {
    const o = occ(locId, lodgeKey(lodge)), r = round();
    return lodge.rooms.map(rt => ({ rt, rooms: Array.from({ length: rt.n }, (_, i) => { const key = roomKey(rt, i), x = o[key]; return { key, i, who: x && x.until >= r ? x : null }; }) }));
}
// this player's stay on this map (any lodging there) → { k, key, until, from } | null
export function stayOf(pid, locId) {
    const s = S(), r = round();
    const byK = s?.lodge?.[locId] || {};
    for (const [k, rooms] of Object.entries(byK)) for (const [key, x] of Object.entries(rooms)) if (x && +x.pid === +pid && x.until >= r) return { k, key, ...x };
    return null;
}
export const sheltered = (pid, locId) => !!(locId && stayOf(pid, locId));
export const staysOf = pid => { const s = S(), out = []; for (const [locId, byK] of Object.entries(s?.lodge || {})) for (const [k, rooms] of Object.entries(byK)) for (const [key, x] of Object.entries(rooms)) if (+x?.pid === +pid && x.until >= round()) out.push({ locId, k, key, ...x }); return out; };
// can this player use this lodging at all (EmoMonster attribute rules)
export function lodgeNeed(pid, lodge) {
    if (lodge.owner) return activeBiz().some(b => b.owner === +pid) ? { ok: true } : { ok: false, why: "비즈니스 오너 전용" };
    if (lodge.needTypes && !ownsTypes(pid, lodge.needTypes)) return { ok: false, why: `${lodge.needTypes.join(" / ")} 속성 이모몬스터가 필요합니다` };
    return { ok: true };
}
export const freeStay = (pid, lodge) => !!(lodge.freeTypes && ownsTypes(pid, lodge.freeTypes));
const doorKey = (locId, lodge) => `${locId}:${lodgeKey(lodge)}`;
export const lodgeDoorOf = (t, locId, lodge) => t?.lodgeDoor?.[doorKey(locId, lodge)] || null;
// the door (once per visit = per turn): random 60% · free · paid — light / electric / earth owners walk into the cave for free
export function lodgeDoor(pid, t, locId, lodge) {
    const key = doorKey(locId, lodge), ps = ps_(pid);
    const d = (t.lodgeDoor ||= {});
    if (d[key]) return d[key];
    const need = lodgeNeed(pid, lodge);
    if (!need.ok) return { in: false, why: need.why };
    let fee = lodge.entry === "paid" ? lodge.fee || 0 : 0;
    if (freeStay(pid, lodge)) fee = 0;
    if (fee && wallet(ps) < fee) return { in: false, why: `입장료 ${fee.toLocaleString()}G가 부족합니다`, short: true };
    if (fee) pay(ps, fee);
    const ok = lodge.entry === "random" ? rnd() < L.RANDOM_ENTRY : true;
    d[key] = { in: ok, fee, rolled: lodge.entry === "random" };
    log(`${lodge.emoji} ${name(pid)} ${lodge.name} ${ok ? "입장" : "입장 거절"}${fee ? ` (입장료 ${fee.toLocaleString()}G)` : ""}`);
    Store.saveSeason(true);
    return d[key];
}
// price of one round in a room (🏙️ HYHG employees: −20% at the hotel · 🌍 free-type owners: free)
export function roomPrice(pid, lodge, rt, discount = 0) {
    if (freeStay(pid, lodge) || lodge.owner) return 0;
    return Math.round(rt.price * (1 - discount));
}
// 🎲 a random room: one draw per visit — the room is tried first, the price is paid only when it is free
export function drawRoom(pid, t, locId, lodge, rt) {
    const key = `${doorKey(locId, lodge)}:${rt.k}`, dr = (t.lodgeDraw ||= {});
    if (dr[key]) return dr[key];
    const i = Math.floor(rnd() * rt.n), rk = roomKey(rt, i);
    const x = occ(locId, lodgeKey(lodge))[rk];
    const taken = x && x.until >= round() ? x : null;
    dr[key] = { room: rk, i, taken: taken ? +taken.pid : null, at: Date.now() };
    log(`${lodge.emoji} ${name(pid)} ${lodge.name} ${rt.label} 랜덤 뽑기 → ${i + 1}번 ${taken ? `(이미 ${name(taken.pid)} 사용 중)` : "(빈 방)"}`);
    Store.saveSeason(true);
    return dr[key];
}
export const drawOf = (t, locId, lodge, rt) => t?.lodgeDraw?.[`${doorKey(locId, lodge)}:${rt.k}`] || null;
// check in → { ok, why, cost, until }
export function checkIn(pid, t, locId, lodge, rt, rk, rounds = 1, discount = 0) {
    const ps = ps_(pid), r = round();
    if (stayOf(pid, locId)) return { ok: false, why: "이 맵에는 이미 머무는 숙소가 있습니다" };
    if (!lodgeDoorOf(t, locId, lodge)?.in) return { ok: false, why: "먼저 입장하세요" };
    const o = occ(locId, lodgeKey(lodge)), x = o[rk];
    if (x && x.until >= r) return { ok: false, why: "이미 다른 플레이어가 있는 자리입니다" };
    if (rt.pick === "random") { const d = drawOf(t, locId, lodge, rt); if (d?.room !== rk || d.taken != null) return { ok: false, why: "랜덤으로 뽑힌 빈 방만 잡을 수 있습니다" }; }
    const n = lodge.owner ? 1 : lodge.reserve ? Math.max(1, Math.min(L.MAX_RESERVE, Math.round(rounds) || 1)) : 1;
    const cost = roomPrice(pid, lodge, rt, discount) * n;
    if (wallet(ps) < cost) return { ok: false, why: `숙박비 ${cost.toLocaleString()}G가 부족합니다` };
    if (cost) pay(ps, cost);
    const until = lodge.owner ? 9999 : r + n - 1;
    o[rk] = { pid: +pid, from: r, until, paid: cost, lodge: lodge.name };
    log(`${lodge.emoji} ${name(pid)} ${LOC_BY_ID[locId]?.name || locId} ${lodge.name} ${rt.label} ${rk.split("-")[1]}번 체크인 — ${lodge.owner ? "시즌 끝까지 무료" : `${n}라운드 (R${r}~R${until})${cost ? ` · ${cost.toLocaleString()}G` : " · 무료"}`}`);
    Store.saveSeason(true);
    return { ok: true, cost, until, rounds: n };
}
// new round: stays that are over → forced check-out
function evictTick(s) {
    const r = s.round, out = [];
    for (const [locId, byK] of Object.entries(s.lodge || {})) for (const [k, rooms] of Object.entries(byK)) for (const [key, x] of Object.entries(rooms)) {
        if (!x || x.until >= r) continue;
        out.push({ pid: x.pid, locId, k });
        delete rooms[key];
        log(`🧳 ${name(x.pid)} ${LOC_BY_ID[locId]?.name || locId} ${x.lodge || "숙소"} 예약 기간 종료 — 강제 퇴실`, [x.pid]);
    }
    s.lodgeOut = out;
}
roundHooks.push(s => { try { evictTick(s); } catch (e) { console.error(e); } });

// ---- a fresh season starts every player with a food gauge of 30 (season.js addToRoster sets it too)
export function ensureFood(s = S()) { for (const pid of s?.roster || []) { const ps = s.ps[pid]; if (ps && ps.food == null) ps.food = L.FOOD_START; } }
