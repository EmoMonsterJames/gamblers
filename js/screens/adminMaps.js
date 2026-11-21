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
import { gotchaManager } from "./gotcha.js";
import { SLOTS, SLOT_BY_ID } from "../slots/configs.js";
import { CASINO_GAMES, CASINO_BY_ID } from "../data/casino.js";
import { applyMaps, locDefault, regionDefault, mapNo } from "../data/mapAdmin.js";
import { FOOD_CORNERS, FOOD_CORNER_LIST, FOOD_BY_ID, FOODS, ENTRY_KINDS, LODGES, LODGE_LIST, FOOD_HOME_COUNTRY, FOOD_CORNER_RACES } from "../data/life.js";

const NEEDS = [["", "없음"], ["wings", "🪽 날개"], ["space_suit", "🧑‍🚀 우주복"], ["oxygen", "🤿 산소통"]];
const REQS = [["", "누구나"], ["points", "포인트 보유"], ["country", "국적 전용"], ["fee", "입장료 (G)"], ["feePts", "입장료 (P)"], ["random", "랜덤 입장"]];
const EARN_LABEL = { blood: "🩸 헌혈", labor: "⛏️ 노동", poop: "💩 똥", sell: "🛍️ 팔기", music: "🎧 음악", survival: "⚔️ 서바이벌", guess: "❓ 이름 맞추기" };
const reqKind = r => !r ? "" : r.points != null ? "points" : r.country ? "country" : r.fee != null ? "fee" : r.feePts != null ? "feePts" : r.random ? "random" : r.who ? "who" : "";
// 🚧 제한구역: who may walk in (others need the map pass)
const WHO = [["baby", "Baby만"], ["female", "Female만"], ["male", "Male만"], ["senior", "Senior만"], ["lgbt", "Straight 아닌 플레이어만"], ["vip", "TOP 10 경력자만"], ["other", "종족 Other만"]];
REQS.push(["who", "제한구역 (대상 전용)"]);

export function adminMapsPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🌍 지역·맵 관리"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    const work = structuredClone(Store.maps || {});
    work.regions ||= {}; work.locs ||= {};
    let cur = REGIONS[0].id;
    const saveBtn = h("button.btn.gold", { onclick: save }, "💾 저장");
    const dirty = () => { saveBtn.textContent = "💾 저장 *"; };
    // a stock popup saves on its own — also save the map changes still pending on this page (checkboxes etc.), so they are not lost
    const afterStock = async () => { if (saveBtn.textContent.endsWith("*")) await save(); draw(); };
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
            const sv = r0.revival || r0.id === "survival";
            return h("button.tab" + (cur === r.id ? ".on" : "") + (r.off && !sv ? ".off" : "") + (sv ? ".am-survival-tab" : ""), { onclick: () => { cur = r.id; draw(); } }, `${r.emoji} ${r.name}${sv ? " · 패자부활전 전용" : ""} (${allLocs().filter(l => l.region === r.id).length})`);
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
        if (cur === "survival") return h("div.ag-card.am-region.am-survival",
            h("h3", `${r.emoji} ${r.name} — 🔄 패자부활전 전용 지역`),
            h("p", "평소 라운드에서는 자동으로 숨겨지고, 패자부활전이 진행되는 동안에만 열립니다 (지역 끄기/켜기 대신 아래에서 맵별로 켜고 끕니다)."),
            h("p.muted", "각 맵의 슬롯 · 카지노 게임 · 상점 · 코너와 Survival Land 규칙(턴 종료 불가, 재난, 퀴즈, 죽음의 룰렛 등)을 여기서 관리합니다. 일반 상점에는 시간 연장권 · HP약 · 산소통 등 생존 상품과 다른 Survival Land 맵권(45,000G)이 자동으로 진열됩니다."),
            h("label.cf", h("small", "이름"), h("input", { value: r.name, onchange: ev => { e.name = ev.target.value.trim() || regionDefault(cur).name; dirty(); drawTabs(); } })));
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

    // + 추가 dropdown: A→Z by name, with a search box that narrows it down
    function chipPicker(ids, all, byId, label, onChange) {
        const used = new Set(ids);
        const isSlot = label.startsWith("슬롯");
        const sorted = all.filter(g => !used.has(g.id)).sort((a, b) => String(a.name).localeCompare(String(b.name), "en", { sensitivity: "base", numeric: true }));
        const optionsFor = q => {
            q = q.trim().toLowerCase();
            const list = q ? sorted.filter(g => `${g.name} ${g.id}`.toLowerCase().includes(q)) : sorted;
            return [h("option", { value: "" }, q ? `+ 추가… (${list.length}개 검색됨)` : "+ 추가…"), ...list.map(g => {
                const home = LOCATIONS.find(l => l[isSlot ? "slots" : "casino"]?.includes(g.id));
                return h("option", { value: g.id }, `${g.icon || ""} ${g.name}${home ? ` (현재: ${home.name})` : ""}`);
            })];
        };
        const sel = h("select", { onchange: ev => { if (ev.target.value) onChange([...ids, ev.target.value]); } }, optionsFor(""));
        const search = h("input.am-search", { type: "search", placeholder: `🔍 ${isSlot ? "슬롯" : "카지노 게임"} 검색`, oninput: ev => sel.replaceChildren(...optionsFor(ev.target.value)) });
        return h("div.am-pick",
            h("small", label),
            h("div.am-chips", ids.map(id => h("span.am-chip" + (byId[id]?.off ? ".off" : ""), byId[id] ? `${byId[id].icon || "🎰"} ${byId[id].name}` : id,
                h("button", { title: "빼기", onclick: () => onChange(ids.filter(x => x !== id)) }, "×")))),
            h("div.am-add", sel, search));
    }

    function locCard(l) {
        const e = led(l.id), rk = reqKind(l.req);
        const setReq = (k, v) => {
            e.req = k === "" ? {} : k === "random" ? { random: true } : k === "who" ? { who: v || "baby" } : k === "country" ? { country: v || COUNTRIES[0], pass: "pass_" + l.id } : { [k]: +v || 0 };
            if (k === "country" && locDefault(l.id).req?.pass) e.req.pass = locDefault(l.id).req.pass;
            dirty(); draw();
        };
        const reqVal = rk === "country"
            ? h("select", { onchange: ev => setReq("country", ev.target.value) }, COUNTRIES.map(c => h("option", { selected: l.req.country === c }, c)))
            : rk === "who" ? h("select", { onchange: ev => setReq("who", ev.target.value) }, WHO.map(([v, t]) => h("option", { value: v, selected: l.req.who === v }, t)))
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
            l.deadNpc && "☠️ Dead Land NPC 전용", l.noPass && "🚫 맵권 사용 불가", l.endLock && "⏳ 5분 이하부터 턴 종료", l.deathWheel && "🎡 죽음의 휠", l.sugar && "🍬 Sugar Level",
            l.dark && "🌑 암흑 화면", l.magma && "🌋 30초마다 HP −10", l.hurry && "⏱️ 1분 안에 플레이", l.bare && "🫥 기본 코너만", l.cursed && "🥶 펫 무효 · RTP −10%",
            l.fluChance && `🤧 독감 ${Math.round(l.fluChance * 100)}%`, l.cancerChance && `☢️ 암 ${Math.round(l.cancerChance * 100)}%`,
            l.needMon && "🐾 이모몬 보유자만", l.battleGate && "⚔️ 배틀러를 이겨야 입장", l.typeGate && "🔷 랜덤 속성 보유자만", l.req?.who && `🚧 ${l.req.who} 전용`,
            l.noEnd && "🔒 턴 종료 불가", l.passLate && "⏱️ 5분 이하에서만 맵권", l.disaster && "🌪️ 재난", l.buttonTax && `🔘 버튼마다 HP −${l.buttonTax}`, l.church && "⛪ 안개 · 악마 조각상 · Priest",
            l.arcade && "🕹️ 아케이드", l.quiz && "🧠 퀴즈 팝업", l.inferno && "🔥 코너마다 죽음의 룰렛",
        ].filter(Boolean);
        return h("div.ag-card.am-loc" + (l.off ? ".off" : ""),
            h("div.row.between",
                h("h3", mapNo(l.id) ? h("span.am-no", `#${mapNo(l.id)}`) : null, `${l.emoji} ${l.name}`, h("small.muted", ` · ${l.id}`)),
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
            l.gotcha ? h("div.am-togs", h("small", "🎰 Monster Gotcha:"), h("button.btn.small.gold", { onclick: () => gotchaManager(l.id, afterStock) }, "🎰 Gotcha 몬스터 구성")) : null,
            l.emoshop || l.lab ? h("div.am-togs", h("small", "🐾 EmoMon 상점 관리:"),
                l.emoshop ? h("button.btn.small.gold", { onclick: () => stockManager(l.id, "shop", afterStock) }, "🛒 Monster Shop 재고 · 가격") : null,
                l.lab ? h("button.btn.small.gold", { onclick: () => stockManager(l.id, "lab", afterStock) }, "🧪 LAB 상점 재고 · 가격") : null) : null,
            h("div.am-togs", toggle("job", "💼 직업 코너"), toggle("beg", "🥺 구걸"), toggle("discount", "🏷️ 할인 상점"), toggle("spell", "🐝 Spelling Bee"), toggle("bank", "🏦 Business Bank"), toggle("bizhub", "🏪 Self-Business"), toggle("capture", "🔍 EmoMon Capture"), toggle("hospital", "🏥 Monster Hospital"), toggle("lab", "🧪 Monster Lab"), toggle("emoshop", "🛒 Monster Shop"), toggle("community", "💬 커뮤니티"), toggle("arena", "🏟️ 아레나"), toggle("lotto", "🎟️ 로또"), toggle("highlight", "🎬 Highlight"), toggle("dept", "🏬 백화점"), toggle("gotcha", "🎰 Monster Gotcha"),
                h("label.am-tog", "👹 NPC 출몰", h("select", { onchange: ev => { const v = ev.target.value; e.npc = v === "hot" ? true : v === "rand" ? false : v; dirty(); } },
                    [["rand", "랜덤 (40% · 하늘·심해·우주 25%)"], ["hot", "랜덤·자주 (60% · 하늘·심해·우주 40%)"], ["always", "항상"], ["never", "안 나옴"]].map(([v, t]) => h("option", { value: v, selected: (l.npc === "always" ? "always" : l.npc === "never" ? "never" : l.npc ? "hot" : "rand") === v }, t))))),
            // 🤝 도움주기: 체크한 맵에만 나옴 — 👫 내 친구: 기본은 모든 맵
            h("div.am-togs", h("small", "소셜 코너:"),
                h("label.am-tog", h("input", { type: "checkbox", checked: l.help === true, onchange: ev => { if (ev.target.checked) e.help = true; else delete e.help; dirty(); draw(); } }), "🤝 도움주기"),
                h("label.am-tog", h("input", { type: "checkbox", checked: l.friends !== false, onchange: ev => { if (ev.target.checked) delete e.friends; else e.friends = false; dirty(); draw(); } }), "👫 내 친구")),
            l.region === "survival" ? h("div.am-togs.am-survival", h("small", "🔄 Survival Land 규칙:"),
                toggle("noEnd", "🔒 턴 종료 불가"), toggle("noPass", "🚫 맵권 사용 불가"), toggle("passLate", "⏱️ 남은 5분 이하에서만 맵권"), toggle("deadNpc", "☠️ Dead Land NPC"),
                toggle("disaster", "🌪️ 재난 (지진·홍수·강풍)"), h("label.am-tog", h("input", { type: "checkbox", checked: !!l.buttonTax, onchange: ev => { e.buttonTax = ev.target.checked ? 5 : false; dirty(); draw(); } }), "🔘 버튼마다 HP −5"),
                toggle("church", "⛪ 안개 · 악마 조각상 · Priest"), toggle("quiz", "🧠 퀴즈 팝업 (2분에 1번 이상)"), toggle("inferno", "🔥 코너마다 죽음의 룰렛"), toggle("arcade", "🕹️ 아케이드 게임")) : null,
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
            lifeEditor(l, e),
            !(l.slots?.length) ? h("p.notice", "⚠️ 슬롯이 하나도 없습니다.") : null);
    }

    // ---- 🍚 food corners · 🌦️ weather · 🏨 lodging of one map
    function lifeEditor(l, e) {
        const foods = structuredClone(l.food || []), lodges = structuredClone(l.lodge || []);
        const setFood = list => { e.food = list; dirty(); draw(); };
        const setLodge = list => { e.lodge = list; dirty(); draw(); };
        const entrySel = (cur, onPick) => h("select", { onchange: ev => onPick(ev.target.value) }, Object.entries(ENTRY_KINDS).map(([v, t]) => h("option", { value: v, selected: cur === v }, t)));
        const feeIn = (cur, onSet) => h("input.num", { type: "number", min: 0, step: 100, value: cur || 0, title: "입장료 (G)", onchange: ev => onSet(Math.max(0, Math.round(+ev.target.value || 0))) });
        const foodCard = (c, i) => {
            const T = FOOD_CORNERS[c.k];
            if (!T) return null;
            const items = c.items || T.items.map(id => ({ id }));
            const upd = patch => { const next = structuredClone(foods); next[i] = { ...next[i], items: structuredClone(items), ...patch }; setFood(next); };
            const entry = c.entry || T.entry, fee = c.fee ?? T.fee;
            const used = new Set(items.map(x => x.id));
            return h("div.am-life-card", { style: { "--c": T.color } },
                h("div.row.between", h("b", `${T.emoji} ${c.name || T.name}`), h("button.btn.small.ghost", { title: "이 코너 빼기", onclick: () => setFood(foods.filter((_, k) => k !== i)) }, "✕ 빼기")),
                h("div.am-life-row", h("small", "입장"), h("small.muted", `🎡 입장 룰렛 (모든 푸드 코너 · 무료 30% · 1천/3천/5천/1만G 각 5% · 거절 50%)${FOOD_HOME_COUNTRY[c.k] ? ` · 🏠 ${FOOD_HOME_COUNTRY[c.k]} 출신: 무료 50% · 1천G 20% · 거절 30%` : ""}${FOOD_CORNER_RACES[c.k] ? ` · 🧬 ${FOOD_CORNER_RACES[c.k].join("/")} 종족만` : ""}`), T.free ? h("small.muted", "· 모두 무료") : null),
                h("div.am-food-items", items.map((it, k) => {
                    const f = FOOD_BY_ID[it.id];
                    return f ? h("span.am-food", h("span", `${f.emoji} ${f.name}`), h("small", `🍚${f.food >= 0 ? "+" : ""}${f.food}`),
                        T.free ? h("small.muted", "무료") : h("input.num", { type: "number", min: 0, step: 100, value: it.price ?? f.price, title: `기본가 ${f.price}G`, onchange: ev => { const next = structuredClone(items); next[k].price = Math.max(0, Math.round(+ev.target.value || 0)); if (next[k].price === f.price) delete next[k].price; upd({ items: next }); } }),
                        h("button", { title: "빼기", onclick: () => upd({ items: items.filter((_, x) => x !== k) }) }, "×")) : null;
                }),
                    h("select", { onchange: ev => { if (ev.target.value) upd({ items: [...items, { id: ev.target.value }] }); } }, h("option", { value: "" }, "+ 품목 추가…"), FOODS.filter(f => !used.has(f.id)).map(f => h("option", { value: f.id }, `${f.emoji} ${f.name} (${f.price}G · 🍚${f.food})`)))),
                c.items ? h("button.btn.small.ghost", { onclick: () => upd({ items: undefined }) }, "↺ 품목 기본값") : null);
        };
        const lodgeCard = (c, i) => {
            const T = LODGES[c.k];
            if (!T) return null;
            const upd = patch => { const next = structuredClone(lodges); next[i] = { ...next[i], ...patch }; setLodge(next); };
            const entry = c.entry || T.entry, fee = c.fee ?? T.fee;
            return h("div.am-life-card", { style: { "--c": T.color } },
                h("div.row.between", h("b", `${T.emoji} ${T.name}`), h("button.btn.small.ghost", { onclick: () => setLodge(lodges.filter((_, k) => k !== i)) }, "✕ 빼기")),
                h("div.am-life-row", h("small", "입장"), entrySel(entry, v => upd({ entry: v })), entry === "paid" ? feeIn(fee, v => upd({ fee: v })) : null),
                h("small.muted", `${T.reserve ? "📅 예약 1~3라운드" : "예약 불가"} · ` + T.rooms.map(r => `${r.label} ${r.n}자리 ${r.price ? r.price.toLocaleString() + "G" : "무료"} (${r.pick === "random" ? "랜덤" : "바로 선택"})`).join(" · ")
                    + (T.needTypes ? ` · 🐾 ${T.needTypes.join("/")} 필요` : "") + (T.freeTypes ? ` · 🐾 ${T.freeTypes.join("/")} 무료` : "") + (T.shop ? ` · 🔐 ${FOOD_CORNERS[T.shop].name}` : "") + (T.foods ? ` · 🔐 ${T.foods.map(k => FOOD_CORNERS[k].name).join(" · ")}` : "")));
        };
        return h("div.am-life",
            h("div.am-togs", h("small", "🌦️ 날씨:"), h("small.muted", "🎲 모든 맵 랜덤 (라운드마다 · 해 10% · 비 10% · 폭우 20% · 눈 10% · 폭설 20% · 우박 20% · 폭염 10%) · 맵에서 1분마다 HP 피해 · 숙소에 머물면 무사")),
            h("div.am-togs", h("small", `🍚 푸드 코너 (${foods.length}):`),
                h("select", { onchange: ev => { if (ev.target.value) setFood([...foods, { k: ev.target.value }]); } }, h("option", { value: "" }, "+ 푸드 코너 추가…"), FOOD_CORNER_LIST.map(T => h("option", { value: T.id }, `${T.emoji} ${T.name}`)))),
            foods.length ? h("div.am-life-list", foods.map(foodCard)) : null,
            h("div.am-togs", h("small", `🏨 숙소 코너 (${lodges.length}):`),
                h("select", { onchange: ev => { if (ev.target.value) setLodge([...lodges, { k: ev.target.value }]); } }, h("option", { value: "" }, "+ 숙소 코너 추가…"), LODGE_LIST.filter(T => !lodges.some(c => c.k === T.id)).map(T => h("option", { value: T.id }, `${T.emoji} ${T.name}`)))),
            lodges.length ? h("div.am-life-list", lodges.map(lodgeCard)) : null);
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
            // this page owns only regions / locs / honor — everything else in "maps" (Monster Shop · LAB stock + prices,
            // EmoMon capture / admin settings) is saved by its own popup in the meantime, so merge onto the CURRENT value
            // instead of the copy taken when the page opened (that used to wipe a stock edit made before pressing 저장)
            const next = { ...structuredClone(Store.maps || {}), regions: structuredClone(work.regions), locs: structuredClone(work.locs) };
            if (work.honor) next.honor = structuredClone(work.honor); else delete next.honor;
            await Store.saveMaps(next);
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
