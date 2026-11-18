// =====================================================================
// The 11 round-10 machines (configs: js/slots/mythConfigs.js, renderer:
// js/screens/slotSpecial.js). Same contract as wonderEngine.js: each spin
// first rolls which features hit (features.*.p × pet luck, or the practice
// room `force`), then builds grids that explain the result and returns a
// `phases` script. Tap / pick bonuses are decided here too — taps only
// reveal the prizes. Player decisions (cash out · sell · bid · invest) are
// "choose" / "offer" phases: the engine's auto choice is the `assumed`
// value the simulator measures; the real payout is what the player picked.
// (this module is part of an import cycle: imported helpers only inside functions)
// =====================================================================
import { R, ri, pickW, shuffle, clone, key, draw, inject, addPoints, finish, ctl } from "./specialEngine.js";
import { waysEval, winP, refill, freeLoop, cash, feat, endFeat, short, payKeys, highKeys, cellsAll, isW, txt, holdSpin, payBoard, coinMaker } from "./themeEngine.js";
import { jpGate, jpName, pickTier, pushJp, forcedTier, tapBonus, payTap, scatterTease, spinPhase, tease, ensureRun, anyPay, anyHigh, VALS, SMALL } from "./skyEngine.js";
import { isZ, sumWins, hexNb } from "./realmEngine.js";

const real = x => x && x !== "_";
const plainCells = g => cellsAll(g).filter(([c, r]) => real(g[c][r]) && !isZ(g[c][r]) && !isW(g[c][r]));
const cellsOfSym = (g, s) => cellsAll(g).filter(([c, r]) => g[c][r] === s);
const wmul = x => x === "W" ? 1 : +(String(x).slice(1)) || 1;
const out = (cfg, ctx, o) => { tease(o.phases, o.baseWin, o.kinds); return finish(cfg, ctx, { ...o, antic: o.phases[0].antic || [] }); };
const pay = (phases, v, text, cells = []) => { v = Math.round(v); if (v > 0) phases.push({ t: "win", cells, win: v, text }); return v > 0 ? v : 0; };
// every phase's value, jackpots included (the auto branch of a "choose")
const branchValue = arr => arr.reduce((s, p) => s + (p.t === "win" ? p.win : p.t === "jp" ? p.amount : 0), 0);
const jpAmount = (cfg, ctx, t) => { const j = cfg.jp?.[t]; if (!j) return 0; return j.sum ? ["MINI", "MINOR", "MAXI", "MAJOR", "GRAND"].reduce((s, x) => s + jpAmount(cfg, ctx, x), 0) : j.x ? j.x * ctx.bet : Math.round(ctx.pool?.[t] ?? j.seed ?? 0); };
function jpChance(cfg, ctx, phases, tw, force, p, title, icon = "🎰") {
    const ft = forcedTier(cfg, force);
    if (!ft && R() >= p) return;
    const t = ft || pickTier(cfg, ctx, tw);
    phases.push({ t: "tap", mode: "single", title, icon, items: [{ text: jpName(cfg, t), cls: "jp" }] });
    pushJp(phases, cfg, ctx, t);
}
// a "match 3" jackpot pick (renderer: playPick)
function matchPick(cfg, ctx, title, icon, keys, tier, tiles = 12) {
    const decoys = []; for (const t of keys.filter(t => t !== tier)) { const k = ri(3); for (let i = 0; i < k; i++) decoys.push(t); }
    const seq = [...shuffle([tier, tier, ...shuffle(decoys).slice(0, 7)]), tier];
    return { t: "pick", f: { type: "pick", title, tier, items: keys, seq, tiles, icon, amount: 0, total: 0 } };
}
// a wheel: segment labels + weights → index
const wheelIdx = (seg, wt) => pickW(seg.map((_, i) => [i, wt[i]]));

// =====================================================================
// 👻 Spooky Mansion Project — 5x3 243 ways, investigator HP
// =====================================================================
function spooky(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const H = cfg.hp;
    let hp = state.hp ?? H.max;
    const ev = g => waysEval(cfg, g, bet);
    const doSe = hit("seance"), doHunt = !doSe && hit("hunt");
    const forceEx = force.startsWith("exorcism"), forcePol = force === "polter";
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doSe) inject(grid, "ZB", 3); else scatterTease(grid, "ZB", false, 5);
    if (doHunt) inject(grid, "ZK", 3); else if (!doSe) scatterTease(grid, "ZK", false, 5);
    const candle = R() < H.candle, holy = R() < H.holy, polter = forcePol || R() < H.polter, charm = polter && !forcePol && R() < H.charm;
    const ev0 = {};
    for (const [on, s] of [[candle, "ZC"], [holy, "ZH"], [polter, "ZG"], [charm, "ZA"]]) if (on) { const free = plainCells(grid); if (free.length) { const c = free[ri(free.length)]; grid[c[0]][c[1]] = s; ev0[s] = c; } }
    const phases = [spinPhase(grid, doHunt ? "ZK" : "ZB", doSe || doHunt)];
    // ---- HP
    hp -= H.spin;
    if (ev0.ZC) { hp += 5; phases.push({ t: "focus", cells: [ev0.ZC] }, { t: "hud", text: "🕯️ 촛불 +5 HP" }); }
    if (ev0.ZH) { hp += 10; phases.push({ t: "focus", cells: [ev0.ZH] }, { t: "hud", text: "💧 성수 +10 HP" }); }
    if (ev0.ZG) {
        if (ev0.ZA) phases.push({ t: "focus", cells: [ev0.ZG, ev0.ZA] }, { t: "fx", name: "charm" });
        else { hp -= 10; phases.push({ t: "focus", cells: [ev0.ZG] }, { t: "fx", name: "polter" }); }
    }
    hp = Math.max(0, Math.min(H.max, hp));
    if (forceEx) hp = 0;
    phases.push({ t: "meter", key: "hp", value: hp, max: H.max }, { t: "hud", text: "" });
    const e = ev(grid);
    const baseWin = winP(phases, cfg, e);
    let five = e.five;
    // ---- 🔮 Séance Hold & Spin (Ouija board, ghost attacks, cash out early)
    if (doSe) {
        kinds.push("seance"); feat(cfg, "seance");
        phases.push({ t: "fx", name: "seance" });
        const C = 5, Rn = 3, board = new Map();
        const coin = coinMaker(cfg, bet, { jp: 0.045, tw: { MINI: 60, MINOR: 30, MAXI: 8, MAJOR: 2 } });
        for (const [c, r] of cellsOfSym(grid, "ZB")) board.set(key(c, r), { v: cash(cfg, bet, pickW(VALS)) });
        for (const [c, r] of shuffle(cellsAll(grid).filter(([c, r]) => !board.has(key(c, r)))).slice(0, ri(3))) board.set(key(c, r), { v: cash(cfg, bet, pickW(VALS)) });
        const gridOf = () => Array.from({ length: C }, (_, c) => Array.from({ length: Rn }, (_, r) => board.has(key(c, r)) ? "ZS" : "_"));
        const badges = () => [...board.entries()].map(([k, cn]) => { const [c, r] = k.split(",").map(Number); return { c, r, text: cn.jp ? jpName(cfg, cn.jp) : short(cn.v), cls: cn.jp ? "jpb" : "val" }; });
        const open = () => cellsAll(gridOf()).filter(([c, r]) => !board.has(key(c, r)));
        const payNow = (arr, label) => { const coins = [...board.values()]; pay(arr, coins.reduce((s, cn) => s + (cn.v || 0), 0), label); for (const cn of coins) if (cn.jp) pushJp(arr, cfg, ctx, cn.jp); if (!open().length) { const t = forcedTier(cfg, force) || jpGate(cfg, "GRAND", bet); pushJp(arr, cfg, ctx, t); } };
        phases.push({ t: "banner", text: "🔮 SÉANCE HOLD & SPIN 🔮", cls: "jackpot" });
        phases.push({ t: "show", grid: gridOf(), pop: [...board.keys()].map(k => k.split(",").map(Number)) }, { t: "badge", cells: badges() });
        const ft = forcedTier(cfg, force);
        const respin = (arr, lives) => {
            const added = [];
            for (const [c, r] of open()) if (R() < 0.085) { board.set(key(c, r), coin()); added.push([c, r]); }
            lives = added.length ? 3 : lives - 1;
            arr.push({ t: "hud", text: `🔮 RESPINS ${lives} · ❤️ ${hp} HP` });
            arr.push({ t: "land", grid: gridOf(), cells: added, roll: true });
            // a ghost attacks: steals the smallest spirit coin and drains the investigator
            if (board.size > 3 && R() < 0.12) {
                const [k] = [...board.entries()].filter(([, cn]) => !cn.jp).sort((a, b) => a[1].v - b[1].v)[0] || [];
                if (k) { board.delete(k); hp = Math.max(1, hp - 5); arr.push({ t: "fx", name: "ghostattack" }, { t: "show", grid: gridOf(), pop: [] }, { t: "meter", key: "hp", value: hp, max: H.max }); }
            }
            arr.push({ t: "badge", cells: badges() });
            return lives;
        };
        // first respin, then the medium may cash out
        let lives = respin(phases, 3);
        const snapCash = [];
        payNow(snapCash, "🔮 CASH OUT");
        const go = [];
        for (let g = 0; lives > 0 && open().length && g < 40; g++) lives = respin(go, lives);
        if (ft) { // practice room: fill the Ouija board
            const left = open(); for (const [c, r] of left) board.set(key(c, r), { v: cash(cfg, bet, 1) });
            go.push({ t: "show", grid: gridOf(), pop: left }, { t: "badge", cells: badges() });
        }
        go.push({ t: "hud", text: "" });
        payNow(go, "🔮 SÉANCE COLLECT");
        phases.push({ t: "choose", title: "🔮 영혼이 술렁인다… 지금 CASH OUT 할까, 계속 부를까?", auto: "go", branches: { cash: [{ t: "hud", text: "" }, ...snapCash], go }, assumed: branchValue(go),
            options: [{ k: "cash", icon: "💰", label: "CASH OUT", sub: `지금 ${short(sumWins(snapCash))} 수령` }, { k: "go", icon: "🔮", label: "CONTINUE", sub: "유령 습격을 각오하고 계속" }] });
        phases.push({ t: "show", grid: clone(grid), pop: [] });
    }
    endFeat();
    // ---- 🕰️ Midnight Hunt — 10 free spins, no HP cost, flashlight multipliers + potions
    if (doHunt) {
        kinds.push("hunt_free"); feat(cfg, "hunt");
        phases.push({ t: "fx", name: "hunt" });
        const r = freeLoop(cfg, ctx, phases, {
            n: F.hunt.spins || 10, title: "🕰️ MIDNIGHT HUNT · 10 FREE SPINS 🕰️", mode: "hunt-mode",
            drawFn: () => {
                const g = draw(cfg, 5, 3, { W: [0, 1.5, 1.5, 1.5, 0] });
                for (const [c, r] of cellsOfSym(g, "W")) g[c][r] = pickW([["W", 30], ["W2", 34], ["W3", 22], ["W5", 10], ["W10", 4]]);
                return g;
            },
            evalFn: g => ev(g),
            after: g => { if (cellsAll(g).some(([c, r]) => isW(g[c][r])) && R() < 0.3) { hp = Math.min(H.max, hp + 5); phases.push({ t: "fx", name: "potion" }, { t: "meter", key: "hp", value: hp, max: H.max }); } }
        });
        five += r.five;
    }
    endFeat();
    // ---- 💀 Exorcism Wheel — HP 0: last stand
    if (hp <= 0) {
        kinds.push("exorcism"); feat(cfg, "exorcism");
        phases.push({ t: "fx", name: "exorcism" });
        phases.push({ t: "banner", text: "💀 HP 0 — EXORCISM WHEEL 💀", cls: "jackpot" });
        const SEG = ["x5", "❤️ REVIVE 50", "x10", "😈 POSSESSED", "x3", "❤️ REVIVE 50", "x20", "😈 POSSESSED", "x8", "👻 PHANTOM"];
        const WT = [16, 14, 10, 9, 18, 14, 5, 9, 8, 0.12];
        let idx = wheelIdx(SEG, WT);
        if (force === "exorcism:MEGA") idx = 9;
        phases.push({ t: "wheel", seg: SEG, idx, title: "💀 EXORCISM WHEEL" });
        const s = SEG[idx];
        if (s.startsWith("x")) { pay(phases, cash(cfg, bet, +s.slice(1)), `💀 LAST STAND ${s}`); hp = 30; }
        else if (s.includes("REVIVE")) { hp = 50; phases.push({ t: "fx", name: "revive" }); }
        else if (s.includes("PHANTOM")) { pushJp(phases, cfg, ctx, "MEGA"); hp = H.max; }
        else {
            const g = draw(cfg, 5, 3), wr = shuffle([1, 2, 3]).slice(0, 2);
            for (const c of wr) g[c] = ["W", "W", "W"];
            phases.push({ t: "fx", name: "possessed" }, { t: "mode", add: "possessed-mode" });
            phases.push({ t: "spin", grid: clone(g) });
            const pe = ev(g); five += pe.five;
            winP(phases, cfg, pe, "😈 POSSESSED SUPER SPIN");
            phases.push({ t: "mode", remove: "possessed-mode" });
            hp = H.max;
        }
        phases.push({ t: "meter", key: "hp", value: hp, max: H.max });
    }
    endFeat();
    state.hp = hp;
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🎪 Midnight Big Top — 5x3 243 ways, 5 fear levels (bet 1~5)
// =====================================================================
function bigtop(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const i0 = cfg.bets.indexOf(bet);
    const lv = i0 >= 0 ? i0 + 1 : Math.max(1, Math.min(5, Math.round(bet / cfg.bets[0])));
    const q = cfg.fear.q[lv - 1], mAvg = cfg.fear.m.reduce((s, [m, w]) => s + m * w, 0) / cfg.fear.m.reduce((s, [, w]) => s + w, 0);
    const k = 1 / (1 + q * (mAvg - 1)); // same mean at every level — only the variance changes
    const ev = (g, scale = 1) => waysEval(cfg, g, bet, { scale: scale * k });
    const doFr = hit("freak"), doMir = !doFr && hit("mirror"), doKn = !doFr && !doMir && hit("knives");
    state.hat = +(((state.hat || 0) + lv * (F.encore.rate || 0.25)).toFixed(2));
    const doEnc = force === "encore" || state.hat >= 100;
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doFr) inject(grid, "ZT", 3); else scatterTease(grid, "ZT", false, 5);
    if (doMir) inject(grid, "ZM", 3); else if (!doFr) scatterTease(grid, "ZM", false, 5);
    if (doKn) grid[2][ri(3)] = "ZK";
    const phases = [spinPhase(grid, doMir ? "ZM" : "ZT", doFr || doMir), { t: "mode", [lv >= 4 ? "add" : "remove"]: "bt-dark" }];
    phases.push({ t: "meter", key: "hat", value: Math.min(100, state.hat), max: 100 }, { t: "meter", key: "fear", value: lv, max: 5 });
    const e = ev(grid);
    let baseWin = winP(phases, cfg, e, lv >= 4 ? "😱" : "");
    if (e.win && R() < q) {
        const m = pickW(cfg.fear.m);
        phases.push({ t: "fx", name: "fear" });
        baseWin += pay(phases, e.win * (m - 1), `😱 FEAR MULTIPLIER x${m}`, e.lines.flatMap(l => l.cells));
    }
    let five = e.five;
    // ---- 🪞 Funhouse Mirror Maze
    if (doMir) {
        kinds.push("mirror"); feat(cfg, "mirror");
        phases.push({ t: "fx", name: "mirror" }, { t: "banner", text: "🪞 FUNHOUSE MIRROR MAZE 🪞", cls: "bonus" });
        let prize = cash(cfg, bet, 2 + lv * 0.5);
        const JEST = [0.22, 0.28, 0.34, 0.4, 0.46];
        for (let s = 0; s < 5; s++) {
            const jest = R() < JEST[s];
            phases.push({ t: "pickn", title: `🪞 STAGE ${s + 1} · 거울 하나를 골라라! (현재 ${short(prize)})`, n: 3, k: 1, icon: "🪞",
                reveals: [jest ? { text: "🃏 JESTER!", cls: "bad" } : { text: `✨ SAFE x2`, cls: "ok" }], rest: shuffle([{ text: "🃏" }, { text: "✨" }]) });
            if (jest) break;
            prize *= 2;
        }
        pay(phases, prize, "🪞 MIRROR MAZE");
    }
    // ---- 🔪 Wheel of Knives
    if (doKn) {
        kinds.push("knives"); feat(cfg, "knives");
        phases.push({ t: "focus", cells: [[2, grid[2].indexOf("ZK")]] }, { t: "fx", name: "knives" });
        const SEG = ["x2", "👩 ASSISTANT", "x5", "x3", "x10", "👩 ASSISTANT", "x4", "x20", "x2", "x8"];
        const WT = [18, 9, 10, 15, 5, 9, 12, 1.5, 18, 6];
        const daggers = [3, 3, 4, 5, 5][lv - 1];
        let sum = 0;
        for (let d = 0; d < daggers; d++) {
            const idx = wheelIdx(SEG, WT);
            phases.push({ t: "wheel", seg: SEG, idx, title: `🔪 단검 ${d + 1} / ${daggers} — 조수는 피해라!` });
            if (SEG[idx].includes("ASSISTANT")) { phases.push({ t: "fx", name: "assistant" }); break; }
            sum += +SEG[idx].slice(1);
        }
        pay(phases, cash(cfg, bet, sum), `🔪 WHEEL OF KNIVES x${sum}`);
    }
    endFeat();
    // ---- 🎟️ Freakshow free spins: clown wilds nudge to fill their reel
    if (doFr) {
        kinds.push("freak_free"); feat(cfg, "freak");
        phases.push({ t: "fx", name: "freak" });
        const r = freeLoop(cfg, ctx, phases, {
            n: F.freak.spins || 8, title: "🎟️ FREAKSHOW · 8 FREE SPINS 🎟️", mode: "freak-mode",
            drawFn: () => draw(cfg, 5, 3, { W: [0, 0.9, 0.9, 0.9, 0] }),
            evalFn: g => {
                for (let c = 1; c <= 3; c++) if (g[c].includes("W") && !g[c].every(x => x === "W")) {
                    const dir = g[c][0] === "W" ? 1 : -1;
                    g[c] = ["W", "W", "W"];
                    phases.push({ t: "nudge", col: c, dir, grid: clone(g) });
                }
                const x = ev(g); x.prefix = "🤡"; return x;
            }
        });
        five += r.five;
    }
    endFeat();
    // ---- 🎩 Ringmaster's Encore — 5x5 balloon Hold & Spin, balloons inflate every respin
    if (doEnc) {
        kinds.push("encore"); feat(cfg, "encore");
        state.hat = 0;
        phases.push({ t: "fx", name: "encore" }, { t: "meter", key: "hat", value: 100, max: 100 });
        const r = holdSpin(cfg, ctx, phases, {
            C: 5, Rn: 5, start: 6, p: 0.06, lives: 3, sym: "ZL", title: "🎩 RINGMASTER'S ENCORE 🎩",
            coin: coinMaker(cfg, bet, { jp: 0, vals: [[0.5, 30], [1, 30], [2, 20], [3, 10], [5, 6], [10, 3]] }),
            onAdd: (board, added) => { for (const [kk, cn] of board) if (!added.some(([c, r]) => key(c, r) === kk)) cn.v = Math.round(cn.v * 1.15); }
        });
        payBoard(cfg, ctx, phases, r.board, { label: "🎈 BALLOON" });
        if (r.full) pay(phases, cash(cfg, bet, 100), "🎪 FULL TENT x100");
        phases.push({ t: "rows", n: 3 }, { t: "show", grid: clone(grid), pop: [] }, { t: "meter", key: "hat", value: 0, max: 100 });
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// ⚙️ Clockwork Fate — 3 concentric rings (cols: outer · middle · inner) × 3 pointers (rows)
// =====================================================================
function fateDraw(cfg, over = {}) {
    const outer = draw(cfg, 1, 3, over)[0];
    const mid = [0, 1, 2].map(() => pickW(Object.entries(cfg.ring.mid)));
    const inner = [0, 1, 2].map(() => pickW(Object.entries(cfg.ring.inner)));
    return [outer, mid, inner];
}
// pointers pay when 2+ of them show the same outer symbol (a middle-ring WILD joins any)
function fateEval(cfg, g, bet, scale = 1) {
    let best = null;
    for (const s of payKeys(cfg)) {
        const rows = [0, 1, 2].filter(r => g[0][r] === s || g[1][r] === "W");
        if (rows.length < 2 || !rows.some(r => g[0][r] === s)) continue;
        const m = rows.reduce((a, r) => a * (g[1][r] === "X2" ? 2 : g[1][r] === "X3" ? 3 : 1), 1);
        const win = cash(cfg, bet, cfg.syms[s].pay[rows.length - 2] * m * scale);
        if (!best || win > best.win) best = { sym: s, n: rows.length, ways: 1, mult: m, win, cells: rows.flatMap(r => [[0, r], [1, r]]) };
    }
    return best ? { win: best.win, lines: [best], five: best.n === 3 ? 1 : 0 } : { win: 0, lines: [], five: 0 };
}
const MINI_LINES = [[[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[0, 2], [1, 1], [2, 0]]];
function miniEval(cfg, g, bet, m) {
    const lines = []; let total = 0;
    for (const L of MINI_LINES) {
        const s = L.map(([c, r]) => g[c][r]).find(x => !isW(x));
        if (!s || !cfg.syms[s]?.pay || !L.every(([c, r]) => g[c][r] === s || isW(g[c][r]))) continue;
        const v = cash(cfg, bet, cfg.syms[s].pay[1] * 0.6 * m);
        lines.push({ sym: s, n: 3, ways: 1, mult: m, win: v, cells: L }); total += v;
    }
    return { win: total, lines, five: 0 };
}
function fate(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doAl = hit("alchemist"), doTa = !doAl && hit("tarot"), doOd = !doAl && !doTa && hit("overdrive");
    let grid = fateDraw(cfg);
    const outerCol = [grid[0]];
    const points = addPoints(outerCol);
    const kinds = [];
    if (doAl) grid[2] = ["ZG", "ZG", "ZG"];
    else if (R() < 0.06) { const r = ri(3); grid[2] = [0, 1, 2].map(x => x === r ? "I0" : "ZG"); }
    if (doTa) grid[2][ri(3)] = "ZL";
    if (doOd) { const s = anyPay(cfg), odd = ri(3); for (let r = 0; r < 3; r++) grid[0][r] = r === odd ? pickW(payKeys(cfg).filter(x => x !== s).map(x => [x, 1])) : s; for (let r = 0; r < 3; r++) if (grid[1][r] === "W") grid[1][r] = "M0"; }
    const twoGears = grid[2].filter(x => x === "ZG").length === 2;
    const phases = [{ t: "spin", grid: clone(grid), antic: twoGears || doAl ? [2] : [], near: null }];
    const e = fateEval(cfg, grid, bet);
    const baseWin = winP(phases, cfg, e, "⚙️");
    let five = e.five;
    // ---- ⚡ Overdrive: the matching pair locks, the third pointer respins and chains
    if (doOd) {
        kinds.push("overdrive"); feat(cfg, "overdrive");
        const s = e.lines[0]?.sym || grid[0].find((x, r) => grid[0].filter(y => y === x).length >= 2);
        const odd = [0, 1, 2].find(r => grid[0][r] !== s && grid[1][r] !== "W");
        phases.push({ t: "fx", name: "overdrive" });
        if (odd != null) {
            let m = 1, chain = 1, sum = 0;
            const lock = [0, 1, 2].filter(r => r !== odd).map(r => [0, r]);
            for (let k = 0; k < chain && k < 8; k++) {
                const g = clone(grid);
                g[0][odd] = R() < 0.3 ? s : one1(cfg);
                g[2][odd] = R() < 0.18 ? "ZB" : "I0";
                phases.push({ t: "hud", text: `⚡ OVERDRIVE · x${m}` }, { t: "spin", grid: clone(g), frozen: lock });
                const match = g[0][odd] === s, bolt = g[2][odd] === "ZB";
                if (match) { sum += pay(phases, cash(cfg, bet, cfg.syms[s].pay[1] * m), `⚡ OVERDRIVE CHAIN x${m}`, [[0, 0], [0, 1], [0, 2]]); }
                if (bolt) phases.push({ t: "focus", cells: [[2, odd]] });
                if (match || bolt) { m++; chain++; }
            }
            if (!sum) pay(phases, cash(cfg, bet, cfg.syms[s].pay[0] * m), `⚡ OVERDRIVE SPARK x${m}`);
            phases.push({ t: "hud", text: "" }, { t: "show", grid: clone(grid), pop: [] });
        }
    }
    endFeat();
    // ---- 🔍 Tarot Constellations — 12 star cards, Eclipse → zodiac match 3
    if (doTa) {
        kinds.push("tarot"); feat(cfg, "tarot");
        phases.push({ t: "fx", name: "tarot" }, { t: "banner", text: "🔍 TAROT CONSTELLATIONS 🔍", cls: "bonus" });
        const ft = forcedTier(cfg, force);
        const eclipse = !!ft || R() < 0.35;
        const reveals = [];
        let coins = 0, up = 1;
        for (let i = 0; i < 4; i++) {
            if (eclipse && i === 3) { reveals.push({ text: "🌑 ECLIPSE", cls: "jp" }); break; }
            if (R() < 0.25) { up++; reveals.push({ text: `⬆️ RING +1x`, cls: "jp" }); }
            else { const x = pickW(SMALL); coins += x; reveals.push({ text: `🪙 x${x}`, cls: "ok" }); }
        }
        phases.push({ t: "pickn", title: "✨ 별 카드 4장을 뒤집어라! (🌑 ECLIPSE = 별자리 맞추기)", n: 12, k: reveals.length, icon: "🌟", reveals, rest: Array.from({ length: 12 - reveals.length }, () => ({ text: pickW([["🪙", 3], ["⬆️", 1], ["🌑", 1]]) })) });
        pay(phases, cash(cfg, bet, Math.max(1, coins) * up), `🔍 STAR CARDS${up > 1 ? ` x${up}` : ""}`);
        if (eclipse) {
            const t = ft || pickTier(cfg, ctx, F.tarot.tw);
            phases.push(matchPick(cfg, ctx, "🌑 ECLIPSE · 같은 별자리 3장 = 잭팟 🌑", "♈", ["MINI", "MAJOR", "GRAND"].filter(x => cfg.jp?.[x]), t));
            pushJp(phases, cfg, ctx, t);
        }
    }
    endFeat();
    // ---- ⚙️ Alchemist's Vault — 3x3 mini reel, 5 free spins, outer ring multiplier
    if (doAl) {
        kinds.push("alchemist_free"); feat(cfg, "alchemist");
        phases.push({ t: "fx", name: "alchemist" }, { t: "banner", text: "⚙️ ALCHEMIST'S VAULT · 5 FREE SPINS ⚙️", cls: "bonus" }, { t: "mode", add: "alch-mode" });
        const SEG = ["x2", "x3", "x5", "x2", "x8", "x3", "x15", "x4"], WT = [26, 22, 12, 26, 5, 22, 1.5, 15];
        for (let i = 0; i < (F.alchemist.spins || 5); i++) {
            const idx = wheelIdx(SEG, WT), m = +SEG[idx].slice(1);
            phases.push({ t: "hud", text: `⚙️ FREE SPIN ${i + 1} / 5` }, { t: "wheel", seg: SEG, idx, title: "⚙️ OUTER RING MULTIPLIER" });
            const g = draw(cfg, 3, 3, { W: 0.7 });
            phases.push({ t: "spin", grid: clone(g) });
            const x = miniEval(cfg, g, bet, m);
            winP(phases, cfg, x, `⚙️ x${m}`);
        }
        phases.push({ t: "hud", text: "" }, { t: "mode", remove: "alch-mode" });
        jpChance(cfg, ctx, phases, F.alchemist.tw, force, 0.12, "⚙️ 금고 텀블러를 탭!", "🔐");
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}
const one1 = cfg => draw(cfg, 1, 1)[0][0];

// =====================================================================
// 🌾 Harvest Hex — 19-hex farm field (5x5 hex minus corners), clusters 5+
// =====================================================================
const HEX_OFF = [[0, 0], [0, 4], [1, 4], [3, 4], [4, 0], [4, 4]];
const offSet = new Set(HEX_OFF.map(([c, r]) => c + "," + r));
const hexDraw = (cfg, over) => { const g = draw(cfg, 5, 5, over); for (const [c, r] of HEX_OFF) g[c][r] = "_"; return g; };
function hexEval(cfg, g, bet, { min = 5, scale = 1 } = {}) {
    const C = g.length, Rn = g[0].length, lines = [];
    let total = 0;
    for (const s of payKeys(cfg)) {
        const seen = new Set();
        for (let c = 0; c < C; c++) for (let r = 0; r < Rn; r++) {
            if (g[c][r] !== s || seen.has(key(c, r))) continue;
            const stack = [[c, r]], cells = [], local = new Set([key(c, r)]);
            while (stack.length) {
                const [x, y] = stack.pop(); cells.push([x, y]);
                if (g[x][y] === s) seen.add(key(x, y));
                for (const [nx, ny] of hexNb(x, y)) {
                    if (nx < 0 || ny < 0 || nx >= C || ny >= Rn || local.has(key(nx, ny))) continue;
                    if (g[nx][ny] === s || isW(g[nx][ny])) { local.add(key(nx, ny)); stack.push([nx, ny]); }
                }
            }
            if (cells.length < min) continue;
            // 💧 irrigation next to the cluster doubles it
            const wet = cells.some(([x, y]) => hexNb(x, y).some(([a, b]) => g[a]?.[b] === "ZI"));
            const m = wet ? 2 : 1;
            const v = cash(cfg, bet, cfg.syms[s].pay[Math.min(cells.length - min, 2)] * scale * m * (1 + Math.max(0, cells.length - min - 2) * 0.5));
            lines.push({ sym: s, n: cells.length, ways: 1, mult: m, win: v, cells, cluster: true }); total += v;
        }
    }
    return { win: total, lines, five: lines.filter(l => l.n >= 8).length };
}
function hexGroup(cfg, grid, size, sym) {
    const g = clone(grid), s = sym || anyHigh(cfg), C = g.length, Rn = g[0].length;
    const ok = (x, y) => x >= 0 && y >= 0 && x < C && y < Rn && real(g[x][y]) && !isZ(g[x][y]);
    const pool = cellsAll(g).filter(([c, r]) => ok(c, r));
    const cells = [pool[ri(pool.length)]];
    for (let k = 0; k < 120 && cells.length < size; k++) {
        const [c, r] = cells[ri(cells.length)], nb = hexNb(c, r).filter(([x, y]) => ok(x, y) && !cells.some(([a, b]) => a === x && b === y));
        if (nb.length) cells.push(nb[ri(nb.length)]);
    }
    const changed = cells.filter(([c, r]) => !isW(g[c][r]) && g[c][r] !== s);
    for (const [c, r] of changed) g[c][r] = s;
    return { grid: g, changed };
}
function harvest(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = g => hexEval(cfg, g, bet);
    const doGh = hit("greenhouse"), doAu = !doGh && hit("auction"), doSc = !doGh && !doAu && hit("scarecrow"), doUfo = !doGh && !doAu && !doSc && hit("ufo");
    let grid = hexDraw(cfg);
    const points = addPoints(grid);
    for (const [c, r] of HEX_OFF) grid[c][r] = "_"; // P never lands off the field
    const kinds = [];
    const sc = doGh ? "ZW" : doAu ? "ZG" : doSc ? "ZC" : null;
    if (sc) inject(grid, sc, 3, { avoid: (c, r) => offSet.has(key(c, r)) });
    else if (R() < 0.08) inject(grid, ["ZW", "ZG", "ZC"][ri(3)], 2);
    for (const [c, r] of HEX_OFF) grid[c][r] = "_";
    const phases = [spinPhase(grid, sc || "ZW", !!sc)];
    if (doUfo) {
        kinds.push("ufo"); feat(cfg, "ufo");
        phases.push({ t: "fx", name: "ufo" });
        const n = 4 + ri(4);
        if (R() < 0.55) {
            const f = hexGroup(cfg, grid, n, anyHigh(cfg));
            grid = f.grid;
            phases.push({ t: "morph", grid: clone(grid), cells: f.changed, fx: "flare", text: `🛸 CROP CIRCLE! UFO가 작물 ${n}개를 들어 올려 메가 작물로!` });
        } else {
            const cells = shuffle(plainCells(grid)).slice(0, n);
            for (const [c, r] of cells) grid[c][r] = "W";
            phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🛸 CROP CIRCLE! 작물 ${n}개가 황금 돌연변이 WILD로!` });
        }
        if (!ev(grid).win) { const f = hexGroup(cfg, grid, 5, anyPay(cfg)); grid = f.grid; phases.push({ t: "morph", grid: clone(grid), cells: f.changed, fx: "evolve", text: "🛸 UFO가 한 번 더 빔을 쏜다!" }); }
    }
    const e = ev(grid);
    const w0 = winP(phases, cfg, e, doUfo ? "🛸 CROP CIRCLE" : "🌾");
    const baseWin = doUfo ? 0 : w0;
    let five = e.five;
    endFeat();
    // ---- 🐦‍⬛ Scarecrow Tower Defense
    if (doSc) {
        kinds.push("scarecrow"); feat(cfg, "scarecrow");
        phases.push({ t: "fx", name: "scarecrow" }, { t: "banner", text: "🐦‍⬛ SCARECROW TOWER DEFENSE 🐦‍⬛", cls: "bonus" });
        const r = tapBonus(cfg, ctx, phases, { mode: "fall", title: "🐦‍⬛ 까마귀 떼를 탭해서 쫓아내라!", icon: "🐦‍⬛", n: 10, vals: SMALL });
        const m = pickW([[1, 45], [2, 35], [3, 15], [5, 5]]);
        if (m > 1) phases.push({ t: "fx", name: "seeds" });
        pay(phases, r.sum * m, `🐦‍⬛ SCARECROW${m > 1 ? ` · 🌱 배수 씨앗 x${m}` : ""}`);
    }
    endFeat();
    // ---- 🔨 Barn Auction — 3 crates: take the offer or bid up (BUST risk)
    if (doAu) {
        kinds.push("auction"); feat(cfg, "auction");
        phases.push({ t: "fx", name: "auction" });
        const xs = [pickW([[3, 3], [4, 3], [5, 2]]), pickW([[6, 3], [8, 3], [10, 2]])];
        xs.push(R() < 0.35 ? 1 : pickW([[12, 4], [15, 3], [25, 1.5], [50, 0.4]]));
        const offers = xs.map((x, i) => ({ k: i === 2 && x === 1 ? "BUST x1" : `x${x}`, v: cash(cfg, bet, x), jp: false }));
        const chosen = offers.find(o => o.v >= 8 * bet * (cfg.px || 1)) || offers[offers.length - 1];
        phases.push({ t: "offer", head: "🔨 BARN AUCTION — 이 가격에 팔까, 더 부를까?", icon: "📦", take: "낙찰! (SELL)", next: "더 부른다 ▶", offers, assumed: chosen.v });
    }
    endFeat();
    // ---- 🚿 Greenhouse Grafting respins — domes lock, hybrid super-crops double their neighbours
    if (doGh) {
        kinds.push("greenhouse"); feat(cfg, "greenhouse");
        phases.push({ t: "fx", name: "greenhouse" });
        const init = cellsOfSym(grid, "ZW").map(([c, r]) => [c, r, { v: cash(cfg, bet, pickW(VALS)) }]);
        const r = holdSpin(cfg, ctx, phases, {
            C: 5, Rn: 5, init, start: 5, p: 0.075, lives: 3, sym: "ZS", blocked: new Set(offSet), title: "🚿 GREENHOUSE GRAFTING 🚿",
            coin: coinMaker(cfg, bet, { jp: 0.045, tw: { MINI: 60, MINOR: 30, MAXI: 8, MAJOR: 2 } }),
            onAdd: (board, added, _b, ph) => {
                for (const [c, r] of added) {
                    const cn = board.get(key(c, r));
                    if (cn.jp || R() > 0.15) continue;
                    cn.label = "🧬"; cn.cls = "jpb";
                    const nb = hexNb(c, r).map(([a, b]) => board.get(key(a, b))).filter(x => x && !x.jp);
                    for (const x of nb) x.v *= 2;
                    if (nb.length) ph.push({ t: "focus", cells: [[c, r]] }, { t: "hud", text: `🧬 HYBRID! 이웃 작물 ${nb.length}개 x2` });
                }
            }
        });
        payBoard(cfg, ctx, phases, r.board, { label: "🌱 GREENHOUSE", full: r.full || !!forcedTier(cfg, force), fullTier: forcedTier(cfg, force) || "GRAND" });
        phases.push({ t: "show", grid: clone(grid), pop: [] });
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 💼 Vault Breaker — 25 capsules on a spiral pneumatic tube (5x5): 4+ matching in a
// row anywhere along the tube vaporize, the rest fall and chain
// =====================================================================
// the tube: outer ring clockwise from the top-left corner, spiralling into the centre
const SPIRAL = (() => {
    const out = [], seen = new Set();
    let c = 0, r = 0, d = 0;
    const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let i = 0; i < 25; i++) {
        out.push([c, r]); seen.add(c + "," + r);
        let nc = c + D[d][0], nr = r + D[d][1];
        if (nc < 0 || nr < 0 || nc > 4 || nr > 4 || seen.has(nc + "," + nr)) { d = (d + 1) % 4; nc = c + D[d][0]; nr = r + D[d][1]; }
        c = nc; r = nr;
    }
    return out;
})();
function countEval(cfg, g, bet, scale = 1) {
    const lines = []; let total = 0;
    const tube = SPIRAL.map(([c, r]) => g[c][r]);
    for (let i = 0; i < tube.length;) {
        // the run's symbol is its first non-wild capsule
        let j = i, s = null;
        while (j < tube.length && (isW(tube[j]) || (s ? tube[j] === s : cfg.syms[tube[j]]?.pay))) { if (!s && !isW(tube[j])) s = tube[j]; j++; }
        const n = j - i;
        if (s && n >= 4) {
            const idx = n >= 10 ? 3 : n >= 7 ? 2 : n >= 5 ? 1 : 0;
            const v = cash(cfg, bet, cfg.syms[s].pay[idx] * scale);
            lines.push({ sym: s, n, ways: 1, mult: 1, win: v, cells: SPIRAL.slice(i, j), cluster: true }); total += v;
            i = j;
        } else i++;
    }
    return { win: total, lines, five: lines.filter(l => l.n >= 7).length };
}
function vault(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doLa = hit("laser"), doTi = !doLa && hit("ticker"), doSafe = !doLa && !doTi && hit("safe");
    const T = F.takeover;
    let brief = state.brief || 0;
    const newBrief = force === "takeover" || R() < T.brief;
    if (newBrief) brief = force === "takeover" ? T.max : brief + 1;
    const doTk = brief >= T.max;
    let grid = draw(cfg, 5, 5);
    const points = addPoints(grid);
    const kinds = [];
    const sc = doLa ? "ZP" : doTi ? "ZB" : null;
    if (sc) inject(grid, sc, 3); else scatterTease(grid, ["ZP", "ZB"][ri(2)], false, 5);
    if (doSafe) grid[2][2] = "ZK";
    if (newBrief) { const f = plainCells(grid); const [c, r] = f[ri(f.length)]; grid[c][r] = "ZC"; }
    const phases = [spinPhase(grid, sc || "ZP", !!sc)];
    phases.push({ t: "meter", key: "brief", value: Math.min(brief, T.max), max: T.max });
    // chain: winners vaporize, new capsules fall down the tube
    let baseWin = 0, five = 0, lines = [];
    const g = clone(grid);
    for (let k = 0; k < 10; k++) {
        const e = countEval(cfg, g, bet);
        if (!e.win) break;
        if (!k) lines = e.lines;
        baseWin += winP(phases, cfg, e, k ? `💨 CHAIN ${k + 1}` : "💨"); five += e.five;
        const gone = new Set(e.lines.flatMap(l => l.cells.map(([c, r]) => key(c, r))));
        phases.push({ t: "clear", cells: [...gone].map(x => x.split(",").map(Number)) });
        refill(cfg, g, gone);
        phases.push({ t: "drop", grid: clone(g) });
    }
    // ---- 🐂 Insider Trading Ticker — sell before the crash
    if (doTi) {
        kinds.push("ticker"); feat(cfg, "ticker");
        phases.push({ t: "fx", name: "ticker" });
        const offers = [];
        let m = 1.5;
        for (let i = 0; i < 6; i++) {
            if (i >= 1 && R() < 0.2) { offers.push({ k: "📉 CRASH x0.5", v: cash(cfg, bet, 0.5), jp: false }); break; }
            offers.push({ k: `📈 x${+m.toFixed(1)}`, v: cash(cfg, bet, m), jp: false });
            m *= 1.35 + R() * 0.45;
        }
        const chosen = offers.find(o => o.v >= 4 * bet * (cfg.px || 1)) || offers[offers.length - 1];
        phases.push({ t: "offer", head: "🐂 INSIDER TRADING — 지금 SELL 할까, 더 버틸까? (폭락 주의!)", icon: "📈", take: "💰 SELL", next: "📈 HOLD ▶", offers, assumed: chosen.v });
    }
    endFeat();
    // ---- 📘 Laser Grid Heist — hack nodes toward the Grand, an alarm ends it
    if (doLa) {
        kinds.push("heist"); feat(cfg, "laser");
        const L = F.laser, N = L.nodes;
        const grand = force === "laser:GRAND";
        const order = shuffle([...Array(N - L.alarms).fill("S"), ...Array(L.alarms).fill("A")]);
        if (order[0] === "A") { const j = order.indexOf("S"); [order[0], order[j]] = [order[j], order[0]]; }
        const seq = grand ? order.filter(x => x === "S") : order.slice(0, order.indexOf("A") + 1 || order.length);
        const picks = seq.map(x => x === "A" ? { alarm: true } : (() => { const m = pickW(L.mult); return isNaN(+m) ? { jp: jpGate(cfg, m, bet) } : { m: +m }; })());
        phases.push({ t: "banner", text: "📘 LASER GRID HEIST 📘", cls: "jackpot" });
        phases.push({ t: "laser", picks, nodes: N, head: "📘 레이저 노드를 해킹하라! 🚨 경보 = 종료 · 모든 안전 노드 = GRAND 금고" });
        const sum = picks.filter(p => p.m).reduce((s, p) => s + p.m, 0);
        pay(phases, cash(cfg, bet, sum), `📘 LASER HEIST x${sum}`);
        for (const p of picks) if (p.jp) pushJp(phases, cfg, ctx, p.jp);
        if (!picks.some(p => p.alarm)) { phases.push({ t: "banner", text: "🔓 ALL LASERS DOWN!!! GRAND VAULT 🔓", cls: "jackpot" }); pushJp(phases, cfg, ctx, grand ? "GRAND" : jpGate(cfg, "GRAND", bet)); }
    }
    endFeat();
    // ---- 🗝️ Swiss Bank Safe-Cracking dial — 3 tumblers, a deadbolt → mystery briefcase
    if (doSafe) {
        kinds.push("safe"); feat(cfg, "safe");
        phases.push({ t: "focus", cells: [[2, 2]] }, { t: "fx", name: "safe" });
        const SEG = ["x2", "x3", "x5", "🔒 DEADBOLT", "x4", "x8", "x2", "x10"], WT = [20, 18, 10, 9, 14, 5, 20, 2.5];
        const ft = forcedTier(cfg, force);
        let sum = 0, bolt = !!ft;
        for (let i = 0; i < 3 && !bolt; i++) {
            const idx = wheelIdx(SEG, WT);
            phases.push({ t: "wheel", seg: SEG, idx, title: `🗝️ TUMBLER ${i + 1} / 3` });
            if (SEG[idx].includes("DEADBOLT")) bolt = true; else sum += +SEG[idx].slice(1);
        }
        pay(phases, cash(cfg, bet, sum), `🗝️ SAFE CRACKED x${sum}`);
        if (bolt) {
            const t = ft || (R() < 0.3 ? pickTier(cfg, ctx, F.safe.tw) : null), x = pickW([[5, 30], [8, 25], [12, 15], [20, 6], [40, 1.5]]);
            phases.push({ t: "fx", name: "deadbolt" });
            phases.push({ t: "tap", mode: "single", title: "💼 데드볼트! 미스터리 서류가방을 탭해서 열어라", icon: "💼", items: [{ text: t ? jpName(cfg, t) : `x${x}`, cls: "jp" }] });
            if (t) pushJp(phases, cfg, ctx, t); else pay(phases, cash(cfg, bet, x), "💼 MYSTERY BRIEFCASE");
        }
    }
    endFeat();
    // ---- 💼 Hostile Takeover Boardroom — 3 rounds: invest safely or go all-in
    if (doTk) {
        kinds.push("takeover"); feat(cfg, "takeover");
        brief = 0;
        phases.push({ t: "fx", name: "takeover" }, { t: "banner", text: "💼 HOSTILE TAKEOVER BOARDROOM 💼", cls: "jackpot" });
        for (let rd = 1; rd <= 3; rd++) {
            const safeX = pickW([[3, 3], [4, 3], [5, 2]]), d = 1 + ri(6), allX = d <= 2 ? 0 : d <= 4 ? 4 : d === 5 ? 8 : 15;
            const safe = [], all = [{ t: "fx", name: "dice" }, { t: "hud", text: `🎲 주사위 ${d}!` }];
            pay(safe, cash(cfg, bet, safeX), `📊 ROUND ${rd} · INVEST SAFELY x${safeX}`);
            if (allX) pay(all, cash(cfg, bet, allX), `🎲 ROUND ${rd} · ALL-IN MERGER x${allX}`); else all.push({ t: "fx", name: "mergerfail" });
            all.push({ t: "hud", text: "" });
            phases.push({ t: "choose", title: `💼 ROUND ${rd} / 3 — 이사회의 결정은?`, auto: "safe", branches: { safe, all }, assumed: branchValue(safe),
                options: [{ k: "safe", icon: "📊", label: "INVEST SAFELY", sub: "x3~x5 확정" }, { k: "all", icon: "🎲", label: "ALL-IN MERGER", sub: "주사위 1~2 = 0 · 3~4 = x4 · 5 = x8 · 6 = x15" }] });
        }
        phases.push({ t: "meter", key: "brief", value: 0, max: T.max });
    }
    endFeat();
    state.brief = brief;
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines });
}

// =====================================================================
// 🎣 Deepwater Fishing — sonar: 8 sectors (cols) × 3 rings (rows, 0 = outer)
// clusters of 4+ connected inside a sector or along a ring (the ring wraps around)
// =====================================================================
function sonarEval(cfg, g, bet, { min = 4, scale = 1 } = {}) {
    const C = g.length, Rn = g[0].length, lines = [];
    let total = 0;
    const nb = (c, r) => [[(c + 1) % C, r], [(c + C - 1) % C, r], [c, r - 1], [c, r + 1]].filter(([, y]) => y >= 0 && y < Rn);
    for (const s of payKeys(cfg)) {
        const seen = new Set();
        for (let c = 0; c < C; c++) for (let r = 0; r < Rn; r++) {
            if (g[c][r] !== s || seen.has(key(c, r))) continue;
            const stack = [[c, r]], cells = [], local = new Set([key(c, r)]);
            while (stack.length) {
                const [x, y] = stack.pop(); cells.push([x, y]);
                if (g[x][y] === s) seen.add(key(x, y));
                for (const [nx, ny] of nb(x, y)) {
                    if (local.has(key(nx, ny))) continue;
                    if (g[nx][ny] === s || isW(g[nx][ny])) { local.add(key(nx, ny)); stack.push([nx, ny]); }
                }
            }
            if (cells.length < min) continue;
            const m = cells.reduce((a, [x, y]) => Math.max(a, isW(g[x][y]) ? wmul(g[x][y]) : 1), 1);
            const v = cash(cfg, bet, cfg.syms[s].pay[Math.min(cells.length - min, 3)] * scale * m);
            lines.push({ sym: s, n: cells.length, ways: 1, mult: m, win: v, cells, cluster: true }); total += v;
        }
    }
    return { win: total, lines, five: lines.filter(l => l.n >= 7).length };
}
function sonarGroup(cfg, grid, size, sym) {
    const g = clone(grid), C = g.length, Rn = g[0].length, s = sym || anyPay(cfg);
    const c0 = ri(C), cells = [];
    for (let i = 0; cells.length < size && i < 24; i++) { const c = (c0 + (i % 3 === 2 ? 1 : 0) + Math.floor(i / 3)) % C, r = i % 3; if (!isZ(g[c][r])) cells.push([c, r]); }
    const changed = cells.filter(([c, r]) => g[c][r] !== s && !isW(g[c][r]));
    for (const [c, r] of changed) g[c][r] = s;
    return { grid: g, changed };
}
function sonar(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = g => sonarEval(cfg, g, bet);
    const doCh = hit("chum"), doCr = !doCh && hit("crab"), doTug = !doCh && !doCr && hit("tug");
    let grid = draw(cfg, 8, 3);
    const points = addPoints(grid);
    const kinds = [];
    const sc = doCh ? "ZC" : doCr ? "ZB" : null;
    if (sc) inject(grid, sc, 3); else scatterTease(grid, ["ZC", "ZB"][ri(2)], false, 8);
    if (doTug) { const f = plainCells(grid); const [c, r] = f[ri(f.length)]; grid[c][r] = "ZF"; }
    const phases = [spinPhase(grid, sc || "ZC", !!sc)];
    const e = ev(grid);
    const baseWin = winP(phases, cfg, e, "📡");
    let five = e.five;
    // ---- 🗡️ Tension-meter tug-of-war
    if (doTug) {
        kinds.push("tug"); feat(cfg, "tug");
        phases.push({ t: "focus", cells: cellsOfSym(grid, "ZF") }, { t: "fx", name: "tug" });
        const steps = ["💥 SNAP", "🎣 LOOSE", "🎣 OK", "⭐ SWEET", "🌟 PERFECT"];
        const stop = pickW([[0, 22], [1, 20], [2, 28], [3, 22], [4, 8]]);
        const X = [pickW([[1, 2], [2, 1]]), 4, 8, 15, 30][stop];
        phases.push({ t: "tap", mode: "gauge", title: "🗡️ 탭! 바늘을 스위트 스팟에 멈춰 청새치를 끌어올려라", icon: "🎣", rocket: "🗡️", steps, stop, items: [{ text: steps[stop], cls: stop ? "jp" : "bad" }] });
        pay(phases, cash(cfg, bet, X), stop ? `🗡️ ${R() < 0.5 ? "SWORDFISH" : "MARLIN"} CAUGHT! x${X}` : `💥 줄이 끊겼다… 위로금 x${X}`);
    }
    endFeat();
    // ---- 🪣 Chum Bucket Feeding Frenzy — 6 free sweeps, minnows gone, predators swim inward
    if (doCh) {
        kinds.push("chum_free"); feat(cfg, "chum");
        phases.push({ t: "fx", name: "chum" });
        let preds = Array.from({ length: 2 + ri(2) }, () => ({ c: ri(8), r: 0 }));
        const r = freeLoop(cfg, ctx, phases, {
            n: F.chum.spins || 6, title: "🪣 CHUM BUCKET FEEDING FRENZY · 6 FREE SWEEPS 🪣", mode: "chum-mode",
            drawFn: i => {
                const g = draw(cfg, 8, 3, { L1: 1.6, L2: 1.6, L3: 1.4 });
                if (i) { preds = preds.map(p => ({ c: p.c, r: p.r + 1 })).filter(p => p.r < 3); if (R() < 0.6) preds.push({ c: ri(8), r: 0 }); }
                const at = new Map();
                for (const p of preds) at.set(key(p.c, p.r), (at.get(key(p.c, p.r)) || 0) + 1);
                for (const [k, n] of at) { const [c, r] = k.split(",").map(Number); g[c][r] = n > 1 ? "W4" : "W2"; }
                return { grid: g, frozen: [...at.keys()].map(k => k.split(",").map(Number)) };
            },
            evalFn: g => { const x = ev(g); x.prefix = "🦈"; return x; }
        });
        five += r.five;
    }
    endFeat();
    // ---- 🛟 Crab Trap Depth Drop — 3 traps, the octopus raids half
    if (doCr) {
        kinds.push("crab"); feat(cfg, "crab");
        phases.push({ t: "fx", name: "crab" });
        const ft = forcedTier(cfg, force), jpAt = ft || R() < 0.12 ? ri(3) : -1;
        const items = [], tiers = [];
        let sum = 0;
        for (let i = 0; i < 3; i++) {
            if (i === jpAt) { const t = ft || pickTier(cfg, ctx, F.crab.tw); tiers.push(t); items.push({ text: jpName(cfg, t), cls: "jp" }); continue; }
            let v = cash(cfg, bet, pickW(VALS) * 1.5);
            if (R() < 0.2) { v = Math.round(v / 2); items.push({ text: `🐙 ${short(v)}`, cls: "bad" }); } else items.push({ text: `🦀 ${short(v)}`, cls: "ok" });
            sum += v;
        }
        phases.push({ t: "tap", mode: "grid", title: "🛟 통발을 탭해서 끌어올려라! (🐙 문어 습격 = 반토막)", icon: "🪤", items });
        pay(phases, sum, "🦀 CRAB TRAPS");
        for (const t of tiers) pushJp(phases, cfg, ctx, t);
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🌋 Magma Core — 5x3 243 ways, three trigger pots above the reels
// =====================================================================
function magmaBlast(cfg, ctx, phases, force, init = []) {
    const { bet } = ctx, F = cfg.features;
    const blocked = new Set(shuffle(cellsAll(Array.from({ length: 5 }, () => [0, 0, 0])).filter(([c, r]) => !init.some(([a, b]) => a === c && b === r))).slice(0, 3).map(([c, r]) => key(c, r)));
    let rad = 1;
    const r = holdSpin(cfg, ctx, phases, {
        C: 5, Rn: 3, init, start: 6, spins: 5, p: 0.09, sym: "ZY", blocked, title: "🧨 MAGMA BLAST · 5 SPINS 🧨",
        coin: coinMaker(cfg, bet, { jp: 0.05, tw: F.blast.tw, extra: [{ p: 0.07, coin: { special: true, kind: "dyn", label: "💣" } }, { p: 0.03, coin: { special: true, kind: "nitro", label: "🧪" } }, { p: 0.03, coin: { special: true, kind: "fuse", label: "🪢x2" } }] }),
        onAdd: (board, added, bl, ph) => {
            let extra = 0;
            for (const [c, r] of added) {
                const cn = board.get(key(c, r));
                if (!cn.kind) continue;
                cn.v = cash(cfg, bet, pickW(SMALL));
                if (cn.kind === "nitro") { rad = 2; ph.push({ t: "fx", name: "nitro" }); }
                if (cn.kind === "fuse") { for (const x of board.values()) if (x.v) x.v *= 2; ph.push({ t: "fx", name: "fuse" }); }
                if (cn.kind === "dyn") {
                    ph.push({ t: "focus", cells: [[c, r]] }, { t: "fx", name: "dynamite" });
                    for (let d = -rad; d <= rad; d++) for (const [x, y] of [[c + d, r], [c, r + d]]) {
                        if (x < 0 || y < 0 || x >= 5 || y >= 3 || (x === c && y === r)) continue;
                        if (bl.has(key(x, y))) bl.delete(key(x, y));
                        if (!board.has(key(x, y))) { board.set(key(x, y), { v: cash(cfg, bet, pickW(SMALL)) }); extra = 1; }
                    }
                }
            }
            return extra ? { extra: 0 } : null;
        }
    });
    payBoard(cfg, ctx, phases, r.board, { label: "🧨 MAGMA BLAST", full: r.full || !!forcedTier(cfg, force), fullTier: forcedTier(cfg, force) || "GRAND" });
}
function magma(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = (g, scale = 1) => waysEval(cfg, g, bet, { scale });
    const doBl = hit("blast"), doGe = !doBl && hit("geode"), doFo = !doBl && !doGe && hit("forge");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    const sc = doBl ? "ZY" : doGe ? "ZD" : doFo ? "ZR" : null;
    if (sc) inject(grid, sc, 3);
    // the pots fill a little on ordinary spins too (one or two icons, never three)
    for (const s of ["ZY", "ZD", "ZR"]) if (s !== sc && R() < 0.07) inject(grid, s, 1 + (R() < 0.3 ? 1 : 0));
    const phases = [spinPhase(grid, sc || "ZY", !!sc)];
    for (const [s, k] of [["ZY", "pot_y"], ["ZD", "pot_b"], ["ZR", "pot_r"]]) phases.push({ t: "meter", key: k, value: Math.min(3, cellsOfSym(grid, s).length), max: 3 });
    const e = ev(grid);
    const baseWin = winP(phases, cfg, e, "⛏️");
    let five = e.five;
    // ---- 🔴 Smelting Forge — 5 free games, card symbols melt into high symbols
    if (doFo) {
        kinds.push("forge_free"); feat(cfg, "forge");
        phases.push({ t: "fx", name: "forge" }, { t: "banner", text: "🔴 SMELTING FORGE · 5 FREE GAMES 🔴", cls: "bonus" }, { t: "mode", add: "forge-mode" });
        for (let i = 0; i < (F.forge.spins || 5); i++) {
            phases.push({ t: "hud", text: `🔴 FREE GAME ${i + 1} / 5` });
            const g = draw(cfg, 5, 3);
            phases.push({ t: "spin", grid: clone(g) });
            const lows = [...new Set(cellsAll(g).map(([c, r]) => g[c][r]).filter(s => /^L/.test(s)))];
            const melt = shuffle(lows).slice(0, 1 + ri(2)), hi = anyHigh(cfg);
            const cells = cellsAll(g).filter(([c, r]) => melt.includes(g[c][r]));
            for (const [c, r] of cells) g[c][r] = hi;
            if (cells.length) phases.push({ t: "morph", grid: clone(g), cells, fx: "flare", text: `🔥 ${melt.map(s => cfg.syms[s].e).join(" · ")} → ${cfg.syms[hi].e} 녹아내렸다!` });
            const x = ev(g); five += x.five;
            winP(phases, cfg, x, "🔴 FORGE");
        }
        phases.push({ t: "hud", text: "" }, { t: "mode", remove: "forge-mode" });
    }
    endFeat();
    // ---- 🔵 Geode Pick-Me — 18 geodes: jackpot tier, Hold & Spin entry or the Motherlode
    if (doGe) {
        kinds.push("geode"); feat(cfg, "geode");
        phases.push({ t: "fx", name: "geode" });
        const ft = forcedTier(cfg, force);
        const keys = ["MINI", "MINOR", "MAXI", "MAJOR", "BLAST", "GRAND"];
        const t = ft || pickW([["MINI", 40], ["MINOR", 24], ["MAXI", 8], ["MAJOR", 2.5], ["BLAST", 24], ["GRAND", 0.6]]);
        phases.push(matchPick(cfg, ctx, "🔵 GEODE PICK-ME · 정동석 3개를 맞춰라 🔵", "🪨", keys, t, 18));
        if (t === "BLAST") { feat(cfg, "blast"); magmaBlast(cfg, ctx, phases, ""); phases.push({ t: "show", grid: clone(grid), pop: [] }); }
        else pushJp(phases, cfg, ctx, ft || jpGate(cfg, t, bet));
    }
    endFeat();
    // ---- 🧨 Magma Blast Hold & Spin
    if (doBl) {
        kinds.push("blast"); feat(cfg, "blast");
        phases.push({ t: "fx", name: "blast" });
        magmaBlast(cfg, ctx, phases, force, cellsOfSym(grid, "ZY").map(([c, r]) => [c, r, { v: cash(cfg, bet, pickW(VALS)) }]));
        phases.push({ t: "show", grid: clone(grid), pop: [] });
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🚀 Astral Ascension — warp core ladder → nebula reveal free spins, navigator nudges
// =====================================================================
function ascend(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = (g, scale = 1) => waysEval(cfg, g, bet, { scale });
    const doWarp = hit("warp"), doNav = !doWarp && hit("nav");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    const direct = doWarp && R() < 0.55;
    if (doWarp) inject(grid, "ZO", direct ? 6 + ri(2) : 1 + ri(5), { distinct: false });
    else if (R() < 0.05) inject(grid, "ZO", 3 + ri(3), { distinct: false });
    // 🧭 navigator: a stacked wild shows on 2 of 3 rows, then nudges to fill its reel
    const navCol = doNav ? 1 + ri(3) : -1, navTop = R() < 0.5;
    if (doNav) grid[navCol] = navTop ? ["W", "W", one1(cfg)] : [one1(cfg), "W", "W"];
    const phases = [spinPhase(grid, "ZO", doWarp)];
    if (doNav) {
        kinds.push("nav"); feat(cfg, "nav");
        phases.push({ t: "fx", name: "nav" });
        grid[navCol] = ["W", "W", "W"];
        phases.push({ t: "nudge", col: navCol, dir: navTop ? -1 : 1, grid: clone(grid) });
    }
    const e = ev(grid);
    const w0 = winP(phases, cfg, e, doNav ? "🧭 NAVIGATOR" : "");
    const baseWin = doNav ? 0 : w0;
    let five = e.five;
    endFeat();
    if (doWarp) {
        kinds.push("warp_free"); feat(cfg, "warp");
        if (!direct) phases.push({ t: "fx", name: "warpcore" });
        phases.push({ t: "fx", name: "warp" });
        const init = cellsOfSym(grid, "ZO").map(([c, r]) => [c, r, { v: cash(cfg, bet, pickW(VALS)) }]);
        const r = holdSpin(cfg, ctx, phases, {
            C: 5, Rn: 3, init, start: init.length, p: 0.1, lives: 3, sym: "ZO", title: "🔮 WARP CORE LADDER 🔮",
            coin: coinMaker(cfg, bet, { jp: 0.035, tw: { MINI: 60, MINOR: 30, MAXI: 8, MAJOR: 2 } })
        });
        const ft = forcedTier(cfg, force);
        const n = r.board.size, L = cfg.ladder;
        phases.push({ t: "ladder", title: "🔮 WARP CORE LADDER — 모은 구슬 = 무료스핀", icon: "🔮", steps: L.map((x, i) => `${i + 1}🔮 → ${x} FS`), reached: n - 1 });
        let spins = L[n - 1];
        if (r.full || ft) pushJp(phases, cfg, ctx, ft || jpGate(cfg, "GRAND", bet));
        // ---- 🌌 Nebula Reveal — one locked orb cracks per spin
        const orbs = shuffle([...r.board.values()]);
        let rows = 3;
        phases.push({ t: "banner", text: `🌌 NEBULA REVEAL · ${spins} FREE SPINS 🌌`, cls: "bonus" }, { t: "mode", add: "nebula-mode" }, { t: "show", grid: draw(cfg, 5, 3), pop: [] });
        for (let i = 0; i < spins && i < 60; i++) {
            phases.push({ t: "hud", text: `🌌 FREE SPIN ${i + 1} / ${spins} · 🔮 ${orbs.length}` });
            const g = draw(cfg, 5, rows, { W: [0, 0.8, 0.8, 0.8, 0] });
            let nn = null;
            if (R() < 0.12) { const c = 1 + ri(3); g[c] = g[c].map((x, k) => k < rows - 1 ? "W" : x); nn = c; }
            phases.push({ t: "spin", grid: clone(g) });
            if (nn != null) { g[nn] = g[nn].map(() => "W"); phases.push({ t: "nudge", col: nn, dir: 1, grid: clone(g) }); }
            const x = ev(g); five += x.five;
            winP(phases, cfg, x, "🌌");
            const orb = orbs.shift();
            if (orb) {
                phases.push({ t: "fx", name: "crack" });
                if (orb.jp) pushJp(phases, cfg, ctx, orb.jp); else pay(phases, orb.v, "🔮 ORB CRACK · CREDIT");
                const roll = R();
                if (roll < 0.1) { spins += 2; phases.push({ t: "hud", text: "🔮 +2 FREE SPINS!" }); }
                else if (roll < 0.17 && rows < 5) { rows++; phases.push({ t: "rows", n: rows }, { t: "hud", text: `🌌 GRID EXPANSION! ${rows}줄` }); }
            }
        }
        phases.push({ t: "hud", text: "" }, { t: "mode", remove: "nebula-mode" }, { t: "rows", n: 3 }, { t: "show", grid: clone(grid), pop: [] });
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🪆 The Doll Factory — golden button coins leave frames for the next spin
// =====================================================================
function doll(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const FR = cfg.frames;
    const ev = g => waysEval(cfg, g, bet);
    const doMb = hit("musicbox"), doQ = !doMb && hit("quilt");
    let frames = (state.frames || []).slice(0, FR.max);
    const doCap = !doMb && hit("capture");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doMb) inject(grid, "ZT", 3); else scatterTease(grid, "ZT", false, 5);
    if (doCap && !frames.length) frames = shuffle(cellsAll(grid).filter(([c, r]) => !isZ(grid[c][r]))).slice(0, 2 + ri(3)).map(([c, r]) => key(c, r));
    // coins: inside frames only when the capture hits, elsewhere now and then
    const coins = [];
    if (doCap) for (const k of shuffle([...frames]).slice(0, 1 + ri(Math.min(3, frames.length)))) coins.push(k.split(",").map(Number));
    if (R() < FR.coin * 3) for (const [c, r] of shuffle(plainCells(grid)).filter(([c, r]) => !frames.includes(key(c, r))).slice(0, 1 + ri(2))) coins.push([c, r]);
    const val = new Map();
    for (const [c, r] of coins) { grid[c][r] = "ZB"; val.set(key(c, r), cash(cfg, bet, pickW(SMALL))); }
    const phases = [spinPhase(grid, "ZT", doMb)];
    const badges = (fr, vals) => [...fr.map(k => { const [c, r] = k.split(",").map(Number); return { c, r, text: vals.has(k) ? "🖼️ " + short(vals.get(k)) : "🖼️", cls: "frame" }; }),
        ...[...vals.entries()].filter(([k]) => !fr.includes(k)).map(([k, v]) => { const [c, r] = k.split(",").map(Number); return { c, r, text: short(v), cls: "val" }; })];
    if (frames.length || val.size) phases.push({ t: "badge", cells: badges(frames, val) });
    const e = ev(grid);
    let baseWin = winP(phases, cfg, e, "🪆");
    let five = e.five;
    // capture: coins inside frames → coin total × number of frames
    const caught = [...val.keys()].filter(k => frames.includes(k));
    if (caught.length) {
        kinds.push("capture"); feat(cfg, "capture");
        phases.push({ t: "fx", name: "capture" });
        const sum = caught.reduce((s, k) => s + val.get(k), 0);
        pay(phases, sum * frames.length, `🔘 FRAME CAPTURE · ${short(sum)} × 액자 ${frames.length}`, caught.map(k => k.split(",").map(Number)));
    }
    endFeat();
    // ---- 🧵 Patchwork Quilt — a tetromino-like patch of 4–7 tiles turns into doll wilds
    if (doQ) {
        kinds.push("quilt"); feat(cfg, "quilt");
        phases.push({ t: "fx", name: "quilt" });
        const n = 4 + ri(4), cells = [[1 + ri(3), ri(3)]];
        for (let k = 0; k < 60 && cells.length < n; k++) {
            const [c, r] = cells[ri(cells.length)], [dc, dr] = [[1, 0], [-1, 0], [0, 1], [0, -1]][ri(4)], x = c + dc, y = r + dr;
            if (x < 0 || y < 0 || x > 4 || y > 2 || cells.some(([a, b]) => a === x && b === y) || isZ(grid[x][y])) continue;
            cells.push([x, y]);
        }
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🧵 PATCHWORK QUILT! 퀼트 조각 ${cells.length}칸이 도자기 인형 WILD로!` });
        const r = ensureRun(cfg, grid, ev, phases, "🧵 바늘이 한 땀 더 꿰맨다!");
        grid = r.grid;
        baseWin = 0;
        winP(phases, cfg, r.ev, "🧵 QUILT WILDS");
        five += r.ev.five;
    }
    endFeat();
    // frames for the next spin: every coin leaves one
    let next = [...val.keys()].slice(0, FR.max);
    // ---- 🎩 Music Box wheel — jackpot or 8~15 free spins (frames persist)
    if (doMb) {
        kinds.push("musicbox"); feat(cfg, "musicbox");
        phases.push({ t: "fx", name: "musicbox" });
        const SEG = ["MINI", "8 FS", "MINOR", "10 FS", "MAJOR", "12 FS", "GRAND", "15 FS", "8 FS", "MINI"], WT = [14, 22, 8, 16, 2, 10, 0.5, 5, 22, 14];
        const ft = forcedTier(cfg, force);
        let idx = wheelIdx(SEG, WT);
        if (ft) idx = SEG.indexOf(ft);
        phases.push({ t: "wheel", seg: SEG, idx, title: "🎩 MUSIC BOX WHEEL" });
        if (!SEG[idx].endsWith("FS")) pushJp(phases, cfg, ctx, ft || jpGate(cfg, SEG[idx], bet));
        else {
            const n = +SEG[idx].split(" ")[0];
            let fr = [...new Set([...frames, ...next])].slice(0, 8);
            phases.push({ t: "banner", text: `🎩 MUSIC BOX · ${n} FREE SPINS · 액자 유지! 🎩`, cls: "bonus" }, { t: "mode", add: "doll-mode" });
            for (let i = 0; i < n; i++) {
                phases.push({ t: "hud", text: `🎶 FREE SPIN ${i + 1} / ${n} · 🖼️ ${fr.length}` });
                const g = draw(cfg, 5, 3, { W: [0, 1.2, 1.2, 1.2, 0] }), v = new Map();
                if (fr.length && R() < 0.3) for (const k of shuffle([...fr]).slice(0, 1 + ri(2))) v.set(k, cash(cfg, bet, pickW(SMALL)));
                if (R() < 0.25) for (const [c, r] of shuffle(plainCells(g)).slice(0, 1)) v.set(key(c, r), cash(cfg, bet, pickW(SMALL)));
                for (const k of v.keys()) { const [c, r] = k.split(",").map(Number); g[c][r] = "ZB"; }
                phases.push({ t: "spin", grid: clone(g) });
                if (fr.length || v.size) phases.push({ t: "badge", cells: badges(fr, v) });
                const x = ev(g); five += x.five;
                winP(phases, cfg, x, "🎶");
                const got = [...v.keys()].filter(k => fr.includes(k));
                if (got.length) pay(phases, got.reduce((s, k) => s + v.get(k), 0) * fr.length, `🔘 FRAME CAPTURE × ${fr.length}`, got.map(k => k.split(",").map(Number)));
                fr = [...new Set([...fr, ...v.keys()])].slice(0, 8);
            }
            phases.push({ t: "hud", text: "" }, { t: "mode", remove: "doll-mode" });
            next = [];
        }
    }
    endFeat();
    state.frames = next;
    phases.push({ t: "meter", key: "frames", value: next.length, max: FR.max });
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🐨 Eucalyptus Rush — koala blitz stay & spin, boomerangs, treetop free games
// =====================================================================
function koala(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = g => waysEval(cfg, g, bet);
    const doBl = hit("blitz"), doCa = !doBl && hit("canopy");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    const chomp = doBl && (force === "blitz:chomp" || (!force && R() < F.chomp.p));
    if (doBl) inject(grid, "ZK", chomp ? 7 + ri(2) : 6, { distinct: false });
    else if (R() < 0.05) inject(grid, "ZK", 3 + ri(3), { distinct: false });
    if (doCa) inject(grid, "ZT", 3); else if (!doBl) scatterTease(grid, "ZT", false, 5);
    const phases = [spinPhase(grid, doCa ? "ZT" : "ZK", doBl || doCa)];
    const e = ev(grid);
    const baseWin = winP(phases, cfg, e, "🍃");
    let five = e.five;
    if (doBl) {
        kinds.push("blitz"); feat(cfg, "blitz");
        phases.push({ t: "fx", name: "blitz" });
        const meds = cellsOfSym(grid, "ZK"), extraN = Math.max(0, meds.length - 6);
        const init = meds.map(([c, r], i) => [c, r, i >= meds.length - extraN ? { v: cash(cfg, bet, pickW(VALS)), boom: true, label: "🪃" } : { v: cash(cfg, bet, pickW(VALS)) }]);
        const ft = forcedTier(cfg, force);
        const r = holdSpin(cfg, ctx, phases, {
            C: 5, Rn: 3, init, start: init.length, p: ft ? 0.3 : 0.085, lives: 3, sym: "ZK", title: "🐨 KOALA BLITZ STAY & SPIN 🐨",
            coin: coinMaker(cfg, bet, { jp: 0.04, tw: { MINI: 60, MINOR: 30, MAXI: 8, MAJOR: 2 }, extra: [{ p: 0.035, coin: { special: true, boom: true, label: "🪃" } }] }),
            onAdd: (board, added, _b, ph) => {
                for (const [c, rr] of added) {
                    const cn = board.get(key(c, rr));
                    if (!cn.boom) continue;
                    cn.v = cash(cfg, bet, pickW(SMALL));
                    const sum = [...board.values()].reduce((s, x) => s + (x.v || 0), 0);
                    ph.push({ t: "focus", cells: [[c, rr]] }, { t: "fx", name: "chomp" });
                    pay(ph, sum, "🪃 DOUBLE-CHOMP XTRA HIT · 모든 코인 재지급");
                }
            }
        });
        payBoard(cfg, ctx, phases, r.board, { label: "🐨 KOALA BLITZ", full: r.full || !!ft, fullTier: ft || "GRAND" });
        // the extra medallions of the trigger spin came back as boomerangs
        const sum = [...r.board.values()].reduce((s, x) => s + (x.v || 0), 0);
        for (let i = 0; i < extraN; i++) { phases.push({ t: "fx", name: "chomp" }); pay(phases, sum, "🪃 BOOMERANG RETURN · 모든 코인 재지급"); }
        if (extraN) kinds.push("chomp");
        phases.push({ t: "show", grid: clone(grid), pop: [] });
    }
    endFeat();
    if (doCa) {
        kinds.push("canopy_free"); feat(cfg, "canopy");
        phases.push({ t: "fx", name: "canopy" });
        const n = 5 + ri(4);
        const r = freeLoop(cfg, ctx, phases, {
            n, title: `🌳 TREETOP CANOPY · ${n} FREE GAMES 🌳`, mode: "canopy-mode",
            drawFn: () => {
                const g = draw(cfg, 5, 3, { W: [0, 1.6, 1.6, 1.6, 0] });
                for (let c = 1; c <= 3; c++) { const r = g[c].indexOf("W"); if (r >= 0 && R() < 0.5) g[c][r === 2 ? 1 : r + 1] = "W"; } // stacked wilds
                return g;
            },
            evalFn: g => {
                const wr = [1, 2, 3].filter(c => g[c].includes("W"));
                if (wr.length >= 2) {
                    for (const c of wr) g[c] = ["W", "W", "W"];
                    phases.push({ t: "morph", grid: clone(g), cells: wr.flatMap(c => [[c, 0], [c, 1], [c, 2]]), fx: "wild", text: `🐨 코알라가 ${wr.length}개 릴에 앉았다! 릴 전체 WILD!` });
                }
                const x = ev(g); x.prefix = "🌳"; return x;
            }
        });
        five += r.five;
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 📖 Grimoire of Fortune — 5x5 ways, book icons fly in and open a bonus page
// =====================================================================
function grimoire(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = (g, scale = 1) => waysEval(cfg, g, bet, { scale });
    const doFree = hit("free"), doJp = !doFree && hit("jackpot"), doWiz = !doFree && !doJp && hit("wizard"), doMag = !doFree && !doJp && !doWiz && hit("magic"), doKiss = !doFree && !doJp && !doWiz && !doMag && hit("kiss");
    const page = doFree ? "free" : doJp ? "jackpot" : doWiz ? "wizard" : doMag ? "magic" : doKiss ? "kiss" : null;
    let grid = draw(cfg, 5, 5);
    const points = addPoints(grid);
    const kinds = [];
    if (page) inject(grid, "ZP", page === "free" || page === "jackpot" ? 3 : 2 + ri(2));
    else if (R() < 0.06) inject(grid, "ZP", 2);
    const phases = [spinPhase(grid, "ZP", page === "free" || page === "jackpot")];
    const PAGE = { magic: "✨ MAGIC PAGE", kiss: "💋 KISS PAGE", jackpot: "🃏 JACKPOT PAGE", wizard: "🧙 WIZARD PAGE", free: "📕 FREE SPIN PAGE" };
    if (page) phases.push({ t: "focus", cells: cellsOfSym(grid, "ZP") }, { t: "fx", name: "bookgrow" }, { t: "banner", text: `📖 ${PAGE[page]} 📖`, cls: "bonus" });
    const scatterWilds = (n, text) => {
        const cells = shuffle(plainCells(grid)).slice(0, n);
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text });
    };
    const SEGW = ["5 WILDS", "6 WILDS", "8 WILDS", "10 WILDS", "5 WILDS", "7 WILDS", "12 WILDS", "25 WILDS", "6 WILDS", "15 WILDS"], WTW = [22, 18, 12, 6, 22, 14, 2, 0.04, 18, 0.5];
    if (doMag || doWiz) {
        kinds.push(page); feat(cfg, page);
        const idx = wheelIdx(SEGW, WTW), n = +SEGW[idx].split(" ")[0];
        phases.push({ t: "fx", name: page === "magic" ? "magicpage" : "wizard" }, { t: "wheel", seg: SEGW, idx, title: page === "magic" ? "✨ MAGIC WHEEL" : "🧙 WIZARD WHEEL" });
        scatterWilds(n, `${page === "magic" ? "✨" : "🧙"} WILD ${n}개가 책장에서 쏟아진다!`);
        if (doWiz) {
            const SEGM = ["x2", "x3", "x2", "x4", "x2", "x5", "x3", "x2"], i2 = wheelIdx(SEGM, [30, 20, 30, 10, 30, 4, 20, 30]), m = +SEGM[i2].slice(1);
            phases.push({ t: "wheel", seg: SEGM, idx: i2, title: "🧙 WIZARD MULTIPLIER" });
            const cells = cellsAll(grid).filter(([c, r]) => grid[c][r] === "W");
            for (const [c, r] of cells) grid[c][r] = "W" + m;
            phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🧙 모든 WILD에 x${m} 마법!` });
        }
    }
    if (doKiss) {
        kinds.push("kiss"); feat(cfg, "kiss");
        phases.push({ t: "fx", name: "kiss" });
        let ws = cellsAll(grid).filter(([c, r]) => grid[c][r] === "W");
        if (ws.length < 2) { const add = shuffle(plainCells(grid).filter(([c]) => c >= 1 && c <= 3)).slice(0, 2 + ri(2)); for (const [c, r] of add) grid[c][r] = "W"; ws = [...ws, ...add]; }
        for (const [c, r] of ws) grid[c][r] = pickW([["W2", 40], ["W3", 30], ["W4", 18], ["W5", 12]]);
        phases.push({ t: "morph", grid: clone(grid), cells: ws, fx: "flare", text: `💋 KISS! WILD ${ws.length}개에 x2~x5 키스 마크!` });
    }
    const feature = doMag || doWiz || doKiss;
    let e = ev(grid);
    if (feature && !e.win) { const r = ensureRun(cfg, grid, g => ev(g), phases, "📖 책장이 한 장 더 넘어간다!"); grid = r.grid; e = r.ev; }
    const w0 = winP(phases, cfg, e, page ? PAGE[page] : "📖");
    const baseWin = feature ? 0 : w0;
    let five = e.five;
    endFeat();
    if (doJp) {
        kinds.push("jackpot"); feat(cfg, "jackpot");
        phases.push({ t: "fx", name: "joker" });
        const ft = forcedTier(cfg, force);
        const t = ft || pickW([["MINI", 48], ["MINOR", 30], ["MAXI", 15], ["MAJOR", 5], ["GRAND", 1.4], ["MEGA", 0.25]]);
        const tier = ft || (t === "MEGA" ? (R() < ctx.bet / cfg.bets[cfg.bets.length - 1] ? "MEGA" : "GRAND") : jpGate(cfg, t, bet));
        phases.push(matchPick(cfg, ctx, "🃏 JACKPOT PAGE · 조커와 함께 잭팟 3개를 맞춰라 🃏", "🃏", ["MINI", "MINOR", "MAXI", "MAJOR", "GRAND", "MEGA"], tier));
        pushJp(phases, cfg, ctx, tier);
    }
    endFeat();
    if (doFree) {
        kinds.push("page_free"); feat(cfg, "free");
        const r = freeLoop(cfg, ctx, phases, {
            n: F.free.spins || 8, title: "📕 FREE SPIN PAGE · 8 FREE SPINS 📕", mode: "book-mode",
            drawFn: () => {
                const g = draw(cfg, 5, 5, { W: [0, 1, 1, 1, 0] });
                if (R() < 0.2) for (const [c, r] of cellsAll(g).filter(([c, r]) => g[c][r] === "W")) g[c][r] = pickW([["W2", 50], ["W3", 30], ["W5", 10]]);
                return g;
            },
            evalFn: g => ev(g)
        });
        five += r.five;
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

const wrap = fn => (cfg, ctx) => { endFeat(); try { return fn(cfg, ctx); } finally { endFeat(); } };
export const MYTH_MACHINES = Object.fromEntries(Object.entries({
    sp_spooky: spooky, sp_bigtop: bigtop, sp_fate: fate, sp_harvest: harvest, sp_vault: vault, sp_sonar: sonar,
    sp_magma: magma, sp_ascend: ascend, sp_doll: doll, sp_koala: koala, sp_grimoire: grimoire
}).map(([k, fn]) => [k, wrap(fn)]));
