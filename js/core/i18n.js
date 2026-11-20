// =====================================================================
// 🌐 EN / KO toggle. The game is written in Korean; in English mode a
// MutationObserver rewrites every Korean text node (and title /
// placeholder attributes) through the dictionary below:
//   1. whole-string matches (EXACT)  2. phrase / word swaps (PHRASES, longest first)
// Text that no entry covers stays Korean — add entries here to extend it.
// Switching language reloads the page (KO = the original text, untouched).
// =====================================================================
const KEY = "gamblers.lang";
export const lang = () => { try { return localStorage.getItem(KEY) === "en" ? "en" : "ko"; } catch { return "ko"; } };
export function setLang(l) { try { localStorage.setItem(KEY, l); } catch { /* private mode */ } location.reload(); }

const EXACT = {
    "시즌": "Season", "플레이어": "Players", "지도": "Map", "슬롯도감": "Slot Dex", "명예의 전당": "Hall of Fame", "시즌 요약": "Season Summary",
    "연습실": "Practice", "방법": "How to Play", "☁ 저장중": "☁ Saving", "☁ 읽기전용": "☁ Read-only", "💾 로컬": "💾 Local",
    "확인": "OK", "취소": "Cancel", "닫기": "Close", "구매": "Buy", "사용": "Use", "작성": "Post", "진화": "Evolve", "이동하기": "Move",
    "⏸ 일시정지": "⏸ Pause", "▶ 재개": "▶ Resume", "⏹ 턴 종료": "⏹ End Turn", "턴을 종료할까요?": "End this turn?",
    "🎰 게임": "🎰 Games", "🎒 인벤토리": "🎒 Inventory", "🪪 프로필": "🪪 Profile", "🏦 대출": "🏦 Loan", "🏦 대출 상환": "🏦 Repay Loan",
    "💪 돈벌기": "💪 Earn", "💼 직업": "💼 Job", "🥺 구걸": "🥺 Beg", "🏷️ 할인 상점": "🏷️ Discount Shop", "📖 EmoMon Dex": "📖 EmoMon Dex",
    "💬 커뮤니티": "💬 Community", "🏟️ 아레나": "🏟️ Arena", "⛓️ 납치 공간": "⛓️ Kidnap Room",
    "보유금액": "Money", "포인트": "Points", "남은 횟수": "Plays Left", "슬롯 손익": "Slot P/L", "카지노 손익": "Casino P/L",
    "이번 턴 포인트": "Points This Turn", "보너스 / 잭팟": "Bonus / Jackpot", "펫 없음": "No pet",
    "🌍 지역 룰렛 돌리기": "🌍 Spin the Region Roulette", "🌍 턴 시작 — 지역 뽑기": "🌍 Start Turn — Pick a Region", "턴 건너뛰기": "Skip Turn",
    "📜 미션 뽑기": "📜 Draw a Mission", "✅ 미션 달성!": "✅ Mission complete!", "🎉 미션 성공!": "🎉 Mission success!", "💦 미션 실패…": "💦 Mission failed…",
    "다음 ▶": "Next ▶", "입장 허가!": "Entry allowed!", "입장 거절!": "Entry refused!", "들어가기 ▶": "Enter ▶", "다른 맵 뽑기 ▶": "Pick another map ▶",
    "🎡 죽음의 휠 돌리기": "🎡 Spin the Wheel of Death", "입장하기 ▶": "Enter ▶", "🚪 무사히 입장!": "🚪 Entered safely!",
    "경고: 당신은 가장 위험한 지역으로 입장합니다": "Warning: you are entering the most dangerous region",
    "☠️ 경고": "☠️ Warning", "💡 이모몬스터 도움을 받았다": "💡 An EmoMon helped you",
    "⛓️ 테러리스트 납치 공간": "⛓️ Terrorist Kidnap Room", "🌟 희망이 보인다!!": "🌟 I see hope!!", "희망이 보인다!!": "I see hope!!",
    "🕊️ 탈출 성공!": "🕊️ Escaped!", "⛓️ 탈출 실패": "⛓️ Escape failed", "☠️ 처형": "☠️ Executed", "탈출 확률표": "Escape odds",
    "🛍️ 커뮤니티 상점": "🛍️ Community Shop", "커뮤니티 입장 거절!": "Community door closed!",
    "이번 시즌 작성 완료": "Posted this season", "기본 (흰색)": "Default (white)", "사용 안 함": "None",
    "🏟️ 아레나 승리!": "🏟️ Arena victory!", "⚔ 배틀!": "⚔ Battle!", "⚔️ 패배…": "⚔️ Defeat…",
    "🐾 내 EmoMon": "🐾 My EmoMon", "확장 슬롯": "Extra Slot", "진화 없음 (최종 단계)": "No evolution (final stage)", "⚠️ 치료 필요": "⚠️ Needs treatment",
    "🔬 특수 진화 · 합체": "🔬 Special Evolution · Fusion", "🧬 합체!": "🧬 Fuse!", "🔬 진화!": "🔬 Evolve!", "✨ 진화!": "✨ Evolve!",
    "몬스터가 없습니다": "No monsters", "특성 없음": "No traits", "🎒 사용하기": "🎒 Use", "⚔ 배틀 몬스터로 지정": "⚔ Set as battle monster",
    "⚔ BATTLE MONSTER": "⚔ BATTLE MONSTER", "🛡️ No NPC": "🛡️ No NPC", "⚠️ NPC 출몰": "⚠️ NPC zone", "⚠️ NPC 습격!": "⚠️ NPC attack!", "✨ NPC 등장!": "✨ NPC appears!",
    "⏰ TIME UP!": "⏰ TIME UP!", "🥶 저주받은 카지노": "🥶 Cursed Casino", "🧳 상점 보기": "🧳 Open shop"
};
// phrase / word swaps — applied longest first inside any Korean text
const PHRASES = {
    // places / regions
    "카지노 랜드": "Casino Land", "하늘나라": "Sky Kingdom", "우주": "Space", "심해": "Deep Sea", "북극": "North Pole", "랜덤랜드": "Random Land", "리치랜드": "Rich Land",
    "제한구역": "Restricted Zone", "사막": "Desert", "콤보랜드": "Combo Land",
    // people / things
    "플레이어": "player", "몬스터": "monster", "이모몬스터": "EmoMonster", "이모몬": "EmoMon", "배틀": "battle", "펫 이펙트": "pet effect", "스페셜 펫": "special pet", "펫": "pet",
    "무기": "weapon", "특성": "trait", "속성": "attribute", "아이템": "item", "상점": "shop", "일반 상점": "General Shop", "포인트 상점": "Point Shop",
    "맵권": "map pass", "출입권": "entry pass", "입장료": "entry fee", "입장": "entry", "탈출": "escape", "납치": "kidnap", "테러리스트": "terrorist",
    "독감치료제": "Flu Cure", "암치료제": "Cancer Cure", "독감": "flu", "암": "cancer", "질병": "disease", "상태이상": "status effect", "치료": "treatment",
    "이모몬스터 슬롯 확장권": "EmoMon Slot Ticket", "슬롯": "slot", "카지노게임": "casino game", "카지노": "casino", "잭팟": "jackpot", "보너스": "bonus",
    "골드": "gold", "포인트": "points", "미션": "mission", "라운드": "round", "시즌": "season", "턴": "turn", "탈락": "eliminated", "사망": "death", "우승": "win",
    "커뮤니티": "community", "코멘트": "comment", "아레나": "arena", "당 수치": "sugar level", "설탕중독": "sugar addiction", "바로사망": "instant death",
    "죽음의 휠": "Wheel of Death", "희망 상자": "hope box", "우주괴물": "Space Monster", "사악한 꼬마": "Evil Kid", "죽음의손": "Death Hand", "거지가족": "Beggar Family",
    "죽음의 사신": "Grim Reaper", "악어": "Crocodile", "거지": "Beggar", "엔젤": "Angel", "사무라이": "Samurai", "할머니": "Granny", "마법사": "Wizard", "로봇": "Robot", "햄스터": "Hamster", "보따리상인": "Peddler",
    // verbs / UI
    "남은 시간": "time left", "남은": "left", "보유": "owned", "사용하기": "use", "사용": "use", "구매": "buy", "판매": "sell", "획득": "gained", "회복": "heal", "강탈": "stolen",
    "공격": "attack", "즉사": "instant death", "효과 없음": "no effect", "확률": "chance", "성공": "success", "실패": "fail", "승리": "win", "패배": "loss",
    "필요": "required", "부족": "not enough", "전용": "only", "무료": "free", "최대": "max", "기본": "basic", "합체": "fusion", "진화": "evolution",
    "이번 라운드": "this round", "이번 시즌": "this season", "시즌당": "per season", "라운드당": "per round", "턴마다": "each turn",
    "월드 맵": "World Map", "지역": "region", "맵": "map", "경고": "warning", "위험": "danger", "어둠": "darkness", "마그마": "magma", "저주": "curse"
};
let KEYS = Object.keys(PHRASES).sort((a, b) => b.length - a.length);
const HANGUL = /[가-힣]/;
const cache = new Map();
// ---- i18n/en.tsv: the full sentence list (Korean<TAB>English, made by tools/i18n_extract.awk).
// {0} {1} … stand for values the game fills in (names, numbers…) — matched as wildcards.
const DICT = new Map();      // whole sentences
let PATS = [];               // sentences with {n}: { re, en, key }
let SUBS = [];               // fallback: sentences / words swapped inside longer text, longest first
const unesc = s => s.replace(/\\(n|t|"|'|`|\\)/g, (_, c) => ({ n: "\n", t: "\t" }[c] || c));
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function loadDict() {
    let text = "";
    try { const r = await fetch("i18n/en.tsv", { cache: "no-cache" }); if (r.ok) text = await r.text(); } catch { return; }
    for (const line of text.split(/\r?\n/)) {
        if (!line || line[0] === "#") continue;
        const tab = line.indexOf("\t");
        if (tab < 0) continue;
        const ko = unesc(line.slice(0, tab)).trim(), en = unesc(line.slice(tab + 1)).trim();
        if (!ko || !en || !HANGUL.test(ko)) continue;
        if (/\{\d+\}/.test(ko)) {
            const parts = ko.split(/\{\d+\}/);
            PATS.push({ re: new RegExp("^" + parts.map(reEsc).join("([\\s\\S]+?)") + "$"), en, key: parts.reduce((a, b) => b.length > a.length ? b : a, "").trim(), n: parts.join("").length });
        } else DICT.set(ko, en);
    }
    PATS.sort((a, b) => b.n - a.n);
    SUBS = [...DICT.keys()].filter(k => k.length >= 2).sort((a, b) => b.length - a.length);
}
function tr(s) {
    if (!HANGUL.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    const t = s.trim();
    let out;
    if (DICT.has(t)) out = s.replace(t, DICT.get(t));
    else if (EXACT[t]) out = s.replace(t, EXACT[t]);
    else {
        let m = null;
        const p = PATS.find(p => t.includes(p.key) && (m = p.re.exec(t)));
        if (p) out = s.replace(t, p.en.replace(/\{(\d+)\}/g, (_, i) => tr(m[+i + 1] ?? "")));
        else {
            out = s;
            for (const k of SUBS) if (out.includes(k)) out = out.split(k).join(DICT.get(k));
            for (const k of KEYS) if (out.includes(k)) out = out.split(k).join(PHRASES[k]);
        }
    }
    // Korean particles left dangling after a swap (을/를/이/가/은/는/의/에/으로/로) — drop the common ones glued to Latin text
    out = out.replace(/([A-Za-z0-9)%])(을|를|이|가|은|는|의|에서|에|으로|로)(?=[\s.,!?)]|$)/g, "$1");
    // last resort: no Hangul may stay on screen in EN mode — anything left is romanized (덩이 → Deongi)
    if (HANGUL.test(out)) out = out.replace(/[가-힣]+/g, romanize);
    if (cache.size > 5000) cache.clear();
    cache.set(s, out);
    return out;
}
// Revised Romanization of a Hangul word (syllable by syllable, simple liaison) — "Capitalized"
const RR_I = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const RR_V = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const RR_F = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
const RR_FV = ["", "g", "kk", "ks", "n", "nj", "nh", "d", "r", "lg", "lm", "lb", "ls", "lt", "lp", "lh", "m", "b", "ps", "s", "ss", "ng", "j", "ch", "k", "t", "p", "h"]; // before a vowel
function romanize(word) {
    let out = "";
    const cs = [...word].map(ch => { const c = ch.charCodeAt(0) - 0xAC00; return { i: Math.floor(c / 588), v: Math.floor(c % 588 / 28), f: c % 28 }; });
    cs.forEach((x, k) => {
        const next = cs[k + 1];
        out += RR_I[x.i] + RR_V[x.v] + (next && next.i === 11 ? RR_FV[x.f] : RR_F[x.f]);
    });
    return out.charAt(0).toUpperCase() + out.slice(1);
}
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"]);
const written = new WeakMap();
function fixNode(n) {
    if (n.nodeType === 3) {
        if (!n.nodeValue || written.get(n) === n.nodeValue || SKIP.has(n.parentNode?.nodeName) || n.parentNode?.closest?.("[data-no-i18n]")) return;
        const v = tr(n.nodeValue);
        written.set(n, v);
        if (v !== n.nodeValue) n.nodeValue = v;
    } else if (n.nodeType === 1 && !SKIP.has(n.nodeName)) {
        for (const a of ["title", "placeholder", "aria-label"]) { const v = n.getAttribute?.(a); if (v && HANGUL.test(v)) n.setAttribute(a, tr(v)); }
        if (n.nodeName === "TEXTAREA" || n.nodeName === "INPUT") { const p = n.getAttribute("placeholder"); if (p && HANGUL.test(p)) n.setAttribute("placeholder", tr(p)); return; }
        const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let c = w.nextNode();
        while (c) { if (c.nodeType === 3) fixNode(c); else for (const a of ["title", "placeholder"]) { const v = c.getAttribute?.(a); if (v && HANGUL.test(v)) c.setAttribute(a, tr(v)); } c = w.nextNode(); }
    }
}
// extra: [[korean, english], …] from game data (region names, …)
export async function startI18n(extra = []) {
    for (const [k, v] of extra) if (k && v && HANGUL.test(k) && !PHRASES[k]) PHRASES[k] = v;
    KEYS = Object.keys(PHRASES).sort((a, b) => b.length - a.length);
    document.documentElement.lang = lang();
    if (lang() !== "en") return;
    await loadDict();
    fixNode(document.body);
    new MutationObserver(recs => {
        for (const r of recs) {
            if (r.type === "characterData") fixNode(r.target);
            else for (const n of r.addedNodes) fixNode(n);
        }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    // native confirm / alert texts are not DOM — nothing to do; every game dialog is a DOM modal
}
