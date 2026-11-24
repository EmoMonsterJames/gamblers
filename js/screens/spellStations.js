// =====================================================================
// 🐝 Spelling Bee corner → three stations (sub-tabs):
//   🐝 Spelling Bee (the word game, entry 1,000G — screens/spelling.js)
//   🔗 Word Chain   (game/spellbee.js)
//   🛋️ 라운지       (🍯 꿀벌 은신처 · 🥫 꿀벌 자판기)
// =====================================================================
import { h, fmt, sleep } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, confetti } from "../core/fx.js";
import { Store } from "../core/store.js";
import { cardId, ALPHABET, LOC_BY_ID } from "../data/catalog.js";
import { FOOD_BY_ID } from "../data/life.js";
import * as G from "../game/season.js";
import * as SB from "../game/spellbee.js";
import { letterCard } from "../ui/letterCard.js";
import { avatar, displayName } from "../ui/profile.js";
import { spellingView } from "./spelling.js";

const picked = {}; // the station each player had open (kept while the corner redraws)
const STATIONS = [["bee", "🐝 Spelling Bee"], ["chain", "🔗 Word Chain"], ["lounge", "🛋️ 라운지"]];

export function spellStationsView(pid, loc, { turn = null, onChange = () => { } } = {}) {
    const cur = picked[pid] || "bee";
    const wrap = h("div.sub-corner.sb-stations");
    const redraw = () => onChange();
    wrap.append(h("div.sub-tabs", STATIONS.map(([k, label]) => h("button.sub-tab" + (k === cur ? ".on" : ""), { onclick: () => { if (k === cur) return; Sound.click(); picked[pid] = k; redraw(); } }, label))));
    const pane = h("div.sub-pane");
    pane.append(cur === "chain" ? wordChainView(pid, { turn, onChange: redraw }) : cur === "lounge" ? loungeView(pid, loc, { turn, onChange: redraw }) : spellingView(pid, loc, redraw));
    wrap.append(pane);
    return wrap;
}

// ---------------------------------------------------------------- 🔗 Word Chain
const who = pid => pid == null ? null : h("span.wc-who", avatar(pid, 26, { effect: false }), h("small", displayName(Store.player(pid))));
function chainList(wc) {
    const list = wc.chain.slice(-12);
    return h("div.wc-chain",
        wc.chain.length > list.length ? h("small.muted", `… 앞의 ${wc.chain.length - list.length}개`) : null,
        list.map((x, i) => [i ? h("span.wc-arrow", "→") : null,
            h("div.wc-link" + (x.seed ? ".seed" : ""), { title: x.cond ? SB.condText(x.cond) : "시작 단어" },
                h("b", x.w), x.seed ? h("small.muted", "🎲 오늘의 단어") : who(x.pid), x.cond ? h("small.wc-cond-s", `${x.cond.syl}음절 ${SB.posName(x.cond.pos)}`) : null)]));
}
function wordChainView(pid, { turn, onChange }) {
    const wrap = h("div.word-chain");
    const wc = SB.wordChain(), st = SB.wcState(pid), head = SB.chainHead(wc), c = wc.cond;
    SB.wcTimeout(pid);
    wrap.append(
        h("div.sb-head", h("span.sb-bee", "🔗"), h("div", h("b", "WORD CHAIN"), h("small", "단어의 끝 알파벳으로 시작하는 새 단어를 이으면 꿀벌이 알파벳 버킷에서 알파벳 하나를 무료로 줍니다!"))),
        h("div.wc-board",
            h("div.wc-word", [...head.w].map(L => letterCard(L, 34))),
            h("div.wc-cond", h("small", "이번 조건"), h("b", `${c.letter}`), h("span", `로 시작하는 `), h("b", `${c.syl}음절`), h("span", " "), h("b", SB.posName(c.pos))),
            head.pid != null ? h("small.muted", "이 단어를 이은 플레이어: ", who(head.pid)) : h("small.muted", "🎲 랜덤으로 뽑힌 시작 단어")),
        chainList(wc),
        h("ul.sb-rules",
            h("li", `입장은 랜덤 (${Math.round(SB.WC_ADMIT * 100)}% 허용) · 라운드당 1회만 참여할 수 있습니다.`),
            h("li", `START를 누르면 ${SB.WC_SECONDS}초 제한시간이 시작됩니다. 시간 안에는 여러 번 제출해 볼 수 있어요.`),
            h("li", "음절 수 · 품사(명사 / 동사 / 형용사 / 부사 / 전치사) 조건은 라운드마다, 그리고 단어가 이어질 때마다 새로 정해집니다."),
            h("li", "체인은 시즌 내내 이어지고, 시즌이 끝나면 리셋됩니다.")));
    if (st.done) {
        wrap.append(st.ok
            ? h("div.sb-reveal.ok", h("small", "🎉 승인!"), h("b", st.word), h("span", "🐝 꿀벌이 준 알파벳: "), letterCard(st.letter, 40), h("small.muted", " 다음 라운드에 다시 참여할 수 있습니다."))
            : h("div.sb-reveal.bad", h("small", "⏰ 시간 초과"), h("span.muted", "이번 라운드 참여는 끝났습니다. 다음 라운드에 다시 오세요!")));
        return wrap;
    }
    if (st.gate == null) {
        wrap.append(h("div.sb-gate", h("div.sb-gate-ico", "🎟️"), h("b", "랜덤 입장 (60% 허용)"), h("p.muted", "라운드당 한 번 입장을 시도할 수 있습니다."),
            h("button.btn.gold.big", { onclick: () => { const ok = SB.wcGate(pid); ok ? (Sound.bonus(), toast("✅ 입장 허용! START를 누르세요", "ok")) : (Sound.lose(), toast("⛔ 입장 거부 — 다음 라운드에 다시 오세요", "warn")); onChange(); } }, "🎟️ 입장 시도")));
        return wrap;
    }
    if (!st.gate) { wrap.append(h("div.sb-gate", h("div.sb-gate-ico", "⛔"), h("b", "입장 거부! 이번 라운드에는 참여할 수 없습니다."))); return wrap; }
    if (!st.started) {
        wrap.append(h("div.row.center", h("button.btn.gold.big", { onclick: () => { if (turn && turn.remaining <= 0) return toast("⏰ 플레이 시간이 끝났습니다", "warn"); if (SB.wcStart(pid)) { Sound.bonus(); onChange(); } } }, `▶ START (${SB.WC_SECONDS}초)`)));
        return wrap;
    }
    // ---- the 15-second answer box
    const clock = h("div.wc-clock"), bar = h("div.wc-bar", h("i"));
    const input = h("input.input.wc-input", { placeholder: `${c.letter}…`, maxlength: 20, autocomplete: "off", autocapitalize: "characters", spellcheck: false, onkeydown: e => { if (e.key === "Enter") submit(); } });
    const msg = h("div.wc-msg", (st.tries || []).slice(-3).map(x => h("small", `❌ ${x.w || "(빈칸)"} — ${x.why}`)));
    const go = h("button.btn.gold.big", { onclick: submit }, "📨 제출");
    wrap.append(h("div.wc-play", clock, bar, h("div.row.center", input, go), msg));
    const tick = () => {
        if (!document.body.contains(wrap)) { if (seen || ++ticks > 30) clearInterval(tm); return; } // not on screen (yet / any more)
        seen = true;
        const left = SB.wcLeft(pid);
        clock.textContent = `⏱️ ${left.toFixed(1)}초`;
        bar.firstChild.style.width = `${left / SB.WC_SECONDS * 100}%`;
        clock.classList.toggle("hurry", left <= 5);
        if (left <= 0) { clearInterval(tm); SB.wcTimeout(pid); Sound.lose(); toast("⏰ 시간 초과!", "warn"); onChange(); }
    };
    let seen = false, ticks = 0;
    const tm = setInterval(tick, 100);
    tick();
    setTimeout(() => input.focus(), 50);
    let busy = false;
    async function submit() {
        if (busy) return;
        const r = SB.wcSubmit(pid, input.value);
        if (r.over) { clearInterval(tm); Sound.lose(); toast(r.why, "warn"); return onChange(); }
        if (!r.ok) { Sound.lose(); msg.prepend(h("small", `❌ ${input.value.trim().toUpperCase() || "(빈칸)"} — ${r.why}`)); input.select(); return; }
        busy = true; clearInterval(tm);
        Sound.bonus();
        await beeBucket(r.letter);
        onChange();
    }
    return wrap;
}
// 🐝 a bee flies in with the alphabet bucket and drops the letter
async function beeBucket(letter) {
    const card = h("div.bb-card", letterCard(letter, 64));
    const ov = h("div.bee-bucket", h("div.bb-bee", h("span.bb-b", "🐝"), h("span.bb-pail", "🪣")), card,
        h("div.bb-text", `${ALPHABET.includes(letter) ? "알파벳 카드" : "알파벳권"} ${letter} 획득!`));
    document.body.append(ov);
    await sleep(1300);
    ov.classList.add("drop"); Sound.coin();
    confetti(30, ["🐝", "🍯", letter]);
    await sleep(1800);
    ov.classList.add("out"); await sleep(300); ov.remove();
}

// ---------------------------------------------------------------- 🛋️ 라운지
function loungeView(pid, loc, { turn, onChange }) {
    const s = G.S(), ps = s.ps[pid];
    const wrap = h("div.bee-lounge");
    const lg = SB.loungeOf(pid);
    wrap.append(h("div.sb-head", h("span.sb-bee", "🛋️"), h("div", h("b", "SPELLING BEE LOUNGE"), h("small", "L · O · U · N · G · E 중 랜덤으로 정해진 카드(알파벳권) 하나를 내고 입장하세요."))));
    if (!lg.in) {
        const have = ps.items[cardId(lg.need)] || 0;
        wrap.append(h("div.sb-gate",
            h("div.bl-letters", SB.LOUNGE_LETTERS.map(L => h("span.bl-l" + (L === lg.need ? ".on" : ""), letterCard(L, L === lg.need ? 52 : 34)))),
            h("b", `이번 라운드 입장 카드: ${lg.need}`), h("p.muted", `가방에 ${lg.need} ${ALPHABET.includes(lg.need) ? "알파벳 카드가" : "알파벳권이"} ${have}장 있습니다. 제출하면 사라집니다.`),
            h("button.btn.gold.big", { disabled: !have, onclick: () => { const r = SB.enterLounge(pid); if (!r.ok) return toast(r.why, "warn"); Sound.bonus(); toast("🛋️ 라운지 입장!", "ok"); onChange(); } }, `${lg.need} 제출하고 입장`)));
        return wrap;
    }
    wrap.append(h("p.notice", "✅ 라운지 입장 완료 (이번 라운드) — 아래 혜택을 이용하세요."), hideoutBox(pid, loc, turn, onChange), vendBox(pid, onChange));
    return wrap;
}
function hideoutBox(pid, loc, turn, onChange) {
    const box = h("div.bl-box.bl-hide", h("h4", "🍯 꿀벌 은신처"),
        h("small.muted", "객실 5자리 중 랜덤 1곳 · 무료 1라운드 / +4,000G 2라운드 / +8,000G 최대 3라운드 (남은 플레이어 4명 이하이면 1라운드만) · 묵는 동안 Spelling Bee가 있는 맵에서 날씨와 NPC를 피합니다."));
    const mine = SB.myHideout(pid);
    const rooms = SB.hideoutRooms(loc.id);
    box.append(h("div.bl-rooms", rooms.map(r => h("div.bl-room" + (r.who ? ".taken" : "") + (r.who && +r.who.pid === +pid ? ".mine" : ""), h("b", `${r.i + 1}번`), r.who ? h("small", +r.who.pid === +pid ? "나" : displayName(Store.player(r.who.pid))) : h("small.muted", "비어 있음")))));
    if (mine) {
        box.append(h("p.notice", `🛏️ ${mine.key.split("-")[1]}번 객실에 묵는 중 · R${mine.until}까지${mine.locId !== loc.id ? ` (${LOC_BY_ID[mine.locId]?.name || mine.locId}에서 체크인)` : ""}`));
        return box;
    }
    if (!turn) return box;
    const d = turn.beeDraw?.[loc.id];
    if (!d) {
        box.append(h("div.row.center", h("button.btn.gold", { onclick: async () => {
            const btns = [...box.querySelectorAll(".bl-room")];
            for (let k = 0; k < 14; k++) { btns.forEach(b => b.classList.remove("hot")); btns[k % btns.length].classList.add("hot"); Sound.tick(); await sleep(70 + k * 8); }
            SB.hideoutDraw(pid, turn, loc.id); onChange();
        } }, "🎲 객실 랜덤 뽑기")));
        return box;
    }
    if (d.taken != null) { box.append(h("p.notice.warn", `🚪 ${d.i + 1}번 객실은 이미 ${displayName(Store.player(d.taken))} 님이 쓰고 있습니다. 다음 턴에 다시 뽑을 수 있어요.`)); return box; }
    const ps = G.S().ps[pid];
    box.append(h("p", h("b", `🎉 ${d.i + 1}번 객실이 비어 있습니다!`), " 이용 기간을 고르세요:"),
        h("div.row.center.wrap", SB.hideoutPlans().map(p => h("button.btn" + (p.price ? ".ghost" : ".gold"), { disabled: (ps.money + (ps.loanGold || 0)) < p.price, onclick: async () => {
            if (p.price && !(await confirmBox(`${p.price.toLocaleString()}G를 내고 ${p.rounds}라운드 묵을까요?`))) return;
            const r = SB.hideoutCheckIn(pid, turn, loc.id, p.rounds);
            if (!r.ok) return toast(r.why, "warn");
            Sound.bonus(); toast(`🍯 꿀벌 은신처 체크인 — R${r.until}까지 날씨 · NPC 보호`, "ok", 3500); onChange();
        } }, p.price ? `${p.rounds}라운드 (+${fmt(p.price)} G)` : "1라운드 무료"))));
    return box;
}
function vendBox(pid, onChange) {
    const used = SB.vendUsed(pid);
    return h("div.bl-box.bl-vend", h("h4", "🥫 꿀벌 자판기"),
        h("small.muted", "라운지 입장자 전용 · 시즌당 1회 무료 랜덤 증정"),
        h("div.bl-foods", SB.BEE_FOODS.map(id => { const f = FOOD_BY_ID[id]; return h("div.bl-food", h("span.bl-fe", f.emoji), h("b", f.name), h("small", `🍚 +${f.food} · ❤️ +${f.hp}`)); })),
        h("div.row.center", h("button.btn.gold", { disabled: used, onclick: async () => {
            const r = SB.vend(pid);
            if (!r.ok) return toast(r.why, "warn");
            const f = FOOD_BY_ID[r.food];
            Sound.coin(); confetti(25, ["🍯", "🐝", f.emoji]);
            toast(`🥫 ${f.name} 증정! (🎒 인벤토리에서 먹기)`, "ok", 3500); onChange();
        } }, used ? "이번 시즌 수령 완료" : "🎁 무료로 받기")));
}
