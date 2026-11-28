// ================================================================ 📼 VHS covers — 뒷표지 | 중간표지 (spine) | 앞표지
//   every 영화사 (brand) has its own look (theme class .vt-<brand>) and its own spine rules (data/vhs.js BRAND_STYLE):
//   which title is big, whether the 띠 band / a small still is shown. Front / back layouts: the movie's own cover order,
//   otherwise the brand's default. Players are drawn full-body (ui/figure.js) · covers are still pictures (no animation).
import { h } from "../core/util.js";
import * as D from "../data/vhs.js";
import { figure } from "../ui/figure.js";

const brandOf = m => D.BRAND_BY_ID[m.brand] || D.BRANDS[0];
const rateOf = m => D.RATING_BY_ID[m.rating] || D.RATINGS[0];
const leads = m => m.cast.filter(c => c.part === "lead");
const sups = m => m.cast.filter(c => c.part === "support");
const extras = m => m.cast.filter(c => c.part === "extra");
const castLine = (list, short = false) => list.map(c => short ? c.ko : `${c.ko} (${c.role})`).join(", ");
const norm = s => typeof s === "string" ? { r: s } : (s || {});
const spec = (c, o = {}) => ({ r: c.short || c.role, expr: "happy", ...o });

// ---------------------------------------------------------------- 🏷️ brand logo (뽀리: a star-tipped magic wand beside it)
const WAND = `<svg viewBox="0 0 24 40" xmlns="http://www.w3.org/2000/svg"><path d="M12 14L10 39" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/><path d="M12 1l3.2 6.6 7.2 1-5.2 5 1.3 7.2L12 17.4 5.5 20.8l1.3-7.2-5.2-5 7.2-1Z" fill="#fde047" stroke="#b45309" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
export function brandLogo(b, size = 34) {
    const logo = h("div.vb-logo.sh-" + (b.shape || "square"), { style: { "--bc": b.color, "--bi": b.ink, width: size + "px", height: size + "px", fontSize: Math.max(8, size / (b.logo.length > 3 ? 3.4 : 2.4)) + "px" }, title: b.name }, h("span", b.logo));
    if (b.id !== "ppori") return logo;
    const wand = h("i.vb-wand", { style: { width: size * 0.42 + "px", height: size + "px" } });
    wand.innerHTML = WAND;
    return h("div.vb-logo-wrap", logo, wand);
}
const ratingBand = m => { const r = rateOf(m); return h("div.vc-band", { style: { background: r.color, color: r.ink } }, `${r.name} · ${r.age === 0 ? "모든 연령 관람가" : D.AGE_ORDER[r.age] + " 이상 관람가"}`); };

// ---------------------------------------------------------------- 🎞️ a still: a scene with full-body players
//   s: { bg, props, cap, who: [{ r, expr, pose, hold }] } · o: { hgt (px), cap: show the caption }
export function still(m, s, { hgt = 60, cap = false, cls = "", narrow = false } = {}) {
    const who = (s?.who || []).map(norm).map(w => ({ w, c: D.castOf(m, w.r) })).filter(x => x.c).slice(0, 4);
    // narrow: a thin still (the side column) — the figures shrink so everyone still fits across
    const k = narrow ? (who.length > 2 ? 0.5 : who.length > 1 ? 0.72 : 1) : 1;
    const size = Math.round(hgt * k * (who.length > 3 ? 0.62 : who.length > 2 ? 0.86 : 0.94));
    return h("div.vstill.bg-" + (s?.bg || "street") + (cls ? "." + cls : "") + (who.length > 3 ? ".n4" : ""), { style: { height: hgt + "px" } },
        (s?.props || []).length ? h("span.vstill-prop", s.props[0]) : null,
        s?.fx === "steam" ? h("div.vstill-steam", Array.from({ length: 5 }, (_, i) => h("i", { style: { "--x": (8 + i * 21) + "%" } }))) : null,
        h("div.vstill-row", who.map(({ w, c }) => figure(c, { ...w, size, mosaic: !!s.mosaic }))),
        cap && s?.cap ? h("small.vstill-cap", s.cap) : null);
}
// the stills a cover uses: the cover's own (cover.back.stills) or the first scenes of the film
export function coverStills(m, n) {
    const own = (m.cover?.back?.stills || []).filter(s => s?.who?.length);
    if (own.length) return own.slice(0, n);
    return (m.script || []).filter(p => p.k === "scene" && (p.who || []).length).slice(0, n).map(sc => ({
        bg: sc.bg, props: (sc.props || []).slice(0, 1), cap: String(sc.lines?.[0]?.[1] || "").slice(0, 16),
        who: (sc.who || []).slice(0, 3).map(r => {
            const line = (sc.lines || []).find(l => D.castOf(m, l[0])?.role === r);
            const meta = { ...(sc.cast?.[r] || {}), ...(line?.[2] || {}) };
            return { r, expr: meta.expr || (line ? D.lineMood(line[1]) : "happy"), pose: meta.pose, hold: meta.hold };
        })
    }));
}

// ---------------------------------------------------------------- 중간표지 (spine)
// how wide a title is in "em" (Korean 1 · Latin / digits .6 · space .45) — the font is sized so the title fits in one line
const ems = t => Array.from(String(t || "")).reduce((a, ch) => a + (ch === " " ? 0.45 : /[\x21-\x7e]/.test(ch) ? 0.62 : 1), 0) || 1;
const fit = (len, room, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(room / len)));
export function spine(m, { onclick = null, small = false } = {}) {
    if (m.cover?.whole) return wholeSpine(m, m.cover.whole, small, onclick);
    const b = brandOf(m), S = D.brandStyle(b.id), r = rateOf(m);
    const SP = m.cover?.spine || {};
    const showStill = !small && S.still !== "none" && SP.still !== false, showBand = S.band && SP.band !== false;
    // room for the big title (px along the spine)
    // sub: the movie can put the English title "side" (small, sideways beside the Korean title) instead of the brand's way
    const artOnly = !!(SP.glyphs || SP.art);   // the title art alone on the spine: no English title
    const subMode = artOnly ? null : SP.sub || S.sub;
    const room = small ? 104 : 300 - 52 - (showBand ? 18 : 0) - (showStill ? 64 : 0) - 40 - (subMode === "en" || subMode === "row" ? 22 : 0) - 18;
    // 구름 글씨 (font "cloud"): every letter puffed up and tilted a little its own way, so the title floats and sways
    const cloudy = t => Array.from(t).map((ch, i) => h("i.cl", { style: { "--r": [-9, 7, -4, 10, -7, 5][i % 6] + "deg", "--y": [0, -3, 2, -2, 3, -1][i % 6] + "px" } }, ch));
    const vKo = (t, fs, cls = "") => h("span.vs-v.vs-ko" + cls, { style: { fontSize: fs + "px" } }, SP.font === "cloud" && !cls ? cloudy(t) : t);
    const vEn = (t, fs, cls = "") => h("span.vs-v.vs-en-big" + cls, { style: { fontSize: fs + "px" } }, t);
    let title;
    // a movie can ask for its own spine: main "en" (the English title big) with sub "ko" (the Korean title small, sideways beside it)
    if ((SP.main || S.main) === "en" && !artOnly) {
        const enFs = fit(ems(m.en), room, 8, small ? 16 : 22);
        title = h("div.vs-title.t-en", vEn(m.en, enFs), subMode === "ko" ? vKo(m.ko, fit(ems(m.ko), room * 0.8, 7, small ? 9 : 11), ".sub") : null);
    } else if (SP.art) {
        // art: the movie's own tall title art (letters already stacked top to bottom, clear ground) filling the spine
        const room2 = room + (SP.moonHand && !small ? 0 : 40);
        title = h("div.vs-title.t-art", h("img", { src: SP.art, alt: m.ko, draggable: "false", style: { maxHeight: room2 + "px" } }));
    } else if (SP.glyphs) {
        // glyphs: the letters of the movie's own title art, cut out one by one and stacked down the spine
        const G = SP.glyphs, room2 = room + (SP.moonHand && !small ? 0 : 40), each = Math.floor(room2 / G.boxes.length);
        title = h("div.vs-title.t-glyphs", G.boxes.map(bx => cropEl("i.vs-glyph", G.src, bx, { height: each + "px", aspectRatio: ratio(G.size, bx) })));
    } else if (SP.img) title = h("div.vs-title.t-img" + (SP.contain ? ".contain" : ""), h("img", { src: SP.img, alt: m.ko, draggable: "false", style: { maxHeight: room + "px" } }));   // the movie's own title art
    else title = h("div.vs-title.t-ko", vKo(m.ko, fit(ems(m.ko), room, 9, small ? 16 : 24)), subMode === "side" && !small ? h("span.vs-v.vs-en-side", m.en) : null);
    const sub = subMode === "en" ? h("div.vs-sub.vs-en", SP.enText || m.en)   // enText: a shorter English title on the spine
        : subMode === "row" ? h("div.vs-sub.vs-row", { style: { fontSize: fit(ems(m.ko), small ? 40 : 64, 5, 11) + "px" } }, m.ko) : null;
    const stillSpec = m.cover?.spine?.still || coverStills(m, 1)[0] || (leads(m)[0] ? { bg: "street", who: [spec(leads(m)[0])] } : null);
    return h("button.vhs-spine.vt-" + b.id + (small ? ".small" : "") + (m.bw ? ".bw" : "") + ".f-" + (m.cover?.spine?.font || "bold") + ".st-" + S.still,
        { style: { "--sc": b.color, "--si": b.ink, ...(SP.bg ? { background: SP.bg, color: "#f5f5f4" } : {}) }, title: D.titleText(m), ...(onclick ? { onclick } : {}) },
        h("div.vs-top", brandLogo(b, small ? 22 : 30), small ? null : h("small", b.name)),
        showBand ? h("div.vs-band", { style: { background: r.color, color: r.ink } }, small ? r.name.replace(/띠$/, "") : r.name) : null,
        // font "plain": the titles sit on a plain label (black, ordinary letters)
        SP.font === "plain" ? h("div.vs-label", title, sub) : [title, sub],
        // moonHand: instead of a still — the werewolf's hand (cut out of a cover picture) against a full moon
        SP.moonHand ? (small ? null : h("div.vs-moonhand", h("i.vs-moon"), cropEl("i.vs-hand", SP.moonHand.src, SP.moonHand.box)))
            : showStill && stillSpec ? h("div.vs-still", still(m, stillSpec, { hgt: 58 })) : null,
        h("div.vs-foot", h("div.vs-vhs", "VHS")));   // (no ★ on the covers)
}
// ✂️ a part of a picture: box [x0, y0, x1, y1] (0~1 of the picture) drawn over the whole element (CSS background · no image files to cut)
export const cropStyle = (src, [x0, y0, x1, y1]) => { const w = x1 - x0, hh = y1 - y0; return { backgroundImage: `url("${src}")`, backgroundSize: `${100 / w}% ${100 / hh}%`, backgroundPosition: `${w >= 1 ? 0 : x0 / (1 - w) * 100}% ${hh >= 1 ? 0 : y0 / (1 - hh) * 100}%`, backgroundRepeat: "no-repeat" }; };
const cropEl = (tag, src, box, extra = {}) => h(tag, { style: { ...cropStyle(src, box), ...extra } });
const ratio = (size, b) => `${((b[2] - b[0]) * size[0]).toFixed(1)} / ${((b[3] - b[1]) * size[1]).toFixed(1)}`;
// 📷 cover.whole: the whole box is one picture (뒷표지 | 중간표지 | 앞표지 side by side) — each side shows its own part
//   { src, back, spine, front: boxes · patch: [{ at: box on the spine, from: box of the picture }] — painted over (e.g. the ★ printed on it) }
function wholeSpine(m, W, small, onclick) {
    return h("button.vhs-spine.photo" + (small ? ".small" : ""), { style: cropStyle(W.src, W.spine), title: D.titleText(m), ...(onclick ? { onclick } : {}) },
        (W.patch || []).map(p => cropEl("i.vs-patch", W.src, p.from, { left: (p.at[0] * 100) + "%", top: (p.at[1] * 100) + "%", width: ((p.at[2] - p.at[0]) * 100) + "%", height: ((p.at[3] - p.at[1]) * 100) + "%" })));
}
// 🩹 cover.whole.fix: [{ at, from, text?, fs?, color?, x?, font? }] — all boxes in picture coordinates (0~1 of the whole picture)
//   paints a clean bit of the picture (from) over a printed mistake (at) · text: the corrected words written on it (fs: font size in picture px · x: left inset in px)
//   the text is an SVG so it scales with the cover at any size
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function fixes(W, side) {
    const [sx0, sy0, sx1, sy1] = side, sw = sx1 - sx0, sh = sy1 - sy0, [PW, PH] = W.size || [1000, 1000];
    return (W.fix || []).filter(f => f.at[0] >= sx0 - 1e-6 && f.at[2] <= sx1 + 1e-6).map(f => {
        const el = cropEl("i.vc-fix", W.src, f.from, { left: ((f.at[0] - sx0) / sw * 100) + "%", top: ((f.at[1] - sy0) / sh * 100) + "%", width: ((f.at[2] - f.at[0]) / sw * 100) + "%", height: ((f.at[3] - f.at[1]) / sh * 100) + "%" });
        if (f.text) {
            const w = (f.at[2] - f.at[0]) * PW, hh = (f.at[3] - f.at[1]) * PH, fs = f.fs || hh * 0.7;
            el.innerHTML = `<svg viewBox="0 0 ${w.toFixed(1)} ${hh.toFixed(1)}" preserveAspectRatio="none"><text x="${f.x ?? 4}" y="${(hh / 2).toFixed(1)}" dominant-baseline="central" font-size="${fs}" fill="${f.color || "#f5ede4"}" font-family="${f.font || "'Noto Sans KR', sans-serif"}" font-weight="${f.weight || 500}"${f.tw ? ` textLength="${f.tw}" lengthAdjust="spacingAndGlyphs"` : ""}>${esc(f.text)}</text></svg>`;
        }
        return el;
    });
}

// ---------------------------------------------------------------- 앞표지 layouts
const F = (m, s, size, extra = {}) => { const w = norm(s), c = D.castOf(m, w.r); return c ? figure(c, { ...w, ...extra, size }) : null; };
const FRONT = {
    lineup: m => {
        const L = leads(m), Sp = sups(m), row = [...Sp.slice(0, 1), ...L, ...Sp.slice(1, 3)].slice(0, 5);
        return h("div.vf-art.va-lineup", h("div.va-row", row.map(c => F(m, spec(c, { expr: c.part === "lead" ? "excited" : "smug", pose: c.part === "lead" ? "wave" : "hips" }), c.part === "lead" ? 118 : 86))));
    },
    hero: m => h("div.vf-art.va-hero", leads(m)[0] ? F(m, spec(leads(m)[0], { expr: "cool", pose: "hips" }), 172) : null,
        h("div.va-minis", [...leads(m).slice(1), ...sups(m)].slice(0, 4).map(c => F(m, spec(c), 54)))),
    duo: m => { const [a, b] = [...leads(m), ...sups(m)]; return h("div.vf-art.va-duo", a ? F(m, spec(a, { expr: "love", pose: "point" }), 128) : null, h("i.va-mid"), b ? h("div.va-flip", F(m, spec(b, { expr: "shy", pose: "point" }), 128)) : null); },
    still: m => h("div.vf-art.va-still", coverStills(m, 1)[0] ? still(m, coverStills(m, 1)[0], { hgt: 176, cls: "full" }) : null),
    spotlight: m => h("div.vf-art.va-spot", h("div.va-back", [...sups(m), ...extras(m)].slice(0, 3).map(c => F(m, spec(c, { expr: "evil" }), 78, { upper: true }))),
        leads(m)[0] ? h("div.va-lit", F(m, spec(leads(m)[0], { expr: "scared", pose: "shrug" }), 140)) : null),
    stage: m => h("div.vf-art.va-stage", h("i.va-curtain.l"), h("i.va-curtain.r"), h("div.va-row", [...leads(m), ...sups(m)].slice(0, 4).map(c => F(m, spec(c, { expr: "excited", pose: "both" }), c.part === "lead" ? 96 : 74)))),
    pyramid: m => { const all = [...leads(m), ...sups(m), ...extras(m)]; return h("div.vf-art.va-pyr", h("div.va-row.t", all.slice(0, 1).map(c => F(m, spec(c, { expr: "excited", pose: "both" }), 84))), h("div.va-row.mid", all.slice(1, 3).map(c => F(m, spec(c, { pose: "wave" }), 70))), h("div.va-row.low", all.slice(3, 6).map(c => F(m, spec(c), 58)))); },
    frame: m => h("div.vf-art.va-frame", h("div.va-pic", leads(m)[0] ? F(m, spec(leads(m)[0], { expr: "blank" }), 124) : null), h("div.va-minis", sups(m).slice(0, 3).map(c => F(m, spec(c), 42, { upper: true })))),
    panels: m => h("div.vf-art.va-panels", [...leads(m), ...sups(m)].slice(0, 3).map((c, i) => h("div.va-panel.bg-" + ["street", "home", "office"][i], F(m, spec(c, { expr: ["shock", "dizzy", "tongue"][i], pose: ["shrug", "both", "point"][i] }), 92)))),
    split: m => { const a = leads(m)[0], b = sups(m)[0] || leads(m)[1]; return h("div.vf-art.va-split", h("div.va-half.a", a ? F(m, spec(a, { expr: "angry", pose: "point" }), 140) : null), h("div.va-half.b", b ? h("div.va-flip", F(m, spec(b, { expr: "evil", pose: "point" }), 140)) : null)); },
    // 복덩이 사기단: the leads on a bed of money bundles · the others burst out of the money (face and chest only)
    "money-burst": (m, FR) => h("div.vf-art.va-money",
        h("div.va-burst", (FR.back || []).map(s => h("div.va-burster", F(m, s, 118, { upper: true }), h("i.va-pile")))),
        h("div.va-bed"),
        h("div.va-row.main", (FR.main || leads(m).map(c => spec(c, { expr: "excited", pose: "both", hold: "money" }))).map(s => F(m, s, 92)))),
    // 말하는 초콜릿: a big rocket flies into the campus with the lead sitting on it · small figures watch from the campus
    rocket: (m, FR) => {
        const rocket = h("i.va-rocket"); rocket.innerHTML = ROCKET;
        const rider = FR.main?.[0] || (leads(m)[0] && spec(leads(m)[0], { expr: "love", pose: "wave" }));
        return h("div.vf-art.va-rocket-art.bg-campus",
            h("div.va-watch", (FR.back || []).map(s => F(m, s, 62))),
            h("div.va-ride", h("div.va-rider", rider ? F(m, rider, 100) : null), rocket));
    },
    // 앙클베리: a concert hall — spotlights on the stage, every lead gathered in two rows, the audience's heads below
    concert: (m, FR) => {
        const L = FR.main || leads(m).map(c => spec(c, { expr: "excited", pose: "both" })), cut = Math.ceil(L.length / 2);
        return h("div.vf-art.va-concert", h("i.va-beam.a"), h("i.va-beam.b"), h("i.va-beam.c"),
            h("div.va-row.back", L.slice(0, cut).map(s => F(m, s, 54))),
            h("div.va-row.front", L.slice(cut).map(s => F(m, s, 62))),
            h("i.va-crowd"));
    },
    // 늑대인간의 밤: a dark night, a huge full moon — a red eye glares through it · a wolf's silhouette below
    moon: () => { const a = h("i.va-moonart"); a.innerHTML = MOON_EYE; return h("div.vf-art.va-moon", a); },
    // 문차일드2: a forest under the full moon — a huge wolf's hand with long claws bursts out through the middle of the cover
    clawmoon: () => { const a = h("i.va-moonart"); a.innerHTML = CLAW_MOON; return h("div.vf-art.va-moon.va-clawmoon", a); },
    // 늑대인간 (Moonchild 3): the forest under the full moon, a red-eyed werewolf glaring out of the middle · two small stills tilted on both sides (FR.stills)
    wolfglare: (m, FR) => { const a = h("i.va-moonart"); a.innerHTML = WOLF_GLARE;
        return h("div.vf-art.va-moon.va-glare", a, ...(FR.stills || []).slice(0, 2).map((s, i) => h("div.va-tilt" + (i ? ".r" : ".l"), still(m, s, { hgt: 46 })))); },
    // 헛간: night, the barn's doors ajar on the dark · the leads in front, candles lit, trembling
    barn: (m, FR) => {
        const barn = h("i.va-barnhouse"); barn.innerHTML = BARN;
        return h("div.vf-art.va-barn", barn, h("i.va-dark"),
            h("div.va-row.main", (FR.main || leads(m).map(c => spec(c, { expr: "scared", hold: "candle" }))).map(s => F(m, s, 104))),
            h("i.va-glow"));
    }
};
const BARN = `<svg viewBox="0 0 230 190" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"><circle cx="190" cy="28" r="14" fill="#e5e5e5"/><circle cx="196" cy="24" r="12" fill="#0a0a0a"/>` +
    `<path d="M0 150Q60 140 115 146T230 142V190H0Z" fill="#262626"/>` +
    `<path d="M40 160V78L115 30L190 78V160Z" fill="#3f3f46" stroke="#111" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M30 84L115 26L200 84" fill="none" stroke="#18181b" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M48 90V160M60 88V160M72 80V160M158 80V160M170 88V160M182 90V160" stroke="#27272a" stroke-width="2"/>` +
    `<rect x="102" y="52" width="26" height="20" fill="#0a0a0a" stroke="#18181b" stroke-width="3"/>` +
    `<rect x="78" y="94" width="74" height="66" fill="#000"/>` +
    `<path d="M78 94H104V160H78Z" fill="#52525b" stroke="#111" stroke-width="2.5" transform="skewY(-6) translate(0 9)"/><path d="M80 104L102 150M102 104L80 150" stroke="#27272a" stroke-width="3" transform="skewY(-6) translate(0 9)"/>` +
    `<path d="M140 94H152V160H140Z" fill="#52525b" stroke="#111" stroke-width="2.5"/>` +
    `<path d="M20 160L26 126M14 136H34M180 160L186 132M174 142H196" stroke="#18181b" stroke-width="3"/></svg>`;
const MOON_EYE = `<svg viewBox="0 0 230 190" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><radialGradient id="mnG" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#fffbeb"/><stop offset=".7" stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/></radialGradient>` +
    `<radialGradient id="mnH" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#fde68a" stop-opacity=".45"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="eyG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fca5a5"/><stop offset=".45" stop-color="#dc2626"/><stop offset="1" stop-color="#450a0a"/></radialGradient></defs>` +
    `<rect width="230" height="190" fill="#05030f"/>` + [[18, 20], [60, 12], [200, 18], [34, 60], [214, 70], [150, 10], [96, 26], [180, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff" opacity=".8"/>`).join("") +
    `<circle cx="115" cy="78" r="86" fill="url(#mnH)"/><circle cx="115" cy="78" r="64" fill="url(#mnG)"/>` +
    `<g fill="#d9770633"><circle cx="88" cy="60" r="9"/><circle cx="140" cy="104" r="12"/><circle cx="146" cy="52" r="6"/><circle cx="92" cy="110" r="5"/></g>` +
    // the eye tearing through the moon
    `<path d="M48 80Q115 26 182 80Q115 128 48 80Z" fill="#0a0000" stroke="#7f1d1d" stroke-width="3"/>` +
    `<path d="M58 80Q115 40 172 80Q115 118 58 80Z" fill="#fef3c7"/><circle cx="115" cy="80" r="27" fill="url(#eyG)" stroke="#450a0a" stroke-width="2"/>` +
    `<ellipse cx="115" cy="80" rx="5" ry="22" fill="#0a0000"/><circle cx="106" cy="70" r="4" fill="#fff" opacity=".85"/>` +
    `<path d="M58 80Q115 40 172 80" fill="none" stroke="#450a0a" stroke-width="4"/>` +
    `<g stroke="#7f1d1d" stroke-width="2" opacity=".8"><path d="M64 70L52 58M82 58L76 44M150 58L158 44M168 70L182 58"/></g>` +
    // a wolf's silhouette on the rocks, howling
    `<path d="M0 190V170Q40 160 70 166Q100 156 130 164Q170 154 230 166V190Z" fill="#000"/>` +
    `<path d="M86 166L92 148Q86 140 90 130L84 124L90 122L98 128Q104 122 110 120L106 104L114 112L118 100L120 114Q130 118 134 130Q150 136 156 150L162 166L150 166L146 156L140 166L128 166L124 156L104 158L100 166Z" fill="#000"/>` +
    `<path d="M106 104L102 92L112 100Z" fill="#000"/></svg>`;
// the full moon over a dark forest · the cover is torn open in the middle and a furry wolf's hand reaches out, long claws first
const CLAW_MOON = `<svg viewBox="0 0 230 190" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><radialGradient id="cmG" cx="42%" cy="40%" r="60%"><stop offset="0" stop-color="#fffbeb"/><stop offset=".7" stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/></radialGradient>` +
    `<radialGradient id="cmH" cx="50%" cy="50%" r="50%"><stop offset=".5" stop-color="#fde68a" stop-opacity=".4"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="cmT" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000"/><stop offset=".75" stop-color="#1a0303"/><stop offset="1" stop-color="#450a0a"/></radialGradient>` +
    `<linearGradient id="cmC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fafaf9"/><stop offset="1" stop-color="#a8a29e"/></linearGradient></defs>` +
    `<rect width="230" height="190" fill="#04030c"/>` + [[16, 18], [58, 10], [204, 16], [30, 56], [216, 64], [148, 8], [92, 20], [186, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff" opacity=".8"/>`).join("") +
    `<circle cx="115" cy="58" r="66" fill="url(#cmH)"/><circle cx="115" cy="58" r="46" fill="url(#cmG)"/>` +
    `<g fill="#d9770633"><circle cx="96" cy="44" r="7"/><circle cx="134" cy="72" r="9"/><circle cx="138" cy="38" r="5"/></g>` +
    // pine trees on both sides
    `<g fill="#020617">` + [[6, 190, 30, 70], [28, 190, 24, 96], [196, 190, 30, 66], [218, 190, 26, 92], [52, 190, 18, 120], [176, 190, 18, 118]].map(([x, y, w, t]) =>
        `<path d="M${x} ${t}L${x + w / 2} ${y}H${x - w / 2}Z"/><path d="M${x} ${t + 18}L${x + w * 0.7} ${y - 20}H${x - w * 0.7}Z"/>`).join("") + `</g>` +
    `<path d="M0 190V168Q60 158 115 164T230 160V190Z" fill="#000"/>` +
    // the torn hole in the middle of the cover
    `<path d="M62 118L72 100L66 86L84 82L88 66L104 72L114 58L124 72L140 64L146 80L164 82L160 98L174 110L162 122L170 138L152 140L148 158L132 152L120 166L108 154L92 160L90 144L70 144L76 130Z" fill="url(#cmT)"/>` +
    // torn paper flaps around the hole
    `<path d="M62 118L72 100L66 86L84 82L88 66L104 72L114 58L124 72L140 64L146 80L164 82L160 98L174 110L162 122L170 138L152 140L148 158L132 152L120 166L108 154L92 160L90 144L70 144L76 130Z" fill="none" stroke="#e7e5e4" stroke-width="3" stroke-linejoin="round"/>` +
    `<g fill="#d6d3d1" stroke="#78716c" stroke-width=".8"><path d="M66 86L84 82L76 94Z"/><path d="M140 64L146 80L134 74Z"/><path d="M170 138L152 140L160 130Z"/><path d="M92 160L90 144L100 152Z"/></g>` +
    // the furry wrist coming out of the hole · the palm open · five thick fingers reaching out
    `<path d="M96 168L92 150L84 146L94 140L92 128L104 132Q114 124 128 132L140 126L138 140L148 144L138 150L136 168Z" fill="#3b2414" stroke="#0b0603" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<g fill="none" stroke-linecap="round"><g stroke="#0b0603" stroke-width="16">` +
    `<path d="M96 112L72 84"/><path d="M106 102L94 62"/><path d="M117 98L118 56"/><path d="M128 102L140 62"/><path d="M140 120L166 104"/></g>` +
    `<g stroke="#4a2c17" stroke-width="11"><path d="M96 112L72 84"/><path d="M106 102L94 62"/><path d="M117 98L118 56"/><path d="M128 102L140 62"/><path d="M140 120L166 104"/></g>` +
    `<g stroke="#6b4226" stroke-width="2"><path d="M80 98l6 -3M98 82l6 -1M115 78h6M132 80l6 1M154 116l3 5"/></g></g>` +
    `<ellipse cx="117" cy="120" rx="27" ry="24" fill="#4a2c17" stroke="#0b0603" stroke-width="2.6"/>` +
    `<ellipse cx="117" cy="124" rx="14" ry="11" fill="#7c4a2a"/><g fill="#7c4a2a"><circle cx="99" cy="108" r="4"/><circle cx="108" cy="100" r="4"/><circle cx="120" cy="98" r="4"/><circle cx="131" cy="101" r="4"/></g>` +
    // long claws, blood on the tips
    `<g fill="url(#cmC)" stroke="#1c0f06" stroke-width="1.4" stroke-linejoin="round">` +
    `<path d="M75 81L57 62L69 86Z"/><path d="M98 61L88 36L90 63Z"/><path d="M122 56L119 29L114 56Z"/><path d="M144 63L148 36L136 61Z"/><path d="M168 108L190 92L164 100Z"/></g>` +
    `<g fill="#b91c1c"><path d="M57 62l6 4l-3 3Z"/><path d="M88 36l3 7l-3 1Z"/><path d="M119 29l1.5 8l-3 -.5Z"/><path d="M148 36l-.8 8l-3 -1Z"/><path d="M190 92l-5 6l-2 -3Z"/><circle cx="62" cy="72" r="1.4"/><circle cx="146" cy="50" r="1.4"/></g></svg>`;
// the full moon behind a dark pine forest · a werewolf's head right in the middle, glaring with glowing red eyes
const PINES = (fill) => `<g fill="${fill}">` + [[6, 190, 30, 70], [28, 190, 24, 96], [196, 190, 30, 66], [218, 190, 26, 92], [52, 190, 18, 120], [176, 190, 18, 118]].map(([x, y, w, t]) =>
    `<path d="M${x} ${t}L${x + w / 2} ${y}H${x - w / 2}Z"/><path d="M${x} ${t + 18}L${x + w * 0.7} ${y - 20}H${x - w * 0.7}Z"/>`).join("") + `</g>`;
const WOLF_GLARE = `<svg viewBox="0 0 230 190" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><radialGradient id="wgM" cx="42%" cy="40%" r="60%"><stop offset="0" stop-color="#fffbeb"/><stop offset=".7" stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/></radialGradient>` +
    `<radialGradient id="wgH" cx="50%" cy="50%" r="50%"><stop offset=".5" stop-color="#fde68a" stop-opacity=".4"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="wgE" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fecaca"/><stop offset=".35" stop-color="#ef4444"/><stop offset="1" stop-color="#7f1d1d"/></radialGradient>` +
    `<radialGradient id="wgG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ef4444" stop-opacity=".75"/><stop offset="1" stop-color="#ef4444" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="230" height="190" fill="#04030c"/>` + [[16, 18], [58, 10], [204, 16], [30, 56], [216, 64], [148, 8], [92, 20], [186, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff" opacity=".8"/>`).join("") +
    `<circle cx="115" cy="66" r="78" fill="url(#wgH)"/><circle cx="115" cy="66" r="56" fill="url(#wgM)"/>` +
    `<g fill="#d9770633"><circle cx="92" cy="46" r="7"/><circle cx="140" cy="40" r="5"/></g>` + PINES("#020617") +
    `<path d="M0 190V170Q60 160 115 166T230 162V190Z" fill="#000"/>` +
    // the werewolf's head: ears · shaggy cheeks · a heavy brow · glowing red eyes · the muzzle, bared fangs
    `<g stroke="#0b0603" stroke-width="2.6" stroke-linejoin="round">` +
    `<path d="M76 84L64 26L106 62Z" fill="#2b1a0e"/><path d="M154 84L166 26L124 62Z" fill="#2b1a0e"/>` +
    `<path d="M78 74L70 40L96 62ZM152 74L160 40L134 62Z" fill="#7f1d1d" stroke="none"/>` +
    `<path d="M115 52Q154 52 164 92L178 100L166 108L174 122L158 124L156 140L140 148Q128 176 115 178Q102 176 90 148L74 140L72 124L56 122L64 108L52 100L66 92Q76 52 115 52Z" fill="#3b2414"/>` +
    `<path d="M115 56Q128 70 122 92L115 100L108 92Q102 70 115 56Z" fill="#4a2c17" stroke="none"/>` +
    `<path d="M96 132Q115 120 134 132L132 160Q115 176 98 160Z" fill="#6b4226"/></g>` +
    `<path d="M78 98L108 108M152 98L122 108" stroke="#000" stroke-width="5" stroke-linecap="round"/>` +
    `<circle cx="96" cy="112" r="16" fill="url(#wgG)"/><circle cx="134" cy="112" r="16" fill="url(#wgG)"/>` +
    `<path d="M84 112Q96 102 108 112Q96 120 84 112Z" fill="url(#wgE)" stroke="#450a0a" stroke-width="1.4"/><path d="M122 112Q134 102 146 112Q134 120 122 112Z" fill="url(#wgE)" stroke="#450a0a" stroke-width="1.4"/>` +
    `<ellipse cx="96" cy="112" rx="1.6" ry="5" fill="#000"/><ellipse cx="134" cy="112" rx="1.6" ry="5" fill="#000"/>` +
    `<ellipse cx="115" cy="133" rx="9" ry="6" fill="#0b0603"/><circle cx="112" cy="131" r="1.6" fill="#fff" opacity=".6"/>` +
    `<path d="M100 150Q115 160 130 150" fill="#450a0a" stroke="#0b0603" stroke-width="2"/>` +
    `<path d="M103 150l3 10l3 -9M121 151l3 9l3 -10" fill="#fafaf9" stroke="#1c0f06" stroke-width="1"/>` +
    `<path d="M106 160l0 5M124 160l0 6" stroke="#b91c1c" stroke-width="1.6" stroke-linecap="round"/></svg>`;
// 뒷표지 art: a big full moon · a long-clawed wolf's hand cast over it like a black shadow
const CLAW_SHADOW = `<svg viewBox="0 0 230 190" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><radialGradient id="csM" cx="42%" cy="40%" r="62%"><stop offset="0" stop-color="#fffbeb"/><stop offset=".65" stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/></radialGradient>` +
    `<radialGradient id="csH" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="#fde68a" stop-opacity=".35"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient></defs>` +
    `<circle cx="115" cy="95" r="94" fill="url(#csH)"/><circle cx="115" cy="95" r="78" fill="url(#csM)"/>` +
    `<g fill="#d9770630"><circle cx="86" cy="64" r="10"/><circle cx="150" cy="120" r="14"/><circle cx="150" cy="58" r="6"/><circle cx="84" cy="128" r="6"/></g>` +
    `<g fill="#0a0503" opacity=".93">` +
    // the wrist rising from below · the palm · five long fingers ending in long hooked claws
    `<path d="M92 190L96 150Q90 136 98 128L132 128Q142 138 136 152L140 190Z"/>` +
    `<ellipse cx="116" cy="124" rx="30" ry="24"/>` +
    `<g stroke="#0a0503" stroke-width="12" stroke-linecap="round" fill="none"><path d="M92 118L66 86"/><path d="M104 104L94 60"/><path d="M117 100L118 52"/><path d="M130 104L142 60"/><path d="M142 126L170 110"/></g>` +
    `<path d="M68 90Q50 72 40 50Q58 66 72 82Z"/><path d="M96 64Q88 38 92 14Q100 38 100 62Z"/><path d="M120 56Q122 30 132 8Q130 34 124 56Z"/><path d="M144 64Q154 40 170 22Q160 46 148 66Z"/><path d="M168 106Q186 92 206 90Q188 102 172 114Z"/>` +
    `<path d="M70 116l-8 -2l7 -4ZM160 140l8 2l-7 4ZM98 150l-6 4l2 -7Z"/></g>` +
    `<g fill="#7f1d1d"><circle cx="40" cy="50" r="1.6"/><circle cx="92" cy="14" r="1.6"/><circle cx="132" cy="8" r="1.6"/></g></svg>`;
const BACK_ART = { clawshadow: CLAW_SHADOW };
const ROCKET = `<svg viewBox="0 0 220 110" xmlns="http://www.w3.org/2000/svg"><path d="M10 55Q-6 40 6 30L34 44Q20 55 34 66L6 80Q-6 70 10 55Z" fill="#f97316"/><path d="M0 55Q14 46 30 50V60Q14 64 0 55Z" fill="#fde047"/>` +
    `<path d="M30 34H150Q204 34 216 55Q204 76 150 76H30Z" fill="#f8fafc" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M150 34Q204 34 216 55Q204 76 150 76Q162 55 150 34Z" fill="#ec4899" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M60 34L40 8H76L96 34ZM60 76L40 102H76L96 76Z" fill="#ec4899" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/>` +
    `<circle cx="118" cy="55" r="11" fill="#7dd3fc" stroke="#1e1b4b" stroke-width="4"/><path d="M84 46h14M84 64h14" stroke="#ec4899" stroke-width="4" stroke-linecap="round"/></svg>`;
export function front(m) {
    if (m.cover?.whole) return h("div.vhs-front.photo", { style: cropStyle(m.cover.whole.src, m.cover.whole.front) }, fixes(m.cover.whole, m.cover.whole.front));
    const b = brandOf(m), S = D.brandStyle(b.id), FR = m.cover?.front || {}, layout = FRONT[FR.layout] ? FR.layout : S.front;
    // FR.pic: the front is the movie's own picture — { src, size, art: the picture part, title: the title-letters part } (no logo · no cast)
    if (FR.pic) { const P = FR.pic; return h("div.vhs-front.l-pic", { style: { "--fb": FR.bg || "#05060d" } },
        cropEl("div.vf-pic", P.src, P.art), cropEl("div.vf-pic-title", P.src, P.title, { aspectRatio: ratio(P.size, P.title) }), ratingBand(m)); }
    return h("div.vhs-front.vt-" + b.id + ".l-" + layout + (m.bw ? ".bw" : ""), { style: { "--fb": FR.bg || b.color, "--bc": b.color, "--bi": b.ink } },
        // FR.noCast: no actor names on the front (just the logo)
        h("div.vf-head", brandLogo(b, 28), FR.noCast ? null : h("small", `주연: ${leads(m).length > 4 ? `${castLine(leads(m).slice(0, 3), true)} 외 ${leads(m).length - 3}명` : castLine(leads(m), true) || "-"}`)),
        FRONT[layout](m, FR),
        // FR.titleImg: the Korean title is the movie's own title art (big), the English title small under it
        FR.titleImg ? h("div.vf-title.t-img" + (FR.plainImg ? ".plain" : ""), h("img", { src: FR.titleImg, alt: m.ko, draggable: "false" }), h("small", FR.enText || m.en)) : h("div.vf-title.f-" + (m.cover?.spine?.font || "bold"), h("b",m.cover?.spine?.font === "cloud" ? Array.from(m.ko).map((ch, i) => h("i.cl", { style: { "--r": [-9, 7, -4, 10, -7, 5][i % 6] + "deg", "--y": [0, -3, 2, -2, 3, -1][i % 6] + "px" } }, ch)) : m.ko), h("small", m.en)),
        m.tagline ? h("div.vf-tag", `"${m.tagline}"`) : null,
        ratingBand(m));
}

// ---------------------------------------------------------------- 뒷표지 layouts
const BACK = {
    stills4: (m, L) => h("div.vb-stills.g4", L.map(s => still(m, s, { hgt: 56 }))),
    stills3: (m, L) => h("div.vb-stills.g3", L.map((s, i) => still(m, s, { hgt: i ? 50 : 66 }))),
    stills2: (m, L) => h("div.vb-stills.g2", L.map(s => still(m, s, { hgt: 58, cap: true }))),
    still1: (m, L) => h("div.vb-stills.g1", L.map(s => still(m, s, { hgt: 100, cap: true }))),
    strip3: (m, L) => h("div.vb-stills.g-strip", L.map(s => still(m, s, { hgt: 66 }))),
    filmstrip: (m, L) => h("div.vb-film", L.map(s => still(m, s, { hgt: 62 }))),
    polaroid: (m, L) => h("div.vb-polas", L.map((s, i) => h("div.vb-pola" + (i ? ".r" : ""), still(m, s, { hgt: 70 }), h("small", s.cap || "")))),
    // 3 stills stacked down the left side (the text runs down the right)
    side3: (m, L) => h("div.vb-stills.g-side", L.map(s => still(m, s, { hgt: 76, narrow: true }))),
    text: () => null
};
export function back(m) {
    if (m.cover?.whole) return h("div.vhs-back.photo", { style: cropStyle(m.cover.whole.src, m.cover.whole.back) }, fixes(m.cover.whole, m.cover.whole.back));
    const b = brandOf(m), S = D.brandStyle(b.id), BK = m.cover?.back || {}, layout = BACK[BK.layout] ? BK.layout : S.back;
    const L = coverStills(m, D.STILL_N[layout] ?? 4);
    const date = String(m.date || "").replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, mo, d) => `${+y}년 ${+mo}월 ${+d}일`);
    // BK.pic: the movie's own picture on top · the plot · 제작년월일 · the logo (no title, no cast)
    if (BK.pic) return h("div.vhs-back.l-pic", { style: { "--fb": m.cover?.front?.bg || "#05060d", "--bc": b.color, "--bi": b.ink } },
        cropEl("div.vb-pic", BK.pic.src, BK.pic.box, { aspectRatio: ratio(BK.pic.size, BK.pic.box) }),
        h("p.vb-plot", m.plot), h("dl.vb-info", h("dt", "제작년월일"), h("dd", date)),
        h("div.vb-foot", brandLogo(b, 26), h("b", b.name), ratingBand(m)));
    // BK.leads: only these roles are named as 주연 · BK.minimal: just 줄거리 · 주연 · 제작년월일 (+ the logo)
    const L0 = BK.leads ? BK.leads.map(r => D.castOf(m, r)).filter(Boolean) : leads(m);
    // BK.art: only a picture · the promo line under it · 제작년월일 · the logo (no plot, no cast)
    if (BACK_ART[BK.art]) {
        const a = h("i.vb-art"); a.innerHTML = BACK_ART[BK.art];
        return h("div.vhs-back.vt-" + b.id + ".l-art" + (m.bw ? ".bw" : ""), { style: { "--fb": m.cover?.front?.bg || b.color, "--bc": b.color, "--bi": b.ink } },
            a, BK.promo ? h("p.vb-promo", BK.promo) : null,
            h("dl.vb-info", h("dt", "제작년월일"), h("dd", date)),
            h("div.vb-foot", brandLogo(b, 26), h("b", b.name), ratingBand(m)));
    }
    return h("div.vhs-back.vt-" + b.id + ".l-" + layout + (m.bw ? ".bw" : ""), { style: { "--fb": m.cover?.front?.bg || b.color, "--bc": b.color, "--bi": b.ink } },
        L.length ? BACK[layout](m, L) : null,
        h("div.vb-text",
            h("p.vb-plot", m.plot),
            h("dl.vb-info",
                // short: names only (a big cast that plays themselves)
                h("dt", "주연"), h("dd", castLine(L0, BK.short) || "-"),
                !BK.minimal && sups(m).length ? [h("dt", "조연"), h("dd", castLine(sups(m), BK.short))] : null,
                h("dt", BK.minimal ? "제작년월일" : "제작"), h("dd", BK.minimal ? date : `${m.nation} · ${date}`),
                BK.minimal ? null : [h("dt", "장르"), h("dd", m.genres.join(" · ")),
                    h("dt", "상영시간"), h("dd", `${Math.round(D.scriptSeconds(m) / 60 * 10) / 10}분`)])),
        h("div.vb-foot", brandLogo(b, 26), h("b", b.name), ratingBand(m)));
}
// 뒷표지 | 중간표지 | 앞표지
export const vhsBox = m => h("div.vhs-box", back(m), spine(m), front(m));
