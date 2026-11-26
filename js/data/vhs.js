// ================================================================ 📼 VHS — 동행 비디오 가게 · VHS Collection · 영화DB · 🎬 영화관
//   genres · ratings (띠) · brands (= 영화사) · the 37 shop kinds · the movie catalog:
//     • built-in movies (복덩이 사기단 …) + movies made in the admin generator (Store.vhs.movies)
//     • a seeded batch of generated movies so every kind of shop has something on its shelves
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
const pickR = (r, a) => a[Math.floor(r() * a.length)];
const intR = (r, a, b) => a + Math.floor(r() * (b - a + 1));

// ---------------------------------------------------------------- players by name (the cast)
const findPid = nameKo => Store.allPlayers.find(p => p.name_ko === nameKo)?.id ?? null;

// ---------------------------------------------------------------- ⭐ built-in movie: 복덩이 사기단 (sample · saved in the movie DB)
//   cast: { pid, ko: player name (kept for the record), role, part: lead | support | extra, nude?, sexy? }
//   script: parts the 🎬 cinema plays (screens/vhs.js) — sec = seconds on screen
const fortuneSwindlers = () => {
    const P = n => findPid(n);
    return {
        id: "m_fortune_swindlers", builtin: true,
        en: "Fortune Swindlers", ko: "복덩이 사기단",
        brand: "hyhg", nation: "Emo World", date: "0-02-14",
        genres: ["코미디"], rating: "water", stars: 1, quality: 6, lgbtq: false,
        cast: [
            { ko: "짱구", pid: P("짱구"), role: "Henry", part: "lead" },
            { ko: "스마일", pid: P("스마일"), role: "Justin", part: "lead" },
            { ko: "남자이모", pid: P("남자이모"), role: "Jack, the Gang Boss", short: "Jack", part: "support" },
            { ko: "힘쎈이", pid: P("힘쎈이"), role: "Paul, the Gangster", short: "Paul", part: "support" },
            { ko: "행복이모", pid: P("행복이모"), role: "Lily", part: "support" },
            { ko: "보라곰돌이", pid: P("보라곰돌이"), role: "Taxi Driver", part: "extra" },
            { ko: "완전에로년덩이", pid: P("완전에로년덩이"), role: "Jack's Babe", part: "extra", nude: true },
            { ko: "똥멜론", pid: P("똥멜론"), role: "Banker", part: "extra" }
        ],
        plot: "사고만 치고 다니는 두 친구 Henry와 Justin이 우연히 범죄에 휘말리게 되면서 벌어지는 대소동.",
        tagline: "이들이 나타나면 온 세상의 배꼽이 뒤집어 진다!!",
        music: "comic",
        cover: {
            spine: { font: "comic", scene: "money" },
            front: { layout: "duo-money", main: ["Henry", "Justin"], back: ["Lily", "Jack, the Gang Boss", "Paul, the Gangster"], frown: true, gun: "Jack, the Gang Boss", bg: "#38bdf8", fx: "💸" },
            back: { scenes: ["socks", "bank", "bag", "taxi"] }
        },
        script: [
            { k: "brand", sec: 4 },
            { k: "title", sec: 8, style: "comic" },
            { k: "cast", sec: 7, parts: ["lead", "support"] },
            { k: "scene", sec: 12, bg: "street", props: ["🧦", "🧦"], who: ["Justin", "Henry", "Lily"], lines: [
                ["Justin", "자자~ 오늘만 특가! 세상에서 제일 부드러운 양말이 왔어요!"],
                ["Lily", "어머, 이 양말 얼마예요?"],
                ["Henry", "100,000G입니다! 최고급 양말이에요, 손님!"],
                ["Lily", "좋아요, 살게요!"]] },
            { k: "scene", sec: 9, bg: "street", props: ["📱"], who: ["Lily", "Justin", "Henry"], lines: [
                ["Lily", "(검색 중…) 뭐야? 10,000G짜리잖아?!"],
                ["Lily", "이 사기꾼들아!! 거기 서!!"],
                ["Henry", "튀어!!"]], fx: "chase" },
            { k: "scene", sec: 9, bg: "bank", props: ["💰"], who: ["Justin", "Henry", "Banker"], lines: [
                ["Banker", "어서 오세요~ 100,000G 출금 도와드릴게요."],
                ["Justin", "오늘도 한껀 했다!"],
                ["Henry", "크크크, 역시 우리야!"]] },
            { k: "scene", sec: 10, bg: "street", props: ["💼", "💎"], who: ["Justin", "Henry"], lines: [
                ["Justin", "어? 이거 누가 떨어뜨린 돈가방인데…?"],
                ["Henry", "헉! 금은보화가 가득해!!"],
                ["Justin", "일단 들고 튀자!"]], fx: "sparkle" },
            { k: "scene", sec: 11, bg: "hideout", props: ["🍾"], who: ["Jack, the Gang Boss", "Jack's Babe", "Paul, the Gangster"], nude: ["Jack's Babe"], lines: [
                ["Paul", "보스… 돈가방이 없어졌습니다."],
                ["Jack", "뭐야?! 당장 그 돈가방 찾아와!!"]], fx: "music" },
            { k: "scene", sec: 10, bg: "bank", who: ["Paul, the Gangster", "Lily"], lines: [
                ["Paul", "이봐, 혹시 돈가방 든 놈들 못 봤어?"],
                ["Lily", "봤죠! 양말 파는 사기꾼 둘이요. 하나는 웃는 얼굴, 하나는 짱구 머리!"]] },
            { k: "scene", sec: 13, bg: "street", props: ["🚕", "💸", "💸", "💸"], who: ["Justin", "Henry", "Jack, the Gang Boss", "Paul, the Gangster"], lines: [
                ["Jack", "저기 있다! 잡아!!"],
                ["Justin", "택시!! 그리고… 받아라~!"],
                ["Paul", "돈이다!! 비켜, 비켜!!"],
                ["Jack", "놓쳤잖아!!"]], fx: "money" },
            { k: "scene", sec: 8, bg: "street", props: ["💸"], who: ["Lily", "Henry"], lines: [
                ["Lily", "어머, 하늘에서 돈이…!"],
                ["Henry", "저희 더 이상 당신에게 빚 없어요~!"]], fx: "money" },
            { k: "scene", sec: 10, bg: "taxi", props: ["🚕"], who: ["Taxi Driver", "Justin", "Henry"], lines: [
                ["Taxi Driver", "어디로 모실까요?"],
                ["Justin", "아무 곳이나요~!!"],
                ["Henry", "저희가 한 껀 또 했잖아요~!!"]] },
            { k: "end", sec: 9, text: "The End", credits: true }
        ]
    };
};

// ---------------------------------------------------------------- 🎲 generated movies (fills the shops)
const WORDS = {
    adj: [["Crazy", "미친"], ["Lucky", "행운의"], ["Golden", "황금"], ["Midnight", "한밤의"], ["Silent", "침묵의"], ["Wild", "야생의"], ["Last", "마지막"], ["Burning", "불타는"], ["Frozen", "얼어붙은"], ["Secret", "비밀의"],
        ["Pink", "핑크빛"], ["Iron", "강철"], ["Broken", "부서진"], ["Dancing", "춤추는"], ["Lonely", "외로운"], ["Bloody", "피의"], ["Sweet", "달콤한"], ["Hidden", "숨겨진"], ["Royal", "왕실의"], ["Forbidden", "금지된"]],
    noun: {
        코미디: [["Swindlers", "사기단"], ["Diner", "식당 소동"], ["Wedding", "결혼 대작전"], ["Twins", "쌍둥이"], ["Taxi", "택시"], ["Grandma", "할머니"]],
        액션: [["Heist", "대작전"], ["Highway", "고속도로"], ["Commando", "특공대"], ["Fist", "주먹"], ["Express", "특급"], ["Revenge", "복수"]],
        판타지: [["Dragon", "드래곤"], ["Kingdom", "왕국"], ["Wizard", "마법사"], ["Crystal", "수정구"], ["Fairy", "요정"], ["Sword", "검"]],
        SF: [["Robot", "로봇"], ["Planet", "행성"], ["Galaxy", "은하"], ["Cyborg", "사이보그"], ["Time Machine", "타임머신"], ["Alien", "외계인"]],
        공포: [["Ghost", "유령"], ["Doll", "인형"], ["Basement", "지하실"], ["Curse", "저주"], ["Night", "밤"], ["Mask", "가면"]],
        스릴러: [["Witness", "목격자"], ["Stranger", "낯선 자"], ["Alibi", "알리바이"], ["Trap", "함정"], ["Shadow", "그림자"], ["Code", "암호"]],
        성인: [["Kiss", "키스"], ["Desire", "욕망"], ["Affair", "정사"], ["Temptation", "유혹"], ["Lips", "입술"], ["Paradise", "낙원"]],
        가족: [["Puppy", "강아지"], ["Summer", "여름방학"], ["Treehouse", "나무집"], ["Picnic", "소풍"], ["Christmas", "크리스마스"], ["Grandpa", "할아버지"]],
        드라마: [["Letter", "편지"], ["Station", "정거장"], ["Mother", "어머니"], ["Rain", "비"], ["Promise", "약속"], ["Village", "마을"]],
        로맨스: [["Love", "사랑"], ["Island", "섬"], ["Valentine", "발렌타인"], ["Heart", "마음"], ["Moonlight", "달빛"], ["Rose", "장미"]],
        뮤지컬: [["Melody", "멜로디"], ["Stage", "무대"], ["Song", "노래"], ["Rhythm", "리듬"], ["Opera", "오페라"], ["Disco", "디스코"]],
        어드벤처: [["Treasure", "보물"], ["Jungle", "정글"], ["Voyage", "항해"], ["Temple", "신전"], ["Map", "지도"], ["Expedition", "탐험대"]]
    }
};
const ROLE_NAMES = ["Henry", "Justin", "Lily", "Jack", "Paul", "Mona", "Rex", "Tina", "Bruno", "Candy", "Victor", "Ruby", "Max", "Sally", "Leo", "Nina", "Otto", "Gina", "Duke", "Pearl"];
const EXTRA_ROLES = ["Taxi Driver", "Banker", "Waiter", "Police Officer", "Old Man", "Nurse", "Shop Keeper", "Mailman", "Doctor", "Singer"];
const TAGS = {
    코미디: ["웃음 보장! 배꼽 주의!", "올해 최고의 폭소 대작!"], 액션: ["숨 막히는 액션의 연속!", "역대급 스케일의 액션 블록버스터!"], 판타지: ["꿈과 마법의 세계로!", "상상 그 이상의 판타지!"],
    SF: ["미래가 온다!", "우주를 뒤흔든 SF 대작!"], 공포: ["절대 혼자 보지 마시오!", "악령인가? 인간인가?"], 스릴러: ["긴장감 넘치는 스릴러 대작!", "마지막 1분을 놓치지 마라!"],
    성인: ["어른들만의 뜨거운 이야기", "금지된 사랑의 기록"], 가족: ["온 가족이 함께 보는 감동!", "웃음과 눈물의 가족 영화"], 드라마: ["가슴을 울리는 감동 실화!", "눈물 없이 볼 수 없다"],
    로맨스: ["올해 가장 설레는 사랑 이야기", "다시 사랑하고 싶어진다"], 뮤지컬: ["노래와 춤이 넘치는 무대!", "귀가 즐거운 2시간"], 어드벤처: ["모험은 지금부터!", "전설의 보물을 찾아라!"]
};
const PLOTS = {
    코미디: ["어설픈 {a}와 {b}가 엉뚱한 사건에 휘말리며 벌어지는 대소동.", "{a}가 실수로 받은 상자 하나 때문에 온 동네가 뒤집어진다."],
    액션: ["모든 것을 잃은 {a}가 {b}에게 복수하기 위해 다시 일어선다.", "{a}와 {b}는 단 하룻밤 사이에 도시를 구해야 한다."],
    판타지: ["평범한 {a}가 우연히 마법의 문을 열면서 시작되는 모험.", "{a}는 사라진 왕국의 마지막 후계자였다."],
    SF: ["먼 미래, {a}는 인류를 구할 마지막 신호를 받는다.", "{a}가 만든 로봇이 스스로 생각하기 시작했다."],
    공포: ["낡은 저택으로 이사 온 {a}에게 매일 밤 이상한 일이 일어난다.", "{a}와 {b}가 들어간 지하실에서는 아무도 돌아오지 못했다."],
    스릴러: ["살인 사건의 유일한 목격자 {a}, 그리고 그를 쫓는 {b}.", "{a}에게 도착한 정체불명의 편지 한 통."],
    성인: ["{a}와 {b}의 위험하고 뜨거운 비밀 관계.", "한여름 밤, {a}는 거부할 수 없는 유혹에 빠진다."],
    가족: ["{a} 가족이 잃어버린 강아지를 찾아 떠나는 따뜻한 여정.", "방학을 맞은 {a}와 할아버지의 특별한 여름."],
    드라마: ["가난하지만 꿈을 잃지 않은 {a}의 감동적인 인생 이야기.", "오랜 세월이 지나 다시 만난 {a}와 {b}."],
    로맨스: ["우연히 같은 우산을 쓰게 된 {a}와 {b}의 설레는 사랑.", "{a}는 매일 같은 시간에 오는 {b}를 기다린다."],
    뮤지컬: ["무대를 꿈꾸는 {a}가 노래 하나로 세상을 바꾼다.", "{a}와 {b}의 노래가 온 마을을 춤추게 한다."],
    어드벤처: ["{a}와 {b}는 전설의 보물 지도를 손에 넣는다.", "정글 깊은 곳 잃어버린 신전을 찾아 떠난 {a}."]
};
const BGS = ["street", "bank", "hideout", "taxi", "home", "forest", "space", "castle", "beach", "night", "stage", "office"];
const GENRE_BG = { 코미디: ["street", "home", "office"], 액션: ["street", "night", "office"], 판타지: ["castle", "forest"], SF: ["space", "office"], 공포: ["night", "home", "forest"], 스릴러: ["night", "office", "street"],
    성인: ["home", "night", "beach"], 가족: ["home", "forest", "beach"], 드라마: ["home", "street"], 로맨스: ["beach", "street", "night"], 뮤지컬: ["stage", "street"], 어드벤처: ["forest", "castle", "beach"] };
const LINES = {
    open: ["거기 누구야?!", "이게 다 무슨 일이야…", "드디어 찾았다!", "오늘은 운이 좋을 것 같아.", "조용히 해, 누가 온다!", "믿을 수가 없어!"],
    mid: ["절대 포기하지 않을 거야.", "넌 날 속였어!", "지금 아니면 기회는 없어!", "도대체 원하는 게 뭐야?", "날 믿어, 제발!", "모든 게 끝났어…", "이건 시작에 불과해."],
    end: ["이제 다 끝났어.", "우리… 다시 만날 수 있을까?", "고마워, 정말로.", "내일은 또 내일의 해가 뜰 거야!", "모든 게 꿈이었나…?"]
};
const MUSIC = { 코미디: "comic", 액션: "action", 판타지: "fantasy", SF: "space", 공포: "horror", 스릴러: "tense", 성인: "smooth", 가족: "happy", 드라마: "sad", 로맨스: "smooth", 뮤지컬: "happy", 어드벤처: "action" };

// one generated movie (the cast comes from the active players — r decides who)
export function makeMovie(seed, { players = null, genres = null, nation = null, stars = null, brand = null, lgbtq = null } = {}) {
    const r = seeded("vhs-movie-" + seed);
    const pool = (players || Store.players || []).filter(p => p && p.id != null);
    const g1 = genres?.[0] || pickR(r, GENRES);
    const g2 = genres ? genres[1] || null : (r() < 0.3 ? pickR(r, GENRES.filter(g => g !== g1)) : null);
    const gs = [g1, g2].filter(Boolean);
    const adj = pickR(r, WORDS.adj), noun = pickR(r, WORDS.noun[g1]);
    const nat = nation || pickR(r, COUNTRIES);
    const bw = r() < 0.06;
    const natBrand = BRANDS.find(b => b.nation === nat);
    const genreBrand = BRANDS.filter(b => b.genre && gs.includes(b.genre));
    const free = BRANDS.filter(b => !b.nation && !b.genre && !b.bw);
    const br = brand || (bw ? "bw" : r() < 0.35 && natBrand ? natBrand.id : genreBrand.length && r() < 0.5 ? pickR(r, genreBrand).id : pickR(r, free).id);
    const st = stars || (() => { const x = r(); return x < 0.3 ? 1 : x < 0.52 ? 2 : x < 0.7 ? 3 : x < 0.82 ? 4 : x < 0.91 ? 5 : x < 0.97 ? 6 : 7; })();
    const adult = gs.includes("성인"), scary = gs.includes("공포") || gs.includes("스릴러");
    const rating = adult ? pickR(r, ["fire", "flower", "emo", "emobu", "hyhg"]) : scary ? pickR(r, ["red", "water", "bam", "fire"]) : gs.includes("가족") ? pickR(r, ["white", "green"]) : pickR(r, ["white", "green", "bam", "red", "water"]);
    const picks = [...pool].sort(() => r() - 0.5);
    const nLead = intR(r, 1, 2), nSup = intR(r, 1, 3), nExt = intR(r, 1, 3);
    const roles = [...ROLE_NAMES].sort(() => r() - 0.5);
    const cast = [];
    for (let i = 0; i < nLead + nSup && picks.length; i++) { const p = picks.shift(); cast.push({ pid: p.id, ko: p.name_ko || p.player_name, role: roles[i], part: i < nLead ? "lead" : "support" }); }
    for (let i = 0; i < nExt && picks.length; i++) { const p = picks.shift(); cast.push({ pid: p.id, ko: p.name_ko || p.player_name, role: pickR(r, EXTRA_ROLES), part: "extra" }); }
    if (adult && cast.length) { const n = cast[Math.floor(r() * cast.length)]; if (r() < 0.6) n.nude = true; else n.sexy = true; }
    const leads = cast.filter(c => c.part === "lead"), main = leads[0]?.role || "Henry", other = cast.find(c => c !== leads[0])?.role || "Lily";
    const plot = pickR(r, PLOTS[g1]).replace("{a}", main).replace("{b}", other);
    const year = intR(r, 0, 10000), month = intR(r, 1, 12), day = intR(r, 1, 28);
    const m = {
        id: "g_" + seed, en: `The ${adj[0]} ${noun[0]}`, ko: `${adj[1]} ${noun[1]}`, brand: br, nation: nat,
        date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        genres: gs, rating, stars: st, quality: intR(r, 1, 7), lgbtq: lgbtq ?? r() < 0.08, bw: br === "bw",
        cast, plot, tagline: pickR(r, TAGS[g1]), music: MUSIC[g1],
        cover: { spine: { font: pickR(r, ["bold", "comic", "brush", "neon"]) }, front: { layout: pickR(r, ["hero", "collage", "poster"]), bg: pickR(r, ["#0ea5e9", "#be123c", "#111827", "#f59e0b", "#7c3aed", "#059669", "#ec4899"]) }, back: {} }
    };
    if (br === "jolja") m.quality = intR(r, 1, 2);      // 拙作 ENT: 졸작 전문
    if (br === "myeongjak") m.quality = intR(r, 6, 7);  // 명작시네마: 명작 전문
    m.script = autoScript(m, r);
    return m;
}
// brand → title → cast → 3~6 story scenes → ending (60 ~ 180 s)
export function autoScript(m, r = seeded("script-" + m.id)) {
    const who = c => c.short || c.role;
    const bgs = GENRE_BG[m.genres[0]] || BGS;
    const leads = m.cast.filter(c => c.part === "lead"), sup = m.cast.filter(c => c.part === "support"), ext = m.cast.filter(c => c.part === "extra");
    const scenes = [];
    const nScenes = intR(r, 3, 6);
    for (let i = 0; i < nScenes; i++) {
        const people = [...leads, ...(i % 2 ? sup : ext.slice(0, 1)), ...(i === nScenes - 1 ? sup.slice(0, 1) : [])].filter(Boolean).slice(0, 4);
        if (!people.length) continue;
        const kind = i === 0 ? "open" : i === nScenes - 1 ? "end" : "mid";
        const lines = Array.from({ length: intR(r, 2, 4) }, (_, j) => [who(people[j % people.length]), pickR(r, LINES[kind])]);
        scenes.push({ k: "scene", sec: 6 + lines.length * 3, bg: pickR(r, bgs), who: people.map(c => c.role), lines, nude: people.filter(c => c.nude).map(c => c.role) });
    }
    const base = [{ k: "brand", sec: 4 }, { k: "title", sec: 6, style: m.cover?.spine?.font || "bold" }, { k: "cast", sec: 6, parts: ["lead", "support"] }, ...scenes, { k: "end", sec: 5, text: "The End", credits: r() < 0.5 }];
    // 1 ~ 3 minutes
    let total = base.reduce((a, p) => a + p.sec, 0);
    while (total < 60) { for (const p of base) if (p.k === "scene" && total < 60) { p.sec += 2; total += 2; } }
    while (total > 180) { for (const p of base) if (p.k === "scene" && total > 180 && p.sec > 8) { p.sec -= 2; total -= 2; } }
    return base;
}
export const scriptSeconds = m => (m.script || []).reduce((a, p) => a + (p.sec || 0), 0);

// ---------------------------------------------------------------- the catalog
export const GEN_COUNT = 260;
let cache = null, cacheKey = "";
export function allMovies() {
    const key = `${(Store.players || []).length}|${(Store.vhs?.movies || []).length}|${(Store.vhs?.movies || []).map(m => m.updated || m.id).join(",")}`;
    if (cache && key === cacheKey) return cache;
    const admin = (Store.vhs?.movies || []).filter(m => m && m.id && !m.off);
    const list = [fortuneSwindlers(), ...admin];
    for (let i = 0; i < GEN_COUNT; i++) list.push(makeMovie(i));
    cache = list; cacheKey = key;
    return list;
}
export const movieById = id => allMovies().find(m => m.id === id) || null;
export const builtinMovies = () => [fortuneSwindlers()];
export const castOf = (m, role) => m.cast.find(c => c.role === role || c.short === role) || null;
export const titleText = m => `${m.ko}${m.en ? ` (${m.en})` : ""}`;
// does a movie fit a shop kind?
export function fitsShop(m, k) {
    if (k.genre && !m.genres.includes(k.genre)) return false;
    if (k.lgbtq && !m.lgbtq) return false;
    if (k.nation && m.nation !== k.nation) return false;
    return m.stars >= k.stars[0] && m.stars <= k.stars[1];
}
