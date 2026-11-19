// =====================================================================
// 🍚 Food icons. Simple foods use their emoji; the made-up ones are drawn
// here as small inline SVGs (찌 · 떠귀 · 꼬롱살 · 꼬밀 · 라이스타워 · 똥주 ·
// the chip bags · 쫑지 · 보송이 김치 · 투명주스 · the noodle bowls …).
//   foodArt(foodId, size) → element
// =====================================================================
import { h } from "../core/util.js";
import { FOOD_BY_ID } from "../data/life.js";
import { Store } from "../core/store.js";

const svg = (inner, vb = "0 0 64 64") => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
// a snack bag with its name and a drawing on it
const bag = (label, c1, c2, drawing) => svg(`
  <path d="M14 8 L50 8 L54 14 L52 58 L12 58 L10 14 Z" fill="${c1}" stroke="#0006" stroke-width="1.5"/>
  <path d="M10 14 L54 14" stroke="#fff8" stroke-width="2" stroke-dasharray="3 2"/>
  <rect x="14" y="17" width="36" height="12" rx="3" fill="${c2}"/>
  <text x="32" y="26.5" font-size="8.5" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">${label}</text>
  ${drawing}
  <path d="M14 8 L18 4 L46 4 L50 8" fill="${c2}" stroke="#0006" stroke-width="1"/>`);
// a bowl of noodles + toppings
const bowl = (soup, toppings) => svg(`
  <ellipse cx="32" cy="30" rx="26" ry="8" fill="${soup}"/>
  <path d="M10 30 Q20 34 30 30 T52 30" stroke="#fde68a" stroke-width="2.5" fill="none"/>
  <path d="M12 33 Q22 37 32 33 T54 32" stroke="#fef3c7" stroke-width="2" fill="none"/>
  ${toppings}
  <path d="M6 30 Q32 70 58 30 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
  <path d="M10 38 Q32 58 54 38" stroke="#ef4444" stroke-width="2.5" fill="none"/>
  <rect x="24" y="52" width="16" height="5" rx="2" fill="#cbd5e1"/>`);
const ART = {
    jji: svg(`<path d="M10 50 Q6 30 22 20 Q30 8 40 18 Q58 22 54 44 Q58 56 44 56 Q34 60 24 56 Q12 58 10 50Z" fill="#111" stroke="#000"/>
        <ellipse cx="24" cy="30" rx="6" ry="3" fill="#ffffff30"/><circle cx="26" cy="38" r="3.5" fill="#fff"/><circle cx="38" cy="38" r="3.5" fill="#fff"/>
        <circle cx="27" cy="39" r="1.6" fill="#000"/><circle cx="39" cy="39" r="1.6" fill="#000"/><path d="M8 52 Q4 58 10 60" stroke="#111" stroke-width="3" fill="none"/>
        <path d="M54 50 Q60 56 56 60" stroke="#111" stroke-width="3" fill="none"/>`),
    puseong: svg(`<path d="M32 58 Q30 40 14 26 Q10 12 24 14 Q30 20 32 34 Q34 18 42 10 Q56 10 50 26 Q40 40 32 58Z" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
        <path d="M32 56 L32 24 M32 40 L22 28 M32 38 L44 22" stroke="#bbf7d0" stroke-width="2" fill="none"/>`),
    ddeogwi: svg(`<circle cx="12" cy="32" r="9" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/><circle cx="10" cy="30" r="2.2" fill="#0f172a"/>
        <path d="M20 32 L50 32" stroke="#e2e8f0" stroke-width="3"/>
        ${[24, 30, 36, 42].map(x => `<path d="M${x} 32 L${x - 3} 22 M${x} 32 L${x - 3} 42" stroke="#e2e8f0" stroke-width="2.4"/>`).join("")}
        <path d="M50 32 L60 22 L58 32 L60 42 Z" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>`),
    kkorong: svg(`<path d="M14 40 Q10 22 28 16 Q46 12 52 26 Q54 36 44 38 Q38 40 34 34 Q30 30 26 36 Q22 44 14 40Z" fill="#fff7ed" stroke="#fdba74" stroke-width="2"/>
        <path d="M22 22 Q26 26 24 32 M30 18 Q34 24 32 30 M38 18 Q42 22 40 28" stroke="#fed7aa" stroke-width="2" fill="none"/>
        <path d="M14 40 L6 48 L12 50 L10 56 L18 48 Z" fill="#fb923c"/>`),
    minichicken: svg(`<g transform="translate(10 10) scale(.7)"><path d="M14 46 Q4 30 16 18 Q30 6 44 18 Q52 28 44 40 Q36 50 26 48 L20 56 Q14 60 12 54 Q8 52 14 46Z" fill="#d97706" stroke="#92400e" stroke-width="2.5"/>
        <path d="M18 52 L10 60" stroke="#fef3c7" stroke-width="6" stroke-linecap="round"/><circle cx="8" cy="62" r="4" fill="#fef3c7"/><circle cx="12" cy="64" r="4" fill="#fef3c7"/></g>`),
    carrot: svg(`<path d="M44 12 Q56 8 52 20" stroke="#16a34a" stroke-width="4" fill="none"/><path d="M42 10 Q46 2 50 10" stroke="#22c55e" stroke-width="4" fill="none"/>
        <path d="M46 18 Q50 26 40 34 L14 56 Q8 58 10 52 L32 22 Q38 14 46 18Z" fill="#ea580c" stroke="#9a3412" stroke-width="2"/>
        <path d="M20 46 L26 50 M26 38 L32 42 M32 30 L38 34" stroke="#431407" stroke-width="3" stroke-linecap="round"/>
        <path d="M18 54 Q14 46 22 44" stroke="#fed7aa80" stroke-width="2" fill="none"/>`),
    ricetower: svg(`${[0, 1, 2, 3, 4].map(i => `<ellipse cx="32" cy="${54 - i * 9}" rx="${20 - i * 2}" ry="6" fill="#f5deb3" stroke="#b45309" stroke-width="1.5"/>
        <ellipse cx="32" cy="${52 - i * 9}" rx="${16 - i * 2}" ry="3" fill="#fde68a"/>
        ${[-8, 0, 8].map(d => `<circle cx="${32 + d * (1 - i * .1)}" cy="${52 - i * 9}" r="1" fill="#b45309"/>`).join("")}`).join("")}
        <path d="M32 8 L34 4 L36 8" stroke="#facc15" stroke-width="2" fill="none"/>`),
    cola: svg(`<rect x="18" y="10" width="28" height="46" rx="5" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/><rect x="18" y="10" width="28" height="6" rx="3" fill="#cbd5e1"/>
        <path d="M18 34 Q32 26 46 34" stroke="#fff" stroke-width="3" fill="none"/><text x="32" y="48" font-size="8" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">COLA</text>`),
    water: svg(`<rect x="24" y="4" width="16" height="7" rx="2" fill="#1d4ed8"/><path d="M22 14 Q22 11 26 11 L38 11 Q42 11 42 14 L44 22 L44 56 Q44 60 40 60 L24 60 Q20 60 20 56 L20 22Z" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
        <rect x="20" y="30" width="24" height="12" fill="#0ea5e9"/><text x="32" y="39.5" font-size="7.5" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">WATER</text>
        <path d="M26 46 L26 54" stroke="#fff9" stroke-width="2.5" stroke-linecap="round"/>`),
    energydrink: svg(`<rect x="20" y="8" width="24" height="50" rx="5" fill="#111827" stroke="#facc15" stroke-width="2"/><rect x="20" y="8" width="24" height="6" rx="3" fill="#9ca3af"/>
        <path d="M34 18 L24 36 L32 36 L28 52 L40 30 L32 30 L36 18Z" fill="#facc15"/>`),
    ddongju: svg(`<path d="M27 4 L37 4 L37 16 Q46 22 46 32 L46 56 Q46 60 42 60 L22 60 Q18 60 18 56 L18 32 Q18 22 27 16Z" fill="#86efac" stroke="#15803d" stroke-width="2"/>
        <rect x="26" y="2" width="12" height="6" rx="1.5" fill="#15803d"/><rect x="20" y="34" width="24" height="18" rx="2" fill="#fff"/>
        <path d="M27 48 Q24 48 25 45 Q23 43 26 41 Q26 38 30 38 Q31 35 33 37 Q37 37 37 41 Q40 43 38 45 Q39 48 36 48Z" fill="#92400e"/>
        <text x="32" y="31" font-size="6" font-weight="900" text-anchor="middle" fill="#15803d" font-family="sans-serif">똥주</text>`),
    kongchip: bag("콩칩", "#65a30d", "#3f6212", `${[[22, 38], [32, 44], [42, 38], [26, 50], [38, 50]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.6" fill="#d9f99d" stroke="#365314" stroke-width="1.2"/><path d="M${x - 2} ${y} Q${x} ${y - 2} ${x + 2} ${y}" stroke="#365314" fill="none"/>`).join("")}`),
    bagettn: bag("바게튼", "#b45309", "#78350f", `${[0, 1, 2].map(i => `<rect x="${16 + i * 3}" y="${34 + i * 7}" width="30" height="5" rx="2.5" fill="#d97706" stroke="#78350f" stroke-width="1" transform="rotate(-8 32 ${36 + i * 7})"/>`).join("")}`),
    guraball: bag("구라볼", "#7c2d12", "#431407", `${[[22, 42], [36, 40], [29, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#a16207" stroke="#422006" stroke-width="1.4"/><circle cx="${x - 2}" cy="${y - 2}" r="1.6" fill="#fde68a"/>`).join("")}`),
    jjongji: svg(`<ellipse cx="32" cy="46" rx="26" ry="10" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
        <path d="M14 42 Q18 26 30 30 Q34 20 44 28 Q54 30 50 42 Q32 50 14 42Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>
        <path d="M20 38 Q26 32 32 36 M34 32 Q40 30 46 36" stroke="#fde68a" stroke-width="2" fill="none"/><path d="M26 30 Q28 24 32 26" stroke="#16a34a" stroke-width="3" fill="none"/>`),
    bosongkimchi: svg(`<rect x="12" y="18" width="40" height="40" rx="6" fill="#fef3c7" stroke="#b45309" stroke-width="2"/><rect x="10" y="10" width="44" height="10" rx="3" fill="#b45309"/>
        <rect x="14" y="12" width="36" height="3" fill="#facc15"/><path d="M16 30 Q24 24 32 30 T48 30 L48 52 L16 52Z" fill="#dc2626"/>
        <rect x="18" y="34" width="28" height="12" rx="3" fill="#fff" stroke="#facc15"/><text x="32" y="43" font-size="6.5" font-weight="900" text-anchor="middle" fill="#b91c1c" font-family="sans-serif">보송이</text>
        <path d="M24 10 L26 4 L28 10 M36 10 L38 4 L40 10" stroke="#facc15" stroke-width="1.5" fill="none"/>`),
    clearjuice: svg(`<path d="M18 12 L46 12 L42 58 L22 58Z" fill="#e0f2fe55" stroke="#7dd3fc" stroke-width="2"/><path d="M20 22 L44 22 L41 56 L23 56Z" fill="#bae6fd40"/>
        <path d="M26 44 Q26 32 32 32 Q38 32 38 44 L36 42 L34 44 L32 42 L30 44 L28 42Z" fill="#fff" stroke="#94a3b8" stroke-width="1"/><circle cx="30" cy="37" r="1.2"/><circle cx="34" cy="37" r="1.2"/>
        <path d="M38 12 L44 2" stroke="#f472b6" stroke-width="3" stroke-linecap="round"/>`),
    antnoodle: bowl("#a16207", `<path d="M24 26 Q20 10 12 6" stroke="#111" stroke-width="2.5" fill="none"/><path d="M40 26 Q44 10 52 6" stroke="#111" stroke-width="2.5" fill="none"/>
        <circle cx="12" cy="6" r="3" fill="#111"/><circle cx="52" cy="6" r="3" fill="#111"/><ellipse cx="32" cy="28" rx="8" ry="3" fill="#65a30d"/>`),
    pinenoodle: bowl("#ca8a04", `${[16, 24, 32, 40, 48].map((x, i) => `<path d="M${x} ${28 - (i % 2) * 2} l${i % 2 ? 6 : -6} -8" stroke="#166534" stroke-width="2.2" stroke-linecap="round"/>`).join("")}`),
    shapecookie: svg(`<path d="M10 52 L22 30 L34 52Z" fill="#f59e0b" stroke="#92400e" stroke-width="2"/><rect x="34" y="34" width="20" height="20" rx="2" fill="#fb923c" stroke="#9a3412" stroke-width="2"/>
        <circle cx="30" cy="20" r="11" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>${[[27, 17], [33, 21], [26, 23], [42, 40], [47, 47], [20, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#78350f"/>`).join("")}`),
    sunshine: svg(`<defs><radialGradient id="sg"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fde047"/><stop offset="1" stop-color="#fde04700"/></radialGradient></defs>
        <circle cx="32" cy="24" r="22" fill="url(#sg)"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="31" y="0" width="2" height="9" fill="#facc15" transform="rotate(${a} 32 24)"/>`).join("")}
        <path d="M12 34 L52 34 L48 58 L16 58Z" fill="#fef3c7" stroke="#ca8a04" stroke-width="2"/><path d="M12 34 L20 26 L44 26 L52 34" fill="#fde68a" stroke="#ca8a04" stroke-width="2"/>
        <circle cx="32" cy="34" r="7" fill="#facc15"/>`),
    energybar: svg(`<rect x="6" y="24" width="52" height="16" rx="4" fill="#7c2d12" stroke="#431407" stroke-width="2" transform="rotate(-12 32 32)"/>
        <rect x="20" y="24" width="24" height="16" fill="#facc15" transform="rotate(-12 32 32)"/><path d="M34 26 L28 33 L33 33 L30 39 L37 31 L32 31Z" fill="#7c2d12"/>`),
    yogurt: svg(`<path d="M14 22 L50 22 L46 56 Q46 60 42 60 L22 60 Q18 60 18 56Z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="12" y="16" width="40" height="7" rx="3" fill="#f472b6"/>
        <path d="M18 34 L47 34" stroke="#f9a8d4" stroke-width="5"/><circle cx="26" cy="46" r="3" fill="#a855f7"/><circle cx="36" cy="48" r="3" fill="#ef4444"/>`),
    creambread: svg(`<ellipse cx="32" cy="38" rx="26" ry="16" fill="#d97706" stroke="#92400e" stroke-width="2"/><ellipse cx="32" cy="34" rx="22" ry="11" fill="#f59e0b"/>
        <path d="M14 36 Q32 50 50 36" stroke="#fffbeb" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="24" cy="28" r="1.5" fill="#fef3c7"/><circle cx="38" cy="27" r="1.5" fill="#fef3c7"/>`),
    feast: svg(`<rect x="2" y="40" width="60" height="8" rx="3" fill="#92400e"/><rect x="8" y="48" width="6" height="12" fill="#78350f"/><rect x="50" y="48" width="6" height="12" fill="#78350f"/>
        <ellipse cx="32" cy="38" rx="22" ry="6" fill="#f8fafc" stroke="#cbd5e1"/><path d="M22 36 Q22 20 34 20 Q46 22 42 36Z" fill="#d97706" stroke="#92400e" stroke-width="1.5"/>
        <circle cx="12" cy="36" r="5" fill="#22c55e"/><circle cx="52" cy="36" r="5" fill="#ef4444"/><circle cx="16" cy="32" r="3" fill="#fb923c"/><circle cx="48" cy="31" r="3" fill="#a3e635"/>
        <path d="M42 24 L50 16" stroke="#fef3c7" stroke-width="4" stroke-linecap="round"/>`)
};
// 🍱 꼬밀: a meal-kit box with 뽀동이's picture stuck on like a sticker
function kkomeal(size) {
    const bbo = Store.allPlayers?.find(p => p.name_ko === "뽀동이" || p.player_name === "Bbodongi");
    const box = h("span.fa-svg", { html: svg(`<rect x="6" y="18" width="52" height="40" rx="5" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
        <rect x="6" y="18" width="52" height="10" fill="#f59e0b"/><rect x="4" y="12" width="56" height="9" rx="3" fill="#b45309"/>
        <text x="20" y="50" font-size="9" font-weight="900" text-anchor="middle" fill="#7c2d12" font-family="sans-serif">꼬밀</text>
        <path d="M10 32 Q16 28 22 32 T34 32" stroke="#fff7ed" stroke-width="2" fill="none"/><ellipse cx="18" cy="40" rx="6" ry="3" fill="#fff7ed" stroke="#fdba74"/>`) });
    const sticker = h("img.fa-sticker", { src: bbo?.profile_image || "", alt: "뽀동이", draggable: "false" });
    return h("span.fa-kkomeal", { style: { "--s": size + "px" } }, box, h("span.fa-stk", sticker));
}
// 🍱 combo set: the parts on a tray
function combo(f, size) {
    return h("span.fa-combo", { style: { "--s": size + "px" } }, h("span.fa-tray"), ...(f.combo || []).map((id, i) => h("span.fa-part", { style: { "--i": i, "--n": f.combo.length } }, foodArt(id, Math.round(size * 0.5)))));
}
export function foodArt(id, size = 48) {
    const f = FOOD_BY_ID[id];
    if (!f) return h("span.food-art", { style: { "--s": size + "px" } }, "🍽️");
    let inner;
    if (f.combo) inner = combo(f, size);
    else if (f.art === "kkomeal") inner = kkomeal(size);
    else if (ART[f.art]) inner = h("span.fa-svg", { html: ART[f.art] });
    else inner = h("span.fa-emoji", f.emoji);
    return h("span.food-art.fa-" + id + (f.food < 0 ? ".bad" : "") + (f.id === "sunshine" ? ".glow" : ""), { style: { "--s": size + "px" }, title: f.name }, inner);
}
