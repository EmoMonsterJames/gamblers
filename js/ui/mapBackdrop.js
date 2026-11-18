// =====================================================================
// 🖼️ Map backdrops: while a turn is played on a map, the page background
// (everything around the play screen) becomes a scene that fits that map —
// the region's sky colours and motifs + the map's own colour and emoji.
// Survival Land maps have their own hand-picked scenes.
// setMapBackdrop(loc) / clearMapBackdrop() — called by seasonView.render()
// =====================================================================
import { seed01 } from "../data/regions.js";

// sky: top → bottom colours · m: motif emoji scattered over the scene · fx: an extra layer
const REGION_SCENE = {
    cl1:        { sky: ["#2a0b45", "#12051f"], m: ["🎰", "🪙", "🎲", "🍒", "7️⃣", "💰"], fx: "neon" },
    cl2:        { sky: ["#3b0a35", "#14051a"], m: ["🎲", "🃏", "♠️", "♥️", "🪙", "🎯"], fx: "neon" },
    sky:        { sky: ["#7dd3fc", "#1e3a8a"], m: ["☁️", "☁️", "🕊️", "🌤️", "🪽", "☁️"], fx: "clouds" },
    space:      { sky: ["#0b0430", "#000006"], m: ["⭐", "✨", "🪐", "🌙", "☄️", "🛸"], fx: "stars" },
    fantasy:    { sky: ["#4c1d95", "#1e0b3b"], m: ["🦄", "🌈", "✨", "🏰", "🍄", "🧚"], fx: "sparkle" },
    under:      { sky: ["#3f2a14", "#0c0703"], m: ["⛏️", "💎", "🪨", "🕯️", "⚒️", "🪨"], fx: "dust" },
    spooky:     { sky: ["#3b1d06", "#0a0503"], m: ["🎃", "🦇", "👻", "🕸️", "🌕", "🕯️"], fx: "fog" },
    deepsea:    { sky: ["#0369a1", "#020a1f"], m: ["🫧", "🐟", "🐙", "🪸", "🐠", "🫧"], fx: "bubbles" },
    arctic:     { sky: ["#bae6fd", "#1e3a5f"], m: ["❄️", "⛄", "🧊", "🐧", "❄️", "🏔️"], fx: "snow" },
    randomland: { sky: ["#78350f", "#1c0a02"], m: ["🎲", "❓", "🔀", "🎰", "🃏", "❔"], fx: "neon" },
    richland:   { sky: ["#713f12", "#1a0d02"], m: ["💰", "💎", "👑", "🪙", "🍾", "💵"], fx: "gold" },
    noslot:     { sky: ["#14532d", "#03140a"], m: ["🃏", "♠️", "♦️", "♣️", "♥️", "🎲"], fx: "felt" },
    nocasino:   { sky: ["#7f1d1d", "#1a0404"], m: ["🎰", "🍒", "🔔", "7️⃣", "🍋", "⭐"], fx: "neon" },
    npcland:    { sky: ["#3b0764", "#0d0218"], m: ["👹", "🧙", "🤖", "💀", "🧳", "👼"], fx: "fog" },
    combo:      { sky: ["#134e4a", "#031513"], m: ["🧩", "🏝️", "🪽", "🫧", "🪐", "🧩"], fx: "sparkle" },
    restricted: { sky: ["#422006", "#0f0700"], m: ["🚧", "⚠️", "🔒", "🚫", "📛", "🚧"], fx: "stripes" },
    deadland:   { sky: ["#450a0a", "#050000"], m: ["💀", "🪦", "⚰️", "🦴", "🕯️", "☠️"], fx: "fog" },
    desert:     { sky: ["#f59e0b", "#7c2d12"], m: ["🌵", "🐪", "☀️", "🏜️", "🦂", "🌵"], fx: "heat" },
    emoland:    { sky: ["#065f46", "#021a12"], m: ["🐾", "⚪", "🌿", "🐾", "✨", "🍃"], fx: "sparkle" },
    difficult:  { sky: ["#334155", "#0b1120"], m: ["🧗", "🪨", "⛓️", "⏱️", "🥶", "🪤"], fx: "dust" },
    kidnap:     { sky: ["#27272a", "#000000"], m: ["⛓️", "💣", "🧨", "🔒", "⛓️", "🕯️"], fx: "fog" }
};
// 🔄 Survival Land: one scene per map
const MAP_SCENE = {
    disaster_casino: { sky: ["#0c4a6e", "#020617"], m: ["🌪️", "🌊", "⚡", "🌋", "🌧️", "🆘"], fx: "rain" },
    arcade:          { sky: ["#312e81", "#0b0420"], m: ["👾", "🕹️", "🍄", "⭐", "🪙", "🏰"], fx: "pixels" },
    button_casino:   { sky: ["#7f1d1d", "#1c0505"], m: ["🔴", "🔘", "🛑", "🟡", "🔴", "🔘"], fx: "neon" },
    foggy_church:    { sky: ["#334155", "#020617"], m: ["⛪", "🕯️", "🔔", "✝️", "🕊️", "📿"], fx: "fog" },
    quiz_casino:     { sky: ["#075985", "#020617"], m: ["❓", "🧠", "📚", "💡", "✏️", "🎓"], fx: "sparkle" },
    inferno_casino:  { sky: ["#7f1d1d", "#0a0000"], m: ["🔥", "💀", "⛓️", "🩸", "☠️", "🔥"], fx: "embers" },
    icy_castle:      { sky: ["#7dd3fc", "#0c4a6e"], m: ["❄️", "🧊", "🏰", "👸", "❄️", "💎"], fx: "snow" },
    decal_casino:    { sky: ["#701a75", "#0a0010"], m: ["🦋", "🪞", "🎭", "🃏", "🦋", "🔮"], fx: "mirror" },
    mosquito_forest: { sky: ["#14532d", "#020a04"], m: ["🦟", "🌿", "🍃", "🌳", "🦟", "🍄"], fx: "swamp" }
};

const cache = new Map();
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
// a 1200 × 800 SVG scene (tiled), seeded by the map id so it never changes between visits
function sceneSvg(loc) {
    const sc = MAP_SCENE[loc.id] || REGION_SCENE[loc.region] || REGION_SCENE.cl1;
    let k = 0; const r = () => seed01(`${loc.id}#${k++}`);
    const W = 1200, H = 800, col = loc.color || "#888";
    const parts = [];
    parts.push(`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc.sky[0]}"/><stop offset="1" stop-color="${sc.sky[1]}"/></linearGradient>`
        + `<radialGradient id="c" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="${col}" stop-opacity=".45"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>`);
    parts.push(`<rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#c)"/>`);
    // the region's effect layer
    const fx = sc.fx;
    if (fx === "stars" || fx === "sparkle" || fx === "pixels") for (let i = 0; i < 90; i++) { const s = 0.6 + r() * 2.2; parts.push(fx === "pixels" ? `<rect x="${(r() * W) | 0}" y="${(r() * H) | 0}" width="${s * 2}" height="${s * 2}" fill="#fff" opacity="${(0.15 + r() * 0.45).toFixed(2)}"/>` : `<circle cx="${(r() * W) | 0}" cy="${(r() * H) | 0}" r="${s.toFixed(1)}" fill="#fff" opacity="${(0.2 + r() * 0.6).toFixed(2)}"/>`); }
    if (fx === "snow") for (let i = 0; i < 110; i++) parts.push(`<circle cx="${(r() * W) | 0}" cy="${(r() * H) | 0}" r="${(1 + r() * 3).toFixed(1)}" fill="#fff" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`);
    if (fx === "bubbles") for (let i = 0; i < 60; i++) parts.push(`<circle cx="${(r() * W) | 0}" cy="${(r() * H) | 0}" r="${(3 + r() * 12).toFixed(1)}" fill="none" stroke="#bae6fd" stroke-width="1.5" opacity="${(0.2 + r() * 0.4).toFixed(2)}"/>`);
    if (fx === "embers" || fx === "gold") for (let i = 0; i < 80; i++) parts.push(`<circle cx="${(r() * W) | 0}" cy="${(r() * H) | 0}" r="${(1 + r() * 2.5).toFixed(1)}" fill="${fx === "gold" ? "#fde047" : "#fb923c"}" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`);
    if (fx === "dust" || fx === "heat") for (let i = 0; i < 70; i++) parts.push(`<circle cx="${(r() * W) | 0}" cy="${(r() * H) | 0}" r="${(1 + r() * 2).toFixed(1)}" fill="${fx === "heat" ? "#fef3c7" : "#d6d3d1"}" opacity="${(0.15 + r() * 0.3).toFixed(2)}"/>`);
    if (fx === "rain") for (let i = 0; i < 120; i++) { const x = (r() * W) | 0, y = (r() * H) | 0; parts.push(`<line x1="${x}" y1="${y}" x2="${x - 8}" y2="${y + 26}" stroke="#7dd3fc" stroke-width="1.4" opacity="${(0.2 + r() * 0.35).toFixed(2)}"/>`); }
    if (fx === "fog" || fx === "clouds" || fx === "swamp") for (let i = 0; i < 9; i++) parts.push(`<ellipse cx="${(r() * W) | 0}" cy="${(H * (0.3 + r() * 0.7)) | 0}" rx="${(160 + r() * 260) | 0}" ry="${(40 + r() * 60) | 0}" fill="${fx === "swamp" ? "#4d7c0f" : "#fff"}" opacity="${fx === "clouds" ? 0.35 : 0.08}"/>`);
    if (fx === "neon" || fx === "felt" || fx === "mirror") for (let i = 0; i < 7; i++) { const y = (r() * H) | 0; parts.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y + (r() - 0.5) * 200}" stroke="${col}" stroke-width="${(1 + r() * 2).toFixed(1)}" opacity=".18"/>`); }
    if (fx === "mirror") parts.push(`<line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" stroke="#f0abfc" stroke-width="2" stroke-dasharray="10 10" opacity=".35"/>`);
    if (fx === "stripes") for (let x = -H; x < W; x += 90) parts.push(`<line x1="${x}" y1="${H}" x2="${x + H}" y2="0" stroke="#facc15" stroke-width="22" opacity=".06"/>`);
    // the motifs: the map's own emoji is among them
    const motifs = [loc.emoji, ...sc.m, loc.emoji].filter(Boolean);
    for (let i = 0; i < 34; i++) {
        const e = motifs[Math.floor(r() * motifs.length)], size = (26 + r() * 46) | 0, rot = ((r() - 0.5) * 50) | 0, x = (r() * W) | 0, y = (r() * H) | 0;
        parts.push(`<text x="${x}" y="${y}" font-size="${size}" opacity="${(0.22 + r() * 0.22).toFixed(2)}" transform="rotate(${rot} ${x} ${y})" text-anchor="middle" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif">${esc(e)}</text>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}
const urlOf = loc => {
    if (!cache.has(loc.id)) cache.set(loc.id, `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(sceneSvg(loc))}")`);
    return cache.get(loc.id);
};
let current = null, watch = 0;
export function setMapBackdrop(loc) {
    if (!loc) return clearMapBackdrop();
    if (current === loc.id) return;
    current = loc.id;
    const b = document.body;
    // a dark veil on top keeps the play screen readable
    b.style.backgroundImage = `linear-gradient(180deg, #0b071418, #0b071455 60%, #0b071499), ${urlOf(loc)}`;
    b.style.backgroundSize = "auto, cover";
    b.style.backgroundAttachment = "fixed";
    b.style.backgroundPosition = "center";
    b.classList.add("map-bg");
    // left the turn screen (another page / the turn is over) → the normal background comes back
    clearInterval(watch);
    watch = setInterval(() => { if (!document.querySelector(".location")) clearMapBackdrop(); }, 800);
}
export function clearMapBackdrop() {
    clearInterval(watch);
    if (current == null) return;
    current = null;
    const b = document.body;
    b.style.backgroundImage = b.style.backgroundSize = b.style.backgroundAttachment = b.style.backgroundPosition = "";
    b.classList.remove("map-bg");
}
// admin / debugging: the picture of any map
export const mapBackdropUrl = loc => urlOf(loc);
