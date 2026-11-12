// =====================================================================
// Engines for the 7 special machines (configs in specialConfigs.js).
// Same contract as engine.js: one call decides the whole result. On top
// of the usual fields a result carries `phases` — an ordered script the
// screen (screens/slotSpecial.js) plays back:
//   spin {grid, antic, near}   reels spin and land
//   show {grid, pop}           board replaced (pop = cells that appear)
//   morph {grid, cells, fx}    cells change symbol (fx = flare | wild | evolve …)
//   clear {cells}              cells smashed / emptied
//   drop {grid}                cascade refill (new cells fall in)
//   win {cells, win, text}     money (already px-scaled) added to the win meter
//   jp {tier, amount}          jackpot
//   badge {cells:[{c,r,text,cls}]}  labels on cells (digits, multipliers …)
//   fx {name, …}               themed animation · banner {text, cls, ms}
//   mode {add|remove}          cabinet class · hud {text} · meter {key, value, max}
//   wheel {seg, idx, title} · pick {f} · rows {n}
//   critic / offer / laser     interactive mini-games (assumed value in `assumed`)
// Feature-first: bonus decisions are rolled first (features.*.p × pet luck),
// the grids are then built to explain them.
// =====================================================================
const R = Math.random;
const ri = n => Math.floor(R() * n);
function pickW(pairs) { let s = 0; for (const p of pairs) s += p[1]; let r = R() * s; for (const p of pairs) if ((r -= p[1]) < 0) return p[0]; return pairs[pairs.length - 1][0]; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const clone = g => g.map(c => [...c]);
const key = (c, r) => c + "," + r;
import { P_POINTS, pointCount } from "./points.js";
let ptCfg = null; // slot being spun (for the bet-scaled P chance)

// ------------------------------------------------------------ jackpots
const TIERS = ["MINI", "MINOR", "MAXI", "MAJOR", "GRAND"];
export function spJackpotValue(cfg, tier, bet, pool) {
    const j = cfg.jp?.[tier];
    if (!j) return 0;
    if (j.sum) return TIERS.filter(t => cfg.jp[t]).reduce((s, t) => s + spJackpotValue(cfg, t, bet, pool), 0); // MEGA = all of them
    if (j.x) return j.x * bet;
    return Math.round(pool?.[tier] ?? j.seed ?? 0);
}
function gate(cfg, tier, bet) {
    const sc = bet / cfg.bets[cfg.bets.length - 1];
    if ((tier === "MEGA" || tier === "VAULT") && R() > sc) tier = "GRAND";
    if (tier === "GRAND" && R() > sc) tier = "MAJOR";
    if (tier === "MAJOR" && R() > sc) tier = cfg.jp?.MAXI ? "MAXI" : "MINOR";
    return cfg.jp?.[tier] ? tier : "MINI";
}

// ------------------------------------------------------------ grids
function pairsFor(cfg, reel, over = {}) {
    const out = [];
    for (const [s, w0] of Object.entries({ ...cfg.w, ...over })) { let w = Array.isArray(w0) ? (w0[reel] ?? 0) : w0; if (w > 0) out.push([s, w]); }
    return out;
}
function draw(cfg, cols, rows, over = {}) {
    const g = [];
    for (let c = 0; c < cols; c++) { const p = pairsFor(cfg, c, over), col = []; for (let r = 0; r < rows; r++) col.push(pickW(p)); g.push(col); }
    return g;
}
const SPECIALS = new Set(["F", "P", "MS", "SW", "SU", "MO", "SB", "SK", "RB", "DS", "BL", "BP", "GC", "OJ", "DJ"]);
const isDigit = s => /^[OD]\d$/.test(s) || s === "OJ" || s === "DJ";
const plain = s => s && !SPECIALS.has(s) && !isDigit(s) && s !== "W";
function inject(grid, sym, n, { distinct = true, avoid = null } = {}) {
    const cells = [];
    if (distinct) {
        for (const c of shuffle([...grid.keys()]).slice(0, Math.min(n, grid.length))) {
            const free = grid[c].map((s, r) => r).filter(r => plain(grid[c][r]) && !(avoid && avoid(c, r)));
            if (!free.length) continue;
            const r = free[ri(free.length)]; grid[c][r] = sym; cells.push([c, r]);
        }
    } else {
        const all = []; grid.forEach((col, c) => col.forEach((s, r) => { if (plain(s) && !(avoid && avoid(c, r))) all.push([c, r]); }));
        for (const [c, r] of shuffle(all).slice(0, n)) { grid[c][r] = sym; cells.push([c, r]); }
    }
    return cells;
}
function addPoints(grid) { const n = pointCount(ptCfg, R); if (n) inject(grid, "P", n, { distinct: n <= grid.length }); return P_POINTS[Math.min(n, 5)]; }
const count = (grid, s) => grid.reduce((a, col) => a + col.filter(x => x === s).length, 0);
function teaseFor(grid, syms, need = 3) {
    const out = [];
    let n = 0;
    for (let c = 0; c < grid.length; c++) { if (n >= need - 1) out.push(c); if (grid[c].some(s => syms.includes(s))) n++; }
    return out;
}

// ways evaluation (left to right). opts.mult(c,r) → cell multiplier (max over a line's cells)
function ways(cfg, grid, bet, { wildReels = [], mult = null, scale = 1 } = {}) {
    const lines = []; let total = 0;
    for (const [s, def] of Object.entries(cfg.syms)) {
        if (!def.pay) continue;
        let w = 1, n = 0, m = 1; const cells = [];
        for (let c = 0; c < grid.length; c++) {
            const hit = [];
            grid[c].forEach((x, r) => { if (x === s || x === "W" || wildReels.includes(c)) hit.push([c, r]); });
            if (!hit.length) break;
            w *= hit.length; n++; cells.push(...hit);
            if (mult) for (const [cc, rr] of hit) m = Math.max(m, mult(cc, rr) || 1);
        }
        const min = cfg.minKind || 3;
        if (n >= min) {
            const p = def.pay[Math.min(n, min + def.pay.length - 1) - min] * w * bet * (cfg.px || 1) * scale * m;
            if (p > 0) { lines.push({ sym: s, n, ways: w, mult: m, win: Math.round(p), cells }); total += p; }
        }
    }
    return { win: Math.round(total), lines, five: lines.filter(l => l.n >= 5).length };
}
// a grid that surely wins: one symbol on reels 0..n-1
function forceWin(cfg, grid, rows) {
    const g = clone(grid);
    const s = pickW(Object.keys(cfg.syms).filter(k => cfg.syms[k].pay).map(k => [k, k.startsWith("H") ? 1 : 3]));
    const n = pickW([[3, 70], [4, 22], [5, 8]]);
    for (let c = 0; c < Math.min(n, g.length); c++) { const r = ri(rows); if (!g[c].includes(s)) g[c][r] = s; }
    return g;
}
const lineText = (cfg, l) => `${l.n}× ${cfg.syms[l.sym]?.name || l.sym}${l.ways > 1 ? ` · ${l.ways} ways` : ""}${l.mult > 1 ? ` · x${l.mult}` : ""}`;

// ------------------------------------------------------------ result builder
function finish(cfg, ctx, o) {
    const bet = ctx.bet;
    let cash = 0, jpSum = 0, assumed = 0;
    const jpWins = [];
    for (const p of o.phases) {
        if (p.t === "win") cash += p.win;
        else if (p.t === "jp") { jpSum += p.amount; jpWins.push({ tier: p.tier, amount: p.amount }); }
        else if (p.assumed) assumed += p.assumed;
    }
    let total = cash + assumed;
    const cap = (cfg.maxX || 5000) * bet;
    if (total > cap) total = cap;
    const prog = jpWins.filter(j => !cfg.jp?.[j.tier]?.x).reduce((s, j) => s + j.amount, 0);
    const fixed = jpSum - prog;
    total = Math.round(Math.min(cap, total + fixed) + prog);
    const features = [];
    const scaled = Math.max(0, Math.min(cap, cash + assumed) - (o.baseWin || 0));
    for (const k of o.kinds || []) features.push({ type: "sp", kind: k, scales: true, total: 0 });
    if (features.length) features[0].total = scaled; else if (scaled > 0) features.push({ type: "sp", kind: "extra", scales: true, total: scaled });
    if (jpWins.length) features.push({ type: "jp", jpWins, total: jpSum });
    const bonus = (o.kinds || []).length > 0 || jpWins.length > 0;
    const omen = cfg.omens?.length && ((bonus && R() < 0.6) || (!bonus && R() < 0.03)) ? 1 + ri(cfg.omens.length) : 0;
    return {
        special: true, grid: o.grid, phases: o.phases, features, jackpots: jpWins.map(j => j.tier), points: o.points || 0,
        base: { win: Math.min(o.baseWin || 0, total), lines: o.lines || [] }, total, bonus, state: o.state, anticipation: o.antic || [],
        omen, fiveKind: o.five || 0, freeSpin: (o.kinds || []).some(k => /free|sol|orbit|loop|yong/.test(k)), assumed, wildReels: [], meterEvents: []
    };
}

export function specialSpin(cfg, ctx) {
    ptCfg = cfg;
    const fn = { sp_kitchen: kitchen, sp_dj: dj, sp_orb: orbSlot, sp_pod: orbSlot, sp_pillars: pillars, sp_gift: gift, sp_heist: heist }[cfg.engine];
    return fn(cfg, ctx);
}
function ctl(cfg, ctx) {
    const F = cfg.features || {};
    const boost = 1 + (ctx.luck?.bonus || 0);
    const force = ctx.force || "";
    const on = k => !!F[k] && !F[k].off;
    const hit = k => on(k) && (force ? force.split(":")[0] === k : R() < (F[k].p || 0) * boost);
    return { F, boost, force, on, hit };
}

// =====================================================================
// 🍳 Monster Kitchen — 6x5 cluster pays + cascades
// =====================================================================
const KLOW = ["L1", "L2", "L3", "L4"];
function clusters(cfg, grid) {
    const C = grid.length, Rn = grid[0].length, out = [];
    for (const s of Object.keys(cfg.syms)) {
        const seen = new Set();
        for (let c = 0; c < C; c++) for (let r = 0; r < Rn; r++) {
            if (grid[c][r] !== s || seen.has(key(c, r))) continue;
            const q = [[c, r]], comp = [], inComp = new Set([key(c, r)]);
            while (q.length) {
                const [x, y] = q.pop(); comp.push([x, y]); if (grid[x][y] === s) seen.add(key(x, y));
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= C || ny >= Rn || inComp.has(key(nx, ny))) continue;
                    const v = grid[nx][ny];
                    if (v === s || v === "W") { inComp.add(key(nx, ny)); q.push([nx, ny]); }
                }
            }
            if (comp.length >= 5 && comp.some(([x, y]) => grid[x][y] === s)) out.push({ sym: s, cells: comp });
        }
    }
    return out;
}
const kPay = (cfg, s, n, bet) => { const t = cfg.syms[s].pay; const i = n >= 15 ? 7 : n >= 12 ? 6 : Math.min(5, n - 5); return t[i] * bet * (cfg.px || 1); };
function refillCol(cfg, col) {
    const keep = col.filter(x => x != null);
    const p = pairsFor(cfg, 0, { W: 0.6 });
    while (keep.length < col.length) keep.unshift(pickW(p));
    return keep;
}
function kitchenCascade(cfg, grid, bet, state, phases, { forceRampage = false } = {}) {
    let total = 0;
    const max = cfg.titanMax || 25;
    for (let k = 0; k < 16; k++) {
        if (forceRampage && k === 0) state.titan = max;
        const cl = clusters(cfg, grid);
        if (cl.length) {
            const cells = []; const seen = new Set();
            let win = 0;
            for (const x of cl) { win += kPay(cfg, x.sym, x.cells.length, bet); for (const [c, r] of x.cells) if (!seen.has(key(c, r))) { seen.add(key(c, r)); cells.push([c, r]); } }
            win = Math.round(win);
            total += win;
            phases.push({ t: "win", cells, win, text: cl.map(x => `${x.cells.length}× ${cfg.syms[x.sym].name}`).join(" + ") });
            state.titan = Math.min(max, (state.titan || 0) + 1);
            phases.push({ t: "meter", key: "titan", value: state.titan, max });
            phases.push({ t: "clear", cells });
            for (const [c, r] of cells) grid[c][r] = null;
            for (let c = 0; c < grid.length; c++) grid[c] = refillCol(cfg, grid[c]);
            phases.push({ t: "drop", grid: clone(grid) });
        }
        if ((state.titan || 0) >= max) {
            // RAMPAGE: smash the raw (low) ingredients, drop a giant 2x2 / 3x3 wild
            state.titan = 0;
            phases.push({ t: "fx", name: "rampage" });
            phases.push({ t: "meter", key: "titan", value: 0, max });
            const lows = []; grid.forEach((col, c) => col.forEach((s, r) => { if (KLOW.includes(s)) lows.push([c, r]); }));
            phases.push({ t: "clear", cells: lows });
            for (const [c, r] of lows) grid[c][r] = null;
            for (let c = 0; c < grid.length; c++) grid[c] = refillCol(cfg, grid[c]);
            const n = R() < 0.35 ? 3 : 2, c0 = ri(grid.length - n + 1), r0 = ri(grid[0].length - n + 1), block = [];
            for (let c = c0; c < c0 + n; c++) for (let r = r0; r < r0 + n; r++) { grid[c][r] = "W"; block.push([c, r]); }
            phases.push({ t: "drop", grid: clone(grid) });
            phases.push({ t: "morph", grid: clone(grid), cells: block, fx: "giantwild", text: `${n}x${n} GIANT WILD!` });
            continue;
        }
        if (!cl.length) break;
    }
    return total;
}
function flare(cfg, grid, phases, n = 3 + ri(5)) {
    const raw = []; grid.forEach((col, c) => col.forEach((s, r) => { if (KLOW.includes(s)) raw.push([c, r]); }));
    const cells = shuffle(raw).slice(0, n);
    for (const [c, r] of cells) grid[c][r] = "GG";
    phases.push({ t: "fx", name: "flare" });
    phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: "🔥 GODZILLA GRILL FLARE! → GOLDEN GOURMET" });
}
function kitchen(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doFree = hit("free"), doBoss = !doFree && hit("boss");
    const doFlare = hit("flare");
    const C = cfg.reels, Rn = cfg.rows;
    const grid = draw(cfg, C, Rn);
    const kinds = [];
    if (doFree) { inject(grid, "F", 3 + (R() < 0.2 ? 1 : 0)); kinds.push("free"); }
    else if (R() < 0.07) inject(grid, "F", 2, { avoid: c => c >= 4 });
    if (doBoss) { inject(grid, "MS", 3); kinds.push("boss"); }
    else if (R() < 0.06) inject(grid, "MS", 2, { avoid: c => c >= 4 });
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["F", "MS"]), near: !doFree && !doBoss ? (count(grid, "F") >= 2 ? "F" : count(grid, "MS") >= 2 ? "MS" : null) : null }];
    const work = clone(grid);
    // scatters / P stay put (they never form clusters)
    if (doFlare) { flare(cfg, work, phases); kinds.push("flare"); }
    const before = phases.length;
    let baseWin = kitchenCascade(cfg, work, bet, state, phases, { forceRampage: force === "rampage" });
    if (phases.slice(before).some(p => p.t === "fx" && p.name === "rampage") && !kinds.includes("rampage")) kinds.push("rampage");
    let five = 0;
    if (doBoss) {
        phases.push({ t: "banner", text: "⭐⭐⭐ FOOD CRITIC BOSS BATTLE ⭐⭐⭐", cls: "jackpot" });
        const orders = Array.from({ length: 12 }, () => Math.round(pickW([[0.5, 30], [1, 30], [2, 20], [3, 12], [5, 6], [10, 2]]) * bet * (cfg.px || 1)));
        const served = 8, tip = 2;
        phases.push({ t: "critic", orders, assumed: orders.slice(0, served).reduce((s, x) => s + x, 0) * tip });
    }
    if (doFree) {
        phases.push({ t: "banner", text: `🏮 ${F.free.spins} FREE SPINS 🏮`, cls: "bonus" });
        phases.push({ t: "mode", add: "free-mode" });
        for (let i = 0; i < F.free.spins; i++) {
            phases.push({ t: "hud", text: `FREE SPIN ${i + 1} / ${F.free.spins}` });
            const g = draw(cfg, C, Rn);
            phases.push({ t: "spin", grid: clone(g) });
            if (R() < F.flare.pFree) flare(cfg, g, phases);
            kitchenCascade(cfg, g, bet, state, phases);
        }
        phases.push({ t: "mode", remove: "free-mode" });
    }
    // flare also pops up at random on base spins
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five });
}

// =====================================================================
// 🎧 DJ Crypto — 5x3 ways
// =====================================================================
function dj(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doFree = hit("free"), doScratch = !doFree && hit("scratch"), doBass = !doFree && !doScratch && hit("bass");
    const grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doFree) { inject(grid, "F", 3 + (R() < 0.15 ? 1 : 0)); kinds.push("free"); }
    else if (R() < 0.08) inject(grid, "F", 2, { avoid: c => c >= 3 });
    if (doBass) { inject(grid, "SW", 1); kinds.push("bass"); }
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["F"]), near: !doFree && count(grid, "F") >= 2 ? "F" : null }];
    let cur = grid, baseWin = 0, five = 0;
    if (doBass) {
        phases.push({ t: "fx", name: "bass" });
        cur = forceWin(cfg, grid.map(col => col.map(s => s === "SW" ? "L1" : s)), 3);
        const changed = []; cur.forEach((col, c) => col.forEach((s, r) => { if (s !== grid[c][r]) changed.push([c, r]); }));
        phases.push({ t: "morph", grid: clone(cur), cells: changed, fx: "bounce", text: "🔊 BASS DROP! 심볼이 튕겨 재배치!" });
    }
    const ev = ways(cfg, cur, bet);
    if (ev.win) { phases.push({ t: "win", cells: ev.lines.flatMap(l => l.cells), win: ev.win, text: ev.lines.slice(0, 3).map(l => lineText(cfg, l)).join(" · ") }); baseWin += ev.win; five += ev.five; }
    if (doScratch) {
        const c = 1 + ri(3), m = pickW([[2, 45], [3, 30], [4, 15], [5, 10]]);
        kinds.push("scratch");
        phases.push({ t: "fx", name: "scratch", col: c });
        const g0 = clone(cur); g0[c] = g0[c].map(() => "W");
        phases.push({ t: "morph", grid: clone(g0), cells: [0, 1, 2].map(r => [c, r]), fx: "wild", text: `💿 VINYL SCRATCH! 릴 ${c + 1} = STICKY WILD x${m}` });
        phases.push({ t: "badge", cells: [{ c, r: 1, text: `x${m}`, cls: "mult" }] });
        for (let i = 0; i < F.scratch.respins; i++) {
            phases.push({ t: "hud", text: `STICKY RESPIN ${i + 1} / ${F.scratch.respins}` });
            const g = draw(cfg, 5, 3); g[c] = ["W", "W", "W"];
            phases.push({ t: "spin", grid: clone(g), hold: [c] });
            phases.push({ t: "badge", cells: [{ c, r: 1, text: `x${m}`, cls: "mult" }] });
            const e = ways(cfg, g, bet, { mult: (cc) => cc === c ? m : 1 });
            if (e.win) { phases.push({ t: "win", cells: e.lines.flatMap(l => l.cells), win: e.win, text: e.lines.slice(0, 3).map(l => lineText(cfg, l)).join(" · ") }); five += e.five; }
        }
        phases.push({ t: "hud", text: "" });
    }
    if (doFree) {
        const n = F.free.spins;
        phases.push({ t: "banner", text: `🎫 VIP CROWD SURF · ${n} FREE SPINS 🎫`, cls: "bonus" });
        phases.push({ t: "mode", add: "free-mode" });
        for (let i = 0; i < n; i++) {
            const col = Math.min(4, Math.floor(i * 5 / n));
            phases.push({ t: "hud", text: `FREE SPIN ${i + 1} / ${n}` });
            const g = draw(cfg, 5, 3, { W: [0, 4, 4, 4, 0] });
            phases.push({ t: "spin", grid: clone(g) });
            const drops = 1 + (R() < 0.45 ? 1 : 0), mults = {};
            const cells = shuffle([0, 1, 2]).slice(0, drops).map(r => { const m = pickW([[2, 50], [3, 28], [4, 14], [5, 8]]); mults[key(col, r)] = m; return { c: col, r, text: `x${m}`, cls: "glow" }; });
            phases.push({ t: "fx", name: "surf", col });
            phases.push({ t: "badge", cells });
            const e = ways(cfg, g, bet, { mult: (c, r) => mults[key(c, r)] || 1 });
            if (e.win) { phases.push({ t: "win", cells: e.lines.flatMap(l => l.cells), win: e.win, text: e.lines.slice(0, 3).map(l => lineText(cfg, l)).join(" · ") }); five += e.five; }
        }
        phases.push({ t: "fx", name: "stage" });
        phases.push({ t: "mode", remove: "free-mode" });
    }
    if (!ev.win && !kinds.length && phases[0].antic.length) phases.push({ t: "tease" });
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// ☀️🌙 Sol & Umbra / 🐹 Neon Space Cadets — digit orbs that join sideways
// =====================================================================
// An orb board: Map "c,r" → { d: digit, boost: leading digit added by arrows/rockets, jp, v (merged pod value) }
function runsOf(board, C, Rn) {
    const runs = [];
    for (let r = 0; r < Rn; r++) {
        let cur = null;
        for (let c = 0; c <= C; c++) {
            const o = c < C ? board.get(key(c, r)) : null;
            if (o && !o.jp) { if (!cur) cur = { r, c0: c, cells: [] }; cur.cells.push(c); }
            else if (cur) { runs.push(cur); cur = null; }
        }
    }
    for (const run of runs) run.value = runValue(board, run);
    return runs;
}
// Digits join left to right (4 · 8 = 48). The number keeps at most 3 digits;
// every extra digit beyond that becomes a multiplier instead (4·8·2·7 = 482 x2).
// A solar arrow / rocket boost adds a leading digit (48 → 148).
function runValue(board, run) {
    const os = run.cells.map(c => board.get(key(c, run.r)));
    if (os.length === 1 && os[0].v != null) return os[0].v;
    const str = os.map(o => String(o.v != null ? o.v : o.d)).join("");
    const num = +str.slice(0, 3), mult = Math.max(1, str.length - 2);
    const lead = os[0].boost || 0;
    return (lead ? lead * Math.pow(10, String(num).length) + num : num) * mult;
}
const orbPay = (cfg, v, bet) => Math.round(v * bet * (cfg.orb.digitK ?? 0.01) * (cfg.px || 1));
function orbSym(cfg, o) { const P = cfg.engine === "sp_pod" ? "D" : "O"; return o.jp ? P + "J" : P + o.d; }
function boardGrid(cfg, board, C, Rn, fill = null) {
    const g = [];
    for (let c = 0; c < C; c++) { const col = []; for (let r = 0; r < Rn; r++) { const o = board.get(key(c, r)); col.push(o ? orbSym(cfg, o) : fill ? fill(c, r) : "_"); } g.push(col); }
    return g;
}
function newOrb(cfg, bet, jpP = 0) {
    if (R() < jpP) return { jp: gate(cfg, pickW([["MINI", 60], ["MINOR", 28], ["MAXI", 9], ["MAJOR", 3]]), bet) };
    return { d: pickW([[0, 6], [1, 12], [2, 12], [3, 11], [4, 10], [5, 10], [6, 9], [7, 8], [8, 7], [9, 6]]) };
}
function orbBadges(cfg, board, C, Rn) {
    const out = [];
    for (const run of runsOf(board, C, Rn)) if (run.cells.length > 1 || run.value >= 10) out.push({ c: run.cells[0], r: run.r, text: String(run.value), cls: "runv" });
    for (const [k, o] of board) if (o.jp) { const [c, r] = k.split(",").map(Number); out.push({ c, r, text: o.jp, cls: "jpb" }); }
    return out;
}
function payBoard(cfg, ctx, board, C, Rn, phases, label, mult = 1) {
    const bet = ctx.bet;
    let sum = 0;
    for (const run of runsOf(board, C, Rn)) {
        const win = orbPay(cfg, run.value, bet) * mult;
        if (!win) continue;
        sum += win;
        phases.push({ t: "win", cells: run.cells.map(c => [c, run.r]), win, text: `${label} ${run.value}${mult > 1 ? ` x${mult}` : ""}` });
    }
    for (const [k, o] of board) if (o.jp) phases.push({ t: "jp", tier: o.jp, amount: spJackpotValue(cfg, o.jp, bet, ctx.pool) });
    return sum;
}
function orbSlot(cfg, ctx) {
    const pod = cfg.engine === "sp_pod";
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const O = cfg.orb;
    const SA = pod ? "SB" : "SU", SB = pod ? "SK" : "MO"; // scatter A (lock spins) / scatter B (mega spin)
    const kA = pod ? "orbit" : "sol", kB = pod ? "hyper" : "umbra", kC = pod ? "supernova" : "eclipse";
    const doC = hit(kC), doA = !doC && hit(kA), doB = !doC && !doA && hit(kB);
    const doWheel = pod && !doA && !doB && !doC && hit("wheel");
    const C = 5, Rn = 4;
    const grid = draw(cfg, C, Rn);
    const kinds = [];
    // base orbs / pods
    const board = new Map();
    grid.forEach((col, c) => col.forEach((s, r) => { if (plain(s) && R() < O.base) { const o = newOrb(cfg, bet); board.set(key(c, r), o); grid[c][r] = orbSym(cfg, o); } }));
    if (doC) { const a = 2 + ri(2); inject(grid, SA, a); inject(grid, SB, 5 - a + (R() < 0.2 ? 1 : 0)); kinds.push(kC); }
    else if (doA) { inject(grid, SA, 3 + (R() < 0.15 ? 1 : 0)); kinds.push(kA); }
    else if (doB) { inject(grid, SB, 3); kinds.push(kB); }
    else if (R() < 0.08) inject(grid, R() < 0.5 ? SA : SB, 2, { avoid: c => c >= 3 });
    // rockets (pods)
    let rocketCol = -1;
    if (pod && (doWheel || R() < O.rocket)) {
        rocketCol = ri(C);
        if (doWheel) { board.set(key(rocketCol, 0), newOrb(cfg, bet)); grid[rocketCol][0] = orbSym(cfg, board.get(key(rocketCol, 0))); kinds.push("wheel"); }
        grid[rocketCol][Rn - 1] = "RB"; board.delete(key(rocketCol, Rn - 1));
    }
    for (const k of [...board.keys()]) { const [c, r] = k.split(",").map(Number); if (!isDigit(grid[c][r])) board.delete(k); }
    const points = addPoints(grid);
    for (const k of [...board.keys()]) { const [c, r] = k.split(",").map(Number); if (!isDigit(grid[c][r])) board.delete(k); }
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, [SA, SB]), near: kinds.length ? null : (count(grid, SA) >= 2 ? SA : count(grid, SB) >= 2 ? SB : null) }];
    let baseWin = 0, five = 0;
    // rocket booster shoots up its column
    if (rocketCol >= 0) {
        const up = [];
        for (let r = Rn - 2; r >= 0; r--) { const o = board.get(key(rocketCol, r)); if (o && !o.jp) { o.d = Math.min(9, o.d + 1 + ri(3)); up.push({ c: rocketCol, r, text: "▲" + o.d, cls: "up" }); grid[rocketCol][r] = orbSym(cfg, o); } }
        phases.push({ t: "fx", name: "rocket", col: rocketCol });
        if (up.length) phases.push({ t: "morph", grid: clone(grid), cells: up.map(u => [u.c, u.r]), fx: "evolve", text: "🚀 ROCKET BOOSTER! 포드 업그레이드" });
        if (doWheel) {
            const W = F.wheel, idx = pickW(W.seg.map((s, i) => [i, W.w[i]]));
            const tier = gate(cfg, W.seg[idx], bet);
            phases.push({ t: "banner", text: "🎡 맨 윗줄 도달! COSMIC HAMSTER WHEEL 🎡", cls: "jackpot" });
            phases.push({ t: "wheel", seg: W.seg, idx: W.seg.indexOf(tier) >= 0 ? W.seg.indexOf(tier) : idx, title: "🐹 COSMIC WHEEL 🐹" });
            phases.push({ t: "jp", tier, amount: spJackpotValue(cfg, tier, bet, ctx.pool) });
        }
    }
    // base: ways wins + orb runs
    const ev = ways(cfg, grid, bet);
    let anyWin = ev.win > 0 || runsOf(board, C, Rn).some(r => r.cells.length > 1);
    if (pod && !anyWin && !kinds.length && hit("zerog")) {
        // Zero-Gravity Shuffle: everything floats up and lands as a sure win
        kinds.push("zerog");
        phases.push({ t: "fx", name: "zerog" });
        const g2 = forceWin(cfg, grid.map(col => col.map(s => isDigit(s) || s === "RB" ? "L2" : s)), Rn);
        board.clear();
        // and maybe a pod pair
        if (R() < 0.4) { const r = ri(Rn), c = ri(C - 1); for (const cc of [c, c + 1]) { const o = newOrb(cfg, bet); board.set(key(cc, r), o); g2[cc][r] = orbSym(cfg, o); } }
        const changed = []; g2.forEach((col, c) => col.forEach((s, r) => { if (s !== grid[c][r]) changed.push([c, r]); }));
        phases.push({ t: "morph", grid: clone(g2), cells: changed, fx: "float", text: "🌀 ZERO-GRAVITY SHUFFLE!" });
        for (let c = 0; c < C; c++) grid[c] = g2[c];
    }
    const ev2 = ways(cfg, grid, bet);
    if (ev2.win) { phases.push({ t: "win", cells: ev2.lines.flatMap(l => l.cells), win: ev2.win, text: ev2.lines.slice(0, 3).map(l => lineText(cfg, l)).join(" · ") }); baseWin += ev2.win; five += ev2.five; }
    const bb = orbBadges(cfg, board, C, Rn);
    if (bb.length) phases.push({ t: "badge", cells: bb });
    for (const run of runsOf(board, C, Rn)) {
        if (run.cells.length < 2) continue;
        const win = orbPay(cfg, run.value, bet);
        phases.push({ t: "fx", name: "laser", cells: run.cells.map(c => [c, run.r]) });
        phases.push({ t: "win", cells: run.cells.map(c => [c, run.r]), win, text: `${pod ? "🔗 POD FUSION" : "✨ STARLIGHT"} ${run.value}` });
        baseWin += win;
    }
    // ---------------- bonuses
    if (doA) lockSpins(cfg, ctx, phases, { pod, spins: F[kA].spins, rows: 4, title: pod ? `🔵 ORBIT LOCK · ${F[kA].spins} FREE SPINS 🔵` : `☀️ SOL · ${F[kA].spins} SOLAR SPINS ☀️`, land: O.sol });
    if (doB) megaSpin(cfg, ctx, phases, { pod });
    if (doC) lockSpins(cfg, ctx, phases, { pod, spins: F[kC].spins, rows: 8, respin: true, title: pod ? "💥 SUPERNOVA DUAL BONUS 💥" : "🌗 TOTAL ECLIPSE 🌗", land: O.eclipseLand, fullTest: force.endsWith(":full") });
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev2.lines });
}
// Sol / Orbit Lock (rows 4, fixed spins) and Total Eclipse / Supernova (rows 8, respins reset)
function lockSpins(cfg, ctx, phases, { pod, spins, rows, respin = false, title, land, fullTest = false }) {
    const bet = ctx.bet, C = 5, Rn = rows, O = cfg.orb;
    const board = new Map();
    phases.push({ t: "banner", text: title, cls: "bonus" });
    phases.push({ t: "mode", add: pod ? "pod-mode" : rows > 4 ? "eclipse-mode" : "sol-mode" });
    phases.push({ t: "rows", n: Rn });
    const start = respin ? 8 + ri(5) : 3 + ri(3);
    for (const [c, r] of shuffle(Array.from({ length: C * Rn }, (_, i) => [i % C, Math.floor(i / C)])).slice(0, start)) board.set(key(c, r), newOrb(cfg, bet, O.jpOrb));
    const empties = () => { const e = []; for (let c = 0; c < C; c++) for (let r = 0; r < Rn; r++) if (!board.has(key(c, r))) e.push([c, r]); return e; };
    phases.push({ t: "show", grid: boardGrid(cfg, board, C, Rn), pop: [...board.keys()].map(k => k.split(",").map(Number)) });
    phases.push({ t: "badge", cells: orbBadges(cfg, board, C, Rn) });
    let left = spins, i = 0, guard = 0;
    while (left > 0 && empties().length && guard++ < 60) {
        left--; i++;
        phases.push({ t: "hud", text: respin ? `RESPINS ${left + 1}` : `SPIN ${i} / ${spins}` });
        const added = [];
        const lp = fullTest ? 0.35 : land;
        for (const [c, r] of empties()) if (R() < lp) { board.set(key(c, r), newOrb(cfg, bet, O.jpOrb)); added.push([c, r]); }
        if (respin && added.length) left = spins;
        phases.push({ t: "land", grid: boardGrid(cfg, board, C, Rn), cells: added });
        // Sol: solar flare arrows bump a run's leading digit · Supernova: x2 meteors
        if (!pod && R() < 0.4 && board.size) {
            const runs = runsOf(board, C, Rn);
            const hits = shuffle(runs).slice(0, 1 + (R() < 0.3 ? 1 : 0));
            for (const run of hits) { const o = board.get(key(run.cells[0], run.r)); o.boost = Math.min(9, (o.boost || 0) + (R() < 0.6 ? 1 : 2)); }
            if (hits.length) phases.push({ t: "fx", name: "arrow", cells: hits.map(run => [run.cells[0], run.r]) });
        }
        if (pod) {
            // adjacent pods merge into one Super-Pod (frees the other cells)
            const merged = [];
            for (const run of runsOf(board, C, Rn)) {
                if (run.cells.length < 2) continue;
                const v = run.value;
                for (const c of run.cells.slice(1)) board.delete(key(c, run.r));
                const o = board.get(key(run.cells[0], run.r)); o.v = v; delete o.boost;
                merged.push([run.cells[0], run.r]);
            }
            if (merged.length) { phases.push({ t: "fx", name: "merge", cells: merged }); phases.push({ t: "show", grid: boardGrid(cfg, board, C, Rn), pop: merged }); }
            if (rows > 4) {
                // Supernova: two hamsters drop x2 meteors on random locked pods
                const pods = [...board.entries()].filter(([, o]) => !o.jp && !o.met); // each pod is hit once
                const tg = shuffle(pods).slice(0, 2);
                for (const [, o] of tg) { o.v = (o.v != null ? o.v : o.d) * 2; o.met = true; }
                if (tg.length) phases.push({ t: "fx", name: "meteor", cells: tg.map(([k]) => k.split(",").map(Number)) });
            }
        }
        phases.push({ t: "badge", cells: orbBadges(cfg, board, C, Rn) });
    }
    const full = board.size >= C * Rn;
    payBoard(cfg, ctx, board, C, Rn, phases, pod ? "🪐 POD" : "✨ ORB");
    if (full && rows > 4) {
        const tier = pod ? gate(cfg, "MEGA", bet) : gate(cfg, "GRAND", bet);
        phases.push({ t: "banner", text: pod ? "🐹 FULL STARFIELD!!! MEGA HAMSTER JACKPOT 🐹" : "🌗 40칸 완성!!! CELESTIAL GRAND 🌗", cls: "jackpot" });
        phases.push({ t: "jp", tier, amount: spJackpotValue(cfg, tier, bet, ctx.pool) });
    }
    phases.push({ t: "rows", n: 4 });
    phases.push({ t: "mode", remove: pod ? "pod-mode" : rows > 4 ? "eclipse-mode" : "sol-mode" });
}
// Umbra Eclipse spin / Hyper-Drive: one big 5x8 spin
function megaSpin(cfg, ctx, phases, { pod }) {
    const bet = ctx.bet, C = 5, Rn = 8, O = cfg.orb;
    phases.push({ t: "banner", text: pod ? "🩷 HYPER-DRIVE MEGA SPIN 🩷" : "🌙 UMBRA · ECLIPSE SPIN 🌙", cls: "bonus" });
    phases.push({ t: "mode", add: pod ? "pod-mode" : "eclipse-mode" });
    phases.push({ t: "rows", n: Rn });
    const board = new Map();
    for (let c = 0; c < C; c++) for (let r = 0; r < Rn; r++) if (R() < O.umbra) board.set(key(c, r), newOrb(cfg, bet, O.jpOrb * 0.6));
    const fillSym = () => pickW([["L1", 1], ["L2", 1], ["H3", 0.6]]);
    const fill = new Map();
    const g0 = boardGrid(cfg, board, C, Rn, (c, r) => { const s = fillSym(); fill.set(key(c, r), s); return s; });
    phases.push({ t: "spin", grid: g0 });
    if (pod) {
        // three full columns of rocket boosters skyrocket every pod they pass
        const cols = shuffle([0, 1, 2, 3, 4]).slice(0, 3);
        phases.push({ t: "fx", name: "rockets", cols });
        const up = [];
        for (const c of cols) for (let r = 0; r < Rn; r++) { const o = board.get(key(c, r)); if (o && !o.jp) { const n = o.d + 2 + ri(4); o.d = Math.min(9, n); if (n > 9) o.boost = Math.min(9, (o.boost || 0) + 1); up.push([c, r]); } }
        phases.push({ t: "morph", grid: boardGrid(cfg, board, C, Rn, (c, r) => fill.get(key(c, r))), cells: up, fx: "evolve", text: "🚀🚀🚀 ROCKET COLUMNS!" });
    } else {
        // gravity magnets pull separated orbs together in a row
        const rows = shuffle([...Array(Rn).keys()]).slice(0, 2 + ri(3));
        phases.push({ t: "fx", name: "magnet", rows });
        for (const r of rows) {
            const os = []; for (let c = 0; c < C; c++) { const o = board.get(key(c, r)); if (o) { os.push(o); board.delete(key(c, r)); } }
            const c0 = Math.max(0, Math.min(C - os.length, ri(C)));
            os.forEach((o, i) => board.set(key(c0 + i, r), o));
        }
        phases.push({ t: "show", grid: boardGrid(cfg, board, C, Rn, (c, r) => fill.get(key(c, r)) || "L1"), pop: [] });
    }
    phases.push({ t: "badge", cells: orbBadges(cfg, board, C, Rn) });
    payBoard(cfg, ctx, board, C, Rn, phases, pod ? "🪐 POD" : "🌙 ORB");
    phases.push({ t: "rows", n: 4 });
    phases.push({ t: "mode", remove: pod ? "pod-mode" : "eclipse-mode" });
}

// =====================================================================
// 🏛️ 4 Pillars — 4x2, 16 ways, five elements
// =====================================================================
const ELS = ["E1", "E2", "E3", "E4", "E5"];
const EL_NAME = { E1: "木 Wood", E2: "火 Fire", E3: "土 Earth", E4: "金 Metal", E5: "水 Water" };
const nextEl = s => ELS[(ELS.indexOf(s) + 1) % 5];
function pillarsEval(cfg, grid, bet, wildReels = [], mult = 1) {
    const e = ways({ ...cfg, minKind: 3 }, grid, bet, { wildReels, scale: mult });
    return e;
}
function pillarsCascade(cfg, grid, bet, phases, state, { wildReels = [], mult = 1, meter = true } = {}) {
    let total = 0;
    for (let k = 0; k < 6; k++) {
        const e = pillarsEval(cfg, grid, bet, wildReels, mult);
        if (!e.win) break;
        total += e.win;
        phases.push({ t: "win", cells: e.lines.flatMap(l => l.cells), win: e.win, text: (k ? "🔄 상생! " : "") + e.lines.map(l => `${l.n}× ${cfg.syms[l.sym].name}${mult > 1 ? ` x${mult}` : ""}`).join(" · ") });
        // Yongshin meters: every winning element charges its colour
        if (meter) for (const l of e.lines) if (ELS.includes(l.sym)) {
            const y = state.yong ||= {};
            y[l.sym] = Math.min(cfg.yong.max, (y[l.sym] || 0) + 1);
            phases.push({ t: "meter", key: l.sym, value: y[l.sym], max: cfg.yong.max });
        }
        // Sangsaeng: the winning element on the first pillar evolves into the next element (木→火→土→金→水→木);
        // every other winning cell is cleared and refilled from the reel
        const cells = [];
        for (const l of e.lines) for (const [c, r] of l.cells) {
            const s = grid[c][r];
            if (cells.some(x => x[0] === c && x[1] === r)) continue;
            if (c === 0 && ELS.includes(s)) { grid[c][r] = nextEl(s); cells.push([c, r]); }
            else if (s !== "W" && !wildReels.includes(c)) { grid[c][r] = pickW(pairsFor(cfg, c, { W: 0 })); cells.push([c, r]); }
        }
        if (!cells.length) break;
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "evolve", text: "🔄 상생 (相生) — 木→火→土→金→水" });
    }
    return total;
}
function charged(cfg, state) { const y = state.yong || {}; return ELS.filter(e => (y[e] || 0) >= cfg.yong.max); }
function pillars(cfg, ctx) {
    const { bet } = ctx, { F, hit, force, on } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const C = 4, Rn = 2;
    const doDaeun = hit("daeun");
    const grid = draw(cfg, C, Rn);
    const kinds = [];
    if (doDaeun) { for (let c = 0; c < 4; c++) grid[c][ri(2)] = "DS"; kinds.push("daeun"); }
    else if (R() < 0.05) { const cs = shuffle([0, 1, 2]).slice(0, 3); for (const c of cs) grid[c][ri(2)] = "DS"; }
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: count(grid, "DS") >= 3 ? [3] : [], near: !doDaeun && count(grid, "DS") >= 3 ? "DS" : null }];
    let baseWin = pillarsCascade(cfg, grid, bet, phases, state);
    // Hap & Chung on a non-winning spin
    if (!baseWin && !doDaeun && (hit("hap") || force === "hap")) {
        const c = ri(3), hap = R() < 0.5, e = pickW([["E1", 4], ["E2", 3], ["E3", 2], ["E4", 1.4], ["E5", 0.8]]);
        kinds.push(hap ? "hap" : "chung");
        phases.push({ t: "fx", name: hap ? "hap" : "chung", cols: [c, c + 1] });
        if (hap) {
            grid[c] = [e, e]; grid[c + 1] = [e, e];
            const third = c + 2 < C ? c + 2 : c - 1; grid[third][ri(2)] = e;
            phases.push({ t: "morph", grid: clone(grid), cells: [[c, 0], [c, 1], [c + 1, 0], [c + 1, 1], ...[0, 1].map(r => [third, r])], fx: "evolve", text: `合 합! ${EL_NAME[e]} 메가 기둥` });
            baseWin += pillarsCascade(cfg, grid, bet, phases, state);
        } else {
            const m = pickW([[2, 40], [3, 25], [5, 18], [7, 10], [10, 7]]);
            const lows = []; grid.forEach((col, cc) => col.forEach((s, r) => { if (/^L/.test(s)) lows.push([cc, r]); }));
            phases.push({ t: "clear", cells: lows });
            for (const [cc, r] of lows) grid[cc][r] = pickW([["E1", 4], ["E2", 3], ["E3", 2], ["E4", 1.5], ["E5", 1]]);
            // make sure something connects
            if (!pillarsEval(cfg, grid, bet).win) { const s = grid[0][0]; grid[1][ri(2)] = s; grid[2][ri(2)] = s; }
            phases.push({ t: "morph", grid: clone(grid), cells: lows, fx: "evolve", text: `沖 충! 번개 → x${m}` });
            phases.push({ t: "badge", cells: [{ c: 1, r: 0, text: `x${m}`, cls: "mult" }] });
            baseWin += pillarsCascade(cfg, grid, bet, phases, state, { mult: m });
        }
    }
    // Yongshin: four colours charged → free spins with the missing element
    if (on("yong") && (charged(cfg, state).length >= 4 || force === "yong")) {
        const y = state.yong ||= {};
        const missing = ELS.filter(e => (y[e] || 0) < cfg.yong.max);
        const el = missing.length ? missing.sort((a, b) => (y[a] || 0) - (y[b] || 0))[0] : pickW(ELS.map(e => [e, 1]));
        state.yong = {};
        kinds.push("yong");
        for (const e of ELS) phases.push({ t: "meter", key: e, value: 0, max: cfg.yong.max });
        phases.push({ t: "banner", text: `☯️ 용신 (用神) = ${EL_NAME[el]} · 10 FREE SPINS ☯️`, cls: "bonus" });
        phases.push({ t: "mode", add: "free-mode" });
        const sticky = [];
        for (let i = 0; i < 10; i++) {
            phases.push({ t: "hud", text: `용신 FREE SPIN ${i + 1} / 10 · ${EL_NAME[el]} = STICKY WILD` });
            const g = draw(cfg, C, Rn, { [el]: 7 });
            for (const c of sticky) g[c] = ["W", "W"];
            phases.push({ t: "spin", grid: clone(g), hold: [...sticky] });
            const nu = [];
            g.forEach((col, c) => { if (c > 0 && c < 3 && !sticky.includes(c) && col.includes(el)) nu.push(c); }); // the middle pillars only
            if (nu.length) {
                for (const c of nu) { sticky.push(c); g[c] = ["W", "W"]; }
                phases.push({ t: "morph", grid: clone(g), cells: nu.flatMap(c => [[c, 0], [c, 1]]), fx: "wild", text: `${EL_NAME[el]} → 확장 스티키 WILD!` });
            }
            pillarsCascade(cfg, g, bet, phases, state, { meter: false });
        }
        phases.push({ t: "mode", remove: "free-mode" });
    }
    if (doDaeun) daeun(cfg, ctx, phases, force.endsWith(":full"));
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic });
}
// 대운 Hold & Spin: 4x5, 3 respins, a full column = 10-Year Pillar x5, all four = GRAND
function daeun(cfg, ctx, phases, fullTest) {
    const bet = ctx.bet, C = 4, Rn = 5;
    const coin = () => { const v = pickW([[0.5, 25], [1, 25], [2, 18], [3, 12], [5, 8], [8, 4], [10, 2.5], ["MINI", 2], ["MINOR", 0.6], ["MAJOR", 0.08]]); return isNaN(+v) ? { jp: gate(cfg, v, bet) } : { v: Math.round(+v * bet * (cfg.px || 1)) }; };
    const board = new Map();
    for (let c = 0; c < C; c++) board.set(key(c, ri(Rn)), coin());
    const gridOf = () => { const g = []; for (let c = 0; c < C; c++) { const col = []; for (let r = 0; r < Rn; r++) col.push(board.has(key(c, r)) ? "GC" : "_"); g.push(col); } return g; };
    const badges = () => [...board.entries()].map(([k, o]) => { const [c, r] = k.split(",").map(Number); return { c, r, text: o.jp || String(o.v), cls: o.jp ? "jpb" : "val" }; });
    phases.push({ t: "banner", text: "印 大運 대운 HOLD & SPIN 印", cls: "bonus" });
    phases.push({ t: "mode", add: "daeun-mode" });
    phases.push({ t: "rows", n: Rn });
    phases.push({ t: "show", grid: gridOf(), pop: [...board.keys()].map(k => k.split(",").map(Number)) });
    phases.push({ t: "badge", cells: badges() });
    let lives = 3, guard = 0;
    while (lives > 0 && board.size < C * Rn && guard++ < 80) {
        const added = [];
        for (let c = 0; c < C; c++) for (let r = 0; r < Rn; r++) if (!board.has(key(c, r)) && R() < (fullTest ? 0.3 : 0.085)) { board.set(key(c, r), coin()); added.push([c, r]); }
        lives = added.length ? 3 : lives - 1;
        phases.push({ t: "hud", text: `RESPINS ${lives}` });
        phases.push({ t: "land", grid: gridOf(), cells: added });
        phases.push({ t: "badge", cells: badges() });
    }
    let fullCols = 0;
    for (let c = 0; c < C; c++) {
        const col = [...Array(Rn).keys()].map(r => board.get(key(c, r)));
        const full = col.every(Boolean);
        if (full) fullCols++;
        const cash = col.filter(o => o && o.v).reduce((s, o) => s + o.v, 0) * (full ? 5 : 1);
        if (full) phases.push({ t: "fx", name: "pillar", col: c });
        if (cash) phases.push({ t: "win", cells: col.map((o, r) => o ? [c, r] : null).filter(Boolean), win: cash, text: full ? `🏛️ 10년 기둥 완성! 기둥 ${c + 1} x5` : `기둥 ${c + 1}` });
        for (const o of col) if (o?.jp) phases.push({ t: "jp", tier: o.jp, amount: spJackpotValue(cfg, o.jp, bet, ctx.pool) });
    }
    if (fullCols === 4) { const t = gate(cfg, "GRAND", bet); phases.push({ t: "banner", text: "🏛️🏛️🏛️🏛️ 네 기둥 완성! GRAND DESTINY 🏛️🏛️🏛️🏛️", cls: "jackpot" }); phases.push({ t: "jp", tier: t, amount: spJackpotValue(cfg, t, bet, ctx.pool) }); }
    phases.push({ t: "rows", n: 2 });
    phases.push({ t: "mode", remove: "daeun-mode" });
}

// =====================================================================
// 🎁 Gift — 5x3 ways + 10 gift boxes
// =====================================================================
function giftFree(cfg, ctx, phases, n, F) {
    const bet = ctx.bet; let five = 0;
    phases.push({ t: "banner", text: `🍕 PARTY FREE SPINS × ${n} 🍕`, cls: "bonus" });
    phases.push({ t: "mode", add: "free-mode" });
    for (let i = 0; i < n; i++) {
        phases.push({ t: "hud", text: `FREE SPIN ${i + 1} / ${n}` });
        const g = draw(cfg, 5, 3, { W: [0, 4.5, 4.5, 4.5, 0] });
        const pop = R() < 0.012; // the balloons can pop during the free spins too
        if (pop) inject(g, "BL", 3);
        phases.push({ t: "spin", grid: clone(g) });
        const e = ways(cfg, g, bet);
        if (e.win) { phases.push({ t: "win", cells: e.lines.flatMap(l => l.cells), win: e.win, text: e.lines.slice(0, 3).map(l => lineText(cfg, l)).join(" · ") }); five += e.five; }
        if (pop) balloonPick(cfg, ctx, phases, F);
    }
    phases.push({ t: "mode", remove: "free-mode" });
    return five;
}
function balloonPick(cfg, ctx, phases, F) {
    const bet = ctx.bet, tw = F.balloon.tw, keys = Object.keys(tw);
    let tier = gate(cfg, pickW(keys.map(k => [k, tw[k]])), bet);
    const decoys = []; for (const t of keys.filter(t => t !== tier)) { const k = ri(3); for (let i = 0; i < k; i++) decoys.push(t); }
    const seq = [...shuffle([tier, tier, ...shuffle(decoys).slice(0, 7)]), tier];
    const amount = spJackpotValue(cfg, tier, bet, ctx.pool);
    phases.push({ t: "pick", f: { type: "pick", title: "🎈 BALLOON POP · MATCH 3 🎈", tier, items: keys, seq, tiles: 12, icon: "🎈", amount, total: amount } });
    phases.push({ t: "jp", tier, amount });
}
function gift(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doFree = hit("free"), doGold = !doFree && hit("gold"), doOffer = !doFree && !doGold && hit("offer"), doBalloon = !doFree && !doGold && !doOffer && hit("balloon");
    state.heat = Math.min(100, (state.heat || 0) + 1);
    const grid = draw(cfg, 5, 3);
    const kinds = [];
    if (doFree) { inject(grid, "F", 3 + (R() < 0.15 ? 1 : 0)); kinds.push("free"); } else if (R() < 0.08) inject(grid, "F", 2, { avoid: c => c >= 3 });
    if (doBalloon) { inject(grid, "BL", 3); kinds.push("balloon"); } else if (R() < 0.06) inject(grid, "BL", 2, { avoid: c => c >= 3 });
    const points = addPoints(grid);
    const phases = [{ t: "spin", grid: clone(grid), antic: teaseFor(grid, ["F", "BL"]), near: kinds.length ? null : count(grid, "F") >= 2 ? "F" : count(grid, "BL") >= 2 ? "BL" : null }];
    phases.push({ t: "meter", key: "heat", value: state.heat, max: 100 });
    const ev = ways(cfg, grid, bet);
    let baseWin = 0, five = 0;
    if (ev.win) { phases.push({ t: "win", cells: ev.lines.flatMap(l => l.cells), win: ev.win, text: ev.lines.slice(0, 3).map(l => lineText(cfg, l)).join(" · ") }); baseWin = ev.win; five += ev.five; }
    if (doBalloon) balloonPick(cfg, ctx, phases, F);
    if (doOffer) {
        kinds.push("offer");
        const ow = cfg.offerW;
        const offers = [0, 1, 2].map(() => { let k = pickW(Object.entries(ow)); if (!k.startsWith("x")) k = gate(cfg, k, bet); return k; });
        const val = k => k.startsWith("x") ? Math.round(+k.slice(1) * bet * (cfg.px || 1)) : spJackpotValue(cfg, k, bet, ctx.pool);
        // assumed play (simulation / auto): take the first offer worth x10+, else the last one
        const pickI = offers.findIndex(k => val(k) >= 10 * bet);
        const chosen = offers[pickI >= 0 ? pickI : 2];
        phases.push({ t: "banner", text: "🎁 GIFT BOX · TOP OFFER 🎁", cls: "jackpot" });
        phases.push({ t: "offer", offers: offers.map(k => ({ k, v: val(k), jp: !k.startsWith("x") })), assumed: chosen.startsWith("x") ? val(chosen) : 0, assumedJp: chosen.startsWith("x") ? null : chosen });
        if (!chosen.startsWith("x")) phases.push({ t: "jp", tier: chosen, amount: val(chosen), offerJp: true });
    }
    if (doGold) {
        const kind = force.startsWith("gold:") ? force.split(":")[1] : pickW(Object.entries(F.gold.w));
        kinds.push("gold");
        state.heat = 0;
        phases.push({ t: "fx", name: "goldbox" });
        phases.push({ t: "meter", key: "heat", value: 0, max: 100 });
        if (kind === "hold") giftHold(cfg, ctx, phases);
        else if (kind === "wheel") {
            const seg = ["FS8", "MINI", "x3", "FS10", "x4", "MINOR", "x5", "FS20", "x3", "FS8"], w = [16, 8, 16, 10, 12, 3, 9, 3, 16, 16];
            const idx = pickW(seg.map((s, i) => [i, w[i]]));
            let s = seg[idx];
            phases.push({ t: "wheel", seg: seg.map(x => x.startsWith("FS") ? x.replace("FS", "FS ") : x), idx, title: "❓ GOLDEN GIFT WHEEL ❓" });
            if (s.startsWith("FS")) five += giftFree(cfg, ctx, phases, +s.slice(2), F);
            else if (s.startsWith("x")) { const win = Math.round(+s.slice(1) * bet * (cfg.px || 1)); phases.push({ t: "win", cells: [], win, text: `🎡 WHEEL ${s}` }); }
            else { const t = gate(cfg, s, bet); phases.push({ t: "jp", tier: t, amount: spJackpotValue(cfg, t, bet, ctx.pool) }); }
        } else {
            // the box throws wilds all over the reels — one spin, at least 5 wilds
            const n = 5 + ri(5);
            const g = draw(cfg, 5, 3);
            const cells = inject(g, "W", n, { distinct: false });
            phases.push({ t: "banner", text: `❓ WILD SHOWER! WILD ${n}개 ❓`, cls: "bonus" });
            phases.push({ t: "spin", grid: clone(g.map((col, c) => col.map((s, r) => cells.some(([a, b]) => a === c && b === r) ? pickW([["L1", 1], ["A", 1]]) : s))) });
            phases.push({ t: "fx", name: "wildthrow", cells });
            phases.push({ t: "morph", grid: clone(g), cells, fx: "wild", text: "🎁 WILD!" });
            const e = ways(cfg, g, bet);
            if (e.win) { phases.push({ t: "win", cells: e.lines.flatMap(l => l.cells), win: e.win, text: e.lines.slice(0, 3).map(l => lineText(cfg, l)).join(" · ") }); five += e.five; }
        }
    }
    if (doFree) five += giftFree(cfg, ctx, phases, F.free.spins, F);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}
function giftHold(cfg, ctx, phases) {
    const bet = ctx.bet, C = 5, Rn = 3;
    const coin = () => {
        const r = R();
        if (r < 0.045) return { gift: true };
        if (r < 0.075) return { jpc: true };
        return { v: Math.round(pickW([[0.5, 25], [1, 25], [2, 18], [3, 12], [5, 8], [8, 4], [10, 2.5], [20, 0.8]]) * bet * (cfg.px || 1)) };
    };
    const board = new Map();
    for (const [c, r] of shuffle(Array.from({ length: 15 }, (_, i) => [i % 5, Math.floor(i / 5)])).slice(0, 6)) { let cn = coin(); while (!cn.v) cn = coin(); board.set(key(c, r), cn); }
    const gridOf = () => { const g = []; for (let c = 0; c < C; c++) { const col = []; for (let r = 0; r < Rn; r++) col.push(board.has(key(c, r)) ? "GC" : "_"); g.push(col); } return g; };
    const badges = () => [...board.entries()].map(([k, o]) => { const [c, r] = k.split(",").map(Number); return { c, r, text: o.gift ? "🎁" : o.jpc ? (o.jp || "JACKPOT") : String(o.v), cls: o.jpc ? "jpb" : o.gift ? "gift" : "val" }; });
    phases.push({ t: "banner", text: "❓ GOLDEN GIFT · HOLD & SPIN · 코인 6개! ❓", cls: "bonus" });
    phases.push({ t: "fx", name: "coinspray" });
    phases.push({ t: "show", grid: gridOf(), pop: [...board.keys()].map(k => k.split(",").map(Number)) });
    phases.push({ t: "badge", cells: badges() });
    let lives = 3, guard = 0;
    while (lives > 0 && board.size < C * Rn && guard++ < 80) {
        const added = [];
        for (let c = 0; c < C; c++) for (let r = 0; r < Rn; r++) if (!board.has(key(c, r)) && R() < 0.075) { const cn = coin(); board.set(key(c, r), cn); added.push([c, r]); }
        lives = added.length ? 3 : lives - 1;
        phases.push({ t: "hud", text: `RESPINS ${lives}` });
        phases.push({ t: "land", grid: gridOf(), cells: added });
        // a gift coin collects every coin on the board so far
        for (const [c, r] of added) {
            const o = board.get(key(c, r));
            if (!o.gift) continue;
            o.v = [...board.values()].filter(x => x !== o && x.v).reduce((s, x) => s + x.v, 0);
            o.gift = false; o.collected = true;
            phases.push({ t: "fx", name: "collect", at: [c, r] });
        }
        phases.push({ t: "badge", cells: badges() });
    }
    // jackpot coins turn into MINI ~ GRAND at the end
    for (const [k, o] of board) if (o.jpc) { o.jp = gate(cfg, pickW([["MINI", 60], ["MINOR", 30], ["MAJOR", 9], ["GRAND", 0.6]]), bet); }
    phases.push({ t: "badge", cells: badges() });
    const sum = [...board.values()].reduce((s, o) => s + (o.v || 0), 0);
    if (sum) phases.push({ t: "win", cells: [], win: sum, text: "❓ HOLD & SPIN COLLECT" });
    for (const o of board.values()) if (o.jp) phases.push({ t: "jp", tier: o.jp, amount: spJackpotValue(cfg, o.jp, bet, ctx.pool) });
    if (board.size >= C * Rn) { const t = gate(cfg, "GRAND", bet); phases.push({ t: "jp", tier: t, amount: spJackpotValue(cfg, t, bet, ctx.pool) }); }
    phases.push({ t: "rows", n: 3 });
}

// =====================================================================
// 🕰️ Chrono-Heist — 3x3 vault dial, 8 laser lines
// =====================================================================
const HLINES = [[[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]], [[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[0, 2], [1, 1], [2, 0]]];
function heistEval(cfg, g, bet, frozen = null) {
    const out = []; let total = 0;
    for (let i = 0; i < HLINES.length; i++) {
        const L = HLINES[i];
        const syms = L.map(([c, r]) => g[c][r]);
        const base = syms.find(s => s !== "W");
        if (base && !cfg.syms[base]) continue;
        if (!base) { const w = Math.round(10 * bet * (cfg.px || 1) / 8 * 3); out.push({ line: i, cells: L, win: w, sym: "W" }); total += w; continue; }
        if (syms.every(s => s === base || s === "W")) { const w = Math.round(cfg.syms[base].pay[0] * bet * (cfg.px || 1) / 8 * 3); out.push({ line: i, cells: L, win: w, sym: base }); total += w; }
    }
    return { win: total, lines: out };
}
function heist(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doLoop = hit("loop"), doLaser = !doLoop && hit("laser");
    const grid = draw(cfg, 3, 3);
    const kinds = [];
    if (doLoop) { for (let c = 0; c < 3; c++) grid[c][ri(3)] = "F"; kinds.push("loop"); }
    else if (doLaser) { for (let c = 0; c < 3; c++) grid[c][ri(3)] = "BP"; kinds.push("laser"); }
    else if (R() < 0.08) { const s = R() < 0.5 ? "F" : "BP"; grid[0][ri(3)] = s; grid[1][ri(3)] = s; }
    const points = addPoints(grid);
    const near = !kinds.length && (grid[0].includes("F") && grid[1].includes("F") ? "F" : grid[0].includes("BP") && grid[1].includes("BP") ? "BP" : null);
    const phases = [{ t: "spin", grid: clone(grid), antic: near || kinds.length ? [2] : [], near, dial: R() < 0.5 ? 1 : -1 }];
    let ev = heistEval(cfg, grid, bet), baseWin = 0;
    const hist = state.hist || [];
    if (!ev.win && !kinds.length && hit("rewind")) {
        kinds.push("rewind");
        phases.push({ t: "fx", name: "rewind", grids: [...hist].reverse() });
        // swap low symbols on one laser line to wilds → a forced win
        const L = HLINES[ri(HLINES.length)];
        const g = clone(grid);
        const want = L.map(([c, r]) => g[c][r]).find(s => /^H/.test(s)) || "L1";
        const cells = [];
        for (const [c, r] of L) if (g[c][r] !== want) { g[c][r] = "W"; cells.push([c, r]); }
        for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) if (/^L/.test(g[c][r]) && R() < 0.3 && !cells.some(x => x[0] === c && x[1] === r)) { g[c][r] = "W"; cells.push([c, r]); }
        phases.push({ t: "morph", grid: clone(g), cells, fx: "wild", text: "⏪ REWIND GLITCH! 낮은 심볼 → TIME WILD" });
        ev = heistEval(cfg, g, bet);
    }
    if (ev.win) { phases.push({ t: "win", cells: ev.lines.flatMap(l => l.cells), win: ev.win, text: `🔴 LASER LOCK × ${ev.lines.length}` }); phases.push({ t: "fx", name: "lasers", lines: ev.lines.map(l => l.line) }); baseWin = ev.win; }
    state.hist = [...hist, clone(grid)].slice(-3);
    if (doLaser) {
        const L = F.laser, N = L.nodes;
        const vault = force === "laser:vault";
        // reveal order: safe nodes until an alarm (or every safe node = TIME VAULT)
        const order = shuffle([...Array(N - L.alarms).fill("S"), ...Array(L.alarms).fill("A")]);
        if (order[0] === "A") { const j = order.indexOf("S"); [order[0], order[j]] = [order[j], order[0]]; }
        let seq = vault ? order.filter(x => x === "S") : order.slice(0, order.indexOf("A") + 1 || order.length);
        const picks = seq.map(x => x === "A" ? { alarm: true } : (() => { const m = pickW(L.mult); return isNaN(+m) ? { jp: gate(cfg, m, bet) } : { m: +m }; })());
        const cleared = !picks.some(p => p.alarm);
        phases.push({ t: "banner", text: "📘 LASER GRID BREACH 📘", cls: "jackpot" });
        phases.push({ t: "laser", picks, nodes: N });
        const sum = picks.filter(p => p.m).reduce((s, p) => s + p.m, 0);
        if (sum) phases.push({ t: "win", cells: [], win: Math.round(sum * bet * (cfg.px || 1)), text: `📘 LASER BREACH x${sum}` });
        for (const p of picks) if (p.jp) phases.push({ t: "jp", tier: p.jp, amount: spJackpotValue(cfg, p.jp, bet, ctx.pool) });
        if (cleared) { const t = gate(cfg, "VAULT", bet); phases.push({ t: "banner", text: "🔓 ALL LASERS DOWN!!! TIME VAULT 🔓", cls: "jackpot" }); phases.push({ t: "jp", tier: t, amount: spJackpotValue(cfg, t, bet, ctx.pool) }); }
    }
    if (doLoop) {
        const n = F.loop.spins;
        phases.push({ t: "banner", text: `🌀 TIME-LOOP · ${n} FREE SPINS 🌀`, cls: "bonus" });
        phases.push({ t: "mode", add: "free-mode" });
        const frozen = new Map(); // cell → symbol
        let frozenWin = 0, loops = 0;
        for (let i = 0; i < n; i++) {
            phases.push({ t: "hud", text: `TIME-LOOP ${i + 1} / ${n}` });
            const g = draw(cfg, 3, 3, { W: 1.6 });
            for (const [k, s] of frozen) { const [c, r] = k.split(",").map(Number); g[c][r] = s; }
            phases.push({ t: "spin", grid: clone(g), frozen: [...frozen.keys()].map(k => k.split(",").map(Number)) });
            const e = heistEval(cfg, g, bet);
            if (e.win) {
                loops++;
                phases.push({ t: "win", cells: e.lines.flatMap(l => l.cells), win: e.win, text: `🔴 LASER LOCK × ${e.lines.length}` });
                frozenWin += e.win;
                const nu = [];
                for (const l of e.lines) for (const [c, r] of l.cells) if (!frozen.has(key(c, r))) { frozen.set(key(c, r), g[c][r]); nu.push([c, r]); }
                if (nu.length) phases.push({ t: "badge", cells: nu.map(([c, r]) => ({ c, r, text: "❄️", cls: "frozen" })) });
            }
        }
        if (frozenWin) {
            const m = 1 + loops;
            phases.push({ t: "fx", name: "replay" });
            phases.push({ t: "win", cells: [...frozen.keys()].map(k => k.split(",").map(Number)), win: Math.round(frozenWin * (m - 1) * 0.5), text: `🌀 TIME-LOOP REPLAY · 루프 ${loops}회 → 배수 x${(1 + (m - 1) * 0.5).toFixed(1)}` });
        }
        phases.push({ t: "mode", remove: "free-mode" });
    }
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic });
}
