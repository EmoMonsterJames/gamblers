// =====================================================================
// The 10 round-8 machines (death / karma / tavern / office / retro city /
// polarity / yacht / VIP strip / foundry / prism). Engine: js/slots/realmEngine.js
// (engine: "sp_*", dispatched from specialEngine.specialSpin), renderer:
// js/screens/slotSpecial.js (cfg.cover = the spin mechanic animation).
// Same contract as skyConfigs.js: feature-first bonuses (features.*.p × pet
// luck), teasing + near-miss, P icons, progressive pools, 3 omens each.
// px scales every cash prize except jackpots — solved by a 150k+ spin
// browser simulation (PX at the bottom). Bonus icons are Z* keys.
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
const W_STD = { H1: 2.5, H2: 3, H3: 3.5, H4: 4, L1: 6, L2: 6.5, L3: 7 };

export const REALM_SLOTS = [
    // ------------------------------------------------ 1. The Rule of Death (non-progressive)
    {
        id: "rule_of_death", name: "The Rule of Death", brand: "CLOUD GAMING", engine: "sp_death", progressive: false, jp: null, cover: "scythe", spinLabel: "🪦 REAP",
        bets: BETS_A, reels: 4, rows: 4, maxX: 3000, px: 1,
        jpText: "🏮 SOUL HARVEST · ⏳ CHEATING DEATH · 🗝️ AFTERLIFE VAULT",
        desc: "블랙 유머 가득한 고딕 저승 — 빛나는 해골, 모래시계, 유령 랜턴, 그리고 멋쟁이 사신 딜러. 사신의 낫이 4x4 묘비를 베어 가르면 빛나는 영혼 심볼이 드러난다 (256 WAYS). 🏮 SOUL HARVEST = 당첨 심볼의 영혼이 랜턴으로 날아간다 — 영혼 10개가 모이면 유령의 파도가 무작위 한 줄을 전부 WILD로! · ⏳ CHEATING DEATH = 꽝 스핀에 모래시계가 뒤집히면 시간이 되감기고 두 심볼이 자리를 바꿔 확정 당첨 · 🗝️ 해골 열쇠 3개 = AFTERLIFE VAULT — 유령 불꽃을 탭해 즉시 상금, 🦴 COLLECT 뼈가 나오면 끝",
        theme: { bg: "radial-gradient(circle at 50% 20%,#4c1d95 0%,#1e1b4b 40%,#020617 100%)", accent: "#a3e635", glow: "#c4b5fd", font: "'Creepster', 'Lilita One', cursive" },
        skin: "r8tomb",
        syms: syms([["💀", "Glowing Skull"], ["⌛", "Hourglass"], ["🏮", "Spectral Lantern"], ["🕸️", "Cobweb"]], [["🕯️", "Candle"], ["🦇", "Bat"], ["🥀", "Wilted Rose"]]),
        look: { W: { e: "👻", name: "SPECTRAL WILD" }, ZK: sp("🗝️", "Skull Key") },
        w: { ...W_STD, W: [0, 0.7, 0.7, 0] },
        features: { cheat: { p: 0.014 }, vault: { p: 0.0045 } },
        souls: 10,
        bgm: "organ_waltz",
        omens: [{ fx: "big", cls: "flash", icon: "💀", shake: true }, { fx: "blood" }, { fx: "shake", text: "😱 AAAAAAHHHHH!!!", scream: true }],
        tests: [["soul", "🏮 SOUL HARVEST (영혼 10개)"], ["cheat", "⏳ CHEATING DEATH"], ["vault", "🗝️ AFTERLIFE VAULT"]]
    },
    // ------------------------------------------------ 2. Karma Fountain
    {
        id: "karma_fountain", name: "Karma Fountain", brand: "CLOVER-TECH", engine: "sp_karma", progressive: true, cover: "coin", spinLabel: "🪙 FLICK",
        jp: PROG(40000, 400000, 1500000), bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "황금 소원의 우물과 자선 광장 — 분수 · 비둘기 · 축복. 금화를 연못에 튕기면 물보라가 15개의 연잎 위에 연꽃 그릇을 정렬한다 (243 WAYS). 🌊 RIPPLE OF GENEROSITY = 당첨 시 황금 물결이 퍼져 옆 심볼을 더 높은 배당으로 업그레이드 · 🔔 소원의 종 2개 = GOLDEN DOVE RELEASE — 비둘기가 WILD 깃털 2~4개를 떨어뜨린다 · 🎁 자선 상자 3개 = TRIPLE KARMA BONUS — 황금 석상을 탭해 즉시 잭팟 · 배수 부스트!",
        theme: { bg: "linear-gradient(180deg,#fef9c3 0%,#fcd34d 30%,#34d399 70%,#065f46 100%)", accent: "#facc15", glow: "#fef3c7", font: "'Lilita One', sans-serif" },
        skin: "r8lily",
        syms: syms([["🪷", "Golden Lotus"], ["🕊️", "Dove"], ["⛲", "Fountain"], ["🍀", "Clover"]], [["🪙", "Wish Coin"], ["🌸", "Petal"], ["💧", "Droplet"]]),
        look: { W: { e: "🪶", name: "FEATHER WILD" }, ZB: sp("🔔", "Wishing Bell"), ZC: sp("🎁", "Charity Chest") },
        w: { ...W_STD, W: [0, 1.2, 1.2, 1.2, 0] },
        features: { ripple: { p: 0.014 }, dove: { p: 0.012 }, karma: { p: 0.0045, tw: TW } },
        bgm: "shanty_accordion",
        omens: [{ fx: "big", cls: "rise", icon: "⛲💥", text: LUCKY, shake: true }, { fx: "shake", text: "🙏 What a karma!!!!!!!!" }, { fx: "wind", chars: ["🍀", "🍀", "🍃"], text: "🍀 네잎클로버가 바람에 날아간다…" }],
        tests: [["ripple", "🌊 RIPPLE OF GENEROSITY"], ["dove", "🕊️ GOLDEN DOVE RELEASE"], ["karma", "🎁 TRIPLE KARMA BONUS"], ["karma:GRAND", "🎁 TRIPLE KARMA → GRAND"]]
    },
    // ------------------------------------------------ 3. Idle Tavern (non-progressive)
    {
        id: "idle_tavern", name: "Idle Tavern", brand: "Classic Gaming", engine: "sp_tavern", progressive: false, jp: null, cover: "mugs", spinLabel: "🛎️ RING",
        bets: BETS_A, reels: 4, rows: 4, maxX: 3000, px: 1,
        jpText: "🪕 BARD'S SONG · ⚔️ BAR BRAWL · 📜 BOUNTY BOARD",
        desc: "자동 사냥 RPG 영웅 · 음유시인 · 상인이 북적이는 판타지 여관. 서비스 벨을 울리면 16명의 손님이 맥주잔을 쾅! 내려놓고 카드를 뒤집는다 (4x4 · 256 WAYS). 🪕 BARD'S SONG = 류트 심볼 → 무작위 두 테이블이 같은 고배당 카드로 동기화 · ⚔️ 교차한 칼 2개 = BAR BRAWL — 난투! 꽝 카드를 섞어 확정 당첨 · 📜 퀘스트 포스터 3개 = BOUNTY BOARD — 현상수배 전단을 탭해 즉시 코인 보상",
        theme: { bg: "linear-gradient(180deg,#78350f 0%,#92400e 40%,#451a03 100%)", accent: "#fbbf24", glow: "#fde68a", font: "'Rye', serif" },
        skin: "r8tavern",
        syms: syms([["🂡", "Ace of Spades"], ["🧙", "Wizard Patron"], ["🛡️", "Knight Patron"], ["🧝", "Elf Patron"]], [["🍺", "Mug"], ["🍗", "Drumstick"], ["🧀", "Cheese"]], 1.0),
        look: { W: { e: "🃏", name: "JOKER WILD" }, ZL: sp("🪕", "Lute"), ZS: sp("⚔️", "Crossed Swords"), ZQ: sp("📜", "Quest Poster") },
        w: { ...W_STD, W: [0, 0.8, 0.8, 0] },
        features: { bard: { p: 0.012 }, brawl: { p: 0.012 }, bounty: { p: 0.0045 } },
        bgm: "tropical_steel",
        omens: [{ fx: "text", text: LUCKY }, { fx: "shake", text: "💰 One rich away!!!!" }, { fx: "big", cls: "light", icon: "🤑", text: "You are about to rich!!!" }],
        tests: [["bard", "🪕 BARD'S SONG"], ["brawl", "⚔️ BAR BRAWL"], ["bounty", "📜 BOUNTY BOARD"]]
    },
    // ------------------------------------------------ 4. Totally Normal Office
    {
        id: "normal_office", name: "Totally Normal Office", brand: "DAEBAK", engine: "sp_office", progressive: true, cover: "email", spinLabel: "📧 SEND",
        jp: PROG(40000, 400000, 1500000), jpLabel: { MINI: "BONUS", MINOR: "RAISE", MAXI: "PROMOTION", MAJOR: "CORNER OFFICE", GRAND: "CEO" },
        bets: BETS_A, reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "카지노가 아닌 척하는 풍자 회사 — 스테이플러 · 커피잔 · 스프레드시트 · \"세무 조사\" 폴더. 모니터의 \"메일 보내기\"를 누르면 포스트잇과 엑셀 시트가 뒤섞인다 (25 LINES). ☕ COFFEE BREAK = 에스프레소 잔 → 당첨 2배 무료스핀 3회 · 🗂️ PAPER SHREDDER = 파쇄기가 저배당 메모 심볼을 전부 갈아버리고 고배당 \"보너스 수표\"가 떨어진다 · 📅 회의 초대장 3개 = PERFORMANCE REVIEW — 서류가방을 골라 연봉 인상 · 스톡옵션 · 배수! 잭팟은 BONUS → RAISE → PROMOTION → CORNER OFFICE → CEO",
        theme: { bg: "linear-gradient(180deg,#e2e8f0 0%,#94a3b8 45%,#334155 100%)", accent: "#2563eb", glow: "#dbeafe", font: "'Lilita One', sans-serif" },
        skin: "r8office",
        syms: lsyms([["H1", "💵", "Bonus Check"], ["H2", "💼", "Briefcase"], ["H3", "☕", "Coffee Mug"], ["H4", "📊", "Spreadsheet"], ["L1", "📎", "Paperclip"], ["L2", "🗒️", "Memo"], ["L3", "📌", "Push Pin"]]),
        look: { W: { e: "🖨️", name: "PRINTER WILD" }, ZE: sp("☕", "Espresso Cup"), ZM: sp("📅", "Meeting Invite") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        features: { coffee: { p: 0.012, spins: 3 }, shred: { p: 0.012 }, review: { p: 0.0045, tw: TW } },
        bgm: "pizzicato_march",
        omens: [{ fx: "shake", text: "🕘 Office Time!!!!!!!!!" }, { fx: "wind", chars: ["📄", "📃", "🗒️", "📄"] }, { fx: "big", cls: "fall", icon: "✏️", shake: true }],
        tests: [["coffee", "☕ COFFEE BREAK"], ["shred", "🗂️ PAPER SHREDDER"], ["review", "📅 PERFORMANCE REVIEW"], ["review:GRAND", "📅 REVIEW → CEO 잭팟"]]
    },
    // ------------------------------------------------ 5. Retro Reel City
    {
        id: "retro_reel_city", name: "Retro Reel City", brand: "Classic Gaming", engine: "sp_retro", progressive: true, cover: "lever", spinLabel: "🕹️ PULL",
        jp: PROG(80000, 800000, 3000000), bets: [300, 500, 800, 1000, 1500, 2000], reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "슬롯머신 모양 빌딩이 늘어선 네온 아케이드 메트로폴리스. 거대한 크롬 레버를 당기면 5개의 빌보드 실린더가 돌아간다 (25 LINES). ⬆️⬇️ NUDGE = 멈춘 뒤 빛나는 화살표가 뜨면 탭! 빌보드를 한 칸 밀어 당첨 완성 · ⚡ 번개 3개 = NEON OVERDRIVE — 밤 모드 6 무료스핀, 모든 과일 심볼 3배 지급 · 7️⃣ \"777\" 간판 3개 = SUPER JACKPOT WHEEL — 거대 대관람차를 탭해 멈춰라 (MINI~GRAND)",
        theme: { bg: "linear-gradient(180deg,#0f0a1e 0%,#581c87 45%,#db2777 100%)", accent: "#f472b6", glow: "#22d3ee", font: "'Lilita One', sans-serif" },
        skin: "r8billboard",
        syms: lsyms([["H1", "7️⃣", "Lucky Seven"], ["H2", "🔔", "Neon Bell"], ["H3", "🍉", "Watermelon", "fruit"], ["H4", "🍇", "Grapes", "fruit"], ["L1", "🍊", "Orange", "fruit"], ["L2", "🍋", "Lemon", "fruit"], ["L3", "🍒", "Cherry", "fruit"]]),
        look: { W: { e: "🎰", name: "SLOT WILD" }, ZL: sp("⚡", "Lightning Bolt"), Z7: sp("🎡", "777 Sign") },
        w: { ...W_STD, W: [0, 1, 1, 1, 0] },
        features: { nudge: { p: 0.02 }, neon: { p: 0.0035, spins: 6 }, wheel: { p: 0.003 } },
        bgm: "synthwave",
        omens: [{ fx: "shake" }, { fx: "big", cls: "light", icon: "7️⃣7️⃣7️⃣", text: LUCKY }, { fx: "rain", chars: ["7️⃣", "7️⃣", "✨"] }],
        tests: [["nudge", "⬆️⬇️ NUDGE"], ["neon", "⚡ NEON OVERDRIVE"], ["wheel", "🎡 SUPER JACKPOT WHEEL"], ["wheel:GRAND", "🎡 WHEEL → GRAND"]]
    },
    // ------------------------------------------------ 6. Polarity Clash (non-progressive)
    {
        id: "polarity_clash", name: "Polarity Clash", brand: "HYHG GAMING", engine: "sp_polarity", progressive: false, jp: null, cover: "pulse", spinLabel: "⚡ PULSE",
        bets: BETS_A, reels: 5, rows: 4, maxX: 3000, px: 1,
        jpText: "🟣 MAGNETIC FUSION x5 · 🔴🔵 COLOR SURGE x2 · ☢️ REACTOR OVERLOAD",
        desc: "진홍 플라즈마 vs 코발트 에너지의 줄다리기가 벌어지는 하이테크 SF 아레나. 중앙 분할선에서 펄스가 터지면 빨강·파랑 타일 20개가 미끄러져 5x4에 고정된다 (1024 WAYS). 🟣 MAGNETIC FUSION = 가운데 열에 RED WILD + BLUE WILD가 함께 뜨면 융합! 열 전체가 x5 PURPLE MEGA-WILD · 🔴🔵 COLOR SURGE = 같은 색 타일이 12개를 넘으면 그 색이 승리 — 모든 당첨 2배 · ☢️ 에너지 코어 3개 = REACTOR OVERLOAD 무료스핀 — 🔴 RED (고변동 · 큰 배수) 또는 🔵 BLUE (잦은 당첨 · 스티키 WILD) 선택!",
        theme: { bg: "linear-gradient(90deg,#7f1d1d 0%,#1e1b4b 50%,#1e3a8a 100%)", accent: "#c084fc", glow: "#f0abfc", font: "'Lilita One', sans-serif" },
        skin: "r8arena",
        syms: {
            H1: { e: "🐉", name: "Crimson Dragon", cls: "pol-red", pay: [0.15, 0.5, 1.5] }, H2: { e: "🦅", name: "Cobalt Phoenix", cls: "pol-blue", pay: [0.15, 0.5, 1.5] },
            H3: { e: "🔥", name: "Plasma Flame", cls: "pol-red", pay: [0.1, 0.3, 0.9] }, H4: { e: "❄️", name: "Cryo Shard", cls: "pol-blue", pay: [0.1, 0.3, 0.9] },
            L1: { e: "🔺", name: "Red Prism", cls: "pol-red", pay: [0.03, 0.08, 0.2] }, L2: { e: "🔷", name: "Blue Prism", cls: "pol-blue", pay: [0.03, 0.08, 0.2] }
        },
        red: ["H1", "H3", "L1"], blue: ["H2", "H4", "L2"],
        look: { W: { e: "⚡", name: "ARC WILD" }, W5: { e: "🟣", name: "PURPLE MEGA-WILD x5", cls: "sym-wild pol-purple" }, ZR: sp("🔴", "RED WILD", "sym-special pol-red"), ZB: sp("🔵", "BLUE WILD", "sym-special pol-blue"), ZE: sp("☢️", "Energy Core") },
        w: { H1: 3, H2: 3, H3: 4, H4: 4, L1: 6, L2: 6, W: [0, 0.45, 0.45, 0.45, 0] },
        features: { fusion: { p: 0.007 }, surge: { p: 0.012 }, reactor: { p: 0.0045 } },
        bgm: "pizzicato_march",
        omens: [{ fx: "shake" }, { fx: "pop", chars: ["🔴", "🔵", "🔴", "🔵"] }, { fx: "big", cls: "fall", icon: "🔴🔵", shake: true }],
        tests: [["fusion", "🟣 MAGNETIC FUSION"], ["surge", "🔴🔵 COLOR SURGE"], ["reactor", "☢️ REACTOR OVERLOAD"]]
    },
    // ------------------------------------------------ 7. Yacht Club Royale (non-progressive)
    {
        id: "yacht_royale", name: "Yacht Club Royale", brand: "IPEX", engine: "sp_yacht", progressive: false, jp: null, cover: "deal", spinLabel: "💳 DEAL",
        bets: [1000, 2000, 3000, 5000, 10000], reels: 5, rows: 3, maxX: 3000, px: 1,
        jpText: "💳 UNLIMITED CREDIT · 🪙 DIVIDEND x3 · 🔨 AUCTION HOUSE",
        desc: "억만장자의 라이프스타일 — 슈퍼요트 · 명품 시계 · 캐비어 · 전용기 · 대저택. 벨벳 위에 금테 블랙 카드 15장이 뒷면으로 깔리고 물결처럼 뒤집힌다 (243 WAYS). 💳 UNLIMITED CREDIT = 블랙 카드 심볼 → 맨 위에 한 줄이 더 생겨 WAYS 증가 · 🪙 DIVIDEND PAYOUT = 당첨 심볼은 금 도장을 남긴다 — 도장 찍힌 칸이 다시 당첨되면 3배! · 🔨 경매봉 3개 = AUCTION HOUSE — 입찰 패들을 탭해 명품을 낙찰, 즉시 현금",
        theme: { bg: "linear-gradient(180deg,#0c0a09 0%,#1c1917 40%,#7f1d1d 100%)", accent: "#d4af37", glow: "#fde68a", font: "'Playfair Display', 'Rye', serif" },
        skin: "r8velvet",
        syms: syms([["🛥️", "Superyacht"], ["⌚", "Gold Watch"], ["🛩️", "Private Jet"], ["🏰", "Mansion"]], [["🦪", "Caviar"], ["🍾", "Champagne"], ["🎩", "Top Hat"]]),
        look: { W: { e: "👑", name: "CROWN WILD" }, ZC: sp("💳", "Black Card"), ZG: sp("🔨", "Gavel") },
        w: { ...W_STD, W: [0, 1.2, 1.2, 1.2, 0] },
        features: { credit: { p: 0.014 }, dividend: { p: 0.01 }, auction: { p: 0.0045 } },
        bgm: "pizzicato_march",
        omens: [{ fx: "rain", chars: ["💵", "🪙", "💰", "💵"], text: LUCKY }, { fx: "big", cls: "rise", icon: "🐷", shake: true }, { fx: "wind", chars: ["🛥️", "⛵", "🛳️"], text: "🛥️ 호화 요트가 지나간다…" }],
        tests: [["credit", "💳 UNLIMITED CREDIT"], ["dividend", "🪙 DIVIDEND PAYOUT x3"], ["auction", "🔨 AUCTION HOUSE"]]
    },
    // ------------------------------------------------ 8. VIP Penthouse Strip
    {
        id: "vip_penthouse", name: "VIP Penthouse Strip", brand: "Rabbit-Gaming", engine: "sp_vip", progressive: true, cover: "doors", spinLabel: "🎫 VIP",
        jp: PROG(1200000, 12000000, 45000000), bets: [3000, 5000, 8000, 10000, 30000], reels: 5, rows: 3, maxX: 5000, px: 1,
        desc: "벨벳 로프가 쳐진 한밤의 대로 — 리무진 · 네온 VIP 간판 · 보디가드 · 금고 문. 황금 로프 앞에서 VIP 패스를 보여주면 5개의 대리석 문이 스르륵 열린다 (243 WAYS). ✨ VIP UPGRADE = 가운데 \"VIP 스포트라이트\" 액자의 심볼이 판에서 가장 비싼 심볼로 변신 · 🕴️ BOUNCER'S BLOCK = 아깝게 놓쳤을 때 보디가드가 같은 문 2개를 붙잡고 나머지를 무료 리스핀 · 🥂 크리스탈 잔 3개 = CHAMPAGNE TOWER — 탭해서 샴페인을 따르면 잔 피라미드가 층마다 넘쳐 배수 수집, 꼭대기는 잭팟!",
        theme: { bg: "linear-gradient(180deg,#020617 0%,#3b0764 45%,#831843 100%)", accent: "#f9a8d4", glow: "#fde68a", font: "'Playfair Display', 'Lilita One', serif" },
        skin: "r8marble",
        syms: syms([["💎", "Vault Diamond"], ["🚘", "Limousine"], ["🕶️", "Bodyguard Shades"], ["🎤", "Neon Mic"]], [["🍸", "Martini"], ["🎲", "Dice"], ["🌹", "Rose"]]),
        look: { W: { e: "🌟", name: "VIP WILD" }, ZG: sp("🥂", "Crystal Glass") },
        w: { ...W_STD, W: [0, 1.2, 1.2, 1.2, 0] },
        features: { vip: { p: 0.014 }, bouncer: { p: 0.012 }, champagne: { p: 0.0045, tw: TW } },
        bgm: "synthwave",
        omens: [{ fx: "shake", text: "💸 Big bucks are coming!!!!!!!!!!!" }, { fx: "shake", text: "🔥 큰 거 온다!!!!!!!!!" }, { fx: "big", cls: "grow", icon: "🏙️", text: "PENTHOUSE" }],
        tests: [["vip", "✨ VIP UPGRADE"], ["bouncer", "🕴️ BOUNCER'S BLOCK"], ["champagne", "🥂 CHAMPAGNE TOWER"], ["champagne:GRAND", "🥂 TOWER → GRAND"]]
    },
    // ------------------------------------------------ 9. Bullion Foundry
    {
        id: "bullion_foundry", name: "Bullion Foundry", brand: "Scrooge-Slots", engine: "sp_foundry", progressive: true, cover: "pour", spinLabel: "⛓️ POUR",
        jp: PROG(150000, 1500000, 5000000), bets: [500, 1000, 1500, 2000, 2500, 3000], reels: 4, rows: 3, maxX: 5000, px: 1,
        desc: "산업용 금 제련소이자 서부 개척시대 조폐국 — 녹은 금이 각인된 주형에 부어진다. 주물 체인을 당기면 금물이 12개의 주형에 쏟아지고 틀이 탁! 열린다 (4x3 · 81 WAYS). 🔥 24-KARAT MELT = 용광로 심볼이 저급 동괴·은괴를 녹여 금괴로 · 🧱 HEAVY METAL DROP = 거대한 2x2 / 3x3 금 블록이 떨어져 큰 당첨 확정 · 🧨 다이너마이트 3개 = MINT VAULT HEIST — 경보가 울리기 전에 금괴 더미를 탭해 즉시 상금!",
        theme: { bg: "linear-gradient(180deg,#1c1917 0%,#78350f 45%,#f59e0b 100%)", accent: "#fbbf24", glow: "#fef3c7", font: "'Rye', serif" },
        skin: "r8mold",
        syms: syms([["💰", "Mint Sack"], ["🧈", "Gold Bar", "gold-bar"], ["🤠", "Prospector"], ["⚒️", "Smith Hammer"]], [["🥈", "Silver Bar"], ["🥉", "Bronze Bar"], ["🔩", "Rivet"]], 1.3),
        look: { W: { e: "🏆", name: "GOLD WILD" }, ZF: sp("🔥", "Furnace"), ZD: sp("🧨", "Dynamite") },
        w: { ...W_STD, W: [0, 1.2, 1.2, 0] },
        features: { melt: { p: 0.014 }, heavy: { p: 0.01 }, heist: { p: 0.0045, tw: TW } },
        bgm: "pizzicato_march",
        omens: [{ fx: "rain", chars: ["🧈", "🧈", "🪙"] }, { fx: "big", cls: "fall", icon: "🧈", shake: true }, { fx: "burst", icon: "🤵", chars: ["🧈", "🪙", "🧈"], shake: true, text: "💸 부자가 금괴를 마구 던진다!" }],
        tests: [["melt", "🔥 24-KARAT MELT"], ["heavy", "🧱 HEAVY METAL DROP"], ["heist", "🧨 MINT VAULT HEIST"], ["heist:GRAND", "🧨 HEIST → GRAND"]]
    },
    // ------------------------------------------------ 10. Prism Palace
    {
        id: "prism_palace", name: "Prism Palace", brand: "YG GAMING", engine: "sp_prism", progressive: true, cover: "prism", spinLabel: "💡 BEAM",
        jp: { ...PROG(80000, 800000, 3000000), MEGA: { sum: true } }, jpLabel: { MEGA: "DIAMOND" },
        bets: [300, 500, 800, 1200, 1500, 2000], reels: 5, rows: 4, maxX: 5000, px: 1,
        desc: "커팅된 보석으로 지은 크리스탈 궁전 — 레이저 빔과 떠다니는 왕관. 하얀 빔이 중앙 프리즘에 꽂히면 굴절된 보석이 벌집 격자에 쏟아진다 (HEX 20칸 · 같은 보석 4개 이상 이웃 = 당첨). 🔆 LASER REFRACTION = 빔이 DIAMOND WILD에 맞으면 레이저 두 줄로 갈라져 닿는 보석을 같은 심볼로 · 💎 FLAWLESS CUT = 당첨 클러스터가 산산조각 나고 새 보석이 굴러 떨어져 연쇄 당첨 · 👑 왕관 3개 = CROWN JEWEL VAULT — 보석함을 고르고 원석을 연마해 다이아몬드 배수! DIAMOND 잭팟 = 모든 잭팟 합산",
        theme: { bg: "radial-gradient(circle at 50% 40%,#f0f9ff 0%,#a5f3fc 20%,#6366f1 55%,#1e1b4b 100%)", accent: "#67e8f9", glow: "#f0abfc", font: "'Lilita One', sans-serif" },
        skin: "r8hex",
        syms: Object.fromEntries([["H1", "💎", "Diamond", [0.8, 2, 6]], ["H2", "❤️", "Ruby Heart", [0.6, 1.5, 4]], ["H3", "💚", "Emerald", [0.5, 1.2, 3]], ["H4", "💜", "Amethyst", [0.4, 1, 2.5]],
            ["L1", "🔷", "Sapphire Cut", [0.15, 0.4, 1]], ["L2", "🔶", "Topaz Cut", [0.12, 0.3, 0.8]], ["L3", "⚪", "Pearl", [0.1, 0.25, 0.6]]].map(([k, e, name, pay]) => [k, { e, name, pay }])),
        look: { W: { e: "💠", name: "DIAMOND WILD" }, ZC: sp("👑", "Floating Crown") },
        w: { H1: 3, H2: 3.5, H3: 4, H4: 4.5, L1: 5.5, L2: 6, L3: 6.5, W: 0.5 },
        features: { laser: { p: 0.012 }, cut: { p: 0.014 }, vault: { p: 0.0045, tw: { MINI: 55, MINOR: 28, MAXI: 12, MAJOR: 4, GRAND: 1, MEGA: 0.25 } } },
        bgm: "pizzicato_march",
        omens: [{ fx: "big", cls: "spin", icon: "💎", shake: true }, { fx: "rain", chars: ["💎", "🔷", "🔶", "💠", "❤️"] }, { fx: "big", cls: "clash", icon: "💎👊", shake: true, text: "DIAMOND PUNCH!" }],
        tests: [["laser", "🔆 LASER REFRACTION"], ["cut", "💎 FLAWLESS CUT"], ["vault", "👑 CROWN JEWEL VAULT"], ["vault:MEGA", "👑 VAULT → DIAMOND 잭팟"]]
    }
];

// casino placement (LOCATIONS[].slots in js/data/catalog.js) — one casino each, never shared
export const REALM_HOME = {
    rule_of_death: "death_casino", karma_fountain: "donation", idle_tavern: "npc_casino", normal_office: "noc_casino", retro_reel_city: "slots_only",
    polarity_clash: "redblue", yacht_royale: "wealthy", vip_penthouse: "highroller", bullion_foundry: "goldbar", prism_palace: "diamond_casino"
};

// pay scale (px) per machine, solved with a 150k-spin browser simulation (filled in after tuning)
const PX = {
    rule_of_death: 0.641, karma_fountain: 0.754, idle_tavern: 0.86, normal_office: 1.231, retro_reel_city: 1.693,
    polarity_clash: 0.922, yacht_royale: 0.609, vip_penthouse: 1.422, bullion_foundry: 1.131, prism_palace: 1.03
};
for (const s of REALM_SLOTS) s.px = PX[s.id] ?? s.px;
