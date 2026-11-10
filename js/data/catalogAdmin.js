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
    PET_BY_ID, PETFX_BY_ID, WEAPON_BY_ID, FRAME_BY_ID, PEFFECT_BY_ID, ITEM_BY_ID
} from "./catalog.js";

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
export const WEAPON_ANIMS = ["punch", "shield", "tongue", "kick", "drop", "ghost", "ko", "orb", "sleep", "coin", "thunder", "fire", "storm"];
export const PET_ANIMS = ["bounce", "wobble", "wag", "hop", "walk", "fly", "prance"];
export const FX_MODES = ["float", "twinkle", "orbit", "wave", "rise", "jump", "rain", "fountain", "swoop", "firework"];
export const FRAME_STYLES = ["fr-silver", "fr-gold", "fr-neon", "fr-ice", "fr-fire", "fr-rainbow", "fr-bulbs", "fr-diamond", "fr-dragon", "fr-galaxy"];

// pristine copies of the built-in entries
const ORIGINAL = Object.fromEntries(Object.entries(CATS).map(([k, c]) => [k, c.list.map(e => structuredClone(e))]));
// default sale info from SHOPS
const BASE_SALE = {};
for (const [shopId, shop] of Object.entries(SHOPS)) for (const it of shop.list) BASE_SALE[`${it.cat}:${it.id}`] = { shop: shopId, price: it.price };

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
        locs: ed.locs || null,       // null = every location that has this shop
        off: !!ed.off,
        cur: SHOPS[ed.shop !== undefined ? ed.shop : base.shop]?.cur || "G"
    };
}

export function shopItems(shopId, locId) {
    const out = [];
    for (const cat of Object.keys(CATS)) {
        for (const e of CATS[cat].list) {
            const s = saleOf(cat, e.id);
            if (s.off || s.shop !== shopId || !s.price) continue;
            if (s.locs && locId && !s.locs.includes(locId)) continue;
            out.push({ cat, id: e.id, price: s.price });
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
