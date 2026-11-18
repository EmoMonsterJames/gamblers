// =====================================================================
// The 11 round-10 machines (spooky mansion / midnight big top / clockwork
// fate / harvest hex / vault breaker / deepwater fishing / magma core /
// astral ascension / doll factory / eucalyptus rush / grimoire of fortune).
// Engine: js/slots/mythEngine.js (engine: "sp_*", dispatched from
// specialEngine.specialSpin), renderer: js/screens/slotSpecial.js.
// Same contract as wonderConfigs.js: feature-first bonuses (features.*.p ×
// pet luck), teasing + near-miss, P icons, progressive pools, omens.
// px scales every cash prize except jackpots — solved by a 150k+ spin
// browser simulation (PX at the bottom). Bonus icons are Z* keys.
// cover "drift" = coverIcons drifting over the landing reels + coverText.
// =====================================================================
const BETS_A = [100, 200, 300, 500, 800, 1000];
const sp = (e, name, cls = "sym-special") => ({ e, name, cls });
const PROG = (major, grand, cap) => ({ MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: major, rate: 0.01 }, GRAND: { seed: grand, rate: 0.02, cap } });
const LUCKY = "🍀 Lucky has arrived 🍀";
const TW = { MINI: 55, MINOR: 28, MAXI: 12, MAJOR: 4, GRAND: 1 };
const HI = [[0.6, 2, 6], [0.5, 1.5, 4], [0.4, 1.2, 3], [0.3, 1, 2.5]];
const LO = [[0.12, 0.3, 0.7], [0.1, 0.25, 0.6], [0.08, 0.2, 0.5]];
// 4 highs + 3 lows, 3 / 4 / 5 of a kind (ways)
const syms = (hi, lo, scale = 1) => Object.fromEntries([
    ...hi.map(([e, name, cls], i) => ["H" + (i + 1), { e, name, cls, pay: HI[i].map(x => +(x * scale).toFixed(3)) }]),
    ...lo.map(([e, name, cls], i) => ["L" + (i + 1), { e, name, cls, pay: LO[i].map(x => +(x * scale).toFixed(3)) }])
]);
// any custom pay table: [[key, e, name, pay[]], …]
const tsyms = list => Object.fromEntries(list.map(([k, e, name, pay]) => [k, { e, name, pay }]));
const W_STD = { H1: 2.5, H2: 3, H3: 3.5, H4: 4, L1: 6, L2: 6.5, L3: 7 };

export const MYTH_SLOTS = [
    // ------------------------------------------------ 1. Spooky Mansion Project (HP system)
    {
        id: "spooky_mansion", name: "Spooky Mansion Project", brand: "Death Slot", engine: "sp_spooky", progressive: true, cover: "drift", spinLabel: "📸 INVESTIGATE",
        coverIcons: ["👻", "🔦", "📸", "👻", "🕯️"], coverText: "EMF ▮▮▮▮▯",
        jp: { ...PROG(40000, 400000, 1500000), MEGA: { sum: true } }, jpLabel: { MEGA: "👻 PHANTOM" },
        bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "초자연 현상 조사단이 버려진 저택에 들어섰다 — 깜빡이는 손전등, 삐삐 울리는 EMF 측정기, 흐릿한 심령사진 (243 WAYS). ❤️ HP 시스템 = 조사원 체력 100으로 시작, 스핀마다 -1 HP · 🕯️ 촛불 +5 / 💧 성수 +10 회복 · 👻 폴터가이스트가 나타나면 -10 HP — 🧿 부적이 같이 뜨면 막아낸다! · 🔮 수정구슬 3개 = SÉANCE HOLD & SPIN (위자 보드 위 영혼 코인 · 유령 습격 · 중간에 CASH OUT 가능) · 🕰️ 괘종시계 3개 = MIDNIGHT HUNT 10 무료스핀 (HP 소모 없음 · 🔦 손전등 WILD가 x2~x10 배수와 +5 HP 물약을 비춘다) · 💀 HP 0 = EXORCISM WHEEL — 위로금 배수 / 50 HP 부활 / 빙의 슈퍼스핀(가운데 3릴 전부 WILD 후 HP 100 리셋)! 👻 PHANTOM = 모든 잭팟 합계.",
        theme: { bg: "radial-gradient(circle at 50% 0%,#334155 0%,#1e1b4b 35%,#0b0613 100%)", accent: "#a3e635", glow: "#e9d5ff", font: "'Creepster', 'Lilita One', cursive" },
        skin: "r10spooky",
        syms: syms([["🏚️", "Haunted Mansion"], ["📸", "Spirit Camera"], ["📟", "EMF Meter"], ["🎙️", "EVP Recorder"]], [["📜", "Old Letter"], ["🧸", "Creepy Teddy"], ["🕸️", "Cobweb"]]),
        look: {
            W: { e: "🔦", name: "FLASHLIGHT WILD" }, W2: { e: "🔦", name: "FLASHLIGHT x2", cls: "sym-wild r10-mult" }, W3: { e: "🔦", name: "FLASHLIGHT x3", cls: "sym-wild r10-mult" }, W5: { e: "🔦", name: "FLASHLIGHT x5", cls: "sym-wild r10-mult" }, W10: { e: "🔦", name: "FLASHLIGHT x10", cls: "sym-wild r10-mult" },
            ZC: sp("🕯️", "Candle +5 HP", "sym-special r10-heal"), ZH: sp("💧", "Holy Water +10 HP", "sym-special r10-heal"), ZG: sp("👻", "Poltergeist -10 HP", "sym-special r10-drain"), ZA: sp("🧿", "Charm"),
            ZB: sp("🔮", "Crystal Ball"), ZK: sp("🕰️", "Grandfather Clock"), ZS: sp("💀", "Spirit Coin")
        },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        hp: { max: 100, spin: 1, candle: 0.07, holy: 0.03, polter: 0.035, charm: 0.4 },
        features: { seance: { p: 0.0045, tw: TW }, hunt: { p: 0.004, spins: 10 }, exorcism: { tw: TW } },
        bgm: "organ_waltz",
        omens: [{ fx: "shake" }, { fx: "big", cls: "rise", icon: "👻", text: "Boooooooooooooooo!!!!" }, { fx: "shake", text: "☠️ You will perish soon!!!!!", scream: true }],
        tests: [["seance", "🔮 SÉANCE HOLD & SPIN"], ["seance:GRAND", "🔮 SÉANCE → GRAND"], ["hunt", "🕰️ MIDNIGHT HUNT 10 FS"], ["exorcism", "💀 EXORCISM WHEEL (HP 0)"], ["exorcism:MEGA", "💀 EXORCISM → 👻 PHANTOM"], ["polter", "👻 POLTERGEIST (-10 HP)"]]
    },
    // ------------------------------------------------ 2. Midnight Big Top (non-progressive, risk levels)
    {
        id: "midnight_bigtop", name: "Midnight Big Top", brand: "HYHG GAMING", engine: "sp_bigtop", progressive: false, jp: null, cover: "drift", spinLabel: "🎪 SHOWTIME",
        coverIcons: ["🎈", "🤡", "🎪", "🃏", "🎈"], coverText: "SHOWTIME!",
        bets: [100, 200, 300, 400, 500], fearPoints: true, reels: 5, rows: 3, maxX: 3000, px: 1,
        jpText: "🪞 MIRROR MAZE · 🔪 WHEEL OF KNIVES · 🎟️ FREAKSHOW · 🎩 RINGMASTER'S ENCORE",
        desc: "자정의 서커스 천막 — 깨진 거울, 칼 던지는 곡예사, 삐걱이는 회전목마, 웃는지 우는지 모를 광대들 (243 WAYS). 😱 FEAR POINTS = 베팅 1~5단계(100~500G): 1~2단계는 잔잔한 서커스, 4~5단계는 어둠이 깔리며 당첨에 최대 x5 공포 배수가 붙는다! · 🪞 깨진 거울 3개 = FUNHOUSE MIRROR MAZE (거울 3개 중 하나 선택 → 안전하면 상금 2배, 🃏 광대가 나오면 종료) · 🔪 칼잡이가 3번 릴에 = WHEEL OF KNIVES (공포 단계만큼 단검 3~5자루 · 조수는 피해라!) · 🎟️ 티켓 3개 = FREAKSHOW 8 무료스핀 (광대 WILD가 릴 전체로 늘어난다) · 🎩 실크해트 미터 = 쓴 공포 포인트가 100까지 차면 RINGMASTER'S ENCORE — 5x5 풍선 홀드앤스핀, 풍선이 계속 부풀어 오른다!",
        theme: { bg: "repeating-conic-gradient(from 0deg at 50% 0%,#7f1d1d 0 10deg,#1c1917 10deg 20deg)", accent: "#f43f5e", glow: "#fde047", font: "'Rye', 'Lilita One', serif" },
        skin: "r10bigtop",
        syms: syms([["🎪", "Big Top"], ["🦁", "Lion"], ["🎠", "Carousel"], ["🤹", "Juggler"]], [["🎈", "Balloon"], ["🍿", "Popcorn"], ["🥜", "Peanuts"]]),
        look: { W: { e: "🤡", name: "CLOWN WILD" }, ZM: sp("🪞", "Cracked Mirror"), ZK: sp("🔪", "Knife Thrower"), ZT: sp("🎟️", "Ticket"), ZL: sp("🎈", "Balloon", "sym-special r10-balloon") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        fear: { q: [0, 0.04, 0.09, 0.15, 0.2], m: [[2, 5], [3, 3], [4, 1.5], [5, 0.8]] },
        features: { mirror: { p: 0.006 }, knives: { p: 0.008 }, freak: { p: 0.004, spins: 8 }, encore: { rate: 0.25 } },
        bgm: "organ_waltz",
        omens: [{ fx: "shake", text: "🎪 Circus Time!" }, { fx: "big", cls: "grow", icon: "🤡" }, { fx: "rain", chars: ["🔴", "🟡", "🔵", "🟢", "🟣"], shake: true }],
        tests: [["mirror", "🪞 FUNHOUSE MIRROR MAZE"], ["knives", "🔪 WHEEL OF KNIVES"], ["freak", "🎟️ FREAKSHOW 8 FS"], ["encore", "🎩 RINGMASTER'S ENCORE"]]
    },
    // ------------------------------------------------ 3. Clockwork Fate (3 rings × 3 pointers)
    {
        id: "clockwork_fate", name: "Clockwork Fate", brand: "BLK", engine: "sp_fate", progressive: true, cover: "drift", spinLabel: "⚙️ WIND UP",
        coverIcons: ["⚙️", "🔩", "⚙️", "⏳", "⚙️"], coverText: "TICK · TOCK",
        jp: PROG(40000, 400000, 1500000), bets: [200, 400, 600, 800, 1000], reels: 3, rows: 3, maxX: 5000, px: 1,
        desc: "황동 톱니와 별자리 시계 장치가 운명을 계산한다. 크랭크를 감으면 세 개의 동심원 황동 링이 각자 돌아간다 — 바깥 링 = 상금 심볼, 가운데 링 = 수정자(WILD · x2 · x3), 안쪽 링 = 보너스 장치. 위 · 왼쪽 · 오른쪽 세 황금 바늘(가로줄)이 가리키는 바깥 링 심볼이 2개 이상 같으면 당첨, 가운데 링 수정자가 곱해진다! · ⚙️ 안쪽 링 톱니 3개 = ALCHEMIST'S VAULT (3x3 미니 릴 5 무료스핀 · 바깥 링이 x2~x15 배수를 돌린다) · 🔍 수정 렌즈 = TAROT CONSTELLATIONS (별 카드 12장 — 코인 · 링 업그레이드 · 🌑 ECLIPSE는 같은 별자리 3장으로 MINI/MAJOR/GRAND) · ⚡ OVERDRIVE = 바늘 2개가 일치하면 전류로 잠기고 나머지 링만 리스핀 — 일치하거나 ⚡볼트가 뜨면 연쇄, 배수가 쌓인다!",
        theme: { bg: "radial-gradient(circle,#78350f 0%,#451a03 45%,#0c0a09 100%)", accent: "#f59e0b", glow: "#fde68a", font: "'Rye', serif" },
        skin: "r10rings",
        syms: tsyms([["H1", "♌", "Leo Sigil", [3, 30]], ["H2", "♏", "Scorpio Sigil", [2.5, 20]], ["H3", "♓", "Pisces Sigil", [2, 15]], ["H4", "♈", "Aries Sigil", [1.5, 10]], ["L1", "🔔", "Brass Bell", [0.8, 5]], ["L2", "🗝️", "Brass Key", [0.6, 4]], ["L3", "🔩", "Bolt Nut", [0.5, 3]]]),
        look: {
            W: { e: "🌟", name: "STAR WILD" }, X2: { e: "x2", name: "x2 GEAR", cls: "sym-special r10-mod" }, X3: { e: "x3", name: "x3 GEAR", cls: "sym-special r10-mod" }, M0: { e: "⚙️", name: "Idle Gear", cls: "r10-idle" },
            I0: { e: "·", name: "Empty Socket", cls: "r10-idle" }, ZG: sp("⚙️", "Golden Gear"), ZL: sp("🔍", "Crystal Lens"), ZB: sp("⚡", "Bolt")
        },
        w: { H1: 2, H2: 2.5, H3: 3, H4: 3.5, L1: 5, L2: 5.5, L3: 6 },
        ring: { mid: { M0: 14, W: 1.4, X2: 1.6, X3: 0.7 }, inner: { I0: 30, ZB: 1.2 } },
        features: { alchemist: { p: 0.004, spins: 5, tw: TW }, tarot: { p: 0.005, tw: { MINI: 60, MAJOR: 7, GRAND: 1 } }, overdrive: { p: 0.012 } },
        bgm: "pizzicato_march",
        omens: [{ fx: "shake" }, { fx: "tick", chars: ["⏱️", "⏰", "🕰️", "⌛"], text: "⏱️ 째깍째깍째깍째깍째깍!!!" }, { fx: "big", cls: "grow", icon: "🕰️" }],
        tests: [["alchemist", "⚙️ ALCHEMIST'S VAULT"], ["alchemist:GRAND", "⚙️ ALCHEMIST → GRAND"], ["tarot", "🔍 TAROT CONSTELLATIONS"], ["overdrive", "⚡ OVERDRIVE MECHANISM"]]
    },
    // ------------------------------------------------ 4. Harvest Hex (19-hex farm field)
    {
        id: "harvest_hex", name: "Harvest Hex", brand: "CLOVER-TECH", engine: "sp_harvest", progressive: true, cover: "drift", spinLabel: "🚜 HARVEST",
        coverIcons: ["🚜", "🌾", "🌾", "🌾", "🌾"], coverText: "HARVEST SWEEP",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 5, rows: 5, maxX: 5000, px: 1,
        desc: "끝없는 황금 들판의 육각형 농장 — 19칸 벌집 밭을 콤바인이 \"HARVEST SWEEP\"하며 지나가면 작물이 새로 자란다. 같은 작물 5개 이상이 붙어 있으면 클러스터 당첨 · 💧 관개 수로 칸에 닿은 클러스터는 x2! · 🛸 CROP CIRCLE UFO = 무작위로 UFO가 작물 4~7개를 들어 올려 2x2 메가 작물이나 황금 돌연변이 WILD로 — 당첨 보장 · 🐦‍⬛ 까마귀 3개 = SCARECROW TOWER DEFENSE (까마귀 떼를 탭해 쫓으면 상금과 배수 씨앗) · 🔨 경매 망치 3개 = BARN AUCTION (상자 3개 — 제안을 받을지 더 부를지, 너무 욕심내면 BUST!) · 🚿 물뿌리개 3개 = GREENHOUSE GRAFTING 리스핀 (온실 돔이 잠기고 잡종 슈퍼작물이 이웃 값을 곱한다)",
        theme: { bg: "linear-gradient(180deg,#7dd3fc 0%,#fde68a 38%,#65a30d 70%,#3f6212 100%)", accent: "#facc15", glow: "#fef9c3", font: "'Lilita One', sans-serif" },
        skin: "r10hex",
        syms: tsyms([["H1", "🎃", "Giant Pumpkin", [1.2, 3, 8]], ["H2", "🌽", "Golden Corn", [1, 2.5, 6]], ["H3", "🍓", "Strawberry", [0.8, 2, 5]], ["H4", "🥕", "Carrot", [0.6, 1.5, 4]], ["L1", "🌾", "Wheat", [0.3, 0.8, 2]], ["L2", "🥬", "Lettuce", [0.25, 0.6, 1.6]], ["L3", "🫛", "Pea Pod", [0.2, 0.5, 1.2]]]),
        look: { W: { e: "🌟", name: "GOLDEN MUTANT WILD" }, ZI: sp("💧", "Irrigation", "sym-special r10-water"), ZC: sp("🐦‍⬛", "Crow"), ZG: sp("🔨", "Auction Gavel"), ZW: sp("🚿", "Watering Can"), ZX: { e: "", name: "", cls: "r10-off" }, ZS: sp("🌱", "Seed Dome") },
        w: { H1: 2, H2: 2.4, H3: 2.8, H4: 3.2, L1: 5, L2: 5.4, L3: 5.8, W: 0.5, ZI: 0.6 },
        features: { ufo: { p: 0.012 }, scarecrow: { p: 0.006 }, auction: { p: 0.005 }, greenhouse: { p: 0.004, tw: TW } },
        bgm: "banjo_country",
        omens: [{ fx: "pop", chars: ["🐄", "🐖", "🐑", "🐓", "🐴", "🦆"], text: "🐄 농장 동물들이 몰려왔다!" }, { fx: "rain", chars: ["🌾", "🌾", "🪵"], shake: true }, { fx: "shake", text: "🌾 Harvest Time!!!!!!!!!!!!!!" }],
        tests: [["ufo", "🛸 CROP CIRCLE UFO"], ["scarecrow", "🐦‍⬛ SCARECROW TOWER DEFENSE"], ["auction", "🔨 BARN AUCTION"], ["greenhouse", "🚿 GREENHOUSE GRAFTING"], ["greenhouse:GRAND", "🚿 GREENHOUSE → GRAND"]]
    },
    // ------------------------------------------------ 5. Vault Breaker: Billionaire Rush (25 capsules, 4+ anywhere)
    {
        id: "vault_breaker", name: "Vault Breaker: Billionaire Rush", brand: "YG GAMING", engine: "sp_vault", progressive: true, cover: "drift", spinLabel: "💼 BREAK IN",
        coverIcons: ["💵", "💰", "💎", "💵", "🪙"], coverText: "PNEUMATIC TUBE ▸▸▸",
        jp: PROG(60000, 600000, 2500000), bets: [300, 600, 900, 1500, 2000], reels: 5, rows: 5, maxX: 5000, px: 1,
        desc: "억만장자의 금고 건물 — 나선형 공압 튜브 속 캡슐 25개가 쉭쉭 내려와 자리를 잡는다. 같은 캡슐이 튜브 어디서든 4개 이상 연달아 이어지면 증발하며 당첨 → 빈자리에 새 캡슐이 내려와 연쇄! · 🐂 황소 3개 = INSIDER TRADING TICKER (6틱 동안 배수가 오른다 — 폭락 전에 SELL!) · 📘 설계도 3개 = LASER GRID HEIST (레이저 노드를 해킹해 그랜드 금고로 · 경보가 울리면 끝) · 🗝️ 열쇠 캡슐 = SWISS BANK SAFE-CRACKING (다이얼 텀블러 3개 · 데드볼트가 걸리면 미스터리 서류가방!) · 💼 현금 가방 미터 10개 = HOSTILE TAKEOVER BOARDROOM (3라운드 — 안전 투자 vs 주사위 올인 합병)",
        theme: { bg: "linear-gradient(160deg,#0f172a 0%,#1e293b 40%,#713f12 100%)", accent: "#fbbf24", glow: "#fef3c7", font: "'Lilita One', sans-serif" },
        skin: "r10vault",
        syms: tsyms([["H1", "💎", "Diamond Capsule", [1, 3, 8, 25]], ["H2", "🏎️", "Supercar Capsule", [0.8, 2, 6, 18]], ["H3", "⌚", "Gold Watch Capsule", [0.6, 1.5, 4, 12]], ["H4", "🍾", "Champagne Capsule", [0.5, 1.2, 3, 9]], ["L1", "💵", "Dollar Capsule", [0.25, 0.6, 1.5, 5]], ["L2", "🪙", "Coin Capsule", [0.2, 0.5, 1.2, 4]], ["L3", "💳", "Card Capsule", [0.15, 0.4, 1, 3]]]),
        look: { W: { e: "🏦", name: "VAULT WILD" }, ZB: sp("🐂", "Bull"), ZP: sp("📘", "Blueprint"), ZK: sp("🗝️", "Key Capsule"), ZC: sp("💼", "Cash Briefcase") },
        w: { H1: 2, H2: 2.4, H3: 2.8, H4: 3.2, L1: 7, L2: 7, L3: 7, W: 0.8 },
        features: { ticker: { p: 0.005 }, laser: { p: 0.004, nodes: 12, alarms: 3, mult: [[2, 30], [3, 25], [5, 15], [8, 8], [12, 4], ["MINI", 6], ["MINOR", 3], ["MAJOR", 0.6]] }, safe: { p: 0.006, tw: TW }, takeover: { brief: 0.03, max: 10 } },
        bgm: "pizzicato_march",
        omens: [{ fx: "shake", text: "💵 Show me the money!!!!!" }, { fx: "wind", chars: ["💵", "💸", "💵", "💶"], shake: true }, { fx: "pop", chars: ["💵", "🏎️", "🚗", "💰", "🏎️"], text: "Dollars and cars!!!!!!!!!!!" }],
        tests: [["ticker", "🐂 INSIDER TRADING TICKER"], ["laser", "📘 LASER GRID HEIST"], ["safe", "🗝️ SWISS BANK SAFE-CRACKING"], ["safe:GRAND", "🗝️ SAFE → GRAND"], ["takeover", "💼 HOSTILE TAKEOVER"]]
    },
    // ------------------------------------------------ 6. Deepwater Fishing (circular sonar 3 rings × 8 sectors)
    {
        id: "deepwater_fishing", name: "Deepwater Fishing", brand: "DAEBAK", engine: "sp_sonar", progressive: true, cover: "drift", spinLabel: "📡 SONAR",
        coverIcons: ["🐟", "🐠", "🫧", "🐟", "🐡"], coverText: "PING · · ·",
        jp: { ...PROG(40000, 400000, 1500000), MEGA: { sum: true } }, jpLabel: { MEGA: "🐋 LEVIATHAN" },
        bets: BETS_A, reels: 8, rows: 3, maxX: 5000, px: 1,
        desc: "열대 심해 낚싯배 갑판의 원형 소나 화면 — 레이더가 빙글 돌며 3개의 링 × 8개 섹터, 24칸에 물고기 떼를 비춘다. 같은 물고기 4마리 이상이 한 섹터 안 또는 링을 따라 이어지면 당첨 (링은 한 바퀴 이어져 있다!) · 🗡️ 황새치/청새치 = TENSION-METER TUG-OF-WAR (당기고 풀며 바늘을 스위트 스팟에 — 줄이 끊기면 작은 상금) · 🪣 밑밥 3개 = CHUM BUCKET FEEDING FRENZY (6 무료 스윕 · 송사리는 사라지고 포식자가 안쪽으로 몰려든다, 겹치면 x2) · 🛟 부표 3개 = CRAB TRAP DEPTH DROP (통발 3개 — 문어 습격이 반을 훔쳐간다!) · 🐋 LEVIATHAN = 모든 잭팟 합계",
        theme: { bg: "radial-gradient(circle at 50% 50%,#0e7490 0%,#155e75 30%,#082f49 70%,#020617 100%)", accent: "#22d3ee", glow: "#a5f3fc", font: "'Lilita One', sans-serif" },
        skin: "r10sonar",
        syms: tsyms([["H1", "🦈", "Shark", [1, 2.5, 6, 15]], ["H2", "🐙", "Octopus", [0.8, 2, 5, 12]], ["H3", "🐢", "Sea Turtle", [0.6, 1.6, 4, 9]], ["H4", "🐡", "Pufferfish", [0.5, 1.2, 3, 7]], ["L1", "🐠", "Tropical Fish", [0.25, 0.6, 1.5, 4]], ["L2", "🐟", "Mackerel", [0.2, 0.5, 1.2, 3]], ["L3", "🦐", "Shrimp", [0.15, 0.4, 1, 2.5]]]),
        look: { W: { e: "🪝", name: "HOOK WILD" }, W2: { e: "🦈", name: "PREDATOR x2", cls: "sym-wild r10-mult" }, W4: { e: "🦈", name: "FRENZY x4", cls: "sym-wild r10-mult" }, ZF: sp("🗡️", "Swordfish"), ZC: sp("🪣", "Chum Bucket"), ZB: sp("🛟", "Buoy") },
        w: { H1: 2, H2: 2.4, H3: 2.8, H4: 3.2, L1: 5, L2: 5.4, L3: 5.8, W: 0.45 },
        features: { tug: { p: 0.008 }, chum: { p: 0.004, spins: 6 }, crab: { p: 0.006, tw: TW } },
        bgm: "tropical_steel",
        omens: [{ fx: "shake", text: "🎣 Nice one!!!!!!!!!!!!" }, { fx: "big", cls: "jump", icon: "🐟" }, { fx: "flood" }],
        tests: [["tug", "🗡️ TENSION-METER TUG-OF-WAR"], ["chum", "🪣 CHUM BUCKET FEEDING FRENZY"], ["crab", "🛟 CRAB TRAP DEPTH DROP"], ["crab:MEGA", "🛟 CRAB TRAP → 🐋 LEVIATHAN"]]
    },
    // ------------------------------------------------ 7. Magma Core: Dwarven Detonation (3 trigger pots)
    {
        id: "magma_core", name: "Magma Core: Dwarven Detonation", brand: "Scrooge-Slots", engine: "sp_magma", progressive: true, cover: "drift", spinLabel: "⛏️ DETONATE",
        coverIcons: ["🪨", "⛏️", "💎", "🪨", "🔥"], coverText: "DEEP MINE",
        jp: PROG(40000, 400000, 1500000), jpLabel: { MAXI: "MEGA", GRAND: "MOTHERLODE" }, bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "용암이 끓는 드워프 광산 — 릴 위에 노랑 · 파랑 · 빨강 세 개의 트리거 단지가 걸려 있다 (243 WAYS). 🧨 노란 TNT 통 3개 = MAGMA BLAST HOLD & SPIN (5스핀 · 바위벽 · 다이너마이트가 십자로 폭파 · 🧪 니트로가 폭발 반경을 넓히고 🪢 2x 도화선이 값을 두 배로 · MINI/MINOR/MEGA/MAJOR 보석) · 🔵 파란 크리스털 드릴 3개 = GEODE PICK-ME (정동석 18개 — 3개를 맞추면 잭팟 등급, 홀드앤스핀 입장권, 또는 CORE MOTHERLODE 그랜드!) · 🔴 빨간 가마솥 3개 = SMELTING FORGE 5 무료게임 (트럼프 9~A 심볼이 용광로에 녹아 고배당 심볼로!)",
        theme: { bg: "linear-gradient(180deg,#1c1917 0%,#7c2d12 55%,#f97316 100%)", accent: "#f97316", glow: "#fde047", font: "'Lilita One', sans-serif" },
        skin: "r10magma",
        syms: tsyms([["H1", "🧔", "Dwarf King", [0.6, 2, 6]], ["H2", "⛏️", "Golden Pick", [0.5, 1.5, 4]], ["H3", "🪓", "Battle Axe", [0.4, 1.2, 3]], ["H4", "🍺", "Ale Mug", [0.3, 1, 2.5]], ["L1", "A", "Ace", [0.12, 0.3, 0.7]], ["L2", "K", "King", [0.1, 0.25, 0.6]], ["L3", "Q", "Queen", [0.09, 0.22, 0.55]], ["L4", "J", "Jack", [0.08, 0.2, 0.5]], ["L5", "10", "Ten", [0.07, 0.18, 0.45]], ["L6", "9", "Nine", [0.06, 0.16, 0.4]]]),
        look: { W: { e: "🌋", name: "MAGMA WILD" }, ZY: sp("🧨", "Yellow TNT Keg", "sym-special r10-pot-y"), ZD: sp("🔵", "Blue Crystal Drill", "sym-special r10-pot-b"), ZR: sp("🔴", "Red Cauldron", "sym-special r10-pot-r"), ZX: sp("🪨", "Rock Wall", "sym-special r10-rock") },
        w: { H1: 2.2, H2: 2.6, H3: 3, H4: 3.4, L1: 4, L2: 4.2, L3: 4.4, L4: 4.6, L5: 4.8, L6: 5, W: [0, 1, 1, 1, 0] },
        features: { blast: { p: 0.005, tw: { MINI: 60, MINOR: 30, MAXI: 8, MAJOR: 2 } }, geode: { p: 0.004 }, forge: { p: 0.005, spins: 5 } },
        bgm: "monkey_funk",
        omens: [{ fx: "shake", text: "💥 Gonna Explode!!!!!!!!!!!" }, { fx: "big", cls: "inferno", icon: "🔥", shake: true }, { fx: "burst", icon: "💣", chars: ["💥", "🔥", "💥", "🪨"], shake: true }],
        tests: [["blast", "🧨 MAGMA BLAST HOLD & SPIN"], ["geode", "🔵 GEODE PICK-ME"], ["geode:GRAND", "🔵 GEODE → MOTHERLODE"], ["forge", "🔴 SMELTING FORGE 5 FS"]]
    },
    // ------------------------------------------------ 8. Astral Ascension (warp core ladder)
    {
        id: "astral_ascension", name: "Astral Ascension", brand: "CLOUD GAMING", engine: "sp_ascend", progressive: true, cover: "drift", spinLabel: "🚀 ASCEND",
        coverIcons: ["✨", "🌠", "⭐", "🌠", "✨"], coverText: "WARP ▸▸▸",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "은하 너머 성운으로 승천하는 우주 엘리베이터 (243 WAYS). 🔮 별 구슬 6개 이상 (또는 1~5개에서 무작위 발동) = WARP CORE LADDER HOLD & SPIN — 3 리스핀(구슬이 뜨면 리셋), 모은 구슬 수만큼 15칸 사다리를 올라 무료스핀 8 → 50+회! · 🌌 NEBULA REVEAL FREE SPINS = 얻은 무료스핀 동안 잠긴 구슬이 하나씩 깨지며 크레딧 · 잭팟 코인 · 추가 스핀 · 판 확장(줄 추가)! · 🧭 CELESTIAL NAVIGATOR = 겹쳐 쌓인 WILD가 넛지되어 릴 전체를 채운다 (일반 & 무료스핀)",
        theme: { bg: "radial-gradient(ellipse at 50% 120%,#7c3aed 0%,#312e81 35%,#020617 75%)", accent: "#c084fc", glow: "#f0abfc", font: "'Lilita One', sans-serif" },
        skin: "r10astral",
        syms: syms([["🪐", "Ringed Planet"], ["🌌", "Galaxy"], ["🛸", "Starship"], ["🌙", "Moon"]], [["⭐", "Star"], ["☄️", "Comet"], ["🌑", "Asteroid"]]),
        look: { W: { e: "🧭", name: "NAVIGATOR WILD" }, ZO: sp("🔮", "Star Orb", "sym-special r10-orb") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        features: { warp: { p: 0.0045, tw: TW }, nav: { p: 0.014 } },
        ladder: [8, 8, 8, 8, 8, 8, 9, 10, 12, 14, 17, 20, 25, 35, 50],
        bgm: "pizzicato_march",
        omens: [{ fx: "pop", chars: ["🔮", "🟡", "✨", "🔵", "🟣"], text: LUCKY }, { fx: "big", cls: "spin", icon: "🌌", shake: true }, { fx: "rain", chars: ["☄️", "☄️", "🌠"], shake: true }],
        tests: [["warp", "🔮 WARP CORE LADDER → NEBULA FS"], ["warp:GRAND", "🔮 WARP CORE → GRAND"], ["nav", "🧭 CELESTIAL NAVIGATOR"]]
    },
    // ------------------------------------------------ 9. The Doll Factory (frames persist)
    {
        id: "doll_factory", name: "The Doll Factory", brand: "IPEX", engine: "sp_doll", progressive: true, cover: "drift", spinLabel: "🔑 WIND UP",
        coverIcons: ["🪆", "🧸", "🎎", "🪆", "🔘"], coverText: "CONVEYOR ▸▸▸",
        jp: PROG(60000, 600000, 2500000), bets: [300, 500, 800, 1000, 1500, 2000], reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "자정이 지나면 움직이기 시작하는 낡은 인형 공장 — 태엽 감는 소리, 삐걱이는 컨베이어 (243 WAYS). 🔘 WIND-UP FRAME CAPTURE = 황금 단추 코인은 다음 스핀을 위해 그 자리에 황금 액자를 남긴다 → 액자 안에 코인이 떨어지면 코인 합계 × 액자 수! · 🧵 PATCHWORK QUILT = 무작위로 퀼트 조각(테트리스 모양 4~7칸)이 덮이며 도자기 인형 WILD로 · 🎩 장난감 장인 3개 = MUSIC BOX WHEEL — MINI/MINOR/MAJOR/GRAND 또는 8~15 무료스핀 (무료스핀 동안 액자는 사라지지 않는다!)",
        theme: { bg: "linear-gradient(180deg,#3f1d38 0%,#7f1d1d 50%,#1c1917 100%)", accent: "#f9a8d4", glow: "#fde68a", font: "'Creepster', 'Lilita One', cursive" },
        skin: "r10doll",
        syms: syms([["🪆", "Nesting Doll"], ["🎎", "Porcelain Pair"], ["🧸", "Teddy"], ["🎠", "Toy Horse"]], [["🧵", "Thread"], ["🪡", "Needle"], ["🔘", "Button"]]),
        look: { W: { e: "👧", name: "PORCELAIN DOLL WILD" }, ZB: sp("🟡", "Golden Button Coin", "sym-special r10-coin"), ZT: sp("🎩", "Toymaker") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        frames: { coin: 0.05, catch: 0.3, max: 6 },
        features: { quilt: { p: 0.012 }, capture: { p: 0.01 }, musicbox: { p: 0.004, tw: TW } },
        bgm: "pizzicato_march",
        omens: [{ fx: "pop", chars: ["🎎", "🪆", "🧸", "👁️", "🪆"], shake: true }, { fx: "rise", chars: ["💃", "🪆", "🕺", "🪆"], text: "🪆 인형들이 사람처럼 춤을 춘다…" }, { fx: "shake", text: "🪆 Did you miss me????", scream: true }],
        tests: [["capture", "🔘 WIND-UP FRAME CAPTURE"], ["quilt", "🧵 PATCHWORK QUILT WILDS"], ["musicbox", "🎩 MUSIC BOX WHEEL"], ["musicbox:GRAND", "🎩 MUSIC BOX → GRAND"]]
    },
    // ------------------------------------------------ 10. Eucalyptus Rush: Koala Gold
    {
        id: "eucalyptus_rush", name: "Eucalyptus Rush: Koala Gold", brand: "BLK", engine: "sp_koala", progressive: true, cover: "drift", spinLabel: "🍃 CLIMB",
        coverIcons: ["🍃", "🐨", "🍃", "🌿", "🍃"], coverText: "OUTBACK",
        jp: PROG(40000, 400000, 1500000), jpLabel: { GRAND: "OUTBACK GRAND" }, bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "호주 아웃백의 거대한 유칼립투스 나무 — 졸린 코알라 가족이 황금 메달을 지키고 있다 (243 WAYS). 🐨 코알라 메달 6개 이상 = KOALA BLITZ STAY & SPIN (5x3 · 3 리스핀, 메달이 뜨면 리셋 · 15칸 전부 채우면 OUTBACK GRAND!) · 🪃 DOUBLE-CHOMP XTRA HIT = 부메랑이 날아들면 판 위 모든 코인을 한 번 더 지급 — 발동 스핀의 남는 메달은 부메랑으로 변신! · 🌳 황금 나무 3개 = TREETOP CANOPY 5~8 무료게임 (쌓인 WILD · 가운데 릴 2개 이상에 코알라가 앉으면 그 릴 전체 WILD!)",
        theme: { bg: "linear-gradient(180deg,#fdba74 0%,#a3e635 45%,#3f6212 100%)", accent: "#84cc16", glow: "#fef08a", font: "'Lilita One', sans-serif" },
        skin: "r10koala",
        syms: syms([["🦘", "Kangaroo"], ["🦜", "Cockatoo"], ["🐊", "Crocodile"], ["🦎", "Frilled Lizard"]], [["🍃", "Gum Leaf"], ["🪨", "Uluru Stone"], ["🌼", "Wattle"]]),
        look: { W: { e: "🐨", name: "KOALA WILD" }, ZK: sp("🏅", "Koala Medallion", "sym-special r10-coin"), ZR: sp("🪃", "Boomerang"), ZT: sp("🌳", "Golden Tree") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        features: { blitz: { p: 0.005, tw: TW }, chomp: { p: 0.35 }, canopy: { p: 0.004 } },
        bgm: "shanty_accordion",
        omens: [{ fx: "rain", chars: ["🐨", "🐨", "🍃"], shake: true, text: "🐨 코알라와 아기 코알라가 나무에서 떨어졌다!" }, { fx: "big", cls: "fall", icon: "🐨🍃" }, { fx: "big", cls: "grow", icon: "🐨", text: LUCKY }],
        tests: [["blitz", "🐨 KOALA BLITZ STAY & SPIN"], ["blitz:chomp", "🪃 DOUBLE-CHOMP XTRA HIT"], ["blitz:GRAND", "🐨 BLITZ → OUTBACK GRAND"], ["canopy", "🌳 TREETOP CANOPY FS"]]
    },
    // ------------------------------------------------ 11. Grimoire of Fortune (magical book, 5x5)
    {
        id: "grimoire_fortune", name: "Grimoire of Fortune", brand: "YG GAMING", engine: "sp_grimoire", progressive: true, cover: "drift", spinLabel: "📖 TURN PAGE",
        coverIcons: ["📄", "✨", "📃", "✨", "📜"], coverText: "✦ ABRACADABRA ✦",
        jp: { ...PROG(40000, 400000, 1500000), MEGA: { sum: true } }, jpLabel: { MEGA: "📖 GRIMOIRE" },
        bets: BETS_A, reels: 5, rows: 5, maxX: 5000, px: 1,
        desc: "마법사의 서재 한가운데 떠 있는 거대한 마법서 — 책장이 넘어갈 때마다 5x5 릴이 마법 오라에 휩싸인다 (3125 WAYS). 📚 책 아이콘이 날아들면 마법서가 커지며 보너스 페이지가 펄럭인다! · ✨ MAGIC PAGE = 마법 휠이 WILD 5~25개를 한 번 흩뿌린다 · 💋 KISS PAGE = 릴 위 WILD에 x2~x5 배수 키스 · 🃏 JACKPOT PAGE = 조커가 나타나 잭팟 맞추기 · 🧙 WIZARD PAGE = 마법사 휠로 WILD 5~25개, 이어서 x2~x5 배수 · 📕 FREE SPIN PAGE = 8 무료스핀 · 📖 GRIMOIRE = 모든 잭팟 합계",
        theme: { bg: "radial-gradient(circle at 50% 45%,#a855f7 0%,#4c1d95 30%,#1e1b4b 65%,#0b0613 100%)", accent: "#e879f9", glow: "#fde68a", font: "'Lilita One', sans-serif" },
        skin: "r10book",
        syms: syms([["🔮", "Crystal Orb"], ["🦉", "Owl Familiar"], ["🧪", "Potion"], ["🗝️", "Arcane Key"]], [["♠️", "Spade Rune"], ["♥️", "Heart Rune"], ["♦️", "Diamond Rune"]], 0.08),
        look: { W: { e: "🪄", name: "WAND WILD" }, W2: { e: "💋", name: "KISS x2", cls: "sym-wild r10-mult" }, W3: { e: "💋", name: "KISS x3", cls: "sym-wild r10-mult" }, W4: { e: "💋", name: "KISS x4", cls: "sym-wild r10-mult" }, W5: { e: "💋", name: "KISS x5", cls: "sym-wild r10-mult" }, ZP: sp("📚", "Book Icon") },
        w: { ...W_STD, W: [0, 0.6, 0.6, 0.6, 0] },
        features: { magic: { p: 0.008 }, kiss: { p: 0.01 }, jackpot: { p: 0.002 }, wizard: { p: 0.003 }, free: { p: 0.004, spins: 8 } },
        bgm: "lounge_jazz",
        omens: [{ fx: "pop", chars: ["🍀", "✨", "🍀"], text: LUCKY }, { fx: "shake" }, { fx: "rain", chars: ["✨", "🌟", "💫", "✨"] }, { fx: "wind", chars: ["📄", "📃", "📜", "📄"] }, { fx: "big", cls: "grow", icon: "📖" }],
        tests: [["magic", "✨ MAGIC PAGE"], ["kiss", "💋 KISS PAGE"], ["jackpot", "🃏 JACKPOT PAGE"], ["jackpot:MEGA", "🃏 JACKPOT → 📖 GRIMOIRE"], ["wizard", "🧙 WIZARD PAGE"], ["free", "📕 FREE SPIN PAGE"]]
    }
];

// casino placement (LOCATIONS[].slots in js/data/catalog.js) — one casino each, never shared
export const MYTH_HOME = {
    spooky_mansion: "cursed_casino", midnight_bigtop: "magic", clockwork_fate: "possibility", harvest_hex: "winners", vault_breaker: "goldbar", deepwater_fishing: "penguin_casino",
    magma_core: "bunker", astral_ascension: "celebrity", doll_factory: "downtown", eucalyptus_rush: "balloon", grimoire_fortune: "fantasy"
};

// pay scale (px) per machine, solved with a 150k-spin browser simulation (filled in after tuning)
const PX = {
    spooky_mansion: 1.1, midnight_bigtop: 0.42, clockwork_fate: 0.454, harvest_hex: 0.976, vault_breaker: 4.12, deepwater_fishing: 0.98,
    magma_core: 1.96, astral_ascension: 0.85, doll_factory: 0.832, eucalyptus_rush: 1.03, grimoire_fortune: 1.29
};
for (const s of MYTH_SLOTS) s.px = PX[s.id] ?? s.px;
