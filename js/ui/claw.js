// =====================================================================
// Round elimination as a claw machine + the champion celebration.
//
// clawElimination(cands, { title, onDone }):
//   > 3 candidates: their profile balls fill a claw machine; the claw pulls
//     out 3 (sometimes it drops a ball halfway and grabs another one).
//   then 1 of the 3 is saved at random, and the last 2 face a tense draw.
//   ≤ 3 candidates: no claw — straight to the save (3) / the final draw (2).
//   onDone(eliminatedPid) is called once the loser is shown.
// winnerCelebration(s, { actions }): the roster lined up left / right, the
//   champion in the middle with blinking WINNER signs, balloons and fireworks.
// =====================================================================
import { h, sleep, shuffle } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { confetti } from "../core/fx.js";
import { Store } from "../core/store.js";
import { avatar, displayName } from "./profile.js";

const nm = pid => displayName(Store.player(pid));
const MOVE = 900;       // claw travel / rope time (ms)
const HEAD = 34;        // claw head height (px)
const HEAD_W = 54;
const SLIP_RATE = 0.35; // chance the claw drops its first ball

export function clawElimination(cands, { onDone = () => { } } = {}) {
    const many = cands.length > 3;
    const B = cands.length > 12 ? 50 : 60; // ball size
    const status = h("p.claw-status");
    const tray = h("div.claw-tray");
    const btn = h("button.btn.red.huge");
    const wrap = h("div.claw-wrap");
    const card = pid => h("div.claw-card", { "data-id": pid }, avatar(pid, 92, { effect: false }), h("small", nm(pid)), h("i.claw-tag"));
    let machine = null, claw = null, rope = null, head = null;
    const balls = new Map();

    if (many) {
        rope = h("div.claw-rope");
        head = h("div.claw-head", h("i.claw-l"), h("i.claw-r"));
        claw = h("div.claw", rope, head);
        machine = h("div.claw-machine", { style: { "--b": B + "px" } },
            h("div.claw-rail"), h("div.claw-chute", h("span", "OUT")), claw);
        // the pile: bottom-up rows across the right ~78% of the glass
        const per = Math.max(3, Math.floor(400 / (B + 4)));
        shuffle(cands).forEach((pid, i) => {
            const row = Math.floor(i / per), col = i % per;
            const ball = h("div.claw-ball", { "data-id": pid }, avatar(pid, B - 8, { effect: false, frame: false }));
            const f = Math.min(1, 0.22 + (col + (row % 2) * 0.5) / (per + 0.5) * 0.78 + (Math.random() * 0.02 - 0.01));
            ball.style.left = `calc(${(f * 100).toFixed(2)}% - ${(f * B).toFixed(1)}px)`;
            ball.style.top = `${380 - B - 6 - row * (B * 0.82) - Math.random() * 4}px`;
            ball.style.setProperty("--h", (pid * 47) % 360);
            balls.set(pid, ball);
            machine.append(ball);
        });
        status.textContent = `탈락 후보 ${cands.length}명의 프로필 공이 들어 있습니다. 집게가 3개를 뽑습니다!`;
        btn.textContent = "🕹️ 집게 시작 — 3명 뽑기";
        btn.onclick = runClaw;
        wrap.append(machine, h("h4.claw-tray-title", "🎯 뽑힌 공"), tray, status, h("div.row.center", btn));
    } else {
        cands.forEach(pid => tray.append(card(pid)));
        wrap.append(tray, status, h("div.row.center", btn));
        setupNext(cands);
    }

    function setupNext(three) {
        if (three.length === 3) {
            status.textContent = "3명 중 1명은 탈락 후보에서 구제됩니다…";
            btn.textContent = "🛟 1명 구제하기";
            btn.disabled = false;
            btn.onclick = () => saveOne(three);
        } else if (three.length === 2) toFinal(three);
        else {
            status.textContent = "탈락 후보가 1명뿐입니다.";
            btn.textContent = "💀 탈락 확정";
            btn.disabled = false;
            btn.onclick = async () => { btn.disabled = true; const c = tray.querySelector(".claw-card"); c.classList.add("dead"); c.querySelector(".claw-tag").textContent = "✕"; Sound.boom(); await sleep(1600); onDone(three[0]); };
        }
    }

    // ---------------------------------------------------------------- the claw
    // the claw's `left` is its centre (CSS: margin-left −HEAD_W/2)
    const mRect = () => machine.getBoundingClientRect();
    const clawX = () => claw.offsetLeft + HEAD_W / 2;
    function moveClaw(x) { claw.style.left = x + "px"; return sleep(MOVE + 50); }
    function ropeTo(len) { rope.style.height = Math.max(10, len) + "px"; head.style.top = Math.max(10, len) + "px"; return sleep(MOVE + 50); }
    function attach(ball) {
        ball.style.transition = "none";
        const top = ball.offsetTop, left = ball.offsetLeft;
        const hx = claw.offsetLeft, hy = head.offsetTop;
        head.append(ball);
        ball.style.left = (left - hx) + "px";
        ball.style.top = (top - hy) + "px";
        void ball.offsetWidth;
        ball.style.transition = `left .3s, top .3s`;
        ball.style.left = (HEAD_W / 2 - B / 2) + "px";
        ball.style.top = (HEAD - B * 0.45) + "px";
    }
    function detach(ball) {
        const m = mRect(), r = ball.getBoundingClientRect();
        ball.style.transition = "none";
        machine.append(ball);
        ball.style.left = (r.left - m.left - machine.clientLeft) + "px"; ball.style.top = (r.top - m.top - machine.clientTop) + "px";
        void ball.offsetWidth;
    }
    async function grab(pid, slip) {
        const ball = balls.get(pid);
        const bx = ball.offsetLeft + B / 2, by = ball.offsetTop;
        await moveClaw(bx);
        claw.classList.add("open"); Sound.whoosh();
        await ropeTo(by + B / 2 - HEAD);
        claw.classList.remove("open"); Sound.click();
        await sleep(300);
        attach(ball);
        ball.classList.add("held");
        await ropeTo(14);
        if (slip) {
            // heading for the chute… and it slips
            claw.style.left = (clawX() - machine.clientWidth * 0.22) + "px";
            await sleep(MOVE * 0.45);
            claw.classList.add("open");
            detach(ball);
            ball.classList.remove("held");
            status.textContent = `앗! ${nm(pid)}의 공을 놓쳤다!`;
            Sound.miss();
            const W = machine.clientWidth, H = machine.clientHeight;
            const drop = H - B - 6 - Math.random() * B * 0.6;
            ball.style.transition = "top .55s cubic-bezier(.5,0,1,1), left .55s";
            ball.style.left = Math.min(W - B, Math.max(W * 0.24, ball.offsetLeft + (Math.random() * 60 - 30))) + "px";
            ball.style.top = drop + "px";
            await sleep(600);
            ball.classList.add("bounce"); setTimeout(() => ball.classList.remove("bounce"), 500);
            Sound.hit();
            await sleep(MOVE * 0.6);
            claw.classList.remove("open");
            return false;
        }
        await moveClaw(machine.clientWidth * 0.1);
        claw.classList.add("open"); Sound.whoosh();
        detach(ball);
        ball.classList.remove("held");
        ball.style.transition = "top .45s cubic-bezier(.5,0,1,1)";
        ball.style.top = (machine.clientHeight + 10) + "px";
        await sleep(500);
        Sound.boom();
        ball.remove(); balls.delete(pid);
        const c = card(pid); c.classList.add("pop");
        tray.append(c);
        await sleep(400);
        claw.classList.remove("open");
        return true;
    }
    async function runClaw() {
        btn.disabled = true;
        const picks = shuffle(cands).slice(0, 3);
        let slips = 0;
        for (let i = 0; i < 3; i++) {
            const pid = picks[i];
            const others = [...balls.keys()].filter(x => x !== pid && !picks.slice(i).includes(x));
            status.textContent = `🕹️ ${i + 1}번째 공을 노리는 중…`;
            if (others.length && slips < 2 && Math.random() < SLIP_RATE) {
                slips++;
                await grab(others[Math.floor(Math.random() * others.length)], true);
                status.textContent = "🕹️ 다시 한 번…!";
            }
            await grab(pid, false);
            status.textContent = `🎯 ${nm(pid)}의 공이 나왔다!`;
            await sleep(700);
        }
        await moveClaw(machine.clientWidth * 0.55);
        setupNext(picks);
    }

    // ---------------------------------------------------------------- 3 → 2 → 1
    const cardOf = pid => tray.querySelector(`.claw-card[data-id="${pid}"]`);
    async function hop(list, target, { laps = 3, tense = false } = {}) {
        const ti = list.indexOf(target);
        const total = list.length * laps + ti + 1;
        let gap = tense ? 90 : 60;
        for (let k = 0; k < total; k++) {
            list.forEach(p => cardOf(p).classList.remove("hot"));
            cardOf(list[k % list.length]).classList.add("hot");
            total - k < 7 ? Sound.heartbeat() : Sound.tick();
            await sleep(gap);
            gap = total - k < 9 ? gap * (tense ? 1.45 : 1.3) : gap * 1.04;
        }
        list.forEach(p => cardOf(p).classList.remove("hot"));
    }
    async function saveOne(three) {
        btn.disabled = true;
        const saved = three[Math.floor(Math.random() * 3)];
        status.textContent = "누가 살아남을까…? 🥁";
        wrap.classList.add("tense");
        await hop(three, saved);
        wrap.classList.remove("tense");
        const c = cardOf(saved);
        c.classList.add("saved"); c.querySelector(".claw-tag").textContent = "🛟 SAFE";
        Sound.bonus(); confetti(30, ["🛟", "✨"]);
        status.textContent = `🛟 ${nm(saved)} 구제! 탈락 후보에서 제외됩니다`;
        await sleep(1600);
        toFinal(three.filter(p => p !== saved));
    }
    function toFinal(two) {
        tray.classList.add("final");
        status.textContent = `최후의 2명: ${two.map(nm).join(" vs ")} — 이 중 1명이 탈락합니다`;
        btn.textContent = "💀 최종 탈락자 결정";
        btn.disabled = false;
        btn.onclick = () => finalDraw(two);
    }
    async function finalDraw(two) {
        btn.disabled = true;
        const loser = two[Math.floor(Math.random() * 2)];
        status.textContent = "두근… 두근…";
        wrap.classList.add("tense");
        await hop(two, loser, { laps: 5, tense: true });
        // one last tease: the light jumps to the other side and comes back
        const other = two.find(p => p !== loser);
        cardOf(other).classList.add("hot"); Sound.heartbeat(); await sleep(700);
        cardOf(other).classList.remove("hot"); cardOf(loser).classList.add("hot"); Sound.heartbeat(); await sleep(900);
        cardOf(loser).classList.remove("hot");
        wrap.classList.remove("tense");
        const c = cardOf(loser);
        c.classList.add("dead"); c.querySelector(".claw-tag").textContent = "✕";
        const s = cardOf(other); s.classList.add("saved"); s.querySelector(".claw-tag").textContent = "생존!";
        Sound.boom();
        status.textContent = `💀 ${nm(loser)} 탈락…`;
        await sleep(2000);
        onDone(loser);
    }
    return wrap;
}

// ------------------------------------------------------------------ champion celebration
export function winnerCelebration(s, { actions = [] } = {}) {
    const win = s.winnerId;
    const others = s.roster.filter(p => p !== win).sort((a, b) => (s.ps[a].rank || 99) - (s.ps[b].rank || 99));
    const person = (pid, i) => h("div.cel-p", { style: { "--i": i } }, avatar(pid, 50, { effect: false }), h("small", `${s.ps[pid].rank || "-"}위`), h("b", nm(pid)));
    // ranks 2, 4, 6 … on the left (closest to the champion first), 3, 5, 7 … on the right
    const left = h("div.cel-side.left", others.filter((_, i) => i % 2 === 0).map((p, i) => person(p, i)));
    const right = h("div.cel-side.right", others.filter((_, i) => i % 2 === 1).map((p, i) => person(p, i)));
    const words = h("div.cel-words", Array.from({ length: 8 }, (_, i) => h("span", { style: { "--a": `${i * 45}deg`, "--i": i } }, "Winner")));
    const center = h("div.cel-center", words, h("div.cel-crown", "👑"), avatar(win, 190), h("div.cel-name", nm(win)));
    const sky = h("div.cel-sky");
    const acts = h("div.cel-actions", actions);
    const stage = h("div.cel-stage", sky,
        h("h2.cel-title", `SEASON ${s.number} CHAMPION`),
        h("div.cel-line", left, center, right),
        h("p.cel-sub", `${s.roster.length}명의 갬블러 중 최후의 1인 · 명예의 전당 등극!`),
        acts);
    // balloons + fireworks while the page is open
    const alive = () => document.body.contains(stage);
    let started = false;
    const balloon = () => {
        const b = h("span.cel-balloon", { style: { left: Math.random() * 96 + "%", "--h": Math.floor(Math.random() * 360) + "deg", "--t": (6 + Math.random() * 4).toFixed(1) + "s", "--dx": (Math.random() * 80 - 40) + "px" } }, "🎈");
        sky.append(b); setTimeout(() => b.remove(), 11000);
    };
    const firework = () => {
        const f = h("div.cel-fw", { style: { left: 8 + Math.random() * 84 + "%", top: 5 + Math.random() * 45 + "%", "--c": `hsl(${Math.floor(Math.random() * 360)} 95% 62%)` } },
            Array.from({ length: 14 }, (_, i) => h("i", { style: { "--a": `${i * (360 / 14)}deg` } })));
        sky.append(f); setTimeout(() => f.remove(), 1500);
    };
    const tick = setInterval(() => {
        if (!alive()) { if (started) clearInterval(tick); return; }
        started = true;
        balloon();
        if (Math.random() < 0.55) firework();
    }, 420);
    setTimeout(() => { for (let i = 0; i < 12; i++) setTimeout(balloon, i * 90); for (let i = 0; i < 4; i++) setTimeout(firework, 200 + i * 250); Sound.fanfare(); confetti(160, ["👑", "🎉", "🎈", "✨", "🪙"]); }, 150);
    setTimeout(() => acts.classList.add("show"), 4000);
    return stage;
}
