// =====================================================================
// Season rules: roster, rounds, missions, turns, judging, elimination.
// Pure state changes on Store.season — screens call these and re-render.
// =====================================================================
import { CONFIG } from "../config.js";
import { Store } from "../core/store.js";
import { MISSIONS, ALPHABET, ALL_LETTERS, EXTRA_LETTERS, brandKey, JACKPOT_RANK, LOCATIONS, LOC_BY_ID, PET_BY_ID, PETFX_BY_ID, LOANS, REGIONS, ITEM_BY_ID, ITEMS, SHOP_LIMIT, passIdOf, cardId, WEAPON_BY_ID, isDeadWeapon, npcHarmful, HOPE_MESSAGES, BOOST_SECONDS, isSpecialFrame, isSpecialEffect } from "../data/catalog.js";
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
// players of the previous season are drawn again with only 20% of the normal weight
export const REPICK_WEIGHT = 0.2;
export function prevSeasonPlayers() {
    const n = S()?.number || 0;
    return new Set(Store.results.filter(r => r.season === n - 1).map(r => r.playerId));
}
export function pickForSelection(pool) {
    const prev = prevSeasonPlayers();
    const w = p => prev.has(p.id) ? REPICK_WEIGHT : 1;
    let r = Math.random() * pool.reduce((a, p) => a + w(p), 0);
    for (const p of pool) { r -= w(p); if (r <= 0) return p; }
    return pool[pool.length - 1];
}
// n players in weighted draw order (SKIP button)
export function pickManyForSelection(pool, n) {
    const left = [...pool], out = [];
    while (left.length && out.length < n) { const p = pickForSelection(left); out.push(p); left.splice(left.indexOf(p), 1); }
    return out;
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
    if (m.type === "card" && m.letter === "*") {
        const L = pick(EXTRA_LETTERS);
        s.mission.letter = L;
        s.mission.text = `알파벳 카드 ${L} 없는 플레이어 탈락 (랜덤 추첨: ${L} · GAMBLERS 제외)`;
    }
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
    net: pid => S().ps[pid].totals.slotNet + S().ps[pid].totals.casinoNet,
    // this round (mission rank rules): distinct maps / visits to gear-only maps
    roundMaps: pid => (S().results[pid]?.stats?.locs || []).length,
    roundGear: pid => S().results[pid]?.stats?.gearVisits || 0
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
    const t = S().turn; if (t?.pid === pid) t.stats.earn = (t.stats.earn || 0) + gold;
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

// 🎫 NPC 공격 Block 권: charges left (opened tickets) + unopened tickets in the bag
const BLOCK_ITEMS = () => ITEMS.filter(i => i.npcBlock).sort((a, b) => a.npcBlock - b.npcBlock);
export const npcBlocksLeft = ps => (ps.npcBlock || 0) + BLOCK_ITEMS().reduce((a, i) => a + (ps.items[i.id] || 0) * i.npcBlock, 0);
function useNpcBlock(ps) {
    if (!(ps.npcBlock > 0)) {
        const t = BLOCK_ITEMS().find(i => ps.items[i.id] > 0); // smallest ticket first
        if (!t) return false;
        ps.items[t.id]--; ps.npcBlock = (ps.npcBlock || 0) + t.npcBlock;
    }
    ps.npcBlock--;
    return true;
}

export function npcHit(pid, npc, move) {
    const s = S(), ps = s.ps[pid];
    const rnd = ([a, b]) => Math.round((a + Math.random() * (b - a)) / 100) * 100;
    const out = { npc: npc.id, move };
    if (npcHarmful(move) && useNpcBlock(ps)) {
        out.blocked = true; out.left = npcBlocksLeft(ps);
        log(`🎫 ${name(pid)} NPC 공격 Block! (${npc.emoji} ${npc.name} · 남은 Block ${out.left}회)`);
        Store.saveSeason(true);
        return out;
    }
    if (move.idle) out.idle = move.idle;
    else if (move.hope) out.hope = HOPE_MESSAGES[Math.floor(Math.random() * HOPE_MESSAGES.length)];
    else if (move.gift) { ps.items[move.gift] = (ps.items[move.gift] || 0) + 1; out.gift = move.gift; }
    else if (move.shop) out.shop = true;
    else if (move.copy) {
        // the robot copies one of the player's weapons and uses it on them
        const own = ps.weapons.filter(w => !isDeadWeapon(w));
        if (!own.length) out.none = true;
        else {
            const w = WEAPON_BY_ID[own[Math.floor(Math.random() * own.length)]];
            out.weapon = w.id; out.copied = true;
            const dmg = w.type === "attack" ? w.atk : w.type === "magic" ? [5, 10, 20][Math.floor(Math.random() * 3)] : 0;
            if (dmg) { const before = ps.hp; ps.hp = Math.max(1, ps.hp - dmg); out.hp = ps.hp - before; }
        }
    }
    else if (move.steal) {
        const g = rnd(move.steal);
        if (ps.money >= g) { ps.money -= g; out.gold = -g; } else out.none = true; // too poor to rob
    } else if (move.give) { const g = rnd(move.give); ps.money += g; out.gold = g; }
    else if (move.hp) { const before = ps.hp; ps.hp = Math.max(1, Math.min(CONFIG.START_HP, ps.hp + move.hp)); out.hp = ps.hp - before; }
    else if (move.nomove) {
        const ix = ps.weapons.findIndex(w => !isDeadWeapon(w));
        if (ix >= 0) { out.weapon = ps.weapons[ix]; ps.weapons[ix] = "no_move"; } else out.none = true;
    } else if (move.kill) { out.kill = true; }
    // mission stats: who hit the player during their turn and what it did
    if (s.turn?.pid === pid) (s.turn.stats.npc ||= []).push({ npc: npc.id, hp: !!move.hp, gold: out.gold > 0 });
    const what = out.kill ? "즉사!" : out.none ? "효과 없음" : out.idle ? out.idle : out.hope ? `"${out.hope}"` : out.gift ? `${ITEM_BY_ID[out.gift]?.name} 선물` : out.shop ? "보따리상점 OPEN"
        : out.copied ? `${WEAPON_BY_ID[out.weapon]?.name} 복사 공격${out.hp ? ` HP ${out.hp}` : " (효과 없음)"}`
        : out.gold ? `${out.gold > 0 ? "+" : ""}${out.gold.toLocaleString()}G` : out.hp != null ? `HP ${out.hp > 0 ? "+" : ""}${out.hp}` : out.weapon ? "무기 → No Move" : "저주";
    log(`${npc.emoji} ${npc.name} → ${name(pid)}: ${what}`);
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
    if (region.needAny && !region.needAny.some(i => ps.items[i] > 0)) return { ok: false, why: `${region.needAny.map(i => ITEM_BY_ID[i]?.name || i).join(" / ")} 중 하나 필요` };
    const acc = locs.filter(l => canEnter(pid, l).ok);
    if (!acc.length) return { ok: false, why: "입장 가능한 맵 없음" };
    return { ok: true, locs: acc };
}
export const availableRegions = pid => REGIONS.filter(r => regionStatus(pid, r).ok);
export function enterRegion(regionId) {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    const r = REGIONS.find(x => x.id === regionId);
    t.region = regionId;
    // (needAny regions — 콤보랜드 — use nothing here: each map asks for its own gear)
    if (r.need && ps.items[r.need] > 0) { ps.items[r.need]--; log(`${ITEM_BY_ID[r.need]?.emoji || "🎒"} ${name(t.pid)} ${ITEM_BY_ID[r.need]?.name} 사용 → ${r.name}`); }
    else log(`${r.emoji} ${name(t.pid)} → ${r.name}`);
    Store.saveSeason();
}
// req: points · country(+pass) · fee / feePts (ask: always asked, can be picked while broke)
//      random (coin flip at the door) · gear: [items] needed AND used up on entry
export function canEnter(pid, loc) {
    const ps = S().ps[pid], p = Store.player(pid);
    if (loc.off) return { ok: false, why: "닫힘" };
    if (loc.crazy && !crazyTimeOk()) return { ok: false, why: "남은 시간 6분 30초 이상 필요" };
    const r = loc.req;
    if (!r) return { ok: true };
    const out = { ok: true };
    if (r.gear?.length) {
        const miss = r.gear.filter(g => !(ps.items[g] > 0));
        if (miss.length) return { ok: false, why: `${miss.map(gearName).join(" · ")} 필요`, missing: miss };
        out.gear = [...r.gear];
    }
    if (r.points != null) return ps.points >= r.points ? out : { ok: false, why: `${r.points}P 이상 필요` };
    if (r.country) {
        if (p.country === r.country) return out;
        const pass = r.pass || passIdOf(loc);
        if ((ps.items[pass] || 0) > 0) return { ...out, pass };
        return { ok: false, why: `${r.country} 국적 전용` };
    }
    if (r.fee) {
        if (r.ask) return { ...out, fee: r.fee, ask: true, short: playMoney(pid) < r.fee };
        return playMoney(pid) >= r.fee ? { ...out, fee: r.fee } : { ok: false, why: `입장료 ${r.fee.toLocaleString()}G` };
    }
    if (r.feePts) {
        if (r.ask) return { ...out, feePts: r.feePts, ask: true, short: ps.points < r.feePts };
        return ps.points >= r.feePts ? { ...out, feePts: r.feePts } : { ok: false, why: `입장료 ${r.feePts}P` };
    }
    if (r.random) return { ...out, random: !(r.races || []).includes(p.ethnicity) };
    return out;
}
export const gearName = id => `${ITEM_BY_ID[id]?.emoji || ""} ${ITEM_BY_ID[id]?.name || id}`.trim();

// 🎟️ map pass: what the target map still asks for. Random doors are skipped, but
// gear (incl. the region's wings / suit / tank), points and entry fees are not.
// → { ok, missing: ["…"], gear: [ids used up], fee, feePts }
export function passNeeds(pid, loc) {
    const ps = S().ps[pid], r = loc.req || {};
    const region = REGIONS.find(x => x.id === loc.region);
    const gear = [...new Set([...(region?.need ? [region.need] : []), ...(r.passGear || r.gear || [])])];
    const missing = [];
    if (loc.crazy && !crazyTimeOk()) missing.push(`플레이 시간이 부족합니다 (남은 시간 ${Math.floor(CRAZY_MIN_LEFT / 60)}분 ${CRAZY_MIN_LEFT % 60}초 이상 필요) → 시간 연장권부터 사용하세요`);
    for (const g of gear) if (!(ps.items[g] > 0)) missing.push(`${gearName(g)} 부족 → ${ITEM_BY_ID[g]?.name || g}부터 갖추세요`);
    if (r.points != null && ps.points < r.points) missing.push(`포인트가 부족합니다 (${r.points}P 이상 필요) → 포인트부터 모으세요`);
    const fee = r.fee || 0, feePts = r.feePts || 0;
    if (fee && playMoney(pid) < fee) missing.push(`골드가 부족합니다 (입장료 ${fee.toLocaleString()}G) → 골드부터 모으세요`);
    if (feePts && ps.points < feePts) missing.push(`포인트가 부족합니다 (입장료 ${feePts}P) → 포인트부터 모으세요`);
    return { ok: !missing.length, missing, gear, fee, feePts };
}
// pay an entry: gear used up + fee / points
export function payEntry(pid, { gear = [], fee = 0, feePts = 0 } = {}) {
    const ps = S().ps[pid];
    for (const g of gear) if (ps.items[g] > 0) { ps.items[g]--; log(`${ITEM_BY_ID[g]?.emoji || "🎒"} ${name(pid)} ${ITEM_BY_ID[g]?.name} 사용`); }
    if (fee) { const fromLoan = Math.min(ps.loanGold || 0, fee); ps.loanGold = (ps.loanGold || 0) - fromLoan; ps.money -= fee - fromLoan; log(`💰 ${name(pid)} 입장료 ${fee.toLocaleString()}G`); }
    if (feePts) { ps.points -= feePts; log(`💎 ${name(pid)} 입장료 ${feePts}P`); }
    Store.saveSeason();
}

// ---- map rules that fire on arrival (roulette, map pass or random map ticket)
// 🤪 Crazy Casino: −5 min once per turn (the clock never comes back) · 😈 Evil Town: HP −10, HP ≤ 10 → dead
export const CRAZY_CUT = 300;
// Crazy Casino only opens to a player with at least 6:30 of play time left
export const CRAZY_MIN_LEFT = 390;
export function crazyTimeOk() { const t = S()?.turn; return !t || t.remaining >= CRAZY_MIN_LEFT; }
export function crazyCut() {
    const t = S().turn;
    if (!t || t.crazyCut) return 0;
    t.crazyCut = true;
    const cut = Math.min(CRAZY_CUT, t.remaining);
    t.remaining -= cut;
    log(`🤪 ${name(t.pid)} Crazy Casino 입장 — 플레이 시간 ${Math.round(cut / 60)}분 차감!`);
    Store.saveSeason();
    return cut;
}
export function hpToll(pid, dmg, place) {
    const ps = S().ps[pid];
    if (ps.hp <= dmg) { killPlayer(pid, `${place}에서 사망`); return { dead: true }; }
    ps.hp -= dmg;
    log(`💔 ${name(pid)} ${place} HP −${dmg}`);
    Store.saveSeason(true);
    return { hp: ps.hp };
}
// 🎁 Donation Casino: one bag item (weapons / pets are not in the bag) must be donated
export const donatable = pid => Object.entries(S().ps[pid].items).filter(([k, n]) => n > 0 && ITEM_BY_ID[k]).map(([k, n]) => ({ item: ITEM_BY_ID[k], n }));
export function donate(pid, itemId) {
    const ps = S().ps[pid];
    if (!(ps.items[itemId] > 0)) return false;
    ps.items[itemId]--;
    log(`🎁 ${name(pid)} Donation Casino에 ${ITEM_BY_ID[itemId]?.name} 기부`);
    Store.saveSeason(true);
    return true;
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
// maps that can only be reached with oxygen / wings / a space suit (region rule or map rule)
const GEAR_ITEMS = ["oxygen", "wings", "space_suit"];
export function needsGear(loc) {
    const r = REGIONS.find(x => x.id === loc?.region);
    return GEAR_ITEMS.includes(r?.need) || !!r?.needAny?.some(i => GEAR_ITEMS.includes(i))
        || (loc?.req?.gear || []).some(g => GEAR_ITEMS.includes(g)) || (loc?.req?.passGear || []).some(g => GEAR_ITEMS.includes(g));
}
export function setLocation(locId, { teleport = false } = {}) {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    t.loc = locId;
    const loc = LOC_BY_ID[locId];
    t.region ||= loc.region;
    if (!teleport) {
        const ce = canEnter(t.pid, loc);
        if (ce.pass) { ps.items[ce.pass]--; log(`🎟️ ${name(t.pid)} 출입권 사용`); }
        if (ce.ok && !ce.short) payEntry(t.pid, { gear: ce.gear, fee: ce.fee, feePts: ce.feePts });
    }
    if (!(ps.visited ||= []).includes(locId)) ps.visited.push(locId);
    if (!(t.stats.locs ||= []).includes(locId)) t.stats.locs.push(locId);
    if (needsGear(loc)) t.stats.gearVisits = (t.stats.gearVisits || 0) + 1;
    log(`🗺️ ${name(t.pid)} → ${loc.name}`);
    Store.saveSeason();
}
// map pass: skip both roulettes and go straight to that map
export const passesOf = pid => Object.entries(S().ps[pid].items).filter(([k, n]) => n > 0 && ITEM_BY_ID[k]?.loc && LOC_BY_ID[ITEM_BY_ID[k].loc] && !LOC_BY_ID[ITEM_BY_ID[k].loc].off).map(([k]) => ITEM_BY_ID[k]);
export function usePassTeleport(itemId) {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    const it = ITEM_BY_ID[itemId];
    if (!it?.loc || !(ps.items[itemId] > 0)) return false;
    const need = passNeeds(t.pid, LOC_BY_ID[it.loc]);
    if (!need.ok) return false;
    ps.items[itemId]--;
    payEntry(t.pid, need);
    log(`🎟️ ${name(t.pid)} ${it.name} 사용 → 순간이동!`);
    if (t.loc) { t.region = LOC_BY_ID[it.loc].region; t.npc = null; } // moving mid-turn: new region, the new map rolls its own NPC visits
    setLocation(it.loc, { teleport: true });
    return true;
}

// 🗺️ 랜덤 맵권: straight to one random map among every map the player may enter, in every region they may pick
export function randomMapPool(pid) {
    const cur = S().turn?.loc;
    // maps that ask for gear or an entry fee are left out (the ticket can't ask for them)
    return availableRegions(pid).flatMap(r => regionStatus(pid, r).locs).filter(l => { const ce = canEnter(pid, l); return l.id !== cur && !ce.gear && !ce.fee && !ce.feePts; });
}
export function useRandomMap() {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    if (!(ps.items.map_random > 0)) return null;
    const pool = randomMapPool(t.pid);
    if (!pool.length) return null;
    const loc = pool[Math.floor(Math.random() * pool.length)];
    ps.items.map_random--;
    log(`🗺️ ${name(t.pid)} 랜덤 맵권 사용 → ${loc.name}!`);
    t.region = loc.region; t.npc = null;
    setLocation(loc.id, { teleport: true });
    return loc;
}

// ❓ 랜덤알파벳권 / 슈퍼랜덤알파벳권 → one alphabet card
export function useLetterBox(pid, itemId) {
    const ps = S().ps[pid];
    if (!(ps.items[itemId] > 0)) return null;
    const pool = ITEM_BY_ID[itemId]?.superLetter ? ALPHABET : ALL_LETTERS;
    const L = pool[Math.floor(Math.random() * pool.length)];
    ps.items[itemId]--;
    ps.items[cardId(L)] = (ps.items[cardId(L)] || 0) + 1;
    log(`❓ ${name(pid)} ${ITEM_BY_ID[itemId].name} → ${L}`);
    Store.saveSeason();
    return L;
}

// 🎰/🃏 30 s boosters (wall clock): t.boost = { slot: until, casino: until }
export function useBoost(kind) {
    const s = S(), t = s.turn, ps = s.ps[t?.pid];
    const id = kind === "slot" ? "slot_boost" : "casino_boost";
    if (!t || !(ps.items[id] > 0)) return false;
    ps.items[id]--;
    (t.boost ||= {})[kind] = Date.now() + BOOST_SECONDS * 1000;
    log(`${kind === "slot" ? "🎰" : "🃏"} ${name(t.pid)} ${ITEM_BY_ID[id].name} 사용! (${BOOST_SECONDS}초)`);
    Store.saveSeason();
    return true;
}
export const boostLeft = kind => { const u = S()?.turn?.boost?.[kind]; return u ? Math.max(0, Math.ceil((u - Date.now()) / 1000)) : 0; };

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
        case "earn_min": return (st.earn || 0) >= m.v;
        case "spell": return !!st.spellOk;
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
        case "earn_min": return { cur: st.earn || 0, goal: m.v, label: `돈벌기 ${(st.earn || 0).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "spell": return { cur: met ? 1 : 0, goal: 1, label: met ? "🐝 Spelling Bee 성공!" : "🐝 Spelling Bee 코너가 있는 맵에서 단어를 맞히세요" };
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
        // fewmaps_round / fewgear: fewest distinct maps / fewest gear-map visits this round (ties)
        if (m.rule === "fewmaps_round") cands = extremeGroup(live, "roundMaps", 1, 1);
        else if (m.rule === "fewgear") cands = extremeGroup(live, "roundGear", 1, 1);
        else {
            const g = extremeGroup(live, "spins", 1, m.rule === "fewspins_poor" ? 2 : 1);
            cands = m.rule === "fewspins_poor" ? [...g].sort((a, b) => s.ps[a].money - s.ps[b].money).slice(0, 2) : g;
        }
        for (const pid of live) if (s.results[pid]) s.results[pid].pass = !cands.includes(pid);
    } else cands = live.filter(pid => !s.results[pid]?.pass);
    s.allPassed = cands.length === 0;
    // ⭐ special frame / special frame effect: each gives 10% (both 20%) to be let off the candidate
    // list — only while there are more than 4 candidates. The player moves to the "success" column.
    s.exempt = [];
    for (const pid of shuffle(cands)) {
        if (cands.length <= 4) break;
        const d = Store.getDecor?.(pid) || {};
        const f = isSpecialFrame(d.frame), e = isSpecialEffect(d.effect);
        if (!(f || e) || Math.random() >= (f ? 0.1 : 0) + (e ? 0.1 : 0)) continue;
        const why = f && e ? "특수프레임·특수프레임효과" : f ? "특수프레임" : "특수프레임효과";
        cands = cands.filter(x => x !== pid);
        s.results[pid] = { ...(s.results[pid] || { stats: {} }), pass: true, exempt: why };
        s.exempt.push({ pid, why });
        log(`⭐ ${name(pid)}은(는) ${why}으로 인해 탈락후보에서 면제되었다!`);
    }
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
