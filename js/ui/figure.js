// ================================================================ 🧍 full-body player figures (VHS covers · films)
//   generated pictures are redrawn head to feet on a clear background with an expression, an arm pose and a held prop
//   (ui/avatarGen.js: full · expr · pose · hold · topless · jiggle)
//   hand-drawn pictures (images/players/*.svg — head and chest only) get the background circle taken off and legs + shoes
//   drawn under them; their face can't change, so a little mood mark (💢 💦 ✨ …) shows the expression instead
import { h } from "../core/util.js";
import { Store } from "../core/store.js";
import { parseGen, buildAvatar, toDataUri, holdProp } from "./avatarGen.js";
import { exprParts } from "./avatarExtra.js";

// expression name → ui/avatarExtra.js EXPRESSIONS index
export const EXPR = {
    happy: 0, smug: 1, sad: 2, angry: 3, shock: 4, wink: 5, love: 6, sleepy: 7, cry: 8, tongue: 9,
    blank: 10, evil: 11, sweat: 12, excited: 13, shy: 14, annoyed: 15, roll: 16, scared: 17, cool: 18, dizzy: 19,
    beast: 20, redeye: 21   // 🎬 films only (늑대인간의 밤)
};
export const EXPR_KO = {
    happy: "😊 웃음", smug: "😏 도도", sad: "😢 슬픔", angry: "😠 화남", shock: "😲 놀람", wink: "😉 윙크", love: "😍 반함", sleepy: "😴 졸림", cry: "😭 통곡", tongue: "😛 메롱",
    blank: "😐 무표정", evil: "😈 음흉", sweat: "😅 당황", excited: "😆 신남", shy: "😳 부끄", annoyed: "😤 못마땅", roll: "🙄 어이없음", scared: "😨 겁먹음", cool: "😎 썩소", dizzy: "😵 어질",
    beast: "🐺 야수 (붉은 눈 · 송곳니)", redeye: "🔴 붉은 눈"
};
export const POSE_KO = { down: "기본", wave: "한 손 들기", both: "두 손 들기", point: "가리키기", hips: "허리에 손", shrug: "으쓱" };
export const HOLD_KO = { gun: "🔫 총", money: "💵 돈뭉치", phone: "📱 휴대폰", sock: "🧦 양말", bag: "💼 돈가방", mic: "🎤 마이크", bikini: "👙 비키니", book: "📚 책", radio: "📻 라디오", rose: "🌹 장미", candle: "🕯️ 촛불", cross: "✝️ 십자가", paper: "📰 신문" };
const MARK = { beast: "🐺", redeye: "🔴", angry: "💢", annoyed: "💢", sweat: "💦", scared: "💦", shock: "❗", love: "💕", sad: "💧", cry: "💧", excited: "✨", happy: "♪", evil: "ㅋ", cool: "✨", dizzy: "💫", sleepy: "💤", shy: "💗", roll: "…", smug: "♪", wink: "♪", tongue: "♪" };
const HOLD_EMOJI = { gun: "🔫", money: "💵", phone: "📱", sock: "🧦", bag: "💼", mic: "🎤", bikini: "👙", book: "📚", radio: "📻", rose: "🌹", candle: "🕯️", cross: "✝️", paper: "📰" };

const cache = new Map();
const imgOf = pid => (pid != null ? Store.player(pid)?.profile_image : "") || "";
const SVGNS = "http://www.w3.org/2000/svg";
const INK = "#2a1a1e";

// ---------------------------------------------------------------- ✏️ hand-drawn pictures: read once, then redraw with any face / arms
//   the picture is laid out in the page (hidden) to measure it: the head (the big skin ellipse in the middle),
//   the small eye / brow / mouth shapes on it, and the shirt (the wide shape at the bottom)
const analysed = new Map();
function analyse(url) {
    if (!analysed.has(url)) analysed.set(url, (async () => {
        const txt = await (await fetch(url)).text();
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;left:-10000px;top:0;width:256px;height:256px;visibility:hidden;pointer-events:none";
        host.innerHTML = txt.replace(/<\?xml[^>]*>/, "");
        document.body.append(host);
        try {
            const svg = host.querySelector("svg");
            svg.setAttribute("width", "256"); svg.setAttribute("height", "256");
            const S = svg.getBoundingClientRect(), k = 256 / (S.width || 256);
            const all = [...svg.querySelectorAll("*")];
            const box = el => { const r = el.getBoundingClientRect(); return { x: (r.left - S.left) * k, y: (r.top - S.top) * k, w: r.width * k, h: r.height * k }; };
            const fillOf = el => { const f = el.closest("[fill]")?.getAttribute("fill"); return f && f !== "none" ? f : null; };
            const shapes = all.filter(el => el.matches("ellipse,circle,path,rect,polygon,polyline,line") && !el.closest("defs,clipPath,mask,pattern"));
            let head = null;
            for (const el of shapes) {
                if (!el.matches("ellipse,circle") || !fillOf(el)) continue;
                const b = box(el), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
                if (b.w < 70 || b.h < 70 || b.w > 215 || b.h > 215 || cx < 92 || cx > 164 || cy < 55 || cy > 150) continue;
                if (!head || b.w * b.h > head.b.w * head.b.h) head = { el, b };
            }
            let torso = null;
            for (const el of shapes) {
                const b = box(el);
                if (b.y + b.h >= 236 && b.y > 150 && b.w >= 110 && b.w < 240 && fillOf(el) && (!torso || b.w > torso.b.w)) torso = { el, b };
            }
            const shirt = torso ? fillOf(torso.el) : null, shirtTop = torso ? torso.b.y : null;
            let H = null;
            if (head) H = { cx: head.b.x + head.b.w / 2, cy: head.b.y + head.b.h / 2, rx: head.b.w / 2, ry: head.b.h / 2, skin: fillOf(head.el) };
            else {
                // no round head (ghosts, shapes, Kalisto…): find the two eyes, and the filled shape they sit on
                const cands = shapes.filter(el => el.matches("ellipse,circle,path") && fillOf(el) && +(el.getAttribute("opacity") ?? el.getAttribute("fill-opacity") ?? 1) >= 1)
                    .map(el => ({ el, b: box(el) })).filter(({ b }) => b.w >= 8 && b.h >= 8 && b.w <= 44 && b.h <= 44 && b.y > 50 && b.y < 170);
                let pair = null;
                for (const a of cands) for (const c of cands) {
                    const ax = a.b.x + a.b.w / 2, cx2 = c.b.x + c.b.w / 2, mid = (ax + cx2) / 2;
                    if (ax >= cx2 || cx2 - ax < 26 || cx2 - ax > 90 || Math.abs(mid - 128) > 28) continue;
                    if (Math.abs(a.b.y - c.b.y) > 4 || Math.abs(a.b.w - c.b.w) > 3 || Math.abs(a.b.h - c.b.h) > 3) continue;
                    if (!pair || a.b.w * a.b.h > pair[0].b.w * pair[0].b.h) pair = [a, c];
                }
                if (!pair) return { txt, ok: false, shirt, shirtTop };
                const [L, R] = pair, ex = (L.b.x + L.b.w / 2 + R.b.x + R.b.w / 2) / 2, ey = L.b.y + L.b.h / 2;
                const sp = (R.b.x - L.b.x) / 2, rx = sp * 38 / (15 * 0.88), sc = rx / 38 * 0.88;
                const first = Math.min(all.indexOf(L.el), all.indexOf(R.el));
                const under = shapes.filter(el => all.indexOf(el) < first && fillOf(el) && !el.matches("line,polyline")).map(el => ({ el, b: box(el) }))
                    .filter(({ b }) => b.w > sp * 2.6 && b.w < 240 && b.x < ex - sp && b.x + b.w > ex + sp && b.y < ey && b.y + b.h > ey + sp);
                const skinEl = under.pop();
                if (!skinEl) return { txt, ok: false, shirt, shirtTop };
                head = skinEl;
                H = { cx: ex, cy: ey + 2 * sc, rx, ry: rx, skin: fillOf(skinEl.el) };
                H.cy -= 0.03 * H.ry;
            }
            const feats = [];
            for (const el of shapes) {
                if (!(head.el.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) || el.contains(head.el)) continue;
                if (+(el.getAttribute("opacity") ?? el.getAttribute("fill-opacity") ?? 1) < 1) continue; // blush stays
                const b = box(el), dx = Math.abs(b.x + b.w / 2 - H.cx), dy = b.y + b.h / 2 - H.cy;
                const pair = dx < H.rx * 0.15 && b.w <= H.rx * 1.9 && b.h <= H.ry * 0.42; // both eyes / brows drawn as one path
                if (dx < H.rx * 0.62 && dy > -H.ry * 0.5 && dy < H.ry * 0.75 && (pair || b.w <= H.rx * 0.95) && b.h <= H.ry * 0.72) feats.push(all.indexOf(el));
            }
            return { txt, ok: feats.length >= 2, H, feats, headIdx: all.indexOf(head.el), tags: all.map(e => e.tagName.toLowerCase()), shirt, shirtTop };
        } finally { host.remove(); }
    })());
    return analysed.get(url);
}
// the new face, drawn in the generator's face frame (eyes at x ±15, mouth y 17) and fitted onto the head
function faceSvg(A, expr, female) {
    const xp = exprParts(EXPR[expr], { ink: INK, dark: false, skin: A.H.skin, my: 17, female, eyeXs: [-15, 15] });
    const eye = x => `<ellipse cx="${x}" cy="-2" rx="5.2" ry="6" fill="#1a1a22"/><circle cx="${x + 1.8}" cy="-4.2" r="1.9" fill="#fff"/>`;
    let s = "";
    for (const sg of [-1, 1]) { const x = 15 * sg; s += (xp.eyes ? xp.eyes(x, sg) : eye(x) + (xp.lid ? xp.lid(x, sg) : "")) + (xp.brows ? xp.brows(x, sg) : ""); }
    s += (xp.mouth || "") + (xp.extra || "");
    const k = (A.H.rx / 38) * 0.88;
    return `<g transform="translate(${A.H.cx.toFixed(1)} ${(A.H.cy + A.H.ry * 0.03).toFixed(1)}) scale(${k.toFixed(3)})">${s}</g>`;
}
// arms out of the shoulders (in the full-figure frame) · [shoulder → hand] for left / right
const DRAWN_ARMS = { down: [[74, 198], [182, 198]], wave: [[74, 198], [198, 102]], both: [[58, 102], [198, 102]], point: [[74, 198], [214, 140]], hips: [[100, 180], [156, 180]], shrug: [[58, 126], [198, 126]] };
function armsSvg(shirt, skin, pose, hold) {
    const [hl, hr] = DRAWN_ARMS[pose] || DRAWN_ARMS.down, L0 = [86, 146], R0 = [170, 146];
    const arm = (a, b, s) => { const c = [(a[0] + b[0]) / 2 + s * 12, (a[1] + b[1]) / 2 + 4], d = `M${a[0]} ${a[1]}Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`; return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${shirt}" stroke-width="9" stroke-linecap="round"/>`; };
    const hand = p => `<circle cx="${p[0]}" cy="${p[1]}" r="6.8" fill="${skin}" stroke="${INK}" stroke-width="3"/>`;
    return arm(L0, hl, -1) + arm(R0, hr, 1) + hand(hl) + hand(hr) + holdProp(hold, hr);
}
// hand-drawn picture → clear background · new face (o.expr) · arms (o.pose, o.hold) · legs and shoes
async function drawnFull(url, o, female) {
    const A = await analyse(url);
    const doc = new DOMParser().parseFromString(A.txt, "image/svg+xml");
    const root = doc.documentElement;
    if (A.ok && o.expr in EXPR) {
        const all = [...root.querySelectorAll("*")];
        if (A.tags.length === all.length && A.tags.every((t, i) => t === all[i].tagName.toLowerCase())) {
            const frag = new DOMParser().parseFromString(`<svg xmlns="${SVGNS}">${faceSvg(A, o.expr, female)}</svg>`, "image/svg+xml").documentElement.firstChild;
            const ref = all[A.feats[0]];
            ref.parentNode.insertBefore(doc.importNode(frag, true), ref);
            A.feats.forEach(i => all[i].remove());
        }
    }
    let body = [...root.childNodes].map(n => new XMLSerializer().serializeToString(n)).join("");
    body = body.replace(/<circle[^>]*cx="128"[^>]*cy="128"[^>]*r="12\d(?:\.\d+)?"[^>]*\/>/g, "").replace(/\sclip-path="url\(#cc\)"/g, "");
    const O = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
    const legs = `<path d="M100 166H156L158 186H98Z" fill="#374151" ${O}/>` +
        `<path d="M101 184L103 232H123L127 190Z" fill="#374151" ${O}/><path d="M155 184L153 232H133L129 190Z" fill="#374151" ${O}/>` +
        `<ellipse cx="110" cy="236" rx="15" ry="7.5" fill="#1f2937" ${O}/><ellipse cx="146" cy="236" rx="15" ry="7.5" fill="#1f2937" ${O}/>`;
    const skin = /^#[0-9a-f]{3,8}$/i.test(A.H?.skin || "") ? A.H.skin : "#f6d2a8";
    // a picture already drawn head to feet ("full body" in its comment: 글로리아배추 · 아기수박 · 흑땅콩): shown whole, no extra legs
    if (/full body/i.test(A.txt)) return toDataUri(`<svg xmlns="${SVGNS}" viewBox="0 0 256 256" width="256" height="256">${body}</svg>`);
    const wear = o.nude ? "nude" : o.outfit === "clothes" ? "" : o.outfit || "";            // nude · bikini · dress ("clothes" = as drawn)
    const bare = wear === "nude" || wear === "bikini";
    if (A.shirt && wear) return wardrobe(A, o, female, body, skin, wear, bare, O);
    const arms = A.shirt ? armsSvg(A.shirt, skin, o.pose, o.hold) : "";
    if (!A.shirt) return toDataUri(`<svg xmlns="${SVGNS}" viewBox="0 0 256 256" width="256" height="256">${legs}<svg x="44" y="0" width="168" height="168" viewBox="0 0 256 256" overflow="hidden">${body}</svg>${arms}</svg>`);
    // the shirt is trimmed to a body that narrows from the shoulders to the hips, so it runs straight into the trousers
    const top = A.shirtTop != null ? Math.max(104, Math.min(128, A.shirtTop * 168 / 256 + 4)) : 122;
    const torso = `M84 ${top}Q128 ${top - 8} 172 ${top}Q182 ${top + 4} 180 ${top + 18}L160 170H96L76 ${top + 18}Q74 ${top + 4} 84 ${top}Z`;
    const edge = `M84 ${top}Q74 ${top + 4} 76 ${top + 18}L96 170H160L180 ${top + 18}Q182 ${top + 4} 172 ${top}`;
    const cid = "fc" + Math.random().toString(36).slice(2, 8);
    return toDataUri(`<svg xmlns="${SVGNS}" viewBox="0 0 256 256" width="256" height="256"><defs><clipPath id="${cid}"><rect x="0" y="0" width="256" height="${top}"/><path d="${torso}"/></clipPath></defs>` +
        `${legs}<path d="${torso}" fill="${A.shirt}"/>` +
        `<g clip-path="url(#${cid})"><svg x="44" y="0" width="168" height="168" viewBox="0 0 256 256" overflow="hidden">${body}</svg></g>` +
        `<path d="${edge}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${arms}</svg>`);
}
// 🎬 films only: the hand-drawn body bare-chested (nude) · in a bikini · in a long gown (dress)
//   the shirt is cut away (only the head part of the picture stays) and the body is drawn: bare skin with a chest,
//   a bikini (hot pink with yellow dots + bikini bottoms over bare legs) or a gown down to the floor
const BIKINI = "#ec4899", DOT = "#fde047", GOWN = "#be123c";
function wardrobe(A, o, female, body, skin, wear, bare, O) {
    const top = A.shirtTop != null ? Math.max(104, Math.min(128, A.shirtTop * 168 / 256 + 4)) : 122;
    const torso = `M84 ${top}Q128 ${top - 8} 172 ${top}Q182 ${top + 4} 180 ${top + 18}L160 170H96L76 ${top + 18}Q74 ${top + 4} 84 ${top}Z`;
    const cid = "fc" + Math.random().toString(36).slice(2, 8);
    const sd = shadeHex(skin, -0.32), y = top + 12;
    // the chest (a woman's bounces while she dances)
    const bounce = o.jiggle ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 3;0 -1;0 0" dur=".42s" repeatCount="indefinite"/>` : "";
    const chest = female
        ? `<g>${[-1, 1].map(k => `<path d="M${128 + k * 3} ${y}Q${128 + k * 5} ${y + 20} ${128 + k * 17} ${y + 21}Q${128 + k * 32} ${y + 21} ${128 + k * 32} ${y + 3}" fill="${skin}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` + (wear === "nude" ? `<circle cx="${128 + k * 18}" cy="${y + 11}" r="3" fill="${sd}"/>` : "")).join("")}${bounce}</g>`
        : [-1, 1].map(k => `<path d="M${128 + k * 4} ${y + 14}Q${128 + k * 18} ${y + 20} ${128 + k * 30} ${y + 10}" fill="none" stroke="${sd}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${128 + k * 19}" cy="${y + 9}" r="2.6" fill="${sd}"/>`).join("") +
          `<path d="M128 ${y + 30}v14" stroke="${sd}" stroke-width="2" stroke-linecap="round"/>`;
    const navel = `<path d="M127 ${top + 40}q1 3 2 0" fill="none" stroke="${sd}" stroke-width="2" stroke-linecap="round"/>`;
    // the bikini top: two cups on strings, the gown: the body coloured with a sweetheart neckline
    const dots = (cx, cy) => `<circle cx="${cx - 4}" cy="${cy - 2}" r="1.8" fill="${DOT}"/><circle cx="${cx + 4}" cy="${cy + 3}" r="1.8" fill="${DOT}"/>`;
    const bikiniTop = `<path d="M84 ${top + 2}L${128 - 18} ${y + 2}M172 ${top + 2}L${128 + 18} ${y + 2}M${128 - 34} ${y + 16}H${128 + 34}" stroke="${INK}" stroke-width="2.4" fill="none"/>` +
        [-1, 1].map(k => `<path d="M${128 + k * 4} ${y + 18}Q${128 + k * 6} ${y + 2} ${128 + k * 18} ${y + 1}Q${128 + k * 30} ${y + 4} ${128 + k * 31} ${y + 17}Q${128 + k * 17} ${y + 24} ${128 + k * 4} ${y + 18}Z" fill="${BIKINI}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` + dots(128 + k * 17, y + 12)).join("");
    let legs;
    if (wear === "dress") {
        legs = `<path d="M96 160H160L192 236Q128 248 64 236Z" fill="${GOWN}" ${O}/><path d="M112 170L100 236M144 170L156 236" stroke="#0003" stroke-width="3" fill="none"/>`;
    } else {
        const lc = bare && wear === "bikini" ? skin : "#374151";
        legs = `<path d="M100 166H156L158 186H98Z" fill="${lc}" ${O}/>` +
            `<path d="M101 184L103 232H123L127 190Z" fill="${lc}" ${O}/><path d="M155 184L153 232H133L129 190Z" fill="${lc}" ${O}/>` +
            `<ellipse cx="110" cy="236" rx="15" ry="7.5" fill="#1f2937" ${O}/><ellipse cx="146" cy="236" rx="15" ry="7.5" fill="#1f2937" ${O}/>` +
            (wear === "bikini" ? `<path d="M99 168H157L150 184Q128 196 106 184Z" fill="${BIKINI}" ${O}/>${dots(122, 176)}${dots(138, 178)}` : "");
    }
    const bodyFill = wear === "dress" ? GOWN : skin;
    const neck = wear === "dress" ? `<path d="M90 ${top + 10}Q108 ${top + 2} 128 ${top + 14}Q148 ${top + 2} 166 ${top + 10}V${top - 2}H90Z" fill="${skin}"/>` : "";
    const sleeve = bare || wear === "dress" ? skin : A.shirt;
    return toDataUri(`<svg xmlns="${SVGNS}" viewBox="0 0 256 256" width="256" height="256"><defs><clipPath id="${cid}"><rect x="0" y="0" width="256" height="${top - 2}"/></clipPath></defs>` +
        `${legs}<path d="${torso}" fill="${bodyFill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${neck}` +
        `<g clip-path="url(#${cid})"><svg x="44" y="0" width="168" height="168" viewBox="0 0 256 256" overflow="hidden">${body}</svg></g>` +
        (bare ? chest + navel : "") + (wear === "bikini" ? bikiniTop : "") +
        armsSvg(sleeve, skin, o.pose, o.hold) + `</svg>`);
}
function shadeHex(hex, k) {
    let s = hex.slice(1); if (s.length === 3) s = [...s].map(c => c + c).join("");
    const n = parseInt(s.slice(0, 6), 16), f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, "0")).join("");
}
// does the redrawer understand this hand-drawn picture? (face → no mood mark needed · shirt → arms drawn, no prop emoji)
const drawnInfo = url => analyse(url).then(A => ({ face: A.ok, arms: !!A.shirt })).catch(() => ({ face: false, arms: false }));
// → a data URI (or a Promise of one, for a hand-drawn picture)
function figSrc(pid, o) {
    const src = imgOf(pid);
    if (!src) return "";
    const g = parseGen(src);
    const key = `${pid}|${[o.expr, o.pose, o.hold, o.nude ? 1 : 0, o.jiggle ? 1 : 0, o.outfit || "", o.swim ?? ""].join(",")}`;
    if (cache.has(key)) return cache.get(key);
    let out;
    if (g) {
        // 👙 outfit "bikini" on a generated picture: its own swimwear (o.swim: which one · else the picture's own when it already wears one, else the first)
        //    outfit "clothes": a picture drawn in swimwear gets dressed (summer clothes) — before the strip show
        const sw = o.outfit === "bikini" && !o.nude ? { season: "swim", outfit: o.swim ?? (g.season === "swim" ? g.outfit : 0) }
            : o.outfit === "clothes" && g.season === "swim" ? { season: "summer", outfit: 0 } : {};
        out = toDataUri(buildAvatar({ ...g, ...sw, full: true, expr: o.expr in EXPR ? EXPR[o.expr] : g.expr, pose: o.pose || "down", hold: o.hold || "", topless: !!o.nude, jiggle: !!o.jiggle }));
    } else if (/\.svg(\?|$)/i.test(src) && !src.startsWith("data:")) {
        const female = String(Store.player(pid)?.gender || "").toLowerCase() === "female";
        out = drawnFull(src, o, female).then(u => { cache.set(key, u); return u; }).catch(e => { console.warn(e); cache.set(key, src); return src; });
    } else out = src;
    cache.set(key, out);
    return out;
}
export const isGenerated = pid => !!parseGen(imgOf(pid));

// c: a cast member ({ pid, ko, nude }) · o: { expr, pose, hold, nude, jiggle, act, size, upper, name }
export function figure(c, o = {}) {
    const size = o.size || 120;
    const img = h("img", { alt: c?.ko || "", draggable: "false" });
    const el = h("div.vfig", { style: { "--fs": size + "px" } }, h("div.vfig-in", img), o.name ? h("small.vfig-name", o.name) : null);
    setFigure(el, c, o);
    return el;
}
// change the expression / pose of a figure already on screen (the film)
export function setFigure(el, c, o = {}) {
    const img = el.querySelector("img");
    const gen = isGenerated(c?.pid);
    const s = c?.pid != null ? figSrc(c.pid, o) : "";
    if (!s) { img.replaceWith(h("span.vfig-none", "👤")); return; }
    if (typeof s === "string") img.src = s; else s.then(u => { img.src = u; });
    if (!gen) {
        el.querySelector(".vfig-mark")?.remove();
        el.querySelector(".vfig-hold")?.remove();
        // only when the redrawer couldn't read the picture: a mood mark for the face, an emoji for the held thing
        const url = imgOf(c.pid);
        const info = /\.svg(\?|$)/i.test(url) && !url.startsWith("data:") ? drawnInfo(url) : Promise.resolve({ face: false, arms: false });
        info.then(({ face, arms }) => {
            if (!face && o.expr && MARK[o.expr]) el.append(h("i.vfig-mark", MARK[o.expr]));
            if (!arms && o.hold && HOLD_EMOJI[o.hold]) el.append(h("i.vfig-hold.h-" + o.hold, HOLD_EMOJI[o.hold]));
        });
    }
    el.className = "vfig" + (o.upper ? " upper" : "") + (o.act ? " act-" + o.act : "") + (o.wolf ? " wolf wolf-" + o.wolf : "");
    // 🔲 covers: a mosaic over a bare chest
    el.querySelector(".vfig-mosaic")?.remove();
    if (o.mosaic && (o.nude || o.outfit === "nude")) el.append(h("i.vfig-mosaic"));
    // 🐺 werewolf (films): "half" — wolf ears, fur, claws over the player · "full" — a wolf stands where the player was
    el.querySelector(".vfig-wolf")?.remove();
    if (o.wolf) { const w = h("i.vfig-wolf"); w.innerHTML = o.wolf === "full" ? WOLF_FULL : wolfHalf(o.wolf, o.pose); el.querySelector(".vfig-in").append(w); }
    // 👶 swaddled (films): a baby wrapped in a blanket, only the face peeping out (a generated picture: the face sits at about 128,114)
    el.querySelector(".vfig-swaddle")?.remove();
    if (o.swaddle) { const w = h("i.vfig-wolf.vfig-swaddle"); w.innerHTML = SWADDLE; el.querySelector(".vfig-in").append(w); }
}
// 🐺 overlays in the figure's 256×256 frame · "half": ears + fur + claws · "claws": only long claws growing out of the hands
function wolfHalf(kind, pose) {
    const hands = DRAWN_ARMS[pose] || DRAWN_ARMS.down;
    const claws = hands.map(([x, y], i) => { const k = i ? 1 : -1; return [0, 1, 2].map(j => `<path d="M${x + (j - 1) * 5} ${y + 4}Q${x + (j - 1) * 7 + k * 3} ${y + 16} ${x + (j - 1) * 9 + k * 6} ${y + 24}L${x + (j - 1) * 5 + 2} ${y + 6}Z"/>`).join(""); }).join("");
    const ears = kind === "claws" ? "" : `<g fill="#4a2c17" stroke="#1c0f06" stroke-width="4" stroke-linejoin="round"><path d="M72 46L66 -4L104 26Z"/><path d="M184 46L190 -4L152 26Z"/></g><path d="M76 34L72 8L94 26ZM180 34L184 8L162 26Z" fill="#f9a8d4" opacity=".7"/>` +
        `<g fill="#4a2c17" opacity=".9">${[-1, 1].map(k => `<path d="M${128 + k * 46} 150l${k * 14} -6l${-k * 4} 12l${k * 12} -2l${-k * 6} 12l${k * 10} 0l${-k * 10} 10Z"/>`).join("")}</g>`;
    return `<svg viewBox="0 0 256 256" xmlns="${SVGNS}">${ears}<g fill="#f5f5f4" stroke="#1c0f06" stroke-width="1.6" stroke-linejoin="round">${claws}</g></svg>`;
}
const SWADDLE = `<svg viewBox="0 0 256 256" xmlns="${SVGNS}">` +
    `<path fill-rule="evenodd" d="M128 64C172 64 190 100 184 142L190 238Q128 258 66 238L72 142C66 100 84 64 128 64ZM128 88C110 88 101 102 101 116C101 132 112 143 128 143C144 143 155 132 155 116C155 102 146 88 128 88Z" fill="#bfdbfe" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M101 116C96 96 112 84 128 84C144 84 160 96 155 116" fill="none" stroke="#93c5fd" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M74 168Q128 150 184 176M72 204Q128 182 188 210" fill="none" stroke="#93c5fd" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M150 160Q170 170 186 196" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
    `<g fill="#fff" opacity=".85"><circle cx="96" cy="190" r="3"/><circle cx="120" cy="222" r="3"/><circle cx="160" cy="226" r="3"/><circle cx="150" cy="186" r="3"/><circle cx="104" cy="160" r="3"/></g></svg>`;
const WOLF_FULL = `<svg viewBox="0 0 256 256" xmlns="${SVGNS}"><g stroke="#0b0603" stroke-width="4" stroke-linejoin="round">` +
    `<path d="M92 250L98 186Q70 168 76 124Q84 92 104 82L96 40L118 70Q128 64 140 70L160 38L156 82Q180 94 182 130Q186 170 158 186L164 250H140L134 198H122L116 250Z" fill="#3b2414"/>` +
    `<path d="M104 82Q128 124 154 82Q150 112 128 118Q106 112 104 82Z" fill="#6b4226"/>` +
    `<path d="M112 100Q128 92 144 100L140 120Q128 128 116 120Z" fill="#6b4226"/>` +
    `<path d="M76 130Q56 160 62 196L72 192Q70 166 86 146ZM180 130Q200 160 194 196L184 192Q186 166 170 146Z" fill="#3b2414"/></g>` +
    `<path d="M60 196l-4 12M66 198l0 12M72 196l4 11M196 196l4 12M190 198l0 12M184 196l-4 11" stroke="#f5f5f4" stroke-width="3" stroke-linecap="round"/>` +
    `<ellipse cx="116" cy="92" rx="6" ry="4" fill="#ef4444"/><ellipse cx="140" cy="92" rx="6" ry="4" fill="#ef4444"/><circle cx="116" cy="92" r="1.8" fill="#111"/><circle cx="140" cy="92" r="1.8" fill="#111"/>` +
    `<path d="M120 122l3 8l3 -7M130 122l3 8l3 -7" fill="#fff" stroke="#111" stroke-width="1"/><ellipse cx="128" cy="112" rx="6" ry="4" fill="#111"/></svg>`;
