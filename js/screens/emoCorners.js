// =====================================================================
// 🐾 EmoMon corners inside a casino map:
//   🔍 EmoMon Capture (every map unless turned off) · 🏥 Monster Hospital · 🧪 Monster Lab
//   📖 EmoMon Dex (every map)
// =====================================================================
import { h, fmt, sleep, put } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, confetti, Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import { emoReady } from "../emomon/engine.js";
import { EMO, cat, loadCatalog, species, typesOfSpecies, emoItem, EMO_ITEMS, evoItems, materials, weaponPrice, traitPrice, captureConfig, captureSkin, weaponOn, traitOn } from "../emomon/data.js";
import * as M from "../emomon/game.js";
import { monPic, typeChip, stars, itemIcon, partyPanel, monDetail, arena, arenaSide, dexView, weaponLine } from "../emomon/ui.js";
import { priceLabel, canPay, pay } from "./shop.js";
import { displayName } from "../ui/profile.js";

// every EmoMon view waits for the EmoMonster scripts + the synced catalog
export async function emoBoot() {
    await emoReady();
    return await loadCatalog();
}
function lazy(build) {
    const box = h("div.emo-wrap", h("p.muted", "🐾 EmoMon 불러오는 중…"));
    emoBoot().then(c => { put(box, c ? build() : h("p.notice.warn", "EmoMon 데이터가 아직 없습니다. 관리자 → 🐾 EmoMon 관리에서 'EmoMonster에서 가져오기'를 먼저 해 주세요.")); })
        .catch(e => { console.error(e); put(box, h("p.notice.warn", "EmoMon을 불러오지 못했습니다: " + e.message)); });
    return box;
}
const pname = pid => displayName(Store.player(pid));
const buyLine = (ps, it, price, onBuy) => h("button.emo-buy", { disabled: !canPay(ps, price), onclick: onBuy },
    itemIcon(it, 34), h("div", h("b", it.name), it.note ? h("small", it.note) : null), h("span.emo-price", priceLabel(price)));

// ---------------------------------------------------------------- shared: a fight shown in the arena
export async function emoFight(pid, foe, { title, foeLabel, foeMon }) {
    const r = M.fight(pid, foe);
    const A = arenaSide(r.a.c, r.a.mon), B = arenaSide(r.b.c, foeMon || r.b.mon);
    await arena({ title, A, B, sim: r.sim, aLabel: pname(pid) + (r.a.bot ? " (Battlebot)" : ""), bLabel: foeLabel });
    Store.saveSeason(true);
    return r;
}

// ================================================================ 🔍 CAPTURE
export function captureView(pid, loc, { turn, onChange = () => { } } = {}) {
    return lazy(() => {
        const ps = G.S().ps[pid];
        const cfg = captureConfig(loc);
        if (!cfg) return h("p.notice", "이 맵에는 Capture 코너가 없습니다.");
        const skin = captureSkin(loc);
        const wrap = h("div.emo-cap.skin-" + skin);
        turn.emoDoor ||= {};
        const pool = cfg.mons.map(species).filter(Boolean);
        const dex = M.dexOf(pid);
        const doorText = { fee: `🎟️ 입장료 ${fmt(EMO.CAPTURE_FEE)}G`, random: "🚪 랜덤 문 (60% 입장)", free: "🆓 무료 입장" }[cfg.door];
        const head = () => h("div.emo-cap-head",
            h("div", h("h3", `🔍 EmoMon Capture · ${loc.name}`), h("p.muted.small", cfg.themeText), h("div.emo-types", ...cfg.types.slice(0, 8).map(typeChip), cfg.types.length > 8 ? h("small", ` +${cfg.types.length - 8}`) : null)),
            h("div.emo-cap-meta", h("span.emo-door." + cfg.door, doorText), h("small", `몬스터 출현 ${cfg.chance}% · ${pool.length}종`), h("b", `남은 Capture ${M.findsLeft(pid)} / ${EMO.CAPTURES_PER_SEASON}`)));
        const poolRow = () => h("div.emo-pool", ...pool.sort((a, b) => (a.rarity || 1) - (b.rarity || 1)).map(s => h("div.emo-pool-m" + (dex[s.id] ? "" : ".unseen"), { title: dex[s.id] ? s.name : "???" }, monPic(s, 40, { unseen: !dex[s.id] }), h("small", EMO.STARS(s.rarity)))));
        const stage = h("div.emo-cap-stage");
        const draw = () => {
            const st = turn.emoDoor[loc.id];
            let gate = null;
            if (!st) gate = cfg.door === "free" ? (turn.emoDoor[loc.id] = "in", null)
                : h("div.emo-gate", h("div.emo-gate-door", "🚪"),
                    cfg.door === "fee" ? [h("p", `희귀한 몬스터가 많은 곳! 입장료 ${fmt(EMO.CAPTURE_FEE)}G (이번 턴 동안 유효)`),
                        h("button.btn.gold.big", { disabled: ps.money < EMO.CAPTURE_FEE, onclick: () => { ps.money -= EMO.CAPTURE_FEE; turn.emoDoor[loc.id] = "in"; Sound.coin(); Store.saveSeason(); onChange(); draw(); } }, `🎟️ ${fmt(EMO.CAPTURE_FEE)}G 내고 입장`)]
                        : [h("p", "문지기가 기분에 따라 들여보내 줍니다 (60%). 거절되면 이번 턴에는 못 들어갑니다."),
                        h("button.btn.gold.big", { onclick: async e => { e.target.disabled = true; Sound.tease(); await sleep(900); const ok = Math.random() < EMO.CAPTURE_RANDOM_OK; turn.emoDoor[loc.id] = ok ? "in" : "no"; ok ? Sound.win() : Sound.lose(); toast(ok ? "🚪 문이 열렸습니다!" : "🚫 입장 거절! 이번 턴에는 들어갈 수 없습니다", ok ? "ok" : "warn"); Store.saveSeason(); draw(); } }, "🚪 문 두드리기")]);
            else if (st === "no") gate = h("div.emo-gate.no", h("div.emo-gate-door", "🚫"), h("p", "입장이 거절되었습니다. 다음 턴에 다시 와 보세요."));
            if (gate) { put(wrap, head(), poolRow(), gate); return; }
            const left = M.findsLeft(pid);
            put(wrap, head(), poolRow(),
                h("div.emo-cap-find",
                    h("button.btn.gold.huge.emo-find-btn", { disabled: left <= 0 || turn.remaining <= 0, onclick: doFind }, left > 0 ? "🔍 Find!" : "이번 시즌 Capture를 모두 썼습니다"),
                    h("small.muted", "몬스터 · EmoMon Battler · 골드 · 아이템이 나올 수 있습니다")),
                stage, h("p.muted.small", "🛒 볼 · 약 · 무기 · 특성은 🛒 Monster Shop 코너가 있는 맵에서 살 수 있습니다."));
        };
        async function doFind(e) {
            const done = Activity.hold();
            e.target.disabled = true;
            put(stage, h("div.emo-search", h("span", "🌿"), h("span", "🔍"), h("span", "🌿")));
            Sound.whoosh(); await sleep(1100);
            const r = M.find(pid, loc.id);
            done();
            if (!r) { draw(); return; }
            onChange();
            if (r.kind === "monster") return encounter(r.mon);
            if (r.kind === "battler") return battler(r.mon);
            draw();
            if (r.kind === "gold") { Sound.coin(); put(stage, h("div.emo-found", h("div.big", "💰"), h("b", `${fmt(r.gold)} G 발견!`))); }
            else if (r.kind === "item") { Sound.bonus(); put(stage, h("div.emo-found", itemIcon(r.item, 64), h("b", `${r.item.name} 획득!`))); }
            else { Sound.miss(); put(stage, h("div.emo-found", h("div.big", "🍃"), h("b", "아무것도 없었다…"))); }
        }
        // wild monster: throw balls / run
        function encounter(wild) {
            draw();
            const s = species(wild.sid);
            const msg = h("p.emo-enc-msg", `야생의 ${s.name}이(가) 나타났다!`);
            const box = h("div.emo-enc", h("div.emo-enc-mon", monPic(s, 150, { anim: true })),
                h("div.emo-enc-info", h("h3", s.name, " ", stars(s.rarity)), h("div", ...typesOfSpecies(s).map(typeChip)), h("small.muted", `성격: ${wild.nature}`), msg, h("div.emo-balls"), h("div.row")));
            put(stage, box);
            Sound.boom();
            const balls = () => {
                const own = EMO_ITEMS.filter(b => b.kind === "ball" && M.bagN(pid, b.id) > 0);
                const full = M.mons(pid).length >= EMO.MAX_MONS;
                put(box.querySelector(".emo-balls"), ...(own.length ? own.map(b => h("button.emo-ball", { onclick: () => throwIt(b) }, itemIcon(b, 30), h("b", b.name), h("small", `×${M.bagN(pid, b.id)} · ${b.crazy ? "50%: " + Math.min(99, M.BASE_CATCH[s.rarity || 1] + 75) + "% / " + M.BASE_CATCH[s.rarity || 1] + "%" : M.catchChance(wild.sid, b.id) + "%"}`))) : [h("p.notice.warn.small", "볼이 없습니다! 아래 EmoMon 상점에서 볼을 사세요.")]),
                    full ? h("p.notice.warn.small", `몬스터가 이미 ${EMO.MAX_MONS}마리입니다 — 잡으면 몬스터 Release 권으로 1마리를 놓아 주어야 데려올 수 있습니다.`) : null);
                put(box.querySelector(".row"), h("button.btn.ghost", { onclick: () => { toast("도망쳤습니다", "info"); draw(); } }, "🏃 도망가기"));
            };
            async function throwIt(b) {
                const done = Activity.hold();
                box.querySelectorAll("button").forEach(x => x.disabled = true);
                const r = M.throwBall(pid, wild, b.id);
                if (!r.ok) { done(); toast(r.why, "warn"); balls(); return; }
                msg.textContent = `${b.name}을(를) 던졌다! (${r.chance}%)`;
                const fly = h("div.emo-ball-fly", itemIcon(b, 40));
                box.append(fly); Sound.whoosh(); await sleep(700);
                box.querySelector(".emo-enc-mon").classList.add("shaking"); Sound.tick(); await sleep(450); Sound.tick(); await sleep(450); Sound.tick(); await sleep(450);
                fly.remove(); box.querySelector(".emo-enc-mon").classList.remove("shaking");
                done();
                if (r.caught) {
                    Sound.fanfare(); confetti(60);
                    msg.textContent = `🎉 ${s.name} 포획 성공!`;
                    await keep(wild);
                    draw(); onChange();
                    return;
                }
                Sound.lose();
                if (Math.random() < 0.3) { msg.textContent = `💨 ${s.name}이(가) 도망쳤다…`; put(box.querySelector(".emo-balls"), ); put(box.querySelector(".row"), h("button.btn.gold", { onclick: draw }, "확인")); return; }
                msg.textContent = `볼에서 빠져나왔다! 다시 던져 보세요.`;
                balls();
            }
            balls();
        }
        // a caught monster joins the party (full party → release one with a delete ticket, or let it go)
        async function keep(mon) {
            while (M.mons(pid).length >= EMO.MAX_MONS) {
                const choice = await new Promise(res => {
                    const pm = modal(h("div.emo-pick",
                        h("p", `몬스터는 최대 ${EMO.MAX_MONS}마리입니다. 몬스터 Release 권(보유 ${M.bagN(pid, "EMO_MON_DEL")}장)으로 1마리를 놓아 주거나, 새로 잡은 몬스터를 놓아 주세요.`),
                        ...M.mons(pid).map(m => h("button.emo-pick-mon", { disabled: M.bagN(pid, "EMO_MON_DEL") <= 0, onclick: () => { pm.close(); res(m.uid); } }, monPic(M.sp(m), 40), ` ${M.sp(m).name} 놓아 주기`)),
                        M.bagN(pid, "EMO_MON_DEL") <= 0 ? h("p.notice.warn.small", "몬스터 Release 권이 없습니다 (🛒 Monster Shop 100,000G)") : null,
                        h("button.btn.ghost", { onclick: () => { pm.close(); res(null); } }, `새로 잡은 ${species(mon.sid).name}을(를) 놓아 주기`)), { title: "🐾 자리가 없습니다", closable: false, cls: "emo-modal" });
                });
                if (!choice) { toast("새 몬스터를 놓아 주었습니다", "info"); return false; }
                M.release(pid, choice);
            }
            M.addMon(pid, mon);
            toast(`🐾 ${species(mon.sid).name}이(가) 동료가 되었습니다!`, "ok", 3000);
            return true;
        }
        // EmoMon Battler fight
        async function battler(foe) {
            draw();
            const s = species(foe.sid), me = M.fighterOf(pid);
            const go = await new Promise(res => {
                const pm = modal(h("div", h("div.emo-vs-pre",
                    h("div.center", me ? monPic(M.sp(me), 100, { anim: true }) : monPic(species(EMO.BOT_ID), 100), h("b", me ? M.sp(me).name : "EmoMon Battlebot"), h("small.muted", me ? "⚔ 내 배틀 몬스터" : "몬스터가 없어 Battlebot 출전 (명중 30%)")),
                    h("div.emo-vs", "VS"),
                    h("div.center", monPic(s, 100, { anim: true, flip: true }), h("b", s.name, " ", stars(s.rarity)), h("small.muted", `🧬 ${M.traitRows(foe)[0]?.name || "—"} · ⚔ ${M.weaponRows(foe).map(w => w.name).join(", ") || "기본 공격"}`))),
                    h("p.center.small", "이기면 1,000~10,000G 또는 1~10P · 지면 몬스터의 HP · 질병 · 상태이상이 그대로 남습니다"),
                    h("div.row.center", h("button.btn.gold.big", { onclick: () => { pm.close(); res(true); } }, "⚔ 배틀!"))), { title: `⚔ ${foe.trainer}이(가) 승부를 걸어왔다!`, closable: false, cls: "emo-modal" });
            });
            if (!go) return;
            const r = await emoFight(pid, { mon: foe }, { title: `⚔ ${foe.trainer}`, foeLabel: foe.trainer });
            if (r.won) {
                const rw = M.battlerReward(pid);
                Store.saveSeason(true);
                Sound.cash(); confetti(50);
                toast(`🏆 승리! ${rw.gold ? `+${fmt(rw.gold)} G` : `+${rw.pts} P`}`, "ok", 3500);
                G.log(`⚔ ${pname(pid)} EmoMon Battler 승리 (${rw.gold ? fmt(rw.gold) + "G" : rw.pts + "P"})`);
            } else {
                toast(r.a.bot ? "💥 패배…" : `💥 패배… ${M.sp(r.a.mon)?.name}의 HP ${M.hpOf(r.a.mon)} — 병원이나 약으로 회복하세요`, "warn", 4000);
                G.log(`⚔ ${pname(pid)} EmoMon Battler에게 패배`);
            }
            onChange(); draw();
        }
        draw();
        return wrap;
    });
}
function seededPick(key) {
    let x = 0; for (const c of key) x = (x * 31 + c.charCodeAt(0)) >>> 0;
    const r = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
    return (list, n) => { const a = [...list]; const out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; };
}

// ================================================================ 🏥 HOSPITAL
export function hospitalView(pid, { onChange = () => { } } = {}) {
    return lazy(() => {
        const ps = G.S().ps[pid];
        const wrap = h("div.emo-hosp");
        const draw = () => {
            const list = M.mons(pid), used = M.hospitalUsed(pid);
            const hurt = list.filter(m => M.hpOf(m) < M.maxHp(m) || m.diseases?.length);
            put(wrap, 
                h("div.emo-hosp-head", h("div.big", "🏥"), h("div", h("h3", "Monster Hospital"), h("p.muted.small", `라운드당 1번 · ${fmt(EMO.HOSPITAL_FEE)}G · 모든 몬스터의 HP를 가득 채우고 질병 · 상태이상을 모두 치료합니다 (무기 PP는 PP 회복약으로만 회복)`))),
                h("div.emo-hosp-list", list.length ? list.map(m => h("div.emo-hosp-m", monPic(M.sp(m), 56), h("b", M.sp(m).name), h("small", `❤ ${M.hpOf(m)} / ${M.maxHp(m)}`), ...(m.diseases || []).map(d => h("small.emo-dis", d)))) : h("p.muted", "몬스터가 없습니다")),
                h("div.row.center", h("button.btn.gold.big", { disabled: used || !list.length || ps.money < EMO.HOSPITAL_FEE, onclick: async () => {
                    if (!hurt.length && !(await confirmBox("다친 몬스터가 없습니다. 그래도 치료할까요?"))) return;
                    const r = M.hospital(pid);
                    if (!r.ok) return toast(r.why, "warn");
                    Sound.bonus(); wrap.classList.add("healing"); setTimeout(() => wrap.classList.remove("healing"), 1500);
                    toast("💚 모든 몬스터가 건강해졌습니다!", "ok"); onChange(); draw();
                } }, used ? "이번 라운드는 이미 이용했습니다" : `💚 전원 치료 (${fmt(EMO.HOSPITAL_FEE)}G)`)));
        };
        draw();
        return wrap;
    });
}

// ================================================================ 🧪 LAB
export function labView(pid, { onChange = () => { } } = {}) {
    return lazy(() => {
        const ps = G.S().ps[pid];
        const wrap = h("div.emo-lab");
        let tab = "evo";
        const draw = () => {
            const tabs = [["evo", "✨ 진화"], ["mix", "⚗️ 조합"], ["shop", "🛒 LAB 상점"]];
            put(wrap, h("div.emo-lab-head", h("div.big", "🧪"), h("div", h("h3", "Monster Lab"), h("p.muted.small", "진화 아이템으로 몬스터를 진화시키고, 재료를 섞어 새 아이템을 만듭니다"))),
                h("div.bk-tabs", tabs.map(([k, l]) => h("button.bk-tab" + (k === tab ? ".on" : ""), { onclick: () => { tab = k; draw(); } }, l))),
                tab === "evo" ? evoTab() : tab === "mix" ? mixTab() : shopTab());
        };
        const need = id => { const it = emoItem(id); return h("span.emo-need" + (M.bagN(pid, id) > 0 ? ".ok" : ""), itemIcon(it, 18), ` ${it?.name || id} (${M.bagN(pid, id)})`); };
        function evoTab() {
            const list = M.mons(pid);
            if (!list.length) return h("p.muted", "몬스터가 없습니다");
            return h("div.emo-evo-list", ...list.map(m => {
                const opts = M.evoOptions(pid, m), dex = M.dexOf(pid);
                return h("div.emo-evo-m", h("div.emo-evo-from", monPic(M.sp(m), 64), h("b", M.sp(m).name)),
                    opts.length ? h("div.emo-evo-opts", ...opts.map(o => h("div.emo-evo-opt",
                        h("span.emo-arrow", "→"), dex[o.to.id] ? monPic(o.to, 54) : h("div.emo-q", "??"), h("b", dex[o.to.id] ? o.to.name : "??"),
                        h("div.emo-needs", ...o.need.map(need), o.gold ? h("span.emo-need" + (ps.money >= o.gold ? ".ok" : ""), `💰 ${fmt(o.gold)}G`) : null,
                            o.e.required_weapon_id ? h("span.emo-need" + (o.wNeed ? ".ok" : ""), `⚔ ${cat().weapon[o.e.required_weapon_id]?.name || "무기"} 필요`) : null,
                            h("small", `성공 ${o.chance}%`)),
                        h("button.btn.gold", { disabled: !o.ok, onclick: () => doEvolve(m, o) }, "✨ 진화!")))) : h("p.muted.small", M.evolvedMon(m) && !opts.length ? "최종 진화형입니다" : "진화하지 않는 몬스터입니다"));
            }));
        }
        async function doEvolve(m, o) {
            if (!(await confirmBox(`${M.sp(m).name}을(를) 진화시킬까요?\n재료${o.gold ? `와 ${fmt(o.gold)}G` : ""}가 사용됩니다 (성공 ${o.chance}%).`, "진화", "취소"))) return;
            const done = Activity.hold();
            const fx = h("div.emo-evo-fx", monPic(M.sp(m), 140, { anim: true }));
            const mm = modal(h("div.center", fx, h("p", "✨ 진화 중…")), { title: "🧪 Monster Lab", closable: false, cls: "emo-modal" });
            Sound.tease(); fx.classList.add("glow"); await sleep(1800);
            const r = M.evolve(pid, m.uid, o.e.id);
            mm.close(); done();
            if (!r.ok) return toast(r.why, "warn");
            if (r.failed) { Sound.lose(); toast("💥 진화 실패… 재료는 사라졌습니다", "warn", 3500); }
            else { Sound.fanfare(); confetti(80); modal(h("div.center", monPic(r.to, 160, { anim: true }), h("h3", `${r.from.name} → ${r.to.name}!`), h("div", ...typesOfSpecies(r.to).map(typeChip))), { title: "✨ 진화 성공!", cls: "emo-modal" }); }
            onChange(); draw();
        }
        function mixTab() {
            const recipes = (cat().recipes || []).filter(r => emoItem(r.result_item_id)); // quest-only results are not in Gamblers
            if (!recipes.length) return h("p.muted", "조합법이 없습니다");
            return h("div.emo-list", ...recipes.map(r => {
                const out = emoItem(r.result_item_id);
                return h("div.emo-row.mix", itemIcon(out, 34), h("div", h("b", r.name || out?.name), h("div.emo-needs", ...(r.ingredients || []).map(x => h("span.emo-need" + (M.bagN(pid, x.id) >= (x.qty || 1) ? ".ok" : ""), itemIcon(emoItem(x.id), 18), ` ${emoItem(x.id)?.name || x.id} ${M.bagN(pid, x.id)}/${x.qty || 1}`)),
                    r.cost ? h("span.emo-need" + (ps.money >= r.cost ? ".ok" : ""), `💰 ${fmt(r.cost)}G`) : null)),
                    h("button.btn.gold", { disabled: !M.canMix(pid, r), onclick: () => { const x = M.mix(pid, r); if (!x.ok) return toast(x.why, "warn"); Sound.bonus(); toast(`⚗️ ${out?.name || r.name} 완성!`, "ok"); onChange(); draw(); } }, "⚗️ 조합"));
            }));
        }
        function shopTab() {
            const goods = [...EMO_ITEMS.filter(i => i.kind === "breaker").map(i => emoItem(i.id)), ...evoItems(), ...materials()].filter(Boolean);
            return h("div.emo-buy-grid", ...goods.map(it => { const price = { gold: it.gold || 0, pts: it.pts || 0 };
                return buyLine(ps, it, price, () => { if (!canPay(ps, price)) return toast("돈이 부족합니다", "warn"); pay(ps, price); M.giveItem(pid, it.id); Sound.coin(); toast(`${it.name} 구매!`, "ok"); Store.saveSeason(); onChange(); draw(); }); }));
        }
        draw();
        return wrap;
    });
}

// ================================================================ 📖 DEX tab + sidebar party
export const emoDexTab = pid => lazy(() => dexView(pid));
export function emoPartySide(pid, onChange) {
    return lazy(() => partyPanel(pid, { onChange }));
}
export { monDetail };

// ================================================================ ⚔ EmoMon battle mission (two players' battle monsters)
export function emoBattleStage(a, b, onDone, { title, sub }) {
    return lazy(() => {
        const card = pid => {
            const m = M.fighterOf(pid), s = m ? M.sp(m) : species(EMO.BOT_ID);
            return h("div.emo-bm-side", h("b.emo-bm-name", pname(pid)), monPic(s, 130, { anim: true, flip: pid === b }),
                h("div", h("b", m ? s.name : "EmoMon Battlebot"), " ", m ? stars(s.rarity) : null),
                m ? h("div", ...M.typesOf(m).map(typeChip)) : h("small.muted", "몬스터가 없어 Battlebot 출전 (명중 30%)"),
                m ? h("small", `❤ ${M.hpOf(m)} / ${M.maxHp(m)} · ⚔ ${m.weapons.length} · 🧬 ${m.traits.length}`) : null);
        };
        let busy = false;
        const btn = h("button.btn.gold.huge", { onclick: async () => {
            if (busy) return; busy = true; btn.disabled = true;
            const r = await emoFight(a, { pid: b }, { title, foeLabel: pname(b) });
            // everyone in the season saw both monsters
            for (const pid of G.S().roster) { if (r.a.mon) M.seen(pid, r.a.mon.sid, "pvp"); if (r.b.mon) M.seen(pid, r.b.mon.sid, "pvp"); }
            let winner = r.sim.winner === "A" ? a : r.sim.winner === "B" ? b : null;
            if (!winner) { winner = Math.random() < 0.5 ? a : b; toast("🤝 무승부 — 동전 던지기로 승자를 정합니다", "info", 3000); }
            onDone(winner, winner === a ? b : a);
        } }, "⚔ EmoMon 배틀 시작!");
        return h("div.emo-bm", h("h2", title), h("p.muted", sub), h("div.emo-bm-row", card(a), h("div.emo-vs", "VS"), card(b)), h("div.row.center", btn));
    });
}

// ================================================================ 🛒 MONSTER SHOP (its own corner on some maps)
export function monsterShopView(pid, loc, { onChange = () => { } } = {}) {
    return lazy(() => {
        const ps = G.S().ps[pid];
        const wrap = h("div.emo-mshop");
        const draw = () => {
            const rnd = seededPick(`${loc.id}-${G.S().round}`);
            const ws = rnd((cat().weapons || []).filter(w => !(w.allowed_monster_ids || []).map(Number).includes(EMO.BOT_ID) && w.attribute && weaponOn(w.id)), 6);
            const ts = rnd((cat().traits || []).filter(t => traitOn(t.id)), 3);
            const buyItem = it => { const price = { gold: it.gold || 0, pts: it.pts || 0 }; if (!canPay(ps, price)) return toast("돈이 부족합니다", "warn"); pay(ps, price); M.giveItem(pid, it.id); Sound.coin(); toast(`${it.name} 구매!`, "ok"); Store.saveSeason(); onChange(); draw(); };
            const group = (title, list) => list.length ? [h("h4", title), h("div.emo-buy-grid", ...list.map(it => buyLine(ps, it, { gold: it.gold || 0, pts: it.pts || 0 }, () => buyItem(it))))] : [];
            put(wrap,
                h("div.emo-lab-head", h("div.big", "🛒"), h("div", h("h3", `Monster Shop · ${loc.name}`), h("p.muted.small", "볼 · 회복약 · Release 권 · 몬스터 무기 · 특성을 팝니다. 무기와 특성은 라운드마다 바뀝니다."))),
                group("⚪ 볼", EMO_ITEMS.filter(i => i.kind === "ball" && !i.attr).map(i => emoItem(i.id))),
                group("🔷 속성 볼 (해당 속성 몬스터에게 +45%)", EMO_ITEMS.filter(i => i.kind === "ball" && i.attr).map(i => emoItem(i.id))),
                group("🧪 회복 · 치료", EMO_ITEMS.filter(i => ["potion", "pp", "cure"].includes(i.kind)).map(i => emoItem(i.id))),
                group("🎫 티켓", EMO_ITEMS.filter(i => i.kind === "delete").map(i => emoItem(i.id))),
                h("h4", "⚔ 오늘의 몬스터 무기 · 🧬 특성"),
                h("div.emo-buy-grid",
                    ...ws.map(w => h("button.emo-buy", { disabled: ps.money < weaponPrice(w), onclick: () => { if (ps.money < weaponPrice(w)) return; ps.money -= weaponPrice(w); M.giveWeapon(pid, w.id); Sound.coin(); toast(`${w.name} 구매! (몬스터를 눌러 배우기)`, "ok"); Store.saveSeason(); onChange(); draw(); } },
                        typeChip(w.attribute), h("div", ...weaponLine(w)), h("span.emo-price", `${fmt(weaponPrice(w))} G`))),
                    ...ts.map(t => h("button.emo-buy", { disabled: ps.money < traitPrice(t), onclick: () => { if (ps.money < traitPrice(t)) return; ps.money -= traitPrice(t); M.giveTrait(pid, t.id); Sound.coin(); toast(`${t.name} 특성 구매!`, "ok"); Store.saveSeason(); onChange(); draw(); } },
                        h("span.big", "🧬"), h("div", h("b", t.name), h("small", (globalThis.TraitManager?.describe?.(t)) || "")), h("span.emo-price", `${fmt(traitPrice(t))} G`)))));
        };
        draw();
        return wrap;
    });
}
