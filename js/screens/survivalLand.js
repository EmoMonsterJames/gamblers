// =====================================================================
// 🔄 Survival Land map rules (패자부활전 only — see game/revival.js)
//   🌪️ Disaster Casino: earthquake · flood (3 stages, oxygen) · gale — sometimes together
//   🔘 Button Casino:   every button pressed in the play area costs HP −5
//   ⛪ Foggy Church:    fog for 10 s · the devil statue grows → at 100 it breaks → devil wheel
//                       🧑‍⚖️ Priest NPC: sermon (30 s of hymns) / forced donation from the player's OWN gold
// survivalEffects() plugs into extraCorners.mapEffects(); priestVisit() into corners2.npcAttack().
// =====================================================================
import { h, sleep, fmt } from "../core/util.js";
import { Sound, tone, noise } from "../core/sound.js";
import { toast, modal, confetti, activityBusy } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import * as X from "../game/extra.js";
import * as RV from "../game/revival.js";
import { ITEM_BY_ID } from "../data/catalog.js";
import { avatar } from "../ui/profile.js";
import { quizQuestion } from "../data/quiz.js";

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const ps_ = pid => G.S()?.ps?.[pid];
async function alertBox(title, lines, cls = "") {
    const m = modal(h("div.alert-box" + (cls ? "." + cls.split(" ").join(".") : ""), ...[].concat(lines).filter(Boolean).map(t => typeof t === "string" ? h("p", t) : t),
        h("div.row.center", h("button.btn.gold.big", { onclick: () => m.close() }, "확인"))), { title, closable: false });
    await m.closed;
}

// ---------------------------------------------------------------- 🌪️ Disaster Casino rules
export const DISASTER = {
    quake: pid => X.ownsTypes(pid, ["Earth"]) ? 5 : 10,
    wind: pid => X.ownsTypes(pid, ["Fly", "Air", "Space"]) ? 0 : 5,
    flood2: pid => X.ownsTypes(pid, ["Water", "Ice"]) ? 0 : 5,
    // stage 3 without an oxygen tank: oxygen loss range + HP loss per breath
    flood3: pid => ({ oxy: X.ownsTypes(pid, ["Air"]) ? [1, 5] : X.ownsTypes(pid, ["Water"]) ? [5, 10] : [5, 20], hp: X.ownsTypes(pid, ["Water", "Ice"]) ? 5 : 10 })
};
export const DISASTER_RULES = [
    "🫨 지진: HP −10 (🪨 Earth 속성 몬스터 보유 시 −5) · 화면이 크게 흔들립니다",
    "🌪️ 강풍: HP −5 + 아이템 1개를 빼앗김 (패자부활전 인벤토리 먼저 → 없으면 내 아이템) · 🪽 Fly / 💨 Air / 🪐 Space 보유 시 HP 감소 없음",
    "🌊 홍수 1단계(⅓): 영향 없음 · 2단계(⅔): HP −5 (💧 Water / 🧊 Ice 보유 시 없음)",
    "🌊 홍수 3단계(가득): 🤿 산소통 필요! 없으면 산소 레벨 100에서 3초마다 5~20% 감소 + HP −10 · 산소 0 또는 HP 0 = 즉사",
    "　└ 💧 Water: 산소 5~10% · HP −5 / 💨 Air: 산소 1~5% (HP −10) / 🧊 Ice: 산소 5~20% · HP −5",
    "재난은 동시에 일어날 수 있습니다 (홍수는 동시 발생 시 2단계까지) · 홍수 3단계일 땐 지진 · 강풍이 없습니다 · 물이 다 빠질 때까지 홍수는 다시 오지 않습니다",
    "⏱️ 이 맵에서는 남은 시간이 5분 이하일 때만 다른 Survival Land 맵권을 쓸 수 있습니다"
];
export const CHURCH_RULES = [
    "🌫️ 랜덤하게 안개가 10초 동안 화면 전체를 덮습니다",
    "😈 화면 아래 악마의 조각상이 랜덤하게 5~15씩 자랍니다 — 100이 되면 깨지면서 😈 악마의 휠 (50% 즉사 · 30% HP −50 · 20% HP −20)",
    "🧑‍⚖️ Priest (악): 설교 (30초 찬양 대기 · 플레이 시간은 계속 흐름) / 기부 강요 (내 원래 골드에서 기부 — 적게 낼수록 위험!)"
];

// sounds: a soft SOS siren, rumble, wind, water
const SFX = {
    sos() { for (let i = 0; i < 6; i++) tone(i % 2 ? 620 : 820, 0.32, "sine", 0.022, i * 0.36); },
    quake() { noise(1.8, 0.14); tone(48, 1.8, "sine", 0.18, 0, -12); tone(70, 1.2, "triangle", 0.06, 0.3, -30); },
    wind() { noise(2.6, 0.07); noise(1.6, 0.05, 0.8); tone(240, 2.4, "sawtooth", 0.008, 0, 380); },
    flood() { Sound.splash(); for (let i = 0; i < 6; i++) tone(300 + Math.random() * 400, 0.08, "sine", 0.03, 0.2 + i * 0.18, 200); },
    bubble() { tone(500 + Math.random() * 300, 0.07, "sine", 0.025, 0, 300); }
};

// ---------------------------------------------------------------- effects during a turn
// returns { hud, tick(), stop() } — tick() is called every running second by the turn timer
// only one set of overlays at a time: a re-render of the turn screen replaces the old one
let current = null;
export function stopSurvivalFx() { current?.stop(); current = null; }
export function survivalEffects(loc, t, pid, { root, onDead, onChange }) {
    stopSurvivalFx();
    if (!loc?.revival) return null;
    const cleanups = [];
    let dead = false;
    const die = () => { if (dead) return; dead = true; stop(); onDead(); };
    const harm = (hp, place, kill = false) => {
        const r = X.applyHarm(pid, { hp, kill }, place);
        onChange?.();
        if (r.dead) { toast(`☠️ ${place}에서 사망…`, "error", 5000); setTimeout(die, 600); }
        return r;
    };
    const locEl = () => root.querySelector(".location");
    const parts = [];

    // ====================================================== 🔘 Button Casino
    if (loc.buttonTax) {
        const onClick = e => {
            if (dead) return;
            const b = e.target.closest?.("button, .gcard, .tab, a.btn, [role=button], .emo-ball, .donate-item");
            if (!b || b.disabled || !b.closest(".location")) return;
            const ps = ps_(pid);
            if (!ps) return;
            if (ps.hp <= loc.buttonTax) {
                e.preventDefault(); e.stopPropagation();
                Sound.boom(); toast("🔘 버튼을 누르다 HP가 바닥났다…", "error", 5000);
                X.applyHarm(pid, { kill: true }, `${loc.emoji} ${loc.name}`);
                setTimeout(die, 500);
                return;
            }
            ps.hp -= loc.buttonTax;
            Store.saveSeason();
            const r = b.getBoundingClientRect(), f = h("div.rv-btn-tax", `❤ −${loc.buttonTax}`);
            f.style.left = (r.left + r.width / 2) + "px"; f.style.top = (r.top + window.scrollY) + "px";
            document.body.append(f); setTimeout(() => f.remove(), 900);
            tone(180, 0.08, "square", 0.04);
            onChange?.();
        };
        root.addEventListener("click", onClick, true);
        cleanups.push(() => root.removeEventListener("click", onClick, true));
        parts.push(h("span.rv-tag.red", `🔘 버튼 1번 = HP −${loc.buttonTax}`));
    }

    // ====================================================== 🌪️ Disaster Casino
    let water = null, oxyBar = null, oxyFill = null, oxyTxt = null;
    const D = loc.disaster ? (t.dis ||= { next: rint(25, 55), flood: null, oxy: 100 }) : null;
    const drawWater = () => {
        if (!water) return;
        const lv = D.flood ? D.flood.level : 0;
        water.style.height = (Math.max(0, Math.min(3, lv)) / 3 * 100) + "%";
        water.classList.toggle("on", lv > 0.02);
        water.dataset.stage = D.flood ? String(Math.min(3, Math.floor(lv + 0.001))) : "0";
        const under = D.flood && D.flood.level >= 3 && !D.flood.tank;
        oxyBar.classList.toggle("on", !!under);
        oxyFill.style.width = Math.max(0, D.oxy) + "%";
        oxyTxt.textContent = `🫧 산소 ${Math.max(0, Math.round(D.oxy))}%`;
    };
    if (loc.disaster) {
        water = h("div.rv-water", h("div.rv-wave"), h("div.rv-wave.b"));
        oxyFill = h("i"); oxyTxt = h("b");
        oxyBar = h("div.rv-oxy", h("div.rv-oxy-track", oxyFill), oxyTxt);
        document.body.append(water, oxyBar);
        cleanups.push(() => { water.remove(); oxyBar.remove(); });
        parts.push(h("button.rv-tag.blue", { onclick: () => alertBox("🌪️ Disaster Casino 규칙", DISASTER_RULES) }, "🌪️ 재난 규칙 ⓘ"));
        drawWater();
    }
    function quake() {
        SFX.quake();
        const el = locEl();
        el?.classList.remove("rv-quake"); void el?.offsetWidth; el?.classList.add("rv-quake");
        document.body.classList.add("rv-quaking");
        setTimeout(() => { el?.classList.remove("rv-quake"); document.body.classList.remove("rv-quaking"); }, 2600);
        const d = DISASTER.quake(pid);
        toast(`🫨 지진 발생! HP −${d}${d < 10 ? " (🪨 Earth 몬스터 덕분에 절반)" : ""}`, "warn", 3000);
        return harm(d, "🫨 지진");
    }
    async function wind() {
        SFX.wind();
        const tor = h("div.rv-tornado", h("span", "🌪️"), h("i", "🍂"), h("i.b", "📄"), h("i.c", "🪙"));
        document.body.append(tor); setTimeout(() => tor.remove(), 4300);
        const d = DISASTER.wind(pid);
        const r = d ? harm(d, "🌪️ 강풍") : { hp: ps_(pid)?.hp };
        if (r.dead) return r;
        await sleep(1400);
        const got = RV.inRevival(pid) ? RV.takeItem(pid) : null;
        Store.saveSeason(true); onChange?.();
        if (got) {
            const it = ITEM_BY_ID[got.id];
            await alertBox("🌪️ 강풍이 아이템을 빼앗아 갔다!", [h("div.rv-stolen", h("span", it?.emoji || "🎁"), h("b", it?.name || got.id)),
                got.rev ? "패자부활전 인벤토리에서 빼앗겼습니다." : "패자부활전 인벤토리가 비어 있어 내 원래 아이템을 빼앗겼습니다!",
                d ? `HP −${d}` : "🪽 Fly / Air / Space 몬스터 덕분에 HP는 그대로!"], "warn");
        } else toast(d ? `🌪️ 강풍! HP −${d} (빼앗길 아이템이 없었다)` : "🌪️ 강풍! 몬스터 덕분에 무사 (빼앗길 아이템도 없음)", "warn", 3200);
        return r;
    }
    function startFlood(maxStage) {
        // stage weights: 1 = 40% · 2 = 35% · 3 = 25% (with other disasters: at most 2)
        const r = Math.random(), target = r < 0.4 ? 1 : r < 0.75 || maxStage < 3 ? 2 : 3;
        D.flood = { level: 0, target, phase: "rise", hold: rint(10, 18), hit2: false, hit3: false, tank: false, breath: 0 };
        SFX.flood();
        toast(`🌊 홍수 발생! 물이 차오릅니다… (${target}단계)`, "warn", 3200);
    }
    async function floodTick() {
        const F = D.flood;
        if (!F) return;
        if (F.phase === "rise") { F.level = Math.min(F.target, F.level + 0.2); if (F.level >= F.target) F.phase = "hold"; }
        else if (F.phase === "hold") { if (--F.hold <= 0) F.phase = "drain"; }
        else { F.level = Math.max(0, F.level - 0.08); }
        if (Math.random() < 0.3) SFX.bubble();
        // stage 2: HP −5 once (Water / Ice owners are fine)
        if (F.level >= 2 && !F.hit2) {
            F.hit2 = true;
            const d = DISASTER.flood2(pid);
            if (d) { toast(`🌊 홍수 2단계! HP −${d}`, "warn", 2600); if (harm(d, "🌊 홍수").dead) return; }
            else toast("🌊 홍수 2단계 — 💧 Water / 🧊 Ice 몬스터 덕분에 무사!", "ok", 2600);
        }
        // stage 3: an oxygen tank (used up) — or the oxygen level runs down
        if (F.level >= 3 && !F.hit3) {
            F.hit3 = true;
            const ps = ps_(pid);
            if (ps.items.oxygen > 0) { ps.items.oxygen--; F.tank = true; Store.saveSeason(true); onChange?.(); toast("🤿 산소통 사용! 물속에서도 숨을 쉴 수 있습니다", "ok", 3500); }
            else { D.oxy = 100; Sound.boom(); toast("🌊 홍수 3단계! 산소통이 없습니다 — 산소가 줄어듭니다!", "error", 4000); }
        }
        if (F.level >= 3 && !F.tank && ++F.breath % 3 === 0) {
            const r = DISASTER.flood3(pid), lose = rint(r.oxy[0], r.oxy[1]);
            D.oxy = Math.max(0, D.oxy - lose);
            SFX.bubble(); SFX.bubble();
            if (D.oxy <= 0) { drawWater(); toast("🫧 산소가 바닥났다…", "error", 5000); X.applyHarm(pid, { kill: true }, "🌊 홍수 (산소 0)"); setTimeout(die, 600); return; }
            if (harm(r.hp, "🌊 홍수 (산소 부족)").dead) return;
        }
        if (F.level < 3 && F.hit3 && !F.tank) D.oxy = Math.min(100, D.oxy + 4); // breathing again above water
        if (F.phase === "drain" && F.level <= 0) { D.flood = null; D.oxy = 100; toast("🌊 물이 모두 빠졌습니다", "info", 2200); }
        drawWater();
    }
    let disBusy = false;
    async function disasterTick() {
        await floodTick();
        if (dead || disBusy) return;
        if (--D.next > 0) return;
        if (activityBusy()) { D.next = 3; return; } // after the spin / popup
        D.next = rint(35, 85);
        const deep = D.flood && D.flood.level >= 3;
        // pick the disasters: one, sometimes two or three together
        const pool = deep ? [] : ["quake", "wind", ...(D.flood ? [] : ["flood"])];
        if (!pool.length) return;
        const n = Math.random() < 0.65 ? 1 : Math.random() < 0.7 ? 2 : 3;
        const now = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(n, pool.length));
        disBusy = true;
        const was = t.running; t.running = false;
        SFX.sos();
        const alarm = h("div.rv-alarm", h("b", "🚨 SOS 재난 경보 🚨"), h("span", now.map(k => ({ quake: "🫨 지진", wind: "🌪️ 강풍", flood: "🌊 홍수" }[k])).join(" + ")));
        document.body.append(alarm);
        await sleep(1600);
        alarm.remove();
        t.running = was;
        if (now.includes("flood")) startFlood(now.length > 1 ? 2 : 3);
        if (now.includes("quake") && quake().dead) { disBusy = false; return; }
        if (now.includes("wind")) await wind();
        disBusy = false;
        drawWater();
    }

    // ====================================================== ⛪ Foggy Church
    let statue = null;
    const C = loc.church ? (t.church ||= { level: 0, fog: 0 }) : null;
    let fogEl = null, churchBusy = false;
    const drawStatue = () => {
        if (!statue) return;
        statue.style.setProperty("--s", (0.55 + Math.min(100, C.level) / 100 * 1.1).toFixed(2));
        statue.querySelector(".rv-statue-lv").textContent = `😈 ${Math.min(100, C.level)} / 100`;
    };
    if (loc.church) {
        statue = h("div.rv-statue", { title: "악마의 조각상 — 100이 되면 깨지고 악마의 휠이 돌아갑니다" }, h("div.rv-statue-body", h("span.rv-statue-face", "😈"), h("i.rv-eye.l"), h("i.rv-eye.r"), h("div.rv-statue-base", "🗿")), h("small.rv-statue-lv"));
        document.body.append(statue);
        cleanups.push(() => { statue.remove(); fogEl?.remove(); });
        parts.push(h("button.rv-tag.gray", { onclick: () => alertBox("⛪ Foggy Church 규칙", CHURCH_RULES) }, "⛪ 교회 규칙 ⓘ"));
        drawStatue();
    }
    function fog() {
        fogEl?.remove();
        fogEl = h("div.rv-fog", h("i"), h("i.b"), h("i.c"));
        document.body.append(fogEl);
        tone(220, 1.6, "sine", 0.02, 0, -60);
        const el = fogEl;
        setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 900); }, 10000);
    }
    async function churchTick() {
        if (churchBusy || dead) return;
        if (!fogEl?.isConnected && Math.random() < 1 / 40) fog();
        if (Math.random() < 1 / 22) {
            C.level = Math.min(100, C.level + rint(5, 15));
            Store.saveSeason();
            drawStatue();
            statue.classList.remove("grow"); void statue.offsetWidth; statue.classList.add("grow");
            tone(90, 0.6, "sawtooth", 0.04, 0, -30);
            toast(`😈 악마의 조각상이 자랐다… (${C.level}/100)`, C.level >= 70 ? "warn" : "info", 2000);
        }
        if (C.level >= 100) {
            if (activityBusy()) return; // after the spin / popup
            churchBusy = true;
            const was = t.running; t.running = false;
            statue.classList.add("break");
            Sound.boom(); noise(1.2, 0.2);
            await sleep(1100);
            const alive = await devilWheel(pid);
            C.level = 0; Store.saveSeason(true);
            statue.classList.remove("break"); drawStatue();
            churchBusy = false;
            onChange?.();
            if (!alive) return die();
            t.running = was;
        }
    }

    // ====================================================== 🧠 Quiz Casino: a quiz at least once every 2 minutes
    const Q = loc.quiz ? (t.quiz ||= { next: rint(20, 60), asked: 0, right: 0 }) : null;
    let quizBusy = false;
    if (loc.quiz) parts.push(h("button.rv-tag.blue", { onclick: () => alertBox("🧠 Quiz Casino 규칙", QUIZ_RULES) }, "🧠 퀴즈 규칙 ⓘ"));
    async function quizTick() {
        if (quizBusy || dead) return;
        if (--Q.next > 0) return;
        if (activityBusy()) { Q.next = 2; return; } // right after the spin / popup
        Q.next = rint(45, 110); // < 2 minutes to the next one
        quizBusy = true;
        const r = await quizPopup(pid);
        Q.asked++; if (r.ok) Q.right++;
        Store.saveSeason(true); onChange?.();
        quizBusy = false;
        if (r.dead) die();
    }

    function tick() {
        if (dead || !t.running) return;
        if (loc.disaster) disasterTick();
        if (loc.church) churchTick();
        if (loc.quiz) quizTick();
    }
    function stop() { dead = true; while (cleanups.length) cleanups.pop()(); if (current?.stop === stop) current = null; }
    current = { stop };
    return { hud: parts.length ? h("div.rv-tags", parts) : null, tick, stop };
}

// ---------------------------------------------------------------- 😈 devil wheel (statue at 100)
const DEVIL = [{ id: "kill", label: "☠️ 바로 사망", w: 50, c: "#0a0a0a" }, { id: "hp50", label: "HP −50", w: 30, hp: 50, c: "#991b1b" }, { id: "hp20", label: "HP −20", w: 20, hp: 20, c: "#dc2626" }];
export const devilWheel = pid => fateWheel(pid, { title: "😈 악마의 휠", slices: DEVIL, place: "😈 악마의 휠", intro: "조각상이 깨졌다! 악마의 휠을 강제로 돌려야 합니다…", button: "😈 악마의 휠 돌리기" }).then(r => !r.dead);
// 🧠 quiz penalty · 🔥 inferno corner door
export const QUIZ_PENALTY = [{ id: "kill", label: "☠️ 바로 사망", w: 30, c: "#0a0a0a" }, { id: "hp10", label: "HP −10", w: 20, hp: 10, c: "#f97316" }, { id: "hp20", label: "HP −20", w: 30, hp: 20, c: "#dc2626" }, { id: "hp30", label: "HP −30", w: 20, hp: 30, c: "#991b1b" }];
export const INFERNO_WHEEL = [{ id: "kill", label: "☠️ 바로 사망", w: 20, c: "#0a0a0a" }, { id: "open", label: "🚪 코너 이용", w: 50, c: "#16a34a" }, { id: "hp20", label: "HP −20 (꽝)", w: 30, hp: 20, c: "#b91c1c" }];
// any weighted wheel that hurts the player → { slice, dead }
export async function fateWheel(pid, { title, slices, place, intro = "", button = "🎡 룰렛 돌리기" }) {
    const total = slices.reduce((a, s) => a + s.w, 0);
    let acc = 0;
    const stops = slices.map(s => { const a = acc; acc += s.w; return { s, a: a / total * 360, b: acc / total * 360 }; });
    const wheel = h("div.dw-wheel.rv-devil", { style: { background: `conic-gradient(${stops.map(x => `${x.s.c} ${x.a}deg ${x.b}deg`).join(",")})` } },
        ...stops.map(x => h("span.dw-label", { style: { transform: `rotate(${(x.a + x.b) / 2}deg) translateY(-112px) rotate(90deg)` } }, x.s.label)));
    const res = h("div.dw-res", intro);
    const go = h("button.btn.red.big", button);
    const box = h("div.death-wheel", h("div.dw-pointer", "▼"), wheel, res, h("div.row.center", go));
    const m = modal(box, { title, closable: false, cls: "dw-modal" });
    await new Promise(r => go.onclick = r);
    go.remove();
    let x = Math.random() * total, slice = slices[0];
    for (const sl of slices) { if ((x -= sl.w) < 0) { slice = sl; break; } }
    const st = stops.find(q => q.s === slice);
    const mid = st.a + (st.b - st.a) * (0.2 + Math.random() * 0.6);
    wheel.style.transition = "transform 4.2s cubic-bezier(.12,.75,.18,1)";
    wheel.style.transform = `rotate(${360 * 6 - mid}deg)`;
    for (let i = 0; i < 18; i++) { Sound.tick(); await sleep(80 + i * 12); }
    await sleep(1400);
    const out = slice.hp || slice.id === "kill" ? X.applyHarm(pid, { hp: slice.hp || 0, kill: slice.id === "kill" }, place) : {};
    if (out.dead) { Sound.boom(); res.replaceChildren(h("b.dw-dead", `☠️ ${slice.label} — 사망했습니다…`)); }
    else if (slice.hp) { Sound.hit(); res.replaceChildren(h("b", `${slice.label}!`), h("small", ` 남은 HP ❤ ${Math.round(ps_(pid)?.hp ?? 0)}`)); }
    else { Sound.fanfare(); res.replaceChildren(h("b.dw-ok", `${slice.label}!`)); }
    box.append(h("div.row.center", h("button.btn.gold.big", { onclick: () => m.close() }, "확인")));
    await m.closed;
    return { slice, dead: !!out.dead };
}

// ---------------------------------------------------------------- 🧠 Quiz popup
export const QUIZ_HINT_HP = 10;
export const QUIZ_RULES = [
    "🧠 이 맵에서는 플레이 도중 랜덤하게 퀴즈 팝업이 나옵니다 (적어도 2분에 1번).",
    "문제: 📚 영어 단어 Synonym (동의어) · 🌍 Trivia Acronym (약어 풀이) — 상급 이상 난이도, 4지선다.",
    "💡 힌트는 3개 — 볼 때마다 HP −10 (1: 뜻 / 분야, 2·3: 오답 하나씩 지우기).",
    "❌ 틀리면 Penalty 룰렛: 30% 바로 사망 · 20% HP −10 · 30% HP −20 · 20% HP −30.",
    "⏱️ 퀴즈를 푸는 시간도 플레이 시간에 포함됩니다 (시계는 계속 흐릅니다).",
    "🎟️ 이 맵에서는 다른 Survival Land 맵권으로 언제든 이동할 수 있습니다."
];
// → { ok, dead }
export async function quizPopup(pid) {
    const q = quizQuestion();
    let hints = 0, done = false;
    const hintBox = h("div.qz-hints");
    const opts = h("div.qz-opts");
    const hintBtn = h("button.btn.ghost", "💡 힌트 보기 (HP −10) · 0/3");
    const status = h("div.qz-status");
    const m = modal(h("div.qz-pop",
        h("div.qz-tag", q.label), h("h3.qz-q", q.q), opts, hintBox, status,
        h("div.row.center", hintBtn), h("small.muted", "⏱️ 푸는 동안에도 플레이 시간은 계속 흐릅니다 · 틀리면 Penalty 룰렛!")), { title: "🧠 QUIZ TIME!", closable: false, cls: "qz-modal" });
    Sound.bonus();
    let buttons = [];
    const choice = await new Promise(resolve => {
        buttons = q.options.map(o => h("button.qz-opt", { onclick: () => { if (!done) { done = true; resolve(o); } } }, o));
        opts.replaceChildren(...buttons);
        hintBtn.onclick = () => {
            if (done || hints >= 3) return;
            const r = X.applyHarm(pid, { hp: QUIZ_HINT_HP }, "🧠 Quiz Casino 힌트");
            hints++;
            Sound.hit();
            hintBtn.textContent = hints >= 3 ? "💡 힌트 3개 모두 사용" : `💡 힌트 보기 (HP −10) · ${hints}/3`;
            hintBtn.disabled = hints >= 3;
            status.textContent = r.dead ? "" : `HP −10 → ❤ ${Math.round(ps_(pid)?.hp ?? 0)}`;
            if (r.dead) { done = true; resolve(null); return; }
            if (hints === 1) hintBox.append(h("div.qz-hint", `💡 1: ${q.hint}`));
            else {
                const wrong = buttons.filter(b => b.textContent !== q.answer && !b.classList.contains("gone"));
                const b = wrong[Math.floor(Math.random() * wrong.length)];
                if (b) { b.classList.add("gone"); b.disabled = true; }
                hintBox.append(h("div.qz-hint", `💡 ${hints}: 오답 하나를 지웠습니다`));
            }
        };
    });
    if (choice === null) { // died paying for a hint
        status.replaceChildren(h("b.bad", "☠️ 힌트 대가로 HP가 바닥났다…"));
        await sleep(1500); m.close();
        return { ok: false, dead: true };
    }
    const ok = choice === q.answer;
    for (const b of buttons) { if (b.textContent === q.answer) b.classList.add("right"); else if (b.textContent === choice) b.classList.add("wrong"); b.disabled = true; }
    hintBtn.disabled = true;
    G.log(`🧠 ${G.name(pid)} 퀴즈 ${ok ? "정답" : "오답"} (${q.q.match(/"(.+)"/)?.[1] || ""}) · 힌트 ${hints}개`);
    if (ok) { Sound.fanfare(); confetti(40, ["🧠", "✨", "✅"]); status.replaceChildren(h("b.ok", "✅ 정답! 무사히 넘어갔다")); }
    else { Sound.lose(); status.replaceChildren(h("b.bad", `❌ 오답! 정답: ${q.answer} — Penalty 룰렛을 돌려야 합니다`)); }
    await new Promise(r => m.box.querySelector(".qz-pop").append(h("div.row.center", h("button.btn.gold.big", { onclick: () => { m.close(); r(); } }, ok ? "확인" : "🎡 Penalty 룰렛으로"))));
    if (ok) return { ok: true, dead: false };
    const w = await fateWheel(pid, { title: "🎡 Penalty 룰렛", slices: QUIZ_PENALTY, place: "🧠 Quiz Casino 벌칙", intro: "퀴즈를 틀렸다… 벌칙 룰렛을 돌려야 합니다!", button: "🎡 Penalty 룰렛 돌리기" });
    return { ok: false, dead: w.dead };
}

// ---------------------------------------------------------------- 🔥 Inferno Casino: the death roulette in front of every corner
// a corner opens for the rest of this visit when the wheel stops on "코너 이용"
export const INFERNO_FREE = ["inv", "card", "emo:dex"];
export function infernoGate(pid, t, tabId, label, { onOpen, onDead, onChange }) {
    const res = h("div.inf-gate-res");
    const btn = h("button.btn.red.huge", "🎡 죽음의 룰렛 돌리기");
    btn.onclick = async () => {
        btn.disabled = true;
        const r = await fateWheel(pid, { title: `🔥 죽음의 룰렛 · ${label}`, slices: INFERNO_WHEEL, place: "🔥 Inferno Casino 죽음의 룰렛", intro: `${label}을(를) 이용하려면 죽음의 룰렛을 돌려야 합니다…`, button: "🎡 돌리기" });
        onChange?.();
        if (r.dead) return onDead();
        if (r.slice.id === "open") { (t.infOpen ||= []).push(tabId); Store.saveSeason(true); return onOpen(); }
        res.replaceChildren(h("b.bad", "💥 꽝! HP −20 — 코너를 이용하려면 룰렛을 다시 돌려야 합니다"));
        btn.disabled = false; btn.textContent = "🎡 다시 돌리기";
    };
    return h("div.inf-gate",
        h("div.inf-gate-ico", "🔥"),
        h("h3", `${label} — 죽음의 룰렛`),
        h("p", "Inferno Casino의 모든 코너는 죽음의 룰렛을 돌려야 이용할 수 있습니다."),
        h("div.inf-gate-odds", h("span.k", "☠️ 바로 사망 20%"), h("span.o", "🚪 코너 이용 50%"), h("span.h", "💥 HP −20 (꽝 · 다시 돌리기) 30%")),
        res, h("div.row.center", btn));
}

// ---------------------------------------------------------------- 🧑‍⚖️ Priest (Foggy Church NPC)
// sermon: 30 s of hymns — play time keeps running, no NPC can come meanwhile
// donation: the player gives from their OWN gold (not the revival gold) — less → worse
function hymn(i) {
    const chords = [[262, 330, 392], [349, 440, 523], [392, 494, 587], [262, 330, 392]];
    const c = chords[i % chords.length];
    for (const f of c) tone(f, 0.95, "triangle", 0.018);
    tone(c[0] / 2, 0.95, "sine", 0.03);
}
export async function priestVisit(pid, npc, move) {
    const t = G.S().turn;
    const art = h("div.npc-art", { style: { "--c": npc.color } }, h("span.npc-body", npc.emoji), h("span.npc-weapon", npc.art), h("small", npc.name, " (악)"));
    const say = h("div.npc-say", `${npc.emoji} Priest가 나타났다!`);
    const res = h("div.npc-res");
    const box = h("div.npc-pop.rv-priest", h("div.npc-arena", art, h("div.npc-fx"), h("div.npc-target", avatar(pid, 120, { effect: false }))), say, res);
    const m = modal(box, { title: "⛪ Foggy Church — Priest", closable: false });
    Sound.boom();
    await sleep(900);
    const blocked = G.npcBlockTry(pid, move);
    if (blocked) {
        res.replaceChildren(h("b", `🎫 NPC 공격 Block 권 발동! Priest를 막았다 (남은 Block ${blocked.left}회)`));
        box.append(h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
        await m.closed;
        return blocked;
    }
    if (move.sermon) {
        const secs = move.sermon;
        say.textContent = "📖 \"회개하라… 찬양을 들으라…\" — 설교 공격!";
        const cd = h("b.rv-sermon-cd", String(secs));
        res.replaceChildren(h("div.rv-sermon", h("div.rv-notes", "🎵 🎶 🎵"), h("p", "설교가 끝날 때까지 찬양가를 들으며 기다려야 합니다. (플레이 시간은 계속 흐릅니다)"), cd));
        for (let i = secs; i > 0; i--) {
            cd.textContent = String(i);
            hymn(i);
            if (t && t.remaining > 1) t.remaining -= 1; // the turn clock keeps going while the sermon runs
            await sleep(1000);
        }
        // NPC visits that were due during the sermon come a little later (none during it)
        if (t?.npc?.length) t.npc = t.npc.map(x => x >= t.remaining ? Math.max(1, t.remaining - 15) : x);
        G.log(`🧑‍⚖️ Priest의 설교 — ${G.name(pid)} ${secs}초 대기`);
        Store.saveSeason(true);
        say.textContent = "📖 \"아멘.\"";
        res.replaceChildren(h("b", "설교가 끝났다… 다시 플레이할 수 있습니다."));
        box.append(h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
        await m.closed;
        return { sermon: true };
    }
    // donation
    const own = RV.ownGold(pid);
    say.textContent = "🙏 \"헌금하라… 적게 내면 벌을 받으리라.\"";
    const input = h("input.rv-don-in", { type: "number", min: 0, max: own, step: 100, value: 0 });
    const out = await new Promise(resolve => {
        res.replaceChildren(h("div.rv-donation",
            h("p", "기부할 금액을 입력하세요. ", h("b", "패자부활전 골드가 아니라 내가 원래 갖고 있던 골드"), "에서 빠져나갑니다."),
            h("div.rv-don-own", `💰 내 원래 골드: ${fmt(own)} G`),
            h("ul.rv-don-rules", h("li", "1,000G 이하: HP −60 ~ 바로 사망"), h("li", "10,000G 이하: HP −30 ~ −50"), h("li", "50,000G 이하: HP −10 ~ −30"), h("li", "50,000G 초과: 축복! 공격 없음")),
            input,
            h("button.btn.gold.big", { onclick: () => {
                const want = Math.max(0, Math.min(own, Math.floor(+input.value || 0)));
                const paid = RV.payOwnGold(pid, want);
                let harm = null;
                if (paid <= 1000) { const k = [60, 70, 80, 90, "kill"][rint(0, 4)]; harm = k === "kill" ? { kill: true } : { hp: k }; }
                else if (paid <= 10000) harm = { hp: rint(30, 50) };
                else if (paid <= 50000) harm = { hp: rint(10, 30) };
                G.log(`🙏 ${G.name(pid)} Priest에게 ${fmt(paid)}G 기부 (원래 골드)`);
                const r = harm ? X.applyHarm(pid, harm, "🧑‍⚖️ Priest") : { hp: ps_(pid)?.hp };
                resolve({ paid, harm, r });
            } }, "🙏 기부하기")));
    });
    if (out.r.dead) { Sound.boom(); res.replaceChildren(h("b", `💸 ${fmt(out.paid)}G 기부… ☠️ Priest의 벌을 받아 사망했다!`)); }
    else if (out.harm) { Sound.hit(); res.replaceChildren(h("b", `💸 ${fmt(out.paid)}G 기부… 너무 적다! HP −${out.harm.hp} (남은 HP ❤ ${Math.round(out.r.hp)})`)); }
    else { Sound.bonus(); confetti(30, ["✨", "🕊️"]); res.replaceChildren(h("b", `💸 ${fmt(out.paid)}G 기부 — 🕊️ 축복을 받았다! 공격 없음`)); }
    box.append(h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
    await m.closed;
    return { kill: !!out.r.dead, donation: out.paid };
}

// ---------------------------------------------------------------- arrival popups (map rules)
export async function survivalArrival(pid, loc) {
    if (!loc?.revival) return;
    if (loc.disaster) { Sound.boom(); await alertBox("🌪️ Disaster Casino", ["재난이 랜덤하게 일어나는 위험한 카지노입니다!", ...DISASTER_RULES], "warn"); }
    if (loc.buttonTax) { Sound.boom(); await alertBox("🔘 Button Casino", [`이 맵에서는 플레이 화면의 버튼을 누를 때마다 HP −${loc.buttonTax}!`, "게임 선택 · 스핀 · 탭 · 상점 버튼 모두 포함됩니다. HP가 바닥나면 즉사합니다."], "warn"); }
    if (loc.church) { Sound.boom(); await alertBox("⛪ Foggy Church", CHURCH_RULES, "warn"); }
    if (loc.quiz) { Sound.bonus(); await alertBox("🧠 Quiz Casino", QUIZ_RULES); }
    if (loc.inferno) { Sound.boom(); await alertBox("🔥 Inferno Casino", ["모든 코너(게임 · 상점 등)는 죽음의 룰렛을 돌려야 이용할 수 있습니다: ☠️ 20% 바로 사망 · 🚪 50% 코너 이용 · 💥 30% HP −20 (꽝 → 다시 돌리기).",
        "☠️ Suicide Spin: 빨간 X 프로필 3개 = 바로 사망 · 🔪 Kill Me Gently: 칼이 프로필에 박히면 바로 사망 · 🔥 Plinko / 💣 Bomb Pick: 즉사 칸 있음.", "🚫 이 맵에서는 맵권을 쓸 수 없습니다."], "warn"); }
    if (loc.arcade) await alertBox("🕹️ Arcade", ["랜덤으로 선택된 아케이드 게임을 완주해 🏰 보스성에 도착하세요! (기회 2번)", "이 맵의 슬롯 · 카지노 · 상점 · 몬스터 Capture 코너는 아케이드 안에서 발견해야 이용할 수 있습니다.", "🕹️ ARCADE 탭에서 시작합니다."]);
}
