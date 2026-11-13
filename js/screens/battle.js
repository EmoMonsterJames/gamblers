// =====================================================================
// Final battle. Richer player (tie → more points) attacks first. Each
// turn the attacker uses a random weapon from their arsenal (or the
// basic attack). guard = blocks the next hit, sleep flute = target
// sleeps 1~3 turns. Every weapon has its own animation.
// =====================================================================
import { h, sleep, pick, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { confetti, banner, shake, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { WEAPON_BY_ID, BASIC_ATTACK, isDeadWeapon } from "../data/catalog.js";
import { S, log, name } from "../game/season.js";
import { avatar, petView, weaponChip, displayName } from "../ui/profile.js";
import { CONFIG } from "../config.js";

// 🪄 마법 weapon: equal chance of each spell
const MAGIC_SPELLS = [
    { id: "swap", name: "무기 봉인! 상대 무기 → No Move", icon: "🫥", w: 1 },
    { id: "atk10", name: "매직 미사일 ATK 10", icon: "✨", atk: 10, w: 1 },
    { id: "atk5", name: "반짝 펀치 ATK 5", icon: "💫", atk: 5, w: 1 },
    { id: "atk20", name: "메테오 ATK 20", icon: "☄️", atk: 20, w: 1 },
    { id: "sleep", name: "수면 마법 (1~2턴)", icon: "💤", w: 1 }
];

export function battleView(aId, bId, onWin, { title = "🏆 FINAL BATTLE 🏆", sub = "첫 공격: 보유금액이 더 많은 플레이어 (같으면 포인트)", logLabel = "결승" } = {}) {
    const s = S();
    // HP carries over between battles (winners keep their damage; HP potions heal)
    const F = [aId, bId].map(pid => ({ pid, ps: s.ps[pid], hp: Math.max(1, s.ps[pid].hp ?? CONFIG.START_HP), shield: false, sleep: 0 }));
    const side = i => {
        const f = F[i];
        const hpI = h("i"), hpT = h("span", `${Math.round(f.hp * 100) / 100} / ${CONFIG.START_HP}`);
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
        h("h2.stage-title", title, h("small", sub)),
        arena,
        h("div.row.center", startBtn, speedBtn),
        logEl);

    const W = ms => sleep(ms / speed);
    const say = (txt, cls = "") => { logEl.prepend(h("div" + (cls ? "." + cls : ""), txt)); };
    const setHp = f => { f.hpI.style.width = Math.max(0, f.hp) / CONFIG.START_HP * 100 + "%"; f.hpT.textContent = `${Math.round(Math.max(0, f.hp) * 100) / 100} / ${CONFIG.START_HP}`; f.hpI.classList.toggle("low", f.hp <= 30); };
    const status = f => { const st = f.el.querySelector(".f-status"); st.replaceChildren(f.shield ? h("span", "🛡️") : "", f.sleep ? h("span.zz", `💤${f.sleep}`) : "", f.sprayed > 0 ? h("span.sprayed", `🧴${f.sprayed}`) : ""); };

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
            const accNow = Math.max(0, w.acc - (atk.sprayed > 0 ? (atk.sprayDown || 10) : 0));
            const hit = Math.random() * 100 < accNow;
            if (atk.sprayed > 0) { atk.sprayed--; status(atk); }
            await animate(w, atk, def, hit);
            if (w.type === "copy" && hit) {
                // 📋 복사: one random weapon of the opponent, used against them (its own effect, no second accuracy roll)
                const pool = def.ps.weapons.filter(x => !isDeadWeapon(x) && WEAPON_BY_ID[x]?.type !== "copy" && WEAPON_BY_ID[x]?.type !== "surprise");
                const cw = pool.length ? WEAPON_BY_ID[pick(pool)] : BASIC_ATTACK;
                say(`📋 ${name(def.pid)}의 ${cw.emoji} ${cw.name}을(를) 복사했다!`, "ok"); floating(atk, `COPY ${cw.emoji}`, "block");
                await W(350);
                await animate(cw, atk, def, true);
                await resolve(cw, atk, def, true, wid);
            } else await resolve(w, atk, def, hit, wid);
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
        log(`⚔️ ${logLabel}: ${name(winner.pid)}이(가) ${name(loser.pid)}을(를) 꺾었다`);
        await sleep(2200);
        onWin(winner.pid, loser.pid);
    }

    // what a weapon does once it is used (wid = the weapon id that was in the attacker's arsenal)
    async function resolve(w, atk, def, hit, wid) {
        if (w.type === "nomove") {
            say(`${w.emoji} ${name(atk.pid)}은(는) 아무것도 하지 않았다… (${w.name})`, "muted"); floating(atk, "…", "miss");
        } else if (w.type === "block") {
            if (hit) { atk.shield = true; say(`🛡️ 방어 태세! 다음 공격을 막는다`, "ok"); } else say("방어 실패…", "muted");
        } else if (w.type === "surprise") {
            await surprise(w, atk, def, wid);
        } else if (!hit) {
            say("…빗나감! MISS", "muted"); floating(def, "MISS", "miss"); Sound.miss();
        } else if (def.shield) {
            def.shield = false; say(`🛡️ ${name(def.pid)}이(가) 공격을 막았다!`, "ok"); floating(def, "BLOCK!", "block"); Sound.stop();
        } else if (w.type === "sleep") {
            putToSleep(def, 1 + Math.floor(Math.random() * 3), "💤");
        } else if (w.type === "spray") {
            // never stacks: a second spray only refreshes the 3 turns
            const again = def.sprayed > 0;
            def.sprayed = w.turns || 3; def.sprayDown = w.accDown || 10;
            say(again ? `🧴 ${name(def.pid)}에게 또 스프레이! (중첩 없음 · ${def.sprayed}턴으로 갱신)` : `🧴 ${name(def.pid)}의 눈에 스프레이! ${def.sprayed}턴 동안 명중률 -${def.sprayDown}%`, "bad");
            floating(def, `ACC -${def.sprayDown}%`, "sleep");
        } else if (w.type === "magic") {
            await castMagic(atk, def);
        } else if (w.type === "copy") {
            say("📋 복사할 무기가 없다…", "muted");
        } else damage(def, w.atk);
    }
    // every sleep (flute, magic, copies of them): a sleeping fighter's sleep is never extended
    function putToSleep(def, turns, icon) {
        if (def.sleep > 0) {
            say(`${icon} ${name(def.pid)}은(는) 이미 잠들어 있다! (수면 턴은 늘어나지 않음 · ${def.sleep}턴 남음)`, "muted");
            floating(def, "ZZZ", "miss");
            return;
        }
        def.sleep = turns;
        say(`${icon} ${name(def.pid)}이(가) ${def.sleep}턴 동안 잠들었다!`, "bad"); floating(def, "SLEEP", "sleep");
    }
    // 🎁 서프라이즈 / 🎉 빅서프라이즈 (1 use): swap places with one of the opponent's weapons — for good.
    // The opponent gets "You Got Suprised!" (does nothing). Big = the attacker chooses which weapon.
    async function surprise(w, atk, def, wid) {
        const ix = atk.ps.weapons.indexOf(wid);
        const pool = def.ps.weapons.map((x, i) => [x, i]).filter(([x]) => !isDeadWeapon(x));
        if (!pool.length) {
            if (ix >= 0) atk.ps.weapons.splice(ix, 1);
            say(`${w.emoji} ${name(def.pid)}에게 바꿔치기할 무기가 없다… (${w.name} 소멸)`, "muted");
        } else {
            const [took, di] = w.choose ? await chooseWeapon(atk, def, pool) : pick(pool);
            def.ps.weapons[di] = "got_surprised";
            if (ix >= 0) atk.ps.weapons[ix] = took; else atk.ps.weapons.push(took);
            const tw = WEAPON_BY_ID[took];
            const card = h("div.magic-card.surprise", h("span", w.emoji), h("b", "You Got Suprised!"), h("small", `${tw?.emoji || ""} ${tw?.name || took} → ${name(atk.pid)}`));
            fxLayer.append(card); Sound.bonus(); confetti(30, ["🎁", "🎉", "😜"]);
            await W(1300); card.remove();
            floating(def, "SURPRISED!", "sleep");
            say(`${w.emoji} ${w.name}! ${name(atk.pid)}이(가) ${name(def.pid)}의 ${tw?.emoji || ""} ${tw?.name || took}을(를) 빼앗아 영원히 간직한다! (${name(def.pid)}에게는 😜 You Got Suprised!)`, "bad");
            log(`${w.emoji} ${name(atk.pid)}의 ${w.name}: ${name(def.pid)}의 ${tw?.name || took} 획득 → ${name(def.pid)}에게는 You Got Suprised!`);
        }
        for (const f of [atk, def]) f.el.closest(".fside").querySelector(".wlist").replaceChildren(...(f.ps.weapons.length ? f.ps.weapons.map(weaponChip) : [weaponChip("basic")]));
        Store.saveSeason();
    }
    function chooseWeapon(atk, def, pool) {
        return new Promise(res => {
            const m = modal(h("div.surprise-pick",
                h("p", `🎉 ${name(atk.pid)}의 빅서프라이즈! ${name(def.pid)}의 무기 중 가져올 무기를 고르세요.`),
                h("div.wlist", pool.map(([x, i]) => h("button.wbtn", { onclick: () => { m.close(); res([x, i]); } }, weaponChip(x))))),
                { title: "🎉 빅서프라이즈", closable: false });
        });
    }

    function damage(def, atk) {
        def.hp -= atk; setHp(def);
        floating(def, `-${atk}`, "dmg"); Sound.hit(); shake(def.el, "hit-shake");
        if (atk >= 50) { shake(arena, "big-shake"); Sound.boom(); }
        say(`💥 ${name(def.pid)}에게 ${atk} 데미지! (HP ${Math.round(Math.max(0, def.hp) * 100) / 100})`, "bad");
    }
    // 🪄 마법: one random spell. Turning a weapon into No Move is permanent (it stays in the arsenal).
    async function castMagic(atk, def) {
        const swappable = def.ps.weapons.map((w, i) => [w, i]).filter(([w]) => !isDeadWeapon(w));
        const spells = MAGIC_SPELLS.filter(s => s.id !== "swap" || swappable.length);
        const sp = pick(spells.flatMap(s => Array(s.w).fill(s)));
        const card = h("div.magic-card", h("span", sp.icon), h("b", sp.name));
        fxLayer.append(card); Sound.bonus();
        await W(1100); card.remove();
        if (sp.id === "swap") {
            const [wid, i] = pick(swappable);
            def.ps.weapons[i] = "no_move";
            def.el.closest(".fside").querySelector(".wlist").replaceChildren(...def.ps.weapons.map(weaponChip));
            floating(def, "NO MOVE!", "sleep");
            say(`🪄 마법! ${name(def.pid)}의 ${WEAPON_BY_ID[wid]?.name || wid}이(가) 🫥 No Move로 바뀌었다!`, "bad");
            log(`🪄 ${name(atk.pid)}의 마법: ${name(def.pid)}의 ${WEAPON_BY_ID[wid]?.name || wid} → No Move`);
            Store.saveSeason();
        } else if (sp.id === "sleep") {
            putToSleep(def, 1 + Math.floor(Math.random() * 2), "🪄 수면 마법!");
        } else damage(def, sp.atk);
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
            case "rocket": {
                const p = proj(dir > 0 ? "🤜" : "🤛", "rocketfist"); p.dataset.trail = "🔥";
                await fly(p, target, 520, "scale(1.9)");
                if (hit) { Sound.boom(); shake(arena, "big-shake"); }
                p.remove(); break;
            }
            case "copy": {
                const c = proj("📋", "glow"); await fly(c, { x: D.x, y: D.y - 70 }, 450, "scale(1.3)");
                await fly(c, { x: A.x, y: A.y - 60 }, 400, "scale(1)"); c.remove(); break;
            }
            case "surprise": {
                const g = proj("🎁", "huge"); await fly(g, target, 600, "scale(1.8) rotate(20deg)");
                if (hit) { const b = h("div.proj.pow", "🎉"); b.style.left = target.x + "px"; b.style.top = target.y + "px"; fxLayer.append(b); Sound.boom(); await W(400); b.remove(); }
                g.remove(); break;
            }
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
            case "magic": {
                const wand = proj("🪄", "glow");
                wand.animate([{ transform: "translate(-50%,-50%) rotate(-30deg)" }, { transform: "translate(-50%,-50%) rotate(40deg) scale(1.4)" }], { duration: 420 / speed, fill: "forwards" });
                await W(380);
                for (let i = 0; i < 9; i++) { const s = proj(["✨", "⭐", "💫"][i % 3], "spin"); fly(s, { x: target.x + (Math.random() - .5) * 80, y: target.y + (Math.random() - .5) * 80 }, 520).then(() => s.remove()); await W(55); }
                await W(450); wand.remove(); break;
            }
            case "spray": {
                const can = proj("🧴", "glow"); can.style.left = A.x + dir * 40 + "px";
                can.animate([{ transform: "translate(-50%,-50%) rotate(0)" }, { transform: `translate(-50%,-50%) rotate(${dir * 25}deg) scale(1.3)` }], { duration: 300 / speed, fill: "forwards" });
                for (let i = 0; i < 14; i++) { const m = proj(["💨", "🌫️", "·"][i % 3], "mist"); m.style.left = A.x + dir * 60 + "px"; fly(m, { x: target.x + (Math.random() - .5) * 50, y: target.y - 10 + (Math.random() - .5) * 50 }, 520).then(() => m.remove()); await W(40); }
                if (hit) { const c = h("div.proj.spray-cloud", "🌫️"); c.style.left = target.x + "px"; c.style.top = target.y + "px"; fxLayer.append(c); await W(650); c.remove(); }
                await W(200); can.remove(); break;
            }
            case "nomove": {
                const q = h("div.proj", "🫥"); q.style.left = A.x + "px"; q.style.top = A.y - 70 + "px"; fxLayer.append(q);
                await q.animate([{ transform: "translate(-50%,-50%) scale(.6)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1.3)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 0 }], { duration: 900 / speed }).finished;
                q.remove(); break;
            }
            default: { const p = proj("✊"); await fly(p, target, 400); p.remove(); }
        }
    }
    setTimeout(() => { setHp(F[0]); setHp(F[1]); }, 0);
    return root;
}
