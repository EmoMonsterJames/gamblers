// 3-reel "profile slot machine" used to pick season players and to pick
// who gets eliminated. All three reels land on the same face.
import { h, sleep, pick, shuffle } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { Store } from "../core/store.js";

const preloaded = new Set();
export function reelMachine({ size = 120, label = "SPIN" } = {}) {
    const reels = [0, 1, 2].map(() => h("div.rp-reel", h("div.rp-strip")));
    const lights = h("div.rp-lights", Array.from({ length: 18 }, (_, i) => h("i", { style: { "--i": i } })));
    const el = h("div.rp-machine", { style: { "--cell": size + "px" } },
        lights,
        h("div.rp-title", label),
        h("div.rp-window", reels, h("div.rp-line")),
        h("div.rp-glass"));
    const face = x => { const p = typeof x === "object" && x ? x : Store.player(x); return h("div.rp-cell", h("img", { src: p?.profile_image || "", alt: "", draggable: "false" })); };

    function fill(strip, ids) { strip.replaceChildren(...ids.map(face)); }
    function idle(pool) {
        for (const x of pool) { const p = typeof x === "object" ? x : Store.player(x); if (p?.profile_image && !preloaded.has(p.profile_image)) { preloaded.add(p.profile_image); new Image().src = p.profile_image; } }
        reels.forEach(r => { const s = r.firstChild; s.getAnimations().forEach(a => a.cancel()); fill(s, shuffle(pool).slice(0, 3)); s.style.transform = "translateY(0)"; });
    }

    async function spin(target, pool, { tense = true } = {}) {
        el.classList.remove("win"); el.classList.add("spinning");
        const N = 26;
        const durs = [1700, 2500, tense ? 4600 : 3200];
        let stopTicks = false;
        (async () => { let gap = 45; while (!stopTicks) { Sound.tick(); await sleep(gap); gap = Math.min(gap * 1.035, 260); } })();
        const anims = reels.map((r, i) => {
            const strip = r.firstChild;
            const ids = [];
            for (let k = 0; k < N + i * 8; k++) ids.push(pick(pool).id ?? pick(pool));
            // near-miss for the last reel: the target's neighbours are decoys
            ids.push(target, pick(pool).id ?? pick(pool));
            ids.unshift(pick(pool).id ?? pick(pool));
            fill(strip, ids);
            const endY = -((ids.length - 3) * size);
            strip.style.transform = "translateY(0)";
            const ease = i === 2 && tense ? "cubic-bezier(.05,.75,.08,1)" : "cubic-bezier(.15,.7,.2,1)";
            return strip.animate([{ transform: "translateY(0)" }, { transform: `translateY(${endY}px)` }], { duration: durs[i], easing: ease, fill: "forwards" });
        });
        await anims[0].finished; Sound.stop(); reels[0].classList.add("stopped");
        await anims[1].finished; Sound.stop(); reels[1].classList.add("stopped");
        if (tense) { el.classList.add("tense"); Sound.heartbeat(); const hb = setInterval(() => Sound.heartbeat(), 700); await anims[2].finished; clearInterval(hb); }
        else await anims[2].finished;
        stopTicks = true;
        Sound.stop();
        reels.forEach(r => r.classList.remove("stopped"));
        el.classList.remove("spinning", "tense");
        el.classList.add("win");
        Sound.win();
        await sleep(500);
    }
    function show(target) {
        reels.forEach(r => { const s = r.firstChild; s.getAnimations().forEach(a => a.cancel()); fill(s, [target, target, target]); s.style.transform = "translateY(0)"; });
        // centre row shows the target
        el.classList.add("win");
    }
    return { el, spin, idle, show };
}
