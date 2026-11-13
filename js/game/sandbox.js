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
    Store.allPlayers = Store.allPlayers.filter(p => p.id !== TEST_PID);
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

// after each test turn: straight into the next one (next "round": new NPC maps, shop limits reset)
export function sandboxNextTurn() {
    const s = Store.season, ps = s.ps[TEST_PID];
    Object.assign(ps, { out: false, outRound: null, rank: null });
    if (!(ps.hp > 0)) ps.hp = CONFIG.START_HP; // killed by the reaper: back to life
    ps.use = { slot: 0, casino: 0 };
    s.round++;
    s.turnIdx = 0; s.results = {}; s.turn = null; s.status = "turns";
}

// test helpers shown in the season header
export const sandboxTools = {
    gold(n = 1000000) { Store.season.ps[TEST_PID].money += n; },
    points(n = 100) { Store.season.ps[TEST_PID].points += n; },
    heal() { Store.season.ps[TEST_PID].hp = CONFIG.START_HP; },
    time(sec = 600) { const t = Store.season.turn; if (t) t.remaining = Math.max(t.remaining, 0) + sec; },
    npcEverywhere() { const s = Store.season; s.npc = { round: s.round, maps: LOCATIONS.filter(l => !l.off).map(l => l.id) }; }
};

export function exitSandbox() {
    location.hash = "#/admin-sim";
    location.reload();
}
