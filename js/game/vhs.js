// ================================================================ 📼 동행 — VHS shops on every map · VHS Collection · 🎬 영화관
//   • every map has its own VHS map (3~10 shops on 1~3 roads from the player's start; legs of 10/20/40 s) — fixed per map and season
//   • one shop a round: walking there uses play time (the sum of the legs), then the shop's door rule decides
//   • bought videos go to the player's VHS Collection (Store.vhs.own — kept across seasons, as a snapshot of the movie)
//   • a video above the player's age needs a VHS 띠 이용권 (used up) before its cover can be looked at / bought / watched
//   • 🎬 영화관 (under 💰 Money): 2 showings a season → the viewer and every actor in the running season get paid
import { Store } from "../core/store.js";
import { S, log, name } from "./season.js";
import { LOC_BY_ID, LOCATIONS } from "../data/catalog.js";
import { belongsTo } from "./nation.js";
import { SHOP_KINDS, SHOP_BY_ID, RATING_BY_ID, ageIndex, seeded, allMovies, fitsShop, titleText, buyPriceOf, coverFeeOf, bodyCountOf } from "../data/vhs.js";

const ps_ = pid => S()?.ps?.[pid];
const round = () => S()?.round || 0;
export const LEG_SECONDS = [10, 10, 10, 20, 20, 40];
export const CINEMA_PER_SEASON = 2;
// the viewer's pay: 5,000G (★1 rarity · ★7 quality) … 100,000G (★7 rarity · ★1 quality) — rarer and worse films pay more
export const VIEWER_PAY = [5000, 100000];
export function viewerPay(m) {
    const s = ((Math.min(7, Math.max(1, m.stars || 1)) - 1) + (7 - Math.min(7, Math.max(1, m.quality || 7)))) / 12;
    return Math.round((VIEWER_PAY[0] + s * (VIEWER_PAY[1] - VIEWER_PAY[0])) / 1000) * 1000;
}
export const ACTOR_PAY = { lead: [1000, 10000], support: [500, 5000], extra: [100, 500] };
// 🔞 💋 💀 extra pay for what the role asked of the actor (added on top of the part's pay)
export const ROLE_BONUS = { nude: 5000, sexy: 3000, body: 2000 };
export const PART_KO = { lead: "주연", support: "조연", extra: "엑스트라" };
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// ---------------------------------------------------------------- 🗺️ the VHS map of a location
//   nodes: { n (1…), kind, name, sec (this leg), from (node index or -1 = start), road, step, total (s from the start) }
export function vhsMap(locId) {
    const s = S();
    const r = seeded(`vhs-map-${s?.number || 0}-${locId}`);
    const count = 3 + Math.floor(r() * 8);                  // 3 … 10 shops
    const roads = Math.min(count, 1 + Math.floor(r() * 3));  // 1 … 3 roads
    const kinds = [...SHOP_KINDS].sort(() => r() - 0.5);
    const used = {};
    const nodes = [];
    const ends = Array.from({ length: roads }, () => -1);
    for (let i = 0; i < count; i++) {
        const road = i < roads ? i : Math.floor(r() * roads);
        const k = kinds[i % kinds.length];
        used[k.id] = (used[k.id] || 0) + 1;
        const sec = LEG_SECONDS[Math.floor(r() * LEG_SECONDS.length)];
        const from = ends[road];
        const total = (from >= 0 ? nodes[from].total : 0) + sec;
        const step = from >= 0 ? nodes[from].step + 1 : 1;
        nodes.push({ i, n: i + 1, kind: k.id, name: k.name + (used[k.id] > 1 ? ` ${used[k.id]}` : ""), sec, from, road, step, total });
        ends[road] = i;
    }
    // numbers follow the roads (road 1 first), like 1 → 2 → 4 / 3 → 6 …
    const order = [...nodes].sort((a, b) => a.step - b.step || a.road - b.road);
    order.forEach((x, j) => { x.n = j + 1; });
    return { locId, nodes, roads };
}
export const pathTo = (map, i) => { const out = []; for (let x = map.nodes[i]; x; x = x.from >= 0 ? map.nodes[x.from] : null) out.unshift(x); return out; };

// ---------------------------------------------------------------- 🚪 visiting (one shop a round)
export const visitOf = pid => { const v = ps_(pid)?.vhsVisit; return v && v.round === round() ? v : null; };
export const visitedThisRound = pid => !!visitOf(pid);
// walk there: play time goes down by the whole way (the turn clock) · returns { ok, node, kind, need: battle? }
export function goTo(pid, locId, i, turn) {
    if (visitedThisRound(pid)) return { ok: false, why: "비디오 가게는 라운드당 1곳만 선택해서 들어갈 수 있습니다" };
    const map = vhsMap(locId), node = map.nodes[i];
    if (!node) return { ok: false, why: "가게를 찾을 수 없습니다" };
    if (turn && turn.remaining < node.total) return { ok: false, why: `플레이 시간이 부족합니다 (${node.total}초 필요)` };
    const k = SHOP_BY_ID[node.kind];
    const ps = ps_(pid);
    if (k.gear && !(ps.items?.[k.gear] > 0)) return { ok: false, why: `${{ wings: "🪽 날개", oxygen: "🤿 산소통", space_suit: "🧑‍🚀 우주복" }[k.gear]}가 필요합니다` };
    if (k.fee && (ps.money || 0) < k.fee) return { ok: false, why: `입장료 ${k.fee.toLocaleString()}G가 부족합니다` };
    if (k.feePts && (ps.points || 0) < k.feePts) return { ok: false, why: `입장료 ${k.feePts}P가 부족합니다` };
    if (turn) turn.remaining -= node.total;
    ps.vhsVisit = { round: round(), loc: locId, i, status: "walk", unlocked: [] };
    log(`📼 ${name(pid)} 동행 → ${node.n}. ${node.name} (${node.total}초)`);
    Store.saveSeason(true);
    return { ok: true, node, kind: k };
}
// at the door: gear / fee / random / resident · battle is decided by the screen (settleBattle)
export function knock(pid) {
    const v = visitOf(pid);
    if (!v || v.status !== "walk") return { ok: false, why: "가게 앞이 아닙니다" };
    const node = vhsMap(v.loc).nodes[v.i], k = SHOP_BY_ID[node.kind], ps = ps_(pid);
    if (k.battle) return { ok: true, battle: true };
    let ok = true, why = "";
    if (k.gear) { ps.items[k.gear] = Math.max(0, (ps.items[k.gear] || 0) - 1); why = "장비 1개 사용"; }
    if (k.fee) { ps.money -= k.fee; why = `입장료 ${k.fee.toLocaleString()}G`; }
    if (k.feePts) { ps.points -= k.feePts; why = `입장료 ${k.feePts}P`; }
    if (k.resident && belongsTo(pid, k.nation)) why = `${k.nation} 시민권자 · 영주권자 바로 입장`;
    else if (k.chance) { ok = Math.random() < k.chance; why = ok ? `입장 승인 (${Math.round(k.chance * 100)}%)` : `입장 거절 (${Math.round(k.chance * 100)}%)`; }
    v.status = ok ? "in" : "no";
    log(`📼 ${name(pid)} ${node.name} ${ok ? "입장" : "입장 거절"} · ${why}`);
    Store.saveSeason(true);
    return { ok: true, in: ok, why };
}
export function settleBattle(pid, won) {
    const v = visitOf(pid);
    if (!v) return;
    v.status = won ? "in" : "no";
    log(`📼 ${name(pid)} Battle VHS 배틀 ${won ? "승리 → 입장" : "패배 → 입장 실패"}`);
    Store.saveSeason(true);
}
// ---------------------------------------------------------------- 📦 where the videos are stocked (fixed for a season)
//   a movie with stock { maps, shops }: `maps` maps are drawn at random, then up to `shops` shops among them that may
//   carry it (the shop's genre / nation / rarity / LGBTQ rule — fitsShop) — if there are fewer such shops, only those get it
const shuffle = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let planCache = null, planKey = "";
export function stockPlan() {
    const n = S()?.number || 0, movies = allMovies().filter(m => m.stock);
    const key = `${n}|${movies.map(m => `${m.id}:${m.stock.maps}/${m.stock.shops}:${m.genres}:${m.nation}:${m.stars}`).join(",")}`;
    if (planCache && key === planKey) return planCache;
    const at = new Map(), count = {};   // "loc#i" → [movie ids] · movie id → { maps, shops }
    for (const m of movies) {
        const r = seeded(`vhs-stock-${n}-${m.id}`);
        const maps = shuffle(LOCATIONS.map(l => l.id), r).slice(0, m.stock.maps);
        const spots = [];
        for (const loc of maps) vhsMap(loc).nodes.forEach((x, i) => { if (fitsShop(m, SHOP_BY_ID[x.kind])) spots.push(`${loc}#${i}`); });
        const put = shuffle(spots, r).slice(0, m.stock.shops);
        for (const s of put) { if (!at.has(s)) at.set(s, []); at.get(s).push(m.id); }
        count[m.id] = { maps: new Set(put.map(s => s.split("#")[0])).size, shops: put.length, room: spots.length };
    }
    planCache = { at, count }; planKey = key;
    return planCache;
}
// the shelf: the stocked videos placed in this shop + (movies without a stock plan) up to 8 that fit the shop, changing every round
export function shelf(locId, i) {
    const node = vhsMap(locId).nodes[i], k = SHOP_BY_ID[node.kind];
    const placed = new Set(stockPlan().at.get(`${locId}#${i}`) || []);
    const mine = allMovies().filter(m => placed.has(m.id) && fitsShop(m, k));
    const fit = allMovies().filter(m => !m.stock && fitsShop(m, k));
    const r = seeded(`vhs-shelf-${S()?.number}-${round()}-${locId}-${i}`);
    return [...mine, ...shuffle(fit, r)].slice(0, Math.max(8, mine.length));
}

// ---------------------------------------------------------------- 🔞 age (띠)
export const passId = ratingId => "vhs_pass_" + ratingId;
export const ageOk = (pid, m) => ageIndex(Store.player(pid)?.age_group) >= (RATING_BY_ID[m.rating]?.age || 0);
export const unlocked = (pid, m) => ageOk(pid, m) || (visitOf(pid)?.unlocked || []).includes(m.id);
export const passCount = (pid, m) => ps_(pid)?.items?.[passId(m.rating)] || 0;
// use one VHS 띠 이용권 for this video (shop: until the round ends · cinema: this showing)
export function usePass(pid, m, where = "shop") {
    const ps = ps_(pid), id = passId(m.rating);
    if (!(ps.items?.[id] > 0)) return { ok: false, why: `VHS ${RATING_BY_ID[m.rating]?.name} 이용권이 없습니다 (일반 상점에서 판매)` };
    ps.items[id]--;
    if (where === "shop") { const v = visitOf(pid); if (v) (v.unlocked ||= []).push(m.id); }
    log(`📼 ${name(pid)} VHS ${RATING_BY_ID[m.rating]?.name} 이용권 사용 (${m.ko})`);
    Store.saveSeason(true);
    return { ok: true };
}

// ---------------------------------------------------------------- 🛒 buy → VHS Collection
export const priceOf = m => buyPriceOf(m);
export const coverFee = m => coverFeeOf(m);
export const collection = pid => (Store.vhs?.own?.[pid] || []);
export const owns = (pid, id) => collection(pid).some(x => x.id === id);
// 📼 pulling a video's cover off the shelf costs a fee (once a visit per video · free for a video the player already owns)
export const coverPaid = (pid, m) => owns(pid, m.id) || (visitOf(pid)?.pulled || []).includes(m.id);
export function payCover(pid, m) {
    const v = visitOf(pid), ps = ps_(pid), fee = coverFee(m);
    if (!v || v.status !== "in") return { ok: false, why: "비디오 가게 안에서만 꺼낼 수 있습니다" };
    if (coverPaid(pid, m)) return { ok: true, fee: 0 };
    if ((ps.money || 0) < fee) return { ok: false, why: `골드가 부족합니다 (표지 꺼내기 ${fee.toLocaleString()}G)` };
    ps.money -= fee;
    (v.pulled ||= []).push(m.id);
    log(`📼 ${name(pid)} 비디오 표지 꺼내기: ${titleText(m)} (${fee.toLocaleString()}G)`);
    Store.saveSeason(true);
    return { ok: true, fee };
}
export function buy(pid, m) {
    const v = visitOf(pid), ps = ps_(pid), price = priceOf(m);
    if (!v || v.status !== "in") return { ok: false, why: "비디오 가게 안에서만 살 수 있습니다" };
    if (!unlocked(pid, m)) return { ok: false, why: "연령 제한 비디오입니다 — VHS 띠 이용권이 필요합니다" };
    if (owns(pid, m.id)) return { ok: false, why: "이미 VHS Collection에 있는 비디오입니다" };
    if ((ps.money || 0) < price) return { ok: false, why: `골드가 부족합니다 (${price.toLocaleString()}G)` };
    ps.money -= price;
    Store.vhs ||= { own: {}, movies: [] };
    (Store.vhs.own[pid] ||= []).push({ id: m.id, at: new Date().toISOString(), season: S()?.number || 0, m: structuredClone(m) });
    log(`📼 ${name(pid)} 비디오 구입: ${titleText(m)} (${price.toLocaleString()}G)`);
    Store.saveSeason(true);
    Store.saveKey("vhs");
    return { ok: true, price };
}

// ---------------------------------------------------------------- 🎬 영화관
export const cinemaLeft = pid => Math.max(0, CINEMA_PER_SEASON - (ps_(pid)?.cinemaN || 0));
// the money, decided before the film starts (the show can't lose it) · actors outside the running season get it in their 👛 wallet
export function cinemaPay(pid, m) {
    const ps = ps_(pid);
    if (cinemaLeft(pid) <= 0) return { ok: false, why: `영화관은 시즌당 ${CINEMA_PER_SEASON}회까지입니다` };
    if (!owns(pid, m.id)) return { ok: false, why: "VHS Collection에 있는 비디오만 재생할 수 있습니다" };
    ps.cinemaN = (ps.cinemaN || 0) + 1;
    const viewer = viewerPay(m);
    ps.money += viewer;
    const roster = new Set((S()?.roster || []).map(Number));
    let toWallet = false;
    const dead = new Set(bodyCountOf(m));
    const actors = m.cast.map(c => {
        const [a, b] = ACTOR_PAY[c.part] || ACTOR_PAY.extra;
        // 🔞 Nudity · 💋 Sexy · 💀 Body Count roles get extra pay
        const bonus = { nude: c.nude ? ROLE_BONUS.nude : 0, sexy: c.sexy ? ROLE_BONUS.sexy : 0, body: dead.has(c) ? ROLE_BONUS.body : 0 };
        const base = Math.round(rint(a, b) / 100) * 100;
        const pay = base + bonus.nude + bonus.sexy + bonus.body;
        c = { ...c, base, bonus };
        const aps = c.pid != null && roster.has(+c.pid) ? ps_(c.pid) : null;
        if (aps) { aps.money += pay; return { ...c, pay, here: true }; }
        // 👛 not in this season → kept in the player's wallet, added when they join a season
        if (c.pid != null && Store.player(c.pid)) { Store.wallets ||= {}; Store.wallets[c.pid] = (Store.wallets[c.pid] || 0) + pay; toWallet = true; return { ...c, pay, wallet: true }; }
        return { ...c, pay: 0 };
    });
    if (toWallet) Store.saveWallets?.();
    log(`🎬 ${name(pid)} 영화관 상영: ${titleText(m)} → 관람 보상 ${viewer.toLocaleString()}G · 출연 배우 ${actors.filter(a => a.pay).length}명 보상`);
    Store.saveSeason(true);
    return { ok: true, viewer, actors };
}
export const locName = id => LOC_BY_ID[id]?.name || id;
