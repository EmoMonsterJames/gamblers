// =====================================================================
// Slot engine — pure logic, no DOM. One call to spin() decides the whole
// result (base grid, ways wins, features, jackpots, points, teasing) and
// returns the new machine state; the slot screen only animates it.
//
// Design: "feature first". Each spin first rolls whether a feature hits
// (probabilities in cfg.features.*.p, raised by pet luck), then draws a
// grid from the paying-symbol weights and injects the bonus symbols that
// explain the result. That keeps bonus frequency exact and lets the
// screen tease near-misses on purpose.
// =====================================================================
import { JACKPOT_RANK } from "../data/catalog.js";

export const CARD_SYMS = ["A", "K", "Q", "J", "T"];
const rand = Math.random;
const ri = n => Math.floor(rand() * n);
function pickW(pairs) { // [[value, weight], ...]
    let s = 0; for (const p of pairs) s += p[1];
    let r = rand() * s;
    for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; }
    return pairs[pairs.length - 1][0];
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ------------------------------------------------------------ jackpots
export function jackpotValue(cfg, tier, bet, pool) {
    const j = cfg.jp?.[tier];
    if (!j) return 0;
    if (j.x) return j.x * bet;                       // fixed tiers (MINI/MINOR/MAXI)
    return Math.round(pool?.[tier] ?? j.seed ?? 0);  // progressive (MAJOR/GRAND)
}
// Big progressive tiers become likelier with a bigger bet.
function betScale(cfg, bet) { return bet / cfg.bets[cfg.bets.length - 1]; }
function gateTier(cfg, tier, bet) {
    if (cfg.linearGate) { // chance ∝ bet → the jackpot share of RTP is the same at every bet
        if (tier === "GRAND" && rand() > betScale(cfg, bet)) tier = "MAJOR";
        if (tier === "MAJOR" && rand() > betScale(cfg, bet)) tier = "MAXI";
        return tier;
    }
    if (tier === "GRAND" && rand() > betScale(cfg, bet) * (cfg.grandGate ?? 0.25)) return "MAJOR";
    if (tier === "MAJOR" && rand() > 0.35 + 0.65 * betScale(cfg, bet)) return cfg.jp.MAXI ? "MAXI" : "MINOR";
    return tier;
}

// ------------------------------------------------------------ grid
function reelPairs(cfg, mode, reel) {
    const base = cfg.w, over = mode !== "base" ? (cfg.wFree || {}) : {};
    const out = [];
    for (const s of Object.keys(cfg.syms)) {
        let w = over[s] ?? base[s] ?? 0;
        if (Array.isArray(w)) w = w[reel] ?? 0;
        if (w > 0) out.push([s, w]);
    }
    const wild = cfg.wild;
    if (wild) {
        let w = (mode !== "base" && wild.wFree) ? wild.wFree : wild.w;
        if (Array.isArray(w)) w = w[reel] ?? 0;
        if (w > 0) out.push(["W", w]);
    }
    return out;
}
export function drawGrid(cfg, mode = "base", rows = null) {
    const R = cfg.reels || 5;
    const grid = [];
    for (let c = 0; c < R; c++) {
        const n = Array.isArray(rows) ? rows[c] : (rows || cfg.rows || 3);
        const pairs = reelPairs(cfg, mode, c);
        const col = [];
        for (let r = 0; r < n; r++) col.push(pickW(pairs));
        grid.push(col);
    }
    return grid;
}
// put `count` copies of sym on distinct reels (or anywhere when anyCell)
function inject(grid, sym, count, { distinctReels = true, avoid = null } = {}) {
    const cells = [];
    if (distinctReels) {
        const reels = shuffle([...grid.keys()]).slice(0, Math.min(count, grid.length));
        for (const c of reels) {
            const free = grid[c].map((s, r) => r).filter(r => !isSpecial(grid[c][r]) && (!avoid || !avoid(c, r)));
            if (!free.length) continue;
            const r = free[ri(free.length)];
            grid[c][r] = sym; cells.push([c, r]);
        }
    } else {
        const all = [];
        grid.forEach((col, c) => col.forEach((s, r) => { if (!isSpecial(s) && (!avoid || !avoid(c, r))) all.push([c, r]); }));
        for (const [c, r] of shuffle(all).slice(0, count)) { grid[c][r] = sym; cells.push([c, r]); }
    }
    return cells;
}
const SPECIAL = new Set(["F", "P", "C", "M", "M1", "M2", "M3", "R", "X", "B", "L"]);
function isSpecial(s) { return SPECIAL.has(s); }
export function countSym(grid, sym) { let n = 0; for (const col of grid) for (const s of col) if (s === sym) n++; return n; }
function cellsOf(grid, sym) { const out = []; grid.forEach((col, c) => col.forEach((s, r) => { if (s === sym) out.push([c, r]); })); return out; }

// ------------------------------------------------------------ ways evaluation
export function evalWays(cfg, grid, bet, mult = 1, wildReels = []) {
    const lines = [];
    let total = 0;
    for (const s of Object.keys(cfg.syms)) {
        const pay = cfg.syms[s].pay;
        if (!pay) continue;
        let ways = 1, n = 0;
        const cells = [];
        for (let c = 0; c < grid.length; c++) {
            const hit = [];
            grid[c].forEach((x, r) => { if (x === s || x === "W" || wildReels.includes(c)) hit.push([c, r]); });
            if (!hit.length) break;
            ways *= hit.length; n++; cells.push(...hit);
        }
        if (n >= 3) {
            const p = pay[Math.min(n, 5) - 3] * ways * bet * (cfg.px || 1) * mult;
            if (p > 0) { lines.push({ sym: s, n, ways, win: Math.round(p), cells }); total += p; }
        }
    }
    return { win: Math.round(total), lines };
}

// ------------------------------------------------------------ points (P icon)
const P_COUNT = [[0, 90], [1, 6.5], [2, 2.2], [3, 0.9], [4, 0.3], [5, 0.1]];
export const P_POINTS = [0, 1, 3, 6, 10, 20];
function addPoints(grid, cfg) {
    if (cfg.noPoints) return 0;
    const n = pickW(P_COUNT);
    if (n) inject(grid, "P", n, { distinctReels: n <= grid.length });
    return P_POINTS[Math.min(n, 5)];
}

// ------------------------------------------------------------ bonus pieces
function holdBonus(cfg, bet, startCoins, modifier = null) {
    const h = cfg.features.hold;
    const R = cfg.reels || 5, ROWS = h.rows || cfg.rows || 3;
    const total = R * ROWS;
    const board = new Map(); // key "c,r" -> coin
    const coin = () => {
        const v = pickW(h.coin.v.map((x, i) => [x, h.coin.w[i]]));
        if (isNaN(+v)) { const tier = gateTier(cfg, v, bet); return { jp: tier }; }
        return { v: Math.round(+v * bet) };
    };
    const empties = () => { const e = []; for (let c = 0; c < R; c++) for (let r = 0; r < ROWS; r++) if (!board.has(c + "," + r)) e.push([c, r]); return e; };
    const steps = [];
    // starting coins
    const first = [];
    for (const [c, r] of shuffle(empties()).slice(0, startCoins)) { const k = c + "," + r; const cn = coin(); board.set(k, cn); first.push({ c, r, ...cn }); }
    if (modifier) { // Bonanza thermometer modifier coin
        const e = empties(); if (e.length) { const [c, r] = e[ri(e.length)]; board.set(c + "," + r, { mod: modifier, v: 0 }); first.push({ c, r, mod: modifier, v: 0 }); }
    }
    steps.push({ added: first, lives: h.lives || 3 });
    let lives = h.lives || 3;
    const land = h.land ?? 0.07;
    while (lives > 0 && board.size < total) {
        const added = [];
        for (const [c, r] of empties()) {
            if (rand() < land) { const cn = coin(); board.set(c + "," + r, cn); added.push({ c, r, ...cn }); }
        }
        if (added.length) lives = h.lives || 3; else lives--;
        steps.push({ added, lives });
    }
    // modifiers resolve at the end
    const mods = [];
    for (const [k, cn] of board) {
        if (!cn.mod) continue;
        const [c, r] = k.split(",").map(Number);
        const near = [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].map(([a, b]) => board.get(a + "," + b)).filter(x => x && x.v && !x.mod);
        if (cn.mod === "hot") { cn.v = [...board.values()].filter(x => x.v && !x.mod).reduce((s, x) => s + x.v, 0); mods.push({ c, r, mod: "hot", v: cn.v }); }
        if (cn.mod === "cold") { const m = pickW([[2, 45], [3, 30], [4, 15], [5, 10]]); near.forEach(x => x.v *= m); mods.push({ c, r, mod: "cold", m }); }
        if (cn.mod === "extra") { near.forEach(x => x.v = Math.round(x.v * 1.5)); mods.push({ c, r, mod: "extra" }); }
    }
    const full = board.size >= total;
    const jackpots = [...board.values()].filter(x => x.jp).map(x => x.jp);
    if (full) jackpots.push(gateTier(cfg, "GRAND", bet) === "GRAND" ? "GRAND" : "MAJOR");
    const coinSum = [...board.values()].reduce((s, x) => s + (x.v || 0), 0);
    return { type: "hold", steps, mods, full, coinSum, jackpots, rows: ROWS, reels: R, final: [...board.entries()].map(([k, v]) => { const [c, r] = k.split(",").map(Number); return { c, r, ...v }; }) };
}

function pickBonus(cfg, bet, tierWeights, title) {
    const tiers = Object.keys(tierWeights);
    let tier = pickW(tiers.map(t => [t, tierWeights[t]]));
    const baseTier = tier.replace("_X2", "");
    let g = gateTier(cfg, baseTier, bet);
    if (g !== baseTier) tier = g;
    // reveal sequence: winner x3 (last one ends it), decoys at most 2 each
    const decoys = [];
    for (const t of tiers.map(t => t.replace("_X2", "")).filter((t, i, a) => a.indexOf(t) === i && t !== tier.replace("_X2", ""))) {
        const k = ri(3); for (let i = 0; i < k; i++) decoys.push(t);
    }
    const pre = shuffle([tier.replace("_X2", ""), tier.replace("_X2", ""), ...decoys.slice(0, 7)]);
    const seq = [...pre, tier.replace("_X2", "")];
    const x2 = tier.endsWith("_X2");
    return { type: "pick", title, tier: tier.replace("_X2", ""), x2, seq, tiles: 12 };
}

function wheelBonus(cfg, bet, wh) {
    const idx = pickW(wh.seg.map((s, i) => [i, wh.w[i]]));
    const seg = wh.seg[idx];
    let jp = null, mult = 0;
    if (isNaN(parseFloat(seg))) jp = gateTier(cfg, seg, bet); else mult = parseFloat(seg);
    return { type: "wheel", seg: wh.seg, idx, jp, mult, win: Math.round(mult * bet) };
}

function freeBonus(cfg, bet, spins, opts = {}) {
    const f = cfg.features.free;
    const mult = opts.mult ?? f.mult ?? 1;
    const out = [];
    let left = spins, rows = opts.grow ? 3 : null, extra = 0, guard = 0;
    while (left > 0 && guard++ < 60) {
        left--;
        let rowSpec = null;
        if (opts.grow) {
            const g = cfg.features.grow;
            if (rows < g.max && rand() < g.pGrow) rows++;
            rowSpec = rows;
        }
        const grid = drawGrid(cfg, "free", rowSpec);
        let wildReels = [];
        if (f.wildReels && rand() < f.wildReels) wildReels = shuffle([1, 2, 3]).slice(0, 1 + (rand() < 0.25 ? 1 : 0));
        const pts = addPoints(grid, cfg);
        let retrig = 0;
        if (!opts.grow && f.retrigger && rand() < f.retrigger) { inject(grid, "F", 3); retrig = f.retriggerSpins || 5; left += retrig; extra += retrig; }
        const ev = evalWays(cfg, grid, bet, mult, wildReels);
        out.push({ grid, win: ev.win, lines: ev.lines, points: pts, wildReels, retrig, rows: rowSpec });
    }
    return { type: opts.grow ? "grow" : "free", spins: out, mult, total: out.reduce((s, x) => s + x.win, 0), points: out.reduce((s, x) => s + x.points, 0), extra };
}

// ------------------------------------------------------------ main spin
// ctx: { bet, state, luck:{win,bonus}, pool:{MAJOR,GRAND} }
export function spin(cfg, ctx) {
    if (cfg.engine === "classic") return classicSpin(cfg, ctx);
    if (cfg.engine === "monkey") return monkeySpin(cfg, ctx);
    const { bet } = ctx;
    const state = structuredClone(ctx.state || {});
    const F = cfg.features || {};
    const boost = 1 + (ctx.luck?.bonus || 0);
    const grid = drawGrid(cfg, "base");
    const features = [];
    const meterEvents = [];
    let wildReels = [];

    // ---- feature decisions (ctx.force = practice-room bonus test)
    const hit = k => F[k] && (ctx.force ? ctx.force === k : rand() < F[k].p * boost);
    const doFree = hit("free"), doHold = !doFree && hit("hold"), doWheel = !doFree && !doHold && hit("wheel"), doPick = !doFree && !doHold && !doWheel && hit("pick");

    // ---- free spins: scatters
    if (F.free) {
        if (doFree) {
            const n = pickW([[3, 80], [4, 16], [5, 4]]);
            inject(grid, "F", n);
            const spins = F.free.byCount ? F.free.byCount[n - 3] : F.free.spins;
            features.push({ pending: "free", n, spins });
        } else if (rand() < (F.free.tease ?? 0.08)) inject(grid, "F", 2, { avoid: (c) => c >= 3 }); // tease
        else if (rand() < 0.15) inject(grid, "F", 1);
    }
    // ---- hold & spin: coins
    if (F.hold && F.hold.sym) {
        const need = F.hold.trigger || 6;
        if (doHold) { inject(grid, "C", need + pickW([[0, 70], [1, 22], [2, 8]]), { distinctReels: false }); features.push({ pending: "hold" }); }
        else if (rand() < 0.10) inject(grid, "C", need - 1 - ri(2), { distinctReels: false }); // so close…
        else if (rand() < 0.3) inject(grid, "C", 1 + ri(2), { distinctReels: false });
    }
    // ---- wheel symbols
    if (F.wheel && F.wheel.sym) {
        if (doWheel) { inject(grid, "R", 3); features.push({ pending: "wheel" }); }
        else if (rand() < 0.07) inject(grid, "R", 2, { avoid: c => c >= 3 });
    }
    // ---- pick (jackpot) symbols
    if (F.pick && F.pick.sym) {
        if (doPick) { inject(grid, "X", 3); features.push({ pending: "pick" }); }
        else if (rand() < 0.06) inject(grid, "X", 2, { avoid: c => c >= 3 });
    }

    // ---- persistent machine meters
    const M = cfg.meter;
    if (M) {
        if (M.kind === "thermo") {
            state.thermo = state.thermo || { hot: 0, extra: 0, cold: 0 };
            for (const [key, sym] of [["hot", "M1"], ["extra", "M2"], ["cold", "M3"]]) {
                if (rand() < M.p * boost) {
                    const n = 1 + (rand() < 0.2 ? 1 : 0);
                    inject(grid, sym, n);
                    state.thermo[key] = Math.min(M.max, state.thermo[key] + n);
                    meterEvents.push({ key, add: n, value: state.thermo[key] });
                    if (state.thermo[key] >= M.max) { features.push({ pending: "hold", modifier: key, start: 6 }); state.thermo[key] = 0; meterEvents.push({ key, full: true }); }
                }
            }
        } else if (M.kind === "reelcoins") {
            state.cols = state.cols || Array(grid.length).fill(0);
            for (let c = 0; c < grid.length; c++) {
                if (rand() < M.p * boost) {
                    inject(grid.map((col, i) => i === c ? col : []), "M", 1); // place on this reel
                    state.cols[c]++;
                    meterEvents.push({ reel: c, value: state.cols[c] });
                    if (state.cols[c] >= M.max) { wildReels.push(c); state.cols[c] = 0; meterEvents.push({ reel: c, full: true }); }
                }
            }
        } else {
            state.meter = state.meter || 0;
            if (rand() < M.p * boost) {
                const n = 1 + (rand() < 0.25 ? 1 : 0);
                inject(grid, "M", n, { distinctReels: true });
                const add = M.addPerSym ? n : 1;
                state.meter = Math.min(M.max, state.meter + add);
                meterEvents.push({ add, value: state.meter });
                if (state.meter >= M.max) {
                    state.meter = 0; meterEvents.push({ full: true });
                    let what = M.onFull;
                    if (what === "grow_or_hold") what = rand() < 0.5 ? "grow" : "hold";
                    features.push({ pending: what, fromMeter: true });
                }
            }
        }
    }

    const points = addPoints(grid, cfg);
    const base = evalWays(cfg, grid, bet, 1, wildReels);

    // ---- resolve features
    const done = [];
    const jackpots = [];
    for (const f of features) {
        if (f.pending === "free") done.push(freeBonus(cfg, bet, f.spins, {}));
        else if (f.pending === "grow") done.push(freeBonus(cfg, bet, cfg.features.grow.spins, { grow: true, mult: 1 }));
        else if (f.pending === "hold") {
            const b = holdBonus(cfg, bet, f.start || cfg.features.hold.start || 6, f.modifier || null);
            b.modifier = f.modifier || null;
            done.push(b);
        } else if (f.pending === "wheel") done.push(wheelBonus(cfg, bet, F.wheel));
        else if (f.pending === "pick") {
            const tw = f.fromMeter && M?.pickTw ? M.pickTw : F.pick.tw;
            done.push(pickBonus(cfg, bet, tw, f.fromMeter ? M.title : F.pick.title));
        }
    }
    // jackpot values + feature totals
    let featureWin = 0, featurePoints = 0;
    for (const d of done) {
        if (d.type === "hold") {
            d.jpWins = d.jackpots.map(t => ({ tier: t, amount: jackpotValue(cfg, t, bet, ctx.pool) }));
            d.total = d.coinSum + d.jpWins.reduce((s, x) => s + x.amount, 0);
            jackpots.push(...d.jackpots);
        } else if (d.type === "pick") {
            d.amount = jackpotValue(cfg, d.tier, bet, ctx.pool) * (d.x2 ? 2 : 1);
            d.total = d.amount; jackpots.push(d.tier);
        } else if (d.type === "wheel") {
            if (d.jp) { d.amount = jackpotValue(cfg, d.jp, bet, ctx.pool); jackpots.push(d.jp); d.total = d.amount; }
            else d.total = d.win;
        }
        featureWin += d.total || 0;
        featurePoints += d.points || 0;
    }
    let total = base.win + featureWin;
    const maxWin = (cfg.maxX || 5000) * bet;
    // progressive jackpots are paid in full; the cap only applies to the rest
    const jpProg = done.reduce((s, d) => s + (d.type === "hold" ? d.jpWins.filter(x => !cfg.jp[x.tier]?.x).reduce((a, x) => a + x.amount, 0) : (d.type === "pick" || (d.type === "wheel" && d.jp)) && !cfg.jp[d.tier || d.jp]?.x ? d.total : 0), 0);
    if (total - jpProg > maxWin) total = maxWin + jpProg;

    // ---- teasing: which reels get the long "anticipation" spin
    const anticipation = teaseReels(cfg, grid);
    return {
        grid, base, wildReels, features: done, jackpots, points: points + featurePoints,
        total: Math.round(total), bonus: done.length > 0, state, meterEvents, anticipation
    };
}

function teaseReels(cfg, grid) {
    const out = [];
    const trig = { F: 3, R: 3, X: 3 };
    for (const sym of Object.keys(trig)) {
        let n = 0;
        for (let c = 0; c < grid.length; c++) {
            if (n >= trig[sym] - 1 && !out.includes(c)) out.push(c);
            if (grid[c].includes(sym)) n++;
        }
    }
    const coins = countSym(grid, "C");
    if (cfg.features?.hold && coins >= (cfg.features.hold.trigger || 6) - 2) for (let c = 3; c < grid.length; c++) if (!out.includes(c)) out.push(c);
    return out.sort((a, b) => a - b);
}

// ------------------------------------------------------------ Monkey Drop (money tree)
// Reel coins (C) carry values and are thrown into a persistent money tree
// (state.tree). Hold & Spin starts with 6 coins dropped from the tree.
// Coin kinds: {x} bet multiple · {wheel} monkey wheel x2~x10 on the coin
// total · {monkey} boosts value coins every respin · {jp} jackpot coin.
// The monkey hanging from the tree falls more often the heavier the tree
// gets (state.tree.heap) → special 7-circle hold, full = MONKEY jackpot.
// Bonus column: monkey face (B) on reel 1 + prize coins on the following
// consecutive reels → collect them all.
export const MONKEY_WHEEL = { seg: ["2", "3", "5", "2", "4", "10", "3", "2", "6", "3", "8", "4"], w: [22, 16, 7, 22, 10, 1.2, 16, 22, 4, 16, 2, 10] };
function mCoin(cfg, bet, table, gate = true) {
    const v = pickW(table.v.map((x, i) => [x, table.w[i]]));
    if (v === "WHEEL") return { wheel: true };
    if (v === "MONKEY") return { monkey: true };
    if (isNaN(+v)) return { jp: gate ? gateTier(cfg, v, bet) : v };
    return { x: +v };
}
const boardCoin = (cn, bet) => cn.x != null ? { v: Math.round(cn.x * bet) } : cn.wheel ? { wheel: true } : cn.monkey ? { monkey: true } : { jp: cn.jp };
// a tree coin may only drop when its jackpot tier is allowed at this bet
function dropAllowed(cfg, cn, bet) {
    if (cn.jp === "GRAND") return rand() < betScale(cfg, bet) * (cfg.linearGate ? 1 : 2 * (cfg.grandGate ?? 0.25));
    if (cn.jp === "MAJOR") return rand() < (cfg.linearGate ? betScale(cfg, bet) : 0.35 + 0.65 * betScale(cfg, bet));
    return true;
}
function pickDrops(cfg, bet, tree, n) {
    const out = [];
    const pool = shuffle([...tree.coins]);
    for (const cn of pool) { if (out.length >= n) break; if (dropAllowed(cfg, cn, bet)) out.push(cn); }
    const ids = new Set(out.map(c => c.id));
    tree.coins = tree.coins.filter(c => !ids.has(c.id));
    while (out.length < n) out.push({ ...mCoin(cfg, bet, cfg.tree.coin), id: ++tree.n, fresh: true });
    return out;
}
// 5x3 Hold & Spin with wheel / monkey / jackpot coins
function monkeyHold(cfg, bet, drops, opts = {}) {
    const h = cfg.features.hold;
    const R = 5, ROWS = 3, total = R * ROWS;
    const board = new Map();
    const empties = () => { const e = []; for (let c = 0; c < R; c++) for (let r = 0; r < ROWS; r++) if (!board.has(c + "," + r)) e.push([c, r]); return e; };
    const steps = [];
    const first = [];
    shuffle(empties()).slice(0, drops.length).forEach(([c, r], i) => { const cn = boardCoin(drops[i], bet); board.set(c + "," + r, cn); first.push({ c, r, id: drops[i].id, ...cn }); });
    steps.push({ added: first, boosts: [], lives: h.lives });
    let lives = h.lives, guard = 0;
    while (lives > 0 && board.size < total && guard++ < 80) {
        const added = [];
        for (const [c, r] of empties()) if (rand() < (opts.land ?? h.land)) { const cn = boardCoin(mCoin(cfg, bet, h.coin), bet); board.set(c + "," + r, cn); added.push({ c, r, ...cn }); }
        // every monkey coin on the board boosts 1~2 value coins each respin
        const boosts = [];
        for (const [k, cn] of board) {
            if (!cn.monkey) continue;
            const [mc, mr] = k.split(",").map(Number);
            const vals = [...board.entries()].filter(([, x]) => x.v != null);
            for (const [vk, vc] of shuffle(vals).slice(0, 1 + (rand() < 0.35 ? 1 : 0))) {
                const add = Math.round(pickW(h.boost) * bet);
                vc.v += add;
                const [c, r] = vk.split(",").map(Number);
                boosts.push({ from: [mc, mr], c, r, add, v: vc.v });
            }
        }
        if (added.length) lives = h.lives; else lives--;
        steps.push({ added, boosts, lives });
    }
    const full = board.size >= total;
    const jackpots = [...board.values()].filter(x => x.jp).map(x => x.jp);
    if (full) jackpots.push(gateTier(cfg, "GRAND", bet)); // linear gate: GRAND → MAJOR → MAXI by bet
    const coinSum = [...board.values()].reduce((s, x) => s + (x.v || 0), 0);
    const wheels = [...board.entries()].filter(([, x]) => x.wheel).map(([k]) => {
        const [c, r] = k.split(",").map(Number);
        const idx = pickW(MONKEY_WHEEL.seg.map((s, i) => [i, MONKEY_WHEEL.w[i]]));
        return { c, r, idx, m: +MONKEY_WHEEL.seg[idx] };
    });
    const wheelMult = wheels.length ? wheels.reduce((s, w) => s + w.m, 0) : 1;
    return {
        type: "mhold", steps, full, coinSum, wheels, wheelMult, coinTotal: Math.round(coinSum * wheelMult), jackpots, rows: ROWS, reels: R,
        final: [...board.entries()].map(([k, v]) => { const [c, r] = k.split(",").map(Number); return { c, r, ...v }; })
    };
}
// the monkey falls: centre collector + 7 big-value circles; full = MONKEY
function monkeyFall(cfg, bet, opts = {}) {
    const f = cfg.features.fall;
    const N = 7;
    const board = new Map();
    const empties = () => [...Array(N).keys()].filter(i => !board.has(i));
    const coin = () => { const cn = mCoin(cfg, bet, f.coin); return cn.x != null ? { v: Math.round(cn.x * bet) } : { jp: cn.jp }; };
    const steps = [];
    const first = shuffle(empties()).slice(0, f.start).map(i => { const cn = coin(); board.set(i, cn); return { i, ...cn }; });
    steps.push({ added: first, lives: f.lives });
    let lives = f.lives, guard = 0;
    while (lives > 0 && board.size < N && guard++ < 80) {
        const added = [];
        for (const i of empties()) if (rand() < (opts.land ?? f.land)) { const cn = coin(); board.set(i, cn); added.push({ i, ...cn }); }
        if (added.length) lives = f.lives; else lives--;
        steps.push({ added, lives });
    }
    const full = board.size >= N;
    const jackpots = [...board.values()].filter(x => x.jp).map(x => x.jp);
    if (full) jackpots.push("MONKEY");
    const coinSum = [...board.values()].reduce((s, x) => s + (x.v || 0), 0);
    return { type: "mfall", steps, full, coinSum, coinTotal: coinSum, jackpots, slots: N };
}

function monkeySpin(cfg, ctx) {
    const { bet } = ctx;
    const state = structuredClone(ctx.state || {});
    const F = cfg.features, T = cfg.tree;
    const boost = 1 + (ctx.luck?.bonus || 0);
    const tree = state.tree ||= { coins: [], heap: 0, n: 0 };
    const grid = drawGrid(cfg, "base");
    const force = ctx.force || "";
    const fill = Math.min(1, tree.heap / T.heapMax);
    const roll = (k, p) => force ? force.split(":")[0] === k : rand() < p * boost;
    const doFree = roll("free", F.free.p);
    const doHold = !doFree && roll("hold", F.hold.p);
    const doFall = !doFree && !doHold && roll("fall", F.fall.p * (F.fall.min + (1 - F.fall.min) * 2 * fill));
    const doCol = !doFree && !doHold && !doFall && roll("column", F.column.p);
    const pending = [];
    const coinVals = {}; // "c,r" -> coin shown on the reel coin

    // ---- free-spin scatters
    if (doFree) { inject(grid, "F", 3); pending.push({ pending: "free" }); }
    else if (rand() < 0.08) inject(grid, "F", 2, { avoid: c => c >= 3 });
    else if (rand() < 0.15) inject(grid, "F", 1);
    // ---- bonus column: monkey face on reel 1, prize coins on following reels
    let colReels = 0;
    if (doCol) {
        grid[0][ri(3)] = "B";
        colReels = force === "column:max" ? 4 : pickW(F.column.len);
        for (let c = 1; c <= colReels; c++) {
            const n = pickW([[1, 70], [2, 25], [3, 5]]);
            for (const r of shuffle([0, 1, 2]).slice(0, n)) { grid[c][r] = "C"; coinVals[c + "," + r] = mCoin(cfg, bet, F.column.coin); }
        }
    } else if (!doFall && !doHold && rand() < 0.05) grid[0][ri(3)] = "B"; // monkey face with no coin next to it
    // ---- reel coins (thrown into the tree)
    const noCol = (c) => c === 1 && grid[0].includes("B");
    if (!doCol) {
        let n = 0;
        if (doHold) n = 6 + pickW([[0, 70], [1, 22], [2, 8]]);
        else if (rand() < 0.07) n = 4 + ri(2);       // so close…
        else if (rand() < T.throwP) n = pickW([[1, 60], [2, 28], [3, 12]]);
        for (const [c, r] of inject(grid, "C", n, { distinctReels: false, avoid: doHold ? null : noCol })) coinVals[c + "," + r] = mCoin(cfg, bet, T.coin, false);
    }
    // throw every non-column coin into the tree
    const throws = [];
    if (!doCol) for (const [k, cn] of Object.entries(coinVals)) {
        const [c, r] = k.split(",").map(Number);
        const coin = { ...cn, id: ++tree.n };
        tree.coins.push(coin);
        throws.push({ c, r, coin });
        tree.heap = Math.min(T.heapMax, tree.heap + 1);
    }
    while (tree.coins.length > T.max) tree.coins.splice(ri(tree.coins.length - throws.length || 1), 1);
    const treeMid = structuredClone(tree);
    // practice-room test seeds: make sure the special coin is in the drop
    let drops = null;
    if (doHold) {
        drops = pickDrops(cfg, bet, tree, 6);
        const seed = { wheel: { wheel: true }, monkey: { monkey: true }, jp: { jp: "MINOR" }, mix: null }[force.split(":")[1]];
        if (seed) drops[0] = { ...seed, id: drops[0].id };
        if (force === "hold:mix") { drops[0] = { wheel: true, id: drops[0].id }; drops[1] = { monkey: true, id: drops[1].id }; drops[2] = { jp: "MINI", id: drops[2].id }; }
        pending.push({ pending: "mhold" });
    }
    if (doFall) { pending.push({ pending: "mfall" }); tree.heap = 0; }

    const points = addPoints(grid, cfg);
    const base = evalWays(cfg, grid, bet, 1, []);

    // ---- resolve features
    const done = [];
    for (const p of pending) {
        if (p.pending === "free") done.push(freeBonus(cfg, bet, F.free.spins, {}));
        if (p.pending === "mhold") { const b = monkeyHold(cfg, bet, drops, force === "hold:full" ? { land: 0.6 } : {}); b.drops = drops.map(d => d.id); done.push(b); }
        if (p.pending === "mfall") done.push(monkeyFall(cfg, bet, force === "fall:full" ? { land: 0.7 } : {}));
    }
    if (doCol) {
        const coins = Object.entries(coinVals).map(([k, cn]) => { const [c, r] = k.split(",").map(Number); return { c, r, ...boardCoin(cn, bet) }; });
        const jps = coins.filter(x => x.jp).map(x => x.jp);
        const coinSum = coins.reduce((s, x) => s + (x.v || 0), 0);
        done.push({ type: "column", reels: colReels, coins, coinSum, coinTotal: coinSum, jackpots: jps });
    }
    const jackpots = [];
    let featureWin = 0, jpProg = 0;
    for (const d of done) {
        if (d.jackpots) {
            d.jpWins = d.jackpots.map(t => ({ tier: t, amount: jackpotValue(cfg, t, bet, ctx.pool) }));
            d.total = d.coinTotal + d.jpWins.reduce((s, x) => s + x.amount, 0);
            jpProg += d.jpWins.filter(x => !cfg.jp[x.tier]?.x).reduce((s, x) => s + x.amount, 0);
            jackpots.push(...d.jackpots);
        }
        featureWin += d.total || 0;
    }
    let total = base.win + featureWin;
    const maxWin = (cfg.maxX || 5000) * bet;
    if (total - jpProg > maxWin) total = maxWin + jpProg;
    const bonus = done.length > 0;
    const omen = (bonus && rand() < 0.6) || (!bonus && rand() < 0.03) ? 1 + ri(5) : 0;
    const anticipation = teaseReels(cfg, grid);
    if (countSym(grid, "C") >= 4) for (const c of [3, 4]) if (!anticipation.includes(c)) anticipation.push(c);
    if (grid[0].includes("B") && !anticipation.includes(1)) anticipation.push(1);
    return {
        monkey: true, grid, base, wildReels: [], features: done, jackpots, points: points + done.reduce((s, d) => s + (d.points || 0), 0),
        total: Math.round(total), bonus, state, meterEvents: [], anticipation: anticipation.sort((a, b) => a - b),
        coinVals, throws, treeMid, omen, fall: doFall
    };
}

// Pet luck wrapper: optional re-roll for a missing bonus / a dead spin.
export function spinWithLuck(cfg, ctx) {
    let r = spin(cfg, ctx);
    const luck = ctx.luck || {};
    if (!r.bonus && luck.bonus > 0 && rand() < luck.bonus) {
        const r2 = spin(cfg, { ...ctx, luck: {} });
        if (r2.bonus) { r = r2; r.lucky = "bonus"; }
    }
    if (r.total === 0 && luck.win > 0 && rand() < luck.win / 0.7) {
        const r2 = spin(cfg, { ...ctx, luck: {} });
        if (r2.total > 0) { r = r2; r.lucky = "win"; }
    }
    return r;
}

// ------------------------------------------------------------ classic (Money Mesh)
// 3 reels, one centre payline. Features: WHEEL x3 wheel (≤20x), 7-7-7 →
// 7 free games, BAG x3 → match-3 pick, random NUDGE.
export const CLASSIC_SYMS = ["7", "B3", "B2", "B1", "CH", "WH", "BG", "P", "_"];
export function classicPay(cfg, line, bet) {
    const [a, b, c] = line;
    const P = cfg.pays;
    let m = 0;
    if (a === b && b === c) m = P[a] ?? 0;
    else if ([a, b, c].every(s => s.startsWith("B"))) m = P.ANYBAR;
    else { const ch = [a, b, c].filter(s => s === "CH").length; if (ch === 2) m = P.CH2; else if (ch === 1 && a === "CH") m = P.CH1; }
    return Math.round(m * bet * (cfg.px || 1));
}
function classicLine(cfg, mode) {
    const w = mode === "free" ? { ...cfg.w, ...(cfg.wFree || {}) } : cfg.w;
    const pairs = Object.entries(w);
    return [0, 1, 2].map(() => pickW(pairs));
}
function classicWindow(cfg, line) { // 3x3 window: [reel][row], payline = row 1
    const pairs = Object.entries(cfg.w).filter(([s]) => !["WH", "BG", "7"].includes(s));
    return line.map(s => [pickW(pairs), s, pickW(pairs)]);
}
function safeLine(cfg, mode) { // a line that is not a bonus line
    for (let i = 0; i < 50; i++) {
        const l = classicLine(cfg, mode);
        if (["WH", "BG", "7"].some(s => l.every(x => x === s))) continue;
        return l;
    }
    return ["B1", "CH", "_"];
}
function classicSpin(cfg, ctx) {
    const { bet } = ctx;
    const F = cfg.features;
    const boost = 1 + (ctx.luck?.bonus || 0);
    let line, feature = null, nudge = null;
    const r = rand();
    if (r < F.wheel.p * boost) { line = ["WH", "WH", "WH"]; feature = "wheel"; }
    else if (r < (F.wheel.p + F.free.p) * boost) { line = ["7", "7", "7"]; feature = "free"; }
    else if (r < (F.wheel.p + F.free.p + F.pick.p) * boost) { line = ["BG", "BG", "BG"]; feature = "pick"; }
    else if (rand() < F.nudge.p) {
        // NUDGE: two matching symbols; the third reel gets nudged into place
        const s = pickW([["B1", 40], ["B2", 30], ["B3", 20], ["CH", 25]]);
        line = [s, s, s];
        nudge = { reel: 2, from: pickW([["_", 1]]), dir: rand() < 0.5 ? -1 : 1 };
    } else line = safeLine(cfg, "base");
    const win = feature === "free" ? Math.round(cfg.pays["7"] * bet * (cfg.px || 1)) : classicPay(cfg, line, bet);
    const window = classicWindow(cfg, line);
    // tease: two bonus symbols on reels 1-2, third just misses
    let teaseSym = null;
    if (!feature && !nudge && rand() < 0.09) {
        teaseSym = pickW([["WH", 1], ["7", 1], ["BG", 1]]);
        line[0] = line[1] = teaseSym; window[0][1] = window[1][1] = teaseSym;
        line[2] = line[2] === teaseSym ? "_" : line[2]; window[2][1] = line[2];
        window[2][rand() < 0.5 ? 0 : 2] = teaseSym; // just above / below the line
    }
    const lineWin = teaseSym ? classicPay(cfg, line, bet) : win;
    // points
    let points = 0;
    if (rand() < 0.16) {
        const n = pickW([[1, 70], [2, 22], [3, 8]]);
        for (let i = 0; i < n; i++) { const c = ri(3); const rr = [0, 2][ri(2)]; window[c][rr] = "P"; }
        points = P_POINTS[n] || 0;
    }
    const features = [];
    if (feature === "wheel") features.push(classicWheel(cfg, bet));
    if (feature === "pick") features.push(classicPick(cfg, bet));
    if (feature === "free") {
        const spins = [];
        for (let i = 0; i < F.free.spins; i++) {
            let l, sub = null;
            if (rand() < F.free.wheelP) { l = ["WH", "WH", "WH"]; sub = classicWheel(cfg, bet); }
            else l = safeLine(cfg, "free");
            const w = sub ? sub.win : classicPay(cfg, l, bet);
            spins.push({ line: l, window: classicWindow(cfg, l), win: w, sub });
        }
        features.push({ type: "free", spins, total: spins.reduce((s, x) => s + x.win, 0) });
    }
    const featureWin = features.reduce((s, f) => s + (f.total ?? f.win ?? 0), 0);
    const omen = (feature && rand() < 0.6) || (!feature && rand() < 0.03) ? ri(4) + 1 : 0;
    return {
        classic: true, line, window, nudge, teaseSym, features, bonus: !!feature,
        base: { win: lineWin }, total: lineWin + featureWin, points, jackpots: [], state: ctx.state || {}, omen,
        anticipation: teaseSym || feature ? [2] : []
    };
}
function classicWheel(cfg, bet) {
    const wh = cfg.features.wheel;
    const idx = pickW(wh.seg.map((s, i) => [i, wh.w[i]]));
    return { type: "wheel", seg: wh.seg, idx, mult: +wh.seg[idx], win: Math.round(+wh.seg[idx] * bet), total: Math.round(+wh.seg[idx] * bet) };
}
function classicPick(cfg, bet) {
    const pk = cfg.features.pick;
    const prize = pickW(pk.prizes.map(p => [p, pk.w[pk.prizes.indexOf(p)]]));
    const decoys = [];
    for (const p of pk.prizes.filter(p => p !== prize)) { const k = ri(3); for (let i = 0; i < k; i++) decoys.push(p); }
    const seq = [...shuffle([prize, prize, ...decoys.slice(0, 7)]), prize];
    let sub = null, win;
    if (prize === "WHEEL") { sub = classicWheel(cfg, bet); win = sub.win; }
    else win = Math.round(parseFloat(prize) * bet);
    return { type: "pick", title: "💰 MONEY MATCH 💰", classic: true, tier: prize, seq, tiles: 12, sub, total: win };
}

// ------------------------------------------------------------ helpers for UI
export function bestJackpot(list) {
    let best = null;
    for (const t of list) if (!best || (JACKPOT_RANK[t] || 0) > (JACKPOT_RANK[best] || 0)) best = t;
    return best;
}
