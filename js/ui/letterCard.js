// Alphabet card icon: a small playing card with its own letter and colour
// (G A M B L E R S), used in shops, the bag and drops.
import { h } from "../core/util.js";

export const LETTER_COLORS = {
    G: ["#facc15", "#a16207"], A: ["#f87171", "#991b1b"], M: ["#a78bfa", "#5b21b6"], B: ["#38bdf8", "#075985"],
    L: ["#4ade80", "#166534"], E: ["#fb923c", "#9a3412"], R: ["#f472b6", "#9d174d"], S: ["#2dd4bf", "#115e59"]
};

export function letterCard(L, size = 48) {
    const [c1, c2] = LETTER_COLORS[L] || ["#e2e8f0", "#475569"];
    return h("span.letter-card", { style: { "--c1": c1, "--c2": c2, "--sz": size + "px" }, title: `알파벳 카드 ${L}` },
        h("i.lc-corner", L), h("b", L), h("i.lc-corner.br", L));
}
