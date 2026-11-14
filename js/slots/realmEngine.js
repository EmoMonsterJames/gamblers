// =====================================================================
// The 10 round-8 machines (configs: js/slots/realmConfigs.js, renderer:
// js/screens/slotSpecial.js). Same contract as skyEngine.js: each spin
// first rolls which features hit (features.*.p × pet luck, or the practice
// room `force`), then builds grids that explain the result and returns a
// `phases` script. Tap / pick / choice bonuses are decided here too — taps
// only reveal the prizes, so the simulated RTP is exact.
// =====================================================================
import { R, ri, pickW, shuffle, clone, key, draw, inject, addPoints, finish, ctl } from "./specialEngine.js";
import { waysEval, linesEval, winP, forceRun, freeLoop, cash, feat, endFeat, short, payKeys, highKeys, cellsAll, name, isW, txt, LINES } from "./themeEngine.js";
import { jpGate, jpName, pickTier, pushJp, forcedTier, tapBonus, payTap, scatterTease, spinPhase, tease, cellSet, split, ensureRun, anyPay, anyHigh, one, VALS, SMALL } from "./skyEngine.js";

const isZ = x => /^Z/.test(x || "") || x === "P";
const plainCells = g => cellsAll(g).filter(([c, r]) => !isZ(g[c][r]));
// value ladder low → high (only the keys this machine has)
const ladder = cfg => ["L3", "L2", "L1", "H4", "H3", "H2", "H1"].filter(k => cfg.syms[k]);
const upOne = (cfg, s) => { const L = ladder(cfg), i = L.indexOf(s); return i < 0 ? s : L[Math.min(L.length - 1, i + 1)]; };
const rank = (cfg, s) => ladder(cfg).indexOf(s);
const loseGrid = (cfg, C, Rn, evalFn) => { let g = draw(cfg, C, Rn); for (let k = 0; k < 40 && evalFn(g).win; k++) g = draw(cfg, C, Rn); return g; };
const extra = (phases, cfg, e2, e1, text) => { if (e2.win > e1.win) phases.push({ t: "win", cells: e2.lines.flatMap(l => l.cells), win: e2.win - e1.win, text: `${text} · ${txt(cfg, e2)}` }); return Math.max(0, e2.win - e1.win); };
const sumWins = arr => arr.reduce((s, p) => s + (p.t === "win" ? p.win : 0), 0);
// a guaranteed 25-line win on one random line
function forceLine(cfg, g, sym, n = 3) {
    const out = clone(g), L = LINES[ri(5)], changed = [];
    for (let c = 0; c < n; c++) if (out[c][L[c]] !== sym && !isW(out[c][L[c]])) { out[c][L[c]] = sym; changed.push([c, L[c]]); }
    return { grid: out, changed };
}
function ensureLine(cfg, grid, bet, phases, text, sym = null) {
    const ev = linesEval(cfg, grid, bet);
    if (ev.win) return { grid, ev };
    const f = forceLine(cfg, grid, sym || anyPay(cfg));
    phases.push({ t: "morph", grid: clone(f.grid), cells: f.changed, fx: "evolve", text });
    return { grid: f.grid, ev: linesEval(cfg, f.grid, bet) };
}

// =====================================================================
// 💀 The Rule of Death — 4x4 tombstones, 256 ways, no jackpots
// =====================================================================
// Cheating Death: from a losing grid, place a run that is broken in reel 3 —
// swapping two tombstones (reel 3 ↔ reel 4) completes it.
function cheatSwap(cfg, base, bet) {
    for (let k = 0; k < 30; k++) {
        const s = anyPay(cfg), pre = clone(base);
        const r0 = ri(4), r1 = ri(4), r2 = ri(4), rb = ri(4);
        if (pre[2].some(x => x === s || isW(x)) || isZ(pre[2][r2]) || isZ(pre[3][rb])) continue;
        pre[0][r0] = s; pre[1][r1] = s; pre[3][rb] = s;
        if (waysEval(cfg, pre, bet).win) continue;
        const post = clone(pre);
        [post[2][r2], post[3][rb]] = [post[3][rb], post[2][r2]];
        if (waysEval(cfg, post, bet).win) return { pre, post, cells: [[2, r2], [3, rb]] };
    }
    const f = forceRun(cfg, base, anyPay(cfg), 3);
    return { pre: base, post: f.grid, cells: f.changed };
}
function death(cfg, ctx) {
    const { bet } = ctx, { hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doVault = hit("vault"), doCheat = !doVault && hit("cheat");
    let grid = doCheat ? loseGrid(cfg, 4, 4, g => waysEval(cfg, g, bet)) : draw(cfg, 4, 4);
    const points = addPoints(grid);
    const kinds = [];
    if (doVault) inject(grid, "ZK", 3); else scatterTease(grid, "ZK", false, 4);
    let pre = grid, swap = [];
    if (doCheat) { const r = cheatSwap(cfg, grid, bet); pre = r.pre; grid = r.post; swap = r.cells; }
    const phases = [spinPhase(pre, "ZK", doVault)];
    if (doCheat) {
        kinds.push("cheat"); feat(cfg, "cheat");
        phases.push({ t: "fx", name: "hourglass" });
        phases.push({ t: "morph", grid: clone(grid), cells: swap, fx: "evolve", text: "⏳ CHEATING DEATH! 모래시계가 뒤집혀 시간이 되감기고 묘비 두 개가 자리를 바꿨다!" });
    }
    let ev = waysEval(cfg, grid, bet);
    const w0 = winP(phases, cfg, ev, doCheat ? "⏳ CHEATING DEATH" : "");
    const baseWin = doCheat ? 0 : w0;
    endFeat();
    // Soul Harvest: a win with a high spirit symbol (💀 ⌛ 🏮 🕸️) sends a soul into the lantern; 10 souls → spectral wave
    let souls = state.souls || 0;
    if (ev.lines.some(l => /^H/.test(l.sym))) { souls++; phases.push({ t: "fx", name: "soulfly" }); }
    if (force === "soul") souls = Math.max(souls, cfg.souls || 10);
    phases.push({ t: "meter", key: "souls", value: Math.min(souls, cfg.souls || 10), max: cfg.souls || 10 });
    if (souls >= (cfg.souls || 10)) {
        kinds.push("soul"); feat(cfg, "soul");
        const r = ri(4), cells = [0, 1, 2, 3].filter(c => !isZ(grid[c][r])).map(c => [c, r]);
        phases.push({ t: "fx", name: "spectral" });
        for (const [c] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `👻 SOUL HARVEST! 영혼 10개가 모여 유령의 파도가 ${r + 1}번째 줄을 WILD로!` });
        const e2 = waysEval(cfg, grid, bet);
        extra(phases, cfg, e2, ev, "👻 SOUL HARVEST");
        ev = e2; souls = 0;
        phases.push({ t: "meter", key: "souls", value: 0, max: cfg.souls || 10 });
        endFeat();
    }
    state.souls = souls;
    if (doVault) {
        kinds.push("vault"); feat(cfg, "vault");
        phases.push({ t: "fx", name: "afterlife" });
        phases.push({ t: "banner", text: "🗝️ AFTERLIFE VAULT 🗝️", cls: "jackpot" });
        const r = tapBonus(cfg, ctx, phases, { mode: "grid", title: "🔥 유령 불꽃을 탭! 🦴 COLLECT 뼈가 나오면 끝", icon: "🔥", n: 4 + ri(6), tail: { text: "🦴 COLLECT", cls: "bad" } });
        payTap(phases, cfg, ctx, r, "🗝️ AFTERLIFE VAULT 유령 불꽃");
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// ⛲ Karma Fountain — 15 lily pads (5x3), 243 ways
// =====================================================================
const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function karma(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doK = hit("karma"), doDove = !doK && hit("dove"), doRip = !doK && !doDove && hit("ripple");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doK) inject(grid, "ZC", 3); else scatterTease(grid, "ZC", false, 5);
    if (doDove) inject(grid, "ZB", 2);
    if (doRip && !waysEval(cfg, grid, bet).win) grid = forceRun(cfg, grid, anyPay(cfg, 1, 2), 3).grid;
    const phases = [spinPhase(grid, "ZC", doK)];
    if (doDove) {
        kinds.push("dove"); feat(cfg, "dove");
        phases.push({ t: "fx", name: "doves" });
        const cells = shuffle(plainCells(grid).filter(([c]) => c >= 1 && c <= 3)).slice(0, 2 + ri(3));
        for (const [c, r] of cells) grid[c][r] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "wild", text: `🕊️ GOLDEN DOVE RELEASE! 비둘기가 WILD 깃털 ${cells.length}개를 떨어뜨렸다!` });
    }
    let ev = waysEval(cfg, grid, bet);
    if (doDove) ({ grid, ev } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "🕊️ 깃털이 하나 더 내려앉는다!"));
    const w0 = winP(phases, cfg, ev, doDove ? "🕊️ DOVE WILDS" : "");
    const baseWin = doDove ? 0 : w0;
    endFeat();
    if (doRip && ev.win) {
        kinds.push("ripple"); feat(cfg, "ripple");
        const win = cellSet(ev), adj = new Map();
        for (const k of win) { const [c, r] = split(k); for (const [dc, dr] of ORTHO) { const x = c + dc, y = r + dr; if (x >= 0 && y >= 0 && x < 5 && y < 3 && !win.has(key(x, y)) && !isZ(grid[x][y]) && !isW(grid[x][y])) adj.set(key(x, y), [x, y]); } }
        const cells = [...adj.values()];
        const g = clone(grid);
        for (const [c, r] of cells) g[c][r] = upOne(cfg, g[c][r]);
        phases.push({ t: "fx", name: "goldwave" });
        phases.push({ t: "morph", grid: clone(g), cells, fx: "flare", text: `🌊 RIPPLE OF GENEROSITY! 황금 물결이 옆 심볼 ${cells.length}개를 업그레이드!` });
        let e2 = waysEval(cfg, g, bet);
        if (e2.win <= ev.win && cells.length) {
            const best = ev.lines.reduce((a, l) => rank(cfg, l.sym) > rank(cfg, a.sym) ? l : a).sym;
            for (const [c, r] of cells) g[c][r] = best;
            phases.push({ t: "morph", grid: clone(g), cells, fx: "evolve", text: `🌊 물결이 한 번 더! ${name(cfg, best)}(으)로 축복` });
            e2 = waysEval(cfg, g, bet);
        }
        extra(phases, cfg, e2, ev, "🌊 RIPPLE OF GENEROSITY");
        grid = g; if (e2.win > ev.win) ev = e2;
        endFeat();
    }
    if (doK) {
        kinds.push("karma"); feat(cfg, "karma");
        phases.push({ t: "fx", name: "karma" });
        phases.push({ t: "banner", text: "🎁 TRIPLE KARMA BONUS 🎁", cls: "jackpot" });
        const ft = forcedTier(cfg, force), n = 5 + ri(4);
        const jpAt = ft || R() < 0.32 ? ri(n) : -1, boosts = new Set(shuffle([...Array(n).keys()].filter(i => i !== jpAt)).slice(0, 1 + ri(2)));
        const items = [], tiers = [];
        let sum = 0, boost = 1;
        for (let i = 0; i < n; i++) {
            if (i === jpAt) { const t = ft || pickTier(cfg, ctx, F.karma.tw); tiers.push(t); items.push({ text: jpName(cfg, t), cls: "jp" }); }
            else if (boosts.has(i)) { const b = pickW([[1, 70], [2, 30]]); boost += b; items.push({ text: `🙏 +${b}x BOOST`, cls: "jp" }); }
            else { const v = cash(cfg, bet, pickW(VALS)); sum += v; items.push({ text: short(v), cls: "ok" }); }
        }
        phases.push({ t: "tap", mode: "grid", title: "🗿 황금 석상을 탭! (즉시 잭팟 · 배수 부스트)", icon: "🗿", items });
        if (sum) phases.push({ t: "win", cells: [], win: sum * boost, text: `🎁 TRIPLE KARMA${boost > 1 ? ` · BOOST x${boost}` : ""}` });
        for (const t of tiers) pushJp(phases, cfg, ctx, t);
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🍺 Idle Tavern — 16 patrons' tables (4x4), 256 ways, no jackpots
// =====================================================================
function tavern(cfg, ctx) {
    const { bet } = ctx, { hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doB = hit("bounty"), doBard = !doB && hit("bard"), doBrawl = !doB && !doBard && hit("brawl");
    let grid = doBrawl ? loseGrid(cfg, 4, 4, g => waysEval(cfg, g, bet)) : draw(cfg, 4, 4);
    const points = addPoints(grid);
    const kinds = [];
    if (doB) inject(grid, "ZQ", 3); else scatterTease(grid, "ZQ", false, 4);
    if (doBard) inject(grid, "ZL", 1);
    if (doBrawl) inject(grid, "ZS", 2);
    const phases = [spinPhase(grid, "ZQ", doB)];
    if (doBard) {
        kinds.push("bard"); feat(cfg, "bard");
        const s = anyHigh(cfg), cols = shuffle([0, 1, 2, 3]).slice(0, 2).sort();
        const cells = [];
        for (const c of cols) for (let r = 0; r < 4; r++) if (!isZ(grid[c][r])) { grid[c][r] = s; cells.push([c, r]); }
        phases.push({ t: "fx", name: "bard" });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🪕 BARD'S SONG! ${cols[0] + 1}번·${cols[1] + 1}번 테이블이 ${name(cfg, s)}(으)로 동기화!` });
        ({ grid } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "🪕 노래가 옆 테이블까지 퍼진다!", 3, s));
    }
    if (doBrawl) {
        kinds.push("brawl"); feat(cfg, "brawl");
        phases.push({ t: "fx", name: "brawl" });
        const cells = plainCells(grid), vals = shuffle(cells.map(([c, r]) => grid[c][r]));
        cells.forEach(([c, r], i) => { grid[c][r] = vals[i]; });
        const f = forceRun(cfg, grid, anyPay(cfg, 1, 1), pickW([[3, 60], [4, 40]]));
        grid = f.grid;
        phases.push({ t: "show", grid: clone(grid), pop: cells });
        phases.push({ t: "morph", grid: clone(grid), cells: f.changed, fx: "evolve", text: "⚔️ BAR BRAWL! 난투 끝에 카드가 뒤섞여 당첨이 맞춰졌다!" });
    }
    const ev = waysEval(cfg, grid, bet);
    const w0 = winP(phases, cfg, ev, doBard ? "🪕 BARD'S SONG" : doBrawl ? "⚔️ BAR BRAWL" : "");
    const baseWin = doBard || doBrawl ? 0 : w0;
    endFeat();
    if (doB) {
        kinds.push("bounty"); feat(cfg, "bounty");
        phases.push({ t: "fx", name: "bounty" });
        phases.push({ t: "banner", text: "📜 BOUNTY BOARD 📜", cls: "jackpot" });
        const r = tapBonus(cfg, ctx, phases, { mode: "grid", title: "📜 현상수배 전단을 탭해 보상을 받아라!", icon: "📜", n: 5 + ri(5) });
        payTap(phases, cfg, ctx, r, "📜 BOUNTY 보상");
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🗂️ Totally Normal Office — 5x3, 25 lines
// =====================================================================
function office(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doRev = hit("review"), doCof = !doRev && hit("coffee"), doShr = !doRev && !doCof && hit("shred");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doRev) inject(grid, "ZM", 3); else scatterTease(grid, "ZM", false, 5);
    if (doCof) inject(grid, "ZE", 1);
    const phases = [spinPhase(grid, "ZM", doRev)];
    if (doShr) {
        kinds.push("shred"); feat(cfg, "shred");
        const cells = cellsAll(grid).filter(([c, r]) => /^L/.test(grid[c][r]));
        phases.push({ t: "fx", name: "shredder" });
        phases.push({ t: "clear", cells });
        for (const [c, r] of cells) grid[c][r] = pickW([["H1", 3], ["H2", 2], ["H3", 1.5], ["H4", 1]]);
        phases.push({ t: "drop", grid: clone(grid) });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🗂️ PAPER SHREDDER! 메모 ${cells.length}장이 갈리고 보너스 수표가 떨어졌다!` });
    }
    let ev = linesEval(cfg, grid, bet);
    if (doShr) ({ grid, ev } = ensureLine(cfg, grid, bet, phases, "🗂️ 결재 완료! 수표가 한 줄로 정렬된다", "H1"));
    const w0 = winP(phases, cfg, ev, doShr ? "🗂️ SHREDDER" : "");
    const baseWin = doShr ? 0 : w0;
    endFeat();
    let five = ev.five;
    if (doCof) {
        kinds.push("coffee_free"); feat(cfg, "coffee");
        phases.push({ t: "fx", name: "coffee" });
        const r = freeLoop(cfg, ctx, phases, {
            n: F.coffee.spins || 3, title: "☕ COFFEE BREAK · 3 FREE SPINS · x2 ☕", mode: "coffee-mode",
            drawFn: () => draw(cfg, 5, 3, { W: [0, 1.5, 1.5, 1.5, 0] }),
            evalFn: g => { const e = linesEval(cfg, g, bet, { scale: 2 }); e.prefix = "☕ x2"; return e; }
        });
        five += r.five;
    }
    if (doRev) {
        kinds.push("review"); feat(cfg, "review");
        phases.push({ t: "fx", name: "meeting" });
        phases.push({ t: "banner", text: "📅 PERFORMANCE REVIEW 📅", cls: "jackpot" });
        const ft = forcedTier(cfg, force), jpAt = ft || R() < 0.3 ? ri(3) : -1;
        const pick = () => pickW([["raise", 50], ["stock", 25], ["mult", 25]]);
        const reveals = [], tiers = [];
        let sum = 0, m = 1;
        for (let i = 0; i < 3; i++) {
            if (i === jpAt) { const t = ft || pickTier(cfg, ctx, F.review.tw); tiers.push(t); reveals.push({ text: `🏆 ${jpName(cfg, t)}`, cls: "jp" }); continue; }
            const k = pick();
            if (k === "mult") { const x = pickW([[2, 70], [3, 30]]); m *= x; reveals.push({ text: `📈 x${x}`, cls: "jp" }); }
            else { const v = cash(cfg, bet, k === "raise" ? pickW([[2, 40], [3, 30], [5, 20], [8, 10]]) : pickW([[8, 40], [12, 30], [20, 20], [30, 10]])); sum += v; reveals.push({ text: `${k === "raise" ? "💵 RAISE" : "📜 STOCK"} ${short(v)}`, cls: "ok" }); }
        }
        if (!sum) sum = cash(cfg, bet, 5); // the review always comes with a base bonus
        const rest = Array.from({ length: 3 }, () => ({ text: pickW([["💵 RAISE", 1], ["📜 STOCK", 1], ["📈 x2", 1], ["🥡 야근", 1]]) }));
        phases.push({ t: "pickn", title: "💼 서류가방 3개를 골라라! (연봉 인상 · 스톡옵션 · 배수)", n: 6, k: 3, icon: "💼", reveals, rest });
        phases.push({ t: "win", cells: [], win: sum * m, text: `📅 PERFORMANCE REVIEW${m > 1 ? ` x${m}` : ""}` });
        for (const t of tiers) pushJp(phases, cfg, ctx, t);
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🎰 Retro Reel City — 5 billboard cylinders, 25 lines
// =====================================================================
const fruitEval = (cfg, g, bet, k = 3) => {
    const e = linesEval(cfg, g, bet);
    let total = 0;
    for (const l of e.lines) { if (/fruit/.test(cfg.syms[l.sym]?.cls || "")) { l.win *= k; l.mult *= k; } total += l.win; }
    e.win = total; e.prefix = `🌃 NEON x${k} 과일`;
    return e;
};
function retro(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doWheel = hit("wheel"), doNeon = !doWheel && hit("neon"), doNudge = !doWheel && !doNeon && hit("nudge");
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doWheel) inject(grid, "Z7", 3); else if (doNeon) inject(grid, "ZL", 3); else scatterTease(grid, R() < 0.5 ? "Z7" : "ZL", false, 5);
    // NUDGE: a middle-line run where one billboard stopped one spot off
    let nudged = null, nk = 0, dir = 1;
    if (doNudge) {
        // retry until the nudge really completes something new (the waiting symbol must not already pay on a diagonal line)
        const base = clone(grid);
        for (let k = 0; k < 40; k++) {
            const g = clone(base), s = anyPay(cfg, 1, 2), n = pickW([[3, 60], [4, 28], [5, 12]]);
            nk = ri(n); dir = R() < 0.5 ? 1 : -1;
            for (let c = 0; c < n; c++) if (!isZ(g[c][1])) g[c][1] = s;
            if (n < 5 && (g[n][1] === s || isW(g[n][1]))) g[n][1] = one(cfg, { [s]: 0, W: 0 });
            const off = one(cfg, { [s]: 0, W: 0 });
            g[nk] = dir > 0 ? [s, off, g[nk][2]] : [g[nk][0], off, s];   // s waits above (↓) or below (↑) the line
            const ng = clone(g);
            ng[nk] = dir > 0 ? [one(cfg), g[nk][0], g[nk][1]] : [g[nk][1], g[nk][2], one(cfg)];
            grid = g; nudged = ng;
            if (linesEval(cfg, ng, bet).win > linesEval(cfg, g, bet).win) break;
        }
    }
    const antic = doWheel ? spinPhase(grid, "Z7", true).antic : doNeon ? spinPhase(grid, "ZL", true).antic : [];
    const phases = [{ ...spinPhase(grid, doNeon ? "ZL" : "Z7", doWheel || doNeon), antic }];
    let ev = linesEval(cfg, grid, bet);
    const baseWin = winP(phases, cfg, ev);
    if (doNudge) {
        kinds.push("nudge"); feat(cfg, "nudge");
        phases.push({ t: "tap", mode: "single", title: `${dir > 0 ? "⬇️" : "⬆️"} 빛나는 화살표! ${nk + 1}번 빌보드를 탭해 NUDGE!`, icon: dir > 0 ? "⬇️" : "⬆️", items: [{ text: "NUDGE!", cls: "jp" }] });
        phases.push({ t: "fx", name: "nudge", col: nk });
        phases.push({ t: "nudge", col: nk, dir, grid: clone(nudged) });
        const e2 = linesEval(cfg, nudged, bet);
        extra(phases, cfg, e2, ev, "⬆️⬇️ NUDGE");
        grid = nudged; ev = e2.win > ev.win ? e2 : ev;
    }
    endFeat();
    let five = ev.five;
    if (doNeon) {
        kinds.push("neon_free"); feat(cfg, "neon");
        phases.push({ t: "fx", name: "neon" });
        const r = freeLoop(cfg, ctx, phases, {
            n: F.neon.spins || 6, title: "⚡ NEON OVERDRIVE · 6 FREE SPINS · 과일 x3 ⚡", mode: "night-mode",
            drawFn: () => draw(cfg, 5, 3, { W: [0, 1.4, 1.4, 1.4, 0] }),
            evalFn: g => fruitEval(cfg, g, bet, 3)
        });
        five += r.five;
    }
    if (doWheel) {
        kinds.push("wheel"); feat(cfg, "wheel");
        phases.push({ t: "fx", name: "ferris" });
        phases.push({ t: "banner", text: "🎡 SUPER JACKPOT WHEEL 🎡", cls: "jackpot" });
        const SEG = ["10x", "MINI", "25x", "MINOR", "15x", "MAXI", "50x", "MAJOR", "20x", "GRAND", "100x", "MINI"];
        const WT = [16, 13, 9, 7, 13, 4, 4, 1.2, 10, 0.35, 1.5, 13];
        let idx = pickW(SEG.map((_, i) => [i, WT[i]]));
        const ft = forcedTier(cfg, force);
        if (ft) idx = SEG.indexOf(ft);
        phases.push({ t: "tap", mode: "single", title: "🎡 탭해서 대관람차를 멈춰라!", icon: "🎡", items: [{ text: "STOP!", cls: "jp" }] });
        phases.push({ t: "wheel", seg: SEG, idx, title: "🎡 SUPER JACKPOT WHEEL" });
        const seg = SEG[idx];
        if (seg.endsWith("x")) phases.push({ t: "win", cells: [], win: cash(cfg, bet, +seg.slice(0, -1)), text: `🎡 SUPER WHEEL ${seg}` });
        else pushJp(phases, cfg, ctx, ft || jpGate(cfg, seg, bet));
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🔴🔵 Polarity Clash — 5x4 red/blue tiles, 1024 ways, no jackpots
// =====================================================================
const colorOf = (cfg, s) => cfg.red.includes(s) ? "red" : cfg.blue.includes(s) ? "blue" : null;
const colorCount = (cfg, g, col) => cellsAll(g).filter(([c, r]) => colorOf(cfg, g[c][r]) === col).length;
function surgeEval(cfg, g, bet, col, o = {}) {
    const e = waysEval(cfg, g, bet, o);
    e.lines = e.lines.filter(l => colorOf(cfg, l.sym) === col);
    for (const l of e.lines) { l.win *= 2; l.mult *= 2; }
    e.win = e.lines.reduce((s, l) => s + l.win, 0); e.five = e.lines.filter(l => l.n >= 5).length;
    return e;
}
function polarity(cfg, ctx) {
    const { bet } = ctx, { hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doReac = hit("reactor"), doFuse = !doReac && hit("fusion"), doSurge = !doReac && !doFuse && hit("surge");
    const col = R() < 0.5 ? "red" : "blue";
    let grid = draw(cfg, 5, 4);
    if (doSurge) { const over = Object.fromEntries(cfg[col].map(s => [s, 9])); for (let k = 0; k < 30 && colorCount(cfg, grid, col) < 13; k++) grid = draw(cfg, 5, 4, over); }
    else for (let k = 0; k < 20 && Math.max(colorCount(cfg, grid, "red"), colorCount(cfg, grid, "blue")) > 12; k++) grid = draw(cfg, 5, 4);
    const points = addPoints(grid);
    const kinds = [];
    if (doReac) inject(grid, "ZE", 3); else scatterTease(grid, "ZE", false, 5);
    let fuse = [];
    if (doFuse) { const [a, b] = shuffle([0, 1, 2, 3]); grid[2][a] = "ZR"; grid[2][b] = "ZB"; fuse = [[2, a], [2, b]]; }
    const phases = [spinPhase(grid, "ZE", doReac)];
    phases.push({ t: "meter", key: "tug", value: colorCount(cfg, grid, "red") - colorCount(cfg, grid, "blue"), max: 20 });
    let ev;
    if (doFuse) {
        kinds.push("fusion"); feat(cfg, "fusion");
        phases.push({ t: "focus", cells: fuse, ms: 500 });
        phases.push({ t: "fx", name: "fusion", col: 2 });
        grid[2] = grid[2].map(() => "W5");
        phases.push({ t: "morph", grid: clone(grid), cells: [0, 1, 2, 3].map(r => [2, r]), fx: "wild", text: "🟣 MAGNETIC FUSION! RED + BLUE WILD가 융합해 x5 PURPLE MEGA-WILD 열로!" });
        ({ grid, ev } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "🟣 자기장이 심볼을 끌어당긴다!"));
    } else if (doSurge) {
        kinds.push("surge"); feat(cfg, "surge");
        const n = colorCount(cfg, grid, col);
        phases.push({ t: "fx", name: col === "red" ? "surgered" : "surgeblue" });
        phases.push({ t: "banner", text: `${col === "red" ? "🔴 RED" : "🔵 BLUE"} COLOR SURGE · ${n}칸 · 당첨 x2!`, cls: "bonus" });
        ev = surgeEval(cfg, grid, bet, col);
        if (!ev.win) { const f = forceRun(cfg, grid, pickW(cfg[col].map(s => [s, 1])), 3); grid = f.grid; phases.push({ t: "morph", grid: clone(grid), cells: f.changed, fx: "evolve", text: "⚡ 에너지가 한쪽으로 쏠린다!" }); ev = surgeEval(cfg, grid, bet, col); }
    } else ev = waysEval(cfg, grid, bet);
    const w0 = winP(phases, cfg, ev, doFuse ? "🟣 FUSION x5" : doSurge ? `${col === "red" ? "🔴" : "🔵"} SURGE x2` : "");
    const baseWin = doFuse || doSurge ? 0 : w0;
    endFeat();
    let five = ev.five;
    if (doReac) {
        kinds.push("reactor_free"); feat(cfg, "reactor");
        phases.push({ t: "fx", name: "reactor" });
        // two complete branches; the player picks one (the timer picks `auto`)
        const red = [], blue = [];
        // red: big random multipliers per spin
        red.push({ t: "banner", text: "🔴 RED REACTOR · 5 FREE SPINS · 큰 배수!", cls: "bonus" }, { t: "mode", add: "red-mode" });
        for (let i = 0; i < 5; i++) {
            const m = pickW([[2, 30], [3, 30], [5, 25], [10, 15]]);
            red.push({ t: "hud", text: `🔴 FREE SPIN ${i + 1} / 5 · x${m}` });
            const g = draw(cfg, 5, 4, { W: [0, 1, 1, 1, 0] });
            red.push({ t: "spin", grid: clone(g) });
            const e = waysEval(cfg, g, bet, { scale: m });
            winP(red, cfg, e, `🔴 x${m}`);
        }
        red.push({ t: "hud", text: "" }, { t: "mode", remove: "red-mode" });
        // blue: frequent wins, sticky wilds that pile up
        blue.push({ t: "banner", text: "🔵 BLUE REACTOR · 8 FREE SPINS · 스티키 WILD!", cls: "bonus" }, { t: "mode", add: "blue-mode" });
        const sticky = [];
        for (let i = 0; i < 8; i++) {
            blue.push({ t: "hud", text: `🔵 FREE SPIN ${i + 1} / 8 · STICKY ${sticky.length}` });
            const g = draw(cfg, 5, 4);
            if (sticky.length < 3 && R() < 0.4) { const free = cellsAll(g).filter(([c, r]) => c >= 1 && c <= 3 && !sticky.some(([a, b]) => a === c && b === r)); if (free.length) sticky.push(free[ri(free.length)]); }
            for (const [c, r] of sticky) g[c][r] = "W";
            blue.push({ t: "spin", grid: clone(g), frozen: [...sticky] });
            winP(blue, cfg, waysEval(cfg, g, bet), "🔵 STICKY");
        }
        blue.push({ t: "hud", text: "" }, { t: "mode", remove: "blue-mode" });
        const auto = R() < 0.5 ? "red" : "blue";
        const branches = { red, blue };
        phases.push({ t: "choose", title: "☢️ REACTOR OVERLOAD — 어느 쪽 원자로를 가동할까?", auto, branches, assumed: sumWins(branches[auto]),
            options: [{ k: "red", icon: "🔴", label: "RED", sub: "고변동 · x2~x10 배수 5스핀" }, { k: "blue", icon: "🔵", label: "BLUE", sub: "잦은 당첨 · 스티키 WILD 8스핀" }] });
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

// =====================================================================
// 🛥️ Yacht Club Royale — 15 black cards (5x3), 243 ways, no jackpots
// =====================================================================
const LUX = ["⌚", "💍", "🖼️", "🏎️", "🛥️", "🏝️", "🎻", "🍷", "👜", "🏺"];
function yacht(cfg, ctx) {
    const { bet } = ctx, { hit } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doAuc = hit("auction"), doCredit = !doAuc && hit("credit"), doDiv = !doAuc && !doCredit && hit("dividend");
    // stamps: { "c,r": spins left } — winning symbols leave a gold stamp (5x3 coordinates)
    const stamps = new Map(Object.entries(state.stamps || {}));
    let grid = draw(cfg, 5, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doAuc) inject(grid, "ZG", 3); else scatterTease(grid, "ZG", false, 5);
    if (doCredit) inject(grid, "ZC", 1);
    if (doDiv) {
        let at = [...stamps.keys()].map(split).filter(([c]) => c <= 2);
        if (!at.length) { const k = [ri(3), ri(3)]; stamps.set(key(...k), 4); at = [k]; }
        const [c, r] = at[ri(at.length)], s = anyPay(cfg, 1, 1);
        grid[c][r] = s;
        grid = forceRun(cfg, grid, s, 3).grid;
    }
    const phases = [spinPhase(grid, "ZG", doAuc)];
    const badges = () => [...stamps.keys()].map(split).map(([c, r]) => ({ c, r: r + (rows4 ? 1 : 0), text: "🪙", cls: "mult" }));
    let rows4 = false;
    if (stamps.size) phases.push({ t: "badge", cells: badges() });
    if (doCredit) {
        kinds.push("credit"); feat(cfg, "credit");
        phases.push({ t: "fx", name: "blackcard" });
        rows4 = true;
        grid = grid.map((col, c) => [one(cfg, { W: c >= 1 && c <= 3 ? 3 : 0 }), ...col]);
        phases.push({ t: "rows", n: 4 });
        phases.push({ t: "show", grid: clone(grid), pop: [0, 1, 2, 3, 4].map(c => [c, 0]) });
        phases.push({ t: "badge", cells: badges() });
        phases.push({ t: "banner", text: "💳 UNLIMITED CREDIT · 4 ROWS · 1024 WAYS", cls: "bonus" });
    }
    const off = rows4 ? 1 : 0;
    const mult = (c, r) => stamps.has(key(c, r - off)) ? 3 : 1;
    let ev = waysEval(cfg, grid, bet, { mult });
    if (doCredit) ({ grid, ev } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet, { mult }), phases, "💳 블랙 카드가 한 장 더!", 3, anyHigh(cfg)));
    const hitStamp = ev.lines.some(l => l.mult >= 3);
    if (doDiv) { kinds.push("dividend"); feat(cfg, "dividend"); ev = waysEval(cfg, grid, bet, { mult }); }
    if (hitStamp) phases.push({ t: "fx", name: "dividend" });
    const w0 = winP(phases, cfg, ev, hitStamp ? "🪙 DIVIDEND x3" : doCredit ? "💳 UNLIMITED CREDIT" : "");
    const baseWin = doCredit || doDiv ? 0 : w0;
    endFeat();
    // stamps age, paid stamps are cashed in, new winners leave stamps (max 4)
    const win = cellSet(ev);
    for (const [k, n] of [...stamps]) { const [c, r] = split(k); if (win.has(key(c, r + off)) || n <= 1) stamps.delete(k); else stamps.set(k, n - 1); }
    for (const k of shuffle([...win])) {
        if (stamps.size >= 4) break;
        const [c, r] = split(k); if (r - off < 0 || isZ(grid[c][r])) continue;
        if (R() < 0.35) stamps.set(key(c, r - off), 6);
    }
    state.stamps = Object.fromEntries(stamps);
    if (doAuc) {
        kinds.push("auction"); feat(cfg, "auction");
        phases.push({ t: "fx", name: "auction" });
        phases.push({ t: "banner", text: "🔨 AUCTION HOUSE 🔨", cls: "jackpot" });
        const n = 4 + ri(5), items = [];
        let sum = 0;
        for (let i = 0; i < n; i++) { const v = cash(cfg, bet, pickW(VALS)); sum += v; items.push({ text: `${LUX[ri(LUX.length)]} ${short(v)}`, cls: v >= cash(cfg, bet, 10) ? "jp" : "ok" }); }
        phases.push({ t: "tap", mode: "grid", title: "🏓 입찰 패들을 탭! 낙찰받은 명품 = 즉시 현금", icon: "🏓", items });
        phases.push({ t: "win", cells: [], win: sum, text: "🔨 AUCTION HOUSE 낙찰" });
    }
    if (rows4) phases.push({ t: "rows", n: 3 }, { t: "show", grid: clone(grid.map(c => c.slice(1))), pop: [] });
    phases.push({ t: "badge", cells: [...stamps.keys()].map(split).map(([c, r]) => ({ c, r, text: "🪙", cls: "mult" })) });
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🥂 VIP Penthouse Strip — 5 marble doors (5x3), 243 ways
// =====================================================================
function vip(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doCh = hit("champagne"), doVip = !doCh && hit("vip"), doBn = !doCh && !doVip && hit("bouncer");
    let grid = draw(cfg, 5, 3), s0 = null;
    if (doBn) {
        s0 = anyHigh(cfg);
        for (let k = 0; k < 40; k++) {
            grid = draw(cfg, 5, 3, { [s0]: 0, W: [0, 0, 0, 1, 0] });
            grid[0][ri(3)] = s0; grid[1][ri(3)] = s0;
            if (!waysEval(cfg, grid, bet).win) break;
        }
    }
    const points = addPoints(grid);
    const kinds = [];
    if (doCh) inject(grid, "ZG", 3); else scatterTease(grid, "ZG", false, 5);
    if (doVip && isZ(grid[2][1])) grid[2][1] = one(cfg);
    const phases = [spinPhase(grid, "ZG", doCh)];
    if (doBn) phases[0].antic = [2];
    if (doVip) {
        kinds.push("vip"); feat(cfg, "vip");
        phases.push({ t: "focus", cells: [[2, 1]], ms: 700 });
        const best = cellsAll(grid).map(([c, r]) => grid[c][r]).filter(x => cfg.syms[x]?.pay).sort((a, b) => rank(cfg, b) - rank(cfg, a))[0] || "H1";
        const s = rank(cfg, best) >= rank(cfg, grid[2][1]) && best !== grid[2][1] ? best : ladder(cfg).at(-1);
        grid[2][1] = s;
        phases.push({ t: "fx", name: "vipup" });
        phases.push({ t: "morph", grid: clone(grid), cells: [[2, 1]], fx: "flare", text: `✨ VIP UPGRADE! 스포트라이트 속 심볼이 ${name(cfg, s)}(으)로 변신!` });
        // the upgraded spotlight symbol itself always pays (reels 1-2 line up behind it)
        if (!waysEval(cfg, grid, bet).lines.some(l => l.sym === s)) {
            const f = forceRun(cfg, grid, s, 3); grid = f.grid;
            phases.push({ t: "morph", grid: clone(grid), cells: f.changed, fx: "evolve", text: "✨ VIP 손님이 줄을 선다!" });
        }
    }
    let ev = waysEval(cfg, grid, bet);
    const w0 = winP(phases, cfg, ev, doVip ? "✨ VIP UPGRADE" : "");
    const baseWin = doVip ? 0 : w0;
    endFeat();
    if (doBn) {
        kinds.push("bouncer"); feat(cfg, "bouncer");
        phases.push({ t: "fx", name: "bouncer" });
        phases.push({ t: "badge", cells: [0, 1].flatMap(c => [0, 1, 2].filter(r => grid[c][r] === s0).map(r => ({ c, r, text: "🕴️", cls: "frozen" }))) });
        phases.push({ t: "banner", text: `🕴️ BOUNCER'S BLOCK · ${name(cfg, s0)} 문 2개 고정 · FREE RESPIN`, cls: "bonus" });
        let g = draw(cfg, 5, 3, { [s0]: 4 });
        g[0] = [...grid[0]]; g[1] = [...grid[1]];
        if (!g[2].some(x => x === s0 || isW(x))) g[2][ri(3)] = s0;
        phases.push({ t: "spin", grid: clone(g), hold: [0, 1] });
        ev = waysEval(cfg, g, bet);
        winP(phases, cfg, ev, "🕴️ BOUNCER'S BLOCK");
        grid = g;
    }
    if (doCh) {
        kinds.push("champagne"); feat(cfg, "champagne");
        phases.push({ t: "fx", name: "champagne" });
        phases.push({ t: "banner", text: "🥂 CHAMPAGNE TOWER 🥂", cls: "jackpot" });
        const TM = [2, 3, 5, 8, 12, 20];
        const ft = forcedTier(cfg, force);
        const reach = ft ? 6 : pickW([[2, 30], [3, 30], [4, 20], [5, 13], [6, 7]]);
        const topJp = reach === 6 && (ft || R() < 0.6);
        const items = TM.slice(0, reach).map((m, i) => ({ text: i === 5 && topJp ? "👑 TOP" : `${i + 1}층 x${m}`, cls: i >= 3 ? "jp" : "ok" }));
        phases.push({ t: "tap", mode: "rapid", title: "🍾 연타해서 샴페인을 따라라! 층마다 넘치면 배수 수집", icon: "🍾", items });
        phases.push({ t: "ladder", title: "🥂 CHAMPAGNE TOWER", icon: "🥂", steps: TM.map((m, i) => i === 5 ? "👑 JACKPOT" : `x${m}`), reached: reach - 1 });
        const mSum = TM.slice(0, topJp ? reach - 1 : reach).reduce((a, b) => a + b, 0);
        phases.push({ t: "win", cells: [], win: cash(cfg, bet, mSum), text: `🥂 CHAMPAGNE TOWER x${mSum}` });
        if (topJp) pushJp(phases, cfg, ctx, ft || pickTier(cfg, ctx, F.champagne.tw));
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// 🧈 Bullion Foundry — 12 molds (4x3), 81 ways
// =====================================================================
function foundry(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doHeist = hit("heist"), doHeavy = !doHeist && hit("heavy"), doMelt = !doHeist && !doHeavy && hit("melt");
    let grid = draw(cfg, 4, 3);
    const points = addPoints(grid);
    const kinds = [];
    if (doHeist) inject(grid, "ZD", 3); else scatterTease(grid, "ZD", false, 4);
    if (doMelt) inject(grid, "ZF", 1);
    const phases = [spinPhase(grid, "ZD", doHeist)];
    if (doMelt) {
        kinds.push("melt"); feat(cfg, "melt");
        const cells = cellsAll(grid).filter(([c, r]) => grid[c][r] === "L1" || grid[c][r] === "L2");
        phases.push({ t: "fx", name: "furnace" });
        for (const [c, r] of cells) grid[c][r] = "H2";
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🔥 24-KARAT MELT! 동괴·은괴 ${cells.length}개가 녹아 금괴로!` });
        ({ grid } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "🔥 금물이 주형 하나를 더 채운다!", 3, "H2"));
    }
    if (doHeavy) {
        kinds.push("heavy"); feat(cfg, "heavy");
        const n = R() < 0.72 ? 2 : 3, c0 = n === 3 ? ri(2) : ri(2), r0 = ri(4 - n);
        const cells = [];
        for (let c = c0; c < c0 + n; c++) for (let r = r0; r < r0 + n; r++) if (!isZ(grid[c][r])) { grid[c][r] = "H2"; cells.push([c, r]); }
        phases.push({ t: "block", c0, r0, n, icon: "🧈", text: `${n}x${n} GOLD BULLION` });
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🧱 HEAVY METAL DROP! 거대한 ${n}x${n} 금 블록이 쿵!` });
        ({ grid } = ensureRun(cfg, grid, g => waysEval(cfg, g, bet), phases, "🧱 금괴가 굴러 떨어진다!", 3, "H2"));
    }
    const ev = waysEval(cfg, grid, bet);
    const w0 = winP(phases, cfg, ev, doMelt ? "🔥 24K MELT" : doHeavy ? "🧱 HEAVY METAL" : "");
    const baseWin = doMelt || doHeavy ? 0 : w0;
    endFeat();
    if (doHeist) {
        kinds.push("heist"); feat(cfg, "heist");
        phases.push({ t: "fx", name: "dynamite" });
        phases.push({ t: "banner", text: "🧨 MINT VAULT HEIST 🧨", cls: "jackpot" });
        const r = tapBonus(cfg, ctx, phases, { mode: "grid", title: "🧈 경보가 울리기 전에 금괴 더미를 탭!", icon: "🧈", n: 4 + ri(6), jpChance: 0.3, tw: F.heist.tw, tier: forcedTier(cfg, force), tail: { text: "🚨 ALARM!", cls: "bad" } });
        payTap(phases, cfg, ctx, r, "🧨 HEIST 금괴");
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five: ev.five, lines: ev.lines });
}

// =====================================================================
// 💎 Prism Palace — 20-cell honeycomb (5 columns × 4, odd columns sit half a cell lower)
// =====================================================================
// hex neighbours ("odd-q" offset layout)
const hexNb = (c, r) => c % 2 ? [[c, r - 1], [c, r + 1], [c - 1, r], [c - 1, r + 1], [c + 1, r], [c + 1, r + 1]] : [[c, r - 1], [c, r + 1], [c - 1, r - 1], [c - 1, r], [c + 1, r - 1], [c + 1, r]];
const HEXDIR = [[0, -1], [0, 1], [-1, "up"], [-1, "dn"], [1, "up"], [1, "dn"]];
function hexEval(cfg, g, bet, { min = 4, scale = 1 } = {}) {
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
            const pay = cfg.syms[s].pay[Math.min(cells.length - min, cfg.syms[s].pay.length - 1)];
            const v = cash(cfg, bet, pay * scale * (1 + Math.max(0, cells.length - min - 2) * 0.5));
            lines.push({ sym: s, n: cells.length, ways: 1, mult: 1, win: v, cells, cluster: true }); total += v;
        }
    }
    return { win: total, lines, five: lines.filter(l => l.n >= 7).length };
}
function hexGroup(cfg, grid, size, sym = null, start = null) {
    const g = clone(grid), s = sym || anyHigh(cfg), C = g.length, Rn = g[0].length;
    const cells = [start || [ri(C), ri(Rn)]];
    for (let k = 0; k < 80 && cells.length < size; k++) {
        const [c, r] = cells[ri(cells.length)], nb = hexNb(c, r).filter(([x, y]) => x >= 0 && y >= 0 && x < C && y < Rn && !cells.some(([a, b]) => a === x && b === y) && !isZ(g[x][y]));
        if (nb.length) cells.push(nb[ri(nb.length)]);
    }
    const changed = cells.filter(([c, r]) => !isW(g[c][r]) && g[c][r] !== s);
    for (const [c, r] of changed) g[c][r] = s;
    return { grid: g, changed };
}
function ensureHex(cfg, grid, bet, phases, text, sym, start) {
    const ev = hexEval(cfg, grid, bet);
    if (ev.win) return { grid, ev };
    const f = hexGroup(cfg, grid, 4, sym, start);
    phases.push({ t: "morph", grid: clone(f.grid), cells: f.changed, fx: "evolve", text });
    return { grid: f.grid, ev: hexEval(cfg, f.grid, bet) };
}
// a laser walks from (c,r) in one hex direction until the edge
function beam(c, r, [dc, dv], C, Rn, max = 3) {
    const out = [];
    for (let k = 0; k < max; k++) {
        if (dc === 0) r += dv;
        else { const nb = hexNb(c, r); const pick = dc < 0 ? (dv === "up" ? nb[2] : nb[3]) : (dv === "up" ? nb[4] : nb[5]); [c, r] = pick; }
        if (c < 0 || r < 0 || c >= C || r >= Rn) break;
        out.push([c, r]);
    }
    return out;
}
function prism(cfg, ctx) {
    const { bet } = ctx, { F, hit, force } = ctl(cfg, ctx);
    const state = structuredClone(ctx.state || {});
    const doVault = hit("vault"), doLaser = !doVault && hit("laser"), doCut = !doVault && !doLaser && hit("cut");
    let grid = draw(cfg, 5, 4);
    const points = addPoints(grid);
    const kinds = [];
    if (doVault) inject(grid, "ZC", 3); else scatterTease(grid, "ZC", false, 5);
    if (doCut && !hexEval(cfg, grid, bet).win) grid = hexGroup(cfg, grid, 4 + ri(2), anyPay(cfg, 1, 2)).grid;
    const phases = [spinPhase(grid, "ZC", doVault)];
    if (doLaser) {
        kinds.push("laser"); feat(cfg, "laser");
        const wc = 1 + ri(3), wr = ri(4), s = anyHigh(cfg);
        grid[wc][wr] = "W";
        phases.push({ t: "morph", grid: clone(grid), cells: [[wc, wr]], fx: "wild", text: "💠 하얀 빔이 DIAMOND WILD에 명중!" });
        const dirs = shuffle([...HEXDIR]).slice(0, 2);
        const cells = [];
        for (const d of dirs) for (const [c, r] of beam(wc, wr, d, 5, 4)) if (!isZ(grid[c][r]) && !cells.some(([a, b]) => a === c && b === r)) cells.push([c, r]);
        phases.push({ t: "fx", name: "laser", cells });
        phases.push({ t: "fx", name: "refract" });
        for (const [c, r] of cells) grid[c][r] = s;
        phases.push({ t: "morph", grid: clone(grid), cells, fx: "flare", text: `🔆 LASER REFRACTION! 레이저 두 줄이 보석 ${cells.length}개를 ${name(cfg, s)}(으)로!` });
        ({ grid } = ensureHex(cfg, grid, bet, phases, "🔆 빛이 한 번 더 굴절된다!", s, [wc, wr]));
    }
    let ev = hexEval(cfg, grid, bet);
    const w0 = winP(phases, cfg, ev, doLaser ? "🔆 LASER REFRACTION" : "");
    const baseWin = doLaser || doCut ? 0 : w0;
    endFeat();
    let five = ev.five;
    if (doCut && ev.win) {
        kinds.push("cut"); feat(cfg, "cut");
        phases.push({ t: "fx", name: "flawless" });
        let g = clone(grid), e = ev;
        for (let k = 0; k < 8 && e.win; k++) {
            const gone = cellSet(e);
            phases.push({ t: "clear", cells: [...gone].map(split) });
            const over = { W: 0.9 };
            for (const l of e.lines) over[l.sym] = 7;
            for (let c = 0; c < 5; c++) { const keep = g[c].filter((_, r) => !gone.has(key(c, r))); g[c] = [...(draw(cfg, 1, 4 - keep.length, over)[0] || []), ...keep]; }
            phases.push({ t: "drop", grid: clone(g) });
            e = hexEval(cfg, g, bet);
            if (k === 0 && !e.win) { // the first tumble always chains
                const f = hexGroup(cfg, g, 4, ev.lines[0].sym); g = f.grid;
                phases.push({ t: "morph", grid: clone(g), cells: f.changed, fx: "flare", text: "💎 새 보석이 굴러와 다시 맞춰진다!" });
                e = hexEval(cfg, g, bet);
            }
            five += e.five;
            winP(phases, cfg, e, `💎 FLAWLESS CUT ${k + 1}`);
        }
        grid = g;
    }
    endFeat();
    if (doVault) {
        kinds.push("vault"); feat(cfg, "vault");
        phases.push({ t: "fx", name: "crowns" });
        phases.push({ t: "banner", text: "👑 CROWN JEWEL VAULT 👑", cls: "jackpot" });
        const ft = forcedTier(cfg, force), jp = ft || (R() < 0.3 ? pickTier(cfg, ctx, F.vault.tw) : null);
        const base = jp ? 5 : pickW([[10, 35], [15, 30], [20, 20], [30, 10], [50, 5]]);
        phases.push({ t: "pickn", title: "💍 보석함 하나를 골라라!", n: 3, k: 1, icon: "💍", reveals: [{ text: jp ? `💎 ${jpName(cfg, jp)}` : `💎 x${base}`, cls: "jp" }], rest: [{ text: `x${pickW([[10, 1], [20, 1]])}` }, { text: pickW([["MINI", 1], ["x15", 1], ["MAJOR", 1]]) }] });
        const steps = Array.from({ length: 3 + ri(4) }, () => pickW([[1, 70], [2, 30]]));
        const m = 1 + steps.reduce((a, b) => a + b, 0);
        phases.push({ t: "tap", mode: "rapid", title: "🪨 원석을 연타해 연마하라! (다이아몬드 배수)", icon: "🪨", items: steps.map(x => ({ text: `💎 +${x}x`, cls: x > 1 ? "jp" : "ok" })) });
        phases.push({ t: "win", cells: [], win: cash(cfg, bet, base * m), text: `👑 CROWN JEWEL x${base} × 💎${m}` });
        if (jp) pushJp(phases, cfg, ctx, jp);
    }
    endFeat();
    tease(phases, baseWin, kinds);
    return finish(cfg, ctx, { grid, phases, points, state, baseWin, kinds, antic: phases[0].antic, five, lines: ev.lines });
}

const wrap = fn => (cfg, ctx) => { endFeat(); try { return fn(cfg, ctx); } finally { endFeat(); } };
export const REALM_MACHINES = Object.fromEntries(Object.entries({
    sp_death: death, sp_karma: karma, sp_tavern: tavern, sp_office: office, sp_retro: retro,
    sp_polarity: polarity, sp_yacht: yacht, sp_vip: vip, sp_foundry: foundry, sp_prism: prism
}).map(([k, fn]) => [k, wrap(fn)]));
