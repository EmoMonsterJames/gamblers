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
import { LOC_BY_ID, ITEMS, ITEM_BY_ID } from "../data/catalog.js";
import * as L from "../data/life.js";
import { S, log, name, roundHooks, killPlayer, hpToll, bump, noteRefuse } from "./season.js";
import { ownsTypes } from "./extra.js";
import { activeBiz } from "./bank.js";

const rnd = () => Math.random();
const ps_ = pid => S()?.ps?.[pid];
const round = () => S()?.round || 0;
const pay = (ps, g) => { const fromLoan = Math.min(ps.loanGold || 0, g); ps.loanGold = (ps.loanGold || 0) - fromLoan; ps.money -= g - fromLoan; };
const wallet = ps => (ps?.money || 0) + (ps?.loanGold || 0);

// ================================================================ 🍚 food gauge
export const foodOf = pid => { const ps = ps_(pid); return ps ? Math.max(0, Math.min(L.FOOD_MAX, ps.food ?? L.FOOD_START)) : L.FOOD_START; };
// 🍽️ ps.starve = { left } while starving: the gauge hit 0 and has not been brought back to 11+ yet.
// left = play seconds until the next HP −10 (only the player's own turn clock runs it).
export function addFood(pid, n) {
    const ps = ps_(pid);
    if (!ps) return 0;
    const before = foodOf(pid);
    ps.food = Math.max(0, Math.min(L.FOOD_MAX, before + n));
    if (ps.food <= 0 && !ps.starve) ps.starve = { left: L.starveDelay(0) };          // the gauge just ran out
    else if (ps.starve && ps.food >= L.STARVE_EXIT) { delete ps.starve; ps.foodReset = true; } // back to 11+: −10 food in 2:00 again
    else if (ps.starve && n > 0) ps.starve.left = L.starveDelay(ps.food);              // 1~10: that bit is used up first, then HP −10
    return ps.food - before;
}
export const starving = pid => !!ps_(pid)?.starve;
// one second of play (the turn clock ran):
//   normal  → −10 food every 2:00 → { drained, food }
//   starving → HP −10 when the clock runs out (the gauge left is used up) → { starveHit, hp } | { dead } | { shield }
export function foodTick(t) {
    const life = (t.life ||= { sec: 0 }), ps = ps_(t.pid);
    life.sec = (life.sec || 0) + 1;
    if (!ps) return null;
    if (ps.foodReset) { life.drainLeft = L.FOOD_DRAIN_SEC; delete ps.foodReset; }
    if (!ps.starve && foodOf(t.pid) <= 0) ps.starve = { left: L.starveDelay(0) }; // (a gauge saved at 0 before this rule)
    if (ps.starve) {
        ps.starve.left = (ps.starve.left ?? L.starveDelay(foodOf(t.pid))) - 1;
        if (ps.starve.left > 0) return null;
        ps.food = 0;
        ps.starve.left = L.starveDelay(0);
        life.drainLeft = L.FOOD_DRAIN_SEC;
        if (ps.out && !S()?.revival) return null;
        if (ps.hp <= L.STARVE_HP) {
            if (killPlayer(t.pid, "🍽️ 굶주림으로 바로 사망", { quiet: true, hl: "starve" }) === false) { Store.saveSeason(true); return { shield: true, hp: ps.hp }; }
            return { dead: true };
        }
        ps.hp -= L.STARVE_HP;
        log(`🍽️ ${name(t.pid)} 식량 게이지 0 — 굶주림으로 HP −${L.STARVE_HP} (남은 HP ${Math.round(ps.hp)})`);
        Store.saveSeason(true);
        return { starveHit: L.STARVE_HP, hp: ps.hp };
    }
    life.drainLeft = (life.drainLeft ?? L.FOOD_DRAIN_SEC) - 1;
    if (life.drainLeft > 0) return null;
    life.drainLeft = L.FOOD_DRAIN_SEC;
    const got = addFood(t.pid, -L.FOOD_DRAIN);
    if (got) log(`🍚 ${name(t.pid)} 식량 게이지 −${-got} (플레이 ${Math.round(life.sec / 60)}분) → ${foodOf(t.pid)}`);
    Store.saveSeason();
    return { drained: -got, food: foodOf(t.pid), starving: !!ps.starve };
}
// seconds until the next −10 (food, or HP while starving)
export const nextDrainIn = t => { const ps = ps_(t?.pid); return ps?.starve ? Math.max(0, ps.starve.left ?? 0) : (t?.life?.drainLeft ?? L.FOOD_DRAIN_SEC); };
// (the end-of-turn starvation check is gone: starving now costs HP on the clock while playing — see foodTick)
export function starveCheck() { return null; }
// eat one food → { ok, got, why }
export function eat(pid, foodId, how = "") {
    const f = L.FOOD_BY_ID[foodId], p = Store.player(pid);
    if (!f) return { ok: false, why: "없는 음식입니다" };
    if (!L.canEatRace(f, p?.ethnicity)) return { ok: false, why: `${f.name}은(는) ${f.races.join(" · ")} 종족만 먹을 수 있습니다` };
    const got = addFood(pid, f.food);
    // ❤️ HP +1~30 by the food's price (찌 · 똥 · 똥주 excluded) — never above the start HP
    const ps = ps_(pid);
    let hpGot = 0;
    if (ps && L.foodHp(f) > 0 && ps.hp > 0) { const before = ps.hp; ps.hp = Math.min(CONFIG.START_HP, ps.hp + L.foodHp(f)); hpGot = ps.hp - before; }
    bump(pid, "eats"); // 🍚 food missions count every food eaten
    log(`${f.emoji} ${name(pid)} ${f.name} 먹음${how ? ` (${how})` : ""} → 식량 ${got >= 0 ? "+" : ""}${got} (${foodOf(pid)})${hpGot ? ` · HP +${Math.round(hpGot)}` : ""}`);
    Store.saveSeason(true);
    return { ok: true, got, hp: hpGot, food: foodOf(pid) };
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
    // 🎡 every food corner on a map is entered through the roulette (inner corners keep their own door)
    const entry = T.inner ? c.entry || T.entry : "roulette";
    return { ...T, ...c, k: c.k, name: c.name || T.name, entry, fee: c.fee ?? T.fee, items, races: L.FOOD_CORNER_RACES[c.k] || null, home: L.FOOD_HOME_COUNTRY[c.k] || null };
}
// 🎡 the entry roulette this player gets at that corner (its home country: kinder odds)
export const isHomeCorner = (pid, corner) => !!(corner?.home && L.sameCountry(Store.player(pid)?.country, corner.home));
export const entryWheel = (pid, corner) => isHomeCorner(pid, corner) ? L.FOOD_HOME_WHEEL : L.FOOD_ENTRY_WHEEL;
// 🧬 ☀️ 햇살 상점: Smile only — every other corner is open to anyone
export const cornerOpenTo = (pid, corner) => L.cornerRaceOk(corner?.k, Store.player(pid)?.ethnicity);
// spin the roulette (once per corner per round) → the door: { in, seg, i } | { pay: fee, seg, i } (waiting for the fee)
export function foodSpin(pid, key, corner) {
    const u = useOf(pid);
    if (u.door[key]) return u.door[key];
    if (!cornerOpenTo(pid, corner)) return { in: false, why: `${corner.name}은(는) ${corner.races.join(" · ")} 종족만 이용할 수 있습니다`, short: true };
    const wheel = entryWheel(pid, corner);
    let x = rnd() * wheel.reduce((a, s) => a + s.w, 0), i = 0;
    for (; i < wheel.length - 1; i++) if ((x -= wheel[i].w) < 0) break;
    const seg = wheel[i];
    const d = seg.kind === "free" ? { in: true, seg, i } : seg.kind === "paid" ? { pay: seg.fee, seg, i } : { in: false, seg, i };
    u.door[key] = { ...d, rolled: true, home: isHomeCorner(pid, corner) };
    if (seg.kind === "no") noteRefuse(pid);
    log(`🎡 ${corner.emoji} ${name(pid)} ${corner.name} 입장 룰렛 → ${seg.kind === "free" ? "무료 입장" : seg.kind === "paid" ? `유료 입장 ${seg.fee.toLocaleString()}G` : "입장 거절"}${u.door[key].home ? " (출신 국가 룰렛)" : ""}`);
    Store.saveSeason(true);
    return u.door[key];
}
// the roulette asked for a fee: pay it and go in (or give up → refused for this round)
export function foodPayEntry(pid, key, corner) {
    const u = useOf(pid), ps = ps_(pid), d = u.door[key];
    if (!d?.pay) return d || { in: false };
    if (wallet(ps) < d.pay) return { ...d, why: `입장료 ${d.pay.toLocaleString()}G가 부족합니다`, short: true };
    pay(ps, d.pay);
    u.door[key] = { ...d, in: true, paid: d.pay, pay: 0 };
    log(`${corner.emoji} ${name(pid)} ${corner.name} 입장료 ${d.pay.toLocaleString()}G 내고 입장`);
    Store.saveSeason(true);
    return u.door[key];
}
export function foodGiveUp(pid, key, corner) {
    const u = useOf(pid), d = u.door[key];
    if (!d?.pay) return d;
    u.door[key] = { ...d, in: false, pay: 0, gaveUp: true };
    log(`${corner.emoji} ${name(pid)} ${corner.name} 입장료를 내지 않고 돌아감`);
    Store.saveSeason(true);
    return u.door[key];
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
    if (!ok) noteRefuse(pid);
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
    // big corners sell a random part of their menu each round (3 or fewer: the whole menu)
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
    if (!cornerOpenTo(pid, corner)) return { ok: false, why: `${corner.name}은(는) ${corner.races.join(" · ")} 종족만 이용할 수 있습니다` };
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
    // 🎲 every map is random now (WEATHER_ODDS: 해 10 · 비 10 · 폭우 20 · 눈 10 · 폭설 20 · 우박 20 · 폭염 10 %), drawn once per round
    const s = S();
    if (!s) return L.WEATHERS.sun;
    const wx = (s.wx ||= {});
    if (wx[locId]?.round !== s.round || !L.WEATHERS[wx[locId]?.w]) {
        wx[locId] = { round: s.round, w: drawWeather() };
        Store.saveSeason();
    }
    return L.WEATHERS[wx[locId].w] || L.WEATHERS.sun;
}
export function drawWeather() {
    const odds = Object.entries(L.WEATHER_ODDS).filter(([id]) => L.WEATHERS[id]);
    let x = rnd() * odds.reduce((a, [, p]) => a + p, 0);
    for (const [id, p] of odds) { if ((x -= p) < 0) return id; }
    return odds[odds.length - 1]?.[0] || "sun";
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
// ☔ weather gear: a permanent item (우산 · 우비 · 양산) just has to be owned · a 1회용 one is used up the first time
// its weather hits and then keeps it off until the round ends (ps.wxOnce = { round, wx: [weather ids] })
const GEAR = () => ITEMS.filter(i => i.wx);
export function weatherGuard(pid, w) {
    const ps = ps_(pid);
    if (!ps || !w?.hp) return null;
    const perm = GEAR().find(i => !i.once && i.wx.includes(w.id) && ps.items?.[i.id] > 0);
    if (perm) return { item: perm };
    if (ps.wxOnce?.round === round() && ps.wxOnce.wx.includes(w.id)) return { item: ITEM_BY_ID[ps.wxOnce.id], active: true };
    // the cheapest 1회용 that covers it (1회용우산 before 1회용우비)
    const once = GEAR().filter(i => i.once && i.wx.includes(w.id) && ps.items?.[i.id] > 0).sort((a, b) => a.wx.length - b.wx.length)[0];
    if (!once) return null;
    ps.items[once.id]--;
    // a second 1회용 in the same round adds its weathers to the one already open
    const keep = ps.wxOnce?.round === round() ? ps.wxOnce.wx : [];
    ps.wxOnce = { round: round(), id: once.id, wx: [...new Set([...keep, ...once.wx])] };
    log(`${once.emoji} ${name(pid)} ${once.name} 사용 — 이번 라운드 끝까지 ${once.wx.map(k => L.WEATHERS[k]?.name).join(" · ")}을(를) 피합니다`);
    return { item: once, used: true };
}
// ☀️ Smile 종족: on a sunny map, 4:00 of play there without a lodging room → 식량 +5 (only once per turn — never +10 for 8:00)
export const SMILE_SUN_SEC = 240, SMILE_SUN_FOOD = 5;
const isSmile = pid => String(Store.player(pid)?.ethnicity || "").trim().toLowerCase() === "smile";
// one second on the map → null | { w, sheltered } | { w, guard } | { w, dmg, hp } | { w, dead } | { w, sunFood }
export function weatherTick(t) {
    const life = (t.life ||= { sec: 0 });
    if (life.map !== t.loc) { life.map = t.loc; life.mapSec = 0; }
    life.mapSec = (life.mapSec || 0) + 1;
    const w = weatherAt(t.loc);
    const s = life.mapSec;
    if (w.id === "sun") {
        if (life.sunFed || s < SMILE_SUN_SEC || !isSmile(t.pid) || sheltered(t.pid, t.loc)) return null;
        life.sunFed = true; // only once per turn: 8 minutes there is still just +5
        const got = addFood(t.pid, SMILE_SUN_FOOD);
        if (!got) return null;
        log(`☀️ ${name(t.pid)} 햇살을 듬뿍 받아 식량 게이지 +${got} (Smile 종족 · 해 맵 4분) → ${foodOf(t.pid)}`);
        Store.saveSeason();
        return { w, sunFood: got, food: foodOf(t.pid) };
    }
    if (!w.hp) return null;
    if (s < L.WEATHER_FIRST || (s - L.WEATHER_FIRST) % L.WEATHER_EVERY) return null;
    if (sheltered(t.pid, t.loc)) { log(`${w.emoji} ${name(t.pid)} ${w.name} — 🏨 숙소 덕분에 무사`); return { w, sheltered: true }; }
    const guard = weatherGuard(t.pid, w);
    if (guard) {
        if (!guard.used) log(`${w.emoji} ${name(t.pid)} ${w.name} — ${guard.item?.emoji || "☂️"} ${guard.item?.name || "우산"} 덕분에 무사`);
        Store.saveSeason(true);
        return { w, guard };
    }
    life.wxHits = (life.wxHits || 0) + 1;
    bump(t.pid, "wxDmg", w.hp); // 🌦️ weather missions
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
// 🌍 a booking counts on EVERY map that has that kind of lodging: a room booked at Rainbow Casino's 🏨 호텔 for 2 rounds
// shelters the player on every map with a 호텔 this round and the next (the room itself stays where it was booked).
// this player's stay that covers this map → { k, key, until, from, locId (where it was booked) } | null
export function stayOf(pid, locId) {
    const loc = LOC_BY_ID[locId];
    if (!loc) return null;
    const kinds = new Set(lodgesAt(loc, pid).map(lodgeKey));
    if (!kinds.size) return null;
    return staysOf(pid).find(x => kinds.has(x.k)) || null;
}
// this player's stay in that kind of lodging (any map) → stay | null
export const stayOfKind = (pid, k) => staysOf(pid).find(x => x.k === k) || null;
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
    if (ok) bump(pid, "lodgeIn"); else noteRefuse(pid); // 🏨 lodging missions · 🚪 refusals
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
    // 🙈 whether the room is free is only told after the player pays (enterRoom)
    log(`${lodge.emoji} ${name(pid)} ${lodge.name} ${rt.label} 랜덤 뽑기 → ${i + 1}번`);
    Store.saveSeason(true);
    return dr[key];
}
export const drawOf = (t, locId, lodge, rt) => t?.lodgeDraw?.[`${doorKey(locId, lodge)}:${rt.k}`] || null;
// check in → { ok, why, cost, until }
export function checkIn(pid, t, locId, lodge, rt, rk, rounds = 1, discount = 0) {
    const ps = ps_(pid), r = round();
    if (stayOf(pid, locId)) return { ok: false, why: "이 맵에는 이미 머무는 숙소가 있습니다" };
    if (stayOfKind(pid, lodgeKey(lodge))) return { ok: false, why: `이미 ${lodge.name}을(를) 예약했습니다 (${lodge.name}이(가) 있는 모든 맵에 적용)` };
    if (!lodgeDoorOf(t, locId, lodge)?.in) return { ok: false, why: "먼저 입장하세요" };
    const o = occ(locId, lodgeKey(lodge)), x = o[rk];
    if (x && x.until >= r) return { ok: false, why: "이미 다른 플레이어가 있는 자리입니다" };
    if (rt.pick === "random") { const d = drawOf(t, locId, lodge, rt); if (d?.room !== rk) return { ok: false, why: "랜덤으로 뽑힌 방만 잡을 수 있습니다" }; }
    const n = lodge.owner ? 1 : lodge.reserve ? Math.max(1, Math.min(L.MAX_RESERVE, Math.round(rounds) || 1)) : 1;
    const cost = roomPrice(pid, lodge, rt, discount) * n;
    if (wallet(ps) < cost) return { ok: false, why: `숙박비 ${cost.toLocaleString()}G가 부족합니다` };
    if (cost) pay(ps, cost);
    const until = lodge.owner ? 9999 : r + n - 1;
    o[rk] = { pid: +pid, from: r, until, paid: cost, lodge: lodge.name };
    if (t) { const d = drawOf(t, locId, lodge, rt); if (d?.room === rk) d.result = "in"; }
    log(`${lodge.emoji} ${name(pid)} ${LOC_BY_ID[locId]?.name || locId} ${lodge.name} ${rt.label} ${rk.split("-")[1]}번 체크인 — ${lodge.owner ? "시즌 끝까지 무료" : `${n}라운드 (R${r}~R${until})${cost ? ` · ${cost.toLocaleString()}G` : " · 무료"}`}`);
    Store.saveSeason(true);
    return { ok: true, cost, until, rounds: n };
}
// 💳 "I picked this room — here is the money": the door (random entry) and whether the room is free are only revealed now.
// Nothing is charged when it does not work out. → { ok, … } | { refused } | { taken: pid, canSwap } | { ok:false, why }
export function enterRoom(pid, t, locId, lodge, rt, rk, rounds = 1, discount = 0) {
    const ps = ps_(pid), n = lodge.owner ? 1 : lodge.reserve ? Math.max(1, Math.min(L.MAX_RESERVE, Math.round(rounds) || 1)) : 1;
    const cost = roomPrice(pid, lodge, rt, discount) * n;
    if (wallet(ps) < cost) return { ok: false, why: `숙박비 ${cost.toLocaleString()}G가 부족합니다` };
    const d = rt.pick === "random" ? drawOf(t, locId, lodge, rt) : null;
    let door = lodgeDoorOf(t, locId, lodge);
    if (!door) { door = lodgeDoor(pid, t, locId, lodge); if (door.short || (door.why && !door.in)) return { ok: false, why: door.why }; }
    if (!door.in) { if (d) d.result = "refused"; Store.saveSeason(true); return { ok: false, refused: true }; }
    const x = occ(locId, lodgeKey(lodge))[rk];
    if (x && x.until >= round() && +x.pid !== +pid) {
        if (d) d.result = "taken";
        log(`${lodge.emoji} ${name(pid)} ${lodge.name} ${rk.split("-")[1]}번 — 이미 ${name(x.pid)} 사용 중`);
        Store.saveSeason(true);
        return { ok: false, taken: +x.pid, canSwap: (ps.items?.guest_swap || 0) > 0 };
    }
    return checkIn(pid, t, locId, lodge, rt, rk, n, discount);
}
// 🔑 투숙객교체권: take over a room that came up taken (the guest there is moved out, nothing refunded to them)
export function swapRoom(pid, t, locId, lodge, rt, rk, rounds = 1, discount = 0) {
    const ps = ps_(pid);
    if (!(ps.items?.guest_swap > 0)) return { ok: false, why: "🔑 투숙객교체권이 없습니다" };
    const o = occ(locId, lodgeKey(lodge)), x = o[rk];
    const n = lodge.owner ? 1 : lodge.reserve ? Math.max(1, Math.min(L.MAX_RESERVE, Math.round(rounds) || 1)) : 1;
    const cost = roomPrice(pid, lodge, rt, discount) * n;
    if (wallet(ps) < cost) return { ok: false, why: `숙박비 ${cost.toLocaleString()}G가 부족합니다` };
    const old = x && x.until >= round() ? +x.pid : null;
    if (old != null) { delete o[rk]; log(`🔑 ${name(pid)} 투숙객교체권 사용 — ${LOC_BY_ID[locId]?.name || locId} ${lodge.name} ${rk.split("-")[1]}번에서 ${name(old)} 퇴실`, [old]); }
    ps.items.guest_swap--;
    const r = checkIn(pid, t, locId, lodge, rt, rk, n, discount);
    if (!r.ok) { ps.items.guest_swap++; if (old != null) o[rk] = x; return r; }
    const d = rt.pick === "random" ? drawOf(t, locId, lodge, rt) : null;
    if (d) d.result = "swapped";
    Store.saveSeason(true);
    return { ...r, swapped: old };
}
// 🧳 check out now (any round) — the room is free at once, nothing is refunded
export function checkOut(pid, k) {
    const st = stayOfKind(pid, k);
    if (!st) return { ok: false, why: "예약된 객실이 없습니다" };
    const rooms = S().lodge?.[st.locId]?.[st.k];
    if (rooms?.[st.key]) delete rooms[st.key];
    log(`🧳 ${name(pid)} ${LOC_BY_ID[st.locId]?.name || st.locId} ${st.lodge || "숙소"} ${st.key.split("-")[1]}번 체크아웃`);
    Store.saveSeason(true);
    return { ok: true, stay: st };
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
