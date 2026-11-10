// =====================================================================
// Season rules: roster, rounds, missions, turns, judging, elimination.
// Pure state changes on Store.season — screens call these and re-render.
// =====================================================================
import { CONFIG } from "../config.js";
import { Store } from "../core/store.js";
import { MISSIONS, JACKPOT_RANK, LOCATIONS, PET_BY_ID, PETFX_BY_ID, LOANS } from "../data/catalog.js";
import { shuffle } from "../core/util.js";

export const S = () => Store.season;

export function newSeason() {
    const number = (Store.seasonCount || 0) + 1;
    Store.seasonCount = number;
    Store.season = {
        number, status: "select", startedAt: new Date().toISOString(),
        roster: [], ps: {}, round: 0, mission: null, order: [], turnIdx: 0, turn: null,
        results: {}, candidates: [], history: [], log: []
    };
    Store.saveSeason(true);
    return Store.season;
}

export function selectionPool() {
    const s = S();
    const taken = new Set(s.roster);
    return Store.players.filter(p => !taken.has(p.id));
}
export function addToRoster(pid) {
    const s = S();
    if (s.roster.includes(pid) || s.roster.length >= CONFIG.SEASON_SIZE) return;
    s.roster.push(pid);
    s.ps[pid] = { money: CONFIG.START_MONEY, points: 0, hp: CONFIG.START_HP, pet: null, petEffect: null, weapons: [], items: {}, loanGold: 0, loan: null, use: { slot: 0, casino: 0 }, extra: { slot: 0, casino: 0 }, out: false, outRound: null, rank: null, totals: { slotNet: 0, casinoNet: 0, points: 0, spins: 0, plays: 0 } };
    log(`🎰 ${name(pid)} 참가 확정!`);
    Store.saveSeason();
}
export function rosterFull() { return S().roster.length >= Math.min(CONFIG.SEASON_SIZE, Store.players.length); }

export const alive = () => S().roster.filter(pid => !S().ps[pid].out);
export const name = pid => { const p = Store.player(pid); return p ? `${p.name_ko || p.player_name}` : "?"; };
export function log(msg) { const s = S(); if (!s) return; s.log.unshift({ t: Date.now(), msg }); s.log = s.log.slice(0, 200); }

// ---------------------------------------------------------------- rounds
export function tierForRound() {
    const s = S();
    const total = Math.max(1, s.roster.length - CONFIG.FINALISTS);
    const eliminated = s.roster.length - alive().length;
    return Math.min(4, Math.floor(eliminated * 5 / total));
}
export function startRound() {
    const s = S();
    s.round += 1;
    s.status = "mission";
    s.mission = null;
    s.results = {};
    s.candidates = [];
    s.turn = null;
    for (const pid of alive()) { const ps = s.ps[pid]; ps.use = { slot: 0, casino: 0 }; ps.extra = { slot: 0, casino: 0 }; }
    s.loanDeaths = s.round > 1 ? loanRoundTick() : [];
    if (alive().length <= CONFIG.FINALISTS) s.status = "final";
    Store.saveSeason(true);
}

// ---------------------------------------------------------------- play limits
export function playsLeft(pid, kind) {
    const ps = S().ps[pid];
    const base = kind === "slot" ? CONFIG.ROUND_SLOT_SPINS : CONFIG.ROUND_CASINO_PLAYS;
    return base + (ps.extra?.[kind] || 0) - (ps.use?.[kind] || 0);
}
export function addPlays(pid, kind, itemId, n) {
    const ps = S().ps[pid];
    if (!(ps.items[itemId] > 0)) return false;
    ps.items[itemId]--;
    (ps.extra ||= { slot: 0, casino: 0 })[kind] = (ps.extra[kind] || 0) + n;
    log(`➕ ${name(pid)} ${kind === "slot" ? `슬롯 ${n}회` : `카지노 ${n}회`} 추가권 사용`);
    Store.saveSeason();
    return true;
}
// Take a bet: loan gold is spent first, then normal gold.
export function spendBet(pid, kind, bet) {
    const ps = S().ps[pid];
    const fromLoan = Math.min(ps.loanGold || 0, bet);
    ps.loanGold = (ps.loanGold || 0) - fromLoan;
    ps.money -= bet - fromLoan;
    (ps.use ||= { slot: 0, casino: 0 })[kind] = (ps.use[kind] || 0) + 1;
}
export const playMoney = pid => { const ps = S().ps[pid]; return ps.money + (ps.loanGold || 0); };

// ---------------------------------------------------------------- loans
export function loanStatus(pid) {
    const s = S(), ps = s.ps[pid];
    if (ps.loan) return { ok: false, why: "이미 대출이 있습니다. 먼저 상환하세요." };
    if (alive().length < CONFIG.LOAN_MIN_ALIVE) return { ok: false, why: `생존자가 ${CONFIG.LOAN_MIN_ALIVE - 1}명 이하라 대출이 불가능합니다.` };
    if (ps.money + (ps.loanGold || 0) > CONFIG.LOAN_MAX_GOLD) return { ok: false, why: `보유 골드가 ${CONFIG.LOAN_MAX_GOLD.toLocaleString()}G 이하인 플레이어만 대출할 수 있습니다.` };
    return { ok: true };
}
export function takeLoan(pid, type, amount) {
    const s = S(), ps = s.ps[pid], L = LOANS[type];
    if (!loanStatus(pid).ok || !L.amounts.includes(amount)) return false;
    ps.loanGold = (ps.loanGold || 0) + amount;
    ps.loan = { type, principal: amount, owed: amount, round: s.round, due: s.round + L.rounds - 1 };
    log(`🏦 ${name(pid)} ${L.name} ${amount.toLocaleString()}G 대출 (${L.rounds}라운드 안에 상환)`);
    Store.saveSeason(true);
    return true;
}
// Repay from leftover loan gold first, then normal gold.
export function repayLoan(pid, amount) {
    const ps = S().ps[pid], loan = ps.loan;
    if (!loan) return 0;
    const pay = Math.max(0, Math.min(amount, loan.owed, (ps.loanGold || 0) + ps.money));
    const fromLoan = Math.min(ps.loanGold || 0, pay);
    ps.loanGold -= fromLoan;
    ps.money -= pay - fromLoan;
    loan.owed -= pay;
    if (loan.owed <= 0) { ps.loan = null; log(`✅ ${name(pid)} 대출 완납!`); }
    else log(`💸 ${name(pid)} 대출 ${pay.toLocaleString()}G 상환 (남은 빚 ${loan.owed.toLocaleString()}G)`);
    Store.saveSeason(true);
    return pay;
}
// New round: add interest, kill players whose deadline has passed.
function loanRoundTick() {
    const s = S(), dead = [];
    const overdue = [];
    for (const pid of alive()) {
        const loan = s.ps[pid].loan;
        if (!loan) continue;
        if (s.round > loan.due) overdue.push(pid);
        else loan.owed = Math.ceil(loan.owed * (1 + LOANS[loan.type].rate));
    }
    // never kill everyone: the smallest debt survives if all would die
    overdue.sort((a, b) => s.ps[b].loan.owed - s.ps[a].loan.owed);
    for (const pid of overdue) {
        if (alive().length <= 1) break;
        const rank = alive().length;
        Object.assign(s.ps[pid], { out: true, outRound: s.round, rank, hp: 0 });
        s.history.push({ round: s.round, loanDeath: true, eliminated: pid, rank });
        log(`☠️ ${name(pid)} 대출 미상환으로 사망 (${rank}위)`);
        dead.push(pid);
    }
    return dead;
}
export function missionsForTier(tier) { return MISSIONS.filter(m => m.tier === tier); }
export function setMission(m) {
    const s = S();
    s.mission = { ...m };
    s.turnIdx = 0;
    if (m.type === "battle") {
        s.status = "battle";
        s.order = [];
        s.battlePair = battlePair(m.rule);
        log(`📜 라운드 ${s.round} 미션: ${m.text} → ${s.battlePair.map(name).join(" vs ")}`);
    } else {
        s.status = "turns";
        s.order = shuffle(alive());
        log(`📜 라운드 ${s.round} 미션: ${m.text}`);
    }
    Store.saveSeason(true);
}

// ---------------------------------------------------------------- battle missions
export const rosterNo = pid => S().roster.indexOf(pid) + 1; // 1..20, the selection order
const BATTLE_GROUP = 4; // "the poorest / richest …" = the bottom / top 4
function battlePair(rule) {
    const s = S(), live = alive();
    const by = (key, dir) => [...live].sort((a, b) => dir * (s.ps[a][key] - s.ps[b][key])).slice(0, Math.min(BATTLE_GROUP, live.length));
    let pool = {
        even: live.filter(p => rosterNo(p) % 2 === 0),
        odd: live.filter(p => rosterNo(p) % 2 === 1),
        poor: by("money", 1), rich: by("money", -1),
        lowpts: by("points", 1), highpts: by("points", -1)
    }[rule] || live;
    if (pool.length < 2) pool = live;
    const pair = shuffle(pool).slice(0, 2);
    // richer one attacks first (tie → more points)
    return pair.sort((a, b) => (s.ps[b].money - s.ps[a].money) || (s.ps[b].points - s.ps[a].points));
}
export function finishBattle(winner, loser) {
    const s = S();
    s.candidates = [winner, loser];
    s.results = { [winner]: { pass: true, battle: true }, [loser]: { pass: false, battle: true } };
    log(`⚔️ 배틀 미션: ${name(winner)} 승리 (HP ${s.ps[winner].hp}), ${name(loser)} 패배`);
    eliminate(loser);
}

// ---------------------------------------------------------------- HP items
export function useHpItem(pid, itemId, amount) {
    const ps = S().ps[pid];
    if (!(ps.items[itemId] > 0)) return 0;
    if (ps.hp >= CONFIG.START_HP) return -1;
    const before = ps.hp;
    ps.hp = Math.min(CONFIG.START_HP, ps.hp + amount);
    ps.items[itemId]--;
    log(`🧪 ${name(pid)} HP ${before} → ${ps.hp}`);
    Store.saveSeason();
    return ps.hp - before;
}

// ---------------------------------------------------------------- money-making corner / begging
export const EARN_PER_SEASON = 2;
export const earnLeft = pid => EARN_PER_SEASON - (S().ps[pid].earnUsed || 0);
export function payEarn(pid, kind, gold, extra = {}) {
    const ps = S().ps[pid];
    ps.earnUsed = (ps.earnUsed || 0) + 1;
    ps.money += gold;
    if (extra.hp) ps.hp = Math.max(1, ps.hp - extra.hp);
    log(`💪 ${name(pid)} 돈벌기(${kind}) +${gold.toLocaleString()}G${extra.hp ? ` · HP -${extra.hp}` : ""}`);
    Store.saveSeason(true);
}
export const canBeg = pid => S().ps[pid].begRound !== S().round;
export function payBeg(pid, gold) {
    const s = S(), ps = s.ps[pid];
    ps.begRound = s.round;
    ps.money += gold;
    log(`🥺 ${name(pid)} 구걸 +${gold.toLocaleString()}G`);
    Store.saveSeason(true);
}

// ---------------------------------------------------------------- turns
export const currentPid = () => S().order[S().turnIdx];
export function startTurn() {
    const s = S();
    const pid = currentPid();
    s.turn = { pid, loc: null, remaining: CONFIG.TURN_SECONDS, running: false, ticket: false, stats: { slotNet: 0, casinoNet: 0, points: 0, bonus: 0, jackpot: null, spins: 0, plays: 0 } };
    Store.saveSeason();
    return s.turn;
}
export function canEnter(pid, loc) {
    const ps = S().ps[pid], p = Store.player(pid);
    const r = loc.req;
    if (!r) return { ok: true };
    if (r.points != null) return ps.points >= r.points ? { ok: true } : { ok: false, why: `${r.points}P 이상 필요` };
    if (r.country) {
        if (p.country === r.country) return { ok: true };
        if ((ps.items[r.pass] || 0) > 0) return { ok: true, pass: r.pass };
        return { ok: false, why: `${r.country} 국적 전용` };
    }
    return { ok: true };
}
export function accessibleLocations(pid) { return LOCATIONS.filter(l => canEnter(pid, l).ok); }
export function setLocation(locId) {
    const s = S(), t = s.turn;
    t.loc = locId;
    const loc = LOCATIONS.find(l => l.id === locId);
    const ce = canEnter(t.pid, loc);
    if (ce.pass) { s.ps[t.pid].items[ce.pass]--; log(`🎟️ ${name(t.pid)} 출입권 사용`); }
    log(`🗺️ ${name(t.pid)} → ${loc.name}`);
    Store.saveSeason();
}

// Record one slot spin / casino play for the current turn
export function recordPlay(kind, bet, win, points, extra = {}) {
    const s = S(), t = s.turn;
    if (!t) return;
    const ps = s.ps[t.pid];
    ps.money += win - (extra.free ? 0 : bet);
    ps.points += points;
    const net = win - (extra.free ? 0 : bet);
    if (kind === "slot") { t.stats.slotNet += net; t.stats.spins++; ps.totals.slotNet += net; ps.totals.spins++; }
    else { t.stats.casinoNet += net; t.stats.plays++; ps.totals.casinoNet += net; ps.totals.plays++; }
    t.stats.points += points; ps.totals.points += points;
    if (extra.bonus) t.stats.bonus++;
    for (const jp of extra.jackpots || []) if (!t.stats.jackpot || JACKPOT_RANK[jp] > JACKPOT_RANK[t.stats.jackpot]) t.stats.jackpot = jp;
    Store.saveSeason();
}

export function missionMet(m, st) {
    if (!m || !st) return false;
    switch (m.type) {
        case "bonus": return st.bonus > 0;
        case "slot_net": return st.slotNet >= m.v;
        case "casino_net": return st.casinoNet >= m.v;
        case "points": return st.points >= m.v;
        case "jackpot": return !!st.jackpot && JACKPOT_RANK[st.jackpot] >= JACKPOT_RANK[m.min];
    }
    return false;
}
export function missionProgress(m, st) {
    if (!m || !st) return { cur: 0, goal: 1, label: "" };
    switch (m.type) {
        case "bonus": return { cur: Math.min(1, st.bonus), goal: 1, label: st.bonus ? "보너스 달성!" : "보너스 0회" };
        case "slot_net": return { cur: st.slotNet, goal: m.v, label: `${Math.round(st.slotNet).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "casino_net": return { cur: st.casinoNet, goal: m.v, label: `${Math.round(st.casinoNet).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "points": return { cur: st.points, goal: m.v, label: `${st.points} / ${m.v} P` };
        case "jackpot": return { cur: missionMet(m, st) ? 1 : 0, goal: 1, label: st.jackpot ? `최고 잭팟: ${st.jackpot}` : "잭팟 없음" };
    }
}
export function useMissionPass() {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    if (!(ps.items.mission_pass > 0) || t.ticket) return false;
    ps.items.mission_pass--; t.ticket = true;
    log(`🎫 ${name(t.pid)} 미션완료권 사용!`);
    Store.saveSeason();
    return true;
}
export function endTurn() {
    const s = S(), t = s.turn;
    if (!t) return;
    const pass = t.ticket || missionMet(s.mission, t.stats);
    s.results[t.pid] = { stats: t.stats, pass, ticket: t.ticket, loc: t.loc };
    log(`${pass ? "✅" : "❌"} ${name(t.pid)} 턴 종료 — 미션 ${pass ? "성공" : "실패"}`);
    s.turn = null;
    s.turnIdx++;
    if (s.turnIdx >= s.order.length) judge();
    Store.saveSeason(true);
}
export function skipTurnOf(pid) { // player who can't play (e.g. admin skip) counts as fail
    const s = S();
    s.results[pid] = { stats: { slotNet: 0, casinoNet: 0, points: 0, bonus: 0, jackpot: null }, pass: false, skipped: true };
}

// ---------------------------------------------------------------- judging
function judge() {
    const s = S();
    s.status = "judge";
    let cands = s.order.filter(pid => !s.results[pid]?.pass);
    s.allPassed = cands.length === 0;
    if (!cands.length) {
        // everybody passed: the 3 lowest earners of the round become candidates
        const net = pid => { const st = s.results[pid].stats; return st.slotNet + st.casinoNet; };
        cands = [...s.order].sort((a, b) => net(a) - net(b)).slice(0, Math.min(3, s.order.length - 1));
    }
    s.candidates = cands;
    log(`⚖️ 탈락 후보 ${cands.length}명: ${cands.map(name).join(", ")}`);
}
export function eliminate(pid) {
    const s = S();
    const rank = alive().length;
    Object.assign(s.ps[pid], { out: true, outRound: s.round, rank, hp: 0 });
    s.history.push({ round: s.round, mission: s.mission, candidates: [...s.candidates], eliminated: pid, rank });
    log(`💀 ${name(pid)} 탈락 (${rank}위)`);
    s.lastEliminated = pid;
    s.status = alive().length <= CONFIG.FINALISTS ? "final" : "eliminated";
    Store.saveSeason(true);
}

// ---------------------------------------------------------------- final
export function finalists() {
    const s = S();
    const worth = pid => s.ps[pid].money - (s.ps[pid].loan?.owed || 0);
    return alive().sort((a, b) => (worth(b) - worth(a)) || (s.ps[b].points - s.ps[a].points));
}
export async function crown(winnerId, snapshot) {
    const s = S();
    const loser = alive().find(p => p !== winnerId);
    s.ps[winnerId].rank = 1;
    if (loser != null) { s.ps[loser].rank = 2; s.ps[loser].out = true; s.ps[loser].outRound = s.round; }
    s.status = "done";
    s.winnerId = winnerId;
    s.endedAt = new Date().toISOString();
    log(`👑 시즌 ${s.number} 우승: ${name(winnerId)}!`);
    const ranks = Object.fromEntries(s.roster.map(pid => [pid, s.ps[pid].rank]));
    await Store.finishSeason(s, ranks, snapshot);
}

// ---------------------------------------------------------------- luck
export function luckOf(pid) {
    const ps = S()?.ps[pid];
    if (!ps) return { win: 0, bonus: 0, pct: 0, bonusPct: 0 };
    const pet = ps.pet ? PET_BY_ID[ps.pet] : null;
    const fx = ps.petEffect ? PETFX_BY_ID[ps.petEffect] : null;
    let win = 0, bonus = 0;
    if (pet) { win += pet.boost; if (pet.kind === "special") bonus += pet.boost; }
    if (fx && pet) { win += fx.boost; if (fx.kind === "special") bonus += fx.boost; }
    win = Math.min(30, win); bonus = Math.min(30, bonus);
    return { win: win / 100, bonus: bonus / 100, pct: win, bonusPct: bonus };
}
