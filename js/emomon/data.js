// =====================================================================
// 🐾 EmoMon data for Gamblers
//   • the EmoMonster catalog (monsters, weapons, traits, evolutions, items,
//     diseases, lab recipes) is copied from the EmoMonster tables (same
//     Supabase project, public schema) by the admin → settings "emomon".
//   • EMO_ITEMS: the monster goods Gamblers sells / gives (balls, potions,
//     breakers, deletes, evolution items, materials)
//   • captureConfig(loc): every map's 🔍 Capture corner — which first-stage
//     monsters live there, how often a monster shows up, and the door rule.
// =====================================================================
import { Store } from "../core/store.js";
import { LOCATIONS } from "../data/catalog.js";

export const EMO = {
    MAX_MONS: 3, MAX_WEAPONS: 6, MAX_TRAITS: 2, MAX_TYPES: 3,
    CAPTURES_PER_SEASON: 10,
    BOT_ID: 219,                 // EmoMon Battlebot fights for a player without monsters
    BOT_ACC: 30,                 // its two weapons hit only 30%
    LEVEL: 50,                   // EmoMonster has no levels any more: stats are always taken at Lv 50
    HP: 100,                     // every monster has 100 HP
    RELEASE_PRICE: 100000,       // 몬스터 Release 권 (only usable with all 3 slots full)
    // Find item drops (weights): Monster Ball common, Super Ball / PP · HP potions rare, alphabet cards C D F I J K P
    FIND_ITEMS: [["ITEM001", 34], ["ITEM002", 5], ["EMO_PP", 5], ["EMO_HP10", 5], ["card:C", 7], ["card:D", 7], ["card:F", 7], ["card:I", 7], ["card:J", 7], ["card:K", 7], ["card:P", 7]],
    HOSPITAL_FEE: 1000, CAPTURE_FEE: 1000, CAPTURE_RANDOM_OK: 0.6,
    BATTLER_GOLD: [1000, 10000], BATTLER_PTS: [1, 10], FIND_GOLD: [100, 1000],
    // share of a monster showing up, by rarity (★1 … ★6) — 60 · 25 · 8 · 4 · 1.8 · 0.9
    RARITY_WEIGHT: [0, 60, 25, 8, 4, 1.8, 0.9],
    // what a Find gives when no monster shows up (shares of the rest)
    MISS_SPLIT: { battler: 35, nothing: 30, gold: 20, item: 15 },
    STARS: n => "★".repeat(Math.max(1, Math.min(6, n || 1)))
};

// ---------------------------------------------------------------- catalog snapshot
let C = null;          // indexes over Store.emomon
export const cat = () => C;
export async function loadCatalog() {
    const raw = await Store.loadEmomon();
    if (!raw?.monsters?.length) { C = null; return null; }
    index(raw);
    return C;
}
function index(raw) {
    const by = (list, k = "id") => Object.fromEntries((list || []).map(x => [String(x[k]), x]));
    const evo = raw.monster_evolution || [];
    const targets = new Set(evo.map(e => String(e.target_monster_id)));
    const mons = (raw.monsters || []).filter(m => m.active !== false).sort((a, b) => a.id - b.id);
    C = {
        raw, at: raw.updated_at || raw.syncedAt,
        mons, mon: by(mons), weapons: raw.weapons || [], weapon: by(raw.weapons), traits: (raw.monster_traits || []).filter(t => t.is_active !== false),
        trait: by(raw.monster_traits), items: raw.game_items || [], item: by(raw.game_items), evo,
        diseases: raw.disease_types || [], recipes: (raw.lab_recipes || []).filter(r => r.active !== false),
        // first stage = nobody evolves into it (monsters without an evolution count too)
        base: mons.filter(m => !targets.has(String(m.id)) && m.id !== EMO.BOT_ID),
        evoFrom: id => evo.filter(e => String(e.monster_id) === String(id)),
        evoTo: id => evo.filter(e => String(e.target_monster_id) === String(id))
    };
    return C;
}
export const species = id => C?.mon[String(id)] || null;
export const isFirstStage = id => !C?.evoTo(id).length;
export const isFinalStage = id => !C?.evoFrom(id).length && !!C?.evoTo(id).length;
export const hasEvolution = id => !!(C?.evoFrom(id).length || C?.evoTo(id).length);
export const typesOfSpecies = m => [m?.type1 || m?.type, m?.type2, m?.type3].filter(Boolean);
export const monImg = m => m?.image ? "emomon/" + String(m.image).replace(/^\.?\.?\//, "") : "";
export const itemImg = it => it?.image ? (/^(https?:|data:)/.test(it.image) ? it.image : "emomon/" + String(it.image).replace(/^\.?\.?\//, "")) : "";

// ---------------------------------------------------------------- Gamblers monster goods
// kind: ball · potion · cure · delete · breaker · evo · material. `src` = the EmoMonster item it is
// (picture / description come from there); `gold` / `pts` = Gamblers price.
const TYPE_LIST = ["Normal", "Abnormal", "Magic", "Power", "Water", "Fire", "Grass", "Electric", "Ice", "Angel", "Evil", "Air", "Fly", "Earth", "Bug", "Ghost", "Steel", "Fairy", "Space", "Robot", "Light", "Mind"];
export const EMO_ITEMS = [
    { id: "ITEM001", kind: "ball", name: "몬스터볼", en: "Monster Ball", emoji: "🔴", bonus: 10, gold: 3000, img: "images/icons/balls/monster.svg" },
    { id: "ITEM002", kind: "ball", name: "Super Ball", emoji: "🔵", bonus: 22, gold: 8000, img: "images/icons/balls/super.svg" },
    { id: "ITEM003", kind: "ball", name: "Hyper Ball", emoji: "🟡", bonus: 40, gold: 20000, img: "images/icons/balls/hyper.svg" },
    { id: "ITEM008", kind: "ball", name: "Crazy Ball", emoji: "🌀", crazy: true, gold: 30000, img: "images/icons/balls/crazy.svg", note: "50% 확률로 +75%, 아니면 +0% — 모 아니면 도!" },
    { id: "ITEM004", kind: "ball", name: "Master Ball", emoji: "🟣", bonus: 100, pts: 300, img: "images/icons/balls/master.svg", note: "무조건 잡힙니다" },
    ...TYPE_LIST.map(t => ({ id: "BALL_" + t.toUpperCase(), kind: "ball", name: `${t} Ball`, emoji: "⚪", attr: t, bonus: 45, gold: 9000, img: `images/icons/balls/attr_${t.toLowerCase()}.svg`, note: `${t} 속성 몬스터에게 +45% (다른 몬스터는 +0%)` })),
    { id: "EMO_HP10", kind: "potion", name: "몬스터 HP 약 +10", emoji: "🧪", hp: 10, gold: 2500 },
    { id: "EMO_HP50", kind: "potion", name: "몬스터 HP 약 +50", emoji: "💉", hp: 50, gold: 11000 },
    { id: "EMO_HPFULL", kind: "potion", name: "몬스터 FULL HP 약", emoji: "❤️‍🩹", hp: "full", gold: 24000 },
    { id: "EMO_PP", kind: "pp", name: "PP 회복약", emoji: "🔋", gold: 12000, note: "몬스터 1마리의 모든 무기 PP를 가득 채웁니다 (PP는 배틀이 끝나도 회복되지 않습니다)" },
    { id: "EMO_CURE", kind: "cure", name: "몬스터 만능 치료제", emoji: "💊", gold: 15000, note: "질병 · 상태이상을 모두 치료합니다 (HP는 그대로)" },
    { id: "EMO_WEAPON_DEL", kind: "delete", name: "몬스터 무기 삭제권", emoji: "🗑️", gold: 8000 },
    { id: "EMO_MON_DEL", kind: "delete", name: "몬스터 Release 권", emoji: "🚮", gold: 100000, note: "몬스터 3마리가 꽉 찼을 때만 사용 — 1마리를 놓아 주어 슬롯을 엽니다" },
    { id: "EMO_TYPE_BREAKER", kind: "breaker", name: "속성 Breaker", emoji: "🔷", gold: 90000, note: "몬스터에게 속성을 추가(최대 3개)하거나 하나를 바꿉니다" },
    { id: "ITEM_WEAPON_BREAKER", kind: "breaker", name: "무기 Breaker", emoji: "⚔️", gold: 60000, note: "몬스터가 원래 못 배우는 무기 1개를 배울 때 사용" },
    { id: "ITEM_TRAIT_BREAKER", kind: "breaker", name: "특성 Breaker", emoji: "🧬", gold: 60000, note: "못 배우는 특성을 배우거나 특성을 바꿀 때 사용" },
    { id: "EMO_NATURE_BREAKER", kind: "breaker", name: "Nature Breaker", emoji: "🎭", gold: 40000, note: "몬스터의 성격을 원하는 성격으로 바꿉니다" }
];
export const EMO_ITEM = Object.fromEntries(EMO_ITEMS.map(i => [i.id, i]));
// EmoMonster evolution items / materials join the list from the catalog (price: rarity based)
// admin overrides (settings "maps" → emoAdmin): { offMons, offWeapons, offTraits: [ids], iPrice, wPrice, tPrice: { id: gold } }
export const emoAdmin = () => Store.maps?.emoAdmin || {};
const priced = (it, id) => { const g = emoAdmin().iPrice?.[id]; return g != null && it ? { ...it, gold: +g, pts: it.pts && g ? 0 : it.pts } : it; };
export const monOn = id => !(emoAdmin().offMons || []).map(String).includes(String(id));
export const weaponOn = id => !(emoAdmin().offWeapons || []).map(String).includes(String(id));
export const traitOn = id => !(emoAdmin().offTraits || []).map(String).includes(String(id));
export function emoItem(id) { return priced(baseItem(id), id); }
export function baseItem(id) {
    if (EMO_ITEM[id]) return { ...EMO_ITEM[id], src: C?.item[id] || null };
    const r = C?.item[id];
    if (!r) return null;
    const kind = r.category === "evolution" ? "evo" : r.category === "material" ? "material" : r.category === "ball" ? "ball" : "other";
    return { id, kind, name: r.name, emoji: kind === "evo" ? "✨" : kind === "material" ? "🧱" : "🎒", img: r.image, src: r,
        gold: kind === "evo" ? 40000 + (r.rarity || 1) * 10000 : 3000 + (r.rarity || 1) * 1500 };
}
export const evoItems = () => (C?.items || []).filter(i => i.category === "evolution").map(i => emoItem(i.id));
export const materials = () => (C?.items || []).filter(i => i.category === "material").map(i => emoItem(i.id));
export const itemPic = it => it?.img ? "emomon/" + String(it.img).replace(/^\.?\.?\//, "") : it?.src?.image ? itemImg(it.src) : "";

// monster weapons / traits as goods
export const weaponPriceBase = w => Math.round((4000 + (w.rarity || 1) * 4000 + (Number(w.power) || 0) * 150) / 100) * 100;
export const traitPriceBase = t => 10000 + (t.rarity || 1) * 10000;
export const weaponPrice = w => +(emoAdmin().wPrice?.[w.id] ?? weaponPriceBase(w));
export const traitPrice = t => +(emoAdmin().tPrice?.[t.id] ?? traitPriceBase(t));

// ---------------------------------------------------------------- 🔍 capture corners
// region flavour: the attributes that like to live there
const REGION_TYPES = {
    cl1: ["Normal", "Fire", "Water", "Grass", "Electric"], cl2: ["Normal", "Power", "Bug", "Earth", "Fire"],
    sky: ["Air", "Fly", "Angel", "Light"], space: ["Space", "Mind", "Light", "Robot"], fantasy: ["Magic", "Fairy", "Angel", "Light"],
    under: ["Earth", "Bug", "Ghost", "Steel"], spooky: ["Ghost", "Evil", "Abnormal"], deepsea: ["Water", "Ice", "Abnormal"],
    arctic: ["Ice", "Water", "Steel"], randomland: ["Abnormal", "Magic", "Mind"], richland: ["Light", "Steel", "Robot", "Angel"],
    noslot: ["Power", "Normal", "Earth"], nocasino: ["Water", "Grass", "Normal"], npcland: ["Robot", "Power", "Evil", "Steel"], combo: TYPE_LIST
};
const RICH_REGIONS = ["richland", "space", "deepsea", "sky", "fantasy", "combo"]; // rarer monsters more often
function seeded(str) {
    let h = 2166136261;
    for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const THEMES = {
    mono: "한 가지 속성의 몬스터들이 무리 지어 사는 곳",
    duo: "두 속성의 몬스터가 섞여 사는 곳",
    region: "이 지역의 대표 속성 몬스터들이 사는 곳",
    wild: "온갖 속성의 몬스터가 나타나는 곳"
};
let cfgCache = null;
// every capture map's config (cached until the catalog or the admin overrides change)
export function captureConfigs() {
    if (!C) return {};
    const key = (C.at || "") + JSON.stringify(Store.maps?.emoCapture || {}) + JSON.stringify(emoAdmin().offMons || []);
    if (cfgCache?.key === key) return cfgCache.list;
    const list = {};
    for (const loc of LOCATIONS) list[loc.id] = buildConfig(loc);
    // door rules: the richest / most varied third of the corners — top 20% pay 1,000G, next 15% random door
    const ranked = Object.values(list).sort((a, b) => b.score - a.score);
    ranked.forEach((c, i) => { if (!c.doorFixed) c.door = i < ranked.length * 0.2 ? "fee" : i < ranked.length * 0.35 ? "random" : "free"; });
    cfgCache = { key, list };
    return list;
}
export const captureConfig = loc => captureConfigs()[loc.id || loc] || null;
function buildConfig(loc) {
    const rnd = seeded("emo-capture-" + loc.id);
    const ov = Store.maps?.emoCapture?.[loc.id] || {};
    const regionTypes = REGION_TYPES[loc.region] || TYPE_LIST;
    const roll = rnd();
    const theme = ov.theme || (loc.region === "combo" ? "wild" : roll < 0.3 ? "mono" : roll < 0.6 ? "duo" : roll < 0.9 ? "region" : "wild");
    const pickT = list => list[Math.floor(rnd() * list.length)];
    let types = theme === "mono" ? [pickT(regionTypes)] : theme === "duo" ? [...new Set([pickT(regionTypes), pickT(regionTypes), pickT(TYPE_LIST)])].slice(0, 2) : theme === "region" ? regionTypes : TYPE_LIST;
    if (ov.types?.length) types = ov.types;
    const size = ov.size || 2 + Math.floor(rnd() * 14);   // 2 … 15
    const rich = RICH_REGIONS.includes(loc.region);
    const lt = types.map(t => t.toLowerCase());
    const fits = m => typesOfSpecies(m).some(t => lt.includes(String(t).toLowerCase()));
    // weight: commons first, rare ones a little more often in rich regions
    const w = m => (rich ? [0, 6, 5, 4, 3, 2, 1.5] : [0, 9, 6, 3, 1.5, 0.8, 0.4])[m.rarity || 1];
    const fromPool = (pool, n, got) => {
        pool = pool.filter(m => !got.includes(m));
        while (got.length < n && pool.length) {
            const tot = pool.reduce((a, m) => a + w(m), 0);
            let x = rnd() * tot, k = 0;
            for (; k < pool.length - 1; k++) { x -= w(pool[k]); if (x <= 0) break; }
            got.push(pool[k]); pool.splice(k, 1);
        }
        return got;
    };
    const base = C.base.filter(m => monOn(m.id));
    let mons = ov.mons?.length ? ov.mons.map(species).filter(m => m && monOn(m.id)) : fromPool(base.filter(fits), size, []);
    if (!ov.mons?.length && mons.length < 2) mons = fromPool(base, Math.max(2, size), mons); // too few of that attribute: fill up
    const chance = ov.chance || Math.round(30 + rnd() * 40);                // 30 … 70 %
    const distinct = new Set(mons.flatMap(typesOfSpecies)).size;
    const avgR = mons.reduce((a, m) => a + (m.rarity || 1), 0) / Math.max(1, mons.length);
    const maxR = Math.max(1, ...mons.map(m => m.rarity || 1));
    return { loc: loc.id, theme, themeText: THEMES[theme], types, mons: mons.map(m => m.id), chance, door: ov.door || "free", doorFixed: !!ov.door,
        score: avgR * 2 + maxR * 0.8 + distinct * 0.35 + mons.length * 0.05 };
}
// visual style of a corner: follows the map (crazy / evil / donation…) and its region
export function captureSkin(loc) {
    if (loc.crazy) return "crazy";
    if (loc.evil) return "evil";
    return { sky: "sky", space: "space", deepsea: "sea", arctic: "ice", spooky: "spooky", under: "cave", fantasy: "magic", richland: "gold", randomland: "random", npcland: "robot", combo: "combo", noslot: "grass", nocasino: "grass" }[loc.region] || "casino";
}

// ---------------------------------------------------------------- admin: copy EmoMonster → Gamblers
const TABLES = ["monsters", "weapons", "monster_traits", "monster_evolution", "monster_weapon_unlock", "game_items", "disease_types", "lab_recipes", "hospital_services"];
const DROP = new Set(["projectile_sprite_sheet", "projectile_frames", "hit_frames", "charge_frames", "trail_frames", "created_at"]);
const slim = row => Object.fromEntries(Object.entries(row).filter(([k, v]) => v !== null && !DROP.has(k)));
export async function syncFromEmoMonster(onStep = () => { }) {
    const pc = Store.publicClient();
    if (!pc || !Store.user) throw new Error("관리자 로그인이 필요합니다");
    const out = { syncedAt: new Date().toISOString() };
    for (const t of TABLES) {
        onStep(t);
        let rows = [], from = 0;
        for (;;) {
            const { data, error } = await pc.from(t).select("*").range(from, from + 999);
            if (error) throw new Error(`${t}: ${error.message}`);
            rows = rows.concat(data);
            if (data.length < 1000) break;
            from += 1000;
        }
        out[t] = rows.map(slim);
    }
    // survival-only / profile items are not needed here
    out.game_items = out.game_items.filter(i => !["style", "comment", "quest", "map"].includes(i.category) && i.effect_type !== "SURVIVAL");
    const saved = await Store.saveEmomon(out);
    index(saved);
    cfgCache = null;
    return { counts: Object.fromEntries(TABLES.map(t => [t, out[t].length])) };
}
