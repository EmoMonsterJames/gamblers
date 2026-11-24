// =====================================================================
// Player image generator — extra parts (used by ui/avatarGen.js):
//   😀 EXPRESSIONS — 20 facial expressions for every race (eyes · brows · mouth · little marks)
//   👙 swimwear / lingerie — "swim" outfit set: 20 women's suits, 20 men's (body type × swim trunks)
//   🐑 curly fur — a soft wavy edge + curl texture on the ears, face and body
// All face parts are drawn in the face frame (head = ellipse 38×36 at 0,0 · eyes at x ±15, y −2 · mouth y ≈ 17).
// =====================================================================
const OUT = "#3a2a24";
const isHex = c => /^#[0-9a-f]{6}$/i.test(c || "");
function shade(hex, k) {
    if (!isHex(hex)) return hex;
    const n = parseInt(hex.slice(1), 16);
    const ch = s => { let v = (n >> s) & 255; v = k < 0 ? v * (1 + k) : v + (255 - v) * k; return Math.round(v).toString(16).padStart(2, "0"); };
    return "#" + ch(16) + ch(8) + ch(0);
}
const lum = hex => { if (!isHex(hex)) return 0.6; const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };

// ------------------------------------------------------------ 😀 expressions
export const EXPRESSIONS = [
    "😊 해맑은 웃음", "😏 도도한 표정", "😢 슬픈 표정", "😠 화난 표정", "😲 깜짝 놀란 표정",
    "😉 윙크", "😍 반한 표정 (하트눈)", "😴 졸린 표정", "😭 대성통곡", "😛 메롱",
    "😐 시크한 무표정", "😈 음흉한 미소", "😅 당황한 표정 (식은땀)", "😆 신난 표정 (><)", "😳 부끄러운 표정",
    "😤 짜증난 표정", "🙄 어이없는 표정", "😨 겁먹은 표정", "😎 자신만만 썩소", "😵 어질어질"
];
// → { eyes: (x, s) => svg | null (null = the race's normal eye), brows: (x, s) => svg | null, mouth: svg | null, extra: svg }
// ctx: { ink, dark, skin (lid colour), my (mouth y), female, eyeXs }
export function exprParts(i, ctx) {
    const { ink, my, female, skin } = ctx, ey = -2;
    const bw = female ? 1.9 : 2.8;
    const st = (w = 2.6, c = ink) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
    // brows: inner end (towards the nose) and outer end heights
    const brow = (inY, outY, arch = 0) => (x, s) => { const xi = x - s * 6, xo = x + s * 6; return `<path d="M${xi} ${inY}Q${x} ${Math.min(inY, outY) - 2 - arch} ${xo} ${outY}" ${st(bw)} opacity=".9"/>`; };
    const browOne = (raisedSide, a, b) => (x, s) => (s === raisedSide ? a : b)(x, s);
    const E = {
        happy: x => `<path d="M${x - 6} ${ey + 1}Q${x} ${ey - 7} ${x + 6} ${ey + 1}" ${st(2.8)}/>`,
        calm: x => `<path d="M${x - 6} ${ey - 1}Q${x} ${ey + 5} ${x + 6} ${ey - 1}" ${st(2.6)}/>`,
        line: x => `<path d="M${x - 6} ${ey}H${x + 6}" ${st(2.6)}/>`,
        big: x => `<circle cx="${x}" cy="${ey}" r="7.5" fill="#fff" stroke="${OUT}" stroke-width="1.6"/><circle cx="${x}" cy="${ey}" r="2.6" fill="#1a1a22"/>`,
        tiny: x => `<ellipse cx="${x}" cy="${ey}" rx="6.5" ry="7" fill="#fff" stroke="${OUT}" stroke-width="1.5"/><circle cx="${x}" cy="${ey + 0.5}" r="1.5" fill="#1a1a22"/>`,
        rolled: x => `<ellipse cx="${x}" cy="${ey}" rx="6.5" ry="6" fill="#fff" stroke="${OUT}" stroke-width="1.5"/><circle cx="${x + 1}" cy="${ey - 3.4}" r="2.6" fill="#1a1a22"/>`,
        heart: x => `<path d="M${x} ${ey + 6}c-11 -7 -6 -15 0 -9c6 -6 11 2 0 9Z" fill="#ff3d6e" stroke="#a3123a" stroke-width="1.2"/><circle cx="${x - 3}" cy="${ey - 4}" r="1.3" fill="#fff"/>`,
        squeeze: (x, s) => `<path d="M${x - s * 5} ${ey - 5}L${x + s * 4} ${ey}L${x - s * 5} ${ey + 5}" ${st(2.8)}/>`,
        spiral: x => `<path d="M${x} ${ey}m0 -1a1.2 1.2 0 1 1 -1.2 1.4a2.6 2.6 0 1 1 3.2 2.4a4 4 0 1 1 -5.6 -4.6a5.6 5.6 0 1 1 1.6 10" ${st(1.6)}/>`,
        // half-closed lids over the normal eye (도도 · 시크 · 짜증 · 음흉)
        lid: (k = 0.55, tilt = 0) => (x, s) => { const y = ey - 7 + 9 * k, t = s * tilt; return `<path d="M${x - 9} ${ey - 10}H${x + 9}V${y - t}Q${x} ${y + 1.4} ${x - 9} ${y + t}Z" fill="${skin}"/><path d="M${x - 8} ${y + t}Q${x} ${y + 1.8} ${x + 8} ${y - t}" ${st(2.4)}/>`; }
    };
    const M = {
        open: `<path d="M-10 ${my - 4}Q0 ${my + 12} 10 ${my - 4}Z" fill="#a8323a" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/><path d="M-5 ${my + 2.5}Q0 ${my + 6} 5 ${my + 2.5}" fill="#ff8a9a"/>`,
        smile: `<path d="M-9 ${my - 3}Q0 ${my + 6} 9 ${my - 3}" ${st()}/>`,
        frown: `<path d="M-8 ${my + 4}Q0 ${my - 4} 8 ${my + 4}" ${st()}/>`,
        o: `<ellipse cx="0" cy="${my + 1}" rx="4.6" ry="5.8" fill="#a8323a" stroke="${ink}" stroke-width="2"/>`,
        small: `<circle cx="0" cy="${my + 1}" r="2.4" fill="#a8323a" stroke="${ink}" stroke-width="1.4"/>`,
        flat: `<path d="M-6 ${my}H6" ${st()}/>`,
        side: `<path d="M-4 ${my + 1}H8" ${st()}/>`,
        smirk: `<path d="M-6 ${my + 1}Q2 ${my + 3} 9 ${my - 4}" ${st()}/>`,
        grin: `<path d="M-11 ${my - 3}Q0 ${my + 11} 11 ${my - 3}Q0 ${my + 1} -11 ${my - 3}Z" fill="#fff" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/><path d="M-5 ${my + 1}V${my + 4}M0 ${my + 1.5}V${my + 5}M5 ${my + 1}V${my + 4}" stroke="${OUT}" stroke-width="1" opacity=".6"/>`,
        grimace: `<rect x="-9" y="${my - 4}" width="18" height="8" rx="3" fill="#fff" stroke="${ink}" stroke-width="2"/><path d="M-9 ${my}H9M-4.5 ${my - 4}V${my + 4}M0 ${my - 4}V${my + 4}M4.5 ${my - 4}V${my + 4}" stroke="${OUT}" stroke-width="1"/>`,
        wail: `<ellipse cx="0" cy="${my + 2}" rx="10" ry="8" fill="#a8323a" stroke="${ink}" stroke-width="2"/><ellipse cx="0" cy="${my + 6}" rx="5.5" ry="3" fill="#ff8a9a"/>`,
        tongue: `<path d="M-9 ${my - 3}Q0 ${my + 5} 9 ${my - 3}" ${st()}/><path d="M-1 ${my + 1}Q-2 ${my + 10} 4 ${my + 10}Q9 ${my + 9} 7 ${my - 0.5}Z" fill="#ff7b93" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 ${my + 2}V${my + 7}" stroke="#d94a68" stroke-width="1"/>`,
        wobble: `<path d="M-8 ${my}Q-4 ${my - 3} 0 ${my}Q4 ${my + 3} 8 ${my}" ${st()}/>`,
        zigzag: `<path d="M-9 ${my + 1}L-5.5 ${my - 2}L-2 ${my + 1}L1.5 ${my - 2}L5 ${my + 1}L8.5 ${my - 2}" ${st(2.2)}/>`,
        laugh: `<path d="M-11 ${my - 4}Q0 ${my + 15} 11 ${my - 4}Z" fill="#a8323a" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/><path d="M-6 ${my + 4}Q0 ${my + 9} 6 ${my + 4}" fill="#ff8a9a"/><path d="M-9 ${my - 3}H9" stroke="#fff" stroke-width="2.4"/>`
    };
    const X = {
        tear: (x, big) => `<path d="M${x} ${ey + 6}q-3.4 5.4 0 7.2q3.4 -1.8 0 -7.2Z" fill="#7ac8ff" stroke="#3f8fd0" stroke-width=".9"/>` + (big ? `<path d="M${x} ${ey + 4}V36" stroke="#7ac8ff" stroke-width="4" stroke-linecap="round" opacity=".85"/>` : ""),
        sweat: `<path d="M31 -24q-4.5 7 0 9.5q4.5 -2.5 0 -9.5Z" fill="#bfe6ff" stroke="#3f8fd0" stroke-width="1.1"/>`,
        vein: `<g transform="translate(24 -24)" fill="none" stroke="#e2463f" stroke-width="2.2" stroke-linecap="round"><path d="M-5 -2q3 0 3 -3M5 -2q-3 0 -3 -3M-5 2q3 0 3 3M5 2q-3 0 -3 3"/></g>`,
        blush: `<ellipse cx="-23" cy="9" rx="9" ry="5" fill="#ff6f8a" opacity=".55"/><ellipse cx="23" cy="9" rx="9" ry="5" fill="#ff6f8a" opacity=".55"/><path d="M-28 7l2 4M-24 7l2 4M-20 7l2 4M20 7l2 4M24 7l2 4M28 7l2 4" stroke="#e2466a" stroke-width="1" opacity=".7"/>`,
        zz: `<text x="26" y="-24" font-family="Arial Black,Arial" font-weight="900" font-size="11" fill="#5f8bff">z</text><text x="33" y="-33" font-family="Arial Black,Arial" font-weight="900" font-size="8" fill="#5f8bff">z</text>`,
        steam: [-1, 1].map(s => `<path d="M${s * 36} -4q${s * 6} -2 ${s * 6} -7q${s * 5} 1 ${s * 6} -5" fill="none" stroke="#b8c4d0" stroke-width="2.6" stroke-linecap="round"/>`).join(""),
        sparkle: `<path d="M33 -22l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6Z" fill="#ffd83b" stroke="#c98b00" stroke-width=".8"/>`,
        fear: `<path d="M-12 -32V-22M-4 -34V-22M4 -34V-22M12 -32V-22" stroke="#5f8bff" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>`,
        stars: `<path d="M-30 -30l1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2Z M30 -32l1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2Z" fill="#ffd83b" stroke="#c98b00" stroke-width=".7"/>`,
        heartPop: `<path d="M32 -26c-6 -4 -3 -9 0 -5c3 -4 6 1 0 5Z" fill="#ff3d6e"/>`
    };
    const xs = ctx.eyeXs || [-15, 15];
    switch (i) {
        case 0: return { eyes: E.happy, brows: brow(-16, -16, 1), mouth: M.open, extra: "" };
        case 1: return { eyes: null, lid: E.lid(0.5, 0.6), brows: browOne(1, brow(-19, -16, 2), brow(-15, -15)), mouth: M.smirk, extra: "" };
        case 2: return { eyes: null, brows: brow(-19, -12), mouth: M.frown, extra: X.tear(xs[0] - 1) };
        case 3: return { eyes: null, brows: brow(-10, -19), mouth: M.grimace, extra: X.vein };
        case 4: return { eyes: E.big, brows: brow(-22, -21, 2), mouth: M.o, extra: "" };
        case 5: return { eyes: (x, s) => s > 0 ? E.happy(x) : null, brows: brow(-16, -16, 1), mouth: M.smile, extra: X.sparkle };
        case 6: return { eyes: E.heart, brows: brow(-17, -16, 1), mouth: M.open, extra: X.heartPop };
        case 7: return { eyes: E.calm, brows: brow(-14, -13), mouth: M.small, extra: X.zz };
        case 8: return { eyes: E.squeeze, brows: brow(-19, -12), mouth: M.wail, extra: xs.map(x => X.tear(x, true)).join("") };
        case 9: return { eyes: (x, s) => s > 0 ? E.happy(x) : null, brows: brow(-16, -17, 1), mouth: M.tongue, extra: "" };
        case 10: return { eyes: null, lid: E.lid(0.45), brows: brow(-14, -14), mouth: M.flat, extra: "" };
        case 11: return { eyes: null, lid: E.lid(0.55, -1.2), brows: brow(-11, -18), mouth: M.grin, extra: "" };
        case 12: return { eyes: null, brows: brow(-19, -13), mouth: M.wobble, extra: X.sweat };
        case 13: return { eyes: E.squeeze, brows: brow(-18, -18, 2), mouth: M.laugh, extra: X.stars };
        case 14: return { eyes: null, brows: brow(-18, -14), mouth: M.wobble, extra: X.blush };
        case 15: return { eyes: null, lid: E.lid(0.45), brows: brow(-10, -17), mouth: M.frown, extra: X.steam };
        case 16: return { eyes: E.rolled, brows: brow(-17, -15), mouth: M.side, extra: "" };
        case 17: return { eyes: E.tiny, brows: brow(-21, -14), mouth: M.zigzag, extra: X.fear + X.sweat };
        case 18: return { eyes: null, brows: browOne(-1, brow(-21, -19, 2), brow(-13, -15)), mouth: M.smirk, extra: X.sparkle };
        case 19: return { eyes: E.spiral, brows: brow(-17, -15), mouth: M.wobble, extra: X.stars };
    }
    return null;
}

// ------------------------------------------------------------ 👙 swimwear / lingerie
// only these races wear it (Human Form · Main/Other Animal · Kalisto · Dungi) — never a Baby
export const SWIM_RACES = ["human", "kalisto", "dungi", "rabbit", "bunny", "bear", "teddy", "rat", "cat", "dog", "bird", "hippo", "lion", "tiger", "horse", "pig", "dolphin", "panda", "kangaroo", "fox", "snake", "giraffe", "animal"];
// women: [name, type, colour, accent, pattern]
const SWIM_F = [
    ["레드 트라이앵글 비키니", "tri", "#e2463f", "#ffffff", ""], ["블랙 트라이앵글 비키니", "tri", "#25232a", "#e8b923", ""], ["플라워 프린트 비키니", "tri", "#ff9fc0", "#ffffff", "dots"],
    ["네이비 스트라이프 반두 비키니", "bandeau", "#243a66", "#ffffff", "stripe"], ["레몬 반두 비키니", "bandeau", "#ffd84a", "#ff7ab8", ""], ["화이트 홀터넥 비키니", "halter", "#f7f7f5", "#3f7df0", ""],
    ["민트 스포티 비키니", "sport", "#58d6b3", "#ffffff", ""], ["핑크 프릴 비키니", "frill", "#ff7ab8", "#ffffff", ""], ["호피 비키니", "tri", "#e0ac69", "#3a2a24", "leopard"],
    ["블랙 원피스 수영복", "onepiece", "#25232a", "#e8b923", ""], ["레드 원피스 수영복", "onepiece", "#d6332c", "#ffffff", ""], ["네이비 하이넥 원피스 수영복", "highneck", "#243a66", "#ffffff", "stripe"],
    ["화이트 컷아웃 원피스 수영복", "cutout", "#f7f7f5", "#e8b923", ""], ["블루 모노키니", "monokini", "#3f7df0", "#9ed0f5", ""], ["블랙 레이스 란제리", "lace", "#1c1a1e", "#e8b923", ""],
    ["레드 레이스 란제리", "lace", "#c0392b", "#1c1a1e", ""], ["화이트 브라이덜 란제리", "lace", "#fbf7f0", "#e8c9b8", "garter"], ["라벤더 베이비돌", "babydoll", "#c8b0f0", "#ffffff", ""],
    ["와인 코르셋 란제리", "corset", "#7a2038", "#1c1a1e", ""], ["샴페인 실크 슬립", "slip", "#f1e0c0", "#c9a27a", ""]
];
// men: body type × swim trunks (4 each)
const BODY_M = [["muscle", "근육질 몸"], ["normal", "일반 몸"], ["slim", "마른 몸"], ["belly", "배불뚝이 몸"], ["fat", "뚱뚱한 몸"]];
const TRUNKS = [["네이비 수영 팬츠", "#243a66", ""], ["레드 하와이안 수영 팬츠", "#d6332c", "dots"], ["블랙 사이드라인 수영 팬츠", "#25232a", "side"], ["스카이 스트라이프 수영 팬츠", "#7ad7ff", "stripe"]];
const SWIM_M = BODY_M.flatMap(([b, bn]) => TRUNKS.map(([tn, c, pat]) => [`${bn} + ${tn}`, b, c, "#ffffff", pat]));
export const SWIM_SEASON = ["swim", "수영복 · 란제리"];
export const swimNames = gender => (gender === "female" ? SWIM_F : SWIM_M).map(x => x[0]);
export const swimSpec = (gender, i) => { const L = gender === "female" ? SWIM_F : SWIM_M; return L[Math.max(0, Math.min(L.length - 1, i | 0))]; };
// how wide the arms are for a man's body type
export const swimArm = spec => ({ muscle: 13, belly: 11, fat: 14, slim: 9 }[spec?.[1]] || 10);

// the torso: bare skin + the suit (humanoid frame, the torso sits at y 112..192, shoulders at x 101 / 155)
// skinFill / line: skin paint + outline · fur: optional { filter, tex } for curly fur
export function swimTorso(female, spec, skinFill, skin, line, fur = null) {
    const [, type, c, acc, pat] = spec;
    const S = (w = 3) => `stroke="${OUT}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
    const sd = isHex(skin) ? shade(skin, lum(skin) < 0.3 ? 0.3 : -0.22) : OUT;
    const patDef = pat === "stripe" ? `<pattern id="swp" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="3.2" fill="${acc}"/></pattern>`
        : pat === "dots" ? `<pattern id="swp" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.4" fill="${acc}"/><circle cx="8.5" cy="8.5" r="1.6" fill="#ffd84a"/></pattern>`
            : pat === "leopard" ? `<pattern id="swp" width="14" height="12" patternUnits="userSpaceOnUse"><path d="M2 3q3 -2 5 1q-1 3 -4 2zM9 8q3 -1 4 2q-2 2 -4 0z" fill="none" stroke="${acc}" stroke-width="1.6"/><circle cx="4.5" cy="4.5" r="1.1" fill="#8a5a2a"/></pattern>` : "";
    const piece = d => `<path d="${d}" fill="${c}" ${S(2.6)}/>` + (patDef ? `<path d="${d}" fill="url(#swp)"/><path d="${d}" fill="none" ${S(2.6)}/>` : "");
    const skinPath = d => (fur ? woolEdge(`<path d="${d}" WOOL/>`, skinFill, line) : `<path d="${d}" fill="${skinFill}" stroke="${line}" stroke-width="3.5" stroke-linejoin="round"/>`);
    const navel = (y = 166) => `<path d="M128 ${y - 2}q-1.8 2.4 0 4.4" fill="none" stroke="${sd}" stroke-width="1.8" stroke-linecap="round"/>`;
    let s = `<defs>${patDef}</defs>`;
    if (!female) {
        const b = spec[1];
        const body = {
            slim: "M103 119Q128 113 153 119L151 176Q128 181 105 176Z",
            normal: "M99 119Q128 112 157 119L159 176Q128 182 97 176Z",
            muscle: "M92 119Q128 110 164 119Q167 140 157 154L158 176Q128 182 98 176L99 154Q89 140 92 119Z",
            belly: "M99 119Q128 112 157 119Q175 150 160 178Q128 188 96 178Q81 150 99 119Z",
            fat: "M93 119Q128 110 163 119Q185 150 168 180Q128 192 88 180Q71 150 93 119Z"
        }[b] || "M99 119Q128 112 157 119L159 176Q128 182 97 176Z";
        s += skinPath(body);
        const ln = d => `<path d="${d}" fill="none" stroke="${sd}" stroke-width="1.8" stroke-linecap="round"/>`;
        const nip = `<circle cx="115" cy="139" r="1.6" fill="${sd}"/><circle cx="141" cy="139" r="1.6" fill="${sd}"/>`;
        if (b === "slim") s += ln("M110 142q6 2 12 0M134 142q6 2 12 0M111 149q6 2 11 0M134 149q6 2 11 0") + nip + navel(167);
        if (b === "normal") s += ln("M106 142Q117 147 126 142M130 142Q139 147 150 142") + nip + navel(166);
        if (b === "muscle") s += ln("M102 128Q114 148 127 141M129 141Q142 148 154 128M128 146V170M118 152h20M119 160h18M120 167h16M100 150q4 6 8 8M156 150q-4 6 -8 8") + nip;
        if (b === "belly") s += ln("M106 140Q117 145 126 140M130 140Q139 145 150 140") + nip + `<path d="M104 152Q128 186 152 152" fill="none" stroke="${isHex(skin) ? shade(skin, 0.25) : "#fff"}" stroke-width="3" opacity=".7"/>` + navel(170);
        if (b === "fat") s += ln("M101 138Q114 152 126 143M130 143Q142 152 155 138M98 164Q128 182 158 164") + nip + navel(172);
        // 🩳 swim trunks peeking out at the bottom of the picture
        const w = { slim: 24, normal: 31, muscle: 30, belly: 33, fat: 40 }[b] || 31, y0 = { belly: 174, fat: 176 }[b] || 171;
        const tr = `M${128 - w} ${y0}Q128 ${y0 + 5} ${128 + w} ${y0}L${128 + w + 3} 196H${128 - w - 3}Z`;
        s += piece(tr) + `<path d="M${128 - w + 1} ${y0 + 4.5}Q128 ${y0 + 9.5} ${128 + w - 1} ${y0 + 4.5}" fill="none" stroke="${shade(c, lum(c) < 0.3 ? 0.35 : -0.3)}" stroke-width="2.4"/>` +
            `<path d="M126 ${y0 + 8}l-2 7M130 ${y0 + 8}l2 7" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>` +
            (pat === "side" ? `<path d="M${128 - w + 3} ${y0 + 3}L${128 - w + 1} 196M${128 + w - 3} ${y0 + 3}L${128 + w - 1} 196" stroke="#ffffff" stroke-width="3.4"/>` : "");
        return s;
    }
    // 👩 women
    const body = "M102 119Q128 113 154 119Q150 140 151 156Q160 170 158 186Q128 192 98 186Q96 170 105 156Q106 140 102 119Z";
    s += skinPath(body) + `<path d="M108 141Q117 149 126 142M130 142Q139 149 148 141" fill="none" stroke="${sd}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>` + navel(166);
    const strap = (d, w = 2.4) => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${w + 1.6}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    const lace = d => `<path d="${d}" fill="none" stroke="${acc}" stroke-width="2.4" stroke-dasharray="1.2 2.4" stroke-linecap="round"/>`;
    const bow = (x, y, col = acc) => `<path d="M${x} ${y}l-5 -3v6Zm0 0l5 -3v6Z" fill="${col}" stroke="${OUT}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="1.5" fill="${col}" stroke="${OUT}" stroke-width=".8"/>`;
    const triCups = piece("M107 144L116 127L127 143Q117 149 107 144Z") + piece("M129 143L140 127L149 144Q139 149 129 143Z");
    const roundCups = piece("M106 145Q105 131 117 130Q127 132 127 143Q117 149 106 145Z") + piece("M129 143Q129 132 139 130Q151 131 150 145Q139 149 129 143Z");
    const bikiniBottom = piece("M101 174Q128 179 155 174L150 184Q138 186 128 196Q118 186 106 184Z") + bow(101, 176) + bow(155, 176);
    const brief = piece("M100 173Q128 178 156 173L154 186Q138 188 128 197Q118 188 102 186Z");
    const onePiece = "M106 128Q117 140 128 134Q139 140 150 128L151 156Q160 170 158 186Q140 188 128 198Q116 188 98 186Q96 170 105 156Z";
    switch (type) {
        case "tri": s += strap("M116 128L119 112M140 128L137 112") + strap("M103 145Q117 150 127 143M129 143Q139 150 153 145", 2) + triCups + bow(128, 143) + bikiniBottom; break;
        case "halter": s += strap("M116 128L126 110M140 128L130 110") + strap("M103 145Q117 150 127 143M129 143Q139 150 153 145", 2) + triCups + bikiniBottom; break;
        case "bandeau": s += piece("M104 131Q128 127 152 131L151 146Q128 151 105 146Z") + `<path d="M124 130Q128 139 124 148M132 130Q128 139 132 148" fill="none" stroke="${shade(c, -0.3)}" stroke-width="1.8"/>` + bikiniBottom; break;
        case "frill": s += piece("M104 131Q128 127 152 131L151 145Q128 150 105 145Z") + `<path d="M104 145q4 6 8 0q4 6 8 0q4 6 8 0q4 6 8 0q4 6 8 0q4 6 8 0" fill="${shade(c, 0.35)}" ${S(2)}/>` + bikiniBottom + `<path d="M101 174q4 6 9 1q5 6 9 1q5 6 9 1q5 6 9 1q5 6 9 1q5 6 9 0" fill="none" stroke="${shade(c, 0.35)}" stroke-width="2.6"/>`; break;
        case "sport": s += strap("M104 128L113 113M152 128L143 113", 5) + piece("M103 127Q117 137 128 133Q139 137 153 127L153 150Q128 155 103 150Z") + `<path d="M104 146Q128 151 152 146" stroke="${acc}" stroke-width="3"/>` + piece("M100 172Q128 177 156 172L157 196H99Z") + `<path d="M101 177Q128 182 155 177" stroke="${acc}" stroke-width="3" fill="none"/>`; break;
        case "onepiece": s += strap("M109 130L116 112M147 130L140 112", 3) + piece(onePiece) + `<path d="M110 150Q128 158 146 150" fill="none" stroke="${acc}" stroke-width="1.6" opacity=".6"/>`; break;
        case "highneck": s += piece("M114 112Q128 118 142 112L153 126Q150 140 151 156Q160 170 158 186Q140 188 128 198Q116 188 98 186Q96 170 105 156Q106 140 103 126Z") + `<path d="M114 113Q128 119 142 113" fill="none" stroke="${acc}" stroke-width="2.4"/>`; break;
        case "cutout": s += strap("M109 130L116 112M147 130L140 112", 3) + piece(onePiece) + `<ellipse cx="128" cy="158" rx="10" ry="7" fill="${skinFill}" ${S(2.4)}/>` + `<circle cx="128" cy="150" r="2.6" fill="${acc}" ${S(1)}/>`; break;
        case "monokini": s += strap("M116 128L126 110M140 128L130 110") + piece(onePiece) + [-1, 1].map(k => `<path d="M${128 + k * 23} 148Q${128 + k * 12} 160 ${128 + k * 26} 176Q${128 + k * 32} 162 ${128 + k * 25} 150Z" fill="${skinFill}" stroke="${OUT}" stroke-width="2.2"/>`).join("") + `<circle cx="128" cy="142" r="3" fill="${acc}" ${S(1)}/>`; break;
        case "lace": s += strap("M112 131L118 112M144 131L138 112", 1.6) + roundCups + lace("M107 136Q116 128 126 137M130 137Q140 128 149 136") + bow(128, 142) + brief + lace("M101 175Q128 180 155 175") +
            (pat === "garter" ? strap("M100 178Q128 184 156 178", 3) + strap("M106 182L104 198M150 182L152 198", 1.6) : ""); break;
        case "babydoll": s += strap("M112 131L118 112M144 131L138 112", 1.6) + roundCups + bow(128, 143) + `<path d="M104 145Q128 152 152 145L170 198H86Z" fill="${c}" fill-opacity=".45" stroke="${shade(c, -0.3)}" stroke-width="1.6"/>` + lace("M104 146Q128 153 152 146") + lace("M88 194H168"); break;
        case "corset": s += roundCups + piece("M104 144Q128 150 152 144Q149 156 152 160Q158 170 156 182H100Q98 170 104 160Q107 156 104 144Z") +
            `<path d="M124 150L132 156L124 162L132 168L124 174M132 150L124 156L132 162L124 168L132 174" fill="none" stroke="${acc}" stroke-width="1.4"/>` + lace("M106 138Q116 129 126 138M130 138Q140 129 150 138") + brief.replace(/fill="[^"]*"/, `fill="${acc}"`); break;
        case "slip": s += strap("M110 132L117 112M146 132L139 112", 1.4) + piece("M106 130Q117 142 128 137Q139 142 150 130L152 156Q166 176 170 198H86Q90 176 104 156Z") + lace("M107 132Q117 143 128 138Q139 143 149 132") + `<path d="M140 150Q146 172 150 194" stroke="#ffffff" stroke-width="3" opacity=".45" fill="none"/>`; break;
    }
    return s;
}

// ------------------------------------------------------------ 🐑 curly fur (filter + texture), put into <defs>
export function furDefs(skin) {
    const d = isHex(skin) ? (lum(skin) > 0.8 ? "#c9c2bb" : shade(skin, lum(skin) < 0.3 ? 0.3 : -0.22)) : "#ffffff";
    const l = isHex(skin) ? shade(skin, 0.35) : "#ffffff";
    return `<filter id="fz" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="1" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G"/></filter>` +
        `<pattern id="fzp" width="11" height="10" patternUnits="userSpaceOnUse"><path d="M1.5 5.5c.6 -3 4.6 -3.2 4.8 -.2c.1 2 -2.6 2.4 -2.8 .6" fill="none" stroke="${d}" stroke-width="1.1" stroke-linecap="round" opacity=".75"/><path d="M6.8 9.4c.4 -2.2 3.4 -2.4 3.6 -.2" fill="none" stroke="${l}" stroke-width="1" stroke-linecap="round" opacity=".7"/><path d="M7 2c.3 -1.6 2.6 -1.8 2.8 0" fill="none" stroke="${d}" stroke-width=".9" stroke-linecap="round" opacity=".6"/></pattern>`;
}
// wrap skin parts: a soft wavy edge (filter) + the curl texture painted over the same shapes
export function furWrap(svg, skinPaint) {
    if (!svg) return svg;
    const tex = svg.split(`fill="${skinPaint}"`).join(`fill="url(#fzp)"`).replace(/stroke="(?!url)[^"]*"/g, 'stroke="none"');
    return `<g filter="url(#fz)">${svg}</g><g>${tex}</g>`;
}
// 🐑 a scalloped "wool" edge for a shape: round bumps all along the outline (dark rim, then the skin colour on top)
export function woolEdge(shape, skinPaint, line, w = 3.5, gap = 7) {
    const sh = a => shape.replace("WOOL", a);
    return sh(`fill="${skinPaint}" stroke="${line}" stroke-width="${w + 7}" stroke-dasharray="0 ${gap}" stroke-linecap="round"`) +
        sh(`fill="${skinPaint}" stroke="${skinPaint}" stroke-width="${w + 3.6}" stroke-dasharray="0 ${gap}" stroke-linecap="round"`) +
        sh(`fill="url(#fzp)" opacity=".7"`);
}
