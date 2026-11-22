// =====================================================================
// 🧬 종족 = 카테고리 › 서브카테고리. The player's `ethnicity` field holds the SUBCATEGORY (the game uses it:
// 햇살 상점 Smile · Dungi 시즌 · 같은 종족 친밀도 …). A category without subcategories is its own subcategory.
// Categories marked `typed` also take a typed-in subcategory (saved in settings "maps".raceSubs so it is
// offered again next time). "Others" is typed only, and its picture stays No Image until it is ordered.
// =====================================================================
import { Store } from "../core/store.js";

export const RACE_CATEGORIES = [
    { id: "Human Form", emoji: "🧑", subs: ["Human", "Emo", "Emobu", "Angel", "Devil", "Goblin", "Jiangshi", "Invisible"] },
    { id: "Main Animal", emoji: "🐰", subs: ["Rabbit", "Bunny", "Bear", "Teddy", "Rat", "Cat"] },
    { id: "Other Animal", emoji: "🐾", typed: true, subs: ["Dog", "Bird", "Hippo", "Lion", "Tiger", "Horse", "Pig", "Dolphin", "Panda", "Kangaroo", "Fox", "Snake", "Giraffe"] },
    { id: "Kalisto", emoji: "🐊", subs: [] },
    { id: "Cloud", emoji: "☁️", subs: [] },
    { id: "Ghost", emoji: "👻", subs: [] },
    { id: "Smile", emoji: "😊", subs: [] },
    { id: "Shape", emoji: "🔷", subs: ["Square", "Triangle", "Donglee", "Rectangle", "Trapezoid", "Rhombus"] },
    { id: "Other Shape", emoji: "⬡", typed: true, subs: ["Oval", "Hexagon", "Pacman", "Pentagon"] },
    { id: "Ant", emoji: "🐜", subs: [] },
    { id: "Bug", emoji: "🐞", typed: true, subs: ["잠자리", "메뚜기", "사마귀", "노린재", "지렁이", "송충이", "나비", "나방", "파리", "모기", "지네", "거미", "전갈", "무당벌레"] },
    { id: "Fruit", emoji: "🍎", typed: true, subs: ["귤", "바나나", "체리", "포도", "사과", "딸기", "수박", "레몬", "블루베리", "복숭아", "오렌지", "두리안", "용과", "배", "망고", "멜론", "파인애플", "코코넛", "키위"] },
    { id: "Veggie", emoji: "🥕", typed: true, subs: ["오이", "토마토", "양파", "콩나물", "감자", "마늘", "당근", "배추", "무우", "가지", "버섯", "호박", "애호박", "파프리카", "아티초크", "옥수수", "브뤼셀스프라우트", "아보카도", "브로콜리", "비트", "시금치", "칼리플라워", "셀러리", "고추", "고구마", "콩", "애스파라거스", "콜라비", "올리브"] },
    { id: "Flower", emoji: "🌸", typed: true, subs: ["벚꽃", "튤립", "수선화", "유채꽃", "장미", "목련", "철쭉", "진달래", "해바라기", "백합", "라벤더", "나팔꽃", "맨드라미", "코스모스", "국화", "동백꽃", "연꽃", "카네이션", "끈끈이주걱", "벌레잡이통발", "파리지옥"] },
    // 🐰 Dungi is a race the players already have (Dungi 시즌) — kept as its own category without subcategories
    { id: "Dungi", emoji: "🐰", subs: [] },
    { id: "Others", emoji: "❓", typed: true, subs: [] }
];
export const RACE_CAT = Object.fromEntries(RACE_CATEGORIES.map(c => [c.id, c]));
const low = s => String(s || "").trim().toLowerCase();

// typed-in subcategories, per category
export const customSubs = cat => [...new Set((Store.maps?.raceSubs?.[cat] || []).filter(Boolean))];
export const subsOf = cat => { const c = RACE_CAT[cat]; return c ? [...new Set([...c.subs, ...customSubs(cat)])] : []; };
export async function addCustomSub(cat, sub) {
    sub = String(sub || "").trim();
    if (!sub || !RACE_CAT[cat]?.typed || subsOf(cat).some(x => low(x) === low(sub))) return;
    const rs = { ...(Store.maps?.raceSubs || {}) };
    rs[cat] = [...(rs[cat] || []), sub];
    await Store.saveMaps({ ...(Store.maps || {}), raceSubs: rs });
}
// the category a subcategory (= player ethnicity) belongs to. Old values that name a category stay there
// (Bug / Fruit / Veggie …), anything unknown counts as Others.
export function categoryOf(eth) {
    const e = low(eth);
    if (!e) return "Human Form";
    if (e === "trepezoid") return "Shape";
    for (const c of RACE_CATEGORIES) if (low(c.id) === e || subsOf(c.id).some(s => low(s) === e)) return c.id;
    return "Others";
}
// what the image generator draws for a subcategory (ui/avatarGen.js race ids) + the preset key (o.sub)
const DRAW = {
    human: "human", emo: "other", emobu: "other", angel: "angel", devil: "devil", goblin: "goblin", jiangshi: "jiangshi", invisible: "invisible",
    rabbit: "rabbit", bunny: "bunny", bear: "bear", teddy: "teddy", rat: "rat", cat: "cat",
    kalisto: "kalisto", cloud: "cloud", ghost: "ghost", smile: "smile", ant: "ant", dungi: "dungi",
    square: "square", triangle: "triangle", donglee: "donglee", rectangle: "rectangle", trapezoid: "trapezoid", trepezoid: "trapezoid", rhombus: "rhombus",
    oval: "oval", hexagon: "hexagon", pacman: "pacman", pentagon: "pentagon"
};
const BY_CAT = { "Other Animal": "animal", "Other Shape": "shape", Bug: "bug", Fruit: "fruit", Veggie: "veggie", Flower: "flower", Others: "noimage" };
export function drawRace(eth) {
    const e = low(eth), cat = categoryOf(eth);
    if (cat === "Other Animal" && ["dog", "bird", "hippo", "lion", "tiger", "horse", "pig", "dolphin", "panda", "kangaroo", "fox", "snake", "giraffe"].includes(e)) return { race: e, sub: eth };
    if (DRAW[e]) return { race: DRAW[e], sub: eth };
    return { race: BY_CAT[cat] || "other", sub: eth };
}
