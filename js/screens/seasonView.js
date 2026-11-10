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
import { TIERS, LOCATIONS, LOC_BY_ID, SHOPS, LOANS } from "../data/catalog.js";
import { CASINO_BY_ID } from "../data/casino.js";
import { SLOT_BY_ID } from "../slots/configs.js";
import * as G from "../game/season.js";
import { avatar, playerCard, miniPlayer, displayName, petView, weaponChip } from "../ui/profile.js";
import { reelMachine } from "../ui/reelpick.js";
import { worldMap } from "../ui/map.js";
import { openCasino } from "./casino.js";
import { openSlot } from "./slot.js";
import { shopView, inventoryView } from "./shop.js";
import { locationShops } from "../data/catalogAdmin.js";
import { earnView, begView } from "./corners.js";
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
    root.replaceChildren(header(s), h("div.season-body", h("div.stage", stage(s)), sidebar(s)));
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
        const p = pick(G.selectionPool());
        await machine.spin(p.id, G.selectionPool(), { tense: true });
        G.addToRoster(p.id);
        await reveal(p.id);
        spinning = false;
        render();
    } }, "🎰 SPIN");
    const skipBtn = h("button.btn.ghost.big", { onclick: async () => {
        if (spinning) return;
        const left = CONFIG.SEASON_SIZE - s.roster.length;
        for (const p of shuffle(G.selectionPool()).slice(0, left)) G.addToRoster(p.id);
        Sound.bonus(); confetti(60);
        render();
    } }, "⏭ SKIP (나머지 즉시 선발)");
    const full = G.rosterFull();
    return h("div.select-stage",
        h("h2.stage-title", "🎰 시즌 참가자 선발 🎰", h("small", `${s.roster.length} / ${CONFIG.SEASON_SIZE}`)),
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
    const ms = G.missionsForTier(tier);
    const cards = ms.map(m => h("div.mcard", { "data-id": m.id }, h("div.mc-ico", { bonus: "🎁", slot_net: "🎰", casino_net: "🃏", points: "💎", jackpot: "💰", battle: "⚔️" }[m.type]), h("div.mc-text", m.text)));
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
            h("button.btn.gold.huge", { onclick: () => { G.startTurn(); render(); } }, "🗺️ 턴 시작 — 장소 뽑기"),
            h("button.btn.ghost", { onclick: async () => { if (await confirmBox(`${displayName(Store.player(pid))}의 턴을 건너뛸까요? (미션 실패 처리)`)) { G.startTurn(); G.endTurn(); render(); } } }, "턴 건너뛰기")));
}

function mapStage(s) {
    const pid = s.turn.pid;
    const acc = G.accessibleLocations(pid);
    const locked = new Set(LOCATIONS.filter(l => !acc.includes(l)).map(l => l.id));
    const map = worldMap({ locked });
    let done = false;
    const btn = h("button.btn.gold.huge", { onclick: async () => {
        if (done) return; done = true; btn.disabled = true;
        const target = pick(acc);
        await map.roulette(acc, target.id);
        await banner(`${target.emoji} ${target.name}`, 1600, "loc");
        G.setLocation(target.id);
        s.turn.running = true;
        render();
    } }, "🎯 장소 룰렛 돌리기");
    return h("div.map-stage",
        h("div.map-head", avatar(pid, 56), h("div", h("b", displayName(Store.player(pid))), h("div.muted", `${Store.player(pid).country} · 입장 가능 ${acc.length}곳`)), btn),
        map.el,
        h("p.muted.center", "회색 핀은 입장 불가(포인트 부족 / 국적 전용 — 출입권이 있으면 입장 가능)"));
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
        hud.replaceChildren(
            h("div.stat.gold", h("small", "보유금액"), h("b", fmt(ps.money) + " G")),
            ps.loanGold > 0 || ps.loan ? h("div.stat.loan", h("small", "대출된 골드 (게임 전용)"), h("b", fmt(ps.loanGold || 0) + " G")) : null,
            ps.loan ? h("div.stat.debt", h("small", `갚을 돈 · ${ps.loan.due}R까지`), h("b", fmt(ps.loan.owed) + " G")) : null,
            h("div.stat.pts", h("small", "포인트"), h("b", ps.points + " P")),
            h("div.stat", h("small", "HP"), h("b" + (ps.hp < 50 ? ".down" : ""), `❤ ${ps.hp}`)),
            h("div.stat", h("small", "남은 횟수"), h("b", `🎰 ${G.playsLeft(pid, "slot")} · 🃏 ${G.playsLeft(pid, "casino")}`)),
            h("div.stat", h("small", "슬롯 손익"), h("b" + (t.stats.slotNet >= 0 ? ".up" : ".down"), fmt(t.stats.slotNet))),
            h("div.stat", h("small", "카지노 손익"), h("b" + (t.stats.casinoNet >= 0 ? ".up" : ".down"), fmt(t.stats.casinoNet))),
            h("div.stat", h("small", "이번 턴 포인트"), h("b", t.stats.points)),
            h("div.stat", h("small", "보너스 / 잭팟"), h("b", `${t.stats.bonus} / ${t.stats.jackpot || "-"}`)));
    };
    updateHud();

    const pauseBtn = h("button.btn.ghost.small", { onclick: () => { t.running = !t.running; pauseBtn.textContent = t.running ? "⏸ 일시정지" : "▶ 재개"; updateHud(); Store.saveSeason(); } }, t.running ? "⏸ 일시정지" : "▶ 재개");
    const endBtn = h("button.btn.red.small", { onclick: async () => { if (await confirmBox("턴을 종료할까요?")) finishTurn(); } }, "⏹ 턴 종료");

    const ctx = kind => ({
        pid, luck,
        money: () => G.playMoney(pid),
        canPlay: () => t.remaining <= 0 ? { ok: false, why: "⏰ 시간 종료!" } : !t.running ? { ok: false, why: "⏸ 일시정지 중입니다" }
            : G.playsLeft(pid, kind) <= 0 ? { ok: false, why: kind === "slot" ? "이번 라운드 슬롯 스핀 횟수를 모두 썼습니다 (추가권: 일반 상점)" : "이번 라운드 카지노게임 횟수를 모두 썼습니다 (추가권: 일반 상점)" }
            : { ok: true },
        left: () => G.playsLeft(pid, kind),
        record(bet, win, points, extra = {}) {
            if (extra.pending) { G.spendBet(pid, kind, bet); updateHud(); return; }
            if (extra.settle) { ps.money += extra.bet; G.recordPlay(kind, extra.bet, win, points, extra); updateHud(); }
        },
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
    const tabs = [["games", "🎰 게임"], ...locationShops(loc).map(sid => ["shop:" + sid, SHOPS[sid].icon + " " + SHOPS[sid].name]), ...(loc.earn ? [["earn", "💪 돈벌기"]] : []), ...(loc.beg ? [["beg", "🥺 구걸"]] : []), ["inv", "🎒 인벤토리"], ["loan", ps.loan ? "🏦 대출 상환" : "🏦 대출"], ["card", "🪪 프로필"]];
    let currentTab = "games";
    const tabBar = h("div.tabs");
    const body = h("div.tab-body");
    function tabBody(id) {
        currentTab = id;
        tabBar.replaceChildren(...tabs.map(([k, label]) => h("button.tab" + (k === id ? ".on" : ""), { onclick: () => tabBody(k) }, label)));
        let content;
        if (id === "games") content = h("div.game-list",
            ...loc.slots.map(sid => { const c = SLOT_BY_ID[sid]; return h("button.gcard.slot", { style: { "--bg": c.theme.bg, "--accent": c.theme.accent }, onclick: () => openGame("slot", sid) },
                h("div.gc-kind", c.progressive === false ? "SLOT · CLASSIC" : "SLOT · PROGRESSIVE"), h("div.gc-name", c.name), h("div.gc-brand", c.brand), h("div.gc-desc", c.desc)); }),
            ...loc.casino.map(cid => { const g = CASINO_BY_ID[cid]; return h("button.gcard.casino", { onclick: () => openGame("casino", cid) },
                h("div.gc-kind", "CASINO GAME"), h("div.gc-ico", g.icon), h("div.gc-name", g.name), h("div.gc-desc", g.desc)); }));
        else if (id.startsWith("shop:")) content = shopView(id.slice(5), pid, loc.id, () => { updateHud(); side.replaceChildren(sideCard()); });
        else if (id === "inv") content = inventoryView(pid, {
            onUseTime: () => { ps.items.time_ext--; t.remaining += CONFIG.EXTEND_SECONDS; G.log(`⏱️ ${displayName(Store.player(pid))} 5분 연장!`); Store.saveSeason(); updateHud(); toast("+5분!", "ok"); },
            onMission: () => { if (G.useMissionPass()) { toast("🎫 미션완료권 사용! 이번 라운드 통과", "ok"); updateHud(); } },
            onHp: (item, n) => { const r = G.useHpItem(pid, item, n); if (r < 0) toast("HP가 이미 가득 찼습니다", "warn"); else if (r > 0) { Sound.coin(); toast(`❤ HP +${r}`, "ok"); updateHud(); } },
            onPlays: (kind, item, n) => { if (G.addPlays(pid, kind, item, n)) { toast(kind === "slot" ? `🎰 슬롯 +${n}회` : `🃏 카지노 +${n}회`, "ok"); updateHud(); } },
            onChange: () => side.replaceChildren(sideCard())
        });
        else if (id === "loan") content = loanView(pid, () => { updateHud(); tabBody("loan"); });
        else if (id === "earn") content = earnView(pid, () => { updateHud(); side.replaceChildren(sideCard()); tabBody("earn"); });
        else if (id === "beg") content = begView(pid, () => { updateHud(); tabBody("beg"); });
        else content = playerCard(pid, ps);
        body.replaceChildren(content);
    }
    const sideCard = () => h("div.loc-side-inner",
        avatar(pid, 120),
        h("div.ls-name", displayName(Store.player(pid))),
        h("div.ls-pet", ps.pet ? petView(ps.pet, ps.petEffect, 90) : h("div.muted", "펫 없음")),
        h("div.luck", `🍀 승률 +${luck.pct}%`, luck.bonusPct ? h("span", ` · 보너스 +${luck.bonusPct}%`) : null),
        ps.weapons.length ? h("div.wlist.small", ps.weapons.map(weaponChip)) : null);
    const side = h("div.loc-side", sideCard());
    tabBody("games");

    // timer loop
    let saveTick = 0;
    timer = setInterval(() => {
        if (!document.body.contains(timeEl)) { clearInterval(timer); return; }
        if (!t.running || t.remaining <= 0) return;
        t.remaining -= 1;
        if (t.remaining <= 10 && t.remaining > 0) Sound.tick();
        if (++saveTick % 5 === 0) Store.saveLocal();
        updateHud();
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
            h("div.loc-name", h("span", loc.emoji), h("b", loc.name)),
            progEl,
            h("div.loc-timer", timeEl, h("div.row", pauseBtn, endBtn))),
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
        h("div.judge-cols",
            h("div.jcol.ok", h("h3", `✅ 성공 ${passed.length}`), h("div.jlist", passed.map(pid => miniPlayer(pid, s.ps[pid])))),
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
function battleMissionStage(s) {
    const [a, b] = s.battlePair || [];
    if (a == null || b == null || s.ps[a].out || s.ps[b].out) { // stale pair (e.g. loan death) → redraw
        G.setMission(s.mission); return battleMissionStage(G.S());
    }
    return battleView(a, b, (winner, loser) => {
        G.finishBattle(winner, loser);
        render();
    }, { title: `⚔️ ROUND ${s.round} 배틀 미션`, sub: `${s.mission.text} · 패배하면 탈락! 승자는 깎인 HP 그대로 다음 라운드로`, logLabel: "배틀 미션" });
}
