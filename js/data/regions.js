// =====================================================================
// Regions (지역) and the maps (카지노) inside them. A turn first spins the
// REGION roulette, then the MAP roulette inside the chosen region.
//   need: item that must be in the bag before the region can be chosen
//         (used up on entry) — wings / space suit / oxygen tank
// The old world map is "Casino Land 1"; every new map below gets one
// generated slot (slots/regionSlots.js) and one generated casino game
// (data/casino.js). Admins can move / rename / re-wire all of it on the
// 지역·맵 관리 page (data/mapAdmin.js).
// =====================================================================
export const REGIONS = [
    { id: "sky",      name: "하늘나라",      en: "SKY KINGDOM",   emoji: "☁️", color: "#7dd3fc", need: "wings" },
    { id: "space",    name: "우주",          en: "OUTER SPACE",   emoji: "🪐", color: "#a78bfa", need: "space_suit" },
    { id: "cl1",      name: "카지노 랜드 1", en: "CASINO LAND 1", emoji: "🎰", color: "#facc15" },
    { id: "cl2",      name: "카지노 랜드 2", en: "CASINO LAND 2", emoji: "🎲", color: "#f472b6" },
    { id: "fantasy",  name: "판타지랜드",    en: "FANTASY LAND",  emoji: "🦄", color: "#c084fc" },
    { id: "under",    name: "지하세계",      en: "UNDERWORLD",    emoji: "⛏️", color: "#b45309" },
    { id: "spooky",   name: "스푸키 랜드",   en: "SPOOKY LAND",   emoji: "🎃", color: "#fb923c" },
    { id: "deepsea",  name: "심해",          en: "DEEP SEA",      emoji: "🐙", color: "#0ea5e9", need: "oxygen" },
    { id: "arctic",   name: "북극",          en: "NORTH POLE",    emoji: "🧊", color: "#bae6fd" }
];

// x / y = % on the region map. req: { country, pass } | { points } |
// { random: true, races: [...] } (coin flip at the door, those races walk in) |
// { fee: gold } | { feePts: points }
// slot.tpl picks a calibrated feature set (see slots/regionSlots.js).
// casino.kind: wheel | pick | coinflip | dice | hilo | scratch | gacha | plinko | lottery
export const NEW_MAPS = [
    // ------------------------------------------------ 하늘나라
    { id: "sky_casino", region: "sky", name: "Sky Casino", emoji: "☁️", color: "#38bdf8", x: 22, y: 30, shops: ["general", "pet", "decor"], job: true,
      slot: { name: "Sky High Fortune", brand: "CLOUD GAMING", tpl: "pearl", hi: ["🦅", "🌈", "🪁"], lo: ["☁️", "🌤️"], wild: "🌟", sp: "💠", bg: ["#bae6fd", "#0c4a6e"], acc: "#38bdf8" },
      casino: { name: "Cloud Wheel", kind: "wheel", icon: "🌀", desc: "구름 위의 휠! 최대 x25" } },
    { id: "dove", region: "sky", name: "Dove Casino", emoji: "🕊️", color: "#e2e8f0", x: 50, y: 18, shops: ["general", "pet"], earn: ["music", "survival", "labor"],
      slot: { name: "Peace Doves", brand: "CLOVER-TECH", tpl: "rabbit", hi: ["🕊️", "🫒", "💌"], lo: ["🪶", "🤍"], wild: "🕊️", sp: "🌕", bg: ["#f8fafc", "#475569"], acc: "#f1f5f9" },
      casino: { name: "Dove Nest Pick", kind: "pick", icon: "🪺", desc: "둥지 4개 중 황금알을 찾아라!", n: 4, closed: "🪺", prize: "🥚", miss: "🪶" } },
    { id: "cloud", region: "sky", name: "Cloud Casino", emoji: "🌫️", color: "#cbd5e1", x: 78, y: 32, shops: ["general", "pet", "weapon"], req: { country: "Foggy Nation", pass: "pass_cloud" },
      slot: { name: "Misty Cloud", brand: "BLK", tpl: "ghost", hi: ["🌫️", "🌙", "🦉"], lo: ["💧", "🌧️"], wild: "⛈️", sp: "🔮", bg: ["#94a3b8", "#0f172a"], acc: "#cbd5e1", font: "'Creepster', cursive" },
      casino: { name: "Fog Scratch", kind: "scratch", icon: "🌫️", desc: "안개를 긁어내라! 번개 3개 x40", syms: ["💧", "🌧️", "🌙", "🦉", "⚡"] } },
    { id: "balloon", region: "sky", name: "Balloon Casino", emoji: "🎈", color: "#f87171", x: 30, y: 66, shops: ["general", "decor", "point"],
      slot: { name: "Pop Pop Balloons", brand: "HYHG GAMING", tpl: "ant", hi: ["🎈", "🎀", "🎊"], lo: ["🧁", "🍬"], wild: "🎪", sp: "🎁", bg: ["#fecdd3", "#9f1239"], acc: "#fb7185" },
      casino: { name: "Balloon Darts", kind: "pick", icon: "🎯", desc: "풍선 5개 중 하나를 터뜨려라!", n: 5, closed: "🎈", prize: "💰", miss: "💨" } },
    { id: "winners", region: "sky", name: "Winners Take It All", emoji: "🏆", color: "#facc15", x: 60, y: 56, shops: ["general", "weapon", "point"], discount: true,
      slot: { name: "Winner's Crown", brand: "Scrooge-Slots", tpl: "dragon", hi: ["🏆", "👑", "🥇"], lo: ["🎖️", "🏅"], wild: "💫", sp: "👁️", bg: ["#fde68a", "#713f12"], acc: "#facc15", font: "'Rye', serif" },
      casino: { name: "Champion Dice", kind: "dice", icon: "🎲", desc: "챔피언의 주사위! 6-6 이면 x30" } },
    { id: "wingers", region: "sky", name: "Wingers", emoji: "🪽", color: "#fef3c7", x: 84, y: 74, shops: ["general", "weapon"], req: { random: true }, npc: true,
      slot: { name: "Wing Rush", brand: "Rabbit-Gaming", tpl: "pearl", hi: ["🪽", "🦢", "🐦"], lo: ["🪶", "🌬️"], wild: "😇", sp: "✨", bg: ["#fef9c3", "#854d0e"], acc: "#fde047" },
      casino: { name: "Feather Flip", kind: "coinflip", icon: "🪶", desc: "깃털 동전 던지기! 맞히면 x1.9" } },

    // ------------------------------------------------ 우주
    { id: "cosmic", region: "space", name: "Cosmic Casino", emoji: "🌌", color: "#818cf8", x: 20, y: 28, shops: ["general", "weapon", "point"], job: true,
      slot: { name: "Cosmic Cash", brand: "BLK", tpl: "ghost", hi: ["🪐", "☄️", "🌠"], lo: ["🌑", "🛸"], wild: "🌌", sp: "🔭", bg: ["#312e81", "#020617"], acc: "#818cf8" },
      casino: { name: "Nebula Wheel", kind: "wheel", icon: "🌌", desc: "성운 휠! 최대 x30" } },
    { id: "stars", region: "space", name: "Stars", emoji: "⭐", color: "#fde047", x: 48, y: 16, shops: ["general", "decor"], npc: true,
      slot: { name: "Star Collector", brand: "CLOUD GAMING", tpl: "rabbit", hi: ["⭐", "🌟", "💫"], lo: ["✨", "🌙"], wild: "🌠", sp: "🌕", bg: ["#1e1b4b", "#000"], acc: "#fde047" },
      casino: { name: "Star Scratch", kind: "scratch", icon: "⭐", desc: "별 3개를 긁어라! 은하 3개 x50", syms: ["✨", "🌙", "⭐", "🪐", "🌌"] } },
    { id: "zodiac", region: "space", name: "Zodiac Casino", emoji: "♈", color: "#f0abfc", x: 76, y: 30, shops: ["general", "pet", "point"],
      slot: { name: "Zodiac Fortune", brand: "YG GAMING", tpl: "dragon", hi: ["♌", "♏", "♓"], lo: ["♈", "♉"], wild: "☯️", sp: "👁️", bg: ["#701a75", "#0c0a1e"], acc: "#f0abfc" },
      casino: { name: "Zodiac Hi-Lo", kind: "hilo", icon: "♈", desc: "별자리 카드 하이로우. 맞히면 x1.9" } },
    { id: "celebrity", region: "space", name: "Celebrity Casino", emoji: "🌟", color: "#fb7185", x: 30, y: 68, shops: ["general", "decor", "pet"], discount: true,
      slot: { name: "Red Carpet Riches", brand: "DAEBAK", tpl: "ant", hi: ["🎬", "💃", "🕺"], lo: ["📸", "🍾"], wild: "🌟", sp: "🏆", bg: ["#9f1239", "#1f0510"], acc: "#fb7185" },
      casino: { name: "Paparazzi Pick", kind: "pick", icon: "📸", desc: "스타가 숨은 리무진을 찾아라!", n: 3, closed: "🚘", prize: "🌟", miss: "📸" } },
    { id: "spacetown", region: "space", name: "Space Town", emoji: "🚀", color: "#22d3ee", x: 70, y: 70, shops: ["general", "weapon", "pet"], req: { fee: 1000 },
      slot: { name: "Rocket Town", brand: "IPEX", tpl: "pearl", hi: ["🚀", "👨‍🚀", "🛰️"], lo: ["🌍", "🌕"], wild: "👽", sp: "🛸", bg: ["#0e7490", "#020617"], acc: "#22d3ee" },
      casino: { name: "Meteor Plinko", kind: "plinko", icon: "☄️", desc: "운석을 떨어뜨려라! 양 끝 x25" } },

    // ------------------------------------------------ 카지노 랜드 2
    { id: "super", region: "cl2", name: "Super Casino", emoji: "🦸", color: "#ef4444", x: 18, y: 24, shops: ["general", "weapon", "pet"], job: true,
      slot: { name: "Super Spin", brand: "Scrooge-Slots", tpl: "dragon", hi: ["🦸", "🦹", "⚡"], lo: ["💥", "🛡️"], wild: "🦸‍♀️", sp: "👁️", bg: ["#b91c1c", "#1e0505"], acc: "#ef4444" },
      casino: { name: "Super Wheel", kind: "wheel", icon: "💥", desc: "슈퍼 휠! 최대 x30" } },
    { id: "gambleables", region: "cl2", name: "Gambleables", emoji: "🎲", color: "#a3e635", x: 42, y: 16, shops: ["general", "decor", "point"], npc: true, beg: true,
      slot: { name: "Gamble Mania", brand: "Classic Gaming", tpl: "ghost", hi: ["🎲", "🃏", "🎰"], lo: ["♠️", "♥️"], wild: "🤑", sp: "🔮", bg: ["#3f6212", "#0a1402"], acc: "#a3e635" },
      casino: { name: "Gamble Dice", kind: "dice", icon: "🎲", desc: "도박꾼의 주사위 한 판!" } },
    { id: "ribbit", region: "cl2", name: "Ribbit Ribbit Town", emoji: "🐸", color: "#4ade80", x: 66, y: 18, shops: ["general", "pet"],
      slot: { name: "Lily Pad Loot", brand: "IPEX", tpl: "pearl", hi: ["🐸", "🪷", "🐞"], lo: ["🍃", "💧"], wild: "👑", sp: "🪙", bg: ["#16a34a", "#052e16"], acc: "#4ade80" },
      casino: { name: "Frog Flip", kind: "coinflip", icon: "🐸", desc: "개구리 동전 던지기! x1.9" } },
    { id: "emo2", region: "cl2", name: "Emo World Casino 2", emoji: "🐰", color: "#c084fc", x: 86, y: 32, shops: ["general", "pet", "weapon"], req: { country: "Emo World", pass: "pass_emo2" },
      slot: { name: "Emo Dreams", brand: "Rabbit-Gaming", tpl: "rabbit", hi: ["🐰", "💜", "🎀"], lo: ["🍓", "🌸"], wild: "🐇", sp: "🌕", bg: ["#7e22ce", "#1a0530"], acc: "#c084fc" },
      casino: { name: "Emo Gacha 2", kind: "gacha", icon: "🐰", desc: "이모 월드 캡슐머신 2호기" } },
    { id: "downtown", region: "cl2", name: "Downtown", emoji: "🏙️", color: "#60a5fa", x: 24, y: 62, shops: ["general", "weapon", "decor"], earn: ["blood", "sell", "survival", "music"], job: true, discount: true,
      slot: { name: "City Lights", brand: "CLOUD GAMING", tpl: "ant", hi: ["🏙️", "🚕", "💼"], lo: ["☕", "🚦"], wild: "🌃", sp: "💎", bg: ["#1e3a8a", "#030712"], acc: "#60a5fa" },
      casino: { name: "Downtown Lottery", kind: "lottery", icon: "🎱", desc: "도심 로또! 5개 다 맞히면 x300" } },
    { id: "eastern", region: "cl2", name: "Eastern Casino", emoji: "🏯", color: "#f97316", x: 50, y: 50, shops: ["general", "pet", "weapon"], job: true,
      slot: { name: "Eastern Dragon Gate", brand: "YG GAMING", tpl: "dragon", hi: ["🐉", "🏯", "🧧"], lo: ["🏮", "🎋"], wild: "🐲", sp: "👁️", bg: ["#c2410c", "#200a02"], acc: "#f97316", font: "'Rye', serif" },
      casino: { name: "Mahjong Pick", kind: "pick", icon: "🀄", desc: "마작패 4장 중 하나를 뒤집어라!", n: 4, closed: "🀫", prize: "🀄", miss: "🀆" } },
    { id: "western", region: "cl2", name: "Western Casino", emoji: "🤠", color: "#d97706", x: 76, y: 62, shops: ["general", "weapon", "point"], req: { feePts: 30 }, job: true,
      slot: { name: "Gold Rush Saloon", brand: "Scrooge-Slots", tpl: "pearl", hi: ["🤠", "🐎", "🌵"], lo: ["🥃", "🪙"], wild: "⭐", sp: "💰", bg: ["#b45309", "#1c0a02"], acc: "#fbbf24", font: "'Rye', serif" },
      casino: { name: "Saloon Cards", kind: "hilo", icon: "🃏", desc: "살롱 하이로우! 조커 x10" } },
    { id: "dung2", region: "cl2", name: "Dung Town Casino 2", emoji: "💩", color: "#a16207", x: 48, y: 84, shops: ["general", "pet", "weapon"], req: { country: "Dung Town", pass: "pass_dung2" },
      slot: { name: "Dung Fortune 2", brand: "IPEX", tpl: "ghost", hi: ["💩", "👑", "🏆"], lo: ["🧻", "🪠"], wild: "✨", sp: "🔮", bg: ["#a16207", "#1c0f02"], acc: "#facc15" },
      casino: { name: "Dung Scratch", kind: "scratch", icon: "💩", desc: "응가 스크래치! 황금 응가 3개 x40", syms: ["🧻", "🪠", "🚽", "👑", "💩"] } },

    // ------------------------------------------------ 판타지랜드
    { id: "fantasy", region: "fantasy", name: "Fantasy Casino", emoji: "🦄", color: "#e879f9", x: 22, y: 26, shops: ["general", "pet", "decor"], discount: true,
      slot: { name: "Unicorn Kingdom", brand: "CLOVER-TECH", tpl: "rabbit", hi: ["🦄", "🏰", "👸"], lo: ["🌸", "🍄"], wild: "🌈", sp: "🌕", bg: ["#a21caf", "#1e0524"], acc: "#e879f9" },
      casino: { name: "Unicorn Wheel", kind: "wheel", icon: "🦄", desc: "유니콘 휠! 최대 x30" } },
    { id: "mj2", region: "fantasy", name: "MJ World Casino 2", emoji: "🐱", color: "#2dd4bf", x: 52, y: 16, shops: ["general", "pet", "weapon"], req: { country: "MJ World", pass: "pass_mj2" },
      slot: { name: "MJ Paradise", brand: "YG GAMING", tpl: "dragon", hi: ["🐱", "🎏", "🍣"], lo: ["🍵", "🎐"], wild: "😸", sp: "👁️", bg: ["#0f766e", "#021614"], acc: "#2dd4bf" },
      casino: { name: "MJ Dice", kind: "dice", icon: "🐾", desc: "고양이 주사위 한 판!" } },
    { id: "magic", region: "fantasy", name: "Magic Town", emoji: "🪄", color: "#a855f7", x: 80, y: 30, shops: ["general", "weapon", "point"], earn: ["music", "labor"], job: true, npc: true,
      slot: { name: "Wizard's Vault", brand: "BLK", tpl: "ghost", hi: ["🧙", "📜", "🧪"], lo: ["🕯️", "🪄"], wild: "🔮", sp: "⚗️", bg: ["#581c87", "#0b0214"], acc: "#a855f7" },
      casino: { name: "Potion Gacha", kind: "gacha", icon: "🧪", desc: "물약 캡슐 뽑기! 전설 물약 x50" } },
    { id: "cany", region: "fantasy", name: "Cany Spinners", emoji: "🍭", color: "#f472b6", x: 28, y: 66, shops: ["general", "decor"], req: { random: true }, npc: true,
      slot: { name: "Candy Spinners", brand: "HYHG GAMING", tpl: "pearl", hi: ["🍭", "🍬", "🧁"], lo: ["🍫", "🍩"], wild: "🍰", sp: "🍒", bg: ["#ec4899", "#3b0420"], acc: "#f9a8d4" },
      casino: { name: "Candy Scratch", kind: "scratch", icon: "🍬", desc: "사탕 스크래치! 롤리팝 3개 x40", syms: ["🍫", "🍩", "🧁", "🍬", "🍭"] } },
    { id: "rainbow", region: "fantasy", name: "Rainbow Casino", emoji: "🌈", color: "#facc15", x: 56, y: 58, shops: ["general", "pet", "point"],
      slot: { name: "Over the Rainbow", brand: "CLOVER-TECH", tpl: "ant", hi: ["🌈", "🍀", "🎩"], lo: ["☀️", "🌦️"], wild: "🦄", sp: "🏺", bg: ["#ea580c", "#4c1d95"], acc: "#facc15" },
      casino: { name: "Rainbow Plinko", kind: "plinko", icon: "🌈", desc: "무지개 플링코! 양 끝 x25" } },
    { id: "poly2", region: "fantasy", name: "Polynesia Casino 2", emoji: "🌺", color: "#fb923c", x: 82, y: 76, shops: ["general", "pet", "weapon"], req: { country: "Polynesia", pass: "pass_poly2" },
      slot: { name: "Aloha Treasures", brand: "HYHG GAMING", tpl: "dragon", hi: ["🗿", "🌺", "🐢"], lo: ["🥥", "🍍"], wild: "🌋", sp: "👁️", bg: ["#ea580c", "#270a02"], acc: "#fb923c" },
      casino: { name: "Tiki Pick", kind: "pick", icon: "🗿", desc: "티키 5개 중 보물을 품은 티키는?", n: 5, closed: "🗿", prize: "💎", miss: "🥥" } },

    // ------------------------------------------------ 스푸키 랜드
    { id: "ghost", region: "spooky", name: "Ghost Casino", emoji: "👻", color: "#e2e8f0", x: 20, y: 26, shops: ["general", "weapon"], req: { random: true, races: ["Ghost", "Invisible"] }, npc: true,
      slot: { name: "Haunted Riches", brand: "BLK", tpl: "ghost", hi: ["👻", "🕯️", "🦇"], lo: ["🕸️", "🪦"], wild: "💀", sp: "🔮", bg: ["#334155", "#020617"], acc: "#e2e8f0", font: "'Creepster', cursive" },
      casino: { name: "Ouija Wheel", kind: "wheel", icon: "🔮", desc: "위자보드 휠… 최대 x30" } },
    { id: "spooky", region: "spooky", name: "Spooky Casino", emoji: "🎃", color: "#f97316", x: 48, y: 18, shops: ["general", "pet", "decor"], job: true,
      slot: { name: "Pumpkin Patch Payout", brand: "DAEBAK", tpl: "pearl", hi: ["🎃", "🧹", "🐈‍⬛"], lo: ["🍬", "🕷️"], wild: "🧙‍♀️", sp: "🍭", bg: ["#c2410c", "#170601"], acc: "#fb923c", font: "'Creepster', cursive" },
      casino: { name: "Pumpkin Pick", kind: "pick", icon: "🎃", desc: "호박 4개 중 사탕이 든 호박은?", n: 4, closed: "🎃", prize: "🍬", miss: "🕷️" } },
    { id: "dracula", region: "spooky", name: "Dracula Castle", emoji: "🧛", color: "#dc2626", x: 78, y: 28, shops: ["general", "weapon", "point"], npc: true,
      slot: { name: "Count's Fortune", brand: "Scrooge-Slots", tpl: "dragon", hi: ["🧛", "🦇", "🍷"], lo: ["🕯️", "⚰️"], wild: "🌕", sp: "👁️", bg: ["#7f1d1d", "#0a0101"], acc: "#ef4444", font: "'Creepster', cursive" },
      casino: { name: "Blood Moon Dice", kind: "dice", icon: "🩸", desc: "핏빛 달 아래 주사위!" } },
    { id: "coffin", region: "spooky", name: "Coffin Casino", emoji: "⚰️", color: "#78716c", x: 26, y: 66, shops: ["general", "decor"], npc: true,
      slot: { name: "Rest in Riches", brand: "BLK", tpl: "ant", hi: ["⚰️", "💀", "🌹"], lo: ["🕯️", "🪦"], wild: "🧟", sp: "⚱️", bg: ["#44403c", "#0c0a09"], acc: "#d6d3d1", font: "'Creepster', cursive" },
      casino: { name: "Coffin Pick", kind: "pick", icon: "⚰️", desc: "관 3개 중 보물이 든 관은…?", n: 3, closed: "⚰️", prize: "💰", miss: "🧟" } },
    { id: "graveyard", region: "spooky", name: "Graveyard", emoji: "🪦", color: "#94a3b8", x: 54, y: 56, shops: ["general", "weapon"], earn: ["blood", "poop"], beg: true, npc: true,
      slot: { name: "Midnight Graveyard", brand: "CLOUD GAMING", tpl: "rabbit", hi: ["🪦", "🦉", "🌕"], lo: ["🕸️", "🦴"], wild: "👻", sp: "🌑", bg: ["#1e293b", "#000"], acc: "#94a3b8", font: "'Creepster', cursive" },
      casino: { name: "Tombstone Scratch", kind: "scratch", icon: "🪦", desc: "묘비 스크래치! 해골 3개 x40", syms: ["🦴", "🕸️", "🦉", "🌕", "💀"] } },
    { id: "blackwater", region: "spooky", name: "Black Water Casino", emoji: "🌊", color: "#1e40af", x: 82, y: 74, shops: ["general", "pet", "point"],
      slot: { name: "Black Water Kraken", brand: "IPEX", tpl: "pearl", hi: ["🦑", "🐍", "⚓"], lo: ["🫧", "🐟"], wild: "🌊", sp: "🪙", bg: ["#1e3a8a", "#000814"], acc: "#3b82f6" },
      casino: { name: "Deep Dark Hi-Lo", kind: "hilo", icon: "🌊", desc: "검은 물속 하이로우" } },

    // ------------------------------------------------ 지하세계
    { id: "underground", region: "under", name: "Underground Casino", emoji: "⛏️", color: "#d97706", x: 22, y: 30, shops: ["general", "weapon", "pet"], earn: ["labor", "sell"], job: true,
      slot: { name: "Mole Miner", brand: "BLK", tpl: "dragon", hi: ["⛏️", "💎", "🪨"], lo: ["🔦", "🪵"], wild: "🐀", sp: "👁️", bg: ["#78350f", "#0f0602"], acc: "#f59e0b" },
      casino: { name: "Mine Plinko", kind: "plinko", icon: "⛏️", desc: "광산 플링코! 양 끝 x25" } },
    { id: "blackout", region: "under", name: "Blackout Casino", emoji: "🔦", color: "#475569", x: 72, y: 24, shops: ["general", "decor"], npc: true,
      slot: { name: "Lights Out", brand: "Classic Gaming", tpl: "ghost", hi: ["🔦", "🕯️", "💡"], lo: ["🌑", "🦇"], wild: "⚡", sp: "🔮", bg: ["#1f2937", "#000"], acc: "#fde047" },
      casino: { name: "Blackout Flip", kind: "coinflip", icon: "🌑", desc: "깜깜한 동전 던지기! x1.9" } },
    { id: "ground2", region: "under", name: "Ground Town Casino 2", emoji: "🐜", color: "#84cc16", x: 30, y: 72, shops: ["general", "pet", "weapon"], req: { country: "Ground Town", pass: "pass_ground2" },
      slot: { name: "Ant Empire", brand: "BLK", tpl: "ant", hi: ["🐜", "👸", "🍯"], lo: ["🌰", "🍂"], wild: "🌳", sp: "🍯", bg: ["#4d7c0f", "#0c1402"], acc: "#a3e635" },
      casino: { name: "Ant Lottery", kind: "lottery", icon: "🐜", desc: "개미 로또! 1~30 중 5개" } },
    { id: "dungeon", region: "under", name: "Dungeon", emoji: "🗝️", color: "#a8a29e", x: 74, y: 70, shops: ["general", "weapon", "point"], req: { random: true }, npc: true,
      slot: { name: "Dungeon Crawler", brand: "Scrooge-Slots", tpl: "pearl", hi: ["🗡️", "🛡️", "🐉"], lo: ["🗝️", "🕯️"], wild: "🧙", sp: "💰", bg: ["#57534e", "#0c0a09"], acc: "#fbbf24", font: "'Rye', serif" },
      casino: { name: "Treasure Chest Pick", kind: "pick", icon: "🧰", desc: "보물상자 3개 중 하나!", n: 3, closed: "🧰", prize: "💰", miss: "🐀" } },

    // ------------------------------------------------ 심해
    { id: "bubble", region: "deepsea", name: "Bubble Casino", emoji: "🫧", color: "#67e8f9", x: 24, y: 34, shops: ["general", "pet", "decor"], earn: ["music", "survival"],
      slot: { name: "Bubble Bonanza", brand: "CLOUD GAMING", tpl: "rabbit", hi: ["🫧", "🐠", "🐡"], lo: ["🐚", "🦐"], wild: "🧜‍♀️", sp: "🌕", bg: ["#0891b2", "#042f2e"], acc: "#67e8f9" },
      casino: { name: "Bubble Gacha", kind: "gacha", icon: "🫧", desc: "거품 캡슐 뽑기!" } },
    { id: "deepsea_casino", region: "deepsea", name: "Deep Sea Casino", emoji: "🐙", color: "#0ea5e9", x: 66, y: 28, shops: ["general", "weapon", "point"], job: true,
      slot: { name: "Abyss Treasures", brand: "HYHG GAMING", tpl: "dragon", hi: ["🐙", "🦈", "🐋"], lo: ["🦀", "🐚"], wild: "🔱", sp: "👁️", bg: ["#075985", "#00060f"], acc: "#38bdf8" },
      casino: { name: "Abyss Wheel", kind: "wheel", icon: "🐙", desc: "심연의 휠! 최대 x30" } },
    { id: "shipwreck", region: "deepsea", name: "Shipwreck", emoji: "🏴‍☠️", color: "#fbbf24", x: 46, y: 70, shops: ["general", "weapon"], req: { random: true }, npc: true,
      slot: { name: "Sunken Gold", brand: "Scrooge-Slots", tpl: "pearl", hi: ["🏴‍☠️", "🦜", "⚓"], lo: ["🪙", "🍾"], wild: "☠️", sp: "💰", bg: ["#155e75", "#030a0c"], acc: "#fbbf24", font: "'Rye', serif" },
      casino: { name: "Pirate Dice", kind: "dice", icon: "🏴‍☠️", desc: "해적의 주사위 한 판!" } },

    // ------------------------------------------------ 북극
    { id: "ice", region: "arctic", name: "Ice Casino", emoji: "🧊", color: "#7dd3fc", x: 24, y: 30, shops: ["general", "decor", "weapon"], job: true,
      slot: { name: "Ice Crystal Wins", brand: "CLOUD GAMING", tpl: "ghost", hi: ["🧊", "❄️", "💎"], lo: ["⛄", "🌨️"], wild: "🌬️", sp: "🔮", bg: ["#bae6fd", "#0c4a6e"], acc: "#7dd3fc" },
      casino: { name: "Ice Scratch", kind: "scratch", icon: "❄️", desc: "얼음 스크래치! 다이아 3개 x40", syms: ["⛄", "🌨️", "❄️", "🧊", "💎"] } },
    { id: "igloo", region: "arctic", name: "Igloo", emoji: "🛖", color: "#e0f2fe", x: 70, y: 32, shops: ["general", "pet", "point"], earn: ["labor", "survival"], discount: true,
      slot: { name: "Igloo Gold", brand: "IPEX", tpl: "ant", hi: ["🛖", "🦭", "🐻‍❄️"], lo: ["🐟", "🧣"], wild: "🌌", sp: "🐟", bg: ["#e0f2fe", "#1e3a8a"], acc: "#93c5fd" },
      casino: { name: "Snowball Pick", kind: "pick", icon: "⛄", desc: "눈덩이 4개 중 하나를 깨라!", n: 4, closed: "⚪", prize: "💎", miss: "❄️" } },
    { id: "penguin_casino", region: "arctic", name: "Penguin Casino", emoji: "🐧", color: "#38bdf8", x: 46, y: 70, shops: ["general", "decor"], req: { random: true }, npc: true,
      slot: { name: "Penguin Party", brand: "Rabbit-Gaming", tpl: "pearl", hi: ["🐧", "🐟", "🎉"], lo: ["❄️", "🧊"], wild: "🐧", sp: "🪙", bg: ["#0284c7", "#082f49"], acc: "#38bdf8" },
      casino: { name: "Penguin Slide", kind: "plinko", icon: "🐧", desc: "펭귄 미끄럼 플링코! 양 끝 x25" } }
];

// extra corners / region for the original Casino Land 1 maps
export const CL1_PATCH = {
    lucky:    { discount: true },
    seaside:  { job: true },
    twins:    { discount: true },
    gamblers: { earn: ["blood", "labor", "music"], job: true },
    dungdung: { earn: ["poop", "sell", "survival"], npc: true },
    noluck:   { npc: true },
    oink:     { earn: ["labor", "sell", "music"], job: true },
    foggy:    { earn: ["blood", "survival", "poop"], npc: true },
    dungtown: { earn: ["poop", "music", "sell"] }
};

// region-entry items + map passes (map pass = go straight to that map)
export const REGION_ITEMS = [
    { id: "wings",      name: "날개",   emoji: "🪽", price: 5000, region: "sky",     desc: "하늘나라를 선택하려면 필요합니다. 입장할 때 한 번 쓰고 사라집니다." },
    { id: "space_suit", name: "우주복", emoji: "🧑‍🚀", price: 5000, region: "space",   desc: "우주를 선택하려면 필요합니다. 입장할 때 한 번 쓰고 사라집니다." },
    { id: "oxygen",     name: "산소통", emoji: "🤿", price: 3000, region: "deepsea", desc: "심해를 선택하려면 필요합니다. 입장할 때 한 번 쓰고 사라집니다." }
];
