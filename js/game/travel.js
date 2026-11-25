// =====================================================================
// 2026-11 special maps — the state side (UI: screens/specialMaps.js · screens/travelView.js)
//   ✈️ Airport (gates 1~3) → the plane → stopovers → destination · plane crash
//   🛗 Elevator (6 trapped players, floors elev_*) · 🏕️ Campsite (hiding places camp_*)
//   💻 Cyber Town glitches · 🪆 Doll Factory curses · 🍀 Good Luck Casino
// State: s.air (airport / plane) · s.elev (elevator) · ps.trip (a passenger's itinerary) · ps.elev (floor)
//        t.camp (this turn's campsite) · t.glitch (Cyber Town glitch odds this turn)
// =====================================================================
import { Store } from "../core/store.js";
import { LOC_BY_ID, LOCATIONS, ITEMS, ITEM_BY_ID } from "../data/catalog.js";
import * as G from "./season.js";
import { weatherAt } from "./life.js";
import { ownsTypes } from "./extra.js";
import { mapNo } from "../data/mapAdmin.js";

const S = () => Store.season;
const ps_ = pid => S()?.ps?.[pid];
const rnd = () => Math.random();
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickOne = a => a[Math.floor(rnd() * a.length)];
const alive = () => (S()?.roster || []).filter(pid => !S().ps[pid]?.out);
const wallet = ps => (ps?.money || 0) + (ps?.loanGold || 0);
const payGold = (ps, g) => { const fromLoan = Math.min(ps.loanGold || 0, g); ps.loanGold = (ps.loanGold || 0) - fromLoan; ps.money -= g - fromLoan; };

// ================================================================ ✈️ AIRPORT
export const GATES = ["gate1", "gate2", "gate3"];
export const PAX_MAX = 6;            // the plane leaves with 6 passengers
export const FILL_ROUNDS = 3;        // … gathered within the first 3 rounds (players are placed at the gates)
export const VIP_FEE = 10000, CHANGE_FEE = 10000, UPGRADE_FEE = 12000;
export const PLANE_SECONDS = 300, PLANE_MIN_STAY = 120;
const P = { k: "plane" }, stop = loc => ({ k: "stop", loc }), dest = loc => ({ k: "dest", loc });
// a ticket: price (G) or pts (P) · legs: what each of the passenger's next turns is · free: the gate's default (no VIP)
const T = (id, to, price, legs, x = {}) => ({ id, to, price, legs, ...x });
const direct1 = to => [P, dest(to)], direct2 = to => [P, P, dest(to)], direct3 = to => [P, P, P, dest(to)], via = (s, to) => [P, stop(s), P, dest(to)];
export const TICKETS = {
    1: [T("g1_seaside", "seaside", 65000, direct1("seaside")),
        T("g1_seaside_via", "seaside", 35000, via("evil_town", "seaside"), { via: "evil_town" }),
        T("g1_igloo", "igloo", 45000, direct2("igloo")),
        T("g1_super", "super", 50000, via("sand_castle", "super"), { via: "sand_castle" }),
        T("g1_death", "death_casino", 5000, via("nothing_casino", "death_casino"), { via: "nothing_casino" }),
        T("g1_slots", "slots_only", 45000, direct2("slots_only")),
        T("g1_games", "games_only", 45000, direct2("games_only")),
        T("g1_monster", "monster_casino", 30000, via("magma_town", "monster_casino"), { via: "magma_town" }),
        T("g1_sugar", "sugar_casino", 0, direct3("sugar_casino"), { free: true }),
        T("g1_sunny", "sunny_town", 0, via("magic", "sunny_town"), { via: "magic", pts: 50 })],
    2: [T("g2_rainbow", "rainbow", 65000, direct1("rainbow")),
        T("g2_rainbow_via", "rainbow", 35000, via("hell", "rainbow"), { via: "hell" }),
        T("g2_ice", "ice", 45000, direct2("ice")),
        T("g2_eastern", "eastern", 50000, via("sand_castle", "eastern"), { via: "sand_castle" }),
        T("g2_elevator", "elevator", 5000, via("nothing_casino", "elevator"), { via: "nothing_casino" }),
        T("g2_slots", "slots_only", 45000, direct2("slots_only")),
        T("g2_games", "games_only", 45000, direct2("games_only")),
        T("g2_emo", "emo_casino", 30000, via("cursed_casino", "emo_casino"), { via: "cursed_casino" }),
        T("g2_cyber", "cyber_town", 0, direct2("cyber_town"), { free: true }),
        T("g2_stuck", "stuck_casino", 0, direct3("stuck_casino"), { pts: 10 })],
    3: [T("g3_oink", "oink", 65000, direct1("oink")),
        T("g3_oink_via", "oink", 35000, via("evil_town", "oink"), { via: "evil_town" }),
        T("g3_graveyard", "graveyard", 45000, direct2("graveyard")),
        T("g3_downtown", "downtown", 50000, via("sand_castle", "downtown"), { via: "sand_castle" }),
        T("g3_deathdoor", "death_door", 5000, via("nothing_casino", "death_door"), { via: "nothing_casino" }),
        T("g3_slots", "slots_only", 45000, direct2("slots_only")),
        T("g3_games", "games_only", 45000, direct2("games_only")),
        T("g3_dracula", "dracula", 30000, via("magma_town", "dracula"), { via: "magma_town" }),
        T("g3_doll", "doll_factory", 0, direct2("doll_factory"), { free: true }),
        T("g3_goodluck", "good_luck", 0, direct1("good_luck"), { pts: 150 })]
};
export const TICKET_BY_ID = Object.fromEntries(Object.values(TICKETS).flat().map(t => [t.id, t]));
export const defaultTicket = gate => TICKETS[gate].find(t => t.free);
export const ticketPrice = t => t.pts ? { pts: t.pts, gold: 0 } : { pts: 0, gold: t.price };
export const ticketKind = t => t.via ? "경유" : "직항";
export const locName = id => LOC_BY_ID[id] ? `${LOC_BY_ID[id].emoji || ""} ${LOC_BY_ID[id].name}`.trim() : id;
export const ticketLabel = t => `${locName(t.to)} ${ticketKind(t)}${t.via ? ` (경유: ${locName(t.via)})` : ""}`;
export const legLabel = l => l.k === "plane" ? "✈️ 비행기" : `${l.k === "stop" ? "🛬 경유지" : "🏁 도착"} ${locName(l.loc)}`;
export const legsText = legs => legs.map(legLabel).join(" → ");

// gate 3 lounge (6,000G): one of these at random
export const LOUNGE_FEE = 6000;
export const LOUNGE = [
    { id: "massage", emoji: "💆", name: "공항 마사지", desc: "HP FULL 회복" },
    { id: "food", emoji: "🍱", name: "Lounge Food", desc: "HP +30 · 식량 +30" },
    { id: "drink", emoji: "🥤", name: "Lounge Drink", desc: "물 · 콜라 · 에너지드링크 · 우유 중 하나 (한 번 더 랜덤)", foods: ["water", "cola", "energydrink", "milk"] },
    { id: "spa", emoji: "🐾", name: "EmoMonster Spa", desc: "내 이모몬스터 전원 FULL HP (없으면 무효)" }
];

// plane crash odds by the weather (+ 7% plane fault, whatever the weather)
export const CRASH_WX = { sun: 0.05, rain: 0.08, storm: 0.25, snow: 0.10, blizzard: 0.30, heat: 0.06, hail: 0.12 };
export const CRASH_FAULT = 0.07;
// who survives a crash (Air monster owners: +10% to be spared — never a guarantee)
export const CRASH_FATE = [
    { id: "all_dead", w: 10, label: "전원 바로 사망" },
    { id: "half", w: 60, label: "탑승객의 절반 생존 (홀수면 반올림 · 6명 전원 탑승이면 4명 생존)" },
    { id: "all_live", w: 10, label: "탑승객 전원 생존" },
    { id: "one", w: 10, label: "탑승객 중 1명만 생존" },
    { id: "two", w: 10, label: "탑승객 중 2명만 생존" }
];
export const AIR_BONUS = 0.10;
export const CRASH_WHY = "✈️ 비행기 추락으로 인한 바로 사망";
export const CRASH_REASONS = { sun: "엔진 과열", rain: "빗길 활주 이상 · 계기 고장", storm: "폭우 속 낙뢰", snow: "날개 결빙", blizzard: "폭설 속 시야 상실", heat: "폭염으로 인한 엔진 과열", hail: "우박으로 인한 엔진 손상", fault: "비행기 기체 결함" };

export function air(s = S()) {
    if (!s) return null;
    const a = (s.air ||= { open: true, since: s.round || 1, waiting: {}, assigned: {}, tickets: {}, pax: [], lounge: {}, flights: {} });
    a.waiting ||= {}; a.assigned ||= {}; a.tickets ||= {}; a.pax ||= []; a.flights ||= {}; a.lounge ||= {};
    return a;
}
export const airportOpen = () => { const a = air(); return !!a && a.open !== false && !a.departed; };
export const gateOf = locId => LOC_BY_ID[locId]?.gate || null;
export const ticketOf = pid => { const x = air()?.tickets?.[pid]; return x ? { ...x, t: TICKET_BY_ID[x.id] } : null; };
export const waitingList = () => Object.keys(air()?.waiting || {}).map(Number).filter(pid => !ps_(pid)?.out);
const paxTarget = () => Math.min(PAX_MAX, Math.max(1, alive().length));
export const onTrip = pid => { const tr = ps_(pid)?.trip; return !!tr && !tr.done; };

// ---- keep the gate list honest: the dead leave, a random other player is placed instead
export function airSync() {
    const a = air(); if (!a || !airportOpen()) return;
    let dropped = 0;
    for (const pid of Object.keys(a.waiting).map(Number)) if (ps_(pid)?.out) { delete a.waiting[pid]; dropped++; }
    for (const pid of Object.keys(a.assigned).map(Number)) if (ps_(pid)?.out) { delete a.assigned[pid]; dropped++; }
    for (let i = 0; i < dropped; i++) assignOne("✈️ 대기 중이던 탑승객이 탈락 — 빈자리를 채웁니다");
}
const placeable = pid => !a_has(pid) && !ps_(pid)?.out && !onTrip(pid) && !ps_(pid)?.elev && !ps_(pid)?.kidnap;
const a_has = pid => { const a = air(); return !!(a.waiting[pid] || a.assigned[pid]); };
function assignOne(why = "") {
    const a = air();
    const cand = shuffle(alive().filter(placeable));
    const pid = cand[0];
    if (pid == null) return null;
    a.assigned[pid] = rint(1, 3);
    G.log(`✈️ ${G.name(pid)} → 다음 턴에 Airport Gate ${a.assigned[pid]}(으)로 배치${why ? ` (${why})` : ""}`, [pid]);
    return pid;
}
// every round start: enough players are placed at the gates that 6 have gathered by round `since + 2`
export function airRoundStart(s) {
    const a = air(s); if (!a || !airportOpen()) return;
    airSync();
    const have = Object.keys(a.waiting).length + Object.keys(a.assigned).length;
    const need = Math.max(0, paxTarget() - have);
    if (!need) return;
    const roundsLeft = Math.max(1, a.since + FILL_ROUNDS - (s.round || 1));
    const k = Math.ceil(need / roundsLeft);
    for (let i = 0; i < k; i++) assignOne(`${FILL_ROUNDS}라운드 안에 탑승객 ${PAX_MAX}명을 모읍니다`);
}

// ---- tickets
export function canBuyTicket(pid, t) {
    const ps = ps_(pid), c = ticketPrice(t);
    if (air()?.tickets?.[pid]) return { ok: false, why: "이미 티켓을 구입했습니다 (변경은 🛎️ 공항 서비스)" };
    if (c.pts && ps.points < c.pts) return { ok: false, why: `포인트 부족 (${c.pts}P)` };
    if (c.gold && wallet(ps) < c.gold) return { ok: false, why: `골드 부족 (${c.gold.toLocaleString()}G)` };
    return { ok: true };
}
export function buyTicket(pid, ticketId, vip = false) {
    const ps = ps_(pid), t = TICKET_BY_ID[ticketId], a = air();
    if (!t || !canBuyTicket(pid, t).ok) return false;
    vip = vip && !t.free;
    const c = ticketPrice(t), gold = c.gold + (vip ? VIP_FEE : 0);
    if (wallet(ps) < gold || ps.points < c.pts) return false;
    payGold(ps, gold); ps.points -= c.pts;
    a.tickets[pid] = { id: t.id, gate: +ticketId[1], vip, paid: c.gold, pts: c.pts };
    G.log(`🎫 ${G.name(pid)} ${ticketLabel(t)} 티켓 구입${vip ? " (👑 VIP 1등석)" : ""} — ${c.pts ? `${c.pts}P` : `${c.gold.toLocaleString()}G`}${vip ? ` + ${VIP_FEE.toLocaleString()}G` : ""}`);
    Store.saveSeason(true);
    return true;
}
// 🛎️ change: 10,000G + the new ticket's price (nothing back for the old one) · VIP stays when the new ticket allows it
export function changeTicket(pid, ticketId) {
    const ps = ps_(pid), a = air(), cur = a.tickets[pid], t = TICKET_BY_ID[ticketId];
    if (!cur || !t || cur.id === t.id) return { ok: false, why: "바꿀 티켓을 고르세요" };
    const c = ticketPrice(t), gold = CHANGE_FEE + c.gold;
    if (wallet(ps) < gold) return { ok: false, why: `골드 부족 (${gold.toLocaleString()}G)` };
    if (ps.points < c.pts) return { ok: false, why: `포인트 부족 (${c.pts}P)` };
    payGold(ps, gold); ps.points -= c.pts;
    const vip = cur.vip && !t.free;
    a.tickets[pid] = { id: t.id, gate: cur.gate, vip, paid: c.gold, pts: c.pts, changed: true };
    G.log(`🛎️ ${G.name(pid)} 티켓 변경 → ${ticketLabel(t)} (변경료 ${CHANGE_FEE.toLocaleString()}G${c.gold ? ` + ${c.gold.toLocaleString()}G` : ""}${c.pts ? ` + ${c.pts}P` : ""})`);
    Store.saveSeason(true);
    return { ok: true, vipLost: cur.vip && !vip };
}
export function upgradeSeat(pid) {
    const ps = ps_(pid), cur = air().tickets[pid];
    if (!cur) return { ok: false, why: "구입한 티켓이 없습니다" };
    if (cur.vip) return { ok: false, why: "이미 VIP 1등석입니다" };
    if (TICKET_BY_ID[cur.id]?.free) return { ok: false, why: "무료 티켓은 VIP 1등석으로 바꿀 수 없습니다" };
    if (wallet(ps) < UPGRADE_FEE) return { ok: false, why: `골드 부족 (${UPGRADE_FEE.toLocaleString()}G)` };
    payGold(ps, UPGRADE_FEE); cur.vip = true;
    G.log(`👑 ${G.name(pid)} 좌석 업그레이드 → VIP 1등석 (${UPGRADE_FEE.toLocaleString()}G)`);
    Store.saveSeason(true);
    return { ok: true };
}
export function loungeTry(pid) {
    const ps = ps_(pid), a = air();
    if (wallet(ps) < LOUNGE_FEE) return { ok: false, why: `골드 부족 (${LOUNGE_FEE.toLocaleString()}G)` };
    payGold(ps, LOUNGE_FEE);
    const pick = pickOne(LOUNGE);
    const out = { ok: true, pick };
    if (pick.id === "massage") { out.hp = Math.max(0, 100 - ps.hp); ps.hp = Math.max(ps.hp, 100); }
    if (pick.id === "drink") out.food = pickOne(pick.foods);
    a.lounge[pid] = (a.lounge[pid] || 0) + 1;
    G.log(`🛋️ ${G.name(pid)} 공항 라운지 (${LOUNGE_FEE.toLocaleString()}G) → ${pick.emoji} ${pick.name}`);
    Store.saveSeason(true);
    return out;
}

// ---- the turn at a gate ends: buy-or-default → wait → (6th) take-off
// → { waited: n, target } or { depart: [pids] }
export function gateTurnEnd(pid, gate) {
    const a = air();
    if (!a || !airportOpen()) return null;
    if (!a.tickets[pid]) {
        const t = defaultTicket(gate);
        a.tickets[pid] = { id: t.id, gate, vip: false, paid: 0, pts: 0, auto: true };
        G.log(`🎫 ${G.name(pid)} 티켓 미구입 → ${ticketLabel(t)} 무료 티켓 자동 적용`);
    }
    a.waiting[pid] = gate;
    delete a.assigned[pid];
    const list = waitingList();
    if (list.length >= paxTarget()) return { depart: depart(list.slice(0, PAX_MAX)) };
    Store.saveSeason(true);
    return { waited: list.length, target: paxTarget() };
}
function depart(pax) {
    const s = S(), a = air();
    a.departed = true; a.open = false; a.departRound = s.round; a.pax = pax;
    for (const pid of pax) {
        const tk = a.tickets[pid], t = TICKET_BY_ID[tk.id];
        ps_(pid).trip = { ticket: tk.id, gate: tk.gate, vip: !!tk.vip, legs: t.legs.map(l => ({ ...l })), idx: 0, done: false, season: s.number };
    }
    a.waiting = {}; a.assigned = {};
    G.log(`🛫 비행기 이륙! 탑승객 ${pax.length}명: ${pax.map(G.name).join(", ")} — Airport는 이번 시즌 동안 폐쇄됩니다`);
    Store.saveSeason(true);
    return pax;
}

// ---- trips
export const tripOf = pid => ps_(pid)?.trip || null;
export const passengers = () => (air()?.pax || []).filter(pid => ps_(pid)?.trip);
const playedThisRound = pid => !!S()?.results?.[pid] || S()?.turn?.pid === pid;
// the leg the passenger is on right now (this round's, or the next one if they have not played yet)
export function legNow(pid) {
    const tr = tripOf(pid);
    if (!tr) return null;
    const i = playedThisRound(pid) ? tr.idx - 1 : tr.idx;
    return tr.legs[Math.max(0, Math.min(tr.legs.length - 1, i))] || null;
}
export const inPlaneNow = pid => { const tr = tripOf(pid); return !!tr && !tr.done && legNow(pid)?.k === "plane"; };
export const finalDest = pid => { const tr = tripOf(pid); return tr ? tr.legs[tr.legs.length - 1]?.loc : null; };
export const isVip = pid => !!tripOf(pid)?.vip || !!air()?.tickets?.[pid]?.vip;

// ================================================================ 🛫 turn start routing (season.startHooks)
//  ✈️ trip leg · 🛫 waiting / placed at a gate · 🛗 trapped in the elevator / placed there
export function turnStart(pid, t) {
    const ps = ps_(pid); if (!ps) return false;
    const a = air();
    // ✈️ a passenger's next leg
    const tr = ps.trip;
    if (tr && !tr.done && a?.departed) {
        const leg = tr.legs[tr.idx];
        if (leg) {
            tr.idx++;
            if (tr.idx >= tr.legs.length) tr.done = true;
            if (leg.k === "plane") {
                go(t, "plane", "airport");
                t.remaining = Math.min(t.remaining, PLANE_SECONDS);
                t.xArrive = { kind: "board" };
                decideFlight(pid);
            } else {
                const to = elevatorRedirect(leg.loc);
                go(t, to, LOC_BY_ID[to]?.region);
                t.xArrive = { kind: "land", leg: { ...leg, loc: to }, crash: !!leg.crash, needArrive: true };
            }
            return true;
        }
        tr.done = true;
    }
    // 🛫 airport
    if (a && airportOpen()) {
        const g = a.waiting[pid] || a.assigned[pid];
        if (g) {
            const was = !!a.waiting[pid];
            go(t, "gate" + g, "airport");
            t.xArrive = { kind: was ? "gateWait" : "gatePlaced", gate: g };
            return true;
        }
    }
    // 🛗 elevator
    if (ps.elev) { go(t, ps.elev.floor || "elev_1", "difficult"); t.elevIn = t.remaining; t.remaining = Math.min(t.remaining, ELEV_SECONDS); t.xArrive = { kind: "elevTrapped" }; return true; }
    if (elev().assigned?.[pid]) {
        delete elev().assigned[pid];
        if (elevatorOpen()) { enterElevator(pid, t); t.xArrive = { kind: "elevPlaced" }; return true; }
    }
    return false;
}
function go(t, locId, region) {
    t.region = region || LOC_BY_ID[locId]?.region || "sub";
    G.setLocation(locId, { teleport: true });
    t.running = true;
}

// ---- flight / crash: decided once per round, when the first plane turn of the round starts
export function crashOdds(locId = "plane") {
    const w = weatherAt(locId);
    const pw = CRASH_WX[w.id] ?? 0.08;
    const onboard = passengers().filter(inPlaneNow).length;
    const base = 1 - (1 - pw) * (1 - CRASH_FAULT);
    const occ = 0.5 + 0.5 * Math.min(1, onboard / PAX_MAX); // 🧍 the fuller the plane, the likelier
    return { w, pw, fault: CRASH_FAULT, onboard, p: Math.min(0.95, base * occ), base };
}
function decideFlight(pid) {
    const s = S(), a = air();
    const f = a.flights[s.round];
    if (f) return f;
    const odds = crashOdds();
    // 🧪 map test: the bots never play — the crash happens in the test player's turn; "추락 체험" forces it
    const test = s.sandbox && !s.testSeason;
    const cand = test ? [pid] : passengers().filter(x => !ps_(x)?.out && (x === pid || (!playedThisRound(x) && tripOf(x)?.legs[tripOf(x).idx]?.k === "plane")));
    const crash = !a.crashed && (test && a.forceCrash != null ? !!a.forceCrash : rnd() < odds.p);
    const fault = crash && rnd() < CRASH_FAULT / (odds.pw + CRASH_FAULT);
    a.flights[s.round] = { round: s.round, p: odds.p, wx: odds.w.id, crash, pid: crash ? pickOne(cand) : null, fault, at: rint(PLANE_SECONDS - 210, PLANE_SECONDS - 45) };
    Store.saveSeason();
    return a.flights[s.round];
}
export const flightNow = () => air()?.flights?.[S()?.round] || null;
// 🔥 is the crash due in this turn now?
export function crashDue(t) {
    const f = flightNow();
    return !!(f?.crash && !f.done && t?.loc === "plane" && +f.pid === +t.pid && t.remaining <= f.at);
}
export const crashReason = () => { const f = flightNow(); return f?.fault ? CRASH_REASONS.fault : CRASH_REASONS[f?.wx] || CRASH_REASONS.fault; };
// everyone on board right now (the eliminated ones are shown greyed)
export const onBoard = () => passengers().filter(pid => { const tr = tripOf(pid); return tr && !tr.landedCrash && !tr.done && (ps_(pid)?.out ? legNow(pid)?.k === "plane" : inPlaneNow(pid)); });
// draw the fate → { fate, victims (dying order), survivors, spared (Air) }
export function crashFate() {
    const live = onBoard().filter(pid => !ps_(pid)?.out);
    const n = live.length;
    let x = rnd() * CRASH_FATE.reduce((a, f) => a + f.w, 0), fate = CRASH_FATE[1];
    for (const f of CRASH_FATE) { if ((x -= f.w) < 0) { fate = f; break; } }
    const keep = fate.id === "all_dead" ? 0 : fate.id === "all_live" ? n : fate.id === "one" ? Math.min(1, n) : fate.id === "two" ? Math.min(2, n)
        : (n === PAX_MAX && onBoard().length === PAX_MAX ? 4 : Math.ceil(n / 2));
    const order = shuffle(live);
    let survivors = order.slice(0, keep), victims = order.slice(keep);
    const spared = victims.filter(pid => ownsTypes(pid, ["Air"]) && rnd() < AIR_BONUS);
    victims = victims.filter(pid => !spared.includes(pid)); survivors = [...survivors, ...spared];
    return { fate, victims, survivors, spared };
}
// dying order = rank order: the one who'd arrive LATEST dies first (worst rank) — next stop is a stopover < the final map;
// both final: the lower map number first; same map: the earlier play order first
export function rankOrder(victims) {
    const s = S();
    const nextReal = pid => { const tr = tripOf(pid); if (!tr) return null; for (let i = Math.max(0, tr.idx - (playedThisRound(pid) ? 0 : 0)); i < tr.legs.length; i++) if (tr.legs[i].k !== "plane") return tr.legs[i]; return null; };
    const key = pid => { const l = nextReal(pid); return [l?.k === "dest" ? 1 : 0, mapNo(l?.loc) || 0, s.order.indexOf(pid)]; };
    return [...victims].sort((a, b) => { const ka = key(a), kb = key(b); return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2]; });
}
// apply the crash: victims die (rank order), survivors lose half their HP and fly no more → 🏝️ Island (콤보랜드)
export function applyCrash({ fate, victims, survivors, spared }) {
    const s = S(), a = air(), f = flightNow();
    if (f) f.done = true;
    a.crashed = { round: s.round };
    const board = onBoard();
    const report = {
        id: "ac" + Date.now().toString(36), season: s.number, round: s.round, at: new Date().toISOString(), wx: f?.wx || "sun", reason: crashReason(), fault: !!f?.fault, fate: fate.id,
        pax: board.map(pid => ({ pid, gate: tripOf(pid)?.gate, ticket: tripOf(pid)?.ticket, legs: tripOf(pid)?.legs, vip: !!tripOf(pid)?.vip,
            fate: ps_(pid)?.out && !victims.includes(pid) ? "out" : victims.includes(pid) ? "dead" : "live", air: spared.includes(pid) }))
    };
    for (const pid of survivors) {
        const ps = ps_(pid), tr = ps.trip;
        ps.hp = Math.max(1, Math.ceil(ps.hp / 2));
        tr.legs = [dest("island")]; tr.legs[0].crash = true; tr.idx = 0; tr.done = false; tr.landedCrash = true;
    }
    for (const pid of board) if (ps_(pid)?.trip) ps_(pid).trip.landedCrash = true;
    G.log(`💥 비행기 추락! (${report.reason}) 생존 ${survivors.length}명: ${survivors.map(G.name).join(", ") || "없음"} · 사망 ${victims.length}명: ${victims.map(G.name).join(", ") || "없음"}`);
    (Store.community ||= { posts: [] }).airReports = [report, ...(Store.community.airReports || [])].slice(0, 100);
    Store.saveCommunity?.();
    // ☠️ rank order: kill the latest arrival first (they get the worst rank); the turn player is killed in that order too
    const cur = s.turn?.pid;
    const ordered = rankOrder(victims);
    for (const pid of ordered.filter(x => x !== cur)) G.killPlayer(pid, CRASH_WHY, { quiet: true, hl: "plane_crash" });
    if (ordered.includes(cur)) G.killPlayer(cur, CRASH_WHY, { quiet: true, hl: "plane_crash" });
    Store.saveSeason(true);
    return report;
}
// a survivor whose turn it is: off the plane right now → Island
export function crashSurvivorLand(pid) {
    const tr = tripOf(pid); if (!tr) return;
    tr.idx = 1; tr.done = true;
}
export const airReports = () => Store.community?.airReports || [];

// ================================================================ 🛗 ELEVATOR
export const ELEV_CAP = 6, ELEV_SECONDS = 300, ELEV_MIN_STAY = 120, ELEV_MOVES = 3;
export const FLOORS = ["elev_1", "elev_2", "elev_3", "elev_4", "elev_5", "elev_6", "elev_7", "elev_8", "elev_9", "elev_10", "elev_roof"];
export const floorLabel = id => id === "elev_roof" ? "옥상" : `${LOC_BY_ID[id]?.floor || "?"}층`;
export function elev(s = S()) { const e = (s.elev ||= { assigned: {} }); e.assigned ||= {}; return e; }
export const elevOccupants = () => alive().filter(pid => ps_(pid)?.elev);
export const elevatorOpen = () => elevOccupants().length < ELEV_CAP;
export function enterElevator(pid, t) {
    const ps = ps_(pid);
    ps.elev = { floor: "elev_1", since: S().round };
    if (elevOccupants().length >= ELEV_CAP) { elev().wasFull = true; G.log("🛗 엘리베이터 정원 6명이 모두 찼습니다 — 엘리베이터 폐쇄"); }
    t.elevIn = t.remaining;
    t.remaining = Math.min(t.remaining, ELEV_SECONDS);
    t.region = "difficult";
    G.setLocation("elev_1", { teleport: true });
    t.running = true;
    G.log(`🛗 ${G.name(pid)} 엘리베이터에 갇혔다! (1층)`);
    Store.saveSeason(true);
}
// a ticket / trip into a full elevator: another Difficult Land map instead
export function elevatorRedirect(locId) {
    if (locId !== "elevator" || elevatorOpen()) return locId;
    const pool = LOCATIONS.filter(l => l.region === "difficult" && !l.off && !l.elevator);
    return pickOne(pool)?.id || "nothing_casino";
}
export const movesLeft = pid => { const e = ps_(pid)?.elev; if (!e) return 0; if (e.mvRound !== S().round) return ELEV_MOVES; return Math.max(0, ELEV_MOVES - (e.mv || 0)); };
export function moveFloor(pid, to = null) {
    const ps = ps_(pid), e = ps.elev, t = S().turn;
    if (!e || !t) return null;
    if (!to) {
        if (movesLeft(pid) <= 0) return null;
        if (e.mvRound !== S().round) { e.mvRound = S().round; e.mv = 0; }
        e.mv++;
        to = pickOne(FLOORS.filter(f => f !== t.loc));
    }
    e.floor = to;
    G.setLocation(to, { teleport: true });
    G.log(`🛗 ${G.name(pid)} → ${floorLabel(to)}`);
    Store.saveSeason(true);
    return to;
}
// 7F: out — the next round is normal again; a free seat may go to someone else
export function escapeElevator(pid, why = "탈출") {
    const ps = ps_(pid); if (!ps?.elev) return;
    ps.elev = null;
    G.log(`🛗 ${G.name(pid)} 엘리베이터 ${why}!`);
    refillElevator();
    Store.saveSeason(true);
}
export function refillElevator() {
    const e = elev();
    if (!e.wasFull) return;
    const busy = new Set([...elevOccupants(), ...Object.keys(e.assigned).map(Number)]);
    if (busy.size >= ELEV_CAP) return;
    const cand = shuffle(alive().filter(pid => !busy.has(pid) && !onTrip(pid) && !air()?.waiting?.[pid] && !air()?.assigned?.[pid] && S().turn?.pid !== pid));
    if (cand[0] != null) { e.assigned[cand[0]] = true; G.log(`🛗 엘리베이터에 빈자리 — ${G.name(cand[0])}이(가) 다음 턴에 엘리베이터로 배정됩니다`, [cand[0]]); }
}
// rescue (7F, 5,000G): a random trapped player walks out with you · +20 intimacy
export const RESCUE_FEE = 5000;
export const trappedOthers = pid => elevOccupants().filter(x => x !== pid);
export function rescue(pid) {
    const ps = ps_(pid), list = trappedOthers(pid);
    if (!list.length) return { ok: false, why: "구제할 사람이 없습니다" };
    if (wallet(ps) < RESCUE_FEE) return { ok: false, why: `골드 부족 (${RESCUE_FEE.toLocaleString()}G)` };
    payGold(ps, RESCUE_FEE);
    const who = pickOne(list);
    escapeElevator(who, `구제됨 (${G.name(pid)}의 도움)`);
    adjustIntimacy(pid, who, 20, "🛗 엘리베이터 구제");
    G.log(`🆘 ${G.name(pid)}이(가) ${G.name(who)}을(를) 엘리베이터에서 구제! (친밀도 +20)`, [who]);
    return { ok: true, who, list };
}
// 6F 엘리베이터 상점: floor tickets (items) — once per round
export const FLOOR_PASSES = [
    { id: "elev_pass_1", floor: "elev_1", name: "엘리베이터 1층권 (커뮤니티)", price: 3000 },
    { id: "elev_pass_2", floor: "elev_2", name: "엘리베이터 2층권 (슬롯/카지노)", price: 10000 },
    { id: "elev_pass_3", floor: "elev_3", name: "엘리베이터 3층권 (상점)", price: 5000 },
    { id: "elev_pass_4", floor: "elev_4", name: "엘리베이터 4층권 (무기상점)", price: 4000 },
    { id: "elev_pass_5", floor: "elev_5", name: "엘리베이터 5층권 (푸드)", price: 5000 },
    { id: "elev_pass_8", floor: "elev_8", name: "엘리베이터 8층권 (이모몬스터)", price: 5000 },
    { id: "elev_pass_10", floor: "elev_10", name: "엘리베이터 10층권 (은행)", pts: 10 },
    { id: "elev_pass_roof", floor: "elev_roof", name: "엘리베이터 옥상권 (슬롯/카지노)", price: 8000 }
];
for (const f of FLOOR_PASSES) if (!ITEM_BY_ID[f.id]) { const it = { id: f.id, name: f.name, emoji: "🛗", elevFloor: f.floor, desc: "🛗 엘리베이터 안에서만: 계기판에서 사용하면 이 층으로 바로 이동합니다 (이동 횟수 차감 없음)." }; ITEMS.push(it); ITEM_BY_ID[f.id] = it; }

// ================================================================ 🏕️ CAMPSITE
export const CAMP_SPOTS = {
    trash: { loc: "camp_trash", name: "쓰레기통", emoji: "🗑️", found: 0.20 },
    house: { loc: "camp_house", name: "빈집", emoji: "🏚️", found: 0.20 },
    forest: { loc: "camp_forest", name: "숲속", emoji: "🌲", found: 0.20 },
    tent: { loc: "camp_tent", name: "텐트", emoji: "⛺", found: 0.20 },
    lake: { loc: "camp_lake", name: "호숫가", emoji: "🏞️", found: 0.10 },
    basement: { loc: "camp_basement", name: "지하실", emoji: "🕳️", found: 0.10 }
};
export const CAMP_MIN_KILLS = 2, CAMP_GOLD = [1000, 10000];
// the slasher's methods (Friday-the-13th style) — {n} = the camper, {p} = the place
export const KILLS = [
    "{p}에 숨어 있다가 전기톱에 두 동강 남", "{p}에서 쫓기다가 마체테에 살해당함", "Off-Screen으로 살해당한 채 {p}에서 발견", "{p} 근처에서 전기드릴로 공격당해 사망",
    "{p}에서 엽총을 맞아 사망", "{p}에 숨어 있다가 곰덫에 걸려 사망", "{p} 뒤편에서 도끼에 맞아 사망", "{p}에서 목이 졸려 사망", "{p}에서 활에 맞아 사망",
    "{p}에서 침낭째 나무에 내리쳐져 사망", "{p}에서 쇠꼬챙이에 꿰뚫려 사망", "{p}에서 마스크를 벗기려다 사망", "{p} 창문 밖으로 끌려나가 사망", "{p}에서 낫에 베여 사망"
];
export const LAKE_KILLS = ["호숫가에서 숨어 있다가 익사당함", "호숫가에서 보트째 뒤집혀 익사당함"];
export const killText = (spot, k = null) => spot === "lake" && rnd() < 0.5 ? pickOne(LAKE_KILLS) : (k || pickOne(KILLS)).replace("{p}", CAMP_SPOTS[spot]?.name || "캠프장");
// 5 campers from the players who are NOT in this season: 3 women + 2 men (fewer if the pool is short)
export function drawCampers() {
    const roster = new Set((S()?.roster || []).map(Number));
    const pool = (Store.players || []).filter(p => !roster.has(+p.id));
    const g = p => String(p.gender || "").toLowerCase() === "female" ? "f" : "m";
    const f = shuffle(pool.filter(p => g(p) === "f")).slice(0, 3), m = shuffle(pool.filter(p => g(p) === "m")).slice(0, 2);
    let list = [...f, ...m];
    if (list.length < 5) list = [...list, ...shuffle(pool.filter(p => !list.includes(p))).slice(0, 5 - list.length)];
    return shuffle(list).map(p => ({ pid: +p.id, gender: g(p), spot: null, dead: false, how: null }));
}
export function campStart(t, spot, campers) {
    const keys = Object.keys(CAMP_SPOTS);
    for (const c of campers) c.spot = pickOne(keys);
    t.camp = { spot, campers, kills: [], found: false, foundAt: null, campIn: t.remaining, plan: [] };
    // the slasher's schedule: 2~4 campers die at random moments (the first two before 4:00 of play) · the player's spot is checked once
    const victims = shuffle(campers).slice(0, rint(CAMP_MIN_KILLS, Math.min(4, campers.length)));
    let at = t.remaining - rint(30, 70);
    for (const [i, c] of victims.entries()) { t.camp.plan.push({ pid: c.pid, at: Math.max(20, at) }); at -= i < 1 ? rint(40, 80) : rint(50, 100); }
    if (rnd() < CAMP_SPOTS[spot].found) t.camp.foundAt = Math.max(15, t.remaining - rint(60, 260));
    G.log(`🏕️ ${G.name(t.pid)} Campsite — ${CAMP_SPOTS[spot].emoji} ${CAMP_SPOTS[spot].name}에 숨었다`);
    Store.saveSeason();
    return t.camp;
}
export const campKillsLeft = t => Math.max(0, CAMP_MIN_KILLS - (t?.camp?.kills?.length || 0));
// survivors (campers + the player if alive) get 1,000~10,000G — campers keep theirs for a later season (wallet)
export function campPayout(t, playerAlive) {
    const out = [];
    for (const c of t.camp?.campers || []) if (!c.dead) {
        const g = Math.round(rint(CAMP_GOLD[0], CAMP_GOLD[1]) / 100) * 100;
        Store.wallets ||= {}; Store.wallets[c.pid] = (Store.wallets[c.pid] || 0) + g; out.push({ pid: c.pid, gold: g, camper: true });
    }
    if (playerAlive && ps_(t.pid)) { const g = Math.round(rint(CAMP_GOLD[0], CAMP_GOLD[1]) / 100) * 100; ps_(t.pid).money += g; out.push({ pid: t.pid, gold: g }); G.log(`🏕️ ${G.name(t.pid)} Campsite 생존 보상 +${g.toLocaleString()}G`); }
    if (out.some(o => o.camper)) Store.saveWallets?.();
    Store.saveSeason(true);
    return out;
}

// ================================================================ 💻 CYBER TOWN glitch
export const GLITCH_MAX = 0.7, SLOT_GLITCH = 0.1;
export const glitchOn = () => !!LOC_BY_ID[S()?.turn?.loc]?.glitch;
export function glitchRate(t = S()?.turn) { if (!t) return 0; if (t.glitchRate == null || t.glitchLoc !== t.loc) { t.glitchRate = +(rnd() * GLITCH_MAX).toFixed(3); t.glitchLoc = t.loc; } return t.glitchRate; }
export const glitch = () => glitchOn() && rnd() < glitchRate();
// gold grabbed off another player (Cyber Hacking Work / glitched help): intimacy halved
export function grabGold(pid, from, [lo, hi], why) {
    const fp = ps_(from);
    const pct = lo + rnd() * (hi - lo);
    let have = fp ? Math.max(0, fp.money) : Math.max(0, Store.wallets?.[from] || 0);
    const g = Math.round(have * pct / 100) * 1;
    if (fp) fp.money -= g; else if (g) { Store.wallets[from] -= g; Store.saveWallets?.(); }
    ps_(pid).money += g;
    halveIntimacy(pid, from, why);
    G.log(`💻 ${G.name(pid)} ${why}: ${G.name(from)}의 골드 ${Math.round(pct * 100)}% (${g.toLocaleString()}G) 갈취 · 친밀도 절반`, [from]);
    Store.saveSeason(true);
    return { gold: g, pct };
}

// ================================================================ 💞 intimacy adjustments (game/social.js intimacy() adds these)
export function adjustIntimacy(a, b, pts, label) {
    const C = (Store.community ||= { posts: [] });
    (C.intimacyAdj ||= []).push({ a: +a, b: +b, pts: Math.round(pts), label, season: S()?.number ?? null, at: Date.now() });
    C.intimacyAdj = C.intimacyAdj.slice(-1000);
    Store.saveCommunity?.();
}
let _intimacy = null;
export const setIntimacyFn = f => { _intimacy = f; };
export function halveIntimacy(a, b, label) {
    const cur = _intimacy ? _intimacy(a, b).score : 0;
    const cut = cur > 0 ? -Math.ceil(cur / 2) : 0;
    if (cut) adjustIntimacy(a, b, cut, `${label} (친밀도 절반)`);
    else adjustIntimacy(a, b, -1, `${label}`);
}

// ================================================================ 🪆 DOLL FACTORY curses · 🔪 Self-Harm
export function dollCurse(pid) {
    const ps = ps_(pid);
    const had = ps.pet;
    ps.pet = "evil_doll";
    G.log(`🪆 ${G.name(pid)} Doll Curse! 펫이 Evil Doll이 되었다${had && had !== "evil_doll" ? "" : ""}`);
    Store.saveSeason(true);
    return { had };
}
export function clownCurse(pid) {
    const ps = ps_(pid);
    ps.weapons ||= [];
    if (!ps.weapons.includes("self_harm")) {
        // forced in — even over a full weapon bag (the newest weapon is pushed out)
        if (ps.weapons.length >= 6) ps.weapons.pop();
        ps.weapons.push("self_harm");
    }
    G.log(`🤡 ${G.name(pid)} Clown Curse! 🔪 Self-Harm 무기가 강제로 심어졌다`);
    Store.saveSeason(true);
}
export const hasSelfHarm = pid => (ps_(pid)?.weapons || []).includes("self_harm");

// ================================================================ hooks into game/season.js
G.startHooks.push(turnStart);
G.roundHooks.push(s => { try { airRoundStart(s); } catch (e) { console.error(e); } try { refillElevator(); } catch (e) { console.error(e); } });
// 🚪 entry rules: the airport after take-off · a full elevator · the sub rooms
G.enterChecks.push((pid, loc) => {
    if (loc.sub) return { ok: false, why: "갈 수 없는 곳" };
    if (loc.region === "airport" && !airportOpen()) return { ok: false, why: "✈️ 비행기 출발 — 이번 시즌 폐쇄" };
    if (loc.elevator && !elevatorOpen()) return { ok: false, why: `🛗 엘리베이터 정원 ${ELEV_CAP}명 — 폐쇄` };
    return null;
});
