// =====================================================================
// 🤲 HANDPAY: a win of 1000× the bet or more, or a GRAND jackpot, on any
// slot or casino game → ~10 s celebration: the player's profile, a hand
// passing stacks of cash that pile up beside it, and celebration music.
// =====================================================================
import { h, sleep, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import { avatar, displayName } from "./profile.js";

export const HANDPAY_X = 1000;
export const isHandpay = (bet, win, jackpots = []) => (bet > 0 && win >= bet * HANDPAY_X) || (jackpots || []).includes("GRAND");

export async function handpay(pid, amount, { ms = 10000, game = null } = {}) {
    if (pid != null) Store.recordHighlight("handpay", { pid, amount, game });
    const hold = Activity.hold?.() || (() => { });
    const p = pid != null ? Store.player(pid) : null;
    const pile = h("div.hp-pile");
    const hand = h("div.hp-hand", h("span.hp-palm", "🫴"), h("span.hp-cash", "💵"));
    const amt = h("b.hp-amount", "0");
    const skip = h("button.btn.ghost.small.hp-skip", "건너뛰기 ▶");
    const box = h("div.handpay",
        h("div.hp-rays"),
        h("div.hp-title", "🎉 축하합니다! ", amt, " Handpay Win! 🎉"),
        h("div.hp-stage",
            h("div.hp-player", p ? avatar(pid, 150) : h("div.hp-noavatar", "🙂"), h("div.hp-name", p ? displayName(p) : "PLAYER")),
            pile, hand),
        h("div.hp-sub", "HANDPAY — 직원이 직접 현금으로 지급합니다"), skip);
    document.body.append(box);
    let stop = false;
    skip.onclick = () => { stop = true; };
    // the amount counts up while the music plays
    const t0 = performance.now();
    const counter = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (ms * 0.6)); amt.textContent = fmt(Math.round(amount * (1 - Math.pow(1 - k, 3)))) + " G"; }, 50);
    const music = (async () => { while (!stop && performance.now() - t0 < ms) { Sound.fanfare(); await sleep(1300); if (stop) break; Sound.jackpot(); await sleep(1100); } })();
    // the hand delivers a bundle, the bundle lands on the pile
    let n = 0;
    while (!stop && performance.now() - t0 < ms) {
        hand.classList.remove("give"); void hand.offsetWidth; hand.classList.add("give");
        await sleep(900);
        if (stop) break;
        pile.append(h("span.hp-stack", { style: { "--i": n % 6, "--row": Math.floor(n / 6) } }, "💵"));
        n++; Sound.cash();
        await sleep(350);
    }
    clearInterval(counter);
    amt.textContent = fmt(amount) + " G";
    stop = true;
    await music;
    box.classList.add("out");
    await sleep(400);
    box.remove();
    hold();
}
