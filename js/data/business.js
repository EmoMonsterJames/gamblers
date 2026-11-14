// =====================================================================
// 🏦 Business Bank + 🏪 Self-Business — definitions only.
// State (accounts, businesses, transfers, reports) lives in Store.bank,
// rules in game/bank.js, screens in screens/bank.js · business.js.
//
// A business type:
//   price (gold) + pts · max (open at once) · emoMin (EmoMon owned) · rank (any season's TOP N) · nation (5% off)
//   listed: maps whose 🏪 Self-Business corner sells it
//   open:   [{ region, tax, maps: "all" | [locIds] }] — where it can run
//   entry:  { fee, chance } (chance < 1 → the door may refuse; the fee is kept)
//   cut:    share of every menu sale sent to the owner's account
//   menu:   [{ id, name, emoji, hp | "full" }] (eaten on the spot)
//           or market: [{ cat, id }] — goods for the bag at shop price +5%,
//           one random pick per player per round
// =====================================================================
import { SHOPS } from "./catalog.js";
import { emoItem } from "../emomon/data.js";
import { saleOf } from "./catalogAdmin.js";

export const BANK_FEE = 1000;           // entry to the bank
export const BANK_OPEN_CHANCE = 0.6;    // 3rd review step
export const BANK_SHOP = [
    { id: "fast_transfer", gold: 30000 },
    { id: "extra_transfer", pts: 300 },
    { id: "remote_bank", pts: 500 }
];
export const BIZ_SHOP = [
    { id: "biz_move", gold: 100000 },
    { id: "biz_trend", gold: 5000 },
    { id: "biz_remote", gold: 500000 },
    { id: "biz_close", gold: 10000 }
];
// Business Gold → gold. An amount goes in the tier whose range holds it.
export const TX_TIERS = [
    { id: "t1", min: 1, max: 10000, rate: 0.05, label: "10,000 BG 이하" },
    { id: "t2", min: 10001, max: 50000, rate: 0.10, label: "10,001 ~ 50,000 BG" },
    { id: "t3", min: 50001, max: 100000, rate: 0.15, label: "50,001 ~ 100,000 BG" },
    { id: "t4", min: 100001, max: 1000000, rate: 0.20, label: "100,001 ~ 1,000,000 BG" }
];
export const TX_FREE_PER_SEASON = 1;
export const TX_EXTRA_MAX = 3;
export const TX_MIN_ALIVE = 4; // 3 or fewer players left → only the fast transfer works
export const TX_DELAY_ROUNDS = 2; // paid when this round and the next one are over

const R = (region, tax, maps = "all") => ({ region, tax, maps });
const ALL_REGIONS = ["cl1", "cl2", "sky", "space", "fantasy", "under", "spooky", "deepsea", "arctic", "randomland", "richland", "noslot", "nocasino", "npcland", "combo"];

export const BIZ_TYPES = {
    icecream: { id: "icecream", name: "Ice Cream Shop", ko: "아이스크림 가게", emoji: "🍦", color: "#f9a8d4", price: 300000, pts: 30, max: 3, rank: 6,
        listed: ["riches", "twins", "blackout", "plaza"],
        open: [R("cl1", 8000), R("cl2", 8000), R("fantasy", 8000), R("arctic", 10000), R("richland", 10000), R("combo", 5000)],
        entry: { fee: 300, chance: 1 }, cut: 0.048,
        menu: [
            { id: "popsicle", name: "Popsicle", emoji: "🍡", hp: 20, price: 16750 },
            { id: "sundae", name: "Sundae", emoji: "🍨", hp: 50, price: 44790 },
            { id: "scoop", name: "Ice Cream Scoop", emoji: "🍧", hp: 5, price: 4120 },
            { id: "cone", name: "Ice Cream Cone", emoji: "🍦", hp: 10, price: 8630 },
            { id: "cake", name: "Ice Cream Cake", emoji: "🎂", hp: "full", price: 90040 }] },
    marshall: { id: "marshall", name: "Marshall Tea", ko: "마샬티 가게", emoji: "🍵", color: "#a3e635", price: 100000, pts: 10, max: 5, rank: 10, nation: "Emo World",
        listed: ["highlimit", "emo", "emo2"],
        open: [R("space", 5000), R("cl1", 30000, ["twins", "dungtown", "noluck"]), R("npcland", 5000), R("under", 20000, ["blackout"])],
        entry: { fee: 100, chance: 0.7 }, cut: 0.045,
        menu: [
            { id: "biscuit", name: "Marshall Biscuit", emoji: "🍪", hp: 10, price: 8020 },
            { id: "tea", name: "Marshall Tea", emoji: "🍵", hp: 30, price: 22970 }] },
    kimchi: { id: "kimchi", name: "Bosongi Kimchi", ko: "보송이김치 상점", emoji: "🥬", color: "#ef4444", price: 100000, pts: 10, max: 5, rank: 10, nation: "Emo World",
        listed: ["wealthy", "graveyard", "bubble", "seaside"],
        open: [R("sky", 5000), R("cl2", 30000, ["gambleables", "ribbit", "emo2"]), R("combo", 5000), R("cl1", 30000, ["noluck"])],
        entry: { fee: 100, chance: 0.7 }, cut: 0.045,
        menu: [
            { id: "mini", name: "미니 보송이 김치", emoji: "🫙", hp: 10, price: 8040 },
            { id: "kimchi", name: "보송이 김치", emoji: "🥬", hp: 30, price: 23450 }] },
    kkomeal: { id: "kkomeal", name: "Kkomeal", ko: "꼬밀", emoji: "🍱", color: "#fbbf24", price: 100000, pts: 10, max: 5, rank: 10, nation: "MJ World",
        listed: ["mj2", "mj", "odd_casino", "slots_only"],
        // 'Rainbow Casino' sits in 판타지랜드, so it is opened with the 판타지랜드 tax
        open: [R("deepsea", 8000), R("npcland", 5000), R("randomland", 20000, ["crazy_casino"]), R("fantasy", 30000, ["magic", "rainbow"])],
        entry: { fee: 100, chance: 0.7 }, cut: 0.045,
        menu: [
            { id: "sample", name: "꼬밀 샘플", emoji: "🥄", hp: 10, price: 8960 },
            { id: "kit", name: "꼬밀 밀키트", emoji: "🍱", hp: 30, price: 25070 }] },
    cafe: { id: "cafe", name: "Cafe", ko: "까페", emoji: "☕", color: "#b45309", price: 300000, pts: 30, max: 2, rank: 6,
        listed: ["sky_bridge", "foggy", "blackwater", "diamond_casino"],
        open: [R("cl1", 8000), R("cl2", 8000), R("under", 8000), R("deepsea", 10000), R("randomland", 10000), R("npcland", 5000)],
        entry: { fee: 300, chance: 1 }, cut: 0.048,
        menu: [
            { id: "refresh", name: "Refreshment", emoji: "🧃", hp: 20, price: 16850 },
            { id: "coffee", name: "Coffee", emoji: "☕", hp: 50, price: 43790 },
            { id: "roastery", name: "Fine Roastery Coffee", emoji: "🫘", hp: "full", price: 92040 }] },
    juice: { id: "juice", name: "Transparent Juice", ko: "투명쥬스", emoji: "🥤", color: "#7dd3fc", price: 100000, pts: 10, max: 5, rank: 10, nation: "Foggy Nation",
        listed: ["balloon", "weird_casino", "foggy", "ghost", "dracula"],
        open: [R("sky", 8000), R("spooky", 30000, ["spooky", "ghost"]), R("combo", 5000), R("fantasy", 30000, ["magic"])],
        entry: { fee: 100, chance: 0.7 }, cut: 0.045,
        menu: [
            { id: "s", name: "투명주스 (미니)", emoji: "🥛", hp: 5, price: 4760 },
            { id: "m", name: "투명주스 (미디엄)", emoji: "🧋", hp: 15, price: 13070 },
            { id: "l", name: "투명주스 (라지)", emoji: "🥤", hp: 30, price: 26070 }] },
    noodles: { id: "noodles", name: "Ant Leaf Noodles Shop", ko: "개밋잎국수", emoji: "🍜", color: "#84cc16", price: 100000, pts: 10, max: 5, rank: 10, nation: "Ground Town",
        listed: ["ground2", "underground", "western", "colosseum", "redblue"],
        open: [R("under", 8000, ["dungeon", "ground2"]), R("cl1", 30000, ["ground"]), R("combo", 6000), R("noslot", 20000, ["picky"])],
        entry: { fee: 100, chance: 0.7 }, cut: 0.045,
        menu: [
            { id: "sample", name: "개밋잎국수 (샘플)", emoji: "🥢", hp: 10, price: 8410 },
            { id: "bowl", name: "개밋잎국수", emoji: "🍜", hp: 30, price: 26970 }] },
    minimarket: { id: "minimarket", name: "Mini Market", ko: "미니마켓", emoji: "🏪", color: "#38bdf8", price: 500000, pts: 50, max: 2, rank: 3,
        listed: ["goldbar", "highroller", "downtown", "combo_town", "random_casino"],
        open: ALL_REGIONS.map(r => R(r, 20000)),
        entry: { fee: 500, chance: 1 }, cut: 0.05,
        market: [{ cat: "item", id: "hp_50" }, { cat: "item", id: "map_random" }, { cat: "weapon", id: "punch" }, { cat: "pet", id: "poop" }] },
    greens: { id: "greens", name: "Puseonggui Greens Shop", ko: "푸성귀 가게", emoji: "🌿", color: "#22c55e", price: 100000, pts: 10, max: 5, rank: 10, nation: "Dung Town",
        listed: ["dungtown", "magic", "beggar_shelter", "dove"],
        open: [R("cl2", 30000, ["dung2"]), R("randomland", 30000, ["plaza"]), R("combo", 5000), R("deepsea", 20000, ["bubble"])],
        entry: { fee: 100, chance: 0.75 }, cut: 0.045,
        menu: [
            { id: "jji", name: "찌", emoji: "🌱", hp: 5, price: 4610 },
            { id: "greens", name: "푸성귀", emoji: "🥬", hp: 30, price: 25970 }] },
    cookie: { id: "cookie", name: "Shape Cookie", ko: "도형쿠키", emoji: "🍪", color: "#f59e0b", price: 100000, pts: 10, max: 5, rank: 10, nation: "Polynesia",
        listed: ["poly2", "stars", "space_center", "wealthy", "super"],
        open: [R("cl1", 30000, ["poly"]), R("arctic", 30000, ["ice"]), R("npcland", 5000), R("randomland", 20000, ["odd_casino"])],
        entry: { fee: 100, chance: 0.7 }, cut: 0.045,
        menu: [
            { id: "circle", name: "동그라미쿠키", emoji: "⚪", hp: 5, price: 4860 },
            { id: "tri", name: "세모쿠키", emoji: "🔺", hp: 15, price: 12070 },
            { id: "square", name: "네모쿠키", emoji: "🟧", hp: 30, price: 27070 }] },
    lounge: { id: "lounge", name: "Luxury Lounge", ko: "고급 라운지", emoji: "🥂", color: "#c084fc", price: 500000, pts: 50, max: 2, rank: 3,
        listed: ["diamond_casino", "twins", "graveyard", "sky_pond", "death_casino"],
        open: ALL_REGIONS.map(r => R(r, 20000)),
        entry: { fee: 500, chance: 1 }, cut: 0.05,
        market: [{ cat: "item", id: "hp_full" }, { cat: "item", id: "random_letter" }, { cat: "item", id: "super_letter" }, { cat: "weapon", id: "kick" }, { cat: "frame", id: "frame_gold" }] },
    // 🐾 monster goods at the admin's Monster item price +5% (cat "emo" → EmoMon bag)
    emomart: { id: "emomart", name: "EmoMon Mini Market", ko: "이모몬 미니마켓", emoji: "🐾", color: "#34d399", price: 500000, pts: 50, max: 3, rank: 6, emoMin: 2,
        listed: ["wingers", "spacetown", "rainbow", "spooky", "shipwreck", "possibility"],
        open: ALL_REGIONS.map(r => R(r, 20000)),
        entry: { fee: 500, chance: 1 }, cut: 0.05,
        market: [{ cat: "emo", id: "EMO_HP10" }, { cat: "emo", id: "EMO_HP50" }, { cat: "emo", id: "EMO_PP" }, { cat: "emo", id: "ITEM001" }, { cat: "emo", id: "ITEM002" }] },
    // 🏥 a clinic: no fee, but the door only lets 40% in; one treatment per round
    clinic: { id: "clinic", name: "Player Clinic", ko: "플레이어 클리닉", emoji: "🏥", color: "#f87171", price: 500000, pts: 50, max: 3, rank: 6,
        listed: ["games_only", "noc_casino", "sky_tower", "evil_town", "deep_ocean", "super"],
        open: ALL_REGIONS.map(r => R(r, 20000)),
        entry: { fee: 0, chance: 0.4 }, cut: 0.0001,
        menu: [
            { id: "hp10", name: "HP +10 회복", emoji: "🩹", hp: 10, price: 12000 },
            { id: "hp50", name: "HP +50 회복", emoji: "💉", hp: 50, price: 43000 },
            { id: "full", name: "Full HP 회복", emoji: "❤️‍🩹", hp: "full", price: 100000 }] }
};
export const BIZ_LIST = Object.values(BIZ_TYPES);

// market goods: the normal shop price + 5% (read live, so admin price changes count)
export const MARKUP = 1.05;
export function shopPrice(cat, id) {
    // the admin's price first (상품 관리), then the built-in gold shop price
    const s = saleOf(cat, id);
    if (s.price && s.cur === "G") return s.price;
    for (const s of Object.values(SHOPS)) {
        if (s.cur && s.cur !== "G") continue;
        const it = s.list.find(x => x.cat === cat && x.id === id);
        if (it?.price) return it.price;
    }
    return null;
}
// cat "emo": the admin's Monster item price (gold) — a points-priced item is not sold here
export const marketPrice = g => {
    const p = g.cat === "emo" ? (emoItem(g.id)?.pts ? null : emoItem(g.id)?.gold) : shopPrice(g.cat, g.id);
    return p ? Math.round(p * MARKUP / 10) * 10 : null;
};
// purchase price text: "500,000 G + 50 P"
export const bizPriceText = (gold, pts) => `${gold.toLocaleString()} G${pts ? ` + ${pts} P` : ""}`;
