// =====================================================================
// The 11 round-9 machines (chaos cube / curiosities / percentage plaza /
// town square / mission control / glacier slide / pop paradise / sunken
// galleon / phantom manor / midnight boneyard / crimson moon).
// Engine: js/slots/wonderEngine.js (engine: "sp_*", dispatched from
// specialEngine.specialSpin), renderer: js/screens/slotSpecial.js.
// Same contract as realmConfigs.js: feature-first bonuses (features.*.p ×
// pet luck), teasing + near-miss, P icons, progressive pools, omens.
// px scales every cash prize except jackpots — solved by a 150k+ spin
// browser simulation (PX at the bottom). Bonus icons are Z* keys.
// dbl: true = the "double reel" cabinet (twice-as-big reel window).
// =====================================================================
const BETS_A = [100, 200, 300, 500, 800, 1000];
const sp = (e, name, cls = "sym-special") => ({ e, name, cls });
const PROG = (major, grand, cap) => ({ MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: major, rate: 0.01 }, GRAND: { seed: grand, rate: 0.02, cap } });
const LUCKY = "🍀 Lucky has arrived 🍀";
const TW = { MINI: 55, MINOR: 28, MAXI: 12, MAJOR: 4, GRAND: 1 };
const HI = [[0.6, 2, 6], [0.5, 1.5, 4], [0.4, 1.2, 3], [0.3, 1, 2.5]];
const LO = [[0.12, 0.3, 0.7], [0.1, 0.25, 0.6], [0.08, 0.2, 0.5]];
// 4 highs + 3 lows (themed); cls = optional per-symbol class list
const syms = (hi, lo, scale = 1) => Object.fromEntries([
    ...hi.map(([e, name, cls], i) => ["H" + (i + 1), { e, name, cls, pay: HI[i].map(x => +(x * scale).toFixed(3)) }]),
    ...lo.map(([e, name, cls], i) => ["L" + (i + 1), { e, name, cls, pay: LO[i].map(x => +(x * scale).toFixed(3)) }])
]);
// 25-line machines (3 / 4 / 5 of a kind)
const LPAY = { H1: [1, 6, 30], H2: [0.8, 4, 20], H3: [0.6, 3, 15], H4: [0.4, 2, 8], L1: [0.15, 0.6, 2], L2: [0.12, 0.5, 1.6], L3: [0.1, 0.4, 1.2] };
const lsyms = list => Object.fromEntries(list.map(([k, e, name, cls]) => [k, { e, name, cls, pay: LPAY[k] }]));
// cluster pays (4 / 5 / 6+ touching hexes)
const CPAY = { H1: [0.8, 2, 6], H2: [0.6, 1.5, 4], H3: [0.5, 1.2, 3], H4: [0.4, 1, 2.5], L1: [0.15, 0.4, 1], L2: [0.12, 0.3, 0.8], L3: [0.1, 0.25, 0.6] };
const W_STD = { H1: 2.5, H2: 3, H3: 3.5, H4: 4, L1: 6, L2: 6.5, L3: 7 };

export const WONDER_SLOTS = [
    // ------------------------------------------------ 1. Chaos Cube
    {
        id: "chaos_cube", name: "Chaos Cube", brand: "BLK", engine: "sp_cube", progressive: true, cover: "cube", spinLabel: "🎲 THROW",
        jp: PROG(40000, 400000, 1500000), jpLabel: { MINI: "MINI", MINOR: "MINOR", MAXI: "MAXI", MAJOR: "MAJOR", GRAND: "GRAND" },
        bets: BETS_A, reels: 4, rows: 4, maxX: 5000, px: 1,
        desc: "에셔의 판화 속으로 — 떠다니는 주사위, 미스터리 박스, 일렁이는 포털, 예측불가 글리치 아트. 빛나는 루빅스 큐브를 던지면 십자 모양 12칸 판으로 펼쳐진다 (CROSS 12 · 64 WAYS). 🌀 DIMENSION SCRAMBLE = 꽝 스핀에 포털이 열려 타일 4개를 뒤섞어 당첨 완성 · ❓ MYSTERY BOX DROP = 물음표 타일이 떨어져 스핀 끝에 한꺼번에 같은 심볼로! · 🎲 주사위 2개 = DICE ROLL — 자동으로 굴려 당첨 x2~x12 · ⚠️ 에러 아이콘 3개 = GLITCH FREE SPINS 8회 — 매 스핀 판 모양이 바뀐다!",
        theme: { bg: "conic-gradient(from 45deg at 50% 50%,#1e1b4b,#7c3aed,#0f172a,#db2777,#1e1b4b)", accent: "#a78bfa", glow: "#f0abfc", font: "'Lilita One', sans-serif" },
        skin: "r9cube",
        syms: syms([["🪜", "Penrose Stairs"], ["👁️", "All-Seeing Eye"], ["🌀", "Portal"], ["🔮", "Glitch Orb"]], [["🟥", "Red Cubelet"], ["🟩", "Green Cubelet"], ["🟦", "Blue Cubelet"]], 1.4),
        look: { W: { e: "🧊", name: "CUBE WILD" }, ZQ: sp("❓", "Mystery Box"), ZD: sp("🎲", "Glowing Die"), ZE: sp("⚠️", "Error Icon") },
        w: { ...W_STD, W: [0, 0.9, 0.9, 0] },
        features: { scramble: { p: 0.014 }, mystery: { p: 0.016 }, dice: { p: 0.012 }, glitch: { p: 0.004, spins: 8, tw: TW } },
        bgm: "lounge_jazz",
        omens: [{ fx: "big", cls: "grow", icon: "❓" }, { fx: "shake", text: "🎲 Bonanza!!!!!!!!!!!" }],
        tests: [["scramble", "🌀 DIMENSION SCRAMBLE"], ["mystery", "❓ MYSTERY BOX DROP"], ["dice", "🎲 DICE ROLL MULTIPLIER"], ["glitch", "⚠️ GLITCH FREE SPINS"], ["glitch:GRAND", "⚠️ GLITCH → GRAND"]]
    },
    // ------------------------------------------------ 2. Cabinet of Curiosities (non-progressive, double reels)
    {
        id: "curio_cabinet", name: "Cabinet of Curiosities", brand: "CLOUD GAMING", engine: "sp_curio", progressive: false, jp: null, cover: "curtain", spinLabel: "🪢 PULL",
        bets: BETS_A, reels: 5, rows: 3, maxX: 3000, px: 1, dbl: true,
        jpText: "🌀 ODD ONE OUT x5 · 🕰️ BACKWARD CLOCK · 🫙 TAXIDERMY · 🧐 CURATOR'S VAULT",
        desc: "괴짜 빅토리아 시대 박물관 — 기묘한 발명품, 눈 셋 달린 고무 오리, 거꾸로 가는 시계, 초현실주의 그림. 황동 커튼 줄을 당기면 크기가 제각각인 나무 서랍 15개가 열리며 기묘한 유물이 드러난다 (243 WAYS). 🌀 ODD ONE OUT = 같은 유물 4개 + 엉뚱한 1개가 한 줄에 서면 그 \"엉뚱한\" 유물이 x5 WILD로! · 🕰️ BACKWARD CLOCK = 골동품 시계가 뜨면 방금 당첨이 거꾸로 한 번 더 지급 · 🫙 TAXIDERMY SURPRISE = 스핀 중 빛나는 병을 탭하면 박제 동물이 튀어나와 주변 칸을 WILD로 · 🧐 황금 외눈안경 3개 = CURATOR'S VAULT — 벨벳 상자를 탭해 즉시 코인",
        theme: { bg: "linear-gradient(180deg,#3f2a1d 0%,#7c4a2d 40%,#1c120c 100%)", accent: "#d4af37", glow: "#fde68a", font: "'Rye', serif" },
        skin: "r9drawer",
        syms: syms([["🦆", "Three-Eyed Duck"], ["🗿", "Surreal Bust"], ["🔭", "Brass Telescope"], ["🦴", "Fossil"]], [["🗝️", "Brass Key"], ["🪶", "Quill"], ["🧷", "Safety Pin"]]),
        look: { W: { e: "🖼️", name: "SURREAL WILD" }, W5: { e: "🌀", name: "ODD WILD x5", cls: "sym-wild r9-odd" }, ZK: sp("🕰️", "Backward Clock"), ZJ: sp("🫙", "Glowing Jar"), ZM: sp("🧐", "Golden Monocle") },
        w: { ...W_STD, W: [0, 1.1, 1.1, 1.1, 0] },
        features: { odd: { p: 0.004 }, clock: { p: 0.012 }, jar: { p: 0.007 }, vault: { p: 0.0045 } },
        bgm: "pizzicato_march",
        omens: [{ fx: "shake" }, { fx: "rain", chars: ["0️⃣", "1️⃣", "#️⃣", "🔢", "7️⃣"], text: "🔢 숫자와 코드가 마구 쏟아진다…" }],
        tests: [["odd", "🌀 ODD ONE OUT x5"], ["clock", "🕰️ BACKWARD CLOCK"], ["jar", "🫙 TAXIDERMY SURPRISE"], ["vault", "🧐 CURATOR'S VAULT"]]
    },
    // ------------------------------------------------ 3. Percentage Plaza
    {
        id: "percentage_plaza", name: "Percentage Plaza", brand: "CLOVER-TECH", engine: "sp_percent", progressive: true, cover: "ticker", spinLabel: "📈 EXECUTE",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "깔끔한 미래형 사이버 은행 겸 디지털 증권거래소 — 빛나는 데이터 스트림, 초록 상승 화살표, 황금 % 기호가 지배하는 스카이라인. 거대한 \"Execute Trade\" 버튼을 누르면 5개의 디지털 티커 바가 홀로그램 단말기를 가로질러 흐른다 (25 LINES). ⏫ BULL MARKET SURGE = 초록 화살표가 저배당 심볼을 전부 밀어내고 고배당 금화로 교체 · 📊 COMPOUND INTEREST = 연속 당첨마다 옆의 \"RTP METER\"가 차오르며 다음 스핀 +1x (꽝이면 리셋) · % DIVIDEND DROP = 빛나는 % 기호가 떨어져 같은 고배당 심볼 두 개로 분할 · 🔑 서버 키 3개 = ALGORITHM OVERLOAD — 5 무료스핀, 스핀마다 최소 베팅의 2배 보장!",
        theme: { bg: "linear-gradient(180deg,#020617 0%,#064e3b 45%,#0f172a 100%)", accent: "#22c55e", glow: "#facc15", font: "'Lilita One', sans-serif" },
        skin: "r9ticker",
        syms: lsyms([["H1", "🪙", "Gold Coin"], ["H2", "🏦", "Cyber Bank"], ["H3", "📈", "Bull Chart"], ["H4", "💹", "Yen Ticker"], ["L1", "💲", "Dollar Sign"], ["L2", "🧮", "Abacus"], ["L3", "📉", "Bear Chart"]]),
        look: { W: { e: "💯", name: "100% WILD" }, ZA: sp("⏫", "Green Arrow"), ZP: sp("％", "Dividend %", "sym-special r9-pct"), ZK: sp("🔑", "Server Key") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        features: { bull: { p: 0.012 }, dividend: { p: 0.014 }, compound: { max: 5 }, algo: { p: 0.004, spins: 5, tw: TW } },
        bgm: "synthwave",
        omens: [{ fx: "shake", text: "🧮 Math does math!!!!" }, { fx: "pop", chars: ["777", "42%", "9,999", "1e6", "∞", "99.9%"] }],
        tests: [["bull", "⏫ BULL MARKET SURGE"], ["compound", "📊 COMPOUND INTEREST (연속 3회)"], ["dividend", "% DIVIDEND DROP"], ["algo", "🔑 ALGORITHM OVERLOAD"], ["algo:GRAND", "🔑 ALGORITHM → GRAND"]]
    },
    // ------------------------------------------------ 4. Town Square Festival (non-progressive, double reels)
    {
        id: "town_festival", name: "Town Square Festival", brand: "DAEBAK", engine: "sp_festival", progressive: false, jp: null, cover: "bell", spinLabel: "🔔 RING",
        bets: BETS_A, reels: 5, rows: 4, maxX: 3000, px: 1, dbl: true,
        jpText: "⛲ FOUNTAIN SPLASH · 🎺 STREET PARADE · 🎇 FIREWORK x2 · 🎟️ NIGHT MARKET",
        desc: "시계탑 · 거리 공연 · 축제 등불 · 먹거리 노점 · 소원의 분수가 있는 북적이는 광장. 거대한 시계탑 종을 울리면 축제 등불이 5x4 야외 광장으로 날아든다 (1024 WAYS). ⛲ FOUNTAIN SPLASH = 가운데 2x2 분수 구역에서 당첨되면 물이 튀어 주변 칸이 같은 심볼로 · 🎺 STREET PARADE = 마칭 밴드가 맨 아래 줄을 건너며 3스핀 동안 WILD 행진 · 🎇 FIREWORK FINALE = 폭죽 심볼 → 로켓이 터지며 무작위 3칸에 x2 배수 · 🎟️ 축제 티켓 3개 = NIGHT MARKET — 노점을 탭해 금화 주머니와 10 무료스핀!",
        theme: { bg: "linear-gradient(180deg,#1e1b4b 0%,#7c2d12 50%,#f59e0b 100%)", accent: "#fb923c", glow: "#fde68a", font: "'Lilita One', sans-serif" },
        skin: "r9plaza",
        syms: syms([["🕰️", "Clocktower"], ["🎭", "Street Performer"], ["🏮", "Festival Lantern"], ["🍡", "Dango Stall"]], [["🎈", "Balloon"], ["🍭", "Lollipop"], ["🎀", "Ribbon"]], 0.3),
        look: { W: { e: "🎺", name: "BAND WILD" }, ZS: sp("🎇", "Sparkler"), ZT: sp("🎟️", "Festival Ticket") },
        w: { ...W_STD, W: [0, 0.8, 0.8, 0.8, 0] },
        features: { fountain: { p: 0.014 }, parade: { p: 0.004, spins: 3 }, firework: { p: 0.012 }, market: { p: 0.004, spins: 10 } },
        bgm: "pizzicato_march",
        omens: [{ fx: "shake", text: "🎺 A big festive parade is coming!!!" }, { fx: "rise", chars: ["🎈", "🎈", "🎈", "🎉"], text: "🎈 커다란 풍선이 둥실둥실…" }],
        tests: [["fountain", "⛲ FOUNTAIN SPLASH"], ["parade", "🎺 STREET PARADE (3스핀)"], ["firework", "🎇 FIREWORK FINALE"], ["market", "🎟️ NIGHT MARKET"]]
    },
    // ------------------------------------------------ 5. Mission Control (non-progressive)
    {
        id: "mission_control", name: "Mission Control", brand: "HYHG GAMING", engine: "sp_mission", progressive: false, jp: null, cover: "ignition", spinLabel: "🔴 IGNITION",
        bets: BETS_A, reels: 5, rows: 5, maxX: 3000, px: 1,
        jpText: "🪐 ZERO GRAVITY · 📡 SATELLITE LINK · 🛻 ROVER x2 · ⏱️ DEEP SPACE LAUNCH",
        desc: "위성 접시 · 우주인 헬멧 · 월면 탐사차 · 거대 카운트다운 스크린이 가득한 항공우주 관제 센터. 빨간 \"Ignition\" 스위치를 누르면 원격 신호가 육각 레이더 접시를 가로지르며 19개의 우주 아이콘을 밝힌다 (HEX 19 · 4개 이상 이웃 = 당첨). 🪐 ZERO GRAVITY = 당첨 심볼이 레이더 밖으로 둥실 떠나고 네 방향에서 새 심볼이 들어와 연쇄 · 📡 위성 접시 2개 = SATELLITE LINK — 둘 사이 레이저 빔 위 심볼이 전부 WILD · 🛻 ROVER EXPEDITION = 탐사차가 지나간 황금 바퀴 자국이 2스핀 동안 x2 스티키 배수 · ⏱️ 카운트다운 시계 3개 = DEEP SPACE LAUNCH — 성도에서 행성을 탭해 연료와 즉시 상금!",
        theme: { bg: "radial-gradient(circle at 50% 45%,#164e63 0%,#0f172a 45%,#020617 100%)", accent: "#22d3ee", glow: "#a5f3fc", font: "'Lilita One', sans-serif" },
        skin: "r9radar",
        syms: Object.fromEntries([["H1", "🚀", "Rocket"], ["H2", "👩‍🚀", "Astronaut"], ["H3", "🌕", "Full Moon"], ["H4", "🪐", "Ringed Planet"],
            ["L1", "⭐", "Star"], ["L2", "☄️", "Comet"], ["L3", "🔩", "Bolt"]].map(([k, e, name]) => [k, { e, name, pay: CPAY[k] }])),
        look: { W: { e: "🌌", name: "NEBULA WILD" }, ZS: sp("📡", "Satellite Dish"), ZC: sp("⏱️", "Countdown Clock") },
        w: { H1: 3, H2: 3.5, H3: 4, H4: 4.5, L1: 5.5, L2: 6, L3: 6.5, W: 0.5 },
        features: { zerog: { p: 0.014 }, satlink: { p: 0.012 }, rover: { p: 0.01, spins: 2 }, launch: { p: 0.0045 } },
        bgm: "lunar_festival",
        omens: [{ fx: "big", cls: "fly", icon: "🚀", text: LUCKY }, { fx: "wind", chars: ["🛸", "🛸", "👽", "🛸"], shake: true, text: "🛸 UFO 떼가 날아다닌다!" }, { fx: "big", cls: "fall", icon: "👽", shake: true, text: "A BIG MARTIAN IS LANDING!" }],
        tests: [["zerog", "🪐 ZERO GRAVITY"], ["satlink", "📡 SATELLITE LINK"], ["rover", "🛻 ROVER EXPEDITION"], ["launch", "⏱️ DEEP SPACE LAUNCH"]]
    },
    // ------------------------------------------------ 6. Glacier Slide
    {
        id: "glacier_slide", name: "Glacier Slide", brand: "IPEX", engine: "sp_slide", progressive: true, cover: "whistle", spinLabel: "📯 WHISTLE",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "턱시도 펭귄들이 얼음 미끄럼틀을 배로 타고 내려오며 물고기를 잡고 눈 요새를 쌓는 남극 놀이터. 호루라기를 불면 펭귄 15마리가 가파른 얼음 슬라이드 5개를 미끄러져 내려와 바닥 칸에 풍덩! (243 WAYS). 🧊 ICE BLOCK SMASH = 얼어붙은 심볼을 탭해 깨면 고배당 황금 물고기 · ☃️ SNOWBALL FIGHT = 양쪽 펭귄이 던진 눈덩이가 가운데서 충돌해 거대 2x2 WILD 눈덩이 · ⛏️ FISHING HOLE = 얼음 드릴이 가운데 칸을 뚫어 거대 청새치 = 즉시 베팅 10배 · 🌌 오로라 3개 = AURORA FREE SPINS — 하늘이 네온 초록으로! 10 무료 슬라이드, 펭귄 심볼 2배 지급",
        theme: { bg: "linear-gradient(180deg,#e0f2fe 0%,#7dd3fc 40%,#0369a1 100%)", accent: "#38bdf8", glow: "#f0f9ff", font: "'Lilita One', sans-serif" },
        skin: "r9ice",
        syms: syms([["🐠", "Golden Fish", "gold-fish"], ["🐧", "Emperor Penguin", "peng"], ["🛷", "Ice Sled"], ["🐣", "Penguin Chick", "peng"]], [["🐟", "Sardine"], ["❄️", "Snowflake"], ["⛄", "Snowman"]]),
        look: { W: { e: "🌨️", name: "SNOW WILD" }, ZI: sp("🧊", "Frozen Block", "sym-special r9-frozen"), ZA: sp("⛏️", "Ice Auger"), ZL: sp("🌌", "Northern Lights") },
        w: { ...W_STD, W: [0, 1.1, 1.1, 1.1, 0] },
        features: { ice: { p: 0.014 }, snowball: { p: 0.012 }, fishing: { p: 0.012, x: 10 }, aurora: { p: 0.004, spins: 10, tw: TW } },
        bgm: "synthwave",
        omens: [{ fx: "rain", chars: ["🧊", "🧊", "❄️"], shake: true }, { fx: "big", cls: "ice", icon: "🧊" }, { fx: "wind", chars: ["❄️", "🌨️", "💨", "❄️"], shake: true, text: "🌬️ 얼음 바람이 몰아친다!" }],
        tests: [["ice", "🧊 ICE BLOCK SMASH"], ["snowball", "☃️ SNOWBALL FIGHT"], ["fishing", "⛏️ FISHING HOLE (10x)"], ["aurora", "🌌 AURORA FREE SPINS"], ["aurora:GRAND", "🌌 AURORA → GRAND"]]
    },
    // ------------------------------------------------ 7. Pop Paradise
    {
        id: "pop_paradise", name: "Pop Paradise", brand: "Rabbit-Gaming", engine: "sp_pop", progressive: true, cover: "wand", spinLabel: "🫧 BLOW",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 4, rows: 4, maxX: 5000, px: 1,
        desc: "무지갯빛 비눗방울 · 명랑한 바다거북 · 진주 조개 · 가라앉은 보물상자가 있는 산호초. 요술봉으로 비눗방울을 불면 투명한 방울 16개가 4x4로 떠오른다 (256 WAYS). 🫧 BUBBLE MERGE = 같은 방울 두 개가 붙어 있으면 합쳐져 2배 크기 · 2배 지급 · 💥 CHAIN POP = 당첨 방울이 톡! 터지고 위 방울이 내려와 연쇄 당첨 · 🐡 PUFFERFISH INFLATE = 복어가 부풀어 주변 저배당 방울을 터뜨리고 진주로 교체 · 🪄 황금 요술봉 3개 = BUBBLE BATH BONUS — 30개의 방울! 10초 안에 탭해서 현금 방울을 터뜨려라!",
        theme: { bg: "linear-gradient(180deg,#a5f3fc 0%,#22d3ee 35%,#0e7490 75%,#164e63 100%)", accent: "#f472b6", glow: "#fdf4ff", font: "'Lilita One', sans-serif" },
        skin: "r9bubble",
        syms: syms([["🐢", "Sea Turtle"], ["🦪", "Pearl Clam"], ["🧰", "Treasure Chest"], ["🐠", "Reef Fish"]], [["🔴", "Red Bubble", "bub"], ["🟢", "Green Bubble", "bub"], ["🔵", "Blue Bubble", "bub"]], 0.9),
        look: { W: { e: "🌈", name: "RAINBOW WILD" }, ZF: sp("🐡", "Pufferfish"), ZW: sp("🪄", "Golden Wand") },
        w: { ...W_STD, W: [0, 0.8, 0.8, 0] },
        features: { merge: { p: 0.014 }, chain: { p: 0.014 }, puffer: { p: 0.009 }, bath: { p: 0.0045, tw: TW } },
        bgm: "tropical_steel",
        omens: [{ fx: "big", cls: "grow", icon: "🐡", text: LUCKY }, { fx: "pop", chars: ["🐡", "💥", "🐡", "🫧"], text: "🐡 Puffer Pops!!!!!!!!" }, { fx: "rise", chars: ["🫧", "🫧", "🫧", "🫧"], shake: true }],
        tests: [["merge", "🫧 BUBBLE MERGE x2"], ["chain", "💥 CHAIN POP"], ["puffer", "🐡 PUFFERFISH INFLATE"], ["bath", "🪄 BUBBLE BATH BONUS"], ["bath:GRAND", "🪄 BUBBLE BATH → GRAND"]]
    },
    // ------------------------------------------------ 8. Sunken Galleon (non-progressive)
    {
        id: "sunken_galleon", name: "Sunken Galleon", brand: "YG GAMING", engine: "sp_galleon", progressive: false, jp: null, cover: "flashlight", spinLabel: "🔦 SHINE",
        bets: [500, 1000, 1500, 2000, 2500, 3000], reels: 5, rows: 3, maxX: 3000, px: 1,
        jpText: "💣 CANNONBALL · 🐙 TENTACLE GRAB · 🧭 COMPASS SPIN · 🗝️ CAPTAIN'S CHEST",
        desc: "따개비 덮인 대포 · 유령 해적 나침반 · 빛나는 해파리 · 쏟아진 금화가 잠든 음울한 심해 폐허. 잠수부의 손전등이 어두운 화물칸을 비추면 5x3으로 쌓인 낡은 나무 상자 15개가 드러난다 (25 LINES). 💣 CANNONBALL BLAST = 가라앉은 대포가 무작위로 발사돼 잠긴 상자 3개를 부수고 WILD 금화 · 🐙 TENTACLE GRAB = 크라켄의 다리가 솟아 꽝 열 하나를 끌어내리고 고배당 보물로 교체 · 🧭 COMPASS SPIN = 황금 나침반이 가리키는 방향의 줄이 전부 해골로 · 🗝️ 해골 열쇠 3개 = CAPTAIN'S CHEST — 보물방의 상자를 탭해 배수와 즉시 상금!",
        theme: { bg: "radial-gradient(ellipse at 50% 0%,#155e75 0%,#082f49 45%,#020617 100%)", accent: "#fbbf24", glow: "#5eead4", font: "'Rye', serif" },
        skin: "r9crate",
        syms: lsyms([["H1", "💀", "Pirate Skull"], ["H2", "🏴‍☠️", "Jolly Roger"], ["H3", "🪼", "Glowing Jellyfish"], ["H4", "🗡️", "Cutlass"], ["L1", "⚓", "Anchor"], ["L2", "🐚", "Shell"], ["L3", "🦀", "Crab"]]),
        look: { W: { e: "🪙", name: "DOUBLOON WILD" }, ZC: sp("🧭", "Golden Compass"), ZK: sp("🗝️", "Skeleton Key") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        features: { cannon: { p: 0.014 }, tentacle: { p: 0.012 }, compass: { p: 0.012 }, chest: { p: 0.0045 } },
        bgm: "tropical_steel",
        omens: [{ fx: "big", cls: "wrap", icon: "🐙", shake: true }, { fx: "flood" }],
        tests: [["cannon", "💣 CANNONBALL BLAST"], ["tentacle", "🐙 TENTACLE GRAB"], ["compass", "🧭 COMPASS SPIN"], ["chest", "🗝️ CAPTAIN'S CHEST"]]
    },
    // ------------------------------------------------ 9. Phantom Manor (double reels)
    {
        id: "phantom_manor", name: "Phantom Manor", brand: "Scrooge-Slots", engine: "sp_manor", progressive: true, cover: "chime", spinLabel: "🔔 CHIME",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 4, rows: 3, maxX: 5000, px: 1, dbl: true,
        desc: "떠다니는 촛대 · 장난꾸러기 폴터가이스트 · 유령 초상화 · 엑토플라즘의 장난스러운 유령 저택. 먼지 낀 현관 차임을 울리면 대계단의 유령 액자 12개가 빙글 돌며 심볼을 드러낸다 (4x3 · 81 WAYS). 👻 POLTERGEIST POSSESSION = 유령이 무작위 심볼에 빙의 — 매 스핀 돌아다니는 WILD · 🟢 ECTOPLASM SLIME = 당첨 심볼은 액자에 초록 점액을 남긴다 — 점액 액자에서 또 당첨되면 3배! · 🔮 수정구슬 3개 = SÉANCE TABLE — 영혼이 불려와 저배당 촛불 심볼을 전부 유령 거울로 업그레이드 · 🗝️ 해골 열쇠 3개 = ATTIC ESCAPE — 무료스핀 후 다락방 트렁크를 탭해 유령을 쫓고 숨은 코인을 모아라!",
        theme: { bg: "linear-gradient(180deg,#1e1b4b 0%,#3b0764 45%,#052e16 100%)", accent: "#4ade80", glow: "#c4b5fd", font: "'Creepster', 'Lilita One', cursive" },
        skin: "r9frames",
        syms: syms([["🪞", "Haunted Mirror"], ["🖼️", "Haunted Portrait"], ["🎹", "Phantom Organ"], ["🦇", "Bat"]], [["🕯️", "Tall Candle", "candle"], ["🪔", "Oil Candle", "candle"], ["🕸️", "Cobweb"]], 0.9),
        look: { W: { e: "👻", name: "POLTERGEIST WILD" }, ZB: sp("🔮", "Crystal Ball"), ZK: sp("🗝️", "Skeleton Key") },
        w: { ...W_STD, W: [0, 0.9, 0.9, 0] },
        features: { possess: { p: 0.012, spins: 4 }, slime: { p: 0.01 }, seance: { p: 0.006 }, attic: { p: 0.0045, spins: 6, tw: TW } },
        bgm: "organ_waltz",
        omens: [{ fx: "wind", chars: ["🦇", "🦇", "🦇", "🌙"], shake: true }, { fx: "pop", chars: ["🧟", "🧟‍♀️", "🧟‍♂️", "🧟"], text: "🧟 좀비 떼가 갑자기 몰려온다!" }, { fx: "blood", scream: true }],
        tests: [["possess", "👻 POLTERGEIST POSSESSION"], ["slime", "🟢 ECTOPLASM SLIME x3"], ["seance", "🔮 SÉANCE TABLE"], ["attic", "🗝️ ATTIC ESCAPE"], ["attic:GRAND", "🗝️ ATTIC → GRAND"]]
    },
    // ------------------------------------------------ 10. Midnight Boneyard (non-progressive)
    {
        id: "midnight_boneyard", name: "Midnight Boneyard", brand: "BLK", engine: "sp_boneyard", progressive: false, jp: null, cover: "shovel", spinLabel: "⛏️ DIG",
        bets: BETS_A, reels: 5, rows: 3, maxX: 3000, px: 1,
        jpText: "💀 SKELETON DANCE · 🧿 WILL-O'-THE-WISP · ⛏️ GRAVE ROBBER · 🌕 FULL MOON",
        desc: "삐뚤어진 철문 · 빛나는 잭오랜턴 · 이끼 낀 묘비 · 춤추는 해골이 있는 안개 낀 달밤의 묘지. 삽을 흙에 꽂으면 5x3 묘지의 이끼 묘비 15개가 땅 위로 솟아오른다 (243 WAYS). 💀 SKELETON DANCE = 해골 심볼 → 해골이 일어나 뼈를 덜그럭! 저배당 심볼을 털어내고 무료 연쇄 · 🧿 WILL-O'-THE-WISP = 푸른 도깨비불이 묘비에 내려앉아 다음 2스핀 동안 스티키 WILD · ⛏️ GRAVE ROBBER'S SHOVEL = 꽝 스핀에 삽이 묻힌 보물상자를 파내 위로금 · 🏮 유령 랜턴 3개 = FULL MOON RESURRECTION — 10 무료스핀, 당첨 묘비는 계속 솟은 채 배수 +1x씩!",
        theme: { bg: "radial-gradient(circle at 75% 15%,#fef9c3 0 4%,#475569 5%,#1e293b 35%,#020617 100%)", accent: "#a3e635", glow: "#93c5fd", font: "'Creepster', 'Lilita One', cursive" },
        skin: "r9grave",
        syms: syms([["🎃", "Jack-o'-Lantern"], ["🪦", "Mossy Headstone"], ["🦉", "Night Owl"], ["🕷️", "Spider"]], [["🕯️", "Candle"], ["🍂", "Dead Leaf"], ["🪱", "Worm"]]),
        look: { W: { e: "🧿", name: "WISP WILD" }, ZS: sp("💀", "Dancing Skull"), ZL: sp("🏮", "Haunted Lantern") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        features: { skeleton: { p: 0.014 }, wisp: { p: 0.01, spins: 2 }, shovel: { p: 0.02 }, moon: { p: 0.004, spins: 10 } },
        bgm: "organ_waltz",
        omens: [{ fx: "wind", chars: ["👻", "👻", "🌫️", "👻"], shake: true }, { fx: "pop", chars: ["👻", "🩷", "👻", "💜", "👻", "💚"], text: "👻 알록달록 귀여운 유령들!" }, { fx: "burst", icon: "👻", chars: ["🩸", "💣", "🩸"], shake: true, text: "👻 유령이 피 폭탄을 뱉는다!" }],
        tests: [["skeleton", "💀 SKELETON DANCE"], ["wisp", "🧿 WILL-O'-THE-WISP (2스핀)"], ["shovel", "⛏️ GRAVE ROBBER'S SHOVEL"], ["moon", "🌕 FULL MOON RESURRECTION"]]
    },
    // ------------------------------------------------ 11. Crimson Moon
    {
        id: "crimson_moon", name: "Crimson Moon", brand: "CLOUD GAMING", engine: "sp_crimson", progressive: true, cover: "organ", spinLabel: "🎹 STRIKE",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 5, rows: 4, maxX: 5000, px: 1,
        desc: "스테인드글라스 창 · 흡혈 박쥐 · 성배 · 거대한 핏빛 달이 걸린 고딕 트란실바니아 요새. 대성당 오르간 화음을 치면 5x4 스테인드글라스 창이 산산조각 났다가 화려한 고딕 심볼로 다시 맞춰진다 (1024 WAYS). 🦇 BAT SWARM = 박쥐 떼가 창을 가로질러 3~5칸에 내려앉아 드라큘라 심볼로 · 🌕 BLOOD MOON RISE = 창 꼭대기에 붉은 보름달이 뜨면 모든 성배 심볼이 황금으로 넘쳐 x3 WILD · ⚰️ COFFIN LID CREAK = 나무 관을 탭해 열면 즉시 상금 또는 뱀파이어 신부 확장 WILD · ✝️ 은 십자가 3개 = CASTLE CRYPT BONUS — 지하 묘지의 석관을 탭해 12 무료스핀과 배수 수집!",
        theme: { bg: "radial-gradient(circle at 50% 8%,#fecaca 0 5%,#b91c1c 7%,#450a0a 35%,#0c0a09 100%)", accent: "#ef4444", glow: "#fecaca", font: "'Creepster', 'Lilita One', cursive" },
        skin: "r9glass",
        syms: syms([["🧛", "Dracula"], ["🍷", "Chalice"], ["🦇", "Vampire Bat"], ["🏰", "Castle"]], [["🌹", "Rose"], ["🕯️", "Candle"], ["💍", "Ring"]], 0.4),
        look: { W: { e: "👰", name: "BRIDE WILD" }, W3: { e: "🏆", name: "GOLDEN CHALICE x3", cls: "sym-wild r9-chalice" }, ZC: sp("⚰️", "Wooden Coffin"), ZR: sp("✝️", "Silver Cross") },
        w: { ...W_STD, W: [0, 0.8, 0.8, 0.8, 0] },
        features: { bats: { p: 0.014 }, bloodmoon: { p: 0.007 }, coffin: { p: 0.012 }, crypt: { p: 0.004, spins: 12, tw: TW } },
        bgm: "pizzicato_march",
        omens: [{ fx: "big", cls: "rise", icon: "🧛", shake: true }, { fx: "big", cls: "fangs", icon: "🦷", shake: true }, { fx: "rain", chars: ["👁️", "👁️", "🩸"] }],
        tests: [["bats", "🦇 BAT SWARM"], ["bloodmoon", "🌕 BLOOD MOON RISE"], ["coffin", "⚰️ COFFIN LID CREAK"], ["crypt", "✝️ CASTLE CRYPT BONUS"], ["crypt:GRAND", "✝️ CRYPT → GRAND"]]
    }
];

// casino placement (LOCATIONS[].slots in js/data/catalog.js) — one casino each, never shared
export const WONDER_HOME = {
    chaos_cube: "random_casino", curio_cabinet: "odd_casino", percentage_plaza: "rtp_town", town_festival: "plaza", mission_control: "space_center",
    glacier_slide: "penguin_casino", pop_paradise: "bubble", sunken_galleon: "shipwreck", phantom_manor: "graveyard", midnight_boneyard: "ghost", crimson_moon: "dracula"
};

// pay scale (px) per machine, solved with a 150k-spin browser simulation (filled in after tuning)
const PX = {
    chaos_cube: 1.74, curio_cabinet: 1.025, percentage_plaza: 0.91, town_festival: 0.807, mission_control: 1.76, glacier_slide: 1.12,
    pop_paradise: 0.913, sunken_galleon: 1.158, phantom_manor: 1.056, midnight_boneyard: 1.123, crimson_moon: 0.956
};
for (const s of WONDER_SLOTS) s.px = PX[s.id] ?? s.px;
