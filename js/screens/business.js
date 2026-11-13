// =====================================================================
// 🏪 Self-Business (game/bank.js · data/business.js)
//   bizHubView  — the corner: business listings (buy wizard) + business shop
//   bizView     — a player-owned shop on a map (entry, menu / market, Owner Admin)
//   ownerAdmin  — revenue, Business Gold history, relocate · trend · close
//   trendBoard  — the 30-second 매출 트렌드 dashboard (also from the inventory)
// =====================================================================
import { h, fmt, sleep } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, confetti, Activity, banner } from "../core/fx.js";
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { ITEM_BY_ID, LOC_BY_ID, catalogEntry } from "../data/catalog.js";
import { BIZ_TYPES, BIZ_LIST, BIZ_SHOP, marketPrice } from "../data/business.js";
import * as G from "../game/season.js";
import * as BK from "../game/bank.js";
import { avatar, displayName } from "../ui/profile.js";
import { art, checkGoods, giveGoods, priceLabel } from "./shop.js";
import { codeSearch, dateOf } from "./bank.js";

const nameOf = pid => displayName(Store.player(pid));
const locName = id => { const l = LOC_BY_ID[id]; return l ? `${l.emoji || ""} ${l.name}`.trim() : id; };
const hpText = hp => hp === "full" ? "HP 전체 회복" : `HP +${hp}`;
const timeOk = turn => !turn || turn.remaining > 0 || (toast("⏰ 플레이 시간이 끝났습니다", "warn"), false);
// tabs a map shows: the hub (bizhub maps + maps that list a business) and every business standing there
export const bizHubHere = loc => !!loc.bizhub || BIZ_LIST.some(T => T.listed.includes(loc.id));
export const bizTabs = loc => BK.bizAt(loc.id).map(b => {
    const T = BIZ_TYPES[b.type];
    return ["biz:" + b.id, b.closed ? `🪧 ${T.name} (폐업)` : `${T.emoji} ${T.name}`];
});

// ===================================================================== the hub
export function bizHubView(pid, loc, { turn = null, onChange = () => { } } = {}) {
    const ps = G.S().ps[pid];
    const wrap = h("div.bz-hub");
    let tab = BIZ_LIST.some(T => T.listed.includes(loc.id)) ? "list" : loc.bizhub ? "shop" : "list";
    const render = () => {
        const head = h("div.bz-head", h("span.bz-logo", "🏪"), h("div", h("h3", "Self-Business"), h("small.muted", "TOP 10 경력자 전용 · 가게를 사서 맵에 열고, 손님이 쓴 돈의 일부를 Business Gold로 받으세요")));
        if (!BK.bankEligible(pid)) { wrap.replaceChildren(head, h("p.notice.warn", "🚫 지난 시즌 TOP 10 경력이 있는 플레이어만 입장할 수 있습니다.")); return; }
        const tabs = [["list", "🏷️ 비즈니스 매물"], ...(loc.bizhub ? [["shop", "🛒 비즈니스 상점"]] : []), ["mine", "📁 내 비즈니스"]];
        wrap.replaceChildren(head,
            h("div.bk-tabs", tabs.map(([k, l]) => h("button.bk-tab" + (k === tab ? ".on" : ""), { onclick: () => { tab = k; render(); } }, l))),
            tab === "list" ? listPane() : tab === "shop" ? shopPane() : minePane());
    };
    function listPane() {
        const here = BIZ_LIST.filter(T => T.listed.includes(loc.id));
        return h("div.bk-pane",
            !BK.account(pid) ? h("p.notice.warn", "💳 비즈니스를 사려면 Business Bank 계좌가 필요합니다 (은행 맵에서 개설).") : null,
            here.length ? h("div.bz-grid", here.map(card)) : h("p.notice", "이 맵에는 나온 매물이 없습니다."),
            h("details.bz-where", h("summary", "📍 다른 맵의 매물 보기"),
                BIZ_LIST.filter(T => !here.includes(T)).map(T => h("div.bz-where-row", h("b", `${T.emoji} ${T.name}`), h("small.muted", ` 남은 매물 ${Math.max(0, BK.stockLeft(T.id))}/${T.max} · `), h("small", T.listed.map(locName).join(", "))))));
    }
    function card(T) {
        const st = BK.buyStatus(T.id, pid), price = BK.priceFor(T.id, pid), left = Math.max(0, BK.stockLeft(T.id));
        return h("div.bz-card" + (left ? "" : ".sold"), { style: { "--bz": T.color } },
            h("div.bz-card-top", h("span.bz-emoji", T.emoji), h("div", h("b", T.name), h("small", T.ko))),
            h("div.bz-price", price !== T.price ? h("s.muted", fmt(T.price)) : null, ` ${fmt(price)} G`, price !== T.price ? h("small.bz-nat", ` ${T.nation} 국적 5% 할인`) : null),
            h("div.bz-tags",
                h("span", `TOP ${T.rank} 경력`), h("span", "💳 계좌 필요"), h("span", `남은 매물 ${left}/${T.max}`),
                h("span", `입장료 ${fmt(T.entry.fee)}G${T.entry.chance < 1 ? ` · 입장 ${Math.round(T.entry.chance * 100)}%` : ""}`), h("span", `매출의 ${(T.cut * 100).toFixed(1)}% 수익`),
                T.nation ? h("span", `🏳️ ${T.nation} 5% 할인`) : null),
            h("div.bz-menu", T.menu ? T.menu.map(m => h("span", `${m.emoji} ${m.name} · ${hpText(m.hp)} · ${fmt(m.price)}G`)) : T.market.map(g => { const e = catalogEntry(g.cat, g.id); return h("span", `${e?.emoji || "🎁"} ${e?.name || g.id} · ${marketPrice(g) ? fmt(marketPrice(g)) + "G" : "-"}`); })),
            h("details.bz-open", h("summary", "📍 오픈 가능 지역 (지역세)"), BK.openSpots(T.id).map(r => h("div", h("b", `${r.emoji} ${r.name}`), h("small", ` ${fmt(r.tax)}G · `), h("small.muted", r.maps.map(m => m.loc.name + (m.taken ? "(사용중)" : "")).join(", "))))),
            h("button.btn" + (st.ok ? ".gold" : ".ghost"), { disabled: !st.ok, onclick: () => buyWizard(T) }, st.ok ? "매입하기" : st.why));
    }
    async function buyWizard(T) {
        if (!timeOk(turn)) return;
        const price = BK.priceFor(T.id, pid);
        const body = h("div.bz-wiz");
        const m = modal(body, { title: `${T.emoji} ${T.name} 매입`, wide: true, cls: "bk-modal" });
        let code = "", spot = null;
        const steps = ["결제", "계좌 연결", "지역 · 맵 선택", "오픈"];
        const stepBar = i => h("div.bz-wsteps", steps.map((s, k) => h("span" + (k === i ? ".on" : k < i ? ".done" : ""), `${k + 1}. ${s}`)));
        const step1 = () => body.replaceChildren(stepBar(0),
            h("p", `${T.name} (${T.ko})의 매입가는 `, h("b", `${fmt(price)} G`), " 입니다.", price !== T.price ? ` (${T.nation} 국적 5% 할인)` : ""),
            h("p.muted", "오픈할 지역의 지역세는 맵을 고른 뒤 함께 결제됩니다. 비즈니스는 시즌이 끝나도 남습니다."),
            h("div.row.end", h("button.btn.ghost", { onclick: () => m.close() }, "취소"), h("button.btn.gold", { onclick: step2 }, "다음")));
        const step2 = () => {
            const input = h("input.bk-code-in", { maxlength: 4, placeholder: "ABCD", value: code, oninput: e => e.target.value = e.target.value.toUpperCase() });
            const go = () => {
                const a = BK.accountByCode(input.value);
                if (!a) return toast("존재하지 않는 계좌 코드입니다", "warn");
                if (a.pid !== +pid) return toast("본인 계좌만 연결할 수 있습니다", "warn");
                code = a.code; step3();
            };
            body.replaceChildren(stepBar(1), h("p", "매출을 받을 Business Bank 계좌 코드를 입력하세요."),
                h("div.bk-codebar", input, h("button.btn.ghost.small", { onclick: () => codeSearch(c => { input.value = c; }) }, "🔎 내 코드 검색")),
                h("div.row.end", h("button.btn.ghost", { onclick: step1 }, "이전"), h("button.btn.gold", { onclick: go }, "연결")));
        };
        const step3 = () => body.replaceChildren(stepBar(2), h("p", "가게를 열 맵을 고르세요 (맵마다 비즈니스는 1개만)."),
            spotPicker(T.id, null, s => { spot = s; step4(); }),
            h("div.row.end", h("button.btn.ghost", { onclick: step2 }, "이전")));
        const step4 = () => {
            const total = price + spot.tax;
            body.replaceChildren(stepBar(3),
                h("div.bz-sum", h("div", "매입가", h("b", `${fmt(price)} G`)), h("div", `지역세 (${spot.regionName})`, h("b", `${fmt(spot.tax)} G`)), h("div.tot", "합계", h("b", `${fmt(total)} G`)),
                    h("div", "오픈 맵", h("b", locName(spot.loc))), h("div", "연결 계좌", h("b", code))),
                ps.money < total ? h("p.notice.warn", `골드가 부족합니다 (보유 ${fmt(ps.money)} G)`) : null,
                h("div.row.end", h("button.btn.ghost", { onclick: step3 }, "이전"), h("button.btn.gold", { disabled: ps.money < total, onclick: finish }, "결제하고 오픈")));
        };
        const finish = async () => {
            const r = BK.openBusiness(pid, T.id, code, spot.loc);
            if (!r.ok) return toast(r.why, "warn", 3500);
            const done = Activity.hold();
            body.replaceChildren(h("div.bz-grand", h("div.bz-grand-ico", T.emoji), h("h3", "GRAND OPEN!"), h("p", `${locName(spot.loc)}에 ${T.name} 오픈`), h("p.muted", `Owner: ${nameOf(pid)} · 계좌 ${code}`),
                h("div.row.center", h("button.btn.gold", { onclick: () => m.close() }, "확인"))));
            Sound.fanfare(); confetti(80, [T.emoji, "🎉", "✨"]);
            done(); onChange(); render();
        };
        step1();
        await m.closed;
    }
    function shopPane() {
        return h("div.bk-pane", h("p.muted", "Owner Admin에서 쓰는 비즈니스 관리 아이템입니다."),
            h("div.shop-grid", BIZ_SHOP.map(it => {
                const e = ITEM_BY_ID[it.id], ok = ps.money >= it.gold;
                return h("div.sitem", h("div.sitem-art", h("div.big-emoji", e.emoji)), h("div.sitem-name", e.name), h("div.sitem-desc", e.desc),
                    ps.items[it.id] ? h("small.have", `보유 ${ps.items[it.id]}`) : null,
                    h("button.btn.small" + (ok ? ".gold" : ".ghost"), { disabled: !ok, onclick: () => {
                        if (ps.money < it.gold) return toast("골드가 부족합니다", "warn");
                        ps.money -= it.gold; ps.items[it.id] = (ps.items[it.id] || 0) + 1;
                        G.log(`🛒 ${G.name(pid)} 비즈니스 상점 구매: ${e.name}`);
                        Store.saveSeason(); Sound.coin(); toast(`${e.emoji} ${e.name} 구매!`, "ok"); onChange(); render();
                    } }, priceLabel({ gold: it.gold })));
            })));
    }
    function minePane() {
        const mine = BK.bizOf(pid);
        if (!mine.length) return h("div.bk-pane", h("p.notice", "아직 운영 중인 비즈니스가 없습니다."));
        return h("div.bk-pane", h("div.bz-mine", mine.map(b => { const T = BIZ_TYPES[b.type]; return h("div.bz-mine-row", { style: { "--bz": T.color } }, h("span.bz-emoji", T.emoji), h("div", h("b", T.name), h("small.muted", ` ${locName(b.loc)} · 오픈 ${dateOf(b.openedAt)}`)), h("span.bz-rev", `누적 ${fmt(b.revenue)} BG`)); })),
            h("p.muted", "Owner Admin은 가게가 있는 맵의 가게 탭에서 열 수 있습니다 (🛰️ Remote Business 관리권이 있으면 어디서나 인벤토리에서)."));
    }
    render();
    return wrap;
}

// region → maps chooser; onPick({ loc, tax, regionName })
function spotPicker(type, except, onPick) {
    const spots = BK.openSpots(type, { except });
    const cur = except ? BK.bizById(except)?.loc : null;
    return h("div.bz-spots", spots.map(r => h("div.bz-spot-region",
        h("div.bz-spot-head", h("b", `${r.emoji} ${r.name}`), h("span.bz-tax", `지역세 ${fmt(r.tax)} G`)),
        h("div.bz-spot-maps", r.maps.map(({ loc, taken }) => h("button.bz-map" + (taken ? ".taken" : "") + (loc.id === cur ? ".cur" : ""), { disabled: taken || loc.id === cur, onclick: () => onPick({ loc: loc.id, tax: r.tax, regionName: r.name }) },
            h("span", loc.emoji || "📍"), h("small", loc.name), taken ? h("i", "사용중") : loc.id === cur ? h("i", "현재") : null))))));
}

// ===================================================================== a shop on the map
export function bizView(pid, bizId, { turn = null, onChange = () => { } } = {}) {
    const ps = G.S().ps[pid];
    const wrap = h("div.bz-shop");
    const render = () => {
        const biz = BK.bizById(bizId);
        if (!biz) { wrap.replaceChildren(h("p.notice", "이 가게는 더 이상 없습니다.")); return; }
        const T = BIZ_TYPES[biz.type];
        if (biz.closed) {
            wrap.replaceChildren(h("div.bz-closed", h("div.bz-closed-sign", "폐업"), h("h3", `${T.emoji} ${T.name}`), h("p.muted", `${dateOf(biz.closedAt)} 폐업한 자리입니다. 이 맵은 다른 비즈니스가 다시 오픈할 수 있습니다.`)));
            return;
        }
        wrap.style.setProperty("--bz", T.color);
        const owner = biz.owner === +pid;
        const u = BK.bizUse(pid, biz);
        if (owner && !u.in) { u.in = true; u.paid = true; }
        const head = h("div.bz-shop-head",
            h("span.bz-emoji.big", T.emoji),
            h("div.bz-shop-title", h("h3", T.name), h("small.muted", `${T.ko} · ${locName(biz.loc)}`)),
            h("div.bz-owner", avatar(biz.owner, 54, { effect: false }), h("div", h("small", "OWNER"), h("b", nameOf(biz.owner)))),
            h("button.btn.small" + (owner ? ".gold" : ".ghost"), { disabled: !owner, title: owner ? "" : "가게 주인만 열 수 있습니다", onclick: () => ownerAdmin(pid, biz.id, { turn, onChange: () => { onChange(); render(); } }) }, "🔑 Owner Admin"));
        if (!u.in) {
            wrap.replaceChildren(head, h("div.bz-door",
                u.paid ? h("p.notice.warn", "🙅 이번 라운드에는 입장이 거절되었습니다. (입장료는 돌려받지 못해요)")
                    : [h("p", `입장료 ${fmt(T.entry.fee)} G`), T.entry.chance < 1 ? h("small.muted", `인기 가게라 입장이 ${Math.round((1 - T.entry.chance) * 100)}% 확률로 거절될 수 있습니다`) : null,
                        h("button.btn.gold.big", { disabled: ps.money < T.entry.fee, onclick: enter }, ps.money < T.entry.fee ? "골드 부족" : "입장하기")]));
            return;
        }
        let goods;
        if (T.menu) goods = T.menu.map(mn => ({ key: mn.id, label: mn.name, emoji: mn.emoji, sub: hpText(mn.hp), price: mn.price, entry: mn }));
        else {
            // one random good per player per round
            if (u.pick == null) { u.pick = Math.floor(Math.random() * T.market.length); Store.saveSeason(); }
            const g = T.market[u.pick], e = catalogEntry(g.cat, g.id), p = marketPrice(g);
            goods = e && p ? [{ key: g.id, label: e.name, e, cat: g.cat, price: p, entry: { label: e.name }, sub: `상점가 +5% · ${e.desc || ""}` }] : [];
        }
        wrap.replaceChildren(head,
            h("p.muted", T.menu ? `메뉴는 바로 먹어서 HP를 회복합니다 (최대 ${CONFIG.START_HP}) · 라운드당 1개 · HP ${Math.round(ps.hp * 100) / 100}` : "오늘의 상품은 손님마다 라운드당 1개가 랜덤으로 나옵니다 · 1개 구매 가능"),
            u.bought ? h("p.notice.ok", `✅ 이번 라운드 구매 완료: ${u.bought}`) : null,
            h("div.bz-goods", goods.map(g => h("div.bz-good",
                h("div.bz-good-art", g.e ? art(g.cat, g.e) : h("div.big-emoji", g.emoji)),
                h("b", g.label), h("small.muted", g.sub),
                h("button.btn.small" + (!u.bought && ps.money >= g.price ? ".gold" : ".ghost"), { disabled: !!u.bought || ps.money < g.price, onclick: () => buy(biz, g) }, `${fmt(g.price)} G`)))));
    };
    function enter() {
        if (!timeOk(turn)) return;
        const biz = BK.bizById(bizId);
        const r = BK.enterBiz(pid, biz);
        if (r.why) return toast(r.why, "warn");
        r.ok ? (Sound.bonus(), toast(`${BIZ_TYPES[biz.type].emoji} 어서 오세요!`, "ok")) : (Sound.lose(), toast("🙅 오늘은 자리가 없대요… 입장 거절", "warn", 3200));
        onChange(); render();
    }
    async function buy(biz, g) {
        if (!timeOk(turn)) return;
        if (g.e && !(await checkGoods(ps, g.cat, g.key, g.e))) return;
        if (g.entry.hp && ps.hp >= CONFIG.START_HP && !(await confirmBox("HP가 이미 가득 찼습니다. 그래도 먹을까요?", "먹기", "취소"))) return;
        const r = BK.buyMenu(pid, biz, g.entry, g.price, g.e ? () => giveGoods(pid, g.cat, g.key) : null);
        if (!r.ok) return toast(r.why, "warn");
        Sound.coin();
        toast(r.hp ? `${g.emoji} 냠냠! ❤ HP +${Math.round(r.hp * 100) / 100}` : `🛍️ ${g.label} 구매! 가방에 넣었습니다`, "ok");
        onChange(); render();
    }
    render();
    return wrap;
}

// ===================================================================== Owner Admin
export function ownerAdmin(pid, bizId, { turn = null, onChange = () => { }, remote = false } = {}) {
    const ps = G.S().ps[pid];
    const body = h("div.bz-admin");
    const m = modal(body, { title: `🔑 Owner Admin${remote ? " · 🛰️ Remote" : ""}`, wide: true, cls: "bk-modal" });
    const render = () => {
        const biz = BK.bizById(bizId);
        if (!biz || biz.closed) { body.replaceChildren(h("p.notice", "폐업한 비즈니스입니다."), h("div.row.end", h("button.btn.gold", { onclick: () => m.close() }, "닫기"))); return; }
        const T = BIZ_TYPES[biz.type], a = BK.accountByCode(biz.code);
        const sales = biz.sales || [];
        const thisSeason = sales.filter(x => x.season === G.S().number).reduce((s, x) => s + x.cut, 0);
        const itemBtn = (id, label, fn) => h("button.btn" + (ps.items[id] > 0 ? ".gold" : ".ghost"), { disabled: !(ps.items[id] > 0), title: ps.items[id] > 0 ? "" : `${ITEM_BY_ID[id].name}이(가) 필요합니다 (Self-Business 상점)`, onclick: fn }, `${ITEM_BY_ID[id].emoji} ${label} (${ps.items[id] || 0})`);
        body.replaceChildren(
            h("div.bz-adm-head", { style: { "--bz": T.color } }, h("span.bz-emoji.big", T.emoji), h("div", h("h3", T.name), h("small.muted", `${locName(biz.loc)} · 오픈 ${dateOf(biz.openedAt)} · 계좌 ${biz.code}`))),
            h("div.bz-kpis",
                h("div", h("small", "누적 수익"), h("b", `${fmt(biz.revenue)} BG`)),
                h("div", h("small", "이번 시즌 수익"), h("b", `${fmt(thisSeason)} BG`)),
                h("div", h("small", "입장 손님"), h("b", fmt(biz.entries || 0))),
                h("div", h("small", "구매"), h("b", fmt(biz.buys || 0))),
                h("div", h("small", "계좌 잔액"), h("b.bk-bg", `${fmt(a?.bgold || 0)} BG`))),
            h("h4", "💰 Business Gold 기록"),
            h("div.bz-hist", (a?.history || []).length ? a.history.slice(0, 40).map(x => h("div.bk-hist-row", h("small.muted", dateOf(x.t)), h("span", x.note), h("b" + (x.amount < 0 ? ".down" : ".up"), x.amount ? `${x.amount > 0 ? "+" : ""}${fmt(x.amount)}` : ""))) : h("p.muted", "아직 기록이 없습니다")),
            h("div.bz-adm-btns",
                itemBtn("biz_move", "지역 바꾸기", () => relocate(biz)),
                itemBtn("biz_trend", "매출 트렌드 보기", () => trend(biz)),
                itemBtn("biz_close", "폐업하기", () => close(biz))),
            h("div.row.end", h("button.btn.ghost", { onclick: () => m.close() }, "닫기")));
    };
    function relocate(biz) {
        if (!timeOk(turn)) return;
        const T = BIZ_TYPES[biz.type];
        const pm = modal(h("div", h("p", "옮길 맵을 고르세요. 새 지역의 지역세를 냅니다. (매물 지역 바꾸기 권 1장 사용)"),
            spotPicker(biz.type, biz.id, async s => {
                if (ps.money < s.tax) return toast(`지역세 ${fmt(s.tax)}G가 부족합니다`, "warn");
                if (!(await confirmBox(`${T.name}을(를) ${locName(biz.loc)} → ${locName(s.loc)}(으)로 옮길까요?\n지역세 ${fmt(s.tax)} G`, "이전하기", "취소"))) return;
                pm.close();
                const done = Activity.hold();
                const bar = h("i"), pct = h("b", "0%");
                const lm = modal(h("div.bz-move", h("div.bz-truck", "🚚"), h("p", `${locName(biz.loc)} → ${locName(s.loc)}`), h("div.bk-bar.big", bar), pct), { title: "🚚 이전 중", closable: false, cls: "bk-modal" });
                for (let k = 1; k <= 20; k++) { bar.style.width = k * 5 + "%"; pct.textContent = k * 5 + "%"; if (k % 4 === 0) Sound.tick(); await sleep(90 + Math.random() * 80); }
                const r = BK.moveBusiness(pid, biz, s.loc);
                lm.close(); done();
                if (!r.ok) return toast(r.why, "warn");
                Sound.fanfare(); toast(`🚚 ${locName(s.loc)}(으)로 이전 완료!`, "ok", 3000);
                onChange(); render();
            })), { title: "🚚 매물 지역 바꾸기", wide: true, cls: "bk-modal" });
    }
    async function trend(biz) {
        if (!(await confirmBox("📊 매출 트렌드 보기권 1장을 사용해 30초 동안 대시보드를 볼까요?", "보기", "취소"))) return;
        if (!BK.useBizItem(pid, "biz_trend")) return;
        const snap = BK.trendSnapshot(biz);
        BK.saveReport(pid, biz, snap);
        await trendBoard(snap, { seconds: 30 });
        toast("📁 리포트는 인벤토리에 저장됩니다", "ok", 3500);
        onChange(); render();
    }
    async function close(biz) {
        const a = BK.accountByCode(biz.code);
        if (!(await confirmBox(`⚠️ 폐업 경고 ⚠️\n\n${BIZ_TYPES[biz.type].name}을(를) 폐업하면 소유권과 기록이 삭제되고 맵에는 '폐업' 자리만 남습니다.\n계좌에 남은 Business Gold ${fmt(a?.bgold || 0)} BG는 모두 소멸됩니다!\n먼저 은행에서 송금하세요.\n\n정말 폐업할까요? (폐업권 1장 사용)`, "폐업하기", "취소"))) return;
        const r = BK.closeBusiness(pid, biz);
        if (!r.ok) return toast(r.why, "warn");
        Sound.lose(); toast("🪧 폐업했습니다", "warn", 3000);
        onChange(); render();
    }
    render();
    return m;
}

// 🛰️ Remote Business 관리권 → Owner Admin popup once, from anywhere
export async function remoteBiz(pid, onChange) {
    const ps = G.S().ps[pid];
    const mine = BK.bizOf(pid);
    if (!mine.length) return toast("운영 중인 비즈니스가 없습니다", "warn");
    let biz = mine[0];
    if (mine.length > 1) {
        biz = await new Promise(res => {
            const pm = modal(h("div.bz-mine", mine.map(b => { const T = BIZ_TYPES[b.type]; return h("button.bz-mine-row", { onclick: () => { pm.close(); res(b); } }, h("span.bz-emoji", T.emoji), h("b", T.name), h("small.muted", locName(b.loc))); })), { title: "어느 비즈니스를 관리할까요?", cls: "bk-modal" });
            pm.closed.then(() => res(null));
        });
        if (!biz) return;
    } else if (!(await confirmBox(`🛰️ Remote Business 관리권 1장을 사용해 ${BIZ_TYPES[biz.type].name}의 Owner Admin을 열까요?`, "열기", "취소"))) return;
    if (!BK.useBizItem(pid, "biz_remote")) return;
    G.log(`🛰️ ${G.name(pid)} Remote Business 관리`);
    const m = ownerAdmin(pid, biz.id, { remote: true, onChange });
    await m.closed; onChange?.();
}

// ===================================================================== 📊 trend dashboard
export async function trendBoard(snap, { seconds = 0 } = {}) {
    const T = BIZ_TYPES[snap.type];
    const max = Math.max(1, ...snap.items.map(x => x.n));
    const rmax = Math.max(1, ...snap.rounds.map(x => x.cut));
    const timer = h("div.bz-tr-timer");
    const done = seconds ? Activity.hold() : () => { };
    const body = h("div.bz-trend", { style: { "--bz": T?.color || "#38bdf8" } },
        h("div.bz-tr-head", h("span.bz-emoji.big", T?.emoji), h("div", h("h3", `${snap.name} 매출 트렌드`), h("small.muted", `${locName(snap.loc)} · ${new Date(snap.at).toLocaleString("ko-KR")} 기준`)), timer),
        h("div.bz-kpis",
            h("div", h("small", "누적 수익"), h("b", `${fmt(snap.revenue)} BG`)),
            h("div", h("small", "손님 매출"), h("b", `${fmt(snap.gross)} G`)),
            h("div", h("small", "방문 플레이어"), h("b", fmt(snap.visitors))),
            h("div", h("small", "입장 → 구매"), h("b", `${snap.entries} → ${snap.buys} (${Math.round(snap.conv * 100)}%)`))),
        h("div.bz-tr-cols",
            h("div.bz-tr-box", h("h4", "📈 아이템 트렌드"),
                snap.items.length ? snap.items.map(x => h("div.bz-bar-row", h("span", x.label), h("div.bz-bar", h("i", { style: { width: x.n / max * 100 + "%" } })), h("b", `${x.n}회`))) : h("p.muted", "아직 팔린 메뉴가 없습니다"),
                snap.unsold?.length ? h("small.muted", `안 팔린 메뉴: ${snap.unsold.join(", ")}`) : null),
            h("div.bz-tr-box", h("h4", "🗓️ 라운드별 수익"),
                snap.rounds.length ? h("div.bz-cols", snap.rounds.map(x => h("div.bz-col", { title: `${x.k} · ${fmt(x.cut)} BG` }, h("i", { style: { height: Math.max(4, x.cut / rmax * 100) + "%" } }), h("small", x.k.replace("·", " "))))) : h("p.muted", "기록 없음"))),
        h("div.bz-tr-box", h("h4", "🧾 손님 기록"),
            snap.customers.length ? h("table.bz-table", h("tr", h("th", "시즌"), h("th", "라운드"), h("th", "시간 / 날짜"), h("th", "손님"), h("th", "아이템"), h("th", "금액")),
                snap.customers.map(x => h("tr", h("td", x.season), h("td", x.round), h("td", new Date(x.t).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })), h("td", nameOf(x.pid)), h("td", x.kind === "entry" ? "🚪 입장료" : x.label), h("td", `${fmt(x.price)} G`)))) : h("p.muted", "아직 손님이 없습니다")),
        h("div.bz-tr-box.advice", h("h4", "💡 이런 전략이 필요합니다"), h("ul", snap.advice.map(a => h("li", a)))));
    const m = modal(body, { title: "📊 매출 트렌드 대시보드", wide: true, closable: !seconds, cls: "bk-modal.bz-trend-modal" });
    if (seconds) {
        for (let s = seconds; s > 0; s--) { timer.textContent = `⏱ ${s}s`; timer.classList.toggle("low", s <= 5); await sleep(1000); }
        timer.textContent = "⏱ 0s";
        m.close(); done();
        const n = modal(h("div.bz-saved", h("div.big-emoji", "📁"), h("p", "리포트는 인벤토리에 저장됩니다"), h("div.row.center", h("button.btn.gold", { onclick: () => n.close() }, "확인"))), { title: "📊 리포트 저장", cls: "bk-modal" });
        await n.closed;
    } else await m.closed;
}

// 📁 saved reports (inventory)
export function reportList(pid) {
    const list = BK.reportsOf(pid);
    const m = modal(h("div.bz-reports", list.length ? list.map(r => h("button.bz-report-row", { onclick: () => trendBoard(r.snap) },
        h("span", BIZ_TYPES[r.type]?.emoji || "📊"), h("b", BIZ_TYPES[r.type]?.name || r.type), h("small.muted", `${locName(r.loc)} · ${new Date(r.at).toLocaleString("ko-KR")}`))) : h("p.muted", "저장된 리포트가 없습니다")), { title: "📁 매출 트렌드 리포트", cls: "bk-modal" });
    return m;
}
