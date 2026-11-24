// =====================================================================
// 🏅 Honorarium shops (data/honorShop.js) — TOP 15 / 12 / 10 / 6 / 3 / 우승자 전용 상점.
// 2~5 goods per shop, 20~30% off · at most 2 purchases per season (all Honorarium shops together).
// =====================================================================
import { h, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, confirmBox } from "../core/fx.js";
import { Store } from "../core/store.js";
import { catalogEntry } from "../data/catalog.js";
import * as HS from "../data/honorShop.js";
import * as G from "../game/season.js";
import { art, desc, checkGoods, giveGoods, canPay, pay, priceLabel } from "./shop.js";
import { emoItem, cat as emoCat, loadCatalog, monImg } from "../emomon/data.js";
import * as M from "../emomon/game.js";
import { emoSlots } from "../game/extra.js";

const rankWord = K => K.rank === 1 ? "우승" : `TOP ${K.rank}`;
let loading = null;

export function honorShopView(pid, locId, kind, { onChange = () => { } } = {}) {
    const K = HS.HSHOP[kind], s = G.S(), ps = s.ps[pid];
    const wrap = h("div.hshop", { style: { "--hc": K.color } });
    wrap.append(h("div.hn-head", h("span.hn-emoji", K.emoji), h("div", h("h3", K.name),
        h("small.muted", `입장 조건: 시즌 ${rankWord(K)} 경력 · 모든 Honorarium 상점 합쳐 시즌당 ${HS.HSHOP_USES}회 구매 · 기존 가격에서 20~30% 할인`))));
    if (!HS.hshopEligible(s, pid, kind)) {
        wrap.append(h("p.notice.warn", `🚫 지난 시즌에서 ${rankWord(K)}${K.rank === 1 ? "한" : " 안에 든"} 경력이 있는 플레이어만 이용할 수 있습니다.`));
        return wrap;
    }
    // 🐾 the EmoMonster catalog (monster goods) loads once
    if (!emoCat() && !loading) loading = loadCatalog().catch(() => null).then(() => { loading = null; onChange(); });
    const left = Math.max(0, HS.HSHOP_USES - HS.hshopUsed(ps));
    wrap.append(h("p.notice", `🏅 이번 시즌 남은 구매 `, h("b", `${left} / ${HS.HSHOP_USES}회`), " (모든 Honorarium 전용 상점 합산)"));
    const goods = HS.hshopStock(locId, kind, s.number).map(resolve).filter(Boolean);
    if (!goods.length) { wrap.append(h("p.muted", "진열된 상품이 없습니다.")); return wrap; }
    wrap.append(h("div.shop-grid", goods.map(g => {
        const cost = HS.discounted(g.base, g.off);
        const afford = left > 0 && canPay(ps, cost);
        return h("div.sitem.hs-item",
            h("div.sitem-art", g.art),
            h("div.sitem-name", g.name),
            h("div.sitem-desc", g.desc),
            g.base.fixed ? h("div.sitem-sale", "🏅 전용가") : h("div.sitem-sale", h("s", priceLabel(g.base)), ` -${Math.round(g.off * 100)}%`),
            h("small.have", g.label),
            h("button.btn.small" + (afford ? ".gold" : ".ghost"), { disabled: !afford, onclick: () => buy(g, cost) }, priceLabel(cost)));
    })));
    return wrap;

    // a stock line → what is shown and given
    function resolve(it) {
        if (it.cat === "mon") {
            const C = emoCat(), sid = HS.monSpeciesId(C, it.id), sp = sid != null ? C.mon[String(sid)] : null;
            if (!sp) return null;
            return { ...it, sid, name: `🐾 ${sp.name}`, base: HS.basePrice(it), desc: "이모몬스터 1마리 (몬스터 슬롯이 비어 있어야 합니다)",
                art: h("img.emo-shop-img", { src: monImg(sp), alt: sp.name, width: 60, height: 60, onerror: ev => ev.target.replaceWith(h("div.big-emoji", "🐾")) }) };
        }
        const e = it.cat === "emo" ? emoItem(it.id) : catalogEntry(it.cat, it.id);
        if (!e) return null;
        const base = it.cat === "emo" ? (e.pts ? { gold: 0, pts: e.pts } : e.gold ? { gold: e.gold, pts: 0 } : null) : HS.basePrice(it);
        if (!base) return null;
        return { ...it, e, base, name: e.name, desc: desc(it.cat, e), art: art(it.cat, e) };
    }
    async function buy(g, cost) {
        if (HS.HSHOP_USES - HS.hshopUsed(ps) <= 0) return toast(`이번 시즌 Honorarium 상점 구매 ${HS.HSHOP_USES}회를 다 썼습니다`, "warn");
        if (!canPay(ps, cost)) return toast("잔액이 부족합니다", "warn");
        if (g.cat === "mon") {
            if (M.mons(pid).length >= emoSlots(pid)) return toast("이모몬스터 슬롯이 꽉 찼습니다", "warn");
            if (!(await confirmBox(`${g.name}을(를) ${priceLabel(cost)}에 데려올까요?`))) return;
        } else if (!(await checkGoods(ps, g.cat, g.id, g.e))) return;
        pay(ps, cost);
        ps.hshopUses = HS.hshopUsed(ps) + 1;
        if (g.cat === "mon") M.addMon(pid, M.newMon(g.sid, { from: "shop" }));
        else giveGoods(pid, g.cat, g.id);
        G.log(`${K.emoji} ${G.name(pid)} ${K.name} 구매: ${g.name.replace(/^🐾 /, "")} (${priceLabel(cost)})`);
        Store.saveSeason(true);
        Sound.coin(); confetti(24, ["✨", K.emoji]);
        toast(`${g.name} 구매 완료!`, "ok");
        onChange();
        if (g.cat === "mon") document.dispatchEvent(new Event("emo:change"));
    }
}
