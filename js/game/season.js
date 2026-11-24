// =====================================================================
// Season rules: roster, rounds, missions, turns, judging, elimination.
// Pure state changes on Store.season — screens call these and re-render.
// =====================================================================
import { CONFIG } from "../config.js";
import { Store } from "../core/store.js";
import { MISSIONS, ALPHABET, ALL_LETTERS, EXTRA_LETTERS, brandKey, JACKPOT_RANK, LOCATIONS, LOC_BY_ID, PET_BY_ID, PETFX_BY_ID, LOANS, REGIONS, ITEM_BY_ID, ITEMS, SHOP_LIMIT, passIdOf, cardId, WEAPON_BY_ID, isDeadWeapon, npcHarmful, HOPE_MESSAGES, SANTA_GIFTS, BOOST_SECONDS, isSpecialFrame, isSpecialEffect } from "../data/catalog.js";
import { shuffle, pick } from "../core/util.js";
import { lang } from "../core/i18n.js";
import { HONOR_KINDS, honorPrizes, drawPrize, rollAnvils, anvilTotal, HONOR_BUDDY_GOLD } from "../data/honor.js";
import { sandboxNextTurn } from "./sandbox.js";
import { emoHas, randomNatureSafe, monsOf as emoMons, totalWeapons as emoWeapons, totalTraits as emoTraits, giveItem as emoGiveItem, newMon as emoNewMon, addMon as emoAddMon } from "../emomon/game.js";
import * as RV from "./revival.js";
import { isSurvivalPass } from "../data/catalog.js";
import { infect, cure, kidnap, isKidnapped, KIDNAP_ID, diseaseTick, whoOk, WHO_TEXT, ownsMon, ownsTypes, typeGateType, typeGateTypes, keepMons, arrivalInfection, noteKidnap } from "./extra.js";
import { FOOD_START } from "../data/life.js";
import { mapNo } from "../data/mapAdmin.js";
import { SPECIAL_BY_ID, makeTags } from "./specialSeason.js";
// other modules (game/employ.js) watch what happens during play: a map visited · a job done · a slot spin / casino play
export const locationHooks = [], jobHooks = [], playHooks = [];
const runHooks = (list, ...a) => { for (const f of list) try { f(...a); } catch (e) { console.error(e); } };
// 📣 game events other rules listen to (game/employ.js in-company missions): "capture" · "spell" · "help" · "turnEnd"
export const eventHooks = [];
export const emitEvent = (kind, pid, data = {}) => runHooks(eventHooks, kind, pid, data);
// 📊 season counters the missions read (ps.<key> for the season · turn.stats.<key> for this turn)
//   refused (입장 거절) · eats (식량 소비) · wxDmg (날씨 HP 피해) · lodgeIn (숙소 입장) · begs (구걸 횟수)
//   jobGold (직업 + 회사 급여) · earnGold (돈벌기) · spellWins · shopCount { general, discount, … }
export function bump(pid, key, n = 1) {
    const s = S(), ps = s?.ps?.[pid];
    if (!ps) return;
    ps[key] = (ps[key] || 0) + n;
    if (s.turn?.pid === +pid) s.turn.stats[key] = (s.turn.stats[key] || 0) + n;
}
export const noteRefuse = pid => { bump(pid, "refused"); Store.saveSeason(); };

export const S = () => Store.season;

// ✨ special: { id, plan } from game/specialSeason.js specialStatus() — the 20 players are fixed up front
export function newSeason(special = null) {
    const number = (Store.seasonCount || 0) + 1;
    Store.seasonCount = number;
    Store.season = {
        number, status: "select", startedAt: new Date().toISOString(),
        roster: [], ps: {}, round: 0, mission: null, order: [], turnIdx: 0, turn: null,
        results: {}, candidates: [], history: [], log: [],
        ...(special && SPECIAL_BY_ID[special.id] ? { special: { id: special.id, name: SPECIAL_BY_ID[special.id].name, emoji: SPECIAL_BY_ID[special.id].emoji, tags: makeTags(SPECIAL_BY_ID[special.id], special.plan) }, plan: [...special.plan] } : {})
    };
    Store.saveSeason(true);
    return Store.season;
}

export function selectionPool() {
    const s = S();
    const taken = new Set(s.roster);
    return Store.players.filter(p => !taken.has(p.id));
}
// 🎖️ players who already took part in an earlier season: at most 5 of them in a season's 20
export const MAX_VETERANS = 5;
export const isVeteran = id => (Store.results || []).some(r => r.playerId === +id && r.season !== S()?.number);
export const veteransIn = ids => ids.filter(isVeteran).length;
const vetPool = pool => veteransIn(S()?.roster || []) >= MAX_VETERANS ? pool.filter(p => !isVeteran(p.id)) : pool;
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
// ---- quota draft: 3 per country (6 countries = 18) + 2 more from any of them = 20,
// with exactly 10 male / 10 female and 10 JAMES / 10 DYLAN handlers — each handler gets 5 men + 5 women.
// A full valid roster is drawn up front (s.plan, weighted like pickForSelection);
// SPIN reveals its members one at a time in random order.
export const SELECT_COUNTRIES = ["Emo World", "MJ World", "Foggy Nation", "Polynesia", "Ground Town", "Dung Town"];
export const SELECT_PER_COUNTRY = 3;
const normC = c => String(c || "").toLowerCase().replace(/[^a-z]/g, "").replace(/^emworld$/, "emoworld");
export const selCountry = p => SELECT_COUNTRIES.find(c => normC(c) === normC(p?.country)) || null;
// fluid / trans (any gender other than female) count as male for the 10 / 10 split
export const selGender = p => { const g = String(p?.gender || "").trim().toLowerCase(); return !g ? null : g === "female" ? "female" : "male"; };
export const selHandler = p => { const x = String(p?.handler || "").trim().toUpperCase(); return x === "JAMES" || x === "DYLAN" ? x : null; };
export function selectionCounts(ids) {
    const c = { country: {}, gender: {}, handler: {}, hg: {} };
    for (const id of ids) {
        const p = Store.player(id);
        const k = selCountry(p), g = selGender(p), hd = selHandler(p);
        if (k) c.country[k] = (c.country[k] || 0) + 1;
        if (g) c.gender[g] = (c.gender[g] || 0) + 1;
        if (hd) c.handler[hd] = (c.handler[hd] || 0) + 1;
        if (hd && g) c.hg[hd + ":" + g] = (c.hg[hd + ":" + g] || 0) + 1;
    }
    return c;
}
export function buildSelectionPlan(fixed = [], pool = selectionPool(), tries = 400) {
    const N = CONFIG.SEASON_SIZE, half = Math.floor(N / 2), quarter = Math.ceil(half / 2), need = N - fixed.length;
    const elig = pool.filter(p => selCountry(p) && selGender(p) && selHandler(p));
    if (need <= 0) return [];
    // weighted random order in one pass (key = u^(1/w)): same odds as pickForSelection
    const prev = prevSeasonPlayers();
    const wOf = p => prev.has(p.id) ? REPICK_WEIGHT : 1;
    const vet = new Set(elig.filter(p => isVeteran(p.id)).map(p => p.id));
    for (let t = 0; t < tries; t++) {
        const order = elig.map(p => [Math.pow(Math.random(), 1 / wOf(p)), p]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
        const c = selectionCounts(fixed), picked = [];
        let vets = veteransIn(fixed);
        const take = p => { picked.push(p.id); if (vet.has(p.id)) vets++; const k = selCountry(p), g = selGender(p), hd = selHandler(p); c.country[k] = (c.country[k] || 0) + 1; c.gender[g] = (c.gender[g] || 0) + 1; c.handler[hd] = (c.handler[hd] || 0) + 1; c.hg[hd + ":" + g] = (c.hg[hd + ":" + g] || 0) + 1; };
        const hg = p => selHandler(p) + ":" + selGender(p); // 👥 handler × gender: 5 + 5 per handler
        const fits = p => (c.gender[selGender(p)] || 0) < half && (c.handler[selHandler(p)] || 0) < half && (c.hg[hg(p)] || 0) < quarter && (vets < MAX_VETERANS || !vet.has(p.id));
        // 1) three from every country
        for (const p of order) if (picked.length < need && (c.country[selCountry(p)] || 0) < SELECT_PER_COUNTRY && fits(p)) take(p);
        if (SELECT_COUNTRIES.some(k => (c.country[k] || 0) < SELECT_PER_COUNTRY)) continue;
        // 2) the rest (2) from any of the six countries
        for (const p of order) if (picked.length < need && !picked.includes(p.id) && fits(p)) take(p);
        if (picked.length === need && c.gender.male === half && c.gender.female === half && c.handler.JAMES === half && c.handler.DYLAN === half) return picked;
    }
    return null; // not enough players to meet every quota
}
// the next player for SPIN (null → quotas impossible, use the plain weighted draw)
export function nextSelection() {
    const s = S(), pool = selectionPool(), poolIds = new Set(pool.map(p => p.id));
    // ✨ special season: only the roster drawn when it was created (game/specialSeason.js)
    if (s.special) { const left = (s.plan || []).filter(id => !s.roster.includes(id) && poolIds.has(id)); return left.length ? Store.player(left[Math.floor(Math.random() * left.length)]) : null; }
    if (!s.plan ||s.plan.some(id => !poolIds.has(id) && !s.roster.includes(id))) s.plan = buildSelectionPlan(s.roster, pool) || [];
    const left = (s.plan || []).filter(id => !s.roster.includes(id));
    if (left.length) return Store.player(left[Math.floor(Math.random() * left.length)]);
    const open = vetPool(pool);
    return open.length ? pickForSelection(open) : null;
}
// everyone still to be drawn (SKIP)
export function restSelection() {
    const out = [], s = S();
    while (s.roster.length < CONFIG.SEASON_SIZE) { // roster already holds the temporary picks
        const p = nextSelection();
        if (!p) break;
        out.push(p);
        s.roster.push(p.id); // temporarily, so the next call skips it
    }
    s.roster.splice(s.roster.length - out.length, out.length);
    return out;
}
export function addToRoster(pid) {
    const s = S();
    if (s.roster.includes(pid) || s.roster.length >= CONFIG.SEASON_SIZE) return;
    s.roster.push(pid);
    s.ps[pid] = { money: CONFIG.START_MONEY, points: 0, hp: CONFIG.START_HP, food: FOOD_START, pet: null, petEffect: null, weapons: [], items: {}, loanGold: 0, loan: null, use: { slot: 0, casino: 0 }, extra: { slot: 0, casino: 0 }, out: false, outRound: null, rank: null, visited: [], totals: { slotNet: 0, casinoNet: 0, points: 0, spins: 0, plays: 0 } };
    log(`🎰 ${name(pid)} 참가 확정!`);
    // gold won outside a season (survival corner) comes along
    const w = Store.wallets?.[pid] || 0;
    if (w > 0) { s.ps[pid].money += w; delete Store.wallets[pid]; Store.saveWallets(); log(`👛 ${name(pid)} 시즌 밖에서 번 ${w.toLocaleString()}G 합류`); }
    restoreStash(pid);
    Store.saveSeason();
}

// ---------------------------------------------------------------- 🎒 belongings kept between seasons
// items · pet + pet effect · weapons · EmoMon (monsters, bags, extra slots) · lotto items.
// Saved for the whole roster when a season ends, given back when the player joins another season.
// Gold and points carry over too (the carried gold replaces the start gold; wallet gold is added on top). HP starts fresh.
export const LOAN_PENALTY_GOLD = 100000;
const EMO_KEEP = ["mons", "battle", "bag", "wbag", "tbag", "extraSlots"];
export function stashOf(ps, season) {
    const emo = ps.emo ? Object.fromEntries(EMO_KEEP.filter(k => ps.emo[k] != null).map(k => [k, structuredClone(ps.emo[k])])) : null;
    if (emo?.mons) for (const m of emo.mons) { m.hp = null; } // monsters come back healed
    return {
        season, items: Object.fromEntries(Object.entries(ps.items || {}).filter(([, n]) => n > 0)),
        pet: ps.pet || null, petEffect: ps.petEffect || null, weapons: [...(ps.weapons || [])],
        emo, lotto: ps.lotto ? Object.fromEntries(Object.entries(ps.lotto).filter(([, n]) => n > 0)) : null,
        money: Math.max(0, Math.round(ps.money || 0)), points: Math.round(ps.points || 0),
        // 🏦 eliminated with an unpaid loan → next season the debt is forgiven but the season gold is only LOAN_PENALTY_GOLD
        ...(ps.loan && ps.loan.owed > 0 ? { unpaidLoan: { owed: Math.round(ps.loan.owed), principal: ps.loan.principal, type: ps.loan.type, out: !!ps.out } } : {})
    };
}
export function stashSeason(s = S()) {
    if (!s || s.sandbox || s.testSeason || s.stashed) return;
    Store.stash ||= {};
    for (const pid of s.roster) if (s.ps[pid]) Store.stash[pid] = stashOf(s.ps[pid], s.number);
    s.stashed = true;
    Store.saveStash();
}
function restoreStash(pid) {
    const s = S(), st = Store.stash?.[pid];
    if (!st || s.sandbox) return;
    const ps = s.ps[pid];
    for (const [id, n] of Object.entries(st.items || {})) ps.items[id] = (ps.items[id] || 0) + n;
    if (st.pet) ps.pet = st.pet;
    if (st.petEffect) ps.petEffect = st.petEffect;
    ps.weapons = [...ps.weapons, ...(st.weapons || [])];
    if (st.emo) ps.emo = { ...structuredClone(st.emo), finds: 0 };
    if (st.lotto) ps.lotto = { ...st.lotto };
    if (st.points != null) ps.points = st.points;
    delete Store.stash[pid];
    Store.saveStash();
    if (st.unpaidLoan) {
        // 🏦 the loan is forgiven, but the whole season gold is just 100,000G (no start gold, no carried gold)
        ps.money = LOAN_PENALTY_GOLD;
        ps.loanPenalty = { ...st.unpaidLoan, season: st.season, carried: st.money || 0, shown: false };
        log(`🏦 ${name(pid)} 시즌 ${st.season}에서 대출 ${st.unpaidLoan.owed.toLocaleString()}G를 갚지 않고 탈락 → 빚 탕감 · 페널티로 시즌 골드 ${LOAN_PENALTY_GOLD.toLocaleString()}G만 지급`);
        log(`🎒 ${name(pid)} 시즌 ${st.season}의 포인트 · 아이템 · 펫 · 무기 · 몬스터를 가지고 합류 (골드 이월 없음)`);
        return;
    }
    if (st.money != null) ps.money += st.money; // carried gold comes ON TOP of the new season's start gold
    log(`🎒 ${name(pid)} 시즌 ${st.season}의 골드 · 포인트 · 아이템 · 펫 · 무기 · 몬스터를 가지고 합류${st.money != null ? ` (이월 ${st.money.toLocaleString()}G + 시작 ${CONFIG.START_MONEY.toLocaleString()}G · ${(st.points || 0).toLocaleString()}P)` : ""}`);
}
export function rosterFull() { return S().roster.length >= Math.min(CONFIG.SEASON_SIZE, Store.players.length); }

export const alive = () => S().roster.filter(pid => !S().ps[pid].out);
export const name = pid => { const p = Store.player(pid); return p ? `${(lang() === "en" && p.player_name) || p.name_ko || p.player_name}` : "?"; };
// every entry remembers whose turn it was (pid) so the in-play log can show only that player's lines
export function log(msg, pids) { const s = S(); if (!s) return; const who = [...new Set([...(pids || []), s.turn?.pid].filter(Boolean))]; s.log.unshift({ t: Date.now(), msg, ...(who.length ? { pids: who } : {}) }); s.log = s.log.slice(0, 300); }

// ---------------------------------------------------------------- rounds
export function tierForRound() {
    const s = S();
    const total = Math.max(1, s.roster.length - CONFIG.FINALISTS);
    const eliminated = s.roster.length - alive().length;
    return Math.min(4, Math.floor(eliminated * 5 / total));
}
// other modules (bank transfers) run code when a round starts / the season ends
export const roundHooks = [], seasonEndHooks = [];
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
    // 🤒 flu −5 / cancer −10 HP at every round start (HP 0 → dead)
    s.sickTick = s.round > 1 ? diseaseTick() : [];
    try { keepMons(); } catch (e) { console.warn(e); } // 🏟️ arena opponents for later seasons
    if (alive().length <= CONFIG.FINALISTS) s.status = "final";
    for (const f of roundHooks) try { f(s); } catch (e) { console.error(e); }
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
// 🔄 Survival Land: every map's general shop sells only 1 thing (per map, per round)
const svShopKey = (pid, shopId) => { const l = LOC_BY_ID[S().turn?.pid === pid ? S().turn.loc : null]; return shopId === "general" && l?.region === "survival" ? "sv:" + l.id : null; };
export const shopLimit = (pid, shopId) => svShopKey(pid, shopId) ? 1 : (SHOP_LIMIT[shopId] ?? 1);
export function buysLeft(pid, shopId) {
    const s = S(), ps = s.ps[pid];
    const b = ps.buys?.round === s.round ? ps.buys : {};
    const sv = svShopKey(pid, shopId);
    if (sv) return Math.min(1 - (b[sv] || 0), (SHOP_LIMIT[shopId] ?? 1) - (b[shopId] || 0));
    return (SHOP_LIMIT[shopId] ?? 1) - (b[shopId] || 0);
}
export function noteBuy(pid, shopId) {
    const s = S(), ps = s.ps[pid];
    if (ps.buys?.round !== s.round) ps.buys = { round: s.round };
    ps.buys[shopId] = (ps.buys[shopId] || 0) + 1;
    (ps.shopCount ||= {})[shopId] = (ps.shopCount[shopId] || 0) + 1; // the season's purchases per shop (missions)
    const sv = svShopKey(pid, shopId);
    if (sv) ps.buys[sv] = (ps.buys[sv] || 0) + 1;
}

// ---------------------------------------------------------------- loans
export function loanStatus(pid) {
    const s = S(), ps = s.ps[pid];
    if (RV.inRevival(pid)) return { ok: false, why: "🔄 패자부활전 중에는 대출을 받을 수 없습니다." };
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
    ps.loansTaken = (ps.loansTaken || 0) + 1;
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
// 📜 the roulette's pick. Round 1 of every season: a battle mission at most 20% of the time,
// so everybody gets at least one round of play first.
export const FIRST_ROUND_BATTLE = 0.2;
export function pickMission(deck) {
    const isB = m => m.type === "battle";
    const b = deck.filter(isB), rest = deck.filter(m => !isB(m));
    if (S().round === 1 && b.length && rest.length && b.length / deck.length > FIRST_ROUND_BATTLE)
        return Math.random() < FIRST_ROUND_BATTLE ? pick(b) : pick(rest);
    return pick(deck);
}
export function setMission(m) {
    const s = S();
    s.mission = { ...m };
    // random alphabet letters are drawn now: "?" = 알파벳 카드 (G·A·M·B·L·E·R·S) · "*" = 알파벳 권 (the other letters)
    if (m.letter === "*" || m.letter === "?") {
        const L = pick(m.letter === "*" ? EXTRA_LETTERS : ALPHABET);
        s.mission.letter = L;
        s.mission.text = `${m.text} → 이번 라운드: ${m.letter === "*" ? "알파벳 권" : "알파벳 카드"} ${L}`;
    }
    if (m.type === "card2") {
        s.mission.letters = [pick(ALPHABET), pick(EXTRA_LETTERS)];
        s.mission.text = `${m.text} → 이번 라운드: 카드 ${s.mission.letters[0]} · 권 ${s.mission.letters[1]}`;
    }
    s.dual = null; // ⚔️+🐾 double battle results
    // 🐾 random nature mission: the nature is drawn now
    if (m.type === "emo_has" && m.nature === "?") {
        const n = randomNatureSafe();
        s.mission.nature = n;
        s.mission.text = `🐾 Nature(성격)이 ${n}인 몬스터가 없는 플레이어 중 1명 탈락 (랜덤 추첨: ${n})`;
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
,
    // 🐾 EmoMon
    emoMons: pid => emoMons(pid).length, emoWeapons: pid => emoWeapons(pid), emoTraits: pid => emoTraits(pid),
    // season counters (see bump())
    refused: pid => S().ps[pid].refused || 0, eats: pid => S().ps[pid].eats || 0, lodgeIn: pid => S().ps[pid].lodgeIn || 0,
    begs: pid => S().ps[pid].begs || 0, wxDmg: pid => S().ps[pid].wxDmg || 0,
    labBuys: pid => S().ps[pid].emo?.labBuys || 0, hospital: pid => S().ps[pid].emo?.hospUses || 0,
    shopBuys: pid => { const ps = S().ps[pid], c = ps.shopCount || {}; return (c.general || 0) + (c.discount || 0) + (ps.emo?.labBuys || 0) + (ps.emo?.shopTotal || 0); },
    emoItems: pid => Object.values(S().ps[pid].emo?.bag || {}).reduce((a, n) => a + Math.max(0, n || 0), 0),
    // lowest / highest map number visited this season (no visit → last / first)
    mapLo: pid => Math.min(9999, ...(S().ps[pid].visited || []).map(id => mapNo(id) ?? 9999)),
    mapHi: pid => Math.max(0, ...(S().ps[pid].visited || []).map(id => mapNo(id) ?? 0)),
    gear: pid => { const ps = S().ps[pid], d = Store.getDecor?.(pid) || {}; return [ps.pet, ps.petEffect, d.frame, d.effect].filter(Boolean).length; }
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
        fewmaps: () => extremeGroup(live, "maps", 1), fewitems: () => extremeGroup(live, "items", 1),
        // 🐾 EmoMon
        fewmons: () => extremeGroup(live, "emoMons", 1), fewemoweapons: () => extremeGroup(live, "emoWeapons", 1), fewemotraits: () => extremeGroup(live, "emoTraits", 1),
        // 🌦️ weather · 🍚 food · 🏨 lodging · shops · map numbers · letters (season records)
        wxhit: () => live.filter(p => (s.ps[p].wxDmg || 0) > 0), wxnone: () => live.filter(p => !(s.ps[p].wxDmg > 0)), wx20: () => live.filter(p => (s.ps[p].wxDmg || 0) >= 20),
        not88: () => live.filter(p => Math.floor(s.ps[p].money) % 100 !== 88),
        foodlt5: () => live.filter(p => (s.ps[p].eats || 0) < 5), fewfood: () => extremeGroup(live, "eats", 1),
        lowmapno: () => extremeGroup(live, "mapLo", 1), highmapno: () => extremeGroup(live, "mapHi", -1),
        fewlab: () => extremeGroup(live, "labBuys", 1), fewshops: () => extremeGroup(live, "shopBuys", 1),
        fewbeg: () => extremeGroup(live, "begs", 1), fewhospital: () => extremeGroup(live, "hospital", 1),
        gear3: () => live.filter(p => METRIC.gear(p) < 3),
        nocard: () => live.filter(p => !(s.ps[p].items[cardId(s.mission?.letter)] > 0))
    };
    // 🏨 the fewest lodging visits vs the most: one from each end
    if (rule === "lodgeminmax" && live.length >= 2) {
        const lo = shuffle(extremeGroup(live, "lodgeIn", 1, 1))[0], hiG = extremeGroup(live.filter(p => p !== lo), "lodgeIn", -1, 1);
        const pair = [lo, shuffle(hiG)[0]].sort((a, b) => (s.ps[b].money - s.ps[a].money) || (s.ps[b].points - s.ps[a].points));
        return { pair, pool: [...new Set([lo, ...hiG])] };
    }
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
    Store.recordHighlight("battle", { a: winner, b: loser, winner, emo: !!s.mission?.emo, hpA: Math.round(s.ps[winner].hp), weapons: [[...(s.ps[winner].weapons || [])].slice(0, 4), [...(s.ps[loser].weapons || [])].slice(0, 4)] });
    log(`⚔️ 배틀 미션: ${name(winner)} 승리 (HP ${Math.round(s.ps[winner].hp * 100) / 100}), ${name(loser)} 패배`);
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
    log(`🧪 ${name(pid)} HP ${Math.round(before * 100) / 100} → ${Math.round(ps.hp * 100) / 100}`);
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
    ps.earnGold = (ps.earnGold || 0) + gold;
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
    ps.begs = (ps.begs || 0) + 1;
    if (s.turn?.pid === pid) s.turn.stats.beg = (s.turn.stats.beg || 0) + gold;
    log(`🥺 ${name(pid)} 구걸 +${gold.toLocaleString()}G`);
    if (gold > 0) Store.recordHighlight("beg", { pid, amount: gold, loc: s.turn?.loc || null });
    Store.saveSeason(true);
}
// job corner: once per turn, the job's time comes off the turn timer
export const canWork = pid => S().turn?.pid === pid && !S().turn.worked;
// 🚪 "그만두기" on the drawn job also uses up this turn's job try (no pay · no time cut)
export function quitJob(pid, career) {
    const s = S(), t = s.turn;
    if (!t || t.pid !== pid) return;
    t.worked = true;
    log(`💼 ${name(pid)} ${career.name} 그만두기 — 이번 턴의 직업 시도 사용`);
    Store.saveSeason(true);
}
export function payJob(pid, career, gold, card = null) {
    const s = S(), ps = s.ps[pid], t = s.turn;
    if (t) { t.worked = true; t.remaining = Math.max(0, t.remaining - career.cut); t.stats.job = (t.stats.job || 0) + gold; t.stats.jobs = (t.stats.jobs || 0) + 1; }
    ps.money += gold;
    ps.jobGold = (ps.jobGold || 0) + gold;
    if (card) ps.items[cardId(card)] = (ps.items[cardId(card)] || 0) + 1;
    runHooks(jobHooks, pid, career.id);
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

// ---------------------------------------------------------------- 🏅 Honorarium corners
// past finishes (finished seasons only) at rank ≤ maxRank, oldest season first
export const honorRecords = (pid, maxRank) => Store.results.filter(r => r.playerId === +pid && r.rank != null && r.rank <= maxRank).sort((a, b) => a.season - b.season || a.rank - b.rank);
export const honorRecordText = (pid, maxRank) => honorRecords(pid, maxRank).map(r => maxRank === 1 ? `${r.season}시즌 우승` : `${r.season}시즌 ${r.rank}위`).join(" · ");
// test mode: the test player may try every corner
export const honorEligible = (pid, kind) => S()?.testSeason ? false : !!S()?.sandbox || honorRecords(pid, HONOR_KINDS[kind].rank).length > 0;
// every other player who ever finished in the TOP N of any season
export function honorPool(pid, kind) {
    const n = HONOR_KINDS[kind].rank;
    const ids = [...new Set(Store.results.filter(r => r.rank != null && r.rank <= n && r.playerId !== +pid).map(r => r.playerId))];
    return ids.filter(id => Store.player(id)).sort((a, b) => a - b);
}
export const honorLeft = (pid, kind) => HONOR_KINDS[kind].uses - (S().ps[pid].honor?.[kind] || 0);
// gold for someone who may not be playing right now: alive in this season → their purse,
// otherwise their wallet (added when they join a season, like the survival corner)
function giftGold(pid, gold) {
    const s = S();
    if (s.ps[pid] && !s.ps[pid].out) { s.ps[pid].money += gold; return "season"; }
    if (s.sandbox) return "wallet"; // test mode: nothing is kept
    Store.wallets[pid] = (Store.wallets[pid] || 0) + gold;
    Store.saveWallets();
    return "wallet";
}
export function grantPrize(pid, prize) {
    const ps = S().ps[pid];
    if (!prize || prize.kind === "none") return;
    if (prize.kind === "gold") ps.money += +prize.gold || 0;
    else if (prize.kind === "item" && prize.item) ps.items[prize.item] = (ps.items[prize.item] || 0) + Math.max(1, +prize.n || 1);
}
// Honor Me: everything is decided and paid at once (an interrupted show loses nothing).
// → { buddy, gold?, prize?, others?, anvils?, total? }
export function honorDraw(pid, kind) {
    const s = S(), ps = s.ps[pid], K = HONOR_KINDS[kind];
    if (!honorEligible(pid, kind) || honorLeft(pid, kind) <= 0) return null;
    const pool = honorPool(pid, kind);
    if (!pool.length) return null;
    const buddy = pool[Math.floor(Math.random() * pool.length)];
    (ps.honor ||= {})[kind] = (ps.honor[kind] || 0) + 1;
    const out = { kind, buddy };
    if (kind === "top10") { out.gold = 200 + Math.floor(Math.random() * 81) * 10; ps.money += out.gold; }
    else if (kind === "top6") { out.prize = drawPrize(honorPrizes("wheel")); grantPrize(pid, out.prize); }
    else if (kind === "top3") {
        const list = honorPrizes("box");
        out.prize = drawPrize(list); grantPrize(pid, out.prize);
        out.others = [drawPrize(list), drawPrize(list)]; // what the two unopened boxes held (shown after)
    } else { out.anvils = rollAnvils(); out.total = anvilTotal(out.anvils); ps.money += out.total; }
    out.buddyTo = giftGold(buddy, HONOR_BUDDY_GOLD);
    const got = out.gold != null ? `+${out.gold.toLocaleString()}G` : out.total != null ? `+${out.total.toLocaleString()}G (Anvil ${out.anvils}개)` : out.prize?.label || "꽝";
    log(`${K.emoji} ${name(pid)} ${K.name} → 선배 ${name(buddy)} · ${got} (선배에게 ${HONOR_BUDDY_GOLD}G)`);
    Store.saveSeason(true);
    return out;
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
export const npcActive = locId => locId === KIDNAP_ID || npcMaps().includes(locId); // 🦹 the kidnap room always has its boss

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

// 🧑‍⚖️ moves handled by their own screen (Priest): use a Block ticket if there is one
export function npcBlockTry(pid, move) {
    const ps = S().ps[pid];
    if (!npcHarmful(move) || !useNpcBlock(ps)) return null;
    Store.saveSeason(true);
    return { blocked: true, left: npcBlocksLeft(ps) };
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
    if (move.freeze) out.freeze = move.freeze; // 🧊 Icy Breath (screens/survivalIce.js freezes the screen)
    else if (move.profileCopy) out.profileCopy = move.profileCopy; // 🎭 Profile Copy (screens/survivalIce.js)
    else if (move.hp && move.steal) {
        // 🥷 Terrorist: HP and gold in one blow
        const before = ps.hp; ps.hp = Math.max(1, ps.hp + move.hp); out.hp = ps.hp - before;
        const g = Math.min(rnd(move.steal), Math.max(0, ps.money)); ps.money -= g; out.gold = -g;
    }
    else if (move.breakWeapon) {
        // 👾 Monster Magic!: one of the player's weapons is gone for good
        if (!ps.weapons.length) out.none = true;
        else { const ix = RV.inRevival(pid) ? RV.weaponToBreak(pid) : Math.floor(Math.random() * ps.weapons.length); out.broke = ps.weapons[ix]; ps.weapons.splice(ix, 1); }
    }
    else if (move.stealPet) {
        // 😈 evil kid: pet / pet effect / special pet / special pet effect (only if the player has that kind)
        const k = move.stealPet, isFx = k === "fx" || k === "sfx", special = k === "spet" || k === "sfx";
        const id = isFx ? ps.petEffect : ps.pet;
        const row = id ? (isFx ? PETFX_BY_ID[id] : PET_BY_ID[id]) : null;
        if (!row || (row.kind === "special") !== special) out.none = true;
        else { if (RV.inRevival(pid)) RV.losePet(pid, isFx); if (isFx) ps.petEffect = null; else ps.pet = null; out.stolePet = { kind: k, id, name: row.name }; }
    }
    else if (move.disease) { out.disease = move.disease; if (!infect(pid, move.disease, npc.name)) out.already = true; }
    else if (move.stealAll) {
        const k = move.stealAll;
        if (k === "gold") { if (ps.money > 0) { out.gold = -ps.money; ps.money = 0; } else out.none = true; }
        else if (k === "points") { if (ps.points > 0) { out.pts = -ps.points; ps.points = 0; } else out.none = true; }
        else if (k === "items" && RV.inRevival(pid)) {
            // 🔄 the revival inventory goes first — only without one are the player's own items taken
            const r = RV.takeAllItems(pid);
            if (r?.n > 0) { out.items = r.n; out.revInv = r.rev; } else out.none = true;
        }
        else if (k === "items") {
            const n = Object.values(ps.items || {}).reduce((a, x) => a + Math.max(0, x || 0), 0);
            if (n > 0) { out.items = n; ps.items = {}; ps.npcBlock = 0; } else out.none = true;
        } else if ((k === "bizGold" || k === "loanGold") && RV.inRevival(pid)) { out.none = true; // 🔄 only revival gold can be robbed
        } else if (k === "bizGold") {
            const acc = Store.bank?.accounts?.[pid];
            if (acc?.bgold > 0) { out.bgold = -acc.bgold; acc.bgold = 0; (acc.history ||= []).push({ t: Date.now(), kind: "npc", amount: out.bgold, note: `${npc.name} 강탈` }); Store.saveBank?.(); } else out.none = true;
        } else if (k === "loanGold") { if (ps.loanGold > 0) { out.loanGold = -ps.loanGold; ps.loanGold = 0; } else out.none = true; }
    }
    else if (move.stealMon) {
        const list = ps.emo?.mons || [];
        if (!list.length) out.none = true;
        else {
            const m = RV.inRevival(pid) ? RV.monToSteal(pid) : list[Math.floor(Math.random() * list.length)];
            ps.emo.mons = list.filter(x => x !== m);
            if (ps.emo.battle === m.uid) ps.emo.battle = ps.emo.mons[0]?.uid || null;
            out.mon = m.sid;
        }
    }
    else if (move.stealPts) { if (ps.points >= move.stealPts) { ps.points -= move.stealPts; out.pts = -move.stealPts; } else out.none = true; }
    else if (move.cureFlu) {
        // 🎅 Santa: cures the flu (nothing happens when the player is not sick with it)
        if (cure(pid, "flu", `${npc.name}의 치료`)) out.cured = "flu"; else out.none = true;
    }
    else if (move.giftBox) {
        // 🎅 Santa's gift box: one random present (SANTA_GIFTS weights)
        let x = Math.random() * SANTA_GIFTS.reduce((a, g) => a + g.w, 0), g = SANTA_GIFTS[0];
        for (const it of SANTA_GIFTS) { if ((x -= it.w) < 0) { g = it; break; } }
        const box = { name: g.item ? ITEM_BY_ID[g.item]?.name || g.item : g.name, emoji: g.item ? ITEM_BY_ID[g.item]?.emoji || "🎁" : g.emoji };
        if (g.item) ps.items[g.item] = (ps.items[g.item] || 0) + 1;
        else if (g.emo) emoGiveItem(pid, g.emo, 1);
        else if (g.mon) {
            // a monster needs a free slot — otherwise the box holds a +50 HP monster potion instead
            const ok = emoAddMon(pid, emoNewMon(g.mon, { from: "gift" }));
            if (!ok) { emoGiveItem(pid, "EMO_HP50", 1); box.full = true; box.name += " (몬스터 칸이 가득 차서 +50 HP 이모몬스터약으로 대신)"; }
        }
        out.box = box;
    }
    else if (move.stealItem) {
        // 🦹 one random item from the bag
        const own = Object.entries(ps.items || {}).filter(([, n]) => n > 0).map(([id]) => id);
        if (!own.length) out.none = true;
        else if (RV.inRevival(pid)) { const r = RV.takeItem(pid); out.stoleItem = r.id; out.revInv = r.rev; }
        else { const id = own[Math.floor(Math.random() * own.length)]; ps.items[id]--; out.stoleItem = id; }
    }
    else if (move.kidnap) { out.kidnap = true; }
    else if (move.idle) out.idle = move.idle;
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
        if (ps.money >= g) { ps.money -= g; out.gold = -g; }
        else if (move.rob && ps.money > 0) { out.gold = -Math.round(ps.money); ps.money = 0; } // 🦹 the boss takes whatever there is
        else out.none = true; // too poor to rob
    } else if (move.give) { const g = rnd(move.give); ps.money += g; out.gold = g; }
    else if (move.hp) { const before = ps.hp; ps.hp = Math.max(1, Math.min(CONFIG.START_HP, ps.hp + move.hp)); out.hp = ps.hp - before; }
    else if (move.nomove) {
        const ix = ps.weapons.findIndex(w => !isDeadWeapon(w));
        if (ix >= 0) { out.weapon = ps.weapons[ix]; ps.weapons[ix] = "no_move"; } else out.none = true;
    } else if (move.kill) { out.kill = true; }
    // mission stats: who hit the player during their turn and what it did
    if (s.turn?.pid === pid) (s.turn.stats.npc ||= []).push({ npc: npc.id, hp: !!move.hp, gold: out.gold > 0, harm: npcHarmful(move) });
    const what = out.freeze ? `🧊 Icy Breath (${out.freeze}초 얼어붙음)` : out.profileCopy ? `😈 Profile Copy (${out.profileCopy}초 대신 플레이)` : out.kill ? "즉사!" : out.none ? "효과 없음" : out.kidnap ? "납치!" : out.broke ? `무기 ${WEAPON_BY_ID[out.broke]?.name || out.broke} 파괴`
        : out.stolePet ? `${out.stolePet.name} 강탈` : out.disease ? `${out.disease === "flu" ? "독감" : "암"} 감염` : out.items ? `아이템 ${out.items}개 전부 강탈`
        : out.bgold ? `Business Gold ${(-out.bgold).toLocaleString()} 강탈` : out.loanGold ? `대출 골드 ${(-out.loanGold).toLocaleString()} 강탈` : out.mon ? "이모몬스터 강탈"
        : out.cured ? "독감 치료" : out.box ? `선물상자 → ${out.box.name}` : out.stoleItem ? `${ITEM_BY_ID[out.stoleItem]?.name || out.stoleItem} 강탈`
        : out.pts ? `${out.pts}P` : out.idle ? out.idle : out.hope ? `"${out.hope}"` : out.gift ? `${ITEM_BY_ID[out.gift]?.name} 선물` : out.shop ? "보따리상점 OPEN"
        : out.copied ? `${WEAPON_BY_ID[out.weapon]?.name} 복사 공격${out.hp ? ` HP ${out.hp}` : " (효과 없음)"}`
        : out.gold ? `${out.gold > 0 ? "+" : ""}${out.gold.toLocaleString()}G` : out.hp != null ? `HP ${out.hp > 0 ? "+" : ""}${out.hp}` : out.weapon ? "무기 → No Move" : "저주";
    log(`${npc.emoji} ${npc.name} → ${name(pid)}: ${what}`);
    if (s.turn?.pid === pid && s.turn.loc === KIDNAP_ID) noteKidnap(pid, { hit: { npc: npc.name, emoji: npc.emoji, what, kill: !!out.kill, blocked: false } });
    if (out.kill && killPlayer(pid, `${npc.emoji} ${npc.name}에게 즉사`, { npc }) === false) { out.kill = false; out.shield = true; }
    if (out.kill) { /* dead */ }
    else if (out.kidnap) kidnap(pid);
    else Store.saveSeason(true);
    return out;
}
// an NPC attack handled by its own screen (⛪ Priest …) — counts for the 🛡️ revival mission
export function noteNpcAttack(pid, npcId) {
    const t = S()?.turn;
    if (t?.pid === pid) { (t.stats.npc ||= []).push({ npc: npcId, harm: true }); Store.saveSeason(); }
}
// 🎭 Profile Copy: 40% of the time the player can't die while the fake profile plays (until the minute is over)
export function deathShield(pid) {
    const t = S()?.turn;
    return !!(t && +t.pid === +pid && t.possessSafe && (t.possessUntil || 0) > Date.now());
}
// death outside the judge (reaper): out at once, the turn is over
// → false when the 🎭 death shield kept the player alive (HP 1)
export function killPlayer(pid, why, { npc = null, quiet = false, hl = null } = {}) {
    const s = S();
    if (deathShield(pid)) {
        const ps = s.ps[pid];
        ps.hp = 1; // the deadly blow still lands — only the death is held off
        log(`🛡️ ${name(pid)} 죽을 뻔했지만 (${why}) — 가짜 프로필이 조종하는 동안은 죽지 않습니다 (HP 1)`);
        document.dispatchEvent(new CustomEvent("gb:shield", { detail: { pid, why } }));
        Store.saveSeason(true);
        return false;
    }
    // 🔊 screens that care (Survival Land death toll) hear it before the turn moves on
    // (🔄 revival players are "out" already — their death in Survival Land is shown too, once)
    const revDeath = RV.revivalTurns() && RV.inRevival(pid) && !RV.rv()?.dead?.includes(pid);
    if (!s.ps[pid]?.out || revDeath) document.dispatchEvent(new CustomEvent("gb:death", { detail: { pid, why, npc: !!npc, quiet } }));
    if (RV.revivalTurns() && RV.inRevival(pid)) { RV.revivalKill(pid, why); return; } // 🔄 a death in the revival = a failed revival
    if (s.ps[pid].out) return;
    const rank = alive().length;
    Object.assign(s.ps[pid], { out: true, outRound: s.round, rank, hp: 0 });
    s.history.push({ round: s.round, npcDeath: true, eliminated: pid, rank, why });
    Store.recordHighlight(npc ? "npc_kill" : hl || "death", { pid, why, rank, loc: s.turn?.pid === pid ? s.turn.loc : null, npc: npc ? { id: npc.id, name: npc.name, emoji: npc.emoji, art: npc.art || null } : null });
    log(`☠️ ${name(pid)} ${why} (${rank}위)`);
    // ☠️ an instant death that leaves only 2 alive: everyone else's turns stop — straight to the final
    if (!(s.sandbox && !s.testSeason) && alive().length <= CONFIG.FINALISTS && ["turns", "battle", "mission", "judge"].includes(s.status)) {
        s.turn = null; s.status = "final";
        log(`🏁 생존자 ${alive().length}명 — 남은 플레이를 멈추고 바로 최종 대결로!`);
        Store.saveSeason(true);
        return;
    }
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
    if (s.sandbox && !s.testSeason) { sandboxNextTurn(); return; } // map test: no judging, just the next turn
    if (RV.revivalTurns()) { RV.revivalAdvance(); return; } // 🔄 패자부활전: the eliminated play, the claw picks the revived
    while (s.turnIdx < s.order.length && s.ps[s.order[s.turnIdx]].out) s.turnIdx++;
    if (s.turnIdx >= s.order.length) judge();
}

// ---------------------------------------------------------------- turns
export const currentPid = () => S().order[S().turnIdx];
export function startTurn() {
    const s = S();
    const pid = currentPid();
    s.turn = { startPts: s.ps[pid]?.points || 0, pid, loc: null, region: null, remaining: RV.revivalTurns() ? RV.SURVIVAL_SECONDS : CONFIG.TURN_SECONDS, running: false, ticket: false, stats: { pid, slotNet: 0, casinoNet: 0, points: 0, bonus: 0, jackpot: null, spins: 0, plays: 0, slotWins: 0, five: 0, freeSpins: 0, beg: 0, job: 0, cardUsed: false, bonusAt: 0, brandWin: {}, betWin: {}, jobs: 0, locs: [], npc: [] } };
    // ⛓️ kidnapped: no roulette — straight back into the terrorists' room (10 minutes as usual)
    if (isKidnapped(pid)) { s.turn.loc = KIDNAP_ID; s.turn.region = "kidnap"; s.turn.running = true; s.turn.kidnapIn = s.turn.remaining; }
    Store.saveSeason();
    return s.turn;
}

// ---- regions: region roulette → map roulette inside it
export function regionStatus(pid, region) {
    const ps = S().ps[pid];
    if (region.off) return { ok: false, why: "닫힘" };
    if (RV.revivalTurns() && region.id !== "survival") return { ok: false, why: "🔄 패자부활전: Survival Land만" };
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
    if (loc.kidnap) return { ok: false, why: "갈 수 없는 곳" };
    // 🐾 EmoMonster Casino: monster owners only · 🔷 Type Casino: owners of this round's attribute only
    if (loc.needMon && !ownsMon(pid)) return { ok: false, why: "이모몬스터가 있어야 입장" };
    if (loc.typeGate && !ownsTypes(pid, typeGateTypes())) return { ok: false, why: `${typeGateType()} 속성 몬스터 보유자만` };
    const r = loc.req;
    if (!r) return { ok: true };
    // 🚧 restricted zone: only that kind of player — anybody else needs the map pass (used up on entry)
    if (r.who) {
        if (whoOk(pid, r.who)) return { ok: true };
        const pass = passIdOf(loc);
        if ((ps.items[pass] || 0) > 0) return { ok: true, pass };
        return { ok: false, why: `${WHO_TEXT[r.who] || r.who} 전용 (맵권으로 입장)` };
    }
    // 🌲 EmoMonster Forest: Bug / Grass monster owners walk in free
    if (r.freeTypes && ownsTypes(pid, r.freeTypes)) return { ok: true, freeBy: r.freeTypes };
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
    if (loc.needMon && !ownsMon(pid)) missing.push("이모몬스터가 없습니다 → EmoMon Capture에서 몬스터부터 잡으세요");
    if (loc.typeGate && !ownsTypes(pid, typeGateTypes())) missing.push(`이번 라운드 Type Casino는 ${typeGateTypes().join(" · ")} 속성 중 하나의 몬스터 보유자만 들어갈 수 있습니다`);
    if (S().turn?.loc && LOC_BY_ID[S().turn.loc]?.noPass) missing.push("🚫 지금 있는 맵에서는 맵권을 쓸 수 없습니다");
    if (RV.revivalTurns() && loc.region !== "survival") missing.push("🔄 패자부활전 중에는 Survival Land 맵으로만 이동할 수 있습니다");
    if (RV.survivalPassWait() > 0) missing.push(RV.survivalWaitText());
    const fee = r.freeTypes && ownsTypes(pid, r.freeTypes) ? 0 : (r.fee || 0), feePts = r.feePts || 0;
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
    if (ps.hp <= dmg) { if (killPlayer(pid, `${place}에서 사망`) === false) return { hp: ps.hp, shield: true }; return { dead: true }; }
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
    const allowed = Math.random() < 0.5;
    if (!allowed) noteRefuse(pid);
    return { allowed };
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
    t.locIn = t.remaining; // ⏳ turn clock when this map was entered (MIN_STAY maps: game/extra.js)
    const loc = LOC_BY_ID[locId];
    t.region ||= loc.region;
    if (!teleport) {
        const ce = canEnter(t.pid, loc);
        if (ce.pass) { ps.items[ce.pass]--; log(`🎟️ ${name(t.pid)} 출입권 사용`); }
        if (ce.ok && !ce.short) payEntry(t.pid, { gear: ce.gear, fee: ce.fee, feePts: ce.feePts });
    }
    if (!(ps.visited ||= []).includes(locId)) ps.visited.push(locId);
    runHooks(locationHooks, t.pid, locId);
    if (!(t.stats.locs ||= []).includes(locId)) t.stats.locs.push(locId);
    if (needsGear(loc)) t.stats.gearVisits = (t.stats.gearVisits || 0) + 1;
    log(`🗺️ ${name(t.pid)} → ${loc.name}`);
    // arrival rules: infection rolls (UI shows t.arrival.sick) · ⏱️ Hurry Up Town (10 min → 1 min, once)
    t.arrival = { loc: locId, sick: arrivalInfection(t.pid, loc) };
    if (loc.hurry && !t.hurried) { t.hurried = true; t.remaining = Math.min(t.remaining, 60); t.arrival.hurry = true; }
    // 🔄 Survival Land: a 5-minute turn · ⏱️ the clock on arrival (passes to another Survival Land map only after 2:00 here)
    if (loc.region === "survival" && !t.svCap) { t.svCap = true; t.remaining = Math.min(t.remaining, RV.SURVIVAL_SECONDS); }
    t.mapAt = t.remaining;
    Store.saveSeason();
}
// map pass: skip both roulettes and go straight to that map
export const passesOf = pid => Object.entries(S().ps[pid].items).filter(([k, n]) => n > 0 && ITEM_BY_ID[k]?.loc && LOC_BY_ID[ITEM_BY_ID[k].loc] && !LOC_BY_ID[ITEM_BY_ID[k].loc].off)
    .filter(([k]) => RV.revivalTurns() ? isSurvivalPass(k) : !isSurvivalPass(k)).map(([k]) => ITEM_BY_ID[k]); // 🔄 revival: Survival Land passes only
// ☠️ Dead Land map passes: only with 8 min or more of play time left
export const DEAD_PASS_MIN = 480;
export const deadPassBlocked = itemId => { const l = LOC_BY_ID[ITEM_BY_ID[itemId]?.loc]; return l?.region === "deadland" && (S()?.turn?.remaining ?? 0) < DEAD_PASS_MIN; };
export const DEAD_PASS_TEXT = "☠️ Dead Land 지역 맵권은 플레이 시간이 8분 이상 남았을 때만 사용할 수 있습니다";
export function usePassTeleport(itemId) {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    const it = ITEM_BY_ID[itemId];
    if (!it?.loc || !(ps.items[itemId] > 0)) return false;
    if (deadPassBlocked(itemId)) return false;
    if (RV.revivalPassBlock(itemId)) return false;
    if (t.loc && LOC_BY_ID[t.loc]?.noPass) return false;
    const need = passNeeds(t.pid, LOC_BY_ID[it.loc]);
    if (!need.ok) return false;
    ps.items[itemId]--;
    payEntry(t.pid, need);
    log(`🎟️ ${name(t.pid)} ${it.name} 사용 → 순간이동!`);
    if (t.loc) { t.region = LOC_BY_ID[it.loc].region; t.npc = null; } // moving mid-turn: new region, the new map rolls its own NPC visits
    setLocation(it.loc, { teleport: true });
    return true;
}

// 🗺️ 랜덤 맵권: straight to one random map, in every open region.
//  · nationality-only / restricted-zone maps: the ticket lets in a player who doesn't fit (no pass used)
//  · the other door rules still count — EmoMonster owned · Type Casino attribute · points — and the map
//    is only drawn when the player CAN pay its entry fee / gear (oxygen · wings · space suit).
//    Such a map is offered first (pay & go, or "No" → another map with no fee or gear).
const identityLocked = l => !!(l.req?.country || l.req?.who);
export function randomMapPool(pid) {
    if (RV.revivalTurns()) return []; // 🔄 no random map tickets in Survival Land
    const cur = S().turn?.loc;
    const open = new Set(REGIONS.filter(r => !r.off).map(r => r.id));
    return LOCATIONS.filter(l => {
        if (l.off || l.kidnap || l.id === cur || !open.has(l.region)) return false;
        const ce = canEnter(pid, l);
        if (!(ce.ok && !ce.pass) && !(identityLocked(l) && (ce.ok || ce.pass || /전용/.test(ce.why || "")))) return false;
        return passNeeds(pid, l).ok;
    });
}
// a map asks for something at the door: entry fee (G / P) or gear that gets used up
export function randomMapCost(pid, loc) {
    const n = passNeeds(pid, loc);
    return n.fee || n.feePts || n.gear.length ? n : null;
}
export const randomFreePool = (pid, exclude = null) => randomMapPool(pid).filter(l => l.id !== exclude && !randomMapCost(pid, l));
// draw only — nothing is used until useRandomMap(locId)
export function drawRandomMap() {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    if (!(ps.items.map_random > 0)) return null;
    if (t.loc && LOC_BY_ID[t.loc]?.noPass) return null;
    const pool = randomMapPool(t.pid);
    if (!pool.length) return null;
    const loc = pool[Math.floor(Math.random() * pool.length)];
    return { loc, cost: randomMapCost(t.pid, loc) };
}
export function drawFreeRandomMap(exclude) {
    const pool = randomFreePool(S().turn.pid, exclude);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
// use the ticket and go to locId (from drawRandomMap / drawFreeRandomMap) — pays its fee / gear
export function useRandomMap(locId) {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    if (!(ps.items.map_random > 0)) return null;
    if (t.loc && LOC_BY_ID[t.loc]?.noPass) return null;
    const loc = locId ? LOC_BY_ID[locId] : drawRandomMap()?.loc;
    if (!loc || !randomMapPool(t.pid).some(l => l.id === loc.id)) return null;
    ps.items.map_random--;
    payEntry(t.pid, passNeeds(t.pid, loc));
    log(`🗺️ ${name(t.pid)} 랜덤 맵권 사용 → ${loc.name}!${identityLocked(loc) && !canEnter(t.pid, loc).ok ? " (전용 맵 입장)" : ""}`);
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
        t.stats.slotWon = (t.stats.slotWon || 0) + Math.max(0, win); // 💰 gold won, bets not subtracted ("~G 이상 벌기" missions)
        if (win > 0) t.stats.slotWins = (t.stats.slotWins || 0) + 1; // a whole bonus round is one win
        t.stats.five = (t.stats.five || 0) + (extra.five ? 1 : 0);
        if (extra.freeSpin) t.stats.freeSpins = (t.stats.freeSpins || 0) + 1;
        if (extra.bonus) { t.stats.slotBonus = (t.stats.slotBonus || 0) + 1; (t.stats.bonusSpins ||= []).push(t.stats.spins); } // slot bonuses only (🔄 revival mission) · on which spins
        const r100 = s.mission?.type === "rv_slot100" ? s.mission : { v: 100000, spins: 100 }; // 🔄 revival: 50,000G within the first 100 spins
        if (t.stats.spins <= r100.spins && (t.stats.slotWon || 0) >= r100.v) t.stats.r100 = true;
        // first bonus of the turn: on which spin (bonus_in missions)
        if (extra.bonus && !t.stats.bonusAt) t.stats.bonusAt = t.stats.spins;
        // best single-spin win per brand and per bet (brand_win / bet_win missions)
        if (extra.brand) { const k = brandKey(extra.brand), bw = (t.stats.brandWin ||= {}); bw[k] = Math.max(bw[k] || 0, win); }
        if (bet) { const bw = (t.stats.betWin ||= {}); bw[bet] = Math.max(bw[bet] || 0, win); }
    }
    else { t.stats.casinoNet += net; t.stats.plays++; ps.totals.casinoNet += net; ps.totals.plays++; t.stats.casinoWon = (t.stats.casinoWon || 0) + Math.max(0, win); }
    // 🔥 per-game play counts by month (Hot / Super Hot badges: game/gameBadges.js) — a slot spin or a casino play = 1
    if (extra.game && !s.sandbox && !Store.sandbox) { const gp = (s.gamePlays ||= {}), d = new Date(), k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}|${kind}:${extra.game}`; gp[k] = (gp[k] || 0) + 1; } // "<YYYY-MM>|slot:<id>"
    t.stats.points += points; ps.totals.points += points;
    if (extra.bonus) t.stats.bonus++;
    for (const jp of extra.jackpots || []) {
        if (!t.stats.jackpot || JACKPOT_RANK[jp] > JACKPOT_RANK[t.stats.jackpot]) t.stats.jackpot = jp;
        if ((JACKPOT_RANK[jp] || 0) >= 1) (t.stats.jps ||= []).push(jp); // every MINI+ jackpot of the turn (jackpot count missions)
    }
    // 🤲 handpay (1000× the bet or a GRAND jackpot) — handpay missions
    if ((bet > 0 && win >= bet * 1000) || (extra.jackpots || []).includes("GRAND")) { t.stats.handpay = (t.stats.handpay || 0) + 1; ps.handpays = (ps.handpays || 0) + 1; }
    runHooks(playHooks, t.pid, kind, bet, win, extra);
    Store.saveSeason();
}

function hasThing(pid, what) {
    if (what === "pet") return !!S().ps[pid].pet;
    if (what === "petgear") return hasPetGear(pid);
    if (what === "gear") return hasPetGear(pid) || hasFrameGear(pid);
    if (what === "special") { const d = Store.getDecor?.(pid) || {}; return !!(isSpecialFrame(d.frame) || isSpecialEffect(d.effect)); }
    if (what === "biz") return (Store.bank?.biz || []).some(b => !b.closed && b.owner === +pid);
    if (what === "bank") return !!Store.bank?.accounts?.[pid];
    if (what === "battler") { const b = S().ps[pid]?.battler; return !!b && b.round === S().round && b.won > 0 && !b.lost; }
    return true;
}
const HAS_MISS = {
    pet: "펫 없음 (상점에서 구매 가능)",
    petgear: "펫 · 펫 효과 모두 없음 (펫 상점)",
    gear: "펫·펫효과·프레임·효과 모두 없음",
    special: "⭐ 특수프레임 · 특수프레임 효과 없음",
    biz: "🏪 본인 소유 Self-Business 없음",
    bank: "🏦 본인 은행 계좌 없음",
    battler: "⚔ EmoMon Capture에서 Battler를 만나 이겨야 안전 (지거나 못 만나면 후보)",
};
// missions decided by the judge, not by playing (shown as "판정 대기")
export const judgedMission = m => m && (m.type === "rank");
export function missionMet(m, st) {
    if (!m || !st) return false;
    if (m.revival) { const r = RV.revivalMet(m, st); if (r !== null) return r; }
    switch (m.type) {
        case "bonus": return m.v ? (st.slotBonus || 0) >= m.v : st.bonus > 0;
        // 💰 "~G 이상 벌기": the gold won counts — bets/losses are not subtracted
        case "slot_net": return won(st, "slot") >= m.v;
        case "casino_net": return won(st, "casino") >= m.v;
        case "points": return st.points >= m.v;
        case "jackpot": return m.n ? jpCount(st, m.min) >= m.n : !!st.jackpot && JACKPOT_RANK[st.jackpot] >= JACKPOT_RANK[m.min];
        case "combo": return won(st, "casino") >= (m.c || 0) && won(st, "slot") >= (m.s || 0) && (st.points || 0) >= (m.p || 0);
        case "five": return (st.five || 0) >= m.v;
        case "freespin": return (st.freeSpins || 0) >= m.v;
        case "slot_wins": return slotWinsOf(m, st) >= m.v;
        case "beg_max": return (st.beg || 0) > m.v;
        case "job_min": return (st.job || 0) >= m.v;
        case "earn_min": return (st.earn || 0) >= m.v;
        case "spell": return !!st.spellOk;
        case "card": return !!st.cardUsed;
        case "has": return st.pid != null && hasThing(st.pid, m.what);
        case "emo_has": return st.pid != null && (m.invert ? !emoHas(st.pid, m) : emoHas(st.pid, m));
        case "rank": return true;
        case "bonus_in": return bonusesIn(st, m.v) >= (m.n || 1);
        case "brand_win": return (st.brandWin?.[brandKey(m.brand)] || 0) >= m.v;
        case "bet_win": return betBest(m, st) >= m.v;
        case "job_done": return (st.jobs || 0) >= (m.v || 1);
        case "home_map": { const c = Store.player(st.pid)?.country; return !!c && (st.locs || []).some(id => LOC_BY_ID[id]?.req?.country === c); }
        case "region_map": return (st.locs || []).some(id => m.regions.includes(LOC_BY_ID[id]?.region));
        case "npc_hit": return (st.npc || []).some(x => x.npc === m.npc && x[m.what]);
        case "cm_post": return st.pid != null && S()?.ps?.[st.pid]?.cmPosted === S()?.number;
        case "arena_win": return (st.arenaWin || 0) > 0;
        case "sugar_max": return (st.sugarMax || 0) >= m.v;
        case "handpay": return (st.handpay || 0) > 0;
        case "kidnap_freed": return !!st.kidnapFreed;
        case "promo_vote": return st.pid != null && !!S()?.ps?.[st.pid]?.promoVoted;
        // ---- 2026-11 missions
        case "pts_spent": return ptsSpent(st) >= m.v;
        case "pts_have": return (psOf(st)?.points || 0) >= m.v;
        case "money_end": return Math.floor(psOf(st)?.money || 0) % 100 === m.d;
        case "food_eats": return (psOf(st)?.eats || 0) >= m.v;
        case "wx_hit": return m.v ? (st.wxDmg || 0) >= m.v : !((st.wxDmg || 0) > 0); // "v 이상 차감되지 않은" → candidate · plain: the hit ones are candidates
        case "lodge_in": return m.mode === "some" ? !((psOf(st)?.lodgeIn || 0) > 0) : (psOf(st)?.lodgeIn || 0) > 0;
        case "npc_harm": return npcHits(st) >= m.v;
        case "job_total": return (psOf(st)?.jobGold || 0) >= m.v;
        case "earn_total": return (psOf(st)?.earnGold || 0) >= m.v;
        case "spell_ever": return !!st.spellOk || (psOf(st)?.spellWins || 0) > 0;
        case "cm_react": return st.pid != null && S()?.ps?.[st.pid]?.cmPosted === S()?.number && reactedNow(st.pid);
        case "arena_any": return (psOf(st)?.arenaUsed || 0) > 0;
        case "card2": { const n = lettersOwned(st.pid, m.letters); return m.mode === "any" ? n >= 2 : n >= 1; }
    }
    return false;
}
// ---- helpers for the checks above
const psOf = st => st?.pid != null ? S()?.ps?.[st.pid] : null;
const won = (st, k) => st?.[k + "Won"] || 0; // gold won at slots / casino this turn (no bets subtracted)
const jpCount = (st, min) => (st.jps || []).filter(j => (JACKPOT_RANK[j] || 0) >= (JACKPOT_RANK[min] || 1)).length;
// a bonus round counts as `bw` wins (the bonus spin already counted 1)
const slotWinsOf = (m, st) => (st.slotWins || 0) + (m.bw ? (m.bw - 1) * (st.slotBonus || 0) : 0);
const bonusesIn = (st, v) => (st.bonusSpins || (st.bonusAt ? [st.bonusAt] : [])).filter(n => n <= v).length;
const betBest = (m, st) => m.minBet ? Math.max(0, ...Object.entries(st.betWin || {}).filter(([b]) => +b >= m.minBet).map(([, w]) => w)) : bestOf(st.betWin, m.bets);
const ptsSpent = st => { const t = S()?.turn, ps = psOf(st); if (!ps || t?.pid !== st.pid) return st.ptsSpent || 0; return Math.max(0, (t.startPts || 0) + (st.points || 0) - (ps.points || 0)); };
const npcHits = st => (st.npc || []).filter(x => x.harm).length;
const lettersOwned = (pid, letters = []) => letters.filter(L => (S()?.ps?.[pid]?.items?.[cardId(L)] || 0) > 0).length;
// 💖/👎 pressed on someone else's comment this season
const reactedNow = pid => (Store.community?.posts || []).some(p => [...(p.likes || []), ...(p.dislikes || [])].some(r => +r.pid === +pid && r.season === S()?.number));
const bestOf = (obj, keys) => Math.max(0, ...keys.map(k => obj?.[k] || 0));
export function missionProgress(m, st) {
    if (!m || !st) return { cur: 0, goal: 1, label: "" };
    if (m.revival) { const r = RV.revivalProgress(m, st); if (r) return r; }
    const met = missionMet(m, st);
    switch (m.type) {
        case "bonus": return m.v ? { cur: Math.min(st.slotBonus || 0, m.v), goal: m.v, label: `슬롯 보너스 ${st.slotBonus || 0} / ${m.v}회` } : { cur: Math.min(1, st.bonus), goal: 1, label: st.bonus ? "보너스 달성!" : "보너스 0회" };
        case "slot_net": return { cur: won(st, "slot"), goal: m.v, label: `🎰 번 돈 ${Math.round(won(st, "slot")).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "casino_net": return { cur: won(st, "casino"), goal: m.v, label: `🃏 번 돈 ${Math.round(won(st, "casino")).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "points": return { cur: st.points, goal: m.v, label: `${st.points} / ${m.v} P` };
        case "jackpot": return m.n ? { cur: Math.min(jpCount(st, m.min), m.n), goal: m.n, label: `${m.min} 이상 잭팟 ${jpCount(st, m.min)} / ${m.n}회` } : { cur: met ? 1 : 0, goal: 1, label: st.jackpot ? `최고 잭팟: ${st.jackpot}` : "잭팟 없음" };
        case "combo": { const parts = [[won(st, "casino"), m.c], [won(st, "slot"), m.s], [st.points, m.p]].filter(([, g]) => g); return { cur: parts.reduce((a, [v, g]) => a + Math.min(1, Math.max(0, v) / g), 0) / parts.length, goal: 1, label: `🃏 ${Math.round(won(st, "casino")).toLocaleString()}/${(m.c || 0).toLocaleString()} · 🎰 ${Math.round(won(st, "slot")).toLocaleString()}/${(m.s || 0).toLocaleString()} G${m.p ? ` · 💎 ${st.points}/${m.p} P` : ""}` }; }
        case "five": return { cur: st.five || 0, goal: m.v, label: `5 of a kind ${st.five || 0} / ${m.v}` };
        case "freespin": return { cur: st.freeSpins || 0, goal: m.v, label: `무료스핀 ${st.freeSpins || 0} / ${m.v}` };
        case "slot_wins": return { cur: slotWinsOf(m, st), goal: m.v, label: `WIN ${slotWinsOf(m, st)} / ${m.v}${m.bw ? ` (보너스 1회 = ${m.bw} WIN)` : ""}` };
        case "beg_max": return { cur: st.beg || 0, goal: m.v + 1, label: `구걸 ${(st.beg || 0).toLocaleString()}G (${m.v.toLocaleString()}G 넘으면 안전)` };
        case "job_min": return { cur: st.job || 0, goal: m.v, label: `직업 ${(st.job || 0).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "earn_min": return { cur: st.earn || 0, goal: m.v, label: `돈벌기 ${(st.earn || 0).toLocaleString()} / ${m.v.toLocaleString()} G` };
        case "spell": return { cur: met ? 1 : 0, goal: 1, label: met ? "🐝 Spelling Bee 성공!" : "🐝 Spelling Bee 코너가 있는 맵에서 단어를 맞히세요" };
        case "card": return { cur: met ? 1 : 0, goal: 1, label: met ? `카드 ${m.letter} 사용!` : `카드 ${m.letter}: 턴 종료 때 사용 여부를 묻습니다` };
        case "has": return { cur: met ? 1 : 0, goal: 1, label: met ? (m.what === "battler" ? "⚔ Battler 승리 — 안전" : "보유 중 — 안전") : HAS_MISS[m.what] || "보유하지 않음" };
        case "emo_has": {
            if (m.invert) return { cur: met ? 1 : 0, goal: 1, label: met ? "🐾 이모몬스터 없음 — 안전" : "🐾 이모몬스터를 갖고 있어 탈락 후보입니다" };
            if (m.what === "orb") return { cur: met ? 1 : 0, goal: 1, label: met ? "🔮 orb 보유 중 — 안전" : "🔮 이모몬스터 orb가 없습니다 — LAB 상점에서 준비하세요" };
            return { cur: met ? 1 : 0, goal: 1, label: met ? "🐾 해당 몬스터 보유 중 — 안전" : "🐾 해당 몬스터가 없습니다 — EmoMon Capture · Lab에서 준비하세요" };
        }
        case "rank": return { cur: 0, goal: 1, label: "라운드 끝에 판정" };
        case "bonus_in": if (m.n > 1) { const k = bonusesIn(st, m.v), sp = st.spins || 0; return { cur: Math.min(k, m.n), goal: m.n, label: `${m.v}번 스핀 안의 보너스 ${k} / ${m.n}회${sp >= m.v && k < m.n ? " — 실패" : ` · 스핀 ${Math.min(sp, m.v)} / ${m.v}`}` }; } {
            const sp = st.spins || 0;
            if (met) return { cur: 1, goal: 1, label: `${st.bonusAt}번째 스핀에 보너스! 달성` };
            if (st.bonusAt) return { cur: 0, goal: 1, label: `${st.bonusAt}번째 스핀에 보너스 — ${m.v}번 안에는 실패` };
            return { cur: Math.min(sp, m.v), goal: m.v, label: sp >= m.v ? `${m.v}번 안에 보너스 없음 — 실패` : `스핀 ${sp} / ${m.v} · 보너스 대기` };
        }
        case "brand_win": { const b = st.brandWin?.[brandKey(m.brand)] || 0; return { cur: b, goal: m.v, label: `${m.brand} 1회 최고 ${b.toLocaleString()} / ${m.v.toLocaleString()} G` }; }
        case "bet_win": { const b = betBest(m, st); return { cur: b, goal: m.v, label: `${m.minBet ? `${m.minBet.toLocaleString()}G 이상` : `${m.bets.join("/")}G`} 베팅 1회 최고 ${b.toLocaleString()} / ${m.v.toLocaleString()} G` }; }
        case "job_done": return { cur: Math.min(st.jobs || 0, m.v || 1), goal: m.v || 1, label: `직업 ${st.jobs || 0} / ${m.v || 1}회` };
        case "home_map": { const c = Store.player(st.pid)?.country; return { cur: met ? 1 : 0, goal: 1, label: met ? "본인 국적 맵 방문 완료!" : `${c || "?"} 국적 맵을 방문하세요` }; }
        case "region_map": return { cur: met ? 1 : 0, goal: 1, label: met ? "방문 완료!" : `${m.regions.map(r => REGIONS.find(x => x.id === r)?.name || r).join(" · ")}의 맵을 방문하세요` };
        case "cm_post": return { cur: met ? 1 : 0, goal: 1, label: met ? "💬 코멘트 작성 완료 — 안전" : "💬 커뮤니티에 코멘트를 작성하세요" };
        case "arena_win": return { cur: met ? 1 : 0, goal: 1, label: met ? "🏟️ 아레나 승리 — 안전" : "🏟️ 아레나 1:1 배틀에서 이기세요" };
        case "sugar_max": return { cur: Math.min(st.sugarMax || 0, m.v), goal: m.v, label: `🍬 최고 Sugar Level ${st.sugarMax || 0}% / ${m.v}%` };
        case "handpay": return { cur: met ? 1 : 0, goal: 1, label: met ? "🤲 Handpay 달성 — 안전" : "🤲 베팅의 1000배 이상 당첨 또는 GRAND 잭팟" };
        case "kidnap_freed": return { cur: met ? 1 : 0, goal: 1, label: met ? "🕊️ 납치에서 풀려남 — 안전" : "⛓️ Terror Casino에서 납치된 뒤 풀려나야 합니다" };
        case "promo_vote": return { cur: met ? 1 : 0, goal: 1, label: met ? "🗳️ 인기 투표 완료 — 안전" : "🗳️ 커뮤니티 📣 홍보하기에서 후보에게 투표하세요 (무료 · +500G)" };
        case "npc_hit": return { cur: met ? 1 : 0, goal: 1, label: met ? "👼 엔젤 도움 받음!" : `👼 엔젤에게 ${m.what === "hp" ? "HP 회복" : "돈"} 공격을 받아야 합니다` };
        case "pts_spent": { const v = ptsSpent(st); return { cur: Math.min(v, m.v), goal: m.v, label: `이번 턴 사용한 포인트 ${v} / ${m.v} P` }; }
        case "pts_have": { const v = psOf(st)?.points || 0; return { cur: Math.min(v, m.v), goal: m.v, label: `보유 포인트 ${v} / ${m.v} P` }; }
        case "money_end": return { cur: met ? 1 : 0, goal: 1, label: `보유 골드 ${Math.floor(psOf(st)?.money || 0).toLocaleString()}G — 끝자리 ${String(Math.floor(psOf(st)?.money || 0) % 100).padStart(2, "0")} (목표 ${m.d})` };
        case "food_eats": { const v = psOf(st)?.eats || 0; return { cur: Math.min(v, m.v), goal: m.v, label: `🍚 시즌 식량 소비 ${v} / ${m.v}회` }; }
        case "wx_hit": return m.v ? { cur: Math.min(st.wxDmg || 0, m.v), goal: m.v, label: `🌦️ 이번 턴 날씨 HP 피해 ${st.wxDmg || 0} / ${m.v}` } : { cur: met ? 1 : 0, goal: 1, label: met ? "🌦️ 날씨 피해 없음 — 안전" : `🌦️ 날씨로 HP −${st.wxDmg} — 탈락 후보` };
        case "lodge_in": { const v = psOf(st)?.lodgeIn || 0; return { cur: met ? 1 : 0, goal: 1, label: m.mode === "some" ? (v ? `🏨 숙소 입장 기록 ${v}회 — 탈락 후보` : "🏨 숙소 입장 기록 없음 — 안전") : (v ? `🏨 숙소 입장 기록 ${v}회 — 안전` : "🏨 숙소에 입장해야 합니다") }; }
        case "npc_harm": { const v = npcHits(st); return { cur: Math.min(v, m.v), goal: m.v, label: `👹 이번 턴 NPC 공격 ${v} / ${m.v}회` }; }
        case "job_total": { const v = psOf(st)?.jobGold || 0; return { cur: Math.min(v, m.v), goal: m.v, label: `💼 시즌 직업 + 급여 ${v.toLocaleString()} / ${m.v.toLocaleString()} G` }; }
        case "earn_total": { const v = psOf(st)?.earnGold || 0; return { cur: Math.min(v, m.v), goal: m.v, label: `💪 시즌 돈벌기 ${v.toLocaleString()} / ${m.v.toLocaleString()} G` }; }
        case "spell_ever": return { cur: met ? 1 : 0, goal: 1, label: met ? "🐝 Spelling Bee 성공 기록 있음 — 안전" : "🐝 Spelling Bee 코너에서 단어를 맞히세요" };
        case "cm_react": return { cur: met ? 1 : 0, goal: 1, label: met ? "💬 코멘트 + 💖/👎 완료 — 안전" : "💬 커뮤니티에 코멘트를 쓰고 다른 코멘트에 💖 또는 👎를 누르세요" };
        case "arena_any": return { cur: met ? 1 : 0, goal: 1, label: met ? "🏟️ 아레나 참여 — 안전" : "🏟️ 아레나 1:1 배틀에 참여하세요" };
        case "card2": { const n = lettersOwned(st.pid, m.letters); return { cur: Math.min(n, m.mode === "any" ? 2 : 1), goal: m.mode === "any" ? 2 : 1, label: `🔤 카드 ${m.letters?.[0]} · 권 ${m.letters?.[1]} 보유 ${n}/2 (${m.mode === "any" ? "둘 다 있어야 안전" : "하나라도 있으면 안전"})` }; }
    }
    return { cur: 0, goal: 1, label: "" };
}
export function useMissionPass() {
    const s = S(), t = s.turn, ps = s.ps[t.pid];
    if (!(ps.items.mission_pass > 0) || t.ticket) return false; // 🔄 works in the revival too (passes the revival mission)
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
    emitEvent("turnEnd", t.pid, { turn: t });
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
// rank missions: [metric, direction] → that end of the list are the candidates
export const FINAL_SHIELD_ODDS = 0.7, FINAL_SHIELD_MIN_LEFT = 6; // 🛡️ 최종후보선택제외권
const RANK_RULES = { refused_most: ["refused", -1], refused_least: ["refused", 1], emoitems_few: ["emoItems", 1], shops_few: ["shopBuys", 1] };
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
        else if (RANK_RULES[m.rule]) cands = extremeGroup(live, ...RANK_RULES[m.rule], 1);
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
    // 🛡️ 최종후보선택제외권: 70% to be taken off the candidate list (one is used up when it works).
    // Never with 6 or fewer players left (self included), and at least one candidate always stays.
    // Shielded players are listed on their own ("🛡️ 제외"), apart from the mission successes.
    s.shielded = [];
    if (live.length > FINAL_SHIELD_MIN_LEFT) for (const pid of shuffle(cands)) {
        if (cands.length <= 1) break;
        const ps = s.ps[pid];
        if (!(ps.items?.final_shield > 0)) continue;
        if (Math.random() >= FINAL_SHIELD_ODDS) { log(`🛡️ ${name(pid)}의 최종후보선택제외권이 발동하지 않았다…`); continue; }
        ps.items.final_shield--;
        cands = cands.filter(x => x !== pid);
        s.results[pid] = { ...(s.results[pid] || { stats: {} }), shielded: true };
        s.shielded.push(pid);
        log(`🛡️ ${name(pid)}은(는) 최종후보선택제외권으로 탈락후보에서 제외되었다!`);
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
    s.history.push({ round: s.round, mission: s.mission, candidates: [...s.candidates], eliminated: pid, rank, exempt: (s.exempt || []).map(e => e.pid), shielded: [...(s.shielded || [])] });
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
// 🏁 the final is two duels between the last 2 — EmoMon battle (emo) and weapon battle (weapon).
// Win both → champion. 1 : 1 → the claw machine decides (claw). Kept on the season so a
// reload resumes at the right duel.
export const FINAL_LABEL = { emo: "🐾 EmoMon 배틀", weapon: "⚔️ 무기 대결", claw: "🕹️ 집게 결정전" };
export function finalResult(kind, winner) {
    const s = S();
    (s.finalRes ||= {})[kind] = winner;
    const foe = alive().find(p => p !== winner);
    if ((kind === "weapon" || kind === "emo") && foe != null) Store.recordHighlight("battle", { a: winner, b: foe, winner, emo: kind === "emo", final: true, hpA: Math.round(s.ps[winner].hp), weapons: [[...(s.ps[winner].weapons || [])].slice(0, 4), [...(s.ps[foe].weapons || [])].slice(0, 4)] });
    log(`🏁 결승 ${FINAL_LABEL[kind]}: ${name(winner)} 승리`);
    Store.saveSeason(true);
}
export async function crown(winnerId, snapshot) {
    const s = S();
    const loser = alive().find(p => p !== winnerId);
    s.ps[winnerId].rank = 1;
    if (loser != null) {
        s.ps[loser].rank = 2; s.ps[loser].out = true; s.ps[loser].outRound = s.round;
        s.history.push({ round: s.round, final: true, winner: winnerId, eliminated: loser, rank: 2 }); // 📜 시즌 요약
    }
    s.status = "done";
    s.winnerId = winnerId;
    s.endedAt = new Date().toISOString();
    log(`👑 시즌 ${s.number} 우승: ${name(winnerId)}!`);
    Store.recordHighlight("champion", { pid: winnerId, runner: loser ?? null, money: Math.round(s.ps[winnerId].money || 0) });
    for (const f of seasonEndHooks) try { f(s); } catch (e) { console.error(e); }
    try { stashSeason(s); } catch (e) { console.error(e); } // 🎒 everyone keeps their belongings for the next season they join
    const ranks = Object.fromEntries(s.roster.map(pid => [pid, s.ps[pid].rank]));
    await Store.finishSeason(s, ranks, snapshot);
}

// ---------------------------------------------------------------- luck
export function luckOf(pid) {
    const ps = S()?.ps[pid];
    if (!ps) return { win: 0, bonus: 0, pct: 0, bonusPct: 0 };
    // 🥶 Cursed Casino: pets, special pets and their effects do nothing here
    if (LOC_BY_ID[S().turn?.loc]?.cursed && +S().turn?.pid === +pid) return { win: 0, bonus: 0, pct: 0, bonusPct: 0, pid, pet: null, petEffect: null, sources: [], cursed: true };
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

// EmoMon Battler fight this round (has:battler missions — safe only after a win and no loss)
export function noteBattler(pid, won) {
    const s = S(), ps = s?.ps[pid];
    if (!ps) return;
    if (ps.battler?.round !== s.round) ps.battler = { round: s.round, won: 0, lost: 0 };
    ps.battler[won ? "won" : "lost"]++;
    Store.saveSeason();
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
