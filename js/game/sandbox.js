// =====================================================================
// Test mode: an admin plays a whole turn with the TEST PLAYER to try the
// regions, maps, shops, corners, NPCs and missions. The real season is put
// aside, and NOTHING is saved while the test runs (Store.saveLocal / write
// are switched off). Leaving reloads the page, which brings everything back.
// =====================================================================
import { CONFIG } from "../config.js";
import { Store } from "../core/store.js";
import { REGION_ITEMS, ALPHABET, cardId, LOCATIONS } from "../data/catalog.js";
import * as G from "./season.js";

export const TEST_PID = 999999;
export const isSandbox = () => !!Store.sandbox;

export function testPlayer(country = "Emo World") {
    return {
        id: TEST_PID, login_id: "", name_ko: "테스트 플레이어", player_name: "Test Player",
        profile_image: "images/players/test_player.svg", country, school: "Test Univ.", job: "QA Tester",
        ethnicity: "Robot", age_group: "Young Adult", gender: "male", preference: "Straight",
        handler: "JAMES", is_active: false, _test: true
    };
}

export function startSandbox({ country, mission, money = 8000000, points = 2000, kit = true, startLoc = null } = {}) {
    if (!Store.sandbox) Store.sandbox = { real: Store.season };
    Store.allPlayers = Store.allPlayers.filter(p => p.id !== TEST_PID && !BOT_IDS.includes(p.id));
    Store.allPlayers.push(testPlayer(country));
    const items = {};
    if (kit) {
        for (const r of REGION_ITEMS) items[r.id] = 5;
        for (const L of ALPHABET) items[cardId(L)] = 1;
        Object.assign(items, { time_ext: 2, slot_plus5: 3, casino_plus1: 3, hp_50: 1, mission_pass: 1 });
    }
    Store.season = {
        number: 0, sandbox: true, status: "turns", startedAt: new Date().toISOString(),
        roster: [TEST_PID], round: 1, mission: null, order: [TEST_PID], turnIdx: 0, turn: null,
        results: {}, candidates: [], history: [], log: [],
        sandboxStart: startLoc,
        ps: {
            [TEST_PID]: {
                money, points, hp: CONFIG.START_HP, pet: null, petEffect: null, weapons: [], items, loanGold: 0, loan: null,
                use: { slot: 0, casino: 0 }, extra: { slot: 500, casino: 200 }, out: false, outRound: null, rank: null, visited: [],
                totals: { slotNet: 0, casinoNet: 0, points: 0, spins: 0, plays: 0 }
            }
        }
    };
    G.setMission(mission);
    G.log("🧪 테스트 모드 시작 — 아무것도 저장되지 않습니다");
}

// 🤖 test bots: extra passengers / trapped people for the airport & elevator tests (they never play a turn)
export const BOT_IDS = [999991, 999992, 999993, 999994, 999995];
export const isBot = pid => BOT_IDS.includes(+pid);
const botPlayer = (id, i) => ({
    id, login_id: "", name_ko: `테스트봇 ${i + 1}`, player_name: `Test Bot ${i + 1}`,
    profile_image: "images/players/test-bot.svg", country: "Emo World", school: "Test Univ.", job: "Bot",
    ethnicity: "Robot", age_group: "Young Adult", gender: "male", preference: "Straight",
    handler: "JAMES", is_active: false, _test: true, _bot: true
});
// add (or bring back) the 5 bots → their pids · only in the map test
export function addTestBots() {
    const s = Store.season;
    if (!s?.sandbox || s.testSeason) return [];
    BOT_IDS.forEach((id, i) => {
        if (!Store.allPlayers.some(p => p.id === id)) Store.allPlayers.push(botPlayer(id, i));
        if (!s.roster.includes(id)) s.roster.push(id);
        const ps = s.ps[id];
        if (!ps || ps.out) s.ps[id] = {
            money: 100000, points: 100, hp: CONFIG.START_HP, pet: null, petEffect: null, weapons: [], items: {}, loanGold: 0, loan: null,
            use: { slot: 0, casino: 0 }, extra: { slot: 0, casino: 0 }, out: false, outRound: null, rank: null, visited: [], _bot: true,
            totals: { slotNet: 0, casinoNet: 0, points: 0, spins: 0, plays: 0 }
        };
    });
    return [...BOT_IDS];
}

// after each test turn: straight into the next one (next "round": new NPC maps, shop limits reset)
export function sandboxNextTurn() {
    const s = Store.season, ps = s.ps[TEST_PID];
    Object.assign(ps, { out: false, outRound: null, rank: null });
    if (!(ps.hp > 0)) ps.hp = CONFIG.START_HP; // killed by the reaper: back to life
    ps.use = { slot: 0, casino: 0 };
    s.round++;
    // 🤖 the bots "play" their trip legs along with the round (they are on the plane with the test player)
    const dep = s.air?.departRound;
    if (dep != null) for (const id of BOT_IDS) {
        const tr = s.ps[id]?.trip;
        if (!tr || tr.done || s.ps[id].out) continue;
        if (tr.landedCrash) { tr.done = true; continue; }
        tr.idx = Math.max(0, s.round - dep - 1);
        if (tr.idx >= tr.legs.length) { tr.idx = tr.legs.length; tr.done = true; }
    }
    s.turnIdx = 0; s.results = {}; s.turn = null; s.status = "turns";
}

// test helpers shown in the season header
const toolPid = () => Store.season.turn?.pid ?? (Store.season.testSeason ? (G.currentPid() ?? Store.season.roster[0]) : TEST_PID);
export const sandboxTools = {
    gold(n = 1000000) { Store.season.ps[toolPid()].money += n; },
    points(n = 100) { Store.season.ps[toolPid()].points += n; },
    heal() { Store.season.ps[toolPid()].hp = CONFIG.START_HP; },
    time(sec = 600) { const t = Store.season.turn; if (t) t.remaining = Math.max(t.remaining, 0) + sec; },
    npcEverywhere() { const s = Store.season; s.npc = { round: s.round, maps: LOCATIONS.filter(l => !l.off).map(l => l.id) }; }
};

export function exitSandbox() {
    location.hash = Store.season?.testSeason ? "#/admin-test" : "#/admin-sim";
    location.reload();
}

// =====================================================================
// 🧪 TEST SEASON: the admin picks up to 20 real players and runs a whole
// season (mission roulette → turns → judging → elimination → final) with
// them. Every player starts from zero — no wallet gold, bank, EmoMon dex
// or arena keepers from earlier seasons — and NOTHING is saved: finishing
// or leaving reloads the page, which brings the real season back.
// =====================================================================
export const TEST_SEASON_MAX = 20;
export function startTestSeason(pids) {
    pids = [...new Set(pids.map(Number))].filter(id => Store.player(id)).slice(0, TEST_SEASON_MAX);
    if (pids.length < 2) return { ok: false, why: "2명 이상 골라주세요" };
    if (!Store.sandbox) Store.sandbox = { real: Store.season };
    Store.sandbox.testSeason = true;
    // past data out of the way (kept in memory only — the page reload on exit restores it)
    Store.wallets = {}; Store.bank = {}; Store.emodex = {}; Store.emokeep = {};
    const fresh = () => ({ money: CONFIG.START_MONEY, points: 0, hp: CONFIG.START_HP, pet: null, petEffect: null, weapons: [], items: {}, loanGold: 0, loan: null, use: { slot: 0, casino: 0 }, extra: { slot: 0, casino: 0 }, out: false, outRound: null, rank: null, visited: [], totals: { slotNet: 0, casinoNet: 0, points: 0, spins: 0, plays: 0 } });
    Store.season = {
        number: 0, sandbox: true, testSeason: true, status: "select", startedAt: new Date().toISOString(),
        roster: [...pids], ps: Object.fromEntries(pids.map(id => [id, fresh()])), round: 0, mission: null, order: [], turnIdx: 0, turn: null,
        results: {}, candidates: [], history: [], log: []
    };
    G.log(`🧪 테스트 시즌 시작 — ${pids.length}명 · 아무것도 저장되지 않습니다`);
    G.startRound();
    return { ok: true };
}
