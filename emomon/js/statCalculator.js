// =====================================================================
// StatCalculator - stats of an owned monster at a given level.
// Stats are not stored per monster; they are always calculated from the
// species base stats + level + nature, so they never drift out of sync.
//
// Pokemon-style growth: every stat grows in proportion to its base stat.
//   stat(Lv) = base x (1 + 2 x growth x (Lv-1)/99)   -> about 3x the base at Lv 100
//   growth = 1, a little more for rare monsters and the first attribute's strong stat
// Energy (HP): every monster reaches the 300 cap by Lv 100 at the latest; how early differs.
//   Each species has a cap level L between Lv 60 and Lv 100: high base energy, rarity and an HP-growth
//   first attribute bring it earlier (base 100 -> about Lv 60, base 40 -> Lv 100).
//   hp(Lv) = base + (300 - base) x min(1, (Lv-1)/(L-1))   (straight climb from Lv 1, then stays at 300)
// Caps: energy (HP) 300, P.ATK / P.DEF / S.ATK / S.DEF / SPD 200, accuracy 100.
//
// Stats: maxHp, physAttack, physDefense, specAttack, specDefense,
//        speed, accuracy  (species base stats 1..100 = the Lv 1 stats)
// =====================================================================
class StatCalculator {

    static MAX_HP = 300;
    static MAX_STAT = 200;
    static LV100_MULT = 3;          // a Lv 100 monster has about 3x its Lv 1 stats

    // extra growth (fraction) for the FIRST attribute of the monster, e.g. Fire grows P.ATK 15% faster
    static TYPE_GROWTH = {
        Fire: { physAttack: 0.15 }, Water: { maxHp: 0.1, specDefense: 0.05 }, Grass: { physDefense: 0.15 }, Electric: { speed: 0.15 },
        Ice: { maxHp: 0.05, specDefense: 0.1 }, Steel: { physDefense: 0.2 }, Angel: { maxHp: 0.05, specDefense: 0.1 },
        Evil: { specAttack: 0.15 }, Ghost: { speed: 0.1, specAttack: 0.05 }, Fairy: { maxHp: 0.05, specDefense: 0.1 },
        Earth: { physDefense: 0.15 }, Air: { speed: 0.15 }, Fly: { speed: 0.15 }, Bug: { physAttack: 0.1 },
        Abnormal: { specAttack: 0.1, speed: 0.05 }, Magic: { specAttack: 0.15 },
        Power: { physAttack: 0.2 }, Space: { maxHp: 0.1, specAttack: 0.1 }, Normal: { maxHp: 0.1 },
        Robot: { physDefense: 0.15, specDefense: 0.05 }, Light: { specAttack: 0.1, speed: 0.05 },
        Mind: { specAttack: 0.15, specDefense: 0.05 }
    };

    // species base stat; falls back to the old single attack / defense columns
    static base(monster, key) {
        if (key === "maxHp") return Number(monster.energy) || 60;
        if (key === "speed") return Number(monster.speed) || 20;
        const cols = { physAttack: ["phys_attack", "attack"], physDefense: ["phys_defense", "defense"],
                       specAttack: ["spec_attack", "attack"], specDefense: ["spec_defense", "defense"] }[key];
        for (const c of cols) if (monster[c] !== null && monster[c] !== undefined) return Number(monster[c]);
        return 20;
    }

    // energy at t (0 = Lv 1, 1 = Lv 100): the species base at Lv 1, reaches MAX_HP (300) at Lv 100 or earlier
    static hpAt(monster, t, rarityBonus = 0, typeGrowth = 0) {
        const b = Math.min(this.MAX_HP, this.base(monster, "maxHp"));
        const L = this.hpCapLv(b, rarityBonus, typeGrowth);
        return Math.max(1, Math.min(this.MAX_HP, Math.round(b + (this.MAX_HP - b) * Math.min(1, t * 99 / (L - 1)))));
    }

    // cap level: Lv 100 for weak / common species, down to Lv 60 for high-energy rare ones
    static hpCapLv(b, rarityBonus = 0, typeGrowth = 0) {
        const f = Math.max(0, Math.min(1, (b - 40) / 60 + rarityBonus + typeGrowth));
        return Math.round(100 - 40 * f);
    }

    // the level where a species first reaches the 300 energy cap
    static hpCapLevel(monster) {
        for (let lv = 1; lv <= 100; lv++) if (this.compute(monster, lv).maxHp >= this.MAX_HP) return lv;
        return 100;
    }

    static compute(monster, level = 1, trait = null, nature = null) {
        const lv = Math.min(100, Math.max(1, Number(level) || 1));
        const t = (lv - 1) / 99;                                      // 0 at Lv 1, 1 at Lv 100
        const rarity = Math.min(6, Math.max(1, Number(monster.rarity) || 1));
        const rarityBonus = Math.max(0, rarity - 2) * 0.05;           // rare monsters grow faster (+20% at ★6)
        const types = getMonsterTypes(monster);
        const tg = this.TYPE_GROWTH[types[0]] || {};
        const nat = GameConfig.natureMods(nature);

        const raw = key => this.base(monster, key) * (1 + (this.LV100_MULT - 1) * (1 + rarityBonus + (tg[key] || 0)) * t);
        const cap = (v, max) => Math.max(1, Math.min(max, Math.round(v)));
        const stat = key => cap(raw(key) * (nat[key] || 1), this.MAX_STAT);

        const stats = {
            maxHp:       this.hpAt(monster, t, rarityBonus, tg.maxHp || 0),   // natures don't change energy
            physAttack:  stat("physAttack"),
            physDefense: stat("physDefense"),
            specAttack:  stat("specAttack"),
            specDefense: stat("specDefense"),
            speed:       stat("speed"),
            accuracy:    Math.min(100, Math.round((Number(monster.accuracy) || 90) + 0.1 * (lv - 1)))
        };

        // `trait` may be one trait row or a list (a monster can have 2 traits)
        for (const t of [].concat(trait || [])) {
            if (t && t.effect_type === "hp_bonus" && t.is_active !== false) {
                stats.maxHp = cap(stats.maxHp * (1 + (Number(t.value) || 0) / 100), this.MAX_HP);
            }
        }
        return stats;
    }

    // current energy of an owned monster (current_hp NULL = full)
    // Lasting statuses (venom, severe burn…) keep taking hourPct % of max energy per hour since they were saved
    // (disease_since), but never below 1. The server resets that clock whenever the energy is saved.
    static currentHp(ownedRow, stats) {
        let hp = ownedRow.current_hp === null || ownedRow.current_hp === undefined
            ? stats.maxHp : Math.max(0, Math.min(stats.maxHp, Number(ownedRow.current_hp)));
        if (hp <= 1) return hp;
        let loss = 0;
        for (const d of ownedRow.diseases || []) {
            const pct = GameConfig.DISEASES[d]?.lasting ? Number(GameConfig.DISEASES[d].hourPct) || 0 : 0;
            const since = Date.parse(ownedRow.disease_since?.[d] || "");
            if (pct > 0 && since) loss += stats.maxHp * pct / 100 * Math.max(0, Date.now() - since) / 3600000;
        }
        return loss > 0 ? Math.max(1, Math.round(hp - loss)) : hp;
    }

    // "HP 120 · P.ATK 30 · P.DEF 20 · S.ATK 40 · S.DEF 25 · SPD 30"
    static summary(s) {
        return `HP ${s.maxHp} · P.ATK ${s.physAttack} · P.DEF ${s.physDefense} · S.ATK ${s.specAttack} · S.DEF ${s.specDefense} · SPD ${s.speed}`;
    }

    static monsterRequiredExp(level) { return Math.max(1, level) * 100; }   // same as SQL
    static playerRequiredExp(level) { return Math.max(1, level) * 200; }    // same as SQL
}
