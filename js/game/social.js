// =====================================================================
// 👫 Social systems (persistent in Store.community, saved with saveCommunity):
//   • 내 친구: mutual relations   community.friends = [{ a, b, rel, note, season, at }]
//   • 💖/👎 on comments          post.likes / post.dislikes = [{ pid, season, at }]
//   • 🤝 도움주기 corner          community.helps = [{ from, to, season, round, kind, amount, item, score, at }]
//   • 💞 친밀도 (intimacy)        intimacy(a, b) → { score, parts: [{ label, pts }] }
//   • 🗳️ 투표 탈락 (16 / 8 left)  season.vote = { size, voters, idx, cast, phase, … }
// =====================================================================
import { Store } from "../core/store.js";
import { S, log, name, alive, noteRefuse } from "./season.js";
import { LOCATIONS, ITEM_BY_ID, SHOPS } from "../data/catalog.js";
import { saleOf } from "../data/catalogAdmin.js";
import { parseGen } from "../ui/avatarGen.js";

const C = () => (Store.community ||= { posts: [] });
const save = () => Store.saveCommunity();
const same = (x, y) => +x === +y;

// ================================================================ 👫 friends
export const RELS = {
    family: { label: "가족", emoji: "👨‍👩‍👧", pts: 5 },
    friend: { label: "친구", emoji: "🤝", pts: 4 },
    acq:    { label: "지인", emoji: "🙂", pts: 3 },
    etc:    { label: "기타", emoji: "🏷️", pts: 2 }
};
export const REL_ORDER = ["friend", "family", "acq", "etc"];
export const relations = () => (C().friends ||= []);
export const relationOf = (a, b) => relations().find(r => (same(r.a, a) && same(r.b, b)) || (same(r.a, b) && same(r.b, a))) || null;
export const friendsOf = pid => relations().filter(r => same(r.a, pid) || same(r.b, pid)).map(r => ({ ...r, other: same(r.a, pid) ? +r.b : +r.a }));
// limits: a player adds at most 2 relations per season (친구 · 가족 · 지인 · 기타 together),
// and has at most 20 of each kind
export const ADD_PER_SEASON = 2, MAX_PER_REL = 20;
const curSeason = () => S()?.number ?? null;
export const addsThisSeason = pid => relations().filter(r => same(r.by ?? r.a, pid) && r.season != null && r.season === curSeason()).length;
export const relCount = (pid, rel, skip = null) => friendsOf(pid).filter(r => r.rel === rel && !(skip != null && same(r.other, skip))).length;
// one side adds → both sides are registered at once (a pair has one relation; adding again changes it)
export function addRelation(a, b, rel, note = "") {
    if (same(a, b)) return { ok: false, why: "자기 자신은 추가할 수 없습니다" };
    if (!RELS[rel]) return { ok: false, why: "관계를 고르세요" };
    note = rel === "etc" ? String(note || "").trim().slice(0, 30) : "";
    if (rel === "etc" && !note) return { ok: false, why: "기타 관계의 설명을 입력하세요" };
    const had = relationOf(a, b);
    if (!had && addsThisSeason(a) >= ADD_PER_SEASON) return { ok: false, why: `친구 추가는 시즌당 최대 ${ADD_PER_SEASON}명까지입니다 (친구 · 가족 · 지인 · 기타 통틀어)` };
    if (relCount(a, rel, b) >= MAX_PER_REL) return { ok: false, why: `${RELS[rel].label}은(는) 최대 ${MAX_PER_REL}명까지 추가할 수 있습니다` };
    if (relCount(b, rel, a) >= MAX_PER_REL) return { ok: false, why: `${name(b)}님의 ${RELS[rel].label}이(가) 이미 ${MAX_PER_REL}명입니다` };
    const list = relations().filter(r => !((same(r.a, a) && same(r.b, b)) || (same(r.a, b) && same(r.b, a))));
    // changing an existing relation keeps who added it and when (it is not a new add)
    list.push(had ? { ...had, rel, note } : { a: +a, b: +b, by: +a, rel, note, season: curSeason(), at: new Date().toISOString() });
    C().friends = list;
    log(`👫 ${name(a)} ↔ ${name(b)} ${RELS[rel].label}${note ? ` (${note})` : ""} 등록`, [a, b]);
    save(); Store.saveSeason?.();
    return { ok: true };
}
export function removeRelation(a, b) {
    C().friends = relations().filter(r => !((same(r.a, a) && same(r.b, b)) || (same(r.a, b) && same(r.b, a))));
    save();
}

// ================================================================ 💖 / 👎 comment reactions
export const postById = id => (C().posts || []).find(p => p.id === id);
// 💖 + 👎 together: one standing press per player per season — taking it back frees it again
// (counted from the reactions themselves: a heart / dislike pressed this season and still on a comment)
const seasonReacts = (pid, skipPost = null) => (C().posts || []).filter(p => p.id !== skipPost)
    .some(p => [...(p.likes || []), ...(p.dislikes || [])].some(r => same(r.pid, pid) && r.season != null && r.season === curSeason()));
export const reactedThisSeason = (pid, postId = null) => seasonReacts(pid, postId);
export function react(pid, postId, kind) { // kind: "likes" | "dislikes" — pressing again takes it back
    const p = postById(postId);
    if (!p) return { ok: false, why: "코멘트를 찾을 수 없습니다" };
    if (same(p.pid, pid)) return { ok: false, why: "내 코멘트에는 누를 수 없습니다" };
    const other = kind === "likes" ? "dislikes" : "likes";
    p[kind] ||= []; p[other] ||= [];
    const had = p[kind].some(r => same(r.pid, pid));
    // a new press (not a take-back, not switching on this same comment) while another one stands this season → no
    if (!had && seasonReacts(pid, p.id)) return { ok: false, why: "하트 · 싫어요는 시즌당 1회만 누를 수 있습니다 (다른 코멘트에 누른 것을 취소하면 다시 누를 수 있어요)" };
    p[kind] = p[kind].filter(r => !same(r.pid, pid));
    p[other] = p[other].filter(r => !same(r.pid, pid)); // a heart and a dislike never together
    if (!had) p[kind].push({ pid: +pid, season: curSeason(), at: new Date().toISOString() });
    save();
    return { ok: true, on: !had };
}

// ================================================================ 🤝 도움주기 corner
export const HELP_OK = 0.6, HELP_GOLD = [1000, 100000];
export const helps = () => (C().helps ||= []);
// admin (지역·맵 관리): 체크한 맵(loc.help = true)에만 도움주기 코너가 나옵니다
export const helpHere = loc => !!loc && !loc.kidnap && loc.help === true;
// 내 친구: every map unless the admin turned it off (loc.friends = false)
export const friendsHere = loc => !!loc && !loc.kidnap && loc.friends !== false;
const ps_ = pid => S()?.ps?.[pid];
export const helpDoorState = pid => { const d = ps_(pid)?.helpDoor; return d?.round === S().round ? d.ok : null; };
export function helpDoor(pid) {
    const ps = ps_(pid), s = S();
    if (ps.helpDoor?.round !== s.round) { ps.helpDoor = { round: s.round, ok: Math.random() < HELP_OK }; if (!ps.helpDoor.ok) noteRefuse(pid); Store.saveSeason(); }
    return ps.helpDoor.ok;
}
export const helpedThisRound = pid => ps_(pid)?.helpRound === S()?.round;
// +1 ~ +100: 1,000G → +1 … 100,000G → +100 · items by their admin price (1P counted as 500G)
export const goldScore = g => Math.max(1, Math.min(100, Math.round(g / 1000)));
export function itemValue(id) {
    const s = saleOf("item", id);
    const p = +s.price || +ITEM_BY_ID[id]?.price || 0;
    const cur = SHOPS[s.shop]?.cur;
    return cur === "P" ? p * 500 : cur === "PG" ? p * 500 + (s.gold || 0) : p;
}
export const itemScore = id => Math.max(1, Math.min(100, Math.round(itemValue(id) / 1000)));
// target: a random season player (alive, not me) or a random registered non-season player; kept for this round
export function helpTarget(pid, kind) {
    const ps = ps_(pid), s = S();
    if (ps.helpPick?.round === s.round && ps.helpPick[kind] != null) return ps.helpPick[kind];
    const roster = new Set(s.roster.map(Number));
    const pool = kind === "season" ? alive().filter(x => !same(x, pid)) : Store.players.map(p => +p.id).filter(id => !roster.has(id));
    const t = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    ps.helpPick = { ...(ps.helpPick?.round === s.round ? ps.helpPick : {}), round: s.round, [kind]: t };
    Store.saveSeason();
    return t;
}
export function giveHelp(pid, to, { gold = 0, item = null } = {}) {
    const s = S(), ps = ps_(pid);
    if (helpedThisRound(pid)) return { ok: false, why: "이번 라운드에는 이미 도움을 줬습니다 (라운드당 1회)" };
    if (to == null || same(to, pid)) return { ok: false, why: "도움을 줄 대상이 없습니다" };
    let score, kind, amount = 0;
    if (item) {
        if (!(ps.items[item] > 0)) return { ok: false, why: "가지고 있지 않은 아이템입니다" };
        kind = "item"; score = itemScore(item);
    } else {
        gold = Math.round(+gold || 0);
        if (gold < HELP_GOLD[0] || gold > HELP_GOLD[1]) return { ok: false, why: `골드는 ${HELP_GOLD[0].toLocaleString()}~${HELP_GOLD[1].toLocaleString()}G 사이로 정하세요` };
        if (ps.money < gold) return { ok: false, why: "골드가 부족합니다" };
        kind = "gold"; amount = gold; score = goldScore(gold);
    }
    // hand it over: season players get it now · others get it when they join a season (wallet gold / stash items)
    const tps = s.ps[to] && !s.ps[to].out ? s.ps[to] : null;
    if (kind === "gold") {
        ps.money -= gold;
        if (tps) tps.money += gold;
        else { Store.wallets ||= {}; Store.wallets[to] = (Store.wallets[to] || 0) + gold; Store.saveWallets(); }
    } else {
        ps.items[item]--;
        if (tps) tps.items[item] = (tps.items[item] || 0) + 1;
        else { Store.stash ||= {}; const st = (Store.stash[to] ||= { season: s.number, items: {} }); st.items ||= {}; st.items[item] = (st.items[item] || 0) + 1; Store.saveStash(); }
    }
    ps.helpRound = s.round;
    const rec = { from: +pid, to: +to, season: s.number, round: s.round, kind, amount, item, score, at: new Date().toISOString() };
    helps().push(rec);
    const what = kind === "gold" ? `${gold.toLocaleString()}G` : `${ITEM_BY_ID[item]?.name || item}`;
    log(`🤝 ${name(pid)} → ${name(to)} 도움주기: ${what} (친밀도 +${score})`, [pid, to]);
    save(); Store.saveSeason(true);
    return { ok: true, rec };
}

// ================================================================ 💞 intimacy (친밀도)
// traits that live in the player pictures: skin colour + the Mongi wrinkle "(-)" mouth.
// Read once from each SVG (cached by image path) — call loadTraits(pids) before scoring.
const TRAITS = new Map();
const TKEY = "gamblers.traits.v1";
try { for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem(TKEY) || "{}"))) TRAITS.set(k, v); } catch { }
const hexRgb = x => { let s = String(x || "").replace("#", ""); if (s.length === 3) s = [...s].map(c => c + c).join(""); if (!/^[0-9a-f]{6}$/i.test(s)) return null; return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
function skinFromSvg(svg) {
    const grad = id => { const m = svg.match(new RegExp(`id="${id}"[\\s\\S]*?stop-color="(#[0-9a-fA-F]{3,6})"`)); return m?.[1] || null; };
    const fillOf = tag => { const m = tag.match(/fill="(#[0-9a-fA-F]{3,6}|url\(#([\w-]+)\))"/); return m ? (m[2] ? grad(m[2]) : m[1]) : null; };
    // 1) the shape right after a "face" / "head" comment
    const lines = svg.split("\n");
    for (let i = 0; i < lines.length; i++) {
        if (!/<!--[^>]*\b(face|head)\b/i.test(lines[i])) continue;
        for (let j = i; j < Math.min(lines.length, i + 4); j++) {
            const tag = (lines[j].match(/<(ellipse|circle|path|rect)\b[^>]*>/g) || []).find(t => !/fill="none"/.test(t));
            const f = tag && fillOf(tag);
            if (f) return f;
        }
    }
    // 2) the biggest round shape in the middle (not the background disc)
    let best = null, area = 0;
    for (const t of svg.match(/<(ellipse|circle)\b[^>]*>/g) || []) {
        const n = k => +((t.match(new RegExp(`\\b${k}="([\\d.]+)"`)) || [])[1] || 0);
        const cx = n("cx"), cy = n("cy"), rx = n("rx") || n("r"), ry = n("ry") || n("r");
        if (rx >= 110 || rx < 28 || cx < 90 || cx > 166 || cy < 60 || cy > 170) continue;
        const f = fillOf(t);
        if (f && rx * ry > area) { area = rx * ry; best = f; }
    }
    return best;
}
async function traitOf(pid) {
    const p = Store.player(pid);
    const src = p?.profile_image || "";
    if (TRAITS.has(src)) return TRAITS.get(src);
    let t = { skin: null, mongi: false };
    const gen = parseGen(src);
    if (gen) t = { skin: gen.skin && gen.skin !== "auto" ? gen.skin : null, mongi: false };
    else if (src) {
        try {
            const svg = await (await fetch(src)).text();
            const desc = (svg.match(/<!--([\s\S]*?)-->/) || [])[1] || "";
            t = { skin: skinFromSvg(svg), mongi: /mongi wrinkle|wrinkle mouth|몽이주름/i.test(desc) && !/no wrinkle/i.test(desc) };
        } catch { }
    }
    TRAITS.set(src, t);
    try { localStorage.setItem(TKEY, JSON.stringify(Object.fromEntries(TRAITS))); } catch { }
    return t;
}
export async function loadTraits(pids) { await Promise.all(pids.map(traitOf)); }
const traitNow = pid => TRAITS.get(Store.player(pid)?.profile_image || "") || { skin: null, mongi: false };

const RACE_GROUPS = [
    ["Donglee", "Smile"], ["Rabbit", "Bunny", "Dungi"], ["Angel", "Devil", "Human", "Emo", "Emobu", "Jiangshi"], ["Veggie", "Fruit"],
    ["Ant", "Bug"], ["Ghost", "Invisible"], ["Rat", "Cat"], ["Teddy", "Bear"], ["Triangle", "Rhombus", "Square", "Trapezoid", "Donglee"]
];
const SAME_FIELDS = [["ethnicity", "같은 종족"], ["country", "같은 국가"], ["gender", "같은 성별"], ["job", "같은 직업"], ["preference", "같은 Preference"], ["school", "같은 학교"], ["age_group", "같은 연령대"]];
const norm = x => String(x || "").trim().toLowerCase();
const STOP = new Set(["baby", "old", "senior", "the", "mr", "mrs", "ms", "little", "big", "dark", "light", "super", "mega", "dr", "sir", "lady", "young", "mini"]);
function similarNames(a, b) {
    const ka = String(a.name_ko || ""), kb = String(b.name_ko || "");
    let n = 0; while (n < ka.length && n < kb.length && ka[n] === kb[n]) n++;
    if (n >= 2 && /[가-힣]/.test(ka.slice(0, n))) return `${ka.slice(0, n)}…`;
    const ea = norm(a.player_name).split(/\s+/)[0], eb = norm(b.player_name).split(/\s+/)[0];
    if (ea && ea === eb && ea.length >= 3 && !STOP.has(ea)) return a.player_name.split(/\s+/)[0];
    return null;
}
// seasons each player took part in (finished seasons from Store.results + the running season)
function seasonsOf(pid) {
    const out = new Set((Store.results || []).filter(r => same(r.playerId, pid)).map(r => r.season));
    const s = S(); if (s?.roster?.some(x => same(x, pid))) out.add(s.number);
    return out;
}
export function intimacy(aId, bId) {
    const a = Store.player(aId), b = Store.player(bId), parts = [];
    if (!a || !b || same(aId, bId)) return { score: 0, parts };
    const add = (label, pts) => parts.push({ label, pts });
    const r = relationOf(aId, bId);
    if (r) add(`${RELS[r.rel].emoji} ${RELS[r.rel].label}${r.note ? ` (${r.note})` : ""}`, RELS[r.rel].pts);
    for (const [k, label] of SAME_FIELDS) if (norm(a[k]) && norm(a[k]) === norm(b[k])) add(`${label} (${a[k]})`, 1);
    const ta = traitNow(aId), tb = traitNow(bId);
    if (ta.mongi && tb.mongi) add("😶 둘 다 몽이주름 (-)", 1);
    const ra = norm(a.ethnicity), rb = norm(b.ethnicity);
    for (const g of RACE_GROUPS) { const gl = g.map(norm); if (ra !== rb && gl.includes(ra) && gl.includes(rb)) add(`🧬 ${g.join(" · ")} 종족 간`, 1); }
    const ca = hexRgb(ta.skin), cb = hexRgb(tb.skin);
    if (ca && cb && Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]) <= 60) add(`🎨 비슷한 피부색 (${ta.skin} · ${tb.skin})`, 1);
    const hs = helps().filter(x => (same(x.from, aId) && same(x.to, bId)) || (same(x.from, bId) && same(x.to, aId)));
    for (const x of hs) add(`🤝 도움주기 ${name(x.from)}→${name(x.to)} (시즌 ${x.season} · ${x.kind === "gold" ? x.amount.toLocaleString() + "G" : ITEM_BY_ID[x.item]?.name || x.item})`, x.score);
    const sim = similarNames(a, b);
    if (sim) add(`🔤 비슷한 이름 (${sim})`, 1);
    const sa = seasonsOf(aId), together = [...seasonsOf(bId)].filter(n => sa.has(n));
    if (together.length) add(`🎰 같은 시즌 참가 (시즌 ${together.sort((x, y) => x - y).join(", ")})`, 1);
    for (const p of C().posts || []) {
        const mine = same(p.pid, aId) ? bId : same(p.pid, bId) ? aId : null;
        if (mine == null) continue;
        if ((p.likes || []).some(x => same(x.pid, mine))) add(`💖 ${name(mine)}이(가) ${name(p.pid)}의 코멘트에 하트 (시즌 ${p.season})`, 1);
        if ((p.dislikes || []).some(x => same(x.pid, mine))) add(`👎 ${name(mine)}이(가) ${name(p.pid)}의 코멘트에 싫어요 (시즌 ${p.season})`, -1);
    }
    const na = a.country, nb = b.country;
    if (na !== nb && [na, nb].includes("Emo World") && [na, nb].includes("Dung Town")) add("🚩 Emo World ↔ Dung Town 국적", -1);
    if (na !== nb && [na, nb].includes("Foggy Nation") && [na, nb].includes("Ground Town")) add("🌫️ Foggy Nation ↔ Ground Town 국적", 1);
    if (na !== nb && [na, nb].includes("Polynesia")) add("🌴 Polynesia ↔ 다른 국적", -1);
    return { score: parts.reduce((t, p) => t + p.pts, 0), parts };
}

// ================================================================ 🗳️ vote elimination (16 and 8 left)
export const VOTE_AT = [16, 8];
export const voteDue = () => { const s = S(); const n = alive().length; return VOTE_AT.includes(n) && !(s.votedAt || []).includes(n); };
export function startVote() {
    const s = S(), live = alive();
    s.status = "vote";
    s.mission = { id: "vote", type: "vote", tier: null, text: `🗳️ 투표 탈락 — ${live.length}명 중 친밀도 투표로 1명 탈락` };
    s.turn = null; s.candidates = [];
    s.votedAt = [...(s.votedAt || []), live.length];
    s.vote = { size: live.length, voters: [...live].sort(() => Math.random() - 0.5), idx: 0, cast: {}, phase: "voting", round: s.round };
    log(`🗳️ 라운드 ${s.round}: ${live.length}명 남음 — 미션 대신 투표로 탈락자를 정합니다`);
    Store.saveSeason(true);
}
export function castVote(pid, skip = false) {
    const v = S().vote;
    if (!v || v.phase !== "voting" || !same(v.voters[v.idx], pid)) return;
    v.cast[pid] = skip ? "skip" : "voted";
    v.idx++;
    log(skip ? `⏭️ ${name(pid)} 투표 Skip` : `🗳️ ${name(pid)} 투표 완료`, [pid]);
    if (v.idx >= v.voters.length) { v.phase = "done"; log("🗳️ 투표 종료 — 관리자가 투표결과를 공개합니다"); }
    Store.saveSeason(true);
}
// every voter gives 1 vote to the player they have the highest 💞 intimacy with (ties → random, marked)
// skipped voters give nothing · score of a player = number of votes received
export async function tallyVote() {
    const s = S(), v = s.vote;
    const live = v.voters.filter(pid => !s.ps[pid]?.out);
    await loadTraits(live);
    const scores = Object.fromEntries(live.map(t => [t, { total: 0, from: [] }]));
    for (const voter of live) {
        if (v.cast[voter] !== "voted") continue;
        const opts = live.filter(t => !same(t, voter)).map(t => ({ t, ...intimacy(voter, t) }));
        if (!opts.length) continue;
        const best = Math.max(...opts.map(o => o.score));
        const top = opts.filter(o => o.score === best);
        const o = top[Math.floor(Math.random() * top.length)];
        scores[o.t].total++;
        scores[o.t].from.push({ voter, score: o.score, parts: o.parts, tie: top.length > 1 });
    }
    // ranking: high → low, ties broken at random (marked)
    const tie = {};
    const rank = [...live].map(pid => ({ pid, total: scores[pid].total, r: Math.random() })).sort((a, b) => (b.total - a.total) || (a.r - b.r)).map(x => x.pid);
    for (let i = 0; i < rank.length; i++) for (let j = i + 1; j < rank.length; j++) if (scores[rank[i]].total === scores[rank[j]].total) { tie[rank[i]] = true; tie[rank[j]] = true; }
    // bottom 3 including ties: everyone with no more votes than the 3rd-lowest player
    // exactly 3 → straight to the final · more than 3 → the claw picks 3 of them (screens/social.js)
    const asc = [...rank].reverse();
    const cut = asc.length > 3 ? scores[asc[2]].total : Infinity;
    const pool = asc.filter(p => scores[p].total <= cut);
    Object.assign(v, { phase: "results", scores, rank, tie, pool, picked: null, topShown: false });
    s.candidates = pool.length <= 3 ? [...pool] : [];
    log(pool.length > 3 ? `📊 투표 결과 공개 — 최하위 동점 포함 ${pool.length}명 중 집게로 탈락 후보 3명을 뽑습니다` : `📊 투표 결과 공개 — 최하위 3명이 탈락 후보`);
    Store.saveSeason(true);
    return v;
}
// the bottom 3: the best of them is rescued, then the lower of the last 2 is out (random on ties, marked)
export function voteFinal() {
    const s = S(), v = s.vote;
    if (v.final) return v.final;
    const sc = pid => v.scores[pid].total;
    const three = [...s.candidates];
    const best = Math.max(...three.map(sc));
    const top = three.filter(p => sc(p) === best);
    const saved1 = top[Math.floor(Math.random() * top.length)];
    const two = three.filter(p => p !== saved1);
    const low = Math.min(...two.map(sc));
    const lows = two.filter(p => sc(p) === low);
    const out = lows[Math.floor(Math.random() * lows.length)];
    const saved2 = two.find(p => p !== out);
    v.final = { saved1, saved1Tie: top.length > 1, out, saved2, saved2Tie: lows.length > 1 };
    Store.saveSeason(true);
    return v.final;
}
