// Profile pictures (frame + effect), pets, and the full player card.
import { h, fmt, esc } from "../core/util.js";
import { particles } from "../core/fx.js";
import { Store } from "../core/store.js";
import { FRAME_BY_ID, PEFFECT_BY_ID, PET_BY_ID, PETFX_BY_ID, WEAPON_BY_ID, ITEM_BY_ID, BASIC_ATTACK, attackCount } from "../data/catalog.js";
import { CONFIG } from "../config.js";

export function displayName(p) { return p ? (p.name_ko || p.player_name) : "?"; }

// Avatar with decorative frame + profile effect (no gameplay effect)
export function avatar(pid, size = 64, { effect = true, frame = true, cls = "" } = {}) {
    const p = Store.player(pid);
    const d = Store.getDecor(pid);
    const fr = frame && d.frame ? FRAME_BY_ID[d.frame] : null;
    const el = h("div.avatar" + (fr ? "." + fr.cls : "") + (cls ? "." + cls : ""), { style: { width: size + "px", height: size + "px" }, title: p?.player_name || "" },
        h("img", { src: p?.profile_image || "", alt: p?.player_name || "", loading: "lazy", draggable: "false" }));
    if (effect && d.effect && PEFFECT_BY_ID[d.effect]) el.append(particles(PEFFECT_BY_ID[d.effect].fx, Math.max(0.6, size / 110)));
    return el;
}

// Pet art (emoji layers with CSS animation) + optional pet effect around it
export function petView(petId, effectId = null, size = 64) {
    const pet = PET_BY_ID[petId];
    if (!pet) return h("div.pet.empty", { style: { width: size + "px", height: size + "px" } }, "—");
    const a = pet.art;
    const el = h("div.pet.anim-" + a.anim + (a.gold ? ".gold" : "") + (a.ghost ? ".ghosty" : "") + (pet.kind === "special" ? ".special" : ""),
        { style: { width: size + "px", height: size + "px", fontSize: size * 0.55 + "px" }, title: pet.name });
    if (a.stack) el.append(h("div.pet-stack", a.stack.map(x => h("span", x))));
    else if (a.trio) el.append(h("div.pet-trio", [0, 1, 2].map(i => h("span", { style: { "--i": i } }, a.trio, h("b.pet-b", a.b)))));
    else if (a.pond) el.append(h("div.pet-pond", h("span.koi.k1", "🐟"), h("span.koi.k2", "🐠"), h("span.koi.k3", "🐟"), h("span.cash", "💵")));
    else {
        el.append(h("span.pet-a" + (a.redeye ? ".redeye" : ""), a.a));
        if (a.b) el.append(h("span.pet-b.pos-" + (a.bpos || "mouth"), a.b));
    }
    if (a.drops) for (let i = 0; i < 5; i++) el.append(h("span.pet-drop", { style: { "--i": i } }, a.drops));
    const fx = effectId ? PETFX_BY_ID[effectId] : null;
    if (fx) el.append(particles(fx.fx, size / 80));
    return el;
}

export function badge(text, cls = "") { return h("span.badge" + (cls ? "." + cls : ""), text); }

// Full player card. ps = season player state (money/points/pet/…) or null
export function playerCard(pid, ps = null, { compact = false } = {}) {
    const p = Store.player(pid);
    if (!p) return h("div.pcard", "?");
    const rec = Store.record(pid);
    const pet = ps?.pet ? PET_BY_ID[ps.pet] : null;
    const pfx = ps?.petEffect ? PETFX_BY_ID[ps.petEffect] : null;
    const info = [
        ["국가", p.country], ["학교", p.school], ["직업", p.job], ["종족", p.ethnicity],
        ["연령대", p.age_group], ["성별", p.gender], ["성향", p.preference], ["전담자", p.handler]
    ].filter(x => x[1]);
    const hpPct = ps ? Math.max(0, ps.hp) / CONFIG.START_HP * 100 : 100;
    return h("div.pcard" + (compact ? ".compact" : "") + (ps?.out ? ".out" : ""),
        h("div.pcard-top",
            avatar(pid, compact ? 72 : 110),
            h("div.pcard-name",
                h("div.nk", displayName(p)),
                h("div.en", p.player_name),
                h("div.badges",
                    p.handler ? badge("전담 " + p.handler, "handler") : null,
                    badge(rec.avg ? `전적 평균 ${rec.avg.toFixed(1)}위 (${rec.seasons}시즌)` : "전적 없음", "rec"),
                    rec.wins ? badge(`👑 ${rec.wins}회 우승`, "crown") : null,
                    ps?.out ? badge(`탈락 · ${ps.rank}위`, "dead") : null),
                ps ? h("div.hp", h("div.hp-bar", h("i", { style: { width: hpPct + "%" } })), h("span", `HP ${ps.hp}`)) : null)),
        ps ? h("div.pcard-money",
            h("div.stat.gold", h("small", "보유금액"), h("b", fmt(ps.money) + " G")),
            h("div.stat.pts", h("small", "포인트"), h("b", fmt(ps.points) + " P"))) : null,
        compact ? null : h("div.pcard-info", info.map(([k, v]) => h("div", h("small", k), h("span", v)))),
        ps && !compact ? h("div.pcard-gear",
            h("div.gear-pet",
                h("small", "펫"),
                pet ? h("div.row", petView(pet.id, pfx?.id, 56), h("div",
                    h("b", pet.name), h("div.muted", `${pet.kind === "special" ? "특수펫" : "일반펫"} +${pet.boost}%`),
                    pfx ? h("div.muted", `효과: ${pfx.name} +${pfx.boost}%${pfx.kind === "special" ? " (특수)" : ""}`) : null)) : h("div.muted", "없음")),
            h("div.gear-weapons",
                h("small", `무기 (${ps.weapons.length}/${CONFIG.MAX_WEAPONS} · 공격 ${attackCount(ps.weapons)}/${CONFIG.MAX_ATTACK_WEAPONS})`),
                ps.weapons.length ? h("div.wlist", ps.weapons.map(w => weaponChip(w))) : h("div.muted", `없음 — ${BASIC_ATTACK.name} (ATK ${BASIC_ATTACK.atk} / ACC ${BASIC_ATTACK.acc})`)),
            itemsLine(ps)) : null
    );
}
export function weaponChip(id) {
    const w = WEAPON_BY_ID[id] || BASIC_ATTACK;
    const stat = w.type === "attack" ? `ATK ${w.atk} · ACC ${w.acc}` : w.type === "block" ? `방어 · ACC ${w.acc}` : w.type === "magic" ? `랜덤 마법 · ACC ${w.acc}` : w.type === "nomove" ? "아무 효과 없음" : `수면 · ACC ${w.acc}`;
    return h("span.wchip" + (w.rare ? ".rare" : ""), { title: stat }, h("i", w.emoji), w.name, h("small", stat));
}
function itemsLine(ps) {
    const items = Object.entries(ps.items || {}).filter(([, n]) => n > 0);
    if (!items.length) return null;
    return h("div.gear-items", h("small", "아이템"), h("div.wlist", items.map(([id, n]) => h("span.wchip", h("i", ITEM_BY_ID[id]?.emoji || "🎁"), `${ITEM_BY_ID[id]?.name || id} ×${n}`))));
}

export function miniPlayer(pid, ps, extra = null) {
    const p = Store.player(pid);
    return h("div.mini" + (ps?.out ? ".out" : ""), avatar(pid, 40, { effect: false }),
        h("div.mini-t", h("b", displayName(p)), h("small", ps ? `${fmt(ps.money)} G · ${ps.points} P` : p.country)), extra);
}
export { esc };
