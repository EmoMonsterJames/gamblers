// =====================================================================
// 🏅 Honorarium shops — TOP 15 / TOP 12 / TOP 10 / TOP 6 / TOP 3 / 우승자 전용 상점.
//   · only for players with that past finish (season TOP N, 우승 = 1위) — test mode: everyone
//   · placed on 25 different maps (1~2 shops each) that have Honorarium corners (topped up from their regions) —
//     random by default, the admin can re-roll or tick them per map (🌍 지역·맵 관리, loc.honorShop)
//   · every shop: 2~5 random goods from its list, 20~30% off the admin price (new mix every season)
//   · every player: at most HSHOP_USES purchases per season in all Honorarium shops together
// =====================================================================
import { Store } from "../core/store.js";
import { LOCATIONS, ALPHABET, cardId, SHOPS, PETS, PET_EFFECTS, ITEM_BY_ID } from "./catalog.js";
import { saleOf } from "./catalogAdmin.js";
import { FOOD_BY_ID, foodItemId } from "./life.js";
import { honorKinds } from "./honor.js";

export const HSHOP_USES = 2, HSHOP_MAPS = 25;
export const HSHOP = {
    top15: { id: "top15", rank: 15, name: "TOP 15 전용 상점", emoji: "🎗️", color: "#38bdf8" },
    top12: { id: "top12", rank: 12, name: "TOP 12 전용 상점", emoji: "🏵️", color: "#34d399" },
    top10: { id: "top10", rank: 10, name: "TOP 10 전용 상점", emoji: "🎖️", color: "#60a5fa" },
    top6: { id: "top6", rank: 6, name: "TOP 6 전용 상점", emoji: "🥉", color: "#a78bfa" },
    top3: { id: "top3", rank: 3, name: "TOP 3 전용 상점", emoji: "🥇", color: "#f472b6" },
    winner: { id: "winner", rank: 1, name: "우승자 전용 상점", emoji: "👑", color: "#fbbf24" }
};
export const HSHOP_ALL = Object.keys(HSHOP);

// ---------------------------------------------------------------- what each shop may sell
// an entry is one shelf: { label, goods: [{ cat, id }] } — a shelf with several goods shows one of them (seeded)
const one = (label, cat, id) => ({ label, goods: [{ cat, id }] });
const many = (label, goods) => ({ label, goods });
const foods = ids => many("식량", ids.filter(id => FOOD_BY_ID[id]).map(id => ({ cat: "item", id: foodItemId(id) })));
const shopGoods = (shop, cat, f = () => true) => (SHOPS[shop]?.list || []).filter(it => it.cat === cat && f(it)).map(it => ({ cat, id: it.id }));
const FOOD15 = ["water", "bagettn", "ddeogwi", "minichicken"];
const FOOD12 = [...FOOD15, "creambread", "minicake", "burger"];
const FOOD10 = [...FOOD12, "kkorong", "energydrink", "cheese", "bosongkimchi"];
const FOOD6 = [...FOOD10, "clearjuice", "sunshine", "shapecookie", "pinenoodle", "antnoodle"];
// 🐾 EmoMonsters sold here (species found by name in the EmoMonster catalog) — price = what the shop asks (no extra discount)
export const HSHOP_MONS = { fishy: 41650, poopi: 41650, eggie: 41650, leafy: 59500, flamo: 59500, hearty: 59500, galaxyon: 83300, epie: 83300, topiri: 83300, dolharu: 83300 };
const mon = n => one(n[0].toUpperCase() + n.slice(1), "mon", n);
export function hshopShelves(kind) {
    const normalFrames = () => shopGoods("decor", "frame"), normalFx = () => shopGoods("decor", "peffect");
    const specialDeco = () => [...shopGoods("point", "frame"), ...shopGoods("point", "peffect"), ...shopGoods("pointgold", "frame"), ...shopGoods("pointgold", "peffect")];
    const passes = () => shopGoods("general", "item", it => !!ITEM_BY_ID[it.id]?.loc && !ITEM_BY_ID[it.id]?.survival);
    const petsOf = k => PETS.filter(p => p.kind === k).map(p => ({ cat: "pet", id: p.id }));
    const fxOf = k => PET_EFFECTS.filter(e => e.kind === k).map(e => ({ cat: "effect", id: e.id }));
    const T15 = [one("Monster Ball", "emo", "ITEM001"), one("Super Ball", "emo", "ITEM002"), many("알파벳 카드 (G·A·M·B·L·E·R·S)", ALPHABET.map(l => ({ cat: "item", id: cardId(l) }))),
        one("+10 HP 약", "item", "hp_10"), one("NPC 공격 BLOCK 1회권", "item", "npc_block1"), one("1회용 우산", "item", "umbrella_1"), one("1회용 우비", "item", "raincoat_1"), one("1회용 양산", "item", "parasol_1")];
    const T12 = [one("독감치료제", "item", "flu_cure"), one("암치료제", "item", "cancer_cure"), one("HP +50 회복권", "item", "hp_50"), one("이모몬스터 HP +10", "emo", "EMO_HP10"),
        one("Hyper Ball", "emo", "ITEM003"), one("혈당관리제", "item", "sugar_cure"), many("일반 프레임", normalFrames())];
    const T10 = [one("Full HP 회복권", "item", "hp_full"), one("이모몬스터 HP +50", "emo", "EMO_HP50"), one("Crazy Ball", "emo", "ITEM008"), many("일반 프레임효과", normalFx())];
    const T6 = [one("플레이시간 5분", "item", "time_ext"), one("카지노게임 1회 추가권", "item", "casino_plus1"), one("슬롯게임 5회 추가권", "item", "slot_plus5"), one("PP 회복약", "emo", "EMO_PP"),
        many("맵권", passes()), many("펫", petsOf("normal")), many("특수 프레임 / 효과", specialDeco()), mon("fishy"), mon("poopi"), mon("eggie")];
    const T3 = [one("미션완료권", "item", "mission_pass"), one("최종후보선택제외권", "item", "final_shield"), one("FULL HP 몬스터 회복권", "emo", "EMO_HPFULL"),
        many("일반 펫 효과", fxOf("normal")), mon("leafy"), mon("flamo"), mon("hearty")];
    const TW = [many("특수 펫", petsOf("special")), many("특수 펫 효과", fxOf("special")), mon("galaxyon"), mon("epie"), mon("topiri"), mon("dolharu")];
    const tiers = { top15: [T15, FOOD15], top12: [[...T15, ...T12], FOOD12], top10: [[...T15, ...T12, ...T10], FOOD10], top6: [[...T15, ...T12, ...T10, ...T6], FOOD6],
        top3: [[...T15, ...T12, ...T10, ...T6, ...T3], FOOD6], winner: [[...T15, ...T12, ...T10, ...T6, ...T3, ...TW], FOOD6] };
    const [list, fl] = tiers[kind] || tiers.top15;
    return [...list, foods(fl)].filter(s => s.goods.length);
}

// ---------------------------------------------------------------- seeded random
export function seeded(str) {
    let h = 2166136261;
    for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000003) / 1000003; };
}
const shuffle = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- placement (25 maps · 1~2 shops each)
const placeable = l => !l.off && !l.kidnap && l.region !== "survival" && !l.revival;
// the region(s) that have Honorarium corners (none placed yet → every region)
export function honorRegions() {
    const r = new Set(LOCATIONS.filter(l => placeable(l) && honorKinds(l).length).map(l => l.region));
    return r.size ? r : new Set(LOCATIONS.filter(placeable).map(l => l.region));
}
// a fresh random placement → { locId: [kinds] } (every shop at least once)
export function rollPlacement(seed = String(Math.random())) {
    const r = seeded("hshop:" + seed), regions = honorRegions();
    // maps that have an Honorarium corner first; fewer than 25 → topped up from other maps of those regions
    const withCorner = shuffle(LOCATIONS.filter(l => placeable(l) && honorKinds(l).length).map(l => l.id), r);
    const rest = shuffle(LOCATIONS.filter(l => placeable(l) && regions.has(l.region) && !honorKinds(l).length).map(l => l.id), r);
    const maps = [...withCorner, ...rest].slice(0, HSHOP_MAPS);
    const out = {};
    maps.forEach((id, i) => {
        const first = i < HSHOP_ALL.length ? HSHOP_ALL[i] : HSHOP_ALL[Math.floor(r() * HSHOP_ALL.length)];
        const set = new Set([first]);
        if (r() < 0.5) set.add(HSHOP_ALL[Math.floor(r() * HSHOP_ALL.length)]);
        out[id] = HSHOP_ALL.filter(k => set.has(k));
    });
    return out;
}
// the admin placed them (some map has loc.honorShop) → that; else a fixed random placement
let auto = null, autoSig = "";
export const adminPlaced = () => LOCATIONS.some(l => Array.isArray(l.honorShop));
export function hshopKinds(loc) {
    if (!loc) return [];
    if (adminPlaced()) return Array.isArray(loc.honorShop) ? loc.honorShop.filter(k => HSHOP[k]) : [];
    const sig = LOCATIONS.map(l => l.id + l.region + (l.off ? 0 : 1) + honorKinds(l).length).join();
    if (!auto || sig !== autoSig) { auto = rollPlacement("default-v1"); autoSig = sig; }
    return auto[loc.id] || [];
}

// ---------------------------------------------------------------- the goods of one shop (this season)
const monSpeciesId = (cat, n) => (cat?.mons || []).find(m => String(m.name || "").trim().toLowerCase() === n)?.id ?? null;
// admin price of a good → { gold, pts } | null
export function basePrice(g) {
    if (g.cat === "mon") return { gold: HSHOP_MONS[g.id] || 0, pts: 0, fixed: true };
    if (g.cat === "item" && g.id === "sugar_cure") return { gold: 20000, pts: 0, fixed: true }; // 원래 포인트 상품 → 20,000G
    if (g.cat === "item" && g.id.startsWith("food_")) { const f = FOOD_BY_ID[g.id.slice(5)]; return f?.price ? { gold: f.price, pts: 0 } : null; }
    if (g.cat === "emo") return null; // filled in by the screen (EmoMon prices live in emomon/data.js)
    const s = saleOf(g.cat, g.id);
    if (!(s.price > 0)) return null;
    return s.cur === "P" ? { gold: 0, pts: s.price } : s.cur === "PG" ? { gold: s.gold || 0, pts: s.price } : { gold: s.price, pts: 0 };
}
// → [{ cat, id, label, off (0.2~0.3), seedKey }] — 2~5 shelves, the same for every player this season
export function hshopStock(locId, kind, season = 0) {
    const r = seeded(`hshop:${season}:${locId}:${kind}`);
    const shelves = shuffle(hshopShelves(kind), r);
    const n = 2 + Math.floor(r() * 4); // 2~5
    return shelves.slice(0, n).map(s => {
        const g = s.goods[Math.floor(r() * s.goods.length)];
        return { ...g, label: s.label, off: Math.round((0.2 + r() * 0.1) * 100) / 100 };
    });
}
export const discounted = (p, off) => p.fixed ? { gold: p.gold, pts: p.pts } : { gold: Math.round(p.gold * (1 - off) / 10) * 10, pts: Math.max(p.pts ? 1 : 0, Math.round(p.pts * (1 - off))) };
export { monSpeciesId };

// ---------------------------------------------------------------- who may shop
export const hshopRecords = (pid, rank) => Store.results.filter(r => r.playerId === +pid && r.rank != null && r.rank <= rank);
export const hshopEligible = (s, pid, kind) => s?.testSeason ? false : !!s?.sandbox || hshopRecords(pid, HSHOP[kind].rank).length > 0;
export const hshopUsed = ps => ps?.hshopUses || 0;
