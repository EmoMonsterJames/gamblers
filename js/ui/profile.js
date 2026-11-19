// Profile pictures (frame + effect), pets, and the full player card.
import { h, fmt, esc } from "../core/util.js";
import { particles, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { lang } from "../core/i18n.js";
import { FRAME_BY_ID, PEFFECT_BY_ID, PET_BY_ID, PETFX_BY_ID, WEAPON_BY_ID, ITEM_BY_ID, BASIC_ATTACK, attackCount } from "../data/catalog.js";
import { CONFIG } from "../config.js";
import { frameDeco } from "./frames.js";
import { FOOD_START, FOOD_MAX } from "../data/life.js";

// 🦠 every disease a player can have (game/extra.js DISEASES — kept here too so the picture never needs the season rules)
export const DISEASE_ICON = { flu: { emoji: "🤧", name: "독감" }, cancer: { emoji: "🎗️", name: "암" } };
const sickList = pid => { const ps = Store.season?.ps?.[pid]; return ps && !ps.out ? Object.keys(ps.dis || {}).filter(k => ps.dis[k]) : []; };
// the diseases as chips (side card / player card) — every disease is shown, each with its own icon
export function diseaseChips(pid) {
    const list = sickList(pid);
    if (!list.length) return null;
    return h("div.dis-chips", list.map(k => { const d = DISEASE_ICON[k] || { emoji: "🦠", name: k }; return h("button.dis-chip", { title: `${d.name} — 눌러서 질병 정보 보기`, onclick: () => sickInfo(pid) }, h("i", d.emoji), d.name); }));
}
// 🏢 company mark on the picture (game/employ.js keeps the staff in Store.bank.employ)
const COMPANY_ICON = { hyhg: ["🏙️", "#0ea5e9"], gm: ["🚗", "#2563eb"], arizal: ["🛰️", "#7c3aed"], poly: ["🔺", "#f97316"], robot: ["📞", "#64748b"], sparkle: ["🧽", "#22d3ee"], dungdung: ["💩", "#a16207"] };

export function displayName(p) { return p ? ((lang() === "en" && p.player_name) || p.name_ko || p.player_name) : "?"; } // EN mode: the English name

// Avatar with decorative frame + profile effect (no gameplay effect)
export function avatar(pid, size = 64, { effect = true, frame = true, cls = "" } = {}) {
    const p = Store.player(pid);
    const d = Store.getDecor(pid);
    const fr = frame && d.frame ? FRAME_BY_ID[d.frame] : null;
    const el = h("div.avatar" + (fr ? "." + fr.cls : "") + (fr?.deco ? ".fr-has-deco" : "") + (cls ? "." + cls : ""), { style: { width: size + "px", height: size + "px", ...(fr?.deco ? { fontSize: size + "px" } : {}) }, title: p?.player_name || "" },
        h("img", { src: p?.profile_image || "", alt: p?.player_name || "", loading: "lazy", draggable: "false" }));
    const deco = frameDeco(fr, p?.profile_image);
    if (deco) el.append(deco);
    if (effect && d.effect && PEFFECT_BY_ID[d.effect]) el.append(particles(PEFFECT_BY_ID[d.effect].fx, Math.max(0.6, size / 110)));
    // gender F/M/O (top-left) · handler D/J (top-right) · blinking warning while sick
    if (size >= 34 && p) {
        const g = String(p.gender || "").trim().toLowerCase(), hd = String(p.handler || "").trim().toLowerCase();
        const gl = ["female", "f", "여", "여성", "woman"].includes(g) ? "F" : ["male", "m", "남", "남성", "man"].includes(g) ? "M" : g ? "O" : "";
        const hl = hd.startsWith("dylan") || hd === "d" ? "D" : hd.startsWith("james") || hd === "j" ? "J" : "";
        const fs = Math.max(9, Math.round(size * 0.16)) + "px";
        if (gl) el.append(h("span.av-badge.av-g.g-" + gl, { style: { fontSize: fs } }, gl));
        if (hl) el.append(h("span.av-badge.av-h", { style: { fontSize: fs } }, hl));
        // 🦠 one blinking icon per disease (🤧 flu · 🎗️ cancer · …)
        const sick = sickList(pid);
        if (sick.length)
            el.append(h("span.av-sick", { style: { fontSize: Math.max(10, Math.round(size * 0.2)) + "px" }, title: `질병: ${sick.map(k => DISEASE_ICON[k]?.name || k).join(" · ")} — 눌러서 질병 정보 보기`,
                role: "button", onclick: e => { e.preventDefault(); e.stopPropagation(); sickInfo(pid); } }, "⚠️", ...sick.map(k => h("i.av-sick-k", DISEASE_ICON[k]?.emoji || "🦠"))));
        const co = COMPANY_ICON[Store.bank?.employ?.staff?.[pid]?.co];
        if (co && size >= 56) el.append(h("span.av-co", { style: { fontSize: Math.max(10, Math.round(size * 0.16)) + "px", "--co": co[1] }, title: "취업 회사" }, co[0]));
    }
    return el;
}
// ⚠️ on a sick player's picture → which diseases, what they do, how to cure them
async function sickInfo(pid) {
    const { DISEASES } = await import("../game/extra.js"); // lazy: game/extra.js pulls in the season rules
    const ps = Store.season?.ps?.[pid];
    const list = Object.keys(ps?.dis || {}).filter(k => ps.dis[k]);
    if (!list.length) return;
    modal(h("div.sick-info", list.map(k => {
        const d = DISEASES[k] || { name: k, emoji: "🦠" };
        return h("div.sick-card",
            h("div.sick-card-head", h("span.sick-ico", d.emoji), h("div", h("b", `${d.name}${d.en ? ` (${d.en})` : ""}`), h("small", "감염 중"))),
            h("ul",
                d.hp ? h("li", `🩸 라운드가 시작될 때마다 HP −${d.hp}`) : null,
                h("li", "☠️ HP가 0이 되면 바로 사망합니다"),
                h("li", "💊 치료: ", h("b", ITEM_BY_ID[d.cure]?.name || d.cure || "치료제"), " 사용 또는 🏥 Player Clinic 치료")));
    })), { title: `🦠 질병 정보 · ${displayName(Store.player(pid))}` });
}

// frame preview for shops / inventory (a smiley instead of a player)
export function framePreview(fr, size = 64) {
    const el = h("div.avatar.preview." + fr.cls + (fr.deco ? ".fr-has-deco" : ""), { style: { width: size + "px", height: size + "px", ...(fr.deco ? { fontSize: size + "px" } : {}) } }, h("div.fr-dummy", "🙂"));
    const deco = frameDeco(fr, null);
    if (deco) el.append(deco);
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
                ps ? vitalBars(ps) : null, ps ? diseaseChips(pid) : null)),
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
// ❤️ HP + 🍚 food gauges (the same look as screens/lifeCorners.js vitals())
export function vitalBars(ps, { mini = false } = {}) {
    const bar = (cls, icon, v, max) => { const pct = Math.max(0, Math.min(100, v / max * 100)); return h("div.vbar." + cls + (pct <= 30 ? ".low" : ""), { title: `${cls === "hp" ? "HP" : "식량"} ${Math.round(v * 100) / 100} / ${max}` }, h("i.vbar-ico", icon), h("div.vbar-track", h("u", { style: { width: pct + "%" } }), mini ? null : h("b", `${Math.round(v * 10) / 10}`))); };
    return h("div.vitals" + (mini ? ".mini" : ""), bar("hp", "❤️", Math.max(0, ps.hp ?? CONFIG.START_HP), CONFIG.START_HP), bar("food", "🍚", ps.food ?? FOOD_START, FOOD_MAX));
}
export function weaponChip(id) {
    const w = WEAPON_BY_ID[id] || BASIC_ATTACK;
    const stat = w.type === "attack" ? `ATK ${w.atk} · ACC ${w.acc}` : w.type === "block" ? `방어 · ACC ${w.acc}` : w.type === "magic" ? `랜덤 마법 · ACC ${w.acc}` : w.type === "nomove" ? "아무 효과 없음"
        : w.type === "spray" ? `스프레이 · ACC ${w.acc}` : w.type === "copy" ? `상대 무기 복사 · ACC ${w.acc}` : w.type === "surprise" ? `${w.choose ? "골라서 " : ""}바꿔치기 · 1회용` : `수면 · ACC ${w.acc}`;
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
