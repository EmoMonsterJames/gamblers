// =====================================================================
// 💎 Point Slots · POINT MANIA (Good Luck Casino only)
//   bets in POINTS (1~5P) · non-progressive · fixed jackpots MINI 10P · MINOR 30P · MAXI 100P · MAJOR 500P · GRAND 1000P
//   the "P" circle fills with rising blue waves as 💎 Point icons land
//   🌊 P 보너스: the wave bursts — 3~10 Point icons turn WILD · ⭐ ×3 = 8 Free Spins · 🎡 ×3 = 포인트 휠
//   RTP 85% (outcome table below — checked by simulation: rtpSim()) · once per season, at most 100 spins (each one = 1 slot spin)
// =====================================================================
import { h, sleep, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, banner, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";

export const PM_ID = "point_mania";
export const PM_BETS = [1, 2, 3, 4, 5];
export const PM_MAX_SPINS = 100;
export const PM_JP = { MINI: 10, MINOR: 30, MAXI: 100, MAJOR: 500, GRAND: 1000 };
// base outcomes: [× bet, weight]
const BASE = [[0, 450], [0.5, 150], [1, 100], [2, 60], [3, 30], [5, 15], [10, 5]];
const PBONUS_W = 12, FS_W = 8, WHEEL_W_PER_BET = 1.2, FREE_SPINS = 8;
export const WHEEL = [
    { k: "3P", v: 3, w: 40 }, { k: "5P", v: 5, w: 30 }, { k: "8P", v: 8, w: 18 },
    { k: "MINI", v: PM_JP.MINI, w: 6, jp: true }, { k: "MINOR", v: PM_JP.MINOR, w: 3, jp: true }, { k: "MAXI", v: PM_JP.MAXI, w: 2, jp: true },
    { k: "MAJOR", v: PM_JP.MAJOR, w: 0.7, jp: true }, { k: "GRAND", v: PM_JP.GRAND, w: 0.3, jp: true }
];
const wpick = (list, w, rnd) => { let x = rnd() * list.reduce((a, e) => a + w(e), 0); for (const e of list) if ((x -= w(e)) < 0) return e; return list[list.length - 1]; };
// fractional points: rounded up with the chance of the fraction (keeps the RTP exact)
const roundP = (v, rnd) => Math.floor(v) + (rnd() < v - Math.floor(v) ? 1 : 0);
const baseOne = (bet, rnd) => roundP(bet * wpick(BASE, e => e[1], rnd)[0], rnd);
// one paid spin → { kind, win (P), x, wilds, fs: [wins], seg }
export function pmSpin(bet, rnd = Math.random) {
    const wheelW = WHEEL_W_PER_BET * bet; // the wheel pays fixed points → its chance grows with the bet (same RTP at every bet)
    const baseW = BASE.reduce((a, e) => a + e[1], 0);
    const roll = rnd() * (baseW + PBONUS_W + FS_W + wheelW);
    if (roll < baseW) { const x = wpick(BASE, e => e[1], rnd)[0]; return { kind: "base", x, win: roundP(bet * x, rnd) }; }
    if (roll < baseW + PBONUS_W) { const x = 4 + Math.floor(rnd() * 17); return { kind: "pbonus", x, wilds: Math.min(10, 3 + Math.floor(x / 3)), win: bet * x }; }
    if (roll < baseW + PBONUS_W + FS_W) { const fs = Array.from({ length: FREE_SPINS }, () => baseOne(bet, rnd)); return { kind: "fs", fs, win: fs.reduce((a, b) => a + b, 0) }; }
    const seg = wpick(WHEEL, e => e.w, rnd);
    return { kind: "wheel", seg, win: seg.v };
}
// RTP check (admin console / test): rtpSim(1e6)
export function rtpSim(n = 200000, bet = 1) { let paid = 0, won = 0; for (let i = 0; i < n; i++) { paid += bet; won += pmSpin(bet).win; } return won / paid; }
if (typeof window !== "undefined") window.pmRtpSim = rtpSim;

// ---------------------------------------------------------------- the grid shown for an outcome
const LOW = ["🔷", "🔹", "🟦", "💠"], HIGH = ["🅿️", "💙"], POINT = "💎", STAR = "⭐", WHEEL_ICO = "🎡", WILD = "🌊";
const rndSym = () => Math.random() < 0.16 ? POINT : Math.random() < 0.7 ? LOW[Math.floor(Math.random() * LOW.length)] : HIGH[Math.floor(Math.random() * HIGH.length)];
function gridFor(r) {
    const g = Array.from({ length: 15 }, rndSym);
    // no accidental line on the middle row
    for (let c = 1; c < 5; c++) while (g[5 + c] === g[5] && r.kind === "base" && !r.x) g[5 + c] = rndSym();
    const line = [];
    if (r.kind === "base" && r.x > 0) {
        const n = r.x >= 5 ? 5 : r.x >= 2 ? 4 : 3;
        const sym = r.x >= 10 ? POINT : r.x === 1 || r.x === 3 ? HIGH[Math.floor(Math.random() * 2)] : LOW[Math.floor(Math.random() * LOW.length)];
        for (let c = 0; c < n; c++) { g[5 + c] = sym; line.push(5 + c); }
    }
    const scatter = sym => { const cells = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).slice(0, 3); for (const c of cells) g[c + 5 * Math.floor(Math.random() * 3)] = sym; };
    if (r.kind === "fs") scatter(STAR);
    if (r.kind === "wheel") scatter(WHEEL_ICO);
    return { g, line };
}

// ---------------------------------------------------------------- the machine
const useOf = pid => { const s = G.S(), ps = s.ps[pid]; if (ps.pm?.season !== s.number) ps.pm = { season: s.number, spins: 0, closed: false }; return ps.pm; };
export const pmLeft = pid => { const u = useOf(pid); return u.closed ? 0 : Math.max(0, PM_MAX_SPINS - u.spins); };

export function pointManiaView(pid, { turn, onChange = () => { } } = {}) {
    const ps = G.S().ps[pid], u = useOf(pid);
    const wrap = h("div.pm-wrap");
    if (u.closed) { wrap.append(h("p.notice", "💎 Point Mania는 시즌당 1번만 이용할 수 있습니다 — 이번 시즌에는 이미 이용했습니다.")); return wrap; }
    wrap.append(h("div.pm-intro",
        h("div.pm-logo", h("span.pm-dia", "💎"), h("b", "Point Slots")),
        h("p", "🎰 ", h("b", "POINT MANIA"), " — 포인트(P)로 베팅하는 특별 슬롯! 시즌당 1번 · 최대 100스핀 (스핀마다 슬롯 횟수 1회 차감). 한 번 나가면 이번 시즌에는 다시 들어올 수 없습니다."),
        h("div.row.center", h("button.btn.gold.big", { onclick: () => open() }, "💎 Point Mania 시작"))));
    function open() {
        const meter = h("i.pm-wave"), circle = h("div.pm-circle", meter, h("b", "P"));
        const cells = Array.from({ length: 15 }, () => h("span.pm-cell", rndSym()));
        const grid = h("div.pm-grid", cells);
        const info = h("div.pm-info"), msg = h("div.pm-msg", "베팅 포인트를 고르고 SPIN!");
        let bet = 1, busy = false, fill = 0.1;
        const jpRow = h("div.pm-jps", Object.entries(PM_JP).map(([k, v]) => h("div.pm-jp.j-" + k.toLowerCase(), h("small", k), h("b", `${v}P`))));
        const betRow = h("div.pm-bets");
        const spinBtn = h("button.btn.gold.big.pm-spin", { onclick: () => spin() }, "SPIN");
        const leaveBtn = h("button.btn.ghost", { onclick: () => leave() }, "🚪 나가기 (이번 시즌 종료)");
        const setFill = f => { fill = Math.max(0.05, Math.min(1, f)); meter.style.height = Math.round(fill * 100) + "%"; };
        const paint = () => {
            info.replaceChildren(h("span", `💎 보유 ${fmt(ps.points)} P`), h("span", `🎰 남은 스핀 ${Math.min(pmLeft(pid), G.playsLeft(pid, "slot"))} (Point Mania ${pmLeft(pid)} · 슬롯 횟수 ${G.playsLeft(pid, "slot")})`));
            betRow.replaceChildren(...PM_BETS.map(b => h("button.btn.small" + (b === bet ? ".gold" : ".ghost"), { disabled: busy, onclick: () => { bet = b; paint(); } }, `${b}P`)));
            spinBtn.disabled = busy; leaveBtn.disabled = busy;
        };
        const m = modal(h("div.pm-machine", h("div.pm-top", h("div.pm-logo", h("span.pm-dia", "💎"), h("b", "Point Slots")), h("div.pm-title", "POINT MANIA"), circle), jpRow, grid, msg, info, h("div.pm-ctrl", betRow, spinBtn, leaveBtn)), { title: "💎 Point Mania", wide: true, closable: false, cls: "pm-modal" });
        setFill(0.1); paint();
        async function show(r, free = false) {
            const { g, line } = gridFor(r);
            for (let c = 0; c < 5; c++) {
                for (let k = 0; k < 4; k++) { for (let rr = 0; rr < 3; rr++) cells[c + rr * 5].textContent = rndSym(); await sleep(45); }
                for (let rr = 0; rr < 3; rr++) { const i = c + rr * 5; cells[i].textContent = g[i]; cells[i].className = "pm-cell"; if (g[i] === POINT) { cells[i].classList.add("pt"); setFill(fill + 0.035); Sound.coin(); } }
                Sound.tick();
            }
            if (r.kind !== "pbonus" && fill > 0.92) setFill(0.6);
            line.forEach(i => cells[i].classList.add("win"));
            return g;
        }
        async function spin() {
            if (busy) return;
            if (pmLeft(pid) <= 0) return toast("Point Mania 100스핀을 모두 사용했습니다", "warn");
            if (G.playsLeft(pid, "slot") <= 0) return toast("이번 라운드 슬롯 스핀 횟수를 모두 썼습니다", "warn");
            if (turn && (turn.remaining <= 0 || !turn.running)) return toast(turn.remaining <= 0 ? "⏰ 시간 종료!" : "⏸ 일시정지 중입니다", "warn");
            if (ps.points < bet) return toast(`포인트가 부족합니다 (${bet}P)`, "warn");
            busy = true; paint();
            G.spendBet(pid, "slot", 0);
            u.spins++;
            const r = pmSpin(bet);
            msg.textContent = "…"; Sound.whoosh();
            await show(r);
            if (r.kind === "pbonus") {
                setFill(1); circle.classList.add("burst"); Sound.bonus(); await banner("🌊 P 보너스!", 1300, "pm");
                const idx = [...Array(15).keys()].sort(() => Math.random() - 0.5).slice(0, r.wilds);
                for (const i of idx) { cells[i].textContent = WILD; cells[i].classList.add("wild"); Sound.coin(); await sleep(160); }
                circle.classList.remove("burst"); setFill(0.1);
                msg.textContent = `🌊 ${r.wilds}개의 Point가 WILD로! +${r.win}P`;
            } else if (r.kind === "fs") {
                Sound.bonus(); await banner(`⭐ FREE SPINS ×${FREE_SPINS}`, 1300, "pm");
                let sum = 0;
                for (let i = 0; i < r.fs.length; i++) {
                    msg.textContent = `⭐ 프리스핀 ${i + 1} / ${r.fs.length} · 누적 ${sum}P`;
                    const x = r.fs[i] / bet;
                    await show({ kind: "base", x: x >= 10 ? 10 : x >= 5 ? 5 : x >= 3 ? 3 : x >= 2 ? 2 : x >= 1 ? 1 : x > 0 ? 0.5 : 0 }, true);
                    sum += r.fs[i]; if (r.fs[i]) Sound.coin();
                    await sleep(380);
                }
                msg.textContent = `⭐ 프리스핀 종료 · +${r.win}P`;
            } else if (r.kind === "wheel") {
                Sound.bonus(); await banner("🎡 포인트 휠!", 1200, "pm");
                await wheel(r.seg);
                msg.textContent = r.seg.jp ? `🎉 ${r.seg.k} JACKPOT! +${r.win}P` : `🎡 ${r.seg.k} +${r.win}P`;
                if (r.seg.jp) { Store.logJackpot?.(PM_ID, r.seg.k, pid, r.win); confetti(r.seg.v >= 100 ? 120 : 50, ["💎", "✨"]); Sound.jackpot(); }
            } else msg.textContent = r.win ? `💎 +${r.win}P` : "꽝…";
            if (r.win > 0 && r.kind === "base") Sound.win();
            G.recordPlay("slot", 0, 0, r.win - bet, { game: PM_ID, bonus: r.kind !== "base", freeSpin: false, jackpot: r.seg?.jp ? r.seg.k : null });
            G.log(`💎 ${G.name(pid)} Point Mania ${bet}P → ${r.win ? `+${r.win}P` : "꽝"}${r.kind !== "base" ? ` (${{ pbonus: "P 보너스", fs: "프리스핀", wheel: `휠 ${r.seg?.k}` }[r.kind]})` : ""}`);
            Store.saveSeason();
            busy = false; paint(); onChange();
            if (pmLeft(pid) <= 0) { toast("💎 Point Mania 100스핀 완료!", "ok"); leave(); }
        }
        async function wheel(seg) {
            const segs = WHEEL.map(w => w.k);
            const wl = h("div.pm-wheel", segs.map((k, i) => h("span.pm-seg", { style: { "--i": i, "--n": segs.length } }, k)));
            const box = h("div.pm-wheel-box", h("div.pm-pointer", "▼"), wl);
            grid.after(box);
            const n = segs.length, to = segs.indexOf(seg.k);
            const deg = 360 * 5 + (360 - (to + 0.5) * (360 / n));
            wl.style.transition = "transform 4.2s cubic-bezier(.12,.7,.15,1)";
            await sleep(30); wl.style.transform = `rotate(${deg}deg)`;
            for (let k = 0; k < 20; k++) { Sound.tick(); await sleep(80 + k * 10); }
            await sleep(900);
            box.remove();
        }
        function leave() {
            if (busy) return;
            u.closed = true; Store.saveSeason();
            m.close(); onChange();
            wrap.replaceChildren(h("p.notice", "💎 Point Mania 이용 완료 — 이번 시즌에는 다시 이용할 수 없습니다."));
        }
    }
    return wrap;
}
