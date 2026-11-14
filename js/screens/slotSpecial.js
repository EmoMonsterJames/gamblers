// =====================================================================
// Renderer for the special machines (specialEngine.js). Plays a result's
// `phases` script on the shared slot cabinet (slot.js passes `api`).
// Returns { total, jpWins } — the actual paid amount (interactive bonuses
// like Top Offer / Food Critic may differ from the engine's assumption).
// =====================================================================
import { h, sleep, fmt, countUp } from "../core/util.js";

const FX = {
    // ---- round 6 machines
    sail: { icon: "⛵🪢", text: "SAIL UP!", snd: "whoosh", cls: "potion" },
    shipgo: { icon: "⛵💨⛵", text: "THE SHIP SETS SAIL!", snd: "boom", cls: "potion", shake: true },
    flood: { icon: "🌊🐟🌊", text: "SHIPWRECK!", snd: "splash", cls: "potion", shake: true },
    hammer: { icon: "🔨", text: "", snd: "boom", cls: "fire", shake: true },
    smashall: { icon: "🔨💥🔨", text: "TOTAL SMASH!!!", snd: "boom", cls: "fire", shake: true },
    rebuild: { icon: "🧱🏗️🧱", text: "NEW WALL!", snd: "whoosh", cls: "gold" },
    seven: { icon: "7️⃣7️⃣7️⃣", text: "LUCKY 777 · x7!", snd: "cash", cls: "gold", shake: true },
    sticky: { icon: "⭐📌", text: "STICKY WILD SPINS!", snd: "bonus", cls: "gold" },
    spike: { icon: "🗡️🗡️🗡️", text: "SPIKE TRAP PURGE!", snd: "boom", cls: "fire", shake: true },
    mimic: { icon: "🧰👀🦷", text: "MIMIC AMBUSH!", snd: "boom", cls: "ghost", shake: true },
    torch: { icon: "🔥🐉🔥", text: "TORCHLIGHT EXPANSION!", snd: "boom", cls: "bolt" },
    dkey: { icon: "🗝️⛓️", text: "DUNGEON KEY!", snd: "bonus", cls: "gold" },
    sonar: { icon: "📡〰️〰️", text: "SONAR PULSE OVERCHARGE!", snd: "bonus", cls: "beam" },
    leviathan: { icon: "🐉🌊", text: "LEVIATHAN WAKE!", snd: "whoosh", cls: "potion", shake: true },
    vent: { icon: "🫧🌋🫧", text: "THERMAL VENT ERUPTION!", snd: "boom", cls: "fire", shake: true },
    frost: { icon: "🔨❄️", text: "", snd: "boom", cls: "bolt" },
    freeze: { icon: "🌬️🧊", text: "FLASH FREEZE!", snd: "whoosh", cls: "bolt", shake: true },
    aurora: { icon: "🌌💚💜", text: "AURORA BOREALIS!", snd: "bonus", cls: "moon" },
    superpose: { icon: "⚛️🔀", text: "QUANTUM SUPERPOSITION!", snd: "bonus", cls: "glitch" },
    parallel: { icon: "🧊🧊", text: "PARALLEL TIMELINE SPLIT!", snd: "boom", cls: "glitch", shake: true },
    butterfly: { icon: "🦋✨", text: "BUTTERFLY EFFECT!", snd: "whoosh", cls: "glitch" },
    hearth: { icon: "🔥🏮🔥", text: "HEARTHFIRE WARMTH!", snd: "bonus", cls: "gold" },
    benefactor: { icon: "🧥👝🪙", text: "GENEROUS BENEFACTOR!", snd: "cash", cls: "gold" },
    feast: { icon: "🍞🥣🚪", text: "COMMUNITY FEAST!", snd: "boom", cls: "gold", shake: true },
    flock: { icon: "🔔🕊️🕊️🕊️", text: "FLOCK SCATTER!", snd: "whoosh", cls: "gold" },
    halo: { icon: "😇☀️", text: "HALO RESONANCE!", snd: "bonus", cls: "gold", shake: true },
    feather: { icon: "🪶🪶🪶", text: "FEATHER DRIFT RESPIN!", snd: "whoosh", cls: "gold" },
    allin: { icon: "🧤🃏", text: "ALL-IN SWEEP!", snd: "boom", cls: "fire", shake: true },
    rake: { icon: "🪙🧹🪙", text: "THE HOUSE CUT · POT x2!", snd: "cash", cls: "gold" },
    gravity: { icon: "🌀🚗🌀", text: "GRAVITY GLITCH!", snd: "whoosh", cls: "bolt", shake: true },
    ufo: { icon: "🛸✨", text: "UFO DELIVERY!", snd: "whoosh", cls: "bolt" },
    meteor: { icon: "☄️☄️☄️", text: "METEOR SHOWER!", snd: "boom", cls: "fire", shake: true },
    tongue: { icon: "🐸👅🪲", text: "TONGUE LASH!", snd: "whoosh", cls: "gold" },
    ripple: { icon: "💧〰️", text: "POND RIPPLE SYNC!", snd: "splash", cls: "potion" },
    tadpole: { icon: "🫧🐸🫧", text: "TADPOLE SWARM!", snd: "splash", cls: "potion" },
    green: { icon: "🚦🟢🚐", text: "GREEN LIGHT EXPRESS!", snd: "boom", cls: "gold", shake: true },
    subway: { icon: "🚇💨", text: "SUBWAY RUMBLE!", snd: "boom", cls: "bass", shake: true },
    heli: { icon: "🚁🔦", text: "HELICOPTER SPOTLIGHT!", snd: "whoosh", cls: "bolt" },
    flare: { icon: "🔥🦖🔥", text: "GODZILLA GRILL FLARE!", snd: "boom", cls: "fire" },
    rampage: { icon: "🦖💥", text: "TITAN RAMPAGE!!!", snd: "boom", cls: "fire", shake: true },
    bass: { icon: "🔊🔊🔊", text: "BASS DROP!", snd: "boom", cls: "bass", shake: true },
    scratch: { icon: "💿", text: "WICKY-WICKY SCRATCH!", snd: "whoosh", cls: "disc" },
    surf: { icon: "🙌🙌🙌", text: "CROWD SURF!", snd: "whoosh", cls: "crowd" },
    stage: { icon: "🎤✨", text: "STAGE CLEAR!", snd: "bonus", cls: "crowd" },
    rocket: { icon: "🚀", text: "ROCKET BOOSTER!", snd: "whoosh", cls: "rocket" },
    rockets: { icon: "🚀🚀🚀", text: "ROCKET COLUMNS!", snd: "boom", cls: "rocket" },
    zerog: { icon: "🐹🌀", text: "ZERO-GRAVITY!", snd: "whoosh", cls: "float" },
    laser: { icon: "✨", text: "", snd: "coin", cls: "beam" },
    arrow: { icon: "➕☀️", text: "SOLAR FLARE ARROWS!", snd: "bonus", cls: "sun" },
    merge: { icon: "🔗", text: "POD FUSION!", snd: "coin", cls: "beam" },
    meteor: { icon: "🐹☄️☄️", text: "x2 METEORS!", snd: "boom", cls: "meteor" },
    magnet: { icon: "🧲🌙🧲", text: "GRAVITY MAGNETS!", snd: "whoosh", cls: "moon" },
    hap: { icon: "⚡合⚡", text: "합 (合)!", snd: "boom", cls: "bolt" },
    chung: { icon: "⚡沖⚡", text: "충 (沖)!", snd: "boom", cls: "bolt", shake: true },
    pillar: { icon: "🏛️", text: "10년 기둥!", snd: "bonus", cls: "gold" },
    goldbox: { icon: "❓💥", text: "GOLDEN BOX BURST!!!", snd: "boom", cls: "gold", shake: true },
    coinspray: { icon: "🪙🪙🪙", text: "", snd: "cash", cls: "gold" },
    collect: { icon: "🎁➕", text: "GIFT COLLECT!", snd: "cash", cls: "gold" },
    wildthrow: { icon: "🎁🎁🎁", text: "", snd: "whoosh", cls: "gift" },
    rewind: { icon: "⏪📼", text: "REWIND GLITCH!", snd: "whoosh", cls: "glitch" },
    lasers: { icon: "🔴", text: "", snd: "coin", cls: "beam" },
    replay: { icon: "🌀⏩", text: "TIME-LOOP REPLAY!", snd: "bonus", cls: "glitch" },
    // ---- the 15 theme machines (themeEngine.js)
    pendulum: { icon: "🕰️", text: "PENDULUM SWING!", snd: "whoosh", cls: "gold", swing: true },
    swing: { icon: "🕰️", text: "", snd: "whoosh", cls: "gold" },
    mesh: { icon: "⚙️⚙️", text: "+1x MESH!", snd: "coin", cls: "gold" },
    distill: { icon: "🧪💧", text: "DISTILLER x2!", snd: "bonus", cls: "potion" },
    grimoire: { icon: "📖⚡", text: "MYSTERY GRIMOIRE!", snd: "boom", cls: "bolt" },
    erupt: { icon: "⚗️💥", text: "CHAIN REACTION BREW!", snd: "boom", cls: "potion", shake: true },
    supernova: { icon: "💥🌟", text: "SUPERNOVA!", snd: "boom", cls: "sun", shake: true },
    blackhole: { icon: "🕳️", text: "BLACK HOLE GRAVITY!", snd: "whoosh", cls: "moon" },
    comet: { icon: "☄️", text: "COMET TRAIL!", snd: "whoosh", cls: "meteor" },
    nebula: { icon: "🌀🌌", text: "NEBULA PORTAL!", snd: "bonus", cls: "moon" },
    megacore: { icon: "🤖🧊", text: "MEGA-CORE DROP!", snd: "boom", cls: "beam", shake: true },
    emp: { icon: "⚡🤖⚡", text: "EMP OVERCHARGE!", snd: "boom", cls: "bolt", shake: true },
    magnet: { icon: "🧲🤖", text: "MAGNET COLLECT!", snd: "cash", cls: "beam" },
    overdrive: { icon: "🔋⚔️🤖", text: "OVERDRIVE BATTLE!", snd: "boom", cls: "bolt", shake: true },
    kernel: { icon: "🍿", text: "", snd: "coin", cls: "gold" },
    jam: { icon: "🎞️💨", text: "PROJECTOR JAM!", snd: "whoosh", cls: "glitch" },
    glasses3d: { icon: "🕶️", text: "3D MODE!", snd: "bonus", cls: "glitch" },
    pop: { icon: "🍿💥", text: "BUCKET POP!", snd: "boom", cls: "gold", shake: true },
    doublefeature: { icon: "🍿🍿🍿", text: "DOUBLE-FEATURE!", snd: "boom", cls: "gold", shake: true },
    swarm: { icon: "👻👻👻", text: "SPECTRAL SWARM!", snd: "whoosh", cls: "ghost" },
    nudge: { icon: "👻🤚", text: "PHANTOM NUDGE!", snd: "whoosh", cls: "ghost" },
    blade: { icon: "🔪", text: "BLADE SLICE!", snd: "boom", cls: "fire", shake: true },
    necro: { icon: "🧙‍♂️⚡", text: "NECROMANCER'S RESPIN!", snd: "boom", cls: "bolt" },
    bloodmoon: { icon: "🌕🩸", text: "BLOOD MOON ECLIPSE!", snd: "boom", cls: "fire", shake: true },
    megabubble: { icon: "🧙‍♀️🫧", text: "ECTOPLASM SURGE!", snd: "splash", cls: "potion" },
    soulpop: { icon: "🫧👻", text: "SOUL POP!", snd: "coin", cls: "potion" },
    speeddial: { icon: "📞💗", text: "SPEED DIALING...", snd: "bonus", cls: "lcd" },
    t9: { icon: "⌨️", text: "AUTO-CORRECTING...", snd: "tick", cls: "lcd" },
    cheat: { icon: "✱ #", text: "SECRET CHEAT CODE!", snd: "boom", cls: "lcd", shake: true },
    echo: { icon: "🥁☀️", text: "TALKING DRUM ECHO!", snd: "boom", cls: "sun", shake: true },
    kente: { icon: "🧵✨", text: "KENTE LOOM WEAVE!", snd: "bonus", cls: "gold" },
    pinup: { icon: "🎳", text: "", snd: "coin", cls: "gold" },
    ball: { icon: "🎱💨🎳", text: "BOWLING BALL!", snd: "boom", cls: "beam", shake: true },
    strike: { icon: "🎳💥", text: "STRIKE!!!", snd: "boom", cls: "fire", shake: true },
    bingocoin: { icon: "🪙", text: "", snd: "coin", cls: "gold" },
    money: { icon: "💸", text: "", snd: "cash", cls: "gold" },
    claw: { icon: "🦾✨", text: "CLAW TIME!", snd: "bonus", cls: "gold" },
    // ---- round 7 (skyEngine.js)
    bolt: { icon: "🌩️⚡", text: "LIGHTNING CHAIN!", snd: "boom", cls: "bolt", shake: true },
    updraft: { icon: "🌬️☁️⬆️", text: "UPDRAFT RESPIN!", snd: "whoosh", cls: "float" },
    thunderhead: { icon: "🐓⛈️🐓", text: "THE STORM BEGINS!", snd: "boom", cls: "bolt", shake: true },
    formation: { icon: "🛩️🛩️🛩️", text: "FORMATION WILDS!", snd: "whoosh", cls: "gold" },
    barrel: { icon: "🛩️🌀", text: "BARREL ROLL x2!", snd: "whoosh", cls: "gold" },
    radar: { icon: "📡🎯", text: "DOGFIGHT!", snd: "boom", cls: "beam", shake: true },
    bridge: { icon: "🌈🌉🌈", text: "CROSSING BONUS!", snd: "bonus", cls: "sun" },
    crumble: { icon: "🪨💥✨", text: "CRUMBLING TILES!", snd: "boom", cls: "gold", shake: true },
    gate: { icon: "⛩️🗿", text: "GATEKEEPER'S TOLL!", snd: "boom", cls: "gold", shake: true },
    thruster: { icon: "🔥🚀", text: "THRUSTER BOOST!", snd: "boom", cls: "rocket" },
    stage: { icon: "🚀💨🧱", text: "STAGE SEPARATION!", snd: "boom", cls: "rocket", shake: true },
    shootingstar: { icon: "🌠✨", text: "SHOOTING STAR WILDS!", snd: "whoosh", cls: "meteor" },
    zodiac: { icon: "♈🔒", text: "ZODIAC LOCK!", snd: "bonus", cls: "moon" },
    ripple: { icon: "〰️💧〰️", text: "RIPPLE ECHO!", snd: "splash", cls: "potion" },
    dive: { icon: "🛟🛟🛟", text: "DEEP DIVE!", snd: "splash", cls: "potion", shake: true },
    dragongate: { icon: "🎏⛩️🐉", text: "DRAGON GATE LEAP!", snd: "boom", cls: "gold", shake: true },
    lotus: { icon: "💧🪷", text: "LOTUS BLOOM!", snd: "bonus", cls: "potion" },
    frenzy: { icon: "🍡🎏🎏", text: "FEEDING FRENZY!", snd: "splash", cls: "gold" },
    multiball: { icon: "🔱⚪⚪", text: "PINBALL MULTIBALL!", snd: "boom", cls: "beam", shake: true },
    combo: { icon: "🔗🔥", text: "COMBO METER!", snd: "bonus", cls: "glitch" },
    surge: { icon: "🔋⚡🏙️", text: "POWER SURGE!", snd: "boom", cls: "bolt", shake: true },
    thumb: { icon: "👑👍", text: "EMPEROR'S THUMB!", snd: "bonus", cls: "gold" },
    shieldwall: { icon: "🛡️🛡️🛡️", text: "SHIELD WALL!", snd: "boom", cls: "gold", shake: true },
    chariot: { icon: "🏇🏇🏇", text: "CHARIOT RACE!", snd: "boom", cls: "fire", shake: true },
    quest: { icon: "🗡️❗👾", text: "QUEST COMPLETE!", snd: "bonus", cls: "gold" },
    haggle: { icon: "🧔📦📦📦", text: "MERCHANT HAGGLING!", snd: "coin", cls: "gold" },
    raid: { icon: "❗🐉❗", text: "BOSS RAID!", snd: "boom", cls: "fire", shake: true },
    lift: { icon: "⬆️🛗⬆️", text: "EXPRESS LIFT!", snd: "whoosh", cls: "beam" },
    washer: { icon: "🤖🧽", text: "WINDOW WASHER!", snd: "whoosh", cls: "beam" },
    party: { icon: "🔑🍾🥂", text: "PENTHOUSE PARTY!", snd: "boom", cls: "gold", shake: true },
    // ---- round 8 (realmEngine.js)
    hourglass: { icon: "⏳🔄⌛", text: "CHEATING DEATH!", snd: "whoosh", cls: "ghost", rewind: true },
    soulfly: { icon: "👻➡️🏮", text: "", snd: "coin", cls: "ghost" },
    spectral: { icon: "🌊👻🌊", text: "SPECTRAL WAVE!", snd: "boom", cls: "ghost", shake: true },
    afterlife: { icon: "🗝️💀🗝️", text: "AFTERLIFE VAULT!", snd: "boom", cls: "ghost", shake: true },
    doves: { icon: "🔔🕊️🕊️🪶", text: "GOLDEN DOVE RELEASE!", snd: "whoosh", cls: "gold" },
    goldwave: { icon: "🌊✨🌊", text: "RIPPLE OF GENEROSITY!", snd: "splash", cls: "gold" },
    karma: { icon: "🎁🎁🎁", text: "TRIPLE KARMA!", snd: "boom", cls: "gold", shake: true },
    bard: { icon: "🪕🎶🎶", text: "BARD'S SONG!", snd: "bonus", cls: "gold" },
    brawl: { icon: "⚔️💥🍺", text: "BAR BRAWL!", snd: "boom", cls: "fire", shake: true },
    bounty: { icon: "📜📜📜", text: "BOUNTY BOARD!", snd: "bonus", cls: "gold" },
    shredder: { icon: "🗂️➡️🗑️", text: "PAPER SHREDDER!", snd: "boom", cls: "beam", shake: true },
    coffee: { icon: "☕☕☕", text: "COFFEE BREAK!", snd: "bonus", cls: "gold" },
    meeting: { icon: "📅📅📅", text: "PERFORMANCE REVIEW!", snd: "boom", cls: "beam", shake: true },
    nudge: { icon: "⬆️⬇️", text: "NUDGE!", snd: "whoosh", cls: "glitch" },
    neon: { icon: "⚡🌃⚡", text: "NEON OVERDRIVE!", snd: "boom", cls: "glitch", shake: true },
    ferris: { icon: "7️⃣🎡7️⃣", text: "SUPER JACKPOT WHEEL!", snd: "boom", cls: "glitch", shake: true },
    fusion: { icon: "🔴🧲🔵", text: "MAGNETIC FUSION!", snd: "boom", cls: "bolt", shake: true },
    surgered: { icon: "🔴🔴🔴", text: "RED SURGE!", snd: "boom", cls: "fire", shake: true },
    surgeblue: { icon: "🔵🔵🔵", text: "BLUE SURGE!", snd: "boom", cls: "beam", shake: true },
    reactor: { icon: "☢️☢️☢️", text: "REACTOR OVERLOAD!", snd: "boom", cls: "bolt", shake: true },
    blackcard: { icon: "💳✨", text: "UNLIMITED CREDIT!", snd: "bonus", cls: "gold" },
    dividend: { icon: "🪙📈", text: "DIVIDEND x3!", snd: "cash", cls: "gold" },
    auction: { icon: "🔨🏓🏓", text: "AUCTION HOUSE!", snd: "boom", cls: "gold", shake: true },
    vipup: { icon: "🔦✨", text: "VIP UPGRADE!", snd: "bonus", cls: "gold" },
    bouncer: { icon: "🕴️✋🕴️", text: "BOUNCER'S BLOCK!", snd: "boom", cls: "bass" },
    champagne: { icon: "🥂🥂🥂", text: "CHAMPAGNE TOWER!", snd: "boom", cls: "gold", shake: true },
    furnace: { icon: "🔥🧈🔥", text: "24-KARAT MELT!", snd: "boom", cls: "fire" },
    dynamite: { icon: "🧨🧨🧨", text: "MINT VAULT HEIST!", snd: "boom", cls: "fire", shake: true },
    refract: { icon: "🔆💠🔆", text: "LASER REFRACTION!", snd: "bonus", cls: "beam" },
    flawless: { icon: "💎💥✨", text: "FLAWLESS CUT!", snd: "boom", cls: "beam", shake: true },
    crowns: { icon: "👑👑👑", text: "CROWN JEWEL VAULT!", snd: "boom", cls: "gold", shake: true },
    // ---- round 9 (wonderEngine.js)
    mystery: { icon: "❓❓❓", text: "MYSTERY BOX DROP!", snd: "bonus", cls: "glitch" },
    portal: { icon: "🌀🔀🌀", text: "DIMENSION SCRAMBLE!", snd: "whoosh", cls: "glitch", shake: true },
    dice: { icon: "🎲🎲", text: "DICE ROLL MULTIPLIER!", snd: "boom", cls: "gold", shake: true },
    glitch: { icon: "⚠️👾⚠️", text: "GLITCH FREE SPINS!", snd: "boom", cls: "glitch", shake: true },
    taxidermy: { icon: "🫙💥🦊", text: "TAXIDERMY SURPRISE!", snd: "boom", cls: "potion", shake: true },
    oddone: { icon: "🦆🦆🦆🦆🌀", text: "ODD ONE OUT!", snd: "bonus", cls: "glitch" },
    clockback: { icon: "🕰️⏪", text: "BACKWARD CLOCK!", snd: "whoosh", cls: "gold", rewind: true },
    monocle: { icon: "🧐🧐🧐", text: "CURATOR'S VAULT!", snd: "boom", cls: "gold", shake: true },
    bull: { icon: "⏫🐂📈", text: "BULL MARKET SURGE!", snd: "boom", cls: "beam", shake: true },
    pctdrop: { icon: "％➗💎💎", text: "DIVIDEND DROP!", snd: "cash", cls: "gold" },
    server: { icon: "🔑🖥️🔑", text: "ALGORITHM OVERLOAD!", snd: "boom", cls: "beam", shake: true },
    parade: { icon: "🎺🥁🎷🎺", text: "STREET PARADE!", snd: "bonus", cls: "gold", shake: true },
    firework: { icon: "🎇🚀💥", text: "FIREWORK FINALE!", snd: "boom", cls: "fire", shake: true },
    splash: { icon: "⛲💦💦", text: "FOUNTAIN SPLASH!", snd: "splash", cls: "potion" },
    market: { icon: "🎟️🏮🍢", text: "NIGHT MARKET!", snd: "boom", cls: "gold", shake: true },
    rover: { icon: "🛻💨〰️", text: "ROVER EXPEDITION!", snd: "whoosh", cls: "gold" },
    satlaser: { icon: "📡⚡📡", text: "SATELLITE LINK!", snd: "boom", cls: "beam", shake: true },
    zerograv: { icon: "🧑‍🚀🪐🫧", text: "ZERO GRAVITY!", snd: "whoosh", cls: "float" },
    countdown: { icon: "⏱️3️⃣2️⃣1️⃣🚀", text: "DEEP SPACE LAUNCH!", snd: "boom", cls: "beam", shake: true },
    icecrack: { icon: "🧊💥🐠", text: "ICE BLOCK SMASH!", snd: "boom", cls: "bolt" },
    snowball: { icon: "🐧❄️💥❄️🐧", text: "SNOWBALL FIGHT!", snd: "boom", cls: "bolt", shake: true },
    marlin: { icon: "⛏️🕳️🐟", text: "FISHING HOLE · 10x!", snd: "splash", cls: "bolt", shake: true },
    aurora9: { icon: "🌌💚🐧", text: "AURORA FREE SPINS!", snd: "bonus", cls: "moon" },
    puffer: { icon: "🐡💥🫧", text: "PUFFERFISH INFLATE!", snd: "boom", cls: "potion", shake: true },
    bubmerge: { icon: "🫧➕🫧", text: "BUBBLE MERGE!", snd: "coin", cls: "potion" },
    chainpop: { icon: "💥🫧💥", text: "CHAIN POP!", snd: "boom", cls: "potion" },
    bubblebath: { icon: "🪄🫧🛁", text: "BUBBLE BATH BONUS!", snd: "boom", cls: "potion", shake: true },
    cannon: { icon: "💣💥📦", text: "CANNONBALL BLAST!", snd: "boom", cls: "fire", shake: true },
    kraken: { icon: "🐙", text: "TENTACLE GRAB!", snd: "boom", cls: "potion", shake: true },
    compassE: { icon: "🧭➡️💀", text: "COMPASS SPIN!", snd: "whoosh", cls: "gold" },
    compassS: { icon: "🧭⬇️💀", text: "COMPASS SPIN!", snd: "whoosh", cls: "gold" },
    keys: { icon: "🗝️🗝️🗝️", text: "CAPTAIN'S CHEST!", snd: "boom", cls: "gold", shake: true },
    poltergeist: { icon: "👻💨🖼️", text: "POLTERGEIST POSSESSION!", snd: "whoosh", cls: "ghost" },
    seance: { icon: "🔮🕯️👻", text: "SÉANCE TABLE!", snd: "boom", cls: "ghost", shake: true },
    slime: { icon: "🟢💚🟢", text: "ECTOPLASM x3!", snd: "cash", cls: "potion" },
    attic: { icon: "🗝️🧳👻", text: "ATTIC ESCAPE!", snd: "boom", cls: "ghost", shake: true },
    wisp: { icon: "🔵✨🔵", text: "WILL-O'-THE-WISP!", snd: "bonus", cls: "beam" },
    skeleton: { icon: "💀🦴💃", text: "SKELETON DANCE!", snd: "boom", cls: "ghost", shake: true },
    dig: { icon: "⛏️🧰", text: "GRAVE ROBBER'S SHOVEL!", snd: "coin", cls: "gold" },
    fullmoon: { icon: "🏮🌕🏮", text: "FULL MOON RESURRECTION!", snd: "boom", cls: "moon", shake: true },
    batswarm: { icon: "🦇🦇🦇🦇", text: "BAT SWARM!", snd: "whoosh", cls: "fire", shake: true },
    redmoon: { icon: "🌕🍷", text: "BLOOD MOON RISE!", snd: "boom", cls: "fire", shake: true },
    bride: { icon: "⚰️👰", text: "VAMPIRE BRIDE!", snd: "boom", cls: "ghost", shake: true },
    coffin: { icon: "⚰️💰", text: "COFFIN LID CREAK!", snd: "cash", cls: "gold" },
    crypt: { icon: "✝️⚱️✝️", text: "CASTLE CRYPT BONUS!", snd: "boom", cls: "fire", shake: true }
};
// the spin mechanic of the round-7 machines: a cover over the reels that plays while they land
const COVERS = {
    clouds: n => Array.from({ length: n }, (_, i) => h("i", { style: { "--i": i } }, "☁️")),
    radar: () => [h("b.cv-scope"), ...["🛩️", "🦅", "🛩️", "🦅", "🛩️"].map((e, i) => h("i", { style: { "--i": i } }, e))],
    tiles: n => Array.from({ length: n }, (_, i) => h("i", { style: { "--c": i % 5, "--r": Math.floor(i / 5) } })),
    rockets: () => Array.from({ length: 5 }, (_, i) => h("i", { style: { "--i": i } }, "🚀")),
    starlight: () => [h("b.cv-pulse"), ...Array.from({ length: 20 }, (_, i) => h("i", { style: { "--x": Math.random() * 92 + "%", "--y": Math.random() * 88 + "%", "--i": i } }, "✦"))],
    ripple: () => [h("i.cv-meteor", "☄️"), ...[0, 1, 2].map(i => h("b.cv-ring", { style: { "--i": i } }))],
    net: () => [...Array.from({ length: 12 }, (_, i) => h("i", { style: { "--i": i } }, i % 4 ? "🐟" : "🐠")), h("b.cv-net", "🥅")],
    plunger: () => [h("i.cv-plunger", "🕹️"), h("b.cv-ball", "⚪")],
    gate: () => [h("b.cv-bars")],
    clock: () => [h("b.cv-clock", "🕰️"), ...["🧑‍🌾", "🧙", "🧝", "💂", "🧑‍🍳"].map((e, i) => h("i", { style: { "--i": i } }, e))],
    elevator: () => [h("b.cv-floors", Array.from({ length: 8 }, (_, i) => h("span", `${(8 - i) * 25}F`)))],
    // ---- round 8
    scythe: n => [...Array.from({ length: n }, (_, i) => h("i.cv-tomb", { style: { "--i": i } }, "🪦")), h("b.cv-scythe", "🪓")],
    coin: () => [h("b.cv-coin", "🪙"), ...[0, 1, 2].map(i => h("i.cv-ring", { style: { "--i": i } }))],
    mugs: n => Array.from({ length: n }, (_, i) => h("i.cv-mug", { style: { "--i": i } }, i % 3 ? "🍺" : "🂠")),
    email: () => [h("b.cv-mail", "📧"), ...Array.from({ length: 10 }, (_, i) => h("i.cv-note", { style: { "--i": i, "--x": (i * 37) % 90 + "%" } }, i % 2 ? "🗒️" : "📊"))],
    lever: () => [h("b.cv-lever", h("span", "🔴")), h("i.cv-flash")],
    pulse: () => [h("b.cv-div"), ...Array.from({ length: 10 }, (_, i) => h("i.cv-tile" + (i % 2 ? ".b" : ".r"), { style: { "--i": i } }))],
    deal: n => Array.from({ length: n }, (_, i) => h("i.cv-card", { style: { "--c": i % 5, "--r": Math.floor(i / 5) } })),
    doors: () => Array.from({ length: 5 }, (_, i) => h("i.cv-door", { style: { "--i": i } })),
    pour: n => [h("b.cv-chain", "⛓️"), ...Array.from({ length: n }, (_, i) => h("i.cv-mold", { style: { "--c": i % 4, "--r": Math.floor(i / 4) } }))],
    prism: () => [h("b.cv-beam"), h("b.cv-prism", "🔺"), ...Array.from({ length: 7 }, (_, i) => h("i.cv-ray", { style: { "--i": i } }))],
    // ---- round 9
    cube: () => [h("b.cv-cube", ["U", "F", "R", "L", "B", "D"].map(f => h("i.cf.f-" + f)))],
    curtain: n => [h("b.cv-cord", "🪢"), h("i.cv-curt.l"), h("i.cv-curt.r"), ...Array.from({ length: n }, (_, i) => h("i.cv-drawer", { style: { "--i": i } }))],
    ticker: () => [h("b.cv-trade", "EXECUTE TRADE"), ...Array.from({ length: 5 }, (_, i) => h("i.cv-tick", { style: { "--i": i } }, ["▲ 2.4%", "▼ 0.7%", "▲ 9.9%", "▲ 42%", "▲ 1.1%"][i]))],
    bell: () => [h("b.cv-bell", "🔔"), ...Array.from({ length: 12 }, (_, i) => h("i.cv-lantern", { style: { "--i": i, "--y": (i * 29) % 90 + "%" } }, "🏮"))],
    ignition: () => [h("b.cv-switch", "🔴"), h("i.cv-sweep"), ...[0, 1, 2].map(i => h("i.cv-ring", { style: { "--i": i } }))],
    whistle: () => [h("b.cv-whistle", "📯"), ...Array.from({ length: 15 }, (_, i) => h("i.cv-peng", { style: { "--c": i % 5, "--r": Math.floor(i / 5) } }, "🐧"))],
    wand: () => [h("b.cv-wand", "🪄"), ...Array.from({ length: 16 }, (_, i) => h("i.cv-bub", { style: { "--x": (i % 4) * 25 + 6 + "%", "--i": i } }, "🫧"))],
    flashlight: n => [h("b.cv-light"), ...Array.from({ length: n }, (_, i) => h("i.cv-crate", { style: { "--c": i % 5, "--r": Math.floor(i / 5) } }))],
    chime: n => [h("b.cv-chime", "🔔"), ...Array.from({ length: n }, (_, i) => h("i.cv-frame", { style: { "--c": i % 4, "--r": Math.floor(i / 4) } }, "🖼️"))],
    shovel: n => [h("b.cv-shovel", "⛏️"), ...Array.from({ length: n }, (_, i) => h("i.cv-stone", { style: { "--c": i % 5, "--r": Math.floor(i / 5) } }, "🪦"))],
    organ: n => [h("b.cv-organ", "🎹"), ...Array.from({ length: n }, (_, i) => h("i.cv-glass", { style: { "--c": i % 5, "--r": Math.floor(i / 5), "--h": (i * 47) % 360 } }))]
};

export async function playSpecial(res, api) {
    const { cfg, cellsEl, highlight, overlay, msgEl, winEl, cabinet, frame, Sound, bet } = api;
    const pace = ms => sleep(ms * (api.turbo() ? 0.45 : 1));
    let run = 0;
    const jpWins = [];
    let offerTaken = null; // { k, v, jp }
    const hud = h("div.sp-hud");
    frame.append(hud);
    const add = async (amt, text) => {
        if (!amt) return;
        const from = run; run += amt;
        if (text) msgEl.innerHTML = `${text} = <b>${fmt(amt)}</b>`;
        Sound.win();
        await countUp(winEl, from, run, 450);
    };
    const clearHl = () => api.reelsBox.querySelectorAll(".hit,.dim,.sp-morph,.sp-smash").forEach(e => e.classList.remove("hit", "dim", "sp-morph", "sp-smash"));
    // Hold & Spin respin: coins roll past the empty cells, then the columns stop
    // one by one (left → right); a new coin only shows when its column stops.
    async function rollEmpties(p) {
        const added = new Set((p.cells || []).map(([c, r]) => c + "," + r));
        const cols = p.grid.length, rowsN = p.grid[0]?.length || 3;
        const rolls = [];
        for (let c = 0; c < cols; c++) for (let r = 0; r < rowsN; r++) {
            const el = cellsEl(c, r);
            if (!el || !el.classList.contains("sym-empty")) continue;
            const strip = h("div.sp-roll-strip", { style: { animationDuration: (0.28 + Math.random() * 0.12) + "s" } },
                ...Array.from({ length: 6 }, (_, i) => h("span", i % 2 ? "" : "🪙")));
            const roll = h("div.sp-roll", strip);
            el.append(roll);
            rolls.push({ c, r, el, roll });
        }
        let found = 0;
        await pace(500);
        for (let c = 0; c < cols; c++) {
            const mine = rolls.filter(x => x.c === c);
            if (!mine.length) continue;
            // tension: the last columns slow down when nothing has landed yet
            const late = c >= cols - 2 && !found;
            if (late) mine.forEach(x => x.roll.classList.add("slow"));
            await pace(late ? 520 : 240);
            for (const x of mine) {
                x.roll.remove();
                if (added.has(x.c + "," + x.r)) {
                    x.el.className = "sym s-GC pop"; x.el.dataset.s = "GC";
                    x.el.replaceChildren(h("span", "🪙"));
                    found++; Sound.coin();
                }
            }
            Sound.tick();
        }
        api.showGrid(p.grid);
        for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("pop");
        await pace(found ? 600 : 400);
    }
    const setRows = n => { api.reelsBox.style.setProperty("--rows", n); cabinet.classList.toggle("sp-tall", n > 5); };
    // one phase of the script (a "choose" phase plays the chosen branch through here too)
    async function step(p, i) {
            switch (p.t) {
                case "spin": {
                    clearHl();
                    api.reelsBox.querySelectorAll(".spb").forEach(e => e.remove());
                    const cov = cfg.cover ? spinCover(cfg.cover) : null;
                    if (p.hour != null) api.meter("hour", p.hour);
                    if (p.floor != null) api.meter("floor", p.floor);
                    try { await api.animateReels(p.grid, { anticipation: p.antic || [], nearMiss: p.near || null }); } finally { cov?.remove(); }
                    for (const c of p.hold || []) api.reelsBox.children[c]?.classList.add("sp-held");
                    for (const [c, r] of p.frozen || []) cellsEl(c, r)?.classList.add("sp-frozen");
                    if (i === 0 && api.onLand) await api.onLand();
                    if (i === 0 && !res.total && p.antic?.length && !res.bonus) msgEl.innerHTML = `<span class="tease">아깝다!! 😱 한 개만 더…</span>`;
                    break;
                }
                case "show": case "land": {
                    if (p.roll) { await rollEmpties(p); break; }
                    api.showGrid(p.grid);
                    if (i === 0 && api.onLand) await api.onLand(); // reel-less machines (brick wall) open with a show
                    const cells = p.pop || p.cells || [];
                    for (const [c, r] of cells) cellsEl(c, r)?.classList.add("pop");
                    if (cells.length) Sound.coin();
                    await pace(p.ms || (p.t === "land" ? 380 : 300));
                    break;
                }
                case "morph": {
                    api.showGrid(p.grid);
                    for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("sp-morph", "sp-" + (p.fx || "evolve"));
                    if (p.text) msgEl.innerHTML = `<b class="sp-say">${p.text}</b>`;
                    Sound.bonus();
                    await pace(750);
                    break;
                }
                case "clear": {
                    for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("sp-smash");
                    if (p.cells?.length) Sound.boom?.();
                    await pace(380);
                    break;
                }
                case "drop": {
                    api.showGrid(p.grid);
                    const dc = p.up ? "sp-rise" : "sp-drop";
                    api.reelsBox.classList.remove("sp-drop", "sp-rise"); void api.reelsBox.offsetWidth; api.reelsBox.classList.add(dc);
                    Sound.stop();
                    await pace(380);
                    break;
                }
                case "win": {
                    api.reelsBox.querySelectorAll(".sym").forEach(s => s.classList.add("dim"));
                    for (const [c, r] of p.cells || []) { const e = cellsEl(c, r); e?.classList.remove("dim"); e?.classList.add("hit"); }
                    await add(p.win, p.text);
                    await pace(520);
                    api.reelsBox.querySelectorAll(".dim").forEach(s => s.classList.remove("dim"));
                    break;
                }
                case "jp": {
                    if (p.offerJp) { // only paid when the player actually took that jackpot offer
                        if (!offerTaken?.jp) break;
                        p.tier = offerTaken.k; p.amount = offerTaken.v;
                    }
                    jpWins.push({ tier: p.tier, amount: p.amount });
                    run += p.amount;
                    await api.bigWin(p.amount, bet, { jackpot: p.tier, title: cfg.jpLabel?.[p.tier] || null });
                    winEl.textContent = fmt(run);
                    break;
                }
                case "badge": {
                    for (const b of p.cells || []) {
                        const el = cellsEl(b.c, b.r); if (!el) continue;
                        el.querySelector(".spb")?.remove();
                        el.append(h("b.spb." + (b.cls || "val"), b.text));
                    }
                    break;
                }
                case "fx": await playFx(p); break;
                case "banner": Sound.bonus(); await api.banner(p.text, p.ms || 1500, p.cls || "bonus"); break;
                case "mode": if (p.add) cabinet.classList.add(p.add); if (p.remove) cabinet.classList.remove(p.remove); break;
                case "hud": hud.textContent = p.text || ""; hud.classList.toggle("on", !!p.text); break;
                case "meter": api.meter(p.key, p.value, p.max); break;
                case "rows": setRows(p.n); if (p.n <= (cfg.rows || 3)) api.reelsBox.querySelectorAll(".sp-held").forEach(e => e.classList.remove("sp-held")); break;
                case "wheel": await api.wheelSpin(p.seg, p.idx, s => s, p.title); break;
                case "pick": await api.playPick(p.f, { revealOnly: true }); break;
                case "critic": await add(await critic(p), "⭐ FOOD CRITIC"); break;
                case "offer": {
                    offerTaken = await offer(p);
                    if (!offerTaken.jp) await add(offerTaken.v, `🎁 TOP OFFER ${offerTaken.k}`);
                    break;
                }
                case "laser": await laser(p); break;
                case "pickn": await pickN(p); break;
                case "tap": await tapGame(p); break;
                case "ball": await ballRun(p); break;
                case "mega": {
                    const box = h("div.sk-mega", { style: { "--c0": p.cols[0], "--cn": p.cols.length, "--cols": cfg.reels || 5 } }, h("span", cfg.syms[p.sym]?.e || "🛡️"));
                    api.reelsBox.append(box); Sound.boom?.(); api.shake(frame);
                    await pace(900); box.remove();
                    break;
                }
                case "ladder": await ladder(p); break;
                case "plinko": await plinko(p); break;
                case "claw": await claw(p); break;
                case "focus": {
                    // spotlight the cell(s) a bonus is coming from
                    api.reelsBox.querySelectorAll(".sp-focus").forEach(e => e.classList.remove("sp-focus"));
                    for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("sp-focus");
                    Sound.tick(); await pace(p.ms || 650);
                    break;
                }
                case "bingoline": await bingoLine(p); break;
                case "panel": api.meter(p.key, p.value, p.hl); await pace(p.hl ? 700 : 250); break;
                case "tease": msgEl.innerHTML = `<span class="tease">아깝다!! 😱</span>`; break;
                // ---- round 8
                case "choose": { const k = await choose(p); for (const q of p.branches[k] || []) await step(q, -1); break; }
                case "block": await bullion(p); break;
                case "nudge": {
                    const reel = api.reelsBox.children[p.col];
                    reel?.classList.remove("rl-nudge-d", "rl-nudge-u"); void reel?.offsetWidth;
                    reel?.classList.add(p.dir > 0 ? "rl-nudge-d" : "rl-nudge-u");
                    api.setReel(p.col, p.grid[p.col]);
                    Sound.stop(); await pace(450);
                    reel?.classList.remove("rl-nudge-d", "rl-nudge-u");
                    break;
                }
            }
    }
    try {
        for (let i = 0; i < res.phases.length; i++) await step(res.phases[i], i);
    } finally {
        hud.remove();
        setRows(cfg.rows || 3);
        api.reelsBox.querySelectorAll(".sp-held,.sp-frozen,.sp-focus").forEach(e => e.classList.remove("sp-held", "sp-frozen", "sp-focus"));
    }
    return { total: Math.round(run), jpWins };

    // ------------------------------------------------------------ fx
    async function playFx(p) {
        if (p.name === "laser" || p.name === "lasers") {
            for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("sp-beam");
            Sound.coin(); await pace(300);
            return;
        }
        const d = FX[p.name] || { icon: "✨", text: "", snd: "bonus", cls: "gold" };
        if (p.grids?.length) {
            cabinet.classList.add("sp-rewinding");
            for (const g of p.grids) { api.showGrid(g); Sound.whoosh(); await pace(260); }
            cabinet.classList.remove("sp-rewinding");
        }
        const el = h("div.sp-fx.spfx-" + d.cls, h("div.spfx-icon", d.icon), d.text ? h("div.spfx-text", d.text) : null);
        if (p.col != null) { el.classList.add("at-col"); el.style.setProperty("--col", p.col); el.style.setProperty("--cols", cfg.reels || 5); }
        cabinet.append(el);
        Sound[d.snd]?.();
        if (d.shake) api.shake(frame);
        if (d.rewind) { cabinet.classList.add("sp-rewinding"); setTimeout(() => cabinet.classList.remove("sp-rewinding"), 800); }
        if (p.name === "goldbox") api.confetti(60, ["🎁", "🪙", "✨", "🎀"]);
        await pace(d.text ? 900 : 500);
        el.remove();
    }

    // ------------------------------------------------------------ round 7: spin covers, tap games, energy ball
    // the spin mechanic (clouds blown away, radar flyby, tile wave …) drawn over the landing reels
    function spinCover(kind) {
        const n = (cfg.reels || 5) * (cfg.rows || 3);
        const el = h("div.sk-cover.cv-" + kind, { style: { "--cols": cfg.reels || 5, "--rows": cfg.rows || 3 } }, ...(COVERS[kind]?.(n) || []));
        if (api.turbo()) el.classList.add("fast");
        frame.append(el);
        if (kind === "clouds" || kind === "radar") Sound.whoosh?.();
        if (kind === "rockets" || kind === "plunger" || kind === "elevator") Sound.boom?.();
        if (kind === "gate") setTimeout(() => Sound.boom?.(), 250);
        if (kind === "scythe" || kind === "doors" || kind === "pulse" || kind === "deal") Sound.whoosh?.();
        if (kind === "coin") { Sound.coin?.(); setTimeout(() => Sound.splash?.(), 350); }
        if (kind === "mugs" || kind === "lever" || kind === "pour") Sound.boom?.();
        if (kind === "email" || kind === "prism") Sound.tick?.();
        if (kind === "cube" || kind === "curtain" || kind === "ticker" || kind === "wand" || kind === "flashlight") Sound.whoosh?.();
        if (kind === "ignition" || kind === "shovel" || kind === "organ") Sound.boom?.();
        if (kind === "bell" || kind === "chime" || kind === "whistle") { Sound.tick?.(); setTimeout(() => Sound.tick?.(), 180); }
        return el;
    }
    // Reactor Overload style choice: two options, the timer takes the engine's `auto` pick
    async function choose(p) {
        const sec = 8 * (api.turbo() ? 0.6 : 1);
        const clock = h("b.tap-clock", sec.toFixed(1));
        let pick;
        const done = new Promise(r => pick = r);
        const btns = p.options.map(o => h("button.rl-opt.k-" + o.k, { onclick: () => pick(o.k) }, h("span", o.icon), h("b", o.label), h("small", o.sub)));
        overlay.append(h("div.tap-wrap.rl-choose", h("div.tap-head", p.title), h("div.rl-opts", btns), clock));
        Sound.bonus();
        const t0 = performance.now();
        const timer = setInterval(() => { const l = Math.max(0, sec - (performance.now() - t0) / 1000); clock.textContent = l.toFixed(1); if (l <= 0) pick(p.auto); }, 100);
        const k = await done;
        clearInterval(timer);
        btns.forEach((b, i) => b.classList.toggle("chosen", p.options[i].k === k));
        Sound.boom?.(); api.shake(frame);
        await pace(700);
        overlay.replaceChildren();
        return k;
    }
    // Heavy Metal Drop: a giant n×n gold block slams onto the molds
    async function bullion(p) {
        const a = cellsEl(p.c0, p.r0), b = cellsEl(p.c0 + p.n - 1, p.r0 + p.n - 1);
        if (!a || !b) return;
        const fr = frame.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const blk = h("div.rl-block" + (p.cls ? ".rl-" + p.cls : ""), { style: { left: ra.left - fr.left + "px", top: ra.top - fr.top + "px", width: rb.right - ra.left + "px", height: rb.bottom - ra.top + "px" } }, h("span", p.icon), h("b", p.text));
        frame.append(blk);
        await pace(420); Sound.boom?.(); api.shake(frame);
        await pace(700);
        blk.remove();
    }
    // Tap bonuses: the prizes were decided by the engine and are revealed in tap order;
    // whatever is left when the timer runs out is collected automatically.
    async function tapGame(p) {
        const items = p.items || [];
        let k = 0, done, timer = null;
        const finished = new Promise(r => done = r);
        const tally = h("div.tap-tally");
        const left = h("small.tap-left", `${items.length}개 남음`);
        const area = h("div.tap-area.tm-" + p.mode);
        const wrap = h("div.tap-wrap.tw-" + p.mode, h("div.tap-head", p.title), left, area, tally);
        overlay.append(wrap);
        Sound.bonus();
        const reveal = (el, auto = false) => {
            if (k >= items.length) return null;
            const it = items[k++];
            if (el) { el.classList.add("open", "tp-" + (it.cls || "ok")); const f = el.querySelector("b"); if (f) f.textContent = it.text; }
            tally.append(h("span.tp-chip.tp-" + (it.cls || "ok") + (auto ? ".auto" : ""), it.text));
            left.textContent = `${items.length - k}개 남음`;
            it.cls === "jp" ? Sound.bonus() : it.cls === "bad" ? (Sound.boom?.(), api.shake(frame)) : Sound.coin();
            if (k >= items.length) setTimeout(done, 700);
            return it;
        };
        const sec = (p.sec || (p.mode === "single" ? 4 : p.mode === "gauge" ? 6 : 9)) * (api.turbo() ? 0.6 : 1);
        if (p.up) area.classList.add("tm-up"); // bubbles float up instead of falling
        const clock = h("b.tap-clock", sec.toFixed(1));
        wrap.append(clock);
        const t0 = performance.now();
        timer = setInterval(() => { const l = Math.max(0, sec - (performance.now() - t0) / 1000); clock.textContent = l.toFixed(1); if (l <= 0) { clearInterval(timer); autoAll(); } }, 100);
        let autoAll = () => { while (k < items.length) reveal(null, true); };
        if (p.mode === "grid") {
            const tiles = items.map((_, i) => h("button.tap-tile", { style: { "--i": i } }, h("span", p.icon), h("b")));
            tiles.forEach(t => t.onclick = () => { if (!t.classList.contains("open")) reveal(t); });
            area.append(...tiles);
            autoAll = () => { for (const t of tiles) if (!t.classList.contains("open") && k < items.length) reveal(t, true); };
        } else if (p.mode === "fall") {
            // targets drop one by one; tap to catch, missed ones are swept up at the end
            let spawned = 0;
            const spawn = () => {
                if (spawned >= items.length || k >= items.length) return;
                spawned++;
                const t = h("button.tap-faller", { style: { "--x": 6 + Math.random() * 80 + "%", "--d": (2.2 + Math.random() * 0.8) + "s" } }, h("span", p.icon), h("b"));
                t.onclick = () => { if (!t.classList.contains("open")) { reveal(t); setTimeout(() => t.remove(), 600); } };
                t.addEventListener("animationend", () => { if (!t.classList.contains("open")) t.remove(); });
                area.append(t);
            };
            const iv = setInterval(() => { spawn(); if (spawned >= items.length) clearInterval(iv); }, Math.max(items.length > 16 ? 180 : 350, (sec * 1000 - 2600) / items.length));
            spawn();
        } else if (p.mode === "rapid" || p.mode === "boss") {
            const hp = h("i.tap-hp");
            const big = h("button.tap-big" + (p.mode === "boss" ? ".boss" : ""), h("span", p.icon), h("div.tap-hpbar", hp));
            big.onclick = () => {
                const it = reveal(null); if (!it) return;
                hp.style.width = (100 - k / items.length * 100) + "%";
                big.classList.remove("hit"); void big.offsetWidth; big.classList.add("hit");
                const pop = h("b.tap-pop", { style: { "--x": (Math.random() * 60 - 30) + "px" } }, it.text); area.append(pop); setTimeout(() => pop.remove(), 800);
            };
            area.append(big);
        } else if (p.mode === "single") {
            const t = h("button.tap-single", h("span", p.icon), h("b"));
            t.onclick = () => { if (!t.classList.contains("open")) { t.classList.add("go"); reveal(t); } };
            area.append(t);
            autoAll = () => { if (!t.classList.contains("open")) { t.classList.add("go"); reveal(t, true); } };
        } else if (p.mode === "gauge") {
            // tap-to-stop: the needle sweeps the gauge; a tap (or the timer) stops it on the engine's step
            const steps = p.steps.map((s, i) => h("span.gg-step", { style: { "--i": i } }, s));
            const needle = h("i.gg-needle"), rocket = h("b.gg-rocket", "🚀");
            area.append(h("div.gg-track", steps, needle), rocket);
            let stopped = false, pos = 0, dir = 1;
            const iv = setInterval(() => { if (stopped) return; pos += dir * 0.06; if (pos > 1 || pos < 0) { dir *= -1; pos = Math.max(0, Math.min(1, pos)); } needle.style.left = pos * 100 + "%"; }, 30);
            const stop = async auto => {
                if (stopped) return; stopped = true; clearInterval(iv); area.onclick = null;
                const target = (p.stop + 0.5) / p.steps.length;
                needle.style.transition = "left .7s cubic-bezier(.2,.8,.3,1)"; needle.style.left = target * 100 + "%";
                await sleep(800);
                steps[p.stop].classList.add("on");
                rocket.style.setProperty("--h", (20 + p.stop / (p.steps.length - 1) * 70) + "%"); rocket.classList.add("fly"); Sound.whoosh?.();
                await sleep(900);
                reveal(null, auto);
            };
            area.onclick = () => stop(false);
            autoAll = () => stop(true);
        } else if (p.mode === "race") {
            // tap-to-whip race against two rivals; the finish order was decided by the engine
            const lane = (e, me) => { const b = h("b.rc-cart" + (me ? ".me" : ""), e); return { el: h("div.rc-lane" + (me ? ".me" : ""), b), b }; };
            const L = [lane("🏇", true), lane("🐎"), lane("🐎")];
            const whip = h("button.btn.gold.big.rc-whip", "💥 채찍! (연타)");
            area.append(h("div.rc-track", L.map(x => x.el), h("i.rc-goal", "🏁")), whip);
            const finishPos = { 1: [100, 92, 85], 2: [93, 100, 84], 3: [84, 100, 92] }[p.place];
            let pct = [0, 0, 0], taps = 0, over = false;
            whip.onclick = () => { taps++; Sound.click?.(); L[0].b.classList.remove("whip"); void L[0].b.offsetWidth; L[0].b.classList.add("whip"); };
            const dur = 4200 * (api.turbo() ? 0.6 : 1), tStart = performance.now();
            await new Promise(res => {
                const step = () => {
                    const f = Math.min(1, (performance.now() - tStart) / dur);
                    pct = finishPos.map((fp, i) => fp * f + (i === 0 && f < 1 ? Math.min(6, taps * 0.4) * Math.sin(f * Math.PI) : 0) + (i && f < 1 ? Math.sin(f * 9 + i) * 2 : 0));
                    L.forEach((x, i) => x.b.style.left = Math.min(100, pct[i]) * 0.86 + "%");
                    if (f < 1) requestAnimationFrame(step); else res();
                };
                requestAnimationFrame(step);
            });
            over = true; whip.remove(); clearInterval(timer);
            reveal(null, false);
        }
        await finished;
        clearInterval(timer);
        await pace(500);
        overlay.replaceChildren();
    }
    // Chain Reaction: the energy ball bounces from tile to tile and lights them (combo meter on the side)
    async function ballRun(p) {
        if (!p.keep) api.reelsBox.querySelectorAll(".sk-lit").forEach(e => e.classList.remove("sk-lit"));
        const meter = h("div.sk-combo", "COMBO x1");
        if (p.combo) frame.append(meter);
        await Promise.all(p.paths.map(async (path, b) => {
            const ball = h("b.sk-ball", "⚪");
            frame.append(ball);
            for (let i = 0; i < path.length; i++) {
                const [c, r] = path[i], el = cellsEl(c, r);
                if (!el) continue;
                const fr = frame.getBoundingClientRect(), er = el.getBoundingClientRect();
                ball.style.left = (er.left - fr.left + er.width / 2) + "px"; ball.style.top = (er.top - fr.top + er.height / 2) + "px";
                await pace(170);
                el.classList.add("sk-lit"); Sound.tick();
                if (p.combo && !b) { const m = p.combo[i]; meter.textContent = `COMBO x${m}`; meter.className = "sk-combo m" + m; if (m > 1) Sound.coin(); }
            }
            ball.remove();
        }));
        await pace(400);
        meter.remove();
    }

    // ------------------------------------------------------------ Food Critic boss battle
    // The critic shouts an order; tap the matching dish before the 10 s run out.
    async function critic(p) {
        const dishes = Object.entries(cfg.syms).filter(([, d]) => !d.raw).map(([k, d]) => ({ k, e: d.e, name: d.name }));
        const orders = p.orders.map((v, i) => ({ v, dish: dishes[(i * 7 + Math.floor(Math.random() * 9)) % dishes.length] }));
        let served = 0, idx = 0, sum = 0;
        const ask = h("div.critic-ask"), timeEl = h("b.critic-time", "10.0"), servedEl = h("div.critic-served");
        const btns = h("div.critic-btns", dishes.map(d => h("button.critic-dish", { onclick: () => tap(d.k) }, h("span", d.e), h("small", d.name))));
        overlay.append(h("div.critic-wrap", h("div.critic-boss", "🧐"), h("div.critic-head", "FOOD CRITIC — 주문한 요리를 탭!"), ask, timeEl, btns, servedEl));
        const show = () => { const o = orders[idx]; ask.replaceChildren(o ? h("span", `"${o.dish.e} ${o.dish.name} 주세요!"`) : h("span", "배불러…")); };
        let done;
        const finished = new Promise(r => done = r);
        function tap(k) {
            const o = orders[idx]; if (!o) return;
            if (k === o.dish.k) { served++; sum += o.v; idx++; Sound.coin(); servedEl.append(h("span", o.dish.e)); if (idx >= orders.length) done(); else show(); }
            else { Sound.stop(); ask.classList.remove("wrong"); void ask.offsetWidth; ask.classList.add("wrong"); }
        }
        show();
        const t0 = performance.now();
        const timer = setInterval(() => { const left = Math.max(0, 10 - (performance.now() - t0) / 1000); timeEl.textContent = left.toFixed(1); if (left <= 0) done(); }, 100);
        await finished; clearInterval(timer);
        const stars = served >= 10 ? 3 : served >= 6 ? 2 : 1;
        if (!served) sum = orders[0].v; // the critic at least tastes one dish
        overlay.replaceChildren();
        await api.banner(`${"⭐".repeat(stars)} ${served}접시 서빙! 팁 x${stars}`, 1500, "jackpot");
        return Math.round(sum * stars);
    }

    // ------------------------------------------------------------ Gift Top Offer (deal or no deal)
    async function offer(p) {
        const box = h("div.offer-box");
        const wrap = h("div.offer-wrap", h("div.offer-head", "🎁 TOP OFFER — 받을까, 다음 상자를 열까?"), box);
        overlay.append(wrap);
        const label = o => o.jp ? `${o.k} JACKPOT` : `${o.k} = ${fmt(o.v)} G`;
        let taken = null;
        for (let i = 0; i < p.offers.length && !taken; i++) {
            const o = p.offers[i];
            const last = i === p.offers.length - 1;
            box.replaceChildren(h("div.offer-gift.pop", "🎁"), h("div.offer-val" + (o.jp ? ".jp" : ""), label(o)), h("small", `${i + 1} / ${p.offers.length}${last ? " · 마지막 상자!" : ""}`));
            Sound.bonus();
            if (last) { await pace(900); taken = o; break; }
            const take = h("button.btn.gold.big", "받기 (DEAL)"), next = h("button.btn.ghost.big", "다음 상자 ▶");
            box.append(h("div.offer-btns", take, next));
            const auto = o.v >= 10 * bet; // the auto choice mirrors the engine's assumption
            const ans = await Promise.race([new Promise(r => { take.onclick = () => r(true); next.onclick = () => r(false); }), sleep(9000).then(() => auto)]);
            if (ans) taken = o;
        }
        overlay.replaceChildren();
        Sound.cash();
        return taken;
    }

    // ------------------------------------------------------------ pick N of M (cards / flasks / cups)
    // The engine already decided the prizes; they are revealed in the order the player taps.
    async function pickN(p) {
        const grid = h("div.pickn-grid" + (p.panelCards ? ".cards" : ""));
        const left = h("small.pickn-left", `남은 선택 ${p.k}`);
        overlay.append(h("div.pickn-wrap", h("div.pickn-head", p.title), left, grid));
        let k = 0;
        const tiles = [];
        await new Promise(done => {
            for (let i = 0; i < p.n; i++) {
                const t = h("button.pn-tile", { style: { "--i": i } }, h("span.pn-back", p.icon || "❓"), h("b.pn-face"));
                t.onclick = async () => {
                    if (t.classList.contains("open") || k >= p.k) return;
                    const r = p.reveals[k++];
                    t.classList.add("open", "pn-" + (r.cls || "ok"));
                    t.querySelector(".pn-face").textContent = r.text;
                    left.textContent = `남은 선택 ${p.k - k}`;
                    r.cls === "bad" ? (Sound.boom?.(), api.shake(frame)) : r.cls === "jp" ? Sound.bonus() : Sound.coin();
                    if (k >= p.k) { await sleep(600); done(); }
                };
                tiles.push(t); grid.append(t);
            }
            (async () => { while (k < p.k) { await sleep(9000); if (k < p.k) tiles.find(x => !x.classList.contains("open"))?.click(); await sleep(700); } })();
        });
        // show what the other cards were
        let j = 0;
        for (const t of tiles.filter(x => !x.classList.contains("open"))) { t.classList.add("open", "pn-rest"); t.querySelector(".pn-face").textContent = p.rest?.[j++]?.text || ""; }
        await pace(p.rest ? 1300 : 500);
        overlay.replaceChildren();
    }

    // ------------------------------------------------------------ ladder (safe dial, nebula rings, pendulum…)
    async function ladder(p) {
        const steps = p.steps.map((s, i) => h("div.ld-step", { style: { "--i": i } }, h("span", p.icon || "⭐"), h("b", s)));
        const wrap = h("div.ladder-wrap", h("div.ladder-head", p.title), h("div.ladder", ...[...steps].reverse()));
        overlay.append(wrap);
        Sound.bonus();
        await pace(500);
        for (let i = 0; i <= p.reached; i++) { steps[i].classList.add("on"); Sound.coin(); await pace(i === p.reached ? 700 : 420); }
        steps[p.reached]?.classList.add("final");
        Sound.bonus();
        await pace(900);
        overlay.replaceChildren();
    }

    // ------------------------------------------------------------ Plinko tree (Pay Day)
    async function plinko(p) {
        const W = 9, ROWS = p.rows;
        const board = h("div.plk-board", { style: { "--rows": ROWS + 1 } });
        const pegs = [];
        for (let r = 0; r <= ROWS; r++) {
            const row = h("div.plk-row", { style: { "--n": r + 1 } });
            for (let c = 0; c <= r; c++) {
                const bp = p.bumps.find(b => b.row === r && b.col === c);
                const el = h("i.plk-peg" + (bp ? ".bump" + (bp.label.startsWith("x") ? ".mult" : ".jp") : ""), bp ? bp.label : "");
                row.append(el); pegs.push({ r, c, el });
            }
            board.append(row);
        }
        const slots = h("div.plk-slots", p.bottom.map(b => h("span", b)));
        const tally = h("div.plk-tally");
        overlay.append(h("div.plk-wrap", h("div.plk-head", p.title + " · 구슬 3개"), board, slots, tally));
        for (const [i, b] of p.balls.entries()) {
            const go = h("button.btn.gold", `${p.glyph} 구슬 ${i + 1} 떨어뜨리기`);
            tally.append(go);
            await Promise.race([new Promise(r => go.onclick = r), sleep(5000)]);
            go.remove();
            const ball = h("b.plk-ball", p.glyph);
            board.append(ball);
            let stopPeg = null;
            for (let r = 0; r < b.path.length; r++) {
                const peg = pegs.find(x => x.r === r && x.c === b.path[r]);
                if (!peg) continue;
                const box = board.getBoundingClientRect(), pb = peg.el.getBoundingClientRect();
                ball.style.left = (pb.left - box.left + pb.width / 2) + "px"; ball.style.top = (pb.top - box.top + pb.height / 2) + "px";
                const bp = p.bumps.find(x => x.row === r && x.col === b.path[r]);
                if (bp && b.stop) { stopPeg = peg.el; await pace(260); break; }
                Sound.tick();
                await pace(260);
            }
            let res;
            if (b.stop) {
                // the ball sticks to the bumper and cashes it in on the spot
                stopPeg.classList.remove("hit"); void stopPeg.offsetWidth; stopPeg.classList.add("hit", "won");
                ball.classList.add("stuck"); ball.textContent = b.tier ? `${p.glyph} ${b.tier}!` : `${p.glyph} ${b.stop}!`;
                b.tier ? Sound.bonus() : Sound.cash();
                api.shake?.(frame);
                res = b.tier ? `${p.glyph} ${i + 1}: 💥 JACK 범퍼 즉시 당첨 → ${b.tier} JACKPOT! ${fmt(b.amount || 0)} G` : `${p.glyph} ${i + 1}: 💥 ${b.stop} 범퍼 즉시 당첨 → ${fmt(b.value)} G`;
            } else {
                slots.children[b.slot]?.classList.add("hit");
                Sound.coin();
                res = `${p.glyph} ${i + 1}: ${p.bottom[b.slot]} = ${fmt(b.value)} G`;
            }
            tally.append(h("div.plk-res" + (b.stop ? ".big" : ""), res));
            await pace(b.stop ? 1200 : 700);
            ball.remove(); slots.children[b.slot]?.classList.remove("hit"); stopPeg?.classList.remove("won");
        }
        await pace(900);
        overlay.replaceChildren();
    }

    // ------------------------------------------------------------ Vampire Bingo: one called line, its bonus coins fire one by one
    async function bingoLine(p) {
        const ICON = { cash: "🪙", bat: "🦇", wheel: "🎡", fang: "🦷" };
        const toks = p.coins.map((c, i) => h("div.bl-tok.k-" + c.k, { style: { "--i": i } }, h("span", ICON[c.k]), h("b", c.v ? fmt(c.v) : c.k === "fang" ? "?" : "")));
        const tally = h("div.bl-tally", "0");
        const note = h("div.bl-note", "");
        const row = h("div.bl-row", toks);
        overlay.append(h("div.bl-wrap", h("div.bl-head", `🧛 ${p.label}! 🧛`), row, note, tally));
        Sound.bonus();
        await pace(700);
        let run = 0;
        // 1) cash coins count up
        for (const [i, c] of p.coins.entries()) {
            if (!c.v) continue;
            toks[i].classList.add("pop"); run += c.v; tally.textContent = fmt(run) + " G"; Sound.coin();
            await pace(260);
        }
        // 2) the bat swallows every coin on the line in one go
        if (p.bat >= 0) {
            note.textContent = "🦇 BAT SWARM! 줄의 코인이 박쥐에게 모인다!";
            Sound.whoosh?.();
            const bt = toks[p.bat], br = bt.getBoundingClientRect();
            for (const [i, t] of toks.entries()) {
                if (i === p.bat || !p.coins[i].v) continue;
                const r = t.getBoundingClientRect();
                t.style.setProperty("--dx", (br.left - r.left) + "px");
                t.classList.add("fly");
            }
            await pace(700);
            bt.classList.add("merged"); bt.querySelector("b").textContent = fmt(p.sum);
            Sound.cash(); api.shake?.(frame);
            await pace(900);
        }
        // 3) wheels pop out and multiply the line
        for (const w of p.wheels) {
            toks[w.at].classList.add("pop");
            note.textContent = "🎡 VAMPIRE WHEEL!";
            await api.wheelSpin(p.seg, w.idx, s => s, "🧛 VAMPIRE WHEEL 🧛");
            run = Math.round((run || p.sum) * w.x);
            toks[w.at].querySelector("b").textContent = "x" + w.x;
            tally.textContent = `${fmt(run)} G`; tally.classList.remove("boost"); void tally.offsetWidth; tally.classList.add("boost");
            Sound.bonus();
            await pace(700);
        }
        tally.textContent = fmt(p.total) + " G";
        // 4) fang coins keep flipping, slowing down, until a jackpot shows
        for (const fg of p.fangs) {
            const t = toks[fg.at], face = t.querySelector("b");
            note.textContent = "🦷 FANG COIN… 무슨 잭팟일까?";
            t.classList.add("flipping");
            const seq = ["MINI", "MINOR", "MAJOR", "MINI", "MAJOR", "MINOR", "GRAND", "MINI", "MINOR", "MAJOR"];
            let d = 70;
            for (let k = 0; k < 22; k++) { face.textContent = seq[k % seq.length]; Sound.tick(); await sleep(d); d *= 1.13; }
            face.textContent = fg.tier;
            t.classList.remove("flipping"); t.classList.add("landed");
            note.textContent = `🦷 ${fg.tier} JACKPOT · ${fmt(fg.amount)} G!`;
            Sound.bonus(); api.shake?.(frame);
            await pace(1100);
        }
        await pace(600);
        overlay.replaceChildren();
    }

    // ------------------------------------------------------------ claw machine (Coin Claw)
    async function claw(p) {
        const LABEL = { free: "FREE SPIN", wheel: "🎡 WHEEL", mystery: "❓", jackpot: "💰 JACKPOT" };
        const balls = h("div.claw-balls", p.balls.map((b, i) => h("i.claw-ball", { style: { "--i": i } }, "❓")));
        const arm = h("div.claw-arm", h("span", "🦾"));
        const btn = h("button.btn.gold.big", "🕹️ 집게 내리기!");
        const res = h("div.claw-res");
        overlay.append(h("div.claw-wrap", h("div.claw-head", p.title || "🦾 CLAW MACHINE · 버튼을 눌러 공을 뽑아라!"), h("div.claw-box", arm, balls), btn, res));
        await Promise.race([new Promise(r => btn.onclick = r), sleep(7000)]);
        btn.remove();
        const target = balls.children[Math.floor(Math.random() * balls.children.length)];
        arm.style.setProperty("--x", target.offsetLeft + target.offsetWidth / 2 + "px");
        arm.classList.add("down"); Sound.whoosh();
        await pace(900);
        target.classList.add("grabbed"); target.replaceChildren(h("small", LABEL[p.pick] || p.pick), p.prize ? h("b", p.prize) : "");
        arm.classList.remove("down"); arm.classList.add("up"); Sound.bonus();
        await pace(800);
        res.textContent = `🎉 ${LABEL[p.pick] || p.pick} 공!${p.prize ? " → " + p.prize : ""}`;
        await pace(1100);
        overlay.replaceChildren();
        api.reelsBox.querySelectorAll(".sp-focus").forEach(e => e.classList.remove("sp-focus"));
    }

    // ------------------------------------------------------------ Laser Grid Breach (pick until an alarm)
    async function laser(p) {
        const grid = h("div.laser-grid");
        const tally = h("div.laser-tally", "x0");
        overlay.append(h("div.laser-wrap", h("div.laser-head", "📘 레이저 노드를 해킹하라! 🚨 경보 = 종료 · 모든 안전 노드 = TIME VAULT"), tally, grid));
        let k = 0, mult = 0;
        await new Promise(done => {
            for (let i = 0; i < p.nodes; i++) {
                const n = h("button.lnode", "🔴");
                n.onclick = async () => {
                    if (n.classList.contains("open") || k >= p.picks.length) return;
                    const pk = p.picks[k++];
                    n.classList.add("open");
                    if (pk.alarm) { n.classList.add("alarm"); n.textContent = "🚨"; Sound.boom?.(); api.shake(frame); }
                    else if (pk.jp) { n.classList.add("jp"); n.textContent = pk.jp; Sound.bonus(); }
                    else { mult += pk.m; n.textContent = "x" + pk.m; Sound.coin(); tally.textContent = "x" + mult; }
                    if (k >= p.picks.length) { await sleep(700); done(); }
                };
                grid.append(n);
            }
            (async () => { while (k < p.picks.length) { await sleep(8000); if (k < p.picks.length) [...grid.children].find(x => !x.classList.contains("open"))?.click(); await sleep(600); } })();
        });
        [...grid.children].filter(x => !x.classList.contains("open")).forEach(x => x.classList.add("dim"));
        await pace(600);
        overlay.replaceChildren();
    }
}

// ---------------------------------------------------------------- top panels
// Built once per cabinet; `set(key, value, max)` updates them in place.
export function buildPanel(cfg, state = {}) {
    const E = cfg.engine;
    const el = h("div.sp-panel.spp-" + E.slice(3));
    const parts = {};
    const bar = (key, label, cls = "") => {
        const fill = h("i"), v = h("small");
        const b = h("div.spp-bar" + (cls ? "." + cls : ""), h("b", label), h("div.spp-track", fill), v);
        parts[key] = { b, fill, v };
        return b;
    };
    if (E === "sp_kitchen") el.append(h("span.spp-ico", "🦖"), bar("titan", "HUNGRY TITAN", "titan"));
    else if (E === "sp_pillars") {
        const names = { E1: "木", E2: "火", E3: "土", E4: "金", E5: "水" };
        el.append(h("span.spp-ico", "☯️"), ...Object.keys(names).map(k => bar(k, names[k], "el-" + k)));
    } else if (E === "sp_gift") {
        const gold = h("div.gift-gold", "❓");
        parts.heat = { gold };
        el.append(h("div.gift-row", Array.from({ length: 9 }, (_, i) => h("div.gift-box.g" + (i % 5), "🎁")), gold));
    } else if (E === "sp_orb") el.append(h("div.sp-aura", h("span.sun", "☀️"), h("span.vs", "SOL · UMBRA"), h("span.moon", "🌙")));
    else if (E === "sp_pod") el.append(h("div.sp-aura", h("span.hw", "🐹"), h("span.vs", "MEGA HAMSTER = 모든 잭팟 합계"), h("span.hw r", "🐹")));
    else if (E === "sp_heist") el.append(h("div.sp-aura", h("span.dial", "🔐"), h("span.vs", "TIME VAULT · 레이저를 모두 해제하라"), h("span.dial r", "⏱️")));
    else if (E === "sp_dj") el.append(h("div.sp-aura", h("span.disc", "💿"), h("span.vs", "DJ CRYPTO LIVE"), h("span.disc r", "💿")));
    // ---- the 15 theme machines
    const aura = (l, text, r = l) => el.append(h("div.sp-aura", h("span.aura-l", l), h("span.vs", text), h("span.aura-r", r)));
    const custom = (k, render) => { parts[k] = { render }; };
    if (E === "sp_clockwork") el.append(h("div.tp-gears", h("i.g1", "⚙️"), h("i.g2", "⚙️"), h("i.g3", "⚙️"), h("b", "THE CLOCKWORK VAULT"), h("i.g4", "🔒")));
    else if (E === "sp_alchemist") el.append(h("span.spp-ico", "⚗️"), bar("tube", "💧 DISTILLER", "tube"));
    else if (E === "sp_astral") aura("🌌", "STARLIGHT SYNDICATE · 별 4개 이상 = 별자리", "🔭");
    else if (E === "sp_neon") el.append(h("span.spp-ico.sparky", "🤖"), bar("battery", "🔋 SPARKY BATTERY", "battery"));
    else if (E === "sp_popcorn") {
        el.append(h("span.spp-ico", "🍿"), bar("red", "🔴 FREE GAMES", "red"), bar("blue", "🔵 MULTIPLIER", "blue"), bar("gold", "🟡 WILD REELS", "gold"));
        parts.red.fmt = v => `${v}회`; parts.blue.fmt = v => `x${v}`; parts.gold.fmt = v => `${Math.min(4, 1 + Math.floor(v / 5))}릴`;
    }
    else if (E === "sp_ouija") aura("🕯️", "MIDNIGHT OUIJA · 25 LINES", "🕯️");
    else if (E === "sp_tower") el.append(h("div.tp-guillotine", h("i.blade", "🔪"), h("b", "TOWER OF TERROR · 가운데 한 줄"), h("i.moon", "🌩️")));
    else if (E === "sp_bog") aura("🫧", "THE BOG · 늪의 마녀가 지켜본다", "🧙‍♀️");
    else if (E === "sp_cyberdial") el.append(h("div.tp-lcd", h("b", "CYBER-DIAL 2000"), h("span.lcd-blink", "▮ READY TO DIAL")));
    else if (E === "sp_sundrum") aura("☀️", "SUN-DRUM LEGACY · 3 RINGS", "🥁");
    else if (E === "sp_strikes") {
        const pins = h("div.lane-pins", Array.from({ length: 10 }, (_, i) => h("i", { style: { "--i": i } }, "🎳")));
        const marks = h("div.lane-strikes", h("small", "STRIKE"), [0, 1, 2].map(i => h("b", "✕")));
        el.append(h("div.tp-lane", h("div.lane-floor", pins), marks));
        custom("pins", v => { [...pins.children].forEach((p, i) => p.classList.toggle("on", i < v)); pins.classList.toggle("full", v >= 10); });
        custom("strikes", v => [...marks.querySelectorAll("b")].forEach((b, i) => b.classList.toggle("on", i < v)));
    } else if (E === "sp_vampire") {
        const cells = Array.from({ length: 25 }, () => h("i.bg-cell"));
        const vamp = h("span.bg-vamp", "🧛");
        el.append(h("div.tp-bingo", h("div.bg-head", "B I N G O"), h("div.bg-grid", cells), vamp));
        const ICON = { fang: "🦷", bat: "🦇", wheel: "🎡" };
        custom("bingo", (arr, hl) => {
            cells.forEach((c, i) => { const x = arr?.[i]; c.className = "bg-cell" + (x ? " on k-" + x.k : "") + (hl?.includes(i) ? " hl" : ""); c.textContent = !x ? "" : x.k === "cash" ? (x.v >= 1e4 ? Math.round(x.v / 1000) + "K" : x.v) : ICON[x.k]; });
            vamp.classList.remove("peek"); void vamp.offsetWidth; vamp.classList.add("peek");
        });
    } else if (E === "sp_payday") {
        const env = (g, k) => { const fill = h("i.env-fill"); const e = h("div.env", h("b", g), fill); custom(k, v => { fill.style.height = Math.min(100, v) + "%"; e.classList.toggle("full", v >= 100); }); return e; };
        el.append(h("div.tp-envs", env("福", "fu"), h("span.vs", "PAY DAY 💸"), env("到", "dao")));
    } else if (E === "sp_jokers") el.append(h("div.tp-cards", Array.from({ length: 5 }, (_, i) => h("i.tcard", { style: { "--i": i } }, "🂠"))));
    else if (E === "sp_cathedral") aura("🔔", "CATHEDRAL OF WINGS · 24 SHARDS", "🕊️");
    else if (E === "sp_velvet") aura("🎩", "THE VELVET TABLE · VIP VAULT", "💎");
    else if (E === "sp_astro") aura("🛸", "ASTRO-DINER 5099 · 20 WINDOWS", "🍔");
    else if (E === "sp_lilypad") aura("🐸", "LILYPAD LEAP · 19 PADS", "🪷");
    else if (E === "sp_gridlock") aura("🚦", "GRIDLOCK RUSH HOUR · 4-WAY", "🚕");
    else if (E === "sp_helm") {
        // two ships rocking on a rainy sea; each sail rises with every ⛵ thrown at it
        const ship = (label, k) => {
            const sail = h("i.hl-sail"), s = h("div.hl-ship.k-" + k, h("div.hl-mast", sail), h("div.hl-hull", h("b", label)));
            custom(k, (v, max) => { const f = Math.max(0, Math.min(1, v / (max || 10))); sail.style.setProperty("--f", f.toFixed(2)); s.classList.toggle("near", f >= 0.7 && f < 1); s.classList.toggle("full", f >= 1); });
            return s;
        };
        el.append(h("div.tp-sea", h("div.hl-rain"), ship("GROW REELS", "sailR"), ship("GROW CASH", "sailC"),
            h("div.hl-waves"), ...["🐟", "🐠", "🐡"].map((f, i) => h("i.hl-fish", { style: { "--i": i } }, f))));
    }
    else if (E === "sp_bricks") aura("🏗️", "SMASH THE BRICKS · 2x2 판을 드러내라!", "🔨");
    else if (E === "sp_classic") aura("7️⃣", "CLASSIC MANIA · 3 LINES", "🍒");
    else if (E === "sp_mimic") aura("🔥", "THE MIMIC'S LABYRINTH · 25 PLATES", "🔥");
    else if (E === "sp_abyss") aura("📡", "DEPTH 10,994 m · SONAR ONLINE", "🐙");
    else if (E === "sp_glacier") aura("🔨", "GLACIER FRACTURE · 18 FLOES", "🦣");
    else if (E === "sp_quantum") aura("🐈‍⬛", "|ψ⟩ = α|WIN⟩ + β|LOSE⟩", "⚛️");
    else if (E === "sp_kindness") aura("🏮", "KINDNESS · SOUP KITCHEN & SANCTUARY", "🥣");
    else if (E === "sp_coinclaw") el.append(h("div.tp-claw", h("span.tc-arm", "🦾"), h("div.tc-balls", ["❓", "🎡", "FREE", "💰", "❓", "🎡", "FREE", "❓"].map((b, i) => h("i", { style: { "--i": i } }, b))), h("span.tc-spark", "✨")));
    // ---- the 11 round-7 machines (skyEngine.js)
    else if (E === "sp_cumulus") el.append(h("div.sk-strip.sk-clouds", h("i.sk-ship", "🛩️"), h("b", cfg.jpNote || "CUMULUS CASH"), h("i.sk-bolt", "🌩️")));
    else if (E === "sp_aero") el.append(h("div.sk-strip.sk-tow", h("div.sk-plane", h("span", "🛩️"), h("i.sk-rope"), h("b.sk-banner", "AERO-ACE · 5 SKY LANES · 243 WAYS"))));
    else if (E === "sp_crossing") aura("🏔️", "THE CROSSING · 왼쪽 절벽 → 오른쪽 절벽", "⛩️");
    else if (E === "sp_orbital") el.append(h("div.sk-strip.sk-pad", h("i", "🚀"), h("b", "T-MINUS · 버튼을 눌렀다 떼면 발사!"), h("i", "🌕")));
    else if (E === "sp_constellation") aura("🔭", "CONSTELLATION WEAVER · 별 4개 이상 = 별자리", "🌌");
    else if (E === "sp_tide") aura("☄️", "COSMIC TIDE = 모든 잭팟 동시 지급!", "🪐");
    else if (E === "sp_koi") aura("🎏", "KOI IN THE CLOUDS · 81 WAYS", "🪷");
    else if (E === "sp_chain") el.append(h("span.spp-ico", "🏙️"), bar("batt", "🔋 TOWN BATTERY", "battery"));
    else if (E === "sp_arena") aura("🏛️", "GLADIATOR'S ARENA · 25 LINES", "⚔️");
    else if (E === "sp_quest") {
        const clock = h("b.sk-hour", `🕗 ${String(state.hour ?? 8).padStart(2, "0")}:00`);
        el.append(h("div.sk-strip.sk-town", h("i", "🏘️"), clock, h("span", "QUEST BOARD ❗"), h("i", "🐉")));
        custom("hour", v => { clock.textContent = `${["🕛", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚"][v % 12]} ${String(v).padStart(2, "0")}:00`; });
    } else if (E === "sp_climb") {
        const fl = h("b.sk-floor", `FLOOR ${state.floor || 1}`);
        el.append(h("div.sk-strip.sk-tower", h("i", "🏙️"), fl, h("span", "PENTHOUSE ▲"), h("i", "🛗")));
        custom("floor", v => { fl.textContent = `FLOOR ${v}`; });
    }
    // ---- the 10 round-8 machines (realmEngine.js)
    else if (E === "sp_death") el.append(h("span.spp-ico.rl-reaper", "💀"), bar("souls", "🏮 SOUL LANTERN · 10 = 유령의 파도", "souls"));
    else if (E === "sp_karma") el.append(h("div.sk-strip.rl-plaza", h("i.rl-bob", "🕊️"), h("b", "⛲ KARMA FOUNTAIN · 15 LILY PADS · 243 WAYS"), h("i.rl-bob", "🪷")));
    else if (E === "sp_tavern") el.append(h("div.sk-strip.rl-inn", h("i", "🛎️"), h("b", "IDLE TAVERN · 16 TABLES · 256 WAYS"), h("i.rl-bob", "🍺")));
    else if (E === "sp_office") el.append(h("div.sk-strip.rl-monitor", h("i", "🖥️"), h("b", "📥 Inbox (1) · RE: Q4 \"Totally Normal\" Report.xlsx"), h("i.rl-blink", "▮")));
    else if (E === "sp_retro") el.append(h("div.sk-strip.rl-skyline", ...["🏢", "🎰", "🏬", "🎰", "🏙️"].map((e, i) => h("i", { style: { "--i": i } }, e)), h("b", "RETRO REEL CITY · 25 LINES")));
    else if (E === "sp_polarity") {
        const red = h("i.rl-red"), lab = h("b", "10 : 10");
        el.append(h("div.rl-tug", h("span", "🔴"), h("div.rl-tugbar", red, h("i.rl-mid")), h("span", "🔵"), lab));
        custom("tug", v => { red.style.width = Math.max(5, Math.min(95, 50 + v * 2.5)) + "%"; const r = Math.round((20 + v) / 2); lab.textContent = `${r} : ${20 - r}`; });
    }
    else if (E === "sp_yacht") aura("🛥️", "YACHT CLUB ROYALE · 🪙 도장 = 다음 당첨 x3", "🍾");
    else if (E === "sp_vip") aura("🎫", "VIP PENTHOUSE STRIP · MEMBERS ONLY", "🕴️");
    else if (E === "sp_foundry") aura("🏭", "BULLION FOUNDRY · 12 MOLDS · 81 WAYS", "🔥");
    else if (E === "sp_prism") aura("🔺", "PRISM PALACE · HEX 4+ · DIAMOND = 모든 잭팟 합산", "👑");
    // ---- the 11 round-9 machines (wonderEngine.js)
    else if (E === "sp_cube") el.append(h("div.sk-strip.w9-escher", h("i.w9-spin", "🎲"), h("b", "CHAOS CUBE · ✚ 12 TILES · 64 WAYS"), h("i.w9-glitch", "⚠️")));
    else if (E === "sp_curio") aura("🧐", "CABINET OF CURIOSITIES · 15 DRAWERS · 243 WAYS", "🦆");
    else if (E === "sp_percent") {
        el.append(h("span.spp-ico.w9-bull", "📊"), bar("rtp", "📈 RTP METER · 연속 당첨 +1x", "rtp"));
        parts.rtp.fmt = (v, max) => `x${1 + Math.min(v, max)}`;
    }
    else if (E === "sp_festival") {
        el.append(h("span.spp-ico", "🕰️"), bar("parade", "🎺 STREET PARADE · WILD 행진", "parade"));
        parts.parade.fmt = v => v > 0 ? `${v}스핀` : "—";
    }
    else if (E === "sp_mission") el.append(h("div.sk-strip.w9-hud", h("i.w9-blink", "🛰️"), h("b", "MISSION CONTROL · T-MINUS · HEX 19"), h("i", "🛻")));
    else if (E === "sp_slide") el.append(h("div.sk-strip.w9-snow", ...["🐧", "🐧", "🐧"].map((e, i) => h("i.w9-slide", { style: { "--i": i } }, e)), h("b", "GLACIER SLIDE · 243 WAYS")));
    else if (E === "sp_pop") el.append(h("div.sk-strip.w9-reef", ...["🫧", "🐢", "🫧", "🐡", "🫧"].map((e, i) => h("i.w9-float", { style: { "--i": i } }, e)), h("b", "POP PARADISE · 256 WAYS")));
    else if (E === "sp_galleon") aura("🔦", "SUNKEN GALLEON · 25 LINES · 수심 300m", "🐙");
    else if (E === "sp_manor") aura("🕯️", "PHANTOM MANOR · 12 FRAMES · 🟢 점액 = 다음 당첨 x3", "👻");
    else if (E === "sp_boneyard") aura("🌕", "MIDNIGHT BONEYARD · 15 HEADSTONES", "🪦");
    else if (E === "sp_crimson") {
        const moon = h("span.w9-moon", "🌑");
        el.append(h("div.sk-strip.w9-gothic", h("i", "🦇"), h("b", "CRIMSON MOON · 1024 WAYS"), moon, h("i", "🦇")));
        custom("moon", v => { moon.textContent = v ? "🌕" : "🌑"; moon.classList.toggle("on", !!v); });
    }
    const set = (key, value, max) => {
        const p = parts[key]; if (!p) return;
        if (p.render) return p.render(value, max);
        const f = Math.max(0, Math.min(1, value / (max || 1)));
        if (p.gold) {
            p.gold.style.setProperty("--heat", f.toFixed(3));
            p.gold.classList.toggle("hot", f >= 0.5); p.gold.classList.toggle("bursting", f >= 0.8);
            return;
        }
        p.fill.style.width = f * 100 + "%";
        p.v.textContent = p.fmt ? p.fmt(value, max) : `${value}/${max}`;
        p.b.classList.toggle("full", f >= 1); p.b.classList.toggle("near", f >= 0.7 && f < 1);
        p.b.classList.remove("bump"); void p.b.offsetWidth; p.b.classList.add("bump");
    };
    // initial state
    if (E === "sp_kitchen") set("titan", state.titan || 0, cfg.titanMax || 25);
    if (E === "sp_pillars") for (const k of ["E1", "E2", "E3", "E4", "E5"]) set(k, state.yong?.[k] || 0, cfg.yong?.max || 8);
    if (E === "sp_gift") set("heat", state.heat || 0, 100);
    if (E === "sp_alchemist") set("tube", state.tube || 0, 12);
    if (E === "sp_neon") set("battery", state.battery || 0, 30);
    if (E === "sp_popcorn") { set("red", state.red ?? 8, 50); set("blue", state.blue ?? 2, 10); set("gold", state.gold || 0, 20); }
    if (E === "sp_strikes") { set("pins", state.pins ?? 1); set("strikes", state.strikes || 0); }
    if (E === "sp_vampire") set("bingo", state.board || []);
    if (E === "sp_payday") { set("fu", state.fu || 0, 100); set("dao", state.dao || 0, 100); }
    if (E === "sp_helm") { set("sailR", state.sailR || 0, 10); set("sailC", state.sailC || 0, 10); }
    if (E === "sp_chain") set("batt", state.batt || 0, 10);
    if (E === "sp_death") set("souls", state.souls || 0, cfg.souls || 10);
    if (E === "sp_polarity") set("tug", 0);
    if (E === "sp_percent") set("rtp", state.streak || 0, cfg.features?.compound?.max || 5);
    if (E === "sp_festival") set("parade", state.parade || 0, cfg.features?.parade?.spins || 3);
    return { el, set };
}
