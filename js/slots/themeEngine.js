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
const JP_DOWN_ORDER = ["MEGA", "VAULT", "GRAND", "LOTUS", "STRIKE", "MAJOR", "JOKER", "MAXI", "MINOR", "MINI"];
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
        phases.push({ t: "spin", grid: clone(g.grid || g), hold: g.hold || [], frozen: g.frozen || [] });
        const ev = evalFn(g.grid || g, i);
        total += winP(phases, cfg, ev, ev.prefix || ""); five += ev.five || 0;
        if (after) { const add = after(g.grid || g, i, ev) || 0; if (add) { n = Math.min(max, n + add); phases.push({ t: "hud", text: `FREE SPIN ${i + 1} / ${n} (+${add})` }); } }
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
    const doS3 = hit("strike3"), doHold = !doS3 && hit("pinhold"), doFree = !doS3 && !doHold && hit("free"), doBall = !doS3 && !doHold && !doFree && hit("ball");
    if (doS3) state.strikes = 3;
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
            extra: [{ p: 0.08, coin: { ballBreak: true, special: true, label: "🎱", cls: "mult", v: 0 } }, { p: 0.015, coin: { strike: true, special: true, label: "STRIKE", cls: "jpb", v: 0 } }] });
        const hs = holdSpin(cfg, ctx, phases, {
            C: 5, Rn: 8, start: 6, coin, p: 0.06, blocked, sym: "ZP", title: "🎳 BOWLING PIN HOLD & SPIN · 8x5 🎳",
            onAdd: (board, added, bl) => {
                for (const [c, r] of added) {
                    const cn = board.get(key(c, r));
                    if (cn.ballBreak) {
                        // the bowling ball rolls into the first locked row and smashes it away — that row opens up
                        const row = [5, 6, 7].find(rr => bl.has(key(0, rr)));
                        phases.push({ t: "focus", cells: [[c, r]] });
                        phases.push({ t: "fx", name: "ball" });
                        if (row != null) {
                            phases.push({ t: "clear", cells: [0, 1, 2, 3, 4].map(cc => [cc, row]) });
                            for (let cc = 0; cc < 5; cc++) bl.delete(key(cc, row));
                            phases.push({ t: "banner", text: `🎱 볼링공! 잠긴 ROW ${row + 1} 파괴 — 한 줄 오픈!`, cls: "bonus", ms: 1200 });
                        }
                        cn.v = cash(cfg, bet, 1); cn.label = "🎱 " + short(cn.v);
                    }
                    if (cn.strike) {
                        // a STRIKE pin lights the strike counter (3 = 3 STRIKES hold & spin) and doubles its row
                        state.strikes = Math.min(3, state.strikes + 1);
                        phases.push({ t: "focus", cells: [[c, r]] });
                        phases.push({ t: "fx", name: "strike" });
                        meter(phases, "strikes", state.strikes, 3);
                        phases.push({ t: "banner", text: `🎳 STRIKE ${state.strikes} / 3!`, cls: "jackpot", ms: 1200 });
                        for (const [k, o] of board) if (k.endsWith("," + r) && o.v) o.v *= 2;
                        cn.v = cash(cfg, bet, 2); cn.label = "STRIKE " + state.strikes;
                    }
                }
                return added.length ? { extra: 3 } : null;
            }
        });
        payBoard(cfg, ctx, phases, hs.board, { label: "🎳 PIN", full: hs.full, fullTier: "GRAND" });
        phases.push({ t: "rows", n: 3 });
    }
    if (state.strikes >= 3) {
        kinds.push("strike3"); feat(cfg, "strike3");
        meter(phases, "strikes", 3, 3);
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
function bingoPay(cfg, ctx, phases, board, { label = "BINGO" } = {}) {
    const done = BINGO_LINES.filter(L => L.every(i => board[i]));
    let paid = 0, majors = 0;
    const WSEG = ["x2", "x3", "x4", "x5", "x2", "x3"];
    for (const L of done) {
        // after the line is called, every bonus coin on it fires in turn:
        // cash → tally · 🦇 bat → all coins on the line merge into the bat · 🎡 wheel → x2~x5 on the line · 🦷 fang → flips until a jackpot
        const coins = L.map(i => ({ ...board[i] }));
        const sum = coins.filter(x => x.v).reduce((s, x) => s + x.v, 0);
        const bat = coins.findIndex(x => x.k === "bat");
        const wheels = coins.map((x, i) => x.k === "wheel" ? i : -1).filter(i => i >= 0).slice(0, 2).map(at => { const x = pickW([[2, 45], [3, 30], [4, 15], [5, 10]]); return { at, x, idx: WSEG.indexOf("x" + x) }; });
        const m = wheels.reduce((a, w) => a * w.x, 1);
        const fangs = coins.map((x, i) => x.k === "fang" ? i : -1).filter(i => i >= 0).map(at => {
            let t = pickW([["MINI", 60], ["MINOR", 32], ["MAJOR", 8]]); if (t === "MAJOR" && majors >= 2) t = "MINOR"; t = gate(cfg, t, ctx.bet); if (t === "MAJOR") majors++;
            return { at, tier: t, amount: jpv(cfg, ctx, t) };
        });
        const total = Math.round(sum * m);
        phases.push({ t: "panel", key: "bingo", value: board.map(x => x ? { ...x } : null), hl: L });
        phases.push({ t: "bingoline", label, coins, sum, bat, wheels, seg: WSEG, mult: m, fangs, total });
        if (total) { phases.push({ t: "win", cells: [], win: total, text: `🧛 ${label}${m > 1 ? ` x${m}` : ""}` }); paid += total; }
        for (const fg of fangs) phases.push({ t: "jp", tier: fg.tier, amount: fg.amount });
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
    // bumpers sit on fixed pegs; a ball that touches one STOPS there and pays it at once
    // (xN bumper = N x 2 bet instant cash, jackpot bumper = that jackpot); otherwise it lands in a bottom slot
    const bumps = [];
    const add = (row, col, label) => bumps.push({ row, col, label });
    const pegs = [[2, 1], [3, 2], [4, 1], [4, 3], [5, 2], [5, 4], [6, 1], [6, 3], [6, 5], [7, 2], [7, 4], [7, 6]];
    // jackpot bumpers all just read "JACKPOT"; which tier sits behind each is only drawn here
    const labels = [...(mults ? ["x2", "x3", "x4", "x5"] : []), ...(jps ? ["JACKPOT", "JACKPOT", "JACKPOT"] : [])];
    const hidden = ["MINI", "MINOR", "MAJOR"];
    shuffle(pegs).slice(0, labels.length).forEach(([r, c], i) => { add(r, c, labels[i]); if (labels[i] === "JACKPOT") bumps[bumps.length - 1].tier = hidden.shift(); });
    const bottom = [10, 5, 3, 2, 1, 2, 3, 5, 10];
    const balls = [];
    for (let b = 0; b < 3; b++) {
        let col = 0, stop = null, sb = null; const path = [0];
        for (let r = 1; r <= ROWS; r++) { col += R() < 0.5 ? 0 : 1; path.push(col); const bp = bumps.find(x => x.row === r && x.col === col); if (bp) { stop = bp.label; sb = bp; break; } }
        if (!stop) { balls.push({ path, slot: col, value: cash(cfg, bet, bottom[col]), tier: null }); continue; }
        if (stop.startsWith("x")) { const n = +stop.slice(1); balls.push({ path, stop, value: cash(cfg, bet, n * 2), tier: null }); }
        else { const t = gate(cfg, sb.tier, bet); balls.push({ path, stop, value: 0, tier: t, amount: jpv(cfg, ctx, t) }); }
    }
    return { rows: ROWS, bumps: bumps.map(({ row, col, label }) => ({ row, col, label })), bottom: bottom.map(x => x + "x"), balls };
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
        phases.push({ t: "plinko", title, ...p, glyph: which === "dao" ? "🔴" : which === "both" ? "🟣" : "🟡" });
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
            after: g => {
                // each Joker card first shows "+1 SPIN", then the free-spin count goes up
                const cells = []; g.forEach((col, c) => col.forEach((x, r) => { if (x === "ZJ") cells.push([c, r]); }));
                const j = Math.min(3, cells.length);
                if (j) {
                    phases.push({ t: "focus", cells: cells.slice(0, j) });
                    phases.push({ t: "badge", cells: cells.slice(0, j).map(([c, r]) => ({ c, r, text: "+1 SPIN", cls: "jpb" })) });
                    phases.push({ t: "banner", text: `🃏 JOKER! +${j} SPIN`, cls: "bonus", ms: 1100 });
                }
                return j;
            }
        });
        five += fr.five;
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🦾 Coin Claw — 5x3 ways + claw machine on top
// =====================================================================
function clawPick(cfg, ctx, phases, { noFree = false, title = null } = {}) {
    const bet = ctx.bet;
    const kind = pickW([["mystery", 38], ["wheel", 30], ["jackpot", 10], ...(noFree ? [] : [["free", 22]])]);
    const balls = ["❓", "🎡", "FREE", "💰", "❓", "🎡", "FREE", "❓", "💰", "🎡"];
    // the grabbed ball opens up inside the claw and shows its prize
    if (kind === "mystery") {
        const x = pickW([[2, 30], [3, 25], [5, 20], [8, 12], [10, 8], [20, 4], [30, 1]]), v = cash(cfg, bet, x);
        phases.push({ t: "claw", title, pick: kind, balls, prize: short(v) + " G" });
        return { kind, x, do: () => phases.push({ t: "win", cells: [], win: v, text: `❓ MYSTERY BALL ${x}x` }) };
    }
    if (kind === "wheel") {
        const SEG = ["3x", "5x", "8x", "10x", "15x", "20x", "30x", "50x"], W = [26, 24, 18, 14, 9, 5, 3, 1];
        const idx = pickW(SEG.map((s, i) => [i, W[i]])); const x = +SEG[idx].slice(0, -1);
        phases.push({ t: "claw", title, pick: kind, balls, prize: "휠 돌리기!" });
        const spin = () => phases.push({ t: "wheel", seg: SEG, idx, title: "🎡 CLAW WHEEL 🎡" });
        return { kind, x, spin, do: () => { spin(); phases.push({ t: "win", cells: [], win: cash(cfg, bet, x), text: `🎡 CLAW WHEEL ${x}x` }); } };
    }
    if (kind === "jackpot") {
        const t = gate(cfg, pickW([["MINI", 50], ["MINOR", 30], ["MAXI", 14], ["MAJOR", 5], ["GRAND", 1]]), bet);
        phases.push({ t: "claw", title, pick: kind, balls, prize: t });
        return { kind, tier: t, do: () => phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) }) };
    }
    phases.push({ t: "claw", title, pick: kind, balls, prize: (cfg.features?.claw?.spins || 10) + " FREE" });
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
        const coin = coinMaker(cfg, bet, { vals: [[1, 30], [2, 25], [3, 15], [5, 12], [8, 6], [10, 4], [20, 1.5], [50, 0.3]], jp: 0.035, tw: { MINI: 60, MINOR: 30, MAXI: 8, MAJOR: 2 }, extra: [{ p: ctx.force === "hold:claw" ? 0.3 : 0.025, coin: { claw: true, special: true, sym: "ZW", label: "🦾❓", cls: "mult", v: 0 } }] });
        const hs = holdSpin(cfg, ctx, phases, {
            C: 5, Rn: 3, start: 6, coin, p: 0.075, sym: "ZC", title: "🟡 BALL HOLD & SPIN 🟡",
            onAdd: (board, added) => {
                // claws only arrive on respins (never in the starting coins) and EVERY claw that lands is played in turn
                const claws = added.filter(([c, r]) => board.get(key(c, r)).claw && !board.get(key(c, r)).done);
                if (!claws.length) return;
                phases.push({ t: "badge", cells: claws.map(([c, r], i) => ({ c, r, text: claws.length > 1 ? `🦾${i + 1}` : "🦾", cls: "jpb" })) });
                for (const [i, [c, r]] of claws.entries()) {
                    const cn = board.get(key(c, r)); cn.done = true;
                    const tag = claws.length > 1 ? `🦾 집게 ${i + 1} / ${claws.length}` : "🦾 집게";
                    phases.push({ t: "focus", cells: [[c, r]] });
                    const p = clawPick(cfg, ctx, phases, { noFree: true, title: `${tag} · ${c + 1}열 ${r + 1}행 집게가 공을 뽑는다!` });
                    if (p.kind === "jackpot") { cn.jp = p.tier; cn.label = "🦾 " + p.tier; cn.cls = "jpb"; }
                    else { if (p.kind === "wheel") p.spin(); cn.v = cash(cfg, bet, p.x); cn.label = "🦾 " + short(cn.v); cn.cls = "val"; }
                    phases.push({ t: "badge", cells: [{ c, r, text: cn.label, cls: cn.cls }] });
                }
            }
        });
        payBoard(cfg, ctx, phases, hs.board, { label: "🟡 BALL", full: hs.full });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}


// =====================================================================
// 🕊️ Cathedral of Wings — 24-shard rose window (6x4), clusters 5+ with cascades
// =====================================================================
const CATH_CENTER = [[2, 1], [3, 1], [2, 2], [3, 2]];
function biggestNear(cfg, g, lo = 3, hi = 4) {
    // largest cluster that is lo..hi big (a near-miss)
    const ev = clusterEval(cfg, g, 0, { min: lo });
    return ev.lines.filter(l => l.n <= hi).sort((a, b) => b.n - a.n)[0] || null;
}
function growCluster(g, cells, sym, need) {
    // add orthogonal neighbours of the cluster until it is `need` big
    const have = new Set(cells.map(([c, r]) => key(c, r))), out = [];
    for (let guard = 0; have.size < need && guard < 40; guard++) {
        const ring = [];
        for (const k of have) { const [c, r] = k.split(",").map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= g.length || y >= g[0].length || have.has(key(x, y)) || /^Z|^_$/.test(g[x][y])) continue; ring.push([x, y]); } }
        if (!ring.length) break;
        const [x, y] = ring[ri(ring.length)]; g[x][y] = sym; have.add(key(x, y)); out.push([x, y]);
    }
    return out;
}
function cathedral(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doBell = hit("bells"), doFlock = !doBell && hit("flock"), doHalo = !doBell && !doFlock && hit("halo"), doFeather = !doBell && !doFlock && !doHalo && hit("feather");
    let grid = draw(cfg, 6, 4);
    const kinds = [];
    if (doBell) inject(grid, "ZB", 3); else if (R() < 0.06) inject(grid, "ZB", 2, { avoid: c => c >= 4 });
    let haloSym = null;
    if (doHalo) { haloSym = pickW(payKeys(cfg).map(k => [k, k.startsWith("H") ? 2 : 1])); for (const [c, r] of CATH_CENTER) grid[c][r] = haloSym; growCluster(grid, CATH_CENTER, haloSym, 5 + ri(2)); }
    if (doFeather) { // build a 3-4 shard near-miss for the feathers to finish
        const s = pickW(payKeys(cfg).map(k => [k, 1])); const c0 = ri(6), r0 = ri(4); grid[c0][r0] = s; growCluster(grid, [[c0, r0]], s, 3 + ri(2));
    }
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZB"]), near: doBell ? null : nearMiss(grid, "ZB") }];
    endFeat();
    let five = 0;
    if (doFlock) {
        kinds.push("flock"); feat(cfg, "flock");
        phases.push({ t: "fx", name: "flock" });
        const n = 5 + ri(6), cells = shuffle(cellsAll(grid).filter(([c, r]) => plainSym(grid[c][r]))).slice(0, n);
        for (const [c, r] of cells) grid[c][r] = "W2";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🕊️ FLOCK SCATTER! 비둘기 떼가 ${cells.length}장의 유리를 x2 WILD로!` });
    }
    if (doHalo) {
        kinds.push("halo"); feat(cfg, "halo");
        phases.push({ t: "fx", name: "halo" });
        // golden sunbeams along 2 spokes through the centre medallion
        const SPOKES = [[0, 1, 2, 3, 4, 5].map(c => [c, 1]), [0, 1, 2, 3, 4, 5].map(c => [c, 2]), [0, 1, 2, 3].map(r => [2, r]), [0, 1, 2, 3].map(r => [3, r]), [[0, 0], [1, 0], [2, 1], [3, 2], [4, 3], [5, 3]], [[0, 3], [1, 3], [2, 2], [3, 1], [4, 0], [5, 0]]];
        const beams = shuffle(SPOKES).slice(0, 2).flat().filter(([c, r]) => grid[c][r] !== haloSym && !/^Z|^W/.test(grid[c][r]));
        for (const [c, r] of beams) grid[c][r] = haloSym;
        phases.push({ t: "morph", grid: clone(grid), cells: beams, fx: "gold", text: `😇 HALO RESONANCE! 햇살이 바퀴살을 따라 ${name(cfg, haloSym)} 복제!` });
    }
    if (doFeather) {
        const near = biggestNear(cfg, grid);
        if (near) {
            kinds.push("feather"); feat(cfg, "feather");
            phases.push({ t: "fx", name: "feather" });
            const add = growCluster(grid, near.cells.filter(([c, r]) => grid[c][r] === near.sym), near.sym, 5 + ri(3));
            phases.push({ t: "morph", grid: clone(grid), cells: add, fx: "evolve", text: `🪶 FEATHER DRIFT! 깃털이 내려앉아 ${name(cfg, near.sym)} 클러스터 완성!` });
        }
    }
    const cs = cascade(cfg, grid, bet, phases, { min: 5 });
    five += cs.five;
    if (doBell) {
        kinds.push("bells"); feat(cfg, "bells");
        const tw = F.bells.tw, keys = Object.keys(tw).filter(t => cfg.jp?.[t]);
        const tier = gate(cfg, pickW(keys.map(k => [k, tw[k]])), bet);
        phases.push({ t: "pick", f: matchPick(cfg, ctx, "🔔 BELL TOWER · 같은 스테인드글라스 3장을 맞춰라 🔔", "🔔", keys, tier) });
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin: cs.total, kinds, antic: phases[0].antic, five, lines: [] });
}
const plainSym = s => s && !/^Z|^W|^_$|^P$/.test(s);

// =====================================================================
// 🎩 The Velvet Table — 16 card slots (4x4, 256 ways)
// =====================================================================
function velvet(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doVip = hit("vip"), doAll = !doVip && hit("allin"), doCut = !doVip && hit("housecut");
    let grid = draw(cfg, 4, 4);
    const kinds = [];
    if (doVip) inject(grid, "ZV", 3); else if (R() < 0.06) inject(grid, "ZV", 2, { avoid: c => c >= 2 });
    if (doCut && !waysEval(cfg, grid, bet).win) grid = forceRun(cfg, grid, pickW(payKeys(cfg).map(k => [k, 1])), 3).grid;
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZV"]), near: doVip ? null : nearMiss(grid, "ZV") }];
    endFeat();
    if (doAll) {
        kinds.push("allin"); feat(cfg, "allin");
        phases.push({ t: "fx", name: "allin" });
        const cells = cellsAll(grid).filter(([c, r]) => /^L/.test(grid[c][r]));
        for (const [c, r] of cells) grid[c][r] = "H1";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "gold", text: `🧤 ALL-IN SWEEP! 칩 ${cells.length}개가 전부 골드바로!` });
    }
    const ev = waysEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev), five = ev.five;
    if (doCut && ev.win) {
        kinds.push("housecut"); feat(cfg, "housecut");
        phases.push({ t: "fx", name: "rake" });
        const pot = Math.round(ev.win * FSC);
        phases.push({ t: "clear", cells: ev.lines.flatMap(l => l.cells) });
        phases.push({ t: "win", cells: [], win: pot, text: `🪙 THE HOUSE CUT · 팟 x2 (${fmtN(ev.win)} → ${fmtN(ev.win + pot)})` });
        phases.push({ t: "banner", text: "🃏 FREE RE-DEAL 🃏", cls: "bonus" });
        const g2 = draw(cfg, 4, 4);
        phases.push({ t: "spin", grid: clone(g2) });
        const e2 = waysEval(cfg, g2, bet); five += e2.five;
        winP(phases, cfg, e2, "RE-DEAL → POT");
    }
    if (doVip) {
        kinds.push("vip"); feat(cfg, "vip");
        const tw = F.vip.tw, keys = Object.keys(tw).filter(t => cfg.jp?.[t]);
        const tier = gate(cfg, pickW(keys.map(k => [k, tw[k]])), bet);
        phases.push({ t: "pick", f: matchPick(cfg, ctx, "💎 VIP VAULT · 같은 칩 3개를 맞춰라 💎", "🎴", keys, tier) });
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}
const fmtN = v => v.toLocaleString("en-US");

// =====================================================================
// 🛸 Astro-Diner 5099 — 4-storey building, 20 windows (5x4, ways)
// =====================================================================
function astro(cfg, ctx) {
    const { bet } = ctx, { hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doGrav = hit("gravity"), doUfo = !doGrav && hit("ufo"), doMeteor = !doGrav && !doUfo && hit("meteor");
    let grid = draw(cfg, 5, 4);
    const kinds = [];
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    let mult = null;
    if (doGrav) {
        kinds.push("gravity"); feat(cfg, "gravity");
        phases.push({ t: "fx", name: "gravity" });
        // everything floats up; the top floor turns into Hover-Car wilds
        const cells = [];
        for (let c = 0; c < 5; c++) { const col = grid[c].filter(s => s !== "P"); while (col.length < 4) col.push(pickW(payKeys(cfg).map(k => [k, 1]))); grid[c] = col; grid[c][0] = "W"; cells.push([c, 0]); }
        if (R() < 0.35) { const c = ri(5); grid[c][1] = "W"; cells.push([c, 1]); }
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: "🌀 GRAVITY GLITCH! 꼭대기 층이 전부 HOVER-CAR WILD로!" });
    }
    if (doUfo) {
        kinds.push("ufo"); feat(cfg, "ufo");
        phases.push({ t: "fx", name: "ufo" });
        const n = R() < 0.3 ? 3 : 2, s = pickW(highKeys(cfg).map(k => [k, 1]));
        const c0 = 1 + ri(4 - n), r0 = ri(5 - n), cells = [];
        for (let c = c0; c < c0 + n; c++) for (let r = r0; r < r0 + n; r++) { grid[c][r] = s; cells.push([c, r]); }
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "gold", text: `🛸 UFO DELIVERY! ${n}x${n} 메가 ${name(cfg, s)} 전송!` });
    }
    if (doMeteor) {
        kinds.push("meteor"); feat(cfg, "meteor");
        phases.push({ t: "fx", name: "meteor" });
        const cells = shuffle(cellsAll(grid)).slice(0, 2 + ri(4)), M = new Map();
        for (const [c, r] of cells) M.set(key(c, r), pickW([[2, 55], [3, 30], [5, 15]]));
        mult = (c, r) => M.get(key(c, r)) || 1;
        phases.push({ t: "badge", cells: cells.map(([c, r]) => ({ c, r, text: "☄️x" + M.get(key(c, r)), cls: "mult" })) });
    }
    const ev = waysEval(cfg, grid, bet, { mult });
    const baseWin = winP(phases, cfg, ev);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🐸 Lilypad Leap — 19 pads in a 3-4-5-4-3 honeycomb (clusters 4+)
// =====================================================================
const LILY_BLANK = new Set(["0,0", "0,4", "1,4", "3,4", "4,0", "4,4"]);
const lilyBlank = g => { for (const k of LILY_BLANK) { const [c, r] = k.split(",").map(Number); g[c][r] = "_"; } return g; };
const lilyCells = () => cellsAll(Array.from({ length: 5 }, () => Array(5).fill(0))).filter(([c, r]) => !LILY_BLANK.has(key(c, r)));
function lilypad(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doTongue = hit("tongue"), doRipple = !doTongue && hit("ripple"), doTad = !doTongue && !doRipple && hit("tadpole");
    let grid = lilyBlank(draw(cfg, 5, 5));
    const kinds = [];
    const points = addPoints(grid);
    lilyBlank(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    if (doTongue) {
        kinds.push("tongue"); feat(cfg, "tongue");
        phases.push({ t: "fx", name: "tongue" });
        // beetles anywhere get snatched into one connected clump
        const start = [2, 1 + ri(3)]; grid[start[0]][start[1]] = "H1";
        const cells = [start, ...growCluster(grid, [start], "H1", 4 + ri(3))];
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "gold", text: `👅 TONGUE LASH! 황금 딱정벌레 ${cells.length}마리를 한데 끌어모았다!` });
    }
    if (doRipple) {
        kinds.push("ripple"); feat(cfg, "ripple");
        phases.push({ t: "fx", name: "ripple" });
        const s = pickW(payKeys(cfg).map(k => [k, k.startsWith("H") ? 1 : 2]));
        const cells = lilyCells().filter(([c, r]) => Math.abs(c - 2) <= 1 && Math.abs(r - 2) <= 1 + (R() < 0.3 ? 1 : 0));
        for (const [c, r] of cells) grid[c][r] = s;
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `💧 POND RIPPLE SYNC! 물결이 닿은 ${cells.length}개 잎이 ${name(cfg, s)}로!` });
    }
    const ev = clusterEval(cfg, grid, bet, { min: 4 });
    let baseWin = winP(phases, cfg, ev);
    if (doTad) {
        kinds.push("tadpole"); feat(cfg, "tadpole");
        phases.push({ t: "fx", name: "tadpole" });
        const cells = shuffle(lilyCells()).slice(0, 3 + ri(3));
        const vals = cells.map(() => {
            const x = R();
            if (x < 0.003) return { jp: down(cfg, "LOTUS") };
            if (x < 0.07) return { jp: gate(cfg, pickW([["MINI", 60], ["MINOR", 28], ["MAXI", 9], ["MAJOR", 3]]), bet) };
            return { v: cash(cfg, bet, pickW([[0.5, 25], [1, 28], [2, 22], [3, 12], [5, 8], [10, 4], [25, 1]])) };
        });
        for (const [c, r] of cells) grid[c][r] = "ZL";
        phases.push({ t: "land", grid: clone(grid), cells, roll: true });
        phases.push({ t: "badge", cells: cells.map(([c, r], i) => ({ c, r, text: vals[i].jp || short(vals[i].v), cls: vals[i].jp ? "jpb" : "val" })) });
        const sum = vals.reduce((s, x) => s + (x.v || 0), 0);
        if (sum) { phases.push({ t: "win", cells, win: sum, text: `🪷 TADPOLE SWARM · 연꽃 ${cells.length}송이 즉시 상금` }); baseWin += sum; }
        for (const x of vals) if (x.jp) phases.push({ t: "jp", tier: x.jp, amount: jpv(cfg, ctx, x.jp) });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🚕 Gridlock Rush Hour — 4-way intersection, 4x4 ways
// =====================================================================
function gridlock(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doBadge = hit("badge"), doGreen = !doBadge && hit("green"), doSub = !doBadge && !doGreen && hit("subway"), doHeli = !doBadge && !doGreen && !doSub && hit("heli");
    let grid = draw(cfg, 4, 4);
    const kinds = [];
    if (doBadge) inject(grid, "ZP", 3); else if (R() < 0.06) inject(grid, "ZP", 2, { avoid: c => c >= 2 });
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZP"]), near: doBadge ? null : nearMiss(grid, "ZP") }];
    endFeat();
    let mult = null, five = 0;
    if (doGreen) {
        kinds.push("green"); feat(cfg, "green");
        phases.push({ t: "fx", name: "green" });
        // stalled civilian cars leave, an armoured-truck convoy drives straight through one lane
        const civ = cellsAll(grid).filter(([c, r]) => /^L/.test(grid[c][r]));
        for (const [c, r] of civ) grid[c][r] = pickW(highKeys(cfg).map(k => [k, 1]));
        const lane = ri(4), conv = [0, 1, 2, 3].map(c => [c, lane]);
        for (const [c, r] of conv) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells: [...civ, ...conv], fx: "wild", text: `🚦 GREEN LIGHT EXPRESS! 민간 차량 ${civ.length}대 정리 · 현금수송차 WILD 행렬 통과!` });
    }
    if (doSub) {
        kinds.push("subway"); feat(cfg, "subway");
        phases.push({ t: "fx", name: "subway" });
        const cells = shuffle(cellsAll(grid)).slice(0, 2 + ri(4)), M = new Map();
        for (const [c, r] of cells) M.set(key(c, r), pickW([[2, 55], [3, 30], [4, 15]]));
        mult = (c, r) => M.get(key(c, r)) || 1;
        phases.push({ t: "badge", cells: cells.map(([c, r]) => ({ c, r, text: "🕳️x" + M.get(key(c, r)), cls: "mult" })) });
    }
    const ev = waysEval(cfg, grid, bet, { mult });
    let baseWin = winP(phases, cfg, ev); five += ev.five;
    if (doHeli) {
        kinds.push("heli"); feat(cfg, "heli");
        phases.push({ t: "fx", name: "heli" });
        const n = R() < 0.25 ? 3 : 2, c0 = ri(5 - n), r0 = ri(5 - n), lock = new Set();
        // the beam lands on a paying symbol and the lit squares share it
        const s = pickW(highKeys(cfg).map(k => [k, 1]));
        for (let c = c0; c < c0 + n; c++) for (let r = r0; r < r0 + n; r++) { lock.add(key(c, r)); if (R() < 0.6) grid[c][r] = s; }
        phases.push({ t: "badge", cells: [...lock].map(k => { const [c, r] = k.split(",").map(Number); return { c, r, text: "🔦", cls: "mult" }; }) });
        phases.push({ t: "show", grid: clone(grid), pop: [...lock].map(k => k.split(",").map(Number)) });
        phases.push({ t: "banner", text: "🚁 HELICOPTER SPOTLIGHT · FREE RESPIN 🚁", cls: "bonus" });
        const g2 = draw(cfg, 4, 4);
        for (const k of lock) { const [c, r] = k.split(",").map(Number); g2[c][r] = grid[c][r]; }
        const rolled = cellsAll(g2).filter(([c, r]) => !lock.has(key(c, r)));
        phases.push({ t: "land", grid: clone(g2), cells: rolled, roll: true });
        const e2 = waysEval(cfg, g2, bet); five += e2.five;
        winP(phases, cfg, e2, "🚁 TRAFFIC WAVE");
    }
    if (doBadge) {
        kinds.push("badge"); feat(cfg, "badge");
        const tw = F.badge.tw, keys = Object.keys(tw).filter(t => cfg.jp?.[t]);
        const tier = gate(cfg, pickW(keys.map(k => [k, tw[k]])), bet);
        phases.push({ t: "pick", f: matchPick(cfg, ctx, "🚔 PRECINCT JACKPOT · 같은 배지 3개를 맞춰라 🚔", "🚔", keys, tier) });
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}
// =====================================================================
// shared by the round-6 machines: a bonus may end in a jackpot (tw = tier weights)
const jpRoll = (cfg, ctx, phases, tw, text) => {
    const keys = Object.keys(tw).filter(t => cfg.jp?.[t]);
    if (!keys.length) return;
    const t = gate(cfg, pickW(keys.map(k => [k, tw[k]])), ctx.bet);
    if (text) phases.push({ t: "banner", text, cls: "jackpot" });
    phases.push({ t: "jp", tier: t, amount: jpv(cfg, ctx, t) });
};
const cellsOf = (g, test) => { const out = []; g.forEach((col, c) => col.forEach((x, r) => { if (test(x, c, r)) out.push([c, r]); })); return out; };

// =====================================================================
// ⛵ Rotate The Helm! — 5x3 ways on a rainy sea, two ships (GROW REELS / GROW CASH)
// =====================================================================
function growRun(cfg, ctx, phases, { reels, sticky }) {
    const bet = ctx.bet, label = reels && sticky ? "⛵⛵ GROW REELS & GROW CASH" : reels ? "⛵ GROW REELS" : "⛵ GROW CASH";
    let total = 0, five = 0;
    const stick = new Set(); // "c,b" (b = rows counted from the bottom, so the board can grow upward)
    phases.push({ t: "banner", text: `${label} · 5 FREE SPINS`, cls: "bonus" });
    phases.push({ t: "mode", add: "grow-mode" });
    for (let i = 0; i < 5; i++) {
        const rows = reels ? 4 + i : 3;
        phases.push({ t: "hud", text: `${label} ${i + 1} / 5${reels ? ` · ${rows} ROWS` : ""}${sticky ? ` · 📌 ${stick.size} WILD` : ""}` });
        if (reels) phases.push({ t: "rows", n: rows });
        const g = draw(cfg, 5, rows, sticky ? { W: [0, 1.9, 1.9, 1.9, 1.9] } : {});
        const frozen = [];
        for (const k of stick) { const [c, b] = k.split(",").map(Number); const r = rows - 1 - b; if (r >= 0) { g[c][r] = "W"; frozen.push([c, r]); } }
        phases.push({ t: "spin", grid: clone(g), frozen });
        if (sticky) {
            const nw = cellsOf(g, (x, c, r) => isW(x) && !stick.has(key(c, rows - 1 - r)));
            for (const [c, r] of nw) stick.add(key(c, rows - 1 - r));
            if (nw.length) phases.push({ t: "morph", grid: clone(g), cells: nw, fx: "wild", text: `📌 STICKY WILD +${nw.length} · 총 ${stick.size}개가 끝까지 남는다!` });
        }
        const e = waysEval(cfg, g, bet); total += winP(phases, cfg, e, label); five += e.five;
    }
    phases.push({ t: "hud", text: "" });
    phases.push({ t: "mode", remove: "grow-mode" });
    if (reels) phases.push({ t: "rows", n: 3 });
    return { total, five };
}
function helm(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    state.sailR ??= 0; state.sailC ??= 0;
    const doWreck = hit("shipwreck"), doBoth = !doWreck && hit("growboth"), doGR = !doWreck && !doBoth && hit("growreels"),
        doGC = !doWreck && !doBoth && !doGR && hit("growcash"), doFree = !doWreck && !doBoth && !doGR && !doGC && hit("free");
    const grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doFree) inject(grid, "ZH", 3); else if (R() < 0.07) inject(grid, "ZH", 2, { avoid: c => c >= 3 });
    const sail = doGR || doGC || doBoth || R() < 0.2;
    if (sail) inject(grid, "ZS", 1);
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["ZH"]), near: doFree ? null : nearMiss(grid, "ZH") }];
    endFeat();
    const ev = waysEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev), five = ev.five;
    const MAX = 10;
    if (sail) {
        // the sail icon is thrown to the ships: their sails go up slowly; a full sail makes the ship rock and burst
        phases.push({ t: "fx", name: "sail" });
        if (doGR || doBoth) state.sailR = MAX;
        if (doGC || doBoth) state.sailC = MAX;
        if (!doGR && !doGC && !doBoth) { const k = R() < 0.5 ? "sailR" : "sailC"; state[k] = Math.min(MAX - 1, state[k] + 1 + ri(2)); }
        meter(phases, "sailR", state.sailR, MAX); meter(phases, "sailC", state.sailC, MAX);
    }
    const grow = (reels, sticky) => {
        const k = reels && sticky ? "growboth" : reels ? "growreels" : "growcash";
        kinds.push(k); const prev = FSC; feat(cfg, k);
        if (reels) state.sailR = MAX; if (sticky) state.sailC = MAX;
        meter(phases, "sailR", state.sailR, MAX); meter(phases, "sailC", state.sailC, MAX);
        phases.push({ t: "fx", name: "shipgo" });
        const r = growRun(cfg, ctx, phases, { reels, sticky }); five += r.five;
        FSC = prev;
        if (reels) state.sailR = 0; if (sticky) state.sailC = 0;
        meter(phases, "sailR", state.sailR, MAX); meter(phases, "sailC", state.sailC, MAX);
    };
    if (doBoth) grow(true, true); else if (doGR) grow(true, false); else if (doGC) grow(false, true);
    if (doFree) {
        kinds.push("free"); feat(cfg, "free");
        const fr = freeLoop(cfg, ctx, phases, {
            n: F.free.spins || 8, title: "☸️ HELM x3 · 8 FREE SPINS ☸️",
            drawFn: () => draw(cfg, 5, 3), evalFn: g => waysEval(cfg, g, bet),
            after: () => { if (R() < (F.free.grow || 0.12)) { const w = pickW([["R", 45], ["C", 40], ["B", 15]]); grow(w !== "C", w !== "R"); feat(cfg, "free"); } return 0; }
        });
        five += fr.five;
    }
    if (doWreck) {
        kinds.push("shipwreck"); feat(cfg, "shipwreck");
        phases.push({ t: "fx", name: "flood" });
        const tw = F.shipwreck.tw, keys = Object.keys(tw).filter(t => cfg.jp?.[t]);
        const tier = gate(cfg, pickW(keys.map(k => [k, tw[k]])), bet);
        const rest = shuffle(keys.filter(t => t !== tier)).slice(0, 2);
        phases.push(pickn({ title: "🐚 SHIPWRECK! 물이 차오른다 · 조가비 3개 중 하나를 골라라!", icon: "🐚", n: 3, k: 1, reveals: [{ text: tier, cls: "jp" }], rest: rest.map(t => ({ text: t })) }));
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🧱 Smash The Bricks — no reels: a 5x3 brick wall hides 2x2 prize plates (JACKPOT / cash / multiply)
// =====================================================================
const BRICK_PAIRS = [[0, 2], [0, 3], [1, 3]];
function brickTile(kind = pickW([["cash", 64], ["mult", 31], ["jp", 5]])) {
    if (kind === "cash") return { kind, v: pickW([[1000, 26], [2000, 22], [3000, 16], [4000, 11], [5000, 9], [6000, 6], [7000, 4], [8000, 3], [9000, 2], [10000, 1]]) };
    if (kind === "mult") return { kind, x: pickW([[2, 28], [3, 22], [4, 15], [5, 12], [6, 8], [7, 6], [8, 4], [9, 3], [10, 2]]) };
    return { kind: "jp" };
}
function newWall(want = null) {
    const pr = BRICK_PAIRS[ri(BRICK_PAIRS.length)];
    const tiles = pr.map(c0 => ({ c0, r0: ri(2), ...brickTile(), paid: false }));
    if (want) Object.assign(tiles[ri(2)], brickTile(want));
    return { bricks: Array(15).fill(1), tiles };
}
const tileCells = t => [[t.c0, t.r0], [t.c0 + 1, t.r0], [t.c0, t.r0 + 1], [t.c0 + 1, t.r0 + 1]];
function wallView(cfg, wall, bet) {
    const g = Array.from({ length: 5 }, () => Array(3).fill("Y")), badges = [];
    const L = { jp: "ZJ", cash: "ZC", mult: "ZM" };
    for (const t of wall.tiles) {
        const text = t.kind === "jp" ? "JACKPOT" : t.kind === "cash" ? fmtN(Math.round(t.v * bet / cfg.bets[0])) + "G" : "x" + t.x;
        tileCells(t).forEach(([c, r], q) => { g[c][r] = L[t.kind] + q; badges.push({ c, r, text, cls: "tile" + (t.paid ? ".paid" : "") }); });
    }
    for (let i = 0; i < 15; i++) if (wall.bricks[i]) g[i % 5][Math.floor(i / 5)] = "ZB";
    return { g, badges: badges.filter(b => g[b.c][b.r] !== "ZB") };
}
function bricks(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doAll = hit("smashall"), want = doAll ? null : hit("jp") ? "jp" : hit("cash") ? "cash" : hit("mult") ? "mult" : null;
    const doTile = !doAll && (want || hit("tile"));
    let wall = state.wall?.bricks?.length === 15 ? state.wall : newWall();
    const phases = [], kinds = [];
    const idx = (c, r) => r * 5 + c;
    const push = (pop = []) => { const v = wallView(cfg, wall, bet); phases.push({ t: "show", grid: v.g, pop }); phases.push({ t: "badge", cells: v.badges }); return v.g; };
    let before = wallView(cfg, wall, bet).g;
    const points = addPoints(before); // P icons only ever sit on rubble
    phases.push({ t: "show", grid: before, pop: [] }, { t: "badge", cells: wallView(cfg, wall, bet).badges });
    let target = null;
    if (doTile) {
        target = wall.tiles.find(t => !t.paid && (!want || t.kind === want));
        if (!target) { // the wanted plate is not on this wall → a fresh wall drops in
            wall = newWall(want); phases.push({ t: "fx", name: "rebuild" }); push();
            target = wall.tiles.find(t => !want || t.kind === want);
        }
    }
    const guard = new Set(); // bricks that must stay so no plate is finished by accident
    for (const t of wall.tiles) if (!t.paid && t !== target) { const left = tileCells(t).filter(([c, r]) => wall.bricks[idx(c, r)]); if (left.length) guard.add(idx(...left[ri(left.length)])); }
    let broken = [];
    if (doAll) broken = wall.bricks.map((b, i) => b ? i : -1).filter(i => i >= 0);
    else {
        if (target) broken = tileCells(target).map(([c, r]) => idx(c, r)).filter(i => wall.bricks[i]);
        const free = shuffle(wall.bricks.map((b, i) => b && !guard.has(i) && !broken.includes(i) && !(target && tileCells(target).some(([c, r]) => idx(c, r) === i)) ? i : -1).filter(i => i >= 0));
        // a plate's own last brick may only go when that plate is the one being won
        const safe = free.filter(i => !wall.tiles.some(t => !t.paid && t !== target && tileCells(t).filter(([c, r]) => wall.bricks[idx(c, r)] && idx(c, r) !== i).length === 0));
        broken.push(...safe.slice(0, target ? ri(2) : 1 + (R() < 0.4 ? 1 : 0) + (R() < 0.15 ? 1 : 0)));
    }
    phases.push({ t: "fx", name: doAll ? "smashall" : "hammer" });
    if (broken.length) phases.push({ t: "clear", cells: broken.map(i => [i % 5, Math.floor(i / 5)]) });
    else phases.push({ t: "hud", text: "🔨 쾅! 벽돌에 금만 갔다…" });
    for (const i of broken) wall.bricks[i] = 0;
    const grid = push(broken.map(i => [i % 5, Math.floor(i / 5)]));
    let baseWin = 0;
    // every plate whose 4 bricks are all gone pays at once
    for (const t of wall.tiles) {
        if (t.paid || tileCells(t).some(([c, r]) => wall.bricks[idx(c, r)])) continue;
        t.paid = true;
        const cells = tileCells(t);
        if (t.kind === "jp") { kinds.push("jp"); jpRoll(cfg, ctx, phases, F.jp.tw, "🔨 JACKPOT 타일 완전 공개!"); }
        else {
            kinds.push(t.kind);
            const win = t.kind === "cash" ? Math.round(t.v * bet / cfg.bets[0]) : Math.round(t.x * bet); // exactly what the plate shows
            phases.push({ t: "win", cells, win, text: t.kind === "cash" ? `🧱 CASH PLATE ${fmtN(win)}G` : `🧱 MULTIPLY x${t.x}` });
            baseWin += win;
        }
    }
    if (doAll) kinds.unshift("smashall");
    if (!kinds.length && wall.tiles.some(t => !t.paid && tileCells(t).filter(([c, r]) => wall.bricks[idx(c, r)]).length === 1)) phases.push({ t: "tease" });
    // all plates collected (or all bricks gone) → the leftovers crumble and a new wall with new prizes goes up
    if (wall.tiles.every(t => t.paid) || wall.bricks.every(b => !b)) {
        const rest = wall.bricks.map((b, i) => b ? i : -1).filter(i => i >= 0);
        if (rest.length) phases.push({ t: "clear", cells: rest.map(i => [i % 5, Math.floor(i / 5)]) });
        wall = newWall(); phases.push({ t: "fx", name: "rebuild" }); push();
    }
    phases.push({ t: "hud", text: "" });
    state.wall = wall;
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five: 0, lines: [] });
}

// =====================================================================
// 🍒 Classic Mania — 3x3 classic fruit machine, 3 paylines
// =====================================================================
function classicEval(cfg, g, bet, { mult = null } = {}) {
    const lines = []; let total = 0;
    for (let r = 0; r < 3; r++) {
        const row = [0, 1, 2].map(c => g[c][r]);
        const s = row.find(x => !isW(x)) || null;
        if (!s || !cfg.syms[s]?.pay || !row.every(x => x === s || isW(x))) continue;
        let m = 1; for (let c = 0; c < 3; c++) m = Math.max(m, mult ? mult(c, r) || 1 : 1);
        const p = Math.round(cfg.syms[s].pay[0] * bet * (cfg.px || 1) * m * FSC);
        lines.push({ sym: s, n: 3, ways: 1, mult: m, win: p, cells: [0, 1, 2].map(c => [c, r]) }); total += p;
    }
    return { win: total, lines, five: 0 };
}
function classic(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doCherry = hit("cherry"), doClover = !doCherry && hit("clover"), doSticky = !doCherry && !doClover && hit("sticky"),
        doFree = !doCherry && !doClover && !doSticky && hit("free"), doSeven = !doCherry && !doClover && !doSticky && !doFree && hit("seven");
    const grid = draw(cfg, 3, 3);
    const kinds = [];
    const put = s => { for (let c = 0; c < 3; c++) grid[c][ri(3)] = s; };
    if (doCherry) put("ZC"); else if (doClover) put("ZL"); else if (doSticky) put("ZK"); else if (doFree) put("ZF");
    else if (R() < 0.12) { const s = pickW([["ZC", 2], ["ZL", 3], ["ZF", 3], ["ZK", 3]]); grid[0][ri(3)] = s; grid[1][ri(3)] = s; } // near miss
    if (doSeven) { const r = ri(3); for (let c = 0; c < 3; c++) grid[c][r] = "ZS"; }
    // no accidental 7-7-7 / triple bonus icons without the feature
    for (let r = 0; r < 3; r++) if (!doSeven && [0, 1, 2].every(c => grid[c][r] === "ZS")) grid[2][r] = "L1";
    for (const s of ["ZC", "ZL", "ZK", "ZF"]) if (count(grid, s) >= 3 && !({ ZC: doCherry, ZL: doClover, ZK: doSticky, ZF: doFree })[s]) { const cs = cellsOf(grid, x => x === s); grid[cs[2][0]][cs[2][1]] = "L2"; }
    const points = addPoints(grid);
    const bonusSyms = ["ZC", "ZL", "ZK", "ZF"];
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, bonusSyms), near: kinds.length ? null : bonusSyms.find(s => count(grid, s) === 2) || null }];
    endFeat();
    const ev = classicEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev);
    const sevens = [0, 1, 2].filter(r => [0, 1, 2].every(c => grid[c][r] === "ZS"));
    for (const r of sevens) {
        kinds.push("seven");
        phases.push({ t: "fx", name: "seven" });
        phases.push({ t: "win", cells: [0, 1, 2].map(c => [c, r]), win: bet * 7, text: "7️⃣7️⃣7️⃣ LUCKY SEVENS · 베팅 x7!" });
    }
    const pickX = (title, icon, table) => {
        const x = pickW(table), others = shuffle(table.map(t => t[0]).filter(v => v !== x)).slice(0, 2);
        phases.push(pickn({ title, icon, n: 3, k: 1, reveals: [{ text: "x" + x, cls: "ok" }], rest: others.map(v => ({ text: "x" + v })) }));
        phases.push({ t: "win", cells: [], win: bet * x, text: `${icon} PICK · 베팅 x${x}` });
    };
    if (doClover) { kinds.push("clover"); phases.push({ t: "banner", text: "🍀 LUCKY CLOVER PICK 🍀", cls: "bonus" }); pickX("🍀 네잎클로버 3개 중 하나를 골라라! (x3~x10)", "🍀", [[3, 30], [4, 24], [5, 18], [6, 12], [7, 7], [8, 4], [9, 3], [10, 2]]); }
    if (doCherry) { kinds.push("cherry"); phases.push({ t: "banner", text: "🍒 SUPER CHERRY PICK 🍒", cls: "jackpot" }); pickX("🍒 체리 3개 중 하나를 골라라! (x30~x100)", "🍒", [[30, 34], [40, 24], [50, 16], [60, 10], [70, 7], [80, 4], [90, 3], [100, 2]]); }
    let five = 0;
    if (doFree) {
        kinds.push("free"); feat(cfg, "free");
        const fr = freeLoop(cfg, ctx, phases, { n: F.free.spins || 8, title: "🎰 FREE BONUS x3 · 8 FREE SPINS 🎰", drawFn: () => draw(cfg, 3, 3), evalFn: g => classicEval(cfg, g, bet) });
        five += fr.five;
    }
    if (doSticky) {
        kinds.push("sticky"); feat(cfg, "sticky");
        const held = new Set();
        freeLoop(cfg, ctx, phases, {
            n: 3, title: "📌 STICKY WILD · 3 FREE SPINS 📌", mode: "free-mode",
            drawFn: () => { const g = draw(cfg, 3, 3, { W: 2.4 }); const frozen = []; for (const k of held) { const [c, r] = k.split(",").map(Number); g[c][r] = "W"; frozen.push([c, r]); } return { grid: g, frozen }; },
            evalFn: g => { for (const [c, r] of cellsOf(g, isW)) held.add(key(c, r)); return classicEval(cfg, g, bet); }
        });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🗝️ The Mimic's Labyrinth — 25 stone pressure plates (5x5 diamond), clusters 5+
// =====================================================================
function mimic(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doKey = hit("dkey"), doSpike = !doKey && hit("spike"), doMimic = !doKey && !doSpike && hit("mimic"), doTorch = !doKey && !doSpike && !doMimic && hit("torch");
    let grid = draw(cfg, 5, 5);
    const kinds = [];
    if (doKey) grid[2][2] = "ZK";
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    let five = 0, baseWin = 0;
    if (doSpike) {
        kinds.push("spike"); feat(cfg, "spike");
        phases.push({ t: "fx", name: "spike" });
        const runes = cellsOf(grid, x => /^L/.test(x));
        phases.push({ t: "clear", cells: runes });
        refill(cfg, grid, new Set(runes.map(([c, r]) => key(c, r))), { L1: 0, L2: 0, L3: 0, L4: 0 });
        phases.push({ t: "drop", grid: clone(grid) });
        phases.push({ t: "hud", text: `🗡️ 룬 타일 ${runes.length}장 파괴 · 보물 타일이 굴러 내려왔다!` });
    }
    if (doTorch) {
        kinds.push("torch"); feat(cfg, "torch");
        phases.push({ t: "fx", name: "torch" });
        const s = pickW(highKeys(cfg).map(k => [k, 1]));
        const ring = cellsAll(grid).filter(([c, r]) => c === 0 || r === 0 || c === 4 || r === 4);
        for (const [c, r] of ring) grid[c][r] = s;
        phases.push({ t: "morph", grid: clone(grid), cells: ring, fx: "gold", text: `🔥 TORCHLIGHT EXPANSION! 푸른 용의 불꽃 — 테두리 16장이 모두 ${name(cfg, s)}!` });
    }
    let held = [];
    if (doMimic) {
        kinds.push("mimic"); feat(cfg, "mimic");
        const c0 = 1 + ri(3), r0 = 1 + ri(3);
        grid[c0][r0] = "ZM";
        phases.push({ t: "show", grid: clone(grid), pop: [[c0, r0]] });
        phases.push({ t: "fx", name: "mimic" });
        const chomp = cellsAll(grid).filter(([c, r]) => Math.abs(c - c0) <= 1 && Math.abs(r - r0) <= 1 && !(c === c0 && r === r0) && !/^H/.test(grid[c][r]));
        const spit = shuffle(cellsAll(grid).filter(([c, r]) => Math.abs(c - c0) > 1 || Math.abs(r - r0) > 1)).slice(0, 2 + ri(3));
        held = [...chomp, ...spit];
        for (const [c, r] of held) grid[c][r] = "W";
        grid[c0][r0] = "W2"; held.push([c0, r0]);
        phases.push({ t: "morph", grid: clone(grid), cells: held, fx: "wild", text: `🧰 MIMIC AMBUSH! 미믹이 ${chomp.length}장을 씹어먹고 STICKY WILD 코인 ${held.length}개를 뱉었다!` });
    }
    const cs = cascade(cfg, grid, bet, phases, { min: 5, max: 6 });
    baseWin += cs.total; five += cs.five;
    if (doMimic) {
        // the wild coins stick for one more press of the plates
        phases.push({ t: "banner", text: "🪙 STICKY WILD COIN RESPIN 🪙", cls: "bonus" });
        const g2 = draw(cfg, 5, 5);
        for (const [c, r] of held) g2[c][r] = r === held[held.length - 1][1] && c === held[held.length - 1][0] ? "W2" : "W";
        phases.push({ t: "spin", grid: clone(g2), frozen: held });
        const e2 = clusterEval(cfg, g2, bet, { min: 5 }); winP(phases, cfg, e2, "🧰 MIMIC RESPIN"); five += e2.five;
    }
    if (doKey) {
        kinds.push("dkey"); feat(cfg, "dkey");
        phases.push({ t: "fx", name: "dkey" });
        const tw = F.dkey.tw, keys = Object.keys(tw).filter(t => cfg.jp?.[t]);
        const tier = gate(cfg, pickW(keys.map(k => [k, tw[k]])), bet);
        const rest = shuffle(keys.filter(t => t !== tier)).slice(0, 3);
        phases.push(pickn({ title: "🗝️ DUNGEON KEY · 철창 4개 중 하나를 열어 유물을 찾아라!", icon: "⛓️", n: 4, k: 1, reveals: [{ text: tier + " RELIC", cls: "jp" }], rest: rest.map(t => ({ text: t + " RELIC" })) }));
        phases.push({ t: "jp", tier, amount: jpv(cfg, ctx, tier) });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five, lines: [] });
}

// =====================================================================
// 📡 Abyssal Trench — bathysphere sonar screen, 5x3 ways
// =====================================================================
const TIER_UP = ["L4", "L3", "L2", "L1", "H4", "H3", "H2", "H1"];
function abyss(cfg, ctx) {
    const { bet } = ctx, { hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doSonar = hit("sonar"), doLev = !doSonar && hit("leviathan"), doVent = !doSonar && !doLev && hit("vent");
    const grid = draw(cfg, 5, 3);
    const kinds = [];
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    if (doLev) {
        kinds.push("leviathan"); feat(cfg, "leviathan");
        phases.push({ t: "fx", name: "leviathan" });
        const cols = shuffle([1, 2, 3]).slice(0, pickW([[1, 55], [2, 35], [3, 10]]));
        const cells = cols.flatMap(c => [0, 1, 2].map(r => [c, r]));
        for (const [c, r] of cells) grid[c][r] = "W3";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🐉 LEVIATHAN WAKE! 바다뱀이 지나간 자리에 x3 EXPANDING EEL WILD ${cols.length}줄!` });
    }
    if (doVent) {
        kinds.push("vent"); feat(cfg, "vent");
        phases.push({ t: "fx", name: "vent" });
        const cols = shuffle([0, 1, 2, 3, 4]).slice(0, 2 + ri(2)), cells = [];
        for (const c of cols) { // bubbles rise: each icon goes up a row and up a pay tier
            const up = grid[c].map(s => { const i = TIER_UP.indexOf(s); return i >= 0 ? TIER_UP[Math.min(TIER_UP.length - 1, i + 1 + (R() < 0.25 ? 1 : 0))] : s; });
            grid[c] = [...up.slice(1), up[0]];
            for (let r = 0; r < 3; r++) cells.push([c, r]);
        }
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "evolve", text: `🫧 THERMAL VENT ERUPTION! 뜨거운 거품이 ${cols.length}줄을 밀어올리며 심볼 업그레이드!` });
    }
    const ev = waysEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev);
    if (doSonar) {
        kinds.push("sonar"); feat(cfg, "sonar");
        phases.push({ t: "fx", name: "sonar" });
        const cells = shuffle(cellsAll(grid)).slice(0, 2 + ri(4));
        const xs = cells.map(() => pickW([[2, 34], [3, 24], [5, 18], [8, 10], [10, 8], [20, 4], [50, 2]]));
        phases.push({ t: "badge", cells: cells.map(([c, r], i) => ({ c, r, text: "🧰x" + xs[i], cls: "mult" })) });
        const win = xs.reduce((s, x) => s + cash(cfg, bet, x), 0);
        phases.push({ t: "win", cells, win, text: `📡 CLOAKED TREASURE CHEST ${cells.length}개 · 즉시 배수 상금` });
        baseWin += win;
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🧊 Glacier Fracture — a frozen lake cracked into 18 ice floes (6x3 ways)
// =====================================================================
function glacier(cfg, ctx) {
    const { bet } = ctx, { hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doFreeze = hit("freeze"), doAurora = !doFreeze && hit("aurora");
    let grid = draw(cfg, 6, 3);
    if (doFreeze && !waysEval(cfg, grid, bet).win) grid = forceRun(cfg, grid, pickW(payKeys(cfg).map(k => [k, 1])), 3).grid;
    const kinds = [];
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }, { t: "fx", name: "frost" }];
    endFeat();
    if (doAurora) {
        kinds.push("aurora"); feat(cfg, "aurora");
        phases.push({ t: "fx", name: "aurora" });
        const cells = shuffle(cellsAll(grid)).slice(0, 6 + ri(5));
        for (const [c, r] of cells) grid[c][r] = "H1";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "gold", text: `🌌 AURORA BOREALIS! 오로라가 얼음 ${cells.length}조각을 ${name(cfg, "H1")}로 동기화!` });
    }
    const ev = waysEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev), five = ev.five;
    if (doFreeze && ev.win) {
        kinds.push("freeze"); feat(cfg, "freeze");
        phases.push({ t: "fx", name: "freeze" });
        const frozen = new Set(ev.lines.flatMap(l => l.cells.map(([c, r]) => key(c, r))));
        const fz = [...frozen].map(k => k.split(",").map(Number));
        phases.push({ t: "badge", cells: fz.map(([c, r]) => ({ c, r, text: "🧊x2", cls: "mult" })) });
        const smash = cellsAll(grid).filter(([c, r]) => !frozen.has(key(c, r)));
        phases.push({ t: "clear", cells: smash });
        phases.push({ t: "banner", text: "🌬️ FLASH FREEZE · FREE REFILL SPIN 🌬️", cls: "bonus" });
        const g2 = draw(cfg, 6, 3);
        for (const [c, r] of fz) g2[c][r] = grid[c][r];
        phases.push({ t: "land", grid: clone(g2), cells: smash, roll: true });
        phases.push({ t: "badge", cells: fz.map(([c, r]) => ({ c, r, text: "🧊x2", cls: "mult" })) });
        const e2 = waysEval(cfg, g2, bet, { mult: (c, r) => frozen.has(key(c, r)) ? 2 : 1 }); five += e2.five;
        winP(phases, cfg, e2, "🧊 FROST x2");
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five, lines: ev.lines });
}

// =====================================================================
// 🧊 Schrödinger's Quantum Cube — 3x3 front face, 5 lines (3 rows + 2 diagonals)
// =====================================================================
const QLINES = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
function cubeEval(cfg, g, bet) {
    const lines = []; let total = 0;
    for (const L of QLINES) {
        const row = L.map((r, c) => g[c][r]);
        const s = row.find(x => !isW(x));
        if (!s || !cfg.syms[s]?.pay || !row.every(x => x === s || isW(x))) continue;
        const m = row.reduce((a, x) => a * (isW(x) ? wm(x) : 1), 1);
        const p = Math.round(cfg.syms[s].pay[0] * bet * (cfg.px || 1) * m * FSC);
        lines.push({ sym: s, n: 3, ways: 1, mult: m, win: p, cells: L.map((r, c) => [c, r]) }); total += p;
    }
    return { win: total, lines, five: 0 };
}
function quantum(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doSup = hit("superpose"), doPar = !doSup && hit("parallel"), doBut = !doSup && !doPar && hit("butterfly");
    const grid = draw(cfg, 3, 3);
    const kinds = [];
    const points = addPoints(grid);
    const phases = [];
    if (doSup) {
        // before the cube stops, 4~6 facets flicker between two high icons and collapse into the best result
        kinds.push("superpose"); feat(cfg, "superpose");
        const [a, b] = shuffle(highKeys(cfg)).slice(0, 2), cells = shuffle(cellsAll(grid)).slice(0, 4 + ri(3));
        let best = null;
        for (let mask = 0; mask < 1 << cells.length; mask++) {
            const g = clone(grid); cells.forEach(([c, r], i) => { g[c][r] = mask >> i & 1 ? b : a; });
            const e = cubeEval(cfg, g, bet); if (!best || e.win > best.e.win) best = { g, e };
        }
        phases.push({ t: "spin", grid: clone(grid), antic: [] });
        phases.push({ t: "fx", name: "superpose" });
        for (let k = 0; k < 3; k++) { const g = clone(grid); cells.forEach(([c, r]) => { g[c][r] = (k + c + r) % 2 ? a : b; }); phases.push({ t: "show", grid: g, pop: cells, ms: 220 }); }
        for (let c = 0; c < 3; c++) grid[c] = best.g[c];
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "evolve", text: `⚛️ SUPERPOSITION COLLAPSE! ${name(cfg, a)} ⇄ ${name(cfg, b)} → 최고 배당으로 붕괴!` });
    } else phases.push({ t: "spin", grid: clone(grid), antic: [] });
    endFeat();
    if (doBut) {
        kinds.push("butterfly"); feat(cfg, "butterfly");
        phases.push({ t: "fx", name: "butterfly" });
        const [c0, r0] = [[0, 0], [2, 0], [0, 2], [2, 2]][ri(4)];
        const cells = cellsAll(grid).filter(([c, r]) => Math.abs(c - c0) <= 1 && Math.abs(r - r0) <= 1);
        for (const [c, r] of cells) grid[c][r] = "W2";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: "🦋 BUTTERFLY EFFECT! 모서리에서 시작된 연쇄 반응 — 2x QUANTUM WILD!" });
    }
    if (FSC === 1 && kinds.length) feat(cfg, kinds[0]);
    const ev = cubeEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev);
    if (doPar) {
        kinds.push("parallel"); feat(cfg, "parallel");
        phases.push({ t: "fx", name: "parallel" });
        phases.push({ t: "mode", add: "q-split" });
        phases.push({ t: "banner", text: "🧊🧊 PARALLEL TIMELINE · DIMENSION B 🧊🧊", cls: "bonus" });
        const g2 = draw(cfg, 3, 3, { W: 1.2 });
        phases.push({ t: "spin", grid: clone(g2) });
        const e2 = cubeEval(cfg, g2, bet); winP(phases, cfg, e2, "🧊 DIMENSION B");
        const e1 = cubeEval(cfg, grid, bet);
        if (e1.win) phases.push({ t: "win", cells: [], win: e1.win, text: "🧊 DIMENSION A 동시 지급" });
        phases.push({ t: "mode", remove: "q-split" });
    }
    if (kinds.length && R() < (F.qjp?.p || 0.08)) jpRoll(cfg, ctx, phases, F.qjp.tw, "⚛️ QUANTUM COLLAPSE JACKPOT!");
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five: 0, lines: ev.lines });
}

// =====================================================================
// 🏮 Kindness — Victorian soup kitchen, 15 shuttered windows (5x3 ways)
// =====================================================================
function kindness(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doFeast = hit("feast"), doHearth = !doFeast && hit("hearth"), doBen = !doFeast && !doHearth && hit("benefactor");
    let grid = draw(cfg, 5, 3);
    if (doBen && !waysEval(cfg, grid, bet).win) grid = forceRun(cfg, grid, pickW(payKeys(cfg).map(k => [k, 1])), 3).grid;
    const kinds = [];
    if (doFeast) { const cs = shuffle([0, 1, 2, 3, 4]).slice(0, 3).sort(); cs.forEach((c, i) => { grid[c][ri(2)] = i % 2 ? "H2" : "H1"; }); }
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: [] }];
    endFeat();
    let mult = null;
    if (doHearth) {
        kinds.push("hearth"); feat(cfg, "hearth");
        phases.push({ t: "fx", name: "hearth" });
        const cells = shuffle(cellsAll(grid)).slice(0, 4 + ri(4));
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🔥 HEARTHFIRE WARMTH! 황금 불씨가 창문 ${cells.length}곳을 WILD LANTERN으로!` });
    }
    if (doFeast) {
        kinds.push("feast"); feat(cfg, "feast");
        phases.push({ t: "fx", name: "feast" });
        const s = pickW([["H1", 50], ["H2", 50]]), cells = [0, 1, 2, 3, 4].map(c => [c, 2]);
        for (const [c, r] of cells) grid[c][r] = s;
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "gold", text: `🍞 COMMUNITY FEAST! 쉼터 문이 활짝 — 1층 창문 5개가 거대한 ${name(cfg, s)} 메가 심볼로!` });
    }
    let ev = waysEval(cfg, grid, bet);
    if (doBen && ev.win) {
        kinds.push("benefactor"); feat(cfg, "benefactor");
        phases.push({ t: "fx", name: "benefactor" });
        const M = new Map();
        for (const [c, r] of ev.lines.flatMap(l => l.cells)) if (!M.has(key(c, r))) M.set(key(c, r), pickW([[2, 50], [3, 28], [4, 14], [5, 8]]));
        mult = (c, r) => M.get(key(c, r)) || 1;
        phases.push({ t: "badge", cells: [...M].map(([k, x]) => { const [c, r] = k.split(",").map(Number); return { c, r, text: "🪙x" + x, cls: "mult" }; }) });
        ev = waysEval(cfg, grid, bet, { mult });
    }
    const baseWin = winP(phases, cfg, ev, doBen ? "🧥 GRATITUDE" : "");
    if (kinds.length && R() < (F.kjp?.p || 0.08)) jpRoll(cfg, ctx, phases, F.kjp.tw, "🪙 GOLDEN DONATION JACKPOT!");
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five: ev.five, lines: ev.lines });
}

const wrap = fn => (cfg, ctx) => { FSC = 1; try { return fn(cfg, ctx); } finally { FSC = 1; } };
export const THEME_MACHINES = Object.fromEntries(Object.entries({
    sp_clockwork: clockwork, sp_alchemist: alchemist, sp_astral: astral, sp_neon: neon, sp_popcorn: popcorn,
    sp_ouija: ouija, sp_tower: tower, sp_bog: bog, sp_cyberdial: cyberdial, sp_sundrum: sundrum,
    sp_strikes: strikes, sp_vampire: vampire, sp_payday: payday, sp_jokers: jokers, sp_coinclaw: coinclaw,
    sp_cathedral: cathedral, sp_velvet: velvet, sp_astro: astro, sp_lilypad: lilypad, sp_gridlock: gridlock,
    sp_helm: helm, sp_bricks: bricks, sp_classic: classic, sp_mimic: mimic, sp_abyss: abyss, sp_glacier: glacier, sp_quantum: quantum, sp_kindness: kindness
}).map(([k, fn]) => [k, wrap(fn)]));
