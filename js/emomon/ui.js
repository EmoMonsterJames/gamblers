// =====================================================================
// 🐾 EmoMon UI: sprites · party panel (season sidebar) · monster detail ·
// battle arena (EmoMonster BattleEngine events + SpriteManager effects) ·
// 📖 Monster / Trait / Weapon Dex · Type Chart · inventory sections
// =====================================================================
import { h, fmt, sleep, put } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import { S } from "../game/season.js";
import { E } from "./engine.js";
import { EMO, cat, species, typesOfSpecies, monImg, emoItem, itemPic, isFirstStage, hasEvolution } from "./data.js";
import * as M from "./game.js";

export const typeChip = t => h("span.emo-type", { style: { "--tc": E.colors?.[t] || "#888" } }, String(t).toUpperCase());
export const stars = r => h("span.emo-stars", EMO.STARS(r));
const natureTxt = n => n === "Default" ? "Default" : `${n} (${E.cfg.natureText(n)})`;

// a still picture (lists) or an animated sprite (arena, detail)
export function monPic(s, size = 64, { anim = false, flip = false, unseen = false } = {}) {
    if (!s) return h("div.emo-pic.none", { style: { width: size + "px", height: size + "px" } }, "?");
    if (unseen) return h("div.emo-pic.unseen", { style: { width: size + "px", height: size + "px" } }, h("b", "?"));
    if (anim && E.sprite) { const box = h("div.emo-spr", { style: { width: size + "px", height: size + "px" } }); try { box._actor = E.sprite.forMonster(box, s, { size, flip }); } catch { box.append(h("img", { src: monImg(s), style: { width: "100%" } })); } return box; }
    return h("img.emo-pic", { src: monImg(s), alt: s.name, width: size, height: size, style: flip ? { transform: "scaleX(-1)" } : null, onerror: e => { e.target.style.visibility = "hidden"; } });
}
export const itemIcon = (it, size = 28) => {
    const src = itemPic(it);
    return src ? h("img.emo-item-ic", { src, width: size, height: size, alt: "" }) : h("span.emo-item-ic", { style: { fontSize: size * 0.8 + "px" } }, it?.emoji || "🎒");
};
function hpBar(m) {
    const max = M.maxHp(m), cur = M.hpOf(m);
    return h("div.emo-hp" + (cur <= 0 ? ".dead" : cur < max * 0.35 ? ".low" : ""), h("i", { style: { width: Math.max(0, cur / max * 100) + "%" } }), h("small", `${cur} / ${max}`));
}
const diseaseChips = m => (m.diseases || []).map(d => { const D = E.cfg.DISEASES[d]; return h("span.emo-dis", { title: D?.label || d }, `${D?.icon || "🤒"} ${D?.label || d}`); });

// ---------------------------------------------------------------- party panel (season sidebar)
export function partyPanel(pid, { onChange = () => { } } = {}) {
    const box = h("div.emo-party");
    const draw = () => {
        if (!cat()) { put(box, h("div.emo-party-head", "🐾 EmoMon"), h("p.muted.small", "EmoMon 데이터가 아직 없습니다 (관리자 → EmoMon 관리에서 동기화)")); return; }
        const e = M.emo(pid), list = e.mons, bm = M.battleMon(pid);
        put(box, 
            h("div.emo-party-head", h("b", "🐾 내 EmoMon"), h("small", `${list.length}/${EMO.MAX_MONS} · Capture ${M.findsLeft(pid)}/${EMO.CAPTURES_PER_SEASON}`)),
            ...list.map(m => {
                const s = M.sp(m), isB = bm?.uid === m.uid;
                return h("button.emo-pcard" + (isB ? ".battle" : "") + (M.fainted(m) ? ".fainted" : ""), { onclick: () => monDetail(pid, m.uid, () => { draw(); onChange(); }) },
                    monPic(s, 46),
                    h("div.emo-pc-info",
                        h("div.emo-pc-name", s?.name || "?", isB ? h("i.emo-btag", "⚔ BATTLE") : null),
                        h("div.emo-pc-sub", stars(s?.rarity), ...typesOf(m).map(typeChip)),
                        hpBar(m),
                        h("div.emo-pc-w", `⚔ ${m.weapons.length}/${EMO.MAX_WEAPONS} · 🧬 ${m.traits.length}/${EMO.MAX_TRAITS}`, M.weaponRows(m).some(w => M.ppLeft(m, w) <= 0) ? h("span.emo-dis", "🔋 PP 0") : null, ...diseaseChips(m))));
            }),
            !list.length ? h("div.emo-pcard.bot", monPic(species(EMO.BOT_ID), 46), h("div.emo-pc-info", h("b", "EmoMon Battlebot"), h("small.muted", "몬스터가 없으면 Battlebot이 대신 싸웁니다 (명중률 30%)"))) : null,
            !bm && list.length ? h("p.notice.warn.small", "⚠️ 싸울 수 있는 몬스터가 없습니다 — Battlebot이 대신 싸웁니다. HP를 회복하세요!") : null);
    };
    const typesOf = M.typesOf;
    draw();
    box.refresh = draw;
    const onEv = () => { if (!box.isConnected) return document.removeEventListener("emo:change", onEv); draw(); };
    document.addEventListener("emo:change", onEv);
    return box;
}

// ---------------------------------------------------------------- monster detail / management
export function monDetail(pid, u, onChange = () => { }) {
    const body = h("div.emo-detail");
    const m0 = M.monByUid(pid, u);
    const mm = modal(body, { title: `🐾 ${M.sp(m0)?.name || "EmoMon"}`, wide: true, cls: "emo-modal" });
    const changed = () => { onChange(); draw(); };
    const act = (r, ok) => { if (!r?.ok) { if (r?.why) toast(r.why, "warn", 3200); return false; } Sound.coin(); if (ok) toast(ok, "ok"); changed(); return true; };
    function draw() {
        const m = M.monByUid(pid, u);
        if (!m) { put(body, h("p.notice", "놓아 준 몬스터입니다."), h("div.row.end", h("button.btn.gold", { onclick: () => mm.close() }, "닫기"))); return; }
        const s = M.sp(m), st = M.statsOf(m), e = M.emo(pid), isB = M.battleMon(pid)?.uid === m.uid;
        const statRow = (k, label) => h("div.emo-stat", h("small", label), h("div.emo-sbar", h("i", { style: { width: Math.min(100, st[k] / (k === "maxHp" ? 300 : 200) * 100) + "%" } })), h("b", st[k]));
        const bagBtns = (kind, fn) => Object.entries(e.bag).filter(([id, n]) => n > 0 && emoItem(id)?.kind === kind).map(([id, n]) => { const it = emoItem(id); return h("button.btn.small.gold", { onclick: () => fn(id) }, itemIcon(it, 18), ` ${it.name} ×${n}`); });
        put(body, 
            h("div.emo-d-top",
                h("div.emo-d-pic", monPic(s, 150, { anim: true }), isB ? h("div.emo-btag.big", "⚔ BATTLE MONSTER") : h("button.btn.small.gold", { onclick: () => { M.setBattle(pid, m.uid); toast("⚔ 배틀 몬스터로 지정했습니다", "ok"); changed(); } }, "⚔ 배틀 몬스터로 지정")),
                h("div.emo-d-info",
                    h("h3", s?.name, " ", stars(s?.rarity)),
                    h("div.emo-d-types", ...M.typesOf(m).map(typeChip), m.types ? h("small.muted", " (속성 Breaker로 바뀜)") : null),
                    h("div.muted.small", `성격: ${natureTxt(m.nature)} · ${M.evolvedMon(m) ? "진화한 몬스터" : hasEvolution(m.sid) ? "진화 가능 라인" : "진화 없음"}`),
                    s?.description ? h("p.emo-desc", s.description) : null,
                    hpBar(m), h("div.emo-dis-row", ...diseaseChips(m)),
                    h("div.emo-stats", statRow("maxHp", "HP"), statRow("physAttack", "P.ATTK"), statRow("specAttack", "S.ATTK"), statRow("speed", "SPEED"), statRow("physDefense", "P.DEF"), statRow("specDefense", "S.DEF")))),
            h("h4", `🧬 특성 (${m.traits.length}/${EMO.MAX_TRAITS})`),
            h("div.emo-chips", m.traits.length ? M.traitRows(m).map(t => h("span.emo-chip", { title: E.traits.describe(t) }, `🧬 ${t.name}`, h("small", ` ${E.traits.describe(t)}`))) : h("span.muted", "특성 없음")),
            h("h4", `⚔ 무기 (${m.weapons.length}/${EMO.MAX_WEAPONS})`),
            h("div.emo-chips", m.weapons.length ? M.weaponRows(m).map(w => h("span.emo-chip.w" + (M.ppLeft(m, w) <= 0 ? ".nopp" : ""), { style: { "--tc": E.colors[w.attribute] || "#888" } }, weaponLine(w), h("b.emo-pp", ` PP ${M.ppLeft(m, w)}/${M.ppMax(w)}`),
                h("button.x", { title: "무기 삭제 (몬스터 무기 삭제권)", onclick: async () => { if (await confirmBox(`몬스터 무기 삭제권 1장으로 ${w.name}을(를) 지울까요?`)) act(M.forgetWeapon(pid, m.uid, w.id), "무기를 지웠습니다"); } }, "✕"))) : h("span.muted", "무기 없음 — 기본 공격만 합니다")),
            h("h4", "🎒 사용하기"),
            h("div.emo-actions",
                ...bagBtns("potion", id => act(M.usePotion(pid, m.uid, id), "HP 회복!")),
                ...bagBtns("cure", id => act(M.usePotion(pid, m.uid, id), "치료 완료!")),
                ...bagBtns("pp", id => act(M.usePotion(pid, m.uid, id), "🔋 PP 가득!")),
                ...Object.entries(e.wbag).filter(([, n]) => n > 0).map(([wid, n]) => { const w = cat().weapon[wid]; if (!w) return null; const fits = M.canLearn(m, w);
                    return h("button.btn.small" + (fits ? ".gold" : ".ghost"), { onclick: async () => {
                        if (!fits && !(await confirmBox(`${s.name}은(는) ${w.name}을(를) 원래 배울 수 없습니다.\n무기 Breaker 1개를 사용해 배울까요?`, "배우기", "취소"))) return;
                        act(M.learnWeapon(pid, m.uid, w.id, { breaker: !fits }), `${w.name} 습득!`);
                    } }, `⚔ ${w.name} 배우기 ×${n}${fits ? "" : " 🔒"}`); }),
                ...Object.entries(e.tbag).filter(([, n]) => n > 0).map(([tid, n]) => { const t = cat().trait[tid]; if (!t) return null; const fits = M.canLearn(m, t);
                    return h("button.btn.small" + (fits ? ".gold" : ".ghost"), { onclick: () => traitFlow(m, t, fits) }, `🧬 ${t.name} 배우기 ×${n}${fits ? "" : " 🔒"}`); }),
                M.bagN(pid, "EMO_TYPE_BREAKER") > 0 ? h("button.btn.small.gold", { onclick: () => typeFlow(m) }, `🔷 속성 Breaker (${M.bagN(pid, "EMO_TYPE_BREAKER")})`) : null,
                M.bagN(pid, "EMO_NATURE_BREAKER") > 0 ? h("button.btn.small.gold", { onclick: () => natureFlow(m) }, `🎭 Nature Breaker (${M.bagN(pid, "EMO_NATURE_BREAKER")})`) : null,
                M.bagN(pid, "EMO_MON_DEL") > 0 && M.mons(pid).length >= EMO.MAX_MONS ? h("button.btn.small.red", { onclick: async () => { if (await confirmBox(`몬스터 Release 권으로 ${s.name}을(를) 놓아 줄까요? 되돌릴 수 없습니다.`, "놓아 주기", "취소")) { if (act(M.release(pid, m.uid), "놓아 주었습니다")) mm.close(); } } }, "🚮 놓아 주기") : null),
            h("div.row.end", h("button.btn.ghost", { onclick: () => mm.close() }, "닫기")));
    }
    async function traitFlow(m, t, fits) {
        let replace = null;
        if (m.traits.length >= EMO.MAX_TRAITS) {
            replace = await new Promise(res => {
                const pm = modal(h("div.emo-pick", h("p", `특성이 꽉 찼습니다. ${t.name}(으)로 바꿀 특성을 고르세요 (특성 Breaker 1개 사용).`),
                    ...M.traitRows(m).map(x => h("button.btn.gold", { onclick: () => { pm.close(); res(x.id); } }, `🧬 ${x.name}`))), { title: "특성 바꾸기", cls: "emo-modal" });
                pm.closed.then(() => res(null));
            });
            if (replace == null) return;
        } else if (!fits && !(await confirmBox(`${t.name}은(는) 이 몬스터가 원래 못 배우는 특성입니다.\n특성 Breaker 1개를 사용할까요?`, "사용", "취소"))) return;
        act(M.learnTrait(pid, m.uid, t.id, { replace }), `${t.name} 특성 습득!`);
    }
    function typeFlow(m) {
        const cur = M.typesOf(m);
        const sel = h("select", E.types.filter(t => !cur.includes(t)).map(t => h("option", { value: t }, t)));
        const from = h("select", cur.map(t => h("option", { value: t }, t)));
        const pm = modal(h("div.emo-pick",
            h("p", `지금 속성: ${cur.join(" / ")} (최대 ${EMO.MAX_TYPES}개)`),
            h("label", "새 속성 ", sel),
            h("div.row", cur.length < EMO.MAX_TYPES ? h("button.btn.gold", { onclick: () => { if (act(M.changeTypes(pid, m.uid, { add: sel.value }), "속성 추가!")) pm.close(); } }, "➕ 추가하기") : null,
                h("span", " 또는 "), from, h("button.btn.gold", { onclick: () => { if (act(M.changeTypes(pid, m.uid, { from: from.value, to: sel.value }), "속성 변경!")) pm.close(); } }, "🔁 이 속성을 바꾸기"))), { title: "🔷 속성 Breaker", cls: "emo-modal" });
    }
    function natureFlow(m) {
        const sel = h("select", Object.keys(E.cfg.NATURES).filter(n => n !== m.nature).map(n => h("option", { value: n }, `${n} — ${E.cfg.natureText(n)}`)));
        const pm = modal(h("div.emo-pick", h("p", `지금 성격: ${natureTxt(m.nature)}`), sel, h("div.row.end", h("button.btn.gold", { onclick: () => { if (act(M.changeNature(pid, m.uid, sel.value), "성격 변경!")) pm.close(); } }, "바꾸기"))), { title: "🎭 Nature Breaker", cls: "emo-modal" });
    }
    draw();
    return mm;
}
export const weaponLine = w => [h("b", w.name), h("small", ` ${w.attribute} · 위력 ${w.power || 0} · 명중 ${w.accuracy ?? "-"}%${w.effect_type && w.effect_type !== "none" ? ` · ${E.cfg.WEAPON_EFFECTS[w.effect_type]?.label || w.effect_type}` : ""}`)];

// ---------------------------------------------------------------- ⚔ battle arena (plays BattleEngine events)
export async function arena({ title, A, B, sim, aLabel, bLabel }) {
    const done = Activity.hold();
    const stage = h("div.emo-arena");
    const fx = h("div.emo-fx");
    const side = (x, label, flip) => {
        const name = h("div.emo-a-name", x.name), bar = h("div.emo-hp.big", h("i", { style: { width: "100%" } }), h("small", "")), pic = h("div.emo-a-mon");
        const actor = (() => { try { return E.sprite.forMonster(pic, x.species, { size: 130, flip }); } catch { pic.append(monPic(x.species, 130, { flip })); return null; } })();
        return { el: h("div.emo-a-side" + (flip ? ".b" : ".a"), h("small.muted", label), name, bar, pic), bar, pic, actor, max: x.max };
    };
    const a = side(A, aLabel, false), b = side(B, bLabel, true);
    const logEl = h("div.emo-a-log");
    const btn = h("button.btn.gold", { disabled: true }, "닫기");
    let speed = 1;
    const fast = h("button.btn.small.ghost", { onclick: () => { speed = speed === 1 ? 3 : 1; fast.textContent = speed > 1 ? "⏩ 빠르게" : "▶ 보통"; } }, "▶ 보통");
    stage.append(a.el, h("div.emo-vs", "VS"), b.el, fx);
    const m = modal(h("div.emo-battle", stage, h("div.row.center", fast), logEl, h("div.row.center", btn)), { title, wide: true, closable: false, cls: "emo-modal" });
    btn.onclick = () => m.close();
    const setHp = (s, v) => { const pct = Math.max(0, Math.min(100, v / s.max * 100)); s.bar.querySelector("i").style.width = pct + "%"; s.bar.querySelector("small").textContent = `${Math.max(0, Math.round(v))} / ${s.max}`; s.bar.classList.toggle("low", pct < 35); };
    setHp(a, A.hp); setHp(b, B.hp);
    const center = el => { const r = el.getBoundingClientRect(), L = fx.getBoundingClientRect(); return { x: r.left - L.left + r.width / 2, y: r.top - L.top + r.height / 2 }; };
    const W = ms => sleep(ms / speed);
    Sound.whoosh();
    await W(500);
    for (const ev of sim.events.slice(0, 700)) {
        if (ev.hpA !== undefined) { setHp(a, ev.hpA); setHp(b, ev.hpB); }
        const line = evText(ev);
        if (line) { logEl.append(h("div", line)); logEl.scrollTop = logEl.scrollHeight; }
        if (ev.t === "attack") {
            const att = ev.side === "A" ? a : b, def = ev.side === "A" ? b : a;
            try { att.actor?.play?.("action"); } catch { }
            const w = ev.weapon || { attribute: "Pure", power: 10 };
            try { await E.sprite.themedFx(fx, w, center(att.pic), center(ev.selfHit ? att.pic : def.pic), speed); } catch { await W(300); }
            if (ev.hit !== false && ev.damage > 0) { try { (ev.selfHit ? att : def).actor?.play?.("hurt"); } catch { } ev.crit ? Sound.boom() : Sound.hit(); }
            else Sound.miss();
            await W(380);
        } else if (ev.t === "faint") { const s = ev.side === "A" ? a : ev.side === "B" ? b : null; try { s?.actor?.play?.("faint", { hold: true }); } catch { } s?.pic.classList.add("fainted"); Sound.lose(); await W(700); }
        else if (line) await W(240);
    }
    const won = sim.winner === "A";
    logEl.after(h("div.emo-a-result" + (won ? ".win" : sim.winner ? ".lose" : ""), sim.winner ? (won ? `🏆 ${aLabel} 승리!` : `💥 ${bLabel} 승리!`) : "🤝 무승부"));
    won ? Sound.fanfare() : Sound.lose();
    btn.disabled = false;
    await m.closed;
    done();
    return won;
}
const STATUS_NAME = k => E.cfg.DISEASES[k]?.label || E.cfg.WEAPON_EFFECTS[k]?.label || k;
export function evText(ev) {
    switch (ev.t) {
        case "attack": return `${ev.side === "A" ? "🟦" : "🟥"} ${ev.name} ▸ ${ev.weapon?.name || "공격"} → ${ev.selfHit ? "자기 자신" : ev.target}: ${ev.hit === false ? "빗나감" : `-${ev.damage}${ev.crit ? " 크리티컬!" : ""}`}${ev.mult >= 2 ? " (효과 굉장!)" : ev.mult === 0 ? " (효과 없음)" : ev.mult < 1 && ev.mult > 0 ? " (효과 별로)" : ""}`;
        case "faint": return `💫 ${ev.name} 기절!`;
        case "status": return `🌀 ${ev.name}: ${STATUS_NAME(ev.kind)}`;
        case "tick": return ev.amount ? `${ev.amount < 0 ? "🩸" : "💚"} ${ev.name} ${STATUS_NAME(ev.kind)} ${ev.amount > 0 ? "+" : ""}${ev.amount}` : null;
        case "skip": return `😵 ${ev.name}은(는) 움직이지 못했다`;
        case "revive": return `✨ ${ev.name} 부활! (HP ${ev.hp})`;
        case "npc_item": return `🧪 ${ev.name} ${ev.item} 사용 (+${ev.amount})`;
        case "trait": return `🧬 ${ev.name}: ${ev.trait || ev.text || "특성 발동"}`;
        case "end": return `🏁 배틀 종료 (${ev.turns}턴${ev.reason === "timeout" ? " · 시간 초과 — 남은 HP 비율로 판정" : ""})`;
        case "start": case "turn": case "order": return null;
        default: return ev.text || ev.message || null;
    }
}
// combatant pictures for the arena
export const arenaSide = (c, mon) => ({ name: c.name, species: species(mon?.sid ?? EMO.BOT_ID), hp: c.hp, max: c.stats.maxHp });

// ---------------------------------------------------------------- 📖 dexes
export function dexView(pid) {
    const wrap = h("div.emo-dex");
    let tab = "mon";
    const tabs = [["mon", "📖 Monster Dex"], ["trait", "🧬 Trait Dex"], ["weapon", "⚔ Weapon Dex"], ["type", "🔺 Type Chart"]];
    const draw = () => {
        if (!cat()) { put(wrap, h("p.notice", "EmoMon 데이터가 아직 없습니다.")); return; }
        put(wrap, h("div.bk-tabs", tabs.map(([k, l]) => h("button.bk-tab" + (k === tab ? ".on" : ""), { onclick: () => { tab = k; draw(); } }, l))),
            tab === "mon" ? monsterDex(pid) : tab === "trait" ? traitDex() : tab === "weapon" ? weaponDex() : typeChart());
    };
    draw();
    return wrap;
}
function monsterDex(pid) {
    const dex = M.dexOf(pid);
    for (const m of M.monsOf(pid)) if (!dex[m.sid]) M.seen(pid, m.sid, "own");
    const q = h("input", { placeholder: "이름 / 속성 검색 (발견한 몬스터만)" });
    const grid = h("div.emo-dex-grid");
    const found = cat().mons.filter(m => dex[m.id]).length;
    const fill = () => {
        const f = q.value.trim().toLowerCase();
        put(grid, ...cat().mons.filter(m => m.id !== EMO.BOT_ID || dex[m.id]).filter(m => !f || (dex[m.id] && (m.name.toLowerCase().includes(f) || typesOfSpecies(m).some(t => t.toLowerCase().includes(f))))).map(m => {
            const d = dex[m.id];
            return h("button.emo-dex-card" + (d ? ".found" : ".unseen"), { onclick: () => d ? speciesInfo(m, d, pid) : null },
                h("small.emo-no", `#${m.id}`), monPic(m, 64, { unseen: !d }),
                h("b", d ? m.name : "???"), h("small", d ? "FOUND" : "UNSEEN"), d ? h("div", ...typesOfSpecies(m).map(typeChip)) : null);
        }));
    };
    q.oninput = fill; fill();
    return h("div", h("div.emo-dex-head", h("b", `발견 ${found} / ${cat().mons.length}`), q), grid);
}
function speciesInfo(s, d, pid) {
    const dex = M.dexOf(pid);
    const st = E.stats.compute(s, EMO.LEVEL, [], "Default");
    const tr = [s.trait_id, s.trait2_id].map(id => cat().trait[String(id)]).filter(Boolean);
    // evolution chain: known forms shown, unknown ones as "??"
    const chain = [];
    let first = s; for (let k = 0; k < 6; k++) { const p = cat().evoTo(first.id)[0]; if (!p) break; first = species(p.monster_id) || first; if (!p) break; }
    const walk = (x, depth = 0) => { chain.push(x); const nx = cat().evoFrom(x.id).map(e => species(e.target_monster_id)).filter(Boolean); if (nx.length && depth < 5) walk(nx[0], depth + 1); };
    walk(first);
    modal(h("div.emo-sinfo",
        h("div.emo-d-top", monPic(s, 130, { anim: true }), h("div",
            h("h3", `#${s.id} ${s.name} `, stars(s.rarity)), h("div", ...typesOfSpecies(s).map(typeChip)),
            h("p.muted", `${M.DEX_HOW[d.how] || d.how}${d.season ? ` · 시즌 ${d.season}` : ""}`),
            s.description ? h("p", s.description) : null,
            h("div.emo-kv", `HP ${st.maxHp} · P.ATTK ${st.physAttack} · S.ATTK ${st.specAttack} · SPEED ${st.speed} · P.DEF ${st.physDefense} · S.DEF ${st.specDefense}`),
            tr.length ? h("div.emo-kv", "기본 특성: ", tr.map(t => t.name).join(", ")) : null)),
        chain.length > 1 ? h("div.emo-chain", ...chain.flatMap((x, i) => [i ? h("span.emo-arrow", "→") : null,
            h("div.emo-chain-node", dex[x.id] || x.id === s.id ? [monPic(x, 56), h("small", x.name)] : [h("div.emo-q", "??")])])) : h("p.muted", "진화 없음")),
        { title: "📖 Monster Dex", wide: true, cls: "emo-modal" });
}
function traitDex() {
    return h("div.emo-list", cat().traits.slice().sort((a, b) => (a.rarity || 1) - (b.rarity || 1) || a.name.localeCompare(b.name)).map(t => h("div.emo-row",
        h("b", `🧬 ${t.name}`), stars(t.rarity), h("small", E.traits.describe(t)), h("small.muted", E.traits.allowedText(t)))));
}
function weaponDex() {
    const q = h("input", { placeholder: "이름 / 속성 검색" });
    const list = h("div.emo-list");
    const fill = () => { const f = q.value.trim().toLowerCase(); put(list, ...cat().weapons.filter(w => !f || w.name.toLowerCase().includes(f) || String(w.attribute).toLowerCase().includes(f)).slice(0, 400).map(w => h("div.emo-row", typeChip(w.attribute), ...weaponLine(w), stars(w.rarity), h("small.muted", E.traits.allowedText(w))))); };
    q.oninput = fill; fill();
    return h("div", q, list);
}
function typeChart() {
    const T = E.types;
    const cell = (a, d) => { const v = E.chart[a]?.[d] ?? 1; return h("td" + (v >= 2 ? ".x2" : v > 1 ? ".x15" : v === 0 ? ".x0" : v < 1 ? ".xh" : ""), v === 1 ? "" : v === 0.5 ? "½" : String(v)); };
    return h("div.emo-tc-wrap", h("p.muted.small", "왼쪽 세로줄 = 공격 속성 · 위쪽 가로줄 = 방어 속성 · 2 = 효과 굉장 · ½ = 효과 별로 · 0 = 효과 없음 (여러 속성이면 곱해집니다)"),
        h("table.emo-tc", h("tr", h("th", "공격 \\ 방어"), ...T.map(t => h("th", h("span.emo-vt", { style: { "--tc": E.colors[t] } }, t.slice(0, 3))))),
            ...T.map(a => h("tr", h("th", typeChip(a)), ...T.map(d => cell(a, d))))));
}

// ---------------------------------------------------------------- inventory sections
export function emoInventory(pid, onChange = () => { }) {
    const wrap = h("div.emo-inv");
    const draw = () => {
        if (!S().ps[pid]) return;
        const e = M.emo(pid);
        const items = Object.entries(e.bag).filter(([, n]) => n > 0).map(([id, n]) => ({ it: emoItem(id), n })).filter(x => x.it);
        const traits = Object.entries(e.tbag).filter(([, n]) => n > 0).map(([id, n]) => ({ t: cat()?.trait[id], n })).filter(x => x.t);
        const weapons = Object.entries(e.wbag).filter(([, n]) => n > 0).map(([id, n]) => ({ w: cat()?.weapon[id], n })).filter(x => x.w);
        put(wrap, 
            h("h4", "🐾 몬스터 아이템 (특성 포함)"),
            h("div.emo-chips", items.length || traits.length ? [
                ...items.map(({ it, n }) => h("span.emo-chip", { title: it.note || it.src?.description || "" }, itemIcon(it, 20), ` ${it.name} ×${n}`)),
                ...traits.map(({ t, n }) => h("span.emo-chip", { title: E.traits.describe(t) }, `🧬 ${t.name} ×${n}`))] : h("span.muted", "없음")),
            h("h4", "⚔ 몬스터 무기"),
            h("div.emo-chips", weapons.length ? weapons.map(({ w, n }) => h("span.emo-chip.w", { style: { "--tc": E.colors?.[w.attribute] || "#888" } }, ...weaponLine(w), ` ×${n}`)) : h("span.muted", "없음")),
            h("small.muted", "무기 · 특성 · 약은 오른쪽 🐾 내 EmoMon에서 몬스터를 눌러 사용합니다."));
    };
    draw();
    return wrap;
}
