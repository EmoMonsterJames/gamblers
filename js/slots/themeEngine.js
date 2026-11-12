// =====================================================================
// The 15 theme machines (configs: js/slots/themeConfigs.js, renderer:
// js/screens/slotSpecial.js). Same contract as specialEngine.js: each
// spin first rolls which features hit (features.*.p × pet luck, or the
// practice-room `force`), then builds grids that explain the result and
// returns a `phases` script for the screen to play.
// Bonus icons are named Z* so the shared inject() never overwrites them.
// =====================================================================
import { R, ri, pickW, shuffle, clone, key, gate as gate0, draw, inject, addPoints, count, teaseFor, finish, ctl, spJackpotValue } from "./specialEngine.js";
// per-machine jackpot throttle: cfg.jpDown = { TIER: probability to step down one tier }
const JP_DOWN_ORDER = ["MEGA", "VAULT", "GRAND", "STRIKE", "MAJOR", "JOKER", "MAXI", "MINOR", "MINI"];
function down(cfg, t) {
    for (let g = 0; g < 8 && cfg.jpDown?.[t] && R() < cfg.jpDown[t]; g++) {
        const i = JP_DOWN_ORDER.indexOf(t), nx = JP_DOWN_ORDER.slice(i + 1).find(x => cfg.jp?.[x]);
        if (!nx) break; t = nx;
    }
    return t;
}
const gate = (cfg, t, bet) => down(cfg, gate0(cfg, t, bet));

// ------------------------------------------------------------ evaluation
const isW = x => x === "W" || /^W\d+$/.test(x || "");
const wm = x => x === "W" ? 1 : (+String(x).slice(1) || 1);
// FSC: payout scale of the feature being played (cfg.fscale[kind], solved with px by simulation)
let FSC = 1;
const feat = (cfg, k) => { FSC = cfg.fscale?.[k] ?? 1; };
const endFeat = () => { FSC = 1; };
const cash = (cfg, bet, x) => Math.round(x * bet * (cfg.px || 1) * FSC);
const short = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : v >= 1e4 ? Math.round(v / 1000) + "K" : String(v);
const payKeys = cfg => Object.keys(cfg.syms).filter(k => cfg.syms[k].pay);
const highKeys = cfg => payKeys(cfg).filter(k => k.startsWith("H"));
const lowKeys = cfg => payKeys(cfg).filter(k => !k.startsWith("H"));
const cellsAll = g => g.flatMap((col, c) => col.map((_, r) => [c, r]));
const jpv = (cfg, ctx, tier) => spJackpotValue(cfg, tier, ctx.bet, ctx.pool);
const name = (cfg, s) => cfg.syms[s]?.name || cfg.look?.[s]?.name || s;

// ways (left → right), Wn wilds multiply, opts.mult(c,r) = cell multiplier
function waysEval(cfg, g, bet, { wildReels = [], mult = null, scale = 1 } = {}) {
    const lines = []; let total = 0;
    for (const s of payKeys(cfg)) {
        const def = cfg.syms[s];
        let w = 1, n = 0, m = 1; const cells = [];
        for (let c = 0; c < g.length; c++) {
            const hit = [];
            g[c].forEach((x, r) => { if (x === s || isW(x) || wildReels.includes(c)) hit.push([c, r]); });
            if (!hit.length) break;
            w *= hit.length; n++; cells.push(...hit);
            for (const [cc, rr] of hit) m = Math.max(m, isW(g[cc][rr]) ? wm(g[cc][rr]) : 1, mult ? (mult(cc, rr) || 1) : 1);
        }
        const min = cfg.minKind || 3;
        if (n >= min) {
            const p = def.pay[Math.min(n, min + def.pay.length - 1) - min] * w * bet * (cfg.px || 1) * scale * m * FSC;
            if (p > 0) { lines.push({ sym: s, n, ways: w, mult: m, win: Math.round(p), cells }); total += p; }
        }
    }
    return { win: Math.round(total), lines, five: lines.filter(l => l.n >= 5).length };
}
// fixed paylines over a 5x3 grid
export const LINES = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 0, 1, 0],
    [2, 1, 2, 1, 2], [1, 0, 1, 0, 1], [1, 2, 1, 2, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 0, 2, 0],
    [2, 0, 2, 0, 2], [1, 0, 2, 0, 1], [1, 2, 0, 2, 1], [0, 2, 2, 2, 0], [2, 0, 0, 0, 2]];
function linesEval(cfg, g, bet, { n: nLines = 25, mult = null, scale = 1 } = {}) {
    const lines = []; let total = 0;
    for (const L of LINES.slice(0, nLines)) {
        let s = null;
        for (let c = 0; c < 5; c++) { const x = g[c][L[c]]; if (!isW(x)) { s = x; break; } }
        if (!s || !cfg.syms[s]?.pay) continue;
        let n = 0, m = 1; const cells = [];
        for (let c = 0; c < 5; c++) { const x = g[c][L[c]]; if (x !== s && !isW(x)) break; n++; cells.push([c, L[c]]); m = Math.max(m, isW(x) ? wm(x) : 1, mult ? (mult(c, L[c]) || 1) : 1); }
        if (n < 3) continue;
        const p = cfg.syms[s].pay[n - 3] * bet * (cfg.px || 1) * scale * m * FSC;
        if (p > 0) { lines.push({ sym: s, n, ways: 1, mult: m, win: Math.round(p), cells }); total += p; }
    }
    return { win: Math.round(total), lines, five: lines.filter(l => l.n >= 5).length };
}
// clusters: orthogonally (or 8-way) connected same symbols, wilds join any cluster
function clusterEval(cfg, g, bet, { min = 5, diag = false, mult = null, scale = 1 } = {}) {
    const C = g.length, Rn = g[0].length, lines = []; let total = 0;
    const nb = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const s of payKeys(cfg)) {
        const seen = new Set();
        for (let c = 0; c < C; c++) for (let r = 0; r < Rn; r++) {
            if (g[c][r] !== s || seen.has(key(c, r))) continue;
            const stack = [[c, r]], cells = [], local = new Set([key(c, r)]);
            while (stack.length) {
                const [x, y] = stack.pop(); cells.push([x, y]);
                if (g[x][y] === s) seen.add(key(x, y));
                for (const [dx, dy] of nb) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= C || ny >= Rn || local.has(key(nx, ny))) continue;
                    if (g[nx][ny] === s || isW(g[nx][ny])) { local.add(key(nx, ny)); stack.push([nx, ny]); }
                }
            }
            if (cells.length < min) continue;
            let m = 1; for (const [x, y] of cells) m = Math.max(m, isW(g[x][y]) ? wm(g[x][y]) : 1, mult ? (mult(x, y) || 1) : 1);
            const pay = cfg.syms[s].pay[Math.min(cells.length - min, cfg.syms[s].pay.length - 1)];
            const p = pay * bet * (cfg.px || 1) * scale * m * FSC;
            lines.push({ sym: s, n: cells.length, ways: 1, mult: m, win: Math.round(p), cells, cluster: true }); total += p;
        }
    }
    return { win: Math.round(total), lines, five: lines.filter(l => l.n >= 8).length };
}
const txt = (cfg, ev) => ev.lines.slice(0, 3).map(l => `${l.cluster ? l.n + "개 " : l.n + "× "}${name(cfg, l.sym)}${l.ways > 1 ? ` · ${l.ways} ways` : ""}${l.mult > 1 ? ` · x${l.mult}` : ""}`).join(" · ");
function winP(phases, cfg, ev, prefix = "") {
    if (!ev.win) return 0;
    phases.push({ t: "win", cells: ev.lines.flatMap(l => l.cells), win: ev.win, text: (prefix ? prefix + " · " : "") + txt(cfg, ev) });
    return ev.win;
}
// cluster cascade: winners vanish, the rest fall, new symbols drop in from the top
function cascade(cfg, g, bet, phases, { min = 5, diag = false, mult = null, scale = 1, over = {}, max = 12, label = "" } = {}) {
    let total = 0, five = 0, steps = 0, types = [];
    for (; steps < max; steps++) {
        const ev = clusterEval(cfg, g, bet, { min, diag, mult: typeof mult === "function" ? mult : null, scale: scale * (typeof mult === "number" ? mult : 1) });
        if (!ev.win) break;
        if (steps === 0) types = [...new Set(ev.lines.map(l => l.sym))];
        total += winP(phases, cfg, ev, label); five += ev.five;
        const gone = new Set(ev.lines.flatMap(l => l.cells.map(([c, r]) => key(c, r))));
        phases.push({ t: "clear", cells: [...gone].map(k => k.split(",").map(Number)) });
        refill(cfg, g, gone, over);
        phases.push({ t: "drop", grid: clone(g) });
    }
    return { total, five, steps, types };
}
function refill(cfg, g, gone, over = {}) {
    const Rn = g[0].length;
    for (let c = 0; c < g.length; c++) {
        const keep = g[c].filter((_, r) => !gone.has(key(c, r)));
        const fresh = draw(cfg, 1, Rn - keep.length, over)[0] || [];
        g[c] = [...fresh, ...keep];
    }
}
// a guaranteed win made of one paying symbol
function forceRun(cfg, g, sym, n = 3) {
    const out = clone(g), changed = [];
    for (let c = 0; c < Math.min(n, out.length); c++) {
        if (out[c].some(x => x === sym || isW(x))) continue;
        const r = ri(out[c].length); out[c][r] = sym; changed.push([c, r]);
    }
    return { grid: out, changed };
}
function diff(a, b) { const out = []; a.forEach((col, c) => col.forEach((s, r) => { if (s !== b[c][r]) out.push([c, r]); })); return out; }
function nearMiss(grid, sym) { return count(grid, sym) >= 2 ? sym : null; }
// a pick-N-of-M card / flask / cup screen; `reveals` are shown in pick order
const pickn = (o) => ({ t: "pickn", ...o });

// ------------------------------------------------------------ Hold & Spin (shared)
// o: { C, Rn, start: n coins, coin: () => {v|jp|label…}, p: chance per empty cell per respin, lives,
//      blocked: Set("c,r"), sym, title, onAdd(board, added) → phases, fullTier, spins (fixed, no reset) }
function holdSpin(cfg, ctx, phases, o) {
    const C = o.C, Rn = o.Rn, board = new Map(), blocked = o.blocked || new Set();
    const open = () => { const out = []; for (let c = 0; c < C; c++) for (let r = 0; r < Rn; r++) if (!board.has(key(c, r)) && !blocked.has(key(c, r))) out.push([c, r]); return out; };
    for (const [c, r, cn] of o.init || []) board.set(key(c, r), cn);
    for (const [c, r] of shuffle(open()).slice(0, Math.max(0, (o.start || 6) - board.size))) { let cn = o.coin(); while (cn.jp || cn.special) cn = o.coin(); board.set(key(c, r), cn); }
    const gridOf = () => { const g = []; for (let c = 0; c < C; c++) { const col = []; for (let r = 0; r < Rn; r++) col.push(board.has(key(c, r)) ? (board.get(key(c, r)).sym || o.sym || "ZC") : blocked.has(key(c, r)) ? "ZX" : "_"); g.push(col); } return g; };
    const badges = () => [...board.entries()].map(([k, cn]) => { const [c, r] = k.split(",").map(Number); return { c, r, text: cn.label || (cn.jp ? cn.jp : short(cn.v || 0)), cls: cn.jp ? "jpb" : cn.cls || "val" }; });
    if (Rn !== (cfg.rows || 3)) phases.push({ t: "rows", n: Rn });
    if (o.title) phases.push({ t: "banner", text: o.title, cls: "bonus" });
    phases.push({ t: "show", grid: gridOf(), pop: [...board.keys()].map(k => k.split(",").map(Number)) });
    phases.push({ t: "badge", cells: badges() });
    let lives = o.lives ?? 3, spins = o.spins ?? null, guard = 0;
    while ((spins != null ? spins > 0 : lives > 0) && open().length && guard++ < 60) {
        const added = [];
        for (const [c, r] of open()) if (R() < (o.p || 0.08)) { board.set(key(c, r), o.coin()); added.push([c, r]); }
        if (spins != null) spins--; else lives = added.length ? (o.lives ?? 3) : lives - 1;
        phases.push({ t: "hud", text: spins != null ? `SPINS ${spins}` : `RESPINS ${lives}` });
        phases.push({ t: "land", grid: gridOf(), cells: added, roll: true });
        if (o.onAdd) { const r = o.onAdd(board, added, blocked, phases); if (r?.extra) { if (spins != null) spins += r.extra; else lives = Math.max(lives, r.extra); } }
        phases.push({ t: "show", grid: gridOf(), pop: [] });
        phases.push({ t: "badge", cells: badges() });
    }
    phases.push({ t: "hud", text: "" });
    return { board, gridOf, badges, full: !open().length };
}
function payBoard(cfg, ctx, phases, board, { label = "HOLD & SPIN", mult = 1, full = false, fullTier = "GRAND", only = null } = {}) {
    const coins = [...board.entries()].filter(([k]) => !only || only.has(k)).map(([, cn]) => cn);
    const sum = Math.round(coins.reduce((s, cn) => s + (cn.v || 0), 0) * mult);
    if (sum) phases.push({ t: "win", cells: [], win: sum, text: `${label} COLLECT${mult > 1 ? ` x${mult}` : ""}` });
    for (const cn of coins) if (cn.jp) phases.push({ t: "jp", tier: cn.jp, amount: jpv(cfg, ctx, cn.jp) });
    if (full) { const t = gate(cfg, fullTier, ctx.bet); phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }); }
    return sum;
}
const coinMaker = (cfg, bet, { vals = [[1, 30], [2, 25], [3, 15], [5, 12], [8, 6], [10, 4], [20, 1.5], [50, 0.3]], jp = 0.04, tw = { MINI: 60, MINOR: 30, MAXI: 8, MAJOR: 2 }, extra = [] } = {}) => () => {
    const x = R();
    let acc = 0;
    for (const e of extra) { acc += e.p; if (x < acc) return { ...e.coin }; }
    if (x < acc + jp) { const keys = Object.keys(tw).filter(t => cfg.jp?.[t]); return { jp: gate(cfg, pickW(keys.map(t => [t, tw[t]])), bet) }; }
    return { v: cash(cfg, bet, pickW(vals)) };
};
// free spins loop: each spin draws a grid, evaluates it and may add spins
function freeLoop(cfg, ctx, phases, { n, max = 50, title, mode = "free-mode", drawFn, evalFn, after }) {
    phases.push({ t: "banner", text: title, cls: "bonus" });
    phases.push({ t: "mode", add: mode });
    let total = 0, five = 0;
    for (let i = 0; i < n && i < max; i++) {
        phases.push({ t: "hud", text: `FREE SPIN ${i + 1} / ${n}` });
        const g = drawFn(i);
        phases.push({ t: "spin", grid: clone(g.grid || g), hold: g.hold || [] });
        const ev = evalFn(g.grid || g, i);
        total += winP(phases, cfg, ev, ev.prefix || ""); five += ev.five || 0;
        if (after) { const add = after(g.grid || g, i, ev) || 0; if (add) n = Math.min(max, n + add); }
    }
    phases.push({ t: "hud", text: "" });
    phases.push({ t: "mode", remove: mode });
    return { total, five };
}
// meter in the top panel (state value)
const meter = (phases, k, v, max) => phases.push({ t: "meter", key: k, value: v, max });

// =====================================================================
// ⚙️ The Clockwork Vault — 5x3 ways, brass gears
// =====================================================================
function clockwork(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doEsc = hit("escape"), doOver = !doEsc && hit("overclock"), doPend = !doEsc && !doOver && hit("pendulum"), doRew = !doEsc && !doOver && !doPend && hit("rewind");
    let grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doEsc) { inject(grid, "ZK", 3); kinds.push("escape"); feat(cfg, "escape"); } else if (R() < 0.07) inject(grid, "ZK", 2, { avoid: c => c >= 3 });
    if (doOver) { inject(grid, "ZS", 1); kinds.push("overclock_free"); feat(cfg, "overclock_free"); }
    if (doRew) grid = grid.map(col => col.map(s => s.startsWith("H") || isW(s) ? "L1" : s));
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZK"]), near: doEsc ? null : nearMiss(grid, "ZK") }];
    endFeat();
    let ev = waysEval(cfg, grid, bet), baseWin = 0, five = 0;
    if (doRew) {
        const s = pickW(highKeys(cfg).map(k => [k, 1]));
        const back = forceRun(cfg, grid, s, pickW([[3, 60], [4, 30], [5, 10]]));
        phases.push({ t: "fx", name: "rewind", grids: [grid, back.grid] });
        phases.push({ t: "morph", grid: clone(back.grid), cells: back.changed, fx: "evolve", text: "⏪ TIME REWIND! 기계 팔이 톱니를 한 칸 되돌렸다!" });
        grid = back.grid; ev = waysEval(cfg, grid, bet); kinds.push("rewind"); feat(cfg, "rewind");
    }
    baseWin += winP(phases, cfg, ev); five += ev.five;
    if (doPend) {
        kinds.push("pendulum"); feat(cfg, "pendulum");
        phases.push({ t: "fx", name: "pendulum" });
        const sticky = [];
        let g = clone(grid);
        for (let s = 0; s < 3; s++) {
            const c = shuffle([0, 1, 2, 3, 4].filter(x => !sticky.includes(x)))[0]; sticky.push(c);
            phases.push({ t: "hud", text: `PENDULUM SWING ${s + 1} / 3` });
            phases.push({ t: "fx", name: "swing", col: c });
            g = draw(cfg, 5, 3); for (const k of sticky) g[k] = ["W", "W", "W"];
            phases.push({ t: "spin", grid: clone(g), hold: [...sticky] });
            const e = waysEval(cfg, g, bet); winP(phases, cfg, e, "🕰️ PENDULUM"); five += e.five;
        }
        phases.push({ t: "hud", text: "" });
    }
    if (doOver) {
        feat(cfg, "overclock");
        let mult = 1;
        const r = freeLoop(cfg, ctx, phases, {
            n: F.overclock.spins || 5, title: "✨ OVERCLOCKED SPIN · 5 HYPER ROTATIONS ✨",
            drawFn: () => draw(cfg, 5, 3, { W: 2.2 }),
            evalFn: g => { if (count(g, "W") >= 2) { mult++; phases.push({ t: "fx", name: "mesh" }); phases.push({ t: "hud", text: `x${mult} MULTIPLIER` }); } const e = waysEval(cfg, g, bet, { scale: mult }); e.prefix = `x${mult}`; return e; }
        });
        five += r.five;
    }
    if (doEsc) {
        const reached = pickW([[0, 40], [1, 32], [2, 18], [3, 8], [4, 2]]);
        let tier = ["MINI", "MINOR", "MAXI", "MAJOR", "GRAND"][reached];
        tier = gate(cfg, tier, bet);
        const step = ["MINI", "MINOR", "MAXI", "MAJOR", "GRAND"].indexOf(tier);
        phases.push({ t: "banner", text: "🗝️ THE MASTER ESCAPE · 금고 다이얼을 돌려라! 🗝️", cls: "jackpot" });
        phases.push({ t: "ladder", title: "🔐 SAFE-CRACKING DIAL", icon: "⚙️", steps: ["MINI", "RING 1 · MINOR", "RING 2 · MAXI", "RING 3 · MAJOR", "RING 4 · GRAND"], reached: step });
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    if (!baseWin && !kinds.length && phases[0].antic.length) phases.push({ t: "tease" });
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🧪 The Alchemist's Lab — 6x5 cauldron, clusters of 5+, cascades
// =====================================================================
function alchemist(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doTrans = hit("transmute"), doChain = !doTrans && hit("chain"), doDist = !doTrans && !doChain && hit("distill"), doGrim = !doTrans && !doChain && !doDist && hit("grimoire");
    const C = 6, Rn = 5, kinds = [];
    let grid = draw(cfg, C, Rn);
    if (doTrans) { inject(grid, "ZD", 3); kinds.push("transmute"); feat(cfg, "transmute"); } else if (R() < 0.06) inject(grid, "ZD", 2);
    if (doChain) { // two different ingredient clusters on the first drop
        const [a, b] = shuffle(lowKeys(cfg)).slice(0, 2);
        for (let r = 0; r < 5; r++) grid[0][r] = a;
        for (let r = 0; r < 5; r++) grid[5][r] = b;
    }
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZD"]), near: doTrans ? null : nearMiss(grid, "ZD") }];
    endFeat();
    state.tube = state.tube || 0;
    let mult = 1;
    if (doDist) { kinds.push("distill"); feat(cfg, "distill"); state.tube = F.distill.max; meter(phases, "tube", state.tube, F.distill.max); phases.push({ t: "fx", name: "distill" }); mult = 2; phases.push({ t: "hud", text: "💧 DISTILLER x2 — 모든 재료 가치 2배!" }); }
    if (doGrim) {
        kinds.push("grimoire"); feat(cfg, "grimoire");
        const counts = lowKeys(cfg).concat(highKeys(cfg)).map(s => [s, count(grid, s)]).sort((a, b) => b[1] - a[1]);
        const s = counts[0][0];
        phases.push({ t: "fx", name: "grimoire" });
        const cells = []; grid.forEach((col, c) => col.forEach((x, r) => { if (x === s) { grid[c][r] = "H0"; cells.push([c, r]); } }));
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "gold", text: `📖 MYSTERY GRIMOIRE! ${name(cfg, s)} → 현자의 돌!` });
    }
    let r = cascade(cfg, grid, bet, phases, { min: 5, mult, label: mult > 1 ? "x2" : "" });
    let baseWin = r.total, five = r.five;
    if (doChain && r.types.length >= 2) {
        kinds.push("chain"); feat(cfg, "chain");
        phases.push({ t: "fx", name: "erupt" });
        const gone = new Set(); grid.forEach((col, c) => col.forEach((x, rr) => { if (lowKeys(cfg).includes(x)) gone.add(key(c, rr)); }));
        phases.push({ t: "clear", cells: [...gone].map(k => k.split(",").map(Number)) });
        refill(cfg, grid, gone, { L1: 0, L2: 0, L3: 0 });
        const s = pickW(highKeys(cfg).map(k => [k, 1])), c0 = ri(C - 1), r0 = ri(Rn - 1);
        for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]]) grid[c0 + dc][r0 + dr] = s;
        phases.push({ t: "morph", grid: clone(grid), cells: [[c0, r0], [c0 + 1, r0], [c0, r0 + 1], [c0 + 1, r0 + 1]], fx: "gold", text: "⚗️ CHAIN REACTION BREW! 2x2 메가 재료 투하!" });
        const r2 = cascade(cfg, grid, bet, phases, { min: 5, mult, label: "⚗️ BREW" });
        baseWin += r2.total; five += r2.five;
    }
    if (!doDist) { state.tube = Math.min(F.distill.max - 1, state.tube + r.steps); meter(phases, "tube", state.tube, F.distill.max); }
    else { state.tube = 0; meter(phases, "tube", 0, F.distill.max); }
    if (doTrans) {
        feat(cfg, "transmute");
        // pick flasks: each one keeps the reaction stable (multiplier climbs) or shatters it
        const LAD = [2, 3, 5, 10, 25, 50, 100, 250, 1000, 5000];
        let k = 0; while (k < LAD.length - 1 && R() < 0.5) k++;
        const base = cash(cfg, bet, 1);
        const reveals = LAD.slice(0, k + 1).map(m => ({ text: `x${m}`, cls: "ok" })).concat([{ text: "💥", cls: "bad" }]);
        phases.push({ t: "banner", text: "🐲 THE GRAND TRANSMUTATION 🐲", cls: "jackpot" });
        phases.push(pickn({ title: "⚗️ 플라스크를 골라 반응을 안정시켜라! (💥 = 종료)", icon: "⚗️", n: 12, k: reveals.length, reveals }));
        const prize = Math.min(base * LAD[k], (cfg.maxX || 5000) * bet);
        phases.push({ t: "win", cells: [], win: prize, text: `🐲 TRANSMUTATION x${LAD[k]}` });
        const tier = k >= 8 ? "GRAND" : k >= 7 ? "MAJOR" : k >= 5 ? "MAXI" : k >= 3 ? "MINOR" : k >= 2 ? "MINI" : null;
        if (tier) { const t = gate(cfg, tier, bet); phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }); }
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five });
}

// =====================================================================
// 🌌 Astral Weaver — 6x5 star chart, constellations of 4+
// =====================================================================
function astral(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doNeb = hit("nebula"), doNova = !doNeb && hit("supernova"), doHole = !doNeb && !doNova && hit("blackhole"), doComet = !doNeb && !doNova && !doHole && hit("comet");
    const C = 6, kinds = [];
    const Rn = doNova ? 7 : 5;
    let grid = draw(cfg, C, Rn);
    const points = addPoints(grid);
    const phases = [];
    endFeat();
    if (doNova) { phases.push({ t: "fx", name: "supernova" }); phases.push({ t: "rows", n: 7 }); kinds.push("supernova"); feat(cfg, "supernova"); }
    phases.push({ t: "spin", grid: clone(grid), antic: [] });
    // comet trail: persistent multipliers for the next spins
    const trail = state.comet && state.comet.left > 0 ? state.comet : null;
    const multAt = (c, r) => trail?.cells.find(x => x[0] === c && x[1] === r)?.[2] || 1;
    if (trail) phases.push({ t: "badge", cells: trail.cells.filter(([c, r]) => r < Rn).map(([c, r, m]) => ({ c, r, text: `x${m}`, cls: "mult" })) });
    if (doNova) {
        const cells = [[2, 2], [3, 2], [2, 3], [3, 3], [2, 4], [3, 4]];
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: "💥 SUPERNOVA! 중심 링이 WILD로 · 외곽 링 확장!" });
    }
    if (doHole) {
        kinds.push("blackhole"); feat(cfg, "blackhole");
        const s = pickW(payKeys(cfg).map(k => [k, k.startsWith("H") ? 1 : 2]));
        const c0 = 1 + ri(C - 2), r0 = 1 + ri(Rn - 2);
        phases.push({ t: "fx", name: "blackhole" });
        const cells = [[c0, r0], [c0 + 1, r0], [c0 - 1, r0], [c0, r0 + 1], [c0, r0 - 1], ...shuffle([[c0 + 1, r0 + 1], [c0 - 1, r0 - 1], [c0 + 1, r0 - 1], [c0 - 1, r0 + 1]]).slice(0, 1 + ri(3))];
        for (const [c, r] of cells) grid[c][r] = s;
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "bounce", text: `🕳️ BLACK HOLE! 흩어진 ${name(cfg, s)}이(가) 끌려와 별자리 완성!` });
    }
    const ev = clusterEval(cfg, grid, bet, { min: 4, mult: multAt });
    let baseWin = winP(phases, cfg, ev, trail ? "☄️ TRAIL" : ""), five = ev.five;
    if (trail) { trail.left--; if (!trail.left) delete state.comet; }
    if (doComet) {
        kinds.push("comet"); feat(cfg, "comet");
        const cells = []; const dir = R() < 0.5;
        for (let c = 0; c < C; c++) { const r = dir ? Math.min(4, Math.floor(c * 5 / C)) : 4 - Math.min(4, Math.floor(c * 5 / C)); cells.push([c, r, pickW([[2, 60], [3, 30], [5, 10]])]); }
        state.comet = { cells, left: F.comet.spins || 4 };
        phases.push({ t: "fx", name: "comet" });
        phases.push({ t: "badge", cells: cells.map(([c, r, m]) => ({ c, r, text: `x${m}`, cls: "mult" })) });
        phases.push({ t: "hud", text: `☄️ COMET TRAIL · 다음 ${state.comet.left}스핀 배수 유지` });
        phases.push({ t: "hud", text: "" });
    }
    if (doNova) phases.push({ t: "rows", n: 5 });
    if (doNeb) {
        kinds.push("nebula_free"); feat(cfg, "nebula_free");
        phases.push({ t: "fx", name: "nebula" });
        const rings = 3 + ri(4), prizes = Array.from({ length: rings }, () => pickW([[1, 30], [2, 30], [3, 20], [5, 12], [10, 6], [25, 2]]));
        phases.push({ t: "ladder", title: "🌀 NEBULA PORTAL · 별빛 고리를 통과하라!", icon: "💫", steps: prizes.map(x => `+${x}x`), reached: rings - 1 });
        const sum = cash(cfg, bet, prizes.reduce((a, b) => a + b, 0));
        phases.push({ t: "win", cells: [], win: sum, text: "🌀 NEBULA RINGS" });
        const r = freeLoop(cfg, ctx, phases, { n: F.nebula.spins || 5, title: "🌌 COSMIC FREE SPINS 🌌", drawFn: () => draw(cfg, C, 5, { W: 1.6 }), evalFn: g => clusterEval(cfg, g, bet, { min: 4 }) });
        five += r.five;
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five });
}

// =====================================================================
// 🤖 Neon Blitz: Cyber-Bot Arena — 8x6 cluster cascade, Sparky
// =====================================================================
function neon(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doOver = hit("overdrive"), doFree = !doOver && hit("free"), doMega = !doOver && !doFree && hit("megacore"), doEmp = !doOver && !doFree && !doMega && hit("emp"), doMag = !doOver && !doFree && !doMega && !doEmp && hit("magnet");
    const C = 8, Rn = 6, kinds = [];
    let grid = draw(cfg, C, Rn);
    const scat = doFree ? 3 + pickW([[0, 60], [1, 25], [2, 10], [3, 5]]) : 0;
    if (doFree) { inject(grid, "ZF", scat); kinds.push("free"); feat(cfg, "free"); } else if (R() < 0.08) inject(grid, "ZF", 2);
    const coins = doMega ? pickW([[1, 60], [2, 25], [3, 10], [4, 5]]) : 0;
    if (doMega) inject(grid, "ZB", coins);
    let chips = [];
    if (doMag) { chips = inject(grid, "ZC", 3 + ri(6), { distinct: false }); inject(grid, "ZE", 1); }
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZF"]), near: doFree ? null : nearMiss(grid, "ZF") }];
    endFeat();
    const coinVals = chips.map(() => R() < 0.08 ? { jp: gate(cfg, pickW([["MINI", 60], ["MINOR", 30], ["MAJOR", 9], ["GRAND", 1]]), bet) } : { v: cash(cfg, bet, pickW([[0.5, 30], [1, 30], [2, 20], [5, 12], [10, 6], [25, 2]])) });
    if (chips.length) phases.push({ t: "badge", cells: chips.map(([c, r], i) => ({ c, r, text: coinVals[i].jp || short(coinVals[i].v), cls: coinVals[i].jp ? "jpb" : "val" })) });
    let r = cascade(cfg, grid, bet, phases, { min: 5 });
    let baseWin = r.total, five = r.five;
    state.battery = (state.battery || 0) + r.steps;
    const megaDrop = (size, label) => {
        const s = pickW(highKeys(cfg).map(k => [k, 1])), c0 = ri(C - size + 1), r0 = ri(Rn - size + 1), cells = [];
        for (let dc = 0; dc < size; dc++) for (let dr = 0; dr < size; dr++) { grid[c0 + dc][r0 + dr] = s; cells.push([c0 + dc, r0 + dr]); }
        phases.push({ t: "fx", name: "megacore" });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "gold", text: `🤖 MEGA-CORE DROP ${size}x${size}! ${label}` });
        const rr = cascade(cfg, grid, bet, phases, { min: 5, label: `🧊 ${size}x${size}` });
        baseWin += rr.total; five += rr.five;
    };
    if (doMega) { kinds.push("megacore"); feat(cfg, "megacore"); megaDrop(Math.min(6, 2 + coins), `블루프린트 코인 ${coins}개`); }
    if (doEmp) {
        kinds.push("emp"); feat(cfg, "emp");
        phases.push({ t: "fx", name: "emp" });
        const gone = new Set(); grid.forEach((col, c) => col.forEach((x, rr) => { if (lowKeys(cfg).includes(x)) gone.add(key(c, rr)); }));
        phases.push({ t: "clear", cells: [...gone].map(k => k.split(",").map(Number)) });
        refill(cfg, grid, gone, Object.fromEntries(lowKeys(cfg).map(k => [k, 0])));
        const up = []; grid.forEach((col, c) => col.forEach((x, rr) => { if (x === "H3" || x === "H4") { grid[c][rr] = "H1"; up.push([c, rr]); } }));
        phases.push({ t: "morph", grid: clone(grid), cells: up, fx: "gold", text: "⚡ EMP OVERCHARGE! 고철 소멸 · 부품 → 플라즈마 코어!" });
        const rr = cascade(cfg, grid, bet, phases, { min: 5, label: "⚡ EMP" });
        baseWin += rr.total; five += rr.five;
    }
    if (doMag) {
        kinds.push("magnet"); feat(cfg, "magnet");
        phases.push({ t: "fx", name: "magnet" });
        const sum = coinVals.reduce((s, x) => s + (x.v || 0), 0);
        if (sum) phases.push({ t: "win", cells: chips, win: sum, text: "🧲 MAGNET COLLECT" });
        for (const x of coinVals) if (x.jp) phases.push({ t: "jp", tier: x.jp, amount: jpv(cfg, ctx, x.jp) });
    }
    if (doFree) {
        feat(cfg, "free");
        const n = { 3: 6, 4: 10, 5: 15, 6: 20 }[scat] || 6;
        let size = 3;
        const fr = freeLoop(cfg, ctx, phases, {
            n, title: `🏟️ CHAIN-REACTION FREE SPINS · ${n}회 🏟️`,
            drawFn: () => draw(cfg, C, Rn),
            evalFn: g => {
                grid = g;
                const c1 = cascade(cfg, grid, bet, phases, { min: 5 });
                megaDrop(size, "무료스핀 보장");
                if (size < 6 && R() < 0.35) size++;
                return { win: 0, lines: [], five: c1.five + 0, prefix: "" };
            }
        });
        five += fr.five;
    }
    if (doOver) {
        feat(cfg, "overdrive");
        kinds.push("overdrive"); feat(cfg, "overdrive");
        state.battery = F.overdrive.max; meter(phases, "battery", state.battery, F.overdrive.max);
        phases.push({ t: "fx", name: "overdrive" });
        const coin = coinMaker(cfg, bet, { vals: [[1, 30], [2, 25], [3, 15], [5, 12], [10, 6], [25, 2]], jp: 0.05, tw: { MINI: 55, MINOR: 30, MAXI: 10, MAJOR: 4, GRAND: 0.6 }, extra: [{ p: 0.05, coin: { laser: true, label: "🔫", cls: "mult", v: 0 } }] });
        const hs = holdSpin(cfg, ctx, phases, {
            C: 6, Rn: 4, start: 6, coin, p: 0.07, spins: 3, title: "⚔️ OVERDRIVE BATTLE · HOLD & SPIN 3회 ⚔️",
            onAdd: (board, added) => {
                for (const [c, rr] of added) {
                    if (!board.get(key(c, rr)).laser) continue;
                    phases.push({ t: "fx", name: "laser" });
                    for (const [k, cn] of board) if (k.endsWith("," + rr) && cn.v) cn.v *= 2;
                }
            }
        });
        payBoard(cfg, ctx, phases, hs.board, { label: "⚔️ OVERDRIVE", full: hs.full });
        state.battery = 0;
    }
    if (!doOver) { state.battery = Math.min((F.overdrive?.max || 30) - 1, state.battery); meter(phases, "battery", state.battery, F.overdrive?.max || 30); }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five });
}

// =====================================================================
// 🍿 Popcorn Pandemonium — 5x3 ways, Red / Blue / Gold buckets
// =====================================================================
function popcorn(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    state.red ??= 8; state.blue ??= 2; state.gold ??= 0;
    const doShow = hit("showdown"), doCombo = !doShow && hit("combo"), doPop = !doShow && !doCombo && hit("pop"), doSnack = !doShow && !doCombo && !doPop && hit("snack"), doJam = !doShow && !doCombo && !doPop && !doSnack && hit("jam");
    let grid = draw(cfg, 5, 3);
    const kinds = [];
    // kernels fly up into their buckets
    const kern = []; for (const k of ["ZR", "ZU", "ZG"]) if (R() < 0.035) kern.push(...inject(grid, k, 1).map(c => [k, ...c]));
    let snacks = [];
    if (doSnack) { snacks = inject(grid, "ZN", 2 + ri(4), { distinct: false, avoid: c => c === 4 }); grid[4][ri(3)] = "Z3"; }
    else if (R() < 0.05) inject(grid, "ZN", 1 + ri(2), { distinct: false, avoid: c => c === 4 });
    if (doJam) grid = grid.map(col => col.map(s => s.startsWith("H") || isW(s) ? "T" : s));
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    for (const [k] of kern) {
        if (k === "ZR") state.red = Math.min(50, state.red + 1 + ri(3));
        if (k === "ZU") state.blue = Math.min(10, state.blue + 1);
        if (k === "ZG") state.gold = Math.min(20, state.gold + 1);
    }
    const goldReels = () => Math.min(4, 1 + Math.floor(state.gold / 5));
    if (kern.length) { phases.push({ t: "fx", name: "kernel" }); meter(phases, "red", state.red, 50); meter(phases, "blue", state.blue, 10); meter(phases, "gold", state.gold, 20); }
    let ev = waysEval(cfg, grid, bet), baseWin = 0, five = 0;
    if (doJam) {
        kinds.push("jam"); feat(cfg, "jam");
        const s = pickW(highKeys(cfg).map(k => [k, 1]));
        const fx = forceRun(cfg, grid, s, pickW([[3, 50], [4, 35], [5, 15]]));
        phases.push({ t: "fx", name: "jam", grids: [grid, fx.grid] });
        phases.push({ t: "morph", grid: clone(fx.grid), cells: fx.changed, fx: "evolve", text: "🎞️ PROJECTOR JAM! 필름을 되감아 몬스터 고정!" });
        grid = fx.grid; ev = waysEval(cfg, grid, bet);
    }
    baseWin += winP(phases, cfg, ev); five += ev.five;
    if (doSnack) {
        kinds.push("snack"); feat(cfg, "snack");
        const vals = snacks.map(() => R() < 0.06 ? { jp: gate(cfg, pickW([["MINI", 70], ["MINOR", 25], ["MAJOR", 5]]), bet) } : { v: cash(cfg, bet, pickW([[0.5, 25], [1, 30], [2, 22], [3, 12], [5, 8], [10, 3]])) });
        phases.push({ t: "badge", cells: snacks.map(([c, r], i) => ({ c, r, text: vals[i].jp || short(vals[i].v), cls: vals[i].jp ? "jpb" : "val" })) });
        phases.push({ t: "fx", name: "glasses3d" });
        const sum = vals.reduce((s, x) => s + (x.v || 0), 0);
        if (sum) phases.push({ t: "win", cells: snacks, win: sum, text: "🕶️ INTERMISSION SNACK RUSH" });
        for (const x of vals) if (x.jp) phases.push({ t: "jp", tier: x.jp, amount: jpv(cfg, ctx, x.jp) });
    }
    const pops = doShow ? ["red", "blue", "gold"] : doCombo ? shuffle(["red", "blue", "gold"]).slice(0, 2) : doPop ? [pickW([["red", 45], ["blue", 30], ["gold", 25]])] : [];
    if (pops.length) {
        kinds.push("pop_free"); feat(cfg, "pop_free");
        phases.push({ t: "fx", name: pops.length > 1 ? "doublefeature" : "pop", buckets: pops });
        const n = pops.includes("red") ? state.red : 8;
        const mult = pops.includes("blue") ? state.blue : 1;
        const wr = pops.includes("gold") ? shuffle([0, 1, 2, 3, 4]).slice(0, goldReels()) : [];
        const title = `🍿 ${pops.length === 3 ? "TRIPLE" : pops.length === 2 ? "DOUBLE-FEATURE" : pops[0].toUpperCase() + " BUCKET"} POP · ${n} FREE GAMES${mult > 1 ? ` · x${mult}` : ""}${wr.length ? ` · WILD REEL ${wr.length}` : ""} 🍿`;
        const fr = freeLoop(cfg, ctx, phases, {
            n, title,
            drawFn: () => { const g = draw(cfg, 5, 3); for (const c of wr) g[c] = ["W", "W", "W"]; return { grid: g, hold: wr }; },
            evalFn: g => { const e = waysEval(cfg, g, bet, { scale: mult }); e.prefix = mult > 1 ? `x${mult}` : ""; return e; }
        });
        five += fr.five;
        if (pops.includes("red")) state.red = 8;
        if (pops.includes("blue")) state.blue = 2;
        if (pops.includes("gold")) state.gold = 0;
        meter(phases, "red", state.red, 50); meter(phases, "blue", state.blue, 10); meter(phases, "gold", state.gold, 20);
        if (doShow) {
            const tw = F.showdown.tw, keys = Object.keys(tw).filter(t => cfg.jp?.[t]);
            const tier = gate(cfg, pickW(keys.map(k => [k, tw[k]])), bet);
            phases.push({ t: "pick", f: matchPick(cfg, ctx, "🎞️ THE FINAL REEL SHOWDOWN · 포스터 3장 맞추기 🎞️", "🎬", keys, tier) });
            phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
        }
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five, lines: ev.lines });
}
function matchPick(cfg, ctx, title, icon, keys, tier) {
    const decoys = []; for (const t of keys.filter(t => t !== tier)) { const k = ri(3); for (let i = 0; i < k; i++) decoys.push(t); }
    const seq = [...shuffle([tier, tier, ...shuffle(decoys).slice(0, 7)]), tier];
    const amount = jpv(cfg, ctx, tier);
    return { type: "pick", title, tier, items: keys, seq, tiles: 12, icon, amount, total: amount };
}

// =====================================================================
// 🔮 Midnight Ouija — 5x3, 25 lines, line-heavy
// =====================================================================
function ouija(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doSwarm = hit("swarm"), doPend = !doSwarm && hit("pendulum");
    let grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doPend) { const s = pickW(highKeys(cfg).map(k => [k, 1])); const n = R() < 0.25 ? 5 : 4; for (let c = 0; c < n; c++) grid[c][1] = s; }
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    if (doSwarm) {
        kinds.push("swarm"); feat(cfg, "swarm");
        phases.push({ t: "fx", name: "swarm" });
        const s = R() < 0.3 ? null : pickW(highKeys(cfg).map(k => [k, 1]));
        const n = 3 + ri(10), cells = shuffle(cellsAll(grid)).slice(0, n); // up to 12
        for (const [c, r] of cells) grid[c][r] = s || pickW([["W2", 70], ["W3", 30]]);
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `👻 SPECTRAL SWARM! ${n}칸이 ${s ? name(cfg, s) : "x2/x3 WILD"}로 동기화!` });
    }
    let ev = linesEval(cfg, grid, bet), baseWin = winP(phases, cfg, ev), five = ev.five;
    const big = ev.lines.filter(l => l.n >= 4);
    if (doPend && big.length) {
        kinds.push("pendulum"); feat(cfg, "pendulum");
        const swings = 1 + ri(4), m = Math.min(15, [2, 3, 5, 8, 10, 15][Math.min(5, swings + ri(3))]);
        phases.push({ t: "fx", name: "pendulum" });
        phases.push({ t: "ladder", title: "🕰️ THE CURSED PENDULUM", icon: "🕰️", steps: ["x2", "x3", "x5", "x8", "x10", "x15"], reached: [2, 3, 5, 8, 10, 15].indexOf(m) });
        const extra = Math.round(ev.win * (m - 1) * FSC);
        phases.push({ t: "win", cells: big.flatMap(l => l.cells), win: extra, text: `🕰️ PENDULUM x${m}` });
        // phantom respin: winning symbols stay, the rest spins again
        const held = new Set(big.flatMap(l => l.cells.map(([c, r]) => key(c, r))));
        const g2 = draw(cfg, 5, 3); for (const k of held) { const [c, r] = k.split(",").map(Number); g2[c][r] = grid[c][r]; }
        phases.push({ t: "hud", text: "👻 PHANTOM RESPIN" });
        phases.push({ t: "spin", grid: clone(g2), frozen: [...held].map(k => k.split(",").map(Number)) });
        const e2 = linesEval(cfg, g2, bet); winP(phases, cfg, e2, "👻 PHANTOM"); five += e2.five;
        phases.push({ t: "hud", text: "" });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five, lines: ev.lines });
}

// =====================================================================
// 🗼 Tower of Terror — one iron reel, one payline (the middle row)
// =====================================================================
function tower(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doMoon = hit("bloodmoon"), doNecro = !doMoon && hit("necro"), doSlice = !doMoon && !doNecro && hit("slice"), doNudge = !doMoon && !doNecro && !doSlice && hit("nudge");
    const kinds = [];
    const strip = () => draw(cfg, 1, 3);
    const winSym = () => pickW(payKeys(cfg).map(k => [k, cfg.w[k] || 1]));
    let grid = strip();
    if (doSlice || doNecro) grid[0][1] = winSym();
    if (doNudge) { grid[0][1] = "ZB"; grid[0][R() < 0.5 ? 0 : 2] = R() < 0.5 ? "H1" : "H2"; }
    if (doMoon) grid = [["H1", R() < 0.6 ? "ZJ" : "H1", "H1"]];
    const points = 0; // one reel: no P icons
    const phases = [];
    endFeat();
    if (doMoon) { phases.push({ t: "fx", name: "bloodmoon" }); kinds.push("bloodmoon"); feat(cfg, "bloodmoon"); }
    phases.push({ t: "spin", grid: clone(grid), antic: [] });
    const payOf = s => cfg.syms[s]?.pay ? cash(cfg, bet, cfg.syms[s].pay[0]) : 0;
    let baseWin = 0;
    const center = () => grid[0][1];
    if (doNudge) {
        kinds.push("nudge"); feat(cfg, "nudge");
        const from = grid[0][0] !== "ZB" && cfg.syms[grid[0][0]]?.pay ? 0 : 2;
        phases.push({ t: "fx", name: "nudge" });
        grid = [from === 0 ? ["ZB", grid[0][0], grid[0][1]] : [grid[0][1], grid[0][2], "ZB"]];
        phases.push({ t: "morph", grid: clone(grid), cells: [[0, 1]], fx: "bounce", text: "👻 PHANTOM NUDGE! 유령 손이 릴을 끌어당겼다!" });
    }
    if (doMoon && center() === "ZJ") {
        const tier = gate(cfg, pickW(Object.keys(F.bloodmoon.tw).map(t => [t, F.bloodmoon.tw[t]])), bet);
        phases.push({ t: "badge", cells: [{ c: 0, r: 1, text: tier, cls: "jpb" }] });
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    let w = payOf(center());
    if (w) {
        let m = 1;
        if (doSlice) { kinds.push("slice"); feat(cfg, "slice"); m = pickW([[2, 45], [3, 30], [5, 18], [10, 7]]); phases.push({ t: "fx", name: "blade" }); }
        phases.push({ t: "win", cells: [[0, 1]], win: w * m, text: `${name(cfg, center())}${m > 1 ? ` · 🔪 BLADE SLICE x${m}` : ""}` });
        baseWin = w * m;
    }
    if (doNecro) {
        kinds.push("necro"); feat(cfg, "necro");
        phases.push({ t: "fx", name: "necro" });
        const LAD = [1, 1, 1.5, 2, 2, 3, 3, 5, 5, 10];
        let step = 0;
        while (step < 10) {
            phases.push({ t: "hud", text: `💀 NECROMANCER RESPIN · LADDER ${step + 1} / 10` });
            const g = strip(); if (R() < 0.42) g[0][1] = "ZB"; else if (!cfg.syms[g[0][1]]?.pay) g[0][1] = winSym();
            phases.push({ t: "spin", grid: clone(g) });
            if (g[0][1] === "ZB" || !cfg.syms[g[0][1]]?.pay) break;
            const v = Math.round(payOf(g[0][1]) * LAD[step]);
            phases.push({ t: "win", cells: [[0, 1]], win: v, text: `💀 LADDER ${step + 1} · x${LAD[step]}` });
            step++;
        }
        phases.push({ t: "hud", text: "" });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five: 0 });
}

// =====================================================================
// 🫧 The Bog — 5x3, 20 lines, rising bubbles
// =====================================================================
function bog(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doWitch = hit("witch"), doSurge = !doWitch && hit("surge"), doSoul = !doWitch && !doSurge && hit("soulpop");
    let grid = draw(cfg, 5, 3);
    const kinds = [];
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    if (doSurge || doWitch) {
        kinds.push(doWitch ? "witch" : "surge");
        const size = doWitch ? 3 : pickW([[2, 75], [3, 25]]), s = doWitch || R() < 0.25 ? "W" : pickW(highKeys(cfg).map(k => [k, 1]));
        const c0 = ri(5 - size + 1), cells = [];
        for (let dc = 0; dc < size; dc++) for (let r = 0; r < size; r++) { grid[c0 + dc][r + (size === 2 ? ri(2) * 0 : 0)] = s; cells.push([c0 + dc, r]); }
        phases.push({ t: "fx", name: "megabubble" });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "bounce", text: `🫧 ECTOPLASM SURGE! ${size}x${size} 메가 버블 — ${s === "W" ? "WILD 도깨비불" : name(cfg, s)}!` });
    }
    let ev = linesEval(cfg, grid, bet, { n: 20 }), baseWin = winP(phases, cfg, ev), five = ev.five;
    if (doSoul && ev.win) {
        kinds.push("soulpop"); feat(cfg, "soulpop");
        let g = grid, e = ev, pops = 0;
        while (e.win && pops < 6) {
            pops++;
            phases.push({ t: "fx", name: "soulpop" });
            const gone = new Set(e.lines.flatMap(l => l.cells.map(([c, r]) => key(c, r))));
            phases.push({ t: "clear", cells: [...gone].map(k => k.split(",").map(Number)) });
            // bubbles rise from below: the new symbols enter from the bottom
            for (let c = 0; c < 5; c++) { const keep = g[c].filter((_, r) => !gone.has(key(c, r))); g[c] = [...keep, ...draw(cfg, 1, 3 - keep.length)[0] || []]; }
            const mw = shuffle(cellsAll(g)).slice(0, 1 + ri(2));
            for (const [c, r] of mw) g[c][r] = pickW([["W2", 70], ["W3", 30]]);
            phases.push({ t: "drop", grid: clone(g) });
            phases.push({ t: "morph", grid: clone(g), cells: mw, fx: "wild", text: "👻 SOUL POP! 스피릿 버블 → x2/x3 WILD" });
            e = linesEval(cfg, g, bet, { n: 20 });
            winP(phases, cfg, e, `🫧 CHAIN ${pops}`); five += e.five;
        }
        if (pops >= 5) { const t = gate(cfg, pops >= 6 ? "MAJOR" : "MAXI", bet); phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }); }
    }
    if (doWitch) {
        const tier = gate(cfg, pickW(Object.keys(F.witch.tw).map(t => [t, F.witch.tw[t]])), bet);
        phases.push({ t: "banner", text: `🧙‍♀️ BOG WITCH JACKPOT · ${tier} 🧙‍♀️`, cls: "jackpot" });
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five, lines: ev.lines });
}

// =====================================================================
// 📟 Cyber-Dial 2000 — 3x4 keypad (1-9, *, 0, #), 6~12 lit keys
// =====================================================================
const KEY_PATTERNS = [
    { name: "TOP ROW", cells: [[0, 0], [1, 0], [2, 0]] }, { name: "ROW 2", cells: [[0, 1], [1, 1], [2, 1]] }, { name: "ROW 3", cells: [[0, 2], [1, 2], [2, 2]] }, { name: "BOTTOM ROW", cells: [[0, 3], [1, 3], [2, 3]] },
    { name: "SLASH", cells: [[0, 0], [1, 1], [2, 2]] }, { name: "BACKSLASH", cells: [[2, 0], [1, 1], [0, 2]] }, { name: "4 CORNERS", cells: [[0, 0], [2, 0], [0, 3], [2, 3]] }
];
function dialEval(cfg, g, bet, { mult = null } = {}) {
    const ev = clusterEval(cfg, g, bet, { min: 4, diag: true, mult });
    for (const p of KEY_PATTERNS) {
        const xs = p.cells.map(([c, r]) => g[c][r]);
        const s = xs.find(x => x !== "_" && !isW(x));
        if (!s || !cfg.syms[s]?.pay || !xs.every(x => x === s || isW(x))) continue;
        const v = Math.round(cfg.syms[s].pay[0] * (p.cells.length === 4 ? 2 : 1) * bet * (cfg.px || 1) * FSC);
        ev.lines.push({ sym: s, n: p.cells.length, ways: 1, mult: 1, win: v, cells: p.cells, pattern: p.name }); ev.win += v;
    }
    return ev;
}
function cyberdial(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doCheat = hit("cheat"), doSpeed = !doCheat && hit("speed"), doT9 = !doCheat && !doSpeed && hit("t9");
    const C = 3, Rn = 4, kinds = [];
    const lit = () => { const g = draw(cfg, C, Rn); const n = 6 + ri(7); const off = shuffle(cellsAll(g)).slice(0, 12 - n); for (const [c, r] of off) g[c][r] = "_"; return g; };
    let grid = lit();
    if (doCheat) { grid[0][3] = "ZS"; grid[2][3] = "ZH"; } else { if (grid[0][3] === "ZS" && grid[2][3] === "ZH") grid[2][3] = "_"; if (R() < 0.12) grid[R() < 0.5 ? 0 : 2][3] = R() < 0.5 ? "ZS" : "ZH"; }
    if (doT9) { const s = pickW(highKeys(cfg).map(k => [k, 1])); grid = lit(); grid[0][0] = s; grid[1][0] = "_"; grid[2][0] = s; grid[0][1] = s; grid[1][1] = "_"; }
    const points = 0;
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    let mult = 1, multCells = null;
    if (doSpeed) {
        kinds.push("speed"); feat(cfg, "speed");
        phases.push({ t: "fx", name: "speeddial" });
        const s = pickW(highKeys(cfg).map(k => [k, 1])), n = 4 + ri(3);
        let c = ri(C), r = ri(Rn); const cells = [[c, r]];
        while (cells.length < n) { const [dc, dr] = pickW([[[1, 0], 1], [[-1, 0], 1], [[0, 1], 1], [[0, -1], 1]]); const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= C || nr >= Rn) continue; c = nc; r = nr; if (!cells.some(x => x[0] === c && x[1] === r)) cells.push([c, r]); }
        for (const [x, y] of cells) grid[x][y] = s;
        mult = pickW([[2, 45], [3, 30], [4, 15], [5, 10]]); multCells = new Set(cells.map(([x, y]) => key(x, y)));
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "gold", text: `📞 SPEED-DIAL SURGE! ${n}키 동기화 · SIGNAL x${mult}` });
    }
    let ev = dialEval(cfg, grid, bet, { mult: multCells ? (c, r) => multCells.has(key(c, r)) ? mult : 1 : null });
    if (doT9 && !ev.win) {
        kinds.push("t9"); feat(cfg, "t9");
        phases.push({ t: "fx", name: "t9" });
        grid[1][0] = "W"; grid[1][1] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells: [[1, 0], [1, 1]], fx: "wild", text: "⌨️ T9 AUTO-CORRECTING... 와일드 안테나로 연결!" });
        ev = dialEval(cfg, grid, bet);
    }
    const baseWin = winP(phases, cfg, ev);
    if (doCheat) {
        kinds.push("cheat"); feat(cfg, "cheat");
        phases.push({ t: "fx", name: "cheat" });
        const coin = coinMaker(cfg, bet, { vals: [[1, 30], [2, 26], [3, 16], [5, 12], [10, 6], [20, 2], [50, 0.4]], jp: 0.05, tw: { MINI: 55, MINOR: 30, MAXI: 10, MAJOR: 4, GRAND: 0.6 }, extra: [{ p: 0.06, coin: { battery: true, label: "🔋+1", cls: "mult", v: 0 } }] });
        const hs = holdSpin(cfg, ctx, phases, {
            C, Rn, start: 4, coin, p: 0.16, spins: 3, title: "#️⃣ SECRET CHEAT CODE · *# DIAGNOSTIC HOLD & SPIN #️⃣",
            onAdd: (board, added) => { const n = added.filter(([c, r]) => board.get(key(c, r)).battery).length; return n ? { extra: n } : null; }
        });
        payBoard(cfg, ctx, phases, hs.board, { label: "#️⃣ CHEAT CODE", full: hs.full });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five: 0, lines: ev.lines });
}

// =====================================================================
// ☀️ Sun-Drum Legacy — 3 concentric rings (3 reels x 4 spokes), ways
// =====================================================================
function sundrum(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doGriot = hit("griot"), doEcho = !doGriot && hit("echo"), doKente = !doGriot && !doEcho && hit("kente");
    const C = 3, Rn = 4, kinds = [];
    let grid = draw(cfg, C, Rn);
    if (doKente) { const s = pickW(payKeys(cfg).map(k => [k, 1])); for (let c = 0; c < 3; c++) if (!grid[c].includes(s)) grid[c][ri(Rn)] = s; }
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    let wildReels = [], scale = 1;
    if (doEcho || doGriot) {
        kinds.push(doGriot ? "griot" : "echo");
        phases.push({ t: "fx", name: "echo" });
        const sync = doGriot ? 3 : pickW([[2, 70], [3, 30]]);
        const src = grid[0];
        for (let c = 1; c < sync; c++) grid[c] = [...src];
        grid[1] = grid[1].map(() => "W"); wildReels = [1]; scale = 2;
        phases.push({ t: "morph", grid: clone(grid), cells: [0, 1, 2, 3].flatMap(r => [[1, r], [2, r]]), fx: "gold", text: `🥁 TALKING DRUM ECHO! 링 ${sync}개 동기화 · 조상 가면 WILD x2` });
    }
    let ev = waysEval(cfg, grid, bet, { scale }), baseWin = winP(phases, cfg, ev), five = 0;
    if (doKente && ev.win) {
        const s = ev.lines.sort((a, b) => b.win - a.win)[0].sym;
        kinds.push("kente"); feat(cfg, "kente");
        phases.push({ t: "fx", name: "kente" });
        let held = new Set(); grid.forEach((col, c) => col.forEach((x, r) => { if (x === s || isW(x)) held.add(key(c, r)); }));
        let mult = 1;
        for (let i = 0; i < 3; i++) {
            const g = draw(cfg, C, Rn); for (const k of held) { const [c, r] = k.split(",").map(Number); g[c][r] = grid[c][r]; }
            phases.push({ t: "hud", text: `🧵 KENTE RESPIN ${i + 1}` });
            phases.push({ t: "spin", grid: clone(g), frozen: [...held].map(k => k.split(",").map(Number)) });
            const fresh = cellsAll(g).filter(([c, r]) => (g[c][r] === s || isW(g[c][r])) && !held.has(key(c, r)));
            if (!fresh.length) break;
            for (const [c, r] of fresh) { held.add(key(c, r)); mult += 1 + ri(5); }
            grid = g;
            phases.push({ t: "badge", cells: fresh.map(([c, r]) => ({ c, r, text: `x${mult}`, cls: "mult" })) });
        }
        const e = waysEval(cfg, grid, bet, { scale: mult });
        winP(phases, cfg, e, `🧵 GOLDEN THREAD x${mult}`);
        if (held.size >= 12) { const t = gate(cfg, "MAJOR", bet); phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }); }
        phases.push({ t: "hud", text: "" });
    }
    if (doGriot) {
        const tier = gate(cfg, pickW(Object.keys(F.griot.tw).map(t => [t, F.griot.tw[t]])), bet);
        phases.push({ t: "banner", text: `🥁 GRIOT'S LEGACY · ${tier} 🥁`, cls: "jackpot" });
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five, lines: ev.lines });
}

// =====================================================================
// 🎳 3 Strikes — 5x3 ways, pin lane (1~10 pins) + STRIKE indicator (1~3)
// =====================================================================
function strikes(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    state.pins ??= 1; state.strikes ??= 0;
    const doHold = hit("pinhold"), doFree = !doHold && hit("free"), doBall = !doHold && !doFree && hit("ball");
    let grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doFree) { inject(grid, "ZF", 3); kinds.push("free"); feat(cfg, "free"); } else if (R() < 0.08) inject(grid, "ZF", 2, { avoid: c => c >= 3 });
    if (doHold) { inject(grid, "ZP", 6, { distinct: false }); }
    const pinHit = !doHold && R() < F.pin.p;
    if (pinHit) inject(grid, "ZP", 1);
    if (doBall) inject(grid, "ZB", 1);
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZF"]), near: doFree ? null : nearMiss(grid, "ZF") }];
    endFeat();
    const ev = waysEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev), five = ev.five;
    if (pinHit) { state.pins = Math.min(10, state.pins + 1); phases.push({ t: "fx", name: "pinup" }); meter(phases, "pins", state.pins, 10); }
    const ballBonus = (g, label) => {
        const n = state.pins;
        phases.push({ t: "fx", name: n >= 10 ? "strike" : "ball" });
        const cells = shuffle(cellsAll(g)).slice(0, Math.min(15, n));
        const g2 = clone(g); for (const [c, r] of cells) g2[c][r] = "W";
        phases.push({ t: "morph", grid: clone(g2), cells, fx: "wild", text: `🎳 ${label} 볼링공! 핀 ${n}개 → WILD ${cells.length}개!` });
        const prev = FSC; feat(cfg, "ball");
        const e = waysEval(cfg, g2, bet); winP(phases, cfg, e, "🎳 BALL"); five += e.five;
        FSC = prev;
        if (n >= 10) { state.strikes = Math.min(3, state.strikes + 1); phases.push({ t: "banner", text: `STRIKE ${state.strikes}!`, cls: "jackpot" }); meter(phases, "strikes", state.strikes, 3); }
        state.pins = 1; meter(phases, "pins", 1, 10);
    };
    if (doBall || state.pins >= 10) { kinds.push("ball"); feat(cfg, "ball"); ballBonus(grid, state.pins >= 10 ? "10핀 꽉 찼다!" : ""); }
    if (doFree) {
        feat(cfg, "free");
        const fr = freeLoop(cfg, ctx, phases, {
            n: F.free.spins || 8, title: "🎳 SCATTER x3 · 8 FREE SPINS 🎳",
            drawFn: () => draw(cfg, 5, 3),
            evalFn: g => waysEval(cfg, g, bet),
            after: g => { if (R() < 0.06) { kinds.push("ball"); feat(cfg, "ball"); ballBonus(g, "무료스핀 중"); } return 0; }
        });
        five += fr.five;
    }
    if (doHold) {
        kinds.push("pinhold"); feat(cfg, "pinhold");
        const blocked = new Set(); for (let r = 5; r < 8; r++) for (let c = 0; c < 5; c++) blocked.add(key(c, r));
        const coin = coinMaker(cfg, bet, { vals: [[1, 30], [2, 25], [3, 15], [5, 12], [8, 6], [10, 4], [20, 1.5]], jp: 0.035, tw: { MINI: 60, MINOR: 30, MAXI: 8, MAJOR: 2 },
            extra: [{ p: 0.05, coin: { ballBreak: true, label: "🎱", cls: "mult", v: 0 } }, { p: 0.025, coin: { strike: true, label: "STRIKE", cls: "jpb", v: 0 } }] });
        const hs = holdSpin(cfg, ctx, phases, {
            C: 5, Rn: 8, start: 6, coin, p: 0.06, blocked, sym: "ZP", title: "🎳 BOWLING PIN HOLD & SPIN · 8x5 🎳",
            onAdd: (board, added, bl) => {
                for (const [c, r] of added) {
                    const cn = board.get(key(c, r));
                    if (cn.ballBreak) { const row = [5, 6, 7].find(rr => bl.has(key(0, rr))); if (row != null) { for (let cc = 0; cc < 5; cc++) bl.delete(key(cc, row)); phases.push({ t: "fx", name: "ball" }); phases.push({ t: "hud", text: `🎱 ROW ${row + 1} 잠금 해제!` }); } cn.v = cash(cfg, bet, 1); cn.label = null; }
                    if (cn.strike) { phases.push({ t: "fx", name: "strike" }); for (const [k, o] of board) if (k.endsWith("," + r) && o.v) o.v *= 2; cn.v = cash(cfg, bet, 2); }
                }
                return added.length ? { extra: 3 } : null;
            }
        });
        payBoard(cfg, ctx, phases, hs.board, { label: "🎳 PIN", full: hs.full, fullTier: "GRAND" });
        phases.push({ t: "rows", n: 3 });
    }
    if (state.strikes >= 3) {
        kinds.push("strike3"); feat(cfg, "strike3");
        phases.push({ t: "banner", text: "🎳🎳🎳 3 STRIKES! 🎳🎳🎳", cls: "jackpot" });
        // big ball in the middle, 10 pins around it
        const pinCells = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [1, 1], [3, 1], [4, 1], [2, 2]];
        const blocked = new Set(); for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) if (!pinCells.some(([x, y]) => x === c && y === r) && !(c === 2 && r === 1)) blocked.add(key(c, r));
        const ballM = pickW([[2, 50], [3, 30], [4, 14], [5, 6]]);
        const coin = coinMaker(cfg, bet, { vals: [[3, 30], [5, 25], [8, 18], [10, 12], [20, 8], [50, 2]], jp: 0.08, tw: { MINI: 50, MINOR: 30, MAXI: 15, MAJOR: 5 } });
        const hs = holdSpin(cfg, ctx, phases, { C: 5, Rn: 3, start: 3, coin, p: 0.2, lives: 3, blocked, sym: "ZP", init: [[2, 1, { v: 0, label: `🎱 x${ballM}`, cls: "mult", sym: "ZB" }]], title: "🎳 STRIKE HOLD & SPIN · 큰 볼링공 + 10핀 🎳" });
        const full = pinCells.every(([c, r]) => hs.board.has(key(c, r)));
        payBoard(cfg, ctx, phases, hs.board, { label: "🎳 3 STRIKES", mult: ballM });
        if (full) { const t = down(cfg, "STRIKE"); phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }); }
        state.strikes = 0; meter(phases, "strikes", 0, 3);
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🧛 Vampire Bingo — 5x3 ways + persistent 5x5 bingo card
// =====================================================================
const BINGO_LINES = [...[0, 1, 2, 3, 4].map(r => [0, 1, 2, 3, 4].map(c => r * 5 + c)), ...[0, 1, 2, 3, 4].map(c => [0, 1, 2, 3, 4].map(r => r * 5 + c)), [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]];
function bingoCoin(cfg, bet) {
    const k = pickW([["cash", 80], ["fang", 2.5], ["bat", 8], ["wheel", 9.5]]);
    return k === "cash" || k === "bat" ? { k, v: Math.round(cash(cfg, bet, pickW([[0.2, 30], [0.5, 30], [1, 22], [2, 11], [3, 5], [5, 2]])) * (cfg.fscale?.bingo ?? 1)) } : { k };
}
function bingoPay(cfg, ctx, phases, board, { onlyComplete = true, label = "BINGO" } = {}) {
    const done = BINGO_LINES.filter(L => L.every(i => board[i]));
    let paid = 0, majors = 0;
    for (const L of done) {
        const coins = L.map(i => board[i]);
        let sum = coins.filter(x => x.v).reduce((s, x) => s + x.v, 0);
        // bat coins (≤3) pull every neighbouring coin's value in too
        for (const i of L.filter(i => board[i].k === "bat").slice(0, 3)) for (const j of [i - 1, i + 1, i - 5, i + 5]) if (j >= 0 && j < 25 && board[j]?.v && !L.includes(j) && Math.abs((j % 5) - (i % 5)) <= 1) sum += board[j].v;
        // wheel coins (≤2) multiply by x2~x5 each
        let m = 1; const wheels = L.filter(i => board[i].k === "wheel").slice(0, 2);
        for (const _ of wheels) { const x = pickW([[2, 45], [3, 30], [4, 15], [5, 10]]); m *= x; phases.push({ t: "wheel", seg: ["x2", "x3", "x4", "x5", "x2", "x3"], idx: [0, 1, 2, 3].find(i => ["x2", "x3", "x4", "x5"][i] === "x" + x), title: "🧛 VAMPIRE WHEEL 🧛" }); }
        const fangs = L.filter(i => board[i].k === "fang").slice(0, 5);
        phases.push({ t: "panel", key: "bingo", value: board.map(x => x ? { ...x } : null), hl: L });
        phases.push({ t: "banner", text: `${label}!`, cls: "jackpot" });
        if (sum) { phases.push({ t: "win", cells: [], win: Math.round(sum * m), text: `🧛 ${label}${m > 1 ? ` x${m}` : ""}` }); paid += Math.round(sum * m); }
        for (const _ of fangs) { let t = pickW([["MINI", 60], ["MINOR", 32], ["MAJOR", 8]]); if (t === "MAJOR" && majors >= 2) t = "MINOR"; t = gate(cfg, t, ctx.bet); if (t === "MAJOR") majors++; phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }); }
    }
    for (const L of done) for (const i of L) board[i] = null;
    return { lines: done.length, paid };
}
function vampire(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const board = state.board?.length === 25 ? state.board : Array(25).fill(null);
    const doHold = hit("bingohold"), doCup = !doHold && hit("cups");
    let grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doHold) inject(grid, "ZG", 3); else if (R() < 0.06) inject(grid, "ZG", 2, { avoid: c => c >= 3 });
    if (doCup) inject(grid, "ZU", 4, { distinct: false });
    const nCoins = R() < F.coins.p ? 1 + (R() < 0.3 ? 1 : 0) : 0;
    const coinCells = nCoins ? inject(grid, "ZO", nCoins, { distinct: false }) : [];
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZG"]), near: doHold ? null : nearMiss(grid, "ZG") }];
    endFeat();
    const ev = waysEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev);
    for (const _ of coinCells) {
        const empty = board.map((x, i) => x ? -1 : i).filter(i => i >= 0);
        if (!empty.length) break;
        board[empty[ri(empty.length)]] = bingoCoin(cfg, bet);
    }
    if (coinCells.length) { phases.push({ t: "fx", name: "bingocoin" }); phases.push({ t: "panel", key: "bingo", value: board.map(x => x ? { ...x } : null) }); }
    const b = bingoPay(cfg, ctx, phases, board);
    if (b.lines) kinds.push("bingo"); feat(cfg, "bingo");
    if (doCup) {
        kinds.push("cups"); feat(cfg, "cups");
        const prizes = [["MINI", 1], ["MINOR", 1], ["MINI", 2], ["MINOR", 2]];
        const pick = pickW([[0, 45], [1, 22], [2, 22], [3, 11]]);
        const [tier, x] = prizes[pick];
        const reveals = [{ text: x > 1 ? `${tier} x2` : tier, cls: "jp" }];
        phases.push(pickn({ title: "🍷 피의 잔 하나를 골라라! 🍷", icon: "🍷", n: 4, k: 1, reveals, rest: prizes.filter((_, i) => i !== pick).map(([t, m]) => ({ text: m > 1 ? `${t} x2` : t })) }));
        for (let i = 0; i < x; i++) phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    if (doHold) {
        kinds.push("bingohold"); feat(cfg, "bingohold");
        const init = []; board.forEach((x, i) => { if (x) init.push([i % 5, Math.floor(i / 5), { ...x, label: x.k === "cash" ? null : { fang: "🦷", bat: "🦇", wheel: "🎡" }[x.k], cls: x.k === "cash" ? "val" : "mult" }]); });
        const coin = () => { const x = bingoCoin(cfg, bet); return { ...x, label: x.k === "cash" ? null : { fang: "🦷", bat: "🦇", wheel: "🎡" }[x.k], cls: x.k === "cash" ? "val" : "mult" }; };
        const hs = holdSpin(cfg, ctx, phases, { C: 5, Rn: 5, start: Math.max(init.length, 5), init, coin, p: 0.1, sym: "ZO", title: "🅱️ BINGO HOLD & SPIN 🅱️" });
        for (let i = 0; i < 25; i++) { const cn = hs.board.get(key(i % 5, Math.floor(i / 5))); board[i] = cn ? { k: cn.k, v: cn.v } : null; }
        phases.push({ t: "rows", n: 3 });
        const full = board.every(Boolean);
        bingoPay(cfg, ctx, phases, board, { label: "BINGO HOLD" });
        if (full) { const t = gate(cfg, "GRAND", bet); phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }); }
        for (let i = 0; i < 25; i++) board[i] = null;
        phases.push({ t: "panel", key: "bingo", value: board.map(() => null) });
    }
    state.board = board;
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// 💵 Pay Day — 5x3 ways, 福 / 到 envelopes, Plinko trees
// =====================================================================
function plinko(cfg, ctx, { mults, jps }) {
    const ROWS = 8, bet = ctx.bet;
    // bumpers sit on fixed pegs; the ball keeps the label of the LAST bumper it hit
    const bumps = [];
    const slots = mults && jps ? 9 : 9;
    const add = (row, col, label) => bumps.push({ row, col, label });
    const pegs = [[2, 1], [3, 2], [4, 1], [4, 3], [5, 2], [5, 4], [6, 1], [6, 3], [6, 5], [7, 2], [7, 4], [7, 6]];
    const labels = [...(mults ? ["x2", "x3", "x4", "x5"] : []), ...(jps ? ["MINI", "MINOR", "MAJOR"] : [])];
    shuffle(pegs).slice(0, labels.length).forEach(([r, c], i) => add(r, c, labels[i]));
    const bottom = [10, 5, 3, 2, 1, 2, 3, 5, 10];
    const balls = [];
    for (let b = 0; b < 3; b++) {
        let col = 0; const path = [0], hits = [];
        for (let r = 1; r <= ROWS; r++) { col += R() < 0.5 ? 0 : 1; path.push(col); const bp = bumps.find(x => x.row === r && x.col === col); if (bp) hits.push(bp.label); }
        const last = hits[hits.length - 1] || null, lastM = [...hits].reverse().find(x => x.startsWith("x")), lastJ = [...hits].reverse().find(x => !x.startsWith("x"));
        const m = mults && lastM ? +lastM.slice(1) : 1;
        const tier = jps && lastJ ? gate(cfg, lastJ, bet) : null;
        balls.push({ path, hits, slot: col, value: cash(cfg, bet, bottom[col]) * m, mult: m, tier, last });
    }
    return { rows: ROWS, bumps, bottom: bottom.map(x => x + "x"), balls };
}
function payday(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    state.fu ??= 0; state.dao ??= 0;
    const doMatch = hit("match3"), doBoth = !doMatch && hit("both"), doFu = !doMatch && !doBoth && hit("fu"), doDao = !doMatch && !doBoth && !doFu && hit("dao");
    let grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doMatch) inject(grid, "ZE", 3); else if (R() < 0.07) inject(grid, "ZE", 2, { avoid: c => c >= 3 });
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZE"]), near: doMatch ? null : nearMiss(grid, "ZE") }];
    endFeat();
    const ev = waysEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev);
    // money thrown from the reels into the envelopes
    if (R() < 0.3) { state.fu = Math.min(95, state.fu + 2 + ri(6)); state.dao = Math.min(95, state.dao + 2 + ri(6)); phases.push({ t: "fx", name: "money" }); meter(phases, "fu", state.fu, 100); meter(phases, "dao", state.dao, 100); }
    const run = (title, o, which) => {
        meter(phases, which === "dao" ? "dao" : "fu", 100, 100); if (which === "both") meter(phases, "dao", 100, 100);
        phases.push({ t: "banner", text: title, cls: "jackpot" });
        const p = plinko(cfg, ctx, o);
        phases.push({ t: "plinko", title, ...p, glyph: which === "dao" ? "到" : which === "both" ? "福到" : "福" });
        const sum = p.balls.reduce((s, b) => s + b.value, 0);
        phases.push({ t: "win", cells: [], win: sum, text: `${title} · 구슬 3개` });
        for (const b of p.balls) if (b.tier) phases.push({ t: "jp", tier: b.tier, amount: jpv(cfg, ctx, b.tier) });
        if (which !== "dao") state.fu = 0; if (which !== "fu") state.dao = 0;
        meter(phases, "fu", state.fu, 100); meter(phases, "dao", state.dao, 100);
    };
    if (doFu) { kinds.push("fu"); feat(cfg, "fu"); run("福 BONUS · PLINKO TREE", { mults: true }, "fu"); }
    if (doDao) { kinds.push("dao"); feat(cfg, "dao"); run("到 BONUS · JACKPOT PLINKO", { jps: true }, "dao"); }
    if (doBoth) { kinds.push("both"); feat(cfg, "both"); run("福到 DOUBLE BONUS!", { mults: true, jps: true }, "both"); }
    if (doMatch) {
        kinds.push("match3"); feat(cfg, "match3");
        const tw = F.match3.tw, keys = Object.keys(tw).filter(t => cfg.jp?.[t]);
        const tier = gate(cfg, pickW(keys.map(k => [k, tw[k]])), bet);
        phases.push({ t: "pick", f: matchPick(cfg, ctx, "✉️ PAYCHECK MATCH 3 · 그랜드는 여기서만! ✉️", "✉️", keys, tier) });
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🃏 Jokers — 5x3 ways, 5 face-down cards on top
// =====================================================================
function jokerWheel(cfg, ctx, phases) {
    const bet = ctx.bet;
    const SEG = ["5x +1", "MINI", "10x", "MINOR +1", "3x", "MINI +1", "20x", "MINOR", "8x +1", "2x"];
    const W = [12, 10, 10, 4, 18, 8, 4, 6, 10, 18];
    let again = true, guard = 0;
    while (again && guard++ < 8) {
        const idx = pickW(SEG.map((s, i) => [i, W[i]]));
        const s = SEG[idx];
        phases.push({ t: "wheel", seg: SEG, idx, title: "🃏 JOKER WHEEL 🃏" });
        again = s.endsWith("+1");
        const head = s.split(" ")[0];
        if (head.endsWith("x")) phases.push({ t: "win", cells: [], win: cash(cfg, bet, +head.slice(0, -1)), text: `🃏 JOKER WHEEL ${head}` });
        else { const t = gate(cfg, head, bet); phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }); }
        if (again) phases.push({ t: "hud", text: "+1 SPIN! 한 번 더!" });
    }
    phases.push({ t: "hud", text: "" });
}
function jokers(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doJoker = hit("joker"), doAce = !doJoker && hit("ace"), doKQ = !doJoker && !doAce && hit("kq"), doFree = !doJoker && !doAce && !doKQ && hit("free");
    let grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doJoker) inject(grid, "ZJ", 3); else if (R() < 0.05) inject(grid, "ZJ", 2, { avoid: c => c >= 3 });
    if (doAce) inject(grid, "ZA", 3);
    if (doKQ) { const cells = inject(grid, "ZK", 3); for (const [c, r] of cells) if (R() < 0.5) grid[c][r] = "ZQ"; }
    if (doFree) inject(grid, "ZF", 3); else if (R() < 0.07) inject(grid, "ZF", 2, { avoid: c => c >= 3 });
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZF", "ZJ"]), near: null }];
    endFeat();
    const ev = waysEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev), five = ev.five;
    const cardPrize = (allowWheel = true) => {
        const k = pickW([["cash", 50], ["jp", 28], ...(allowWheel ? [["wheel", 22]] : [])]);
        if (k === "cash") { const x = pickW([[3, 30], [5, 30], [10, 22], [20, 12], [50, 6]]); return { text: `${x}x`, cls: "ok", do: () => phases.push({ t: "win", cells: [], win: cash(cfg, bet, x), text: `🃏 CARD ${x}x` }) }; }
        if (k === "jp") { const t = gate(cfg, pickW([["MINI", 50], ["MINOR", 30], ["MAXI", 14], ["MAJOR", 5], ["GRAND", 1]]), bet); return { text: t, cls: "jp", do: () => phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }) }; }
        return { text: "🎡 WHEEL", cls: "ok", do: () => jokerWheel(cfg, ctx, phases) };
    };
    const cardRound = (title, k) => {
        const prizes = Array.from({ length: k }, () => cardPrize());
        phases.push({ t: "banner", text: "보너스 타임!", cls: "bonus" });
        phases.push(pickn({ title, icon: "🂠", n: 5, k, reveals: prizes.map(p => ({ text: p.text, cls: p.cls })), rest: Array.from({ length: 5 - k }, () => ({ text: cardPrize().text })), panelCards: true }));
        for (const p of prizes) p.do();
    };
    if (doKQ) { kinds.push("kq"); feat(cfg, "kq"); cardRound("👑 KING / QUEEN BONUS · 카드 1장을 골라라!", 1); }
    if (doAce) { kinds.push("ace"); feat(cfg, "ace"); cardRound("🂡 ACE BONUS · 카드 3장을 골라라!", 3); }
    if (doJoker) {
        kinds.push("joker"); feat(cfg, "joker");
        const picks = Array.from({ length: 3 }, () => 5 + ri(11));
        phases.push({ t: "banner", text: "보너스 타임!", cls: "bonus" });
        phases.push(pickn({ title: "🃏 JOKER BONUS · Joker's Wild 카드 3장!", icon: "🂠", n: 5, k: 3, reveals: picks.map(n => ({ text: `🃏 WILD x${n}`, cls: "ok" })), rest: [{ text: "🃏" }, { text: "🃏" }], panelCards: true }));
        for (const n of picks) {
            const g = draw(cfg, 5, 3), cells = shuffle(cellsAll(g)).slice(0, n);
            phases.push({ t: "spin", grid: clone(g) });
            for (const [c, r] of cells) g[c][r] = "W";
            phases.push({ t: "morph", grid: clone(g), cells, fx: "wild", text: `🃏 JOKER'S WILD × ${n}!` });
            const e = waysEval(cfg, g, bet); winP(phases, cfg, e, "🃏 JOKER'S WILD"); five += e.five;
        }
        if (picks.every(n => n >= 12) || picks.includes(15)) { const t = down(cfg, "JOKER"); phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }); }
    }
    if (doFree) {
        kinds.push("free"); feat(cfg, "free");
        const fr = freeLoop(cfg, ctx, phases, {
            n: F.free.spins || 5, title: "🃏 SCATTER x3 · 5 FREE SPINS 🃏",
            drawFn: () => { const g = draw(cfg, 5, 3); const j = pickW([[0, 70], [1, 20], [2, 7], [3, 3]]); if (j) inject(g, "ZJ", j); return g; },
            evalFn: g => waysEval(cfg, g, bet),
            after: g => { const j = Math.min(3, count(g, "ZJ")); if (j) phases.push({ t: "hud", text: `🃏 +${j} SPIN` }); return j; }
        });
        five += fr.five;
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🦾 Coin Claw — 5x3 ways + claw machine on top
// =====================================================================
function clawPick(cfg, ctx, phases, { noFree = false } = {}) {
    const bet = ctx.bet;
    const kind = pickW([["mystery", 38], ["wheel", 30], ["jackpot", 10], ...(noFree ? [] : [["free", 22]])]);
    phases.push({ t: "claw", pick: kind, balls: ["❓", "🎡", "FREE", "💰", "❓", "🎡", "FREE", "❓", "💰", "🎡"] });
    if (kind === "mystery") { const x = pickW([[2, 30], [3, 25], [5, 20], [8, 12], [10, 8], [20, 4], [30, 1]]); return { kind, x, do: () => phases.push({ t: "win", cells: [], win: cash(cfg, bet, x), text: `❓ MYSTERY BALL ${x}x` }) }; }
    if (kind === "wheel") {
        const SEG = ["3x", "5x", "8x", "10x", "15x", "20x", "30x", "50x"], W = [26, 24, 18, 14, 9, 5, 3, 1];
        const idx = pickW(SEG.map((s, i) => [i, W[i]])); const x = +SEG[idx].slice(0, -1);
        return { kind, x, do: () => { phases.push({ t: "wheel", seg: SEG, idx, title: "🎡 CLAW WHEEL 🎡" }); phases.push({ t: "win", cells: [], win: cash(cfg, bet, x), text: `🎡 CLAW WHEEL ${x}x` }); } };
    }
    if (kind === "jackpot") { const t = gate(cfg, pickW([["MINI", 50], ["MINOR", 30], ["MAXI", 14], ["MAJOR", 5], ["GRAND", 1]]), bet); return { kind, tier: t, do: () => phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }) }; }
    return { kind, do: () => { } };
}
function coinclaw(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doHold = hit("hold"), doClaw = !doHold && hit("claw");
    let grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doClaw) inject(grid, "ZW", 3); else if (R() < 0.07) inject(grid, "ZW", 2, { avoid: c => c >= 3 });
    if (doHold) inject(grid, "ZC", 6, { distinct: false });
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZW"]), near: doClaw ? null : nearMiss(grid, "ZW") }];
    endFeat();
    const ev = waysEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev), five = ev.five;
    const clawBonus = () => {
        feat(cfg, "claw");
        phases.push({ t: "fx", name: "claw" });
        const c = clawPick(cfg, ctx, phases);
        kinds.push("claw_" + c.kind);
        if (c.kind !== "free") { c.do(); return; }
        let left = F.claw.spins || 10, total = left, i = 0;
        phases.push({ t: "banner", text: `🦾 FREE SPIN BALL · ${left} FREE SPINS 🦾`, cls: "bonus" });
        phases.push({ t: "mode", add: "free-mode" });
        while (left > 0 && i < 50) {
            i++; left--;
            phases.push({ t: "hud", text: `FREE SPIN ${i} / ${total}` });
            const g = draw(cfg, 5, 3); const claws = R() < 0.04; if (claws) inject(g, "ZW", 3);
            phases.push({ t: "spin", grid: clone(g) });
            const e = waysEval(cfg, g, bet); winP(phases, cfg, e); five += e.five;
            if (claws) {
                const c2 = clawPick(cfg, ctx, phases);
                if (c2.kind === "free") { const add = Math.min(10, 50 - total); left += add; total += add; phases.push({ t: "hud", text: `+${add} FREE SPINS` }); }
                else c2.do();
            }
        }
        phases.push({ t: "hud", text: "" });
        phases.push({ t: "mode", remove: "free-mode" });
    };
    if (doClaw) clawBonus();
    if (doHold) {
        kinds.push("hold"); feat(cfg, "hold");
        const coin = coinMaker(cfg, bet, { vals: [[1, 30], [2, 25], [3, 15], [5, 12], [8, 6], [10, 4], [20, 1.5], [50, 0.3]], jp: 0.035, tw: { MINI: 60, MINOR: 30, MAXI: 8, MAJOR: 2 }, extra: [{ p: 0.025, coin: { claw: true, label: "🦾", cls: "mult", v: 0 } }] });
        const hs = holdSpin(cfg, ctx, phases, {
            C: 5, Rn: 3, start: 6, coin, p: 0.075, sym: "ZC", title: "🟡 BALL HOLD & SPIN 🟡",
            onAdd: (board, added) => {
                for (const [c, r] of added) {
                    const cn = board.get(key(c, r)); if (!cn.claw) continue;
                    const p = clawPick(cfg, ctx, phases, { noFree: true });
                    if (p.kind === "jackpot") { cn.jp = p.tier; cn.label = null; }
                    else { cn.v = cash(cfg, bet, p.x); cn.label = null; if (p.kind === "wheel") p.do = null; }
                }
            }
        });
        payBoard(cfg, ctx, phases, hs.board, { label: "🟡 BALL", full: hs.full });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

const wrap = fn => (cfg, ctx) => { FSC = 1; try { return fn(cfg, ctx); } finally { FSC = 1; } };
export const THEME_MACHINES = Object.fromEntries(Object.entries({
    sp_clockwork: clockwork, sp_alchemist: alchemist, sp_astral: astral, sp_neon: neon, sp_popcorn: popcorn,
    sp_ouija: ouija, sp_tower: tower, sp_bog: bog, sp_cyberdial: cyberdial, sp_sundrum: sundrum,
    sp_strikes: strikes, sp_vampire: vampire, sp_payday: payday, sp_jokers: jokers, sp_coinclaw: coinclaw
}).map(([k, fn]) => [k, wrap(fn)]));
