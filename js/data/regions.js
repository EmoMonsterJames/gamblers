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
    { id: "arctic",   name: "북극",          en: "NORTH POLE",    emoji: "🧊", color: "#bae6fd" },
    // ---- 6 rule regions
    //   fallback: refused / unpaid entry → straight to this map (no re-roll)
    //   needAny:  the region can only be picked while holding one of these (not used up)
    { id: "randomland", name: "랜덤랜드",          en: "RANDOM LAND",     emoji: "🎲", color: "#f59e0b", fallback: "plaza" },
    { id: "richland",   name: "리치랜드",          en: "RICH LAND",       emoji: "💰", color: "#eab308", fallback: "beggar_shelter" },
    { id: "noslot",     name: "No Slot 랜드",      en: "NO SLOT LAND",    emoji: "🃏", color: "#22c55e" },
    { id: "nocasino",   name: "No Casino Game 랜드", en: "NO CASINO LAND", emoji: "🎰", color: "#ef4444" },
    { id: "npcland",    name: "NPC 랜드",          en: "NPC LAND",        emoji: "👹", color: "#7c3aed" },
    { id: "combo",      name: "콤보랜드",          en: "COMBO LAND",      emoji: "🧩", color: "#14b8a6", needAny: ["wings", "space_suit", "oxygen"] }
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
    { id: "downtown", region: "cl2", name: "Downtown", emoji: "🏙️", color: "#60a5fa", x: 24, y: 62, shops: ["general", "weapon", "decor"], earn: ["blood", "sell", "survival", "music", "guess"], job: true, discount: true,
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
    { id: "magic", region: "fantasy", name: "Magic Town", emoji: "🪄", color: "#a855f7", x: 80, y: 30, shops: ["general", "weapon", "point"], earn: ["music", "labor", "guess"], job: true, npc: true,
      slot: { name: "Wizard's Vault", brand: "BLK", tpl: "ghost", hi: ["🧙", "📜", "🧪"], lo: ["🕯️", "🪄"], wild: "🔮", sp: "⚗️", bg: ["#581c87", "#0b0214"], acc: "#a855f7" },
      casino: { name: "Potion Gacha", kind: "gacha", icon: "🧪", desc: "물약 캡슐 뽑기! 전설 물약 x50" } },
    { id: "cany", region: "fantasy", name: "Candy Spinners", emoji: "🍭", color: "#f472b6", x: 28, y: 66, shops: ["general", "decor"], req: { random: true }, npc: true,
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
      casino: { name: "Penguin Slide", kind: "plinko", icon: "🐧", desc: "펭귄 미끄럼 플링코! 양 끝 x25" } },

    // =========================================================== 🎲 랜덤랜드
    // every map but 중앙광장 is a coin-flip door; refused → 중앙광장
    { id: "random_casino", region: "randomland", name: "Random Casino", emoji: "🎲", color: "#f59e0b", x: 20, y: 26, shops: ["general", "weapon"], req: { random: true }, job: true,
      slots: [sl("Random Riches", "Classic Gaming", "ghost", "🎲 🃏 🎰", "❓ 🔀", "🤪", "🔮", "#b45309", "#1c0a02", "#fbbf24")],
      casinos: [cg("wheel", "Random Wheel", "🔀", "아무거나 걸리는 랜덤 휠! 최대 x30"), cg("dice", "Chaos Dice", "🎲", "혼돈의 주사위 한 판!")] },
    { id: "odd_casino", region: "randomland", name: "Odd Casino", emoji: "🦄", color: "#a3e635", x: 50, y: 14, shops: ["general", "pet", "decor"], req: { random: true },
      slots: [sl("Odd Fellows", "HYHG GAMING", "ant", "🦄 🐙 🦩", "🧦 🥨", "👽", "🪙", "#4d7c0f", "#0c1402", "#bef264")],
      casinos: [cg("pick", "Odd One Out", "🧦", "짝 없는 양말 4개 중 하나!", { n: 4, closed: "🧦", prize: "💰", miss: "🧦" }), cg("coinflip", "Odd or Even", "🪙", "홀? 짝? 맞히면 x1.9")] },
    { id: "possibility", region: "randomland", name: "Possibility Town", emoji: "🔮", color: "#c084fc", x: 80, y: 26, shops: ["general", "point"], req: { random: true }, earn: ["guess", "music"],
      slots: [sl("Infinite Possibility", "CLOVER-TECH", "rabbit", "🔮 🌠 🗝️", "✨ 🌀", "♾️", "🌕", "#6b21a8", "#12021f", "#d8b4fe")],
      casinos: [cg("gacha", "Chance Capsule", "💊", "가능성 캡슐 뽑기! 레전드 x50"), cg("hilo", "Maybe Hi-Lo", "🔮", "될까? 안 될까? 하이로우")] },
    { id: "rtp_town", region: "randomland", name: "RTP Town", emoji: "📊", color: "#38bdf8", x: 22, y: 64, shops: ["general", "weapon", "pet"], req: { random: true }, discount: true,
      slots: [sl("Return to Player", "IPEX", "pearl", "📊 💹 🧮", "📉 📈", "💯", "🪙", "#0369a1", "#020617", "#7dd3fc")],
      casinos: [cg("plinko", "Percent Plinko", "📊", "확률 플링코! 양 끝 x25"), cg("scratch", "Stat Scratch", "🧮", "통계 스크래치! 100% 3개 x40", { syms: ["📉", "📈", "🧮", "💹", "💯"] })] },
    { id: "plaza", region: "randomland", name: "중앙광장", emoji: "⛲", color: "#e2e8f0", x: 52, y: 50, shops: ["general", "pet", "decor", "point"], earn: ["music", "sell", "labor"], beg: true,
      slots: [sl("Fountain Fortune", "CLOUD GAMING", "rabbit", "⛲ 🕊️ 🎠", "🪙 🎈", "🗿", "🌕", "#64748b", "#0f172a", "#e2e8f0")],
      casinos: [cg("pick", "Fountain Coins", "⛲", "분수 속 동전 3개 중 행운의 동전은?", { n: 3, closed: "⛲", prize: "🪙", miss: "💧" }), cg("lottery", "Plaza Lotto", "🎱", "광장 로또! 5개 다 맞히면 x300")] },
    { id: "crazy_casino", region: "randomland", name: "Crazy Casino", emoji: "🤪", color: "#f43f5e", x: 80, y: 66, shops: ["general", "weapon"], req: { random: true }, crazy: true, npc: true,
      slots: [sl("Crazy Time Bomb", "DAEBAK", "dragon", "🤪 💣 🌀", "⏰ 🧨", "🤡", "👁️", "#be123c", "#1f0510", "#fb7185", "'Creepster', cursive")],
      casinos: [cg("wheel", "Crazy Wheel", "🌀", "미친 듯이 도는 휠! 최대 x30"), cg("plinko", "Madness Plinko", "🤪", "광기의 플링코! 양 끝 x25")] },
    { id: "space_center", region: "randomland", name: "Space Center", emoji: "🛰️", color: "#818cf8", x: 50, y: 84, shops: ["general", "weapon", "point"], req: { random: true, gear: ["space_suit"], passGear: ["oxygen"] }, job: true,
      slots: [sl("Launch Countdown", "BLK", "pearl", "🛰️ 🚀 👩‍🚀", "🔧 📡", "🌍", "🛸", "#3730a3", "#020617", "#a5b4fc")],
      casinos: [cg("dice", "Countdown Dice", "🚀", "카운트다운 주사위! 6-6 발사 x30"), cg("scratch", "Mission Control Scratch", "📡", "관제 스크래치! 로켓 3개 x40", { syms: ["🔧", "📡", "🛰️", "👩‍🚀", "🚀"] })] },

    // =========================================================== 💰 리치랜드
    // every map but 거지쉼터 asks an entry fee (always asked) — refuse / can't pay → 거지쉼터
    { id: "riches", region: "richland", name: "Riches to Riches", emoji: "💸", color: "#facc15", x: 20, y: 26, shops: ["general", "weapon", "point"], req: { fee: 10000, ask: true }, job: true,
      slots: [sl("Riches to Riches", "Scrooge-Slots", "dragon", "💸 💰 🏦", "🪙 💵", "🤑", "👁️", "#a16207", "#1c1002", "#fde047", "'Rye', serif")],
      casinos: [cg("wheel", "Money Wheel", "💸", "돈다발 휠! 최대 x30"), cg("hilo", "Banker Hi-Lo", "🏦", "은행가의 하이로우")] },
    { id: "wealthy", region: "richland", name: "Wealthy Casino", emoji: "🎩", color: "#fbbf24", x: 50, y: 14, shops: ["general", "decor", "pet"], req: { fee: 5000, ask: true }, discount: true,
      slots: [sl("Top Hat Treasury", "CLOVER-TECH", "rabbit", "🎩 🍾 🛥️", "🥂 🚬", "💎", "🌕", "#854d0e", "#140c02", "#fcd34d")],
      casinos: [cg("pick", "Champagne Pick", "🍾", "샴페인 4병 중 황금 코르크는?", { n: 4, closed: "🍾", prize: "🥇", miss: "🫧" }), cg("dice", "Wealthy Dice", "🎲", "부자들의 주사위!")] },
    { id: "highroller", region: "richland", name: "High-Roller Town", emoji: "🎲", color: "#dc2626", x: 80, y: 26, shops: ["general", "weapon"], req: { fee: 8000, ask: true },
      slots: [sl("High Roller Heat", "YG GAMING", "pearl", "🎲 🃏 🥃", "🚬 🎱", "🔥", "💰", "#991b1b", "#140202", "#f87171")],
      casinos: [cg("coinflip", "Big Bet Flip", "🪙", "한 방 코인플립! x1.9"), cg("lottery", "Roller Lotto", "🎱", "하이롤러 로또! 5개 다 맞히면 x300")] },
    { id: "beggar_shelter", region: "richland", name: "거지쉼터", emoji: "🥣", color: "#a8a29e", x: 22, y: 64, shops: ["general", "pet"], earn: ["labor", "sell", "poop", "survival"], beg: true,
      slots: [sl("Empty Pockets", "Classic Gaming", "ant", "🥣 🧥 🪑", "🍞 🪙", "🍀", "🥫", "#57534e", "#0c0a09", "#d6d3d1")],
      casinos: [cg("scratch", "Lucky Can Scratch", "🥫", "깡통 스크래치! 네잎클로버 3개 x40", { syms: ["🍞", "🥫", "🧥", "🪙", "🍀"] }), cg("coinflip", "Last Coin Flip", "🪙", "마지막 동전을 던져라! x1.9")] },
    { id: "highlimit", region: "richland", name: "High-Limit Casino", emoji: "💳", color: "#6366f1", x: 52, y: 50, shops: ["general", "point", "weapon"], req: { feePts: 50, ask: true },
      slots: [sl("Black Card", "BLK", "ghost", "💳 🖤 💼", "🔑 🍸", "👑", "🔮", "#1e1b4b", "#000", "#a5b4fc")],
      casinos: [cg("hilo", "VIP Hi-Lo", "💳", "VIP 하이로우! 조커 x10"), cg("wheel", "Platinum Wheel", "💿", "플래티넘 휠! 최대 x30")] },
    { id: "goldbar", region: "richland", name: "Gold Bar Town", emoji: "🪙", color: "#f59e0b", x: 80, y: 66, shops: ["general", "decor"], req: { fee: 10000, ask: true }, earn: ["labor", "sell"],
      slots: [sl("Gold Bar Stack", "IPEX", "ant", "🪙 ⚱️ 🏺", "⛏️ 🧱", "🌟", "🪙", "#b45309", "#1c0a02", "#fcd34d")],
      casinos: [cg("plinko", "Gold Bar Plinko", "🧱", "금괴 플링코! 양 끝 x25"), cg("pick", "Vault Pick", "🔐", "금고 3개 중 금괴가 든 금고는?", { n: 3, closed: "🔐", prize: "🪙", miss: "🕸️" })] },
    { id: "diamond_casino", region: "richland", name: "Diamond Casino", emoji: "💎", color: "#67e8f9", x: 50, y: 84, shops: ["general", "point", "pet"], req: { feePts: 100, ask: true },
      slots: [sl("Diamond Dynasty", "CLOUD GAMING", "dragon", "💎 💍 👑", "💠 🔹", "✨", "👁️", "#0e7490", "#021014", "#a5f3fc")],
      casinos: [cg("gacha", "Gem Gacha", "💎", "보석 캡슐 뽑기! 레전드 x50"), cg("scratch", "Diamond Scratch", "💍", "다이아 스크래치! 다이아 3개 x40", { syms: ["🔹", "💠", "💍", "👑", "💎"] })] },

    // =========================================================== 🃏 No Slot 랜드 (casino games only — 4 each)
    { id: "noslot_casino", region: "noslot", name: "No Slot Casino", emoji: "🚫", color: "#22c55e", x: 24, y: 30, shops: ["general", "weapon", "point"], job: true,
      slots: [],
      casinos: [cg("wheel", "No-Reel Wheel", "🎡", "릴은 없다! 휠만 있다! 최대 x30"), cg("hilo", "Green Table Hi-Lo", "🃏", "그린 테이블 하이로우"), cg("dice", "Felt Dice", "🎲", "펠트 위의 주사위!"), cg("lottery", "Ball Draw Lotto", "🎱", "추첨 로또! 5개 다 맞히면 x300")] },
    { id: "games_only", region: "noslot", name: "Casino Games Only Town", emoji: "🎯", color: "#16a34a", x: 74, y: 26, shops: ["general", "pet", "decor"], discount: true, earn: ["guess", "music"],
      slots: [],
      casinos: [cg("pick", "Card Shark Pick", "🦈", "카드 5장 중 에이스를 찾아라!", { n: 5, closed: "🂠", prize: "🂡", miss: "🃏" }), cg("coinflip", "Table Flip", "🪙", "테이블 위 동전 던지기! x1.9"), cg("plinko", "Chip Drop", "🔴", "칩 떨어뜨리기! 양 끝 x25"), cg("scratch", "Chip Scratch", "🟢", "칩 스크래치! 블랙칩 3개 x40", { syms: ["⚪", "🔴", "🔵", "🟢", "⚫"] })] },
    { id: "weird_casino", region: "noslot", name: "Weird Casino", emoji: "👁️", color: "#a855f7", x: 30, y: 72, shops: ["general", "decor"], npc: true,
      slots: [],
      casinos: [cg("gacha", "Weird Capsule", "🥚", "이상한 캡슐! 뭐가 나올지 모름"), cg("pick", "Which Eye?", "👁️", "눈알 4개 중 진짜 보석은?", { n: 4, closed: "👁️", prize: "💎", miss: "🫠" }), cg("wheel", "Wobbly Wheel", "🌀", "흐물흐물 휠! 최대 x30"), cg("hilo", "Upside-Down Hi-Lo", "🙃", "거꾸로 하이로우?!")] },
    { id: "picky", region: "noslot", name: "Picky Town", emoji: "🧐", color: "#84cc16", x: 72, y: 70, shops: ["general", "weapon", "pet"], req: { random: true },
      slots: [],
      casinos: [cg("pick", "Picky Pick", "🧐", "까다롭게 하나만 골라라! (3개 중)", { n: 3, closed: "🎁", prize: "💰", miss: "🥦" }), cg("dice", "Picky Dice", "🎲", "까다로운 주사위!"), cg("coinflip", "Fussy Flip", "🪙", "깐깐한 동전 던지기! x1.9"), cg("lottery", "Choosy Lotto", "🎱", "골라 골라 로또! x300")] },

    // =========================================================== 🎰 No Casino Game 랜드 (slots only — 2 each)
    { id: "noc_casino", region: "nocasino", name: "No Casino Game Casino", emoji: "🎰", color: "#ef4444", x: 24, y: 30, shops: ["general", "weapon", "point"], job: true,
      slots: [sl("Reels Forever", "Classic Gaming", "pearl", "🎰 🍒 🔔", "🍋 🍇", "7️⃣", "💰", "#b91c1c", "#1e0505", "#fca5a5"),
              sl("Triple Bar Blast", "Scrooge-Slots", "dragon", "💰 🔔 💎", "🍒 🍋", "⭐", "👁️", "#7f1d1d", "#0a0101", "#facc15", "'Rye', serif")],
      casinos: [] },
    { id: "slots_only", region: "nocasino", name: "Slots Only Town", emoji: "🍒", color: "#f97316", x: 74, y: 26, shops: ["general", "pet", "decor"], discount: true, earn: ["music", "labor"],
      slots: [sl("Cherry Town", "HYHG GAMING", "rabbit", "🍒 🍓 🍉", "🍋 🍊", "🍬", "🌕", "#c2410c", "#200a02", "#fdba74"),
              sl("Neon Fruit Night", "DAEBAK", "ant", "🍍 🥝 🍇", "🍌 🍑", "🌃", "🍒", "#9d174d", "#0f0310", "#f9a8d4")] ,
      casinos: [] },
    { id: "redblue", region: "nocasino", name: "Red & Blue Casino", emoji: "🟥", color: "#3b82f6", x: 30, y: 72, shops: ["general", "weapon"], npc: true,
      slots: [sl("Red Fire", "YG GAMING", "dragon", "🔴 🔥 🐉", "🌶️ 🍎", "❤️‍🔥", "👁️", "#b91c1c", "#1a0202", "#f87171"),
              sl("Blue Ice", "CLOUD GAMING", "ghost", "🔵 🧊 🐳", "💧 🫐", "💙", "🔮", "#1d4ed8", "#020617", "#93c5fd")],
      casinos: [] },
    { id: "ocean_town", region: "nocasino", name: "Ocean Town", emoji: "🌊", color: "#06b6d4", x: 72, y: 70, shops: ["general", "pet", "point"], req: { gear: ["oxygen"] },
      slots: [sl("Ocean Breeze", "IPEX", "pearl", "🐬 🐳 🐠", "🐚 🦀", "🌊", "🪙", "#0e7490", "#021014", "#67e8f9"),
              sl("Coral Kingdom", "Rabbit-Gaming", "rabbit", "🪸 🧜 🐢", "🦐 🐟", "🔱", "🌕", "#0f766e", "#011513", "#5eead4")],
      casinos: [] },

    // =========================================================== 👹 NPC 랜드 (NPCs show up 100%)
    { id: "colosseum", region: "npcland", name: "Colosseum Casino", emoji: "🏛️", color: "#d97706", x: 18, y: 24, shops: ["general", "weapon", "point"], npc: "always", job: true,
      slots: [sl("Gladiator Gold", "Scrooge-Slots", "dragon", "🏛️ ⚔️ 🦁", "🛡️ 🏺", "🗡️", "👁️", "#92400e", "#140802", "#fbbf24", "'Rye', serif")],
      casinos: [cg("dice", "Arena Dice", "⚔️", "검투사의 주사위!"), cg("pick", "Lion's Gate", "🦁", "문 3개 중 사자가 없는 문은?", { n: 3, closed: "🚪", prize: "💰", miss: "🦁" })] },
    { id: "npc_town", region: "npcland", name: "NPC Town", emoji: "🧑‍🤝‍🧑", color: "#a78bfa", x: 44, y: 16, shops: ["general", "pet", "decor"], npc: "always", earn: ["labor", "music"],
      slots: [sl("Townsfolk Fortune", "Rabbit-Gaming", "rabbit", "👵 🧙 🥷", "🤖 🐹", "👼", "🌕", "#5b21b6", "#0e0420", "#c4b5fd")],
      casinos: [cg("gacha", "NPC Gacha", "🎎", "NPC 피규어 뽑기! 레전드 x50"), cg("hilo", "Townhall Hi-Lo", "🏘️", "마을회관 하이로우")] },
    { id: "sky_tower", region: "npcland", name: "Sky Tower", emoji: "🗼", color: "#38bdf8", x: 72, y: 20, shops: ["general", "weapon"], npc: "always", req: { gear: ["wings"] },
      slots: [sl("Tower Top", "CLOUD GAMING", "pearl", "🗼 🦅 🌤️", "☁️ 🪁", "🪽", "💰", "#0369a1", "#020617", "#bae6fd")],
      casinos: [cg("plinko", "Tower Drop", "🗼", "타워 꼭대기에서 떨어뜨려라! 양 끝 x25"), cg("coinflip", "Wind Flip", "🌬️", "바람 동전 던지기! x1.9")] },
    { id: "death_casino", region: "npcland", name: "Death Casino", emoji: "💀", color: "#0f172a", x: 88, y: 48, shops: ["general", "weapon", "point"], npc: "always", npcOnly: "reaper",
      slots: [sl("Last Breath", "BLK", "ghost", "💀 ⚰️ 🪦", "🕯️ 🦴", "☠️", "🔮", "#1e293b", "#000", "#94a3b8", "'Creepster', cursive")],
      casinos: [cg("wheel", "Wheel of Fate", "☠️", "운명의 휠… 최대 x30"), cg("scratch", "Grave Scratch", "🪦", "무덤 스크래치! 해골 3개 x40", { syms: ["🦴", "🕯️", "⚰️", "🪦", "💀"] })] },
    { id: "evil_town", region: "npcland", name: "Evil Town", emoji: "😈", color: "#dc2626", x: 22, y: 62, shops: ["general", "weapon"], npc: "always", evil: 10,
      slots: [sl("Evil Empire", "DAEBAK", "dragon", "😈 🔱 🔥", "🩸 🕷️", "👿", "👁️", "#7f1d1d", "#0a0101", "#ef4444", "'Creepster', cursive")],
      casinos: [cg("dice", "Devil's Dice", "😈", "악마의 주사위! 6-6 이면 x30"), cg("pick", "Cursed Chests", "🧰", "저주받은 상자 4개 중 하나!", { n: 4, closed: "🧰", prize: "💰", miss: "👿" })] },
    { id: "nightmare", region: "npcland", name: "Nightmare Casino", emoji: "😱", color: "#4c1d95", x: 50, y: 50, shops: ["general", "decor", "point"], npc: "always",
      slots: [sl("Bad Dream", "BLK", "ghost", "😱 🕷️ 🌑", "🦇 🕸️", "👹", "🔮", "#3b0764", "#05000a", "#c084fc", "'Creepster', cursive")],
      casinos: [cg("hilo", "Sleepless Hi-Lo", "🌑", "잠 못 드는 하이로우"), cg("gacha", "Nightmare Capsule", "😱", "악몽 캡슐 뽑기! 레전드 x50")] },
    { id: "donation", region: "npcland", name: "Donation Casino", emoji: "🎁", color: "#f472b6", x: 74, y: 74, shops: ["general", "pet", "decor"], npc: "always", donation: true, earn: ["labor", "survival"],
      slots: [sl("Giving Hearts", "CLOVER-TECH", "rabbit", "🎁 💝 🤝", "🧸 🍪", "😇", "🌕", "#be185d", "#1f0410", "#f9a8d4")],
      casinos: [cg("pick", "Charity Box", "📦", "기부함 4개 중 행운의 상자는?", { n: 4, closed: "📦", prize: "💝", miss: "🧸" }), cg("lottery", "Charity Lotto", "🎟️", "자선 로또! 5개 다 맞히면 x300")] },
    { id: "npc_casino", region: "npcland", name: "NPC Casino", emoji: "🤖", color: "#64748b", x: 40, y: 84, shops: ["general", "weapon", "pet"], npc: "always", discount: true,
      slots: [sl("NPC Showdown", "IPEX", "ant", "🤖 🐊 🧳", "🐹 👼", "💀", "🎫", "#334155", "#020617", "#cbd5e1")],
      casinos: [cg("wheel", "NPC Roulette Wheel", "🎡", "누가 나올까 NPC 휠! 최대 x30"), cg("coinflip", "Robot Flip", "🤖", "로봇 동전 던지기! x1.9")] },

    // =========================================================== 🧩 콤보랜드 (needs wings / space suit / oxygen — any one)
    { id: "sky_bridge", region: "combo", name: "Sky Bridge", emoji: "🌉", color: "#7dd3fc", x: 18, y: 24, shops: ["general", "weapon"], req: { gear: ["wings"] },
      slots: [sl("Bridge in the Clouds", "CLOUD GAMING", "pearl", "🌉 🦢 🌤️", "☁️ 🪶", "🪽", "💰", "#0284c7", "#082f49", "#bae6fd")],
      casinos: [cg("coinflip", "Bridge Toss", "🌉", "다리 위 동전 던지기! x1.9"), cg("wheel", "Cloud Bridge Wheel", "🌤️", "구름다리 휠! 최대 x30")] },
    { id: "rocketship", region: "combo", name: "Rocketship", emoji: "🚀", color: "#a78bfa", x: 44, y: 16, shops: ["general", "point"], req: { gear: ["space_suit"] }, job: true,
      slots: [sl("Rocket Fuel", "BLK", "dragon", "🚀 👨‍🚀 🛸", "🌙 ⛽", "🔥", "👁️", "#4338ca", "#020617", "#c7d2fe")],
      casinos: [cg("plinko", "Booster Drop", "🚀", "부스터 플링코! 양 끝 x25"), cg("dice", "Orbit Dice", "🪐", "궤도 주사위!")] },
    { id: "island", region: "combo", name: "Island", emoji: "🏝️", color: "#fbbf24", x: 72, y: 20, shops: ["general", "pet", "decor"], earn: ["survival", "labor", "music"], beg: true,
      slots: [sl("Island Paradise", "HYHG GAMING", "ant", "🏝️ 🥥 🦜", "🐚 🍹", "🌴", "🥥", "#0d9488", "#011513", "#fde68a")],
      casinos: [cg("pick", "Coconut Pick", "🥥", "코코넛 4개 중 보물은?", { n: 4, closed: "🥥", prize: "💎", miss: "🦀" }), cg("scratch", "Sandy Scratch", "🏝️", "모래 스크래치! 보물상자 3개 x40", { syms: ["🐚", "🦀", "🍹", "🦜", "💰"] })] },
    { id: "deep_ocean", region: "combo", name: "Deep Ocean", emoji: "🐋", color: "#0369a1", x: 88, y: 48, shops: ["general", "weapon", "point"], req: { gear: ["oxygen"] }, npc: true,
      slots: [sl("Leviathan", "IPEX", "dragon", "🐋 🦑 🦈", "🐡 🫧", "🔱", "👁️", "#075985", "#00060f", "#7dd3fc")],
      casinos: [cg("gacha", "Pearl Capsule", "🦪", "진주 캡슐 뽑기! 레전드 x50"), cg("hilo", "Pressure Hi-Lo", "🫧", "수압 하이로우")] },
    { id: "star_sky", region: "combo", name: "Star Sky", emoji: "🌠", color: "#fde047", x: 22, y: 62, shops: ["general", "decor", "point"], req: { gear: ["wings", "space_suit"] },
      slots: [sl("Shooting Stars", "CLOVER-TECH", "rabbit", "🌠 ⭐ 🪽", "✨ 🌙", "🌟", "🌕", "#1e1b4b", "#000", "#fde047")],
      casinos: [cg("scratch", "Wish Scratch", "🌠", "소원 스크래치! 별똥별 3개 x40", { syms: ["✨", "🌙", "⭐", "🪐", "🌠"] }), cg("wheel", "Constellation Wheel", "✨", "별자리 휠! 최대 x30")] },
    { id: "space_lake", region: "combo", name: "Space Lake", emoji: "🪐", color: "#22d3ee", x: 50, y: 50, shops: ["general", "pet", "weapon"], req: { gear: ["space_suit", "oxygen"] },
      slots: [sl("Galactic Lake", "YG GAMING", "pearl", "🪐 🐙 🛸", "🫧 🌑", "🌌", "💰", "#155e75", "#020617", "#67e8f9")],
      casinos: [cg("pick", "Alien Fishing", "🎣", "외계 호수 낚시! 낚싯대 3개 중 하나", { n: 3, closed: "🎣", prize: "👽", miss: "🫧" }), cg("lottery", "Galaxy Lotto", "🌌", "은하 로또! 5개 다 맞히면 x300")] },
    { id: "sky_pond", region: "combo", name: "Sky Pond", emoji: "🦆", color: "#5eead4", x: 74, y: 74, shops: ["general", "decor"], req: { gear: ["wings", "oxygen"] },
      slots: [sl("Floating Pond", "Rabbit-Gaming", "ant", "🦆 🪷 🐟", "💧 ☁️", "🌈", "🪙", "#0f766e", "#022c22", "#99f6e4")],
      casinos: [cg("coinflip", "Pond Skip", "🪨", "물수제비 동전! x1.9"), cg("plinko", "Raindrop Plinko", "💧", "빗방울 플링코! 양 끝 x25")] },
    { id: "combo_town", region: "combo", name: "Combo Town", emoji: "🧩", color: "#14b8a6", x: 40, y: 84, shops: ["general", "weapon", "point", "pet"], req: { gear: ["wings", "space_suit", "oxygen"] }, job: true, discount: true,
      slots: [sl("Triple Combo", "Scrooge-Slots", "dragon", "🧩 🪽 🤿", "🧑‍🚀 🔗", "💥", "👁️", "#115e59", "#011513", "#5eead4")],
      casinos: [cg("dice", "Combo Dice", "🧩", "콤보 주사위! 더블이면 대박"), cg("gacha", "Combo Capsule", "🔗", "콤보 캡슐 뽑기! 레전드 x50")] }
];

// the 6 rule regions added last — their slots / casino games get their own odds
export const RULE_REGIONS = ["randomland", "richland", "noslot", "nocasino", "npcland", "combo"];
// stable 0..1 number per id (odds that never change between page loads)
export function seed01(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; }

// compact builders for the region maps above
function sl(name, brand, tpl, hi, lo, wild, sp, bg0, bg1, acc, font) {
    return { name, brand, tpl, hi: hi.split(" "), lo: lo.split(" "), wild, sp, bg: [bg0, bg1], acc, ...(font ? { font } : {}) };
}
function cg(kind, name, icon, desc, extra = {}) { return { kind, name, icon, desc, ...extra }; }
// every region map's slot / casino-game list (old maps: one of each; new ones: slots[] / casinos[])
export const mapSlots = m => m.slots || (m.slot ? [m.slot] : []);
export const mapCasinos = m => m.casinos || (m.casino ? [m.casino] : []);
export const slotIdOf = (m, i) => "rs_" + m.id + (i ? "_" + (i + 1) : "");
export const casinoIdOf = (m, i) => "rc_" + m.id + (i ? "_" + (i + 1) : "");

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
