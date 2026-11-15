// =====================================================================
// 🎟️ Lotto corner (turn tab): 시즌 로또 · 비시즌 로또 · 연금 로또 · 로또 상점
// Rules / state: game/lotto.js. The draw shows run with the turn clock
// paused (no play time used, no NPC visits) — see `hold` in lottoView.
// =====================================================================
import { h, sleep, fmt, countUp } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, modal, confirmBox, Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import * as LT from "../game/lotto.js";
import { avatar, displayName } from "../ui/profile.js";

const nm = pid => displayName(Store.player(pid));
let sub = "season";              // open sub-tab (kept between re-renders)
const room = {};                 // kind → pid inside the registration room (one try)

// ---------------------------------------------------------------- tab
// opts: { hold() → release, onChange() }
export function lottoView(pid, opts = {}) {
    LT.L();
    const wrap = h("div.lotto");
    const tabs = [["season", "🎟️ 시즌 로또"], ["off", "🌙 비시즌 로또"], ["pension", "🏦 연금 로또"], ["shop", "🛒 로또 상점"]];
    const draw = () => {
        wrap.replaceChildren(
            h("div.lotto-tabs", tabs.map(([k, label]) => h("button.lotto-tab" + (k === sub ? ".on" : ""), { onclick: () => { sub = k; draw(); } }, label))),
            sub === "shop" ? shopPanel(pid, () => { draw(); opts.onChange?.(); }) : lottoPanel(sub, pid, { ...opts, redraw: () => { draw(); opts.onChange?.(); } }));
    };
    draw();
    return wrap;
}

function promo(K) {
    return h("div.lotto-promo." + K.id,
        h("div.lp-spark", "✨", h("i", "✦"), h("i", "✧"), h("i", "✦")),
        h("div.lp-label", `${K.emoji} ${K.name} 당첨금`),
        h("div.lp-prize", `${fmt(K.prize)} G`, K.pension ? h("small", " / 매 라운드") : null),
        h("div.lp-sub", K.fee ? `참가비 ${fmt(K.fee)} G · ` : "참가비 무료 · ", K.per === "round" ? h("b", "라운드당 1회 등록") : h("b.em", "시즌당 1회 등록!"), ` · ${K.size}자리`));
}

function slotEl(kind, x, i, { pickable = false, onPick = null, mine = null } = {}) {
    if (!x) return h("button.lslot.empty" + (pickable ? ".pick" : ""), { disabled: !pickable, onclick: onPick ? () => onPick(i) : null }, h("span.ls-no", i + 1));
    if (x.block) return h("div.lslot.blocked", h("span.ls-no", i + 1), h("div.ls-block", "🚫"), h("small", "BLOCK"));
    return h("div.lslot.taken" + (x.pid === mine ? ".mine" : ""), h("span.ls-no", i + 1), avatar(x.pid, 46, { effect: false }),
        h("small.ls-name", nm(x.pid)), kind !== "season" ? h("small.ls-season", `시즌 ${x.season}`) : null);
}

function lottoPanel(kind, pid, opts) {
    const K = LT.LOTTO[kind], b = LT.board(kind), st = LT.status(kind);
    const inRoom = room[kind] === pid && st.open;
    const pick = inRoom && LT.pickMode(kind);
    let blocking = false;
    const grid = h("div.lotto-grid.n" + K.size, b.slots.map((x, i) => slotEl(kind, x, i, { mine: pid, pickable: pick || blocking, onPick: i => blocking ? doBlock(i) : doRegister(i) })));
    const busy = { v: false };
    const msg = h("p.lotto-msg");
    const say = (t, cls = "") => { msg.textContent = t; msg.className = "lotto-msg " + cls; };

    async function doRegister(pickIdx = null) {
        if (busy.v) return; busy.v = true;
        const r = LT.register(kind, pid, pickIdx);
        if (!r) { busy.v = false; return toast(K.fee ? "참가비가 부족하거나 고를 수 없는 자리입니다" : "고를 수 없는 자리입니다", "warn"); }
        // the random draw light
        if (!pickIdx && pickIdx !== 0) await rollLight(grid, r.idx);
        if (r.ok) {
            Sound.fanfare(); confetti(40, ["🎟️", "✨"]);
            room[kind] = null;
            toast(`${K.emoji} ${r.idx + 1}번 자리에 등록되었습니다!`, "ok", 3500);
        } else if (!r.occupant.block && r.occupant.pid !== pid && LT.itemCount(pid, "lotto_swap") > 0 && LT.ownCount(kind, pid) < K.maxOwn
            && await confirmBox(`${r.idx + 1}번 자리에는 이미 ${nm(r.occupant.pid)}의 프로필이 등록되어 있습니다.\n🔄 등록자 교체권으로 해당 프로필을 본인 프로필로 교체하여 등록하시겠습니까?`, "Yes, 교체", "No")) {
            LT.replace(kind, pid, r.idx);
            Sound.bonus(); confetti(30, ["🔄", "🎟️"]);
            room[kind] = null;
            toast(`🔄 ${r.idx + 1}번 자리를 내 프로필로 교체했습니다!`, "ok", 3500);
        } else {
            Sound.lose();
            room[kind] = null;
            toast(`💦 ${r.idx + 1}번 자리는 이미 ${r.occupant.block ? "Block된 자리" : r.occupant.pid === pid ? "내가 등록한 자리" : `${nm(r.occupant.pid)}의 자리`}입니다 — 이번 등록 실패`, "warn", 4000);
        }
        busy.v = false;
        await afterChange();
    }
    async function doBlock(i) {
        blocking = false;
        if (!(await confirmBox(`🚫 Slot Block권을 사용해 ${i + 1}번 자리를 막을까요?\n막힌 자리는 등록된 것으로 치지만 당첨 후보에서는 빠집니다.`, "막기", "취소"))) return opts.redraw();
        if (LT.block(kind, pid, i)) { Sound.stop(); toast(`🚫 ${i + 1}번 자리 Block!`, "ok"); }
        await afterChange();
    }
    // a full board pays out right away
    async function afterChange() {
        if (kind === "season" ? LT.seasonDue() && LT.isFull("season") : LT.isFull(kind)) await runDraw(kind, opts.hold);
        opts.redraw();
    }

    const enterBtn = h("button.btn.gold.big", { onclick: async () => {
        const c = LT.canTry(kind, pid);
        if (!c.ok) return toast(c.why, "warn", 3500);
        if (c.dup && !(await confirmBox(`${LT.SHOP_BY_ID[K.dup].emoji} ${LT.SHOP_BY_ID[K.dup].name} 1장을 사용해 한 번 더 등록에 도전할까요?\n(등록실 입장은 60% 확률입니다)`, "사용하기", "취소"))) return;
        const r = LT.beginTry(kind, pid);
        if (!r) return;
        await gate(r.allowed);
        if (r.allowed) room[kind] = pid;
        opts.redraw();
    } }, `🚪 ${K.name} 등록실 입장 시도`);

    const regBtn = h("button.btn.red.huge.lotto-go", { onclick: () => doRegister() }, `🎟️ 로또 등록${K.fee ? ` (${fmt(K.fee)} G)` : ""}`);
    const blockBtn = h("button.btn.small.ghost", { onclick: () => {
        const c = LT.canBlock(kind, pid);
        if (!c.ok) return toast(c.why, "warn", 3500);
        blocking = true;
        grid.querySelectorAll(".lslot.empty").forEach(el => { el.disabled = false; el.classList.add("pick", "blockpick"); });
        say("🚫 막을 빈자리를 클릭하세요", "warn");
    } }, `🚫 Slot Block 사용 (${LT.itemCount(pid, "lotto_block")})`);

    const n = LT.filled(kind);
    let action;
    if (!st.open) action = h("div.lotto-closed", h("b", st.paid ? "🔒 로또가 이미 지급되었습니다" : "🔒 " + st.why), st.paid && b.drawn?.winner != null ? h("div.lc-win", avatar(b.drawn.winner, 40, { effect: false }), ` 당첨자: ${nm(b.drawn.winner)}`) : null);
    else if (inRoom) action = h("div.lotto-room",
        h("div.lr-title", "🎉 등록실 입장 완료!"),
        pick ? h("p.lr-pick", `✋ PICK 등록: 남은 ${K.size - n}자리 중 원하는 빈자리를 직접 클릭하세요`) : h("p", "버튼을 누르면 랜덤한 번호의 자리에 내 프로필이 들어갑니다. 이미 누군가 있는 자리가 걸리면 이번 등록은 실패!"),
        pick ? null : regBtn);
    else {
        const c = LT.canTry(kind, pid);
        action = h("div.lotto-enter", enterBtn, c.ok ? null : h("small.muted", c.why));
    }
    const mineN = LT.ownCount(kind, pid);
    return h("div.lotto-panel." + kind,
        h("div.lotto-head", promo(K), h("button.lotto-log", { title: "당첨자 내역", onclick: () => historyModal(kind) }, "📜", h("small", "당첨 내역"))),
        h("div.lotto-info",
            h("span", `등록 ${n} / ${K.size}`),
            K.pickAt != null ? h("span" + (LT.pickMode(kind) ? ".hot" : ""), LT.pickMode(kind) ? "✋ PICK 등록 중" : `🎲 랜덤 등록 (${K.pickAt}자리 이후 PICK)`) : null,
            h("span", `내 자리 ${mineN} / 최대 ${K.maxOwn}`),
            h("span", `${LT.SHOP_BY_ID[K.dup].emoji} 중복권 ${LT.itemCount(pid, K.dup)} · 🔄 교체권 ${LT.itemCount(pid, "lotto_swap")}`),
            kind === "season" ? h("span.muted", `6자리가 다 차거나 생존자 ${LT.SEASON_DRAW_ALIVE}명이 되면 바로 추첨`) : h("span.muted", `${K.size}자리가 다 차면 추첨 · 시즌이 끝나도 계속`)),
        action, msg,
        grid,
        st.open ? h("div.row.center", blockBtn) : null,
        h("p.muted.small", "* 같은 로또에 여러 자리를 등록하면 당첨 확률이 조금 올라갈 뿐, 당첨이 보장되지는 않습니다."));
}

// the random slot: a light hops around, slows down, lands
async function rollLight(grid, idx) {
    const cells = [...grid.children];
    let gap = 45, i = Math.floor(Math.random() * cells.length);
    const total = cells.length * 2 + ((idx - i + cells.length * 3) % cells.length);
    for (let k = 0; k <= total; k++) {
        cells.forEach(c => c.classList.remove("hot"));
        cells[(i + k) % cells.length].classList.add("hot");
        total - k < 5 ? Sound.heartbeat() : Sound.tick();
        await sleep(gap);
        gap = total - k < 8 ? gap * 1.3 : gap * 1.02;
    }
    await sleep(350);
    cells.forEach(c => c.classList.remove("hot"));
}

// 60% / 40% door
async function gate(allowed) {
    const door = h("div.lotto-door", h("div.ld-ico", "🚪"), h("div.ld-txt", "등록실 문지기가 확인 중…"));
    const m = modal(door, { title: "🎟️ 로또 등록실", closable: false });
    for (let k = 0; k < 6; k++) { Sound.heartbeat(); await sleep(320); }
    door.replaceChildren(h("div.ld-ico", allowed ? "🙆" : "🙅"), h("h2", allowed ? "등록실 입장 허가!" : "등록실 입장 거부!"),
        h("p", allowed ? "안으로 들어가 로또를 등록하세요" : "문지기가 막아섰습니다… 다음 기회에!"),
        h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
    allowed ? Sound.fanfare() : Sound.lose();
    await m.closed;
}

// ---------------------------------------------------------------- shop
function shopPanel(pid, redraw) {
    const ps = G.S().ps[pid];
    return h("div.lotto-shop",
        h("div.lotto-wallet", h("span", `💰 ${fmt(ps.money)} G`), h("span", `💎 ${ps.points} P`)),
        h("div.lshop-grid", LT.LOTTO_SHOP.map(it => h("div.lshop-item",
            h("div.lsi-ico", it.emoji), h("b", it.name), h("p", it.text),
            h("div.lsi-own", `보유 ${LT.itemCount(pid, it.id)}개 · 1회 소모`),
            h("button.btn.gold", { onclick: async () => {
                if (!(await confirmBox(`${it.emoji} ${it.name}을(를) ${it.pts ? `${it.pts} P` : `${fmt(it.gold)} G`}에 살까요?`, "구입", "취소"))) return;
                const r = LT.buy(pid, it.id);
                if (!r.ok) return toast(r.why || "구입 실패", "warn");
                Sound.coin(); toast(`${it.emoji} ${it.name} 구입!`, "ok");
                redraw();
            } }, it.pts ? `${it.pts} P` : `${fmt(it.gold)} G`)))),
        h("p.muted.small", "중복 등록권 + 등록자 교체권을 함께 쓰면 시즌 로또 최대 3자리, 비시즌·연금 로또 최대 5자리까지 내 프로필을 등록할 수 있습니다. 상점 아이템은 이번 시즌 동안만 보관됩니다."));
}

// ---------------------------------------------------------------- history
function historyModal(kind) {
    const K = LT.LOTTO[kind], list = LT.historyOf(kind);
    modal(h("div.lotto-hist",
        list.length ? list.map(r => h("div.lh-row",
            h("span.lh-no", kind === "season" ? `시즌 ${r.season}` : `제 ${r.no}회 · 시즌 ${r.season} R${r.round}`),
            r.winner != null ? [avatar(r.winner, 36, { effect: false }), h("b", nm(r.winner))] : h("span.muted", "당첨자 없음"),
            h("span.lh-amt", r.winner != null ? `${fmt(r.amount)} G${K.pension ? " / 라운드" : ""}` : "-"),
            h("small.muted", new Date(r.at).toLocaleDateString())))
            : h("p.muted.center", "아직 당첨자가 없습니다")), { title: `📜 ${K.emoji} ${K.name} 당첨자 내역` });
}

// ---------------------------------------------------------------- the draw shows
// hold() pauses the turn clock (play time not counted, no NPC visits) and returns the release
export async function runDraw(kind, hold = null) {
    const release = hold ? hold() : () => { };
    const act = Activity.hold();
    try {
        if (kind === "season") { const r = LT.drawSeason(); if (r) await seasonShow(r); }
        else { const r = LT.drawBig(kind); if (r) await bigShow(kind, r); }
    } finally { act(); release(); }
}
// turn start with ≤ 10 survivors (or a full board left over): pay the season lotto now
export async function seasonLottoCheck(hold = null) {
    if (!G.S() || !LT.seasonDue()) return false;
    await runDraw("season", hold);
    return true;
}

// a low drone + heartbeat while the show runs
function tension() {
    let on = true, k = 0;
    const id = setInterval(() => { if (!on) return; Sound.heartbeat(); if (++k % 4 === 0) Sound.tease(); }, 700);
    return () => { on = false; clearInterval(id); };
}

function overlay(title, sub) {
    const stage = h("div.lshow-stage");
    const subEl = h("div.lshow-sub", sub);
    const ov = h("div.lotto-ov", h("div.lshow-rays"), h("div.lshow-title", title), subEl, stage);
    document.body.append(ov);
    return { ov, stage, sub: t => { subEl.textContent = t; }, close: async () => { ov.classList.add("out"); await sleep(350); ov.remove(); } };
}
const card = (pid, i) => h("div.lshow-card", { "data-i": i }, avatar(pid, 72, { effect: false }), h("small", nm(pid)));

async function hop(cards, target, laps = 3, gap0 = 60) {
    let gap = gap0, i = Math.floor(Math.random() * cards.length);
    const total = cards.length * laps + ((target - i + cards.length * 9) % cards.length);
    for (let k = 0; k <= total; k++) {
        cards.forEach(c => c.classList.remove("hot"));
        cards[(i + k) % cards.length].classList.add("hot");
        total - k < 6 ? Sound.heartbeat() : Sound.tick();
        await sleep(gap);
        gap = total - k < 9 ? gap * 1.32 : gap * 1.03;
    }
}

async function seasonShow({ list, winner, where }) {
    if (!winner) { Sound.lose(); toast("🎟️ 시즌 로또: 등록된 프로필이 없어 당첨자 없이 마감되었습니다", "warn", 4500); return; }
    if (list.length > 1) {
        const o = overlay("🎟️ 시즌 로또 추첨", `등록된 ${list.length}자리 중 단 한 명!`);
        const stop = tension();
        const cards = list.map((e, i) => card(e.pid, i));
        o.stage.append(h("div.lshow-row", cards));
        await sleep(900);
        await hop(cards, list.indexOf(winner), 4);
        stop();
        cards[list.indexOf(winner)].classList.add("chosen");
        Sound.boom();
        await sleep(1400);
        await o.close();
    }
    await celebrate(winner.pid, LT.LOTTO.season, where);
}

async function bigShow(kind, { slots, cands, out1, out2, final, winner, where }) {
    const K = LT.LOTTO[kind];
    if (!winner) { await celebrate(null, K, null); return; }
    const o = overlay(`${K.emoji} ${K.name} 추첨`, `${K.size}자리가 모두 찼습니다! 당첨 후보 ${cands.length}명을 먼저 뽑습니다…`);
    const stop = tension();
    const all = slots.map((x, i) => x && !x.block ? h("div.lshow-mini", { "data-i": i }, avatar(x.pid, 40, { effect: false })) : h("div.lshow-mini.blk", x ? "🚫" : ""));
    const pool = h("div.lshow-pool.n" + K.size, all);
    const row = h("div.lshow-row.cands");
    o.stage.append(pool, row);
    await sleep(1000);
    // 1) five candidates, one at a time
    const live = all.filter(el => !el.classList.contains("blk"));
    const candCards = new Map();
    for (const c of cands) {
        const target = live.findIndex(el => +el.dataset.i === c.idx);
        await hop(live, target, 1, 22);
        live[target].classList.add("picked");
        Sound.boom();
        const cc = card(c.pid, c.idx);
        candCards.set(c, cc); row.append(cc);
        await sleep(500);
    }
    live.forEach(el => el.classList.remove("hot"));
    pool.classList.add("dim");
    o.sub(`당첨 후보 ${cands.length}명 확정! 이제 한 명씩 떨어집니다…`);
    await sleep(1600);
    const knock = async (group, text) => {
        if (!group.length) return;
        o.sub(text);
        const left = [...candCards.entries()].filter(([, el]) => !el.classList.contains("out")).map(([, el]) => el);
        for (const c of group) {
            await hop(left, left.indexOf(candCards.get(c)), 2);
            left.forEach(el => el.classList.remove("hot"));
            candCards.get(c).classList.add("out");
            Sound.lose();
            left.splice(left.indexOf(candCards.get(c)), 1);
            await sleep(900);
        }
    };
    await knock(out1, `💥 후보 ${out1.length}명 탈락!`);
    await knock(out2, "💥 한 명 더 탈락…");
    o.sub(final.length > 1 ? "🔥 마지막 두 명! 당첨자는…?" : "🔥 당첨자는…?");
    await sleep(1200);
    const fin = final.map(c => candCards.get(c));
    for (let k = 0; k < 14; k++) { fin.forEach((el, i) => el.classList.toggle("hot", i === k % fin.length)); Sound.heartbeat(); await sleep(180 + k * 25); }
    fin.forEach(el => el.classList.remove("hot"));
    final.filter(c => c !== winner).forEach(c => candCards.get(c).classList.add("out"));
    candCards.get(winner).classList.add("chosen");
    stop();
    Sound.boom();
    await sleep(1500);
    await o.close();
    await celebrate(winner.pid, K, where);
}

// the winner: rays, confetti, coins flying into the purse, count-up
async function celebrate(pid, K, where) {
    const num = h("div.lcel-num", "0");
    const coins = h("div.lcel-coins", Array.from({ length: 24 }, (_, i) => h("i", { style: { "--i": i, "--x": `${Math.random() * 100}%`, "--d": `${(Math.random() * 1.6).toFixed(2)}s` } }, i % 3 ? "🪙" : "💵")));
    const btn = h("button.btn.gold.big", "확인");
    const ov = h("div.lotto-ov.cel", h("div.lshow-rays"), pid != null ? coins : null,
        h("div.lshow-title", pid != null ? `🎉 ${K.name} 당첨! 🎉` : `${K.name} 마감`),
        pid != null ? h("div.lcel-win", avatar(pid, 170), h("h2", nm(pid))) : h("p.lcel-none", "등록된 프로필이 없어 당첨자 없이 마감되었습니다"),
        pid != null ? num : null,
        pid != null ? h("div.lcel-note", K.pension ? "앞으로 매 시즌 · 매 라운드 참가할 때마다 10,000 G를 받습니다!" : where === "wallet" ? "탈락/비참가 상태라 다음 시즌 참가 시 당첨금이 지급됩니다" : "당첨금이 보유금액에 바로 지급되었습니다!") : null,
        btn);
    document.body.append(ov);
    if (pid != null) { Sound.jackpot(); setTimeout(() => Sound.fanfare(), 900); confetti(160, ["🎉", "🪙", "💰", "✨", "🎟️"]); }
    else Sound.lose();
    if (pid != null) await countUp(num, 0, K.prize, 2200);
    if (pid != null) { num.append(h("small", " G")); Sound.cash(); }
    await new Promise(r => btn.onclick = r);
    ov.classList.add("out"); await sleep(350); ov.remove();
}
