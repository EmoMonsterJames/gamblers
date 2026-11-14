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
    CAPTURES_PER_ROUND: 3,       // 🔍 Find presses per player per round
    BOT_ID: 219,                 // EmoMon Battlebot fights for a player without monsters
    BOT_ACC: 30,                 // its two weapons hit only 30%
    LEVEL: 50,                   // EmoMonster has no levels any more: stats are always taken at Lv 50
    HP: 100,                     // every monster has 100 HP
    RELEASE_PTS: 455,            // 몬스터 Release 권 (only usable with all 3 slots full)
    SHOP_BUYS: 5,                // 🛒 Monster Shop purchases per player per season (all shops together)
    LAB_BUYS: 3,                 // 🧪 LAB 상점 purchases per player per season
    EVOLVE_PTS: 100,             // every evolution costs 100P (plus its items)
    // 🔬 Lab experiments: price + the breaker it needs
    EXP: {
        nature: { gold: 20000, item: "EMO_NATURE_BREAKER" },
        weapon: { gold: 50000, item: "ITEM_WEAPON_BREAKER" },
        type: { gold: 1000000, item: "EMO_TYPE_BREAKER" },
        trait: { pts: 1000, item: "ITEM_TRAIT_BREAKER" },
        special: { pts: 1000 }
    },
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
// balls: `rate` = catch chance in % (an attribute ball: `rate` on its attribute, `rateOff` on others)
    { id: "ITEM001", kind: "ball", name: "몬스터볼", en: "Monster Ball", emoji: "🔴", rate: 5, gold: 3000, img: "images/icons/balls/monster.svg", note: "포획 확률 5%" },
    { id: "ITEM002", kind: "ball", name: "Super Ball", emoji: "🔵", rate: 10, gold: 8000, img: "images/icons/balls/super.svg", note: "포획 확률 10%" },
    { id: "ITEM003", kind: "ball", name: "Hyper Ball", emoji: "🟡", rate: 30, gold: 20000, img: "images/icons/balls/hyper.svg", note: "포획 확률 30%" },
    { id: "ITEM008", kind: "ball", name: "Crazy Ball", emoji: "🌀", rate: 70, gold: 30000, img: "images/icons/balls/crazy.svg", note: "포획 확률 70%" },
    { id: "ITEM004", kind: "ball", name: "Master Ball", emoji: "🟣", rate: 100, pts: 300, img: "images/icons/balls/master.svg", note: "무조건 잡힙니다" },
    { id: "BALL_DUNG", kind: "ball", name: "Dung Ball", emoji: "💩", rate: 1, gold: 500, img: "images/icons/g/dung_ball.svg", note: "똥 모양 볼 · 포획 확률 1%" },
    // Repeat Ball: 5% on the first throw at a monster, +5% each further Repeat Ball at the same monster, up to 50% (10th throw on)
    { id: "BALL_REPEAT", kind: "ball", name: "Repeat Ball", emoji: "🔁", rate: 5, repeat: { step: 5, max: 50 }, gold: 15000, img: "images/icons/g/repeat_ball.svg", note: "처음 5% · 같은 몬스터에 던질 때마다 +5% (10번째부터 최대 50%)" },
    // 📡 radars: used with 📡 Scan in a Capture corner instead of Find (one Capture try) — monster chance +boost% for that scan
    { id: "RADAR_1", kind: "radar", name: "Monster Radar", emoji: "📡", boost: 10, gold: 50000, img: "images/icons/g/radar.svg", note: "Capture에서 Scan — 몬스터 출현 확률 +10%" },
    { id: "RADAR_2", kind: "radar", name: "Super Monster Radar", emoji: "📡", boost: 30, gold: 200000, img: "images/icons/g/radar_super.svg", note: "Capture에서 Scan — 몬스터 출현 확률 +30%" },
    { id: "RADAR_3", kind: "radar", name: "Mega Monster Radar", emoji: "📡", boost: 50, pts: 300, img: "images/icons/g/radar_mega.svg", note: "Capture에서 Scan — 몬스터 출현 확률 +50%" },
    { id: "RADAR_4", kind: "radar", name: "Legendary Monster Radar", emoji: "🌟", boost: 100, pts: 1000, img: "images/icons/g/radar_legend.svg", note: "Capture에서 Scan — 이모몬스터 1마리가 무조건 바로 등장" },
    ...TYPE_LIST.map(t => ({ id: "BALL_" + t.toUpperCase(), kind: "ball", name: `${t} Ball`, emoji: "⚪", attr: t, rate: 45, rateOff: 5, gold: 9000, img: `images/icons/balls/attr_${t.toLowerCase()}.svg`, note: `${t} 속성 몬스터 포획 확률 45% (다른 몬스터는 5%)` })),
    { id: "EMO_HP10", kind: "potion", name: "몬스터 HP 약 +10", emoji: "🧪", hp: 10, gold: 7940 },
    { id: "EMO_HP50", kind: "potion", name: "몬스터 HP 약 +50", emoji: "💉", hp: 50, gold: 32670 },
    { id: "EMO_HPFULL", kind: "potion", name: "몬스터 FULL HP 약", emoji: "❤️‍🩹", hp: "full", gold: 68230 },
    { id: "EMO_PP", kind: "pp", name: "PP 회복약", emoji: "🔋", gold: 12000, note: "몬스터 1마리의 모든 무기 PP를 가득 채웁니다 (PP는 배틀이 끝나도 회복되지 않습니다)" },
    { id: "EMO_CURE", kind: "cure", name: "몬스터 만능 치료제", emoji: "💊", gold: 36780, note: "질병 · 상태이상을 모두 치료합니다 (HP는 그대로)" },
    { id: "EMO_WEAPON_DEL", kind: "delete", name: "몬스터 무기 삭제권", emoji: "🗑️", gold: 167830 },
    { id: "EMO_MON_DEL", kind: "delete", name: "몬스터 Release 권", emoji: "🚮", pts: 455, note: "몬스터 3마리가 꽉 찼을 때만 사용 — 1마리를 놓아 주어 슬롯을 엽니다" },
    // breakers: only from LAB 조합 (never sold)
    { id: "EMO_TYPE_BREAKER", kind: "breaker", name: "속성 Breaker", emoji: "🔷", noSale: true, note: "🔬 LAB 실험실에서 몬스터 속성을 바꾸거나 추가할 때 필요 (LAB 조합으로만 얻음)" },
    { id: "ITEM_WEAPON_BREAKER", kind: "breaker", name: "무기 Breaker", emoji: "⚔️", noSale: true, img: "images/icons/g/weapon_breaker.svg", note: "🔬 LAB 실험실에서 못 배우는 무기를 가르칠 때 필요 (LAB 조합으로만 얻음)" },
    { id: "ITEM_TRAIT_BREAKER", kind: "breaker", name: "특성 Breaker", emoji: "🧬", noSale: true, note: "🔬 LAB 실험실에서 특성을 바꾸거나 배울 때 필요 (LAB 조합으로만 얻음)" },
    { id: "EMO_NATURE_BREAKER", kind: "breaker", name: "Nature Breaker", emoji: "🎭", noSale: true, note: "🔬 LAB 실험실에서 몬스터 성격을 바꿀 때 필요 (LAB 조합으로만 얻음)" }
];
export const EMO_ITEM = Object.fromEntries(EMO_ITEMS.map(i => [i.id, i]));
// lab-only results (never sold in any shop)
export const LAB_ONLY = new Set(["EMO_TYPE_BREAKER", "ITEM_WEAPON_BREAKER", "ITEM_TRAIT_BREAKER", "EMO_NATURE_BREAKER", "ITEM_BANANA_SMOOTHIE"]);
// admin overrides (settings "maps" → emoAdmin): { offMons, offWeapons, offTraits: [ids], iPrice, wPrice, tPrice: { id: price },
//   specialEvo: { evolutionId: true|false } (special = only in the 🔬 실험실) }. A price is a number (gold) or "500P" (points).
export const emoAdmin = () => Store.maps?.emoAdmin || {};
export const parsePrice = v => { if (v == null || v === "") return null; const s = String(v).trim().toUpperCase(); return s.endsWith("P") ? { gold: 0, pts: Math.max(0, parseInt(s) || 0) } : { gold: Math.max(0, +s || 0), pts: 0 }; };
export const priceText = p => p ? (p.pts ? `${p.pts}P` : String(p.gold)) : "";
const priced = (it, id) => { const p = parsePrice(emoAdmin().iPrice?.[id]); return p && it ? { ...it, ...p } : it; };
export const monOn = id => !(emoAdmin().offMons || []).map(String).includes(String(id));
export const weaponOn = id => !(emoAdmin().offWeapons || []).map(String).includes(String(id));
export const traitOn = id => !(emoAdmin().offTraits || []).map(String).includes(String(id));
export function emoItem(id) { return priced(baseItem(id), id); }
// LAB prices: orbs = gold (+100,000G) · other evolution items = 500~1000P · materials +30,000G and up
const MAT_PRICE = {
    MAT_VAMPIRE_BLOOD: { add: 50000 }, MAT_VAMPIRE_FANG: { add: 50000 },
    MAT_MONSTER_BLOOD: { add: 100000 }, MAT_MONSTER_HAIR: { add: 100000 }, MAT_MONSTER_TOOTH: { add: 100000 }, MAT_MONSTER_NAIL: { add: 100000 }, MAT_MONSTER_CLAW: { add: 100000 },
    MIX_MONSTER_EYEBALL: { pts: 500 }, MAT_MONSTER_DNA: { pts: 800 }, MAT_DEFORMED_DNA: { pts: 1000 }
};
export const isOrb = r => /\borb\b/i.test(r?.name || "");
// Gamblers' own pictures for some EmoMonster items (emomon/images/icons/g/)
const ART = {
    ITEM_EVO_ORB: "evo_orb", ITEM_BANANA: "banana", ITEM_SUGAR: "sugar", ITEM_MILK: "milk", MAT_MONSTER_NAIL: "dragon_claw",
    MAT_BAY_LEAF: "bay_leaf", ITEM_BANANA_SMOOTHIE: "banana_smoothie", ITEM_EVO_HERB: "magic_herb", ITEM_EVO_PEARL: "ocean_pearl"
};
const artOf = id => ART[id] ? `images/icons/g/${ART[id]}.svg` : null;
export function baseItem(id) {
    if (EMO_ITEM[id]) return { ...EMO_ITEM[id], src: C?.item[id] || null };
    const r = C?.item[id];
    if (!r) return null;
    const kind = r.category === "evolution" ? "evo" : r.category === "material" ? "material" : r.category === "ball" ? "ball" : "other";
    const R = r.rarity || 1;
    let gold = 0, pts = 0;
    if (kind === "evo") { if (isOrb(r)) gold = 140000 + R * 10000; else pts = Math.min(1000, Math.max(500, 500 + (R - 2) * 150)); }
    else if (kind === "material") { const m = MAT_PRICE[id]; if (m?.pts) pts = m.pts; else gold = 3000 + R * 1500 + (m?.add || 30000); }
    else gold = 3000 + R * 1500;
    return { id, kind, name: r.name, emoji: kind === "evo" ? "✨" : kind === "material" ? "🧱" : "🎒", img: artOf(id) || r.image, src: r, gold, pts, orb: kind === "evo" && isOrb(r), noSale: LAB_ONLY.has(id) };
}
export const evoItems = () => (C?.items || []).filter(i => i.category === "evolution").map(i => emoItem(i.id));
export const materials = () => (C?.items || []).filter(i => i.category === "material").map(i => emoItem(i.id));
export const itemPic = it => it?.img ? "emomon/" + String(it.img).replace(/^\.?\.?\//, "") : it?.src?.image ? itemImg(it.src) : "";

// monster weapons / traits as goods: weapons ≥100,000G, traits ≥200,000G; strong ones cost 300~1000P
export const weaponScore = w => (Number(w.power) || 0) * (w.accuracy ?? 100) / 100;
export function weaponPriceBase(w) {
    const sc = weaponScore(w);
    if (sc >= 45) return { gold: 0, pts: Math.min(1000, Math.round((300 + (sc - 45) * 28) / 50) * 50) };
    return { gold: Math.round((100000 + (w.rarity || 1) * 10000 + sc * 1500) / 1000) * 1000, pts: 0 };
}
export function traitPriceBase(t) {
    const r = t.rarity || 1;
    if (r >= 4) return { gold: 0, pts: [0, 0, 0, 0, 300, 600, 1000][r] };
    return { gold: 200000 + (r - 1) * 50000, pts: 0 };
}
export const weaponPrice = w => parsePrice(emoAdmin().wPrice?.[w.id]) || weaponPriceBase(w);
export const traitPrice = t => parsePrice(emoAdmin().tPrice?.[t.id]) || traitPriceBase(t);

// ---------------------------------------------------------------- 🛒 shop stock (fixed per map, admin can edit)
// Monster Shop: every shop sells its own 2 attribute balls, 2~3 weapons and 1~2 traits (no two shops alike).
// LAB 상점: up to 5 orbs, 5 materials and 5 other evolution items per Lab map.
// Admin overrides: settings "maps".emoShop[locId] = { balls, weapons, traits } · .emoLabShop[locId] = { items }
const shuffleSeed = (list, key) => { const r = seeded(key), a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let stockCache = null;
function autoStock() {
    const key = (C?.at || "") + JSON.stringify([emoAdmin().offWeapons, emoAdmin().offTraits]) + LOCATIONS.filter(l => l.emoshop).map(l => l.id) + LOCATIONS.filter(l => l.lab).map(l => l.id);
    if (stockCache?.key === key) return stockCache;
    const shops = LOCATIONS.filter(l => l.emoshop), labs = LOCATIONS.filter(l => l.lab);
    const out = { key, shop: {}, lab: {} };
    // attribute balls: first round every shop gets 2 new ones; when they run out, new pairs (never the same pair twice)
    const balls = shuffleSeed(TYPE_LIST.map(t => "BALL_" + t.toUpperCase()), "emo-balls");
    const n = balls.length, half = Math.floor(n / 2);
    shops.forEach((l, i) => { const k = i % half, lap = Math.floor(i / half); out.shop[l.id] = { balls: [balls[(2 * k) % n], balls[(2 * k + 1 + lap * 2) % n]] }; });
    const ws = shuffleSeed((C?.weapons || []).filter(w => !(w.allowed_monster_ids || []).map(Number).includes(EMO.BOT_ID) && w.attribute && weaponOn(w.id)).map(w => w.id), "emo-weapons");
    const ts = shuffleSeed((C?.traits || []).filter(t => traitOn(t.id)).map(t => t.id), "emo-traits");
    let wi = 0, ti = 0;
    for (const l of shops) {
        const r = seeded("emo-shop-" + l.id);
        const nw = 2 + (r() < 0.5 ? 1 : 0), nt = 1 + (r() < 0.5 ? 1 : 0);
        out.shop[l.id].weapons = ws.slice(wi, wi + nw); wi += nw;
        out.shop[l.id].traits = ts.slice(ti, ti + nt); ti += nt;
    }
    const items = C?.items || [];
    const orbs = shuffleSeed(items.filter(i => i.category === "evolution" && isOrb(i)).map(i => i.id), "emo-orbs");
    const evo = shuffleSeed(items.filter(i => i.category === "evolution" && !isOrb(i) && !LAB_ONLY.has(i.id)).map(i => i.id), "emo-evo");
    const mats = shuffleSeed(items.filter(i => i.category === "material").map(i => i.id), "emo-mats");
    const take = (list, start, k) => Array.from({ length: Math.min(k, list.length) }, (_, j) => list[(start + j) % list.length]);
    let oi = 0, ei = 0, mi = 0;
    for (const l of labs) {
        const r = seeded("emo-lab-" + l.id);
        const no = 2 + Math.floor(r() * 3), ne = 1 + Math.floor(r() * 2), nm = 3 + Math.floor(r() * 3); // orbs 2~4 · others 1~2 · materials 3~5
        out.lab[l.id] = { items: [...take(orbs, oi, no), ...take(evo, ei, ne), ...take(mats, mi, nm)] };
        oi += no; ei += ne; mi += nm;
    }
    stockCache = out;
    return out;
}
// everyday goods every Monster Shop sells unless the admin changes that shop's list
export const SHOP_GENERAL_KINDS = ["ball", "potion", "pp", "cure", "delete", "radar"];
export const shopGeneral = () => EMO_ITEMS.filter(i => SHOP_GENERAL_KINDS.includes(i.kind) && !i.attr && !i.noSale).map(i => i.id);
export function shopStock(locId) {
    const auto = autoStock().shop[locId] || { balls: [], weapons: [], traits: [] };
    const ov = Store.maps?.emoShop?.[locId] || {};
    return { items: ov.items ?? shopGeneral(), balls: ov.balls ?? auto.balls, weapons: ov.weapons ?? auto.weapons, traits: ov.traits ?? auto.traits, price: ov.price || {}, auto, ov };
}
export function labStock(locId) {
    const auto = autoStock().lab[locId] || { items: [] };
    const ov = Store.maps?.emoLabShop?.[locId] || {};
    return { items: (ov.items ?? auto.items).filter(id => !LAB_ONLY.has(id)), price: ov.price || {}, auto, ov };
}
// a price set for one shop only (admin 🛒 재고 · 가격): key "i:ID" item · "w:ID" weapon · "t:ID" trait.
// Without one, the admin's global price (iPrice / wPrice / tPrice) is used.
export function stockPrice(locId, shop, key, base) {
    const map = shop === "lab" ? Store.maps?.emoLabShop?.[locId]?.price : Store.maps?.emoShop?.[locId]?.price;
    return parsePrice(map?.[key]) || base;
}

// ---------------------------------------------------------------- ⚗️ LAB recipes (EmoMonster's + Gamblers' own)
// cost: { gold, pts }. Nature / Type Breaker are Gamblers recipes; Weapon Breaker uses new ingredients;
// every other recipe costs 100,000G.
const G_RECIPES = [
    { id: "g_nature", name: "Nature Breaker", result_item_id: "EMO_NATURE_BREAKER", result_qty: 1, ingredients: [{ id: "MAT_MONSTER_NAIL", qty: 1 }, { id: "MAT_MINERAL", qty: 1 }], gold: 24560, pts: 0 },
    { id: "g_type", name: "Type Breaker (속성 Breaker)", result_item_id: "EMO_TYPE_BREAKER", result_qty: 1, ingredients: [{ id: "MAT_DEFORMED_DNA", qty: 1 }, { id: "MIX_CRYSTAL", qty: 1 }, { id: "MIX_MONSTER_EYEBALL", qty: 1 }], gold: 0, pts: 300 }
];
const R_FIX = { ITEM_WEAPON_BREAKER: { ingredients: [{ id: "MAT_MONSTER_DNA", qty: 1 }, { id: "MIX_BOTTLED_WATER", qty: 1 }, { id: "MAT_MONSTER_CLAW", qty: 1 }], gold: 205700, pts: 0 } };
export function labRecipes() {
    const base = (C?.recipes || []).filter(r => baseItem(r.result_item_id)).map(r => ({ ...r, gold: 100000, pts: 0, ...(R_FIX[r.result_item_id] || {}) }));
    return [...G_RECIPES.filter(g => !base.some(b => b.result_item_id === g.result_item_id)), ...base];
}
// special evolutions only happen in the 🔬 실험실 (needs a weapon / two items, or picked by the admin)
export const specialEvoAuto = e => !!(e.required_weapon_id || e.required_item2_id);
export const isSpecialEvo = e => { const o = emoAdmin().specialEvo?.[e.id]; return o != null ? !!o : specialEvoAuto(e); };

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
    // shown attributes + description follow the monsters that really appear here (most common first)
    const tally = {};
    for (const m of mons) for (const t of typesOfSpecies(m)) tally[t] = (tally[t] || 0) + 1;
    const real = Object.keys(tally).sort((a, b) => tally[b] - tally[a]);
    if (real.length) types = real;
    const tn = types.slice(0, 3).join(" · ") + (types.length > 3 ? ` 외 ${types.length - 3}개` : "");
    const rare = maxR >= 5 ? " 아주 드물게 ★" + maxR + " 몬스터도 나타납니다." : maxR >= 3 ? ` 가끔 ★${maxR} 몬스터도 보입니다.` : " 흔한 몬스터들이 주로 나옵니다.";
    const themeText = (types.length === 1 ? `${tn} 속성 몬스터 ${mons.length}종이 무리 지어 사는 곳.` : types.length === 2 ? `${tn} 속성 몬스터 ${mons.length}종이 섞여 사는 곳.`
        : `${types.length}가지 속성(${tn}) 몬스터 ${mons.length}종이 나타나는 곳.`) + rare;
    return { loc: loc.id, theme, themeText, types, mons: mons.map(m => m.id), chance, door: ov.door || "free", doorFixed: !!ov.door,
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
