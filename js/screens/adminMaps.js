// Admin: regions and maps — switch regions / maps on and off, rename them,
// change the entry rule, move a map to another region and choose which
// slots / casino games and corners each map has. Saved to Store.maps and
// applied by data/mapAdmin.js applyMaps().
import { h } from "../core/util.js";
import { toast, confirmBox } from "../core/fx.js";
import { Store } from "../core/store.js";
import { REGIONS, LOCATIONS, EARN_ALL, COUNTRIES, SHOPS, NPCS, earnKinds, ITEMS, isPass } from "../data/catalog.js";
import { HONOR_KINDS, HONOR_ALL, honorKinds, honorPrizes } from "../data/honor.js";
const HONOR_TAB = "_honor";
import { locationShops } from "../data/catalogAdmin.js";
import { mapCorners } from "../ui/mapCorners.js";
import { stockManager } from "./adminEmo.js";
import { SLOTS, SLOT_BY_ID } from "../slots/configs.js";
import { CASINO_GAMES, CASINO_BY_ID } from "../data/casino.js";
import { applyMaps, locDefault, regionDefault } from "../data/mapAdmin.js";

const NEEDS = [["", "없음"], ["wings", "🪽 날개"], ["space_suit", "🧑‍🚀 우주복"], ["oxygen", "🤿 산소통"]];
const REQS = [["", "누구나"], ["points", "포인트 보유"], ["country", "국적 전용"], ["fee", "입장료 (G)"], ["feePts", "입장료 (P)"], ["random", "랜덤 입장"]];
const EARN_LABEL = { blood: "🩸 헌혈", labor: "⛏️ 노동", poop: "💩 똥", sell: "🛍️ 팔기", music: "🎧 음악", survival: "⚔️ 서바이벌", guess: "❓ 이름 맞추기" };
const reqKind = r => !r ? "" : r.points != null ? "points" : r.country ? "country" : r.fee != null ? "fee" : r.feePts != null ? "feePts" : r.random ? "random" : "";

export function adminMapsPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🌍 지역·맵 관리"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    const work = structuredClone(Store.maps || {});
    work.regions ||= {}; work.locs ||= {};
    let cur = REGIONS[0].id;
    const saveBtn = h("button.btn.gold", { onclick: save }, "💾 저장");
    const dirty = () => { saveBtn.textContent = "💾 저장 *"; };
    const tabs = h("div.tabs"), body = h("div.am-body");

    // current (edited) view of a region / map
    const reg = id => ({ ...regionDefault(id), ...(work.regions[id] || {}) });
    const red = id => (work.regions[id] ||= {});
    const loc = id => ({ ...structuredClone(locDefault(id)), ...structuredClone(work.locs[id] || {}) });
    const led = id => (work.locs[id] ||= {});
    const allLocs = () => LOCATIONS.map(l => loc(l.id));

    function drawTabs() {
        tabs.replaceChildren(...REGIONS.map(r0 => {
            const r = reg(r0.id);
            return h("button.tab" + (cur === r.id ? ".on" : "") + (r.off ? ".off" : ""), { onclick: () => { cur = r.id; draw(); } }, `${r.emoji} ${r.name} (${allLocs().filter(l => l.region === r.id).length})`);
        }), h("button.tab.am-honor-tab" + (cur === HONOR_TAB ? ".on" : ""), { onclick: () => { cur = HONOR_TAB; draw(); } }, `🏅 Honorarium 상품 · 배치 (${allLocs().filter(l => honorKinds(l).length).length})`));
    }

    // ---- 🏅 Honorarium: where the corners are + the Top 6 wheel / Top 3 box prizes
    const prizeList = which => (work.honor?.[which] || structuredClone(honorPrizes(which)));
    const setPrizes = (which, list) => { (work.honor ||= {})[which] = list; dirty(); draw(); };
    const ITEM_OPTS = ITEMS.filter(i => !isPass(i.id));
    function prizeEditor(which, title, hint) {
        const list = prizeList(which);
        const total = list.reduce((a, p) => a + Math.max(0, +p.weight || 0), 0);
        const upd = (i, patch, redraw = false) => { const next = structuredClone(prizeList(which)); Object.assign(next[i], patch); (work.honor ||= {})[which] = next; dirty(); if (redraw) draw(); };
        const row = (p, i) => h("div.am-prize",
            h("input.am-p-label", { value: p.label, placeholder: "표시 이름", onchange: ev => upd(i, { label: ev.target.value.trim() || "?" }) }),
            h("select", { onchange: ev => { const k = ev.target.value; upd(i, k === "gold" ? { kind: k, gold: p.gold || 1000, item: undefined } : k === "item" ? { kind: k, item: p.item || "hp_10", gold: undefined } : { kind: k, gold: undefined, item: undefined }, true); } },
                [["gold", "💰 골드"], ["item", "🎒 아이템"], ["none", "💨 꽝"]].map(([v, t]) => h("option", { value: v, selected: p.kind === v }, t))),
            p.kind === "gold" ? h("input.num", { type: "number", min: 0, step: 100, value: p.gold, onchange: ev => upd(i, { gold: Math.max(0, Math.round(+ev.target.value || 0)) }) })
                : p.kind === "item" ? h("select", { onchange: ev => upd(i, { item: ev.target.value }) }, ITEM_OPTS.map(it => h("option", { value: it.id, selected: p.item === it.id }, `${it.emoji || ""} ${it.name}`)))
                    : h("span.muted", "—"),
            h("label.am-p-w", h("input.num", { type: "number", min: 0, step: 0.5, value: p.weight, onchange: ev => upd(i, { weight: Math.max(0, +ev.target.value || 0) }, true) }), h("small", total ? `= ${(Math.round((+p.weight || 0) / total * 1000) / 10)}%` : "")),
            h("button.btn.small.ghost", { title: "삭제", disabled: list.length <= 2, onclick: () => setPrizes(which, list.filter((_, k) => k !== i)) }, "✕"));
        return h("div.ag-card.am-prizes",
            h("div.row.between", h("h3", title), h("div.row",
                work.honor?.[which] ? h("button.btn.small.ghost", { onclick: async () => { if (await confirmBox(`${title}을(를) 기본 품목으로 되돌릴까요?`)) { delete work.honor[which]; dirty(); draw(); } } }, "↺ 기본값") : null,
                h("button.btn.small.gold", { onclick: () => setPrizes(which, [...list, { label: "1,000G", kind: "gold", gold: 1000, weight: 5 }]) }, "+ 품목 추가"))),
            h("p.muted", hint, ` · 확률 = 가중치 ÷ 합계 (현재 합계 ${Math.round(total * 10) / 10})`),
            h("div.am-prize.head", h("small", "이름"), h("small", "종류"), h("small", "내용"), h("small", "가중치 → 확률"), h("small", "")),
            list.map(row));
    }
    function honorPanel() {
        const placed = HONOR_ALL.map(k => [k, allLocs().filter(l => honorKinds(l).includes(k))]);
        return [
            h("div.ag-card", h("h3", "🏅 Honorarium 코너 배치 현황"),
                h("p.muted", "각 맵 카드의 '🏅 Honorarium 코너' 체크박스로 배치합니다. 입장 조건: 지난 시즌 TOP 10 / TOP 6 / TOP 3 / 우승 경력 · 이용은 시즌당 2회 (Winners는 1회)."),
                h("div.am-honor-list", placed.map(([k, ls]) => h("div", h("b", `${HONOR_KINDS[k].emoji} ${HONOR_KINDS[k].name}`), " ",
                    ls.length ? ls.map(l => h("button.am-corner", { onclick: () => { cur = l.region; draw(); } }, `${l.emoji} ${l.name}`)) : h("span.muted", "아직 배치된 맵 없음"))))),
            prizeEditor("wheel", "🎡 TOP6 Honor Wheel 품목", "휠의 칸은 똑같은 크기로 보이지만 실제 당첨 확률은 가중치를 따릅니다"),
            prizeEditor("box", "🎁 TOP3 Honor Box 품목", "3개의 박스 내용물은 각각 이 확률로 정해집니다")
        ];
    }

    function regionCard() {
        const r = reg(cur), e = red(cur);
        return h("div.ag-card.am-region" + (r.off ? ".off" : ""),
            h("div.row.between", h("h3", `${r.emoji} 지역 설정`),
                h("button.btn.small" + (r.off ? ".gold" : ".red"), { onclick: () => { e.off = !r.off; dirty(); draw(); } }, r.off ? "↩ 지역 켜기" : "🚫 지역 끄기")),
            h("div.am-grid",
                h("label.cf", h("small", "이름"), h("input", { value: r.name, onchange: ev => { e.name = ev.target.value.trim() || regionDefault(cur).name; dirty(); drawTabs(); } })),
                h("label.cf", h("small", "이모지"), h("input.num", { value: r.emoji, onchange: ev => { e.emoji = ev.target.value.trim() || regionDefault(cur).emoji; dirty(); drawTabs(); } })),
                h("label.cf", h("small", "입장 필요 아이템 (입장 시 소모)"),
                    h("select", { onchange: ev => { e.need = ev.target.value || null; dirty(); } }, NEEDS.map(([v, t]) => h("option", { value: v, selected: (r.need || "") === v }, t))))),
            r.off ? h("p.notice", "꺼진 지역은 지역 룰렛에 나오지 않습니다.") : null);
    }

    function chipPicker(ids, all, byId, label, onChange) {
        const used = new Set(ids);
        return h("div.am-pick",
            h("small", label),
            h("div.am-chips", ids.map(id => h("span.am-chip" + (byId[id]?.off ? ".off" : ""), byId[id] ? `${byId[id].icon || "🎰"} ${byId[id].name}` : id,
                h("button", { title: "빼기", onclick: () => onChange(ids.filter(x => x !== id)) }, "×")))),
            h("select", { onchange: ev => { if (ev.target.value) onChange([...ids, ev.target.value]); } },
                h("option", { value: "" }, "+ 추가…"),
                all.filter(g => !used.has(g.id)).map(g => {
                    const home = LOCATIONS.find(l => l[label.startsWith("슬롯") ? "slots" : "casino"]?.includes(g.id));
                    return h("option", { value: g.id }, `${g.icon || ""} ${g.name}${home ? ` (현재: ${home.name})` : ""}`);
                })));
    }

    function locCard(l) {
        const e = led(l.id), rk = reqKind(l.req);
        const setReq = (k, v) => {
            e.req = k === "" ? {} : k === "random" ? { random: true } : k === "country" ? { country: v || COUNTRIES[0], pass: "pass_" + l.id } : { [k]: +v || 0 };
            if (k === "country" && locDefault(l.id).req?.pass) e.req.pass = locDefault(l.id).req.pass;
            dirty(); draw();
        };
        const reqVal = rk === "country"
            ? h("select", { onchange: ev => setReq("country", ev.target.value) }, COUNTRIES.map(c => h("option", { selected: l.req.country === c }, c)))
            : ["points", "fee", "feePts"].includes(rk) ? h("input.num", { type: "number", min: 0, step: rk === "fee" ? 500 : 10, value: l.req[rk], onchange: ev => setReq(rk, ev.target.value) }) : null;
        const toggle = (key, txt) => h("label.am-tog", h("input", { type: "checkbox", checked: !!l[key], onchange: ev => { e[key] = ev.target.checked; dirty(); draw(); } }), txt);
        const earn = earnKinds(l);
        // shops: the map's own shop list + shops that admin item placements add (catalogAdmin)
        const own = new Set(l.shops || []);
        const viaItems = new Set(locationShops({ ...l, shops: [] }));
        const shopToggles = Object.keys(SHOPS).filter(k => k !== "discount").map(k => h("label.am-tog" + (viaItems.has(k) && !own.has(k) ? ".dim" : ""), { title: viaItems.has(k) ? "상품 관리에서 이 맵에 배치한 아이템이 있어 항상 표시됩니다" : "" },
            h("input", { type: "checkbox", checked: own.has(k) || viaItems.has(k), disabled: viaItems.has(k) && !own.has(k), onchange: ev => {
                const next = new Set(loc(l.id).shops || []);
                ev.target.checked ? next.add(k) : next.delete(k);
                e.shops = Object.keys(SHOPS).filter(x => next.has(x)); dirty(); draw();
            } }), `${SHOPS[k].icon} ${SHOPS[k].name}${viaItems.has(k) && !own.has(k) ? " (아이템 배치)" : ""}`));
        // every corner a player will see on this map (same order as the in-game tabs)
        const corners = mapCorners(l); // same list as the in-game tabs (ui/mapCorners.js)
        const rules = [
            l.crazy && "🤪 Crazy (입장 시 5분 차감)", l.evil && `😈 Evil (HP −${l.evil})`, l.donation && "🎁 기부 입장",
            l.npcOnly && `💀 NPC 고정: ${NPCS.find(n => n.id === l.npcOnly)?.name || l.npcOnly}`,
        ].filter(Boolean);
        return h("div.ag-card.am-loc" + (l.off ? ".off" : ""),
            h("div.row.between",
                h("h3", `${l.emoji} ${l.name}`, h("small.muted", ` · ${l.id}`)),
                h("div.row",
                    Object.keys(work.locs[l.id] || {}).length ? h("button.btn.small.ghost", { onclick: async () => { if (await confirmBox(`${l.name}의 변경 사항을 기본값으로 되돌릴까요?`)) { delete work.locs[l.id]; dirty(); draw(); } } }, "↺ 기본값") : null,
                    h("button.btn.small" + (l.off ? ".gold" : ".red"), { onclick: () => { e.off = !l.off; dirty(); draw(); } }, l.off ? "↩ 맵 켜기" : "🚫 맵 끄기"))),
            h("div.am-grid",
                h("label.cf", h("small", "이름"), h("input", { value: l.name, onchange: ev => { e.name = ev.target.value.trim() || locDefault(l.id).name; dirty(); } })),
                h("label.cf", h("small", "이모지"), h("input.num", { value: l.emoji, onchange: ev => { e.emoji = ev.target.value.trim() || locDefault(l.id).emoji; dirty(); } })),
                h("label.cf", h("small", "지역"), h("select", { onchange: ev => { e.region = ev.target.value; dirty(); draw(); } }, REGIONS.map(r => h("option", { value: r.id, selected: l.region === r.id }, `${reg(r.id).emoji} ${reg(r.id).name}`)))),
                h("label.cf", h("small", "입장 조건"), h("div.row", h("select", { onchange: ev => setReq(ev.target.value) }, REQS.map(([v, t]) => h("option", { value: v, selected: rk === v }, t))), reqVal))),
            chipPicker(l.slots || [], SLOTS, SLOT_BY_ID, "슬롯머신", ids => { e.slots = ids; dirty(); draw(); }),
            chipPicker(l.casino || [], CASINO_GAMES, CASINO_BY_ID, "카지노 게임", ids => { e.casino = ids; dirty(); draw(); }),
            h("div.am-corners", h("small", `활성 코너 ${corners.length}개:`), corners.length ? corners.map(c => h("span.am-corner", c)) : h("span.muted", "없음"),
                rules.length ? [h("small", " · 맵 규칙:"), rules.map(c => h("span.am-corner.rule", c))] : null),
            h("div.am-togs", h("small", "상점:"), shopToggles),
            l.emoshop || l.lab ? h("div.am-togs", h("small", "🐾 EmoMon 상점 관리:"),
                l.emoshop ? h("button.btn.small.gold", { onclick: () => stockManager(l.id, "shop", draw) }, "🛒 Monster Shop 재고 · 가격") : null,
                l.lab ? h("button.btn.small.gold", { onclick: () => stockManager(l.id, "lab", draw) }, "🧪 LAB 상점 재고 · 가격") : null) : null,
            h("div.am-togs", toggle("job", "💼 직업 코너"), toggle("beg", "🥺 구걸"), toggle("discount", "🏷️ 할인 상점"), toggle("spell", "🐝 Spelling Bee"), toggle("bank", "🏦 Business Bank"), toggle("bizhub", "🏪 Self-Business"), toggle("capture", "🔍 EmoMon Capture"), toggle("hospital", "🏥 Monster Hospital"), toggle("lab", "🧪 Monster Lab"), toggle("emoshop", "🛒 Monster Shop"),
                h("label.am-tog", "👹 NPC 출몰", h("select", { onchange: ev => { const v = ev.target.value; e.npc = v === "hot" ? true : v === "rand" ? false : v; dirty(); } },
                    [["rand", "랜덤 (40% · 하늘·심해·우주 25%)"], ["hot", "랜덤·자주 (60% · 하늘·심해·우주 40%)"], ["always", "항상"], ["never", "안 나옴"]].map(([v, t]) => h("option", { value: v, selected: (l.npc === "always" ? "always" : l.npc === "never" ? "never" : l.npc ? "hot" : "rand") === v }, t))))),
            h("div.am-togs", h("small", "🏅 Honorarium 코너:"), HONOR_ALL.map(k => h("label.am-tog", h("input", { type: "checkbox", checked: honorKinds(l).includes(k), onchange: ev => {
                const next = new Set(honorKinds(loc(l.id)));
                ev.target.checked ? next.add(k) : next.delete(k);
                e.honor = next.size ? HONOR_ALL.filter(x => next.has(x)) : false; dirty(); draw();
            } }), `${HONOR_KINDS[k].emoji} ${HONOR_KINDS[k].name}`))),
            h("div.am-togs", h("small", "돈벌기 코너:"), EARN_ALL.map(k => h("label.am-tog", h("input", { type: "checkbox", checked: earn.includes(k), onchange: ev => {
                const next = new Set(earnKinds(loc(l.id)));
                ev.target.checked ? next.add(k) : next.delete(k);
                e.earn = next.size ? EARN_ALL.filter(x => next.has(x)) : false; dirty(); draw();
            } }), EARN_LABEL[k]))),
            !(l.slots?.length) ? h("p.notice", "⚠️ 슬롯이 하나도 없습니다.") : null);
    }

    function draw() {
        drawTabs();
        if (cur === HONOR_TAB) { body.replaceChildren(...honorPanel()); return; }
        const locs = allLocs().filter(l => l.region === cur);
        body.replaceChildren(regionCard(), h("h3", `맵 ${locs.length}곳`), ...locs.map(locCard),
            ...(!locs.length ? [h("p.muted", "이 지역에 맵이 없습니다. 다른 지역의 맵에서 '지역'을 바꿔 옮길 수 있습니다.")] : []));
    }

    async function save() {
        // drop empty entries
        for (const k of ["regions", "locs"]) for (const [id, v] of Object.entries(work[k])) if (!Object.keys(v).length) delete work[k][id];
        if (work.honor && !Object.keys(work.honor).length) delete work.honor;
        for (const w of ["wheel", "box"]) if (work.honor?.[w] && !work.honor[w].some(p => +p.weight > 0)) return toast(`${w === "wheel" ? "Honor Wheel" : "Honor Box"}의 가중치가 모두 0입니다`, "warn");
        try {
            await Store.saveMaps(structuredClone(work));
            applyMaps();
            saveBtn.textContent = "💾 저장";
            toast("지역·맵 설정을 저장했습니다", "ok");
        } catch (err) { toast(err.message || "저장 실패", "error"); }
    }

    draw();
    return h("div.page.admin-games.admin-maps",
        h("div.row.between", h("h2.page-title", "🌍 지역·맵 관리"), h("div.row", h("a.btn.ghost", { href: "#/admin" }, "← 관리자"), saveBtn)),
        h("p.muted", "지역과 맵을 켜고 끄고, 이름·입장 조건·소속 지역을 바꾸고, 각 맵에 배치할 슬롯/카지노 게임과 코너를 고릅니다. 저장해야 게임에 적용됩니다 (진행 중인 턴에는 다음 턴부터)."),
        tabs, body);
}
