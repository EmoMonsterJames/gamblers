// =====================================================================
// Slot machine screen. engine.js decides everything in one call; this
// file animates it: reels with teasing/anticipation, meters, free spins,
// grow reels, Hold & Spin, jackpot pick, wheels, omens and NUDGE.
// ctx: { pid, money(), luck, canPlay(), record(bet, win, points, extra), close() }
// =====================================================================
import { h, sleep, fmt, pick, shuffle, countUp } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { gameAudio } from "../core/gameAudio.js";
import { toast, bigWin, banner, floatText, confetti, shake, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { spinWithLuck, jackpotValue, P_POINTS, bestJackpot, MONKEY_WHEEL, MM_KEYS, CASCADE_FG } from "../slots/engine.js";
import { BRAND_LOGO } from "../slots/configs.js";
import { JACKPOT_RANK, ALPHABET } from "../data/catalog.js";
import { playSpecial, buildPanel } from "./slotSpecial.js";
import { jackpotButton } from "../ui/jackpotList.js";
import { showPetHelp } from "../ui/petHelp.js";

const TIER_ORDER = ["VAULT", "MEGA", "GRAND", "LOTUS", "STRIKE", "MAJOR", "JOKER", "MONKEY", "MAXI", "MINOR", "MINI"];

export function openSlot(cfg, ctx) {
    const classic = cfg.engine === "classic";
    const mk = cfg.engine === "monkey"; // Monkey Drop: money tree
    const egg = cfg.engine === "egg";   // Crack or Not: no reels, tap the egg
    const special = !!cfg.engine?.startsWith("sp_"); // the 7 special machines (slotSpecial.js)
    const MMK = cfg.meter && MM_KEYS[cfg.meter.kind] || null; // multi meters: [[key, sym], …]
    let bet = cfg.bets.find(b => b <= ctx.money()) || cfg.bets[0];
    let busy = false, auto = 0, turbo = false, closed = false;
    const rows = cfg.rows || 3, reelsN = egg ? 0 : classic ? 3 : (cfg.reels || 5);

    // ------------------------------------------------------------ symbols
    function symEl(key) {
        if (special && key === "_") return h("div.sym.sym-empty", { "data-s": "_" });
        const def = (cfg.look && cfg.look[key]) || (key === "W" ? cfg.wild : null) || cfg.syms?.[key] || (key === "P" ? { e: "P", cls: "sym-p" } : { e: key });
        const cls = ["sym", "s-" + key.replace(/[^\w]/g, "_")];
        if (def.card) cls.push("sym-card", "card-" + key);
        if (def.cls) cls.push(...def.cls.split(" ").filter(Boolean));
        if (key === "W" || key === "MW") cls.push("sym-wild");
        if (["F", "C", "B", "M", "M1", "M2", "M3", "M4", "M5", "R", "X", "BG", "WH", "7", "D", "N", "PK", "MT", "MS", "SW", "SU", "MO", "SB", "SK", "RB", "DS", "BL", "BP"].includes(key) || (special && /^Z/.test(key))) cls.push("sym-special");
        if (/^W[0-9]+$/.test(key)) cls.push("sym-wild");
        if (key === "P") cls.push("sym-p");
        const el = h("div." + cls.join("."), { "data-s": key });
        if (def.img) el.append(h("img", { src: def.img, alt: def.name || key, draggable: "false" }));
        else el.append(h("span", def.e ?? key));
        if (key === "W" || key === "MW") el.append(h("small.tag", "WILD"));
        else if (/^W[0-9]+$/.test(key)) el.append(h("small.tag", "x" + key.slice(1) + " WILD"));
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
    const msgEl = h("div.slot-msg"); // the description lives in the ⓘ info panel, not under the reels
    const jpBar = h("div.jp-bar");
    const meterEl = h("div.meter-zone");
    const reelEls = Array.from({ length: reelsN }, () => h("div.reel", h("div.strip")));
    const reelsBox = h("div.reels" + (classic ? ".classic" : ""), { style: { "--rows": rows } }, reelEls, classic ? h("div.payline") : null);
    if (special) { reelsBox.classList.add("sp-reels", "spr-" + reelsN); reelsBox.style.gridTemplateColumns = `repeat(${reelsN}, 1fr)`; }
    const overlay = h("div.slot-overlay");
    const spinBtn = h("button.spin-btn", { onclick: () => doSpin() }, egg ? "TAP!" : cfg.spinLabel || "SPIN");
    // hold-and-release launch (Orbital Launch): holding charges the thrusters, the release (click) fires
    if (cfg.holdSpin) {
        const off = () => spinBtn.classList.remove("charging");
        spinBtn.addEventListener("pointerdown", () => { if (!busy) { spinBtn.classList.add("charging"); Sound.tease(); } });
        for (const ev of ["pointerup", "pointerleave", "pointercancel"]) spinBtn.addEventListener(ev, off);
    }
    const autoBtn = h("button.btn.ghost.small", { onclick: () => { auto = auto ? 0 : 25; autoBtn.classList.toggle("on", !!auto); autoBtn.textContent = auto ? `AUTO ${auto}` : "AUTO"; if (auto && !busy) doSpin(); } }, "AUTO");
    const turboBtn = h("button.btn.ghost.small", { onclick: () => { turbo = !turbo; turboBtn.classList.toggle("on", turbo); } }, "⚡ TURBO");
    const logo = BRAND_LOGO[cfg.brand] ? h("img.brand-logo", { src: BRAND_LOGO[cfg.brand], alt: cfg.brand }) : h("span.brand-text", cfg.brand);
    const eggStage = egg ? buildEgg() : null;
    const frame = h("div.reel-frame" + (egg ? ".egg-frame" : ""), egg ? eggStage.el : reelsBox, overlay);
    // The Mimic's Labyrinth: a ring of flickering candles around the tilted (diamond) board, lit one by one
    if (cfg.skin === "dungeon") {
        const ring = h("div.dg-candles");
        const V = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        V.forEach((a, e) => {
            const b = V[(e + 1) % 4], nx = (a[0] + b[0]) / Math.SQRT2, ny = (a[1] + b[1]) / Math.SQRT2;
            [0.18, 0.5, 0.82].forEach((t, k) => {
                const x = a[0] + (b[0] - a[0]) * t + nx * 0.12, y = a[1] + (b[1] - a[1]) * t + ny * 0.12;
                ring.append(h("i.dg-candle", { style: { "--x": x.toFixed(3), "--y": y.toFixed(3), "--d": ((e * 3 + k) * 0.14).toFixed(2) + "s", "--f": (0.9 + ((e * 3 + k) * 37 % 7) / 10).toFixed(2) + "s", "--h": (k === 1 ? 1.25 : 1) } }));
            });
        });
        frame.append(ring);
    }
    const treeEl = cfg.tree ? h("div.mtree") : null;
    if (treeEl) meterEl.append(treeEl);
    // practice room: force the next spin's bonus
    const TEST_NAMES = { free: "무료스핀", hold: "Hold & Spin", wheel: "휠 보너스", pick: "잭팟 픽" };
    const tests = cfg.tests || Object.entries(cfg.features || {}).filter(([k, f]) => TEST_NAMES[k] && (k === "free" || f.sym)).map(([k]) => [k, TEST_NAMES[k]]);
    const testSel = ctx.test && !classic && tests.length ? h("select.test-sel", { title: "다음 스핀 보너스 강제 (연습실 전용)" }, h("option", { value: "" }, "🧪 보너스 테스트"), tests.map(([v, l]) => h("option", { value: v }, l))) : null;
    const forest = cfg.tree ? h("div.md-forest", { "aria-hidden": "true" },
        ["🌴", "🌳", "🌴", "🌳", "🌿", "🌿"].map((e, i) => h("span.mf-tree.t" + i, e)),
        h("span.mf-play.swing", "🐒"), h("span.mf-play.hop", "🐵"), h("span.mf-play.hop2", "🐒"), h("span.mf-play.banana", "🍌")) : null;
    const cabinet = h("div.cabinet.theme-" + cfg.id + (cfg.skin ? ".skin-" + cfg.skin : "") + (cfg.dbl ? ".dbl-reels" : ""), { style: { "--bg": cfg.theme.bg, "--accent": cfg.theme.accent, "--glow": cfg.theme.glow, "--font": cfg.theme.font } },
        forest, themeDeco(),
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
            h("button.btn.ghost.back", { onclick: () => { if (busy) return toast("스핀이 끝난 뒤 나갈 수 있어요", "warn"); closed = true; auto = 0; Sound.bgmStop(); Sound.palette(null); ctx.close(); } }, "← 나가기"),
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
        if (cfg.jpText) { jpBar.replaceChildren(h("div.jp.classic-jp", cfg.jpText)); return; }
        if (!cfg.jp) { jpBar.replaceChildren(h("div.jp.classic-jp", "MAX WIN x20 WHEEL · 7 FREE GAMES · MONEY MATCH")); return; }
        const pool = Store.pool(cfg.id);
        jpBar.replaceChildren(...TIER_ORDER.filter(t => cfg.jp[t]).map(t => h("div.jp.jp-" + t.toLowerCase(), h("small", cfg.jpLabel?.[t] || t), h("b", fmt(jackpotValue(cfg, t, bet, pool))))));
    }

    // ------------------------------------------------------------ meters
    // Meters are built once and then updated in place, so every rise animates
    // (CSS transitions) and a full meter keeps rattling as if about to burst.
    let meterDom = null; // { kind, parts: { key: { el, … } } }
    const stageOf = f => f >= 1 ? "full" : f >= 0.6 ? "near" : f >= 0.3 ? "mid" : "low";
    function setStage(el, f) {
        el.style.setProperty("--fill", Math.min(1, f).toFixed(3));
        for (const s of ["low", "mid", "near", "full"]) el.classList.toggle("st-" + s, stageOf(f) === s);
    }
    function bumpEl(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    function renderMeter(st = Store.machine(cfg.id)) {
        if (treeEl) return renderTree();
        if (special) return;
        if (cfg.engine === "cascade") return renderCascadeLadder(0);
        const M = cfg.meter;
        if (!M || M.off) { meterEl.replaceChildren(); meterDom = null; return; }
        const build = !meterDom || meterDom.kind !== M.kind;
        if (build) meterDom = { kind: M.kind, parts: {} };
        const P = meterDom.parts;
        if (MMK) {
            const sk = M.kind === "thermo" ? "thermo" : "mm";
            const vals = st[sk] || {}, counts = st.mmN || {};
            if (build) meterEl.replaceChildren(mmBuild(M, P));
            for (const [k] of MMK) {
                const p = P[k]; if (!p) continue;
                const v = vals[k] || 0, f = v / M.max;
                setStage(p.el, f);
                if (v > (p.v ?? 0)) bumpEl(p.el);
                p.update(v, f, counts[k] ?? M.counts?.start);
                p.v = v;
            }
            if (M.kind === "boxes") updateTreasure(MMK.reduce((s, [k]) => s + (vals[k] || 0), 0) / (M.max * 3));
            return;
        }
        if (M.kind === "reelcoins") {
            const cols = st.cols || Array(reelsN).fill(0);
            if (build) meterEl.replaceChildren(h("div.reelcoins", cols.map((n, c) => { const el = h("div.rc"); P[c] = { el }; return el; })));
            cols.forEach((n, c) => {
                const p = P[c]; if (!p) return;
                setStage(p.el, n / M.max);
                if (n > (p.v ?? 0)) bumpEl(p.el);
                p.el.replaceChildren(...Array.from({ length: M.max }, (_, i) => h("i" + (i < n ? ".on" : ""), i < n ? "🪙" : "")), h("small", `${n}/${M.max}`));
                p.v = n;
            });
            return;
        }
        const v = st.meter || 0, f = v / M.max;
        if (build) {
            const icon = { piggy: "🐷", bag: "💰", fuse: "🧨", jar: cfg.look?.M?.e || "🏺" }[M.kind];
            const ico = h("span.m-ico", icon), bar = h("i"), txt = h("small");
            const el = h("div.meter.m-" + M.kind, h("div.m-ico-wrap", ico, h("span.m-spark", "💥")), h("div.m-bar", bar), txt);
            P.main = { el, ico, bar, txt };
            meterEl.replaceChildren(el);
        }
        const p = P.main;
        setStage(p.el, f);
        p.ico.style.transform = `scale(${(0.75 + f * 0.95).toFixed(3)})`;
        p.bar.style.width = f * 100 + "%";
        p.txt.textContent = `${M.title.replace(/[^\w\s!]/g, "").trim()} ${v}/${M.max}${f >= 1 ? " · 곧 터진다!!" : ""}`;
        if (v > (p.v ?? 0)) bumpEl(p.el);
        p.v = v;
    }
    // element a meter symbol flies to / bursts from
    function meterTarget(key) {
        const P = meterDom?.parts || {};
        if (key == null) return P.main?.ico || meterEl;
        return P[key]?.target || P[key]?.el || meterEl;
    }
    // multi-meter widgets (thermometers, cats, frogs, boxes)
    function mmBuild(M, P) {
        if (M.kind === "thermo") {
            const DEF = { hot: ["SO HOT", "images/slots/thermo-red.svg", "#ef4444"], extra: ["SO EXTRA", "images/slots/thermo-yellow.svg", "#facc15"], cold: ["SO COLD", "images/slots/thermo-blue.svg", "#38bdf8"] };
            return h("div.thermos", MMK.map(([k]) => {
                const [label, img, c] = DEF[k];
                const bar = h("i"), txt = h("small"), pic = h("img", { src: img, alt: "" });
                const el = h("div.thermo.t-" + k, { style: { "--c": c } }, pic, h("div.tbar", bar), txt);
                P[k] = { el, target: pic, update: (v, f) => { bar.style.height = f * 100 + "%"; txt.textContent = `${label} ${v}/${M.max}`; } };
                return el;
            }));
        }
        if (M.kind === "cats") {
            const DEF = { happy: ["😸", "HAPPY", "릴 +1"], lucky: ["😺", "LUCKY", "잭팟 알"], meow: ["😽", "MEOW", "알 UP"], rich: ["😼", "RICH", "COLLECT"], fluffy: ["😻", "FLUFFY", "INSTANT"] };
            return h("div.cats-row", MMK.map(([k]) => {
                const [face, nm, power] = DEF[k];
                const pile = h("div.ingots"), faceEl = h("div.cat-face", face, h("span.cat-sweat", "💦"));
                const el = h("div.cat-slot.k-" + k, h("div.cat-hold", pile, h("span.cat-paws", "🐾 🐾")), faceEl, h("div.cat-name", h("b", nm), h("small", power)));
                P[k] = {
                    el, target: pile, update: (v) => {
                        const now = pile.children.length;
                        for (let i = now; i < v; i++) pile.append(h("i.ingot" + (i >= now && now ? ".drop" : ""), { style: { "--i": i } }));
                        while (pile.children.length > v) pile.lastChild.remove();
                    }
                };
                return el;
            }));
        }
        if (M.kind === "frogs") {
            const DEF = { spin: ["Ribbit Spin", "frog-g"], catch: ["Ribbit Catch", "frog-y"], pick: ["Ribbit Pick", "frog-o"] };
            return h("div.pond", h("div.pond-water"), h("div.pond-fish", "🐠", h("span", "🐟"), h("span.f3", "🐠")),
                h("div.lotus-row", MMK.map(([k]) => {
                    const [label, cls] = DEF[k];
                    const frog = h("div.lp-frog." + cls, "🐸");
                    const el = h("div.lotus.k-" + k, h("div.lp-label", label), h("div.lp-stack", frog, h("div.lp-pad", h("span", "🪷"))), h("div.lp-ripple"));
                    P[k] = { el, target: frog, update: () => { } };
                    return el;
                })));
        }
        if (M.kind === "boxes") {
            const DEF = { red: ["FREE GAMES", "#ef4444"], rainbow: ["FREE GAMES & WILDS", "rainbow"], yellow: ["WILDS", "#facc15"] };
            treasureEl = h("div.treasure");
            return h("div.boxes-zone", treasureEl, h("div.boxes-row", MMK.map(([k]) => {
                const [label] = DEF[k];
                const num = h("b.bx-n", "6");
                const art = h("div.bx-art", h("div.bx-lid", h("i.bx-bow")), h("div.bx-body", h("i.bx-ribbon")));
                const el = h("div.lbox.k-" + k, art, h("div.bx-count", h("small", label), num));
                P[k] = { el, target: art, update: (v, f, n) => { if (String(n) !== num.textContent) { num.textContent = n; bumpEl(num); } } };
                return el;
            })));
        }
        return h("div");
    }
    let treasureEl = null;
    function updateTreasure(f) {
        if (!treasureEl) return;
        const want = Math.round(4 + f * 26);
        const GEMS = ["💰", "💎", "🪙", "👑", "💍", "🪙", "📿", "💎"];
        while (treasureEl.children.length < want) {
            const i = treasureEl.children.length, a = i * 2.39996, r = 0.35 + 0.65 * ((i * 0.618) % 1);
            treasureEl.append(h("i", { style: { left: 50 + 47 * r * Math.cos(a) + "%", top: 62 + 30 * r * Math.sin(a) + "%", "--d": (i % 7) * 0.13 + "s" } }, GEMS[i % GEMS.length]));
        }
        while (treasureEl.children.length > want) treasureEl.lastChild.remove();
    }
    // Niagara: cascade counter ladder (4+ in a row = free games)
    let ladderEl = null;
    function renderCascadeLadder(n) {
        if (!ladderEl) {
            ladderEl = h("div.cascade-ladder", [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => h("div.cl-step" + (i >= 4 ? ".fg" : ""), h("b", i), i >= 4 ? h("small", `${CASCADE_FG[i]} FG`) : h("small", "CASCADE"))));
            meterEl.replaceChildren(ladderEl);
        }
        [...ladderEl.children].forEach((el, i) => { el.classList.toggle("on", i < n); el.classList.toggle("now", i === n - 1); });
        ladderEl.classList.toggle("hot", n >= 3);
    }
    // a meter symbol on the reels flies up to its meter
    async function flyMeterSyms(grid) {
        const M = cfg.meter;
        if (!M || !grid) return;
        const map = MMK ? Object.fromEntries(MMK.map(([k, s]) => [s, k])) : { M: M.kind === "reelcoins" ? "col" : null };
        const list = [];
        grid.forEach((col, c) => col.forEach((s, r) => { if (s in map) list.push({ c, r, s, key: map[s] === "col" ? c : map[s] }); }));
        await Promise.all(list.map(async (x, i) => {
            await sleep(i * 90);
            const el = cellsEl(x.c, x.r);
            const face = el?.querySelector("img") ? el.querySelector("img").cloneNode() : (cfg.look?.[x.s]?.e || "🪙");
            await fly(el, meterTarget(x.key), face, { arc: -90, dur: 560, cls: "to-meter" });
            Sound.coin();
        }));
    }
    // meter events of one spin: rise (animated) → burst (any fill) → reset
    async function animateMeter(res) {
        const M = cfg.meter;
        if (!M || M.off || treeEl || !res.meterEvents?.length) return;
        const pre = structuredClone(res.state || {});
        const sk = M.kind === "thermo" ? "thermo" : "mm";
        for (const e of res.meterEvents) {
            if (e.value == null) continue;
            if (MMK) { (pre[sk] ||= {})[e.key] = e.value; if (e.n != null) (pre.mmN ||= {})[e.key] = e.n; }
            else if (M.kind === "reelcoins") (pre.cols ||= [])[e.reel] = e.value;
            else pre.meter = e.value;
        }
        // values at the moment of the burst
        for (const e of res.meterEvents.filter(e => e.full)) {
            if (MMK) { (pre[sk] ||= {})[e.key] = Math.max(pre[sk][e.key] || 0, Math.round(e.at * M.max)); if (e.n != null) (pre.mmN ||= {})[e.key] = e.n; }
            else if (M.kind === "reelcoins") (pre.cols ||= [])[e.reel] = Math.round(e.at * M.max);
            else pre.meter = Math.round(e.at * M.max);
        }
        await flyMeterSyms(res.grid);
        renderMeter(pre);
        await sleep(pace(500));
        const fulls = res.meterEvents.filter(e => e.full);
        if (fulls.length) {
            const els = fulls.map(e => meterDom?.parts?.[MMK ? e.key : M.kind === "reelcoins" ? e.reel : "main"]?.el).filter(Boolean);
            els.forEach(el => el.classList.add("bursting"));
            Sound.heartbeat(); await sleep(pace(700));
            Sound.boom(); shake(meterEl);
            for (const el of els) burstFx(el);
            const early = fulls.every(e => e.at < 1);
            const what = MMK ? burstTitle(M.kind, fulls.map(e => e.key)) : M.kind === "reelcoins" ? "🍀 WILD REEL!" : (M.title || "METER FULL!");
            await banner((early ? "💥 깜짝! " : "") + what, 1400, "meter");
            els.forEach(el => el.classList.remove("bursting"));
        }
        renderMeter(res.state);
    }
    function burstTitle(kind, keys) {
        if (kind === "thermo") return `🌡️ ${keys.map(k => "SO " + k.toUpperCase()).join(" + ")} BURST!`;
        if (kind === "cats") return keys.length === 5 ? "😸😺😽😼😻 5 CATS ALL IN!!! 😸😺😽😼😻" : `🐱 ${keys.map(k => k.toUpperCase()).join(" + ")} 금덩이 펑!`;
        if (kind === "frogs") return `🐸 ${keys.map(k => "RIBBIT " + k.toUpperCase()).join(" + ")}!`;
        if (kind === "boxes") return `🎁 ${keys.map(k => ({ red: "RED", rainbow: "RAINBOW", yellow: "YELLOW" }[k])).join(" + ")} BOX OPEN!`;
        return "BURST!";
    }
    function burstFx(el) {
        const r = el.getBoundingClientRect();
        const l = h("div.burst-fx", { style: { left: r.left + r.width / 2 + "px", top: r.top + r.height / 2 + "px" } },
            Array.from({ length: 16 }, (_, i) => h("i", { style: { "--a": (i * 22.5) + "deg", "--d": (60 + Math.random() * 70) + "px" } }, ["✨", "🪙", "💥", "⭐"][i % 4])));
        document.body.append(l); setTimeout(() => l.remove(), 1100);
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

    // ------------------------------------------------------------ special machines (slotSpecial.js)
    const spPanel = special ? buildPanel(cfg, Store.machine(cfg.id)) : null;
    if (spPanel) meterEl.append(spPanel.el);
    const spApi = special ? {
        cfg, get bet() { return bet; }, turbo: () => turbo, Sound, overlay, msgEl, winEl, cabinet, frame, reelsBox,
        animateReels, showGrid, setReel, cellsEl, highlight, banner, bigWin, wheelSpin, playPick, fly, floatText, shake, confetti,
        meter: (k, v, m) => spPanel?.set(k, v, m)
    } : null;

    // ------------------------------------------------------------ alphabet cards (G·A·M·B·L·E·R·S)
    // During a season a letter sometimes appears on the reels → card for the bag.
    async function alphabetDrop() {
        const rate = typeof ctx.cardRate === "function" ? ctx.cardRate(bet, cfg.bets) : (ctx.cardRate ?? 0.0004);
        if (!ctx.gainCard || Math.random() >= rate) return;
        const L = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        const cells = egg ? [] : Array.from({ length: reelsN }, (_, c) => Array.from({ length: rows }, (_, r) => cellsEl(c, r))).flat().filter(Boolean);
        const cell = cells.length ? cells[Math.floor(Math.random() * cells.length)] : cabinet;
        const badge = h("b.abc-card", L);
        cell.append(badge);
        Sound.bonus();
        await sleep(turbo ? 350 : 800);
        await fly(cell, moneyEl, h("b.abc-card.flying", L), { arc: -60 });
        badge.remove();
        ctx.gainCard(L);
        floatText(cabinet, `🔤 알파벳 카드 ${L} 획득!`, "lucky");
    }

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
            else if (egg) total = await playEgg(res);
            else if (special) {
                if (res.omen && cfg.omens) await slotOmen(cfg.omens[res.omen - 1]);
                const o = await playSpecial(res, spApi);
                // interactive bonuses (Top Offer / Food Critic) decide the real payout
                res.total = o.total;
                res.features = [...res.features.filter(f => f.type !== "jp"), ...(o.jpWins.length ? [{ type: "jp", jpWins: o.jpWins, total: 0 }] : [])];
                res.jackpots = o.jpWins.map(j => j.tier);
                total = o.total;
            }
            else total = await playVideo(res);
        } catch (e) { console.error(e); }
        Store.setMachine(cfg.id, res.state, ctx.pid);
        renderMeter();
        await alphabetDrop();
        // progressive jackpot payouts reset the pool
        for (const f of res.features) {
            const tiers = f.jpWins ? f.jpWins : f.type === "pick" ? [{ tier: f.tier, amount: f.amount }] : f.type === "wheel" && f.jp ? [{ tier: f.jp, amount: f.amount }] : [];
            for (const j of tiers) {
                await Store.hitJackpot(cfg, j.tier, ctx.pid, j.amount);
                if ((JACKPOT_RANK[j.tier] || 0) >= 3) Store.logJackpot(cfg.id, j.tier, ctx.pid, j.amount, { serverLogged: !!cfg.jp?.[j.tier] && !cfg.jp[j.tier].x });
            }
        }
        // mission stats: 5-of-a-kind lines, free-spin entries (a whole bonus counts as one win)
        const five = res.fiveKind ?? (res.base?.lines || []).filter(l => l.n >= 5).length;
        const freeSpin = res.freeSpin ?? res.features.some(f => ["free", "grow", "cfree", "bfree"].includes(f.type));
        ctx.record(0, res.total, res.points, { settle: true, bet, brand: cfg.brand, bonus: res.bonus, jackpots: res.jackpots, five, freeSpin });
        winEl.textContent = fmt(res.total);
        refresh();
        if (res.points) { floatText(reelsBox, `+${res.points} P`, "pts"); Sound.coin(); }
        if (res.boosted) floatText(cabinet, "🎰 보너스 UP 아이템 발동!", "lucky");
        if (res.lucky && (res.lucky === "bonus" || res.total > 0)) {
            const credit = showPetHelp(ctx.luck, res.lucky, res.total);
            if (credit) { floatText(cabinet, res.lucky === "bonus" ? `🐾 ${credit.name} 보너스 도움!` : `🐾 ${credit.name} 덕분!`, "lucky"); ctx.petHelp?.(res.lucky, res.total, credit); }
        }
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
        const teaseSym = ["F", "X", "R", "D", "N", "PK", "MT"].find(s => res.grid.some(c => c.includes(s)));
        await animateReels(res.grid, { anticipation: res.anticipation, nearMiss: mk && !res.bonus && res.grid[0].includes("B") ? "C" : nearMiss && res.grid.some(c => c.includes("F")) ? "F" : (!res.bonus ? teaseSym || null : null) });
        if (omenP) await omenP;
        cabinet.classList.remove("meter-hot");
        if (mk) { labelCoins(res); await throwCoins(res); }
        // meter events: symbols fly up, the meter rises and may burst at any fill
        await animateMeter(res);
        // wild reels (Clover coins)
        for (const c of res.wildReels || []) {
            reelEls[c].classList.add("wild-reel"); Sound.bonus();
            setReel(c, Array(rows).fill("W"));
            await sleep(500);
        }
        // Niagara: the base spin is a chain of cascades
        if (res.cascade) {
            const got = await playCascadeRun(res.cascade, 0);
            if (res.chainTease) msgEl.innerHTML = `<span class="tease">3연속! 한 번만 더 이어졌으면… 😱</span>`;
            else if (!got && res.anticipation.length && !res.bonus) msgEl.innerHTML = `<span class="tease">아깝다!! 😱 한 개만 더…</span>`;
            else if (!got) msgEl.textContent = "";
            res.grid.forEach((col, c) => col.forEach((s, r) => { if (s === "P") cellsEl(c, r)?.classList.add("ptsglow"); }));
            let run = got;
            for (const f of res.features) { run += await playFeature(f, run); winEl.textContent = fmt(run); }
            return run;
        }
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
        if (f.type === "chold") return playCatsHold(f);
        if (f.type === "rspin") return playRibbitSpin(f);
        if (f.type === "rcatch") return playRibbitCatch(f);
        if (f.type === "rpick") return playRibbitPick(f);
        if (f.type === "bfree") return playBoxFree(f, already);
        if (f.type === "bwild") return playBoxWild(f, already);
        if (f.type === "double") return playDouble(f, already);
        if (f.type === "pickone") return playPickOne(f);
        if (f.type === "cfree") return playCascadeFree(f, already);
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
        // any omen may also shake the reels (o.shake) or the whole cabinet (o.screen)
        if (o.screen) { cabinet.classList.add("omen-quake"); Sound.boom(); setTimeout(() => cabinet.classList.remove("omen-quake"), 1300); if (o.fx === "shake" && !o.text) { await sleep(1300); return; } }
        if (o.shake && o.fx !== "shake") { frame.classList.add("omen-shake"); setTimeout(() => frame.classList.remove("omen-shake"), 1100); }
        if (o.fx === "pop" && o.chars) o = { ...o, fx: "_pop" };
        if (o.fx === "_pop") {
            const l = h("div.omen-pop", Array.from({ length: Math.max(14, o.chars.length) }, (_, i) => h("i", { style: { left: 4 + rnd() * 90 + "%", top: 10 + rnd() * 75 + "%", "--d": (i * 0.08) + "s", "--r": (rnd() * 40 - 20) + "deg" } }, o.chars[i % o.chars.length])));
            cabinet.append(l); if (o.text) { const t = h("div.omen-text", o.text); cabinet.append(t); setTimeout(() => t.remove(), 1700); }
            for (let i = 0; i < 5; i++) setTimeout(() => Sound.click(), i * 140); await sleep(1800); l.remove();
            return;
        }
        // the special machines' omens map onto the shared effects below
        const MAP = {
            smoke: { fx: "wind", chars: ["💨", "☁️", "💨", "🌫️"] }, notes: { fx: "rain", chars: ["🎵", "🎶", "🎧"] },
            turntable: { fx: "burst", icon: "💿", chars: ["🎵", "⚡", "🎶"] }, sun: { fx: "burst", icon: "☀️", chars: ["✨", "🔆", "⭐"] },
            moon: { fx: "burst", icon: "🌙", chars: ["✨", "⭐", "🌌"] }, sunmoon: { fx: "burst", icon: "🌗", chars: ["☀️", "🌙", "✨"] },
            hamsters: { fx: "pop", chars: ["🐹", "🐹", "🧑‍🚀", "🐹"] }, meteors: { fx: "rain", chars: ["☄️", "🌠", "☄️"] },
            explosion: { fx: "burst", icon: "💥", chars: ["💥", "🔥", "✨"], shake: true }, elements: { fx: "pop", chars: ["木", "火", "土", "金", "水"] },
            horn: { fx: "burst", icon: "📯", chars: ["🎉", "🎊", "✨"] }, balloons: { fx: "pop", chars: ["🎈", "🎈", "🎀", "🎈"] }
        };
        if (MAP[o.fx]) {
            const m = MAP[o.fx];
            if (o.text) { const t = h("div.omen-text", o.text); cabinet.append(t); setTimeout(() => t.remove(), 1700); }
            if (m.shake) { frame.classList.add("omen-shake"); setTimeout(() => frame.classList.remove("omen-shake"), 1100); }
            if (m.fx === "pop") {
                const l = h("div.omen-pop", Array.from({ length: 14 }, (_, i) => h("i", { style: { left: 4 + rnd() * 90 + "%", top: 10 + rnd() * 75 + "%", "--d": (i * 0.08) + "s", "--r": (rnd() * 40 - 20) + "deg" } }, m.chars[i % m.chars.length])));
                cabinet.append(l); for (let i = 0; i < 5; i++) setTimeout(() => Sound.click(), i * 140); await sleep(1800); l.remove();
                return;
            }
            o = { ...m, text: null };
        }
        if (o.fx === "siren") {
            const t = h("div.omen-text", o.text || "🚨 WEE-OO WEE-OO 🚨");
            cabinet.classList.add("omen-siren"); cabinet.append(t);
            for (let i = 0; i < 4; i++) setTimeout(() => Sound.tease(), i * 400);
            await sleep(1800); cabinet.classList.remove("omen-siren"); t.remove();
            return;
        }
        if (o.fx === "shake" && o.text) { const t = h("div.omen-text", o.text); cabinet.append(t); setTimeout(() => t.remove(), 1500); }
        if ((o.fx === "wind" || o.fx === "rain" || o.fx === "rise") && o.text) { const t = h("div.omen-text", o.text); cabinet.append(t); setTimeout(() => t.remove(), 1700); }
        if (o.fx === "wind" && !o.chars) o = { ...o, chars: ["🍃", "🌫️", "〰️"] };
        // one huge thing (halo rising, light flooding in, spaceship fly-by, lily pad cover, flash strobe)
        if (o.fx === "big") {
            const l = h("div.omen-big.ob-" + (o.cls || "rise"), h("span", o.icon || "✨"), o.text ? h("b", o.text) : null);
            cabinet.append(l); o.cls === "flash" || o.cls === "light" ? Sound.boom() : Sound.whoosh(); if (o.text) Sound.tease();
            await sleep(1900); l.remove();
        }
        // many small things floating upward (halos, bubbles)
        if (o.fx === "rise") {
            if (o.shake) frame.classList.add("omen-shake");
            const l = h("div.omen-rise", Array.from({ length: 22 }, (_, i) => h("i", { style: { left: 4 + rnd() * 92 + "%", "--d": rnd() * 0.9 + "s", "--s": (0.7 + rnd() * 0.9).toFixed(2) } }, o.chars[i % o.chars.length])));
            cabinet.append(l); Sound.bonus(); await sleep(1800); l.remove(); frame.classList.remove("omen-shake");
        }
        if (o.fx === "text") { const t = h("div.omen-text", o.text); cabinet.append(t); Sound.tease(); await sleep(1700); t.remove(); }
        if (o.fx === "shake") { frame.classList.add("omen-shake"); Sound.boom(); if (o.scream) Sound.scream?.(); await sleep(1100); frame.classList.remove("omen-shake"); }
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
        // 5 Cats: cats suddenly pop out everywhere
        if (o.fx === "cats") {
            const l = h("div.omen-pop", Array.from({ length: 14 }, (_, i) => h("i", { style: { left: 4 + rnd() * 90 + "%", top: 10 + rnd() * 75 + "%", "--d": (i * 0.08) + "s", "--r": (rnd() * 40 - 20) + "deg" } }, ["😸", "😺", "😽", "😼", "😻", "🐈"][i % 6])));
            cabinet.append(l); for (let i = 0; i < 5; i++) setTimeout(() => Sound.click(), i * 140); await sleep(1800); l.remove();
        }
        // mosaic: the screen pixelates and fades out … and back in
        if (o.fx === "mosaic") {
            const cv = h("div.omen-mosaic-grid", Array.from({ length: 96 }, () => h("i", { style: { "--o": (0.25 + rnd() * 0.6).toFixed(2), "--h": Math.floor(rnd() * 60 + 20) } })));
            frame.classList.add("omen-mosaic"); cabinet.append(cv); Sound.whoosh();
            await sleep(1700); frame.classList.remove("omen-mosaic"); cv.remove();
        }
        // the cats' gold ingots rattle … and pop
        if (o.fx === "ingots") {
            meterEl.classList.add("omen-rattle"); Sound.heartbeat(); await sleep(900);
            meterEl.classList.remove("omen-rattle"); Sound.boom();
            meterEl.querySelectorAll(".ingots").forEach(p => burstFx(p));
            await sleep(700);
        }
        // Froggie: frogs leap out of the pond across the reels
        if (o.fx === "frogs") {
            const l = h("div.omen-leap", Array.from({ length: 9 }, (_, i) => h("i", { style: { "--y": 20 + rnd() * 60 + "%", "--d": (i * 0.13) + "s", "--h": -(60 + rnd() * 90) + "px" } }, "🐸")));
            cabinet.append(l); for (let i = 0; i < 4; i++) setTimeout(() => Sound.click(), i * 200); await sleep(2000); l.remove();
        }
        // Cat and Mouse: the neon cat chases and catches the mouse
        if (o.fx === "chase") {
            const l = h("div.omen-chase", h("span.oc-mouse", "🐭"), h("span.oc-cat", "🐱"), h("span.oc-pow", "POW!"));
            cabinet.append(l); Sound.whoosh(); await sleep(1500); Sound.hit(); await sleep(700); l.remove();
        }
        // Crack or Not: ostrich feathers blow in from every side
        if (o.fx === "feathers") {
            const l = h("div.omen-feathers", Array.from({ length: 30 }, (_, i) => {
                const side = i % 4, from = [[-10, rnd() * 100], [110, rnd() * 100], [rnd() * 100, -10], [rnd() * 100, 110]][side];
                return h("i", { style: { "--x0": from[0] + "%", "--y0": from[1] + "%", "--x1": 20 + rnd() * 60 + "%", "--y1": 20 + rnd() * 60 + "%", "--d": rnd() * 0.6 + "s", "--r": (rnd() * 720 - 360) + "deg" } }, "🪶");
            }));
            cabinet.append(l); Sound.whoosh(); await sleep(1900); l.remove();
        }
        // Crack or Not: cracks run all over the egg
        if (o.fx === "cracks") {
            eggStage?.el.classList.add("omen-cracks"); Sound.tease();
            for (let i = 0; i < 4; i++) { eggStage?.flashCrack(); Sound.stop(); await sleep(300); }
            await sleep(400); eggStage?.el.classList.remove("omen-cracks");
        }
        // Niagara: the waterfall overflows and churns
        // The Rule of Death: blood pours down from the top of the cabinet
        if (o.fx === "blood") {
            const l = h("div.omen-flood.blood", h("div.of-wave"), h("div.of-wave.w2"), Array.from({ length: 18 }, () => h("i", { style: { left: rnd() * 100 + "%", "--d": rnd() * 0.8 + "s" } }, "🩸")));
            cabinet.append(l); frame.classList.add("omen-shake"); Sound.splash(); Sound.heartbeat(); if (o.scream) Sound.scream?.(); await sleep(1900); frame.classList.remove("omen-shake"); l.remove();
        }
        if (o.fx === "flood") {
            const l = h("div.omen-flood", h("div.of-wave"), h("div.of-wave.w2"), Array.from({ length: 16 }, () => h("i", { style: { left: rnd() * 100 + "%", "--d": rnd() * 0.8 + "s" } }, "💦")));
            cabinet.append(l); frame.classList.add("omen-shake"); Sound.splash(); await sleep(1900); frame.classList.remove("omen-shake"); l.remove();
        }
        // Lucky Boxes: a box pops open in the middle and sprays money
        if (o.fx === "boxopen") {
            const l = h("div.omen-box", h("span.ob-box", "🎁"), Array.from({ length: 22 }, () => h("i", { style: { "--dx": (rnd() * 2 - 1) * 240 + "px", "--dy": -(40 + rnd() * 200) + "px", "--d": 0.55 + rnd() * 0.3 + "s" } }, ["💵", "🪙", "💎", "💰"][Math.floor(rnd() * 4)])));
            cabinet.append(l); Sound.tease(); await sleep(600); Sound.cash(); await sleep(1300); l.remove();
        }
        // Lucky Boxes: a dwarf with a box runs across the reels
        if (o.fx === "dwarf") {
            const l = h("div.omen-dwarf", h("span.od-run", h("b", "🎁"), h("span.od-dwarf", h("i.od-hat"), "🧔")));
            cabinet.append(l); for (let i = 0; i < 8; i++) setTimeout(() => Sound.tick(), i * 180); await sleep(1900); l.remove();
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
        await banner(f.type === "grow" ? "🌱 GROW REELS · 6 FREE SPINS 🌱" : f.mouse ? `🐭 MOUSE WILD × ${f.spins.length} FREE SPINS · A K Q J 10 = WILD! 🐭` : `🎉 FREE SPINS × ${f.spins.length} ${f.mult > 1 ? `(x${f.mult})` : ""} 🎉`, 1700, "bonus");
        if (f.mouse) cabinet.classList.add("mouse-mode");
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
        cabinet.classList.remove("free-mode", "mouse-mode");
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

    async function playPick(f, { revealOnly = false } = {}) {
        Sound.bonus();
        await banner(f.title || "JACKPOT PICK", 1500, "jackpot");
        // MINI_X2 / MINOR_X2 are matching items of their own (pay double)
        const baseOf = t => String(t).replace("_X2", "");
        const isX2 = t => String(t).endsWith("_X2");
        const rankOf = t => TIER_ORDER.indexOf(baseOf(t)) * 2 + (isX2(t) ? 0 : 1);
        const tiers = f.classic ? (f.prizes || cfg.features.pick.prizes) : f.items ? [...f.items].sort((a, b) => rankOf(a) - rankOf(b)) : TIER_ORDER.filter(t => cfg.jp?.[t]);
        const label = t => f.classic ? (t === "WHEEL" ? "🎡 WHEEL" : `x${t}`) : t === "FROG" ? "🐸 FROG" : String(t).replace("_X2", " x2");
        const cls = t => ["pt-" + baseOf(t).toLowerCase(), ...(isX2(t) ? ["x2"] : [])];
        const grid = h("div.pick-grid");
        const found = {};
        const tally = h("div.pick-tally", tiers.map(t => h("div.pt." + cls(t).join("."), { "data-k": t }, h("b", label(t)), h("span", { "data-t": t }, "○○○"))));
        overlay.append(h("div.pick-wrap", h("div.pick-head", "같은 그림 3개를 맞혀라!"), tally, grid));
        let idx = 0;
        await new Promise(done => {
            for (let i = 0; i < f.tiles; i++) {
                const tile = h("button.ptile", h("span", f.icon || (f.type === "rpick" ? "🪷" : f.classic ? "💰" : "🪙")));
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
        if (revealOnly) return 0;
        if (f.sub) { const w = await playWheel(f.sub); return w; }
        if (f.classic) { await banner(`${f.title ? f.title.replace(/[^\w\s]/g, "").trim() : "MONEY MATCH"} x${f.tier} = ${fmt(f.total)} G`, 1500, "bonus"); return f.total; }
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

    // ================================================================ new machines
    const bumpCoin = (el, v, note) => {
        const b = el.querySelector("b"); if (b && v != null) b.textContent = fmt(v);
        el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop", "boosted");
        if (note) floatText(el, note, "pts");
    };
    const orb = () => h("i.orb-ico");
    const valueCoinEl = (cn, face = orb) => cn.jp ? h("div.hs-coin.jpc.jp-" + cn.jp.toLowerCase() + (cn.lucky ? ".lucky" : ""), cn.lucky ? h("span", "😺") : face(), h("b", cn.jp))
        : h("div.hs-coin.orb", face(), h("b", fmt(cn.v)));

    // ---------------- 5 Cats: one Hold & Spin carrying every burst cat's power
    const CAT = { happy: ["😸", "HAPPY", "릴 +1"], lucky: ["😺", "LUCKY", "잭팟 알"], meow: ["😽", "MEOW", "알 금액 UP"], rich: ["😼", "RICH", "COLLECT ALL x2"], fluffy: ["😻", "FLUFFY", "INSTANT WIN"] };
    async function playCatsHold(f) {
        Sound.bonus();
        if (f.cats.length === 5) { await banner("😸😺😽😼😻 FIVE CATS ALL IN!!! 😸😺😽😼😻", 1900, "jackpot"); confetti(110, ["😸", "😺", "😽", "😼", "😻", "🪙"]); }
        else if (f.cats.length > 1) await banner(`🐱 ${f.cats.length}마리 동시 발동!!`, 1200, "jackpot");
        await banner(`${f.cats.map(k => CAT[k][0] + " " + CAT[k][1]).join(" + ")} · HOLD & SPIN`, 1700, "bonus");
        const chips = h("div.cat-chips", f.cats.map(k => h("div.cat-chip.k-" + k, { "data-k": k }, h("span", CAT[k][0]), h("b", CAT[k][1]), h("small", CAT[k][2]))));
        const chip = k => chips.querySelector(`[data-k="${k}"]`);
        const cells = {};
        const boards = Array.from({ length: f.boards }, (_, b) => {
            const bd = h("div.hs-board.cat-board" + (b ? ".happy-board" : ""), { style: { "--cols": f.reels, "--rows": f.rows } });
            for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.reels; c++) { const el = h("div.hs-cell"); cells[b + "," + c + "," + r] = el; bd.append(el); }
            return bd;
        });
        const lives = h("div.hs-lives"), sumEl = h("b", "0"), instEl = h("b", "0");
        const boardsWrap = h("div.cat-boards" + (f.boards > 1 ? ".two" : ""), boards.map((bd, b) => h("div.cb-wrap", b ? h("small.cb-label", "😸 HAPPY 추가 릴") : null, bd)));
        const hud = holdHud(sumEl, lives);
        if (f.cats.includes("fluffy")) hud.append(h("span.hs-inst", "😻 INSTANT ", instEl));
        const wrap = h("div.hs-wrap.cats-hold", hud, chips, boardsWrap);
        overlay.append(wrap);
        const key = cn => cn.b + "," + cn.c + "," + cn.r;
        let sum = 0, inst = 0;
        const place = cn => {
            const el = cells[key(cn)];
            el.replaceChildren(valueCoinEl(cn)); el.classList.add("locked", "pop");
            if (cn.lucky) el.classList.add("is-lucky");
            sum += cn.v || 0; sumEl.textContent = fmt(sum);
        };
        const fluffy = async amount => {
            const c = chip("fluffy"); c?.classList.add("fire");
            wrap.classList.add("flash"); Sound.cash();
            await banner(`😻 FLUFFY INSTANT WIN! +${fmt(amount)} G`, 1300, "meter");
            inst += amount; instEl.textContent = fmt(inst);
            floatText(c || hud, `+${fmt(amount)}`, "pts");
            wrap.classList.remove("flash"); c?.classList.remove("fire");
        };
        for (let i = 0; i < f.steps.length; i++) {
            const st = f.steps[i];
            if (i === 0) {
                setLives(lives, st.lives);
                for (const cn of st.added) {
                    if (cn.lucky) { chip("lucky")?.classList.add("fire"); Sound.heartbeat(); await fly(chip("lucky"), cells[key(cn)], "😺", { arc: -40, dur: 520 }); }
                    place(cn); Sound.coin();
                    await sleep(pace(cn.lucky ? 800 : 260));
                    if (cn.lucky) { floatText(cells[key(cn)], `LUCKY ${cn.jp}!`, "lucky"); chip("lucky")?.classList.remove("fire"); }
                }
                await sleep(pace(500));
                continue;
            }
            setLives(lives, livesDuring(f.steps, i));
            await respinRound({
                spinEl: boardsWrap, added: st.added, cellOf: cn => cells[key(cn)], faceOf: cn => valueCoinEl(cn), place,
                empties: Object.values(cells).filter(c => !c.classList.contains("locked")), lastChance: f.steps[i - 1].lives === 1
            });
            setLives(lives, st.lives);
            if (st.boosts.length) { // Meow: paws pump the eggs up
                const m = chip("meow"); m?.classList.add("fire"); Sound.click();
                for (const b of st.boosts) {
                    const t = cells[key(b)];
                    await fly(m, t, "🐾", { arc: -50, dur: 420 });
                    bumpCoin(t, b.v, `+${fmt(b.add)}`); sum += b.add; sumEl.textContent = fmt(sum); Sound.cash();
                    await sleep(pace(200));
                }
                m?.classList.remove("fire");
            }
            if (st.instant) await fluffy(st.instant);
            if (!st.added.length && !st.boosts.length) Sound.lose();
            await sleep(pace(650));
        }
        if (f.endInstant) await fluffy(f.endInstant);
        if (f.rich) { // Rich: every egg merges into one big egg, worth double
            const r = chip("rich"); r?.classList.add("fire");
            await banner("😼 RICH! COLLECT ALL — 모든 알이 하나로 합쳐진다!", 1400, "meter");
            const center = h("div.rich-orb", h("span", "😼"), h("b", "0"));
            wrap.append(center);
            let got = 0;
            for (const el of Object.values(cells)) {
                const b = el.querySelector(".hs-coin.orb b"); if (!b) continue;
                el.classList.add("collect");
                await fly(el, center, "🟡", { arc: -30, dur: 240 });
                got += +b.textContent.replace(/,/g, ""); center.querySelector("b").textContent = fmt(got); Sound.coin();
            }
            center.classList.add("double"); Sound.bigWin();
            await sleep(pace(500));
            center.querySelector("b").textContent = `${fmt(f.coinSum)} × 2 = ${fmt(f.coinSum + f.rich)}`;
            floatText(center, "x2!!", "lucky");
            sumEl.textContent = fmt(f.coinSum + f.rich);
            await sleep(pace(1300));
            r?.classList.remove("fire");
        }
        for (const b of f.fullBoards) { await banner(b ? "😸 HAPPY 보드 FULL!!!" : "FULL BOARD!!!", 1500, "jackpot"); confetti(120, ["🪙", "😸", "💰"]); }
        await endJackpots(f);
        await banner(`5 CATS HOLD & SPIN 총 ${fmt(f.total)} G`, 1700, "bonus");
        overlay.replaceChildren();
        return f.total;
    }

    // ---------------- Froggie
    const frogCoinEl = cn => cn.frog ? h("div.hs-coin.frogc", h("span", "🐸"), h("b", "HOP!"))
        : cn.lotus ? h("div.hs-coin.lotusc", h("span", "🪷"), h("b", "+1"))
            : valueCoinEl(cn, () => h("span", "🪙"));
    async function playRibbitSpin(f) {
        Sound.bonus();
        await banner("🟢 RIBBIT SPIN · HOLD & SPIN 🐸", 1600, "bonus");
        const board = h("div.hs-board.frog-board", { style: { "--cols": f.reels, "--rows": f.rows } });
        const cells = {};
        for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.reels; c++) { const el = h("div.hs-cell"); cells[c + "," + r] = el; board.append(el); }
        const lives = h("div.hs-lives"), sumEl = h("b", "0");
        overlay.append(h("div.hs-wrap.ribbit-wrap", holdHud(sumEl, lives), h("small.hs-note", "🐸 개구리 = 코인 위로 점프하며 금액 UP · 🪷 연꽃잎 = 리스핀 +1 (최대 5)"), board));
        let sum = 0;
        const place = cn => {
            const el = cells[cn.c + "," + cn.r];
            el.replaceChildren(frogCoinEl(cn)); el.classList.add("locked", "pop");
            if (cn.frog) el.classList.add("is-frog"); if (cn.lotus) el.classList.add("is-lotus");
            sum += cn.v || 0; sumEl.textContent = fmt(sum);
        };
        for (let i = 0; i < f.steps.length; i++) {
            const st = f.steps[i];
            if (i === 0) { setLives(lives, st.lives, st.livesMax); for (const cn of st.added) { place(cn); Sound.coin(); await sleep(pace(260)); } await sleep(pace(500)); continue; }
            setLives(lives, livesDuring(f.steps, i), f.steps[i - 1].livesMax);
            await respinRound({
                spinEl: board, added: st.added, cellOf: cn => cells[cn.c + "," + cn.r], faceOf: frogCoinEl, place,
                empties: Object.values(cells).filter(c => !c.classList.contains("locked")), lastChance: f.steps[i - 1].lives === 1
            });
            if (st.livesMax > f.steps[i - 1].livesMax) {
                const l = st.added.find(x => x.lotus);
                if (l) floatText(cells[l.c + "," + l.r], `🪷 리스핀 +1 (최대 ${st.livesMax})`, "lucky");
                Sound.bonus();
            }
            setLives(lives, st.lives, st.livesMax);
            // frogs hop from coin to coin, pumping each one up
            for (const hp of st.hops) {
                let from = cells[hp.from[0] + "," + hp.from[1]];
                from.classList.add("boosting");
                for (const p of hp.path) {
                    const t = cells[p.c + "," + p.r];
                    Sound.click();
                    await fly(from, t, "🐸", { arc: -70, dur: 360, cls: "frog-hop" });
                    bumpCoin(t, p.v, `+${fmt(p.add)}`); sum += p.add; sumEl.textContent = fmt(sum); Sound.cash();
                    from = t;
                }
                cells[hp.from[0] + "," + hp.from[1]].classList.remove("boosting");
            }
            if (!st.added.length) Sound.lose();
            await sleep(pace(650));
        }
        if (f.full) { await banner("FULL POND!!! 🐸", 1500, "jackpot"); confetti(120, ["🐸", "🪷", "🪙"]); }
        await endJackpots(f);
        await banner(`RIBBIT SPIN 총 ${fmt(f.total)} G`, 1600, "bonus");
        overlay.replaceChildren();
        return f.total;
    }
    async function playRibbitCatch(f) {
        Sound.bonus();
        await banner("🟡 RIBBIT CATCH · 그물 안의 코인만 잡아라! 🐸", 1700, "bonus");
        const NC = f.cols || f.size, NR = f.rows || f.size; // the normal 3x5 board
        const board = h("div.hs-board.catch-board", { style: { "--cols": NC, "--rows": NR } });
        const cells = {};
        for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) { const el = h("div.hs-cell"); cells[c + "," + r] = el; board.append(el); }
        const multEl = h("b.net-mult");
        const net = h("div.catch-net", h("span.net-frog", "🐸"), multEl);
        board.append(net);
        const setNet = sq => { for (const [k, v] of Object.entries({ "--x": sq.x, "--y": sq.y, "--w": sq.w ?? sq.s, "--h": sq.h ?? sq.s, "--nc": NC, "--nr": NR })) net.style.setProperty(k, v); };
        const netName = sq => `${sq.h ?? sq.s}x${sq.w ?? sq.s}`; // rows x cols: 2x2 → 3x3 → 3x4 → 3x5
        const lives = h("div.hs-lives"), sumEl = h("b", "0");
        overlay.append(h("div.hs-wrap.ribbit-wrap.catch-wrap", holdHud(sumEl, lives), h("small.hs-note", "🪷 연꽃잎 = 그물 확장 (2x2 → 3x3 → 3x4 → 3x5 전체) · 🐸 개구리 = 이번 스핀 그물 x2~x5"), board));
        let sum = 0;
        const lock = (l, v) => {
            const el = cells[l.c + "," + l.r];
            el.replaceChildren(frogCoinEl(l.jp ? { jp: l.jp } : { v })); el.classList.add("locked", "pop");
            sum += l.jp ? 0 : v; sumEl.textContent = fmt(sum);
        };
        for (let i = 0; i < f.steps.length; i++) {
            const st = f.steps[i];
            if (i === 0) { setNet(st.sq); setLives(lives, st.lives); for (const l of st.landed) { lock(l, l.v); Sound.coin(); await sleep(pace(260)); } await sleep(pace(500)); continue; }
            setLives(lives, livesDuring(f.steps, i));
            board.classList.add("respin");
            for (let t = 0; t < 10; t++) { Sound.tick(); await sleep(pace(100)); }
            board.classList.remove("respin");
            // lotus leaves grow the net, frogs power it up
            for (const l of st.landed.filter(l => l.lotus)) {
                const el = cells[l.c + "," + l.r]; el.append(h("div.peek", "🪷")); Sound.bonus();
                await fly(el, net, "🪷", { arc: -40, dur: 420 }); el.querySelector(".peek")?.remove();
            }
            if (st.grow) { setNet(st.sq); net.classList.add("grow"); await banner(`🪷 그물 확장! ${netName(st.sq)}${(st.sq.w ?? st.sq.s) >= NC && (st.sq.h ?? st.sq.s) >= NR ? " (전체!)" : ""}`, 1100, "meter"); net.classList.remove("grow"); }
            const fr = st.landed.find(l => l.frog);
            if (fr) {
                const el = cells[fr.c + "," + fr.r]; el.append(h("div.peek", "🐸"));
                await fly(el, net, "🐸", { arc: -60, dur: 420, cls: "frog-hop" }); el.querySelector(".peek")?.remove();
                multEl.textContent = `x${st.mult}`; net.classList.add("powered"); Sound.cash();
                floatText(net, `그물 x${st.mult}!`, "lucky");
                await sleep(pace(500));
            }
            // coins: inside the net are caught, outside slip away
            for (const l of st.landed.filter(l => !l.lotus && !l.frog)) {
                const el = cells[l.c + "," + l.r];
                if (l.in) {
                    if (l.jp || Math.random() < 0.35) await teaseCoin(el, frogCoinEl(l), true, !!l.jp);
                    lock(l, l.v2 ?? l.v); Sound.coin();
                    if (st.mult > 1 && l.v != null) floatText(el, `x${st.mult}`, "pts");
                } else {
                    const ghost = h("div.escape", frogCoinEl(l)); el.append(ghost); Sound.miss();
                    setTimeout(() => ghost.remove(), pace(900));
                }
                await sleep(pace(260));
            }
            net.classList.remove("powered"); multEl.textContent = "";
            setLives(lives, st.lives);
            if (!st.landed.some(l => l.in)) Sound.lose();
            await sleep(pace(700));
        }
        if (f.full) { await banner("FULL NET!!! 🐸", 1500, "jackpot"); confetti(120, ["🐸", "🪷", "🪙"]); }
        await endJackpots(f);
        await banner(`RIBBIT CATCH 총 ${fmt(f.total)} G`, 1600, "bonus");
        overlay.replaceChildren();
        return f.total;
    }
    async function playRibbitPick(f) {
        await playPick(f, { revealOnly: true });
        if (f.tier === "FROG") {
            await banner("🐸🐸🐸 FROG WHEEL! 🐸🐸🐸", 1500, "jackpot");
            await wheelSpin(f.wheel.seg, f.wheel.idx, s => s, "🐸 FROG WHEEL 🐸");
            if (f.sub) {
                await banner(`🐸 → ${f.sub.type === "rcatch" ? "RIBBIT CATCH" : "RIBBIT SPIN"}!`, 1200, "meter");
                if (f.sub.type === "rcatch") await playRibbitCatch(f.sub); else await playRibbitSpin(f.sub);
                return f.total;
            }
        }
        for (const j of f.own) await bigWin(j.amount, bet, { jackpot: j.tier });
        return f.total;
    }

    // ---------------- Lucky Boxes
    async function landWilds(cells, from, pre, grid) {
        await Promise.all(cells.map(async ([c, r], j) => { await sleep(j * 60); await fly(from, cellsEl(c, r), "🌟", { arc: -70, dur: 420 }); Sound.coin(); }));
        showGrid(grid);
        for (const [c, r] of cells) cellsEl(c, r)?.classList.add("pop", "wild-drop");
    }
    async function playBoxFree(f, already) {
        Sound.bonus();
        const P = meterDom?.parts || {};
        const M = cfg.meter;
        const n = f.spins.length, wildTotal = f.spins.reduce((s, x) => s + x.rainbow, 0);
        P[f.box]?.el.classList.add("opened");
        await banner(f.box === "rainbow" ? `🌈 RAINBOW BOX! ${n} FREE GAMES + WILD ${wildTotal}개 🌈` : `🟥 RED BOX! ${n} FREE GAMES 🟥`, 1800, "bonus");
        cabinet.classList.add("free-mode");
        const counter = h("div.fs-counter"), fsWin = h("b", "0"), wl = h("b", String(wildTotal));
        overlay.append(h("div.fs-hud", counter, f.box === "rainbow" ? h("div", h("small", "🌈 WILD "), wl) : null, h("div", h("small", "FREE WIN "), fsWin)));
        let sum = 0, left = wildTotal;
        for (let i = 0; i < n; i++) {
            const s = f.spins[i];
            counter.textContent = `FREE GAME ${i + 1} / ${n}`;
            clearHighlights();
            await animateReels(s.pre, {});
            if (s.yellow) { // the yellow box keeps growing during the free games
                await flyMeterSyms(s.pre.map(col => col.map(x => x === "M3" ? x : "_")));
                const p = P.yellow;
                if (p) { setStage(p.el, s.yellow.value / M.max); p.update(s.yellow.value, s.yellow.value / M.max, s.yellow.n); bumpEl(p.el); }
                if (s.yellow.burst && p) {
                    p.el.classList.add("bursting"); Sound.heartbeat(); await sleep(pace(600));
                    Sound.boom(); burstFx(p.el);
                    await banner(`🟨 YELLOW BOX! WILD ${s.yellow.burst}개 추가!`, 1300, "meter");
                    p.el.classList.remove("bursting");
                }
            }
            if (s.wilds.length) {
                const fromRain = s.wilds.slice(0, s.rainbow), fromYellow = s.wilds.slice(s.rainbow);
                if (fromRain.length) { await landWilds(fromRain, P.rainbow?.target || meterEl, s.pre, s.grid); left -= fromRain.length; wl.textContent = left; }
                if (fromYellow.length) await landWilds(fromYellow, P.yellow?.target || meterEl, s.pre, s.grid);
                if (s.yellow?.burst && P.yellow) { setStage(P.yellow.el, 0); P.yellow.update(0, 0, M.counts.start); }
            }
            if (s.win > 0) { highlight(s.lines.flatMap(l => l.cells)); Sound.win(); }
            sum += s.win; fsWin.textContent = fmt(sum); winEl.textContent = fmt(already + sum);
            await sleep(pace(s.win ? 700 : 320));
        }
        P[f.box]?.el.classList.remove("opened");
        cabinet.classList.remove("free-mode");
        overlay.replaceChildren();
        await banner(`${f.box === "rainbow" ? "🌈 RAINBOW" : "🟥 RED"} BOX 총 ${fmt(f.total)} G`, 1600, "bonus");
        initReels();
        return f.total;
    }
    async function playBoxWild(f, already) {
        Sound.bonus();
        const p = meterDom?.parts?.yellow;
        p?.el.classList.add("opened");
        await banner(`🟨 YELLOW BOX! WILD ${f.n}개가 릴 전체에 쏟아진다! 🟨`, 1700, "bonus");
        clearHighlights();
        await animateReels(f.pre, {});
        await landWilds(f.wilds, p?.target || meterEl, f.pre, f.grid);
        Sound.bonus();
        if (f.win > 0) { highlight(f.lines.flatMap(l => l.cells)); Sound.win(); await countUp(winEl, already, already + f.win, 700); }
        await sleep(pace(1000));
        p?.el.classList.remove("opened");
        await banner(`WILD x${f.n} SPIN = ${fmt(f.total)} G`, 1500, "bonus");
        return f.total;
    }

    // ---------------- Cat and Mouse: DOUBLE reel sets (2 → 4)
    function miniBoard() {
        const grid = h("div.mb-grid", Array.from({ length: reelsN * rows }, () => h("div.mb-cell")));
        return h("div.mini-board", grid, h("b.mb-win"));
    }
    async function spinMini(mb, grid, k) {
        const cells = mb.querySelectorAll(".mb-cell");
        mb.classList.add("spinning"); mb.querySelector(".mb-win").textContent = "";
        const ticks = (turbo ? 4 : 8) + k * 2;
        for (let t = 0; t < ticks; t++) { cells.forEach(c => c.replaceChildren(symEl(randomKey()))); if (t % 2 === 0) Sound.tick(); await sleep(70); }
        cells.forEach((cell, i) => { const c = i % reelsN, r = Math.floor(i / reelsN); cell.replaceChildren(symEl(grid[c][r])); });
        mb.classList.remove("spinning"); Sound.stop();
    }
    async function playDouble(f, already) {
        Sound.bonus();
        await banner("2️⃣ DOUBLE! 8 FREE SPINS × 2 REELS 2️⃣", 1700, "bonus");
        cabinet.classList.add("free-mode", "double-mode");
        const multi = h("div.multi-reels");
        const counter = h("div.fs-counter"), fsWin = h("b", "0");
        overlay.append(h("div.multi-wrap", h("div.fs-hud.static", counter, h("div", h("small", "FREE WIN "), fsWin)), multi));
        let sum = 0, shown = cfg.features.double.spins;
        for (let i = 0; i < f.spins.length; i++) {
            const s = f.spins[i];
            if (multi.children.length !== s.grids.length) {
                multi.className = "multi-reels n" + s.grids.length;
                multi.replaceChildren(...s.grids.map(() => miniBoard()));
            }
            counter.textContent = `FREE SPIN ${i + 1} / ${shown} · ${s.grids.length} REELS`;
            await Promise.all(s.grids.map((g, k) => spinMini(multi.children[k], g, k)));
            s.grids.forEach((g, k) => {
                const mb = multi.children[k], cells = mb.querySelectorAll(".mb-cell");
                for (const [c, r] of s.lines[k].flatMap(l => l.cells)) cells[r * reelsN + c]?.classList.add("hit");
                mb.querySelector(".mb-win").textContent = s.wins[k] ? "+" + fmt(s.wins[k]) : "";
                mb.classList.toggle("won", s.wins[k] > 0);
            });
            if (s.win) Sound.win();
            if (s.split) {
                const mb = multi.children[1], cells = mb.querySelectorAll(".mb-cell");
                s.grids[1].forEach((col, c) => col.forEach((x, r) => { if (x === "D") cells[r * reelsN + c]?.classList.add("hit", "pop"); }));
                Sound.bonus();
                await banner("DOUBLE x3!! +3 FREE SPINS · 릴이 4개로 쪼개진다!!", 1800, "jackpot");
                shown += s.add;
                multi.classList.add("splitting"); Sound.boom();
                await sleep(pace(700));
            }
            sum += s.win; fsWin.textContent = fmt(sum); winEl.textContent = fmt(already + sum);
            await sleep(pace(s.win ? 800 : 380));
        }
        cabinet.classList.remove("free-mode", "double-mode");
        overlay.replaceChildren();
        await banner(`DOUBLE FREE SPINS 총 ${fmt(f.total)} G`, 1600, "bonus");
        initReels();
        return f.total;
    }

    // ---------------- pick one (Cat and Mouse fish · Niagara barrels)
    async function playPickOne(f) {
        Sound.bonus();
        await banner(f.title, 1500, "jackpot");
        const isCat = cfg.id === "cat_mouse";
        const label = p => isNaN(parseFloat(p)) ? p : `x${p}`;
        const items = Array.from({ length: f.n }, (_, i) => h("button.po-item" + (isCat ? ".thrown" : ""), { style: { "--i": i } }, h("span.po-ico", f.icon || "🎁"), h("b.po-prize")));
        const wrapEl = h("div.pickone-wrap" + (isCat ? ".cat" : ""),
            isCat ? h("div.po-thrower", "🐱") : null,
            h("div.po-head", isCat ? "고양이가 생선 3마리를 던졌다! 하나를 골라라!" : "하나를 골라라!"),
            h("div.po-row", items));
        overlay.append(wrapEl);
        if (isCat) { Sound.whoosh(); await sleep(900); }
        const chosen = await new Promise(res => {
            items.forEach((it, i) => it.onclick = () => res(i));
            sleep(12000).then(() => res(Math.floor(Math.random() * f.n)));
        });
        items.forEach(it => it.onclick = null);
        const pick1 = items[chosen];
        pick1.classList.add("chosen"); Sound.heartbeat();
        await sleep(pace(700));
        pick1.querySelector(".po-prize").textContent = label(f.prize);
        pick1.classList.add("open", "pt-" + String(f.prize).toLowerCase()); Sound.coin();
        await sleep(pace(900));
        let k = 0;
        items.forEach((it, i) => { if (i === chosen) return; it.querySelector(".po-prize").textContent = label(f.others[k++] ?? "-"); it.classList.add("open", "missed"); });
        await sleep(pace(1400));
        overlay.replaceChildren();
        if (f.jpWins?.length) await bigWin(f.amount, bet, { jackpot: f.prize });
        else await banner(`${f.title.replace(/[^\w\s]/g, "").trim()} x${f.prize} = ${fmt(f.amount)} G`, 1600, "bonus");
        return f.total;
    }

    // ---------------- Niagara: cascades
    async function playCascadeRun(run, already, free = false) {
        let sum = 0;
        if (!free) renderCascadeLadder(0);
        for (let i = 0; i < run.steps.length; i++) {
            const st = run.steps[i];
            reelsBox.querySelectorAll(".sym").forEach(s => s.classList.add("dim"));
            highlight(st.removed); st.removed.forEach(([c, r]) => cellsEl(c, r)?.classList.remove("dim"));
            if (!free) renderCascadeLadder(i + 1);
            msgEl.innerHTML = `🌊 CASCADE ${i + 1} · ${st.lines.slice(0, 3).map(l => `${l.n}× ${symName(l.sym)}`).join(", ")} = <b>${fmt(st.win)}</b>`;
            Sound.win();
            sum += st.win; winEl.textContent = fmt(already + sum);
            if (i >= 1) floatText(reelsBox, `${i + 1} CASCADES!`, i >= 3 ? "lucky" : "pts");
            if (i === 2 && !free) { Sound.heartbeat(); cabinet.classList.add("teasing"); }
            await sleep(pace(free ? 420 : 700));
            st.removed.forEach(([c, r]) => cellsEl(c, r)?.classList.add("washed"));
            Sound.splash();
            await sleep(pace(340));
            st.after.forEach((col, c) => {
                setReel(c, col, col.length);
                for (let r = 0; r < col.length; r++) cellsEl(c, r)?.classList.add(r < st.drops[c] ? "drop-in" : "settle");
            });
            cabinet.classList.remove("teasing");
            await sleep(pace(free ? 360 : 520));
        }
        reelsBox.querySelectorAll(".dim").forEach(e => e.classList.remove("dim"));
        return sum;
    }
    async function playCascadeFree(f, already) {
        Sound.bonus();
        const first = CASCADE_FG[Math.min(9, f.chain)];
        renderCascadeLadder(f.chain);
        await banner(`🌊 ${f.chain} CASCADES! → ${first} FREE GAMES 🌊`, 1900, "jackpot");
        cabinet.classList.add("free-mode");
        const counter = h("div.fs-counter"), fsWin = h("b", "0");
        overlay.append(h("div.fs-hud", counter, h("div", h("small", "FREE WIN "), fsWin)));
        let sum = 0, shown = first;
        for (let i = 0; i < f.spins.length; i++) {
            const s = f.spins[i];
            counter.textContent = `FREE GAME ${i + 1} / ${shown}`;
            clearHighlights();
            await animateReels(s.run.start, {});
            await playCascadeRun(s.run, already + sum, true);
            if (s.add) { await banner(`🌊 ${s.run.chain} CASCADES! +${s.add} FREE GAMES`, 1500, "jackpot"); shown += s.add; }
            sum += s.win; fsWin.textContent = fmt(sum); winEl.textContent = fmt(already + sum);
            await sleep(pace(s.win ? 380 : 200));
        }
        cabinet.classList.remove("free-mode");
        overlay.replaceChildren();
        renderCascadeLadder(0);
        await banner(`NIAGARA FREE GAMES 총 ${fmt(f.total)} G`, 1600, "bonus");
        initReels();
        return f.total;
    }

    // ---------------- Crack or Not: the ostrich egg
    function buildEgg() {
        const CRACKS = [
            "M100 70 L92 88 L103 101 L96 118", "M132 120 L120 128 L126 142 L114 150", "M62 132 L76 140 L70 154 L84 162",
            "M100 118 L110 134 L101 150 L112 166", "M150 150 L136 158 L146 172 L132 182", "M48 168 L62 172 L56 188 L70 194",
            "M96 166 L84 180 L96 192 L86 208", "M120 186 L132 198 L122 210 L136 222", "M70 206 L82 214 L74 228 L88 236",
            "M100 40 L108 56 L98 68", "M160 186 L150 200 L162 210", "M40 140 L52 150 L44 160 L56 170"
        ];
        const svg = `<svg viewBox="0 0 200 260" class="egg-svg"><defs><radialGradient id="eg" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#fffdf5"/><stop offset=".55" stop-color="#f6ead0"/><stop offset="1" stop-color="#cfb98f"/></radialGradient></defs>
            <path d="M100 8 C158 8 188 118 188 166 C188 222 150 254 100 254 C50 254 12 222 12 166 C12 118 42 8 100 8Z" fill="url(#eg)" stroke="#b49a6a" stroke-width="2"/>
            <g fill="#c9b48a" opacity=".55"><circle cx="70" cy="80" r="3"/><circle cx="128" cy="96" r="2.4"/><circle cx="84" cy="190" r="2.6"/><circle cx="140" cy="200" r="3.2"/><circle cx="56" cy="150" r="2"/><circle cx="116" cy="60" r="2"/></g>
            <g class="cracks" fill="none" stroke="#5b4526" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${CRACKS.map(d => `<path d="${d}" pathLength="100"/>`).join("")}</g></svg>`;
        const eggEl = h("div.egg", { html: svg });
        const wrap = h("button.egg-wrap", { "aria-label": "타조알 탭", onclick: () => doSpin() }, eggEl);
        const hint = h("div.egg-hint", "🥚 알을 탭하세요!");
        const el = h("div.egg-stage", h("div.egg-sun"), h("div.nest-back"), wrap, h("div.nest-front"), hint);
        const paths = () => [...eggEl.querySelectorAll(".cracks path")];
        return {
            el, wrap, hint,
            setCracks(n) { paths().forEach((p, i) => p.classList.toggle("on", i < n)); el.classList.toggle("near", n >= cfg.egg.max * 0.6); el.classList.toggle("full", n >= cfg.egg.max); },
            flashCrack() { const off = paths().filter(p => !p.classList.contains("on")); const p = off.length ? pick(off) : pick(paths()); p.classList.remove("flash"); void p.getBBox?.(); p.classList.add("flash"); setTimeout(() => p.classList.remove("flash"), 900); }
        };
    }
    async function playEgg(res) {
        const e = res.egg, f = res.features[0], S = eggStage;
        S.hint.textContent = "";
        if (res.omen && cfg.omens) await slotOmen(cfg.omens[res.omen - 1]);
        S.wrap.classList.remove("tap"); void S.wrap.offsetWidth; S.wrap.classList.add("tap");
        Sound.stop(); Sound.click();
        await sleep(pace(240));
        if (e.tease || (f && Math.random() < 0.6)) { // shudder … will it?
            S.wrap.classList.add("wobble-hard"); msgEl.innerHTML = `<span class="tease">흔들흔들… 😱</span>`;
            Sound.heartbeat(); await sleep(pace(520)); Sound.heartbeat(); await sleep(pace(520));
            S.wrap.classList.remove("wobble-hard");
        }
        if (!f) {
            S.setCracks(e.after);
            if (e.after > e.before) { Sound.stop(); floatText(S.wrap, "쩍!", "pts"); }
            msgEl.innerHTML = e.tease ? `<span class="tease">아직 버틴다…! 😱</span>` : `🥚 금 ${e.after} / ${cfg.egg.max}${e.after >= cfg.egg.max ? " · 금방이라도 깨질 것 같다!!" : ""}`;
            return 0;
        }
        S.setCracks(cfg.egg.max); Sound.boom(); shake(cabinet);
        S.el.classList.add("breaking"); await sleep(pace(420));
        S.el.classList.add("broken"); confetti(50, ["🪶", "🥚", "✨", "🪙"]);
        const chick = h("div.chick", h("span.ch-bird", "🐥"), h("div.ch-sign", `x${f.mult}`));
        S.el.append(chick);
        Sound.bonus();
        msgEl.innerHTML = `🐣 새끼 타조가 튀어나왔다! <b>x${f.mult}</b> = <b>${fmt(f.amount)} G</b>`;
        await sleep(pace(1200));
        if (f.mult >= 15) await bigWin(f.amount, bet, f.jpWins.length ? { jackpot: "EGG" } : { title: `🐣 x${f.mult}!` });
        else await banner(`🐣 x${f.mult} = ${fmt(f.amount)} G`, 1500, "bonus");
        chick.remove(); S.el.classList.remove("breaking", "broken");
        S.setCracks(0);
        S.wrap.classList.add("new-egg"); Sound.whoosh(); await sleep(pace(650)); S.wrap.classList.remove("new-egg");
        return f.total;
    }

    // themed background layer per machine
    function themeDeco() {
        const R = Math.random;
        switch (cfg.id) {
            case "five_cats": return h("div.cab-deco.deco-cats", h("i.shoji.l"), h("i.shoji.r"), h("span.lantern.l", "🏮"), h("span.lantern.r", "🏮"), h("span.dk-cat", "🐈"));
            case "froggie": return h("div.cab-deco.deco-rain", Array.from({ length: 46 }, (_, i) => h("i", { style: { left: (i * 2.2 + R() * 2) + "%", "--d": (R() * 1.2).toFixed(2) + "s", "--t": (0.55 + R() * 0.5).toFixed(2) + "s" } })));
            case "cat_mouse": return h("div.cab-deco.deco-neon", h("span.neon-sign", "CAT ♥ MOUSE"), h("span.nm.m1", "🐭"), h("span.nm.c1", "🐱"));
            case "crack_or_not": return h("div.cab-deco.deco-savanna", h("span.sv.s1", "🌵"), h("span.sv.s2", "🌾"), h("span.sv.s3", "🌾"));
            case "niagara": return h("div.cab-deco.deco-falls", h("div.falls"), h("div.mist"));
            case "lucky_boxes": return h("div.cab-deco.deco-treasure", Array.from({ length: 16 }, () => h("i", { style: { left: R() * 100 + "%", top: R() * 100 + "%", "--d": (R() * 2).toFixed(2) + "s" } }, "✨")));
            default: return null;
        }
    }

    // ------------------------------------------------------------ paytable
    function paytable() {
        if (egg) {
            const E = cfg.egg, sw = E.w.reduce((s, x) => s + x, 0);
            return modal(h("div.paytable", h("p", cfg.desc),
                h("p.muted", `탭 1번 = 베팅 1번. 탭마다 약 ${(cfg.features.crack.p * 100).toFixed(1)}% 확률로 깨집니다 (금이 간 정도와 무관). 랜덤 P 포인트.`),
                h("div.pt-list", E.mult.map((m, i) => h("div.pt-row", h("span", `🐣 x${m}`), h("b", `${(E.w[i] / sw * 100).toFixed(1)}%`))))), { title: cfg.name + " 배당표" });
        }
        const rowsHtml = classic
            ? Object.entries(cfg.pays).map(([k, v]) => h("div.pt-row", h("span", { "7": "7 7 7", B3: "BAR3 x3", B2: "BAR2 x3", B1: "BAR x3", CH: "🍒🍒🍒", ANYBAR: "아무 BAR x3", CH2: "🍒 x2", CH1: "🍒 (첫 릴)" }[k] || k), h("b", "x" + v)))
            : Object.entries(cfg.syms).map(([k, s]) => h("div.pt-row", symEl(k), h("b", s.pay.map((p, i) => `${i + 3}개 ${+(p * (cfg.px || 1)).toFixed(2)}`).join(" · "))));
        modal(h("div.paytable",
            h("p", cfg.desc),
            h("p.muted", classic ? "한 줄(가운데) 라인. P 아이콘 = 포인트." : `${Math.pow(rows, reelsN)} WAYS` + " · 왼쪽부터 연속된 릴. 배당은 총 베팅 대비 1 way 당 배수. P 아이콘 개수에 따라 1/3/6/10/20 포인트."),
            h("div.pt-list", rowsHtml)), { title: cfg.name + " 배당표" });
    }

    initReels(); renderJackpots(); renderMeter();
    // every machine has its own themed loop + SFX palette (core/gameAudio.js)
    const audio = gameAudio(cfg), songName = typeof audio.song === "string" ? audio.song : audio.song.name;
    Sound.palette(audio.sfx); Sound.bgm(audio.song);
    const jpTimer = setInterval(() => { if (!document.body.contains(root)) { clearInterval(jpTimer); if (Sound.bgmPlaying === songName) Sound.bgmStop(); if (Sound.paletteId === cfg.id) Sound.palette(null); } else if (!busy) renderJackpots(); }, 3000);
    return root;
}
