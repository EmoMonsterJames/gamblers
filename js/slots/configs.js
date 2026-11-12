import { NEW_MAPS, mapSlots, slotIdOf, RULE_REGIONS, seed01 } from "../data/regions.js";
import { SPECIAL_SLOTS } from "./specialConfigs.js";
// =====================================================================
// Slot machine definitions (one per casino, no duplicates).
// Symbols: e = emoji, img = image path. pay = [3,4,5 of a kind] in bet
// multiples per way; px is the RTP scale found by simulation (tools/rtp).
// Special symbols: W wild, F free-spin scatter, P points, C hold coin,
// M meter symbol (M1/M2/M3 for Bonanza), R wheel, X jackpot pick.
// =====================================================================
const CARDS = {
    A: { e: "A", card: true, pay: [0.1, 0.25, 0.6] },
    K: { e: "K", card: true, pay: [0.1, 0.25, 0.6] },
    Q: { e: "Q", card: true, pay: [0.08, 0.2, 0.5] },
    J: { e: "J", card: true, pay: [0.08, 0.2, 0.5] },
    T: { e: "10", card: true, pay: [0.06, 0.15, 0.4] }
};
const CARD_W = { A: 6, K: 6, Q: 6.5, J: 6.5, T: 7 };
const JP4 = { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { seed: 15000, rate: 0.012 }, GRAND: { seed: 500000, rate: 0.025, cap: 1000000 } };
const COIN = { v: ["0.5", "1", "2", "3", "5", "8", "10", "20", "MINI", "MINOR", "MAJOR"], w: [25, 25, 18, 12, 9, 5, 3, 1.5, 1.2, 0.3, 0.05] };
const BETS = [100, 200, 300, 500, 1000];

function video(c) {
    const syms = { ...CARDS };
    const w = { ...CARD_W };
    c.highs.forEach((h, i) => {
        const key = "H" + (i + 1);
        syms[key] = { e: h.e, img: h.img, name: h.name, pay: h.pay || [[0.6, 2, 6], [0.5, 1.5, 4], [0.4, 1.2, 3]][i] };
        w[key] = h.w || [3, 3.5, 4][i];
    });
    c.lows.forEach((l, i) => {
        const key = "L" + (i + 1);
        syms[key] = { e: l.e, img: l.img, name: l.name, pay: l.pay || [[0.25, 0.6, 1.6], [0.2, 0.5, 1.3]][i] };
        w[key] = l.w || [5, 5.5][i];
    });
    return {
        engine: "video", reels: 5, rows: 3, bets: BETS, maxX: 5000, jp: JP4, px: 1,
        ...c, syms, w: { ...w, ...(c.w || {}) }
    };
}

export const SLOTS = [
    // ------------------------------------------------ Classic (non-progressive)
    {
        id: "money_mesh", name: "Money Mesh", brand: "Classic Gaming", engine: "classic", progressive: false,
        desc: "고전 3릴 슬롯. 휠 x3 = 휠 보너스(최대 20배), 7-7-7 = 무료게임 7회, 돈보따리 x3 = 매칭 픽, 그리고 갑자기 NUDGE!",
        bets: [100, 200, 300, 500], px: 1,
        theme: { bg: "linear-gradient(180deg,#3b0a0a,#120202)", accent: "#ff3b3b", glow: "#ffcc00", font: "'Rye', serif" },
        look: { "7": { e: "7", cls: "sym-seven" }, B3: { e: "BAR\nBAR\nBAR", cls: "sym-bar" }, B2: { e: "BAR\nBAR", cls: "sym-bar" }, B1: { e: "BAR", cls: "sym-bar" },
                CH: { e: "🍒" }, WH: { img: "images/slots/wheel.svg", name: "WHEEL" }, BG: { img: "images/slots/money-bag.svg", name: "Money Bag" }, P: { e: "P", cls: "sym-p" }, _: { e: "" } },
        w: { "7": 3, B3: 4, B2: 6, B1: 9, CH: 7, WH: 2.5, BG: 2.5, _: 14 },
        wFree: { "7": 4, B3: 6, B2: 7 },
        pays: { "7": 10, B3: 20, B2: 10, B1: 5, CH: 4, ANYBAR: 1.5, CH2: 1, CH1: 0.5 },
        features: {
            wheel: { p: 0.010, seg: ["2", "3", "5", "8", "10", "15", "20", "4", "6", "2", "3", "5"], w: [16, 14, 11, 7, 5, 2, 1, 12, 9, 16, 14, 11] },
            free: { p: 0.006, spins: 7, wheelP: 0.06 },
            pick: { p: 0.010, prizes: ["3", "5", "7", "10", "WHEEL"], w: [40, 26, 16, 8, 10] },
            nudge: { p: 0.02 }
        }
    },
    // ------------------------------------------------ Coin-Pigglet's Coin
    video({
        id: "coin_pigglet", name: "Coin-Pigglet's Coin", brand: "Scrooge-Slots", progressive: true,
        desc: "코인피글렛이 동전을 삼키며 커지다가 펑! PIGGY BREAK = 코인 3개 매칭(MINI x2 · MINOR x2 포함, MINI~GRAND), 동전 6개 이상 = Hold & Spin, FREE 3개 = 8 무료게임(x2).",
        theme: { bg: "linear-gradient(180deg,#ffb3c7,#7a1840)", accent: "#ff5c8a", glow: "#ffd34d", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🐷", name: "Pigglet" }, { e: "💰", name: "Money Sack" }, { e: "🏦", name: "Bank" }], lows: [{ e: "🌽" }, { e: "🥕" }],
        wild: { e: "🐽", name: "WILD", w: [0, 4, 4, 4, 0], wFree: [0, 7, 7, 7, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, C: { e: "🪙", name: "Coin" }, M: { img: "images/slots/piggy-full.svg", name: "Coin-Pigglet" } },
        meter: { kind: "piggy", max: 12, p: 0.075, onFull: "pick", title: "💥 PIGGY BREAK! 💥", pickTw: { MINI: 42, MINOR: 24, MAJOR: 12, GRAND: 0.5, MINI_X2: 14, MINOR_X2: 8 } },
        omens: [{ fx: "text", text: "🐷 꿀꿀… 배가 터질 것 같아! 🐷" }, { fx: "rain", chars: ["🪙", "🪙", "💰"] }, { fx: "burst", icon: "🐷", chars: ["🪙"] }],
        tests: [["free", "8 무료게임"], ["hold", "Hold & Spin"], ["meter", "PIGGY BREAK (3개 매칭)"]],
        features: {
            free: { p: 0.0075, spins: 8, mult: 2, retrigger: 0.03, retriggerSpins: 5 },
            hold: { p: 0.008, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 }
        }
    }),
    // ------------------------------------------------ FuFu Firecracker (high limit)
    video({
        id: "fufu", name: "FuFu Firecracker", brand: "DAEBAK", progressive: true, bets: [500, 1000, 2000, 5000], maxX: 10000,
        desc: "福가 행운을 부른다! 폭죽 퓨즈가 가득 차 터지면 FIRECRACKER MATCH(3개 매칭 잭팟 픽) · GROW REELS(6 무료스핀, 릴이 커짐) · HOLD & SPIN 중 하나. 복주머니 3/4/5개 = 8/10/12 무료스핀.",
        theme: { bg: "linear-gradient(180deg,#b3001b,#3a0008)", accent: "#ffcc00", glow: "#ff3b3b", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🐉", name: "Dragon" }, { e: "🏮", name: "Lantern" }, { e: "🧧", name: "Red Envelope" }], lows: [{ e: "🍊" }, { e: "🥟" }],
        wild: { img: "images/slots/fu-wild.svg", name: "福 WILD", w: [0, 4, 4, 4, 0], wFree: [0, 7, 7, 7, 0] },
        look: { F: { img: "images/slots/lucky-pouch.svg", name: "Lucky Pouch" }, C: { img: "images/slots/fu.svg", name: "福 Coin" }, M: { img: "images/slots/firecracker.svg", name: "Firecracker" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { seed: 100000, rate: 0.015 }, GRAND: { seed: 500000, rate: 0.025, cap: 1000000 } },
        meter: { kind: "fuse", max: 20, p: 0.11, addPerSym: true, onFull: "pick", onFullW: { pick: 34, grow: 33, hold: 33 }, title: "🧨 FUSE LIT! 🧨", pickTitle: "🎆 FIRECRACKER MATCH 🎆" },
        omens: [{ fx: "text", text: "🧧 福이 들어온다… 🧧" }, { fx: "rain", chars: ["🧨", "🎆", "🎇"] }, { fx: "burst", icon: "🐉", chars: ["🧧", "🪙"] }],
        tests: [["free", "무료스핀"], ["meter:pick", "폭죽 → 3개 매칭 픽"], ["meter:grow", "폭죽 → GROW REELS"], ["meter:hold", "폭죽 → Hold & Spin"]],
        features: {
            free: { p: 0.007, byCount: [8, 10, 12], mult: 1, retrigger: 0.02, retriggerSpins: 4 },
            hold: { p: 0.0, trigger: 6, start: 4, coin: COIN, land: 0.08, lives: 3 },
            grow: { spins: 6, pGrow: 0.55, max: 6 },
            pick: { p: 0, title: "🎆 FIRECRACKER MATCH 🎆", tw: { MINI: 56, MINOR: 30, MAJOR: 9, GRAND: 0.3 } }
        }
    }),
    // ------------------------------------------------ Samurai Cash
    video({
        id: "samurai_cash", name: "Samurai Cash", brand: "YG GAMING", progressive: true, bets: [100, 200, 300, 400, 500],
        desc: "센세이가 지키는 금 주머니. 센세이가 나올 때마다 동전이 쌓이다가 BAG BURST! → HOLD & SPIN (잭팟 코인 등장, 잭팟금 수령). 센세이 3개 = 코인 픽, 휠 3개 = 사무라이 휠.",
        theme: { bg: "linear-gradient(180deg,#1b1b3a,#05050f)", accent: "#e11d48", glow: "#fbbf24", font: "'Rye', serif" },
        highs: [{ e: "🥷", name: "Ninja" }, { e: "🏯", name: "Castle" }, { e: "🎎", name: "Dolls" }], lows: [{ e: "🍡" }, { e: "🍵" }],
        wild: { img: "images/slots/katana-wild.svg", name: "Katana WILD", w: [0, 5, 5, 5, 0] },
        look: { M: { e: "🧘", name: "Sensei" }, X: { e: "🧘", name: "Sensei" }, R: { img: "images/slots/wheel.svg", name: "Samurai Wheel" }, C: { e: "🪙", name: "Koban Coin" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { seed: 8000, rate: 0.012 }, GRAND: { seed: 500000, rate: 0.02, cap: 1000000 } },
        meter: { kind: "bag", max: 20, p: 0.10, addPerSym: true, onFull: "hold", title: "💰 THE BAG BURST! 💰" },
        omens: [{ fx: "text", text: "⚔️ 센세이의 기운이 느껴진다… ⚔️" }, { fx: "wind", chars: ["🌸", "🌸", "🪙"] }, { fx: "burst", icon: "🧘", chars: ["🪙", "💰"] }],
        tests: [["meter", "BAG BURST → Hold & Spin"], ["pick", "센세이 코인 픽"], ["wheel", "사무라이 휠"]],
        features: {
            hold: { p: 0, trigger: 6, start: 6, coin: { v: ["0.5", "1", "2", "3", "5", "8", "10", "20", "MINI", "MINOR", "MAJOR", "GRAND"], w: [24, 24, 18, 12, 9, 5, 3, 1.5, 2.2, 0.7, 0.12, 0.01] }, land: 0.075, lives: 3 },
            pick: { p: 0.004, sym: true, title: "🧘 SENSEI COIN PICK 🧘", tw: { MINI: 60, MINOR: 28, MAJOR: 6, GRAND: 0.2 } },
            wheel: { p: 0.008, sym: true, seg: ["MINI", "5", "10", "8", "MINOR", "15", "5", "25", "10", "50", "8", "20"], w: [10, 16, 11, 13, 4, 8, 16, 4, 11, 1.5, 13, 5] }
        }
    }),
    // ------------------------------------------------ Bonanza Meter
    video({
        id: "bonanza", name: "Bonanza Meter", brand: "Scrooge-Slots", progressive: true,
        desc: "눈 속의 온도계 3개를 채워라! 1~3개가 동시에 터지는 Hold & Spin — So Hot(모든 코인 한번에 수집) · So Extra(주변 코인 상금 부스트) · So Cold(주변 코인 x2~x5). 얼음에 갇힌 줄은 🔨 망치가 나올 때마다 한 줄씩 깨진다! 펭귄 휠, 8 무료스핀, 잭팟 5종(MAXI 포함).",
        theme: { bg: "linear-gradient(180deg,#bde7ff,#1e3a8a)", accent: "#38bdf8", glow: "#ffffff", font: "'Lilita One', sans-serif" },
        highs: [{ e: "⛄", name: "Snowman" }, { e: "🐧", name: "Penguin" }, { e: "🦭", name: "Seal" }], lows: [{ e: "🧊" }, { e: "🧣" }],
        wild: { img: "images/slots/snow-wild.svg", name: "Snow WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, M1: { img: "images/slots/thermo-red.svg", name: "So Hot" }, M2: { img: "images/slots/thermo-yellow.svg", name: "So Extra" }, M3: { img: "images/slots/thermo-blue.svg", name: "So Cold" }, R: { img: "images/slots/penguin.svg", name: "Penguin Wheel" }, C: { img: "images/slots/snow-coin.svg", name: "Snow Coin" }, HAMMER: { img: "images/slots/hammer.svg", name: "Ice Hammer" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: 15000, rate: 0.012 }, GRAND: { seed: 500000, rate: 0.025, cap: 1000000 } },
        meter: { kind: "thermo", max: 15, p: 0.06, chain: 0.6 },
        omens: [{ fx: "text", text: "❄️ 눈보라가 몰려온다… ❄️" }, { fx: "wind", chars: ["❄️", "❄️", "🧊"] }, { fx: "burst", icon: "🐧", chars: ["🧊", "🪙"] }],
        tests: [["free", "8 무료스핀"], ["wheel", "펭귄 휠"], ["thermo:hot", "SO HOT Hold & Spin"], ["thermo:extra", "SO EXTRA Hold & Spin"], ["thermo:cold", "SO COLD Hold & Spin"], ["thermo:hot+cold", "2개 동시 (HOT + COLD)"], ["thermo:all", "3개 동시"], ["thermo:all:hammer", "3개 동시 + 망치 많이"]],
        features: {
            free: { p: 0.007, spins: 8, mult: 1, retrigger: 0.03, retriggerSpins: 4 },
            hold: { p: 0, trigger: 6, start: 6, coin: { v: ["0.2", "0.4", "0.6", "1", "1.5", "2.5", "5", "MINI", "MINOR", "MAXI", "MAJOR"], w: [25, 25, 18, 12, 8, 4, 2, 1.2, 0.35, 0.08, 0.02] }, land: 0.08, lives: 3, ice: { rows: 3, hammer: 0.14 } },
            wheel: { p: 0.006, sym: true, seg: ["5", "HOTx", "10", "3", "EXTRAx", "MINI", "8", "20", "COLDx", "5", "MINOR", "15"].map(s => s.endsWith("x") ? "12" : s), w: [10, 6, 8, 10, 6, 4, 8, 5, 6, 9, 2, 6] }
        }
    }),
    // ------------------------------------------------ Clover Luck
    video({
        id: "clover_luck", name: "Clover Luck", brand: "CLOVER-TECH", progressive: true, bets: [100, 200, 400, 800, 1000],
        desc: "릴 위의 클로버 코인 칸 3개를 채우면 그 릴 전체가 WILD! (코인은 다음 플레이어에게 이어짐). 잭팟 코인 3개 = 복주머니 픽, FREE 3개 = 와일드 릴 8 무료게임.",
        theme: { bg: "linear-gradient(180deg,#0f5132,#04140c)", accent: "#22c55e", glow: "#facc15", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🧚", name: "Fairy" }, { e: "🌈", name: "Rainbow" }, { e: "🎩", name: "Top Hat" }], lows: [{ e: "🍀" }, { e: "🍺" }],
        wild: { img: "images/slots/rainbow-wild.svg", name: "Rainbow WILD", w: [0, 3, 3, 3, 0] },
        look: { F: { img: "images/slots/leprechaun.svg", name: "Leprechaun" }, M: { img: "images/slots/lep-coin.svg", name: "Clover Coin" }, X: { img: "images/slots/jp-coin.svg", name: "Jackpot Coin" } },
        meter: { kind: "reelcoins", max: 3, p: 0.025 },
        features: {
            free: { p: 0.0075, spins: 8, mult: 1, wildReels: 0.25 },
            pick: { p: 0.0045, sym: true, title: "🍀 LEPRECHAUN'S POUCH 🍀", tw: { MINI: 52, MINOR: 30, MAJOR: 14, GRAND: 0.3 } }
        }
    }),
    // ------------------------------------------------ new machines
    video({
        id: "pearl_tide", name: "Pearl Tide", brand: "CLOUD GAMING", progressive: true,
        desc: "파도가 진주를 실어온다! 진주 6개 이상 = Hold & Spin, FREE 3개 = 10 무료스핀(x2).",
        theme: { bg: "linear-gradient(180deg,#5eead4,#0c4a6e)", accent: "#22d3ee", glow: "#f0abfc", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🧜", name: "Mermaid" }, { e: "🐬", name: "Dolphin" }, { e: "🐙", name: "Octopus" }], lows: [{ e: "🐚" }, { e: "🦀" }],
        wild: { e: "🌊", name: "WAVE WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, C: { e: "🦪", name: "Pearl" } },
        features: {
            free: { p: 0.0075, spins: 10, mult: 2 },
            hold: { p: 0.0095, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 }
        }
    }),
    video({
        id: "golden_dung", name: "Golden Dung", brand: "IPEX", progressive: true,
        desc: "황금 응가 항아리를 가득 채우면 행운의 휠! 왕관 응가 3개 = 휠, 동전 6개 = Hold & Spin.",
        theme: { bg: "linear-gradient(180deg,#a16207,#291503)", accent: "#facc15", glow: "#fde68a", font: "'Lilita One', sans-serif" },
        highs: [{ e: "👑", name: "Crown" }, { e: "💎", name: "Diamond" }, { e: "🏆", name: "Trophy" }], lows: [{ e: "🧻" }, { e: "🪠" }],
        wild: { e: "💩", name: "DUNG WILD", w: [0, 4, 4, 4, 0], cls: "sym-gold" },
        look: { R: { img: "images/slots/wheel.svg", name: "Dung Wheel" }, C: { e: "🪙", name: "Gold Coin" }, M: { e: "💩", name: "Golden Dung", cls: "sym-gold" } },
        meter: { kind: "jar", max: 15, p: 0.06, onFull: "wheel", title: "🏺 JAR FULL! 🏺" },
        features: {
            wheel: { p: 0.007, sym: true, seg: ["5", "10", "MINI", "8", "20", "5", "MINOR", "12", "50", "6", "MAJOR", "15"], w: [16, 10, 5, 12, 5, 16, 2.5, 8, 1.2, 14, 0.25, 7] },
            hold: { p: 0.008, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 }
        }
    }),
    video({
        id: "rabbit_rush", name: "Rabbit Rush", brand: "Rabbit-Gaming", progressive: true,
        desc: "달토끼의 질주! 보름달 3개 = 잭팟 픽, FREE 3개 = 8 무료스핀(와일드 릴).",
        theme: { bg: "linear-gradient(180deg,#312e81,#0b0a24)", accent: "#c084fc", glow: "#fef08a", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🐰", name: "Moon Rabbit" }, { e: "🥕", name: "Carrot" }, { e: "🍡", name: "Rice Cake" }], lows: [{ e: "🌙" }, { e: "⭐" }],
        wild: { e: "🐇", name: "RUSH WILD", w: [0, 4, 4, 4, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, X: { e: "🌕", name: "Full Moon" } },
        features: {
            free: { p: 0.008, spins: 8, mult: 1, wildReels: 0.3 },
            pick: { p: 0.005, sym: true, title: "🌕 FULL MOON PICK 🌕", tw: { MINI: 55, MINOR: 30, MAJOR: 12, GRAND: 0.3 } }
        }
    }),
    video({
        id: "tiki_volcano", name: "Tiki Volcano", brand: "HYHG GAMING", progressive: true,
        desc: "티키 화산의 용암 게이지가 가득 차면 분화! Hold & Spin. FREE 3개 = 8 무료스핀(x2).",
        theme: { bg: "linear-gradient(180deg,#ea580c,#2a0a02)", accent: "#fb923c", glow: "#fde047", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🗿", name: "Tiki" }, { e: "🌋", name: "Volcano" }, { e: "🍍", name: "Pineapple" }], lows: [{ e: "🥥" }, { e: "🌺" }],
        wild: { e: "🔥", name: "LAVA WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, C: { e: "🪙", name: "Lava Coin" }, M: { e: "🌋", name: "Lava" } },
        meter: { kind: "jar", max: 15, p: 0.06, onFull: "hold", title: "🌋 ERUPTION! 🌋" },
        features: {
            free: { p: 0.0075, spins: 8, mult: 2 },
            hold: { p: 0.006, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 }
        }
    }),
    video({
        id: "ant_hill", name: "Ant Hill Gold", brand: "BLK", progressive: true,
        desc: "개미굴 깊은 곳의 꿀단지! 꿀단지 6개 = Hold & Spin, 여왕개미 3개 = 잭팟 픽.",
        theme: { bg: "linear-gradient(180deg,#65a30d,#1a2e05)", accent: "#a3e635", glow: "#fbbf24", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🐜", name: "Ant" }, { e: "🍯", name: "Honey" }, { e: "🍃", name: "Leaf" }], lows: [{ e: "🌰" }, { e: "🍄" }],
        wild: { e: "🌳", name: "TREE WILD", w: [0, 4, 4, 4, 0] },
        look: { C: { e: "🍯", name: "Honey Pot" }, X: { e: "👸", name: "Queen Ant" } },
        features: {
            hold: { p: 0.0095, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 },
            pick: { p: 0.0045, sym: true, title: "👸 QUEEN'S TREASURE 👸", tw: { MINI: 55, MINOR: 30, MAJOR: 12, GRAND: 0.3 } }
        }
    }),
    video({
        id: "ghost_vault", name: "Ghost Vault", brand: "BLK", progressive: true,
        desc: "안개 속 유령 금고. 수정구 3개 = 유령 휠, FREE 3개 = 10 무료스핀.",
        theme: { bg: "linear-gradient(180deg,#334155,#020617)", accent: "#a5b4fc", glow: "#86efac", font: "'Creepster', cursive" },
        highs: [{ e: "👻", name: "Ghost" }, { e: "🕯️", name: "Candle" }, { e: "🦇", name: "Bat" }], lows: [{ e: "🕸️" }, { e: "🎃" }],
        wild: { e: "💀", name: "SKULL WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, R: { e: "🔮", name: "Crystal Ball" } },
        features: {
            free: { p: 0.0075, spins: 10, mult: 1 },
            wheel: { p: 0.008, sym: true, seg: ["5", "MINI", "8", "15", "5", "MINOR", "10", "30", "6", "MAJOR", "12", "20"], w: [16, 5, 12, 6, 16, 2.5, 10, 2, 14, 0.25, 9, 4] }
        }
    }),
    video({
        id: "dragon_hoard", name: "Dragon Hoard", brand: "HYHG GAMING", progressive: true,
        desc: "용의 보물창고! 여의주 6개 = Hold & Spin, FREE 3개 = 8 무료스핀(x2), 용의 눈 3개 = 잭팟 픽.",
        theme: { bg: "linear-gradient(180deg,#7f1d1d,#1c0505)", accent: "#f59e0b", glow: "#fef3c7", font: "'Rye', serif" },
        highs: [{ e: "🐲", name: "Dragon" }, { e: "💎", name: "Gem" }, { e: "👑", name: "Crown" }], lows: [{ e: "🏺" }, { e: "📜" }],
        wild: { e: "🐉", name: "DRAGON WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, C: { e: "🔴", name: "Dragon Pearl" }, X: { e: "👁️", name: "Dragon Eye" } },
        features: {
            free: { p: 0.006, spins: 8, mult: 2 },
            hold: { p: 0.007, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 },
            pick: { p: 0.0035, sym: true, title: "🐉 DRAGON'S EYE 🐉", tw: { MINI: 55, MINOR: 30, MAJOR: 12, GRAND: 0.3 } }
        }
    }),
    // ------------------------------------------------ Monkey Drop (money tree progressive)
    video({
        id: "monkey_drop", name: "Monkey Drop", brand: "IPEX", engine: "monkey", progressive: true, bets: [300, 500, 1000, 2000, 5000], maxX: 5000, linearGate: true,
        desc: "릴의 동전이 숲속 돈나무로 던져진다! 동전 6개 = 나무에서 동전 6개가 떨어지며 HOLD & SPIN (휠 코인 x2~x10 · 원숭이 코인 · 잭팟 코인). 나무가 무거워질수록 원숭이가 떨어질 듯… 떨어지면 몽키 보너스(7칸 모두 채우면 MONKEY 잭팟)! 1릴 원숭이 얼굴 + 연속 동전 = 모두 수집, FREE 3개 = 8 무료스핀.",
        theme: { bg: "linear-gradient(180deg,#14532d 0%,#0b3d1f 45%,#052e16 100%)", accent: "#84cc16", glow: "#fde047", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🦍", name: "Gorilla" }, { e: "🍌", name: "Banana" }, { e: "🥥", name: "Coconut" }], lows: [{ e: "🍃" }, { e: "🌺" }],
        wild: { e: "🌴", name: "PALM WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, C: { e: "🪙", name: "Tree Coin" }, B: { e: "🐵", name: "Monkey Face", cls: "sym-monkey" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 80 }, MONKEY: { x: 150 }, MAJOR: { seed: 800000, rate: 0.01 }, GRAND: { seed: 2500000, rate: 0.02, cap: 5000000 } },
        bgm: "monkey_funk",
        omens: ["🍀 Lucky has arrived 🍀", "릴 흔들림", "원숭이 코인 뿌리기", "나무 동전비", "동전 섞인 나뭇잎 바람"],
        tree: {
            max: 24, heapMax: 120, throwP: 0.2,
            coin: { v: ["0.5", "1", "2", "3", "5", "8", "10", "15", "WHEEL", "MONKEY", "MINI", "MINOR", "MAXI", "MAJOR", "GRAND"], w: [24, 24, 18, 12, 8, 4, 2.5, 1, 1.6, 1.8, 1.2, 0.4, 0.12, 0.03, 0.01] }
        },
        features: {
            free: { p: 0.006, spins: 8, mult: 1 },
            hold: {
                p: 0.0075, trigger: 6, land: 0.07, lives: 3, boost: [[0.5, 45], [1, 32], [2, 16], [3, 7]],
                coin: { v: ["0.5", "1", "2", "3", "5", "8", "10", "WHEEL", "MONKEY", "MINI", "MINOR", "MAXI", "MAJOR"], w: [25, 25, 18, 12, 8, 4, 2.5, 1.4, 1.6, 1.2, 0.3, 0.06, 0.012] }
            },
            fall: { p: 0.0025, min: 0.4, start: 3, land: 0.11, lives: 3, coin: { v: ["2", "3", "5", "8", "10", "15", "25", "MINI", "MINOR", "MAXI"], w: [22, 22, 18, 12, 9, 5, 2, 6, 2.5, 0.6] } },
            column: { p: 0.012, len: [[1, 52], [2, 30], [3, 13], [4, 5]], coin: { v: ["0.5", "1", "2", "3", "5", "8", "10", "MINI", "MINOR"], w: [22, 24, 20, 14, 9, 5, 3, 2, 0.4] } }
        },
        tests: [["free", "8 무료스핀"], ["hold", "Hold & Spin"], ["hold:wheel", "H&S + 휠 코인"], ["hold:monkey", "H&S + 원숭이 코인"], ["hold:jp", "H&S + 잭팟 코인"], ["hold:mix", "H&S + 휠·원숭이·잭팟"], ["hold:full", "H&S 풀보드"], ["fall", "원숭이 떨어짐"], ["fall:full", "원숭이 풀보드 (MONKEY)"], ["column", "연속 보너스"], ["column:max", "연속 보너스 (5릴)"]]
    }),
    // ------------------------------------------------ 5 Cats (five cat meters → stacking Hold & Spin)
    video({
        id: "five_cats", name: "5 Cats", brand: "HYHG GAMING", progressive: true, bets: [500, 800, 1000, 2000, 5000], maxX: 5000, linearGate: true,
        desc: "다다미 방의 고양이 5마리가 금덩이를 쌓는다! 금덩이는 언제든 터질 수 있고, 터진 고양이의 능력이 모두 합쳐진 HOLD & SPIN — Happy(릴 하나 더 · 더블 보드) · Lucky(MINI~MAJOR 잭팟 알) · Meow(알 금액 UP) · Rich(COLLECT ALL x2) · Fluffy(INSTANT WIN). 5마리가 한꺼번에 터질 수도! FREE 3개 = 6 무료스핀.",
        theme: { bg: "linear-gradient(180deg,#3b2414 0%,#5c3a1e 42%,#24150b 100%)", accent: "#e8b04a", glow: "#ffdf7a", font: "'Rye', serif" },
        highs: [{ e: "🏮", name: "Lantern" }, { e: "🎐", name: "Wind Chime" }, { e: "🍣", name: "Sushi" }], lows: [{ e: "🐟", name: "Fish" }, { e: "🧶", name: "Yarn" }],
        wild: { e: "🐾", name: "PAW WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, M1: { e: "😸", name: "Happy" }, M2: { e: "😺", name: "Lucky" }, M3: { e: "😽", name: "Meow" }, M4: { e: "😼", name: "Rich" }, M5: { e: "😻", name: "Fluffy" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: 300000, rate: 0.01 }, GRAND: { seed: 1500000, rate: 0.02, cap: 5000000 } },
        meter: { kind: "cats", max: 10, p: 0.015, chain: 0.25 },
        bgm: "samurai_taiko",
        omens: [{ fx: "cats" }, { fx: "text", text: "😾 Cats are revolting!!!! 😾" }, { fx: "mosaic" }, { fx: "ingots" }],
        features: {
            free: { p: 0.006, spins: 6, mult: 1 },
            chold: {
                start: 6, start2: 3, lives: 3, land: 0.075,
                coin: { v: ["0.5", "1", "2", "3", "5", "8", "10", "MINI", "MINOR", "MAXI", "MAJOR"], w: [26, 26, 18, 12, 8, 4, 2, 0.6, 0.15, 0.03, 0.008] },
                luckyTw: { MINI: 58, MINOR: 30, MAXI: 10, MAJOR: 2 }, meowP: 0.45, meowAdd: [[0.5, 40], [1, 32], [2, 18], [3, 10]], fluffyP: 0.12
            }
        },
        tests: [["free", "6 무료스핀"], ["mm:happy", "😸 Happy (더블 릴)"], ["mm:lucky", "😺 Lucky (잭팟 알)"], ["mm:meow", "😽 Meow (알 금액 UP)"], ["mm:rich", "😼 Rich (COLLECT ALL)"], ["mm:fluffy", "😻 Fluffy (INSTANT WIN)"], ["mm:happy+meow+rich", "3마리 동시"], ["mm:all", "5마리 한꺼번에!"], ["mm:all:full", "5마리 + 풀보드"]]
    }),
    // ------------------------------------------------ Froggie (three lotus frogs)
    video({
        id: "froggie", name: "Froggie", brand: "IPEX", progressive: true, bets: [500, 1000, 1500, 2000, 3000, 5000], maxX: 5000, linearGate: true,
        desc: "비 내리는 연못, 연꽃 위 개구리 3마리가 점점 빵빵해진다… 언제 가라앉을지 몰라! RIBBIT SPIN(개구리 점프로 코인 UP · 연꽃잎 = 리스핀 +1, 최대 5) · RIBBIT CATCH(3x3 그물 안 코인만 수집 · 연꽃잎 = 그물 확장 · 개구리 = x2~x5) · RIBBIT PICK(연꽃잎 3개 매칭 잭팟, 개구리 3개 = 개구리 휠). FREE 3개 = 6 무료스핀.",
        theme: { bg: "linear-gradient(180deg,#1f3b4d 0%,#1d5241 55%,#0b2a21 100%)", accent: "#4ade80", glow: "#fde047", font: "'Lilita One', sans-serif" },
        highs: [{ e: "👑", name: "Frog Crown" }, { e: "🐠", name: "Goldfish" }, { e: "🐞", name: "Ladybug" }], lows: [{ e: "💧", name: "Raindrop" }, { e: "🌿", name: "Reed" }],
        wild: { e: "☔", name: "RAIN WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, M1: { e: "🐸", name: "Ribbit Spin", cls: "frog-g" }, M2: { e: "🐸", name: "Ribbit Catch", cls: "frog-y" }, M3: { e: "🐸", name: "Ribbit Pick", cls: "frog-o" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: 300000, rate: 0.01 }, GRAND: { seed: 1500000, rate: 0.02, cap: 5000000 } },
        meter: { kind: "frogs", max: 12, p: 0.032, chain: 0.12, feat: { spin: "rspin", catch: "rcatch", pick: "rpick" } },
        bgm: "lounge_jazz",
        omens: [{ fx: "text", text: "🍀 Lucky has arrived 🍀" }, { fx: "shake" }, { fx: "frogs" }, { fx: "rain", chars: ["🪷", "🌸", "🍃", "🪷"] }],
        features: {
            free: { p: 0.006, spins: 6, mult: 1 },
            rspin: {
                start: 6, lives: 3, maxLives: 5, land: 0.075, wCoin: 86, wFrog: 8, wLotus: 6, hop: [[0.5, 40], [1, 32], [2, 18], [3, 10]],
                coin: { v: ["0.5", "1", "2", "3", "5", "8", "10", "MINI", "MINOR", "MAXI", "MAJOR"], w: [26, 26, 18, 12, 8, 4, 2, 1.2, 0.35, 0.08, 0.02] }
            },
            rcatch: {
                // 3x5 board, net 2x2 → 3x5 (land / lotus tuned to the old ~27x average)
                size: 5, start: 4, lives: 3, land: 0.14, wCoin: 74, wLotus: 18, wFrog: 8, mult: [[2, 45], [3, 30], [4, 15], [5, 10]],
                coin: { v: ["0.5", "1", "2", "3", "5", "8", "10", "MINI", "MINOR", "MAXI", "MAJOR"], w: [26, 26, 18, 12, 8, 4, 2, 1.2, 0.35, 0.08, 0.02] }
            },
            rpick: {
                title: "🪷 RIBBIT PICK 🪷", tw: { MINI: 40, MINOR: 24, MAXI: 9, MAJOR: 3, GRAND: 0.4, FROG: 22 },
                wheel: { seg: ["CATCH", "MINOR", "SPIN", "MAXI", "CATCH", "MINI", "SPIN", "MAJOR", "CATCH", "MINOR", "SPIN", "GRAND"], w: [12, 10, 12, 5, 12, 12, 12, 2, 12, 10, 12, 0.5] }
            }
        },
        tests: [["free", "6 무료스핀"], ["mm:spin", "🟢 RIBBIT SPIN"], ["mm:spin:full", "RIBBIT SPIN 풀보드"], ["mm:catch", "🟡 RIBBIT CATCH"], ["mm:catch:full", "RIBBIT CATCH (코인 많이)"], ["mm:pick", "🟠 RIBBIT PICK"], ["mm:pick:frog", "PICK → 개구리 휠"], ["mm:pick:frog:CATCH", "개구리 휠 → CATCH"], ["mm:pick:frog:SPIN", "개구리 휠 → SPIN"], ["mm:all", "3마리 동시"]]
    }),
    // ------------------------------------------------ Cat and Mouse (non-progressive, neon arcade)
    video({
        id: "cat_mouse", name: "Cat and Mouse", brand: "Classic Gaming", engine: "catmouse", progressive: false, bets: [100, 300, 500, 1000], maxX: 3000,
        desc: "네온사인 오락실의 고양이와 쥐! FREE 3개 = 8 무료스핀 · DOUBLE 3개 = 8 무료스핀 + 릴 2세트 (추가 릴에 DOUBLE 3개 = +3스핀 & 4세트로 분할) · 고양이 3개 = 생선 3마리 중 하나를 골라 잭팟 · 쥐 3개 = 8 무료스핀, A·K·Q·J·10이 모두 쥐 WILD!",
        theme: { bg: "radial-gradient(circle at 50% 18%,#3b0764 0%,#14052b 55%,#05010d 100%)", accent: "#ff3cac", glow: "#22d3ee", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🧀", name: "Neon Cheese" }, { e: "🐟", name: "Neon Fish" }, { e: "🧶", name: "Yarn Ball" }], lows: [{ e: "🥛", name: "Milk" }, { e: "🐾", name: "Paw" }],
        wild: { e: "⭐", name: "NEON WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { e: "FREE", name: "FREE", cls: "sym-neon-free" }, D: { e: "DOUBLE", name: "DOUBLE", cls: "sym-neon-double" }, X: { e: "🐱", name: "Neon Cat", cls: "sym-neon-cat" }, N: { e: "🐭", name: "Neon Mouse", cls: "sym-neon-mouse" }, MW: { e: "🐭", name: "MOUSE WILD", cls: "sym-wild sym-mousewild" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { x: 100 }, GRAND: { x: 500 } },
        wMouse: { A: 1.2, K: 1.2, Q: 1.3, J: 1.3, T: 1.4 },
        bgm: "synthwave",
        omens: [{ fx: "text", text: "🍀 Lucky has arrived 🍀" }, { fx: "shake" }, { fx: "chase" }, { fx: "rain", chars: ["💵", "💰", "🪙", "💸"] }],
        features: {
            free: { p: 0.006, spins: 8, mult: 1 },
            double: { p: 0.004, spins: 8, add: 3, splitP: 0.1 },
            fish: { p: 0.004, title: "🐟 FISH PICK 🐟", n: 3, icon: "🐟", prizes: ["MINI", "MINOR", "MAJOR", "GRAND"], w: [62, 28, 9, 1] },
            mouse: { p: 0.004, spins: 8 }
        },
        tests: [["free", "8 무료스핀"], ["double", "DOUBLE (더블 릴)"], ["double:split", "DOUBLE → 4세트 분할"], ["fish", "🐱 생선 픽 잭팟"], ["mouse", "🐭 쥐 WILD 무료스핀"]]
    }),
    // ------------------------------------------------ Crack or Not (no reels: tap the ostrich egg)
    {
        id: "crack_or_not", name: "Crack or Not", brand: "DAEBAK", engine: "egg", progressive: true, bets: [100, 200, 300, 500, 800, 1000], px: 1, maxX: 500,
        desc: "둥지 위의 커다란 타조알. 탭(베팅)할 때마다 금이 조금씩 가고… 어느 순간 쩍! 깨지면 새끼 타조가 튀어나와 BET × 1 ~ 200배를 던져준다. 금이 얼마나 갔든 언제든 깨질 수 있다!",
        theme: { bg: "linear-gradient(180deg,#fde9b0 0%,#e0b26a 45%,#6b4423 100%)", accent: "#f59e0b", glow: "#fff7d6", font: "'Lilita One', sans-serif" },
        jpText: "🥚 SPECIAL JACKPOT · 알이 깨지면 BET × 1 ~ 200 🐣",
        egg: { max: 12, jpAt: 100, mult: [1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 100, 200], w: [10, 12, 12, 14, 12, 11, 9, 7, 5, 4, 2.2, 0.8] },
        bgm: "lounge_jazz",
        omens: [{ fx: "feathers" }, { fx: "cracks" }],
        features: { crack: { p: 0.0638 } },
        tests: [["crack", "🥚 알 깨기 (랜덤 배수)"], ["crack:200", "🥚 알 깨기 x200"]]
    },
    // ------------------------------------------------ Niagara (cascading reels)
    video({
        id: "niagara", name: "Niagara", brand: "CLOUD GAMING", engine: "cascade", progressive: false, jp: null, bets: [100, 200, 300, 500, 800, 1000, 2000], maxX: 5000,
        desc: "나이아가라 폭포의 캐스케이드 릴! 당첨 심볼은 물에 쓸려가고 새 심볼이 쏟아진다. 한 스핀에 4번 이상 연속 당첨 = 무료게임 (4연속 5회 · 5연속 10 · 6연속 15 · 7연속 25 · 8연속 50 · 9연속 100). 통나무 3개 = PICK ONE, 보석 3개 = MATCH 3 (상금은 베팅 기준 랜덤).",
        theme: { bg: "linear-gradient(180deg,#7dd3fc 0%,#0ea5e9 34%,#0c4a6e 75%,#082f49 100%)", accent: "#38bdf8", glow: "#e0f2fe", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🛶", name: "Mist Boat" }, { e: "🌈", name: "Rainbow" }, { e: "🦅", name: "Eagle" }], lows: [{ e: "🐟", name: "Trout" }, { e: "🍁", name: "Maple" }],
        wild: { e: "💦", name: "SPLASH WILD", w: [0, 4, 4, 4, 0] },
        look: { PK: { e: "🛢️", name: "Barrel (Pick One)" }, MT: { e: "💎", name: "Gem (Match 3)" } },
        cascade: { maxBase: 3, maxFree: 6, chainW: [[4, 60], [5, 22], [6, 10], [7, 5], [8, 2.2], [9, 0.8]] },
        bgm: "lounge_jazz",
        omens: [{ fx: "shake" }, { fx: "flood" }],
        features: {
            free: { p: 0.006 },
            pick: { p: 0.006, title: "🛢️ BARREL PICK ONE 🛢️", n: 5, icon: "🛢️", prizes: ["5", "8", "10", "15", "20", "30", "50"], w: [26, 22, 18, 14, 10, 6, 4] },
            match: { p: 0.005, title: "💎 NIAGARA MATCH 3 💎", icon: "💧", prizes: ["5", "10", "20", "50", "100"], w: [40, 30, 18, 9, 3] }
        },
        tests: [["free", "4연속 캐스케이드 → 무료게임"], ["free:6", "6연속 → 15 무료게임"], ["free:9", "9연속 → 100 무료게임"], ["pick", "🛢️ PICK ONE"], ["match", "💎 MATCH 3"]]
    }),
    // ------------------------------------------------ Lucky Boxes (three growing boxes)
    video({
        id: "lucky_boxes", name: "Lucky Boxes", brand: "DAEBAK", progressive: true, rows: 4, bets: [300, 500, 1000, 1500, 2000, 3000], maxX: 5000, linearGate: true,
        desc: "금은보화 속 상자 3개! 릴의 상자가 던져질 때마다 상자가 커지고 숫자가 올라간다(6~20). 언제든 펑! — 빨간 상자 = 그 숫자만큼 무료게임 · 레인보우 = 무료게임 + 같은 수의 WILD를 나눠 뿌림 · 노란 상자 = 그 숫자만큼 WILD를 릴 전체에 한 번에! (무료게임 중에도 노란 상자는 터질 수 있음). 열쇠 3개 = MATCH 3 잭팟, 휠 3개 = LUCKY WHEEL. 4x5 = 1024 WAYS.",
        theme: { bg: "linear-gradient(180deg,#4c1d95 0%,#2e1065 50%,#12052b 100%)", accent: "#fbbf24", glow: "#fde68a", font: "'Lilita One', sans-serif" },
        highs: [{ e: "💎", name: "Diamond" }, { e: "👑", name: "Crown" }, { e: "💍", name: "Ring" }], lows: [{ e: "🪙", name: "Coin" }, { e: "📿", name: "Pearls" }],
        wild: { e: "🌟", name: "STAR WILD", w: [0, 3, 3, 3, 0], wFree: [0, 4, 4, 4, 0] },
        look: { M1: { e: "🎁", name: "Red Box", cls: "box-red" }, M2: { e: "🎁", name: "Rainbow Box", cls: "box-rainbow" }, M3: { e: "🎁", name: "Yellow Box", cls: "box-yellow" }, X: { e: "🔑", name: "Lucky Key" }, R: { img: "images/slots/wheel.svg", name: "Lucky Wheel" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: 150000, rate: 0.012 }, GRAND: { seed: 800000, rate: 0.02, cap: 3000000 } },
        meter: { kind: "boxes", max: 10, p: 0.025, counts: { start: 6, max: 20, up: 0.45 }, feat: { red: "bred", rainbow: "brainbow", yellow: "bwild" } },
        bgm: "lounge_jazz",
        omens: [{ fx: "text", text: "🍀 Lucky has arrived 🍀" }, { fx: "shake" }, { fx: "boxopen" }, { fx: "dwarf" }],
        features: {
            pick: { p: 0.004, sym: true, title: "🔑 LUCKY BOX MATCH 🔑", tw: { MINI: 52, MINOR: 30, MAXI: 12, MAJOR: 5, GRAND: 0.4 } },
            wheel: { p: 0.005, sym: true, seg: ["5", "MINI", "8", "15", "5", "MINOR", "10", "30", "6", "MAXI", "12", "20"], w: [16, 5, 12, 6, 16, 2.5, 10, 2, 14, 0.6, 9, 4] },
            bred: {}, brainbow: {}, bwild: {}
        },
        tests: [["mm:red", "🟥 빨간 상자 (무료게임)"], ["mm:rainbow", "🌈 레인보우 상자 (무료게임+WILD)"], ["mm:yellow", "🟨 노란 상자 (WILD 뿌리기)"], ["mm:red+yellow", "빨강 + 노랑 동시"], ["pick", "🔑 MATCH 3 잭팟"], ["wheel", "🎡 LUCKY WHEEL"]]
    })
];
// ------------------------------------------------ region maps: one generated slot per map
// Each template copies the feature set + reel weights of a calibrated machine,
// so the RTP is the same as that machine's (px copied as well).
const TPL = {
    pearl:  { px: 2.2,  label: "FREE 3개 = 10 무료스핀(x2) · 코인 6개 = Hold & Spin", wildW: [0, 4, 4, 4, 0], wildFree: [0, 6, 6, 6, 0],
              look: sp => ({ F: { img: "images/slots/free-games.svg" }, C: { e: sp, name: "Coin" } }),
              features: () => ({ free: { p: 0.0075, spins: 10, mult: 2 }, hold: { p: 0.0095, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 } }) },
    rabbit: { px: 2.25, label: "FREE 3개 = 8 무료스핀(와일드 릴) · 잭팟 심볼 3개 = 잭팟 픽", wildW: [0, 4, 4, 4, 0],
              look: sp => ({ F: { img: "images/slots/free-games.svg" }, X: { e: sp, name: "Jackpot" } }),
              features: n => ({ free: { p: 0.008, spins: 8, mult: 1, wildReels: 0.3 }, pick: { p: 0.005, sym: true, title: `${n} PICK`, tw: { MINI: 55, MINOR: 30, MAJOR: 12, GRAND: 0.3 } } }) },
    ant:    { px: 2.13, label: "코인 6개 = Hold & Spin · 잭팟 심볼 3개 = 잭팟 픽", wildW: [0, 4, 4, 4, 0],
              look: sp => ({ C: { e: sp, name: "Coin" }, X: { e: "👑", name: "Jackpot" } }),
              features: n => ({ hold: { p: 0.0095, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 }, pick: { p: 0.0045, sym: true, title: `${n} TREASURE`, tw: { MINI: 55, MINOR: 30, MAJOR: 12, GRAND: 0.3 } } }) },
    ghost:  { px: 2.8,  label: "휠 심볼 3개 = 보너스 휠 · FREE 3개 = 10 무료스핀", wildW: [0, 4, 4, 4, 0], wildFree: [0, 6, 6, 6, 0],
              look: sp => ({ F: { img: "images/slots/free-games.svg" }, R: { e: sp, name: "Wheel" } }),
              features: () => ({ free: { p: 0.0075, spins: 10, mult: 1 }, wheel: { p: 0.008, sym: true, seg: ["5", "MINI", "8", "15", "5", "MINOR", "10", "30", "6", "MAJOR", "12", "20"], w: [16, 5, 12, 6, 16, 2.5, 10, 2, 14, 0.25, 9, 4] } }) },
    dragon: { px: 2.37, label: "코인 6개 = Hold & Spin · FREE 3개 = 8 무료스핀(x2) · 잭팟 심볼 3개 = 잭팟 픽", wildW: [0, 4, 4, 4, 0], wildFree: [0, 6, 6, 6, 0],
              look: sp => ({ F: { img: "images/slots/free-games.svg" }, C: { e: "🔴", name: "Pearl" }, X: { e: sp, name: "Jackpot" } }),
              features: n => ({ free: { p: 0.006, spins: 8, mult: 2 }, hold: { p: 0.007, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 }, pick: { p: 0.0035, sym: true, title: `${n} PICK`, tw: { MINI: 55, MINOR: 30, MAJOR: 12, GRAND: 0.3 } } }) }
};
// pay scales re-solved by simulation for the rule-region slots (less frequent bonus → higher line pays, RTP kept)
// (browser sim, 300k spins each at the mid bet, solved for ≈ 89% RTP)
const RULE_PX = {
    rs_random_casino: 2.801, rs_odd_casino: 2.476, rs_possibility: 2.47, rs_rtp_town: 2.824, rs_plaza: 2.475, rs_crazy_casino: 3.092, rs_space_center: 2.727,
    rs_riches: 2.921, rs_wealthy: 2.503, rs_highroller: 2.62, rs_beggar_shelter: 2.59, rs_highlimit: 2.924, rs_goldbar: 2.586, rs_diamond_casino: 2.799,
    rs_noc_casino: 2.851, rs_noc_casino_2: 2.966, rs_slots_only: 2.368, rs_slots_only_2: 2.353, rs_redblue: 2.796, rs_redblue_2: 2.931, rs_ocean_town: 2.754, rs_ocean_town_2: 2.412,
    rs_colosseum: 3.066, rs_npc_town: 2.289, rs_sky_tower: 2.802, rs_death_casino: 2.896, rs_evil_town: 2.889, rs_nightmare: 2.971, rs_donation: 2.424, rs_npc_casino: 2.5,
    rs_sky_bridge: 2.787, rs_rocketship: 3.002, rs_island: 2.776, rs_deep_ocean: 2.915, rs_star_sky: 2.357, rs_space_lake: 2.758, rs_sky_pond: 2.791, rs_combo_town: 2.821
};
for (const m of NEW_MAPS) for (const [i, s] of mapSlots(m).entries()) {
    const t = TPL[s.tpl];
    const id = slotIdOf(m, i);
    const features = t.features(s.name.toUpperCase());
    // 6 rule regions: the bonus features together trigger once every 80~120 spins (fixed per machine)
    let every = null;
    if (RULE_REGIONS.includes(m.region)) {
        every = 80 + Math.round(seed01(id) * 40);
        const tot = Object.values(features).reduce((a, f) => a + f.p, 0);
        for (const f of Object.values(features)) f.p *= (1 / every) / tot;
    }
    SLOTS.push(video({
        id, name: s.name, brand: s.brand, progressive: true, region: m.region,
        desc: `${m.name}의 대표 슬롯! ${t.label}.${every ? ` 보너스 약 ${every}스핀에 1번.` : ""}`,
        theme: { bg: `linear-gradient(180deg,${s.bg[0]},${s.bg[1]})`, accent: s.acc, glow: s.acc, font: s.font || "'Lilita One', sans-serif" },
        highs: s.hi.map(e => ({ e })), lows: s.lo.map(e => ({ e })),
        wild: { e: s.wild, name: "WILD", w: t.wildW, ...(t.wildFree ? { wFree: t.wildFree } : {}) },
        look: t.look(s.sp), features, px: RULE_PX[id] ?? t.px, ...(every ? { bonusEvery: every } : {})
    }));
}
SLOTS.push(...SPECIAL_SLOTS);

// RTP scale for line/way pays, from an 80k-spin simulation per machine:
// base + free-spin ways ≈ 89% − (progressive share), so total RTP ≈ 89~91%.
const PX = {
    money_mesh: 1.517, coin_pigglet: 1.76, fufu: 2.09, samurai_cash: 1.57, bonanza: 2.05, clover_luck: 2.48, // these re-simulated (300k spins) after the bonus rework ≈ 88%
    pearl_tide: 2.2, golden_dung: 2.41, rabbit_rush: 2.25, tiki_volcano: 2.2, ant_hill: 2.13, ghost_vault: 2.8, dragon_hoard: 2.37,
    monkey_drop: 1.35, // 1M-spin sim (200k × 5 bets): 86.7% = 80.0% non-progressive + 6.7% MAJOR/GRAND at seed (+ pool growth 3%)
    // new machines, browser sim at the mid bet (2–5 × 150k spins each): 5 Cats 87.7% · Froggie 89.4% · Cat and Mouse 87.8% · Niagara 86.9% · Lucky Boxes 89.0% · Crack or Not 86.0%
    five_cats: 1.16, froggie: 2.02, cat_mouse: 0.31, niagara: 1.93, lucky_boxes: 0.089, crack_or_not: 1
};
for (const s of SLOTS) s.px = PX[s.id] ?? s.px;
export const SLOT_BY_ID = Object.fromEntries(SLOTS.map(s => [s.id, s]));
export const BRAND_LOGO = {
    "BLK": "images/slots/brands/blk.svg", "CLOUD GAMING": "images/slots/brands/cloud-gaming.svg", "CLOVER-TECH": "images/slots/brands/clover-tech.svg",
    "DAEBAK": "images/slots/brands/daebak.svg", "IPEX": "images/slots/brands/ipex.svg", "Rabbit-Gaming": "images/slots/brands/rabbit-gaming.svg",
    "HYHG GAMING": "images/slots/brands/hyhg-gaming.svg", "Classic Gaming": "images/slots/brands/classic-gaming.svg", "Scrooge-Slots": "images/slots/brands/scrooge-slots.svg", "YG GAMING": "images/slots/brands/yg-gaming.svg"
};
