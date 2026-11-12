// World map with every casino pin + the "where do I play?" roulette.
import { h, sleep, shuffle } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { LOCATIONS, REGIONS } from "../data/catalog.js";

const ISLANDS = `
<defs>
  <radialGradient id="sea" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#0f4c81"/><stop offset="1" stop-color="#071a33"/></radialGradient>
  <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0 10 Q10 4 20 10 T40 10" fill="none" stroke="#ffffff10" stroke-width="2"/></pattern>
  <filter id="shadow"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>
</defs>
<rect width="1000" height="600" fill="url(#sea)"/><rect width="1000" height="600" fill="url(#waves)"/>
<g filter="url(#shadow)" stroke="#00000040" stroke-width="3">
  <!-- central continent (free casinos) -->
  <path d="M250 150 C330 90 520 80 640 120 C760 150 770 230 760 300 C750 380 690 420 620 430 C520 445 420 470 330 420 C250 380 200 330 210 260 C215 210 220 175 250 150Z" fill="#c2a36b"/>
  <path d="M270 170 C340 120 520 110 620 140 C720 165 735 230 725 290 C715 360 660 395 600 405 C510 420 420 440 340 400 C270 365 235 320 240 265 C245 220 245 190 270 170Z" fill="#7fbf5f"/>
  <!-- Emo World -->
  <path d="M180 40 C240 20 380 30 400 80 C410 120 340 140 270 130 C200 125 140 100 180 40Z" fill="#b794f4"/>
  <!-- MJ World -->
  <path d="M780 30 C860 10 960 40 950 100 C940 140 860 150 810 125 C760 100 740 50 780 30Z" fill="#4fd1c5"/>
  <!-- Polynesia -->
  <path d="M840 220 C900 200 960 240 950 300 C940 350 880 360 850 330 C815 300 800 240 840 220Z" fill="#f6ad55"/>
  <path d="M905 375 C925 368 940 380 932 395 C924 408 900 402 905 375Z" fill="#f6ad55"/>
  <!-- Ground Town -->
  <path d="M40 300 C90 270 170 290 175 350 C180 400 120 420 80 405 C30 390 0 330 40 300Z" fill="#9ae66e"/>
  <!-- Foggy Nation -->
  <path d="M40 470 C100 440 230 450 240 500 C250 560 140 590 80 570 C30 555 0 500 40 470Z" fill="#a0aec0"/>
  <!-- Dung Town -->
  <path d="M380 470 C450 450 620 455 640 500 C655 545 560 585 470 575 C390 565 330 520 380 470Z" fill="#d69e2e"/>
  <!-- Seaside beach -->
  <path d="M720 410 C770 395 860 410 870 455 C875 495 810 505 760 495 C720 485 690 430 720 410Z" fill="#fbd38d"/>
</g>
<g font-family="Lilita One, sans-serif" font-size="22" fill="#ffffffcc" text-anchor="middle" stroke="#00000066" stroke-width="1">
  <text x="290" y="75">EMO WORLD</text><text x="860" y="70">MJ WORLD</text><text x="890" y="275">POLYNESIA</text>
  <text x="95" y="345">GROUND TOWN</text><text x="130" y="520">FOGGY NATION</text><text x="510" y="520">DUNG TOWN</text>
</g>
<g fill="#ffffff22"><circle cx="560" cy="180" r="3"/><circle cx="410" cy="300" r="2"/><circle cx="650" cy="260" r="3"/></g>
<g font-size="30"><text x="680" y="560">⛵</text><text x="560" y="40">🐋</text><text x="20" y="200">🦑</text><text x="960" y="580">🏝️</text></g>`;

// themed backdrops for the new regions (Casino Land 1 keeps the island map)
const REGION_BG = {
    sky: { bg: "linear-gradient(180deg,#7dd3fc,#e0f2fe 70%,#fff)", deco: ["☁️", "☁️", "🕊️", "🌤️", "☁️", "🪽"] },
    space: { bg: "radial-gradient(circle at 30% 30%,#312e81,#020617 70%)", deco: ["🪐", "⭐", "🌙", "☄️", "✨", "🛰️"] },
    cl2: { bg: "linear-gradient(180deg,#1e1b4b,#4c1d95 60%,#0f172a)", deco: ["🎰", "🏙️", "💡", "🎲", "🃏", "💰"] },
    fantasy: { bg: "linear-gradient(180deg,#f9a8d4,#a78bfa 50%,#1e1b4b)", deco: ["🏰", "🦄", "🌈", "✨", "🍄", "🐉"] },
    under: { bg: "radial-gradient(circle at 50% 20%,#78350f,#0c0a09 75%)", deco: ["⛏️", "🪨", "💎", "🕯️", "🦇", "🔥"] },
    spooky: { bg: "radial-gradient(circle at 70% 15%,#fef3c7 0 5%,#4c1d95 20%,#020617 80%)", deco: ["🦇", "🕸️", "🎃", "🌕", "👻", "🪦"] },
    deepsea: { bg: "linear-gradient(180deg,#0369a1,#082f49 50%,#020617)", deco: ["🫧", "🐠", "🪸", "🐙", "🦈", "🫧"] },
    arctic: { bg: "linear-gradient(180deg,#e0f2fe,#7dd3fc 60%,#0c4a6e)", deco: ["❄️", "🧊", "🐧", "🐻‍❄️", "⛄", "❄️"] }
};
const reqLabel = r => !r ? null : r.points ? `${r.points}P+` : r.country ? "국적" : r.fee ? `${r.fee.toLocaleString()}G` : r.feePts ? `${r.feePts}P 입장료` : r.random ? "랜덤 입장" : null;

export function worldMap({ onPick = null, locked = new Set(), small = false, region = "cl1" } = {}) {
    const R = REGION_BG[region];
    const svg = R ? "" : `<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" class="map-svg">${ISLANDS}</svg>`;
    const pins = LOCATIONS.filter(l => (l.region || "cl1") === region && !l.off).map(l => h("button.pin" + (locked.has(l.id) ? ".locked" : ""), {
        style: { left: l.x + "%", top: l.y + "%", "--c": l.color }, "data-id": l.id,
        onclick: onPick ? () => onPick(l) : null, title: l.name
    }, h("span.pin-ico", l.emoji), h("span.pin-name", l.name), reqLabel(l.req) ? h("span.pin-req", reqLabel(l.req)) : null));
    const deco = R ? h("div.region-deco", R.deco.map((d, i) => h("i", { style: { left: 6 + i * 16 + "%", top: (i % 2 ? 70 : 12) + "%", "--d": i * 0.7 + "s" } }, d))) : null;
    const el = h("div.world" + (small ? ".small" : "") + (R ? ".region-world.rw-" + region : ""), R ? { style: { background: R.bg } } : { html: svg }, deco, ...pins);
    return {
        el,
        async roulette(candidates, targetId) {
            const ids = candidates.map(l => l.id);
            const byId = id => el.querySelector(`.pin[data-id="${id}"]`);
            el.classList.add("rouletting");
            let order = shuffle(ids);
            const total = 26 + Math.floor(Math.random() * 6);
            let gap = 70;
            let cur = null;
            for (let i = 0; i < total; i++) {
                const id = i === total - 1 ? targetId : order[i % order.length];
                cur?.classList.remove("hot");
                cur = byId(id); cur.classList.add("hot");
                Sound.tick();
                await sleep(gap);
                gap = i > total - 8 ? gap * 1.35 : gap * 1.06;
                if (i % order.length === order.length - 1) order = shuffle(ids);
            }
            cur.classList.remove("hot");
            cur.classList.add("chosen");
            Sound.win();
            el.classList.remove("rouletting");
            await sleep(900);
        }
    };
}

// Region selector: one big tile per region, same roulette API as the map.
export function regionMap({ status = () => ({ ok: true }) } = {}) {
    const tiles = REGIONS.filter(r => !r.off).map(r => {
        const st = status(r);
        const bg = REGION_BG[r.id]?.bg || "linear-gradient(135deg,#166534,#14532d)";
        return h("div.rtile" + (st.ok ? "" : ".locked"), { "data-id": r.id, style: { "--c": r.color, background: bg } },
            h("div.rt-emoji", r.emoji), h("b", r.name), h("small", r.en), !st.ok ? h("span.rt-why", "🔒 " + st.why) : null);
    });
    const el = h("div.region-grid", tiles);
    return {
        el,
        async roulette(candidates, targetId) {
            const ids = candidates.map(r => r.id);
            const byId = id => el.querySelector(`.rtile[data-id="${id}"]`);
            el.classList.add("rouletting");
            let order = shuffle(ids), gap = 80, cur = null;
            const total = 20 + Math.floor(Math.random() * 6);
            for (let i = 0; i < total; i++) {
                const id = i === total - 1 ? targetId : order[i % order.length];
                cur?.classList.remove("hot");
                cur = byId(id); cur.classList.add("hot");
                Sound.tick();
                await sleep(gap);
                gap = i > total - 7 ? gap * 1.35 : gap * 1.06;
                if (i % order.length === order.length - 1) order = shuffle(ids);
            }
            cur.classList.remove("hot"); cur.classList.add("chosen");
            Sound.win();
            el.classList.remove("rouletting");
            await sleep(900);
        }
    };
}
