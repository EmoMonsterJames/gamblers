// =====================================================================
// Casino game screen. The result is rolled by data/casino.js first; each
// "kind" below only animates it.
// ctx: { pid, money(), luck, canPlay(), record(bet, payout, points, extra), close() }
// =====================================================================
import { h, sleep, fmt, rand, pick, shuffle } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, bigWin, floatText, confetti, shake } from "../core/fx.js";
import { playCasino, gameRtp, topMult } from "../data/casino.js";
import { Store } from "../core/store.js";
import { jackpotButton } from "../ui/jackpotList.js";
import { showPetHelp } from "../ui/petHelp.js";

export function openCasino(g, ctx) {
    let bet = g.bets.find(b => b <= ctx.money()) || g.bets[0];
    let busy = false;
    const moneyEl = h("b", fmt(ctx.money()) + " G");
    const msg = h("div.cg-msg", "베팅 금액을 고르고 플레이!");
    const chips = h("div.chips");
    const stage = h("div.cg-stage.k-" + g.kind);
    const controls = h("div.cg-controls");
    const hist = h("div.cg-hist");
    const root = h("div.game-screen.casino-screen",
        h("div.gs-head",
            h("button.btn.ghost.back", { onclick: () => { if (busy) return toast("진행 중입니다", "warn"); ctx.close(); } }, "← 나가기"),
            h("div.gs-title", h("span.ico", g.icon), h("div", h("b", g.name), h("small", g.desc))),
            h("div.gs-wallet", h("small", "보유금액"), moneyEl, h("small.rtp", `RTP ${(gameRtp(g) * 100).toFixed(1)}%`)), jackpotButton(g.id, g.name)),
        h("div.cg-body", stage, msg, controls, h("div.cg-bets", h("small", "BET"), chips), hist));

    const renderChips = () => chips.replaceChildren(...g.bets.map(b => h("button.chip" + (b === bet ? ".on" : ""), {
        disabled: b > ctx.money() || busy, onclick: () => { bet = b; Sound.click(); renderChips(); }
    }, fmt(b))));
    const refresh = () => { moneyEl.textContent = fmt(ctx.money()) + " G"; renderChips(); };

    // play(choice) -> rolls, animates via kind.animate, credits winnings
    async function play(choice, animate) {
        if (busy) return;
        const can = ctx.canPlay();
        if (!can.ok) return toast(can.why, "warn");
        if (bet > ctx.money()) return toast("보유금액이 부족합니다", "warn");
        busy = true; refresh();
        root.classList.add("busy");
        ctx.record(bet, 0, 0, { pending: true }); // deduct the bet right away
        refresh();
        msg.textContent = "…";
        const res = playCasino(g, bet, ctx.luck, choice);
        try { await animate(res, choice); } catch (e) { console.error(e); }
        ctx.record(0, res.payout, res.points, { settle: true, bet });
        refresh();
        if (res.payout > 0) {
            msg.innerHTML = `<span class="win">WIN ×${res.mult} → +${fmt(res.payout)} G</span>`;
            if (res.entry.boosted) msg.append(h("span.lucky", " 🃏 상금 UP 아이템 발동!"));
            if (res.entry.lucky) { const credit = showPetHelp(ctx.luck, "win", res.payout); if (credit) { msg.append(h("span.lucky", ` 🐾 ${credit.name} 덕분!`)); ctx.petHelp?.("win", res.payout, credit); } }
            Sound.win();
            const top = res.mult >= topMult(g);
            if (top) Store.logJackpot(g.id, "JACKPOT", ctx.pid, res.payout);
            if (top) await bigWin(res.payout, bet, { title: "JACKPOT!" });
            else if (res.mult >= 20 || res.payout >= 50000) await bigWin(res.payout, bet);
        } else { msg.innerHTML = `<span class="lose">꽝! 다음 기회에…</span>`; Sound.lose(); }
        if (res.points) { floatText(stage, `+${res.points} P`, "pts"); Sound.coin(); }
        hist.prepend(h("span.hchip" + (res.payout ? ".w" : ""), res.payout ? `+${fmt(res.payout)}` : `-${fmt(bet)}`));
        while (hist.children.length > 14) hist.lastChild.remove();
        busy = false; root.classList.remove("busy"); refresh();
    }

    const K = KINDS[g.kind];
    K(g, { stage, controls, play, msg });
    refresh();
    return root;
}

// ---------------------------------------------------------------- kinds
const KINDS = {
    wheel(g, { stage, controls, play }) {
        const wins = g.table.map(e => e.m);
        const segs = [];
        const loseCount = Math.max(4, 12 - wins.length);
        const winsSorted = [...wins];
        for (let i = 0; i < loseCount + winsSorted.length; i++) segs.push(i % 2 === 0 && winsSorted.length ? winsSorted.shift() : 0);
        while (winsSorted.length) segs.push(winsSorted.shift());
        const n = segs.length, R = 150;
        const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
        let paths = "";
        segs.forEach((m, i) => {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
            const x0 = R + R * Math.cos(a0), y0 = R + R * Math.sin(a0), x1 = R + R * Math.cos(a1), y1 = R + R * Math.sin(a1);
            const am = (a0 + a1) / 2, tx = R + R * 0.68 * Math.cos(am), ty = R + R * 0.68 * Math.sin(am);
            paths += `<path d="M${R} ${R} L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}Z" fill="${m ? colors[i % colors.length] : "#1f2937"}" stroke="#fde68a" stroke-width="2"/>`;
            paths += `<text x="${tx}" y="${ty}" fill="#fff" font-size="${m ? 18 : 13}" font-family="Lilita One" text-anchor="middle" dominant-baseline="middle" transform="rotate(${am * 180 / Math.PI + 90} ${tx} ${ty})">${m ? "x" + m : "꽝"}</text>`;
        });
        const wheel = h("div.wheel", { html: `<svg viewBox="0 0 300 300">${paths}<circle cx="150" cy="150" r="22" fill="#fde68a" stroke="#92400e" stroke-width="4"/></svg>` });
        stage.append(h("div.wheel-wrap", h("div.wheel-pointer", "▼"), wheel, h("div.wheel-bulbs")));
        let rot = 0;
        controls.append(h("button.btn.gold.big", { onclick: () => play(null, async res => {
            const idxs = segs.map((m, i) => [m, i]).filter(([m]) => m === res.mult).map(([, i]) => i);
            const idx = pick(idxs.length ? idxs : [0]);
            const segAng = 360 / n;
            const target = 360 - (idx * segAng + segAng / 2) + (Math.random() - 0.5) * segAng * 0.6;
            rot = rot - (rot % 360) + 360 * 6 + target;
            wheel.style.transition = "transform 4.2s cubic-bezier(.12,.67,.1,1)";
            wheel.style.transform = `rotate(${rot}deg)`;
            for (let i = 0; i < 30; i++) { Sound.tick(); await sleep(40 + i * 4.5); }
            await sleep(400);
        }) }, "🎡 SPIN"));
    },

    pick(g, { stage, controls, play, msg }) {
        const row = h("div.pick-row");
        const reset = () => row.replaceChildren(...Array.from({ length: g.n }, (_, i) => h("button.pick-tile", { onclick: () => choose(i) }, h("span", g.closed))));
        reset();
        stage.append(row);
        msg.textContent = "하나를 골라 클릭!";
        let open = false;
        function choose(i) {
            if (open) return;
            play(i, async res => {
                open = true;
                const tiles = [...row.children];
                tiles[i].classList.add("shaking"); Sound.tease();
                await sleep(900);
                tiles[i].classList.remove("shaking");
                if (res.mult > 0) { tiles[i].replaceChildren(h("span", g.prize), h("b", "x" + res.mult)); tiles[i].classList.add("win"); }
                else {
                    tiles[i].replaceChildren(h("span", g.miss)); tiles[i].classList.add("lose");
                    await sleep(500);
                    const other = shuffle(tiles.map((_, k) => k).filter(k => k !== i))[0];
                    tiles[other].replaceChildren(h("span", g.prize)); tiles[other].classList.add("ghost");
                }
                for (const [k, t] of tiles.entries()) if (!t.classList.contains("win") && !t.classList.contains("lose") && !t.classList.contains("ghost")) t.replaceChildren(h("span", g.miss)), t.classList.add("dim");
                await sleep(700);
            }).then(() => setTimeout(() => { open = false; reset(); }, 1300));
        }
        controls.append(h("div.muted", "보석/상자/저금통을 직접 클릭하세요"));
    },

    coinflip(g, { stage, controls, play }) {
        const coin = h("div.coin3d", h("div.face.front", "앞"), h("div.face.back", "뒤"));
        stage.append(h("div.coin-wrap", coin, h("div.coin-shadow")));
        let rot = 0;
        const go = side => play(side, async res => {
            let land = res.mult > 0 ? side : (side === "front" ? "back" : "front");
            if (res.entry.edge) land = side;
            rot += 360 * 8 + ((land === "back") !== (Math.round(rot / 180) % 2 === 1) ? 180 : 0);
            coin.classList.remove("edge");
            coin.style.transition = "transform 2.4s cubic-bezier(.2,.8,.25,1)";
            coin.style.transform = `translateY(-10px) rotateX(${rot}deg)`;
            Sound.whoosh();
            await sleep(2450);
            if (res.entry.edge) { coin.classList.add("edge"); confetti(40, ["🪙"]); await sleep(600); }
        });
        controls.append(h("button.btn.gold.big", { onclick: () => go("front") }, "앞면 🙂"), h("button.btn.gold.big", { onclick: () => go("back") }, "뒷면 🙃"));
    },

    dice(g, { stage, controls, play }) {
        const d1 = h("div.die", "⚀"), d2 = h("div.die", "⚀");
        const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
        stage.append(h("div.dice-wrap", d1, d2), h("div.dice-table", g.table.map(e => h("span", `${{ sum7: "합 7", double: "더블(1~3)", highdouble: "더블(4·5)", "66": "6-6" }[e.d]} = x${e.m}`))));
        controls.append(h("button.btn.gold.big", { onclick: () => play(null, async res => {
            let a, b;
            const d = res.entry.d;
            if (d === "sum7") [a, b] = pick([[1, 6], [2, 5], [3, 4], [6, 1], [5, 2], [4, 3]]);
            else if (d === "double") a = b = pick([1, 2, 3]);
            else if (d === "highdouble") a = b = pick([4, 5]);
            else if (d === "66") a = b = 6;
            else { do { a = 1 + rand(6); b = 1 + rand(6); } while (a === b || a + b === 7); }
            for (let i = 0; i < 16; i++) { d1.textContent = pick(faces); d2.textContent = pick(faces); d1.style.transform = `rotate(${rand(360)}deg)`; d2.style.transform = `rotate(${rand(360)}deg)`; Sound.tick(); await sleep(60 + i * 8); }
            d1.textContent = faces[a - 1]; d2.textContent = faces[b - 1]; d1.style.transform = d2.style.transform = "rotate(0)";
            Sound.stop();
            await sleep(500);
        }) }, "🎲 ROLL"));
    },

    hilo(g, { stage, controls, play }) {
        const RANK = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
        const SUIT = ["♠", "♥", "♦", "♣"];
        let cur = 3 + rand(11);
        const card = (v, s, hidden) => h("div.card" + (hidden ? ".back" : "") + (s === "♥" || s === "♦" ? ".red" : ""), hidden ? "" : [h("b", RANK[v]), h("span", s)]);
        const a = h("div.card-slot"), b = h("div.card-slot");
        const draw = () => { a.replaceChildren(card(cur, pick(SUIT))); b.replaceChildren(card(0, "", true)); };
        draw();
        stage.append(h("div.hilo", a, h("div.vs", "?"), b));
        const go = dir => play(dir, async res => {
            let nv;
            if (res.entry.joker) { b.replaceChildren(h("div.card.joker", h("b", "🃏"), h("span", "JOKER"))); }
            else {
                const higher = []; const lower = [];
                for (let v = 2; v <= 14; v++) { if (v > cur) higher.push(v); if (v < cur) lower.push(v); }
                const win = res.mult > 0;
                const wantHigh = (dir === "high") === win;
                nv = pick(wantHigh ? higher : (win ? lower : [...lower, cur]));
                b.firstChild.classList.add("flip"); Sound.tease();
                await sleep(800);
                b.replaceChildren(card(nv, pick(SUIT)));
            }
            Sound.stop();
            await sleep(900);
            cur = 3 + rand(11); draw();
        });
        controls.append(h("button.btn.gold.big", { onclick: () => go("high") }, "⬆ HIGH"), h("button.btn.gold.big", { onclick: () => go("low") }, "⬇ LOW"));
    },

    scratch(g, { stage, controls, play, msg }) {
        const grid = h("div.scratch");
        const blank = () => grid.replaceChildren(...Array.from({ length: 9 }, () => h("div.sc-cell", h("div.sc-cover", "?"))));
        blank();
        stage.append(grid, h("div.sc-legend", g.table.map(e => h("span", `${e.s}${e.s}${e.s} = x${e.m}`))));
        msg.textContent = "SCRATCH를 누르고 칸을 긁어보세요";
        let active = false;
        controls.append(h("button.btn.gold.big", { onclick: () => { if (active) return; play(null, async res => {
            active = true;
            const syms = g.syms;
            let cells = [];
            if (res.mult > 0) {
                const s = res.entry.s; cells = [s, s, s];
                const others = shuffle(syms.filter(x => x !== s));
                while (cells.length < 9) { const o = others[(cells.length - 3) % others.length]; if (cells.filter(x => x === o).length < 2) cells.push(o); else cells.push(others.find(x => cells.filter(y => y === x).length < 2)); }
            } else {
                const pool = shuffle(syms.flatMap(s => [s, s]));
                cells = pool.slice(0, 9);
            }
            cells = shuffle(cells);
            const els = cells.map(s => { const cover = h("div.sc-cover", "?"); const c = h("div.sc-cell", h("span", s), cover); return { c, cover, s }; });
            grid.replaceChildren(...els.map(x => x.c));
            await new Promise(done => {
                let left = 9;
                const reveal = x => { if (x.cover.classList.contains("off")) return; x.cover.classList.add("off"); Sound.tick(); if (--left === 0) done(); };
                els.forEach(x => { x.c.addEventListener("pointerenter", e => { if (e.buttons) reveal(x); }); x.c.addEventListener("pointerdown", () => reveal(x)); });
                controls.querySelector(".sc-all").onclick = async () => { for (const x of els) { reveal(x); await sleep(70); } };
            });
            if (res.mult > 0) els.filter(x => x.s === res.entry.s).forEach(x => x.c.classList.add("win"));
            await sleep(600);
        }).then(() => { active = false; setTimeout(blank, 1800); }); } }, "🎟 SCRATCH"), h("button.btn.ghost.sc-all", "모두 긁기"));
    },

    gacha(g, { stage, controls, play }) {
        const globe = h("div.gacha-globe", Array.from({ length: 14 }, (_, i) => h("i", { style: { "--c": pick([...g.table.map(e => e.c), "#6b7280"]), "--i": i } })));
        const out = h("div.gacha-out");
        const knob = h("div.gacha-knob", "⟳");
        stage.append(h("div.gacha", globe, h("div.gacha-body", knob, h("div.gacha-slot")), out));
        controls.append(h("button.btn.gold.big", { onclick: () => play(null, async res => {
            out.replaceChildren();
            knob.classList.add("turn"); globe.classList.add("mix"); Sound.whoosh();
            for (let i = 0; i < 10; i++) { Sound.tick(); await sleep(110); }
            knob.classList.remove("turn"); globe.classList.remove("mix");
            const c = res.mult > 0 ? res.entry.c : "#6b7280";
            const cap = h("div.capsule", { style: { "--c": c } }, h("i.top"), h("i.bot"));
            out.append(cap);
            await sleep(700);
            cap.classList.add("open"); Sound.stop();
            out.append(h("div.cap-prize", res.mult > 0 ? `${res.entry.n} x${res.mult}` : "꽝 💨"));
            await sleep(700);
        }) }, "🎰 뽑기"));
    },

    plinko(g, { stage, controls, play }) {
        const rows = g.buckets.length - 1; // pegs rows
        const W = 440, H = 380, gapX = W / (g.buckets.length + 1), gapY = (H - 70) / (rows + 1);
        let pegs = "";
        for (let r = 0; r < rows; r++) for (let k = 0; k <= r + 1; k++) {
            const x = W / 2 + (k - (r + 1) / 2) * gapX, y = 30 + r * gapY;
            pegs += `<circle cx="${x}" cy="${y}" r="4" fill="#fde68a"/>`;
        }
        const board = h("div.plinko", { html: `<svg viewBox="0 0 ${W} ${H}">${pegs}</svg>` });
        const ball = h("div.pl-ball");
        const buckets = h("div.pl-buckets", g.buckets.map(m => h("span" + (m >= 5 ? ".hot" : m === 0 ? ".zero" : ""), m ? "x" + m : "0")));
        board.append(ball, buckets);
        stage.append(board);
        controls.append(h("button.btn.gold.big", { onclick: () => play(null, async res => {
            const b = res.entry.bucket ?? 5;
            const moves = shuffle([...Array(b).fill(1), ...Array(rows - b).fill(0)]);
            let pos = 0;
            ball.style.opacity = 1;
            const place = (r, k) => { ball.style.left = ((W / 2 + (k - (r) / 2) * gapX) / W * 100) + "%"; ball.style.top = ((10 + r * gapY) / H * 100) + "%"; };
            place(0, 0);
            await sleep(200);
            for (let r = 0; r < rows; r++) { pos += moves[r]; place(r + 1, pos); Sound.tick(); await sleep(150); }
            ball.style.top = "93%";
            await sleep(250);
            buckets.children[b].classList.add("hit"); Sound.stop();
            await sleep(600);
            buckets.children[b].classList.remove("hit"); ball.style.opacity = 0;
        }) }, "🔻 DROP"));
    },

    lottery(g, { stage, controls, play }) {
        const ticket = h("div.lotto-ticket"), drawn = h("div.lotto-draw");
        stage.append(h("div.lotto", h("small", "내 번호"), ticket, h("small", "추첨"), drawn), h("div.sc-legend", g.table.map(e => h("span", `${e.k}개 = x${e.m}`))));
        const newTicket = () => shuffle(Array.from({ length: 30 }, (_, i) => i + 1)).slice(0, 5).sort((a, b) => a - b);
        let mine = newTicket();
        const showTicket = () => ticket.replaceChildren(...mine.map(n => h("span.ball", n)));
        showTicket();
        controls.append(h("button.btn.gold.big", { onclick: () => play(null, async res => {
            const k = res.mult > 0 ? res.entry.k : pick([0, 1, 1]);
            const hits = shuffle(mine).slice(0, k);
            const rest = shuffle(Array.from({ length: 30 }, (_, i) => i + 1).filter(n => !mine.includes(n))).slice(0, 5 - k);
            const draw = shuffle([...hits, ...rest]);
            drawn.replaceChildren();
            for (const n of draw) {
                const b = h("span.ball.pop" + (mine.includes(n) ? ".hit" : ""), n);
                drawn.append(b); Sound.tick();
                if (mine.includes(n)) { [...ticket.children].find(x => +x.textContent === n)?.classList.add("hit"); Sound.coin(); }
                await sleep(550);
            }
            await sleep(500);
            mine = newTicket(); setTimeout(showTicket, 1500);
        }) }, "🎱 추첨"));
    },

    pension(g, { stage, controls, play }) {
        const mk = () => Array.from({ length: 6 }, () => rand(10));
        let mine = mk();
        const tk = h("div.pension-row"), dr = h("div.pension-row.draw");
        const show = () => { tk.replaceChildren(...mine.map(d => h("span", d))); dr.replaceChildren(...mine.map(() => h("span", "?"))); };
        show();
        stage.append(h("div.pension", h("small", "내 연금 티켓"), tk, h("small", "당첨 번호"), dr), h("div.sc-legend", g.table.map(e => h("span", `끝 ${e.k}자리 = x${e.m}`))));
        controls.append(h("button.btn.gold.big", { onclick: () => play(null, async res => {
            const k = res.mult > 0 ? res.entry.k : pick([0, 0, 1]);
            const draw = mine.map(() => rand(10));
            for (let i = 0; i < 6; i++) {
                const fromRight = 5 - i;
                if (fromRight < k) draw[i] = mine[i];
                else if (fromRight === k) draw[i] = (mine[i] + 1 + rand(9)) % 10;
            }
            for (let i = 5; i >= 0; i--) {
                const span = dr.children[i];
                for (let t = 0; t < 8; t++) { span.textContent = rand(10); Sound.tick(); await sleep(50); }
                span.textContent = draw[i];
                if (draw[i] === mine[i] && 5 - i < k) { span.classList.add("hit"); tk.children[i].classList.add("hit"); Sound.coin(); }
                await sleep(250);
            }
            await sleep(700);
            mine = mk(); setTimeout(show, 1500);
        }) }, "🎫 추첨"));
    },

    roulette(g, { stage, controls, play }) {
        const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
        const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
        const col = n => n === 0 ? "green" : REDS.has(n) ? "red" : "black";
        const R = 150, n = ORDER.length;
        let svg = "";
        ORDER.forEach((num, i) => {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
            const am = (a0 + a1) / 2;
            svg += `<path d="M${R} ${R} L${R + R * Math.cos(a0)} ${R + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R + R * Math.cos(a1)} ${R + R * Math.sin(a1)}Z" fill="${{ green: "#16a34a", red: "#dc2626", black: "#111827" }[col(num)]}" stroke="#d4a017" stroke-width="1"/>`;
            const tx = R + R * 0.85 * Math.cos(am), ty = R + R * 0.85 * Math.sin(am);
            svg += `<text x="${tx}" y="${ty}" fill="#fff" font-size="11" text-anchor="middle" dominant-baseline="middle" transform="rotate(${am * 180 / Math.PI + 90} ${tx} ${ty})">${num}</text>`;
        });
        const wheel = h("div.wheel.roulette", { html: `<svg viewBox="0 0 300 300">${svg}<circle cx="150" cy="150" r="95" fill="#3f2a14" stroke="#d4a017" stroke-width="5"/><circle cx="150" cy="150" r="20" fill="#d4a017"/></svg>` });
        const result = h("div.rl-result", "—");
        stage.append(h("div.wheel-wrap", h("div.wheel-pointer", "▼"), wheel), result);
        let rot = 0;
        const go = colour => play(colour, async res => {
            const win = res.mult > 0;
            const cands = ORDER.filter(x => win ? col(x) === colour : col(x) !== colour);
            const num = pick(cands);
            const idx = ORDER.indexOf(num);
            const seg = 360 / n;
            rot = rot - (rot % 360) + 360 * 5 + (360 - (idx * seg + seg / 2));
            wheel.style.transition = "transform 4.5s cubic-bezier(.12,.67,.1,1)";
            wheel.style.transform = `rotate(${rot}deg)`;
            result.textContent = "…";
            for (let i = 0; i < 30; i++) { Sound.tick(); await sleep(45 + i * 5); }
            await sleep(500);
            result.className = "rl-result " + col(num);
            result.textContent = num;
        });
        controls.append(h("button.btn.red.big", { onclick: () => go("red") }, "RED x1.9"), h("button.btn.dark.big", { onclick: () => go("black") }, "BLACK x1.9"), h("button.btn.green.big", { onclick: () => go("green") }, "GREEN x14"));
    }
};
