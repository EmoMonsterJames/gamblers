// =====================================================================
// 📜 시즌 요약: for every season, the 1st → 20th ranking and how each
// player went out — which round and mission, who they battled or which
// candidates they were left with. The season in progress updates live
// (local state every 2 s; read-only cloud viewers re-read it every 15 s).
// =====================================================================
import { h, fmt } from "../core/util.js";
import { Store } from "../core/store.js";
import { avatar, displayName } from "../ui/profile.js";

const nameOf = pid => displayName(Store.player(pid)) || `#${pid}`;
const chip = pid => h("span.ss-who", avatar(pid, 22, { effect: false }), nameOf(pid));
// 와 / 과 by the last syllable (other scripts → 와(과))
const wa = pid => { const c = nameOf(pid).trim().slice(-1).charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? (c % 28 ? "과" : "와") : "와(과)"; };
const MTYPE_ICON = { battle: "⚔️", card: "🔤", has: "🐾", spell: "🐝", slot_net: "🎰", casino_net: "🃏", points: "💎", jackpot: "💰" };

// ranking rows: survivors (in progress, richest first), then rank 1 → 20
function rows(d) {
    const byPid = {};
    for (const e of d.history || []) if (e.eliminated != null) byPid[e.eliminated] = e;
    const done = d.status === "done";
    const alive = d.roster.filter(pid => !d.ps[pid]?.out && !(done && d.ps[pid]?.rank));
    const ranked = d.roster.filter(pid => !alive.includes(pid)).sort((a, b) => (d.ps[a].rank || 99) - (d.ps[b].rank || 99));
    return [
        ...alive.sort((a, b) => d.ps[b].money - d.ps[a].money).map(pid => ({ pid, alive: true })),
        ...ranked.map(pid => ({ pid, rank: d.ps[pid].rank, e: byPid[pid] })),
    ];
}

function detail(d, r) {
    const { pid, e } = r;
    if (r.alive) return h("div.ss-how", h("span.ss-tag.live", "🟢 생존 중"), h("span.muted", `💰 ${fmt(d.ps[pid].money)} G · 💎 ${d.ps[pid].points} P · ❤ ${Math.round((d.ps[pid].hp || 0) * 100) / 100}`));
    if (r.rank === 1) return h("div.ss-how", h("span.ss-tag.win", "👑 우승"), h("span.muted", `💰 ${fmt(d.ps[pid].money)} G · 💎 ${d.ps[pid].points} P`));
    if (!e) return h("div.ss-how", h("span.muted", "탈락 기록 없음"));
    const round = h("span.ss-round", `R${e.round}`);
    if (e.final) return h("div.ss-how", round, h("span.ss-tag.final", "🏁 결승 배틀"), h("span", chip(e.winner), "에게 패배 — 준우승"));
    if (e.loanDeath) return h("div.ss-how", round, h("span.ss-tag.death", "☠️ 대출 미상환으로 사망"));
    if (e.npcDeath) return h("div.ss-how", round, h("span.ss-tag.death", `☠️ ${e.why || "NPC에게 사망"}`));
    const m = e.mission || {};
    const text = m.text || "미션", icon = /^\p{Extended_Pictographic}/u.test(text) ? "" : (MTYPE_ICON[m.type] || "📜") + " ";
    const mission = h("div.ss-mission", icon + text);
    if (m.type === "battle") {
        const opp = (e.candidates || []).find(x => x !== pid);
        return h("div.ss-how", round, mission, h("div.ss-res", opp != null ? [chip(opp), ` ${wa(opp)} 배틀에서 패배`] : "배틀에서 패배"));
    }
    const others = (e.candidates || []).filter(x => x !== pid);
    return h("div.ss-how", round, mission,
        h("div.ss-res", `탈락 후보 ${(e.candidates || []).length}명 중 최종 탈락`, others.length ? h("span.muted", " · 함께 남은 후보:") : null),
        others.length ? h("div.ss-cands", others.map(chip)) : null,
        e.exempt?.length ? h("div.ss-res.muted", "⭐ 면제: ", e.exempt.map(chip)) : null);
}

function seasonView(d) {
    const live = d.status !== "done";
    const list = rows(d);
    const out = d.roster.filter(pid => d.ps[pid]?.out).length;
    return h("div.ss-season",
        h("div.ss-head",
            h("b", `SEASON ${d.number}`),
            live ? h("span.ss-tag.live", `🔴 LIVE · 라운드 ${d.round || 0}`) : h("span.ss-tag.win", "🏁 종료"),
            h("span.muted", `참가 ${d.roster.length}명 · 생존 ${d.roster.length - out}명 · 탈락 ${out}명`),
            d.winnerId != null ? h("span", "👑 ", chip(d.winnerId)) : null),
        d.roster.length ? h("ol.ss-list", list.map(r => h("li.ss-row" + (r.alive ? ".alive" : r.rank === 1 ? ".champ" : ".out"),
            h("div.ss-rank", r.alive ? "–" : `${r.rank}위`),
            avatar(r.pid, 44, { effect: false }),
            h("div.ss-body", h("div.ss-name", h("b", nameOf(r.pid)), h("small.muted", ` ${Store.player(r.pid)?.player_name || ""}`), h("small.ss-no", ` #${d.roster.indexOf(r.pid) + 1}`)), detail(d, r)))))
            : h("p.muted", "아직 참가자 선발 중입니다."));
}

export function seasonSummaryPage() {
    const tabs = h("div.tabs"), body = h("div.ss-body-wrap", h("p.muted", "불러오는 중…"));
    const page = h("div.page.season-summary", h("h2.page-title", "📜 시즌 요약"),
        h("p.muted", "시즌별 우승부터 20위까지의 순위와, 각 플레이어가 어떤 미션에서 누구와 대결하거나 어떤 후보들과 남아 탈락했는지 보여줍니다. 진행 중인 시즌은 라운드가 끝날 때마다 실시간으로 갱신됩니다."),
        tabs, body);
    let digests = [], cur = null, sig = "";
    // a host / local player has the freshest state in memory; read-only cloud viewers rely on the server
    const useLocal = () => !Store.cloud || !!Store.user;
    const merged = () => {
        const list = digests.map(d => d);
        if (useLocal() && Store.season) {
            const mine = Store.seasonDigest(Store.season), i = list.findIndex(d => d.number === mine.number);
            i >= 0 ? (list[i] = mine) : list.unshift(mine);
        }
        return list.sort((a, b) => b.number - a.number);
    };
    const draw = () => {
        const list = merged();
        if (!list.length) { tabs.replaceChildren(); body.replaceChildren(h("div.center-card", h("p", "아직 시즌 기록이 없습니다."))); return; }
        if (cur == null || !list.some(d => d.number === cur)) cur = list[0].number;
        tabs.replaceChildren(...list.map(d => h("button.tab" + (d.number === cur ? ".on" : ""), { onclick: () => { cur = d.number; draw(); } }, `시즌 ${d.number}${d.status !== "done" ? " 🔴" : ""}`)));
        body.replaceChildren(seasonView(list.find(d => d.number === cur)));
        sig = signature();
    };
    const signature = () => JSON.stringify(merged().map(d => [d.number, d.status, d.round, d.history.length, d.roster.length, d.roster.filter(p => d.ps[p]?.out).length]));
    const load = async () => {
        try { digests = await Store.seasonDigests(); } catch (err) { console.warn("season summary", err); }
        draw();
    };
    load();
    // live updates while the page is open
    let ticks = 0;
    const timer = setInterval(async () => {
        if (!page.isConnected) return clearInterval(timer);
        ticks++;
        if (Store.cloud && !useLocal() && ticks % 8 === 0) { await load(); return; }
        if (signature() !== sig) draw();
    }, 2000);
    return page;
}
