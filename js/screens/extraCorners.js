// =====================================================================
// New corners & map rules (UI side of game/extra.js):
//   💬 Community · 🏟️ Arena · ⛓️ terrorist kidnap room · 🎡 Death Door wheel
//   🍬 Sugar Casino · 🌑 Dark Space · 🌋 Magma Town · 🥶 Cursed Casino
//   ☠️ Dead Land warning · 🤒 infection popups · 🧳 slot ticket / 💊 cures
// =====================================================================
import { h, sleep, fmt, fmtTime } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, modal, confirmBox } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import * as X from "../game/extra.js";
import { ITEM_BY_ID } from "../data/catalog.js";
import { CM_GOODS, CM_BY_ID, cmColor, cmEffect, cmFont } from "../data/community.js";
import { avatar, displayName } from "../ui/profile.js";
import { canPay, pay, priceLabel } from "./shop.js";
import * as M from "../emomon/game.js";
import { species, EMO } from "../emomon/data.js";
import { monPic } from "../emomon/ui.js";
import { emoFight, emoBoot } from "./emoCorners.js";
import { promoView } from "./promo.js";

const pname = pid => displayName(Store.player(pid));
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
async function alertBox(title, lines, cls = "") {
    const m = modal(h("div.alert-box" + (cls ? "." + cls.split(" ").join(".") : ""), ...[].concat(lines).filter(Boolean).map(t => typeof t === "string" ? h("p", t) : t),
        h("div.row.center", h("button.btn.gold.big", { onclick: () => m.close() }, "확인"))), { title, closable: false });
    await m.closed;
}

// ================================================================ ☠️ region warning
export async function regionWarning(region) {
    if (!region?.danger) return;
    Sound.boom();
    await alertBox("☠️ 경고", [h("div.dead-warn", "⚠️"), h("p.dead-warn-text", "경고: 당신은 가장 위험한 지역으로 입장합니다"),
        "이 지역의 맵에는 Dead Land 전용 NPC가 반드시 나타납니다 (Sugar Casino 제외)."], "warn deadland");
}

// ================================================================ 🎡 Death Door: the wheel of death
// → true = entered alive · false = died (the turn is over)
export async function deathWheel(pid, loc) {
    const W = X.DEATH_WHEEL, total = W.reduce((a, s) => a + s.w, 0);
    let acc = 0;
    const stops = W.map(s => { const a = acc; acc += s.w; return { s, a: a / total * 360, b: acc / total * 360 }; });
    const wheel = h("div.dw-wheel", { style: { background: `conic-gradient(${stops.map(x => `${x.s.c} ${x.a}deg ${x.b}deg`).join(",")})` } },
        ...stops.map(x => h("span.dw-label", { style: { transform: `rotate(${(x.a + x.b) / 2}deg) translateY(-112px) rotate(90deg)` } }, x.s.label)));
    const res = h("div.dw-res", "죽음의 휠을 돌려야 Death Door에 들어갈 수 있습니다…");
    const go = h("button.btn.red.big", "🎡 죽음의 휠 돌리기");
    const box = h("div.death-wheel", h("div.dw-pointer", "▼"), wheel, res, h("div.row.center", go));
    const m = modal(box, { title: `💀 죽음의 휠 · ${loc.emoji} ${loc.name}`, closable: false, cls: "dw-modal" });
    Sound.boom();
    const slice = await new Promise(r => go.onclick = () => r(X.spinDeathWheel()));
    go.remove();
    const st = stops.find(x => x.s === slice);
    const mid = st.a + (st.b - st.a) * (0.2 + Math.random() * 0.6);
    wheel.style.transition = "transform 4.2s cubic-bezier(.12,.75,.18,1)";
    wheel.style.transform = `rotate(${360 * 6 - mid}deg)`;
    for (let i = 0; i < 18; i++) { Sound.tick(); await sleep(80 + i * 12); }
    await sleep(1400);
    const out = slice.id === "free" ? {} : X.applyHarm(pid, { hp: slice.hp || 0, gold: slice.gold || 0, kill: !!slice.kill }, `${loc.emoji} ${loc.name}`);
    if (out.dead) { Sound.boom(); res.replaceChildren(h("b.dw-dead", `☠️ ${slice.label} — 사망했습니다…`)); }
    else if (slice.id === "free") { Sound.fanfare(); res.replaceChildren(h("b.dw-ok", "🚪 무사히 입장!")); }
    else { Sound.hit(); res.replaceChildren(h("b", `${slice.label}!`), h("small", ` 남은 HP ❤ ${Math.round(G.S().ps[pid]?.hp ?? 0)}`)); }
    box.append(h("div.row.center", h("button.btn.gold.big", { onclick: () => m.close() }, out.dead ? "확인" : "입장하기 ▶")));
    await m.closed;
    return !out.dead;
}

// ================================================================ ⚔️ Battle Town: beat an NPC Battler to get in
export async function battleGate(pid, loc) {
    try { await emoBoot(); } catch { /* catalog missing → handled below */ }
    if (!M.makeBattler || !EMO) return true;
    let foe;
    try { foe = M.makeBattler(); } catch { toast("EmoMon 데이터를 불러오지 못해 배틀 없이 입장합니다", "warn"); return true; }
    const s = species(foe.sid), me = M.fighterOf(pid);
    const go = await new Promise(res => {
        const pm = modal(h("div", h("div.emo-vs-pre",
            h("div.center", me ? monPic(M.sp(me), 100, { anim: true }) : monPic(species(EMO.BOT_ID), 100), h("b", me ? M.sp(me).name : "EmoMon Battlebot")),
            h("div.emo-vs", "VS"),
            h("div.center", monPic(s, 100, { anim: true, flip: true }), h("b", s?.name || "?"))),
            h("p.center.small", `${loc.emoji} ${loc.name}에 들어가려면 문지기 ${foe.trainer}을(를) 이겨야 합니다. 지면 다른 카지노를 다시 뽑습니다 (몬스터의 HP · 상태이상은 그대로 남습니다).`),
            h("div.row.center", h("button.btn.gold.big", { onclick: () => { pm.close(); res(true); } }, "⚔ 배틀!"))), { title: "⚔️ Battle Town 입장 배틀", closable: false, cls: "emo-modal" });
    });
    if (!go) return false;
    const r = await emoFight(pid, { mon: foe }, { title: `⚔ ${foe.trainer}`, foeLabel: foe.trainer });
    G.log(`⚔️ ${pname(pid)} Battle Town 입장 배틀 ${r.won ? "승리" : "패배"}`);
    Store.saveSeason(true);
    if (r.won) { Sound.fanfare(); toast("⚔️ 승리! Battle Town 입장", "ok"); return true; }
    Sound.lose(); await alertBox("⚔️ 패배…", ["Battle Town에 들어가지 못했습니다. 다른 카지노를 다시 뽑습니다."], "warn");
    return false;
}

// every extra door rule after the normal entry check → "ok" | "no" | "dead"
export async function extraEntry(pid, loc) {
    if (loc.battleGate && !(await battleGate(pid, loc))) return "no";
    if (loc.deathWheel && !(await deathWheel(pid, loc))) return "dead";
    return "ok";
}

// ================================================================ arrival popups
export async function arrivalExtra(s, loc) {
    const t = s.turn, pid = t?.pid;
    if (!t) return;
    const a = t.arrival?.loc === loc.id ? t.arrival : null;
    if (a?.hurry) { Sound.boom(); await alertBox("⏱️ HURRY UP!", ["Hurry Up Town! 플레이 시간이 1분으로 줄었습니다!", `남은 시간: ${fmtTime(t.remaining)}`], "warn"); }
    for (const k of a?.sick || []) {
        const d = X.DISEASES[k];
        Sound.hit();
        await alertBox(`${d.emoji} ${d.name} 감염!`, [h("div.sick-pop", d.emoji), `${loc.emoji} ${loc.name}에서 ${d.name}에 걸렸습니다!`,
            `라운드가 시작될 때마다 HP −${d.hp} · HP가 0이 되면 바로 사망합니다.`, `치료: ${ITEM_BY_ID[d.cure]?.name || d.cure} 사용 또는 Player Clinic 치료`], "warn sick");
    }
    if (loc.dark && X.ownsTypes(pid, ["Light", "Electric"])) { Sound.bonus(); await alertBox("💡 이모몬스터 도움을 받았다", ["Light / Electric 몬스터가 어둠을 밝혀 줘서 화면이 정상으로 보입니다!"]); }
    if (loc.cursed) toast("🥶 저주받은 카지노: 펫 · 스페셜 펫 · 이펙트가 작동하지 않고 RTP가 10% 낮습니다", "warn", 5000);
    if (loc.magma) toast("🌋 Magma Town: 30초마다 HP −10", "warn", 4000);
    if (loc.sugar) toast("🍬 Sugar Casino: 버튼을 누를 때마다 당 수치가 오릅니다. 100%가 되면 사망!", "warn", 5000);
}

// ================================================================ in-turn map effects
// returns { el (put inside .location), hud (sugar bar), tick() every running second, stop() }
export function mapEffects(loc, t, pid, { root, onDead, onChange }) {
    const parts = [], cleanups = [];
    let sugarBar = null, sugarFill = null, sugarTxt = null;
    const dead = () => { stop(); onDead(); };
    // 🍬 sugar level bar + candy pops
    const candy = () => {
        const layer = h("div.candy-layer");
        for (let i = 0; i < 10; i++) layer.append(h("i", { style: { left: rint(10, 90) + "%", "--dx": rint(-140, 140) + "px", "--d": (i * 0.05) + "s" } }, ["🍬", "🍭", "🍫", "🧁", "🍩"][i % 5]));
        document.body.append(layer); setTimeout(() => layer.remove(), 1600);
    };
    const drawSugar = () => {
        if (!sugarBar) return;
        const v = t.sugar || 0;
        sugarFill.style.width = v + "%";
        sugarTxt.textContent = `🍬 당 수치 ${v}%`;
        sugarBar.classList.toggle("danger", v >= 70);
    };
    const sugarUp = range => {
        const r = X.addSugar(pid, range);
        if (!r) return;
        candy(); Sound.coin();
        drawSugar();
        if (r.dead) { toast("🍬 설탕중독으로 사망…", "error", 5000); setTimeout(dead, 900); }
        else toast(`🍬 당 +${r.add}% → ${r.level}%`, r.level >= 70 ? "warn" : "info", 1400);
    };
    if (loc.sugar) {
        sugarFill = h("i"); sugarTxt = h("b");
        sugarBar = h("div.sugar-bar", h("div.sugar-track", sugarFill, h("span.sugar-end", "☠️ 바로사망")), sugarTxt);
        drawSugar();
        // any play / bet / spin button pressed inside a game → +5~30%
        const onClick = e => {
            const b = e.target.closest?.("button");
            if (!b || !b.closest(".game-layer") || b.disabled) return;
            if (/닫기|나가기|✕|close|back/i.test(b.textContent || "") || b.classList.contains("x")) return;
            sugarUp(X.SUGAR_PLAY);
        };
        root.addEventListener("click", onClick, true);
        cleanups.push(() => root.removeEventListener("click", onClick, true));
    }
    // 🌑 Dark Space: everything dark, a faint light around the mouse (Light / Electric owners see normally)
    if (loc.dark && !X.ownsTypes(pid, ["Light", "Electric"])) {
        const ov = h("div.dark-overlay");
        const mv = e => { ov.style.setProperty("--mx", e.clientX + "px"); ov.style.setProperty("--my", e.clientY + "px"); };
        document.addEventListener("mousemove", mv);
        document.body.append(ov);
        cleanups.push(() => { document.removeEventListener("mousemove", mv); ov.remove(); });
    }
    let magmaAcc = 0;
    function tick() {
        if (!t.running) return;
        // 🌋 HP −10 every 30 s
        if (loc.magma && ++magmaAcc >= 30) {
            magmaAcc = 0;
            const r = X.applyHarm(pid, { hp: 10 }, `${loc.emoji} ${loc.name}`);
            Sound.hit(); toast("🌋 마그마 열기! HP −10", "warn", 2000); onChange?.();
            if (r.dead) { toast("🌋 마그마에 녹아 사망…", "error", 5000); return dead(); }
        }
        // 🍬 sugar climbs on its own too (+5~15% at random moments)
        if (loc.sugar && Math.random() < 1 / 25) sugarUp(X.SUGAR_IDLE);
    }
    function stop() { while (cleanups.length) cleanups.pop()(); }
    return { hud: sugarBar, el: parts, tick, stop };
}

// ================================================================ ⛓️ terrorist kidnap room
export function kidnapView(pid, { onFreed, onDead, onChange }) {
    const t = G.S().turn;
    const ring = h("div.kr-ring", ...["💣", "🥷", "💣", "🥷", "💣", "🥷"].map((e, i) => h("span", { style: { "--i": i } }, e)));
    const status = h("div.kr-status");
    const btns = h("div.kr-btns");
    const draw = () => {
        const tried = X.escapeTried();
        status.replaceChildren(tried ? h("p.muted", "이번 턴의 탈출 시도는 끝났습니다. 턴을 종료하고 다음 라운드를 기다리세요…") : h("p", "탈출 버튼 6개 중 하나를 누르세요. 결과는 무작위입니다 (턴마다 1번)."));
        btns.replaceChildren(...X.ESCAPE.map((e, i) => h("button.btn.kr-btn", { disabled: tried, onclick: () => escape() }, `🚪 탈출 ${i + 1}`)));
    };
    async function escape() {
        const out = X.tryEscape(pid);
        if (!out) return;
        out.dead ? Sound.boom() : out.freed ? Sound.fanfare() : out.hope ? Sound.bonus() : Sound.hit();
        if (out.dead) { await alertBox("☠️ 처형", [out.msg], "warn"); return onDead(); }
        if (out.hope) {
            const box = await hopeBoxes(pid);
            onChange?.();
            if (box.id === "free") return onFreed();
            draw(); return;
        }
        await alertBox(out.freed ? "🕊️ 탈출 성공!" : "⛓️ 탈출 실패", [out.label, out.msg], out.freed ? "" : "warn");
        onChange?.();
        if (out.freed) return onFreed();
        draw();
    }
    draw();
    return h("div.kidnap-room",
        h("div.kr-light"),
        h("div.kr-center", ring, h("div.kr-avatar", avatar(pid, 110, { effect: false }))),
        h("h2.kr-title", "⛓️ 테러리스트 납치 공간"),
        h("p.kr-sub", `라운드마다 이곳으로 돌아옵니다 · 남은 시간 ${fmtTime(t?.remaining || 0)} · 턴은 언제든 바로 끝낼 수 있습니다`),
        status, btns,
        h("details.kr-odds", h("summary", "탈출 확률표"), h("ul", X.ESCAPE.map(e => h("li", `${e.label} — ${e.w}%`)), h("li", "희망이 보인다!! → 상자 4개 중 1개: 3,000G / 5P / 탈출 / HP +10 (각 25%)"))));
}
function hopeBoxes(pid) {
    return new Promise(res => {
        const grid = h("div.hope-grid");
        const m = modal(h("div.hope", h("p", "🌟 희망이 보인다!! 상자 하나를 고르세요"), grid), { title: "🌟 희망이 보인다!!", closable: false });
        for (let i = 0; i < 4; i++) grid.append(h("button.hope-box", { onclick: async e => {
            grid.querySelectorAll("button").forEach(b => b.disabled = true);
            const box = X.openHopeBox(pid);
            e.currentTarget.classList.add("open"); e.currentTarget.replaceChildren(h("span", box.emoji), h("b", box.label));
            box.id === "free" ? (Sound.fanfare(), confetti(40)) : Sound.coin();
            await sleep(1600); m.close(); res(box);
        } }, "🎁"));
    });
}

// ================================================================ 💬 Community
const ANIM_LETTERS = { wander: "cm-wander", spin: "cm-spin", combo: "cm-combo" };
export function postView(p) {
    const st = p.style || {};
    const c = cmColor(st.color), f = cmFont(st.font), fx = cmEffect(st.effect);
    const txt = h("div.cm-text" + (c?.css === "rainbow" ? ".rainbow" : c?.css === "goldsilver" ? ".goldsilver" : "") + (st.bold ? ".bold" : "") + (st.underline ? ".under" : "") + (st.anim === "shake" || st.anim === "combo" ? ".shake" : ""),
        { style: { color: c && !["rainbow", "goldsilver"].includes(c.css) ? c.css : "#fff", fontFamily: f?.css || "" } });
    // letter animations: a few letters wander / spin
    if (ANIM_LETTERS[st.anim]) [...p.text].forEach((ch, i) => txt.append(h("span" + (ch !== " " && (i % 3 === 0) ? "." + ANIM_LETTERS[st.anim] : ""), { style: { "--i": i % 7 } }, ch)));
    else txt.textContent = p.text;
    const fxl = fx ? h("div.cm-fx.fx-" + fx.id, ...Array.from({ length: 8 }, (_, i) => h("i", { style: { left: (i * 13 + 4) + "%", "--d": (i * 0.35) + "s" } }, fx.fx[i % fx.fx.length]))) : null;
    const pl = Store.player(p.pid);
    return h("div.cm-post", fxl, h("div.cm-head", pl ? avatar(p.pid, 34, { effect: false }) : null, h("b", pl ? displayName(pl) : "?"), h("small.muted", ` · 시즌 ${p.season} · ${new Date(p.at).toLocaleDateString()}`)), txt);
}
function commentView(pid, { onChange = () => { } } = {}) {
    const ps = G.S().ps[pid];
    const wrap = h("div.community");
    const isIn = X.communityDoor(pid);
    if (!isIn) {
        wrap.append(h("div.entry-check.no", h("div.bouncer", "🙅"), h("h2", "커뮤니티 입장 거절!"), h("p", "이번 라운드에는 커뮤니티 문이 열리지 않았습니다 (입장 확률 60%). 다음 라운드에 다시 오세요.")));
        return wrap;
    }
    const draw = () => {
        const owned = X.cmOwned(pid);
        const pickSel = (kind, label) => {
            const list = owned.filter(o => o.kind === kind);
            return h("label.cm-pick", label, h("select", { "data-kind": kind }, h("option", { value: "" }, kind === "color" ? "기본 (흰색)" : "사용 안 함"), list.map(o => h("option", { value: o.id }, `${o.name} ×${o.n}`))));
        };
        const ta = h("textarea.cm-input", { maxlength: 200, placeholder: "코멘트를 남겨 보세요 (200자 · 시즌당 1회 · 500G)" });
        const sels = h("div.cm-picks", pickSel("color", "🖊️ 펜"), pickSel("effect", "✨ 이펙트"), pickSel("font", "🔤 글씨체"), pickSel("bold", "𝐁 볼드"), pickSel("underline", "U̲ 밑줄"), pickSel("anim", "🌀 애니메이션"));
        const posted = X.postedThisSeason(pid);
        const writeBtn = h("button.btn.gold", { disabled: posted, onclick: async () => {
            const style = {};
            sels.querySelectorAll("select").forEach(s => { if (s.value) style[s.dataset.kind] = s.value; });
            if (!(await confirmBox(`코멘트를 ${fmt(X.COMMENT.FEE)}G에 작성할까요?${Object.keys(style).length ? `\n사용되는 꾸미기 아이템 ${Object.keys(style).length}개는 사라집니다.` : ""}`, "작성", "취소"))) return;
            const r = X.writePost(pid, ta.value, style);
            if (!r.ok) return toast(r.why, "warn");
            Sound.cash(); toast("💬 코멘트 작성 완료!", "ok"); onChange(); draw();
        } }, posted ? "이번 시즌 작성 완료" : `💬 코멘트 작성 (${fmt(X.COMMENT.FEE)}G)`);
        const champ = X.isChampion(pid);
        const shop = h("div.cm-shop", CM_GOODS.map(g => {
            const blocked = g.winner && !champ;
            return h("button.cm-good", { disabled: blocked || !canPay(ps, g), title: g.desc, onclick: async () => {
                if (!(await confirmBox(`${g.name}을(를) ${priceLabel(g)}에 살까요?\n${g.desc}`, "구매", "취소"))) return;
                if (!canPay(ps, g)) return toast("골드 · 포인트가 부족합니다", "warn");
                pay(ps, g); ps.items[g.id] = (ps.items[g.id] || 0) + 1;
                G.log(`💬 ${pname(pid)} 커뮤니티 상점: ${g.name}`); Store.saveSeason(true);
                Sound.coin(); toast(`${g.name} 구매!`, "ok"); onChange(); draw();
            } }, h("span.cm-ico", g.kind === "color" ? h("i.cm-swatch" + (["rainbow", "goldsilver"].includes(cmColor(g.ref)?.css) ? "." + cmColor(g.ref).css : ""), { style: { background: cmColor(g.ref)?.css } }) : g.emoji),
                h("b", g.name), h("small", blocked ? "🏆 시즌 우승 전적 필요" : priceLabel(g)), ps.items[g.id] > 0 ? h("em", `보유 ${ps.items[g.id]}`) : null);
        }));
        const list = X.posts();
        wrap.replaceChildren(
            h("h3", "💬 커뮤니티"),
            h("p.muted.small", "코멘트는 시즌이 바뀌어도 남습니다 · 플레이어당 시즌 1회 · 꾸미기 아이템은 1회용입니다"),
            h("div.cm-write", ta, sels, h("div.row.end", writeBtn)),
            h("details.cm-shop-wrap", h("summary", "🛍️ 커뮤니티 상점"), shop),
            h("div.cm-list", list.length ? list.slice(0, 100).map(postView) : h("p.muted.center", "아직 코멘트가 없습니다 — 첫 코멘트를 남겨 보세요!")));
    };
    draw();
    return wrap;
}

// ================================================================ 🏟️ Arena: 1:1 vs a random opponent (2 per season)
export function arenaView(pid, { turn, onChange = () => { } } = {}) {
    const wrap = h("div.arena-corner");
    const draw = () => {
        const left = X.arenaLeft(pid), me = M.fighterOf(pid);
        wrap.replaceChildren(
            h("h3", "🏟️ 아레나"),
            h("ul.small.muted", h("li", "무작위 상대와 1:1 EmoMon 배틀 — 70% 몬스터를 가진 플레이어 · 30% NPC Battler"),
                h("li", "상대는 언제나 HP · PP 가득, 상태이상 없이 싸우고 배틀 뒤 원래 상태로 돌아갑니다"),
                h("li", "내 몬스터의 HP · PP · 상태이상은 배틀 후에도 그대로 남습니다"),
                h("li", `승리 ${fmt(X.ARENA_PRIZE[0])}~${fmt(X.ARENA_PRIZE[1])}G · 패배는 보상 없음 · 시즌당 ${X.ARENA_PER_SEASON}회`),
                h("li", "배틀 중에는 턴 시간이 멈추고 NPC가 나타나지 않습니다")),
            h("div.arena-me", me ? monPic(M.sp(me), 80, { anim: true }) : null, h("b", me ? `⚔ ${M.sp(me).name} · HP ${M.hpOf(me)}/${M.maxHp(me)}` : "몬스터가 없어 Battlebot이 출전합니다")),
            h("div.row.center", h("button.btn.gold.big", { disabled: left <= 0, onclick: go }, left > 0 ? `🏟️ 도전! (남은 ${left}회)` : "이번 시즌 아레나 횟수를 모두 썼습니다")));
    };
    async function go() {
        if (X.arenaLeft(pid) <= 0) return;
        if (turn && turn.remaining <= 0) return toast("시간이 종료되었습니다", "warn");
        try { await emoBoot(); } catch (e) { return toast("EmoMon 데이터를 불러오지 못했습니다", "warn"); }
        const was = turn?.running; if (turn) { turn.running = false; turn.arena = true; }
        try {
            const pool = X.arenaPlayerPool(pid);
            let foeMon, foeLabel;
            if (pool.length && Math.random() >= X.ARENA_NPC) {
                const foePid = pool[Math.floor(Math.random() * pool.length)];
                foeMon = X.arenaFoeMon(foePid); foeLabel = `${pname(foePid)}의 몬스터`;
            }
            if (!foeMon) { foeMon = M.makeBattler(); foeLabel = foeMon.trainer; }
            X.useArena(pid);
            Sound.fanfare();
            const r = await emoFight(pid, { mon: foeMon }, { title: `🏟️ 아레나 vs ${foeLabel}`, foeLabel });
            if (r.won) { const g = X.arenaWin(pid, foeLabel); Sound.cash(); confetti(60, ["🏆", "🪙"]); await alertBox("🏟️ 아레나 승리!", [h("div.emo-reward-amt", `+${fmt(g)} G`), `${foeLabel}을(를) 이겼습니다!`]); }
            else { X.arenaLose(pid, foeLabel); Sound.lose(); toast(`💥 아레나 패배… (vs ${foeLabel})`, "warn", 3500); }
        } finally { if (turn) { turn.running = was; turn.arena = false; } Store.saveSeason(true); }
        onChange(); draw();
    }
    draw();
    return wrap;
}

// ================================================================ 🎒 inventory: cures + EmoMon slot ticket
export function extraInventory(pid, onChange = () => { }) {
    const ps = G.S().ps[pid];
    const rows = [];
    for (const id of ["flu_cure", "cancer_cure"]) if (ps.items[id] > 0) rows.push(h("button.btn.small", { onclick: () => {
        const r = X.useCureItem(pid, id);
        if (!r.ok) return toast(r.why, "warn");
        Sound.bonus(); toast(`💚 ${X.DISEASES[r.kind].name} 치료 완료!`, "ok"); onChange();
    } }, `${ITEM_BY_ID[id]?.emoji || "💊"} ${ITEM_BY_ID[id]?.name} ×${ps.items[id]} 사용`));
    if (ps.items.emo_slot > 0) rows.push(h("button.btn.small", { onclick: () => {
        const r = X.useSlotTicket(pid);
        if (!r.ok) return toast(r.why, "warn");
        Sound.bonus(); toast(`🧳 EmoMon 슬롯 ${r.slots}칸!`, "ok"); onChange();
    } }, `🧳 이모몬스터 슬롯 확장권 ×${ps.items.emo_slot} 사용 (지금 ${X.emoSlots(pid)}칸)`));
    const sick = X.diseasesOf(pid);
    if (!rows.length && !sick.length) return null;
    return h("div.extra-inv", sick.length ? h("p.notice.warn.small", `🤒 현재 질병: ${sick.map(k => `${X.DISEASES[k].emoji} ${X.DISEASES[k].name} (라운드마다 HP −${X.DISEASES[k].hp})`).join(" · ")}`) : null, rows.length ? h("div.row", rows) : null);
}

// ================================================================ round start: disease damage report
export function sickTickNotice(s) {
    const list = s.sickTick || [];
    if (!list.length) return null;
    return h("div.loan-deaths.sick-tick", h("b", "🤒 질병 피해 (라운드 시작)"), list.map(x => h("div.cand-card", avatar(x.pid, 56, { effect: false }),
        h("small", `${displayName(Store.player(x.pid))} · HP −${x.dmg}${x.dead ? " ☠️ 사망" : ""}`))));
}

// ================================================================ 🥶 Cursed Casino: the game's config with 10% less RTP
export function cursedConfig(kind, cfg, loc) {
    const cut = 1 - (loc?.rtpCut || 0);
    if (!loc?.cursed || !cfg || cut >= 1) return cfg;
    if (kind === "casino") return cfg.rtp != null ? { ...cfg, rtp: cfg.rtp * cut, _t: null } : cfg;
    const out = { ...cfg };
    if (out.px != null) out.px = out.px * cut;
    if (Array.isArray(out.features)) out.features = out.features.map(f => f?.p != null ? { ...f, p: f.p * cut } : f);
    return out;
}

// ================================================================ 💬 Community corner: 💬 코멘트 · 📣 홍보하기
export function communityView(pid, { onChange = () => { } } = {}) {
    if (!X.communityDoor(pid)) return commentView(pid, { onChange }); // shows the refusal
    let tab = "comment";
    const body = h("div"), bar = h("div.bk-tabs");
    const draw = () => {
        bar.replaceChildren(...[["comment", "💬 코멘트"], ["promo", "📣 홍보하기"]].map(([k, l]) => h("button.bk-tab" + (k === tab ? ".on" : ""), { onclick: () => { tab = k; draw(); } }, l)));
        body.replaceChildren(tab === "comment" ? commentView(pid, { onChange }) : promoView(pid, { onChange }));
    };
    draw();
    return h("div.community-corner", bar, body);
}
