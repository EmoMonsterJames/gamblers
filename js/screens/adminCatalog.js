// Admin: manage weapons / items / pets / pet effects / frames / frame
// effects — stats, which shop sells them, price and at which casinos.
import { h, fmt } from "../core/util.js";
import { toast, confirmBox } from "../core/fx.js";
import { Store } from "../core/store.js";
import { SHOPS, LOCATIONS } from "../data/catalog.js";
import { CATS, STAT_FIELDS, saleOf, applyCatalog, locationShops, WEAPON_ANIMS, PET_ANIMS, FX_MODES, FRAME_STYLES } from "../data/catalogAdmin.js";
import { petView, weaponChip } from "../ui/profile.js";
import { particles } from "../core/fx.js";

const FIELD_LABEL = { name: "이름", emoji: "아이콘", type: "종류", atk: "ATK", acc: "ACC", kind: "구분", boost: "확률 %", desc: "설명" };

export function adminCatalogPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🛒 상품·상점 관리"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    const work = structuredClone(Store.catalog || {});
    work.edits ||= {}; work.custom ||= {};
    let cat = "weapon", dirty = false;
    const tabs = h("div.tabs");
    const body = h("div.cat-body");
    const saveBtn = h("button.btn.gold", { onclick: save }, "💾 저장");
    const page = h("div.page.admin-catalog",
        h("div.row.between", h("h2.page-title", "🛒 상품·상점 관리"), h("div.row", h("a.btn.ghost", { href: "#/admin" }, "← 관리자"), saveBtn)),
        h("p.muted", "가격을 비우면 기본값. '판매 장소'를 하나도 고르지 않으면 해당 상점이 있는 모든 카지노에서 판매합니다. 장소를 고르면 그 카지노에만 (상점이 없던 곳이면 상점 탭이 새로 생깁니다). 포인트 상점은 P, 나머지는 G로 판매됩니다."),
        tabs, body);

    const edit = (c, id) => (work.edits[`${c}:${id}`] ||= {});
    const markDirty = () => { dirty = true; saveBtn.textContent = "💾 저장 *"; };
    function draw() {
        tabs.replaceChildren(...Object.entries(CATS).map(([k, c]) => h("button.tab" + (k === cat ? ".on" : ""), { onclick: () => { cat = k; draw(); } }, c.label)));
        // preview the working copy
        const saved = Store.catalog; Store.catalog = work; applyCatalog();
        const rows = CATS[cat].list.map(e => row(cat, e));
        Store.catalog = saved; applyCatalog();
        body.replaceChildren(
            h("div.cat-table", h("div.cat-row.head", h("span", ""), h("span", "능력치"), h("span", "판매 상점 / 가격"), h("span", "판매 장소"), h("span", "")), rows),
            ...(CATS[cat].custom ? [addForm(cat)] : []));
    }
    function row(c, e) {
        const ed = edit(c, e.id);
        const sale = saleOf(c, e.id);
        const stats = h("div.cat-stats", STAT_FIELDS[c].map(f => field(c, f, e[f], v => { ed[f] = v; markDirty(); })));
        const shopSel = h("select", { onchange: ev => { const v = ev.target.value; if (!v) ed.off = true; else { ed.off = false; ed.shop = v; } markDirty(); draw(); } },
            h("option", { value: "", selected: sale.off || !sale.shop }, "판매 안 함"),
            Object.entries(SHOPS).map(([k, s]) => h("option", { value: k, selected: !sale.off && sale.shop === k }, `${s.icon} ${s.name}`)));
        const price = h("input.num", { type: "number", min: 0, value: sale.price || "", placeholder: "가격", onchange: ev => { ed.price = ev.target.value === "" ? null : +ev.target.value; markDirty(); } });
        const locs = h("div.loc-pick", LOCATIONS.map(l => {
            const on = (ed.locs || []).includes(l.id);
            const has = sale.shop && locationShops(l).includes(sale.shop);
            return h("button.lchip" + (on ? ".on" : "") + (!ed.locs?.length && has ? ".def" : ""), { title: l.name, onclick: () => {
                const cur = new Set(ed.locs || []);
                cur.has(l.id) ? cur.delete(l.id) : cur.add(l.id);
                ed.locs = cur.size ? [...cur] : null; markDirty(); draw();
            } }, l.emoji);
        }));
        return h("div.cat-row" + (sale.off ? ".off" : ""),
            h("div.cat-prev", preview(c, e), e.custom ? h("small.badge", "추가됨") : null),
            stats,
            h("div.cat-sale", shopSel, h("div.row", price, h("small", sale.cur))),
            locs,
            h("div.cat-act",
                work.edits[`${c}:${e.id}`] && Object.keys(work.edits[`${c}:${e.id}`]).length ? h("button.btn.ghost.small", { title: "기본값으로", onclick: () => { delete work.edits[`${c}:${e.id}`]; markDirty(); draw(); } }, "↺") : null,
                e.custom ? h("button.btn.red.small", { onclick: async () => {
                    if (!(await confirmBox(`'${e.name}'을(를) 삭제할까요? 이미 가진 플레이어에게서는 표시가 사라질 수 있습니다.`))) return;
                    work.custom[c] = (work.custom[c] || []).filter(x => x.id !== e.id); delete work.edits[`${c}:${e.id}`]; markDirty(); draw();
                } }, "삭제") : null));
    }
    function field(c, f, val, set) {
        const label = h("small", FIELD_LABEL[f] || f);
        let input;
        if (f === "type") input = h("select", { onchange: e => set(e.target.value) }, ["attack", "block", "sleep", "magic", "nomove", "spray"].map(t => h("option", { value: t, selected: t === val }, { attack: "공격", block: "방어", sleep: "수면", magic: "마법", nomove: "No Move" }[t])));
        else if (f === "kind") input = h("select", { onchange: e => set(e.target.value) }, ["normal", "special"].map(t => h("option", { value: t, selected: t === val }, t === "normal" ? "일반" : "특수")));
        else if (["atk", "acc", "boost"].includes(f)) input = h("input.num", { type: "number", min: 0, max: f === "boost" ? 30 : 100, value: val ?? "", onchange: e => set(+e.target.value) });
        else input = h("input" + (f === "emoji" ? ".emo" : ""), { value: val ?? "", onchange: e => set(e.target.value) });
        return h("label.cf.f-" + f, label, input);
    }
    function addForm(c) {
        const v = { name: "", emoji: "⭐", type: "attack", atk: 10, acc: 70, anim: WEAPON_ANIMS[0], kind: "normal", boost: 5, petAnim: PET_ANIMS[0], chars: "✨ ⭐", mode: FX_MODES[0], style: FRAME_STYLES[0], shop: CATS[c].shop, price: 50000 };
        const inp = (k, attrs = {}) => h("input", { value: v[k], ...attrs, onchange: e => { v[k] = attrs.type === "number" ? +e.target.value : e.target.value; } });
        const sel = (k, opts) => h("select", { onchange: e => { v[k] = e.target.value; } }, opts.map(o => h("option", { value: o, selected: o === v[k] }, o)));
        const L = (t, el) => h("label.cf", h("small", t), el);
        const fields = {
            weapon: [L("아이콘", inp("emoji")), L("종류", sel("type", ["attack", "block", "sleep", "magic", "nomove", "spray"])), L("ATK", inp("atk", { type: "number" })), L("ACC", inp("acc", { type: "number" })), L("애니메이션", sel("anim", WEAPON_ANIMS))],
            pet: [L("이모지", inp("emoji")), L("구분", sel("kind", ["normal", "special"])), L("확률 %", inp("boost", { type: "number" })), L("움직임", sel("petAnim", PET_ANIMS))],
            effect: [L("문자/이모지 (띄어쓰기 구분)", inp("chars")), L("구분", sel("kind", ["normal", "special"])), L("확률 %", inp("boost", { type: "number" })), L("효과 모양", sel("mode", FX_MODES))],
            frame: [L("스타일", sel("style", FRAME_STYLES))],
            peffect: [L("문자/이모지 (띄어쓰기 구분)", inp("chars")), L("효과 모양", sel("mode", FX_MODES))]
        }[c];
        return h("div.add-form",
            h("h4", `➕ 새 ${CATS[c].label} 추가`),
            h("div.row.wrap", L("이름", inp("name")), ...fields,
                L("상점", sel("shop", Object.keys(SHOPS))), L("가격", inp("price", { type: "number" })),
                h("button.btn.gold", { onclick: () => {
                    if (!v.name.trim()) return toast("이름을 입력하세요", "warn");
                    const id = `c_${c}_${Date.now().toString(36)}`;
                    const chars = String(v.chars).split(/\s+/).filter(Boolean);
                    const e = {
                        weapon: { id, name: v.name, emoji: v.emoji, type: v.type, atk: +v.atk, acc: +v.acc, anim: v.anim },
                        pet: { id, name: v.name, kind: v.kind, boost: Math.min(30, +v.boost), art: { a: v.emoji, anim: v.petAnim } },
                        effect: { id, name: v.name, kind: v.kind, boost: Math.min(30, +v.boost), fx: { chars, mode: v.mode, n: 10, size: 16 } },
                        frame: { id, name: v.name, cls: v.style },
                        peffect: { id, name: v.name, fx: { chars, mode: v.mode, n: 9, size: 14 } }
                    }[c];
                    (work.custom[c] ||= []).push(e);
                    work.edits[`${c}:${id}`] = { shop: v.shop, price: +v.price, off: false };
                    markDirty(); draw(); toast(`${v.name} 추가 (저장 버튼을 눌러 확정)`, "ok");
                } }, "추가")));
    }
    async function save() {
        // drop empty edits
        for (const [k, ed] of Object.entries(work.edits)) if (!Object.keys(ed).length) delete work.edits[k];
        await Store.saveCatalog(structuredClone(work));
        applyCatalog();
        dirty = false; saveBtn.textContent = "💾 저장";
        toast("상품·상점 설정을 저장했습니다", "ok");
    }
    draw();
    return page;
}

function preview(c, e) {
    if (c === "pet") return petView(e.id, null, 48);
    if (c === "weapon") return weaponChip(e.id);
    if (c === "effect" || c === "peffect") { const b = h("div.fx-preview.small", h("span", c === "effect" ? "🐾" : "🙂")); b.append(particles(e.fx, 0.6)); return b; }
    if (c === "frame") return h("div.avatar.preview.small." + e.cls, h("div.fr-dummy", "🙂"));
    return h("div.big-emoji", e.emoji || "🎁");
}
