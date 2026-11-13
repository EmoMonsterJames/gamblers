// =====================================================================
// The 15 theme machines (round 4). Engine: js/slots/themeEngine.js
// (engine: "sp_*", dispatched from specialEngine.specialSpin), renderer:
// js/screens/slotSpecial.js. Feature-first bonuses (features.*.p × pet
// luck), teasing, P icons and progressive pools work like every other
// machine. px scales every cash prize except jackpots — solved by a
// 150k+ spin browser simulation (see PX at the bottom).
// Bonus icons are Z* keys (never overwritten by injected symbols).
// =====================================================================
const CARDS = {
    A: { e: "A", card: true, pay: [0.1, 0.25, 0.6] }, K: { e: "K", card: true, pay: [0.1, 0.25, 0.6] },
    Q: { e: "Q", card: true, pay: [0.08, 0.2, 0.5] }, J: { e: "J", card: true, pay: [0.08, 0.2, 0.5] },
    T: { e: "10", card: true, pay: [0.06, 0.15, 0.4] }
};
const CARD_W = { A: 6, K: 6, Q: 6.5, J: 6.5, T: 7 };
const sp = (e, name, cls = "sym-special") => ({ e, name, cls });
const PROG = (major, grand, cap) => ({ MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: major, rate: 0.01 }, GRAND: { seed: grand, rate: 0.02, cap } });
const LUCKY = { fx: "text", text: "🍀 Lucky has arrived 🍀" };
// cluster pay tables (index = cluster size − min, last entry = that size or more)
const CL = (base) => [1, 1.5, 2, 3, 4, 6, 10, 15, 25].map(x => +(x * base).toFixed(3));

export const THEME_SLOTS = [
    // ------------------------------------------------ 1. The Clockwork Vault
    {
        id: "clockwork_vault", name: "The Clockwork Vault", brand: "CLOVER-TECH", engine: "sp_clockwork", progressive: true,
        jp: PROG(60000, 600000, 2500000), bets: [200, 500, 800, 1000, 1500, 2000], reels: 5, rows: 3, maxX: 5000, px: 1.78, fscale: { pendulum: 0.4 },
        desc: "황동과 네온의 스팀펑크 금고. 맞물린 거대한 톱니바퀴가 릴 대신 돈다 (243 WAYS). ✨ 스파크 = OVERCLOCKED SPIN 5회 (와일드 톱니 2개가 맞물릴 때마다 +1x) · ⏪ TIME REWIND = 아깝게 빗나간 고배당 심볼을 기계 팔이 되돌려 강제 당첨 · 🕰️ PENDULUM SWING = 3번 흔들리며 지나간 릴이 스티키 WILD · 🗝️ 열쇠구멍 3개 = THE MASTER ESCAPE 금고 다이얼 (MINI~GRAND)",
        theme: { bg: "radial-gradient(circle at 50% 35%,#b45309 0%,#451a03 45%,#0c0a09 100%)", accent: "#fbbf24", glow: "#22d3ee", font: "'Lilita One', sans-serif" },
        skin: "gears",
        syms: { ...CARDS, H1: { e: "🕰️", name: "Grandfather Clock", pay: [0.6, 2, 6] }, H2: { e: "🗝️", name: "Brass Key", pay: [0.5, 1.5, 4] }, H3: { e: "🎩", name: "Top Hat", pay: [0.4, 1.2, 3] }, H4: { e: "💎", name: "Neon Gem", pay: [0.3, 1, 2.5] } },
        look: { W: { e: "⚙️", name: "WILD COG" }, ZS: sp("✨", "Overclock Spark"), ZK: sp("🔒", "Keyhole") },
        w: { ...CARD_W, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.6, 1.6, 1.6, 0] },
        features: { overclock: { p: 0.006, spins: 5, sym: true }, rewind: { p: 0.025 }, pendulum: { p: 0.006 }, escape: { p: 0.002, sym: true } },
        bgm: "synthwave",
        omens: [{ fx: "rain", chars: ["⚙️", "🕰️", "⏱️"] }, { fx: "shake", text: "Something mysterious is going to happen!!!!!" }, { fx: "wind", chars: ["🌫️", "☁️", "🌫️"], text: "🌫️ A big fog suddenly wraps up the screen" }],
        tests: [["overclock", "✨ OVERCLOCKED SPIN"], ["rewind", "⏪ TIME REWIND"], ["pendulum", "🕰️ PENDULUM SWING"], ["escape", "🗝️ MASTER ESCAPE 잭팟"]]
    },
    // ------------------------------------------------ 2. The Alchemist's Lab
    {
        id: "alchemists_lab", name: "The Alchemist's Lab", brand: "BLK", engine: "sp_alchemist", progressive: true,
        jp: PROG(40000, 400000, 1500000), bets: [100, 200, 300, 500, 800, 1000], reels: 6, rows: 5, maxX: 5000, px: 3.789,
        desc: "다크 판타지 약방의 거대한 유리 가마솥. 재료 30개가 쏟아지고 같은 재료 5개 이상이 붙으면 마법처럼 녹아 사라진다 (CLUSTER + CASCADE). ⚗️ 서로 다른 재료 두 종류가 한 번에 녹으면 CHAIN REACTION — 잡동사니 소멸 + 2x2 메가 재료 · 💧 DISTILLER 튜브가 가득 차면 모든 재료 가치 x2 · 📖 MYSTERY GRIMOIRE = 한 재료가 전부 현자의 돌로 · 🐲 황금 용비늘 3개 = GRAND TRANSMUTATION (최대 5,000x + 잭팟)",
        theme: { bg: "linear-gradient(180deg,#3b0764 0%,#14532d 60%,#052e16 100%)", accent: "#a3e635", glow: "#c084fc", font: "'Lilita One', sans-serif" },
        skin: "cauldron",
        syms: { H0: { e: "🔴", name: "Philosopher's Stone", cls: "sym-gold", pay: CL(1.2) }, H1: { e: "🧪", name: "Vial", pay: CL(0.6) }, H2: { e: "💎", name: "Crystal", pay: CL(0.45) }, H3: { e: "👁️", name: "Eyeball", pay: CL(0.35) },
            L1: { e: "🍄", name: "Toadstool", pay: CL(0.15) }, L2: { e: "🦴", name: "Bone", pay: CL(0.12) }, L3: { e: "🌿", name: "Herb", pay: CL(0.1) } },
        look: { W: { e: "✨", name: "MAGIC WILD" }, ZD: sp("🐲", "Golden Dragon Scale") },
        w: { H1: 5, H2: 6, H3: 7, L1: 12, L2: 13, L3: 14, W: 0.9 },
        features: { chain: { p: 0.01 }, distill: { p: 0.009, max: 12 }, grimoire: { p: 0.008 }, transmute: { p: 0.002, sym: true } },
        bgm: "celestial_brass",
        omens: [{ fx: "burst", icon: "💥", chars: ["🧪", "💥", "🔥"] }, { fx: "rain", chars: ["🎵", "🎶", "🪈"] }, { fx: "flood" }],
        tests: [["chain", "⚗️ CHAIN REACTION"], ["distill", "💧 DISTILLER x2"], ["grimoire", "📖 MYSTERY GRIMOIRE"], ["transmute", "🐲 GRAND TRANSMUTATION"]]
    },
    // ------------------------------------------------ 3. Astral Weaver: Starlight Syndicate
    {
        id: "astral_weaver", name: "Astral Weaver: Starlight Syndicate", brand: "Rabbit-Gaming", engine: "sp_astral", progressive: false, jp: null,
        bets: [300, 500, 1000, 2000, 3000], reels: 6, rows: 5, maxX: 5000, px: 2.373,
        desc: "우주 천문대의 회전하는 별자리 지도. 같은 색 별 4개 이상이 이어지면 레이저로 별자리 완성 (CLUSTER 4+). 💥 SUPERNOVA = 중심 링 WILD + 외곽 링 확장 · 🕳️ BLACK HOLE = 흩어진 별을 끌어모아 별자리 완성 · ☄️ COMET TRAIL = 대각선 경로에 x2/x3/x5 배수가 4스핀 동안 유지 · 🌀 NEBULA PORTAL = 별빛 고리 즉시 상금 + 무료 우주 스핀",
        jpText: "💥 SUPERNOVA · 🕳️ BLACK HOLE · ☄️ COMET TRAIL x2~x5 · 🌀 NEBULA PORTAL",
        theme: { bg: "radial-gradient(circle at 50% 40%,#312e81 0%,#1e1b4b 40%,#020617 100%)", accent: "#e879f9", glow: "#38bdf8", font: "'Lilita One', sans-serif" },
        skin: "stars",
        syms: { H1: { e: "🌟", name: "Gold Star", pay: CL(0.5) }, H2: { e: "💜", name: "Violet Star", pay: CL(0.35) }, H3: { e: "💙", name: "Blue Star", pay: CL(0.28) },
            L1: { e: "🔴", name: "Red Star", pay: CL(0.14) }, L2: { e: "🟢", name: "Green Star", pay: CL(0.12) }, L3: { e: "⚪", name: "White Star", pay: CL(0.1) } },
        look: { W: { e: "✴️", name: "WILD NODE" } },
        w: { H1: 5, H2: 6, H3: 7, L1: 11, L2: 12, L3: 13, W: 0.8 },
        features: { supernova: { p: 0.006 }, blackhole: { p: 0.02 }, comet: { p: 0.008, spins: 4 }, nebula: { p: 0.003, spins: 5 } },
        bgm: "synthwave",
        omens: [],
        tests: [["supernova", "💥 SUPERNOVA"], ["blackhole", "🕳️ BLACK HOLE"], ["comet", "☄️ COMET TRAIL"], ["nebula", "🌀 NEBULA PORTAL"]]
    },
    // ------------------------------------------------ 4. Neon Blitz: Cyber-Bot Arena
    {
        id: "neon_blitz", name: "Neon Blitz: Cyber-Bot Arena", brand: "IPEX", engine: "sp_neon", progressive: true,
        jp: PROG(50000, 500000, 2000000), bets: [200, 400, 600, 1000, 1600, 2000], reels: 8, rows: 6, maxX: 5000, px: 0.937,
        desc: "지하 네온 로봇 격투장. 배터리·마이크로칩·플라즈마 코어가 6x8 에너지 그리드로 떨어진다 — 5개 이상 연결되면 전기 아크로 소멸, 위에서 새 부품 낙하 (CLUSTER CASCADE). 🔵 블루프린트 코인 = 스파키의 MEGA-CORE DROP (3x3 → 최대 6x6) · ⚡ EMP OVERCHARGE = 고철 소멸 + 부품 업그레이드 · 🧲 MAGNET = 크레딧 칩·잭팟 배터리 수거 · 🏟️ 아레나 3~6개 = 6~20 무료스핀 (매 스핀 메가코어) · 🔋 배터리 가득 = OVERDRIVE BATTLE 홀드앤스핀",
        theme: { bg: "linear-gradient(180deg,#0f172a 0%,#4c1d95 50%,#020617 100%)", accent: "#22d3ee", glow: "#f472b6", font: "'Lilita One', sans-serif" },
        skin: "hex",
        syms: { H1: { e: "⚛️", name: "Plasma Core", pay: CL(0.5) }, H2: { e: "🔋", name: "Battery", pay: CL(0.35) }, H3: { e: "💾", name: "Microchip", pay: CL(0.28) }, H4: { e: "🔧", name: "Wrench", pay: CL(0.22) },
            L1: { e: "🔩", name: "Bolt", pay: CL(0.1) }, L2: { e: "⚙️", name: "Gear", pay: CL(0.09) }, L3: { e: "🪛", name: "Scrap", pay: CL(0.08) } },
        look: { W: { e: "🤖", name: "SPARKY WILD" }, ZB: sp("🔵", "Blueprint Coin"), ZC: sp("💳", "Credit Chip"), ZE: sp("🧲", "Electromagnet"), ZF: sp("🏟️", "Scatter Arena") },
        w: { H1: 4, H2: 5, H3: 6, H4: 7, L1: 11, L2: 12, L3: 13, W: 0.6 },
        features: { megacore: { p: 0.012 }, emp: { p: 0.012 }, magnet: { p: 0.01 }, free: { p: 0.004, sym: true }, overdrive: { p: 0.0025, max: 30 } },
        bgm: "synthwave",
        omens: [],
        tests: [["megacore", "🔵 MEGA-CORE DROP"], ["emp", "⚡ EMP OVERCHARGE"], ["magnet", "🧲 MAGNET COLLECT"], ["free", "🏟️ 무료스핀"], ["overdrive", "🔋 OVERDRIVE 홀드앤스핀"]]
    },
    // ------------------------------------------------ 5. Popcorn Pandemonium
    {
        id: "popcorn_pandemonium", name: "Popcorn Pandemonium", brand: "HYHG GAMING", engine: "sp_popcorn", progressive: true,
        jp: PROG(40000, 400000, 1500000), bets: [100, 300, 500, 1000, 2000, 2500], reels: 5, rows: 3, maxX: 5000, px: 1.39, fscale: { pop_free: 0.012 },
        desc: "보랏빛 하늘 아래 1950년대 유령 자동차 극장. 커널이 떨어지면 빨강·파랑·금색 팝콘 기계가 채워진다 — 🔴 RED = 무료게임 8→최대 50 · 🔵 BLUE = 전체 배수 x2→ · 🟡 GOLD = 고정 몬스터 WILD 릴 1~4개. 🍿 버킷이 터지면 무료게임! 둘·셋이 동시에 터지면 DOUBLE-FEATURE · 🎞️ PROJECTOR JAM = 꽝을 되감아 강제 당첨 · 🕶️ 5번 릴 3D 안경 = 스낵 상금 일괄 수령 · 셋 다 터지면 FINAL REEL SHOWDOWN 잭팟 픽",
        theme: { bg: "linear-gradient(180deg,#581c87 0%,#7e22ce 40%,#1e0533 100%)", accent: "#fde047", glow: "#f472b6", font: "'Lilita One', sans-serif" },
        skin: "cinema",
        syms: { ...CARDS, H1: { e: "🐜", name: "Radioactive Ant", pay: [0.6, 2, 6] }, H2: { e: "🛸", name: "UFO", pay: [0.5, 1.5, 4] }, H3: { e: "🧟", name: "Zombie", pay: [0.4, 1.2, 3] }, H4: { e: "🦇", name: "Vampire Bat", pay: [0.3, 1, 2.5] } },
        look: { W: { e: "🎬", name: "MONSTER WILD" }, ZR: sp("🔴", "Red Kernel"), ZU: sp("🔵", "Blue Kernel"), ZG: sp("🟡", "Gold Kernel"), ZN: sp("🌭", "Snack"), Z3: sp("🕶️", "3D Glasses") },
        w: { ...CARD_W, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.4, 1.4, 1.4, 0] },
        features: { pop: { p: 0.006 }, combo: { p: 0.0018 }, showdown: { p: 0.0006, tw: { MINI: 50, MINOR: 30, MAXI: 14, MAJOR: 5, GRAND: 1 } }, snack: { p: 0.01 }, jam: { p: 0.015 } },
        bgm: "organ_waltz",
        omens: [{ fx: "rain", chars: ["🍿", "🍿", "🌽"] }, { fx: "rain", chars: ["🌈", "✨", "🌈"] }, { fx: "wind", chars: ["🍿", "🌪️", "🍿"], text: "🌪️ Popcorn tornados are coming!" }],
        tests: [["pop", "🍿 버킷 팝 무료게임"], ["combo", "🎞️ DOUBLE-FEATURE"], ["showdown", "🏆 FINAL REEL SHOWDOWN"], ["snack", "🕶️ SNACK RUSH"], ["jam", "🎞️ PROJECTOR JAM"]]
    },
    // ------------------------------------------------ 6. Midnight Ouija
    {
        id: "midnight_ouija", name: "Midnight Ouija", brand: "HYHG GAMING", engine: "sp_ouija", progressive: false, jp: null,
        bets: [500, 800, 1000, 1500, 2000], reels: 5, rows: 3, maxX: 3000, px: 0.525, fscale: { pendulum: 0.4 },
        desc: "천둥 치는 19세기 응접실의 위자보드. 15개의 플랑셰트가 5x3 판으로 미끄러지고 25개 고정 페이라인으로 지급 — 배당의 대부분이 기본 게임 라인에! 👻 SPECTRAL SWARM = 유령이 몰려와 최대 12칸을 같은 고배당 심볼 또는 x2/x3 WILD로 동기화 · 🕰️ CURSED PENDULUM = 4·5개 라인 당첨에 진자가 흔들려 x2~x15 + 팬텀 리스핀",
        jpText: "👻 SPECTRAL SWARM · 🕰️ CURSED PENDULUM x2~x15 · 25 LINES",
        theme: { bg: "radial-gradient(circle at 50% 30%,#7f1d1d 0%,#3f1d0b 45%,#0c0a09 100%)", accent: "#fcd34d", glow: "#60a5fa", font: "'Creepster', 'Lilita One', sans-serif" },
        skin: "ouija",
        syms: { ...Object.fromEntries(Object.entries(CARDS).map(([k, v]) => [k, { ...v, pay: v.pay.map(x => x * 0.35) }])),
            H1: { e: "📿", name: "Haunted Locket", pay: [1, 8, 40] }, H2: { e: "💀", name: "Raven Skull", pay: [0.8, 5, 25] }, H3: { e: "🔮", name: "Crystal Ball", pay: [0.6, 4, 20] }, H4: { e: "🕯️", name: "Candle", pay: [0.3, 1.2, 5] } },
        look: { W: { e: "👻", name: "SPIRIT WILD" }, W2: { e: "👻", name: "x2 WILD", cls: "sym-wild" }, W3: { e: "👻", name: "x3 WILD", cls: "sym-wild" } },
        w: { ...CARD_W, H1: 2, H2: 2.5, H3: 3, H4: 4, W: [0, 1.2, 1.2, 1.2, 0] },
        features: { swarm: { p: 0.02 }, pendulum: { p: 0.008 } },
        bgm: "organ_waltz",
        omens: [{ fx: "pop", chars: ["👻", "👻", "💀", "👻"] }, { fx: "shake", text: "🪧 The Ouija board is shaking crazily!" }, { fx: "rain", chars: ["🔥", "👻", "✨"] }],
        tests: [["swarm", "👻 SPECTRAL SWARM"], ["pendulum", "🕰️ CURSED PENDULUM"]]
    },
    // ------------------------------------------------ 7. Tower of Terror
    {
        id: "tower_of_terror", name: "Tower of Terror", brand: "Scrooge-Slots", engine: "sp_tower", progressive: false,
        jp: { MINI: { x: 20 }, MINOR: { x: 50 }, MAJOR: { x: 200 }, GRAND: { x: 1000 } },
        bets: [100, 200, 300, 500, 800, 1000], reels: 1, rows: 3, maxX: 1000, px: 0.401, jpDown: { MINOR: 0.4 },
        desc: "폭풍우 치는 처형탑. 단두대 칼날 아래 매달린 거대한 쇠 릴 하나, 가운데 한 줄만 지급! 해골·까마귀·성배·피의 루비 또는 직접 배수(5x~1,000x). 🔪 BLADE SLICE = 칼날이 떨어져 x2~x10 · 👻 PHANTOM NUDGE = 빈 판 위아래 고배당을 유령 손이 끌어내림 · 💀 NECROMANCER RESPIN = 빈 판이 나올 때까지 10단 사다리 리스핀 · 🌕 BLOOD MOON = 루비와 잭팟 메달만 남은 확정 대박 스핀",
        jpText: "🔪 BLADE x2~x10 · 👻 NUDGE · 💀 NECROMANCER LADDER · 🌕 BLOOD MOON MINI~GRAND",
        theme: { bg: "linear-gradient(180deg,#111827 0%,#450a0a 55%,#030712 100%)", accent: "#ef4444", glow: "#a3e635", font: "'Creepster', 'Lilita One', sans-serif" },
        skin: "tower",
        syms: { H1: { e: "🩸", name: "Blood Ruby", pay: [8] }, H2: { e: "💀", name: "Golden Skull", pay: [4] }, H3: { e: "🏆", name: "Chalice", pay: [2] }, H4: { e: "🐦‍⬛", name: "Crow", pay: [1] },
            X5: { e: "5x", name: "5x Multiplier", cls: "sym-gold", pay: [5] }, X25: { e: "25x", name: "25x Multiplier", cls: "sym-gold", pay: [25] }, X100: { e: "100x", name: "100x Multiplier", cls: "sym-gold", pay: [100] }, X1K: { e: "1000x", name: "1,000x Multiplier", cls: "sym-gold", pay: [1000] } },
        look: { ZB: sp("⬛", "Blank Iron Plate", "sym-blank"), ZJ: sp("🏅", "Jackpot Medallion") },
        w: { H1: 2, H2: 4, H3: 7, H4: 10, X5: 1.2, X25: 0.25, X100: 0.05, X1K: 0.006, ZB: 26 },
        features: { slice: { p: 0.03 }, nudge: { p: 0.02 }, necro: { p: 0.01 }, bloodmoon: { p: 0.004, tw: { MINI: 55, MINOR: 30, MAJOR: 12, GRAND: 3 } } },
        bgm: "organ_waltz",
        omens: [{ fx: "shake", text: "Spoooooooooky!!!!!!!!" }, { fx: "shake", text: "Booooooooooooooooooo!!!" }, { fx: "shake", text: "Scaryyyyyyyyyyyyyyyyyy!!!!" }],
        tests: [["slice", "🔪 BLADE SLICE"], ["nudge", "👻 PHANTOM NUDGE"], ["necro", "💀 NECROMANCER RESPIN"], ["bloodmoon", "🌕 BLOOD MOON"]]
    },
    // ------------------------------------------------ 8. The Bog
    {
        id: "the_bog", name: "The Bog", brand: "BLK", engine: "sp_bog", progressive: true,
        jp: PROG(30000, 300000, 1200000), bets: [100, 200, 300, 500, 800, 1000], reels: 5, rows: 3, maxX: 5000, px: 6.852, jpDown: { MAXI: 0.75 },
        desc: "달빛 늪 속 유리 물약 탱크. 갇힌 영혼·말린 머리·까마귀 깃털·수정이 공기방울에 싸여 떠올라 5x3으로 자리 잡는다 (20 LINES). 🫧 ECTOPLASM SURGE = 늪의 마녀가 가루를 던져 2x2/3x3 메가 버블 (고배당 또는 WILD 도깨비불) · 👻 SOUL POP CHAIN = 당첨이 터질 때마다 스피릿 버블이 x2/x3 WILD로 변하며 아래에서 새 심볼이 올라오는 연쇄 · 🧙‍♀️ BOG WITCH = 잭팟",
        theme: { bg: "linear-gradient(180deg,#1e1b4b 0%,#14532d 55%,#022c22 100%)", accent: "#a3e635", glow: "#c084fc", font: "'Creepster', 'Lilita One', sans-serif" },
        skin: "bubbles",
        syms: { ...Object.fromEntries(Object.entries(CARDS).map(([k, v]) => [k, { ...v, pay: v.pay.map(x => x * 0.4) }])),
            H1: { e: "👻", name: "Trapped Spirit", pay: [0.8, 4, 20] }, H2: { e: "💀", name: "Shrunken Head", pay: [0.6, 3, 12] }, H3: { e: "🪶", name: "Raven Feather", pay: [0.5, 2, 8] }, H4: { e: "🔮", name: "Glowing Crystal", pay: [0.4, 1.5, 6] } },
        look: { W: { e: "🔥", name: "WILL-O'-WISP" }, W2: { e: "🔥", name: "x2 WILD", cls: "sym-wild" }, W3: { e: "🔥", name: "x3 WILD", cls: "sym-wild" } },
        w: { ...CARD_W, H1: 2, H2: 2.5, H3: 3, H4: 3.5, W: [0, 1, 1, 1, 0] },
        features: { surge: { p: 0.015 }, soulpop: { p: 0.03 }, witch: { p: 0.0015, tw: { MINI: 50, MINOR: 30, MAXI: 13, MAJOR: 6, GRAND: 1 } } },
        bgm: "organ_waltz",
        omens: [{ fx: "rain", chars: ["🫧", "🫧", "🟢"] }, { fx: "flood" }],
        tests: [["surge", "🫧 ECTOPLASM SURGE"], ["soulpop", "👻 SOUL POP CHAIN"], ["witch", "🧙‍♀️ BOG WITCH 잭팟"]]
    },
    // ------------------------------------------------ 9. Cyber-Dial 2000: Midnight Payphone
    {
        id: "cyber_dial", name: "Cyber-Dial 2000: Midnight Payphone", brand: "YG GAMING", engine: "sp_cyberdial", progressive: true,
        jp: PROG(40000, 400000, 1500000), bets: [300, 500, 700, 1000, 1500, 2000], reels: 3, rows: 4, maxX: 5000, px: 2.404,
        desc: "비 내리는 네온 골목의 2000년대 폴더폰. 3x4 키패드(1~9, *, 0, #)에 DTMF 다이얼 톤과 함께 6~12개 버튼이 켜진다. 같은 아이콘 4개 이상이 가로·세로·대각선으로 이어지거나, 한 줄·대각선·네 모서리 패턴이면 당첨! 📞 SPEED-DIAL SURGE = 3~6키 동기화 + x2~x5 · ⌨️ T9 AUTO-CORRECT = 사이 버튼을 WILD 안테나로 · #️⃣ * 와 # 동시 점등 = SECRET CHEAT CODE 홀드앤스핀 (+1 스핀 배터리, MINI~GRAND 코드)",
        theme: { bg: "linear-gradient(180deg,#022c22 0%,#064e3b 45%,#020617 100%)", accent: "#4ade80", glow: "#f472b6", font: "'VT323', 'Lilita One', monospace" },
        skin: "keypad",
        syms: { H1: { e: "📱", name: "Brick Phone", pay: CL(0.9) }, H2: { e: "💲", name: "Dollar Sign", pay: CL(0.7) }, H3: { e: "💳", name: "SIM Card", pay: CL(0.5) }, H4: { e: "📶", name: "Signal Bars", pay: CL(0.4) },
            L1: { e: "🙂", name: "Smiley", pay: CL(0.25) }, L2: { e: "📟", name: "Pager", pay: CL(0.2) } },
        look: { W: { e: "📡", name: "WILD ANTENNA" }, ZS: sp("✱", "Star Key"), ZH: sp("#", "Hash Key"), ZC: sp("💾", "Cash Code") },
        w: { H1: 3, H2: 4, H3: 5, H4: 6, L1: 8, L2: 9, W: 0.7 },
        features: { speed: { p: 0.02 }, t9: { p: 0.02 }, cheat: { p: 0.004 } },
        bgm: "synthwave",
        omens: [{ fx: "shake", text: "🚨 Cyber Alert! 🚨" }, { fx: "burst", icon: "📶", chars: ["📶", "〰️", "📡"] }, { fx: "text", text: "📞 Answer the phone!!!!!!!!!!!!!" }],
        tests: [["speed", "📞 SPEED-DIAL SURGE"], ["t9", "⌨️ T9 AUTO-CORRECT"], ["cheat", "#️⃣ SECRET CHEAT CODE"]]
    },
    // ------------------------------------------------ 10. Sun-Drum Legacy
    {
        id: "sun_drum", name: "Sun-Drum Legacy", brand: "DAEBAK", engine: "sp_sundrum", progressive: true,
        jp: PROG(30000, 300000, 1200000), bets: [100, 200, 300, 500, 800, 1000], reels: 3, rows: 4, maxX: 5000, px: 0.226, fscale: { kente: 0.15 }, jpDown: { MAXI: 0.5 },
        desc: "니제르 강이 내려다보이는 노을빛 원형극장. 켄테 무늬 가죽을 씌운 거대한 젬베 북 위 세 개의 링(바깥·가운데·안쪽)이 서로 반대로 돌고, 바깥 테두리에서 중앙 태양까지 이어지는 방사형 스포크로 지급 (64 WAYS). 🥁 TALKING DRUM ECHO = 그리오의 일격으로 링 2~3개 동기화 + 조상 가면 WILD x2 · 🧵 KENTE LOOM WEAVE = 같은 심볼이 실로 엮여 스티키 + 리스핀 + 황금실 배수 · 🌞 GRIOT'S LEGACY = 잭팟",
        theme: { bg: "radial-gradient(circle at 50% 45%,#f59e0b 0%,#b45309 35%,#3b0764 100%)", accent: "#fde047", glow: "#f97316", font: "'Lilita One', sans-serif" },
        skin: "drum",
        syms: { H1: { e: "🐚", name: "Golden Cowrie", pay: [3] }, H2: { e: "🎭", name: "Brass Mask", pay: [2] }, H3: { e: "🪢", name: "Adinkra Knot", pay: [1.5] }, H4: { e: "🌳", name: "Baobab Tree", pay: [1] }, L1: { e: "🪕", name: "Kora Harp", pay: [0.6] }, L2: { e: "🥁", name: "Djembe", pay: [0.5] } },
        look: { W: { e: "🗿", name: "ANCESTRAL MASK WILD" } },
        w: { H1: 2, H2: 3, H3: 4, H4: 5, L1: 7, L2: 8, W: [0, 1.2, 0] },
        features: { echo: { p: 0.015 }, kente: { p: 0.03 }, griot: { p: 0.0015, tw: { MINI: 50, MINOR: 30, MAXI: 13, MAJOR: 6, GRAND: 1 } } },
        bgm: "banjo_country",
        omens: [{ fx: "shake", text: "🥁 African dance and music sound! 🥁" }, { fx: "burst", icon: "☀️", chars: ["☀️", "✨", "🔆"] }],
        tests: [["echo", "🥁 TALKING DRUM ECHO"], ["kente", "🧵 KENTE LOOM WEAVE"], ["griot", "🌞 GRIOT 잭팟"]]
    },
    // ------------------------------------------------ 11. 3 Strikes
    {
        id: "three_strikes", name: "3 Strikes", brand: "YG GAMING", engine: "sp_strikes", progressive: true,
        jp: { ...PROG(50000, 500000, 2000000), STRIKE: { seed: 150000, rate: 0.006, cap: 800000 } },
        bets: [100, 200, 300, 500, 800, 1000], reels: 5, rows: 3, maxX: 5000, px: 0.78, fscale: { ball: 0.025 }, jpDown: { STRIKE: 0.99, MAJOR: 0.95 },
        desc: "볼링장 레인 위 핀이 🎳 아이콘마다 하나씩 쌓여 최대 10개! 🎱 볼링공이 던져지면 쌓인 핀 수만큼 WILD를 뿌리고 핀은 1개로 — 10핀에서 터지면 STRIKE! · STRIKE 3회 = 큰 볼링공 + 10핀 3 STRIKES 홀드앤스핀 (10핀 모두 채우면 3 STRIKES 잭팟) · 🎳 핀 아이콘 6개 = 8x5 볼링핀 홀드앤스핀 (5줄 오픈, 🎱 볼링공이 나오면 잠긴 줄이 부서져 사라지고, STRIKE 핀이 나오면 STRIKE 카운트 +1) · SCATTER 3개 = 8 무료스핀",
        theme: { bg: "linear-gradient(180deg,#1e3a8a 0%,#7c2d12 60%,#0c0a09 100%)", accent: "#fde047", glow: "#f472b6", font: "'Lilita One', sans-serif" },
        skin: "lane",
        syms: { ...CARDS, H1: { e: "🏆", name: "Trophy", pay: [0.6, 2, 6] }, H2: { e: "👟", name: "Bowling Shoes", pay: [0.5, 1.5, 4] }, H3: { e: "🧢", name: "Team Cap", pay: [0.4, 1.2, 3] }, H4: { e: "🥤", name: "Soda", pay: [0.3, 1, 2.5] } },
        look: { W: { e: "⭐", name: "WILD" }, ZP: sp("🎳", "Bowling Pin"), ZB: sp("🎱", "Bowling Ball"), ZF: { e: "SCATTER", name: "Scatter", cls: "sym-special sym-word" }, ZC: sp("🎳", "Pin Coin"), ZX: sp("🔒", "Locked Row", "sym-lock") },
        w: { ...CARD_W, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.4, 1.4, 1.4, 0] },
        features: { pin: { p: 0.1 }, ball: { p: 0.012 }, free: { p: 0.005, spins: 8, sym: true }, pinhold: { p: 0.0035 }, strike3: { p: 0 } },
        bgm: "lounge_jazz",
        omens: [LUCKY, { fx: "shake" }, { fx: "burst", icon: "🎱", chars: ["🎳", "💥", "🎳"] }, { fx: "text", text: "STRIKE!!!" }, { fx: "rain", chars: ["🎳", "🎳", "🎳"] }],
        tests: [["ball", "🎱 볼링공 보너스"], ["pinhold", "🎳 볼링핀 홀드앤스핀"], ["strike3", "🎳🎳🎳 3 STRIKES 홀드앤스핀"], ["free", "SCATTER 8 무료스핀"]]
    },
    // ------------------------------------------------ 12. Vampire Bingo
    {
        id: "vampire_bingo", name: "Vampire Bingo", brand: "Rabbit-Gaming", engine: "sp_vampire", progressive: true,
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { seed: 40000, rate: 0.012 }, GRAND: { seed: 400000, rate: 0.02, cap: 1500000 } },
        bets: [100, 300, 500, 1000, 1500, 2000], reels: 5, rows: 3, maxX: 5000, px: 1.58, fscale: { bingo: 0.35 }, jpDown: { MINOR: 0.6, GRAND: 0.8 },
        desc: "릴에서 튀어나온 코인이 가운데 5x5 빙고판을 채운다. 빙고줄이 완성되면 '빙고!' — 줄 위 금액 코인을 모두 수령! 🎡 휠 코인(빙고당 최대 2개) = x2~x5씩 곱해 최대 x25 · 🦷 뱀파이어 코인(최대 5개) = 뒤집혀 MINI~MAJOR 잭팟 (MAJOR는 최대 2번) · 🦇 박쥐 코인(최대 3개) = 주변 코인까지 한 번에 수거 · 🍷 피의 잔 4개 = PICK ONE (MINI·MINOR·MINI x2·MINOR x2) · 🅱️ 빙고판 아이콘 3개 = 빙고 홀드앤스핀 (판이 꽉 차면 GRAND)",
        theme: { bg: "linear-gradient(180deg,#450a0a 0%,#7f1d1d 40%,#0c0a09 100%)", accent: "#fca5a5", glow: "#ef4444", font: "'Creepster', 'Lilita One', sans-serif" },
        skin: "bingo",
        syms: { ...CARDS, H1: { e: "🧛", name: "Vampire", pay: [0.6, 2, 6] }, H2: { e: "⚰️", name: "Coffin", pay: [0.5, 1.5, 4] }, H3: { e: "🩸", name: "Blood Drop", pay: [0.4, 1.2, 3] }, H4: { e: "🧄", name: "Garlic", pay: [0.3, 1, 2.5] } },
        look: { W: { e: "🌕", name: "WILD MOON" }, ZO: sp("🪙", "Bingo Coin"), ZU: sp("🍷", "Blood Cup"), ZG: sp("🅱️", "Bingo Board") },
        w: { ...CARD_W, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.4, 1.4, 1.4, 0] },
        features: { coins: { p: 0.3 }, cups: { p: 0.004, sym: true }, bingohold: { p: 0.003, sym: true } },
        bgm: "lounge_jazz",
        omens: [LUCKY, { fx: "shake" }, { fx: "text", text: "Bingoooooo!!" }, { fx: "wind", chars: ["🦇", "🦇", "🦇"] }, { fx: "burst", icon: "🧛", chars: ["🍷", "🩸", "🍷"] }, { fx: "burst", icon: "🦷", chars: ["🩸", "💥", "🩸"], shake: true }],
        tests: [["cups", "🍷 PICK ONE"], ["bingohold", "🅱️ 빙고 홀드앤스핀"]]
    },
    // ------------------------------------------------ 13. Pay Day
    {
        id: "pay_day", name: "Pay Day", brand: "IPEX", engine: "sp_payday", progressive: true,
        jp: PROG(100000, 1000000, 4000000), bets: [1000, 2000, 3000, 5000], reels: 5, rows: 3, maxX: 3000, px: 2.12, jpDown: { MAXI: 0.85, MAJOR: 0.6, MINOR: 0.5 },
        desc: "월급날! 릴에서 던져진 돈이 하얀 돈봉투 두 개(福·到)를 가득 채운다. 福 봉투가 터지면 PLINKO TREE — 🟡 구슬 3개를 떨어뜨려 x2~x5 범퍼에 닿는 순간 그 자리에서 즉시 상금(배수 x2 베팅) · 到 봉투 = 🔴 구슬이 JACKPOT 범퍼에 닿으면 바로 잭팟 · 福到 동시 = 배수 + JACKPOT 범퍼 모두! · ✉️ PAYCHECK 3개 = MATCH 3 (그랜드는 여기서만)",
        theme: { bg: "linear-gradient(180deg,#14532d 0%,#166534 40%,#052e16 100%)", accent: "#fde047", glow: "#ef4444", font: "'Lilita One', sans-serif" },
        skin: "money",
        syms: { ...CARDS, H1: { e: "💰", name: "Money Bag", pay: [0.6, 2, 6] }, H2: { e: "💵", name: "Cash Stack", pay: [0.5, 1.5, 4] }, H3: { e: "🧧", name: "Red Envelope", pay: [0.4, 1.2, 3] }, H4: { e: "🪙", name: "Gold Coin", pay: [0.3, 1, 2.5] } },
        look: { W: { e: "💸", name: "PAYDAY WILD" }, ZE: sp("✉️", "Paycheck") },
        w: { ...CARD_W, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.4, 1.4, 1.4, 0] },
        features: { fu: { p: 0.006 }, dao: { p: 0.004 }, both: { p: 0.0015 }, match3: { p: 0.002, sym: true, tw: { MINI: 45, MINOR: 30, MAXI: 15, MAJOR: 8, GRAND: 2 } } },
        bgm: "monkey_funk",
        omens: [LUCKY, { fx: "shake" }, { fx: "rain", chars: ["💵", "💸", "💵"] }, { fx: "text", text: "💌 Here is your paycheck!!" }, { fx: "rain", chars: ["🪙", "🪙", "🪙"] }],
        tests: [["fu", "福 PLINKO"], ["dao", "到 잭팟 PLINKO"], ["both", "福到 동시"], ["match3", "✉️ PAYCHECK MATCH 3"]]
    },
    // ------------------------------------------------ 14. Jokers
    {
        id: "jokers", name: "Jokers", brand: "CLOVER-TECH", engine: "sp_jokers", progressive: true,
        jp: { ...PROG(50000, 500000, 2000000), JOKER: { seed: 15000, rate: 0.004, cap: 45000 } },
        bets: [100, 200, 300, 400, 500, 800, 1000], reels: 5, rows: 3, maxX: 5000, px: 0.975, fscale: { joker: 0.025 }, jpDown: { JOKER: 0.6, MAXI: 0.5 },
        desc: "가운데에 뒤집힌 포커 카드 5장이 놓인 조커 카지노. SCATTER 3개 = 5 무료스핀 (조커 카드가 나올 때마다 +1, 한 스핀 최대 +3, 최대 50) · 👑 K·Q 카드 3개 = 카드 1장 고르기 · 🂡 A 카드 3개 = 카드 3장 고르기 (상금·잭팟·조커휠) · 🎡 조커휠 = +1 SPIN이 나오면 계속! · 🃏 조커 3개 = Joker's Wild 카드 3장, 장마다 WILD 5~15개를 릴에 뿌린다 (JOKER 잭팟)",
        theme: { bg: "linear-gradient(180deg,#14532d 0%,#065f46 40%,#022c22 100%)", accent: "#facc15", glow: "#a855f7", font: "'Lilita One', sans-serif" },
        skin: "felt",
        syms: { J: CARDS.J, T: CARDS.T, H1: { e: "🎩", name: "Top Hat", pay: [0.6, 2, 6] }, H2: { e: "🎲", name: "Dice", pay: [0.5, 1.5, 4] }, H3: { e: "💍", name: "Ring", pay: [0.4, 1.2, 3] }, H4: { e: "🍸", name: "Cocktail", pay: [0.3, 1, 2.5] }, L1: { e: "♠️", name: "Spade", pay: [0.1, 0.25, 0.6] }, L2: { e: "♥️", name: "Heart", pay: [0.1, 0.25, 0.6] } },
        look: { W: { e: "🌟", name: "WILD" }, ZF: { e: "SCATTER", name: "Scatter", cls: "sym-special sym-word" }, ZJ: sp("🃏", "Joker"), ZA: { e: "A", name: "Ace Card", cls: "sym-special sym-card-gold" }, ZK: { e: "K", name: "King Card", cls: "sym-special sym-card-gold" }, ZQ: { e: "Q", name: "Queen Card", cls: "sym-special sym-card-gold" } },
        w: { J: 6.5, T: 7, L1: 6, L2: 6, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.4, 1.4, 1.4, 0] },
        features: { free: { p: 0.005, spins: 5, sym: true }, kq: { p: 0.006, sym: true }, ace: { p: 0.003, sym: true }, joker: { p: 0.003, sym: true } },
        bgm: "lounge_jazz",
        omens: [LUCKY, { fx: "shake" }, { fx: "shake", text: "🍀 Lucky has arrived 🍀" }, { fx: "text", text: "🃏 Joker is on your side!" }, { fx: "rain", chars: ["🃏", "🃏", "🂠"] }],
        tests: [["free", "SCATTER 무료스핀"], ["kq", "👑 킹/퀸 보너스"], ["ace", "🂡 에이스 보너스"], ["joker", "🃏 조커 보너스"]]
    },
    // ------------------------------------------------ 15. Coin Claw
    {
        id: "coin_claw", name: "Coin Claw", brand: "DAEBAK", engine: "sp_coinclaw", progressive: true,
        jp: PROG(100000, 1000000, 4000000), bets: [1000, 2000, 3000, 4000, 5000], reels: 5, rows: 3, maxX: 3000, px: 2.15,
        desc: "반짝이는 인형뽑기 기계 안에 물음표 공·휠 공·FREE SPIN 공·잭팟 공이 가득! 🦾 집게 아이콘 3개 = 버튼을 눌러 공 뽑기 — FREE SPIN 공 = 10 무료스핀(최대 50, 무료스핀 중 집게가 또 나오면 계속 뽑기) · 휠 공 = 3x~50x 휠 · ❓ 공 = 2x~30x 상금 · 잭팟 공 = MINI~GRAND · 🟡 상금 공 6개 = 홀드앤스핀 (도중에 집게가 나오면 나온 집게마다 순서대로 공을 뽑아 그 상금을 집게 안에 표시)",
        theme: { bg: "linear-gradient(180deg,#be185d 0%,#1d4ed8 60%,#0c0a09 100%)", accent: "#fde047", glow: "#38bdf8", font: "'Lilita One', sans-serif" },
        skin: "claw",
        syms: { ...CARDS, H1: { e: "🧸", name: "Teddy", pay: [0.6, 2, 6] }, H2: { e: "🐰", name: "Bunny Plush", pay: [0.5, 1.5, 4] }, H3: { e: "🎀", name: "Ribbon", pay: [0.4, 1.2, 3] }, H4: { e: "🍭", name: "Lollipop", pay: [0.3, 1, 2.5] } },
        look: { W: { e: "🍀", name: "LUCKY WILD" }, ZW: sp("🦾", "Claw"), ZC: sp("🟡", "Prize Ball") },
        w: { ...CARD_W, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.4, 1.4, 1.4, 0] },
        features: { claw: { p: 0.012, spins: 10, sym: true }, hold: { p: 0.004, sym: true } },
        bgm: "lounge_jazz",
        omens: [LUCKY, { fx: "shake" }, { fx: "burst", icon: "🦾", chars: ["✨", "🦾", "✨"] }, { fx: "rain", chars: ["❓", "🔮", "❓"] }, { fx: "rain", chars: ["🍀", "🍀", "☘️"] }],
        tests: [["claw", "🦾 집게 보너스"], ["hold", "🟡 홀드앤스핀"], ["hold:claw", "🟡 홀드앤스핀 (집게 여러 개)"]]
    },
    // ------------------------------------------------ 16. Cathedral of Wings
    {
        id: "cathedral_wings", name: "Cathedral of Wings", brand: "IPEX", engine: "sp_cathedral", progressive: true,
        jp: PROG(40000, 400000, 1500000), bets: [100, 200, 300, 500, 800, 1000], reels: 6, rows: 4, maxX: 5000, px: 4.69,
        desc: "햇살 가득한 고딕 종탑의 거대한 원형 스테인드글라스 장미창 (유리 조각 24장). 빛나는 하얀 비둘기 떼가 유리를 가로지르며 같은 색 유리 5장 이상이 이어지면 반짝이며 사라진다 (CLUSTER 5+ · CASCADE). 🕊️ FLOCK SCATTER = 종소리에 놀란 비둘기가 5~10장을 x2 WILD로 · 😇 HALO RESONANCE = 중앙 메달리온 클러스터에서 햇살이 바퀴살을 따라 당첨 심볼 복제 · 🪶 FEATHER DRIFT = 아깝게 빗나가면 깃털이 내려앉아 색을 맞춰 무료 캐스케이드 · 🔔 종 3개 = BELL TOWER 잭팟",
        theme: { bg: "radial-gradient(circle at 50% 30%,#fef3c7 0%,#b45309 30%,#1e1b4b 75%,#0f0a1e 100%)", accent: "#fde68a", glow: "#f0abfc", font: "'Lilita One', sans-serif" },
        skin: "glass",
        syms: { H1: { e: "🕊️", name: "White Dove", pay: CL(1.0) }, H2: { e: "👼", name: "Cherub", pay: CL(0.6) }, H3: { e: "🌹", name: "Rose", pay: CL(0.45) },
            L1: { e: "🟦", name: "Blue Glass", pay: CL(0.2) }, L2: { e: "🟥", name: "Red Glass", pay: CL(0.16) }, L3: { e: "🟩", name: "Green Glass", pay: CL(0.14) }  },
        look: { W: { e: "✝️", name: "LIGHT WILD" }, W2: { e: "🕊️", name: "x2 WILD", cls: "sym-wild" }, ZB: sp("🔔", "Bell") },
        w: { H1: 5, H2: 6, H3: 7, L1: 10, L2: 10.5, L3: 11, W: 1 },
        features: { flock: { p: 0.003 }, halo: { p: 0.0025 }, feather: { p: 0.004 }, bells: { p: 0.0008, sym: true, tw: { MINI: 45, MINOR: 30, MAXI: 15, MAJOR: 8, GRAND: 2 } } },
        bgm: "monkey_funk",
        omens: [{ fx: "big", icon: "😇", cls: "rise", text: "🍀 Lucky has arrived 🍀" }, { fx: "rise", chars: ["😇", "⭕", "✨", "🕊️"], shake: true }, { fx: "big", icon: "☀️", cls: "light" }],
        tests: [["flock", "🕊️ FLOCK SCATTER"], ["halo", "😇 HALO RESONANCE"], ["feather", "🪶 FEATHER DRIFT RESPIN"], ["bells", "🔔 BELL TOWER 잭팟"]]
    },
    // ------------------------------------------------ 17. The Velvet Table
    {
        id: "velvet_table", name: "The Velvet Table", brand: "DAEBAK", engine: "sp_velvet", progressive: true,
        jp: PROG(80000, 800000, 3000000), bets: [200, 400, 500, 1000, 2000], reels: 4, rows: 4, maxX: 5000, px: 0.385,
        desc: "몬테카를로 지하 VIP 금고. 팔각형 펠트 테이블의 금테 카드 슬롯 16칸에 황동 딜러 팔이 칩·다이아 반지·골드바를 시계방향으로 빠르게 깔아준다 (4x4 · 256 WAYS). 🧤 ALL-IN SWEEP = 벨벳 장갑이 ALL-IN 명패를 내리치며 저가 칩을 전부 골드바로 · 🪙 THE HOUSE CUT = 당첨 핸드를 갈퀴가 중앙 팟으로 쓸어 담아 2배 + 무료 RE-DEAL 1회 · 💎 VIP 칩 3개 = VIP VAULT 잭팟",
        theme: { bg: "radial-gradient(ellipse at 50% 40%,#14532d 0%,#052e16 45%,#1c0a0a 100%)", accent: "#facc15", glow: "#dc2626", font: "'Lilita One', sans-serif" },
        skin: "velvet",
        syms: { H1: { e: "🧈", name: "Gold Bar", cls: "sym-gold", pay: [1, 4] }, H2: { e: "💍", name: "Diamond Ring", pay: [0.8, 3] }, H3: { e: "🍾", name: "Champagne", pay: [0.6, 2] }, H4: { e: "🎲", name: "Ivory Dice", pay: [0.5, 1.5] },
            L1: { e: "🔴", name: "Red Chip", pay: [0.2, 0.6] }, L2: { e: "🔵", name: "Blue Chip", pay: [0.15, 0.5] }, L3: { e: "🟢", name: "Green Chip", pay: [0.15, 0.5] } },
        look: { W: { e: "🎩", name: "DEALER WILD" }, ZV: sp("💎", "VIP Chip") },
        w: { H1: 3, H2: 3.5, H3: 4, H4: 4.5, L1: 7, L2: 7, L3: 7.5, W: [0, 1.2, 1.2, 0] },
        features: { allin: { p: 0.003 }, housecut: { p: 0.006 }, vip: { p: 0.0008, sym: true, tw: { MINI: 45, MINOR: 30, MAXI: 15, MAJOR: 8, GRAND: 2 } } },
        bgm: "monkey_funk",
        omens: [{ fx: "shake", text: "🍀 Lucky has arrived 🍀 · BIG TREMBLE" }, { fx: "burst", icon: "💸", chars: ["💵", "💴", "💶", "💷"] }],
        tests: [["allin", "🧤 ALL-IN SWEEP"], ["housecut", "🪙 THE HOUSE CUT"], ["vip", "💎 VIP VAULT 잭팟"]]
    },
    // ------------------------------------------------ 18. Astro-Diner 5099
    {
        id: "astro_diner", name: "Astro-Diner 5099", brand: "Scrooge-Slots", engine: "sp_astro", progressive: false, jp: null,
        bets: [100, 200, 300, 500, 800, 1000], reels: 5, rows: 4, maxX: 3000, px: 0.736,
        desc: "소행성 위 유리 돔 속 1950년대 원자력 시대 콜로니. 4층짜리 미래형 아파트 겸 다이너의 단면, 20개 창문에 진공 튜브가 외계 식료품·광선총·로봇 펫을 쏘아 보낸다 (5x4 · 1024 WAYS). 🌀 GRAVITY GLITCH = 중력 발생기가 깜빡여 모두 꼭대기 층으로 떠올라 HOVER-CAR WILD로 · 🛸 UFO DELIVERY = 작은 비행접시가 중앙 아파트에 2x2/3x3 메가 심볼 전송 · ☄️ METEOR SHOWER = 유성이 창문을 때려 x2/x3/x5 배수",
        jpText: "🌀 GRAVITY GLITCH · 🛸 UFO DELIVERY 2x2/3x3 · ☄️ METEOR SHOWER x2~x5",
        theme: { bg: "radial-gradient(circle at 50% 20%,#0e7490 0%,#312e81 45%,#020617 100%)", accent: "#5eead4", glow: "#f472b6", font: "'Lilita One', sans-serif" },
        skin: "dome",
        syms: { A: CARDS.A, K: CARDS.K, Q: CARDS.Q, J: CARDS.J, H1: { e: "👽", name: "Alien Chef", pay: [0.6, 2, 6] }, H2: { e: "🤖", name: "Robot Pet", pay: [0.5, 1.5, 4] }, H3: { e: "🔫", name: "Raygun", pay: [0.4, 1.2, 3] }, H4: { e: "🍔", name: "Astro Burger", pay: [0.3, 1, 2.5] } },
        look: { W: { e: "🚗", name: "HOVER-CAR WILD" } },
        w: { A: 6, K: 6, Q: 6.5, J: 6.5, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.2, 1.2, 1.2, 0] },
        features: { gravity: { p: 0.002 }, ufo: { p: 0.004 }, meteor: { p: 0.0045 } },
        bgm: "synthwave",
        omens: [{ fx: "big", icon: "🚀", cls: "fly" }, { fx: "shake", text: "👽 ALIEN WARNING!!!!!!!!!!!" }, { fx: "wind", chars: ["🛸", "🛸", "🛸", "✨"] }],
        tests: [["gravity", "🌀 GRAVITY GLITCH"], ["ufo", "🛸 UFO DELIVERY"], ["meteor", "☄️ METEOR SHOWER"]]
    },
    // ------------------------------------------------ 19. Lilypad Leap
    {
        id: "lilypad_leap", name: "Lilypad Leap", brand: "HYHG GAMING", engine: "sp_lilypad", progressive: true,
        jp: { ...PROG(150000, 1500000, 6000000), LOTUS: { seed: 600000, rate: 0.006, cap: 2500000 } }, bets: [300, 1000, 2000, 3000, 5000], reels: 5, rows: 5, maxX: 3000, px: 3.67,
        desc: "달빛 비치는 열대우림 연못을 위에서 내려다본 모습. 기둥 대신 연잎 19장이 벌집 모양(3-4-5-4-3)으로 떠 있고, 반딧불·잠자리·황금 딱정벌레가 매 라운드 내려앉는다 (CLUSTER 4+). 👅 TONGUE LASH = 황소개구리 혀가 흩어진 황금 딱정벌레 최대 6마리를 한데 끌어모아 확정 당첨 · 💧 POND RIPPLE SYNC = 중앙 연잎에 빗방울, 물결이 닿은 잎이 모두 같은 심볼로 · 🪷 TADPOLE SWARM = 올챙이 떼가 연잎 3~5장을 들어올려 숨은 연꽃 즉시 상금 · 🪷 GOLDEN LOTUS = 특수 잭팟 (연꽃 아래에서만)",
        theme: { bg: "radial-gradient(circle at 50% 40%,#065f46 0%,#064e3b 40%,#020617 100%)", accent: "#86efac", glow: "#fde047", font: "'Lilita One', sans-serif" },
        skin: "pond",
        syms: { H1: { e: "🪲", name: "Golden Beetle", cls: "sym-gold", pay: CL(0.9) }, H2: { e: "🐸", name: "Tree Frog", pay: CL(0.6) }, H3: { e: "🐞", name: "Ladybug", pay: CL(0.45) },
            L1: { e: "✨", name: "Firefly", pay: CL(0.2) }, L2: { e: "🍃", name: "Leaf", pay: CL(0.16) }, L3: { e: "💧", name: "Dewdrop", pay: CL(0.14) } },
        look: { W: { e: "🌕", name: "MOON WILD" }, ZL: sp("🪷", "Lotus Flower") },
        w: { H1: 4, H2: 5, H3: 6, L1: 9, L2: 9.5, L3: 10, W: 0.7 },
        features: { tongue: { p: 0.0035 }, ripple: { p: 0.0035 }, tadpole: { p: 0.003 } },
        bgm: "celestial_brass",
        omens: [{ fx: "frogs" }, { fx: "big", icon: "🍃", cls: "cover" }],
        tests: [["tongue", "👅 TONGUE LASH"], ["ripple", "💧 POND RIPPLE SYNC"], ["tadpole", "🪷 TADPOLE SWARM"]]
    },
    // ------------------------------------------------ 20. Gridlock Rush Hour
    {
        id: "gridlock_rush", name: "Gridlock Rush Hour", brand: "CLOVER-TECH", engine: "sp_gridlock", progressive: true,
        jp: PROG(40000, 400000, 1500000), bets: [100, 200, 300, 500, 800, 1000], reels: 4, rows: 4, maxX: 5000, px: 0.464,
        desc: "헬리콥터에서 내려다본 1970년대 뉴욕 사거리. 릴 대신 4개 차선에서 옐로캡·지하철·배달 트럭·순찰차가 들어와 4x4 교통 격자에 멈춰 선다 (256 WAYS). 🚦 GREEN LIGHT EXPRESS = 신호가 모두 초록불, 멈춘 민간 차량을 치우고 현금수송차 WILD 행렬이 한 차선을 관통 · 🕳️ SUBWAY RUMBLE = 지하철이 지나가며 x2~x4 맨홀 뚜껑 배수 · 🚁 HELICOPTER SPOTLIGHT = 서치라이트 안의 차량을 고정하고 무료 리스핀 · 🚨 경광등 3개 = PRECINCT 잭팟",
        theme: { bg: "linear-gradient(180deg,#1f2937 0%,#111827 60%,#030712 100%)", accent: "#facc15", glow: "#22d3ee", font: "'Lilita One', sans-serif" },
        skin: "street",
        syms: { H1: { e: "🚕", name: "Yellow Cab", pay: [1, 4] }, H2: { e: "🚇", name: "Subway Car", pay: [0.8, 3] }, H3: { e: "🚚", name: "Delivery Truck", pay: [0.6, 2] }, H4: { e: "🚓", name: "Police Cruiser", pay: [0.5, 1.5] },
            L1: { e: "🚗", name: "Sedan", pay: [0.2, 0.6] }, L2: { e: "🛵", name: "Scooter", pay: [0.15, 0.5] }, L3: { e: "🚲", name: "Bicycle", pay: [0.15, 0.5] } },
        look: { W: { e: "🚐", name: "ARMORED TRUCK WILD" }, ZP: sp("🚨", "Police Siren") },
        w: { H1: 3, H2: 3.5, H3: 4, H4: 4.5, L1: 7, L2: 7, L3: 7.5, W: [0, 1.2, 1.2, 0] },
        features: { green: { p: 0.0025 }, subway: { p: 0.0035 }, heli: { p: 0.0035 }, badge: { p: 0.0008, sym: true, tw: { MINI: 45, MINOR: 30, MAXI: 15, MAJOR: 8, GRAND: 2 } } },
        bgm: "tropical_steel",
        omens: [{ fx: "shake", text: "🌃 NEON LIGHTS ARE SHINING 🌃" }, { fx: "big", icon: "📸", cls: "flash" }],
        tests: [["green", "🚦 GREEN LIGHT EXPRESS"], ["subway", "🕳️ SUBWAY RUMBLE"], ["heli", "🚁 HELICOPTER SPOTLIGHT"], ["badge", "🚨 PRECINCT 잭팟"]]
    },
    // ================================================ round 6
    // ------------------------------------------------ 21. Rotate The Helm!
    {
        id: "rotate_helm", name: "Rotate The Helm!", brand: "BLK", engine: "sp_helm", progressive: true,
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { seed: 60000, rate: 0.01 }, GRAND: { seed: 600000, rate: 0.02, cap: 2400000 } },
        bets: [200, 400, 600, 800, 1000], reels: 5, rows: 3, maxX: 5000, px: 1.5,
        desc: "비 내리는 바다 한가운데 돛을 내린 배 두 척 (GROW REELS · GROW CASH)이 흔들린다. ⛵ 돛 아이콘이 던져지면 배의 돛이 천천히 올라가고, 끝까지 오르면 배가 요동치며 보너스 발동! ⛵ GROW REELS = 5 무료스핀, 스핀마다 릴이 위로 1줄씩 늘어 마지막엔 8줄 · ⛵ GROW CASH = 5 무료스핀, WILD가 STICKY WILD로 쌓인다 · ⛵⛵ 동시 = 8줄까지 늘어나는 릴 + STICKY WILD · ☸️ 키(Helm) 3개 = 8 무료스핀 (도중에 GROW 보너스 발동 가능) · 🛖 SHIPWRECK = 조가비 3개 중 하나를 골라 MINI~GRAND 잭팟",
        theme: { bg: "linear-gradient(180deg,#334155 0%,#1e3a8a 45%,#0c4a6e 70%,#082f49 100%)", accent: "#7dd3fc", glow: "#facc15", font: "'Lilita One', sans-serif" },
        skin: "sea",
        syms: { ...CARDS, H1: { e: "🏴‍☠️", name: "Jolly Roger", pay: [0.6, 2, 6] }, H2: { e: "⚓", name: "Anchor", pay: [0.5, 1.5, 4] }, H3: { e: "🦜", name: "Parrot", pay: [0.4, 1.2, 3] }, H4: { e: "🧭", name: "Compass", pay: [0.3, 1, 2.5] } },
        look: { W: { e: "🔱", name: "TRIDENT WILD" }, ZH: sp("☸️", "Helm"), ZS: sp("⛵", "Sail") },
        w: { ...CARD_W, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.3, 1.3, 1.3, 0] },
        features: { free: { p: 0.004, spins: 8, grow: 0.12, sym: true }, growreels: { p: 0.002 }, growcash: { p: 0.002 }, growboth: { p: 0.0008 }, shipwreck: { p: 0.0012, tw: { MINI: 55, MINOR: 30, MAJOR: 12, GRAND: 3 } } },
        bgm: "tropical_steel",
        omens: [LUCKY, { fx: "shake" }, { fx: "shake", text: "⛵ Hoist the Sail..........!" }, { fx: "shake", text: "☸️ Rotate the Helm.......!" },
            { fx: "rise", chars: ["🐟", "🐠", "🌊", "🐡"], shake: true, text: "🌊 물이 차오른다!!" }, { fx: "big", icon: "🛖", cls: "rise", text: "SHIPWRECK!!!", only: "shipwreck" }],
        tests: [["free", "☸️ HELM 8 무료스핀"], ["growreels", "⛵ GROW REELS"], ["growcash", "⛵ GROW CASH"], ["growboth", "⛵⛵ GROW REELS & CASH"], ["shipwreck", "🐚 SHIPWRECK 잭팟"]]
    },
    // ------------------------------------------------ 22. Smash The Bricks
    {
        id: "smash_bricks", name: "Smash The Bricks", brand: "CLOUD GAMING", engine: "sp_bricks", progressive: true, spinLabel: "🔨 TAP",
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { seed: 150000, rate: 0.01 }, GRAND: { seed: 1500000, rate: 0.02, cap: 6000000 } },
        bets: [500, 1000, 1500, 2000, 3000], reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "공사장 한가운데 3x5 벽돌벽! 릴 없이 🔨 TAP을 누를 때마다 망치가 벽돌을 깬다. 벽돌 뒤에는 2x2 크기의 판이 숨어 있고, 판이 완전히 드러나면 바로 지급 — JACKPOT 판 = MINI~GRAND 잭팟 · 상금 판 = 1,000G~10,000G (최소 베팅 기준, 베팅에 비례) · MULTIPLY 판 = 베팅 x2~x10 · 💥 TOTAL SMASH = 한 번에 벽 전체가 무너져 모든 판을 한꺼번에! · 판을 모두 받거나 벽돌이 다 깨지면 새 벽돌벽과 새 보너스로 교체",
        theme: { bg: "repeating-linear-gradient(135deg,#facc15 0 18px,#1c1917 18px 36px)", accent: "#facc15", glow: "#f97316", font: "'Lilita One', sans-serif" },
        skin: "brick",
        syms: {},
        look: { ZB: sp("🧱", "Brick", "sym-special sym-brick"), Y: { e: "", name: "Rubble", cls: "sym-rubble" },
            ...Object.fromEntries(["ZJ", "ZC", "ZM"].flatMap(k => [0, 1, 2, 3].map(q => [k + q, { e: "", name: k === "ZJ" ? "Jackpot Plate" : k === "ZC" ? "Cash Plate" : "Multiply Plate", cls: `sym-special sym-tile t-${k.slice(1).toLowerCase()} q${q}` }]))) },
        w: {},
        features: { tile: { p: 0.133 }, smashall: { p: 0.004 }, jp: { p: 0, tw: { MINI: 62, MINOR: 31, MAJOR: 6, GRAND: 1 } }, cash: { p: 0 }, mult: { p: 0 } },
        bgm: "lounge_jazz",
        omens: [LUCKY, { fx: "big", icon: "🔨", cls: "flash" }, { fx: "rain", chars: ["⛑️", "⛑️", "👷"] }, { fx: "shake", text: "💥 Smashed.................??!!" }],
        tests: [["jp", "🔨 JACKPOT 판"], ["cash", "💰 상금 판"], ["mult", "✖️ MULTIPLY 판"], ["smashall", "💥 TOTAL SMASH (전부 부수기)"]]
    },
    // ------------------------------------------------ 23. Classic Mania
    {
        id: "classic_mania", name: "Classic Mania", brand: "Classic Gaming", engine: "sp_classic", progressive: false, jp: null,
        bets: [300, 600, 900, 1200, 1500], reels: 3, rows: 3, maxX: 3000, px: 2.36,
        desc: "3릴 · 3 PAYLINE 고전 과일 슬롯. 🎰 FREE BONUS 3개 = 8 무료스핀 · 7️⃣ 세 개가 한 줄 = 베팅 x7 즉시 지급 · 📌 STICKY WILD 3개 = 3 무료스핀 (나온 WILD는 끝까지 고정) · 🍀 네잎클로버 3개 = 클로버 3개 중 PICK ONE (x3~x10) · 🍒 체리 3개 = 최고의 보너스, 체리 3개 중 PICK ONE (x30~x100)",
        jpText: "🍒 CHERRY x30~x100 · 🍀 CLOVER x3~x10 · 7️⃣7️⃣7️⃣ x7 · 📌 STICKY WILD · 🎰 FREE BONUS",
        theme: { bg: "radial-gradient(circle at 50% 30%,#b91c1c 0%,#7f1d1d 45%,#1c0505 100%)", accent: "#fde047", glow: "#f87171", font: "'Lilita One', sans-serif" },
        skin: "classic",
        syms: { H1: { e: "BAR", name: "Triple Bar", cls: "sym-bar", pay: [20] }, H2: { e: "🔔", name: "Bell", pay: [10] }, H3: { e: "🍉", name: "Watermelon", pay: [6] }, L1: { e: "🍋", name: "Lemon", pay: [3] }, L2: { e: "🍊", name: "Orange", pay: [2.5] }, L3: { e: "🍇", name: "Grapes", pay: [2] } },
        look: { W: { e: "⭐", name: "WILD" }, ZS: { e: "7", name: "Lucky Seven", cls: "sym-special sym-seven" }, ZF: { e: "FREE BONUS", name: "Free Bonus", cls: "sym-special sym-word" }, ZK: { e: "STICKY WILD", name: "Sticky Wild", cls: "sym-special sym-word" }, ZL: sp("🍀", "Four-leaf Clover"), ZC: sp("🍒", "Cherry") },
        w: { H1: 1.6, H2: 2.4, H3: 3.2, L1: 4.4, L2: 4.8, L3: 5.2, W: 0.5, ZS: 0.9, ZF: 0.5, ZK: 0.5, ZL: 0.5, ZC: 0.35 },
        features: { free: { p: 0.003, spins: 8, sym: true }, seven: { p: 0.003 }, sticky: { p: 0.0025, sym: true }, clover: { p: 0.0015, sym: true }, cherry: { p: 0.0004, sym: true } },
        bgm: "lounge_jazz",
        omens: [LUCKY, { fx: "shake" }, { fx: "shake", text: "💰 Let's win some money........!!" }, { fx: "rain", chars: ["7️⃣", "7️⃣", "7️⃣"] }],
        tests: [["free", "🎰 FREE BONUS 8 무료스핀"], ["seven", "7️⃣7️⃣7️⃣ x7"], ["sticky", "📌 STICKY WILD 3 스핀"], ["clover", "🍀 클로버 PICK"], ["cherry", "🍒 체리 PICK"]]
    },
    // ------------------------------------------------ 24. The Mimic's Labyrinth
    {
        id: "mimic_labyrinth", name: "The Mimic's Labyrinth", brand: "CLOUD GAMING", engine: "sp_mimic", progressive: true,
        jp: PROG(60000, 600000, 2400000), bets: [200, 500, 800, 1000, 1200], reels: 5, rows: 5, maxX: 5000, px: 2.93,
        desc: "횃불이 일렁이는 돌 던전 바닥, 25개의 압력판이 5x5 마름모로 깔려 있다. 스핀하면 무거운 돌판이 가라앉았다 룬·마법검·물약·금화가 새겨진 채 솟아오른다 (CLUSTER 5+). 🗡️ SPIKE TRAP PURGE = 숨은 가시가 룬 타일을 모두 부수고 보물 타일이 굴러 내려온다 · 🧰 MIMIC AMBUSH = 보물상자가 이빨을 드러내 주변 타일을 씹어먹고 STICKY WILD 코인을 뱉는다 · 🔥 TORCHLIGHT EXPANSION = 푸른 용의 불꽃이 테두리 16장을 같은 고급 심볼로 · 🗝️ DUNGEON KEY = 철창 4개 중 하나를 열어 MINI~GRAND 유물 잭팟",
        theme: { bg: "radial-gradient(circle at 50% 45%,#78350f 0%,#292524 45%,#0c0a09 100%)", accent: "#fbbf24", glow: "#38bdf8", font: "'Lilita One', sans-serif" },
        skin: "dungeon",
        syms: { H1: { e: "💰", name: "Gold Coins", pay: CL(0.9) }, H2: { e: "🗡️", name: "Enchanted Sword", pay: CL(0.7) }, H3: { e: "🧪", name: "Potion Flask", pay: CL(0.55) }, H4: { e: "🛡️", name: "Shield", pay: CL(0.45) },
            L1: { e: "ᚠ", name: "Fehu Rune", cls: "sym-rune", pay: CL(0.2) }, L2: { e: "ᚱ", name: "Raido Rune", cls: "sym-rune", pay: CL(0.16) }, L3: { e: "ᛟ", name: "Othala Rune", cls: "sym-rune", pay: CL(0.14) } },
        look: { W: { e: "🪙", name: "STICKY WILD COIN" }, W2: { e: "🧰", name: "x2 MIMIC WILD", cls: "sym-wild" }, ZM: sp("🧰", "Mimic Chest"), ZK: sp("🗝️", "Skeleton Key") },
        w: { H1: 4, H2: 5, H3: 6, H4: 6.5, L1: 9, L2: 9.5, L3: 10, W: 0.6 },
        features: { spike: { p: 0.003 }, mimic: { p: 0.003 }, torch: { p: 0.0025 }, dkey: { p: 0.001, tw: { MINI: 45, MINOR: 30, MAXI: 15, MAJOR: 8, GRAND: 2 } } },
        bgm: "celestial_brass",
        omens: [{ fx: "shake", text: "🪨 Dungeon is collapsing!! 🪨" }, { fx: "rain", chars: ["🪨", "🪨", "🧱"], text: "🍀 Lucky has arrived 🍀" }, { fx: "shake", text: "⛓️ Dungeon gates are opening up..." }],
        tests: [["spike", "🗡️ SPIKE TRAP PURGE"], ["mimic", "🧰 MIMIC AMBUSH"], ["torch", "🔥 TORCHLIGHT EXPANSION"], ["dkey", "🗝️ DUNGEON KEY 잭팟"]]
    },
    // ------------------------------------------------ 25. Abyssal Trench
    {
        id: "abyssal_trench", name: "Abyssal Trench", brand: "Rabbit-Gaming", engine: "sp_abyss", progressive: false, jp: null,
        bets: [300, 500, 800, 1000, 1500, 2000], reels: 5, rows: 3, maxX: 3000, px: 1.84,
        desc: "칠흑 같은 심해 잠수구 조종실. 플레이필드는 둥근 초록·금빛 소나 레이더 화면이고, 스핀마다 레이더 빔이 360° 돌며 발광 해파리·가라앉은 닻·아귀·진주를 화면에 띄운다 (5x3 · 243 WAYS). 📡 SONAR PULSE OVERCHARGE = 이중 핑으로 심볼 아래 숨은 보물상자 공개, 즉시 배수 상금 · 🐉 LEVIATHAN WAKE = 거대한 바다뱀이 지나가며 x3 EXPANDING EEL WILD를 남긴다 · 🫧 THERMAL VENT ERUPTION = 뜨거운 거품이 심볼을 밀어올리며 한 단계씩 업그레이드",
        jpText: "📡 SONAR CHEST x2~x50 · 🐉 x3 EEL WILD · 🫧 VENT UPGRADE",
        theme: { bg: "radial-gradient(circle at 50% 50%,#064e3b 0%,#022c22 40%,#000 100%)", accent: "#4ade80", glow: "#facc15", font: "'Lilita One', sans-serif" },
        skin: "sonar",
        syms: { H1: { e: "🦑", name: "Giant Squid", pay: [0.6, 2, 6] }, H2: { e: "🐡", name: "Anglerfish", pay: [0.5, 1.5, 4] }, H3: { e: "⚓", name: "Sunken Anchor", pay: [0.4, 1.2, 3] }, H4: { e: "🪼", name: "Jellyfish", pay: [0.3, 1, 2.5] },
            L1: { e: "🦪", name: "Pearl", pay: [0.12, 0.3, 0.75] }, L2: { e: "🐚", name: "Shell", pay: [0.1, 0.25, 0.6] }, L3: { e: "🦐", name: "Shrimp", pay: [0.08, 0.2, 0.5] }, L4: { e: "🫧", name: "Bubble", pay: [0.06, 0.15, 0.4] } },
        look: { W: { e: "🔦", name: "SONAR WILD" }, W3: { e: "🐍", name: "x3 EEL WILD", cls: "sym-wild" } },
        w: { H1: 2.5, H2: 3, H3: 3.5, H4: 4, L1: 6, L2: 6, L3: 6.5, L4: 7, W: [0, 1.3, 1.3, 1.3, 0] },
        features: { sonar: { p: 0.0035 }, leviathan: { p: 0.003 }, vent: { p: 0.0035 } },
        bgm: "tropical_steel",
        omens: [{ fx: "shake" }, LUCKY, { fx: "rise", chars: ["🫧", "🫧", "🐟", "🫧"], shake: true, text: "⬇️ Go deep deep water — FULL SPEED!" }],
        tests: [["sonar", "📡 SONAR PULSE"], ["leviathan", "🐉 LEVIATHAN WAKE"], ["vent", "🫧 THERMAL VENT"]]
    },
    // ------------------------------------------------ 26. Glacier Fracture
    {
        id: "glacier_fracture", name: "Glacier Fracture", brand: "BLK", engine: "sp_glacier", progressive: false, jp: null,
        bets: [100, 200, 300, 500, 800, 1000], reels: 6, rows: 3, maxX: 3000, px: 1.04,
        desc: "위에서 내려다본 투명한 북극 호수. 릴 대신 푸른 얼음판 아래 얼어붙은 매머드·바이킹 도끼·사파이어가 비친다. 스핀마다 거대한 서리 망치가 얼음을 내리쳐 18개의 얼음 조각으로 쪼갠다 (6x3 · 729 WAYS). 🌬️ FLASH FREEZE = 북극 바람이 당첨 조각을 x2 서리 배수로 꽁꽁 얼리고 나머지는 부숴 무료 리필 스핀 · 🌌 AURORA BOREALIS = 오로라가 6~10조각을 최고 배당 심볼로 동기화",
        jpText: "🌬️ FLASH FREEZE x2 + REFILL · 🌌 AURORA 6~10 TOP SYMBOLS",
        theme: { bg: "linear-gradient(180deg,#e0f2fe 0%,#7dd3fc 35%,#0369a1 75%,#082f49 100%)", accent: "#e0f2fe", glow: "#a78bfa", font: "'Lilita One', sans-serif" },
        skin: "ice",
        syms: { H1: { e: "🦣", name: "Wooly Mammoth", pay: [0.5, 1.6, 4, 8] }, H2: { e: "🪓", name: "Viking Axe", pay: [0.4, 1.2, 3, 6] }, H3: { e: "💎", name: "Sapphire", pay: [0.3, 1, 2.5, 5] }, H4: { e: "🐟", name: "Frozen Fish", pay: [0.25, 0.8, 2, 4] },
            L1: { e: "❄️", name: "Snowflake", pay: [0.08, 0.2, 0.5, 1] }, L2: { e: "🧊", name: "Ice Cube", pay: [0.07, 0.18, 0.45, 0.9] }, L3: { e: "🫧", name: "Air Bubble", pay: [0.06, 0.15, 0.4, 0.8] } },
        look: { W: { e: "🔨", name: "FROST HAMMER WILD" } },
        w: { H1: 2.6, H2: 3, H3: 3.5, H4: 4, L1: 6.5, L2: 7, L3: 7.5, W: [0, 1, 1, 1, 1, 0] },
        features: { freeze: { p: 0.005 }, aurora: { p: 0.004 } },
        bgm: "pizzicato_march",
        omens: [{ fx: "rain", chars: ["🧊", "❄️", "🧊"], text: "🧊 Icicles are dropping down!" }, { fx: "wind", chars: ["❄️", "🌨️", "❄️", "💨"], text: "🌨️ A huge blizzard comes in!!" }],
        tests: [["freeze", "🌬️ FLASH FREEZE"], ["aurora", "🌌 AURORA BOREALIS"]]
    },
    // ------------------------------------------------ 27. Schrödinger's Quantum Cube
    {
        id: "quantum_cube", name: "Schrödinger's Quantum Cube", brand: "YG GAMING", engine: "sp_quantum", progressive: true,
        jp: PROG(30000, 300000, 1200000), bets: [100, 200, 300, 500, 800, 1000], reels: 3, rows: 3, maxX: 5000, px: 0.905,
        desc: "매끈한 SF 이론물리 연구소, 화면 중앙에 떠서 회전하는 루빅스 큐브 홀로그램. 스핀마다 큐브 면이 3D로 비틀리며 앞면 9개의 양자 면에 원자·모래시계·주사위·무한대 기호가 나타난다 (3x3 · 5 LINES). ⚛️ QUANTUM SUPERPOSITION = 큐브가 멈추기 전 4~6면이 두 고급 심볼 사이를 깜빡이다 가장 높은 배당으로 붕괴 · 🧊🧊 PARALLEL TIMELINE SPLIT = 큐브가 쌍둥이로 갈라져 두 차원의 당첨을 동시에 지급 · 🦋 BUTTERFLY EFFECT = 모서리에 앉은 네온 나비가 연쇄 반응, 인접 면을 2x QUANTUM WILD로 · 보너스 끝에 QUANTUM COLLAPSE 잭팟(MINI~GRAND)이 터질 수 있다",
        theme: { bg: "radial-gradient(circle at 50% 40%,#1e1b4b 0%,#0f172a 50%,#020617 100%)", accent: "#67e8f9", glow: "#c084fc", font: "'Orbitron', 'Lilita One', sans-serif" },
        skin: "cube",
        syms: { H1: { e: "♾️", name: "Infinity Loop", pay: [12] }, H2: { e: "⚛️", name: "Atom", pay: [7] }, H3: { e: "⏳", name: "Hourglass", pay: [5] }, H4: { e: "🎲", name: "Dice", pay: [4] }, L1: { e: "🔷", name: "Quark", pay: [2] }, L2: { e: "🔺", name: "Photon", pay: [1.5] } },
        look: { W: { e: "🐈‍⬛", name: "SCHRÖDINGER WILD" }, W2: { e: "🦋", name: "x2 QUANTUM WILD", cls: "sym-wild" } },
        w: { H1: 1.6, H2: 2.2, H3: 2.8, H4: 3.2, L1: 4.6, L2: 5, W: 0.55 },
        features: { superpose: { p: 0.0035 }, parallel: { p: 0.0035 }, butterfly: { p: 0.003 }, qjp: { p: 0.1, tw: { MINI: 50, MINOR: 28, MAXI: 14, MAJOR: 6, GRAND: 2 } } },
        bgm: "synthwave",
        omens: [{ fx: "rain", chars: ["0", "1", "π", "∞", "Ψ", "7"], text: "🍀 Lucky has arrived 🍀 · 01101∞π…" }, { fx: "shake", text: "🧊 A huge cube is getting enormous!!" }, { fx: "rain", chars: ["🧩", "🧩", "🧩"] }],
        tests: [["superpose", "⚛️ QUANTUM SUPERPOSITION"], ["parallel", "🧊🧊 PARALLEL TIMELINE"], ["butterfly", "🦋 BUTTERFLY EFFECT"]]
    },
    // ------------------------------------------------ 28. Kindness
    {
        id: "kindness", name: "Kindness", brand: "Classic Gaming", engine: "sp_kindness", progressive: true,
        jp: PROG(15000, 150000, 600000), bets: [100, 200, 300, 400, 500], reels: 5, rows: 3, maxX: 5000, px: 2.04,
        desc: "동화책 삽화 같은 빅토리아 시대 겨울 광장, 등불이 따뜻하게 빛나는 무료 급식소 겸 쉼터. 릴 대신 건물 정면의 아치형 나무창 15개가 매 스핀 덧문을 여닫으며 김이 나는 수프·뜨개 목도리·따뜻한 빵·황금 기부 코인을 보여준다 (5x3 · 243 WAYS). 🔥 HEARTHFIRE WARMTH = 중앙 벽난로의 황금 불씨가 창문 4~7곳을 WILD LANTERN으로 · 🧥 GENEROUS BENEFACTOR = 망토 쓴 신사가 금화 주머니를 던져 당첨 창문마다 x2~x5 감사 배수 · 🍞 COMMUNITY FEAST = 빵·수프 3개가 함께 나오면 쉼터 문이 열리고 1층 창문 전체가 하나의 거대 메가 심볼로 확정 당첨 · 보너스 끝에 GOLDEN DONATION 잭팟이 터질 수 있다",
        theme: { bg: "linear-gradient(180deg,#1e293b 0%,#334155 40%,#78350f 85%,#451a03 100%)", accent: "#fde68a", glow: "#fb923c", font: "'Lilita One', sans-serif" },
        skin: "shelter",
        syms: { ...CARDS, H1: { e: "🍞", name: "Warm Bread", pay: [0.6, 2, 6] }, H2: { e: "🥣", name: "Steaming Soup", pay: [0.5, 1.5, 4] }, H3: { e: "🧣", name: "Knitted Scarf", pay: [0.4, 1.2, 3] }, H4: { e: "🪙", name: "Donation Coin", pay: [0.3, 1, 2.5] } },
        look: { W: { e: "🏮", name: "WILD LANTERN" } },
        w: { ...CARD_W, H1: 2.5, H2: 3, H3: 3.5, H4: 4, W: [0, 1.3, 1.3, 1.3, 0] },
        features: { hearth: { p: 0.0035 }, benefactor: { p: 0.0035 }, feast: { p: 0.003 }, kjp: { p: 0.1, tw: { MINI: 50, MINOR: 28, MAXI: 14, MAJOR: 6, GRAND: 2 } } },
        bgm: "jingle_box",
        omens: [LUCKY, { fx: "shake" }, { fx: "rise", chars: ["🧎", "🧎‍♂️", "🥣", "🧎‍♀️"], text: "😱 Ugly Beggars are suddenly swarming up!" }],
        tests: [["hearth", "🔥 HEARTHFIRE WARMTH"], ["benefactor", "🧥 GENEROUS BENEFACTOR"], ["feast", "🍞 COMMUNITY FEAST"]]
    },
];

// map placement (one machine per map, never shared)
export const THEME_HOME = {
    clockwork_vault: "igloo", alchemists_lab: "underground", astral_weaver: "zodiac", neon_blitz: "cany", popcorn_pandemonium: "mj2",
    midnight_ouija: "coffin", tower_of_terror: "spooky", the_bog: "blackwater", cyber_dial: "poly2", sun_drum: "dung2",
    three_strikes: "crazy_casino", vampire_bingo: "evil_town", pay_day: "riches", jokers: "island", coin_claw: "redblue",
    cathedral_wings: "dove", velvet_table: "winners", astro_diner: "spacetown", lilypad_leap: "ribbit", gridlock_rush: "downtown",
    rotate_helm: "deep_ocean", smash_bricks: "highlimit", classic_mania: "possibility", mimic_labyrinth: "dungeon", abyssal_trench: "deepsea_casino",
    glacier_fracture: "ice", quantum_cube: "possibility", kindness: "beggar_shelter"
};
