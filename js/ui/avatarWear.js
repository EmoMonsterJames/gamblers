// =====================================================================
// Player image generator — 착용 extras (used by ui/avatarGen.js):
//   📌 PINS — 20 hair pins (ribbons · star · moon · bunny …) worn on the left / middle / right of the head
//   🖋️ TATTOOS — 20 tattoo designs on 5 areas (face · under the eye · neck+upper body · arm · whole body)
// Every part is drawn around 0,0 in a ~20px box, then placed by the caller.
// =====================================================================
const OUT = "#3a2a24";
const f1 = n => +(+n).toFixed(1);
const star = (R, r, n = 5) => "M" + Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / n, k = i % 2 ? r : R; return `${f1(k * Math.cos(a))} ${f1(k * Math.sin(a))}`; }).join("L") + "Z";
const HEART = "M0 8C-14 -1 -8 -12 0 -5C8 -12 14 -1 0 8Z";

// ------------------------------------------------------------ 📌 hair pins
export const PINS = [
    "🎀 빨간 리본", "🎀 핑크 땡땡이 리본", "🎀 블랙 벨벳 리본", "⭐ 별 모양 핀", "🌙 달 모양 핀",
    "🐰 토끼 모양 핀", "💗 하트 핀", "🌼 꽃 핀", "🦋 나비 핀", "🦪 진주 일자 핀",
    "🍓 딸기 핀", "🍒 체리 핀", "🐻 곰돌이 핀", "🐱 고양이 핀", "☁️ 구름 핀",
    "⚡ 번개 핀", "👑 왕관 핀", "🍀 네잎클로버 핀", "🌈 무지개 핀", "💠 민트 똑딱핀"
];
export const PIN_POS = [["left", "왼쪽"], ["center", "가운데"], ["right", "오른쪽"]];
function pinArt(i) {
    const st = (w = 1.4) => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const bow = (c, extra = "", knot = c) => `<path d="M-1 1L-6 10L-2.5 8.5L-1 11ZM1 1L6 10L2.5 8.5L1 11Z" fill="${c}" ${st(1.2)}/><path d="M0 0C-9 -10 -15 -2 -13 5C-9 7 -4 3 0 0ZM0 0C9 -10 15 -2 13 5C9 7 4 3 0 0Z" fill="${c}" ${st()}/>${extra}<circle cx="0" cy="0.5" r="3" fill="${knot}" ${st(1.2)}/>`;
    switch (i) {
        case 0: return bow("#e2463f", "", "#c0392b");
        case 1: return bow("#ff7ab8", [[-8, -2], [-5, 3], [8, -2], [5, 3], [-10, 2], [10, 2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff"/>`).join(""));
        case 2: return bow("#25232a", `<path d="M-10 0Q-6 -3 -3 -1M10 0Q6 -3 3 -1" fill="none" stroke="#5a5560" stroke-width="1"/>`, "#e8b923");
        case 3: return `<path d="${star(10, 4.4)}" fill="#ffd83b" ${st()}/><circle cx="-2" cy="-3" r="1.4" fill="#fff" opacity=".8"/>`;
        case 4: return `<path d="M2 -10A10 10 0 1 0 2 10A13 13 0 0 1 2 -10Z" fill="#ffe27a" ${st()}/><circle cx="-4" cy="-1" r="1" fill="#c98b00"/><circle cx="-2" cy="4" r=".8" fill="#c98b00"/>`;
        case 5: return `<ellipse cx="-4" cy="-8" rx="2.8" ry="7" fill="#fff" ${st(1.2)} transform="rotate(-12 -4 -8)"/><ellipse cx="4" cy="-8" rx="2.8" ry="7" fill="#fff" ${st(1.2)} transform="rotate(12 4 -8)"/><ellipse cx="-4" cy="-8" rx="1.2" ry="4.6" fill="#ffb3c7" transform="rotate(-12 -4 -8)"/><ellipse cx="4" cy="-8" rx="1.2" ry="4.6" fill="#ffb3c7" transform="rotate(12 4 -8)"/><circle cx="0" cy="2" r="7" fill="#fff" ${st()}/><circle cx="-2.6" cy="1" r="1" fill="${OUT}"/><circle cx="2.6" cy="1" r="1" fill="${OUT}"/><path d="M-1 3.6h2l-1 1.2Z" fill="#ff7a9a"/>`;
        case 6: return `<path d="${HEART}" fill="#ff4f7a" ${st()} transform="scale(1.05)"/><ellipse cx="-4" cy="-4" rx="2" ry="1.3" fill="#fff" opacity=".7"/>`;
        case 7: return [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-5.5" rx="4" ry="5" fill="#fff6a8" ${st(1.1)} transform="rotate(${a})"/>`).join("") + `<circle r="3.6" fill="#ff9f43" ${st(1.1)}/>`;
        case 8: return `<path d="M0 0C-4 -10 -14 -11 -12 -2C-11 2 -5 2 0 0ZM0 0C4 -10 14 -11 12 -2C11 2 5 2 0 0Z" fill="#7ad7ff" ${st()}/><path d="M0 0C-3 6 -10 9 -9 4C-8 1 -4 1 0 0ZM0 0C3 6 10 9 9 4C8 1 4 1 0 0Z" fill="#c49bff" ${st()}/><path d="M0 -4V5" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/><path d="M0 -4L-3 -9M0 -4L3 -9" stroke="${OUT}" stroke-width="1" fill="none"/>`;
        case 9: return `<rect x="-12" y="-1.6" width="24" height="3.2" rx="1.6" fill="#e8b923" ${st(1)}/>` + [-7, 0, 7].map(x => `<circle cx="${x}" cy="-1.5" r="3.4" fill="#fff6ea" ${st(1)}/><circle cx="${x - 1}" cy="-2.6" r="1" fill="#fff"/>`).join("");
        case 10: return `<path d="M0 10C-9 4 -10 -4 -6 -6Q0 -8 6 -6C10 -4 9 4 0 10Z" fill="#ff4a5a" ${st()}/><path d="M-6 -6L-3 -10L0 -7L3 -10L6 -6Q0 -4 -6 -6Z" fill="#5cc469" ${st(1.1)}/>` + [[-3, -1], [3, -1], [0, 3], [-4, 4], [4, 4]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".7" ry="1" fill="#ffe27a"/>`).join("");
        case 11: return `<path d="M-4 3Q-2 -8 4 -11M5 3Q4 -6 4 -11" fill="none" stroke="#3f9a5a" stroke-width="1.8" stroke-linecap="round"/><path d="M4 -11Q9 -12 10 -8Q6 -7 4 -11Z" fill="#5cc469" ${st(1)}/><circle cx="-5" cy="6" r="4.6" fill="#d6332c" ${st()}/><circle cx="5.5" cy="6" r="4.6" fill="#d6332c" ${st()}/><circle cx="-6.4" cy="4.4" r="1.2" fill="#fff" opacity=".8"/><circle cx="4" cy="4.4" r="1.2" fill="#fff" opacity=".8"/>`;
        case 12: return `<circle cx="-7" cy="-6" r="3.6" fill="#b98455" ${st(1.2)}/><circle cx="7" cy="-6" r="3.6" fill="#b98455" ${st(1.2)}/><circle r="8.5" fill="#b98455" ${st()}/><ellipse cx="0" cy="3" rx="4.2" ry="3" fill="#f0d3b0"/><ellipse cx="0" cy="1.6" rx="1.6" ry="1.1" fill="${OUT}"/><circle cx="-3.4" cy="-2" r="1.1" fill="${OUT}"/><circle cx="3.4" cy="-2" r="1.1" fill="${OUT}"/>`;
        case 13: return `<path d="M-8 -3L-7 -11L-2 -7ZM8 -3L7 -11L2 -7Z" fill="#ffb870" ${st(1.2)}/><ellipse cx="0" cy="0" rx="9" ry="7.5" fill="#ffb870" ${st()}/><circle cx="-3.2" cy="-1" r="1.1" fill="${OUT}"/><circle cx="3.2" cy="-1" r="1.1" fill="${OUT}"/><path d="M-1.6 2Q0 3.4 1.6 2" fill="none" stroke="${OUT}" stroke-width="1"/><path d="M-9 1H-13M-9 3L-12.5 4.5M9 1H13M9 3L12.5 4.5" stroke="${OUT}" stroke-width=".8"/>`;
        case 14: return `<path d="M-10 5Q-14 5 -13 0Q-12 -4 -8 -3Q-7 -9 -1 -9Q5 -9 6 -4Q11 -5 12 0Q13 5 9 5Z" fill="#fff" ${st()}/><path d="M-4 0q1 1.4 2 0M2 0q1 1.4 2 0" fill="none" stroke="${OUT}" stroke-width="1"/><ellipse cx="-6" cy="2.4" rx="1.6" ry=".9" fill="#ffb3c7"/><ellipse cx="6" cy="2.4" rx="1.6" ry=".9" fill="#ffb3c7"/>`;
        case 15: return `<path d="M3 -12L-6 1H0L-3 12L7 -2H1Z" fill="#ffd83b" ${st()}/>`;
        case 16: return `<path d="M-10 6L-11 -7L-5 -1L0 -10L5 -1L11 -7L10 6Z" fill="#f5c542" ${st()}/><circle cx="0" cy="-10" r="1.8" fill="#e2463f" ${st(.8)}/><circle cx="-11" cy="-7" r="1.4" fill="#3f7df0" ${st(.8)}/><circle cx="11" cy="-7" r="1.4" fill="#3f7df0" ${st(.8)}/><path d="M-10 3H10" stroke="#c98b00" stroke-width="1.2"/>`;
        case 17: return [0, 90, 180, 270].map(a => `<path d="M0 0C-7 -3 -8 -10 -3 -10Q0 -10 0 -7Q0 -10 3 -10C8 -10 7 -3 0 0Z" fill="#3fae5a" ${st(1.1)} transform="rotate(${a + 45})"/>`).join("") + `<path d="M0 0Q2 6 6 9" fill="none" stroke="#2f7a40" stroke-width="1.6" stroke-linecap="round"/>`;
        case 18: return ["#e2463f", "#ff9f43", "#ffd83b", "#5cc469", "#3f7df0", "#8e5cf0"].map((c, k) => `<path d="M${-12 + k * 1.6} 4A${12 - k * 1.6} ${12 - k * 1.6} 0 0 1 ${12 - k * 1.6} 4" fill="none" stroke="${c}" stroke-width="1.8"/>`).join("") + `<path d="M-12 4A12 12 0 0 1 12 4M-3.5 4A3.5 3.5 0 0 1 3.5 4" fill="none" stroke="${OUT}" stroke-width=".9"/><circle cx="-11" cy="5" r="3" fill="#fff" ${st(1)}/><circle cx="11" cy="5" r="3" fill="#fff" ${st(1)}/>`;
        case 19: return `<path d="M-13 -1Q-13 -4.5 -9 -4.5H10Q13 -4.5 13 0Q13 4.5 10 4.5H-9Q-13 4.5 -13 1Z" fill="#58d6b3" ${st()}/><path d="M-6 -1.8H6Q8 0 6 1.8H-6Q-8 0 -6 -1.8Z" fill="#e6fbf6" ${st(1)}/><circle cx="-10" cy="0" r="1.2" fill="#fff"/>`;
    }
    return "";
}
// head frame (head = ellipse 38×36 at 0,0): a pin sits on the hair line, tilted toward its side
export function pinSvg(i, pos) {
    if (!(i >= 0 && i < PINS.length)) return "";
    const [x, y, a] = { left: [-26, -27, -38], right: [26, -27, 38] }[pos] || [0, -37, 0];
    return `<g transform="translate(${x} ${y}) rotate(${a}) scale(1.3)">${pinArt(i | 0)}</g>`;
}

// ------------------------------------------------------------ 🖋️ tattoos
export const TATTOOS = [
    "💗 하트", "⭐ 별", "🌹 장미", "⚓ 닻", "💀 해골", "🦋 나비", "🐍 뱀", "🐉 용", "⚡ 번개", "🌙 초승달",
    "☀️ 태양", "✝️ 십자가", "💧 눈물방울", "💘 화살 하트", "🕸️ 거미줄", "〰️ 트라이벌 문양", "🪽 날개", "👑 왕관", "🍀 클로버", "🔤 MOM 레터링"
];
export const TAT_AREAS = [["face", "얼굴 주변"], ["eye", "눈 아래"], ["upper", "목 · 상반신"], ["arm", "팔"], ["full", "전신"]];
// one design, ~20px box at 0,0 · ink = the tattoo line colour (red / colour accents stay)
export function tatMotif(i, ink) {
    const L = (d, w = 1.6) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const F = (d, c) => `<path d="${d}" fill="${c}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>`;
    switch (i) {
        case 0: return F(HEART, "#e2463f");
        case 1: return L(star(10, 4.2));
        case 2: return L("M0 -3Q-4 -7 0 -9Q5 -8 3 -3Q7 -2 5 3Q0 6 -5 3Q-7 -2 -3 -4Z") + `<path d="M0 -3Q-4 -7 0 -9Q5 -8 3 -3Q7 -2 5 3Q0 6 -5 3Q-7 -2 -3 -4Z" fill="#d6332c" opacity=".55"/>` + L("M0 4V12M0 8Q-5 6 -7 8Q-4 11 0 9", 1.3);
        case 3: return L("M0 -10V9M-5 -5H5M-9 2Q-8 10 0 10Q8 10 9 2M-9 2L-11 5M9 2L11 5") + `<circle cx="0" cy="-11" r="2" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
        case 4: return L("M-8 -1Q-9 -11 0 -11Q9 -11 8 -1Q8 4 5 5V9H-5V5Q-8 4 -8 -1Z") + `<circle cx="-3.4" cy="-2" r="2.4" fill="${ink}"/><circle cx="3.4" cy="-2" r="2.4" fill="${ink}"/>` + L("M-2 9V6M0 9V6M2 9V6", 1) + `<path d="M0 2l-1.3 2h2.6Z" fill="${ink}"/>`;
        case 5: return L("M0 0C-4 -10 -13 -10 -11 -2C-10 2 -4 2 0 0ZM0 0C4 -10 13 -10 11 -2C10 2 4 2 0 0ZM0 0C-3 6 -9 9 -8 4C-7 1 -4 1 0 0ZM0 0C3 6 9 9 8 4C7 1 4 1 0 0ZM0 -5V5", 1.4);
        case 6: return L("M-10 9Q-12 2 -5 1Q2 0 2 -4Q2 -9 7 -9Q11 -9 10 -6", 2.6) + `<circle cx="8" cy="-8" r=".9" fill="${ink}"/>` + L("M11 -6l2 1M11 -6l2 -1", 1);
        case 7: return L("M-11 6Q-8 -2 -3 3Q2 8 5 0Q7 -6 11 -6M11 -6L8 -9M11 -6L9 -3M-5 1l-1 -3M0 5l1 -3M4 2l1 -3", 1.6) + `<circle cx="10" cy="-6.5" r=".8" fill="#e2463f"/>`;
        case 8: return `<path d="M3 -11L-5 1H0L-3 11L6 -2H1Z" fill="#ffd83b" fill-opacity=".5" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
        case 9: return L("M2 -10A10 10 0 1 0 2 10A13 13 0 0 1 2 -10Z");
        case 10: return `<circle r="4.5" fill="none" stroke="${ink}" stroke-width="1.5"/>` + L(Array.from({ length: 8 }, (_, k) => { const a = k * Math.PI / 4; return `M${f1(6.5 * Math.cos(a))} ${f1(6.5 * Math.sin(a))}L${f1(10 * Math.cos(a))} ${f1(10 * Math.sin(a))}`; }).join(""));
        case 11: return L("M0 -10V10M-6 -4H6", 2.2);
        case 12: return `<path d="M0 -9Q6 0 6 4A6 6 0 0 1 -6 4Q-6 0 0 -9Z" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
        case 13: return F("M0 6C-11 -1 -6 -10 0 -4C6 -10 11 -1 0 6Z", "#ff4f7a") + L("M-11 7L11 -7M8 -8L11 -7L10 -4M-11 7l1 -3M-11 7l3 1", 1.3);
        case 14: return L("M-10 -10L10 10M10 -10L-10 10M0 -11V11M-11 0H11", 1) + L("M-4 -4Q0 -6 4 -4Q6 0 4 4Q0 6 -4 4Q-6 0 -4 -4ZM-7.5 -7.5Q0 -11 7.5 -7.5Q11 0 7.5 7.5Q0 11 -7.5 7.5Q-11 0 -7.5 -7.5Z", 1);
        case 15: return `<path d="M-12 4Q-6 -8 0 -2Q6 -8 12 4Q6 -2 0 6Q-6 -2 -12 4Z" fill="${ink}"/><path d="M-6 -6L-9 -11M6 -6L9 -11" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
        case 16: return L("M-1 2Q-6 -8 -13 -6Q-10 -3 -12 0Q-8 0 -9 3Q-5 3 -1 2ZM1 2Q6 -8 13 -6Q10 -3 12 0Q8 0 9 3Q5 3 1 2Z", 1.4) + L("M-9 -3H-4M-8 0H-3M9 -3H4M8 0H3", 1);
        case 17: return L("M-10 6L-11 -6L-5 0L0 -9L5 0L11 -6L10 6Z", 1.6) + `<circle cx="0" cy="-9" r="1.4" fill="#e2463f"/>`;
        case 18: return [0, 90, 180, 270].map(a => `<path d="M0 0C-6 -3 -7 -9 -3 -9Q0 -9 0 -6Q0 -9 3 -9C7 -9 6 -3 0 0Z" fill="#3fae5a" fill-opacity=".45" stroke="${ink}" stroke-width="1.3" transform="rotate(${a + 45})"/>`).join("") + L("M0 0Q2 6 6 9", 1.4);
        case 19: return F(HEART.replace("M0 8", "M0 9"), "#e2463f") + `<rect x="-13" y="-2.6" width="26" height="6" rx="1" fill="#f6ecd6" stroke="${ink}" stroke-width="1"/><text x="0" y="2.2" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="5.6" fill="${ink}">MOM</text>`;
    }
    return "";
}
export const tatAt = (i, ink, x, y, k = 1, a = 0) => i >= 0 && i < TATTOOS.length ? `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)}) scale(${k})" opacity=".88">${tatMotif(i | 0, ink)}</g>` : "";
