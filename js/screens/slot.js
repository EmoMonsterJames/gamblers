// =====================================================================
// Slot machine screen. engine.js decides everything in one call; this
// file animates it: reels with teasing/anticipation, meters, free spins,
// grow reels, Hold & Spin, jackpot pick, wheels, omens and NUDGE.
// ctx: { pid, money(), luck, canPlay(), record(bet, win, points, extra), close() }
// =====================================================================
import { h, sleep, fmt, pick, shuffle, countUp } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, bigWin, banner, floatText, confetti, shake, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { spinWithLuck, P_POINTS, bestJackpot, MONKEY_WHEEL } from "../slots/engine.js";
import { BRAND_LOGO } from "../slots/configs.js";
import { JACKPOT_RANK } from "../data/catalog.js";
import { jackpotButton } from "../ui/jackpotList.js";

const TIER_ORDER = ["GRAND", "MAJOR", "MONKEY", "MAXI", "MINOR", "MINI"];

export function openSlot(cfg, ctx) {
    const classic = cfg.engine === "classic";
    const mk = cfg.engine === "monkey"; // Monkey Drop: money tree
    let bet = cfg.bets.find(b => b <= ctx.money()) || cfg.bets[0];
    let busy = false, auto = 0, turbo = false, closed = false;
    const rows = cfg.rows || 3, reelsN = classic ? 3 : (cfg.reels || 5);

    // ------------------------------------------------------------ symbols
    function symEl(key) {
        const def = (cfg.look && cfg.look[key]) || (key === "W" ? cfg.wild : null) || cfg.syms?.[key] || (key === "P" ? { e: "P", cls: "sym-p" } : { e: key });
        const cls = ["sym", "s-" + key.replace(/[^\w]/g, "_")];
        if (def.card) cls.push("sym-card", "card-" + key);
        if (def.cls) cls.push(def.cls);
        if (key === "W") cls.push("sym-wild");
        if (["F", "C", "B", "M", "M1", "M2", "M3", "R", "X", "BG", "WH", "7"].includes(key)) cls.push("sym-special");
        if (key === "P") cls.push("sym-p");
        const el = h("div." + cls.join("."), { "data-s": key });
        if (def.img) el.append(h("img", { src: def.img, alt: def.name || key, draggable: "false" }));
        else el.append(h("span", def.e ?? key));
        if (key === "W") el.append(h("small.tag", "WILD"));
        return el;
    }
    const randomKey = () => {
        if (classic) return pick(Object.keys(cfg.w));
        return pick([...Object.keys(cfg.syms), "W"]);
    };

    // ------------------------------------------------------------ DOM
    const moneyEl = h("b", fmt(ctx.money()));
    const winEl = h("b.win-amt", "0");
    const betEl = h("b", fmt(bet));
    const msgEl = h("div.slot-msg", cfg.desc);
    const jpBar = h("div.jp-bar");
    const meterEl = h("div.meter-zone");
    const reelEls = Array.from({ length: reelsN }, () => h("div.reel", h("div.strip")));
    const reelsBox = h("div.reels" + (classic ? ".classic" : ""), { style: { "--rows": rows } }, reelEls, classic ? h("div.payline") : null);
    const overlay = h("div.slot-overlay");
    const spinBtn = h("button.spin-btn", { onclick: () => doSpin() }, "SPIN");
    const autoBtn = h("button.btn.ghost.small", { onclick: () => { auto = auto ? 0 : 25; autoBtn.classList.toggle("on", !!auto); autoBtn.textContent = auto ? `AUTO ${auto}` : "AUTO"; if (auto && !busy) doSpin(); } }, "AUTO");
    const turboBtn = h("button.btn.ghost.small", { onclick: () => { turbo = !turbo; turboBtn.classList.toggle("on", turbo); } }, "⚡ TURBO");
    const logo = BRAND_LOGO[cfg.brand] ? h("img.brand-logo", { src: BRAND_LOGO[cfg.brand], alt: cfg.brand }) : h("span.brand-text", cfg.brand);
    const frame = h("div.reel-frame", reelsBox, overlay);
    const treeEl = cfg.tree ? h("div.mtree") : null;
    if (treeEl) meterEl.append(treeEl);
    // practice room: force the next spin's bonus
    const TEST_NAMES = { free: "무료스핀", hold: "Hold & Spin", wheel: "휠 보너스", pick: "잭팟 픽" };
    const tests = cfg.tests || Object.entries(cfg.features || {}).filter(([k, f]) => TEST_NAMES[k] && (k === "free" || f.sym)).map(([k]) => [k, TEST_NAMES[k]]);
    const testSel = ctx.test && !classic && tests.length ? h("select.test-sel", { title: "다음 스핀 보너스 강제 (연습실 전용)" }, h("option", { value: "" }, "🧪 보너스 테스트"), tests.map(([v, l]) => h("option", { value: v }, l))) : null;
    const forest = cfg.tree ? h("div.md-forest", { "aria-hidden": "true" },
        ["🌴", "🌳", "🌴", "🌳", "🌿", "🌿"].map((e, i) => h("span.mf-tree.t" + i, e)),
        h("span.mf-play.swing", "🐒"), h("span.mf-play.hop", "🐵"), h("span.mf-play.hop2", "🐒"), h("span.mf-play.banana", "🍌")) : null;
    const cabinet = h("div.cabinet.theme-" + cfg.id, { style: { "--bg": cfg.theme.bg, "--accent": cfg.theme.accent, "--glow": cfg.theme.glow, "--font": cfg.theme.font } },
        forest,
        h("div.cab-top", logo, h("div.cab-title", cfg.name), h("div.cab-btns", testSel, jackpotButton(cfg.id, cfg.name), h("button.btn.ghost.small.info", { onclick: () => paytable() }, "ⓘ"))),
        jpBar, meterEl,
        frame,
        msgEl,
        h("div.cab-ctrl",
            h("div.ctrl-box", h("small", "CREDIT"), moneyEl),
            h("div.ctrl-box.bet", h("button.bet-btn", { onclick: () => changeBet(-1) }, "−"), h("div", h("small", "BET"), betEl), h("button.bet-btn", { onclick: () => changeBet(1) }, "+")),
            h("div.ctrl-box", h("small", "WIN"), winEl),
            h("div.ctrl-btns", autoBtn, turboBtn),
            spinBtn));
    const root = h("div.game-screen.slot-screen",
        h("div.gs-head",
            h("button.btn.ghost.back", { onclick: () => { if (busy) return toast("스핀이 끝난 뒤 나갈 수 있어요", "warn"); closed = true; auto = 0; if (cfg.bgm) Sound.bgmStop(); ctx.close(); } }, "← 나가기"),
            h("div.gs-title", h("span.ico", "🎰"), h("div", h("b", cfg.name), h("small", `${cfg.brand} · ${cfg.progressive === false ? "NON-PROGRESSIVE" : "PROGRESSIVE"}`)))),
        cabinet);

    function changeBet(d) {
        if (busy) return;
        const i = cfg.bets.indexOf(bet);
        bet = cfg.bets[Math.max(0, Math.min(cfg.bets.length - 1, i + d))];
        betEl.textContent = fmt(bet); Sound.click();
    }
    function refresh() { moneyEl.textContent = fmt(ctx.money()); renderJackpots(); }

    // ------------------------------------------------------------ jackpots
    function renderJackpots() {
        if (!cfg.jp || cfg.progressive === false) { jpBar.replaceChildren(h("div.jp.classic-jp", "MAX WIN x20 WHEEL · 7 FREE GAMES · MONEY MATCH")); return; }
        const pool = Store.pool(cfg.id);
        jpBar.replaceChildren(...TIER_ORDER.filter(t => cfg.jp[t]).map(t => h("div.jp.jp-" + t.toLowerCase(), h("small", t), h("b", fmt(cfg.jp[t].x ? cfg.jp[t].x * bet : pool[t])))));
    }

    // ------------------------------------------------------------ meters
    function renderMeter() {
        if (treeEl) return renderTree();
        const M = cfg.meter, st = Store.machine(cfg.id);
        if (!M) { meterEl.replaceChildren(); return; }
        if (M.kind === "thermo") {
            const t = st.thermo || { hot: 0, extra: 0, cold: 0 };
            meterEl.replaceChildren(h("div.thermos", [["hot", "SO HOT", "images/slots/thermo-red.svg", "#ef4444"], ["extra", "SO EXTRA", "images/slots/thermo-yellow.svg", "#facc15"], ["cold", "SO COLD", "images/slots/thermo-blue.svg", "#38bdf8"]].map(([k, label, img, c]) =>
                h("div.thermo.t-" + k, { style: { "--c": c } }, h("img", { src: img, alt: "" }), h("div.tbar", h("i", { style: { height: (t[k] / M.max * 100) + "%" } })), h("small", `${label} ${t[k]}/${M.max}`)))));
        } else if (M.kind === "reelcoins") {
            const cols = st.cols || Array(reelsN).fill(0);
            meterEl.replaceChildren(h("div.reelcoins", cols.map((n, c) => h("div.rc", Array.from({ length: M.max }, (_, i) => h("i" + (i < n ? ".on" : ""), i < n ? "🪙" : "")), h("small", `${n}/${M.max}`)))));
        } else {
            const v = st.meter || 0, pct = v / M.max * 100;
            const icon = { piggy: "🐷", bag: "💰", fuse: "🧨", jar: cfg.look?.M?.e || "🏺" }[M.kind];
            const scale = M.kind === "piggy" ? 0.8 + v / M.max * 0.9 : 1;
            meterEl.replaceChildren(h("div.meter.m-" + M.kind + (pct >= 75 ? ".near" : ""),
                h("span.m-ico", { style: { transform: `scale(${scale})` } }, icon),
                h("div.m-bar", h("i", { style: { width: pct + "%" } })), h("small", `${M.title.replace(/[^\w\s!]/g, "").trim()} ${v}/${M.max}`)));
        }
    }

    // ------------------------------------------------------------ money tree (Monkey Drop)
    const tcLabel = cn => cn.x != null ? fmt(Math.round(cn.x * bet)) : cn.v != null ? fmt(cn.v) : cn.wheel ? "WHEEL" : cn.monkey ? "MONKEY" : cn.jp;
    const tcCls = cn => cn.wheel ? ".wheelc" : cn.monkey ? ".monkeyc" : cn.jp ? ".jpc.jp-" + cn.jp.toLowerCase() : "";
    const tcFace = cn => cn.wheel ? "🎡" : cn.monkey ? "🐵" : "🪙";
    function tcPos(id) { // stable spot in the canopy (golden-angle spiral)
        const a = id * 2.39996, r = 0.25 + 0.75 * Math.sqrt((id * 0.6180339) % 1);
        return [50 + 40 * r * Math.cos(a), 50 + 36 * r * Math.sin(a)];
    }
    function renderTree(tree = Store.machine(cfg.id).tree, hidden = null) {
        if (!treeEl) return;
        tree = tree || { coins: [], heap: 0 };
        const fill = Math.min(1, (tree.heap || 0) / cfg.tree.heapMax);
        treeEl.style.setProperty("--fill", fill.toFixed(3));
        treeEl.style.setProperty("--amp", (5 + fill * 30).toFixed(1) + "deg");
        treeEl.classList.toggle("heavy", fill >= 0.55);
        treeEl.classList.toggle("slipping", fill >= 0.85);
        const coins = tree.coins.map(cn => {
            const [x, y] = tcPos(cn.id);
            return h("i.tc" + tcCls(cn) + (hidden?.has(cn.id) ? ".incoming" : ""), { "data-id": cn.id, style: { left: x + "%", top: y + "%" }, title: tcLabel(cn) },
                tcFace(cn), cn.x == null ? h("small", cn.wheel ? "x2~10" : cn.monkey ? "UP" : cn.jp) : null);
        });
        const sp = tree.coins.filter(c => c.x == null);
        treeEl.replaceChildren(
            h("div.mt-trunk"), h("div.mt-canopy", h("div.mt-coins", coins)), h("div.mt-branch"),
            h("div.mt-monkey", h("span.mm-arm"), h("span.mm-body", "🐒"), h("span.mm-sweat", "💦")),
            h("div.mt-info", h("b", "MONEY TREE"), h("small", `🪙 ${tree.coins.length}개 · 무게 ${Math.round(fill * 100)}%`),
                h("div.mt-bar", h("i", { style: { width: fill * 100 + "%" } })),
                sp.length ? h("small.mt-sp", sp.slice(0, 6).map(c => c.wheel ? "🎡" : c.monkey ? "🐵" : c.jp).join(" ")) : null));
    }
    // a coin flying between two elements (reel → tree, tree → board …)
    async function fly(fromEl, toEl, content, { dur = 620, arc = -70, cls = "" } = {}) {
        if (!fromEl || !toEl) return;
        const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
        const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, dx = b.left + b.width / 2 - x0, dy = b.top + b.height / 2 - y0;
        const el = h("div.fly-coin" + (cls ? "." + cls : ""), content);
        el.style.left = x0 + "px"; el.style.top = y0 + "px";
        document.body.append(el);
        const d = dur * (turbo ? 0.5 : 1);
        const anim = el.animate([
            { transform: "translate(-50%,-50%) scale(1)" },
            { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 + arc}px)) scale(1.35) rotate(180deg)`, offset: 0.5 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.8) rotate(360deg)` }], { duration: d, easing: "ease-in-out", fill: "forwards" });
        await Promise.race([anim.finished, sleep(d + 80)]);
        el.remove();
    }
    function labelCoins(res) {
        for (const [k, cn] of Object.entries(res.coinVals || {})) {
            const [c, r] = k.split(",").map(Number);
            const el = cellsEl(c, r);
            if (el && !el.querySelector(".cv")) el.append(h("b.cv" + tcCls(cn), tcLabel(cn)));
        }
    }
    async function throwCoins(res) {
        if (!treeEl || !res.throws?.length) return;
        const ids = new Set(res.throws.map(t => t.coin.id));
        renderTree(res.treeMid, ids);
        await Promise.all(res.throws.map(async (t, i) => {
            await sleep(i * 110);
            const target = treeEl.querySelector(`[data-id="${t.coin.id}"]`) || treeEl.querySelector(".mt-canopy");
            cellsEl(t.c, t.r)?.classList.add("thrown");
            Sound.whoosh();
            await fly(cellsEl(t.c, t.r), target, tcFace(t.coin), { arc: -90 });
            target?.classList.remove("incoming"); target?.classList.add("landed");
            Sound.coin();
        }));
        treeEl.classList.add("got-coin"); await sleep(turbo ? 120 : 300); treeEl.classList.remove("got-coin");
    }

    // ------------------------------------------------------------ reels
    function setReel(c, symbols, rowsN = rows) {
        const strip = reelEls[c].firstChild;
        strip.getAnimations().forEach(a => a.cancel());
        strip.style.transform = "translateY(0)";
        reelEls[c].style.setProperty("--rows-r", rowsN);
        strip.replaceChildren(...symbols.map(symEl));
    }
    function showGrid(grid) { grid.forEach((col, c) => setReel(c, col, col.length)); }
    function initReels() {
        for (let c = 0; c < reelsN; c++) setReel(c, Array.from({ length: rows }, randomKey));
    }

    async function animateReels(grid, { anticipation = [], teaseSym = null, nearMiss = null } = {}) {
        const sp = turbo ? 0.45 : 1;
        reelEls.forEach(r => r.classList.remove("antic", "landed"));
        const anims = grid.map((col, c) => {
            const strip = reelEls[c].firstChild;
            strip.getAnimations().forEach(a => a.cancel());
            const n = col.length;
            reelEls[c].style.setProperty("--rows-r", n);
            const extra = anticipation.includes(c) ? 26 : 0;
            const fillerN = 10 + c * 4 + extra;
            const filler = Array.from({ length: fillerN }, randomKey);
            // near-miss: the bonus symbol slides by just under the window
            if (nearMiss && anticipation.includes(c)) filler[0] = nearMiss;
            const all = [...col, ...filler];
            strip.replaceChildren(...all.map(symEl));
            const cell = reelEls[c].getBoundingClientRect().height / n;
            const from = -(all.length - n) * cell;
            strip.style.transform = `translateY(${from}px)`;
            const dur = (700 + c * 260 + extra * 95) * sp;
            const a = strip.animate([{ transform: `translateY(${from}px)` }, { transform: "translateY(12px)", offset: 0.93 }, { transform: "translateY(0)" }],
                { duration: dur, easing: "cubic-bezier(.3,.1,.3,1)", fill: "forwards" });
            return { a, c, dur };
        });
        let tickOn = true;
        (async () => { while (tickOn) { Sound.tick(); await sleep(70); } })();
        for (const { a, c } of anims) {
            if (anticipation.includes(c)) {
                reelEls[c].classList.add("antic");
                Sound.tease();
                cabinet.classList.add("teasing");
            }
            await a.finished;
            reelEls[c].classList.remove("antic");
            reelEls[c].classList.add("landed");
            Sound.stop();
            const specials = [...reelEls[c].firstChild.children].slice(0, grid[c].length).filter(x => x.classList.contains("sym-special"));
            if (specials.length) { specials.forEach(s => s.classList.add("pop")); Sound.coin(); }
        }
        tickOn = false;
        cabinet.classList.remove("teasing");
    }
    function cellsEl(c, r) { return reelEls[c].firstChild.children[r]; }
    function highlight(cells, cls = "hit") { for (const [c, r] of cells) cellsEl(c, r)?.classList.add(cls); }
    function clearHighlights() { reelsBox.querySelectorAll(".hit,.dim,.pop,.ptsglow").forEach(e => e.classList.remove("hit", "dim", "pop", "ptsglow")); }

    // ------------------------------------------------------------ spin
    async function doSpin() {
        if (busy || closed) return;
        const can = ctx.canPlay();
        if (!can.ok) { auto = 0; autoBtn.classList.remove("on"); autoBtn.textContent = "AUTO"; return toast(can.why, "warn"); }
        if (bet > ctx.money()) { auto = 0; return toast("보유금액이 부족합니다", "warn"); }
        busy = true; cabinet.classList.add("busy"); spinBtn.disabled = true;
        clearHighlights(); overlay.replaceChildren();
        winEl.textContent = "0";
        ctx.record(bet, 0, 0, { pending: true });
        Store.contribute(cfg, bet);
        refresh();
        const force = testSel?.value || null;
        if (testSel) testSel.value = "";
        const res = spinWithLuck(cfg, { bet, state: Store.machine(cfg.id), luck: ctx.luck, pool: Store.pool(cfg.id), force });
        let total = 0;
        try {
            if (classic) total = await playClassic(res);
            else total = await playVideo(res);
        } catch (e) { console.error(e); }
        Store.setMachine(cfg.id, res.state, ctx.pid);
        renderMeter();
        // progressive jackpot payouts reset the pool
        for (const f of res.features) {
            const tiers = f.jpWins ? f.jpWins : f.type === "pick" ? [{ tier: f.tier, amount: f.amount }] : f.type === "wheel" && f.jp ? [{ tier: f.jp, amount: f.amount }] : [];
            for (const j of tiers) {
                await Store.hitJackpot(cfg, j.tier, ctx.pid, j.amount);
                if ((JACKPOT_RANK[j.tier] || 0) >= 3) Store.logJackpot(cfg.id, j.tier, ctx.pid, j.amount, { serverLogged: !!cfg.jp?.[j.tier] && !cfg.jp[j.tier].x });
            }
        }
        ctx.record(0, res.total, res.points, { settle: true, bet, bonus: res.bonus, jackpots: res.jackpots });
        winEl.textContent = fmt(res.total);
        refresh();
        if (res.points) { floatText(reelsBox, `+${res.points} P`, "pts"); Sound.coin(); }
        if (res.lucky) floatText(cabinet, res.lucky === "bonus" ? "🍀 펫이 보너스를 불렀다!" : "🍀 펫 행운!", "lucky");
        const jp = bestJackpot(res.jackpots);
        if (res.total >= bet * 15 && !jp) await bigWin(res.total, bet);
        busy = false; cabinet.classList.remove("busy"); spinBtn.disabled = false;
        if (auto > 0 && !closed) {
            auto--; autoBtn.textContent = auto ? `AUTO ${auto}` : "AUTO"; autoBtn.classList.toggle("on", !!auto);
            if (auto && !res.bonus) { await sleep(turbo ? 150 : 450); doSpin(); }
            else { auto = 0; autoBtn.classList.remove("on"); autoBtn.textContent = "AUTO"; }
        }
    }

    // ------------------------------------------------------------ video slots
    async function playVideo(res) {
        curRes = res;
        const nearMiss = !res.bonus && res.anticipation.length ? "F" : null;
        // meter tease
        if (cfg.meter && res.meterEvents.some(e => e.full)) cabinet.classList.add("meter-hot");
        if (treeEl && res.fall) treeEl.classList.add("about-to-fall");
        const omenP = res.omen && cfg.omens ? (mk ? monkeyOmen(res.omen) : slotOmen(cfg.omens[res.omen - 1])) : null;
        await animateReels(res.grid, { anticipation: res.anticipation, nearMiss: mk && !res.bonus && res.grid[0].includes("B") ? "C" : nearMiss && res.grid.some(c => c.includes("F")) ? "F" : (res.grid.some(c => c.includes("X")) ? "X" : res.grid.some(c => c.includes("R")) ? "R" : null) });
        if (omenP) await omenP;
        cabinet.classList.remove("meter-hot");
        if (mk) { labelCoins(res); await throwCoins(res); }
        // wild reels (Clover coins)
        for (const c of res.wildReels || []) {
            reelEls[c].classList.add("wild-reel"); Sound.bonus();
            setReel(c, Array(rows).fill("W"));
            await sleep(500);
        }
        // meter events
        const fulls = res.meterEvents.filter(e => e.full);
        if (fulls.length) await banner(cfg.meter.kind === "thermo" ? `🌡️ ${fulls.map(e => "SO " + e.key.toUpperCase()).join(" + ")} FULL!` : (cfg.meter.title || "METER FULL!"), 1300, "meter");
        renderMeter();
        // base wins
        if (res.base.win > 0) {
            reelsBox.querySelectorAll(".sym").forEach(s => s.classList.add("dim"));
            const cells = res.base.lines.flatMap(l => l.cells);
            highlight(cells); cells.forEach(([c, r]) => cellsEl(c, r)?.classList.remove("dim"));
            msgEl.innerHTML = res.base.lines.slice(0, 4).map(l => `${l.n}× ${symName(l.sym)} · ${l.ways} ways = <b>${fmt(l.win)}</b>`).join("<br>");
            Sound.win();
            await countUp(winEl, 0, res.base.win, 600);
            await sleep(turbo ? 250 : 700);
        } else if (res.anticipation.length && !res.bonus) {
            msgEl.innerHTML = `<span class="tease">아깝다!! 😱 한 개만 더…</span>`;
        } else msgEl.textContent = "";
        // points
        res.grid.forEach((col, c) => col.forEach((s, r) => { if (s === "P") cellsEl(c, r)?.classList.add("ptsglow"); }));
        let running = res.base.win;
        for (const f of res.features) {
            running += await playFeature(f, running);
            winEl.textContent = fmt(running);
        }
        return running;
    }
    function symName(k) { return cfg.syms?.[k]?.name || cfg.syms?.[k]?.e || k; }

    async function playFeature(f, already) {
        overlay.replaceChildren();
        if (f.type === "free" || f.type === "grow") return playFree(f, already);
        if (f.type === "hold") return playHold(f);
        if (f.type === "pick") return playPick(f);
        if (f.type === "wheel") return playWheel(f);
        if (f.type === "mhold") return playMonkeyHold(f);
        if (f.type === "mfall") return playMonkeyFall(f);
        if (f.type === "column") return playColumn(f);
        return 0;
    }
    let curRes = null;

    // ------------------------------------------------------------ Monkey Drop bonuses
    const boardCoin = cn => cn.wheel ? h("div.hs-coin.wheelc", h("span", "🎡"), h("b", "WHEEL"))
        : cn.monkey ? h("div.hs-coin.monkeyc", h("span", "🐒"), h("b", "MONKEY"))
            : cn.jp ? h("div.hs-coin.jpc.jp-" + cn.jp.toLowerCase(), h("span", "🪙"), h("b", cn.jp))
                : h("div.hs-coin", h("span", "🪙"), h("b.val", fmt(cn.v)));
    function holdHud(sumEl, lives) { return h("div.hs-hud", h("span", "RESPINS "), lives, h("span.hs-sum", "TOTAL ", sumEl)); }
    const setLives = (el, n, L = 3) => el.replaceChildren(...Array.from({ length: L }, (_, i) => h("i" + (i < n ? ".on" : ""))));
    // ---------------- Hold & Spin pacing + teasing (all slots)
    const pace = ms => turbo ? ms * 0.4 : ms;
    const isHot = cn => !!(cn.jp || cn.wheel || cn.monkey || cn.mod || cn.hammer);
    function fakeCoin() { // a decoy that peeks in and slips away
        const r = Math.random();
        if (r < 0.28) {
            const tiers = [["MINI", 30], ["MINOR", 25], ["MAXI", 14], ["MAJOR", 18], ["GRAND", 13]].filter(([t]) => cfg.jp?.[t]);
            let x = Math.random() * tiers.reduce((s, t) => s + t[1], 0);
            for (const [t, w] of tiers) if ((x -= w) < 0) return { jp: t };
        }
        if (mk && r < 0.5) return Math.random() < 0.5 ? { wheel: true } : { monkey: true };
        return { v: bet * pick([1, 2, 3, 5, 10, 20]) };
    }
    // a coin slowly peeks into an empty cell… then drops in (land) or slides past
    async function teaseCoin(cell, face, land, hot) {
        const t = h("div.hs-tease", { style: { "--t": pace(hot ? 1400 : 900) + "ms" } }, face);
        cell.append(t); cell.classList.add("teasing"); if (hot) cell.classList.add("tease-hot");
        if (hot) { Sound.heartbeat(); setTimeout(() => Sound.heartbeat(), pace(650)); } else Sound.tease();
        await sleep(pace(hot ? 1400 : 900));
        t.classList.add(land ? "in" : "out");
        if (!land) Sound.miss();
        await sleep(pace(land ? 260 : 420));
        t.remove(); cell.classList.remove("teasing", "tease-hot");
    }
    // one respin: spin the empty cells, then reveal real coins and decoys in a random order
    async function respinRound({ spinEl, added, cellOf, faceOf, place, empties, lastChance, fakeFn = fakeCoin }) {
        spinEl.classList.add("respin");
        for (let t = 0; t < 10; t++) { Sound.tick(); await sleep(pace(110)); }
        spinEl.classList.remove("respin");
        const taken = new Set(added.map(cellOf));
        const free = shuffle(empties.filter(c => !taken.has(c)));
        const nFake = !added.length ? (Math.random() < (lastChance ? 0.8 : 0.5) ? 1 + (Math.random() < 0.25 ? 1 : 0) : 0) : (Math.random() < 0.2 ? 1 : 0);
        const events = shuffle([...added.map(cn => ({ cn })), ...free.slice(0, nFake).map(cell => ({ cell, fake: fakeFn() }))]);
        let teased = 0;
        for (const e of events) {
            if (e.fake) { await teaseCoin(e.cell, faceOf(e.fake), false, isHot(e.fake)); continue; }
            const hot = isHot(e.cn);
            if (hot || (teased < 2 && Math.random() < 0.4)) { teased++; await teaseCoin(cellOf(e.cn), faceOf(e.cn), true, hot); }
            place(e.cn); Sound.coin();
            await sleep(pace(420));
        }
    }
    // during a respin the counter shows one life used; it refills only once a coin lands
    const livesDuring = (steps, i) => Math.max(0, steps[i - 1].lives - 1);
    async function endJackpots(f) { for (const j of f.jpWins || []) await bigWin(j.amount, bet, { jackpot: j.tier }); }

    // Hold & Spin: 6 coins drop from the money tree, then respins.
    async function playMonkeyHold(f) {
        Sound.bonus();
        treeEl?.classList.add("shake-tree");
        await banner("🌳 MONEY TREE DROP! 🌳", 1500, "bonus");
        const board = h("div.hs-board.md-board", { style: { "--cols": f.reels, "--rows": f.rows } });
        const cells = {};
        for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.reels; c++) { const el = h("div.hs-cell"); cells[c + "," + r] = el; board.append(el); }
        const lives = h("div.hs-lives"), sumEl = h("b", "0");
        overlay.append(h("div.hs-wrap.md-hold", holdHud(sumEl, lives), board));
        let sum = 0;
        const place = cn => {
            const el = cells[cn.c + "," + cn.r];
            el.replaceChildren(boardCoin(cn)); el.classList.add("locked", "pop");
            if (cn.wheel) el.classList.add("is-wheel"); if (cn.monkey) el.classList.add("is-monkey");
            sum += cn.v || 0; sumEl.textContent = fmt(sum);
        };
        for (let i = 0; i < f.steps.length; i++) {
            const st = f.steps[i];
            setLives(lives, i ? livesDuring(f.steps, i) : st.lives);
            if (i === 0) {
                // the drop: highlighted tree coins fall onto the board
                const srcs = st.added.map(cn => treeEl?.querySelector(`[data-id="${cn.id}"]`));
                srcs.forEach(s => s?.classList.add("dropping"));
                await sleep(turbo ? 200 : 600);
                for (let k = 0; k < st.added.length; k++) {
                    const cn = st.added[k], src = srcs[k] || treeEl?.querySelector(".mt-canopy");
                    Sound.coin();
                    await fly(src, cells[cn.c + "," + cn.r], cn.wheel ? "🎡" : cn.monkey ? "🐒" : "🪙", { arc: 20, dur: 480 });
                    srcs[k]?.remove();
                    place(cn);
                }
                treeEl?.classList.remove("shake-tree");
                await sleep(turbo ? 150 : 500);
                continue;
            }
            await respinRound({
                spinEl: board, added: st.added, cellOf: cn => cells[cn.c + "," + cn.r], faceOf: boardCoin, place,
                empties: Object.values(cells).filter(c => !c.classList.contains("locked")), lastChance: f.steps[i - 1].lives === 1
            });
            setLives(lives, st.lives);
            // monkey coins pump up value coins
            for (const b of st.boosts) {
                const m = cells[b.from[0] + "," + b.from[1]], t = cells[b.c + "," + b.r];
                m.classList.add("boosting"); Sound.cash();
                await fly(m, t, "🍌", { arc: -40, dur: 520 });
                const val = t.querySelector(".val"); if (val) val.textContent = fmt(b.v);
                t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop", "boosted");
                floatText(t, `+${fmt(b.add)}`, "pts");
                sum += b.add; sumEl.textContent = fmt(sum);
                m.classList.remove("boosting");
                await sleep(pace(350));
            }
            if (!st.added.length && !st.boosts.length) Sound.lose();
            await sleep(pace(700));
        }
        if (f.full) { await banner("FULL BOARD!!!", 1500, "jackpot"); confetti(120, ["💰", "🪙", "🍌"]); }
        // monkey wheels multiply the coin total
        if (f.wheels.length) {
            let mult = 0;
            for (const w of f.wheels) {
                cells[w.c + "," + w.r].classList.add("modfire");
                const keep = overlay.firstChild; keep.hidden = true;
                await wheelSpin(MONKEY_WHEEL.seg, w.idx, s => "x" + s, "🐵 MONKEY WHEEL 🐵");
                keep.hidden = false;
                mult += w.m;
                await banner(`🎡 x${w.m}!`, 1000, "meter");
            }
            await banner(`코인 ${fmt(f.coinSum)} × ${mult} = ${fmt(f.coinTotal)} G`, 1700, "jackpot");
            sumEl.textContent = fmt(f.coinTotal);
        }
        await endJackpots(f);
        await banner(`HOLD & SPIN 총 ${fmt(f.total)} G`, 1600, "bonus");
        overlay.replaceChildren();
        return f.total;
    }

    // The monkey falls out of the tree: centre collector + 7 circles.
    async function playMonkeyFall(f) {
        const mon = treeEl?.querySelector(".mt-monkey");
        mon?.classList.add("falling"); Sound.whoosh();
        await sleep(turbo ? 400 : 1000);
        Sound.boom(); shake(cabinet);
        treeEl?.classList.remove("about-to-fall");
        await banner("🐒 MONKEY DROP!! 🐒", 1700, "jackpot");
        const center = h("div.mf-center", h("span", "🐵"), h("b", "0"));
        const slots = Array.from({ length: f.slots }, (_, i) => h("div.mf-slot", { style: { "--a": (i * 360 / f.slots) + "deg" } }));
        const lives = h("div.hs-lives"), sumEl = h("b", "0");
        const ring = h("div.mf-ring", slots, center);
        overlay.append(h("div.hs-wrap.mf-wrap", holdHud(sumEl, lives), h("div.mf-stage", ring), h("small.mf-note", "7칸을 모두 채우면 🐵 MONKEY JACKPOT!")));
        let sum = 0;
        const fallFace = cn => h("div.mf-face", h("span", "🪙"), h("b" + (cn.jp ? ".jpl.jp-" + cn.jp.toLowerCase() : ""), cn.jp || fmt(cn.v)));
        const placeFall = cn => {
            const el = slots[cn.i];
            el.replaceChildren(...fallFace(cn).childNodes);
            el.classList.add("locked", "pop");
            sum += cn.v || 0; sumEl.textContent = fmt(sum);
        };
        for (let i = 0; i < f.steps.length; i++) {
            const st = f.steps[i];
            if (i === 0) {
                setLives(lives, st.lives);
                for (const cn of st.added) { placeFall(cn); Sound.coin(); await sleep(pace(380)); }
                await sleep(pace(600));
                continue;
            }
            setLives(lives, livesDuring(f.steps, i));
            await respinRound({
                spinEl: ring, added: st.added, cellOf: cn => slots[cn.i], faceOf: fallFace, place: placeFall, fakeFn: () => { const c = fakeCoin(); return c.wheel || c.monkey ? { v: bet * 8 } : c; },
                empties: slots.filter(s => !s.classList.contains("locked")), lastChance: f.steps[i - 1].lives === 1
            });
            setLives(lives, st.lives);
            if (!st.added.length) Sound.lose();
            await sleep(pace(700));
        }
        // the monkey collects everything into the centre
        let got = 0;
        for (const s of slots.filter(s => s.classList.contains("locked"))) {
            s.classList.add("collect");
            await fly(s, center, "🪙", { arc: -20, dur: 360 });
            const v = s.querySelector("b")?.textContent || "";
            if (/^[\d,]+$/.test(v)) { got += +v.replace(/,/g, ""); center.querySelector("b").textContent = fmt(got); }
            Sound.coin();
        }
        if (f.full) { center.classList.add("full"); await banner("FULL! 🐵 MONKEY JACKPOT 🐵", 1700, "jackpot"); confetti(160, ["🍌", "🪙", "🐒"]); }
        await endJackpots(f);
        await banner(`MONKEY BONUS 총 ${fmt(f.total)} G`, 1600, "bonus");
        overlay.replaceChildren();
        mon?.classList.remove("falling");
        return f.total;
    }

    // Monkey face on reel 1 collects the prize coins on the following reels.
    async function playColumn(f) {
        Sound.bonus();
        const br = curRes.grid[0].indexOf("B");
        const bEl = cellsEl(0, br);
        bEl?.classList.add("hit", "monkey-call");
        await banner(`🐵 MONKEY COLLECT · 동전 ${f.reels}릴 연속! 🐵`, 1300, "bonus");
        const tot = h("b.mc-total", "0");
        bEl?.append(tot);
        let sum = 0;
        for (let c = 1; c <= f.reels; c++) {
            for (const cn of f.coins.filter(x => x.c === c)) {
                const el = cellsEl(cn.c, cn.r);
                el?.classList.add("hit");
                await fly(el, bEl, "🪙", { arc: -50, dur: 420 });
                sum += cn.v || 0; tot.textContent = fmt(sum);
                bEl?.classList.remove("pop"); void bEl?.offsetWidth; bEl?.classList.add("pop");
                Sound.coin();
            }
        }
        await endJackpots(f);
        await banner(`MONKEY COLLECT ${fmt(f.total)} G`, 1500, "bonus");
        return f.total;
    }

    // 전조 for the regular video slots: cfg.omens = [{ fx: text | rain | burst | wind | shake, … }]
    async function slotOmen(o) {
        if (!o) return;
        await sleep(200);
        const rnd = Math.random;
        if (o.fx === "text") { const t = h("div.omen-text", o.text); cabinet.append(t); Sound.tease(); await sleep(1700); t.remove(); }
        if (o.fx === "shake") { frame.classList.add("omen-shake"); Sound.boom(); await sleep(1100); frame.classList.remove("omen-shake"); }
        if (o.fx === "rain") {
            const l = h("div.omen-coins.full", Array.from({ length: 28 }, (_, i) => h("i", { style: { left: 4 + rnd() * 92 + "%", "--d": rnd() * 0.9 + "s" } }, o.chars[i % o.chars.length])));
            cabinet.append(l); Sound.cash(); await sleep(1700); l.remove();
        }
        if (o.fx === "burst") {
            const l = h("div.omen-monkey", h("span.om-m", o.icon), Array.from({ length: 18 }, (_, i) => h("i", { style: { "--dx": (rnd() * 2 - 1) * 220 + "px", "--dy": -(60 + rnd() * 180) + "px", "--d": rnd() * 0.3 + 0.5 + "s" } }, o.chars[i % o.chars.length])));
            cabinet.append(l); Sound.cash(); await sleep(1700); l.remove();
        }
        if (o.fx === "wind") {
            const l = h("div.omen-wind", Array.from({ length: 26 }, (_, i) => h("i", { style: { top: rnd() * 90 + "%", "--d": rnd() * 0.9 + "s", "--r": (rnd() * 720 - 360) + "deg" } }, o.chars[i % o.chars.length])));
            cabinet.append(l); Sound.whoosh(); await sleep(1800); l.remove();
        }
    }

    async function monkeyOmen(kind) {
        await sleep(200);
        if (kind === 1) { const t = h("div.omen-text", cfg.omens[0]); cabinet.append(t); Sound.tease(); await sleep(1700); t.remove(); }
        if (kind === 2) { frame.classList.add("omen-shake"); Sound.boom(); await sleep(1100); frame.classList.remove("omen-shake"); }
        if (kind === 3) {
            const l = h("div.omen-monkey", h("span.om-m", "🐒"), Array.from({ length: 16 }, () => h("i", { style: { "--dx": (Math.random() * 2 - 1) * 220 + "px", "--dy": -(60 + Math.random() * 180) + "px", "--d": Math.random() * 0.3 + 0.5 + "s" } }, "🪙")));
            cabinet.append(l); Sound.cash(); await sleep(1700); l.remove();
        }
        if (kind === 4) {
            treeEl?.classList.add("shake-tree");
            const l = h("div.omen-coins", Array.from({ length: 26 }, () => h("i", { style: { left: 20 + Math.random() * 60 + "%", "--d": Math.random() * 0.9 + "s" } }, "🪙")));
            cabinet.append(l); Sound.cash(); await sleep(1600); l.remove(); treeEl?.classList.remove("shake-tree");
        }
        if (kind === 5) {
            const l = h("div.omen-wind", Array.from({ length: 24 }, (_, i) => h("i", { style: { top: Math.random() * 90 + "%", "--d": Math.random() * 0.9 + "s", "--r": (Math.random() * 720 - 360) + "deg" } }, i % 3 ? "🍃" : "🪙")));
            cabinet.append(l); Sound.whoosh(); await sleep(1800); l.remove();
        }
    }

    async function playFree(f, already) {
        Sound.bonus();
        await banner(f.type === "grow" ? "🌱 GROW REELS · 6 FREE SPINS 🌱" : `🎉 FREE SPINS × ${f.spins.length} ${f.mult > 1 ? `(x${f.mult})` : ""} 🎉`, 1700, "bonus");
        cabinet.classList.add("free-mode");
        const counter = h("div.fs-counter");
        const fsWin = h("b", "0");
        overlay.append(h("div.fs-hud", counter, h("div", h("small", "FREE WIN "), fsWin)));
        let sum = 0;
        for (let i = 0; i < f.spins.length; i++) {
            const s = f.spins[i];
            counter.textContent = `FREE SPIN ${i + 1} / ${f.spins.length}`;
            clearHighlights();
            reelEls.forEach((r, c) => r.classList.toggle("wild-reel", (s.wildReels || []).includes(c)));
            if (s.rows) reelsBox.style.setProperty("--rows", s.rows);
            const g = s.grid.map((col, c) => (s.wildReels || []).includes(c) ? col.map(() => "W") : col);
            await animateReels(g, {});
            if (s.win > 0) { highlight(s.lines.flatMap(l => l.cells)); Sound.win(); }
            if (s.retrig) { await banner(`+${s.retrig} FREE SPINS!`, 1100, "bonus"); }
            sum += s.win;
            fsWin.textContent = fmt(sum);
            winEl.textContent = fmt(already + sum);
            await sleep(turbo ? 200 : s.win ? 650 : 300);
        }
        reelEls.forEach(r => r.classList.remove("wild-reel"));
        reelsBox.style.setProperty("--rows", rows);
        cabinet.classList.remove("free-mode");
        overlay.replaceChildren();
        await banner(`FREE SPINS 총 ${fmt(f.total)} G`, 1500, "bonus");
        initReels();
        return f.total;
    }

    async function playHold(f) {
        Sound.bonus();
        const MODN = { hot: "🔥 SO HOT", extra: "✨ SO EXTRA", cold: "❄️ SO COLD" };
        const modsOn = f.modifiers || [];
        if (modsOn.length > 1) await banner(`${modsOn.length}개 동시 발동!!`, 1100, "jackpot");
        await banner(modsOn.length ? `${modsOn.map(m => MODN[m]).join(" + ")} · HOLD & SPIN` : "💰 HOLD & SPIN 💰", 1600, "bonus");
        const board = h("div.hs-board" + (f.rows > 4 ? ".tall" : ""), { style: { "--cols": f.reels, "--rows": f.rows } });
        const cells = {};
        for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.reels; c++) { const el = h("div.hs-cell" + (r < (f.ice || 0) ? ".iced" : "")); cells[c + "," + r] = el; board.append(el); }
        const lives = h("div.hs-lives");
        const sumEl = h("b", "0");
        overlay.append(h("div.hs-wrap", h("div.hs-hud", h("span", "RESPINS "), lives, h("span.hs-sum", "TOTAL ", sumEl), f.ice ? h("small.hs-note", "🔨 망치 = 얼음 한 줄 깨기") : null), board));
        const coinIcon = cfg.look?.C?.img ? h("img", { src: cfg.look.C.img }) : h("span", cfg.look?.C?.e || "🪙");
        const coinEl = cn => cn.mod ? h("div.hs-coin.mod.mod-" + cn.mod, h("span", { hot: "🔥", extra: "✨", cold: "❄️" }[cn.mod]), h("small", "SO " + cn.mod.toUpperCase()))
            : cn.hammer ? h("div.hs-coin.hammerc", h("img", { src: cfg.look?.HAMMER?.img || "images/slots/hammer.svg" }), h("b", fmt(cn.v)))
                : cn.jp ? h("div.hs-coin.jpc.jp-" + cn.jp.toLowerCase(), coinIcon.cloneNode(true), h("b", cn.jp))
                    : h("div.hs-coin", coinIcon.cloneNode(true), h("b", fmt(cn.v)));
        let sum = 0;
        const place = cn => {
            const el = cells[cn.c + "," + cn.r];
            el.replaceChildren(coinEl(cn)); el.classList.add("locked", "pop");
            if (cn.mod) el.classList.add("is-mod", "is-" + cn.mod);
            sum += cn.v || 0; sumEl.textContent = fmt(sum);
        };
        const bump = (el, v, note) => {
            const b = el.querySelector("b"); if (b) b.textContent = fmt(v);
            el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop", "boosted");
            if (note) floatText(el, note, "pts");
        };
        for (let i = 0; i < f.steps.length; i++) {
            const st = f.steps[i];
            if (i === 0) {
                setLives(lives, st.lives);
                for (const cn of st.added) { place(cn); Sound.coin(); await sleep(pace(cn.mod ? 650 : 300)); }
                await sleep(pace(600));
                continue;
            }
            setLives(lives, livesDuring(f.steps, i));
            await respinRound({
                spinEl: board, added: st.added, cellOf: cn => cells[cn.c + "," + cn.r], faceOf: coinEl, place,
                empties: Object.values(cells).filter(c => !c.classList.contains("locked") && !c.classList.contains("iced")), lastChance: f.steps[i - 1].lives === 1
            });
            setLives(lives, st.lives);
            // every hammer smashes one frozen row open
            const hammers = st.added.filter(cn => cn.hammer);
            for (let k = 0; k < (st.broke || []).length; k++) {
                const row = st.broke[k], hc = hammers[k] && cells[hammers[k].c + "," + hammers[k].r];
                hc?.classList.add("hammering"); Sound.whoosh();
                await sleep(pace(450));
                Sound.boom(); shake(board);
                for (let c = 0; c < f.reels; c++) { const el = cells[c + "," + row]; el.classList.remove("iced"); el.classList.add("crack"); }
                floatText(cells[Math.floor(f.reels / 2) + "," + row], "🧊 ROW UNLOCKED!", "lucky");
                await sleep(pace(700));
                hc?.classList.remove("hammering");
            }
            if (!st.added.length) Sound.lose();
            await sleep(pace(700));
        }
        // modifiers: EXTRA boosts → COLD multiplies → HOT collects everything
        for (const m of f.mods || []) {
            const el = cells[m.c + "," + m.r]; el.classList.add("modfire");
            await banner(m.mod === "hot" ? "🔥 SO HOT! 모든 코인 한번에 COLLECT" : m.mod === "cold" ? `❄️ SO COLD! 주변 코인 x${m.m}` : "✨ SO EXTRA! 주변 코인 상금 부스트", 1200, "meter");
            for (const hit of m.hits || []) {
                const t = cells[hit.c + "," + hit.r];
                await fly(el, t, m.mod === "cold" ? "❄️" : "✨", { arc: -30, dur: 380 });
                bump(t, hit.v, m.mod === "cold" ? `x${m.m}` : `+${fmt(hit.add)}`); Sound.cash();
                await sleep(pace(260));
            }
            if (m.mod === "hot") {
                for (const t of Object.values(cells)) {
                    if (t === el || !t.classList.contains("locked") || t.classList.contains("is-mod") || t.querySelector(".jpc")) continue;
                    t.classList.add("collect"); await fly(t, el, "🪙", { arc: -20, dur: 240 }); Sound.coin();
                }
                el.replaceChildren(h("div.hs-coin.mod.mod-hot", h("span", "🔥"), h("b", fmt(m.v))));
                el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
                floatText(el, `+${fmt(m.v)}`, "pts");
            }
            if (!(m.hits || []).length && m.mod !== "hot") floatText(el, "주변에 코인이 없다…", "lucky");
            await sleep(pace(500));
            el.classList.remove("modfire");
        }
        sumEl.textContent = fmt(f.coinSum);
        if (f.full) { await banner("FULL BOARD!!!", 1500, "jackpot"); confetti(120, ["💰", "🪙"]); }
        // jackpots in the hold
        for (const j of f.jpWins || []) await bigWin(j.amount, bet, { jackpot: j.tier });
        await banner(`HOLD & SPIN 총 ${fmt(f.total)} G`, 1600, "bonus");
        overlay.replaceChildren();
        return f.total;
    }

    async function playPick(f) {
        Sound.bonus();
        await banner(f.title || "JACKPOT PICK", 1500, "jackpot");
        // MINI_X2 / MINOR_X2 are matching items of their own (pay double)
        const baseOf = t => String(t).replace("_X2", "");
        const isX2 = t => String(t).endsWith("_X2");
        const rankOf = t => TIER_ORDER.indexOf(baseOf(t)) * 2 + (isX2(t) ? 0 : 1);
        const tiers = f.classic ? cfg.features.pick.prizes : f.items ? [...f.items].sort((a, b) => rankOf(a) - rankOf(b)) : TIER_ORDER.filter(t => cfg.jp?.[t]);
        const label = t => f.classic ? (t === "WHEEL" ? "🎡 WHEEL" : `x${t}`) : String(t).replace("_X2", " x2");
        const cls = t => ["pt-" + baseOf(t).toLowerCase(), ...(isX2(t) ? ["x2"] : [])];
        const grid = h("div.pick-grid");
        const found = {};
        const tally = h("div.pick-tally", tiers.map(t => h("div.pt." + cls(t).join("."), { "data-k": t }, h("b", label(t)), h("span", { "data-t": t }, "○○○"))));
        overlay.append(h("div.pick-wrap", h("div.pick-head", "같은 그림 3개를 맞혀라!"), tally, grid));
        let idx = 0;
        await new Promise(done => {
            for (let i = 0; i < f.tiles; i++) {
                const tile = h("button.ptile", h("span", f.classic ? "💰" : "🪙"));
                tile.onclick = async () => {
                    if (tile.classList.contains("open") || idx >= f.seq.length) return;
                    const t = f.seq[idx++];
                    tile.classList.add("open", ...cls(t));
                    tile.replaceChildren(h("b", label(t)));
                    Sound.coin();
                    found[t] = (found[t] || 0) + 1;
                    const sp = tally.querySelector(`[data-t="${t}"]`); if (sp) sp.textContent = "●".repeat(found[t]) + "○".repeat(Math.max(0, 3 - found[t]));
                    if (found[t] === 2) { tally.querySelector(`[data-k="${t}"]`)?.classList.add("near"); Sound.heartbeat(); }
                    if (idx >= f.seq.length) { await sleep(500); done(); }
                };
                grid.append(tile);
            }
            // auto pick if the player waits too long (auto-spin / spectators)
            const autoPick = async () => { while (idx < f.seq.length && !closed) { await sleep(9000); if (idx < f.seq.length) { const t = [...grid.children].find(x => !x.classList.contains("open")); t?.click(); await sleep(700); } } };
            autoPick();
        });
        [...grid.children].filter(x => !x.classList.contains("open")).forEach(x => x.classList.add("dim"));
        overlay.replaceChildren();
        if (f.sub) { const w = await playWheel(f.sub); return w; }
        if (f.classic) { await banner(`MONEY MATCH x${f.tier} = ${fmt(f.total)} G`, 1500, "bonus"); return f.total; }
        await bigWin(f.amount, bet, { jackpot: f.tier });
        if (f.x2) await banner(`${f.tier} x2 !!`, 1200, "jackpot");
        return f.total;
    }

    async function playWheel(f) {
        Sound.bonus();
        await banner(classic ? "🎡 MONEY WHEEL 🎡" : "🎡 BONUS WHEEL 🎡", 1400, "bonus");
        await wheelSpin(f.seg, f.idx, s => isNaN(parseFloat(s)) ? s : "x" + s);
        if (f.jp) { await bigWin(f.amount, bet, { jackpot: f.jp }); return f.amount; }
        await banner(`WHEEL x${f.mult} = ${fmt(f.win)} G`, 1500, "bonus");
        return f.win;
    }
    // draws a wheel in the overlay, waits for SPIN (or 6 s) and lands on idx
    async function wheelSpin(segs, idx, label, title = null) {
        const f = { seg: segs, idx };
        const n = f.seg.length, R = 140;
        const cols = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
        let svg = "";
        f.seg.forEach((s, i) => {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2, am = (a0 + a1) / 2;
            const jp = isNaN(parseFloat(s));
            svg += `<path d="M${R} ${R} L${R + R * Math.cos(a0)} ${R + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R + R * Math.cos(a1)} ${R + R * Math.sin(a1)}Z" fill="${jp ? "#111" : cols[i % 6]}" stroke="#fde68a" stroke-width="2"/>`;
            const tx = R + R * 0.68 * Math.cos(am), ty = R + R * 0.68 * Math.sin(am);
            svg += `<text x="${tx}" y="${ty}" fill="${jp ? "#facc15" : "#fff"}" font-size="${jp ? 14 : 18}" font-family="Lilita One" text-anchor="middle" dominant-baseline="middle" transform="rotate(${am * 180 / Math.PI + 90} ${tx} ${ty})">${label(s)}</text>`;
        });
        const hub = mk ? `<text x="140" y="142" font-size="30" text-anchor="middle" dominant-baseline="middle">🐵</text>` : "";
        const wheel = h("div.wheel.bonus-wheel", { html: `<svg viewBox="0 0 280 280">${svg}<circle cx="140" cy="140" r="24" fill="#fde68a" stroke="#92400e" stroke-width="4"/>${hub}</svg>` });
        const btn = h("button.btn.gold.big", "SPIN!");
        const wo = h("div.wheel-overlay", title ? h("div.wheel-title", title) : null, h("div.wheel-wrap", h("div.wheel-pointer", "▼"), wheel), btn);
        overlay.append(wo);
        await Promise.race([new Promise(r => btn.onclick = r), sleep(6000)]);
        btn.remove();
        const seg = 360 / n;
        const rot = 360 * 7 + (360 - (f.idx * seg + seg / 2));
        wheel.style.transition = "transform 5s cubic-bezier(.12,.67,.1,1)";
        wheel.style.transform = `rotate(${rot}deg)`;
        for (let i = 0; i < 34; i++) { Sound.tick(); await sleep(45 + i * 5); }
        await sleep(600);
        wo.remove();
    }

    // ------------------------------------------------------------ classic (Money Mesh)
    async function playClassic(res) {
        // omens (전조)
        const omenP = res.omen ? omen(res.omen) : null;
        let win = res.window.map(c => [...c]);
        if (res.nudge) {
            // show the third reel one step off, then NUDGE it into place
            const col = win[2];
            const dir = res.nudge.dir;
            const shifted = dir > 0 ? [col[1], col[2], "_"] : ["_", col[0], col[1]];
            win[2] = shifted;
        }
        await animateReels(win, { anticipation: res.anticipation, nearMiss: res.teaseSym });
        if (omenP) await omenP;
        if (res.nudge) {
            await sleep(300);
            await banner("👉 NUDGE! 👈", 1100, "nudge");
            setReel(2, res.window[2]);
            reelEls[2].classList.add("nudged");
            Sound.stop(); await sleep(400);
            reelEls[2].classList.remove("nudged");
        }
        if (res.teaseSym) msgEl.innerHTML = `<span class="tease">아깝다!! 😱</span>`;
        if (res.base.win > 0) {
            highlight([[0, 1], [1, 1], [2, 1]]);
            Sound.win();
            msgEl.innerHTML = `라인 WIN <b>${fmt(res.base.win)}</b>`;
            await countUp(winEl, 0, res.base.win, 500);
        } else if (!res.teaseSym) msgEl.textContent = "";
        res.window.forEach((col, c) => col.forEach((s, r) => { if (s === "P") cellsEl(c, r)?.classList.add("ptsglow"); }));
        let sum = res.base.win;
        for (const f of res.features) {
            if (f.type === "wheel") sum += await playWheel(f);
            else if (f.type === "pick") sum += await playPick(f);
            else if (f.type === "free") {
                Sound.bonus();
                await banner("7️⃣ 7 FREE GAMES 7️⃣", 1600, "bonus");
                cabinet.classList.add("free-mode");
                const counter = h("div.fs-counter"); overlay.append(h("div.fs-hud", counter));
                for (let i = 0; i < f.spins.length; i++) {
                    counter.textContent = `FREE GAME ${i + 1} / ${f.spins.length}`;
                    const s = f.spins[i];
                    clearHighlights();
                    await animateReels(s.window, {});
                    if (s.sub) { overlay.replaceChildren(); s.win = await playWheel(s.sub); overlay.append(h("div.fs-hud", counter)); }
                    else if (s.win) { highlight([[0, 1], [1, 1], [2, 1]]); Sound.win(); }
                    sum += s.win; winEl.textContent = fmt(sum);
                    await sleep(500);
                }
                cabinet.classList.remove("free-mode"); overlay.replaceChildren();
                await banner(`FREE GAMES 총 ${fmt(f.total)} G`, 1400, "bonus");
            }
        }
        return sum;
    }
    async function omen(kind) {
        await sleep(250);
        if (kind === 1) { cabinet.classList.add("omen-shake"); Sound.boom(); await sleep(1100); cabinet.classList.remove("omen-shake"); }
        if (kind === 2) { const l = h("div.omen-sevens", Array.from({ length: 26 }, (_, i) => h("i", { style: { left: Math.random() * 100 + "%", "--d": Math.random() * 0.8 + "s" } }, "7"))); cabinet.append(l); Sound.whoosh(); await sleep(1500); l.remove(); }
        if (kind === 3) { const t = h("div.omen-text", "✨ Your Luck is coming… ✨"); cabinet.append(t); Sound.tease(); await sleep(1700); t.remove(); }
        if (kind === 4) { const b = h("div.omen-bag", "💰"); cabinet.append(b); Sound.whoosh(); await sleep(1500); b.remove(); }
    }

    // ------------------------------------------------------------ paytable
    function paytable() {
        const rowsHtml = classic
            ? Object.entries(cfg.pays).map(([k, v]) => h("div.pt-row", h("span", { "7": "7 7 7", B3: "BAR3 x3", B2: "BAR2 x3", B1: "BAR x3", CH: "🍒🍒🍒", ANYBAR: "아무 BAR x3", CH2: "🍒 x2", CH1: "🍒 (첫 릴)" }[k] || k), h("b", "x" + v)))
            : Object.entries(cfg.syms).map(([k, s]) => h("div.pt-row", symEl(k), h("b", s.pay.map((p, i) => `${i + 3}개 ${+(p * (cfg.px || 1)).toFixed(2)}`).join(" · "))));
        modal(h("div.paytable",
            h("p", cfg.desc),
            h("p.muted", classic ? "한 줄(가운데) 라인. P 아이콘 = 포인트." : "243 WAYS · 왼쪽부터 연속된 릴. 배당은 총 베팅 대비 1 way 당 배수. P 아이콘 개수에 따라 1/3/6/10/20 포인트."),
            h("div.pt-list", rowsHtml)), { title: cfg.name + " 배당표" });
    }

    initReels(); renderJackpots(); renderMeter();
    if (cfg.bgm) Sound.bgm(cfg.bgm);
    const jpTimer = setInterval(() => { if (!document.body.contains(root)) { clearInterval(jpTimer); if (cfg.bgm && Sound.bgmPlaying === cfg.bgm) Sound.bgmStop(); } else if (!busy) renderJackpots(); }, 3000);
    return root;
}
