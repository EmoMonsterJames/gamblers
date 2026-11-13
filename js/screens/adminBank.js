// Admin: 🏦 Business Bank accounts, pending transfers and 🏪 Self-Business
// shops (every business opened so far, closed slots included).
import { h, fmt } from "../core/util.js";
import { toast, confirmBox } from "../core/fx.js";
import { Store } from "../core/store.js";
import { LOCATIONS, LOC_BY_ID } from "../data/catalog.js";
import { BIZ_TYPES, BIZ_LIST } from "../data/business.js";
import * as BK from "../game/bank.js";
import { avatar, displayName } from "../ui/profile.js";
import { dateOf } from "./bank.js";

const pname = pid => displayName(Store.player(pid)) || `#${pid}`;
const locName = id => { const l = LOC_BY_ID[id]; return l ? `${l.emoji || ""} ${l.name}` : id; };
const stamp = () => new Date().toISOString();

export function adminBankPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🏦 은행 · Self-Business 관리"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    let tab = "acc", q = "";
    const body = h("div.ab-body");
    const tabsEl = h("div.tabs");
    const save = async (msg) => { await Store.saveBank(); if (msg) toast(msg, "ok"); draw(); };

    function draw() {
        const b = BK.B();
        const nAcc = Object.keys(b.accounts).length, nBiz = BK.activeBiz().length, nTx = b.transfers.filter(t => !t.done).length;
        tabsEl.replaceChildren(...[["acc", `💳 계좌 (${nAcc})`], ["biz", `🏪 비즈니스 (${nBiz})`], ["tx", `💸 대기 송금 (${nTx})`]].map(([k, l]) => h("button.tab" + (k === tab ? ".on" : ""), { onclick: () => { tab = k; draw(); } }, l)));
        body.replaceChildren(...(tab === "acc" ? accounts() : tab === "biz" ? businesses() : transfers()));
    }

    // ------------------------------------------------------------ accounts
    function accounts() {
        const b = BK.B();
        const list = Object.values(b.accounts).filter(a => !q || pname(a.pid).toLowerCase().includes(q) || a.code.toLowerCase().includes(q)).sort((x, y) => (y.bgold || 0) - (x.bgold || 0));
        const sel = h("select.input", h("option", { value: "" }, "플레이어 선택…"), Store.allPlayers.filter(p => !b.accounts[p.id]).map(p => h("option", { value: p.id }, displayName(p))));
        return [
            h("div.ab-tools",
                h("input.input", { placeholder: "이름 / 코드 검색", value: q, oninput: e => { q = e.target.value.trim().toLowerCase(); draw(); } }),
                h("span.muted", `총 Business Gold ${fmt(Object.values(b.accounts).reduce((s, a) => s + (a.bgold || 0), 0))} BG`),
                h("span.ab-gap"), sel,
                h("button.btn.gold.small", { onclick: () => {
                    const pid = +sel.value; if (!pid) return toast("플레이어를 고르세요", "warn");
                    const code = newCode();
                    b.accounts[pid] = { pid, code, openedAt: stamp(), season: Store.season?.number || Store.seasonCount || 0, bgold: 0, history: [{ t: stamp(), kind: "open", amount: 0, note: "관리자 개설" }] };
                    save(`${pname(pid)} 계좌 개설 (${code})`);
                } }, "+ 계좌 직접 개설")),
            list.length ? h("table.ab-table",
                h("tr", h("th", "플레이어"), h("th", "코드"), h("th", "개설일"), h("th", "Business Gold"), h("th", "비즈니스"), h("th", "")),
                list.map(a => {
                    const bg = h("input.input.ab-num", { type: "number", value: a.bgold || 0 });
                    return h("tr",
                        h("td.ab-who", avatar(a.pid, 34, { effect: false }), pname(a.pid)),
                        h("td", h("b.ab-code", a.code)),
                        h("td", `${dateOf(a.openedAt)} · S${a.season}`),
                        h("td", bg, h("button.btn.small.ghost", { onclick: () => {
                            const v = Math.max(0, Math.floor(+bg.value || 0)), d = v - (a.bgold || 0);
                            if (!d) return;
                            a.bgold = v; a.history = [{ t: stamp(), kind: "admin", amount: d, note: "관리자 조정" }, ...(a.history || [])];
                            save("Business Gold 조정 완료");
                        } }, "저장")),
                        h("td", BK.bizOf(a.pid).map(z => BIZ_TYPES[z.type].emoji).join(" ") || "-"),
                        h("td.ab-acts",
                            h("button.btn.small.ghost", { onclick: async () => {
                                if (!(await confirmBox(`${pname(a.pid)}의 계좌 코드를 새로 발급할까요? (연결된 비즈니스도 새 코드로 바뀝니다)`))) return;
                                const old = a.code; a.code = newCode();
                                for (const z of b.biz) if (z.code === old) z.code = a.code;
                                save(`새 코드 ${a.code}`);
                            } }, "코드 재발급"),
                            h("button.btn.small.red", { onclick: async () => {
                                if (BK.bizOf(a.pid).length) return toast("운영 중인 비즈니스가 있는 계좌는 삭제할 수 없습니다 (먼저 폐업)", "warn", 3500);
                                if (!(await confirmBox(`${pname(a.pid)}의 계좌(${a.code})와 Business Gold ${fmt(a.bgold)} BG를 삭제할까요? 되돌릴 수 없습니다.`, "삭제", "취소"))) return;
                                delete b.accounts[a.pid];
                                save("계좌 삭제");
                            } }, "삭제")));
                })) : h("p.muted", "계좌가 없습니다")];
    }
    function newCode() {
        const C = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        for (;;) { const c = Array.from({ length: 4 }, () => C[Math.floor(Math.random() * C.length)]).join(""); if (!BK.accountByCode(c)) return c; }
    }

    // ------------------------------------------------------------ businesses
    function businesses() {
        const b = BK.B();
        const accs = Object.values(b.accounts);
        const typeSel = h("select.input", BIZ_LIST.map(T => h("option", { value: T.id }, `${T.emoji} ${T.name} (${Math.max(0, BK.stockLeft(T.id))}/${T.max})`)));
        const ownSel = h("select.input", h("option", { value: "" }, "소유자 (계좌 보유자)…"), accs.map(a => h("option", { value: a.pid }, `${pname(a.pid)} · ${a.code}`)));
        const locSel = h("select.input", LOCATIONS.filter(l => !l.off).map(l => h("option", { value: l.id }, `${l.name}${BK.bizAt(l.id).some(z => !z.closed) ? " (사용중)" : ""}`)));
        const rows = [...b.biz].sort((x, y) => (!!x.closed - !!y.closed) || (y.revenue || 0) - (x.revenue || 0));
        return [
            h("div.ab-tools",
                h("b", "비즈니스 직접 추가:"), typeSel, ownSel, locSel,
                h("button.btn.gold.small", { onclick: () => {
                    const pid = +ownSel.value, a = BK.account(pid), loc = locSel.value;
                    if (!a) return toast("계좌가 있는 소유자를 고르세요", "warn");
                    if (BK.activeBiz().some(z => z.loc === loc)) return toast("그 맵에는 이미 비즈니스가 있습니다 (맵당 1개)", "warn");
                    b.biz = b.biz.filter(z => !(z.closed && z.loc === loc));
                    b.biz.push({ id: "biz" + Date.now().toString(36), type: typeSel.value, owner: pid, code: a.code, loc, openedAt: stamp(), season: Store.season?.number || Store.seasonCount || 0, price: 0, tax: 0, revenue: 0, entries: 0, buys: 0, sales: [], moves: [], admin: true });
                    save("비즈니스 추가");
                } }, "+ 추가")),
            rows.length ? h("table.ab-table",
                h("tr", h("th", "비즈니스"), h("th", "소유자"), h("th", "위치"), h("th", "개설"), h("th", "누적 수익"), h("th", "손님"), h("th", "")),
                rows.map(z => {
                    const T = BIZ_TYPES[z.type];
                    if (z.closed) return h("tr.ab-closed", h("td", `🪧 ${T?.name || z.type}`), h("td", "-"), h("td", locName(z.loc)), h("td", `폐업 ${dateOf(z.closedAt)}`), h("td", "-"), h("td", "-"),
                        h("td.ab-acts", h("button.btn.small.ghost", { onclick: () => { b.biz = b.biz.filter(x => x !== z); save("폐업 자리 삭제"); } }, "자리 지우기")));
                    const mv = h("select.input", LOCATIONS.filter(l => !l.off).map(l => h("option", { value: l.id, selected: l.id === z.loc }, l.name)));
                    const own = h("select.input", accs.map(a => h("option", { value: a.pid, selected: a.pid === z.owner }, pname(a.pid))));
                    return h("tr",
                        h("td", h("b", `${T.emoji} ${T.name}`)),
                        h("td", own, h("button.btn.small.ghost", { onclick: () => {
                            const pid = +own.value; if (pid === z.owner) return;
                            z.owner = pid; z.code = BK.account(pid).code; save(`소유자 변경 → ${pname(pid)}`);
                        } }, "변경")),
                        h("td", mv, h("button.btn.small.ghost", { onclick: () => {
                            if (mv.value === z.loc) return;
                            if (BK.activeBiz().some(x => x !== z && x.loc === mv.value)) return toast("그 맵에는 이미 비즈니스가 있습니다", "warn");
                            b.biz = b.biz.filter(x => !(x.closed && x.loc === mv.value));
                            z.moves = [...(z.moves || []), { t: stamp(), from: z.loc, to: mv.value, tax: 0, admin: true }]; z.loc = mv.value;
                            save("위치 이동");
                        } }, "이동")),
                        h("td", `${dateOf(z.openedAt)} · S${z.season}`),
                        h("td", `${fmt(z.revenue || 0)} BG`),
                        h("td", `입장 ${z.entries || 0} · 구매 ${z.buys || 0}`),
                        h("td.ab-acts",
                            h("button.btn.small.ghost", { onclick: async () => {
                                if (!(await confirmBox(`${T.name}의 판매 기록(${(z.sales || []).length}건)을 비울까요? (누적 수익 숫자는 유지)`))) return;
                                z.sales = []; save("기록 정리");
                            } }, "기록 비우기"),
                            h("button.btn.small.red", { onclick: async () => {
                                if (!(await confirmBox(`${T.name} (${pname(z.owner)}, ${locName(z.loc)})을(를) 폐업 처리할까요?\n관리자 폐업은 계좌의 Business Gold를 지우지 않습니다.`, "폐업", "취소"))) return;
                                BK.closeBusiness(z.owner, z, { admin: true }); draw();
                            } }, "폐업")));
                })) : h("p.muted", "아직 개설된 비즈니스가 없습니다")];
    }

    // ------------------------------------------------------------ transfers
    function transfers() {
        const b = BK.B();
        const pend = b.transfers.filter(t => !t.done), done = b.transfers.filter(t => t.done).slice(-30).reverse();
        const row = (t, acts) => h("tr", h("td", pname(t.pid)), h("td", t.code), h("td", `${fmt(t.amount)} G`), h("td", `${fmt(t.fee)} G`), h("td", `S${t.season} R${t.round}${t.fast ? " ⚡" : ""}`), h("td", t.done ? `${t.to === "wallet" ? "지갑" : "시즌"} 입금 ${dateOf(t.paidAt)}` : `R${t.due} 시작 때`), h("td.ab-acts", acts));
        const head = h("tr", h("th", "플레이어"), h("th", "계좌"), h("th", "금액"), h("th", "수수료"), h("th", "요청"), h("th", "입금"), h("th", ""));
        return [
            h("h3", "⏳ 대기 중"),
            pend.length ? h("table.ab-table", head, pend.map(t => row(t, [
                h("button.btn.small.gold", { onclick: () => { t.due = -1; BK.processTransfers(); draw(); toast("입금 완료", "ok"); } }, "지금 입금"),
                h("button.btn.small.red", { onclick: async () => {
                    if (!(await confirmBox(`${pname(t.pid)}의 송금 ${fmt(t.amount)} G를 취소하고 Business Gold로 돌려줄까요? (수수료는 돌려주지 않음)`))) return;
                    const a = BK.accountByCode(t.code) || BK.account(t.pid);
                    if (a) { a.bgold += t.amount; a.history = [{ t: stamp(), kind: "admin", amount: t.amount, note: "송금 취소 (관리자)" }, ...(a.history || [])]; }
                    b.transfers = b.transfers.filter(x => x !== t);
                    save("송금 취소");
                } }, "취소")]))) : h("p.muted", "대기 중인 송금이 없습니다"),
            h("h3", "✅ 최근 완료"),
            done.length ? h("table.ab-table", head.cloneNode(true), done.map(t => row(t, []))) : h("p.muted", "없음")];
    }

    draw();
    return h("div.page.admin-bank",
        h("h2.page-title", "🏦 은행 · Self-Business 관리"),
        h("p.muted", "계좌·비즈니스는 시즌이 끝나도 남습니다. 변경은 바로 저장됩니다."),
        tabsEl, body);
}
