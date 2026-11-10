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
        desc: "코인피글렛이 동전을 삼키며 커지다가 펑! 피기 잭팟(MINI~GRAND), 동전 6개 이상 = Hold & Spin, FREE 3개 = 8 무료게임(x2).",
        theme: { bg: "linear-gradient(180deg,#ffb3c7,#7a1840)", accent: "#ff5c8a", glow: "#ffd34d", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🐷", name: "Pigglet" }, { e: "💰", name: "Money Sack" }, { e: "🏦", name: "Bank" }], lows: [{ e: "🌽" }, { e: "🥕" }],
        wild: { e: "🐽", name: "WILD", w: [0, 4, 4, 4, 0], wFree: [0, 7, 7, 7, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, C: { e: "🪙", name: "Coin" }, M: { img: "images/slots/piggy-full.svg", name: "Coin-Pigglet" } },
        meter: { kind: "piggy", max: 12, p: 0.075, onFull: "pick", title: "💥 PIGGY BREAK! 💥", pickTw: { MINI: 50, MINOR: 30, MAJOR: 14, GRAND: 0.5 } },
        features: {
            free: { p: 0.0075, spins: 8, mult: 2, retrigger: 0.03, retriggerSpins: 5 },
            hold: { p: 0.008, sym: true, trigger: 6, start: 6, coin: COIN, land: 0.075, lives: 3 }
        }
    }),
    // ------------------------------------------------ FuFu Firecracker (high limit)
    video({
        id: "fufu", name: "FuFu Firecracker", brand: "DAEBAK", progressive: true, bets: [500, 1000, 2000, 5000], maxX: 10000,
        desc: "福가 행운을 부른다! 폭죽 퓨즈가 가득 차면 GROW REELS(6 무료스핀, 릴이 커짐) 또는 HOLD & SPIN. 복주머니 3/4/5개 = 8/10/12 무료스핀.",
        theme: { bg: "linear-gradient(180deg,#b3001b,#3a0008)", accent: "#ffcc00", glow: "#ff3b3b", font: "'Lilita One', sans-serif" },
        highs: [{ e: "🐉", name: "Dragon" }, { e: "🏮", name: "Lantern" }, { e: "🧧", name: "Red Envelope" }], lows: [{ e: "🍊" }, { e: "🥟" }],
        wild: { img: "images/slots/fu-wild.svg", name: "福 WILD", w: [0, 4, 4, 4, 0], wFree: [0, 7, 7, 7, 0] },
        look: { F: { img: "images/slots/lucky-pouch.svg", name: "Lucky Pouch" }, C: { img: "images/slots/fu.svg", name: "福 Coin" }, M: { img: "images/slots/firecracker.svg", name: "Firecracker" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { seed: 100000, rate: 0.015 }, GRAND: { seed: 500000, rate: 0.025, cap: 1000000 } },
        meter: { kind: "fuse", max: 20, p: 0.11, addPerSym: true, onFull: "grow_or_hold", title: "🧨 FUSE LIT! 🧨" },
        features: {
            free: { p: 0.007, byCount: [8, 10, 12], mult: 1, retrigger: 0.02, retriggerSpins: 4 },
            hold: { p: 0.0, trigger: 6, start: 4, coin: COIN, land: 0.08, lives: 3 },
            grow: { spins: 6, pGrow: 0.55, max: 6 }
        }
    }),
    // ------------------------------------------------ Samurai Cash
    video({
        id: "samurai_cash", name: "Samurai Cash", brand: "YG GAMING", progressive: true, bets: [100, 200, 300, 400, 500],
        desc: "센세이가 지키는 금 주머니. 센세이가 나올 때마다 동전이 쌓이다가 터지면 잭팟 픽(MINI x2, MINOR x2 포함)! 센세이 3개 = 코인 픽, 휠 3개 = 사무라이 휠.",
        theme: { bg: "linear-gradient(180deg,#1b1b3a,#05050f)", accent: "#e11d48", glow: "#fbbf24", font: "'Rye', serif" },
        highs: [{ e: "🥷", name: "Ninja" }, { e: "🏯", name: "Castle" }, { e: "🎎", name: "Dolls" }], lows: [{ e: "🍡" }, { e: "🍵" }],
        wild: { img: "images/slots/katana-wild.svg", name: "Katana WILD", w: [0, 5, 5, 5, 0] },
        look: { M: { e: "🧘", name: "Sensei" }, X: { e: "🧘", name: "Sensei" }, R: { img: "images/slots/wheel.svg", name: "Samurai Wheel" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { seed: 8000, rate: 0.012 }, GRAND: { seed: 500000, rate: 0.02, cap: 1000000 } },
        meter: { kind: "bag", max: 20, p: 0.10, addPerSym: true, onFull: "pick", title: "💰 THE BAG BURST! 💰", pickTw: { MINI: 38, MINOR: 22, MAJOR: 8, GRAND: 0.3, MINI_X2: 18, MINOR_X2: 11 } },
        features: {
            pick: { p: 0.004, sym: true, title: "🧘 SENSEI COIN PICK 🧘", tw: { MINI: 60, MINOR: 28, MAJOR: 6, GRAND: 0.2 } },
            wheel: { p: 0.008, sym: true, seg: ["MINI", "5", "10", "8", "MINOR", "15", "5", "25", "10", "50", "8", "20"], w: [10, 16, 11, 13, 4, 8, 16, 4, 11, 1.5, 13, 5] }
        }
    }),
    // ------------------------------------------------ Bonanza Meter
    video({
        id: "bonanza", name: "Bonanza Meter", brand: "Scrooge-Slots", progressive: true,
        desc: "눈 속의 온도계 3개를 채워라! So Hot(모두 수집) · So Extra(1.5배) · So Cold(x2~x5) Hold & Spin. 펭귄 휠, 8 무료스핀, 잭팟 5종(MAXI 포함).",
        theme: { bg: "linear-gradient(180deg,#bde7ff,#1e3a8a)", accent: "#38bdf8", glow: "#ffffff", font: "'Lilita One', sans-serif" },
        highs: [{ e: "⛄", name: "Snowman" }, { e: "🐧", name: "Penguin" }, { e: "🦭", name: "Seal" }], lows: [{ e: "🧊" }, { e: "🧣" }],
        wild: { img: "images/slots/snow-wild.svg", name: "Snow WILD", w: [0, 4, 4, 4, 0], wFree: [0, 6, 6, 6, 0] },
        look: { F: { img: "images/slots/free-games.svg" }, M1: { img: "images/slots/thermo-red.svg", name: "So Hot" }, M2: { img: "images/slots/thermo-yellow.svg", name: "So Extra" }, M3: { img: "images/slots/thermo-blue.svg", name: "So Cold" }, R: { img: "images/slots/penguin.svg", name: "Penguin Wheel" }, C: { img: "images/slots/snow-coin.svg", name: "Snow Coin" } },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: 15000, rate: 0.012 }, GRAND: { seed: 500000, rate: 0.025, cap: 1000000 } },
        meter: { kind: "thermo", max: 15, p: 0.06 },
        features: {
            free: { p: 0.007, spins: 8, mult: 1, retrigger: 0.03, retriggerSpins: 4 },
            hold: { p: 0, trigger: 6, start: 6, coin: { v: ["0.2", "0.4", "0.6", "1", "1.5", "2.5", "5", "MINI", "MINOR", "MAXI", "MAJOR"], w: [25, 25, 18, 12, 8, 4, 2, 1.2, 0.35, 0.08, 0.02] }, land: 0.08, lives: 3 },
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
        id: "tiki_volcano", name: "Tiki Volcano", brand: "HYHY GAMING", progressive: true,
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
        id: "dragon_hoard", name: "Dragon Hoard", brand: "HYHY GAMING", progressive: true,
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
    })
];
// RTP scale for line/way pays, from an 80k-spin simulation per machine:
// base + free-spin ways ≈ 89% − (progressive share), so total RTP ≈ 89~91%.
const PX = {
    money_mesh: 1.517, coin_pigglet: 1.69, fufu: 2.015, samurai_cash: 1.78, bonanza: 2.05, clover_luck: 2.48,
    pearl_tide: 2.2, golden_dung: 2.41, rabbit_rush: 2.25, tiki_volcano: 2.2, ant_hill: 2.13, ghost_vault: 2.8, dragon_hoard: 2.37,
    monkey_drop: 1.35 // 1M-spin sim (200k × 5 bets): 86.7% = 80.0% non-progressive + 6.7% MAJOR/GRAND at seed (+ pool growth 3%)
};
for (const s of SLOTS) s.px = PX[s.id] ?? s.px;
export const SLOT_BY_ID = Object.fromEntries(SLOTS.map(s => [s.id, s]));
export const BRAND_LOGO = {
    "BLK": "images/slots/brands/blk.svg", "CLOUD GAMING": "images/slots/brands/cloud-gaming.svg", "CLOVER-TECH": "images/slots/brands/clover-tech.svg",
    "DAEBAK": "images/slots/brands/daebak.svg", "IPEX": "images/slots/brands/ipex.svg", "Rabbit-Gaming": "images/slots/brands/rabbit-gaming.svg",
    "Scrooge-Slots": "images/slots/brands/scrooge-slots.svg", "YG GAMING": "images/slots/brands/yg-gaming.svg"
};
