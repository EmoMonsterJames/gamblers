// =====================================================================
// 🏅 Honorarium corners — only for players with a past TOP N finish.
//   top10 · top6 · top3 · winner. A map gets them through `loc.honor`
//   (an array of these ids, set in 🌍 지역·맵 관리).
// The Top 6 wheel and the Top 3 boxes are admin-editable
// (Store.maps.honor = { wheel: [...], box: [...] }).
// prize: { label, kind: "gold" | "item" | "none", gold, item, weight }
// =====================================================================
import { Store } from "../core/store.js";

export const HONOR_KINDS = {
    top10: { id: "top10", name: "TOP 10 Honorarium", emoji: "🎖️", rank: 10, uses: 2, color: "#60a5fa",
        msg: "Here is the honor cash, my fellow Top 10 Buddy", reward: "200~1,000G 사례금" },
    top6: { id: "top6", name: "TOP 6 Honorarium", emoji: "🎡", rank: 6, uses: 2, color: "#a78bfa",
        msg: "Here is the honor wheel, my fellow Top 6 Buddy", reward: "TOP6 Honor Wheel 1회" },
    top3: { id: "top3", name: "TOP 3 Honorarium", emoji: "🎁", rank: 3, uses: 2, color: "#f472b6",
        msg: "Here is the honor box, my fellow Top 3 Buddy", reward: "TOP3 Honor Box 1개 선택" },
    winner: { id: "winner", name: "Winners Honorarium", emoji: "👑", rank: 1, uses: 1, color: "#fbbf24",
        msg: "You can always win anytime", reward: "돈뭉치 5,000G + Winner Anvil (최대 100,000G)" }
};
export const HONOR_ALL = Object.keys(HONOR_KINDS);
export const honorKinds = loc => Array.isArray(loc?.honor) ? loc.honor.filter(k => HONOR_KINDS[k]) : [];
// the selected buddy's thank-you gold
export const HONOR_BUDDY_GOLD = 100;

const gold = (g, weight) => ({ label: `${g.toLocaleString("en-US")}G`, kind: "gold", gold: g, weight });
const item = (label, id, weight) => ({ label, kind: "item", item: id, weight });
const none = weight => ({ label: "꽝", kind: "none", weight });

// weights are relative (shown as % of the total)
export const DEFAULT_WHEEL = [
    gold(500, 20), gold(1000, 16), item("HP약 (+10)", "hp_10", 5),
    item("알파벳권 (H)", "card_H", 6), item("알파벳권 (O)", "card_O", 6), item("알파벳권 (N)", "card_N", 6),
    item("알파벳카드 (R)", "card_R", 1), none(30), gold(2000, 6), gold(3000, 3), gold(5000, 1)
];
export const DEFAULT_BOX = [
    item("HP약 (+10)", "hp_10", 5), none(30), item("랜덤알파벳권", "random_letter", 3),
    gold(2000, 18), gold(3000, 14), gold(5000, 9), gold(10000, 4),
    item("산소통", "oxygen", 6), item("우주복", "space_suit", 6), item("날개", "wings", 5)
];
export const honorPrizes = which => {
    const list = Store.maps?.honor?.[which];
    return Array.isArray(list) && list.length ? list : which === "wheel" ? DEFAULT_WHEEL : DEFAULT_BOX;
};
export function drawPrize(list) {
    const total = list.reduce((a, p) => a + Math.max(0, +p.weight || 0), 0);
    if (total <= 0) return list[Math.floor(Math.random() * list.length)];
    let r = Math.random() * total;
    for (const p of list) { r -= Math.max(0, +p.weight || 0); if (r < 0) return p; }
    return list[list.length - 1];
}

// 👑 Winners: 5,000G to start, then 2~6 anvils. Anvil k adds ANVIL_ADDS[k]
// → 2: 20,000 · 3: 35,000 · 4: 55,000 · 5: 75,000 · 6: 100,000G
export const WINNER_START = 5000;
export const ANVIL_ADDS = [5000, 10000, 15000, 20000, 20000, 25000];
export const ANVIL_ODDS = [[2, 35], [3, 28], [4, 18], [5, 12], [6, 7]];
export function rollAnvils() {
    let r = Math.random() * ANVIL_ODDS.reduce((a, [, w]) => a + w, 0);
    for (const [n, w] of ANVIL_ODDS) { r -= w; if (r < 0) return n; }
    return 2;
}
export const anvilTotal = n => WINNER_START + ANVIL_ADDS.slice(0, n).reduce((a, b) => a + b, 0);
