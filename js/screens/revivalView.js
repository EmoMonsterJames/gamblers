// =====================================================================
// 🔄 패자부활전 screens (rules: game/revival.js)
//   intro   — popup "10명의 플레이어가 탈락하여…" + 관리자 "패자부활전 진행하기"
//   march   — the eliminated walk into Survival Land one by one (random order)
//   mission — the revival mission roulette (one of 6)
//   turns   — the normal turn screens (seasonView.js) in Survival Land
//   result  — mission winners → the claw picks the one who comes back
// =====================================================================
import { h, sleep, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { confetti, banner, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import * as RV from "../game/revival.js";
import { avatar, displayName } from "../ui/profile.js";
import { clawChampion } from "../ui/claw.js";
import { LOCATIONS } from "../data/catalog.js";
import { letterCard } from "../ui/letterCard.js";

const nm = pid => displayName(Store.player(pid));
const survivalMaps = () => LOCATIONS.filter(l => l.region === "survival");
const RULES = [
    "탈락자 전원이 숨겨진 지역 🔄 Survival Land로 이동해 한 명씩 특별한 라운드(5분)를 플레이합니다.",
    `패자부활전 동안만 ❤ FULL HP · 💰 패자부활전 골드 ${fmt(RV.REVIVAL_GOLD)}G를 따로 받습니다 (원래 골드 · HP · 포인트는 그대로 보관).`,
    "탈락 당시의 아이템 · 펫 · 무기 · 이모몬스터를 그대로 가지고 갑니다.",
    "시즌 중에 쓴 코너 입장 · 시도 횟수는 패자부활전 동안 다시 리셋됩니다 (예: 🎬 Highlight 다시 감상 가능).",
    "패자부활전 골드로 산 것은 모두 별도 인벤토리 — 패자부활전이 끝나면 사라집니다. 직접 포획한 이모몬스터는 계속 가질 수 있습니다.",
    "패자부활전 골드 · 포인트로 번 돈은 원래 골드 · 포인트와 합쳐지지 않습니다.",
    "Survival Land의 모든 맵은 턴 종료 버튼이 없습니다 — 5분이 끝날 때까지 플레이합니다 (⏹️ 턴 종료권으로는 바로 끝낼 수 있음). 맵권은 Survival Land 맵권만 사용 가능 (45,000G) · 지금 맵에서 2분이 지나야 쓸 수 있습니다.",
    "미션에 실패하면 그 자리에서 바로 탈락이 확정됩니다.",
    "미션에 성공하고 5분을 끝까지 살아남으면 🏝️ 생존자 공간으로 이동 — 생존자 중 🕹️ 집게가 단 1명을 부활시킵니다. 모두 실패하면 부활자는 없습니다."
];

// the big popup, once per intro (the stage stays behind it)
let popped = null;
export async function revivalPopup(s) {
    if (popped === s.revival?.at) return;
    popped = s.revival?.at;
    Sound.fanfare();
    const m = modal(h("div.rv-pop",
        h("div.rv-pop-ico", "🔄"),
        h("h2", "패자부활전"),
        h("p.rv-pop-text", RV.REVIVAL_TEXT),
        h("div.rv-pop-row", (s.revival?.pids || []).map(pid => h("div.rv-pop-p", avatar(pid, 54, { effect: false }), h("small", `${s.ps[pid]?.rank ?? "?"}위`)))),
        h("button.btn.gold.big", { onclick: () => m.close() }, "확인")), { title: "🔄 패자부활전", closable: false, cls: "rv-modal" });
    confetti(60, ["🔄", "✨", "🍀"]);
    await m.closed;
}

export function revivalIntroStage(s, rerender) {
    const R = s.revival;
    setTimeout(() => revivalPopup(s), 50);
    const go = h("button.btn.gold.huge", { disabled: !Store.canWrite, onclick: async () => {
        go.disabled = true;
        RV.startRevival();
        Sound.bonus();
        await banner("🔄 패자부활전 START", 1500, "mission");
        rerender();
    } }, "🔄 패자부활전 진행하기");
    return h("div.rv-stage.rv-intro",
        h("div.rv-hero", h("div.rv-hero-ico", "🔄"), h("div", h("h2", "패자부활전"), h("p", RV.REVIVAL_TEXT))),
        h("div.rv-lineup", R.pids.map(pid => h("div.rv-lp", avatar(pid, 72, { effect: false }), h("b", nm(pid)), h("small", `💀 ${s.ps[pid]?.rank ?? "?"}위`)))),
        h("ul.rv-rules", RULES.map(t => h("li", t))),
        h("div.rv-maps", survivalMaps().map(l => h("span.rv-map", { style: { "--c": l.color } }, l.emoji, " ", l.name))),
        h("div.row.center", go),
        Store.canWrite ? null : h("p.muted.center", "관리자 로그인 후 패자부활전을 진행할 수 있습니다"));
}

export function revivalStage(s, rerender) {
    const R = s.revival;
    if (R.phase === "march") return marchStage(s, rerender);
    if (R.phase === "mission") return missionStage(s, rerender);
    if (R.phase === "result") return resultStage(s, rerender);
    return h("div", "…");
}

// ---- the march: avatars walk one by one into the Survival Land gate
function marchStage(s, rerender) {
    const R = s.revival;
    const line = h("div.rv-line", R.order.map(pid => h("div.rv-walker", { "data-id": pid }, avatar(pid, 64, { effect: false }), h("small", nm(pid)))));
    const gate = h("div.rv-gate", h("div.rv-gate-arch", "🔄"), h("b", "SURVIVAL LAND"), h("div.rv-gate-in"));
    const status = h("p.rv-status", "탈락자들이 Survival Land 앞에 모였습니다.");
    let busy = false;
    const btn = h("button.btn.gold.huge", { onclick: async () => {
        if (busy) return; busy = true; btn.disabled = true;
        for (const [i, pid] of R.order.entries()) {
            const w = line.querySelector(`.rv-walker[data-id="${pid}"]`);
            status.textContent = `${i + 1}번째: ${nm(pid)} → Survival Land`;
            w.classList.add("walk"); Sound.whoosh();
            await sleep(900);
            w.classList.add("gone");
            gate.querySelector(".rv-gate-in").append(h("span.rv-in", avatar(pid, 34, { effect: false, frame: false })));
            Sound.coin();
            await sleep(250);
        }
        status.textContent = "모두 Survival Land에 도착! 이제 미션을 뽑습니다.";
        Sound.fanfare(); confetti(40);
        await sleep(900);
        RV.marchDone();
        rerender();
    } }, "🚶 Survival Land로 이동");
    return h("div.rv-stage.rv-march", h("h2.stage-title", "🔄 Survival Land로 이동", h("small", "랜덤한 순서로 한 명씩 이동합니다")), h("div.rv-march-row", line, gate), status, h("div.row.center", btn),
        h("p.muted.center", "이 순서가 패자부활 라운드의 플레이 순서가 됩니다."));
}

// ---- mission roulette (6 revival missions)
function missionStage(s, rerender) {
    const ms = RV.REVIVAL_MISSIONS;
    const cards = ms.map(m => h("div.mcard", { "data-id": m.id }, h("div.mc-ico", m.icon), h("div.mc-text", m.text)));
    let done = false;
    const btn = h("button.btn.gold.huge", { onclick: async () => {
        if (done) return; done = true; btn.disabled = true;
        const target = ms[Math.floor(Math.random() * ms.length)];
        let gap = 60;
        const total = 22 + Math.floor(Math.random() * ms.length) + 4;
        for (let k = 0; k < total; k++) {
            cards.forEach(c => c.classList.remove("hot"));
            cards[k === total - 1 ? ms.indexOf(target) : k % ms.length].classList.add("hot");
            Sound.tick();
            await sleep(gap);
            gap *= k > total - 8 ? 1.3 : 1.05;
        }
        cards[ms.indexOf(target)].classList.add("chosen");
        RV.setRevivalMission(target);
        Sound.fanfare();
        const m = G.S().mission;
        if (m.letters) await revealLetters(m.letters);
        await banner(`🔄 미션: ${m.text}`, 2600, "mission");
        rerender();
    } }, "📜 패자부활 미션 뽑기");
    return h("div.mission-stage.rv-stage",
        h("h2.stage-title", "🔄 패자부활전 미션 추첨", h("small", "미션 하나가 랜덤으로 선택됩니다")),
        h("div.mcards", cards), h("div.row.center", btn),
        h("p.muted.center", "미션에 성공하고 끝까지 살아남은 플레이어 중 단 1명만 부활합니다!"));
}
async function revealLetters(letters) {
    const m = modal(h("div.rv-letters", h("p", "🔤 제출할 알파벳 3개"), h("div.rv-letter-row", letters.map(L => letterCard(L, 80))),
        h("p.muted", "알파벳 카드 / 알파벳권 모두 됩니다. 이미 3개 모두 갖고 있으면 제출만 하면 성공 (제출한 카드는 사라집니다)."),
        h("button.btn.gold.big", { onclick: () => m.close() }, "확인")), { title: "🔤 랜덤 알파벳", closable: false });
    confetti(30, letters);
    await m.closed;
}

// ---- result: the claw picks one of the winners
function resultStage(s, rerender) {
    const R = s.revival, W = R.winners || [], P = R.passed || W;
    const failed = R.order.filter(pid => !P.includes(pid));
    const finish = winner => { RV.finishRevival(winner); rerender(); };
    const cols = h("div.judge-cols",
        h("div.jcol.ok", h("h3", `🏝️ 생존자 공간 ${P.length}`), h("div.jlist", P.map(pid => h("div.rv-res", avatar(pid, 46, { effect: false }), h("b", nm(pid)))))),
        h("div.jcol.bad", h("h3", `💀 탈락 ${failed.length}`), h("div.jlist", failed.map(pid => h("div.rv-res", avatar(pid, 46, { effect: false }), h("b", nm(pid)), R.dead.includes(pid) ? h("small", " ☠️ 사망") : null)))));
    const head = h("div", h("h2.stage-title", "🔄 패자부활전 결과", h("small", s.mission?.text || "")),
        R.fallback ? h("p.notice.warn.center", `😱 모두 미션에 실패했습니다… 하지만 패자부활전에서 적어도 1명은 부활합니다! ${W.length === 1 ? "남은 1명이 부활합니다." : `집게가 ${W.length}명 중 1명을 뽑습니다.`}`) : null);
    if (!W.length) {
        setTimeout(() => Sound.lose(), 100);
        RV.setRevivalRanks(null, null);
        return h("div.rv-stage.rv-result", head, cols, h("div.center-card", h("div.rv-none", "🥀"), h("h2", "부활자 없음"), h("p", "모두 미션에 실패하여 이번 패자부활전으로 살아나는 플레이어는 없습니다.")),
            revivalRankList(R), h("div.row.center", h("button.btn.gold.huge", { onclick: () => finish(null) }, "▶ 시즌으로 돌아가기")));
    }
    if (W.length === 1) {
        const pid = W[0];
        setTimeout(() => { Sound.fanfare(); confetti(120, ["🔄", "🎉", "✨"]); }, 150);
        RV.setRevivalRanks(pid, null);
        return h("div.rv-stage.rv-result", head, cols, h("div.center-card.rv-win", h("div.rv-win-tag", "REVIVED"), avatar(pid, 170), h("h2", `🎉 ${nm(pid)} 부활!`), h("p", R.fallback ? "모두 실패했지만 한 명은 부활합니다 — 집게 없이 바로 부활! (FULL HP로 복귀)" : "미션을 성공한 유일한 플레이어 — 집게 없이 바로 부활합니다! (FULL HP로 복귀)")),
            revivalRankList(R), h("div.row.center", h("button.btn.gold.huge", { onclick: () => finish(pid) }, "🔄 부활 확정 · 시즌으로")));
    }
    // the claw already decided (the screen was redrawn): show its result, never a second draw
    const decided = R.ranks ? Object.keys(R.ranks).find(p => R.ranks[p] === 1) : null;
    if (decided != null) {
        const w = +decided;
        return h("div.rv-stage.rv-result", head, cols, h("div.center-card.rv-win", h("div.rv-win-tag", "REVIVED"), avatar(w, 150), h("h2", `🎉 ${nm(w)} 부활!`)),
            revivalRankList(R), h("div.row.center", h("button.btn.gold.huge", { onclick: () => finish(w) }, `🔄 ${nm(w)} 부활 확정 · 시즌으로`)));
    }
    let done = false;
    const claw = clawChampion(W, {
        chute: "REVIVE", winTag: "🔄 REVIVED", winLine: n => `🔄 ${n} 패자부활!!!`,
        intro: R.fallback ? `미션 성공자가 없어 ${W.length}명 모두의 공이 들어 있습니다. 집게가 REVIVE 구멍에 떨어뜨리는 공의 주인이 부활합니다!` : `미션 성공자 ${W.length}명의 공이 들어 있습니다. 집게가 REVIVE 구멍에 떨어뜨리는 공의 주인이 부활합니다!`,
        onDone: (w, second) => {
            if (done) return; done = true;
            RV.setRevivalRanks(w, second);
            claw.after(revivalRankList(R), h("div.row.center", h("button.btn.gold.huge", { onclick: () => finish(w) }, `🔄 ${nm(w)} 부활 확정 · 시즌으로`)));
        }
    });
    return h("div.rv-stage.rv-result", head, cols, h("h3.center", "🕹️ 단 1명만 부활합니다!"), claw);
}
// 🏅 the revival ranking (also kept in 📜 시즌 요약)
function revivalRankList(R) {
    const ranks = R.ranks || {}, list = Object.keys(ranks).map(Number).sort((a, b) => ranks[a] - ranks[b]);
    if (!list.length) return null;
    const W = R.passed || R.winners || [];
    const why = pid => ranks[pid] === 1 && W.includes(pid) ? "🔄 부활" : ranks[pid] === 2 && R.second === pid ? "🕹️ 집게 결승" : R.dead?.includes(pid) ? "☠️ 플레이 중 사망" : W.includes(pid) ? "✅ 미션 성공" : "❌ 미션 실패";
    return h("div.rv-ranks", h("h3", "🏅 패자부활전 순위"),
        h("ol.rv-rank-list", list.map(pid => h("li" + (ranks[pid] === 1 && W.includes(pid) ? ".win" : R.dead?.includes(pid) ? ".dead" : ""),
            h("b.rv-rank-no", `${ranks[pid]}등`), avatar(pid, 34, { effect: false }), h("span", nm(pid)), h("small", why(pid))))),
        h("p.small.muted", "플레이 중 사망한 플레이어가 꼴찌 (먼저 죽을수록 아래) · 살아남았지만 미션에 실패한 플레이어는 집게가 먼저 꺼냅니다 · 마지막 2명 중 1명 부활, 1명은 2등. 시즌 순위는 바뀌지 않습니다."));
}

// ---- in-turn bar: reset note + 🔤 letter submission
export function revivalBar(s, pid, onChange) {
    const m = s.mission, t = s.turn;
    const bar = h("div.rv-bar", h("span.rv-bar-tag", "🔄 패자부활전"), h("span.rv-bar-note", RV.RESET_NOTE));
    // 🏝️ who already made it to the survivors' room · 💀 who is out for good
    const done = (s.order || []).filter(p => s.results?.[p]);
    const safe = done.filter(p => s.results[p].pass && !s.revival?.dead?.includes(p)), lost = done.filter(p => !safe.includes(p));
    if (done.length) bar.append(h("div.rv-bar-rooms",
        h("span.rv-room.safe", "🏝️ 생존자 공간 ", safe.length ? safe.map(p => avatar(p, 26, { effect: false, frame: false })) : h("small", "아직 없음")),
        h("span.rv-room.lost", `💀 탈락 확정 ${lost.length}명`)));
    if (m?.type === "rv_letters") {
        const have = RV.lettersHave(pid), all = have.every(x => x.n > 0);
        bar.append(h("div.rv-submit", have.map(x => h("span.rv-l" + (x.n ? ".on" : ""), letterCard(x.L, 30), h("small", `×${x.n}`))),
            t?.stats?.lettersOk ? h("b.ok", "✅ 제출 완료")
                : h("button.btn.small" + (all ? ".gold" : ".ghost"), { disabled: !all, onclick: () => { if (RV.submitLetters(pid)) { Sound.bonus(); confetti(30, m.letters); onChange?.(); } } }, "📮 알파벳 3개 제출")));
    }
    return bar;
}

// ---- 🎒 the separate revival inventory (shown on top of the normal inventory)
export function revivalInvView(pid) {
    const sp = RV.invSplit(pid);
    const ps = G.S().ps[pid];
    const chip = (emoji, name, n) => h("span.wchip.rv-chip", `${emoji || "🎁"} ${name}${n > 1 ? ` ×${n}` : ""}`);
    const revItems = Object.entries(sp.rev).map(([k, n]) => chip(ITEMS_BY()[k]?.emoji, ITEMS_BY()[k]?.name || k, n));
    const revW = Object.entries(sp.revWeapons).map(([k, n]) => chip("⚔️", WEAPONS_BY()[k]?.name || k, n));
    const own = Object.entries(sp.own).map(([k, n]) => chip(ITEMS_BY()[k]?.emoji, ITEMS_BY()[k]?.name || k, n));
    return h("div.rv-inv",
        h("div.rv-inv-box.rev",
            h("h4", "🔄 패자부활전 인벤토리 ", h("small", "(패자부활전 골드로 산 것 — 끝나면 모두 사라짐)")),
            h("div.rv-inv-gold", `💰 패자부활전 골드 ${fmt(ps.money)} G · 💎 ${fmt(ps.points)} P · ❤ ${Math.round(ps.hp)}`),
            revItems.length || revW.length || sp.revPet || sp.revFx || sp.revMons.length
                ? h("div.wlist", ...revItems, ...revW, sp.revPet ? chip("🐾", "펫 (구매)", 1) : null, sp.revFx ? chip("✨", "펫효과 (구매)", 1) : null, sp.revMons.length ? chip("🐾", `구매한 이모몬스터`, sp.revMons.length) : null)
                : h("p.muted.small", "아직 패자부활전에서 산 물건이 없습니다."),
            h("p.small.muted", "아이템을 쓰거나 빼앗길 때는 이 인벤토리가 먼저 사용됩니다.")),
        h("div.rv-inv-box",
            h("h4", "🎒 내 소유 아이템 ", h("small", `(탈락 당시부터 가진 것 · 원래 골드 ${fmt(RV.ownGold(pid))} G는 보관 중)`)),
            own.length ? h("div.wlist", ...own) : h("p.muted.small", "없음")));
}
import { ITEM_BY_ID, WEAPON_BY_ID } from "../data/catalog.js";
const ITEMS_BY = () => ITEM_BY_ID, WEAPONS_BY = () => WEAPON_BY_ID;
