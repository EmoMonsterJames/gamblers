// =====================================================================
// 🪆 Doll Factory art — creepy dolls + ghosts (inline SVG strings), and the full-screen apparition face.
//   dollSvg(kind)   kinds: frizz (sepia porcelain, wild blonde hair) · stitch (orange pigtails, stitched red mouth) ·
//                   cracked (white cracked porcelain, hollow eyes) · goth (black bangs, striped bows, huge eyes) ·
//                   redeye (glowing red eyes in the dark) · baby (bald baby doll in a blue dress) · ghost (pale girl in white)
//   apparitionSvg() a huge, faint doll-ghost face that fills the screen
// Every call gets its own gradient ids, so many can be on the page at once.
// =====================================================================
let N = 0;
export const DOLL_KINDS = ["frizz", "stitch", "cracked", "goth", "redeye", "baby", "ghost"];
const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
const cracks = (col, w = 1.2) => `<g fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"><path d="M58 30l-4 10 5 6-3 10"/><path d="M54 40l-7 4"/><path d="M76 34l3 9-4 7 2 8"/><path d="M79 43l6 3"/><path d="M44 66l-5 6 2 6"/></g>`;

export function dollSvg(kind = "frizz") {
    const i = ++N, g = id => `${id}${i}`;
    switch (kind) {
        case "frizz": return svg("0 0 120 160", `
<defs><radialGradient id="${g("fz")}" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#d9c9a6"/><stop offset=".75" stop-color="#9c8a68"/><stop offset="1" stop-color="#4a3d2c"/></radialGradient></defs>
<g class="dl-hair" fill="none" stroke="#c9a46a" stroke-width="1.6" stroke-linecap="round" opacity=".95">${Array.from({ length: 34 }, (_, k) => { const a = (k / 34) * Math.PI * 2; const r1 = 30, r2 = 44 + (k % 5) * 4; return `<path d="M${60 + r1 * Math.cos(a)} ${58 + r1 * 0.95 * Math.sin(a)}Q${60 + (r1 + 10) * Math.cos(a + 0.3)} ${58 + (r1 + 8) * Math.sin(a + 0.3)} ${60 + r2 * Math.cos(a)} ${62 + r2 * Math.sin(a)}"/>`; }).join("")}</g>
<path d="M30 160C30 128 42 112 60 110C78 112 90 128 90 160Z" fill="#8c7a66"/><path d="M38 160C40 132 48 120 60 118C72 120 80 132 82 160Z" fill="#b6a58e"/>
<path d="M40 112Q60 124 80 112L76 122Q60 132 44 122Z" fill="#e7dcc6" stroke="#6b5a48" stroke-width="1"/><g fill="#6b5a48"><circle cx="48" cy="118" r="1.2"/><circle cx="54" cy="121" r="1.2"/><circle cx="60" cy="122" r="1.2"/><circle cx="66" cy="121" r="1.2"/><circle cx="72" cy="118" r="1.2"/></g>
<circle cx="74" cy="128" r="5" fill="#9aa3ad" stroke="#3a3a3a" stroke-width="1.4"/><circle cx="74" cy="128" r="2" fill="#5a6470"/>
<ellipse cx="60" cy="58" rx="27" ry="31" fill="url(#${g("fz")})" stroke="#3a2e22" stroke-width="1.6"/>
<path d="M34 40Q60 22 86 40Q80 30 60 26Q40 30 34 40Z" fill="#c9a46a"/>
${cracks("#3a2e22")}
<g><circle cx="48" cy="58" r="9" fill="#2a1d14" opacity=".55"/><circle cx="72" cy="58" r="9" fill="#2a1d14" opacity=".55"/>
<circle cx="48" cy="58" r="6.4" fill="#e9dcc0"/><circle cx="72" cy="58" r="6.4" fill="#e9dcc0"/>
<circle class="dl-eye" cx="48" cy="58" r="3.4" fill="#7a4e1c"/><circle class="dl-eye" cx="72" cy="58" r="3.4" fill="#7a4e1c"/><circle cx="48" cy="58" r="1.6" fill="#0b0705"/><circle cx="72" cy="58" r="1.6" fill="#0b0705"/></g>
<path d="M58 66q2 4 4 0" fill="none" stroke="#4a3a2a" stroke-width="1.2"/><path d="M55 76q5 3 10 0q-5 -3 -10 0z" fill="#5a2a22"/>
<path d="M41 50q7 -4 13 0M66 50q7 -4 13 0" stroke="#4a3a2a" stroke-width="1.2" fill="none"/>`);
        case "stitch": return svg("0 0 120 160", `
<path d="M24 34C10 42 8 70 18 86L30 74C24 62 26 46 32 40ZM96 34C110 42 112 70 102 86L90 74C96 62 94 46 88 40Z" fill="#e58a3a" stroke="#5a2a10" stroke-width="1.6"/>
<g stroke="#5a2a10" stroke-width="1" opacity=".6"><path d="M14 52l8 6M16 66l8 4M106 52l-8 6M104 66l-8 4"/></g>
<path d="M22 160C24 124 40 108 60 106C80 108 96 124 98 160Z" fill="#efe0c0" stroke="#5a3a2a" stroke-width="1.6"/>
<path d="M30 150Q60 160 90 150" stroke="#c0392b" stroke-width="3" fill="none"/><path d="M40 122H80" stroke="#c0392b" stroke-width="3"/>
<path d="M44 108Q60 118 76 108L74 116Q60 124 46 116Z" fill="#f6ead2" stroke="#c0392b" stroke-width="1.4"/>
<ellipse cx="60" cy="60" rx="30" ry="32" fill="#efe2c6" stroke="#4a2a1a" stroke-width="1.8"/>
<path d="M30 52C32 26 88 26 90 52C84 38 70 32 60 40C50 32 36 38 30 52Z" fill="#e58a3a" stroke="#5a2a10" stroke-width="1.4"/>
<path d="M38 46q10 -6 18 -1M64 45q8 -5 18 1" stroke="#c0392b" stroke-width="3" fill="none" stroke-linecap="round"/>
<g><circle cx="47" cy="58" r="9" fill="#5a1414"/><circle cx="73" cy="58" r="9" fill="#5a1414"/><circle cx="47" cy="58" r="6.6" fill="#c0392b"/><circle cx="73" cy="58" r="6.6" fill="#c0392b"/>
<circle class="dl-eye" cx="47" cy="58" r="3.6" fill="#1a0505"/><circle class="dl-eye" cx="73" cy="58" r="3.6" fill="#1a0505"/><circle cx="48" cy="56.5" r="1" fill="#fff"/><circle cx="74" cy="56.5" r="1" fill="#fff"/></g>
<path d="M58 68l2 4 2 -4" fill="#b0705a"/>
<path d="M38 78Q60 90 82 78Q78 86 60 90Q42 86 38 78Z" fill="#7a1010" stroke="#3a0505" stroke-width="1.4"/>
<g stroke="#f4ead6" stroke-width="1.6">${[42, 47, 52, 57, 62, 67, 72, 77].map(x => `<path d="M${x} 78L${x + 1} 88"/>`).join("")}</g>
<g stroke="#2a0a0a" stroke-width="1.2">${[40, 46, 52, 58, 64, 70, 76].map(x => `<path d="M${x} 74l3 6M${x + 3} 74l-3 6"/>`).join("")}</g>
<g fill="none" stroke="#7a1a1a" stroke-width="1.2"><path d="M34 70q4 6 2 12M86 70q-4 6 -2 12"/></g>`);
        case "cracked": return svg("0 0 120 160", `
<defs><radialGradient id="${g("ck")}" cx="45%" cy="35%" r="65%"><stop offset="0" stop-color="#fbfaf6"/><stop offset=".7" stop-color="#d9d4c8"/><stop offset="1" stop-color="#6e6a62"/></radialGradient></defs>
<g fill="none" stroke="#2a2420" stroke-width="1.4" opacity=".8"><path d="M30 46C18 70 22 110 26 140"/><path d="M90 46C102 70 98 110 94 140"/><path d="M36 40C28 66 30 96 34 120"/><path d="M84 40C92 66 90 96 86 120"/></g>
<g fill="none" stroke="#e8e6e0" stroke-width=".8" opacity=".9"><path d="M44 30C40 70 46 110 42 158"/><path d="M78 32C84 74 74 112 82 158"/></g>
<path d="M24 160C26 126 42 112 60 110C78 112 94 126 96 160Z" fill="#e6e1d6" stroke="#5a5048" stroke-width="1.4"/>
<g fill="none" stroke="#a49c8e" stroke-width="1"><path d="M30 140q6 -6 12 0t12 0t12 0t12 0t12 0"/><path d="M34 126q6 -5 12 0t12 0t12 0t12 0"/></g>
<ellipse cx="60" cy="60" rx="29" ry="33" fill="url(#${g("ck")})" stroke="#4a4038" stroke-width="1.6"/>
<path d="M32 46C36 22 84 22 88 46C78 32 66 30 60 36C54 30 42 32 32 46Z" fill="#3a3028" opacity=".85"/>
${cracks("#2a2018", 1.4)}<path d="M64 60l6 8 -2 8 5 6" fill="none" stroke="#2a2018" stroke-width="1.2"/><path d="M50 82l3 -4 6 2" fill="none" stroke="#7a2a20" stroke-width="1.4"/>
<g><ellipse cx="47" cy="60" rx="8.5" ry="10" fill="#0b0908"/><ellipse cx="73" cy="60" rx="8.5" ry="10" fill="#0b0908"/>
<circle class="dl-glint" cx="49" cy="57" r="1.2" fill="#9a9a9a"/><circle class="dl-glint" cx="75" cy="57" r="1.2" fill="#9a9a9a"/></g>
<path d="M58 72l2 4 2 -4" fill="#a89c90"/><path d="M53 82q7 4 14 0" fill="none" stroke="#3a2a24" stroke-width="1.6"/>`);
        case "goth": return svg("0 0 120 160", `
<g fill="#111"><path d="M18 26C6 34 6 60 14 76C22 66 26 52 30 40Z"/><path d="M102 26C114 34 114 60 106 76C98 66 94 52 90 40Z"/></g>
<g><path d="M8 22l16 6 -2 14 -14 -4Z" fill="#eee"/><path d="M8 22l16 6M10 30l14 4M9 38l13 3" stroke="#111" stroke-width="2.4"/>
<path d="M112 22l-16 6 2 14 14 -4Z" fill="#eee"/><path d="M112 22l-16 6M110 30l-14 4M111 38l-13 3" stroke="#111" stroke-width="2.4"/></g>
<path d="M24 160C26 128 42 114 60 112C78 114 94 128 96 160Z" fill="#1a1a1a"/>
<g stroke="#e9e9e9" stroke-width="2.2">${[122, 130, 138, 146, 154].map(y => `<path d="M${30 + (160 - y) * 0.1} ${y}H${90 - (160 - y) * 0.1}"/>`).join("")}</g>
<path d="M40 112Q60 124 80 112L84 120Q60 132 36 120Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
<ellipse cx="60" cy="62" rx="32" ry="34" fill="#e8e4df" stroke="#222" stroke-width="1.6"/>
<path d="M28 58C26 26 94 26 92 58L86 46H34Z" fill="#111"/><path d="M34 46H86V54H34Z" fill="#111"/>
<g><ellipse cx="46" cy="64" rx="10" ry="11" fill="#2a2a2a"/><ellipse cx="74" cy="64" rx="10" ry="11" fill="#2a2a2a"/>
<ellipse cx="46" cy="64" rx="7.6" ry="8.6" fill="#f4f4f4"/><ellipse cx="74" cy="64" rx="7.6" ry="8.6" fill="#f4f4f4"/>
<circle class="dl-eye" cx="46" cy="64" r="3" fill="#111"/><circle class="dl-eye" cx="74" cy="64" r="3" fill="#111"/></g>
<g stroke="#111" stroke-width="1.4">${[-1, 1].map(s => [0, 1, 2, 3, 4].map(k => `<path d="M${60 + s * 14 + s * k * 2.6} ${72 - k * 0.4}l${s * 2} 5"/>`).join("")).join("")}</g>
<path d="M57 78l3 3 3 -3" fill="none" stroke="#8a7a70" stroke-width="1.2"/><path d="M54 87q6 -3 12 0" fill="none" stroke="#333" stroke-width="1.6"/>`);
        case "redeye": return svg("0 0 120 160", `
<defs><radialGradient id="${g("rf")}" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#f0b080"/><stop offset=".7" stop-color="#9a3a1a"/><stop offset="1" stop-color="#2a0505"/></radialGradient>
<radialGradient id="${g("re")}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3c0"/><stop offset=".35" stop-color="#ff5a1a"/><stop offset="1" stop-color="#7a0000"/></radialGradient></defs>
<path d="M26 40C14 70 16 120 22 150M94 40C106 70 104 120 98 150" fill="none" stroke="#2a0a0a" stroke-width="10" stroke-linecap="round"/>
<path d="M24 160C26 128 42 114 60 112C78 114 94 128 96 160Z" fill="#7a2a1a"/><g fill="#a84a2a" opacity=".6">${Array.from({ length: 18 }, (_, k) => `<circle cx="${32 + (k % 6) * 11}" cy="${126 + Math.floor(k / 6) * 10}" r="2"/>`).join("")}</g>
<rect x="44" y="104" width="32" height="8" rx="3" fill="#120404"/>
<ellipse cx="60" cy="62" rx="31" ry="34" fill="url(#${g("rf")})" stroke="#2a0505" stroke-width="1.6"/>
<path d="M30 50C32 24 88 24 90 50C80 36 70 34 60 38C50 34 40 36 30 50Z" fill="#2a0a0a"/>
<g class="dl-glow"><circle cx="46" cy="62" r="11" fill="#ff3a00" opacity=".35"/><circle cx="74" cy="62" r="11" fill="#ff3a00" opacity=".35"/>
<circle cx="46" cy="62" r="7.6" fill="url(#${g("re")})"/><circle cx="74" cy="62" r="7.6" fill="url(#${g("re")})"/><circle cx="46" cy="62" r="2.2" fill="#3a0000"/><circle cx="74" cy="62" r="2.2" fill="#3a0000"/></g>
<path d="M58 74l2 4 2 -4" fill="#7a2a1a"/><ellipse cx="60" cy="86" rx="5" ry="3.4" fill="#2a0505"/>`);
        case "baby": return svg("0 0 120 160", `
<defs><radialGradient id="${g("bb")}" cx="45%" cy="35%" r="65%"><stop offset="0" stop-color="#f2c7a8"/><stop offset=".75" stop-color="#c98a68"/><stop offset="1" stop-color="#6a3a28"/></radialGradient></defs>
<path d="M20 160C22 122 40 106 60 104C80 106 98 122 100 160Z" fill="#9fc3e6" stroke="#4a6a8a" stroke-width="1.6"/>
<path d="M22 150Q60 162 98 150L100 160H20Z" fill="#f6f0e4"/><g fill="#d8cfbd">${[28, 40, 52, 64, 76, 88].map(x => `<circle cx="${x}" cy="154" r="2.4"/>`).join("")}</g>
<path d="M38 106Q60 122 82 106L84 116Q60 130 36 116Z" fill="#f6f0e4" stroke="#b8ad98" stroke-width="1.2"/><g fill="#b8ad98">${[44, 52, 60, 68, 76].map(x => `<circle cx="${x}" cy="118" r="1.4"/>`).join("")}</g>
<path d="M60 124V150" stroke="#4a6a8a" stroke-width="1.2"/><g fill="#fff">${[130, 138, 146].map(y => `<circle cx="60" cy="${y}" r="1.6"/>`).join("")}</g>
<ellipse cx="60" cy="58" rx="33" ry="35" fill="url(#${g("bb")})" stroke="#4a2a1a" stroke-width="1.6"/>
<ellipse cx="50" cy="34" rx="12" ry="6" fill="#fff" opacity=".25"/>
<path d="M30 60q-6 4 -4 10M90 60q6 4 4 10" stroke="#6a3a28" stroke-width="1.2" fill="none"/>
<g><path d="M40 58q7 -6 14 0q-7 4 -14 0z" fill="#2a1a10"/><circle class="dl-eye" cx="47" cy="58" r="2.4" fill="#0b0705"/>
<path d="M66 60q7 -2 14 0" stroke="#2a1a10" stroke-width="2.4" stroke-linecap="round"/><path d="M66 62q7 2 14 -1" stroke="#6a3a28" stroke-width="1" fill="none"/></g>
<path d="M57 68q3 4 6 0" fill="none" stroke="#6a3a28" stroke-width="1.4"/>
<path d="M48 80Q60 90 72 80Q60 86 48 80Z" fill="#5a1a14" stroke="#3a0a08" stroke-width="1.2"/><path d="M52 81h16" stroke="#f4ead6" stroke-width="1.4"/>
<g fill="none" stroke="#6a3a28" stroke-width="2.2" stroke-linecap="round"><path d="M18 130q-6 -10 2 -18"/><path d="M102 130q6 -10 -2 -18"/></g>`);
        default: /* ghost */ return svg("0 0 120 160", `
<defs><radialGradient id="${g("gh")}" cx="50%" cy="30%" r="70%"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".6" stop-color="#d8dde6" stop-opacity=".7"/><stop offset="1" stop-color="#8a93a6" stop-opacity="0"/></radialGradient></defs>
<path d="M24 160C22 118 30 70 34 48C40 24 80 24 86 48C90 70 98 118 96 160L88 150 80 160 72 150 64 160 56 150 48 160 40 150 32 160Z" fill="url(#${g("gh")})"/>
<path d="M34 44C26 74 24 118 30 150M86 44C94 74 96 118 90 150" fill="none" stroke="#0b0b0f" stroke-width="9" stroke-linecap="round" opacity=".85"/>
<path d="M36 50C40 30 80 30 84 50C76 40 66 38 60 44C54 38 44 40 36 50Z" fill="#0b0b0f"/>
<ellipse cx="60" cy="60" rx="20" ry="23" fill="#e9edf3" opacity=".95"/>
<path d="M44 50C48 46 54 46 58 52L58 72C52 64 46 62 44 66Z" fill="#0b0b0f"/>
<g><ellipse cx="53" cy="60" rx="4.6" ry="5.4" fill="#0b0b0f"/><ellipse cx="68" cy="60" rx="4.6" ry="5.4" fill="#0b0b0f"/><circle class="dl-glint" cx="68" cy="59" r="1" fill="#fff"/></g>
<ellipse cx="60" cy="74" rx="3.4" ry="4.6" fill="#1a1a22"/>`);
    }
}

// the full-screen apparition: a giant porcelain doll-ghost face (cracked, hollow eyes, long wet hair)
export function apparitionSvg() {
    const i = ++N;
    return svg("0 0 400 300", `
<defs><radialGradient id="apF${i}" cx="50%" cy="42%" r="55%"><stop offset="0" stop-color="#f4f1ea"/><stop offset=".6" stop-color="#bdb6aa"/><stop offset="1" stop-color="#3a3632" stop-opacity="0"/></radialGradient>
<radialGradient id="apE${i}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000"/><stop offset=".8" stop-color="#0b0606"/><stop offset="1" stop-color="#3a1010" stop-opacity=".6"/></radialGradient>
<radialGradient id="apV${i}" cx="50%" cy="50%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient></defs>
<g fill="none" stroke="#0d0b0b" stroke-linecap="round" opacity=".85">${Array.from({ length: 26 }, (_, k) => { const x = 60 + k * 11; return `<path d="M${x} 10C${x - 20 + (k % 3) * 10} 90 ${x + (k % 2 ? 24 : -24)} 190 ${x + (k % 4) * 6 - 10} 300" stroke-width="${3 + (k % 4)}"/>`; }).join("")}</g>
<ellipse cx="200" cy="150" rx="130" ry="150" fill="url(#apF${i})"/>
<path d="M90 90C110 30 290 30 310 90C280 60 240 56 200 70C160 56 120 60 90 90Z" fill="#0d0b0b"/>
<g fill="none" stroke="#2a1f1a" stroke-width="2.4" stroke-linecap="round"><path d="M170 60l-14 40 18 24-12 40"/><path d="M156 100l-26 14"/><path d="M250 70l10 34-14 26 8 30"/><path d="M260 104l22 12"/><path d="M140 190l-18 22 6 20"/></g>
<ellipse cx="150" cy="150" rx="34" ry="40" fill="url(#apE${i})"/><ellipse cx="250" cy="150" rx="34" ry="40" fill="url(#apE${i})"/>
<circle cx="156" cy="142" r="4" fill="#d6d6d6" opacity=".7"/><circle cx="256" cy="142" r="4" fill="#d6d6d6" opacity=".7"/>
<path d="M146 192l6 30M254 192l-6 30" stroke="#5a0a0a" stroke-width="3" opacity=".6"/>
<path d="M194 186l6 10 6 -10" fill="#8a7f72"/>
<path d="M160 236Q200 262 240 236Q200 250 160 236Z" fill="#2a0606"/><g stroke="#cfc6b6" stroke-width="2">${[172, 184, 196, 208, 220, 232].map(x => `<path d="M${x} 240l1 8"/>`).join("")}</g>
<rect width="400" height="300" fill="url(#apV${i})"/>`);
}
