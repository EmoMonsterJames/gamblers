// RTP simulator (admin page). Spins a slot config many times with the
// real engine and splits the return into the part that scales with the
// pay scale `px` (line / ways wins, free spins) and the rest (hold coins,
// wheels, jackpots at their seed value) so a target RTP can be solved.
import { spin } from "./engine.js";

export async function simulate(cfg, { spins = 200000, bet = null, onProgress = null, alive = () => true } = {}) {
    bet ||= cfg.bets[Math.floor((cfg.bets.length - 1) / 2)];
    const pool = Object.fromEntries(Object.entries(cfg.jp || {}).filter(([, j]) => !j.x).map(([t, j]) => [t, j.seed]));
    let state = {}, wag = 0, ways = 0, other = 0, hits = 0, bonus = 0, n = 0;
    const feat = {};
    for (; n < spins; n++) {
        if (n % 4000 === 0) {
            await new Promise(r => setTimeout(r));
            if (!alive()) break;
            onProgress?.(n / spins);
        }
        const res = spin(cfg, { bet, state, luck: {}, pool });
        state = res.state;
        let w = res.base.win;
        for (const f of res.features) {
            feat[f.type] = (feat[f.type] || 0) + 1;
            if (f.scales || f.type === "free" || f.type === "grow") w += res.classic ? f.spins.reduce((s, x) => s + (x.sub ? 0 : x.win), 0) : f.total;
        }
        w = Math.min(w, res.total);
        wag += bet; ways += w; other += res.total - w;
        if (res.total > 0) hits++;
        if (res.bonus) bonus++;
    }
    return { spins: n, bet, rtp: (ways + other) / wag, ways: ways / wag, other: other / wag, hit: hits / n, bonusEvery: bonus ? n / bonus : 0, feat };
}

// pay scale that would give `target` RTP, from one simulation at `px`
export function solvePx(px, sim, target) {
    if (!(sim.ways > 0)) return null;
    return Math.max(0.05, px * (target - sim.other) / sim.ways);
}
