// =====================================================================
// 🏦 Business Bank corner (game/bank.js) — TOP 10 career + 1,000G door.
//   1) 계좌 개설 (3-step review)  2) Business Gold 송금  3) 은행 상점
// The 📲 Remote 은행 이용권 opens the same desk as a popup, without 1).
// =====================================================================
import { h, fmt, sleep } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, confetti, Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import { ITEM_BY_ID } from "../data/catalog.js";
import { BANK_FEE, BANK_SHOP, TX_TIERS, TX_FREE_PER_SEASON, TX_EXTRA_MAX, TX_MIN_ALIVE } from "../data/business.js";
import * as G from "../game/season.js";
import * as BK from "../game/bank.js";
import { displayName } from "../ui/profile.js";
import { priceLabel, canPay, pay } from "./shop.js";

const nameOf = pid => displayName(Store.player(pid));
export const dateOf = iso => { const d = new Date(iso); return isNaN(d) ? "-" : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; };
const shopCost = it => ({ gold: it.gold || 0, pts: it.pts || 0 });

export function bankView(pid, { turn = null, onChange = () => { }, remote = false } = {}) {
    const ps = G.S().ps[pid];
    const wrap = h("div.bk-view" + (remote ? ".remote" : ""));
    let tab = remote ? "tx" : "open";
    const head = () => h("div.bk-head", h("span.bk-logo", "🏦"), h("div",
        h("h3", "Business Bank", remote ? h("small.bk-remote", " 📲 REMOTE") : null),
        h("small.muted", `TOP 10 경력자 전용 · 입장료 ${fmt(BANK_FEE)}G · 은행 상점은 라운드당 1회`)));
    const render = () => {
        if (!BK.bankEligible(pid)) { wrap.replaceChildren(head(), h("p.notice.warn", "🚫 지난 시즌 TOP 10 경력이 있는 플레이어만 Business Bank를 이용할 수 있습니다.")); return; }
        // the door: paid once per visit (per turn); remote use is already paid by the ticket
        if (!remote && turn && !turn.bankPaid) {
            wrap.replaceChildren(head(), h("div.bk-door",
                h("div.bk-door-ico", "🚪"),
                h("p", "Business Bank에 오신 것을 환영합니다."),
                h("p.muted", `나의 경력: ${G.honorRecordText(pid, 10) || (G.S().sandbox ? "테스트 모드" : "-")}`),
                h("button.btn.gold.big", { disabled: ps.money < BANK_FEE, onclick: enter }, ps.money < BANK_FEE ? "골드 부족" : `입장료 ${fmt(BANK_FEE)}G 내고 입장`)));
            return;
        }
        const tabs = [...(remote ? [] : [["open", "① 계좌 개설"]]), ["tx", "② Business Gold 송금"], ["shop", "③ 은행 상점"]];
        wrap.replaceChildren(head(),
            h("div.bk-tabs", tabs.map(([k, l]) => h("button.bk-tab" + (k === tab ? ".on" : ""), { onclick: () => { tab = k; render(); } }, l))),
            tab === "open" ? openPane() : tab === "tx" ? txPane() : shopPane());
    };
    function enter() {
        if (turn && turn.remaining <= 0) return toast("⏰ 플레이 시간이 끝났습니다", "warn");
        if (ps.money < BANK_FEE) return toast("입장료가 부족합니다", "warn");
        ps.money -= BANK_FEE; turn.bankPaid = true;
        G.log(`🏦 ${G.name(pid)} Business Bank 입장 (${fmt(BANK_FEE)}G)`);
        Store.saveSeason(); Sound.coin(); onChange(); render();
    }

    // ---------------------------------------------------------------- ① account
    function openPane() {
        const a = BK.account(pid);
        if (a) return h("div.bk-pane", h("p.notice.ok", "✅ 이미 Business Bank 계좌가 있습니다."), accountCard(a, { mine: true }));
        const can = BK.canApply(pid);
        return h("div.bk-pane",
            h("div.bk-steps",
                h("div.bk-step", h("b", "1"), h("span", "시즌 전적 심사"), h("small", `${20}위(꼴찌) 기록이 있으면 거절`)),
                h("div.bk-step", h("b", "2"), h("span", "대출 이력 심사"), h("small", "미상환 대출이 있으면 거절 · 기록이 없으면 통과")),
                h("div.bk-step", h("b", "3"), h("span", "최종 심사"), h("small", "확률 심사"))),
            h("div.row.center", h("button.btn.gold.big", { disabled: !can, onclick: apply }, can ? "🏦 계좌 개설 신청" : "이번 라운드 신청 완료 — 다음 라운드에 다시")));
    }
    async function apply() {
        if (turn && turn.remaining <= 0) return toast("⏰ 플레이 시간이 끝났습니다", "warn");
        const done = Activity.hold();
        const steps = ["시즌 전적을 심사중입니다", "대출 이력을 심사중입니다", "최종 심사중입니다"];
        const rows = steps.map(t => h("div.bk-rv-row", h("span.bk-rv-ico", "⏳"), h("span", t), h("div.bk-bar", h("i"))));
        const out = h("div.bk-rv-out");
        const m = modal(h("div.bk-review", rows, out), { title: "🏦 계좌 개설 심사", closable: false, cls: "bk-modal" });
        const res = BK.reviewAccount(pid);
        try {
            const r = await res;
            for (let i = 0; i < 3; i++) {
                const row = rows[i]; row.classList.add("run");
                for (let k = 0; k < 12; k++) { row.querySelector("i").style.width = ((k + 1) / 12 * 100) + "%"; Sound.tick(); await sleep(130); }
                const failHere = !r.ok && r.step === i + 1;
                row.classList.remove("run"); row.classList.add(failHere ? "no" : "yes");
                row.querySelector(".bk-rv-ico").textContent = failHere ? "❌" : "✅";
                if (i === 1 && !failHere && r.loanNote) row.append(h("small.muted", ` (${r.loanNote})`));
                if (failHere) { Sound.lose(); out.replaceChildren(h("p.bk-no", "계좌 개설이 거절되었습니다"), h("p.muted", r.why)); break; }
                await sleep(250);
            }
            if (r.ok) {
                Sound.fanfare(); confetti(60, ["🏦", "💳", "✨"]);
                out.replaceChildren(h("p.bk-yes", "🎉 계좌가 개설되었습니다!"), h("div.bk-code-big", r.account.code), h("p.muted", "이 4자리 코드가 계좌번호입니다. 송금과 비즈니스 매입에 사용됩니다."));
            }
        } finally { done(); }
        out.append(h("div.row.center", h("button.btn.gold", { onclick: () => m.close() }, "확인")));
        await m.closed;
        onChange(); render();
    }

    // ---------------------------------------------------------------- ② transfer
    let looked = null;
    function txPane() {
        const input = h("input.bk-code-in", { maxlength: 4, placeholder: "ABCD", value: looked?.code || "", oninput: e => e.target.value = e.target.value.toUpperCase() });
        const result = h("div.bk-look");
        const look = () => {
            const a = BK.accountByCode(input.value);
            if (!a) { looked = null; result.replaceChildren(h("p.notice.warn", "존재하지 않는 계좌 코드입니다")); return; }
            if (a.pid !== +pid) { looked = null; result.replaceChildren(h("p.notice.warn", "본인 계좌만 조회 · 송금할 수 있습니다")); return; }
            looked = a; result.replaceChildren(accountCard(a, { mine: true, send: true }));
        };
        if (looked) look();
        const t = BK.txStatus(pid);
        return h("div.bk-pane",
            h("div.bk-codebar", h("label", "계좌 코드"), input, h("button.btn.gold.small", { onclick: look }, "조회"),
                h("button.btn.ghost.small", { onclick: () => codeSearch(c => { input.value = c; look(); }) }, "🔎 내 코드 검색")),
            result,
            h("div.bk-rules",
                h("b", "송금 규칙"),
                h("ul",
                    h("li", `시즌당 ${TX_FREE_PER_SEASON}회 (추가 송금권으로 최대 ${TX_EXTRA_MAX}회 더) — 이번 시즌: 기본 ${t.free ? "남음" : "사용함"} · 추가 ${t.extraUsed}/${TX_EXTRA_MAX}`),
                    h("li", "수수료는 일반 골드로 냅니다: ", TX_TIERS.map(x => `${x.label} ${Math.round(x.rate * 100)}%`).join(" · ")),
                    h("li", "일반 송금은 이번 라운드와 다음 라운드가 끝난 뒤 입금 · ⚡ 빠른 송금 서비스는 즉시 입금"),
                    h("li", `생존자가 ${TX_MIN_ALIVE - 1}명 이하이면 ⚡ 빠른 송금만 가능 · 송금 후 탈락해도 입금은 완료됩니다 (다음 시즌 지갑)`))),
            pendingList());
    }
    function pendingList() {
        const list = BK.pendingOf(pid);
        if (!list.length) return null;
        return h("div.bk-pending", h("b", "⏳ 입금 대기 중"), list.map(x => h("div.bk-pend-row", h("span", `${fmt(x.amount)} G`), h("small.muted", `ROUND ${x.due} 시작 때 입금 (시즌 ${x.season})`))));
    }
    async function send(a) {
        if (turn && turn.remaining <= 0) return toast("⏰ 플레이 시간이 끝났습니다", "warn");
        const t = BK.txStatus(pid);
        if (!t.can) return toast(t.why, "warn", 3600);
        const amt = h("input.bk-amt", { type: "number", min: 1, max: Math.min(1000000, a.bgold), placeholder: "송금액 (BG)" });
        const fastBox = h("input", { type: "checkbox", disabled: !t.fastHave, checked: t.fewLeft && t.fastHave > 0 });
        const info = h("div.bk-fee");
        const tiers = h("div.bk-tiers", TX_TIERS.map(x => h("div.bk-tier", { "data-t": x.id }, h("span", x.label), h("b", `${Math.round(x.rate * 100)}%`))));
        const upd = () => {
            const v = Math.floor(+amt.value || 0), tier = BK.tierOf(v);
            tiers.querySelectorAll(".bk-tier").forEach(el => el.classList.toggle("on", el.dataset.t === tier?.id));
            if (!tier) { info.replaceChildren(h("span.muted", "1 ~ 1,000,000 BG")); return; }
            const fee = Math.ceil(v * tier.rate);
            info.replaceChildren(h("span", `수수료 ${Math.round(tier.rate * 100)}% = `), h("b" + (fee > ps.money ? ".down" : ""), `${fmt(fee)} G`), h("small.muted", ` (보유 ${fmt(ps.money)} G)`),
                v > a.bgold ? h("div.down", "잔액보다 많습니다") : null);
        };
        amt.oninput = upd; upd();
        const ok = h("button.btn.gold", "송금하기");
        const m = modal(h("div.bk-send",
            h("p", `잔액 `, h("b", `${fmt(a.bgold)} BG`), ` · 계좌 ${a.code}`),
            amt, tiers, info,
            h("label.bk-fast", fastBox, ` ⚡ 빠른 송금 서비스 사용 (보유 ${t.fastHave}) — 즉시 입금`),
            t.fewLeft ? h("p.notice.warn", `생존자 ${TX_MIN_ALIVE - 1}명 이하: 빠른 송금만 가능합니다`) : null,
            !t.free ? h("p.notice", `➕ 추가 송금권 1장을 사용합니다 (남은 추가 송금 ${TX_EXTRA_MAX - t.extraUsed}회)`) : null,
            h("div.row.end", h("button.btn.ghost", { onclick: () => m.close() }, "취소"), ok)), { title: "💸 Business Gold 송금", cls: "bk-modal" });
        ok.onclick = async () => {
            const r = BK.requestTransfer(pid, a.code, amt.value, { fast: fastBox.checked });
            if (!r.ok) return toast(r.why, "warn", 3600);
            m.close();
            await transferShow(r.tx);
            onChange(); render();
        };
    }
    async function transferShow(tx) {
        const done = Activity.hold();
        const coin = h("div.bk-fly", "💰");
        const m = modal(h("div.bk-xfer", h("div.bk-xfer-row", h("span.bk-x-ico", "🏦"), h("div.bk-x-lane", coin), h("span.bk-x-ico", tx.fast ? "👛" : "⏳")),
            h("p", h("b", `${fmt(tx.amount)} BG`), " → ", tx.fast ? "지금 바로 입금!" : `ROUND ${tx.due} 시작 때 입금`), h("small.muted", `수수료 ${fmt(tx.fee)} G 차감`)), { title: "💸 송금 중", closable: false, cls: "bk-modal" });
        Sound.whoosh(); await sleep(1300);
        tx.fast ? (Sound.cash(), confetti(30, ["💰"])) : Sound.coin();
        m.box.querySelector(".bk-xfer").append(h("div.row.center", h("button.btn.gold", { onclick: () => m.close() }, "확인")));
        await m.closed; done();
    }

    // ---------------------------------------------------------------- ③ shop
    function shopPane() {
        const left = BK.bankBuyLeft(pid);
        return h("div.bk-pane",
            h("p.muted", left ? "은행 상점은 라운드당 1개만 살 수 있습니다." : "이번 라운드 은행 상점 구매 완료"),
            h("div.shop-grid", BANK_SHOP.map(it => {
                const e = ITEM_BY_ID[it.id], c = shopCost(it), ok = left && canPay(ps, c);
                return h("div.sitem",
                    h("div.sitem-art", h("div.big-emoji", e.emoji)), h("div.sitem-name", e.name), h("div.sitem-desc", e.desc),
                    ps.items[it.id] ? h("small.have", `보유 ${ps.items[it.id]}`) : null,
                    h("button.btn.small" + (ok ? ".gold" : ".ghost"), { disabled: !ok, onclick: () => buy(it, e, c) }, priceLabel(c)));
            })));
    }
    function buy(it, e, c) {
        if (!BK.bankBuyLeft(pid)) return toast("은행 상점은 라운드당 1회만 이용할 수 있습니다", "warn");
        if (!canPay(ps, c)) return toast("잔액이 부족합니다", "warn");
        pay(ps, c); BK.noteBankBuy(pid);
        ps.items[it.id] = (ps.items[it.id] || 0) + 1;
        G.log(`🏦 ${G.name(pid)} 은행 상점 구매: ${e.name}`);
        Store.saveSeason(); Sound.coin(); toast(`${e.emoji} ${e.name} 구매!`, "ok");
        onChange(); render();
    }

    function accountCard(a, { mine = false, send: canSend = false } = {}) {
        return h("div.bk-card",
            h("div.bk-card-top", h("span.bk-chip"), h("span.bk-brand", "BUSINESS BANK")),
            h("div.bk-card-code", a.code),
            h("div.bk-card-grid",
                h("div", h("small", "예금주"), h("b", nameOf(a.pid))),
                h("div", h("small", "개설일"), h("b", `${dateOf(a.openedAt)} (S${a.season})`)),
                h("div", h("small", "Business Gold"), h("b.bk-bg", `${fmt(a.bgold)} BG`))),
            canSend ? h("div.row.end", h("button.btn.gold", { disabled: !(a.bgold > 0), onclick: () => send(a) }, "💸 송금하기")) : null,
            mine && a.history?.length ? h("details.bk-hist", h("summary", "거래 내역"), a.history.slice(0, 30).map(x => h("div.bk-hist-row", h("small.muted", dateOf(x.t)), h("span", x.note), h("b" + (x.amount < 0 ? ".down" : ".up"), x.amount ? `${x.amount > 0 ? "+" : ""}${fmt(x.amount)}` : "")))) : null);
    }
    render();
    return wrap;
}

// 🔎 code lookup by player name → onPick(code)
export function codeSearch(onPick) {
    const q = h("input", { placeholder: "플레이어 이름" });
    const list = h("div.bk-search-list");
    const run = () => {
        const r = BK.searchCodes(q.value);
        list.replaceChildren(...(r.length ? r.map(({ a, p }) => h("button.bk-search-row", { onclick: () => { m.close(); onPick(a.code); } }, h("span", displayName(p)), h("b", a.code)))
            : [h("p.muted", q.value ? "찾는 계좌가 없습니다" : "이름을 입력하세요")]));
    };
    q.oninput = run;
    const m = modal(h("div.bk-search", q, list), { title: "🔎 내 코드 검색", cls: "bk-modal" });
    run(); setTimeout(() => q.focus(), 50);
}

// 📲 Remote 은행 이용권 → the desk as a popup (no account opening)
export async function remoteBank(pid, onChange) {
    const ps = G.S().ps[pid];
    if (!(ps.items.remote_bank > 0)) return;
    if (!BK.bankEligible(pid)) return toast("TOP 10 경력자만 은행을 이용할 수 있습니다", "warn");
    if (!(await confirmBox("📲 Remote 은행 이용권 1장을 사용해 Business Bank를 팝업으로 엽니다.\n(송금 · 은행 상점만 이용 가능)", "열기", "취소"))) return;
    ps.items.remote_bank--;
    G.log(`📲 ${G.name(pid)} Remote 은행 이용`);
    Store.saveSeason();
    const m = modal(bankView(pid, { remote: true, onChange }), { title: "📲 Remote Business Bank", wide: true, cls: "bk-modal" });
    await m.closed; onChange?.();
}
