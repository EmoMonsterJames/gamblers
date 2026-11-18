// =====================================================================
// 🦟 모기 숲 (Mosquito Forest) — Survival Land map rules
//   · little mosquitoes fly all over the play screen with a quiet whine
//   · 🦟 Tiny Mosquito (악) comes often: 물기 HP −1 (95%) — no attack screen, just an alarm under the
//     pet · 암 전파 (5%) — the only one with an attack popup
//   · 🥚 a giant mosquito egg grows under the pet (like Foggy Church's devil statue) — it gets bigger and
//     shakes near 100 · at 100 it hatches → the 🦟 Monster Mosquito comes, always
//   · 🦟 Monster Mosquito (악): Battle — HP 100 · Syringe Poke · Ultrasound · Wing Slap · Draw Blood ·
//     Tiny Mosquito swarm · the player fights with their own weapons · losing the battle = death
// mosquitoExtras() plugs into survivalIce.survivalExtras() · mosquitoBite / mosquitoBattle into corners2.npcAttack()
// =====================================================================
import { h, sleep } from "../core/util.js";
import { Sound, tone, noise } from "../core/sound.js";
import { toast, modal, confetti, activityBusy } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import { NPCS, WEAPON_BY_ID, BASIC_ATTACK, pickNpcMove } from "../data/catalog.js";
import { avatar } from "../ui/profile.js";

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const ps_ = pid => G.S()?.ps?.[pid];
const turnOf = pid => { const t = G.S()?.turn; return t && +t.pid === +pid ? t : null; };
const npcById = id => NPCS.find(n => n.id === id);

export const MOSQ_RULES = [
    "🦟 작은 모기들이 플레이 화면 전체를 날아다닙니다 (작은 모기 소리).",
    "🦟 Tiny Mosquito (악): 자주 나타납니다 — 물기 HP −1 (95%, 공격 화면 없이 펫 아래에 알림) · 암 전파 (5%, 공격 화면).",
    "🥚 펫 아래의 대형 모기알이 랜덤하게 점점 자랍니다 — 100이 되면 알이 깨지면서 Monster Mosquito가 무조건 나타납니다.",
    "⚔️ Monster Mosquito (악): 배틀! 대왕모기 HP 100 · 내 무기로 싸웁니다 — 배틀에서 지면 바로 사망합니다.",
    "　└ 대왕모기 무기: 💉 Syringe Poke HP −5 (90%) · 📢 Ultrasound 내 공격 1회 마비 (95%) · 🪽 Wing Slap HP −10 (80%) · 🩸 Draw Blood HP −10 · 본인 +5 (80%) · 🦟 Tiny Mosquito HP −5~−10 (90%)",
    "⏱️ 이 맵에서 2분이 지나야 다른 Survival Land 맵권을 쓸 수 있습니다."
];

// the side alarm of the running Mosquito Forest screen (set by mosquitoExtras)
let sideMsg = null, sideFlash = null;
const alarm = (text, kind = "warn", ms = 2600) => sideMsg ? sideMsg(text, kind, ms) : toast(text, kind, ms);

// ================================================================ 🦟 Tiny Mosquito
// a bite: no attack screen — the alarm under the pet only
export function mosquitoBite(pid, npc, move) {
    const out = G.npcHit(pid, npc, move);
    if (out.blocked) { alarm(`🎫 Tiny Mosquito의 물기를 NPC Block 권으로 막았다 (남은 ${out.left}회)`, "ok"); return out; }
    alarm(`🦟 'Tiny Mosquito'가 물어서 HP −${Math.abs(move.hp || 1)}`, "warn", 2600);
    sideFlash?.();
    tone(2400, 0.04, "sine", 0.02); tone(1800, 0.06, "triangle", 0.02, 0.04);
    return out;
}
// the 5% cancer bite: the attack popup
async function cancerBite(pid, npc, move) {
    const art = h("div.npc-art", { style: { "--c": npc.color } }, h("span.npc-body", npc.emoji), h("span.npc-weapon", npc.art), h("small", npc.name, " (악)"));
    const target = h("div.npc-target", avatar(pid, 120, { effect: false }));
    const fxl = h("div.npc-fx"), say = h("div.npc-say", `${npc.emoji} ${npc.name}이(가) 나타났다!`), res = h("div.npc-res");
    const box = h("div.npc-pop.k-disease", h("div.npc-arena", art, fxl, target), say, res);
    const m = modal(box, { title: "⚠️ NPC 습격!", closable: false });
    Sound.boom();
    await sleep(1000);
    art.classList.add("lunge");
    const proj = h("span.npc-proj", "🦟"); fxl.append(proj);
    Sound.whoosh(); await sleep(650); proj.remove();
    const out = G.npcHit(pid, npc, move);
    if (out.blocked) res.replaceChildren(h("b", `🎫 NPC 공격 Block 권 발동! 공격을 막았다 (남은 Block ${out.left}회)`));
    else {
        fxl.append(h("span.npc-burst", "🦠")); target.classList.add("hurt"); Sound.hit();
        say.textContent = `${npc.emoji} Tiny Mosquito의 암 전파!`;
        res.replaceChildren(h("b", out.already ? "🦠 이미 암에 걸려 있어 더 나빠지지는 않았다" : "🎗️ 모기에 물려 암에 걸렸다! (라운드마다 HP −10 · 암치료제 / Player Clinic)"));
    }
    box.append(h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
    setTimeout(() => m.close(), 7000);
    await m.closed;
    return out;
}
export async function tinyAttack(pid) {
    const npc = npcById("tiny_mosquito");
    const move = pickNpcMove(npc);
    return move.bite ? mosquitoBite(pid, npc, move) : cancerBite(pid, npc, move);
}

// ================================================================ ⚔️ Monster Mosquito battle
export const MQ_HP = 100;
export const MQ_MOVES = [
    { id: "syringe", name: "Syringe Poke", emoji: "💉", hp: 5, acc: 90 },
    { id: "ultra", name: "Ultrasound", emoji: "📢", para: 1, acc: 95 },
    { id: "wing", name: "Wing Slap", emoji: "🪽", hp: 10, acc: 80 },
    { id: "blood", name: "Draw Blood", emoji: "🩸", hp: 10, heal: 5, acc: 80 },
    { id: "swarm", name: "Tiny Mosquito", emoji: "🦟", hp: [5, 10], acc: 90 }
];
const roll = acc => Math.random() * 100 < acc;
let battling = false;
export const inMosquitoBattle = () => battling;
// what the player's weapon does to the giant mosquito (the weapons are not used up here)
function weaponText(w) {
    switch (w.type) {
        case "attack": return `ATK ${w.atk} · ACC ${w.acc}`;
        case "block": return `다음 공격 1회 방어 · ACC ${w.acc}`;
        case "magic": return `랜덤 마법 (5/10/20 피해 또는 수면) · ACC ${w.acc}`;
        case "sleep": return `대왕모기 1~3턴 수면 · ACC ${w.acc}`;
        case "spray": return `대왕모기 명중률 −10% (3턴) · ACC ${w.acc}`;
        case "copy": return `대왕모기 무기를 복사해 공격 · ACC ${w.acc}`;
        default: return "이 배틀에서는 효과 없음";
    }
}
// → { kill, win, blocked }
export async function mosquitoBattle(pid, npc = npcById("monster_mosquito"), move = { battle: "mosquito" }) {
    if (battling) return {};
    const t = turnOf(pid), ps = ps_(pid);
    if (!ps) return {};
    const blocked = G.npcBlockTry(pid, move);
    if (blocked) { toast(`🎫 NPC 공격 Block 권 발동! Monster Mosquito를 쫓아냈다 (남은 Block ${blocked.left}회)`, "ok", 3500); return blocked; }
    battling = true;
    const was = t?.running; if (t) t.running = false; // the turn clock stops while the battle runs
    G.noteNpcAttack(pid, npc.id);
    G.log(`🦟 Monster Mosquito 등장 → ${G.name(pid)}와 배틀!`);
    const foe = { hp: MQ_HP, sleep: 0, para: 0, spray: 0 };
    const me = { para: 0, block: false };
    const meBar = h("i"), foeBar = h("i"), meHp = h("b"), foeHp = h("b");
    const meEl = h("div.mq-fighter.me", avatar(pid, 104, { effect: false }), h("div.mq-name", G.name(pid)), h("div.mq-hp", h("div.mq-hp-bar", meBar), meHp));
    const boss = h("span.mq-boss", "🦟");
    const foeEl = h("div.mq-fighter.foe", h("div.mq-boss-wrap", boss, h("span.mq-boss-blood", "💉")), h("div.mq-name", "Monster Mosquito"), h("div.mq-hp", h("div.mq-hp-bar.foe", foeBar), foeHp));
    const fxl = h("div.mq-fx");
    const logEl = h("div.mq-log", "🦟 대왕모기가 날개를 윙윙거린다… 내 무기를 골라 공격하세요!");
    const status = h("div.mq-status");
    const weaponsEl = h("div.mq-weapons");
    const box = h("div.mq-battle", h("div.mq-arena", meEl, h("div.mq-vs", "VS"), foeEl, fxl), status, logEl, weaponsEl);
    const m = modal(box, { title: "⚔️ Monster Mosquito 배틀!", closable: false, wide: true, cls: "mq-modal" });
    Sound.boom(); noise(1.2, 0.05);
    const draw = () => {
        const hp = Math.max(0, Math.round(ps.hp));
        meBar.style.width = Math.min(100, hp) + "%"; meHp.textContent = `❤ ${hp}`;
        foeBar.style.width = Math.max(0, foe.hp) / MQ_HP * 100 + "%"; foeHp.textContent = `🦟 ${Math.max(0, Math.round(foe.hp))} / ${MQ_HP}`;
        status.replaceChildren(
            me.para ? h("span.mq-tag.red", "📢 마비 — 다음 공격 불가") : null, me.block ? h("span.mq-tag.blue", "🛡️ 방어 준비") : null,
            foe.sleep ? h("span.mq-tag.blue", `💤 대왕모기 수면 ${foe.sleep}턴`) : null, foe.spray ? h("span.mq-tag", `🧴 대왕모기 명중률 −10% (${foe.spray}턴)`) : null);
    };
    const say = txt => { logEl.textContent = txt; };
    const shot = async (emoji, toFoe) => {
        const p = h("span.mq-proj" + (toFoe ? ".to-foe" : ".to-me"), emoji); fxl.append(p);
        Sound.whoosh(); await sleep(520); p.remove();
    };
    const hitFx = el => { el.classList.remove("mq-hurt"); void el.offsetWidth; el.classList.add("mq-hurt"); };
    // player HP: the real HP — at 0 the battle is lost
    const hurtMe = n => { ps.hp = Math.max(0, ps.hp - n); Store.saveSeason(); hitFx(meEl); Sound.hit(); return ps.hp <= 0; };
    const hurtFoe = n => { foe.hp = Math.max(0, foe.hp - n); hitFx(foeEl); Sound.hit(); return foe.hp <= 0; };
    draw();
    let result = null;
    // the player's weapons (plus the basic attack) — one button each
    const myWeapons = () => [BASIC_ATTACK, ...[...new Set(ps.weapons || [])].map(id => WEAPON_BY_ID[id]).filter(Boolean)];
    const pickWeapon = () => new Promise(res => {
        weaponsEl.replaceChildren(...myWeapons().map(w => h("button.mq-wbtn" + (["nomove", "surprise"].includes(w.type) ? ".dead" : ""), { onclick: () => res(w) },
            h("span.mq-wico", w.emoji), h("b", w.name), h("small", weaponText(w)))));
    });
    while (!result) {
        // ---- the player's turn
        draw();
        if (me.para) {
            me.para = 0; weaponsEl.replaceChildren(h("p.muted", "📢 초음파에 마비되어 이번 턴은 공격할 수 없다…"));
            say("📢 마비! 이번 턴은 공격하지 못했다…"); await sleep(1500);
        } else {
            const w = await pickWeapon();
            weaponsEl.replaceChildren(h("p.muted", `${w.emoji} ${w.name}!`));
            await shot(w.emoji, true);
            const ok = roll(w.acc ?? 100);
            if (!ok && !["nomove", "surprise"].includes(w.type)) { say(`${w.emoji} ${w.name} — 빗나갔다! (ACC ${w.acc})`); Sound.miss(); }
            else if (w.type === "attack") { say(`${w.emoji} ${w.name} 명중! 대왕모기 HP −${Math.round(w.atk * 10) / 10}`); if (hurtFoe(w.atk)) result = "win"; }
            else if (w.type === "block") { me.block = true; say(`${w.emoji} 방어 자세! 대왕모기의 다음 공격 1회를 막습니다`); }
            else if (w.type === "magic") {
                const r = Math.random();
                if (r < 0.25) { foe.sleep = Math.max(foe.sleep, rint(1, 2)); say(`🪄 마법 — 대왕모기가 잠들었다! (${foe.sleep}턴)`); }
                else { const d = [5, 10, 20][rint(0, 2)]; say(`🪄 마법 — 대왕모기 HP −${d}`); if (hurtFoe(d)) result = "win"; }
            }
            else if (w.type === "sleep") { foe.sleep = Math.max(foe.sleep, rint(1, 3)); say(`${w.emoji} 대왕모기가 잠들었다! (${foe.sleep}턴)`); }
            else if (w.type === "spray") { foe.spray = 3; say(`${w.emoji} 스프레이! 대왕모기 명중률 −10% (3턴)`); }
            else if (w.type === "copy") {
                const c = MQ_MOVES[rint(0, MQ_MOVES.length - 1)];
                if (c.para) { foe.sleep = Math.max(foe.sleep, 1); say(`📋 ${c.emoji} ${c.name} 복사! 대왕모기가 1턴 동안 마비`); }
                else { const d = Array.isArray(c.hp) ? rint(c.hp[0], c.hp[1]) : c.hp; say(`📋 ${c.emoji} ${c.name} 복사 공격! 대왕모기 HP −${d}`); if (hurtFoe(d)) result = "win"; }
            }
            else say(`${w.emoji} ${w.name} — 이 배틀에서는 아무 일도 일어나지 않았다`);
            draw();
            await sleep(900);
        }
        if (result) break;
        // ---- the giant mosquito's turn
        if (foe.sleep > 0) { foe.sleep--; say("💤 대왕모기가 자고 있다…"); draw(); await sleep(1100); continue; }
        const mv = MQ_MOVES[rint(0, MQ_MOVES.length - 1)];
        boss.classList.remove("mq-lunge"); void boss.offsetWidth; boss.classList.add("mq-lunge");
        await shot(mv.emoji, false);
        const acc = mv.acc - (foe.spray ? 10 : 0);
        if (foe.spray) foe.spray--;
        if (!roll(acc)) { say(`🦟 ${mv.emoji} ${mv.name} — 빗나갔다!`); Sound.miss(); }
        else if (me.block) { me.block = false; say(`🛡️ ${mv.emoji} ${mv.name}을(를) 막아냈다!`); Sound.stop(); }
        else if (mv.para) { me.para = 1; say(`📢 Ultrasound! 초음파에 마비 — 다음 공격 1회를 못 한다`); tone(3200, 0.6, "sine", 0.03, 0, -800); }
        else {
            const d = Array.isArray(mv.hp) ? rint(mv.hp[0], mv.hp[1]) : mv.hp;
            if (mv.heal) foe.hp = Math.min(MQ_HP, foe.hp + mv.heal);
            say(mv.id === "blood" ? `🩸 Draw Blood! 내 피를 빨았다 — HP −${d} · 대왕모기 HP +${mv.heal}` : mv.id === "swarm" ? `🦟 작은 모기 떼가 사방에서 달려든다! HP −${d}` : `${mv.emoji} ${mv.name}! HP −${d}`);
            if (mv.id === "swarm") for (let i = 0; i < 10; i++) { const f = h("span.mq-swarm", "🦟"); f.style.cssText = `--dx:${rint(-180, 180)}px;--dy:${rint(-120, 120)}px;--d:${(i * 0.04).toFixed(2)}s`; fxl.append(f); setTimeout(() => f.remove(), 1100); }
            if (hurtMe(d)) result = "lose";
        }
        draw();
        await sleep(1000);
    }
    // ---- the end
    let dead = false;
    if (result === "win") {
        Sound.fanfare(); confetti(70, ["🦟", "✨", "🏆"]);
        boss.classList.add("mq-down");
        say("🏆 승리! 대왕모기를 물리쳤다!");
        G.log(`🏆 ${G.name(pid)} Monster Mosquito 배틀 승리 (남은 HP ${Math.round(ps.hp)})`);
    } else {
        Sound.boom();
        say("☠️ 패배… 대왕모기에게 피를 모두 빨렸다");
        // losing the battle = death (🎭 the death shield can still keep the player at HP 1)
        const k = G.killPlayer(pid, "🦟 Monster Mosquito와의 배틀에서 패배하여 사망", { npc });
        dead = k !== false;
        if (!dead) { ps.hp = Math.max(1, ps.hp); say("🛡️ 패배… 하지만 죽지 않았다 (HP 1)"); }
    }
    weaponsEl.replaceChildren(h("button.btn.gold.big", { onclick: () => m.close() }, result === "win" ? "🏆 확인" : dead ? "☠️ 확인" : "확인"));
    await m.closed;
    battling = false;
    if (t && G.S()?.turn === t && !dead) t.running = was ?? true;
    Store.saveSeason(true);
    return { kill: dead, win: result === "win" };
}

// ================================================================ the map screen: swarm · whine · bites · egg
export function mosquitoExtras(loc, t, pid, { msg, die, onChange }) {
    const cleanups = [];
    sideMsg = msg; cleanups.push(() => { if (sideMsg === msg) sideMsg = null; });
    // 🦟 the swarm over the play screen
    const layer = h("div.mq-layer");
    const flies = Array.from({ length: 14 }, () => { const f = h("span.mq-fly", h("i", "🦟")); f.style.fontSize = rint(11, 19) + "px"; layer.append(f); return f; });
    document.body.append(layer);
    cleanups.push(() => layer.remove());
    const area = () => document.querySelector(".location")?.getBoundingClientRect() || { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const fly = f => {
        if (!layer.isConnected) return;
        const r = area(), x = r.left + Math.random() * r.width, y = Math.max(0, r.top) + Math.random() * Math.min(innerHeight, r.height);
        const px = parseFloat(f.style.left) || x, dur = 0.5 + Math.random() * 1.1;
        f.style.transitionDuration = dur + "s";
        f.style.left = x + "px"; f.style.top = y + "px";
        f.firstChild.style.transform = x < px ? "scaleX(1)" : "scaleX(-1)";
        f._t = setTimeout(() => fly(f), dur * 1000);
    };
    flies.forEach((f, i) => setTimeout(() => fly(f), i * 60));
    cleanups.push(() => flies.forEach(f => clearTimeout(f._t)));
    Sound.buzz(true);
    cleanups.push(() => Sound.buzz(false));
    // 🥚 the egg under the pet
    const M = (t.mosq ||= { egg: 0, bites: 0, next: rint(4, 10) });
    const eggLv = h("small.mq-egg-lv"), egg = h("div.mq-egg", h("span", "🥚"), h("i.mq-crack"));
    const side = h("div.mq-egg-box", { title: "대형 모기알 — 100이 되면 깨지면서 Monster Mosquito가 나타납니다" }, h("small.mq-egg-title", "🥚 대형 모기알"), egg, eggLv);
    const drawEgg = () => {
        const v = Math.min(100, M.egg);
        egg.style.setProperty("--s", (0.6 + v / 100 * 0.9).toFixed(2));
        egg.classList.toggle("shake", v >= 70 && v < 90);
        egg.classList.toggle("shake2", v >= 90);
        egg.classList.toggle("cracked", v >= 85);
        eggLv.textContent = `🦟 ${v} / 100`;
    };
    drawEgg();
    sideFlash = () => { side.classList.remove("bit"); void side.offsetWidth; side.classList.add("bit"); };
    let busy = false;
    const iv = setInterval(async () => {
        if (busy || !t.running || G.S()?.turn !== t || battling) return;
        // 🦟 bites: often, at random
        if (--M.next <= 0) {
            M.next = rint(4, 12);
            if (document.querySelector(".modal-back:not(.out)")) M.next = 2;
            else { busy = true; M.bites++; const out = await tinyAttack(pid); busy = false; onChange?.(); if (!G.S()?.turn) return die(); void out; }
        }
        // 🥚 the egg grows
        if (M.egg < 100 && Math.random() < 1 / 16) {
            M.egg = Math.min(100, M.egg + rint(4, 12));
            drawEgg(); Store.saveSeason();
            tone(70, 0.4, "sine", 0.08); egg.classList.remove("grow"); void egg.offsetWidth; egg.classList.add("grow");
            msg?.(`🥚 모기알이 자랐다… (${M.egg}/100)`, M.egg >= 70 ? "warn" : "info", 2600);
        }
        if (M.egg >= 100 && !activityBusy()) {
            busy = true;
            egg.classList.add("hatch"); Sound.boom(); noise(0.8, 0.12);
            msg?.("🥚💥 모기알이 깨졌다! Monster Mosquito 등장!", "error", 4000);
            await sleep(1300);
            M.egg = 0; Store.saveSeason(true);
            egg.classList.remove("hatch"); drawEgg();
            const r = await mosquitoBattle(pid);
            busy = false; onChange?.();
            if (r.kill || !G.S()?.turn) return die();
        }
    }, 1000);
    cleanups.push(() => clearInterval(iv));
    return { side, stop() { while (cleanups.length) cleanups.pop()(); sideFlash = null; } };
}
