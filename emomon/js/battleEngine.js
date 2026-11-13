// =====================================================================
// BattleEngine - pure battle simulation (no DOM, no database).
//
//   const result = BattleEngine.simulate(sideA, sideB, { rng: Math.random });
//
// A side (combatant) looks like:
//   { side:"A", name, level, types:["Water","Air"], trait:{...}|null,
//     stats:{maxHp, physAttack, physDefense, specAttack, specDefense, speed, accuracy}, hp,
//     weapons:[weaponRow + {uses_left, uses_max}, ...] (max 6), revive:true|false, diseases:["poison"] }
//
// The result has a list of `events` that the battle screen plays back
// with animations, plus the final state of both sides.
//
// Damage: a weapon has a physical part (phys_attack, uses P.ATK vs P.DEF)
// and a special part (spec_attack, uses S.ATK vs S.DEF). Its phys_defense /
// spec_defense guard the user until its next action.
//
// Weapon uses: every weapon use (miss included) costs 1 use. A weapon
// with 0 uses can't be picked; with no usable weapon the monster falls
// back to the Basic Attack.
//
// Turn order each turn (both monsters pick a random weapon first):
//   1. trait "first strike"         (e.g. Fishy always first vs Electric)
//   2. weapon priority              (higher first)
//   3. effective speed              (speed + buffs + trait, +10% if the
//                                    chosen weapon is effective vs the
//                                    enemy's attributes)
//   4. random
// =====================================================================
class BattleEngine {

    static simulate(sideA, sideB, opts = {}) {
        const rng = opts.rng || Math.random;
        const cfg = Object.assign({}, GameConfig, opts.config || {});
        const A = this.#prepare(sideA, "A");
        const B = this.#prepare(sideB, "B");
        const events = [];
        const sides = { A, B };
        const other = s => (s === "A" ? B : A);
        const snap = () => ({ hpA: A.hp, hpB: B.hp });
        const emit = e => events.push(Object.assign(e, snap()));
        A.foe = B; B.foe = A;                 // Buffering (the foe's trait) locks stats

        emit({ t: "start" });

        // diseases carried over from earlier battles
        for (const c of [A, B]) {
            for (const d of c.diseases) {
                const def = cfg.DISEASES[d];
                if (def && def.effect && !def.battleOnly) {   // lasting statuses (venom…) come back; a cold has no effect inside the battle
                    this.#addStatus(c, Object.assign({}, def.effect), emit, "disease");
                }
            }
        }
        // Wake-up Call trait: entering the battle wakes every sleeping monster (once per monster)
        for (const c of [A, B]) {
            if (!TraitManager.hasWakeUpCall(c) || c.src.wakeUsed) continue;
            const woke = [A, B].filter(x => x.statuses.some(s => s.kind === "sleep"));
            if (!woke.length) continue;                        // nobody asleep: it fails (and stays ready)
            c.src.wakeUsed = true;
            for (const x of woke) x.statuses = x.statuses.filter(s => s.kind !== "sleep");
            emit({ t: "wake_up", side: c.side, name: c.name, woke: woke.map(x => x.side) });
        }
        // Fire Trap trait: once per battle the opponent is trapped (WATER monsters are immune)
        for (const c of [A, B]) {
            const foe = c === A ? B : A, pct = TraitManager.fireTrapPct(c);
            if (pct <= 0 || c.src.trapUsed) continue;
            c.src.trapUsed = true;
            if (foe.types.some(t => String(t).toLowerCase() === "water")) { emit({ t: "trap_immune", side: foe.side, name: foe.name, by: c.side }); continue; }
            foe.trapped = pct;
            emit({ t: "fire_trap", side: foe.side, name: foe.name, by: c.side, pct });
        }
        // Transform trait: becomes a copy of the opponent (two transformers stay as they are)
        const tA = TraitManager.transforms(A), tB = TraitManager.transforms(B);
        if (tA !== tB) this.#transform(tA ? A : B, tA ? B : A, emit);
        // held items that work from the start (cookie, swaps…)
        for (const c of [A, B]) this.#startHeld(c, emit);
        // Ouija trait: may swap 1-2 of the opponent's weapons for do-nothing ones, for this battle only
        this.#ouija(A, B, rng, emit);
        this.#ouija(B, A, rng, emit);
        // Dojo trait: learns one random weapon of the opponent (after Ouija, so it sees the weapons in play)
        this.#dojoLearn(A, B, rng, emit);
        this.#dojoLearn(B, A, rng, emit);
        // Tornado / Frozen Fire / Celestial Light traits: once, when it enters the battle
        for (const c of [A, B]) this.#entryTraits(c, c === A ? B : A, rng, cfg, emit);

        let winner = null;
        let reason = "ko";
        let turn = 0;

        const knockedOut = c => {
            // returns true if the side is out of the battle (after revive check)
            if (c.hp > 0) return false;
            // held revive item (First Aid Kit, HP Potions, Monster Juice): one time, used up
            // (Phoenix Feather: consume "never" = once per battle, kept afterwards)
            const drug = c.chronic.includes("drug");          // drug addiction: HP items do nothing
            if (c.held?.cfg.hold === "revive" && !c.heldUsed && !c.heldRevived && !drug) {
                c.heldRevived = true;
                if (c.held.cfg.consume !== "never") c.heldUsed = true;
                c.hp = Math.max(1, Math.round(c.stats.maxHp * (Number(c.held.cfg.percent) || 100) / 100));
                c.statuses = [];
                emit({ t: "revive", side: c.side, name: c.name, hp: c.hp, item: c.held.name });
                return false;
            }
            if (drug && !c.drugNoted && (c.revive || c.held?.cfg.hold === "revive")) {
                c.drugNoted = true;
                emit({ t: "drug_block", side: c.side, name: c.name });
            }
            if (c.revive && !c.reviveUsed && !drug) {
                c.reviveUsed = true;
                c.hp = Math.max(1, Math.round(c.stats.maxHp * cfg.REVIVE_HP_PERCENT / 100));
                c.statuses = [];
                emit({ t: "revive", side: c.side, name: c.name, hp: c.hp });
                return false;
            }
            // Holy Water trait: once per battle, may come back with half its energy
            const holy = TraitManager.holyWaterChance(c);
            if (holy > 0 && !c.once.holy) {
                c.once.holy = true;
                if (rng() * 100 < holy) {
                    c.hp = Math.max(1, Math.round(c.stats.maxHp / 2));
                    c.statuses = [];
                    emit({ t: "holy_water", side: c.side, name: c.name, hp: c.hp });
                    return false;
                }
            }
            emit({ t: "faint", side: c.side, name: c.name });
            return true;
        };

        while (turn < cfg.MAX_TURNS) {
            turn++;
            emit({ t: "turn", n: turn });
            if (opts.turnHook) opts.turnHook(turn, A, B, emit);     // buff frames (simulateTeam)
            for (const c of [A, B]) this.#turnTraits(c, c === A ? B : A, rng, cfg, emit);   // Santa Fe, Exorcism, Infestation

            const wA = this.#judged(A, B, this.#dojoPick(A, rng, emit) || this.#copyPick(A, rng, emit) || this.#pickWeapon(A, rng), turn, rng, emit);
            const wB = this.#judged(B, A, this.#dojoPick(B, rng, emit) || this.#copyPick(B, rng, emit) || this.#pickWeapon(B, rng), turn, rng, emit);
            // Obesity: always moves second, whatever speed / traits / Fair Play say (both obese = normal order)
            const fatA = A.chronic.includes("obesity"), fatB = B.chronic.includes("obesity");
            // Fair Play (first turn only) beats speed and every other trait
            // Melt (once per battle, vs FIRE) and Laziness (each turn) also give the first move away
            const meltA = !A.meltUsed && TraitManager.melts(A, B), meltB = !B.meltUsed && TraitManager.melts(B, A);
            const lazyA = TraitManager.lazinessChance(A) > 0 && rng() * 100 < TraitManager.lazinessChance(A);
            const lazyB = TraitManager.lazinessChance(B) > 0 && rng() * 100 < TraitManager.lazinessChance(B);
            const fair = fatA === fatB && meltA === meltB && lazyA === lazyB && turn === 1 ? this.#fairPlay(A, B, rng, emit) : null;
            let order;
            if (fatA !== fatB) order = { first: fatA ? "B" : "A", reason: "obesity" };
            else if (meltA !== meltB) { order = { first: meltA ? "B" : "A", reason: "melt" }; (meltA ? A : B).meltUsed = true; }
            else if (lazyA !== lazyB) order = { first: lazyA ? "B" : "A", reason: "laziness" };
            else order = fair ? { first: fair, reason: "fair play" } : this.#decideOrder(A, wA, B, wB, rng, cfg);
            // Listen: the one that would go second may hear the opponent coming and attack first
            if (order.reason !== "obesity") {
                const late = order.first === "A" ? B : A, p = TraitManager.chance(late, "listen");
                if (p > 0 && late.hp > 0 && rng() * 100 < p) {
                    order = { first: late.side, reason: "listen" };
                    this.#traitEv(emit, late, "listen", "👂", "LISTEN", `${late.name} hears the opponent coming and attacks first!`);
                }
            }
            emit({ t: "order", first: order.first, reason: order.reason });

            const plan = order.first === "A" ? [[A, wA], [B, wB]] : [[B, wB], [A, wA]];
            let ended = false;

            for (const [attacker, weapon] of plan) {
                const defender = other(attacker.side);
                if (attacker.hp <= 0 || defender.hp <= 0) continue;
                // Rotate trait (team battles): skips its weapon, the next teammate in order attacks instead
                const rot = opts.rotateMate ? TraitManager.rotateChance(attacker) : 0;
                const mateSrc = rot > 0 && rng() * 100 < rot ? opts.rotateMate(attacker.side) : null;
                if (mateSrc) {
                    const mate = this.#prepare(Object.assign({}, mateSrc, { side: attacker.side }), attacker.side);
                    emit({ t: "rotate", side: attacker.side, name: attacker.name, mate: mate.name });
                    this.#act(mate, defender, this.#pickWeapon(mate, rng), rng, cfg, emit);
                } else this.#act(attacker, defender, weapon, rng, cfg, emit);
                // Rice Cake: a monster left at 10% energy or less may heal once
                for (const c of [defender, attacker]) this.#riceCake(c, rng, emit);
                for (const c of [defender, attacker]) this.#healFrame(c, opts, emit);
                if (knockedOut(defender)) {
                    this.#faintCold(defender, attacker, rng, emit);
                    // Curse trait: the one that knocked it out is left with 1 energy (once)
                    if (TraitManager.hasCurse(defender) && !defender.src.curseUsed && attacker !== defender && attacker.hp > 1) {
                        defender.src.curseUsed = true;
                        attacker.hp = 1;
                        emit({ t: "curse", side: attacker.side, name: attacker.name, by: defender.side });
                    }
                    winner = attacker.side;
                    ended = true;
                    break;
                }
                // the attacker can fall to its own damage sent back (Voodoo)
                if (attacker.hp <= 0 && knockedOut(attacker)) {
                    this.#faintCold(attacker, defender, rng, emit);
                    winner = defender.side;
                    ended = true;
                    break;
                }
            }
            if (ended) break;

            // end of turn: poison / burn / regen / buffs tick
            for (const c of [A, B]) this.#tick(c, emit);
            for (const c of [A, B]) this.#riceCake(c, rng, emit);
            for (const c of [A, B]) this.#healFrame(c, opts, emit);
            for (const c of [A, B]) this.#npcItem(c, rng, emit);
            for (const c of [A, B]) this.#acornDrain(c, c === A ? B : A, emit);
            const outA = A.hp <= 0 && knockedOut(A);
            const outB = B.hp <= 0 && knockedOut(B);
            if (outA) this.#faintCold(A, B, rng, emit);
            if (outB) this.#faintCold(B, A, rng, emit);
            if (outA && outB) { winner = null; reason = "double_ko"; break; }
            if (outA) { winner = "B"; break; }
            if (outB) { winner = "A"; break; }
        }

        if (!winner && reason === "ko") {
            // time limit: higher remaining energy % wins
            reason = "timeout";
            const pa = A.hp / A.stats.maxHp, pb = B.hp / B.stats.maxHp;
            if (Math.abs(pa - pb) > 1e-9) winner = pa > pb ? "A" : "B";
        }

        emit({ t: "end", winner, reason, turns: turn });

        return {
            winner,                      // "A" | "B" | null (draw)
            reason, turns: turn, events,
            final: {
                A: this.#finalState(A, cfg),
                B: this.#finalState(B, cfg)
            }
        };
    }

    // ------------------------------------------------------------------
    // Team battle (quests, player battles): each side has up to 6 combatants in order.
    // The first monsters fight; when one is out (fainted, or lost on
    // time) the next one of that side comes in. The survivor keeps its
    // energy and weapon uses. Events get extra { t:"switch", side, index }.
    // Returns { winner, events, turns, finalA:[...], finalB:[...] }.
    // ------------------------------------------------------------------
    static simulateTeam(teamA, teamB, opts = {}) {
        const mk = list => list.map((c, idx) => ({ src: Object.assign({}, c, { weapons: (c.weapons || []).map(w => Object.assign({}, w)) }),
                                                   idx, out: false, final: null }));
        const rng = opts.rng || Math.random;
        const A = mk(teamA), B = mk(teamB);
        const next = (list, from) => { for (let k = from; k < list.length; k++) if (!list[k].out && (list[k].src.hp ?? 1) > 0) return k; return -1; };
        const events = [];
        // Air Play trait (any monster of a line-up, once, before the first fight): if the OTHER line-up has
        // 3+ monsters, its first monster swaps places with a random other one, which then fights first.
        // (array positions swap; `idx` keeps the team order for finalA / finalB and the switch events)
        const airPlay = (team, side, list) => {
            const holder = team.find(c => TraitManager.airPlayChance(c.src) > 0);
            const k = next(list, 0);
            if (!holder || k < 0 || list.length < 3 || rng() * 100 >= TraitManager.airPlayChance(holder.src)) return;
            const pool = [];
            for (let x = k + 1; x < list.length; x++) if (!list[x].out && (list[x].src.hp ?? 1) > 0) pool.push(x);
            if (!pool.length) return;
            const x = pool[Math.floor(rng() * pool.length)];
            [list[k], list[x]] = [list[x], list[k]];
            events.push({ t: "air_play", side, by: holder.src.name, from: list[x].idx, to: list[k].idx });
        };
        airPlay(A, "B", B);
        airPlay(B, "A", A);
        let i = next(A, 0), j = next(B, 0), turns = 0;
        if (i >= 0) events.push({ t: "switch", side: "A", index: A[i].idx, first: true });
        if (j >= 0) events.push({ t: "switch", side: "B", index: B[j].idx, first: true });

        // buff frames: opts.buffs = { A: [{stat, pct, style, owner}], B: [...] }. Each fires once, at a random
        // turn (1-5) of the whole battle: +pct% to that stat for every monster of its side (the one fighting now
        // and the ones still to come).
        const pending = [];
        for (const side of ["A", "B"]) for (const b of (opts.buffs?.[side] || [])) if (b.kind !== "attr") pending.push(Object.assign({ side, at: 1 + Math.floor(rng() * 5) }, b));
        const buffSrc = (list, stat, pct) => list.forEach(c => {
            if (c.src.stats?.[stat] !== undefined) c.src.stats = Object.assign({}, c.src.stats, { [stat]: Math.round(c.src.stats[stat] * (1 + pct / 100)) });
        });
        // attribute frames / effects (kind "attr"): from the start, +pct% P.ATK (frame) or S.ATK (effect) to the
        // wearer's monsters that have that attribute (whole battle). ownerId set = only that player's monsters (team battles).
        for (const side of ["A", "B"]) for (const b of (opts.buffs?.[side] || [])) {
            if (b.kind !== "attr") continue;
            const hit = (side === "A" ? A : B).filter(c => (c.src.types || []).some(t => String(t).toLowerCase() === b.attr)
                && (b.ownerId == null || c.src.owner == null || String(c.src.owner) === String(b.ownerId)));
            if (!hit.length) continue;
            buffSrc(hit, b.stat, b.pct);
            events.push({ t: "attr_buff", side, stat: b.stat, pct: b.pct, style: b.style, attr: b.attr, owner: b.owner || "", names: hit.map(c => c.src.name) });
        }
        // Rainbow Light: when it shone last turn, every waiting (not fainted) teammate gets +50% of its max energy
        const rainbowTeam = (cA, cB, emit) => {
            for (const [live, list, k] of [[cA, A, i], [cB, B, j]]) {
                if (!live?.rainbowNow) continue;
                live.rainbowNow = false;
                const healed = [];
                list.forEach((x, n) => {
                    const max = Number(x.src.stats?.maxHp) || 0, hp = x.src.hp ?? max;
                    if (n === k || x.out || !max || hp <= 0 || hp >= max) return;
                    x.src.hp = Math.min(max, hp + Math.round(max * TraitManager.RAINBOW_HEAL / 100));
                    healed.push(x.src.name);
                });
                if (healed.length) this.#traitEv(emit, live, "rainbow_light", "🌈", "TEAM +50%", `${live.name}'s ${TraitManager.nameOf(live, "rainbow_light") || "Rainbow Light"} reaches the team — ${healed.join(", ")} +${TraitManager.RAINBOW_HEAL}% energy!`);
            }
        };
        const hasRainbow = [...A, ...B].some(c => TraitManager.chance(c.src, "rainbow_light") > 0);
        const turnHook = !pending.length && !hasRainbow ? null : (t, cA, cB, emit) => {
            if (hasRainbow) rainbowTeam(cA, cB, emit);
            for (const b of pending) {
                if (b.done || turns + t < b.at) continue;
                b.done = true;
                const live = b.side === "A" ? cA : cB;
                if (live.stats[b.stat] !== undefined) live.stats[b.stat] = Math.round(live.stats[b.stat] * (1 + b.pct / 100));
                buffSrc(b.side === "A" ? A : B, b.stat, b.pct);
                emit({ t: "frame_buff", side: b.side, stat: b.stat, pct: b.pct, style: b.style, owner: b.owner || "", name: live.name });
            }
        };
        const simOpts = Object.assign({}, opts, turnHook ? { turnHook } : {});

        // Magical Wraith trait (once per battle, when it comes in): a random fainted monster of its own line-up comes
        // back with half its energy and fights right after it. Nobody fainted = it fails.
        const wraith = (list, k, side) => {
            const c = list[k], pct = TraitManager.wraithChance(c.src);
            if (pct <= 0 || c.src.once?.wraith) return k;
            c.src.once = Object.assign({}, c.src.once, { wraith: true });
            const dead = list.filter((x, n) => n !== k && (x.out || (x.src.hp ?? 1) <= 0));
            if (rng() * 100 >= pct || !dead.length) { events.push({ t: "wraith", side, name: c.src.name, failed: true }); return k; }
            const r = dead[Math.floor(rng() * dead.length) % dead.length];
            list.splice(list.indexOf(r), 1);
            list.splice(list.indexOf(c) + 1, 0, r);
            const maxHp = r.final?.maxHp || r.src.stats?.maxHp || 100;
            r.out = false;
            r.src.hp = Math.max(1, Math.round(maxHp / 2));
            events.push({ t: "wraith", side, name: c.src.name, revived: r.src.name, index: r.idx, hp: r.src.hp });
            return list.indexOf(c);           // its own place moves when the revived one came from before it
        };
        if (i >= 0) i = wraith(A, i, "A");
        if (j >= 0) j = wraith(B, j, "B");

        // Rotate trait (team battles only, opts.teamBattle): the next living teammate after the one fighting
        if (opts.teamBattle) simOpts.rotateMate = side => {
            const list = side === "A" ? A : B, k = next(list, (side === "A" ? i : j) + 1);
            return k >= 0 ? list[k].src : null;
        };

        while (i >= 0 && j >= 0 && turns < 600) {
            const sim = this.simulate(Object.assign({}, A[i].src, { side: "A" }), Object.assign({}, B[j].src, { side: "B" }), simOpts);
            turns += sim.turns;
            for (const e of sim.events) if (e.t !== "start" && e.t !== "end") events.push(e);
            for (const [list, k, fin] of [[A, i, sim.final.A], [B, j, sim.final.B]]) {
                const c = list[k];
                c.src.hp = fin.hp;
                c.src.weapons = c.src.weapons.map(w => Object.assign(w, { uses_left: fin.weaponUses[String(w.id)] ?? w.uses_left }));
                if (fin.reviveUsed) { c.src.revive = false; c.reviveUsed = true; }
                if (fin.heldUsed) { c.heldUsed = true; c.src.held = null; }         // cookie / swap / popped balloon: only once
                c.src.diseases = fin.diseases;                                      // lasting statuses (venom…) fight on
                c.src.once = fin.once;                                              // once-per-battle traits stay used
                if (fin.lostWeapons?.length) {                                      // Space Requiem: gone for good
                    c.lost = (c.lost || []).concat(fin.lostWeapons);
                    c.src.weapons = c.src.weapons.filter(w => !fin.lostWeapons.includes(w.id));
                }
                c.lucky = (c.lucky || 0) + (fin.lucky || 0);
                c.giftGold = c.giftGold || !!fin.giftGold;
                c.saveGold = c.saveGold || !!fin.saveGold;
                c.final = fin;
            }
            if (sim.winner === "A") B[j].out = true;
            else if (sim.winner === "B") A[i].out = true;
            else { A[i].out = true; B[j].out = true; }
            let ni = next(A, i), nj = next(B, j);
            if (ni >= 0 && nj >= 0) {           // only when the fight goes on
                if (ni !== i) { events.push({ t: "switch", side: "A", index: A[ni].idx }); ni = wraith(A, ni, "A"); }
                if (nj !== j) { events.push({ t: "switch", side: "B", index: B[nj].idx }); nj = wraith(B, nj, "B"); }
            }
            i = ni; j = nj;
        }
        const winner = i >= 0 && j < 0 ? "A" : j >= 0 && i < 0 ? "B" : null;
        events.push({ t: "end", winner, reason: "team", turns });
        const fin = list => list.slice().sort((a, b) => a.idx - b.idx).map(c => ({ hp: c.src.hp ?? null, out: c.out, fought: !!c.final,
            maxHp: c.final?.maxHp, reviveUsed: !!c.reviveUsed, heldUsed: !!c.heldUsed, diseases: c.final ? c.final.diseases : (c.src.diseases || []),
            lucky: c.lucky || 0, giftGold: !!c.giftGold, saveGold: !!c.saveGold, lostWeapons: c.lost || [],
            weaponUses: Object.fromEntries(c.src.weapons.map(w => [String(w.id), w.uses_left ?? w.uses_max])) }));
        const finalA = fin(A), finalB = fin(B);
        // whole-team totals, shaped like simulate()'s `final` (trait payouts: Lucky Day, Gift, Save)
        const sum = list => ({ lucky: list.reduce((a, f) => a + f.lucky, 0), giftGold: list.some(f => f.giftGold), saveGold: list.some(f => f.saveGold),
                               reviveUsed: list.some(f => f.reviveUsed) });
        return { winner, events, turns, finalA, finalB, final: { A: sum(finalA), B: sum(finalB) } };
    }

    // ------------------------------------------------------------------
    static #prepare(src, side) {
        const stats = Object.assign({ maxHp: 100, physAttack: 20, physDefense: 20, specAttack: 20, specDefense: 20,
                                      speed: 20, accuracy: 90 }, src.stats || {});
        const hp = src.hp === undefined || src.hp === null ? stats.maxHp : Math.min(stats.maxHp, Math.max(0, src.hp));
        const weapons = (src.weapons || []).filter(Boolean).slice(0, GameConfig.MAX_WEAPONS).map(w => {
            const max = Number(w.uses_max ?? w.max_uses ?? GameConfig.DEFAULT_WEAPON_USES);
            const left = w.uses_left === null || w.uses_left === undefined ? max : Number(w.uses_left);
            return Object.assign({}, w, { usesMax: max, usesLeft: Math.max(0, Math.min(max, left)) });
        });
        return {
            side, name: src.name || side, level: src.level || 1, rarity: src.rarity || 1,
            types: getMonsterTypes(src.types || src),
            trait: src.trait || null,
            trait2: src.trait2 || null,
            trait3: src.trait3 || null,              // trait the player taught this monster
            trait4: src.once?.downloaded || null,    // trait copied by Downloading (kept across team fights)
            stats, hp, weapons,
            revive: !!src.revive, reviveUsed: false,
            diseases: (src.diseases || []).slice(),
            chronic: (src.chronic || []).slice(),      // long-lasting diseases (obesity, eyeblind, mental, drug…)
            scabiesAround: !!src.scabiesAround,        // a monster of the same player has scabies
            src,                                       // the input object: once-only traits (Curse, Wake-up Call) remember it there across team battles
            lucky: 0,                                  // Lucky Day finds this battle (paid by the server)
            statuses: [],
            guard: null,
            paraGuard: false,
            // held item (game_items row with effect_type HOLD)
            held: src.held ? { id: src.held.id, name: src.held.name, cfg: src.held.effect_config || {} } : null,
            balloon: src.held?.effect_config?.hold === "air_balloon",
            heldUsed: false,
            stealTried: false, stole: false,
            once: Object.assign({}, src.once),          // once-per-battle traits (Holy Water, Entrance, Acorn Tree…), kept across team fights
            lostWeapons: []                            // weapons deleted for good by Space Requiem
        };
    }

    // copy the opponent's attributes, weapons (full uses) and every stat except energy
    static #transform(c, target, emit) {
        c.stats = Object.assign({}, target.stats, { maxHp: c.stats.maxHp });
        c.types = target.types.slice();
        c.weapons = target.weapons.map(w => Object.assign({}, w, { usesLeft: w.usesMax }));
        c.transformedInto = target.name;
        emit({ t: "transform", side: c.side, name: c.name, into: target.name, intoSide: target.side,
               types: c.types.slice(), stats: Object.assign({}, c.stats) });
    }

    static #startHeld(c, emit) {
        if (!c.held) return;
        const h = c.held.cfg, turns = Math.max(1, Number(h.turns) || 10);
        if (h.hold === "stat_buff") c.statuses.push({ kind: "stat_buff", stat: h.stat || "physAttack", value: Number(h.value) || 0, ticks: turns });
        else if (h.hold === "atk_swap") c.statuses.push({ kind: "atk_swap", value: 0, ticks: turns });
        else if (h.hold === "def_swap") c.statuses.push({ kind: "def_swap", value: 0, ticks: turns });
        if (h.consume === "battle") c.heldUsed = true;
        emit({ t: "held", side: c.side, name: c.name, item: c.held.name, hold: h.hold, value: h.value, turns, chance: h.chance });
    }

    // a stat with swaps and stat buffs applied
    static #stat(c, key) {
        let k = key;
        const has = kind => c.statuses.some(s => s.kind === kind);
        if (has("atk_swap") && (key === "physAttack" || key === "specAttack")) k = key === "physAttack" ? "specAttack" : "physAttack";
        if (has("def_swap") && (key === "physDefense" || key === "specDefense")) k = key === "physDefense" ? "specDefense" : "physDefense";
        let v = Number(c.stats[k]) || 0;
        for (const s of c.statuses) if (s.kind === "stat_buff" && s.stat === key) v += Number(s.value) || 0;
        return v;
    }

    // Trick Or Treat: 10% heal the opponent 10% · 10% heal itself 10% · 40% special hit · 40% physical hit.
    // Returns a one-use copy of the weapon (`_src` = the real weapon, whose uses go down).
    static #trickOrTreat(w, rng) {
        const p = Number(w.phys_attack) || Number(w.spec_attack) || Number(w.power) || 30;
        const roll = rng() * 100;
        const base = { _src: w, power: 0, phys_attack: 0, spec_attack: 0, effect_chance: 100, effect_value: 10 };
        if (roll < 10) return { weapon: Object.assign({}, w, base, { effect_type: "treat_foe" }), trick: "treat_foe" };
        if (roll < 20) return { weapon: Object.assign({}, w, base, { effect_type: "heal_pct" }), trick: "treat_self" };
        if (roll < 60) return { weapon: Object.assign({}, w, base, { power: p, spec_attack: p, effect_type: "none" }), trick: "trick_special" };
        return { weapon: Object.assign({}, w, base, { power: p, phys_attack: p, effect_type: "none" }), trick: "trick_physical" };
    }

    // Dojo: learn one random weapon the opponent has (none if it has no weapons)
    static #dojoLearn(c, foe, rng, emit) {
        if (!TraitManager.hasDojo(c) || !foe.weapons.length) return;
        const w = foe.weapons[Math.floor(rng() * foe.weapons.length) % foe.weapons.length];
        // own id so it never touches the uses of a real weapon with the same id
        c.dojoWeapon = Object.assign({}, w, { id: `DOJO_${w.id}`, usesMax: 1, usesLeft: 1 });
        emit({ t: "dojo_learn", side: c.side, name: c.name, from: foe.side, weapon: w.name });
    }

    // Dojo: on one random turn it uses the learned weapon instead of its own (once per battle)
    static #dojoPick(c, rng, emit) {
        if (!c.dojoWeapon || c.dojoUsed || c.hp <= 0) return null;
        if (c.statuses.some(s => this.#skips(s.kind))) return null;   // keep it for a turn it can act
        if (rng() * 100 >= TraitManager.DOJO_USE_CHANCE) return null;
        c.dojoUsed = true;
        emit({ t: "dojo_use", side: c.side, name: c.name, weapon: c.dojoWeapon.name });
        return c.dojoWeapon;
    }

    // Judgement (the foe's trait): in the first 5 turns, VALUE% chance that `c` can't use the attack weapon it picked.
    // It uses one of its non-attack weapons instead, or loses the turn. The PURE default attack is never blocked.
    static #judged(c, foe, w, turn, rng, emit) {
        const chance = TraitManager.judgementChance(foe);
        if (chance <= 0 || turn > TraitManager.JUDGEMENT_TURNS || !w || w.id === "BASIC" || this.weaponPower(w).total <= 0) return w;
        if (rng() * 100 >= chance) return w;
        const others = c.weapons.filter(x => x.usesLeft > 0 && this.weaponPower(x).total <= 0);
        emit({ t: "judgement", side: c.side, name: c.name, by: foe.side, blocked: w.name, swapped: others.length > 0 });
        return others.length ? others[Math.floor(rng() * others.length) % others.length] : { id: "JUDGED", name: w.name, judged: true };
    }

    // Copy trait: VALUE% chance to use the weapon the opponent last used on it (its own uses don't go down)
    static #copyPick(c, rng, emit) {
        const chance = TraitManager.copyChance(c);
        if (chance <= 0 || !c.foeLastWeapon || c.hp <= 0) return null;
        if (c.statuses.some(s => this.#skips(s.kind))) return null;
        if (rng() * 100 >= chance) return null;
        const w = Object.assign({}, c.foeLastWeapon, { _copied: true, _src: {} });
        c.foeLastWeapon = null;                         // one copy per weapon use
        emit({ t: "copy", side: c.side, name: c.name, weapon: w.name });
        return w;
    }

    // Fair Play (first turn): VALUE% chance to let the opponent go first. Returns the side that goes first, or null.
    static #fairPlay(A, B, rng, emit) {
        const yields = c => { const p = TraitManager.fairPlayChance(c); return p > 0 && rng() * 100 < p; };
        const ya = yields(A), yb = yields(B);
        if (ya === yb) return null;                     // nobody (or both) stepped back: normal order
        const polite = ya ? A : B;
        emit({ t: "fair_play", side: polite.side, name: polite.name });
        return polite === A ? B.side : A.side;
    }

    // Heal Frame (the owner wears it): each of the owner's monsters, the first time it drops to half energy or less,
    // gets 10% of its max energy back - once per monster. opts.healFrame = { A: owner name, or { playerId: name } in team battles, B: … }
    static #healFrame(c, opts, emit) {
        const hf = opts.healFrame?.[c.side], owner = typeof hf === "string" ? hf : hf?.[String(c.src?.owner)];
        if (!owner || c.hp <= 0 || c.once?.heal_frame || c.hp > c.stats.maxHp / 2) return;
        c.once = Object.assign({}, c.once, { heal_frame: true });
        const before = c.hp;
        c.hp = Math.min(c.stats.maxHp, c.hp + Math.round(c.stats.maxHp * (Number(GameConfig.HEAL_FRAME_PCT) || 10) / 100));
        emit({ t: "heal_frame", side: c.side, name: c.name, owner, amount: c.hp - before });
    }

    // Rice Cake: the first time its energy drops to 10% or less (still standing), one roll:
    // VALUE% chance to recover 30% of its max energy. Once per battle.
    static #riceCake(c, rng, emit) {
        const chance = TraitManager.riceCakeChance(c);
        if (chance <= 0 || c.riceRolled || c.hp <= 0 || c.hp > c.stats.maxHp * TraitManager.RICE_CAKE_BELOW / 100) return;
        c.riceRolled = true;
        if (rng() * 100 >= chance) return;
        const before = c.hp;
        c.hp = Math.min(c.stats.maxHp, c.hp + Math.round(c.stats.maxHp * TraitManager.RICE_CAKE_HEAL / 100));
        emit({ t: "rice_cake", side: c.side, name: c.name, amount: c.hp - before });
    }

    // quest NPCs / bosses: a potion from the team's list when energy is low (35% or less), 60% chance per turn end
    static #npcItem(c, rng, emit) {
        const items = c.src?.npcItems;
        if (!items || !items.length || c.hp <= 0 || c.hp > c.stats.maxHp * 0.35 || rng() >= 0.6) return;
        const it = items.shift();
        const before = c.hp;
        c.hp = Math.min(c.stats.maxHp, c.hp + Math.round(c.stats.maxHp * (Number(it.pct) || 30) / 100));
        emit({ t: "npc_item", side: c.side, name: c.name, item: it.name || "Potion", amount: c.hp - before });
    }

    // Ouija: 2 weapons -> 1 becomes Space Out; 3 or more -> 2 random ones become Space Out and No Move;
    // 1 weapon -> nothing. The real weapons are kept in `ouijaOriginal` and come back after the battle.
    static #ouija(c, foe, rng, emit) {
        const chance = TraitManager.ouijaChance(c);
        const n = foe.weapons.length;
        if (chance <= 0 || n < 2 || rng() * 100 >= chance) return;
        const slots = [...Array(n).keys()];
        for (let i = slots.length - 1; i > 0; i--) {             // shuffle
            const j = Math.floor(rng() * (i + 1));
            [slots[i], slots[j]] = [slots[j], slots[i]];
        }
        const picks = slots.slice(0, n === 2 ? 1 : 2);
        foe.ouijaOriginal = foe.ouijaOriginal || foe.weapons.slice();
        foe.weapons = foe.weapons.slice();
        const swapped = picks.map((slot, k) => {
            const fake = GameConfig.OUIJA_WEAPONS[k];
            const from = foe.weapons[slot].name;
            foe.weapons[slot] = Object.assign({}, fake, { usesMax: fake.max_uses, usesLeft: fake.max_uses });
            return { from, to: fake.name };
        });
        emit({ t: "ouija", side: foe.side, name: foe.name, by: c.side, swapped });
    }

    static #pickWeapon(c, rng) {
        const usable = c.weapons.filter(w => w.usesLeft > 0);
        if (!usable.length) return c.basic || (c.basic = GameConfig.basicAttack(c.level, c.rarity));   // its own default attack
        return usable[Math.floor(rng() * usable.length) % usable.length];
    }

    // physical / special power of a weapon (old rows only have `power` = physical)
    static weaponPower(w) {
        let p = Number(w.phys_attack) || 0, s = Number(w.spec_attack) || 0;
        if (!p && !s) p = Number(w.power) || 0;
        return { phys: p, spec: s, total: p + s };
    }

    static #buff(c, kind) {
        return c.statuses.filter(s => s.kind === kind).reduce((a, s) => a + (Number(s.value) || 0), 0);
    }

    static effectiveSpeed(c, weapon, enemy, cfg = GameConfig) {
        let speed = (Number(c.stats.speed) || 0) + TraitManager.speedBonus(c)
            + (c.statuses || []).filter(s => s.kind === "speed_up").reduce((a, s) => a + (Number(s.value) || 0), 0);   // speed-up weapons
        if (weapon && this.weaponPower(weapon).total > 0 && getTypeModifier(weapon.attribute, enemy.types) > 1) {
            speed *= 1 + cfg.EFFECTIVE_SPEED_BONUS;
        }
        return speed;
    }

    static #decideOrder(A, wA, B, wB, rng, cfg) {
        const fa = TraitManager.firstStrike(A, B), fb = TraitManager.firstStrike(B, A);
        if (fa !== fb) {
            const s = fa ? A : B;
            const t = TraitManager.firstStrikeTrait(s, s === A ? B : A);
            return { first: s.side, reason: `trait: ${t.name || t.id}` };
        }
        const pa = Number(wA.priority) || 0, pb = Number(wB.priority) || 0;
        if (pa !== pb) return { first: pa > pb ? "A" : "B", reason: "weapon priority" };
        const sa = this.effectiveSpeed(A, wA, B, cfg), sb = this.effectiveSpeed(B, wB, A, cfg);
        if (sa !== sb) return { first: sa > sb ? "A" : "B", reason: "speed" };
        return { first: rng() < 0.5 ? "A" : "B", reason: "random" };
    }

    static #act(att, def, weapon, rng, cfg, emit) {
        // stunned / paralyzed / asleep: skip this action
        const para = att.statuses.find(s => this.#skips(s.kind));
        if (para) {
            para.ticks--;
            if (para.ticks <= 0) {
                att.statuses = att.statuses.filter(s => s !== para);
                att.paraGuard = true;             // can't be paralyzed / put to sleep again until it acts once
                emit({ t: "status_end", side: att.side, name: att.name, kind: para.kind });
            }
            emit({ t: "skip", side: att.side, name: att.name, reason: para.kind });
            return;
        }
        // Whistle (held): once per battle, on a random own turn, the opponent falls asleep
        if (att.held?.cfg.hold === "sleep_whistle" && !att.whistleUsed && def.hp > 0 && rng() * 100 < (Number(att.held.cfg.chance) || 30)) {
            att.whistleUsed = true;
            const slept = this.#addStatus(def, { kind: "sleep", value: 0, ticks: Number(att.held.cfg.turns) || 2 }, emit);
            emit({ t: "whistle", side: att.side, name: att.name, item: att.held.name, target: def.side, slept });
        }
        // Scabies: while a monster of the same player has scabies, every own turn may be lost to paralysis
        if (att.scabiesAround && rng() * 100 < cfg.SCABIES_PARALYZE) {
            emit({ t: "skip", side: att.side, name: att.name, reason: "scabies" });
            return;
        }
        // Judgement blocked its attack and it had nothing else to use
        if (weapon?.judged) { emit({ t: "skip", side: att.side, name: att.name, reason: "judgement" }); return; }
        // Fire Trap: using a WATER or EARTH weapon breaks free
        if (att.trapped && ["water", "earth"].includes(String(weapon.attribute || "").toLowerCase())) {
            att.trapped = 0;
            emit({ t: "trap_escape", side: att.side, name: att.name });
        }
        // Evil Charm (the opponent's trait): paralyzed for this turn and hurts itself
        const charm = TraitManager.evilCharmChance(def);
        if (charm > 0 && rng() * 100 < charm) {
            const before = att.hp;
            att.hp = Math.max(1, att.hp - Math.max(1, Math.round(att.stats.maxHp * TraitManager.EVIL_CHARM_SELF / 100)));
            emit({ t: "evil_charm", side: att.side, name: att.name, by: def.side, amount: before - att.hp });
            return;
        }
        att.paraGuard = false;
        att.guard = null;                         // the guard of its last weapon ends when it acts again
        // Burn Sting: a healthy opponent (no status at all) may get burn AND poison
        const bs = TraitManager.burnStingChance(att);
        if (bs > 0 && def.hp > 0 && !def.statuses.length && rng() * 100 < bs) {
            const b = this.#addStatus(def, Object.assign({}, cfg.DISEASES.burn.effect), null);
            const p = this.#addStatus(def, Object.assign({}, cfg.DISEASES.poison.effect), null);
            emit({ t: "burn_sting", side: def.side, name: def.name, by: att.side, burn: b, poison: p });
        }
        // Lucky Day: finds money for its trainer
        const luck = TraitManager.luckyChance(att);
        if (luck > 0 && rng() * 100 < luck) { att.lucky++; emit({ t: "lucky", side: att.side, name: att.name }); }
        // Aid: heals the opponent a little
        const aid = TraitManager.aidChance(att);
        if (aid > 0 && def.hp > 0 && def.hp < def.stats.maxHp && rng() * 100 < aid) {
            const before = def.hp;
            def.hp = Math.min(def.stats.maxHp, def.hp + Math.max(1, Math.round(def.stats.maxHp * TraitManager.AID_HEAL / 100)));
            emit({ t: "aid", side: def.side, name: def.name, by: att.side, amount: def.hp - before });
        }
        // Stink: ONE roll per battle (on its first turn): VALUE% chance of P.DEF and S.DEF +10%
        const stink = TraitManager.stinkChance(att);
        if (stink > 0 && !att.stinkDone && (att.stinkDone = true) && rng() * 100 < stink && !this.#locked(att)) {
            att.stats = Object.assign({}, att.stats, { physDefense: Math.round(att.stats.physDefense * 1.1), specDefense: Math.round(att.stats.specDefense * 1.1) });
            emit({ t: "stink", side: att.side, name: att.name });
        }
        // Save: ONE roll per battle (on its first turn): VALUE% chance of 100-500 G for its own trainer
        const save = TraitManager.saveChance(att);
        if (save > 0 && !att.saveDone && (att.saveDone = true) && rng() * 100 < save) {
            att.saveGold = true;                                            // paid by the server to its own trainer
            emit({ t: "save", side: att.side, name: att.name });
        }
        // Ancient Shield: once per battle (its first turn): P.DEF and S.DEF up by 1..VALUE % each
        const shield = TraitManager.ancientShieldMax(att);
        if (shield > 0 && !att.shieldDone && (att.shieldDone = true) && !this.#locked(att)) {
            const p = 1 + Math.floor(rng() * shield), s = 1 + Math.floor(rng() * shield);
            att.stats = Object.assign({}, att.stats, { physDefense: Math.round(att.stats.physDefense * (100 + p) / 100),
                                                       specDefense: Math.round(att.stats.specDefense * (100 + s) / 100) });
            emit({ t: "ancient_shield", side: att.side, name: att.name, pdef: p, sdef: s });
        }
        // Dumpling Punch (self_stat_up): once per battle (its first turn), one of its stats up by 1..VALUE %
        const su = TraitManager.selfStatUp(att);
        if (su && su.max > 0 && !att.once.self_stat_up && (att.once.self_stat_up = true) && !this.#locked(att) && att.stats[su.stat] !== undefined) {
            const p = 1 + Math.floor(rng() * su.max);
            att.stats = Object.assign({}, att.stats, { [su.stat]: Math.round(att.stats[su.stat] * (100 + p) / 100) });
            const lbl = GameConfig.STAT_LABELS?.[su.stat] || su.stat;
            this.#traitEv(emit, att, "self_stat_up", "🥟", `${lbl} +${p}%`, `${att.name}'s ${su.name}: ${lbl} +${p}% for this battle!`);
        }
        // Gift: ONE roll per battle (on its first turn): VALUE% chance of a present for the opponent
        const gift = TraitManager.giftChance(att);
        if (gift > 0 && !att.giftDone && def.hp > 0 && (att.giftDone = true) && rng() * 100 < gift) {   // ONE roll per battle (its first turn)
            const roll = rng() * 100;
            const kind = roll < 30 ? "spatk" : roll < 60 ? "patk" : roll < 70 ? "gold" : "heal";
            let amount = 0;
            if (kind === "spatk") def.stats = Object.assign({}, def.stats, { specAttack: Math.round(def.stats.specAttack * 1.1) });
            else if (kind === "patk") def.stats = Object.assign({}, def.stats, { physAttack: Math.round(def.stats.physAttack * 1.1) });
            else if (kind === "gold") att.giftGold = true;                 // paid by the server to the opponent's trainer
            else { const before = def.hp; def.hp = Math.min(def.stats.maxHp, def.hp + Math.round(def.stats.maxHp * 0.1)); amount = def.hp - before; }
            emit({ t: "gift", side: att.side, name: att.name, to: def.side, kind, amount });
        }
        // Copy (the opponent's trait) remembers the weapon used against it
        if (!weapon._copied) def.foeLastWeapon = weapon._src || weapon;

        // Trick Or Treat: the weapon turns into one of four outcomes each time it is used
        let trick = null;
        if (weapon.effect_type === "trick_or_treat") ({ weapon, trick } = this.#trickOrTreat(weapon, rng));
        const src = weapon._src || weapon;        // the real weapon (its uses go down)

        const effect = GameConfig.WEAPON_EFFECTS[weapon.effect_type] || GameConfig.WEAPON_EFFECTS.none;
        const pw = this.weaponPower(weapon);
        const power = pw.total;
        const selfOnly = power <= 0 && (effect.target === "self" || weapon.effect_type === "treat_foe");
        if (src.usesLeft !== undefined) src.usesLeft = Math.max(0, src.usesLeft - 1);
        // Celestial Light (the opponent's trait): LIGHT weapons do nothing
        if (att.lightBlocked && weapon.id !== "BASIC" && String(weapon.attribute || "").toLowerCase() === "light") {
            emit({ t: "skip", side: att.side, name: att.name, reason: "celestial", weapon: weapon.name });
            return;
        }

        // Robotics (the opponent's trait): the first ROBOT weapon used against it does nothing (once per battle)
        if (TraitManager.hasRobotics(def) && !def.once.robotics && weapon.id !== "BASIC" && String(weapon.attribute || "").toLowerCase() === "robot") {
            def.once.robotics = true;
            emit({ t: "skip", side: att.side, name: att.name, reason: "robotics", weapon: weapon.name, by: def.side });
            return;
        }
        // Bao Bao Throw (the opponent's trait): multi-hit weapons can't be used against it
        if (weapon.effect_type === "multi_hit" && TraitManager.has(def, "no_multi_hit")) {
            this.#traitEv(emit, def, "no_multi_hit", "🥟", "BLOCKED", `${def.name}'s ${TraitManager.nameOf(def, "no_multi_hit") || "Bao Bao Throw"} — ${att.name} can't use the multi-hit weapon ${weapon.name}!`, { by: def.side });
            return;
        }
        // Crawl (defender's trait): using a weapon may lower the attacker's accuracy, from this attack on
        const crawl = TraitManager.crawlChance(def);
        if (crawl > 0 && (att.accDown || 0) < TraitManager.CRAWL_MAX && rng() * 100 < crawl) {
            att.accDown = Math.min(TraitManager.CRAWL_MAX, (att.accDown || 0) + TraitManager.CRAWL_STEP);
            emit({ t: "crawl", side: att.side, name: att.name, by: def.side, accDown: att.accDown });
        }

        // Flood (attacker's trait): using a WATER weapon may raise WATER weapon power, from this attack on
        const isWater = String(weapon.attribute || "").toLowerCase() === "water";
        const flood = isWater && power > 0 ? TraitManager.floodChance(att) : 0;
        if (flood > 0 && (att.floodUp || 0) < TraitManager.FLOOD_MAX && rng() * 100 < flood) {
            att.floodUp = Math.min(TraitManager.FLOOD_MAX, (att.floodUp || 0) + TraitManager.FLOOD_STEP);
            emit({ t: "flood", side: att.side, name: att.name, floodUp: att.floodUp });
        }

        // Target / Sniper: a bonus for the NEXT weapon (not when that next weapon is Target / Sniper again; Sniper only for weapons that can crit)
        let nextAcc = 0, nextCrit = 0;
        if (att.nextAccUp) { if (weapon.effect_type !== "next_acc_up") nextAcc = att.nextAccUp; att.nextAccUp = 0; }
        if (att.nextCritUp) { if (weapon.effect_type !== "next_crit_up" && power > 0) nextCrit = att.nextCritUp; att.nextCritUp = 0; }

        // Mental illness: an attack / status weapon may be used on ITSELF (damage and statuses)
        const hitsFoe = power > 0 || (effect.target === "enemy" && !["none", "ignore_defense", "critical_up"].includes(weapon.effect_type || "none"));
        // Mindmaster (the opponent's trait) does the same with its own chance
        const mm = TraitManager.mindmasterChance(def);
        const selfReason = !selfOnly && hitsFoe
            ? (att.chronic.includes("mental") && rng() * 100 < cfg.MENTAL_SELF_HIT ? "mental" : mm > 0 && rng() * 100 < mm ? "mindmaster" : null) : null;
        const selfHit = !!selfReason;
        if (selfHit) def = att;

        const ev = {
            t: "attack", side: att.side, name: att.name, target: def.name, selfHit, selfReason,
            weapon: { id: weapon.id, name: weapon.name, attribute: weapon.attribute,
                      sprite_sheet: weapon.sprite_sheet || weapon.projectile_sprite_sheet || null,
                      sprite_config: weapon.sprite_config || null, image: weapon.image || null, power,
                      kind: (Number(weapon.phys_attack) || 0) >= (Number(weapon.spec_attack) || 0) ? "physical" : "special",
                      rare: power >= 50 || (weapon.allowed_monster_ids || []).length > 0 || (Number(weapon.price) || 0) >= 5000,
                      usesLeft: src.usesLeft ?? null, usesMax: src.usesMax ?? null },
            hit: true, damage: 0, crit: false, modifier: 1, message: "", effects: [], trick
        };

        // weapon guard (its phys_defense / spec_defense) - also when it misses
        const gp = Number(weapon.phys_defense) || 0, gs = Number(weapon.spec_defense) || 0;
        if (gp || gs) {
            att.guard = { phys: gp, spec: gs };
            ev.guard = { phys: gp, spec: gs };
            // Trick / Double Trick (attacker's trait): the guard value also hits the opponent
            const tr = TraitManager.trick(att);
            const trickDmg = tr ? (tr.sdef ? gs : 0) + (tr.pdef ? gp : 0) : 0;
            if (trickDmg > 0 && !selfHit && def !== att && def.hp > 0 && rng() * 100 < tr.chance) {
                const before = def.hp;
                def.hp = Math.max(0, def.hp - Math.round(trickDmg));
                this.#traitEv(emit, def, "trick", "🎩", `TRICK −${before - def.hp}`, `${att.name}'s ${tr.name}: the guard of ${weapon.name} turns into an attack — ${def.name} loses ${before - def.hp} energy!`, { by: att.side, damage: before - def.hp });
            }
        }

        // weapons with no power, no effect and no guard (Space Out, No Move, Good Mind): nothing happens
        if (power <= 0 && (weapon.effect_type || "none") === "none" && !gp && !gs) {
            ev.nothing = true;
            emit(ev);
            return;
        }

        // accuracy
        if (!selfOnly) {
            const weaponAcc = (weapon.accuracy === null || weapon.accuracy === undefined ? 95 : Number(weapon.accuracy)) + nextAcc;   // + Target
            // obesity x0.8, eyeblind x0.5 (both diseases: both apply)
            const sick = (att.chronic.includes("obesity") ? cfg.OBESITY_ACCURACY : 1) * (att.chronic.includes("eyeblind") ? cfg.EYEBLIND_ACCURACY : 1);
            const chance = Math.max(5, Math.min(100,
                (weaponAcc * (Number(att.stats.accuracy) || 100) / 100 + TraitManager.accuracyBonus(att)) * (1 - (att.accDown || 0) / 100) * sick));
            if (rng() * 100 >= chance) {
                ev.hit = false;
                emit(ev);
                return;
            }
            // Perfume: the attacker is attracted and misses
            if (!selfHit && def.held?.cfg.hold === "evasion" && rng() * 100 < (Number(def.held.cfg.chance) || 0)) {
                ev.hit = false;
                ev.attracted = true;
                emit(ev);
                return;
            }
            // Pesticide (held): blocks one attack of its attribute (BUG) once per battle, CHANCE%
            const tb = def.held?.cfg;
            if (!selfHit && power > 0 && tb?.hold === "type_block" && !def.typeBlockUsed
                && String(weapon.attribute || "").toLowerCase() === String(tb.attribute || "Bug").toLowerCase()) {
                def.typeBlockUsed = true;
                if (rng() * 100 < (Number(tb.chance) || 90)) {
                    ev.hit = false;
                    ev.blockedBy = def.held.name;
                    emit(ev);
                    return;
                }
            }
        }

        // Defying Gravity (the defender's trait): EARTH weapons and moves do nothing to it
        const attr = String(weapon.attribute || "").toLowerCase();
        if (!selfHit && !selfOnly && attr === "earth" && weapon.id !== "BASIC" && TraitManager.has(def, "defying_gravity")) {
            ev.hit = false;
            ev.modifier = 0;
            ev.gravity = true;
            this.#traitEv(emit, def, "defying_gravity", "🪐", "NO GRAVITY", `${def.name} floats free of gravity — the EARTH weapon ${weapon.name} has no effect!`);
            emit(ev);
            return;
        }
        const after = [];          // trait heals shown right after this attack (Neuroscience)

        // damage
        if (power > 0) {
            const isEarth = attr === "earth";
            let modifier = getTypeModifier(weapon.attribute, def.types);
            if (def.balloon && isEarth) { modifier = 0; ev.balloonBlock = true; }   // Air Balloon: immune to EARTH
            ev.modifier = modifier;
            ev.message = getTypeMessageFromModifier(modifier);
            if (modifier === 0) {
                ev.damage = 0;
            } else {
                const atkUp = this.#buff(att, "attack_up"), defUp = this.#buff(def, "defense_up");
                const ignore = weapon.effect_type === "ignore_defense";
                const lvScale = GameConfig.levelScale(att.level);
                // Electric Wind (attacker's trait): ELECTRIC / FLY weapon with special power -> chance of S.ATK +10%
                const windChance = pw.spec > 0 && ["electric", "fly"].includes(String(weapon.attribute || "").toLowerCase())
                    ? TraitManager.electricWindChance(att) : 0;
                const wind = windChance > 0 && rng() * 100 < windChance;
                if (wind) ev.effects.push({ kind: "electric_wind", on: att.side });
                const part = (pow, atkStat, defStat, guard) => {
                    if (pow <= 0) return 0;
                    const boost = wind && atkStat === "specAttack" ? 1 + TraitManager.ELECTRIC_WIND_BOOST / 100 : 1;
                    const atk = Math.max(1, (this.#stat(att, atkStat) + atkUp) * boost);
                    const dfn = ignore ? 0 : Math.max(0, this.#stat(def, defStat) + defUp + (def.guard?.[guard] || 0));
                    const dmg = (pow * lvScale + atk * cfg.ATTACK_WEIGHT) * (atk / (atk + dfn));
                    // Ghost Gauntlet (held): physical power of its attribute (GHOST) +VALUE%
                    const pb = att.held?.cfg;
                    const gaunt = guard === "phys" && pb?.hold === "power_boost" && pb.kind !== "special"
                        && String(weapon.attribute || "").toLowerCase() === String(pb.attribute || "Ghost").toLowerCase() ? 1 + (Number(pb.value) || 10) / 100 : 1;
                    return guard === "phys" ? dmg * gaunt * TraitManager.physicalMultiplier(def, weapon) : dmg;   // e.g. Sunglasses
                };
                let critChance = cfg.BASE_CRIT + TraitManager.critBonus(att) + nextCrit   // + Sniper
                    + (weapon.effect_type === "critical_up" ? Number(weapon.effect_value) || 0 : 0);
                ev.crit = rng() * 100 < critChance;
                const stab = att.types.some(t => t.toLowerCase() === String(weapon.attribute || "").toLowerCase())
                    ? cfg.STAB : 1;
                const [r0, r1] = cfg.DAMAGE_RANDOM;
                const physPart = part(pw.phys, "physAttack", "physDefense", "phys");
                const specPart = part(pw.spec, "specAttack", "specDefense", "spec");
                let dmg = (physPart + specPart) * cfg.DAMAGE_K;
                // Fire Disaster (attacker's trait): its first 3 FIRE attacks +20%, and resisted counts as x2
                let mod = modifier;
                if (attr === "fire" && !selfHit && TraitManager.has(att, "fire_disaster") && (att.once.fire_disaster || 0) < TraitManager.FIRE_DISASTER.count) {
                    att.once.fire_disaster = (att.once.fire_disaster || 0) + 1;
                    const forced = mod < 1;
                    if (forced) { mod = 2; ev.modifier = 2; ev.message = getTypeMessageFromModifier(2); }
                    dmg *= 1 + TraitManager.FIRE_DISASTER.boost / 100;
                    this.#traitEv(emit, att, "fire_disaster", "🔥", `FIRE DISASTER ${att.once.fire_disaster}/${TraitManager.FIRE_DISASTER.count}`,
                        `${att.name}'s Fire Disaster (${att.once.fire_disaster}/${TraitManager.FIRE_DISASTER.count}): +${TraitManager.FIRE_DISASTER.boost}% damage${forced ? " and the resistance burns away — x2!" : "!"}`);
                }
                // Cruiserweight (attacker's trait): POWER weapon with physical power, VALUE% chance of +20%
                const cw = TraitManager.chance(att, "cruiserweight");
                if (cw > 0 && attr === "power" && pw.phys > 0 && rng() * 100 < cw) {
                    dmg *= 1 + TraitManager.CRUISER_BOOST / 100;
                    this.#traitEv(emit, att, "cruiserweight", "🥊", "CRUISERWEIGHT", `${att.name} throws a Cruiserweight punch — +${TraitManager.CRUISER_BOOST}% damage!`);
                }
                // Stone Age / 5 Elements (attacker's trait): weapons of its listed attributes, VALUE% chance of +pct%
                const ab = TraitManager.attrBoost(att);
                if (ab && ab.types.includes(attr) && (ab.kind === "any" || (ab.kind === "special" ? pw.spec > 0 : pw.phys > 0)) && rng() * 100 < ab.chance) {
                    dmg *= 1 + ab.pct / 100;
                    this.#traitEv(emit, att, "attr_boost", "🌀", `+${ab.pct}%`, `${att.name}'s ${ab.name} powers up ${weapon.name} — +${ab.pct}% damage!`);
                }
                dmg *= mod * stab * TraitManager.damageMultiplier(att, def, weapon);
                if (isWater) dmg *= 1 + (att.floodUp || 0) / 100;                           // Flood
                dmg *= ev.crit ? cfg.CRIT_MULTIPLIER : 1;
                // multi-hit weapons (e.g. Claw) strike 1..VALUE times in a row, each hit with its own damage roll
                const hits = weapon.effect_type === "multi_hit"
                    ? 1 + Math.floor(rng() * Math.max(1, Number(weapon.effect_value) || 1)) : 1;
                let total = 0;
                for (let h = 0; h < hits; h++) total += Math.max(1, Math.round(dmg * (r0 + (r1 - r0) * rng())));
                ev.damage = total;
                if (weapon.effect_type === "multi_hit") ev.hits = hits;
                // how much of the damage was physical / special (for Voodoo)
                ev.physDamage = physPart + specPart > 0 ? Math.round(ev.damage * physPart / (physPart + specPart)) : 0;
                ev.specDamage = ev.damage - ev.physDamage;
            }
            // Frog Jump (defender's trait): one try per battle, jumps away from a strong attack
            const frog = TraitManager.chance(def, "frog_jump");
            if (frog > 0 && !selfHit && !def.once.frog && ev.damage > TraitManager.FROG_JUMP_OVER) {
                def.once.frog = true;
                if (rng() * 100 < frog) {
                    this.#traitEv(emit, def, "frog_jump", "🐸", "FROG JUMP!", `${def.name} leaps high with a Frog Jump — the ${ev.damage}-damage attack misses!`);
                    ev.hit = false; ev.damage = 0; ev.physDamage = 0; ev.specDamage = 0; ev.dodged = true;
                    emit(ev);
                    return;
                }
            }
            // Reverse (defender's trait): once per battle, the hit heals it instead (not at full energy)
            const rev = TraitManager.chance(def, "reverse");
            if (rev > 0 && !selfHit && !def.once.reverse && ev.damage > 0 && def.hp > 0 && def.hp < def.stats.maxHp && rng() * 100 < rev) {
                def.once.reverse = true;
                const before = def.hp;
                def.hp = Math.min(def.stats.maxHp, def.hp + ev.damage);
                this.#traitEv(emit, def, "reverse", "🙃", `REVERSE +${def.hp - before}`, `${def.name} flips upside down — Reverse turns ${ev.damage} damage into +${def.hp - before} energy!`, { heal: def.hp - before });
                ev.reversed = ev.damage; ev.damage = 0; ev.physDamage = 0; ev.specDamage = 0;
            }
            def.hp = Math.max(0, def.hp - ev.damage);
            // Water Lily Blessing (defender's trait): once per battle, when hit, every weapon +15 accuracy
            const lily = TraitManager.chance(def, "lily_blessing");
            if (lily > 0 && !selfHit && ev.damage > 0 && def.hp > 0 && !def.once.lily && (def.once.lily = true) && rng() * 100 < lily) {
                after.push(() => {
                    for (const w of def.weapons || []) w.accuracy = Math.min(100, (w.accuracy === null || w.accuracy === undefined ? 95 : Number(w.accuracy)) + TraitManager.LILY_ACC);
                    this.#traitEv(emit, def, "lily_blessing", "🪷", `ACCURACY +${TraitManager.LILY_ACC}`, `${def.name}'s ${TraitManager.nameOf(def, "lily_blessing") || "Water Lily Blessing"} — all its weapons get +${TraitManager.LILY_ACC} accuracy!`);
                });
            }
            // Neuroscience (defender's trait): a special hit it survives may restore its energy fully
            const neuro = TraitManager.chance(def, "neuroscience");
            if (neuro > 0 && !selfHit && ev.specDamage > 0 && def.hp > 0 && def.hp < def.stats.maxHp && rng() * 100 < neuro) {
                after.push(() => {
                    const before = def.hp;
                    def.hp = def.stats.maxHp;
                    this.#traitEv(emit, def, "neuroscience", "🧠", `NEUROSCIENCE +${def.hp - before}`, `${def.name}'s Neuroscience rewires the hit — energy fully restored (+${def.hp - before})!`, { heal: def.hp - before });
                });
            }
            // Voodoo / Voodoo 2.0 (defender's trait): may send the physical / special damage back, if it survives
            const voodoo = TraitManager.reflect(def);
            const back = voodoo && def.hp > 0 && !selfHit ? (voodoo.part === "phys" ? ev.physDamage : ev.specDamage) || 0 : 0;
            if (back > 0 && rng() * 100 < voodoo.chance) {
                const before = att.hp;
                att.hp = Math.max(0, att.hp - back);
                ev.effects.push({ kind: "reflect", on: att.side, by: def.side, part: voodoo.part, amount: before - att.hp });
            }
            // Air Balloon pops when any other attack hits
            if (def.balloon && !isEarth) {
                def.balloon = false;
                def.heldUsed = true;
                ev.effects.push({ kind: "balloon_pop", on: def.side });
            }
            // X-Ray family (attacker's trait): a hit may stun the opponent (it loses one action)
            const stun = TraitManager.paralyzeChance(att);
            if (stun > 0 && ev.damage > 0 && def.hp > 0 && rng() * 100 < stun) {
                const applied = this.#addStatus(def, { kind: "stun", value: 0, ticks: 1 }, null);
                ev.effects.push({ kind: "stun", on: def.side, applied, byTrait: true });
            }
            // Bloodsucker (attacker's trait): a physical hit may heal the attacker by that physical damage
            const suck = TraitManager.bloodsuckerChance(att);
            if (suck > 0 && !selfHit && ev.physDamage > 0 && att.hp > 0 && rng() * 100 < suck && !this.#guardBlocks(def, "drain")) {
                const before = att.hp;
                att.hp = Math.min(att.stats.maxHp, att.hp + ev.physDamage);
                ev.effects.push({ kind: "drain", on: att.side, amount: att.hp - before, byTrait: "Bloodsucker" });
            }
            // Bee Sting (attacker's trait): one try per battle, on its first hit: VALUE% chance to poison
            const sting = TraitManager.beeStingChance(att);
            if (sting > 0 && !att.stingDone && ev.damage > 0 && def.hp > 0 && (att.stingDone = true) && rng() * 100 < sting) {
                const applied = this.#addStatus(def, Object.assign({}, TraitManager.BEE_STING_POISON), null);
                ev.effects.push({ kind: "poison", on: def.side, applied, byTrait: TraitManager.nameOf(att, "bee_sting_poison") || "Bee Sting" });
            }
            // Frozen Apple (attacker's trait): one try per battle, on its first hit:
            // 20% poison · 20% frostbite · 10% both · 50% nothing
            if (TraitManager.hasFrozenApple(att) && !att.appleDone && ev.damage > 0 && def.hp > 0) {
                att.appleDone = true;
                const roll = rng() * 100;
                const kinds = roll < 20 ? ["poison"] : roll < 40 ? ["frostbite"] : roll < 50 ? ["poison", "frostbite"] : [];
                for (const k of kinds) {
                    const applied = this.#addStatus(def, Object.assign({}, cfg.DISEASES[k].effect), null);
                    ev.effects.push({ kind: k, on: def.side, applied, byTrait: "Frozen Apple" });
                }
            }
            // Stealer: one try per battle, on its first hit
            const steal = TraitManager.stealChance(att);
            if (steal > 0 && !att.stealTried) {
                att.stealTried = true;
                if (rng() * 100 < steal) { att.stole = true; ev.effects.push({ kind: "steal", on: att.side }); }
            }
        }

        // weapon effect
        const et = weapon.effect_type || "none";
        if (et !== "none" && et !== "ignore_defense" && et !== "critical_up") {
            const chance = weapon.effect_chance === null || weapon.effect_chance === undefined
                ? 100 : Number(weapon.effect_chance);
            if (rng() * 100 < chance) {
                const value = Number(weapon.effect_value) || 0;
                const ticks = Math.max(1, Number(weapon.effect_turns) || 1);
                switch (et) {
                    case "poison":
                    case "grass_poison":
                    case "burn":
                    case "minor_burn":
                    case "stun":
                    case "paralyze":
                    case "sleep":
                    case "freeze":
                    case "frostbite":
                    case "self_harm":
                    case "confused":
                    case "venom":
                    case "schizophrenia":
                    case "chilblains":
                    case "severe_burn":
                        if (def.hp > 0) {
                            const applied = this.#addStatus(def, this.#statusFor(et, weapon, rng, cfg), null, "weapon");
                            ev.effects.push({ kind: et, on: def.side, applied });
                        }
                        break;
                    case "regen":
                    case "attack_up":
                    case "defense_up":
                    case "speed_up":
                        if (this.#locked(att)) { ev.effects.push({ kind: et, on: att.side, applied: false, value, ticks }); break; }   // Buffering
                        this.#addStatus(att, { kind: et, value, ticks }, null);
                        ev.effects.push({ kind: et, on: att.side, applied: true, value, ticks });
                        break;
                    case "next_acc_up":                       // Target: next weapon +VALUE accuracy
                        att.nextAccUp = value || 10;
                        ev.effects.push({ kind: et, on: att.side, applied: true, value: att.nextAccUp });
                        break;
                    case "next_crit_up":                      // Sniper: next weapon +VALUE critical chance
                        att.nextCritUp = value || 10;
                        ev.effects.push({ kind: et, on: att.side, applied: true, value: att.nextCritUp });
                        break;
                    case "heal": {
                        const before = att.hp;
                        att.hp = Math.min(att.stats.maxHp, att.hp + value);
                        ev.effects.push({ kind: "heal", on: att.side, amount: att.hp - before });
                        break;
                    }
                    case "treat_foe": {                  // Trick Or Treat: the OPPONENT gets VALUE % of its max energy
                        const before = def.hp;
                        def.hp = Math.min(def.stats.maxHp, def.hp + Math.round(def.stats.maxHp * value / 100));
                        ev.effects.push({ kind: "heal", on: def.side, amount: def.hp - before });
                        break;
                    }
                    case "heal_pct": {                   // e.g. Charge: VALUE % of max energy
                        const before = att.hp;
                        att.hp = Math.min(att.stats.maxHp, att.hp + Math.round(att.stats.maxHp * value / 100));
                        ev.effects.push({ kind: "heal", on: att.side, amount: att.hp - before });
                        break;
                    }
                    case "drain": {
                        if (selfHit || this.#guardBlocks(def, "drain")) break;         // Drain Heal
                        const before = att.hp;
                        att.hp = Math.min(att.stats.maxHp, att.hp + Math.round(ev.damage * value / 100));
                        ev.effects.push({ kind: "drain", on: att.side, amount: att.hp - before });
                        break;
                    }
                    case "cold":                             // stays after the battle (until Cold Medicine)
                        if (!def.diseases.includes("cold") && !TraitManager.isImmune(def, "cold", "weapon") && !this.#guardBlocks(def, "cold")) {
                            def.diseases.push("cold");
                            ev.effects.push({ kind: "cold", on: def.side, applied: true });
                        }
                        break;
                    case "disease": {                        // a long-lasting disease (weapon field effect_disease)
                        const d = weapon.effect_disease;
                        const immune = (d === "mental" && def.types.some(t => String(t).toLowerCase() === "mind")) || TraitManager.isImmune(def, d, "weapon");
                        if (d && cfg.DISEASES[d] && !def.diseases.includes(d) && !immune) {
                            def.diseases.push(d);
                            ev.effects.push({ kind: "disease", disease: d, on: def.side, applied: true });
                        }
                        break;
                    }
                }
            }
        }
        // blocked statuses (guard items) are shown with this attack
        for (const c of [def, att]) if (c.guarded?.length) { ev.effects.push(...c.guarded); c.guarded = []; }
        emit(ev);
        for (const f of after) f();
        for (const c of [def, att]) this.#flushFlute(c, emit);
    }

    // a Grass Flute heal that happened inside a status with no emit (weapon statuses) is shown after that event
    static #flushFlute(c, emit) { if (c.fluteEvent) { emit(c.fluteEvent); c.fluteEvent = null; } }

    // statuses that make a monster lose its actions (sleep, stun, paralyze)
    static #skips(kind) { return !!GameConfig.DISEASES[kind]?.skip; }

    // the status a weapon gives: VALUE from the weapon (or the default), 1..5 random turns for the random ones,
    // the whole battle for lasting ones (venom…), else the weapon's TURNS (or the default)
    static #statusFor(kind, weapon, rng, cfg) {
        const d = cfg.DISEASES[kind] || {}, base = d.effect || { value: 0, ticks: 1 };
        const ticks = d.lasting ? base.ticks : d.randomTurns ? 1 + Math.floor(rng() * 5) % 5
            : kind === "stun" ? 1 : Math.max(1, Number(weapon.effect_turns) || base.ticks);
        return { kind, value: d.skip ? 0 : Number(weapon.effect_value) || base.value, ticks };
    }

    // returns true if applied
    // held guard items (Poison Heal, Stun Heal, Drain Heal, Cold Medicine…): block the first one, then used up.
    // The blocked status is queued in c.guarded and shown with the next attack event.
    static #guardBlocks(c, kind) {
        const h = c.held?.cfg;
        if (!h || c.heldUsed) return false;
        const ok = (h.hold === "status_guard" && (h.statuses || []).includes(kind)) || (h.hold === "cold_guard" && kind === "cold");
        if (!ok) return false;
        if (h.hold === "status_guard" && c.chronic.includes("drug")) return false;   // drug addiction: status heals do nothing
        if (h.consume !== "never") c.heldUsed = true;
        (c.guarded = c.guarded || []).push({ kind: "guarded", on: c.side, status: kind, item: c.held.name });
        return true;
    }

    // entry traits: Tornado (weapon accuracy + speed down), Frozen Fire (freeze + frostbite, ignores immunity),
    // Celestial Light (the opponent's LIGHT weapons stop working)
    static #entryTraits(c, foe, rng, cfg, emit) {
        const roll = pct => pct > 0 && rng() * 100 < pct;
        // Downloading: once per battle, copies the opponent's trait (first, so a copied entry trait works right away)
        const dl = TraitManager.get(c, "downloading");
        if (dl && !c.once.download) {
            c.once.download = true;
            const t = [foe.trait, foe.trait2, foe.trait3].find(x => x && typeof x === "object" && x.effect_type !== "downloading");
            if (t) {
                c.trait4 = t;
                c.once.downloaded = t;
                this.#traitEv(emit, c, "downloading", "💾", "DOWNLOADING", `${c.name} downloads ${foe.name}'s trait ${t.name}!`, { by: c.side, target: foe.side });
            } else this.#traitEv(emit, c, "downloading", "💾", "DOWNLOAD FAILED", `${c.name} tries to download a trait… ${foe.name} has none.`);
        }
        // Buffering: announces the stat lock (the lock itself is checked by #locked)
        if (TraitManager.has(c, "buffering") && !c.bufferNoted) {
            c.bufferNoted = true;
            this.#traitEv(emit, foe, "buffering", "⏳", "BUFFERING…", `${c.name} is Buffering… ${foe.name}'s stats are frozen until it faints!`, { by: c.side });
        }
        // Burger Party: energy back up to 50% (once per battle)
        if (TraitManager.has(c, "burger_party") && !c.once.burger_party) {
            c.once.burger_party = true;
            const half = Math.round(c.stats.maxHp / 2);
            if (c.hp > 0 && c.hp < half) {
                const before = c.hp;
                c.hp = half;
                this.#traitEv(emit, c, "burger_party", "🍔", `BURGER PARTY +${c.hp - before}`, `${c.name} scarfs down a stack of burgers — energy back up to 50% (+${c.hp - before})!`, { heal: c.hp - before });
            }
        }
        // Burger Dance: every stat +10 (once per battle)
        if (TraitManager.has(c, "burger_dance") && !c.once.burger_dance && !this.#locked(c)) {
            c.once.burger_dance = true;
            const s = c.stats, up = 10;
            c.stats = Object.assign({}, s, { maxHp: s.maxHp + up, physAttack: s.physAttack + up, specAttack: s.specAttack + up,
                                             physDefense: s.physDefense + up, specDefense: s.specDefense + up, speed: (Number(s.speed) || 0) + up });
            c.hp = Math.min(c.stats.maxHp, c.hp + up);
            this.#traitEv(emit, c, "burger_dance", "💃", "BURGER DANCE", `${c.name} does the Burger Dance — energy, attacks, defenses and speed +10!`);
        }
        const tornado = TraitManager.tornadoChance(c);
        if (tornado > 0 && !c.tornadoUsed) {
            c.tornadoUsed = true;
            if (roll(tornado) && !this.#locked(foe)) {
                const pool = foe.weapons.slice(), hit = [];
                const n = Math.min(pool.length, 1 + Math.floor(rng() * 4));
                for (let k = 0; k < n; k++) {
                    const w = pool.splice(Math.floor(rng() * pool.length), 1)[0];
                    const pct = 5 + Math.floor(rng() * 6);
                    const acc = w.accuracy === null || w.accuracy === undefined ? 95 : Number(w.accuracy);
                    w.accuracy = Math.round(acc * (100 - pct) / 100);
                    hit.push({ name: w.name, pct });
                }
                const speed = 5 + Math.floor(rng() * 6);
                foe.stats.speed = Math.round((Number(foe.stats.speed) || 0) * (100 - speed) / 100);
                emit({ t: "tornado", side: foe.side, name: foe.name, by: c.side, weapons: hit, speed });
            }
        }
        if (roll(TraitManager.frozenFireChance(c)) && foe.hp > 0) {
            emit({ t: "frozen_fire", side: foe.side, name: foe.name, by: c.side });
            this.#addStatus(foe, this.#statusFor("freeze", {}, rng, cfg), emit, "force");
            this.#addStatus(foe, this.#statusFor("frostbite", {}, rng, cfg), emit, "force");
        }
        // Icy Chill: once per battle, when it enters: the opponent catches a cold
        const chill = TraitManager.chance(c, "entry_cold");
        if (chill > 0 && !c.once.entry_cold && foe.hp > 0) {
            c.once.entry_cold = true;
            if (roll(chill) && !foe.diseases.includes("cold") && !TraitManager.isImmune(foe, "cold") && !this.#guardBlocks(foe, "cold")) {
                foe.diseases.push("cold");
                this.#traitEv(emit, foe, "entry_cold", "🤧", "COLD", `${c.name}'s ${TraitManager.nameOf(c, "entry_cold") || "Icy Chill"} — ${foe.name} catches a cold!`, { by: c.side, disease: "cold" });
            }
        }
        if (roll(TraitManager.celestialChance(c))) {
            foe.lightBlocked = true;
            emit({ t: "celestial", side: foe.side, name: foe.name, by: c.side });
        }
        // Entrance: once per battle, the opponent's current energy is cut in half
        const ent = TraitManager.entranceChance(c);
        if (ent > 0 && !c.once.entrance && foe.hp > 1) {
            c.once.entrance = true;
            if (roll(ent)) {
                const before = foe.hp;
                foe.hp = Math.max(1, Math.ceil(foe.hp / 2));
                emit({ t: "entrance", side: foe.side, name: foe.name, by: c.side, amount: before - foe.hp });
            }
        }
        // Acorn Tree: once per battle, a tree on the opponent drains it from the next turn (see the turn loop)
        const acorn = TraitManager.acornChance(c);
        if (acorn > 0 && !c.once.acorn) {
            c.once.acorn = true;
            if (roll(acorn)) {
                foe.acornBy = c;
                emit({ t: "acorn_plant", side: foe.side, name: foe.name, by: c.side });
            }
        }
    }

    // every-turn traits (start of each turn): Santa Fe (defenses up), Witch's Exorcism (an opponent weapon loses
    // a use), Infestation (a random status on the opponent)
    static #turnTraits(c, foe, rng, cfg, emit) {
        if (c.hp <= 0 || foe.hp <= 0) return;
        const roll = pct => pct > 0 && rng() * 100 < pct;
        if (roll(TraitManager.santaFeChance(c)) && !this.#locked(c)) {
            c.stats =Object.assign({}, c.stats, { physDefense: Math.round(c.stats.physDefense * 1.1), specDefense: Math.round(c.stats.specDefense * 1.1) });
            emit({ t: "santa_fe", side: c.side, name: c.name });
        }
        if (roll(TraitManager.exorcismChance(c))) {
            const pool = foe.weapons.filter(w => w.usesLeft > 0);
            if (pool.length) {
                const w = pool[Math.floor(rng() * pool.length) % pool.length];
                w.usesLeft--;
                emit({ t: "exorcism", side: foe.side, name: foe.name, by: c.side, weapon: w.name, usesLeft: w.usesLeft });
            }
        }
        if (roll(TraitManager.infestationChance(c))) {
            const kinds = TraitManager.INFESTATION, kind = kinds[Math.floor(rng() * kinds.length) % kinds.length];
            const applied = this.#addStatus(foe, this.#statusFor(kind, {}, rng, cfg), null, "foe");
            emit({ t: "infestation", side: foe.side, name: foe.name, by: c.side, kind, applied });
            this.#flushFlute(foe, emit);
        }
        // Radioactive Nightmare: a sleeping opponent loses 10 energy every turn it sleeps
        if (foe.statuses.some(s => s.kind === "sleep") && roll(TraitManager.chance(c, "nightmare"))) {
            const before = foe.hp;
            foe.hp = Math.max(0, foe.hp - TraitManager.NIGHTMARE_DMG);
            this.#traitEv(emit, foe, "nightmare", "☢️", `NIGHTMARE −${before - foe.hp}`, `${foe.name} has a ${TraitManager.nameOf(c, "nightmare") || "Radioactive Nightmare"} in its sleep — −${before - foe.hp} energy!`, { by: c.side, damage: before - foe.hp });
            if (foe.hp <= 0) return;
        }
        // Rainbow Light: itself +50% max energy (waiting teammates are healed by simulateTeam)
        if (roll(TraitManager.chance(c, "rainbow_light"))) {
            c.rainbowNow = true;
            if (c.hp < c.stats.maxHp) {
                const before = c.hp;
                c.hp = Math.min(c.stats.maxHp, c.hp + Math.round(c.stats.maxHp * TraitManager.RAINBOW_HEAL / 100));
                this.#traitEv(emit, c, "rainbow_light", "🌈", `RAINBOW +${c.hp - before}`, `${c.name}'s ${TraitManager.nameOf(c, "rainbow_light") || "Rainbow Light"} shines — +${c.hp - before} energy!`, { heal: c.hp - before });
            }
        }
        // Magic Snow: own S.DEF +5%
        if (roll(TraitManager.chance(c, "magic_snow")) && !this.#locked(c)) {
            c.stats = Object.assign({}, c.stats, { specDefense: Math.round(c.stats.specDefense * (1 + TraitManager.MAGIC_SNOW_UP / 100)) });
            this.#traitEv(emit, c, "magic_snow", "❄️", "S.DEF +5%", `${c.name}'s Magic Snow swirls — S.DEF +${TraitManager.MAGIC_SNOW_UP}%!`);
        }
        // Fluffy Fuzzball family: the opponent's defenses drop by flat points
        const dd = TraitManager.defDown(c);
        if (dd && roll(dd.chance) && !this.#locked(foe)) {
            foe.stats = Object.assign({}, foe.stats, { physDefense: Math.max(1, foe.stats.physDefense - dd.pdef), specDefense: Math.max(1, foe.stats.specDefense - dd.sdef) });
            const what = [dd.pdef ? `P.DEF −${dd.pdef}` : "", dd.sdef ? `S.DEF −${dd.sdef}` : ""].filter(Boolean).join(", ");
            this.#traitEv(emit, foe, "foe_def_down", "🐭", what, `${c.name}'s ${dd.name} is so fluffy… ${foe.name} lets its guard down: ${what}!`, { by: c.side });
        }
        // Grass Torture / Torture: one status from its list; nothing if the opponent already has that status
        const kinds = TraitManager.tortureKinds(c);
        if (kinds.length && roll(TraitManager.chance(c, "torture"))) {
            const kind = kinds[Math.floor(rng() * kinds.length) % kinds.length];
            const fam = Object.entries(GameConfig.STATUS_FAMILY || {}).find(([k, l]) => k === kind || (l || []).includes(kind));
            const same = fam ? [fam[0], ...(fam[1] || [])] : [kind];
            const has = foe.statuses.some(s => kind === "grass_poison" ? same.includes(s.kind) : s.kind === kind);
            const applied = !has && this.#addStatus(foe, this.#statusFor(kind, {}, rng, cfg), null, "foe");
            const label = GameConfig.DISEASES[kind]?.label || kind;
            this.#traitEv(emit, foe, "torture", "⛓️", applied ? label.toUpperCase() : "…", `${c.name}'s ${TraitManager.nameOf(c, "torture")}${applied ? `: ${foe.name} gets ${label}!` : ` — ${foe.name} already suffers, nothing more happens.`}`,
                { by: c.side, status: applied ? kind : null });
            this.#flushFlute(foe, emit);
        }
        // Colorful Dustball: one roll per battle (its first turn): the HP rare disease
        const dust = TraitManager.chance(c, "dustball");
        if (dust > 0 && !c.once.dustball) {
            c.once.dustball = true;
            if (roll(dust) && !foe.diseases.includes("rare_hp") && !foe.chronic.includes("rare_hp") && !TraitManager.isImmune(foe, "rare_hp")) {
                foe.diseases.push("rare_hp");
                this.#traitEv(emit, foe, "dustball", "🌈", "RARE DISEASE", `${c.name} sneezes a Colorful Dustball — ${foe.name} catches the HP rare disease!`, { by: c.side });
            }
        }
        // Shapeshifter: becomes the opponent, then itself again, every other turn
        if (TraitManager.has(c, "shapeshift") && !TraitManager.transforms(c)) {
            if (!c.shifted) {
                c.shiftOrig = c.shiftOrig || { stats: Object.assign({}, c.stats), types: c.types.slice(), weapons: c.weapons };
                c.shifted = true;
                this.#transform(c, foe, emit);
            } else {
                const o = c.shiftOrig;
                c.stats = Object.assign({}, o.stats, { maxHp: c.stats.maxHp });
                c.types = o.types.slice();
                c.weapons = o.weapons;
                c.shifted = false;
                c.transformedInto = null;
                emit({ t: "transform", side: c.side, name: c.name, back: true, types: c.types.slice(), stats: Object.assign({}, c.stats) });
            }
        }
    }

    // a batch-19 trait went off: { t:"trait", side (who it shows on), name, effect, icon, label (float), text (log) }
    static #traitEv(emit, c, effect, icon, label, text, extra = {}) {
        emit(Object.assign({ t: "trait", side: c.side, name: c.name, effect, icon, label, text }, extra));
    }

    // Buffering: c's stats can't change while an opponent with Buffering is still standing
    static #locked(c) {
        return !!c.foe && c.foe.hp > 0 && TraitManager.has(c.foe, "buffering");
    }

    // Acorn Tree drain at the end of a turn: 5% of the opponent's max energy goes to the planter
    static #acornDrain(c, foe, emit) {
        if (foe.acornBy !== c || c.hp <= 0 || foe.hp <= 0) return;
        const dmg = Math.min(foe.hp, Math.max(1, Math.round(foe.stats.maxHp * TraitManager.ACORN_DRAIN / 100)));
        foe.hp -= dmg;
        const before = c.hp;
        c.hp = Math.min(c.stats.maxHp, c.hp + dmg);
        emit({ t: "acorn_drain", side: foe.side, name: foe.name, by: c.side, amount: dmg, heal: c.hp - before });
    }

    // Space Requiem: when `c` faints, one random weapon of the opponent is deleted for good
    static #requiem(c, foe, rng, emit) {
        const pct = TraitManager.requiemChance(c);
        if (pct <= 0 || c.requiemTried || foe === c) return;
        c.requiemTried = true;
        const pool = foe.weapons.filter(w => w.id !== undefined && w.id !== null && w.id !== "BASIC");
        if (!pool.length || rng() * 100 >= pct) return;
        const w = pool[Math.floor(rng() * pool.length) % pool.length];
        foe.weapons = foe.weapons.filter(x => x !== w);
        if (foe.ouijaOriginal) foe.ouijaOriginal = foe.ouijaOriginal.filter(x => x.id !== w.id);
        foe.lostWeapons.push(w.id);
        emit({ t: "space_requiem", side: foe.side, name: foe.name, by: c.side, weapon: w.name, weaponId: w.id });
    }

    // Crystaline trait: when `c` faints, the opponent may catch a cold (also runs the other faint traits)
    static #faintCold(c, foe, rng, emit) {
        this.#requiem(c, foe, rng, emit);
        const pct = TraitManager.faintColdChance(c);
        if (pct <= 0 || c.coldTried || foe === c) return;
        c.coldTried = true;
        if (rng() * 100 >= pct || foe.diseases.includes("cold") || TraitManager.isImmune(foe, "cold") || this.#guardBlocks(foe, "cold")) return;
        foe.diseases.push("cold");
        emit({ t: "faint_cold", side: foe.side, name: foe.name, by: c.side });
    }

    static #addStatus(c, status, emit, source) {
        if (source !== "force" && TraitManager.isImmune(c, status.kind, source)) {
            if (emit) emit({ t: "immune", side: c.side, name: c.name, kind: status.kind });
            return false;
        }
        if (source !== "disease" && this.#guardBlocks(c, status.kind)) return false;
        const harmful = !!GameConfig.DISEASES[status.kind]?.effect;
        const existing = c.statuses.find(s => s.kind === status.kind);
        if (this.#skips(status.kind) && (c.statuses.some(s => this.#skips(s.kind)) || c.paraGuard)) {
            return false;                      // no stun-lock: sleep / stun / paralysis never chain
        }
        if (existing && harmful) {
            existing.ticks = Math.max(existing.ticks, status.ticks);     // refresh, no stacking
            existing.value = Math.max(existing.value, status.value);
        } else {
            c.statuses.push(Object.assign({}, status));
        }
        if (emit) emit({ t: "status", side: c.side, name: c.name, kind: status.kind, source });
        // Grass Flute: put to sleep by the opponent -> may restore its energy fully (once per battle)
        if (status.kind === "sleep" && source !== "disease" && !c.once.flute && TraitManager.grassFluteChance(c) > 0) {
            c.once.flute = true;
            if (Math.random() * 100 < TraitManager.grassFluteChance(c) && c.hp < c.stats.maxHp) {
                const before = c.hp;
                c.hp = c.stats.maxHp;
                c.fluteEvent = { t: "grass_flute", side: c.side, name: c.name, amount: c.hp - before };
                if (emit) { emit(c.fluteEvent); c.fluteEvent = null; }
            }
        }
        return true;
    }

    static #tick(c, emit) {
        if (c.hp <= 0) return;
        // Fire Trap: VALUE% of max energy every turn until it breaks free
        if (c.trapped) {
            const dmg = Math.min(c.hp, Math.max(1, Math.round(c.stats.maxHp * c.trapped / 100)));
            c.hp -= dmg;
            emit({ t: "tick", side: c.side, name: c.name, kind: "fire_trap", amount: -dmg });
            if (c.hp <= 0) { c.statuses = []; return; }
        }
        const keep = [];
        for (const s of c.statuses) {
            const d = GameConfig.DISEASES[s.kind];
            if (d?.skip) { keep.push(s); continue; }   // sleep / stun / paralyze: counted per skipped action
            if (d?.dot) {                              // poison, burn, freeze, self-harm, venom…: energy every turn
                const dmg = Math.min(c.hp, Math.max(1, Number(s.value) || 1));
                c.hp -= dmg;
                emit({ t: "tick", side: c.side, name: c.name, kind: s.kind, amount: -dmg });
                if (d.lasting) {                       // lasts the whole battle (and after it)
                    keep.push(s);
                    if (c.hp <= 0) { keep.length = 0; break; }
                    continue;
                }
            } else if (s.kind === "regen") {
                const before = c.hp;
                c.hp = Math.min(c.stats.maxHp, c.hp + (Number(s.value) || 0));
                emit({ t: "tick", side: c.side, name: c.name, kind: s.kind, amount: c.hp - before });
            }
            s.ticks--;
            if (s.ticks > 0) keep.push(s);
            else emit({ t: "status_end", side: c.side, name: c.name, kind: s.kind });
            if (c.hp <= 0) { keep.length = 0; break; }
        }
        c.statuses = keep;
    }

    static #finalState(c, cfg) {
        // diseases and lasting statuses (venom…) stay until they are cured; battle statuses end here
        const diseases = [...new Set(c.diseases.concat(c.statuses.map(s => s.kind))
            .filter(k => cfg.DISEASES[k] && !cfg.DISEASES[k].battleOnly))];
        const weaponUses = {};
        // a transformed monster used copied weapons: its own weapon uses don't change
        // weapons swapped by Ouija come back: report the real weapons (the swapped ones were not used)
        if (!c.transformedInto) for (const w of c.ouijaOriginal || c.weapons) if (w.id !== undefined && w.id !== null) weaponUses[String(w.id)] = w.usesLeft;
        return { hp: c.hp, maxHp: c.stats.maxHp, once: c.once, lostWeapons: c.lostWeapons, reviveUsed: c.reviveUsed, diseases, weaponUses, heldUsed: c.heldUsed, stole: c.stole, lucky: c.lucky, giftGold: !!c.giftGold, saveGold: !!c.saveGold };
    }
}

if (typeof module !== "undefined") module.exports = { BattleEngine };
