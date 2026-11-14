// =====================================================================
// The 11 round-9 machines (configs: js/slots/wonderConfigs.js, renderer:
// js/screens/slotSpecial.js). Same contract as realmEngine.js: each spin
// first rolls which features hit (features.*.p × pet luck, or the practice
// room `force`), then builds grids that explain the result and returns a
// `phases` script. Tap / pick bonuses are decided here too — taps only
// reveal the prizes, so the simulated RTP is exact.
// Shaped boards (cross cube, hex radar) mark missing cells with "_".
// =====================================================================
import { R, ri, pickW, shuffle, clone, key, draw, inject, addPoints, finish, ctl } from "./specialEngine.js";
import { waysEval, linesEval, winP, forceRun, freeLoop, cash, feat, endFeat, short, payKeys, cellsAll, name, isW, txt } from "./themeEngine.js";
import { jpName, pickTier, pushJp, forcedTier, tapBonus, payTap, scatterTease, spinPhase, tease, cellSet, split, ensureRun, anyPay, anyHigh, one, VALS, SMALL } from "./skyEngine.js";
import { isZ, extra, ensureLine, hexNb, HEXDIR } from "./realmEngine.js";

const NB8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const real = x => x && x !== "_";
const plainCells = g => cellsAll(g).filter(([c, r]) => real(g[c][r]) && !isZ(g[c][r]) && !isW(g[c][r]));
const nb8 = (g, c, r) => NB8.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < g.length && y < g[0].length && real(g[x][y]));
const offMask = (g, off) => { for (const [c, r] of off) g[c][r] = "_"; return g; };
const drawM = (cfg, C, Rn, off, over) => offMask(draw(cfg, C, Rn, over), off);
const lose = (mk, evalFn) => { let g = mk(); for (let k = 0; k < 40 && evalFn(g).win; k++) g = mk(); return g; };
// a run of `sym` on reels 1..n that only uses real (non "_", non bonus) cells
function forceRunM(cfg, g, sym, n = 3) {
    const out = clone(g), changed = [];
    for (let c = 0; c < Math.min(n, out.length); c++) {
        if (out[c].some(x => x === sym || isW(x))) continue;
        const rows = out[c].map((x, r) => r).filter(r => real(out[c][r]) && !isZ(out[c][r]));
        if (!rows.length) continue;
        const r = rows[ri(rows.length)]; out[c][r] = sym; changed.push([c, r]);
    }
    return { grid: out, changed };
}
function ensureRunM(cfg, grid, evalFn, phases, text, n = 3, sym = null) {
    const ev = evalFn(grid);
    if (ev.win) return { grid, ev };
    const f = forceRunM(cfg, grid, sym || anyPay(cfg), n);
    phases.push({ t: "morph", grid: clone(f.grid), cells: f.changed, fx: "evolve", text });
    return { grid: f.grid, ev: evalFn(f.grid) };
}
// progressive machines: the big bonus ends with a jackpot chance (always when forced)
function jpChance(cfg, ctx, phases, tw, force, p, title) {
    const ft = forcedTier(cfg, force);
    if (!ft && R() >= p) return;
    const t = ft || pickTier(cfg, ctx, tw);
    phases.push({ t: "tap", mode: "single", title, icon: "🎰", items: [{ text: jpName(cfg, t), cls: "jp" }] });
    pushJp(phases, cfg, ctx, t);
}
const out = (cfg, ctx, o) => { tease(o.phases, o.baseWin, o.kinds); return finish(cfg, ctx, { ...o, antic: o.phases[0].antic }); };

// =====================================================================
// 🎲 Chaos Cube — a Rubik's cube unfolds into a 12-tile cross (4x4 minus corners), 64 ways
// =====================================================================
// (built locally: this module is part of an import cycle, so no imported helpers at load time)
const ALL16 = Array.from({ length: 16 }, (_, i) => [i >> 2, i & 3]);
const SHAPES = {
    "✚ CROSS": [[0, 0], [0, 3], [3, 0], [3, 3]],
    "⬛ FULL CUBE": [],
    "⭕ RING": [[1, 1], [1, 2], [2, 1], [2, 2]],
    "✖️ X-GATE": ALL16.filter(([c, r]) => r !== c && r !== 3 - c),
    "🏁 CHECKER": ALL16.filter(([c, r]) => (c + r) % 2),
    "📐 STAIRS": [[0, 0], [0, 1], [1, 0], [3, 3]]
};
const CROSS = SHAPES["✚ CROSS"];
function cube(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = g => waysEval(cfg, g, bet);
    const doG = hit("glitch"), doDice = !doG && hit("dice"), doMys = !doG && !doDice && hit("mystery"), doScr = !doG && !doDice && !doMys && hit("scramble");
    let grid = doScr ? lose(() => drawM(cfg, 4, 4, CROSS), ev) : drawM(cfg, 4, 4, CROSS);
    const points = addPoints(grid);
    const kinds = [];
    if (doG) inject(grid, "ZE", 3); else scatterTease(grid, "ZE", false, 4);
    if (doDice) inject(grid, "ZD", 2);
    // Mystery Box Drop: ❓ tiles land, then all pop open as the same symbol
    let boxes = [], reveal = null;
    if (doMys) {
        boxes = shuffle(plainCells(grid)).slice(0, 3 + ri(3));
        for (const [c, r] of boxes) grid[c][r] = "ZQ";
        // the boxes reveal a symbol that pays when one exists (first paying candidate in random order)
        reveal = shuffle(payKeys(cfg)).find(s => { const g = clone(grid); for (const [c, r] of boxes) g[c][r] = s; return ev(g).win > 0; }) || anyPay(cfg);
    }
    const phases = [spinPhase(grid, "ZE", doG)];
    if (doMys) {
        kinds.push("mystery"); feat(cfg, "mystery");
        phases.push({ t: "fx", name: "mystery" });
        for (const [c, r] of boxes) grid[c][r] = reveal;
        phases.push({ t: "morph", grid: clone(grid), cells: boxes, fx: "flare", text: `❓ MYSTERY BOX DROP! 물음표 ${boxes.length}개가 한꺼번에 ${name(cfg, reveal)}(으)로!` });
        ({ grid } = ensureRunM(cfg, grid, ev, phases, "❓ 상자 하나가 더 열린다!", 3, reveal));
    }
    if (doScr) {
        kinds.push("scramble"); feat(cfg, "scramble");
        phases.push({ t: "fx", name: "portal" });
        const f = forceRunM(cfg, grid, anyPay(cfg, 1, 1), pickW([[3, 70], [4, 30]]));
        const swap = [...f.changed];
        for (const cell of shuffle(plainCells(f.grid))) { if (swap.length >= 4) break; if (!swap.some(([a, b]) => a === cell[0] && b === cell[1])) swap.push(cell); }
        grid = f.grid;
        phases.push({ t: "show", grid: clone(grid), pop: swap });
        phases.push({ t: "morph", grid: clone(grid), cells: swap, fx: "evolve", text: "🌀 DIMENSION SCRAMBLE! 포털이 열려 타일 4개가 뒤바뀌었다 — 당첨!" });
    }
    let e = ev(grid);
    if (doDice) ({ grid, ev: e } = ensureRunM(cfg, grid, ev, phases, "🎲 주사위가 굴러가며 심볼을 맞춘다!"));
    const w0 = winP(phases, cfg, e, doMys ? "❓ MYSTERY BOX" : doScr ? "🌀 SCRAMBLE" : "");
    const baseWin = doMys || doScr || doDice ? 0 : w0;
    endFeat();
    if (doDice) {
        kinds.push("dice"); feat(cfg, "dice");
        const d1 = 1 + ri(6), d2 = 1 + ri(6), m = d1 + d2;
        phases.push({ t: "fx", name: "dice" });
        phases.push({ t: "banner", text: `🎲 ${d1} + 🎲 ${d2} = x${m}!`, cls: "bonus" });
        phases.push({ t: "win", cells: e.lines.flatMap(l => l.cells), win: e.win * (m - 1), text: `🎲 DICE ROLL x${m}` });
    }
    endFeat();
    let five = e.five;
    if (doG) {
        kinds.push("glitch_free"); feat(cfg, "glitch");
        phases.push({ t: "fx", name: "glitch" });
        const names = Object.keys(SHAPES), n = F.glitch.spins || 8;
        const r = freeLoop(cfg, ctx, phases, {
            n, title: `⚠️ GLITCH FREE SPINS · ${n}회 · 매 스핀 판 모양이 바뀐다! ⚠️`, mode: "glitch-mode",
            drawFn: i => { const sh = names[ri(names.length)]; phases.push({ t: "hud", text: `⚠️ GLITCH ${i + 1} / ${n} · ${sh}` }); return drawM(cfg, 4, 4, SHAPES[sh], { W: [0, 2.5, 2.5, 0] }); },
            evalFn: g => { const x = ev(g); x.prefix = "⚠️ GLITCH"; return x; }
        });
        five += r.five;
        endFeat();
        jpChance(cfg, ctx, phases, F.glitch.tw, force, 0.3, "💥 SYSTEM CRASH! 탭해서 글리치 잭팟을 확인!");
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🗄️ Cabinet of Curiosities — 15 drawers (5x3), 243 ways, no jackpots
// =====================================================================
function curio(cfg, ctx) {
    const { bet } = ctx, { hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = g => waysEval(cfg, g, bet);
    const doV = hit("vault"), doOdd = !doV && hit("odd"), doClock = !doV && !doOdd && hit("clock"), doJar = !doV && !doOdd && !doClock && hit("jar");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doV) inject(grid, "ZM", 3); else scatterTease(grid, "ZM", false, 5);
    if (doClock) inject(grid, "ZK", 1);
    let oddAt = null;
    if (doOdd) {
        const r = ri(3), s = anyPay(cfg, 1, 4), oc = ri(5);
        for (let c = 0; c < 5; c++) grid[c][r] = c === oc ? one(cfg, { [s]: 0, W: 0 }) : s;
        oddAt = [oc, r];
    }
    let jar = null;
    if (doJar) { jar = [1 + ri(3), ri(3)]; grid[jar[0]][jar[1]] = "ZJ"; }
    const phases = [spinPhase(grid, "ZM", doV)];
    if (doJar) {
        kinds.push("jar"); feat(cfg, "jar");
        phases.push({ t: "tap", mode: "single", title: "🫙 빛나는 병을 탭! 안에 든 녀석이 튀어나온다", icon: "🫙", items: [{ text: "🦊 JUMP!", cls: "jp" }] });
        phases.push({ t: "fx", name: "taxidermy" });
        const cells = [jar, ...nb8(grid, ...jar).slice(0, 4).filter(([c, r]) => !isZ(grid[c][r]))];
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🫙 TAXIDERMY SURPRISE! 박제 여우가 튀어나와 주변 ${cells.length}칸을 WILD로!` });
        ({ grid } = ensureRun(cfg, grid, ev, phases, "🦊 여우가 한 칸 더 뛰어간다!"));
    }
    if (doOdd) {
        kinds.push("odd"); feat(cfg, "odd");
        phases.push({ t: "focus", cells: [oddAt], ms: 700 });
        phases.push({ t: "fx", name: "oddone" });
        grid[oddAt[0]][oddAt[1]] = "W5";
        phases.push({ t: "morph", grid: clone(grid), cells: [oddAt], fx: "wild", text: "🌀 ODD ONE OUT! 엉뚱한 유물 하나가 x5 WILD로 변신!" });
    }
    let e = ev(grid);
    if (doClock) ({ grid, ev: e } = ensureRun(cfg, grid, ev, phases, "🕰️ 시계 바늘이 심볼을 끌어온다!"));
    const w0 = winP(phases, cfg, e, doOdd ? "🌀 ODD ONE OUT x5" : doJar ? "🫙 TAXIDERMY" : "");
    const baseWin = doOdd || doJar || doClock ? 0 : w0;
    endFeat();
    if (doClock && e.win) {
        kinds.push("clock"); feat(cfg, "clock");
        phases.push({ t: "fx", name: "clockback" });
        phases.push({ t: "win", cells: e.lines.flatMap(l => [...l.cells].reverse()), win: e.win, text: `🕰️ BACKWARD CLOCK · 거꾸로 한 번 더! · ${txt(cfg, e)}` });
    }
    endFeat();
    if (doV) {
        kinds.push("vault"); feat(cfg, "vault");
        phases.push({ t: "fx", name: "monocle" });
        phases.push({ t: "banner", text: "🧐 CURATOR'S VAULT 🧐", cls: "jackpot" });
        const r = tapBonus(cfg, ctx, phases, { mode: "grid", title: "🎁 기묘한 벨벳 상자를 탭! 🧐 COLLECT가 나오면 끝", icon: "🎁", n: 4 + ri(6), tail: { text: "🧐 COLLECT", cls: "bad" } });
        payTap(phases, cfg, ctx, r, "🧐 CURATOR'S VAULT");
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five: e.five, lines: e.lines });
}

// =====================================================================
// 📈 Percentage Plaza — 5 ticker bars (5x3), 25 lines
// =====================================================================
function percent(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const MAX = F.compound?.max || 5;
    if (force === "compound") state.streak = Math.max(state.streak || 0, 3);
    const streak = Math.min(state.streak || 0, MAX), m = 1 + streak;
    const lev = g => linesEval(cfg, g, bet, { scale: m });
    const doA = hit("algo"), doBull = !doA && hit("bull"), doDiv = !doA && !doBull && hit("dividend");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doA) inject(grid, "ZK", 3); else scatterTease(grid, "ZK", false, 5);
    if (doBull) inject(grid, "ZA", 1);
    let pcts = [];
    if (doDiv) pcts = inject(grid, "ZP", 1 + ri(2), { avoid: c => c > 3 });
    const phases = [spinPhase(grid, "ZK", doA)];
    phases.push({ t: "meter", key: "rtp", value: streak, max: MAX });
    if (streak) phases.push({ t: "banner", text: `📊 COMPOUND INTEREST · 연속 ${streak}회 · 이번 스핀 x${m}!`, cls: "bonus" });
    if (doBull) {
        kinds.push("bull"); feat(cfg, "bull");
        const cells = cellsAll(grid).filter(([c, r]) => /^L/.test(grid[c][r]));
        phases.push({ t: "fx", name: "bull" });
        phases.push({ t: "clear", cells });
        for (const [c, r] of cells) grid[c][r] = pickW([["H1", 1], ["H2", 1.5], ["H3", 2.5], ["H4", 3]]);
        phases.push({ t: "drop", grid: clone(grid) });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `⏫ BULL MARKET SURGE! 저배당 ${cells.length}개를 밀어내고 금화로!` });
    }
    let s0 = null;
    if (doDiv) {
        kinds.push("dividend"); feat(cfg, "dividend");
        s0 = anyHigh(cfg);
        phases.push({ t: "fx", name: "pctdrop" });
        const cells = [];
        for (const [c, r] of pcts) { grid[c][r] = s0; cells.push([c, r]); if (!isZ(grid[c + 1][r])) { grid[c + 1][r] = s0; cells.push([c + 1, r]); } }
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `％ DIVIDEND DROP! % 기호가 ${name(cfg, s0)} 두 개로 분할!` });
    }
    let e = lev(grid);
    if (doBull) ({ grid, ev: e } = ensureLine(cfg, grid, bet, phases, "⏫ 금화가 한 줄로 정렬된다!", "H1"));
    if (doDiv) ({ grid, ev: e } = ensureLine(cfg, grid, bet, phases, "％ 배당금이 한 줄로 들어온다!", s0));
    if (force === "compound") ({ grid, ev: e } = ensureLine(cfg, grid, bet, phases, "📊 복리가 붙어 한 줄이 맞춰진다!"));
    if (m > 1) e = lev(grid);
    const w0 = winP(phases, cfg, e, [doBull ? "⏫ BULL SURGE" : doDiv ? "％ DIVIDEND" : "", m > 1 ? `📊 x${m}` : ""].filter(Boolean).join(" · "));
    const baseWin = doBull || doDiv ? 0 : w0;
    endFeat();
    // compound interest: every consecutive win adds +1x to the next spin; a loss resets it
    if (e.win > 0) state.streak = Math.min((state.streak || 0) + 1, MAX);
    else state.streak = 0;
    phases.push({ t: "meter", key: "rtp", value: state.streak, max: MAX });
    let five = e.five;
    if (doA) {
        kinds.push("algo_free"); feat(cfg, "algo");
        phases.push({ t: "fx", name: "server" });
        const min = 2 * bet; // the guarantee is exactly 2x the bet (not scaled by px)
        const r = freeLoop(cfg, ctx, phases, {
            n: F.algo.spins || 5, title: "🔑 ALGORITHM OVERLOAD · 5 FREE SPINS · 최소 2x 보장 🔑", mode: "algo-mode",
            drawFn: () => draw(cfg, 5, 3, { W: [0, 1.3, 1.3, 1.3, 0] }),
            evalFn: g => { const x = linesEval(cfg, g, bet); x.prefix = "🔑 ALGO"; return x; },
            after: (g, i, x) => { if (x.win < min) phases.push({ t: "win", cells: [], win: min - x.win, text: "🔑 ALGORITHM 최소 2x 보장" }); return 0; }
        });
        five += r.five;
        endFeat();
        jpChance(cfg, ctx, phases, F.algo.tw, force, 0.3, "💹 MARKET CRASH… 아니 BOOM! 탭해서 잭팟 확인");
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// ⛲ Town Square Festival — 5x4 courtyard, 1024 ways, no jackpots
// =====================================================================
const FOUNTAIN = [[1, 1], [1, 2], [2, 1], [2, 2]];
const inZone = (c, r) => FOUNTAIN.some(([a, b]) => a === c && b === r);
function festival(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doM = hit("market"), doPar = !doM && !state.parade && hit("parade"), doFw = !doM && !doPar && hit("firework"), doFt = !doM && !doPar && !doFw && hit("fountain");
    let grid = draw(cfg, 5, 4);
    const points = addPoints(grid);
    const kinds = [];
    if (doM) inject(grid, "ZT", 3); else scatterTease(grid, "ZT", false, 5);
    if (doFw) inject(grid, "ZS", 1);
    let fs = null;
    if (doFt) { // a winning run that passes through the fountain zone
        fs = anyPay(cfg, 1, 2);
        grid[0][ri(4)] = fs; grid[1][1 + ri(2)] = fs; grid[2][1 + ri(2)] = fs;
    }
    const phases = [spinPhase(grid, "ZT", doM)];
    // Street Parade: the band walks along the bottom row as wilds for 3 spins
    let parading = false;
    if (doPar) { kinds.push("parade"); state.parade = F.parade.spins || 3; phases.push({ t: "fx", name: "parade" }); phases.push({ t: "banner", text: "🎺 STREET PARADE · 3스핀 동안 WILD 행진!", cls: "bonus" }); }
    if (state.parade > 0) {
        parading = true;
        const cells = [0, 1, 2, 3, 4].filter(c => !isZ(grid[c][3])).map(c => [c, 3]);
        for (const [c] of cells) grid[c][3] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🎺 마칭 밴드가 맨 아래 줄을 행진 중! (남은 ${state.parade}스핀)` });
        state.parade--;
        phases.push({ t: "meter", key: "parade", value: state.parade, max: F.parade.spins || 3 });
    }
    let mult = null, bursts = [];
    const ev = g => waysEval(cfg, g, bet, { mult });
    if (doFw) {
        kinds.push("firework"); feat(cfg, "firework");
        ({ grid } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "🎇 불꽃이 심볼을 모은다!", 3, anyHigh(cfg)));
        const win = [...cellSet(waysEval(cfg, grid, bet))].map(split).filter(([c, r]) => !isZ(grid[c][r]));
        bursts = [win[ri(win.length)]];
        for (const cell of shuffle(cellsAll(grid))) { if (bursts.length >= 3) break; if (!bursts.some(([a, b]) => a === cell[0] && b === cell[1])) bursts.push(cell); }
        const set = new Set(bursts.map(([c, r]) => key(c, r)));
        mult = (c, r) => set.has(key(c, r)) ? 2 : 1;
        phases.push({ t: "fx", name: "firework" });
        phases.push({ t: "badge", cells: bursts.map(([c, r]) => ({ c, r, text: "x2", cls: "mult" })) });
        phases.push({ t: "banner", text: "🎇 FIREWORK FINALE · 3칸에 x2 배수!", cls: "bonus" });
    }
    let e = ev(grid);
    const w0 = winP(phases, cfg, e, doFw ? "🎇 FIREWORK x2" : parading ? "🎺 PARADE" : "");
    const baseWin = doFw || doPar ? 0 : w0;
    endFeat();
    if (doFw) phases.push({ t: "badge", cells: [] });
    if (doFt && e.lines.some(l => l.cells.some(([c, r]) => inZone(c, r)))) {
        kinds.push("fountain"); feat(cfg, "fountain");
        const zoneWin = e.lines.filter(l => l.cells.some(([c, r]) => inZone(c, r)));
        const s = zoneWin[0].sym, cells = new Map();
        for (const l of zoneWin) for (const [c, r] of l.cells) if (inZone(c, r)) for (const [x, y] of nb8(grid, c, r).slice(0, 4)) if (!isZ(grid[x][y]) && !isW(grid[x][y]) && grid[x][y] !== s) cells.set(key(x, y), [x, y]);
        const g = clone(grid);
        for (const [c, r] of cells.values()) g[c][r] = s;
        phases.push({ t: "fx", name: "splash" });
        phases.push({ t: "morph", grid: clone(g), cells: [...cells.values()], fx: "flare", text: `⛲ FOUNTAIN SPLASH! 분수 물이 튀어 주변 ${cells.size}칸이 ${name(cfg, s)}(으)로!` });
        const e2 = ev(g);
        extra(phases, cfg, e2, e, "⛲ FOUNTAIN SPLASH");
        grid = g; if (e2.win > e.win) e = e2;
        endFeat();
    }
    let five = e.five;
    if (doM) {
        kinds.push("market_free"); feat(cfg, "market");
        phases.push({ t: "fx", name: "market" });
        phases.push({ t: "banner", text: "🎟️ NIGHT MARKET BONUS 🎟️", cls: "jackpot" });
        const n = F.market.spins || 10, toks = pickW([[[5, 5], 1], [[4, 3, 3], 1], [[2, 3, 5], 1], [[10], 0.4]]);
        const items = [];
        let sum = 0;
        const stalls = 6 + ri(3);
        const at = new Set(shuffle([...Array(stalls).keys()]).slice(0, toks.length));
        let ti = 0;
        for (let i = 0; i < stalls; i++) {
            if (at.has(i)) { items.push({ text: `🎟️ +${toks[ti++]} FREE`, cls: "jp" }); continue; }
            const v = cash(cfg, bet, pickW(SMALL)); sum += v; items.push({ text: `👛 ${short(v)}`, cls: "ok" });
        }
        phases.push({ t: "tap", mode: "grid", title: "🏮 빛나는 노점을 탭! 금화 주머니와 무료스핀을 찾아라", icon: "🏮", items });
        if (sum) phases.push({ t: "win", cells: [], win: sum, text: "👛 NIGHT MARKET 금화 주머니" });
        const r = freeLoop(cfg, ctx, phases, {
            n, title: `🏮 NIGHT MARKET · ${n} FREE SPINS 🏮`, mode: "market-mode",
            drawFn: () => draw(cfg, 5, 4, { W: [0, 1.2, 1.2, 1.2, 0] }),
            evalFn: g => waysEval(cfg, g, bet)
        });
        five += r.five;
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🛰️ Mission Control — 19-hex radar dish (3-4-5-4-3 columns), clusters of 4+
// =====================================================================
const RADAR_OFF = [[0, 0], [0, 4], [1, 4], [3, 4], [4, 0], [4, 4]];
function hexClusters(cfg, g, bet, { min = 4, scale = 1, mult = null } = {}) {
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
            const m = mult ? Math.max(1, ...cells.map(([x, y]) => mult(x, y) || 1)) : 1;
            const pay = cfg.syms[s].pay[Math.min(cells.length - min, cfg.syms[s].pay.length - 1)];
            const v = cash(cfg, bet, pay * scale * m * (1 + Math.max(0, cells.length - min - 2) * 0.5));
            lines.push({ sym: s, n: cells.length, ways: 1, mult: m, win: v, cells, cluster: true }); total += v;
        }
    }
    return { win: total, lines, five: lines.filter(l => l.n >= 7).length };
}
function hexGroupM(cfg, grid, size, sym = null, start = null) {
    const g = clone(grid), s = sym || anyHigh(cfg), C = g.length, Rn = g[0].length;
    const ok = (x, y) => x >= 0 && y >= 0 && x < C && y < Rn && real(g[x][y]) && !isZ(g[x][y]);
    const pool = cellsAll(g).filter(([c, r]) => ok(c, r));
    const cells = [start && ok(...start) ? start : pool[ri(pool.length)]];
    for (let k = 0; k < 80 && cells.length < size; k++) {
        const [c, r] = cells[ri(cells.length)], nb = hexNb(c, r).filter(([x, y]) => ok(x, y) && !cells.some(([a, b]) => a === x && b === y));
        if (nb.length) cells.push(nb[ri(nb.length)]);
    }
    const changed = cells.filter(([c, r]) => !isW(g[c][r]) && g[c][r] !== s);
    for (const [c, r] of changed) g[c][r] = s;
    return { grid: g, changed };
}
function ensureHexM(cfg, grid, evalFn, phases, text, sym, start) {
    const e = evalFn(grid);
    if (e.win) return { grid, ev: e };
    const f = hexGroupM(cfg, grid, 4, sym, start);
    phases.push({ t: "morph", grid: clone(f.grid), cells: f.changed, fx: "evolve", text });
    return { grid: f.grid, ev: evalFn(f.grid) };
}
function hexBeam(g, c, r, [dc, dv]) {
    const C = g.length, Rn = g[0].length, cells = [];
    for (let k = 0; k < 6; k++) {
        if (dc === 0) r += dv;
        else { const nb = hexNb(c, r); [c, r] = dc < 0 ? (dv === "up" ? nb[2] : nb[3]) : (dv === "up" ? nb[4] : nb[5]); }
        if (c < 0 || r < 0 || c >= C || r >= Rn || !real(g[c][r])) break;
        cells.push([c, r]);
    }
    return cells;
}
function mission(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const tracks = new Map(Object.entries(state.tracks || {}));
    const doL = hit("launch"), doSat = !doL && hit("satlink"), doRov = !doL && !doSat && hit("rover"), doZ = !doL && !doSat && !doRov && hit("zerog");
    let grid = drawM(cfg, 5, 5, RADAR_OFF);
    const points = addPoints(grid);
    const kinds = [];
    if (doL) inject(grid, "ZC", 3); else scatterTease(grid, "ZC", false, 5);
    let beamCells = [], dishes = [];
    if (doSat) {
        for (let k = 0; k < 40; k++) {
            const pool = plainCells(grid), [c, r] = pool[ri(pool.length)], d = HEXDIR[ri(HEXDIR.length)];
            const b = hexBeam(grid, c, r, d);
            if (b.length < 3) continue;
            dishes = [[c, r], b.at(-1)]; beamCells = b.slice(0, -1);
            break;
        }
        for (const [c, r] of dishes) grid[c][r] = "ZS";
    }
    if (doZ && !hexClusters(cfg, grid, bet).win) grid = hexGroupM(cfg, grid, 4 + ri(2), anyPay(cfg, 1, 2)).grid;
    const phases = [spinPhase(grid, "ZC", doL)];
    // Rover Expedition: golden tyre tracks = sticky x2 for 2 spins
    if (doRov) {
        kinds.push("rover"); feat(cfg, "rover");
        let r = 1 + ri(3);
        const path = [];
        for (let c = 0; c < 5; c++) { const rows = [r, r - 1, r + 1].filter(y => y >= 0 && y < 5 && real(grid[c][y])); r = rows[0]; path.push([c, r]); r = Math.max(0, Math.min(4, r + ri(3) - 1)); }
        for (const [c, y] of path) tracks.set(key(c, y), F.rover.spins || 2);
        phases.push({ t: "fx", name: "rover" });
        phases.push({ t: "banner", text: "🛻 ROVER EXPEDITION · 황금 바퀴 자국 = 2스핀 x2!", cls: "bonus" });
        const s = anyPay(cfg, 1, 1);
        const f = hexGroupM(cfg, grid, 4, s, path[1 + ri(3)]);
        grid = f.grid;
        if (f.changed.length) phases.push({ t: "morph", grid: clone(grid), cells: f.changed, fx: "evolve", text: "🛻 탐사차가 지나간 자리에 신호가 모인다!" });
    }
    const mult = (c, r) => tracks.has(key(c, r)) ? 2 : 1;
    const ev = g => hexClusters(cfg, g, bet, { mult });
    if (tracks.size) phases.push({ t: "badge", cells: [...tracks.keys()].map(split).map(([c, r]) => ({ c, r, text: "x2", cls: "mult" })) });
    if (doSat) {
        kinds.push("satlink"); feat(cfg, "satlink");
        phases.push({ t: "focus", cells: dishes, ms: 500 });
        phases.push({ t: "fx", name: "satlaser" });
        for (const [c, r] of beamCells) if (!isZ(grid[c][r])) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells: beamCells, fx: "wild", text: `📡 SATELLITE LINK! 레이저 빔 위 ${beamCells.length}칸이 전부 WILD!` });
        ({ grid } = ensureHexM(cfg, grid, ev, phases, "📡 신호가 한 번 더 증폭된다!", null, beamCells[0]));
    }
    let e = ev(grid);
    if (doRov) ({ grid, ev: e } = ensureHexM(cfg, grid, ev, phases, "🛻 바퀴 자국 위로 심볼이 모인다!", null, [...tracks.keys()].map(split)[0]));
    const w0 = winP(phases, cfg, e, doSat ? "📡 SATELLITE LINK" : tracks.size ? "🛻 TRACKS x2" : "");
    const baseWin = doSat || doRov ? 0 : w0;
    endFeat();
    let five = e.five;
    // Zero Gravity: winners float away, new symbols drift in from all sides (no gravity)
    if (doZ && e.win) {
        kinds.push("zerog"); feat(cfg, "zerog");
        phases.push({ t: "fx", name: "zerograv" });
        let g = clone(grid), cur = e;
        for (let k = 0; k < 8 && cur.win; k++) {
            const gone = [...cellSet(cur)].map(split).filter(([c, r]) => !isZ(g[c][r]));
            phases.push({ t: "clear", cells: gone });
            const over = { W: 0.8 };
            for (const l of cur.lines) over[l.sym] = 8;
            for (const [c, r] of gone) g[c][r] = one(cfg, over);
            phases.push({ t: "show", grid: clone(g), pop: gone, ms: 450 });
            cur = ev(g);
            if (k === 0 && !cur.win) { const f = hexGroupM(cfg, g, 4, e.lines[0].sym, gone[0]); g = f.grid; phases.push({ t: "morph", grid: clone(g), cells: f.changed, fx: "flare", text: "🪐 떠다니던 심볼이 다시 뭉친다!" }); cur = ev(g); }
            five += cur.five;
            winP(phases, cfg, cur, `🪐 ZERO GRAVITY ${k + 1}`);
        }
        grid = g;
        endFeat();
    }
    // tracks age
    for (const [k, n] of [...tracks]) { if (n <= 1) tracks.delete(k); else tracks.set(k, n - 1); }
    state.tracks = Object.fromEntries(tracks);
    if (doL) {
        kinds.push("launch"); feat(cfg, "launch");
        phases.push({ t: "fx", name: "countdown" });
        phases.push({ t: "banner", text: "⏱️ DEEP SPACE LAUNCH ⏱️", cls: "jackpot" });
        const n = 4 + ri(3), items = [];
        let sum = 0, fuel = 0;
        const fuelAt = new Set(shuffle([...Array(n).keys()]).slice(0, R() < 0.5 ? 1 : 0));
        for (let i = 0; i < n; i++) {
            if (fuelAt.has(i)) { fuel++; items.push({ text: "⛽ FUEL +1x", cls: "jp" }); continue; }
            const v = cash(cfg, bet, pickW(VALS)); sum += v; items.push({ text: `🪐 ${short(v)}`, cls: "ok" });
        }
        phases.push({ t: "tap", mode: "grid", title: "🌌 성도의 행성을 탭! 연료(배수)와 즉시 상금", icon: "🪐", items });
        phases.push({ t: "win", cells: [], win: sum * (1 + fuel), text: `⏱️ DEEP SPACE LAUNCH · ⛽ x${1 + fuel}` });
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🐧 Glacier Slide — 15 penguins down 5 ice slides (5x3), 243 ways
// =====================================================================
function slide(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = g => waysEval(cfg, g, bet);
    const doAur = hit("aurora"), doIce = !doAur && hit("ice"), doSnow = !doAur && !doIce && hit("snowball"), doFish = !doAur && !doIce && !doSnow && hit("fishing");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doAur) inject(grid, "ZL", 3); else scatterTease(grid, "ZL", false, 5);
    let ice = [];
    if (doIce) ice = inject(grid, "ZI", 2 + ri(2), { avoid: c => c > 2 });
    if (doFish && !isZ(grid[2][1])) grid[2][1] = "ZA";
    const phases = [spinPhase(grid, "ZL", doAur)];
    if (doIce) {
        kinds.push("ice"); feat(cfg, "ice");
        phases.push({ t: "tap", mode: "grid", title: "🧊 얼어붙은 블록을 탭해서 깨라!", icon: "🧊", items: ice.map(() => ({ text: "🐠 GOLDEN FISH", cls: "jp" })) });
        phases.push({ t: "fx", name: "icecrack" });
        for (const [c, r] of ice) grid[c][r] = "H1";
        phases.push({ t: "morph", grid: clone(grid), cells: ice, fx: "flare", text: `🧊 ICE BLOCK SMASH! 얼음 속에서 황금 물고기 ${ice.length}마리!` });
        ({ grid } = ensureRun(cfg, grid, ev, phases, "🐠 물고기가 한 마리 더 튀어나온다!", 3, "H1"));
    }
    if (doSnow) {
        kinds.push("snowball"); feat(cfg, "snowball");
        const c0 = 1 + ri(2), r0 = ri(2), cells = [];
        for (let c = c0; c < c0 + 2; c++) for (let r = r0; r < r0 + 2; r++) if (!isZ(grid[c][r])) { grid[c][r] = "W"; cells.push([c, r]); }
        phases.push({ t: "fx", name: "snowball" });
        phases.push({ t: "block", c0, r0, n: 2, icon: "☃️", text: "2x2 SNOWBALL WILD", cls: "snow" });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: "☃️ SNOWBALL FIGHT! 눈덩이가 충돌해 거대 2x2 WILD!" });
        ({ grid } = ensureRun(cfg, grid, ev, phases, "☃️ 눈덩이가 굴러 심볼을 모은다!"));
    }
    let e = ev(grid);
    const w0 = winP(phases, cfg, e, doIce ? "🧊 ICE SMASH" : doSnow ? "☃️ SNOWBALL" : "");
    const baseWin = doIce || doSnow ? 0 : w0;
    endFeat();
    if (doFish) {
        kinds.push("fishing"); feat(cfg, "fishing");
        phases.push({ t: "focus", cells: [[2, 1]], ms: 500 });
        phases.push({ t: "fx", name: "marlin" });
        phases.push({ t: "win", cells: [[2, 1]], win: (F.fishing.x || 10) * bet, text: `⛏️ FISHING HOLE! 거대 청새치 = 베팅 ${F.fishing.x || 10}배` });
    }
    endFeat();
    let five = e.five;
    if (doAur) {
        kinds.push("aurora_free"); feat(cfg, "aurora");
        phases.push({ t: "fx", name: "aurora9" });
        const r = freeLoop(cfg, ctx, phases, {
            n: F.aurora.spins || 10, title: "🌌 AURORA FREE SPINS · 10 SLIDES · 펭귄 2배 🌌", mode: "aurora-mode",
            drawFn: () => draw(cfg, 5, 3, { W: [0, 2, 2, 2, 0], H2: 4, H4: 5 }),
            evalFn: g => {
                const x = waysEval(cfg, g, bet);
                let t = 0;
                for (const l of x.lines) { if (/peng/.test(cfg.syms[l.sym]?.cls || "")) { l.win *= 2; l.mult *= 2; } t += l.win; }
                x.win = t; x.prefix = "🌌 펭귄 x2";
                return x;
            }
        });
        five += r.five;
        endFeat();
        jpChance(cfg, ctx, phases, F.aurora.tw, force, 0.3, "🐧 펭귄이 얼음 금고를 툭! 탭해서 잭팟 확인");
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🫧 Pop Paradise — 16 bubbles (4x4), 256 ways
// =====================================================================
function pop(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = g => waysEval(cfg, g, bet);
    const doBath = hit("bath"), doPuf = !doBath && hit("puffer"), doMerge = !doBath && !doPuf && hit("merge"), doChain = !doBath && !doPuf && !doMerge && hit("chain");
    let grid = draw(cfg, 4, 4);
    const points = addPoints(grid);
    const kinds = [];
    if (doBath) inject(grid, "ZW", 3); else scatterTease(grid, "ZW", false, 4);
    let puf = null;
    if (doPuf) { puf = [1 + ri(2), 1 + ri(2)]; grid[puf[0]][puf[1]] = "ZF"; }
    if (doChain && !ev(grid).win) grid = forceRun(cfg, grid, anyPay(cfg, 1, 2), 3).grid;
    const phases = [spinPhase(grid, "ZW", doBath)];
    if (doPuf) {
        kinds.push("puffer"); feat(cfg, "puffer");
        phases.push({ t: "fx", name: "puffer" });
        const cells = nb8(grid, ...puf).filter(([c, r]) => /^L/.test(grid[c][r]));
        if (cells.length < 2) for (const cell of shuffle(nb8(grid, ...puf))) { if (cells.length >= 3) break; if (!isZ(grid[cell[0]][cell[1]]) && !cells.some(([a, b]) => a === cell[0] && b === cell[1])) cells.push(cell); }
        phases.push({ t: "clear", cells });
        for (const [c, r] of cells) grid[c][r] = "H2";
        grid[puf[0]][puf[1]] = "H2";
        phases.push({ t: "morph", grid: clone(grid), cells: [...cells, puf], fx: "flare", text: `🐡 PUFFERFISH INFLATE! 복어가 부풀어 방울 ${cells.length}개를 터뜨리고 진주로!` });
        ({ grid } = ensureRun(cfg, grid, ev, phases, "🦪 진주가 한 줄로 굴러온다!", 3, "H2"));
    }
    let mult = null, merged = [];
    if (doMerge) {
        kinds.push("merge"); feat(cfg, "merge");
        ({ grid } = ensureRun(cfg, grid, ev, phases, "🫧 방울이 서로 끌어당긴다!"));
        const e0 = ev(grid);
        // find (or make) two identical bubbles stacked in one reel of the win
        for (const l of e0.lines) {
            for (const [c, r] of l.cells) if (r < 3 && grid[c][r] === l.sym && grid[c][r + 1] === l.sym) { merged = [[c, r], [c, r + 1]]; break; }
            if (merged.length) break;
        }
        if (!merged.length) {
            const l = e0.lines[0], [c, r] = l.cells.find(([x, y]) => grid[x][y] === l.sym) || l.cells[0], r2 = r < 3 ? r + 1 : r - 1;
            if (!isZ(grid[c][r2])) { grid[c][r2] = l.sym; phases.push({ t: "morph", grid: clone(grid), cells: [[c, r2]], fx: "evolve", text: "🫧 옆 방울이 같은 색으로 물든다!" }); }
            merged = [[c, Math.min(r, r2)], [c, Math.max(r, r2)]];
        }
        const set = new Set(merged.map(([c, r]) => key(c, r)));
        mult = (c, r) => set.has(key(c, r)) ? 2 : 1;
        phases.push({ t: "fx", name: "bubmerge" });
        phases.push({ t: "badge", cells: merged.map(([c, r]) => ({ c, r, text: "x2", cls: "mult" })) });
        phases.push({ t: "banner", text: "🫧 BUBBLE MERGE · 거대 방울 x2!", cls: "bonus" });
    }
    let e = waysEval(cfg, grid, bet, { mult });
    const w0 = winP(phases, cfg, e, doMerge ? "🫧 MERGE x2" : doPuf ? "🐡 PUFFER" : "");
    const baseWin = doMerge || doPuf || doChain ? 0 : w0;
    endFeat();
    if (doMerge) phases.push({ t: "badge", cells: [] });
    let five = e.five;
    if (doChain && e.win) {
        kinds.push("chain"); feat(cfg, "chain");
        phases.push({ t: "fx", name: "chainpop" });
        let g = clone(grid), cur = e;
        for (let k = 0; k < 8 && cur.win; k++) {
            const gone = cellSet(cur);
            phases.push({ t: "clear", cells: [...gone].map(split) });
            const over = { W: 0.9 };
            for (const l of cur.lines) over[l.sym] = 7;
            for (let c = 0; c < 4; c++) { const keep = g[c].filter((_, r) => !gone.has(key(c, r))); g[c] = [...(draw(cfg, 1, 4 - keep.length, over)[0] || []), ...keep]; }
            phases.push({ t: "drop", grid: clone(g) });
            cur = ev(g);
            if (k === 0 && !cur.win) { const f = forceRun(cfg, g, e.lines[0].sym, 3); g = f.grid; phases.push({ t: "morph", grid: clone(g), cells: f.changed, fx: "flare", text: "💥 방울이 내려오며 다시 맞춰진다!" }); cur = ev(g); }
            five += cur.five;
            winP(phases, cfg, cur, `💥 CHAIN POP ${k + 1}`);
        }
        grid = g;
        endFeat();
    }
    if (doBath) {
        kinds.push("bath"); feat(cfg, "bath");
        phases.push({ t: "fx", name: "bubblebath" });
        phases.push({ t: "banner", text: "🪄 BUBBLE BATH BONUS 🪄", cls: "jackpot" });
        const r = tapBonus(cfg, ctx, phases, {
            mode: "fall", title: "🫧 10초! 현금 방울을 최대한 많이 터뜨려라!", icon: "🫧", n: 30,
            vals: [[0.2, 40], [0.5, 30], [1, 20], [2, 8], [5, 2]], jpChance: 0.3, tw: F.bath.tw, tier: forcedTier(cfg, force), extra: { sec: 10, up: true }
        });
        payTap(phases, cfg, ctx, r, "🪄 BUBBLE BATH");
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🏴‍☠️ Sunken Galleon — 15 crates (5x3), 25 lines, no jackpots
// =====================================================================
function galleon(cfg, ctx) {
    const { bet } = ctx, { hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doChest = hit("chest"), doCan = !doChest && hit("cannon"), doTen = !doChest && !doCan && hit("tentacle"), doComp = !doChest && !doCan && !doTen && hit("compass");
    let grid = doTen ? lose(() => draw(cfg, 5, 3), g => linesEval(cfg, g, bet)) : draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doChest) inject(grid, "ZK", 3); else scatterTease(grid, "ZK", false, 5);
    let comp = null;
    if (doComp) { comp = [ri(4), ri(3)]; grid[comp[0]][comp[1]] = "ZC"; }
    const phases = [spinPhase(grid, "ZK", doChest)];
    if (doCan) {
        kinds.push("cannon"); feat(cfg, "cannon");
        const cells = shuffle(plainCells(grid).filter(([c]) => c >= 1)).slice(0, 3);
        phases.push({ t: "fx", name: "cannon" });
        phases.push({ t: "clear", cells });
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: "💣 CANNONBALL BLAST! 상자 3개가 부서지고 WILD 금화가!" });
        ({ grid } = ensureLine(cfg, grid, bet, phases, "💣 금화가 굴러 한 줄을 채운다!"));
    }
    if (doTen) {
        kinds.push("tentacle"); feat(cfg, "tentacle");
        const c = 1 + ri(3), cells = [0, 1, 2].filter(r => !isZ(grid[c][r])).map(r => [c, r]);
        phases.push({ t: "fx", name: "kraken", col: c });
        phases.push({ t: "clear", cells });
        const s = pickW([["H1", 2], ["H2", 3], ["H3", 3]]);
        for (const [x, r] of cells) grid[x][r] = s;
        phases.push({ t: "drop", grid: clone(grid) });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🐙 TENTACLE GRAB! 크라켄이 ${c + 1}번 열을 끌어내리고 ${name(cfg, s)} 보물로!` });
        ({ grid } = ensureLine(cfg, grid, bet, phases, "🐙 촉수가 보물을 한 줄로 늘어놓는다!", s));
    }
    if (doComp) {
        kinds.push("compass"); feat(cfg, "compass");
        const dir = R() < 0.2 ? "row" : "col";
        const cells = (dir === "row" ? [0, 1, 2, 3, 4].map(c => [c, comp[1]]) : [0, 1, 2].map(r => [comp[0], r])).filter(([c, r]) => !isZ(grid[c][r]) || (c === comp[0] && r === comp[1]));
        phases.push({ t: "focus", cells: [comp], ms: 500 });
        phases.push({ t: "fx", name: dir === "row" ? "compassE" : "compassS" });
        for (const [c, r] of cells) grid[c][r] = "H1";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🧭 COMPASS SPIN! 나침반이 ${dir === "row" ? "동쪽 ➡️" : "남쪽 ⬇️"}을 가리켜 ${cells.length}칸이 해적 해골로!` });
        ({ grid } = ensureLine(cfg, grid, bet, phases, "🧭 해골이 줄을 맞춘다!", "H1"));
    }
    const e = linesEval(cfg, grid, bet);
    const w0 = winP(phases, cfg, e, doCan ? "💣 CANNONBALL" : doTen ? "🐙 TENTACLE" : doComp ? "🧭 COMPASS" : "");
    const baseWin = doCan || doTen || doComp ? 0 : w0;
    endFeat();
    if (doChest) {
        kinds.push("chest"); feat(cfg, "chest");
        phases.push({ t: "fx", name: "keys" });
        phases.push({ t: "banner", text: "🗝️ CAPTAIN'S CHEST 🗝️", cls: "jackpot" });
        const n = 4 + ri(4), items = [];
        let sum = 0, m = 1;
        const mAt = new Set(shuffle([...Array(n).keys()]).slice(0, ri(2)));
        for (let i = 0; i < n; i++) {
            if (mAt.has(i)) { const x = pickW([[2, 70], [3, 30]]); m *= x; items.push({ text: `✖️ x${x}`, cls: "jp" }); continue; }
            const v = cash(cfg, bet, pickW(VALS)); sum += v; items.push({ text: `🪙 ${short(v)}`, cls: "ok" });
        }
        phases.push({ t: "tap", mode: "grid", title: "🧰 따개비 상자를 탭! 배수와 즉시 상금", icon: "🧰", items });
        phases.push({ t: "win", cells: [], win: sum * m, text: `🗝️ CAPTAIN'S CHEST${m > 1 ? ` x${m}` : ""}` });
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five: e.five, lines: e.lines });
}

// =====================================================================
// 👻 Phantom Manor — 12 haunted frames (4x3), 81 ways
// =====================================================================
function manor(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const slime = new Map(Object.entries(state.slime || {}));
    const doAt = hit("attic"), doSe = !doAt && hit("seance"), doPos = !doAt && !doSe && !state.ghost && hit("possess"), doSl = !doAt && !doSe && !doPos && hit("slime");
    let grid = draw(cfg, 4, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doAt) inject(grid, "ZK", 3); else if (doSe) inject(grid, "ZB", 3); else scatterTease(grid, R() < 0.5 ? "ZK" : "ZB", false, 4);
    if (doSl) {
        let at = [...slime.keys()].map(split).filter(([c]) => c <= 2);
        if (!at.length) { const k = [ri(3), ri(3)]; slime.set(key(...k), 4); at = [k]; }
        const [c, r] = at[ri(at.length)], s = anyPay(cfg, 1, 1);
        if (!isZ(grid[c][r])) grid[c][r] = s;
        grid = forceRun(cfg, grid, s, 3).grid;
    }
    const phases = [spinPhase(grid, doAt ? "ZK" : "ZB", doAt || doSe)];
    const badges = () => [...slime.keys()].map(split).map(([c, r]) => ({ c, r, text: "🟢", cls: "slime" }));
    if (slime.size) phases.push({ t: "badge", cells: badges() });
    // Poltergeist Possession: a roaming wild that moves every spin
    if (doPos) { kinds.push("possess"); state.ghost = { c: ri(4), r: ri(3), left: F.possess.spins || 4 }; phases.push({ t: "fx", name: "poltergeist" }); }
    else if (state.ghost) { const nb = nb8(grid, state.ghost.c, state.ghost.r); const [c, r] = nb[ri(nb.length)]; state.ghost = { ...state.ghost, c, r }; }
    if (state.ghost) {
        const { c, r, left } = state.ghost;
        if (!isZ(grid[c][r])) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells: [[c, r]], fx: "wild", text: doPos ? "👻 POLTERGEIST POSSESSION! 유령이 액자에 빙의했다 — 매 스핀 돌아다니는 WILD!" : `👻 폴터가이스트가 옆 액자로 이동! (남은 ${left - 1}스핀)` });
        state.ghost.left--;
        if (state.ghost.left <= 0) delete state.ghost;
        if (doPos) ({ grid } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "👻 유령이 심볼을 끌어당긴다!"));
    }
    if (doSe) {
        kinds.push("seance"); feat(cfg, "seance");
        const cells = cellsAll(grid).filter(([c, r]) => /candle/.test(cfg.syms[grid[c][r]]?.cls || ""));
        phases.push({ t: "fx", name: "seance" });
        for (const [c, r] of cells) grid[c][r] = "H1";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🔮 SÉANCE TABLE! 영혼이 불려와 촛불 ${cells.length}개가 유령 거울로!` });
        ({ grid } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "🪞 거울에 또 다른 거울이 비친다!", 3, "H1"));
    }
    const mult = (c, r) => slime.has(key(c, r)) ? 3 : 1;
    let e = waysEval(cfg, grid, bet, { mult });
    const hitSlime = e.lines.some(l => l.mult >= 3);
    if (doSl) kinds.push("slime");
    if (hitSlime) phases.push({ t: "fx", name: "slime" });
    const w0 = winP(phases, cfg, e, hitSlime ? "🟢 ECTOPLASM x3" : doSe ? "🔮 SÉANCE" : doPos || state.ghost ? "👻 POLTERGEIST" : "");
    const baseWin = doSe || doSl || doPos ? 0 : w0;
    endFeat();
    // slime ages, slimed frames that paid are used up, new winners leave slime (max 4)
    const win = cellSet(e);
    for (const [k, n] of [...slime]) { if (win.has(k) || n <= 1) slime.delete(k); else slime.set(k, n - 1); }
    for (const k of shuffle([...win])) { if (slime.size >= 4) break; const [c, r] = split(k); if (!isZ(grid[c][r]) && R() < 0.35) slime.set(k, 5); }
    state.slime = Object.fromEntries(slime);
    phases.push({ t: "badge", cells: badges() });
    let five = e.five;
    if (doAt) {
        kinds.push("attic_free"); feat(cfg, "attic");
        phases.push({ t: "fx", name: "attic" });
        const n = F.attic.spins || 6;
        const r = freeLoop(cfg, ctx, phases, {
            n, title: `🗝️ ATTIC ESCAPE · ${n} FREE SPINS 🗝️`, mode: "attic-mode",
            drawFn: () => draw(cfg, 4, 3, { W: [0, 1.4, 1.4, 0] }),
            evalFn: g => waysEval(cfg, g, bet)
        });
        five += r.five;
        phases.push({ t: "banner", text: "🧳 다락방 트렁크를 열어라! 👻", cls: "jackpot" });
        const t = tapBonus(cfg, ctx, phases, { mode: "grid", title: "🧳 트렁크를 탭해 유령을 쫓고 코인을 모아라!", icon: "🧳", n: 4 + ri(5), jpChance: 0.3, tw: F.attic.tw, tier: forcedTier(cfg, force), tail: { text: "👻 BOO!", cls: "bad" } });
        payTap(phases, cfg, ctx, t, "🗝️ ATTIC 트렁크");
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🪦 Midnight Boneyard — 15 headstones (5x3), 243 ways, no jackpots
// =====================================================================
function boneyard(cfg, ctx) {
    const { bet } = ctx, { F, hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    let wisps = (state.wisps || []).filter(w => w.left > 0);
    const ev = g => waysEval(cfg, g, bet);
    const doMoon = hit("moon"), doSk = !doMoon && hit("skeleton"), doWisp = !doMoon && !doSk && hit("wisp"), doShov = !doMoon && !doSk && !doWisp && !wisps.length && hit("shovel");
    let grid = doShov ? lose(() => draw(cfg, 5, 3), ev) : draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doMoon) inject(grid, "ZL", 3); else scatterTease(grid, "ZL", false, 5);
    if (doSk) inject(grid, "ZS", 1, { avoid: c => c > 2 });
    const phases = [spinPhase(grid, "ZL", doMoon)];
    // Will-o'-the-Wisp: blue orbs = sticky wilds for this spin and the next 2
    if (doWisp) {
        kinds.push("wisp"); feat(cfg, "wisp");
        const taken = new Set(wisps.map(w => key(w.c, w.r)));
        for (const [c, r] of shuffle(plainCells(grid).filter(([c]) => c >= 1 && c <= 3)).filter(([c, r]) => !taken.has(key(c, r))).slice(0, 2 + ri(2))) wisps.push({ c, r, left: (F.wisp.spins || 2) + 1 });
        phases.push({ t: "fx", name: "wisp" });
    }
    if (wisps.length) {
        const cells = wisps.filter(w => !isZ(grid[w.c][w.r])).map(w => [w.c, w.r]);
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: doWisp ? `🧿 WILL-O'-THE-WISP! 도깨비불 ${cells.length}개가 묘비에 내려앉았다 (3스핀 스티키)` : `🧿 도깨비불이 아직 머물러 있다 · 스티키 WILD ${cells.length}개` });
        phases.push({ t: "badge", cells: wisps.map(w => ({ c: w.c, r: w.r, text: `🧿${w.left}`, cls: "frozen" })) });
        if (doWisp) ({ grid } = ensureRun(cfg, grid, ev, phases, "🧿 도깨비불이 심볼을 불러 모은다!"));
    }
    if (doSk) {
        kinds.push("skeleton"); feat(cfg, "skeleton");
        const cells = cellsAll(grid).filter(([c, r]) => /^L/.test(grid[c][r]));
        phases.push({ t: "fx", name: "skeleton" });
        phases.push({ t: "clear", cells });
        const gone = new Set(cells.map(([c, r]) => key(c, r)));
        for (let c = 0; c < 5; c++) { const keep = grid[c].filter((_, r) => !gone.has(key(c, r))); grid[c] = [...(draw(cfg, 1, 3 - keep.length, { L1: 0, L2: 0, L3: 0, W: 0.8 })[0] || []), ...keep]; }
        phases.push({ t: "drop", grid: clone(grid) });
        phases.push({ t: "banner", text: `💀 SKELETON DANCE · 저배당 ${cells.length}개를 털어내고 무료 연쇄!`, cls: "bonus" });
        ({ grid } = ensureRun(cfg, grid, ev, phases, "💀 해골이 뼈를 맞춰 줄을 세운다!", 3, anyHigh(cfg)));
    }
    const e = ev(grid);
    const w0 = winP(phases, cfg, e, doSk ? "💀 SKELETON DANCE" : wisps.length ? "🧿 WISP WILDS" : "");
    const baseWin = doSk || doWisp ? 0 : w0;
    endFeat();
    for (const w of wisps) w.left--;
    state.wisps = wisps.filter(w => w.left > 0);
    if (wisps.length) phases.push({ t: "badge", cells: state.wisps.map(w => ({ c: w.c, r: w.r, text: `🧿${w.left}`, cls: "frozen" })) });
    if (doShov && !e.win) {
        kinds.push("shovel"); feat(cfg, "shovel");
        const at = [ri(5), ri(3)];
        phases.push({ t: "focus", cells: [at], ms: 400 });
        phases.push({ t: "fx", name: "dig" });
        const v = cash(cfg, bet, pickW(SMALL));
        phases.push({ t: "tap", mode: "single", title: "⛏️ 삽으로 무덤 밑을 파라!", icon: "⛏️", items: [{ text: `🧰 ${short(v)}`, cls: "ok" }] });
        phases.push({ t: "win", cells: [at], win: v, text: "⛏️ GRAVE ROBBER'S SHOVEL · 묻힌 보물상자" });
    }
    endFeat();
    let five = e.five;
    if (doMoon) {
        kinds.push("moon_free"); feat(cfg, "moon");
        phases.push({ t: "fx", name: "fullmoon" });
        const n = F.moon.spins || 10, risen = new Map();
        const mult = (c, r) => risen.get(key(c, r)) || 1;
        const r = freeLoop(cfg, ctx, phases, {
            n, title: "🌕 FULL MOON RESURRECTION · 10 FREE SPINS · 솟은 묘비 +1x 🌕", mode: "moon-mode",
            drawFn: () => ({ grid: draw(cfg, 5, 3, { W: [0, 1.1, 1.1, 1.1, 0] }), frozen: [...risen.keys()].map(split) }),
            evalFn: g => { const x = waysEval(cfg, g, bet, { mult }); x.prefix = "🌕 RISEN"; return x; },
            after: (g, i, x) => {
                for (const k of cellSet(x)) risen.set(k, (risen.get(k) || 1) + 1);
                if (risen.size) phases.push({ t: "badge", cells: [...risen.entries()].map(([k, m]) => { const [c, r] = split(k); return { c, r, text: `x${m}`, cls: "mult" }; }) });
                return 0;
            }
        });
        phases.push({ t: "badge", cells: [] });
        five += r.five;
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

// =====================================================================
// 🧛 Crimson Moon — 5x4 stained glass, 1024 ways
// =====================================================================
function crimson(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const ev = g => waysEval(cfg, g, bet);
    const doCr = hit("crypt"), doBats = !doCr && hit("bats"), doMoon = !doCr && !doBats && hit("bloodmoon"), doCof = !doCr && !doBats && !doMoon && hit("coffin");
    let grid = draw(cfg, 5, 4);
    const points = addPoints(grid);
    const kinds = [];
    if (doCr) inject(grid, "ZR", 3); else scatterTease(grid, "ZR", false, 5);
    if (doMoon) { const have = cellsAll(grid).filter(([c, r]) => grid[c][r] === "H2").length; if (have < 2) inject(grid, "H2", 2 - have + ri(2), { avoid: c => c === 0 || c === 4 }); }
    let cof = null;
    if (doCof) { cof = [1 + ri(3), ri(4)]; grid[cof[0]][cof[1]] = "ZC"; }
    const phases = [spinPhase(grid, "ZR", doCr)];
    phases.push({ t: "meter", key: "moon", value: doMoon ? 1 : 0, max: 1 });
    if (doBats) {
        kinds.push("bats"); feat(cfg, "bats");
        const cells = shuffle(plainCells(grid)).slice(0, 3 + ri(3));
        phases.push({ t: "fx", name: "batswarm" });
        for (const [c, r] of cells) grid[c][r] = "H1";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🦇 BAT SWARM! 박쥐 떼가 ${cells.length}칸에 내려앉아 드라큘라로!` });
        ({ grid } = ensureRun(cfg, grid, ev, phases, "🦇 박쥐가 한 칸 더 내려앉는다!", 3, "H1"));
    }
    if (doMoon) {
        kinds.push("bloodmoon"); feat(cfg, "bloodmoon");
        const cells = cellsAll(grid).filter(([c, r]) => grid[c][r] === "H2");
        phases.push({ t: "fx", name: "redmoon" });
        for (const [c, r] of cells) grid[c][r] = "W3";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🌕 BLOOD MOON RISE! 성배 ${cells.length}개가 황금으로 넘쳐 x3 WILD!` });
        ({ grid } = ensureRun(cfg, grid, ev, phases, "🍷 성배가 넘쳐 흐른다!"));
    }
    let bride = false;
    if (doCof) {
        kinds.push("coffin"); feat(cfg, "coffin");
        bride = R() < 0.5;
        phases.push({ t: "tap", mode: "single", title: "⚰️ 삐걱… 관 뚜껑을 탭해서 열어라!", icon: "⚰️", items: [{ text: bride ? "👰 VAMPIRE BRIDE!" : "💰 CASH!", cls: "jp" }] });
        phases.push({ t: "fx", name: bride ? "bride" : "coffin" });
        if (bride) {
            const c = cof[0], cells = [0, 1, 2, 3].filter(r => !isZ(grid[c][r]) || r === cof[1]).map(r => [c, r]);
            for (const [x, r] of cells) grid[x][r] = "W";
            phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `👰 뱀파이어 신부가 ${c + 1}번 열 전체로 확장 WILD!` });
            ({ grid } = ensureRun(cfg, grid, ev, phases, "👰 신부가 손짓하자 심볼이 모인다!"));
        } else grid[cof[0]][cof[1]] = one(cfg, { W: 0 });
    }
    const e = ev(grid);
    const w0 = winP(phases, cfg, e, doBats ? "🦇 BAT SWARM" : doMoon ? "🌕 BLOOD MOON" : bride ? "👰 BRIDE WILD" : "");
    const baseWin = doBats || doMoon || bride ? 0 : w0;
    endFeat();
    if (doCof && !bride) { feat(cfg, "coffin"); phases.push({ t: "win", cells: [cof], win: cash(cfg, bet, pickW(VALS)), text: "⚰️ COFFIN LID CREAK · 관 속의 보물" }); }
    endFeat();
    if (doMoon) phases.push({ t: "meter", key: "moon", value: 0, max: 1 });
    let five = e.five;
    if (doCr) {
        kinds.push("crypt_free"); feat(cfg, "crypt");
        phases.push({ t: "fx", name: "crypt" });
        phases.push({ t: "banner", text: "✝️ CASTLE CRYPT BONUS ✝️", cls: "jackpot" });
        const n = F.crypt.spins || 12, toks = [4, 4, 4], boosts = 1 + ri(3), items = [];
        const ft = forcedTier(cfg, force), jp = ft || (R() < 0.25 ? pickTier(cfg, ctx, F.crypt.tw) : null);
        const list = shuffle([...toks.map(x => ({ text: `🦇 +${x} FREE`, cls: "ok" })), ...Array.from({ length: boosts }, () => ({ text: "🩸 +1x", cls: "jp" })), ...(jp ? [{ text: jpName(cfg, jp), cls: "jp" }] : [])]);
        items.push(...list);
        phases.push({ t: "tap", mode: "grid", title: "⚱️ 석관을 탭! 무료스핀과 배수를 모아라", icon: "⚱️", items });
        if (jp) pushJp(phases, cfg, ctx, jp);
        const m = 1 + boosts;
        const r = freeLoop(cfg, ctx, phases, {
            n, title: `✝️ CRYPT · ${n} FREE SPINS · x${m} ✝️`, mode: "crypt-mode",
            drawFn: () => draw(cfg, 5, 4, { W: [0, 1, 1, 1, 0] }),
            evalFn: g => { const x = waysEval(cfg, g, bet, { scale: m }); x.prefix = `✝️ x${m}`; return x; }
        });
        five += r.five;
    }
    endFeat();
    return out(cfg, ctx, { grid, phases, points, state, baseWin, kinds, five, lines: e.lines });
}

const wrap = fn => (cfg, ctx) => { endFeat(); try { return fn(cfg, ctx); } finally { endFeat(); } };
export const WONDER_MACHINES = Object.fromEntries(Object.entries({
    sp_cube: cube, sp_curio: curio, sp_percent: percent, sp_festival: festival, sp_mission: mission, sp_slide: slide,
    sp_pop: pop, sp_galleon: galleon, sp_manor: manor, sp_boneyard: boneyard, sp_crimson: crimson
}).map(([k, fn]) => [k, wrap(fn)]));
