// =====================================================================
// 🔮 Fortune Teller corner (state: game/fortune.js)
//   fortuneView(c)                 — 🛒 상점 → 🔮 점보기 (sub-tabs: 🔮 점보기 · 🛒 Fortune Teller 상점)
//   fortuneInventory(pid, onChange) — 🎒 인벤토리: 🛂 여권 · 🃏 타로카드 · 🥠 포춘쿠키
//   tarotModal(pid, onChange)      — the tarot spread (also from the EmoMon encounter)
// =====================================================================
import { h, fmt, sleep } from "../core/util.js";
import { Sound, tone } from "../core/sound.js";
import { toast, confetti, confirmBox, modal, Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import { LOC_BY_ID, ITEM_BY_ID } from "../data/catalog.js";
import * as FT from "../game/fortune.js";
import * as LF from "../game/life.js";
import { avatar, displayName } from "../ui/profile.js";
import { passportChip } from "./passport.js";

const S = () => Store.season;
const ps_ = pid => S()?.ps?.[pid];
const nm = pid => displayName(Store.player(pid));
const alive = () => (S()?.roster || []).filter(x => !S().ps[x]?.out);

// ---------------------------------------------------------------- the seer (hooded old woman, glaring, amethyst ball)
const SEER_SVG = `<svg class="ft-seer-svg" viewBox="0 0 320 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
 <radialGradient id="ftBg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#3b1a5a"/><stop offset=".7" stop-color="#150a24"/><stop offset="1" stop-color="#07030d"/></radialGradient>
 <linearGradient id="ftHood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2050"/><stop offset="1" stop-color="#140a20"/></linearGradient>
 <radialGradient id="ftFace" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="#cdbfa3"/><stop offset=".7" stop-color="#8f7f6a"/><stop offset="1" stop-color="#3a2f2a"/></radialGradient>
 <radialGradient id="ftEye" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff7a8"/><stop offset=".5" stop-color="#d9a400"/><stop offset="1" stop-color="#5b3b00"/></radialGradient>
 <radialGradient id="ftCandle" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>
</defs>
<rect width="320" height="300" fill="url(#ftBg)"/>
<g opacity=".55"><circle cx="34" cy="150" r="26" fill="url(#ftCandle)"/><circle cx="286" cy="140" r="26" fill="url(#ftCandle)"/></g>
<g><rect x="28" y="152" width="12" height="40" rx="2" fill="#efe3c8"/><path d="M34 146q5 -8 0 -16q-5 8 0 16z" fill="#ffb020" class="ft-flame"/>
<rect x="280" y="142" width="12" height="50" rx="2" fill="#efe3c8"/><path d="M286 136q5 -8 0 -16q-5 8 0 16z" fill="#ffb020" class="ft-flame"/></g>
<g fill="#c4b5fd" opacity=".5"><path d="M60 40l2 -6 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2z"/><path d="M262 54l1.5 -4 1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5z"/><path d="M240 24l1 -3 1 3 3 1 -3 1 -1 3 -1 -3 -3 -1z"/></g>
<!-- cloak + shoulders -->
<path d="M70 300C74 222 102 182 160 178C218 182 246 222 250 300Z" fill="url(#ftHood)" stroke="#0b0612" stroke-width="3"/>
<path d="M120 300l14 -96l26 22l26 -22l14 96" fill="#24123a" opacity=".7"/>
<!-- hood -->
<path d="M84 196C70 120 98 38 160 30C222 38 250 120 236 196C222 176 206 168 196 168C200 120 186 84 160 80C134 84 120 120 124 168C114 168 98 176 84 196Z" fill="url(#ftHood)" stroke="#0b0612" stroke-width="3"/>
<path d="M160 30C150 60 146 74 160 80" fill="none" stroke="#56347a" stroke-width="2" opacity=".7"/>
<!-- face in the hood's shadow -->
<path d="M124 168C118 124 134 88 160 86C186 88 202 124 196 168C190 192 176 204 160 206C144 204 130 192 124 168Z" fill="url(#ftFace)" stroke="#2a1f1a" stroke-width="2"/>
<path d="M124 100C140 92 180 92 196 100L196 120C180 108 140 108 124 120Z" fill="#000" opacity=".45"/>
<!-- wild grey hair strands -->
<g fill="none" stroke="#bdb6ad" stroke-width="2" stroke-linecap="round" opacity=".85"><path d="M128 112q-10 22 -6 50"/><path d="M134 104q-14 30 -10 66"/><path d="M192 112q10 22 6 50"/><path d="M186 104q14 30 10 66"/></g>
<!-- glaring brows -->
<path d="M134 128L154 136" stroke="#2a1f1a" stroke-width="5" stroke-linecap="round"/><path d="M186 128L166 136" stroke="#2a1f1a" stroke-width="5" stroke-linecap="round"/>
<!-- narrowed glowing eyes -->
<g class="ft-eyes"><path d="M136 142Q146 136 156 143Q146 148 136 142Z" fill="#1a1208"/><path d="M184 142Q174 136 164 143Q174 148 184 142Z" fill="#1a1208"/>
<ellipse cx="148" cy="142" rx="4" ry="3" fill="url(#ftEye)"/><ellipse cx="172" cy="142" rx="4" ry="3" fill="url(#ftEye)"/>
<circle cx="148" cy="142" r="1.3" fill="#120800"/><circle cx="172" cy="142" r="1.3" fill="#120800"/></g>
<path d="M136 150q10 4 18 0M166 150q8 4 18 0" fill="none" stroke="#4a3b30" stroke-width="1.3"/>
<!-- hooked nose · wart · frown · wrinkles -->
<path d="M160 142C156 156 150 168 158 172C162 174 166 170 164 166" fill="#a8977c" stroke="#2a1f1a" stroke-width="2" stroke-linejoin="round"/>
<circle cx="167" cy="160" r="2.2" fill="#6b5a3e"/>
<path d="M146 186Q160 180 174 186" fill="none" stroke="#2a1f1a" stroke-width="2.6" stroke-linecap="round"/>
<path d="M140 174q-4 8 0 16M180 174q4 8 0 16M150 196q10 4 20 0M146 120q14 -4 28 0" fill="none" stroke="#5a4a3e" stroke-width="1.2" opacity=".8"/>
<!-- bony hands cupping the ball (the ball itself is an HTML layer) -->
<g fill="#b8a78c" stroke="#2a1f1a" stroke-width="2" stroke-linejoin="round">
<path d="M98 262c-6 -14 6 -26 20 -22l10 4c-6 6 -8 14 -4 22z"/><path d="M222 262c6 -14 -6 -26 -20 -22l-10 4c6 6 8 14 4 22z"/>
<path d="M118 246l-6 -10M124 244l-2 -12M210 244l2 -12M202 246l6 -10" fill="none"/></g>
</svg>`;

// ---- the amethyst ball: fog → the answer slowly comes out of the mist
function crystalBall() {
    const content = h("div.ft-ball-content");
    const ball = h("div.ft-ball", h("div.ft-ball-glow"), h("div.ft-fog.f1"), h("div.ft-fog.f2"), h("div.ft-fog.f3"), content, h("div.ft-ball-shine"), h("div.ft-ball-stand"));
    return {
        el: ball, content,
        async reveal(node) {
            ball.classList.remove("show"); ball.classList.add("swirl");
            content.replaceChildren();
            for (let i = 0; i < 6; i++) { tone(220 + i * 40, 0.5, "sine", 0.025, i * 0.25); }
            await sleep(2600);
            content.replaceChildren(node);
            ball.classList.add("show");
            Sound.chime?.();
            await sleep(1800);
            ball.classList.remove("swirl");
        },
        clear() { ball.classList.remove("show", "swirl"); content.replaceChildren(); }
    };
}
const answerNode = a => {
    if (a.kind === "profile" && Store.player(a.pid)) return h("div.ft-ans.prof", avatar(a.pid, 84, { effect: false }), h("b", nm(a.pid)));
    if (a.kind === "map" && LOC_BY_ID[a.loc]) return h("div.ft-ans.map", h("span.big", LOC_BY_ID[a.loc].emoji || "📍"), h("b", LOC_BY_ID[a.loc].name));
    if (a.kind === "item" && ITEM_BY_ID[a.item]) return h("div.ft-ans.item", h("span.big", ITEM_BY_ID[a.item].emoji || "🎁"), h("b", ITEM_BY_ID[a.item].name));
    return h("div.ft-ans.yn" + (a.yes ? ".yes" : ".no"), a.yes ? "YES" : "NO");
};
const answerText = a => {
    if (a.q === "outface") return `안개 속에서 ${nm(a.pid)}의 얼굴이 떠오릅니다… 이번 라운드 탈락자의 모습이라고 점쟁이가 속삭입니다.`;
    if (a.q === "vs") return a.yes ? `수정구슬에 당신의 얼굴이 남았습니다 — ${nm(a.target)}보다 더 오래 버틸 운명입니다.` : `수정구슬에 ${nm(a.target)}의 얼굴만 남았습니다… 그쪽이 더 오래 갈 운명입니다.`;
    if (a.q === "avoid") return a.yes ? `다음 라운드에는 ${LOC_BY_ID[a.loc]?.emoji || ""} ${LOC_BY_ID[a.loc]?.name}에 발을 들이지 마세요…` : "피해야 할 맵은 보이지 않습니다. 발길 닿는 대로 가세요.";
    if (a.q === "buy") return a.yes ? `${ITEM_BY_ID[a.item]?.emoji || ""} ${ITEM_BY_ID[a.item]?.name}… 그것이 당신을 구할 것입니다.` : "지금 꼭 사야 할 물건은 없습니다. 지갑을 아끼세요.";
    const T = { out: ["이번 라운드… 당신의 이름이 탈락자 명단에 보입니다.", "이번 라운드는 무사히 넘어갑니다."], win: ["왕관이… 당신의 머리 위에 보입니다.", "왕관은 다른 이의 것입니다."],
        die: ["검은 그림자가 당신을 갑자기 덮칩니다…", "갑작스러운 죽음은 보이지 않습니다."], top10: ["열 개의 별 중 하나가 당신의 것입니다.", "열 개의 별에 당신의 자리는 없습니다…"] }[a.q];
    return T ? T[a.yes ? 0 : 1] : "";
};

// ================================================================ the corner
export function fortuneView(c) {
    const { pid } = c;
    const wrap = h("div.ft-corner");
    let tab = "ask";
    const draw = () => {
        const bar = h("div.sub-tabs.ft-tabs",
            h("button.sub-tab" + (tab === "ask" ? ".on" : ""), { onclick: () => { tab = "ask"; draw(); } }, "🔮 점보기"),
            h("button.sub-tab" + (tab === "shop" ? ".on" : ""), { onclick: () => { tab = "shop"; draw(); } }, "🛒 Fortune Teller"));
        wrap.replaceChildren(bar, tab === "ask" ? askPane(c) : shopPane(c));
    };
    draw();
    return wrap;
}
function askPane(c) {
    const { pid } = c, ps = ps_(pid);
    const ball = crystalBall();
    const stage = h("div.ft-stage", h("div.ft-seer", { html: SEER_SVG }), ball.el);
    const say = h("div.ft-say");
    const used = FT.fortuneUsed(pid);
    let pick = null, target = null;
    const others = alive().filter(x => x !== pid);
    const sel = h("select.input.ft-target", { onchange: e => { target = +e.target.value || null; } }, h("option", { value: "" }, "— 플레이어 선택 —"), others.map(x => h("option", { value: x }, nm(x))));
    const list = h("div.ft-qs", FT.QUESTIONS.map(q => h("label.ft-q", h("input", { type: "radio", name: "ftq", disabled: used, onchange: () => { pick = q.id; } }),
        h("span", q.target ? ["제가 ", sel, " 플레이어보다 더 오래 갈 수 있나요?"] : q.text))));
    const go = h("button.btn.gold.big", { disabled: used, onclick: async () => {
        if (!pick) return toast("질문을 하나 고르세요", "warn");
        const q = FT.QUESTIONS.find(x => x.id === pick);
        if (q.target && !target) return toast("비교할 플레이어를 고르세요", "warn");
        if (!(await confirmBox(`🔮 ${fmt(FT.FORTUNE_FEE)}G를 내고 점쟁이에게 물어볼까요?\n"${q.target ? q.text.replace("[플레이어]", nm(target)) : q.text}"\n(시즌당 1번)`, "물어보기", "취소"))) return;
        const a = FT.askFortune(pid, pick, target);
        if (!a.ok) return toast(a.why, "warn");
        c.refresh?.();
        go.disabled = true; list.querySelectorAll("input,select").forEach(x => x.disabled = true);
        const hold = Activity.hold();
        try {
            say.replaceChildren(h("i", "\"흐음… 안개 속을 들여다보마…\""));
            stage.classList.add("glare");
            await ball.reveal(answerNode(a));
            say.replaceChildren(h("b", answerText(a)), h("small.ft-warn", `⚠️ ${FT.WARNING}`));
        } finally { hold(); stage.classList.remove("glare"); }
    } }, used ? "이번 시즌 점보기를 이미 봤습니다" : `🔮 물어보기 (${fmt(FT.FORTUNE_FEE)}G)`);
    // the answer of this season (seen again)
    const rec = FT.fortuneRec(pid);
    if (used && rec?.ans) { ball.content.replaceChildren(answerNode(rec.ans)); ball.el.classList.add("show"); say.replaceChildren(h("b", answerText(rec.ans)), h("small.ft-warn", `⚠️ ${FT.WARNING}`)); }
    return h("div.ft-ask",
        h("div.ft-head", h("b", "🔮 점보기"), h("small", `${fmt(FT.FORTUNE_FEE)}G · 시즌당 최대 1회 · 보유 ${fmt(ps?.money || 0)}G`)),
        stage, say,
        h("div.ft-panel", h("h4", "❓ 질문 선택하기"), list, h("div.row.center", go),
            h("p.muted.small", "순전히 재미로 보는 점입니다. 답은 YES / NO 또는 수정구슬 속 프로필 · 맵 · 아이템으로 나옵니다.")));
}
function shopPane(c) {
    const { pid } = c, ps = ps_(pid);
    const wrap = h("div.ft-shop");
    const draw = () => {
        const card = (id, price, rule, extra) => {
            const it = ITEM_BY_ID[id];
            return h("div.ft-good",
                h("div.ft-good-art." + id, it.emoji),
                h("b", it.name), h("small", rule), h("p.small", it.desc), extra,
                h("div.row.center", h("small", `보유 ${ps.items[id] || 0}개`),
                    h("button.btn.gold", { onclick: async () => {
                        if (!(await confirmBox(`${it.emoji} ${it.name} — ${fmt(price)}G\n구입할까요?`, "구입", "취소"))) return;
                        const r = FT.buyFortune(pid, id);
                        if (!r.ok) return toast(r.why, "warn");
                        Sound.cash?.(); toast(`${it.emoji} ${it.name} 구입! 🎒 인벤토리에서 사용하세요`, "ok", 3200);
                        c.refresh?.(); draw();
                    } }, `${fmt(price)}G 구입`)));
        };
        wrap.replaceChildren(
            h("div.ft-head", h("b", "🛒 Fortune Teller 상점"), h("small", `보유 ${fmt(ps.money)}G`)),
            h("div.ft-goods",
                card("tarot_card", FT.TAROT_PRICE, "시즌당 최대 1회 이용", h("small.muted", FT.tarotUsed(pid) ? "✅ 이번 시즌 타로를 이미 봤습니다" : "점보기보다 훨씬 신빙성 있는 답을 카드로 안내합니다")),
                card("fortune_cookie", FT.COOKIE_PRICE, "라운드당 최대 1회 이용", h("small.muted", "식량 +20 · HP +10"))));
    };
    draw();
    return wrap;
}

// ================================================================ 🎒 inventory
export function fortuneInventory(pid, onChange = () => {}) {
    const ps = ps_(pid);
    const chip = passportChip(pid);
    const tarot = ps?.items?.tarot_card > 0 ? h("button.btn.small.gold", { onclick: () => tarotModal(pid, onChange) }, `🃏 타로카드 사용 (${ps.items.tarot_card})`) : null;
    const cookie = ps?.items?.fortune_cookie > 0 ? h("button.btn.small.gold", { onclick: () => cookieUse(pid, onChange) }, `🥠 포춘쿠키 먹기 (${ps.items.fortune_cookie})`) : null;
    if (!chip && !tarot && !cookie) return null;
    return h("div.ft-inv", chip, tarot, cookie);
}

// ---- 🃏 the tarot spread
export async function tarotModal(pid, onChange = () => {}) {
    if (FT.tarotUsed(pid)) return toast("타로카드는 시즌당 1번만 쓸 수 있습니다", "warn");
    const t = S()?.turn, was = t?.running;
    if (t) t.running = false;
    const body = h("div.ft-tarot");
    const m = modal(body, { title: "🃏 타로카드", cls: "ft-tarot-modal" });
    const list = h("div.ft-tq", FT.TAROT_Q.map(q => {
        const why = FT.tarotAvail(pid, q.id);
        return h("button.ft-tq-btn" + (why ? ".off" : ""), { disabled: !!why, title: why || "", onclick: () => read(q) }, h("b", q.text), why ? h("small", `🔒 ${why}`) : h("small", "✨ 물어볼 수 있습니다"));
    }));
    body.append(h("p.muted", "지금 상황에 맞는 질문 하나를 고르세요. 카드가 섞인 뒤 한 장이 뒤집힙니다 (시즌당 1회)."), list);
    async function read(q) {
        const r = FT.readTarot(pid, q.id);
        if (!r.ok) return toast(r.why, "warn");
        onChange();
        const hold = Activity.hold();
        try {
            const fan = h("div.ft-fan", Array.from({ length: 7 }, (_, i) => h("div.ft-back", { style: { "--i": i - 3 } }, "✦")));
            body.replaceChildren(h("p.ft-tq-ask", `"${q.text}"`), fan);
            for (let i = 0; i < 8; i++) { Sound.tick?.(); await sleep(140); }
            fan.classList.add("gather"); await sleep(700);
            const c = r.card;
            const face = h("div.ft-card" + (r.good ? ".good" : ".bad"),
                h("div.ft-card-in",
                    h("div.ft-card-back", "✦"),
                    h("div.ft-card-face", h("small.ft-no", c.no), h("div.ft-card-art", c.art.map(a => h("span", a))), h("b", c.name), h("small", c.en))));
            body.replaceChildren(h("p.ft-tq-ask", `"${q.text}"`), face);
            await sleep(300); face.classList.add("flip"); r.good ? Sound.chime?.() : Sound.scream?.();
            await sleep(900);
            body.append(h("div.ft-read", h("p", h("b", `당신이 뽑은 카드는 ${c.desc}입니다.`)), h("p", r.line), h("small.ft-warn", `⚠️ ${FT.WARNING}`)),
                h("div.row.center", h("button.btn.gold", { onclick: () => m.close() }, "확인")));
        } finally { hold(); }
    }
    await m.closed;
    if (t && S()?.turn === t) t.running = was;
}

// ---- 🥠 the cookie
async function cookieUse(pid, onChange) {
    const r = FT.useCookie(pid, LF.addFood);
    if (!r.ok) return toast(r.why, "warn");
    onChange();
    const ck = h("div.ft-cookie", h("span.l", "🥠"), h("span.r", "🥠"));
    const paper = h("div.ft-paper", h("b", r.msg));
    const body = h("div.ft-cookie-wrap", ck, paper, h("p.ft-gain", `🍚 식량 +${r.food} · ❤️ HP +${r.hp}`), h("small.ft-warn", `⚠️ ${FT.COOKIE_WARNING}`));
    const m = modal(body, { title: "🥠 포춘쿠키" });
    await sleep(500); ck.classList.add("crack"); tone(900, 0.08, "square", 0.04); tone(600, 0.1, "square", 0.04, 0.08);
    await sleep(500); paper.classList.add("out");
    if (r.kind === "lucky") confetti(30, ["🍀", "✨"]);
    body.append(h("div.row.center", h("button.btn.gold", { onclick: () => m.close() }, "확인")));
}
