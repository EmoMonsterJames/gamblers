// =====================================================================
// 🎟️ Lotto corner — rules and state (screens/lotto.js draws it).
//
//  · 시즌 로또  : free, 6 slots, 100,000G. One try per round per player. Paid the moment
//                 all 6 slots are taken, or when a turn starts with 5 or fewer survivors.
//                 Paid once per season, then closed until the next season.
//  · 비시즌 로또 : 1,000G, 20 slots, 500,000G. One try per season. Runs across seasons
//                 until all 20 are taken. Random slot until 15 are taken, then PICK.
//  · 연금 로또  : 5,000G, 30 slots, 10,000G every round the winner plays (forever).
//                 Same rules as 비시즌, PICK after 25.
//  · Entering the registration room is 60% allowed / 40% refused.
//  · A random slot already holding someone → the try fails (🔄 등록자 교체권 can take it over).
//  · Shop items (season-only, ps.lotto): duplicate tickets, 🚫 slot block, 🔄 replacer.
//  · Off-season / pension reopen from the next round after a payout (next season when ≤ 3 survive).
// State: Store.lotto (persistent) + ps.lotto / s.lottoTried (this season).
// =====================================================================
import { Store } from "../core/store.js";
import * as G from "./season.js";

export const LOTTO = {
    season: { id: "season", name: "시즌 로또", emoji: "🎟️", size: 6, prize: 100000, fee: 0, maxOwn: 3, maxBlocks: 1, pickAt: null, dup: "lotto_dup_season", per: "round" },
    off: { id: "off", name: "비시즌 로또", emoji: "🌙", size: 20, prize: 500000, fee: 1000, maxOwn: 5, maxBlocks: 5, pickAt: 15, dup: "lotto_dup_off", per: "season" },
    pension: { id: "pension", name: "연금 로또", emoji: "🏦", size: 30, prize: 10000, fee: 5000, maxOwn: 5, maxBlocks: 5, pickAt: 25, dup: "lotto_dup_pension", per: "season", pension: true }
};
export const LOTTO_KINDS = ["season", "off", "pension"];
export const ENTRY_CHANCE = 0.6;
export const SEASON_DRAW_ALIVE = 5;

export const LOTTO_SHOP = [
    { id: "lotto_dup_season", emoji: "🎟️", name: "시즌 로또 중복 등록권", pts: 50, text: "시즌 로또에 한 번 더 등록할 수 있습니다 (연속 사용으로 최대 2번 중복 → 최대 3자리)" },
    { id: "lotto_dup_off", emoji: "🌙", name: "비시즌 로또 중복 등록권", pts: 200, text: "비시즌 로또에 한 번 더 등록할 수 있습니다 (최대 5자리)" },
    { id: "lotto_dup_pension", emoji: "🏦", name: "연금 로또 중복 등록권", pts: 500, text: "연금 로또에 한 번 더 등록할 수 있습니다 (최대 5자리)" },
    { id: "lotto_block", emoji: "🚫", name: "로또 등록 Slot Block권", gold: 30000, text: "원하는 빈자리 하나를 골라 막습니다. 막힌 자리는 등록된 것으로 치지만 당첨 후보에서는 빠집니다 (시즌 로또 1자리 · 비시즌/연금 최대 5자리)" },
    { id: "lotto_swap", emoji: "🔄", name: "등록자 교체권", gold: 50000, text: "랜덤 등록에서 다른 사람의 프로필이 걸렸을 때 그 자리를 내 프로필로 바꿉니다 (중복 등록권과 함께 사용 가능)" }
];
export const SHOP_BY_ID = Object.fromEntries(LOTTO_SHOP.map(x => [x.id, x]));

const S = () => G.S();
const rnd = n => Math.floor(Math.random() * n);

// ---------------------------------------------------------------- state
export function L() {
    const l = Store.lotto ||= {};
    const n = S()?.number ?? 0;
    if (!l.season || l.season.season !== n) l.season = { season: n, slots: Array(LOTTO.season.size).fill(null), drawn: null };
    for (const k of ["off", "pension"]) if (!l[k]) l[k] = { no: 1, slots: Array(LOTTO[k].size).fill(null), openAt: null };
    l.history ||= [];
    l.pensioners ||= {};
    return l;
}
export const save = () => Store.saveLotto();
export const board = kind => L()[kind];
export const items = pid => (S().ps[pid].lotto ||= {});
export const itemCount = (pid, id) => items(pid)[id] || 0;
const filled = kind => board(kind).slots.filter(Boolean).length;
export const ownCount = (kind, pid) => board(kind).slots.filter(x => x && !x.block && x.pid === pid).length;
export const blockCount = kind => board(kind).slots.filter(x => x?.block).length;
export const entries = kind => board(kind).slots.map((x, i) => x && !x.block ? { ...x, idx: i } : null).filter(Boolean);
export const pickMode = kind => LOTTO[kind].pickAt != null && filled(kind) >= LOTTO[kind].pickAt;
export const isFull = kind => filled(kind) >= LOTTO[kind].size;
export { filled };

// open / closed
export function status(kind) {
    const s = S(), b = board(kind);
    if (!s || s.status !== "turns" || !s.turn) return { open: false, why: "턴 진행 중에만 등록할 수 있습니다" };
    if (kind === "season") {
        if (b.drawn) return { open: false, paid: true, why: "로또가 이미 지급되었습니다" };
        return { open: true };
    }
    const o = b.openAt;
    if (o && (s.number < o.season || (s.number === o.season && s.round < o.round)))
        return { open: false, why: o.season > s.number ? `당첨금 지급 완료 — 시즌 ${o.season}부터 다시 열립니다` : `당첨금 지급 완료 — ROUND ${o.round}부터 다시 열립니다` };
    return { open: true };
}

// tried this round (season lotto) / this season (the other two)?
function triedKey(kind) { const s = S(); return LOTTO[kind].per === "round" ? `${kind}:${s.round}` : kind; }
const triedSet = kind => ((S().lottoTried ||= {})[triedKey(kind)] ||= {});
export const tried = (kind, pid) => !!triedSet(kind)[pid];

// can this player try now? → { ok, dup (a duplicate ticket is needed), why }
export function canTry(kind, pid) {
    const st = status(kind);
    if (!st.open) return { ok: false, why: st.why };
    const K = LOTTO[kind], own = ownCount(kind, pid);
    if (isFull(kind)) return { ok: false, why: "모든 자리가 찼습니다" };
    if (own >= K.maxOwn) return { ok: false, why: `한 사람은 최대 ${K.maxOwn}자리까지만 등록할 수 있습니다` };
    if (K.fee && S().ps[pid].money < K.fee) return { ok: false, why: `참가비 ${K.fee.toLocaleString()} G가 부족합니다` };
    if (!tried(kind, pid) && !own) return { ok: true, dup: false };
    const per = K.per === "round" ? "라운드" : "시즌";
    if (itemCount(pid, K.dup) > 0) return { ok: true, dup: true };
    return { ok: false, why: own ? `이미 등록되어 있습니다 — 중복 등록은 불가합니다 (${SHOP_BY_ID[K.dup].name} 필요)` : `이번 ${per}에 이미 등록을 시도했습니다 (${per}당 1회 · ${SHOP_BY_ID[K.dup].name}으로 추가 등록)` };
}

// start a try: marks it, uses the duplicate ticket if needed, rolls the room door (60 / 40)
export function beginTry(kind, pid) {
    const c = canTry(kind, pid);
    if (!c.ok) return null;
    if (c.dup) items(pid)[LOTTO[kind].dup]--;
    triedSet(kind)[pid] = true;
    const allowed = Math.random() < ENTRY_CHANCE;
    G.log(`${LOTTO[kind].emoji} ${G.name(pid)} ${LOTTO[kind].name} 등록실 ${allowed ? "입장" : "입장 거부"}${c.dup ? " (중복 등록권)" : ""}`);
    Store.saveSeason();
    return { allowed, dup: c.dup };
}

// the 등록 button: random slot (or the picked one in PICK mode) → { idx, ok, occupant }
export function register(kind, pid, pickIdx = null) {
    const K = LOTTO[kind], b = board(kind), ps = S().ps[pid];
    if (K.fee) { if (ps.money < K.fee) return null; ps.money -= K.fee; }
    let idx;
    if (pickMode(kind)) {
        if (pickIdx == null || b.slots[pickIdx]) { if (K.fee) ps.money += K.fee; return null; }
        idx = pickIdx;
    } else idx = rnd(K.size);
    const cur = b.slots[idx];
    if (!cur) {
        b.slots[idx] = { pid, season: S().number, round: S().round };
        G.log(`${K.emoji} ${G.name(pid)} ${K.name} ${idx + 1}번 자리 등록!`);
        save(); Store.saveSeason();
        return { idx, ok: true };
    }
    G.log(`${K.emoji} ${G.name(pid)} ${K.name} ${idx + 1}번 자리 — 이미 ${cur.block ? "막힌 자리" : "등록된 자리"}라 등록 실패`);
    save(); Store.saveSeason();
    return { idx, ok: false, occupant: cur };
}
// 🔄 replace another player's profile in that slot with mine
export function replace(kind, pid, idx) {
    const b = board(kind), cur = b.slots[idx];
    if (!cur || cur.block || cur.pid === pid || itemCount(pid, "lotto_swap") <= 0) return false;
    if (ownCount(kind, pid) >= LOTTO[kind].maxOwn) return false;
    items(pid).lotto_swap--;
    G.log(`🔄 ${G.name(pid)} ${LOTTO[kind].name} ${idx + 1}번 자리 ${G.name(cur.pid)} → 교체`);
    b.slots[idx] = { pid, season: S().number, round: S().round, swapped: cur.pid };
    save(); Store.saveSeason();
    return true;
}
// 🚫 block an empty slot
export function canBlock(kind, pid) {
    const st = status(kind);
    if (!st.open) return { ok: false, why: st.why };
    if (itemCount(pid, "lotto_block") <= 0) return { ok: false, why: "🚫 Slot Block권이 없습니다 (로또 상점)" };
    if (blockCount(kind) >= LOTTO[kind].maxBlocks) return { ok: false, why: `${LOTTO[kind].name}은(는) 최대 ${LOTTO[kind].maxBlocks}자리까지만 막을 수 있습니다` };
    if (isFull(kind)) return { ok: false, why: "빈자리가 없습니다" };
    return { ok: true };
}
export function block(kind, pid, idx) {
    if (!canBlock(kind, pid).ok || board(kind).slots[idx]) return false;
    items(pid).lotto_block--;
    board(kind).slots[idx] = { block: true, by: pid, season: S().number };
    G.log(`🚫 ${G.name(pid)} ${LOTTO[kind].name} ${idx + 1}번 자리 Block`);
    save(); Store.saveSeason();
    return true;
}

// shop
export function buy(pid, id) {
    const it = SHOP_BY_ID[id], ps = S().ps[pid];
    if (!it) return { ok: false };
    if (it.pts && ps.points < it.pts) return { ok: false, why: "포인트가 부족합니다" };
    if (it.gold && ps.money < it.gold) return { ok: false, why: "골드가 부족합니다" };
    if (it.pts) ps.points -= it.pts; else ps.money -= it.gold;
    items(pid)[id] = (items(pid)[id] || 0) + 1;
    G.log(`🛒 ${G.name(pid)} ${it.name} 구입`);
    Store.saveSeason();
    return { ok: true };
}

// ---------------------------------------------------------------- payouts
// alive in this season → straight into the purse · otherwise → wallet (added when they join a season)
function pay(pid, gold) {
    const s = S();
    if (s?.ps[pid] && !s.ps[pid].out) { s.ps[pid].money += gold; return "season"; }
    if (s?.sandbox) return "wallet";
    Store.wallets[pid] = (Store.wallets[pid] || 0) + gold;
    Store.saveWallets();
    return "wallet";
}
function record(kind, winner, extra = {}) {
    const s = S(), K = LOTTO[kind];
    L().history.unshift({ kind, season: s.number, round: s.round, no: kind === "season" ? s.number : board(kind).no, winner, amount: K.prize, at: new Date().toISOString(), entries: entries(kind).map(e => e.pid), ...extra });
    L().history = L().history.slice(0, 300);
    if (winner != null) Store.recordHighlight("lotto", { pid: winner, lotto: kind, name: K.name, emoji: K.emoji, amount: K.prize, entries: entries(kind).length });
}

// 시즌 로또 due? (all 6 taken, or a turn starts with ≤ 10 survivors)
export function seasonDue() {
    const s = S();
    if (!s || !["turns", "battle"].includes(s.status) || board("season").drawn) return false; // battle: drawn before the fight
    return isFull("season") || G.alive().length <= SEASON_DRAW_ALIVE;
}
// decide + pay at once (an interrupted show loses nothing) → { list: [{pid, idx}], winner, where }
export function drawSeason() {
    const s = S(), b = board("season");
    if (b.drawn) return null;
    const list = entries("season");
    const win = list.length ? list[rnd(list.length)] : null;
    const where = win ? pay(win.pid, LOTTO.season.prize) : null;
    b.drawn = { winner: win?.pid ?? null, idx: win?.idx ?? null, round: s.round, at: new Date().toISOString() };
    record("season", win?.pid ?? null);
    G.log(win ? `🎟️ 시즌 로또 당첨! ${G.name(win.pid)} +${LOTTO.season.prize.toLocaleString()}G${where === "wallet" ? " (다음 시즌 참가 시 수령)" : ""}` : "🎟️ 시즌 로또: 등록자가 없어 당첨자 없이 마감");
    save(); Store.saveSeason(true);
    return { list, winner: win, where };
}

// 비시즌 / 연금: 5 candidates → 2 out → 1 out → 1 of the last 2
export function drawBig(kind) {
    const s = S(), K = LOTTO[kind], b = board(kind);
    if (!isFull(kind)) return null;
    const list = entries(kind);
    const cands = [...list].sort(() => Math.random() - 0.5).slice(0, Math.min(5, list.length));
    const order = [...cands].sort(() => Math.random() - 0.5); // elimination order: the first ones go out first
    const n = cands.length;
    const winner = order[n - 1] || null;
    const final = order.slice(n - Math.min(2, n));
    const rest = order.slice(0, n - final.length);
    const out2 = rest.slice(-1), out1 = rest.slice(0, rest.length - out2.length);
    const where = winner ? pay(winner.pid, K.prize) : null;
    if (winner && K.pension) L().pensioners[winner.pid] = (L().pensioners[winner.pid] || 0) + 1;
    record(kind, winner?.pid ?? null, { cands: cands.map(c => c.pid) });
    G.log(winner ? `${K.emoji} ${K.name} 당첨! ${G.name(winner.pid)} +${K.prize.toLocaleString()}G${K.pension ? " (매 라운드 지급)" : ""}${where === "wallet" ? " (다음 시즌 참가 시 수령)" : ""}` : `${K.emoji} ${K.name}: 당첨자 없음 (모두 Block)`);
    // reset + reopen: the next round of this season — or the next season when ≤ 3 survive
    const slots = b.slots;
    b.no = (b.no || 1) + 1;
    b.slots = Array(K.size).fill(null);
    b.openAt = G.alive().length <= 3 ? { season: s.number + 1, round: 1 } : { season: s.number, round: s.round + 1 };
    save(); Store.saveSeason(true);
    return { slots, cands, out1, out2, final, winner, where };
}

// 🏦 pension: every round a pension winner plays, they get 10,000G per win
G.roundHooks.push(s => {
    if (s.sandbox) return;
    const P = L().pensioners;
    for (const pid of G.alive()) {
        const n = P[pid] || 0;
        if (!n) continue;
        s.ps[pid].money += LOTTO.pension.prize * n;
        G.log(`🏦 ${G.name(pid)} 연금 로또 연금 +${(LOTTO.pension.prize * n).toLocaleString()}G`);
    }
});

export const historyOf = kind => L().history.filter(r => r.kind === kind);
