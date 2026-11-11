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
    const base = cfg.w, over = mode === "mouse" ? (cfg.wMouse || cfg.wFree || {}) : mode !== "base" ? (cfg.wFree || {}) : {};
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
const SPECIAL = new Set(["F", "P", "C", "M", "M1", "M2", "M3", "M4", "M5", "R", "X", "B", "L", "D", "N", "PK", "MT"]);
const isWild = x => x === "W" || x === "MW"; // MW = Cat and Mouse mouse wild
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
            grid[c].forEach((x, r) => { if (x === s || isWild(x) || wildReels.includes(c)) hit.push([c, r]); });
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

// ------------------------------------------------------------ meter bursts
// A progressive meter can burst at ANY fill (early, half way, full …): the
// fuller it is the likelier, and a full meter keeps rattling until it goes.
// k is solved per (max, step sizes) so the mean number of meter events per
// burst stays max / mean step — the same bonus rate as "burst when full".
export const FULL_Q = 0.35;
const _burstK = new Map();
const qAt = (k, v, max) => v >= max ? FULL_Q : Math.min(0.3, k * (0.12 + (v / max) ** 2));
function burstK(max, steps) {
    const key = max + "|" + steps.join(";");
    if (_burstK.has(key)) return _burstK.get(key);
    const sw = steps.reduce((s, x) => s + x[1], 0);
    const target = max / (steps.reduce((s, x) => s + x[0] * x[1], 0) / sw);
    const events = k => {
        const e = Array(max + 1).fill(0);
        e[max] = 1 / FULL_Q;
        for (let v = max - 1; v >= 0; v--) {
            let s = 1;
            for (const [a, w] of steps) { const v2 = Math.min(max, v + a); s += w / sw * (1 - qAt(k, v2, max)) * e[v2]; }
            e[v] = s;
        }
        return e[0];
    };
    let lo = 0, hi = 2;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (events(mid) > target) lo = mid; else hi = mid; }
    _burstK.set(key, lo);
    return lo;
}
export function burstQ(v, max, steps = [[1, 1]]) { return qAt(burstK(max, steps), v, max); }

// ------------------------------------------------------------ bonus pieces
// Hold & Spin. `modifiers` (Bonanza thermometers: hot / extra / cold) each
// add a modifier icon to the starting board. With h.ice the board gets
// extra frozen rows on top; every hammer coin breaks one more row open.
function holdBonus(cfg, bet, startCoins, modifiers = [], opts = {}) {
    const h = cfg.features.hold;
    const R = cfg.reels || 5, BASE = h.rows || cfg.rows || 3;
    const ICE = h.ice ? h.ice.rows : 0;
    const ROWS = BASE + ICE;
    const total = R * ROWS;
    let iced = ICE; // rows 0 … iced-1 are still frozen
    const board = new Map(); // key "c,r" -> coin
    const coin = () => {
        const v = pickW(h.coin.v.map((x, i) => [x, h.coin.w[i]]));
        if (isNaN(+v)) { const tier = gateTier(cfg, v, bet); return { jp: tier }; }
        return { v: Math.round(+v * bet) };
    };
    const valueCoin = () => { for (let i = 0; i < 20; i++) { const c = coin(); if (c.v) return c; } return { v: bet }; };
    const empties = () => { const e = []; for (let c = 0; c < R; c++) for (let r = iced; r < ROWS; r++) if (!board.has(c + "," + r)) e.push([c, r]); return e; };
    const steps = [];
    const first = [];
    for (const [c, r] of shuffle(empties()).slice(0, startCoins)) { const cn = coin(); board.set(c + "," + r, cn); first.push({ c, r, ...cn }); }
    for (const mod of modifiers) {
        const e = empties(); if (!e.length) break;
        const [c, r] = e[ri(e.length)]; board.set(c + "," + r, { mod, v: 0 }); first.push({ c, r, mod, v: 0 });
    }
    steps.push({ added: first, lives: h.lives || 3, broke: [] });
    let lives = h.lives || 3, guard = 0;
    const land = opts.land ?? h.land ?? 0.07, hammerP = opts.hammer ?? h.ice?.hammer ?? 0;
    while (lives > 0 && empties().length && guard++ < 200) {
        const added = [], broke = [];
        for (const [c, r] of empties()) {
            if (rand() >= land) continue;
            let cn = coin();
            if (iced - broke.length > 0 && rand() < hammerP) { cn = { ...valueCoin(), hammer: true }; broke.push(iced - 1 - broke.length); }
            board.set(c + "," + r, cn); added.push({ c, r, ...cn });
        }
        iced -= broke.length;
        if (added.length) lives = h.lives || 3; else lives--;
        steps.push({ added, lives, broke });
    }
    // modifiers resolve at the end: EXTRA boosts, COLD multiplies, HOT collects everything
    const ORDER = ["extra", "cold", "hot"];
    const mods = [];
    const modCells = [...board.entries()].filter(([, cn]) => cn.mod).sort((a, b) => ORDER.indexOf(a[1].mod) - ORDER.indexOf(b[1].mod));
    for (const [k, cn] of modCells) {
        const [c, r] = k.split(",").map(Number);
        const near = [];
        for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
            const x = board.get((c + dc) + "," + (r + dr));
            if ((dc || dr) && x && x.v && !x.mod) near.push({ c: c + dc, r: r + dr, x });
        }
        if (cn.mod === "extra") mods.push({ c, r, mod: "extra", hits: near.map(n => { const add = Math.round(pickW(h.extra || [[1, 45], [2, 30], [3, 17], [5, 8]]) * bet); n.x.v += add; return { c: n.c, r: n.r, add, v: n.x.v }; }) });
        if (cn.mod === "cold") { const m = pickW([[2, 45], [3, 30], [4, 15], [5, 10]]); mods.push({ c, r, mod: "cold", m, hits: near.map(n => { n.x.v *= m; return { c: n.c, r: n.r, v: n.x.v }; }) }); }
        if (cn.mod === "hot") { cn.v = [...board.values()].filter(x => x.v && !x.mod).reduce((s, x) => s + x.v, 0); mods.push({ c, r, mod: "hot", v: cn.v }); }
    }
    const full = board.size >= total;
    const jackpots = [...board.values()].filter(x => x.jp).map(x => x.jp);
    if (full) jackpots.push(gateTier(cfg, "GRAND", bet) === "GRAND" ? "GRAND" : "MAJOR");
    const coinSum = [...board.values()].reduce((s, x) => s + (x.v || 0), 0);
    return { type: "hold", steps, mods, full, coinSum, jackpots, rows: ROWS, ice: ICE, reels: R, modifiers, final: [...board.entries()].map(([k, v]) => { const [c, r] = k.split(",").map(Number); return { c, r, ...v }; }) };
}

// Match-3 pick. Keys ending in _X2 (MINI_X2 / MINOR_X2) are matching items
// of their own and pay double.
function pickBonus(cfg, bet, tierWeights, title) {
    const keys = Object.keys(tierWeights);
    let key = pickW(keys.map(t => [t, tierWeights[t]]));
    const base = key.replace("_X2", "");
    const g = gateTier(cfg, base, bet);
    if (g !== base) key = g;
    const items = keys.includes(key) ? keys : [...keys, key];
    // reveal sequence: winner x3 (the last one ends it), decoys at most 2 each
    const decoys = [];
    for (const t of items.filter(t => t !== key)) { const k = ri(3); for (let i = 0; i < k; i++) decoys.push(t); }
    const seq = [...shuffle([key, key, ...shuffle(decoys).slice(0, 7)]), key];
    return { type: "pick", title, tier: key.replace("_X2", ""), x2: key.endsWith("_X2"), items, seq, tiles: 12 };
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
    if (cfg.engine === "catmouse") return catMouseSpin(cfg, ctx);
    if (cfg.engine === "cascade") return cascadeSpin(cfg, ctx);
    if (cfg.engine === "egg") return eggSpin(cfg, ctx);
    const { bet } = ctx;
    const state = structuredClone(ctx.state || {});
    const F = cfg.features || {};
    const boost = 1 + (ctx.luck?.bonus || 0);
    const force = ctx.force || "";
    const on = k => !!F[k] && !F[k].off; // admin can switch a bonus off
    const grid = drawGrid(cfg, "base");
    const features = [];
    const meterEvents = [];
    let wildReels = [];

    // ---- feature decisions (ctx.force = practice-room bonus test)
    const hit = k => on(k) && (force ? force === k : rand() < F[k].p * boost);
    const doFree = hit("free"), doHold = !doFree && hit("hold"), doWheel = !doFree && !doHold && hit("wheel"), doPick = !doFree && !doHold && !doWheel && hit("pick");

    // ---- free spins: scatters
    if (on("free")) {
        if (doFree) {
            const n = pickW([[3, 80], [4, 16], [5, 4]]);
            inject(grid, "F", n);
            const spins = F.free.byCount ? F.free.byCount[n - 3] : F.free.spins;
            features.push({ pending: "free", n, spins });
        } else if (rand() < (F.free.tease ?? 0.08)) inject(grid, "F", 2, { avoid: (c) => c >= 3 }); // tease
        else if (rand() < 0.15) inject(grid, "F", 1);
    }
    // ---- hold & spin: coins
    if (on("hold") && F.hold.sym) {
        const need = F.hold.trigger || 6;
        if (doHold) { inject(grid, "C", need + pickW([[0, 70], [1, 22], [2, 8]]), { distinctReels: false }); features.push({ pending: "hold" }); }
        else if (rand() < 0.10) inject(grid, "C", need - 1 - ri(2), { distinctReels: false }); // so close…
        else if (rand() < 0.3) inject(grid, "C", 1 + ri(2), { distinctReels: false });
    }
    // ---- wheel symbols
    if (on("wheel") && F.wheel.sym) {
        if (doWheel) { inject(grid, "R", 3); features.push({ pending: "wheel" }); }
        else if (rand() < 0.07) inject(grid, "R", 2, { avoid: c => c >= 3 });
    }
    // ---- pick (jackpot) symbols
    if (on("pick") && F.pick.sym) {
        if (doPick) { inject(grid, "X", 3); features.push({ pending: "pick" }); }
        else if (rand() < 0.06) inject(grid, "X", 2, { avoid: c => c >= 3 });
    }

    // ---- persistent machine meters
    const M = cfg.meter && !cfg.meter.off ? cfg.meter : null;
    if (M) {
        if (MM_KEYS[M.kind]) {
            // several meters side by side (Bonanza thermometers, 5 Cats, Froggie, Lucky Boxes)
            // practice test: "thermo:hot" / "mm:happy+rich" / "mm:all"
            const KEYS = MM_KEYS[M.kind];
            const sk = M.kind === "thermo" ? "thermo" : "mm";
            const st = state[sk] ||= {};
            const counts = M.counts ? (state.mmN ||= {}) : null;
            const fmm = force.match(/^(thermo|mm):([^:]+)/);
            const ft = fmm ? fmm[2] : null;
            const featOn = key => !M.feat || on(M.feat[key]);
            const full = [];
            for (const [key, sym] of KEYS) {
                st[key] ||= 0;
                if (counts) counts[key] ??= M.counts.start;
                if (!featOn(key)) continue;
                const forced = ft && (ft === "all" || ft.split("+").includes(key));
                const r = mmTick(M, st, counts, key, forced, boost);
                if (!r) continue;
                inject(grid, sym, r.ev.add);
                meterEvents.push(r.ev);
                if (r.burst) full.push(key);
            }
            // a bursting meter can set off the others (the fuller, the likelier)
            if (full.length && !ft && M.chain) for (const [key, sym] of KEYS) {
                if (full.includes(key) || !featOn(key) || rand() >= (st[key] / M.max) * M.chain) continue;
                if (!countSym(grid, sym)) inject(grid, sym, 1);
                full.push(key); meterEvents.push({ key, add: 0, value: st[key], chain: true });
            }
            if (full.length) {
                const nAt = {};
                for (const key of full) {
                    nAt[key] = counts?.[key];
                    meterEvents.push({ key, full: true, at: st[key] / M.max, n: counts?.[key] });
                    st[key] = 0; if (counts) counts[key] = M.counts.start;
                }
                const order = KEYS.map(k => k[0]).filter(k => full.includes(k));
                if (M.kind === "thermo") { if (on("hold")) features.push({ pending: "hold", modifiers: order, start: F.hold.start || 6 }); }
                else if (M.kind === "cats") features.push({ pending: "chold", cats: order });
                else if (M.kind === "frogs") for (const k of order) features.push({ pending: M.feat[k] });
                else if (M.kind === "boxes") {
                    // yellow first (one wild spin), then the free games
                    if (order.includes("yellow")) features.push({ pending: "bwild", n: nAt.yellow });
                    if (order.includes("red")) features.push({ pending: "bfree", spins: nAt.red, wilds: 0, box: "red" });
                    if (order.includes("rainbow")) features.push({ pending: "bfree", spins: nAt.rainbow, wilds: nAt.rainbow, box: "rainbow" });
                }
            }
        } else if (M.kind === "reelcoins") {
            state.cols = state.cols || Array(grid.length).fill(0);
            for (let c = 0; c < grid.length; c++) {
                if (rand() < M.p * boost) {
                    inject(grid.map((col, i) => i === c ? col : []), "M", 1); // place on this reel
                    state.cols[c] = Math.min(M.max, state.cols[c] + 1);
                    meterEvents.push({ reel: c, value: state.cols[c] });
                    if (rand() < burstQ(state.cols[c], M.max)) { wildReels.push(c); meterEvents.push({ reel: c, full: true, at: state.cols[c] / M.max }); state.cols[c] = 0; }
                }
            }
        } else {
            state.meter = state.meter || 0;
            const fm = force.startsWith("meter"); // practice test: "meter" / "meter:pick" …
            if (fm || rand() < M.p * boost) {
                const n = 1 + (rand() < 0.25 ? 1 : 0);
                inject(grid, "M", n, { distinctReels: true });
                const add = M.addPerSym ? n : 1;
                state.meter = Math.min(M.max, state.meter + add);
                meterEvents.push({ add, value: state.meter });
                if (fm || rand() < burstQ(state.meter, M.max, M.addPerSym ? [[1, 75], [2, 25]] : [[1, 1]])) {
                    meterEvents.push({ full: true, at: state.meter / M.max }); state.meter = 0;
                    const alive = k => !F[k]?.off;
                    let what = M.onFull;
                    if (M.onFullW) { // several possible bonuses (FuFu): weighted, minus the ones the admin removed
                        const opts = Object.entries(M.onFullW).filter(([k]) => alive(k));
                        what = fm && force.includes(":") ? force.split(":")[1] : opts.length ? pickW(opts) : null;
                    } else if (!alive(what)) what = null;
                    if (what) features.push({ pending: what, fromMeter: true });
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
            done.push(holdBonus(cfg, bet, f.start || cfg.features.hold.start || 6, f.modifiers || [], force.endsWith(":hammer") ? { land: 0.16, hammer: 0.4 } : {}));
        } else if (f.pending === "wheel") done.push(wheelBonus(cfg, bet, F.wheel));
        else if (f.pending === "pick") {
            const tw = f.fromMeter && M?.pickTw ? M.pickTw : F.pick.tw;
            done.push(pickBonus(cfg, bet, tw, f.fromMeter ? (M.pickTitle || M.title) : F.pick.title));
        }
        else if (f.pending === "chold") done.push(catsHold(cfg, bet, f.cats, ctx.pool, force));
        else if (f.pending === "rspin") done.push(ribbitSpin(cfg, bet, ctx.pool, force.endsWith(":full") ? { land: 0.3 } : {}));
        else if (f.pending === "rcatch") done.push(ribbitCatch(cfg, bet, ctx.pool, force.endsWith(":full") ? { land: 0.3 } : {}));
        else if (f.pending === "rpick") done.push(ribbitPick(cfg, bet, ctx.pool, force));
        else if (f.pending === "bfree") done.push(boxFree(cfg, bet, f.spins, f.wilds, f.box, state, boost));
        else if (f.pending === "bwild") done.push(boxWild(cfg, bet, f.n));
    }
    // jackpot values + feature totals
    let featureWin = 0, featurePoints = 0;
    for (const d of done) {
        if (d.jpWins && d.type !== "hold") { // new bonus types settle themselves
            jackpots.push(...d.jpWins.map(j => j.tier));
        } else if (d.type === "hold") {
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
    const jpProg = progShare(cfg, done);
    if (total - jpProg > maxWin) total = maxWin + jpProg;

    // ---- teasing: which reels get the long "anticipation" spin
    const anticipation = teaseReels(cfg, grid);
    // ---- omens (전조): usually announce a bonus, now and then a bluff
    const bonus = done.length > 0;
    const omen = cfg.omens?.length && ((bonus && rand() < 0.6) || (!bonus && rand() < 0.03)) ? 1 + ri(cfg.omens.length) : 0;
    return {
        grid, base, wildReels, features: done, jackpots, points: points + featurePoints,
        total: Math.round(total), bonus, state, meterEvents, anticipation, omen
    };
}

function teaseReels(cfg, grid) {
    const out = [];
    const trig = { F: 3, R: 3, X: 3, D: 3, N: 3, PK: 3, MT: 3 };
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

// progressive (non-fixed) jackpot share of the bonus wins — paid in full, outside the max-win cap
function progShare(cfg, done) {
    const prog = (t, a) => cfg.jp?.[t] && !cfg.jp[t].x ? a : 0;
    return done.reduce((s, d) => s + (d.jpWins ? d.jpWins.reduce((a, x) => a + prog(x.tier, x.amount), 0)
        : (d.type === "pick" || (d.type === "wheel" && d.jp)) ? prog(d.tier || d.jp, d.total) : 0), 0);
}
// totals / cap / omen for the engines below
function settle(cfg, ctx, { grid, base, done, points = 0, state, wildReels = [], meterEvents = [], extra = {} }) {
    const bet = ctx.bet;
    const jackpots = [];
    let featureWin = 0, featurePoints = 0;
    for (const d of done) { if (d.jpWins) jackpots.push(...d.jpWins.map(j => j.tier)); featureWin += d.total || 0; featurePoints += d.points || 0; }
    let total = base.win + featureWin;
    const jpProg = progShare(cfg, done);
    const maxWin = (cfg.maxX || 5000) * bet;
    if (total - jpProg > maxWin) total = maxWin + jpProg;
    const bonus = done.length > 0;
    const omen = cfg.omens?.length && ((bonus && rand() < 0.6) || (!bonus && rand() < 0.03)) ? 1 + ri(cfg.omens.length) : 0;
    return { grid, base, wildReels, features: done, jackpots, points: points + featurePoints, total: Math.round(total), bonus, state, meterEvents, anticipation: grid ? teaseReels(cfg, grid) : [], omen, ...extra };
}
function jpCoin(cfg, bet, table) {
    const v = pickW(table.v.map((x, i) => [x, table.w[i]]));
    return isNaN(+v) ? { jp: gateTier(cfg, v, bet) } : { v: Math.round(+v * bet) };
}
const jpWinsOf = (cfg, bet, pool, tiers) => tiers.map(t => ({ tier: t, amount: jackpotValue(cfg, t, bet, pool) }));
const sumOf = list => list.reduce((s, x) => s + (x.amount ?? x.win ?? 0), 0);

// ------------------------------------------------------------ multi meters
// key → reel symbol. A tick adds 1~2, maybe raises the box count (Lucky
// Boxes) and rolls the burst chance for the new fill.
export const MM_KEYS = {
    thermo: [["hot", "M1"], ["extra", "M2"], ["cold", "M3"]],
    cats: [["happy", "M1"], ["lucky", "M2"], ["meow", "M3"], ["rich", "M4"], ["fluffy", "M5"]],
    frogs: [["spin", "M1"], ["catch", "M2"], ["pick", "M3"]],
    boxes: [["red", "M1"], ["rainbow", "M2"], ["yellow", "M3"]]
};
function mmTick(M, st, counts, key, forced, boost) {
    if (!forced && rand() >= (M.pk?.[key] ?? M.p) * boost) return null;
    const add = 1 + (rand() < 0.2 ? 1 : 0);
    st[key] = Math.min(M.max, (st[key] || 0) + add);
    const ev = { key, add, value: st[key] };
    if (counts) {
        if (counts[key] < M.counts.max && rand() < M.counts.up) { const up = 1 + (rand() < 0.3 ? 1 : 0); counts[key] = Math.min(M.counts.max, counts[key] + up); ev.up = up; }
        ev.n = counts[key];
    }
    return { ev, burst: forced || rand() < burstQ(st[key], M.max, [[1, 80], [2, 20]]) };
}

// ------------------------------------------------------------ 5 Cats: cat Hold & Spin
// Every cat that burst adds its power to ONE Hold & Spin (any mix, even all five):
// happy = a second 5x3 board · lucky = a MINI~MAJOR jackpot egg · meow = eggs grow
// every respin · rich = COLLECT ALL (all eggs merge into one, worth double) ·
// fluffy = instant win (the current egg total paid on the spot, 1~2 times).
function catsHold(cfg, bet, cats, pool, force = "") {
    const h = cfg.features.chold;
    const R = 5, ROWS = 3, B = cats.includes("happy") ? 2 : 1;
    const board = new Map();
    const K = (b, c, r) => b + "," + c + "," + r;
    const empties = () => { const e = []; for (let b = 0; b < B; b++) for (let c = 0; c < R; c++) for (let r = 0; r < ROWS; r++) if (!board.has(K(b, c, r))) e.push([b, c, r]); return e; };
    const values = () => [...board.entries()].filter(([, x]) => x.v != null);
    const sumNow = () => values().reduce((s, [, x]) => s + x.v, 0);
    const land = force.endsWith(":full") ? 0.3 : h.land;
    const put = (b, c, r, cn) => { board.set(K(b, c, r), cn); return { b, c, r, ...cn }; };
    const first = [];
    const start = [...shuffle(empties().filter(e => e[0] === 0)).slice(0, h.start), ...(B > 1 ? shuffle(empties().filter(e => e[0] === 1)).slice(0, h.start2 || 3) : [])];
    for (const [b, c, r] of start) first.push(put(b, c, r, jpCoin(cfg, bet, h.coin)));
    if (cats.includes("lucky")) {
        const i = Math.max(0, first.findIndex(x => x.v != null));
        const tier = gateTier(cfg, pickW(Object.entries(h.luckyTw)), bet);
        const t = first[i];
        delete t.v; t.jp = tier; t.lucky = true;
        board.set(K(t.b, t.c, t.r), { jp: tier, lucky: true });
    }
    const steps = [{ added: first, lives: h.lives, boosts: [], instant: 0 }];
    let lives = h.lives, guard = 0, instants = 0, nInst = 0;
    while (lives > 0 && empties().length && guard++ < 120) {
        const added = [];
        for (const [b, c, r] of empties()) if (rand() < land) added.push(put(b, c, r, jpCoin(cfg, bet, h.coin)));
        const boosts = [];
        if (cats.includes("meow") && rand() < h.meowP) for (const [k, x] of shuffle(values()).slice(0, 1 + ri(3))) {
            const add = Math.round(pickW(h.meowAdd) * bet); x.v += add;
            const [b, c, r] = k.split(",").map(Number); boosts.push({ b, c, r, add, v: x.v });
        }
        let instant = 0;
        if (cats.includes("fluffy") && nInst < 2 && rand() < h.fluffyP) { instant = sumNow(); instants += instant; nInst++; }
        if (added.length) lives = h.lives; else lives--;
        steps.push({ added, lives, boosts, instant });
    }
    let endInstant = 0;
    if (cats.includes("fluffy") && !nInst) { endInstant = sumNow(); instants += endInstant; }
    const coinSum = sumNow();
    const rich = cats.includes("rich") ? coinSum : 0;
    const fullBoards = [...Array(B).keys()].filter(b => empties().every(e => e[0] !== b));
    const jackpots = [...board.values()].filter(x => x.jp).map(x => x.jp);
    for (const b of fullBoards) jackpots.push(gateTier(cfg, "GRAND", bet));
    const jpWins = jpWinsOf(cfg, bet, pool, jackpots);
    return { type: "chold", cats, boards: B, reels: R, rows: ROWS, steps, coinSum, rich, instants, endInstant, fullBoards, jackpots, jpWins, total: coinSum + rich + instants + sumOf(jpWins) };
}

// ------------------------------------------------------------ Froggie: Ribbit bonuses
// Ribbit Spin: Hold & Spin. A frog hops over the coins and pumps them up,
// a lotus leaf adds a respin (3 → 4 → 5 max).
function ribbitSpin(cfg, bet, pool, opts = {}) {
    const h = cfg.features.rspin;
    const R = 5, ROWS = 3;
    const board = new Map();
    const empties = () => { const e = []; for (let c = 0; c < R; c++) for (let r = 0; r < ROWS; r++) if (!board.has(c + "," + r)) e.push([c, r]); return e; };
    const first = shuffle(empties()).slice(0, h.start).map(([c, r]) => { const cn = jpCoin(cfg, bet, h.coin); board.set(c + "," + r, cn); return { c, r, ...cn }; });
    let livesMax = h.lives, lives = livesMax, guard = 0;
    const steps = [{ added: first, hops: [], lives, livesMax }];
    const land = opts.land ?? h.land;
    while (lives > 0 && empties().length && guard++ < 120) {
        const added = [];
        for (const [c, r] of empties()) {
            if (rand() >= land) continue;
            const kind = pickW([["coin", h.wCoin], ["frog", h.wFrog], ["lotus", livesMax < h.maxLives ? h.wLotus : 0]]);
            const cn = kind === "frog" ? { frog: true } : kind === "lotus" ? { lotus: true } : jpCoin(cfg, bet, h.coin);
            board.set(c + "," + r, cn); added.push({ c, r, ...cn });
            if (kind === "lotus") livesMax = Math.min(h.maxLives, livesMax + 1);
        }
        const hops = [];
        for (const fr of added.filter(x => x.frog)) {
            const path = [];
            for (const [k, x] of shuffle([...board.entries()].filter(([, x]) => x.v != null)).slice(0, 2 + ri(3))) {
                const add = Math.round(pickW(h.hop) * bet); x.v += add;
                const [c, r] = k.split(",").map(Number); path.push({ c, r, add, v: x.v });
            }
            hops.push({ from: [fr.c, fr.r], path });
        }
        if (added.length) lives = livesMax; else lives--;
        steps.push({ added, hops, lives, livesMax });
    }
    const full = board.size >= R * ROWS;
    const jackpots = [...board.values()].filter(x => x.jp).map(x => x.jp);
    if (full) jackpots.push(gateTier(cfg, "GRAND", bet));
    const coinSum = [...board.values()].reduce((s, x) => s + (x.v || 0), 0);
    const jpWins = jpWinsOf(cfg, bet, pool, jackpots);
    return { type: "rspin", reels: R, rows: ROWS, steps, full, coinSum, jackpots, jpWins, total: coinSum + sumOf(jpWins) };
}
// Ribbit Catch: a 5x5 board with a 3x3 catch net. Only coins landing inside the
// net are caught. A lotus leaf grows the net (3 → 4 → 5 = whole board), a frog
// turns the net into x2~x5 for that one respin.
function ribbitCatch(cfg, bet, pool, opts = {}) {
    const h = cfg.features.rcatch, N = h.size;
    let s = 3, x = ri(N - s + 1), y = ri(N - s + 1);
    const inSq = (c, r) => c >= x && c < x + s && r >= y && r < y + s;
    const caught = new Map();
    const free = () => { const o = []; for (let c = x; c < x + s; c++) for (let r = y; r < y + s; r++) if (!caught.has(c + "," + r)) o.push([c, r]); return o; };
    const first = shuffle(free()).slice(0, h.start).map(([c, r]) => { const cn = jpCoin(cfg, bet, h.coin); caught.set(c + "," + r, cn); return { c, r, ...cn, in: true }; });
    const steps = [{ landed: first, sq: { x, y, s }, mult: 1, lives: h.lives, grow: 0 }];
    let lives = h.lives, guard = 0;
    const land = opts.land ?? h.land;
    while (lives > 0 && caught.size < N * N && guard++ < 150) {
        const landed = [];
        for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) {
            if (caught.has(c + "," + r) || rand() >= land) continue;
            const kind = pickW([["coin", h.wCoin], ["lotus", s < N ? h.wLotus : 0], ["frog", h.wFrog]]);
            landed.push({ c, r, ...(kind === "coin" ? jpCoin(cfg, bet, h.coin) : { [kind]: true }) });
        }
        let grow = 0;
        for (const l of landed) if (l.lotus && s < N) {
            const ns = s + 1;
            x = Math.max(0, Math.min(N - ns, x - ri(2))); y = Math.max(0, Math.min(N - ns, y - ri(2)));
            s = ns; grow++;
        }
        const mult = landed.some(l => l.frog) ? pickW(h.mult) : 1;
        let got = 0;
        for (const l of landed) {
            if (l.lotus || l.frog) continue;
            l.in = inSq(l.c, l.r);
            if (!l.in) continue;
            const cn = l.jp ? { jp: l.jp } : { v: l.v * mult };
            if (l.v != null) l.v2 = cn.v;
            caught.set(l.c + "," + l.r, cn); got++;
        }
        if (got) lives = h.lives; else lives--;
        steps.push({ landed, sq: { x, y, s }, mult, lives, grow });
    }
    const full = caught.size >= N * N;
    const jackpots = [...caught.values()].filter(c => c.jp).map(c => c.jp);
    if (full) jackpots.push(gateTier(cfg, "GRAND", bet));
    const coinSum = [...caught.values()].reduce((a, c) => a + (c.v || 0), 0);
    const jpWins = jpWinsOf(cfg, bet, pool, jackpots);
    return { type: "rcatch", size: N, steps, full, coinSum, jackpots, jpWins, total: coinSum + sumOf(jpWins) };
}
// Ribbit Pick: match 3 lotus leaves (MINI~GRAND or FROG). Three frogs → the
// frog wheel: a jackpot, Ribbit Catch or Ribbit Spin.
function ribbitPick(cfg, bet, pool, force = "") {
    const P = cfg.features.rpick;
    const keys = Object.keys(P.tw);
    const fp = force.split(":"); // practice: mm:pick:frog[:CATCH|SPIN]
    let key = fp[2] === "frog" ? "FROG" : pickW(keys.map(t => [t, P.tw[t]]));
    if (key !== "FROG") key = gateTier(cfg, key, bet);
    const items = keys.includes(key) ? keys : [...keys, key];
    const decoys = [];
    for (const t of items.filter(t => t !== key)) { const k = ri(3); for (let i = 0; i < k; i++) decoys.push(t); }
    const seq = [...shuffle([key, key, ...shuffle(decoys).slice(0, 7)]), key];
    const out = { type: "rpick", title: P.title, items, seq, tiles: 12, tier: key };
    let jps = [key], sub = null;
    if (key === "FROG") {
        const want = fp[3] ? P.wheel.seg.indexOf(fp[3]) : -1;
        const idx = want >= 0 ? want : pickW(P.wheel.seg.map((s, i) => [i, P.wheel.w[i]]));
        const seg = P.wheel.seg[idx];
        jps = [];
        if (seg === "CATCH") sub = ribbitCatch(cfg, bet, pool);
        else if (seg === "SPIN") sub = ribbitSpin(cfg, bet, pool);
        else jps = [gateTier(cfg, seg, bet)];
        out.wheel = { seg: P.wheel.seg, idx, jp: jps[0] || null };
    }
    const own = jpWinsOf(cfg, bet, pool, jps);
    out.own = own; out.sub = sub;
    out.jpWins = [...own, ...(sub?.jpWins || [])];
    out.total = sumOf(own) + (sub ? sub.total : 0);
    return out;
}

// ------------------------------------------------------------ Lucky Boxes
function scatterWilds(grid, n) {
    const cells = [];
    grid.forEach((col, c) => col.forEach((s, r) => { if (!isSpecial(s) && !isWild(s)) cells.push([c, r]); }));
    const picked = shuffle(cells).slice(0, n);
    for (const [c, r] of picked) grid[c][r] = "W";
    return picked;
}
// red: N free games · rainbow: N free games + N wilds spread over them. The yellow
// box keeps growing during the free games and can burst for an instant wild drop.
function boxFree(cfg, bet, spins, wilds, box, state, boost) {
    const M = cfg.meter, st = state.mm, counts = state.mmN;
    const per = Array(spins).fill(0);
    for (let i = 0; i < wilds; i++) per[ri(spins)]++;
    const out = [];
    for (let i = 0; i < spins; i++) {
        const grid = drawGrid(cfg, "free");
        let yellow = null;
        if (!cfg.features.bwild?.off) {
            const r = mmTick(M, st, counts, "yellow", false, boost);
            if (r) {
                inject(grid, "M3", r.ev.add); yellow = { ...r.ev };
                if (r.burst) { yellow.burst = counts.yellow; st.yellow = 0; counts.yellow = M.counts.start; }
            }
        }
        const points = addPoints(grid, cfg);
        const pre = grid.map(c => [...c]);
        const wcells = scatterWilds(grid, per[i] + (yellow?.burst || 0));
        const ev = evalWays(cfg, grid, bet);
        out.push({ pre, grid, win: ev.win, lines: ev.lines, points, rainbow: per[i], yellow, wilds: wcells });
    }
    return { type: "bfree", box, spins: out, total: sumOf(out), points: out.reduce((s, x) => s + x.points, 0), scales: true };
}
// yellow: one spin with N wilds thrown all over the reels
function boxWild(cfg, bet, n) {
    const grid = drawGrid(cfg, "free");
    const pre = grid.map(c => [...c]);
    const wcells = scatterWilds(grid, n);
    const ev = evalWays(cfg, grid, bet);
    return { type: "bwild", n, pre, grid, wilds: wcells, win: ev.win, lines: ev.lines, total: ev.win, scales: true };
}

// ------------------------------------------------------------ Cat and Mouse (classic, 5x3 ways)
// FREE x3 = 8 free spins · DOUBLE x3 = 8 free spins on two reel sets; DOUBLE x3
// on the extra set = +3 spins and the sets split into four · CAT x3 = the cat
// throws 3 fish, pick one for a jackpot · MOUSE x3 = 8 free spins where every
// A K Q J 10 turns into a mouse WILD.
function catMouseSpin(cfg, ctx) {
    const { bet } = ctx;
    const state = structuredClone(ctx.state || {});
    const F = cfg.features, boost = 1 + (ctx.luck?.bonus || 0), force = ctx.force || "";
    const on = k => !!F[k] && !F[k].off;
    const SYM = { free: "F", double: "D", fish: "X", mouse: "N" };
    const grid = drawGrid(cfg, "base");
    let pick = null;
    for (const k of Object.keys(SYM)) if (on(k) && (force ? force.split(":")[0] === k : rand() < F[k].p * boost)) { pick = k; break; }
    if (pick) inject(grid, SYM[pick], 3);
    for (const k of Object.keys(SYM)) if (k !== pick && on(k) && rand() < 0.045) inject(grid, SYM[k], 2, { avoid: c => c >= 3 });
    const points = addPoints(grid, cfg);
    const base = evalWays(cfg, grid, bet);
    const done = [];
    if (pick === "free") done.push(freeBonus(cfg, bet, F.free.spins, {}));
    if (pick === "double") done.push(doubleFree(cfg, bet, force === "double:split"));
    if (pick === "fish") done.push(pickOneBonus(cfg, bet, ctx.pool, F.fish));
    if (pick === "mouse") done.push(mouseFree(cfg, bet));
    return settle(cfg, ctx, { grid, base, done, points, state });
}
function doubleFree(cfg, bet, forceSplit = false) {
    const f = cfg.features.double;
    let sets = 2, left = f.spins, guard = 0;
    const out = [];
    while (left > 0 && guard++ < 40) {
        left--;
        const grids = Array.from({ length: sets }, () => drawGrid(cfg, "free"));
        let add = 0;
        const split = sets === 2 && (forceSplit ? out.length === 1 : rand() < f.splitP);
        if (split) { inject(grids[1], "D", 3); add = f.add; left += add; }
        const points = addPoints(grids[0], cfg);
        const evs = grids.map(g => evalWays(cfg, g, bet));
        out.push({ grids, wins: evs.map(e => e.win), lines: evs.map(e => e.lines), win: evs.reduce((s, e) => s + e.win, 0), add, split, points });
        if (split) sets = 4;
    }
    return { type: "double", spins: out, total: sumOf(out), points: out.reduce((s, x) => s + x.points, 0), scales: true };
}
function mouseFree(cfg, bet) {
    const f = cfg.features.mouse;
    const out = [];
    for (let i = 0; i < f.spins; i++) {
        const grid = drawGrid(cfg, "mouse").map(col => col.map(s => CARD_SYMS.includes(s) ? "MW" : s));
        const points = addPoints(grid, cfg);
        const ev = evalWays(cfg, grid, bet);
        out.push({ grid, win: ev.win, lines: ev.lines, points, wildReels: [] });
    }
    return { type: "free", mouse: true, spins: out, mult: 1, total: sumOf(out), points: out.reduce((s, x) => s + x.points, 0), extra: 0 };
}
// pick one of N (fish / barrels …): prizes are jackpot tiers or bet multiples
function pickOneBonus(cfg, bet, pool, P) {
    const idx = pickW(P.prizes.map((p, i) => [i, P.w[i]]));
    const prize = P.prizes[idx];
    const others = shuffle(P.prizes.filter(p => p !== prize)).slice(0, (P.n || 3) - 1);
    const isJp = isNaN(parseFloat(prize));
    const jpWins = isJp ? jpWinsOf(cfg, bet, pool, [prize]) : [];
    const amount = isJp ? jpWins[0].amount : Math.round(parseFloat(prize) * bet);
    return { type: "pickone", title: P.title, icon: P.icon, n: P.n || 3, prize, others, amount, total: amount, jpWins };
}
// match 3 with bet-multiple prizes (Niagara)
function matchBonus(cfg, bet, P) {
    const prize = pickW(P.prizes.map((p, i) => [p, P.w[i]]));
    const decoys = [];
    for (const p of P.prizes.filter(p => p !== prize)) { const k = ri(3); for (let i = 0; i < k; i++) decoys.push(p); }
    const seq = [...shuffle([prize, prize, ...shuffle(decoys).slice(0, 7)]), prize];
    return { type: "pick", classic: true, title: P.title, prizes: P.prizes, icon: P.icon, tier: prize, seq, tiles: 12, total: Math.round(parseFloat(prize) * bet) };
}

// ------------------------------------------------------------ Niagara (cascading reels)
// Winning symbols wash away and new ones fall in. 4+ cascades in a row on one
// spin = 5 / 10 / 15 / 25 / 50 / 100 free games. Feature first: the chain
// length is decided up front, the refills are steered to give exactly that.
export const CASCADE_FG = { 4: 5, 5: 10, 6: 15, 7: 25, 8: 50, 9: 100 };
function forceWin(cfg, grid, drops) {
    const s = pickW(Object.keys(cfg.syms).filter(k => cfg.syms[k].pay).map(k => [k, cfg.w[k] || 1]));
    for (let c = 0; c < 3; c++) {
        const rows = drops ? Array.from({ length: drops[c] }, (_, r) => r) : grid[c].map((_, r) => r).filter(r => !isSpecial(grid[c][r]));
        if (rows.length) grid[c][rows[ri(rows.length)]] = s;
    }
}
function cascadeRun(cfg, bet, grid0, target, mode, cap) {
    let grid = grid0.map(c => [...c]);
    const R = grid.length, ROWS = grid[0].length;
    const fresh = c => pickW(reelPairs(cfg, mode, c));
    const steps = [];
    let chain = 0, win = 0;
    if (target && !evalWays(cfg, grid, bet).win) forceWin(cfg, grid, null);
    const start = grid.map(c => [...c]);
    for (let guard = 0; guard < 40; guard++) {
        const ev = evalWays(cfg, grid, bet);
        if (!ev.win) break;
        chain++; win += ev.win;
        const rm = new Set(ev.lines.flatMap(l => l.cells.map(([c, r]) => c + "," + r)));
        const next = [], drops = [];
        for (let c = 0; c < R; c++) {
            const keep = grid[c].filter((s, r) => !rm.has(c + "," + r));
            const n = ROWS - keep.length;
            next.push([...Array.from({ length: n }, () => fresh(c)), ...keep]);
            drops.push(n);
        }
        steps.push({ win: ev.win, lines: ev.lines, removed: [...rm].map(k => k.split(",").map(Number)), drops, after: null });
        if (target && chain < target) { if (!evalWays(cfg, next, bet).win) forceWin(cfg, next, drops); }
        else if (!(target ? false : chain < cap)) {
            for (let t = 0; t < 80 && evalWays(cfg, next, bet).win; t++)
                for (let c = 0; c < R; c++) for (let r = 0; r < drops[c]; r++) next[c][r] = fresh(c);
        }
        steps[steps.length - 1].after = next.map(c => [...c]);
        grid = next;
    }
    return { start, steps, final: grid, chain, win };
}
function cascadeSpin(cfg, ctx) {
    const { bet } = ctx;
    const state = structuredClone(ctx.state || {});
    const F = cfg.features, boost = 1 + (ctx.luck?.bonus || 0), force = ctx.force || "";
    const on = k => !!F[k] && !F[k].off;
    let pick = null;
    for (const k of ["free", "pick", "match"]) if (on(k) && (force ? force.split(":")[0] === k : rand() < F[k].p * boost)) { pick = k; break; }
    const grid = drawGrid(cfg, "base");
    if (pick === "pick") inject(grid, "PK", 3); else if (on("pick") && rand() < 0.05) inject(grid, "PK", 2, { avoid: c => c >= 3 });
    if (pick === "match") inject(grid, "MT", 3); else if (on("match") && rand() < 0.05) inject(grid, "MT", 2, { avoid: c => c >= 3 });
    const points = addPoints(grid, cfg);
    const target = pick === "free" ? (force.includes(":") ? +force.split(":")[1] : pickW(cfg.cascade.chainW)) : null;
    const run = cascadeRun(cfg, bet, grid, target, "base", cfg.cascade.maxBase);
    const base = { win: run.win, lines: run.steps.flatMap(s => s.lines) };
    const done = [];
    if (pick === "free") done.push(cascadeFree(cfg, bet, CASCADE_FG[Math.min(9, run.chain)], run.chain));
    if (pick === "pick") done.push(pickOneBonus(cfg, bet, ctx.pool, F.pick));
    if (pick === "match") done.push(matchBonus(cfg, bet, F.match));
    const res = settle(cfg, ctx, { grid: run.start, base, done, points, state, extra: { cascade: run } });
    if (run.chain === 3 && !res.bonus) res.chainTease = true;
    return res;
}
function cascadeFree(cfg, bet, spins, chain) {
    const out = [];
    let left = spins, awarded = spins, guard = 0;
    while (left > 0 && guard++ < 120) {
        left--;
        const grid = drawGrid(cfg, "free");
        const points = addPoints(grid, cfg);
        const run = cascadeRun(cfg, bet, grid, null, "free", cfg.cascade.maxFree);
        let add = 0;
        if (run.chain >= 4 && awarded < 100) { add = Math.min(100 - awarded, CASCADE_FG[Math.min(9, run.chain)]); left += add; awarded += add; }
        out.push({ run, win: run.win, points, add });
    }
    return { type: "cfree", chain, awarded, spins: out, total: sumOf(out), points: out.reduce((s, x) => s + x.points, 0), scales: true };
}

// ------------------------------------------------------------ Crack or Not (ostrich egg)
// No reels: every tap is a bet. The egg cracks a little more each time and can
// break on ANY tap — then a baby ostrich pops out with 1x ~ 200x the bet.
function eggSpin(cfg, ctx) {
    const { bet } = ctx;
    const state = structuredClone(ctx.state || {});
    const E = cfg.egg, F = cfg.features, boost = 1 + (ctx.luck?.bonus || 0), force = ctx.force || "";
    const doBreak = !F.crack.off && (force ? force.startsWith("crack") : rand() < F.crack.p * boost);
    const before = state.crack || 0;
    const add = 1 + (rand() < 0.3 ? 1 : 0);
    const done = [];
    if (doBreak) {
        const mult = force.includes(":") ? +force.split(":")[1] : pickW(E.mult.map((m, i) => [m, E.w[i]]));
        const amount = Math.round(mult * bet * (cfg.px || 1));
        done.push({ type: "egg", mult, amount, total: amount, at: before, jpWins: mult >= E.jpAt ? [{ tier: "EGG", amount }] : [] });
        state.crack = 0;
    } else state.crack = Math.min(E.max, before + add);
    const tease = !doBreak && rand() < 0.07;
    const points = rand() < 0.1 ? P_POINTS[pickW([[1, 70], [2, 22], [3, 8]])] : 0;
    return settle(cfg, ctx, { grid: null, base: { win: 0, lines: [] }, done, points, state, extra: { egg: { before, after: state.crack, add, tease }, anticipation: tease ? [0] : [] } });
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
    const roll = (k, p) => !F[k].off && (force ? force.split(":")[0] === k : rand() < p * boost);
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
