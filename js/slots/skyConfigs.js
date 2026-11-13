// =====================================================================
// The 11 sky / space / arena machines (round 7). Engine: js/slots/skyEngine.js
// (engine: "sp_*", dispatched from specialEngine.specialSpin), renderer:
// js/screens/slotSpecial.js (cfg.cover = the spin mechanic animation,
// "tap" phases = interactive tap bonuses). Feature-first bonuses
// (features.*.p × pet luck), teasing + near-miss, P icons and progressive
// pools work like every other machine. px scales every cash prize except
// jackpots — solved by a 150k+ spin browser simulation (PX at the bottom).
// Bonus icons are Z* keys (never overwritten by injected symbols).
// =====================================================================
const BETS_A = [100, 200, 300, 500, 800, 1000];
const sp = (e, name, cls = "sym-special") => ({ e, name, cls });
const PROG = (major, grand, cap) => ({ MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: major, rate: 0.01 }, GRAND: { seed: grand, rate: 0.02, cap } });
const LUCKY = { fx: "text", text: "🍀 Lucky has arrived 🍀" };
const HI = [[0.6, 2, 6], [0.5, 1.5, 4], [0.4, 1.2, 3], [0.3, 1, 2.5]];
const LO = [[0.12, 0.3, 0.7], [0.1, 0.25, 0.6], [0.08, 0.2, 0.5]];
// 4 highs + 3 lows (themed)
const syms = (hi, lo, scale = 1) => Object.fromEntries([
    ...hi.map(([e, name], i) => ["H" + (i + 1), { e, name, pay: HI[i].map(x => +(x * scale).toFixed(3)) }]),
    ...lo.map(([e, name], i) => ["L" + (i + 1), { e, name, pay: LO[i].map(x => +(x * scale).toFixed(3)) }])
]);
const W_STD = { H1: 2.5, H2: 3, H3: 3.5, H4: 4, L1: 6, L2: 6.5, L3: 7 };

export const SKY_SLOTS = [
    // ------------------------------------------------ 1. Cumulus Cash
    {
        id: "cumulus_cash", name: "Cumulus Cash", brand: "BLK", engine: "sp_cumulus", progressive: true, cover: "clouds",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 4, rows: 4, maxX: 5000, px: 1,
        jpNote: "⛈️ STORM = 잭팟 2개 합산 (GRAND 제외)",
        desc: "성층권 위에 떠 있는 스팀펑크 도시. 탭 한 번에 돌풍이 불어 4x4 구름 16개를 날려 버리고 아래 심볼이 드러난다 (256 WAYS). ⚡ LIGHTNING CHAIN = 폭풍 구름의 번개가 이웃 칸을 같은 고배당 심볼로 · 🌬️ UPDRAFT RESPIN = 당첨 심볼이 하늘로 떠오르고 아래에서 새 구름이 흘러든다 (연쇄) · 🐓 황금 풍향계 3개 = THUNDERHEAD JACKPOT — 떨어지는 번개를 탭해 즉시 상금! STORM 잭팟 = 잭팟 2개 합산",
        theme: { bg: "linear-gradient(180deg,#1e3a5f 0%,#475569 40%,#a16207 100%)", accent: "#fbbf24", glow: "#e0f2fe", font: "'Lilita One', sans-serif" },
        skin: "r7clouds",
        syms: syms([["🛩️", "Golden Airship"], ["🏙️", "Sky City"], ["⚙️", "Brass Cog"], ["🎈", "Hot-Air Balloon"]], [["🔩", "Rivet"], ["🪝", "Hook"], ["💨", "Steam"]]),
        look: { W: { e: "🌩️", name: "THUNDER WILD" }, ZV: sp("🐓", "Golden Weathervane") },
        w: { ...W_STD, W: [0, 1.4, 1.4, 0] },
        features: { lightning: { p: 0.012 }, updraft: { p: 0.014 }, thunder: { p: 0.0035, storm: 0.06, tw: { MINI: 55, MINOR: 28, MAXI: 12, MAJOR: 4, GRAND: 1 } } },
        bgm: "pizzicato_march",
        omens: [{ fx: "wind", chars: ["☁️", "☁️", "🌩️"], text: "🍀 Lucky has arrived 🍀 · 구름이 몰려온다…" }, { fx: "big", cls: "cover", icon: "☁️", shake: true }],
        tests: [["lightning", "⚡ LIGHTNING CHAIN"], ["updraft", "🌬️ UPDRAFT RESPIN"], ["thunder", "⛈️ THUNDERHEAD JACKPOT"], ["thunder:storm", "⛈️ THUNDERHEAD + STORM 잭팟"]]
    },
    // ------------------------------------------------ 2. Aero-Ace Squadron
    {
        id: "aero_ace", name: "Aero-Ace Squadron", brand: "CLOUD GAMING", engine: "sp_aero", progressive: true, cover: "radar",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "빈티지 복엽기 · 매사냥꾼 · 곡예 비행사! 레이더를 탭하면 FLYBY — 비행기와 새가 5개의 하늘 레인을 휩쓸며 심볼 상자를 떨어뜨린다 (243 WAYS). ✈️ FORMATION WILDS = V자 편대의 가운데 비행기가 WILD 배너를 떨어뜨려 레인 전체가 WILD · 🌀 BARREL ROLL = 곡예기를 탭하면 배럴 롤! 그 상자의 당첨 x2 · 🎯 레이더 표적 3개 = DOGFIGHT 8 무료스핀 — 적 풍선을 격추해 추가 스핀과 배수 획득",
        theme: { bg: "linear-gradient(180deg,#7dd3fc 0%,#0ea5e9 45%,#78350f 100%)", accent: "#f59e0b", glow: "#fef3c7", font: "'Rye', serif" },
        skin: "r7sky",
        syms: syms([["🛩️", "Biplane"], ["🦅", "Falcon"], ["🧑‍✈️", "Ace Pilot"], ["🪂", "Parachute"]], [["🧭", "Compass"], ["🥽", "Goggles"], ["🧣", "Scarf"]]),
        look: { W: { e: "🚩", name: "WILD BANNER" }, ZR: sp("🎯", "Radar Target") },
        w: { ...W_STD, W: [0, 1.2, 1.2, 1.2, 0] },
        features: { formation: { p: 0.012 }, barrel: { p: 0.014 }, dogfight: { p: 0.0045, spins: 8 } },
        bgm: "bigband_swing",
        omens: [LUCKY, { fx: "wind", chars: ["🌪️", "🍂", "💨"], text: "🌬️ An ominous wind blows suddenly…" }, { fx: "big", cls: "rise", icon: "☁️", shake: true }],
        tests: [["formation", "✈️ FORMATION WILDS"], ["barrel", "🌀 BARREL ROLL x2"], ["dogfight", "🎯 DOGFIGHT 무료스핀"]]
    },
    // ------------------------------------------------ 3. The Crossing
    {
        id: "the_crossing", name: "The Crossing", brand: "CLOVER-TECH", engine: "sp_crossing", progressive: true, cover: "tiles",
        jp: { ...PROG(60000, 600000, 2500000), VAULT: { seed: 1500000, rate: 0.006, cap: 6000000 } }, jpLabel: { VAULT: "RAINBOW" },
        bets: [300, 500, 800, 1000, 1500], reels: 5, rows: 5, maxX: 5000, px: 1,
        desc: "천상의 세계를 잇는 무지개 다리와 떠다니는 대리석 길. 5x5 돌 타일이 왼쪽 절벽에서 오른쪽 절벽으로 물결치듯 뒤집힌다 — 왼쪽 끝에서 이어진 같은 심볼의 길이 3열 이상 건너가면 당첨 (BRIDGE PATHS). 🌉 BRIDGE BUILDER = 왼쪽→오른쪽 끝까지 이어진 길 = CROSSING BONUS x3~x10 · 🪨 CRUMBLING TILES = 꽝 타일이 부서져 떨어지고 황금 룬이 솟아 새 당첨 · ⛩️ GATEKEEPER'S TOLL = 오른쪽 황금 문에 닿으면 세로 돌 휠 (MINI~GRAND, RAINBOW 잭팟)",
        theme: { bg: "linear-gradient(180deg,#fbcfe8 0%,#a5b4fc 35%,#38bdf8 70%,#1e3a8a 100%)", accent: "#fde68a", glow: "#f0abfc", font: "'Lilita One', sans-serif" },
        skin: "r7marble",
        syms: syms([["🦄", "Sky Unicorn"], ["🌈", "Rainbow"], ["🏛️", "Marble Arch"], ["🕊️", "Dove"]], [["💠", "Blue Rune"], ["🔶", "Amber Rune"], ["🟢", "Jade Rune"]]),
        look: { W: { e: "✨", name: "STARDUST WILD" }, ZG: sp("⛩️", "Golden Gate") },
        w: { ...W_STD, W: [0, 0.9, 0.9, 0.9, 0.9] },
        features: { bridge: { p: 0.008 }, crumble: { p: 0.014 }, gate: { p: 0.003 } },
        bgm: "irish_jig",
        omens: [{ fx: "big", cls: "light", icon: "😁", text: "🍀 Lucky has arrived 🍀" }, { fx: "shake", text: "🌉 You are about to cross!!" }, { fx: "rise", chars: ["🪜", "✨", "☁️", "🪜"], text: "🪜 Stairways to heaven suddenly appear…" }],
        tests: [["bridge", "🌉 BRIDGE BUILDER"], ["crumble", "🪨 CRUMBLING TILES"], ["gate", "⛩️ GATEKEEPER'S TOLL"], ["gate:VAULT", "⛩️ 휠 → RAINBOW 잭팟"]]
    },
    // ------------------------------------------------ 4. Orbital Launch (non-progressive)
    {
        id: "orbital_launch", name: "Orbital Launch", brand: "Classic Gaming", engine: "sp_orbital", progressive: false, jp: null, cover: "rockets", holdSpin: true, spinLabel: "🚀 HOLD",
        bets: [200, 300, 500, 800, 1000, 1200], reels: 5, rows: 3, maxX: 3000, px: 1,
        jpText: "🚀 STAGE SEPARATION · 🔥 THRUSTER BOOST · 🌕 MOONSHOT x5~x100",
        desc: "레트로 퓨처 우주 기지의 크롬 로켓! 스핀 버튼을 꾹 눌렀다 떼면 추진기 점화 — 심볼 포드가 5개의 세로 튜브를 타고 솟구쳐 꼭대기에 고정된다 (243 WAYS). 🚀 STAGE SEPARATION = 당첨 시 맨 아래 줄이 부스터처럼 분리되고 남은 심볼이 떨어져 무료 연쇄 당첨 · 🔥 THRUSTER BOOST = 튜브 하나에 불꽃이 치솟아 그 열의 모든 심볼이 한 단계 업그레이드 · ⛽ 연료통 3개 = MOONSHOT — 게이지를 탭해 멈춘 지점만큼 로켓이 날아가 x5~x100",
        theme: { bg: "linear-gradient(180deg,#0f172a 0%,#312e81 45%,#be185d 100%)", accent: "#f472b6", glow: "#22d3ee", font: "'Lilita One', sans-serif" },
        skin: "r7tubes",
        syms: syms([["🚀", "Chrome Rocket"], ["🧑‍🚀", "Astronaut"], ["🛰️", "Satellite"], ["🪐", "Ringed Planet"]], [["🔧", "Wrench"], ["📡", "Dish"], ["🔋", "Cell"]]),
        look: { W: { e: "☄️", name: "COMET WILD" }, ZF: sp("⛽", "Fuel Cell") },
        w: { ...W_STD, W: [0, 1.3, 1.3, 1.3, 0] },
        features: { stage: { p: 0.02 }, thruster: { p: 0.014 }, moonshot: { p: 0.0045 } },
        bgm: "synthwave",
        omens: [{ fx: "big", cls: "fly", icon: "🚀", shake: true }, { fx: "rise", chars: ["🔥", "🔥", "💥", "🔥"] }, { fx: "shake", text: "🚀 Launch Time!!" }],
        tests: [["stage", "🚀 STAGE SEPARATION"], ["thruster", "🔥 THRUSTER BOOST"], ["moonshot", "🌕 MOONSHOT"], ["moonshot:max", "🌕 MOONSHOT x100"]]
    },
    // ------------------------------------------------ 5. Constellation Weaver
    {
        id: "constellation_weaver", name: "Constellation Weaver", brand: "DAEBAK", engine: "sp_constellation", progressive: true, cover: "starlight",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 5, rows: 4, maxX: 5000, px: 1,
        desc: "12지신 짐승 · 별똥별 · 아스트롤라베가 빛나는 신비한 밤하늘. 탭하면 별빛이 돔을 가로질러 20개의 별이 켜지고 같은 별 4개 이상이 빛나는 선으로 이어진다 (CONSTELLATION 4+, 대각선 포함). ♈ ZODIAC LOCK = 같은 별이 삼각형·다이아몬드 모양을 이루면 고정되고 무료 리스핀 · 🌠 SHOOTING STAR WILDS = 유성이 WILD 별 2~4개를 남긴다 · 🌌 성운 3개 = SUPERNOVA PICK — 초신성이 터지기 전에 맥동하는 오브를 탭해 상금 수집",
        theme: { bg: "radial-gradient(circle at 50% 30%,#4338ca 0%,#1e1b4b 50%,#020617 100%)", accent: "#fde047", glow: "#a5b4fc", font: "'Lilita One', sans-serif" },
        skin: "r7dome",
        syms: syms([["🐉", "Dragon Star"], ["🐯", "Tiger Star"], ["🐇", "Rabbit Star"], ["🐍", "Serpent Star"]], [["⭐", "Gold Star"], ["🌟", "Bright Star"], ["✴️", "Spark"]], 0.6),
        look: { W: { e: "💫", name: "WILD STAR" }, ZN: sp("🌌", "Nebula") },
        w: { H1: 4, H2: 4.5, H3: 5, H4: 5.5, L1: 7, L2: 7.5, L3: 8, W: 0.6 },
        features: { zodiac: { p: 0.012 }, meteor: { p: 0.014 }, supernova: { p: 0.0045, tw: { MINI: 55, MINOR: 28, MAXI: 12, MAJOR: 4, GRAND: 1 } } },
        bgm: "lounge_jazz",
        omens: [{ fx: "pop", chars: ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"], shake: true }, { fx: "big", cls: "light", icon: "✨🌌✨", shake: true, text: "A constellation appears!" }, { fx: "big", cls: "cover", icon: "🌌" }],
        tests: [["zodiac", "♈ ZODIAC LOCK"], ["meteor", "🌠 SHOOTING STAR WILDS"], ["supernova", "🌌 SUPERNOVA PICK"]]
    },
    // ------------------------------------------------ 6. Cosmic Tide
    {
        id: "cosmic_tide", name: "Cosmic Tide", brand: "HYHG GAMING", engine: "sp_tide", progressive: true, cover: "ripple",
        jp: { ...PROG(40000, 400000, 1500000), MEGA: { sum: true } }, jpLabel: { MEGA: "COSMIC TIDE" },
        bets: BETS_A, reels: 5, rows: 5, maxX: 5000, px: 1,
        desc: "수은 호수와 생물발광 우주 물고기가 사는 외계 오아시스. 운석이 둥근 호수에 떨어지면 물결이 고리마다 연잎 심볼을 뒤집는다 (5x5 · 같은 심볼 5개 이상 연결 = 당첨). 〰️ RIPPLE ECHO = 안쪽 고리의 당첨이 바깥 고리에 그대로 복사되어 2배 지급 · 🐟 BIOLUMINESCENT SURGE = 물결이 잦아들기 전에 우주 잉어를 탭하면 그 칸이 스티키 WILD (리스핀 2회) · 🛟 잠수함 3개 = DEEP DIVE — 호수가 빠지고 빛나는 조개를 탭해 즉시 상금. COSMIC TIDE 잭팟 = 모든 잭팟 동시 지급!",
        theme: { bg: "radial-gradient(circle at 50% 55%,#a5f3fc 0%,#0e7490 35%,#1e1b4b 75%,#020617 100%)", accent: "#67e8f9", glow: "#c4b5fd", font: "'Lilita One', sans-serif" },
        skin: "r7lake",
        syms: syms([["🐠", "Star Fish"], ["🪼", "Space Jelly"], ["🦑", "Moon Squid"], ["🐚", "Glow Shell"]], [["🫧", "Bubble"], ["🌿", "Weed"], ["💧", "Mercury Drop"]], 0.55),
        look: { W: { e: "🌀", name: "WHIRLPOOL WILD" }, ZS: sp("🛟", "Submarine") },
        w: { H1: 4, H2: 4.5, H3: 5, H4: 5.5, L1: 7, L2: 7.5, L3: 8, W: 0.5 },
        features: { echo: { p: 0.012 }, koi: { p: 0.01 }, dive: { p: 0.0045, tw: { MINI: 55, MINOR: 28, MAXI: 12, MAJOR: 4, GRAND: 1, MEGA: 0.3 } } },
        bgm: "tropical_steel",
        omens: [{ fx: "wind", chars: ["🌊", "🌊", "🫧"], shake: true, text: "🌊 Cosmic tidal waves are coming!" }, { fx: "rain", chars: ["🌠", "☄️", "🌠", "✨"] }],
        tests: [["echo", "〰️ RIPPLE ECHO"], ["koi", "🐟 BIOLUMINESCENT SURGE"], ["dive", "🛟 DEEP DIVE"], ["dive:MEGA", "🛟 DEEP DIVE → COSMIC TIDE 잭팟"]]
    },
    // ------------------------------------------------ 7. Koi in the Clouds
    {
        id: "koi_clouds", name: "Koi in the Clouds", brand: "IPEX", engine: "sp_koi", progressive: true, cover: "net",
        jp: { ...PROG(40000, 400000, 1500000), LOTUS: { seed: 150000, rate: 0.008, cap: 800000 } },
        bets: BETS_A, reels: 4, rows: 3, maxX: 5000, px: 1,
        desc: "구름 속으로 쏟아지는 폭포, 안개 속 영혼 잉어가 노니는 공중 정원. 잉어 12마리가 8자로 헤엄치다 클릭하면 황금 그물이 내려와 멈추고 비늘의 심볼이 드러난다 (4x3 · 81 WAYS). 🐉 DRAGON GATE LEAP = 폭포 꼭대기의 황금 잉어가 2x2 DRAGON WILD로 · 🪷 LOTUS BLOOM = 닫힌 연꽃 옆에 물방울이 떨어지면 미스터리 배수 x2~x10 · 🍡 먹이 3개 = FEEDING FRENZY — 빠르게 탭! 잉어가 물 때마다 상금. LOTUS 잭팟",
        theme: { bg: "linear-gradient(180deg,#fef3c7 0%,#fda4af 30%,#5eead4 70%,#0f766e 100%)", accent: "#f97316", glow: "#fef9c3", font: "'Lilita One', sans-serif" },
        skin: "r7pond",
        syms: syms([["🎏", "Spirit Koi"], ["🏯", "Pagoda"], ["🐢", "Jade Turtle"], ["🏮", "Lantern"]], [["🍃", "Leaf"], ["🌸", "Blossom"], ["🪨", "Pebble"]], 1.25),
        look: { W: { e: "🐲", name: "DRAGON WILD" }, ZP: sp("🍡", "Food Pellet") },
        w: { ...W_STD, W: [0, 1.2, 1.2, 0] },
        features: { dragon: { p: 0.012 }, lotus: { p: 0.012 }, frenzy: { p: 0.0045, tw: { MINI: 55, MINOR: 27, MAXI: 12, MAJOR: 4, LOTUS: 1.5, GRAND: 0.5 } } },
        bgm: "celestial_brass",
        omens: [{ fx: "wind", chars: ["🐟", "🎏", "🐠"], text: "🍀 Lucky has arrived 🍀" }, { fx: "big", cls: "rise", icon: "🐟" }, { fx: "rise", chars: ["🎏", "🐟", "🎏", "🐉"] }],
        tests: [["dragon", "🐉 DRAGON GATE LEAP"], ["lotus", "🪷 LOTUS BLOOM"], ["frenzy", "🍡 FEEDING FRENZY"], ["frenzy:LOTUS", "🍡 FEEDING FRENZY → LOTUS 잭팟"]]
    },
    // ------------------------------------------------ 8. Chain Reaction (non-progressive)
    {
        id: "chain_reaction", name: "Chain Reaction", brand: "Rabbit-Gaming", engine: "sp_chain", progressive: false, jp: null, cover: "plunger", spinLabel: "🎯 SHOOT",
        bets: BETS_A, reels: 4, rows: 4, maxX: 3000, px: 1,
        jpText: "🎯 COMBO x2→x32 · 🎱 MULTIBALL · 🔋 POWER SURGE",
        desc: "루브 골드버그 장치 · 핀볼 범퍼 · 네온 오락실 간판의 만화 도시. 플런저가 에너지 볼을 4x4 범퍼 타일로 쏘아 올리고, 공이 튕긴 타일마다 불이 켜진다 — 불 켜진 같은 심볼 3개 이상 = 당첨. 🔗 COMBO METER = 같은 심볼을 연속으로 튕길 때마다 네온 배수 x2 → x4 → x8 → 최대 x32 · 🎱 PINBALL MULTIBALL = SPLITTER 범퍼가 공 2개를 더 풀어준다 · 🔋 마을 배터리가 가득 차면 POWER SURGE — 모든 타일이 켜진 채로 5발 무료 슈팅",
        theme: { bg: "linear-gradient(180deg,#1e1b4b 0%,#7e22ce 45%,#0f766e 100%)", accent: "#f472b6", glow: "#a3e635", font: "'Lilita One', sans-serif" },
        skin: "r7pinball",
        syms: { H1: { e: "🎰", name: "Jackpot Bumper", pay: [0.8, 2, 5, 10, 20, 40] }, H2: { e: "🤖", name: "Robot", pay: [0.6, 1.5, 4, 8, 15, 30] }, H3: { e: "🎡", name: "Ferris Wheel", pay: [0.5, 1.2, 3, 6, 12, 25] }, H4: { e: "🛹", name: "Skateboard", pay: [0.4, 1, 2.5, 5, 10, 20] },
            L1: { e: "🔔", name: "Bell", pay: [0.25, 0.6, 1.5, 3, 6, 12] }, L2: { e: "⚡", name: "Spark", pay: [0.2, 0.5, 1.2, 2.5, 5, 10] }, L3: { e: "🔵", name: "Bumper", pay: [0.15, 0.4, 1, 2, 4, 8] } },
        look: { W: { e: "🌟", name: "NEON WILD" }, ZS: sp("🔱", "Splitter Bumper") },
        w: { H1: 3, H2: 3.5, H3: 4, H4: 4.5, L1: 6, L2: 6.5, L3: 7, W: 0.6 },
        features: { combo: { p: 0.012 }, multiball: { p: 0.012 }, surge: { p: 0.0045, shots: 5 } },
        bgm: "synthwave",
        omens: [{ fx: "shake" }, { fx: "big", cls: "flash", icon: "💥", text: "Big Shots!!" }],
        tests: [["combo", "🔗 COMBO METER"], ["combo:max", "🔗 COMBO x32"], ["multiball", "🎱 PINBALL MULTIBALL"], ["surge", "🔋 POWER SURGE"]]
    },
    // ------------------------------------------------ 9. Gladiator's Arena
    {
        id: "gladiator_arena", name: "Gladiator's Arena", brand: "Scrooge-Slots", engine: "sp_arena", progressive: true, cover: "gate",
        jp: { MAXI: { x: 100 }, MAJOR: { seed: 80000, rate: 0.01 }, GRAND: { seed: 800000, rate: 0.02, cap: 3000000 } },
        bets: [300, 500, 800, 1000, 1500, 2000], reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "고대 로마의 콜로세움 — 함성 · 전차 · 황금 방패 · 투기장 챔피언! 쇠창살 문이 쾅 내려오면 5x3 방패 벽이 부딪치며 뒤집혀 무기 · 사자 · 황제를 보여준다 (25 LINES). 🛡️ SHIELD WALL = 같은 방패 3개가 나란히 서면 MEGA 심볼로 고정되어 다음 스핀 확정 당첨 · 👍 EMPEROR'S THUMB = 꽝 스핀 뒤 황제가 나타나면 탭! 엄지 척 → 꽝 무기 심볼이 황금 월계관(WILD)으로 · 🏇 전차 3개 = CHARIOT RACE — 채찍을 탭해 라이벌 2대와 경주, 1·2·3등 상금 (MAXI~GRAND)",
        theme: { bg: "linear-gradient(180deg,#fcd34d 0%,#b45309 40%,#451a03 100%)", accent: "#fbbf24", glow: "#fef3c7", font: "'Rye', serif" },
        skin: "r7shields",
        syms: { H1: { e: "👑", name: "Emperor", pay: [1, 6, 30] }, H2: { e: "🦁", name: "Arena Lion", pay: [0.8, 4, 20] }, H3: { e: "🛡️", name: "Golden Shield", pay: [0.6, 3, 15] }, H4: { e: "🪖", name: "Champion Helm", pay: [0.4, 2, 8] },
            L1: { e: "🗡️", name: "Gladius", pay: [0.15, 0.6, 2] }, L2: { e: "🔱", name: "Trident", pay: [0.12, 0.5, 1.6] }, L3: { e: "🏹", name: "Bow", pay: [0.1, 0.4, 1.2] } },
        look: { W: { e: "🌿", name: "GOLDEN WREATH" }, ZC: sp("🏇", "Chariot") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        features: { shield: { p: 0.008 }, thumb: { p: 0.012 }, chariot: { p: 0.0035, tw: { MAXI: 80, MAJOR: 17, GRAND: 3 } } },
        bgm: "celestial_brass",
        omens: [{ fx: "big", cls: "fall", icon: "🏛️", shake: true }, { fx: "big", cls: "clash", icon: "⚔️", shake: true }, { fx: "wind", chars: ["🌾", "🍂", "🟫", "🌾"], text: "🌪️ An earthy wind blows with tumbleweed…" }],
        tests: [["shield", "🛡️ SHIELD WALL"], ["thumb", "👍 EMPEROR'S THUMB"], ["chariot", "🏇 CHARIOT RACE"], ["chariot:1", "🏇 CHARIOT RACE 1등"]]
    },
    // ------------------------------------------------ 10. Quest Giver's Gold
    {
        id: "quest_gold", name: "Quest Giver's Gold", brand: "BLK", engine: "sp_quest", progressive: true, cover: "clock",
        jp: PROG(150000, 1500000, 5000000), bets: [500, 1000, 1500, 2000, 3000], reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "레트로 픽셀 RPG 마을 — 대장장이 · 물약 양조사 · 상인 · 머리 위에 \"!\"가 뜬 마을 사람들. 탭하면 마을 시계가 한 시간 흐르고 마을 사람 15명이 새 자리로 걸어가 아이템 말풍선을 띄운다 (243 WAYS). ⚔️ QUEST COMPLETE = 검 말풍선과 몬스터 말풍선 옆의 전사가 보물상자 WILD(x2·x3)를 떨어뜨린다 · 💰 MERCHANT HAGGLING = 상인이 미스터리 상자 3개를 꺼낸다 — 작은 당첨을 큰 배수와 교환! · ❗ 3개 = BOSS RAID — 마을이 모여 드래곤을 탭 공격, 때릴 때마다 코인, 쓰러지면 보물 더미!",
        theme: { bg: "linear-gradient(180deg,#38bdf8 0%,#4ade80 45%,#166534 100%)", accent: "#facc15", glow: "#fde68a", font: "'Press Start 2P', 'Lilita One', monospace" },
        skin: "r7pixel",
        syms: syms([["🧙", "Wizard"], ["🧝", "Elf Archer"], ["🧑‍🍳", "Potion Brewer"], ["⚒️", "Blacksmith"]], [["🧪", "Potion"], ["🗝️", "Key"], ["🍞", "Bread"]]),
        look: { W: { e: "🧰", name: "CHEST WILD" }, W2: { e: "🧰", name: "x2 CHEST WILD", cls: "sym-wild" }, W3: { e: "🧰", name: "x3 CHEST WILD", cls: "sym-wild" }, ZX: sp("❗", "Quest Mark") },
        w: { ...W_STD, W: [0, 1.2, 1.2, 1.2, 0] },
        features: { quest: { p: 0.014 }, haggle: { p: 0.012 }, raid: { p: 0.0045, tw: { MINI: 55, MINOR: 28, MAXI: 12, MAJOR: 4, GRAND: 1 } } },
        bgm: "celestial_brass",
        omens: [{ fx: "shake", screen: true }, { fx: "shake", text: "❗❗❗" }, { fx: "rise", chars: ["🧑‍🌾", "🧙", "🧝", "🧑‍🍳", "💂", "🧚", "🧛"], text: "👥 The town is crowding in!" }],
        tests: [["quest", "⚔️ QUEST COMPLETE"], ["haggle", "💰 MERCHANT HAGGLING"], ["raid", "❗ BOSS RAID"]]
    },
    // ------------------------------------------------ 11. Cloudscraper Climb
    {
        id: "cloudscraper_climb", name: "Cloudscraper Climb", brand: "YG GAMING", engine: "sp_climb", progressive: true, cover: "elevator",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1, spinLabel: "🛗 UP",
        desc: "우주까지 닿는 유리와 강철의 미래형 초고층 빌딩. 엘리베이터 버튼을 누르면 3x5 유리 캡슐이 층을 휙휙 지나 솟구치다 한 층에 멈춰 심볼을 공개한다 (243 WAYS). ⬆️ EXPRESS LIFT = UP 화살표가 캡슐을 더 높이 올려 저배당 심볼을 모두 펜트하우스 명품 심볼로 업그레이드 · 🧽 WINDOW WASHER WILDS = 로봇 청소기가 한 열을 타고 내려오며 꽝 유리창을 닦아 WILD 공개 · 🔑 황금 열쇠 3개 = PENTHOUSE PARTY 7 무료스핀 — 샴페인 코르크를 터뜨려 점점 커지는 배수!",
        theme: { bg: "linear-gradient(180deg,#020617 0%,#1e3a8a 35%,#38bdf8 75%,#e0f2fe 100%)", accent: "#38bdf8", glow: "#fde047", font: "'Lilita One', sans-serif" },
        skin: "r7glass",
        syms: syms([["💎", "Penthouse Diamond"], ["🍾", "Champagne"], ["⌚", "Gold Watch"], ["🏎️", "Supercar"]], [["💼", "Briefcase"], ["☕", "Coffee"], ["📰", "Paper"]]),
        look: { W: { e: "🤖", name: "WASHER WILD" }, ZK: sp("🔑", "Golden Key") },
        w: { ...W_STD, W: [0, 1.2, 1.2, 1.2, 0] },
        features: { lift: { p: 0.012 }, washer: { p: 0.014 }, party: { p: 0.0045, spins: 7 } },
        bgm: "synthwave",
        omens: [{ fx: "big", cls: "rise", icon: "🛗", text: "A sky elevator suddenly appears!" }, { fx: "shake", text: "💰 Wanna be rich???? 💰" }],
        tests: [["lift", "⬆️ EXPRESS LIFT"], ["washer", "🧽 WINDOW WASHER WILDS"], ["party", "🔑 PENTHOUSE PARTY"]]
    }
];

// casino placement (LOCATIONS[].slots in js/data/catalog.js) — one casino each, never shared
export const SKY_HOME = {
    cumulus_cash: "cloud", aero_ace: "wingers", the_crossing: "sky_bridge", orbital_launch: "rocketship", constellation_weaver: "star_sky",
    cosmic_tide: "space_lake", koi_clouds: "sky_pond", chain_reaction: "combo_town", gladiator_arena: "colosseum", quest_gold: "npc_town", cloudscraper_climb: "sky_tower"
};

// pay scale (px) per machine, solved with a 150k-spin browser simulation (filled in after tuning)
const PX = {
    cumulus_cash: 0.739, aero_ace: 1.27, the_crossing: 1.795, orbital_launch: 1.399, constellation_weaver: 2.074, cosmic_tide: 2.38,
    koi_clouds: 1.472, chain_reaction: 0.706, gladiator_arena: 1.047, quest_gold: 1.007, cloudscraper_climb: 1.136
};
for (const s of SKY_SLOTS) s.px = PX[s.id] ?? s.px;
