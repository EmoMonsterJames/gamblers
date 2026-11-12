// =====================================================================
// Casino games. Each game decides its result FIRST from a weighted
// multiplier table, then the UI animates that result. The weight of the
// "lose" entry is solved automatically so every game hits its RTP
// (85~90%). Payouts are capped at CONFIG.CASINO_MAX_WIN (300,000 G).
//   kind: wheel | pick | coinflip | dice | hilo | scratch | gacha |
//         plinko | lottery | pension | roulette
//   table: [{ m: multiplier, w: weight, label }]   (lose entry is added)
// =====================================================================
import { CONFIG } from "../config.js";
import { NEW_MAPS, mapCasinos, casinoIdOf, RULE_REGIONS, seed01 } from "./regions.js";
import { boostChance } from "./catalog.js";

const BETS = [100, 500, 1000, 5000, 10000];
const HIGH = [1000, 5000, 10000, 30000];

export const CASINO_GAMES = [
    // ---------------- Lucky Casino
    { id: "lucky_wheel", name: "Lucky Wheel", kind: "wheel", icon: "🎡", rtp: 0.88, bets: BETS,
      desc: "행운의 휠을 돌려라! 최대 x30",
      table: [{ m: 1.5, w: 26 }, { m: 2, w: 14 }, { m: 3, w: 7 }, { m: 5, w: 3 }, { m: 10, w: 1 }, { m: 30, w: 0.25 }] },
    { id: "clover_scratch", name: "Clover Scratch", kind: "scratch", icon: "🍀", rtp: 0.87, bets: BETS,
      desc: "같은 그림 3개를 긁어내면 당첨!", syms: ["🍀", "🌈", "🪙", "🎩", "🌟", "💎"],
      table: [{ m: 1, w: 18, s: "🍀" }, { m: 2, w: 12, s: "🌈" }, { m: 3, w: 6, s: "🪙" }, { m: 5, w: 3, s: "🎩" }, { m: 10, w: 1.2, s: "🌟" }, { m: 50, w: 0.12, s: "💎" }] },
    // ---------------- Seaside Casino
    { id: "shell_cups", name: "Shell Game", kind: "pick", icon: "🐚", rtp: 0.88, bets: BETS,
      desc: "조개 3개 중 진주가 숨은 곳을 골라라!", n: 3, closed: "🐚", prize: "🫧", miss: "🦀",
      table: [{ m: 2.5, w: 30 }, { m: 10, w: 1 }] },
    { id: "sea_dice", name: "Sea Dice", kind: "dice", icon: "🎲", rtp: 0.87, bets: BETS,
      desc: "주사위 두 개! 더블이면 대박",
      table: [{ m: 1.5, w: 20, d: "sum7" }, { m: 3, w: 10, d: "double" }, { m: 8, w: 2.5, d: "highdouble" }, { m: 30, w: 0.4, d: "66" }] },
    // ---------------- Twins Wins (high limit)
    { id: "twin_flip", name: "Twin Coin Flip", kind: "coinflip", icon: "🪙", rtp: 0.9, bets: HIGH,
      desc: "하이리밋 코인플립. 맞히면 x1.9, 동전이 서면 x10!",
      table: [{ m: 1.9, w: 46 }, { m: 10, w: 0.4, edge: true }] },
    { id: "royal_cards", name: "Royal High-Low", kind: "hilo", icon: "🃏", rtp: 0.89, bets: HIGH,
      desc: "다음 카드가 높을까 낮을까? 조커가 나오면 x10",
      table: [{ m: 1.9, w: 45 }, { m: 10, w: 0.35, joker: true }] },
    // ---------------- Gamblers Casino
    { id: "gamblers_roulette", name: "Gamblers Roulette", kind: "roulette", icon: "🎯", rtp: 0.88, bets: BETS,
      desc: "RED / BLACK x1.9, GREEN x14" },
    { id: "pension_ticket", name: "연금 티켓", kind: "pension", icon: "🎫", rtp: 0.86, bets: BETS,
      desc: "6자리 번호! 뒤에서부터 맞힌 자리수만큼 당첨",
      table: [{ m: 1, w: 30, k: 2 }, { m: 3, w: 6, k: 3 }, { m: 10, w: 1.2, k: 4 }, { m: 50, w: 0.15, k: 5 }, { m: 300, w: 0.012, k: 6 }] },
    // ---------------- Dung Dung Casino
    { id: "dung_gacha", name: "Dung Gacha", kind: "gacha", icon: "💩", rtp: 0.88, bets: BETS,
      desc: "응가 캡슐 뽑기! 황금 캡슐이 나오면 x50",
      table: [{ m: 1, w: 26, c: "#8b5a2b", n: "브론즈" }, { m: 2, w: 13, c: "#cbd5e1", n: "실버" }, { m: 5, w: 3.5, c: "#facc15", n: "골드" }, { m: 15, w: 0.8, c: "#a78bfa", n: "퍼플" }, { m: 50, w: 0.15, c: "#f43f5e", n: "레전드" }] },
    { id: "dung_plinko", name: "Dung Plinko", kind: "plinko", icon: "🔻", rtp: 0.87, bets: BETS,
      desc: "공을 떨어뜨려라! 양 끝은 x25",
      buckets: [25, 5, 2, 1.2, 0, 0, 0, 1.2, 2, 5, 25] },
    // ---------------- No Luck Casino
    { id: "unlucky_chest", name: "Unlucky Chest", kind: "pick", icon: "🧰", rtp: 0.86, bets: BETS,
      desc: "상자 3개 중 하나를 골라라. 운이 없으면… 거미줄", n: 3, closed: "🧰", prize: "💰", miss: "🕸️",
      table: [{ m: 2, w: 28 }, { m: 5, w: 4 }, { m: 25, w: 0.3 }] },
    { id: "black_cat_hilo", name: "Black Cat Cards", kind: "hilo", icon: "🐈‍⬛", rtp: 0.86, bets: BETS,
      desc: "검은 고양이의 하이로우. 맞히면 x1.8",
      table: [{ m: 1.8, w: 46 }, { m: 8, w: 0.3, joker: true }] },
    // ---------------- Oink Oink Town
    { id: "piggy_bank_break", name: "Piggy Bank Smash", kind: "pick", icon: "🐖", rtp: 0.88, bets: BETS,
      desc: "돼지저금통 4개 중 하나를 깨라!", n: 4, closed: "🐖", prize: "🪙", miss: "💨",
      table: [{ m: 2, w: 26 }, { m: 4, w: 6 }, { m: 12, w: 1 }, { m: 40, w: 0.12 }] },
    { id: "oink_lottery", name: "Oink Lottery", kind: "lottery", icon: "🎱", rtp: 0.85, bets: BETS,
      desc: "1~30 중 5개 번호 추첨. 많이 맞힐수록 대박!",
      table: [{ m: 1, w: 22, k: 2 }, { m: 5, w: 3, k: 3 }, { m: 40, w: 0.2, k: 4 }, { m: 300, w: 0.008, k: 5 }] },
    // ---------------- National casinos
    { id: "emo_capsule", name: "Emo Capsule", kind: "gacha", icon: "🐰", rtp: 0.88, bets: BETS,
      desc: "이모 월드 캡슐머신",
      table: [{ m: 1.2, w: 24, c: "#f9a8d4", n: "핑크" }, { m: 2.5, w: 11, c: "#93c5fd", n: "블루" }, { m: 6, w: 3, c: "#fde047", n: "골드" }, { m: 20, w: 0.6, c: "#c084fc", n: "레인보우" }] },
    { id: "shape_wheel", name: "Shape Wheel", kind: "wheel", icon: "🔺", rtp: 0.89, bets: BETS,
      desc: "세모 네모 동글이 휠",
      table: [{ m: 1.2, w: 28 }, { m: 2, w: 13 }, { m: 4, w: 5 }, { m: 8, w: 1.6 }, { m: 20, w: 0.4 }] },
    { id: "ant_dig", name: "Ant Dig", kind: "pick", icon: "🐜", rtp: 0.87, bets: BETS,
      desc: "개미굴 5곳 중 하나를 파라! 꿀단지를 찾으면 당첨", n: 5, closed: "🕳️", prize: "🍯", miss: "🪨",
      table: [{ m: 3, w: 20 }, { m: 8, w: 2.5 }, { m: 30, w: 0.25 }] },
    { id: "ghost_scratch", name: "Ghost Scratch", kind: "scratch", icon: "👻", rtp: 0.88, bets: BETS,
      desc: "안개 속 스크래치. 유령 3개면 x40", syms: ["🕯️", "🦇", "🔮", "🎃", "👻"],
      table: [{ m: 1.2, w: 18, s: "🕯️" }, { m: 2, w: 10, s: "🦇" }, { m: 4, w: 4, s: "🔮" }, { m: 10, w: 1, s: "🎃" }, { m: 40, w: 0.15, s: "👻" }] },
    { id: "mj_coin_flip", name: "MJ Coin Flip", kind: "coinflip", icon: "🐱", rtp: 0.88, bets: BETS,
      desc: "앞? 뒤? 맞히면 x1.8",
      table: [{ m: 1.8, w: 47 }, { m: 10, w: 0.3, edge: true }] },
    { id: "dungtown_dice", name: "Dung Town Dice", kind: "dice", icon: "🏘️", rtp: 0.86, bets: BETS,
      desc: "동네 주사위 한 판!",
      table: [{ m: 1.5, w: 20, d: "sum7" }, { m: 2.5, w: 11, d: "double" }, { m: 6, w: 3, d: "highdouble" }, { m: 20, w: 0.6, d: "66" }] }
];

// ---------------- region maps: one generated game per map (data/regions.js)
const KIND_TABLE = {
    wheel: () => [{ m: 1.5, w: 26 }, { m: 2, w: 14 }, { m: 3, w: 7 }, { m: 5, w: 3 }, { m: 10, w: 1 }, { m: 25, w: 0.3 }],
    pick: g => g.n >= 5 ? [{ m: 3, w: 20 }, { m: 8, w: 2.5 }, { m: 30, w: 0.25 }] : g.n === 4 ? [{ m: 2, w: 26 }, { m: 4, w: 6 }, { m: 12, w: 1 }, { m: 40, w: 0.12 }] : [{ m: 2, w: 28 }, { m: 5, w: 4 }, { m: 25, w: 0.3 }],
    coinflip: () => [{ m: 1.9, w: 46 }, { m: 10, w: 0.35, edge: true }],
    dice: () => [{ m: 1.5, w: 20, d: "sum7" }, { m: 3, w: 10, d: "double" }, { m: 8, w: 2.5, d: "highdouble" }, { m: 30, w: 0.4, d: "66" }],
    hilo: () => [{ m: 1.9, w: 45 }, { m: 10, w: 0.3, joker: true }],
    scratch: g => [1.2, 2, 4, 10, 40].map((m, i) => ({ m, w: [18, 10, 4, 1, 0.15][i], s: g.syms[i] })),
    gacha: () => [{ m: 1, w: 26, c: "#8b5a2b", n: "브론즈" }, { m: 2, w: 13, c: "#cbd5e1", n: "실버" }, { m: 5, w: 3.5, c: "#facc15", n: "골드" }, { m: 15, w: 0.8, c: "#a78bfa", n: "퍼플" }, { m: 50, w: 0.15, c: "#f43f5e", n: "레전드" }],
    lottery: () => [{ m: 1, w: 22, k: 2 }, { m: 5, w: 3, k: 3 }, { m: 40, w: 0.2, k: 4 }, { m: 300, w: 0.008, k: 5 }]
};
for (const m of NEW_MAPS) for (const [i, c] of mapCasinos(m).entries()) {
    const id = casinoIdOf(m, i);
    // 6 rule regions: games topping out at x300 (lottery) → RTP 86~88%, all others 89.01~91.09% (fixed per game)
    const rtp = !RULE_REGIONS.includes(m.region) ? [0.86, 0.87, 0.88, 0.89][(m.id.length + i) % 4]
        : c.kind === "lottery" ? +(0.86 + seed01(id) * 0.02).toFixed(4) : +(0.8901 + seed01(id) * 0.0208).toFixed(4);
    const g = { id, name: c.name, kind: c.kind, icon: c.icon, rtp, bets: BETS, desc: c.desc, region: m.region };
    if (c.kind === "pick") Object.assign(g, { n: c.n, closed: c.closed, prize: c.prize, miss: c.miss });
    if (c.kind === "scratch") g.syms = c.syms;
    if (c.kind === "plinko") g.buckets = [25, 5, 2, 1.2, 0, 0, 0, 1.2, 2, 5, 25];
    else g.table = KIND_TABLE[c.kind](c);
    CASINO_GAMES.push(g);
}

// --------------------------------------------------------- RTP solving
// Roulette: each colour is solved separately (p = rtp / multiplier).
const ROULETTE = { red: 1.9, black: 1.9, green: 14 };

function withLose(g) {
    if (g._t) return g._t;
    let t;
    if (g.kind === "plinko") {
        // bucket weights: binomial-ish, then scaled so RTP matches
        const n = g.buckets.length, w = [];
        for (let i = 0; i < n; i++) w.push(binom(n - 1, i));
        // move mass between centre and edges until RTP ≈ target
        const ev = ws => ws.reduce((s, x, i) => s + x * g.buckets[i], 0) / ws.reduce((a, b) => a + b, 0);
        // RTP rises monotonically with k (mass pushed to the x25 edges) → bisect on log k
        const evK = k => ev(w.map((x, i) => x * Math.pow(k, Math.abs(i - (n - 1) / 2))));
        let lo = Math.log(0.01), hi = Math.log(100), k = 1;
        for (let it = 0; it < 80; it++) {
            const mid = (lo + hi) / 2; k = Math.exp(mid);
            const e = evK(k);
            if (Math.abs(e - g.rtp) < 0.00005) break;
            if (e > g.rtp) hi = mid; else lo = mid;
        }
        t = g.buckets.map((m, i) => ({ m, w: w[i] * Math.pow(k, Math.abs(i - (n - 1) / 2)), bucket: i }));
    } else {
        const sumW = g.table.reduce((s, e) => s + e.w, 0);
        const sumWM = g.table.reduce((s, e) => s + e.w * e.m, 0);
        const lose = Math.max(0, sumWM / g.rtp - sumW);
        t = [...g.table, { m: 0, w: lose, lose: true }];
    }
    g._t = t;
    return t;
}
function binom(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - i + 1) / i; return r; }

export function gameRtp(g) {
    if (g.kind === "roulette") return g.rtp;
    const t = withLose(g);
    const sw = t.reduce((s, e) => s + e.w, 0);
    return t.reduce((s, e) => s + e.w * e.m, 0) / sw;
}

function roll(t) {
    const sw = t.reduce((s, e) => s + e.w, 0);
    let r = Math.random() * sw;
    for (const e of t) { if ((r -= e.w) < 0) return e; }
    return t[t.length - 1];
}

// luck: { win: 0~0.3 } — on a loss, re-roll once (keep only a win) with
// chance win/(1-pWin) so the overall win chance rises by `win` (relative).
export function playCasino(g, bet, luck = {}, choice) {
    let entry;
    if (g.kind === "roulette") {
        const m = ROULETTE[choice] || 1.9;
        const p = g.rtp / m;
        const tryOnce = () => Math.random() < p ? { m, colour: choice } : { m: 0, lose: true };
        entry = tryOnce();
        if (entry.lose && luck.win > 0 && Math.random() < luck.win / (1 - p)) {
            const e2 = tryOnce(); if (!e2.lose) entry = { ...e2, lucky: true };
        }
    } else {
        const t = withLose(g);
        const sw = t.reduce((s, e) => s + e.w, 0);
        const pWin = t.filter(e => e.m > 0).reduce((s, e) => s + e.w, 0) / sw;
        entry = roll(t);
        if (entry.m === 0 && luck.win > 0 && Math.random() < luck.win / Math.max(0.05, 1 - pWin)) {
            const e2 = roll(t); if (e2.m > 0) entry = { ...e2, lucky: true };
        }
    }
    // 🃏 카지노게임 상금 UP item (30 s): a losing play turns into a win with up to 50% (low bet) … 20% (top bet)
    if (luck.boost && !(entry.m > 0) && Math.random() < boostChance(bet, g.bets)) {
        for (let k = 0; k < 200; k++) {
            const e2 = g.kind === "roulette" ? (Math.random() < g.rtp / (ROULETTE[choice] || 1.9) ? { m: ROULETTE[choice] || 1.9, colour: choice } : null) : roll(withLose(g));
            if (e2 && e2.m > 0) { entry = { ...e2, boosted: true }; break; }
        }
    }
    const payout = Math.min(CONFIG.CASINO_MAX_WIN, Math.round(bet * entry.m));
    let points = 0;
    if (Math.random() < CONFIG.CASINO_POINT_CHANCE) {
        // 1~10, low values more common
        const pw = [22, 18, 15, 12, 10, 8, 6, 4, 3, 2];
        points = 1 + roll(pw.map((w, i) => ({ w, m: i }))).m;
    }
    return { entry, mult: entry.m, payout, points };
}

export const CASINO_BY_ID = Object.fromEntries(CASINO_GAMES.map(g => [g.id, g]));

// The game's top prize multiplier — hitting it counts as the casino "JACKPOT".
export function topMult(g) {
    if (g.kind === "roulette") return ROULETTE.green ?? 14;
    if (g.kind === "plinko") return Math.max(...g.buckets);
    return Math.max(...(g.table || []).map(e => e.m));
}
