// ================================================================ 📊 랭킹 (next to 🏆 명예의 전당)
//   Top 10 boards: 전적 · 이모몬스터 보유 · 희귀 이모몬스터 · 비디오 콜렉터 · 희귀 비디오 콜렉터
//   video boards can be narrowed to one genre · rare boards rank by the highest ★ first (★7 count, then ★6, …)
import { h } from "../core/util.js";
import { Store } from "../core/store.js";
import { avatar, displayName } from "../ui/profile.js";
import { GENRES, GENRE_EMOJI, movieById } from "../data/vhs.js";
import { loadCatalog, species } from "../emomon/data.js";

const TOP = 10;
const BOARDS = [
    ["record", "🏅 전적"],
    ["emo", "🐾 이모몬스터 보유"],
    ["emoRare", "💎 희귀 이모몬스터"],
    ["vhs", "📼 비디오 콜렉터"],
    ["vhsRare", "🌟 희귀 비디오 콜렉터"]
];
const players = () => Store.allPlayers?.length ? Store.allPlayers : Store.players;

// ---------------------------------------------------------------- data per player
// EmoMon now owned: the running season's bag if the player is in it, otherwise what they carry between seasons
const monsOf = pid => Store.season?.ps?.[pid]?.emo?.mons || Store.stash?.[pid]?.emo?.mons || [];
const monStar = m => species(m.sid)?.rarity || 1;
const videosOf = (pid, genre) => (Store.vhs?.own?.[pid] || [])
    .map(x => x.m || movieById(x.id)).filter(Boolean)
    .filter(m => !genre || (m.genres || []).includes(genre));
// counts by ★ from the top → [[★, n], …] (only ★ that the player has)
const starCounts = (list, starOf, max) => {
    const c = {};
    for (const x of list) { const s = starOf(x); c[s] = (c[s] || 0) + 1; }
    return Array.from({ length: max }, (_, i) => max - i).filter(s => c[s]).map(s => [s, c[s]]);
};
// compare two star-count lists: more of the highest ★ wins
const byStars = (a, b) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i] || [0, 0], y = b[i] || [0, 0];
        if (x[0] !== y[0]) return y[0] - x[0];
        if (x[1] !== y[1]) return y[1] - x[1];
    }
    return 0;
};
const starsText = list => list.slice(0, 3).map(([s, n]) => `★${s} ×${n}`).join(" · ");

// ---------------------------------------------------------------- tie-break (동점자)
//   1. the one who first appeared in a season earlier ranks higher
//   2. same first season → the one higher on the 🏅 전적 board ranks higher
const firstSeason = pid => {
    const ss = Store.results.filter(r => r.playerId === pid).map(r => r.season);
    if ((Store.season?.roster || []).map(Number).includes(+pid)) ss.push(Store.season.number);
    return ss.length ? Math.min(...ss) : Infinity;
};
const byRecord = (a, b) => b.r.wins - a.r.wins || a.r.avg - b.r.avg || b.r.seasons - a.r.seasons;
function tieBreaker() {
    const recs = players().map(p => ({ p, r: Store.record(p.id) }));
    const order = new Map(recs.filter(x => x.r.seasons).sort(byRecord).map((x, i) => [x.p.id, i]));
    const first = new Map(recs.map(x => [x.p.id, firstSeason(x.p.id)]));
    const f = id => first.get(id) ?? Infinity, o = id => order.get(id) ?? Infinity;
    return (a, b) => (f(a.p.id) - f(b.p.id) || 0) || (o(a.p.id) - o(b.p.id) || 0) || a.p.id - b.p.id;
}

function rows(board, genre) {
    const ps = players(), tie = tieBreaker();
    if (board === "record") return ps.map(p => ({ p, r: Store.record(p.id) })).filter(x => x.r.seasons)
        .sort((a, b) => byRecord(a, b) || tie(a, b))
        .map(x => ({ p: x.p, main: x.r.wins ? `👑 ${x.r.wins}회 우승` : `평균 ${x.r.avg.toFixed(1)}위`, sub: `평균 ${x.r.avg.toFixed(1)}위 · 시즌 ${x.r.seasons}회 출연` }));
    if (board === "emo") return ps.map(p => ({ p, n: monsOf(p.id).length })).filter(x => x.n)
        .sort((a, b) => b.n - a.n || tie(a, b)).map(x => ({ p: x.p, main: `${x.n}마리`, sub: starsText(starCounts(monsOf(x.p.id), monStar, 6)) }));
    if (board === "emoRare") return ps.map(p => ({ p, c: starCounts(monsOf(p.id), monStar, 6) })).filter(x => x.c.length)
        .sort((a, b) => byStars(a.c, b.c) || tie(a, b)).map(x => ({ p: x.p, main: `★${x.c[0][0]} ×${x.c[0][1]}`, sub: starsText(x.c) }));
    if (board === "vhs") return ps.map(p => ({ p, v: videosOf(p.id, genre) })).filter(x => x.v.length)
        .sort((a, b) => b.v.length - a.v.length || tie(a, b)).map(x => ({ p: x.p, main: `${x.v.length}개`, sub: starsText(starCounts(x.v, m => m.stars || 1, 7)) }));
    if (board === "vhsRare") return ps.map(p => ({ p, c: starCounts(videosOf(p.id, genre), m => m.stars || 1, 7) })).filter(x => x.c.length)
        .sort((a, b) => byStars(a.c, b.c) || tie(a, b)).map(x => ({ p: x.p, main: `★${x.c[0][0]} ×${x.c[0][1]}`, sub: starsText(x.c) }));
    return [];
}
// every place is its own (ties are already broken above)
const placed = list => list.map((x, i) => ({ ...x, place: i + 1 }));

// ---------------------------------------------------------------- page
export function rankingPage() {
    let board = "record", genre = null;
    const tabs = h("div.tabs.rk-tabs"), chips = h("div.rk-genres"), list = h("div.rk-list");
    const medal = n => n === 1 ? "🥇" : n === 2 ? "🥈" : n === 3 ? "🥉" : n;
    const draw = () => {
        tabs.replaceChildren(...BOARDS.map(([id, label]) => h("button.tab" + (id === board ? ".on" : ""), { onclick: () => { board = id; draw(); } }, label)));
        const video = board === "vhs" || board === "vhsRare";
        chips.replaceChildren(...(video ? [null, ...GENRES].map(g => h("button.rk-chip" + (g === genre ? ".on" : ""), { onclick: () => { genre = g; draw(); } }, g ? `${GENRE_EMOJI[g]} ${g}` : "🎞️ 전체")) : []));
        const top = placed(rows(board, video ? genre : null)).slice(0, TOP);
        list.replaceChildren(top.length ? h("ol.rk-board", top.map(x => h("li.rk-row" + (x.place <= 3 ? ".rk-p" + x.place : ""),
            h("span.rk-place", medal(x.place)),
            avatar(x.p.id, 44),
            h("div.rk-name", h("b", displayName(x.p)), h("small", x.p.player_name || "")),
            h("div.rk-score", h("b", x.main), x.sub ? h("small", x.sub) : null))))
            : h("div.center-card", h("p.muted", video && genre ? `아직 ${genre} 비디오를 가진 플레이어가 없습니다.` : "아직 순위에 오른 플레이어가 없습니다.")));
    };
    draw();
    // EmoMon ★ needs the monster catalog (the synced snapshot — loaded once, then cached)
    loadCatalog().then(() => { if (board.startsWith("emo")) draw(); }).catch(() => {});
    return h("div.page.ranking",
        h("div.row.between", h("h2.page-title", "📊 랭킹"), h("a.btn.ghost", { href: "#/hall" }, "🏆 명예의 전당 보기")),
        h("p.muted.small", "Top 10 · 희귀 순위는 가장 높은 ★을 가장 많이 가진 순서 (같으면 다음 ★으로 비교) · 동점이면 먼저 시즌에 출연한 사람 → 같은 시즌이면 전적이 높은 사람이 위"),
        tabs, chips, list);
}
