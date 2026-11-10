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
import { spinWithLuck, P_POINTS, bestJackpot } from "../slots/engine.js";
import { BRAND_LOGO } from "../slots/configs.js";
import { JACKPOT_RANK } from "../data/catalog.js";
import { jackpotButton } from "../ui/jackpotList.js";

const TIER_ORDER = ["GRAND", "MAJOR", "MAXI", "MINOR", "MINI"];

export function openSlot(cfg, ctx) {
    const classic = cfg.engine === "classic";
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
        if (["F", "C", "M", "M1", "M2", "M3", "R", "X", "BG", "WH", "7"].includes(key)) cls.push("sym-special");
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
    const cabinet = h("div.cabinet.theme-" + cfg.id, { style: { "--bg": cfg.theme.bg, "--accent": cfg.theme.accent, "--glow": cfg.theme.glow, "--font": cfg.theme.font } },
        h("div.cab-top", logo, h("div.cab-title", cfg.name), h("div.cab-btns", jackpotButton(cfg.id, cfg.name), h("button.btn.ghost.small.info", { onclick: () => paytable() }, "ⓘ"))),
        jpBar, meterEl,
        h("div.reel-frame", reelsBox, overlay),
        msgEl,
        h("div.cab-ctrl",
            h("div.ctrl-box", h("small", "CREDIT"), moneyEl),
            h("div.ctrl-box.bet", h("button.bet-btn", { onclick: () => changeBet(-1) }, "−"), h("div", h("small", "BET"), betEl), h("button.bet-btn", { onclick: () => changeBet(1) }, "+")),
            h("div.ctrl-box", h("small", "WIN"), winEl),
            h("div.ctrl-btns", autoBtn, turboBtn),
            spinBtn));
    const root = h("div.game-screen.slot-screen",
        h("div.gs-head",
            h("button.btn.ghost.back", { onclick: () => { if (busy) return toast("스핀이 끝난 뒤 나갈 수 있어요", "warn"); closed = true; auto = 0; ctx.close(); } }, "← 나가기"),
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
        const res = spinWithLuck(cfg, { bet, state: Store.machine(cfg.id), luck: ctx.luck, pool: Store.pool(cfg.id) });
        let total = 0;
        try {
            if (classic) total = await playClassic(res);
            else total = await playVideo(res);
        } catch (e) { console.error(e); }
        Store.setMachine(cfg.id, res.state, ctx.pid);
        renderMeter();
        // progressive jackpot payouts reset the pool
        for (const f of res.features) {
            const tiers = f.type === "hold" ? (f.jpWins || []) : f.type === "pick" ? [{ tier: f.tier, amount: f.amount }] : f.type === "wheel" && f.jp ? [{ tier: f.jp, amount: f.amount }] : [];
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
        const nearMiss = !res.bonus && res.anticipation.length ? "F" : null;
        // meter tease
        if (cfg.meter && res.meterEvents.some(e => e.full)) cabinet.classList.add("meter-hot");
        await animateReels(res.grid, { anticipation: res.anticipation, nearMiss: nearMiss && res.grid.some(c => c.includes("F")) ? "F" : (res.grid.some(c => c.includes("X")) ? "X" : res.grid.some(c => c.includes("R")) ? "R" : null) });
        cabinet.classList.remove("meter-hot");
        // wild reels (Clover coins)
        for (const c of res.wildReels || []) {
            reelEls[c].classList.add("wild-reel"); Sound.bonus();
            setReel(c, Array(rows).fill("W"));
            await sleep(500);
        }
        // meter events
        for (const e of res.meterEvents) {
            if (e.full) { await banner(cfg.meter.title || "METER FULL!", 1300, "meter"); }
        }
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
        return 0;
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
        await banner(f.modifier ? `🔥 ${f.modifier.toUpperCase()} HOLD & SPIN 🔥` : "💰 HOLD & SPIN 💰", 1600, "bonus");
        const board = h("div.hs-board", { style: { "--cols": f.reels, "--rows": f.rows } });
        const cells = {};
        for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.reels; c++) { const el = h("div.hs-cell"); cells[c + "," + r] = el; board.append(el); }
        const lives = h("div.hs-lives");
        const sumEl = h("b", "0");
        overlay.append(h("div.hs-wrap", h("div.hs-hud", h("span", "RESPINS "), lives, h("span.hs-sum", "TOTAL ", sumEl)), board));
        const coinIcon = cfg.look?.C?.img ? h("img", { src: cfg.look.C.img }) : h("span", cfg.look?.C?.e || "🪙");
        const coinEl = cn => cn.mod ? h("div.hs-coin.mod.mod-" + cn.mod, h("span", { hot: "🔥", extra: "✨", cold: "❄️" }[cn.mod]), h("small", cn.mod.toUpperCase()))
            : cn.jp ? h("div.hs-coin.jpc.jp-" + cn.jp.toLowerCase(), coinIcon.cloneNode(true), h("b", cn.jp))
                : h("div.hs-coin", coinIcon.cloneNode(true), h("b", fmt(cn.v)));
        let sum = 0;
        const L = 3;
        const setLives = n => lives.replaceChildren(...Array.from({ length: L }, (_, i) => h("i" + (i < n ? ".on" : ""))));
        for (let i = 0; i < f.steps.length; i++) {
            const st = f.steps[i];
            setLives(st.lives);
            if (i > 0) { board.classList.add("respin"); for (let t = 0; t < 6; t++) { Sound.tick(); await sleep(turbo ? 40 : 90); } board.classList.remove("respin"); }
            for (const cn of st.added) {
                const el = cells[cn.c + "," + cn.r];
                el.replaceChildren(coinEl(cn)); el.classList.add("locked", "pop");
                Sound.coin();
                sum += cn.v || 0; sumEl.textContent = fmt(sum);
                await sleep(turbo ? 60 : 160);
            }
            if (!st.added.length && i > 0) Sound.lose();
            await sleep(turbo ? 120 : 380);
        }
        // modifiers
        for (const m of f.mods || []) {
            const el = cells[m.c + "," + m.r]; el.classList.add("modfire");
            await banner(m.mod === "hot" ? "SO HOT! 모든 코인 수집" : m.mod === "cold" ? `SO COLD! 이웃 코인 x${m.m}` : "SO EXTRA! 이웃 코인 1.5배", 1200, "meter");
        }
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
        const tiers = f.classic ? cfg.features.pick.prizes : TIER_ORDER.filter(t => cfg.jp?.[t]);
        const label = t => f.classic ? (t === "WHEEL" ? "🎡 WHEEL" : `x${t}`) : t;
        const grid = h("div.pick-grid");
        const found = {};
        const tally = h("div.pick-tally", tiers.map(t => h("div.pt.pt-" + String(t).toLowerCase(), h("b", label(t)), h("span", { "data-t": t }, "○○○"))));
        overlay.append(h("div.pick-wrap", h("div.pick-head", "같은 그림 3개를 맞혀라!"), tally, grid));
        let idx = 0;
        await new Promise(done => {
            for (let i = 0; i < f.tiles; i++) {
                const tile = h("button.ptile", h("span", f.classic ? "💰" : "🪙"));
                tile.onclick = async () => {
                    if (tile.classList.contains("open") || idx >= f.seq.length) return;
                    const t = f.seq[idx++];
                    tile.classList.add("open", "pt-" + String(t).toLowerCase());
                    tile.replaceChildren(h("b", label(t)));
                    Sound.coin();
                    found[t] = (found[t] || 0) + 1;
                    const sp = tally.querySelector(`[data-t="${t}"]`); if (sp) sp.textContent = "●".repeat(found[t]) + "○".repeat(Math.max(0, 3 - found[t]));
                    if (found[t] === 2) { tally.querySelector(".pt-" + String(t).toLowerCase())?.classList.add("near"); Sound.heartbeat(); }
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
        const n = f.seg.length, R = 140;
        const cols = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
        let svg = "";
        f.seg.forEach((s, i) => {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2, am = (a0 + a1) / 2;
            const jp = isNaN(parseFloat(s));
            svg += `<path d="M${R} ${R} L${R + R * Math.cos(a0)} ${R + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R + R * Math.cos(a1)} ${R + R * Math.sin(a1)}Z" fill="${jp ? "#111" : cols[i % 6]}" stroke="#fde68a" stroke-width="2"/>`;
            const tx = R + R * 0.68 * Math.cos(am), ty = R + R * 0.68 * Math.sin(am);
            svg += `<text x="${tx}" y="${ty}" fill="${jp ? "#facc15" : "#fff"}" font-size="${jp ? 14 : 18}" font-family="Lilita One" text-anchor="middle" dominant-baseline="middle" transform="rotate(${am * 180 / Math.PI + 90} ${tx} ${ty})">${jp ? s : "x" + s}</text>`;
        });
        const wheel = h("div.wheel.bonus-wheel", { html: `<svg viewBox="0 0 280 280">${svg}<circle cx="140" cy="140" r="24" fill="#fde68a" stroke="#92400e" stroke-width="4"/></svg>` });
        const btn = h("button.btn.gold.big", "SPIN!");
        overlay.append(h("div.wheel-overlay", h("div.wheel-wrap", h("div.wheel-pointer", "▼"), wheel), btn));
        await Promise.race([new Promise(r => btn.onclick = r), sleep(6000)]);
        btn.remove();
        const seg = 360 / n;
        const rot = 360 * 7 + (360 - (f.idx * seg + seg / 2));
        wheel.style.transition = "transform 5s cubic-bezier(.12,.67,.1,1)";
        wheel.style.transform = `rotate(${rot}deg)`;
        for (let i = 0; i < 34; i++) { Sound.tick(); await sleep(45 + i * 5); }
        await sleep(600);
        overlay.replaceChildren();
        if (f.jp) { await bigWin(f.amount, bet, { jackpot: f.jp }); return f.amount; }
        await banner(`WHEEL x${f.mult} = ${fmt(f.win)} G`, 1500, "bonus");
        return f.win;
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
    const jpTimer = setInterval(() => { if (!document.body.contains(root)) clearInterval(jpTimer); else if (!busy) renderJackpots(); }, 3000);
    return root;
}
