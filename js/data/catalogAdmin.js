// =====================================================================
// Admin-editable catalog. The built-in lists in catalog.js are the
// defaults; Store.catalog holds the admin's changes:
//   edits:  { "<cat>:<id>": { name, emoji, atk, acc, boost, kind, desc,   ← stats
//                             shop, price, locs: [locId] | null, off } }  ← sale
//   custom: { weapon: [...], pet: [...], effect: [...], frame: [...], peffect: [...] }
// applyCatalog() rewrites the live arrays / lookup maps in place so every
// screen picks the changes up. shopItems() / locationShops() replace the
// fixed SHOPS lists when a location's shop is opened.
// =====================================================================
import { Store } from "../core/store.js";
import {
    PETS, PET_EFFECTS, WEAPONS, FRAMES, PROFILE_EFFECTS, ITEMS, SHOPS, LOCATIONS,
    PET_BY_ID, PETFX_BY_ID, WEAPON_BY_ID, FRAME_BY_ID, PEFFECT_BY_ID, ITEM_BY_ID, ALPHABET, EXTRA_LETTERS, letterSale, cardId, WX_GEAR_MAPS
} from "./catalog.js";
import { EMO_ITEMS } from "../emomon/data.js";
import "./life.js"; // 🍚 food + 🧾 bank items join ITEMS before the originals below are kept (applyCatalog restores from them)
// EmoMon items the discount shop may carry (gold-priced, not LAB-only)
const EMO_SALE = EMO_ITEMS.filter(e => e.gold > 0 && !e.noSale && !e.pts);

export const CATS = {
    weapon:  { label: "무기",        list: WEAPONS,         map: WEAPON_BY_ID,  shop: "weapon", custom: true },
    item:    { label: "아이템",      list: ITEMS,           map: ITEM_BY_ID,    shop: "general", custom: false },
    pet:     { label: "펫",          list: PETS,            map: PET_BY_ID,     shop: "pet",    custom: true },
    effect:  { label: "펫효과",      list: PET_EFFECTS,     map: PETFX_BY_ID,   shop: "pet",    custom: true },
    frame:   { label: "프레임",      list: FRAMES,          map: FRAME_BY_ID,   shop: "decor",  custom: true },
    peffect: { label: "프레임효과",  list: PROFILE_EFFECTS, map: PEFFECT_BY_ID, shop: "decor",  custom: true }
};
// which stat fields the admin can edit per category
export const STAT_FIELDS = {
    weapon: ["name", "emoji", "type", "atk", "acc"],
    item: ["name", "emoji", "desc"],
    pet: ["name", "kind", "boost"],
    effect: ["name", "kind", "boost"],
    frame: ["name"],
    peffect: ["name"]
};
export const WEAPON_ANIMS = ["punch", "shield", "tongue", "kick", "drop", "ghost", "ko", "orb", "sleep", "coin", "thunder", "fire", "storm", "magic", "nomove", "spray"];
export const PET_ANIMS = ["bounce", "wobble", "wag", "hop", "walk", "fly", "prance"];
export const FX_MODES = ["float", "twinkle", "orbit", "wave", "rise", "jump", "rain", "fountain", "swoop", "firework"];
export const FRAME_STYLES = ["fr-silver", "fr-gold", "fr-neon", "fr-ice", "fr-fire", "fr-rainbow", "fr-bulbs", "fr-diamond", "fr-dragon", "fr-galaxy"];

// pristine copies of the built-in entries
const ORIGINAL = Object.fromEntries(Object.entries(CATS).map(([k, c]) => [k, c.list.map(e => structuredClone(e))]));
// default sale info from SHOPS
const BASE_SALE = {};
// (alt entries = a second shop selling the same thing, e.g. alphabet cards in the point shop)
// gold: second price of 포인트+골드 상점 goods · locs: goods sold at one fixed map only
for (const [shopId, shop] of Object.entries(SHOPS)) for (const it of shop.list) if (!it.alt) BASE_SALE[`${it.cat}:${it.id}`] = { shop: shopId, price: it.price, gold: it.gold || 0, locs: it.locs || null };

const conf = () => Store.catalog || {};

export function applyCatalog() {
    const { edits = {}, custom = {} } = conf();
    for (const [cat, c] of Object.entries(CATS)) {
        const fresh = ORIGINAL[cat].map(e => structuredClone(e));
        for (const e of custom[cat] || []) fresh.push({ ...structuredClone(e), custom: true });
        for (const e of fresh) {
            const ed = edits[`${cat}:${e.id}`];
            if (!ed) continue;
            for (const f of STAT_FIELDS[cat]) if (ed[f] !== undefined && ed[f] !== "") e[f] = ["atk", "acc", "boost"].includes(f) ? +ed[f] : ed[f];
        }
        c.list.splice(0, c.list.length, ...fresh);
        for (const k of Object.keys(c.map)) delete c.map[k];
        for (const e of fresh) c.map[e.id] = e;
    }
}

// Effective sale info for one entry (null shop = not sold)
export function saleOf(cat, id) {
    const key = `${cat}:${id}`;
    const base = BASE_SALE[key] || { shop: null, price: 0 };
    const ed = conf().edits?.[key] || {};
    return {
        shop: ed.shop !== undefined ? ed.shop : base.shop,
        price: ed.price != null && ed.price !== "" ? +ed.price : base.price,
        gold: base.gold || 0,
        locs: ed.locs || base.locs || null,       // null = every location that has this shop
        off: !!ed.off,
        cur: SHOPS[ed.shop !== undefined ? ed.shop : base.shop]?.cur || "G"
    };
}

export function shopItems(shopId, locId) {
    const out = [];
    const noTime = locId && LOCATIONS.find(l => l.id === locId)?.crazy; // 🤪 Crazy Casino never sells the +5 min ticket
    for (const cat of Object.keys(CATS)) {
        for (const e of CATS[cat].list) {
            const s = saleOf(cat, e.id);
            if (s.off || s.shop !== shopId || !s.price) continue;
            if (noTime && e.id === "time_ext") continue;
            if (s.locs && locId && !s.locs.includes(locId)) continue;
            if (!s.locs && e.letter && !cardSoldHere(shopId, e.letter, locId)) continue; // alphabet cards: only at their maps
            out.push({ cat, id: e.id, price: s.price, gold: s.gold || 0 });
        }
    }
    return out;
}

// Shop tabs for a location: its built-in shops plus any shop type that an
// item has been explicitly assigned to at this location.
export function locationShops(loc) {
    const set = new Set(loc.shops);
    const { edits = {} } = conf();
    for (const [key, ed] of Object.entries(edits)) {
        if (ed.off || !ed.locs?.includes(loc.id)) continue;
        const [cat, id] = key.split(":");
        const s = saleOf(cat, id);
        if (s.shop) set.add(s.shop);
    }
    return Object.keys(SHOPS).filter(k => set.has(k));
}

export function locationsWithShop(shopId) { return LOCATIONS.filter(l => locationShops(l).includes(shopId)); }

// second-shop listings (alt: true in SHOPS) are added as they are
export function altItems(shopId, locId) { return (SHOPS[shopId]?.list || []).filter(it => it.alt && !(it.locs && locId && !it.locs.includes(locId)) && !saleOf(it.cat, it.id).off && !(ITEM_BY_ID[it.id]?.letter && !cardSoldHere(shopId, ITEM_BY_ID[it.id].letter, locId))).map(it => ({ cat: it.cat, id: it.id, price: it.price })); }

// What a map's shop tab sells. A tab left with nothing to sell (e.g. every
// product moved elsewhere / turned off in the admin) is stocked with 2~8
// different goods of that shop type, fixed per map (seeded by map + shop).
// Map passes and alphabet cards are never used as filler.
// 🔄 Survival Land (패자부활전) general shops: a fixed list per map (Survival Land passes = "pass_<map id>", 45,000G)
//    + whatever the admin placed on that map by name (an item whose 판매 맵 lists it, e.g. ⏹️ 턴 종료권)
const SV_ALL_PASSES = ["disaster_casino", "arcade", "button_casino", "foggy_church", "quiz_casino", "inferno_casino", "icy_castle", "decal_casino", "mosquito_forest"].map(id => "pass_" + id);
export const SURVIVAL_SHOP = {
    icy_castle:      ["pass_arcade", "pass_quiz_casino", "oxygen", "casino_plus1", "cancer_cure"],
    decal_casino:    ["pass_inferno_casino", "pass_mosquito_forest", "slot_plus5", "hp_50", "flu_cure"],
    mosquito_forest: ["pass_disaster_casino", "pass_foggy_church", "hp_10", "casino_plus1", "space_suit"],
    disaster_casino: ["time_ext", "flu_cure", "pass_decal_casino", "pass_icy_castle", "hp_10"],
    button_casino:   ["hp_10", ...SV_ALL_PASSES.filter(id => id !== "pass_button_casino"), "oxygen", "space_suit", "wings", "time_ext"],
    quiz_casino:     ["pass_disaster_casino", "pass_mosquito_forest", "hp_10", "casino_plus1"],
    inferno_casino:  ["pass_icy_castle", "pass_button_casino", "pass_arcade", "pass_foggy_church", "hp_10"],
    foggy_church:    ["pass_decal_casino", "hp_10", "slot_plus5", "casino_plus1"],
    arcade:          ["pass_disaster_casino", "pass_icy_castle", "hp_10", "slot_plus5", "casino_plus1"]
};
// 🔄 Survival Land weapon shops: 3 weapons each, never the same weapon at two maps (prices as in the weapon shop)
export const SURVIVAL_WEAPONS = {
    disaster_casino: ["guard", "c_weapon_mwcda4qy", "punch"],               // 🛡️ 방어 · ⏸️ 일시 정지 · 👊 펀치
    foggy_church:    ["c_weapon_mwcdhjcp", "magic", "coin_throw"],          // 🚫 블락 · 🪄 마법 · 🪙 동전 던지기
    inferno_casino:  ["c_weapon_mwcdtfgc", "kick", "ghost_punch"],          // 💤 자장가 · 🦶 발차기 · 👻 고스트 더블 펀치
    icy_castle:      ["c_weapon_mwcd8dgt", "holo_ball", "rock"],            // ⛈️ 악마의 천둥 번개 · 🔮 홀로그램 볼 · 🪨 돌 떨어뜨리기
    mosquito_forest: ["ko_punch", "spray", "c_weapon_mwcdfsy6"]             // 🥊 K.O 펀치 · 🧴 스프레이 · ✂️ 가위 찌르기
};
export function shopListing(shopId, locId) {
    if (shopId === "weapon" && LOCATIONS.find(l => l.id === locId)?.region === "survival") {
        return (SURVIVAL_WEAPONS[locId] || []).filter(id => WEAPON_BY_ID[id] && !saleOf("weapon", id).off)
            .map(id => ({ cat: "weapon", id, price: saleOf("weapon", id).price || 0, gold: 0 })).filter(it => it.price > 0);
    }
    if (shopId === "general" && LOCATIONS.find(l => l.id === locId)?.region === "survival") {
        const ids = SURVIVAL_SHOP[locId] || [];
        const base = Object.fromEntries(SHOPS.general.list.map(it => [it.id, it]));
        const fixed = ids.filter(id => ITEM_BY_ID[id]).map(id => ({ cat: "item", id, price: (saleOf("item", id).price || base[id]?.price || 0), gold: 0 }));
        // extras the admin pinned to this very map (never another Survival Land pass)
        const pinned = shopItems(shopId, locId).filter(it => saleOf(it.cat, it.id).locs?.includes(locId) && !ids.includes(it.id) && !ITEM_BY_ID[it.id]?.survival);
        return [...fixed, ...pinned];
    }
    const list = [...shopItems(shopId, locId), ...altItems(shopId, locId)];
    if (list.length || !locId || shopId === "discount") return list;
    return fillerItems(shopId, locId);
}
export function fillerItems(shopId, locId) {
    const noTime = LOCATIONS.find(l => l.id === locId)?.crazy;
    // goods tied to certain maps (locs: ⏹️ 턴 종료권 · 🧳 · 🩸 …) never become filler elsewhere
    const ok = it => it.price && !it.locs && !saleOf(it.cat, it.id).locs && !ITEM_BY_ID[it.id]?.loc && !ITEM_BY_ID[it.id]?.letter && !(noTime && it.id === "time_ext") && !saleOf(it.cat, it.id).off;
    const seen = new Set();
    const uniq = it => { const k = `${it.cat}:${it.id}`; if (seen.has(k)) return false; seen.add(k); return true; };
    let pool = (SHOPS[shopId]?.list || []).filter(ok).filter(uniq);
    if (!pool.length && SHOPS[shopId]?.cur === "G") pool = SHOPS.general.list.filter(ok).filter(uniq);
    const rnd = seeded(`fill|${shopId}|${locId}`);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const n = Math.min(pool.length, 2 + Math.floor(rnd() * 7)); // 2~8
    return pool.slice(0, n).map(it => ({ cat: it.cat, id: it.id, price: saleOf(it.cat, it.id).price || it.price, gold: it.gold || 0, filler: true }));
}

// ---------------------------------------------------------------- discount shop
// A different handful of gold-shop goods every round at every map, 10~20% off.
function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
export function discountItems(locId, seed = "") {
    const rnd = seeded(`${locId}|${seed}`);
    const pool = ["general", "weapon", "pet", "decor"].flatMap(sid => shopItems(sid).map(it => ({ ...it, from: sid })))
        .filter(it => !(it.cat === "item" && /^pass_|^card_/.test(it.id)) && !saleOf(it.cat, it.id).locs); // one-map goods (new frames/effects) stay at their map
    const pickN = (list, n) => { const a = [...list]; const out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };
    const byCat = c => pool.filter(it => it.cat === c);
    const chosen = [...pickN(byCat("item"), 3), ...pickN(byCat("weapon"), 2), ...pickN([...byCat("pet"), ...byCat("effect")], 2), ...pickN([...byCat("frame"), ...byCat("peffect")], 2)];
    // + the 알파벳권 whose discount home is this map
    const letters = cardsAt(locId).filter(c => c.shop === "discount").map(c => ({ cat: "item", id: cardId(c.letter), price: letterSale(c.letter).price }));
    // + goods whose home is this discount shop (☔ 1회용 weather gear …)
    const own = (wxGearDiscountMaps().includes(locId) ? shopItems("discount", locId) : []).filter(it => !chosen.some(c => c.cat === it.cat && c.id === it.id));
    const fixed = [...own, ...discountExtras(locId).filter(x => !chosen.some(c => c.cat === x.cat && c.id === x.id) && !own.some(o => o.cat === x.cat && o.id === x.id))];
    return [...chosen, ...letters, ...fixed].map(it => { const off = 10 + Math.floor(rnd() * 11); return { cat: it.cat, id: it.id, price: Math.max(100, Math.round(it.price * (100 - off) / 100 / 100) * 100), was: it.price, off, ...(it.extra ? { extra: true } : {}) }; });
}

// 🏷️ + 3 FIXED extra goods per discount map (EmoMon items included), picked once per map:
// never something that map's 일반 / 포인트 / 포인트+골드 상점 already sells, and never the same as another discount map's extras.
const EXTRA_N = 3;
let extraCache = null;
export function discountExtras(locId) {
    const maps = LOCATIONS.filter(l => l.discount && !l.off);
    const key = maps.map(l => `${l.id}/${locationShops(l).join(",")}`).join("|") + "|" + EMO_SALE.length;
    if (extraCache?.key !== key) {
        const rnd = seeded("gamblers-discount-extras");
        const gold = ["general", "weapon", "pet", "decor"].flatMap(sid => shopItems(sid).map(it => ({ cat: it.cat, id: it.id, price: it.price })))
            // weapons / pets are listed per map in their own shops (locs) — fine as extras; one-map frames / effects stay at their map
            .filter(it => !(it.cat === "item" && /^pass_|^card_/.test(it.id)) && (["weapon", "pet", "effect"].includes(it.cat) || !saleOf(it.cat, it.id).locs));
        const emo = EMO_SALE.map(e => ({ cat: "emo", id: e.id, price: e.gold }));
        const pool = [...new Map([...gold, ...emo].map(it => [`${it.cat}:${it.id}`, it])).values()];
        const used = new Set(), out = {};
        for (const l of maps) {
            const sold = new Set(["general", "point", "pointgold"].flatMap(sid => shopListing(sid, l.id).map(it => `${it.cat}:${it.id}`)));
            let cand = pool.filter(it => !used.has(`${it.cat}:${it.id}`) && !sold.has(`${it.cat}:${it.id}`));
            const pick = [];
            // at least one EmoMon item per map while they last
            const emoCand = cand.filter(it => it.cat === "emo");
            if (emoCand.length) pick.push(emoCand[Math.floor(rnd() * emoCand.length)]);
            cand = cand.filter(it => !pick.includes(it));
            while (pick.length < EXTRA_N && cand.length) pick.push(cand.splice(Math.floor(rnd() * cand.length), 1)[0]);
            for (const it of pick) used.add(`${it.cat}:${it.id}`);
            out[l.id] = pick.map(it => ({ ...it, extra: true }));
        }
        extraCache = { key, out };
    }
    return extraCache.out[locId] || [];
}

// ---------------------------------------------------------------- alphabet cards
// The 8 cards are NOT sold together: each letter is sold at only a few maps,
// spread over different regions, and a map's shop sells at most one letter.
// General shop: 3 maps per letter · point shop: 2 maps per letter.
// (An admin "판매 카지노" choice in 상품·상점 관리 overrides this.)
const CARD_SHOPS = { general: 3, point: 2 };
let cardCache = null;
export function cardHomes() {
    const live = LOCATIONS.filter(l => !l.off);
    const key = live.map(l => `${l.id}/${l.region}/${locationShops(l).join(",")}`).join("|");
    if (cardCache?.key === key) return cardCache.homes;
    const rnd = seeded("gamblers-alphabet-cards");
    const homes = {};
    for (const [shop, per] of Object.entries(CARD_SHOPS)) {
        const maps = live.filter(l => locationShops(l).includes(shop));
        const used = new Set();
        for (const L of ALPHABET) {
            const regions = new Set(), out = [];
            for (let k = 0; k < per; k++) {
                let cand = maps.filter(l => !used.has(l.id) && !regions.has(l.region));
                if (!cand.length) cand = maps.filter(l => !used.has(l.id));
                if (!cand.length) break;
                const l = cand[Math.floor(rnd() * cand.length)];
                used.add(l.id); regions.add(l.region); out.push(l.id);
            }
            homes[`${shop}:${L}`] = out;
        }
    }
    // 알파벳권 (the other 18 letters): 3 maps each, spread over different regions
    // gold letters → 2 general shops + 1 discount shop · H, Q → 3 point shops
    const rnd2 = seeded("gamblers-alphabet-extra");
    const load = id => Object.values(homes).filter(ids => ids.includes(id)).length;
    const pickMaps = (shop, n, regions) => {
        const maps = live.filter(l => shop === "discount" ? l.discount : locationShops(l).includes(shop));
        const out = [];
        for (let k = 0; k < n; k++) {
            let cand = maps.filter(l => !out.includes(l.id) && !regions.has(l.region));
            if (!cand.length) cand = maps.filter(l => !out.includes(l.id));
            if (!cand.length) break;
            const min = Math.min(...cand.map(l => load(l.id)));
            cand = cand.filter(l => load(l.id) === min); // least-loaded maps first
            const l = cand[Math.floor(rnd2() * cand.length)];
            regions.add(l.region); out.push(l.id);
        }
        return out;
    };
    for (const L of EXTRA_LETTERS) {
        const regions = new Set();
        if (letterSale(L).shop === "point") homes[`point:${L}`] = pickMaps("point", 3, regions);
        else { homes[`general:${L}`] = pickMaps("general", 2, regions); homes[`discount:${L}`] = pickMaps("discount", 1, regions); }
    }
    cardCache = { key, homes };
    return homes;
}
// is this card for sale in that shop at that map?
export const cardSoldHere = (shopId, letter, locId) => !locId || (cardHomes()[`${shopId}:${letter}`] || []).includes(locId);
// cards sold at a map: [{ shop, letter }]
export const cardsAt = locId => Object.entries(cardHomes()).filter(([, ids]) => ids.includes(locId)).map(([k]) => { const [shop, letter] = k.split(":"); return { shop, letter }; });

// ☔ 1회용 weather gear: sold at 20 of the discount maps (all of them if there are fewer) — picked from the
// maps that have a discount shop right now (seeded, so the same maps keep them while the list stays the same)
let wxGearCache = null;
export function wxGearDiscountMaps() {
    const maps = LOCATIONS.filter(l => l.discount && !l.off && !l.kidnap && l.region !== "survival").map(l => l.id).sort();
    const key = maps.join(",");
    if (wxGearCache?.key !== key) {
        const rnd = seeded("gamblers-weather-gear-discount"), a = [...maps];
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        wxGearCache = { key, list: a.slice(0, WX_GEAR_MAPS) };
    }
    return wxGearCache.list;
}
