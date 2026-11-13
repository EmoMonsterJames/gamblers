// =====================================================================
// TraitManager - monster traits (특징) managed by the admin in the
// `monster_traits` table. A monster has 0, 1 or 2 traits
// (monsters.trait_id and monsters.trait2_id) plus one trait the player taught it
// (player_monsters.learned_trait_id, shown as `.trait3`).
// The combatant objects passed in have `.trait` / `.trait2` (rows) and `.types` (array).
// =====================================================================
class TraitManager {

    static EFFECTS = {
        first_strike_vs_type:     { label: "Always attacks first vs TYPE",       target: "type" },
        first_strike_always:      { label: "Always attacks first",               target: null },
        damage_bonus_vs_type:     { label: "Deals +VALUE% damage to TYPE",        target: "type" },
        damage_reduction_vs_type: { label: "Takes -VALUE% damage from TYPE attacks", target: "type" },
        critical_bonus:           { label: "+VALUE %p critical chance",           target: null },
        accuracy_bonus:           { label: "+VALUE %p accuracy",                  target: null },
        speed_bonus:              { label: "+VALUE speed",                        target: null },
        hp_bonus:                 { label: "+VALUE% max energy",                  target: null },
        status_immunity:          { label: "Immune to STATUS and its family (poison = grass poison + venom, burn = minor + severe burn, paralyze = stun, freeze = frostbite + chilblains, mind = self-harm + confused + schizophrenia)", target: "status" },
        steal_money:              { label: "VALUE% chance to steal 100 G from the opponent (once per battle)", target: null },
        reduce_physical_vs_type:  { label: "Takes -VALUE% damage from physical TYPE attacks", target: "type" },
        transform:                { label: "Transforms into the opponent at the start of a battle (look, attributes, weapons and all stats except energy)", target: null },
        crawl_accuracy_down:      { label: "Each time the opponent uses a weapon: VALUE% chance to lower its accuracy by 10% (up to -50%)", target: null },
        reflect_physical:         { label: "VALUE% chance to send the physical damage it takes back to the attacker", target: null },
        reflect_special:          { label: "VALUE% chance to send the special damage it takes back to the attacker", target: null },
        flood_power_up:           { label: "Each time it uses a WATER weapon: VALUE% chance to raise WATER weapon power by 10% (up to +30%)", target: null },
        paralyze_on_hit:          { label: "VALUE% chance to stun the opponent when it hits (it loses one action)", target: null },
        bloodsucker:              { label: "VALUE% chance that a physical hit heals it by the damage it dealt", target: null },
        frozen_apple:             { label: "One try per battle, on its first hit: 20% poison, 20% frostbite, 10% both, 50% nothing", target: null },
        bee_sting_poison:         { label: "One try per battle, on its first hit: VALUE% chance to poison the opponent", target: null },
        electric_wind:            { label: "VALUE% chance to raise S.ATK by 10% when using an ELECTRIC or FLY weapon with special power", target: null },
        dojo_learn_weapon:        { label: "Learns one random weapon of the opponent and uses it once, on a random turn, instead of its own", target: null },
        fair_play:                { label: "VALUE% chance on the first turn to let the opponent attack first (ignores speed and traits)", target: null },
        rice_cake_heal:           { label: "Once per battle, when its energy first drops to 10% or less: VALUE% chance to recover 30% of its max energy", target: null },
        ouija_swap_weapons:       { label: "VALUE% chance at the start of a battle to turn opponent weapons into Space Out / No Move (1 if it has 2 weapons, 2 if it has 3+; back to normal after the battle)", target: null },
        curse_on_ko:              { label: "When the opponent knocks it out, the opponent is cursed down to 1 energy (once)", target: null },
        wake_up_call:             { label: "When it enters a battle, every sleeping monster (both sides) wakes up (once)", target: null },
        lucky_day:                { label: "VALUE% chance on its turn to find 100–300 G for its trainer (normal and clan battles)", target: null },
        melt_vs_type:             { label: "Against TYPE monsters it always lets the opponent attack first (once per battle)", target: "type" },
        mindmaster:               { label: "While it is in battle: VALUE% chance the opponent's attack / status weapons hit the opponent itself", target: null },
        evil_charm:               { label: "VALUE% chance on each opponent turn: the opponent is stunned for that turn and hurts itself (5% of its max energy)", target: null },
        host:                     { label: "Disease host: never gets the poison, paralysis, burn or freeze families, cold, rare diseases or cancer", target: null },
        copy_weapon:              { label: "VALUE% chance on its turn to copy the weapon the opponent just used", target: null },
        loyal:                    { label: "Loyal: it can't be released", target: null },
        aid_foe:                  { label: "VALUE% chance on its turn to heal the OPPONENT by 5% of its max energy", target: null },
        laziness:                 { label: "VALUE% chance each turn to let the opponent attack first (ignores speed)", target: null },
        stink_defense_up:         { label: "One try per battle (its first turn): VALUE% chance to raise its P.DEF and S.DEF by 10%", target: null },
        judgement:                { label: "During the first 5 turns: VALUE% chance each opponent turn that it can't use an attack weapon (status / guard weapons and the PURE default attack still work)", target: null },
        burn_sting:               { label: "VALUE% chance on its turn to give a HEALTHY opponent (no status) both burn and poison", target: null },
        fire_trap:                { label: "Once per battle: traps the opponent - it loses VALUE% max energy every turn until it uses a WATER or EARTH weapon (WATER monsters are immune)", target: null },
        gift_foe:                 { label: "One try per battle (its first turn): VALUE% chance to give the opponent a gift: 30% S.ATK +10%, 30% P.ATK +10%, 30% heal 10%, 10% 100-500 G for the opponent's trainer", target: null },
        save_gold:                { label: "When it enters a battle: VALUE% chance to save 100-500 G for its own trainer (once per battle)", target: null },
        ancient_shield:           { label: "Once per battle (its first turn): raises its own P.DEF and S.DEF by up to VALUE% each", target: null },
        tornado:                  { label: "Once per battle, when it enters: VALUE% chance that 1-4 opponent weapons lose 5-10% accuracy and the opponent loses 5-10% speed", target: null },
        faint_cold:               { label: "When it faints: VALUE% chance the opponent catches a cold (it can't battle until Cold Medicine or the hospital cures it)", target: null },
        frozen_fire:              { label: "When it enters a battle: VALUE% chance the opponent gets FREEZE and FROSTBITE together (even FIRE monsters)", target: null },
        air_play:                 { label: "Once per battle: VALUE% chance the opponent's 1st battle monster swaps places with a random other one of its line-up, which fights first (only vs a line-up of 3+ monsters)", target: null },
        celestial_light:          { label: "When it enters a battle: VALUE% chance the opponent's LIGHT weapons don't work at all", target: null },
        rotate:                   { label: "Team battles only: VALUE% chance on its turn that it skips its weapon and the next teammate in order attacks instead", target: null },
        holy_water:               { label: "Once per battle, when it faints: VALUE% chance to come back with half its max energy", target: null },
        santa_fe:                 { label: "Every turn: VALUE% chance to raise its S.DEF and P.DEF by 10% together", target: null },
        acorn_tree:               { label: "Once per battle, when it enters: VALUE% chance to plant an acorn tree on the opponent - from the next turn it drains 5% of the opponent's max energy every turn and heals itself", target: null },
        magical_wraith:           { label: "Once per battle, when it enters: VALUE% chance to revive one random fainted monster of its own line-up / team (half energy, fights next; fails if none fainted)", target: null },
        space_requiem:            { label: "When it faints: VALUE% chance to delete one random weapon of the opponent PERMANENTLY", target: null },
        grass_flute:              { label: "Once per battle, when the opponent puts it to sleep: VALUE% chance to restore its energy fully", target: null },
        robotics:                 { label: "Once per battle: the first ROBOT weapon the opponent uses does nothing", target: null },
        witch_exorcism:           { label: "Every turn: VALUE% chance that a random opponent weapon loses 1 use", target: null },
        entrance:                 { label: "Once per battle, when it enters: VALUE% chance to cut the opponent's current energy in half", target: null },
        infestation:              { label: "Every turn: VALUE% chance to give the opponent poison, sleep, stun, paralysis or venom (random)", target: null },
        // batch 19
        cruiserweight:            { label: "When it attacks with a POWER weapon with physical power: VALUE% chance of +20% damage", target: null },
        reverse:                  { label: "Once per battle, when it is hit: VALUE% chance it heals by the damage instead of losing it (nothing at full energy)", target: null },
        magic_snow:               { label: "Every turn: VALUE% chance to raise its own S.DEF by 5%", target: null },
        listen:                   { label: "Every turn: VALUE% chance to hear the opponent coming and attack first when the opponent would have", target: null },
        burger_party:             { label: "When it enters a battle: its energy is restored up to 50% (once per battle)", target: null },
        burger_dance:             { label: "When it enters a battle: energy, P.ATK, S.ATK, P.DEF, S.DEF and speed +10 (once per battle)", target: null },
        foe_def_down:             { label: "Every turn: VALUE% chance to lower the opponent's defense (see the description)", target: null },
        buffering:                { label: "While it is in battle, the opponent's stats can't be changed (buffs and drops do nothing) until it faints", target: null },
        downloading:              { label: "Once per battle, when it enters: copies the opponent's trait and uses it as its own for that battle", target: null },
        frog_jump:                { label: "Once per battle: VALUE% chance to jump away from one strong attack (over 40 damage)", target: null },
        defying_gravity:          { label: "EARTH weapons and moves have no effect on it", target: null },
        neuroscience:             { label: "When a special attack hits it (and it survives): VALUE% chance to restore its energy fully", target: null },
        shapeshift:               { label: "Turns into the opponent (look, attributes, weapons, all stats except energy) and back into itself every other turn, the whole battle", target: null },
        dustball:                 { label: "Once per battle (its first turn): VALUE% chance the opponent catches the HP rare disease", target: null },
        torture:                  { label: "Every turn: VALUE% chance to give the opponent a status (see the description); nothing if it already has it", target: null },
        fire_disaster:            { label: "Its first 3 FIRE attacks of a battle deal +20% damage, and count as x2 even against attributes that resist FIRE", target: null },
        // batch 21
        self_stat_up:             { label: "Once per battle (its first turn): its own P.ATK rises by up to VALUE%", target: null },
        no_multi_hit:             { label: "While it is in battle, the opponent can't use multi-hit weapons", target: null },
        rainbow_light:            { label: "Every turn: VALUE% chance to restore 50% of its max energy, and 50% for every teammate still waiting (team battles)", target: null },
        entry_cold:               { label: "When it enters a battle: VALUE% chance the opponent catches a cold (it can't battle until Cold Medicine or the hospital cures it)", target: null },
        nightmare:                { label: "While the opponent sleeps: it loses 10 energy every sleeping turn (VALUE% chance each turn)", target: null },
        lily_blessing:            { label: "Once per battle, when it is hit: VALUE% chance that all its weapons get +15 accuracy", target: null },
        trick:                    { label: "VALUE% chance that its guard weapons also hit the opponent for their guard value (see the description)", target: null },
        attr_boost:               { label: "VALUE% chance of extra damage with weapons of some attributes (see the description)", target: null }
    };

    // Host: statuses and diseases it never gets
    static HOST_IMMUNE = ["poison", "grass_poison", "venom", "paralyze", "stun", "burn", "minor_burn", "severe_burn",
                          "freeze", "frostbite", "chilblains", "cold", "cancer",
                          "rare_hp", "rare_patk", "rare_satk", "rare_pdef", "rare_sdef", "rare_speed"];
    static EVIL_CHARM_SELF = 5;          // % of max energy it loses
    static AID_HEAL = 5;                 // % of the opponent's max energy

    // Crawl: accuracy drop per success and the most it can drop in one battle (%)
    static CRAWL_STEP = 10;
    static CRAWL_MAX = 50;
    // Flood: WATER weapon power gain per success and the most it can gain in one battle (%)
    static FLOOD_STEP = 10;
    static FLOOD_MAX = 30;

    static describe(trait) {
        if (!trait) return "";
        const def = this.EFFECTS[trait.effect_type];
        if (!def) return trait.description || "";
        // these effects take their numbers from effect_json: the admin's own description says it best
        if (["foe_def_down", "torture", "self_stat_up", "trick", "attr_boost"].includes(trait.effect_type) && trait.description) return trait.description;
        return def.label
            .replace("TYPE", String(trait.target_type || "?").toUpperCase())
            .replace("STATUS", trait.target_type || "?")
            .replace("VALUE", trait.value ?? 0);
    }

    // the traits of a monster / combatant (0, 1 or 2 rows)
    static list(m) {
        // trait4 = a trait copied in battle (Downloading)
        return m ? [m.trait, m.trait2, m.trait3, m.trait4].filter(t => t && typeof t === "object") : [];
    }

    // the active trait row with this effect, or null
    static #get(c, effect) {
        return this.list(c).find(t => t.is_active !== false && t.effect_type === effect) || null;
    }

    static #has(c, effect) {
        return !!this.#get(c, effect);
    }

    static #value(c, effect) {
        const t = this.#get(c, effect);
        return t ? Number(t.value) || 0 : 0;
    }

    // target_type may list several attributes: "Fly,Air"
    static #want(t) { return String(t.target_type || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean); }

    static #targets(t, otherTypes) {
        const want = this.#want(t);
        return (otherTypes || []).some(x => want.includes(String(x).toLowerCase()));
    }

    static #targetsAttr(t, weapon) {
        return this.#want(t).includes(String(weapon.attribute || "").toLowerCase());
    }

    // the trait that makes `attacker` act first (or null)
    static firstStrikeTrait(attacker, defender) {
        const always = this.#get(attacker, "first_strike_always");
        if (always) return always;
        const vs = this.#get(attacker, "first_strike_vs_type");
        return vs && this.#targets(vs, defender.types) ? vs : null;
    }

    // true if `attacker` must act before `defender` regardless of speed
    static firstStrike(attacker, defender) {
        return !!this.firstStrikeTrait(attacker, defender);
    }

    static critBonus(attacker) { return this.#value(attacker, "critical_bonus"); }

    static accuracyBonus(attacker) { return this.#value(attacker, "accuracy_bonus"); }

    static speedBonus(c) { return this.#value(c, "speed_bonus"); }

    // damage multiplier from both monsters' traits for one hit
    static damageMultiplier(attacker, defender, weapon) {
        let m = 1;
        const bonus = this.#get(attacker, "damage_bonus_vs_type");
        if (bonus && this.#targets(bonus, defender.types)) m *= 1 + (Number(bonus.value) || 0) / 100;
        const guard = this.#get(defender, "damage_reduction_vs_type");
        if (guard && this.#targetsAttr(guard, weapon)) m *= Math.max(0, 1 - (Number(guard.value) || 0) / 100);
        return m;
    }

    // multiplier for the PHYSICAL part of a hit (e.g. Sunglasses: -15% from physical Fire weapons)
    static physicalMultiplier(defender, weapon) {
        const t = this.#get(defender, "reduce_physical_vs_type");
        return t && this.#targetsAttr(t, weapon) ? Math.max(0, 1 - (Number(t.value) || 0) / 100) : 1;
    }

    // Transform (변신): copies the opponent when the battle starts
    static transforms(c) { return this.#has(c, "transform"); }

    // % chance that `defender`'s Crawl lowers the attacker's accuracy (0 = no Crawl)
    static crawlChance(defender) { return this.#value(defender, "crawl_accuracy_down"); }

    // % chance that `attacker`'s Flood raises its WATER weapon power (0 = no Flood)
    static floodChance(attacker) { return this.#value(attacker, "flood_power_up"); }

    // % chance that `attacker`'s hit stuns (X-Ray, Alpha-Ray, Beta-Ray, Gamma-Ray)
    static paralyzeChance(attacker) { return this.#value(attacker, "paralyze_on_hit"); }

    // Bloodsucker: % chance a physical hit heals the attacker
    static bloodsuckerChance(c) { return this.#value(c, "bloodsucker"); }

    // can this monster get a trait / weapon limited by allowed_types / allowed_monster_ids?
    // `m` = owned monster (MonsterService row: types, species) or a species row (type1-3, id)
    static allowedFor(row, m) {
        const types = (row.allowed_types || []).filter(Boolean);
        const ids = (row.allowed_monster_ids || []).map(String);
        if (!types.length && !ids.length) return true;
        const speciesId = String(m.species?.id ?? m.monster_id ?? m.id);
        if (ids.includes(speciesId)) return true;
        const mine = (m.types || [m.type1, m.type2, m.type3]).filter(Boolean).map(t => String(t).toLowerCase());
        return types.some(t => mine.includes(String(t).toLowerCase()));
    }

    // "WATER monsters" / "Fluidee only" — who may get it (monsterNames: id -> name)
    static allowedText(row, monsterNames = {}) {
        const types = (row.allowed_types || []).filter(Boolean);
        const ids = (row.allowed_monster_ids || []).map(String);
        if (!types.length && !ids.length) return "Any monster";
        const parts = [];
        if (types.length) parts.push(types.map(t => t.toUpperCase()).join(" / ") + " monsters");
        if (ids.length) parts.push(ids.map(i => monsterNames[i] || `#${i}`).join(", "));
        return "Only " + parts.join(" or ");
    }

    // Frozen Apple: poison / frostbite once per battle
    static hasFrozenApple(c) { return this.#has(c, "frozen_apple"); }

    // Bee Sting: % chance per hit (once per battle); the poison it gives
    static BEE_STING_POISON = { kind: "poison", value: 6, ticks: 4 };
    static beeStingChance(c) { return this.#value(c, "bee_sting_poison"); }
    // the name of the trait row with this effect (e.g. "Poison Sting" uses the Bee Sting rule)
    static nameOf(c, effect) { return this.#get(c, effect)?.name || null; }

    // Electric Wind: % chance per ELECTRIC / FLY weapon use; S.ATK boost in %
    static ELECTRIC_WIND_BOOST = 10;
    static electricWindChance(c) { return this.#value(c, "electric_wind"); }

    // Dojo: % chance per own turn to use the learned weapon (until it has been used once)
    static DOJO_USE_CHANCE = 35;
    static hasDojo(c) { return this.#has(c, "dojo_learn_weapon"); }

    // Fair Play: % chance on the first turn to let the opponent go first
    static fairPlayChance(c) { return this.#value(c, "fair_play"); }

    // Rice Cake: % chance to heal once it is at RICE_CAKE_BELOW % energy or less
    static RICE_CAKE_BELOW = 10;
    static RICE_CAKE_HEAL = 30;
    static riceCakeChance(c) { return this.#value(c, "rice_cake_heal"); }

    // % chance that `c`'s Ouija swaps the opponent's weapons at the start of a battle
    static ouijaChance(c) { return this.#value(c, "ouija_swap_weapons"); }

    // Voodoo (physical) / Voodoo 2.0 (special): { part: "phys"|"spec", chance } or null
    static reflect(defender) {
        if (this.#has(defender, "reflect_physical")) return { part: "phys", chance: this.#value(defender, "reflect_physical") };
        if (this.#has(defender, "reflect_special")) return { part: "spec", chance: this.#value(defender, "reflect_special") };
        return null;
    }

    // % chance to steal money (Stealer)
    static stealChance(c) { return this.#value(c, "steal_money"); }

    // source: "weapon" when a weapon gives the status (Earth Never Sleeps: effect_json.weapon_only = immune to weapon sleep only)
    static isImmune(c, statusKind, source = null) {
        if (this.#has(c, "host") && this.HOST_IMMUNE.includes(String(statusKind).toLowerCase())) return true;
        const t = this.#get(c, "status_immunity");
        if (!t) return false;
        if (t.effect_json?.weapon_only && source !== "weapon") return false;
        const want = String(t.target_type || "").toLowerCase(), kind = String(statusKind).toLowerCase();
        // immune to "poison" = the whole poison family (grass poison, venom); "mind" = self-harm, confused, schizophrenia
        return want === kind || (GameConfig.STATUS_FAMILY[want] || []).includes(kind);
    }

    static hasCurse(c) { return this.#has(c, "curse_on_ko"); }
    static hasWakeUpCall(c) { return this.#has(c, "wake_up_call"); }
    static luckyChance(c) { return this.#value(c, "lucky_day"); }
    // Melt: true if `c` must let `foe` go first (foe has the trait's attribute, e.g. FIRE)
    static melts(c, foe) { const t = this.#get(c, "melt_vs_type"); return !!t && this.#targets(t, foe.types); }
    static mindmasterChance(c) { return this.#value(c, "mindmaster"); }
    static evilCharmChance(c) { return this.#value(c, "evil_charm"); }
    static copyChance(c) { return this.#value(c, "copy_weapon"); }
    static isLoyal(c) { return this.#has(c, "loyal"); }
    static aidChance(c) { return this.#value(c, "aid_foe"); }
    static lazinessChance(c) { return this.#value(c, "laziness"); }
    static stinkChance(c) { return this.#value(c, "stink_defense_up"); }
    static giftChance(c) { return this.#value(c, "gift_foe"); }
    static saveChance(c) { return this.#value(c, "save_gold"); }
    static ancientShieldMax(c) { return this.#value(c, "ancient_shield"); }
    static judgementChance(c) { return this.#value(c, "judgement"); }
    static JUDGEMENT_TURNS = 5;
    static burnStingChance(c) { return this.#value(c, "burn_sting"); }
    static fireTrapPct(c) { return this.#value(c, "fire_trap"); }
    static tornadoChance(c) { return this.#value(c, "tornado"); }
    static faintColdChance(c) { return this.#value(c, "faint_cold"); }
    static frozenFireChance(c) { return this.#value(c, "frozen_fire"); }
    static airPlayChance(c) { return this.#value(c, "air_play"); }
    static celestialChance(c) { return this.#value(c, "celestial_light"); }
    static rotateChance(c) { return this.#value(c, "rotate"); }
    static holyWaterChance(c) { return this.#value(c, "holy_water"); }
    static santaFeChance(c) { return this.#value(c, "santa_fe"); }
    static acornChance(c) { return this.#value(c, "acorn_tree"); }
    static ACORN_DRAIN = 5;              // % of the opponent's max energy per turn
    static wraithChance(c) { return this.#value(c, "magical_wraith"); }
    static requiemChance(c) { return this.#value(c, "space_requiem"); }
    static grassFluteChance(c) { return this.#value(c, "grass_flute"); }
    static hasRobotics(c) { return this.#has(c, "robotics"); }
    static exorcismChance(c) { return this.#value(c, "witch_exorcism"); }
    static entranceChance(c) { return this.#value(c, "entrance"); }
    static infestationChance(c) { return this.#value(c, "infestation"); }
    static INFESTATION = ["poison", "sleep", "stun", "paralyze", "venom"];

    // batch 19 traits
    static get(c, effect) { return this.#get(c, effect); }      // the row (name, value, effect_json) or null
    static chance(c, effect) { return this.#value(c, effect); }
    static has(c, effect) { return this.#has(c, effect); }
    static CRUISER_BOOST = 20;            // % damage
    static MAGIC_SNOW_UP = 5;             // % S.DEF
    static FROG_JUMP_OVER = 40;           // damage it jumps away from
    static FIRE_DISASTER = { boost: 20, count: 3 };
    // batch 21
    static RAINBOW_HEAL = 50;             // % of max energy, itself and waiting teammates
    static NIGHTMARE_DMG = 10;            // energy per sleeping turn
    static LILY_ACC = 15;                 // accuracy for every weapon
    // Dumpling Punch: effect_json { stat } (default physAttack), up to VALUE%
    static selfStatUp(c) { const t = this.#get(c, "self_stat_up"); return t ? { stat: t.effect_json?.stat || "physAttack", max: Number(t.value) || 0, name: t.name } : null; }
    // Trick / Double Trick: effect_json { pdef: true, sdef: true } = which guard values turn into damage
    static trick(c) { const t = this.#get(c, "trick"); return t ? { pdef: !!t.effect_json?.pdef, sdef: t.effect_json?.sdef !== false, chance: Number(t.value) || 0, name: t.name } : null; }
    // Stone Age / 5 Elements: effect_json { types: [...], kind: "any" | "special" | "physical", pct }
    static attrBoost(c) {
        const t = this.#get(c, "attr_boost");
        return t ? { types: (t.effect_json?.types || []).map(x => String(x).toLowerCase()), kind: t.effect_json?.kind || "any",
                     pct: Number(t.effect_json?.pct) || 15, chance: Number(t.value) || 0, name: t.name } : null;
    }
    // Foe Def Down: effect_json { pdef, sdef } flat points; Torture: effect_json { kinds: [...] }
    static defDown(c) { const t = this.#get(c, "foe_def_down"); return t ? { pdef: Number(t.effect_json?.pdef) || 0, sdef: Number(t.effect_json?.sdef) || 0, chance: Number(t.value) || 0, name: t.name } : null; }
    static tortureKinds(c) { const t = this.#get(c, "torture"); return t ? (t.effect_json?.kinds || ["poison"]) : []; }

    // "★ Name — what it does" lines for the monster screens
    static html(m, { sep = "<br>", empty = "" } = {}) {
        const rows = this.list(m);
        if (!rows.length) return empty;
        return rows.map(t => `★ <b>${UI.esc(t.name)}</b> — ${UI.esc(this.describe(t))}`).join(sep);
    }
}
