// =====================================================================
// 🏦 Business Bank + 🏪 Self-Business rules. Persistent state (outlives a
// season) in Store.bank, saved like the wallets (settings "bank"):
//   accounts:  { <pid>: { pid, code, openedAt, season, bgold, history: [{ t, kind, amount, note }] } }
//   biz:       [{ id, type, owner, code, loc, openedAt, season, revenue, entries, buys,
//                 sales: [{ t, season, round, pid, kind: "entry"|"buy", label, price, cut }], moves: [],
//                 closed?, closedAt? }]   (closed = greyed '폐업' slot, owner data removed)
//   transfers: [{ id, pid, code, amount, fee, season, round, due, fast, done, paidAt, to }]
//   reports:   { <pid>: [{ id, bizId, type, loc, at, snap }] }
// Season-only counters live on the player's season state (ps.bank).
// =====================================================================
import { CONFIG } from "../config.js";
import { Store } from "../core/store.js";
import { LOC_BY_ID, LOCATIONS, REGION_BY_ID } from "../data/catalog.js";
import { BIZ_TYPES, TX_TIERS, TX_FREE_PER_SEASON, TX_EXTRA_MAX, TX_MIN_ALIVE, TX_DELAY_ROUNDS, BANK_OPEN_CHANCE } from "../data/business.js";
import { S, alive, log, name, honorRecords, roundHooks, seasonEndHooks } from "./season.js";

export const B = () => {
    const b = (Store.bank ||= {});
    b.accounts ||= {}; b.biz ||= []; b.transfers ||= []; b.reports ||= {};
    return b;
};
const save = () => Store.saveBank();
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const bankState = pid => (S().ps[pid].bank ||= { tx: 0, extra: 0, buyRound: 0, applyRound: 0 });
const now = () => new Date().toISOString();

// ---------------------------------------------------------------- eligibility
export const topRank = pid => Math.min(Infinity, ...honorRecords(pid, 999).map(r => r.rank));
export const hasTop = (pid, n) => !!S()?.sandbox || honorRecords(pid, n).length > 0;
export const bankEligible = pid => hasTop(pid, 10);

// ---------------------------------------------------------------- accounts
export const account = pid => B().accounts[pid] || null;
export const accountByCode = code => Object.values(B().accounts).find(a => a.code === String(code || "").trim().toUpperCase()) || null;
export function searchCodes(q) {
    q = String(q || "").trim().toLowerCase();
    if (!q) return [];
    return Object.values(B().accounts).map(a => ({ a, p: Store.player(a.pid) })).filter(({ p }) => p && [p.name_ko, p.player_name, p.login_id].some(x => String(x || "").toLowerCase().includes(q))).slice(0, 8);
}
function newCode() {
    const C = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (;;) { const c = Array.from({ length: 4 }, () => C[Math.floor(Math.random() * C.length)]).join(""); if (!accountByCode(c)) return c; }
}
export const canApply = pid => !account(pid) && bankState(pid).applyRound !== S().round;
// the 3 review steps → { ok, step, why, account? }
export async function reviewAccount(pid) {
    const st = bankState(pid);
    st.applyRound = S().round;
    Store.saveSeason();
    const last = Store.results.filter(r => r.playerId === +pid && r.rank >= CONFIG.SEASON_SIZE);
    if (last.length) return { ok: false, step: 1, why: `${last.map(r => `${r.season}시즌`).join(", ")} ${CONFIG.SEASON_SIZE}위(꼴찌) 기록이 있어 계좌를 만들 수 없습니다.` };
    // loans: a loan death in any season, or a loan still unpaid now → refused
    let deaths = [];
    try { deaths = (await Store.seasonDigests()).filter(d => (d.history || []).some(x => x.loanDeath && x.eliminated === +pid)).map(d => d.number); } catch { }
    const cur = S().ps[pid];
    if (deaths.length) return { ok: false, step: 2, why: `${deaths.join(", ")}시즌 대출 미상환(사망) 기록이 있어 계좌를 만들 수 없습니다.` };
    if (cur.loan) return { ok: false, step: 2, why: `갚지 않은 대출(${cur.loan.owed.toLocaleString()}G)이 남아 있어 계좌를 만들 수 없습니다.` };
    const loanNote = cur.loansTaken ? "대출 원금·이자 상환 완료" : "대출 기록 없음";
    if (Math.random() >= BANK_OPEN_CHANCE) {
        log(`🏦 ${name(pid)} 계좌 개설 최종 심사 탈락`);
        Store.saveSeason();
        return { ok: false, step: 3, why: "최종 심사에서 거절되었습니다. 다음 라운드에 다시 신청하세요.", loanNote };
    }
    const a = { pid: +pid, code: newCode(), openedAt: now(), season: S().number, bgold: 0, history: [{ t: now(), kind: "open", amount: 0, note: "계좌 개설" }] };
    B().accounts[pid] = a;
    log(`🏦 ${name(pid)} Business Bank 계좌 개설 (${a.code})`);
    save(); Store.saveSeason(true);
    return { ok: true, account: a, loanNote };
}
// money into an account (sales, entry fees) — owner may be anyone, playing or not
export function deposit(code, amount, note) {
    const a = accountByCode(code);
    amount = Math.round(amount);
    if (!a || amount <= 0) return 0;
    a.bgold = (a.bgold || 0) + amount;
    a.history = [{ t: now(), kind: "in", amount, note }, ...(a.history || [])].slice(0, 200);
    return amount;
}

// ---------------------------------------------------------------- Business Gold → gold
export const tierOf = amount => TX_TIERS.find(t => amount >= t.min && amount <= t.max) || null;
export function txStatus(pid) {
    const st = bankState(pid), ps = S().ps[pid];
    const free = st.tx < TX_FREE_PER_SEASON;
    const extraOk = st.extra < TX_EXTRA_MAX && (ps.items.extra_transfer || 0) > 0;
    const fewLeft = alive().length < TX_MIN_ALIVE;
    return { free, extraOk, extraUsed: st.extra, fewLeft, fastHave: ps.items.fast_transfer || 0, can: free || extraOk,
        why: free || extraOk ? null : st.extra >= TX_EXTRA_MAX ? `이번 시즌 송금을 모두 사용했습니다 (기본 ${TX_FREE_PER_SEASON}회 + 추가 ${TX_EXTRA_MAX}회)` : "이번 시즌 송금(1회)을 이미 사용했습니다 — 추가 송금권이 있으면 더 보낼 수 있어요" };
}
// → { ok, why } | { ok, tx }
export function requestTransfer(pid, code, amount, { fast = false } = {}) {
    const s = S(), ps = s.ps[pid], a = accountByCode(code);
    amount = Math.floor(+amount || 0);
    if (!a || a.pid !== +pid) return { ok: false, why: "본인 계좌 코드가 아닙니다" };
    const tier = tierOf(amount);
    if (!tier) return { ok: false, why: "송금액은 1 ~ 1,000,000 BG 사이여야 합니다" };
    if (amount > (a.bgold || 0)) return { ok: false, why: "Business Gold가 부족합니다" };
    const fee = Math.ceil(amount * tier.rate);
    if (ps.money < fee) return { ok: false, why: `수수료 ${fee.toLocaleString()}G (일반 골드)가 부족합니다` };
    const t = txStatus(pid);
    if (!t.can) return { ok: false, why: t.why };
    if (t.fewLeft && !fast) return { ok: false, why: `생존자가 ${TX_MIN_ALIVE - 1}명 이하라 일반 송금이 막혔습니다 — 빠른 송금 서비스만 쓸 수 있습니다` };
    if (fast && !(ps.items.fast_transfer > 0)) return { ok: false, why: "빠른 송금 서비스 아이템이 없습니다" };
    const st = bankState(pid);
    if (t.free) st.tx++; else { ps.items.extra_transfer--; st.extra++; }
    if (fast) ps.items.fast_transfer--;
    ps.money -= fee;
    a.bgold -= amount;
    const tx = { id: uid("tx"), pid: +pid, code: a.code, amount, fee, rate: tier.rate, season: s.number, round: s.round, due: s.round + TX_DELAY_ROUNDS, fast, done: false, at: now() };
    a.history = [{ t: now(), kind: "out", amount: -amount, note: `${fast ? "빠른 " : ""}송금 (수수료 ${fee.toLocaleString()}G)` }, ...(a.history || [])].slice(0, 200);
    B().transfers.push(tx);
    log(`🏦 ${name(pid)} Business Gold ${amount.toLocaleString()} 송금${fast ? " ⚡즉시" : ` → ROUND ${tx.due} 시작 때 입금`} (수수료 ${fee.toLocaleString()}G)`);
    if (fast) payTransfer(tx);
    save(); Store.saveSeason(true);
    return { ok: true, tx };
}
// a finished transfer: alive in the season → purse; out / season over → wallet (next season)
function payTransfer(tx) {
    const s = S(), ps = s?.ps[tx.pid];
    tx.done = true; tx.paidAt = now();
    if (s && s.number === tx.season && s.status !== "done" && ps && !ps.out) { ps.money += tx.amount; tx.to = "season"; }
    else { Store.wallets[tx.pid] = (Store.wallets[tx.pid] || 0) + tx.amount; tx.to = "wallet"; Store.saveWallets(); }
    if (s) log(`💸 ${name(tx.pid)} 송금 ${tx.amount.toLocaleString()}G 입금 완료${tx.to === "wallet" ? " (다음 시즌 참가 때 합류)" : ""}`);
}
// new round: transfers whose 2 rounds are over get paid. endSeason: everything left is paid out.
export function processTransfers({ endSeason = false } = {}) {
    const s = S(), b = B();
    let n = 0;
    for (const tx of b.transfers) {
        if (tx.done) continue;
        if (endSeason || !s || tx.season !== s.number || s.round >= tx.due) { payTransfer(tx); n++; }
    }
    b.transfers = b.transfers.filter(t => !t.done || Date.now() - Date.parse(t.paidAt || 0) < 30 * 864e5).slice(-300);
    if (n) save();
    return n;
}
export const pendingOf = pid => B().transfers.filter(t => t.pid === +pid && !t.done);

// ---------------------------------------------------------------- shops (bank: 1 buy per round)
export const bankBuyLeft = pid => bankState(pid).buyRound !== S().round;
export function noteBankBuy(pid) { bankState(pid).buyRound = S().round; }

// ---------------------------------------------------------------- businesses
export const bizById = id => B().biz.find(b => b.id === id) || null;
export const activeBiz = () => B().biz.filter(b => !b.closed);
export const bizAt = locId => B().biz.filter(b => b.loc === locId);
export const bizOf = pid => activeBiz().filter(b => b.owner === +pid);
export const stockLeft = type => BIZ_TYPES[type].max - activeBiz().filter(b => b.type === type).length;
export const priceFor = (type, pid) => { const T = BIZ_TYPES[type], p = Store.player(pid); return T.nation && p?.country === T.nation ? Math.round(T.price * 0.95) : T.price; };
// every map a type may open on, with its region tax (maps that already hold a business are taken)
export function openSpots(type, { except = null } = {}) {
    const T = BIZ_TYPES[type], taken = new Set(activeBiz().filter(b => b.id !== except).map(b => b.loc));
    return T.open.map(o => ({
        region: o.region, tax: o.tax, name: REGION_BY_ID[o.region]?.name || o.region, emoji: REGION_BY_ID[o.region]?.emoji || "",
        maps: (o.maps === "all" ? LOCATIONS.filter(l => l.region === o.region) : o.maps.map(id => LOC_BY_ID[id]).filter(Boolean))
            .filter(l => !l.off).map(l => ({ loc: l, taken: taken.has(l.id) }))
    })).filter(r => r.maps.length);
}
export function buyStatus(type, pid) {
    const T = BIZ_TYPES[type];
    if (stockLeft(type) <= 0) return { ok: false, why: "매물 소진" };
    if (!hasTop(pid, T.rank)) return { ok: false, why: `TOP ${T.rank} 경력 필요` };
    if (!account(pid)) return { ok: false, why: "Business Bank 계좌 필요" };
    if (S().ps[pid].money < priceFor(type, pid)) return { ok: false, why: "골드 부족" };
    return { ok: true };
}
// price + region tax are paid together when the shop opens
export function openBusiness(pid, type, code, locId) {
    const ps = S().ps[pid], T = BIZ_TYPES[type], a = accountByCode(code);
    const st = buyStatus(type, pid);
    if (!st.ok) return { ok: false, why: st.why };
    if (!a || a.pid !== +pid) return { ok: false, why: "본인 계좌 코드가 아닙니다" };
    const spot = openSpots(type).find(r => r.maps.some(m => m.loc.id === locId && !m.taken));
    if (!spot) return { ok: false, why: "그 맵에는 오픈할 수 없습니다" };
    const price = priceFor(type, pid), total = price + spot.tax;
    if (ps.money < total) return { ok: false, why: `매입가 + 지역세 ${total.toLocaleString()}G가 부족합니다` };
    ps.money -= total;
    B().biz = B().biz.filter(b => !(b.closed && b.loc === locId)); // a closed slot is reused
    const biz = { id: uid("biz"), type, owner: +pid, code: a.code, loc: locId, openedAt: now(), season: S().number, price, tax: spot.tax, revenue: 0, entries: 0, buys: 0, sales: [], moves: [] };
    B().biz.push(biz);
    log(`${T.emoji} ${name(pid)} ${T.name} 매입 → ${LOC_BY_ID[locId].name} 오픈! (${total.toLocaleString()}G)`);
    save(); Store.saveSeason(true);
    return { ok: true, biz };
}
function sale(biz, pid, kind, label, price, cut) {
    const s = S();
    biz.sales = [{ t: now(), season: s.number, round: s.round, pid: +pid, kind, label, price, cut }, ...(biz.sales || [])].slice(0, 400);
    biz.revenue = (biz.revenue || 0) + cut;
    if (kind === "entry") biz.entries = (biz.entries || 0) + 1; else biz.buys = (biz.buys || 0) + 1;
    deposit(biz.code, cut, `${BIZ_TYPES[biz.type].name} ${kind === "entry" ? "입장료" : label} (${name(pid)})`);
}
const useOf = (pid, biz) => { const ps = S().ps[pid], r = S().round; const u = (ps.bizUse ||= {})[biz.id]; return u?.round === r ? u : (ps.bizUse[biz.id] = { round: r }); };
export const bizUse = (pid, biz) => useOf(pid, biz);
// pay the door; a coin flip may still refuse (the fee is kept)
export function enterBiz(pid, biz) {
    const T = BIZ_TYPES[biz.type], ps = S().ps[pid], u = useOf(pid, biz);
    if (u.paid) return { ok: !!u.in };
    if (ps.money < T.entry.fee) return { ok: false, why: "입장료가 부족합니다" };
    ps.money -= T.entry.fee;
    u.paid = true; u.in = Math.random() < T.entry.chance;
    sale(biz, pid, "entry", "입장료", T.entry.fee, T.entry.fee);
    log(`${T.emoji} ${name(pid)} ${T.name} 입장료 ${T.entry.fee}G → ${u.in ? "입장" : "입장 거절"}`);
    save(); Store.saveSeason(true);
    return { ok: u.in, refused: !u.in };
}
// a menu item eaten on the spot (HP) or a market good for the bag
export function buyMenu(pid, biz, entry, price, give) {
    const T = BIZ_TYPES[biz.type], ps = S().ps[pid], u = useOf(pid, biz);
    if (!u.in) return { ok: false, why: "먼저 입장하세요" };
    if (u.bought) return { ok: false, why: "이번 라운드에는 이미 구매했습니다" };
    if (ps.money < price) return { ok: false, why: "골드가 부족합니다" };
    ps.money -= price;
    u.bought = entry.name || entry.label;
    let hp = 0;
    if (entry.hp) { const before = ps.hp; ps.hp = entry.hp === "full" ? CONFIG.START_HP : Math.min(CONFIG.START_HP, ps.hp + entry.hp); hp = ps.hp - before; }
    else give?.();
    const cut = Math.round(price * T.cut);
    sale(biz, pid, "buy", entry.name || entry.label, price, cut);
    log(`${T.emoji} ${name(pid)} ${T.name}에서 ${entry.name || entry.label} 구매 (${price.toLocaleString()}G${hp ? ` · HP +${Math.round(hp * 100) / 100}` : ""})`);
    save(); Store.saveSeason(true);
    return { ok: true, hp, cut };
}
// owner tools (each needs its item, used up)
export function useBizItem(pid, itemId) {
    const ps = S().ps[pid];
    if (!(ps.items[itemId] > 0)) return false;
    ps.items[itemId]--; Store.saveSeason();
    return true;
}
export function moveBusiness(pid, biz, locId) {
    const ps = S().ps[pid];
    const spot = openSpots(biz.type, { except: biz.id }).find(r => r.maps.some(m => m.loc.id === locId && !m.taken));
    if (!spot || locId === biz.loc) return { ok: false, why: "그 맵으로는 옮길 수 없습니다" };
    if (ps.money < spot.tax) return { ok: false, why: `지역세 ${spot.tax.toLocaleString()}G가 부족합니다` };
    if (!useBizItem(pid, "biz_move")) return { ok: false, why: "매물 지역 바꾸기 권이 없습니다" };
    ps.money -= spot.tax;
    B().biz = B().biz.filter(b => !(b.closed && b.loc === locId));
    biz.moves = [...(biz.moves || []), { t: now(), from: biz.loc, to: locId, tax: spot.tax }];
    const from = LOC_BY_ID[biz.loc]?.name;
    biz.loc = locId;
    log(`🚚 ${name(pid)} ${BIZ_TYPES[biz.type].name} 이전: ${from} → ${LOC_BY_ID[locId].name} (지역세 ${spot.tax.toLocaleString()}G)`);
    save(); Store.saveSeason(true);
    return { ok: true };
}
// closing: the owner's records go, the map keeps a grey '폐업' slot, the account's Business Gold is gone
export function closeBusiness(pid, biz, { admin = false } = {}) {
    if (!admin && !useBizItem(pid, "biz_close")) return { ok: false, why: "폐업권이 없습니다" };
    const a = accountByCode(biz.code), lost = a?.bgold || 0;
    if (a && !admin) { a.bgold = 0; a.history = [{ t: now(), kind: "lost", amount: -lost, note: `${BIZ_TYPES[biz.type].name} 폐업 — Business Gold 소멸` }, ...(a.history || [])]; }
    const T = BIZ_TYPES[biz.type];
    const i = B().biz.indexOf(biz);
    B().biz[i] = { id: biz.id, type: biz.type, loc: biz.loc, closed: true, closedAt: now() };
    if (S()) log(`🪧 ${name(biz.owner)} ${T.name} 폐업 (${LOC_BY_ID[biz.loc]?.name})`);
    save(); if (S()) Store.saveSeason(true);
    return { ok: true, lost };
}

// ---------------------------------------------------------------- trend report
export function trendSnapshot(biz) {
    const T = BIZ_TYPES[biz.type], sales = biz.sales || [];
    const buys = sales.filter(x => x.kind === "buy"), entries = sales.filter(x => x.kind === "entry");
    const byItem = {};
    for (const x of buys) { const o = (byItem[x.label] ||= { label: x.label, n: 0, gross: 0, cut: 0 }); o.n++; o.gross += x.price; o.cut += x.cut; }
    const byRound = {};
    for (const x of sales) { const k = `S${x.season}·R${x.round}`; const o = (byRound[k] ||= { k, season: x.season, round: x.round, cut: 0, n: 0 }); o.cut += x.cut; o.n++; }
    const items = Object.values(byItem).sort((a, b) => b.n - a.n);
    const rounds = Object.values(byRound).sort((a, b) => a.season - b.season || a.round - b.round).slice(-12);
    const conv = entries.length ? buys.length / entries.length : 0;
    const visitors = new Set(sales.map(x => x.pid)).size;
    const allNames = (T.menu || T.market || []).map(m => m.name || m.label || m.id);
    return {
        type: biz.type, name: T.name, loc: biz.loc, at: now(), revenue: biz.revenue || 0, entries: entries.length, buys: buys.length, visitors, conv,
        gross: buys.reduce((a, x) => a + x.price, 0), items, rounds, unsold: allNames.filter(n => !byItem[n] && T.menu),
        customers: sales.slice(0, 60).map(x => ({ t: x.t, season: x.season, round: x.round, pid: x.pid, kind: x.kind, label: x.label, price: x.price })),
        advice: adviseFor(biz, { entries: entries.length, buys: buys.length, conv, items, refused: T.entry.chance < 1 })
    };
}
function adviseFor(biz, d) {
    const T = BIZ_TYPES[biz.type], loc = LOC_BY_ID[biz.loc], out = [];
    if (!d.entries) out.push(`아직 손님이 없습니다. ${loc?.name || "이 맵"}은(는) 덜 붐비는 맵일 수 있어요 — 매물 지역 바꾸기 권으로 손님이 많은 지역(카지노 랜드 1·2, 콤보랜드)으로 옮겨 보세요.`);
    else {
        if (d.conv < 0.35) out.push(`입장 대비 구매율이 ${Math.round(d.conv * 100)}%로 낮습니다. 손님들이 HP가 깎이는 NPC 출몰 맵이나 Evil Town 근처라면 회복 메뉴가 더 잘 팔립니다 — HP를 잃기 쉬운 지역으로 이전을 검토하세요.`);
        else out.push(`입장 대비 구매율 ${Math.round(d.conv * 100)}% — 들어온 손님은 잘 사 갑니다. 손님 수를 늘리는 것이 핵심이에요.`);
        if (d.items[0]) out.push(`가장 많이 팔린 메뉴는 '${d.items[0].label}' (${d.items[0].n}회). 이 메뉴를 찾는 손님이 많은 시즌 후반(생존자가 적고 HP가 낮을 때)에 매출이 몰릴 가능성이 큽니다.`);
        if (d.refused) out.push("입장이 확률로 거절되는 가게라 입장료 수익은 꾸준하지만 구매는 줄어듭니다 — 단골이 생기도록 같은 맵을 오래 유지하는 전략도 좋습니다.");
    }
    if (T.market) out.push("상품은 손님마다 라운드당 1개가 랜덤으로 뜹니다. 손님이 많을수록 비싼 상품이 뜰 기회도 늘어나요.");
    out.push("Business Gold는 은행에서 일반 골드로 송금해야 쓸 수 있습니다 — 송금액 구간이 높을수록 수수료가 크니 10,000 BG 이하로 나눠 보내는 것도 방법입니다.");
    return out;
}
export function saveReport(pid, biz, snap) {
    const list = (B().reports[pid] ||= []);
    list.unshift({ id: uid("rp"), bizId: biz.id, type: biz.type, loc: biz.loc, at: now(), snap });
    B().reports[pid] = list.slice(0, 20);
    save();
}
export const reportsOf = pid => B().reports[pid] || [];

roundHooks.push(() => processTransfers());
seasonEndHooks.push(s => { s.status = "done"; processTransfers({ endSeason: true }); });
