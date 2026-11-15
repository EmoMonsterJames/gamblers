// 🏬 백화점 + 🎰 Monster Gotcha corners (rules: game/gotcha.js)
import { h, fmt, sleep, put } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, confetti } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import * as Q from "../game/gotcha.js";
import { catalogEntry, ITEM_BY_ID } from "../data/catalog.js";
import { art, checkGoods, giveGoods, canPay, pay, priceLabel } from "./shop.js";
import { emoBoot } from "./emoCorners.js";
import { doorGate } from "../ui/doorGate.js";
import { monPic, itemIcon, typeChip, stars } from "../emomon/ui.js";
import { emoItem, cat, species } from "../emomon/data.js";

const lazy = build => {
    const box = h("div.gc-wrap", h("p.muted", "불러오는 중…"));
    emoBoot().then(() => put(box, build())).catch(e => { console.error(e); put(box, build()); });
    return box;
};
const CAT_TXT = { item: "아이템", weapon: "무기", pet: "펫", effect: "펫효과", frame: "프레임", peffect: "프레임효과" };

// ---------------------------------------------------------------- 🏬 백화점
export function deptView(pid, locId, { onChange = () => { } } = {}) {
    return lazy(() => {
        const ps = G.S().ps[pid];
        const goods = Q.deptGoods();
        const q = h("input.gc-q", { placeholder: "🔎 사고 싶은 아이템 · 무기 · 펫 · 프레임 · 몬스터 아이템 검색", oninput: () => list() });
        const head = h("div.gc-head"), results = h("div.gc-list");
        const drawHead = () => {
            const st = Q.deptStatus(pid, locId);
            put(head, h("span.gc-ico", "🏬"), h("div", h("b", "백화점"), h("small.muted", "몬스터를 뺀 모든 상품을 어드민 가격 그대로 팝니다 · 시즌당 1회 이용 · 한 번 이용할 때 최대 3개")),
                h("span.gc-left" + (st.left <= 0 ? ".none" : ""), st.locked ? "이번 시즌 이용 완료" : `남은 구매 ${st.left} / ${Q.DEPT_BUYS}`),
                h("span.gc-wallet", `💰 ${fmt(ps.money)} G · 💎 ${fmt(ps.points)} P`));
        };
        const icon = g => {
            if (g.src === "game") { const e = catalogEntry(g.cat, g.id); return h("div.gc-art", e ? art(g.cat, e) : "🎁"); }
            if (g.cat === "emoitem") return h("div.gc-art", itemIcon(emoItem(g.id), 40));
            if (g.cat === "emoweapon") return h("div.gc-art", typeChip(cat()?.weapon[String(g.id)]?.attribute));
            return h("div.gc-art.big", "🧬");
        };
        const have = g => g.src === "game" ? (g.cat === "item" ? ps.items[g.id] || 0 : g.cat === "weapon" ? ps.weapons.filter(w => w === g.id).length : 0) : 0;
        const list = () => {
            const f = q.value.trim().toLowerCase();
            if (!f) { put(results, h("p.muted.center", `검색어를 입력하세요 — 상품 ${fmt(goods.length)}종`)); return; }
            const hits = goods.filter(g => `${g.name} ${g.kind || CAT_TXT[g.cat] || ""} ${g.id}`.toLowerCase().includes(f)).slice(0, 40);
            const st = Q.deptStatus(pid, locId);
            put(results, hits.length ? hits.map(g => h("div.gc-row", icon(g),
                h("div.gc-name", h("b", g.name), h("small.muted", g.kind || CAT_TXT[g.cat] || ""), have(g) ? h("small.have", ` · 보유 ${have(g)}`) : null),
                h("button.btn.small" + (st.left > 0 && canPay(ps, g.price) ? ".gold" : ".ghost"), { disabled: st.left <= 0 || !canPay(ps, g.price), onclick: () => buy(g) }, priceLabel(g.price))))
                : [h("p.muted.center", "검색 결과가 없습니다")]);
        };
        async function buy(g) {
            const st = Q.deptStatus(pid, locId);
            if (st.left <= 0) return toast(st.locked ? "백화점은 시즌당 1회만 이용할 수 있습니다" : "이번 이용에서 3개를 모두 샀습니다", "warn");
            if (!canPay(ps, g.price)) return toast("골드 · 포인트가 부족합니다", "warn");
            const first = !ps.dept;
            if (!(await confirmBox(`${g.name}을(를) ${priceLabel(g.price)}에 살까요?${first ? "\n\n⚠️ 첫 구매부터 이번 시즌 백화점 이용이 시작됩니다 — 이 맵을 떠나면 다시 살 수 없습니다 (이번 방문에서 최대 3개)." : `\n남은 구매 ${st.left}회 → ${st.left - 1}회`}`, "구매", "취소"))) return;
            if (g.src === "game" && !(await checkGoods(ps, g.cat, g.id, catalogEntry(g.cat, g.id)))) return;
            if (Q.deptStatus(pid, locId).left <= 0 || !canPay(ps, g.price)) return;
            pay(ps, g.price);
            Q.deptNoteBuy(pid, locId);
            if (g.src === "game") giveGoods(pid, g.cat, g.id); else Q.giveEmoGood(pid, g);
            G.log(`🏬 ${G.name(pid)} 백화점 구매: ${g.name} (${priceLabel(g.price)})`);
            Store.saveSeason(true);
            Sound.coin(); confetti(18, ["🛍️", "✨"]);
            toast(`${g.name} 구매 완료!`, "ok");
            drawHead(); list(); onChange();
        }
        drawHead(); list();
        return h("div.gc-dept", head, q, results);
    });
}

// ---------------------------------------------------------------- 🎰 Monster Gotcha
export function gotchaView(pid, locId, { onChange = () => { } } = {}) {
    let tab = "buy";
    const wrap = h("div.gc-gotcha");
    const draw = () => {
        const ps = G.S().ps[pid];
        const bar = h("div.bk-tabs", [["buy", "🎰 Gotcha"], ["recycle", `♻️ 꽝 캡슐 수거${ps.items.gotcha_blank ? ` (${ps.items.gotcha_blank})` : ""}`]].map(([k, l]) => h("button.bk-tab" + (k === tab ? ".on" : ""), { onclick: () => { tab = k; draw(); } }, l)));
        put(wrap, bar, tab === "buy" ? machines(ps) : recycle(ps));
    };
    const machines = ps => {
        if (Q.gotchaDoorState(pid) !== true) return doorGate({ name: "Monster Gotcha", emoji: "🎰", chance: Math.round(Q.GOTCHA_OK * 100), state: () => Q.gotchaDoorState(pid), roll: () => Q.gotchaDoor(pid),
            refusedText: "♻️ 꽝 캡슐 수거는 지금도 할 수 있습니다.", inside: () => machines(G.S().ps[pid]) });
        const done = Q.gotchaBought(pid), full = Q.slotsFull(pid);
        return h("div",
            h("div.gc-head", h("span.gc-ico", "🎰"), h("div", h("b", "Monster Gotcha"), h("small.muted", "캡슐을 뽑아 몬스터를 얻습니다 · 라운드당 1회")),
                h("span.gc-left" + (done ? ".none" : ""), done ? "이번 라운드 뽑기 완료" : "이번 라운드 1회 남음"), h("span.gc-wallet", `💰 ${fmt(ps.money)} G · 💎 ${fmt(ps.points)} P`)),
            full ? h("p.notice.warn", "🐾 몬스터 칸이 가득 차 있어 뽑을 수 없습니다 (칸을 비우거나 늘리세요).") : null,
            h("div.gc-machines", Object.entries(Q.GOTCHAS).map(([k, g]) => {
                const odds = Q.gotchaOdds(k, locId);
                const ok = !done && !full && odds.rows.length && canPay(ps, g.price);
                return h("div.gc-machine.k-" + k,
                    h("div.gc-mhead", h("span.gc-memo", g.emoji), h("div", h("b", g.name), h("small.muted", g.note))),
                    h("div.gc-pool", odds.rows.map(r => h("div.gc-mon", { title: `${r.s.name} · ${Q.RARITY_NAME[r.s.rarity || 1]} · ${r.pct.toFixed(2)}%` }, monPic(r.s, 40), h("small", r.s.name), h("small.gc-pct.r" + (r.s.rarity || 1), `${Q.RARITY_NAME[r.s.rarity || 1]} ${fmtPct(r.pct)}`))),
                        odds.miss && odds.rows.length ? h("div.gc-mon.blank", h("span.gc-capsule", "🥚"), h("small", "꽝 캡슐"), h("small.gc-pct", fmtPct(odds.miss))) : null,
                        !odds.rows.length ? h("small.muted", "몬스터가 아직 없습니다") : null),
                    h("button.btn" + (ok ? ".gold" : ".ghost"), { disabled: !ok, onclick: () => pull(k) }, `${g.emoji} 뽑기 · ${priceLabel(g.price)}`));
            })));
    };
    const recycle = ps => {
        const n = ps.items.gotcha_blank || 0;
        return h("div.gc-recycle", h("div.gc-big", "♻️"), h("h3", "꽝 캡슐 수거"),
            h("p", "가지고 있는 꽝 캡슐을 전부 한꺼번에 반납하고 보상을 받습니다. 많이 모아 올수록 보상이 커져요."),
            h("p.muted.small", "1개 100~190G · 2개 200~290G · … · 10개 이상 1,000G"),
            h("div.gc-blanks", n ? Array.from({ length: Math.min(n, 20) }, () => h("span", "🥚")) : h("small.muted", "꽝 캡슐이 없습니다"), n > 20 ? h("small", ` +${n - 20}`) : null),
            h("button.btn" + (n ? ".gold" : ".ghost"), { disabled: !n, onclick: async () => {
                if (!(await confirmBox(`꽝 캡슐 ${n}개를 모두 수거할까요?\n수거하면 인벤토리에서 전부 사라집니다.`, "수거하기", "취소"))) return;
                const r = Q.recycleBlanks(pid);
                if (!r.ok) return toast(r.why, "warn");
                Sound.coin(); confetti(20, ["🪙", "♻️"]);
                toast(`♻️ 꽝 캡슐 ${r.n}개 수거 → +${fmt(r.gold)}G`, "ok", 3500);
                onChange(); draw();
            } }, n ? `♻️ 수거하기 (${n}개)` : "수거할 캡슐 없음"));
    };
    async function pull(kind) {
        const g = Q.GOTCHAS[kind];
        if (!(await confirmBox(`${g.name}를 ${priceLabel(g.price)}에 뽑을까요?\n이번 라운드 Gotcha는 1회만 뽑을 수 있습니다.`, "뽑기", "취소"))) return;
        const r = Q.buyGotcha(pid, kind, locId);
        if (!r.ok) return toast(r.why, "warn", 3500);
        onChange();
        await reveal(g, r);
        draw();
    }
    lazyInit(wrap, draw);
    return wrap;
}
const fmtPct = p => `${p >= 10 ? Math.round(p) : p >= 1 ? p.toFixed(1).replace(/\.0$/, "") : p.toFixed(2).replace(/0$/, "")}%`;
function lazyInit(wrap, draw) { put(wrap, h("p.muted", "🐾 EmoMon 불러오는 중…")); emoBoot().then(draw).catch(e => { console.error(e); draw(); }); }

// the capsule drops, wobbles, cracks open
async function reveal(g, r) {
    const cap = h("div.gc-cap", g.emoji === "🥚" ? "🥚" : "🔮");
    const out = h("div.gc-out");
    const m = modal(h("div.gc-reveal", h("div.gc-machine-art", "🎰"), cap, out), { title: `${g.emoji} ${g.name}`, closable: false });
    Sound.spin?.();
    await sleep(900); cap.classList.add("shake"); await sleep(1200); cap.classList.add("open"); await sleep(350);
    if (r.blank) {
        Sound.lose();
        put(out, h("div.gc-big", "🥚"), h("h3", "꽝 캡슐…"), h("p", "꽝 캡슐이 인벤토리에 들어갔습니다. ♻️ 꽝 캡슐 수거에서 골드로 바꿀 수 있어요."));
    } else {
        const rar = r.s.rarity || 1;
        rar >= 3 ? Sound.fanfare() : Sound.coin(); confetti(rar >= 4 ? 80 : 30, rar >= 4 ? ["🌟", "✨", "🎉"] : ["✨"]);
        put(out, monPic(r.s, 120, { anim: true }), h("h3", `${r.s.name} `, stars(rar)), h("p.gc-rar.r" + rar, Q.RARITY_NAME[rar]), h("p", "몬스터가 파티에 들어왔습니다!"));
    }
    out.append(h("button.btn.gold", { onclick: () => m.close() }, "확인"));
    out.classList.add("show");
    await m.closed;
}

// ---------------------------------------------------------------- 🛠 admin: monsters in each Gotcha of one map
// settings "maps".gotcha[locId] = { single: [sid], basic: [...], … } (a missing kind = the default list)
export async function gotchaManager(locId, onSaved = () => { }) {
    await emoBoot();
    const C = cat();
    if (!C) return toast("EmoMon 데이터를 먼저 불러오세요", "warn");
    const pools = Object.fromEntries(Object.keys(Q.GOTCHAS).map(k => [k, Q.gotchaPool(k, locId)]));
    let kind = "single";
    const body = h("div.gc-admin"), q = h("input.gc-q", { placeholder: "🔎 추가할 몬스터 검색 (이름 / #번호)", oninput: () => found() });
    const hits = h("div.gc-pool");
    const tabs = h("div.bk-tabs");
    const rateTxt = k => { const g = Q.GOTCHAS[k]; return [g.miss ? `꽝 캡슐 ${g.miss}%` : null, ...(g.rates ? Object.entries(g.rates).map(([r, p]) => `${Q.RARITY_NAME[r]} ${p}%`) : ["몬스터 균등"])].filter(Boolean).join(" · "); };
    const draw = () => {
        put(tabs, Object.entries(Q.GOTCHAS).map(([k, g]) => h("button.bk-tab" + (k === kind ? ".on" : ""), { onclick: () => { kind = k; draw(); } }, `${g.emoji} ${g.name} (${pools[k].length})`)));
        const odds = withPools(() => Q.gotchaOdds(kind, locId)), pct = Object.fromEntries(odds.rows.map(r => [r.s.id, r.pct]));
        put(body, h("p.muted.small", `${priceLabel(Q.GOTCHAS[kind].price)} · 확률: ${rateTxt(kind)} — 등급 몫은 그 등급 몬스터끼리 나눕니다. 몫이 없는 등급의 몬스터는 가장 가까운 등급에 들어갑니다.`),
            h("div.gc-pool", pools[kind].length ? pools[kind].map(sid => { const s = species(sid); return h("div.gc-mon", s ? monPic(s, 40) : h("span", "?"), h("small", s?.name || `#${sid}`),
                h("small.gc-pct.r" + (s?.rarity || 1), `${Q.RARITY_NAME[s?.rarity || 1]}${pct[sid] != null ? " " + fmtPct(pct[sid]) : ""}`),
                h("button.btn.small.ghost", { onclick: () => { pools[kind] = pools[kind].filter(x => x !== sid); draw(); } }, "✕")); }) : h("small.muted", "몬스터가 없습니다 — 아래에서 검색해 넣으세요")),
            q, hits);
        found();
    };
    // the preview odds read Store.maps, so preview against the pools being edited
    const withPools = fn => { const keep = Store.maps; Store.maps = { ...(keep || {}), gotcha: { ...(keep?.gotcha || {}), [locId]: pools } }; try { return fn(); } finally { Store.maps = keep; } };
    const found = () => {
        const f = q.value.trim().toLowerCase();
        if (!f) { put(hits); return; }
        const list = C.mons.filter(m => !pools[kind].includes(+m.id) && `${m.name} #${m.id}`.toLowerCase().includes(f)).slice(0, 24);
        put(hits, list.length ? list.map(m => h("button.gc-mon.add", { onclick: () => { pools[kind] = [...pools[kind], +m.id]; q.value = ""; draw(); q.focus(); } }, monPic(m, 36), h("small", m.name), h("small.gc-pct.r" + (m.rarity || 1), Q.RARITY_NAME[m.rarity || 1]))) : [h("small.muted", "검색 결과가 없습니다")]);
    };
    const save = async () => {
        Store.maps ||= {};
        Store.maps.gotcha = { ...(Store.maps.gotcha || {}), [locId]: Object.fromEntries(Object.entries(pools).map(([k, v]) => [k, [...v]])) };
        await Store.saveMaps({ ...Store.maps });
        toast("Monster Gotcha 구성을 저장했습니다", "ok"); m.close(); onSaved();
    };
    const reset = async () => {
        if (!(await confirmBox("이 맵의 Gotcha를 기본 몬스터 구성으로 되돌릴까요?", "되돌리기", "취소"))) return;
        if (Store.maps.gotcha) delete Store.maps.gotcha[locId];
        await Store.saveMaps({ ...Store.maps });
        toast("기본 구성으로 되돌렸습니다", "ok"); m.close(); onSaved();
    };
    const m = modal(h("div.gc-admin-wrap", tabs, body,
        h("div.row.end", h("button.btn.ghost", { onclick: reset }, "↺ 기본값"), h("button.btn.ghost", { onclick: () => m.close() }, "취소"), h("button.btn.gold", { onclick: save }, "💾 저장"))),
        { title: "🎰 Monster Gotcha 몬스터 구성", wide: true });
    draw();
}
