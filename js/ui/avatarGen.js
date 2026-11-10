// =====================================================================
// Player image generator — pure functions, no DOM. buildAvatar(opts)
// returns a 256x256 SVG string drawn from the chosen options; the same
// options + seed always give the same picture ("다시 생성" = new seed).
// Humanoid races (torso + head, neck, arms/hands, legs): rabbit, bear,
// human, cloud, kalisto, devil, angel, invisible, jiangshi, other.
// Shape races (a body with arms/legs only, like Melon Donglee): ant,
// smile, donglee, triangle, square, rectangle, trapezoid (+ ghost).
// Head parts are drawn in a head-local frame (head = ellipse 38x36 at
// 0,0) so hair / wigs / hats / glasses fit every body.
// =====================================================================
const OUT = "#3a2a24";
const f1 = n => +(+n).toFixed(1);
let K = 1; // stroke scale for the current head frame
const sw = n => +(n * K).toFixed(2);

function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const isHex = c => /^#[0-9a-f]{6}$/i.test(c || "");
export function shade(hex, k) { // k < 0 darker, k > 0 lighter
    if (!isHex(hex)) return hex;
    const n = parseInt(hex.slice(1), 16);
    const ch = s => { let v = (n >> s) & 255; v = k < 0 ? v * (1 + k) : v + (255 - v) * k; return Math.round(v).toString(16).padStart(2, "0"); };
    return "#" + ch(16) + ch(8) + ch(0);
}
const lum = hex => { if (!isHex(hex)) return 0.6; const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ------------------------------------------------------------ option lists
// [id, label, body kind (h = humanoid, s = shape), default skin]
export const RACES = [
    ["rabbit", "토끼", "h", "#ffffff"], ["bear", "곰돌이", "h", "#b98455"], ["human", "인간", "h", "#f6d3b0"], ["ant", "개미", "s", "#5a5462"],
    ["smile", "스마일", "s", "#ffd83b"], ["cloud", "구름", "h", "#eaf6ff"], ["kalisto", "칼리스토", "h", "#5cc469"], ["devil", "데빌", "h", "#e2463f"],
    ["angel", "엔젤", "h", "#fff3d6"], ["ghost", "고스트", "s", "#f4f4ff"], ["invisible", "투명인간", "h", "#cfe9ff"], ["jiangshi", "강시", "h", "#b7d9c2"],
    ["donglee", "동글이", "s", "#a8e070"], ["triangle", "삼각형", "s", "#ff9f43"], ["square", "사각형 (정사각형)", "s", "#5fa8ff"], ["rectangle", "직사각형", "s", "#b388ff"],
    ["trapezoid", "사다리꼴", "s", "#4dd0b1"], ["other", "기타 (직접 입력)", "h", "#f6d3b0"]
];
const RACE = Object.fromEntries(RACES.map(r => [r[0], { id: r[0], ko: r[1], kind: r[2], skin: r[3] }]));
const ETH = { rabbit: "rabbit", bear: "bear", teddy: "bear", human: "human", ant: "ant", smile: "smile", cloud: "cloud", kalisto: "kalisto", devil: "devil", angel: "angel", ghost: "ghost", invisible: "invisible", jiangshi: "jiangshi", donglee: "donglee", triangle: "triangle", square: "square", rectangle: "rectangle", trapezoid: "trapezoid" };
export const raceFromEthnicity = e => ETH[String(e || "").trim().toLowerCase()] || "other";

export const HUMAN_TYPES = [["asian", "동양인"], ["western", "서양인"], ["black", "흑인 (피부색 자동)"]];
export const SKIN_COLORS = [["auto", "인종 기본"], ["#fde0cf", "밝은 살구"], ["#f6d3b0", "살구"], ["#e0ac69", "구릿빛"], ["#a86b3c", "갈색"], ["#5b3a26", "흑갈색"], ["#2b1b14", "검정"], ["#ffffff", "하양"], ["#ffc2d4", "분홍"], ["#e2463f", "빨강"], ["#ff9f43", "주황"], ["#ffd83b", "노랑"], ["#a8e070", "연두"], ["#5cc469", "초록"], ["#7ad7ff", "하늘"], ["#5f8bff", "파랑"], ["#b388ff", "보라"], ["#9aa3ad", "회색"], ["rainbow", "레인보우"]];
export const HAIR_COLORS = [["#1c1a1e", "검정"], ["#4a2e1f", "흑갈색"], ["#7a4a2a", "갈색"], ["#a8703c", "밝은 갈색"], ["#e9c46a", "금발"], ["#f1e9d2", "플래티넘"], ["#c0392b", "빨강"], ["#f08a3c", "주황"], ["#ff7ab8", "분홍"], ["#8e5cf0", "보라"], ["#3f7df0", "파랑"], ["#58d6b3", "민트"], ["#3fae5a", "초록"], ["#9aa3ad", "회색"], ["#ffffff", "흰색"], ["rainbow", "레인보우"]];
export const SEASONS = [["spring", "봄"], ["summer", "여름"], ["fall", "가을"], ["winter", "겨울"]];
export const HAIR_STYLES = {
    female: ["긴 생머리", "포니테일", "삐삐머리 (양갈래)", "곱슬머리 (히피펌)", "봅컷 (단발)", "히메컷", "똥머리 (번)", "스페이스 번", "웨이브 롱", "픽시 숏컷", "허쉬컷 (레이어드)", "양갈래 땋은 머리", "하프업 번", "사이드 포니테일", "태슬컷 중단발"],
    male: ["댄디컷", "투블럭", "가르마펌 (5:5)", "쉼표머리", "리젠트 (포마드)", "크루컷", "버즈컷 (반삭)", "울프컷", "히피 곱슬펌", "아프로", "모히칸", "장발", "맨번", "드레드", "스파이키 (샤기)"]
};
// [name, type, color 1, color 2, decoration]
const HAT_SPECS = {
    male: [
        ["야구모자 (네이비)", "cap", "#1f3a6b", "#ffffff"], ["스냅백 (블랙)", "snap", "#1c1a1e", "#e2463f"], ["비니 (그레이)", "beanie", "#8b929c", "#6d737c"], ["페도라 (브라운)", "fedora", "#7a4a2a", "#2b1b14"],
        ["버킷햇 (카키)", "bucket", "#7c8452", "#5c6338"], ["베레모 (블랙)", "beret", "#1c1a1e", "#1c1a1e"], ["실크햇 (탑햇)", "tophat", "#1c1a1e", "#c0392b"], ["카우보이 모자", "cowboy", "#b07a3e", "#5a3418"],
        ["밀짚모자", "boater", "#e8c878", "#2b1b14"], ["헌팅캡 (뉴스보이)", "newsboy", "#6b5a48", "#4a3d30"], ["볼캡 (레드)", "cap", "#d6332c", "#ffffff"], ["안전모", "hardhat", "#ffc928", "#d49a00"],
        ["요리사 모자", "chef", "#ffffff", "#e6e6e6"], ["파티 고깔", "cone", "#3f7df0", "#ffd83b", "pom"], ["왕관", "crown", "#f5c542", "#e2463f"], ["선바이저", "visor", "#ffffff", "#1f3a6b"],
        ["두건 (반다나)", "bandana", "#c0392b", "#ffffff"], ["산타 모자", "santa", "#d6332c", "#ffffff"], ["군밤 모자", "trapper", "#6b4a2f", "#e8d8c0"], ["중절모 (그레이 보울러)", "bowler", "#6d737c", "#1c1a1e"]
    ],
    female: [
        ["고급 보넷", "bonnet", "#f6c8d8", "#ffffff"], ["리본 버킷햇", "bucket", "#f3e3c8", "#ff7ab8", "bow"], ["챙 넓은 선햇", "sunhat", "#f0d9a0", "#c0392b"], ["클로슈", "cloche", "#7a3a5a", "#f6c8d8", "flower"],
        ["베레모 (레드)", "beret", "#c0392b", "#c0392b"], ["리본 머리띠", "band", "#ff7ab8", "#ff7ab8", "bow"], ["꽃 화관", "band", "#5cc469", "#ff9fc0", "flowers"], ["티아라", "tiara", "#dfe6f0", "#7ad7ff"],
        ["고양이 귀 머리띠", "band", "#1c1a1e", "#ff9fc0", "cat"], ["폼폼 비니", "beanie", "#ffb3cf", "#ffffff", "pom"], ["볼캡 (핑크)", "cap", "#ff9fc0", "#ffffff"], ["밀짚 리본 모자", "boater", "#e8c878", "#ff7ab8", "bow"],
        ["필박스 + 베일", "pillbox", "#1c1a1e", "#1c1a1e"], ["페도라 (아이보리)", "fedora", "#f3ead8", "#7a4a2a"], ["선바이저 (화이트)", "visor", "#ffffff", "#ff7ab8"], ["헤어 스카프", "bandana", "#58d6b3", "#ffffff"],
        ["산타 모자", "santa", "#d6332c", "#ffffff"], ["왕관 (로즈골드)", "crown", "#f0a8a0", "#ffffff"], ["토끼 귀 머리띠", "band", "#ffffff", "#ffc2d4", "bunny"], ["캉캉 모자 (보터)", "boater", "#ffffff", "#1f3a6b"]
    ]
};
export const HATS = { male: HAT_SPECS.male.map(h => h[0]), female: HAT_SPECS.female.map(h => h[0]) };
// [name, lens shape, half width, half height, frame colour, frame thickness, lens colour (sunglasses)]
const GLASS_SPECS = [
    ["동그란 금테", "round", 9, 9, "#c9a227", 1.6], ["동그란 뿔테", "round", 9.5, 9.5, "#1c1a1e", 3], ["스퀘어 블랙", "soft", 10, 8, "#1c1a1e", 2.6], ["직사각 은테", "rect", 10.5, 6, "#aab2bd", 1.6],
    ["오벌 로즈골드", "round", 10.5, 7, "#e0a090", 1.6], ["캣아이 레드", "cat", 9.5, 7, "#c0392b", 2.6], ["에비에이터 금테", "aviator", 10.5, 8.5, "#c9a227", 1.6], ["하금테 (브로우라인)", "half", 10, 7.5, "#1c1a1e", 1.6],
    ["무테", "rimless", 10, 7, "#8b929c", 0.9], ["육각 금테", "hex", 9.5, 9, "#c9a227", 1.6], ["오버사이즈 투명테", "soft", 12, 10.5, "#d8dee6", 2.6], ["작은 타원 (할머니 안경)", "round", 7, 4.5, "#8b6a3a", 1.6],
    ["하트 핑크", "heart", 9, 9, "#ff7ab8", 2.2], ["팔각 블랙", "octa", 9.5, 9, "#1c1a1e", 2], ["웰링턴 호피", "soft", 10.5, 8.5, "#8a5a2a", 3.2], ["반무테", "half", 10.5, 6.5, "#3f7df0", 1.4],
    ["투브릿지 실버", "aviator", 10, 8, "#aab2bd", 1.8, null, "double"], ["폴리곤 실버", "hex", 10.5, 7.5, "#aab2bd", 1.6], ["굵은 화이트", "soft", 10.5, 8.5, "#ffffff", 3.4], ["외알 안경 (모노클)", "mono", 9, 9, "#c9a227", 1.8]
];
const SUN_SPECS = [
    ["에비에이터 블랙", "aviator", 10.5, 8.5, "#c9a227", 1.6, "#1c1a1e"], ["웨이페어러", "soft", 10.5, 8, "#1c1a1e", 3, "#2a2a30"], ["캣아이 블랙", "cat", 10, 7, "#1c1a1e", 2.8, "#2a2a30"], ["라운드 레논", "round", 8.5, 8.5, "#c9a227", 1.6, "#5a3a1a"],
    ["미러 블루", "aviator", 10.5, 8.5, "#aab2bd", 1.6, "mirror-blue"], ["스포츠 고글", "shield", 0, 0, "#e2463f", 2.4, "mirror-fire"], ["오버사이즈 브라운", "soft", 12.5, 10.5, "#5a3418", 2.6, "#7a4a2a"], ["하트 레드", "heart", 9.5, 9.5, "#c0392b", 2.4, "#e2463f"],
    ["틴트 옐로", "round", 10, 8, "#c9a227", 1.6, "#ffd83b"], ["틴트 핑크", "soft", 10.5, 8, "#e0a090", 1.8, "#ff9fc0"], ["스퀘어 그라데이션", "rect", 11, 8, "#1c1a1e", 2.4, "grad"], ["클럽마스터", "half", 10.5, 7.5, "#1c1a1e", 1.6, "#2a2a30"],
    ["육각 미러", "hex", 10, 9.5, "#c9a227", 1.6, "mirror-fire"], ["버터플라이", "cat", 12, 9.5, "#7a3a5a", 2.6, "grad"], ["실드 원피스", "shield", 0, 0, "#1c1a1e", 2.4, "#1c1a1e"], ["스팀펑크 라운드", "round", 8.5, 8.5, "#8a5a2a", 3.4, "#3fae5a"],
    ["화이트 프레임", "soft", 10.5, 8.5, "#ffffff", 3.2, "#2a2a30"], ["네온 그린", "rect", 11, 6, "#58ff7a", 2.4, "#1c1a1e"], ["타이니 매트릭스", "round", 7, 3.6, "#1c1a1e", 1.6, "#1c1a1e"], ["별 모양", "star", 10, 10, "#ffd83b", 2, "#8e5cf0"]
];
export const GLASSES = GLASS_SPECS.map(g => g[0]);
export const SUNGLASSES = SUN_SPECS.map(g => g[0]);
// lip, shadow [colour, opacity], liner 0 none / 1 thin / 2 wing / 3 thick, blush [colour, opacity, dy], extras
const MAKEUP_SPECS = [
    ["내추럴 (순수 화장)", { lip: "#e8909a", blush: ["#ffb0b8", 0.4, 0] }],
    ["짙은 화장 (스모키)", { lip: "#8a1c2c", shadow: ["#2a2030", 0.75], liner: 3, lash: 1, blush: ["#c86a70", 0.35, 0] }],
    ["볼터치 (블러셔)", { lip: "#f08a94", blush: ["#ff7a90", 0.75, 0], big: 1 }],
    ["레드립 클래식", { lip: "#c8102e", liner: 1, lash: 1 }],
    ["코랄 과즙 메이크업", { lip: "#ff7a5a", shadow: ["#ffb08a", 0.5], blush: ["#ff9a7a", 0.6, -2] }],
    ["숙취 메이크업 (이가리)", { lip: "#e0607a", blush: ["#ff6a8a", 0.7, -8], big: 1 }],
    ["캣아이 라이너", { lip: "#d0505a", liner: 2, lash: 1 }],
    ["글리터 아이", { lip: "#f08aa8", shadow: ["#ffd0e8", 0.7], glitter: 1, lash: 1 }],
    ["누드톤 MLBB", { lip: "#b87868", shadow: ["#c8a088", 0.45], liner: 1 }],
    ["그라데이션 립", { lip: "#ffc0c8", lipIn: "#e0203a", blush: ["#ffb0b8", 0.35, 0] }],
    ["도화살 핑크", { lip: "#f06a90", shadow: ["#ff90b0", 0.6], under: ["#ff90b0", 0.5], blush: ["#ff90b0", 0.5, -3] }],
    ["Y2K 블루 섀도", { lip: "#f0a0b8", shadow: ["#5fa8ff", 0.75], glitter: 1, gloss: 1 }],
    ["고스 다크", { lip: "#2a1020", shadow: ["#1c1a1e", 0.8], liner: 3 }],
    ["주근깨 메이크업", { lip: "#e89080", freckles: 1, blush: ["#ffa890", 0.5, -2] }],
    ["글로시 물광", { lip: "#f07888", gloss: 1, glow: 1, blush: ["#ffc0c0", 0.4, 0] }]
];
export const MAKEUPS = MAKEUP_SPECS.map(m => m[0]);
// female: [name, earring, necklace, bracelet, metal]   male: [name, watch strap, watch face, necklace, metal]
const GOLD = "#e8b923", SILVER = "#c8d0d8", ROSE = "#f0a8a0", PEARL = "#fff6ea";
const ACC_SPECS = {
    female: [
        ["골드 링 귀걸이 세트", "hoop", "chain", "bangle", GOLD], ["진주 세트", "pearl", "pearl", "beads", PEARL], ["실버 드롭 세트", "drop", "pendant", "chain", SILVER], ["하트 로즈골드 세트", "heart", "heart", "bangle", ROSE],
        ["블랙 초커 세트", "stud", "choker", "bangle", "#1c1a1e"], ["별 골드 세트", "star", "pendant", "chain", GOLD], ["루비 세트", "drop", "pendant", "bangle", "#e0203a"], ["사파이어 세트", "stud", "pendant", "beads", "#3f7df0"],
        ["에메랄드 세트", "drop", "chain", "bangle", "#2fae6a"], ["롱 체인 귀걸이 세트", "long", "chain", "chain", SILVER], ["진주 초커 세트", "pearl", "choker", "beads", PEARL], ["큰 링 귀걸이 + 뱅글", "bighoop", "none", "bangle", GOLD],
        ["미니 스터드 + 실팔찌", "stud", "chain", "chain", ROSE], ["비즈 세트 (무지개)", "pearl", "pearl", "beads", "#ff7ab8"], ["자수정 세트", "drop", "heart", "beads", "#8e5cf0"], ["골드 롱 드롭 세트", "long", "pendant", "bangle", GOLD],
        ["실버 링 세트", "hoop", "choker", "bangle", SILVER], ["하트 스터드 + 진주 목걸이", "heart", "pearl", "chain", "#ff5a7a"], ["별 실버 세트", "star", "chain", "beads", SILVER], ["다이아 풀세트", "drop", "pendant", "chain", "#e8f6ff"]
    ],
    male: [
        ["가죽 시계 + 실버 체인", "#6b4a2f", "#ffffff", "chain", SILVER], ["메탈 시계 + 군번줄", SILVER, "#1f3a6b", "tag", SILVER], ["블랙 스포츠 시계", "#1c1a1e", "#58ff7a", "none", SILVER], ["골드 시계 + 골드 체인", GOLD, "#ffffff", "chain", GOLD],
        ["다이버 시계 + 가죽끈 목걸이", "#1f3a6b", "#1c1a1e", "cord", "#6b4a2f"], ["스마트워치", "#2a2a30", "#3f7df0", "none", SILVER], ["빈티지 시계 + 펜던트", "#8a5a2a", "#f3ead8", "pendant", GOLD], ["실버 시계 + 굵은 체인", SILVER, "#ffffff", "thick", SILVER],
        ["나토밴드 시계", "#5c6338", "#1c1a1e", "tag", SILVER], ["레드 스포츠 시계", "#d6332c", "#1c1a1e", "none", SILVER], ["로즈골드 시계 + 체인", ROSE, "#ffffff", "chain", ROSE], ["화이트 시계 + 비즈 목걸이", "#ffffff", "#ffffff", "bead", "#6b4a2f"],
        ["블랙 가죽 시계 + 군번줄", "#1c1a1e", "#ffffff", "tag", "#2a2a30"], ["골드 시계 + 굵은 골드 체인", GOLD, "#1c1a1e", "thick", GOLD], ["네이비 시계 + 상어이빨 목걸이", "#1f3a6b", "#ffffff", "tooth", "#f3ead8"], ["오렌지 시계", "#f08a3c", "#1c1a1e", "none", SILVER],
        ["티타늄 시계 + 실버 펜던트", "#8b929c", "#2a2a30", "pendant", SILVER], ["브라운 가죽 시계 + 가죽끈", "#8a5a2a", "#ffffff", "cord", "#3a2a24"], ["그린 시계 + 골드 체인", "#2f6a3a", "#2f6a3a", "chain", GOLD], ["올블랙 시계 + 블랙 체인", "#1c1a1e", "#1c1a1e", "chain", "#2a2a30"]
    ]
};
export const ACCS = { male: ACC_SPECS.male.map(a => a[0]), female: ACC_SPECS.female.map(a => a[0]) };

// ---- clothes: top/bottom sets, 20 per gender per season ("top.colour.bottom.colour")
const COL = {
    white: ["화이트", "#f7f7f5"], black: ["블랙", "#25232a"], gray: ["그레이", "#9aa0a8"], char: ["차콜", "#4a4d55"], navy: ["네이비", "#243a66"], blue: ["블루", "#3f7df0"],
    sky: ["스카이", "#9ed0f5"], denim: ["데님", "#5a82b8"], red: ["레드", "#d6332c"], wine: ["와인", "#7a2038"], pink: ["핑크", "#ff9fc0"], lav: ["라벤더", "#c8b0f0"],
    yellow: ["옐로", "#ffd84a"], orange: ["오렌지", "#f08a3c"], green: ["그린", "#3f9a5a"], mint: ["민트", "#8ee0c8"], khaki: ["카키", "#7c8452"], beige: ["베이지", "#dcc8a0"],
    cream: ["크림", "#f6ecd6"], brown: ["브라운", "#8a5a34"]
};
const TOP = {
    tee: { ko: "반팔 티", sl: 1, neck: "crew" }, stripe: { ko: "스트라이프 티", sl: 1, neck: "crew", pat: "stripe" }, long: { ko: "긴팔 티", sl: 2, neck: "crew" },
    shirt: { ko: "셔츠", sl: 2, neck: "collar", btn: 1 }, linen: { ko: "린넨 반팔 셔츠", sl: 1, neck: "collar", btn: 1 }, polo: { ko: "폴로 셔츠", sl: 1, neck: "collar" },
    hawaii: { ko: "하와이안 셔츠", sl: 1, neck: "collar", pat: "dots", btn: 1 }, tank: { ko: "민소매", sl: 0, neck: "crew" }, jersey: { ko: "저지 유니폼", sl: 1, neck: "v", pat: "number" },
    hood: { ko: "후드티", sl: 2, neck: "hood", pocket: 1 }, sweat: { ko: "맨투맨", sl: 2, neck: "crew", pat: "logo" }, knit: { ko: "니트", sl: 2, neck: "crew", pat: "rib" },
    turtle: { ko: "터틀넥", sl: 2, neck: "turtle" }, cardi: { ko: "가디건", sl: 2, open: 1, btn: 1 }, jacket: { ko: "자켓", sl: 2, open: 1, lapel: 1 }, bomber: { ko: "항공점퍼", sl: 2, open: 1, zip: 1 },
    coat: { ko: "롱코트", sl: 2, len: "coat", open: 1, lapel: 1, btn: 1 }, trench: { ko: "트렌치코트", sl: 2, len: "coat", open: 1, lapel: 1, belt: 1 },
    puffer: { ko: "숏패딩", sl: 2, pat: "quilt", zip: 1, neck: "turtle", puff: 1 }, longpuff: { ko: "롱패딩", sl: 2, len: "coat", pat: "quilt", zip: 1, neck: "turtle", puff: 1 },
    fleece: { ko: "플리스", sl: 2, zip: 1, neck: "turtle", puff: 1 }, vest: { ko: "니트 조끼", sl: 2, slc: 1, neck: "v" }, blouse: { ko: "블라우스", sl: 1, neck: "round" },
    crop: { ko: "크롭티", sl: 1, len: "crop", neck: "crew" }, dress: { ko: "원피스", sl: 1, len: "dress", neck: "crew" }, sundress: { ko: "끈 원피스", sl: 0, len: "dress", neck: "v" },
    knitdress: { ko: "니트 원피스", sl: 2, len: "dress", neck: "turtle", pat: "rib" }
};
const BOT = {
    shorts: { ko: "반바지", leg: 196, w: 17 }, pants: { ko: "면바지", leg: 224, w: 16 }, jeans: { ko: "청바지", leg: 224, w: 16, stitch: 1 }, wide: { ko: "와이드 팬츠", leg: 224, w: 21 },
    slacks: { ko: "슬랙스", leg: 224, w: 15, crease: 1 }, jogger: { ko: "조거 팬츠", leg: 221, w: 17, cuff: 1 }, legging: { ko: "레깅스", leg: 224, w: 13 },
    skirt: { ko: "미니스커트", sk: 192, f: 10 }, pleat: { ko: "플리츠 스커트", sk: 194, f: 14, pleat: 1 }, midi: { ko: "미디스커트", sk: 210, f: 15 }, longsk: { ko: "롱스커트", sk: 222, f: 17 }, none: { ko: "" }
};
const OUTFIT_SRC = {
    male: {
        spring: "tee.white.jeans.denim shirt.sky.slacks.beige hood.gray.jogger.black cardi.beige.pants.navy jacket.navy.pants.beige sweat.green.jeans.denim stripe.navy.pants.white polo.mint.slacks.gray long.white.wide.khaki bomber.khaki.jeans.black shirt.white.jeans.denim knit.cream.slacks.brown vest.navy.slacks.gray hood.yellow.shorts.black jacket.denim.pants.black sweat.pink.jeans.denim shirt.pink.pants.white long.black.jogger.gray trench.beige.slacks.black polo.white.pants.navy",
        summer: "tee.white.shorts.navy hawaii.red.shorts.beige tank.black.shorts.gray linen.white.shorts.khaki polo.navy.shorts.white jersey.red.shorts.black stripe.blue.shorts.white tee.yellow.shorts.denim hawaii.blue.shorts.white linen.sky.pants.beige tank.white.shorts.orange tee.mint.shorts.black jersey.blue.shorts.white tee.black.jeans.denim polo.pink.shorts.navy linen.beige.wide.white tee.orange.shorts.khaki hawaii.green.shorts.black tank.gray.jogger.black tee.sky.slacks.white",
        fall: "knit.brown.jeans.denim shirt.wine.slacks.black jacket.brown.pants.beige hood.khaki.jogger.black cardi.gray.slacks.char trench.beige.jeans.denim sweat.navy.pants.beige turtle.black.slacks.gray vest.brown.pants.khaki bomber.black.jeans.denim knit.orange.pants.brown shirt.khaki.jeans.black jacket.denim.pants.beige long.wine.jeans.black coat.khaki.slacks.black hood.wine.jeans.denim cardi.navy.pants.gray turtle.cream.slacks.brown sweat.gray.jogger.navy jacket.char.slacks.char",
        winter: "puffer.black.jeans.denim longpuff.navy.jogger.black coat.char.slacks.black turtle.white.slacks.gray fleece.cream.jeans.denim puffer.red.pants.black coat.beige.jeans.black knit.navy.slacks.gray hood.black.jogger.gray longpuff.white.jeans.denim puffer.khaki.pants.brown coat.navy.slacks.char fleece.gray.jogger.black turtle.wine.pants.black knit.green.jeans.denim puffer.orange.jogger.black coat.brown.pants.beige longpuff.black.slacks.black fleece.navy.pants.khaki puffer.sky.jeans.white"
    },
    female: {
        spring: "blouse.white.pleat.pink cardi.pink.skirt.white dress.yellow.none.white shirt.sky.jeans.denim knit.lav.midi.white crop.white.wide.beige jacket.beige.skirt.black hood.mint.legging.black trench.beige.pants.white stripe.navy.skirt.white dress.pink.none.white vest.yellow.pleat.navy blouse.lav.slacks.white long.white.longsk.green sweat.pink.jeans.denim cardi.cream.midi.brown jacket.denim.longsk.white shirt.white.pleat.gray crop.pink.jeans.denim knitdress.cream.none.white",
        summer: "sundress.white.none.white crop.white.shorts.denim tank.pink.skirt.white blouse.sky.shorts.white tee.yellow.skirt.denim sundress.red.none.white linen.white.wide.beige crop.black.skirt.black tank.white.longsk.blue hawaii.pink.shorts.white dress.sky.none.white tee.white.pleat.navy stripe.red.shorts.white sundress.yellow.none.white crop.mint.jeans.white blouse.white.midi.yellow tank.black.wide.black tee.pink.shorts.gray dress.green.none.white crop.lav.skirt.white",
        fall: "knit.cream.pleat.brown trench.beige.skirt.black cardi.brown.jeans.denim turtle.black.midi.khaki jacket.wine.slacks.black knitdress.brown.none.white shirt.white.longsk.wine hood.gray.legging.black vest.khaki.pleat.brown coat.khaki.jeans.denim blouse.cream.wide.brown sweat.orange.skirt.black knit.wine.jeans.black cardi.gray.midi.char jacket.char.pleat.gray turtle.cream.wide.beige dress.wine.none.white long.black.longsk.khaki bomber.khaki.skirt.black knit.pink.slacks.gray",
        winter: "coat.cream.skirt.black longpuff.white.legging.black puffer.pink.jeans.denim turtle.white.midi.gray knitdress.wine.none.white fleece.cream.legging.char coat.pink.pleat.gray puffer.black.wide.black knit.red.skirt.black longpuff.black.jeans.denim coat.char.longsk.black turtle.black.pleat.wine fleece.pink.jogger.gray puffer.lav.legging.black coat.brown.midi.cream knit.cream.jeans.denim longpuff.beige.slacks.black knitdress.gray.none.white puffer.white.skirt.pink coat.wine.slacks.black"
    }
};
const SHOES = { spring: "#f5f5f5", summer: "#c98b4a", fall: "#6b4a2f", winter: "#3a2f2a" };
function outfit(gender, season, i) {
    const list = (OUTFIT_SRC[gender] || OUTFIT_SRC.male)[season] || OUTFIT_SRC.male.spring;
    const rows = list.split(" ");
    const [t, tc, b, bc] = rows[Math.max(0, Math.min(rows.length - 1, i | 0))].split(".");
    return { top: TOP[t] || TOP.tee, tc: (COL[tc] || COL.white)[1], bot: BOT[b] || BOT.pants, bc: (COL[bc] || COL.navy)[1],
        name: `${(COL[tc] || COL.white)[0]} ${(TOP[t] || TOP.tee).ko}` + (b === "none" ? "" : ` + ${(COL[bc] || COL.navy)[0]} ${(BOT[b] || BOT.pants).ko}`) };
}
export const outfitNames = (gender, season) => ((OUTFIT_SRC[gender] || OUTFIT_SRC.male)[season] || "").split(" ").map((_, i) => outfit(gender, season, i).name);

export const DEFAULTS = {
    gender: "male", race: "human", raceText: "", human: "asian", skin: "auto", hair: "#1c1a1e", hairStyle: 0,
    wig: -1, wigColor: "#7a4a2a", hat: -1, glasses: -1, sun: -1, makeup: -1, mouthLines: false, eyeWrinkle: false, leprosy: false,
    acc: -1, season: "spring", outfit: 0, seed: 1
};

// ------------------------------------------------------------ hair / wigs (head-local)
const CAP = "M-39 -2C-44 -46 44 -46 39 -2C32 -20 16 -27 0 -27C-16 -27 -32 -20 -39 -2Z";
const FRINGE = "M-39 0C-44 -46 44 -46 39 0L36 -10Q0 -3 -36 -10Z";
const SIDE = "M-39 0C-44 -46 44 -46 39 -4C34 -18 22 -26 8 -26C-4 -12 -24 -8 -39 0Z";
const PART = "M0 -39C-34 -42 -46 -18 -40 4C-36 -12 -22 -24 0 -29C22 -24 36 -12 40 4C46 -18 34 -42 0 -39Z";
const SPIKES = "M-38 -6L-41 -30L-29 -24L-25 -45L-12 -32L-2 -51L8 -32L22 -47L26 -26L41 -33L38 -6C30 -22 16 -27 0 -27C-16 -27 -30 -22 -38 -6Z";
const longBack = L => `M-41 -12C-50 20 -48 ${L} -40 ${L}H40C48 ${L} 50 20 41 -12C38 -42 -38 -42 -41 -12Z`;
const jagBack = L => `M-41 -12C-50 16 -48 ${L - 8} -44 ${L}L-34 ${L - 8}L-24 ${L}L-12 ${L - 8}L0 ${L}L12 ${L - 8}L24 ${L}L34 ${L - 8}L44 ${L}C48 ${L - 8} 50 16 41 -12C38 -42 -38 -42 -41 -12Z`;
const tailD = (x, y, len, s) => `M${x} ${y}C${x + s * 26} ${y - 4} ${x + s * 30} ${f1(y + len * 0.6)} ${x + s * 14} ${y + len}C${x + s * 12} ${f1(y + len * 0.5)} ${x + s * 6} ${f1(y + len * 0.25)} ${x - s * 4} ${y + 12}Z`;

function hairParts(gender, idx, col) {
    const c = col === "rainbow" ? "url(#rbh)" : col;
    const cd = col === "rainbow" ? OUT : shade(col, lum(col) < 0.25 ? 0.38 : -0.38);
    const st = `stroke="${cd}" stroke-width="${sw(2.2)}" stroke-linejoin="round"`;
    const p = (d, extra = "") => `<path d="${d}" fill="${c}" ${st} ${extra}/>`;
    const ci = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${st}/>`;
    const curls = (R0, r, a0, a1, n, oy = -4) => Array.from({ length: n }, (_, i) => { const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180; return ci(f1(R0 * Math.cos(a)), f1(oy + R0 * Math.sin(a)), r); }).join("");
    const tie = (x, y, tc = "#ff5a7a") => `<circle cx="${x}" cy="${y}" r="4" fill="${tc}" stroke="${OUT}" stroke-width="${sw(1.2)}"/>`;
    const both = fn => fn(-1) + fn(1);
    const F = [
        () => [p(longBack(72)), p(PART)],
        () => [p(tailD(18, -36, 62, 1)), p(SIDE) + tie(24, -34)],
        () => [both(s => p(tailD(s * 34, -14, 50, s))), p(FRINGE) + both(s => tie(s * 38, -10))],
        () => [curls(46, 13, 150, 390, 13) + ci(0, -8, 44), curls(34, 10, 195, 345, 7, -6)],
        () => [p("M-42 -12C-52 8 -50 28 -32 28H32C50 28 52 8 42 -12C38 -42 -38 -42 -42 -12Z"), p(FRINGE)],
        () => [p(longBack(74)), p(FRINGE) + both(s => p(`M${s * 41} -8H${s * 30}V15H${s * 41}Z`))],
        () => [ci(0, -47, 14), p(CAP)],
        () => [both(s => ci(s * 27, -40, 12)), p(SIDE)],
        () => [p(longBack(62)) + both(s => [10, 26, 42, 58].map(y => ci(s * 46, y, 8)).join("")), p(PART)],
        () => ["", p(SIDE) + both(s => p(`M${s * 39} -2L${s * 43} 13L${s * 33} 3Z`))],
        () => [p(jagBack(52)), p(SIDE)],
        () => [both(s => [2, 13, 24, 35, 46, 57].map((y, i) => `<ellipse cx="${s * (41 + (i % 2) * 2)}" cy="${y}" rx="7.5" ry="7" fill="${c}" ${st}/>`).join("") + tie(s * 42, 65)), p(PART)],
        () => [p(longBack(58)) + ci(0, -47, 11), p(CAP)],
        () => [p(tailD(36, -12, 58, 1)), p(SIDE) + tie(40, -8)],
        () => [p("M-42 -12C-50 14 -48 38 -44 38H44C48 38 50 14 42 -12C38 -42 -38 -42 -42 -12Z"), p(FRINGE)]
    ];
    const M = [
        () => ["", p(FRINGE)],
        () => ["", p(CAP, 'fill-opacity=".45"') + p("M-31 -20C-36 -52 36 -52 31 -20C16 -30 -16 -30 -31 -20Z")],
        () => ["", p(PART)],
        () => ["", p(SIDE) + `<path d="M-4 -15Q-15 -7 -7 0" fill="none" stroke="${c}" stroke-width="${sw(5)}" stroke-linecap="round"/>`],
        () => ["", p(CAP) + `<ellipse cx="5" cy="-38" rx="27" ry="13" fill="${c}" ${st}/>`],
        () => ["", p("M-37 -8C-40 -42 40 -42 37 -8C28 -24 14 -29 0 -29C-14 -29 -28 -24 -37 -8Z")],
        () => ["", p(CAP, 'fill-opacity=".5" stroke-dasharray="1 3"')],
        () => [p("M-38 -10C-46 10 -44 24 -40 32L-32 22L-24 32L-14 24L0 32L14 24L24 32L32 22L40 32C44 24 46 10 38 -10Z"), p(SPIKES)],
        () => ["", curls(36, 10, 185, 355, 8, -6) + curls(22, 9, 200, 340, 4, -22)],
        () => [ci(0, -12, 54), curls(40, 12, 180, 360, 9, -6)],
        () => ["", p(CAP, 'fill-opacity=".3"') + p("M-9 -22C-13 -66 13 -66 9 -22Z")],
        () => [p(longBack(44)), p(PART)],
        () => [ci(0, -48, 10), p(CAP)],
        () => [[-40, -30, -18, 18, 30, 40].map(x => `<path d="M${x} -14V${34 + Math.abs(x) % 9}" stroke="${c}" stroke-width="${sw(7)}" stroke-linecap="round" fill="none"/>`).join(""), p(CAP) + [-22, -8, 8, 22].map(x => `<path d="M${x} -38V-27" stroke="${cd}" stroke-width="${sw(1.4)}"/>`).join("")],
        () => ["", p(SPIKES)]
    ];
    const list = gender === "female" ? F : M;
    const [back, front] = list[Math.max(0, Math.min(14, idx | 0))]();
    return { back, front };
}

// ------------------------------------------------------------ hats (head-local)
function hatParts(spec) {
    const [, type, c1, c2, deco] = spec;
    const st = `stroke="${OUT}" stroke-width="${sw(2.4)}" stroke-linejoin="round"`;
    const p = (d, fill = c1, extra = "") => `<path d="${d}" fill="${fill}" ${st} ${extra}/>`;
    const dome = (h, w = 36) => `M${-w} -22C${-w} ${f1(-22 - h * 1.35)} ${w} ${f1(-22 - h * 1.35)} ${w} -22Z`;
    const brim = (W, ry = 7) => `<ellipse cx="0" cy="-22" rx="${W}" ry="${ry}" fill="${c1}" ${st}/>`;
    const band = `<path d="M-27 -31Q0 -27 27 -31V-24Q0 -20 -27 -24Z" fill="${c2}" ${st}/>`;
    const capBrim = `M8 -25Q50 -31 63 -17Q40 -12 10 -18Z`;
    const arc = (col, w = 5) => `<path d="M-38 -8C-37 -46 37 -46 38 -8" fill="none" stroke="${OUT}" stroke-width="${sw(w + 2.4)}" stroke-linecap="round"/><path d="M-38 -8C-37 -46 37 -46 38 -8" fill="none" stroke="${col}" stroke-width="${sw(w)}" stroke-linecap="round"/>`;
    let back = "", front = "", top = -52;
    switch (type) {
        case "cap": front = p(dome(27)) + p(capBrim, shade(c1, -0.2)) + `<circle cx="0" cy="-58" r="3" fill="${c2}" ${st}/><path d="M-10 -40h8v8h-8Z" fill="${c2}" opacity=".9"/>`; top = -58; break;
        case "snap": front = p("M-36 -22C-36 -52 -22 -56 0 -56C22 -56 36 -52 36 -22Z") + p("M6 -27H64V-19H6Z", c2) + `<rect x="-12" y="-46" width="16" height="10" rx="2" fill="${c2}"/>`; top = -56; break;
        case "beanie": front = p(dome(31, 37)) + `<rect x="-39" y="-31" width="78" height="13" rx="6" fill="${c2}" ${st}/>` + [-24, -12, 0, 12, 24].map(x => `<path d="M${x} -30v11" stroke="${OUT}" stroke-width="${sw(1)}" opacity=".5"/>`).join(""); top = -62; break;
        case "fedora": front = brim(54) + p("M-28 -24L-25 -50Q-12 -58 0 -51Q12 -58 25 -50L28 -24Q0 -18 -28 -24Z") + band; top = -54; break;
        case "bowler": front = brim(48, 6) + p(dome(25, 28)) + band; top = -54; break;
        case "tophat": front = brim(46, 6) + p("M-24 -24V-66Q0 -70 24 -66V-24Q0 -19 -24 -24Z") + band; top = -66; break;
        case "cowboy": front = p("M-64 -24Q-56 -8 0 -16Q56 -8 64 -24Q56 -34 0 -24Q-56 -34 -64 -24Z") + p("M-26 -22C-30 -58 -8 -52 0 -46C8 -52 30 -58 26 -22Q0 -16 -26 -22Z") + band; top = -54; break;
        case "boater": front = brim(52, 6) + p("M-28 -24V-41Q0 -45 28 -41V-24Q0 -19 -28 -24Z") + `<path d="M-28 -33Q0 -29 28 -33V-25Q0 -20 -28 -25Z" fill="${c2}" ${st}/>`; top = -42; break;
        case "sunhat": front = `<ellipse cx="0" cy="-20" rx="70" ry="11" fill="${c1}" ${st}/>` + p(dome(22, 30)) + band; top = -50; break;
        case "cloche": front = p("M-41 -4C-46 -62 46 -62 41 -4Q0 -20 -41 -4Z") + `<path d="M-38 -22Q0 -34 38 -22" fill="none" stroke="${c2}" stroke-width="${sw(5)}"/>`; top = -48; break;
        case "bucket": front = p("M-27 -46Q0 -52 27 -46L44 -12Q0 -24 -44 -12Z") + `<path d="M-31 -34Q0 -40 31 -34" fill="none" stroke="${c2}" stroke-width="${sw(4)}"/>`; top = -48; break;
        case "beret": front = `<ellipse cx="-4" cy="-36" rx="39" ry="15" fill="${c1}" ${st} transform="rotate(-10 -4 -36)"/><path d="M-2 -51v-7" stroke="${OUT}" stroke-width="${sw(3)}" stroke-linecap="round"/>`; top = -50; break;
        case "newsboy": front = p("M-37 -22C-42 -50 36 -54 41 -27Q20 -21 -37 -22Z") + p("M14 -27Q46 -27 54 -18Q34 -15 14 -20Z", c2) + `<circle cx="0" cy="-46" r="2.6" fill="${c2}"/>`; top = -50; break;
        case "hardhat": front = p(dome(27)) + p("M-43 -25H43V-18H-43Z") + p("M-5 -58H5V-24H-5Z", c2); top = -58; break;
        case "chef": front = `<circle cx="-18" cy="-50" r="15" fill="${c1}" ${st}/><circle cx="18" cy="-50" r="15" fill="${c1}" ${st}/><circle cx="0" cy="-57" r="17" fill="${c1}" ${st}/><rect x="-28" y="-40" width="56" height="18" rx="3" fill="${c1}" ${st}/><path d="M-28 -30h56" stroke="${c2}" stroke-width="${sw(1.5)}"/>`; top = -74; break;
        case "cone": front = p("M-20 -22L0 -74L20 -22Q0 -17 -20 -22Z") + `<path d="M-14 -38L11 -46M-8 -54L5 -58" stroke="${c2}" stroke-width="${sw(4)}"/>`; top = -74; break;
        case "crown": front = p("M-29 -22L-33 -52L-16 -38L0 -57L16 -38L33 -52L29 -22Q0 -17 -29 -22Z") + [[-33, -52], [0, -57], [33, -52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${c2}" ${st}/>`).join("") + `<circle cx="0" cy="-31" r="4" fill="${c2}" ${st}/>`; top = -57; break;
        case "tiara": front = p("M-28 -22Q0 -42 28 -22Q0 -31 -28 -22Z") + p("M0 -50L6 -36L-6 -36Z", c2) + [[-15, -33], [15, -33]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c2}" ${st}/>`).join(""); top = -50; break;
        case "visor": front = arc(c1, 6) + p(capBrim, c1) + `<path d="M12 -23Q40 -27 55 -18" fill="none" stroke="${c2}" stroke-width="${sw(1.6)}"/>`; top = -40; break;
        case "bandana": front = p("M-39 -6C-44 -48 44 -48 39 -6Q0 -24 -39 -6Z") + p("M37 -12L54 -22L51 -3Z") + [[-20, -28], [0, -34], [20, -28], [-10, -20], [10, -20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${c2}"/>`).join(""); top = -40; break;
        case "santa": front = p("M-34 -24C-30 -58 12 -66 44 -34C32 -42 24 -36 34 -24Z") + `<rect x="-39" y="-31" width="78" height="12" rx="6" fill="${c2}" ${st}/><circle cx="45" cy="-33" r="8" fill="${c2}" ${st}/>`; top = -60; break;
        case "trapper": front = p(dome(27)) + p("M-41 -24V10Q-33 15 -30 4V-24Z", c2) + p("M41 -24V10Q33 15 30 4V-24Z", c2) + `<rect x="-39" y="-33" width="78" height="13" rx="6" fill="${c2}" ${st}/>`; top = -58; break;
        case "pillbox": front = `<rect x="-6" y="-52" width="34" height="17" rx="5" fill="${c1}" ${st} transform="rotate(8 10 -44)"/>` + `<path d="M-30 -34Q0 -26 34 -36L30 2Q0 8 -26 2Z" fill="${c2}" fill-opacity=".14" stroke="${c2}" stroke-width="${sw(0.8)}" stroke-dasharray="2 3"/>`; top = -54; break;
        case "bonnet":
            back = `<circle cx="0" cy="-8" r="53" fill="${c1}" ${st}/>` + Array.from({ length: 13 }, (_, i) => { const a = (150 + i * 20) * Math.PI / 180; return `<circle cx="${f1(53 * Math.cos(a))}" cy="${f1(-8 + 53 * Math.sin(a))}" r="7" fill="${c2}" ${st}/>`; }).join("");
            front = p("M-43 10C-54 -64 54 -64 43 10L35 6C41 -45 -41 -45 -35 6Z", c2) + `<path d="M-37 8Q-20 40 0 40Q20 40 37 8" fill="none" stroke="${c1}" stroke-width="${sw(3)}"/>` + p("M0 40L-13 33V48Z") + p("M0 40L13 33V48Z") + `<circle cx="0" cy="40" r="3.4" fill="${c2}" ${st}/>`; top = -52; break;
        case "band":
            front = arc(c1);
            if (deco === "cat") front = [-1, 1].map(s => p(`M${s * 30} -30L${s * 26} -56L${s * 10} -40Z`) + `<path d="M${s * 26} -36L${s * 24} -49L${s * 16} -41Z" fill="${c2}"/>`).join("") + front;
            if (deco === "bunny") back = [-1, 1].map(s => p(`M${s * 20} -34C${s * 34} -84 ${s * 4} -90 ${s * 8} -36Z`) + `<path d="M${s * 18} -40C${s * 26} -74 ${s * 9} -78 ${s * 11} -42Z" fill="${c2}"/>`).join("");
            if (deco === "flowers") front += [[-30, -27], [-16, -37], [0, -41], [16, -37], [30, -27]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${i % 2 ? "#ffffff" : c2}" ${st}/><circle cx="${x}" cy="${y}" r="2.2" fill="#ffd83b"/>`).join("");
            top = -40; break;
    }
    if (deco === "pom") front += `<circle cx="0" cy="${top - 4}" r="8" fill="${c2}" ${st}/>`;
    if (deco === "bow") front += p("M22 -34L8 -44V-24Z", c2) + p("M22 -34L36 -44V-24Z", c2) + `<circle cx="22" cy="-34" r="4" fill="${c2}" ${st}/>`;
    if (deco === "flower") front += `<circle cx="26" cy="-28" r="7" fill="${c2}" ${st}/><circle cx="26" cy="-28" r="2.4" fill="#ffd83b"/>`;
    return { back, front };
}

// ------------------------------------------------------------ glasses / sunglasses (head-local)
function lensPath(shape, w, h) {
    const poly = (n, rot = 0) => "M" + Array.from({ length: n }, (_, i) => { const a = rot + i * 2 * Math.PI / n; return `${f1(w * Math.cos(a))} ${f1(h * Math.sin(a))}`; }).join("L") + "Z";
    switch (shape) {
        case "rect": return `M${-w} ${-h}H${w}V${h}H${-w}Z`;
        case "soft": case "half": return `M${-w + 3} ${-h}H${w - 3}Q${w} ${-h} ${w} ${-h + 3}V${h - 4}Q${w} ${h} ${w - 4} ${h}H${-w + 4}Q${-w} ${h} ${-w} ${h - 4}V${-h + 3}Q${-w} ${-h} ${-w + 3} ${-h}Z`;
        case "cat": return `M${-w} ${f1(-h * 0.5)}L${f1(w * 1.3)} ${f1(-h * 1.25)}Q${w} ${h} 0 ${h}Q${-w} ${h} ${-w} ${f1(-h * 0.5)}Z`;
        case "aviator": return `M${-w} ${-h}H${w}Q${f1(w * 1.1)} ${h} 0 ${f1(h * 1.15)}Q${f1(-w * 1.05)} ${f1(h * 0.7)} ${-w} ${-h}Z`;
        case "hex": return poly(6);
        case "octa": return poly(8, Math.PI / 8);
        case "heart": return `M0 ${h}C${f1(-w * 1.7)} ${f1(-h * 0.2)} ${f1(-w * 0.6)} ${f1(-h * 1.6)} 0 ${f1(-h * 0.45)}C${f1(w * 0.6)} ${f1(-h * 1.6)} ${f1(w * 1.7)} ${f1(-h * 0.2)} 0 ${h}Z`;
        case "star": return "M" + Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.45 : 1; return `${f1(w * r * Math.cos(a))} ${f1(h * r * Math.sin(a))}`; }).join("L") + "Z";
        default: return `M${-w} 0A${w} ${h} 0 1 0 ${w} 0A${w} ${h} 0 1 0 ${-w} 0Z`;
    }
}
function eyewear(spec, sun) {
    const [, shape, w, h, frame, th, lens, extra] = spec;
    const fillOf = l => !sun ? "#ffffff" : l === "grad" ? "url(#sg)" : l === "mirror-blue" ? "url(#smb)" : l === "mirror-fire" ? "url(#smf)" : l;
    const op = sun ? (isHex(lens) && lum(lens) > 0.5 ? 0.6 : 0.9) : 0.2;
    const edge = `stroke="${frame}" stroke-width="${sw(th)}" stroke-linejoin="round"`;
    const dark = `stroke="${OUT}" stroke-width="${sw(th + 1.4)}" stroke-linejoin="round"`;
    if (shape === "shield") {
        const d = "M-31 -11H31Q33 6 16 8Q5 8 0 2Q-5 8 -16 8Q-33 6 -31 -11Z";
        return `<path d="${d}" fill="none" ${dark}/><path d="${d}" fill="${fillOf(lens)}" fill-opacity="${op}" ${edge}/><path d="M-31 -8L-39 -6M31 -8L39 -6" stroke="${frame}" stroke-width="${sw(2.4)}" stroke-linecap="round"/>`;
    }
    const d = lensPath(shape, w, h);
    const one = s => `<g transform="translate(${s * 15} -2)${s < 0 ? " scale(-1 1)" : ""}">` +
        (shape === "rimless" ? `<path d="${d}" fill="${fillOf(lens)}" fill-opacity="${op}" stroke="${frame}" stroke-width="${sw(th)}"/>`
            : `<path d="${d}" fill="none" ${dark}/><path d="${d}" fill="${fillOf(lens)}" fill-opacity="${op}" ${edge}/>`) +
        (shape === "half" ? `<path d="M${-w - 1} ${-h}H${w + 1}" stroke="${frame}" stroke-width="${sw(th + 2.6)}" stroke-linecap="round"/>` : "") +
        (sun ? `<path d="M${f1(-w * 0.5)} ${f1(-h * 0.5)}L${f1(-w * 0.1)} ${f1(-h * 0.5)}" stroke="#fff" stroke-width="${sw(1.4)}" opacity=".6" stroke-linecap="round"/>` : "") + `</g>`;
    if (shape === "mono") return one(1) + `<path d="M${15 + w} 0Q34 20 30 40" fill="none" stroke="${frame}" stroke-width="${sw(1)}" stroke-dasharray="2 2"/>`;
    const bx = f1(15 - w);
    return one(-1) + one(1) +
        `<path d="M${-bx} -4Q0 -8 ${bx} -4" fill="none" stroke="${frame}" stroke-width="${sw(Math.max(1.4, th))}"/>` +
        (extra === "double" ? `<path d="M${-bx} -9H${bx}" stroke="${frame}" stroke-width="${sw(1.4)}"/>` : "") +
        `<path d="M${-15 - w} -4L-38 -6M${15 + w} -4L38 -6" stroke="${frame}" stroke-width="${sw(Math.max(1.4, th))}" stroke-linecap="round"/>`;
}

// ------------------------------------------------------------ bodies
const ARM_H = { L: "M101 125Q80 140 82 170", R: "M155 125Q176 140 174 170", RW: "M155 125Q184 122 190 94" };
function shapeBody(id) {
    const circle = { d: "M52 124a76 76 0 1 0 152 0a76 76 0 1 0-152 0Z", ax: [54, 202], ay: 130, legY: 196, top: 48, bot: 200, ff: [128, 124, 2], hf: [128, 124, 2] };
    return {
        smile: circle, donglee: circle,
        ant: { d: "M68 126a60 72 0 1 0 120 0a60 72 0 1 0-120 0Z", ax: [70, 186], ay: 134, legY: 194, top: 54, bot: 198, ff: [128, 120, 1.58], hf: [128, 112, 1.6] },
        square: { d: "M56 64q0-12 12-12h120q12 0 12 12v120q0 12-12 12H68q-12 0-12-12Z", ax: [57, 199], ay: 134, legY: 196, top: 52, bot: 196, ff: [128, 120, 1.9], hf: [128, 120, 1.9] },
        rectangle: { d: "M34 90q0-12 12-12h164q12 0 12 12v84q0 12-12 12H46q-12 0-12-12Z", ax: [35, 221], ay: 136, legY: 186, top: 78, bot: 186, ff: [128, 132, 1.45], hf: [128, 132, 1.45] },
        triangle: { d: "M128 38Q134 38 138 46L214 184Q220 196 206 196H50Q36 196 42 184L118 46Q122 38 128 38Z", ax: [68, 188], ay: 150, legY: 196, top: 38, bot: 196, ff: [128, 148, 1.12], hf: [128, 78, 0.9] },
        trapezoid: { d: "M92 54H164Q174 54 178 64L216 182Q220 196 206 196H50Q36 196 40 182L78 64Q82 54 92 54Z", ax: [58, 198], ay: 140, legY: 196, top: 54, bot: 196, ff: [128, 130, 1.35], hf: [128, 100, 1.25] },
        ghost: { d: "M70 150C70 54 186 54 186 150V212Q171 198 157 212Q142 226 128 212Q114 226 99 212Q85 198 70 212Z", ax: [72, 184], ay: 150, legY: 0, top: 78, bot: 214, ff: [128, 126, 1.45], hf: [128, 130, 1.45] }
    }[id];
}

// ------------------------------------------------------------ build
export function buildAvatar(opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    const R = rng((o.seed | 0) * 7919 + 13);
    const race = RACE[o.race] || RACE.other;
    const female = o.gender === "female";
    const human = race.id === "human", inv = race.id === "invisible";
    const humanoid = race.kind === "h";
    let skin = o.skin;
    if (human && o.human === "black") skin = "#4a2c1c";
    else if (!skin || skin === "auto") skin = human ? (o.human === "western" ? "#fde0cf" : "#f6d3b0") : race.skin;
    const rainbow = skin === "rainbow";
    const skinG = rainbow ? "url(#rb)" : skin, skinL = rainbow ? "url(#rbh)" : skin;
    const dark = !rainbow && lum(skin) < 0.36;
    const ink = dark ? "#fbefe6" : "#2a1a1e";
    const line = dark ? shade(skin, 0.45) : OUT; // outline that stays visible on dark skin
    const vary = { bg: Math.floor(R() * 8), eye: Math.floor(R() * 4), mood: Math.floor(R() * 4), pose: Math.floor(R() * 3), blush: R() < 0.55, eyeCol: ["#3a2a1e", "#3f7df0", "#3fae5a", "#6b4a2f", "#7a5af0"][Math.floor(R() * 5)], tilt: R() };
    const fit = outfit(female ? "female" : "male", o.season, o.outfit);
    const out = [];
    const S = (w = 4, col = OUT) => `stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const BG = ["#fdeedd", "#e6f4ff", "#eafbe6", "#fff3c9", "#f6e6ff", "#ffe6ee", "#e6fbf6", "#f0f0f4"][vary.bg];
    out.push(`<defs><linearGradient id="rb" gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="216" y2="216">${rbStops()}</linearGradient><linearGradient id="rbh" gradientUnits="userSpaceOnUse" x1="-42" y1="-42" x2="42" y2="42">${rbStops()}</linearGradient>` +
        `<linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1a1e"/><stop offset="1" stop-color="#c88a5a"/></linearGradient><linearGradient id="smb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ad7ff"/><stop offset="1" stop-color="#3f4df0"/></linearGradient><linearGradient id="smf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd83b"/><stop offset="1" stop-color="#e2463f"/></linearGradient>` +
        `<clipPath id="cc"><circle cx="128" cy="128" r="124"/></clipPath></defs>`);
    out.push(`<circle cx="128" cy="128" r="124" fill="${BG}"/><g clip-path="url(#cc)">`);

    const body = humanoid ? null : shapeBody(race.id);
    const ff = humanoid ? [128, 74, 1] : body.ff, hf = humanoid ? [128, 74, 1] : body.hf;
    const grp = (fr, inner) => inner ? `<g transform="translate(${fr[0]} ${fr[1]}) scale(${fr[2]})">${inner}</g>` : "";

    // ---- head gear pieces (computed first; drawn in layers)
    K = 1 / hf[2];
    const hairIdx = human ? o.hairStyle : o.wig;
    const hairCol = human ? o.hair : o.wigColor;
    const hp = hairIdx >= 0 ? hairParts(female ? "female" : "male", hairIdx, hairCol) : { back: "", front: "" };
    const hatSpec = o.hat >= 0 ? HAT_SPECS[female ? "female" : "male"][o.hat] : null;
    const ht = hatSpec ? hatParts(hatSpec) : { back: "", front: "" };
    // a hat squashes the big hair on top of the head
    if (hatSpec && !["band", "tiara", "visor", "pillbox"].includes(hatSpec[1])) hp.front = hp.front && `<g clip-path="url(#hc)">${hp.front}</g>`;
    let headExtraBack = "", headExtraFront = "";
    const stH = () => `stroke="${line}" stroke-width="${sw(3.6)}" stroke-linejoin="round"`;
    if (race.id === "rabbit") headExtraBack = [-1, 1].map(s => `<path d="M${s * 24} -28C${s * 38} -66 ${s * 4} -70 ${s * 8} -32Z" fill="${skinL}" ${stH()}/><path d="M${s * 21} -36C${s * 29} -58 ${s * 10} -61 ${s * 12} -38Z" fill="#ffb3c7"/>`).join("");
    if (race.id === "bear") headExtraBack = [-1, 1].map(s => `<circle cx="${s * 28}" cy="-28" r="13" fill="${skinL}" ${stH()}/><circle cx="${s * 28}" cy="-28" r="6.5" fill="${rainbow ? "#fff" : shade(skin, 0.4)}"/>`).join("");
    if (race.id === "kalisto") headExtraBack = [-1, 1].map(s => `<path d="M${s * 34} -8L${s * 78} -26C${s * 70} -6 ${s * 54} 10 ${s * 33} 15Z" fill="${skinL}" ${stH()}/><path d="M${s * 38} -3L${s * 64} -14C${s * 58} -2 ${s * 49} 6 ${s * 37} 10Z" fill="${rainbow ? "#fff" : shade(skin, -0.18)}" opacity=".8"/>`).join("");
    if (race.id === "human" || race.id === "other" || race.id === "jiangshi" || race.id === "devil" || race.id === "angel") headExtraBack = [-1, 1].map(s => `<circle cx="${s * 37}" cy="2" r="6.5" fill="${skinL}" ${stH()}/>`).join("");
    if (race.id === "devil") headExtraFront = [-1, 1].map(s => `<path d="M${s * 27} -24C${s * 38} -42 ${s * 32} -58 ${s * 20} -62C${s * 24} -50 ${s * 20} -40 ${s * 13} -33Z" fill="#7a1420" stroke="${OUT}" stroke-width="${sw(3)}" stroke-linejoin="round"/>`).join("");
    if (race.id === "angel") headExtraFront = `<ellipse cx="0" cy="-52" rx="23" ry="6.5" fill="none" stroke="#b8860b" stroke-width="${sw(7)}"/><ellipse cx="0" cy="-52" rx="23" ry="6.5" fill="none" stroke="#ffe066" stroke-width="${sw(4)}"/>`;
    if (race.id === "ant") headExtraBack = [-1, 1].map(s => `<path d="M${s * 12} -32Q${s * 15} -54 ${s * 29} -60" fill="none" stroke="${OUT}" stroke-width="${sw(4)}" stroke-linecap="round"/><circle cx="${s * 30}" cy="-61" r="5" fill="${skinL}" stroke="${OUT}" stroke-width="${sw(3)}"/>`).join("");

    // ---- back layer
    if (race.id === "angel") out.push([-1, 1].map(s => `<g transform="translate(128 142) scale(${s} 1)"><path d="M22 -14C60 -52 96 -40 92 -6C104 0 98 22 80 22C82 36 62 42 50 32C44 42 28 40 22 24Z" fill="#ffffff" ${S(3.5)}/><path d="M40 -8Q62 -22 78 -10M38 8Q58 0 76 8M38 22Q50 18 62 24" fill="none" stroke="#c8d4e0" stroke-width="2.4" stroke-linecap="round"/></g>`).join(""));
    if (race.id === "devil") out.push(`<path d="M150 168C184 186 214 176 204 144" fill="none" ${S(8)}/><path d="M150 168C184 186 214 176 204 144" fill="none" stroke="${rainbow ? "#e2463f" : shade(skin, -0.2)}" stroke-width="4" stroke-linecap="round"/><path d="M204 150L192 136L216 130Z" fill="#7a1420" ${S(3)}/>`);
    if (humanoid && fit.top.neck === "hood") out.push(`<path d="M92 126C80 82 176 82 164 126Z" fill="${shade(fit.tc, -0.12)}" ${S()}/>`);
    out.push(grp(hf, ht.back + hp.back + headExtraBack));

    let wrist = [82, 165], neckAt = null;
    if (humanoid) {
        const limb = (d, w) => inv ? `<path d="${d}" fill="none" stroke="#9fd0f5" stroke-width="${w}" stroke-linecap="round" opacity=".3"/><path d="${d}" fill="none" stroke="#5b9fd0" stroke-width="1.6" stroke-dasharray="4 4" stroke-linecap="round"/>`
            : `<path d="${d}" fill="none" stroke="${line}" stroke-width="${w + 6}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${skinG}" stroke-width="${w}" stroke-linecap="round"/>`;
        const blob = (shape) => inv ? shape.replace("FILL", `fill="#9fd0f5" fill-opacity=".22" stroke="#5b9fd0" stroke-width="1.6" stroke-dasharray="4 4"`) : shape.replace("FILL", `fill="${skinG}" ${S(3.5, line)}`);
        const T = fit.top, B = fit.bot, tc = fit.tc, bc = fit.bc, tcd = shade(tc, lum(tc) < 0.25 ? 0.3 : -0.25), bcd = shade(bc, lum(bc) < 0.25 ? 0.3 : -0.25);
        const dR = vary.pose === 1 ? ARM_H.RW : ARM_H.R, dL = ARM_H.L;
        const handR = vary.pose === 1 ? [191, 89] : [174, 174];
        // legs + shoes
        out.push(limb("M116 176L114 226", 12) + limb("M140 176L142 226", 12));
        const shoe = SHOES[o.season] || SHOES.spring;
        out.push(o.season === "winter" ? `<path d="M104 214h18v16q8 2 8 8h-28Z" fill="${shoe}" ${S(3)}/><path d="M134 214h18l2 24h-28q0-6 8-8Z" fill="${shoe}" ${S(3)}/>`
            : o.season === "summer" ? `<ellipse cx="110" cy="234" rx="13" ry="5.5" fill="${shoe}" ${S(3)}/><ellipse cx="146" cy="234" rx="13" ry="5.5" fill="${shoe}" ${S(3)}/><path d="M104 231l10 -6M152 231l-10 -6" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`
                : `<ellipse cx="109" cy="233" rx="14" ry="7.5" fill="${shoe}" ${S(3)}/><ellipse cx="147" cy="233" rx="14" ry="7.5" fill="${shoe}" ${S(3)}/>`);
        // bottom
        if (B.leg) {
            const leg = (d) => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${B.w + 5}" stroke-linecap="butt"/><path d="${d}" fill="none" stroke="${bc}" stroke-width="${B.w}" stroke-linecap="butt"/>`;
            const fx = B.w > 19 ? 4 : 0;
            out.push(leg(`M116 172L${114 - fx} ${B.leg}`) + leg(`M140 172L${142 + fx} ${B.leg}`) + `<path d="M96 164H160L161 186Q128 192 95 186Z" fill="${bc}" ${S(3.5)}/>` +
                (B.stitch ? `<path d="M128 170V186M103 172q6 8 12 2" fill="none" stroke="${bcd}" stroke-width="1.6"/>` : "") +
                (B.crease ? `<path d="M115 190V222M141 190V222" stroke="${bcd}" stroke-width="1.4"/>` : "") +
                (B.cuff ? `<path d="M105 ${B.leg - 2}h18M133 ${B.leg - 2}h18" stroke="${bcd}" stroke-width="5" stroke-linecap="round"/>` : ""));
        } else if (B.sk) {
            out.push(`<path d="M97 164H159L${159 + B.f} ${B.sk}Q128 ${B.sk + 7} ${97 - B.f} ${B.sk}Z" fill="${bc}" ${S(3.5)}/>` +
                (B.pleat ? [-22, -11, 0, 11, 22].map(x => `<path d="M${128 + x * 0.7} 170L${128 + x * 1.5} ${B.sk + 2}" stroke="${bcd}" stroke-width="1.6"/>`).join("") : ""));
        }
        // arms + sleeves
        out.push(limb(dL, 10) + limb(dR, 10));
        const slc = T.slc ? "#f7f7f5" : tc;
        const sleeve = (d) => T.sl ? `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${T.puff ? 22 : 19}" stroke-dasharray="${T.sl === 1 ? 19 : 45} 400"/><path d="${d}" fill="none" stroke="${slc}" stroke-width="${T.puff ? 17 : 14}" stroke-dasharray="${T.sl === 1 ? 18 : 44} 400"/>` : "";
        out.push(sleeve(dL) + sleeve(dR));
        // neck + torso
        out.push(blob(`<rect x="120" y="102" width="16" height="20" rx="5" FILL/>`));
        const tors = T.len === "crop" ? "M99 120Q128 113 157 120L158 150Q128 156 98 150Z" : T.len === "coat" ? "M99 120Q128 113 157 120L165 202Q128 209 91 202Z"
            : T.len === "dress" ? "M99 120Q128 113 157 120L158 160L177 206Q128 215 79 206L98 160Z" : "M99 120Q128 113 157 120L161 172Q128 178 95 172Z";
        if (T.len === "crop") out.push(blob(`<path d="M99 140H157L160 168H96Z" FILL/>`));
        const yb = T.len === "coat" ? 204 : T.len === "dress" ? 208 : T.len === "crop" ? 152 : 174;
        let deco = "";
        if (T.pat === "stripe") deco += Array.from({ length: 7 }, (_, i) => `<path d="M90 ${124 + i * 8}H166" stroke="#f7f7f5" stroke-width="3.4"/>`).join("");
        if (T.pat === "dots") deco += Array.from({ length: 18 }, (_, i) => `<circle cx="${102 + (i % 5) * 13 + (Math.floor(i / 5) % 2) * 6}" cy="${126 + Math.floor(i / 5) * 13}" r="3" fill="${i % 2 ? "#fff6c0" : "#ffffff"}" opacity=".85"/>`).join("");
        if (T.pat === "quilt") deco += Array.from({ length: Math.ceil((yb - 126) / 13) }, (_, i) => `<path d="M88 ${132 + i * 13}Q128 ${137 + i * 13} 168 ${132 + i * 13}" fill="none" stroke="${tcd}" stroke-width="2.2"/>`).join("");
        if (T.pat === "rib") deco += Array.from({ length: 9 }, (_, i) => `<path d="M${100 + i * 7} ${yb - 9}V${yb + 4}" stroke="${tcd}" stroke-width="1.6"/>`).join("");
        if (T.pat === "logo") deco += `<path d="M128 138l3 6.4 7 .8-5.2 4.8 1.4 7-6.2-3.6-6.2 3.6 1.4-7-5.2-4.800 7-.8Z" fill="#fff" opacity=".9"/>`;
        if (T.pat === "number") deco += `<text x="128" y="158" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="24" fill="#fff">7</text>`;
        if (T.open) deco += `<path d="M120 116H136L139 ${yb + 6}H117Z" fill="#f7f7f5"/><path d="M120 116L117 ${yb + 4}M136 116L139 ${yb + 4}" stroke="${OUT}" stroke-width="2.4"/>`;
        if (T.lapel) deco += `<path d="M120 117L108 124L118 146Z" fill="${shade(tc, -0.1)}" ${S(2)}/><path d="M136 117L148 124L138 146Z" fill="${shade(tc, -0.1)}" ${S(2)}/>`;
        if (T.zip) deco += `<path d="M128 122V${yb + 2}" stroke="${T.open ? "#8b929c" : tcd}" stroke-width="2.4" stroke-dasharray="2 2"/>`;
        if (T.btn) deco += Array.from({ length: T.len === "coat" ? 4 : 3 }, (_, i) => `<circle cx="${T.open ? 146 : 128}" cy="${136 + i * 14}" r="2.3" fill="${lum(tc) > 0.6 ? "#6b4a2f" : "#f7f7f5"}"/>`).join("");
        if (T.pocket) deco += `<path d="M112 152H144L140 167H116Z" fill="none" stroke="${tcd}" stroke-width="2.4" stroke-linejoin="round"/>`;
        if (T.belt) deco += `<path d="M92 164H164" stroke="${tcd}" stroke-width="7"/><rect x="123" y="159" width="10" height="10" rx="2" fill="none" stroke="#e8b923" stroke-width="2.4"/>`;
        out.push(`<clipPath id="tc"><path d="${tors}"/></clipPath><path d="${tors}" fill="${tc}" ${S()}/><g clip-path="url(#tc)">${deco}</g><path d="${tors}" fill="none" ${S()}/>`);
        // neck line
        const nk = T.open ? "" : T.neck;
        if (nk === "crew") out.push(`<path d="M116 117Q128 127 140 117" fill="none" stroke="${tcd}" stroke-width="3.4" stroke-linecap="round"/>`);
        if (nk === "v") out.push(blob(`<path d="M118 116L128 135L138 116Z" FILL/>`) + (T.slc ? `<path d="M118 116L128 135L138 116" fill="none" stroke="#f7f7f5" stroke-width="3"/>` : ""));
        if (nk === "collar") out.push(`<path d="M128 126L116 114L112 128L122 133Z" fill="${shade(tc, 0.25)}" ${S(2.4)}/><path d="M128 126L140 114L144 128L134 133Z" fill="${shade(tc, 0.25)}" ${S(2.4)}/>`);
        if (nk === "turtle") out.push(`<rect x="116" y="105" width="24" height="15" rx="5" fill="${tc}" ${S(3)}/>`);
        if (nk === "hood") out.push(`<path d="M114 117Q128 130 142 117" fill="none" stroke="${tcd}" stroke-width="3.4"/><path d="M122 124V142M134 124V142" stroke="#f7f7f5" stroke-width="2.2" stroke-linecap="round"/>`);
        if (nk === "round") out.push(`<circle cx="119" cy="120" r="7.5" fill="#ffffff" ${S(2.4)}/><circle cx="137" cy="120" r="7.5" fill="#ffffff" ${S(2.4)}/><path d="M128 124L120 132H136Z" fill="${shade(tc, -0.25)}" ${S(2)}/>`);
        if (T.sl === 0) out.push(`<path d="M104 121L109 132M152 121L147 132" stroke="${tcd}" stroke-width="2"/>`);
        // hands
        out.push(blob(`<circle cx="82" cy="174" r="7.5" FILL/>`) + blob(`<circle cx="${handR[0]}" cy="${handR[1]}" r="7.5" FILL/>`));
        if (o.leprosy) out.push(spots(R, [[82, 174, 5], [handR[0], handR[1], 5], [114, 208, 5], [142, 212, 5]], 1));
        neckAt = T.neck === "turtle" && !T.open ? null : [128, 118];
    } else {
        // ---- shape body: the body is the head; arms / legs are stuck on
        const lc = rainbow ? "url(#rb)" : shade(skin, lum(skin) < 0.3 ? 0.3 : -0.38);
        const [xL, xR] = body.ax, ay = body.ay;
        const dL = `M${xL + 4} ${ay}Q${xL - 22} ${ay + 12} ${xL - 18} ${ay + 40}`;
        const dR = vary.pose === 1 ? `M${xR - 4} ${ay}Q${xR + 24} ${ay - 14} ${xR + 16} ${ay - 44}` : `M${xR - 4} ${ay}Q${xR + 22} ${ay + 12} ${xR + 18} ${ay + 40}`;
        const hR = vary.pose === 1 ? [xR + 16, ay - 46] : [xR + 18, ay + 42];
        const T = fit.top;
        const arm = d => `<path d="${d}" fill="none" stroke="${lc}" stroke-width="9" stroke-linecap="round"/>` + (T.sl ? `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="16" stroke-dasharray="${T.sl === 1 ? 17 : 36} 400"/><path d="${d}" fill="none" stroke="${T.slc ? "#f7f7f5" : fit.tc}" stroke-width="12" stroke-dasharray="${T.sl === 1 ? 16 : 35} 400"/>` : "");
        if (body.legY) out.push(`<path d="M108 ${body.legY - 6}L103 238M148 ${body.legY - 6}L153 238" fill="none" stroke="${lc}" stroke-width="9" stroke-linecap="round"/><ellipse cx="99" cy="241" rx="14" ry="6.5" fill="${SHOES[o.season] || lc}" ${S(3)}/><ellipse cx="157" cy="241" rx="14" ry="6.5" fill="${SHOES[o.season] || lc}" ${S(3)}/>`);
        out.push(arm(dL) + arm(dR));
        out.push(`<path d="${body.d}" fill="${skinG}" ${S(5, rainbow ? OUT : shade(skin, lum(skin) < 0.3 ? 0.35 : -0.45))}/>`);
        // bottoms: a band on the lower part of the body (like Melon Donglee's shorts)
        const B = fit.bot, bandC = B.ko ? fit.bc : fit.tc, y0 = body.bot - (body.bot - body.top) * (B.sk || !B.ko ? 0.3 : 0.26);
        out.push(`<clipPath id="bc"><path d="${body.d}"/></clipPath><g clip-path="url(#bc)"><path d="M0 ${f1(y0)}Q128 ${f1(y0 + 16)} 256 ${f1(y0)}V256H0Z" fill="${bandC}" ${S(4)}/>` +
            (B.leg ? `<path d="M128 ${f1(y0 + 14)}V256" stroke="${shade(bandC, -0.3)}" stroke-width="3"/>` : [-48, -24, 0, 24, 48].map(x => `<path d="M${128 + x} ${f1(y0 + 12)}V256" stroke="${shade(bandC, -0.2)}" stroke-width="1.8"/>`).join("")) + `</g><path d="${body.d}" fill="none" ${S(5, rainbow ? OUT : shade(skin, lum(skin) < 0.3 ? 0.35 : -0.45))}/>`);
        out.push(`<circle cx="${xL - 18}" cy="${ay + 42}" r="8.5" fill="${skinG}" ${S(3)}/><circle cx="${hR[0]}" cy="${hR[1]}" r="8.5" fill="${skinG}" ${S(3)}/>`);
        wrist = [xL - 19, ay + 31];
    }

    // ---- accessories on the body
    const acc = o.acc >= 0 ? ACC_SPECS[female ? "female" : "male"][o.acc] : null;
    if (acc) {
        const [wx, wy] = wrist;
        if (female) {
            const m = acc[4];
            if (acc[3] === "bangle") out.push(`<ellipse cx="${wx}" cy="${wy}" rx="8" ry="3.4" fill="none" stroke="${OUT}" stroke-width="5"/><ellipse cx="${wx}" cy="${wy}" rx="8" ry="3.4" fill="none" stroke="${m}" stroke-width="3"/>`);
            if (acc[3] === "beads") out.push([-7, -3.5, 0, 3.5, 7].map((x, i) => `<circle cx="${wx + x}" cy="${f1(wy + Math.abs(x) * -0.15 + 1)}" r="2.6" fill="${acc[0].includes("무지개") ? ["#ff5a7a", "#ffd83b", "#5cc469", "#3f7df0", "#8e5cf0"][i] : m}" stroke="${OUT}" stroke-width="1"/>`).join(""));
            if (acc[3] === "chain") out.push(`<ellipse cx="${wx}" cy="${wy}" rx="8" ry="3" fill="none" stroke="${m}" stroke-width="2.4" stroke-dasharray="2.5 1.5"/><circle cx="${wx}" cy="${wy + 4}" r="2" fill="${m}" stroke="${OUT}" stroke-width=".8"/>`);
        } else {
            out.push(`<rect x="${wx - 8}" y="${wy - 4}" width="16" height="8" rx="2" fill="${acc[1]}" stroke="${OUT}" stroke-width="2"/><circle cx="${wx}" cy="${wy}" r="6" fill="${acc[2]}" stroke="${OUT}" stroke-width="2"/><path d="M${wx} ${wy}v-3.5M${wx} ${wy}h2.6" stroke="${lum(acc[2]) > 0.5 ? OUT : "#fff"}" stroke-width="1.2" stroke-linecap="round"/>`);
        }
        const nt = female ? acc[2] : acc[3], m = acc[4];
        if (nt !== "none" && (neckAt || !humanoid)) {
            const neck = [];
            const fr = humanoid ? null : ff;
            const P = humanoid ? { a: "M115 113Q128 132 141 113", cx: 128, cy: 124, ch: "M116 109Q128 116 140 109", k: 1 } : { a: "M-22 27Q0 43 22 27", cx: 0, cy: 36, ch: "M-22 26Q0 34 22 26", k: 1 / ff[2] };
            const w = n => f1(n * P.k);
            if (nt === "chain" || nt === "cord" || nt === "pendant" || nt === "heart" || nt === "tag" || nt === "tooth" || nt === "thick") neck.push(`<path d="${P.a}" fill="none" stroke="${nt === "cord" ? m : OUT}" stroke-width="${w(nt === "thick" ? 5.5 : 3)}" stroke-linecap="round"/>` + (nt === "cord" ? "" : `<path d="${P.a}" fill="none" stroke="${m}" stroke-width="${w(nt === "thick" ? 3.6 : 1.6)}" stroke-linecap="round"${nt === "thick" ? ' stroke-dasharray="3 1.6"' : ""}/>`));
            if (nt === "pearl" || nt === "bead") neck.push([-11, -7.5, -3.8, 0, 3.8, 7.5, 11].map(x => `<circle cx="${f1(P.cx + x * P.k * (humanoid ? 1 : 1.9))}" cy="${f1(P.cy - Math.abs(x) * 0.62 * P.k * (humanoid ? 1 : 1.3))}" r="${w(2.7)}" fill="${nt === "bead" ? m : PEARL}" stroke="${OUT}" stroke-width="${w(0.9)}"/>`).join(""));
            if (nt === "choker") neck.push(`<path d="${P.ch}" fill="none" stroke="${m}" stroke-width="${w(4.5)}" stroke-linecap="round"/><circle cx="${P.cx}" cy="${f1(P.cy - (humanoid ? 11 : 6 * P.k))}" r="${w(2)}" fill="${lum(m) < 0.3 ? "#e8b923" : "#ffffff"}"/>`);
            if (nt === "pendant" || nt === "cord") neck.push(`<path d="M${P.cx} ${f1(P.cy - 3 * P.k)}l${w(4)} ${w(5)}l${w(-4)} ${w(5)}l${w(-4)} ${w(-5)}Z" fill="${female ? m : "#e8f6ff"}" stroke="${OUT}" stroke-width="${w(1.2)}"/>`);
            if (nt === "heart") neck.push(`<path d="M${P.cx} ${f1(P.cy + 7 * P.k)}c${w(-9)} ${w(-6)} ${w(-4)} ${w(-12)} 0 ${w(-7)}c${w(4)} ${w(-5)} ${w(9)} ${w(1)} 0 ${w(7)}Z" fill="${m}" stroke="${OUT}" stroke-width="${w(1.2)}"/>`);
            if (nt === "tag") neck.push(`<rect x="${f1(P.cx - 4 * P.k)}" y="${f1(P.cy - 2 * P.k)}" width="${w(8)}" height="${w(12)}" rx="${w(2)}" fill="${m}" stroke="${OUT}" stroke-width="${w(1.2)}"/>`);
            if (nt === "tooth") neck.push(`<path d="M${f1(P.cx - 3.5 * P.k)} ${f1(P.cy - 2 * P.k)}h${w(7)}l${w(-3.5)} ${w(11)}Z" fill="${m}" stroke="${OUT}" stroke-width="${w(1.2)}"/>`);
            out.push(fr ? grp(fr, neck.join("")) : neck.join(""));
        }
    }

    // ---- head + face
    K = 1 / ff[2];
    const face = [];
    if (humanoid) {
        const hs = inv ? `fill="#9fd0f5" fill-opacity=".18" stroke="#5b9fd0" stroke-width="2" stroke-dasharray="5 4"` : `fill="${skinL}" stroke="${line}" stroke-width="4" stroke-linejoin="round"`;
        if (race.id === "cloud") {
            const cs = [[-22, -16, 21], [0, -22, 23], [22, -16, 21], [-30, 8, 17], [30, 8, 17], [0, 12, 30], [-16, 22, 16], [16, 22, 16]];
            face.push(cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${skinL}" stroke="${line}" stroke-width="8"/>`).join("") + cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${skinL}"/>`).join(""));
        } else face.push(`<ellipse cx="0" cy="0" rx="38" ry="36" ${hs}/>`);
        if (race.id === "bear") face.push(`<ellipse cx="0" cy="13" rx="14" ry="10" fill="${rainbow ? "#fff" : shade(skin, 0.45)}"/><ellipse cx="0" cy="7" rx="5" ry="3.6" fill="#2a1a1e"/>`);
        if (race.id === "rabbit") face.push(`<path d="M-3.5 6h7l-3.5 4.5Z" fill="#ff8fa8" stroke="${OUT}" stroke-width="1"/><path d="M-30 8L-20 10M-30 15L-20 13M30 8L20 10M30 15L20 13" stroke="${ink}" stroke-width="1.1" opacity=".55" stroke-linecap="round"/>`);
        if (human || race.id === "other" || race.id === "jiangshi") face.push(`<path d="M-1 4Q3 9 -1 10" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>`);
        if (race.id === "jiangshi") face.push([-1, 1].map(s => `<ellipse cx="${s * 15}" cy="0" rx="10" ry="9" fill="#5a4a6a" opacity=".28"/>`).join(""));
    }
    const fo = inv ? ' opacity=".6"' : "";
    const mk = o.makeup >= 0 && MAKEUP_SPECS[o.makeup] ? MAKEUP_SPECS[o.makeup][1] : null;
    const ey = -2;
    let eyeStyle = dark && vary.eye < 2 ? 2 : vary.eye;
    if (race.id === "smile" && eyeStyle === 2) eyeStyle = 1;
    const feat = [];
    // makeup under the eyes
    if (mk?.shadow) feat.push([-1, 1].map(s => `<ellipse cx="${s * 15}" cy="${ey - 5}" rx="9.5" ry="6" fill="${mk.shadow[0]}" opacity="${mk.shadow[1]}"/>`).join(""));
    if (mk?.under) feat.push([-1, 1].map(s => `<ellipse cx="${s * 15}" cy="${ey + 6}" rx="8" ry="3.4" fill="${mk.under[0]}" opacity="${mk.under[1]}"/>`).join(""));
    const blushSpec = mk?.blush || (vary.blush ? ["#ff9aa0", 0.45, 0] : null);
    if (blushSpec) feat.push([-1, 1].map(s => `<ellipse cx="${s * 23}" cy="${11 + blushSpec[2]}" rx="${mk?.big ? 9.5 : 7}" ry="${mk?.big ? 6 : 4.2}" fill="${blushSpec[0]}" opacity="${blushSpec[1]}"/>`).join(""));
    if (mk?.glow) feat.push(`<ellipse cx="0" cy="-20" rx="12" ry="4" fill="#fff" opacity=".4"/><ellipse cx="-22" cy="4" rx="5" ry="2.4" fill="#fff" opacity=".45"/><ellipse cx="22" cy="4" rx="5" ry="2.4" fill="#fff" opacity=".45"/>`);
    if (mk?.freckles) feat.push([[-24, 8], [-19, 11], [-15, 7], [-21, 5], [24, 8], [19, 11], [15, 7], [21, 5], [-3, 9], [3, 9]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#a86b3c" opacity=".8"/>`).join(""));
    // eyes
    for (const s of [-1, 1]) {
        const x = s * 15;
        if (eyeStyle === 0) feat.push(`<circle cx="${x}" cy="${ey}" r="4.8" fill="${ink}"/><circle cx="${x + 1.6}" cy="${ey - 1.8}" r="1.5" fill="${dark ? "#2a1a1e" : "#fff"}"/>`);
        if (eyeStyle === 1) feat.push(`<ellipse cx="${x}" cy="${ey}" rx="6" ry="7.6" fill="${dark ? "#fff" : "#1a1a22"}" stroke="${ink}" stroke-width="1"/>` + (dark ? `<circle cx="${x}" cy="${ey + 1}" r="4" fill="#1a1a22"/>` : "") + `<circle cx="${x + 2}" cy="${ey - 2.6}" r="2.2" fill="#fff"/><circle cx="${x - 2}" cy="${ey + 2.6}" r="1.2" fill="#fff"/>`);
        if (eyeStyle === 2) feat.push(`<ellipse cx="${x}" cy="${ey}" rx="7" ry="5.6" fill="#fff" stroke="#2a1a1e" stroke-width="1.6"/><circle cx="${x}" cy="${ey}" r="3.9" fill="${human && o.human === "western" ? "#3f7df0" : vary.eyeCol}"/><circle cx="${x}" cy="${ey}" r="1.9" fill="#1a1a22"/><circle cx="${x + 1.5}" cy="${ey - 1.5}" r="1.1" fill="#fff"/>`);
        if (eyeStyle === 3) feat.push(`<path d="M${x - 6} ${ey + 1}Q${x} ${ey - 7} ${x + 6} ${ey + 1}" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>`);
        const top = eyeStyle === 1 ? ey - 7 : eyeStyle === 3 ? ey - 3 : ey - 5;
        if (mk?.liner) feat.push(`<path d="M${x - 7} ${top + 2}Q${x} ${top - 2.5} ${x + 7} ${top + 2}${mk.liner === 2 ? `L${x + s * 12} ${top - 3}` : ""}" fill="none" stroke="#1a1a22" stroke-width="${mk.liner === 3 ? 3 : 1.8}" stroke-linecap="round"/>`);
        if (female || mk?.lash) feat.push(`<path d="M${x + s * 6} ${top + 2}l${s * 4} -3M${x + s * 4} ${top}l${s * 2.6} -3.4" stroke="${dark ? ink : "#1a1a22"}" stroke-width="1.5" stroke-linecap="round"/>`);
        if (mk?.glitter) feat.push([[s * 10, -8], [s * 3, -10], [s * 7, 6]].map(([dx, dy]) => `<path d="M${x + dx} ${ey + dy - 2}l.9 1.6 1.6 .9-1.600 .9-.9 1.6-.9-1.600-1.600-.9 1.600-.9Z" fill="#fff"/>`).join(""));
        feat.push(`<path d="M${x - 6} ${-14 - (s < 0 ? vary.tilt : 1 - vary.tilt) * 1.5}Q${x} ${-17.5} ${x + 6} ${-14 - (s > 0 ? vary.tilt : 1 - vary.tilt) * 1.5}" fill="none" stroke="${ink}" stroke-width="${female ? 1.7 : 2.8}" stroke-linecap="round" opacity=".85"/>`);
        if (o.eyeWrinkle) feat.push(`<path d="M${x - 7} ${ey + 8}Q${x} ${ey + 11.5} ${x + 7} ${ey + 8}M${x - 5} ${ey + 11.5}Q${x} ${ey + 14} ${x + 5} ${ey + 11.5}M${x + s * 9} ${ey - 3}l${s * 4.5} -2M${x + s * 9.5} ${ey}l${s * 5} 0M${x + s * 9} ${ey + 3}l${s * 4.5} 2" fill="none" stroke="${ink}" stroke-width="1.1" stroke-linecap="round" opacity=".6"/>`);
    }
    // mouth
    const my = race.id === "bear" ? 15 : 17;
    const big = race.id === "smile" ? 1.5 : 1;
    if (o.mouthLines) {
        const m = vary.mood < 2 ? `M-5 ${my}Q0 ${my + 2.5} 5 ${my}` : vary.mood === 2 ? `M-5 ${my}H5` : `M-5 ${my + 1.5}Q0 ${my - 1.5} 5 ${my + 1.5}`;
        feat.push(`<path d="${m}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/><path d="M-11 ${my - 9}Q-17.500 ${my} -11 ${my + 9}M11 ${my - 9}Q17.5 ${my} 11 ${my + 9}" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>`);
    } else if (vary.mood === 1) feat.push(`<path d="M${-10 * big} ${my - 4}Q0 ${my + 12 * big} ${10 * big} ${my - 4}Z" fill="#a8323a" stroke="${dark ? "#fbefe6" : "#2a1a1e"}" stroke-width="2" stroke-linejoin="round"/><path d="M-5 ${my + 2.5 * big}Q0 ${my + 6 * big} 5 ${my + 2.5 * big}" fill="#ff8a9a"/>`);
    else feat.push(`<path d="${vary.mood === 0 ? `M${-9 * big} ${my - 3}Q0 ${my + 6 * big} ${9 * big} ${my - 3}` : vary.mood === 2 ? `M-6 ${my}Q0 ${my + 2} 6 ${my}` : `M-7 ${my}Q2 ${my + 4} 9 ${my - 4}`}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`);
    if (mk?.lip && !o.mouthLines) {
        const ly = vary.mood === 1 ? my - 4 : my - 1;
        feat.push(`<path d="M-8 ${ly}Q-4 ${ly - 4} 0 ${ly - 2}Q4 ${ly - 4} 8 ${ly}Q0 ${ly + (vary.mood === 1 ? 2 : 7)} -8 ${ly}Z" fill="${mk.lip}" stroke="${shade(mk.lip, -0.3)}" stroke-width=".8"/>` +
            (mk.lipIn ? `<ellipse cx="0" cy="${ly + 1}" rx="4" ry="2" fill="${mk.lipIn}"/>` : "") + (mk.gloss ? `<path d="M-3 ${ly + 1.5}h4" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>` : ""));
    } else if (mk?.lip) feat.push(`<path d="M-5 ${my}Q0 ${my + 3} 5 ${my}" fill="none" stroke="${mk.lip}" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>`);
    if (race.id === "jiangshi") feat.push(`<path d="M-7.500 ${my + 1}l2.6 8.5l2.6 -8.500ZM2.3 ${my + 1}l2.6 8.5l2.6 -8.500Z" fill="#fff" stroke="#2a1a1e" stroke-width="1.1" stroke-linejoin="round"/>`);
    if (o.leprosy) feat.push(spots(R, [[-20, -18, 8], [14, -24, 7], [24, 2, 7], [-26, 6, 6], [-8, 24, 6], [12, 22, 7], [2, -6, 5], [-30, -6, 4], [30, -14, 4]], K));
    face.push(`<g${fo}>${feat.join("")}</g>`);
    out.push(grp(ff, face.join("")));
    K = 1 / hf[2];
    out.push(grp(hf, (hatSpec ? `<clipPath id="hc"><path d="M-80 -19H80V80H-80Z"/></clipPath>` : "") + hp.front));
    K = 1 / ff[2];
    // earrings + eyewear in the face frame
    const gear = [];
    if (acc && female) {
        const m = acc[4], t = acc[1];
        for (const s of [-1, 1]) {
            const x = s * (humanoid ? 39 : 36), y = humanoid ? 9 : 8;
            const st = `stroke="${OUT}" stroke-width="${sw(1.1)}"`;
            if (t === "stud") gear.push(`<circle cx="${x}" cy="${y}" r="${sw(3)}" fill="${m}" ${st}/>`);
            if (t === "pearl") gear.push(`<circle cx="${x}" cy="${y + sw(2)}" r="${sw(3.8)}" fill="${m === PEARL ? PEARL : m}" ${st}/>`);
            if (t === "hoop" || t === "bighoop") gear.push(`<circle cx="${x}" cy="${y + sw(t === "hoop" ? 5 : 8)}" r="${sw(t === "hoop" ? 5 : 8)}" fill="none" stroke="${OUT}" stroke-width="${sw(3.2)}"/><circle cx="${x}" cy="${y + sw(t === "hoop" ? 5 : 8)}" r="${sw(t === "hoop" ? 5 : 8)}" fill="none" stroke="${m}" stroke-width="${sw(1.8)}"/>`);
            if (t === "drop") gear.push(`<path d="M${x} ${y}v${sw(4)}" stroke="${m}" stroke-width="${sw(1.4)}"/><path d="M${x} ${y + sw(4)}q${sw(-4.5)} ${sw(7)} 0 ${sw(9)}q${sw(4.5)} ${sw(-2)} 0 ${sw(-9)}Z" fill="${m}" ${st}/>`);
            if (t === "long") gear.push(`<path d="M${x} ${y}v${sw(16)}" stroke="${m}" stroke-width="${sw(1.8)}" stroke-dasharray="${sw(2.4)} ${sw(1.4)}"/><circle cx="${x}" cy="${y + sw(17)}" r="${sw(2.6)}" fill="${m}" ${st}/>`);
            if (t === "heart") gear.push(`<path d="M${x} ${y + sw(8)}c${sw(-8)} ${sw(-5)} ${sw(-3.5)} ${sw(-10)} 0 ${sw(-6)}c${sw(3.5)} ${sw(-4)} ${sw(8)} ${sw(1)} 0 ${sw(6)}Z" fill="${m}" ${st}/>`);
            if (t === "star") gear.push(`<g transform="translate(${x} ${y + sw(4)}) scale(${sw(0.55)})">` + `<path d="${lensPath("star", 9, 9)}" fill="${m}" stroke="${OUT}" stroke-width="2"/></g>`);
        }
    }
    const both = o.glasses >= 0 && o.sun >= 0; // both chosen: the sunglasses sit pushed up on the head
    if (o.glasses >= 0 && GLASS_SPECS[o.glasses]) gear.push(eyewear(GLASS_SPECS[o.glasses], false));
    if (o.sun >= 0 && SUN_SPECS[o.sun]) gear.push(both ? `<g transform="translate(0 -24)">${eyewear(SUN_SPECS[o.sun], true)}</g>` : eyewear(SUN_SPECS[o.sun], true));
    out.push(grp(ff, gear.join("")));
    K = 1 / hf[2];
    out.push(grp(hf, ht.front + headExtraFront));
    K = 1;
    if (race.id === "other" && o.raceText) out.push(`<text x="128" y="250" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="9" fill="#00000055">${esc(String(o.raceText).slice(0, 20))}</text>`);
    out.push("</g>");
    const meta = `<desc>gen:${esc(JSON.stringify(o))}</desc>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">${meta}${out.join("")}</svg>`;
}
function rbStops() { return ["#ff7b7b", "#ffc56b", "#fff07a", "#8ef08e", "#7ac8ff", "#c49bff"].map((c, i) => `<stop offset="${i / 5}" stop-color="${c}"/>`).join(""); }
// leprosy: sores and pale numb patches on the skin
function spots(R, list, k) {
    return list.map(([x, y, r], i) => {
        const rx = f1(r * (0.7 + R() * 0.6)), ry = f1(r * (0.55 + R() * 0.5)), a = Math.round(R() * 180);
        const dx = f1(x + (R() - 0.5) * 4), dy = f1(y + (R() - 0.5) * 4);
        return i % 3 === 2
            ? `<ellipse cx="${dx}" cy="${dy}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${dx} ${dy})" fill="#f6e9df" opacity=".8" stroke="#c9a898" stroke-width="${f1(0.8 * k)}"/>`
            : `<ellipse cx="${dx}" cy="${dy}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${dx} ${dy})" fill="#b9756a" opacity=".8" stroke="#7a3a34" stroke-width="${f1(1 * k)}"/><ellipse cx="${dx}" cy="${dy}" rx="${f1(rx * 0.45)}" ry="${f1(ry * 0.45)}" fill="#8a3f3a" opacity=".7"/>`;
    }).join("");
}

export const toDataUri = svg => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
// options stored inside a generated image (so it can be edited again)
export function parseGen(src) {
    try {
        if (!String(src || "").startsWith("data:image/svg+xml")) return null;
        const svg = decodeURIComponent(src.slice(src.indexOf(",") + 1));
        const m = svg.match(/<desc>gen:([\s\S]*?)<\/desc>/);
        if (!m) return null;
        const json = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        return { ...DEFAULTS, ...JSON.parse(json) };
    } catch { return null; }
}
