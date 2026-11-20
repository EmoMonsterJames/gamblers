// =====================================================================
// 🏷️ Game badges on the slot / casino game cards
//   🆕 NEW        — created in the 2 weeks up to the newest game: the most recently added slot / casino
//                   game sets the date, and every game created within 14 days before it (inclusive) gets NEW.
//   🔥 HOT        — top 30 most played of its kind (slots and casino games are ranked apart)
//   🔥 SUPER HOT  — top 10 most played of its kind
//                   Updated once a month: the ranking counts every play made BEFORE this month
//                   (finished seasons + the season in progress), so it stays the same all month.
// Plays: s.gamePlays / Store.gameplays.counts, keyed "<YYYY-MM>|slot:<id>" (game/season.js recordPlay:
// one slot spin / one casino play = 1). Unplayed games get no badge.
// =====================================================================
import { Store } from "../core/store.js";
import { GAME_DATES, MAP_DATES, GAME_DATE_DEFAULT } from "../data/gameDates.js";
import { SLOT_BY_ID } from "../slots/configs.js";
import { CASINO_BY_ID } from "../data/casino.js";

export const HOT_TOP = 30, SUPER_HOT_TOP = 10;
export const NEW_DAYS = 14;
const DAY = 86400000;
const day0 = s => new Date(s + "T00:00:00");

// "rs_<map>" / "rc_<map>" (and "_2", "_3" … for a map's 2nd, 3rd game) → the map's date
export function createdOf(id) {
    if (GAME_DATES[id]) return GAME_DATES[id];
    const m = /^r[sc]_(.+)$/.exec(id);
    if (m) return MAP_DATES[m[1]] || MAP_DATES[m[1].replace(/_\d+$/, "")] || GAME_DATE_DEFAULT;
    return GAME_DATE_DEFAULT;
}
// the creation date of the most recently added slot / casino game (hidden games skipped)
let latestCache = null;
export function latestGameDay() {
    if (latestCache) return latestCache;
    let max = "";
    for (const by of [SLOT_BY_ID, CASINO_BY_ID])
        for (const [id, g] of Object.entries(by)) { if (g?.off) continue; const c = createdOf(id); if (c > max) max = c; }
    return (latestCache = day0(max || GAME_DATE_DEFAULT));
}
// NEW = created within the 14 days up to the newest game: (latest − 14 days, latest]
export function isNew(id) {
    const d = day0(createdOf(id));
    if (isNaN(d)) return false;
    const up = latestGameDay();
    return d > new Date(up.getTime() - NEW_DAYS * DAY) && d <= up;
}
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
// plays made before this month: finished seasons + the season in progress (unless it was already added)
export function playCounts(now = new Date()) {
    const g = Store.gameplays || { counts: {}, seasons: [] }, s = Store.season, cur = monthKey(now), out = {};
    const add = obj => {
        for (const [k, n] of Object.entries(obj || {})) {
            const bar = k.indexOf("|"), month = bar < 0 ? "" : k.slice(0, bar), game = bar < 0 ? k : k.slice(bar + 1);
            if (month >= cur) continue; // this month's plays count from next month on
            out[game] = (out[game] || 0) + n;
        }
    };
    add(g.counts);
    if (s?.gamePlays && !(g.seasons || []).includes(s.number)) add(s.gamePlays);
    return out;
}
// kind: "slot" | "casino" → { <id>: rank (1 = most played) } for the games played at least once
let rankCache = null;
export function hotRanks(kind, now = new Date()) {
    const key = monthKey(now) + "|" + (Store.gameplays?.seasons || []).join(",") + "|" + (Store.season?.number ?? "");
    if (rankCache?.key !== key) rankCache = { key, by: {} };
    if (rankCache.by[kind]) return rankCache.by[kind];
    const pre = kind + ":";
    return (rankCache.by[kind] = Object.fromEntries(Object.entries(playCounts(now)).filter(([k, n]) => k.startsWith(pre) && n > 0)
        .sort((a, b) => b[1] - a[1]).map(([k], i) => [k.slice(pre.length), i + 1])));
}
// → "superhot" | "hot" | null
export function heat(rank) { return !rank ? null : rank <= SUPER_HOT_TOP ? "superhot" : rank <= HOT_TOP ? "hot" : null; }
