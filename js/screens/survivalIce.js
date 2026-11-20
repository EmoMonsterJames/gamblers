// =====================================================================
// 🔄 Survival Land — the newer map rules (older ones: survivalLand.js)
//   🎵 every map (not only Survival Land): ☀️ sun → its own quiet background loop (¼ of the BGM volume) · other weather → that weather sound (mapAudio)
//   🧊 Icy Castle: a solid ice wall in front of every corner · 🔨 hammer (30 hits, then a
//      10 s recharge) — the breaking hit is drawn (5:10% · 10:10% · 20:30% · 30:30% · 40+:20%)
//      👸 Ice Queen: HP −20 / HP −30 / instant death / Icy Breath (the whole screen freezes for 30 s)
//   🦋 Decalcomania Casino: the play screen split into two identical halves — every object is
//      real on one side and fake (slightly off) on the other · a fake one pressed = HP −10
//      🎭 Fake Profile: Profile Copy — a devil copy of the player plays for them for 60 s
// survivalExtras() plugs into survivalLand.survivalEffects() · iceWrap() into seasonView tabBody()
// specialNpcVisit() into corners2.npcAttack()
// =====================================================================
import { h, sleep } from "../core/util.js";
import { Sound, tone, noise } from "../core/sound.js";
import { toast, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import { avatar } from "../ui/profile.js";
import { gameAudio } from "../core/gameAudio.js";
import * as LF from "../game/life.js";
import { mosquitoExtras, MOSQ_RULES } from "./survivalMosquito.js";

const turnOf = pid => { const t = G.S()?.turn; return t && +t.pid === +pid ? t : null; };
const rnd = (a, b) => a + Math.random() * (b - a);

// ================================================================ 🎵 map background loops
// the name steers the generated style (gameAudio themes): storm → epic, church → horror, ice → ice …
const BGM_NAME = {
    disaster_casino: "war storm champion", arcade: "neon arcade pixel", button_casino: "crazy chaos button",
    foggy_church: "ghost cathedral fog", quiz_casino: "quest curio quiz", inferno_casino: "evil devil inferno",
    icy_castle: "frozen ice castle", decal_casino: "joker mirror which eye", mosquito_forest: "bog frog swamp lily"
};
export const SURVIVAL_BGM_VOL = 0.125; // ¼ of the normal BGM level (0.5)
const songs = {};
// 🌦️ every map: ☀️ sun → its own quiet background loop · any other weather → only that weather's sound
let mapWatch = null;
export function mapAudio(loc) {
    if (!loc) { Sound.ambStop(); Sound.weather(null); return; }
    const w = LF.weatherAt(loc.id).id;
    Sound.weather(w === "sun" ? null : w);
    survivalBgm(loc);
    clearInterval(mapWatch); // the play screen gone (another page / turn over): both stop
    mapWatch = setInterval(() => { if (!document.querySelector(".location")) { Sound.ambStop(); Sound.weather(null); clearInterval(mapWatch); } }, 1000);
}
export function survivalBgm(loc) {
    if (!loc || LF.weatherAt(loc.id).id !== "sun") { Sound.ambStop(); return; }
    if (!(loc.id in songs)) { const s = gameAudio({ id: "sv_" + loc.id, name: BGM_NAME[loc.id] || loc.name, icon: loc.emoji }).song; songs[loc.id] = typeof s === "object" ? s : null; }
    if (songs[loc.id]) Sound.amb("sv_" + loc.id, songs[loc.id], SURVIVAL_BGM_VOL);
}

// ================================================================ 🧊 Icy Castle
export const HAMMER_MAX = 30, HAMMER_WAIT = 10;
// the hit that breaks a wall is drawn when the wall is first struck:
//   within 5 hits 10% · 6~10 hits 10% · 11~20 hits 30% · 21~30 hits 30% · 31~45 hits 20%
export const ICE_BREAK_ODDS = [[1, 5, 0.10], [6, 10, 0.10], [11, 20, 0.30], [21, 30, 0.30], [31, 45, 0.20]];
export function drawBreakAt() {
    let r = Math.random();
    for (const [a, b, p] of ICE_BREAK_ODDS) { if (r < p) return a + Math.floor(Math.random() * (b - a + 1)); r -= p; }
    return 45;
}
export const ICE_FREE = ["inv", "card"]; // the bag and the profile are not corners
export const ICY_RULES = [
    "🤧 입장할 때마다 40% 확률로 독감에 걸립니다.",
    "🧊 이 맵의 모든 코너는 단단한 얼음벽으로 막혀 있습니다 (🎒 인벤토리 · 🪪 프로필 제외).",
    `🔨 입장하면 망치를 받습니다 — 얼음벽을 클릭해서 내리치세요. 망치는 ${HAMMER_MAX}번 쓸 수 있고, 다 쓰면 ${HAMMER_WAIT}초 뒤에 다시 ${HAMMER_MAX}번 충전됩니다.`,
    "💥 내리칠 때마다 금이 가고 구멍이 뚫리며, 랜덤하게 와장창 깨집니다 — 5번 안에 10% · 6~10번 10% · 11~20번 30% · 21~30번 30% · 31번 이상 20%.",
    "👸 Ice Queen (악)만 나타납니다: HP −20 (10%) · HP −30 (10%) · 바로 사망 (5%) · 🧊 Icy Breath (75%) — 화면 전체가 얼어붙어 30초 동안 아무것도 못 합니다 (플레이 시간은 계속 흐름).",
    "⏱️ 이 맵에서 2분이 지나야 다른 Survival Land 맵권을 쓸 수 있습니다."
];
const hammerOf = t => {
    const hm = (t.hammer ||= { left: HAMMER_MAX, until: 0 });
    if (hm.left <= 0 && hm.until && Date.now() >= hm.until) { hm.left = HAMMER_MAX; hm.until = 0; }
    return hm;
};
const iceOf = (t, loc, tab) => ((t.ice ||= {})[`${loc.id}:${tab}`] ||= { hits: 0, broken: false, cracks: [], hx: Math.round(rnd(30, 70)), hy: Math.round(rnd(30, 65)) });
// a crack: a jagged line from the hit point (0~100 coordinates)
function newCrack(x, y) {
    const pts = [[x, y]];
    let a = rnd(0, Math.PI * 2);
    for (let i = 0, n = 3 + Math.floor(Math.random() * 3); i < n; i++) {
        a += rnd(-0.7, 0.7);
        const [px, py] = pts[pts.length - 1], len = rnd(4, 11);
        pts.push([Math.max(0, Math.min(100, px + Math.cos(a) * len)), Math.max(0, Math.min(100, py + Math.sin(a) * len))]);
    }
    return pts.map(p => p.map(v => Math.round(v * 10) / 10).join(",")).join(" ");
}
const SVGNS = "http://www.w3.org/2000/svg";
function crackSvg(st) {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("preserveAspectRatio", "none"); svg.classList.add("ice-cracks");
    for (const c of st.cracks) {
        for (const [cls, w] of [["glow", 1.4], ["line", 0.45]]) {
            const pl = document.createElementNS(SVGNS, "polyline");
            pl.setAttribute("points", c); pl.setAttribute("class", cls); pl.setAttribute("stroke-width", w);
            svg.append(pl);
        }
    }
    return svg;
}
// the hole grows with the hits (from the 4th hit on) — part of the corner shows through, but it still can't be used
const holeOf = st => st.hits >= 4 ? Math.min(30, 5 + (st.hits - 3) * 2.2) : 0;
function drawHole(wall, st) {
    const r = holeOf(st);
    const m = r ? `radial-gradient(ellipse ${r}% ${r * 1.25}% at ${st.hx}% ${st.hy}%, transparent 86%, #000 100%)` : "none";
    wall.style.maskImage = m; wall.style.webkitMaskImage = m;
    wall.dataset.stage = st.hits >= 12 ? "3" : st.hits >= 6 ? "2" : st.hits >= 1 ? "1" : "0";
}
// a corner behind its ice wall (unbroken) — the content sits underneath, inert
export function iceWrap(loc, t, pid, tabId, content) {
    if (!loc?.icy || ICE_FREE.includes(tabId) || !t) return content;
    const st = iceOf(t, loc, tabId);
    if (st.broken) return content;
    const under = h("div.ice-under", content);
    under.inert = true;
    let svg = crackSvg(st);
    const label = h("div.ice-label", h("b", "🧊 단단한 얼음벽"), h("small", "🔨 클릭해서 망치로 깨세요"));
    const wall = h("div.ice-wall", svg, label);
    const wrap = h("div.ice-wrap", under, wall);
    drawHole(wall, st);
    let lastHit = 0;
    wall.addEventListener("click", e => {
        const now = performance.now();
        if (now - lastHit < 140 || st.broken || !G.S()?.turn) return;
        lastHit = now;
        const hm = hammerOf(t);
        if (hm.left <= 0) {
            tone(180, 0.1, "square", 0.03);
            toast(`⏳ 망치 충전 중… ${Math.max(1, Math.ceil((hm.until - Date.now()) / 1000))}초 뒤에 다시 ${HAMMER_MAX}번`, "warn", 1500);
            wall.classList.remove("nope"); void wall.offsetWidth; wall.classList.add("nope");
            return;
        }
        hm.left--;
        if (hm.left <= 0) hm.until = Date.now() + HAMMER_WAIT * 1000;
        st.hits++;
        const r = wall.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
        st.cracks.push(newCrack(x, y));
        if (Math.random() < 0.5) st.cracks.push(newCrack(x, y));
        if (st.cracks.length > 70) st.cracks.splice(0, st.cracks.length - 70);
        // 🔨 swing + clink
        const sw = h("span.ice-swing", "🔨");
        sw.style.left = (e.clientX - r.left) + "px"; sw.style.top = (e.clientY - r.top) + "px";
        wall.append(sw); setTimeout(() => sw.remove(), 420);
        const chip = h("span.ice-chip", "❄");
        chip.style.left = sw.style.left; chip.style.top = sw.style.top;
        wall.append(chip); setTimeout(() => chip.remove(), 600);
        tone(1900 + Math.random() * 500, 0.05, "triangle", 0.05); tone(1200, 0.08, "sine", 0.03, 0.02, -300); noise(0.06, 0.05);
        wall.classList.remove("hit"); void wall.offsetWidth; wall.classList.add("hit");
        const ns = crackSvg(st); svg.replaceWith(ns); svg = ns;
        drawHole(wall, st);
        st.breakAt ||= Math.max(st.hits, drawBreakAt());
        if (st.hits >= st.breakAt) shatter(); else Store.saveSeason();
    });
    function shatter() {
        st.broken = true;
        Store.saveSeason(true);
        G.log(`🧊 ${G.name(pid)} Icy Castle 얼음벽 파괴 (${st.hits}번 만에)`);
        wall.classList.add("shatter");
        const r = wall.getBoundingClientRect();
        for (let i = 0; i < 22; i++) {
            const p = h("i.ice-shard");
            const sx = rnd(0, 100), sy = rnd(0, 100);
            p.style.cssText = `left:${sx}%;top:${sy}%;width:${rnd(26, 70)}px;height:${rnd(26, 70)}px;--dx:${(sx - 50) * rnd(4, 9)}px;--dy:${(sy - 30) * rnd(3, 8) + 160}px;--r:${rnd(-540, 540)}deg;clip-path:polygon(${[0, 1, 2, 3].map(() => `${Math.round(rnd(0, 100))}% ${Math.round(rnd(0, 100))}%`).join(",")})`;
            wall.append(p);
        }
        noise(0.5, 0.2); [2600, 2100, 1700, 3100, 1400].forEach((f, i) => tone(f, 0.25, "triangle", 0.035, i * 0.04, -400));
        toast(`💥 와장창! 얼음벽이 깨졌습니다 (${st.hits}번 만에) — 이제 코너를 이용할 수 있어요`, "ok", 2600);
        void r;
        setTimeout(() => { under.inert = false; wrap.replaceWith(content); }, 750);
    }
    return wrap;
}
// 🔨 the hammer gauge in the left bar
function hammerGauge(t) {
    const fill = h("i"), txt = h("b"), sub = h("small");
    const el = h("div.ice-hammer", h("div.ice-hammer-head", h("span.ice-hammer-ico", "🔨"), txt), h("div.ice-hammer-bar", fill), sub);
    const draw = () => {
        const hm = hammerOf(t);
        if (hm.left > 0) {
            el.classList.remove("cd");
            txt.textContent = `망치 ${hm.left} / ${HAMMER_MAX}`;
            fill.style.width = (hm.left / HAMMER_MAX * 100) + "%";
            sub.textContent = "얼음벽을 클릭해서 내리치세요";
        } else {
            const w = Math.max(0, (hm.until - Date.now()) / 1000);
            el.classList.add("cd");
            txt.textContent = `⏳ 충전 중 ${Math.ceil(w)}초`;
            fill.style.width = ((1 - w / HAMMER_WAIT) * 100) + "%";
            sub.textContent = `다 쓰면 ${HAMMER_WAIT}초 뒤 ${HAMMER_MAX}번 충전`;
        }
    };
    draw();
    return { el, draw };
}

// ================================================================ 🦋 Decalcomania Casino
export const DECAL_HP = 10;
export const DECAL_RULES = [
    "🦋 플레이 화면이 데칼코마니처럼 왼쪽 · 오른쪽 두 개로 나뉩니다 — 두 화면은 똑같아 보입니다.",
    "🎭 모든 코너의 모든 버튼 · 객체는 한쪽이 진짜, 다른 한쪽이 가짜입니다 (어느 쪽이 진짜인지는 객체마다 랜덤).",
    "🔍 가짜는 아주 살짝 다릅니다 — 색깔이 조금 다르거나, 살짝 비뚤어져 있거나, 크기가 미묘하게 다릅니다.",
    `💔 가짜를 누르면 HP −${DECAL_HP}!`,
    "😈 Fake Profile (악)만 나타납니다: Profile Copy (100%) — 내 프로필을 복제한 가짜가 60초 동안 대신 랜덤하게 플레이합니다 (진짜 · 가짜 가리지 않고 마구 누릅니다 · 40% 확률로 그 1분 동안은 HP가 얼마나 줄어도 죽지 않음 · 플레이 시간은 계속 흐름).",
    "⏱️ 이 맵에서 2분이 지나야 다른 Survival Land 맵권을 쓸 수 있습니다."
];
const DC_SEL = "button, a.btn, [role=button], input, select, textarea, .emo-ball, .donate-item";
const DC_VARS = ["dc-v1", "dc-v2", "dc-v3", "dc-v4", "dc-v5"];
function decalMount(pid, { harm }) {
    let main = null, mirror = null, obs = null, stopped = false, passing = false, timer = 0, lastSync = 0, lastHit = 0;
    const side = new Map(); // key → "o" (the original side is real) | "c" (the mirror side is real) + its fake look
    const OBS = { subtree: true, childList: true, attributes: true, characterData: true, attributeFilter: ["class", "disabled", "style", "value", "src"] };
    const keyOf = (el, i) => `${i}|${el.tagName}|${(el.textContent || el.value || el.placeholder || "").trim().slice(0, 30)}`;
    const fakeHit = (el, e) => {
        const now = performance.now();
        if (now - lastHit < 300) return;
        lastHit = now;
        const f = h("div.dc-ouch", `❤ −${DECAL_HP} 가짜!`);
        f.style.left = (e?.clientX ?? innerWidth / 2) + "px"; f.style.top = (e?.clientY ?? innerHeight / 2) + "px";
        document.body.append(f); setTimeout(() => f.remove(), 1000);
        el.classList.add("dc-caught"); setTimeout(() => el.classList.remove("dc-caught"), 700);
        Sound.hit(); tone(160, 0.25, "sawtooth", 0.04, 0, -60);
        harm(DECAL_HP, "🦋 Decalcomania Casino 가짜 객체");
    };
    // the original side: a fake one is caught before the game sees the click
    const guard = e => {
        if (passing) return;
        const o = e.target.closest?.(DC_SEL);
        if (!o || !main?.contains(o) || !o._dcFake) return;
        e.preventDefault(); e.stopImmediatePropagation();
        fakeHit(o, e);
    };
    // the mirror side: a real one passes the click to its twin, a fake one hurts
    const onMirror = e => {
        const c = e.target.closest?.(DC_SEL);
        if (!c || !mirror?.contains(c)) return;
        if (c.matches("input, select, textarea") && !c._dcFake) return; // typing goes through (forwarded on input)
        e.preventDefault(); e.stopPropagation();
        if (c._dcFake) { fakeHit(c, e); return; }
        const o = c._dcOrig;
        if (!o?.isConnected || o.disabled) return;
        passing = true;
        try { o.click(); } finally { passing = false; }
    };
    const onMirrorInput = e => {
        const c = e.target, o = c?._dcOrig;
        if (!o || c._dcFake) return;
        o.value = c.value;
        o.dispatchEvent(new Event("input", { bubbles: true }));
        o.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const onMirrorFocus = e => { const c = e.target; if (c?._dcFake && c.matches?.("input, select, textarea")) { c.blur(); fakeHit(c, e); } };
    function sync() {
        timer = 0;
        if (stopped || !main?.isConnected) return;
        // typing in a mirrored input: wait until it loses focus (a new copy would steal the caret)
        if (mirror.contains(document.activeElement) && document.activeElement.matches("input, textarea")) { schedule(); return; }
        lastSync = performance.now();
        obs.disconnect();
        const origEls = [...main.querySelectorAll(DC_SEL)];
        for (const o of origEls) { o.classList.remove("dc-fake", "dc-caught", ...DC_VARS); o._dcFake = false; }
        const clone = main.cloneNode(true);
        clone.classList.add("dc-clone");
        clone.querySelectorAll("[id]").forEach(x => x.removeAttribute("id"));
        clone.querySelectorAll("[autofocus]").forEach(x => x.removeAttribute("autofocus"));
        // canvases copy their picture
        const oc = main.querySelectorAll("canvas"), cc = clone.querySelectorAll("canvas");
        cc.forEach((c, i) => { try { c.getContext("2d").drawImage(oc[i], 0, 0); } catch { } });
        const cloneEls = [...clone.querySelectorAll(DC_SEL)];
        // mixed on purpose: inside every corner (the tab bar · the corner · an open game) about half of the
        // real objects sit on the left and half on the right — never "one whole side is the real one"
        const groupOf = o => o.closest(".game-layer") ? "game" : o.closest(".tabs") ? "tabs" : "body";
        const cnt = {};
        for (const [i, o] of origEls.entries()) { const s0 = side.get(keyOf(o, i)); if (s0) { const g = (cnt[groupOf(o)] ||= { o: 0, c: 0 }); g[s0.real]++; } }
        origEls.forEach((o, i) => {
            const c = cloneEls[i];
            if (!c) return;
            const k = keyOf(o, i);
            if (!side.has(k)) {
                const g = (cnt[groupOf(o)] ||= { o: 0, c: 0 }), d = g.o - g.c;
                const real = d > 0 ? "c" : d < 0 ? "o" : (Math.random() < 0.5 ? "o" : "c");
                g[real]++;
                side.set(k, { real, v: DC_VARS[Math.floor(Math.random() * DC_VARS.length)] });
            }
            const s = side.get(k);
            c._dcOrig = o;
            if ("value" in o && o.matches("input, select, textarea")) c.value = o.value;
            if (s.real === "o") { c._dcFake = true; c.classList.add("dc-fake", s.v); }
            else { o._dcFake = true; o.classList.add("dc-fake", s.v); }
        });
        // scroll positions follow the original
        const os = main.querySelectorAll(".tab-body, .game-layer"), cs = clone.querySelectorAll(".tab-body, .game-layer");
        mirror.replaceChildren(clone);
        cs.forEach((c, i) => { if (os[i]) c.scrollTop = os[i].scrollTop; });
        obs.observe(main, OBS);
    }
    function schedule() {
        if (timer || stopped) return;
        const wait = Math.max(30, 140 - (performance.now() - lastSync));
        timer = setTimeout(sync, wait);
    }
    function mount() {
        main = document.querySelector(".location .loc-main");
        if (!main) return false;
        const split = h("div.dc-split" + (Math.random() < 0.5 ? ".rev" : ""));
        main.parentNode.insertBefore(split, main);
        const orig = h("div.dc-half.dc-orig");
        mirror = h("div.dc-half.dc-mirror");
        orig.append(main);
        split.append(orig, h("div.dc-fold", h("span", "🦋")), mirror);
        main.addEventListener("click", guard, true);
        mirror.addEventListener("click", onMirror, true);
        mirror.addEventListener("input", onMirrorInput, true);
        mirror.addEventListener("focusin", onMirrorFocus, true);
        obs = new MutationObserver(schedule);
        sync();
        return true;
    }
    let tries = 0;
    const boot = setInterval(() => { if (stopped || mount() || ++tries > 60) clearInterval(boot); }, 50);
    // canvases redraw without DOM changes: refresh the mirror now and then
    const pulse = setInterval(() => { if (main?.querySelector("canvas")) schedule(); }, 250);
    return () => { stopped = true; clearInterval(boot); clearInterval(pulse); clearTimeout(timer); obs?.disconnect(); main?.removeEventListener("click", guard, true); };
}

// ================================================================ 🧊 Icy Breath · 😈 Profile Copy (they outlive re-renders of the turn screen)
let status = null; // { pid, t, timer, freezeEl, possEl, finger, nextAi }
export const PROFILE_SAFE = 0.4;
// 🛡️ the death shield saved the player: a short notice (no death popup)
document.addEventListener("gb:shield", () => {
    toast("🛡️ 죽을 뻔했다! 가짜 프로필이 조종하는 동안은 죽지 않습니다 (HP 1)", "warn", 3000);
    tone(880, 0.2, "triangle", 0.04); tone(1320, 0.3, "triangle", 0.03, 0.12);
});
const blockKeys = e => { if (status && (status.freezeEl || status.possEl)) { e.preventDefault(); e.stopImmediatePropagation(); } };
function clearStatus() {
    if (!status) return;
    clearInterval(status.timer);
    status.freezeEl?.remove(); status.possEl?.remove();
    document.body.classList.remove("sv-frozen", "sv-possessed");
    window.removeEventListener("keydown", blockKeys, true);
    status = null;
}
export function ensureStatus(pid) {
    const t = turnOf(pid);
    const now = Date.now();
    if (!t || ((t.freezeUntil || 0) <= now && (t.possessUntil || 0) <= now)) { if (status && (!t || status.t !== t)) clearStatus(); return; }
    if (!status || status.t !== t) {
        clearStatus();
        status = { pid, t, nextAi: now + 1500 };
        status.timer = setInterval(statusTick, 200);
        window.addEventListener("keydown", blockKeys, true);
    }
    if ((t.freezeUntil || 0) > now && !status.freezeEl) buildFreeze();
    if ((t.possessUntil || 0) > now && !status.possEl) buildPossess();
}
function statusTick() {
    const S = status;
    if (!S) return;
    const t = G.S()?.turn;
    if (t !== S.t || !document.querySelector(".location")) return clearStatus();
    const now = Date.now();
    if (S.freezeEl) {
        const left = Math.ceil((S.t.freezeUntil - now) / 1000);
        S.freezeEl.querySelector(".ice-freeze-n").textContent = String(Math.max(0, left));
        if (left <= 0) {
            S.freezeEl.classList.add("thaw");
            const el = S.freezeEl; S.freezeEl = null;
            setTimeout(() => el.remove(), 900);
            document.body.classList.remove("sv-frozen");
            noise(0.4, 0.1); [1800, 2400, 1500].forEach((f, i) => tone(f, 0.2, "triangle", 0.03, i * 0.05, -500));
            toast("🧊 얼음이 녹았다! 다시 플레이할 수 있습니다", "ok", 2500);
        }
    }
    if (S.possEl) {
        const left = Math.ceil((S.t.possessUntil - now) / 1000);
        S.possEl.querySelector(".fp-n").textContent = String(Math.max(0, left));
        if (left <= 0) {
            const el = S.possEl; S.possEl = null;
            el.classList.add("out"); setTimeout(() => el.remove(), 600);
            document.body.classList.remove("sv-possessed");
            Sound.bonus();
            toast("😈 가짜 프로필이 사라졌다 — 다시 직접 플레이할 수 있습니다!", "ok", 3000);
            G.log(`🎭 ${G.name(S.pid)} Profile Copy 해제`);
        } else if (!S.freezeEl && now >= S.nextAi && !S.aiBusy) aiMove();
    }
    if (!S.freezeEl && !S.possEl) clearStatus();
}
function buildFreeze() {
    const flakes = Array.from({ length: 26 }, () => {
        const f = h("i.ice-flake", "❄");
        f.style.cssText = `left:${rnd(0, 100)}%;top:${rnd(0, 100)}%;font-size:${rnd(18, 64)}px;--d:${rnd(0, 1.4)}s;--r:${rnd(-60, 60)}deg`;
        return f;
    });
    const el = h("div.ice-freeze", h("div.ice-frost"), h("div.ice-frost.b"), ...flakes,
        h("div.ice-freeze-box", h("div.ice-freeze-ico", "🧊"), h("b", "Icy Breath — 얼어붙었다!"), h("div.ice-freeze-cd", h("span.ice-freeze-n", "30"), h("small", "초")), h("small", "몸이 꽁꽁 얼어 아무것도 할 수 없습니다 · 플레이 시간은 계속 흐릅니다")));
    // the shield takes every click / key
    for (const ev of ["click", "mousedown", "pointerdown", "touchstart", "wheel"]) el.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    document.body.append(el);
    document.body.classList.add("sv-frozen");
    status.freezeEl = el;
    noise(1.2, 0.08); tone(2200, 1.2, "sine", 0.02, 0, -1600); tone(90, 1.4, "sine", 0.1, 0, -30);
}
// the player's picture as the devil copy: horns, an angry look, red eyes
export function devilAvatar(pid, size = 84) {
    return h("div.fp-devil", { style: { "--s": size + "px" } }, avatar(pid, size, { effect: false, frame: false }),
        h("i.fp-horn.l"), h("i.fp-horn.r"), h("i.fp-brow.l"), h("i.fp-brow.r"), h("i.fp-eye.l"), h("i.fp-eye.r"), h("i.fp-mouth"));
}
function buildPossess() {
    const finger = h("div.fp-finger", h("span", "👆"), h("small", "😈"));
    const el = h("div.fp-layer",
        h("div.fp-shield"),
        h("div.fp-badge", h("div.fp-who", devilAvatar(status.pid, 76), h("b.fp-ctrl", "IN CONTROL")), h("div.fp-info", h("b", "😈 Profile Copy"), h("small", "가짜 프로필이 대신 플레이 중…"), h("div.fp-cd", h("span.fp-n", "60"), h("small", "초 남음")))),
        finger);
    el.querySelector(".fp-shield").addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); toast("😈 지금은 가짜 프로필이 플레이 중입니다…", "warn", 1200); }, true);
    for (const ev of ["mousedown", "pointerdown", "touchstart"]) el.querySelector(".fp-shield").addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    finger.style.left = (innerWidth / 2) + "px"; finger.style.top = (innerHeight / 2) + "px";
    document.body.append(el);
    document.body.classList.add("sv-possessed");
    status.possEl = el; status.finger = finger;
    tone(110, 0.8, "sawtooth", 0.05, 0, -40); tone(70, 1, "sine", 0.12);
}
// 🤖 the devil finger: a random visible button — in the top popup if one is open, else on the play screen
// only real, pressable controls: enabled buttons / tabs / game cards that are on screen and not covered by anything
const AI_SKIP = ".pass-row, .loc-timer, .fr-list, .rv-noend, .tabs-admin, .x, .modal-x, [data-no-ai], [aria-disabled=true], .disabled, .locked";
const AI_PICK = "button, .tab, .gcard, a.btn, [role=button]";
// the spot the finger presses: the middle part of the control, and it must really land on it (nothing on top)
function aiSpot(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 14 || r.height < 12 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
    const x = Math.min(innerWidth - 2, Math.max(2, r.left + r.width * rnd(0.4, 0.6))), y = Math.min(innerHeight - 2, Math.max(2, r.top + r.height * rnd(0.4, 0.6)));
    const top = document.elementsFromPoint(x, y).find(e => !e.closest(".fp-layer"));
    return top && (top === el || el.contains(top)) ? { x, y } : null;
}
function aiTargets() {
    const pop = [...document.querySelectorAll(".modal-back:not(.out)")].pop();
    const scope = pop ? [pop] : [...document.querySelectorAll(".location .loc-main, .location .dc-mirror")];
    const out = [];
    for (const sc of scope) for (const el of sc.querySelectorAll(AI_PICK)) {
        if (el.disabled || el.closest(AI_SKIP) || el.closest(".fp-layer")) continue;
        if (getComputedStyle(el).pointerEvents === "none" || getComputedStyle(el).visibility === "hidden") continue;
        const spot = aiSpot(el);
        if (spot) out.push({ el, ...spot });
    }
    return out;
}
// ⏱️ a human pace: the finger glides over, rests a moment, presses — then a pause before the next one
export const AI_MOVE_MS = 900, AI_HOVER_MS = [450, 900], AI_GAP_MS = [2000, 3800];
async function aiMove() {
    const S = status;
    S.aiBusy = true;
    try {
        const list = aiTargets();
        if (!list.length) { S.nextAi = Date.now() + 1200; return; }
        const { el, x, y } = list[Math.floor(Math.random() * list.length)];
        S.finger.style.left = x + "px"; S.finger.style.top = y + "px";
        await sleep(AI_MOVE_MS + rnd(...AI_HOVER_MS));
        if (status !== S || !S.possEl || S.freezeEl) return;
        // still there and still pressable at that spot?
        const spot = el.isConnected && !el.disabled ? aiSpot(el) : null;
        if (!spot) return;
        S.finger.style.left = spot.x + "px"; S.finger.style.top = spot.y + "px";
        S.finger.classList.remove("tap"); void S.finger.offsetWidth; S.finger.classList.add("tap");
        tone(140, 0.06, "square", 0.03);
        el.click();
    } finally {
        S.aiBusy = false;
        S.nextAi = Date.now() + rnd(...AI_GAP_MS);
    }
}

// ================================================================ 👸 / 🎭 NPC visits with their own effect
export async function specialNpcVisit(pid, npc, move) {
    const art = h("div.npc-art", { style: { "--c": npc.color } }, h("span.npc-body", npc.emoji), h("span.npc-weapon", npc.art), h("small", npc.name, " (악)"));
    const target = h("div.npc-target", avatar(pid, 120, { effect: false }));
    const fxl = h("div.npc-fx");
    const say = h("div.npc-say", `${npc.emoji} ${npc.name}이(가) 나타났다!`);
    const res = h("div.npc-res");
    const box = h("div.npc-pop" + (move.freeze ? ".k-freeze" : ".k-copy"), h("div.npc-arena", art, fxl, target), say, res);
    const m = modal(box, { title: "⚠️ NPC 습격!", closable: false });
    Sound.boom();
    await sleep(1100);
    art.classList.add("lunge");
    const proj = h("span.npc-proj", move.freeze ? "🌬️" : "🪞");
    fxl.append(proj);
    Sound.whoosh();
    await sleep(650);
    proj.remove();
    const out = G.npcHit(pid, npc, move);
    if (out.blocked) {
        fxl.append(h("span.npc-burst", "🛡️"));
        say.textContent = `${npc.emoji} ${npc.name}의 공격!`;
        res.replaceChildren(h("b", `🎫 NPC 공격 Block 권 발동! 공격을 막았다 (남은 Block ${out.left}회)`));
        box.append(h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
        setTimeout(() => m.close(), 6000);
        await m.closed;
        return out;
    }
    if (move.freeze) {
        fxl.append(h("span.npc-burst", "❄️"));
        target.classList.add("frozen");
        say.textContent = `${npc.emoji} "얼어붙어라…" — ${move.name || "Icy Breath"}!`;
        res.replaceChildren(h("b", `🧊 차가운 숨결에 온몸이 얼어붙는다… ${move.freeze}초 동안 아무것도 할 수 없습니다 (플레이 시간은 계속 흐릅니다)`));
        noise(1, 0.08); tone(2400, 0.9, "sine", 0.02, 0, -1800);
    } else {
        fxl.append(h("span.npc-burst", "😈"));
        target.replaceChildren(devilAvatar(pid, 120));
        say.textContent = `${npc.emoji} "네 프로필은 이제 내 거야!" — ${move.name || "Profile Copy"}!`;
        res.replaceChildren(h("b", `😈 프로필이 복제되었다! ${move.profileCopy}초 동안 가짜 프로필이 마음대로 플레이합니다…`));
        tone(90, 1, "sawtooth", 0.05, 0, -30);
    }
    await sleep(2200);
    m.close();
    await m.closed;
    const t = turnOf(pid);
    if (t) {
        if (move.freeze) t.freezeUntil = Date.now() + move.freeze * 1000;
        else {
            // never stretched by a second copy: the running minute stays as it is
            if (!((t.possessUntil || 0) > Date.now())) {
                t.possessUntil = Date.now() + move.profileCopy * 1000;
                // 🛡️ 40%: whatever the copy does, the player can't die before the minute is over (G.deathShield)
                t.possessSafe = Math.random() < PROFILE_SAFE;
            }
        }
        Store.saveSeason(true);
    }
    ensureStatus(pid);
    return out;
}

// ================================================================ per turn screen (called by survivalEffects)
// → { side, hud: [tags], tick(), stop() }
export function survivalExtras(loc, t, pid, { root, harm, msg, rulesBox, die, onChange }) {
    const cleanups = [];
    const parts = [];
    let side = null;
    survivalBgm(loc);
    // the turn screen gone (another page / the turn is over): the loop stops
    const watch = setInterval(() => { if (!root?.isConnected || !document.querySelector(".location")) { Sound.ambStop(); clearInterval(watch); } }, 1000);
    cleanups.push(() => clearInterval(watch));
    if (loc.icy) {
        const g = hammerGauge(t);
        const iv = setInterval(g.draw, 200);
        cleanups.push(() => clearInterval(iv));
        side = g.el;
        parts.push(h("button.rv-tag.blue", { onclick: () => rulesBox("🧊 Icy Castle 규칙", ICY_RULES) }, "🧊 Icy Castle 규칙 ⓘ"));
        if (t.iceIn !== t.mapAt) { t.iceIn = t.mapAt; msg?.("🔨 Icy Castle 입장 — 얼음벽을 깰 망치를 받았습니다!", "ok", 4500); }
    }
    if (loc.mosquito) {
        const mq = mosquitoExtras(loc, t, pid, { msg, die, onChange });
        cleanups.push(() => mq.stop());
        side = mq.side;
        parts.push(h("button.rv-tag.green", { onclick: () => rulesBox("🦟 모기 숲 규칙", MOSQ_RULES) }, "🦟 모기 숲 규칙 ⓘ"));
    }
    if (loc.decal) {
        cleanups.push(decalMount(pid, { harm }));
        parts.push(h("button.rv-tag.purple", { onclick: () => rulesBox("🦋 Decalcomania Casino 규칙", DECAL_RULES) }, "🦋 데칼코마니 규칙 ⓘ"),
            h("span.rv-tag.red", `🎭 가짜를 누르면 HP −${DECAL_HP}`));
    }
    ensureStatus(pid); // an Icy Breath / Profile Copy still running after a re-render
    return { side, parts, tick() { }, stop() { while (cleanups.length) cleanups.pop()(); } };
}
