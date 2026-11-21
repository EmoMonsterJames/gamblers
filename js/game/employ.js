// =====================================================================
// 🏢 Employment corner + 🏦 bank account products — rules.
// Everything here outlives a season (Store.bank, saved with the bank):
//   bank.employ = {
//     tick,                                   // rounds played so far (every season) — the employment clock
//     staff:   { <pid>: { co, at, season, pay, promos, manager, code } },
//     cohorts: { <co>: [{ season, list: [{ pid, at, state, stage, res: [] , test? }], started, stage, stageTick, hired: [] }] },
//     apps:    { <pid>: { <season>: [co] } },  // max 2 companies per season
//     notes:   { <pid>: [{ id, co, text, kind, at, seen }] },   // results told at that player's next turn
//     offers:  { <pid>: [{ co, season }] },     // final passes waiting for the player's choice (+ account link)
//     log:     [{ t, text }],
//     hr:      { <co>: [{ t, pid, kind, text, season, round }] },   // 🧾 HR record per company (apply / pass / hire / promo / quit / fire …)
//     frozenAt                                // season in which 3 or fewer were left (no applications · reviews wait)
//   }
//   bank.lifelog = { visits: { <pid>: [locIds] }, jobs: { <pid>: { <career>: n } }, brand: { <pid>: { <BRAND>: best single win } }, jp: { <pid>: best jackpot rank } }
//   bank.loanErased = { <pid>: iso }
//   account.perks = { biz_benefit: { at, rounds }, emp_benefit: { at, rounds } }
// =====================================================================
import { Store } from "../core/store.js";
import { LOC_BY_ID, JACKPOT_RANK, brandKey, attackCount, ITEM_BY_ID } from "../data/catalog.js";

import * as L from "../data/life.js";
import { S, log, name, roundHooks, seasonEndHooks, locationHooks, jobHooks, playHooks, eventHooks, alive } from "./season.js";
import { friendsOf, helps, intimacy, RELS } from "./social.js";
import { emoItem, TYPE_LIST } from "../emomon/data.js";
import { toast } from "../core/fx.js";
import { B, account, accountByCode, activeBiz } from "./bank.js";
import { ownsTypes } from "./extra.js";
import { monsOf as emoMons, typesOf as emoTypes, giveItem as emoGive } from "../emomon/game.js";

const now = () => new Date().toISOString();
const save = () => Store.saveBank();
const rnd = () => Math.random();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const EM = () => { const b = B(); const e = (b.employ ||= {}); e.tick ||= 0; e.staff ||= {}; e.cohorts ||= {}; e.apps ||= {}; e.notes ||= {}; e.offers ||= {}; e.log ||= []; return e; };
export const LOG = () => { const b = B(); const l = (b.lifelog ||= {}); l.visits ||= {}; l.jobs ||= {}; l.brand ||= {}; l.jp ||= {}; return l; };
const real = () => { const s = S(); return !!s && !s.sandbox && !s.testSeason; };
const elog = text => { const e = EM(); e.log = [{ t: now(), text }, ...e.log].slice(0, 300); };

// ================================================================ 📒 play history (persistent)
locationHooks.push((pid, locId) => {
    if (!real()) return;
    const v = (LOG().visits[pid] ||= []);
    if (!v.includes(locId)) { v.push(locId); save(); }
});
jobHooks.push((pid, career) => {
    if (!real()) return;
    const j = (LOG().jobs[pid] ||= {});
    j[career] = (j[career] || 0) + 1; save();
});
playHooks.push((pid, kind, bet, win, extra) => {
    const t = S()?.turn;
    // 🧪 Arizal Tech Test: only bets of 100~300G count, within its minute
    const at = t?.arizal;
    if (at && !at.done && t.pid === pid && Date.now() <= at.until && bet >= L.ARIZAL_TEST.min && bet <= L.ARIZAL_TEST.max) { at.won = (at.won || 0) + Math.max(0, win || 0); at.plays = (at.plays || 0) + 1; }
    if (!real()) return;
    const lg = LOG();
    let dirty = false;
    if (kind === "slot" && extra?.brand && win > 0) {
        const k = brandKey(extra.brand), m = (lg.brand[pid] ||= {});
        if (win > (m[k] || 0)) { m[k] = win; dirty = true; }
    }
    for (const jp of extra?.jackpots || []) { const r = JACKPOT_RANK[jp] || 0; if (r > (lg.jp[pid] || 0)) { lg.jp[pid] = r; dirty = true; } }
    if (dirty) save();
});

// ---- player facts the companies look at
const ps_ = pid => S()?.ps?.[pid] || null;
export const visitedIn = (pid, regions) => {
    const ids = new Set([...(LOG().visits[pid] || []), ...(ps_(pid)?.visited || [])]);
    return [...ids].filter(id => regions.includes(LOC_BY_ID[id]?.region)).length;
};
export const visitedAny = (pid, locIds) => { const ids = new Set([...(LOG().visits[pid] || []), ...(ps_(pid)?.visited || [])]); return locIds.some(id => ids.has(id)); };
export const bestRank = pid => Math.min(99, ...Store.results.filter(r => r.playerId === +pid && r.rank != null).map(r => r.rank));
export const jobCount = (pid, career) => LOG().jobs[pid]?.[career] || 0;
export const brandBest = (pid, brand) => LOG().brand[pid]?.[brandKey(brand)] || 0;
export const jpBest = pid => Math.max(LOG().jp[pid] || 0, ...Store.jpLog.filter(r => r.playerId === +pid).map(r => JACKPOT_RANK[r.tier] || 0));
export const monCount = pid => (S() ? emoMons(pid).length : 0) || (Store.stash?.[pid]?.emo?.mons?.length || 0);
export const hasTypes = (pid, list) => ownsTypes(pid, list);
const twoTypeMon = pid => !!S() && emoMons(pid).some(m => (emoTypes(m) || []).length >= 2);
const gradeBonus = (g, aPlus, bc, df) => g === "A+" || g === "A" ? aPlus : g === "B" || g === "C" ? bc : df;
export const gradeOf = pid => L.schoolGrade(Store.player(pid)?.school);

// ================================================================ 🏢 companies
export const employer = pid => EM().staff[pid] || null;
export const companyOf = pid => L.COMPANIES[employer(pid)?.co] || null;
export const staffOf = co => Object.entries(EM().staff).filter(([, x]) => x.co === co).map(([pid, x]) => ({ pid: +pid, ...x }));
const cohortsOf = co => (EM().cohorts[co] ||= []);
export function cohort(co, season = S()?.number, make = false) {
    const list = cohortsOf(co);
    let c = list.find(x => x.season === season);
    if (!c && make) { c = { season, list: [], started: false, stage: 0, stageTick: null, hired: [] }; list.push(c); }
    return c || null;
}
export const appsOf = (pid, season = S()?.number) => EM().apps[pid]?.[season] || [];
// players still in a company's hiring process (any season) — shown on the company card
export const inProcess = co => cohortsOf(co).flatMap(c => c.list.filter(a => ["wait", "stage", "offer"].includes(a.state)).map(a => ({ ...a, season: c.season, started: c.started, cstage: c.stage })));

// ================================================================ 🧾 HR record per company (who applied / passed / joined / was promoted / quit / was fired, and when)
// bank.employ.hr = { <co>: [{ t, pid, kind, text, season, round }] } — newest first, 200 per company
const HR_MAX = 200;
export function hrOf(co) {
    const e = EM(), hr = (e.hr ||= {});
    if (!hr[co]) hr[co] = staffOf(co).map(x => ({ t: x.at, pid: x.pid, kind: "hire", text: "입사", season: x.season ?? null, round: null })).sort((a, b) => (a.t < b.t ? 1 : -1)); // older staff: their hire date
    return hr[co];
}
function hr(co, pid, kind, text) {
    const s = S();
    hrOf(co).unshift({ t: now(), pid: +pid, kind, text, season: s?.number ?? null, round: s?.round ?? null });
    EM().hr[co] = EM().hr[co].slice(0, HR_MAX);
}
// 🧊 3 players or fewer left: no new applications · reviews already running wait for the next season
export const EMPLOY_FREEZE_AT = 3;
export const employFrozen = () => { const s = S(); return !!s && !(s.sandbox && !s.testSeason) && alive().length <= EMPLOY_FREEZE_AT; };
// a player who is not playing right now (eliminated / not in this season)
const away = pid => { const p = ps_(pid); return !p || !!p.out; };

// requirements → { ok, why }
export function companyReq(pid, co) {
    const C = L.COMPANIES[co];
    if (co === "hyhg") {
        if (monCount(pid) < 1) return { ok: false, why: "이모몬스터 1마리 이상 필요" };
        const v = visitedIn(pid, ["npcland", "difficult"]);
        if (v < 3) return { ok: false, why: `NPC 랜드 / Difficult Land 맵 3곳 이상 체험 필요 (지금 ${v}곳)` };
    }
    if (co === "gm") { const v = visitedIn(pid, ["cl1", "cl2"]); if (v < 5) return { ok: false, why: `카지노 랜드 1 · 2 맵 5곳 이상 체험 필요 (지금 ${v}곳)` }; }
    if (co === "arizal") { const v = visitedIn(pid, ["randomland"]); if (v < 3) return { ok: false, why: `랜덤랜드 맵 3곳 이상 체험 필요 (지금 ${v}곳)` }; }
    return { ok: true, C };
}
export function applyStatus(pid, co) {
    const s = S(), C = L.COMPANIES[co];
    if (!s || !C) return { ok: false, why: "시즌 중에만 지원할 수 있습니다" };
    if (s.sandbox && !s.testSeason) return { ok: false, why: "🧪 테스트 모드에서는 지원할 수 없습니다" };
    if (employFrozen()) return { ok: false, why: `최종 ${EMPLOY_FREEZE_AT}명 이하 — 이번 시즌 취업 지원 마감 (진행 중인 심사는 다음 시즌에 이어집니다)` };
    if (employer(pid)) return { ok: false, why: "이미 취업한 회사가 있습니다 (취업은 한 곳만)" };
    if (!account(pid)) return { ok: false, why: "🏦 은행 계좌가 있어야 지원할 수 있습니다" };
    const mine = appsOf(pid);
    if (mine.includes(co)) return { ok: false, why: "이번 시즌에 이미 지원했습니다" };
    if (mine.length >= L.APPLY_PER_SEASON) return { ok: false, why: `시즌당 최대 ${L.APPLY_PER_SEASON}곳까지 지원할 수 있습니다` };
    if ((EM().offers[pid] || []).length) return { ok: false, why: "합격 통보를 받은 회사가 있습니다 — 먼저 입사를 결정하세요" };
    const c = cohort(co);
    if (c && (c.started || c.list.length >= L.APPLY_MAX)) return { ok: false, why: `이번 시즌 지원 마감 (최대 ${L.APPLY_MAX}명)` };
    const req = companyReq(pid, co);
    if (!req.ok) return req;
    if (C.fee && (ps_(pid)?.money || 0) < C.fee) return { ok: false, why: `지원료 ${C.fee.toLocaleString()}G가 부족합니다` };
    return { ok: true };
}
export function applyTo(pid, co) {
    const st = applyStatus(pid, co);
    if (!st.ok) return st;
    const s = S(), C = L.COMPANIES[co], ps = ps_(pid);
    if (C.fee) ps.money -= C.fee;
    const c = cohort(co, s.number, true);
    c.list.push({ pid: +pid, at: now(), round: s.round, state: "wait", stage: 0, res: [] });
    ((EM().apps[pid] ||= {})[s.number] ||= []).push(co);
    log(`🏢 ${name(pid)} ${C.name} 지원${C.fee ? ` (지원료 ${C.fee.toLocaleString()}G)` : ""} — 지원자 ${c.list.length}/${L.APPLY_MAX}`);
    elog(`${name(pid)} → ${C.name} 지원 (S${s.number} R${s.round})`);
    hr(co, pid, "apply", `지원${C.fee ? ` (지원료 ${C.fee.toLocaleString()}G)` : ""}`);
    if (c.list.length >= L.APPLY_MAX) startReview(co, c);
    save(); Store.saveSeason(true);
    return { ok: true, full: c.started, n: c.list.length };
}
// the 5th applicant (or the admin / the season end) starts the review: 1st results come at the next round
export function startReview(co, c = cohort(co)) {
    if (!c || c.started || !c.list.length) return false;
    c.started = true; c.stage = 0; c.stageTick = EM().tick;
    for (const a of c.list) if (a.state === "wait") a.state = "stage";
    const C = L.COMPANIES[co];
    if (S()) log(`🏢 ${C.name} 지원자 ${c.list.length}명 마감 — 다음 라운드에 ${L.STAGE_LABEL(C, 0)} 결과 발표`);
    elog(`${C.name} S${c.season} 심사 시작 (${c.list.length}명)`);
    for (const a of c.list) note(a.pid, co, `📨 ${C.name} 지원이 마감되어 ${L.STAGE_LABEL(C, 0)}가 시작되었습니다. 다음 라운드 내 턴에 결과가 통보됩니다.`, "info");
    save();
    return true;
}
function note(pid, co, text, kind = "info", extra = {}) {
    (EM().notes[pid] ||= []).push({ id: uid(), co, text, kind, at: now(), seen: false, ...extra });
}
export const notesOf = pid => (EM().notes[pid] || []);
export const unseenNotes = pid => notesOf(pid).filter(n => !n.seen);
export function markSeen(pid) { for (const n of notesOf(pid)) n.seen = true; EM().notes[pid] = notesOf(pid).slice(-40); save(); }

// ---- one stage's pass chance (percent) and why
export function stageChance(pid, co, i) {
    const g = gradeOf(pid), rank = bestRank(pid), jp = jpBest(pid), why = [];
    const add = (v, text, cond = true) => { if (cond && v) { why.push(`${text} +${v}%`); return v; } return 0; };
    let p = 0;
    const d = Store.getDecor?.(pid) || {}, ps = ps_(pid) || {};
    if (co === "hyhg") {
        if (i === 1) { p = 30; p += add(10, "magic·fairy·evil·ghost·mind·angel·robot·light 이모몬스터", hasTypes(pid, ["Magic", "Fairy", "Evil", "Ghost", "Mind", "Angel", "Robot", "Light"])); const n = monCount(pid); p += add(n >= 3 ? 10 : n === 2 ? 5 : 0, `이모몬스터 ${n}마리`); p += add(10, "TOP 6 기록", rank <= 6); p += add(10, "HYHG Gaming 슬롯 30,000G+ WIN", brandBest(pid, "HYHG GAMING") >= 30000); }
        if (i === 2) { p = 40; p += add(10, "TOP 3 기록", rank <= 3); p += add(20, "HYHG Gaming 슬롯 100,000G+ WIN", brandBest(pid, "HYHG GAMING") >= 100000); }
    }
    if (co === "gm") {
        if (i === 0) { p = 50; p += add(gradeBonus(g, 15, 10, 5), `학교 ${g}등급`); p += add(10, "Robot / Steel 이모몬스터", hasTypes(pid, ["Robot", "Steel"])); p += add(5, "TOP 10 기록", rank <= 10); }
        if (i === 1) { p = 40; p += add(10, "속성 2가지 이모몬스터", twoTypeMon(pid)); p += add(10, "이모몬스터 2마리 이상", monCount(pid) >= 2); p += add(10, "TOP 6 기록", rank <= 6); p += add(10, "MINOR 이상 잭팟 기록", jp >= JACKPOT_RANK.MINOR); }
        if (i === 2) { p = 30; p += add(10, "TOP 6 기록", rank <= 6); p += add(10, "MAXI 이상 잭팟 기록", jp >= JACKPOT_RANK.MAXI); p += add(10, "공격 무기 2개 이상", attackCount(ps.weapons || []) >= 2); }
    }
    if (co === "arizal") {
        if (i === 0) { p = 50; p += add(gradeBonus(g, 20, 10, 5), `학교 ${g}등급`); p += add(5, "Dung Town 출신", Store.player(pid)?.country === "Dung Town"); p += add(20, "Mind / Light / Evil 이모몬스터", hasTypes(pid, ["Mind", "Light", "Evil"])); }
        if (i === 2) { p = 40; p += add(10, "TOP 10 기록", rank <= 10); p += add(10, "MINOR 이상 잭팟 기록", jp >= JACKPOT_RANK.MINOR); p += add(5, "프레임 착용", !!d.frame); p += add(5, "프레임 효과 착용", !!d.effect); }
    }
    if (co === "poly") {
        if (i === 0) { p = 50; p += add(gradeBonus(g, 20, 10, 5), `학교 ${g}등급`); p += add(10, "Polynesia Casino 1 / 2 체험", visitedAny(pid, ["poly", "poly2"])); p += add(5, "Polynesia 출신", Store.player(pid)?.country === "Polynesia"); p += add(10, "Bug / Grass / Earth 이모몬스터", hasTypes(pid, ["Bug", "Grass", "Earth"])); }
        if (i === 1) { p = 40; p += add(10, "TOP 10 기록", rank <= 10); p += add(10, "MINI 이상 잭팟 기록", jp >= JACKPOT_RANK.MINI); p += add(10, "펫 착용", !!ps.pet); p += add(10, "펫 효과 착용", !!ps.petEffect); }
    }
    if (co === "robot") {
        if (i === 0) { p = 60; p += add(gradeBonus(g, 45, 30, 25), `학교 ${g}등급`); p += add(20, "Robot 이모몬스터", hasTypes(pid, ["Robot"])); }
        if (i === 1) { p = 50; p += add(10, "프레임 착용", !!d.frame); }
    }
    if (co === "sparkle") {
        if (i === 0) { p = 60; const n = jobCount(pid, "cleaner"); p += add(3 * n, `카지노 청소부 ${n}회`); }
        if (i === 1) { p = 50; p += add(10, "MINOR 이상 잭팟 기록", jp >= JACKPOT_RANK.MINOR); }
    }
    if (co === "dungdung") {
        if (i === 0) { p = 60; const a = jobCount(pid, "dungsweep"), b = jobCount(pid, "statue"); p += add(3 * a, `똥쓸이 ${a}회`); p += add(2 * b, `동상알바 ${b}회`); }
        if (i === 1) { p = 50; p += add(10, "MINI 이상 잭팟 기록", jp >= JACKPOT_RANK.MINI); }
    }
    return { p: Math.max(0, Math.min(100, p)), why };
}
// 🏙️ HYHG 1st: document score (≥ 100 passes)
export function hyhgScore(pid) {
    const g = gradeOf(pid), rank = bestRank(pid), sec = jobCount(pid, "secretary");
    const school = { "A+": 80, A: 70, B: 50, C: 30, D: 20, F: 10 }[g] || 10;
    const rec = rank <= 3 ? 30 : rank <= 6 ? 20 : rank <= 10 ? 10 : 0;
    const total = school + sec * 10 + rec;
    return { total, why: [`학교 ${g}등급 ${school}점`, `형용형근 비서 ${sec}회 ${sec * 10}점`, `최고 기록 ${rank < 99 ? rank + "위" : "없음"} ${rec}점`] };
}

// ---- a stage for the whole cohort (round start)
function runStage(co, c) {
    const C = L.COMPANIES[co], i = c.stage, kind = C.stages[i], last = i === C.stages.length - 1;
    const active = c.list.filter(a => a.state === "stage");
    if (!active.length) { c.done = true; return; }
    const res = active.map(a => {
        let ok = false, detail = "";
        if (kind === "score") { const sc = hyhgScore(a.pid); ok = sc.total >= 100; detail = `서류 점수 ${sc.total}점 (100점 이상 통과) · ${sc.why.join(" · ")}`; }
        else if (kind === "test") { ok = !!a.test?.ok; detail = a.test?.done ? `테스트 결과 ${(a.test.won || 0).toLocaleString()}G WIN (목표 ${L.ARIZAL_TEST.goal.toLocaleString()}G)` : "테스트를 치르지 않았습니다"; }
        else { const ch = stageChance(a.pid, co, i); ok = rnd() * 100 < ch.p; detail = `통과 확률 ${ch.p}%${ch.why.length ? ` (${ch.why.join(" · ")})` : ""}`; }
        return { a, ok, detail };
    });
    // at least one gets through
    const guard = C.guarantee === "all" ? kind !== "test" : C.guarantee === "final2" ? last && res.length >= 2 : false;
    if (guard && !res.some(r => r.ok)) { const lucky = res[Math.floor(rnd() * res.length)]; lucky.ok = true; lucky.detail += " · ✨ 최소 1명 선발 규정으로 통과"; }
    // the last stage: no more than the season's openings
    let finals = last ? res.filter(r => r.ok) : [];
    if (last && finals.length > C.perSeason) {
        const keep = new Set([...finals].sort(() => rnd() - 0.5).slice(0, C.perSeason));
        for (const r of finals) if (!keep.has(r)) { r.ok = false; r.detail += " · 모집 인원 초과로 최종 탈락"; }
        finals = finals.filter(r => keep.has(r));
    }
    const label = L.STAGE_LABEL(C, i);
    for (const r of res) {
        r.a.res.push({ stage: i, ok: r.ok, detail: r.detail, tick: EM().tick });
        hr(co, r.a.pid, r.ok ? "pass" : "fail", `${label} ${r.ok ? (last ? "최종 합격" : "합격") : "불합격"}`);
        if (!r.ok) { r.a.state = "fail"; note(r.a.pid, co, `❌ ${C.name} ${label} 결과: 불합격 — ${r.detail}`, "fail"); continue; }
        if (last && away(r.a.pid) && !employer(r.a.pid)) {
            // 💤 passed while eliminated / not playing: hired right away — the welcome gift waits for the next season they are picked for
            r.a.state = "offer";
            (EM().offers[r.a.pid] ||= []).push({ co, season: c.season });
            hire(r.a.pid, co, null, { auto: true });
            continue;
        }
        if (last) {
            r.a.state = "offer";
            (EM().offers[r.a.pid] ||= []).push({ co, season: c.season });
            note(r.a.pid, co, `🎉 ${C.name} ${label} 결과: 최종 합격! 입사하려면 계좌 코드 4자리를 연동하세요 — ${r.detail}`, "offer");
        } else {
            r.a.stage = i + 1;
            const next = C.stages[i + 1];
            note(r.a.pid, co, `✅ ${C.name} ${label} 결과: 합격 — ${r.detail}. ${next === "test" ? "🧪 이번 라운드 내 턴에 Arizal Tech Test를 꼭 치르세요! (1분 · 100~300G 베팅으로 10,000G 이상 WIN)" : `자동으로 ${L.STAGE_LABEL(C, i + 1)}가 진행되고 다음 라운드에 결과가 통보됩니다.`}`, next === "test" ? "test" : "pass", next === "test" ? { test: true } : {});
            if (next === "test") r.a.test = { due: EM().tick, done: false, ok: false };
        }
    }
    elog(`${C.name} S${c.season} ${label}: ${res.filter(r => r.ok).map(r => name(r.a.pid)).join(", ") || "통과자 없음"}`);
    if (S()) log(`🏢 ${C.name} ${label} 결과 발표 — 통과 ${res.filter(r => r.ok).length}명 / ${res.length}명`);
    c.stage = i + 1; c.stageTick = EM().tick;
    if (last || !res.some(r => r.ok)) c.done = true;
}
function employTick(s) {
    if (s.sandbox && !s.testSeason) return;
    const e = EM();
    const frozen = employFrozen();
    // 🧊 3 or fewer left: the review clock stops — running reviews go on in the next season's rounds
    if (!frozen) e.tick++;
    else if (e.frozenAt !== s.number) {
        e.frozenAt = s.number;
        const n = Object.values(e.cohorts).flat().filter(c => c.started && !c.done).length;
        log(`🧊 최종 ${EMPLOY_FREEZE_AT}명 이하 — 취업 지원 마감${n ? ` · 진행 중인 심사 ${n}건은 다음 시즌에 이어집니다` : ""}`);
        elog(`S${s.number} 최종 ${EMPLOY_FREEZE_AT}명 이하 — 취업 지원 마감, 심사 ${n}건 다음 시즌으로`);
    }
    if (!frozen) for (const [co, list] of Object.entries(e.cohorts)) for (const c of list) if (c.started && !c.done && c.stageTick != null && e.tick > c.stageTick) runStage(co, c);
    // final passes of players who are out / not playing: hired without waiting for their turn
    for (const [pid, list] of Object.entries(e.offers)) if (list.length && !employer(pid) && away(pid)) hire(+pid, list[0].co, null, { auto: true });
    // 🎁 welcome gifts kept for hires made while out: given once they play in a season again
    for (const [pid, x] of Object.entries(e.staff)) if (x.giftDue && !away(pid)) {
        const C = L.COMPANIES[x.co];
        delete x.giftDue;
        const gift = giveGift(+pid, C);
        if (gift) { note(+pid, x.co, `🎁 ${C.name} 입사 선물 도착! (탈락 중에 입사해 이번 시즌에 지급) — ${gift}`, "pass"); log(`🎁 ${name(pid)} ${C.name} 입사 선물 ${gift}`); hr(x.co, pid, "gift", `입사 선물 지급 — ${gift}`); }
        Store.saveSeason(true);
    }
    missionTick(s);
    paySalaries(s);
    accountInterest();
    save();
}
roundHooks.push(s => { try { employTick(s); } catch (e) { console.error(e); } });
// a season that ends: unfinished applications start their review (results come in the next season's rounds) + promotions / firings
seasonEndHooks.push(s => {
    if (s.sandbox || s.testSeason) return;
    try {
        for (const co of Object.keys(L.COMPANIES)) { const c = cohort(co, s.number); if (c && !c.started) startReview(co, c); }
        seasonReview(s);
        missionSeasonEnd(s);
        save();
    } catch (e) { console.error(e); }
});

// ================================================================ 💼 hire · salary · promotion · firing
export const offersOf = pid => EM().offers[pid] || [];
export function acceptOffer(pid, co, code) {
    const offer = offersOf(pid).find(o => o.co === co), C = L.COMPANIES[co];
    if (!offer || !C) return { ok: false, why: "합격 통보가 없습니다" };
    if (employer(pid)) return { ok: false, why: "이미 취업했습니다" };
    const a = accountByCode(code);
    if (!a || a.pid !== +pid) return { ok: false, why: "본인 계좌 코드 4자리가 아닙니다" };
    return hire(pid, co, a.code);
}
// joins the company · auto: a final pass while the player is out — the bank account is linked for them,
// the welcome gift waits for the next season they play in (giftDue)
function hire(pid, co, code, { auto = false } = {}) {
    const C = L.COMPANIES[co], e = EM(), s = S();
    code ||= account(pid)?.code || null;
    const x = e.staff[pid] = { co, at: now(), season: s?.number ?? null, pay: C.pay, promos: 0, manager: false, code };
    for (const o of offersOf(pid)) { const c = cohort(o.co, o.season); const ap = c?.list.find(y => y.pid === +pid); if (ap) ap.state = o.co === co ? "hired" : "declined"; if (o.co === co) (c.hired ||= []).push(+pid); if (o.co !== co) hr(o.co, pid, "decline", "입사 포기 (다른 회사 입사)"); }
    e.offers[pid] = [];
    let gift = "";
    if (auto && away(pid)) { if (C.gifts?.length) x.giftDue = true; }
    else gift = giveGift(pid, C);
    elog(`${name(pid)} ${C.name} ${auto ? "자동 " : ""}입사${code ? ` (계좌 ${code})` : ""}`);
    hr(co, pid, "hire", auto ? `최종 합격 → 자동 입사 (탈락 중)${x.giftDue ? " · 입사 선물은 다음 시즌 선발 때 지급" : ""}` : `입사${gift ? ` · 입사 선물 ${gift}` : ""}`);
    if (auto) note(pid, co, `🎉 ${C.name} 최종 합격 — 탈락 중이라 바로 입사 처리되었습니다${code ? ` (급여 계좌 ${code} 자동 연동)` : ""}.${x.giftDue ? " 🎁 입사 선물은 다음 시즌에 뽑히면 지급됩니다." : ""}`, "offer");
    if (s) log(`🎉 ${name(pid)} ${C.name} ${auto ? "자동 " : ""}입사!${code ? ` 급여 계좌 ${code} 연동` : ""}${gift ? ` · 입사선물 ${gift}` : ""}`);
    payOne(+pid, x, "입사 첫 급여");
    fireIfFull(co, +pid);
    seatNew(+pid, co);
    save(); Store.saveSeason(true);
    return { ok: true, gift };
}
export function declineOffer(pid, co) {
    const e = EM();
    e.offers[pid] = offersOf(pid).filter(o => o.co !== co);
    hr(co, pid, "decline", "입사 포기");
    save();
}
// 🚪 leaving on one's own: the company corner goes, the employment corner comes back
export function quitJob(pid) {
    const e = EM(), x = e.staff[pid];
    if (!x) return { ok: false, why: "소속 회사가 없습니다" };
    const C = L.COMPANIES[x.co];
    delete e.staff[pid];
    hr(x.co, pid, "quit", `자진 퇴사${x.manager ? " (매니저)" : x.promos ? ` (호봉 ${x.promos}/3)` : ""}`);
    note(pid, x.co, `🚪 ${C?.name || x.co}에서 자진 퇴사했습니다.`, "info");
    elog(`${name(pid)} ${C?.name} 자진 퇴사`);
    if (S()) log(`🚪 ${name(pid)} ${C?.name} 자진 퇴사`);
    save(); Store.saveSeason(true);
    return { ok: true, C };
}
function giveGift(pid, C) {
    const ps = ps_(pid);
    if (!C.gifts?.length || !ps) return C.gifts?.length && !ps ? "(시즌 밖 — 선물 없음)" : "";
    const list = C.giftOne ? [weighted(C.gifts)] : C.gifts;
    const got = [];
    for (const g of list) {
        if (g.gold) { ps.money += g.gold; got.push(`상여금 ${g.gold.toLocaleString()}G`); }
        else if (g.item) { ps.items[g.item] = (ps.items[g.item] || 0) + 1; got.push(itemName(g.item)); }
        else if (g.emo) { emoGive(pid, g.emo, 1); got.push(emoName(g.emo)); }
    }
    return got.join(" + ");
}
const weighted = list => { let x = rnd() * list.reduce((a, g) => a + (g.w ?? 1), 0); for (const g of list) { if ((x -= g.w ?? 1) < 0) return g; } return list[0]; };
const itemName = id => `${ITEM_BY_ID[id]?.emoji || "🎁"} ${ITEM_BY_ID[id]?.name || id}`;
const emoName = id => `${emoItem(id)?.emoji || "🐾"} ${emoItem(id)?.name || id}`;
function fireIfFull(co, keep) {
    const C = L.COMPANIES[co], staff = staffOf(co);
    if (staff.length < C.cap) return;
    const pool = staff.filter(x => x.pid !== keep).sort(() => rnd() - 0.5).slice(0, C.fullFire);
    for (const x of pool) fire(x.pid, `${C.name} 정원(${C.cap}명)이 가득 차 랜덤 해고`);
}
export function fire(pid, why) {
    const e = EM(), x = e.staff[pid];
    if (!x) return;
    const C = L.COMPANIES[x.co];
    delete e.staff[pid];
    note(pid, x.co, `📭 ${C?.name || x.co}에서 해고되었습니다 — ${why}`, "fail");
    hr(x.co, pid, "fire", `해고 — ${why}`);
    elog(`${name(pid)} ${C?.name} 해고 — ${why}`);
    if (S()) log(`📭 ${name(pid)} ${C?.name} 해고 — ${why}`);
    save();
}
// salary (every round, from the hire on) → the linked account · points → the season purse
function payOne(pid, x, why = "급여") {
    const C = L.COMPANIES[x.co];
    if (!C) return;
    const a = accountByCode(x.code) || account(pid);
    if (a) { a.bgold = (a.bgold || 0) + x.pay; a.history = [{ t: now(), kind: "in", amount: x.pay, note: `${C.emoji} ${C.name} ${why}${x.manager ? " (매니저)" : ""}` }, ...(a.history || [])].slice(0, 200); }
    const ps = ps_(pid);
    if (C.pts && ps && !ps.out) ps.points += C.pts;
    if (ps && !ps.out) ps.jobGold = (ps.jobGold || 0) + x.pay; // "직업과 취업으로 번 돈" missions
}
function paySalaries(s) {
    for (const [pid, x] of Object.entries(EM().staff)) payOne(+pid, x);
    if (Object.keys(EM().staff).length) log(`💼 급여일 — 직원 ${Object.keys(EM().staff).length}명에게 이번 라운드 급여 지급 (계좌 입금)`);
}
// a finished season: rank → fired / promoted / manager
function seasonReview(s) {
    for (const [pidS, x] of Object.entries({ ...EM().staff })) {
        const pid = +pidS;
        if (!s.roster.includes(pid)) continue;
        const C = L.COMPANIES[x.co], rank = s.ps[pid]?.rank;
        if (!C || rank == null) continue;
        if (rank > C.fireOver) { fire(pid, `시즌 ${s.number} ${rank}위 (TOP ${C.fireOver} 밖)`); continue; }
        // 👔 manager: only through the promotion request (진급 신청) · a TOP finish still raises the pay step (호봉)
        if (!x.manager && rank <= C.promoTop && (x.promos || 0) < 3) {
            x.promos = (x.promos || 0) + 1; x.pay += C.promoAdd;
            note(pid, x.co, `📈 ${C.name} 호봉 ${x.promos}/3! 시즌 ${s.number} ${rank}위 — 급여 +${C.promoAdd.toLocaleString()}G → ${x.pay.toLocaleString()}G`, "pass");
            elog(`${name(pid)} ${C.name} 호봉 ${x.promos} (S${s.number} ${rank}위)`);
            hr(x.co, pid, "promo", `📈 호봉 ${x.promos}/3 — 시즌 ${s.number} ${rank}위 · 급여 ${x.pay.toLocaleString()}G`);
        }
    }
}

// ================================================================ 🗂️ org chart · 🎯 in-company missions · 👔 promotion request
// staff[pid] += { team, role: "staff" | "manager", mission: { id, attr?, race?, at, season, state, prog }, mdone, mfail, promoTry }
const DAY = 86400000;
export const orgOf = co => L.ORG[co] || [];
const isMgr = x => x.role === "manager";
const vacancy = (co, staff = staffOf(co)) => Object.fromEntries(orgOf(co).map(T => [T.id, T.staff - staff.filter(x => x.team === T.id && !isMgr(x)).length]));
const mgrFree = (co, staff = staffOf(co)) => orgOf(co).filter(T => !staff.some(x => x.team === T.id && isMgr(x))).map(T => T.id);
export const teamOf = pid => { const x = employer(pid); return x ? orgOf(x.co).find(T => T.id === x.team) || null : null; };
// "종합적인 친밀도": friends / family / acquaintances (by their weight) + helps given or received
export function socialScore(pid) {
    const rel = friendsOf(pid).reduce((a, r) => a + Math.max(1, RELS[r.rel]?.pts || 1), 0);
    return rel + helps().filter(x => +x.from === +pid || +x.to === +pid).length;
}
// what points a new hire to a team: 형용형근 비서 → 비서팀 · 카지노 캐셔 → 회계팀 · friends / intimacy → HR팀 ·
// 호텔 카운터 + 봉사활동 → 경영팀 · (청소 / 똥쓸이 회사) 카지노 청소부 + 똥쓸이 → 청소부 / 똥쓸이 팀
export function teamScores(pid, co) {
    const work = co === "sparkle" || co === "dungdung" ? jobCount(pid, "cleaner") + jobCount(pid, "dungsweep") : 0;
    return { mgmt: jobCount(pid, "hotel") + jobCount(pid, "volunteer"), hr: socialScore(pid), acct: jobCount(pid, "cashier"), sec: jobCount(pid, "secretary"), work };
}
// a random team with a free staff seat — more likely the more the player's record points there (never certain)
function pickTeam(pid, co) {
    const vac = vacancy(co), sc = teamScores(pid, co);
    let open = orgOf(co).filter(T => vac[T.id] > 0);
    if (!open.length) return null;
    // 📞 Robot Call Center: nothing in the record points elsewhere → one of the call center teams 1~4
    if (co === "robot" && !sc.sec && !sc.acct && !sc.hr && open.some(T => T.kind === "work")) open = open.filter(T => T.kind === "work");
    const w = T => vac[T.id] * (1 + 2 * Math.min(10, sc[T.kind] || 0));
    let r = rnd() * open.reduce((a, T) => a + w(T), 0);
    for (const T of open) if ((r -= w(T)) < 0) return T.id;
    return open[open.length - 1].id;
}
// staff hired before the org chart existed: managers take a free manager seat, the others a team · everyone gets a mission
export function ensureOrg(co) {
    const e = EM(), list = Object.entries(e.staff).filter(([, x]) => x.co === co);
    let dirty = false;
    for (const [, x] of list) if (!x.role) {
        if (x.manager) { const free = mgrFree(co); if (free.length) { x.team = free[Math.floor(rnd() * free.length)]; x.role = "manager"; } else { x.role = "staff"; x.manager = false; } }
        else x.role = "staff";
        dirty = true;
    }
    for (const [pid, x] of list) if (!x.team && !isMgr(x)) { const t = pickTeam(+pid, co); if (t) { x.team = t; dirty = true; } }
    for (const [pid, x] of list) if (!x.mission) { x.mission = newMission(); activateMission(+pid, x); dirty = true; }
    if (dirty) save();
}
export function orgChart(co) {
    ensureOrg(co);
    const staff = staffOf(co);
    return {
        teams: orgOf(co).map(T => ({ ...T, manager: staff.find(x => x.team === T.id && isMgr(x)) || null, members: staff.filter(x => x.team === T.id && !isMgr(x)) })),
        waiting: staff.filter(x => !orgOf(co).some(T => T.id === x.team))
    };
}
// a new hire takes a staff seat (every staff seat taken → one random staff member is let go to make room)
function seatNew(pid, co) {
    const x = EM().staff[pid], C = L.COMPANIES[co];
    if (!x) return;
    ensureOrg(co);
    x.role = "staff"; x.manager = false;
    let t = pickTeam(pid, co);
    if (!t) {
        const pool = staffOf(co).filter(s => s.pid !== +pid && !isMgr(s) && s.team);
        if (pool.length) { fire(pool[Math.floor(rnd() * pool.length)].pid, `${C.name} 팀 자리가 가득 차 랜덤 해고`); t = pickTeam(pid, co); }
    }
    x.team = t; x.mdone = 0; x.mfail = 0; x.promoTry = null;
    x.mission = newMission();
    activateMission(pid, x);
    const T = orgOf(co).find(y => y.id === t);
    hr(co, pid, "seat", `${T ? `${T.emoji} ${T.name} 사원 배치` : "배치 대기"} · 🎯 사내 미션: ${missionText(x.mission)}`);
    note(pid, co, `🗂️ ${C.name} ${T ? T.name + " " : ""}사원으로 배치되었습니다. 🎯 사내 미션: ${missionText(x.mission)} (기한: 시즌 최종 ${EMPLOY_FREEZE_AT}명이 남기 전까지)`, "info");
}

// ---- 🎯 missions
export const missionDef = m => L.CO_MISSIONS.find(M => M.id === m?.id) || null;
export const missionText = m => { const M = missionDef(m); return M ? `${M.emoji} ${M.text.replace("{attr}", m.attr || "?").replace("{race}", m.race || "?")}` : "-"; };
export function missionProgress(m) {
    const M = missionDef(m), p = m?.prog || {};
    if (!M) return "";
    if (M.id === "casino8k") return `${Math.max(0, p.net || 0).toLocaleString()} / ${M.goal.toLocaleString()}G`;
    if (M.id === "dead2") return `${p.n || 0} / ${M.goal}회`;
    if (M.id === "big30k") return `${p.slot ? "✅" : "⬜"} 슬롯 30,000G · ${p.help ? "✅" : "⬜"} ${m.race} 도움주기`;
    return "";
}
function newMission() {
    const M = L.CO_MISSIONS[Math.floor(rnd() * L.CO_MISSIONS.length)];
    const m = { id: M.id, at: now(), season: null, state: "active", prog: {} };
    if (M.id === "capture") m.attr = TYPE_LIST[Math.floor(rnd() * TYPE_LIST.length)];
    if (M.id === "big30k") {
        const roster = new Set((S()?.roster || []).map(Number)), pool = Store.players.filter(p => p.ethnicity && !roster.has(+p.id));
        m.race = (pool[Math.floor(rnd() * pool.length)] || Store.players[0])?.ethnicity || "Human";
    }
    return m;
}
// a mission counts in the first season the player plays after getting it (until 3 are left)
function activateMission(pid, x) {
    const m = x?.mission, s = S();
    if (!m || m.state !== "active" || m.season != null || !real() || !s.ps[pid] || s.ps[pid].out || employFrozen()) return;
    m.season = s.number;
}
const liveMission = pid => {
    const x = EM().staff[pid], m = x?.mission;
    if (!m || m.state !== "active" || !real()) return null;
    if (m.season == null) activateMission(pid, x);
    return m.season === S()?.number && !employFrozen() ? m : null;
};
function missionDone(pid, m) {
    const x = EM().staff[pid], C = L.COMPANIES[x.co];
    m.state = "done"; m.doneAt = now();
    x.mdone = (x.mdone || 0) + 1;
    note(pid, x.co, `🎯 ${C.name} 사내 미션 완료! ${missionText(m)} — 진급 심사에 반영됩니다`, "pass");
    hr(x.co, pid, "mission", `🎯 사내 미션 완료 — ${missionText(m)}`);
    log(`🎯 ${name(pid)} ${C.name} 사내 미션 완료!`);
    toast(`🎯 ${C.name} 사내 미션 완료! ${missionText(m)}`, "ok", 4500);
    save(); Store.saveSeason();
}
function missionFail(pid, x, why) {
    const m = x.mission, C = L.COMPANIES[x.co];
    m.state = "fail"; m.failAt = now();
    x.mfail = (x.mfail || 0) + 1;
    note(pid, x.co, `⌛ ${C.name} 사내 미션 실패 (${why}) — ${missionText(m)} · 진급 확률이 낮아집니다`, "fail");
    hr(x.co, pid, "mission_fail", `⌛ 사내 미션 실패 — ${missionText(m)}`);
}
playHooks.push((pid, kind, bet, win, extra = {}) => {
    const m = liveMission(pid);
    if (!m) return;
    const t = S().turn;
    if (m.id === "maxi" && kind === "slot" && (extra.jackpots || []).some(j => (JACKPOT_RANK[j] || 0) >= JACKPOT_RANK.MAXI)) return missionDone(pid, m);
    if (m.id === "casino8k" && kind === "casino") { m.prog.net = (m.prog.net || 0) + Math.max(0, win || 0); /* gold won, bets not subtracted */ if (m.prog.net >= 8000) missionDone(pid, m); return; }
    if (m.id === "bonus5" && kind === "slot" && t) {
        // spins counted from the moment a slot machine is opened (free spins are not spins)
        const c = (t.coSpin ||= {});
        if (c.game !== (extra.game || "?")) { c.game = extra.game || "?"; c.n = 0; }
        if (!extra.freeSpin) c.n++;
        if (extra.bonus && c.n <= 5) missionDone(pid, m);
        return;
    }
    if (m.id === "big30k" && kind === "slot" && bet >= 1000 && win >= 30000 && !m.prog.slot) { m.prog.slot = true; if (m.prog.help) missionDone(pid, m); else { toast("🎯 사내 미션: 슬롯 30,000G 달성! 이제 도움주기만 남았습니다", "ok", 4000); save(); } }
});
// ☠️ a Dead Land map visited during a turn
locationHooks.push((pid, locId) => { const t = S()?.turn; if (t && t.pid === +pid && LOC_BY_ID[locId]?.region === "deadland") t.coDead = true; });
eventHooks.push((kind, pid, data) => {
    const m = liveMission(pid);
    if (!m) return;
    if (kind === "capture" && m.id === "capture" && (emoTypes(data.mon) || []).some(ty => String(ty).toLowerCase() === String(m.attr).toLowerCase())) return missionDone(pid, m);
    if (kind === "spell" && m.id === "spell") return missionDone(pid, m);
    if (kind === "turnEnd" && m.id === "dead2" && data.turn?.coDead && !S().ps[pid]?.out) { m.prog.n = (m.prog.n || 0) + 1; if (m.prog.n >= 2) missionDone(pid, m); else save(); return; }
    if (kind === "help" && m.id === "big30k" && data.offSeason && !m.prog.help && String(Store.player(data.to)?.ethnicity || "").toLowerCase() === String(m.race).toLowerCase()) {
        m.prog.help = true;
        if (m.prog.slot) missionDone(pid, m); else { toast(`🎯 사내 미션: ${m.race} 도움주기 완료! 슬롯 30,000G만 남았습니다`, "ok", 4000); save(); }
    }
});
// round start: missions start in the season the player plays · 3 or fewer left → unfinished missions fail · a new season → a new mission
function missionTick(s) {
    const frozen = employFrozen();
    for (const [pidS, x] of Object.entries(EM().staff)) {
        const pid = +pidS;
        if (!x.mission) { x.mission = newMission(); }
        const m = x.mission;
        if (m.state !== "active" && (m.season ?? 0) < s.number && s.ps[pid] && !s.ps[pid].out && !frozen) x.mission = newMission();
        activateMission(pid, x);
        if (frozen && x.mission.state === "active" && x.mission.season === s.number) missionFail(pid, x, `시즌 ${s.number} 최종 ${EMPLOY_FREEZE_AT}명이 남을 때까지 완료하지 못함`);
    }
}
function missionSeasonEnd(s) {
    for (const [pid, x] of Object.entries(EM().staff)) if (x.mission?.state === "active" && x.mission.season === s.number) missionFail(+pid, x, `시즌 ${s.number} 종료`);
}

// ---- 👔 promotion request (staff → their team's manager)
export function promoStatus(pid) {
    const x = employer(pid);
    if (!x) return { ok: false, why: "소속 회사가 없습니다" };
    if (isMgr(x)) return { ok: false, why: "이미 매니저입니다", manager: true };
    const from = Math.max(Date.parse(x.at) || 0, Date.parse(x.promoTry || "") || 0), left = from + L.PROMO_WAIT_DAYS * DAY - Date.now();
    if (left > 0) return { ok: false, why: `${x.promoTry ? "진급 실패 후" : "입사 후"} 1개월이 지나야 진급 신청을 할 수 있습니다 (D-${Math.ceil(left / DAY)})`, left };
    return { ok: true };
}
export function promoCheck(pid) {
    const x = employer(pid), C = L.COMPANIES[x.co], staff = staffOf(x.co);
    const since = Math.max(Date.parse(x.at) || 0, Date.parse(x.promoTry || "") || 0);
    const hrPeople = staff.filter(s => s.team === "hr" && s.pid !== +pid);
    const hrSum = hrPeople.reduce((a, s) => a + (intimacy(pid, s.pid).score || 0), 0);
    const ranks = Store.results.filter(r => r.playerId === +pid && r.rank != null && (x.season == null || r.season >= x.season)).map(r => r.rank);
    const best = ranks.length ? Math.min(...ranks) : 99;
    const T = teamOf(pid);
    const checks = [
        { label: "근속 1개월", ok: Date.now() - since >= L.PROMO_WAIT_DAYS * DAY, text: `입사 ${new Date(x.at).toLocaleDateString()}` },
        { label: "사내 미션 완료", ok: (x.mdone || 0) >= 1, text: `완료 ${x.mdone || 0}회 · 실패 ${x.mfail || 0}회` },
        { label: `${T?.name || "소속 팀"} 매니저 자리`, ok: !!T && !staff.some(s => s.team === T.id && isMgr(s)), text: T ? (staff.some(s => s.team === T.id && isMgr(s)) ? `매니저 ${name(staff.find(s => s.team === T.id && isMgr(s)).pid)} 재직 중` : "공석") : "배치 대기" }
    ];
    const parts = [["기본", 35]];
    const hrB = Math.max(-10, Math.min(30, hrSum * 4));
    if (hrPeople.length) parts.push([`HR팀 ${hrPeople.length}명과의 친밀도 ${hrSum}`, hrB]); else parts.push(["HR팀 직원 없음", 0]);
    if (best <= C.mgrTop) parts.push([`입사 후 최고 ${best}위 (TOP ${C.mgrTop})`, 15]); else if (best <= C.promoTop) parts.push([`입사 후 최고 ${best}위 (TOP ${C.promoTop})`, 8]);
    if ((x.mdone || 0) > 1) parts.push([`사내 미션 추가 완료 ${(x.mdone || 0) - 1}회`, Math.min(15, ((x.mdone || 0) - 1) * 5)]);
    if (x.mfail) parts.push([`사내 미션 실패 ${x.mfail}회`, -Math.min(45, x.mfail * 15)]);
    const chance = Math.max(5, Math.min(95, parts.reduce((a, p) => a + p[1], 0)));
    return { checks, parts, chance, basic: checks.every(c => c.ok) };
}
export function applyPromotion(pid) {
    const st = promoStatus(pid);
    if (!st.ok) return st;
    const x = employer(pid), C = L.COMPANIES[x.co], T = teamOf(pid);
    const ck = promoCheck(pid), roll = Math.floor(rnd() * 100);
    const promoted = ck.basic && roll < ck.chance;
    if (promoted) {
        x.role = "manager"; x.manager = true; x.pay = C.mgrPay; x.promoTry = null;
        note(pid, x.co, `👔 ${C.name} ${T.name} 매니저 진급! 급여 ${C.mgrPay.toLocaleString()}G`, "pass");
        hr(x.co, pid, "promo", `👔 ${T.name} 매니저 진급 (진급 신청 · 확률 ${ck.chance}%) · 급여 ${C.mgrPay.toLocaleString()}G`);
        elog(`${name(pid)} ${C.name} ${T.name} 매니저 진급`);
        if (S()) log(`👔 ${name(pid)} ${C.name} ${T.name} 매니저 진급!`);
    } else {
        x.promoTry = now();
        const why = !ck.basic ? `조건 미달 (${ck.checks.filter(c => !c.ok).map(c => c.label).join(" · ")})` : `심사 탈락 (확률 ${ck.chance}%)`;
        note(pid, x.co, `📉 ${C.name} 진급 신청 결과: 불합격 — ${why}. 1개월 뒤 다시 도전할 수 있습니다`, "fail");
        hr(x.co, pid, "promo_fail", `📉 진급 신청 불합격 — ${why}`);
        if (S()) log(`📉 ${name(pid)} ${C.name} 진급 신청 불합격`);
    }
    save(); Store.saveSeason(true);
    return { ok: true, promoted, ...ck, roll };
}

// ================================================================ 🧪 Arizal Tech Test
export const arizalPending = pid => cohortsOf("arizal").flatMap(c => c.list).find(a => a.pid === +pid && a.state === "stage" && a.test && !a.test.done) || null;
export function startArizalTest(pid) {
    const a = arizalPending(pid), t = S()?.turn;
    if (!a || !t || t.pid !== +pid) return null;
    t.arizal = { until: Date.now() + L.ARIZAL_TEST.sec * 1000, won: 0, plays: 0 };
    log(`🧪 ${name(pid)} Arizal Tech Test 시작 (1분 · 100~300G 베팅 · 10,000G 이상 WIN)`);
    Store.saveSeason(true);
    return t.arizal;
}
export function finishArizalTest(pid) {
    const a = arizalPending(pid), t = S()?.turn;
    if (!a || !t?.arizal || t.arizal.done) return null;
    t.arizal.done = true;
    const won = t.arizal.won || 0, ok = won >= L.ARIZAL_TEST.goal;
    a.test = { ...a.test, done: true, ok, won };
    note(pid, "arizal", `🧪 Arizal Tech Test ${ok ? "통과" : "실패"} — 1분 동안 ${won.toLocaleString()}G WIN (목표 ${L.ARIZAL_TEST.goal.toLocaleString()}G). 결과는 다음 라운드에 확정됩니다.`, ok ? "pass" : "fail");
    log(`🧪 ${name(pid)} Arizal Tech Test ${ok ? "통과" : "실패"} (${won.toLocaleString()}G)`);
    save(); Store.saveSeason(true);
    return { ok, won };
}

// ================================================================ 🏦 bank: TOP 15 · loan record eraser · account-only products
export const loanErased = pid => !!B().loanErased?.[pid];
export function eraseLoanRecord(pid) {
    const ps = ps_(pid);
    if (!(ps?.items.loan_erase > 0)) return { ok: false, why: "대부기록 삭제권이 없습니다" };
    ps.items.loan_erase--;
    (B().loanErased ||= {})[pid] = now();
    ps.loansTaken = 0;
    log(`🧾 ${name(pid)} 대부기록 삭제권 사용 — 대출 이용 기록 삭제`);
    save(); Store.saveSeason(true);
    return { ok: true };
}
export const productLinked = (pid, need) => {
    const a = account(pid);
    if (!a) return false;
    if (need === "biz") return activeBiz().some(b => b.owner === +pid && b.code === a.code);
    if (need === "emp") return employer(pid)?.code === a.code;
    return false;
};
export const hasProduct = (pid, id) => !!account(pid)?.perks?.[id];
export function buyProduct(pid, id) {
    const P = L.ACCOUNT_PRODUCTS.find(x => x.id === id), a = account(pid), ps = ps_(pid);
    if (!P || !a) return { ok: false, why: "계좌가 필요합니다" };
    if (a.perks?.[id]) return { ok: false, why: "이미 가입한 상품입니다" };
    if (!productLinked(pid, P.need)) return { ok: false, why: P.need === "biz" ? "계좌를 Self-Business와 연동한 플레이어만 가입할 수 있습니다" : "계좌를 취업 회사 급여와 연동한 플레이어만 가입할 수 있습니다" };
    if (!ps || ps.money < P.gold) return { ok: false, why: `${P.gold.toLocaleString()}G가 필요합니다` };
    ps.money -= P.gold;
    (a.perks ||= {})[id] = { at: now(), rounds: 0, paid: 0 };
    a.history = [{ t: now(), kind: "open", amount: 0, note: `${P.emoji} ${P.name} 가입` }, ...(a.history || [])].slice(0, 200);
    log(`🏦 ${name(pid)} ${P.name} 가입 (${P.gold.toLocaleString()}G)`);
    save(); Store.saveSeason(true);
    return { ok: true };
}
// every 3 rounds: the account grows by the product's rate
function accountInterest() {
    for (const a of Object.values(B().accounts)) {
        for (const P of L.ACCOUNT_PRODUCTS) {
            const k = a.perks?.[P.id];
            if (!k) continue;
            k.rounds = (k.rounds || 0) + 1;
            if (k.rounds % P.every) continue;
            const add = Math.floor((a.bgold || 0) * P.rate);
            if (add <= 0) continue;
            a.bgold += add; k.paid = (k.paid || 0) + add;
            a.history = [{ t: now(), kind: "in", amount: add, note: `${P.emoji} ${P.name} 이자 ${Math.round(P.rate * 100)}%` }, ...(a.history || [])].slice(0, 200);
        }
    }
}
// 🏙️ hotel discount · 🛰️ weapon shop discount
export const hotelDiscount = pid => companyOf(pid)?.hotelOff || 0;
export const weaponDiscount = pid => companyOf(pid)?.weaponOff || 0;
export const hasPantry = pid => !!companyOf(pid)?.pantry;
export { alive };
