// =====================================================================
// 🧬 race parts for the image generator (ui/avatarGen.js): style lists the admin picks from and
// the pieces they draw. Head parts use the head-local frame (head = ellipse 38×36 at 0,0, y up = −);
// body parts use picture space (256×256, the humanoid body drawn at its normal size).
// =====================================================================
const OUT = "#3a2a24";
const f1 = n => +(+n).toFixed(1);
const isHex = c => /^#[0-9a-f]{6}$/i.test(c || "");
export function shadeC(hex, k) {
    if (!isHex(hex)) return hex;
    const n = parseInt(hex.slice(1), 16);
    const ch = s => { let v = (n >> s) & 255; v = k < 0 ? v * (1 + k) : v + (255 - v) * k; return Math.round(v).toString(16).padStart(2, "0"); };
    return "#" + ch(16) + ch(8) + ch(0);
}
const lumC = hex => { if (!isHex(hex)) return 0.6; const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };
const both = fn => fn(-1) + fn(1);
const star = (cx, cy, r, fill, extra = "") => `<path d="M${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; return `${f1(cx + q * Math.cos(a))} ${f1(cy + q * Math.sin(a))}`; }).join("L")}Z" fill="${fill}" ${extra}/>`;
const heart = (cx, cy, r, fill, extra = "") => `<path d="M${cx} ${f1(cy + r)}C${f1(cx - r * 1.8)} ${f1(cy - r * 0.2)} ${f1(cx - r * 0.7)} ${f1(cy - r * 1.5)} ${cx} ${f1(cy - r * 0.45)}C${f1(cx + r * 0.7)} ${f1(cy - r * 1.5)} ${f1(cx + r * 1.8)} ${f1(cy - r * 0.2)} ${cx} ${f1(cy + r)}Z" fill="${fill}" ${extra}/>`;

// ------------------------------------------------------------ style lists (index = option value)
export const EAR_SHAPES = ["토끼 긴 귀 (쫑긋)", "가늘고 긴 귀", "넓은 긴 귀", "늘어진 귀 (롭이어)", "옆으로 누운 귀", "끝이 접힌 귀", "동그란 귀", "큰 동그란 귀 (쥐)", "작은 동그란 귀", "뾰족 귀 (고양이)", "크고 뾰족한 귀", "털 달린 뾰족 귀 (스라소니)", "접힌 귀 (스코티시)", "하트 귀", "타원 귀"];
export const EAR_SIZES = ["작게", "보통", "크게", "아주 크게"];
export const EAR_INNERS = ["분홍 (기본)", "진한 분홍", "하얀색", "털색 (무늬 없음)", "하트 무늬", "줄무늬", "물방울 무늬", "별 무늬", "그라데이션", "테두리 선", "털 뭉치", "반달 무늬", "체크 무늬", "무지개"];
export const JS_EARS = ["기본 둥근 귀", "뾰족한 엘프 귀", "큰 둥근 귀", "작은 귀", "긴 귓볼", "박쥐 귀", "찢어진 귀", "피어싱 귀", "부적 붙은 귀", "꿰맨 귀", "반쪽 귀", "귀 없음"];
export const JS_FANGS = ["기본 송곳니 2개", "긴 송곳니", "한쪽 송곳니", "아래 송곳니", "위아래 송곳니", "톱니 이빨", "뻐드렁니", "금 송곳니", "피 묻은 송곳니", "송곳니 4개", "작은 송곳니", "이빨 없음"];
export const HALOS = ["금 고리 (기본)", "은 고리", "무지개 고리", "이중 고리", "별 고리", "하트 고리", "빛나는 원반", "점선 빛 고리", "기울어진 고리", "꽃 화관", "깨진 고리", "핑크 고리"];
export const ANGEL_WINGS = ["기본 깃털 날개", "아기천사 작은 날개", "큰 깃털 날개", "세 쌍 날개 (세라핌)", "하트 날개", "금빛 날개", "무지개 날개", "뾰족 깃털 날개", "구름 날개", "접힌 날개", "검은 타락천사 날개", "하늘색 날개"];
export const DEVIL_HORNS = ["기본 휜 뿔", "작은 뿔", "숫양 말린 뿔", "곧은 긴 뿔", "황소 뿔", "한쪽 부러진 뿔", "뿔 4개", "금색 뿔", "검은 뿔", "하트 끝 뿔", "줄무늬 뿔", "바깥으로 굽은 뿔"];
export const DEVIL_TAILS = ["기본 화살촉 꼬리", "하트 끝 꼬리", "삼지창 꼬리", "둥근 끝 꼬리", "긴 꼬불 꼬리", "짧은 꼬리", "털 뭉치 꼬리", "번개 끝 꼬리", "리본 묶은 꼬리", "두 갈래 꼬리", "가시 꼬리", "불꽃 끝 꼬리"];
export const GOB_HORNS = ["짧은 원뿔 (기본)", "긴 원뿔", "휜 뿔", "나선 뿔", "뭉툭한 뿔", "금 뿔", "줄무늬 뿔", "굵은 뿔", "가시 박힌 뿔", "돌 뿔", "고리 끼운 뿔", "기울어진 뿔"];
export const GOB_TEETH = ["아래 엄니 2개 (기본)", "위 송곳니 2개", "큰 엄니", "뻐드렁니", "톱니 이빨", "엄니 한 개", "금니", "빠진 이", "상어 이빨", "위아래 송곳니", "네모 이빨", "이빨 없음"];
export const ANT_STYLES = ["기본 (공 끝)", "꼬불꼬불", "스프링", "지그재그", "하트 끝", "별 끝", "깃털 (나방)", "곤봉 (끝이 굵은)", "짧은 뿔", "긴 직선", "꺾인 더듬이 (개미)", "나선 말림 끝 (나비)", "이중 볼", "번개", "리본 끝"];
export const WING_PATS = ["눈알 무늬 (기본)", "물방울", "줄무늬", "그물 맥", "그라데이션", "하트", "별", "표범 무늬", "제왕나비", "호랑나비", "유리날개 (투명)", "무지개", "단색", "테두리"];

// ------------------------------------------------------------ 🐰 main-animal ears (head frame)
// [path with the base at 0,0 pointing up, centroid y, anchor x, anchor y, rotation°, tuft?]
const EAR_DEF = [
    ["M-10 0C-15 -30 -9 -54 0 -56C9 -54 15 -30 10 0Z", -28, 18, -30, 10],
    ["M-7 0C-11 -32 -6 -60 0 -62C6 -60 11 -32 7 0Z", -31, 16, -31, 6],
    ["M-14 0C-19 -26 -12 -48 0 -50C12 -48 19 -26 14 0Z", -25, 20, -29, 14],
    ["M-10 0C-15 -30 -9 -54 0 -56C9 -54 15 -30 10 0Z", -28, 22, -22, 150],
    ["M-10 0C-15 -30 -9 -54 0 -56C9 -54 15 -30 10 0Z", -28, 26, -20, 72],
    ["M-10 0C-14 -22 -10 -38 -6 -42C2 -44 10 -40 10 0Z", -22, 18, -30, 10, "fold"],
    ["M-13 -10a13 13 0 1 0 26 0a13 13 0 1 0-26 0Z", -10, 27, -22, 20],
    ["M-19 -14a19 19 0 1 0 38 0a19 19 0 1 0-38 0Z", -14, 28, -20, 28],
    ["M-9 -6a9 9 0 1 0 18 0a9 9 0 1 0-18 0Z", -6, 26, -26, 18],
    ["M-13 3L-3 -26Q0 -30 3 -26L13 3Z", -9, 24, -24, 20],
    ["M-16 4L-3 -40Q0 -44 3 -40L16 4Z", -13, 24, -22, 22],
    ["M-13 3L-3 -26Q0 -30 3 -26L13 3Z", -9, 24, -24, 20, "tuft"],
    ["M-13 0Q-13 -15 0 -17Q13 -15 13 0Q0 -7 -13 0Z", -7, 25, -26, 30],
    ["M0 2C-22 -12 -16 -36 0 -26C16 -36 22 -12 0 2Z", -15, 24, -26, 18],
    ["M-10 -15a10 17 0 1 0 20 0a10 17 0 1 0-20 0Z", -15, 24, -26, 18]
];
export const EAR_DEFAULT = { rabbit: 0, bunny: 3, bear: 6, teddy: 6, rat: 7, cat: 9 };
const EAR_SCALE = [0.75, 1, 1.25, 1.5];
const INNER_COL = ["#ffb3c7", "#ff6f9f", "#ffffff", null, "#ffb3c7", "#ffb3c7", "#ffb3c7", "#ffb3c7", "url(#eg)", "none", "#ffd6e2", "#ffb3c7", "#ffb3c7", "url(#erb)"];
export const EAR_DEFS = `<linearGradient id="eg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5f97"/><stop offset="1" stop-color="#fff0f6"/></linearGradient><linearGradient id="erb" x1="0" y1="1" x2="0" y2="0">${["#ff7b7b", "#ffc56b", "#fff07a", "#8ef08e", "#7ac8ff", "#c49bff"].map((c, i) => `<stop offset="${i / 5}" stop-color="${c}"/>`).join("")}</linearGradient>`;
export function animalEars(shape, size, inner, fill, line, swk, skin) {
    const [d, cy, ax, ay, rot, extra] = EAR_DEF[shape] || EAR_DEF[0];
    const k = EAR_SCALE[size] ?? 1, ki = 0.58;
    const furIn = INNER_COL[inner] === null ? (isHex(skin) ? shadeC(skin, 0.25) : "#ffffff") : INNER_COL[inner];
    return both(s => {
        const id = `ei${s < 0 ? "L" : "R"}`, it = `translate(0 ${f1(cy * (1 - ki))}) scale(${ki})`;
        const ov = [];
        const pc = "#ff7aa8";
        if (inner === 4) ov.push(heart(0, cy, 5, "#ff4f8f"));
        if (inner === 5) for (let y = 4; y > -70; y -= 7) ov.push(`<path d="M-25 ${y}H25" stroke="${pc}" stroke-width="2.6"/>`);
        if (inner === 6) for (let y = 2; y > -70; y -= 9) for (let x = -20; x <= 20; x += 9) ov.push(`<circle cx="${x + ((y / 9) % 2 ? 4 : 0)}" cy="${y}" r="2.4" fill="#fff"/>`);
        if (inner === 7) ov.push(star(0, cy, 6, "#fff3a0"));
        if (inner === 10) ov.push([-6, 0, 6].map(x => `<path d="M${x} 2Q${x * 1.4} ${f1(cy)} ${x * 0.6} ${f1(cy * 1.6)}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`).join(""));
        if (inner === 11) ov.push(`<path d="M-6 ${cy - 6}a8 8 0 1 0 10 12a6 6 0 1 1 -10 -12Z" fill="#fff6c0"/>`);
        if (inner === 12) { for (let y = 4; y > -70; y -= 7) ov.push(`<path d="M-25 ${y}H25" stroke="${pc}" stroke-width="2"/>`); for (let x = -21; x <= 21; x += 7) ov.push(`<path d="M${x} 6V-70" stroke="${pc}" stroke-width="2"/>`); }
        const innerEl = inner === 9
            ? `<path d="${d}" transform="${it}" fill="none" stroke="#ff7aa8" stroke-width="${f1(2.4 / ki)}"/>`
            : `<path d="${d}" transform="${it}" fill="${furIn}"/>` + (ov.length ? `<clipPath id="${id}"><path d="${d}" transform="${it}"/></clipPath><g clip-path="url(#${id})">${ov.join("")}</g>` : "");
        const tuft = extra === "tuft" ? `<path d="M0 -28L-3 -44M0 -28L4 -42" stroke="${line}" stroke-width="2.6" stroke-linecap="round"/>` : "";
        const fold = extra === "fold" ? `<path d="M-6 -42C-14 -34 -12 -26 -4 -26C4 -28 8 -34 10 -40Z" fill="${isHex(skin) ? shadeC(skin, -0.12) : fill}" stroke="${line}" stroke-width="${swk(3)}" stroke-linejoin="round"/>` : "";
        return `<g transform="translate(${s * ax} ${ay}) scale(${s} 1) rotate(${rot}) scale(${k})"><path d="${d}" fill="${fill}" stroke="${line}" stroke-width="${f1(swk(3.6) / k)}" stroke-linejoin="round"/>${innerEl}${tuft}${fold}</g>`;
    });
}

// ------------------------------------------------------------ 🧟 jiangshi ears + fangs
export function jsEars(style, fill, line, sw) {
    const st = `stroke="${line}" stroke-width="${sw(3.6)}" stroke-linejoin="round"`;
    if (style === 11) return "";
    return both(s => {
        const x = s * 37;
        switch (style) {
            case 1: return `<path d="M${s * 34} -6L${s * 54} -20L${s * 40} 10Z" fill="${fill}" ${st}/>`;
            case 2: return `<circle cx="${s * 39}" cy="2" r="9.5" fill="${fill}" ${st}/>`;
            case 3: return `<circle cx="${x}" cy="2" r="4.5" fill="${fill}" ${st}/>`;
            case 4: return `<ellipse cx="${s * 38}" cy="7" rx="6" ry="12" fill="${fill}" ${st}/>`;
            case 5: return `<path d="M${s * 28} -22L${s * 50} -52L${s * 42} -12Z" fill="${fill}" ${st}/>`;
            case 6: return `<path d="M${x - s * 6} -4A7 7 0 1 0 ${x - s * 4} 8L${x + s * 1} 2Z" fill="${fill}" ${st}/>`;
            case 7: return `<circle cx="${x}" cy="2" r="6.5" fill="${fill}" ${st}/><circle cx="${s * 39}" cy="9" r="3" fill="none" stroke="#c8d0d8" stroke-width="${sw(1.8)}"/>`;
            case 8: return `<circle cx="${x}" cy="2" r="6.5" fill="${fill}" ${st}/>` + (s > 0 ? `<rect x="${x - 4}" y="-4" width="8" height="15" fill="#ffe14d" stroke="#c0392b" stroke-width="${sw(1)}" transform="rotate(12 ${x} 4)"/><path d="M${x - 2} 0h4M${x - 2} 4h4" stroke="#c0392b" stroke-width="${sw(1)}"/>` : "");
            case 9: return `<circle cx="${x}" cy="2" r="6.5" fill="${fill}" ${st}/><path d="M${x - 4} -2l3 3M${x - 4} 2l3 3M${x - 4} 6l3 3M${x - 3} -3V9" stroke="${OUT}" stroke-width="${sw(1)}" fill="none"/>`;
            case 10: return `<path d="M${x} -5A7 7 0 0 ${s > 0 ? 1 : 0} ${x} 9Z" fill="${fill}" ${st}/>`;
            default: return `<circle cx="${x}" cy="2" r="6.5" fill="${fill}" ${st}/>`;
        }
    });
}
export function fangs(style, my, ink = "#2a1a1e") {
    if (style === 11) return "";
    const W = "#ffffff", st = c => `fill="${c}" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round"`;
    const f = (x, len, dir = 1, c = W, w = 2.6) => `<path d="M${f1(x - w)} ${my + 1}l${w} ${f1(len * dir)}l${w} ${f1(-len * dir)}Z" ${st(c)}/>`;
    switch (style) {
        case 1: return f(-5, 14) + f(5, 14);
        case 2: return f(5, 9.5);
        case 3: return f(-5, -8.5) + f(5, -8.5);
        case 4: return f(-6, 8.5) + f(6, 8.5) + f(-3, -6) + f(3, -6);
        case 5: return [-8, -4, 0, 4, 8].map(x => f(x, 5, 1, W, 2)).join("");
        case 6: return `<rect x="-5" y="${my}" width="4.6" height="7" rx="1" ${st(W)}/><rect x="0.4" y="${my}" width="4.6" height="7" rx="1" ${st(W)}/>`;
        case 7: return f(-5, 9.5, 1, "#e8b923") + f(5, 9.5, 1, "#e8b923");
        case 8: return f(-5, 9.5) + f(5, 9.5) + `<path d="M-5 ${my + 9}q-1 4 0 6M5 ${my + 9}q1 4 0 6" stroke="#c1121f" stroke-width="2" stroke-linecap="round"/>`;
        case 9: return f(-8, 8) + f(-3, 6) + f(3, 6) + f(8, 8);
        case 10: return f(-5, 5, 1, W, 2) + f(5, 5, 1, W, 2);
        default: return f(-5, 8.5) + f(5, 8.5);
    }
}

// ------------------------------------------------------------ 😇 halo · angel wings (halo: head frame · wings: body space)
export function halo(style, sw) {
    const ring = (rx, ry, c1, c2, y = -52, extra = "") => `<ellipse cx="0" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="${c1}" stroke-width="${sw(7)}" ${extra}/><ellipse cx="0" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="${c2}" stroke-width="${sw(4)}" ${extra}/>`;
    switch (style) {
        case 1: return ring(23, 6.5, "#7a8794", "#e6edf3");
        case 2: return `<ellipse cx="0" cy="-52" rx="23" ry="6.5" fill="none" stroke="${OUT}" stroke-width="${sw(7)}"/><ellipse cx="0" cy="-52" rx="23" ry="6.5" fill="none" stroke="url(#erb)" stroke-width="${sw(4.6)}"/>`;
        case 3: return ring(25, 7, "#b8860b", "#ffe066", -50) + ring(17, 4.5, "#b8860b", "#fff3a0", -58);
        case 4: return ring(23, 6.5, "#b8860b", "#ffe066") + [-23, -12, 0, 12, 23].map((x, i) => star(x, -52 + (i % 2 ? 5 : -2), 4.4, "#fff3a0", `stroke="#b8860b" stroke-width="${sw(1)}"`)).join("");
        case 5: return `<path d="M0 -44C-24 -50 -26 -66 -12 -66C-6 -66 -2 -62 0 -58C2 -62 6 -66 12 -66C26 -66 24 -50 0 -44Z" fill="none" stroke="#b8860b" stroke-width="${sw(6)}"/><path d="M0 -44C-24 -50 -26 -66 -12 -66C-6 -66 -2 -62 0 -58C2 -62 6 -66 12 -66C26 -66 24 -50 0 -44Z" fill="none" stroke="#ffb3d1" stroke-width="${sw(3.4)}"/>`;
        case 6: return `<ellipse cx="0" cy="-52" rx="30" ry="9" fill="#fff6b0" opacity=".55"/><ellipse cx="0" cy="-52" rx="22" ry="6" fill="#ffe066" stroke="#b8860b" stroke-width="${sw(2)}"/>`;
        case 7: return `<ellipse cx="0" cy="-52" rx="24" ry="7" fill="none" stroke="#ffe066" stroke-width="${sw(4)}" stroke-dasharray="${sw(4)} ${sw(3)}"/>` + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${f1(28 * Math.cos(a))} ${f1(-52 + 9 * Math.sin(a))}l${f1(5 * Math.cos(a))} ${f1(2 * Math.sin(a))}" stroke="#ffe066" stroke-width="${sw(2)}" stroke-linecap="round"/>`; }).join("");
        case 8: return `<g transform="rotate(-16 0 -52)">${ring(23, 6.5, "#b8860b", "#ffe066")}</g>`;
        case 9: return Array.from({ length: 9 }, (_, i) => { const a = Math.PI + i * Math.PI / 8, x = f1(30 * Math.cos(a)), y = f1(-34 + 18 * Math.sin(a)); return `<circle cx="${x}" cy="${y}" r="${sw(6)}" fill="${["#ff9ec7", "#ffffff", "#ffe066"][i % 3]}" stroke="${OUT}" stroke-width="${sw(1.4)}"/><circle cx="${x}" cy="${y}" r="${sw(2)}" fill="#ffb703"/>`; }).join("");
        case 10: return ring(23, 6.5, "#b8860b", "#ffe066", -52, `stroke-dasharray="${sw(30)} ${sw(6)} ${sw(50)} ${sw(8)}"`);
        case 11: return ring(23, 6.5, "#d14d8a", "#ffb3d1");
        default: return ring(23, 6.5, "#b8860b", "#ffe066");
    }
}
const WING_D = "M22 -14C60 -52 96 -40 92 -6C104 0 98 22 80 22C82 36 62 42 50 32C44 42 28 40 22 24Z";
const WING_V = "M40 -8Q62 -22 78 -10M38 8Q58 0 76 8M38 22Q50 18 62 24";
export function angelWings(style, S) {
    const one = (d, fill, vein, k = 1, rot = 0, y = 142, x = 128) => [-1, 1].map(s => `<g transform="translate(${x} ${y}) scale(${s * k} ${k}) rotate(${rot})"><path d="${d}" fill="${fill}" ${S(3.5)}/>${vein ? `<path d="${WING_V}" fill="none" stroke="${vein}" stroke-width="2.4" stroke-linecap="round"/>` : ""}</g>`).join("");
    switch (style) {
        case 1: return one(WING_D, "#ffffff", "#c8d4e0", 0.62, 0, 132);
        case 2: return one(WING_D, "#ffffff", "#c8d4e0", 1.3, -6);
        case 3: return one(WING_D, "#ffffff", "#c8d4e0", 0.9, -40, 130) + one(WING_D, "#ffffff", "#c8d4e0", 1, 0) + one(WING_D, "#ffffff", "#c8d4e0", 0.85, 38, 156);
        case 4: return [-1, 1].map(s => `<g transform="translate(128 140) scale(${s} 1)"><path d="M20 16C14 -10 30 -44 62 -40C80 -38 92 -18 84 4C76 24 44 30 20 16Z" fill="#ffd6e7" ${S(3.5)}/>${heart(58, -8, 8, "#ff7aa8")}</g>`).join("");
        case 5: return one(WING_D, "#ffe066", "#c99a12");
        case 6: return one(WING_D, "url(#erb)", "#ffffff");
        case 7: return one("M22 -14L60 -60L66 -34L96 -40L82 -10L104 4L76 14L82 34L52 26L44 42L28 24Z", "#ffffff", null);
        case 8: return [-1, 1].map(s => `<g transform="translate(128 142) scale(${s} 1)">${[[44, -24, 20], [70, -30, 18], [88, -10, 15], [62, 8, 18], [38, 14, 15]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" ${S(3)}/>`).join("")}${[[44, -24, 20], [70, -30, 18], [88, -10, 15], [62, 8, 18], [38, 14, 15]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 2}" fill="#ffffff"/>`).join("")}</g>`).join("");
        case 9: return one("M20 -10C30 -70 52 -84 60 -70C66 -50 54 -10 44 30C36 40 24 34 20 20Z", "#ffffff", null);
        case 10: return one(WING_D, "#2a2a30", "#5a5a66");
        case 11: return one(WING_D, "#bfe6ff", "#6aaed6");
        default: return one(WING_D, "#ffffff", "#c8d4e0");
    }
}

// ------------------------------------------------------------ 😈 devil horns (head frame) · tail (body space)
const HORN = s => `M${s * 27} -24C${s * 38} -42 ${s * 32} -58 ${s * 20} -62C${s * 24} -50 ${s * 20} -40 ${s * 13} -33Z`;
export function devilHorns(style, sw) {
    const st = `stroke="${OUT}" stroke-width="${sw(3)}" stroke-linejoin="round"`;
    const H = (d, c = "#7a1420") => `<path d="${d}" fill="${c}" ${st}/>`;
    switch (style) {
        case 1: return both(s => `<g transform="translate(${s * 20} -30) scale(.6) translate(${-s * 20} 30)">${H(HORN(s))}</g>`);
        case 2: return both(s => H(`M${s * 18} -30C${s * 30} -52 ${s * 58} -46 ${s * 54} -22C${s * 52} -8 ${s * 36} -8 ${s * 38} -20C${s * 40} -28 ${s * 46} -26 ${s * 44} -22C${s * 42} -34 ${s * 30} -34 ${s * 28} -26Z`, "#8a6a4a"));
        case 3: return both(s => H(`M${s * 24} -28L${s * 26} -74L${s * 14} -32Z`));
        case 4: return both(s => H(`M${s * 30} -22C${s * 52} -24 ${s * 64} -40 ${s * 60} -62C${s * 54} -46 ${s * 44} -38 ${s * 26} -34Z`, "#f3ead8"));
        case 5: return H(HORN(-1)) + H(`M27 -24C34 -34 34 -40 31 -44L22 -42C22 -38 18 -36 13 -33Z`);
        case 6: return both(s => H(HORN(s)) + H(`M${s * 36} -10C${s * 46} -20 ${s * 46} -30 ${s * 40} -36C${s * 40} -28 ${s * 36} -22 ${s * 32} -18Z`));
        case 7: return both(s => H(HORN(s), "#e8b923"));
        case 8: return both(s => H(HORN(s), "#1c1a1e"));
        case 9: return both(s => H(HORN(s)) + heart(s * 20, -62, 5, "#ff4f8f", `stroke="${OUT}" stroke-width="${sw(1.4)}"`));
        case 10: return both(s => H(HORN(s), "#f3ead8") + `<path d="M${s * 16} -36L${s * 26} -32M${s * 20} -44L${s * 31} -42M${s * 22} -52L${s * 32} -52" stroke="#7a1420" stroke-width="${sw(2.4)}"/>`);
        case 11: return both(s => H(`M${s * 26} -26C${s * 44} -30 ${s * 58} -46 ${s * 52} -66C${s * 50} -52 ${s * 40} -40 ${s * 18} -34Z`));
        default: return both(s => H(HORN(s)));
    }
}
export function devilTail(style, S, col) {
    const T = d => `<path d="${d}" fill="none" ${S(8)}/><path d="${d}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`;
    const base = "M150 168C184 186 214 176 204 144", tip = [204, 144];
    const tipAt = ([x, y], kind) => {
        const st = S(3);
        switch (kind) {
            case "heart": return heart(x, y - 6, 8, "#7a1420", st);
            case "trident": return `<path d="M${x} ${y + 4}V${y - 16}M${x - 9} ${y - 4}V${y - 14}M${x + 9} ${y - 4}V${y - 14}M${x - 9} ${y - 4}H${x + 9}" fill="none" ${S(7)}/><path d="M${x} ${y + 4}V${y - 16}M${x - 9} ${y - 4}V${y - 14}M${x + 9} ${y - 4}V${y - 14}M${x - 9} ${y - 4}H${x + 9}" fill="none" stroke="#7a1420" stroke-width="3" stroke-linecap="round"/>`;
            case "ball": return `<circle cx="${x}" cy="${y - 4}" r="7" fill="#7a1420" ${st}/>`;
            case "fluff": return `<path d="M${x} ${y}C${x - 14} ${y - 6} ${x - 10} ${y - 22} ${x} ${y - 24}C${x + 10} ${y - 22} ${x + 14} ${y - 6} ${x} ${y}Z" fill="#2a1a1e" ${st}/>`;
            case "bolt": return `<path d="M${x - 2} ${y + 2}L${x + 8} ${y - 10}L${x + 1} ${y - 9}L${x + 9} ${y - 22}L${x - 7} ${y - 6}L${x} ${y - 7}Z" fill="#ffd83b" ${st}/>`;
            case "flame": return `<path d="M${x} ${y + 2}C${x - 12} ${y - 4} ${x - 6} ${y - 18} ${x} ${y - 26}C${x + 2} ${y - 16} ${x + 12} ${y - 12} ${x + 8} ${y - 2}Z" fill="#ff7b1c" ${st}/><path d="M${x} ${y - 2}C${x - 5} ${y - 6} ${x - 2} ${y - 12} ${x} ${y - 16}C${x + 4} ${y - 10} ${x + 6} ${y - 6} ${x} ${y - 2}Z" fill="#ffd83b"/>`;
            default: return `<path d="M${x} ${y + 6}L${x - 12} ${y - 8}L${x + 12} ${y - 14}Z" fill="#7a1420" ${st}/>`;
        }
    };
    switch (style) {
        case 1: return T(base) + tipAt(tip, "heart");
        case 2: return T(base) + tipAt(tip, "trident");
        case 3: return T(base) + tipAt(tip, "ball");
        case 4: return T("M150 168C200 196 236 160 214 132C200 116 184 132 196 142C206 150 216 134 222 112") + tipAt([222, 112], "arrow");
        case 5: return T("M150 168C166 178 180 176 184 164") + tipAt([184, 164], "arrow");
        case 6: return T(base) + tipAt(tip, "fluff");
        case 7: return T(base) + tipAt(tip, "bolt");
        case 8: return T(base) + tipAt(tip, "arrow") + `<path d="M196 160L184 152L186 168ZM196 160L208 152L206 168Z" fill="#ff4f8f" ${S(2)}/><circle cx="196" cy="160" r="3" fill="#ff4f8f" ${S(1.5)}/>`;
        case 9: return T(base) + T("M204 144C206 132 214 126 222 128") + T("M204 144C196 132 196 122 202 116") + tipAt([222, 128], "arrow") + tipAt([202, 116], "arrow");
        case 10: return T(base) + [[166, 178], [182, 182], [196, 176], [206, 162]].map(([x, y]) => `<path d="M${x} ${y}l4 -9l4 8Z" fill="#7a1420" ${S(2)}/>`).join("") + tipAt(tip, "arrow");
        case 11: return T(base) + tipAt(tip, "flame");
        default: return T(base) + tipAt(tip, "arrow");
    }
}

// ------------------------------------------------------------ 👹 goblin (도깨비): one horn (head frame) + teeth (face frame)
export function gobHorn(style, sw) {
    const st = `stroke="${OUT}" stroke-width="${sw(3)}" stroke-linejoin="round"`;
    const P = (d, c = "#f3ead8") => `<path d="${d}" fill="${c}" ${st}/>`;
    switch (style) {
        case 1: return P("M-9 -32L0 -76L9 -32Z");
        case 2: return P("M-9 -32C-10 -50 0 -66 14 -70C6 -58 6 -46 9 -32Z");
        case 3: return P("M-9 -32L0 -74L9 -32Z") + `<path d="M-6 -40L5 -46M-4 -50L4 -55M-2 -60L3 -64" stroke="#c9b48a" stroke-width="${sw(2)}"/>`;
        case 4: return P("M-11 -32C-12 -50 12 -50 11 -32Z");
        case 5: return P("M-9 -32L0 -60L9 -32Z", "#e8b923");
        case 6: return P("M-9 -32L0 -60L9 -32Z", "#ffffff") + `<path d="M-6 -38H6M-4 -45H4M-2 -52H2" stroke="#e2463f" stroke-width="${sw(2.6)}"/>`;
        case 7: return P("M-14 -30L0 -64L14 -30Z");
        case 8: return P("M-9 -32L0 -60L9 -32Z") + `<path d="M-6 -42l-6 -2l5 -3M6 -48l6 -2l-5 -3" fill="#f3ead8" ${st}/>`;
        case 9: return P("M-10 -32L-6 -52L2 -60L8 -50L10 -32Z", "#9aa3ad");
        case 10: return P("M-9 -32L0 -60L9 -32Z") + `<ellipse cx="0" cy="-42" rx="7" ry="2.6" fill="none" stroke="#e8b923" stroke-width="${sw(2.6)}"/>`;
        case 11: return `<g transform="rotate(18 0 -32)">${P("M-9 -32L0 -62L9 -32Z")}</g>`;
        default: return P("M-9 -32L0 -60L9 -32Z");
    }
}
export function gobTeeth(style, my, ink = "#2a1a1e") {
    if (style === 11) return "";
    const st = c => `fill="${c}" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round"`;
    const up = (x, len, c = "#ffffff", w = 3) => `<path d="M${f1(x - w)} ${my + 3}l${w} ${f1(-len)}l${w} ${f1(len)}Z" ${st(c)}/>`;
    const dn = (x, len, c = "#ffffff", w = 2.6) => `<path d="M${f1(x - w)} ${my}l${w} ${f1(len)}l${w} ${f1(-len)}Z" ${st(c)}/>`;
    switch (style) {
        case 1: return dn(-6, 9) + dn(6, 9);
        case 2: return up(-8, 16, "#ffffff", 4) + up(8, 16, "#ffffff", 4);
        case 3: return `<rect x="-5" y="${my}" width="4.6" height="8" rx="1" ${st("#ffffff")}/><rect x="0.4" y="${my}" width="4.6" height="8" rx="1" ${st("#ffffff")}/>`;
        case 4: return [-8, -4, 0, 4, 8].map(x => dn(x, 5, "#ffffff", 2)).join("");
        case 5: return up(7, 11);
        case 6: return up(-7, 10, "#e8b923") + up(7, 10);
        case 7: return [-6, 6].map(x => `<rect x="${x - 2.5}" y="${my - 1}" width="5" height="6" rx="1" ${st("#ffffff")}/>`).join("");
        case 8: return [-9, -4.5, 0, 4.5, 9].map(x => dn(x, 6.5, "#ffffff", 2.2)).join("") + [-6.5, -2, 2.5, 7].map(x => up(x, 5, "#ffffff", 2)).join("");
        case 9: return dn(-6, 8) + dn(6, 8) + up(-7, 8) + up(7, 8);
        case 10: return `<rect x="-9" y="${my - 1}" width="18" height="6" fill="#ffffff" stroke="${ink}" stroke-width="1.1"/><path d="M-4.500 ${my - 1}v6M0 ${my - 1}v6M4.5 ${my - 1}v6" stroke="${ink}" stroke-width=".9"/>`;
        default: return up(-7, 10) + up(7, 10);
    }
}

// ------------------------------------------------------------ 🐜 antennae (head frame) — base at (±13, −31)
export function antennae(style, col, tipFill, sw) {
    const line = (d, w = 4.5) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const ball = (x, y, r = 5.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${tipFill}" stroke="${col}" stroke-width="${sw(3)}"/>`;
    const pts = (fn, n = 28) => "M" + Array.from({ length: n + 1 }, (_, i) => { const [x, y] = fn(i / n); return `${f1(x)} ${f1(y)}`; }).join("L");
    return both(s => {
        const bx = s * 13, by = -31;
        switch (style) {
            case 1: return line(pts(t => [bx + s * (34 * t + 5 * Math.sin(t * Math.PI * 5)), by - 32 * t + 3 * Math.cos(t * Math.PI * 5)]), 4) + ball(s * 47, -63, 4);
            case 2: return line(pts(t => [bx + s * (28 * t + 6 * Math.cos(t * Math.PI * 8) - 6), by - 34 * t + 6 * Math.sin(t * Math.PI * 8)], 64), 3) + ball(s * 41, -65, 4);
            case 3: return line(`M${bx} ${by}L${s * 22} -44L${s * 18} -50L${s * 30} -60L${s * 26} -66L${s * 40} -72`, 3.6) + ball(s * 40, -72, 4);
            case 4: return line(`M${bx} ${by}C${s * 20} -58 ${s * 36} -68 ${s * 46} -60`) + heart(s * 47, -60, 6, "#ff4f8f", `stroke="${col}" stroke-width="${sw(2)}"`);
            case 5: return line(`M${bx} ${by}C${s * 20} -58 ${s * 36} -68 ${s * 46} -60`) + star(s * 47, -60, 8, "#ffd83b", `stroke="${col}" stroke-width="${sw(1.6)}"`);
            case 6: { const d = `M${bx} ${by}C${s * 18} -56 ${s * 34} -70 ${s * 50} -70`; return line(d, 3) + Array.from({ length: 8 }, (_, i) => { const t = (i + 1) / 9, x = bx + s * 37 * t, y = by - 38 * t + 6 * t * t; return `<path d="M${f1(x)} ${f1(y)}l${s * -5} -6M${f1(x)} ${f1(y)}l${s * 6} 3" stroke="${col}" stroke-width="${sw(1.8)}" stroke-linecap="round"/>`; }).join(""); }
            case 7: return line(`M${bx} ${by}C${s * 18} -52 ${s * 30} -62 ${s * 40} -64`, 3.4) + `<ellipse cx="${s * 44}" cy="-65" rx="9" ry="5.5" transform="rotate(${s * -20} ${s * 44} -65)" fill="${tipFill}" stroke="${col}" stroke-width="${sw(3)}"/>`;
            case 8: return line(`M${bx} ${by}L${s * 18} -48`, 5) + ball(s * 18, -49, 4);
            case 9: return line(`M${bx} ${by}L${s * 30} -76`, 3.4) + ball(s * 30, -77, 4);
            case 10: return line(`M${bx} ${by}L${s * 14} -56L${s * 40} -66`, 4) + ball(s * 41, -66, 4.5);
            case 11: return line(`M${bx} ${by}C${s * 14} -56 ${s * 26} -70 ${s * 40} -70C${s * 50} -70 ${s * 54} -62 ${s * 48} -58C${s * 43} -55 ${s * 40} -60 ${s * 44} -62`, 4);
            case 12: return line(`M${bx} ${by}C${s * 20} -58 ${s * 36} -68 ${s * 46} -58`) + ball(s * 47, -57, 4.5) + ball(s * 31, -64, 3.6);
            case 13: return line(`M${bx} ${by}L${s * 22} -46L${s * 16} -50L${s * 32} -70`, 4) + ball(s * 33, -71, 3.6);
            case 14: return line(`M${bx} ${by}C${s * 20} -58 ${s * 36} -68 ${s * 46} -58`) + `<path d="M${s * 46} -58l-8 -7v12ZM${s * 46} -58l8 -7v12Z" fill="#ff4f8f" stroke="${col}" stroke-width="${sw(1.6)}" stroke-linejoin="round"/>`;
            default: return line(`M${bx} ${by}C${s * 20} -58 ${s * 36} -68 ${s * 46} -58`) + ball(s * 47, -57);
        }
    });
}

// ------------------------------------------------------------ 🦋 butterfly / moth wing decorations (picture space, one wing mirrored)
export function wingDeco(pat, c, moth) {
    const d = shadeC(c, -0.75), l = shadeC(c, 0.35), v = shadeC(c, -0.45);
    switch (pat) {
        case 1: return [[90, -50, 7], [70, -30, 5], [104, -26, 5], [60, 40, 6], [76, 66, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity=".85"/>`).join("");
        case 2: return [-60, -44, -28, -12].map(y => `<path d="M10 ${y + 50}L120 ${y - 20}" stroke="${d}" stroke-width="6" opacity=".7"/>`).join("") + `<path d="M14 20L90 60M14 32L84 80" stroke="${d}" stroke-width="5" opacity=".7"/>`;
        case 3: return `<path d="M10 -6L100 -70M10 -6L116 -46M10 -6L104 -12M10 -6L60 -80M10 6L84 40M10 6L70 84M10 6L40 80" stroke="${d}" stroke-width="2.6" opacity=".8" fill="none"/>`;
        case 4: return `<path d="M22 -14C46 -62 92 -82 104 -56C112 -36 80 -14 40 -6Z" fill="${l}" opacity=".8"/><path d="M14 14C44 20 70 40 74 70" stroke="${l}" stroke-width="14" opacity=".5" fill="none"/>`;
        case 5: return heart(86, -48, 11, "#ffffff", 'opacity=".9"') + heart(60, 54, 8, "#ffffff", 'opacity=".9"');
        case 6: return star(88, -50, 11, "#fff3a0") + star(62, 56, 8, "#fff3a0") + star(108, -24, 5, "#fff3a0");
        case 7: return [[60, -40], [84, -60], [100, -36], [76, -22], [52, -18], [40, 30], [62, 44], [70, 70], [48, 60]].map(([x, y]) => `<path d="M${x} ${y}m-6 0a6 5 0 1 0 12 0a6 5 0 1 0 -12 0" fill="none" stroke="${d}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="2.4" fill="${d}"/>`).join("");
        case 8: return `<path d="M10 -6L100 -70M10 -6L116 -46M10 -6L104 -12M10 6L84 40M10 6L70 84" stroke="#1c1a1e" stroke-width="3.4" fill="none"/>` + [[118, -50], [112, -30], [100, -12], [88, 80], [74, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/>`).join("");
        case 9: return [24, 44, 64, 84].map(x => `<path d="M${x} ${-40 - x * 0.4}L${x + 10} 0" stroke="#1c1a1e" stroke-width="7"/>`).join("") + `<path d="M14 30Q60 60 70 90" stroke="#1c1a1e" stroke-width="7" fill="none"/><circle cx="74" cy="78" r="6" fill="#3f7df0"/>`;
        case 10: return `<path d="M22 -12C50 -54 92 -66 102 -48C108 -30 78 -12 40 -4Z" fill="#ffffff" opacity=".75"/><path d="M18 12C48 16 70 34 70 60C60 72 36 56 20 26Z" fill="#ffffff" opacity=".75"/>`;
        case 11: return `<path d="M6 -8C30 -84 104 -110 120 -62C132 -26 92 4 40 8Z" fill="url(#erb)" opacity=".85"/><path d="M8 6C52 8 98 26 92 66C86 100 40 96 14 40Z" fill="url(#erb)" opacity=".85"/>`;
        case 12: return "";
        case 13: return `<path d="M6 -8C30 -84 104 -110 120 -62C132 -26 92 4 40 8Z" fill="none" stroke="${d}" stroke-width="9" opacity=".9"/><path d="M8 6C52 8 98 26 92 66C86 100 40 96 14 40Z" fill="none" stroke="${d}" stroke-width="9" opacity=".9"/>`;
        default: return `<path d="M22 -14C46 -62 92 -82 104 -56C112 -36 80 -14 40 -6Z" fill="${l}" opacity=".55"/><circle cx="92" cy="-56" r="11" fill="${d}"/><circle cx="92" cy="-56" r="5" fill="#ffd34d"/><circle cx="66" cy="58" r="8" fill="${d}"/><circle cx="66" cy="58" r="3.5" fill="#ffd34d"/><g fill="#fff" opacity=".85"><circle cx="112" cy="-34" r="3"/><circle cx="104" cy="-20" r="2.5"/><circle cx="84" cy="80" r="2.5"/></g><path d="M14 -6C44 -40 80 -60 108 -60M14 4C40 20 62 40 74 70" fill="none" stroke="${v}" stroke-width="2" opacity=".6"/>`;
    }
}
// moth wings are rounder and dustier (the generic wing drawn squashed)
export const mothWrap = (inner, moth) => moth ? `<g transform="scale(1 .82)">${inner}</g>` : inner;

// ------------------------------------------------------------ presets
// 🐛 bugs: antenna style (−1 none) · wings · extra arm pairs · eyes · marks
export const BUGS = {
    "잠자리": { skin: "#3fa7d6", ant: 8, wings: "dragon", eyes: "compound", eyeCol: "#1d4e89" },
    "메뚜기": { skin: "#7cc24a", ant: 9, marks: "stripe" },
    "사마귀": { skin: "#8fd14f", ant: 9, arms: "scythe", head: "tri" },
    "노린재": { skin: "#8a6a3a", ant: 10, marks: "shield" },
    "지렁이": { skin: "#e89a9a", ant: -1, marks: "rings" },
    "송충이": { skin: "#6aa84f", ant: 8, marks: "fuzz" },
    "나비": { skin: "#ffd6e0", ant: 11, wings: "butterfly", wingCol: "#e11d2e" },
    "나방": { skin: "#d9c9a8", ant: 6, wings: "moth", wingCol: "#b8a07a", marks: "fuzz" },
    "파리": { skin: "#3b3b44", ant: 8, wings: "fly", eyes: "compound", eyeCol: "#c1121f" },
    "모기": { skin: "#5a5a66", ant: 6, wings: "mosquito", marks: "proboscis" },
    "지네": { skin: "#a0402a", ant: 9, arms: 2, marks: "rings" },
    "거미": { skin: "#2a2a30", ant: -1, arms: 3, eyes: "multi", marks: "chelicerae" },
    "전갈": { skin: "#b5793a", ant: -1, arms: "claws", tail: "stinger" },
    "무당벌레": { skin: "#e2463f", ant: 7, antCol: "#1c1a1e", marks: "spots" },
    _: { skin: "#7cc24a", ant: 0 }
};
// 🌸 flowers: petal colour (the skin) · count · shape · the face colour (the flower centre)
export const FLOWERS = {
    "벚꽃": { petal: "#ffc4d6", n: 5, shape: "notch", center: "#fff3c4" },
    "튤립": { petal: "#ff4d6d", shape: "tulip", center: "#ffe9a8" },
    "수선화": { petal: "#fffbe6", n: 6, shape: "point", center: "#ffd23f", cup: "#ff9f1c" },
    "유채꽃": { petal: "#ffe14d", n: 4, shape: "round", center: "#ffd23f" },
    "장미": { petal: "#e5383b", shape: "rose", center: "#ffd6d6" },
    "목련": { petal: "#fff4f8", n: 6, shape: "long", center: "#ffe6ee" },
    "철쭉": { petal: "#ff7aa2", n: 5, shape: "round", center: "#ffe0ea", dots: 1 },
    "진달래": { petal: "#e879c6", n: 5, shape: "round", center: "#ffe4f4" },
    "해바라기": { petal: "#ffc300", n: 16, shape: "point", center: "#d9a35a" },
    "백합": { petal: "#ffffff", n: 6, shape: "point", center: "#fff1c1", stamen: 1 },
    "라벤더": { petal: "#9b7ede", shape: "spike", center: "#efe6ff" },
    "나팔꽃": { petal: "#5b6cff", shape: "funnel", center: "#ffffff" },
    "맨드라미": { petal: "#d00045", shape: "crest", center: "#ffd9e4" },
    "코스모스": { petal: "#ff8fc7", n: 8, shape: "notch", center: "#ffd23f" },
    "국화": { petal: "#ffd23f", n: 22, shape: "thin", center: "#ffe9a8", layers: 2 },
    "동백꽃": { petal: "#d90429", n: 6, shape: "round", center: "#ffe066" },
    "연꽃": { petal: "#ff9ec7", n: 8, shape: "long", center: "#fff5d6" },
    "카네이션": { petal: "#ff5d8f", shape: "frill", center: "#ffe0ea" },
    "끈끈이주걱": { petal: "#c1121f", shape: "sundew", center: "#d8f3c0" },
    "벌레잡이통발": { petal: "#7cb518", shape: "pitcher", center: "#e9f5db" },
    "파리지옥": { petal: "#70a13a", shape: "trap", center: "#ffd6d6" },
    _: { petal: "#ff8fc7", n: 6, shape: "round", center: "#fff3c4" }
};
const PETAL = {
    round: "M0 -26C14 -30 18 -54 0 -62C-18 -54 -14 -30 0 -26Z",
    point: "M0 -26C14 -36 12 -54 0 -66C-12 -54 -14 -36 0 -26Z",
    notch: "M0 -26C16 -34 18 -56 6 -62L0 -55L-6 -62C-18 -56 -16 -34 0 -26Z",
    long: "M0 -26C12 -40 10 -62 0 -72C-10 -62 -12 -40 0 -26Z",
    thin: "M0 -28C5 -40 4 -56 0 -64C-4 -56 -5 -40 0 -28Z"
};
export function flowerHead(F, petal, line, sw) {
    const st = `stroke="${line}" stroke-width="${sw(2.6)}" stroke-linejoin="round"`;
    const dk = shadeC(petal, -0.25);
    const ring = (d, n, rot0 = 0, fill = petal, k = 1) => Array.from({ length: n }, (_, i) => `<path d="${d}" transform="rotate(${f1(rot0 + i * 360 / n)}) scale(${k})" fill="${fill}" ${st}/>`).join("");
    switch (F.shape) {
        case "tulip": return `<path d="M-44 14C-52 -26 -42 -62 -22 -68L0 -44L22 -68C42 -62 52 -26 44 14Z" fill="${petal}" ${st}/><path d="M-20 -60L0 -36L20 -60" fill="none" stroke="${dk}" stroke-width="${sw(2.4)}"/>`;
        case "rose": return ring(PETAL.round, 7, 0, dk, 1.05) + ring(PETAL.round, 7, 26, petal, 0.92) + `<path d="M-30 -30Q0 -48 30 -30M-36 30Q0 48 36 30" fill="none" stroke="${dk}" stroke-width="${sw(2)}"/>`;
        case "spike": return Array.from({ length: 13 }, (_, i) => { const y = -36 - i * 4.2, x = (i % 2 ? 7 : -7) * (1 - i / 16); return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="6.5" ry="5" fill="${i % 3 ? petal : dk}" ${st}/>`; }).join("") + ring(PETAL.thin, 6, 90, "#6aa84f", 0.8);
        case "funnel": return `<circle cx="0" cy="0" r="58" fill="${petal}" ${st}/>` + Array.from({ length: 5 }, (_, i) => `<path d="M0 0L0 -58" transform="rotate(${i * 72})" stroke="#ffffff" stroke-width="${sw(3)}" opacity=".7"/>`).join("") + `<circle cx="0" cy="0" r="46" fill="${shadeC(petal, 0.35)}" opacity=".6"/>`;
        case "crest": return `<path d="M-42 -8C-56 -30 -40 -44 -36 -40C-40 -58 -22 -64 -18 -54C-16 -72 4 -74 4 -58C10 -74 30 -66 24 -50C40 -60 54 -42 40 -30C56 -24 52 -4 42 -6Z" fill="${petal}" ${st}/><path d="M-30 -36Q0 -58 30 -36" fill="none" stroke="${dk}" stroke-width="${sw(2)}"/>`;
        case "frill": return `<path d="${"M" + Array.from({ length: 48 }, (_, i) => { const a = i * Math.PI / 24, r = 54 + (i % 2 ? -6 : 4); return `${f1(r * Math.cos(a))} ${f1(r * Math.sin(a))}`; }).join("L")}Z" fill="${petal}" ${st}/><path d="${"M" + Array.from({ length: 36 }, (_, i) => { const a = i * Math.PI / 18, r = 46 + (i % 2 ? -4 : 3); return `${f1(r * Math.cos(a))} ${f1(r * Math.sin(a))}`; }).join("L")}Z" fill="${shadeC(petal, 0.2)}"/>`;
        case "sundew": return Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8, x = f1(58 * Math.cos(a)), y = f1(58 * Math.sin(a)); return `<path d="M0 0L${x} ${y}" stroke="${petal}" stroke-width="${sw(3)}"/><circle cx="${x}" cy="${y}" r="${sw(5)}" fill="#ff4d6d" stroke="#ffffff" stroke-width="${sw(1.6)}"/>`; }).join("");
        case "pitcher": return `<path d="M-46 30C-54 -20 -42 -58 0 -60C42 -58 54 -20 46 30Z" fill="${petal}" ${st}/><path d="M-30 -62C-20 -84 24 -84 34 -64Z" fill="#c1121f" ${st}/><path d="M-40 -48Q0 -60 40 -48" fill="none" stroke="#c1121f" stroke-width="${sw(5)}"/>`;
        case "trap": return both(s => `<path d="M${s * 6} -46C${s * 60} -46 ${s * 64} 40 ${s * 6} 44Z" fill="${petal}" ${st}/><path d="M${s * 14} -40C${s * 52} -38 ${s * 54} 34 ${s * 14} 38Z" fill="#e5383b" opacity=".75"/>` + Array.from({ length: 9 }, (_, i) => { const y = -40 + i * 10; const x = s * (54 - Math.abs(y) * 0.32); return `<path d="M${f1(x)} ${y}l${s * 12} ${-2}" stroke="${petal}" stroke-width="${sw(2.4)}" stroke-linecap="round"/>`; }).join(""));
        default: {
            let s = (F.layers === 2 ? ring(PETAL[F.shape] || PETAL.round, F.n, 180 / F.n, dk, 1.08) : "") + ring(PETAL[F.shape] || PETAL.round, F.n || 6, 0);
            if (F.dots) s += Array.from({ length: F.n }, (_, i) => `<g transform="rotate(${i * 360 / F.n})"><circle cx="-3" cy="-42" r="1.6" fill="${dk}"/><circle cx="3" cy="-46" r="1.6" fill="${dk}"/></g>`).join("");
            if (F.cup) s += ""; // drawn in front of the face (flowerFront)
            return s;
        }
    }
}
export function flowerFront(F, sw) {
    let s = "";
    if (F.cup) s += `<path d="M-14 -30Q0 -40 14 -30L10 -22Q0 -26 -10 -22Z" fill="${F.cup}" stroke="${OUT}" stroke-width="${sw(1.6)}"/>`;
    if (F.stamen) s += [-10, 0, 10].map(x => `<path d="M${x} -30L${x * 1.6} -48" stroke="#8a6a2a" stroke-width="${sw(1.6)}"/><ellipse cx="${x * 1.6}" cy="-49" rx="2" ry="3.4" fill="#c1501f"/>`).join("");
    return s;
}

// 🍎 fruits · 🥕 veggies: body shape + colour + pattern + top piece
export const FRUITS = {
    "귤": { skin: "#ff9f1c", shape: "wide", pat: "dimple", top: "leaf" },
    "바나나": { skin: "#ffe14d", shape: "banana", pat: "banana", top: "nub" },
    "체리": { skin: "#d00000", shape: "round", pat: "shine", top: "cherry" },
    "포도": { skin: "#7b2cbf", shape: "oval", pat: "grapes", top: "leaf" },
    "사과": { skin: "#e63946", shape: "round", pat: "shine", top: "leaf" },
    "딸기": { skin: "#e5383b", shape: "heart", pat: "seeds", top: "calyx" },
    "수박": { skin: "#3fae5a", shape: "round", pat: "stripes", top: "stem" },
    "레몬": { skin: "#ffe14d", shape: "lemon", pat: "dimple", top: "leaf" },
    "블루베리": { skin: "#3a5bd9", shape: "round", pat: "bloom", top: "crown5" },
    "복숭아": { skin: "#ffb5a7", shape: "round", pat: "crease", top: "leaf" },
    "오렌지": { skin: "#ff8c1a", shape: "round", pat: "dimple", top: "leaf" },
    "두리안": { skin: "#b5b84a", shape: "oval", pat: "spikes", top: "stem" },
    "용과": { skin: "#ff3d8b", shape: "oval", pat: "flaps", top: "flaps" },
    "배": { skin: "#d8d05a", shape: "pear", pat: "speckle", top: "stem" },
    "망고": { skin: "#ffb703", shape: "drop", pat: "blush", top: "stem" },
    "멜론": { skin: "#b7d77a", shape: "round", pat: "net", top: "tstem" },
    "파인애플": { skin: "#f4a300", shape: "oval", pat: "scales", top: "crown" },
    "코코넛": { skin: "#7a4a2a", shape: "round", pat: "fuzz", top: "none" },
    "키위": { skin: "#8a6a3a", shape: "oval", pat: "fuzz", top: "none" },
    _: { skin: "#ff6b6b", shape: "round", pat: "shine", top: "leaf" }
};
export const VEGGIES = {
    "오이": { skin: "#4caf50", shape: "long", pat: "bumps", top: "stem" },
    "토마토": { skin: "#e63946", shape: "wide", pat: "shine", top: "calyx" },
    "양파": { skin: "#c77d4a", shape: "drop", pat: "lines", top: "sprout" },
    "콩나물": { skin: "#fff3b0", shape: "oval", pat: "none", top: "sprout" },
    "감자": { skin: "#d9b77a", shape: "lumpy", pat: "eyes", top: "none" },
    "마늘": { skin: "#f5efe6", shape: "drop", pat: "lines", top: "nub" },
    "당근": { skin: "#ff8c1a", shape: "carrot", pat: "rings", top: "leaves" },
    "배추": { skin: "#c9e86a", shape: "oval", pat: "leaves", top: "leaves3" },
    "무우": { skin: "#f5f5f0", shape: "long", pat: "rings", top: "leaves" },
    "가지": { skin: "#5a2a82", shape: "long", pat: "shine", top: "calyx" },
    "버섯": { skin: "#f2e3c9", shape: "stem", pat: "none", top: "cap" },
    "호박": { skin: "#ff8c1a", shape: "wide", pat: "ribs", top: "stem" },
    "애호박": { skin: "#9ccc65", shape: "long", pat: "stripes", top: "stem" },
    "파프리카": { skin: "#e63946", shape: "round", pat: "ribs", top: "tstem" },
    "아티초크": { skin: "#7fa35b", shape: "drop", pat: "scales", top: "nub" },
    "옥수수": { skin: "#ffd23f", shape: "long", pat: "kernels", top: "husk" },
    "브뤼셀스프라우트": { skin: "#8bc34a", shape: "round", pat: "leaves", top: "nub" },
    "아보카도": { skin: "#4a7c2a", shape: "pear", pat: "speckle", top: "stem" },
    "브로콜리": { skin: "#3f8f3a", shape: "round", pat: "florets", top: "none" },
    "비트": { skin: "#9b1d4a", shape: "round", pat: "rings", top: "leaves" },
    "시금치": { skin: "#2f7d32", shape: "drop", pat: "veins", top: "stem" },
    "칼리플라워": { skin: "#f5f0e1", shape: "round", pat: "florets", top: "leaves3" },
    "셀러리": { skin: "#a5d66b", shape: "long", pat: "stripes", top: "leaves3" },
    "고추": { skin: "#d00000", shape: "carrot", pat: "shine", top: "calyx" },
    "고구마": { skin: "#a4508b", shape: "oval", pat: "speckle", top: "nub" },
    "콩": { skin: "#7cb342", shape: "wide", pat: "shine", top: "none" },
    "애스파라거스": { skin: "#6a9f3a", shape: "long", pat: "scales", top: "nub" },
    "콜라비": { skin: "#a5c86b", shape: "round", pat: "shine", top: "leaves3" },
    "올리브": { skin: "#4b5d23", shape: "oval", pat: "shine", top: "stem" },
    _: { skin: "#7cb342", shape: "round", pat: "shine", top: "leaf" }
};
// body shapes: like shapeBody() in avatarGen.js — outline · arm / leg anchors · face / head frames · skirt line
export const PRODUCE_BODY = {
    round: { d: "M52 124a76 76 0 1 0 152 0a76 76 0 1 0-152 0Z", ax: [54, 202], ay: 130, legY: 196, top: 48, bot: 200, ff: [128, 124, 2], hf: [128, 124, 2], skY: 178, hip: 53 },
    oval: { d: "M66 122a62 80 0 1 0 124 0a62 80 0 1 0-124 0Z", ax: [68, 188], ay: 130, legY: 196, top: 42, bot: 202, ff: [128, 118, 1.6], hf: [128, 104, 1.5], skY: 178, hip: 46 },
    wide: { d: "M48 132a80 64 0 1 0 160 0a80 64 0 1 0-160 0Z", ax: [50, 206], ay: 136, legY: 190, top: 68, bot: 196, ff: [128, 128, 1.8], hf: [128, 124, 1.8], skY: 176, hip: 66 },
    lemon: { d: "M40 130C40 80 90 62 128 62C166 62 216 80 216 130C216 180 166 198 128 198C90 198 40 180 40 130ZM36 130L46 122V138ZM220 130L210 122V138Z", ax: [44, 212], ay: 140, legY: 192, top: 62, bot: 198, ff: [128, 128, 1.7], hf: [128, 120, 1.7], skY: 178, hip: 62 },
    pear: { d: "M128 40C152 40 156 70 150 90C182 110 196 150 186 176C176 202 152 206 128 206C104 206 80 202 70 176C60 150 74 110 106 90C100 70 104 40 128 40Z", ax: [72, 184], ay: 150, legY: 200, top: 40, bot: 206, ff: [128, 148, 1.35], hf: [128, 100, 1.1], skY: 184, hip: 52 },
    drop: { d: "M128 34C140 60 196 100 196 146C196 186 166 206 128 206C90 206 60 186 60 146C60 100 116 60 128 34Z", ax: [62, 194], ay: 150, legY: 200, top: 34, bot: 206, ff: [128, 148, 1.45], hf: [128, 118, 1.3], skY: 184, hip: 56 },
    heart: { d: "M128 206C92 186 58 150 58 104C58 70 84 54 108 58C118 60 124 64 128 70C132 64 138 60 148 58C172 54 198 70 198 104C198 150 164 186 128 206Z", ax: [60, 196], ay: 112, legY: 190, legX: [112, 144], top: 56, bot: 206, ff: [128, 112, 1.55], hf: [128, 86, 1.5], skY: 166, hip: 50 },
    long: { d: "M96 52Q128 22 160 52L166 184Q128 214 90 184Z", ax: [94, 162], ay: 120, legY: 196, top: 36, bot: 202, ff: [128, 100, 1.2], hf: [128, 76, 1.05], skY: 172, hip: 38 },
    carrot: { d: "M70 62Q128 42 186 62Q172 150 128 216Q84 150 70 62Z", ax: [76, 180], ay: 96, legY: 194, legX: [116, 140], top: 54, bot: 214, ff: [128, 104, 1.35], hf: [128, 80, 1.3], skY: 150, hip: 34, waist: 0.3 },
    banana: { d: "M118 36L132 34L136 50C186 74 190 150 156 200C142 216 110 216 100 202C132 160 132 96 120 50Z", ax: [118, 184], ay: 128, legY: 206, legX: [118, 150], top: 34, bot: 214, ff: [150, 118, 1.15], hf: [146, 86, 1], skY: 192, hip: 28 },
    lumpy: { d: "M74 96C72 62 104 44 132 46C168 48 192 72 194 108C198 144 192 178 166 198C144 214 108 212 88 194C64 172 76 128 74 96Z", ax: [76, 192], ay: 136, legY: 200, top: 46, bot: 206, ff: [134, 124, 1.6], hf: [134, 108, 1.55], skY: 184, hip: 54 },
    stem: { d: "M100 100H156Q170 150 162 196Q128 208 94 196Q86 150 100 100Z", ax: [98, 158], ay: 140, legY: 196, top: 100, bot: 202, ff: [128, 142, 1.05], hf: [128, 58, 1], skY: 178, hip: 34 }
};
// pattern drawn inside the body (clipped) · c = body colour
export function producePattern(pat, c, B) {
    const d = shadeC(c, lumC(c) < 0.3 ? 0.35 : -0.3), l = shadeC(c, 0.45);
    const top = B.top, bot = B.bot;
    switch (pat) {
        case "stripes": return [-54, -27, 0, 27, 54].map(x => `<path d="M${128 + x * 0.6} ${top}C${128 + x * 1.4} ${(top + bot) / 2} ${128 + x * 1.4} ${(top + bot) / 2} ${128 + x * 0.6} ${bot}" fill="none" stroke="${d}" stroke-width="8" stroke-linecap="round" opacity=".85"/>`).join("");
        case "ribs": return [-40, -14, 14, 40].map(x => `<path d="M${128 + x * 0.5} ${top + 6}C${128 + x * 1.5} ${(top + bot) / 2} ${128 + x * 1.5} ${(top + bot) / 2} ${128 + x * 0.5} ${bot - 4}" fill="none" stroke="${d}" stroke-width="3" opacity=".7"/>`).join("");
        case "seeds": case "speckle": case "dimple": case "eyes": case "bumps": {
            const col = pat === "seeds" ? "#ffe14d" : pat === "dimple" ? d : pat === "eyes" ? shadeC(c, -0.35) : pat === "bumps" ? l : d;
            const r = pat === "seeds" ? 2.6 : pat === "eyes" ? 3.6 : pat === "bumps" ? 3 : 1.6, out = [];
            for (let y = top + 14; y < bot; y += pat === "eyes" ? 30 : 16) for (let x = 40; x < 220; x += pat === "eyes" ? 34 : 18) out.push(`<${pat === "seeds" ? `path d="M${x + ((y / 16) % 2 ? 9 : 0)} ${y}l-${r} ${r * 2}h${r * 2}Z"` : `ellipse cx="${x + ((y / 16) % 2 ? 9 : 0)}" cy="${y}" rx="${r}" ry="${f1(r * 0.8)}"`} fill="${col}" opacity=".8"/>`);
            return out.join("");
        }
        case "net": { const o = []; for (let k = -6; k <= 6; k++) o.push(`<path d="M${128 + k * 22 - 60} ${top}L${128 + k * 22 + 60} ${bot}M${128 + k * 22 + 60} ${top}L${128 + k * 22 - 60} ${bot}" stroke="${l}" stroke-width="2.4" opacity=".8"/>`); return o.join(""); }
        case "scales": { const o = []; for (let y = top + 10; y < bot; y += 18) for (let x = 40; x < 220; x += 20) o.push(`<path d="M${x + ((y - top) / 18 % 2 ? 10 : 0) - 9} ${y}Q${x + ((y - top) / 18 % 2 ? 10 : 0)} ${y + 12} ${x + ((y - top) / 18 % 2 ? 10 : 0) + 9} ${y}" fill="none" stroke="${d}" stroke-width="2.4"/>`); return o.join(""); }
        case "flaps": { const o = []; for (let y = top + 22; y < bot - 6; y += 30) for (let x = 60; x < 200; x += 36) o.push(`<path d="M${x + ((y - top) / 30 % 2 ? 18 : 0) - 9} ${y + 8}Q${x + ((y - top) / 30 % 2 ? 18 : 0)} ${y - 14} ${x + ((y - top) / 30 % 2 ? 18 : 0) + 9} ${y + 8}" fill="#7cb518" stroke="${d}" stroke-width="1.6"/>`); return o.join(""); }
        case "kernels": { const o = []; for (let y = top + 12; y < bot; y += 11) for (let x = 92; x < 168; x += 12) o.push(`<ellipse cx="${x + ((y - top) / 11 % 2 ? 6 : 0)}" cy="${y}" rx="5" ry="4.4" fill="${l}" stroke="${d}" stroke-width="1"/>`); return o.join(""); }
        case "grapes": { const o = []; for (let y = top + 14; y < bot; y += 22) for (let x = 54; x < 210; x += 24) o.push(`<circle cx="${x + ((y - top) / 22 % 2 ? 12 : 0)}" cy="${y}" r="11" fill="none" stroke="${d}" stroke-width="2.4"/><circle cx="${x + ((y - top) / 22 % 2 ? 12 : 0) - 4}" cy="${y - 4}" r="2.4" fill="${l}"/>`); return o.join(""); }
        case "florets": return Array.from({ length: 22 }, (_, i) => `<circle cx="${50 + (i * 37) % 160}" cy="${top + 10 + Math.floor(i * 37 / 160) * 22}" r="12" fill="${l}" opacity=".45"/>`).join("");
        case "lines": case "rings": return pat === "rings" ? Array.from({ length: 7 }, (_, i) => `<path d="M${100 - i * 2} ${top + 26 + i * 22}h${18 + i * 2}" stroke="${d}" stroke-width="2.6" stroke-linecap="round"/><path d="M${150 + i} ${top + 36 + i * 22}h${12}" stroke="${d}" stroke-width="2.6" stroke-linecap="round"/>`).join("")
            : [-30, -15, 0, 15, 30].map(x => `<path d="M128 ${top + 4}C${128 + x * 2.4} ${(top + bot) / 2} ${128 + x * 2.4} ${(top + bot) / 2 + 20} 128 ${bot}" fill="none" stroke="${d}" stroke-width="2.2" opacity=".75"/>`).join("");
        case "leaves": return [0, 1, 2].map(i => `<path d="M${40 + i * 6} ${bot - i * 20}C${60 + i * 10} ${top + 40 + i * 14} ${196 - i * 10} ${top + 40 + i * 14} ${216 - i * 6} ${bot - i * 20}" fill="${i % 2 ? l : shadeC(c, -0.12)}" stroke="${d}" stroke-width="2.4" opacity=".9"/>`).join("") + `<path d="M128 ${top + 20}V${bot}" stroke="${l}" stroke-width="3"/>`;
        case "veins": return `<path d="M128 ${top + 10}V${bot}" stroke="${l}" stroke-width="3.4"/>` + [0, 1, 2, 3].map(i => `<path d="M128 ${top + 50 + i * 30}l-34 -18M128 ${top + 50 + i * 30}l34 -18" stroke="${l}" stroke-width="2.4"/>`).join("");
        case "crease": return `<path d="M128 ${top + 4}C116 ${(top + bot) / 2} 140 ${(top + bot) / 2} 128 ${bot}" fill="none" stroke="${d}" stroke-width="2.6" opacity=".6"/><ellipse cx="96" cy="${(top + bot) / 2 - 20}" rx="22" ry="30" fill="#ffffff" opacity=".2"/>`;
        case "fuzz": return Array.from({ length: 70 }, (_, i) => { const x = 36 + (i * 53) % 184, y = top + 8 + Math.floor(i * 53 / 184) * 12; return `<path d="M${x} ${y}l2 -5" stroke="${d}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`; }).join("");
        case "blush": return `<ellipse cx="${B.ax[1] - 26}" cy="${top + 40}" rx="36" ry="30" fill="#ff4d4d" opacity=".35"/>`;
        case "bloom": return `<ellipse cx="128" cy="${(top + bot) / 2}" rx="70" ry="70" fill="#ffffff" opacity=".14"/><ellipse cx="96" cy="${top + 40}" rx="18" ry="12" fill="#ffffff" opacity=".35"/>`;
        case "banana": return `<path d="M130 60C160 90 160 160 136 204" fill="none" stroke="${d}" stroke-width="4" stroke-linecap="round"/>`;
        case "spikes": case "shine": return `<ellipse cx="${B.ff[0] - 30}" cy="${top + 34}" rx="14" ry="9" fill="#ffffff" opacity=".45" transform="rotate(-30 ${B.ff[0] - 30} ${top + 34})"/>`;
        default: return "";
    }
}
// drawn behind the body (spikes) / on top of it (stem, leaves, crown …) — S = stroke helper
export function produceBack(pat, c, B, S) {
    if (pat !== "spikes") return "";
    const cx = B.ff[0], cy = (B.top + B.bot) / 2, rx = (B.ax[1] - B.ax[0]) / 2 + 4, ry = (B.bot - B.top) / 2 + 4;
    return Array.from({ length: 22 }, (_, i) => { const a = i * Math.PI / 11, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a), nx = Math.cos(a), ny = Math.sin(a); return `<path d="M${f1(x - ny * 8)} ${f1(y + nx * 8)}L${f1(x + nx * 14)} ${f1(y + ny * 14)}L${f1(x + ny * 8)} ${f1(y - nx * 8)}Z" fill="${shadeC(c, -0.15)}" ${S(2.4)}/>`; }).join("");
}
export function produceTop(top, B, S) {
    const x = B.ff[0], y = B.top;
    const leaf = (lx, ly, rot, col = "#5cc469") => `<path d="M${lx} ${ly}C${lx + 6} ${ly - 18} ${lx + 26} ${ly - 22} ${lx + 34} ${ly - 14}C${lx + 26} ${ly - 2} ${lx + 10} ${ly + 2} ${lx} ${ly}Z" transform="rotate(${rot} ${lx} ${ly})" fill="${col}" ${S(3)}/>`;
    switch (top) {
        case "leaf": return `<path d="M${x} ${y + 4}Q${x + 2} ${y - 10} ${x + 6} ${y - 16}" fill="none" ${S(5)}/><path d="M${x} ${y + 4}Q${x + 2} ${y - 10} ${x + 6} ${y - 16}" fill="none" stroke="#6b4a2f" stroke-width="2.6"/>` + leaf(x + 4, y - 8, -10);
        case "stem": return `<path d="M${x} ${y + 4}L${x + 4} ${y - 12}" ${S(7)}/><path d="M${x} ${y + 4}L${x + 4} ${y - 12}" stroke="#7a5a2a" stroke-width="4" stroke-linecap="round"/>`;
        case "tstem": return `<path d="M${x} ${y + 4}V${y - 12}M${x - 10} ${y - 12}H${x + 10}" fill="none" ${S(8)}/><path d="M${x} ${y + 4}V${y - 12}M${x - 10} ${y - 12}H${x + 10}" fill="none" stroke="#6a9f3a" stroke-width="4.5" stroke-linecap="round"/>`;
        case "nub": return `<path d="M${x - 5} ${y + 6}L${x} ${y - 8}L${x + 5} ${y + 6}Z" fill="#8a7a4a" ${S(2.4)}/>`;
        case "cherry": return `<path d="M${x} ${y + 4}C${x + 4} ${y - 30} ${x + 24} ${y - 44} ${x + 40} ${y - 46}" fill="none" ${S(7)}/><path d="M${x} ${y + 4}C${x + 4} ${y - 30} ${x + 24} ${y - 44} ${x + 40} ${y - 46}" fill="none" stroke="#5a8a2a" stroke-width="4" stroke-linecap="round"/>` + leaf(x + 30, y - 42, 10);
        case "calyx": case "crown5": return `<path d="${"M" + Array.from({ length: 10 }, (_, i) => { const a = Math.PI + i * Math.PI / 9, r = i % 2 ? 9 : 26; return `${f1(x + r * Math.cos(a))} ${f1(y + 8 + r * 0.55 * Math.sin(a) * -1)}`; }).join("L")}Z" fill="${top === "crown5" ? "#22306b" : "#3fae5a"}" ${S(2.6)}/>` + (top === "calyx" ? `<path d="M${x} ${y + 2}V${y - 12}" fill="none" ${S(8)}/><path d="M${x} ${y + 2}V${y - 12}" stroke="#3fae5a" stroke-width="4.5" stroke-linecap="round"/>` : "");
        case "leaves": return [-22, -8, 6, 20].map((dx, i) => `<path d="M${x} ${y + 6}C${x + dx * 0.4} ${y - 20} ${x + dx * 1.2} ${y - 34} ${x + dx * 1.4} ${y - 44 + (i % 2) * 8}" fill="none" ${S(9)}/><path d="M${x} ${y + 6}C${x + dx * 0.4} ${y - 20} ${x + dx * 1.2} ${y - 34} ${x + dx * 1.4} ${y - 44 + (i % 2) * 8}" fill="none" stroke="#3fae5a" stroke-width="5.5" stroke-linecap="round"/>`).join("");
        case "leaves3": return leaf(x - 30, y + 8, -40, "#7cc24a") + leaf(x + 2, y + 2, -80, "#5cc469") + leaf(x + 10, y + 8, -20, "#7cc24a");
        case "sprout": return `<path d="M${x} ${y + 4}C${x - 4} ${y - 16} ${x + 14} ${y - 22} ${x + 8} ${y - 34}" fill="none" ${S(6)}/><path d="M${x} ${y + 4}C${x - 4} ${y - 16} ${x + 14} ${y - 22} ${x + 8} ${y - 34}" fill="none" stroke="#a5d66b" stroke-width="3.4" stroke-linecap="round"/>`;
        case "flaps": return [-16, 0, 16].map(dx => `<path d="M${x + dx - 6} ${y + 8}Q${x + dx} ${y - 18} ${x + dx + 6} ${y + 8}Z" fill="#7cb518" ${S(2.4)}/>`).join("");
        case "crown": return [-24, -12, 0, 12, 24].map((dx, i) => `<path d="M${x + dx * 0.5 - 7} ${y + 10}L${x + dx * 1.3} ${y - 36 + Math.abs(dx) * 0.6}L${x + dx * 0.5 + 7} ${y + 10}Z" fill="${i % 2 ? "#3f8f3a" : "#5cc469"}" ${S(2.6)}/>`).join("");
        case "husk": return `<path d="M${x - 40} ${y + 120}C${x - 56} ${y + 60} ${x - 30} ${y + 10} ${x - 8} ${y - 6}C${x - 22} ${y + 40} ${x - 30} ${y + 80} ${x - 22} ${y + 130}Z" fill="#8bc34a" ${S(3)}/><path d="M${x + 40} ${y + 120}C${x + 56} ${y + 60} ${x + 30} ${y + 10} ${x + 8} ${y - 6}C${x + 22} ${y + 40} ${x + 30} ${y + 80} ${x + 22} ${y + 130}Z" fill="#7cb342" ${S(3)}/>`;
        case "cap": return `<path d="M36 ${y + 8}C36 ${y - 70} 220 ${y - 70} 220 ${y + 8}Q128 ${y + 26} 36 ${y + 8}Z" fill="#c0392b" ${S(4)}/>` + [[80, y - 24, 9], [124, y - 40, 11], [170, y - 22, 9], [104, y - 4, 6], [150, y - 2, 6]].map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff6ea"/>`).join("");
        default: return "";
    }
}

// ------------------------------------------------------------ 🐾 other animals: head extras [back, front-of-head]
export function animalHead(id, skin, skinL, line, sw, rainbow) {
    const st = (w = 3.6) => `stroke="${line}" stroke-width="${sw(w)}" stroke-linejoin="round"`;
    const lt = rainbow ? "#ffffff" : shadeC(skin, 0.5), dk = rainbow ? OUT : shadeC(skin, -0.35);
    const muzzle = (cy = 12, rx = 15, ry = 11) => `<ellipse cx="0" cy="${cy}" rx="${rx}" ry="${ry}" fill="${lt}"/>`;
    const nose = (cy = 6, c = "#2a1a1e") => `<ellipse cx="0" cy="${cy}" rx="5.5" ry="4" fill="${c}"/>`;
    const roundEars = (r = 11, x = 27, y = -26, inner = lt) => both(s => `<circle cx="${s * x}" cy="${y}" r="${r}" fill="${skinL}" ${st()}/><circle cx="${s * x}" cy="${y}" r="${f1(r * 0.5)}" fill="${inner}"/>`);
    const ptEars = (x = 22, h = 34, w = 11, inner = lt) => both(s => `<path d="M${s * (x - w)} -24L${s * (x + 4)} ${-24 - h}L${s * (x + w + 6)} -18Z" fill="${skinL}" ${st()}/><path d="M${s * (x - w + 6)} -24L${s * (x + 4)} ${-18 - h}L${s * (x + w)} -20Z" fill="${inner}"/>`);
    switch (id) {
        case "dog": return [both(s => `<path d="M${s * 24} -28C${s * 50} -32 ${s * 56} 6 ${s * 46} 22C${s * 38} 30 ${s * 30} 10 ${s * 30} -12Z" fill="${dk}" ${st()}/>`), muzzle() + nose()];
        case "bird": return ["", [-8, 0, 8].map((x, i) => `<path d="M${x} -32C${x - 4} -50 ${x + 6} -56 ${x + 8} -48C${x + 4} -44 ${x + 2} -38 ${x + 3} -32Z" fill="${dk}" ${st(2.6)}/>`).join("") + `<path d="M-9 6L0 22L9 6Q0 1 -9 6Z" fill="#ff9f1c" ${st(2.4)}/><path d="M-9 6Q0 10 9 6" fill="none" stroke="${line}" stroke-width="${sw(1.4)}"/>`];
        case "hippo": return [roundEars(7, 25, -30), `<ellipse cx="0" cy="16" rx="27" ry="17" fill="${lt}" ${st(2.4)}/>` + both(s => `<ellipse cx="${s * 8}" cy="10" rx="3" ry="4.4" fill="${dk}"/>`)];
        case "lion": return [Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8; return `<circle cx="${f1(44 * Math.cos(a))}" cy="${f1(2 + 42 * Math.sin(a))}" r="15" fill="${rainbow ? "#b5651d" : shadeC(skin, -0.42)}" ${st(3)}/>`; }).join("") + roundEars(9, 27, -28), muzzle() + nose(6, "#6b3a2a")];
        case "tiger": return [roundEars(11, 27, -26, "#ffffff"), muzzle(13, 16, 11) + nose(7, "#ff8fa8") + `<path d="M-6 -36L0 -26L6 -36M-18 -32L-12 -22M18 -32L12 -22" fill="none" stroke="#2a1a1e" stroke-width="${sw(3.4)}" stroke-linecap="round"/>` + both(s => `<path d="M${s * 37} -4L${s * 26} -2M${s * 37} 6L${s * 27} 6M${s * 36} 16L${s * 27} 13" stroke="#2a1a1e" stroke-width="${sw(3)}" stroke-linecap="round"/>`)];
        case "horse": return [ptEars(18, 22, 7), `<path d="M-6 -36C-16 -26 -12 -12 -4 -14C-2 -22 4 -30 10 -34Z" fill="${dk}" ${st(2.4)}/>` + `<ellipse cx="0" cy="16" rx="19" ry="15" fill="${lt}"/>` + both(s => `<ellipse cx="${s * 7}" cy="15" rx="2.6" ry="3.6" fill="${dk}"/>`)];
        case "pig": return [both(s => `<path d="M${s * 16} -30L${s * 36} -46L${s * 36} -18Z" fill="${skinL}" ${st()}/>`), `<ellipse cx="0" cy="11" rx="12" ry="8.5" fill="${dk}" ${st(2)}/>` + both(s => `<ellipse cx="${s * 4.4}" cy="11" rx="2.2" ry="3.2" fill="#6b2a3a"/>`)];
        case "dolphin": return [`<path d="M-6 -32C2 -62 20 -68 24 -64C16 -54 14 -44 16 -32Z" fill="${skinL}" ${st()}/>`, `<ellipse cx="0" cy="18" rx="15" ry="8" fill="${lt}" ${st(2)}/><ellipse cx="0" cy="-28" rx="3" ry="1.8" fill="${dk}"/>`];
        case "panda": return [both(s => `<circle cx="${s * 28}" cy="-28" r="12" fill="#1c1a1e" ${st()}/>`), both(s => `<ellipse cx="${s * 15}" cy="-1" rx="10" ry="12" transform="rotate(${s * -20} ${s * 15} -1)" fill="#1c1a1e"/>`) + nose(9)];
        case "kangaroo": return [ptEars(16, 34, 7), muzzle(14, 14, 11) + nose(8)];
        case "fox": return [ptEars(20, 30, 12, "#ffffff") + both(s => `<path d="M${s * 22} -50L${s * 24} -58L${s * 28} -48Z" fill="#2a1a1e"/>`), `<path d="M-36 4C-24 26 -8 30 0 30C8 30 24 26 36 4C24 10 8 8 0 2C-8 8 -24 10 -36 4Z" fill="#ffffff"/>` + nose(10)];
        case "snake": return ["", Array.from({ length: 10 }, (_, i) => `<path d="M${-24 + (i % 5) * 12} ${-26 + Math.floor(i / 5) * 9}q6 6 12 0" fill="none" stroke="${dk}" stroke-width="${sw(1.8)}"/>`).join("") + both(s => `<circle cx="${s * 4}" cy="8" r="1.4" fill="${dk}"/>`)];
        case "giraffe": return [both(s => `<path d="M${s * 12} -30L${s * 14} -50" stroke="${line}" stroke-width="${sw(7)}" stroke-linecap="round"/><path d="M${s * 12} -30L${s * 14} -50" stroke="${skinL}" stroke-width="${sw(4)}" stroke-linecap="round"/><circle cx="${s * 14}" cy="-52" r="5" fill="#8a5a2a" ${st(2.4)}/><ellipse cx="${s * 38}" cy="-16" rx="12" ry="6" transform="rotate(${s * -20} ${s * 38} -16)" fill="${skinL}" ${st()}/>`), muzzle(15, 17, 12) + both(s => `<ellipse cx="${s * 6}" cy="12" rx="2" ry="3" fill="${dk}"/>`) + [[-24, -18, 6], [22, -22, 5], [-28, 8, 4], [28, 6, 5], [0, -28, 4]].map(([x, y, r]) => `<path d="M${x} ${y}m-${r} 0l${r} -${r}l${r} ${r}l-${r} ${r}Z" fill="#c07a2a" opacity=".85"/>`).join("")];
        case "teddy": return ["", `<ellipse cx="0" cy="13" rx="14" ry="10" fill="${lt}"/><ellipse cx="0" cy="7" rx="5" ry="3.6" fill="#2a1a1e"/><path d="M0 -36V-18" stroke="${dk}" stroke-width="${sw(1.6)}" stroke-dasharray="${sw(3)} ${sw(2.4)}"/>` + `<path d="M-30 -14l6 3M-29 -8l6 0" stroke="${dk}" stroke-width="${sw(1.6)}"/>`];
        case "rat": return ["", `<ellipse cx="0" cy="11" rx="12" ry="9" fill="${lt}"/><ellipse cx="0" cy="6" rx="4.4" ry="3.4" fill="#ff8fa8" stroke="${line}" stroke-width="${sw(1)}"/>` + both(s => `<path d="M${s * 10} 10L${s * 30} 6M${s * 10} 13L${s * 30} 14" stroke="${line}" stroke-width="${sw(1.1)}" opacity=".6"/>`)];
        case "cat": return ["", `<path d="M-3.5 6h7l-3.5 4.5Z" fill="#ff8fa8" stroke="${OUT}" stroke-width="${sw(1)}"/>` + both(s => `<path d="M${s * 10} 9L${s * 32} 5M${s * 10} 12L${s * 32} 13" stroke="${line}" stroke-width="${sw(1.1)}" opacity=".6"/>`)];
        default: return [roundEars(10, 27, -27), muzzle() + nose()];
    }
}
