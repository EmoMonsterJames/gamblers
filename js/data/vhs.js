// ================================================================ 📼 VHS — 동행 비디오 가게 · VHS Collection · 영화DB · 🎬 영화관
//   genres · ratings (띠) · brands (= 영화사) · the 37 shop kinds · the movie catalog:
//     • built-in movies (복덩이 사기단 …) + movies made in the admin generator (Store.vhs.movies)
//     (only movies the admin ordered — the game makes none up)
//   A movie a player buys is stored as a snapshot (game/vhs.js), so its cast never changes afterwards.
import { Store } from "../core/store.js";
import { COUNTRIES } from "./catalog.js";

export const GENRES = ["코미디", "액션", "판타지", "SF", "공포", "스릴러", "성인", "가족", "드라마", "로맨스", "뮤지컬", "어드벤처"];
export const GENRE_EMOJI = { 코미디: "🤣", 액션: "💥", 판타지: "🧚", SF: "🛸", 공포: "👻", 스릴러: "🔪", 성인: "💋", 가족: "👨‍👩‍👧", 드라마: "🎭", 로맨스: "💘", 뮤지컬: "🎵", 어드벤처: "🗺️" };

// 띠 = the age rating · age: index in AGE_ORDER the player needs at least
export const AGE_ORDER = ["Baby", "Young Adult", "Adult", "Middle-Aged", "Senior"];
export const RATINGS = [
    { id: "white", name: "흰띠", color: "#f8fafc", ink: "#111", age: 0 },
    { id: "green", name: "초록띠", color: "#22c55e", ink: "#fff", age: 0 },
    { id: "yellow", name: "노랑띠", color: "#facc15", ink: "#111", age: 1 },
    { id: "bam", name: "밤띠", color: "#7c4a1e", ink: "#fff", age: 1 },
    { id: "red", name: "빨간띠", color: "#dc2626", ink: "#fff", age: 1 },
    { id: "water", name: "물띠", color: "#0ea5e9", ink: "#fff", age: 2 },
    { id: "fire", name: "불띠", color: "#f97316", ink: "#fff", age: 2 },
    { id: "flower", name: "꽃띠", color: "#ec4899", ink: "#fff", age: 2 },
    { id: "emo", name: "이모띠", color: "#7c3aed", ink: "#fff", age: 3 },
    { id: "emobu", name: "이모부띠", color: "#1f2937", ink: "#fde68a", age: 3 },
    { id: "hyhg", name: "HYHG띠", color: "#facc15", ink: "#111", age: 4 }
];
export const RATING_BY_ID = Object.fromEntries(RATINGS.map(r => [r.id, r]));
export const ratingText = id => { const r = RATING_BY_ID[id]; return r ? `${r.name} · ${r.age === 0 ? "모든 연령" : AGE_ORDER[r.age] + "부터"}` : "-"; };
export const ageIndex = ageGroup => { const i = AGE_ORDER.findIndex(a => a.toLowerCase() === String(ageGroup || "").trim().toLowerCase()); return i < 0 ? 1 : i; };

// 영화사 = 비디오 브랜드 · only: a nation / genre / black-and-white the brand is limited to
export const BRANDS = [
    { id: "hyhg", name: "HYHG Film", logo: "HYHG", color: "#facc15", ink: "#111", shape: "crown" },
    { id: "bmovie", name: "B-Movie Entertainment", logo: "B·M", color: "#ef4444", ink: "#fff", shape: "star" },
    { id: "ghost", name: "Ghost Reels", logo: "GR", color: "#94a3b8", ink: "#0f172a", shape: "ghost", nation: "Foggy Nation" },
    { id: "mj", name: "MJ Films", logo: "MJ", color: "#a855f7", ink: "#fff", shape: "circle", nation: "MJ World" },
    { id: "dung", name: "Dung Films", logo: "DF", color: "#92400e", ink: "#fde68a", shape: "swirl", nation: "Dung Town" },
    { id: "ground", name: "Ground Cinema", logo: "GC", color: "#65a30d", ink: "#fff", shape: "ant", nation: "Ground Town" },
    { id: "emo", name: "Emo Screen", logo: "ES", color: "#ec4899", ink: "#fff", shape: "heart", nation: "Emo World" },
    { id: "poly", name: "Polycinema", logo: "PC", color: "#0ea5e9", ink: "#fff", shape: "wave", nation: "Polynesia" },
    { id: "bw", name: "Black & White", logo: "B&W", color: "#111827", ink: "#f9fafb", shape: "square", bw: true },
    { id: "jolja", name: "拙作 ENT", logo: "拙", color: "#78716c", ink: "#fff", shape: "square", note: "졸작영화 전문" },
    { id: "ppori", name: "뽀리", logo: "뽀리", color: "#f472b6", ink: "#fff", shape: "circle" },
    { id: "samsaek", name: "삼색시네마", logo: "三色", color: "#2563eb", ink: "#fff", shape: "tri" },
    { id: "goodfilm", name: "Good Film!", logo: "GF!", color: "#16a34a", ink: "#fff", shape: "star" },
    { id: "myeongjak", name: "명작시네마", logo: "名作", color: "#b45309", ink: "#fef3c7", shape: "crown", note: "명작 영화 전문" },
    { id: "moviescreen", name: "Movie Screen", logo: "MS", color: "#0f766e", ink: "#fff", shape: "square" },
    { id: "action123", name: "Action 123", logo: "A123", color: "#f97316", ink: "#111", shape: "bolt", genre: "액션" },
    { id: "kidz", name: "Kidz!", logo: "Kidz!", color: "#facc15", ink: "#1e3a8a", shape: "circle", genre: "가족" },
    { id: "adultfilms", name: "Adult Films", logo: "AF", color: "#be123c", ink: "#fff", shape: "heart", genre: "성인" },
    { id: "redlips", name: "Red Lips", logo: "💋", color: "#e11d48", ink: "#fff", shape: "lips", genre: "성인" },
    { id: "cinematheque", name: "Cinematheque", logo: "CQ", color: "#334155", ink: "#e2e8f0", shape: "square" },
    { id: "crazy", name: "Crazy Films", logo: "CRZ", color: "#84cc16", ink: "#111", shape: "star", genre: "코미디" },
    { id: "dodo", name: "Dodo Movie", logo: "dodo", color: "#38bdf8", ink: "#0c4a6e", shape: "circle" },
    { id: "rgb", name: "R.G.B Screen", logo: "RGB", color: "#111827", ink: "#fff", shape: "rgb" },
    { id: "spookies", name: "Spookies", logo: "👻", color: "#4c1d95", ink: "#e9d5ff", shape: "ghost", genre: "공포" }
];
export const BRAND_BY_ID = Object.fromEntries(BRANDS.map(b => [b.id, b]));

// ---------------------------------------------------------------- 🏪 the 37 shop kinds
//   genre: only that genre (null = all) · nation: only movies made there · stars: [min, max]
//   gear: needs that item (used up) · fee / feePts: entry fee · chance: random entry (0~1) · battle: win an EmoMon battle first
//   resident: citizens / naturalized / 영주권자 of `nation` walk in, others get `chance`
const S = (id, name, o) => ({ id, name, genre: null, nation: null, stars: [1, 7], ...o });
export const SHOP_KINDS = [
    S("basic", "Basic VHS", { stars: [1, 1] }),
    S("sky", "Sky VHS", { gear: "wings" }),
    S("bubble", "Bubble VHS", { gear: "oxygen" }),
    S("space", "Space VHS", { gear: "space_suit" }),
    S("funmovie", "Fun Movie", { genre: "코미디", stars: [1, 6], chance: 0.6 }),
    S("diamond", "Diamond VHS", { stars: [4, 7], feePts: 50 }),
    S("richs", "Rich's VHS", { stars: [3, 6], fee: 10000 }),
    S("battle", "Battle VHS", { stars: [5, 7], battle: true }),
    S("hyhg", "HYHG VHS", { stars: [3, 6], chance: 0.6 }),
    S("bmovie", "B-Movie VHS", { stars: [4, 7], chance: 0.6 }),
    S("horrormania", "Horror Mania", { genre: "공포", stars: [1, 3] }),
    S("vhsland", "VHS Land", { stars: [3, 7], chance: 0.6 }),
    S("vhsmania", "VHS Mania", { stars: [1, 3] }),
    S("rare", "Rare VHS", { stars: [4, 7], chance: 0.3 }),
    S("donghaeng", "同行 VHS", { stars: [4, 7], chance: 0.3 }),
    S("actionmania", "Action Mania", { genre: "액션", stars: [1, 3] }),
    S("thrillermania", "Thriller Mania", { genre: "스릴러", stars: [1, 3] }),
    S("dramamania", "Drama Mania", { genre: "드라마", stars: [1, 3] }),
    S("romancemania", "Romance Mania", { genre: "로맨스", stars: [1, 3] }),
    S("comedymania", "Comedy Mania", { genre: "코미디", stars: [1, 3] }),
    S("sfmania", "SF Mania", { genre: "SF", stars: [1, 3] }),
    S("fantasymania", "Fantasy Mania", { genre: "판타지", stars: [1, 3] }),
    S("adultmania", "Adult Mania", { genre: "성인", stars: [1, 3] }),
    S("musicalmania", "Musical Mania", { genre: "뮤지컬", stars: [1, 3] }),
    S("familymania", "Family Mania", { genre: "가족", stars: [1, 3] }),
    S("horrorland", "Horror Land", { genre: "공포", stars: [4, 7], chance: 0.6 }),
    S("adultland", "Adult Land", { genre: "성인", stars: [4, 7], chance: 0.6 }),
    S("horrorparty", "Horror Party", { genre: "공포", chance: 0.5 }),
    S("actionland", "Action Land", { genre: "액션", stars: [4, 7], chance: 0.6 }),
    S("adultparty", "Adult Party", { genre: "성인", chance: 0.5 }),
    ...COUNTRIES.map(c => S("nat_" + c.toLowerCase().replace(/[^a-z]/g, ""), `${c} VHS`, { nation: c, stars: [1, 3], chance: 0.4, resident: true })),
    S("lgbtq", "LGBTQ Mania", { lgbtq: true }),
    S("oneworld", "One World VHS", {})
];
export const SHOP_BY_ID = Object.fromEntries(SHOP_KINDS.map(s => [s.id, s]));
export const shopRule = k => [
    k.genre ? `${GENRE_EMOJI[k.genre] || ""} ${k.genre} 장르` : k.lgbtq ? "🏳️‍🌈 LGBTQ 영화" : "모든 장르",
    k.nation ? `${k.nation} 제작` : "모든 국가",
    `희귀도 ★${k.stars[0]}${k.stars[1] !== k.stars[0] ? `~${k.stars[1]}` : ""}`
].join(" · ");
export const shopDoor = k => k.gear ? `${{ wings: "🪽 날개", oxygen: "🤿 산소통", space_suit: "🧑‍🚀 우주복" }[k.gear]} 필요 (입장할 때 1개 사용)`
    : k.fee ? `입장료 ${k.fee.toLocaleString()}G` : k.feePts ? `입장료 ${k.feePts}P`
    : k.battle ? "⚔ 랜덤 NPC 배틀러와 이모몬스터 대결 — 이겨야 입장 (HP · 질병은 그대로 남음)"
    : k.resident ? `${k.nation} 시민권자 · 귀화자 · 영주권자는 바로 입장, 아니면 ${Math.round(k.chance * 100)}% 확률`
    : k.chance ? `랜덤 입장 (승인 확률 ${Math.round(k.chance * 100)}%)` : "자유 입장";

// ---------------------------------------------------------------- 💰 prices (동행 Video Shop)
//   one 0~1 score decides both prices — the more, the dearer:
//     희귀도 ★1 → ★7 (40%) · 작품성 ★7 → ★1 (30%) · 장르 (15%): 뮤지컬·드라마·가족 < 판타지·SF·액션·어드벤처·스릴러·로맨스 < 코미디·공포·성인
//     · 등급 (15%): 흰띠 → HYHG띠
//   비디오 표지 꺼내기 500 ~ 10,000G · 비디오 구입 10,000 ~ 100,000G
//   (the dearest: ★7 rarity · ★1 quality · 코미디/공포/성인 · HYHG띠)
export const GENRE_TIER = { 뮤지컬: 0, 드라마: 0, 가족: 0, 판타지: 1, SF: 1, 액션: 1, 어드벤처: 1, 스릴러: 1, 로맨스: 1, 코미디: 2, 공포: 2, 성인: 2 };
export const COVER_FEE = [500, 10000];
export const BUY_PRICE = [10000, 100000];
const clamp7 = n => Math.min(7, Math.max(1, +n || 1));
export function priceScore(m) {
    const rare = (clamp7(m.stars) - 1) / 6;
    const bad = (7 - clamp7(m.quality || 7)) / 6;
    const genre = Math.max(0, ...(m.genres || []).map(g => GENRE_TIER[g] ?? 1)) / 2;
    const ri = RATINGS.findIndex(r => r.id === m.rating);
    const rating = Math.max(0, ri) / (RATINGS.length - 1);
    return rare * 0.4 + bad * 0.3 + genre * 0.15 + rating * 0.15;
}
const scaled = ([a, b], s, step) => Math.round((a + s * (b - a)) / step) * step;
export const coverFeeOf = m => scaled(COVER_FEE, priceScore(m), 100);
export const buyPriceOf = m => scaled(BUY_PRICE, priceScore(m), 1000);

// 🔑 영화DB: a movie's covers and film open only with its creator's code (null = no code set yet → stays locked)
export const CREATOR_CODES = { James: "2026", Dylan: null };
export const creatorOf = m => m.creator || "James";
// 💀 Body Count: the cast members who die in the film (on screen or found dead off-screen) — ghosts, monsters and spirits are not counted
//   an entry is a role name, or { r: role, scene: "Scene 6 · 헛간", how: "how they died", off: true (Off Screen) } — listed in the order they die
const bcRole = e => typeof e === "string" ? e : e?.r;
export const bodyCountInfo = m => (m.bodyCount || []).map(e => {
    const c = m.cast.find(x => x.role === bcRole(e) || x.short === bcRole(e));
    return c ? { c, scene: e?.scene || "", how: e?.how || "", off: !!e?.off } : null;
}).filter(Boolean);
export const bodyCountOf = m => bodyCountInfo(m).map(x => x.c);

// ---------------------------------------------------------------- seeded random
export function seeded(str) {
    let h = 2166136261;
    for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
// ---------------------------------------------------------------- 🖼️ cover style per brand (영화사)
//   중간표지 (spine): main = the big title ("ko" Korean, one vertical line · "en" the English title sideways)
//                     sub = the small title ("en" · "ko" Korean small · "row" Korean across in a small row · null = none)
//                     still = "none" · "small" (a small still) · "under" (a still under the Korean row) · band = the 띠 colour block
//   front / back: the brand's own default cover layout (a movie's own cover order — cover.front.layout / cover.back.layout — wins)
const BS = (band, main, sub, still, front, back) => ({ band, main, sub, still, front, back });
export const BRAND_STYLE = {
    hyhg: BS(1, "ko", "en", "small", "lineup", "stills4"),
    bmovie: BS(0, "en", "row", "under", "still", "still1"),
    ghost: BS(1, "ko", "en", "none", "spotlight", "stills2"),
    mj: BS(1, "ko", "en", "none", "stage", "strip3"),
    dung: BS(1, "ko", "en", "none", "pyramid", "stills2"),
    ground: BS(1, "ko", "en", "none", "lineup", "filmstrip"),
    emo: BS(1, "ko", "en", "none", "duo", "polaroid"),
    poly: BS(1, "ko", "en", "none", "hero", "stills3"),
    bw: BS(1, "ko", "en", "small", "frame", "filmstrip"),
    jolja: BS(0, "en", "row", "none", "panels", "still1"),
    ppori: BS(1, "ko", "en", "small", "hero", "stills4"),
    samsaek: BS(0, "ko", "en", "small", "split", "stills3"),
    goodfilm: BS(1, "ko", null, "small", "hero", "stills2"),
    myeongjak: BS(1, "ko", "en", "none", "frame", "text"),
    moviescreen: BS(1, "ko", "en", "small", "lineup", "stills4"),
    action123: BS(1, "ko", "en", "small", "split", "strip3"),
    kidz: BS(1, "ko", "en", "small", "pyramid", "polaroid"),
    adultfilms: BS(1, "ko", "en", "small", "duo", "stills2"),
    redlips: BS(1, "ko", "en", "small", "spotlight", "still1"),
    cinematheque: BS(0, "ko", null, "none", "frame", "polaroid"),
    crazy: BS(0, "ko", null, "small", "panels", "stills4"),
    dodo: BS(1, "en", "ko", "none", "hero", "strip3"),
    rgb: BS(0, "en", "ko", "none", "split", "filmstrip"),
    spookies: BS(0, "en", "ko", "none", "spotlight", "stills2")
};
export const brandStyle = id => BRAND_STYLE[id] || BRAND_STYLE.hyhg;
export const FRONT_LAYOUTS = [["", "영화사 기본"], ["lineup", "배우들 일렬"], ["hero", "주연 크게 + 조연"], ["duo", "주연 둘 마주보기"], ["still", "스틸컷 한 장"], ["spotlight", "스포트라이트"],
    ["stage", "무대 위"], ["pyramid", "피라미드"], ["frame", "액자"], ["panels", "만화 칸"], ["split", "대각선 분할"], ["money-burst", "돈뭉치 위 주연 + 뚫고 나온 배우들"], ["rocket", "날아온 로켓 위 주연 + 지켜보는 배우들"],
    ["concert", "공연장 무대 위 주연 전원"], ["barn", "촛불 들고 헛간 앞에 선 주연"], ["moon", "보름달을 뚫고 째려보는 빨간 눈 + 늑대 실루엣"], ["clawmoon", "보름달 뜬 숲 + 뚫고 나온 늑대손"]];
export const BACK_LAYOUTS = [["", "영화사 기본"], ["stills4", "스틸컷 4장"], ["stills3", "스틸컷 3장"], ["stills2", "스틸컷 2장"], ["still1", "스틸컷 1장 크게"], ["strip3", "가로 띠 3장"],
    ["filmstrip", "필름 스트립"], ["polaroid", "폴라로이드"], ["side3", "왼쪽 세로 스틸컷 3장"], ["text", "글 위주 (스틸컷 없음)"]];
export const STILL_N = { stills4: 4, stills3: 3, stills2: 2, still1: 1, strip3: 3, filmstrip: 3, polaroid: 2, side3: 3, text: 0 };

// ---------------------------------------------------------------- 😀 a line's mood (when the script doesn't say)
export function lineMood(text) {
    const t = String(text || "");
    if (/크크|ㅋㅋ|후후|흐흐/.test(t)) return "evil";
    if (/뭐야|당장|놓쳤|잡아|거기 서|사기꾼|이놈|비켜/.test(t)) return "angry";
    if (/헉|어\?|\?!|깜짝|세상에/.test(t)) return "shock";
    if (/튀어|도망|살려/.test(t)) return "scared";
    if (/…|ㅠ|흑/.test(t)) return "sad";
    if (/!!|~!|최고|좋아|역시/.test(t)) return "excited";
    if (/~/.test(t)) return "happy";
    if (/\?/.test(t)) return "shock";
    return "happy";
}
// what a line does with the body (when the script doesn't say)
export const lineAct = text => /튀어|도망|비켜|거기 서/.test(text) ? "run" : /!!/.test(text) ? "stomp" : /~/.test(text) ? "hop" : "talk";

// ---------------------------------------------------------------- players by name (the cast)
const findPid = nameKo => Store.allPlayers.find(p => p.name_ko === nameKo)?.id ?? null;

// ---------------------------------------------------------------- ⭐ built-in movie: 복덩이 사기단 (the admin's own idea · saved in the movie DB)
//   cast: { pid, ko: player name (kept for the record), role, part: lead | support | extra, nude?, look? (how they always look in the film, e.g. { outfit: "clothes" }) }
//   script: parts the 🎬 cinema plays (screens/vhs.js) — sec = seconds on screen
//   a scene: who (roles on screen) · cast { role: { expr, pose, hold, act } } (how they start) · lines [who, text, { expr, pose, hold, act }]
//            · nude (roles shown topless) · props · bg · fx
const fortuneSwindlers = () => {
    const P = n => findPid(n);
    const HENRY = "Henry", JUSTIN = "Justin", JACK = "Jack, the Gang Boss", PAUL = "Paul, the Gangster", LILY = "Lily", TAXI = "Taxi Driver", BABE = "Jack's Babe", BANKER = "Banker";
    return {
        id: "m_fortune_swindlers", builtin: true,
        en: "Fortune Swindlers", ko: "복덩이 사기단",
        brand: "hyhg", nation: "Emo World", date: "0-02-14", creator: "James", stock: { maps: 105, shops: 195 }, bodyCount: [],
        genres: ["코미디"], rating: "water", stars: 1, quality: 6, lgbtq: false,
        cast: [
            { ko: "짱구", pid: P("짱구"), role: HENRY, part: "lead" },
            { ko: "스마일", pid: P("스마일"), role: JUSTIN, part: "lead" },
            { ko: "남자이모", pid: P("남자이모"), role: JACK, short: "Jack", part: "support" },
            { ko: "힘쎈이", pid: P("힘쎈이"), role: PAUL, short: "Paul", part: "support" },
            { ko: "행복이모", pid: P("행복이모"), role: LILY, part: "support" },
            { ko: "보라곰돌이", pid: P("보라곰돌이"), role: TAXI, part: "extra" },
            { ko: "완전에로년덩이", pid: P("완전에로년덩이"), role: BABE, part: "extra", nude: true },
            { ko: "똥멜론", pid: P("똥멜론"), role: BANKER, part: "extra" }
        ],
        plot: "사고만 치고 다니는 두 친구 Henry와 Justin이 우연히 범죄에 휘말리게 되면서 벌어지는 대소동.",
        tagline: "이들이 나타나면 온 세상의 배꼽이 뒤집어 진다!!",
        music: "comic",
        cover: {
            spine: { font: "comic", still: { bg: "money", who: [{ r: HENRY, expr: "excited", pose: "both" }] } },
            // 앞표지: Henry · Justin on a bed of money bundles (통쾌) — Paul · Jack · Lily burst out of the money, face and chest only (못마땅) · Jack and Paul hold guns
            front: { layout: "money-burst", bg: "#38bdf8",
                main: [{ r: HENRY, expr: "excited", pose: "both", hold: "money" }, { r: JUSTIN, expr: "excited", pose: "wave", hold: "money" }],
                back: [{ r: PAUL, expr: "annoyed", pose: "point", hold: "gun" }, { r: LILY, expr: "annoyed", pose: "hips" }, { r: JACK, expr: "angry", pose: "point", hold: "gun" }] },
            // 뒷표지: 4 stills made again for the cover
            back: { layout: "stills4", stills: [
                { bg: "street", props: ["🧦"], cap: "오늘만 특가!", who: [{ r: JUSTIN, expr: "excited", pose: "wave", hold: "sock" }, { r: HENRY, expr: "smug", pose: "point" }, { r: LILY, expr: "love", pose: "hips" }] },
                { bg: "bank", props: ["💰"], cap: "오늘도 한껀 했다!", who: [{ r: BANKER, expr: "happy", pose: "down" }, { r: JUSTIN, expr: "evil", hold: "money" }, { r: HENRY, expr: "excited", pose: "both" }] },
                { bg: "street", props: ["💎"], cap: "헉! 금은보화가!!", who: [{ r: JUSTIN, expr: "shock", hold: "bag" }, { r: HENRY, expr: "shock", pose: "shrug" }] },
                { bg: "taxi", props: ["🚕"], cap: "아무 곳이나요~!!", who: [{ r: TAXI, expr: "happy", pose: "down" }, { r: JUSTIN, expr: "excited", pose: "wave" }, { r: HENRY, expr: "excited", pose: "both" }] }
            ] }
        },
        script: [
            { k: "brand", sec: 4 },
            { k: "title", sec: 8, style: "comic" },
            { k: "cast", sec: 7, parts: ["lead", "support"] },
            { k: "scene", n: 1, place: "거리 · 양말 노점", music: "market", sec: 12, bg: "street", props: ["🧦", "🧦"], who: [JUSTIN, HENRY, LILY],
                cast: { [JUSTIN]: { hold: "sock" }, [LILY]: { expr: "happy" } },
                lines: [
                    [JUSTIN, "자자~ 오늘만 특가! 세상에서 제일 부드러운 양말이 왔어요!", { expr: "excited", pose: "wave", hold: "sock", act: "hop" }],
                    [LILY, "어머, 이 양말 얼마예요?", { expr: "love", pose: "hips" }],
                    [HENRY, "100,000G입니다! 최고급 양말이에요, 손님!", { expr: "smug", pose: "point" }],
                    [LILY, "좋아요, 살게요!", { expr: "excited", pose: "both", act: "hop" }]] },
            { k: "scene", n: 2, place: "거리 · 추격", music: "chase", sec: 9, bg: "street", props: ["📱"], who: [LILY, JUSTIN, HENRY], fx: "chase",
                lines: [
                    [LILY, "(검색 중…) 뭐야? 10,000G짜리잖아?!", { expr: "shock", hold: "phone" }],
                    [LILY, "이 사기꾼들아!! 거기 서!!", { expr: "angry", pose: "point", act: "stomp" }],
                    [HENRY, "튀어!!", { expr: "scared", pose: "both", act: "run" }]] },
            { k: "scene", n: 3, place: "은행", music: "lounge", sec: 9, bg: "bank", props: ["💰"], who: [JUSTIN, HENRY, BANKER],
                lines: [
                    [BANKER, "어서 오세요~ 100,000G 출금 도와드릴게요.", { expr: "happy", pose: "wave" }],
                    [JUSTIN, "오늘도 한껀 했다!", { expr: "excited", hold: "money", act: "hop" }],
                    [HENRY, "크크크, 역시 우리야!", { expr: "evil", pose: "hips" }]] },
            { k: "scene", n: 4, place: "뒷골목", music: "mystery", sec: 10, bg: "street", props: ["💼", "💎"], who: [JUSTIN, HENRY], fx: "sparkle",
                lines: [
                    [JUSTIN, "어? 이거 누가 떨어뜨린 돈가방인데…?", { expr: "shock", pose: "point" }],
                    [HENRY, "헉! 금은보화가 가득해!!", { expr: "shock", pose: "shrug", act: "jump" }],
                    [JUSTIN, "일단 들고 튀자!", { expr: "evil", hold: "bag", act: "run" }]] },
            // 아지트: Jack's Babe dances topless, shaking her chest, the whole scene
            { k: "scene", n: 5, place: "갱단 아지트", music: "club", sec: 11, bg: "hideout", props: ["🍾"], who: [JACK, BABE, PAUL], nude: [BABE], fx: "music",
                cast: { [BABE]: { expr: "wink", pose: "both", act: "dance" }, [JACK]: { expr: "cool", pose: "hips" } },
                lines: [
                    [PAUL, "보스… 돈가방이 없어졌습니다.", { expr: "scared", pose: "shrug", act: "shake" }],
                    [JACK, "뭐야?! 당장 그 돈가방 찾아와!!", { expr: "angry", pose: "point", hold: "gun", act: "stomp" }]] },
            { k: "scene", n: 6, place: "은행 앞", music: "noir", sec: 10, bg: "bank", who: [PAUL, LILY],
                lines: [
                    [PAUL, "이봐, 혹시 돈가방 든 놈들 못 봤어?", { expr: "annoyed", pose: "point", hold: "gun" }],
                    [LILY, "봤죠! 양말 파는 사기꾼 둘이요. 하나는 웃는 얼굴, 하나는 짱구 머리!", { expr: "angry", pose: "point", act: "stomp" }]] },
            { k: "scene", n: 7, place: "거리 · 대추격", music: "action", sec: 13, bg: "street", props: ["🚕", "💸", "💸", "💸"], who: [JUSTIN, HENRY, JACK, PAUL], fx: "money",
                cast: { [JACK]: { hold: "gun" }, [PAUL]: { hold: "gun" } },
                lines: [
                    [JACK, "저기 있다! 잡아!!", { expr: "angry", pose: "point", hold: "gun", act: "stomp" }],
                    [JUSTIN, "택시!! 그리고… 받아라~!", { expr: "excited", pose: "both", hold: "money", act: "jump" }],
                    [PAUL, "돈이다!! 비켜, 비켜!!", { expr: "love", pose: "both", act: "run" }],
                    [JACK, "놓쳤잖아!!", { expr: "angry", pose: "shrug", hold: "gun", act: "stomp" }]] },
            { k: "scene", n: 8, place: "거리 · 돈벼락", music: "happy", sec: 8, bg: "street", props: ["💸"], who: [LILY, HENRY], fx: "money",
                lines: [
                    [LILY, "어머, 하늘에서 돈이…!", { expr: "love", pose: "both", act: "hop" }],
                    [HENRY, "저희 더 이상 당신에게 빚 없어요~!", { expr: "tongue", pose: "wave", act: "hop" }]] },
            { k: "scene", n: 9, place: "택시 안", music: "road", sec: 10, bg: "taxi", props: ["🚕"], who: [TAXI, JUSTIN, HENRY],
                lines: [
                    [TAXI, "어디로 모실까요?", { expr: "happy", pose: "down" }],
                    [JUSTIN, "아무 곳이나요~!!", { expr: "excited", pose: "both", act: "hop" }],
                    [HENRY, "저희가 한 껀 또 했잖아요~!!", { expr: "excited", pose: "both", hold: "money", act: "jump" }]] },
            { k: "end", sec: 9, text: "The End", credits: true, music: "victory" }
        ]
    };
};

// ---------------------------------------------------------------- ⭐ built-in movie: 말하는 초콜릿 (Hello Baby · the admin's own idea)
//   music: audio/movies/hello_baby_theme_1.mp3 (title · cast · Tim's dream) · hello_baby_theme_2.mp3 (무도회장)
//   scene extras: dark (lights off) · line meta light "on"/"off" · music · set { role: { expr, act, nude, outfit, gone } } · to (aimed at)
const THEME1 = "audio/movies/hello_baby_theme_1.mp3", THEME2 = "audio/movies/hello_baby_theme_2.mp3";
const helloBaby = () => {
    const P = n => findPid(n);
    const VICKY = "Vicky", TIM = "Tim", JANE = "Jane", ANGELA = "Angela", BRANDON = "Brandon", RADIO = "Radio Boy",
        DG1 = "Tim's Dream Girl #1", DG2 = "Tim's Dream Girl #2", DG3 = "Tim's Dream Girl #3", SG1 = "Shower Girl #1", SG2 = "Shower Girl #2";
    return {
        id: "m_hello_baby", builtin: true,
        en: "Hello Baby", ko: "말하는 초콜릿",
        brand: "redlips", nation: "Emo World", date: "78-03-29", creator: "James", stock: { maps: 5, shops: 10 }, bodyCount: [],
        genres: ["코미디"], rating: "flower", stars: 6, quality: 1, lgbtq: false,
        cast: [
            { ko: "헬로토끼", pid: P("헬로토끼"), role: VICKY, part: "lead", nude: true },
            { ko: "매력철철이모부", pid: P("매력철철이모부"), role: TIM, part: "lead", sexy: true },
            { ko: "박세미", pid: P("박세미"), role: JANE, part: "support", sexy: true },
            { ko: "네미시스토끼", pid: P("네미시스토끼"), role: ANGELA, part: "support", nude: true },
            { ko: "케인이모부", pid: P("케인이모부"), role: BRANDON, part: "support" },
            { ko: "간지나는개미", pid: P("간지나는개미"), role: RADIO, part: "extra" },
            { ko: "누글이모", pid: P("누글이모"), role: DG1, part: "extra", nude: true },
            { ko: "완전에로년덩이", pid: P("완전에로년덩이"), role: DG2, part: "extra", nude: true },
            { ko: "메르베쟈토토", pid: P("메르베쟈토토"), role: DG3, part: "extra", nude: true },
            { ko: "언니야개미", pid: P("언니야개미"), role: SG1, part: "extra", nude: true },
            { ko: "미니마니모", pid: P("미니마니모"), role: SG2, part: "extra" }
        ],
        plot: "아리따운 시골 처녀가 도시에 상경하면서 벌어지는 화끈하고 재미난 사건들.",
        tagline: "",
        music: "smooth",
        cover: {
            // 중간표지: logo · 구름 글씨 Korean title · the English title small — nothing else
            spine: { font: "cloud", still: false, band: false },
            // 앞표지: Vicky rides a big rocket into the campus, lovely · small in the campus: Tim (hearts in his eyes) · Jane (angry)
            front: { layout: "rocket", bg: "#f9a8d4",
                main: [{ r: VICKY, expr: "love", pose: "wave" }],
                back: [{ r: TIM, expr: "love", pose: "both" }, { r: JANE, expr: "angry", pose: "hips" }] },
            // 뒷표지: the shower scene (steam · every chest under a mosaic)
            back: { layout: "still1", stills: [
                { bg: "shower", fx: "steam", mosaic: true, cap: "여자샤워실의 비밀 수다",
                    who: [{ r: SG1, expr: "annoyed", pose: "point", nude: true }, { r: VICKY, expr: "shy", nude: true }, { r: ANGELA, expr: "excited", pose: "both", nude: true }, { r: SG2, expr: "scared", pose: "shrug" }] }
            ] }
        },
        script: [
            { k: "brand", sec: 4 },
            // 핑크빛 화면 · 날아다니는 로켓 · 영어 원제 → 입술 자국 → 한글 제목 (Theme 1)
            { k: "title", sec: 8, style: "rockets", font: "cloud", music: THEME1 },
            { k: "cast", sec: 8, parts: ["lead", "support"] },
            // Scene 1 · 대학교
            { k: "scene", n: 1, place: "대학교", music: "campus", sec: 13, bg: "campus", who: [VICKY, ANGELA], props: ["🏫"],
                cast: { [VICKY]: { expr: "excited", hold: "bag" } },
                lines: [
                    [VICKY, "와~ 여기가 도시의 대학교구나! 건물이 하늘까지 닿겠어~", { expr: "excited", pose: "both", act: "hop" }],
                    [ANGELA, "안녕! 나는 Angela야. 너 새로 왔구나?", { expr: "happy", pose: "wave", to: VICKY }],
                    [VICKY, "응, 시골에서 어제 막 올라왔어. 지하철은 너무 신기한데… 길을 잃을까 봐 걱정이야.", { expr: "sweat", pose: "shrug" }],
                    [ANGELA, "걱정 마~ 내가 다 알려줄게!", { expr: "wink", pose: "point", to: VICKY }]] },
            // Scene 2 · Tim의 방 — 불 꺼진 방, 잠든 Tim
            { k: "scene", n: 2, place: "Tim의 방", music: "lullaby", sec: 6, bg: "room", dark: true, who: [TIM], props: ["💤"],
                cast: { [TIM]: { expr: "sleepy", act: "sleep" } },
                lines: [["", "불 꺼진 방… 혈기왕성 청년 Tim이 잠이 들어 꿈을 꾸는데…"]] },
            // 꿈: 커튼을 치자 안개가 걷히고, Dream Girl 3명이 락음악에 맞춰 몸을 흔든다 (Theme 1)
            { k: "scene", n: 2, place: "Tim의 방 · 꿈속", sec: 14, bg: "room", fx: "fog", music: THEME1, who: [DG1, DG2, TIM, DG3], nude: [DG1, DG2, DG3], props: ["🎸", "🤘", "🎸"],
                cast: { [DG1]: { expr: "wink", pose: "both", act: "dance" }, [DG2]: { expr: "love", pose: "both", act: "dance" }, [DG3]: { expr: "wink", pose: "wave", act: "dance" }, [TIM]: { expr: "love", pose: "both" } },
                lines: [
                    [TIM, "어디 보자… (커튼을 촤악!)", { expr: "excited", pose: "both", act: "hop" }],
                    ["", "안개가 걷히고 락 음악이 쾅쾅! 요염한 Dream Girl들이 몸을 흔든다~"],
                    [DG1, "Tim~ 우리랑 놀자~", { expr: "wink", pose: "wave", act: "dance" }],
                    [TIM, "우와… 여기가 천국이구나!!", { expr: "love", pose: "both", act: "jump" }]] },
            // 방불이 켜지고 Jane의 호통 → 비키니 자랑
            { k: "scene", n: 2, place: "Tim의 방", music: "comic", sec: 14, bg: "room", dark: true, who: [TIM, JANE],
                cast: { [TIM]: { expr: "love", act: "sleep" }, [JANE]: { expr: "angry", pose: "hips" } },
                lines: [
                    [JANE, "Tim!!! 당장 일어나!!", { light: "on", expr: "angry", pose: "point", act: "stomp", to: TIM, set: { [TIM]: { expr: "shock", act: "shake" } } }],
                    [TIM, "헉! 자기야… 언제 왔어?", { expr: "sweat", pose: "shrug" }],
                    [JANE, "너 지금 야한 꿈 꿨지? 얼굴에 다 써 있어!", { expr: "annoyed", pose: "point", to: TIM, set: { [TIM]: { expr: "sweat", act: "" } } }],
                    [JANE, "흥, 그럼 이거 봐봐~ 어제 산 비키니야!", { expr: "smug", pose: "wave", hold: "bikini", act: "hop" }],
                    [TIM, "오오… 꿈보다 낫네~!", { expr: "love", pose: "both", act: "hop" }]] },
            // 방불이 다시 꺼진 채로, Tim과 Jane이 사랑을 나눈다
            { k: "scene", n: 2, place: "Tim의 방", music: "romance", sec: 8, bg: "room", dark: true, fx: "hearts", who: [TIM, JANE],
                cast: { [TIM]: { expr: "love", act: "kiss" }, [JANE]: { expr: "love", act: "kiss" } },
                lines: [
                    ["", "방 불이 다시 꺼지고… Tim과 Jane은 사랑을 나눈다 ♥"],
                    [JANE, "사랑해, Tim~", { expr: "love", act: "kiss", to: TIM }]] },
            // Scene 3 · 대학교 — 수업을 마친 Vicky와 Angela, Tim과 Brandon을 마주친다
            { k: "scene", n: 3, place: "대학교", music: "happy", sec: 10, bg: "campus", who: [VICKY, ANGELA, TIM, BRANDON],
                cast: { [ANGELA]: { hold: "book" }, [VICKY]: { hold: "book", expr: "shy" } },
                lines: [
                    [ANGELA, "휴~ 드디어 수업 끝!", { expr: "happy", pose: "wave", hold: "book" }],
                    [TIM, "Brandon, 저기 저 예쁘고 순해 보이는 여자는 누구야?", { expr: "love", pose: "point", to: VICKY }],
                    [BRANDON, "아~ 시골에서 온 신입생이래.", { expr: "smug", pose: "hips" }],
                    [VICKY, "(소곤) Angela… 저 남자가 자꾸 우리 쪽을 봐…", { expr: "shy", hold: "book" }]] },
            // Jane 등장 — Vicky에게 망신을 준다
            { k: "scene", n: 3, place: "대학교", music: "bitchy", sec: 10, bg: "campus", who: [JANE, VICKY, ANGELA, TIM],
                cast: { [JANE]: { expr: "annoyed", pose: "hips" }, [TIM]: { expr: "sweat" }, [VICKY]: { hold: "book", expr: "shy" } },
                lines: [
                    [JANE, "Tim, 지금 누굴 그렇게 쳐다봐?", { expr: "annoyed", pose: "hips", to: TIM }],
                    [JANE, "어머, 너 시골에서 왔다며? 옷차림이 왜 이러니? 촌스러워~", { expr: "roll", pose: "point", act: "stomp", to: VICKY, set: { [VICKY]: { expr: "cry", act: "shake" } } }],
                    [VICKY, "흑…", { expr: "cry", hold: "book" }],
                    [ANGELA, "너무하잖아, Jane!", { expr: "angry", pose: "point", to: JANE, act: "stomp" }]] },
            // Scene 4 · 여자샤워실 — 김이 모락모락, 상반신 노출 (미니마니모는 노출 없음)
            { k: "scene", n: 4, place: "여자샤워실", music: "bubbly", sec: 16, bg: "shower", fx: "steam", who: [SG1, VICKY, ANGELA, SG2], nude: [SG1, VICKY, ANGELA], props: ["🚿", "🧼", "🚿"],
                cast: { [VICKY]: { expr: "shy" }, [SG2]: { expr: "happy" } },
                lines: [
                    [VICKY, "Angela… 사실 나 Tim한테 관심이 생겼어.", { expr: "shy", to: ANGELA }],
                    [ANGELA, "정말?! 깜짝이야~ 잘 해봐, 응원할게!", { expr: "excited", pose: "both", act: "hop", to: VICKY }],
                    [SG1, "얘, Tim 여친 Jane 알지? 성격이 아주 못됐어. 조심해!", { expr: "annoyed", pose: "point", to: VICKY }],
                    [SG2, "맞아 맞아, 걔 진짜 무서워~", { expr: "scared", pose: "shrug", act: "shake" }]] },
            // Scene 5 · 대학교 — Tim의 고백과 키스, 몰래 본 Jane
            { k: "scene", n: 5, place: "대학교", music: "romance", sec: 13, bg: "campus", fx: "hearts", who: [JANE, TIM, VICKY],
                cast: { [JANE]: { expr: "angry", act: "sneak" }, [VICKY]: { expr: "shy" } },
                lines: [
                    [TIM, "Vicky, 처음 본 순간부터 너한테 관심이 있었어.", { expr: "love", pose: "point", to: VICKY }],
                    [VICKY, "네…? 저, 저는… 어쩌죠…", { expr: "shy", pose: "shrug", act: "shake" }],
                    [TIM, "(쪽♥)", { expr: "love", act: "kiss", to: VICKY, set: { [VICKY]: { expr: "shock", act: "kiss" } } }],
                    [JANE, "(몰래 보며) 뭐야?! 저 시골뜨기가 감히!!", { expr: "angry", act: "stomp" }]] },
            // Scene 6 · Tim의 방 — 고백, 둘 다 상의를 벗고 사랑을 나눈다
            { k: "scene", n: 6, place: "Tim의 방", music: "sexy", sec: 13, bg: "room", who: [TIM, VICKY],
                cast: { [VICKY]: { expr: "shy" } },
                lines: [
                    [TIM, "난 이제 Jane한테 관심 없어. 네가 내 타입이야.", { expr: "love", pose: "point", to: VICKY }],
                    [VICKY, "Tim… 나도 네가 좋아.", { expr: "shy", to: TIM }],
                    ["", "Tim이 셔츠를 벗고, Vicky도 상의를 벗는다…", { set: { [TIM]: { nude: true, expr: "love" }, [VICKY]: { nude: true, expr: "love" } } }],
                    ["", "그리고 둘은 사랑을 나눈다 ♥", { light: "off", set: { [TIM]: { act: "kiss" }, [VICKY]: { act: "kiss" } } }]] },
            // Scene 7 · 대학교 — Radio Boy의 무도회 안내
            { k: "scene", n: 7, place: "대학교", music: "march", sec: 7, bg: "campus", who: [RADIO, VICKY, ANGELA], props: ["📢"],
                cast: { [RADIO]: { hold: "radio" } },
                lines: [
                    [RADIO, "알립니다~! 종강 후 금요일 밤, 대망의 무도회가 열립니다~!", { expr: "excited", pose: "wave", hold: "radio", act: "hop" }],
                    [ANGELA, "무도회래! 너도 갈 거지, Vicky?", { expr: "excited", pose: "both", to: VICKY }]] },
            // Jane의 따귀 · Angela를 밀치고 떠난다
            { k: "scene", n: 7, place: "대학교", music: "tense", sec: 8, bg: "campus", who: [VICKY, JANE, ANGELA],
                cast: { [JANE]: { expr: "angry" } },
                lines: [
                    [JANE, "(찰싹!) 똑똑히 들어! Tim은 내 무도회 파트너야!", { expr: "angry", pose: "point", act: "slap", to: VICKY, set: { [VICKY]: { expr: "cry", act: "hit" } } }],
                    [ANGELA, "Jane, 그만해!", { expr: "angry", pose: "both", to: JANE }],
                    [JANE, "비켜!", { expr: "angry", act: "push", to: ANGELA, set: { [ANGELA]: { expr: "dizzy", act: "fall" } } }]] },
            // Tim의 위로 · Brandon의 계획
            { k: "scene", n: 7, place: "대학교", music: "sneaky", sec: 7, bg: "campus", who: [VICKY, TIM, BRANDON],
                cast: { [VICKY]: { expr: "cry" } },
                lines: [
                    [TIM, "Vicky, 괜찮아? 많이 아팠지…", { expr: "sad", pose: "both", to: VICKY }],
                    [VICKY, "흑… 괜찮아요…", { expr: "cry" }],
                    [BRANDON, "Tim, 걱정 마. Jane이랑 깔끔하게 헤어질 좋은 계획이 있어. 크크", { expr: "evil", pose: "point", to: TIM }]] },
            // Scene 8 · 무도회장 (Theme 2)
            { k: "scene", n: 8, place: "무도회장", sec: 26, bg: "ballroom", fx: "disco", music: THEME2, who: [VICKY, ANGELA, TIM, JANE, BRANDON], props: ["🎉", "😂", "🎉"],
                cast: { [VICKY]: { expr: "sad", act: "dance" }, [ANGELA]: { expr: "happy", act: "dance" }, [TIM]: { expr: "blank", act: "dance" }, [JANE]: { expr: "smug", act: "dance", outfit: "dress" }, [BRANDON]: { expr: "evil", act: "sneak" } },
                lines: [
                    [JANE, "오호호~ 오늘 밤 주인공은 나야!", { expr: "smug", pose: "both", act: "dance" }],
                    [VICKY, "(Tim을 바라보며) …Angela, 우리끼리 추자.", { expr: "sad", act: "dance", to: ANGELA }],
                    ["", "음악이 끝나고… Brandon이 몰래 Jane의 드레스 끈을 잡아당긴다!", { music: "stop", set: { [VICKY]: { act: "" }, [ANGELA]: { act: "" }, [TIM]: { act: "" }, [JANE]: { act: "" } } }],
                    [JANE, "꺄악!! 내 드레스!!", { expr: "shock", pose: "both", act: "shake", set: { [JANE]: { outfit: "bikini", expr: "cry" }, [VICKY]: { expr: "tongue", act: "laugh" }, [ANGELA]: { expr: "tongue", act: "laugh" }, [TIM]: { expr: "roll", act: "laugh" } } }],
                    [BRANDON, "너처럼 헤픈 애는 Tim의 상대가 아니야!", { expr: "smug", pose: "point", to: JANE }],
                    [JANE, "흥!! 다들 두고 봐!!", { expr: "angry", act: "run" }],
                    [TIM, "Vicky, 나랑 춤출래?", { expr: "love", pose: "wave", to: VICKY, music: THEME2, set: { [JANE]: { gone: true }, [VICKY]: { expr: "love", act: "dance" } } }],
                    [BRANDON, "Angela, 우리도 출까?", { expr: "love", pose: "wave", to: ANGELA, set: { [ANGELA]: { expr: "shy", act: "dance" }, [TIM]: { expr: "love", act: "dance" }, [BRANDON]: { expr: "happy", act: "dance" } } }],
                    [ANGELA, "좋아~!", { expr: "excited", act: "dance" }]] },
            { k: "end", sec: 8, text: "The End", credits: true }
        ]
    };
};
// ---------------------------------------------------------------- ⭐ built-in movie: 앙클베리 (Hurry Kid Me · the admin's own idea)
//   everyone plays themselves (Herself / Himself) → each cast member's `short` is their own name, and the script uses that
//   scene extras: crowd (> 7 on screen → two rows) · call (someone on the phone, in a bubble) · sfx · flash
const hurryKidMe = () => {
    const P = n => findPid(n);
    const me = (ko, part, she) => ({ ko, pid: P(ko), role: she ? "Herself" : "Himself", short: ko, part });
    const LEADS = ["하댕이", "파댕이", "꽃찌", "짱구", "스마일", "다람쥐토끼", "남자토끼", "방울토끼", "보라곰돌이", "호빵맨", "돌고래"];
    const SUPS = ["덩이", "가리", "거북이", "롱토끼", "빠찌", "뽀야", "공자"];
    const SHE = new Set(["하댕이", "꽃찌", "다람쥐토끼", "방울토끼", "롱토끼", "빠찌", "뽀야"]);
    const MC = "Show MC", A1 = "짱구이모", A2 = "1909이모부", A3 = "레인보우곰돌이";
    // on stage: the back row (supporting cast + 호빵맨 · 돌고래), the front row with 하댕이 in the middle
    const CHOIR = ["덩이", "가리", "거북이", "롱토끼", "호빵맨", "돌고래", "빠찌", "뽀야", "공자", "다람쥐토끼", "남자토끼", "짱구", "파댕이", "하댕이", "꽃찌", "방울토끼", "스마일", "보라곰돌이"];
    const TEAM = ["다람쥐토끼", "남자토끼", "방울토끼", "보라곰돌이", "호빵맨", "돌고래", "짱구", "파댕이", "하댕이", "꽃찌", "스마일"];
    const all = (list, o) => Object.fromEntries(list.map(r => [r, typeof o === "function" ? o(r) : o]));
    const sing = all(CHOIR, r => ({ expr: r === "꽃찌" ? "happy" : "excited", pose: r === "하댕이" ? "wave" : "both", act: "hop" }));
    const SONG = "hurrykid";
    return {
        id: "m_hurry_kid_me", builtin: true,
        en: "Hurry Kid Me", ko: "앙클베리",
        brand: "hyhg", nation: "Emo World", date: "0-10-13", creator: "James", stock: { maps: 120, shops: 250 }, bodyCount: [],
        genres: ["뮤지컬", "드라마"], rating: "white", stars: 1, quality: 7, lgbtq: false,
        cast: [
            ...LEADS.map(n => me(n, "lead", SHE.has(n))),
            ...SUPS.map(n => me(n, "support", SHE.has(n))),
            { ko: "남자이모", pid: P("남자이모"), role: MC, part: "extra" },
            { ko: A1, pid: P(A1), role: "Audience", short: A1, part: "extra" },
            { ko: A2, pid: P(A2), role: "Audience", short: A2, part: "extra" },
            { ko: A3, pid: P(A3), role: "Audience", short: A3, part: "extra" }
        ],
        plot: "'앙클베리' 합창단원들의 동고동락하는 이야기.",
        tagline: "'하댕이파' 인원들 전격 출연!!",
        music: "hurrykid",
        cover: {
            // 중간표지: logo · big Korean title (plain black) · the English title small and sideways beside it
            spine: { font: "plain", sub: "side", still: false },
            // 앞표지: the concert hall, the 11 leads gathered on the stage
            front: { layout: "concert", bg: "#1e1b4b",
                main: ["다람쥐토끼", "보라곰돌이", "짱구", "스마일", "남자토끼", "돌고래", "방울토끼", "파댕이", "하댕이", "꽃찌", "호빵맨"]
                    .map((r, i) => ({ r, expr: r === "방울토끼" ? "smug" : "excited", pose: i % 3 ? "both" : "wave" })) },
            // 뒷표지: plot + 2 stills + cast / date / logo
            back: { layout: "stills2", short: true, stills: [
                { bg: "practice", props: ["🎼"], cap: "너 때문에 연습이 안 되잖아!", who: [{ r: "하댕이", expr: "shock", pose: "both" }, { r: "꽃찌", expr: "cry" }, { r: "방울토끼", expr: "angry", pose: "point" }] },
                { bg: "stage", props: ["🎵"], cap: "♪ Hurry, Kid, Me~ ♪", who: [{ r: "파댕이", expr: "excited", pose: "both" }, { r: "하댕이", expr: "excited", pose: "wave" }, { r: "꽃찌", expr: "excited", pose: "both" }, { r: "방울토끼", expr: "happy", pose: "both" }] }
            ] }
        },
        script: [
            { k: "brand", sec: 3 },
            // 신나는 음악 · 영어 원제가 밝아졌다가 흐려지고 → 그 밑에 한글 제목 (출연 배우는 보여주지 않음)
            { k: "title", sec: 7, style: "fade", font: "comic", koAt: 3400, music: SONG },
            // Scene 1 · 연습실 — 하댕이가 이끄는 'Hurry Kid Me' 합창 (주연 + 조연 전원)
            { k: "scene", n: 1, place: "연습실", sec: 11, bg: "practice", fx: "music", props: ["🎼", "🎹", "🎼"], who: CHOIR, cast: sing,
                lines: [
                    ["하댕이", "자~ 앙클베리! 하나, 둘, 셋, 넷!", { expr: "excited", pose: "both", act: "jump" }],
                    ["", "♪ Hurry, Kid, Me~ 서둘러 달려가~ ♪"],
                    ["", "♪ Hurry, Kid, Me~ 손에 손을 잡고~ ♪"],
                    ["", "♪ 랄랄라 앙클베리~ 우리 노래 들어봐~! ♪"]] },
            // 꽃찌의 목이 쉬어 연습 중단 · 방울토끼의 화
            { k: "scene", n: 1, place: "연습실", sec: 9, bg: "practice", music: "stop", props: ["🎼"], who: ["짱구", "꽃찌", "하댕이", "방울토끼", "파댕이"],
                cast: { 꽃찌: { expr: "happy", pose: "both" }, 하댕이: { pose: "wave" } },
                lines: [
                    ["꽃찌", "♪ Hurry, Kid… 콜록! 켁켁…", { expr: "sweat", act: "shake", sfx: "cough" }],
                    ["하댕이", "잠깐! 연습 멈춰요~ 꽃찌야, 괜찮아?", { expr: "shock", pose: "both", to: "꽃찌", set: { 짱구: { expr: "shock" }, 파댕이: { expr: "shock" }, 꽃찌: { expr: "sad", pose: "down" } } }],
                    ["꽃찌", "목이… 쉬었나 봐… 미안해…", { expr: "sad" }],
                    ["방울토끼", "또야?! 너 때문에 연습이 제대로 안 되잖아!!", { expr: "angry", pose: "point", act: "stomp", to: "꽃찌", music: "bitchy", set: { 꽃찌: { expr: "cry", act: "shake" } } }]] },
            // Scene 2 · 연습실 밖 — 꽃찌의 걱정 · 짱구와 스마일의 뒷담 · 파댕이의 위로
            { k: "scene", n: 2, place: "연습실 밖", music: "sad", sec: 11, bg: "hallway", who: ["짱구", "스마일", "꽃찌", "하댕이", "파댕이"],
                cast: { 꽃찌: { expr: "sad" }, 하댕이: { expr: "sad" }, 파댕이: { expr: "sad" } },
                lines: [
                    ["꽃찌", "목소리가 제대로 안 나와… 이러다 공연에 못 서면 어떡하지…", { expr: "cry", to: "하댕이" }],
                    ["짱구", "방울토끼는 이런 사정도 모르면서 왜 그렇게 화를 내?", { expr: "annoyed", pose: "hips" }],
                    ["스마일", "맞아 맞아! 진짜 너무했어!", { expr: "annoyed", pose: "point", act: "stomp" }],
                    ["파댕이", "걱정 마, 꽃찌야~ 모두 다 잘 될 거야!", { expr: "happy", pose: "wave", to: "꽃찌", music: "happy", set: { 꽃찌: { expr: "shy" }, 하댕이: { expr: "happy" } } }]] },
            // Scene 3 · 공연 전날밤 — 네 명의 걱정
            { k: "scene", n: 3, place: "공연 전날밤", music: "lullaby", sec: 13, bg: "night", props: ["🌙"], who: ["다람쥐토끼", "남자토끼", "하댕이", "파댕이", "보라곰돌이", "돌고래"],
                cast: { 다람쥐토끼: { expr: "scared" }, 남자토끼: { expr: "sweat" }, 보라곰돌이: { expr: "dizzy" }, 돌고래: { expr: "sad" } },
                lines: [
                    ["다람쥐토끼", "하댕아… 내일 공연 생각하니까 너무 불안해…", { expr: "scared", act: "shake", to: "하댕이" }],
                    ["남자토끼", "나는 가사가 자꾸 까먹어져…", { expr: "sweat", pose: "shrug" }],
                    ["보라곰돌이", "나도! 2절이 하나도 기억 안 나…", { expr: "dizzy", pose: "shrug" }],
                    ["돌고래", "난… 자신감이 없어…", { expr: "sad" }],
                    ["하댕이", "걱정하지 마~ 우리 그동안 정말 열심히 연습했잖아!", { expr: "happy", pose: "both", music: "happy", set: { 다람쥐토끼: { expr: "shy" }, 남자토끼: { expr: "happy" }, 보라곰돌이: { expr: "happy" }, 돌고래: { expr: "shy" } } }],
                    ["파댕이", "모두 잘될 거야! 마침 다 같이 불러서 화이팅 한번 외쳐보자!", { expr: "excited", pose: "point", act: "hop" }]] },
            // 하댕이의 전화 — 호빵맨: 조연들은 못 온대
            { k: "scene", n: 3, place: "공연 전날밤", sec: 8, bg: "night", props: ["🌙"], who: ["파댕이", "하댕이"], call: "호빵맨",
                cast: { 하댕이: { hold: "phone", pose: "wave" } },
                lines: [
                    ["", "따르릉~ 따르릉~", { sfx: "ring" }],
                    ["하댕이", "여보세요, 호빵맨? 다들 지금 올 수 있어?", { hold: "phone", pose: "wave" }],
                    ["호빵맨", "거북이, 롱토끼, 빠찌, 뽀야, 공자는 일이 있어서 지금 못 온대~", { hold: "phone", expr: "sweat" }],
                    ["하댕이", "그렇구나~ 그럼 올 수 있는 사람들끼리 모이자!", { hold: "phone", pose: "wave", expr: "happy" }]] },
            // 주연 전원 화이팅!
            { k: "scene", n: 3, place: "공연 전날밤", music: "victory", sec: 6, bg: "night", fx: "sparkle", who: TEAM, cast: all(TEAM, { expr: "excited", pose: "both" }),
                lines: [
                    ["하댕이", "앙클베리~ 하나, 둘, 셋!", { expr: "excited", pose: "both", act: "hop" }],
                    ["", "모두: 화이팅~!!!", { set: all(TEAM, { expr: "excited", pose: "both", act: "jump" }) }]] },
            // Scene 4 · 공연 당일 — Show MC의 소개 · 반신반의하는 관중
            { k: "scene", n: 4, place: "공연 당일 · 무대", music: "march", sec: 8, bg: "stage", who: [A1, MC, A2, A3],
                cast: { [MC]: { hold: "mic", pose: "wave", expr: "excited" }, [A1]: { expr: "roll" }, [A2]: { expr: "blank" }, [A3]: { expr: "annoyed" } },
                lines: [
                    [MC, "자~ 다음 무대는! 합창단 '앙클베리'의 'Hurry Kid Me'입니다~!", { hold: "mic", pose: "wave", expr: "excited", act: "hop" }],
                    [A1, "합창단? 흠… 재미있으려나…", { expr: "roll", pose: "hips" }],
                    [A2, "(하품) 글쎄~", { expr: "sleepy" }]] },
            // 앙클베리 전원 무대 · 'Hurry Kid Me'
            { k: "scene", n: 4, place: "공연 당일 · 무대", sec: 11, bg: "stage", fx: "spot", music: SONG, who: CHOIR, cast: sing,
                lines: [
                    ["", "♪ Hurry, Kid, Me~ 서둘러 달려가~ ♪"],
                    ["", "♪ Hurry, Kid, Me~ 손에 손을 잡고~ ♪"],
                    ["꽃찌", "♪ 랄랄라 앙클베리~!! ♪", { expr: "excited", pose: "both", act: "jump" }],
                    ["", "♪ 우리 노래 들어봐~! ♪", { set: all(CHOIR, { expr: "excited", pose: "both", act: "dance" }) }]] },
            // 관중의 환호 · 박수갈채
            { k: "scene", n: 4, place: "공연 당일 · 객석", music: "victory", sec: 7, bg: "seats", fx: "clap", who: [A1, A2, A3],
                cast: { [A1]: { expr: "blank" }, [A2]: { expr: "blank" }, [A3]: { expr: "blank" } },
                lines: [
                    ["", "관중들이 하나둘 리듬을 타기 시작한다~", { set: { [A1]: { expr: "happy", act: "dance" }, [A2]: { expr: "excited", act: "dance" }, [A3]: { expr: "happy", act: "dance" } } }],
                    [A3, "우와~ 최고다!!", { expr: "excited", pose: "both", act: "jump" }],
                    ["", "짝짝짝짝!! 우레와 같은 박수갈채!", { sfx: "clap", set: { [A1]: { expr: "love", pose: "both", act: "hop" }, [A2]: { expr: "excited", pose: "both", act: "hop" }, [A3]: { expr: "excited", pose: "both", act: "jump" } } }]] },
            // 꽃찌의 기쁨 · 방울토끼의 사과
            { k: "scene", n: 4, place: "공연 당일 · 무대 뒤", music: "happy", sec: 10, bg: "stage", fx: "hearts", who: ["방울토끼", "꽃찌", "하댕이", "파댕이"],
                cast: { 방울토끼: { expr: "sad" }, 하댕이: { expr: "excited" }, 파댕이: { expr: "excited" } },
                lines: [
                    ["꽃찌", "하댕아, 파댕아! 나 너무 기뻐~ 목소리가 끝까지 나왔어!!", { expr: "excited", pose: "both", act: "jump", to: "하댕이" }],
                    ["하댕이", "거봐~ 우리 해냈잖아!", { expr: "excited", pose: "both", act: "hop" }],
                    ["방울토끼", "꽃찌야… 그때 무례하게 굴어서 정말 미안해.", { expr: "sad", to: "꽃찌", set: { 꽃찌: { expr: "shock" } } }],
                    ["꽃찌", "괜찮아~ 우린 앙클베리잖아!", { expr: "happy", pose: "wave", act: "hop", to: "방울토끼", set: { 방울토끼: { expr: "shy" } } }]] },
            { k: "end", sec: 6, text: "The End", credits: true, music: SONG }
        ]
    };
};

// ---------------------------------------------------------------- ⭐ built-in movie: 헛간 (Empty Den · the admin's own idea · Black & White → a black-and-white film)
//   scene extras: photo (a framed picture on the table) · held (a role holds another's head) · hid (not seen yet) · act ghost / ghostblink / dead
//   · light "black" (blackout) · fx candle (only a candle's light)
const emptyDen = () => {
    const P = n => findPid(n);
    const EMILY = "Emily", BILLY = "Billy", OLD = "Old Woman", JOHN = "John, the Police Officer", MOM = "Emily & Billy's Mom", COP1 = "Cop #1", COP2 = "Cop #2";
    return {
        id: "m_empty_den", builtin: true, bw: true,
        en: "Empty Den", ko: "헛간",
        brand: "bw", nation: "Dung Town", date: "0-08-11", creator: "James", stock: { maps: 110, shops: 200 },
        // 💀 Body Count: Old Woman is found dead in the barn (Mom is a ghost → not counted)
        bodyCount: [{ r: OLD, scene: "Scene 6 · 헛간", how: "헛간에서 죽은 채로 발견됨.", off: true }],
        genres: ["공포"], rating: "red", stars: 1, quality: 7, lgbtq: false,
        cast: [
            { ko: "친공미", pid: P("친공미"), role: EMILY, part: "lead" },
            { ko: "힘쎈이", pid: P("힘쎈이"), role: BILLY, part: "lead" },
            { ko: "김벳데이", pid: P("김벳데이"), role: OLD, part: "support" },
            { ko: "죠클라크", pid: P("죠클라크"), role: JOHN, short: "John", part: "support" },
            { ko: "김현옥", pid: P("김현옥"), role: MOM, short: "Mom", part: "support" },
            { ko: "나병신", pid: P("나병신"), role: COP1, part: "extra" },
            { ko: "천사파3호", pid: P("천사파3호"), role: COP2, part: "extra" }
        ],
        plot: "절대 경고!! 절대 그 헛간에 들어가지 마라!!",
        tagline: "",
        music: "horror",
        cover: {
            // 중간표지: logo · big Korean title (plain black, on a white label) · the English title small under it · a small still
            spine: { font: "plain", still: { bg: "barnout", who: [{ r: EMILY, expr: "scared", hold: "candle" }, { r: BILLY, expr: "scared", hold: "candle" }] } },
            // 앞표지: Emily and Billy, candles lit, trembling at the barn door
            front: { layout: "barn", bg: "#0a0a0a",
                main: [{ r: BILLY, expr: "scared", pose: "point", hold: "candle" }, { r: EMILY, expr: "scared", pose: "shrug", hold: "candle" }] },
            // 뒷표지: plot + 1 still + cast / date / logo
            back: { layout: "still1", stills: [
                { bg: "darkroad", cap: "절대 그 헛간에 들어가지 마라!!", who: [{ r: OLD, expr: "evil", pose: "point" }, { r: EMILY, expr: "scared", pose: "shrug" }] }
            ] }
        },
        script: [
            { k: "brand", sec: 3 },
            // 어두운 화면에 불빛이 비치며 영어 원제 · 한글 제목 — 해골 더미가 희미하게 잠깐
            { k: "title", sec: 8, style: "fire", koAt: 2600, music: "horror" },
            { k: "cast", sec: 6, parts: ["lead", "support"] },
            // Scene 1 · 시골길
            { k: "scene", n: 1, place: "시골길", music: "road", sec: 10, bg: "country", who: [EMILY, BILLY],
                lines: [
                    [EMILY, "오빠! 저기 길 너머 구석에 있는 헛간 보여? 나 예전부터 꼭 가보고 싶었어!", { expr: "excited", pose: "point", act: "hop" }],
                    [BILLY, "헛간? 거기 안 좋은 소문이 있다던데…", { expr: "sweat", pose: "shrug" }],
                    [BILLY, "별로 좋은 생각이 아닌 것 같아, Emily.", { expr: "annoyed", pose: "hips", to: EMILY }],
                    [EMILY, "치… 오빠는 겁쟁이야~", { expr: "tongue" }]] },
            // Scene 2 · 집 — 한밤중, 엄마 사진, 잠꼬대
            { k: "scene", n: 2, place: "집", music: "musicbox", sec: 12, bg: "home", dark: true, who: [BILLY, EMILY], photo: { r: MOM, expr: "happy" },
                cast: { [BILLY]: { expr: "sleepy", act: "sleep" }, [EMILY]: { expr: "sleepy", act: "sleep" } },
                lines: [
                    ["", "한밤중… Emily가 갑자기 잠에서 깬다.", { set: { [EMILY]: { expr: "shock", act: "" } } }],
                    [EMILY, "(탁자 위 엄마 사진을 보며) 엄마… 보고 싶어요…", { expr: "sad" }],
                    [EMILY, "(소곤) 오빠 자지…? 헛간 주변만 살짝 보고 올게…", { expr: "evil", act: "sneak", to: BILLY }],
                    [BILLY, "으음… 헛간… 가면… 안 돼…", { expr: "sleepy", act: "sleep", set: { [EMILY]: { expr: "shock", act: "shake" } } }],
                    [EMILY, "헉…! …휴, 잠꼬대였구나.", { expr: "sweat", act: "sneak" }]] },
            // Scene 3 · 어두운 시골길 — Old Woman의 경고
            { k: "scene", n: 3, place: "어두운 시골길", music: "horror", sec: 11, bg: "darkroad", fx: "mist", who: [EMILY, OLD],
                cast: { [EMILY]: { expr: "blank", act: "sneak" }, [OLD]: { hid: true } },
                lines: [
                    ["", "으스스한 시골길… 바람 소리만 들려온다…"],
                    [OLD, "거기 서라, 꼬마야!!", { expr: "angry", pose: "point", act: "stomp", sfx: "sting", flash: true, set: { [OLD]: { hid: false }, [EMILY]: { expr: "scared", act: "shake" } } }],
                    [OLD, "밑으로 더 내려가면 헛간이 나온다… 절대, 절대 들어가지 마라!", { expr: "evil", pose: "point", to: EMILY }],
                    [EMILY, "…쳇, 기분 나빠.", { expr: "annoyed", act: "run", set: { [OLD]: { expr: "evil" } } }]] },
            // Scene 4 · 헛간 주변 — 엄마의 목소리 · 문가에 보였다 말았다 하는 엄마
            { k: "scene", n: 4, place: "헛간 주변", music: "heartbeat", sec: 12, bg: "barnout", fx: "mist", who: [EMILY, MOM],
                cast: { [EMILY]: { expr: "scared", act: "sneak" }, [MOM]: { expr: "sad", act: "ghostblink" } },
                lines: [
                    ["", "헛간에 가까워질수록… 어디선가 목소리가 들려온다."],
                    [MOM, "Emily… Emily…", { expr: "sad", act: "ghostblink" }],
                    [EMILY, "엄마…? 엄마 목소리야…!", { expr: "shock", act: "shake" }],
                    [MOM, "억울하다… 억울하다…", { expr: "cry", act: "ghostblink" }],
                    [EMILY, "엄마! 기다려요!!", { expr: "cry", pose: "point", act: "run" }]] },
            // 헛간 안 — 칠흑같이 어둡다 · 비명
            { k: "scene", n: 4, place: "헛간 안", music: "tense", sec: 6, bg: "barn", dark: true, who: [EMILY],
                cast: { [EMILY]: { expr: "scared", act: "sneak" } },
                lines: [
                    [EMILY, "너무 어두워… 엄마, 어디 있어요…?", { expr: "scared", act: "shake" }],
                    [EMILY, "꺄아아아악!!!", { expr: "scared", pose: "both", act: "shake", sfx: "scream", flash: true, music: "stop", light: "black" }]] },
            // Scene 5 · 집 — Billy의 신고
            { k: "scene", n: 5, place: "집", music: "tense", sec: 12, bg: "home", dark: true, who: [BILLY], call: JOHN, photo: { r: MOM, expr: "happy" },
                cast: { [BILLY]: { expr: "sleepy", act: "sleep" } },
                lines: [
                    [BILLY, "(벌떡) …Emily? Emily가 없어!!", { expr: "shock", pose: "both", act: "shake", light: "on" }],
                    [BILLY, "여보세요, 경찰이죠? 동생이 사라졌어요!", { expr: "scared", hold: "phone" }],
                    ["John", "진정하세요. John 경관입니다. 무슨 일이죠?", { hold: "phone", expr: "blank" }],
                    [BILLY, "동생이 길 건너 헛간에 간 것 같아요… 낮에 거기 가고 싶다고 했거든요!", { expr: "sweat", hold: "phone" }],
                    ["John", "알겠습니다. 경찰들과 곧 그쪽으로 보내겠습니다.", { hold: "phone", expr: "cool" }],
                    [BILLY, "…기다릴 수 없어. 내가 가야겠어!", { expr: "angry", pose: "point", hold: "candle", act: "run" }]] },
            // Scene 6 · 헛간 — 촛불, 울음소리, 시체
            { k: "scene", n: 6, place: "헛간", music: "heartbeat", sec: 13, bg: "barn", dark: true, fx: "candle", who: [OLD, EMILY, BILLY],
                cast: { [BILLY]: { expr: "scared", hold: "candle", act: "sneak" }, [EMILY]: { expr: "cry", act: "shake", hid: true }, [OLD]: { hid: true, act: "dead", expr: "dizzy" } },
                lines: [
                    ["", "흑… 흐흑… (어디선가 울음소리가 들린다)", { sfx: "sob" }],
                    [BILLY, "Emily! 여기 있었구나… 괜찮아, 오빠 왔어. 근데 여긴 왜 왔어?", { expr: "sad", hold: "candle", to: EMILY, set: { [EMILY]: { hid: false } } }],
                    [EMILY, "오, 오빠… 저, 저기…", { expr: "scared", pose: "point", act: "shake", to: OLD }],
                    [BILLY, "…!!!", { expr: "shock", hold: "candle", act: "shake", sfx: "sting", flash: true, set: { [OLD]: { hid: false }, [EMILY]: { expr: "scared", act: "shake" } } }],
                    [BILLY, "튀어!!", { expr: "scared", hold: "candle", act: "run", set: { [EMILY]: { expr: "scared", act: "run" } } }]] },
            // 경찰 도착
            { k: "scene", n: 6, place: "헛간 앞", music: "noir", sec: 9, bg: "barnout", props: ["🚨"], who: [COP1, BILLY, EMILY, COP2],
                cast: { [BILLY]: { expr: "scared", hold: "candle" }, [EMILY]: { expr: "cry", act: "shake" }, [COP1]: { pose: "point", expr: "cool" }, [COP2]: { expr: "blank" } },
                lines: [
                    [COP1, "경찰이다! 무슨 일이야?!", { expr: "angry", pose: "point" }],
                    [COP2, "…헛간 안에 시체가 있다! 노인이야.", { expr: "shock", pose: "shrug" }],
                    [COP1, "얘들아, 이제 괜찮다. 진정하고… 같이 경찰서로 가자.", { expr: "sad", pose: "wave", to: BILLY, set: { [BILLY]: { expr: "sad" }, [EMILY]: { expr: "sad", act: "" } } }]] },
            // Scene 7 · 경찰조사실 — 충격적인 진실
            { k: "scene", n: 7, place: "경찰조사실", music: "mystery", sec: 15, bg: "police", who: [EMILY, JOHN, BILLY],
                cast: { [EMILY]: { expr: "sad" }, [BILLY]: { expr: "sad" }, [JOHN]: { expr: "blank" } },
                lines: [
                    ["John", "놀랐을 텐데… 너희에게 충격적인 이야기를 해야겠구나.", { expr: "blank", pose: "hips" }],
                    ["John", "너희가 어렸을 때, 너희 엄마는 계모의 미움을 받다가 그 헛간에서 스스로 생을 마감했단다.", { expr: "sad" }],
                    [BILLY, "엄마가… 그 헛간에서…?", { expr: "shock", act: "shake" }],
                    ["John", "오늘 발견된 노인… 아무래도 그 계모 같다. 사건 뒤로 정체를 숨기고, 지나가는 사람들에게 헛간에 가지 말라고 틈틈이 경고했다더군.", { expr: "cool", pose: "point" }],
                    [EMILY, "그 할머니가…!", { expr: "scared", act: "shake" }],
                    ["John", "그리고 오늘 밤, 다 늙은 계모가 그 헛간에서 죽은 채로 발견됐다. 원인은… 자살로 추정된다.", { expr: "blank" }]] },
            // 헛간 — 죽은 엄마가 Old Woman의 목을 들고 웃는다
            { k: "scene", n: 7, place: "헛간", music: "stop", sec: 7, bg: "barn", dark: true, fx: "mist", who: [MOM], held: { [MOM]: { r: OLD, expr: "dizzy" } },
                cast: { [MOM]: { expr: "evil", act: "ghost", pose: "wave" } },
                lines: [
                    ["", "그 시각… 아무도 없는 헛간…"],
                    ["Mom", "히히히… 히히히히히…", { expr: "evil", act: "ghost", pose: "wave", sfx: "laugh" }]] },
            { k: "end", sec: 5, text: "The End", credits: true, music: "horror" }
        ]
    };
};
// ---------------------------------------------------------------- ⭐ built-in movie: 늑대인간의 밤 (Moonchild · the admin's own idea · 뽀리)
//   new here: title style "moon" (+ koSfx: a wolf's howl when the Korean title comes in) · fx moon / shadow · line meta claw (claw marks)
//   · flash "red" · wolf "half" / "full" / "claws" (ui/figure.js) · expr beast / redeye · act wolfing · close (a close-up scene)
const moonchild = () => {
    const P = n => findPid(n);
    const DENIS = "Denis", LYNN = "Lynn", TOM = "Tom", KIKI = "Kiki", PRIEST = "The Priest", PHIL = "Detective Phil",
        MINA = "Mina", TEACHER = "History Teacher", STUDENT = "Student";
    return {
        id: "m_moonchild", builtin: true,
        en: "Moonchild", ko: "늑대인간의 밤",
        brand: "ppori", nation: "Emo World", date: "14-02-07", creator: "James", stock: { maps: 100, shops: 180 },
        // 💀 Body Count (in the order they die): Mina (Scene 1) · The Priest · Denis (Scene 6)
        bodyCount: [
            { r: MINA, scene: "Scene 1 · 숲속", how: "밤의 숲속을 산책하다 정체모를 무언가의 길다란 손톱에 얼굴을 할퀴어 희생됨." },
            { r: PRIEST, scene: "Scene 6 · 성당", how: "늑대로 변한 Denis에게 목을 물어뜯겨 살해됨." },
            { r: DENIS, scene: "Scene 6 · 성당", how: "늑대인간으로 변한 채 탐정 Phil의 권총에 맞아 사망." }
        ],
        genres: ["공포"], rating: "bam", stars: 2, quality: 4, lgbtq: false,
        cast: [
            { ko: "남자이모", pid: P("남자이모"), role: DENIS, part: "lead" },
            { ko: "이모", pid: P("이모"), role: LYNN, part: "lead" },
            { ko: "파댕이", pid: P("파댕이"), role: TOM, part: "lead" },
            { ko: "노랑토끼", pid: P("노랑토끼"), role: KIKI, part: "lead" },
            { ko: "흰머리구름", pid: P("흰머리구름"), role: PRIEST, short: "Priest", part: "lead" },
            { ko: "하이스트이모부", pid: P("하이스트이모부"), role: PHIL, short: "Phil", part: "lead" },
            { ko: "꽃나리", pid: P("꽃나리"), role: MINA, part: "support" },
            { ko: "헤일리톰슨", pid: P("헤일리톰슨"), role: TEACHER, part: "support" },
            { ko: "그개미", pid: P("그개미"), role: STUDENT, part: "extra" }
        ],
        plot: "Denis는 아내 Lynn과 두 자녀 Tom, Kiki와 함께 화목한 가정을 꾸리고 있다. 어느날 Kiki의 학교 친구가 실종되는 사건이 발생하고, 탐정 Phil은 해당 사건에 관심을 갖고 조사를 시작한다. 한편, Denis는 보름달이 뜨는 밤만 되면 식은땀을 흘리고 피를 갈구하기 시작하는데…",
        tagline: "경고: 당신의 빨라지는 심장박동을 책임질 수 없습니다!",
        music: "fullmoon",
        cover: {
            // 중간표지: logo · the English title big · the Korean title small and sideways beside it · a small still
            spine: { main: "en", sub: "ko", still: { bg: "woods", who: [{ r: DENIS, expr: "beast", pose: "both", wolf: "half" }] } },
            // 앞표지: a dark night, a huge full moon — a red eye glares through it · a wolf's silhouette below
            front: { layout: "moon", bg: "#05030f" },
            // 뒷표지: 3 stills down the left · 줄거리 · 주연 (이모 · 남자이모 only) · 제작년월일 · logo
            back: { layout: "side3", leads: [LYNN, DENIS], minimal: true, stills: [
                { bg: "woods", cap: "누구 있어요…?", who: [{ r: MINA, expr: "scared", pose: "shrug" }] },
                { bg: "church", cap: "이 사탄아!!", who: [{ r: PRIEST, expr: "angry", pose: "point", hold: "cross" }, { r: DENIS, expr: "beast", pose: "both", wolf: "half" }] },
                { bg: "funeral", cap: "아빠…", who: [{ r: KIKI, expr: "cry" }, { r: LYNN, expr: "cry" }, { r: TOM, expr: "redeye" }] }
            ] }
        },
        script: [
            { k: "brand", sec: 3 },
            // Scene 1 · 숲속 — a shadow behind Mina … the claws
            { k: "scene", n: 1, place: "숲속", music: "heartbeat", sec: 12, bg: "woods", dark: true, fx: "shadow", who: [MINA],
                cast: { [MINA]: { expr: "blank", act: "sneak" } },
                lines: [
                    ["", "고요한 밤의 숲속… Mina가 홀로 산책을 하고 있다."],
                    [MINA, "으… 오늘따라 왜 이렇게 쌀쌀하지…", { expr: "sweat", pose: "shrug", act: "shake" }],
                    ["", "Mina의 뒤로 어떤 그림자가 스윽— 드리운다…", { sfx: "growl" }],
                    [MINA, "…누구 있어요? (뒤를 돌아본다) …아무것도 없네.", { expr: "scared", act: "shake" }],
                    [MINA, "꺄아아아악!!!", { expr: "scared", pose: "both", act: "fall", sfx: "scream", claw: true, flash: "red", music: "stop" }],
                    ["", "정체모를 무언가의 길다란 손톱이 Mina의 얼굴을 할퀴고… Mina는 그렇게 희생당하고 만다.", { sfx: "slash", light: "black", set: { [MINA]: { expr: "dizzy", act: "dead" } } }]] },
            // 제목: looking up at the full moon from the forest · the Korean title comes in with a wolf's howl (출연 배우는 보여주지 않음)
            { k: "title", sec: 7, style: "moon", koAt: 3000, koSfx: "howl", music: "fullmoon" },
            // Scene 2 · 하우스 — a busy morning
            { k: "scene", n: 2, place: "하우스", music: "morning", sec: 9, bg: "house", who: [TOM, KIKI, LYNN, DENIS],
                cast: { [LYNN]: { expr: "annoyed", pose: "hips" }, [DENIS]: { expr: "sweat" }, [TOM]: { expr: "happy" }, [KIKI]: { expr: "happy" } },
                lines: [
                    [LYNN, "Tom! Kiki! 빨리 준비해, 학교 늦겠어!", { expr: "annoyed", pose: "hips", act: "stomp" }],
                    [DENIS, "(넥타이를 매며) 여보, 나도 늦었어! 오늘 회의가 있거든~", { expr: "sweat", pose: "shrug" }],
                    [TOM, "엄마, 저희 먼저 갈게요! (빵을 입에 문 채)", { expr: "excited", pose: "wave", act: "run" }],
                    [LYNN, "거기 서! 아침을 그렇게 대충 먹고 나가면 어떡하니!!", { expr: "angry", pose: "point", act: "stomp", to: TOM, set: { [TOM]: { expr: "sweat", act: "" }, [KIKI]: { expr: "sweat" } } }]] },
            { k: "scene", n: 2, place: "하우스", sec: 9, bg: "house", fx: "hearts", who: [TOM, KIKI, LYNN, DENIS],
                cast: { [LYNN]: { expr: "annoyed", pose: "hips" }, [TOM]: { expr: "sweat" }, [KIKI]: { expr: "sweat" } },
                lines: [
                    [DENIS, "여보~ 애들한테 너무 뭐라고 하지 마. 다 컸잖아~", { expr: "happy", pose: "wave", to: LYNN }],
                    [DENIS, "(쪽♥) 다녀올게!", { expr: "love", act: "kiss", to: LYNN, set: { [LYNN]: { expr: "shy", act: "kiss" } } }],
                    ["", "Denis는 Lynn에게 모닝키스를 하고 회사로 출근한다.", { set: { [DENIS]: { gone: true }, [LYNN]: { expr: "happy", act: "" } } }],
                    [TOM, "Kiki, 가자! 오빠 따라와~", { expr: "happy", pose: "wave", act: "run", to: KIKI, set: { [KIKI]: { expr: "happy", act: "run" } } }]] },
            // Scene 3 · 학교 — the school paper: Mina is dead
            { k: "scene", n: 3, place: "학교", music: "mystery", sec: 10, bg: "school", who: [STUDENT, TOM, KIKI],
                cast: { [STUDENT]: { expr: "sad", hold: "paper" } },
                lines: [
                    [STUDENT, "Tom, 학교 신문 받아. …아직도 믿기지 않아.", { expr: "sad", hold: "paper", to: TOM }],
                    [STUDENT, "우리 학교 Mina가… 숲속에서 죽은 채로 발견됐대.", { expr: "sad", hold: "paper", set: { [TOM]: { expr: "shock" }, [KIKI]: { expr: "shock" } } }],
                    [KIKI, "Mina…? 가끔 역사 수업을 같이 들었던 반 친구야… 너무 안타까워…", { expr: "cry", set: { [STUDENT]: { hold: "" } } }],
                    [TOM, "(신문을 읽으며) 물어뜯기고… 할퀴어 죽었다고…? 대체 무슨…", { expr: "shock", hold: "paper", set: { [KIKI]: { expr: "sad" } } }]] },
            // Scene 4 · 역사수업교실 — the legend of the monster families
            { k: "scene", n: 4, place: "역사수업교실", music: "mystery", sec: 12, bg: "classroom", who: [KIKI, TEACHER, TOM],
                cast: { [TEACHER]: { expr: "sad", hold: "book" }, [KIKI]: { expr: "sad" }, [TOM]: { expr: "blank" } },
                lines: [
                    [TEACHER, "먼저… 세상을 떠난 Mina에게 모두 조의를 표합시다.", { expr: "sad", hold: "book" }],
                    [TEACHER, "고대에는 사람이 괴물의 모습으로 변해 사람들을 잡아먹었다는 전설이 있지요.", { expr: "blank", pose: "point" }],
                    [TOM, "에이~ 선생님, 그런 말도 안 되는 소리가 어딨어요! 다 허풍이죠~", { expr: "roll", pose: "shrug" }],
                    [TEACHER, "고대 서적의 기록에 따르면… 대대로 그 피가 내려오는 괴물 가족들이 있었단다.", { expr: "evil", hold: "book", to: TOM }],
                    [TEACHER, "아마… 호랑이나 늑대 같은 동물의 모습을 하고 있겠지.", { expr: "evil", pose: "point", sfx: "growl", music: "tense", set: { [TOM]: { expr: "scared" }, [KIKI]: { expr: "scared", act: "shake" } } }]] },
            // Scene 5 · 하우스 — the full moon · Denis runs out
            { k: "scene", n: 5, place: "하우스 · 보름달 뜬 밤", music: "fullmoon", sec: 9, bg: "house", dark: true, fx: "moon", who: [LYNN, DENIS],
                cast: { [DENIS]: { expr: "sweat", act: "shake" }, [LYNN]: { expr: "blank" } },
                lines: [
                    ["", "집 밖에 밝은 보름달이 떠오른 밤…"],
                    [DENIS, "하아… 하아… (식은땀을 뻘뻘 흘리며 어쩔 줄 몰라한다)", { expr: "sweat", pose: "shrug", act: "shake" }],
                    [LYNN, "여보, 괜찮아? 얼굴이 너무 창백해…", { expr: "scared", pose: "both", to: DENIS }],
                    [DENIS, "괜찮아… 잠깐… 밖에 좀 나가 있을게…", { expr: "sweat", act: "run", set: { [LYNN]: { expr: "sad" } } }]] },
            // 숲속 — the change · Detective Phil sees it
            { k: "scene", n: 5, place: "숲속", sec: 10, bg: "woods", fx: "moon", who: [DENIS, PHIL],
                cast: { [DENIS]: { expr: "sweat", act: "shake" }, [PHIL]: { hid: true, expr: "blank" } },
                lines: [
                    [DENIS, "크으으… 아아아악!!! (몸을 주체하지 못한 채 울부짖는다)", { expr: "beast", pose: "both", act: "wolfing", wolf: "half", sfx: "howl", flash: "red", set: { [DENIS]: { expr: "beast", wolf: "half", pose: "both", act: "wolfing" } } }],
                    ["", "Denis가 황급히 숲속으로 도망간다… 마침 그곳에서 사건을 조사하던 탐정 Phil.", { set: { [PHIL]: { hid: false, expr: "cool", pose: "hips" } } }],
                    [PHIL, "이 근처에서 수상한 소리가…", { expr: "blank", pose: "point", to: DENIS }],
                    [PHIL, "…!!! 사, 사람이… 늑대로 변하고 있어…!", { expr: "shock", pose: "shrug", act: "shake", sfx: "sting", flash: true }]] },
            // Scene 6 · 성당 — Denis asks for help · the Priest calls him Satan
            { k: "scene", n: 6, place: "성당", music: "organ", sec: 10, bg: "church", who: [DENIS, PRIEST],
                cast: { [DENIS]: { expr: "cry", pose: "both", wolf: "half" }, [PRIEST]: { expr: "blank", pose: "both" } },
                lines: [
                    ["", "고요한 성당… 신부가 홀로 기도를 올리고 있다.", { sfx: "bell" }],
                    [DENIS, "신부님… 제발 저 좀 도와주세요… 제 몸이… 이상해요…", { expr: "cry", pose: "both", wolf: "half", act: "shake" }],
                    [PRIEST, "네 몸에는… 대대로 내려온 늑대인간 후손의 피가 흐르는구나!", { expr: "shock", pose: "point", hold: "cross", to: DENIS }],
                    [PRIEST, "이 사탄아!! 주님의 이름으로 물러가라!!", { expr: "angry", pose: "point", hold: "cross", act: "stomp", to: DENIS, music: "tense" }]] },
            // the wolf · the Priest dies · Phil shoots
            { k: "scene", n: 6, place: "성당", sec: 12, bg: "church", dark: true, who: [DENIS, PRIEST, PHIL],
                cast: { [DENIS]: { expr: "beast", pose: "both", wolf: "half" }, [PRIEST]: { expr: "angry", pose: "point", hold: "cross" }, [PHIL]: { hid: true } },
                lines: [
                    [DENIS, "크아아앙!!!", { expr: "beast", act: "jump", sfx: "growl", flash: "red", to: PRIEST, set: { [DENIS]: { wolf: "full", expr: "beast" } } }],
                    ["", "늑대로 변한 Denis가 신부의 목을 물어뜯는다…!", { sfx: "scream", claw: true, set: { [PRIEST]: { expr: "dizzy", act: "dead", hold: "", pose: "down" } } }],
                    [PHIL, "멈춰!!", { expr: "angry", pose: "point", hold: "gun", set: { [PHIL]: { hid: false, hold: "gun", pose: "point" } } }],
                    ["", "탕!! 탕!!", { sfx: "shot", flash: true, music: "stop", set: { [DENIS]: { wolf: "full", act: "dead" } } }],
                    [PHIL, "…끝났다. 이 처참한 살육도.", { expr: "sad", hold: "gun", pose: "down" }]] },
            // Scene 7 · Denis의 장례식
            { k: "scene", n: 7, place: "Denis의 장례식", music: "funeral", sec: 11, bg: "funeral", who: [TOM, LYNN, KIKI, PHIL], photo: { r: DENIS, expr: "happy" },
                cast: { [LYNN]: { expr: "cry" }, [KIKI]: { expr: "cry" }, [TOM]: { expr: "sad" }, [PHIL]: { expr: "blank" } },
                lines: [
                    [LYNN, "여보… 흐흑… 이렇게 가버리면 어떡해…", { expr: "cry", act: "shake" }],
                    [KIKI, "아빠… 흐흑…", { expr: "cry", act: "shake" }],
                    [TOM, "탐정님… 대체 무슨 일이 있었던 거예요? 아빠가 왜…!", { expr: "cry", pose: "point", to: PHIL }],
                    [PHIL, "……미안하구나. 지금은 아무 말도 해줄 수 없단다.", { expr: "sad" }],
                    ["", "탐정은 대답을 회피한 채, 터벅터벅 장례식장 밖으로 나간다…", { set: { [PHIL]: { gone: true } } }]] },
            // 장례식장 밖 — already dark, a full moon
            { k: "scene", n: 7, place: "장례식장 밖", music: "fullmoon", sec: 6, bg: "funeralout", fx: "moon", who: [PHIL],
                cast: { [PHIL]: { expr: "blank" } },
                lines: [
                    ["", "어느새 날은 어둡고… 하늘엔 보름달이 떠 있다."],
                    [PHIL, "(보름달을 올려다보며) …보름달이로군.", { expr: "blank" }]] },
            // 클로즈업 — Tom's eyes turn red, his nails grow long
            { k: "scene", n: 7, place: "Denis의 장례식", sec: 8, bg: "funeral", close: true, who: [TOM],
                cast: { [TOM]: { expr: "sad", pose: "both" } },
                lines: [
                    ["", "그 시각, 장례식장 안…"],
                    ["", "…Tom의 눈동자가 붉게 변하고, 손톱이 길게 자라난다.", { sfx: "growl", flash: "red", set: { [TOM]: { expr: "redeye", wolf: "claws", pose: "both" } } }]] },
            { k: "end", sec: 6, text: "The End", credits: true, music: "fullmoon" }
        ]
    };
};
// ---------------------------------------------------------------- ⭐ built-in movie: 문차일드2 (Moonchild 2: Blood Vengeance · the admin's own idea · 뽀리)
//   music: audio/movies/moonchild2_theme.mp3 (the bikers' rock on the radio) · title art: images/movies/moonchild2_title*.webp
//   new here: title style "blood" (+ koImg · koClaw) · scene footage (an old clip from 늑대인간의 밤) · bg agency / bedroom / camp / lake / hospital
//   · fx camp / wake · act wiggle / swim · set { anon (no name tag), held: { r, expr, baby } } · outfit "bikini" on generated pictures
const MC2_THEME = "audio/movies/moonchild2_theme.mp3";
const moonchild2 = () => {
    const P = n => findPid(n);
    const TOM = "Tom", ERICA = "Erica", PHIL = "Detective Phil", SAGE = "Detective Sage",
        TO = "T.O", MIKE = "Mike", LING = "Ling Ling", SALLY = "Sally",
        KIKI = "Kiki", VINCENT = "Dr. Vincent", B3 = "Biker #3", BC3 = "Biker Chick #3", NURSE = "Nurse", BABY = "Erica's Baby", DENIS = "Denis";
    // the werewolf before anyone knows who it is: a whole wolf, no name tag
    const WOLF = { wolf: "full", expr: "beast", anon: true, hid: true };
    const PARTY = [B3, TO, LING, SALLY, MIKE, BC3];
    return {
        id: "m_moonchild2", builtin: true,
        en: "Moonchild 2: Blood Vengeance", ko: "문차일드2",
        brand: "ppori", nation: "Emo World", date: "30-10-16", creator: "James", stock: { maps: 30, shops: 60 },
        // 💀 Body Count (in the order they die)
        bodyCount: [
            { r: SALLY, scene: "Scene 4 · 숲속", how: "늑대인간에게 얼굴을 할퀴인 채 도망치다 나뭇가지에 걸려 넘어져 공격당함." },
            { r: MIKE, scene: "Scene 6 · 숲속 호숫가", how: "Sally를 찾아 호숫가를 헤매다 뒤에서 덮친 늑대인간에게 살해됨." },
            { r: TO, scene: "Scene 8 · 숲속 호숫가", how: "알몸으로 호수에 들어갔다가 물속으로 끌려가 늑대인간에게 물려 죽음." },
            { r: B3, scene: "Scene 9 · 숲속", how: "파티 장소에서 늑대인간에게 살해된 채 발견됨.", off: true },
            { r: BC3, scene: "Scene 9 · 숲속", how: "파티 장소에서 늑대인간에게 살해된 채 발견됨.", off: true },
            { r: LING, scene: "Scene 9 · 숲속", how: "친구들의 시체를 발견하고 비명을 지르던 순간, 위에서 뛰어내린 늑대인간에게 공격당함." },
            { r: SAGE, scene: "Scene 12 · 하우스", how: "늑대인간으로 변한 Tom에게 공격당해 신음하다 숨을 거둠." },
            { r: TOM, scene: "Scene 12 · 하우스", how: "늑대인간으로 변한 채 탐정 Phil의 권총에 맞아 사망." }
        ],
        genres: ["공포"], rating: "water", stars: 4, quality: 3, lgbtq: false,
        cast: [
            { ko: "파댕이", pid: P("파댕이"), role: TOM, part: "lead" },
            { ko: "부댕이", pid: P("부댕이"), role: ERICA, part: "lead", look: { outfit: "clothes" } },
            { ko: "하이스트이모부", pid: P("하이스트이모부"), role: PHIL, short: "Phil", part: "lead" },
            { ko: "힘쎈이", pid: P("힘쎈이"), role: SAGE, short: "Sage", part: "lead" },
            { ko: "매력철철이모부", pid: P("매력철철이모부"), role: "T.O, Biker #1", short: TO, part: "lead", sexy: true },
            { ko: "말차곰", pid: P("말차곰"), role: "Mike, Biker #2", short: MIKE, part: "lead", look: { outfit: "clothes" } },
            { ko: "나쁜년개미", pid: P("나쁜년개미"), role: "Ling Ling, Biker Chick #1", short: LING, part: "lead", sexy: true, look: { outfit: "clothes" } },
            { ko: "미라지댕이", pid: P("미라지댕이"), role: "Sally, Biker Chick #2", short: SALLY, part: "lead", nude: true },
            { ko: "노랑토끼", pid: P("노랑토끼"), role: KIKI, part: "support", look: { outfit: "clothes" } },
            { ko: "칼리스토52호", pid: P("칼리스토52호"), role: VINCENT, short: "Vincent", part: "support" },
            { ko: "소방차이모부", pid: P("소방차이모부"), role: B3, part: "support" },
            { ko: "로즈골드사다리꼴", pid: P("로즈골드사다리꼴"), role: BC3, part: "support" },
            { ko: "글로리아배추", pid: P("글로리아배추"), role: NURSE, part: "support" },
            { ko: "애기곰", pid: P("애기곰"), role: BABY, short: "Baby", part: "extra" },
            { ko: "남자이모", pid: P("남자이모"), role: DENIS, part: "extra", note: "Footage Scene" }
        ],
        plot: "밤만 되면 어느 사나이의 몸에서 흥분을 주체할 수 없이 피를 갈구하기 시작한다. 탐정 Phil은 이런 무차별한 살인이 지난날 자신이 겪었던 끔찍한 사건과 연관된 것인지를 알아보기 시작하는데…",
        music: "fullmoon",
        cover: {
            // 중간표지: logo · the Korean title art big · a small still
            spine: { img: "images/movies/moonchild2_title_v.webp", sub: "none", bg: "linear-gradient(180deg, #0a0a0a, #1c0505)",
                still: { bg: "woods", who: [{ r: TOM, expr: "beast", pose: "both", wolf: "half" }] } },
            // 앞표지: the full moon over the forest, a wolf's hand with long claws bursting out of the middle · the title art · no cast, no slogan
            front: { layout: "clawmoon", bg: "#04030c", titleImg: "images/movies/moonchild2_title.webp", noCast: true },
            // 뒷표지: one still · 줄거리 · 주연 (파댕이 · 힘쎈이 only) · 제작년월일 · logo
            back: { layout: "still1", leads: [TOM, SAGE], minimal: true, stills: [
                { bg: "lake", cap: "T.O? 장난치지 마…!", who: [{ r: LING, expr: "scared", pose: "shrug", outfit: "bikini" }, { r: TOM, expr: "beast", wolf: "full" }] }
            ] }
        },
        script: [
            { k: "brand", sec: 3 },
            // 제목: blood runs down a black screen over the English title · a wolf's claw tears it and the Korean title comes in (출연 배우는 보여주지 않음)
            { k: "title", sec: 7, style: "blood", koImg: "images/movies/moonchild2_title.webp", koAt: 3600, koSfx: "slash", koClaw: true, music: "fullmoon" },
            // Scene 1 · Tom의 꿈속 — the old footage: his father Denis turns into a wolf (늑대인간의 밤)
            { k: "scene", n: 1, place: "Tom의 꿈속", music: "heartbeat", sec: 10, bg: "woods", fx: "moon", footage: true, who: [DENIS],
                cast: { [DENIS]: { expr: "sweat", act: "shake" } },
                lines: [
                    ["", "꿈속… 보름달이 뜬 숲속에 아버지 Denis가 서 있다."],
                    [DENIS, "크으으… 아아아악!!!", { expr: "beast", pose: "both", act: "wolfing", wolf: "half", sfx: "howl", flash: "red", set: { [DENIS]: { expr: "beast", wolf: "half", pose: "both", act: "wolfing" } } }],
                    ["", "Denis의 몸이 점점 늑대로 변해간다…", { sfx: "growl", set: { [DENIS]: { wolf: "full", act: "" } } }]] },
            // Scene 1 · 하우스 — Tom wakes up screaming
            { k: "scene", n: 1, place: "하우스 · 침실", sec: 11, bg: "bedroom", dark: true, who: [TOM, ERICA],
                cast: { [TOM]: { expr: "sleepy" }, [ERICA]: { expr: "sleepy" } },
                lines: [
                    [TOM, "으아아아악!!!", { expr: "scared", pose: "both", act: "shake", sfx: "scream", flash: true, music: "stop", set: { [ERICA]: { expr: "shock" } } }],
                    [ERICA, "여보, 괜찮아? 또 악몽 꿨어?", { expr: "sad", to: TOM }],
                    [TOM, "(식은땀을 닦으며) 괜찮아… 나 때문에 신경 쓰지 마.", { expr: "sweat", pose: "shrug" }],
                    [TOM, "당신은 아기 생각만 해. 태교에 집중해야지.", { expr: "happy", pose: "wave", to: ERICA, set: { [ERICA]: { expr: "shy" } } }]] },
            // Scene 2 · 탐정사무소 — Phil tells the new detective about the werewolf he shot
            { k: "scene", n: 2, place: "탐정사무소", music: "mystery", sec: 14, bg: "agency", who: [SAGE, PHIL],
                cast: { [PHIL]: { expr: "cool", pose: "hips" }, [SAGE]: { expr: "happy" } },
                lines: [
                    [PHIL, "Sage, 신입이니 들려주지. 몇 년 전 사람이 늑대로 변하는 사건이 있었어.", { expr: "cool", pose: "hips" }],
                    [PHIL, "그 괴물을… 내가 이 총으로 쏴 죽일 수밖에 없었지.", { expr: "blank", hold: "gun", pose: "point" }],
                    [SAGE, "에이~ 선배님, 늑대인간이요? 농담이시죠?", { expr: "roll", pose: "shrug" }],
                    [PHIL, "못 믿겠으면 이걸 봐. 그때 오려둔 신문 기사야.", { expr: "smug", hold: "paper", to: SAGE }],
                    [SAGE, "헉…! 이 시대에 어떻게 늑대인간 같은 괴물이 존재할 수 있죠?!", { expr: "shock", act: "shake" }],
                    [PHIL, "…믿든 말든, 자네 마음이지.", { expr: "blank", pose: "shrug" }]] },
            // Scene 3 · 숲속 — the bikers' party · the strip show
            { k: "scene", n: 3, place: "숲속 · 바이커들의 파티", music: MC2_THEME, sec: 22, bg: "camp", fx: "camp", amb: ["crickets", "chatter"], who: PARTY, props: ["🍺", "🏍️", "🍺"],
                cast: { [B3]: { expr: "excited", act: "dance" }, [TO]: { expr: "evil", hold: "radio" }, [LING]: { expr: "smug", outfit: "clothes" }, [SALLY]: { expr: "happy" }, [MIKE]: { expr: "excited", act: "hop" }, [BC3]: { expr: "happy", act: "dance" } },
                lines: [
                    ["", "어두운 밤, 숲속에 요란한 락음악이 울려 퍼지고… 바이커들이 술판을 벌이고 있다."],
                    [TO, "헤이~ 아가씨들! 분위기 좀 띄워봐! 스트립쇼 어때?!", { expr: "evil", pose: "point", to: LING }],
                    [MIKE, "벗어라! 벗어라! 벗어라!", { expr: "excited", pose: "both", act: "stomp" }],
                    [LING, "좋아~ 잘 봐둬!", { expr: "smug", act: "dance", sfx: "clap", set: { [LING]: { outfit: "bikini", act: "dance" }, [B3]: { act: "jump" }, [TO]: { expr: "excited", act: "jump" }, [MIKE]: { act: "jump" } } }],
                    [SALLY, "나, 나도…!", { expr: "shy", set: { [SALLY]: { outfit: "bikini", expr: "shy" } } }],
                    [TO, "에이~ Sally, 넌 Ling Ling보다 매력이 없잖아. 뭔가 더 보여줘야지!", { expr: "roll", pose: "shrug", to: SALLY, set: { [SALLY]: { expr: "annoyed" } } }],
                    [SALLY, "흥…! 그럼 이건 어때!", { expr: "angry", sfx: "clap", set: { [SALLY]: { nude: true, outfit: "", expr: "angry" } } }],
                    [TO, "오~ 이리 와봐. 한번 만져보자~", { expr: "evil", act: "sneak", to: SALLY }],
                    [SALLY, "만지지 마! 싫다고!!", { expr: "angry", act: "stomp", to: TO }],
                    ["", "기분이 상한 Sally가 자리를 박차고 숲속으로 사라진다.", { set: { [SALLY]: { gone: true } } }]] },
            // Scene 4 · 숲속 — Sally alone · the howl · the claws
            { k: "scene", n: 4, place: "숲속", music: "stop", sec: 17, bg: "woods", dark: true, fx: "shadow", who: [SALLY, TOM],
                cast: { [SALLY]: { expr: "sad" }, [TOM]: WOLF },
                lines: [
                    [SALLY, "(옷을 갈아입으며) 흑… 다들 날 뭘로 보는 거야…", { expr: "cry", act: "shake" }],
                    ["", "아우우우— 어디선가 늑대 울음소리가 들린다.", { sfx: "howl", set: { [SALLY]: { expr: "shock" } } }],
                    [SALLY, "…누구 있어? (뒤를 돌아본다) …아무도 없네.", { expr: "scared" }],
                    ["", "그 순간— 날카로운 늑대 손톱이 Sally의 얼굴을 할퀸다!", { claw: true, flash: "red", sfx: "slash", music: "chase" }],
                    [SALLY, "꺄아아악!! 살려줘!!", { expr: "scared", act: "run", sfx: "scream" }],
                    ["", "피를 흘리며 도망치던 Sally는 나뭇가지에 발이 걸려 넘어지고…", { sfx: "growl", set: { [SALLY]: { act: "fall", expr: "dizzy" }, [TOM]: { hid: false } } }],
                    ["", "뒤따라온 늑대인간이 그녀를 덮친다.", { flash: "red", claw: true, sfx: "scream", music: "stop", set: { [TOM]: { act: "jump" }, [SALLY]: { act: "dead" } } }]] },
            // Scene 5 · 숲속 — Mike goes to look for Sally
            { k: "scene", n: 5, place: "숲속 · 바이커들의 파티", music: MC2_THEME, sec: 10, bg: "camp", fx: "camp", amb: ["crickets", "chatter"], who: [B3, TO, LING, MIKE, BC3], props: ["🍺", "🏍️", "🍺"],
                cast: { [B3]: { expr: "excited", act: "dance" }, [TO]: { expr: "happy", hold: "radio" }, [LING]: { expr: "smug", outfit: "bikini" }, [MIKE]: { expr: "sweat" }, [BC3]: { expr: "happy", act: "dance" } },
                lines: [
                    [MIKE, "Sally 이 녀석, 왜 이렇게 안 와? 내가 찾아보고 올게.", { expr: "sweat", pose: "shrug" }],
                    [LING, "아마 어디서 혼자 Skinny Dipping 하고 있을걸~ 호숫가에 가봐.", { expr: "smug", pose: "point", to: MIKE }],
                    [MIKE, "오케이~ 호숫가로 가볼게!", { expr: "happy", pose: "wave", act: "run", set: { [MIKE]: { gone: true } } }]] },
            // Scene 6 · 숲속 호숫가 — Mike
            { k: "scene", n: 6, place: "숲속 호숫가", music: "heartbeat", sec: 11, bg: "lake", fx: "moon", who: [MIKE, TOM],
                cast: { [MIKE]: { expr: "sweat" }, [TOM]: WOLF },
                lines: [
                    ["", "호숫가 물결 위로 보름달이 비친다…"],
                    [MIKE, "Sally~! 어디 있어? Sally!!", { expr: "sweat", pose: "both" }],
                    ["", "등 뒤에서 누군가 뒤쫓는 느낌…", { sfx: "growl", set: { [MIKE]: { expr: "scared" } } }],
                    [MIKE, "누, 누구야…?! 으아아악!!", { expr: "scared", act: "shake", sfx: "scream", flash: "red", claw: true, music: "stop", set: { [TOM]: { hid: false, act: "jump" } } }],
                    ["", "Mike 역시 늑대인간에게 공격당해 목숨을 잃는다.", { set: { [MIKE]: { act: "dead", expr: "dizzy" } } }]] },
            // Scene 7 · 숲속 — T.O turns the radio off · Ling Ling and T.O go to the lake
            { k: "scene", n: 7, place: "숲속 · 바이커들의 파티", music: MC2_THEME, sec: 11, bg: "camp", fx: "camp", amb: ["crickets", "chatter"], who: [B3, TO, LING, BC3], props: ["🍺", "🏍️", "🍺"],
                cast: { [B3]: { expr: "happy", act: "dance" }, [TO]: { expr: "annoyed", hold: "radio" }, [LING]: { expr: "smug", outfit: "bikini" }, [BC3]: { expr: "happy", act: "dance" } },
                lines: [
                    [TO, "(라디오를 끄며) 에잇, 둘 다 왜 아직도 안 와? PARTY POOPERS 같으니라고!", { expr: "annoyed", hold: "radio", music: "stop", amb: "crickets", set: { [B3]: { act: "" }, [BC3]: { act: "" } } }],
                    [LING, "우리도 호숫가에 가보자~ 둘이 애정행각 중일지도 몰라~", { expr: "evil", to: TO }],
                    [TO, "좋지~ 난 훔쳐보는 걸 좋아하거든! 가자!", { expr: "evil", pose: "wave" }],
                    [B3, "너무 재밌게 놀다 오지는 마라~!", { expr: "tongue", pose: "wave", set: { [BC3]: { expr: "tongue", act: "laugh" } } }]] },
            // Scene 8 · 숲속 호숫가 — T.O in the water · Ling Ling teases · the wolf comes up with T.O's body
            { k: "scene", n: 8, place: "숲속 호숫가", music: "heartbeat", sec: 21, bg: "lake", fx: "moon", who: [LING, TO, TOM],
                cast: { [LING]: { expr: "sweat", outfit: "clothes" }, [TO]: { expr: "blank" }, [TOM]: WOLF },
                lines: [
                    [LING, "Mike~! Sally~! …아무 대답이 없네.", { expr: "sweat", pose: "both" }],
                    [TO, "에이, 그냥 포기하자. 대신 우리끼리 재밌는 거 하자고~", { expr: "evil", to: LING }],
                    ["", "T.O가 웃통을 벗고 Ling Ling에게 몸을 과시한다.", { set: { [TO]: { nude: true, act: "hop", pose: "both", expr: "cool" }, [LING]: { expr: "tongue", act: "laugh" } } }],
                    [TO, "Ling Ling~ 너도 들어와! 물 완전 시원해~", { expr: "love", pose: "wave", act: "swim", set: { [TO]: { act: "swim", expr: "love" } } }],
                    [LING, "흐흥~ 이거 보고 싶어? (윗옷을 벗어 비키니를 보여준다)", { expr: "smug", act: "dance", set: { [LING]: { outfit: "bikini", act: "" } } }],
                    ["", "그때— T.O가 무언가에 당겨지듯 물속으로 사라진다!", { sfx: "splash", flash: true, set: { [TO]: { gone: true } } }],
                    [LING, "T.O? 장난치지 마! …T.O!!", { expr: "scared", act: "shake" }],
                    ["", "물속에서 T.O의 시체를 문 거대한 늑대인간이 튀어나온다!!", { sfx: "growl", flash: "red", music: "chase", set: { [TOM]: { hid: false, act: "jump", held: { r: TO, expr: "dizzy", nude: true } } } }],
                    [LING, "꺄아아아악!!!", { expr: "scared", act: "run", sfx: "scream", set: { [LING]: { gone: true } } }]] },
            // Scene 9 · 숲속 — the party place, wrecked · Ling Ling
            { k: "scene", n: 9, place: "숲속 · 파티 장소", music: "stop", sec: 14, bg: "camp", dark: true, who: [B3, LING, BC3, TOM], props: ["🍺", "🏍️", "📻"],
                cast: { [B3]: { expr: "dizzy", act: "dead" }, [BC3]: { expr: "dizzy", act: "dead" }, [LING]: { expr: "scared", outfit: "bikini", act: "run" }, [TOM]: WOLF },
                lines: [
                    ["", "음악은 꺼져 있고… 파티 장소는 아수라장이 되어 있다.", { sfx: "sting" }],
                    [LING, "다들 어디… 헉!!", { expr: "shock", act: "shake" }],
                    [LING, "꺄아아악!! 죽었어…! 다 죽었어!!", { expr: "scared", act: "shake", sfx: "scream" }],
                    ["", "그때— 위에서 늑대인간이 뛰어내리며 그녀를 덮친다!", { flash: "red", claw: true, sfx: "growl", set: { [TOM]: { hid: false, act: "jump" } } }],
                    ["", "Ling Ling마저… 그렇게 숨을 거둔다.", { sfx: "slash", light: "black", set: { [LING]: { act: "dead", expr: "dizzy" } } }]] },
            // Scene 10 · 하우스 — Kiki calls · Tom snaps · the bloody clothes
            { k: "scene", n: 10, place: "하우스", music: "mystery", sec: 17, bg: "house", who: [TOM, ERICA], call: KIKI,
                cast: { [TOM]: { expr: "happy", hold: "phone" }, [ERICA]: { expr: "happy" } },
                lines: [
                    ["", "다음 날, Tom에게 멀리 이사 간 여동생 Kiki의 전화가 걸려온다.", { sfx: "ring" }],
                    [TOM, "Kiki! 오랜만이야, 거기서 잘 지내지?", { expr: "happy", hold: "phone" }],
                    [KIKI, "오빠… 숲속 살인사건 뉴스 봤어. 솔직히 말해. 오빠랑 관련 있지?", { expr: "angry" }],
                    [TOM, "무슨 소리야! 나랑은 아무 상관 없어!", { expr: "angry", hold: "phone", act: "stomp" }],
                    [ERICA, "여보, 무슨 일이야? 왜 그래?", { expr: "sad", to: TOM }],
                    [TOM, "신경 꺼! 당신이 알 거 없어!!", { expr: "angry", pose: "point", to: ERICA, set: { [ERICA]: { expr: "cry" } } }],
                    [ERICA, "…빨래나 할게.", { expr: "sad", set: { [TOM]: { gone: true } } }],
                    ["", "Tom의 옷을 빨래통에 넣으려던 Erica… 피 묻은 옷을 발견한다.", { sfx: "sting", flash: "red", set: { [ERICA]: { expr: "shock", act: "shake" } } }]] },
            // Scene 11 · 탐정사무소 — Denis's file · Tom and Kiki
            { k: "scene", n: 11, place: "탐정사무소", music: "mystery", sec: 10, bg: "agency", who: [PHIL, SAGE],
                cast: { [PHIL]: { expr: "blank", hold: "paper" }, [SAGE]: { expr: "blank" } },
                lines: [
                    [PHIL, "바이커 살인사건… 내가 겪은 그 사건이랑 너무 비슷해.", { expr: "blank", hold: "paper" }],
                    [PHIL, "Denis의 기록을 보니… 자식이 둘 있군. Tom과 Kiki.", { expr: "cool", hold: "book" }],
                    [PHIL, "Sage, 이 둘에게 연락 좀 해봐.", { pose: "point", to: SAGE }],
                    [SAGE, "(전화를 건다) …Tom은 안 받네요.", { expr: "sweat", hold: "phone", sfx: "ring" }]] },
            { k: "scene", n: 11, place: "탐정사무소", sec: 10, bg: "agency", who: [PHIL, SAGE], call: KIKI,
                cast: { [PHIL]: { expr: "blank" }, [SAGE]: { expr: "happy", hold: "phone" } },
                lines: [
                    [SAGE, "Kiki 씨죠? 오빠 Tom 씨에 대해 여쭤볼 게 있어서요.", { hold: "phone" }],
                    [KIKI, "요즘 오빠가 좀 이상해요… 주소 알려드릴게요. 꼭 가봐 주세요.", { expr: "sad" }],
                    [SAGE, "선배님, Tom의 집 주소를 알아냈어요!", { expr: "excited", hold: "phone", to: PHIL }]] },
            // Scene 12 · 하우스 — late at night · Erica's story · Tom turns · Phil shoots
            { k: "scene", n: 12, place: "하우스 · 늦은 밤", music: "tense", sec: 10, bg: "house", dark: true, fx: "moon", who: [PHIL, SAGE, TOM, ERICA],
                cast: { [PHIL]: { expr: "cool" }, [SAGE]: { expr: "blank" }, [TOM]: { expr: "roll" }, [ERICA]: { expr: "sad" } },
                lines: [
                    [PHIL, "Tom, 숲속 살인사건에 대해 아는 게 있나?", { expr: "cool", pose: "point", to: TOM }],
                    [TOM, "전 아무것도 몰라요. 그날 밤엔 집에 있었다고요.", { expr: "roll", pose: "shrug" }],
                    [ERICA, "탐정님… 잠깐 조용한 곳에서 얘기 좀 할 수 있을까요?", { expr: "sad", to: PHIL }]] },
            { k: "scene", n: 12, place: "하우스 · 부엌", sec: 10, bg: "house", dark: true, who: [ERICA, PHIL],
                cast: { [ERICA]: { expr: "sad" }, [PHIL]: { expr: "blank" } },
                lines: [
                    [ERICA, "사실… 남편 빨래에서 피 묻은 옷을 발견했어요.", { expr: "cry", act: "shake" }],
                    [PHIL, "역시… 이번 사건은 Tom과 관련이 있어.", { expr: "angry", pose: "hips" }],
                    ["", "그때— 거실에서 Sage의 비명이 들려온다!", { sfx: "scream", flash: "red", set: { [ERICA]: { expr: "scared" }, [PHIL]: { expr: "shock" } } }]] },
            { k: "scene", n: 12, place: "하우스 · 거실", music: "fullmoon", sec: 15, bg: "house", dark: true, fx: "moon", who: [ERICA, PHIL, SAGE, TOM],
                cast: { [ERICA]: { expr: "scared" }, [PHIL]: { expr: "shock", hold: "gun", pose: "point" }, [SAGE]: { expr: "dizzy", act: "fall" }, [TOM]: { expr: "beast", wolf: "half", pose: "both", act: "wolfing" } },
                lines: [
                    ["", "늑대인간으로 변해가는 Tom… 그 옆에 Sage가 신음하며 죽어가고 있다.", { sfx: "growl" }],
                    [SAGE, "서… 선배님… 으윽…", { expr: "dizzy", act: "fall", set: { [SAGE]: { act: "dead" } } }],
                    [TOM, "아우우우— 이건… 나의 아버지를 죽인 복수다!!", { expr: "beast", pose: "both", act: "wolfing", sfx: "howl", flash: "red", set: { [TOM]: { wolf: "full" } } }],
                    [PHIL, "Tom… 나도 정말 이러고 싶지 않았다.", { expr: "sad", hold: "gun", pose: "point", to: TOM }],
                    ["", "탕!! 탕!!", { sfx: "shot", flash: true, music: "stop", set: { [TOM]: { act: "dead" } } }],
                    ["", "이 모든 걸 지켜본 Erica는 정신을 잃고 쓰러진다.", { light: "black", set: { [ERICA]: { act: "fall", expr: "dizzy" } } }]] },
            // Scene 13 · 병원 — Erica wakes · the baby · Tom and Sage are dead
            { k: "scene", n: 13, place: "병원 · 병실", music: "lullaby", sec: 15, bg: "hospital", fx: "wake", who: [NURSE, ERICA, VINCENT, PHIL],
                cast: { [NURSE]: { expr: "happy" }, [ERICA]: { expr: "sleepy" }, [VINCENT]: { expr: "blank" }, [PHIL]: { expr: "blank" } },
                lines: [
                    [NURSE, "Erica 씨, 정신이 드세요?", { to: ERICA }],
                    ["", "Erica가 눈을 깜빡이며 깨어난다… 흐릿하던 얼굴들이 또렷해진다.", { set: { [ERICA]: { expr: "blank" } } }],
                    [NURSE, "축하드려요! 조산이었지만 아기는 건강하게 태어났어요~", { expr: "excited", to: ERICA, set: { [ERICA]: { expr: "happy", held: { r: BABY, expr: "sleepy", baby: true } } } }],
                    [PHIL, "고생 많았어요. 축하합니다.", { expr: "happy" }],
                    [ERICA, "탐정님… 제 남편이랑 Sage 씨는요…?", { expr: "sad", to: PHIL }],
                    [PHIL, "……안타깝게도 Tom과 Sage는… 세상을 떠났습니다.", { expr: "sad", set: { [ERICA]: { expr: "cry" } } }],
                    [VINCENT, "산모분께 따로 드릴 말씀이 있어서요. 잠시 자리 좀 비켜주시겠어요?", { expr: "blank", set: { [NURSE]: { gone: true }, [PHIL]: { gone: true } } }]] },
            // Dr. Vincent: the baby's heart · the unknown DNA
            { k: "scene", n: 13, place: "병원 · 병실", music: "mystery", sec: 13, bg: "hospital", who: [ERICA, VINCENT], held: { [ERICA]: { r: BABY, expr: "sleepy", baby: true } },
                cast: { [ERICA]: { expr: "sad" }, [VINCENT]: { expr: "blank" } },
                lines: [
                    [VINCENT, "아기는 정상적으로 태어났지만… 다른 아기들과 달리 굉장히 혈기왕성하고 심장박동이 매우 빠릅니다.", { expr: "sweat", amb: ["room", "heartbeat"] }],
                    [VINCENT, "혈액에선 이상징후가 없었는데… DNA 검사에서 한 번도 발견된 적 없는 고대 특수 종족의 DNA가 나왔어요.", { expr: "shock" }],
                    [VINCENT, "정말… 흥미롭군요.", { expr: "evil" }],
                    ["", "Erica는 품에 안긴 아기를 가만히 바라본다…", { set: { [ERICA]: { expr: "sad" } } }]] },
            // 클로즈업 — the baby's eyes turn red
            { k: "scene", n: 13, place: "병원 · 병실", music: "fullmoon", sec: 7, bg: "hospital", close: true, who: [BABY],
                cast: { [BABY]: { expr: "sleepy", swaddle: true } },
                lines: [
                    ["", "……"],
                    ["", "아기의 눈동자가 살짝… 빨갛게 변한다.", { sfx: "growl", flash: "red", set: { [BABY]: { expr: "redeye" } } }]] },
            { k: "end", sec: 4, text: "The End", credits: true, music: "fullmoon" }
        ]
    };
};
// ---------------------------------------------------------------- ⭐ built-in movie: 늑대인간 (Moonchild 3: Werewolf · the admin's own idea · Movie Screen)
//   music: audio/movies/moonchild3_theme.mp3 · title art: images/movies/moonchild3_title*.png
//   new here: title style "jungle" (+ peek: who looks down from the plane) · cast { only, bg } · bg jungle / junglenight / village / hut
//   · fx bonfire / ritual · line pop { e, at, fly } · act kneel · hold knife / bow / pighead / necklace · look { tribal, beads } · wolf eyes "yellow"
const MC3_THEME = "audio/movies/moonchild3_theme.mp3";
const moonchild3 = () => {
    const P = n => findPid(n);
    const JIMMY = "Jimmy", JORDAN = "Jordan", MISSY = "Missy", KUMI = "Kumi", ARCH = "Archaeologist", NUKA = "Chief Nuka", BIZO = "Bizo",
        PILOT = "Pilot", DNA = "DNA Researcher", T1 = "Tribal Member #1", T2 = "Tribal Member #2", T3 = "Tribal Member #3";
    const FRIENDS = [JIMMY, JORDAN, MISSY, KUMI, ARCH], TRIBE = [BIZO, T1, T2, T3];
    const WOLF = { wolf: "full", expr: "beast", pose: "both" };
    return {
        id: "m_moonchild3", builtin: true,
        en: "Moonchild 3: Werewolf", ko: "늑대인간",
        brand: "moviescreen", nation: "Emo World", date: "68-10-07", creator: "James", stock: { maps: 40, shops: 80 },
        // 💀 Body Count (in the order they die)
        bodyCount: [
            { r: KUMI, scene: "Scene 7 · 부족의 집", how: "인기척에 밖으로 나갔다가 늑대인간이 된 Jimmy에게 습격당함." },
            { r: ARCH, scene: "Scene 7 · 부족의 집", how: "도망치다 Bizo가 쏜 부족의 화살에 머리를 맞고 사망." },
            { r: BIZO, scene: "Scene 7 · 부족의 집", how: "다시 화살을 꺼내려던 순간, 노란 눈으로 돌아온 늑대인간 Jimmy에게 살해됨." },
            { r: JIMMY, scene: "Scene 7 · 부족의 집", how: "늑대인간의 피를 원한 Chief Nuka의 칼에 찔려 사망." },
            { r: NUKA, scene: "Scene 7 · 부족의 집", how: "Missy를 공격하려다 Jordan이 내리꽂은 Bizo의 화살에 눈을 찔려 사망." }
        ],
        genres: ["공포", "스릴러"], rating: "emo", stars: 3, quality: 2, lgbtq: false,
        cast: [
            { ko: "전구곰돌이", pid: P("전구곰돌이"), role: JIMMY, part: "lead" },
            { ko: "잘안풀리는개미", pid: P("잘안풀리는개미"), role: JORDAN, part: "lead" },
            { ko: "덩찌", pid: P("덩찌"), role: MISSY, part: "lead", look: { outfit: "clothes" } },
            { ko: "마리드", pid: P("마리드"), role: KUMI, part: "lead", look: { outfit: "clothes" } },
            { ko: "깔깔구름", pid: P("깔깔구름"), role: ARCH, part: "lead" },
            { ko: "고동비네할아버지", pid: P("고동비네할아버지"), role: NUKA, part: "lead", look: { tribal: true } },
            { ko: "TD이모부", pid: P("TD이모부"), role: "Bizo, the Tribal Member", short: BIZO, part: "lead", nude: true },
            { ko: "케인이모부", pid: P("케인이모부"), role: PILOT, part: "support" },
            { ko: "파란눈동자세모", pid: P("파란눈동자세모"), role: DNA, part: "support" },
            { ko: "흑 (형)", pid: P("흑 (형)"), role: "Tribal Member", short: T1, part: "extra", nude: true },
            { ko: "누글이모", pid: P("누글이모"), role: "Tribal Member", short: T2, part: "extra", nude: true },
            { ko: "나병신", pid: P("나병신"), role: "Tribal Member", short: T3, part: "extra", nude: true }
        ],
        plot: "Jimmy는 DNA 연구센터로부터 Nuka 부족이 지닌 비밀을 파헤치기 위한 고대 정글로의 탐험을 제안받는다. 고민 끝에 Jimmy는 여자친구 및 그의 친구들과 정글 여행에 떠나기로 결정한다. 이윽고 Jimmy는 자신에 대한 무시무시한 정체를 알게되는데...",
        music: "fullmoon",
        cover: {
            // 중간표지: logo · the Korean title art standing tall · "Werewolf" small under it · a small still
            spine: { img: "images/movies/moonchild3_title_v.png", contain: true, sub: "en", enText: "Werewolf", bg: "linear-gradient(180deg, #0a0a0a, #052e16)",
                still: { bg: "junglenight", who: [{ r: JIMMY, ...WOLF }] } },
            // 앞표지: a forest under the full moon, a red-eyed werewolf glaring out of the middle · two small tilted stills · the title art big, "Werewolf" small · no cast, no slogan
            front: { layout: "wolfglare", bg: "#04030c", titleImg: "images/movies/moonchild3_title.png", plainImg: true, enText: "Werewolf", noCast: true, stills: [
                { bg: "village", who: [{ r: NUKA, expr: "redeye", pose: "both", tribal: true }, { r: BIZO, expr: "evil", hold: "bow", nude: "full" }] },
                { bg: "jungle", who: [{ r: KUMI, expr: "scared", pose: "shrug", outfit: "clothes" }, { r: JORDAN, expr: "shock", pose: "both" }] }
            ] },
            // 뒷표지: only the moon with a long-clawed wolf's hand cast over it like a shadow · the slogan · 제작년월일 · logo (no plot)
            back: { art: "clawshadow", promo: "충.격.공.포!! 괴물의 표적이 되지 마라!" }
        },
        script: [
            { k: "brand", sec: 3 },
            // Scene 1 · 하우스 — the DNA researcher calls Jimmy
            { k: "scene", n: 1, place: "하우스", music: "mystery", sec: 22, bg: "house", who: [JIMMY], call: DNA,
                cast: { [JIMMY]: { expr: "happy", hold: "phone" } },
                lines: [
                    ["", "어느 날, Jimmy에게 낯선 번호로 전화가 걸려온다.", { sfx: "ring" }],
                    [JIMMY, "여보세요? 누구시죠?", { hold: "phone" }],
                    [DNA, "DNA 연구센터입니다. Jimmy 씨, 당신의 몸에는 고대 DNA가 흐르고 있어요.", { expr: "blank" }],
                    [JIMMY, "네…? 고대 DNA요?", { expr: "shock", hold: "phone" }],
                    [DNA, "정글 깊은 곳의 Nuka 부족이 그 DNA의 근원을 알고 있죠. 정글 탐험을 제안드리고 싶습니다.", { expr: "smug" }],
                    [DNA, "모든 비용은 저희 연구소가 부담합니다. Jimmy 씨는 부족의 정보를 시스템에 등록하는 것만 도와주시면 돼요.", { expr: "happy" }],
                    [DNA, "비행기 조종사와, 부족과 대화할 고고학자도 붙여드리겠습니다.", { expr: "cool" }],
                    [JIMMY, "음… 조금만 생각해볼게요.", { expr: "sweat", hold: "phone", pose: "shrug" }]] },
            { k: "scene", n: 1, place: "하우스", sec: 17, bg: "house", who: [JIMMY], call: JORDAN,
                cast: { [JIMMY]: { expr: "sweat", hold: "phone" } },
                lines: [
                    ["", "고민하던 Jimmy는 친구 Jordan에게 전화를 건다.", { sfx: "ring" }],
                    [JIMMY, "Jordan, 이상한 전화를 받았어. 내 몸에 고대 DNA가 흐른대. 정글로 탐험을 가자는데…", { hold: "phone", expr: "sweat" }],
                    [JORDAN, "뭐?! 완전 흥미롭잖아! 공짜 정글 여행이라고? 당장 수락해!!", { expr: "excited" }],
                    [JORDAN, "Missy랑 Kumi도 데려가자. 이건 무조건 가야 돼!", { expr: "happy" }],
                    [JIMMY, "…에라 모르겠다!", { expr: "excited", hold: "phone", pose: "both" }]] },
            { k: "scene", n: 1, place: "하우스", sec: 8, bg: "house", who: [JIMMY], call: DNA,
                cast: { [JIMMY]: { expr: "cool", hold: "phone" } },
                lines: [
                    [JIMMY, "갈게요. 정글 탐험, 하겠습니다.", { hold: "phone", expr: "cool" }],
                    [DNA, "현명한 선택입니다. …곧 뵙죠.", { expr: "evil" }]] },
            // 제목 (the theme song starts): a plane flies over the jungle · Jimmy looks down from its window · the English title over the jungle, then the Korean title art spins in
            { k: "title", sec: 13, style: "jungle", peek: JIMMY, koImg: "images/movies/moonchild3_title.png", koAt: 9600, koSfx: "sting", music: MC3_THEME },
            // 출연 (the music goes on): the four leads over the jungle
            { k: "cast", sec: 12, only: [JIMMY, JORDAN, MISSY, KUMI], bg: "jungle" },
            // Scene 2 · 정글 — the pilot drops them off
            { k: "scene", n: 2, place: "정글", music: "stop", sec: 17, bg: "jungle", who: [PILOT, JIMMY, JORDAN, MISSY, KUMI, ARCH], props: ["✈️", "🌴"],
                cast: { [PILOT]: { expr: "cool" }, [JIMMY]: { expr: "happy" }, [JORDAN]: { expr: "excited" }, [MISSY]: { expr: "happy" }, [KUMI]: { expr: "happy" }, [ARCH]: { expr: "happy", hold: "book" } },
                lines: [
                    ["", "비행기가 정글 한가운데 공터에 내려앉는다."],
                    [PILOT, "다 왔습니다. Nuka 부족은 이 길을 따라 정글 깊숙이, 이틀 정도 걸어가면 나와요.", { pose: "point", expr: "cool" }],
                    [PILOT, "저는 여기 출발지에서 기다리고 있겠습니다. 조심들 하세요.", { pose: "wave" }],
                    [JORDAN, "좋아! 진짜 탐험의 시작이다~!", { expr: "excited", pose: "both", act: "hop" }],
                    [ARCH, "자, 저를 따라오세요.", { hold: "book", pose: "point" }]] },
            { k: "scene", n: 2, place: "정글 · 트레킹", sec: 20, bg: "jungle", fx: "shadow", who: [ARCH, JIMMY, JORDAN, MISSY, KUMI], props: ["🌴", "🌿", "🌴"],
                cast: { [ARCH]: { expr: "happy", hold: "book" }, [JIMMY]: { expr: "sweat" }, [JORDAN]: { expr: "happy" }, [MISSY]: { expr: "sweat" }, [KUMI]: { expr: "happy" } },
                lines: [
                    ["", "울창한 정글 속을 헤치며 일행이 걷는다…"],
                    ["", "Kumi의 뒤로… 무언가가 스윽 지나간다.", { sfx: "sting", set: { [KUMI]: { expr: "blank" } } }],
                    [KUMI, "…뭐야? (뒤를 돌아본다) …아무것도 없네.", { expr: "sweat", act: "who" }],
                    ["", "그때— Kumi의 뒤에서 커다란 뱀이 고개를 든다!", { pop: { e: "🐍", at: KUMI, cls: "snake" } }],
                    [KUMI, "꺄아아악!! 뱀이야!!", { expr: "scared", act: "shake", sfx: "scream", pose: "both" }],
                    [JORDAN, "쉿, 괜찮아 괜찮아. 가만히 있으면 가버려. 벌써 절반이나 왔어, 조금만 힘내자.", { expr: "happy", to: KUMI, set: { [KUMI]: { expr: "cry", act: "" } } }]] },
            // Scene 3 · 정글 중간지점 — the camp · the fire · the full moon
            { k: "scene", n: 3, place: "정글 중간지점", music: "mystery", sec: 13, bg: "junglenight", fx: "bonfire", who: [JIMMY, JORDAN, ARCH],
                cast: { [JIMMY]: { expr: "happy", act: "stomp" }, [JORDAN]: { expr: "happy", act: "hop" }, [ARCH]: { expr: "sleepy" } },
                lines: [
                    ["", "해가 지고, Jimmy와 Jordan이 텐트를 친다.", { sfx: "clap" }],
                    [ARCH, "하암… 전 먼저 자겠습니다. 내일도 많이 걸어야 해요.", { expr: "sleepy", pose: "wave" }],
                    ["", "고고학자가 먼저 텐트로 들어간다.", { set: { [ARCH]: { gone: true }, [JIMMY]: { act: "" }, [JORDAN]: { act: "" } } }]] },
            { k: "scene", n: 3, place: "정글 중간지점 · 모닥불", sec: 18, bg: "junglenight", fx: "bonfire", who: [JIMMY, JORDAN, MISSY, KUMI],
                cast: { [JIMMY]: { expr: "happy" }, [JORDAN]: { expr: "happy" }, [MISSY]: { expr: "happy" }, [KUMI]: { expr: "happy" } },
                lines: [
                    ["", "모닥불 가에 넷이 둘러앉는다.", { amb: ["crickets", "wind"] }],
                    [MISSY, "Jimmy, 근데 너희 가족은 어떤 과거가 있었던 거야? 그 DNA라는 거 말이야.", { expr: "blank", to: JIMMY }],
                    [JIMMY, "(짜증스럽게) 나도 몰라! 복잡하다고. 나도 궁금해서 가는 거야.", { expr: "annoyed", pose: "shrug" }],
                    [MISSY, "…알았어, 미안.", { expr: "sad" }]] },
            { k: "scene", n: 3, place: "정글 중간지점 · 모닥불", music: "heartbeat", sec: 16, bg: "junglenight", fx: "moon", who: [JIMMY, JORDAN, MISSY, KUMI],
                cast: { [JIMMY]: { expr: "blank" }, [JORDAN]: { expr: "happy" }, [MISSY]: { expr: "blank" }, [KUMI]: { expr: "blank" } },
                lines: [
                    ["", "나무 사이로 보름달이 떠오른다…", { sfx: "howl" }],
                    ["", "Jimmy의 몸이 부르르 떨린다.", { set: { [JIMMY]: { expr: "sweat", act: "shake" } } }],
                    [JORDAN, "Jimmy, 괜찮아?", { expr: "sad", to: JIMMY }],
                    [JIMMY, "…피곤해서 그래. 먼저 잘게.", { expr: "sweat", set: { [JIMMY]: { gone: true } } }],
                    [KUMI, "Jimmy 좀 이상하지 않아…?", { expr: "blank", to: MISSY, set: { [MISSY]: { expr: "sweat" } } }]] },
            // Scene 4 · 정글 → Nuka 부족 마을 — the ritual · the Chief kneels · the pig's head
            { k: "scene", n: 4, place: "정글", music: "stop", sec: 8, bg: "jungle", who: FRIENDS, props: ["🌴", "🌿", "🌴"],
                cast: { [JIMMY]: { expr: "blank" }, [JORDAN]: { expr: "sweat" }, [MISSY]: { expr: "sweat" }, [KUMI]: { expr: "sweat" }, [ARCH]: { expr: "excited", hold: "book" } },
                lines: [
                    ["", "다음 날, 일행은 정글을 헤매고…"],
                    [ARCH, "여러분! 거의 다 왔어요! 저기가 바로 Nuka 부족이 사는 곳입니다!", { expr: "excited", pose: "point", act: "hop" }]] },
            { k: "scene", n: 4, place: "Nuka 부족 마을 · 의식", music: "tense", sec: 17, bg: "village", fx: "ritual", amb: ["wind", "chatter"], who: [NUKA, ...TRIBE, ...FRIENDS], fullNude: TRIBE,
                cast: { [NUKA]: { expr: "cool", pose: "both" }, [BIZO]: { expr: "excited", act: "dance" }, [T1]: { expr: "excited", act: "dance" }, [T2]: { expr: "happy", act: "dance" }, [T3]: { expr: "excited", act: "dance" },
                    [JIMMY]: { expr: "blank" }, [JORDAN]: { expr: "blank" }, [MISSY]: { expr: "blank" }, [KUMI]: { expr: "blank" }, [ARCH]: { expr: "blank" } },
                lines: [
                    ["", "부족 마을에선 의식이 한창이다. 돼지머리를 둘러싸고 불길이 타오른다.", { sfx: "drum" }],
                    [NUKA, "우가 툼바! 우가 툼바 냐!!", { expr: "excited", pose: "both" }],
                    ["", "전통 옷을 입은 Chief Nuka… 그리고 Bizo와 부족원들은 모두 알몸이다.", { set: { [BIZO]: { act: "jump" }, [T2]: { act: "hop" } } }],
                    ["", "Jimmy와 친구들은 멍하니 그 광경을 바라본다…", { set: { [JORDAN]: { expr: "shock" }, [MISSY]: { expr: "shy" }, [KUMI]: { expr: "shock" } } }]] },
            { k: "scene", n: 4, place: "Nuka 부족 마을", music: "mystery", sec: 26, bg: "village", amb: ["wind", "birds"], who: [NUKA, BIZO, JIMMY, JORDAN, MISSY, KUMI, ARCH], fullNude: [BIZO],
                cast: { [NUKA]: { expr: "happy" }, [BIZO]: { expr: "happy" }, [JIMMY]: { expr: "blank" }, [JORDAN]: { expr: "sweat" }, [MISSY]: { expr: "sweat" }, [KUMI]: { expr: "sweat" }, [ARCH]: { expr: "happy", hold: "book" } },
                lines: [
                    ["", "의식이 끝나자, Chief Nuka가 일행에게 다가온다."],
                    [NUKA, "우바 카라마! 니쿠 니쿠 와!", { expr: "happy", pose: "wave" }],
                    ["", "그리고… Jimmy 앞에 무릎을 꿇는다!", { set: { [NUKA]: { act: "kneel", expr: "love" }, [JIMMY]: { expr: "shock" }, [JORDAN]: { expr: "shock" }, [MISSY]: { expr: "shock" }, [KUMI]: { expr: "shock" } } }],
                    [JIMMY, "어, 어…? 왜 이러세요?!", { expr: "sweat", pose: "shrug" }],
                    [ARCH, "(통역하며) Jimmy 씨가 족장님 친척의 조상님을 닮으셨답니다.", { expr: "blank", hold: "book" }],
                    ["", "Bizo가 잘 구운 돼지머리를 내민다.", { set: { [NUKA]: { act: "" }, [BIZO]: { hold: "pighead", pose: "point", expr: "excited" } } }],
                    [JORDAN, "우웩… 괜찮아요, 괜찮아요!", { expr: "roll", pose: "shrug", set: { [MISSY]: { expr: "annoyed" }, [KUMI]: { expr: "annoyed" }, [JIMMY]: { expr: "annoyed" } } }],
                    [BIZO, "(중얼중얼) 쿠루 바… 울프 마라 쿠…", { expr: "evil", hold: "pighead" }],
                    [KUMI, "방금 뭐라고 한 거예요?", { expr: "blank", to: ARCH }],
                    [ARCH, "아, 아무것도 아니에요. 신경 쓰지 마세요.", { expr: "sweat", hold: "book" }]] },
            // Scene 5 · 부족의 집 — the full moon · Jimmy wakes · the Chief's red eyes
            { k: "scene", n: 5, place: "부족의 집", music: "heartbeat", sec: 13, bg: "hut", dark: true, who: [JORDAN, MISSY, JIMMY, KUMI, ARCH],
                cast: { [JORDAN]: { expr: "sleepy", act: "sleep" }, [MISSY]: { expr: "sleepy", act: "sleep" }, [JIMMY]: { expr: "sleepy", act: "sleep" }, [KUMI]: { expr: "sleepy", act: "sleep" }, [ARCH]: { expr: "sleepy", act: "sleep" } },
                lines: [
                    ["", "보름달이 뜬 밤. 모두 부족의 집에서 잠들어 있다…", { sfx: "howl" }],
                    ["", "인기척에 Jimmy가 눈을 뜬다.", { set: { [JIMMY]: { expr: "blank", act: "" } } }],
                    [JIMMY, "(속삭이며) …족장이랑 Bizo가 없잖아?", { expr: "sweat", act: "who" }],
                    ["", "Jimmy는 조용히 밖으로 나간다.", { set: { [JIMMY]: { gone: true } } }]] },
            { k: "scene", n: 5, place: "Nuka 부족 마을 · 한밤중", sec: 16, bg: "village", dark: true, fx: "moon", who: [NUKA, BIZO, JIMMY], fullNude: [BIZO],
                cast: { [NUKA]: { expr: "evil", pose: "both" }, [BIZO]: { expr: "evil", pose: "both" }, [JIMMY]: { expr: "sweat", hid: true } },
                lines: [
                    ["", "달빛 아래, Chief Nuka와 Bizo가 알 수 없는 주문을 중얼거리며 의식을 치르고 있다.", { sfx: "drum" }],
                    [NUKA, "울프 마라… 쿠루 쿠루 바…", { expr: "evil", pose: "both", act: "shake" }],
                    ["", "숨어서 지켜보는 Jimmy…", { set: { [JIMMY]: { hid: false, expr: "scared" } } }],
                    ["", "그 순간— 족장의 눈이 붉게 변하며 Jimmy와 눈이 마주친다!", { flash: "red", sfx: "sting", set: { [NUKA]: { expr: "redeye", act: "" } } }],
                    ["", "Jimmy는 황급히 집 안으로 뛰어 들어간다.", { set: { [JIMMY]: { act: "run", expr: "scared", gone: true } } }]] },
            // Scene 6 · 정글 — the secret · the bone necklace
            { k: "scene", n: 6, place: "정글 · 부족 마을 앞", music: "mystery", sec: 28, bg: "jungle", who: [JIMMY, ARCH, NUKA, JORDAN, MISSY, KUMI],
                cast: { [JIMMY]: { expr: "angry" }, [ARCH]: { expr: "blank", hold: "book" }, [NUKA]: { expr: "cool" }, [JORDAN]: { expr: "blank" }, [MISSY]: { expr: "blank" }, [KUMI]: { expr: "blank" } },
                lines: [
                    [JIMMY, "족장님, 대체 무슨 비밀을 갖고 있는 거죠? 어젯밤 그건 뭐였어요?", { expr: "angry", pose: "point", to: NUKA }],
                    [NUKA, "와카 루 울프… 니쿠 마라 바.", { expr: "cool" }],
                    [ARCH, "(통역하며) …Jimmy 씨는 늑대인간의 후손이랍니다.", { expr: "shock", hold: "book", set: { [JORDAN]: { expr: "shock" }, [MISSY]: { expr: "shock" }, [KUMI]: { expr: "shock" } } }],
                    [ARCH, "옛날 늑대인간 부족이 이 부족과 대대로 함께 살았는데, 그중 하나가 Nuka 부족원과 사랑에 빠졌고…", { hold: "book" }],
                    [ARCH, "Nuka 부족의 한 여자가 늑대인간의 아이를 갖게 되었다고요.", { expr: "sweat", hold: "book" }],
                    [ARCH, "늑대인간 부족은 아주 강했기 때문에, Nuka 부족은 언제나 그들을 우상처럼 섬겨왔답니다.", { hold: "book" }],
                    ["", "Chief Nuka가 우상의 표시로 Jimmy에게 뼈 목걸이를 건넨다.", { set: { [NUKA]: { hold: "necklace", pose: "point" } } }],
                    [JIMMY, "…이걸 저한테요?", { expr: "blank", set: { [NUKA]: { hold: "", pose: "down", expr: "happy" }, [JIMMY]: { beads: true } } }]] },
            // Scene 7 · 부족의 집 — the full moon again · Kumi · the blood ritual · the arrows · the knife
            { k: "scene", n: 7, place: "부족의 집", music: "heartbeat", sec: 14, bg: "hut", dark: true, who: [JORDAN, MISSY, KUMI, ARCH],
                cast: { [JORDAN]: { expr: "sleepy", act: "sleep" }, [MISSY]: { expr: "sleepy", act: "sleep" }, [KUMI]: { expr: "sleepy", act: "sleep" }, [ARCH]: { expr: "sleepy", act: "sleep" } },
                lines: [
                    ["", "다시 보름달이 뜬 밤. 내일 떠날 채비를 마치고 모두 잠자리에 든다…"],
                    ["", "인기척에 Kumi가 눈을 뜬다.", { set: { [KUMI]: { expr: "blank", act: "" } } }],
                    [KUMI, "…Jimmy? 족장님이랑 Bizo도 없네…?", { expr: "sweat", act: "who" }],
                    ["", "Kumi는 조심스럽게 밖으로 나간다.", { set: { [KUMI]: { gone: true } } }]] },
            { k: "scene", n: 7, place: "Nuka 부족 마을 · 한밤중", sec: 12, bg: "village", dark: true, fx: "moon", who: [KUMI, JIMMY],
                cast: { [KUMI]: { expr: "sweat" }, [JIMMY]: { ...WOLF, beads: true, hid: true } },
                lines: [
                    [KUMI, "Jimmy~? 어디 있어…?", { expr: "sweat", pose: "both" }],
                    ["", "아우우우— 바로 뒤에서 들리는 울음소리.", { sfx: "howl", set: { [KUMI]: { expr: "scared" } } }],
                    ["", "늑대인간이 된 Jimmy가 Kumi를 덮친다!", { flash: "red", claw: true, sfx: "growl", music: "chase", set: { [JIMMY]: { hid: false, act: "jump" } } }],
                    [KUMI, "꺄아아아악!!!", { expr: "scared", act: "shake", sfx: "scream", set: { [KUMI]: { act: "dead", expr: "dizzy" }, [JIMMY]: { act: "" } } }]] },
            { k: "scene", n: 7, place: "Nuka 부족 마을 · 피의 의식", music: "tense", sec: 50, bg: "village", dark: true, fx: "moon", who: [ARCH, JORDAN, MISSY, KUMI, JIMMY, NUKA, BIZO], fullNude: [BIZO],
                cast: { [ARCH]: { expr: "shock" }, [JORDAN]: { expr: "shock" }, [MISSY]: { expr: "shock" }, [KUMI]: { expr: "dizzy", act: "dead" }, [JIMMY]: { ...WOLF }, [NUKA]: { expr: "redeye", pose: "both" }, [BIZO]: { expr: "evil", pose: "both" } },
                lines: [
                    ["", "비명 소리에 뛰쳐나온 고고학자, Jordan, Missy…", { sfx: "sting" }],
                    ["", "Bizo와 족장, 그리고 늑대인간 Jimmy가 의식을 치르며 Kumi의 피를 마시고 있다!", { flash: "red", sfx: "growl" }],
                    [MISSY, "꺄아악!! Kumi!!!", { expr: "scared", act: "shake", sfx: "scream" }],
                    [ARCH, "으, 으아아…!", { expr: "scared", act: "run" }],
                    ["", "Bizo가 부족의 화살을 꺼내 도망치는 고고학자를 쏜다—", { set: { [BIZO]: { hold: "bow", pose: "point", expr: "evil" } }, pop: { e: "🏹", at: ARCH, fly: true } }],
                    ["", "화살이 고고학자의 머리에 꽂힌다.", { sfx: "slash", flash: "red", set: { [ARCH]: { act: "dead", expr: "dizzy" } } }],
                    [BIZO, "울프 마라! 쿠루 바!!", { expr: "evil", hold: "bow", pose: "point", to: JORDAN }],
                    [JORDAN, "Jimmy!! 제발 정신 차려! 우리 좀 도와줘!!", { expr: "cry", pose: "both", to: JIMMY }],
                    ["", "혼란스러워하는 늑대인간 Jimmy…", { set: { [JIMMY]: { act: "shake" } } }],
                    ["", "붉은 눈이… 노랗게 변한다.", { sfx: "sting", set: { [JIMMY]: { eyes: "yellow", act: "" } } }],
                    ["", "Bizo가 다시 화살을 꺼내는 순간— 늑대인간 Jimmy가 그를 덮친다!", { flash: "red", claw: true, sfx: "growl", set: { [JIMMY]: { act: "jump" }, [BIZO]: { act: "dead", expr: "dizzy", hold: "" } } }],
                    [NUKA, "우리는 너처럼 강해지기 위해 늑대인간의 피를 원한다!", { expr: "angry", hold: "knife", pose: "point", to: JIMMY }],
                    ["", "족장이 칼로 늑대인간 Jimmy를 찌른다!", { flash: "red", sfx: "slash", set: { [JIMMY]: { act: "dead" }, [NUKA]: { hold: "knife" } } }],
                    ["", "흘러나온 Jimmy의 피를 마신 족장이 Jordan과 Missy를 바라본다.", { set: { [NUKA]: { expr: "redeye", hold: "knife", pose: "both" } } }],
                    [NUKA, "이제는 내가 가장 강력한 부족이다!!!", { expr: "beast", hold: "knife", pose: "both", act: "wolfing", sfx: "howl", flash: "red" }],
                    ["", "족장이 칼을 들고 Missy에게 달려든다—", { set: { [NUKA]: { act: "sneak", expr: "beast", hold: "knife" }, [MISSY]: { expr: "scared", act: "shake" } } }],
                    ["", "Jordan이 떨어진 Bizo의 화살을 주워 Nuka의 눈에 내리꽂는다!", { flash: "red", sfx: "slash", pop: { e: "🏹", at: NUKA, stay: true, cls: "stuck" }, set: { [JORDAN]: { act: "push", expr: "angry" } } }],
                    ["", "Chief Nuka가 쓰러진다.", { music: "stop", set: { [NUKA]: { act: "dead", expr: "dizzy", hold: "" }, [JORDAN]: { act: "" } } }],
                    [MISSY, "흐흑… 흐아앙…", { expr: "cry", act: "shake", set: { [JORDAN]: { expr: "cry" } } }],
                    ["", "Jordan과 Missy는 오열하며 부족의 집을 탈출한다.", { set: { [JORDAN]: { gone: true, act: "run" }, [MISSY]: { gone: true, act: "run" } } }]] },
            // Scene 8 · 정글 — the pilot · the Archaeologist's phone · the castle
            { k: "scene", n: 8, place: "정글 · 출발지", music: "mystery", sec: 22, bg: "jungle", who: [PILOT, JORDAN, MISSY], props: ["✈️", "🌴"],
                cast: { [PILOT]: { expr: "shock" }, [JORDAN]: { expr: "cry" }, [MISSY]: { expr: "cry" } },
                lines: [
                    [PILOT, "무슨 일이에요?! 다른 분들은요?", { expr: "shock", pose: "shrug" }],
                    [JORDAN, "끔찍했어요… 제발 빨리 여기서 떠나요!", { expr: "cry", pose: "both" }],
                    ["", "그때, Jordan의 가방 속 고고학자의 휴대폰이 울린다.", { sfx: "ring", set: { [JORDAN]: { hold: "phone", expr: "sweat" }, [PILOT]: { expr: "blank" } } }]] },
            { k: "scene", n: 8, place: "정글 · 출발지", sec: 24, bg: "jungle", who: [PILOT, JORDAN, MISSY], call: DNA, props: ["✈️", "🌴"],
                cast: { [PILOT]: { expr: "blank" }, [JORDAN]: { expr: "sweat", hold: "phone" }, [MISSY]: { expr: "sad" } },
                lines: [
                    [DNA, "아, 고고학자님? 깜빡하고 말씀 못 드린 게 있어서요.", { expr: "happy" }],
                    [JORDAN, "그 사람은 이미 죽었어요! 대체 무슨 일이 벌어지고 있는 거죠?!", { expr: "angry", hold: "phone", act: "stomp" }],
                    [DNA, "…Chief Nuka 부족과 연관된 DNA는 정글에서만 발견된 게 아니에요.", { expr: "blank" }],
                    [DNA, "고대의 어느 성에서도… 발견되었죠.", { expr: "evil", sfx: "sting" }],
                    [JORDAN, "당신들이 이 모든 걸 꾸민 거잖아!! (전화를 끊는다)", { expr: "angry", hold: "phone", pose: "point" }],
                    [MISSY, "(떨며) …우리가 비밀을 더 밝혀야 되지 않겠어…?", { expr: "sweat", act: "shake", music: "fullmoon", set: { [JORDAN]: { expr: "shock", hold: "" } } }]] },
            { k: "end", sec: 6, text: "The End", credits: true, music: MC3_THEME }
        ]
    };
};
export const scriptSeconds = m =>(m.script || []).reduce((a, p) => a + (p.sec || 0), 0);

// ---------------------------------------------------------------- the catalog: only movies the admin ordered (built-in + made in the admin generator)
let cache = null, cacheKey = "";
export function allMovies() {
    const key = `${(Store.allPlayers || []).length}|${(Store.vhs?.movies || []).map(m => m.updated || m.id).join(",")}`;
    if (cache && key === cacheKey) return cache;
    const admin = (Store.vhs?.movies || []).filter(m => m && m.id && !m.off);
    cache = [...builtinMovies(), ...admin]; cacheKey = key;
    return cache;
}
export const movieById = id => allMovies().find(m => m.id === id) || null;
export const builtinMovies = () => [fortuneSwindlers(), helloBaby(), hurryKidMe(), emptyDen(), moonchild(), moonchild2(), moonchild3()];
export const castOf = (m, role) => m.cast.find(c => c.role === role || c.short === role) || null;
export const titleText = m => `${m.ko}${m.en ? ` (${m.en})` : ""}`;
// does a movie fit a shop kind?
export function fitsShop(m, k) {
    if (k.genre && !m.genres.includes(k.genre)) return false;
    if (k.lgbtq && !m.lgbtq) return false;
    if (k.nation && m.nation !== k.nation) return false;
    return m.stars >= k.stars[0] && m.stars <= k.stars[1];
}
