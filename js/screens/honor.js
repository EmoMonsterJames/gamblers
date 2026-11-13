// =====================================================================
// 🏅 Honorarium corners (data/honor.js · season.js honorDraw)
//   TOP 10 → honor cash · TOP 6 → honor wheel · TOP 3 → honor box
//   Winners → money bundle + falling "Winner" anvils
// Honor Me: a hidden profile (or, for winners, one of the champions) is
// picked with a slowing light, revealed with its record, says its line,
// and the prize show starts. Everything is paid the moment the button is
// pressed (season.js), so an interrupted show loses nothing.
// =====================================================================
import { h, sleep, fmt, countUp } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, Activity, floatText } from "../core/fx.js";
import { Store } from "../core/store.js";
import { ITEM_BY_ID } from "../data/catalog.js";
import { HONOR_KINDS, honorPrizes, WINNER_START, ANVIL_ADDS, HONOR_BUDDY_GOLD } from "../data/honor.js";
import * as G from "../game/season.js";
import { avatar, displayName } from "../ui/profile.js";

const MAX_HIDDEN = 12;
export const prizeIcon = p => !p || p.kind === "none" ? "💨" : p.kind === "gold" ? "💰" : (ITEM_BY_ID[p.item]?.emoji || "🎁");
const nameOf = pid => displayName(Store.player(pid));
const rankWord = K => K.rank === 1 ? "우승" : `TOP ${K.rank}`;

export function honorView(pid, kind, { turn = null, onChange = () => { } } = {}) {
    const K = HONOR_KINDS[kind];
    const s = G.S();
    const wrap = h("div.honor-view.k-" + kind, { style: { "--hc": K.color } });
    const head = h("div.hn-head", h("span.hn-emoji", K.emoji), h("div",
        h("h3", K.name),
        h("small.muted", `입장 조건: 시즌 ${rankWord(K)} 경력 · 시즌당 ${K.uses}회 · 보상: ${K.reward} · 뽑힌 선배에게도 ${HONOR_BUDDY_GOLD}G`)));
    wrap.append(head);
    if (!G.honorEligible(pid, kind)) {
        wrap.append(h("p.notice.warn", `🚫 지난 시즌에서 ${rankWord(K)}${K.rank === 1 ? "한" : " 안에 든"} 경력이 있는 플레이어만 입장할 수 있습니다.`));
        return wrap;
    }
    const left = Math.max(0, G.honorLeft(pid, kind));
    const pool = G.honorPool(pid, kind);
    const mine = G.honorRecordText(pid, K.rank);
    wrap.append(h("p.notice", `🏅 나의 경력: ${mine || (s.sandbox ? "테스트 모드 (조건 무시)" : "-")} · 이번 시즌 남은 이용 `, h("b", `${left} / ${K.uses}회`)));
    if (!pool.length) { wrap.append(h("p.notice.warn", `아직 나 말고 ${rankWord(K)} 경력이 있는 선배가 없습니다. 다음 시즌을 기다려 주세요!`)); return wrap; }

    // ---- the stage: hidden "?" profiles, or (winners) every champion with the entrant greyed out
    const winners = kind === "winner";
    const ids = winners ? [...new Set([...pool, ...(G.honorRecords(pid, 1).length ? [pid] : [])])].sort((a, b) => a - b) : null;
    const nHidden = winners ? 0 : Math.min(MAX_HIDDEN, pool.length);
    const cards = winners
        ? ids.map(id => h("div.hn-card.face" + (id === pid ? ".me" : ""), { "data-id": id }, avatar(id, 74, { effect: false }), h("small", nameOf(id)), id === pid ? h("i.hn-me", "나") : h("i.hn-rec", G.honorRecordText(id, 1))))
        : Array.from({ length: nHidden }, () => h("div.hn-card.hidden", h("div.hn-q", "?"), h("small", "???")));
    const grid = h("div.hn-grid", cards);
    const say = h("div.hn-say");
    const btn = h("button.btn.gold.huge.hn-btn", { disabled: left <= 0, onclick: go }, left > 0 ? `${K.emoji} Honor Me` : "이번 시즌 이용 완료");
    wrap.append(
        h("p.muted.center", winners ? `역대 우승자 ${pool.length}명 중 한 명이 당신을 축하하러 옵니다 (본인 제외).` : `물음표 뒤에는 역대 ${rankWord(K)} 선배 ${pool.length}명 중 한 명이 숨어 있습니다.`),
        grid, say, h("div.row.center", btn));

    async function go() {
        if (btn.disabled) return;
        if (turn && turn.remaining <= 0) return toast("⏰ 플레이 시간이 끝났습니다", "warn");
        btn.disabled = true;
        const done = Activity.hold();
        try {
            const r = G.honorDraw(pid, kind);
            if (!r) { toast("지금은 이용할 수 없습니다", "warn"); return; }
            // 1) pretend to choose, then land
            const hop = winners ? cards.filter(c => +c.dataset.id !== pid) : cards;
            const target = winners ? cards.find(c => +c.dataset.id === r.buddy) : hop[Math.floor(Math.random() * hop.length)];
            await hopTo(hop, target);
            // 2) reveal the profile + record
            const rec = G.honorRecordText(r.buddy, K.rank);
            target.classList.remove("hidden"); target.classList.add("chosen", "face");
            target.replaceChildren(avatar(r.buddy, 96, { effect: false }), h("small", nameOf(r.buddy)));
            cards.forEach(c => c !== target && c.classList.add("dim"));
            Sound.fanfare(); confetti(30, ["✨", K.emoji]);
            say.replaceChildren(h("div.hn-reveal", avatar(r.buddy, 120), h("div",
                h("b.hn-name", `${nameOf(r.buddy)} - ${rec}`),
                h("div.hn-bubble", ""))));
            await typeIn(say.querySelector(".hn-bubble"), `“${K.msg}”`);
            await sleep(900);
            // 3) the prize
            if (kind === "top10") await cashShow(r, K);
            else if (kind === "top6") await wheelShow(r, K);
            else if (kind === "top3") await boxShow(r, K);
            else await anvilShow(r, K);
            toast(`💌 ${nameOf(r.buddy)} 선배에게도 ${HONOR_BUDDY_GOLD}G를 보냈습니다${r.buddyTo === "wallet" ? " (다음 시즌 참가 때 합류)" : ""}`, "ok", 3500);
        } finally { done(); onChange(); }
    }
    return wrap;
}

// slowing light over the cards, a little tease, then the target
async function hopTo(list, target) {
    const ti = list.indexOf(target);
    const total = list.length * (list.length > 6 ? 2 : 3) + ti + 1; // ends on ti
    let gap = 50;
    for (let k = 0; k < total; k++) {
        list.forEach(c => c.classList.remove("hot"));
        list[k % list.length].classList.add("hot");
        total - k < 6 ? Sound.heartbeat() : Sound.tick();
        await sleep(gap);
        gap = total - k < 8 ? gap * 1.25 : Math.min(110, gap * 1.02);
    }
    list.forEach(c => c.classList.remove("hot"));
    target.classList.add("hot");
    await sleep(500);
    target.classList.remove("hot");
}
async function typeIn(el, text) { for (const ch of text) { el.textContent += ch; if (ch !== " ") Sound.click(); await sleep(38); } }

// a full-screen popup; resolves when closed
function honorOverlay(cls, ...kids) {
    const ov = h("div.honor-ov.hn-k-" + cls, h("div.hn-pop", ...kids));
    document.body.append(ov);
    return ov;
}
const closeBtn = (ov, label = "확인") => new Promise(res => {
    const b = h("button.btn.gold.big", { onclick: () => { ov.classList.add("out"); setTimeout(() => ov.remove(), 300); res(); } }, label);
    ov.querySelector(".hn-pop").append(h("div.row.center", b));
});
const buddyLine = (r, K) => h("div.hn-pop-buddy", avatar(r.buddy, 64, { effect: false }), h("div", h("b", nameOf(r.buddy)), h("i", `“${K.msg}”`)));

// ------------------------------------------------------------------ TOP 10: honor cash
async function cashShow(r, K) {
    const num = h("b.hn-cash-num", "+0 G");
    const ov = honorOverlay("cash", h("div.hn-pop-title", "🎖️ HONOR CASH"), buddyLine(r, K), h("div.hn-cash", h("span.hn-env", "💌"), num));
    Sound.cash(); confetti(50, ["🪙", "💵", "🎖️"]);
    await countUp(num, 0, r.gold, 1100, v => `+${fmt(v)} G`);
    await closeBtn(ov, "감사합니다!");
}

// ------------------------------------------------------------------ TOP 6: honor wheel
const WHEEL_COLORS = ["#7c3aed", "#db2777", "#2563eb", "#059669", "#d97706", "#dc2626", "#0891b2", "#9333ea", "#65a30d", "#c2410c", "#4f46e5", "#be185d"];
function wheelSvg(list, size = 320) {
    const n = list.length, R = size / 2, seg = 360 / n;
    const pt = (a, rr) => [R + rr * Math.sin(a * Math.PI / 180), R - rr * Math.cos(a * Math.PI / 180)];
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; return e; };
    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, class: "hn-wheel-svg" });
    list.forEach((p, i) => {
        const a0 = i * seg, a1 = (i + 1) * seg;
        const [x0, y0] = pt(a0, R - 4), [x1, y1] = pt(a1, R - 4);
        svg.append(el("path", { d: `M${R},${R} L${x0},${y0} A${R - 4},${R - 4} 0 ${seg > 180 ? 1 : 0} 1 ${x1},${y1} Z`, fill: p.kind === "none" ? "#334155" : WHEEL_COLORS[i % WHEEL_COLORS.length], stroke: "#fde68a", "stroke-width": 2 }));
        const mid = a0 + seg / 2;
        const g = el("g", { transform: `rotate(${mid} ${R} ${R})` });
        g.append(el("text", { x: R, y: R * 0.22, "text-anchor": "middle", "font-size": 20 }, prizeIcon(p)));
        g.append(el("text", { x: R, y: R * 0.36, "text-anchor": "middle", "font-size": n > 10 ? 10.5 : 12, "font-weight": 900, fill: "#fff" }, p.label));
        svg.append(g);
    });
    svg.append(el("circle", { cx: R, cy: R, r: R - 3, fill: "none", stroke: "#ffcc33", "stroke-width": 6 }));
    return svg;
}
async function wheelShow(r, K) {
    const list = honorPrizes("wheel");
    let idx = list.indexOf(r.prize);
    if (idx < 0) idx = Math.max(0, list.findIndex(p => p.label === r.prize.label));
    const disc = h("div.hn-wheel-disc", wheelSvg(list));
    const result = h("div.hn-result", "SWIPE를 눌러 휠을 돌리세요!");
    const swipe = h("button.btn.gold.huge.hn-swipe", "👉 SWIPE");
    const ov = honorOverlay("wheel", h("div.hn-pop-title", "🎡 TOP6 Honor Wheel"), buddyLine(r, K),
        h("div.hn-wheel", h("div.hn-pointer", "▼"), disc, h("div.hn-hub", "TOP6")), result, h("div.row.center", swipe));
    await new Promise(res => swipe.onclick = res);
    swipe.disabled = true;
    const seg = 360 / list.length;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const deg = 360 * (6 + Math.floor(Math.random() * 3)) + (360 - (idx + 0.5) * seg) + jitter;
    disc.style.transition = "transform 5.2s cubic-bezier(.12,.7,.1,1)";
    Sound.whoosh();
    requestAnimationFrame(() => { disc.style.transform = `rotate(${deg}deg)`; });
    // ticks that slow down with the wheel
    const t0 = performance.now();
    for (let gap = 45; performance.now() - t0 < 5000; gap *= 1.07) { Sound.tick(); await sleep(gap); }
    await sleep(Math.max(0, 5300 - (performance.now() - t0)));
    swipe.parentElement.remove();
    const got = r.prize.kind !== "none";
    result.replaceChildren(h("span.hn-prize-ico", prizeIcon(r.prize)), h("b", got ? `${r.prize.label} 획득!` : "꽝… 다음 기회에!"));
    result.classList.add(got ? "win" : "miss");
    got ? (Sound.bonus(), confetti(60, ["🎡", "✨", prizeIcon(r.prize)])) : Sound.lose();
    await closeBtn(ov);
}

// ------------------------------------------------------------------ TOP 3: honor box
async function boxShow(r, K) {
    const result = h("div.hn-result", "3개의 박스 중 하나를 고르세요!");
    let picked = null;
    const boxes = [0, 1, 2].map(i => h("button.hn-box", { style: { "--i": i }, onclick: () => { if (picked == null) { picked = i; choose(); } } },
        h("div.hn-lid"), h("div.hn-boxbody", h("span.hn-ribbon"), h("b", ["A", "B", "C"][i])), h("div.hn-inside")));
    const ov = honorOverlay("box", h("div.hn-pop-title", "🎁 TOP3 Honor Box"), buddyLine(r, K), h("div.hn-boxes", boxes), result);
    let choose;
    await new Promise(res => { choose = res; });
    boxes.forEach(b => b.disabled = true);
    const others = [...(r.others || [])];
    const contents = boxes.map((_, i) => i === picked ? r.prize : others.shift() || { label: "꽝", kind: "none" });
    const open = (i, mine) => {
        const b = boxes[i], p = contents[i];
        b.querySelector(".hn-inside").replaceChildren(h("span", prizeIcon(p)), h("small", p.label));
        b.classList.add("open", mine ? "mine" : "other");
    };
    boxes[picked].classList.add("shake");
    Sound.heartbeat(); await sleep(500); Sound.heartbeat(); await sleep(500);
    boxes[picked].classList.remove("shake");
    open(picked, true);
    const got = r.prize.kind !== "none";
    got ? (Sound.bonus(), confetti(60, ["🎁", "✨", prizeIcon(r.prize)])) : Sound.lose();
    result.replaceChildren(h("span.hn-prize-ico", prizeIcon(r.prize)), h("b", got ? `${r.prize.label} 획득!` : "꽝… 빈 박스였다!"));
    result.classList.add(got ? "win" : "miss");
    await sleep(1100);
    boxes.forEach((_, i) => i !== picked && open(i, false));
    Sound.click();
    await closeBtn(ov);
}

// ------------------------------------------------------------------ Winners: money bundle + anvils
async function anvilShow(r, K) {
    const amount = h("b.hn-bundle-num", `${fmt(WINNER_START)} G`);
    const drop = h("div.hn-drop");
    const bundle = h("div.hn-bundle", h("div.hn-cash-stack", Array.from({ length: 5 }, (_, i) => h("span", { style: { "--i": i } }, "💵"))), h("span.hn-bag", "💰"));
    const note = h("div.hn-result", "시작 금액 5,000G!");
    const ov = honorOverlay("anvil", h("div.hn-pop-title.gold", "👑 You can always win anytime"), buddyLine(r, K),
        h("div.hn-anvil-stage", drop, bundle), amount, note);
    Sound.cash(); confetti(30, ["💵", "👑"]);
    await sleep(1400);
    let cur = WINNER_START;
    for (let k = 0; k < r.anvils; k++) {
        note.textContent = k === 0 ? "어…? 위에서 뭔가 떨어진다!" : `ANVIL ${k + 1}번째…!`;
        const anvil = h("div.hn-anvil", h("div.hn-anvil-top", "Winner"), h("div.hn-anvil-foot"));
        drop.append(anvil);
        Sound.whoosh();
        await sleep(560); // falling
        Sound.boom();
        ov.querySelector(".hn-pop").classList.remove("thud"); void ov.offsetWidth; ov.querySelector(".hn-pop").classList.add("thud");
        bundle.classList.remove("squash"); void bundle.offsetWidth; bundle.classList.add("squash");
        drop.append(h("div.hn-dust", "💨💨"));
        const add = ANVIL_ADDS[k];
        floatText(amount, `+${fmt(add)} G`, "pts");
        Sound.cash();
        await countUp(amount, cur, cur + add, 700, v => `${fmt(v)} G`);
        cur += add;
        await sleep(450);
        anvil.classList.add("gone");
        drop.querySelector(".hn-dust")?.remove();
        await sleep(k + 1 < r.anvils ? 650 : 200);
        anvil.remove();
    }
    note.replaceChildren(h("b", `👑 Anvil ${r.anvils}개! 총 ${fmt(r.total)} G 획득!`));
    note.classList.add("win");
    Sound.fanfare(); confetti(120, ["👑", "💵", "💰", "✨"]);
    await closeBtn(ov, "👑 받기");
}
