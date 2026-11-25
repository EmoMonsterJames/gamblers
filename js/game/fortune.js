// =====================================================================
// 🔮 Fortune Teller (2026-11) — the state side (UI: screens/fortune.js)
//   🔮 점보기 (10,000G · once a season): 8 questions → YES / NO or a profile / map / item in the amethyst ball.
//        Just for fun — when the answer is already settled (eliminated / winner known), it is right only 50% of the time.
//   🃏 타로카드 (20,000G · Fortune Teller shop · used once a season): 5 situational questions, answered by one of
//        20 tarot cards (much more reliable than the ball)
//   🥠 포춘쿠키 (5,000G · used once a round): a one-line message + 식량 +20 · HP +10
//   35 maps that have a shop carry the corner (fortuneHere) — under 🛒 상점
// =====================================================================
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { LOCATIONS, LOC_BY_ID, ITEMS, ITEM_BY_ID, npcPool } from "../data/catalog.js";
import * as G from "./season.js";
import * as TR from "./travel.js";

const S = () => Store.season;
const ps_ = pid => S()?.ps?.[pid];
const rnd = () => Math.random();
const pickOne = a => a[Math.floor(rnd() * a.length)];
const wallet = ps => (ps?.money || 0) + (ps?.loanGold || 0);
const payGold = (ps, g) => { const fromLoan = Math.min(ps.loanGold || 0, g); ps.loanGold = (ps.loanGold || 0) - fromLoan; ps.money -= g - fromLoan; };
const aliveIds = () => (S()?.roster || []).filter(pid => !S().ps[pid]?.out);

export const FORTUNE_FEE = 10000, TAROT_PRICE = 20000, COOKIE_PRICE = 5000;
export const WARNING = "본인의 운명은 항상 달라질 수 있으니, 100% 점쟁이의 견해를 믿지는 마세요";
export const COOKIE_WARNING = "포춘쿠키가 하는 덕담은 100%로 믿지마세요";

// ---- bag items
for (const it of [
    { id: "tarot_card", name: "타로카드", emoji: "🃏", fortune: true, desc: "🔮 Fortune Telling Shop의 타로카드 — 인벤토리에서 사용하면 지금 상황에 맞는 질문 하나를 타로 카드 20장 중 한 장으로 점칩니다 (시즌당 1회 사용)." },
    { id: "fortune_cookie", name: "포춘쿠키", emoji: "🥠", fortune: true, desc: "🔮 Fortune Telling Shop의 포춘쿠키 — 사용하면 한 줄 메시지 + 식량 +20 · HP +10 (라운드당 1회 사용)." }
]) if (!ITEM_BY_ID[it.id]) { ITEMS.push(it); ITEM_BY_ID[it.id] = it; }

// ---- the 35 maps with a 🔮 corner: maps with a shop, spread evenly over every region (fixed by map order)
const FORTUNE_COUNT = 35;
let _maps = null;
export function fortuneMaps() {
    if (_maps) return _maps;
    const pool = LOCATIONS.filter(l => (l.shops || []).length && !l.sub && !l.kidnap && !["airport", "survival", "sub"].includes(l.region));
    const step = pool.length / FORTUNE_COUNT;
    _maps = new Set(Array.from({ length: Math.min(FORTUNE_COUNT, pool.length) }, (_, i) => pool[Math.floor(i * step)].id));
    return _maps;
}
export const fortuneHere = loc => !!loc && fortuneMaps().has(loc.id);

// ================================================================ 🔮 점보기
export const QUESTIONS = [
    { id: "out", text: "제가 이번 라운드에서 탈락하나요?" },
    { id: "outface", text: "이번 라운드에서 탈락하게 될 프로필 이미지를 보여주세요." },
    { id: "win", text: "제가 이번 시즌에서 우승하나요?" },
    { id: "avoid", text: "제가 다음 라운드에 방문하지 말아야 할 맵이 있을까요?" },
    { id: "buy", text: "제가 지금 꼭 구입해야 할 아이템이 있을까요?" },
    { id: "die", text: "제가 이번 시즌에서 바로 사망하게 되나요?" },
    { id: "top10", text: "제가 TOP 10에 들어갈 수 있을까요?" },
    { id: "vs", text: "제가 [플레이어] 플레이어보다 더 오래 갈 수 있나요?", target: true }
];
export const fortuneUsed = pid => ps_(pid)?.fortuneSeason === S()?.number && !!ps_(pid)?.fortuneQ;
export const fortuneRec = pid => ps_(pid)?.fortuneQ || null;
const lie = (known, truth, pTrue) => known ? (rnd() < 0.5 ? truth : !truth) : rnd() < pTrue; // settled → 50% right
const BUY_HINTS = ["hp_50", "hp_full", "time_ext", "mission_pass", "npc_block", "slot_plus5", "casino_plus1", "oxygen", "wings", "map_random", "turn_end", "final_shield"];
const AVOID_HINT = () => LOCATIONS.filter(l => !l.off && !l.sub && !l.kidnap && l.region !== "survival" && (l.npc === "always" || l.region === "deadland" || l.region === "difficult"));
// → { q, kind: "yesno" | "profile" | "map" | "item", yes, pid, loc, item }
export function askFortune(pid, qid, target = null) {
    const s = S(), ps = ps_(pid), q = QUESTIONS.find(x => x.id === qid);
    if (!s || !ps || !q) return { ok: false, why: "질문을 고르세요" };
    if (fortuneUsed(pid)) return { ok: false, why: "점보기는 시즌당 1번만 볼 수 있습니다" };
    if (q.target && (!target || +target === +pid || ps_(target)?.out)) return { ok: false, why: "살아 있는 다른 플레이어를 고르세요" };
    if (wallet(ps) < FORTUNE_FEE) return { ok: false, why: `골드 부족 (${FORTUNE_FEE.toLocaleString()}G)` };
    payGold(ps, FORTUNE_FEE);
    const live = aliveIds(), others = live.filter(x => x !== pid);
    const res = s.results || {};
    const out = { ok: true, q: q.id, text: q.text, kind: "yesno" };
    if (q.id === "out") {
        const known = !!res[pid];
        out.yes = lie(known, known && !res[pid].pass, Math.min(0.5, 2 / Math.max(2, live.length)));
    } else if (q.id === "outface") {
        const cands = live.filter(x => res[x] && !res[x].pass);
        const truth = cands.length ? pickOne(cands) : null;
        out.kind = "profile";
        out.pid = truth != null && rnd() < 0.5 ? truth : pickOne(truth != null ? live.filter(x => x !== truth).concat(live.length < 2 ? [truth] : []) : live);
    } else if (q.id === "win") {
        const known = live.length === 1 || s.status === "done";
        out.yes = lie(known, live.length === 1 && live[0] === pid, Math.min(0.45, 2.5 / Math.max(1, live.length)));
    } else if (q.id === "avoid") {
        const list = AVOID_HINT();
        out.yes = rnd() < 0.65 && list.length > 0;
        if (out.yes) { out.kind = "map"; out.loc = pickOne(list).id; }
    } else if (q.id === "buy") {
        const list = BUY_HINTS.filter(id => ITEM_BY_ID[id]);
        out.yes = rnd() < 0.7 && list.length > 0;
        if (out.yes) { out.kind = "item"; out.item = pickOne(list); }
    } else if (q.id === "die") {
        out.yes = rnd() < (ps.hp <= 30 ? 0.4 : 0.2);
    } else if (q.id === "top10") {
        const known = live.length <= 10;
        out.yes = lie(known, true, Math.min(0.9, 10 / Math.max(1, live.length)));
    } else if (q.id === "vs") {
        const score = x => (ps_(x)?.hp || 0) + (ps_(x)?.money || 0) / 2000 + (ps_(x)?.points || 0) / 5;
        const truth = score(pid) >= score(+target);
        out.yes = rnd() < 0.6 ? truth : !truth;
        out.kind = "profile"; out.pid = out.yes ? pid : +target; out.target = +target;
    }
    ps.fortuneSeason = s.number; ps.fortuneQ = { q: q.id, at: Date.now(), round: s.round, ans: { ...out } };
    G.log(`🔮 ${G.name(pid)} 점보기 (${FORTUNE_FEE.toLocaleString()}G): "${q.text.replace("[플레이어]", G.name(target || pid))}"`);
    Store.saveSeason(true);
    return out;
}

// ================================================================ 🃏 타로카드 (20 cards)
// tone: good / bad / mixed · for: the questions the card likes to answer (any card can come up)
export const TAROT = [
    { id: "fall", no: "XVI", name: "추락하는 사람", en: "The Falling Man", art: ["🏢", "🧍", "💨"], tone: "bad", for: ["plane", "map"], desc: "사람이 옥상에서 추락하는 불길한 징조의 카드" },
    { id: "death", no: "XIII", name: "죽음", en: "Death", art: ["💀", "🌹"], tone: "bad", for: ["map", "plane"], desc: "검은 망토의 해골이 장미를 든, 끝을 알리는 카드" },
    { id: "devil", no: "XV", name: "악마", en: "The Devil", art: ["😈", "⛓️"], tone: "bad", for: ["map", "slot"], desc: "사슬에 묶인 사람들을 내려다보는 악마의 카드 — 욕심이 화를 부릅니다" },
    { id: "tower", no: "XVI", name: "무너지는 탑", en: "The Tower", art: ["🗼", "⚡"], tone: "bad", for: ["plane", "mission"], desc: "번개에 맞아 무너지는 탑 — 갑작스러운 붕괴의 카드" },
    { id: "moon", no: "XVIII", name: "달", en: "The Moon", art: ["🌙", "🐺"], tone: "bad", for: ["capture", "slot"], desc: "안개 낀 달밤에 늑대가 우는, 착각과 불안의 카드" },
    { id: "hanged", no: "XII", name: "매달린 사람", en: "The Hanged Man", art: ["🙃", "🌳"], tone: "bad", for: ["mission", "capture"], desc: "거꾸로 매달려 꼼짝 못 하는, 일이 멈추는 카드" },
    { id: "fool", no: "0", name: "바보", en: "The Fool", art: ["🤡", "🧗"], tone: "bad", for: ["slot", "mission"], desc: "절벽 끝에서 한 발을 내딛는 바보의 카드 — 무모함 주의" },
    { id: "cat", no: "XXI·b", name: "검은 고양이", en: "The Black Cat", art: ["🐈‍⬛", "🪜"], tone: "bad", for: ["capture", "map"], desc: "사다리 밑을 지나가는 검은 고양이 — 손에 쥔 것이 빠져나가는 카드" },
    { id: "wing", no: "XX·b", name: "부러진 날개", en: "The Broken Wing", art: ["🪽", "💔"], tone: "bad", for: ["plane"], desc: "날개 한쪽이 부러진 새의 카드 — 하늘이 당신 편이 아닙니다" },
    { id: "hermit", no: "IX", name: "은둔자", en: "The Hermit", art: ["🏮", "🧙"], tone: "mixed", for: ["mission", "map"], desc: "등불 하나로 어둠을 걷는 은둔자 — 혼자 조용히 버티라는 카드" },
    { id: "sun", no: "XIX", name: "태양", en: "The Sun", art: ["☀️", "🌻"], tone: "good", for: ["slot", "mission"], desc: "해바라기 밭 위로 떠오른 태양 — 성공과 환희의 카드" },
    { id: "star", no: "XVII", name: "별", en: "The Star", art: ["⭐", "🏺"], tone: "good", for: ["plane", "capture"], desc: "밤하늘의 큰 별 아래 물을 붓는 여인 — 희망과 보호의 카드" },
    { id: "world", no: "XXI", name: "세계", en: "The World", art: ["🌍", "🏆"], tone: "good", for: ["mission", "plane"], desc: "월계관 속에서 춤추는 사람 — 완성과 도착의 카드" },
    { id: "wheel", no: "X", name: "운명의 수레바퀴", en: "Wheel of Fortune", art: ["🎡", "🍀"], tone: "good", for: ["slot"], desc: "행운의 수레바퀴가 당신 쪽으로 돌아가는 카드" },
    { id: "lovers", no: "VI", name: "연인", en: "The Lovers", art: ["💞", "🕊️"], tone: "good", for: ["capture"], desc: "두 존재가 손을 맞잡는 인연의 카드 — 새로운 동반자가 찾아옵니다" },
    { id: "magician", no: "I", name: "마법사", en: "The Magician", art: ["🪄", "✨"], tone: "good", for: ["capture", "slot"], desc: "지팡이 하나로 원하는 것을 불러내는 마법사의 카드" },
    { id: "chariot", no: "VII", name: "전차", en: "The Chariot", art: ["🏇", "🛡️"], tone: "good", for: ["mission", "map"], desc: "두 마리 말이 끄는 전차가 거침없이 달리는 승리의 카드" },
    { id: "strength", no: "VIII", name: "힘", en: "Strength", art: ["🦁", "💪"], tone: "good", for: ["map", "mission"], desc: "사자의 입을 맨손으로 다무는 용기의 카드 — 위험을 이겨냅니다" },
    { id: "angel", no: "XIV", name: "수호천사", en: "Temperance", art: ["😇", "🍷"], tone: "good", for: ["plane", "map"], desc: "두 잔의 물을 고르게 섞는 천사 — 무사히 지켜 주는 카드" },
    { id: "empress", no: "III", name: "여황제", en: "The Empress", art: ["👑", "💰"], tone: "good", for: ["slot", "capture"], desc: "황금 들판의 여황제 — 풍요와 수확의 카드" }
];
export const TAROT_BY_ID = Object.fromEntries(TAROT.map(c => [c.id, c]));
const T_LINE = {
    plane: { bad: "비행기 안에서는 특히 조심하세요. 하늘이 오늘은 당신 편이 아닐지도 모릅니다…", good: "구름 위의 길이 평온합니다. 무사히 땅을 밟게 될 기운이에요." },
    map: { bad: "이 맵에 머무는 동안 등 뒤를 조심하세요. 그림자가 바짝 붙어 있습니다…", good: "위험이 스쳐 지나갑니다. 이 맵에서 쓰러지지는 않을 기운이에요." },
    capture: { bad: "눈앞의 이모몬스터는 당신의 손을 빠져나갈 운명입니다…", good: "이 이모몬스터와 인연이 닿아 있습니다. 볼을 던져 보세요!" },
    slot: { bad: "남은 스핀으로는 큰 잭팟이 오지 않습니다. 욕심을 줄이세요…", good: "릴이 황금빛으로 물듭니다 — Maxi 이상의 잭팟 기운이 보여요!" },
    mission: { bad: "이번 맵의 미션은 손에서 미끄러질 기운입니다. 다른 길을 찾아보세요…", good: "길이 활짝 열려 있습니다. 미션을 해낼 기운이 강해요!" }
};
// the 5 questions — avail(pid) → null (ok) or why it is blocked
export const TAROT_Q = [
    { id: "plane", text: "제가 타는 비행기가 추락할까요?", badIsYes: true, need: "비행기 안에서만 사용할 수 있습니다" },
    { id: "map", text: "제가 해당 맵에서 바로 사망하나요?", badIsYes: true, need: "지금 맵에 NPC가 등장할 때만 사용할 수 있습니다" },
    { id: "capture", text: "제가 해당 이모몬스터를 잡을 수 있나요?", need: "EmoMon Capture에서 Find로 이모몬스터가 나타나 있고 볼이 있을 때만 사용할 수 있습니다" },
    { id: "slot", text: "제가 슬롯 게임으로 지금 남은 스핀 안에 Maxi 이상의 잭팟을 딸 수 있나요?", need: "슬롯 게임이 2개 이상 있는 맵에서만 사용할 수 있습니다" },
    { id: "mission", text: "제가 해당 맵에서 미션을 성공할 수 있을까요?", need: "이번 라운드 미션이 있을 때 턴 중에만 사용할 수 있습니다" }
];
// 🐾 the wild monster on screen right now (screens/emoCorners.js sets / clears it)
let wild = null;
export const setWild = (pid, w, chanceFn = null) => { wild = w ? { pid: +pid, w, chanceFn, round: S()?.round } : null; };
export const wildNow = pid => wild && wild.pid === +pid && wild.round === S()?.round ? wild : null;
const ballChance = pid => { const x = wildNow(pid); try { return x?.chanceFn ? x.chanceFn() : null; } catch { return null; } };

export function tarotAvail(pid, qid) {
    const s = S(), t = s?.turn, loc = LOC_BY_ID[t?.loc];
    if (!t || +t.pid !== +pid || !loc) return "턴 중에만 사용할 수 있습니다";
    const q = TAROT_Q.find(x => x.id === qid);
    if (qid === "plane") return loc.plane ? null : q.need;
    if (qid === "map") return G.npcActive(loc.id) && npcPool(loc).length ? null : q.need;
    if (qid === "capture") { const c = ballChance(pid); return wildNow(pid) && c && c.balls > 0 ? null : q.need; }
    if (qid === "slot") return (loc.slots || []).length >= 2 ? null : q.need;
    if (qid === "mission") return s.mission ? null : q.need;
    return "질문을 고르세요";
}
export const tarotUsed = pid => ps_(pid)?.tarotSeason === S()?.number;
// the true odds of the GOOD outcome (no crash · survive · catch · jackpot · mission done)
function goodOdds(pid, qid) {
    const s = S(), t = s.turn, ps = ps_(pid), loc = LOC_BY_ID[t.loc];
    if (qid === "plane") { const f = TR.flightNow(); if (!f) return 0.8; return f.crash && !f.done ? 0.06 : 0.94; }
    if (qid === "map") {
        const pool = npcPool(loc);
        const kill = pool.reduce((a, n) => a + (n.moves || []).filter(m => m.kill).reduce((b, m) => b + (m.w ?? 1), 0) / Math.max(1, (n.moves || []).reduce((b, m) => b + (m.w ?? 1), 0)), 0) / Math.max(1, pool.length);
        const low = ps.hp <= 20 ? 0.35 : ps.hp <= 40 ? 0.15 : 0;
        return Math.max(0.05, 1 - Math.min(0.9, kill * 1.6 + low));
    }
    if (qid === "capture") { const c = ballChance(pid); if (!c) return 0.3; const p1 = Math.min(1, (c.best || 0) / 100); return Math.min(0.97, 1 - Math.pow(1 - p1, Math.min(4, c.balls)) * 0.95); }
    if (qid === "slot") { const n = Math.max(0, G.playsLeft(pid, "slot")); return 1 - Math.pow(1 - 0.0035, n); }
    if (qid === "mission") {
        const m = s.mission;
        if (G.missionMet(m, t.stats)) return 0.97;
        if (G.judgedMission(m)) return 0.5;
        const p = G.missionProgress(m, t.stats), ratio = Math.min(1, (p.cur || 0) / Math.max(1, p.goal || 1));
        const time = Math.min(1, (t.remaining || 0) / (CONFIG.TURN_SECONDS || 600));
        return Math.max(0.05, Math.min(0.9, ratio * 0.7 + time * 0.25));
    }
    return 0.5;
}
// → { card, good, line, odds }
export function readTarot(pid, qid) {
    const ps = ps_(pid), s = S();
    if (!(ps?.items?.tarot_card > 0)) return { ok: false, why: "타로카드가 없습니다" };
    if (tarotUsed(pid)) return { ok: false, why: "타로카드는 시즌당 1번만 쓸 수 있습니다" };
    const why = tarotAvail(pid, qid); if (why) return { ok: false, why };
    const odds = goodOdds(pid, qid);
    const good = rnd() < odds; // the cards follow the real odds — far more reliable than the ball
    const want = good ? "good" : "bad";
    const fits = TAROT.filter(c => (c.tone === want || (!good && c.tone === "mixed")) && c.for.includes(qid));
    const card = pickOne(fits.length ? fits : TAROT.filter(c => c.tone === want));
    ps.items.tarot_card--;
    ps.tarotSeason = s.number;
    const q = TAROT_Q.find(x => x.id === qid);
    G.log(`🃏 ${G.name(pid)} 타로카드: "${q.text}" → ${card.name}`);
    Store.saveSeason(true);
    return { ok: true, q, card, good, line: T_LINE[qid][want], odds };
}

// ================================================================ 🥠 포춘쿠키
export const cookieUsedRound = pid => ps_(pid)?.cookieRound === S()?.round;
const LUCKY = [
    "오늘 밤 릴 세 줄이 당신 이름을 부릅니다.", "주머니 속 동전 하나가 내일 열 배가 되어 돌아옵니다.", "당신이 지나간 맵에 무지개가 뜹니다.",
    "다음 보너스는 생각보다 빨리 찾아옵니다.", "오늘은 무엇을 눌러도 손이 잘 풀리는 날입니다.", "잃어버린 행운이 길모퉁이에서 기다리고 있어요."
];
const OMINOUS = [
    "등 뒤에서 누군가 당신의 지갑을 노려보고 있습니다.", "오늘은 슬롯 레버를 너무 세게 당기지 마세요.", "검은 고양이가 세 번 지나가면 그 맵을 떠나세요.",
    "어둠 속 인형의 눈이 당신을 따라 움직입니다…", "가장 믿는 사람이 가장 큰 배팅을 할 것입니다.", "오늘의 마지막 스핀은 하지 않는 편이 좋겠습니다."
];
const SILLY = [
    "당신의 다음 생은 아주 행복한 감자입니다.", "양말을 뒤집어 신으면 확률이 1% 오릅니다 (아마도).", "오늘 점심 메뉴는 당신을 기억할 겁니다.",
    "엘리베이터 버튼은 세 번 누를수록 기분이 좋아집니다.", "펭귄과 눈이 마주치면 먼저 인사하세요.", "당신은 지금 이 쿠키보다 바삭합니다."
];
const GOSSIP = [
    "이번 시즌 참가자 '{p}'은(는) 사실 당신을 좋아합니다.", "이번 시즌 참가자 '{p}'은(는) 양치를 제대로 안 해서 입냄새가 심해요.",
    "이번 시즌 참가자 '{p}'은(는) 몰래 당신의 전략을 따라 하고 있습니다.", "이번 시즌 참가자 '{p}'은(는) 어젯밤 슬롯 꿈을 꾸다 울었대요.",
    "이번 시즌 참가자 '{p}'은(는) 지갑에 부적을 세 장이나 넣고 다닙니다.", "이번 시즌 참가자 '{p}'은(는) 당신에게 밥 한 번 사고 싶어 합니다.",
    "이번 시즌 참가자 '{p}'은(는) 사실 공포 영화를 못 봅니다.", "이번 시즌 참가자 '{p}'은(는) 몰래 당신의 탈락에 걸었다는 소문이…",
    "이번 시즌 참가자 '{p}'은(는) 발냄새로 NPC를 쫓아낸 적이 있습니다.", "이번 시즌 참가자 '{p}'은(는) 당신의 프로필 사진을 저장해 두었습니다."
];
export function useCookie(pid, addFood) {
    const ps = ps_(pid), s = S();
    if (!(ps?.items?.fortune_cookie > 0)) return { ok: false, why: "포춘쿠키가 없습니다" };
    if (cookieUsedRound(pid)) return { ok: false, why: "포춘쿠키는 라운드당 1번만 먹을 수 있습니다" };
    ps.items.fortune_cookie--;
    ps.cookieRound = s.round;
    const others = aliveIds().filter(x => x !== +pid);
    const kind = pickOne(others.length ? ["lucky", "ominous", "silly", "gossip", "gossip"] : ["lucky", "ominous", "silly"]);
    let msg = pickOne({ lucky: LUCKY, ominous: OMINOUS, silly: SILLY, gossip: GOSSIP }[kind]);
    let about = null;
    if (kind === "gossip") { about = pickOne(others); msg = msg.replace("{p}", G.name(about)); }
    const food = addFood ? addFood(pid, 20) : 0;
    const cap = CONFIG.START_HP || 100, before = ps.hp;
    ps.hp = Math.min(cap, ps.hp + 10);
    G.log(`🥠 ${G.name(pid)} 포춘쿠키: "${msg}"`);
    Store.saveSeason(true);
    return { ok: true, kind, msg, about, food, hp: ps.hp - before };
}

// ================================================================ 🛒 Fortune Teller shop
export function buyFortune(pid, itemId) {
    const ps = ps_(pid), price = itemId === "tarot_card" ? TAROT_PRICE : itemId === "fortune_cookie" ? COOKIE_PRICE : 0;
    if (!ps || !price) return { ok: false, why: "상품을 고르세요" };
    if (itemId === "tarot_card" && (tarotUsed(pid) || ps.items.tarot_card > 0)) return { ok: false, why: "타로카드는 시즌당 1번만 이용할 수 있습니다" };
    if (wallet(ps) < price) return { ok: false, why: `골드 부족 (${price.toLocaleString()}G)` };
    payGold(ps, price);
    ps.items[itemId] = (ps.items[itemId] || 0) + 1;
    G.log(`🔮 ${G.name(pid)} Fortune Telling Shop에서 ${ITEM_BY_ID[itemId].name} 구입 (${price.toLocaleString()}G)`);
    Store.saveSeason(true);
    return { ok: true };
}
