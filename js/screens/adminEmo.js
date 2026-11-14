// =====================================================================
// Admin: 🐾 EmoMon
//   🔄 데이터 동기화 (EmoMonster → Gamblers settings "emomon")
//   🧬 Monster Generator (EmoMonster's monster form → "Claude Copy" prompt)
//   📊 Attribute Stats (monsters / weapons per attribute)
//   🔍 Capture 설정 (per map: door · find chance · monster pool)
// =====================================================================
import { h, fmt, put } from "../core/util.js";
import { toast, confirmBox, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { LOCATIONS, LOC_BY_ID, REGIONS } from "../data/catalog.js";
import { emoReady, E } from "../emomon/engine.js";
import { EMO, cat, loadCatalog, syncFromEmoMonster, captureConfigs, species, typesOfSpecies, emoAdmin, EMO_ITEMS, baseItem, emoItem, weaponPriceBase, traitPriceBase, weaponPrice, traitPrice, isFirstStage, priceText, shopStock, labStock, LAB_ONLY, isOrb, isSpecialEvo, specialEvoAuto } from "../emomon/data.js";
import { monPic, typeChip, stars, itemIcon, weaponLine, rangeBrowser, typeStarBrowser, traitTypes } from "../emomon/ui.js";

const TYPES = ["Normal", "Abnormal", "Magic", "Power", "Water", "Fire", "Grass", "Electric", "Ice", "Angel", "Evil", "Air", "Fly", "Earth", "Bug", "Ghost", "Steel", "Fairy", "Space", "Robot", "Light", "Mind"];
const RARITY = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
const TRIGGERS = ["Always", "Battle start", "When attacking", "When hit", "Low HP", "Once per battle", "Turn end"];

export function adminEmoPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🐾 몬스터 관리 (EmoMon)"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    let tab = cat() ? "mons" : "sync";
    const tabsEl = h("div.tabs"), body = h("div.ae-body", h("p.muted", "불러오는 중…"));
    const page = h("div.page.admin-emo", h("h2.page-title", "🐾 몬스터 관리 (EmoMon)"), h("p.muted.small", "EmoMonster 데이터를 바탕으로 Gamblers 안에서 쓸 몬스터 · 무기 · 특성 · 아이템을 관리합니다. 켜기/끄기와 가격은 Gamblers에만 적용되고 EmoMonster 원본은 바뀌지 않습니다."), tabsEl, body);
    const draw = () => {
        put(tabsEl, ...[["gen", "🧬 몬스터 생성기"], ["mons", "🐾 몬스터"], ["rarity", "⭐ 희귀도"], ["weapons", "⚔ 무기"], ["stats", "🔷 속성"], ["traits", "🧬 특성"], ["items", "🎒 몬스터 아이템"], ["stock", "🛒 상점 재고"], ["cap", "🔍 Capture 설정"], ["sync", "🔄 데이터 동기화"]].map(([k, l]) => h("button.tab" + (k === tab ? ".on" : ""), { onclick: () => { tab = k; draw(); } }, l)));
        const need = tab !== "sync" && tab !== "gen" && !cat();
        put(body, need ? h("p.notice.warn", "먼저 🔄 데이터 동기화를 해 주세요.") : tab === "sync" ? syncTab(draw) : tab === "gen" ? genTab() : tab === "stats" ? statsTab() : tab === "mons" ? monsTab() : tab === "rarity" ? rarityTab() : tab === "weapons" ? weaponsTab() : tab === "traits" ? traitsTab() : tab === "items" ? itemsTab() : tab === "stock" ? stockTab() : capTab(draw));
    };
    emoReady().then(loadCatalog).catch(e => console.warn(e)).finally(() => { if (cat() && tab === "sync") tab = "mons"; draw(); });
    return page;
}

// ---------------------------------------------------------------- 🔄 sync
function syncTab(redraw) {
    const C = cat();
    const log = h("div.ae-log");
    const btn = h("button.btn.gold.big", { onclick: async () => {
        if (!(await confirmBox("EmoMonster(같은 Supabase 프로젝트의 public 스키마)에서 몬스터 · 무기 · 특성 · 진화 · 아이템 · 질병 · LAB 조합법을 읽어 와\nGamblers 설정(settings \"emomon\")에 저장합니다. 진행할까요?", "가져오기", "취소"))) return;
        btn.disabled = true; put(log, );
        try {
            const r = await syncFromEmoMonster(t => log.append(h("div", `⏳ ${t} 읽는 중…`)));
            log.append(h("div.ok", "✅ 완료: " + Object.entries(r.counts).map(([k, n]) => `${k} ${n}`).join(" · ")));
            toast("EmoMon 데이터를 가져왔습니다", "ok");
            setTimeout(redraw, 900);
        } catch (e) { console.error(e); log.append(h("div.bad", "❌ " + e.message)); btn.disabled = false; }
    } }, "🔄 EmoMonster에서 가져오기");
    return h("div.ae-sync",
        h("div.ag-card",
            h("h3", "EmoMon 데이터"),
            C ? h("div.ae-kv",
                h("div", `몬스터 ${C.mons.length}종 (1단계 ${C.base.length}종)`), h("div", `무기 ${C.weapons.length}개 · 특성 ${C.traits.length}개`),
                h("div", `진화 ${C.evo.length}개 · 아이템 ${C.items.length}개 · LAB 조합 ${C.recipes.length}개`),
                h("div.muted", `마지막 동기화: ${C.at ? new Date(C.at).toLocaleString() : "?"}`),
                h("div.muted", `1단계 희귀도: ${[1, 2, 3, 4, 5, 6].map(r => `★${r} ${C.base.filter(m => (m.rarity || 1) === r).length}`).join(" · ")}`))
                : h("p.notice.warn", "아직 가져온 데이터가 없습니다."),
            h("p.muted.small", "EmoMonster에서 몬스터 · 무기를 추가하거나 바꾼 뒤 다시 가져오면 Gamblers에 반영됩니다. 이미 잡은 몬스터는 그대로 유지됩니다."),
            btn, log));
}

// ---------------------------------------------------------------- 🧬 Monster Generator (EmoMonster's monster form)
const GEN_KEY = "gamblers.emoGen";
function genTab() {
    let drafts;
    try { drafts = JSON.parse(localStorage.getItem(GEN_KEY) || "null"); } catch { }
    if (!Array.isArray(drafts) || !drafts.length) drafts = [blank()];
    const keep = () => { try { localStorage.setItem(GEN_KEY, JSON.stringify(drafts)); } catch { } };
    const wrap = h("div.ae-gen");
    const names = new Set((cat()?.mons || []).map(m => m.name.toLowerCase()));
    const tnames = new Set((cat()?.traits || []).map(t => t.name.toLowerCase()));
    function blank(extra = {}) { return { _id: Math.random().toString(36).slice(2, 8), ai_weapons: true, trait1: {}, trait2: {}, ...extra }; }
    const draw = () => put(wrap, 
        h("p.muted.small", "EmoMonster의 Monster Generator와 같은 양식입니다. 몬스터를 입력하고 'Claude Copy'를 누르면 Claude에게 붙여 넣을 등록 요청문이 복사됩니다."),
        ...drafts.map((e, i) => card(e, i)),
        h("div.row", h("button.btn.ghost", { onclick: () => { drafts.push(blank()); keep(); draw(); } }, "➕ 몬스터 추가"),
            h("button.btn.ghost", { onclick: async () => { if (await confirmBox("입력한 내용을 모두 지울까요?")) { drafts = [blank()]; keep(); draw(); } } }, "🗑 모두 지우기"),
            h("button.btn.gold", { onclick: copy }, "📋 Claude Copy")));
    const inp = (e, k, label, { type = "text", ph = "", span = 1, opts = null, dup = null } = {}) => {
        const get = () => k.split(".").reduce((o, p) => o?.[p], e) ?? "";
        const set = v => { const ps = k.split("."); let o = e; for (const p of ps.slice(0, -1)) o = (o[p] ||= {}); o[ps.at(-1)] = v; keep(); };
        let el;
        if (opts) el = h("select", { onchange: ev => set(ev.target.value) }, h("option", { value: "" }, "—"), opts.map(o => h("option", { value: o, selected: get() === o }, o)));
        else if (type === "textarea") el = h("textarea", { rows: 2, placeholder: ph, oninput: ev => set(ev.target.value) }, get());
        else el = h("input", { type, value: get(), placeholder: ph, oninput: ev => { set(ev.target.value); if (dup) warn.textContent = dup.has(ev.target.value.trim().toLowerCase()) ? "⚠️ 이미 있는 이름" : ""; } });
        const warn = h("small.bad", dup && dup.has(String(get()).trim().toLowerCase()) ? "⚠️ 이미 있는 이름" : "");
        return h("label.cf" + (span > 1 ? ".span" + span : ""), h("small", label), el, warn);
    };
    function card(e, i) {
        const from = e._from ? drafts.find(x => x._id === e._from) : null;
        return h("div.ag-card.ae-gen-card",
            h("div.row.between", h("b", `🐾 #${i + 1} ${e.name || ""}`), h("button.btn.small.red", { onclick: () => { drafts.splice(i, 1); if (!drafts.length) drafts.push(blank()); keep(); draw(); } }, "✕")),
            from ? h("div.gen-hint", `⬆ ${from.name || "이전 몬스터"}에서 진화`) : null,
            h("div.ae-grid",
                inp(e, "name", "Name", { span: 2, dup: names }), inp(e, "rarity", "Rarity", { opts: RARITY }),
                inp(e, "type1", "Attribute 1", { opts: TYPES }), inp(e, "type2", "Attribute 2", { opts: TYPES }), inp(e, "type3", "Attribute 3", { opts: TYPES }),
                inp(e, "look", "Look / theme", { span: 3, ph: "e.g. a sleepy cloud sheep" }),
                ...[1, 2].flatMap(n => [h("div.span3.ae-sec", `Trait ${n}`),
                    inp(e, `trait${n}.name`, "Trait name", { dup: tnames }), inp(e, `trait${n}.rarity`, "Trait rarity", { opts: RARITY }), inp(e, `trait${n}.trigger`, "When it works", { opts: TRIGGERS }),
                    inp(e, `trait${n}.count`, "Times per battle", { type: "number", ph: "auto" }), inp(e, `trait${n}.chance`, "Chance %", { type: "number", ph: "100" }),
                    inp(e, `trait${n}.content`, "What it does", { type: "textarea", span: 3 })]),
                h("div.span3.ae-sec", "Evolution"),
                h("label.cf", h("small", "Evolves into another monster"), h("input", { type: "checkbox", checked: !!e.evolves, onchange: ev => {
                    e.evolves = ev.target.checked;
                    if (e.evolves && !drafts.some(x => x._from === e._id)) drafts.splice(drafts.indexOf(e) + 1, 0, blank({ _from: e._id, type1: e.type1, type2: e.type2, type3: e.type3, rarity: e.rarity ? RARITY[Math.min(5, RARITY.indexOf(e.rarity) + 1)] : "" }));
                    keep(); draw();
                } })),
                e.evolves ? [inp(e, "evo_level", "Evolution level", { type: "number" }), inp(e, "evo_weapon", "Must hold weapon (name)"), inp(e, "evo_chance", "Evolution chance %", { type: "number" }),
                    inp(e, "evo_special", "Special evolution method (not an item)", { type: "textarea", span: 3 })] : null,
                inp(e, "memo", "Memo (anything special)", { type: "textarea", span: 3 }),
                h("div.span3.ae-sec", "Weapons"),
                inp(e, "weapon_count", "Weapons (Lv 1–100)", { type: "number", ph: "auto" }),
                h("label.cf.span2", h("small", "AI weapons"), h("span", h("input", { type: "checkbox", checked: !!e.ai_weapons, onchange: ev => { e.ai_weapons = ev.target.checked; keep(); } }), " Claude AI가 해당 몬스터의 느낌, 희귀도 등을 판별해서 자체적으로 레벨에 따른 무기를 넣어주세요"))));
    }
    async function copy() {
        const list = drafts.filter(e => e.name || e.look);
        if (!list.length) return toast("몬스터를 입력하세요", "warn");
        const entries = list.map((e, i) => {
            const c = {};
            for (const [k, v] of Object.entries(e)) {
                if (k === "_id") continue;
                if (k === "_from") { c.evolves_from = drafts.find(x => x._id === v)?.name || null; continue; }
                if (v && typeof v === "object") { const o = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== "" && x != null)); if (Object.keys(o).length) c[k] = o; }
                else if (v !== "" && v != null && v !== false) c[k] = v;
            }
            if (c.name && names.has(c.name.toLowerCase())) c.WARNING_name_exists = [c.name];
            return { no: i + 1, ...c };
        });
        const text = `[EmoMonster Generator] 🐾 Monster x${list.length} · ${new Date().toISOString().slice(0, 10)}
Please create and register ${list.length > 1 ? `these ${list.length} monsters` : "this monster"} in EmoMonster (Supabase doxdtjyhrbnaldtbnmnk).
Fields that are missing were left empty on purpose: pick sensible defaults that fit the game.
Draw the monster SVG, set stats by rarity, create the new traits, learnsets and the evolution chain. Insert evolution families one by one in order (base form first). Special evolutions MUST be applied exactly: evo_level = evolve_level, evo_weapon = the weapon it must hold (monster_evolution.required_weapon_id), evo_chance = % chance per try (evolve_chance), and anything in evo_special or the memo about evolving (also set it in the admin evolution editor). Weapons: give it weapon_count level-up weapons over Lv 1-100 (empty = a fitting number). If ai_weapons is true, choose them yourself from its look, attributes and rarity: attack weapons spread weak to strong over the levels plus a few status weapons, no duplicates within the family. If ai_weapons is missing, leave the learnset empty for the admin to fill in Monster Manager.
Rarity: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC (stored as 1..6).
After registering, sync it into Gamblers: Gamblers admin → 🐾 EmoMon 관리 → 🔄 EmoMonster에서 가져오기.

\`\`\`json
${JSON.stringify({ kind: "monster", entries }, null, 2)}
\`\`\``;
        let ok = false;
        try { await navigator.clipboard.writeText(text); ok = true; } catch { }
        modal(h("div", h("p", ok ? "✅ 복사했습니다. Claude에게 붙여 넣으세요." : "복사가 막혀 있습니다. 아래 내용을 직접 복사하세요."), h("textarea.ae-copy", { rows: 16, readonly: true }, text)), { title: "📋 Claude Copy", wide: true });
    }
    draw();
    return wrap;
}

// ---------------------------------------------------------------- 📊 Attribute Stats
// 속성별 (per attribute) · 1개 / 2개 / 3개 속성 몬스터 (grouped by their attribute set)
function statsTab() {
    const wrap = h("div");
    let mode = 0;
    const draw = () => put(wrap,
        h("div.bk-tabs", [[0, "📊 속성별"], [1, "1개 속성 몬스터"], [2, "2개 속성 몬스터"], [3, "3개 속성 몬스터"]].map(([k, l]) => h("button.bk-tab" + (k === mode ? ".on" : ""), { onclick: () => { mode = k; draw(); } }, l))),
        mode === 0 ? attrTable() : comboView(mode));
    draw();
    return wrap;
}
function comboView(n) {
    const mons = cat().mons.filter(m => m.id !== EMO.BOT_ID && typesOfSpecies(m).length === n);
    const groups = new Map();
    for (const m of mons) { const k = typesOfSpecies(m).join(" / "); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); }
    const list = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const detail = h("div.ae-detail");
    let open = null;
    const btns = h("div.emo-drill-btns");
    const fill = () => {
        put(btns, ...list.map(([k, ms]) => h("button.emo-drill-b" + (k === open ? ".on" : ""), { onclick: () => { open = k === open ? null : k; fill(); } }, h("span", ...k.split(" / ").map(typeChip)), h("small", `${ms.length}종`))));
        put(detail, open ? h("div.ag-card", h("h3", ...open.split(" / ").map(typeChip), ` ${groups.get(open).length}종`),
            h("div.ae-mons", ...groups.get(open).map(m => h("div.ae-mon", monPic(m, 48), h("small", `#${m.id} ${m.name}`), h("small", EMO.STARS(m.rarity)))))) : h("p.muted.small", "속성 조합을 누르면 몬스터가 나옵니다"));
    };
    fill();
    return h("div", h("p.muted.small", `속성이 ${n}개인 몬스터 ${mons.length}종 · 조합 ${list.length}가지`), btns, detail);
}
// ---------------------------------------------------------------- ⭐ rarity
function rarityTab() {
    const mons = cat().mons.filter(m => m.id !== EMO.BOT_ID);
    const wrap = h("div");
    let r = null;
    const draw = () => put(wrap,
        h("p.muted.small", "별 개수(희귀도)를 누르면 그 등급의 몬스터가 나옵니다."),
        h("div.emo-drill-btns", ...[1, 2, 3, 4, 5, 6].map(s => h("button.emo-drill-b" + (s === r ? ".on" : ""), { onclick: () => { r = s === r ? null : s; draw(); } },
            h("b.emo-stars", EMO.STARS(s)), h("small", `${RARITY[s - 1]} · ${mons.filter(m => (m.rarity || 1) === s).length}종`)))),
        r ? h("div.ae-mons", ...mons.filter(m => (m.rarity || 1) === r).map(m => h("div.ae-mon", monPic(m, 48), h("small", `#${m.id} ${m.name}`), h("span", ...typesOfSpecies(m).map(typeChip)), h("small", isFirstStage(m.id) ? "1단계" : "진화형")))) : null);
    draw();
    return wrap;
}
function attrTable() {
    const C = cat();
    const norm = t => TYPES.find(x => x.toLowerCase() === String(t || "").toLowerCase());
    const monBy = new Map(TYPES.map(t => [t, []])), baseBy = new Map(TYPES.map(t => [t, 0])), wBy = new Map(TYPES.map(t => [t, []]));
    for (const m of C.mons) for (const t of typesOfSpecies(m)) { const k = norm(t); if (k) { monBy.get(k).push(m); if (C.base.includes(m)) baseBy.set(k, baseBy.get(k) + 1); } }
    for (const w of C.weapons) { const k = norm(w.attribute); if (k) wBy.get(k).push(w); }
    const maxM = Math.max(1, ...[...monBy.values()].map(l => l.length)), maxW = Math.max(1, ...[...wBy.values()].map(l => l.length));
    const detail = h("div.ae-detail");
    const show = t => put(detail, h("div.ag-card", h("h3", typeChip(t), ` 몬스터 ${monBy.get(t).length} · 무기 ${wBy.get(t).length}`),
        h("div.ae-mons", ...monBy.get(t).map(m => h("div.ae-mon", monPic(m, 48), h("small", m.name), h("small", EMO.STARS(m.rarity))))),
        h("table.ae-table", h("tr", h("th", "무기"), h("th", "★"), h("th", "위력"), h("th", "명중"), h("th", "효과")),
            ...wBy.get(t).sort((a, b) => (a.rarity || 1) - (b.rarity || 1)).map(w => h("tr", h("td", w.name), h("td", String(w.rarity || 1)), h("td", String(w.power ?? "")), h("td", String(w.accuracy ?? "")), h("td.small", w.effect_type && w.effect_type !== "none" ? w.effect_type.replace(/_/g, " ") : ""))))));
    return h("div.ae-stats",
        h("p.muted.small", "속성별 몬스터 · 무기 수입니다 (몬스터는 속성마다 1번씩 셉니다). 막대를 누르면 목록이 나옵니다."),
        h("table.ae-table.ae-heat", h("tr", h("th", "속성"), h("th", "몬스터 (1단계)"), h("th", "무기")),
            ...TYPES.slice().sort((a, b) => monBy.get(b).length - monBy.get(a).length).map(t => h("tr", { onclick: () => show(t) },
                h("td", typeChip(t)),
                h("td", h("div.ae-bar", h("i", { style: { width: monBy.get(t).length / maxM * 100 + "%", background: E.colors?.[t] } }), h("span", `${monBy.get(t).length} (${baseBy.get(t)})`))),
                h("td", h("div.ae-bar", h("i", { style: { width: wBy.get(t).length / maxW * 100 + "%", background: E.colors?.[t] } }), h("span", String(wBy.get(t).length))))))),
        detail);
}

// ---------------------------------------------------------------- 🔍 Capture settings per map
function capTab(redraw) {
    const all = captureConfigs();
    const ov = () => (Store.maps.emoCapture ||= {});
    let region = "";
    const list = h("div.ae-cap-list");
    const save = async (msg) => { await Store.saveMaps({ ...Store.maps }); toast(msg || "저장했습니다", "ok"); fill(); };
    const fill = () => {
        const cfgs = captureConfigs();
        put(list, ...LOCATIONS.filter(l => !region || l.region === region).map(l => {
            const c = cfgs[l.id], o = ov()[l.id] || {};
            const set = (k, v) => { const x = (ov()[l.id] ||= {}); if (v === "" || v == null) delete x[k]; else x[k] = v; if (!Object.keys(x).length) delete ov()[l.id]; save(); };
            return h("div.ag-card.ae-cap" + (l.capture ? "" : ".off"),
                h("div.row.between", h("b", `${l.emoji} ${l.name}`, h("small.muted", ` · ${REGIONS.find(r => r.id === l.region)?.name || l.region}`)),
                    l.capture ? h("small", `테마: ${c.themeText}`) : h("small.bad", "Capture 꺼짐 (지역/맵 관리에서 켜기)")),
                h("div.row",
                    h("label.cf", h("small", "입장"), h("select", { onchange: e => set("door", e.target.value) }, [["", `자동 (${c.door})`], ["free", "무료"], ["random", "랜덤 문 60%"], ["fee", "입장료 1,000G"]].map(([v, t]) => h("option", { value: v, selected: (o.door || "") === v }, t)))),
                    h("label.cf", h("small", "몬스터 출현 %"), h("input.num", { type: "number", min: 30, max: 70, value: o.chance || "", placeholder: String(c.chance), onchange: e => set("chance", e.target.value ? Math.max(1, Math.min(100, +e.target.value)) : "") })),
                    h("label.cf", h("small", "속성"), h("span", ...c.types.slice(0, 10).map(typeChip))),
                    h("button.btn.small.ghost", { onclick: () => editPool(l, c, ids => set("mons", ids.length ? ids : "")) }, `🐾 몬스터 ${c.mons.length}종 ${o.mons ? "(직접 지정)" : "(자동)"}`)),
                h("div.ae-pool", ...c.mons.map(id => species(id)).filter(Boolean).map(m => h("span.ae-pm", { title: `${m.name} ★${m.rarity}` }, monPic(m, 32)))));
        }));
    };
    function editPool(l, c, done) {
        const chosen = new Set(c.mons.map(Number));
        const grid = h("div.ae-pool-edit", ...cat().base.map(m => { const b = h("button.ae-pe" + (chosen.has(m.id) ? ".on" : ""), { onclick: () => { chosen.has(m.id) ? chosen.delete(m.id) : chosen.add(m.id); b.classList.toggle("on"); cnt.textContent = `${chosen.size}종 선택`; } }, monPic(m, 40), h("small", m.name), h("small", EMO.STARS(m.rarity)), h("span", ...typesOfSpecies(m).map(typeChip))); return b; }));
        const cnt = h("b", `${chosen.size}종 선택`);
        const mm = modal(h("div", h("p.muted.small", "1단계 · 진화 없는 몬스터만 나옵니다. 2~15종을 권장합니다. 비우고 저장하면 자동으로 돌아갑니다."), cnt, grid,
            h("div.row.end", h("button.btn.ghost", { onclick: () => { mm.close(); done([]); } }, "↺ 자동으로"), h("button.btn.gold", { onclick: () => { mm.close(); done([...chosen]); } }, "저장"))), { title: `🐾 ${l.name} 몬스터 목록`, wide: true });
    }
    fill();
    const nFee = Object.values(all).filter(c => c.door === "fee").length, nRand = Object.values(all).filter(c => c.door === "random").length;
    return h("div",
        h("p.muted.small", `몬스터가 희귀하고 다양한 맵일수록 입장 조건이 붙습니다 (자동: 입장료 ${nFee}곳 · 랜덤 문 ${nRand}곳 · 나머지 무료). 출현 확률 30~70%, 몬스터 2~15종은 맵마다 자동으로 정해지며 여기서 바꿀 수 있습니다.`),
        h("select", { onchange: e => { region = e.target.value; fill(); } }, h("option", { value: "" }, "모든 지역"), REGIONS.map(r => h("option", { value: r.id }, `${r.emoji || ""} ${r.name}`))),
        list);
}

// ---------------------------------------------------------------- shared: Gamblers-side overrides (settings "maps".emoAdmin)
const AD = () => (Store.maps.emoAdmin ||= {});
async function saveAdmin(msg) { await Store.saveMaps({ ...Store.maps, emoAdmin: { ...AD() } }); if (msg) toast(msg, "ok"); }
function toggleIn(key, id, on) {
    const list = new Set((AD()[key] || []).map(String));
    on ? list.delete(String(id)) : list.add(String(id));
    AD()[key] = [...list];
    saveAdmin(on ? "켰습니다" : "껐습니다 (Gamblers에서 나오지 않습니다)");
}
const isOn = (key, id) => !(AD()[key] || []).map(String).includes(String(id));
// price box: "150000" = gold, "500P" = points, empty = the default (base = { gold, pts })
function priceInput(key, id, base) {
    const cur = AD()[key]?.[id];
    const baseTxt = base?.pts ? `${base.pts}P` : `${fmt(base?.gold || 0)}G`;
    return h("input.ae-price", { type: "text", value: cur ?? "", placeholder: priceText(base), title: `기본 ${baseTxt} · 숫자 = 골드, 500P = 포인트 (비우면 기본값)`,
        onchange: e => {
            const v = e.target.value.trim().toUpperCase().replace(/[,\sG]/g, "");
            AD()[key] ||= {};
            if (v === "") delete AD()[key][id];
            else if (/^\d+P$/.test(v) || /^\d+$/.test(v)) AD()[key][id] = /P$/.test(v) ? v : +v;
            else return toast("숫자(골드) 또는 500P 처럼 입력하세요", "warn");
            saveAdmin("가격을 저장했습니다");
        } });
}
function listTab({ rows, render, filterText, head }) {
    const q = h("input", { placeholder: "이름 / 속성 검색" });
    const list = h("div.ae-list");
    const fill = () => { const f = q.value.trim().toLowerCase(); put(list, ...rows.filter(r => !f || filterText(r).toLowerCase().includes(f)).slice(0, 400).map(render)); };
    q.oninput = fill; fill();
    return h("div", head, h("div.row", q, h("small.muted", `${rows.length}개`)), list);
}

// ---------------------------------------------------------------- 🐾 monsters (#1~100 · #101~200 …)
function monsTab() {
    const C = cat();
    const evoRow = e => {
        const to = species(e.target_monster_id);
        if (!to) return null;
        const auto = specialEvoAuto(e);
        return h("label.am-tog.ae-evo", { title: auto ? "무기 · 아이템 2개가 필요한 진화라 기본이 특수 진화입니다" : "" },
            h("input", { type: "checkbox", checked: isSpecialEvo(e), onchange: ev => {
                AD().specialEvo ||= {};
                if (ev.target.checked === auto) delete AD().specialEvo[e.id]; else AD().specialEvo[e.id] = ev.target.checked;
                saveAdmin(ev.target.checked ? `${to.name}: 🔬 실험실 특수 진화 (1000P)` : `${to.name}: 일반 진화 (100P)`);
            } }), ` → ${to.name} 특수 진화`);
    };
    const render = m => {
        const st = E.stats.compute(m, EMO.LEVEL, [], "Default");
        const evos = C.evoFrom(m.id);
        return h("div.ae-row" + (isOn("offMons", m.id) ? "" : ".off"), monPic(m, 44),
            h("div.ae-row-main", h("b", `#${m.id} ${m.name} `, stars(m.rarity)), h("div", ...typesOfSpecies(m).map(typeChip)),
                h("small.muted", `${isFirstStage(m.id) ? "1단계" : "진화형"} · P.ATK ${st.physAttack} · S.ATK ${st.specAttack} · SPD ${st.speed} · P.DEF ${st.physDefense} · S.DEF ${st.specDefense}`),
                evos.length ? h("div.ae-evos", ...evos.map(evoRow)) : null),
            h("label.am-tog", h("input", { type: "checkbox", checked: isOn("offMons", m.id), onchange: e => { toggleIn("offMons", m.id, e.target.checked); e.target.closest(".ae-row").classList.toggle("off", !e.target.checked); } }), " 사용"));
    };
    return h("div",
        h("p.muted.small", "번호대를 누르면 몬스터 목록이 나옵니다. 끈 몬스터는 Capture 코너와 EmoMon Battler에 나오지 않습니다 (이미 잡은 몬스터는 그대로). '특수 진화'를 켠 진화는 🧪 Monster Lab의 🔬 실험실에서만 1000P로 진화합니다 (일반 진화는 100P)."),
        rangeBrowser({ items: C.mons.filter(m => m.id !== EMO.BOT_ID), render, placeholder: "이름 / 속성 / #번호 검색", searchText: m => `${m.name} ${typesOfSpecies(m).join(" ")} #${m.id}` }));
}
// ---------------------------------------------------------------- ⚔ weapons (attribute → ★ → list)
function weaponsTab() {
    const render = w => h("div.ae-row" + (isOn("offWeapons", w.id) ? "" : ".off"), typeChip(w.attribute),
        h("div.ae-row-main", ...weaponLine(w), " ", stars(w.rarity), h("small.muted", ` · PP ${w.max_uses ?? E.cfg.DEFAULT_WEAPON_USES}`)),
        priceInput("wPrice", w.id, weaponPriceBase(w)),
        h("label.am-tog", h("input", { type: "checkbox", checked: isOn("offWeapons", w.id), onchange: e => { toggleIn("offWeapons", w.id, e.target.checked); e.target.closest(".ae-row").classList.toggle("off", !e.target.checked); } }), " 사용"));
    return h("div",
        h("p.muted.small", "속성 → 별 등급을 누르면 무기가 나옵니다. 기본 가격: 모든 무기 100,000G 이상, 위력 × 명중이 높은 좋은 무기는 300~1000P. 가격 칸에 숫자(골드) 또는 500P처럼 입력하면 바뀝니다. 어느 상점에서 팔지는 🛒 상점 재고 탭에서 정합니다. 끈 무기는 상점과 Battler에 나오지 않습니다."),
        typeStarBrowser({ items: cat().weapons.filter(w => !(w.allowed_monster_ids || []).map(Number).includes(EMO.BOT_ID)), typesOf: w => [w.attribute], starOf: w => w.rarity || 1,
            render, searchText: w => `${w.name} ${w.attribute}`, placeholder: "무기 이름 / 속성 검색" }));
}
// ---------------------------------------------------------------- 🧬 traits (attribute → ★ → list)
function traitsTab() {
    const render = t => h("div.ae-row" + (isOn("offTraits", t.id) ? "" : ".off"), h("span.big", "🧬"),
        h("div.ae-row-main", h("b", t.name, " "), stars(t.rarity), h("div.small", E.traits.describe(t)), h("small.muted", E.traits.allowedText(t))),
        priceInput("tPrice", t.id, traitPriceBase(t)),
        h("label.am-tog", h("input", { type: "checkbox", checked: isOn("offTraits", t.id), onchange: e => { toggleIn("offTraits", t.id, e.target.checked); e.target.closest(".ae-row").classList.toggle("off", !e.target.checked); } }), " 사용"));
    return h("div",
        h("p.muted.small", "기본 가격: 모든 특성 200,000G 이상, ★4 이상 좋은 특성은 300~1000P. 어느 상점에서 팔지는 🛒 상점 재고 탭에서 정합니다."),
        typeStarBrowser({ items: cat().traits, typesOf: traitTypes, starOf: t => t.rarity || 1, render, searchText: t => `${t.name} ${E.traits.describe(t)}`, placeholder: "특성 이름 / 설명 검색" }));
}
// ---------------------------------------------------------------- 🎒 monster items
function itemsTab() {
    const C = cat();
    const ids = [...EMO_ITEMS.map(i => i.id), ...C.items.filter(i => ["evolution", "material"].includes(i.category)).map(i => i.id)];
    return listTab({
        head: h("p.muted.small", "가격 칸: 숫자 = 골드, 500P = 포인트, 비우면 기본값. 🔒 표시는 상점에서 팔지 않고 LAB 조합으로만 얻는 아이템입니다. Find에서 나오는 아이템: 몬스터볼 · Super Ball · PP 회복약 · HP +10 약 · 알파벳 카드 C D F I J K P."),
        rows: ids.map(baseItem).filter(Boolean),
        filterText: it => `${it.name} ${it.kind}`,
        render: it => h("div.ae-row", itemIcon(it, 32),
            h("div.ae-row-main", h("b", it.name, it.noSale || LAB_ONLY.has(it.id) ? " 🔒" : ""), h("small.muted", ` · ${{ ball: "볼", potion: "HP 약", pp: "PP 약", cure: "치료제", delete: "티켓", breaker: "Breaker", evo: it.orb ? "진화 Orb" : "진화 아이템", material: "LAB 재료" }[it.kind] || it.kind}`), it.note ? h("div.small.muted", it.note) : null),
            it.noSale || LAB_ONLY.has(it.id) ? h("small.muted", "LAB 조합 전용") : priceInput("iPrice", it.id, { gold: it.gold || 0, pts: it.pts || 0 }))
    });
}
// ---------------------------------------------------------------- 🛒 shop stock + prices per map (Monster Shop · LAB 상점)
// settings "maps".emoShop[locId] = { items, balls, weapons, traits, price } · .emoLabShop[locId] = { items, price }
// (a missing list = automatic) · price: { "i:ID" | "w:ID" | "t:ID": 150000 | "500P" } = this shop only
const shopKind = loc => [loc.emoshop && "shop", loc.lab && "lab"].filter(Boolean);
function stockSummary(loc, shop) {
    if (shop === "lab") { const st = labStock(loc.id); return `${st.items.length}종${st.ov.items != null ? " · 직접 지정" : " · 자동"}${Object.keys(st.price).length ? ` · 가격 지정 ${Object.keys(st.price).length}개` : ""}`; }
    const st = shopStock(loc.id), n = st.items.length + st.balls.length + st.weapons.length + st.traits.length;
    return `${n}종 (속성 볼 ${st.balls.length} · 무기 ${st.weapons.length} · 특성 ${st.traits.length})${Object.keys(st.ov).some(k => k !== "price") ? " · 직접 지정" : " · 자동"}${Object.keys(st.price).length ? ` · 가격 지정 ${Object.keys(st.price).length}개` : ""}`;
}
// one shop's goods: search to add, a price per good (blank = the admin's global price), ✕ to remove
export async function stockManager(locId, shop, onSaved = () => { }) {
    await emoReady(); if (!cat()) await loadCatalog();
    const C = cat(), loc = LOC_BY_ID[locId];
    if (!C || !loc) return toast("EmoMon 데이터를 먼저 불러오세요", "warn");
    // every good this kind of shop can sell, as { key, label, icon, kind, base }
    const goods = [];
    if (shop === "lab") {
        for (const i of C.items.filter(i => ["evolution", "material"].includes(i.category) && !LAB_ONLY.has(i.id))) {
            const it = emoItem(i.id); if (!it) continue;
            goods.push({ key: "i:" + it.id, id: it.id, label: it.name, icon: () => itemIcon(it, 26), kind: it.orb ? "🔮 Orb" : it.kind === "material" ? "🧱 재료" : "✨ 진화", base: { gold: it.gold || 0, pts: it.pts || 0 } });
        }
    } else {
        for (const i of EMO_ITEMS.filter(i => !i.noSale && i.kind !== "breaker")) {
            const it = emoItem(i.id);
            goods.push({ key: "i:" + it.id, id: it.id, label: it.name, icon: () => itemIcon(it, 26), kind: it.attr ? "🔷 속성 볼" : { ball: "⚪ 볼", potion: "🧪 약", pp: "🔋 PP", cure: "💊 치료", delete: "🎫 티켓", radar: "📡 레이더" }[it.kind] || it.kind, attr: !!it.attr, base: { gold: it.gold || 0, pts: it.pts || 0 } });
        }
        for (const w of C.weapons.filter(w => !(w.allowed_monster_ids || []).map(Number).includes(EMO.BOT_ID) && w.attribute))
            goods.push({ key: "w:" + w.id, id: w.id, label: `${w.name} (${w.attribute} ${EMO.STARS(w.rarity)})`, icon: () => typeChip(w.attribute), kind: "⚔ 무기", base: weaponPrice(w) });
        for (const t of C.traits)
            goods.push({ key: "t:" + t.id, id: t.id, label: `${t.name} ${EMO.STARS(t.rarity)}`, icon: () => h("span", "🧬"), kind: "🧬 특성", base: traitPrice(t) });
    }
    const byKey = Object.fromEntries(goods.map(g => [g.key, g]));
    // current list
    let keys, price;
    if (shop === "lab") { const st = labStock(locId); keys = st.items.map(id => "i:" + id); price = { ...st.price }; }
    else { const st = shopStock(locId); keys = [...st.items.map(id => "i:" + id), ...st.balls.map(id => "i:" + id), ...st.weapons.map(id => "w:" + id), ...st.traits.map(id => "t:" + id)]; price = { ...st.price }; }
    keys = [...new Set(keys)].filter(k => byKey[k]);
    const list = h("div.ae-sm-list"), found = h("div.ae-sm-found"), count = h("b");
    const q = h("input.ae-sm-q", { placeholder: "🔎 추가할 아이템 · 무기 · 특성 검색 (이름 / 속성)", oninput: () => search() });
    const baseTxt = b => b?.pts ? `${b.pts}P` : `${fmt(b?.gold || 0)}G`;
    const drawList = () => {
        count.textContent = `판매 중 ${keys.length}종`;
        put(list, ...(keys.length ? keys.map(k => {
            const g = byKey[k];
            const inp = h("input.ae-price", { type: "text", value: price[k] ?? "", placeholder: baseTxt(g.base), title: "비우면 어드민 기본 가격 · 숫자 = 골드, 500P = 포인트",
                onchange: e => {
                    const v = e.target.value.trim().toUpperCase().replace(/[,\sG]/g, "");
                    if (v === "") delete price[k];
                    else if (/^\d+P$/.test(v) || /^\d+$/.test(v)) price[k] = /P$/.test(v) ? v : +v;
                    else { e.target.value = price[k] ?? ""; toast("숫자(골드) 또는 500P 처럼 입력하세요", "warn"); }
                } });
            return h("div.ae-sm-row", g.icon(), h("div.ae-sm-name", h("b", g.label), h("small.muted", ` ${g.kind} · 기본 ${baseTxt(g.base)}`)), inp,
                h("button.btn.small.ghost", { title: "빼기", onclick: () => { keys = keys.filter(x => x !== k); delete price[k]; drawList(); search(); } }, "✕"));
        }) : [h("p.muted", "파는 물건이 없습니다. 위에서 검색해 추가하세요.")]));
    };
    const search = () => {
        const f = q.value.trim().toLowerCase();
        if (!f) { put(found); return; }
        const hits = goods.filter(g => !keys.includes(g.key) && `${g.label} ${g.kind}`.toLowerCase().includes(f)).slice(0, 30);
        put(found, ...(hits.length ? hits.map(g => h("button.ae-sm-hit", { onclick: () => { keys.push(g.key); drawList(); search(); q.focus(); } }, g.icon(), h("span", g.label), h("small.muted", ` ${g.kind} · ${baseTxt(g.base)}`), h("b.ae-sm-add", "+ 추가"))) : [h("small.muted", "검색 결과가 없습니다")]));
    };
    const save = async () => {
        if (shop === "lab") {
            const all = (Store.maps.emoLabShop ||= {});
            all[locId] = { items: keys.map(k => k.slice(2)), ...(Object.keys(price).length ? { price } : {}) };
        } else {
            const ids = p => keys.filter(k => k.startsWith(p)).map(k => k.slice(2));
            const items = ids("i:"), attr = items.filter(id => byKey["i:" + id]?.attr);
            const num = id => isNaN(+id) ? id : +id;
            const all = (Store.maps.emoShop ||= {});
            all[locId] = { items: items.filter(id => !attr.includes(id)), balls: attr, weapons: ids("w:").map(num), traits: ids("t:").map(num), ...(Object.keys(price).length ? { price } : {}) };
        }
        await Store.saveMaps({ ...Store.maps });
        toast(`${loc.name} ${shop === "lab" ? "LAB 상점" : "Monster Shop"} 재고 · 가격을 저장했습니다`, "ok");
        m.close(); onSaved();
    };
    const reset = async () => {
        if (!(await confirmBox(`${loc.name}의 ${shop === "lab" ? "LAB 상점" : "Monster Shop"}을 자동 재고 · 기본 가격으로 되돌릴까요?`, "되돌리기", "취소"))) return;
        if (shop === "lab") delete (Store.maps.emoLabShop ||= {})[locId]; else delete (Store.maps.emoShop ||= {})[locId];
        await Store.saveMaps({ ...Store.maps });
        toast("자동으로 되돌렸습니다", "ok"); m.close(); onSaved();
    };
    const m = modal(h("div.ae-sm",
        h("p.muted.small", shop === "lab" ? "이 Lab의 상점에서 팔 진화 아이템 · 재료를 검색해 넣고, 이 상점만의 가격을 정합니다 (비우면 어드민 🎒 아이템 탭의 가격)."
            : "이 Monster Shop에서 팔 볼 · 약 · 레이더 · 속성 볼 · 무기 · 특성을 검색해 넣고, 이 상점만의 가격을 정합니다 (비우면 어드민 기본 가격)."),
        q, found, h("div.row.between", count, h("small.muted", "가격 칸: 숫자 = 골드 · 500P = 포인트 · 비우면 기본")), list,
        h("div.row.end", h("button.btn.ghost", { onclick: reset }, "↺ 자동으로"), h("button.btn.ghost", { onclick: () => m.close() }, "취소"), h("button.btn.gold", { onclick: save }, "💾 저장"))),
        { title: `${loc.emoji || ""} ${loc.name} · ${shop === "lab" ? "🧪 LAB 상점" : "🛒 Monster Shop"} 재고 · 가격`, wide: true });
    drawList();
    setTimeout(() => q.focus(), 50);
    return m;
}
function stockTab() {
    const wrap = h("div");
    let region = "";
    const draw = () => {
        const maps = LOCATIONS.filter(l => (l.emoshop || l.lab) && (!region || l.region === region));
        put(wrap,
            h("p.muted.small", `Monster Shop · LAB 상점이 있는 맵만 모았습니다. ✏️ 를 누르면 그 상점에서 팔 물건을 검색해 넣고 상점별 가격을 정할 수 있습니다 (비우면 어드민 기본 가격). 기본: Monster Shop마다 속성 볼 2종 · 무기 2~3종 · 특성 1~2종이 서로 다르게 자동 배치되고 일반 볼 · 약 · 티켓 · 레이더는 모든 상점에서 팝니다. 시즌당 구매 Monster Shop ${EMO.SHOP_BUYS}회 · LAB ${EMO.LAB_BUYS}회.`),
            h("div.row", h("select", { onchange: e => { region = e.target.value; draw(); } }, h("option", { value: "" }, "모든 지역"),
                REGIONS.filter(r => LOCATIONS.some(l => l.region === r.id && (l.emoshop || l.lab))).map(r => h("option", { value: r.id, selected: r.id === region }, `${r.emoji || ""} ${r.name}`))),
                h("small.muted", `${maps.length}개 맵`)),
            h("div.ae-sm-maps", maps.map(l => h("div.ag-card.ae-stock",
                h("b", `${l.emoji || ""} ${l.name}`, h("small.muted", ` · ${REGIONS.find(r => r.id === l.region)?.name || l.region}`)),
                ...shopKind(l).map(k => h("div.ae-stock-row",
                    h("button.btn.small.gold", { onclick: () => stockManager(l.id, k, draw) }, k === "lab" ? "✏️ 🧪 LAB 상점" : "✏️ 🛒 Monster Shop"),
                    h("small", stockSummary(l, k))))))));
    };
    draw();
    return wrap;
}
