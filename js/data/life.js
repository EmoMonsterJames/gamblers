// =====================================================================
// 🍚 Life systems — definitions only (rules: game/life.js · game/employ.js,
// screens: screens/lifeCorners.js · admin: screens/adminMaps.js).
//   FOODS        every food (price = the admin's default; a map's food corner may change it)
//   FOOD_CORNERS food corner templates (an admin adds them to maps: loc.food = [{ k, entry, fee, items }])
//   WEATHERS     map weather (loc.weather) — HP loss from 1:00 on a map, then every 3:00
//   LODGES       lodging corners (loc.lodge = [{ k, entry, fee }]) — shelter from weather + NPCs
//   SCHOOL_GRADE school → A+ … F (employment corner)
//   COMPANIES    the employment corner's companies
// Food items are also bag items (ITEMS "food_<id>") so the Self-Business markets can sell them.
// =====================================================================
import { ITEMS, ITEM_BY_ID } from "./catalog.js";

// ---------------------------------------------------------------- 🍚 food gauge
export const FOOD_MAX = 100, FOOD_START = 30;
export const FOOD_DRAIN = 10, FOOD_DRAIN_SEC = 180;   // −10 every 3 minutes of play
export const STARVE_HP = 10;                         // food 0 at the end of a turn → HP −10
export const FOOD_USES_PER_ROUND = 2;                // purchases in food corners per round (all corners together)

// races: only these ethnicities may eat it (case-insensitive) · art: a drawn icon (ui/foodArt.js), else the emoji
const F = (id, name, emoji, price, food, x = {}) => ({ id, name, emoji, price, food, ...x });
export const FOODS = [
    F("rice", "밥", "🍚", 3000, 20),
    F("ramen", "라면", "🍜", 4000, 22),
    F("bread", "빵", "🍞", 1000, 10),
    F("creambread", "크림빵", "🥯", 2000, 12, { art: "creambread" }),
    F("jji", "찌", "⚫", 0, -10, { art: "jji", desc: "검은 슬라임 같은 정체불명의 음식… 먹으면 오히려 배가 꺼진다" }),
    F("puseong", "푸성귀", "🥬", 500, 5, { art: "puseong" }),
    F("ddeogwi", "떠귀", "🐟", 500, 5, { art: "ddeogwi", desc: "뼈만 남은 생선" }),
    F("poop", "똥", "💩", 0, -5),
    F("chicken", "닭고기", "🍗", 10000, 50),
    F("minichicken", "미니닭고기", "🍗", 7000, 30, { art: "minichicken" }),
    F("kkorong", "꼬롱살", "🦐", 5000, 30, { art: "kkorong", desc: "하얀 새우 속살" }),
    F("kkomeal", "꼬밀", "🍱", 10000, 60, { art: "kkomeal", desc: "꼬롱살 밀키트 (뽀동이 스티커 부착)" }),
    F("icecream", "아이스크림", "🍦", 3000, 10),
    F("minicake", "미니케이크", "🧁", 4000, 10),
    F("cake", "케이크", "🎂", 10000, 30),
    F("carrot", "구운당근", "🥕", 5000, 30, { art: "carrot" }),
    F("ricetower", "라이스타워", "🍘", 8000, 40, { art: "ricetower", desc: "쌀과자가 탑처럼 쌓인 간식" }),
    F("burger", "햄버거", "🍔", 4000, 20),
    F("cheese", "치즈", "🧀", 1500, 7),
    F("cola", "콜라", "🥤", 1000, 3, { art: "cola" }),
    F("fries", "감자튀김", "🍟", 2500, 10),
    F("water", "물", "💧", 300, 1, { art: "water" }),
    F("tea", "Tea", "🍵", 600, 3),
    F("coffee", "커피", "☕", 1000, 4),
    F("energydrink", "에너지드링크", "⚡", 2000, 15, { art: "energydrink" }),
    F("milk", "우유", "🥛", 1500, 10),
    F("ddongju", "똥주", "🍶", 300, 1, { art: "ddongju", desc: "똥 그림이 그려진 소주" }),
    F("kongchip", "콩칩", "🫘", 2500, 5, { art: "kongchip" }),
    F("bagettn", "바게튼", "🥖", 2000, 6, { art: "bagettn" }),
    F("guraball", "구라볼", "🟤", 1500, 4, { art: "guraball" }),
    F("jjongji", "쫑지", "🥬", 3000, 13, { art: "jjongji", desc: "김치 모양 반찬" }),
    F("bosongkimchi", "보송이 김치", "🫙", 9000, 40, { art: "bosongkimchi", desc: "고급 통에 담긴 김치" }),
    F("clearjuice", "투명주스", "🧃", 2000, 10, { art: "clearjuice", races: ["Ghost", "Jiangshi", "Angel", "Devil", "Others"], desc: "유령 무늬가 새겨진 투명한 주스" }),
    F("antnoodle", "개밋입국수", "🍜", 5000, 40, { art: "antnoodle", races: ["Ant", "Bug", "Others"] }),
    F("pinenoodle", "솔잎국수", "🍜", 3000, 30, { art: "pinenoodle" }),
    F("shapecookie", "도형쿠키", "🍪", 4000, 10, { art: "shapecookie", races: ["Square", "Triangle", "Trapezoid", "Donglee", "Rhombus", "Others"] }),
    F("sunshine", "햇살", "☀️", 5000, 50, { art: "sunshine", races: ["Smile"], desc: "햇살이 담긴 상자 — 눈부시다!" }),
    F("fish", "생선", "🐟", 3000, 25),
    F("energybar", "에너지바", "🍫", 2500, 20, { art: "energybar" }),
    F("yogurt", "요거트", "🥣", 2000, 15, { art: "yogurt" }),
    F("feast", "만찬", "🍽️", 30000, 100, { art: "feast", desc: "닭고기와 각종 야채가 올려진 푸짐한 한상" }),
    // 🍱 combo sets (sold only in their restaurant)
    F("combo_sol", "콤보세트 (솔잎국수+쫑지+물)", "🍱", 18000, 50, { combo: ["pinenoodle", "jjongji", "water"] }),
    F("combo_burger", "콤보세트 (햄버거+콜라+감자튀김)", "🍱", 10000, 40, { combo: ["burger", "cola", "fries"] }),
    F("combo_ddeogwi", "콤보세트 (떠귀+밥+물)", "🍱", 6000, 30, { combo: ["ddeogwi", "rice", "water"] }),
    F("combo_carrot", "콤보세트 (구운당근+콜라+감자튀김+아이스크림)", "🍱", 15000, 65, { combo: ["carrot", "cola", "fries", "icecream"] })
];
export const FOOD_BY_ID = Object.fromEntries(FOODS.map(f => [f.id, f]));
export const foodItemId = id => "food_" + id;
export const foodOfItem = itemId => String(itemId || "").startsWith("food_") ? FOOD_BY_ID[itemId.slice(5)] || null : null;
const norm = s => String(s || "").trim().toLowerCase();
export const canEatRace = (food, ethnicity) => !food?.races || food.races.some(r => norm(r) === norm(ethnicity));
// every food is a bag item too (Self-Business markets · gifts) — eaten from the 🎒 inventory
for (const f of FOODS) {
    if (ITEM_BY_ID[foodItemId(f.id)]) continue;
    const it = { id: foodItemId(f.id), name: f.name, emoji: f.emoji, food: f.food, foodPrice: f.price, desc: `${f.desc ? f.desc + " · " : ""}식량 게이지 ${f.food >= 0 ? "+" : ""}${f.food}${f.races ? ` · ${f.races.join("/")} 종족만` : ""} (🎒 인벤토리에서 먹기)` };
    ITEMS.push(it); ITEM_BY_ID[it.id] = it;
}

// ---------------------------------------------------------------- 🏪 food corners
// entry: "free" | "paid" (fee) | "random" (60% in / 40% refused)
export const ENTRY_KINDS = { free: "무료 입장", paid: "유료 입장", random: "랜덤 입장 (60% 허용)" };
export const RANDOM_ENTRY = 0.6;
const C = (id, name, emoji, color, items, x = {}) => ({ id, name, emoji, color, items, entry: "free", fee: 0, ...x });
export const FOOD_CORNERS = {
    mini_deli: C("mini_deli", "미니 델리", "🥪", "#f59e0b", ["bread", "fish", "bagettn", "water", "minichicken", "cola", "milk", "guraball"]),
    supermarket: C("supermarket", "슈퍼마켓", "🛒", "#22c55e", ["bread", "creambread", "fish", "chicken", "water", "milk", "kongchip", "bagettn", "yogurt", "sunshine", "kkorong", "coffee", "ramen", "guraball"]),
    sol_rest: C("sol_rest", "솔잎국수 레스토랑", "🌲", "#15803d", ["pinenoodle", "jjongji", "water", "combo_sol"], { entry: "random" }),
    burger_shop: C("burger_shop", "버거샵 Fast Food", "🍔", "#dc2626", ["burger", "cola", "fries", "combo_burger"]),
    ddeogwi_rest: C("ddeogwi_rest", "베스트떠귀 레스토랑", "🐟", "#0ea5e9", ["ddeogwi", "rice", "water", "combo_ddeogwi"], { entry: "random" }),
    juice_shop: C("juice_shop", "투명주스 Shop", "🧃", "#7dd3fc", ["clearjuice", "water"], { entry: "random" }),
    cookie_shop: C("cookie_shop", "도형쿠키 Shop", "🍪", "#f97316", ["shapecookie", "water"], { entry: "random" }),
    dessert: C("dessert", "디저트상점", "🍰", "#f472b6", ["icecream", "creambread", "cake", "minicake", "shapecookie", "yogurt"]),
    kimchi_shop: C("kimchi_shop", "보송이김치 Shop", "🫙", "#ef4444", ["bosongkimchi", "jjongji", "rice"], { entry: "random" }),
    marshall: C("marshall", "마샬티 (Marshall Tea)", "🍵", "#84cc16", ["tea", "coffee", "water", "minicake", "shapecookie"]),
    sunshine_shop: C("sunshine_shop", "햇살 상점", "☀️", "#facc15", ["sunshine", "water"], { entry: "random" }),
    antnoodle_rest: C("antnoodle_rest", "개밋잎국 레스토랑 Shop", "🐜", "#65a30d", ["antnoodle", "water"], { entry: "random" }),
    carrot_rest: C("carrot_rest", "구운당근 레스토랑", "🥕", "#ea580c", ["carrot", "water", "cola", "fries", "icecream", "combo_carrot"], { entry: "random" }),
    ricetower_rest: C("ricetower_rest", "라이스타워 레스토랑", "🍘", "#d97706", ["ricetower", "water", "energydrink", "milk"], { entry: "random" }),
    luxury_deli: C("luxury_deli", "럭셔리 Deli", "💎", "#a855f7", ["kkomeal", "sunshine", "shapecookie", "bosongkimchi", "yogurt", "feast", "kongchip", "energydrink", "cake", "chicken", "ramen"], { entry: "paid", fee: 3000 }),
    free_share: C("free_share", "무료음식나눔", "🤲", "#a8a29e", ["bread", "water", "milk", "rice", "puseong", "jji", "guraball"], { free: true }),
    ddong_mart: C("ddong_mart", "똥네마트", "💩", "#a16207", ["jji", "puseong", "ddeogwi", "ddongju", "poop", "water"]),
    // ---- inner corners (not placed on maps by the admin)
    hotel_mini: C("hotel_mini", "호텔 미니 상점", "🛎️", "#eab308", ["bread", "milk", "water", "cola", "kongchip", "kkorong"], { inner: true }),
    cave_vending: C("cave_vending", "음지동굴자판기", "🏧", "#475569", ["jji", "puseong", "water", "poop", "bread"], { inner: true, entry: "paid", fee: 200 }),
    hyhg_pantry: C("hyhg_pantry", "HYHG Pantry", "🥤", "#0ea5e9", ["coffee", "water", "guraball"], { inner: true, entry: "random", free: true, pantry: true })
};
export const FOOD_CORNER_LIST = Object.values(FOOD_CORNERS).filter(c => !c.inner);
export const priceOfFood = (id, override) => FOOD_CORNERS[override?.corner]?.free ? 0 : (override?.price ?? FOOD_BY_ID[id]?.price ?? 0);
// default placement (an admin can add / remove / edit them on every map)
export const FOOD_HOME = {
    free_share: ["beggar_shelter", "plaza", "dungtown"], ddong_mart: ["dungdung", "dung2", "dungtown"], sol_rest: ["foggy", "cloud", "emo_forest"],
    burger_shop: ["downtown", "gamblers", "western", "spacetown"], ddeogwi_rest: ["seaside", "shipwreck", "ocean_town", "island"], juice_shop: ["ghost", "spooky", "graveyard"],
    cookie_shop: ["poly", "poly2", "odd_casino"], dessert: ["cany", "twins", "balloon", "rainbow"], kimchi_shop: ["emo", "emo2", "wealthy"],
    marshall: ["highlimit", "eastern", "magic"], sunshine_shop: ["stars", "star_sky", "sky_pond"], antnoodle_rest: ["ground", "ground2", "underground"],
    carrot_rest: ["oink", "ribbit", "oasis"], ricetower_rest: ["mj", "mj2", "sky_tower"], luxury_deli: ["riches", "diamond_casino", "goldbar", "celebrity"],
    supermarket: ["lucky", "super", "combo_town", "ice"]
};

// ---------------------------------------------------------------- 🌦️ weather
// hp: HP lost when it hits (from 1:00 on the map, then every 3:00) · a room in that map's lodging keeps the player safe
export const WEATHERS = {
    sun: { id: "sun", name: "해", emoji: "☀️", hp: 0 },
    rain: { id: "rain", name: "비", emoji: "🌧️", hp: 5 },
    storm: { id: "storm", name: "폭우", emoji: "⛈️", hp: 10 },
    snow: { id: "snow", name: "눈", emoji: "🌨️", hp: 5 },
    blizzard: { id: "blizzard", name: "폭설", emoji: "❄️", hp: 10 },
    hail: { id: "hail", name: "우박", emoji: "🧊", hp: 20 },
    heat: { id: "heat", name: "폭염", emoji: "🥵", hp: 15 }
};
export const WEATHER_FIRST = 60, WEATHER_EVERY = 180;
// loc.weather: one of WEATHERS · "random" (drawn per round) · "" / missing → the region default below
export const WEATHER_DEFAULT_BY_REGION = { arctic: "snow", desert: "heat", spooky: "rain", sky: "random" };

// ---------------------------------------------------------------- 🏨 lodging
// rooms: { k, label, n, price, pick: "random" (draw a room first, then pay) | "direct" (pick a free one, pay first) }
// reserve: 1–3 rounds can be booked (price × rounds) · needTypes: an EmoMonster of one of these attributes is needed
// freeTypes: those monster owners stay for free · shop: an inner food corner for guests only · foods: restaurants inside (guests only)
const L = (id, name, emoji, color, rooms, x = {}) => ({ id, name, emoji, color, rooms, reserve: true, entry: "random", fee: 1000, ...x });
const room = (k, label, n, price, pick = "random") => ({ k, label, n, price, pick });
export const LODGES = {
    hotel: L("hotel", "호텔", "🏨", "#eab308", [room("normal", "일반 객실", 10, 10000), room("suite", "스위트룸", 2, 30000, "direct")], { shop: "hotel_mini", hyhg: 0.2 }),
    house: L("house", "하우스", "🏠", "#f97316", [room("room", "방", 3, 5000), room("master", "마스터룸", 1, 15000, "direct")]),
    hideout: L("hideout", "은신처", "🕳️", "#57534e", [room("spot", "자리", 2, 3000)], { reserve: false }),
    cave: L("cave", "음지동굴", "⛰️", "#334155", [room("spot", "자리", 5, 200)], { reserve: false, freeTypes: ["Light", "Electric", "Earth"], shop: "cave_vending" }),
    ghost_capsule: L("ghost_capsule", "고스트 캡슐", "👻", "#6b7280", [room("cap", "캡슐", 5, 5000)], { needTypes: ["Ghost", "Evil", "Abnormal"] }),
    steel_capsule: L("steel_capsule", "Steel Capsule", "🤖", "#94a3b8", [room("cap", "캡슐", 4, 5000)], { needTypes: ["Normal", "Steel", "Robot", "Power", "Fire"] }),
    magic_capsule: L("magic_capsule", "Magic Capsule", "🔮", "#a855f7", [room("cap", "캡슐", 4, 5000)], { needTypes: ["Magic", "Mind"] }),
    water_house: L("water_house", "수중하우스", "🫧", "#0ea5e9", [room("room", "방", 3, 7000), room("suite", "스위트룸", 2, 20000, "direct")], { needTypes: ["Water"] }),
    igloo: L("igloo", "이글루", "🧊", "#7dd3fc", [room("room", "방", 2, 6000), room("suite", "스위트룸", 1, 18000, "direct")], { needTypes: ["Ice"] }),
    space_capsule: L("space_capsule", "스페이스 캡슐", "🚀", "#6366f1", [room("cap", "캡슐", 4, 5000)], { needTypes: ["Space", "Air"] }),
    condo: L("condo", "콘도", "🏢", "#0d9488", [room("normal", "일반 객실", 10, 20000)]),
    nest_house: L("nest_house", "둥지하우스", "🪺", "#a16207", [room("room", "방", 3, 8000), room("suite", "스위트룸", 1, 24000, "direct")], { needTypes: ["Fly", "Air"] }),
    angel_house: L("angel_house", "천사의집", "👼", "#fde68a", [room("room", "방", 2, 6000), room("suite", "스위트룸", 1, 18000, "direct")], { needTypes: ["Angel", "Fairy"] }),
    tree_house: L("tree_house", "트리하우스", "🌳", "#16a34a", [room("room", "방", 2, 5000), room("suite", "스위트룸", 1, 15000, "direct")], { needTypes: ["Bug", "Grass", "Fly"] }),
    free_shelter: L("free_shelter", "무료 쉼터", "⛺", "#a8a29e", [room("room", "방", 3, 0)], { reserve: false, entry: "free", fee: 0 }),
    cube1: L("cube1", "1인용 큐브", "🟦", "#38bdf8", [room("cube", "큐브", 1, 3000, "direct")]),
    cube3: L("cube3", "3인용 큐브", "🟪", "#a78bfa", [room("cube", "큐브", 3, 3000)]),
    cube5: L("cube5", "5인용 큐브", "🟩", "#4ade80", [room("cube", "큐브", 5, 3000)]),
    penthouse: L("penthouse", "펜트하우스", "🌇", "#f472b6", [room("ph", "펜트하우스", 5, 50000, "direct")], { foods: ["carrot_rest", "ricetower_rest"], entry: "paid" })
};
export const LODGE_LIST = Object.values(LODGES);
export const MAX_RESERVE = 3;
// 🏪 a Self-Business owner's own free room on the map of their business (the whole season · random door)
export const OWNER_ROOM = { id: "owner_room", name: "오너 하우스", emoji: "🔑", color: "#c084fc", rooms: [room("owner", "오너 전용 방", 1, 0, "direct")], reserve: false, entry: "random", fee: 0, owner: true };
export const LODGE_HOME = {
    hotel: ["riches", "lucky", "downtown", "sky_casino"], house: ["gamblers", "seaside"], hideout: ["noluck", "nightmare"], cave: ["underground", "dungeon", "blackout"],
    ghost_capsule: ["ghost", "graveyard"], steel_capsule: ["cosmic", "space_center"], magic_capsule: ["magic"], water_house: ["bubble", "deepsea_casino"], igloo: ["igloo"],
    space_capsule: ["spacetown", "star_sky"], condo: ["wealthy"], nest_house: ["wingers"], angel_house: ["dove"], tree_house: ["emo_forest"], free_shelter: ["beggar_shelter", "plaza"],
    cube1: ["combo_town"], cube3: ["odd_casino"], cube5: ["rtp_town"], penthouse: ["diamond_casino", "highroller"]
};

// ---------------------------------------------------------------- default placement on the maps (data/mapAdmin.js runs this
// before it keeps the defaults, so the admin's ↺ 기본값 brings these back)
export function applyLifeDefaults(locations) {
    const NO = l => l.region === "survival" || l.kidnap;
    for (const l of locations) {
        if (NO(l)) continue;
        const food = Object.entries(FOOD_HOME).filter(([, ids]) => ids.includes(l.id)).map(([k]) => ({ k }));
        // every map has something to eat: a mini deli where nothing else was placed (not on the bare / stuck maps)
        if (!food.length && !l.bare && !l.stuck && !(l.id === "stuck_casino")) food.push({ k: "mini_deli" });
        if (l.food === undefined) l.food = food;
        if (l.lodge === undefined) l.lodge = Object.entries(LODGE_HOME).filter(([, ids]) => ids.includes(l.id)).map(([k]) => ({ k }));
    }
}

// ---------------------------------------------------------------- 🎓 school grades (employment)
// "MJ Univ." / "MJ University" → "mjuniv" (the player list writes "Univ.")
const sch = s => String(s || "").toLowerCase().replace(/university/g, "univ").replace(/[^a-z]/g, "");
export function schoolGrade(school) {
    const k = sch(school);
    if (!k || k.includes("nodegree") || k.includes("highschool")) return "F";
    if (k.includes("cyber")) return "D";                                   // Dungtong / MJ / Polynesia Cyber Univ.
    if (/^mjuniv|hyhgfilm|hyghfilm|hyhguniv|hyghuniv/.test(k)) return "A+"; // MJ Univ. · HYHG Film School · HYHG Univ.
    if (/polynesiauniv|^emouniv|bosongiuniv/.test(k)) return "A";
    if (/groundtown|foggynation|kriminal|rainbow|^skyuniv/.test(k)) return "B";
    if (/osan|dungtong/.test(k)) return "C";
    return "F";
}
export const GRADE_ORDER = ["A+", "A", "B", "C", "D", "F"];

// ---------------------------------------------------------------- 🏢 companies (employment corner)
// stage kinds: "score" (HYHG 1st: ≥100 points) · "chance" · "test" (Arizal Tech Test)
// guarantee: "all" (every stage keeps at least 1) · "final2" (Arizal: the last stage keeps 1 when ≥ 2 reached it) · null
// fireOver: fired when a season ends with a rank worse than TOP N · fullFire: when the staff is full, this many random ones go
// promoTop / promoAdd (max 3) · mgrTop / mgrPay: manager (salary fixed)
export const APPLY_MAX = 5, APPLY_PER_SEASON = 2;
export const COMPANIES = {
    hyhg: { id: "hyhg", name: "HYHG Corp.", emoji: "🏙️", color: "#0ea5e9", cap: 20, perSeason: 1, fee: 5000, pay: 20000, pts: 3,
        stages: ["score", "chance", "chance"], guarantee: "all", fireOver: 17, fullFire: 1, promoTop: 6, promoAdd: 5000, mgrTop: 2, mgrPay: 50000,
        gifts: [{ item: "flu_cure" }, { item: "hp_50" }, { item: "mission_pass" }], giftOne: true, pantry: true, hotelOff: 0.2,
        reqText: "이모몬스터 1마리 이상 · NPC 랜드 / Difficult Land 맵 3곳 이상 체험 · 지원료 5,000G (취소 불가)",
        perks: ["매 라운드 급여 20,000G + 3P", "입사선물: 감기치료제 / HP+50약 / 미션완료권 중 1개", "라운드당 HYHG Pantry 1회 무료 (입장 60%)", "호텔 일반 객실 · 스위트룸 20% 할인"],
        promoText: "TOP 17 밖이면 해고 · TOP 6마다 호봉 +5,000G (최대 3번) · 👔 매니저 (50,000G)는 진급 신청으로" },
    gm: { id: "gm", name: "General Motors", emoji: "🚗", color: "#2563eb", cap: 20, perSeason: 1, fee: 3000, pay: 15000, pts: 1,
        stages: ["chance", "chance", "chance"], guarantee: "all", fireOver: 15, fullFire: 1, promoTop: 10, promoAdd: 3000, mgrTop: 3, mgrPay: 35000,
        gifts: [{ emo: "ITEM003" }, { item: "hp_10" }, { emo: "EMO_HP10" }], giftOne: true, pantry: true,
        reqText: "카지노 랜드 1 · 2 맵 5곳 이상 체험 · 지원료 3,000G (취소 불가)",
        perks: ["매 라운드 급여 15,000G + 1P", "입사선물: Hyper Ball / HP+10약 / 이모몬스터 HP+10약 중 1개", "라운드당 HYHG Pantry 1회 무료 (입장 60%)"],
        promoText: "TOP 15 밖이면 해고 · TOP 10마다 호봉 +3,000G (최대 3번) · 👔 매니저 (35,000G)는 진급 신청으로" },
    arizal: { id: "arizal", name: "Arizal Tech", emoji: "🛰️", color: "#7c3aed", cap: 15, perSeason: 1, fee: 3000, pay: 12000, pts: 1,
        stages: ["chance", "test", "chance"], guarantee: "final2", fireOver: 13, fullFire: 1, promoTop: 10, promoAdd: 2500, mgrTop: 3, mgrPay: 30000,
        gifts: [{ gold: 5000 }], weaponOff: 0.01,
        reqText: "랜덤랜드 맵 3곳 이상 체험 · 지원료 3,000G (취소 불가)",
        perks: ["매 라운드 급여 12,000G + 1P", "입사선물: 상여금 5,000G", "모든 무기 상점 1% 추가 할인"],
        promoText: "TOP 13 밖이면 해고 · TOP 10마다 호봉 +2,500G (최대 3번) · 👔 매니저 (30,000G)는 진급 신청으로" },
    poly: { id: "poly", name: "Poly Tech", emoji: "🔺", color: "#f97316", cap: 15, perSeason: 1, fee: 3000, pay: 12000, pts: 1,
        stages: ["chance", "chance"], guarantee: "all", fireOver: 13, fullFire: 1, promoTop: 10, promoAdd: 2500, mgrTop: 3, mgrPay: 30000,
        gifts: [{ item: "food_shapecookie" }, { item: "pass_poly" }],
        reqText: "지원료 3,000G (취소 불가)",
        perks: ["매 라운드 급여 12,000G + 1P", "입사선물: 도형쿠키 + Polynesia Casino 맵권"],
        promoText: "TOP 13 밖이면 해고 · TOP 10마다 호봉 +2,500G (최대 3번) · 👔 매니저 (30,000G)는 진급 신청으로" },
    robot: { id: "robot", name: "Robot Call Center", emoji: "📞", color: "#64748b", cap: 30, perSeason: 2, fee: 1000, pay: 10000, pts: 0,
        stages: ["chance", "chance"], guarantee: "all", fireOver: 10, fullFire: 3, promoTop: 10, promoAdd: 1500, mgrTop: 6, mgrPay: 25000,
        gifts: [{ emo: "ITEM001", w: 30 }, { emo: "BALL_ROBOT", w: 10 }, { emo: "BALL_DUNG", w: 30 }, { emo: "BALL_REPEAT", w: 30 }], giftOne: true,
        reqText: "지원료 1,000G (취소 불가)",
        perks: ["매 라운드 급여 10,000G", "입사선물 (랜덤): 몬스터볼 / Robot 속성볼 (10%) / 똥볼 / Repeat Ball"],
        promoText: "TOP 10 밖이면 해고 · TOP 10마다 호봉 +1,500G (최대 3번) · 👔 매니저 (25,000G)는 진급 신청으로" },
    sparkle: { id: "sparkle", name: "Sparkling Cleaners", emoji: "🧽", color: "#22d3ee", cap: 30, perSeason: 2, fee: 0, pay: 8000, pts: 0,
        stages: ["chance", "chance"], guarantee: "all", fireOver: 10, fullFire: 3, promoTop: 10, promoAdd: 1000, mgrTop: 6, mgrPay: 15000,
        gifts: [], reqText: "무료 지원 (취소 불가)",
        perks: ["매 라운드 급여 8,000G"],
        promoText: "TOP 10 밖이면 해고 · TOP 10마다 호봉 +1,000G (최대 3번) · 👔 매니저 (15,000G)는 진급 신청으로" },
    dungdung: { id: "dungdung", name: "Dung Dung's", emoji: "💩", color: "#a16207", cap: 30, perSeason: 2, fee: 0, pay: 5000, pts: 0,
        stages: ["chance", "chance"], guarantee: "all", fireOver: 10, fullFire: 3, promoTop: 10, promoAdd: 500, mgrTop: 6, mgrPay: 10000,
        gifts: [], reqText: "무료 지원 (취소 불가)",
        perks: ["매 라운드 급여 5,000G"],
        promoText: "TOP 10 밖이면 해고 · TOP 10마다 호봉 +500G (최대 3번) · 👔 매니저 (10,000G)는 진급 신청으로" }
};
export const COMPANY_LIST = Object.values(COMPANIES);
// 🗂️ org charts: under the 🤖 CEO, teams of 1 manager seat + staff seats (managers + staff = the company's 정원)
//   kind: mgmt 경영 · hr HR · acct 회계 · sec 비서 · work (콜센터 / 청소부 / 똥쓸이 n팀)
const TEAM = (id, name, emoji, staff, kind = id) => ({ id, name, emoji, staff, kind });
const OFFICE = ([m, hr, ac, sec]) => [TEAM("mgmt", "경영팀", "📊", m), TEAM("hr", "HR팀", "🤝", hr), TEAM("acct", "회계팀", "🧮", ac), TEAM("sec", "비서팀", "💼", sec)];
const WORKS = (base, name, emoji) => [1, 2, 3, 4].map(i => TEAM(`${base}${i}`, `${name} ${i}팀`, emoji, 5, "work")).concat([TEAM("hr", "HR팀", "🤝", 1), TEAM("acct", "회계팀", "🧮", 1), TEAM("sec", "비서팀", "💼", 1)]);
export const ORG = {
    hyhg: OFFICE([4, 4, 4, 4]), gm: OFFICE([4, 4, 4, 4]), arizal: OFFICE([3, 3, 3, 2]), poly: OFFICE([3, 3, 3, 2]),
    robot: WORKS("call", "로봇콜센터", "📞"), sparkle: WORKS("clean", "청소부", "🧽"), dungdung: WORKS("dung", "똥쓸이", "💩")
};
export const CEO_NAME = { hyhg: "HYHG-X1", gm: "GM-Bot 9000", arizal: "ARZ-Prime", poly: "Poly-Tron", robot: "Call-Bot Alpha", sparkle: "Sparkle-Bot", dungdung: "Dung-Bot Mk.II" };
// 🎯 in-company missions (one at a time, from the day of joining · deadline: before only 3 players are left in that season)
export const CO_MISSIONS = [
    { id: "maxi", emoji: "💎", text: "SLOT 게임으로 MAXI 이상 잭팟 획득하기" },
    { id: "casino8k", emoji: "🃏", text: "카지노게임으로 8,000G 이상 벌기", goal: 8000 },
    { id: "capture", emoji: "🔍", text: "{attr} 속성 이모몬스터 캡쳐하기" },
    { id: "spell", emoji: "🐝", text: "스펠링비 완성하기" },
    { id: "dead2", emoji: "☠️", text: "DEAD LAND 지역 맵 아무 곳이나 2회 체험하고 살아남기", goal: 2 },
    { id: "bonus5", emoji: "🎁", text: "SLOT 게임에서 5회 스핀 안에 보너스 터뜨리기", spins: 5 },
    { id: "big30k", emoji: "🤝", text: "SLOT 1,000G 베팅으로 30,000G 이상 벌기 + 도움주기 코너에서 {race} 종족 비시즌 참가자 도움주기", bet: 1000, win: 30000 }
];
// 👔 promotion request: 1 month after joining (and 1 month after a failed try)
export const PROMO_WAIT_DAYS = 30;
export const STAGE_LABEL = (co, i) => co.stages.length === 2 ? ["1차 서류심사", "최종 인터뷰"][i] : co.stages[i] === "test" ? "2차 Arizal Tech Test" : ["1차 서류심사", "2차 인터뷰", "3차 최종 인터뷰"][i];
// 🧪 Arizal Tech Test: 60 s, bets of 100~300G only, win 10,000G or more (wins added up)
export const ARIZAL_TEST = { sec: 60, min: 100, max: 300, goal: 10000 };

// ---------------------------------------------------------------- 🏦 bank additions
export const LOAN_ERASE = { id: "loan_erase", gold: 50000 };
export const ACCOUNT_PRODUCTS = [
    { id: "biz_benefit", name: "비즈니스 전용 계좌 혜택", emoji: "🏪", gold: 100000, rate: 0.05, every: 3, need: "biz", desc: "계좌를 Self-Business와 연동한 플레이어 전용 · 구입 즉시 3라운드마다 계좌에 5% 이자" },
    { id: "emp_benefit", name: "취업 전용 계좌 혜택", emoji: "💼", gold: 50000, rate: 0.03, every: 3, need: "emp", desc: "계좌를 취업 코너(회사 급여)와 연동한 플레이어 전용 · 구입 즉시 3라운드마다 계좌에 3% 이자" }
];
if (!ITEM_BY_ID.loan_erase) {
    const it = { id: "loan_erase", name: "대부기록 삭제권", emoji: "🧾", bank: true, desc: "대출을 못 갚았거나 갚았어도 남아 있는 대출 이용 기록을 삭제합니다. 계좌 개설 때 대출 심사의 영향을 받지 않습니다 (🎒 인벤토리에서 사용 · 계좌 신청 때 자동 사용)." };
    ITEMS.push(it); ITEM_BY_ID[it.id] = it;
}
