// =====================================================================
// Final battle. Richer player (tie → more points) attacks first. Each
// turn the attacker uses a random weapon from their arsenal (or the
// basic attack). guard = blocks the next hit, sleep flute = target
// sleeps 1~3 turns. Every weapon has its own animation.
// =====================================================================
import { h, sleep, pick, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { confetti, banner, shake } from "../core/fx.js";
import { Store } from "../core/store.js";
import { WEAPON_BY_ID, BASIC_ATTACK } from "../data/catalog.js";
import { S, log, name } from "../game/season.js";
import { avatar, petView, weaponChip, displayName } from "../ui/profile.js";
import { CONFIG } from "../config.js";

export function battleView(aId, bId, onWin) {
    const s = S();
    const F = [aId, bId].map(pid => ({ pid, ps: s.ps[pid], hp: CONFIG.START_HP, shield: false, sleep: 0 }));
    const side = i => {
        const f = F[i];
        const hpI = h("i"), hpT = h("span", `${f.hp} / ${CONFIG.START_HP}`);
        const fig = h("div.fighter.f" + i, h("div.f-status"), avatar(f.pid, 170), f.ps.pet ? h("div.f-pet", petView(f.ps.pet, f.ps.petEffect, 70)) : null);
        f.el = fig; f.hpI = hpI; f.hpT = hpT;
        return h("div.fside.s" + i,
            h("div.f-name", displayName(Store.player(f.pid)), i === 0 ? h("span.first", "선공") : null),
            h("div.hpbar", hpI, hpT),
            h("div.f-money", `${fmt(f.ps.money)} G · ${f.ps.points} P`),
            fig,
            h("div.wlist.small", f.ps.weapons.length ? f.ps.weapons.map(weaponChip) : weaponChip("basic")));
    };
    const logEl = h("div.blog");
    const arena = h("div.arena", side(0), h("div.vs-big", "VS"), side(1));
    const fxLayer = h("div.bfx");
    arena.append(fxLayer);
    let speed = 1, started = false;
    const startBtn = h("button.btn.red.huge", { onclick: () => run() }, "⚔️ 배틀 시작!");
    const speedBtn = h("button.btn.ghost.small", { onclick: () => { speed = speed === 1 ? 2.5 : 1; speedBtn.textContent = speed > 1 ? "⏩ 빠르게" : "▶ 보통"; } }, "▶ 보통");
    const root = h("div.battle-stage",
        h("h2.stage-title", "🏆 FINAL BATTLE 🏆", h("small", "첫 공격: 보유금액이 더 많은 플레이어 (같으면 포인트)")),
        arena,
        h("div.row.center", startBtn, speedBtn),
        logEl);

    const W = ms => sleep(ms / speed);
    const say = (txt, cls = "") => { logEl.prepend(h("div" + (cls ? "." + cls : ""), txt)); };
    const setHp = f => { f.hpI.style.width = Math.max(0, f.hp) / CONFIG.START_HP * 100 + "%"; f.hpT.textContent = `${Math.max(0, f.hp)} / ${CONFIG.START_HP}`; f.hpI.classList.toggle("low", f.hp <= 30); };
    const status = f => { const st = f.el.querySelector(".f-status"); st.replaceChildren(f.shield ? h("span", "🛡️") : "", f.sleep ? h("span.zz", `💤${f.sleep}`) : ""); };

    async function run() {
        if (started) return; started = true; startBtn.remove();
        Sound.fanfare();
        await banner("FIGHT!", 1200, "fight");
        let turn = 0;
        while (F[0].hp > 0 && F[1].hp > 0 && turn < 300) {
            const atk = F[turn % 2], def = F[(turn + 1) % 2];
            turn++;
            if (atk.sleep > 0) {
                atk.sleep--; status(atk);
                say(`💤 ${name(atk.pid)}은(는) 잠들어 있다… (${atk.sleep}턴 남음)`, "muted");
                atk.el.classList.add("sleeping"); await W(900); atk.el.classList.remove("sleeping");
                continue;
            }
            const wid = atk.ps.weapons.length ? pick(atk.ps.weapons) : "basic";
            const w = WEAPON_BY_ID[wid] || BASIC_ATTACK;
            atk.el.classList.add("acting");
            say(`${w.emoji} ${name(atk.pid)}의 ${w.name}!`);
            const hit = Math.random() * 100 < w.acc;
            await animate(w, atk, def, hit);
            if (w.type === "block") {
                if (hit) { atk.shield = true; say(`🛡️ 방어 태세! 다음 공격을 막는다`, "ok"); } else say("방어 실패…", "muted");
            } else if (!hit) {
                say("…빗나감! MISS", "muted"); floating(def, "MISS", "miss"); Sound.miss();
            } else if (def.shield) {
                def.shield = false; say(`🛡️ ${name(def.pid)}이(가) 공격을 막았다!`, "ok"); floating(def, "BLOCK!", "block"); Sound.stop();
            } else if (w.type === "sleep") {
                def.sleep = 1 + Math.floor(Math.random() * 3);
                say(`💤 ${name(def.pid)}이(가) ${def.sleep}턴 동안 잠들었다!`, "bad"); floating(def, "SLEEP", "sleep");
            } else {
                def.hp -= w.atk; setHp(def);
                floating(def, `-${w.atk}`, "dmg"); Sound.hit(); shake(def.el, "hit-shake");
                if (w.atk >= 50) { shake(arena, "big-shake"); Sound.boom(); }
                say(`💥 ${name(def.pid)}에게 ${w.atk} 데미지! (HP ${Math.max(0, def.hp)})`, "bad");
            }
            status(atk); status(def);
            atk.el.classList.remove("acting");
            await W(650);
        }
        const winner = F[0].hp > 0 && (F[1].hp <= 0 || F[0].hp >= F[1].hp) ? F[0] : F[1];
        const loser = winner === F[0] ? F[1] : F[0];
        winner.ps.hp = Math.max(0, winner.hp); loser.ps.hp = 0;
        loser.el.classList.add("ko");
        Sound.boom();
        await banner("K.O.!", 1400, "ko");
        winner.el.classList.add("winner");
        confetti(120, ["👑", "✨", "🪙"]);
        say(`👑 ${name(winner.pid)} 승리!`, "ok");
        log(`⚔️ 결승: ${name(winner.pid)}이(가) ${name(loser.pid)}을(를) 꺾었다`);
        await sleep(2200);
        onWin(winner.pid);
    }

    function floating(f, txt, cls) {
        const t = h("div.bfloat." + cls, txt);
        f.el.append(t); setTimeout(() => t.remove(), 1300);
    }
    function center(el) { const r = el.getBoundingClientRect(), a = arena.getBoundingClientRect(); return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 }; }

    async function animate(w, atk, def, hit) {
        const A = center(atk.el), D = center(def.el);
        const target = hit ? D : { x: D.x + (D.x > A.x ? 140 : -140), y: D.y - 90 };
        const proj = (ch, cls = "") => { const p = h("div.proj" + (cls ? "." + cls : ""), ch); p.style.left = A.x + "px"; p.style.top = A.y + "px"; fxLayer.append(p); return p; };
        const fly = async (p, to, ms, extra = "") => {
            const a = p.animate([{ transform: "translate(-50%,-50%) scale(1)" }, { transform: `translate(calc(-50% + ${to.x - A.x}px), calc(-50% + ${to.y - A.y}px)) ${extra}` }], { duration: ms / speed, easing: "cubic-bezier(.5,0,.8,.6)", fill: "forwards" });
            await a.finished;
        };
        const dir = D.x > A.x ? 1 : -1;
        atk.el.animate([{ transform: "translateX(0)" }, { transform: `translateX(${30 * dir}px)` }, { transform: "translateX(0)" }], { duration: 350 / speed });
        Sound.whoosh();
        switch (w.anim) {
            case "punch": { const p = proj(dir > 0 ? "🤜" : "🤛"); await fly(p, target, 380, "scale(1.6)"); p.remove(); break; }
            case "kick": { const p = proj("🦶"); await fly(p, target, 450, `rotate(${dir * 540}deg) scale(1.5)`); p.remove(); break; }
            case "tongue": {
                const t = h("div.tongue"); t.style.left = A.x + "px"; t.style.top = A.y + "px"; t.style.setProperty("--len", Math.abs(target.x - A.x) + "px"); t.style.setProperty("--dir", dir);
                fxLayer.append(t); await W(600); t.remove(); break;
            }
            case "drop": {
                const p = h("div.proj", "🪨"); p.style.left = target.x + "px"; p.style.top = "-40px"; fxLayer.append(p);
                await p.animate([{ transform: "translate(-50%,-50%) rotate(0)" }, { transform: `translate(-50%, ${target.y + 20}px) rotate(200deg) scale(1.8)` }], { duration: 600 / speed, easing: "cubic-bezier(.6,0,1,1)", fill: "forwards" }).finished;
                if (hit) { Sound.boom(); shake(arena, "big-shake"); }
                p.remove(); break;
            }
            case "ghost": {
                const g = proj("👻", "ghosty"); await fly(g, target, 500, "scale(1.4)"); g.remove();
                for (const ch of ["👊", "👊"]) { const p = h("div.proj.pow", ch); p.style.left = target.x + "px"; p.style.top = target.y + "px"; fxLayer.append(p); Sound.hit(); await W(220); p.remove(); }
                break;
            }
            case "ko": {
                const p = proj("🥊", "huge"); await fly(p, target, 700, "scale(2.6)");
                if (hit) { const k = h("div.ko-flash", "K.O PUNCH!"); fxLayer.append(k); Sound.boom(); shake(arena, "big-shake"); await W(700); k.remove(); }
                p.remove(); break;
            }
            case "orb": { const p = proj("🔮", "glow"); await fly(p, target, 650, "scale(1.8)"); p.remove(); break; }
            case "sleep": {
                for (let i = 0; i < 4; i++) { const n = proj(i % 2 ? "🎵" : "🎶", "note"); fly(n, { x: target.x + (i - 2) * 20, y: target.y - 30 + i * 8 }, 700).then(() => n.remove()); await W(120); }
                await W(700); break;
            }
            case "coin": { const p = proj("🪙", "spin"); await fly(p, target, 400, "scale(1.4)"); Sound.coin(); p.remove(); break; }
            case "shield": {
                const sh = h("div.proj.shield", "🛡️"); sh.style.left = A.x + dir * 70 + "px"; sh.style.top = A.y + "px"; fxLayer.append(sh);
                await W(700); sh.remove(); break;
            }
            case "thunder": {
                const b = h("div.bolt", "⚡"); b.style.left = target.x + "px"; fxLayer.append(b);
                const fl = h("div.flash"); fxLayer.append(fl); Sound.boom(); await W(600); b.remove(); fl.remove(); break;
            }
            case "fire": {
                for (let i = 0; i < 7; i++) { const f = proj("🔥"); fly(f, { x: target.x + (Math.random() - .5) * 60, y: target.y + (Math.random() - .5) * 60 }, 500).then(() => f.remove()); await W(70); }
                await W(500); break;
            }
            case "storm": {
                const tw = proj("🌪️", "huge"); fly(tw, target, 700, "scale(1.6)");
                for (let i = 0; i < 6; i++) { const c = proj("🪙", "spin"); fly(c, { x: target.x + (Math.random() - .5) * 90, y: target.y + (Math.random() - .5) * 90 }, 600).then(() => c.remove()); await W(80); }
                await W(500); tw.remove(); break;
            }
            default: { const p = proj("✊"); await fly(p, target, 400); p.remove(); }
        }
    }
    setTimeout(() => { setHp(F[0]); setHp(F[1]); }, 0);
    return root;
}
