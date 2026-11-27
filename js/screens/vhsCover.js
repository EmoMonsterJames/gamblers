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
    const b = brandOf(m), S = D.brandStyle(b.id), r = rateOf(m);
    const SP = m.cover?.spine || {};
    const showStill = !small && S.still !== "none" && SP.still !== false, showBand = S.band && SP.band !== false;
    // room for the big title (px along the spine)
    // sub: the movie can put the English title "side" (small, sideways beside the Korean title) instead of the brand's way
    const subMode = SP.sub || S.sub;
    const room = small ? 104 : 300 - 52 - (showBand ? 18 : 0) - (showStill ? 64 : 0) - 40 - (subMode === "en" || subMode === "row" ? 22 : 0) - 18;
    // 구름 글씨 (font "cloud"): every letter puffed up and tilted a little its own way, so the title floats and sways
    const cloudy = t => Array.from(t).map((ch, i) => h("i.cl", { style: { "--r": [-9, 7, -4, 10, -7, 5][i % 6] + "deg", "--y": [0, -3, 2, -2, 3, -1][i % 6] + "px" } }, ch));
    const vKo = (t, fs, cls = "") => h("span.vs-v.vs-ko" + cls, { style: { fontSize: fs + "px" } }, SP.font === "cloud" && !cls ? cloudy(t) : t);
    const vEn = (t, fs, cls = "") => h("span.vs-v.vs-en-big" + cls, { style: { fontSize: fs + "px" } }, t);
    let title;
    // a movie can ask for its own spine: main "en" (the English title big) with sub "ko" (the Korean title small, sideways beside it)
    if ((SP.main || S.main) === "en") {
        const enFs = fit(ems(m.en), room, 8, small ? 16 : 22);
        title = h("div.vs-title.t-en", vEn(m.en, enFs), subMode === "ko" ? vKo(m.ko, fit(ems(m.ko), room * 0.8, 7, small ? 9 : 11), ".sub") : null);
    } else title = h("div.vs-title.t-ko", vKo(m.ko, fit(ems(m.ko), room, 9, small ? 16 : 24)), subMode === "side" && !small ? h("span.vs-v.vs-en-side", m.en) : null);
    const sub = subMode === "en" ? h("div.vs-sub.vs-en", m.en)
        : subMode === "row" ? h("div.vs-sub.vs-row", { style: { fontSize: fit(ems(m.ko), small ? 40 : 64, 5, 11) + "px" } }, m.ko) : null;
    const stillSpec = m.cover?.spine?.still || coverStills(m, 1)[0] || (leads(m)[0] ? { bg: "street", who: [spec(leads(m)[0])] } : null);
    return h("button.vhs-spine.vt-" + b.id + (small ? ".small" : "") + (m.bw ? ".bw" : "") + ".f-" + (m.cover?.spine?.font || "bold") + ".st-" + S.still,
        { style: { "--sc": b.color, "--si": b.ink }, title: D.titleText(m), ...(onclick ? { onclick } : {}) },
        h("div.vs-top", brandLogo(b, small ? 22 : 30), small ? null : h("small", b.name)),
        showBand ? h("div.vs-band", { style: { background: r.color, color: r.ink } }, small ? r.name.replace(/띠$/, "") : r.name) : null,
        // font "plain": the titles sit on a plain label (black, ordinary letters)
        SP.font === "plain" ? h("div.vs-label", title, sub) : [title, sub],
        showStill && stillSpec ? h("div.vs-still", still(m, stillSpec, { hgt: 58 })) : null,
        h("div.vs-foot", h("div.vs-vhs", "VHS"), h("div.vs-stars", "★".repeat(m.stars))));
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
const ROCKET = `<svg viewBox="0 0 220 110" xmlns="http://www.w3.org/2000/svg"><path d="M10 55Q-6 40 6 30L34 44Q20 55 34 66L6 80Q-6 70 10 55Z" fill="#f97316"/><path d="M0 55Q14 46 30 50V60Q14 64 0 55Z" fill="#fde047"/>` +
    `<path d="M30 34H150Q204 34 216 55Q204 76 150 76H30Z" fill="#f8fafc" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M150 34Q204 34 216 55Q204 76 150 76Q162 55 150 34Z" fill="#ec4899" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M60 34L40 8H76L96 34ZM60 76L40 102H76L96 76Z" fill="#ec4899" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/>` +
    `<circle cx="118" cy="55" r="11" fill="#7dd3fc" stroke="#1e1b4b" stroke-width="4"/><path d="M84 46h14M84 64h14" stroke="#ec4899" stroke-width="4" stroke-linecap="round"/></svg>`;
export function front(m) {
    const b = brandOf(m), S = D.brandStyle(b.id), FR = m.cover?.front || {}, layout = FRONT[FR.layout] ? FR.layout : S.front;
    return h("div.vhs-front.vt-" + b.id + ".l-" + layout + (m.bw ? ".bw" : ""), { style: { "--fb": FR.bg || b.color, "--bc": b.color, "--bi": b.ink } },
        h("div.vf-head", brandLogo(b, 28), h("small", `주연: ${leads(m).length > 4 ? `${castLine(leads(m).slice(0, 3), true)} 외 ${leads(m).length - 3}명` : castLine(leads(m), true) || "-"}`)),
        FRONT[layout](m, FR),
        h("div.vf-title.f-" + (m.cover?.spine?.font || "bold"), h("b", m.cover?.spine?.font === "cloud" ? Array.from(m.ko).map((ch, i) => h("i.cl", { style: { "--r": [-9, 7, -4, 10, -7, 5][i % 6] + "deg", "--y": [0, -3, 2, -2, 3, -1][i % 6] + "px" } }, ch)) : m.ko), h("small", m.en)),
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
    const b = brandOf(m), S = D.brandStyle(b.id), BK = m.cover?.back || {}, layout = BACK[BK.layout] ? BK.layout : S.back;
    const L = coverStills(m, D.STILL_N[layout] ?? 4);
    const date = String(m.date || "").replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, mo, d) => `${+y}년 ${+mo}월 ${+d}일`);
    // BK.leads: only these roles are named as 주연 · BK.minimal: just 줄거리 · 주연 · 제작년월일 (+ the logo)
    const L0 = BK.leads ? BK.leads.map(r => D.castOf(m, r)).filter(Boolean) : leads(m);
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
