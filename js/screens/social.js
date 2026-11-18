// =====================================================================
// 👫 내 친구 corner · 💖/👎 comment reactions · 🤝 도움주기 corner · 💞 intimacy info
// · 🗳️ vote elimination stage. Logic: js/game/social.js
// =====================================================================
import { h, sleep, fmt, shuffle } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, confetti, banner } from "../core/fx.js";
import { Store } from "../core/store.js";
import { ITEM_BY_ID } from "../data/catalog.js";
import * as G from "../game/season.js";
import * as SO from "../game/social.js";
import { avatar, displayName } from "../ui/profile.js";
import { doorGate } from "../ui/doorGate.js";
import { clawElimination } from "../ui/claw.js";

const pname = pid => displayName(Store.player(pid));
const who = pid => { const p = Store.player(pid); return p ? `${p.country || "-"} · ${p.ethnicity || "-"} · ${p.job || "-"}` : ""; };

// ================================================================ 👫 내 친구
let friendTab = "friend";
export function friendsView(pid, { onChange = () => { } } = {}) {
    const wrap = h("div.friends-corner");
    let q = "", rel = "friend", note = "";
    const draw = () => {
        const mine = SO.friendsOf(pid);
        const results = q.length ? Store.players.filter(p => !(+p.id === +pid) && `${p.name_ko} ${p.player_name} ${p.id}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12) : [];
        const relSel = h("div.fr-rels", SO.REL_ORDER.map(k => h("button.fr-rel" + (rel === k ? ".on" : ""), { onclick: () => { rel = k; draw(); } }, `${SO.RELS[k].emoji} ${SO.RELS[k].label}`)));
        const noteInp = rel === "etc" ? h("input.input.fr-note", { placeholder: "기타 관계 (예: 동창, 라이벌, 이웃…)", value: note, maxlength: 30, oninput: e => { note = e.target.value; } }) : null;
        const search = h("input.input", { placeholder: "🔎 플레이어 이름 검색 (한글 · 영문 · ID)", value: q, oninput: e => { q = e.target.value.trim(); drawList(); } });
        const list = h("div.fr-results");
        const drawList = () => {
            const rs = q.length ? Store.players.filter(p => !(+p.id === +pid) && `${p.name_ko} ${p.player_name} ${p.id}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12) : [];
            list.replaceChildren(...(q && !rs.length ? [h("p.muted", "검색 결과가 없습니다")] : rs.map(p => {
                const cur = SO.relationOf(pid, p.id);
                return h("div.fr-row", avatar(p.id, 44, { effect: false }), h("div.fr-who", h("b", displayName(p)), h("small", who(p.id))),
                    cur ? h("span.fr-badge.r-" + cur.rel, `${SO.RELS[cur.rel].emoji} ${SO.RELS[cur.rel].label}${cur.note ? ` · ${cur.note}` : ""}`) : null,
                    h("button.btn.small.gold", { onclick: () => {
                        const r = SO.addRelation(pid, p.id, rel, note);
                        if (!r.ok) return toast(r.why, "warn");
                        Sound.coin(); confetti(16, ["💞", "✨"]);
                        toast(`${displayName(p)}님과 서로 ${SO.RELS[rel].label}(으)로 등록되었습니다!`, "ok");
                        friendTab = rel; onChange(); draw();
                    } }, cur ? "관계 변경" : `➕ ${SO.RELS[rel].label} 추가`));
            })));
        };
        drawList();
        void results;
        const tabs = h("div.bk-tabs", SO.REL_ORDER.map(k => h("button.bk-tab" + (friendTab === k ? ".on" : ""), { onclick: () => { friendTab = k; draw(); } },
            `${SO.RELS[k].emoji} ${SO.RELS[k].label} (${mine.filter(r => r.rel === k).length})`)));
        const shown = mine.filter(r => r.rel === friendTab);
        wrap.replaceChildren(
            h("h3", "👫 내 친구"),
            h("p.muted.small", "플레이어를 검색해서 친구 · 가족 · 지인 · 기타로 추가하세요. 한쪽에서 추가하면 바로 서로 등록됩니다. 관계는 시즌이 바뀌어도 남고, 💞 친밀도(투표 탈락)에 반영됩니다."),
            h("div.fr-add", relSel, noteInp, search, list),
            tabs,
            h("div.fr-list", shown.length ? shown.map(r => h("div.fr-row", avatar(r.other, 52, { effect: false }),
                h("div.fr-who", h("b", pname(r.other)), h("small", who(r.other)), r.note ? h("small.fr-etc", `🏷️ ${r.note}`) : null, h("small.muted", `등록: ${r.season ? `시즌 ${r.season} · ` : ""}${new Date(r.at).toLocaleDateString()}`)),
                h("button.btn.small.ghost", { title: "친밀도 보기", onclick: () => intimacyInfo(pid, r.other) }, "💞"),
                h("button.btn.small.ghost", { onclick: async () => { if (await confirmBox(`${pname(r.other)}님과의 관계를 삭제할까요? (양쪽 모두에서 삭제됩니다)`, "삭제", "취소")) { SO.removeRelation(pid, r.other); onChange(); draw(); } } }, "🗑️")))
                : h("p.muted.center", `등록된 ${SO.RELS[friendTab].label}이(가) 없습니다`)));
        if (q) { search.focus(); search.setSelectionRange(q.length, q.length); }
    };
    draw();
    return wrap;
}

// ================================================================ 💞 intimacy breakdown popup
export async function intimacyInfo(a, b) {
    await SO.loadTraits([a, b]);
    const it = SO.intimacy(a, b);
    modal(h("div.intimacy-info",
        h("div.ii-pair", avatar(a, 64, { effect: false }), h("b.ii-score", `💞 ${it.score}`), avatar(b, 64, { effect: false })),
        h("p.center", `${pname(a)} ↔ ${pname(b)}`),
        it.parts.length ? h("ul.ii-parts", it.parts.map(p => h("li" + (p.pts < 0 ? ".neg" : ""), h("span", p.label), h("b", p.pts > 0 ? `+${p.pts}` : `${p.pts}`)))) : h("p.muted.center", "공통점이 없습니다 (0점)")),
        { title: "💞 친밀도" });
}

// ================================================================ 💖 / 👎 on a comment
export function reactionBar(p, pid, redraw = () => { }) {
    const likes = p.likes || [], dis = p.dislikes || [];
    const mineL = pid != null && likes.some(x => +x.pid === +pid), mineD = pid != null && dis.some(x => +x.pid === +pid);
    const open = kind => reactWho(p, kind, pid, redraw);
    return h("div.cm-react",
        h("button.cm-rbtn.like" + (mineL ? ".on" : ""), { title: "하트 — 누가 눌렀는지 보기", onclick: () => open("likes") }, "💖 ", h("b", String(likes.length))),
        h("button.cm-rbtn.dislike" + (mineD ? ".on" : ""), { title: "싫어요 — 누가 눌렀는지 보기", onclick: () => open("dislikes") }, "👎 ", h("b", String(dis.length))));
}
function reactWho(p, kind, pid, redraw) {
    const label = kind === "likes" ? "💖 하트" : "👎 싫어요";
    const list = [...(p[kind] || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const canReact = pid != null && +p.pid !== +pid;
    const on = canReact && list.some(x => +x.pid === +pid);
    const m = modal(h("div.react-who",
        canReact ? h("div.row.center", h("button.btn" + (on ? ".ghost" : ".gold"), { onclick: () => {
            const r = SO.react(pid, p.id, kind);
            if (!r.ok) return toast(r.why, "warn");
            r.on ? (Sound.coin(), toast(`${label}를 눌렀습니다`, "ok")) : toast(`${label}를 취소했습니다`, "info");
            m.close(); redraw();
        } }, on ? `${label} 취소` : `${label} 누르기`)) : h("p.muted.center.small", pid == null ? "플레이 중인 플레이어만 누를 수 있습니다" : "내 코멘트에는 누를 수 없습니다"),
        list.length ? h("div.rw-list", list.map(x => h("div.rw-row", avatar(x.pid, 36, { effect: false }), h("b", pname(x.pid)),
            h("small.muted", `${x.season != null ? `시즌 ${x.season}` : "-"} · ${new Date(x.at).toLocaleString()}`))))
            : h("p.muted.center", `아직 ${label}를 누른 플레이어가 없습니다`)),
        { title: `${label} ${list.length}명` });
}

// ================================================================ 🤝 도움주기 corner
export function helpView(pid, { onChange = () => { }, turn = null } = {}) {
    if (SO.helpDoorState(pid) !== true) return doorGate({ name: "도움주기", emoji: "🤝", chance: Math.round(SO.HELP_OK * 100), state: () => SO.helpDoorState(pid), roll: () => SO.helpDoor(pid), inside: () => helpView(pid, { onChange, turn }) });
    const wrap = h("div.help-corner");
    let kind = null;
    const ps = G.S().ps[pid];
    const draw = () => {
        if (SO.helpedThisRound(pid)) {
            const last = [...SO.helps()].reverse().find(x => +x.from === +pid && x.season === G.S().number && x.round === G.S().round);
            wrap.replaceChildren(h("h3", "🤝 도움주기"), h("div.entry-check.yes", h("div.bouncer", "💝"), h("h2", "이번 라운드 도움 완료!"),
                last ? h("p", `${pname(last.to)}에게 ${last.kind === "gold" ? fmt(last.amount) + "G" : ITEM_BY_ID[last.item]?.name || last.item} (친밀도 +${last.score})`) : null,
                h("p.muted", "도움은 라운드당 1회만 줄 수 있습니다.")));
            return;
        }
        if (!kind) {
            wrap.replaceChildren(h("h3", "🤝 도움주기"),
                h("p.muted.small", "골드나 아이템으로 다른 플레이어를 도와주세요. 도움을 준 플레이어와 받은 플레이어 사이의 💞 친밀도가 +1~+100 올라갑니다 (투표 탈락에 반영). 라운드당 1회."),
                h("div.help-pick",
                    h("button.help-kind", { onclick: () => { kind = "season"; draw(); } }, h("span", "🎰"), h("b", "시즌참가자 도움주기"), h("small", "지금 시즌에 참가중인 플레이어 1명")),
                    h("button.help-kind", { onclick: () => { kind = "other"; draw(); } }, h("span", "🌍"), h("b", "비시즌참가자 도움주기"), h("small", "이번 시즌에 참가하지 않은 플레이어 1명 (다음 시즌 참가 때 받습니다)"))));
            return;
        }
        const to = SO.helpTarget(pid, kind);
        if (to == null) { wrap.replaceChildren(h("h3", "🤝 도움주기"), h("p.muted", "도움을 줄 플레이어가 없습니다"), h("button.btn.ghost", { onclick: () => { kind = null; draw(); } }, "← 뒤로")); return; }
        const amt = h("input.input.help-amt", { type: "number", min: SO.HELP_GOLD[0], max: SO.HELP_GOLD[1], step: 1000, value: 10000 });
        const range = h("input.help-range", { type: "range", min: SO.HELP_GOLD[0], max: SO.HELP_GOLD[1], step: 1000, value: 10000 });
        const sc = h("b.help-sc", "+10");
        const sync = v => { v = Math.max(SO.HELP_GOLD[0], Math.min(SO.HELP_GOLD[1], Math.round(+v || 0))); amt.value = v; range.value = v; sc.textContent = `친밀도 +${SO.goldScore(v)}`; };
        amt.oninput = e => sync(e.target.value); range.oninput = e => sync(e.target.value); sync(10000);
        const give = async opt => {
            const what = opt.item ? (ITEM_BY_ID[opt.item]?.name || opt.item) : `${fmt(+amt.value)}G`;
            if (!(await confirmBox(`${pname(to)}에게 ${what}을(를) 줄까요?\n친밀도 +${opt.item ? SO.itemScore(opt.item) : SO.goldScore(+amt.value)} · 라운드당 1회`, "도와주기", "취소"))) return;
            const r = SO.giveHelp(pid, to, opt.item ? { item: opt.item } : { gold: +amt.value });
            if (!r.ok) return toast(r.why, "warn");
            Sound.cash(); confetti(40, ["💝", "🤝", "✨"]);
            toast(`💝 ${pname(to)}에게 도움을 줬습니다! (친밀도 +${r.rec.score})`, "ok", 3500);
            onChange(); draw();
        };
        const items = Object.entries(ps.items || {}).filter(([id, n]) => n > 0 && ITEM_BY_ID[id] && !/^card_/.test(id));
        wrap.replaceChildren(h("h3", kind === "season" ? "🎰 시즌참가자 도움주기" : "🌍 비시즌참가자 도움주기"),
            h("div.help-target", avatar(to, 120), h("h2", pname(to)), h("small.muted", who(to)), h("button.btn.small.ghost", { onclick: () => intimacyInfo(pid, to) }, "💞 지금 친밀도 보기")),
            h("div.help-box", h("h4", "💰 골드로 돕기"), h("p.muted.small", `${fmt(SO.HELP_GOLD[0])}G ~ ${fmt(SO.HELP_GOLD[1])}G · 1,000G당 친밀도 +1 (최대 +100) · 보유 ${fmt(ps.money)}G`),
                h("div.row", range, amt, sc), h("button.btn.gold", { onclick: () => give({}) }, "💰 골드 주기")),
            h("div.help-box", h("h4", "🎁 아이템으로 돕기"), h("p.muted.small", "어드민 가격 1,000G당 친밀도 +1 (최소 +1 · 최대 +100)"),
                items.length ? h("div.help-items", items.map(([id, n]) => h("button.help-item", { onclick: () => give({ item: id }) },
                    h("span", ITEM_BY_ID[id].emoji || "🎁"), h("b", ITEM_BY_ID[id].name), h("small", `×${n} · 친밀도 +${SO.itemScore(id)}`)))) : h("p.muted", "줄 수 있는 아이템이 없습니다")),
            h("button.btn.ghost", { onclick: () => { kind = null; draw(); } }, "← 뒤로"));
    };
    draw();
    return wrap;
}

// ================================================================ 🗳️ vote elimination stage
export function voteStage(s, render) {
    const v = s.vote;
    if (!v) return h("div", "?");
    const head = h("h2.stage-title", `🗳️ 투표 탈락 라운드 · ${v.size}명`,
        h("small", "이번 라운드는 미션 대신 투표로 탈락자를 정합니다. 각 플레이어는 💞 친밀도가 가장 높은 1명에게 1표를 주고, 득표가 가장 적은 3명이 탈락 후보가 됩니다 (동점자가 많으면 집게로 3명)."));
    // ---- 1) everyone votes in turn
    if (v.phase === "voting") {
        const pid = v.voters[v.idx];
        const done = v.voters.slice(0, v.idx);
        const status = h("div.vote-status");
        const voteBtn = h("button.btn.gold.huge", { onclick: async () => {
            voteBtn.disabled = skipBtn.disabled = true;
            status.replaceChildren(h("div.vote-wait", h("span.vote-spin", "🗳️"), " 투표가 진행중입니다…"));
            Sound.bonus();
            await sleep(1500);
            G.S().vote && SO.castVote(pid, false);
            render();
        } }, "🗳️ 투표하기");
        const skipBtn = h("button.btn.ghost.big", { onclick: () => { SO.castVote(pid, true); render(); } }, "⏭ Skip");
        return h("div.vote-stage", head,
            h("div.vote-now", h("small", `투표 ${v.idx + 1} / ${v.voters.length}`), avatar(pid, 150), h("h2", pname(pid)), status, h("div.row.center", voteBtn, skipBtn),
                h("p.muted.small", "투표하면 이 플레이어와 💞 친밀도가 가장 높은 플레이어 1명에게 1표가 들어갑니다 (친밀도 동점이면 랜덤) · Skip하면 이 플레이어의 표는 없습니다")),
            h("div.vote-done", done.map(x => h("div.vd-chip" + (v.cast[x] === "skip" ? ".skip" : ""), avatar(x, 34, { effect: false }), h("small", v.cast[x] === "skip" ? "Skip" : "✔")))));
    }
    // ---- 2) voting over: the admin opens the results
    if (v.phase === "done") {
        const btn = h("button.btn.gold.huge", { onclick: async () => {
            if (!Store.canWrite) return toast("관리자만 투표결과를 볼 수 있습니다", "warn");
            btn.disabled = true; btn.textContent = "📊 집계 중…";
            await SO.tallyVote();
            Sound.fanfare(); render();
        } }, "📊 투표결과 보기");
        return h("div.vote-stage", head, h("div.center-card", h("div.vote-big", "🗳️"), h("h2", "투표가 종료되었습니다"),
            h("p", `${Object.values(v.cast).filter(x => x === "voted").length}명 투표 · ${Object.values(v.cast).filter(x => x === "skip").length}명 Skip`),
            Store.canWrite ? btn : h("p.muted", "관리자가 '투표결과 보기'를 누르면 결과가 공개됩니다")));
    }
    // ---- 3) results: middle ranks shown, top 2 and bottom 3 hidden
    if (v.phase === "results") {
        const sc = pid => v.scores[pid].total;
        // bottom group (bottom 3 incl. ties) hidden · top 2 of the rest hidden · the middle shown
        const pool = v.pool || v.rank.slice(-3);
        const rest = v.rank.filter(p => !pool.includes(p));
        const tops = rest.slice(0, 2), mid = rest.slice(2);
        const rankNo = pid => 1 + v.rank.filter(p => sc(p) > sc(pid)).length; // ties share a rank
        const row = pid => h("div.vr-row", h("b.vr-rank", `${rankNo(pid)}위`), avatar(pid, 44, { effect: false }), h("b.vr-name", pname(pid)),
            v.tie[pid] ? h("small.vr-tie", "동점") : null,
            h("b.vr-score", `🗳️ ${sc(pid)}표`), h("button.vr-info", { title: "누가 투표했는지 보기", onclick: () => voteInfo(v, pid) }, "ⓘ"));
        const topCard = h("button.vr-hidden.top" + (v.topShown ? ".open" : ""), { onclick: async () => {
            if (v.topShown) return;
            Sound.drum?.(); topCard.classList.add("shake");
            await sleep(900);
            v.topShown = true; Store.saveSeason(true);
            Sound.fanfare(); confetti(70, ["👑", "🥈", "✨"]);
            render();
        } }, v.topShown ? null : [h("span", "❓"), h("b", tops.length > 1 ? "2위 · 1위" : "1위"), h("small", "눌러서 공개")]);
        const top = !tops.length ? null : v.topShown ? h("div.vr-top", [...tops].reverse().map(pid => { const r = rankNo(pid), first = r === 1;
            return h("div.vr-podium.p" + (first ? 1 : 2), h("div.vr-medal", first ? "🥇" : "🥈"), avatar(pid, first ? 120 : 96), h("b", pname(pid)),
                h("small", `${r}위 · 🗳️ ${sc(pid)}표`), v.tie[pid] ? h("small.vr-tie", "동점") : null, h("button.vr-info", { onclick: () => voteInfo(v, pid) }, "ⓘ")); })) : topCard;
        const many = pool.length > 3;
        const bottom = h("button.vr-hidden.bottom" + (v.topShown || !tops.length ? "" : ".locked"), { onclick: () => {
            if (!v.topShown && tops.length) return toast("먼저 높은 순위 1, 2위를 확인하세요", "warn");
            v.phase = "final"; Store.saveSeason(true); render();
        } }, h("span", v.topShown || !tops.length ? "⚠️" : "🔒"), h("b", many ? `최하위 3위 · 동점 포함 ${pool.length}명` : "최하위 3명"),
            h("small", !v.topShown && tops.length ? "1, 2위를 먼저 확인하세요" : many ? "눌러서 집게로 탈락 후보 3명 뽑기" : "눌러서 탈락자 선정으로"));
        return h("div.vote-stage", head,
            h("div.vote-results", top, mid.length ? h("div.vr-mid", h("h4", "중간 순위"), mid.map(row)) : null, bottom));
    }
    // ---- 4) the final: one of the bottom 3 is rescued, then the lowest of the last 2 is out
    if (v.phase === "final") return v.pool?.length > 3 && !v.picked ? voteClawStage(s, render) : voteFinalStage(s, render);
    return h("div", "?");
}

// more than 3 in the bottom group (ties) → the claw pulls 3 of them out, then the usual final
function voteClawStage(s, render) {
    const v = s.vote;
    return h("div.vote-stage.vote-final",
        h("h2.stage-title", "🕹️ 탈락 후보 3명 뽑기", h("small", `최하위 3위 안에 동점자를 포함해 ${v.pool.length}명이 있습니다 — 집게가 이 중 3명을 탈락 후보로 뽑습니다`)),
        clawElimination(v.pool, { onPicked: async three => {
            v.picked = [...three]; s.candidates = [...three];
            G.log(`🕹️ 집게로 뽑힌 탈락 후보: ${three.map(G.name).join(", ")}`);
            Store.saveSeason(true);
            await sleep(1200); render();
        } }));
}

function voteInfo(v, pid) {
    const sc = v.scores[pid];
    modal(h("div.vote-info",
        h("div.ii-pair", avatar(pid, 72), h("div", h("h3", pname(pid)), h("b.ii-score", `🗳️ 득표 ${sc.total}표`))),
        h("p.muted.small", "각 플레이어는 💞 친밀도가 가장 높은 1명에게 1표를 줍니다 (친밀도 동점이면 랜덤 · Skip한 플레이어의 표는 없음). 아래는 이 플레이어에게 표를 준 사람과 그 친밀도입니다."),
        sc.from.length ? null : h("p.muted", "받은 표가 없습니다"),
        h("div.vi-list", [...sc.from].sort((a, b) => b.score - a.score).map(f => h("details.vi-voter",
            h("summary", avatar(f.voter, 28, { effect: false }), h("span", pname(f.voter) + (f.tie ? " · 동점 랜덤" : "")), h("b" + (f.score < 0 ? ".neg" : ""), `💞 ${f.score > 0 ? "+" + f.score : f.score}`)),
            f.parts.length ? h("ul.ii-parts", f.parts.map(p => h("li" + (p.pts < 0 ? ".neg" : ""), h("span", p.label), h("b", p.pts > 0 ? `+${p.pts}` : `${p.pts}`)))) : h("p.muted.small", "공통점 없음 (0)")))),
        Object.entries(v.cast).some(([, c]) => c === "skip") ? h("p.muted.small", `⏭ Skip: ${Object.entries(v.cast).filter(([, c]) => c === "skip").map(([p]) => pname(p)).join(", ")}`) : null),
        { title: "ⓘ 득표 내역", wide: true });
}

function voteFinalStage(s, render) {
    const v = s.vote, f = SO.voteFinal();
    const three = shuffle([...s.candidates]);
    const card = pid => h("div.vf-card", { "data-pid": pid }, avatar(pid, 120), h("b", pname(pid)), h("small.vf-sc", "🗳️ ?"), h("div.vf-tag"));
    const cards = three.map(card);
    const by = pid => cards.find(c => +c.dataset.pid === +pid);
    const msg = h("div.vf-msg", "탈락 후보 3명 — 이 중 1명이 탈락합니다…");
    let started = false;
    const go = h("button.btn.gold.huge", { onclick: async () => {
        if (started) return; started = true; go.remove();
        // 1) the spotlight runs over the three, then lands on the one who is rescued
        msg.textContent = "🔦 구제될 1명은…";
        for (let k = 0; k < 14 + Math.floor(Math.random() * 4); k++) {
            cards.forEach(c => c.classList.remove("hot"));
            cards[k % 3].classList.add("hot"); Sound.tick(); await sleep(120 + k * 22);
        }
        cards.forEach(c => c.classList.remove("hot"));
        const c1 = by(f.saved1);
        c1.classList.add("saved"); c1.querySelector(".vf-sc").textContent = `🗳️ ${v.scores[f.saved1].total}표`;
        c1.querySelector(".vf-tag").textContent = f.saved1Tie ? "😇 구제! · 동점자였으나 랜덤 구제" : "😇 구제!";
        Sound.fanfare(); confetti(40, ["😇", "✨"]);
        msg.textContent = `😇 ${pname(f.saved1)} 구제! 남은 2명 중 득표가 더 적은 플레이어가 탈락합니다…`;
        await sleep(2400);
        // 2) the last two: heartbeat, then the reveal
        const two = [f.out, f.saved2].map(by);
        msg.textContent = "💓 두근… 두근…";
        for (let k = 0; k < 8; k++) { two.forEach(c => c.classList.toggle("hot", (k % 2) === 0)); Sound.tick(); await sleep(420 - k * 25); }
        two.forEach(c => c.classList.remove("hot"));
        await banner("🗳️ 탈락자는…", 1300, "bonus");
        const co = by(f.out), cs = by(f.saved2);
        co.classList.add("out"); co.querySelector(".vf-sc").textContent = `🗳️ ${v.scores[f.out].total}표`; co.querySelector(".vf-tag").textContent = "💀 탈락";
        cs.classList.add("saved"); cs.querySelector(".vf-sc").textContent = `🗳️ ${v.scores[f.saved2].total}표`;
        cs.querySelector(".vf-tag").textContent = f.saved2Tie ? "😮‍💨 생존 · 동점자였으나 랜덤 구제" : "😮‍💨 생존";
        Sound.boom();
        msg.textContent = `💀 ${pname(f.out)} 탈락 — 득표 ${v.scores[f.out].total}표${f.saved2Tie ? " (동점 → 랜덤)" : ""}`;
        await sleep(2200);
        wrap.append(h("div.row.center", h("button.btn.red.huge", { onclick: () => {
            G.log(`🗳️ 투표 탈락: ${G.name(f.out)} (득표 ${v.scores[f.out].total}표) · 구제 ${G.name(f.saved1)}${f.saved1Tie ? " (동점 랜덤)" : ""} · 생존 ${G.name(f.saved2)}${f.saved2Tie ? " (동점 랜덤)" : ""}`);
            G.eliminate(f.out);
            render();
        } }, "💀 탈락 확정")));
    } }, "🎬 탈락자 선정 시작");
    const wrap = h("div.vote-stage.vote-final", h("h2.stage-title", "🗳️ 최종 탈락자 선정", h("small", "탈락 후보 3명 중 득표가 가장 많은 1명은 구제되고, 남은 2명 중 득표가 더 적은 플레이어가 탈락합니다 · 동점이면 랜덤")),
        h("div.vf-cards", cards), msg, h("div.row.center", go));
    return wrap;
}
