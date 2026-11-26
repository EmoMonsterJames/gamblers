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
    { id: "bam", name: "밤띠", color: "#7c4a1e", ink: "#fff", age: 1 },
    { id: "red", name: "빨간띠", color: "#dc2626", ink: "#fff", age: 1 },
    { id: "water", name: "물띠", color: "#0ea5e9", ink: "#fff", age: 1 },
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

// price by rarity (G)
export const PRICE_BY_STAR = [0, 5000, 10000, 20000, 50000, 100000, 200000, 400000];

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
    ["stage", "무대 위"], ["pyramid", "피라미드"], ["frame", "액자"], ["panels", "만화 칸"], ["split", "대각선 분할"], ["money-burst", "돈뭉치 위 주연 + 뚫고 나온 배우들"], ["rocket", "날아온 로켓 위 주연 + 지켜보는 배우들"]];
export const BACK_LAYOUTS = [["", "영화사 기본"], ["stills4", "스틸컷 4장"], ["stills3", "스틸컷 3장"], ["stills2", "스틸컷 2장"], ["still1", "스틸컷 1장 크게"], ["strip3", "가로 띠 3장"],
    ["filmstrip", "필름 스트립"], ["polaroid", "폴라로이드"], ["text", "글 위주 (스틸컷 없음)"]];
export const STILL_N = { stills4: 4, stills3: 3, stills2: 2, still1: 1, strip3: 3, filmstrip: 3, polaroid: 2, text: 0 };

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
//   cast: { pid, ko: player name (kept for the record), role, part: lead | support | extra, nude? }
//   script: parts the 🎬 cinema plays (screens/vhs.js) — sec = seconds on screen
//   a scene: who (roles on screen) · cast { role: { expr, pose, hold, act } } (how they start) · lines [who, text, { expr, pose, hold, act }]
//            · nude (roles shown topless) · props · bg · fx
const fortuneSwindlers = () => {
    const P = n => findPid(n);
    const HENRY = "Henry", JUSTIN = "Justin", JACK = "Jack, the Gang Boss", PAUL = "Paul, the Gangster", LILY = "Lily", TAXI = "Taxi Driver", BABE = "Jack's Babe", BANKER = "Banker";
    return {
        id: "m_fortune_swindlers", builtin: true,
        en: "Fortune Swindlers", ko: "복덩이 사기단",
        brand: "hyhg", nation: "Emo World", date: "0-02-14",
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
        brand: "redlips", nation: "Emo World", date: "78-03-29",
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
export const scriptSeconds = m => (m.script || []).reduce((a, p) => a + (p.sec || 0), 0);

// ---------------------------------------------------------------- the catalog: only movies the admin ordered (built-in + made in the admin generator)
let cache = null, cacheKey = "";
export function allMovies() {
    const key = `${(Store.allPlayers || []).length}|${(Store.vhs?.movies || []).map(m => m.updated || m.id).join(",")}`;
    if (cache && key === cacheKey) return cache;
    const admin = (Store.vhs?.movies || []).filter(m => m && m.id && !m.off);
    cache = [fortuneSwindlers(), helloBaby(), ...admin]; cacheKey = key;
    return cache;
}
export const movieById = id => allMovies().find(m => m.id === id) || null;
export const builtinMovies = () => [fortuneSwindlers(), helloBaby()];
export const castOf = (m, role) => m.cast.find(c => c.role === role || c.short === role) || null;
export const titleText = m => `${m.ko}${m.en ? ` (${m.en})` : ""}`;
// does a movie fit a shop kind?
export function fitsShop(m, k) {
    if (k.genre && !m.genres.includes(k.genre)) return false;
    if (k.lgbtq && !m.lgbtq) return false;
    if (k.nation && m.nation !== k.nation) return false;
    return m.stars >= k.stars[0] && m.stars <= k.stars[1];
}
