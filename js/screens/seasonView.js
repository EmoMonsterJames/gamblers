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
import { TIERS, MISSIONS, ITEM_BY_ID, LOCATIONS, LOC_BY_ID, REGIONS, SHOPS, LOANS, REGION_BY_ID, earnKinds, ALPHABET } from "../data/catalog.js";
import { sandboxTools, exitSandbox } from "../game/sandbox.js";
// alphabet card (G·A·M·B·L·E·R·S) chance per slot spin: 0.04% at the top bet down to 0.01% at the lowest
const CARD_RATE = (bet, bets) => { const l = [...new Set(bets || [bet])].sort((a, b) => a - b); const i = Math.max(0, l.findIndex(b => b >= bet)); return 0.0001 + 0.0003 * (l.length > 1 ? i / (l.length - 1) : 0); };
const CASINO_CARD_RATE = 0.01; // per casino play
import { CASINO_BY_ID } from "../data/casino.js";
import { SLOT_BY_ID } from "../slots/configs.js";
import * as G from "../game/season.js";
import { avatar, playerCard, miniPlayer, displayName, petView, weaponChip, diseaseChips } from "../ui/profile.js";
import { reelMachine } from "../ui/reelpick.js";
import { worldMap, regionMap } from "../ui/map.js";
import { openCasino } from "./casino.js";
import { openSlot } from "./slot.js";
import { shopView, inventoryView } from "./shop.js";
import { spellingView } from "./spelling.js";
import { locationShops } from "../data/catalogAdmin.js";
import { earnView, begView, jobView, npcAttack, scheduleNpc, npcInfo, diseaseBadge } from "./corners.js";
import { battleView } from "./battle.js";
import { honorView } from "./honor.js";
import { HONOR_KINDS, honorKinds } from "../data/honor.js";
import { clawElimination, clawChampion, winnerCelebration } from "../ui/claw.js";
import { Activity, activityBusy } from "../core/fx.js";
import { bankView, remoteBank } from "./bank.js";
import { bizHubView, bizHubHere, bizTabs, bizView, remoteBiz, reportList } from "./business.js";
import { account as bankAccount, reportsOf } from "../game/bank.js";
import { captureView, hospitalView, labView, monsterShopView, emoDexTab, emoPartySide, emoBattleStage, emoBoot } from "./emoCorners.js";
import { emoInventory } from "../emomon/ui.js";
import { regionWarning, extraEntry, arrivalExtra, deathWheel, mapEffects, kidnapView, communityView, arenaView, extraInventory, sickTickNotice, cursedConfig } from "./extraCorners.js";
import { promoAtTurn } from "./promo.js";
import { bunkerFallback, bunkerArm, bunkerKeyDue, bunkerKeyFound, askAccessCard, richFallback, RICH_FALLBACK_TEXT } from "./bunker.js";
import { endLocked, endLockText, END_LOCK_LEFT, kidnapLockLeft, escapeTried } from "../game/extra.js";
import { lottoView, seasonLottoCheck } from "./lotto.js";
import { highlightView } from "./highlight.js";
import { deptView, gotchaView } from "./gotcha.js";
import * as RV from "../game/revival.js";
import { revivalIntroStage, revivalStage, revivalBar, revivalInvView } from "./revivalView.js";
import { arcadeView, CORNER_KINDS } from "./arcade.js";
import { stopSurvivalFx, survivalSide, survivalMsgs, infernoGate, INFERNO_FREE } from "./survivalLand.js";
import { iceWrap } from "./survivalIce.js";
import { setMapBackdrop, clearMapBackdrop } from "../ui/mapBackdrop.js";
import { friendsView, helpView, voteStage } from "./social.js";
import * as SO from "../game/social.js";
import { mapNo } from "../data/mapAdmin.js";
import * as LF from "../game/life.js";
import * as EP from "../game/employ.js";
import { vitals, foodCornerView, lodgeView, weatherHud, weatherLayer, employView, companyView, employAtTurn, starvePopup, starveHurtPopup, lifeInventory, companyMark, arizalBox, arizalTick } from "./lifeCorners.js";

let root = null, timer = null;

// ☠️ the moment of death for every non-NPC death (sugar overdose, magma, HP 0 on a map, disasters, kidnap…)
// NPC kills already have their own attack popup (corners2.npcAttack)
export function deathPopup(pid, why) {
    const nm = displayName(Store.player(pid));
    const icon = (String(why).match(/^\p{Extended_Pictographic}️?/u) || ["☠️"])[0];
    const cause = String(why).replace(/^\p{Extended_Pictographic}️?\s*/u, "").replace(/\s*사망$/, "").trim();
    const target = h("div.npc-target.death-target", avatar(pid, 120, { effect: false }));
    const box = h("div.npc-pop.k-kill.death-pop",
        h("div.npc-arena", h("div.npc-art.death-cause", h("span.npc-body", icon)), h("div.npc-fx", h("span.npc-burst", "💀")), target),
        h("div.npc-say", `${icon} ${cause}`),
        h("div.npc-res", h("b", `☠️ ${nm}이(가) ${cause ? cause + " " : ""}사망하였습니다.`)),
        h("p.muted.center", RV.inRevival(pid) ? "패자부활전에서 사망했습니다…" : "이번 시즌 탈락…"));
    const m = modal(box, { title: "☠️ 사망!", closable: false });
    Sound.boom();
    setTimeout(() => { target.classList.add("hurt", "dead"); }, 350);
    box.append(h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
    return m.closed;
}
document.addEventListener("gb:death", e => {
    const d = e.detail || {};
    if (d.npc || d.quiet || d.pid == null) return;
    const s = G.S();
    if (!s || s.sandbox && !s.testSeason && !s.turn) return;
    deathPopup(d.pid, d.why);
});
// 🕹️ the running arcade (kept across re-renders of the turn screen) + the screen's current hooks
let arcadeInst = null, arcadeTurn = null, arcadeHooks = {}, cornerPaused = false;
function arcadeFor(pid, t) {
    if (!arcadeInst || arcadeTurn !== t) {
        arcadeInst?.stop();
        cornerPaused = false;
        const call = k => (...a) => arcadeHooks[k]?.(...a);
        arcadeInst = arcadeView(pid, t, { hp: call("hp"), hurt: call("hurt"), heal: call("heal"), gold: call("gold"), onCorner: call("onCorner"), onResume: call("onResume"), onWin: call("onWin"), onDead: call("onDead"), onChange: call("onChange") });
        arcadeTurn = t;
    }
    return arcadeInst;
}
// game tile: just the first short phrase of the description (the full rules are behind the game's ⓘ)
const shortDesc = d => { const s = String(d || "").split(/(?<=[.!?])\s|[·(=,:]|\. /)[0].trim(); return s.length > 34 ? s.slice(0, 33) + "…" : s; };

export function seasonScreen() {
    root = h("div.season");
    render();
    return root;
}

let emoBooting = null;
function render() {
    clearInterval(timer);
    const s = G.S();
    if (!s) { root.replaceChildren(noSeason()); return; }
    if (!emoBooting) emoBooting = emoBoot().catch(e => console.warn("EmoMon", e)); // EmoMon missions / party need the catalog
    // 🔄 패자부활전: Survival Land opens only while it runs · the 10th player out stops the season before the next round
    RV.syncSurvivalLand();
    stopSurvivalFx(); // flood / fog / statue overlays of the previous screen
    if (!(s.turn?.loc && LOC_BY_ID[s.turn.loc]?.region === "survival")) Sound.ambStop(); // 🎵 Survival Land map loop only on those maps
    // 🖼️ the page around the play screen: a scene that fits the map being played
    if (s.turn?.loc && LOC_BY_ID[s.turn.loc]) setMapBackdrop(LOC_BY_ID[s.turn.loc]); else clearMapBackdrop();
    if (RV.revivalDue()) RV.openRevival();
    // 🗳️ 16 / 8 players left: this round is a vote instead of a mission (applies to the running season too)
    if (s.status === "mission" && !s.mission && !(s.sandbox && !s.testSeason) && SO.voteDue()) SO.startVote();
    if (arcadeInst && (s.turn?.loc !== "arcade" || arcadeTurn !== s.turn)) { arcadeInst.stop(); arcadeInst = null; arcadeTurn = null; }
    const revStage = s.revival?.phase === "intro" ? (x => revivalIntroStage(x, render)) : s.status === "revival" ? (x => revivalStage(x, render)) : null;
    const stage = revStage || {
        select: selectStage, mission: missionStage, turns: turnsStage, judge: judgeStage, battle: battleMissionStage,
        eliminated: eliminatedStage, final: finalStage, done: doneStage, vote: x => voteStage(x, render)
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
        h("b", s.testSeason ? `🧪 테스트 시즌 (${s.roster.length}명)` : "🧪 테스트 모드"), h("small", "아무것도 저장되지 않습니다"),
        tool("💰 +100만G", () => sandboxTools.gold()), tool("💎 +100P", () => sandboxTools.points()), tool("❤️ HP 회복", () => sandboxTools.heal()),
        tool("⏱️ +10분", () => sandboxTools.time()), tool("👹 이번 라운드 모든 맵 NPC", () => sandboxTools.npcEverywhere()),
        s.testSeason ? null : h("label", "미션 ", sel),
        sandboxMapPicker(s),
        h("button.btn.small.red", { onclick: exitSandbox }, "테스트 종료"));
}
// 🧪 jump straight to any region / map (no roulette, no entry rules)
function sandboxMapPicker(s) {
    const cur = s.turn?.loc || s.sandboxStart || "";
    const mapSel = h("select");
    const regSel = h("select", { onchange: () => fill() }, REGIONS.filter(r => !r.off).map(r => h("option", { value: r.id, selected: LOC_BY_ID[cur]?.region === r.id }, `${r.emoji} ${r.name}`)));
    const fill = () => mapSel.replaceChildren(...LOCATIONS.filter(l => l.region === regSel.value && !l.off).map(l => h("option", { value: l.id, selected: l.id === cur }, `${l.emoji || ""} ${l.name}`)));
    fill();
    return h("label", "📍 ", regSel, mapSel, h("button.btn.small.gold", { onclick: () => sandboxJump(s, mapSel.value) }, "이동"));
}
async function sandboxJump(s, locId) {
    const loc = LOC_BY_ID[locId];
    if (!loc) return;
    s.sandboxStart = locId;
    if (!s.turn) return toast("턴이 시작되면 이 맵으로 바로 들어갑니다", "info");
    if (root.querySelector(".game-screen .busy, .game-screen.busy")) return toast("스핀이 끝난 뒤에 이동하세요", "warn");
    clearInterval(timer);
    gameLayer?.remove(); gameLayer = null;
    s.turn.region = loc.region;
    G.setLocation(loc.id, { teleport: true });
    s.turn.running = true;
    await banner(`🧪 ${loc.emoji || ""} ${loc.name}`, 900, "loc");
    await arrive(s, loc);
    render();
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
        RV.revivalOpen() || s.revival?.phase === "intro" ? h("div.sh-mission.rv-head", "🔄 패자부활전 ", s.mission?.revival ? h("span", "· ", s.mission.text) : h("span.muted", "· Survival Land")) :
        s.mission ? h("div.sh-mission", "📜 ", s.mission.text) : h("div.sh-mission.muted", { select: "참가자 선발 중", final: "최종 결승전", done: "시즌 종료" }[s.status] || ""),
        h("div.sh-right", h("span", `생존 ${G.alive().length}/${s.roster.length || CONFIG.SEASON_SIZE}`),
            h("button.btn.ghost.small", { onclick: showLog }, "📋 로그")));
}
function showLog() {
    const s = G.S();
    const row = l => h("div", h("small", new Date(l.t).toLocaleTimeString()), " ", l.msg);
    const pid = s.turn?.pid;
    // 🎮 during a turn: only the lines about the player who is playing (tagged pid or their name in the text)
    if (!pid) return modal(h("div.log", s.log.map(row)), { title: "시즌 로그" });
    const p = Store.player(pid), names = [p?.name_ko, p?.player_name, G.name(pid)].filter(x => x && x.length >= 1);
    const mine = s.log.filter(l => l.pids?.includes(pid) || names.some(n => l.msg.includes(n)));
    let all = false;
    const list = h("div.log");
    const tabs = h("div.tabs");
    const draw = () => {
        tabs.replaceChildren(h("button.tab" + (!all ? ".on" : ""), { onclick: () => { all = false; draw(); } }, `👤 ${G.name(pid)} (${mine.length})`),
            h("button.tab" + (all ? ".on" : ""), { onclick: () => { all = true; draw(); } }, `📋 전체 (${s.log.length})`));
        const rows = all ? s.log : mine;
        list.replaceChildren(...(rows.length ? rows.map(row) : [h("p.muted", "이 플레이어와 관련된 로그가 없습니다.")]));
    };
    draw();
    modal(h("div", tabs, list), { title: `${G.name(pid)} 로그` });
}

let rosterOpen = false; // 참가자 명단 fold during a turn (kept while the sidebar re-renders)
// 🍀 pet luck + ✨ pet effect luck, each on its own line, whole numbers
function luckLines(luck) {
    const r = n => Math.round(n || 0);
    const pet = (luck.sources || []).filter(x => x.kind === "pet"), fx = (luck.sources || []).filter(x => x.kind === "fx");
    const sum = (list, special) => r(list.reduce((a, x) => a + (special && !x.special ? 0 : x.boost), 0));
    const tip = "착용한 펫·펫효과가 올려 주는 당첨 확률 보너스입니다 (전적이 아닙니다). 펫이 없으면 +0%.";
    return [
        h("div.luck", { title: tip }, `🍀 펫 행운: 당첨 확률 +${sum(pet)}%`, sum(pet, true) ? h("span", ` · 보너스 +${sum(pet, true)}%`) : null),
        h("div.luck.fx", { title: tip }, `✨ 펫효과 행운: 당첨 확률 +${sum(fx)}%`, sum(fx, true) ? h("span", ` · 보너스 +${sum(fx, true)}%`) : null),
        fx.length || pet.length ? h("div.luck.total", `합계 +${r(luck.pct)}%${luck.bonusPct ? ` · 보너스 +${r(luck.bonusPct)}%` : ""} (최대 30%)`) : null];
}

function sidebar(s) {
    // survivors first (richest on top), then the eliminated in the order they went out:
    // the latest one right under the survivors … the first one out (20위) at the very bottom
    const list = s.roster.length ? [...s.roster].sort((a, b) => (s.ps[a].out - s.ps[b].out)
        || (s.ps[a].out ? (s.ps[a].rank || 99) - (s.ps[b].rank || 99) : s.ps[b].money - s.ps[a].money)) : [];
    // during a turn the player's EmoMon party sits on top; the participant list shrinks to a minimum
    const emoPid = s.status === "turns" && s.turn?.pid != null && !s.turn.done ? s.turn.pid : null;
    const rows = h("div.roster-list", list.map(pid => {
            const r = s.results[pid];
            const out = s.ps[pid].out;
            const mark = out ? "" : s.status === "turns" || s.status === "judge" ? (r ? (r.pass ? "✅" : "❌") : (s.turn?.pid === pid ? "🎮" : "")) : "";
            const cand = s.status === "judge" && s.candidates.includes(pid);
            // eliminated: the rank sits small under the heart, so the name keeps its width
            const hp = h("span.hp.hp-gauges" + (s.ps[pid].hp < 50 ? ".low" : ""), vitals(s.ps[pid], { mini: true }));
            const el = miniPlayer(pid, s.ps[pid], [h("span.rno", `#${G.rosterNo(pid)}`),
                out ? h("span.hp-col", hp, h("small.out-rank", s.ps[pid].rank ? `💀 ${s.ps[pid].rank}위` : "💀")) : hp,
                mark ? h("span.mark", mark) : null]);
            if (cand) el.classList.add("cand");
            el.onclick = () => modal(playerCard(pid, s.ps[pid]), { title: displayName(Store.player(pid)), wide: true });
            return el;
        }));
    // during a turn the list is folded under the EmoMon party: "참가자 명단" opens it
    return h("aside.roster" + (emoPid != null ? ".emo-on" : ""),
        emoPid != null ? emoPartySide(emoPid, () => document.dispatchEvent(new Event("emo:change"))) : null,
        emoPid != null ? h("details.roster-fold", { open: rosterOpen, ontoggle: e => { rosterOpen = e.target.open; } }, h("summary.roster-title", `👥 참가자 명단 (${s.roster.length}명)`), rows)
            : [h("div.roster-title", `참가자 ${s.roster.length}명`), rows]);
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
        const p = G.nextSelection();
        if (!p) { spinning = false; return render(); }
        await machine.spin(p.id, G.selectionPool(), { tense: true });
        G.addToRoster(p.id);
        await reveal(p.id);
        await loanPenaltyPopups();
        spinning = false;
        render();
    } }, "🎰 SPIN");
    const skipBtn = h("button.btn.ghost.big", { onclick: async () => {
        if (spinning) return;
        for (const p of G.restSelection()) G.addToRoster(p.id);
        Sound.bonus(); confetti(60);
        await loanPenaltyPopups();
        render();
    } }, "⏭ SKIP (나머지 즉시 선발)");
    const full = G.rosterFull();
    // quota board: 3 per country + 2 free · 10 male / 10 female · 10 JAMES / 10 DYLAN
    const qc = G.selectionCounts(s.roster), half = CONFIG.SEASON_SIZE / 2;
    const chip = (label, n, goal) => h("span.sq-chip" + (n >= goal ? ".ok" : ""), `${label} ${n}/${goal}`);
    const quota = h("div.sel-quota",
        h("div", h("small", "국가별 3명 + 자유 2명"), G.SELECT_COUNTRIES.map(c => chip(c, qc.country[c] || 0, G.SELECT_PER_COUNTRY))),
        h("div", h("small", "성별 · 전담자"), chip("♂ 남자", qc.gender.male || 0, half), chip("♀ 여자", qc.gender.female || 0, half), chip("JAMES", qc.handler.JAMES || 0, half), chip("DYLAN", qc.handler.DYLAN || 0, half)));
    return h("div.select-stage",
        h("h2.stage-title", "🎰 시즌 참가자 선발 🎰", h("small", `${s.roster.length} / ${CONFIG.SEASON_SIZE}`)),
        quota,
        G.prevSeasonPlayers().size ? h("p.muted.center", `지난 시즌 참가자는 다시 뽑힐 확률이 ${Math.round(G.REPICK_WEIGHT * 100)}%로 낮아집니다 (연속 출전 방지)`) : null,
        machine.el,
        full ? h("div.row.center", h("button.btn.gold.huge", { onclick: () => { G.startRound(); render(); } }, "▶ 라운드 1 시작")) : h("div.row.center", spinBtn, skipBtn),
        grid);
}
// 🏦 picked again after being eliminated with an unpaid loan → explain the 100,000G penalty
async function loanPenaltyPopups() {
    const s = G.S();
    for (const pid of s.roster) {
        const lp = s.ps[pid]?.loanPenalty;
        if (!lp || lp.shown) continue;
        lp.shown = true; Store.saveSeason();
        Sound.lose();
        await alertBox("🏦 대출 미상환 페널티", [
            h("div.lp-pop", avatar(pid, 90), h("b", displayName(Store.player(pid)))),
            `시즌 ${lp.season}에서 대출 ${fmt(lp.owed)}G (원금 ${fmt(lp.principal)}G)를 갚지 않은 채로 ${lp.out ? "탈락" : "시즌을 마쳤"}습니다.`,
            "✅ 남은 대출금은 모두 감면(탕감)되어 이번 시즌에 빚은 없습니다.",
            `⚠️ 하지만 페널티로 이번 시즌 골드는 시작 골드 ${fmt(CONFIG.START_MONEY)}G 대신 ${fmt(G.LOAN_PENALTY_GOLD)}G만 지급됩니다.${lp.carried ? ` (지난 시즌 보유 골드 ${fmt(lp.carried)}G도 이월되지 않습니다)` : ""}`,
            "이유: 빌린 돈을 갚지 않고 탈락하면 은행이 빚을 탕감해 주는 대신, 신용 불량 페널티로 다음 시즌 자금을 제한합니다. 포인트 · 아이템 · 펫 · 무기 · 몬스터는 그대로 가져옵니다."
        ], "warn");
    }
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
    const cards = ms.map(m => h("div.mcard", { "data-id": m.id }, h("div.mc-ico", { bonus: "🎁", slot_net: "🎰", casino_net: "🃏", points: "💎", jackpot: "💰", battle: "⚔️", combo: "🎰🃏", five: "5️⃣", freespin: "🆓", slot_wins: "🏆", beg_max: "🥺", job_min: "💼", card: "🔤", has: "🐾", rank: "📉", bonus_in: "⏱️", brand_win: "🏷️", job_done: "💼", bet_win: "💵", home_map: "🏠", region_map: "🧭", npc_hit: "👼", earn_min: "💪", spell: "🐝", cm_post: "💬", arena_win: "🏟️", sugar_max: "🍬", handpay: "🤲", kidnap_freed: "⛓️", promo_vote: "🗳️" }[m.type] || "📜"), h("div.mc-text", m.text)));
    let done = false;
    const btn = h("button.btn.gold.huge", { onclick: async () => {
        if (done) return; done = true; btn.disabled = true;
        const target = G.pickMission(ms); // round 1: a battle mission at most 20%
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
        if (G.S().status === "battle" && await seasonLottoCheck()) { render(); return; } // 🎟️ season lotto before the battle
    } }, "📜 미션 뽑기");
    return h("div.mission-stage",
        s.loanDeaths?.length ? h("div.loan-deaths", h("b", "☠️ 대출 미상환 사망"), s.loanDeaths.map(pid => h("div.cand-card", avatar(pid, 70, { effect: false }), h("small", displayName(Store.player(pid)))))) : null,
        sickTickNotice(s),
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
    // 🔄 패자부활전: straight into Survival Land (no region roulette, no lotto / promo)
    if (RV.revivalTurns()) return h("div.preturn.rv-preturn",
        h("h2.stage-title", `🔄 패자부활 ${s.turnIdx + 1}번째 플레이어`, h("small", `${s.order.length}명 중`)),
        playerCard(pid, ps),
        h("p.notice.center", `❤ FULL HP · 💰 패자부활전 골드 ${fmt(RV.REVIVAL_GOLD)}G · 🔒 Survival Land에서는 턴을 끝낼 수 없습니다 (5분 동안 플레이) · 미션 실패 = 바로 탈락 · 성공 + 생존 = 🏝️ 생존자 공간`),
        h("div.row.center",
            h("button.btn.gold.huge", { onclick: () => { G.startTurn(); G.enterRegion("survival"); render(); } }, "🔄 턴 시작 — Survival Land 맵 뽑기"),
            h("button.btn.ghost", { onclick: async () => { if (await confirmBox(`${displayName(Store.player(pid))}의 패자부활 턴을 건너뛸까요? (미션 실패 처리)`)) { G.startTurn(); G.endTurn(); render(); } } }, "턴 건너뛰기")));
    return h("div.preturn",
        h("h2.stage-title", `${s.turnIdx + 1}번째 플레이어`),
        playerCard(pid, ps),
        h("div.row.center",
            h("button.btn.gold.huge", { onclick: async () => { G.startTurn(); render(); await seasonLottoCheck(); render(); await promoAtTurn(pid); render(); await employAtTurn(pid); render(); } }, "🌍 턴 시작 — 지역 뽑기"),
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
        // 랜덤랜드 / 리치랜드: a refused or unpaid entry goes straight to the region's fallback map
        const fb = region.fallback && LOC_BY_ID[region.fallback] && !LOC_BY_ID[region.fallback].off ? LOC_BY_ID[region.fallback] : null;
        // 💰 Rich Land: 🥣 거지쉼터 is where a refusal may land (40%) — it is not drawn on the roulette itself while other maps are open
        if (region.id === "richland" && fb) for (const l of acc) if (l.id === fb.id && acc.length > 1) tried.add(l.id);
        let pool = acc.filter(l => !tried.has(l.id));
        while (pool.length) {
            const target = pick(pool);
            await map.roulette(pool, target.id);
            await banner(`${target.emoji} ${target.name}`, 1400, "loc");
            // 🔐 Bunker: no Access Card → a random Dead Land / Difficult Land / NPC Land map
            // 💰 Rich Land: refusing the fee → 40% 거지쉼터 / 30% Dead Land / 30% Difficult Land (drawn after the refusal)
            const rich = region.id === "richland" && !target.accessCard && fb && fb.id !== target.id;
            let tfb = target.accessCard ? bunkerFallback() : fb && fb.id !== target.id ? fb : null;
            let ok = await entryCheck(pid, target, pool.length > 1, tfb, rich);
            if (!ok && rich) tfb = richFallback() || tfb;
            // ⚔️ Battle Town gate · 🎡 Death Door wheel (death ends the turn right here)
            if (ok) {
                const ex = await extraEntry(pid, target);
                if (ex === "dead" || !s.turn) { render(); return; }
                ok = ex === "ok";
                if (ok && target.deathWheel) s.turn.wheelAt = target.id;
                if (!ok && rich) tfb = richFallback() || tfb; // 💰 the random fallback (40/30/30) — not always the shelter
            }
            if (ok) {
                G.setLocation(target.id);
                s.turn.running = true;
                await arrive(s, target);
                render();
                return;
            }
            if (tfb) {
                s.turn.region = tfb.region; s.turn.npc = null;
                G.setLocation(tfb.id, { teleport: true });
                s.turn.running = true;
                await banner(`${tfb.emoji} ${tfb.name}`, 1400, "loc");
                await arrive(s, tfb);
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
            ? `💰 리치랜드: 입장료를 꼭 물어봅니다. 안 내거나 낼 돈·포인트가 부족하면 🥣 거지쉼터 40% · ☠️ Dead Land 30% · 🧗 Difficult Land 30% 중 한 곳으로 갑니다.`
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
// 🗺️ random map ticket: draw a map; if it asks for an entry fee or gear, ask first —
// "Yes" pays and goes, "No, to other maps" goes to another random map with no fee / gear.
const RANDOM_MAP_ASK = "랜덤 맵권을 사용해 모든 지역의 맵 중 한 곳으로 바로 이동할까요?\n• 국적 전용 · 제한구역 맵도 조건과 상관없이 나올 수 있습니다\n• 입장료나 장비(산소통·우주복·날개)가 필요한 맵이 나오면 낼지 먼저 물어봅니다";
async function randomMapGo() {
    const d = G.drawRandomMap();
    if (!d) return null;
    let loc = d.loc;
    if (d.cost) {
        const c = d.cost;
        const lines = [c.fee ? `💰 입장료 ${fmt(c.fee)} G` : "", c.feePts ? `💎 입장료 ${c.feePts} P` : "", c.gear.length ? `🎒 사용 아이템: ${c.gear.map(G.gearName).join(" + ")}` : ""].filter(Boolean);
        const yes = await new Promise(res => {
            const m = modal(h("div.confirm",
                h("p", h("b", `${loc.emoji || "🗺️"} ${loc.name}`), " 맵으로 이동을 위해 입장료를 내거나 아이템을 사용하겠습니까?"),
                ...lines.map(t => h("p.small", t)),
                h("div.row.end",
                    h("button.btn.ghost", { onclick: () => { m.close(); res(false); } }, "No, to other maps"),
                    h("button.btn.gold", { onclick: () => { m.close(); res(true); } }, "Yes"))), { title: "🗺️ 랜덤 맵권", closable: false });
        });
        if (!yes) {
            loc = G.drawFreeRandomMap(loc.id);
            if (!loc) { toast("입장료·아이템 조건이 없는 맵이 없어 이동하지 못했습니다 (랜덤 맵권은 그대로 남아 있습니다)", "warn", 4000); return null; }
        }
    }
    return G.useRandomMap(loc.id);
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
    // 🎡 Death Door reached by a map pass / random map ticket: the wheel still spins
    if (loc.deathWheel && s.turn.wheelAt !== loc.id) {
        s.turn.wheelAt = loc.id;
        if (!(await deathWheel(pid, loc)) || !s.turn) return false;
    }
    const ok = await arriveBase(s, loc);
    if (ok && s.turn) await arrivalExtra(s, loc);
    return ok && !!s.turn;
}
async function arriveBase(s, loc) {
    const pid = s.turn?.pid;
    if (!pid) return false;
    if (loc.crazy) {
        const cut = G.crazyCut();
        if (cut) { Sound.boom(); await alertBox("🤪 CRAZY CASINO 경고!", [`Crazy Casino에 입장하여 플레이 시간 ${Math.round(cut / 60)}분이 바로 차감되었습니다!`, `남은 시간: ${fmtTime(s.turn.remaining)}`, "다른 맵으로 이동해도 남은 플레이 시간은 늘어나지 않습니다. (이 맵에서는 시간 연장권을 팔지 않습니다)"], "warn crazy"); }
    }
    if (loc.evil) {
        const r = G.hpToll(pid, loc.evil, `${loc.emoji} ${loc.name}`);
        Sound.boom();
        await alertBox("😈 EVIL TOWN", r.dead ? [`HP가 ${loc.evil} 이하인 상태로 Evil Town에 들어와… 사망했습니다! ☠️`] : [`Evil Town의 저주! HP −${loc.evil}`, `남은 HP ❤ ${Math.round(r.hp * 100) / 100}`], "warn evil");
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
            await alertBox("🎁 기부할 아이템이 없습니다", r.dead ? ["기부할 아이템도 없고 HP도 10 이하… 사망했습니다! ☠️"] : ["기부 대신 HP −10", `남은 HP ❤ ${Math.round(r.hp * 100) / 100}`], "warn");
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
        await regionWarning(target);
        render();
    } }, "🌍 지역 룰렛 돌리기");
    const passRow = passes.length ? h("div.pass-row", h("b", "🎟️ 맵권 사용 → 바로 이동:"), passes.map(it => h("button.btn.small.gold", { onclick: async () => {
        const loc = LOC_BY_ID[it.loc];
        if (G.deadPassBlocked(it.id)) return toast(G.DEAD_PASS_TEXT, "warn", 3500);
        if (!(await tryPass(pid, it))) return;
        if (G.usePassTeleport(it.id)) { s.turn.running = true; Sound.bonus(); await banner(`🎟️ ${loc.emoji} ${loc.name}`, 1400, "loc"); await arrive(s, loc); render(); }
    } }, `${LOC_BY_ID[it.loc]?.emoji || "🎟️"} ${LOC_BY_ID[it.loc]?.name} ×${ps.items[it.id]}`, passBlocked(pid, LOC_BY_ID[it.loc]) || G.deadPassBlocked(it.id) ? " 🔒" : ""))) : null;
    const randomRow = ps.items.map_random > 0 ? h("div.pass-row", h("b", "🗺️ 랜덤 맵권:"), h("button.btn.small.gold", { onclick: async () => {
        if (!(await confirmBox(RANDOM_MAP_ASK))) return;
        const loc = await randomMapGo();
        if (!loc) return toast("이동할 수 있는 맵이 없습니다", "warn");
        s.turn.running = true; Sound.bonus(); await banner(`🗺️ ${loc.emoji} ${loc.name}`, 1400, "loc"); await arrive(s, loc); render();
    } }, `🗺️ 랜덤 맵으로 이동 ×${ps.items.map_random}`)) : null;
    return h("div.map-stage",
        h("div.map-head", avatar(pid, 56), h("div", h("b", displayName(Store.player(pid))), h("div.muted", `${Store.player(pid).country} · 선택 가능한 지역 ${avail.length}곳`)), btn),
        s.sandbox && LOC_BY_ID[s.sandboxStart] ? h("div.pass-row", h("b", "🧪 테스트:"), h("button.btn.gold", { onclick: () => sandboxJump(s, s.sandboxStart) }, `📍 ${LOC_BY_ID[s.sandboxStart].emoji || ""} ${LOC_BY_ID[s.sandboxStart].name}(으)로 바로 입장`)) : null,
        passRow, randomRow,
        rmap.el,
        h("p.muted.center", "☁️ 하늘나라 = 🪽 날개 · 🪐 우주 = 🧑‍🚀 우주복 · 🌊 심해 = 🤿 산소통이 있어야 뽑힐 수 있어요 (입장 시 소모 · 일반 상점) · 🧩 콤보랜드 = 셋 중 하나만 있어도 뽑힘 (맵마다 필요한 장비를 입장 시 사용)"));
}
// random-entry maps: the bouncer flips a coin. A refused player may spend any alphabet card to force it.
// Then an entry fee is ASKED (리치랜드) and gear is confirmed before it is used up.
// fallback: where a refused player goes (랜덤랜드 / 리치랜드) instead of re-rolling.
async function entryCheck(pid, loc, canRetry, fallback = null, rich = false) {
    const ce = G.canEnter(pid, loc);
    const after = rich ? ` 아래 중 랜덤한 곳으로 이동합니다.\n${RICH_FALLBACK_TEXT}` : fallback ? ` ${fallback.emoji} ${fallback.name}(으)로 이동합니다.` : canRetry ? " 다른 카지노를 다시 뽑습니다." : "";
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
    if (ce.ask && loc.accessCard) {
        // 🔐 Bunker door: buy the 🪪 Access Card or get sent away
        if (ce.short) {
            Sound.lose();
            await alertBox("🪪 Access Card", [`${loc.emoji} ${loc.name}의 Access Card(출입증)는 ${fmt(ce.fee)} G입니다.`, `골드가 부족해 출입증을 살 수 없습니다…${after}`], "warn");
            return false;
        }
        if (!(await askAccessCard(loc))) return false;
    } else if (ce.ask) {
        const what = ce.fee ? `${fmt(ce.fee)} G` : `${ce.feePts} P`;
        if (ce.short) {
            Sound.lose();
            await alertBox("💰 입장료 부족", [`${loc.emoji} ${loc.name}의 입장료는 ${what}입니다.`, `${ce.fee ? "골드" : "포인트"}가 부족해 들어갈 수 없습니다…${after}`], "warn");
            return false;
        }
        const askFee = () => confirmBox(`${loc.emoji} ${loc.name}의 입장료는 ${what}입니다.\n입장료를 내고 들어갈까요?${rich ? `\n(안 내면 랜덤한 곳으로 갑니다)\n${RICH_FALLBACK_TEXT}` : fallback ? `\n(안 내면 ${fallback.emoji} ${fallback.name}(으)로 갑니다)` : ""}`, "내고 입장", "안 낸다");
        if (!(await askFee())) {
            if (!rich) return false;
            // 💰 Rich Land: one "are you sure?" — No gives exactly one more chance to pay; refusing again goes straight away
            if (await confirmBox(`정말로 입장을 거부하고 아래의 랜덤한 곳으로 이동하시겠습니까?\n${RICH_FALLBACK_TEXT}`, "Yes, 이동", "No")) return false;
            if (!(await askFee())) return false;
        }
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
            bankAccount(pid) ? h("div.stat.bgold", h("small", `Business Gold · ${bankAccount(pid).code}`), h("b", fmt(bankAccount(pid).bgold) + " BG")) : null,
            h("div.stat.stat-vitals", vitals(ps, { compact: true }), h("small.vit-next", `🍚 −10까지 ${fmtTime(LF.nextDrainIn(t))}`)),
            h("div.stat", h("small", "남은 횟수"), h("b", `🎰 ${G.playsLeft(pid, "slot")} · 🃏 ${G.playsLeft(pid, "casino")}`)),
            h("div.stat", h("small", "슬롯 손익"), h("b" + (t.stats.slotNet >= 0 ? ".up" : ".down"), fmt(t.stats.slotNet))),
            h("div.stat", h("small", "카지노 손익"), h("b" + (t.stats.casinoNet >= 0 ? ".up" : ".down"), fmt(t.stats.casinoNet))),
            h("div.stat", h("small", "이번 턴 포인트"), h("b", String(t.stats.points))),
            h("div.stat", h("small", "보너스 / 잭팟"), h("b", `${t.stats.bonus} / ${t.stats.jackpot || "-"}`)),
            G.boostLeft("slot") ? h("div.stat.boost", h("small", "🎰 슬롯 보너스 UP"), h("b", `${G.boostLeft("slot")}초`)) : null,
            G.boostLeft("casino") ? h("div.stat.boost", h("small", "🃏 카지노 상금 UP"), h("b", `${G.boostLeft("casino")}초`)) : null,
            t.arizal && !t.arizal.done ? h("div.stat.boost", h("small", "🧪 Arizal Tech Test"), h("b", `${Math.max(0, Math.ceil((t.arizal.until - Date.now()) / 1000))}초 · ${fmt(t.arizal.won || 0)}G`)) : null].filter(Boolean));
        wx?.update();
    };
    const wx = loc.kidnap ? null : weatherHud(t);
    updateHud();

    const pauseBtn = h("button.btn.ghost.small", { onclick: () => { t.running = !t.running; pauseBtn.textContent = t.running ? "⏸ 일시정지" : "▶ 재개"; updateHud(); Store.saveSeason(); } }, t.running ? "⏸ 일시정지" : "▶ 재개");
    // 🔒 Hell · Sugar · Terror · Jail · Cursed · Radioactive: the turn can only end with ≤ 5 min left
    const endBtn = loc.noEnd ? h("span.rv-noend", { title: "Survival Land의 모든 맵은 턴 종료가 불가능합니다 — 시간이 끝날 때까지 플레이" }, "🔒 턴 종료 불가") : h("button.btn.red.small", { onclick: async () => {
        if (endLocked(loc, t)) return toast(endLockText(loc, t), "warn", 3500);
        if (await confirmBox("턴을 종료할까요?")) finishTurn();
    } }, "⏹ 턴 종료");
    const lockEnd = () => {
        if (loc.noEnd) return;
        const l = endLocked(loc, t); endBtn.classList.toggle("locked", l);
        endBtn.textContent = !l ? "⏹ 턴 종료" : loc.kidnap ? (kidnapLockLeft(t) > 0 && t.remaining > 0 ? `🔒 턴 종료 (${fmtTime(Math.ceil(kidnapLockLeft(t)))} 후)` : "🔒 탈출을 시도해야 턴 종료") : `🔒 턴 종료 (${fmtTime(t.remaining - END_LOCK_LEFT)} 후)`;
    };

    const ctx = kind => ({
        pid,
        // pet luck + the 30 s booster item (boost: true while it runs)
        get luck() { return { ...luck, boost: G.boostLeft(kind) > 0 }; },
        money: () => G.playMoney(pid),
        canPlay: () => t.remaining <= 0 ? { ok: false, why: "⏰ 시간 종료!" } : !t.running && !(loc.arcade && cornerPaused) ? { ok: false, why: "⏸ 일시정지 중입니다" }
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
        // 🔥 Inferno Casino death games: the player dies on the spot, the turn is over
        kill: async why => {
            if (G.killPlayer(pid, why, { quiet: true }) === false) { updateHud(); return; } // 🎭 death shield
            clearInterval(timer); fx.stop(); gameLayer?.remove(); gameLayer = null;
            Sound.boom();
            await deathPopup(pid, why);
            render();
        },
        close() { gameLayer?.remove(); gameLayer = null; tabBody(currentTab); }
    });
    function openGame(kind, id) {
        if (t.remaining <= 0) return toast("시간이 종료되었습니다", "warn");
        gameLayer?.remove();
        // 🥶 Cursed Casino: the same game with 10% less RTP
        const el = kind === "slot" ? openSlot(cursedConfig("slot", SLOT_BY_ID[id], loc), ctx("slot")) : openCasino(cursedConfig("casino", CASINO_BY_ID[id], loc), ctx("casino"));
        gameLayer = h("div.game-layer", el);
        root.querySelector(".loc-main").append(gameLayer);
    }

    // tabs
    // rebuilt on every tab change, so a business bought / moved / closed here shows up at once
    const rev = RV.inRevival(pid);
    // 🕹️ Arcade: only the corners found inside the game show up
    const arcadeTabs = () => [["arcade", "🕹️ ARCADE"], ...(t.arcade?.found || []).map(k => [CORNER_KINDS[k].tab, `${CORNER_KINDS[k].emoji} ${CORNER_KINDS[k].label}`]), ["inv", "🎒 인벤토리"], ["emo:dex", "📖 EmoMon Dex"], ["card", "🪪 프로필"]];
    // 👫 내 친구: on every map · 🤝 도움주기: on this season's 20 help maps
    // 🍚 food corners · 🏨 lodging · 🏢 employment (every map; the hired player sees their company instead)
    const lifeTabs = () => loc.kidnap ? [] : [
        ...LF.foodCornersAt(loc).map((c, i) => ["food:" + i, `${c.emoji} ${c.name}`]),
        ...LF.lodgesAt(loc, pid).map(c => ["lodge:" + c.k, `${c.emoji} ${c.name}`]),
        ...(rev || (loc.arcade && !(t.arcade?.found || []).length) ? [] : EP.employer(pid) ? [["company", `${EP.companyOf(pid)?.emoji || "🏢"} ${EP.companyOf(pid)?.name || "회사"}`]] : [["employ", "🏢 취업"]])];
    const tabList = () => { const l = tabList0(), at = Math.max(0, l.findIndex(([k]) => k === "inv")); l.splice(at, 0, ...lifeTabs(), ...(SO.helpHere(loc) ? [["help", "🤝 도움주기"]] : []), ...(SO.friendsHere(loc) ? [["friends", "👫 내 친구"]] : [])); return l; };
    const tabList0 = () => loc.kidnap ? [["kidnap", "⛓️ 납치 공간"], ["inv", "🎒 인벤토리"], ["card", "🪪 프로필"]] : loc.arcade ? arcadeTabs() : [["games", "🎰 게임"], ...(loc.community ? [["community", "💬 커뮤니티"]] : []), ...(loc.arena ? [["arena", "🏟️ 아레나"]] : []), ...locationShops(loc).map(sid => ["shop:" + sid, SHOPS[sid].icon + " " + SHOPS[sid].name]),
        ...(loc.discount ? [["shop:discount", "🏷️ 할인 상점"]] : []),
        ...(earnKinds(loc).length ? [["earn", "💪 돈벌기"]] : []), ...(loc.job ? [["job", "💼 직업"]] : []), ...(loc.beg ? [["beg", "🥺 구걸"]] : []), ...(loc.spell ? [["spell", "🐝 Spelling Bee"]] : []),
        ...honorKinds(loc).map(k => ["honor:" + k, `${HONOR_KINDS[k].emoji} ${HONOR_KINDS[k].name}`]),
        ...(loc.bank ? [["bank", "🏦 Business Bank"]] : []), ...(bizHubHere(loc) ? [["bizhub", "🏪 Self-Business"]] : []), ...bizTabs(loc),
        ...(loc.capture ? [["emo:capture", "🔍 EmoMon Capture"]] : []), ...(loc.hospital ? [["emo:hospital", "🏥 Monster Hospital"]] : []), ...(loc.lab ? [["emo:lab", "🧪 Monster Lab"]] : []), ...(loc.emoshop ? [["emo:shop", "🛒 Monster Shop"]] : []), ["emo:dex", "📖 EmoMon Dex"],
        ...(loc.lotto ? [["lotto", "🎟️ 로또"]] : []), ...(loc.highlight ? [["highlight", "🎬 Highlight"]] : []), ...(loc.dept ? [["dept", "🏬 백화점"]] : []), ...(loc.gotcha ? [["gotcha", "🎰 Monster Gotcha"]] : []), ["inv", "🎒 인벤토리"], ...(rev ? [] : [["loan", ps.loan ? "🏦 대출 상환" : "🏦 대출"]]), ["card", "🪪 프로필"]];
    const emoChanged = () => { updateHud(); side.replaceChildren(sideCard()); document.dispatchEvent(new Event("emo:change")); };
    const invWrap = el => h("div", rev ? revivalInvView(pid) : null, extraInventory(pid, () => { emoChanged(); if (currentTab === "inv") tabBody("inv"); }), lifeInventory(pid, () => { updateHud(); side.replaceChildren(sideCard()); }), el, emoInventory(pid, emoChanged));
    let currentTab = "games";
    const tabBar = h("div.tabs");
    const body = h("div.tab-body");
    const refreshTabs = () => tabBar.replaceChildren(...tabList().map(([k, label]) => h("button.tab" + (k === currentTab ? ".on" : ""), { onclick: () => tabBody(k) }, label)));
    const bizChanged = () => { updateHud(); side.replaceChildren(sideCard()); refreshTabs(); };
    const ARC_CORNER_TABS = Object.values(CORNER_KINDS).map(k => k.tab);
    function tabBody(id) {
        currentTab = id;
        // 🕹️ Arcade: using a corner found in the game (from the tab bar too) stops the turn clock until the arcade resumes
        if (loc.arcade && ARC_CORNER_TABS.includes(id) && !cornerPaused) { cornerPaused = true; t.running = false; arcadeInst?.pause?.(); updateHud(); }
        refreshTabs();
        let content;
        // 🔥 Inferno Casino: every corner is behind the death roulette (once open, it stays open for this visit)
        if (loc.inferno && !INFERNO_FREE.includes(id) && id !== "friends" && !(t.infOpen || []).includes(id)) {
            const label = tabList().find(([k]) => k === id)?.[1] || "코너";
            body.replaceChildren(infernoGate(pid, t, id, label, { onOpen: () => tabBody(id), onDead: () => { clearInterval(timer); fx.stop(); render(); }, onChange: () => { updateHud(); side.replaceChildren(sideCard()); } }));
            return;
        }
        if (id === "games" && !loc.slots.length && !loc.casino.length) content = h("p.notice.center", loc.stuck ? "🧗 Stuck Casino: 게임이 하나도 없습니다… 시간이 끝날 때까지 갇혀 있어야 합니다." : "🫥 이 맵에는 게임이 없습니다.");
        else if (id === "kidnap") content = kidnapView(pid, {
            onChange: () => { updateHud(); side.replaceChildren(sideCard()); },
            onDead: () => { clearInterval(timer); fx.stop(); render(); },
            // 🕊️ free: back to the region roulette with the time that is left
            onFreed: () => { if (t.remaining <= 0 && escapeWait) return escapeWait(); clearInterval(timer); fx.stop(); t.loc = null; t.region = null; t.npc = null; t.running = false; Store.saveSeason(true); render(); },
            onTried: () => escapeWait?.()
        });
        else if (id.startsWith("food:")) { const c = LF.foodCornersAt(loc)[+id.slice(5)]; content = c ? foodCornerView(pid, c, `${loc.id}:${id.slice(5)}`, { turn: t, onChange: () => { updateHud(); side.replaceChildren(sideCard()); } }) : h("p.notice", "코너가 없습니다"); }
        else if (id.startsWith("lodge:")) { const c = LF.lodgesAt(loc, pid).find(x => x.k === id.slice(6)); content = c ? lodgeView(pid, loc, c, { turn: t, onChange: () => { updateHud(); side.replaceChildren(sideCard()); } }) : h("p.notice", "숙소가 없습니다"); }
        else if (id === "employ") content = employView(pid, { turn: t, onChange: () => { updateHud(); side.replaceChildren(sideCard()); if (EP.employer(pid)) { refreshTabs(); } } });
        else if (id === "company") content = companyView(pid, { turn: t, onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
        else if (id === "community") content = communityView(pid, { onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
        else if (id === "friends") content = friendsView(pid, { onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
        else if (id === "help") content = helpView(pid, { turn: t, onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
        else if (id === "arena") content = arenaView(pid, { turn: t, onChange: () => { updateHud(); side.replaceChildren(sideCard()); document.dispatchEvent(new Event("emo:change")); } });
        else if (id === "arcade") content = arcadeFor(pid, t).el;
        else if (id === "arc:slot" || id === "arc:casino") content = h("div", h("div.rv-arc-back", "🕹️ 아케이드 안의 코너 — 이용하는 동안 시간이 멈춥니다 ", h("button.btn.small.gold", { onclick: () => tabBody("arcade") }, "🕹️ 아케이드로 돌아가기")),
            h("div.game-list", ...(id === "arc:slot" ? loc.slots.filter(sid => !SLOT_BY_ID[sid].off).map(sid => { const c = SLOT_BY_ID[sid]; return h("button.gcard.slot", { style: { "--bg": c.theme.bg, "--accent": c.theme.accent }, onclick: () => openGame("slot", sid) },
                h("div.gc-kind", "SLOT · ARCADE"), h("div.gc-name", c.name), h("div.gc-brand", c.brand || " "), h("div.gc-desc", shortDesc(c.desc))); })
                : loc.casino.filter(cid => !CASINO_BY_ID[cid].off).map(cid => { const g = CASINO_BY_ID[cid]; return h("button.gcard.casino", { onclick: () => openGame("casino", cid) },
                h("div.gc-kind", `CASINO · ${String(g.kind || "GAME").toUpperCase()}`), h("div.gc-name", h("span.gc-ico", g.icon), " ", g.name), h("div.gc-brand", "GAMBLERS ARCADE"), h("div.gc-desc", shortDesc(g.desc))); }))));
        else if (id === "games") content = h("div.game-list",
            ...loc.slots.filter(sid => !SLOT_BY_ID[sid].off).map(sid => { const c = SLOT_BY_ID[sid]; return h("button.gcard.slot", { style: { "--bg": c.theme.bg, "--accent": c.theme.accent }, onclick: () => openGame("slot", sid) },
                h("div.gc-kind", c.progressive === false ? "SLOT · CLASSIC" : "SLOT · PROGRESSIVE"), h("div.gc-name", c.name), h("div.gc-brand", c.brand || " "), h("div.gc-desc", shortDesc(c.desc))); }),
            ...loc.casino.filter(cid => !CASINO_BY_ID[cid].off).map(cid => { const g = CASINO_BY_ID[cid]; return h("button.gcard.casino", { onclick: () => openGame("casino", cid) },
                h("div.gc-kind", `CASINO · ${String(g.kind || "GAME").toUpperCase()}`), h("div.gc-name", h("span.gc-ico", g.icon), " ", g.name), h("div.gc-brand", "GAMBLERS CASINO"), h("div.gc-desc", shortDesc(g.desc))); }));
        else if (id.startsWith("shop:")) content = shopView(id.slice(5), pid, loc.id, () => { updateHud(); side.replaceChildren(sideCard()); });
        else if (id === "inv") content = invWrap(inventoryView(pid, {
            onUseTime: () => { ps.items.time_ext--; t.remaining += CONFIG.EXTEND_SECONDS; G.log(`⏱️ ${displayName(Store.player(pid))} 5분 연장!`); Store.saveSeason(); updateHud(); toast("+5분!", "ok"); },
            onMission: () => { if (G.useMissionPass()) { toast(rev ? "🎫 미션완료권 사용! 패자부활 미션 통과 (5분을 끝까지 버티면 생존자 공간으로)" : "🎫 미션완료권 사용! 이번 라운드 통과", "ok", 4000); updateHud(); } },
            onHp: (item, n) => { const r = G.useHpItem(pid, item, n); if (r < 0) toast("HP가 이미 가득 찼습니다", "warn"); else if (r > 0) { Sound.coin(); toast(`❤ HP +${Math.round(r * 100) / 100}`, "ok"); updateHud(); } },
            onPlays: (kind, item, n) => { if (G.addPlays(pid, kind, item, n)) { toast(kind === "slot" ? `🎰 슬롯 +${n}회` : `🃏 카지노 +${n}회`, "ok"); updateHud(); } },
            onChange: () => side.replaceChildren(sideCard()),
            onPass: id => movePass(id),
            onBoost: kind => { if (G.useBoost(kind)) { Sound.bonus(); toast(kind === "slot" ? "🎰 30초 동안 슬롯 보너스 확률 UP!" : "🃏 30초 동안 카지노 상금 확률 UP!", "ok"); updateHud(); } },
            onRandomMap: rev ? null : () => moveRandom(),
            onRemoteBank: rev ? null : () => remoteBank(pid, () => { updateHud(); side.replaceChildren(sideCard()); }),
            onRemoteBiz: rev ? null : () => remoteBiz(pid, () => { updateHud(); side.replaceChildren(sideCard()); }),
            onReports: () => reportList(pid),
            // ⏹️ 턴 종료권: ends the turn now, whatever lock the map has (🔄 Survival Land too)
            onEndTurn: async () => {
                if (!(ps.items.turn_end > 0) || finishing) return;
                if (!(await confirmBox("⏹️ 턴 종료권을 사용해 지금 바로 턴을 끝낼까요? (턴 종료 제약 무시 · 1회용)", "턴 종료", "취소"))) return;
                ps.items.turn_end--;
                G.log(`⏹️ ${displayName(Store.player(pid))} 턴 종료권 사용`);
                Store.saveSeason(true);
                finishTurn();
            }
        }));
        else if (id === "loan") content = loanView(pid, () => { updateHud(); tabBody("loan"); });
        else if (id === "earn") content = earnView(pid, () => { updateHud(); side.replaceChildren(sideCard()); tabBody("earn"); }, { loc, turn: t, updateHud });
        else if (id === "job") content = jobView(pid, t, () => { updateHud(); tabBody("job"); if (t.remaining <= 0) timeUp(); });
        else if (id === "beg") content = begView(pid, () => { updateHud(); tabBody("beg"); });
        else if (id === "spell") content = spellingView(pid, loc, () => { updateHud(); tabBody("spell"); });
        else if (id.startsWith("honor:")) content = honorView(pid, id.slice(6), { turn: t, onChange: () => { updateHud(); side.replaceChildren(sideCard()); if (currentTab === id) tabBody(id); } });
        else if (id === "bank") content = bankView(pid, { turn: t, onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
        else if (id === "bizhub") content = bizHubView(pid, loc, { turn: t, onChange: bizChanged });
        else if (id.startsWith("biz:")) content = bizView(pid, id.slice(4), { turn: t, onChange: bizChanged });
        else if (id === "emo:capture") content = captureView(pid, loc, { turn: t, onChange: emoChanged, onLeave: () => tabBody("games") });
        else if (id === "emo:hospital") content = hospitalView(pid, { onChange: emoChanged });
        else if (id === "emo:lab") content = labView(pid, { loc, onChange: emoChanged });
        else if (id === "emo:shop") content = monsterShopView(pid, loc, { onChange: emoChanged });
        else if (id === "emo:dex") content = emoDexTab(pid);
        else if (id === "lotto") content = lottoView(pid, { hold: lottoHold, onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
        else if (id === "highlight") content = highlightView(pid, { hold: () => { npcBusy = true; return () => { npcBusy = false; updateHud(); }; }, onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
        else if (id === "dept") content = deptView(pid, loc.id, { onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
        else if (id === "gotcha") content = gotchaView(pid, loc.id, { onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
        else content = playerCard(pid, ps);
        if (loc.arcade && cornerPaused && id !== "arcade" && !id.startsWith("arc:")) content = h("div", h("div.rv-arc-back", "🕹️ 아케이드 안의 코너 — 이용하는 동안 시간이 멈춥니다 ", h("button.btn.small.gold", { onclick: () => tabBody("arcade") }, "🕹️ 아케이드로 돌아가기")), content);
        // 🧊 Icy Castle: every corner behind an ice wall until the hammer breaks it
        if (loc.icy) content = iceWrap(loc, t, pid, id, content);
        body.replaceChildren(content);
    }
    const sideCard = () => h("div.loc-side-inner",
        avatar(pid, 120),
        h("div.ls-name", displayName(Store.player(pid)), companyMark(pid, 20)),
        vitals(ps),
        LF.sheltered(pid, loc.id) ? h("div.ls-shelter", `🏨 숙소에 머무는 중 — 날씨 · NPC 공격 보호`) : null,
        diseaseChips(pid),
        arizalBox(pid, t, () => { updateHud(); side.replaceChildren(sideCard()); }),
        h("div.ls-pet", ps.pet ? petView(ps.pet, ps.petEffect, 90) : h("div.muted", "펫 없음")),
        ...luckLines(luck),
        ps.petHelp ? h("div.luck.ph-sum", `🐾 펫 도움: 당첨 ${ps.petHelp.win || 0}회 · 보너스 ${ps.petHelp.bonus || 0}회`, ps.petHelp.gold ? h("small", ` (+${fmt(ps.petHelp.gold)} G)`) : null) : null,
        survivalSide(), // ⛪ Foggy Church: the devil statue
        ps.weapons.length ? h("div.wlist.small", ps.weapons.map(weaponChip)) : null,
        survivalMsgs()); // 📋 the statue's growth / disaster messages — under the weapons
    const side = h("div.loc-side", sideCard());
    // 🦠 a disease caught / cured anywhere (a mosquito bite, an NPC, a cure) → the profile shows it at once
    const onSick = e => { if (+e.detail?.pid === +pid && document.body.contains(side)) { side.replaceChildren(sideCard()); updateHud(); } else if (!document.body.contains(side)) document.removeEventListener("gb:sick", onSick); };
    document.addEventListener("gb:sick", onSick);
    // 🎟️ lotto draw show: the turn clock stops (no play time used, no NPC visits) until it is over
    const lottoHold = () => { const was = t.running; t.running = false; npcBusy = true; updateHud(); return () => { npcBusy = false; t.running = was; updateHud(); side.replaceChildren(sideCard()); Store.saveSeason(); }; };
    // map pass during the turn: move right away, the turn clock keeps running
    let moving = false;
    async function movePass(itemId) {
        const it = ITEM_BY_ID[itemId], to = LOC_BY_ID[it?.loc];
        if (!to || moving || to.id === loc.id) return;
        if (t.remaining <= 0) return toast("시간이 종료되었습니다", "warn");
        if (G.deadPassBlocked(itemId)) return toast(G.DEAD_PASS_TEXT, "warn", 3500);
        if (RV.revivalPassBlock(itemId)) return toast(RV.revivalPassBlock(itemId), "warn", 3500);
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
        if (G.deadPassBlocked(itemId)) return toast(G.DEAD_PASS_TEXT, "warn", 3500);
        if (root.querySelector(".game-screen .busy, .game-screen.busy")) return toast("스핀이 끝난 뒤에 이동하세요", "warn");
        if (!(await confirmBox(`🗺️ 랜덤 맵권을 사용해 입장 가능한 모든 지역의 맵 중 한 곳으로 지금 이동할까요?\n남은 시간 ${fmtTime(t.remaining)}은 그대로 이어집니다.\n${RANDOM_MAP_ASK.split("\n").slice(1).join("\n")}`, "이동하기", "취소"))) return;
        moving = true;
        const to = await randomMapGo();
        if (!to) { moving = false; return toast("이동할 수 있는 맵이 없습니다", "warn"); }
        clearInterval(timer);
        gameLayer?.remove(); gameLayer = null;
        Sound.bonus();
        await banner(`🗺️ ${to.emoji} ${to.name}`, 1400, "loc");
        await arrive(s, to);
        render();
    }
    // 🚫 no-pass maps (Hell · Sugar · Terror · Stuck · Jail · Cursed · Radioactive · kidnap room): no map passes here
    const passBtns = loc.noPass || loc.kidnap ? [] : G.passesOf(pid).filter(it => it.loc !== loc.id);
    // 🍬 sugar · 🌑 dark · 🌋 magma
    const fx = mapEffects(loc, t, pid, { root, onDead: () => { clearInterval(timer); gameLayer?.remove(); gameLayer = null; render(); }, onChange: () => { updateHud(); side.replaceChildren(sideCard()); } });
    if (survivalSide()) side.replaceChildren(sideCard()); // the statue exists only now
    // 🕹️ Arcade hooks (the arcade instance outlives re-renders of this screen)
    arcadeHooks = {
        hp: () => G.S().ps[pid]?.hp ?? 0,
        hurt: n => {
            const q = G.S().ps[pid];
            if (!q) return { dead: true };
            if (q.hp <= n) { if (G.killPlayer(pid, "🕹️ 아케이드에서 HP가 바닥나 사망") === false) { updateHud(); return { hp: q.hp }; } return { dead: true }; }
            q.hp -= n; Store.saveSeason(); updateHud(); return { hp: q.hp };
        },
        heal: n => { const q = G.S().ps[pid], add = Math.max(0, Math.min(n, CONFIG.START_HP - q.hp)); q.hp += add; Store.saveSeason(); updateHud(); return add; },
        // 💵 boss money: real gold — the player's OWN gold (kept aside during the revival), not the revival gold
        gold: n => { RV.addOwnGold(pid, n); updateHud(); return n; },
        onCorner: kind => { cornerPaused = true; t.running = false; updateHud(); refreshTabs(); tabBody(CORNER_KINDS[kind].tab); },
        onResume: () => { if (cornerPaused) { cornerPaused = false; t.running = true; updateHud(); } },
        onWin: () => { t.stats.arcadeBoss = true; G.log(`🕹️ ${displayName(Store.player(pid))} 아케이드 보스 격파!`); RV.grantBossPass(pid); updateHud(); toast("🏆 아케이드 보스 격파! 보상 🎫 미션완료권 획득 (🎒 인벤토리에서 사용)", "ok", 5000); },
        onDead: () => { clearInterval(timer); fx.stop(); gameLayer?.remove(); gameLayer = null; arcadeInst?.stop(); arcadeInst = null; render(); },
        onChange: () => updateHud()
    };
    tabBody(loc.kidnap ? "kidnap" : loc.arcade ? "arcade" : "games");

    // NPC corner: 40~70% chance of 1~3 attacks at random moments of the turn
    const npcHere = G.npcActive(loc.id);
    if (npcHere && !t.npc) { t.npc = scheduleNpc(t.remaining, loc.npc === "always"); Store.saveSeason(); }
    let npcBusy = false;
    async function npcCheck() {
        if (npcBusy || t.arena || !t.npc?.length || t.remaining > t.npc[0]) return; // 🏟️ no NPCs during an arena battle
        if (loc.revival && activityBusy()) return; // 🔄 Survival Land: never on top of a quiz / roulette / popup
        if (root.querySelector(".game-screen .busy, .game-screen.busy")) return; // wait for the spin to finish
        // 🎭 / 🧊 an attack that falls while Profile Copy (or Icy Breath) is still on is dropped — no second copy, no extra time
        if ((t.possessUntil || 0) > Date.now() || (t.freezeUntil || 0) > Date.now()) { t.npc.shift(); Store.saveSeason(); return; }
        if (LF.sheltered(pid, loc.id)) { t.npc.shift(); Store.saveSeason(); toast("🏨 숙소에 머무는 중이라 NPC가 들어오지 못했다!", "ok", 3000); G.log(`🏨 ${displayName(Store.player(pid))} 숙소 덕분에 NPC 공격을 피함`); return; }
        npcBusy = true;
        t.npc.shift();
        const was = t.running; t.running = false; updateHud();
        const out = await npcAttack(pid);
        npcBusy = false;
        if (out?.kill || out?.kidnap || !G.S().turn) { clearInterval(timer); fx.stop(); gameLayer?.remove(); gameLayer = null; render(); return; }
        t.running = was; updateHud(); side.replaceChildren(sideCard());
        Store.saveSeason();
    }

    // 🔐 Bunker: a 🔑 Bunker Key may turn up within the first 6 minutes (20%, once per turn)
    if (loc.bunker) bunkerArm(t);
    let keyBusy = false;
    async function bunkerCheck() {
        if (keyBusy || !loc.bunker || t.arena || !bunkerKeyDue(t)) return;
        if (root.querySelector(".game-screen .busy, .game-screen.busy") || npcBusy) return; // after the spin / NPC visit
        keyBusy = true;
        const was = t.running; t.running = false; updateHud();
        await bunkerKeyFound(pid, t);
        keyBusy = false;
        if (!G.S().turn) return;
        t.running = was; updateHud(); side.replaceChildren(sideCard()); if (!gameLayer) tabBody(currentTab);
        Store.saveSeason();
    }

    // timer loop
    let saveTick = 0;
    timer = setInterval(() => {
        if (!document.body.contains(timeEl)) { clearInterval(timer); fx.stop(); return; }
        lockEnd();
        if (!t.running || t.remaining <= 0) return;
        t.remaining -= 1;
        if (t.remaining <= 10 && t.remaining > 0) Sound.tick();
        if (++saveTick % 5 === 0) Store.saveLocal();
        lifeTick();
        updateHud();
        fx.tick();
        if (!G.S().turn) return;
        npcCheck();
        bunkerCheck();
        if (t.remaining <= 0) timeUp();
    }, 1000);
    // 🍚 −10 food every 3 min of play · 🌦️ the map's weather (1:00 on the map, then every 3:00) · 🧪 Arizal test minute
    function lifeTick() {
        const fd = LF.foodTick(t);
        if (fd?.drained) { toast(`🍚 배가 고파진다… 식량 −${fd.drained} (${fd.food})${fd.food <= 0 ? " — 0이면 턴이 끝날 때 HP −10!" : ""}`, fd.food <= 10 ? "warn" : "info", 3200); side.replaceChildren(sideCard()); }
        if (!loc.kidnap) {
            const w = LF.weatherTick(t);
            if (w?.sheltered) toast(`${w.w.emoji} ${w.w.name}! 🏨 숙소 덕분에 무사합니다`, "ok", 2600);
            else if (w?.dead || (w && !G.S().turn)) { clearInterval(timer); fx.stop(); gameLayer?.remove(); gameLayer = null; Sound.boom(); render(); return; }
            else if (w?.dmg) { Sound.hit?.(); toast(`${w.w.emoji} ${w.w.name}! HP −${w.dmg}${w.shield ? " (🎭 보호)" : ""}`, "warn", 3200); root.querySelector(".wx-layer")?.classList.add("hit"); setTimeout(() => root.querySelector(".wx-layer")?.classList.remove("hit"), 900); side.replaceChildren(sideCard()); }
        }
        const az = arizalTick(pid, t);
        if (az?.finished) side.replaceChildren(sideCard());
    }

    // ⏰ time up: anything that already started (a spin and its whole bonus, a casino hand,
    // a corner, a shop purchase, an NPC visit, a map move) is played out first —
    // its winnings count — and only then is the turn over. Nothing new can start (canPlay / corners check the clock).
    let timingOut = false, escapeWait = null; // ⛓️ time up in the kidnap room before the escape → wait for it

    async function timeUp() {
        if (timingOut || finishing) return; timingOut = true;
        Sound.boom();
        await banner("⏰ TIME UP!", 1500, "timeup");
        if (activityBusy() || npcBusy || moving) {
            const note = h("div.timeup-wait", "⏳ 플레이 시간 종료 — 진행 중인 플레이가 끝나면 턴이 종료됩니다");
            root.querySelector(".location")?.prepend(note);
            while (activityBusy() || npcBusy || moving) await sleep(400);
            note.remove();
            await sleep(600);
        }
        // ⛓️ kidnap room: the escape has to be played before the turn can end
        if (loc.kidnap && !escapeTried() && G.S().turn === t) {
            const note = h("div.timeup-wait", "⛓️ 플레이 시간 종료 — 탈출을 시도해야 턴이 끝납니다! 탈출 버튼을 누르세요");
            root.querySelector(".location")?.prepend(note);
            if (currentTab !== "kidnap") tabBody("kidnap");
            await new Promise(r => { escapeWait = r; });
            escapeWait = null; note.remove();
            if (G.S().turn !== t) return; // died in the attempt
        }
        finishTurn();
    }
    let finishing = false;
    async function finishTurn() {
        if (finishing) return; finishing = true;
        clearInterval(timer);
        fx.stop();
        // card missions: a holder decides now whether to spend the card
        if (s.mission.type === "card" && !t.stats.cardUsed && ps.items["card_" + s.mission.letter] > 0
            && await confirmBox(`🔤 알파벳 카드 ${s.mission.letter}를 갖고 있습니다.\n이번 라운드에 사용할까요? (사용하면 미션 통과 · 카드는 사라집니다)`, "사용하기", "아끼기")) G.useMissionCard();
        if (t.arizal && !t.arizal.done) EP.finishArizalTest(pid); // 🧪 the turn ended inside the test minute: it is scored now
        gameLayer?.remove(); gameLayer = null;
        const starve = LF.starveCheck(pid);
        if (starve?.dead) { await starvePopup(pid); render(); return; }
        if (starve?.hp != null) await starveHurtPopup(pid, starve.hp);
        const met = t.ticket || G.missionMet(s.mission, t.stats);
        const m = modal(h("div.turn-result" + (met ? ".ok" : ".bad"),
            avatar(pid, 120),
            h("h2", met ? "🎉 미션 성공!" : "💦 미션 실패…"),
            h("p", s.mission.text),
            // 🔄 revival: a failure is out for good at once · a success goes to the survivors' room (the claw picks 1 later)
            rev ? h("p.rv-turn-verdict" + (met ? ".ok" : ".bad"), met ? "🏝️ 5분을 끝까지 버텼습니다 — 생존자 공간으로 이동합니다! (생존자 중 1명만 부활)" : "💀 패자부활 미션 실패 — 탈락이 확정되었습니다") : null,
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

    lockEnd();
    return h("div.location" + (loc.cursed ? ".cursed" : "") + (loc.kidnap ? ".kidnapped" : "") + (loc.magma ? ".magma" : ""), { style: { "--loc": loc.color } },
        loc.kidnap ? null : weatherLayer(loc.id),
        fx.hud,
        h("div.loc-head",
            h("div.loc-name", h("span", loc.emoji), mapNo(loc.id) ? h("small.loc-no", { title: "맵 번호" }, `#${mapNo(loc.id)}`) : null, h("b", loc.name), npcHere ? h("span.npc-warn", { title: "이번 라운드에 이 맵에는 NPC가 출몰합니다 — 눌러서 NPC 정보 보기", onclick: () => npcInfo(loc, { active: true }) }, "⚠️ NPC 출몰", h("i.npc-i", { "aria-label": "NPC 정보" }, "i")) : h("span.npc-safe", { title: "눌러서 NPC 정보 보기", onclick: () => npcInfo(loc, { active: false }) }, "🛡️ No NPC", h("i.npc-i", { "aria-label": "NPC 정보" }, "i")), diseaseBadge(loc), wx?.el),
            progEl,
            h("div.loc-timer", timeEl, h("div.row", pauseBtn, endBtn))),
        rev ? revivalBar(s, pid, () => { updateHud(); tabBody(currentTab); }) : null,
        ...(passBtns.length ? [h("div.pass-row.in-turn", h("b", "🎟️ 맵권으로 지금 이동:"), passBtns.map(it => h("button.btn.small.gold", { onclick: () => movePass(it.id), title: LOC_BY_ID[it.loc].region === "deadland" ? "☠️ Dead Land 맵권: 남은 시간 8분 이상일 때만" : "" }, `${LOC_BY_ID[it.loc].emoji} ${LOC_BY_ID[it.loc].name} ×${ps.items[it.id]}`, LOC_BY_ID[it.loc].region === "deadland" ? " ☠️8분+" : "")))] : []),
        hud,
        h("div.loc-wrap", side, h("div.loc-main", tabBar, body)));
}

// ------------------------------------------------------------------ judge
function judgeStage(s) {
    const passed = s.order.filter(pid => s.results[pid]?.pass);
    const failed = s.order.filter(pid => !s.results[pid]?.pass);
    // 🕹️ claw machine: > 3 candidates → the claw pulls 3 balls → 1 saved → 1 of the last 2 is out
    let done = false;
    // everyone passed → all live balls go in and the claw pulls out the 3 lowest earners
    const live = s.order.filter(pid => !s.ps[pid].out);
    const pool = s.allPassed && live.length > s.candidates.length ? live : null;
    const claw = clawElimination([...s.candidates], { pool, safe: pool ? [] : passed.filter(pid => !s.candidates.includes(pid) && !s.ps[pid].out), onDone: loser => {
        if (done) return; done = true;
        G.eliminate(loser);
        render();
    } });
    return h("div.judge-stage",
        h("h2.stage-title", `ROUND ${s.round} 결과`),
        s.allPassed ? h("div.notice", "모두 미션 성공! 집게가 이번 라운드 손익 하위 3명을 탈락 후보로 뽑습니다.") : null,
        ...(s.exempt || []).map(x => h("div.notice.exempt", avatar(x.pid, 40, { effect: false }), h("span", `⭐ ${displayName(Store.player(x.pid))}은(는) ${x.why}으로 인해 탈락후보에서 면제되었다!`))),
        h("div.judge-cols",
            h("div.jcol.ok", h("h3", `✅ 성공 ${passed.length}`), h("div.jlist", passed.map(pid => miniPlayer(pid, s.ps[pid], s.results[pid]?.exempt ? h("span.exempt-tag", { title: `${s.results[pid].exempt}으로 인해 면제` }, "⭐ 면제") : null)))),
            h("div.jcol.bad", h("h3", `❌ 실패 ${failed.length}`), h("div.jlist", failed.map(pid => miniPlayer(pid, s.ps[pid]))))),
        h("h3.center", `⚖️ 탈락 후보 ${s.candidates.length}명`),
        s.candidates.length > 3 ? h("div.cand-row", s.candidates.map(pid => h("div.cand-card", avatar(pid, 64, { effect: false }), h("small", displayName(Store.player(pid)))))) : null,
        claw);
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
    // 🏁 two duels: EmoMon battle, then weapon battle. 2 : 0 → champion, 1 : 1 → claw tie-break.
    const R = s.finalRes || {};
    const board = finalBoard(s, a, b, R);
    const flow = (...kids) => h("div.final-flow", board, ...kids);
    if (!R.emo) return flow(emoBattleStage(a, b, w => { G.finalResult("emo", w); render(); },
        { title: "🐾 FINAL 1 · EmoMon 배틀", sub: "두 결승 진출자의 ⚔ 배틀 몬스터로 지정된 이모몬스터끼리 대결합니다 (몬스터가 없으면 Battlebot)" }));
    if (!R.weapon) return flow(battleView(a, b, w => { G.finalResult("weapon", w); render(); },
        { title: "⚔️ FINAL 2 · 무기 대결", sub: `EmoMon 배틀 승자: ${displayName(Store.player(R.emo))} · 이번엔 플레이어끼리 무기로 대결! (선공: 보유금액이 더 많은 플레이어)`, logLabel: "결승 무기 대결" }));
    if (R.emo === R.weapon) return flow(finalSweep(R.emo, () => win(R.emo)));
    if (R.claw) return flow(h("div.center-card", avatar(R.claw, 160), h("h2", `🕹️ ${displayName(Store.player(R.claw))} 집게 결정전 승리`),
        h("button.btn.gold.huge", { onclick: () => win(R.claw) }, "👑 우승 확정")));
    let done = false;
    return flow(
        h("div.final-tie", h("h2.stage-title", "🤝 1 : 1 무승부!", h("small", "두 대결을 하나씩 나눠 가졌습니다 — 이제 운명의 집게가 시즌 우승자를 뽑습니다")),),
        clawChampion([a, b], { onDone: w => { if (done) return; done = true; G.finalResult("claw", w); win(w); } }));
}

// scoreboard above every final step: EmoMon ✓ / weapon ✓ per finalist
function finalBoard(s, a, b, R) {
    const score = pid => ["emo", "weapon"].filter(k => R[k] === pid).length;
    const chip = k => h("span.fb-r" + (R[k] ? ".done" : ""), R[k] ? `${G.FINAL_LABEL[k]} · ${displayName(Store.player(R[k]))} 승` : `${G.FINAL_LABEL[k]} · 대기`);
    const side = pid => h("div.fb-p" + (R.claw === pid ? ".claw" : ""), avatar(pid, 56, { effect: false }), h("b", displayName(Store.player(pid))));
    return h("div.final-board", side(a), h("div.fb-mid", h("div.fb-score", `${score(a)} : ${score(b)}`),
        h("div.fb-rounds", chip("emo"), chip("weapon"), R.emo && R.weapon && R.emo !== R.weapon ? chip("claw") : null)), side(b));
}

// 2 : 0 — both duels won: a celebration before the crown
function finalSweep(pid, onCrown) {
    const nm = displayName(Store.player(pid));
    const btn = h("button.btn.gold.huge", { onclick: () => { btn.disabled = true; onCrown(); } }, "👑 우승 확정 · 시상식으로");
    const el = h("div.final-sweep",
        h("div.fs-title", "PERFECT VICTORY"),
        h("div.fs-crown", "👑"), avatar(pid, 180), h("h2", nm),
        h("div.fs-badges", h("span", "🐾 EmoMon 배틀 승리"), h("span", "⚔️ 무기 대결 승리")),
        h("p", `${nm}이(가) 두 대결을 모두 이겨 시즌 우승자가 되었습니다! 축하합니다! 🎉`),
        h("div.row.center", btn));
    setTimeout(() => { if (document.body.contains(el)) { Sound.fanfare(); confetti(180, ["👑", "🎉", "🏆", "✨", "🪙"]); } }, 200);
    return el;
}

// champion: the whole roster lined up around the winner, balloons, fireworks, blinking WINNER
// signs. The season is over for good only when the admin presses 🏁 시즌 종료.
function doneStage(s) {
    const endBtn = h("button.btn.red.big", { onclick: async () => {
        if (!(await confirmBox(`시즌 ${s.number}을(를) 최종 종료할까요?\n(결과와 명예의 전당 기록은 그대로 남습니다)`, "🏁 시즌 종료", "취소"))) return;
        G.stashSeason(s);
        Store.endSeasonLocal();
        toast(`🏁 시즌 ${s.number} 종료!`, "ok");
        render();
    } }, "🏁 시즌 종료");
    return winnerCelebration(s, { actions: [
        h("button.btn.gold.big", { onclick: () => { location.hash = "#/hall"; } }, "🏆 명예의 전당 보기"),
        Store.canWrite ? endBtn : h("span.muted", "관리자 로그인 후 시즌을 종료할 수 있습니다")] });
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
    // 🎟️ a season lotto that is due is drawn BEFORE the battle (not in the round after it)
    const btn = h("button.btn.red.huge", { onclick: async () => { btn.disabled = true; if (await seasonLottoCheck()) { render(); return; } draw(); } }, "🎲 배틀 상대 추첨");
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
    // ⚔️ + 🐾 a weapon battle AND an EmoMon battle: one player wins both → the other is out · 1 : 1 → a random one is out
    if (s.mission.both) {
        const D = (s.dual ||= {});
        if (!D.weapon) return battleView(a, b, w => { D.weapon = w; Store.saveSeason(true); render(); },
            { title: `⚔️ ROUND ${s.round} 더블 배틀 1/2 · 무기 배틀`, sub: `${s.mission.text} · 무기 배틀 다음에 이모몬스터 배틀이 이어집니다`, logLabel: "더블 배틀 (무기)" });
        if (!D.emo) return emoBattleStage(a, b, w => { D.emo = w; Store.saveSeason(true); render(); },
            { title: `🐾 ROUND ${s.round} 더블 배틀 2/2 · 이모몬스터 배틀`, sub: `무기 배틀 승자: ${displayName(Store.player(D.weapon))} · 이모몬스터가 없으면 Battlebot` });
        const tie = D.weapon !== D.emo;
        if (D.final == null) { D.final = tie ? pick([a, b]) : D.weapon; Store.saveSeason(true); }
        const winner = D.final, loser = winner === a ? b : a;
        return h("div.center-card",
            h("h2", tie ? "🤝 1 : 1 무승부 — 랜덤 탈락!" : "🏆 두 배틀 모두 승리!"),
            h("div.row.center", avatar(a, 90, { effect: false }), h("b", " VS "), avatar(b, 90, { effect: false })),
            h("p", `⚔️ 무기 배틀: ${displayName(Store.player(D.weapon))} 승 · 🐾 이모몬스터 배틀: ${displayName(Store.player(D.emo))} 승`),
            h("p", tie ? `랜덤 추첨으로 ${displayName(Store.player(loser))} 탈락` : `${displayName(Store.player(loser))} 탈락`),
            h("button.btn.gold.huge", { onclick: () => { G.finishBattle(winner, loser); render(); } }, "▶ 결과 확정"));
    }
    if (s.mission.emo) return emoBattleStage(a, b, (winner, loser) => { G.finishBattle(winner, loser); render(); },
        { title: `🐾 ROUND ${s.round} EmoMon 배틀 미션`, sub: `${s.mission.text} · 각자의 ⚔ 배틀 몬스터가 싸웁니다 (몬스터가 없으면 Battlebot) · 지면 탈락!` });
    return battleView(a, b, (winner, loser) => {
        G.finishBattle(winner, loser);
        render();
    }, { title: `⚔️ ROUND ${s.round} 배틀 미션`, sub: `${s.mission.text} · 패배하면 탈락! 승자는 깎인 HP 그대로 다음 라운드로`, logLabel: "배틀 미션" });
}
