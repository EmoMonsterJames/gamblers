// =====================================================================
// Admin-editable game settings. The built-in definitions in
// slots/configs.js and data/casino.js are the defaults; Store.games holds
// the admin's changes:
//   slots:  { <slotId>: { off, px, feat: { <feature>: { p, off } }, meter: { p, off } } }
//   casino: { <gameId>: { off, rtp } }
//   casinoMaxWin: number
// applyGames() rewrites the live objects in place (SLOT_BY_ID / CASINO_BY_ID
// keep pointing at them), so every screen picks the changes up.
// A bonus that is switched off never triggers and its symbols stop landing.
// =====================================================================
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { SLOTS } from "../slots/configs.js";
import { CASINO_GAMES } from "./casino.js";

const ORIG_SLOTS = Object.fromEntries(SLOTS.map(s => [s.id, structuredClone(s)]));
const ORIG_CASINO = Object.fromEntries(CASINO_GAMES.map(g => { const c = structuredClone(g); delete c._t; return [g.id, c]; }));
const ORIG_MAX_WIN = CONFIG.CASINO_MAX_WIN;

export const FEATURE_LABEL = {
    free: "무료스핀", hold: "Hold & Spin", wheel: "휠 보너스", pick: "잭팟 픽 (3개 매칭)", grow: "GROW REELS",
    fall: "원숭이 떨어짐", column: "연속 코인 수집", nudge: "NUDGE"
};
export const METER_LABEL = { piggy: "피기 미터 (PIGGY BREAK)", fuse: "폭죽 퓨즈", bag: "금 주머니 (BAG BURST)", thermo: "온도계 3종", reelcoins: "클로버 코인 칸", jar: "항아리 미터" };

export const slotDefault = id => ORIG_SLOTS[id];
export const casinoDefault = id => ORIG_CASINO[id];
export const defaultMaxWin = () => ORIG_MAX_WIN;

// A fresh slot config with one slot's edits applied (also used by the RTP simulator)
export function buildSlot(id, ed = null) {
    const s = structuredClone(ORIG_SLOTS[id]);
    if (!ed) return s;
    if (+ed.px > 0) s.px = +ed.px;
    if (ed.off) s.off = true;
    for (const [k, fe] of Object.entries(ed.feat || {})) {
        const f = s.features?.[k];
        if (!f || !fe) continue;
        if (fe.p != null && fe.p !== "" && f.p != null) f.p = Math.max(0, +fe.p);
        if (fe.off) { f.off = true; if (f.p != null) f.p = 0; }
    }
    if (s.meter && ed.meter) {
        if (ed.meter.p != null && ed.meter.p !== "") s.meter.p = Math.max(0, +ed.meter.p);
        if (ed.meter.off) s.meter.off = true;
    }
    return s;
}
export function buildCasino(id, ed = null) {
    const g = structuredClone(ORIG_CASINO[id]);
    if (!ed) return g;
    if (+ed.rtp > 0) g.rtp = Math.min(0.995, Math.max(0.3, +ed.rtp));
    if (ed.off) g.off = true;
    return g;
}
function replace(target, fresh) {
    for (const k of Object.keys(target)) delete target[k];
    Object.assign(target, fresh);
}
export function applyGames() {
    const g = Store.games || {};
    for (const s of SLOTS) replace(s, buildSlot(s.id, g.slots?.[s.id]));
    for (const c of CASINO_GAMES) replace(c, buildCasino(c.id, g.casino?.[c.id]));
    CONFIG.CASINO_MAX_WIN = +g.casinoMaxWin > 0 ? +g.casinoMaxWin : ORIG_MAX_WIN;
}
