// =====================================================================
// Season rules: roster, rounds, missions, turns, judging, elimination.
// Pure state changes on Store.season — screens call these and re-render.
// =====================================================================
import { CONFIG } from "../config.js";
import { Store } from "../core/store.js";
import { MISSIONS, ALPHABET, brandKey, JACKPOT_RANK, LOCATIONS, LOC_BY_ID, PET_BY_ID, PETFX_BY_ID, LOANS, REGIONS, ITEM_BY_ID, SHOP_LIMIT, passIdOf, cardId } from "../data/catalog.js";
import { shuffle, pick } from "../core/util.js";
import { sandboxNextTurn } from "./sandbox.js";

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
    s.ps[pid] = { money: CONFIG.START_MONEY, points: 0, hp: CONFIG.START_HP, pet: null, petEffect: null, weapons: [], items: {}, loanGold: 0, loan: null, use: { slot: 0, casino: 0 }, extra: { slot: 0, casino: 0 }, out: false, outRound: null, rank: null, visited: [], totals: { slotNet: 0, casinoNet: 0, points: 0, spins: 0, plays: 0 } };
    log(`🎰 ${name(pid)} 참가 확정!`);
    // gold won outside a season (survival corner) comes along
    const w = Store.wallets?.[pid] || 0;
    if (w > 0) { s.ps[pid].money += w; delete Store.wallets[pid]; Store.saveWallets(); log(`👛 ${name(pid)} 시즌 밖에서 번 ${w.toLocaleString()}G 합류`); }
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

// ---------------------------------------------------------------- shop limits (per round)
export function buysLeft(pid, shopId) {
    const s = S(), ps = s.ps[pid];
    const b = ps.buys?.round === s.round ? ps.buys : {};
    return (SHOP_LIMIT[shopId] ?? 1) - (b[shopId] || 0);
}
export function noteBuy(pid, shopId) {
    const s = S(), ps = s.ps[pid];
    if (ps.buys?.round !== s.round) ps.buys = { round: s.round };
    ps.buys[shopId] = (ps.buys[shopId] || 0) + 1;
}

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
// The roulette cards of a tier, shuffled once per round and with the battle
// missions spread out evenly instead of sitting together.
export function missionDeck(tier) {
    const s = S(), all = missionsForTier(tier);
    const key = `${s.round}:${tier}:${all.length}`;
    if (s.mdeck?.key === key) {
        const byId = Object.fromEntries(all.map(m => [m.id, m]));
        const deck = s.mdeck.ids.map(id => byId[id]).filter(Boolean);
        if (deck.length === all.length) return deck;
    }
    const isB = m => m.type === "battle";
    const battles = shuffle(all.filter(isB)), rest = shuffle(all.filter(m => !isB(m)));
    const deck = [];
    // battle i goes to slot ≈ (i + 0.5) · n / b, never two in a row
    const n = all.length, slots = new Set(battles.map((_, i) => Math.floor((i + 0.5) * n / battles.length)));
    for (let i = 0; i < n; i++) deck.push((slots.has(i) && battles.length ? battles : rest.length ? rest : battles).shift());
    s.mdeck = { key, ids: deck.map(m => m.id) };
    Store.saveSeason();
    return deck;
}
export function setMission(m) {
    const s = S();
    s.mission = { ...m };
    // random alphabet card mission: the letter is drawn now
    if (m.type === "card" && m.letter === "?") {
        const L = pick(ALPHABET);
        s.mission.letter = L;
        s.mission.text = `알파벳 카드 ${L} 없는 플레이어 탈락 (랜덤 추첨: ${L})`;
    }
    m = s.mission;
    s.turnIdx = 0;
    if (m.type === "battle") {
        s.status = "battle";
        s.order = [];
        const bp = battlePair(m.rule);
        s.battlePair = bp.pair; s.battlePool = bp.pool; s.battleDrawn = false; // the pair is revealed one by one on screen
        log(`📜 라운드 ${s.round} 미션: ${m.text}`);
    } else {
        s.status = "turns";
        s.order = shuffle(alive());
        log(`📜 라운드 ${s.round} 미션: ${m.text}`);
    }
    Store.saveSeason(true);
}

// ---------------------------------------------------------------- groups used by battle / rank missions
const itemCount = ps => Object.values(ps.items || {}).reduce((a, n) => a + Math.max(0, n || 0), 0);
const hasPetGear = pid => { const ps = S().ps[pid]; return !!(ps.pet || ps.petEffect); };
const hasFrameGear = pid => { const d = Store.getDecor?.(pid) || {}; return !!(d.frame || d.effect); };
const METRIC = {
    money: pid => S().ps[pid].money, points: pid => S().ps[pid].points, hp: pid => S().ps[pid].hp,
    weapons: pid => S().ps[pid].weapons.length, maps: pid => (S().ps[pid].visited || []).length,
    items: pid => itemCount(S().ps[pid]), spins: pid => S().ps[pid].totals.spins,
    net: pid => S().ps[pid].totals.slotNet + S().ps[pid].totals.casinoNet
};
// players at the extreme of a metric (ties included), widened until there are `min` of them
function extremeGroup(list, metric, dir = 1, min = 2) {
    const f = METRIC[metric];
    const sorted = [...list].sort((a, b) => dir * (f(a) - f(b)));
    if (!sorted.length) return [];
    let k = 1;
    while (k < sorted.length && f(sorted[k]) === f(sorted[0])) k++;
    while (k < Math.min(min, sorted.length)) { const v = f(sorted[k]); while (k < sorted.length && f(sorted[k]) === v) k++; }
    return sorted.slice(0, k);
}
const exactTwo = (list, metric, dir) => [...list].sort((a, b) => dir * (METRIC[metric](a) - METRIC[metric](b))).slice(0, 2);

// ---------------------------------------------------------------- battle missions
export const rosterNo = pid => S().roster.indexOf(pid) + 1; // 1..20, the selection order
const BATTLE_GROUP = 4; // "the poorest / richest …" = the bottom / top 4
function battlePair(rule) {
    const s = S(), live = alive();
    const by = (key, dir) => [...live].sort((a, b) => dir * (s.ps[a][key] - s.ps[b][key])).slice(0, Math.min(BATTLE_GROUP, live.length));
    const rules = {
        even: () => live.filter(p => rosterNo(p) % 2 === 0),
        odd: () => live.filter(p => rosterNo(p) % 2 === 1),
        poor: () => by("money", 1), rich: () => by("money", -1),
        lowpts: () => by("points", 1), highpts: () => by("points", -1),
        // exactly two
        poor2: () => exactTwo(live, "money", 1), rich2: () => exactTwo(live, "money", -1),
        lowpts2: () => exactTwo(live, "points", 1), highpts2: () => exactTwo(live, "points", -1),
        netlow2: () => exactTwo(live, "net", 1), fewspins2: () => exactTwo(live, "spins", 1),
        // groups
        nopet: () => live.filter(p => !hasPetGear(p)), noframe: () => live.filter(p => !hasFrameGear(p)),
        fewweapons: () => extremeGroup(live, "weapons", 1), lowhp: () => extremeGroup(live, "hp", 1), highhp: () => extremeGroup(live, "hp", -1),
        fewmaps: () => extremeGroup(live, "maps", 1), fewitems: () => extremeGroup(live, "items", 1)
    };
    let pool = rules[rule]?.() || live;
    if (pool.length < 2) pool = live;
    const pair = shuffle(pool).slice(0, 2);
    // richer one attacks first (tie → more points)
    pair.sort((a, b) => (s.ps[b].money - s.ps[a].money) || (s.ps[b].points - s.ps[a].points));
    return { pair, pool };
}
// called once the on-screen draw has revealed both fighters
export function battleDrawn() {
    const s = S();
    s.battleDrawn = true;
    log(`⚔️ 배틀 상대 추첨: ${s.battlePair.map(name).join(" vs ")}`);
    Store.saveSeason(true);
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

// ---------------------------------------------------------------- money-making corner / begging / jobs
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
    if (s.turn?.pid === pid) s.turn.stats.beg = (s.turn.stats.beg || 0) + gold;
    log(`🥺 ${name(pid)} 구걸 +${gold.toLocaleString()}G`);
    Store.saveSeason(true);
}
// job corner: once per turn, the job's time comes off the turn timer
export const canWork = pid => S().turn?.pid === pid && !S().turn.worked;
export function payJob(pid, career, gold, card = null) {
    const s = S(), ps = s.ps[pid], t = s.turn;
    if (t) { t.worked = true; t.remaining = Math.max(0, t.remaining - career.cut); t.stats.job = (t.stats.job || 0) + gold; t.stats.jobs = (t.stats.jobs || 0) + 1; }
    ps.money += gold;
    if (card) ps.items[cardId(card)] = (ps.items[cardId(card)] || 0) + 1;
    log(`💼 ${name(pid)} ${career.name} 알바 ${card ? `→ 알파벳 카드 ${card}` : `+${gold.toLocaleString()}G`} (-${Math.round(career.cut / 60)}분)`);
    Store.saveSeason(true);
}
// alphabet cards dropped by slot reels
export function gainCard(pid, letter) {
    const ps = S().ps[pid];
    ps.items[cardId(letter)] = (ps.items[cardId(letter)] || 0) + 1;
    log(`🔤 ${name(pid)} 알파벳 카드 ${letter} 획득`);
    Store.saveSeason();
}

// ---------------------------------------------------------------- NPC corner
// apply one NPC move to the current player; returns what happened
// NPCs show up on RANDOM maps: every round a fresh set of maps is rolled.
// loc.npc: "always" | "never" | true (haunted) | else normal.
// Normal maps 40%/round (sky · deep sea · space 25%); haunted maps 60% (40%).
export const NPC_FAR_REGIONS = ["sky", "deepsea", "space"];
export function npcMapChance(loc) {
    if (!loc || loc.npc === "never") return 0;
    if (loc.npc === "always") return 1;
    const far = NPC_FAR_REGIONS.includes(loc.region);
    return loc.npc ? (far ? 0.4 : 0.6) : (far ? 0.25 : 0.4);
}
export function npcMaps() {
    const s = S(); if (!s) return [];
    if (!s.npc || s.npc.round !== s.round) {
        s.npc = { round: s.round, maps: LOCATIONS.filter(l => !l.off && Math.random() < npcMapChance(l)).map(l => l.id) };
        Store.saveSeason();
    }
    return s.npc.maps;
}
export const npcActive = locId => npcMaps().includes(locId);

export function npcHit(pid, npc, move) {
    const s = S(), ps = s.ps[pid];
    const rnd = ([a, b]) => Math.round((a + Math.random() * (b - a)) / 100) * 100;
    const out = { npc: npc.id, move };
    if (move.steal) {
        const g = rnd(move.steal);
        if (ps.money >= g) { ps.money -= g; out.gold = -g; } else out.none = true; // too poor to rob
    } else if (move.give) { const g = rnd(move.give); ps.money += g; out.gold = g; }
    else if (move.hp) { const before = ps.hp; ps.hp = Math.max(1, Math.min(CONFIG.START_HP, ps.hp + move.hp)); out.hp = ps.hp - before; }
    else if (move.nomove) {
        const ix = ps.weapons.findIndex(w => w !== "no_move");
        if (ix >= 0) { out.weapon = ps.weapons[ix]; ps.weapons[ix] = "no_move"; } else out.none = true;
    } else if (move.kill) { out.kill = true; }
    // mission stats: who hit the player during their turn and what it did
    if (s.turn?.pid === pid) (s.turn.stats.npc ||= []).push({ npc: npc.id, hp: !!move.hp, gold: out.gold > 0 });
    log(`${npc.emoji} ${npc.name} → ${name(pid)}: ${out.kill ? "즉사!" : out.none ? "효과 없음" : out.gold ? `${out.gold > 0 ? "+" : ""}${out.gold.toLocaleString()}G` : out.hp != null ? `HP ${out.hp > 0 ? "+" : ""}${out.hp}` : out.weapon ? "무기 → No Move" : "저주"}`);
    if (out.kill) killPlayer(pid, `${npc.emoji} ${npc.name}에게 즉사`);
    else Store.saveSeason(true);
    return out;
}
// death outside the judge (reaper): out at once, the turn is over
export function killPlayer(pid, why) {
    const s = S();
    if (s.ps[pid].out) return;
    const rank = alive().length;
    Object.assign(s.ps[pid], { out: true, outRound: s.round, rank, hp: 0 });
    s.history.push({ round: s.round, npcDeath: true, eliminated: pid, rank, why });
    log(`☠️ ${name(pid)} ${why} (${rank}위)`);
    if (s.turn?.pid === pid) {
        s.results[pid] = { stats: s.turn.stats, pass: false, dead: true, loc: s.turn.loc };
        s.turn = null;
        s.turnIdx++;
        advanceTurn();
    }
    Store.saveSeason(true);
}
function advanceTurn() {
    const s = S();
    if (s.sandbox) { sandboxNextTurn(); return; } // test mode: no judging, just the next turn
    while (s.turnIdx < s.order.length && s.ps[s.order[s.turnIdx]].out) s.turnIdx++;
    if (s.turnIdx >= s.order.length) judge();
}

// ---------------------------------------------------------------- turns
export const currentPid = () => S().order[S().turnIdx];
export function startTurn() {
    const s = S();
    const pid = currentPid();
    s.turn = { pid, loc: null, region: null, remaining: CONFIG.TURN_SECONDS, running: false, ticket: false, stats: { pid, slotNet: 0, casinoNet: 0, points: 0, bonus: 0, jackpot: null, spins: 0, plays: 0, slotWins: 0, five: 0, freeSpins: 0, beg: 0, job: 0, cardUsed: false, bonusAt: 0, brandWin: {}, betWin: {}, jobs: 0, locs: [], npc: [] } };
    Store.saveSeason();
    return s.turn;
}

// ---- regions: region roulette → map roulette inside it
export function regionStatus(pid, region) {
    const ps = S().ps[pid];
    if (region.off) return { ok: false, why: "닫힘" };
    const locs = LOCATIONS.filter(l => l.region === region.id && !l.off);
    if (!locs.length) return { ok: false, why: "맵 없음" };
    if (region.need && !(ps.items[region.need] > 0)) return { ok: false, why: `${ITEM_BY_ID[region.need]?.name || region.need} 필요`, need: region.need };
    const acc = locs.filter(l => canEnter(pid, l).ok);
    if (!acc.length) return { ok: false, why: "입장 가능한 맵 없음" };
    return { ok: true, locs: acc };
}
export const availableRegions = pid => REGIONS.filter(r => regionStatus(pid, r).ok);
export function enterRegion(regionId) {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    const r = REGIONS.find(x => x.id === regionId);
    t.region = regionId;
    if (r.need && ps.items[r.need] > 0) { ps.items[r.need]--; log(`${ITEM_BY_ID[r.need]?.emoji || "🎒"} ${name(t.pid)} ${ITEM_BY_ID[r.need]?.name} 사용 → ${r.name}`); }
    else log(`${r.emoji} ${name(t.pid)} → ${r.name}`);
    Store.saveSeason();
}
export function canEnter(pid, loc) {
    const ps = S().ps[pid], p = Store.player(pid);
    if (loc.off) return { ok: false, why: "닫힘" };
    const r = loc.req;
    if (!r) return { ok: true };
    if (r.points != null) return ps.points >= r.points ? { ok: true } : { ok: false, why: `${r.points}P 이상 필요` };
    if (r.country) {
        if (p.country === r.country) return { ok: true };
        const pass = r.pass || passIdOf(loc);
        if ((ps.items[pass] || 0) > 0) return { ok: true, pass };
        return { ok: false, why: `${r.country} 국적 전용` };
    }
    if (r.fee) return playMoney(pid) >= r.fee ? { ok: true, fee: r.fee } : { ok: false, why: `입장료 ${r.fee.toLocaleString()}G` };
    if (r.feePts) return ps.points >= r.feePts ? { ok: true, feePts: r.feePts } : { ok: false, why: `입장료 ${r.feePts}P` };
    if (r.random) return { ok: true, random: !(r.races || []).includes(p.ethnicity) };
    return { ok: true };
}
export function accessibleLocations(pid, regionId = null) { return LOCATIONS.filter(l => (!regionId || l.region === regionId) && canEnter(pid, l).ok); }
// random-entry maps: the bouncer decides (Ghost / Invisible walk into Ghost Casino)
export function rollEntry(pid, loc) {
    const ce = canEnter(pid, loc);
    if (!ce.random) return { allowed: true };
    return { allowed: Math.random() < 0.5 };
}
export const cardsOf = pid => Object.entries(S().ps[pid].items).filter(([k, n]) => k.startsWith("card_") && n > 0).map(([k]) => k.slice(5));
export function useCardForEntry(pid, letter) {
    const ps = S().ps[pid];
    if (!(ps.items[cardId(letter)] > 0)) return false;
    ps.items[cardId(letter)]--;
    log(`🔤 ${name(pid)} 알파벳 카드 ${letter}로 강제 입장!`);
    Store.saveSeason();
    return true;
}
export function setLocation(locId, { teleport = false } = {}) {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    t.loc = locId;
    const loc = LOC_BY_ID[locId];
    t.region ||= loc.region;
    if (!teleport) {
        const ce = canEnter(t.pid, loc);
        if (ce.pass) { ps.items[ce.pass]--; log(`🎟️ ${name(t.pid)} 출입권 사용`); }
        if (ce.fee) { const fromLoan = Math.min(ps.loanGold || 0, ce.fee); ps.loanGold = (ps.loanGold || 0) - fromLoan; ps.money -= ce.fee - fromLoan; log(`💰 ${name(t.pid)} 입장료 ${ce.fee.toLocaleString()}G`); }
        if (ce.feePts) { ps.points -= ce.feePts; log(`💎 ${name(t.pid)} 입장료 ${ce.feePts}P`); }
    }
    if (!(ps.visited ||= []).includes(locId)) ps.visited.push(locId);
    if (!(t.stats.locs ||= []).includes(locId)) t.stats.locs.push(locId);
    log(`🗺️ ${name(t.pid)} → ${loc.name}`);
    Store.saveSeason();
}
// map pass: skip both roulettes and go straight to that map
export const passesOf = pid => Object.entries(S().ps[pid].items).filter(([k, n]) => n > 0 && ITEM_BY_ID[k]?.loc && LOC_BY_ID[ITEM_BY_ID[k].loc] && !LOC_BY_ID[ITEM_BY_ID[k].loc].off).map(([k]) => ITEM_BY_ID[k]);
export function usePassTeleport(itemId) {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    const it = ITEM_BY_ID[itemId];
    if (!it?.loc || !(ps.items[itemId] > 0)) return false;
    ps.items[itemId]--;
    log(`🎟️ ${name(t.pid)} ${it.name} 사용 → 순간이동!`);
    if (t.loc) { t.region = LOC_BY_ID[it.loc].region; t.npc = null; } // moving mid-turn: new region, the new map rolls its own NPC visits
    setLocation(it.loc, { teleport: true });
    return true;
}

// Record one slot spin / casino play for the current turn
export function recordPlay(kind, bet, win, points, extra = {}) {
    const s = S(), t = s.turn;
    if (!t) return;
    const ps = s.ps[t.pid];
    ps.money += win - (extra.free ? 0 : bet);
    ps.points += points;
    const net = win - (extra.free ? 0 : bet);
    if (kind === "slot") {
        t.stats.slotNet += net; t.stats.spins++; ps.totals.slotNet += net; ps.totals.spins++;
        if (win > 0) t.stats.slotWins = (t.stats.slotWins || 0) + 1; // a whole bonus round is one win
        t.stats.five = (t.stats.five || 0) + (extra.five ? 1 : 0);
        if (extra.freeSpin) t.stats.freeSpins = (t.stats.freeSpins || 0) + 1;
        // first bonus of the turn: on which spin (bonus_in missions)
        if (extra.bonus && !t.stats.bonusAt) t.stats.bonusAt = t.stats.spins;
        // best single-spin win per brand and per bet (brand_win / bet_win missions)
        if (extra.brand) { const k = brandKey(extra.brand), bw = (t.stats.brandWin ||= {}); bw[k] = Math.max(bw[k] || 0, win); }
        if (bet) { const bw = (t.stats.betWin ||= {}); bw[bet] = Math.max(bw[bet] || 0, win); }
    }
    else { t.stats.casinoNet += net; t.stats.plays++; ps.totals.casinoNet += net; ps.totals.plays++; }
    t.stats.points += points; ps.totals.points += points;
    if (extra.bonus) t.stats.bonus++;
    for (const jp of extra.jackpots || []) if (!t.stats.jackpot || JACKPOT_RANK[jp] > JACKPOT_RANK[t.stats.jackpot]) t.stats.jackpot = jp;
    Store.saveSeason();
}

function hasThing(pid, what) {
    if (what === "pet") return !!S().ps[pid].pet;
    if (what === "gear") return hasPetGear(pid) || hasFrameGear(pid);
    return true;
}
// missions decided by the judge, not by playing (shown as "판정 대기")
export const judgedMission = m => m && (m.type === "rank");
export function missionMet(m, st) {
    if (!m || !st) return false;
    switch (m.type) {
        case "bonus": return st.bonus > 0;
        case "slot_net": return st.slotNet >= m.v;
        case "casino_net": return st.casinoNet >= m.v;
        case "points": return st.points >= m.v;
        case "jackpot": return !!st.jackpot && JACKPOT_RANK[st.jackpot] >= JACKPOT_RANK[m.min];
        case "combo": return st.casinoNet >= m.c && st.slotNet >= m.s;
        case "five": return (st.five || 0) >= m.v;
        case "freespin": return (st.freeSpins || 0) >= m.v;
        case "slot_wins": return (st.slotWins || 0) >= m.v;
        case "beg_max": return (st.beg || 0) > m.v;
        case "job_min": return (st.job || 0) >= m.v;
        case "card": return !!st.cardUsed;
        case "has": return st.pid != null && hasThing(st.pid, m.what);
        case "rank": return true;
        case "bonus_in": return !!st.bonusAt && st.bonusAt <= m.v;
        case "brand_win": return (st.brandWin?.[brandKey(m.brand)] || 0) >= m.v;
        case "bet_win": return m.bets.some(b => (st.betWin?.[b] || 0) >= m.v);
        case "job_done": return (st.jobs || 0) >= (m.v || 1);
        case "home_map": { const c = Store.player(st.pid)?.country; return !!c && (st.locs || []).some(id => LOC_BY_ID[id]?.req?.country === c); }
        case "region_map": return (st.locs || []).some(id => m.regions.includes(LOC_BY_ID[id]?.region));
        case "npc_hit": return (st.npc || []).some(x => x.npc === m.npc && x[m.what]);
    }
    return false;
}
const bestOf = (obj, keys) => Math.max(0, ...keys.map(k => obj?.[k] || 0));
export function missionProgress(m, st) {
    if (!m || !st) return { cur: 0, goal: 1, label: "" };
    const met = missionMet(m, st);
    switch (m.type) {
        case "bonus": return { cur: Math.min(1, st.bonus), goal: 1, label: st.bonus ? "보너스 달성!" : "보너스 0회" };
        case "slot_net": return { cur: st.slotNet, goal: m.v, label: `${Math.round(st.slotNet).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "casino_net": return { cur: st.casinoNet, goal: m.v, label: `${Math.round(st.casinoNet).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "points": return { cur: st.points, goal: m.v, label: `${st.points} / ${m.v} P` };
        case "jackpot": return { cur: met ? 1 : 0, goal: 1, label: st.jackpot ? `최고 잭팟: ${st.jackpot}` : "잭팟 없음" };
        case "combo": return { cur: (Math.min(1, Math.max(0, st.casinoNet) / m.c) + Math.min(1, Math.max(0, st.slotNet) / m.s)) / 2, goal: 1, label: `🃏 ${Math.round(st.casinoNet).toLocaleString()}/${m.c.toLocaleString()} · 🎰 ${Math.round(st.slotNet).toLocaleString()}/${m.s.toLocaleString()} G` };
        case "five": return { cur: st.five || 0, goal: m.v, label: `5 of a kind ${st.five || 0} / ${m.v}` };
        case "freespin": return { cur: st.freeSpins || 0, goal: m.v, label: `무료스핀 ${st.freeSpins || 0} / ${m.v}` };
        case "slot_wins": return { cur: st.slotWins || 0, goal: m.v, label: `WIN ${st.slotWins || 0} / ${m.v}` };
        case "beg_max": return { cur: st.beg || 0, goal: m.v + 1, label: `구걸 ${(st.beg || 0).toLocaleString()}G (${m.v.toLocaleString()}G 넘으면 안전)` };
        case "job_min": return { cur: st.job || 0, goal: m.v, label: `직업 ${(st.job || 0).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "card": return { cur: met ? 1 : 0, goal: 1, label: met ? `카드 ${m.letter} 사용!` : `카드 ${m.letter}: 턴 종료 때 사용 여부를 묻습니다` };
        case "has": return { cur: met ? 1 : 0, goal: 1, label: met ? "보유 중 — 안전" : m.what === "pet" ? "펫 없음 (상점에서 구매 가능)" : "펫·펫효과·프레임·효과 없음" };
        case "rank": return { cur: 0, goal: 1, label: "라운드 끝에 판정" };
        case "bonus_in": {
            const sp = st.spins || 0;
            if (met) return { cur: 1, goal: 1, label: `${st.bonusAt}번째 스핀에 보너스! 달성` };
            if (st.bonusAt) return { cur: 0, goal: 1, label: `${st.bonusAt}번째 스핀에 보너스 — ${m.v}번 안에는 실패` };
            return { cur: Math.min(sp, m.v), goal: m.v, label: sp >= m.v ? `${m.v}번 안에 보너스 없음 — 실패` : `스핀 ${sp} / ${m.v} · 보너스 대기` };
        }
        case "brand_win": { const b = st.brandWin?.[brandKey(m.brand)] || 0; return { cur: b, goal: m.v, label: `${m.brand} 1회 최고 ${b.toLocaleString()} / ${m.v.toLocaleString()} G` }; }
        case "bet_win": { const b = bestOf(st.betWin, m.bets); return { cur: b, goal: m.v, label: `${m.bets.join("/")}G 베팅 1회 최고 ${b.toLocaleString()} / ${m.v.toLocaleString()} G` }; }
        case "job_done": return { cur: Math.min(st.jobs || 0, m.v || 1), goal: m.v || 1, label: `직업 ${st.jobs || 0} / ${m.v || 1}회` };
        case "home_map": { const c = Store.player(st.pid)?.country; return { cur: met ? 1 : 0, goal: 1, label: met ? "본인 국적 맵 방문 완료!" : `${c || "?"} 국적 맵을 방문하세요` }; }
        case "region_map": return { cur: met ? 1 : 0, goal: 1, label: met ? "방문 완료!" : "우주 · 심해 · 하늘나라의 맵을 방문하세요" };
        case "npc_hit": return { cur: met ? 1 : 0, goal: 1, label: met ? "👼 엔젤 도움 받음!" : `👼 엔젤에게 ${m.what === "hp" ? "HP 회복" : "돈"} 공격을 받아야 합니다` };
    }
    return { cur: 0, goal: 1, label: "" };
}
export function useMissionPass() {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    if (!(ps.items.mission_pass > 0) || t.ticket) return false;
    ps.items.mission_pass--; t.ticket = true;
    log(`🎫 ${name(t.pid)} 미션완료권 사용!`);
    Store.saveSeason();
    return true;
}
// card missions: holders decide at the end of their turn whether to spend the card
export function useMissionCard() {
    const s = S(), t = s.turn, ps = s.ps[t.pid], m = s.mission;
    if (m?.type !== "card" || !(ps.items[cardId(m.letter)] > 0)) return false;
    ps.items[cardId(m.letter)]--; t.stats.cardUsed = true;
    log(`🔤 ${name(t.pid)} 알파벳 카드 ${m.letter} 사용 → 미션 통과`);
    Store.saveSeason();
    return true;
}
export function endTurn() {
    const s = S(), t = s.turn;
    if (!t) return;
    const pass = t.ticket || missionMet(s.mission, t.stats);
    s.results[t.pid] = { stats: t.stats, pass, ticket: t.ticket, loc: t.loc };
    log(`${pass ? "✅" : "❌"} ${name(t.pid)} 턴 종료 — ${judgedMission(s.mission) ? "판정 대기" : `미션 ${pass ? "성공" : "실패"}`}`);
    s.turn = null;
    s.turnIdx++;
    advanceTurn();
    Store.saveSeason(true);
}
export function skipTurnOf(pid) { // player who can't play (e.g. admin skip) counts as fail
    const s = S();
    s.results[pid] = { stats: { slotNet: 0, casinoNet: 0, points: 0, bonus: 0, jackpot: null }, pass: false, skipped: true };
}

// ---------------------------------------------------------------- judging
function judge() {
    const s = S();
    if (alive().length <= CONFIG.FINALISTS) { s.status = "final"; return; }
    s.status = "judge";
    const live = s.order.filter(pid => !s.ps[pid].out);
    const m = s.mission;
    let cands;
    if (m?.type === "rank") {
        // fewest season slot plays (ties) — "…and the least gold" narrows that group to its 2 poorest
        const g = extremeGroup(live, "spins", 1, m.rule === "fewspins_poor" ? 2 : 1);
        cands = m.rule === "fewspins_poor" ? [...g].sort((a, b) => s.ps[a].money - s.ps[b].money).slice(0, 2) : g;
        for (const pid of live) if (s.results[pid]) s.results[pid].pass = !cands.includes(pid);
    } else cands = live.filter(pid => !s.results[pid]?.pass);
    s.allPassed = cands.length === 0;
    if (!cands.length) {
        // everybody passed: the 3 lowest earners of the round become candidates
        const net = pid => { const st = s.results[pid]?.stats || {}; return (st.slotNet || 0) + (st.casinoNet || 0); };
        cands = [...live].sort((a, b) => net(a) - net(b)).slice(0, Math.min(3, live.length - 1));
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
    // sources: who gets the credit when luck changes a result (ui/petHelp.js)
    const sources = [];
    if (pet) { win += pet.boost; if (pet.kind === "special") bonus += pet.boost; sources.push({ kind: "pet", id: pet.id, name: pet.name, emoji: pet.art?.a || "🐾", special: pet.kind === "special", boost: pet.boost }); }
    if (fx && pet) { win += fx.boost; if (fx.kind === "special") bonus += fx.boost; sources.push({ kind: "fx", id: fx.id, name: fx.name, emoji: "✨", special: fx.kind === "special", boost: fx.boost }); }
    win = Math.min(30, win); bonus = Math.min(30, bonus);
    return { win: win / 100, bonus: bonus / 100, pct: win, bonusPct: bonus, pid, pet: ps.pet || null, petEffect: ps.petEffect || null, sources };
}

// pet / effect helped: what = "win" | "bonus"; counted on the player for the season
export function notePetHelp(pid, what, amount, credit) {
    const s = S(), ps = s?.ps[pid];
    if (!ps) return;
    const ph = (ps.petHelp ||= { win: 0, bonus: 0, gold: 0 });
    ph[what] = (ph[what] || 0) + 1;
    ph.gold += Math.max(0, amount || 0);
    if (what === "bonus" && credit) log(`🐾 ${Store.player(pid)?.name_ko || "플레이어"}의 ${credit.kind === "pet" ? "펫" : "펫효과"} '${credit.name}'이(가) 보너스를 터뜨려 줬다!`);
    Store.saveSeason();
}
