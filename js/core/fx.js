// Visual effects: particle layers (pet effects, profile effects), toasts,
// modals, confetti and big-win overlays.
import { h, sleep, fmt, countUp } from "./util.js";
import { Sound } from "./sound.js";

// ---------------------------------------------------------- particle layer
// def: { chars:[], mode, n, size, cls, trail }
export function particles(def, scale = 1) {
    const layer = h("div.fx-layer.fx-" + def.mode + (def.cls ? "." + def.cls : ""));
    if (def.mode === "aurora") { layer.append(h("div.fx-aurora")); return layer; }
    if (def.mode === "rainbow") { layer.append(h("div.fx-rainbow-arc"), h("span.fx-rb-cloud.l", "☁️"), h("span.fx-rb-cloud.r", "☁️")); return layer; }
    if (def.mode === "flood") layer.append(h("div.fx-water"));
    if (def.mode === "thunder") layer.append(h("div.fx-flash"), h("span.fx-cloud", "🌩️"));
    if (def.mode === "tnt") layer.append(h("span.fx-dyn", "🧨", h("i.fx-fuse", "✨")), h("span.fx-boom", "💥"));
    if (def.mode === "koipond") layer.append(h("div.fx-pond"));
    if (def.mode === "monggi") {
        // colourful rabbit / circle blobs with eyes and the '( - )' wrinkle
        for (let i = 0; i < (def.n || 6); i++) layer.append(h("span.fx-mg" + (i % 2 ? ".bun" : ".ball"), { style: { "--i": i, "--hue": (i * 57) % 360, "--x": `${4 + (i * 17) % 80}%`, "--y": `${6 + (i * 29) % 72}%`, "--d": `${(i * 0.7).toFixed(1)}s`, fontSize: `${(def.size || 9) * scale}px` } }, h("b.mg-face", def.chars[0])));
        return layer;
    }
    const n = def.n || 6;
    for (let i = 0; i < n; i++) {
        const ch = def.chars[i % def.chars.length];
        const s = h("span.fx-p", ch);
        const dur = { orbit: 6, swoop: 4, flyby: 5, halo: 3, wave: 1.6, twinkle: 2.2, jump: 1.4, fountain: 1.8, firework: 2.4, rain: 2.6, rise: 3, float: 4, flood: 3, buzz: 2.2, hands: 2.4, thunder: 2.8, tnt: 3.2, koipond: 2, chicks: 3.6 }[def.mode] || 3;
        s.style.cssText = `--i:${i};--n:${n};--x:${Math.random() * 100}%;--y:${Math.random() * 100}%;` +
            `--d:${(def.mode === "orbit" || def.mode === "wave" ? (i / n) * dur : Math.random() * dur).toFixed(2)}s;` +
            `--t:${(dur * (0.8 + Math.random() * 0.4)).toFixed(2)}s;--a:${Math.round(i * 360 / n)}deg;` +
            `--dx:${Math.round(Math.random() * 120 - 60)}px;font-size:${(def.size || 14) * scale}px`;
        if (def.trail) s.dataset.trail = def.trail;
        layer.append(s);
    }
    return layer;
}

// ---------------------------------------------------------- toasts
export function toast(msg, kind = "info", ms = 2600) {
    let box = document.getElementById("toasts");
    if (!box) { box = h("div#toasts"); document.body.append(box); }
    const t = h("div.toast." + kind, msg);
    box.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, ms);
}

// ---------------------------------------------------------- modal
export function modal(content, { title = "", wide = false, closable = true, cls = "" } = {}) {
    const close = () => { back.classList.add("out"); setTimeout(() => back.remove(), 200); back.dispatchEvent(new Event("closed")); };
    const box = h("div.modal" + (wide ? ".wide" : "") + (cls ? "." + cls : ""),
        title ? h("div.modal-title", title, closable ? h("button.x", { onclick: close, "aria-label": "닫기" }, "✕") : null) : null,
        h("div.modal-body", content));
    const back = h("div.modal-back", { onclick: e => { if (e.target === back && closable) close(); } }, box);
    document.body.append(back);
    return { el: back, box, close, closed: new Promise(r => back.addEventListener("closed", r, { once: true })) };
}
export function confirmBox(msg, ok = "확인", cancel = "취소") {
    return new Promise(res => {
        const m = modal(h("div.confirm", h("p", msg), h("div.row.end",
            h("button.btn.ghost", { onclick: () => { m.close(); res(false); } }, cancel),
            h("button.btn.gold", { onclick: () => { m.close(); res(true); } }, ok))), { title: "확인" });
        m.closed.then(() => res(false));
    });
}

// ---------------------------------------------------------- confetti / coins
export function confetti(n = 80, chars = null) {
    const layer = h("div.confetti");
    for (let i = 0; i < n; i++) {
        const p = h("i", chars ? chars[i % chars.length] : "");
        if (!chars) p.style.background = `hsl(${Math.random() * 360},90%,60%)`;
        p.style.cssText += `;left:${Math.random() * 100}%;--d:${Math.random() * 1.2}s;--t:${2 + Math.random() * 2}s;--dx:${Math.random() * 200 - 100}px;--r:${Math.random() * 720}deg`;
        if (chars) p.classList.add("emoji");
        layer.append(p);
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 5000);
}

// ---------------------------------------------------------- big win overlay
export async function bigWin(amount, bet, { title = null, jackpot = null } = {}) {
    const x = amount / Math.max(1, bet);
    const label = jackpot ? `${jackpot} JACKPOT` : title || (x >= 50 ? "EPIC WIN" : x >= 20 ? "MEGA WIN" : "BIG WIN");
    const num = h("div.bw-num", "0");
    const ov = h("div.bigwin" + (jackpot ? ".bwjp.bwjp-" + jackpot.toLowerCase() : ""), h("div.bw-rays"), h("div.bw-title", label), num, h("div.bw-tap", "탭하여 닫기"));
    document.body.append(ov);
    jackpot ? Sound.jackpot() : Sound.bigWin();
    confetti(jackpot ? 140 : 70, ["🪙", "💰", "💵", "✨"]);
    let done = false;
    const finish = () => { if (done) return; done = true; ov.classList.add("out"); setTimeout(() => ov.remove(), 400); };
    ov.addEventListener("click", finish);
    await countUp(num, 0, amount, Math.min(4500, 1200 + x * 40));
    await Promise.race([sleep(1800), new Promise(r => ov.addEventListener("click", r, { once: true }))]);
    finish();
    await sleep(350);
}

// Banner across the screen (bonus intros etc.)
export async function banner(text, ms = 1600, cls = "") {
    const b = h("div.banner" + (cls ? "." + cls : ""), h("span", text));
    document.body.append(b);
    await sleep(ms);
    b.classList.add("out");
    await sleep(350);
    b.remove();
}

export function floatText(el, text, cls = "") {
    const r = el.getBoundingClientRect();
    const f = h("div.float-text" + (cls ? "." + cls : ""), text);
    f.style.left = r.left + r.width / 2 + "px"; f.style.top = r.top + r.height / 3 + "px";
    document.body.append(f);
    setTimeout(() => f.remove(), 1600);
}

export function shake(el, cls = "shake") { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800); }
export { fmt };
