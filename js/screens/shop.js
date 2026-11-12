// Shops (general / pet / weapon / frame-effect / point) + inventory actions.
import { h, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, confetti } from "../core/fx.js";
import { Store } from "../core/store.js";
import { SHOPS, catalogEntry, WEAPON_BY_ID, PET_BY_ID, PETFX_BY_ID, SHOP_LIMIT, ITEMS, ITEM_BY_ID, REGION_ITEMS } from "../data/catalog.js";
import { CONFIG } from "../config.js";
import { S, log, name, buysLeft, noteBuy } from "../game/season.js";
import { petView, weaponChip } from "../ui/profile.js";
import { particles } from "../core/fx.js";
import { shopItems, altItems, discountItems } from "../data/catalogAdmin.js";

export function shopView(shopId, pid, locId, onChange) {
    const shop = SHOPS[shopId];
    const ps = S().ps[pid];
    const wrap = h("div.shop.shop-" + shopId);
    // discount shop: a seeded handful per map per round; other shops: their list + second-shop listings
    const list = () => shopId === "discount" ? discountItems(locId, `${S().number}-${S().round}`) : [...shopItems(shopId, locId), ...altItems(shopId)];
    const render = () => {
        const d = Store.getDecor(pid);
        wrap.replaceChildren(
            h("div.shop-head", h("span.ico", shop.icon), h("b", shop.name), h("span.limit" + (buysLeft(pid, shopId) <= 0 ? ".none" : ""), `이번 라운드 구매 ${Math.max(0, buysLeft(pid, shopId))} / ${SHOP_LIMIT[shopId] ?? 1}`), h("span.wallet", shop.cur === "P" ? `💎 ${fmt(ps.points)} P` : `💰 ${fmt(ps.money)} G`)),
            h("div.shop-grid", list().map(it => {
                const e = catalogEntry(it.cat, it.id);
                if (!e) return null;
                const owned = (it.cat === "pet" && ps.pet === it.id) || (it.cat === "effect" && ps.petEffect === it.id)
                    || (it.cat === "frame" && d.ownedFrames.includes(it.id)) || (it.cat === "peffect" && d.ownedEffects.includes(it.id));
                const have = it.cat === "weapon" ? ps.weapons.filter(w => w === it.id).length : it.cat === "item" ? (ps.items[it.id] || 0) : 0;
                const afford = (shop.cur === "P" ? ps.points : ps.money) >= it.price && buysLeft(pid, shopId) > 0;
                return h("div.sitem" + (e.rare || e.kind === "special" ? ".rare" : "") + (owned ? ".owned" : ""),
                    h("div.sitem-art", art(it.cat, e)),
                    h("div.sitem-name", e.name),
                    h("div.sitem-desc", desc(it.cat, e)),
                    it.off ? h("div.sitem-sale", h("s", fmt(it.was)), ` -${it.off}%`) : null,
                    have ? h("small.have", `보유 ${have}`) : null,
                    h("button.btn.small" + (afford && !owned ? ".gold" : ".ghost"), { disabled: owned || !afford, onclick: () => buy(it, e) },
                        owned ? "보유중" : `${fmt(it.price)} ${shop.cur}`));
            })));
    };
    async function buy(it, e) {
        const cur = shop.cur;
        const bal = cur === "P" ? ps.points : ps.money;
        if (buysLeft(pid, shopId) <= 0) return toast(`${shop.name}은(는) 라운드당 ${SHOP_LIMIT[shopId] ?? 1}번만 살 수 있어요`, "warn");
        if (bal < it.price) return toast("잔액이 부족합니다", "warn");
        if (it.cat === "weapon" && ps.weapons.length >= CONFIG.MAX_WEAPONS) return toast(`무기는 최대 ${CONFIG.MAX_WEAPONS}개! 무기삭제권으로 먼저 비워주세요`, "warn");
        if (it.cat === "pet" && ps.pet) {
            // switching pets needs a pet swap ticket (general shop); the old pet is gone, the pet effect stays
            if (!(ps.items.pet_swap > 0)) return toast("이미 펫이 있습니다. 다른 펫으로 바꾸려면 🔁 펫 교체권(일반 상점 20,000G)이 필요합니다", "warn", 3800);
            if (!(await confirmBox(`⚠️ 경고 ⚠️\n\n펫 교체권 1장을 사용해 지금의 펫 '${PET_BY_ID[ps.pet]?.name || ps.pet}'을(를) '${e.name}'(으)로 바꿉니다.\n기존 펫은 영원히 사라집니다! (펫효과${ps.petEffect ? ` '${PETFX_BY_ID[ps.petEffect]?.name}'` : ""}는 그대로 유지)\n\n정말 교체할까요?`, "교체하기", "취소"))) return;
        }
        if (it.cat === "effect" && !ps.pet) toast("펫이 있어야 펫효과가 적용됩니다 (효과는 보관됩니다)", "warn", 3500);
        if (it.cat === "effect" && ps.petEffect && !(await confirmBox(`이미 펫효과(${PETFX_BY_ID[ps.petEffect].name})가 있습니다. 교체할까요?`))) return;
        if (cur === "P") ps.points -= it.price; else ps.money -= it.price;
        noteBuy(pid, shopId);
        const d = Store.getDecor(pid);
        switch (it.cat) {
            case "item": ps.items[it.id] = (ps.items[it.id] || 0) + 1; break;
            case "weapon": ps.weapons.push(it.id); break;
            case "pet":
                if (ps.pet) { ps.items.pet_swap--; log(`🔁 ${name(pid)} 펫 교체: ${PET_BY_ID[ps.pet]?.name || ps.pet} → ${e.name}`); }
                ps.pet = it.id; break;
            case "effect": ps.petEffect = it.id; break;
            case "frame": Store.setDecor(pid, { ownedFrames: [...d.ownedFrames, it.id], frame: it.id }); break;
            case "peffect": Store.setDecor(pid, { ownedEffects: [...d.ownedEffects, it.id], effect: it.id }); break;
        }
        log(`🛒 ${name(pid)} 구매: ${e.name}`);
        Store.saveSeason();
        Sound.coin(); confetti(20, ["✨"]);
        toast(`${e.name} 구매 완료!`, "ok");
        render(); onChange?.();
    }
    render();
    return wrap;
}

function art(cat, e) {
    if (cat === "pet") return petView(e.id, null, 64);
    if (cat === "effect" || cat === "peffect") { const b = h("div.fx-preview", h("span", cat === "effect" ? "🐾" : "🙂")); b.append(particles(e.fx, 0.8)); return b; }
    if (cat === "frame") return h("div.avatar.preview." + e.cls, h("div.fr-dummy", "🙂"));
    if (cat === "weapon") return h("div.big-emoji", e.emoji);
    return h("div.big-emoji", e.emoji || "🎁");
}
function desc(cat, e) {
    if (cat === "pet") return `${e.kind === "special" ? "특수펫 · 승률+보너스" : "일반펫 · 승률"} +${e.boost}%`;
    if (cat === "effect") return `${e.kind === "special" ? "특수펫효과 · 승률+보너스" : "일반펫효과 · 승률"} +${e.boost}%`;
    if (cat === "weapon") return e.type === "attack" ? `ATK ${e.atk} / ACC ${e.acc}` : e.type === "block" ? `공격 1회 방어 / ACC ${e.acc}` : e.type === "magic" ? `랜덤 마법: 상대 무기 1개를 No Move로 · ATK 5/10/20 · 1~2턴 수면 / ACC ${e.acc}` : e.type === "nomove" ? "ATK 0 · 아무 일도 일어나지 않음" : e.type === "spray" ? `상대 무기 명중률 -${e.accDown || 10}% · ${e.turns || 3}턴 (중첩 없음) / ACC ${e.acc}` : `상대 1~3턴 수면 / ACC ${e.acc}`;
    if (cat === "frame" || cat === "peffect") return "장식용 (스킬 없음)";
    return e.desc || "";
}

// Inventory: use items, delete weapons, switch owned frames/effects
export function inventoryView(pid, { onUseTime, onMission, onPlays, onHp, onChange } = {}) {
    const ps = S().ps[pid];
    const wrap = h("div.inventory");
    const render = () => {
        const d = Store.getDecor(pid);
        wrap.replaceChildren(
            h("h4", "🎒 아이템", h("small.muted", ` · HP ${ps.hp} / ${CONFIG.START_HP}`)),
            h("div.inv-items",
                itemBtn("time_ext", "⏱️ +5분 연장 사용", () => onUseTime?.()),
                itemBtn("mission_pass", "🎫 미션완료권 사용", () => onMission?.()),
                itemBtn("casino_plus1", "🃏 카지노 +1회 사용", () => onPlays?.("casino", "casino_plus1", 1)),
                itemBtn("slot_plus5", "🎰 슬롯 +5회 사용", () => onPlays?.("slot", "slot_plus5", 5)),
                itemBtn("hp_10", "🧪 HP +10", () => onHp?.("hp_10", 10)),
                itemBtn("hp_50", "💊 HP +50", () => onHp?.("hp_50", 50)),
                itemBtn("hp_full", "❤️‍🩹 HP 전체 회복", () => onHp?.("hp_full", 999)),
                ...Object.keys(ps.items).filter(k => ps.items[k] > 0 && ITEM_BY_ID[k]?.loc).map(k => h("span.wchip", { title: "턴 시작 때 이 맵으로 바로 이동 / 국적 전용 맵 입장" }, `🎟️ ${ITEM_BY_ID[k].name} ×${ps.items[k]}`)),
                ...REGION_ITEMS.filter(r => ps.items[r.id] > 0).map(r => h("span.wchip", { title: "지역 룰렛에서 이 지역을 고를 수 있게 해 줍니다 (입장 시 소모)" }, `${r.emoji} ${r.name} ×${ps.items[r.id]}`)),
                ...Object.keys(ps.items).filter(k => ps.items[k] > 0 && k.startsWith("card_")).map(k => h("span.wchip.abc", { title: "알파벳 카드 — 미션 · 랜덤 입장 맵 강제 입장에 1번 사용" }, `🔤 ${k.slice(5)} ×${ps.items[k]}`)),
                ps.items.pet_swap > 0 ? h("span.wchip", { title: "펫 상점에서 다른 펫을 살 때 자동으로 사용됩니다" }, `🔁 펫 교체권 ×${ps.items.pet_swap}`) : null),
            h("h4", `⚔️ 무기 (${ps.weapons.length}/${CONFIG.MAX_WEAPONS})`, ps.items.weapon_del > 0 ? h("small.muted", ` · 무기삭제권 ${ps.items.weapon_del}장 — 무기를 클릭해 삭제`) : null),
            h("div.wlist", ps.weapons.length ? ps.weapons.map((w, i) => h("button.wbtn", { onclick: () => delWeapon(i) }, weaponChip(w))) : h("span.muted", "무기 없음 (기본 공격 ATK 5 / ACC 30)")),
            h("h4", "🖼️ 프레임 / 프로필 효과 (장식)"),
            h("div.wlist",
                h("button.wbtn" + (!d.frame ? ".on" : ""), { onclick: () => { Store.setDecor(pid, { frame: null }); render(); onChange?.(); } }, h("span.wchip", "프레임 없음")),
                ...d.ownedFrames.map(f => h("button.wbtn" + (d.frame === f ? ".on" : ""), { onclick: () => { Store.setDecor(pid, { frame: f }); render(); onChange?.(); } }, h("span.wchip", catalogEntry("frame", f)?.name))),
                h("button.wbtn" + (!d.effect ? ".on" : ""), { onclick: () => { Store.setDecor(pid, { effect: null }); render(); onChange?.(); } }, h("span.wchip", "효과 없음")),
                ...d.ownedEffects.map(f => h("button.wbtn" + (d.effect === f ? ".on" : ""), { onclick: () => { Store.setDecor(pid, { effect: f }); render(); onChange?.(); } }, h("span.wchip", catalogEntry("peffect", f)?.name)))));
    };
    const itemBtn = (id, label, fn) => ps.items[id] > 0 ? h("button.btn.small.gold", { onclick: () => { fn(); render(); } }, `${label} (${ps.items[id]})`) : null;
    async function delWeapon(i) {
        if (!(ps.items.weapon_del > 0)) return toast("무기삭제권이 필요합니다 (일반 상점)", "warn");
        const w = WEAPON_BY_ID[ps.weapons[i]];
        if (!(await confirmBox(`무기삭제권 1장을 사용해 '${w.name}'을(를) 삭제할까요?`))) return;
        ps.weapons.splice(i, 1); ps.items.weapon_del--;
        log(`🗑️ ${name(pid)} 무기 삭제: ${w.name}`);
        Store.saveSeason(); render(); onChange?.();
    }
    render();
    return wrap;
}
export { modal };
