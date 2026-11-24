// =====================================================================
// ✨ 특수 시즌 — a season whose 20 players are drawn from one theme pool.
// 전담자 D / J is drawn when each player joins. "(남/녀 각각 10명)" types also need 10 male / 10 female,
// and the two-team types (Veterans vs. Newbies · Rich vs Poor) need 10 of each team.
// The whole roster is drawn up front (an exact quota solver), so a type is only offered when
// a full valid roster exists; SPIN in the selection stage then reveals it one player at a time.
// =====================================================================
import { Store } from "../core/store.js";
import { JACKPOT_RANK } from "../data/catalog.js";

const N = 20, HALF = 10;
const low = s => String(s || "").trim().toLowerCase();
const normC = c => low(c).replace(/[^a-z]/g, "").replace(/^emworld$/, "emoworld");
const normJob = j => low(j).replace(/[^a-z0-9]/g, "").replace(/hygh/g, "hyhg"); // "HYGH Corp." = "HYHG Corp."
const gRaw = p => low(p?.gender);
// same as season.js selGender: fluid / trans count as male for the 10 / 10 split
const sGender = p => { const g = gRaw(p); return !g ? null : g === "female" ? "female" : "male"; };
const transCurious = p => /^trans?-?curious$/.test(low(p?.preference).replace(/\s+/g, "")); // "Trans-Curious" · "Tran-Curious"
export const isLindaJones = p => +p?.id === 275 || /linda\s*jones|린다\s*존스/i.test(`${p?.player_name || ""} ${p?.name_ko || ""}`);

// ---- history from earlier seasons
const ranksOf = pid => (Store.results || []).filter(r => +r.playerId === +pid && r.season !== Store.season?.number).map(r => +r.rank);
const hadRank = (p, ok) => ranksOf(p.id).some(ok);
const isNewbie = p => !(Store.results || []).some(r => +r.playerId === +p.id);
const BIG_JP = t => (JACKPOT_RANK[t] || 0) >= JACKPOT_RANK.MAXI;
// slot jackpots of MAXI or more: { MAXI: 2, MAJOR: 1, … } (prevOnly: earlier seasons only)
export function bigJackpots(pid, prevOnly = false) {
    const cur = Store.season?.number, out = {};
    for (const r of Store.jpLog || []) {
        if (+r.playerId !== +pid || !BIG_JP(r.tier)) continue;
        if (prevOnly && (r.season == null || r.season === cur)) continue;
        out[r.tier] = (out[r.tier] || 0) + 1;
    }
    return out;
}

// ---- Rich vs Poor jobs
const RICH_JOBS = ["Actress", "Actor", "Ant Tech Secretary", "Arizal Tech Employee", "Arizal Tech HR Team", "Cloud Tech Employee", "Entertainer",
    "General Motors Accounting Team", "General Motors Employee", "General Motors HR Team", "General Motors Secretary", "Hip Hop Artist", "HYGH Corp. Clerk",
    "HYHG Corp. Employee", "HYHG Corp. Secretary", "HYHG Corp. Business Team", "HYHG Film Designer", "HYHG Films Photographer", "Kkomeal CEO", "Poly Tech Accounting Team",
    "Poly Tech Engineer", "Poly Tech Marketing Team", "Poly Tech Secretary", "Robot Rabbit Call Center Entrepreneur", "Stock Investor", "Watcher 8"];
const POOR_JOBS = ["Best Tteogui Cleaner", "Bong Bong 3D Worker", "Bong Bong Dung Sweeper", "Burger Shop Cleaner", "Erickson Cleaner", "Grilled Carrot Cleaner",
    "Ground Cafe Cleaner", "Invisible Juice Cleaner", "Jobless", "Marshall Tea Cleaner", "Poly Cafe Cleaner", "Pusunggui Seller", "Rice Tower Delivery", "Robot Call Center Cleaner",
    "Robot Call Center Agent", "Run Run Call Center Agent", "Run-Run Part-Time Delivery", "Run-Run Delivery", "Statute Part-Timer", "Transparent Juice Cleaner", "Voluntary Work Part-Timer", "Voluntary Worker"];
const RICH = new Set(RICH_JOBS.map(normJob)), POOR = new Set(POOR_JOBS.map(normJob));
export const wealthOf = p => RICH.has(normJob(p?.job)) ? "Rich" : POOR.has(normJob(p?.job)) ? "Poor" : null;

// ---- the 17 types
// pool: who may be drawn · mf: 10 male / 10 female · team: two groups of 10 (p → "A" | "B" | null)
const country = c => ({ pool: p => normC(p.country) === normC(c), mf: true, desc: `국적이 ${c}인 플레이어만 (남/녀 각각 10명)` });
export const SPECIAL_SEASONS = [
    { id: "dungi", emoji: "🐰", name: "Dungi", desc: "종족이 Dungi인 여성 플레이어 (린다존스도 참가) · 나이 · 성향 자유", pool: p => (low(p.ethnicity) === "dungi" || isLindaJones(p)) && gRaw(p) === "female" },
    { id: "female", emoji: "♀️", name: "Female", desc: "여성 플레이어 (성별이 남성이지만 성향이 Trans-Curious인 플레이어 포함)", pool: p => gRaw(p) === "female" || (gRaw(p) === "male" && transCurious(p)) },
    { id: "male", emoji: "♂️", name: "Male", desc: "남성 플레이어 (성별이 여성이지만 성향이 Trans-Curious인 플레이어 포함)", pool: p => gRaw(p) === "male" || (gRaw(p) === "female" && transCurious(p)) },
    { id: "emo_world", emoji: "🌍", name: "Emo World", ...country("Emo World") },
    { id: "mj_world", emoji: "🌍", name: "MJ World", ...country("MJ World") },
    { id: "foggy_nation", emoji: "🌫️", name: "Foggy Nation", ...country("Foggy Nation") },
    { id: "ground_town", emoji: "🐜", name: "Ground Town", ...country("Ground Town") },
    { id: "dung_town", emoji: "💩", name: "Dung Town", ...country("Dung Town") },
    { id: "polynesia", emoji: "🔷", name: "Polynesia", ...country("Polynesia") },
    { id: "bottom_top", emoji: "🧗", name: "Bottom to the Top", desc: "예전 시즌에서 20위를 한 적이 있는 플레이어 (남/녀 각각 10명)", mf: true, pool: p => hadRank(p, r => r === 20) },
    { id: "second_chance", emoji: "🥈", name: "Second Chance", desc: "예전 시즌에서 2위를 한 적이 있는 플레이어 (남/녀 각각 10명)", mf: true, pool: p => hadRank(p, r => r === 2) },
    { id: "best_of_best", emoji: "👑", name: "The Best of the Best", desc: "예전 시즌에서 우승한 적이 있는 플레이어 (남/녀 각각 10명)", mf: true, pool: p => hadRank(p, r => r === 1) },
    { id: "top10", emoji: "🔟", name: "Top 10 Pandemonium", desc: "예전 시즌에서 10위 안에 든 적이 있는 플레이어 (남/녀 각각 10명)", mf: true, pool: p => hadRank(p, r => r >= 1 && r <= 10) },
    { id: "top6", emoji: "6️⃣", name: "Top 6 Pandemonium", desc: "예전 시즌에서 6위 안에 든 적이 있는 플레이어 (남/녀 각각 10명)", mf: true, pool: p => hadRank(p, r => r >= 1 && r <= 6) },
    { id: "true_gamblers", emoji: "🎰", name: "True Gamblers", desc: "예전 시즌에서 슬롯으로 MAXI 이상 잭팟을 터뜨린 적이 있는 플레이어 (남/녀 각각 10명)", mf: true, pool: p => Object.keys(bigJackpots(p.id, true)).length > 0 },
    { id: "vets_newbies", emoji: "🆚", name: "Veterans vs. Newbies", desc: "Top 6 경력자 10명 + 처음 참가하는 플레이어 10명 (남/녀 각각 10명)", mf: true,
        team: p => hadRank(p, r => r >= 1 && r <= 6) ? "Veteran" : isNewbie(p) ? "New" : null, teams: ["Veteran", "New"] },
    { id: "rich_poor", emoji: "💰", name: "Rich vs Poor", desc: "직업 기준 Rich 10명 + Poor 10명 (남/녀 각각 10명)", mf: true, team: wealthOf, teams: ["Rich", "Poor"] }
];
export const SPECIAL_BY_ID = Object.fromEntries(SPECIAL_SEASONS.map(t => [t.id, t]));

// ---- exact quota solver: players are grouped into cells (handler × gender × team); a DFS picks how many come
// from each cell so that every quota is met, trying counts in random order (so every valid roster can come up).
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function candidates(t, players = Store.players) {
    return players.filter(p => !p._test && (!t.mf || sGender(p)) && (!t.team || t.team(p)) && (!t.pool || t.pool(p)));
}
export function solveSpecial(t, players = Store.players) {
    const pool = candidates(t, players);
    const dims = []; // 🧑‍💼 전담자 is drawn per season on join (season.js assignHandler), not a quota here
    if (t.mf) dims.push(["g", sGender, ["male", "female"]]);
    if (t.team) dims.push(["t", t.team, t.teams]);
    const cells = new Map();
    for (const p of pool) { const vals = dims.map(([, f]) => f(p)), k = vals.join("|"); if (!cells.has(k)) cells.set(k, { vals, ps: [] }); cells.get(k).ps.push(p); }
    const list = shuffle([...cells.values()]);
    // suffix capacity per dim value → prune branches that can no longer reach a quota
    const suf = list.map(() => ({}));
    for (let i = list.length - 1; i >= 0; i--) {
        const s = { ...(suf[i + 1] || {}) };
        list[i].vals.forEach((v, d) => { s[d + v] = (s[d + v] || 0) + list[i].ps.length; });
        suf[i] = s;
    }
    const cnt = {}, take = new Array(list.length).fill(0);
    let steps = 0;
    const ok = i => dims.every(([, , vals], d) => vals.every(v => (cnt[d + v] || 0) + (suf[i]?.[d + v] || 0) >= HALF));
    function dfs(i, total) {
        if (++steps > 200000) return false;
        if (total === N) return dims.every(([, , vals], d) => vals.every(v => (cnt[d + v] || 0) === HALF));
        if (i >= list.length || !ok(i)) return false;
        const c = list[i], room = Math.min(c.ps.length, N - total, ...c.vals.map((v, d) => HALF - (cnt[d + v] || 0)));
        for (const n of shuffle(Array.from({ length: room + 1 }, (_, k) => k))) {
            c.vals.forEach((v, d) => { cnt[d + v] = (cnt[d + v] || 0) + n; });
            take[i] = n;
            if (dfs(i + 1, total + n)) return true;
            c.vals.forEach((v, d) => { cnt[d + v] -= n; });
            take[i] = 0;
        }
        return false;
    }
    if (pool.length < N || !dfs(0, 0)) return null;
    return list.flatMap((c, i) => shuffle([...c.ps]).slice(0, take[i]).map(p => p.id));
}
// can this type start right now? { ok, plan, pool, why }
export function specialStatus(t) {
    const pool = candidates(t);
    const plan = pool.length >= N ? solveSpecial(t) : null;
    if (plan) return { ok: true, plan, pool: pool.length };
    const need = [t.mf ? `남 ${HALF} · 여 ${HALF}` : null, t.team ? t.teams.map(x => `${x} ${HALF}`).join(" · ") : null].filter(Boolean).join(" / ");
    return { ok: false, plan: null, pool: pool.length, why: pool.length < N ? `대상 플레이어 ${pool.length}명 (20명 필요)` : `대상 ${pool.length}명이지만 인원 조건(${need})을 채울 수 없음` };
}

// ---- in the running season
export const specialOf = (s = Store.season) => s?.special ? SPECIAL_BY_ID[s.special.id] || null : null;
export const seasonTitle = s => s?.special ? `시즌 ${s.number}: ${s.special.name}` : `시즌 ${s?.number ?? ""}`;
export const seasonTitleEn = s => s?.special ? `SEASON ${s.number}: ${s.special.name}` : `SEASON ${s?.number ?? ""}`;
// team tag fixed when the season was drawn (Veteran / New · Rich / Poor)
export function makeTags(t, ids) {
    if (!t.team) return null;
    return Object.fromEntries(ids.map(id => [id, t.team(Store.player(id))]));
}
// badges shown in the player info: [text, css class]
export function specialBadges(pid, s = Store.season) {
    if (!s?.special || !(s.roster || []).includes(+pid)) return [];
    const id = s.special.id, tag = s.special.tags?.[pid];
    if (id === "true_gamblers") {
        const jp = bigJackpots(pid);
        const order = Object.keys(jp).sort((a, b) => (JACKPOT_RANK[b] || 0) - (JACKPOT_RANK[a] || 0));
        return [[`🎰 ${order.length ? order.map(t => `${t} ×${jp[t]}`).join(" · ") : "MAXI+ 0회"}`, "sp-jp"]];
    }
    if (id === "vets_newbies" && tag) return [[tag === "New" ? "🆕 New" : "🎖️ Veteran", tag === "New" ? "sp-new" : "sp-vet"]];
    if (id === "rich_poor" && tag) return [[tag === "Rich" ? "💰 Rich" : "🪙 Poor", tag === "Rich" ? "sp-rich" : "sp-poor"]];
    return [];
}
// selection board chips for the special quotas: [label, have, goal]
export function specialQuota(s) {
    const t = specialOf(s);
    if (!t) return [];
    const ps = s.roster.map(id => Store.player(id)).filter(Boolean);
    const n = f => ps.filter(f).length;
    const out = [["DYLAN", n(p => s.handlers?.[p.id] === "DYLAN"), HALF], ["JAMES", n(p => s.handlers?.[p.id] === "JAMES"), HALF]];
    if (t.mf) out.push(["♂ 남자", n(p => sGender(p) === "male"), HALF], ["♀ 여자", n(p => sGender(p) === "female"), HALF]);
    if (t.team) for (const x of t.teams) out.push([x, s.roster.filter(id => s.special.tags?.[id] === x).length, HALF]);
    return out;
}
