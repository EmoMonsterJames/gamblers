// =====================================================================
// Season screen — drives the whole show:
// select (20 players via profile slot) → mission roulette → turns
// (map roulette → casino with 10-min timer) → judging → elimination
// reel → … → final battle → champion → hall of fame.
// =====================================================================
import { h, sleep, fmt, fmtTime, pick, shuffle } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, banner, confirmBox, modal, bigWin } from "../core/fx.js";
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { TIERS, MISSIONS, ITEM_BY_ID, LOCATIONS, LOC_BY_ID, SHOPS, LOANS, REGION_BY_ID, earnKinds, ALPHABET } from "../data/catalog.js";
import { sandboxTools, exitSandbox } from "../game/sandbox.js";
// alphabet card (G·A·M·B·L·E·R·S) chance per slot spin: 0.04% at the top bet down to 0.01% at the lowest
const CARD_RATE = (bet, bets) => { const l = [...new Set(bets || [bet])].sort((a, b) => a - b); const i = Math.max(0, l.findIndex(b => b >= bet)); return 0.0001 + 0.0003 * (l.length > 1 ? i / (l.length - 1) : 0); };
const CASINO_CARD_RATE = 0.01; // per casino play
import { CASINO_BY_ID } from "../data/casino.js";
import { SLOT_BY_ID } from "../slots/configs.js";
import * as G from "../game/season.js";
import { avatar, playerCard, miniPlayer, displayName, petView, weaponChip } from "../ui/profile.js";
import { reelMachine } from "../ui/reelpick.js";
import { worldMap, regionMap } from "../ui/map.js";
import { openCasino } from "./casino.js";
import { openSlot } from "./slot.js";
import { shopView, inventoryView } from "./shop.js";
import { spellingView } from "./spelling.js";
import { locationShops } from "../data/catalogAdmin.js";
import { earnView, begView, jobView, npcAttack, scheduleNpc, npcInfo } from "./corners.js";
import { battleView } from "./battle.js";

let root = null, timer = null;

export function seasonScreen() {
    root = h("div.season");
    render();
    return root;
}

function render() {
    clearInterval(timer);
    const s = G.S();
    if (!s) { root.replaceChildren(noSeason()); return; }
    const stage = {
        select: selectStage, mission: missionStage, turns: turnsStage, judge: judgeStage, battle: battleMissionStage,
        eliminated: eliminatedStage, final: finalStage, done: doneStage
    }[s.status] || (() => h("div", "?"));
    root.replaceChildren(...(s.sandbox ? [sandboxBar(s)] : []), header(s), h("div.season-body", h("div.stage", stage(s)), sidebar(s)));
}

// test mode (admin map simulation): helpers + a way out
function sandboxBar(s) {
    const tool = (label, fn) => h("button.btn.small.ghost", { onclick: () => { fn(); Sound.coin(); render(); } }, label);
    const playable = MISSIONS.filter(m => m.type !== "battle" && m.type !== "rank");
    const sel = h("select", { onchange: e => { const t = s.turn; G.setMission(MISSIONS.find(m => m.id === e.target.value)); s.turn = t; render(); } },
        [0, 1, 2, 3, 4].map(tr => h("optgroup", { label: `난이도 ${TIERS[tr]}` }, playable.filter(m => m.tier === tr).map(m => h("option", { value: m.id, selected: s.mission?.id === m.id }, m.text)))));
    return h("div.sandbox-bar",
        h("b", "🧪 테스트 모드"), h("small", "아무것도 저장되지 않습니다"),
        tool("💰 +100만G", () => sandboxTools.gold()), tool("💎 +100P", () => sandboxTools.points()), tool("❤️ HP 회복", () => sandboxTools.heal()),
        tool("⏱️ +10분", () => sandboxTools.time()), tool("👹 이번 라운드 모든 맵 NPC", () => sandboxTools.npcEverywhere()),
        h("label", "미션 ", sel),
        h("button.btn.small.red", { onclick: exitSandbox }, "테스트 종료"));
}
export function rerender() { if (root && document.body.contains(root)) render(); }

function noSeason() {
    return h("div.center-card",
        h("div.logo-big", "GAMBLERS"),
        h("p", "진행 중인 시즌이 없습니다."),
        h("button.btn.gold.big", { onclick: () => { G.newSeason(); render(); } }, `🎰 시즌 ${(Store.seasonCount || 0) + 1} 시작`));
}

function header(s) {
    const tier = s.mission ? s.mission.tier : (s.status === "mission" ? G.tierForRound() : null);
    return h("div.season-head",
        h("div.sh-left", h("b", `SEASON ${s.number}`), s.round ? h("span", `ROUND ${s.round}`) : null,
            tier != null ? h("span.tier.t" + tier, `난이도 ${TIERS[tier]}`) : null),
        s.mission ? h("div.sh-mission", "📜 ", s.mission.text) : h("div.sh-mission.muted", { select: "참가자 선발 중", final: "최종 결승전", done: "시즌 종료" }[s.status] || ""),
        h("div.sh-right", h("span", `생존 ${G.alive().length}/${s.roster.length || CONFIG.SEASON_SIZE}`),
            h("button.btn.ghost.small", { onclick: showLog }, "📋 로그")));
}
function showLog() {
    const s = G.S();
    modal(h("div.log", s.log.map(l => h("div", h("small", new Date(l.t).toLocaleTimeString()), " ", l.msg))), { title: "시즌 로그" });
}

function sidebar(s) {
    const list = s.roster.length ? [...s.roster].sort((a, b) => (s.ps[a].out - s.ps[b].out) || (s.ps[b].money - s.ps[a].money)) : [];
    return h("aside.roster",
        h("div.roster-title", `참가자 ${s.roster.length}명`),
        h("div.roster-list", list.map(pid => {
            const r = s.results[pid];
            const mark = s.status === "turns" || s.status === "judge" ? (r ? (r.pass ? "✅" : "❌") : (s.turn?.pid === pid ? "🎮" : "")) : "";
            const cand = s.status === "judge" && s.candidates.includes(pid);
            const el = miniPlayer(pid, s.ps[pid], [h("span.rno", `#${G.rosterNo(pid)}`), h("span.hp" + (s.ps[pid].hp < 50 ? ".low" : ""), `❤ ${s.ps[pid].hp}`), h("span.mark", mark)]);
            if (cand) el.classList.add("cand");
            el.onclick = () => modal(playerCard(pid, s.ps[pid]), { title: displayName(Store.player(pid)), wide: true });
            return el;
        })));
}

// ------------------------------------------------------------------ select
function selectStage(s) {
    const machine = reelMachine({ size: 130, label: "PLAYER SELECT" });
    const pool = G.selectionPool();
    machine.idle(pool);
    const grid = h("div.roster-grid", Array.from({ length: CONFIG.SEASON_SIZE }, (_, i) => {
        const pid = s.roster[i];
        return h("div.rslot" + (pid != null ? ".filled" : ""), pid != null ? [avatar(pid, 64, { effect: false }), h("small", displayName(Store.player(pid)))] : h("span", i + 1));
    }));
    let spinning = false;
    const spinBtn = h("button.btn.gold.huge", { onclick: async () => {
        if (spinning || G.rosterFull()) return;
        spinning = true; spinBtn.disabled = skipBtn.disabled = true;
        const p = G.pickForSelection(G.selectionPool());
        await machine.spin(p.id, G.selectionPool(), { tense: true });
        G.addToRoster(p.id);
        await reveal(p.id);
        spinning = false;
        render();
    } }, "🎰 SPIN");
    const skipBtn = h("button.btn.ghost.big", { onclick: async () => {
        if (spinning) return;
        const left = CONFIG.SEASON_SIZE - s.roster.length;
        for (const p of G.pickManyForSelection(G.selectionPool(), left)) G.addToRoster(p.id);
        Sound.bonus(); confetti(60);
        render();
    } }, "⏭ SKIP (나머지 즉시 선발)");
    const full = G.rosterFull();
    return h("div.select-stage",
        h("h2.stage-title", "🎰 시즌 참가자 선발 🎰", h("small", `${s.roster.length} / ${CONFIG.SEASON_SIZE}`)),
        G.prevSeasonPlayers().size ? h("p.muted.center", `지난 시즌 참가자는 다시 뽑힐 확률이 ${Math.round(G.REPICK_WEIGHT * 100)}%로 낮아집니다 (연속 출전 방지)`) : null,
        machine.el,
        full ? h("div.row.center", h("button.btn.gold.huge", { onclick: () => { G.startRound(); render(); } }, "▶ 라운드 1 시작")) : h("div.row.center", spinBtn, skipBtn),
        grid);
}
async function reveal(pid) {
    const card = h("div.reveal", h("div.reveal-rays"), avatar(pid, 180), h("div.reveal-name", displayName(Store.player(pid))), h("div.reveal-sub", Store.player(pid).player_name));
    document.body.append(card);
    Sound.fanfare(); confetti(50);
    await Promise.race([sleep(1800), new Promise(r => card.onclick = r)]);
    card.classList.add("out"); await sleep(300); card.remove();
}

// ------------------------------------------------------------------ mission roulette
function missionStage(s) {
    const tier = G.tierForRound();
    const ms = G.missionDeck(tier);
    const cards = ms.map(m => h("div.mcard", { "data-id": m.id }, h("div.mc-ico", { bonus: "🎁", slot_net: "🎰", casino_net: "🃏", points: "💎", jackpot: "💰", battle: "⚔️", combo: "🎰🃏", five: "5️⃣", freespin: "🆓", slot_wins: "🏆", beg_max: "🥺", job_min: "💼", card: "🔤", has: "🐾", rank: "📉", bonus_in: "⏱️", brand_win: "🏷️", job_done: "💼", bet_win: "💵", home_map: "🏠", region_map: "🧭", npc_hit: "👼", earn_min: "💪", spell: "🐝" }[m.type] || "📜"), h("div.mc-text", m.text)));
    let done = false;
    const btn = h("button.btn.gold.huge", { onclick: async () => {
        if (done) return; done = true; btn.disabled = true;
        const target = pick(ms);
        let gap = 60, i = 0;
        const total = 22 + Math.floor(Math.random() * ms.length) + 4;
        for (let k = 0; k < total; k++) {
            cards.forEach(c => c.classList.remove("hot"));
            const idx = k === total - 1 ? ms.indexOf(target) : (i++ % ms.length);
            cards[idx].classList.add("hot");
            Sound.tick();
            await sleep(gap);
            gap *= k > total - 8 ? 1.3 : 1.05;
        }
        cards[ms.indexOf(target)].classList.add("chosen");
        Sound.fanfare();
        await banner(`📜 미션: ${target.text}`, 2200, "mission");
        G.setMission(target);
        render();
    } }, "📜 미션 뽑기");
    return h("div.mission-stage",
        s.loanDeaths?.length ? h("div.loan-deaths", h("b", "☠️ 대출 미상환 사망"), s.loanDeaths.map(pid => h("div.cand-card", avatar(pid, 70, { effect: false }), h("small", displayName(Store.player(pid)))))) : null,
        h("h2.stage-title", `ROUND ${s.round} 미션 추첨`, h("small.tier.t" + tier, `난이도 ${TIERS[tier]}`)),
        h("div.mcards", cards), h("div.row.center", btn),
        h("p.muted.center", "모든 생존자가 10분씩 플레이하며 같은 미션에 도전합니다. 미션 실패자 중 한 명이 탈락!"));
}

// ------------------------------------------------------------------ turns
function turnsStage(s) {
    const strip = h("div.turn-strip", s.order.map((pid, i) => {
        const r = s.results[pid];
        return h("div.ts" + (i === s.turnIdx ? ".now" : "") + (r ? (r.pass ? ".pass" : ".fail") : ""), avatar(pid, 44, { effect: false }), h("small", r ? (r.pass ? "성공" : "실패") : i === s.turnIdx ? "차례" : `${i + 1}`));
    }));
    if (!s.turn) return h("div.turns-stage", strip, preTurn(s));
    if (!s.turn.loc) return h("div.turns-stage", strip, mapStage(s));
    return h("div.turns-stage.playing", locationStage(s));
}

function preTurn(s) {
    const pid = G.currentPid();
    const ps = s.ps[pid];
    return h("div.preturn",
        h("h2.stage-title", `${s.turnIdx + 1}번째 플레이어`),
        playerCard(pid, ps),
        h("div.row.center",
            h("button.btn.gold.huge", { onclick: () => { G.startTurn(); render(); } }, "🌍 턴 시작 — 지역 뽑기"),
            h("button.btn.ghost", { onclick: async () => { if (await confirmBox(`${displayName(Store.player(pid))}의 턴을 건너뛸까요? (미션 실패 처리)`)) { G.startTurn(); G.endTurn(); render(); } } }, "턴 건너뛰기")));
}

// Step 1: region roulette (or a map pass straight to a map). Step 2: map roulette inside the region.
function mapStage(s) {
    const pid = s.turn.pid;
    if (!s.turn.region) return regionStage(s);
    const region = REGION_BY_ID[s.turn.region];
    const acc = G.accessibleLocations(pid, region.id);
    const inRegion = LOCATIONS.filter(l => l.region === region.id && !l.off);
    const locked = new Set(inRegion.filter(l => !acc.includes(l)).map(l => l.id));
    const map = worldMap({ locked, region: region.id });
    const tried = new Set(); // maps that refused entry this turn
    let done = false;
    const btn = h("button.btn.gold.huge", { onclick: async () => {
        if (done) return; done = true; btn.disabled = true;
        let pool = acc.filter(l => !tried.has(l.id));
        // 랜덤랜드 / 리치랜드: a refused or unpaid entry goes straight to the region's fallback map
        const fb = region.fallback && LOC_BY_ID[region.fallback] && !LOC_BY_ID[region.fallback].off ? LOC_BY_ID[region.fallback] : null;
        while (pool.length) {
            const target = pick(pool);
            await map.roulette(pool, target.id);
            await banner(`${target.emoji} ${target.name}`, 1400, "loc");
            const ok = await entryCheck(pid, target, pool.length > 1, fb && fb.id !== target.id ? fb : null);
            if (ok) {
                G.setLocation(target.id);
                s.turn.running = true;
                await arrive(s, target);
                render();
                return;
            }
            if (fb && fb.id !== target.id) {
                G.setLocation(fb.id, { teleport: true });
                s.turn.running = true;
                await banner(`${fb.emoji} ${fb.name}`, 1400, "loc");
                await arrive(s, fb);
                render();
                return;
            }
            tried.add(target.id);
            map.el.querySelector(`.pin[data-id="${target.id}"]`)?.classList.add("locked");
            map.el.querySelector(".pin.chosen")?.classList.remove("chosen");
            pool = acc.filter(l => !tried.has(l.id));
        }
        // every map in the region refused: back to the region roulette
        toast("이 지역의 모든 카지노가 입장을 거절했습니다… 지역을 다시 뽑아요", "warn", 3500);
        s.turn.region = null; Store.saveSeason();
        render();
    } }, `🎯 ${region.name} 맵 룰렛`);
    return h("div.map-stage",
        h("div.map-head", avatar(pid, 56), h("div", h("b", displayName(Store.player(pid))), h("div.muted", `${region.emoji} ${region.name} · 입장 가능 ${acc.length}곳`)), btn),
        map.el,
        region.fallback ? h("p.notice.center", region.id === "richland"
            ? `💰 리치랜드: 입장료를 꼭 물어봅니다. 안 내거나 낼 돈·포인트가 부족하면 ${LOC_BY_ID[region.fallback]?.emoji} ${LOC_BY_ID[region.fallback]?.name}(으)로 바로 갑니다.`
            : `🎲 랜덤랜드: 입장을 거절당하면 ${LOC_BY_ID[region.fallback]?.emoji} ${LOC_BY_ID[region.fallback]?.name}(으)로 바로 갑니다.`) : null,
        h("p.muted.center", "회색 핀은 입장 불가 (포인트 부족 / 국적 전용 / 필요한 장비 없음 — 맵권이 있으면 입장) · 💰 입장료 맵은 들어갈 때 차감 · 🎲 랜덤 입장 맵은 거절당하면 다른 맵을 다시 뽑습니다 · 🤿🪽🧑‍🚀 장비 맵은 들어갈 때 장비를 사용합니다"));
}

// ---- passes: does the target map ask for gear / fee / points the player lacks?
function passBlocked(pid, loc) {
    const need = G.passNeeds(pid, loc);
    if (need.ok) return null;
    return need;
}
async function alertBox(title, lines, cls = "") {
    const m = modal(h("div.alert-box" + (cls ? "." + cls.trim().split(/\s+/).join(".") : ""), ...[].concat(lines).map(t => h("p", t)), h("div.row.center", h("button.btn.gold.big", { onclick: () => m.close() }, "확인"))), { title, closable: false });
    await m.closed;
}
function passConfirmText(it, loc, need) {
    const r = loc.req || {};
    return [`${it.name}을(를) 사용해 ${loc.emoji} ${loc.name}(으)로 바로 이동할까요?`,
        need.gear.length ? `• 사용되는 장비: ${need.gear.map(G.gearName).join(" + ")}` : "",
        need.fee ? `• 입장료 ${fmt(need.fee)} G를 냅니다` : "", need.feePts ? `• 입장료 ${need.feePts} P를 냅니다` : "",
        r.random ? "• 랜덤 입장 맵이지만 맵권이 있으면 바로 들어갑니다" : "",
        loc.crazy ? "⚠️ Crazy Casino: 들어가면 플레이 시간 5분이 바로 차감됩니다!" : "", loc.evil ? `⚠️ Evil Town: HP −${loc.evil} (HP ${loc.evil} 이하면 사망)` : "",
        loc.donation ? "⚠️ Donation Casino: 아이템 1개를 기부해야 합니다 (없으면 HP −10)" : ""].filter(Boolean).join("\n");
}
async function tryPass(pid, it) {
    const loc = LOC_BY_ID[it.loc];
    const blocked = passBlocked(pid, loc);
    if (blocked) { Sound.lose(); await alertBox("🎟️ 맵권을 쓸 수 없습니다", [`${loc.emoji} ${loc.name}에 들어갈 조건이 부족합니다.`, ...blocked.missing], "warn"); return false; }
    return confirmBox(passConfirmText(it, loc, G.passNeeds(pid, loc)), "이동하기", "취소");
}

// map rules on arrival. Returns false when the player died (turn over).
async function arrive(s, loc) {
    const pid = s.turn?.pid;
    if (!pid) return false;
    if (loc.crazy) {
        const cut = G.crazyCut();
        if (cut) { Sound.boom(); await alertBox("🤪 CRAZY CASINO 경고!", [`Crazy Casino에 입장하여 플레이 시간 ${Math.round(cut / 60)}분이 바로 차감되었습니다!`, `남은 시간: ${fmtTime(s.turn.remaining)}`, "다른 맵으로 이동해도 남은 플레이 시간은 늘어나지 않습니다. (이 맵에서는 시간 연장권을 팔지 않습니다)"], "warn crazy"); }
    }
    if (loc.evil) {
        const r = G.hpToll(pid, loc.evil, `${loc.emoji} ${loc.name}`);
        Sound.boom();
        await alertBox("😈 EVIL TOWN", r.dead ? [`HP가 ${loc.evil} 이하인 상태로 Evil Town에 들어와… 사망했습니다! ☠️`] : [`Evil Town의 저주! HP −${loc.evil}`, `남은 HP ❤ ${r.hp}`], "warn evil");
        if (r.dead) return false;
    }
    if (loc.donation) {
        const list = G.donatable(pid);
        if (list.length) {
            Sound.bonus();
            await new Promise(res => {
                const m = modal(h("div.donation",
                    h("p", "🎁 Donation Casino에 왔다면 아이템 ", h("b", "1개"), "를 꼭 기부해야 합니다 (무기 · 펫 제외). 기부할 아이템을 고르세요."),
                    h("div.donate-grid", list.map(({ item, n }) => h("button.donate-item", { onclick: () => { G.donate(pid, item.id); m.close(); res(); } },
                        h("span.di-ico", item.emoji || "🎁"), h("b", item.name), h("small", `×${n}`))))), { title: "🎁 기부하세요", closable: false });
            });
            toast("🎁 기부 완료! 따뜻한 마음 감사합니다", "ok");
        } else {
            const r = G.hpToll(pid, 10, `${loc.emoji} ${loc.name}`);
            Sound.boom();
            await alertBox("🎁 기부할 아이템이 없습니다", r.dead ? ["기부할 아이템도 없고 HP도 10 이하… 사망했습니다! ☠️"] : ["기부 대신 HP −10", `남은 HP ❤ ${r.hp}`], "warn");
            if (r.dead) return false;
        }
    }
    return true;
}
function regionStage(s) {
    const pid = s.turn.pid, ps = s.ps[pid];
    const avail = G.availableRegions(pid);
    const rmap = regionMap({ status: r => G.regionStatus(pid, r) });
    const passes = G.passesOf(pid);
    let done = false;
    const btn = h("button.btn.gold.huge", { onclick: async () => {
        if (done || !avail.length) return; done = true; btn.disabled = true;
        const target = pick(avail);
        await rmap.roulette(avail, target.id);
        await banner(`${target.emoji} ${target.name}`, 1500, "loc");
        G.enterRegion(target.id);
        render();
    } }, "🌍 지역 룰렛 돌리기");
    const passRow = passes.length ? h("div.pass-row", h("b", "🎟️ 맵권 사용 → 바로 이동:"), passes.map(it => h("button.btn.small.gold", { onclick: async () => {
        const loc = LOC_BY_ID[it.loc];
        if (!(await tryPass(pid, it))) return;
        if (G.usePassTeleport(it.id)) { s.turn.running = true; Sound.bonus(); await banner(`🎟️ ${loc.emoji} ${loc.name}`, 1400, "loc"); await arrive(s, loc); render(); }
    } }, `${LOC_BY_ID[it.loc]?.emoji || "🎟️"} ${LOC_BY_ID[it.loc]?.name} ×${ps.items[it.id]}`, passBlocked(pid, LOC_BY_ID[it.loc]) ? " 🔒" : ""))) : null;
    const randomRow = ps.items.map_random > 0 ? h("div.pass-row", h("b", "🗺️ 랜덤 맵권:"), h("button.btn.small.gold", { onclick: async () => {
        if (!(await confirmBox("랜덤 맵권을 사용해 입장 가능한 모든 지역의 맵 중 한 곳으로 바로 이동할까요?"))) return;
        const loc = G.useRandomMap();
        if (!loc) return toast("이동할 수 있는 맵이 없습니다", "warn");
        s.turn.running = true; Sound.bonus(); await banner(`🗺️ ${loc.emoji} ${loc.name}`, 1400, "loc"); await arrive(s, loc); render();
    } }, `🗺️ 랜덤 맵으로 이동 ×${ps.items.map_random}`)) : null;
    return h("div.map-stage",
        h("div.map-head", avatar(pid, 56), h("div", h("b", displayName(Store.player(pid))), h("div.muted", `${Store.player(pid).country} · 선택 가능한 지역 ${avail.length}곳`)), btn),
        passRow, randomRow,
        rmap.el,
        h("p.muted.center", "☁️ 하늘나라 = 🪽 날개 · 🪐 우주 = 🧑‍🚀 우주복 · 🌊 심해 = 🤿 산소통이 있어야 뽑힐 수 있어요 (입장 시 소모 · 일반 상점) · 🧩 콤보랜드 = 셋 중 하나만 있어도 뽑힘 (맵마다 필요한 장비를 입장 시 사용)"));
}
// random-entry maps: the bouncer flips a coin. A refused player may spend any alphabet card to force it.
// Then an entry fee is ASKED (리치랜드) and gear is confirmed before it is used up.
// fallback: where a refused player goes (랜덤랜드 / 리치랜드) instead of re-rolling.
async function entryCheck(pid, loc, canRetry, fallback = null) {
    const ce = G.canEnter(pid, loc);
    const after = fallback ? ` ${fallback.emoji} ${fallback.name}(으)로 이동합니다.` : canRetry ? " 다른 카지노를 다시 뽑습니다." : "";
    if (ce.random) {
        const roll = G.rollEntry(pid, loc);
        const cards = G.cardsOf(pid);
        const box = h("div.entry-check" + (roll.allowed ? ".yes" : ".no"),
            h("div.bouncer", roll.allowed ? "🙆" : "🙅"),
            h("h2", roll.allowed ? "입장 허가!" : "입장 거절!"),
            h("p", roll.allowed ? `${loc.emoji} ${loc.name}에 들어갈 수 있습니다` : `${loc.emoji} ${loc.name}의 문지기가 막아섰다…${after}`));
        let forced = false;
        const m = modal(box, { title: "🎲 랜덤 입장", closable: false });
        const close = h("button.btn.gold.big", { onclick: () => m.close() }, roll.allowed ? "들어가기 ▶" : fallback ? `${fallback.name}(으)로 ▶` : canRetry ? "다른 맵 뽑기 ▶" : "확인");
        const cardBtns = !roll.allowed && cards.length ? h("div.pass-row", h("small", "🔤 알파벳 카드 1장으로 강제 입장:"), cards.map(L => h("button.btn.small", { onclick: () => { if (G.useCardForEntry(pid, L)) { forced = true; m.close(); } } }, `카드 ${L}`))) : null;
        box.append(cardBtns || "", close);
        roll.allowed ? Sound.fanfare() : Sound.lose();
        await m.closed;
        if (!roll.allowed && !forced) return false;
    }
    if (ce.ask) {
        const what = ce.fee ? `${fmt(ce.fee)} G` : `${ce.feePts} P`;
        if (ce.short) {
            Sound.lose();
            await alertBox("💰 입장료 부족", [`${loc.emoji} ${loc.name}의 입장료는 ${what}입니다.`, `${ce.fee ? "골드" : "포인트"}가 부족해 들어갈 수 없습니다…${after}`], "warn");
            return false;
        }
        if (!(await confirmBox(`${loc.emoji} ${loc.name}의 입장료는 ${what}입니다.\n입장료를 내고 들어갈까요?${fallback ? `\n(안 내면 ${fallback.emoji} ${fallback.name}(으)로 갑니다)` : ""}`, "내고 입장", "안 낸다"))) return false;
    } else {
        if (ce.fee) toast(`💰 입장료 ${fmt(ce.fee)}G`, "info");
        if (ce.feePts) toast(`💎 입장료 ${ce.feePts}P`, "info");
    }
    if (ce.gear) {
        if (!(await confirmBox(`${loc.emoji} ${loc.name}에 들어가려면 ${ce.gear.map(G.gearName).join(" + ")}이(가) 필요합니다.\n사용해서 입장할까요? (사용한 장비는 사라집니다)${after ? `\n사용하지 않으면${after}` : ""}`, "사용하고 입장", "사용 안 함"))) return false;
    }
    return true;
}

// ---------------------------------------------------------------- location (the actual turn)
let gameLayer = null;
function locationStage(s) {
    const t = s.turn, pid = t.pid, ps = s.ps[pid];
    const loc = LOC_BY_ID[t.loc];
    const luck = G.luckOf(pid);
    const timeEl = h("div.timer", fmtTime(t.remaining));
    const progEl = h("div.mission-prog");
    const hud = h("div.turn-hud");
    const updateHud = () => {
        timeEl.textContent = fmtTime(t.remaining);
        timeEl.classList.toggle("low", t.remaining <= 60);
        timeEl.classList.toggle("paused", !t.running);
        const pr = G.missionProgress(s.mission, t.stats);
        const met = t.ticket || G.missionMet(s.mission, t.stats);
        progEl.replaceChildren(
            h("div.mp-title", met ? "✅ 미션 달성!" : "📜 " + s.mission.text),
            h("div.mp-bar", h("i", { style: { width: Math.max(0, Math.min(100, pr.cur / pr.goal * 100)) + "%" } })),
            h("small", t.ticket ? "미션완료권 사용됨" : pr.label));
        progEl.classList.toggle("met", met);
        hud.replaceChildren(...[
            h("div.stat.gold", h("small", "보유금액"), h("b", fmt(ps.money) + " G")),
            ps.loanGold > 0 || ps.loan ? h("div.stat.loan", h("small", "대출된 골드 (게임 전용)"), h("b", fmt(ps.loanGold || 0) + " G")) : null,
            ps.loan ? h("div.stat.debt", h("small", `갚을 돈 · ${ps.loan.due}R까지`), h("b", fmt(ps.loan.owed) + " G")) : null,
            h("div.stat.pts", h("small", "포인트"), h("b", ps.points + " P")),
            h("div.stat", h("small", "HP"), h("b" + (ps.hp < 50 ? ".down" : ""), `❤ ${ps.hp}`)),
            h("div.stat", h("small", "남은 횟수"), h("b", `🎰 ${G.playsLeft(pid, "slot")} · 🃏 ${G.playsLeft(pid, "casino")}`)),
            h("div.stat", h("small", "슬롯 손익"), h("b" + (t.stats.slotNet >= 0 ? ".up" : ".down"), fmt(t.stats.slotNet))),
            h("div.stat", h("small", "카지노 손익"), h("b" + (t.stats.casinoNet >= 0 ? ".up" : ".down"), fmt(t.stats.casinoNet))),
            h("div.stat", h("small", "이번 턴 포인트"), h("b", String(t.stats.points))),
            h("div.stat", h("small", "보너스 / 잭팟"), h("b", `${t.stats.bonus} / ${t.stats.jackpot || "-"}`)),
            G.boostLeft("slot") ? h("div.stat.boost", h("small", "🎰 슬롯 보너스 UP"), h("b", `${G.boostLeft("slot")}초`)) : null,
            G.boostLeft("casino") ? h("div.stat.boost", h("small", "🃏 카지노 상금 UP"), h("b", `${G.boostLeft("casino")}초`)) : null].filter(Boolean));
    };
    updateHud();

    const pauseBtn = h("button.btn.ghost.small", { onclick: () => { t.running = !t.running; pauseBtn.textContent = t.running ? "⏸ 일시정지" : "▶ 재개"; updateHud(); Store.saveSeason(); } }, t.running ? "⏸ 일시정지" : "▶ 재개");
    const endBtn = h("button.btn.red.small", { onclick: async () => { if (await confirmBox("턴을 종료할까요?")) finishTurn(); } }, "⏹ 턴 종료");

    const ctx = kind => ({
        pid,
        // pet luck + the 30 s booster item (boost: true while it runs)
        get luck() { return { ...luck, boost: G.boostLeft(kind) > 0 }; },
        money: () => G.playMoney(pid),
        canPlay: () => t.remaining <= 0 ? { ok: false, why: "⏰ 시간 종료!" } : !t.running ? { ok: false, why: "⏸ 일시정지 중입니다" }
            : G.playsLeft(pid, kind) <= 0 ? { ok: false, why: kind === "slot" ? "이번 라운드 슬롯 스핀 횟수를 모두 썼습니다 (추가권: 일반 상점)" : "이번 라운드 카지노게임 횟수를 모두 썼습니다 (추가권: 일반 상점)" }
            : { ok: true },
        left: () => G.playsLeft(pid, kind),
        record(bet, win, points, extra = {}) {
            if (extra.pending) { G.spendBet(pid, kind, bet); updateHud(); return; }
            if (extra.settle) {
                ps.money += extra.bet; G.recordPlay(kind, extra.bet, win, points, extra); updateHud();
                // casino games can drop an alphabet card too (slots show theirs on the reels)
                if (kind === "casino" && Math.random() < CASINO_CARD_RATE) { const L = pick(ALPHABET); G.gainCard(pid, L); toast(`🔤 알파벳 카드 ${L} 획득!`, "ok"); }
            }
        },
        // slots: a letter on the reels → card (season play only)
        gainCard: kind === "slot" ? L => { G.gainCard(pid, L); updateHud(); } : null,
        cardRate: CARD_RATE,
        petHelp: (what, amount, credit) => { G.notePetHelp(pid, what, amount, credit); side.replaceChildren(sideCard()); },
        close() { gameLayer?.remove(); gameLayer = null; tabBody(currentTab); }
    });
    function openGame(kind, id) {
        if (t.remaining <= 0) return toast("시간이 종료되었습니다", "warn");
        gameLayer?.remove();
        const el = kind === "slot" ? openSlot(SLOT_BY_ID[id], ctx("slot")) : openCasino(CASINO_BY_ID[id], ctx("casino"));
        gameLayer = h("div.game-layer", el);
        root.querySelector(".loc-main").append(gameLayer);
    }

    // tabs
    const tabs = [["games", "🎰 게임"], ...locationShops(loc).map(sid => ["shop:" + sid, SHOPS[sid].icon + " " + SHOPS[sid].name]),
        ...(loc.discount ? [["shop:discount", "🏷️ 할인 상점"]] : []),
        ...(earnKinds(loc).length ? [["earn", "💪 돈벌기"]] : []), ...(loc.job ? [["job", "💼 직업"]] : []), ...(loc.beg ? [["beg", "🥺 구걸"]] : []), ...(loc.spell ? [["spell", "🐝 Spelling Bee"]] : []),
        ["inv", "🎒 인벤토리"], ["loan", ps.loan ? "🏦 대출 상환" : "🏦 대출"], ["card", "🪪 프로필"]];
    let currentTab = "games";
    const tabBar = h("div.tabs");
    const body = h("div.tab-body");
    function tabBody(id) {
        currentTab = id;
        tabBar.replaceChildren(...tabs.map(([k, label]) => h("button.tab" + (k === id ? ".on" : ""), { onclick: () => tabBody(k) }, label)));
        let content;
        if (id === "games") content = h("div.game-list",
            ...loc.slots.filter(sid => !SLOT_BY_ID[sid].off).map(sid => { const c = SLOT_BY_ID[sid]; return h("button.gcard.slot", { style: { "--bg": c.theme.bg, "--accent": c.theme.accent }, onclick: () => openGame("slot", sid) },
                h("div.gc-kind", c.progressive === false ? "SLOT · CLASSIC" : "SLOT · PROGRESSIVE"), h("div.gc-name", c.name), h("div.gc-brand", c.brand), h("div.gc-desc", c.desc)); }),
            ...loc.casino.filter(cid => !CASINO_BY_ID[cid].off).map(cid => { const g = CASINO_BY_ID[cid]; return h("button.gcard.casino", { onclick: () => openGame("casino", cid) },
                h("div.gc-kind", "CASINO GAME"), h("div.gc-ico", g.icon), h("div.gc-name", g.name), h("div.gc-desc", g.desc)); }));
        else if (id.startsWith("shop:")) content = shopView(id.slice(5), pid, loc.id, () => { updateHud(); side.replaceChildren(sideCard()); });
        else if (id === "inv") content = inventoryView(pid, {
            onUseTime: () => { ps.items.time_ext--; t.remaining += CONFIG.EXTEND_SECONDS; G.log(`⏱️ ${displayName(Store.player(pid))} 5분 연장!`); Store.saveSeason(); updateHud(); toast("+5분!", "ok"); },
            onMission: () => { if (G.useMissionPass()) { toast("🎫 미션완료권 사용! 이번 라운드 통과", "ok"); updateHud(); } },
            onHp: (item, n) => { const r = G.useHpItem(pid, item, n); if (r < 0) toast("HP가 이미 가득 찼습니다", "warn"); else if (r > 0) { Sound.coin(); toast(`❤ HP +${r}`, "ok"); updateHud(); } },
            onPlays: (kind, item, n) => { if (G.addPlays(pid, kind, item, n)) { toast(kind === "slot" ? `🎰 슬롯 +${n}회` : `🃏 카지노 +${n}회`, "ok"); updateHud(); } },
            onChange: () => side.replaceChildren(sideCard()),
            onPass: id => movePass(id),
            onBoost: kind => { if (G.useBoost(kind)) { Sound.bonus(); toast(kind === "slot" ? "🎰 30초 동안 슬롯 보너스 확률 UP!" : "🃏 30초 동안 카지노 상금 확률 UP!", "ok"); updateHud(); } },
            onRandomMap: () => moveRandom()
        });
        else if (id === "loan") content = loanView(pid, () => { updateHud(); tabBody("loan"); });
        else if (id === "earn") content = earnView(pid, () => { updateHud(); side.replaceChildren(sideCard()); tabBody("earn"); }, { loc, turn: t, updateHud });
        else if (id === "job") content = jobView(pid, t, () => { updateHud(); tabBody("job"); if (t.remaining <= 0) timeUp(); });
        else if (id === "beg") content = begView(pid, () => { updateHud(); tabBody("beg"); });
        else if (id === "spell") content = spellingView(pid, loc, () => { updateHud(); tabBody("spell"); });
        else content = playerCard(pid, ps);
        body.replaceChildren(content);
    }
    const sideCard = () => h("div.loc-side-inner",
        avatar(pid, 120),
        h("div.ls-name", displayName(Store.player(pid))),
        h("div.ls-pet", ps.pet ? petView(ps.pet, ps.petEffect, 90) : h("div.muted", "펫 없음")),
        h("div.luck", { title: "착용한 펫·펫효과가 올려 주는 당첨 확률 보너스입니다 (전적이 아닙니다). 펫이 없으면 +0%." }, `🍀 펫 행운: 당첨 확률 +${luck.pct}%`, luck.bonusPct ? h("span", ` · 보너스 +${luck.bonusPct}%`) : null),
        ps.petHelp ? h("div.luck.ph-sum", `🐾 펫 도움: 당첨 ${ps.petHelp.win || 0}회 · 보너스 ${ps.petHelp.bonus || 0}회`, ps.petHelp.gold ? h("small", ` (+${fmt(ps.petHelp.gold)} G)`) : null) : null,
        ps.weapons.length ? h("div.wlist.small", ps.weapons.map(weaponChip)) : null);
    const side = h("div.loc-side", sideCard());
    // map pass during the turn: move right away, the turn clock keeps running
    let moving = false;
    async function movePass(itemId) {
        const it = ITEM_BY_ID[itemId], to = LOC_BY_ID[it?.loc];
        if (!to || moving || to.id === loc.id) return;
        if (t.remaining <= 0) return toast("시간이 종료되었습니다", "warn");
        if (root.querySelector(".game-screen .busy, .game-screen.busy")) return toast("스핀이 끝난 뒤에 이동하세요", "warn");
        moving = true;
        const was = t.running; t.running = false; updateHud();
        if (!(await tryPass(pid, it))) { moving = false; t.running = was; updateHud(); return; }
        if (!G.usePassTeleport(itemId)) { moving = false; t.running = was; return; }
        t.running = was;
        clearInterval(timer);
        gameLayer?.remove(); gameLayer = null;
        Sound.bonus();
        await banner(`🎟️ ${to.emoji} ${to.name}`, 1400, "loc");
        await arrive(s, to);
        render();
    }
    async function moveRandom() {
        if (moving) return;
        if (t.remaining <= 0) return toast("시간이 종료되었습니다", "warn");
        if (root.querySelector(".game-screen .busy, .game-screen.busy")) return toast("스핀이 끝난 뒤에 이동하세요", "warn");
        if (!(await confirmBox(`🗺️ 랜덤 맵권을 사용해 입장 가능한 모든 지역의 맵 중 한 곳으로 지금 이동할까요?\n남은 시간 ${fmtTime(t.remaining)}은 그대로 이어집니다.`, "이동하기", "취소"))) return;
        moving = true;
        const to = G.useRandomMap();
        if (!to) { moving = false; return toast("이동할 수 있는 맵이 없습니다", "warn"); }
        clearInterval(timer);
        gameLayer?.remove(); gameLayer = null;
        Sound.bonus();
        await banner(`🗺️ ${to.emoji} ${to.name}`, 1400, "loc");
        await arrive(s, to);
        render();
    }
    const passBtns = G.passesOf(pid).filter(it => it.loc !== loc.id);
    tabBody("games");

    // NPC corner: 40~70% chance of 1~3 attacks at random moments of the turn
    const npcHere = G.npcActive(loc.id);
    if (npcHere && !t.npc) { t.npc = scheduleNpc(t.remaining, loc.npc === "always"); Store.saveSeason(); }
    let npcBusy = false;
    async function npcCheck() {
        if (npcBusy || !t.npc?.length || t.remaining > t.npc[0]) return;
        if (root.querySelector(".game-screen .busy, .game-screen.busy")) return; // wait for the spin to finish
        npcBusy = true;
        t.npc.shift();
        const was = t.running; t.running = false; updateHud();
        const out = await npcAttack(pid);
        npcBusy = false;
        if (out?.kill) { clearInterval(timer); gameLayer?.remove(); gameLayer = null; render(); return; }
        t.running = was; updateHud(); side.replaceChildren(sideCard());
        Store.saveSeason();
    }

    // timer loop
    let saveTick = 0;
    timer = setInterval(() => {
        if (!document.body.contains(timeEl)) { clearInterval(timer); return; }
        if (!t.running || t.remaining <= 0) return;
        t.remaining -= 1;
        if (t.remaining <= 10 && t.remaining > 0) Sound.tick();
        if (++saveTick % 5 === 0) Store.saveLocal();
        updateHud();
        npcCheck();
        if (t.remaining <= 0) timeUp();
    }, 1000);

    async function timeUp() {
        Sound.boom();
        await banner("⏰ TIME UP!", 1500, "timeup");
        // let a running spin finish
        let wait = 0;
        while (root.querySelector(".game-screen .busy, .game-screen.busy") && wait++ < 120) await sleep(500);
        finishTurn();
    }
    let finishing = false;
    async function finishTurn() {
        if (finishing) return; finishing = true;
        clearInterval(timer);
        // card missions: a holder decides now whether to spend the card
        if (s.mission.type === "card" && !t.stats.cardUsed && ps.items["card_" + s.mission.letter] > 0
            && await confirmBox(`🔤 알파벳 카드 ${s.mission.letter}를 갖고 있습니다.\n이번 라운드에 사용할까요? (사용하면 미션 통과 · 카드는 사라집니다)`, "사용하기", "아끼기")) G.useMissionCard();
        const met = t.ticket || G.missionMet(s.mission, t.stats);
        gameLayer?.remove(); gameLayer = null;
        const m = modal(h("div.turn-result" + (met ? ".ok" : ".bad"),
            avatar(pid, 120),
            h("h2", met ? "🎉 미션 성공!" : "💦 미션 실패…"),
            h("p", s.mission.text),
            h("div.tr-stats",
                h("div", h("small", "슬롯 손익"), h("b", fmt(t.stats.slotNet) + " G")),
                h("div", h("small", "카지노 손익"), h("b", fmt(t.stats.casinoNet) + " G")),
                h("div", h("small", "획득 포인트"), h("b", t.stats.points + " P")),
                h("div", h("small", "보너스/잭팟"), h("b", `${t.stats.bonus} / ${t.stats.jackpot || "-"}`))),
            h("button.btn.gold.big", { onclick: () => m.close() }, "다음 ▶")), { title: `${displayName(Store.player(pid))} 턴 결과`, closable: false });
        met ? (Sound.fanfare(), confetti(60)) : Sound.lose();
        await m.closed;
        G.endTurn();
        render();
    }

    return h("div.location", { style: { "--loc": loc.color } },
        h("div.loc-head",
            h("div.loc-name", h("span", loc.emoji), h("b", loc.name), npcHere ? h("span.npc-warn", { title: "이번 라운드에 이 맵에는 NPC가 출몰합니다 — 눌러서 NPC 정보 보기", onclick: () => npcInfo(loc, { active: true }) }, "⚠️ NPC 출몰 · 정보") : h("span.npc-safe", { title: "눌러서 NPC 정보 보기", onclick: () => npcInfo(loc, { active: false }) }, "🛡️ NPC 없음 · 정보")),
            progEl,
            h("div.loc-timer", timeEl, h("div.row", pauseBtn, endBtn))),
        ...(passBtns.length ? [h("div.pass-row.in-turn", h("b", "🎟️ 맵권으로 지금 이동:"), passBtns.map(it => h("button.btn.small.gold", { onclick: () => movePass(it.id) }, `${LOC_BY_ID[it.loc].emoji} ${LOC_BY_ID[it.loc].name} ×${ps.items[it.id]}`)))] : []),
        hud,
        h("div.loc-wrap", side, h("div.loc-main", tabBar, body)));
}

// ------------------------------------------------------------------ judge
function judgeStage(s) {
    const passed = s.order.filter(pid => s.results[pid]?.pass);
    const failed = s.order.filter(pid => !s.results[pid]?.pass);
    const machine = reelMachine({ size: 130, label: "ELIMINATION" });
    const candPlayers = s.candidates.map(id => Store.player(id));
    machine.idle(candPlayers);
    let done = false;
    const btn = h("button.btn.red.huge", { onclick: async () => {
        if (done) return; done = true; btn.disabled = true;
        const target = pick(s.candidates);
        if (s.candidates.length === 1) { machine.show(target); await sleep(800); }
        else await machine.spin(target, candPlayers, { tense: true });
        Sound.boom();
        G.eliminate(target);
        render();
    } }, s.candidates.length === 1 ? "💀 탈락 확정" : "💀 탈락자 뽑기");
    return h("div.judge-stage",
        h("h2.stage-title", `ROUND ${s.round} 결과`),
        s.allPassed ? h("div.notice", "모두 미션 성공! 이번 라운드 손익 하위 3명이 탈락 후보가 됩니다.") : null,
        ...(s.exempt || []).map(x => h("div.notice.exempt", avatar(x.pid, 40, { effect: false }), h("span", `⭐ ${displayName(Store.player(x.pid))}은(는) ${x.why}으로 인해 탈락후보에서 면제되었다!`))),
        h("div.judge-cols",
            h("div.jcol.ok", h("h3", `✅ 성공 ${passed.length}`), h("div.jlist", passed.map(pid => miniPlayer(pid, s.ps[pid], s.results[pid]?.exempt ? h("span.exempt-tag", { title: `${s.results[pid].exempt}으로 인해 면제` }, "⭐ 면제") : null)))),
            h("div.jcol.bad", h("h3", `❌ 실패 ${failed.length}`), h("div.jlist", failed.map(pid => miniPlayer(pid, s.ps[pid]))))),
        h("h3.center", `⚖️ 탈락 후보 ${s.candidates.length}명`),
        h("div.cand-row", s.candidates.map(pid => h("div.cand-card", avatar(pid, 80), h("small", displayName(Store.player(pid)))))),
        machine.el,
        h("div.row.center", btn));
}

function eliminatedStage(s) {
    const pid = s.lastEliminated;
    return h("div.elim-stage",
        h("div.elim-card", h("div.elim-x", "✕"), avatar(pid, 200), h("h2", displayName(Store.player(pid))), h("p", `ROUND ${s.round} 탈락 · 최종 ${s.ps[pid].rank}위`)),
        h("div.row.center", h("button.btn.gold.huge", { onclick: () => { G.startRound(); render(); } }, `▶ ROUND ${s.round + 1} 시작`)));
}

// ------------------------------------------------------------------ final
function finalStage(s) {
    const [a, b] = G.finalists();
    const win = async winner => {
        const ps = s.ps[winner], d = Store.getDecor(winner), p = Store.player(winner);
        await G.crown(winner, { name: displayName(p), player_name: p.player_name, image: p.profile_image, country: p.country, money: ps.money, points: ps.points, pet: ps.pet, petEffect: ps.petEffect, weapons: ps.weapons, frame: d.frame, effect: d.effect });
        render();
    };
    if (b == null) { // everyone else died (loans) — last survivor wins
        return h("div.center-card", h("h2", "☠️ 최후의 생존자"), avatar(a, 160), h("p", `${displayName(Store.player(a))}만 살아남았습니다!`),
            h("button.btn.gold.huge", { onclick: () => win(a) }, "👑 우승 확정"));
    }
    return battleView(a, b, win);
}

function doneStage(s) {
    const pid = s.winnerId;
    setTimeout(() => { confetti(150, ["👑", "🪙", "✨", "💰"]); Sound.fanfare(); }, 200);
    return h("div.champ-stage",
        h("div.champ-rays"),
        h("div.champ-crown", "👑"),
        avatar(pid, 220),
        h("h1", displayName(Store.player(pid))),
        h("p", `SEASON ${s.number} CHAMPION · 명예의 전당 등극!`),
        h("div.row.center",
            h("button.btn.gold.big", { onclick: () => { location.hash = "#/hall"; } }, "🏆 명예의 전당 보기"),
            h("button.btn.ghost.big", { onclick: () => { Store.endSeasonLocal(); G.newSeason(); render(); } }, `🎰 시즌 ${s.number + 1} 시작`)));
}

// ------------------------------------------------------------------ loans
function loanView(pid, onChange) {
    const s = G.S(), ps = s.ps[pid];
    const st = G.loanStatus(pid);
    const wrap = h("div.loan-view");
    if (ps.loan) {
        const L = LOANS[ps.loan.type];
        const roundsLeft = ps.loan.due - s.round;
        const can = (ps.loanGold || 0) + ps.money;
        const input = h("input.input", { type: "number", min: 1, step: 100, value: Math.min(can, ps.loan.owed) });
        wrap.append(
            h("div.loan-card.active",
                h("div.loan-title", L.emoji, " ", L.name, " 이용 중"),
                h("div.loan-rows",
                    h("div", h("small", "빌린 원금"), h("b", fmt(ps.loan.principal) + " G")),
                    h("div", h("small", "갚을 돈 (이자 포함)"), h("b.down", fmt(ps.loan.owed) + " G")),
                    h("div", h("small", "남은 대출 골드"), h("b", fmt(ps.loanGold || 0) + " G")),
                    h("div", h("small", "상환 기한"), h("b" + (roundsLeft <= 0 ? ".down" : ""), roundsLeft <= 0 ? `이번 라운드가 마지막!` : `ROUND ${ps.loan.due}까지 (${roundsLeft}라운드 남음)`))),
                h("p.muted", `라운드가 바뀔 때마다 갚을 돈이 ${L.rate * 100}%씩 불어납니다. 기한 안에 다 갚지 못하면 다음 라운드 시작과 함께 사망(탈락)합니다.`),
                h("div.row",
                    input,
                    h("button.btn.gold", { onclick: async () => {
                        const amt = Math.floor(+input.value || 0);
                        if (amt <= 0) return toast("금액을 입력하세요", "warn");
                        if (!(await confirmBox(`${fmt(Math.min(amt, ps.loan.owed, can))} G를 상환할까요? (남은 대출 골드 → 보유 골드 순으로 차감)`))) return;
                        const paid = G.repayLoan(pid, amt);
                        Sound.coin(); toast(`${fmt(paid)} G 상환!`, "ok");
                        if (!ps.loan) { confetti(50); }
                        onChange();
                    } }, "💸 상환하기"),
                    h("button.btn.ghost", { onclick: () => { input.value = Math.min(can, ps.loan.owed); } }, "최대"))));
        return wrap;
    }
    wrap.append(h("p.notice", st.ok ? "골드가 거의 바닥났군요 (10,000G 이하)… 대출을 받아 다시 도전하세요! 대출된 골드는 슬롯·카지노에만 쓸 수 있고, 거기서 딴 골드는 상점에서도 쓸 수 있습니다." : "🚫 " + st.why));
    for (const L of Object.values(LOANS)) {
        wrap.append(h("div.loan-card." + L.id,
            h("div.loan-title", L.emoji, " ", L.name),
            h("p.muted", `${L.rounds}라운드 안에 원금+이자 상환 · 이자 라운드마다 ${L.rate * 100}% 복리 · 미상환 시 사망`),
            h("div.row", L.amounts.map(a => h("button.btn" + (st.ok ? ".gold" : ".ghost"), { disabled: !st.ok, onclick: async () => {
                if (!(await confirmBox(`${L.name}에서 ${fmt(a)} G를 빌릴까요?\nROUND ${s.round + L.rounds - 1}까지 갚지 못하면 사망합니다!`))) return;
                if (G.takeLoan(pid, L.id, a)) { Sound.bonus(); confetti(40, ["💵", "💸"]); toast(`${L.name} ${fmt(a)} G 대출!`, "ok"); onChange(); }
            } }, `${fmt(a)} G`)))));
    }
    return wrap;
}

// ------------------------------------------------------------------ battle mission
// The two fighters are drawn one at a time from the candidates, with a
// slowing roulette over the remaining cards. The fight starts only when the
// ⚔️ button is pressed (battleView's own start button).
function battleDrawStage(s) {
    const pair = s.battlePair;
    const pool = (s.battlePool || []).filter(p => !s.ps[p].out);
    if (!pair.every(p => pool.includes(p))) pool.push(...pair.filter(p => !pool.includes(p)));
    const cards = new Map(pool.map(pid => [pid, h("div.bd-card", avatar(pid, 84, { effect: false }), h("small", displayName(Store.player(pid))))]));
    const slots = [0, 1].map(i => h("div.bd-slot", h("div.bd-q", "?"), h("small", i === 0 ? "첫 번째 파이터" : "두 번째 파이터")));
    const status = h("p.bd-status", `후보 ${pool.length}명 중 2명이 배틀에 나섭니다…`);
    let drawing = false;
    const btn = h("button.btn.red.huge", { onclick: () => draw() }, "🎲 배틀 상대 추첨");
    const wrap = h("div.battle-draw",
        h("h2.stage-title", `⚔️ ROUND ${s.round} 배틀 미션`, h("small", s.mission.text)),
        h("div.bd-vs", slots[0], h("div.vs-big", "VS"), slots[1]),
        status,
        h("div.bd-pool", [...cards.values()]),
        h("div.row.center", btn));
    async function spinTo(target, remaining) {
        // a light hops around the remaining candidates, slows down, teases, then stops
        const list = [...remaining];
        let i = Math.floor(Math.random() * list.length), gap = 55;
        const ti = list.indexOf(target);
        const laps = list.length * (2 + Math.floor(Math.random() * 2));
        const total = laps + ((ti - i + list.length) % list.length);
        for (let k = 0; k <= total; k++) {
            cards.forEach(c => c.classList.remove("hot"));
            const pid = list[(i + k) % list.length];
            cards.get(pid).classList.add("hot");
            if (total - k < 6) Sound.heartbeat(); else Sound.tick();
            await sleep(gap);
            gap = total - k < 8 ? gap * 1.35 : gap * 1.04;
        }
        cards.forEach(c => c.classList.remove("hot"));
    }
    async function draw() {
        if (drawing) return; drawing = true; btn.disabled = true;
        const remaining = new Set(pool);
        for (let n = 0; n < 2; n++) {
            const pid = pair[n];
            status.textContent = n === 0 ? "첫 번째 파이터를 뽑는 중… 🥁" : `남은 후보 ${remaining.size}명 중 두 번째 파이터… 🥁`;
            wrap.classList.add("tense");
            await spinTo(pid, remaining);
            wrap.classList.remove("tense");
            const card = cards.get(pid);
            card.classList.add("chosen");
            Sound.boom(); confetti(30, ["⚔️", "🔥"]);
            slots[n].replaceChildren(avatar(pid, 110), h("b", displayName(Store.player(pid))));
            slots[n].classList.add("filled");
            remaining.delete(pid);
            await banner(`${n === 0 ? "1번" : "2번"} 파이터: ${displayName(Store.player(pid))}!`, 1300, "mission");
            if (n === 0 && remaining.size > 1) { status.textContent = "과연 상대는…?"; await sleep(700); }
        }
        status.textContent = "대진 확정!";
        Sound.fanfare();
        G.battleDrawn();
        btn.remove();
        await sleep(1400);
        render(); // → arena; the fight waits for its ⚔️ 배틀 시작 button
    }
    return wrap;
}
function battleMissionStage(s) {
    const [a, b] = s.battlePair || [];
    if (a == null || b == null || s.ps[a].out || s.ps[b].out) { // stale pair (e.g. loan death) → redraw
        G.setMission(s.mission); return battleMissionStage(G.S());
    }
    // old saves (no draw state) go straight to the arena
    if (s.battleDrawn === false) return battleDrawStage(s);
    return battleView(a, b, (winner, loser) => {
        G.finishBattle(winner, loser);
        render();
    }, { title: `⚔️ ROUND ${s.round} 배틀 미션`, sub: `${s.mission.text} · 패배하면 탈락! 승자는 깎인 HP 그대로 다음 라운드로`, logLabel: "배틀 미션" });
}
