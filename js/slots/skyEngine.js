// =====================================================================
// The 11 round-7 machines (configs: js/slots/skyConfigs.js, renderer:
// js/screens/slotSpecial.js). Same contract as themeEngine.js: each spin
// first rolls which features hit (features.*.p × pet luck, or the practice
// room `force`), then builds grids that explain the result and returns a
// `phases` script for the screen. Interactive tap bonuses ("tap" phases)
// are decided here too — taps only reveal the prizes, so the RTP is exact.
// =====================================================================
import { R, ri, pickW, shuffle, clone, key, draw, inject, addPoints, count, teaseFor, finish, ctl, spJackpotValue } from "./specialEngine.js";
import { waysEval, linesEval, clusterEval, winP, forceRun, nearMiss, freeLoop, cash, feat, endFeat, short, payKeys, highKeys, cellsAll, name, isW, txt } from "./themeEngine.js";

// ------------------------------------------------------------ jackpots
// bigger tiers get likelier with a bigger bet (same rule as the other machines)
const ORDER = ["VAULT", "MEGA", "GRAND", "LOTUS", "MAJOR", "MAXI", "MINOR", "MINI"];
const BIG = new Set(["VAULT", "MEGA", "GRAND", "LOTUS", "MAJOR"]);
function gate(cfg, t, bet) {
    const sc = bet / cfg.bets[cfg.bets.length - 1];
    const lower = x => ORDER.slice(ORDER.indexOf(x) + 1).find(y => cfg.jp?.[y]);
    for (let g = 0; g < 8 && BIG.has(t) && R() > sc; g++) { const nx = lower(t); if (!nx) break; t = nx; }
    return cfg.jp?.[t] ? t : [...ORDER].reverse().find(y => cfg.jp?.[y]);
}
const jpName = (cfg, t) => cfg.jpLabel?.[t] || t;
const pickTier = (cfg, ctx, tw) => gate(cfg, pickW(Object.keys(tw).filter(t => cfg.jp?.[t]).map(t => [t, tw[t]])), ctx.bet);
const pushJp = (phases, cfg, ctx, t) => phases.push({ t: "jp", tier: t, amount: spJackpotValue(cfg, t, ctx.bet, ctx.pool) });
const forcedTier = (cfg, force) => { const f = force.split(":")[1]; return f && cfg.jp?.[f] ? f : null; };

// ------------------------------------------------------------ shared pieces
const VALS = [[1, 30], [2, 25], [3, 15], [5, 12], [8, 6], [10, 4], [20, 1.5], [50, 0.3]];
const SMALL = [[0.5, 30], [1, 30], [2, 20], [3, 10], [5, 7], [10, 3]];
const anyPay = (cfg, hiW = 1, loW = 2) => pickW(payKeys(cfg).map(k => [k, k[0] === "H" ? hiW : loW]));
const anyHigh = cfg => pickW(highKeys(cfg).map((k, i) => [k, 1 + i * 0.5]));
const one = (cfg, over = {}) => draw(cfg, 1, 1, over)[0][0];
// a tap bonus: the prizes are decided now, the screen reveals them in tap order
// (anything left untapped when the timer runs out is collected automatically)
function tapBonus(cfg, ctx, phases, { mode, title, icon, n, vals = VALS, jpChance = 0, tw = null, tier = null, tail = null, extra = {} }) {
    const items = [], tiers = [];
    let sum = 0;
    const jpAt = tier || (tw && R() < jpChance) ? ri(n) : -1;
    for (let i = 0; i < n; i++) {
        if (i === jpAt) { const t = tier || pickTier(cfg, ctx, tw); tiers.push(t); items.push({ text: jpName(cfg, t), cls: "jp" }); continue; }
        const v = cash(cfg, ctx.bet, pickW(vals)); sum += v; items.push({ text: short(v), cls: "ok" });
    }
    if (tail) items.push(tail);
    phases.push({ t: "tap", mode, title, icon, items, ...extra });
    return { sum, tiers };
}
function payTap(phases, cfg, ctx, r, text) {
    if (r.sum) phases.push({ t: "win", cells: [], win: r.sum, text });
    for (const t of r.tiers) pushJp(phases, cfg, ctx, t);
}
// a left → right walk (one cell per column, row drifts by ±1)
function walk(C, Rn, r = ri(Rn)) { const out = []; for (let c = 0; c < C; c++) { out.push([c, r]); r = Math.max(0, Math.min(Rn - 1, r + ri(3) - 1)); } return out; }
const scatterTease = (grid, sym, on, cols) => { if (!on && R() < 0.07) inject(grid, sym, 2, { avoid: c => c >= cols - 2 }); };
const spinPhase = (grid, sym, on) => ({ t: "spin", grid: clone(grid), antic: sym ? teaseFor(grid, [sym]) : [], near: !sym || on ? null : nearMiss(grid, sym) });
const tease = (phases, baseWin, kinds) => { if (!baseWin && !kinds.length && phases[0].antic.length) phases.push({ t: "tease" }); };
const cellSet = ev => new Set(ev.lines.flatMap(l => l.cells.map(([c, r]) => key(c, r))));
const split = k => k.split(",").map(Number);
// a bonus always pays: if the feature grid still has no win, force one (ways / lines → a run, clusters → a group)
function ensureRun(cfg, grid, evalFn, phases, text, n = 3, sym = null) {
    const ev = evalFn(grid);
    if (ev.win) return { grid, ev };
    const f = forceRun(cfg, grid, sym || anyPay(cfg), n);
    phases.push({ t: "morph", grid: clone(f.grid), cells: f.changed, fx: "evolve", text });
    return { grid: f.grid, ev: evalFn(f.grid) };
}
function forceGroup(cfg, grid, size, { diag = true, start = null, sym = null } = {}) {
    const C = grid.length, Rn = grid[0].length, g = clone(grid), s = sym || anyHigh(cfg);
    const nb = diag ? NB8 : NB8.slice(0, 4);
    const cells = [start || [ri(C), ri(Rn)]];
    for (let k = 0; k < 80 && cells.length < size; k++) {
        const [c, r] = cells[ri(cells.length)], [dc, dr] = nb[ri(nb.length)], x = c + dc, y = r + dr;
        if (x < 0 || y < 0 || x >= C || y >= Rn || cells.some(([a, b]) => a === x && b === y) || /^Z/.test(g[x][y])) continue;
        cells.push([x, y]);
    }
    const changed = cells.filter(([c, r]) => !isW(g[c][r]));
    for (const [c, r] of changed) g[c][r] = s;
    return { grid: g, changed };
}
function ensureGroup(cfg, grid, evalFn, phases, text, size, o = {}) {
    const ev = evalFn(grid);
    if (ev.win) return { grid, ev };
    const f = forceGroup(cfg, grid, size, o);
    phases.push({ t: "morph", grid: clone(f.grid), cells: f.changed, fx: "evolve", text });
    return { grid: f.grid, ev: evalFn(f.grid) };
}

// =====================================================================
// ☁️ Cumulus Cash — 4x4 clouds blown away, 256 ways
// =====================================================================
function boltChain(C, Rn, len) {
    let c = 0, r = ri(Rn);
    const out = [[c, r]], seen = new Set([key(c, r)]);
    for (let g = 0; out.length < len && g < 40; g++) {
        const opts = [];
        for (const [dc, dr] of [[1, -1], [1, 0], [1, 1], [0, -1], [0, 1]]) {
            const nc = c + dc, nr = r + dr;
            if (nc < C && nr >= 0 && nr < Rn && !seen.has(key(nc, nr))) opts.push([[nc, nr], dc ? 3 : 1]);
        }
        if (!opts.length) break;
        [c, r] = pickW(opts); out.push([c, r]); seen.add(key(c, r));
    }
    return out;
}
function cumulus(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doTh = hit("thunder"), doLi = !doTh && hit("lightning"), doUp = !doTh && !doLi && hit("updraft");
    let grid = draw(cfg, 4, 4);
    const points = addPoints(grid);
    const kinds = [];
    if (doTh) inject(grid, "ZV", 3); else scatterTease(grid, "ZV", false, 4);
    if (doUp && !waysEval(cfg, grid, bet).win) grid = forceRun(cfg, grid, anyPay(cfg), 3).grid;
    const phases = [spinPhase(grid, "ZV", doTh)];
    if (doLi) {
        kinds.push("lightning"); feat(cfg, "lightning");
        const s = anyHigh(cfg), cells = boltChain(4, 4, 4 + ri(4));
        for (const [c, r] of cells) grid[c][r] = s;
        phases.push({ t: "fx", name: "bolt" });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `⚡ LIGHTNING CHAIN! 번개가 ${cells.length}칸을 ${name(cfg, s)}(으)로 바꿨다!` });
    }
    let ev = waysEval(cfg, grid, bet);
    if (doLi) ({ grid, ev } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "⚡ 번개가 한 번 더 내리친다!"));
    const w0 = winP(phases, cfg, ev, doLi ? "⚡ LIGHTNING CHAIN" : "");
    const baseWin = doLi ? 0 : w0;
    endFeat();
    if (doUp && ev.win) {
        kinds.push("updraft"); feat(cfg, "updraft");
        phases.push({ t: "fx", name: "updraft" });
        let g = clone(grid), e = ev;
        for (let k = 0; k < 6 && e.win; k++) {
            const gone = cellSet(e);
            phases.push({ t: "clear", cells: [...gone].map(split) });
            // winners float up off the screen, new clouds drift in from the bottom
            for (let c = 0; c < 4; c++) { const keep = g[c].filter((_, r) => !gone.has(key(c, r))); g[c] = [...keep, ...draw(cfg, 1, 4 - keep.length, { W: 1.1 })[0] || []]; }
            phases.push({ t: "drop", grid: clone(g), up: true });
            e = waysEval(cfg, g, bet);
            winP(phases, cfg, e, `🌬️ UPDRAFT ${k + 1}`);
        }
        grid = g;
    }
    if (doTh) {
        kinds.push("thunder"); feat(cfg, "thunder");
        const T = F.thunder, storm = force === "thunder:storm" || (!force && R() < T.storm);
        let pair = null;
        if (storm) { const pool = ["MINI", "MINOR", "MAXI", "MAJOR"].filter(t => cfg.jp?.[t]); const a = pickW(pool.map((t, i) => [t, [50, 30, 15, 5][i]])); const b = pickW(pool.filter(t => t !== a).map(t => [t, { MINI: 50, MINOR: 30, MAXI: 15, MAJOR: 5 }[t]])); pair = [a, b].map(t => gate(cfg, t, bet)); }
        phases.push({ t: "fx", name: "thunderhead" });
        phases.push({ t: "banner", text: "⛈️ THUNDERHEAD JACKPOT ⛈️", cls: "jackpot" });
        const r = tapBonus(cfg, ctx, phases, {
            mode: "fall", title: "⚡ 떨어지는 번개를 탭! ⚡", icon: "⚡", n: 7 + ri(5), jpChance: pair ? 0 : 0.3, tw: T.tw,
            tail: pair ? { text: `⛈️ STORM ${pair[0]}+${pair[1]}`, cls: "jp" } : null
        });
        payTap(phases, cfg, ctx, r, "⛈️ THUNDERHEAD 번개 상금");
        if (pair) { phases.push({ t: "banner", text: `⛈️ STORM JACKPOT! ${pair[0]} + ${pair[1]} ⛈️`, cls: "jackpot" }); for (const t of pair) pushJp(phases, cfg, ctx, t); }
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: 0, lines: ev.lines });
}

// =====================================================================
// ✈️ Aero-Ace Squadron — 5 sky lanes, 243 ways
// =====================================================================
function aero(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doDog = hit("dogfight"), doForm = !doDog && hit("formation"), doBar = !doDog && !doForm && hit("barrel");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doDog) inject(grid, "ZR", 3); else scatterTease(grid, "ZR", false, 5);
    let crate = -1;
    if (doBar) { const n = pickW([[3, 60], [4, 28], [5, 12]]); grid = forceRun(cfg, grid, anyPay(cfg, 2, 1), n).grid; crate = ri(n); }
    const phases = [spinPhase(grid, "ZR", doDog)];
    if (doForm) {
        kinds.push("formation"); feat(cfg, "formation");
        const c = 1 + ri(3);
        phases.push({ t: "fx", name: "formation", col: c });
        grid[c] = grid[c].map(() => "W");
        phases.push({ t: "morph", grid: clone(grid), cells: [0, 1, 2].map(r => [c, r]), fx: "wild", text: `✈️ FORMATION WILDS! V자 편대 가운데 비행기가 ${c + 1}번 레인 전체에 WILD 배너를 펼쳤다!` });
    }
    let mult = null;
    if (doBar) {
        kinds.push("barrel"); feat(cfg, "barrel");
        phases.push({ t: "tap", mode: "single", title: "🌀 곡예기를 탭해 BARREL ROLL!", icon: "🛩️", items: [{ text: "BARREL ROLL x2", cls: "jp" }] });
        phases.push({ t: "fx", name: "barrel", col: crate });
        phases.push({ t: "badge", cells: [0, 1, 2].map(r => ({ c: crate, r, text: "📦x2", cls: "mult" })) });
        mult = c => c === crate ? 2 : 1;
    }
    let ev = waysEval(cfg, grid, bet, { mult });
    if (doForm) ({ grid, ev } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "✈️ 편대가 상자를 하나 더 떨어뜨렸다!"));
    const w0 = winP(phases, cfg, ev, doBar ? "🌀 BARREL ROLL" : doForm ? "✈️ FORMATION" : "");
    const baseWin = doForm || doBar ? 0 : w0;
    endFeat();
    let five = ev.five;
    if (doDog) {
        kinds.push("dogfight_free"); feat(cfg, "dogfight");
        phases.push({ t: "fx", name: "radar" });
        const items = [];
        let add = 0, m = 1;
        for (let i = 0, n = 4 + ri(3); i < n; i++) {
            const x = pickW([["+1", 50], ["+2", 20], ["x", 30]]);
            if (x === "x") { m++; items.push({ text: "x+1 배수", cls: "jp" }); } else { add += +x; items.push({ text: `${x} SPIN`, cls: "ok" }); }
        }
        phases.push({ t: "tap", mode: "fall", title: "🎈 적 풍선을 격추하라! (추가 스핀 · 배수)", icon: "🎈", items });
        const n = F.dogfight.spins + add;
        const r = freeLoop(cfg, ctx, phases, {
            n, title: `🎯 DOGFIGHT · ${n} FREE SPINS · x${m} 🎯`,
            drawFn: () => draw(cfg, 5, 3, { W: [0, 2, 2, 2, 0] }),
            evalFn: g => { const e = waysEval(cfg, g, bet, { scale: m }); if (m > 1) e.prefix = `x${m}`; return e; }
        });
        five += r.five;
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🌉 The Crossing — 5x5 stone tiles, bridge paths from the left cliff
// =====================================================================
const isPW = x => isW(x) || x === "ZG";
function pathEval(cfg, g, bet, { scale = 1, cross = 1 } = {}) {
    const C = g.length, Rn = g[0].length, lines = [];
    let total = 0;
    for (const s of payKeys(cfg)) {
        const ok = x => x === s || isPW(x);
        const seen = new Set(), stack = [];
        for (let r = 0; r < Rn; r++) if (ok(g[0][r])) { seen.add(key(0, r)); stack.push([0, r]); }
        if (!stack.length) continue;
        let maxc = 0;
        const cells = [];
        while (stack.length) {
            const [c, r] = stack.pop(); cells.push([c, r]); maxc = Math.max(maxc, c);
            for (const [dc, dr] of [[1, -1], [1, 0], [1, 1], [0, -1], [0, 1]]) {
                const nc = c + dc, nr = r + dr;
                if (nc >= C || nr < 0 || nr >= Rn || seen.has(key(nc, nr)) || !ok(g[nc][nr])) continue;
                seen.add(key(nc, nr)); stack.push([nc, nr]);
            }
        }
        const n = maxc + 1;
        if (n < 3 || !cells.some(([c, r]) => g[c][r] === s)) continue;
        const m = n === C ? cross : 1;
        const v = cash(cfg, bet, cfg.syms[s].pay[n - 3] * scale * m);
        lines.push({ sym: s, n, ways: 1, mult: m, win: v, cells }); total += v;
    }
    return { win: total, lines, five: lines.filter(l => l.n >= 5).length };
}
function crossing(cfg, ctx) {
    const { bet } = ctx, { hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doGate = hit("gate"), doBridge = !doGate && hit("bridge"), doCrumble = !doGate && !doBridge && hit("crumble");
    let grid = draw(cfg, 5, 5);
    const points = addPoints(grid);
    const kinds = [];
    if (doGate || doBridge) {
        const s = anyPay(cfg), path = walk(doGate ? 4 : 5, 5);
        for (const [c, r] of path) grid[c][r] = s;
        if (doGate) grid[4][Math.max(0, Math.min(4, path[3][1] + ri(3) - 1))] = "ZG";
    }
    if (doCrumble && !pathEval(cfg, grid, bet).win) { const s = anyPay(cfg); for (const [c, r] of walk(3, 5)) grid[c][r] = s; }
    const pre = pathEval(cfg, grid, bet);
    const four = pre.lines.some(l => l.n === 4) && !pre.lines.some(l => l.n === 5);
    const phases = [{ t: "spin", grid: clone(grid), antic: four || doGate ? [4] : [], near: null }];
    const cross = doBridge || doGate ? pickW([[3, 40], [4, 25], [5, 18], [8, 12], [10, 5]]) : 1;
    let ev = pathEval(cfg, grid, bet, { cross });
    const crossed = cross > 1 && ev.lines.some(l => l.n === 5);
    if (crossed) {
        kinds.push("bridge"); feat(cfg, "bridge");
        phases.push({ t: "fx", name: "bridge" });
        phases.push({ t: "banner", text: `🌉 CROSSING BONUS x${cross}! 🌉`, cls: "bonus" });
        ev = pathEval(cfg, grid, bet, { cross });
    }
    const w0 = winP(phases, cfg, ev, crossed ? `🌉 CROSSING x${cross}` : "");
    const baseWin = crossed ? 0 : w0;
    endFeat();
    if (doCrumble) {
        kinds.push("crumble"); feat(cfg, "crumble");
        const win = cellSet(ev);
        const gone = cellsAll(grid).filter(([c, r]) => !win.has(key(c, r)) && grid[c][r] !== "ZG");
        phases.push({ t: "fx", name: "crumble" });
        phases.push({ t: "clear", cells: gone });
        const over = { W: 1.4 };
        for (const l of ev.lines) over[l.sym] = 9;
        const g = clone(grid);
        for (const [c, r] of gone) g[c][r] = one(cfg, over);
        phases.push({ t: "drop", grid: clone(g), up: true });
        const e2 = pathEval(cfg, g, bet, { cross });
        if (e2.win > ev.win) phases.push({ t: "win", cells: e2.lines.flatMap(l => l.cells), win: e2.win - ev.win, text: `🪨 CRUMBLING TILES · 황금 룬 · ${txt(cfg, e2)}` });
        grid = g;
    }
    if (doGate) {
        kinds.push("gate"); feat(cfg, "gate");
        phases.push({ t: "fx", name: "gate" });
        const SEG = ["10x", "MINI", "20x", "MINOR", "15x", "MAXI", "50x", "MAJOR", "25x", "RAINBOW", "8x", "GRAND"];
        const WT = [14, 14, 9, 7, 11, 4, 3, 1.2, 6, 0.25, 15, 0.35];
        let idx = pickW(SEG.map((_, i) => [i, WT[i]]));
        const ft = forcedTier(cfg, force);
        if (ft) idx = SEG.indexOf(jpName(cfg, ft));
        phases.push({ t: "wheel", seg: SEG, idx, title: "⛩️ GATEKEEPER'S TOLL" });
        const seg = SEG[idx];
        if (seg.endsWith("x")) phases.push({ t: "win", cells: [], win: cash(cfg, bet, +seg.slice(0, -1)), text: `⛩️ GATEKEEPER'S TOLL ${seg}` });
        else { const t = seg === "RAINBOW" ? "VAULT" : seg; pushJp(phases, cfg, ctx, ft || gate(cfg, t, bet)); }
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🚀 Orbital Launch — 5 launch tubes, 243 ways, no jackpots
// =====================================================================
const UP = ["L3", "L2", "L1", "H4", "H3", "H2", "H1", "W"];
function orbital(cfg, ctx) {
    const { bet } = ctx, { hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doMoon = hit("moonshot"), doThr = !doMoon && hit("thruster"), doStage = !doMoon && !doThr && hit("stage");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doMoon) inject(grid, "ZF", 3); else scatterTease(grid, "ZF", false, 5);
    if (doStage && !waysEval(cfg, grid, bet).win) grid = forceRun(cfg, grid, anyPay(cfg), 3).grid;
    const phases = [spinPhase(grid, "ZF", doMoon)];
    if (doThr) {
        kinds.push("thruster"); feat(cfg, "thruster");
        const c = ri(5);
        phases.push({ t: "fx", name: "thruster", col: c });
        grid[c] = grid[c].map(s => UP.includes(s) ? UP[Math.min(UP.length - 1, UP.indexOf(s) + 1)] : s);
        phases.push({ t: "morph", grid: clone(grid), cells: [0, 1, 2].map(r => [c, r]), fx: "evolve", text: `🔥 THRUSTER BOOST! ${c + 1}번 튜브의 심볼이 한 단계씩 업그레이드!` });
    }
    let ev = waysEval(cfg, grid, bet);
    if (doThr) ({ grid, ev } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "🔥 추진기가 한 번 더 점화!"));
    const w0 = winP(phases, cfg, ev, doThr ? "🔥 THRUSTER" : "");
    const baseWin = doThr ? 0 : w0;
    endFeat();
    if (doStage && ev.win) {
        kinds.push("stage"); feat(cfg, "stage");
        phases.push({ t: "fx", name: "stage" });
        phases.push({ t: "clear", cells: [0, 1, 2, 3, 4].map(c => [c, 2]) });
        let g = grid.map(col => [one(cfg), col[0], col[1]]);
        let e = waysEval(cfg, g, bet);
        if (!e.win) { g = forceRun(cfg, g, ev.lines[0].sym, 3).grid; e = waysEval(cfg, g, bet); }
        phases.push({ t: "drop", grid: clone(g) });
        winP(phases, cfg, e, "🚀 STAGE SEPARATION");
        grid = g;
    }
    if (doMoon) {
        kinds.push("moonshot"); feat(cfg, "moonshot");
        const STEPS = [5, 8, 10, 15, 20, 30, 50, 100];
        const idx = force === "moonshot:max" ? 7 : pickW([[0, 26], [1, 22], [2, 18], [3, 13], [4, 10], [5, 6], [6, 3.5], [7, 1.5]]);
        phases.push({ t: "banner", text: "🌕 MOONSHOT BONUS 🌕", cls: "bonus" });
        phases.push({ t: "tap", mode: "gauge", title: "⛽ 게이지를 탭해 멈춰라! 멈춘 만큼 로켓이 날아간다", icon: "🚀", steps: STEPS.map(x => "x" + x), stop: idx, items: [{ text: "x" + STEPS[idx], cls: "jp" }] });
        phases.push({ t: "win", cells: [], win: cash(cfg, bet, STEPS[idx]), text: `🌕 MOONSHOT x${STEPS[idx]}` });
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// ✨ Constellation Weaver — 20 stars (5x4), constellations of 4+ (8-way)
// =====================================================================
const SHAPES = { TRIANGLE: [[1, 0], [0, 1], [2, 1]], DIAMOND: [[1, 0], [0, 1], [2, 1], [1, 2]] };
const starEval = (cfg, g, bet, o = {}) => clusterEval(cfg, g, bet, { min: 4, diag: true, ...o });
function constellation(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doNova = hit("supernova"), doZod = !doNova && hit("zodiac"), doMet = !doNova && !doZod && hit("meteor");
    let grid = draw(cfg, 5, 4);
    const points = addPoints(grid);
    const kinds = [];
    if (doNova) inject(grid, "ZN", 3); else scatterTease(grid, "ZN", false, 5);
    let lock = [], shape = null, s0 = null;
    if (doZod) {
        shape = R() < 0.5 ? "TRIANGLE" : "DIAMOND"; s0 = anyHigh(cfg);
        const c0 = ri(3), r0 = ri(shape === "TRIANGLE" ? 3 : 2);
        lock = SHAPES[shape].map(([dc, dr]) => [c0 + dc, r0 + dr]);
        for (const [c, r] of lock) grid[c][r] = s0;
    }
    const phases = [spinPhase(grid, "ZN", doNova)];
    if (doMet) {
        kinds.push("meteor"); feat(cfg, "meteor");
        const n = 2 + ri(3);
        let cells = [];
        for (let g = 0; g < 30 && cells.length < n; g++) {
            const [dc, dr] = [[1, 0], [1, 1], [1, -1], [0, 1]][ri(4)];
            let c = ri(5), r = ri(4); cells = [];
            while (cells.length < n && c >= 0 && c < 5 && r >= 0 && r < 4) { cells.push([c, r]); c += dc; r += dr; }
        }
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "fx", name: "shootingstar" });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🌠 SHOOTING STAR WILDS! 유성이 WILD 별 ${cells.length}개를 남겼다!` });
    }
    let ev = starEval(cfg, grid, bet);
    if (doMet) ({ grid, ev } = ensureGroup(cfg, grid, g => starEval(cfg, g, bet), phases, "🌠 별빛이 이어진다!", 4));
    const w0 = winP(phases, cfg, ev, doMet ? "🌠 SHOOTING STAR" : "");
    const baseWin = doMet ? 0 : w0;
    endFeat();
    if (doZod) {
        kinds.push("zodiac"); feat(cfg, "zodiac");
        phases.push({ t: "fx", name: "zodiac" });
        phases.push({ t: "badge", cells: lock.map(([c, r]) => ({ c, r, text: "🔒", cls: "frozen" })) });
        phases.push({ t: "banner", text: `♈ ZODIAC LOCK · ${shape} · FREE RESPIN ♈`, cls: "bonus" });
        const g = draw(cfg, 5, 4, { [s0]: 7, W: 0.9 });
        for (const [c, r] of lock) g[c][r] = s0;
        phases.push({ t: "spin", grid: clone(g), frozen: lock });
        ({ grid, ev } = ensureGroup(cfg, g, x => starEval(cfg, x, bet), phases, "♈ 별자리가 완성된다!", 4, { start: lock[0], sym: s0 }));
        winP(phases, cfg, ev, "♈ ZODIAC RESPIN");
    }
    if (doNova) {
        kinds.push("supernova"); feat(cfg, "supernova");
        phases.push({ t: "fx", name: "supernova" });
        phases.push({ t: "banner", text: "🌌 SUPERNOVA PICK 🌌", cls: "jackpot" });
        const r = tapBonus(cfg, ctx, phases, { mode: "grid", title: "🔮 초신성이 터지기 전에 맥동하는 오브를 탭!", icon: "🔮", n: 3 + ri(6), jpChance: 0.3, tw: F.supernova.tw, tier: forcedTier(cfg, force), tail: { text: "💥 SUPERNOVA!", cls: "bad" } });
        payTap(phases, cfg, ctx, r, "🌌 SUPERNOVA 오브 수집");
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: 0, lines: ev.lines });
}

// =====================================================================
// 🪐 Cosmic Tide — 5x5 round lake, groups of 5+ (8-way), rings
// =====================================================================
const lakeEval = (cfg, g, bet, o = {}) => clusterEval(cfg, g, bet, { min: 5, diag: true, ...o });
const inner = ([c, r]) => c >= 1 && c <= 3 && r >= 1 && r <= 3;
function tide(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doDive = hit("dive"), doEcho = !doDive && hit("echo"), doKoi = !doDive && !doEcho && hit("koi");
    let grid = draw(cfg, 5, 5);
    const points = addPoints(grid);
    const kinds = [];
    if (doDive) inject(grid, "ZS", 3); else scatterTease(grid, "ZS", false, 5);
    let s0 = null;
    if (doEcho) {
        s0 = anyHigh(cfg);
        const ring = cellsAll(grid).filter(x => inner(x) && !(x[0] === 2 && x[1] === 2));
        for (const [c, r] of [[2, 2], ...shuffle(ring).slice(0, 4)]) grid[c][r] = s0;
    }
    const phases = [spinPhase(grid, "ZS", doDive)];
    let ev = lakeEval(cfg, grid, bet);
    const baseWin = winP(phases, cfg, ev);
    endFeat();
    if (doEcho) {
        kinds.push("echo"); feat(cfg, "echo");
        const L = ev.lines.find(l => l.sym === s0) || ev.lines[0];
        if (L) {
            const out = [];
            for (const [c, r] of L.cells) if (inner([c, r]) && !(c === 2 && r === 2)) { const oc = 2 + 2 * (c - 2), or = 2 + 2 * (r - 2); if (grid[oc][or] !== "ZS") { grid[oc][or] = L.sym; out.push([oc, or]); } }
            phases.push({ t: "fx", name: "ripple" });
            phases.push({ t: "morph", grid: clone(grid), cells: out, fx: "flare", text: "〰️ RIPPLE ECHO! 안쪽 고리의 당첨이 바깥 고리로 복사된다!" });
            phases.push({ t: "win", cells: [...L.cells, ...out], win: cash(cfg, bet, cfg.syms[L.sym].pay[Math.min(L.cells.length - 5, cfg.syms[L.sym].pay.length - 1)] * (L.mult || 1)), text: `〰️ RIPPLE ECHO · ${name(cfg, L.sym)} 2배 지급` });
        }
    }
    if (doKoi) {
        kinds.push("koi"); feat(cfg, "koi");
        const cells = shuffle(cellsAll(grid).filter(([c, r]) => grid[c][r] !== "ZS")).slice(0, 3 + ri(3));
        phases.push({ t: "tap", mode: "fall", title: "🐟 물결이 잦아들기 전에 우주 잉어를 탭!", icon: "🐟", items: cells.map(() => ({ text: "STICKY WILD", cls: "jp" })) });
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🐟 BIOLUMINESCENT SURGE! 잉어 ${cells.length}마리가 스티키 WILD로!` });
        let e1 = lakeEval(cfg, grid, bet);
        if (e1.win <= ev.win) { const f = forceGroup(cfg, grid, 5, { start: cells[0] }); grid = f.grid; phases.push({ t: "morph", grid: clone(grid), cells: f.changed, fx: "evolve", text: "🐟 잉어 떼가 몰려든다!" }); e1 = lakeEval(cfg, grid, bet); }
        if (e1.win > ev.win) phases.push({ t: "win", cells: e1.lines.flatMap(l => l.cells), win: e1.win - ev.win, text: "🐟 SURGE WILDS" });
        for (let k = 0; k < 2; k++) {
            phases.push({ t: "hud", text: `SURGE RESPIN ${k + 1} / 2` });
            const g = draw(cfg, 5, 5);
            for (const [c, r] of cells) g[c][r] = "W";
            phases.push({ t: "spin", grid: clone(g), frozen: cells });
            ev = lakeEval(cfg, g, bet);
            winP(phases, cfg, ev, "🐟 SURGE RESPIN");
            grid = g;
        }
        phases.push({ t: "hud", text: "" });
    }
    if (doDive) {
        kinds.push("dive"); feat(cfg, "dive");
        phases.push({ t: "fx", name: "dive" });
        phases.push({ t: "banner", text: "🛟 DEEP DIVE BONUS 🛟", cls: "jackpot" });
        const r = tapBonus(cfg, ctx, phases, { mode: "grid", title: "🦪 호수가 빠졌다! 빛나는 조개를 탭!", icon: "🦪", n: 6 + ri(4), jpChance: 0.3, tw: F.dive.tw, tier: forcedTier(cfg, force) });
        payTap(phases, cfg, ctx, r, "🛟 DEEP DIVE 조개 상금");
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: 0, lines: ev.lines });
}

// =====================================================================
// 🎏 Koi in the Clouds — 12 koi (4x3), 81 ways
// =====================================================================
function koi(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doFr = hit("frenzy"), doDr = !doFr && hit("dragon"), doLo = !doFr && !doDr && hit("lotus");
    let grid = draw(cfg, 4, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doFr) inject(grid, "ZP", 3); else scatterTease(grid, "ZP", false, 4);
    if (doLo && !waysEval(cfg, grid, bet).win) grid = forceRun(cfg, grid, anyPay(cfg), 3).grid;
    const phases = [spinPhase(grid, "ZP", doFr)];
    if (doDr) {
        kinds.push("dragon"); feat(cfg, "dragon");
        const c = ri(3), r = ri(2), cells = [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]];
        for (const [x, y] of cells) grid[x][y] = "W";
        phases.push({ t: "fx", name: "dragongate" });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: "🐉 DRAGON GATE LEAP! 황금 잉어가 폭포를 넘어 2x2 DRAGON WILD로!" });
    }
    let m = 1;
    if (doLo) {
        kinds.push("lotus"); feat(cfg, "lotus");
        m = pickW([[2, 40], [3, 25], [5, 20], [8, 10], [10, 5]]);
        const [c, r] = cellsAll(grid)[ri(12)];
        phases.push({ t: "fx", name: "lotus" });
        phases.push({ t: "badge", cells: [{ c, r, text: `🪷x${m}`, cls: "mult" }] });
    }
    let ev = waysEval(cfg, grid, bet, { scale: m });
    if (doDr) ({ grid, ev } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "🐉 용이 한 번 더 꼬리를 친다!"));
    const w0 = winP(phases, cfg, ev, doLo ? `🪷 LOTUS BLOOM x${m}` : doDr ? "🐉 DRAGON WILD" : "");
    const baseWin = doLo || doDr ? 0 : w0;
    endFeat();
    if (doFr) {
        kinds.push("frenzy"); feat(cfg, "frenzy");
        phases.push({ t: "fx", name: "frenzy" });
        phases.push({ t: "banner", text: "🍡 FEEDING FRENZY 🍡", cls: "jackpot" });
        const r = tapBonus(cfg, ctx, phases, { mode: "rapid", title: "🍡 빠르게 탭! 잉어가 물 때마다 상금", icon: "🎏", n: 8 + ri(7), vals: SMALL, jpChance: 0.3, tw: F.frenzy.tw, tier: forcedTier(cfg, force) });
        payTap(phases, cfg, ctx, r, "🍡 FEEDING FRENZY");
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: 0, lines: ev.lines });
}

// =====================================================================
// 🎯 Chain Reaction — 4x4 bumper tiles lit by an energy ball
// =====================================================================
const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function ballPath(len, start, distinct = 0) {
    const out = [start], seen = new Set([key(...start)]);
    let [c, r] = start;
    for (let g = 0; out.length < len && g < 80; g++) {
        const opts = NB8.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < 4 && y < 4 && !(out.length >= 2 && x === out[out.length - 2][0] && y === out[out.length - 2][1]) && (out.length >= distinct || !seen.has(key(x, y))));
        if (!opts.length) break;
        [c, r] = opts[ri(opts.length)]; out.push([c, r]); seen.add(key(c, r));
    }
    return out;
}
// combo meter: every bounce on the same symbol as the previous one doubles (max x32)
function comboOf(g, path) {
    const steps = [];
    let run = 1, best = 1;
    for (let i = 0; i < path.length; i++) {
        const [c, r] = path[i];
        if (i && g[c][r] === g[path[i - 1][0]][path[i - 1][1]] && !/^Z|^P$/.test(g[c][r])) run++; else run = 1;
        best = Math.max(best, run); steps.push(Math.min(32, 2 ** (run - 1)));
    }
    return { steps, mult: Math.min(32, 2 ** (best - 1)) };
}
function chainEval(cfg, g, bet, lit, { scale = 1 } = {}) {
    const lines = [];
    let total = 0;
    for (const s of payKeys(cfg)) {
        const cells = lit.filter(([c, r]) => g[c][r] === s || isW(g[c][r]));
        if (cells.length < 3 || !cells.some(([c, r]) => g[c][r] === s)) continue;
        const pay = cfg.syms[s].pay[Math.min(cells.length, 8) - 3];
        const v = cash(cfg, bet, pay * scale);
        lines.push({ sym: s, n: cells.length, ways: 1, mult: scale, win: v, cells, cluster: true }); total += v;
    }
    return { win: total, lines, five: lines.filter(l => l.n >= 6).length };
}
const uniq = cells => [...new Set(cells.map(([c, r]) => key(c, r)))].map(split);
function chain(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doSurge = hit("surge"), doCombo = !doSurge && hit("combo"), doMulti = !doSurge && !doCombo && hit("multiball");
    const grid = draw(cfg, 4, 4);
    const points = addPoints(grid);
    const kinds = [];
    const L = doCombo ? (force === "combo:max" ? 6 : pickW([[3, 45], [4, 30], [5, 17], [6, 8]])) : 0;
    let path = [];
    for (let g = 0; g < 50 && path.length < Math.max(L, 4); g++) path = ballPath(Math.max(6 + ri(5), L + 1), [3, ri(4)], L);
    if (doCombo) { const s = anyPay(cfg); for (let i = 0; i < L; i++) grid[path[i][0]][path[i][1]] = s; }
    let balls = [path];
    if (doMulti) {
        const at = path[1 + ri(path.length - 1)];
        grid[at[0]][at[1]] = "ZS";
        balls.push(ballPath(5 + ri(4), at), ballPath(5 + ri(4), at));
    }
    const phases = [{ t: "spin", grid: clone(grid), antic: [], near: null }];
    const cb = comboOf(grid, path);
    phases.push({ t: "ball", paths: [path], combo: cb.steps });
    if (doMulti) {
        kinds.push("multiball"); feat(cfg, "multiball");
        phases.push({ t: "fx", name: "multiball" });
        phases.push({ t: "ball", paths: balls.slice(1), keep: true });
    }
    const lit = uniq(balls.flat());
    if (doMulti && !chainEval(cfg, grid, bet, lit).win) {
        const s = anyPay(cfg), cells = shuffle(lit.filter(([c, r]) => !/^Z/.test(grid[c][r]))).slice(0, 3);
        for (const [c, r] of cells) grid[c][r] = s;
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "evolve", text: "🎱 멀티볼이 범퍼를 같은 색으로 물들였다!" });
    }
    if (doCombo) { kinds.push("combo"); feat(cfg, "combo"); phases.push({ t: "fx", name: "combo" }); }
    const ev = chainEval(cfg, grid, bet, lit, { scale: cb.mult });
    const w0 = winP(phases, cfg, ev, cb.mult > 1 ? `🔗 COMBO x${cb.mult}` : "");
    const baseWin = doCombo || doMulti ? 0 : w0;
    endFeat();
    // town battery (cosmetic until POWER SURGE fires — it can fire at any charge)
    state.batt = Math.min(9, (state.batt || 0) + (lit.length >= 7 && R() < 0.4 ? 1 : 0));
    let five = ev.five;
    if (doSurge) {
        kinds.push("surge_free"); feat(cfg, "surge");
        phases.push({ t: "meter", key: "batt", value: 10, max: 10 });
        phases.push({ t: "fx", name: "surge" });
        const all = cellsAll(grid);
        const r = freeLoop(cfg, ctx, phases, {
            n: F.surge.shots || 5, title: "🔋 POWER SURGE · 5 SHOTS · 모든 타일 점등! 🔋", mode: "surge-mode",
            drawFn: () => draw(cfg, 4, 4, { W: 0.9 }),
            evalFn: g => chainEval(cfg, g, bet, all)
        });
        five += r.five;
        state.batt = 0;
    }
    phases.push({ t: "meter", key: "batt", value: state.batt, max: 10 });
    endFeat();
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: [], five, lines: ev.lines });
}

// =====================================================================
// 🏛️ Gladiator's Arena — 5x3 shield wall, 25 lines
// =====================================================================
function arena(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doCh = hit("chariot"), doSh = !doCh && hit("shield"), doTh = !doCh && !doSh && hit("thumb");
    let grid = draw(cfg, 5, 3);
    if (doTh) for (let g = 0; g < 40 && linesEval(cfg, grid, bet).win; g++) grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doCh) inject(grid, "ZC", 3); else scatterTease(grid, "ZC", false, 5);
    let s0 = null, wall = [];
    if (doSh) { s0 = anyHigh(cfg); const r = ri(3), c0 = ri(3); wall = [0, 1, 2].map(i => [c0 + i, r]); for (const [c, rr] of wall) grid[c][rr] = s0; }
    const phases = [spinPhase(grid, "ZC", doCh)];
    let ev = linesEval(cfg, grid, bet);
    let baseWin = winP(phases, cfg, ev);
    endFeat();
    if (doTh) {
        kinds.push("thumb"); feat(cfg, "thumb");
        phases.push({ t: "tap", mode: "single", title: "👑 황제가 나타났다! 탭해서 엄지 척!", icon: "👑", items: [{ text: "👍 THUMBS UP!", cls: "jp" }] });
        const cells = shuffle(cellsAll(grid).filter(([c, r]) => /^L/.test(grid[c][r]))).slice(0, 2 + ri(3));
        for (const [c, r] of cells) grid[c][r] = "W";
        if (!linesEval(cfg, grid, bet).win) for (let c = 0; c < 3; c++) { grid[c][1] = "W"; cells.push([c, 1]); }
        phases.push({ t: "fx", name: "thumb" });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `👍 EMPEROR'S THUMB! 꽝 무기 ${cells.length}개가 황금 월계관 WILD로!` });
        ev = linesEval(cfg, grid, bet);
        winP(phases, cfg, ev, "👍 EMPEROR'S THUMB");
    }
    if (doSh) {
        kinds.push("shield"); feat(cfg, "shield");
        phases.push({ t: "fx", name: "shieldwall" });
        phases.push({ t: "badge", cells: wall.map(([c, r]) => ({ c, r, text: "🔒", cls: "frozen" })) });
        phases.push({ t: "banner", text: `🛡️ SHIELD WALL · ${name(cfg, s0)} MEGA 심볼 확정 스핀 🛡️`, cls: "bonus" });
        const g = draw(cfg, 5, 3);
        for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) g[c][r] = s0;
        phases.push({ t: "spin", grid: clone(g), hold: [0, 1, 2] });
        phases.push({ t: "mega", cols: [0, 1, 2], sym: s0 });
        ev = linesEval(cfg, g, bet);
        winP(phases, cfg, ev, "🛡️ MEGA SHIELD");
        grid = g;
    }
    if (doCh) {
        kinds.push("chariot"); feat(cfg, "chariot");
        const place = force === "chariot:1" ? 1 : pickW([[1, 18], [2, 40], [3, 42]]);
        phases.push({ t: "fx", name: "chariot" });
        phases.push({ t: "banner", text: "🏇 CHARIOT RACE 🏇", cls: "jackpot" });
        phases.push({ t: "tap", mode: "race", title: "🏇 채찍을 연타! 라이벌 2대와 전차 경주", icon: "🏇", place, items: [{ text: `${place}등!`, cls: place === 1 ? "jp" : "ok" }] });
        const x = [0, 20, 10, 5][place];
        phases.push({ t: "win", cells: [], win: cash(cfg, bet, x), text: `🏇 CHARIOT RACE ${place}등 상금 x${x}` });
        if (place === 1) pushJp(phases, cfg, ctx, pickTier(cfg, ctx, F.chariot.tw));
    }
    endFeat();
    if (doTh) baseWin = 0;
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// ❗ Quest Giver's Gold — 15 villagers (5x3), 243 ways
// =====================================================================
function quest(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doRaid = hit("raid"), doQuest = !doRaid && hit("quest"), doHag = !doRaid && !doQuest && hit("haggle");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doRaid) inject(grid, "ZX", 3); else scatterTease(grid, "ZX", false, 5);
    if (doHag) grid = forceRun(cfg, grid, pickW([["L1", 1], ["L2", 1], ["L3", 1]]), 3).grid;
    state.hour = ((state.hour ?? 8) + 1) % 24;
    const phases = [{ ...spinPhase(grid, "ZX", doRaid), hour: state.hour }];
    if (doQuest) {
        kinds.push("quest"); feat(cfg, "quest");
        const [hc, hr] = [1 + ri(3), ri(3)];
        phases.push({ t: "badge", cells: [{ c: hc, r: hr, text: "⚔️💬", cls: "val" }, { c: hc + (R() < 0.5 ? -1 : 1), r: hr, text: "👾💬", cls: "val" }] });
        phases.push({ t: "fx", name: "quest" });
        const cells = shuffle(cellsAll(grid).filter(([c, r]) => c >= 1 && c <= 3 && !/^Z/.test(grid[c][r]))).slice(0, 1 + ri(3));
        for (const [c, r] of cells) grid[c][r] = pickW([["W2", 70], ["W3", 30]]);
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `⚔️ QUEST COMPLETE! 전사가 보물상자 WILD ${cells.length}개를 떨어뜨렸다!` });
    }
    let ev = waysEval(cfg, grid, bet);
    if (doQuest) ({ grid, ev } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "⚔️ 보상 아이템이 하나 더!"));
    const w0 = winP(phases, cfg, ev, doQuest ? "⚔️ QUEST REWARD" : "");
    const baseWin = doQuest ? 0 : w0;
    endFeat();
    if (doHag && ev.win) {
        kinds.push("haggle"); feat(cfg, "haggle");
        const M = [[2, 40], [3, 28], [5, 18], [10, 10], [20, 4]];
        const m = pickW(M), rest = [pickW(M), pickW(M)];
        phases.push({ t: "fx", name: "haggle" });
        phases.push({ t: "pickn", title: `💰 MERCHANT HAGGLING · 당첨 ${short(ev.win)} G를 상자와 교환!`, n: 3, k: 1, icon: "📦", reveals: [{ text: `x${m}`, cls: m >= 5 ? "jp" : "ok" }], rest: rest.map(x => ({ text: `x${x}` })) });
        phases.push({ t: "win", cells: [], win: ev.win * (m - 1), text: `💰 MERCHANT HAGGLING x${m}` });
    }
    if (doRaid) {
        kinds.push("raid"); feat(cfg, "raid");
        phases.push({ t: "fx", name: "raid" });
        phases.push({ t: "banner", text: "❗ BOSS RAID ❗", cls: "jackpot" });
        const ft = forcedTier(cfg, force), jpHoard = ft || R() < 0.3;
        const hoardTier = jpHoard ? ft || pickTier(cfg, ctx, F.raid.tw) : null, hoardX = jpHoard ? 0 : pickW([[15, 40], [20, 30], [30, 20], [50, 10]]);
        const r = tapBonus(cfg, ctx, phases, { mode: "boss", title: "🐉 드래곤을 연타 공격! 때릴 때마다 코인", icon: "🐉", n: 6 + ri(6), vals: SMALL, tail: { text: hoardTier ? `💰 HOARD · ${jpName(cfg, hoardTier)}` : `💰 HOARD x${hoardX}`, cls: "jp" } });
        payTap(phases, cfg, ctx, r, "❗ BOSS RAID 타격 코인");
        if (hoardX) phases.push({ t: "win", cells: [], win: cash(cfg, bet, hoardX), text: `🐉 드래곤의 보물 더미 x${hoardX}` });
        if (hoardTier) pushJp(phases, cfg, ctx, hoardTier);
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🛗 Cloudscraper Climb — 3x5 glass cab, 243 ways
// =====================================================================
function climb(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doParty = hit("party"), doLift = !doParty && hit("lift"), doWash = !doParty && !doLift && hit("washer");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doParty) inject(grid, "ZK", 3); else scatterTease(grid, "ZK", false, 5);
    state.floor = 10 + ri(190);
    const phases = [{ ...spinPhase(grid, "ZK", doParty), floor: state.floor }];
    if (doLift) {
        kinds.push("lift"); feat(cfg, "lift");
        const cells = cellsAll(grid).filter(([c, r]) => /^L/.test(grid[c][r]));
        for (const [c, r] of cells) grid[c][r] = anyHigh(cfg);
        phases.push({ t: "fx", name: "lift" });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "evolve", text: `⬆️ EXPRESS LIFT! 캡슐이 펜트하우스로 — 저배당 ${cells.length}개가 명품 심볼로!` });
    }
    let ev = waysEval(cfg, grid, bet);
    if (doLift) ({ grid, ev } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "⬆️ 펜트하우스 라운지 오픈!", 3, anyHigh(cfg)));
    const w0 = winP(phases, cfg, ev, doLift ? "⬆️ EXPRESS LIFT" : "");
    const baseWin = doLift ? 0 : w0;
    endFeat();
    if (doWash) {
        kinds.push("washer"); feat(cfg, "washer");
        const c = 1 + ri(3), win = cellSet(ev);
        const cells = [0, 1, 2].filter(r => !win.has(key(c, r)) && !/^Z/.test(grid[c][r])).map(r => [c, r]);
        phases.push({ t: "fx", name: "washer", col: c });
        for (const [x, y] of cells) grid[x][y] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🧽 WINDOW WASHER! 로봇이 ${c + 1}번 열의 유리창 ${cells.length}장을 닦아 WILD 공개!` });
        let e2 = waysEval(cfg, grid, bet);
        if (e2.win <= ev.win) { const f = forceRun(cfg, grid, anyPay(cfg), Math.max(3, c + 1)); grid = f.grid; phases.push({ t: "morph", grid: clone(grid), cells: f.changed, fx: "evolve", text: "🧽 반짝반짝! 유리창 너머 심볼이 맞춰진다" }); e2 = waysEval(cfg, grid, bet); }
        if (e2.win > ev.win) phases.push({ t: "win", cells: e2.lines.flatMap(l => l.cells), win: e2.win - ev.win, text: `🧽 WASHER WILDS · ${txt(cfg, e2)}` });
        ev = e2;
    }
    let five = ev.five;
    if (doParty) {
        kinds.push("party_free"); feat(cfg, "party");
        phases.push({ t: "fx", name: "party" });
        const n = F.party.spins || 7;
        const inc = Array.from({ length: n }, () => pickW([[1, 70], [2, 30]]));
        phases.push({ t: "tap", mode: "grid", title: "🍾 샴페인을 탭해 코르크를 터뜨려라! (프리스핀 배수)", icon: "🍾", items: inc.map(x => ({ text: `+${x}x`, cls: x > 1 ? "jp" : "ok" })) });
        let m = 1;
        const r = freeLoop(cfg, ctx, phases, {
            n, title: `🔑 PENTHOUSE PARTY · ${n} FREE SPINS 🔑`,
            drawFn: () => draw(cfg, 5, 3, { W: [0, 1.8, 1.8, 1.8, 0] }),
            evalFn: (g, i) => { m += inc[i] || 0; phases.push({ t: "hud", text: `🍾 PARTY x${m}` }); const e = waysEval(cfg, g, bet, { scale: m }); e.prefix = `🍾 x${m}`; return e; }
        });
        five += r.five;
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

const wrap = fn => (cfg, ctx) => { endFeat(); try { return fn(cfg, ctx); } finally { endFeat(); } };
export const SKY_MACHINES = Object.fromEntries(Object.entries({
    sp_cumulus: cumulus, sp_aero: aero, sp_crossing: crossing, sp_orbital: orbital, sp_constellation: constellation,
    sp_tide: tide, sp_koi: koi, sp_chain: chain, sp_arena: arena, sp_quest: quest, sp_climb: climb
}).map(([k, fn]) => [k, wrap(fn)]));
