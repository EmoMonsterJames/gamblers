// =====================================================================
// Decorative layers for the newer frames (catalog.js NEW_FRAMES · deco).
// Everything is sized relative to the avatar (font-size = avatar size),
// so the same frame works from 40px roster chips to 220px champions.
// Styles live in css/decor.css.
// reveal frames (mosaic / leaves / door) cover the picture until clicked.
// =====================================================================
import { h } from "../core/util.js";

const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const ring = (n, ch, cls) => many(n, i => h("i." + cls, { style: { "--a": `${i * 360 / n}deg`, "--i": i } }, ch));

const BUILD = {
    poop: () => ring(7, "💩", "dp-poop"),
    eyeball: () => [h("i.eye-lid.top"), h("i.eye-lid.bot"), h("i.eye-veins")],
    blood: () => [h("div.dp-clip", many(6, i => h("i.blood-drop", { style: { "--i": i, "--x": `${12 + i * 15}%` } })), h("i.blood-top"))],
    mosaic: () => [h("div.reveal-cover.mosaic", many(36, i => h("i", { style: { "--h": (i * 47) % 360, "--l": 45 + (i * 13) % 30 } }))), h("span.reveal-hint", "👆")],
    leafy: () => [h("div.reveal-cover.leafy", many(9, i => h("i", { style: { "--i": i, "--r": `${(i * 67) % 360}deg` } }, i % 3 ? "🍃" : "🌿"))), h("span.reveal-hint", "👆")],
    door: () => [h("div.reveal-cover.door", h("i.door-l", h("b")), h("i.door-r", h("b"))), h("span.reveal-hint", "👆")],
    antenna: () => [h("i.ant.l"), h("i.ant.r")],
    angel: () => [h("i.halo"), h("i.wing.l", "🪽"), h("i.wing.r", "🪽")],
    devil: () => [h("i.horn.l"), h("i.horn.r"), h("i.tail")],
    shape: () => [h("div.shape-ring", { html: `<svg viewBox="0 0 100 100"><circle class="s1" cx="50" cy="50" r="47"/><polygon class="s2" points="50,1 98,92 2,92"/><rect class="s3" x="3" y="3" width="94" height="94" rx="4"/></svg>` })],
    ghost: () => many(4, i => h("i.dp-ghost", { style: { "--i": i } }, "👻")),
    cloud: () => ring(10, "", "puff"),
    bunny: () => [h("i.ear.bun.l"), h("i.ear.bun.r")],
    bear: () => [h("i.ear.bear.l"), h("i.ear.bear.r")],
    pippi: () => [h("i.braid.l", h("b", "🎀")), h("i.braid.r", h("b", "🎀")), h("i.bangs")],
    cap: () => [h("i.cap", "🧢")],
    // ---- special frames
    slucky: () => [h("div.lucky-orbit", ["L", "U", "C", "K", "Y"].map((c, i) => h("i", { style: { "--i": i } }, c))), ...many(5, i => h("i.lk-spark", { style: { "--i": i } }, "✨"))],
    crazy: () => [h("i.lip.top"), h("i.lip.bot", h("i.tongue", "👅")), h("i.cz-eyes", "👀"), h("i.cz-ear.l", "👂"), h("i.cz-ear.r", "👂")],
    slotm: (src) => [h("div.slot-reels", many(3, c => h("div.sr-col", { style: { "--c": c } },
        h("div.sr-strip", ["7", "K", "Q", "J", "A", "7", "K", "Q", "J", "A"].map(s => h("b", s)), h("b.sr-img", src ? { style: { backgroundImage: `url("${src}")`, backgroundPosition: `${c * 50}% 50%` } } : {}, src ? "" : "🙂"))))),
        h("i.slot-handle", h("b"))],
    rocket: () => [h("i.rk-nose"), h("i.rk-fin.l"), h("i.rk-fin.r"), h("i.rk-fire", "🔥")],
    winners: () => [h("div.win-crown", h("span", "👑"), h("b", "WINNER")), ...many(4, i => h("i.lk-spark", { style: { "--i": i } }, "✨"))],
    cupid: () => [h("div.cupid-heart", h("i.half.l", "❤️"), h("i.half.r", "❤️")), h("i.wing.l", "🪽"), h("i.wing.r", "🪽"), h("i.cupid", "👼"), h("i.cupid-arrow", "💘")],
    ufo: () => [h("i.ufo", "🛸"), h("i.ufo-alien", "👽"), h("i.ufo-beam")],
    mummy: () => [h("div.dp-clip", h("div.bandages", many(5, i => h("i", { style: { "--i": i } }))), h("i.mm-eyes", h("b"), h("b")))]
};

// returns the deco layer for a frame (or null) — src = profile image (Slot frame reels)
export function frameDeco(fr, src = null) {
    const make = fr?.deco && BUILD[fr.deco];
    if (!make) return null;
    const layer = h("div.fr-deco.dk-" + fr.deco, make(src));
    if (fr.reveal) {
        // click the cover to peek at the picture; click again to cover it up
        layer.classList.add("reveal");
        layer.addEventListener("click", e => { e.stopPropagation(); layer.closest(".avatar")?.classList.toggle("revealed"); });
    }
    return layer;
}
