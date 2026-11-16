// =====================================================================
// 🔥 Inferno Casino slots (Survival Land · 패자부활전) — hooks for screens/slot.js
//   ☠️ Suicide Spin (Death Slot): the player's profile carries a red X; the X-marked
//      profile icon (DX) is a reel symbol — 3 of them on one base spin = instant death.
//   🔪 Kill Me Gently: the player's profile sits on the left, a knife on the right.
//      Every knife symbol (KN) on the base reels flies at the profile and the knife moves
//      one step closer; when it is fully stuck in the profile (KNIFE_MAX) → instant death.
//      The knife's position is kept for the whole turn (leaving the machine does not reset it).
// infernoUI(cfg, ctx, { cellsEl }) → { el, sym(key), after(res) → death reason | null }
// =====================================================================
import { h, sleep } from "../core/util.js";
import { Sound, tone, noise } from "../core/sound.js";
import { Store } from "../core/store.js";

export const SUICIDE_N = 3, KNIFE_MAX = 8;
const cellsOf = (grid, sym) => { const out = []; (grid || []).forEach((col, c) => col.forEach((s, r) => { if (s === sym) out.push([c, r]); })); return out; };

export function infernoUI(cfg, ctx, { cellsEl }) {
    const img = Store.player(ctx.pid)?.profile_image || "";
    // knife meter lives on the turn (practice room: on this machine only)
    let local = { knife: 0 };
    const keep = () => { const t = Store.season?.turn; return t && +t.pid === +ctx.pid ? t : local; };
    const xProfile = (cls, x = true) => h("div.inf-prof" + (cls ? "." + cls : ""), h("img", { src: img, alt: "", draggable: "false" }), x ? h("i.inf-x") : null);

    // ---------------------------------------------------- ☠️ Suicide Spin
    if (cfg.inferno === "suicide") {
        const count = h("b.inf-count", "0");
        const el = h("div.inf-bar.suicide", xProfile("big"),
            h("div.inf-txt", h("b", "☠️ SUICIDE SPIN"), h("span", `빨간 X 프로필이 한 번에 ${SUICIDE_N}개 나오면 바로 사망!`), h("small", "이번 스핀의 X 프로필: ", count, ` / ${SUICIDE_N}`)));
        return {
            el,
            sym: key => key === cfg.deathSym ? h("div.sym.sym-xprof", { "data-s": key }, xProfile()) : null,
            async after(res) {
                const cells = cellsOf(res.grid, cfg.deathSym);
                count.textContent = String(cells.length);
                el.classList.toggle("warn", cells.length === SUICIDE_N - 1);
                if (!cells.length) return null;
                for (const [c, r] of cells) cellsEl(c, r)?.classList.add("inf-hit");
                tone(150, 0.3, "sawtooth", 0.05, 0, -60);
                if (cells.length < SUICIDE_N) { await sleep(500); return null; }
                // three of them: the X closes in
                el.classList.add("dead"); Sound.boom(); noise(0.8, 0.2);
                await sleep(1600);
                return `☠️ Suicide Spin — X 프로필 ${cells.length}개`;
            }
        };
    }

    // ---------------------------------------------------- 🔪 Kill Me Gently
    const knife = h("div.inf-knife", "🔪");
    const track = h("div.inf-track", xProfile("target", false), h("div.inf-lane", knife));
    const steps = h("b.inf-count");
    const el = h("div.inf-bar.knife", track, h("div.inf-txt", h("b", "🔪 KILL ME GENTLY"), h("span", "칼 심볼이 나오면 칼이 프로필로 날아가 한 칸씩 다가옵니다. 칼이 프로필에 완전히 박히면 바로 사망!"), h("small", "칼 위치: ", steps, ` / ${KNIFE_MAX}`)));
    const place = () => {
        const k = Math.min(KNIFE_MAX, keep().knife || 0);
        knife.style.left = `${(1 - k / KNIFE_MAX) * 86}%`;
        steps.textContent = String(k);
        el.classList.toggle("warn", k >= KNIFE_MAX - 2);
    };
    place();
    async function fly(from) {
        const a = from?.getBoundingClientRect(), b = knife.getBoundingClientRect();
        if (!a || !b.width) return;
        const f = h("div.inf-fly", "🔪");
        f.style.left = a.left + a.width / 2 + "px"; f.style.top = a.top + a.height / 2 + "px";
        document.body.append(f);
        void f.offsetWidth;
        f.style.transform = `translate(${b.left - a.left - a.width / 2}px, ${b.top - a.top - a.height / 2}px) rotate(-540deg)`;
        tone(900, 0.25, "sawtooth", 0.02, 0, -500);
        await sleep(560);
        f.remove();
    }
    return {
        el,
        sym: () => null,
        async after(res) {
            const cells = cellsOf(res.grid, cfg.deathSym);
            if (!cells.length) return null;
            for (const [c, r] of cells) {
                cellsEl(c, r)?.classList.add("inf-hit");
                await fly(cellsEl(c, r));
                const T = keep();
                T.knife = Math.min(KNIFE_MAX, (T.knife || 0) + 1);
                place();
                Sound.hit();
                Store.saveSeason();
                if (T.knife >= KNIFE_MAX) {
                    el.classList.add("dead"); knife.classList.add("stab");
                    Sound.boom(); noise(0.6, 0.18);
                    await sleep(1700);
                    if (T === local) local.knife = 0;
                    return "🔪 Kill Me Gently — 칼이 프로필에 박혔다";
                }
            }
            return null;
        }
    };
}
