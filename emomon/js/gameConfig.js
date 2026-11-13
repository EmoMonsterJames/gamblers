// =====================================================================
// GameConfig - numbers used by the browser side of the game.
// Numbers that must not be cheated (tickets, rewards, prices, EXP) live
// in the Supabase table `game_settings` and are applied by RPC functions.
// =====================================================================
const GameConfig = {

    MAX_WEAPONS: 6,
    MAX_MONSTERS: 3,                       // a player owns at most 3 monsters (admin skips it)
    FIXED_LEVEL: 50,                       // monsters have no levels: stats are always computed at this level
    PLAYER_MAX_HP: 100,
    BATTLE_ORDER_LABELS: ["1st", "2nd", "3rd", "4th", "5th"],
    BATTLE_TEAM_MAX: 2,
    TEAM_BATTLE_MAX: 2,                    // team battle monsters (players.teambattle_team); a paid 3rd for one team battle
    // slot machine makers: slot_games.brand = key, logo in images/slots/brands/<key>.svg
    SLOT_BRANDS: { "yg-gaming": "YG Gaming", "rabbit-gaming": "Rabbit Gaming", "clover-tech": "Clover Tech", "blk": "BLK",
                   "cloud-gaming": "Cloud Gaming", "scrooge-slots": "Scrooge Slots", "ipex": "IPEX", "daebak": "DAEBAK" },
    MAX_TYPES: 3,
    MAX_RARITY: 6,
    RARITY_NAMES: ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"],
    MAX_SLOTS: 100,

    // ---------------- battle ----------------
    MAX_TURNS: 50,                 // after this the battle is decided by remaining energy %
    BASE_CRIT: 10,                 // %
    CRIT_MULTIPLIER: 1.5,
    STAB: 1.2,                     // weapon attribute matches one of the attacker's types
    // damage = (weapon power x level scale + attack x ATTACK_WEIGHT) x attack/(attack+defense) x DAMAGE_K
    // level scale = 1 at Lv 1 .. 3 at Lv 100 (stats grow the same way), so battles last about as long at every level
    DAMAGE_K: 0.65,                // about 6 turns per battle at every level (smaller = longer battles)
    ATTACK_WEIGHT: 0.2,
    DAMAGE_RANDOM: [0.9, 1.1],
    EFFECTIVE_SPEED_BONUS: 0.1,    // +10% speed for the turn when the chosen weapon is effective
    REVIVE_HP_PERCENT: 100,        // REVIVE POTION brings the monster back with this % energy

    // default attack when a monster has no weapon with uses left. Attribute "Pure" is not in the type chart,
    // so it hits every attribute x1 (never 0 - a battle can't get stuck, e.g. Normal vs Ghost).
    // Power / accuracy depend on the monster: see GameConfig.basicAttack(level, rarity)
    BASIC_ATTACK: {
        id: "BASIC", name: "Basic Attack", attribute: "Pure", power: 10, phys_attack: 10, spec_attack: 0,
        accuracy: 85, priority: 0, effect_type: "none"
    },
    // what the Ouija trait swaps the opponent's weapons into (same as the do-nothing weapons in the weapons table)
    OUIJA_WEAPONS: [
        { id: "OUIJA_SPACE_OUT", name: "Space Out", attribute: "Space", power: 0, phys_attack: 0, spec_attack: 0,
          accuracy: 100, priority: 0, effect_type: "none", max_uses: 5 },
        { id: "OUIJA_NO_MOVE", name: "No Move", attribute: "Normal", power: 0, phys_attack: 0, spec_attack: 0,
          accuracy: 100, priority: 0, effect_type: "none", max_uses: 5 }
    ],
    DEFAULT_WEAPON_USES: 20,       // weapons.max_uses when not set
    NATURE_UP: 1.1,                // nature: +10% on one stat
    NATURE_DOWN: 0.9,              //         -10% on another

    // statuses left at the end of a battle become diseases (cured in the hospital)
    // and come back as statuses at the start of the next battle
    DISEASES: {
        // battle statuses: they end with the battle (nothing to cure afterwards).
        //   dot = loses VALUE energy every turn, skip = loses its actions, randomTurns = lasts 1..5 turns (random)
        poison:       { label: "Poison",       icon: "☠",  battleOnly: true, dot: true, effect: { kind: "poison", value: 5, ticks: 4 } },
        grass_poison: { label: "Grass Poison", icon: "🍃", battleOnly: true, dot: true, randomTurns: true, effect: { kind: "grass_poison", value: 2, ticks: 3 } },   // weak poison
        burn:         { label: "Burn",         icon: "🔥", battleOnly: true, dot: true, effect: { kind: "burn", value: 4, ticks: 3 } },
        minor_burn:   { label: "Minor Burn",   icon: "🌡", battleOnly: true, dot: true, randomTurns: true, effect: { kind: "minor_burn", value: 2, ticks: 3 } },  // weak burn
        sleep:        { label: "Sleep",        icon: "💤", battleOnly: true, skip: true, randomTurns: true, effect: { kind: "sleep", value: 0, ticks: 3 } },
        stun:         { label: "Stun",         icon: "💫", battleOnly: true, skip: true, effect: { kind: "stun", value: 0, ticks: 1 } },          // loses ONE action
        paralyze:     { label: "Paralyze",     icon: "⚡", battleOnly: true, skip: true, randomTurns: true, effect: { kind: "paralyze", value: 0, ticks: 3 } },
        freeze:       { label: "Freeze",       icon: "🧊", battleOnly: true, dot: true, randomTurns: true, effect: { kind: "freeze", value: 4, ticks: 3 } },
        frostbite:    { label: "Frostbite",    icon: "🥶", battleOnly: true, dot: true, effect: { kind: "frostbite", value: 5, ticks: 3 } },
        self_harm:    { label: "Self-Harm",    icon: "🩹", battleOnly: true, dot: true, randomTurns: true, effect: { kind: "self_harm", value: 5, ticks: 3 } },
        confused:     { label: "Confused",     icon: "😵", battleOnly: true, dot: true, randomTurns: true, effect: { kind: "confused", value: 2, ticks: 3 } },  // weak
        // lasting statuses: hurt every turn of every battle AND keep taking HOUR_PCT % of max energy per hour outside
        // battles (never below 1) until the hospital or their cure item heals them
        venom:         { label: "Venom",         icon: "🐍", lasting: true, dot: true, hourPct: 2, effect: { kind: "venom", value: 8, ticks: 999 } },
        schizophrenia: { label: "Schizophrenia", icon: "🌪", lasting: true, dot: true, hourPct: 3, effect: { kind: "schizophrenia", value: 10, ticks: 999 } },  // strong self-harm
        chilblains:    { label: "Chilblains",    icon: "🧤", lasting: true, dot: true, hourPct: 3, effect: { kind: "chilblains", value: 9, ticks: 999 } },     // strong frostbite
        severe_burn:   { label: "Severe Burn",   icon: "♨",  lasting: true, dot: true, hourPct: 2, effect: { kind: "severe_burn", value: 8, ticks: 999 } },
        // a cold has no effect inside a battle, but the monster can't battle until Cold Medicine cures it
        cold:     { label: "Cold",     icon: "🤧", effect: null, noBattle: true, hospitalCures: false, chronic: true },
        // long-lasting diseases (table disease_types; Disease Dex in the hospital). effect null = no status in battle;
        // their battle rules (halved stats, obesity, mental illness…) are applied by MonsterService / BattleEngine
        cancer:     { label: "Cancer",             icon: "🎗️", effect: null, noBattle: true, hospitalCures: false, chronic: true },
        scabies:    { label: "Scabies",            icon: "🐛", effect: null, noBattle: true, hospitalCures: false, chronic: true },
        rare_hp:    { label: "HP Rare Disease",    icon: "💔", effect: null, hospitalCures: false, chronic: true, halves: "maxHp" },
        rare_patk:  { label: "P.ATK Rare Disease", icon: "🗡️", effect: null, hospitalCures: false, chronic: true, halves: "physAttack" },
        rare_satk:  { label: "S.ATK Rare Disease", icon: "🔮", effect: null, hospitalCures: false, chronic: true, halves: "specAttack" },
        rare_pdef:  { label: "P.DEF Rare Disease", icon: "🛡️", effect: null, hospitalCures: false, chronic: true, halves: "physDefense" },
        rare_sdef:  { label: "S.DEF Rare Disease", icon: "🔰", effect: null, hospitalCures: false, chronic: true, halves: "specDefense" },
        rare_speed: { label: "Speed Rare Disease", icon: "🐢", effect: null, hospitalCures: false, chronic: true, halves: "speed" },
        mental:     { label: "Mental Illness",     icon: "🌀", effect: null, hospitalCures: false, chronic: true },
        obesity:    { label: "Obesity",            icon: "🍔", effect: null, hospitalCures: false, chronic: true },
        skinny:     { label: "Skinny Disease",     icon: "🦴", effect: null, hospitalCures: false, chronic: true },
        eyeblind:   { label: "Eyeblind",           icon: "🕶️", effect: null, hospitalCures: false, chronic: true },
        gambling:   { label: "Gambling Addiction", icon: "🎲", effect: null, hospitalCures: false, chronic: true },
        drug:       { label: "Drug Addiction",     icon: "💊", effect: null, hospitalCures: false, chronic: true }
    },
    // battle numbers of the long-lasting diseases
    MENTAL_SELF_HIT: 30,           // % of attack / status weapons a mentally ill monster uses on itself
    OBESITY_ACCURACY: 0.8,         // weapon accuracy x0.8
    EYEBLIND_ACCURACY: 0.5,        // weapon accuracy x0.5
    SCABIES_PARALYZE: 20,          // % per own turn while a monster of the same player has scabies
    CARE_LABELS: { mental: "🧠 Mental Hospital", diet: "🥗 Diet Center" },

    // ---------------- animation ----------------
    TURN_PAUSE_MS: 450,
    BATTLE_SPEEDS: { "0.25x": 0.25, "0.5x": 0.5, "1x": 1, "2x": 2, "4x": 4 }
};

// weapon effect types (admin dropdown + battle engine)
GameConfig.WEAPON_EFFECTS = {
    none:           { label: "None",                     target: "enemy", desc: "No extra effect" },
    poison:         { label: "Poison (damage over time)", target: "enemy", desc: "Enemy loses VALUE energy each turn for TURNS turns. Ends with the battle" },
    burn:           { label: "Burn (damage over time)",   target: "enemy", desc: "Enemy loses VALUE energy each turn for TURNS turns. Ends with the battle" },
    minor_burn:     { label: "Minor Burn (1-5 turns, weak)", target: "enemy", desc: "Enemy loses VALUE energy (small) each turn for 1 to 5 turns (random). Ends with the battle" },
    stun:           { label: "Stun (1 action)",           target: "enemy", desc: "Enemy loses its next action (one time)" },
    paralyze:       { label: "Paralyze (1-5 turns)",      target: "enemy", desc: "Enemy can't act for 1 to 5 of its actions (random). Ends with the battle" },
    sleep:          { label: "Sleep (1-5 turns)",         target: "enemy", desc: "Enemy sleeps for 1 to 5 of its actions (random). Ends with the battle" },
    self_harm:      { label: "Self-Harm (1-5 turns)",     target: "enemy", desc: "Enemy loses VALUE energy each turn for 1 to 5 turns (random). Ends with the battle" },
    confused:       { label: "Confused (1-5 turns, weak)", target: "enemy", desc: "Enemy loses VALUE energy (small) each turn for 1 to 5 turns (random). Ends with the battle" },
    frostbite:      { label: "Frostbite (damage over time)", target: "enemy", desc: "Enemy loses VALUE energy each turn for TURNS turns. Ends with the battle" },
    venom:          { label: "Venom (lasting)",           target: "enemy", desc: "Enemy loses VALUE energy every turn, also in later battles, and 2% of max energy per hour outside battles until the hospital or an Antidote cures it" },
    schizophrenia:  { label: "Schizophrenia (lasting)",   target: "enemy", desc: "Strong self-harm: VALUE energy every turn of every battle, 3% of max energy per hour outside battles until cured (hospital / Calm Pill)" },
    chilblains:     { label: "Chilblains (lasting)",      target: "enemy", desc: "Strong frostbite: VALUE energy every turn of every battle, 3% of max energy per hour outside battles until cured (hospital / Warming Balm)" },
    severe_burn:    { label: "Severe Burn (lasting)",     target: "enemy", desc: "VALUE energy every turn of every battle, 2% of max energy per hour outside battles until cured (hospital / Burn Cream)" },
    regen:          { label: "Regen (heal over time)",    target: "self",  desc: "User recovers VALUE energy at the end of each turn for TURNS turns" },
    heal:           { label: "Heal (instant)",            target: "self",  desc: "User recovers VALUE energy right away" },
    heal_pct:       { label: "Heal % (instant)",          target: "self",  desc: "User recovers VALUE % of its max energy right away" },
    drain:          { label: "Drain",                     target: "self",  desc: "User recovers VALUE % of the damage dealt" },
    attack_up:      { label: "Attack Up",                 target: "self",  desc: "User attack +VALUE for TURNS turns" },
    defense_up:     { label: "Defense Up",                target: "self",  desc: "User defense +VALUE for TURNS turns" },
    ignore_defense: { label: "Ignore Defense",            target: "enemy", desc: "This hit ignores the enemy defense" },
    critical_up:    { label: "Critical Up",               target: "enemy", desc: "+VALUE %p critical chance on this hit" },
    trick_or_treat: { label: "Trick Or Treat",            target: "enemy", desc: "Random each use: 10% heals the enemy 10%, 10% heals the user 10%, 40% special hit, 40% physical hit" },
    multi_hit:      { label: "Multi-hit",                 target: "enemy", desc: "Hits 1 to VALUE times in a row (random)" },
    freeze:         { label: "Freeze (1-5 turns)",        target: "enemy", desc: "Enemy loses VALUE energy each turn for 1 to 5 turns (random). Ends with the battle" },
    cold:           { label: "Cold",                      target: "enemy", desc: "Enemy catches a cold: after the battle it can't battle until Cold Medicine cures it" },
    grass_poison:   { label: "Grass Poison (1-5 turns, weak)", target: "enemy", desc: "Enemy loses VALUE energy (less than poison) each turn for 1 to 5 turns (random). Ends with the battle" },
    speed_up:       { label: "Speed Up",                  target: "self",  desc: "User speed +VALUE for TURNS turns" },
    next_acc_up:    { label: "Aim (next weapon ACC +)",   target: "self",  desc: "The next weapon it uses gets +VALUE accuracy (not if that is this weapon again)" },
    next_crit_up:   { label: "Snipe (next weapon CRIT +)", target: "self", desc: "The next attack weapon it uses gets +VALUE critical chance (not if that is this weapon again)" },
    disease:        { label: "Disease",                   target: "enemy", desc: "Enemy catches the chosen long-lasting disease (Disease field). It stays after the battle until it is cured" }
};

// item effect types (admin dropdown + item usage)
GameConfig.ITEM_EFFECTS = {
    BALL:         { label: "Capture Ball",     valueLabel: "Catch rate % (100 = always)" },
    LEVEL_UP:     { label: "Level Up Potion",  valueLabel: "Levels to add (0 = 1). EXP is reset." },
    ENERGY:       { label: "Energy Potion",    valueLabel: "% energy restored (100 = full)" },
    REVIVE:       { label: "Revive Potion",    valueLabel: "(unused) monster revives once in battle" },
    TRAIT:        { label: "Type Stone",       valueLabel: "(unused) adds / changes an attribute in the Type Lab (empty attribute = any)" },
    TRAIT_CHANGE: { label: "Type Change Stone", valueLabel: "(unused) changes one attribute into another in the Type Lab" },
    TRAIT_STONE:  { label: "Trait Stone",      valueLabel: "(unused) adds / changes a trait in the Trait Lab" },
    SKILL_DELETE: { label: "Skill Delete",     valueLabel: "(unused) removes one weapon" },
    MONSTER_SLOT: { label: "Monster Slot",     valueLabel: "Slots added per purchase" },
    FRAME:        { label: "Profile Frame",    valueLabel: "(unused) choose the frame style below" },
    AURA:         { label: "Profile Effect",   valueLabel: "(unused) choose the effect style below" },
    EVOLUTION:    { label: "Evolution Item",   valueLabel: "(unused) choose which monsters evolve below" },
    NATURE:       { label: "Nature Potion",    valueLabel: "(unused) random new nature, or pick one below" },
    NATURE_STONE: { label: "Nature Stone",     valueLabel: "(unused) needed to change a nature in the LAB (+ lab fee)" },
    PP_RESTORE:   { label: "PP Potion",        valueLabel: "Uses restored per weapon (0 = full)" },
    PP_UP:        { label: "PP Max Up",        valueLabel: "Extra max uses per weapon (total max +50)" },
    LOSS_ERASE:   { label: "Loss Eraser",      valueLabel: "(unused) erases 1 loss; win rate shown as edited" },
    HOLD:         { label: "Held Item",        valueLabel: "(unused) set the held effect below" },
    CURE:         { label: "Cure Item",        valueLabel: "(unused) choose the disease it cures below" },
    INGREDIENT:   { label: "LAB Ingredient",   valueLabel: "(unused) used in LAB recipes" },
    KEY:          { label: "Key",              valueLabel: "(unused) opens a map or quest that asks for it" },
    PEN:          { label: "Comment Pen",      valueLabel: "(unused) set the pen style below; one use per comment" },
    BREAKER:      { label: "Breaker",          valueLabel: "(unused) lets a monster learn ONE restricted trait or weapon" },
    GIFT:         { label: "Gift Box",         valueLabel: "(unused) open it for a random prize (prize table below)" },
    OTHER:        { label: "Other",            valueLabel: "Free value" }
};
// item categories (game_items.category). kept = stays with you; everything else is gone after one use.
// Bag, shop and dex show them in this order.
GameConfig.ITEM_CATEGORIES = {
    consumable: { label: "Consumable",          icon: "🧪", kept: false, desc: "Used up after one use (potions, cures, one-time held items)" },
    held:       { label: "Held Item",           icon: "🎒", kept: true,  desc: "A monster holds it; it keeps working, never used up" },
    style:      { label: "Style",               icon: "🖼", kept: true,  desc: "Profile frames and effects; yours to keep" },
    comment:    { label: "Comment Pen / Card",  icon: "🖊", kept: false, desc: "Used up after one comment" },
    evolution:  { label: "Evolution Item",      icon: "✨", kept: false, desc: "Used up when the monster evolves" },
    quest:      { label: "Quest Item",          icon: "📜", kept: true,  desc: "Quest key or a quest item; yours for life" },
    map:        { label: "Map Item",            icon: "🗺", kept: true,  desc: "Map key or a map item; yours for life" },
    ball:       { label: "Monster Ball",        icon: "🔴", kept: false, desc: "Used up when thrown" },
    material:   { label: "Material",            icon: "🧱", kept: false, desc: "LAB ingredient; used up in a mix" },
    boost:      { label: "Boost",               icon: "💎", kept: false, desc: "One-time upgrade with a lasting effect (stones, breakers, slots, level up…); used up" },
    gift:       { label: "Gift Box",            icon: "🎁", kept: false, desc: "Used up when opened" }
};
// category from the DB column, or guessed from the effect type for rows saved before the column existed
GameConfig.itemCategory = function (item) {
    if (item?.category && GameConfig.ITEM_CATEGORIES[item.category]) return item.category;
    const e = item?.effect_type;
    if (e === "BALL") return "ball";
    if (e === "FRAME" || e === "AURA") return "style";
    if (e === "PEN") return "comment";
    if (e === "EVOLUTION") return "evolution";
    if (e === "INGREDIENT") return "material";
    if (e === "KEY") return /^map key/i.test(item?.name || "") ? "map" : "quest";
    if (e === "HOLD") return (item?.effect_config?.consume || "never") === "never" ? "held" : "consumable";
    if (e === "GIFT") return "gift";
    if (["LEVEL_UP", "NATURE", "NATURE_STONE", "PP_UP", "TRAIT", "TRAIT_CHANGE", "TRAIT_STONE", "SKILL_DELETE", "MONSTER_SLOT", "LOSS_ERASE", "BREAKER", "OTHER"].includes(e)) return "boost";
    return "consumable";
};
GameConfig.isKeptItem = item => GameConfig.ITEM_CATEGORIES[GameConfig.itemCategory(item)].kept;

// quest difficulty (quests.difficulty) and its rewards; must match emo_quest_difficulty_rewards() in sql/046
GameConfig.QUEST_DIFFICULTY = {
    easy:    { label: "Easy",    ko: "하",   cls: "good",   money: 5000,  tokens: 10, npc: 3, boss: 5 },
    normal:  { label: "Normal",  ko: "중",   cls: "accent", money: 12000, tokens: 20, npc: 4, boss: 8 },
    hard:    { label: "Hard",    ko: "상",   cls: "gold",   money: 25000, tokens: 30, npc: 6, boss: 12 },
    extreme: { label: "Extreme", ko: "최상", cls: "bad",    money: 50000, tokens: 50, npc: 8, boss: 16, bonusItem: "ITEM003" }
};

// monster natures (성격). Admin-registered monsters are "Default"; map spawns
// get a random one (list must match emo_random_nature() in sql/004).
GameConfig.STAT_LABELS = {
    physAttack: "P.ATK", physDefense: "P.DEF", specAttack: "S.ATK", specDefense: "S.DEF", speed: "SPD"
};
GameConfig.NATURES = {
    Default:   { up: null,          down: null },
    Clumsy:    { up: "physAttack",  down: "speed" },
    Fierce:    { up: "physAttack",  down: "specAttack" },
    Reckless:  { up: "physAttack",  down: "physDefense" },
    Wild:      { up: "physAttack",  down: "specDefense" },
    Sturdy:    { up: "physDefense", down: "physAttack" },
    Lazy:      { up: "physDefense", down: "speed" },
    Stubborn:  { up: "physDefense", down: "specAttack" },
    Tough:     { up: "physDefense", down: "specDefense" },
    Timid:     { up: "speed",       down: "physAttack" },
    Hasty:     { up: "speed",       down: "physDefense" },
    Cheerful:  { up: "speed",       down: "specAttack" },
    Restless:  { up: "speed",       down: "specDefense" },
    Clever:    { up: "specAttack",  down: "physAttack" },
    Dreamy:    { up: "specAttack",  down: "physDefense" },
    Quiet:     { up: "specAttack",  down: "speed" },
    Hotheaded: { up: "specAttack",  down: "specDefense" },
    Calm:      { up: "specDefense", down: "physAttack" },
    Gentle:    { up: "specDefense", down: "physDefense" },
    Sassy:     { up: "specDefense", down: "speed" },
    Careful:   { up: "specDefense", down: "specAttack" }
};
// default attack of one monster: physical 10..20 by rarity (+1 every 5 levels), accuracy 80..100 by rarity and level.
// e.g. ★1 Lv 1: 10 / 83%, ★1 Lv 50: 20 / 88%, ★6 Lv 100: 40 / 100%
GameConfig.basicAttack = function (level, rarity) {
    const lv = Math.min(100, Math.max(1, Number(level) || 1)), r = Math.min(6, Math.max(1, Number(rarity) || 1));
    const power = 8 + r * 2 + Math.floor(lv / 5);
    return Object.assign({}, GameConfig.BASIC_ATTACK, {
        power, phys_attack: power, accuracy: Math.min(100, 80 + r * 3 + Math.floor(lv / 10))
    });
};

// 1 at Lv 1 .. 3 at Lv 100: weapon power grows with the attacker's level like its stats do
GameConfig.levelScale = function (level) {
    return 1 + 2 * (Math.min(100, Math.max(1, Number(level) || 1)) - 1) / 99;
};

GameConfig.natureMods = function (name) {
    const n = GameConfig.NATURES[name] || GameConfig.NATURES.Default;
    const mods = {};
    if (n.up) mods[n.up] = GameConfig.NATURE_UP;
    if (n.down) mods[n.down] = GameConfig.NATURE_DOWN;
    return mods;
};
GameConfig.natureText = function (name) {
    const n = GameConfig.NATURES[name];
    if (!n || !n.up) return "No stat changes";
    return `${GameConfig.STAT_LABELS[n.up]} ▲ · ${GameConfig.STAT_LABELS[n.down]} ▼`;
};

// held items (game_items.effect_type = HOLD, effect_config.hold = key)
//   consume: "battle" = used up after the battle, "pop" = used up when it pops, "never" = stays
GameConfig.HOLD_KINDS = {
    air_balloon: { label: "Air Balloon — immune to EARTH, pops when hit by anything else", fields: [] },
    stat_buff:   { label: "Stat buff — +VALUE to a stat for TURNS turns", fields: ["stat", "value", "turns"] },
    atk_swap:    { label: "Attack swap — swap physical/special attack for TURNS turns", fields: ["turns"] },
    def_swap:    { label: "Defense swap — swap physical/special defense for TURNS turns", fields: ["turns"] },
    evasion:     { label: "Evasion — opponents miss CHANCE% more often", fields: ["chance"] },
    type_block:  { label: "Type block — blocks ONE attack of ATTRIBUTE once per battle, CHANCE% (e.g. Pesticide vs BUG)", fields: ["attribute", "chance"] },
    power_boost: { label: "Power boost — physical weapons of ATTRIBUTE +VALUE% (e.g. Ghost Gauntlet)", fields: ["attribute", "value"] },
    sleep_whistle: { label: "Whistle — once per battle, CHANCE% on each own turn: the opponent sleeps TURNS turns", fields: ["chance", "turns"] },
    deodorant:   { label: "Deodorant — on maps, monsters appear 10% more often (battle monster holds it)", fields: [] },
    revive:      { label: "Revive — when it would faint, comes back with PERCENT% energy (one time)", fields: ["percent"] },
    status_guard:{ label: "Status guard — blocks the first STATUSES it would get (one time)", fields: ["statuses"] },
    cold_guard:  { label: "Cold guard (Cold Medicine) — protects once from a cold; using it on a sick monster cures the cold", fields: [] }
};
GameConfig.HOLD_CONSUME = { battle: "Used up after the battle", pop: "Used up when it pops", use: "Used up when it works (one time)", never: "Never used up" };
// statuses a status_guard item can block
GameConfig.GUARD_STATUSES = { poison: "Poison", grass_poison: "Grass Poison", burn: "Burn", minor_burn: "Minor Burn", stun: "Stun", paralyze: "Paralyze", sleep: "Sleep", drain: "Drain", freeze: "Freeze", frostbite: "Frostbite",
    self_harm: "Self-Harm", confused: "Confused", venom: "Venom", schizophrenia: "Schizophrenia", chilblains: "Chilblains", severe_burn: "Severe Burn" };

// members per clan (same for every clan; server setting clan_max_members)
GameConfig.CLAN_MAX_MEMBERS = 20;

// player handlers (전담자)
GameConfig.HANDLERS = ["DYLAN", "JAMES", "BOTH"];

// player profile: country and school are picked from these lists only
GameConfig.COUNTRIES = ["Emo World", "Dung Town", "MJ World", "Foggy Nation", "Ground Town", "Polynesia"];
GameConfig.SCHOOLS = ["No Degree", "High School Degree", "DungTong Cyber Univ.", "DungTong Univ.", "Osan Univ.", "Sky Univ.", "Rainbow Univ.",
    "Kriminal Univ.", "Emo Univ.", "HYHG Univ.", "MJ Univ.", "Foggy National Univ.", "Ground Town Univ.",
    "Polynesia Cyber Univ.", "Polynesia Univ.", "HYHG Film School", "MJ Cyber Univ.", "Bosongi Univ."];
GameConfig.ETHNICITIES = ["Emo", "Emobu", "Bear", "Rabbit", "Teddy", "Bunny", "Dungi", "Rat", "Cat", "Bird", "Smile", "Human", "Angel", "Devil",
    "Jiangshi", "Ghost", "Ant", "Bug", "Donglee", "Square", "Triangle", "Rhombus", "Rectangle", "Trapezoid", "Veggie", "Fruit", "Kalisto", "Invisible", "Cloud", "Others"];
GameConfig.AGE_GROUPS = ["Baby", "Teenager", "Young Adult", "Adult", "Middle-Aged", "Senior"];
GameConfig.GENDERS = ["male", "female", "trans", "fluid"];
GameConfig.PREFERENCES = ["Straight", "Gay", "Bi", "Bi-Curious", "Tran-Curious", "fluid"];

// <option> list for a <select>; an old value that is not in the list is kept (marked "not in list") until changed
GameConfig.choiceOptions = function (list, selected, blankLabel = "— choose —") {
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const cur = selected ?? "";
    const old = cur !== "" && !list.includes(cur) ? `<option value="${esc(cur)}" selected>${esc(cur)} (not in list)</option>` : "";
    return `<option value="">${esc(blankLabel)}</option>` + old +
        list.map(v => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(v)}</option>`).join("");
};

// cosmetic styles (CSS in game.css: .frame-<style>, .aura-<style>)
GameConfig.FRAME_STYLES = { gold: "Gold", rainbow: "Rainbow", halloween: "Halloween", ice: "Ice Crystal", love: "Lovely Pink", neon: "Neon",
                            royal: "Royal Crest (clan shop)", galaxy: "Galaxy (clan shop)", champion: "Champion (tournament shop)", flame: "Blaze (tournament shop)",
                            angel: "Angel Wings", devil: "Devil", ant: "Ant Antennae", rainbow_halo: "Rainbow Halo", star: "Stars", ocean: "Ocean Waves",
                            shape_shift: "Shape Shifter", peek_window: "Secret Window (peek 100 G)", peek_mosaic: "Mosaic (peek 100 G)", peek_leaf: "Windy Leaf (peek 500 G)",
                            buff_sneaker: "Runaway Sneakers (+10% SPD)", buff_shield: "Silver Shield (+10% P.DEF)", buff_witch: "Witchcraft (+10% S.DEF)",
                            buff_sword: "Silver Sword (+10% P.ATK)", buff_magician: "Magician (+10% S.ATK)",
                            red_cross: "Red Cross (hospital shop)", potion: "Potion (hospital shop)", heal_angel: "Heal Frame (hospital shop, heals 10% once)" };
// Heal Frame: each of the wearer's monsters gets 10% of its max energy back once, the first time it drops to half (every battle)
GameConfig.HEAL_FRAME_STYLE = "heal_angel";
GameConfig.HEAL_FRAME_PCT = 10;
// frames that hide the picture until another player pays the owner this much gold (the server reads effect_config.peek)
GameConfig.PEEK_FRAMES = { peek_window: 100, peek_mosaic: 100, peek_leaf: 500 };
// buff frames: once per battle, at a random turn, the wearer's battle monsters get +pct% of one stat
GameConfig.FRAME_BUFFS = {
    buff_sneaker:  { stat: "speed",       pct: 10, icon: "👟" },
    buff_shield:   { stat: "physDefense", pct: 10, icon: "🛡️" },
    buff_witch:    { stat: "specDefense", pct: 10, icon: "🕯️" },
    buff_sword:    { stat: "physAttack",  pct: 10, icon: "⚔" },
    buff_magician: { stat: "specAttack",  pct: 10, icon: "🎩" }
};
// attribute frames (style "afr_<type>") and attribute effects (style "aef_<type>"), one per attribute.
// Wearing one gives every monster of the wearer that has that attribute +5%: frame = P.ATK, effect = S.ATK (whole battle).
GameConfig.ATTR_BUFF_PCT = 5;
GameConfig.ATTR_TYPES = ["fire", "water", "normal", "space", "light", "abnormal", "grass", "ice", "bug", "steel", "power", "angel",
                         "fly", "earth", "ghost", "air", "fairy", "mind", "electric", "evil", "robot", "magic"];
GameConfig.attrOfStyle = style => { const m = /^(afr|aef)_([a-z]+)$/.exec(String(style || "")); return m ? m[2] : null; };
GameConfig.attrName = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
// effect particles: g = glyphs, n = how many, m = motion (fall / orbit / roam / plug)
GameConfig.ATTR_EFFECTS = {
    fire:     { g: ["🔥"], n: 6, m: "fall", label: "Fireballs" },
    water:    { g: ["💧"], n: 9, m: "rain", label: "Rain" },
    normal:   { g: ["N", "O", "R", "M", "A", "L"], n: 6, m: "fall letters", label: "Falling N·O·R·M·A·L" },
    space:    { g: ["🌠"], n: 4, m: "shoot", label: "Shooting Stars" },
    light:    { g: ["✦", "•", "✧"], n: 9, m: "fall glow", label: "Light Particles" },
    abnormal: { g: ["👃", "👂", "👄"], n: 6, m: "fall", label: "Falling Noses, Ears & Lips" },
    grass:    { g: ["🍃", "🍂", "🌿"], n: 7, m: "fall sway", label: "Falling Leaves" },
    ice:      { g: ["❄", "●", "❅"], n: 9, m: "fall ice", label: "Snow & Hail" },
    bug:      { g: ["🐞"], n: 4, m: "roam", label: "Ladybugs" },
    steel:    { g: ["🔩", "⚙️", "🔧"], n: 6, m: "orbit", label: "Nuts & Bolts" },
    power:    { g: ["👊", "🤛", "🤜"], n: 6, m: "fall", label: "Falling Fists" },
    angel:    { g: ["◯"], n: 6, m: "fall halo", label: "Falling Halos" },
    fly:      { g: ["🪶"], n: 6, m: "fall sway", label: "Falling Feathers" },
    earth:    { g: ["🪨", "●"], n: 7, m: "fall rock", label: "Falling Rocks" },
    ghost:    { g: ["👻"], n: 4, m: "roam", label: "Roaming Ghosts" },
    air:      { g: ["○", "◦", "∘"], n: 9, m: "drift", label: "Air Particles" },
    fairy:    { g: ["✦", "•", "♥"], n: 9, m: "fall pink", label: "Pink Particles" },
    mind:     { g: ["🧠"], n: 6, m: "fall", label: "Little Brains" },
    electric: { g: ["⚡"], n: 7, m: "fall", label: "Lightning Bolts" },
    evil:     { g: ["😈", "👿"], n: 6, m: "fall", label: "Little Devils" },
    robot:    { g: ["⚡"], n: 4, m: "plug", label: "Plugged-in Cables" },
    magic:    { g: ["👏"], n: 5, m: "orbit", label: "Clapping Hands" }
};
GameConfig.ATTR_FRAME_LABELS = {
    fire: "Spark Frame", water: "Splash Frame", normal: "N-O-R-M-A-L Frame", space: "Twinkle Star Frame", light: "Rainbow Spotlight Frame",
    abnormal: "Eyeball Frame", grass: "Vine Frame", ice: "Icicle Frame", bug: "Butterfly Wing Frame", steel: "Hard Hat Frame",
    power: "Punch Crack Frame", angel: "Halo Ring Frame", fly: "Bird Wing Frame", earth: "Bat Cave Frame", ghost: "Haunted House Frame",
    air: "Oxygen Mask Frame", fairy: "Fairy Wand Frame", mind: "Blinking Eye Frame", electric: "Shock Frame", evil: "Slasher Mask Frame",
    robot: "ERROR Frame", magic: "Vanishing Trick Frame"
};

GameConfig.AURA_STYLES = { snow: "Snowfall", bunny: "Bunny Friends", sparkle: "Sparkles", bubble: "Bubbles", sakura: "Cherry Blossom",
                           hamster: "Running Hamster", hearts: "Floating Hearts", firefly: "Fireflies", music: "Music Notes", rainbow: "Rainbow Sparkles" };
// attribute frames / effects go into the same style maps (Player Manager, Item Manager, Customize)
GameConfig.ATTR_TYPES.forEach(t => {
    GameConfig.FRAME_STYLES["afr_" + t] = `${GameConfig.attrName(t)} Frame · ${GameConfig.ATTR_FRAME_LABELS[t]} (+5% P.ATK)`;
    GameConfig.AURA_STYLES["aef_" + t] = `${GameConfig.attrName(t)} Effect · ${GameConfig.ATTR_EFFECTS[t].label} (+5% S.ATK)`;
});

GameConfig.EVO_METHODS = { level: "Level", item: "Item (any level)", level_item: "Level + Item" };

GameConfig.RELATIONS = {
    friend: { label: "Friend", icon: "🤝" },
    family: { label: "Family", icon: "🏠" },
    acquaintance: { label: "Acquaintance", icon: "👋", memo: true },
    other: { label: "Other", icon: "📝", memo: true }
};

// friendly text for errors raised by the SQL functions
GameConfig.ERRORS = {
    DAILY_LIMIT: "You have used all battles for today. Come back tomorrow!",
    NOT_ENOUGH_MONEY: "Not enough money.",
    NO_ITEM: "You don't have that item.",
    ITEM_NOT_FOUND: "Item not found.",
    WRONG_ITEM_TYPE: "That item can't be used like this.",
    NOT_YOUR_MONSTER: "That monster is not yours.",
    MAX_LEVEL: "This monster is already at max level.",
    ALREADY_EQUIPPED: "Already equipped.",
    ALREADY_HAS_TYPE: "The monster already has this attribute.",
    TYPE_SLOTS_FULL: "This monster already has 3 attributes.",
    NEED_TRAIT_STONE: "You need a Trait Stone (Trait Lab).",
    NEED_TYPE_STONE: "You need a Type Stone (or the Type Stone of that attribute, or a Type Change Stone for changing).",
    TRAIT_SLOTS_FULL: "This monster has no free trait slot. Use CHANGE instead.",
    TRAIT_SLOT_EMPTY: "That trait slot is empty. Use ADD instead.",
    NO_TRAIT_TO_CHANGE: "This monster never had a trait, so there is nothing to change. Use ADD instead.",
    MIX_COUNT: "Put 3 to 5 items into the mixer.",
    MIX_NOT_ALLOWED: "Style items, keys, slots and weapons can't be mixed.",
    NOT_ENOUGH_ITEMS: "You don't have that many of an item.",
    LAB_LOCKED: "The LAB is not open for your level yet.",
    CANT_SELL_KEY: "Keys can't be sold.",
    NEED_HOSPITAL_VISITS: "This trait needs more hospital treatments first (see the Trait Dex).",
    NEED_TRAIT_ITEM: "This trait needs an item in your bag to learn it (see the Trait Dex).",
    BAD_TYPE: "Unknown attribute.",
    NOT_ITS_TYPE: "The monster doesn't have that attribute.",
    MONSTER_LEVEL_TOO_LOW: "The monster level is too low.",
    PLAYER_LEVEL_TOO_LOW: "Your player level is too low.",
    TYPE_CONFLICT: "This attribute conflicts with the monster's attributes.",
    REQUIRED_TYPE_MISSING: "The monster doesn't have the required attribute.",
    TRAIT_ITEM_HAS_NO_TYPE: "This trait stone has no attribute configured (admin).",
    WEAPON_NOT_EQUIPPED: "That weapon is not equipped.",
    WEAPON_SLOTS_FULL: "This monster already has 6 weapons. Choose one to replace.",
    NO_PENDING_WEAPON: "Nothing to choose.",
    ITEM_NOT_FOR_SALE: "This item is not for sale.",
    WEAPON_NOT_FOR_SALE: "This weapon is not for sale.",
    SLOTS_AT_MAX: "You already have the maximum of 100 monster slots.",
    NO_WEAPON_IN_BAG: "You don't own that weapon.",
    TYPE_NOT_ALLOWED: "This monster's attribute can't use that weapon.",
    ALREADY_HEALTHY: "This monster is already healthy.",
    MAP_LOCKED: "You can't enter this map yet.",
    MONSTER_NOT_ON_MAP: "That monster doesn't live here.",
    MONSTER_SLOTS_FULL: "You can own up to 3 monsters. Release one first (monster page → 🕊 Release).",
    ADMIN_ONLY: "Only the admin can do this.",
    SV_SEASON_OPEN: "A survival season is already open. Finish or cancel it first.",
    SV_NEED_20: "A season needs exactly 20 different players.",
    SV_BAD_PLAYER: "Admin and test players can't join a season.",
    SV_QUOTA: q => `These selection rules are not met: ${q}.`,
    SV_WRONG_STEP: "That step is not open right now — reload the page.",
    SV_NO_MAPS: "There are no survival maps yet. Create maps in the Map Generator.",
    SV_NOT_ENOUGH_ROOM: "The maps don't have room for every player (max 5 per map).",
    SV_ROUND_NOT_DONE: "Some players haven't played this round yet.",
    SV_NO_ENTRY: "That player is not in this season.",
    SV_NOT_YOURS: "That is another player's turn.",
    SV_NOT_RUNNING: "The season is not running.",
    SV_DEAD: "This player is dead.",
    SV_NOT_TURN: "It is not this player's turn.",
    SV_TIME_UP: "⏰ Time is up! This turn is over.",
    SV_AT_SACRED: "The Sacred Place is gone.",
    SV_NO_MAP: "That map doesn't exist.",
    SV_SAME_MAP: "You are already on that map.",
    SV_TICKET_FIELD_ONLY: "This ticket can't go there.",
    // batch 25
    SV_TRAPPED: "🔒 You are trapped here — only a map pass, a Hologram Pass or this map's own way out works.",
    SV_BUS_FLOODED: "🌊 The bus stop is under water — no bus until the water goes down.",
    SV_NOT_SEASON_MAP: "🗺 Tickets only work for this season's 10 maps.",
    SV_SAME_MAP: "You are already on that map.",
    SV_GUARD_ON: "🛡 Your No-Death Pass is already on for this round.",
    SV_UMBRELLA_WEATHER: "☂ The umbrella only helps in rain, snow, downpour or blizzard.",
    FEATURE_OFF: "This feature is no longer used.",
    SV_NO_TEST_BOTS: "No test bots to put on the map.",
    SV_OUTSIDER_ONLY: "🚏 Only the outsider stop is open to you.",
    SV_OUTSIDERS_ONLY: "🚏 That is for outsiders only.",
    SV_TRAPPED_ONLY: "🔒 That is only for the players kept here.",
    SV_OTHER_CELL: "That is in another cell of the maze.",
    SV_SHOP_LIMIT: "🚪 You used up your visits to this shop this round (random shops 3, choose shops 1).",
    SV_FREE_SHOP: "🎁 This is a free shop — use the free gift button.",
    SV_SHOP_CLOSED: "🚫 Closed — nobody works the counter this round.",
    SV_TEAM_FULL: "🐾 You already have 3 monsters. Release one first.",
    SV_MUST_LEAVE: "🚌 You must leave this map this round.",
    SV_LABOR_FIRST: "⛏ Do today's forced labor first.",
    SV_LABOR_NOT_YET: "⛏ The work isn't finished yet.",
    SV_LABOR_DONE: "✔ Today's job is already done.",
    SV_NO_LABOR: "No job for you today.",
    SV_CLERK_TAKEN: "Somebody already took the counter for next round.",
    SV_NEED_SWAP_PASS: "⚔ Changing the battle monster needs a Battle Monster Pass (배틀몬지정권).",
    SV_ONLY_IN_SKY: "☁ Wings only work in the Sky.",
    SV_ONLY_IN_GUILLOTINE: "🪓 Only on the Guillotine map.",
    SV_DELAY_MAX: "🪓 The blade can't be delayed more than 5 rounds.",
    NO_ITEM: "You don't have that item.",
    WRONG_ITEM_TYPE: "That ticket doesn't work here.",
    SV_NO_MOVES: "No moves left this round.",
    SV_CELL_WAIT: "⏳ Dead end — wait for the next round.",
    SV_BATTLE_FIRST: "⚔ Win the battle first.",
    SV_PICK_CELL: "Pick one of the two cells.",
    SV_NOT_IN_MAZE: "You are not in a maze.",
    SV_ARENA_WAIT: "Not enough fighters yet.",
    SV_NO_ARENA: "There is no arena here.",
    SV_EVO_BATTLE_ONLY: "🧬 Only the BATTLE monster can evolve here.",
    SV_EVO_NO_ITEM: "🧬 You need the evolution item first.",
    SV_MONSTER_SICK: "🤧 Your battle monster has a cold and can't fight until it is cured.",
    SV_NOT_DORM: "Dorm players only.",
    SV_NO_FACILITY: "That place is not on this map.",
    SV_BLOCKED: "🚧 The roads are blocked this round — only tickets work now.",
    SV_NOT_A_DESTINATION: "This transport doesn't go there.",
    SV_MAP_FULL: "That map is full.",
    SV_NOT_SOLD: "That is not sold here.",
    SV_PICK_MONSTER: "Choose one of your monsters first.",
    SV_SHELTER_FULL: "This shelter is full.",
    SV_NO_STARTERS: "Fishy, Poopi and Eggie are missing from the monster list.",
    SV_IN_SHELTER: "You are already inside a shelter.",
    SV_NO_PREMIUM: "This place has no premium rooms.",
    SV_PREMIUM_FULL: "Every premium room is taken.",
    SV_NO_ROOMS: "Only premium rooms here.",
    SV_NO_TRIES: "No check-in tries left here this round.",
    SV_USE_ROOMS: "Pick a room on the map (hotel / house / hideout).",
    SV_NO_LOOK_AROUND: "Look around was removed — use the tiles on the map.",
    SV_FREE_CHOICE: "This place is \"선택\" — choose freely.",
    SV_ENTER_FIRST: "Enter the shop first.",
    SV_PICK_FIRST: "Press 고르기 (Pick) first — this place is random.",
    SV_NO_PICKS: "No picks left here this turn.",
    SV_NO_FINDS: "Nothing more to find here this turn.",
    SV_UMBRELLA_ON: "Your umbrella is already open this round.",
    SV_NO_NPC: "That battle is already over.",
    NOT_YOURS: "That is not yours.",
    NOT_FOUND: "Not found.",
    EMPTY_MESSAGE: "Write a message first.",
    PLAYER_NOT_FOUND: "Player not found. Please log in again.",
    BAD_QUANTITY: "Invalid quantity.",
    ALREADY_OWNED: "You already own this.",
    CASINO_LIMIT: "You have used all 3 casino plays for today (lottery tickets count too). Come back tomorrow!",
    SLOT_LIMIT: "You have used all your slot spins for today (20 a day across all slot games). Come back tomorrow!",
    BAD_BET: "That bet is not allowed in this slot game.",
    LOTTERY_ONE_PER_VISIT: "Only one ticket per casino visit. Leave the casino and come back to buy another.",
    GAME_NOT_FOUND: "This game is closed.",
    STARTER_ALREADY_CLAIMED: "You already got your starter monster.",
    NO_STARTER_MONSTERS: "No starter monsters are set up yet (admin).",
    NO_BATTLE_MONSTER: "None of your battle monsters can fight. Choose them on your Home page (or heal them).",
    TEAM_NEEDS_ONE: "At least one battle monster is needed.",
    TEAM_TOO_BIG: "Up to 2 battle monsters (1st and 2nd).",
    TEAM_DUPLICATE: "That monster is already in the line-up.",
    TEAM_NOT_FULL: "Choose 2 battle monsters first.",
    EXTRA_FULL: "That extra monster slot is already taken.",
    TB_TEAM_TOO_BIG: "Up to 2 team battle monsters. A 3rd one can be paid for (5,000 G) before a team battle.",
    TB_EXTRA_NEEDS_TWO: "Choose 2 team battle monsters first - the paid 3rd comes after them.",
    TB_LIMIT: "You already played today's team battle. Come back tomorrow!",
    TB_NO_SESSION: "This team battle was not found - reload the page.",
    TB_BAD_STATE: "This step is already done - reload the page.",
    TB_SLOT_TAKEN: "That teammate slot is already filled (it can't be changed).",
    TB_NO_TEAMMATE: "No other player is free for a team battle right now.",
    TB_NO_OPPONENTS: "No players are free for the red team right now.",
    TB_NEED_MATES: "Find (or call) both teammates first.",
    TB_NOT_FRIEND: "You can only call players on your friend list.",
    TB_NO_INVITE: "You need a Friend Invite (general shop) to call a friend.",
    CHOOSE_NOT_FRIEND: "You can only pick (or invite) players on your friend list.",
    CHOOSE_NO_INVITE: "Not enough Friend Invites (general shop, 50,000 G): one per friend. They are used up when the battle starts.",
    TB_FRIEND_NOT_READY: "That friend has no team battle monster that can fight.",
    TB_ALREADY_IN_TEAM: "That player is already in your team.",
    MONSTER_NOT_OWNED: "That monster is not yours.",
    TEST_BOT_OPPONENT: "Test bots can't be picked in battles - only real players.",
    BAD_ORDER: "The line-up changed - reload the page and try again.",
    OPPONENT_NO_MONSTER: "The opponent has no battle monster.",
    SESSION_FINISHED: "This battle is already over.",
    NOT_YOUR_BATTLE: "This is not your battle.",
    SAME_PLAYER: "You can't battle yourself.",
    FIND_LIMIT: "You have used all finds for today (5 free + 5 extra). Come back tomorrow!",
    FIND_NEED_PAY: "Your free finds are used up. Extra finds cost money.",
    MONSTER_GONE: "The monster is gone.",
    MONSTER_NOT_FOUND: "Monster not found.",
    EVO_NOT_COMPATIBLE: "Nothing happened… this monster doesn't react to that item.",
    EVO_LEVEL_LOW: "The monster's level is too low for this item yet.",
    NEED_SECOND_EVO_ITEM: "This evolution needs two items together - get the other one first (e.g. Air Orb + Light Orb).",
    ITEM_NOT_OWNED: "You don't have every item this evolution needs.",
    PP_FULL: "All weapon uses are already full.",
    PP_BONUS_MAX: "This monster already has the maximum extra uses (+50).",
    NO_LOSSES: "You have no losses to erase.",
    NOT_IN_CLAN: "Join a clan first. A clan battle monster can only be chosen while you are in a clan.",
    SOLD_OUT: "Sold out.",
    NOT_ENOUGH_TOKENS: "Not enough tokens.",
    GACHA_EMPTY: "This capsule has no monsters yet (admin).",
    ALREADY_IN_CLAN: "You are already in a clan. Leave it first.",
    CLAN_FULL: "This clan is full (20 members max).",
    NOTHING_HELD: "This monster isn't holding anything.",
    NOT_SICK: "This monster doesn't have that disease.",
    LAB_LEVEL: "The LAB opens at player level 10.",
    LAB_MISSING: "You don't have all the ingredients.",
    RECIPE_NOT_FOUND: "This recipe is closed.",
    NO_STEAL_TRAIT: "That monster can't steal.",
    LAST_MONSTER: "You can't release your only monster - it has to stay as your battle monster.",
    MONSTER_LOYAL: "This monster is Loyal 🐶 — it can't be released.",
    FUSION_NOT_FOUND: "That fusion recipe does not exist.",
    FUSION_MISSING_MONSTER: "You are missing a monster (or its level is too low) for this fusion.",
    MAP_FIND_LIMIT: "You have used all 3 finds on this map today. Try another map or come back tomorrow!",
    EVO_WAITING: "This monster is waiting to evolve. Evolve it first (see its page), then it can level up again.",
    EVO_REFUSED: "This evolution was refused — it can't be done any more.",
    EVO_NEED_WEAPON: "It must hold the required weapon (as one of its weapons) to evolve.",
    EVO_NOT_READY: "This monster is not ready to evolve.",
    NO_LUCKY_TRAIT: "This monster has no Lucky Day trait.",
    MONSTER_IN_QUEST: "This monster is on a quest right now. Finish or give up the quest first.",
    MONSTER_IN_BATTLE: "This monster is in a battle right now.",
    COMMENT_EMPTY: "Write something first.",
    COMMENT_TOO_LONG: "Comments can be up to 300 characters.",
    PEN_SAME_KIND: "Use only one pen of each kind per comment.",
    NOT_YOUR_COMMENT: "You can only delete your own comments.",
    ALREADY_FRIENDS: "You are already friends.",
    REQUEST_PENDING: "You already sent a friend request to this player.",
    REQUEST_NOT_FOUND: "This friend request is gone.",
    QUEST_NOT_FOUND: "This quest is gone.",
    QUEST_CLAIMED: "You already claimed this reward.",
    QUEST_NOT_DONE: "You haven't reached this goal yet.",
    NEED_NATURE_STONE: "You need a Nature Stone (shop) to change a nature.",
    BAD_NATURE: "Choose a real nature - changing back to Default is not possible.",
    SAME_NATURE: "The monster already has this nature.",
    MAP_BANNED: "You forfeited an NPC battle - no maps for 3 months.",
    NPC_BATTLE_PENDING: "An NPC is waiting for you! Fight the NPC battle before you search again.",
    EXTRA_REMOVED: "Paid extra monsters are no longer available.",
    MEMO_REQUIRED: "A memo is required for this relationship.",
    CLAN_NOT_FOUND: "This clan is closed.",
    SAME_CLAN: "You can only battle members of other clans.",
    NO_CLAN_OPPONENT: "No members of other clans with a battle monster yet.",
    CLAN_DAILY_LIMIT: "You have used all clan battles for today. Come back tomorrow!",
    TOURNAMENT_NOT_FOUND: "Tournament not found.",
    TOURNAMENT_CLOSED: "Registration for this tournament is closed.",
    ALREADY_ENTERED: "You are already in this tournament.",
    GROUP_FULL: "This group is full. Choose another group.",
    ADMIN_ONLY: "Only the admin can do this.",
    DEMO_NOT_FOUND: "No result like that turned up in the simulated spins. This machine may not have that feature (or it is very rare) - try again.",
    MATCH_DONE: "This match is already finished.",
    MATCH_NOT_READY: "This match needs two players first.",
    QUEST_NOT_FOUND: "This quest is closed.",
    QUEST_ALREADY_CLEARED: "You already cleared this quest.",
    QUEST_IN_PROGRESS: "Finish (or give up) your current quest first.",
    QUEST_TEAM_SIZE: "Choose 1 to 6 monsters.",
    QUEST_MONSTER_FAINTED: "A fainted monster (0 energy) can't join a quest. Heal it at the Hospital first.",
    QUEST_NEED_RUN: "No quest runs left today. Buy an extra run.",
    QUEST_MAX_RUNS: "You have used all quest runs for today (max 5). Come back tomorrow!",
    QUEST_RUN_NOT_FOUND: "This quest run is over.",
    QUEST_ITEM_TAKEN: "You already took this item.",
    QUEST_END: "You are at the end of the quest.",
    QUEST_BAD_ACTION: "You can't do that here.",
    WEAPON_NOT_ALLOWED: "This weapon can't be given to this monster. (해당 무기는 이 몬스터에게 줄 수 없습니다) — a Weapon Breaker from the LAB can unlock it.",
    TRAIT_NOT_ALLOWED: "This trait can't be given to this monster. (해당 특성은 이 몬스터에게 줄 수 없습니다) — a Trait Breaker from the LAB can unlock it.",
    TRAIT_ALREADY_HAS: "This monster already has that trait.",
    NO_TRAIT_IN_BAG: "You don't have that trait.",
    TRAIT_NOT_FOUND: "Trait not found.",
    BREAKER_ALREADY: "This monster already has an unused Breaker.",
    MONSTER_HAS_COLD: "This monster has a cold 🤧 and can't battle. Cure it with Cold Medicine (hospital shop) or choose another monster.",
    OPPONENT_HAS_COLD: "That player's battle monster has a cold and can't battle right now.",
    COLD_NEEDS_MEDICINE: "Only a cold is left — the hospital can't cure it. Use Cold Medicine from the hospital shop.",
    HOSPITAL_SHOP_LOCKED: "The hospital shop opens after 10 hospital treatments.",
    SERVICE_NOT_FOUND: "This hospital service is not available.",
    GIFT_EMPTY: "This gift box is empty.",
    MONSTER_HAS_DISEASE: "This monster is too sick to battle (cancer / scabies). Cure it at the 🏥 Hospital first.",
    MONSTER_IN_CARE: "This monster is staying in the Mental Hospital / Diet Center and can't battle until it comes back.",
    OPPONENT_UNAVAILABLE: "None of that player's battle monsters can battle right now (sick or in the hospital).",
    DISEASE_NEEDS_SPECIAL_CARE: "Normal treatment can't cure this disease. See the 🦠 Disease Dex for the medicine, surgery or care it needs.",
    DRUG_ADDICTION: "Drug addiction 💊: energy and statuses can't be healed until the Mental Hospital cures it.",
    CARE_BAD_KIND: "Unknown treatment.",
    DISEASE_NOT_GIVEN: "The disease could not be given (immune, already sick or unknown).",
    INSURANCE_SICK: "You can't join insurance while one of your monsters is sick or in care. Cure it first.",
    INSURANCE_HAVE_ONE: "You can have only one insurance. Cancel your current insurance first.",
    CLAN_ONLY_ITEM: "Only members of that clan can buy this.",
    NO_GIFT_TRAIT: "This monster has no Gift trait.",
    INSURANCE_FULL: "This insurance is full.",
    INSURANCE_ALREADY: "You already have this insurance.",
    INSURANCE_NOT_FOUND: "Insurance not found.",
    PENSION_ALREADY: "You are already registered in this pension lottery round.",
    REMOTE_NEEDS_INSURANCE: "Remote heals need Gold insurance or better.",
    REMOTE_QUEST_ONLY: "Remote heals are used in the Quest Battle clinic before each stage.",
    PQ_PICK_MONSTER: "Choose your Quest Battle monster first.",
    PQ_NOT_IN_PARTY: "You are not in the party any more.",
    REMOTE_USED_UP: "You have used today's remote heal.",
    HOSPITAL_SHOP_INSURED_ONLY: "The hospital shop is open only to players with insurance.",
    FRAME_NEEDS_INSURANCE: (plan, paid) => `This frame needs ${plan} insurance or better and at least ${paid} insurance premiums paid.`,
    PQ_DONE_TODAY: "You already played today's Quest Battle. Come back tomorrow!",
    PQ_NO_ENERGY: "That monster has no energy left. Heal it first.",
    PQ_NOT_ENOUGH_PLAYERS: "Not enough players with a usable monster to form a party of 5.",
    PQ_FRIENDS_MAX: "You can invite at most 2 friends into a Quest Battle.",
    PQ_FRIEND_NO_MONSTER: "That friend has no monster that can fight right now.",
    PQ_NOT_FOUND: "Quest not found.",
    PQ_BAD_STATE: "The quest is not at that step any more - reload the page."
};

// status families: an immunity (trait Antidote Body, Host…) to the first one covers the whole family
GameConfig.STATUS_FAMILY = {
    poison:   ["poison", "grass_poison", "venom"],
    burn:     ["burn", "minor_burn", "severe_burn"],
    paralyze: ["paralyze", "stun"],
    freeze:   ["freeze", "frostbite", "chilblains"],
    sleep:    ["sleep"],
    mind:     ["self_harm", "confused", "schizophrenia"]
};
GameConfig.statusFamily = kind => Object.keys(GameConfig.STATUS_FAMILY).find(f => GameConfig.STATUS_FAMILY[f].includes(kind)) || kind;
