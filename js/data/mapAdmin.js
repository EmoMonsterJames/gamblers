// =====================================================================
// Admin-editable regions and maps. regions.js / catalog.js hold the
// defaults; Store.maps holds the admin's changes:
//   regions: { <regionId>: { off, name, need } }
//   locs:    { <locId>: { off, name, emoji, region, slots: [], casino: [],
//                         shops: [], job, npc, discount, beg, spell, earn: [], honor: [], req } }
//   honor:   { wheel: [prizes], box: [prizes] } — 🏅 Honorarium prizes (data/honor.js)
// applyMaps() rewrites REGIONS / LOCATIONS / LOC_BY_ID in place so every
// screen (roulettes, map, slotdex, shops) picks the changes up.
// =====================================================================
import { Store } from "../core/store.js";
import { REGIONS, LOCATIONS, LOC_BY_ID } from "./catalog.js";

const ORIG_REGIONS = REGIONS.map(r => structuredClone(r));
const ORIG_LOCS = LOCATIONS.map(l => structuredClone(l));
export const LOC_FIELDS = ["off", "name", "emoji", "region", "slots", "casino", "shops", "job", "npc", "discount", "beg", "spell", "earn", "honor", "req"];

export const regionDefault = id => ORIG_REGIONS.find(r => r.id === id);
export const locDefault = id => ORIG_LOCS.find(l => l.id === id);

export function applyMaps() {
    const { regions = {}, locs = {} } = Store.maps || {};
    for (const o of ORIG_REGIONS) {
        const cur = REGIONS.find(r => r.id === o.id);
        const next = { ...structuredClone(o), ...(regions[o.id] || {}) };
        if (!next.need) delete next.need;
        for (const k of Object.keys(cur)) delete cur[k];
        Object.assign(cur, next);
    }
    const fresh = ORIG_LOCS.map(l => {
        const e = locs[l.id] || {};
        const out = structuredClone(l);
        for (const f of LOC_FIELDS) if (e[f] !== undefined) out[f] = structuredClone(e[f]);
        if (out.req && !Object.keys(out.req).length) out.req = null;
        return out;
    });
    // keep the same objects (other modules hold references to LOCATIONS entries)
    for (const l of fresh) {
        const cur = LOCATIONS.find(x => x.id === l.id);
        if (cur) { for (const k of Object.keys(cur)) delete cur[k]; Object.assign(cur, l); }
        else LOCATIONS.push(l);
        LOC_BY_ID[l.id] = LOCATIONS.find(x => x.id === l.id);
    }
}

// which map(s) a slot / casino game lives in
export const slotHomes = id => LOCATIONS.filter(l => !l.off && l.slots?.includes(id));
export const casinoHomes = id => LOCATIONS.filter(l => !l.off && l.casino?.includes(id));
