// Alphabet card icon: a small playing card with its own letter and colour
// (G A M B L E R S), used in shops, the bag and drops. The other 18
// letters (알파벳권) use their circled icon (Ⓒ Ⓓ Ⓕ …).
import { h } from "../core/util.js";

export const LETTER_COLORS = {
    G: ["#facc15", "#a16207"], A: ["#f87171", "#991b1b"], M: ["#a78bfa", "#5b21b6"], B: ["#38bdf8", "#075985"],
    L: ["#4ade80", "#166534"], E: ["#fb923c", "#9a3412"], R: ["#f472b6", "#9d174d"], S: ["#2dd4bf", "#115e59"]
};
const circled = l => String.fromCodePoint(0x24B6 + l.charCodeAt(0) - 65);

export function letterCard(L, size = 48) {
    if (!LETTER_COLORS[L]) {
        const hue = (L.charCodeAt(0) - 65) * 360 / 26;
        return h("span.letter-circ", { style: { "--sz": size + "px", "--hue": hue }, title: `알파벳권 ${L}` }, circled(L));
    }
    const [c1, c2] = LETTER_COLORS[L];
    return h("span.letter-card", { style: { "--c1": c1, "--c2": c2, "--sz": size + "px" }, title: `알파벳 카드 ${L}` },
        h("i.lc-corner", L), h("b", L), h("i.lc-corner.br", L));
}

// green "NPC" ticket (NPC 공격 Block 권)
export function npcTicket(n, size = 58) {
    return h("span.npc-ticket", { style: { "--sz": size + "px" }, title: `NPC 공격 Block 권 ${n}회` }, h("b", "NPC"), h("small", `×${n}`));
}
