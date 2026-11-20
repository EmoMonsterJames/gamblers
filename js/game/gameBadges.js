// =====================================================================
// 🏷️ Game badges on the slot / casino game cards
//   🆕 NEW        — created within the 2 weeks before the last NEW update. The NEW list is updated every
//                   2 weeks (NEW_ANCHOR, then every 14 days): a game added after an update gets its badge
//                   at the next update and keeps it for those 2 weeks.
//   🔥 HOT        — top 30 most played of its kind (slots and casino games are ranked apart)
//   🔥 SUPER HOT  — top 10 most played of its kind
//                   Updated once a month: the ranking counts every play made BEFORE this month
//                   (finished seasons + the season in progress), so it stays the same all month.
// Plays: s.gamePlays / Store.gameplays.counts, keyed "<YYYY-MM>|slot:<id>" (game/season.js recordPlay:
// one slot spin / one casino play = 1). Unplayed games get no badge.
// =====================================================================
import { Store } from "../core/store.js";
import { GAME_DATES, MAP_DATES, GAME_DATE_DEFAULT } from "../data/gameDates.js";

export const HOT_TOP = 30, SUPER_HOT_TOP = 10;
export const NEW_DAYS = 14;
export const NEW_ANCHOR = "2026-11-09"; // the first NEW update (a Monday) — then every 14 days
const DAY = 86400000;
const day0 = s => new Date(s + "T00:00:00");

// "rs_<map>" / "rc_<map>" (and "_2", "_3" … for a map's 2nd, 3rd game) → the map's date
export function createdOf(id) {
    if (GAME_DATES[id]) return GAME_DATES[id];
    const m = /^r[sc]_(.+)$/.exec(id);
    if (m) return MAP_DATES[m[1]] || MAP_DATES[m[1].replace(/_\d+$/, "")] || GAME_DATE_DEFAULT;
    return GAME_DATE_DEFAULT;
}
// the last NEW update day (every 14 days from NEW_ANCHOR) at or before now
export function newUpdateDay(now = new Date()) {
    const a = day0(NEW_ANCHOR), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const n = Math.max(0, Math.floor(Math.round((today - a) / DAY) / NEW_DAYS));
    return new Date(a.getTime() + n * NEW_DAYS * DAY);
}
// NEW = created in the 2 weeks up to the last update day: (update − 14 days, update]
export function isNew(id, now = new Date()) {
    const d = day0(createdOf(id));
    if (isNaN(d)) return false;
    const up = newUpdateDay(now);
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
