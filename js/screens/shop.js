// Shops (general / pet / weapon / frame-effect / point) + inventory actions.
import { h, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, confetti } from "../core/fx.js";
import { Store } from "../core/store.js";
import { SHOPS, catalogEntry, WEAPON_BY_ID, isAttackWeapon, attackCount, PET_BY_ID, PETFX_BY_ID, SHOP_LIMIT, ITEMS, ITEM_BY_ID, REGION_ITEMS, ALPHABET, ALL_LETTERS, cardId } from "../data/catalog.js";
import { CONFIG } from "../config.js";
import { sleep } from "../core/util.js";
import { S, log, name, buysLeft, noteBuy, useLetterBox, npcBlocksLeft } from "../game/season.js";
import { petView, weaponChip, framePreview } from "../ui/profile.js";
import { particles } from "../core/fx.js";
import { shopListing, discountItems } from "../data/catalogAdmin.js";
import { letterCard, npcTicket } from "../ui/letterCard.js";
import { reportsOf } from "../game/bank.js";

export function shopView(shopId, pid, locId, onChange) {
    const shop = SHOPS[shopId];
    const ps = S().ps[pid];
    const wrap = h("div.shop.shop-" + shopId);
    // discount shop: a seeded handful per map per round; other shops: their list + second-shop listings
    const list = () => shopId === "discount" ? discountItems(locId, `${S().number}-${S().round}`) : shopListing(shopId, locId);
    const render = () => {
        const d = Store.getDecor(pid);
        wrap.replaceChildren(
            h("div.shop-head", h("span.ico", shop.icon), h("b", shop.name), h("span.limit" + (buysLeft(pid, shopId) <= 0 ? ".none" : ""), `이번 라운드 구매 ${Math.max(0, buysLeft(pid, shopId))} / ${SHOP_LIMIT[shopId] ?? 1}`), h("span.wallet", shop.cur === "P" ? `💎 ${fmt(ps.points)} P` : shop.cur === "PG" ? `💎 ${fmt(ps.points)} P · 💰 ${fmt(ps.money)} G` : `💰 ${fmt(ps.money)} G`)),
            shopId === "pointgold" ? h("p.muted.shop-note", "💠 포인트와 골드를 함께 내는 상점입니다. ⭐ 특수프레임 / 특수프레임효과는 이 상점에서만 팔아요 — 맵마다 상품이 하나씩 다릅니다.") : "",
            h("div.shop-grid", list().map(it => {
                const e = catalogEntry(it.cat, it.id);
                if (!e) return null;
                const owned = (it.cat === "pet" && ps.pet === it.id) || (it.cat === "effect" && ps.petEffect === it.id)
                    || (it.cat === "frame" && d.ownedFrames.includes(it.id)) || (it.cat === "peffect" && d.ownedEffects.includes(it.id));
                const have = it.cat === "weapon" ? ps.weapons.filter(w => w === it.id).length : it.cat === "item" ? (ps.items[it.id] || 0) : 0;
                const atkFull = it.cat === "weapon" && isAttackWeapon(it.id) && attackCount(ps.weapons) >= CONFIG.MAX_ATTACK_WEAPONS;
                const afford = canPay(ps, priceOf(it, shop.cur)) && buysLeft(pid, shopId) > 0 && !atkFull;
                return h("div.sitem" + (e.rare || e.kind === "special" || e.special ? ".rare" : "") + (owned ? ".owned" : ""),
                    h("div.sitem-art", art(it.cat, e)),
                    h("div.sitem-name", e.name),
                    h("div.sitem-desc", desc(it.cat, e)),
                    it.off ? h("div.sitem-sale", h("s", fmt(it.was)), ` -${it.off}%`) : null,
                    have ? h("small.have", `보유 ${have}`) : null,
                    atkFull ? h("small.have.warn", `공격 무기 ${CONFIG.MAX_ATTACK_WEAPONS}개 꽉 참`) : null,
                    h("button.btn.small" + (afford && !owned ? ".gold" : ".ghost"), { disabled: owned || !afford, onclick: () => buy(it, e) },
                        owned ? "보유중" : priceLabel(priceOf(it, shop.cur))));
            })));
    };
    async function buy(it, e) {
        if (buysLeft(pid, shopId) <= 0) return toast(`${shop.name}은(는) 라운드당 ${SHOP_LIMIT[shopId] ?? 1}번만 살 수 있어요`, "warn");
        const cost = priceOf(it, shop.cur);
        if (!canPay(ps, cost)) return toast("잔액이 부족합니다", "warn");
        if (!(await checkGoods(ps, it.cat, it.id, e))) return;
        pay(ps, cost);
        noteBuy(pid, shopId);
        giveGoods(pid, it.cat, it.id);
        log(`🛒 ${name(pid)} 구매: ${e.name}`);
        Store.saveSeason();
        Sound.coin(); confetti(20, ["✨"]);
        toast(`${e.name} 구매 완료!`, "ok");
        render(); onChange?.();
    }
    render();
    return wrap;
}

// ---- prices: { pts, gold } (포인트+골드 상점 goods cost both)
export const priceOf = (it, cur) => cur === "PG" ? { pts: it.price, gold: it.gold || 0 } : cur === "P" ? { pts: it.price, gold: 0 } : { pts: 0, gold: it.price };
export const canPay = (ps, c) => ps.points >= (c.pts || 0) && ps.money >= (c.gold || 0);
export const pay = (ps, c) => { ps.points -= c.pts || 0; ps.money -= c.gold || 0; };
export const priceLabel = c => [c.pts ? `${fmt(c.pts)} P` : null, c.gold ? `${fmt(c.gold)} G` : null].filter(Boolean).join(" + ") || "무료";

// can this player take that good? (weapon slots, pet swap, …) — asks when needed
export async function checkGoods(ps, cat, id, e) {
    if (cat === "weapon" && ps.weapons.length >= CONFIG.MAX_WEAPONS) { toast(`무기는 최대 ${CONFIG.MAX_WEAPONS}개! 무기삭제권으로 먼저 비워주세요`, "warn"); return false; }
    if (cat === "weapon" && isAttackWeapon(id) && attackCount(ps.weapons) >= CONFIG.MAX_ATTACK_WEAPONS) { toast(`공격 무기(HP를 줄이는 무기)는 ${CONFIG.MAX_ATTACK_WEAPONS}개까지만! 나머지 칸은 방어·수면·마법·스프레이 같은 다른 종류로 채워야 합니다`, "warn", 4000); return false; }
    if (cat === "pet" && ps.pet) {
        // switching pets needs a pet swap ticket (general shop); the old pet is gone, the pet effect stays
        if (!(ps.items.pet_swap > 0)) { toast("이미 펫이 있습니다. 다른 펫으로 바꾸려면 🔁 펫 교체권(일반 상점 20,000G)이 필요합니다", "warn", 3800); return false; }
        if (!(await confirmBox(`⚠️ 경고 ⚠️\n\n펫 교체권 1장을 사용해 지금의 펫 '${PET_BY_ID[ps.pet]?.name || ps.pet}'을(를) '${e.name}'(으)로 바꿉니다.\n기존 펫은 영원히 사라집니다! (펫효과${ps.petEffect ? ` '${PETFX_BY_ID[ps.petEffect]?.name}'` : ""}는 그대로 유지)\n\n정말 교체할까요?`, "교체하기", "취소"))) return false;
    }
    if (cat === "effect" && !ps.pet) toast("펫이 있어야 펫효과가 적용됩니다 (효과는 보관됩니다)", "warn", 3500);
    if (cat === "effect" && ps.petEffect && !(await confirmBox(`이미 펫효과(${PETFX_BY_ID[ps.petEffect].name})가 있습니다. 교체할까요?`))) return false;
    return true;
}
// hand a bought good to the player (shops + the 보따리상인)
export function giveGoods(pid, cat, id) {
    const ps = S().ps[pid], d = Store.getDecor(pid);
    switch (cat) {
        case "item": ps.items[id] = (ps.items[id] || 0) + 1; break;
        case "weapon": ps.weapons.push(id); break;
        case "pet":
            if (ps.pet) { ps.items.pet_swap--; log(`🔁 ${name(pid)} 펫 교체: ${PET_BY_ID[ps.pet]?.name || ps.pet} → ${PET_BY_ID[id]?.name || id}`); }
            ps.pet = id; break;
        case "effect": ps.petEffect = id; break;
        case "frame": Store.setDecor(pid, { ownedFrames: [...d.ownedFrames, id], frame: id }); break;
        case "peffect": Store.setDecor(pid, { ownedEffects: [...d.ownedEffects, id], effect: id }); break;
    }
}

export function art(cat, e) {
    if (cat === "pet") return petView(e.id, null, 64);
    if (cat === "effect" || cat === "peffect") { const b = h("div.fx-preview", h("span", cat === "effect" ? "🐾" : "🙂")); b.append(particles(e.fx, 0.8)); return b; }
    if (cat === "frame") return framePreview(e, 64);
    if (cat === "weapon") return h("div.big-emoji", e.emoji);
    if (e.letter) return letterCard(e.letter, 58);
    if (e.npcBlock) return npcTicket(e.npcBlock, 58);
    if (e.superLetter) return h("div.big-emoji.super-q", "❓");
    return h("div.big-emoji", e.emoji || "🎁");
}
export function desc(cat, e) {
    if (cat === "pet") return `${e.kind === "special" ? "특수펫 · 승률+보너스" : "일반펫 · 승률"} +${e.boost}%`;
    if (cat === "effect") return `${e.kind === "special" ? "특수펫효과 · 승률+보너스" : "일반펫효과 · 승률"} +${e.boost}%`;
    if (cat === "weapon") return weaponDesc(e);
    if (cat === "frame" && e.special) return "⭐ 특수프레임 · 미션 실패 시 탈락후보 지정 확률 -10% (특수프레임효과와 함께 -20%, 후보 4명 이하일 땐 미적용)";
    if (cat === "peffect" && e.special) return "⭐ 특수프레임효과 · 미션 실패 시 탈락후보 지정 확률 -10% (특수프레임과 함께 -20%, 후보 4명 이하일 땐 미적용)";
    if (cat === "frame" && e.reveal) return "장식용 · 프로필이 가려져 있고 클릭해야 보입니다";
    if (cat === "frame" || cat === "peffect") return "장식용 (스킬 없음)";
    return e.desc || "";
}
export function weaponDesc(e) {
    switch (e.type) {
        case "attack": return `ATK ${e.atk} / ACC ${e.acc}`;
        case "block": return `공격 1회 방어 / ACC ${e.acc}`;
        case "magic": return `랜덤 마법: 상대 무기 1개를 No Move로 · ATK 5/10/20 · 1~2턴 수면 / ACC ${e.acc}`;
        case "nomove": return "ATK 0 · 아무 일도 일어나지 않음";
        case "spray": return `상대 무기 명중률 -${e.accDown || 10}% · ${e.turns || 3}턴 (중첩 없음) / ACC ${e.acc}`;
        case "copy": return `상대 무기 중 랜덤 1개를 복사해 상대에게 사용 / ACC ${e.acc}`;
        case "surprise": return e.choose ? `상대 무기 중 원하는 1개와 바꿔치기해 영원히 간직 · 1회용 / ACC ${e.acc}` : `상대 무기 중 랜덤 1개와 바꿔치기해 영원히 간직 · 1회용 / ACC ${e.acc}`;
        default: return `상대 1~3턴 수면 (자는 중엔 연장 안 됨) / ACC ${e.acc}`;
    }
}

// Inventory: use items, delete weapons, switch owned frames/effects
export function inventoryView(pid, { onUseTime, onMission, onPlays, onHp, onChange, onPass, onBoost, onRandomMap, onRemoteBank, onRemoteBiz, onReports } = {}) {
    const ps = S().ps[pid];
    const wrap = h("div.inventory");
    const render = () => {
        const d = Store.getDecor(pid);
        wrap.replaceChildren(
            h("h4", "🎒 아이템", h("small.muted", ` · HP ${Math.round(ps.hp * 100) / 100} / ${CONFIG.START_HP}`)),
            h("div.inv-items",
                itemBtn("time_ext", "⏱️ +5분 연장 사용", () => onUseTime?.()),
                itemBtn("mission_pass", "🎫 미션완료권 사용", () => onMission?.()),
                itemBtn("casino_plus1", "🃏 카지노 +1회 사용", () => onPlays?.("casino", "casino_plus1", 1)),
                itemBtn("slot_plus5", "🎰 슬롯 +5회 사용", () => onPlays?.("slot", "slot_plus5", 5)),
                itemBtn("hp_10", "🧪 HP +10", () => onHp?.("hp_10", 10)),
                itemBtn("hp_50", "💊 HP +50", () => onHp?.("hp_50", 50)),
                itemBtn("hp_full", "❤️‍🩹 HP 전체 회복", () => onHp?.("hp_full", 999)),
                onBoost ? itemBtn("slot_boost", "🎰 슬롯 보너스 UP (30초)", () => onBoost("slot")) : null,
                onBoost ? itemBtn("casino_boost", "🃏 카지노 상금 UP (30초)", () => onBoost("casino")) : null,
                onRandomMap ? itemBtn("map_random", "🗺️ 랜덤 맵권 → 지금 이동", () => onRandomMap()) : null,
                itemBtn("random_letter", "❓ 랜덤알파벳권 열기", () => openLetterBox(pid, "random_letter")),
                itemBtn("super_letter", "❓ 슈퍼랜덤알파벳권 열기", () => openLetterBox(pid, "super_letter")),
                onRemoteBank ? itemBtn("remote_bank", "📲 Remote 은행 열기", () => onRemoteBank()) : null,
                onRemoteBiz ? itemBtn("biz_remote", "🛰️ Remote Business 관리", () => onRemoteBiz()) : null,
                ...["fast_transfer", "extra_transfer", "biz_move", "biz_trend", "biz_close"].filter(k => ps.items[k] > 0).map(k => h("span.wchip", { title: ITEM_BY_ID[k].desc }, `${ITEM_BY_ID[k].emoji} ${ITEM_BY_ID[k].name} ×${ps.items[k]}`)),
                onReports && reportsOf(pid).length ? h("button.btn.small.ghost", { onclick: () => onReports() }, `📁 매출 트렌드 리포트 (${reportsOf(pid).length})`) : null,
                npcBlocksLeft(ps) > 0 ? h("span.wchip.npc-chip", { title: "NPC가 공격하면 자동으로 1회씩 막아 줍니다" }, npcTicket(npcBlocksLeft(ps), 22), ` NPC 공격 Block ${npcBlocksLeft(ps)}회 남음`) : null,
                // map passes: during a turn they move the player right away (the turn clock keeps running)
                ...Object.keys(ps.items).filter(k => ps.items[k] > 0 && ITEM_BY_ID[k]?.loc).map(k => onPass && S().turn?.loc !== ITEM_BY_ID[k].loc
                    ? h("button.btn.small.gold", { title: "지금 바로 이 맵으로 이동합니다 (남은 턴 시간은 그대로)", onclick: () => onPass(k) }, `🎟️ ${ITEM_BY_ID[k].name} → 지금 이동 (${ps.items[k]})`)
                    : h("span.wchip", { title: "사용하면 이 맵으로 바로 이동 / 국적 전용 맵 입장" }, `🎟️ ${ITEM_BY_ID[k].name} ×${ps.items[k]}`)),
                ...REGION_ITEMS.filter(r => ps.items[r.id] > 0).map(r => h("span.wchip", { title: "지역 룰렛에서 이 지역을 고를 수 있게 해 줍니다 (입장 시 소모)" }, `${r.emoji} ${r.name} ×${ps.items[r.id]}`)),
                ...Object.keys(ps.items).filter(k => ps.items[k] > 0 && k.startsWith("card_")).sort().map(k => h("span.wchip.abc", { title: ITEM_BY_ID[k]?.extra ? "알파벳권 — 🐝 Spelling Bee · 랜덤 입장 맵 강제 입장에 1번 사용" : "알파벳 카드 — 미션 · 랜덤 입장 맵 강제 입장 · 🐝 Spelling Bee에 1번 사용" }, letterCard(k.slice(5), 22), ` ×${ps.items[k]}`)),
                ps.items.pet_swap > 0 ? h("span.wchip", { title: "펫 상점에서 다른 펫을 살 때 자동으로 사용됩니다" }, `🔁 펫 교체권 ×${ps.items.pet_swap}`) : null),
            h("h4", `⚔️ 무기 (${ps.weapons.length}/${CONFIG.MAX_WEAPONS} · 공격 무기 ${attackCount(ps.weapons)}/${CONFIG.MAX_ATTACK_WEAPONS})`, ps.items.weapon_del > 0 ? h("small.muted", ` · 무기삭제권 ${ps.items.weapon_del}장 — 무기를 클릭해 삭제`) : null),
            h("div.wlist", ps.weapons.length ? ps.weapons.map((w, i) => h("button.wbtn", { onclick: () => delWeapon(i) }, weaponChip(w))) : h("span.muted", "무기 없음 (기본 공격 ATK 5 / ACC 30)")),
            h("h4", "🖼️ 프레임 / 프로필 효과 (장식)"),
            h("div.wlist",
                h("button.wbtn" + (!d.frame ? ".on" : ""), { onclick: () => { Store.setDecor(pid, { frame: null }); render(); onChange?.(); } }, h("span.wchip", "프레임 없음")),
                ...d.ownedFrames.map(f => h("button.wbtn" + (d.frame === f ? ".on" : ""), { onclick: () => { Store.setDecor(pid, { frame: f }); render(); onChange?.(); } }, h("span.wchip", catalogEntry("frame", f)?.name))),
                h("button.wbtn" + (!d.effect ? ".on" : ""), { onclick: () => { Store.setDecor(pid, { effect: null }); render(); onChange?.(); } }, h("span.wchip", "효과 없음")),
                ...d.ownedEffects.map(f => h("button.wbtn" + (d.effect === f ? ".on" : ""), { onclick: () => { Store.setDecor(pid, { effect: f }); render(); onChange?.(); } }, h("span.wchip", catalogEntry("peffect", f)?.name)))));
    };
    const itemBtn = (id, label, fn) => ps.items[id] > 0 ? h("button.btn.small.gold", { onclick: async () => { await fn(); render(); onChange?.(); } }, `${label} (${ps.items[id]})`) : null;
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

// ❓ 랜덤알파벳권 (A~Z) / 슈퍼랜덤알파벳권 (G A M B L E R S): a little card roulette, then the card goes in the bag
export async function openLetterBox(pid, itemId) {
    const L = useLetterBox(pid, itemId);
    if (!L) return;
    const face = h("div.lb-face", "?");
    const m = modal(h("div.letter-box", face, h("p.muted", itemId === "super_letter" ? "G · A · M · B · L · E · R · S 중 하나!" : "A ~ Z 중 하나!")), { title: ITEM_BY_ID[itemId].name, closable: false });
    const pool = itemId === "super_letter" ? ALPHABET : ALL_LETTERS;
    for (let k = 0; k < 18; k++) { face.replaceChildren(letterCard(pool[k % pool.length], 80)); Sound.tick(); await sleep(60 + k * 9); }
    face.replaceChildren(letterCard(L, 96)); face.classList.add("got");
    Sound.bonus(); confetti(30, [L]);
    m.box.querySelector(".letter-box").append(h("p", h("b", `${ITEM_BY_ID[cardId(L)]?.name || L} 획득!`)), h("button.btn.gold", { onclick: () => m.close() }, "확인"));
    await m.closed;
}
export { modal };
