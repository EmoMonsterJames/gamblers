// =====================================================================
// 🐝 Spelling Bee stations (rules — screens/spellStations.js draws them):
//   🔗 Word Chain   random door (60%) · once per round · 15 s to submit a word that starts with
//                   the last letter of the chain word and matches this round's part of speech +
//                   syllable count (data/chainWords.js). Accepted → the word joins the chain (with
//                   who submitted it) and a bee brings one free alphabet card from its bucket.
//                   The chain lives in the season (s.wordChain) → a new season starts a new chain.
//   🛋️ 라운지       entry = hand in one random card of L O U N G E (per round)
//      🍯 꿀벌 은신처  5 rooms, random room · free 1 round / +4,000G 2 rounds / +8,000G 3 rounds
//                     (4 players or fewer alive → 1 round only) · shelter (weather + NPC) on every
//                     Spelling Bee map, like the other lodgings (stored in s.lodge like them)
//      🥫 꿀벌 자판기  lounge guests: one free random bee food per season
// State: s.wordChain = { chain: [{ w, pid, round, cond }], cond: { letter, pos, syl, round }, restarts }
//        ps.wc = { round, gate, started, done, ok, tries: [] }
//        ps.beeLounge = { round, need, in } · ps.beeVend = season number · t.beeDraw = { <locId>: { i, taken } }
// =====================================================================
import { Store } from "../core/store.js";
import { LOC_BY_ID, cardId, ALPHABET, ALL_LETTERS } from "../data/catalog.js";
import { CHAIN_WORDS, CHAIN_BY_WORD, POS_NAME } from "../data/chainWords.js";
import { foodItemId } from "../data/life.js";
import { S, log, name, alive } from "./season.js";

const rnd = () => Math.random();
const pick = a => a[Math.floor(rnd() * a.length)];
const round = () => S()?.round || 0;
const wallet = ps => (ps?.money || 0) + (ps?.loanGold || 0);
const pay = (ps, g) => { const fromLoan = Math.min(ps.loanGold || 0, g); ps.loanGold = (ps.loanGold || 0) - fromLoan; ps.money -= g - fromLoan; };

// ---------------------------------------------------------------- 🪣 the bee's alphabet bucket
// G A M B L E R S (the alphabet cards) are rare: 0.6% each (4.8% together). The other 18 letters share
// the remaining 95.2% — common letters more often, J Q X Z least.
export const BUCKET_ODDS = (() => {
    const o = {};
    for (const l of ALPHABET) o[l] = 0.6;
    const common = ["C", "D", "I", "N", "O", "T", "U", "P"], mid = ["F", "H", "K", "W", "V", "Y"], rare = ["J", "Q", "X", "Z"];
    for (const l of common) o[l] = 7;          // 8 × 7    = 56
    for (const l of mid) o[l] = 4.5;           // 6 × 4.5  = 27
    for (const l of rare) o[l] = 3.05;         // 4 × 3.05 = 12.2   → 56 + 27 + 12.2 + 4.8 = 100
    return o;
})();
export function bucketLetter() {
    let r = rnd() * 100;
    for (const l of ALL_LETTERS) { r -= BUCKET_ODDS[l] || 0; if (r < 0) return l; }
    return "O";
}

// ---------------------------------------------------------------- 🔗 Word Chain
export const WC_ADMIT = 0.6, WC_SECONDS = 15;
export const posName = p => POS_NAME[p] || p;
export const condText = c => c ? `${c.letter}로 시작하는 ${c.syl}음절 ${posName(c.pos)}` : "";
const used = wc => new Set(wc.chain.map(x => x.w));
// a condition that the dictionary can answer: one unused word starting with the letter, one of its parts of speech
function rollCond(wc, letter) {
    const u = used(wc);
    const opts = [];
    for (const e of CHAIN_WORDS) if (e.w[0] === letter && !u.has(e.w)) for (const p of e.pos) opts.push({ p, syl: e.syl });
    if (!opts.length) return null;
    const o = pick(opts);
    return { letter, pos: o.p, syl: o.syl, round: round() };
}
// a fresh chain word (season start, or the chain got stuck on a letter nobody can continue)
function restart(wc, why = "") {
    const u = used(wc);
    const starts = CHAIN_WORDS.filter(e => !u.has(e.w) && e.w.length >= 4 && e.pos.includes("n"));
    const w = pick(starts.length ? starts : CHAIN_WORDS).w;
    wc.chain.push({ w, pid: null, round: round(), seed: true });
    wc.cond = rollCond(wc, w[w.length - 1]);
    if (!wc.cond) return restart(wc, why);
    if (why) log(`🔗 Word Chain ${why} → 새 단어 ${w}`);
}
// the season's chain: the condition changes every round (and after every accepted word)
export function wordChain() {
    const s = S();
    if (!s) return null;
    if (!s.wordChain?.chain?.length) { s.wordChain = { chain: [], cond: null, restarts: 0 }; restart(s.wordChain); Store.saveSeason(); }
    const wc = s.wordChain;
    if (!wc.cond || wc.cond.round !== s.round) {
        const last = wc.chain[wc.chain.length - 1].w;
        wc.cond = rollCond(wc, last[last.length - 1]);
        if (!wc.cond) { wc.restarts = (wc.restarts || 0) + 1; restart(wc, `'${last}' 다음으로 이을 단어가 없어서`); }
        Store.saveSeason();
    }
    return wc;
}
export const chainHead = wc => wc.chain[wc.chain.length - 1];
const wcOf = pid => { const ps = S().ps[pid]; if (ps.wc?.round !== round()) ps.wc = { round: round() }; return ps.wc; };
export const wcState = pid => wcOf(pid);
// 🎟️ the door: 60% once per round
export function wcGate(pid) {
    const st = wcOf(pid);
    if (st.gate != null) return st.gate;
    st.gate = rnd() < WC_ADMIT;
    log(`🔗 ${name(pid)} Word Chain 입장 ${st.gate ? "허용 ✅" : "거부 ⛔"}`);
    Store.saveSeason(true);
    return st.gate;
}
export function wcStart(pid) {
    const st = wcOf(pid);
    if (!st.gate || st.started || st.done) return false;
    wordChain();
    st.started = Date.now();
    st.tries = [];
    log(`🔗 ${name(pid)} Word Chain 시작 (${condText(S().wordChain.cond)})`);
    Store.saveSeason(true);
    return true;
}
export const wcLeft = pid => { const st = wcOf(pid); return st.started && !st.done ? Math.max(0, WC_SECONDS - (Date.now() - st.started) / 1000) : 0; };
// time is up (checked on every draw too, so leaving the screen does not stop the clock)
export function wcTimeout(pid) {
    const st = wcOf(pid);
    if (!st.started || st.done || wcLeft(pid) > 0) return false;
    st.done = true; st.ok = false;
    log(`🔗 ${name(pid)} Word Chain 시간 초과 ⏰`);
    Store.saveSeason(true);
    return true;
}
// → { ok, why } | { ok: true, letter, word }
export function wcSubmit(pid, raw) {
    const st = wcOf(pid);
    if (!st.started || st.done) return { ok: false, why: "진행 중이 아닙니다" };
    if (wcTimeout(pid)) return { ok: false, why: "⏰ 시간 초과!", over: true };
    const wc = wordChain(), c = wc.cond;
    const w = String(raw || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    const bad = why => { st.tries.push({ w, why }); Store.saveSeason(); return { ok: false, why }; };
    if (!w) return bad("단어를 입력하세요");
    if (w[0] !== c.letter) return bad(`${c.letter}(으)로 시작해야 합니다`);
    if (used(wc).has(w)) return bad("이미 체인에 쓰인 단어입니다");
    const e = CHAIN_BY_WORD[w];
    if (!e) return bad("단어장에 없는 단어입니다");
    if (!e.pos.includes(c.pos)) return bad(`${posName(c.pos)}가 아닙니다 (${e.pos.map(posName).join("·")})`);
    if (e.syl !== c.syl) return bad(`${c.syl}음절이 아닙니다 (${e.syl}음절)`);
    // ✅ accepted: the word joins the chain, the bee brings a letter
    st.done = true; st.ok = true; st.word = w;
    const letter = bucketLetter(), ps = S().ps[pid];
    ps.items[cardId(letter)] = (ps.items[cardId(letter)] || 0) + 1;
    st.letter = letter;
    wc.chain.push({ w, pid: +pid, round: round(), cond: { ...c } });
    wc.cond = rollCond(wc, w[w.length - 1]);
    if (!wc.cond) restart(wc, `'${w}' 다음으로 이을 단어가 없어서`);
    log(`🔗 ${name(pid)} Word Chain ✅ ${w} (${condText(c)}) → 🐝 알파벳 ${ALPHABET.includes(letter) ? "카드" : "권"} ${letter}`);
    Store.saveSeason(true);
    return { ok: true, letter, word: w };
}

// ---------------------------------------------------------------- 🛋️ Spelling Bee 라운지
export const LOUNGE_LETTERS = ["L", "O", "U", "N", "G", "E"];
export function loungeOf(pid) {
    const ps = S().ps[pid];
    if (ps.beeLounge?.round !== round()) ps.beeLounge = { round: round(), need: pick(LOUNGE_LETTERS), in: false };
    return ps.beeLounge;
}
export const inLounge = pid => !!loungeOf(pid).in;
export function enterLounge(pid) {
    const lg = loungeOf(pid), ps = S().ps[pid], id = cardId(lg.need);
    if (lg.in) return { ok: true };
    if (!(ps.items[id] > 0)) return { ok: false, why: `${lg.need} 카드(알파벳권)가 없습니다` };
    ps.items[id]--;
    lg.in = true;
    log(`🛋️ ${name(pid)} Spelling Bee 라운지 입장 (${lg.need} 제출)`);
    Store.saveSeason(true);
    return { ok: true };
}

// 🍯 꿀벌 은신처 — 5 rooms, lives in s.lodge[locId].bee_hideout like the other lodgings
export const BEE_HIDEOUT = { id: "bee_hideout", k: "bee_hideout", name: "꿀벌 은신처", emoji: "🍯", rooms: 5 };
export const HIDEOUT_PLANS = [{ rounds: 1, price: 0 }, { rounds: 2, price: 4000 }, { rounds: 3, price: 8000 }];
export const hideoutPlans = () => alive().length <= 4 ? HIDEOUT_PLANS.slice(0, 1) : HIDEOUT_PLANS;
const hideRooms = locId => { const s = S(); return ((s.lodge ||= {})[locId] ||= {})[BEE_HIDEOUT.k] ||= {}; };
export const hideKey = i => `room-${i + 1}`;
export function hideoutRooms(locId) {
    const o = hideRooms(locId), r = round();
    return Array.from({ length: BEE_HIDEOUT.rooms }, (_, i) => { const x = o[hideKey(i)]; return { i, key: hideKey(i), who: x && x.until >= r ? x : null }; });
}
// my bee-hideout stay (any Spelling Bee map) → { locId, key, until } | null
export function myHideout(pid) {
    const s = S(), r = round();
    for (const [locId, byK] of Object.entries(s?.lodge || {})) for (const [key, x] of Object.entries(byK?.[BEE_HIDEOUT.k] || {})) if (+x?.pid === +pid && x.until >= r) return { locId, key, ...x };
    return null;
}
// 🎲 one random room per visit (turn)
export function hideoutDraw(pid, t, locId) {
    const d = (t.beeDraw ||= {});
    if (d[locId]) return d[locId];
    const i = Math.floor(rnd() * BEE_HIDEOUT.rooms), x = hideRooms(locId)[hideKey(i)];
    d[locId] = { i, taken: x && x.until >= round() && +x.pid !== +pid ? +x.pid : null };
    log(`🍯 ${name(pid)} 꿀벌 은신처 랜덤 객실 → ${i + 1}번${d[locId].taken != null ? ` (이미 ${name(d[locId].taken)} 사용 중)` : ""}`);
    Store.saveSeason(true);
    return d[locId];
}
export function hideoutCheckIn(pid, t, locId, rounds) {
    const ps = S().ps[pid], d = t?.beeDraw?.[locId];
    if (!inLounge(pid)) return { ok: false, why: "라운지 입장자만 이용할 수 있습니다" };
    if (myHideout(pid)) return { ok: false, why: "이미 꿀벌 은신처에 묵고 있습니다" };
    if (!d || d.taken != null) return { ok: false, why: "먼저 객실을 뽑으세요" };
    const plan = hideoutPlans().find(p => p.rounds === +rounds);
    if (!plan) return { ok: false, why: "지금은 1라운드만 이용할 수 있습니다 (남은 플레이어 4명 이하)" };
    if (wallet(ps) < plan.price) return { ok: false, why: `${plan.price.toLocaleString()}G가 부족합니다` };
    const o = hideRooms(locId), key = hideKey(d.i), x = o[key];
    if (x && x.until >= round() && +x.pid !== +pid) return { ok: false, why: "이미 다른 플레이어가 있는 객실입니다" };
    if (plan.price) pay(ps, plan.price);
    const until = round() + plan.rounds - 1;
    o[key] = { pid: +pid, from: round(), until, paid: plan.price, lodge: BEE_HIDEOUT.name };
    d.done = true;
    log(`🍯 ${name(pid)} ${LOC_BY_ID[locId]?.name || locId} 꿀벌 은신처 ${d.i + 1}번 체크인 — ${plan.rounds}라운드 (R${round()}~R${until})${plan.price ? ` · ${plan.price.toLocaleString()}G` : " · 무료"}`);
    Store.saveSeason(true);
    return { ok: true, until, rounds: plan.rounds };
}

// 🥫 꿀벌 자판기 — one free random bee food per season (lounge guests)
export const BEE_FOODS = ["honeypot", "beeicecream", "minihoneypot"];
export const vendUsed = pid => S().ps[pid].beeVend === S().number;
export function vend(pid) {
    const ps = S().ps[pid];
    if (!inLounge(pid)) return { ok: false, why: "라운지 입장자만 이용할 수 있습니다" };
    if (vendUsed(pid)) return { ok: false, why: "이번 시즌에는 이미 받았습니다" };
    const f = pick(BEE_FOODS), id = foodItemId(f);
    ps.items[id] = (ps.items[id] || 0) + 1;
    ps.beeVend = S().number;
    log(`🥫 ${name(pid)} 꿀벌 자판기 → ${f}`);
    Store.saveSeason(true);
    return { ok: true, food: f };
}
