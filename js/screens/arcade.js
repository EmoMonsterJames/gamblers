// =====================================================================
// 🕹️ ARCADE — Survival Land side-scroller (패자부활전 only).
// The player's profile picture runs to the 🏰 boss castle, then fights the
// slot-machine boss. ← → move · ↓ crouch / swim down / drop / enter a door ·
// ↑ jump (swim up under water) · SPACE throws an arcade orb (5 to start, max 10).
//   · one random stage per arrival: 🌊 Sea (상) · 🏜️ Desert (중) · 🏘️ Village (중) · 👻 Haunted House (상)
//   · ~2:30 long, 3:00 limit · 2 tries per turn (a pit / time out uses one)
//   · touching a monster HP −10, a shot HP −5 (the player's real revival HP)
//   · 🎰 slot · 🃏 casino · 🏪 shop · 🔍 capture doors along the way: ↓ at a door
//     pauses the arcade and the turn clock and opens that corner (found corners stay open)
//   · ❤ hearts +10 HP · 🔮 orbs refill the weapon
// arcadeView(pid, t, { hurt, heal, onCorner, onDead, onWin, onChange }) → { el, pause, resume, stop }
// =====================================================================
import { h, sleep } from "../core/util.js";
import { Sound, tone, noise } from "../core/sound.js";
import { confetti } from "../core/fx.js";
import { Store } from "../core/store.js";

export const ARCADE_STAGES = {
    sea:     { name: "바다 아케이드", emoji: "🌊", diff: "상", len: 9300, water: true, sky: ["#0c4a6e", "#082f49", "#020617"] },
    desert:  { name: "사막 아케이드", emoji: "🏜️", diff: "중", len: 12700, oasis: true, sky: ["#fde68a", "#f59e0b", "#b45309"] },
    village: { name: "빌리지 아케이드", emoji: "🏘️", diff: "중", len: 12700, sky: ["#7dd3fc", "#bae6fd", "#e0f2fe"] },
    haunted: { name: "유령의집 아케이드", emoji: "👻", diff: "상", len: 12300, sky: ["#1e1b4b", "#2e1065", "#0a0118"] }
};
export const ARCADE_TRIES = 2, ARCADE_LIMIT = 180, ORB_START = 5, ORB_MAX = 10;
export const CORNER_KINDS = { slot: { emoji: "🎰", label: "SLOT", tab: "arc:slot" }, casino: { emoji: "🃏", label: "CASINO", tab: "arc:casino" }, shop: { emoji: "🏪", label: "SHOP", tab: "shop:general" }, capture: { emoji: "🔍", label: "CAPTURE", tab: "emo:capture" } };
export const ARCADE_KEYS = "← → 이동 · ↓ 엎드리기 / 아래로 헤엄 / 발판 내려가기 / 문 들어가기 · ↑ 점프 · ↑↑ 2단 점프 (물속: 위로 헤엄) · SPACE 구슬 발사";

const W = 960, H = 480, GY = 416;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// emoji sprites drawn once into small canvases
const SPR = new Map();
function spr(e, size, { dark = false, flip = false } = {}) {
    const k = `${e}|${size}|${dark}|${flip}`;
    if (SPR.has(k)) return SPR.get(k);
    const c = document.createElement("canvas"); c.width = c.height = Math.ceil(size * 1.25);
    const x = c.getContext("2d");
    x.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle";
    if (flip) { x.translate(c.width, 0); x.scale(-1, 1); }
    if (dark) x.filter = "brightness(0.25) saturate(0)";
    x.fillText(e, c.width / 2, c.height / 2 + size * 0.06);
    SPR.set(k, c);
    return c;
}
const drawE = (g, e, x, y, size, o = {}) => { const c = spr(e, size, o); g.drawImage(c, x - c.width / 2, y - c.height / 2); };

// ---------------------------------------------------------------- monsters
// stomp: can be jumped on · gun: an orb kills it · hp: orb hits needed · inv: cannot be killed
const MON = {
    crow:   { e: "🐦", dark: true, w: 34, h: 30, stomp: true, gun: true, fly: true },
    worm:   { e: "🐛", w: 36, h: 26, stomp: true, gun: true, speed: 40 },
    flower: { e: "🌺", w: 38, h: 40, stomp: false, gun: true, still: true },
    fish:   { e: "🐟", w: 34, h: 26, stomp: false, gun: true, swim: true },
    squid:  { e: "🦑", w: 36, h: 38, stomp: false, gun: true, swim: true },
    clam:   { e: "🦪", w: 38, h: 30, stomp: false, gun: true, still: true },
    shark:  { e: "🦈", w: 96, h: 54, stomp: false, gun: false, inv: true, swim: true, big: 70 },
    star:   { e: "⭐", w: 32, h: 32, stomp: false, gun: true, still: true },
    puffer: { e: "🐡", w: 38, h: 36, stomp: false, gun: true, swim: true },
    coco:   { e: "🥥", w: 34, h: 34, stomp: true, gun: true, speed: 55 },
    scorp:  { e: "🦂", w: 40, h: 30, stomp: false, gun: true, speed: 30 },
    sphinx: { e: "🦁", w: 48, h: 46, stomp: false, gun: true, speed: 35, crown: true },
    dog:    { e: "🐕", w: 44, h: 34, stomp: true, gun: true, speed: 70 },
    car:    { e: "🚗", w: 62, h: 38, stomp: true, gun: true, still: true },
    cloud:  { e: "☁️", w: 70, h: 44, inv: true, fly: true },
    ghost:  { e: "👻", w: 38, h: 40, stomp: true, gun: true, fly: true },
    eye:    { e: "👁️", w: 34, h: 34, stomp: true, gun: true, speed: 60 },
    dragon: { e: "🐉", w: 78, h: 64, stomp: true, gun: true, hp: 3, speed: 40, big: 64 }
};
const POOLS = {
    sea: ["fish", "fish", "squid", "clam", "shark", "star", "puffer"],
    desert: ["coco", "scorp", "sphinx", "coco", "crow", "worm", "flower"],
    village: ["dog", "car", "dog", "car", "crow", "worm", "flower"],
    haunted: ["ghost", "eye", "dragon", "ghost", "eye", "crow", "worm", "flower"]
};

// ---------------------------------------------------------------- the level
function buildLevel(kind) {
    const S = ARCADE_STAGES[kind], L = S.len, hard = S.diff === "상";
    const ground = [], plats = [], blocks = [], mons = [], items = [], doors = [], water = [];
    // ground with pits (no pits under the sea)
    let x = 0;
    while (x < L) {
        const seg = x < 700 || S.water ? L : rint(520, 980);
        ground.push({ x0: x, x1: Math.min(L, x + seg) });
        x += seg;
        if (x < L - 900 && !S.water) x += rint(hard ? 110 : 90, hard ? 170 : 140);
    }
    if (S.water) water.push({ x0: -200, x1: L + 400, top: 40 });
    // 🌴 desert oasis: a pool to swim through (with fish and squid)
    if (S.oasis) {
        const ox = Math.round(L * 0.52);
        water.push({ x0: ox, x1: ox + 760, top: 250 });
        mons.push(mk("fish", ox + 200, 330), mk("squid", ox + 520, 300), mk("fish", ox + 650, 360));
    }
    // floating platforms + ❓ slot blocks
    for (let px = 520; px < L - 700; px += rint(380, 620)) {
        const y = rint(250, 320), w = rint(3, 5) * 32;
        plats.push({ x: px, y, w, h: 18 });
        if (Math.random() < 0.55) blocks.push({ x: px + w / 2 - 16, y: y - 120, w: 32, h: 32, used: false, item: Math.random() < 0.55 ? "orb" : "heart" });
    }
    // corner doors: only 2 of 🎰 🃏 🏪 🔍 per stage (random), far apart
    const kinds = ["slot", "casino", "shop", "capture"].sort(() => Math.random() - 0.5).slice(0, 2);
    kinds.forEach((k, i) => doors.push({ kind: k, x: Math.round(L * (0.3 + i * 0.35)), y: GY - 92, w: 80, h: 92 }));
    // monsters
    const pool = POOLS[kind];
    const gap = hard ? 300 : 380;
    for (let mx = 900; mx < L - 600; mx += rint(gap * 0.7, gap * 1.3)) {
        if (doors.some(d => Math.abs(d.x - mx) < 120)) continue;
        const k = pick(pool), M = MON[k];
        const y = M.fly ? rint(120, 220) : M.swim ? rint(120, 360) : GY - M.h;
        if (!M.fly && !M.swim && !onGround(ground, mx + M.w / 2)) continue;
        if (!S.water && M.swim) continue;
        mons.push(mk(k, mx, y));
    }
    // pickups
    for (let ix = 800; ix < L - 500; ix += rint(700, 1100)) items.push({ kind: Math.random() < 0.6 ? "orb" : "heart", x: ix, y: rint(200, 330), w: 28, h: 28 });
    return { kind, S, L, ground, plats, blocks, mons, items, doors, water, castle: { x: L - 320, y: GY - 200, w: 220, h: 200 } };
}
function mk(k, x, y) {
    const M = MON[k];
    return { k, M, x, y, w: M.w, h: M.h, vx: (M.speed || 0) * (Math.random() < 0.5 ? -1 : 1), vy: 0, hp: M.hp || 1, t: rnd(0, 2), home: y, dead: false, cool: rnd(1, 3), dir: -1, state: "idle" };
}
const onGround = (ground, x) => ground.some(g => x >= g.x0 && x <= g.x1);

// ---------------------------------------------------------------- the view
export function arcadeView(pid, t, opts) {
    // stage: null until the arcade game roulette has picked one (pickStage)
    const A = (t.arcade ||= { stage: null, tries: 0, castle: false, boss: false, found: [] });
    let S = A.stage ? ARCADE_STAGES[A.stage] : null;
    const canvas = h("canvas.arc-canvas", { width: W, height: H, tabindex: 0 });
    const g = canvas.getContext("2d");
    const hud = h("div.arc-hud");
    const panel = h("div.arc-panel");
    const topName = h("b"), topDiff = h("span.arc-diff");
    const drawTop = () => { topName.textContent = S ? `${S.emoji} ${S.name}` : "🕹️ 아케이드 게임 뽑기"; topDiff.textContent = S ? `난이도 ${S.diff}` : "랜덤 선택"; };
    drawTop();
    const el = h("div.arc-root.game-screen", h("div.arc-top", topName, topDiff, h("span", `기회 ${Math.max(0, ARCADE_TRIES - A.tries)} / ${ARCADE_TRIES}`)), h("div.arc-stage", canvas, panel), hud, h("p.arc-keys", "🎮 ", ARCADE_KEYS));
    const face = new Image(); face.crossOrigin = "anonymous"; face.src = Store.player(pid)?.profile_image || "";
    const keys = {};
    let lv = null, P = null, shots = [], foeShots = [], coins = [], cash = [], fx = [], cam = 0, time = 0, raf = 0, last = 0, running = false, mode = "menu", boss = null, stopped = false, bossTimers = null;
    const setBusy = b => el.classList.toggle("busy", b);

    // ---- input
    const KEYMAP = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d", " ": "f", Spacebar: "f", a: "l", d: "r", w: "u", s: "d" };
    const down = e => {
        const k = KEYMAP[e.key];
        if (!k || !running) return;
        e.preventDefault();
        if (!keys[k]) { keys[k] = true; if (k === "u") jumpKey(); if (k === "f") shoot(); if (k === "d") door(); }
    };
    const up = e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    // ---- panels
    function showPanel(...kids) { panel.replaceChildren(...kids); panel.classList.add("on"); }
    function hidePanel() { panel.classList.remove("on"); panel.replaceChildren(); }
    // ↑ on the ground: jump · ↑ again in the air: a second, higher jump (once until landing) · under water: swim up
    function jumpKey() {
        if (!P || P.water || P.stun > 0) { if (P) P.jumpQ = 0.12; return; }
        if (P.ground) { P.jumpQ = 0.12; return; }
        if (P.dbl) return;
        P.dbl = true; P.jumpQ = 0; P.ground = false;
        P.vy = -760;
        tone(660, 0.07, "square", 0.03, 0, 420); tone(990, 0.1, "triangle", 0.03, 0.05, 300);
        fx.push({ txt: "⬆⬆", x: P.x + 2, y: P.y + P.h + 8, t: 0.6, c: "#fde047" });
    }
    // 🎲 every arcade game is shown, then the roulette lands on one at random
    // lobby: show every arcade game first; the player presses 🎲 to draw one, then ▶ START on the drawn game
    function pickStage() {
        mode = "menu"; setBusy(false);
        const ids = Object.keys(ARCADE_STAGES);
        const cards = ids.map(id => { const x = ARCADE_STAGES[id]; return h("div.arc-pick", { "data-id": id }, h("div.arc-pick-ico", x.emoji), h("b", x.name), h("small", `난이도 ${x.diff}`)); });
        const msg = h("p.arc-pick-msg", "🎲 아케이드 뽑기 버튼을 누르면 위 4종 중 하나가 랜덤으로 뽑힙니다.");
        const btn = h("button.btn.gold.big", { onclick: () => { btn.disabled = true; btn.textContent = "🎲 뽑는 중…"; rollStage(ids, cards, msg); } }, "🎲 아케이드 뽑기");
        showPanel(h("div.arc-card.arc-pick-card", h("h3", "🕹️ 아케이드 게임"), h("small", `길이 약 2분 30초 · 제한 시간 3분 · 남은 기회 ${ARCADE_TRIES - A.tries}번`),
            h("div.arc-pick-grid", cards), msg,
            h("p.small", "괴물과 부딪히면 HP −10 · 탄환 HP −5 · 밟거나 구슬로 처치! 스테이지마다 🎰 🃏 🏪 🔍 중 2개 코너 문이 있어요. 문 앞에서 ⬇️ — 이용하는 동안 시간이 멈춥니다."),
            btn));
    }
    async function rollStage(ids, cards, msg) {
        mode = "pick"; setBusy(true);
        msg.textContent = "🎲 아케이드 게임을 랜덤으로 뽑습니다…";
        const win = pick(ids);
        // ~3 laps, slowing down, ending on the drawn game
        const steps = ids.length * 3 + ids.indexOf(win) + 1;
        for (let i = 0; i < steps; i++) {
            if (stopped) return;
            cards.forEach((c, j) => c.classList.toggle("on", j === i % ids.length));
            tone(700 + (i % ids.length) * 90, 0.05, "square", 0.025);
            await sleep(70 + Math.pow(i / steps, 2.4) * 420);
        }
        if (stopped) return;
        A.stage = win; S = ARCADE_STAGES[win];
        Store.saveSeason(true); opts.onChange?.();
        cards.forEach(c => c.classList.toggle("win", c.dataset.id === win));
        msg.replaceChildren("👉 ", h("b", `${S.emoji} ${S.name}`), ` 당첨! (난이도 ${S.diff})`);
        Sound.bonus();
        drawTop(); draw0();
        await sleep(1500);
        if (!stopped) menu();
    }
    function menu() {
        if (!A.stage) return pickStage();
        mode = "menu"; setBusy(false);
        if (A.boss) return showPanel(h("div.arc-card.win", h("div.arc-big", "🏆"), h("h3", "ARCADE CLEAR!"), h("p", "보스를 무찔렀습니다! 미션 \"보스맵 clear\" 성공.")));
        if (A.tries >= ARCADE_TRIES) return showPanel(h("div.arc-card.lose", h("div.arc-big", "💀"), h("h3", "GAME OVER"), h("p", "아케이드 기회 2번을 모두 썼습니다.")));
        showPanel(h("div.arc-card",
            h("div.arc-big", S.emoji), h("h3", A.castle ? "🏰 보스와의 대결" : S.name), h("small", `난이도 ${S.diff} · 길이 약 2분 30초 · 제한 시간 3분 · 남은 기회 ${ARCADE_TRIES - A.tries}번`),
            h("div.arc-keys-box", h("b", "조종키"), h("div", "⬅️ ➡️ 이동"), h("div", "⬆️ 점프 · ⬆️⬆️ 공중에서 한 번 더 누르면 더 높이 2단 점프", S.water ? " (물속에서는 위로 헤엄 · 동작이 느려집니다)" : ""), h("div", "⬇️ 엎드리기 · 아래로 · 🚪 코너 문 들어가기"), h("div", "␣ SPACE 구슬 발사 (기본 5개 · 최대 10개 · 보스 HP −10)")),
            h("p.small", "괴물과 부딪히면 HP −10 · 탄환 HP −5 · 밟거나 구슬로 처치! 스테이지마다 🎰 🃏 🏪 🔍 중 2개 코너 문이 있어요. 문 앞에서 ⬇️ — 이용하는 동안 시간이 멈춥니다."),
            h("button.btn.gold.big", { onclick: () => A.castle ? startBoss() : startStage() }, A.castle ? "⚔️ 보스전 시작" : "▶ START")));
    }

    // ---- stage
    function newPlayer(x, y) { return { x, y, w: 34, h: 40, vx: 0, vy: 0, face: 1, ground: false, inv: 0, crouch: false, jumpQ: 0, swim: 0, stun: 0, orbs: ORB_START, cool: 0, water: false }; }
    function startStage() {
        lv = buildLevel(A.stage);
        P = newPlayer(80, GY - 60);
        shots = []; foeShots = []; fx = []; cam = 0; time = ARCADE_LIMIT; mode = "stage";
        hidePanel(); go();
        Sound.bonus();
        canvas.focus();
    }
    function startBoss() {
        lv = { kind: "boss", S, L: W, ground: [{ x0: 0, x1: W }], plats: [{ x: 360, y: 280, w: 240, h: 18 }], blocks: [], mons: [], items: [], doors: [], water: [], castle: null };
        P = { ...newPlayer(80, GY - 60), orbs: Math.max(P?.orbs ?? ORB_START, ORB_START) };
        boss = { x: 720, y: GY - 150, w: 120, h: 150, vx: 0, vy: 0, hp: 100, inv: 0, ground: true, reel: [0, 0, 0], next: 1.2 };
        bossTimers = { coin: 2.5, cash: 5, ammo: 7 };
        shots = []; foeShots = []; coins = []; cash = []; fx = []; cam = 0; mode = "boss";
        hidePanel(); go();
        Sound.boom();
        canvas.focus();
    }
    function go() { running = true; setBusy(true); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    function halt() { running = false; cancelAnimationFrame(raf); for (const k in keys) keys[k] = false; }

    function fail(why) {
        halt(); setBusy(false);
        A.tries++; Store.saveSeason(true); opts.onChange?.();
        Sound.lose();
        el.querySelector(".arc-top span:last-child").textContent = `기회 ${Math.max(0, ARCADE_TRIES - A.tries)} / ${ARCADE_TRIES}`;
        showPanel(h("div.arc-card.lose", h("div.arc-big", "💥"), h("h3", why), h("p", A.tries >= ARCADE_TRIES ? "아케이드 기회를 모두 썼습니다." : `기회가 1번 소모되었습니다. 남은 기회 ${ARCADE_TRIES - A.tries}번`),
            A.tries < ARCADE_TRIES ? h("button.btn.gold.big", { onclick: startStage }, "🔁 다시 도전") : null));
    }
    function hurt(n) {
        if (P.inv > 0 || mode === "menu") return;
        P.inv = 1.2;
        Sound.hit();
        fx.push({ txt: `❤ −${n}`, x: P.x, y: P.y - 10, t: 0.9, c: "#ff4d6d" });
        const r = opts.hurt(n);
        if (r?.dead) { halt(); setBusy(false); showPanel(h("div.arc-card.lose", h("div.arc-big", "☠️"), h("h3", "HP가 바닥났습니다…"), h("p", "패자부활전에서 사망했습니다."))); setTimeout(() => opts.onDead?.(), 1200); }
    }
    function shoot() {
        if (P.cool > 0 || mode === "menu") return;
        if (P.orbs <= 0) { tone(200, 0.08, "square", 0.03); fx.push({ txt: "구슬 없음!", x: P.x, y: P.y - 20, t: 0.8, c: "#fbbf24" }); return; }
        P.orbs--; P.cool = 0.28;
        shots.push({ x: P.x + P.w / 2 + P.face * 18, y: P.y + 16, vx: P.face * 620, vy: 0, r: 9, life: 1.2 });
        tone(880, 0.06, "sine", 0.04, 0, 300);
    }
    // ↓ at a corner door: pause everything and open the corner
    function door() {
        if (mode !== "stage") return;
        const d = lv.doors.find(q => hit(P, { x: q.x + 10, y: q.y, w: q.w - 20, h: q.h }));
        if (!d) return;
        if (!A.found.includes(d.kind)) { A.found.push(d.kind); Store.saveSeason(); }
        halt(); setBusy(false);
        mode = "corner";
        Sound.coin();
        showPanel(h("div.arc-card", h("div.arc-big", CORNER_KINDS[d.kind].emoji), h("h3", `${CORNER_KINDS[d.kind].label} 코너 발견!`), h("p", "코너를 이용하는 동안 아케이드와 턴 시간이 멈춥니다. 다 쓰고 🕹️ ARCADE 탭으로 돌아오세요."),
            h("button.btn.gold.big", { onclick: resume }, "▶ 아케이드 계속하기")));
        opts.onCorner?.(d.kind);
    }

    // ---- update
    function loop(now) {
        if (stopped) return;
        if (!document.body.contains(canvas)) { pause(); return; }
        const dt = Math.min(0.033, (now - last) / 1000); last = now;
        if (running) { update(dt); draw(); }
        if (running) raf = requestAnimationFrame(loop);
    }
    const inWater = (x, y) => lv.water.some(w => x > w.x0 && x < w.x1 && y > w.top);
    function update(dt) {
        if (mode === "stage") { time -= dt; if (time <= 0) return fail("⏰ 시간 초과!"); }
        P.inv = Math.max(0, P.inv - dt); P.cool = Math.max(0, P.cool - dt); P.jumpQ = Math.max(0, P.jumpQ - dt); P.stun = Math.max(0, P.stun - dt);
        if (P.ground || P.water) P.dbl = false; // the 2nd jump comes back on landing
        P.water = inWater(P.x + P.w / 2, P.y + P.h / 2);
        const slow = P.water ? 0.55 : 1, maxV = (P.water ? 150 : 250), acc = P.water ? 700 : 1900;
        const ctl = P.stun <= 0;
        if (ctl && keys.l) { P.vx = Math.max(-maxV, P.vx - acc * dt); P.face = -1; }
        else if (ctl && keys.r) { P.vx = Math.min(maxV, P.vx + acc * dt); P.face = 1; }
        else P.vx *= Math.pow(P.water ? 0.2 : 0.0008, dt);
        P.crouch = ctl && keys.d && P.ground && !P.water;
        if (P.crouch) P.vx *= Math.pow(0.05, dt);
        if (P.water) {
            P.vy += 420 * dt;
            if (ctl && keys.d) P.vy += 500 * dt;
            if (ctl && keys.u && P.swim <= 0) { P.vy = -280 * slow - 60; P.swim = 0.28; tone(420, 0.05, "sine", 0.02, 0, 120); }
            P.swim = Math.max(0, P.swim - dt);
            P.vy = Math.max(-320, Math.min(150, P.vy));
        } else {
            P.vy += 1900 * dt;
            if (ctl && P.jumpQ > 0 && P.ground) { P.vy = -650; P.ground = false; P.jumpQ = 0; tone(520, 0.08, "square", 0.03, 0, 320); }
            if (!keys.u && P.vy < -250 && !P.dbl) P.vy += 2600 * dt; // short hop (not after the 2nd jump)
            P.vy = Math.min(900, P.vy);
        }
        // move + collide
        const prevBottom = P.y + P.h, prevTop = P.y, prevX = P.x;
        P.x += P.vx * dt; P.y += P.vy * dt;
        P.x = Math.max(0, Math.min(lv.L - P.w, P.x));
        P.ground = false;
        if (P.y < 20 && P.water) { P.y = 20; P.vy = Math.max(0, P.vy); }
        if (P.y + P.h >= GY && prevBottom <= GY + 12 && onGround(lv.ground, P.x + P.w / 2)) { P.y = GY - P.h; P.vy = 0; P.ground = true; }
        // platforms are solid: land on top, bump your head from below, blocked at the sides
        // (no jumping up through them) · ↓ on top drops down through that one platform only
        if (P.dropPl && (P.y > P.dropPl.y + P.dropPl.h || P.x + P.w <= P.dropPl.x || P.x >= P.dropPl.x + P.dropPl.w)) P.dropPl = null;
        for (const pl of lv.plats) {
            if (pl === P.dropPl) continue;
            if (!(P.x + P.w > pl.x && P.x < pl.x + pl.w)) continue;
            const overlapY = P.y + P.h > pl.y && P.y < pl.y + pl.h;
            if (P.vy >= 0 && prevBottom <= pl.y + 4 && P.y + P.h >= pl.y) {
                if (keys.d && !P.water) { P.dropPl = pl; continue; } // drop through
                P.y = pl.y - P.h; P.vy = 0; P.ground = true;
            } else if (overlapY && prevTop >= pl.y + pl.h - 6) { P.y = pl.y + pl.h; if (P.vy < 0) P.vy = 60; }
            else if (overlapY) { P.x = prevX + P.w / 2 < pl.x + pl.w / 2 ? pl.x - P.w : pl.x + pl.w; P.vx = 0; }
        }
        for (const b of lv.blocks) {
            if (P.vy < 0 && hit(P, b) && P.y > b.y + b.h - 18) { P.vy = 120; if (!b.used) { b.used = true; lv.items.push({ kind: b.item, x: b.x + 2, y: b.y - 34, w: 28, h: 28, pop: 0.3 }); Sound.coin(); } }
            else if (P.vy >= 0 && prevBottom <= b.y + 4 && P.y + P.h >= b.y && P.x + P.w > b.x && P.x < b.x + b.w) { P.y = b.y - P.h; P.vy = 0; P.ground = true; }
        }
        if (P.y > H + 60) return fail("🕳️ 구덩이에 빠졌습니다!");
        // camera
        cam = Math.max(0, Math.min(lv.L - W, P.x - W * 0.38));
        // items
        for (const it of lv.items) {
            if (it.got) continue;
            if (hit(P, it)) {
                it.got = true;
                if (it.kind === "orb") { const n = Math.min(ORB_MAX - P.orbs, rint(1, 2)); P.orbs += n; fx.push({ txt: n ? `🔮 +${n}` : "🔮 MAX", x: it.x, y: it.y, t: 0.9, c: "#c4b5fd" }); Sound.coin(); }
                else { const n = opts.heal(10); fx.push({ txt: n ? `❤ +${n}` : "❤ MAX", x: it.x, y: it.y, t: 0.9, c: "#fb7185" }); Sound.coin(); }
            }
        }
        // my orbs
        for (const s of shots) { s.x += s.vx * dt; s.life -= dt; }
        shots = shots.filter(s => s.life > 0 && s.x > cam - 50 && s.x < cam + W + 50);
        // monsters
        for (const m of lv.mons) if (!m.dead && Math.abs(m.x - P.x) < 1100) monster(m, dt);
        lv.mons = lv.mons.filter(m => !m.dead || m.fade > 0);
        for (const m of lv.mons) if (m.dead) m.fade -= dt;
        if (mode === "stage" && A.stage === "village") clouds(dt);
        // enemy shots
        for (const s of foeShots) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += (s.grav || 0) * dt; s.life -= dt; if (hit(P, { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 })) { s.life = 0; hurt(5); } }
        foeShots = foeShots.filter(s => s.life > 0 && s.y < H + 40);
        if (mode === "boss") bossUpdate(dt);
        for (const f of fx) { f.t -= dt; f.y -= 40 * dt; }
        fx = fx.filter(f => f.t > 0);
        // 🏰 castle door = the stage is cleared
        if (mode === "stage" && lv.castle && P.x + P.w > lv.castle.x + 90 && P.x < lv.castle.x + 130 && P.y + P.h > GY - 70) castleIn();
    }
    // one monster's behaviour
    function monster(m, dt) {
        const M = m.M, px = P.x + P.w / 2, py = P.y + P.h / 2, mx = m.x + m.w / 2, my = m.y + m.h / 2;
        m.t += dt; m.cool -= dt;
        switch (m.k) {
            case "crow": // hovers, then dives at the player and climbs back
                if (m.state === "idle") { m.y = m.home + Math.sin(m.t * 2) * 10; m.x += Math.sin(m.t) * 30 * dt; if (Math.abs(px - mx) < 260 && m.cool <= 0) { m.state = "dive"; m.vx = (px - mx) * 1.2; m.vy = 420; } }
                else if (m.state === "dive") { m.x += m.vx * dt; m.y += m.vy * dt; if (m.y > Math.min(GY - m.h, py)) { m.state = "up"; } }
                else { m.y -= 260 * dt; if (m.y <= m.home) { m.state = "idle"; m.cool = rnd(1.5, 3); } }
                break;
            case "worm": case "coco": case "scorp": case "sphinx": case "eye": case "dog": {
                let sp = M.speed;
                if (m.k === "eye") { m.vx = Math.sign(px - mx) * sp * 1.4; }
                if (m.k === "dog") { if (m.cool <= 0) { m.fast = Math.random() < 0.4; m.cool = rnd(1, 2.5); } m.vx = Math.sign(px - mx || 1) * (m.fast ? 210 : 60); }
                const nx = m.x + m.vx * dt;
                if (!onGround(lv.ground, nx + (m.vx > 0 ? m.w : 0))) m.vx = -m.vx; else m.x = nx;
                if (m.k === "coco" && m.cool <= 0 && Math.abs(px - mx) < 520) { m.cool = rnd(2, 3.2); foeShots.push({ e: "🥥", x: mx, y: m.y, vx: Math.sign(px - mx) * rnd(160, 240), vy: -380, grav: 900, r: 9, life: 3, size: 18 }); }
                if (m.k === "sphinx" && m.cool <= 0 && Math.abs(px - mx) < 480 && Math.abs(py - my) < 90) { m.cool = rnd(2, 3); foeShots.push({ beam: true, x: mx + Math.sign(px - mx) * 20, y: m.y + 12, vx: Math.sign(px - mx) * 520, vy: 0, r: 7, life: 0.45 }); tone(1200, 0.1, "sawtooth", 0.02, 0, -600); }
                break;
            }
            case "flower": // spits seeds at the player
                if (m.cool <= 0 && Math.abs(px - mx) < 560) { m.cool = rnd(2, 3); foeShots.push({ e: "🌰", x: mx, y: m.y + 6, vx: (px - mx) * 0.9, vy: -360, grav: 900, r: 8, life: 3, size: 16 }); }
                break;
            case "car": // parked; it charges once it sees the player
                if (m.state === "idle" && Math.abs(px - mx) < 420 && Math.abs(py - my) < 120) { m.state = "go"; m.vx = Math.sign(px - mx) * 380; tone(160, 0.3, "sawtooth", 0.04, 0, 200); }
                if (m.state === "go") { const nx = m.x + m.vx * dt; if (!onGround(lv.ground, nx + (m.vx > 0 ? m.w : 0)) || Math.abs(nx - m.home2) > 900) m.vx = 0; else m.x = nx; }
                m.home2 ??= m.x;
                break;
            case "ghost":
                m.x += (Math.sign(px - mx) * 50 + Math.cos(m.t * 1.7) * 90) * dt;
                m.y = m.home + Math.sin(m.t * 2.2) * 60;
                break;
            case "dragon": {
                m.home2 ??= m.x;
                if (m.state === "fly") { m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 500 * dt; if (m.y >= GY - m.h) { m.y = GY - m.h; m.state = "idle"; Sound.hit(); } }
                else {
                    m.x += Math.sign(px - mx) * 30 * dt;
                    if (m.cool <= 0 && Math.abs(px - mx) < 600) {
                        m.cool = rnd(1.8, 3);
                        if (Math.random() < 0.3) { m.state = "fly"; m.vy = -620; m.vx = (px - mx) * 0.9; }
                        else foeShots.push({ e: "🔥", x: mx + Math.sign(px - mx) * 30, y: m.y + 18, vx: Math.sign(px - mx) * 360, vy: 0, r: 11, life: 2.2, size: 24 });
                    }
                }
                break;
            }
            case "fish": // fast, random directions, does not chase
                if (m.cool <= 0) { const a = rnd(0, Math.PI * 2); m.vx = Math.cos(a) * 220; m.vy = Math.sin(a) * 120; m.cool = rnd(0.8, 1.6); }
                swimMove(m, dt);
                break;
            case "squid": { // slow, follows the player
                const d = Math.hypot(px - mx, py - my) || 1;
                m.vx = (px - mx) / d * 70; m.vy = (py - my) / d * 60 + Math.sin(m.t * 3) * 30;
                swimMove(m, dt);
                break;
            }
            case "puffer":
                if (m.state !== "go" || m.cool2 <= 0) { const a = rnd(0, Math.PI * 2); m.vx = Math.cos(a) * 50; m.vy = Math.sin(a) * 40; m.cool2 = rnd(1.5, 3); m.state = "go"; }
                m.cool2 -= dt; swimMove(m, dt);
                if (m.cool <= 0 && Math.abs(px - mx) < 520) { m.cool = rnd(2.2, 3.4); const d = Math.hypot(px - mx, py - my) || 1; foeShots.push({ ball: true, x: mx, y: my, vx: (px - mx) / d * 230, vy: (py - my) / d * 230, r: 9, life: 3 }); }
                break;
            case "clam": // pearl cannon straight up
                m.y = GY - m.h;
                if (m.cool <= 0 && Math.abs(px - mx) < 420) { m.cool = rnd(1.6, 2.6); foeShots.push({ pearl: true, x: mx, y: m.y, vx: rnd(-30, 30), vy: -420, r: 8, life: 1.6 }); tone(700, 0.05, "sine", 0.03); }
                break;
            case "shark": // big, wanders, then dashes toward the player's side (does not follow)
                if (m.state === "dash") { m.x += m.vx * dt; m.dash -= dt; if (m.dash <= 0) { m.state = "idle"; m.cool = rnd(2.5, 4); } }
                else { m.x += Math.sin(m.t * 0.7) * 60 * dt; m.y = m.home + Math.sin(m.t) * 50; if (m.cool <= 0 && Math.abs(px - mx) < 520) { m.state = "dash"; m.vx = Math.sign(px - mx) * 520; m.dash = 1.1; noise(0.3, 0.05); } }
                m.y = Math.max(60, Math.min(GY - m.h, m.y));
                break;
            case "star": // lies on the floor, then flies at the player like a throwing star
                if (m.state === "idle") { m.y = GY - m.h; if (Math.abs(px - mx) < 340) { m.state = "fly"; const d = Math.hypot(px - mx, py - my) || 1; m.vx = (px - mx) / d * 420; m.vy = (py - my) / d * 420; } }
                else { m.x += m.vx * dt; m.y += m.vy * dt; m.spin = (m.spin || 0) + dt * 14; if (m.y > H + 50 || m.y < -50 || Math.abs(m.x - P.x) > 1000) m.dead = true, m.fade = 0; }
                break;
        }
        // contact: stomp from above or get hurt
        if (hit(P, m)) {
            const fromAbove = P.vy > 60 && P.y + P.h - m.y < Math.min(26, m.h * 0.6) && !P.water;
            if (fromAbove && M.stomp) { P.vy = -480; damage(m, 1, true); }
            else hurt(10);
        }
        // my orbs
        for (const s of shots) if (s.life > 0 && hit({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 }, m)) {
            s.life = 0;
            if (M.gun && !M.inv) damage(m, 1, false);
            else { fx.push({ txt: "무적!", x: m.x, y: m.y - 10, t: 0.7, c: "#e5e7eb" }); tone(300, 0.05, "square", 0.03); }
        }
    }
    function swimMove(m, dt) { m.x += m.vx * dt; m.y += m.vy * dt; if (m.y < 50 || m.y > GY - m.h) { m.vy = -m.vy; m.y = Math.max(50, Math.min(GY - m.h, m.y)); } }
    function damage(m, n, stomp) {
        m.hp -= n;
        Sound.hit();
        if (m.hp <= 0) { m.dead = true; m.fade = 0.4; fx.push({ txt: stomp ? "STOMP!" : "💥", x: m.x, y: m.y - 8, t: 0.8, c: "#fde047" }); }
        else fx.push({ txt: `${m.hp}`, x: m.x, y: m.y - 8, t: 0.6, c: "#fde047" });
    }
    // ☁️ village clouds: appear at the top, drop water one by one, then go away (can't be killed)
    let cloudT = 4;
    function clouds(dt) {
        cloudT -= dt;
        if (cloudT <= 0) { cloudT = rnd(5, 9); lv.mons.push({ ...mk("cloud", P.x + rnd(-150, 300), 30), life: rnd(6, 8), vx: rnd(-60, 60) }); }
        for (const m of lv.mons) if (m.k === "cloud" && !m.dead) {
            m.life -= dt; m.y = 30; m.x += (Math.sign(P.x - m.x) * 50 + m.vx) * dt * 0.6;
            if ((m.drop = (m.drop ?? 1) - dt) <= 0) { m.drop = rnd(0.9, 1.5); foeShots.push({ e: "💧", x: m.x + m.w / 2, y: m.y + m.h, vx: 0, vy: 160, grav: 500, r: 8, life: 3, size: 18 }); }
            if (m.life <= 0) { m.dead = true; m.fade = 0.5; }
        }
    }
    function castleIn() {
        halt(); setBusy(false);
        A.castle = true; Store.saveSeason(true); opts.onChange?.();
        Sound.fanfare(); confetti(60, ["🏰", "✨", "🪙"]);
        showPanel(h("div.arc-card.win", h("div.arc-big", "🏰"), h("h3", "아케이드 성공! 보스성 입장"), h("p", "보스: 거대한 슬롯머신 (HP 100). 밟거나 구슬로 공격! 💵 돈다발에 맞으면 3초 동안 못 움직이고, 🪙 코인은 밟거나 구슬로 없애지 않으면 계속 튕겨 다닙니다."),
            h("button.btn.gold.big", { onclick: startBoss }, "⚔️ 보스전 시작")));
    }

    // ---- 🎰 the boss: a giant slot machine
    function bossUpdate(dt) {
        const B = boss;
        B.inv = Math.max(0, B.inv - dt);
        B.reel = B.reel.map((r, i) => r + dt * (6 + i * 2));
        // crazy jumps all over the room
        B.next -= dt;
        if (B.ground && B.next <= 0) { B.vy = -rnd(620, 980); B.vx = (rnd(60, W - 60 - B.w) - B.x) * rnd(0.9, 1.4); B.ground = false; B.next = rnd(0.6, 1.8); tone(140, 0.2, "square", 0.05, 0, 120); }
        B.vy += 1500 * dt; B.x += B.vx * dt; B.y += B.vy * dt;
        if (B.x < 0) { B.x = 0; B.vx = Math.abs(B.vx); } if (B.x + B.w > W) { B.x = W - B.w; B.vx = -Math.abs(B.vx); }
        if (B.y + B.h >= GY) { B.y = GY - B.h; B.vy = 0; B.vx *= 0.2; if (!B.ground) { Sound.hit(); fx.push({ txt: "💥", x: B.x + B.w / 2, y: GY - 10, t: 0.4, c: "#fff" }); } B.ground = true; }
        // throws a coin now and then — coins bounce around until stomped / shot
        bossTimers.coin -= dt;
        if (bossTimers.coin <= 0) { bossTimers.coin = rnd(2.2, 3.6); const cx = B.x + B.w / 2, cy = B.y + 30, d = Math.hypot(P.x - cx, P.y - cy) || 1; coins.push({ x: cx, y: cy, vx: (P.x - cx) / d * 340, vy: (P.y - cy) / d * 340 - 120, r: 13 }); Sound.coin(); }
        for (const c of coins) {
            c.vy += 600 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
            if (c.x < c.r) { c.x = c.r; c.vx = Math.abs(c.vx); } if (c.x > W - c.r) { c.x = W - c.r; c.vx = -Math.abs(c.vx); }
            if (c.y > GY - c.r) { c.y = GY - c.r; c.vy = -Math.max(380, Math.abs(c.vy) * 0.95); } if (c.y < c.r) { c.y = c.r; c.vy = Math.abs(c.vy); }
            const box = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
            if (hit(P, box)) { if (P.vy > 60 && P.y + P.h - box.y < 18) { c.dead = true; P.vy = -420; Sound.coin(); } else hurt(5); }
            for (const s of shots) if (s.life > 0 && hit({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 }, box)) { s.life = 0; c.dead = true; Sound.coin(); }
        }
        coins = coins.filter(c => !c.dead);
        // 💵 money bundles rain from the top: a hit = frozen for 3 s
        bossTimers.cash -= dt;
        if (bossTimers.cash <= 0) { bossTimers.cash = rnd(4.5, 7); for (let i = 0; i < rint(3, 5); i++) cash.push({ x: rnd(30, W - 60), y: -rnd(20, 200), vy: rnd(160, 260), w: 40, h: 24 }); tone(1000, 0.2, "triangle", 0.03); }
        for (const c of cash) { c.y += c.vy * dt; if (hit(P, c)) { c.dead = true; P.stun = 3; P.vx = 0; Sound.stop(); fx.push({ txt: "💫 3초 기절!", x: P.x, y: P.y - 20, t: 1.2, c: "#fbbf24" }); } if (c.y > GY) c.dead = true; }
        cash = cash.filter(c => !c.dead);
        // orb refills now and then
        bossTimers.ammo -= dt;
        if (bossTimers.ammo <= 0) { bossTimers.ammo = rnd(7, 10); lv.items.push({ kind: Math.random() < 0.7 ? "orb" : "heart", x: rnd(60, W - 90), y: rnd(200, 330), w: 28, h: 28 }); }
        // stomp / orbs hurt the boss · touching it hurts the player
        if (hit(P, B)) {
            if (P.vy > 60 && P.y + P.h - B.y < 30) { P.vy = -560; bossHit(10, "STOMP!"); }
            else hurt(10);
        }
        for (const s of shots) if (s.life > 0 && hit({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 }, B)) { s.life = 0; bossHit(10, "−10"); }
    }
    function bossHit(n, txt) {
        if (boss.inv > 0) return;
        boss.inv = 0.35; boss.hp = Math.max(0, boss.hp - n);
        Sound.hit(); fx.push({ txt, x: boss.x + boss.w / 2, y: boss.y - 10, t: 0.8, c: "#fde047" });
        if (boss.hp <= 0) bossDown();
    }
    async function bossDown() {
        halt(); setBusy(false);
        A.boss = true; Store.saveSeason(true);
        Sound.jackpot(); confetti(160, ["🪙", "💰", "🎰", "🏆"]);
        draw();
        await sleep(400);
        showPanel(h("div.arc-card.win", h("div.arc-big", "🏆"), h("h3", "BOSS CLEAR!"), h("p", "거대한 슬롯머신 보스를 무찔렀습니다! 아케이드 게임 완료.")));
        opts.onWin?.();
    }

    // ---- draw
    function draw() {
        const sky = g.createLinearGradient(0, 0, 0, H);
        const cols = mode === "boss" ? ["#3b0764", "#1e1b4b", "#0a0118"] : S.sky;
        sky.addColorStop(0, cols[0]); sky.addColorStop(0.6, cols[1]); sky.addColorStop(1, cols[2]);
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        backdrop();
        g.save(); g.translate(-Math.round(cam), 0);
        // water zones
        for (const w of lv.water) { g.fillStyle = "rgba(14,165,233,.28)"; g.fillRect(w.x0, w.top, w.x1 - w.x0, H - w.top); if (w.top > 60) { g.fillStyle = "rgba(186,230,253,.6)"; for (let x = w.x0; x < w.x1; x += 40) g.fillRect(x + ((time * 30) % 40), w.top - 2, 22, 4); } }
        // ground
        for (const gr of lv.ground) {
            const grd = g.createLinearGradient(0, GY, 0, H);
            grd.addColorStop(0, groundCol()[0]); grd.addColorStop(1, groundCol()[1]);
            g.fillStyle = grd; g.fillRect(gr.x0, GY, gr.x1 - gr.x0, H - GY);
            g.fillStyle = groundCol()[2]; g.fillRect(gr.x0, GY, gr.x1 - gr.x0, 6);
        }
        // neon start sign
        if (mode === "stage") { g.font = "bold 26px 'Lilita One', sans-serif"; g.fillStyle = "#facc15"; g.shadowColor = "#f472b6"; g.shadowBlur = 14; g.fillText("GAMBLERS ARCADE", 40, 120); g.shadowBlur = 0; }
        // platforms (neon casino tiles)
        for (const p of lv.plats) { g.fillStyle = "#4c1d95"; g.fillRect(p.x, p.y, p.w, p.h); g.shadowColor = "#f472b6"; g.shadowBlur = 10; g.strokeStyle = "#f9a8d4"; g.lineWidth = 3; g.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2); g.shadowBlur = 0; g.lineWidth = 2; g.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2); g.fillStyle = "#facc15"; for (let x = p.x + 8; x < p.x + p.w - 4; x += 16) g.fillRect(x, p.y + 7, 4, 4); }
        for (const b of lv.blocks) { g.fillStyle = b.used ? "#57534e" : "#f59e0b"; g.fillRect(b.x, b.y, b.w, b.h); g.strokeStyle = "#78350f"; g.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2); if (!b.used) { g.fillStyle = "#fff"; g.font = "bold 20px sans-serif"; g.textAlign = "center"; g.fillText("🎰", b.x + 16, b.y + 23); g.textAlign = "left"; } }
        // corner doors
        for (const d of lv.doors) {
            const K = CORNER_KINDS[d.kind], found = A.found.includes(d.kind);
            g.fillStyle = "#111827"; g.fillRect(d.x, d.y, d.w, d.h);
            g.strokeStyle = found ? "#4ade80" : "#facc15"; g.lineWidth = 3; g.strokeRect(d.x, d.y, d.w, d.h);
            g.fillStyle = "#7c2d12"; g.fillRect(d.x + 24, d.y + 46, 32, 46);
            drawE(g, K.emoji, d.x + d.w / 2, d.y + 24, 26);
            g.fillStyle = "#facc15"; g.font = "bold 12px sans-serif"; g.textAlign = "center"; g.fillText(K.label, d.x + d.w / 2, d.y - 6);
            if (hit(P, { x: d.x + 10, y: d.y, w: d.w - 20, h: d.h })) { g.fillStyle = "#fff"; g.fillText("⬇️ 들어가기", d.x + d.w / 2, d.y - 22); }
            g.textAlign = "left";
        }
        // castle
        if (lv.castle) { const c = lv.castle; drawE(g, "🏰", c.x + c.w / 2, c.y + c.h / 2 + 10, 190); g.fillStyle = "#facc15"; g.font = "bold 16px sans-serif"; g.textAlign = "center"; g.fillText("BOSS", c.x + c.w / 2, c.y - 4); g.textAlign = "left"; }
        // items
        for (const it of lv.items) if (!it.got) { const bob = Math.sin(performance.now() / 250 + it.x) * 4; drawE(g, it.kind === "orb" ? "🔮" : "❤️", it.x + 14, it.y + 14 + bob, 24); }
        // monsters
        for (const m of lv.mons) {
            g.globalAlpha = m.dead ? Math.max(0, m.fade / 0.4) : 1;
            const flip = m.k === "fish" || m.k === "shark" || m.k === "dog" || m.k === "car" || m.k === "dragon" ? (m.vx > 0 || (m.k === "car" && P.x > m.x)) : false;
            const sz = m.M.big || Math.max(m.w, m.h);
            if (m.k === "star" && m.state === "fly") { g.save(); g.translate(m.x + m.w / 2, m.y + m.h / 2); g.rotate(m.spin || 0); drawE(g, "⭐", 0, 0, sz); g.restore(); }
            else drawE(g, m.M.e, m.x + m.w / 2, m.y + m.h / 2, sz, { dark: !!m.M.dark, flip });
            if (m.M.crown) drawE(g, "👑", m.x + m.w / 2, m.y - 4, 20);
            if (m.k === "dragon" && !m.dead) { g.fillStyle = "#ef4444"; g.fillRect(m.x, m.y - 8, m.w * (m.hp / 3), 4); }
            g.globalAlpha = 1;
        }
        // shots
        for (const s of foeShots) {
            if (s.e) drawE(g, s.e, s.x, s.y, s.size || 18);
            else if (s.beam) { g.strokeStyle = "#f43f5e"; g.lineWidth = 5; g.beginPath(); g.moveTo(s.x - 18, s.y); g.lineTo(s.x + 18, s.y); g.stroke(); }
            else { g.fillStyle = s.pearl ? "#f8fafc" : "#111"; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill(); g.strokeStyle = s.pearl ? "#cbd5e1" : "#444"; g.stroke(); }
        }
        for (const s of shots) { g.fillStyle = "#c4b5fd"; g.shadowColor = "#a78bfa"; g.shadowBlur = 12; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill(); g.shadowBlur = 0; }
        // boss room
        if (mode === "boss") drawBoss();
        // the player: the profile picture
        drawPlayer();
        for (const f of fx) { g.globalAlpha = Math.min(1, f.t * 2); g.fillStyle = f.c; g.font = "bold 18px sans-serif"; g.fillText(f.txt, f.x, f.y); g.globalAlpha = 1; }
        g.restore();
        drawHud();
    }
    function groundCol() { return { sea: ["#a16207", "#422006", "#fbbf24"], desert: ["#f59e0b", "#92400e", "#fde68a"], village: ["#16a34a", "#14532d", "#86efac"], haunted: ["#3f3f46", "#09090b", "#7c3aed"] }[A.stage] || ["#444", "#111", "#888"]; }
    function backdrop() {
        const k = mode === "boss" ? "boss" : A.stage, par = -cam * 0.25;
        g.save();
        if (k === "sea") { for (let i = 0; i < 18; i++) drawE(g, "🫧", ((i * 157 + par) % (W + 60) + W + 60) % (W + 60), (H - ((performance.now() / 20 + i * 90) % H)), 14); for (let i = 0; i < 10; i++) drawE(g, "🌿", ((i * 211 + par * 2) % (W + 80) + W + 80) % (W + 80), GY - 18, 40); }
        if (k === "desert") { drawE(g, "☀️", 820, 70, 70); for (let i = 0; i < 6; i++) drawE(g, "🔺", ((i * 260 + par) % (W + 200) + W + 200) % (W + 200), GY - 50, 110); for (let i = 0; i < 5; i++) drawE(g, "🌵", ((i * 333 + par * 2) % (W + 100) + W + 100) % (W + 100), GY - 26, 46); }
        if (k === "village") { drawE(g, "🌤️", 150, 70, 60); for (let i = 0; i < 8; i++) drawE(g, i % 2 ? "🏠" : "🏡", ((i * 190 + par * 1.5) % (W + 160) + W + 160) % (W + 160), GY - 40, 84); }
        if (k === "haunted") { drawE(g, "🌕", 820, 80, 80); for (let i = 0; i < 6; i++) drawE(g, "🦇", ((i * 170 + par + performance.now() / 15) % (W + 60) + W + 60) % (W + 60), 60 + (i % 3) * 40, 22); for (let i = 0; i < 6; i++) drawE(g, i % 2 ? "🏚️" : "🪦", ((i * 240 + par * 1.5) % (W + 160) + W + 160) % (W + 160), GY - 34, 70); }
        if (k === "boss") { g.fillStyle = "rgba(250,204,21,.12)"; for (let x = 0; x < W; x += 48) g.fillRect(x, 0, 24, H); g.font = "bold 40px 'Lilita One', sans-serif"; g.fillStyle = "rgba(250,204,21,.35)"; g.textAlign = "center"; g.fillText("JACKPOT BOSS", W / 2, 70); g.textAlign = "left"; }
        g.restore();
    }
    function drawPlayer() {
        const blink = P.inv > 0 && Math.floor(P.inv * 12) % 2;
        if (blink) return;
        const ch = P.crouch ? 28 : P.h, y = P.y + (P.h - ch);
        g.save();
        g.beginPath(); g.ellipse(P.x + P.w / 2, y + ch / 2, P.w / 2 + 3, ch / 2 + 3, 0, 0, 7); g.fillStyle = "#facc15"; g.fill();
        g.beginPath(); g.ellipse(P.x + P.w / 2, y + ch / 2, P.w / 2, ch / 2, 0, 0, 7); g.clip();
        if (face.complete && face.naturalWidth) g.drawImage(face, P.x - 2, y - 2, P.w + 4, ch + 4); else { g.fillStyle = "#64748b"; g.fillRect(P.x, y, P.w, ch); }
        g.restore();
        // facing arrow + stun stars
        g.fillStyle = "#facc15"; g.beginPath(); const fx0 = P.x + P.w / 2 + P.face * (P.w / 2 + 8); g.moveTo(fx0 + P.face * 7, y + ch / 2); g.lineTo(fx0, y + ch / 2 - 6); g.lineTo(fx0, y + ch / 2 + 6); g.fill();
        if (P.stun > 0) drawE(g, "💫", P.x + P.w / 2, y - 12, 22);
    }
    function drawBoss() {
        const B = boss;
        g.save();
        if (B.inv > 0 && Math.floor(B.inv * 20) % 2) g.globalAlpha = 0.5;
        // cabinet
        const grd = g.createLinearGradient(B.x, B.y, B.x + B.w, B.y);
        grd.addColorStop(0, "#b91c1c"); grd.addColorStop(0.5, "#ef4444"); grd.addColorStop(1, "#7f1d1d");
        g.fillStyle = grd; g.fillRect(B.x, B.y + 20, B.w, B.h - 20);
        g.fillStyle = "#facc15"; g.fillRect(B.x + 10, B.y, B.w - 20, 26);
        g.fillStyle = "#111"; g.font = "bold 14px sans-serif"; g.textAlign = "center"; g.fillText("BOSS 777", B.x + B.w / 2, B.y + 18);
        // spinning reels
        const R = ["🍒", "7️⃣", "💎", "🔔", "🍋", "⭐"];
        g.fillStyle = "#f8fafc"; g.fillRect(B.x + 12, B.y + 40, B.w - 24, 48);
        for (let i = 0; i < 3; i++) drawE(g, R[Math.floor(B.reel[i]) % R.length], B.x + 30 + i * 30, B.y + 64, 24);
        // angry eyes + coin slot + lever
        drawE(g, "😠", B.x + B.w / 2, B.y + 112, 34);
        g.fillStyle = "#facc15"; g.fillRect(B.x + B.w - 4, B.y + 50, 8, 40); g.beginPath(); g.arc(B.x + B.w, B.y + 46, 9, 0, 7); g.fill();
        g.textAlign = "left"; g.globalAlpha = 1;
        g.restore();
        for (const c of coins) drawE(g, "🪙", c.x, c.y, c.r * 2.1);
        for (const c of cash) drawE(g, "💵", c.x + c.w / 2, c.y + c.h / 2, 30);
    }
    function drawHud() {
        const hp = Math.max(0, Math.round(opts.hp()));
        g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(8, 8, 330, 34);
        g.font = "bold 16px sans-serif"; g.fillStyle = "#fb7185"; g.fillText(`❤ ${hp}`, 18, 31);
        g.fillStyle = "#c4b5fd"; g.fillText(`🔮 ${P.orbs}/${ORB_MAX}`, 90, 31);
        if (mode === "stage") { g.fillStyle = time <= 20 ? "#f87171" : "#fde047"; g.fillText(`⏱ ${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`, 190, 31); }
        if (mode === "stage") { const p = Math.min(1, P.x / (lv.L - 320)); g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(W - 268, 12, 260, 14); g.fillStyle = "#facc15"; g.fillRect(W - 266, 14, 256 * p, 10); drawE(g, "🏰", W - 8, 18, 18); }
        if (mode === "boss") { g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(W - 320, 10, 310, 22); g.fillStyle = "#ef4444"; g.fillRect(W - 316, 14, 302 * (boss.hp / 100), 14); g.fillStyle = "#fff"; g.font = "bold 13px sans-serif"; g.fillText(`🎰 BOSS HP ${boss.hp}/100`, W - 300, 26); }
    }

    function pause() { if (!running) return; halt(); setBusy(false); if (mode === "stage" || mode === "boss") { const was = mode; showPanel(h("div.arc-card", h("h3", "⏸ 일시정지"), h("button.btn.gold.big", { onclick: () => { mode = was; resume(); } }, "▶ 계속하기"))); mode = was === "stage" ? "pausedStage" : "pausedBoss"; } }
    function resume() {
        if (stopped) return;
        if (mode === "corner" || mode === "pausedStage") mode = "stage";
        if (mode === "pausedBoss") mode = "boss";
        if (mode !== "stage" && mode !== "boss") return;
        hidePanel(); opts.onResume?.(); go(); canvas.focus();
    }
    function stop() { stopped = true; halt(); setBusy(false); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); }
    menu();
    draw0();
    function draw0() {
        if (!A.stage) { g.fillStyle = "#0b0420"; g.fillRect(0, 0, W, H); g.font = "120px sans-serif"; g.textAlign = "center"; g.fillText("🕹️", W / 2, H / 2 + 40); g.textAlign = "left"; return; }
        lv = buildLevel(A.stage); P = newPlayer(80, GY - 40); draw();
    }
    // test hook (admin map test / debugging): warp along the stage, jump to the boss
    el.arcDebug = { get P() { return P; }, get lv() { return lv; }, get boss() { return boss; }, warp: x => { if (P) { P.x = x; P.y = GY - 120; } }, toBoss: () => { A.castle = true; startBoss(); } };
    return { el, pause, resume, stop, get mode() { return mode; } };
}
