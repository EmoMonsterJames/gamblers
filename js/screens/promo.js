// =====================================================================
// 📣 홍보하기 · 🗳️ 인기 투표 (inside the 💬 Community corner) — rules in game/extra.js
// =====================================================================
import { h, sleep } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, modal, confirmBox } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import * as X from "../game/extra.js";
import { avatar, displayName } from "../ui/profile.js";

const pname = pid => { const p = Store.player(pid); return p ? displayName(p) : "?"; };

function promoCard(e, i, { shown, anon, pick = null, final = null, win = false } = {}) {
    const pl = Store.player(e.pid);
    return h("div.pr-card" + (win ? ".win" : "") + (pick ? ".pickable" : ""), pick ? { onclick: () => pick(i) } : {},
        win ? h("div.pr-crown", "👑") : null,
        pl ? avatar(e.pid, 72, { effect: false }) : h("div.big-emoji", "🙂"),
        h("b.pr-name", pl ? displayName(pl) : "?"),
        h("p.pr-text", `“${e.text}”`),
        h("div.pr-votes", final != null ? h("b", `🗳️ ${final}표`) : h("b", `🗳️ ${shown ?? 0}`, anon ? h("span.pr-q", " ??") : null)));
}

export function promoView(pid, { onChange = () => { } } = {}) {
    const wrap = h("div.promo");
    const draw = () => {
        const p = X.promo(), phase = X.promoPhase(), { shown, anon } = X.promoCounts();
        const ps = G.S()?.ps?.[pid];
        const head = [h("h2.pr-title", `✨ ${X.PROMO_TITLE} ✨`),
            h("p.muted.small.center", `홍보(${X.PROMO_FEE}P) · 투표(무료 + ${X.PROMO_VOTE_REWARD}G 보상)는 각각 시즌당 1회 · 홍보 프로필 ${X.PROMO_SLOTS}칸이 차면 투표 ${X.PROMO_VOTES}번 → 1위는 선물 상자! (시즌이 끝나도 이어집니다)`)];
        let slots = Array.from({ length: X.PROMO_SLOTS }, (_, i) => p.entries[i]
            ? promoCard(p.entries[i], i, { shown: shown[i], anon: phase === "vote" && anon })
            : h("div.pr-card.empty", h("div.big-emoji", "➕"), h("small", "빈 자리")));
        let action;
        if (phase === "register") {
            const joined = X.promoUsed(pid, "join") || p.entries.some(e => +e.pid === +pid);
            const input = h("input.input.pr-input", { maxlength: 80, placeholder: "홍보 문구 (80자)" });
            action = h("div.pr-action", h("p", `📝 홍보 등록 ${p.entries.length}/${X.PROMO_SLOTS} — 6칸이 모두 차면 투표가 시작됩니다`),
                joined ? h("p.notice.small", "이번 시즌에는 이미 홍보했습니다") : h("div.row", input, h("button.btn.gold", { onclick: async () => {
                    if (!input.value.trim()) return toast("홍보 문구를 입력하세요", "warn");
                    if (!(await confirmBox(`${X.PROMO_FEE}P를 내고 홍보 게시판에 올릴까요?\n“${input.value.trim()}”`, "홍보하기", "취소"))) return;
                    const r = X.promoRegister(pid, input.value);
                    if (!r.ok) return toast(r.why, "warn");
                    Sound.fanfare(); toast(r.full ? "📣 6칸이 모두 찼습니다! 이제 투표가 시작됩니다" : "📣 홍보 등록 완료!", "ok", 3500);
                    onChange(); draw();
                } }, `📣 홍보하기 (${X.PROMO_FEE}P)`)));
        } else {
            const n = p.votes.length, voted = X.promoUsed(pid, "vote"), anonNow = n >= X.PROMO_OPEN_VOTES;
            let ask;
            if (voted) ask = h("p.notice.small", "이번 시즌에는 이미 투표했습니다");
            else if (anonNow) ask = h("p.small", `🗳️ 투표할 프로필을 눌러 고르세요 (무료 · 투표하면 ${X.PROMO_VOTE_REWARD}G 보상!)`);
            else ask = h("button.btn.gold.big", { onclick: () => vote(null) }, `🗳️ 투표하기 (무료 · +${X.PROMO_VOTE_REWARD}G)`);
            action = h("div.pr-action",
                voted ? null : h("div.pr-reward", `🎁 지금 투표하면 ${X.PROMO_VOTE_REWARD}G를 드립니다! (무료 · 시즌당 1회)`),
                h("div.pr-votebar", h("i", { style: { width: n / X.PROMO_VOTES * 100 + "%" } }), h("span", `투표 ${n} / ${X.PROMO_VOTES}`)),
                anonNow ? h("p.notice.warn.pr-anon", "🕶️ 이번 투표부터는 익명처리되었습니다")
                    : h("p.small.muted", `첫 ${X.PROMO_OPEN_VOTES}표는 '투표하기'를 누르면 6명 중 한 명에게 랜덤으로 들어갑니다`),
                ask);
            if (anonNow && !voted) slots = p.entries.map((e, i) => promoCard(e, i, { shown: shown[i], anon: true, pick: vote }));
        }
        const last = p.last;
        wrap.replaceChildren(...head, h("div.pr-grid", slots), action,
            last ? h("details.pr-last", h("summary", `🏆 지난 인기 투표 결과 (#${last.cycle})`),
                h("div.pr-grid", last.entries.map((e, i) => promoCard(e, i, { final: last.counts[i], win: i === last.wi }))),
                h("p.center", `👑 1위: ${pname(last.winner)} (${last.counts[last.wi]}표)`)) : null,
            ps && X.promoPending(pid) ? h("div.row.center", h("button.btn.gold.big", { onclick: async () => { await promoPrize(pid); onChange(); draw(); } }, "🎁 인기 투표 선물 고르기")) : null);
    };
    async function vote(to) {
        const n = X.promo().votes.length;
        const q = n < X.PROMO_OPEN_VOTES ? `투표할까요? (무료 · 6명 중 한 명에게 랜덤으로 들어갑니다 · 투표 보상 ${X.PROMO_VOTE_REWARD}G)` : `이 프로필에 익명으로 투표할까요? (무료 · 투표 보상 ${X.PROMO_VOTE_REWARD}G)`;
        if (!(await confirmBox(q, "투표", "취소"))) return;
        const r = X.promoVote(pid, to);
        if (!r.ok) return toast(r.why, "warn");
        Sound.coin();
        Sound.cash();
        if (r.open) toast(`🗳️ ${pname(X.promo().entries[r.to]?.pid)}에게 투표했습니다! 보상 +${X.PROMO_VOTE_REWARD}G`, "ok", 3000);
        else toast(`🗳️ 익명 투표 완료! 보상 +${X.PROMO_VOTE_REWARD}G`, "ok");
        onChange(); draw();
        if (r.finished) { await promoResult(r.finished, pid); onChange(); draw(); }
    }
    draw();
    return wrap;
}

// the 20th vote: the final board and the winner
async function promoResult(last, pid) {
    Sound.fanfare(); confetti(120, ["👑", "🗳️", "✨", "🎉"]);
    const pl = Store.player(last.winner);
    const m = modal(h("div.promo.pr-final",
        h("h2.pr-title", "🏆 인기 투표 결과"),
        h("div.pr-grid", last.entries.map((e, i) => promoCard(e, i, { final: last.counts[i], win: i === last.wi }))),
        h("div.pr-winner", pl ? avatar(last.winner, 120) : null, h("h3", `👑 ${pname(last.winner)} — ${last.counts[last.wi]}표!`),
            h("p", "1위는 선물 상자 3개 중 하나를 고릅니다 · 지금 시즌에 없으면 시즌에 참가해 자기 차례가 올 때 받습니다")),
        h("div.row.center", h("button.btn.gold.big", { onclick: () => m.close() }, "확인"))), { title: "🗳️ 인기 투표 종료", wide: true, closable: false });
    await m.closed;
    if (+last.winner === +pid) await promoPrize(pid);
}

// the winner picks 1 of 3 boxes (only while they play in the running season)
export function promoPrize(pid, { atTurn = false } = {}) {
    if (!X.promoPending(pid) || !G.S()?.ps?.[pid]) return Promise.resolve(null);
    return new Promise(res => {
        const grid = h("div.hope-grid.pr-boxes");
        const m = modal(h("div.hope", atTurn ? h("h3.center", "🎉 인기 투표에 당첨되었습니다!") : null,
            h("p.center", "선물 상자 3개 중 하나를 고르세요"), grid,
            h("small.muted", `나올 수 있는 선물: ${X.PROMO_PRIZES.map(p => p.label).join(" · ")}`)), { title: "🎁 인기 투표 선물", closable: false });
        for (let i = 0; i < 3; i++) grid.append(h("button.hope-box", { onclick: async e => {
            const box = e.currentTarget;
            grid.querySelectorAll("button").forEach(b => b.disabled = true);
            const prize = X.promoClaim(pid, i);
            box.classList.add("open"); box.replaceChildren(h("span", prize?.emoji || "🎁"), h("b", prize?.label || "?"));
            Sound.cash(); confetti(50, ["🎁", "✨"]);
            await sleep(1800); m.close(); res(prize);
        } }, "🎁"));
    });
}
// start of a turn: a winner who was not around when the vote ended gets the gift now
export async function promoAtTurn(pid) { if (X.promoPending(pid)) await promoPrize(pid, { atTurn: true }); }
