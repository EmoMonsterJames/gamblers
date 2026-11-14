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
import { EMO, cat, loadCatalog, species, typesOfSpecies, emoItem, EMO_ITEMS, weaponPrice, traitPrice, captureConfig, captureSkin, shopStock, labStock, stockPrice, labRecipes, isOrb } from "../emomon/data.js";
import * as M from "../emomon/game.js";
import { monPic, typeChip, stars, itemIcon, partyPanel, monDetail, arena, arenaSide, dexView, weaponLine, natureTxt, traitTypes, traitInfo, weaponInfo } from "../emomon/ui.js";
import { E } from "../emomon/engine.js";
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
const haveTag = n => h("span.emo-have" + (n ? "" : ".zero"), `보유 ${n || 0}개`);
const buyLine = (ps, it, price, onBuy, blocked = false, have = null) => h("button.emo-buy", { disabled: blocked || !canPay(ps, price), onclick: onBuy },
    itemIcon(it, 34), h("div", h("b", it.name), it.note ? h("small", it.note) : null, have != null ? haveTag(have) : null), h("span.emo-price", priceLabel(price)));
// one purchase in the 🛒 Monster Shop / 🧪 LAB 상점: asks first, counts toward the season limit
async function buyFlow(pid, name, price, kind, give) {
    const ps = G.S().ps[pid];
    const left = kind === "lab" ? M.labBuysLeft(pid) : M.shopBuysLeft(pid);
    const max = kind === "lab" ? EMO.LAB_BUYS : EMO.SHOP_BUYS;
    if (left <= 0) { toast(`이번 시즌 ${kind === "lab" ? "LAB 상점" : "Monster Shop"} 구매 횟수(${max}회)를 모두 썼습니다`, "warn", 3500); return false; }
    if (!canPay(ps, price)) { toast("골드 · 포인트가 부족합니다", "warn"); return false; }
    if (!(await confirmBox(`${name}을(를) ${priceLabel(price)}에 구매할까요?\n이번 시즌 남은 구매: ${left}회 → ${left - 1}회`, "구매", "취소"))) return false;
    if (!canPay(ps, price) || (kind === "lab" ? M.labBuysLeft(pid) : M.shopBuysLeft(pid)) <= 0) return false;
    pay(ps, price); give(); M.countBuy(pid, kind);
    G.log(`${kind === "lab" ? "🧪" : "🛒"} ${pname(pid)} ${name} 구매 (${priceLabel(price)})`);
    Store.saveSeason(true);
    Sound.coin(); toast(`${name} 구매!`, "ok");
    return true;
}

// ---------------------------------------------------------------- shared: a fight shown in the arena
export async function emoFight(pid, foe, { title, foeLabel, foeMon }) {
    const r = M.fight(pid, foe);
    const A = arenaSide(r.a.c, r.a.mon), B = arenaSide(r.b.c, foeMon || r.b.mon);
    await arena({ title, A, B, sim: r.sim, aLabel: pname(pid) + (r.a.bot ? " (Battlebot)" : ""), bLabel: foeLabel });
    Store.saveSeason(true);
    return r;
}

// ================================================================ 🔍 CAPTURE
export function captureView(pid, loc, { turn, onChange = () => { }, onLeave = null } = {}) {
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
            h("div.emo-cap-meta", h("span.emo-door." + cfg.door, doorText), h("small", `몬스터 출현 ${cfg.chance}% · ${pool.length}종`), h("b", `이번 라운드 남은 Capture ${M.findsLeft(pid)} / ${EMO.CAPTURES_PER_ROUND}`)));
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
            if (radarSel && M.bagN(pid, radarSel) <= 0) radarSel = null;
            const radars = EMO_ITEMS.filter(i => i.kind === "radar" && M.bagN(pid, i.id) > 0).map(i => emoItem(i.id));
            const R = radarSel ? emoItem(radarSel) : null;
            const busyOut = left <= 0 || turn.remaining <= 0;
            // 📡 the radar slot: put a radar in → Scan (instead of Find)
            const radarBox = h("div.emo-radar",
                h("button.emo-radar-slot" + (R ? ".on" : ""), { title: R ? "눌러서 레이더 빼기" : "아래에서 레이더를 골라 넣으세요", onclick: () => { radarSel = null; draw(); } },
                    R ? itemIcon(R, 46) : h("span.emo-radar-empty", "📡"), h("small", R ? R.name : "레이더 칸")),
                h("div.emo-radar-info",
                    h("b", "📡 Monster Radar"),
                    R ? h("small", R.boost >= 100 ? "Scan하면 이모몬스터 1마리가 무조건 등장합니다!" : `Scan 출현 확률 ${cfg.chance}% → ${Math.min(100, cfg.chance + R.boost)}% (+${R.boost}%)`)
                        : h("small.muted", radars.length ? "보유한 레이더를 눌러 칸에 넣으면 Scan을 쓸 수 있습니다" : "레이더가 없습니다 (🛒 Monster Shop에서 판매)"),
                    radars.length ? h("div.emo-radar-own", radars.map(it => h("button.emo-radar-pick" + (it.id === radarSel ? ".on" : ""), { title: it.note, onclick: () => { radarSel = it.id === radarSel ? null : it.id; draw(); } }, itemIcon(it, 24), h("small", `${it.name} ×${M.bagN(pid, it.id)}`)))) : null),
                h("button.btn.big.emo-scan-btn" + (R ? ".gold" : ".ghost"), { disabled: !R || busyOut, onclick: doScan }, "📡 Scan!"));
            put(wrap, head(), poolRow(),
                h("div.emo-cap-find",
                    h("button.btn.gold.huge.emo-find-btn", { disabled: busyOut, onclick: doFind }, left > 0 ? "🔍 Find!" : "이번 라운드 Capture를 모두 썼습니다 (다음 라운드에 3회 충전)"),
                    h("small.muted", "몬스터 · EmoMon Battler · 골드 · 아이템이 나올 수 있습니다")),
                radarBox,
                stage, h("p.muted.small", "🛒 볼 · 약 · 무기 · 특성 · 레이더는 🛒 Monster Shop 코너가 있는 맵에서 살 수 있습니다."));
        };
        let radarSel = null;
        // 📡 Scan: the radar sweeps, then a monster shows up — or the radar fails (nothing else)
        async function doScan(e) {
            const R = emoItem(radarSel);
            if (!R || M.bagN(pid, R.id) <= 0) return;
            if (!(await confirmBox(`${R.name}을(를) 사용해 Scan할까요?\n레이더 1개와 이번 라운드 Capture 1회를 사용합니다.`, "📡 Scan", "취소"))) return;
            const done = Activity.hold();
            wrap.querySelectorAll(".emo-cap-find button, .emo-radar button").forEach(b => b.disabled = true);
            const blips = Array.from({ length: 6 }, (_, i) => h("i.emo-scan-blip", { style: { "--x": (15 + Math.random() * 70) + "%", "--y": (15 + Math.random() * 70) + "%", "--d": (0.3 + i * 0.35) + "s" } }));
            put(stage, h("div.emo-scan", h("div.emo-scan-screen", h("div.emo-scan-ring.r1"), h("div.emo-scan-ring.r2"), h("div.emo-scan-ring.r3"), h("div.emo-scan-sweep"), ...blips), h("b.emo-scan-txt", `📡 ${R.name} 스캔 중…`)));
            for (let i = 0; i < 6; i++) { Sound.tick(); await sleep(420); }
            const r = M.find(pid, loc.id, { radar: R.id });
            radarSel = null;
            done();
            if (!r || r.kind === "noradar") { draw(); return; }
            onChange();
            if (r.kind === "monster") {
                Sound.bonus();
                toast(`📡 '${R.name}'를 통해서 이모몬스터가 출현했습니다!`, "ok", 3500);
                return encounter(r.mon, h("p.emo-radar-ok", `📡 '${R.name}'를 통해서 이모몬스터가 출현했습니다!`));
            }
            draw();
            Sound.miss();
            put(stage, h("div.emo-found.emo-radar-fail", itemIcon(R, 56), h("b", `${R.name}에 실패했습니다.`)));
        }
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
        function encounter(wild, lead = null) {
            draw();
            const s = species(wild.sid);
            const msg = h("p.emo-enc-msg", `야생의 ${s.name}이(가) 나타났다!`);
            const box = h("div.emo-enc", lead, h("div.emo-enc-mon", monPic(s, 150, { anim: true })),
                h("div.emo-enc-info", h("h3", s.name, " ", stars(s.rarity)), h("div", ...typesOfSpecies(s).map(typeChip)), h("small.muted", `성격: ${wild.nature}`), msg, h("div.emo-balls"), h("div.row")));
            put(stage, box);
            Sound.boom();
            const balls = () => {
                const own = EMO_ITEMS.filter(b => b.kind === "ball" && M.bagN(pid, b.id) > 0);
                const full = M.mons(pid).length >= EMO.MAX_MONS;
                put(box.querySelector(".emo-balls"), ...(own.length ? own.map(b => h("button.emo-ball", { onclick: () => throwIt(b) }, itemIcon(b, 30), h("b", b.name), h("small", `×${M.bagN(pid, b.id)} · ${M.catchChance(wild.sid, b.id, wild)}%`))) : [h("p.notice.warn.small", "볼이 없습니다! 🛒 Monster Shop 코너가 있는 맵에서 볼을 사세요.")]),
                    full ? h("p.notice.warn.small", `몬스터가 이미 ${EMO.MAX_MONS}마리입니다 — 잡으면 몬스터 Release 권으로 1마리를 놓아 주어야 데려올 수 있습니다.`) : null);
                put(box.querySelector(".row"), h("button.btn.ghost", { onclick: () => { toast("🏃 도망쳤습니다", "info"); if (onLeave) onLeave(); else draw(); } }, "🏃 도망가기"));
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
                if (Math.random() < 0.3) { msg.textContent = `💨 ${s.name}이(가) 도망쳤다…`; put(box.querySelector(".emo-balls"), ); put(box.querySelector(".row"), h("button.btn.gold", { onclick: () => { put(stage); draw(); } }, "확인")); return; }
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
                        M.bagN(pid, "EMO_MON_DEL") <= 0 ? h("p.notice.warn.small", `몬스터 Release 권이 없습니다 (🛒 Monster Shop ${EMO.RELEASE_PTS}P)`) : null,
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
            G.noteBattler(pid, !!r.won);
            if (r.won) {
                const rw = M.battlerReward(pid);
                Store.saveSeason(true);
                Sound.cash(); confetti(50, ["🏆", "🪙", "✨"]);
                G.log(`⚔ ${pname(pid)} EmoMon Battler 승리 (${rw.gold ? fmt(rw.gold) + "G" : rw.pts + "P"})`);
                onChange();
                const ps2 = G.S().ps[pid];
                const pm = modal(h("div.emo-reward",
                    h("div.emo-reward-ico", "🏆"),
                    h("h3", `${foe.trainer}에게 승리!`),
                    h("div.emo-reward-amt", rw.gold ? `+${fmt(rw.gold)} G` : `+${rw.pts} P`),
                    h("p.muted", `배틀 승리 보상을 받았습니다 · 지금 보유 ${fmt(ps2.money)} G · ${ps2.points} P`),
                    h("div.row.center", h("button.btn.gold.big", { onclick: () => pm.close() }, "확인"))), { title: "⚔ 배틀 승리 보상", cls: "emo-modal" });
                await pm.closed;
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
export function labView(pid, { loc = null, onChange = () => { } } = {}) {
    return lazy(() => {
        const ps = G.S().ps[pid];
        const wrap = h("div.emo-lab");
        let tab = "evo", expMon = null;
        const draw = () => {
            const tabs = [["evo", "✨ 진화"], ["mix", "⚗️ 조합"], ["exp", "🔬 실험실"], ["shop", "🛒 LAB 상점"]];
            put(wrap, h("div.emo-lab-head", h("div.big", "🧪"), h("div", h("h3", "Monster Lab"), h("p.muted.small", `진화 아이템으로 몬스터를 진화시키고 (진화 비용 ${EMO.EVOLVE_PTS}P), 재료를 섞어 Breaker를 만들고, 🔬 실험실에서 몬스터를 바꿉니다`))),
                h("div.bk-tabs", tabs.map(([k, l]) => h("button.bk-tab" + (k === tab ? ".on" : ""), { onclick: () => { tab = k; draw(); } }, l))),
                tab === "evo" ? evoTab() : tab === "mix" ? mixTab() : tab === "exp" ? expTab() : shopTab());
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
                        evoNeeds(o),
                        o.special ? h("div", h("span.emo-special", "🔬 특수 진화"), h("small.muted", " 실험실에서만 진화합니다")) : h("button.btn.gold", { disabled: !o.ok, onclick: () => doEvolve(m, o) }, "✨ 진화!")))) : h("p.muted.small", M.evolvedMon(m) && !opts.length ? "최종 진화형입니다" : "진화하지 않는 몬스터입니다"));
            }));
        }
        // what an evolution needs, each ✅ / ❌
        const evoNeeds = o => h("div.emo-needs", ...o.need.map(need), ...o.missing.map(id => h("span.emo-need.bad", `❌ ${id} (게임에 없는 아이템)`)),
            o.gold ? h("span.emo-need" + (ps.money >= o.gold ? ".ok" : ""), `💰 ${fmt(o.gold)}G`) : null,
            h("span.emo-need" + (ps.points >= o.pts ? ".ok" : ""), `💎 ${o.pts}P`),
            o.e.required_weapon_id ? h("span.emo-need" + (o.wNeed ? ".ok" : ""), `⚔ ${cat().weapon[o.e.required_weapon_id]?.name || "무기"} 필요`) : null,
            h("small", `성공 ${o.chance}%`));
        async function doEvolve(m, o) {
            if (!(await confirmBox(`${M.sp(m).name}을(를) ${o.special ? "특수 " : ""}진화시킬까요?\n진화 아이템과 ${o.pts}P${o.gold ? `, ${fmt(o.gold)}G` : ""}가 사용됩니다 (성공 ${o.chance}%).`, "진화", "취소"))) return;
            const done = Activity.hold();
            const fx = h("div.emo-evo-fx", monPic(M.sp(m), 140, { anim: true }));
            const mm = modal(h("div.center", fx, h("p", "✨ 진화 중…")), { title: "🧪 Monster Lab", closable: false, cls: "emo-modal" });
            Sound.tease(); fx.classList.add("glow"); await sleep(1800);
            const r = M.evolve(pid, m.uid, o.e.id, { special: o.special });
            mm.close(); done();
            if (!r.ok) return toast(r.why, "warn");
            if (r.failed) { Sound.lose(); toast("💥 진화 실패… 재료는 사라졌습니다", "warn", 3500); }
            else { Sound.fanfare(); confetti(80); modal(h("div.center", monPic(r.to, 160, { anim: true }), h("h3", `${r.from.name} → ${r.to.name}!`), h("div", ...typesOfSpecies(r.to).map(typeChip))), { title: "✨ 진화 성공!", cls: "emo-modal" }); }
            onChange(); draw();
        }
        function mixTab() {
            const recipes = labRecipes();
            if (!recipes.length) return h("p.muted", "조합법이 없습니다");
            return h("div", h("p.muted.small", "속성 · 무기 · 특성 · Nature Breaker와 Banana Smoothie는 상점에서 팔지 않고 여기 조합으로만 얻습니다. 재료는 🛒 LAB 상점에서 삽니다."),
                h("div.emo-list", ...recipes.map(r => {
                    const out = emoItem(r.result_item_id);
                    return h("div.emo-row.mix", itemIcon(out, 34), h("div", h("b", out?.name || r.name), out?.note ? h("div.small.muted", out.note) : null,
                        h("div.emo-needs", ...(r.ingredients || []).map(x => h("span.emo-need" + (M.bagN(pid, x.id) >= (x.qty || 1) ? ".ok" : ""), itemIcon(emoItem(x.id), 18), ` ${emoItem(x.id)?.name || x.id} ${M.bagN(pid, x.id)}/${x.qty || 1}`)),
                            r.gold ? h("span.emo-need" + (ps.money >= r.gold ? ".ok" : ""), `💰 ${fmt(r.gold)}G`) : null,
                            r.pts ? h("span.emo-need" + (ps.points >= r.pts ? ".ok" : ""), `💎 ${fmt(r.pts)}P`) : null)),
                        h("button.btn.gold", { disabled: !M.canMix(pid, r), onclick: async () => {
                            if (!(await confirmBox(`${out?.name || r.name}을(를) 조합할까요?\n재료와 ${priceLabel({ gold: r.gold, pts: r.pts })}이(가) 사용됩니다.`, "조합", "취소"))) return;
                            const x = M.mix(pid, r); if (!x.ok) return toast(x.why, "warn"); Sound.bonus(); toast(`⚗️ ${out?.name || r.name} 완성!`, "ok"); onChange(); draw();
                        } }, "⚗️ 조합"));
                })));
        }
        // ---------------- 🔬 실험실: nature · weapon · type · trait · special evolution
        function expTab() {
            const list = M.mons(pid);
            if (!list.length) return h("p.muted", "몬스터가 없습니다");
            const m = list.find(x => x.uid === expMon) || list[0];
            expMon = m.uid;
            const s = M.sp(m);
            const X = EMO.EXP;
            const cost = k => h("div.emo-needs", X[k].item ? need(X[k].item) : null,
                X[k].gold ? h("span.emo-need" + (ps.money >= X[k].gold ? ".ok" : ""), `💰 ${fmt(X[k].gold)}G`) : null,
                X[k].pts ? h("span.emo-need" + (ps.points >= X[k].pts ? ".ok" : ""), `💎 ${fmt(X[k].pts)}P`) : null);
            const ready = k => M.expCheck(pid, k).ok;
            const done = (r, msg) => { if (!r.ok) { toast(r.why, "warn", 3500); return false; } Sound.fanfare(); confetti(40); toast(msg, "ok", 3500); onChange(); draw(); return true; };
            // nature
            const natureCard = h("div.emo-exp", h("h4", "🎭 성격 바꾸기"), h("p.small.muted", `지금 성격: ${natureTxt(m.nature)} → 다른 성격 하나로 랜덤 변경`), cost("nature"),
                h("button.btn.gold", { disabled: !ready("nature"), onclick: async () => {
                    if (!(await confirmBox(`${s.name}의 성격을 랜덤으로 바꿀까요?\nNature Breaker 1개와 ${fmt(X.nature.gold)}G가 사용됩니다.`, "바꾸기", "취소"))) return;
                    const r = M.changeNature(pid, m.uid); done(r, r.ok ? `🎭 성격 변경: ${r.from} → ${r.to}` : "");
                } }, "🎭 성격 바꾸기"));
            // weapon: owned weapons this monster can't learn
            const wOpts = Object.entries(M.emo(pid).wbag).filter(([, n]) => n > 0).map(([id]) => cat().weapon[id]).filter(w => w && !M.canLearn(m, w) && !m.weapons.includes(w.id));
            const wSel = h("select", wOpts.length ? wOpts.map(w => h("option", { value: w.id }, `${w.name} (${w.attribute})`)) : h("option", { value: "" }, "가방에 못 배우는 무기가 없습니다"));
            const weaponCard = h("div.emo-exp", h("h4", "⚔ 못 배우는 무기 가르치기"), h("p.small.muted", `가방(🛒 Monster Shop에서 산 무기) 속 무기 중 ${s.name}이(가) 원래 못 배우는 무기를 가르칩니다 (무기 ${m.weapons.length}/${EMO.MAX_WEAPONS})`), wSel, cost("weapon"),
                h("button.btn.gold", { disabled: !wOpts.length || !ready("weapon") || m.weapons.length >= EMO.MAX_WEAPONS, onclick: async () => {
                    const w = cat().weapon[wSel.value]; if (!w) return;
                    if (!(await confirmBox(`${s.name}에게 ${w.name}을(를) 가르칠까요?\n무기 Breaker 1개와 ${fmt(X.weapon.gold)}G가 사용됩니다.`, "가르치기", "취소"))) return;
                    done(M.learnWeapon(pid, m.uid, w.id, { breaker: true }), `⚔ ${w.name} 습득!`);
                } }, "⚔ 가르치기"));
            // type: change one / add one
            const cur = M.typesOf(m);
            const tNew = h("select", E.types.filter(t => !cur.includes(t)).map(t => h("option", { value: t }, t)));
            const tFrom = h("select", cur.map(t => h("option", { value: t }, t)));
            const typeAct = async (add) => {
                const txt = add ? `${tNew.value} 속성을 추가` : `${tFrom.value} → ${tNew.value}(으)로 변경`;
                if (!(await confirmBox(`${s.name}: ${txt}할까요?\n속성 Breaker 1개와 ${fmt(X.type.gold)}G가 사용됩니다.`, "진행", "취소"))) return;
                done(M.changeTypes(pid, m.uid, add ? { add: tNew.value } : { from: tFrom.value, to: tNew.value }), `🔷 속성: ${add ? "추가" : "변경"} 완료!`);
            };
            const typeCard = h("div.emo-exp", h("h4", "🔷 속성 바꾸기 / 배우기"), h("div", h("small.muted", "지금 속성: "), ...cur.map(typeChip), h("small.muted", ` (최대 ${EMO.MAX_TYPES}개)`)),
                h("div.row", h("span.small", "새 속성"), tNew), cost("type"),
                h("div.row", h("button.btn.gold", { disabled: !ready("type") || cur.length >= EMO.MAX_TYPES, onclick: () => typeAct(true) }, "➕ 속성 배우기"),
                    tFrom, h("button.btn.gold", { disabled: !ready("type"), onclick: () => typeAct(false) }, "🔁 이 속성을 바꾸기")));
            // trait: learn (any trait from the bag) / change one
            const tOpts = Object.entries(M.emo(pid).tbag).filter(([, n]) => n > 0).map(([id]) => cat().trait[id]).filter(t => t && !m.traits.includes(t.id));
            const trSel = h("select", tOpts.length ? tOpts.map(t => h("option", { value: t.id }, `${t.name} ${EMO.STARS(t.rarity)}`)) : h("option", { value: "" }, "가방에 특성이 없습니다"));
            const trOld = h("select", M.traitRows(m).map(t => h("option", { value: t.id }, t.name)));
            const traitAct = async (replace) => {
                const t = cat().trait[trSel.value]; if (!t) return;
                if (!(await confirmBox(`${s.name}: ${replace ? `${cat().trait[trOld.value]?.name} → ${t.name}(으)로 바꾸기` : `${t.name} 배우기`}\n특성 Breaker 1개와 ${fmt(X.trait.pts)}P가 사용됩니다.`, "진행", "취소"))) return;
                done(M.learnTrait(pid, m.uid, t.id, { replace: replace ? cat().trait[trOld.value]?.id : null, exp: true }), `🧬 ${t.name} 특성 습득!`);
            };
            const traitCard = h("div.emo-exp", h("h4", "🧬 특성 바꾸기 / 배우기"), h("p.small.muted", `지금 특성: ${M.traitRows(m).map(t => t.name).join(", ") || "없음"} (${m.traits.length}/${EMO.MAX_TRAITS}) · 못 배우는 특성도 가능`), trSel, cost("trait"),
                h("div.row", h("button.btn.gold", { disabled: !tOpts.length || !ready("trait") || m.traits.length >= EMO.MAX_TRAITS, onclick: () => traitAct(false) }, "➕ 특성 배우기"),
                    m.traits.length ? [trOld, h("button.btn.gold", { disabled: !tOpts.length || !ready("trait"), onclick: () => traitAct(true) }, "🔁 이 특성을 바꾸기")] : null));
            // special evolution
            const sp = M.evoOptions(pid, m).filter(o => o.special), dex = M.dexOf(pid);
            const specialCard = h("div.emo-exp", h("h4", "🌟 몬스터 특수 진화"), h("p.small.muted", `특수한 몬스터는 이 코너에서만 진화합니다 (${fmt(X.special.pts)}P + 진화 조건)`),
                sp.length ? sp.map(o => h("div.emo-evo-opt", h("span.emo-arrow", "→"), dex[o.to.id] ? monPic(o.to, 48) : h("div.emo-q", "??"), h("b", dex[o.to.id] ? o.to.name : "??"), evoNeeds(o),
                    h("button.btn.gold", { disabled: !o.ok, onclick: () => doEvolve(m, o) }, "🌟 특수 진화!"))) : h("small.muted", `${s.name}은(는) 특수 진화가 없습니다`));
            return h("div",
                h("p.muted.small", "🔬 실험실: 각 실험에는 ⚗️ 조합으로 만든 Breaker가 필요합니다. 실험할 몬스터를 고르세요."),
                h("div.emo-exp-mons", ...list.map(x => h("button.emo-exp-mon" + (x.uid === m.uid ? ".on" : ""), { onclick: () => { expMon = x.uid; draw(); } }, monPic(M.sp(x), 36), h("b", M.sp(x).name)))),
                h("div.emo-exp-grid", natureCard, weaponCard, typeCard, traitCard, specialCard));
        }
        // ---------------- 🛒 LAB 상점: this map's own stock, 3 purchases per season (all Labs together)
        function shopTab() {
            const st = labStock(loc?.id);
            const goods = st.items.map(emoItem).filter(Boolean);
            const left = M.labBuysLeft(pid);
            const priceOf = it => stockPrice(loc?.id, "lab", "i:" + it.id, { gold: it.gold || 0, pts: it.pts || 0 });
            const group = (title, list) => list.length ? [h("h4", title), h("div.emo-buy-grid", ...list.map(it => buyLine(ps, it, priceOf(it),
                () => buyFlow(pid, it.name, priceOf(it), "lab", () => M.giveItem(pid, it.id)).then(ok => { if (ok) { onChange(); draw(); } }), left <= 0, M.bagN(pid, it.id))))] : [];
            if (!goods.length) return h("p.muted", "이 Lab의 상점은 지금 파는 물건이 없습니다.");
            return h("div",
                h("div.row", h("span.emo-limit" + (left <= 0 ? ".out" : ""), `이번 시즌 남은 구매 ${left} / ${EMO.LAB_BUYS}회`), h("small.muted", " (모든 Lab 상점 합산 · Breaker와 Banana Smoothie는 ⚗️ 조합으로만)")),
                ...group("🔮 Orb (진화)", goods.filter(i => i.kind === "evo" && i.orb)),
                ...group("✨ 기타 진화 아이템", goods.filter(i => i.kind === "evo" && !i.orb)),
                ...group("🧱 재료", goods.filter(i => i.kind === "material")),
                ...group("🎒 기타", goods.filter(i => !["evo", "material"].includes(i.kind))));
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
            const st = shopStock(loc.id), left = M.shopBuysLeft(pid), out = left <= 0;
            const buy = (name, price, give) => buyFlow(pid, name, price, "shop", give).then(ok => { if (ok) { onChange(); draw(); } });
            // this shop's own price if the admin set one, else the admin's global price
            const group = (title, list) => list.length ? [h("h4", title), h("div.emo-buy-grid", ...list.map(it => { const price = stockPrice(loc.id, "shop", "i:" + it.id, { gold: it.gold || 0, pts: it.pts || 0 });
                return buyLine(ps, it, price, () => buy(it.name, price, () => M.giveItem(pid, it.id)), out, M.bagN(pid, it.id)); }))] : [];
            const ws = st.weapons.map(id => cat().weapon[String(id)]).filter(Boolean);
            const ts = st.traits.map(id => cat().trait[String(id)]).filter(Boolean);
            const gen = st.items.map(emoItem).filter(Boolean);
            const weaponPriceHere = w => stockPrice(loc.id, "shop", "w:" + w.id, weaponPrice(w));
            const traitPriceHere = t => stockPrice(loc.id, "shop", "t:" + t.id, traitPrice(t));
            put(wrap,
                h("div.emo-lab-head", h("div.big", "🛒"), h("div", h("h3", `Monster Shop · ${loc.name}`), h("p.muted.small", "볼 · 회복약 · Release 권과 이 상점만의 속성 볼 · 몬스터 무기 · 특성을 팝니다. 상점마다 파는 물건이 다릅니다."))),
                h("div.row", h("span.emo-limit" + (out ? ".out" : ""), `이번 시즌 남은 구매 ${left} / ${EMO.SHOP_BUYS}회`), h("small.muted", " (모든 Monster Shop 합산)")),
                group("⚪ 볼", gen.filter(i => i.kind === "ball" && !i.attr)),
                group("🔷 이 상점의 속성 볼 (해당 속성 몬스터 포획 45%)", [...st.balls.map(emoItem), ...gen.filter(i => i.attr)].filter(Boolean)),
                group("🧪 회복 · 치료", gen.filter(i => ["potion", "pp", "cure"].includes(i.kind))),
                group("🎫 티켓", gen.filter(i => i.kind === "delete")),
                group("📡 몬스터 레이더 (Capture에서 Scan)", gen.filter(i => i.kind === "radar")),
                group("✨ 기타", gen.filter(i => !["ball", "potion", "pp", "cure", "delete", "radar"].includes(i.kind))),
                ws.length || ts.length ? h("h4", "⚔ 몬스터 무기 · 🧬 특성") : null,
                h("div.emo-buy-grid",
                    ...ws.map(w => { const price = weaponPriceHere(w); return h("button.emo-buy", { disabled: out || !canPay(ps, price), onclick: () => buy(`⚔ ${w.name}`, price, () => M.giveWeapon(pid, w.id)) },
                        typeChip(w.attribute), h("div", ...weaponLine(w), " ", stars(w.rarity), haveTag(M.emo(pid).wbag?.[w.id])), h("span.emo-price", priceLabel(price))); }),
                    ...ts.map(t => { const price = traitPriceHere(t); return h("button.emo-buy", { disabled: out || !canPay(ps, price), onclick: () => buy(`🧬 ${t.name}`, price, () => M.giveTrait(pid, t.id)) },
                        h("span.big", "🧬"), h("div", h("b", t.name, " "), stars(t.rarity), h("small", E.traits.describe(t) || ""), haveTag(M.emo(pid).tbag?.[t.id])), h("span.emo-price", priceLabel(price))); })),
                h("p.muted.small", "산 무기 · 특성은 오른쪽 🐾 내 EmoMon에서 몬스터를 눌러 배웁니다. 못 배우는 무기 · 특성은 🧪 Monster Lab의 🔬 실험실에서 가르칠 수 있습니다."));
        };
        draw();
        return wrap;
    });
}
