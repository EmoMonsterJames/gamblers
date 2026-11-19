// =====================================================================
// 🔄 패자부활전 (revival round) — game rules. Screens: screens/revivalView.js,
// Survival Land map effects: screens/survivalLand.js, arcade: screens/arcade.js.
//
// When the 10th player is out, the season stops between rounds: the admin
// presses "패자부활전 진행하기", every eliminated player walks into the hidden
// region "Survival Land" (random order) and plays one special turn there with
//   · FULL HP and 200,000 G of revival gold (their own gold / HP / points are put aside)
//   · every per-season corner counter reset (Highlight, Spelling Bee, earn, …)
//   · their own items · pets · weapons · EmoMonsters along with them
// The players who complete the revival mission (and are still alive at the end
// of their turn) go in the claw machine — the claw picks the ONE who comes back.
//
// After the revival every player gets their own gold / points / HP back
// (revived player: FULL HP). Gold, points and every counter of the revival are thrown
// away. Their belongings come back MINUS what was BOUGHT during the revival
// (revival inventory) — things won for free (alphabet cards, NPC gifts, prizes)
// and captured EmoMonsters are kept. Losses (gale, NPC thefts, used items)
// come out of the revival inventory first, then out of the player's own things.
//
// s.revival = { phase: "intro" | "march" | "mission" | "turns" | "result" | "done",
//   pids, order, saved: { pid: own ps }, inv: { pid: bookkeeping }, dead: [], winners, revived,
//   main: { the round fields put aside }, prevStatus }
// =====================================================================
import { CONFIG } from "../config.js";
import { Store } from "../core/store.js";
import { shuffle, pick } from "../core/util.js";
import { REGIONS, LOCATIONS, LOC_BY_ID, ITEM_BY_ID, ALL_LETTERS, cardId, isSurvivalPass } from "../data/catalog.js";
import { TYPE_LIST } from "../emomon/data.js";
import * as G from "./season.js";

export const REVIVAL_AT = 10;            // the 10th player out starts it
export const REVIVAL_GOLD = 200000;      // revival gold (never kept)
export const REVIVAL_TEXT = "10명의 플레이어가 탈락하여 패자부활전을 진행합니다. 행운의 주인공은 누가될까요?";
export const RESET_NOTE = "🔄 패자부활전: 시즌 중에 이미 쓴 코너 입장 · 시도 횟수가 모두 리셋되었습니다 (예: 🎬 Highlight 다시 감상 가능, 🐝 Spelling Bee 다시 도전 가능). 패자부활전이 끝나면 원래대로 돌아갑니다.";
export const SHOP_NOTE = "🔄 패자부활전 골드로 산 아이템 · 무기 · 펫 · 몬스터 용품은 패자부활전 동안만 갖고 있다가 패자부활전이 끝나면 모두 사라집니다 (별도 인벤토리).";

const S = () => Store.season;
export const rv = () => S()?.revival || null;
const OPEN = ["march", "mission", "turns", "result"];
export const revivalOpen = () => OPEN.includes(rv()?.phase);
export const revivalTurns = () => rv()?.phase === "turns" && S()?.status === "turns";
// a revival player right now (their ps is the revival ps)
export const inRevival = pid => revivalOpen() && !!rv().saved?.[pid];
export const outCount = () => { const s = S(); return s ? s.roster.length - G.alive().length : 0; };

// 🔒 Survival Land is only on the map while the revival runs
// (and in the admin's 🧪 맵 시뮬레이션 — test mode, not the test season — so its maps can be tried)
export const survivalSim = () => !!S()?.sandbox && !S()?.testSeason;
export function syncSurvivalLand() {
    const open = revivalOpen() || survivalSim();
    for (const r of REGIONS) if (r.revival || r.id === "survival") r.off = !open;
    // a map the admin switched off (🌍 지역·맵 관리) stays closed
    for (const l of LOCATIONS) if (l.revival || l.region === "survival") l.off = !open || !!Store.maps?.locs?.[l.id]?.off;
}

// ---------------------------------------------------------------- trigger
// between rounds, once 10+ players are out (once per season, not in test mode)
export function revivalDue() {
    const s = S();
    if (!s || s.sandbox || s.testSeason || s.revival) return false;
    if (!["eliminated", "mission"].includes(s.status) || s.mission) return false;
    return outCount() >= REVIVAL_AT && G.alive().length > CONFIG.FINALISTS;
}
export function openRevival() {
    const s = S();
    if (!revivalDue()) return null;
    // the eliminated in rank order: 20위 … 11위 (more if several went out in one round)
    const pids = s.roster.filter(pid => s.ps[pid].out).sort((a, b) => (s.ps[b].rank || 0) - (s.ps[a].rank || 0));
    s.revival = { phase: "intro", pids, prevStatus: s.status, at: new Date().toISOString() };
    G.log(`🔄 탈락자 ${pids.length}명 — 패자부활전 대기`);
    Store.saveSeason(true);
    return s.revival;
}

// ---------------------------------------------------------------- start: everyone into Survival Land
const EMO_COUNTERS = ["finds", "findRound", "hospUses", "labBuys", "shopBuys", "shopRound"];
function freshPs(o) {
    const emo = o.emo ? structuredClone(o.emo) : null;
    if (emo) { for (const k of EMO_COUNTERS) delete emo[k]; emo.finds = 0; }
    return {
        money: REVIVAL_GOLD, points: 0, hp: CONFIG.START_HP, pet: o.pet || null, petEffect: o.petEffect || null,
        weapons: [...(o.weapons || [])], items: { ...(o.items || {}) }, loanGold: 0, loan: null,
        use: { slot: 0, casino: 0 }, extra: { slot: 0, casino: 0 }, out: true, outRound: o.outRound, rank: o.rank,
        visited: [...(o.visited || [])], totals: { slotNet: 0, casinoNet: 0, points: 0, spins: 0, plays: 0 },
        ...(emo ? { emo } : {}), ...(o.lotto ? { lotto: { ...o.lotto } } : {}), ...(o.dis ? { dis: { ...o.dis } } : {}), revival: true // 🤒 diseases carry into the revival
    };
}
export function startRevival() {
    const s = S(), R = rv();
    if (!R || R.phase !== "intro") return;
    R.order = shuffle(R.pids);
    R.saved = {}; R.inv = {}; R.dead = [];
    for (const pid of R.pids) {
        R.saved[pid] = s.ps[pid];
        s.ps[pid] = freshPs(R.saved[pid]);
        R.inv[pid] = { r: {}, last: counts(s.ps[pid]), mons: [], pet: null, fx: null, petLost: false, fxLost: false };
    }
    // the season's round is put aside while the revival runs
    R.main = { order: s.order, turnIdx: s.turnIdx, turn: s.turn, mission: s.mission, results: s.results, candidates: s.candidates, npc: s.npc, allPassed: s.allPassed, exempt: s.exempt, mdeck: s.mdeck };
    s.turn = null; s.mission = null; s.results = {}; s.candidates = []; s.npc = null;
    R.phase = "march";
    s.status = "revival";
    syncSurvivalLand();
    G.log(`🔄 패자부활전 시작! ${R.pids.length}명이 Survival Land로 이동합니다 (각자 FULL HP · ${REVIVAL_GOLD.toLocaleString()}G)`);
    Store.saveSeason(true);
}
export function marchDone() { const R = rv(); if (R?.phase === "march") { R.phase = "mission"; Store.saveSeason(true); } }

// ---------------------------------------------------------------- missions (one drawn at random)
export const REVIVAL_MISSIONS = [
    { id: "rv_slot100", type: "rv_slot100", v: 50000, spins: 100, icon: "🎰", text: "🎰 슬롯 게임으로 100번 안에 50,000골드 이상 벌기" },
    { id: "rv_casino", type: "casino_net", v: 5000, icon: "🃏", text: "🃏 카지노 게임으로 5,000골드 이상 벌기" },
    { id: "rv_win15", type: "slot_wins", v: 15, icon: "🎉", text: "🎉 아무 슬롯게임에서나 Win 15번 이상 터뜨리기" },
    { id: "rv_capture1", type: "rv_capture1", icon: "🔍", text: "🔍 이모몬스터 한 마리 캡쳐하기" },
    { id: "rv_bonus5", type: "rv_slotbonus", v: 5, icon: "🎁", text: "🎁 슬롯 게임으로 보너스 5번 이상 터뜨리기" },
    { id: "rv_npc", type: "rv_npc", icon: "🛡️", text: "🛡️ NPC 공격을 1회 받고 살아남기" }
];
// 🔄 every Survival Land map: a 5-minute turn · a pass to another Survival Land map only after 2:00 on the current one
export const SURVIVAL_SECONDS = 300, PASS_WAIT = 120;
export function setRevivalMission(base) {
    const s = S(), R = rv();
    const m = { ...base, revival: true };
    if (m.type === "rv_capture") {
        m.mtype = pick(TYPE_LIST?.length ? TYPE_LIST : ["Normal", "Fire", "Water", "Grass", "Electric", "Ice"]);
        m.text = `🔍 ${m.mtype} 속성 이모몬스터 캡쳐하기 (이미 갖고 있어도 새로 잡아야 성공)`;
    }
    if (m.type === "rv_letters") {
        m.letters = shuffle(ALL_LETTERS).slice(0, 3).sort();
        m.text = `🔤 알파벳 ${m.letters.join(" · ")} 카드/알파벳권 3개 제출하기 (이미 모두 있으면 제출만 하면 성공 · 제출한 카드는 사라집니다)`;
    }
    s.mission = m;
    s.order = [...R.order];
    s.turnIdx = 0; s.turn = null; s.results = {}; s.npc = null;
    s.status = "turns";
    R.phase = "turns";
    G.log(`🔄 패자부활전 미션: ${m.text}`);
    Store.saveSeason(true);
}

// ---------------------------------------------------------------- mission checks (season.js missionMet / missionProgress)
const capOk = (m, st) => (st.caught || []).some(types => types.some(t => String(t).toLowerCase() === String(m.mtype).toLowerCase()));
// 🛡️ NPC attacks that landed this turn (blocked ones never count)
export const npcHits = st => (st.npc || []).filter(x => x.harm).length;
export function revivalMet(m, st) {
    switch (m.type) {
        case "rv_slot100": return !!st.r100;
        case "rv_arcade": return !!st.arcadeBoss;
        case "rv_capture": return capOk(m, st);
        case "rv_capture1": return (st.caught || []).length >= 1;
        case "rv_npc": return npcHits(st) >= 1;
        case "rv_slotbonus": return (st.slotBonus || 0) >= m.v;
        case "rv_letters": return !!st.lettersOk;
    }
    return null;
}
export function revivalProgress(m, st) {
    const met = revivalMet(m, st);
    switch (m.type) {
        case "rv_capture1": return { cur: met ? 1 : 0, goal: 1, label: met ? "🔍 이모몬스터 포획 성공!" : "🔍 EmoMon Capture에서 아무 몬스터나 1마리 잡으세요" };
        case "rv_npc": return { cur: met ? 1 : 0, goal: 1, label: met ? "🛡️ NPC 공격을 받고 살아남았다! (턴이 끝날 때까지 살아 있어야 성공)" : "🛡️ NPC 공격을 1번 맞고 살아남으세요 (Block 권으로 막으면 인정 안 됨)" };
        case "rv_slot100": {
            const sp = st.spins || 0;
            if (met) return { cur: 1, goal: 1, label: `🎰 100번 안에 ${m.v.toLocaleString()}G 달성!` };
            if (sp >= m.spins) return { cur: 0, goal: 1, label: `스핀 ${sp}회 — 100번 안에 달성하지 못했습니다 (실패)` };
            return { cur: Math.max(0, st.slotNet || 0), goal: m.v, label: `슬롯 손익 ${Math.round(st.slotNet || 0).toLocaleString()} / ${m.v.toLocaleString()} G · 스핀 ${sp} / ${m.spins}` };
        }
        case "rv_arcade": return { cur: met ? 1 : 0, goal: 1, label: met ? "🏰 보스 격파! 미션 성공" : "🕹️ Arcade 맵에서 보스성 → 보스를 무찌르세요" };
        case "rv_capture": return { cur: met ? 1 : 0, goal: 1, label: met ? `🔍 ${m.mtype} 몬스터 포획 성공!` : `🔍 ${m.mtype} 속성 몬스터를 새로 잡으세요 (EmoMon Capture)` };
        case "rv_slotbonus": return { cur: Math.min(st.slotBonus || 0, m.v), goal: m.v, label: `🎁 슬롯 보너스 ${st.slotBonus || 0} / ${m.v}` };
        case "rv_letters": return { cur: met ? 1 : 0, goal: 1, label: met ? "🔤 제출 완료!" : `🔤 ${m.letters.join(" · ")} 를 모아 📮 제출하세요` };
    }
    return null;
}
// 🔤 letter mission: hand in the 3 letters (bought cards go first — they are revival goods anyway)
export const lettersHave = pid => { const m = S().mission, ps = S().ps[pid]; return (m?.letters || []).map(L => ({ L, n: ps.items[cardId(L)] || 0 })); };
export function submitLetters(pid) {
    const s = S(), t = s.turn, m = s.mission, ps = s.ps[pid];
    if (m?.type !== "rv_letters" || t?.pid !== pid || t.stats.lettersOk) return false;
    if (!m.letters.every(L => ps.items[cardId(L)] > 0)) return false;
    for (const L of m.letters) ps.items[cardId(L)]--;
    t.stats.lettersOk = true;
    G.log(`📮 ${G.name(pid)} 알파벳 ${m.letters.join(" · ")} 제출 → 패자부활 미션 성공`);
    Store.saveSeason(true);
    return true;
}
// 🔍 capture mission: every monster caught in a turn (types at the moment it was caught)
export function noteCatch(pid, types) {
    const t = S()?.turn;
    if (!t || t.pid !== pid) return;
    (t.stats.caught ||= []).push([...(types || [])]);
    Store.saveSeason();
}

// ---------------------------------------------------------------- deaths and turn order (hooks in season.js)
export function revivalKill(pid, why) {
    const s = S(), R = rv();
    if (R.dead.includes(pid)) return;
    R.dead.push(pid);
    s.ps[pid].hp = 0;
    G.log(`☠️ ${G.name(pid)} 패자부활전 중 사망 — ${why}`);
    if (s.turn?.pid === pid) {
        s.results[pid] = { stats: s.turn.stats, pass: false, dead: true, loc: s.turn.loc };
        s.turn = null;
        s.turnIdx++;
        revivalAdvance();
    }
    Store.saveSeason(true);
}
export function revivalAdvance() {
    const s = S(), R = rv();
    while (s.turnIdx < s.order.length && R.dead.includes(s.order[s.turnIdx])) s.turnIdx++;
    if (s.turnIdx >= s.order.length) revivalJudge();
}
function revivalJudge() {
    const s = S(), R = rv();
    R.winners = s.order.filter(pid => s.results[pid]?.pass && !R.dead.includes(pid));
    R.phase = "result";
    s.status = "revival";
    s.turn = null;
    G.log(`🔄 패자부활 미션 성공 ${R.winners.length}명${R.winners.length ? `: ${R.winners.map(G.name).join(", ")}` : " — 부활자 없음"}`);
    Store.saveSeason(true);
}

// ---------------------------------------------------------------- revival inventory bookkeeping
// counts of everything that can be bought: items, weapons, EmoMon bags
function counts(ps) {
    const c = {};
    for (const [k, n] of Object.entries(ps.items || {})) if (n > 0) c["i:" + k] = n;
    for (const w of ps.weapons || []) c["w:" + w] = (c["w:" + w] || 0) + 1;
    const e = ps.emo;
    if (e) for (const [pre, bag] of [["eb:", e.bag], ["ew:", e.wbag], ["et:", e.tbag]]) for (const [k, n] of Object.entries(bag || {})) if (n > 0) c[pre + k] = n;
    return c;
}
// what went missing since the last look comes out of the revival inventory first
export function reconcile(pid) {
    const R = rv(), iv = R?.inv?.[pid], ps = S()?.ps?.[pid];
    if (!iv || !ps) return;
    const cur = counts(ps);
    for (const k of Object.keys(iv.r)) {
        const d = (cur[k] || 0) - (iv.last[k] || 0);
        if (d < 0) iv.r[k] = Math.max(0, iv.r[k] + d);
        iv.r[k] = Math.min(iv.r[k], cur[k] || 0);
        if (!iv.r[k]) delete iv.r[k];
    }
    iv.last = cur;
    const uids = new Set((ps.emo?.mons || []).map(m => m.uid));
    iv.mons = iv.mons.filter(u => uids.has(u));
    if (iv.pet && ps.pet !== iv.pet) iv.pet = null;
    if (iv.fx && ps.petEffect !== iv.fx) iv.fx = null;
}
Store.beforeSave.push(() => { if (revivalOpen()) for (const pid of rv().pids || []) if (rv().inv?.[pid]) reconcile(pid); });

// 🏆 the Arcade boss reward: a 🎫 미션완료권 that passes the revival mission (revival goods — gone when the revival ends)
export function grantBossPass(pid) {
    const R = rv(), ps = S().ps[pid], iv = R?.inv?.[pid];
    if (iv) reconcile(pid);
    ps.items.mission_pass = (ps.items.mission_pass || 0) + 1;
    if (iv && inRevival(pid)) { iv.r["i:mission_pass"] = (iv.r["i:mission_pass"] || 0) + 1; iv.last = counts(ps); }
    G.log(`🎫 ${G.name(pid)} 아케이드 보스 클리어 보상 — 미션완료권 획득!`);
    Store.saveSeason(true);
}
// a purchase with revival gold: whatever `give` adds is revival inventory
export function purchase(pid, give) {
    if (!inRevival(pid)) return give();
    const ps = S().ps[pid], iv = rv().inv[pid];
    reconcile(pid);
    const before = counts(ps), monsBefore = new Set((ps.emo?.mons || []).map(m => m.uid)), pet = ps.pet, fx = ps.petEffect;
    const out = give();
    const after = counts(ps);
    for (const [k, n] of Object.entries(after)) { const inc = n - (before[k] || 0); if (inc > 0) iv.r[k] = (iv.r[k] || 0) + inc; }
    iv.last = after;
    for (const m of S().ps[pid].emo?.mons || []) if (!monsBefore.has(m.uid)) iv.mons.push(m.uid);
    if (ps.pet !== pet && ps.pet) iv.pet = ps.pet;
    if (ps.petEffect !== fx && ps.petEffect) iv.fx = ps.petEffect;
    return out;
}
// the split shown in the inventory: { rev: { itemId: n }, own: { itemId: n } }
export function invSplit(pid) {
    const ps = S().ps[pid], iv = rv()?.inv?.[pid];
    if (iv) reconcile(pid);
    const rev = {}, own = {};
    for (const [k, n] of Object.entries(ps.items || {})) {
        if (!(n > 0)) continue;
        const r = Math.min(n, iv?.r["i:" + k] || 0);
        if (r) rev[k] = r;
        if (n - r) own[k] = n - r;
    }
    const revW = {};
    for (const [k, n] of Object.entries(iv?.r || {})) if (k.startsWith("w:")) revW[k.slice(2)] = n;
    return { rev, own, revWeapons: revW, revPet: iv?.pet || null, revFx: iv?.fx || null, revMons: [...(iv?.mons || [])] };
}

// ---- losses: revival goods first, then the player's own things
// one random item → { id, rev } | null
export function takeItem(pid, { filter = null } = {}) {
    const ps = S().ps[pid], iv = rv()?.inv?.[pid];
    const own = Object.entries(ps.items || {}).filter(([k, n]) => n > 0 && (!filter || filter(k))).map(([k]) => k);
    if (!own.length) return null;
    if (!iv) { const id = pick(own); ps.items[id]--; return { id, rev: false }; }
    reconcile(pid);
    const revIds = own.filter(k => (iv.r["i:" + k] || 0) > 0);
    const id = pick(revIds.length ? revIds : own), key = "i:" + id;
    ps.items[id]--;
    if (revIds.length) iv.r[key]--;
    iv.last[key] = Math.max(0, (iv.last[key] || 0) - 1);
    if (iv.r[key] <= 0) delete iv.r[key];
    return { id, rev: !!revIds.length };
}
// every item: the whole revival inventory if there is one, else all the player's own items → count taken
export function takeAllItems(pid) {
    const ps = S().ps[pid], iv = rv()?.inv?.[pid];
    if (!iv) return null;
    reconcile(pid);
    const revKeys = Object.keys(iv.r).filter(k => k.startsWith("i:") && iv.r[k] > 0);
    let n = 0;
    if (revKeys.length) {
        for (const k of revKeys) { const id = k.slice(2), x = Math.min(iv.r[k], ps.items[id] || 0); ps.items[id] -= x; n += x; delete iv.r[k]; iv.last[k] = Math.max(0, (iv.last[k] || 0) - x); }
        return { n, rev: true };
    }
    for (const [id, x] of Object.entries(ps.items || {})) if (x > 0) { n += x; ps.items[id] = 0; iv.last["i:" + id] = 0; }
    ps.npcBlock = 0;
    return { n, rev: false };
}
// a weapon index to break (revival weapons first) → index | -1
export function weaponToBreak(pid) {
    const ps = S().ps[pid], iv = rv()?.inv?.[pid];
    if (!ps.weapons.length) return -1;
    if (!iv) return Math.floor(Math.random() * ps.weapons.length);
    reconcile(pid);
    const rev = ps.weapons.map((w, i) => [w, i]).filter(([w]) => (iv.r["w:" + w] || 0) > 0);
    if (rev.length) { const [w, i] = pick(rev); iv.r["w:" + w]--; iv.last["w:" + w]--; if (iv.r["w:" + w] <= 0) delete iv.r["w:" + w]; return i; }
    const i = Math.floor(Math.random() * ps.weapons.length);
    iv.last["w:" + ps.weapons[i]] = Math.max(0, (iv.last["w:" + ps.weapons[i]] || 0) - 1);
    return i;
}
// a pet / pet effect taken: a revival-bought one just disappears, the player's own one is lost for good
export function losePet(pid, fx) {
    const ps = S().ps[pid], iv = rv()?.inv?.[pid];
    if (!iv) return;
    if (fx) { if (iv.fx && ps.petEffect === iv.fx) iv.fx = null; else iv.fxLost = true; }
    else { if (iv.pet && ps.pet === iv.pet) iv.pet = null; else iv.petLost = true; }
}
// a monster to steal: revival-bought ones first → mon | null
export function monToSteal(pid) {
    const list = S().ps[pid].emo?.mons || [], iv = rv()?.inv?.[pid];
    if (!list.length) return null;
    const rev = iv ? list.filter(m => iv.mons.includes(m.uid)) : [];
    return pick(rev.length ? rev : list);
}
// 🧑‍⚖️ Priest's donation comes out of the player's OWN gold (put aside during the revival)
export const ownGold = pid => Math.max(0, Math.round(rv()?.saved?.[pid]?.money ?? S().ps[pid]?.money ?? 0));
// 🕹️ arcade boss money goes to the player's OWN gold (it stays after the revival)
export function addOwnGold(pid, g) {
    const o = rv()?.saved?.[pid];
    if (o && revivalOpen()) o.money = (o.money || 0) + g; else if (S()?.ps?.[pid]) S().ps[pid].money += g;
    const t = S()?.turn;
    if (t?.pid === pid) t.stats.arcadeCash = (t.stats.arcadeCash || 0) + g;
    Store.saveSeason();
}
export function payOwnGold(pid, g) {
    const o = rv()?.saved?.[pid];
    const take = Math.max(0, Math.min(Math.round(g), ownGold(pid)));
    if (o) o.money -= take; else S().ps[pid].money -= take;
    Store.saveSeason(true);
    return take;
}

// ---------------------------------------------------------------- finish: back to the season
// the player's own state + what they keep from the revival
function mergeBack(pid) {
    const s = S(), R = rv(), cur = s.ps[pid], own = R.saved[pid], iv = R.inv[pid];
    reconcile(pid);
    const real = counts(cur);
    for (const [k, n] of Object.entries(iv.r)) real[k] = Math.max(0, (real[k] || 0) - n);
    own.items = {};
    for (const [k, n] of Object.entries(real)) if (k.startsWith("i:") && n > 0) own.items[k.slice(2)] = n;
    const need = { ...real };
    own.weapons = (cur.weapons || []).filter(w => (need["w:" + w] = (need["w:" + w] || 0) - 1) >= 0);
    if (cur.emo) {
        const e = own.emo ? own.emo : {};
        e.mons = (cur.emo.mons || []).filter(m => !iv.mons.includes(m.uid));
        for (const [pre, key] of [["eb:", "bag"], ["ew:", "wbag"], ["et:", "tbag"]]) {
            e[key] = {};
            for (const [k, n] of Object.entries(real)) if (k.startsWith(pre) && n > 0) e[key][k.slice(pre.length)] = n;
        }
        if (!e.mons.some(m => m.uid === e.battle)) e.battle = e.mons.some(m => m.uid === cur.emo.battle) ? cur.emo.battle : e.mons[0]?.uid || null;
        e.finds ||= 0;
        own.emo = e;
    }
    if (iv.petLost) own.pet = null;
    if (iv.fxLost) own.petEffect = null;
    // 🤒 diseases carry on after the revival (they came in with the player and stay unless cured there)
    if (cur.dis && Object.values(cur.dis).some(Boolean)) own.dis = { ...cur.dis }; else delete own.dis;
    return own;
}
// ---------------------------------------------------------------- 🏅 revival ranks (shown in 📜 시즌 요약; the season ranks stay as they are)
//   1위 the revived player · 2위 the other ball left with them in the final claw
//   then the other mission winners · then the survivors who failed the mission (the claw takes their balls out first)
//   · last the players who died while playing: the first to die (in the drawn play order) is last
export function setRevivalRanks(winner = null, second = null) {
    const R = rv();
    if (!R || R.ranks) return R?.ranks || null;
    const order = R.order || R.pids || [], dead = (R.dead || []).filter(p => order.includes(p)), W = (R.winners || []).filter(p => !dead.includes(p));
    const top = [winner, second].filter((p, i, a) => p != null && order.includes(p) && a.indexOf(p) === i);
    const list = [...top, ...shuffle(W.filter(p => !top.includes(p))), ...shuffle(order.filter(p => !dead.includes(p) && !W.includes(p) && !top.includes(p))), ...[...dead].reverse()];
    R.ranks = Object.fromEntries(list.map((p, i) => [p, i + 1]));
    R.second = second ?? null;
    Store.saveSeason(true);
    return R.ranks;
}
export function finishRevival(winner = null) {
    const s = S(), R = rv();
    if (!R || R.phase !== "result") return;
    const ranks = setRevivalRanks(winner, R.second ?? null) || {};
    s.history.push({ round: s.round, revivalRank: true, revived: winner ?? null, ranks: { ...ranks }, total: Object.keys(ranks).length, mission: s.mission ? { text: s.mission.text, type: s.mission.type } : null });
    for (const pid of R.pids) s.ps[pid] = mergeBack(pid);
    if (winner != null && s.ps[winner]) {
        const ps = s.ps[winner], old = ps.rank;
        // the players who went out after the revived one move one place down (… 12위), so the next one out is 11위 again
        for (const pid of s.roster) {
            const q = s.ps[pid];
            if (pid !== winner && q.out && q.rank != null && old != null && q.rank < old) q.rank += 1;
        }
        for (const hx of s.history || []) if (hx.eliminated !== winner && hx.rank != null && old != null && hx.rank < old && !hx.final) hx.rank += 1;
        Object.assign(ps, { out: false, rank: null, outRound: null, hp: CONFIG.START_HP });
        s.history.push({ round: s.round, revival: true, revived: winner, from: old });
        G.log(`🎉 ${G.name(winner)} 패자부활 성공! (탈락 ${old}위 → 생존 · FULL HP)`);
    } else G.log("🔄 패자부활전 종료 — 부활자 없음");
    R.revived = winner ?? null;
    // the season's round comes back exactly as it was
    const m = R.main || {};
    Object.assign(s, { order: m.order || [], turnIdx: m.turnIdx || 0, turn: m.turn || null, mission: m.mission || null, results: m.results || {}, candidates: m.candidates || [], npc: m.npc || null, allPassed: m.allPassed, exempt: m.exempt, mdeck: m.mdeck });
    s.status = R.prevStatus || "eliminated";
    R.phase = "done";
    R.endedAt = new Date().toISOString();
    syncSurvivalLand();
    Store.saveSeason(true);
}

// ---------------------------------------------------------------- map passes
// during the revival only Survival Land passes work · on any Survival Land map: only after 2:00 of play there
// seconds still to wait before a pass works on the current Survival Land map (0 = free to go)
export function survivalPassWait() {
    const t = S()?.turn;
    if (!t?.loc || LOC_BY_ID[t.loc]?.region !== "survival") return 0;
    const since = (t.mapAt ?? t.remaining) - t.remaining;
    return Math.max(0, PASS_WAIT - since);
}
export const survivalWaitText = () => { const w = survivalPassWait(); return `⏱️ Survival Land에서는 이 맵에서 2분이 지나야 다른 맵권을 쓸 수 있습니다 (${Math.floor(w / 60)}:${String(w % 60).padStart(2, "0")} 남음)`; };
export function revivalPassBlock(itemId) {
    const t = S()?.turn;
    if (!revivalTurns() || !inRevival(t?.pid)) return isSurvivalPass(itemId) ? "🔄 Survival Land 맵권은 패자부활전에서만 쓸 수 있습니다" : null;
    if (!isSurvivalPass(itemId)) return "🔄 패자부활전 중에는 Survival Land 맵권만 쓸 수 있습니다";
    if (survivalPassWait() > 0) return survivalWaitText();
    return null;
}
export const survivalPassOf = itemId => isSurvivalPass(itemId) ? ITEM_BY_ID[itemId] : null;
