// P icons (points) on the reels — shared by every slot engine.
// Rare: about 1.5% of spins at the lowest bet, rising to about 5% at the
// highest bet, and higher bets also make 2~5 icons a little more likely.
//   count → points: 1=1P · 2=3P · 3=6P · 4=10P · 5=20P
export const P_POINTS = [0, 1, 3, 6, 10, 20];
export const POINT_BASE = 0.015;   // chance at the lowest bet
export const POINT_TOP = 0.05;     // chance at the highest bet

let curBet = null;
// the engines call this at the start of every spin
export function setPointBet(bet) { curBet = bet; }

// 0 (lowest bet) … 1 (highest bet) along the slot's own bet list
export function betLevel(cfg, bet = curBet) {
    const bets = cfg?.bets || [];
    if (bets.length < 2 || !bet) return 0;
    const lo = bets[0], hi = bets[bets.length - 1];
    if (bet <= lo) return 0;
    if (bet >= hi) return 1;
    return Math.log(bet / lo) / Math.log(hi / lo);
}
export const pointChance = (cfg, bet = curBet) => POINT_BASE + (POINT_TOP - POINT_BASE) * betLevel(cfg, bet);

// how many P icons this spin shows (0 = none); maxN 5 for video slots, 3 for classic
export function pointCount(cfg, rnd = Math.random, maxN = 5, bet = curBet) {
    if (cfg?.noPoints || rnd() >= pointChance(cfg, bet)) return 0;
    const t = betLevel(cfg, bet);
    const w = [[1, 70], [2, 20 * (1 + t)], [3, 7 * (1 + 1.5 * t)], [4, 2.4 * (1 + 2 * t)], [5, 0.6 * (1 + 2 * t)]].filter(([n]) => n <= maxN);
    let r = rnd() * w.reduce((s, [, x]) => s + x, 0);
    for (const [n, x] of w) if ((r -= x) <= 0) return n;
    return 1;
}
