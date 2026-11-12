// =====================================================================
// Location corners:
//   💪 돈벌기 — blood donation / time labour / get pooped on / sell an item
//               (any 2 per player per season)
//   🥺 구걸   — type "돈주세요", get 0~1000 G (once per round)
// =====================================================================
import { h, sleep, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, confetti, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { catalogEntry, WEAPON_BY_ID, earnKinds } from "../data/catalog.js";
import { musicCorner, survivalCorner, guessCorner, jobView as jobView2, scheduleNpc, npcAttack } from "./corners2.js";
export { scheduleNpc, npcAttack };
export { npcInfo } from "./corners2.js";
export const jobView = (pid, turn, onChange) => jobView2(pid, turn, onChange, payout);
import * as G from "../game/season.js";
import { avatar, displayName } from "../ui/profile.js";

const randStep = (min, max, step) => min + Math.floor(Math.random() * ((max - min) / step + 1)) * step;

const JOBS = [
    { id: "blood", icon: "🩸", name: "헌혈", desc: "HP 10~30을 기부하고 10,000~50,000G를 받습니다." },
    { id: "labor", icon: "⏳", name: "시간노동", desc: "10초 동안 아무것도 못 하고 일한 뒤 100~1,000G를 받습니다." },
    { id: "poop", icon: "💩", name: "똥 뿌리기", desc: "10초 동안 똥을 맞으며 버티면 100~1,000G를 받습니다." },
    { id: "sell", icon: "🏷️", name: "아이템팔기", desc: "아이템이나 무기 하나를 팔고 100~10,000G를 받습니다 (비싼 물건이라고 더 받지는 않음)." },
    { id: "music", icon: "🎧", name: "음악 감상", desc: "랜덤 음악의 랜덤 구간을 30초 동안 듣고 100~5,000G를 받습니다 (30초는 플레이 시간에 포함)." },
    { id: "survival", icon: "🏝️", name: "서바이벌", desc: "나 + 시즌 밖 플레이어 9명 → 후보 3명 → 최종 1명이 1,000~5,000G! (시즌 밖 우승자는 다음 시즌 참가 때 그 돈을 가져감)" },
    { id: "guess", icon: "❓", name: "플레이어 이름 맞추기", desc: "물음표로 가려진 플레이어를 5지선다로 맞히기. 정보(최대 3개)를 볼수록 상금이 줄어듭니다: 확인 없이 10,000~30,000G · 1개 5,000~20,000G · 2개 2,000~10,000G · 3개 500~1,000G · 오답 0G." },
];

export function earnView(pid, onChange, { loc = null, turn = null } = {}) {
    const ps = G.S().ps[pid];
    const left = G.earnLeft(pid);
    const round = G.S().round;
    const list = JOBS.filter(j => !loc || earnKinds(loc).includes(j.id));
    // what the player could actually do right now (no HP to give / nothing to sell → skipped)
    const can = j => j.id === "blood" ? ps.hp > 10 : j.id === "sell" ? (ps.weapons.length > 0 || Object.values(ps.items || {}).some(n => n > 0)) : true;
    // the drawn activity stays the same for this map this round (no re-rolling by cancelling)
    const drawn = () => { const p = ps.earnPick; const j = p && p.round === round && p.loc === (loc?.id || null) ? list.find(x => x.id === p.id) : null; return j && can(j) ? j : null; };
    let busy = false;
    const wrap = h("div.earn-view");
    const cards = list.map(job => h("div.earn-card.j-" + job.id, h("div.ec-ico", job.icon), h("b", job.name), h("p.muted", job.desc)));
    const run = async job => {
        if (busy) return;
        if (G.earnLeft(pid) <= 0) return toast(`돈벌기는 시즌당 ${G.EARN_PER_SEASON}번까지입니다`, "warn");
        busy = true;
        try {
            const r = await JOBS_RUN[job.id](pid, ps, turn);
            if (r) delete ps.earnPick; // done: the next one is drawn fresh
            if (r?.lost) { G.payEarn(pid, job.name, 0); await payout(pid, 0, r.msg); onChange(); }
            else if (r) { G.payEarn(pid, job.name, r.gold, r.extra); await payout(pid, r.gold, r.msg); onChange(); }
        } finally { busy = false; draw(); }
    };
    async function roll() {
        if (busy) return;
        if (G.earnLeft(pid) <= 0) return toast(`돈벌기는 시즌당 ${G.EARN_PER_SEASON}번까지입니다`, "warn");
        const pool = list.filter(can);
        if (!pool.length) return toast("지금 할 수 있는 돈벌기가 없습니다", "warn");
        busy = true;
        const target = pool[Math.floor(Math.random() * pool.length)];
        const hot = i => cards.forEach((c, k) => c.classList.toggle("hot", k === i));
        const total = 10 + list.indexOf(target) + list.length;
        for (let k = 0; k <= total; k++) { hot(k === total ? list.indexOf(target) : k % list.length); Sound.tick(); await sleep(45 + k * 7); }
        cards[list.indexOf(target)].classList.add("chosen");
        Sound.bonus();
        ps.earnPick = { round, loc: loc?.id || null, id: target.id };
        G.S() && Store.saveSeason();
        await sleep(700);
        busy = false;
        run(target);
    }
    function draw() {
        const d = drawn();
        cards.forEach((c, k) => { c.classList.remove("hot"); c.classList.toggle("chosen", !!d && list[k] === d); c.classList.toggle("off", !can(list[k])); });
        const n = Math.max(0, G.earnLeft(pid));
        wrap.replaceChildren(
            h("p.notice", `💪 돈벌기는 시즌당 ${G.EARN_PER_SEASON}번까지! 무엇을 할지는 🎲 랜덤으로 정해집니다. 남은 횟수: ${n}회 · 현재 HP ${ps.hp}`),
            h("div.row.center", d
                ? h("button.btn.gold.big", { disabled: n <= 0, onclick: () => run(d) }, `${d.icon} ${d.name} 하기 (뽑힌 돈벌기)`)
                : h("button.btn.big" + (n > 0 ? ".gold" : ".ghost"), { disabled: n <= 0, onclick: roll }, n > 0 ? "🎲 돈벌기 뽑기" : "횟수 소진")),
            h("div.earn-grid", cards));
    }
    draw();
    return wrap;
}

const JOBS_RUN = {
    music: (pid, ps, turn) => musicCorner(pid, turn),
    survival: pid => survivalCorner(pid),
    guess: pid => guessCorner(pid),
    async blood(pid, ps) {
        if (ps.hp <= 10) { toast("HP가 너무 낮아 헌혈할 수 없습니다 (HP 11 이상 필요)", "warn"); return null; }
        let give = randStep(10, 30, 1);
        give = Math.min(give, ps.hp - 1);
        if (!(await confirmBox(`헌혈하면 HP가 10~30 줄어듭니다 (현재 HP ${ps.hp}). 진행할까요?`))) return null;
        const bag = h("div.blood-bag", h("i"));
        const ov = taskOverlay(h("div.task-scene", avatar(pid, 180), h("div.needle", "💉"), bag, h("div.task-label", "헌혈 중…")));
        Sound.whoosh();
        await sleep(50); bag.classList.add("fill");
        await sleep(3000);
        ov.remove();
        return { gold: randStep(10000, 50000, 1000), extra: { hp: give }, msg: `🩸 HP ${give} 기부 · 감사합니다!` };
    },
    async labor(pid) {
        const bar = h("div.task-bar", h("i"));
        const count = h("div.task-count", "10");
        const ov = taskOverlay(h("div.task-scene.labor", h("div.worker", avatar(pid, 150), h("span.pick", "⛏️")), h("div.rocks", "🪨🪨🪨"), h("div.task-label", "⏳ 노동 중… 아무것도 할 수 없습니다"), count, bar));
        bar.firstChild.style.transition = "width 10s linear";
        await sleep(50); bar.firstChild.style.width = "100%";
        for (let i = 10; i > 0; i--) { count.textContent = i; Sound.hit(); await sleep(1000); }
        ov.remove();
        return { gold: randStep(100, 1000, 10), msg: "⏳ 수고하셨습니다!" };
    },
    async poop(pid) {
        if (!(await confirmBox("10초 동안 똥을 맞아야 합니다… 정말 할까요? 💩"))) return null;
        await poopShow(pid);
        return { gold: randStep(100, 1000, 10), msg: "💩 …씻고 오세요" };
    },
    async sell(pid, ps) {
        const goods = [
            ...Object.entries(ps.items || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ kind: "item", id, label: `${catalogEntry("item", id)?.emoji || "🎁"} ${catalogEntry("item", id)?.name || id}`, n })),
            ...ps.weapons.map((id, i) => ({ kind: "weapon", id, i, label: `${WEAPON_BY_ID[id]?.emoji || "⚔️"} ${WEAPON_BY_ID[id]?.name || id}` }))
        ];
        if (!goods.length) { toast("팔 수 있는 아이템이나 무기가 없습니다", "warn"); return null; }
        const choice = await new Promise(res => {
            const m = modal(h("div.sell-list", h("p.muted", "무엇을 팔까요? (가격은 랜덤 100~10,000G)"),
                goods.map(g => h("button.btn.ghost", { onclick: () => { m.close(); res(g); } }, g.label, g.n ? ` ×${g.n}` : ""))), { title: "🏷️ 아이템팔기" });
            m.closed.then(() => res(null));
        });
        if (!choice) return null;
        if (choice.kind === "item") ps.items[choice.id]--;
        else ps.weapons.splice(ps.weapons.indexOf(choice.id), 1);
        G.log(`🏷️ ${G.name(pid)} ${choice.label} 판매`);
        const ov = taskOverlay(h("div.task-scene", h("div.big-emoji.sold", choice.label.split(" ")[0]), h("div.stamp", "SOLD"), h("div.task-label", "흥정 중…")));
        Sound.click(); await sleep(1600); ov.remove();
        return { gold: randStep(100, 10000, 100), msg: `🏷️ ${choice.label} 판매 완료` };
    }
};

function taskOverlay(content) {
    const ov = h("div.task-ov", content);
    document.body.append(ov);
    return ov;
}

async function payout(pid, gold, msg) {
    const num = h("b.pay-num", "+0 G");
    const ov = h("div.pay-ov", h("div.pay-box", h("div.pay-msg", msg), num));
    document.body.append(ov);
    Sound.cash(); confetti(40, ["🪙", "💵"]);
    const t0 = performance.now();
    while (performance.now() - t0 < 900) { num.textContent = `+${fmt(Math.round(gold * (performance.now() - t0) / 900))} G`; await sleep(30); }
    num.textContent = `+${fmt(gold)} G`;
    await Promise.race([sleep(1600), new Promise(r => ov.addEventListener("click", r, { once: true }))]);
    ov.remove();
}

// 10 seconds of poop: thrown from outside, sewage pouring from above,
// flies buzzing and stink waves. 뿌직뿌직.
export async function poopShow(pid) {
    const target = h("div.poop-target", avatar(pid, 220, { effect: false }));
    const sewage = h("div.sewage");
    const flies = h("div.flies", Array.from({ length: 6 }, (_, i) => h("span.fly", { style: { "--i": i } }, "🪰")));
    const stink = h("div.stink", Array.from({ length: 8 }, (_, i) => h("span", { style: { "--i": i } }, i % 2 ? "💨" : "〰️")));
    const count = h("div.poop-count", "10");
    const ov = h("div.poop-ov", sewage, h("div.poop-stage", stink, target, flies), count, h("div.poop-title", `💩 ${displayName(Store.player(pid))} 똥 맞는 중… 💩`));
    document.body.append(ov);
    let alive = true;
    // thrower
    (async () => {
        while (alive) {
            const r = target.getBoundingClientRect();
            const tx = r.left + r.width * (0.2 + Math.random() * 0.6), ty = r.top + r.height * (0.15 + Math.random() * 0.7);
            const side = Math.floor(Math.random() * 4);
            const sx = side === 0 ? -60 : side === 1 ? innerWidth + 60 : Math.random() * innerWidth;
            const sy = side === 2 ? innerHeight + 60 : side === 3 ? -60 : Math.random() * innerHeight;
            const p = h("div.poop-proj", "💩");
            p.style.left = sx + "px"; p.style.top = sy + "px";
            ov.append(p);
            p.animate([{ transform: "translate(-50%,-50%) rotate(0) scale(.8)" }, { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) rotate(${(Math.random() - .5) * 900}deg) scale(1.3)` }],
                { duration: 520, easing: "cubic-bezier(.4,0,.9,.6)", fill: "forwards" }).finished.then(() => {
                p.remove(); if (!alive) return;
                Sound.poop();
                const splat = h("span.splat", "💩");
                splat.style.left = (tx - r.left) / r.width * 100 + "%"; splat.style.top = (ty - r.top) / r.height * 100 + "%";
                splat.style.setProperty("--rot", (Math.random() * 60 - 30) + "deg");
                target.append(splat);
                target.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 160 });
            });
            await sleep(260 + Math.random() * 260);
        }
    })();
    (async () => { while (alive) { Sound.buzz(); await sleep(700); } })();
    setTimeout(() => { if (alive) { sewage.classList.add("on"); Sound.splash(); } }, 2500);
    setTimeout(() => { if (alive) Sound.splash(); }, 6000);
    for (let i = 10; i > 0; i--) { count.textContent = i; await sleep(1000); }
    alive = false;
    ov.classList.add("out"); await sleep(400); ov.remove();
}

// ------------------------------------------------------------------ begging
export function begView(pid, onChange) {
    const can = G.canBeg(pid);
    const wrap = h("div.beg-view");
    if (!can) { wrap.append(h("p.notice", "🥺 이번 라운드에는 이미 구걸했습니다. 다음 라운드에 다시 오세요.")); return wrap; }
    const input = h("input.input.beg-input", { placeholder: "돈주세요", maxlength: 20 });
    const btn = h("button.btn.gold", { onclick: () => go() }, "🥺 구걸하기");
    input.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    let done = false;
    async function go() {
        if (done) return;
        if (input.value.replace(/\s/g, "") !== "돈주세요") { input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake"); return toast("'돈주세요'라고 정확히 입력하세요", "warn"); }
        done = true;
        const gold = randStep(0, 1000, 10);
        const bubble = h("div.beg-bubble", "");
        const basket = h("div.beg-basket", h("div.beg-face", avatar(pid, 120, { effect: false })), h("div.basket", "🧺"), h("div.beg-coins"));
        const scene = h("div.beg-scene", bubble, basket, h("div.beg-result"));
        wrap.replaceChildren(scene);
        for (const ch of "돈주세요…") { bubble.textContent += ch; Sound.click(); await sleep(140); }
        await sleep(900);
        const coins = basket.querySelector(".beg-coins");
        const n = Math.min(14, Math.ceil(gold / 80));
        if (!gold) { coins.append(h("span.fly-solo", "🪰")); Sound.buzz(); await sleep(1200); }
        for (let i = 0; i < n; i++) { coins.append(h("span.drop-coin", { style: { "--x": (Math.random() * 80 - 40) + "px" } }, "🪙")); Sound.coin(); await sleep(140); }
        G.payBeg(pid, gold);
        scene.querySelector(".beg-result").replaceChildren(gold ? h("b", `+${fmt(gold)} G 받았다!`) : h("b.down", "…아무도 돈을 주지 않았다 (0G)"));
        if (gold) Sound.cash(); else Sound.lose();
        await sleep(1500);
        onChange();
    }
    wrap.append(
        h("p.muted", "타이핑 칸에 '돈주세요'를 입력하면 지나가는 사람들이 0~1,000G를 바구니에 넣어줄지도…? (라운드당 1번)"),
        h("div.beg-scene.idle", h("div.beg-basket", h("div.basket", "🧺"))),
        h("div.row", input, btn));
    setTimeout(() => input.focus(), 50);
    return wrap;
}
