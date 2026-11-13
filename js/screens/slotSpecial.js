// =====================================================================
// Renderer for the special machines (specialEngine.js). Plays a result's
// `phases` script on the shared slot cabinet (slot.js passes `api`).
// Returns { total, jpWins } — the actual paid amount (interactive bonuses
// like Top Offer / Food Critic may differ from the engine's assumption).
// =====================================================================
import { h, sleep, fmt, countUp } from "../core/util.js";

const FX = {
    // ---- round 6 machines
    sail: { icon: "⛵🪢", text: "SAIL UP!", snd: "whoosh", cls: "potion" },
    shipgo: { icon: "⛵💨⛵", text: "THE SHIP SETS SAIL!", snd: "boom", cls: "potion", shake: true },
    flood: { icon: "🌊🐟🌊", text: "SHIPWRECK!", snd: "splash", cls: "potion", shake: true },
    hammer: { icon: "🔨", text: "", snd: "boom", cls: "fire", shake: true },
    smashall: { icon: "🔨💥🔨", text: "TOTAL SMASH!!!", snd: "boom", cls: "fire", shake: true },
    rebuild: { icon: "🧱🏗️🧱", text: "NEW WALL!", snd: "whoosh", cls: "gold" },
    seven: { icon: "7️⃣7️⃣7️⃣", text: "LUCKY 777 · x7!", snd: "cash", cls: "gold", shake: true },
    sticky: { icon: "⭐📌", text: "STICKY WILD SPINS!", snd: "bonus", cls: "gold" },
    spike: { icon: "🗡️🗡️🗡️", text: "SPIKE TRAP PURGE!", snd: "boom", cls: "fire", shake: true },
    mimic: { icon: "🧰👀🦷", text: "MIMIC AMBUSH!", snd: "boom", cls: "ghost", shake: true },
    torch: { icon: "🔥🐉🔥", text: "TORCHLIGHT EXPANSION!", snd: "boom", cls: "bolt" },
    dkey: { icon: "🗝️⛓️", text: "DUNGEON KEY!", snd: "bonus", cls: "gold" },
    sonar: { icon: "📡〰️〰️", text: "SONAR PULSE OVERCHARGE!", snd: "bonus", cls: "beam" },
    leviathan: { icon: "🐉🌊", text: "LEVIATHAN WAKE!", snd: "whoosh", cls: "potion", shake: true },
    vent: { icon: "🫧🌋🫧", text: "THERMAL VENT ERUPTION!", snd: "boom", cls: "fire", shake: true },
    frost: { icon: "🔨❄️", text: "", snd: "boom", cls: "bolt" },
    freeze: { icon: "🌬️🧊", text: "FLASH FREEZE!", snd: "whoosh", cls: "bolt", shake: true },
    aurora: { icon: "🌌💚💜", text: "AURORA BOREALIS!", snd: "bonus", cls: "moon" },
    superpose: { icon: "⚛️🔀", text: "QUANTUM SUPERPOSITION!", snd: "bonus", cls: "glitch" },
    parallel: { icon: "🧊🧊", text: "PARALLEL TIMELINE SPLIT!", snd: "boom", cls: "glitch", shake: true },
    butterfly: { icon: "🦋✨", text: "BUTTERFLY EFFECT!", snd: "whoosh", cls: "glitch" },
    hearth: { icon: "🔥🏮🔥", text: "HEARTHFIRE WARMTH!", snd: "bonus", cls: "gold" },
    benefactor: { icon: "🧥👝🪙", text: "GENEROUS BENEFACTOR!", snd: "cash", cls: "gold" },
    feast: { icon: "🍞🥣🚪", text: "COMMUNITY FEAST!", snd: "boom", cls: "gold", shake: true },
    flock: { icon: "🔔🕊️🕊️🕊️", text: "FLOCK SCATTER!", snd: "whoosh", cls: "gold" },
    halo: { icon: "😇☀️", text: "HALO RESONANCE!", snd: "bonus", cls: "gold", shake: true },
    feather: { icon: "🪶🪶🪶", text: "FEATHER DRIFT RESPIN!", snd: "whoosh", cls: "gold" },
    allin: { icon: "🧤🃏", text: "ALL-IN SWEEP!", snd: "boom", cls: "fire", shake: true },
    rake: { icon: "🪙🧹🪙", text: "THE HOUSE CUT · POT x2!", snd: "cash", cls: "gold" },
    gravity: { icon: "🌀🚗🌀", text: "GRAVITY GLITCH!", snd: "whoosh", cls: "bolt", shake: true },
    ufo: { icon: "🛸✨", text: "UFO DELIVERY!", snd: "whoosh", cls: "bolt" },
    meteor: { icon: "☄️☄️☄️", text: "METEOR SHOWER!", snd: "boom", cls: "fire", shake: true },
    tongue: { icon: "🐸👅🪲", text: "TONGUE LASH!", snd: "whoosh", cls: "gold" },
    ripple: { icon: "💧〰️", text: "POND RIPPLE SYNC!", snd: "splash", cls: "potion" },
    tadpole: { icon: "🫧🐸🫧", text: "TADPOLE SWARM!", snd: "splash", cls: "potion" },
    green: { icon: "🚦🟢🚐", text: "GREEN LIGHT EXPRESS!", snd: "boom", cls: "gold", shake: true },
    subway: { icon: "🚇💨", text: "SUBWAY RUMBLE!", snd: "boom", cls: "bass", shake: true },
    heli: { icon: "🚁🔦", text: "HELICOPTER SPOTLIGHT!", snd: "whoosh", cls: "bolt" },
    flare: { icon: "🔥🦖🔥", text: "GODZILLA GRILL FLARE!", snd: "boom", cls: "fire" },
    rampage: { icon: "🦖💥", text: "TITAN RAMPAGE!!!", snd: "boom", cls: "fire", shake: true },
    bass: { icon: "🔊🔊🔊", text: "BASS DROP!", snd: "boom", cls: "bass", shake: true },
    scratch: { icon: "💿", text: "WICKY-WICKY SCRATCH!", snd: "whoosh", cls: "disc" },
    surf: { icon: "🙌🙌🙌", text: "CROWD SURF!", snd: "whoosh", cls: "crowd" },
    stage: { icon: "🎤✨", text: "STAGE CLEAR!", snd: "bonus", cls: "crowd" },
    rocket: { icon: "🚀", text: "ROCKET BOOSTER!", snd: "whoosh", cls: "rocket" },
    rockets: { icon: "🚀🚀🚀", text: "ROCKET COLUMNS!", snd: "boom", cls: "rocket" },
    zerog: { icon: "🐹🌀", text: "ZERO-GRAVITY!", snd: "whoosh", cls: "float" },
    laser: { icon: "✨", text: "", snd: "coin", cls: "beam" },
    arrow: { icon: "➕☀️", text: "SOLAR FLARE ARROWS!", snd: "bonus", cls: "sun" },
    merge: { icon: "🔗", text: "POD FUSION!", snd: "coin", cls: "beam" },
    meteor: { icon: "🐹☄️☄️", text: "x2 METEORS!", snd: "boom", cls: "meteor" },
    magnet: { icon: "🧲🌙🧲", text: "GRAVITY MAGNETS!", snd: "whoosh", cls: "moon" },
    hap: { icon: "⚡合⚡", text: "합 (合)!", snd: "boom", cls: "bolt" },
    chung: { icon: "⚡沖⚡", text: "충 (沖)!", snd: "boom", cls: "bolt", shake: true },
    pillar: { icon: "🏛️", text: "10년 기둥!", snd: "bonus", cls: "gold" },
    goldbox: { icon: "❓💥", text: "GOLDEN BOX BURST!!!", snd: "boom", cls: "gold", shake: true },
    coinspray: { icon: "🪙🪙🪙", text: "", snd: "cash", cls: "gold" },
    collect: { icon: "🎁➕", text: "GIFT COLLECT!", snd: "cash", cls: "gold" },
    wildthrow: { icon: "🎁🎁🎁", text: "", snd: "whoosh", cls: "gift" },
    rewind: { icon: "⏪📼", text: "REWIND GLITCH!", snd: "whoosh", cls: "glitch" },
    lasers: { icon: "🔴", text: "", snd: "coin", cls: "beam" },
    replay: { icon: "🌀⏩", text: "TIME-LOOP REPLAY!", snd: "bonus", cls: "glitch" },
    // ---- the 15 theme machines (themeEngine.js)
    pendulum: { icon: "🕰️", text: "PENDULUM SWING!", snd: "whoosh", cls: "gold", swing: true },
    swing: { icon: "🕰️", text: "", snd: "whoosh", cls: "gold" },
    mesh: { icon: "⚙️⚙️", text: "+1x MESH!", snd: "coin", cls: "gold" },
    distill: { icon: "🧪💧", text: "DISTILLER x2!", snd: "bonus", cls: "potion" },
    grimoire: { icon: "📖⚡", text: "MYSTERY GRIMOIRE!", snd: "boom", cls: "bolt" },
    erupt: { icon: "⚗️💥", text: "CHAIN REACTION BREW!", snd: "boom", cls: "potion", shake: true },
    supernova: { icon: "💥🌟", text: "SUPERNOVA!", snd: "boom", cls: "sun", shake: true },
    blackhole: { icon: "🕳️", text: "BLACK HOLE GRAVITY!", snd: "whoosh", cls: "moon" },
    comet: { icon: "☄️", text: "COMET TRAIL!", snd: "whoosh", cls: "meteor" },
    nebula: { icon: "🌀🌌", text: "NEBULA PORTAL!", snd: "bonus", cls: "moon" },
    megacore: { icon: "🤖🧊", text: "MEGA-CORE DROP!", snd: "boom", cls: "beam", shake: true },
    emp: { icon: "⚡🤖⚡", text: "EMP OVERCHARGE!", snd: "boom", cls: "bolt", shake: true },
    magnet: { icon: "🧲🤖", text: "MAGNET COLLECT!", snd: "cash", cls: "beam" },
    overdrive: { icon: "🔋⚔️🤖", text: "OVERDRIVE BATTLE!", snd: "boom", cls: "bolt", shake: true },
    kernel: { icon: "🍿", text: "", snd: "coin", cls: "gold" },
    jam: { icon: "🎞️💨", text: "PROJECTOR JAM!", snd: "whoosh", cls: "glitch" },
    glasses3d: { icon: "🕶️", text: "3D MODE!", snd: "bonus", cls: "glitch" },
    pop: { icon: "🍿💥", text: "BUCKET POP!", snd: "boom", cls: "gold", shake: true },
    doublefeature: { icon: "🍿🍿🍿", text: "DOUBLE-FEATURE!", snd: "boom", cls: "gold", shake: true },
    swarm: { icon: "👻👻👻", text: "SPECTRAL SWARM!", snd: "whoosh", cls: "ghost" },
    nudge: { icon: "👻🤚", text: "PHANTOM NUDGE!", snd: "whoosh", cls: "ghost" },
    blade: { icon: "🔪", text: "BLADE SLICE!", snd: "boom", cls: "fire", shake: true },
    necro: { icon: "🧙‍♂️⚡", text: "NECROMANCER'S RESPIN!", snd: "boom", cls: "bolt" },
    bloodmoon: { icon: "🌕🩸", text: "BLOOD MOON ECLIPSE!", snd: "boom", cls: "fire", shake: true },
    megabubble: { icon: "🧙‍♀️🫧", text: "ECTOPLASM SURGE!", snd: "splash", cls: "potion" },
    soulpop: { icon: "🫧👻", text: "SOUL POP!", snd: "coin", cls: "potion" },
    speeddial: { icon: "📞💗", text: "SPEED DIALING...", snd: "bonus", cls: "lcd" },
    t9: { icon: "⌨️", text: "AUTO-CORRECTING...", snd: "tick", cls: "lcd" },
    cheat: { icon: "✱ #", text: "SECRET CHEAT CODE!", snd: "boom", cls: "lcd", shake: true },
    echo: { icon: "🥁☀️", text: "TALKING DRUM ECHO!", snd: "boom", cls: "sun", shake: true },
    kente: { icon: "🧵✨", text: "KENTE LOOM WEAVE!", snd: "bonus", cls: "gold" },
    pinup: { icon: "🎳", text: "", snd: "coin", cls: "gold" },
    ball: { icon: "🎱💨🎳", text: "BOWLING BALL!", snd: "boom", cls: "beam", shake: true },
    strike: { icon: "🎳💥", text: "STRIKE!!!", snd: "boom", cls: "fire", shake: true },
    bingocoin: { icon: "🪙", text: "", snd: "coin", cls: "gold" },
    money: { icon: "💸", text: "", snd: "cash", cls: "gold" },
    claw: { icon: "🦾✨", text: "CLAW TIME!", snd: "bonus", cls: "gold" }
};

export async function playSpecial(res, api) {
    const { cfg, cellsEl, highlight, overlay, msgEl, winEl, cabinet, frame, Sound, bet } = api;
    const pace = ms => sleep(ms * (api.turbo() ? 0.45 : 1));
    let run = 0;
    const jpWins = [];
    let offerTaken = null; // { k, v, jp }
    const hud = h("div.sp-hud");
    frame.append(hud);
    const add = async (amt, text) => {
        if (!amt) return;
        const from = run; run += amt;
        if (text) msgEl.innerHTML = `${text} = <b>${fmt(amt)}</b>`;
        Sound.win();
        await countUp(winEl, from, run, 450);
    };
    const clearHl = () => api.reelsBox.querySelectorAll(".hit,.dim,.sp-morph,.sp-smash").forEach(e => e.classList.remove("hit", "dim", "sp-morph", "sp-smash"));
    // Hold & Spin respin: coins roll past the empty cells, then the columns stop
    // one by one (left → right); a new coin only shows when its column stops.
    async function rollEmpties(p) {
        const added = new Set((p.cells || []).map(([c, r]) => c + "," + r));
        const cols = p.grid.length, rowsN = p.grid[0]?.length || 3;
        const rolls = [];
        for (let c = 0; c < cols; c++) for (let r = 0; r < rowsN; r++) {
            const el = cellsEl(c, r);
            if (!el || !el.classList.contains("sym-empty")) continue;
            const strip = h("div.sp-roll-strip", { style: { animationDuration: (0.28 + Math.random() * 0.12) + "s" } },
                ...Array.from({ length: 6 }, (_, i) => h("span", i % 2 ? "" : "🪙")));
            const roll = h("div.sp-roll", strip);
            el.append(roll);
            rolls.push({ c, r, el, roll });
        }
        let found = 0;
        await pace(500);
        for (let c = 0; c < cols; c++) {
            const mine = rolls.filter(x => x.c === c);
            if (!mine.length) continue;
            // tension: the last columns slow down when nothing has landed yet
            const late = c >= cols - 2 && !found;
            if (late) mine.forEach(x => x.roll.classList.add("slow"));
            await pace(late ? 520 : 240);
            for (const x of mine) {
                x.roll.remove();
                if (added.has(x.c + "," + x.r)) {
                    x.el.className = "sym s-GC pop"; x.el.dataset.s = "GC";
                    x.el.replaceChildren(h("span", "🪙"));
                    found++; Sound.coin();
                }
            }
            Sound.tick();
        }
        api.showGrid(p.grid);
        for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("pop");
        await pace(found ? 600 : 400);
    }
    const setRows = n => { api.reelsBox.style.setProperty("--rows", n); cabinet.classList.toggle("sp-tall", n > 5); };
    try {
        for (let i = 0; i < res.phases.length; i++) {
            const p = res.phases[i];
            switch (p.t) {
                case "spin": {
                    clearHl();
                    api.reelsBox.querySelectorAll(".spb").forEach(e => e.remove());
                    await api.animateReels(p.grid, { anticipation: p.antic || [], nearMiss: p.near || null });
                    for (const c of p.hold || []) api.reelsBox.children[c]?.classList.add("sp-held");
                    for (const [c, r] of p.frozen || []) cellsEl(c, r)?.classList.add("sp-frozen");
                    if (i === 0 && api.onLand) await api.onLand();
                    if (i === 0 && !res.total && p.antic?.length && !res.bonus) msgEl.innerHTML = `<span class="tease">아깝다!! 😱 한 개만 더…</span>`;
                    break;
                }
                case "show": case "land": {
                    if (p.roll) { await rollEmpties(p); break; }
                    api.showGrid(p.grid);
                    if (i === 0 && api.onLand) await api.onLand(); // reel-less machines (brick wall) open with a show
                    const cells = p.pop || p.cells || [];
                    for (const [c, r] of cells) cellsEl(c, r)?.classList.add("pop");
                    if (cells.length) Sound.coin();
                    await pace(p.ms || (p.t === "land" ? 380 : 300));
                    break;
                }
                case "morph": {
                    api.showGrid(p.grid);
                    for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("sp-morph", "sp-" + (p.fx || "evolve"));
                    if (p.text) msgEl.innerHTML = `<b class="sp-say">${p.text}</b>`;
                    Sound.bonus();
                    await pace(750);
                    break;
                }
                case "clear": {
                    for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("sp-smash");
                    if (p.cells?.length) Sound.boom?.();
                    await pace(380);
                    break;
                }
                case "drop": {
                    api.showGrid(p.grid);
                    api.reelsBox.classList.remove("sp-drop"); void api.reelsBox.offsetWidth; api.reelsBox.classList.add("sp-drop");
                    Sound.stop();
                    await pace(380);
                    break;
                }
                case "win": {
                    api.reelsBox.querySelectorAll(".sym").forEach(s => s.classList.add("dim"));
                    for (const [c, r] of p.cells || []) { const e = cellsEl(c, r); e?.classList.remove("dim"); e?.classList.add("hit"); }
                    await add(p.win, p.text);
                    await pace(520);
                    api.reelsBox.querySelectorAll(".dim").forEach(s => s.classList.remove("dim"));
                    break;
                }
                case "jp": {
                    if (p.offerJp) { // only paid when the player actually took that jackpot offer
                        if (!offerTaken?.jp) break;
                        p.tier = offerTaken.k; p.amount = offerTaken.v;
                    }
                    jpWins.push({ tier: p.tier, amount: p.amount });
                    run += p.amount;
                    await api.bigWin(p.amount, bet, { jackpot: p.tier });
                    winEl.textContent = fmt(run);
                    break;
                }
                case "badge": {
                    for (const b of p.cells || []) {
                        const el = cellsEl(b.c, b.r); if (!el) continue;
                        el.querySelector(".spb")?.remove();
                        el.append(h("b.spb." + (b.cls || "val"), b.text));
                    }
                    break;
                }
                case "fx": await playFx(p); break;
                case "banner": Sound.bonus(); await api.banner(p.text, p.ms || 1500, p.cls || "bonus"); break;
                case "mode": if (p.add) cabinet.classList.add(p.add); if (p.remove) cabinet.classList.remove(p.remove); break;
                case "hud": hud.textContent = p.text || ""; hud.classList.toggle("on", !!p.text); break;
                case "meter": api.meter(p.key, p.value, p.max); break;
                case "rows": setRows(p.n); if (p.n <= (cfg.rows || 3)) api.reelsBox.querySelectorAll(".sp-held").forEach(e => e.classList.remove("sp-held")); break;
                case "wheel": await api.wheelSpin(p.seg, p.idx, s => s, p.title); break;
                case "pick": await api.playPick(p.f, { revealOnly: true }); break;
                case "critic": await add(await critic(p), "⭐ FOOD CRITIC"); break;
                case "offer": {
                    offerTaken = await offer(p);
                    if (!offerTaken.jp) await add(offerTaken.v, `🎁 TOP OFFER ${offerTaken.k}`);
                    break;
                }
                case "laser": await laser(p); break;
                case "pickn": await pickN(p); break;
                case "ladder": await ladder(p); break;
                case "plinko": await plinko(p); break;
                case "claw": await claw(p); break;
                case "focus": {
                    // spotlight the cell(s) a bonus is coming from
                    api.reelsBox.querySelectorAll(".sp-focus").forEach(e => e.classList.remove("sp-focus"));
                    for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("sp-focus");
                    Sound.tick(); await pace(p.ms || 650);
                    break;
                }
                case "bingoline": await bingoLine(p); break;
                case "panel": api.meter(p.key, p.value, p.hl); await pace(p.hl ? 700 : 250); break;
                case "tease": msgEl.innerHTML = `<span class="tease">아깝다!! 😱</span>`; break;
            }
        }
    } finally {
        hud.remove();
        setRows(cfg.rows || 3);
        api.reelsBox.querySelectorAll(".sp-held,.sp-frozen,.sp-focus").forEach(e => e.classList.remove("sp-held", "sp-frozen", "sp-focus"));
    }
    return { total: Math.round(run), jpWins };

    // ------------------------------------------------------------ fx
    async function playFx(p) {
        if (p.name === "laser" || p.name === "lasers") {
            for (const [c, r] of p.cells || []) cellsEl(c, r)?.classList.add("sp-beam");
            Sound.coin(); await pace(300);
            return;
        }
        const d = FX[p.name] || { icon: "✨", text: "", snd: "bonus", cls: "gold" };
        if (p.grids?.length) {
            cabinet.classList.add("sp-rewinding");
            for (const g of p.grids) { api.showGrid(g); Sound.whoosh(); await pace(260); }
            cabinet.classList.remove("sp-rewinding");
        }
        const el = h("div.sp-fx.spfx-" + d.cls, h("div.spfx-icon", d.icon), d.text ? h("div.spfx-text", d.text) : null);
        if (p.col != null) { el.classList.add("at-col"); el.style.setProperty("--col", p.col); el.style.setProperty("--cols", cfg.reels || 5); }
        cabinet.append(el);
        Sound[d.snd]?.();
        if (d.shake) api.shake(frame);
        if (p.name === "goldbox") api.confetti(60, ["🎁", "🪙", "✨", "🎀"]);
        await pace(d.text ? 900 : 500);
        el.remove();
    }

    // ------------------------------------------------------------ Food Critic boss battle
    // The critic shouts an order; tap the matching dish before the 10 s run out.
    async function critic(p) {
        const dishes = Object.entries(cfg.syms).filter(([, d]) => !d.raw).map(([k, d]) => ({ k, e: d.e, name: d.name }));
        const orders = p.orders.map((v, i) => ({ v, dish: dishes[(i * 7 + Math.floor(Math.random() * 9)) % dishes.length] }));
        let served = 0, idx = 0, sum = 0;
        const ask = h("div.critic-ask"), timeEl = h("b.critic-time", "10.0"), servedEl = h("div.critic-served");
        const btns = h("div.critic-btns", dishes.map(d => h("button.critic-dish", { onclick: () => tap(d.k) }, h("span", d.e), h("small", d.name))));
        overlay.append(h("div.critic-wrap", h("div.critic-boss", "🧐"), h("div.critic-head", "FOOD CRITIC — 주문한 요리를 탭!"), ask, timeEl, btns, servedEl));
        const show = () => { const o = orders[idx]; ask.replaceChildren(o ? h("span", `"${o.dish.e} ${o.dish.name} 주세요!"`) : h("span", "배불러…")); };
        let done;
        const finished = new Promise(r => done = r);
        function tap(k) {
            const o = orders[idx]; if (!o) return;
            if (k === o.dish.k) { served++; sum += o.v; idx++; Sound.coin(); servedEl.append(h("span", o.dish.e)); if (idx >= orders.length) done(); else show(); }
            else { Sound.stop(); ask.classList.remove("wrong"); void ask.offsetWidth; ask.classList.add("wrong"); }
        }
        show();
        const t0 = performance.now();
        const timer = setInterval(() => { const left = Math.max(0, 10 - (performance.now() - t0) / 1000); timeEl.textContent = left.toFixed(1); if (left <= 0) done(); }, 100);
        await finished; clearInterval(timer);
        const stars = served >= 10 ? 3 : served >= 6 ? 2 : 1;
        if (!served) sum = orders[0].v; // the critic at least tastes one dish
        overlay.replaceChildren();
        await api.banner(`${"⭐".repeat(stars)} ${served}접시 서빙! 팁 x${stars}`, 1500, "jackpot");
        return Math.round(sum * stars);
    }

    // ------------------------------------------------------------ Gift Top Offer (deal or no deal)
    async function offer(p) {
        const box = h("div.offer-box");
        const wrap = h("div.offer-wrap", h("div.offer-head", "🎁 TOP OFFER — 받을까, 다음 상자를 열까?"), box);
        overlay.append(wrap);
        const label = o => o.jp ? `${o.k} JACKPOT` : `${o.k} = ${fmt(o.v)} G`;
        let taken = null;
        for (let i = 0; i < p.offers.length && !taken; i++) {
            const o = p.offers[i];
            const last = i === p.offers.length - 1;
            box.replaceChildren(h("div.offer-gift.pop", "🎁"), h("div.offer-val" + (o.jp ? ".jp" : ""), label(o)), h("small", `${i + 1} / ${p.offers.length}${last ? " · 마지막 상자!" : ""}`));
            Sound.bonus();
            if (last) { await pace(900); taken = o; break; }
            const take = h("button.btn.gold.big", "받기 (DEAL)"), next = h("button.btn.ghost.big", "다음 상자 ▶");
            box.append(h("div.offer-btns", take, next));
            const auto = o.v >= 10 * bet; // the auto choice mirrors the engine's assumption
            const ans = await Promise.race([new Promise(r => { take.onclick = () => r(true); next.onclick = () => r(false); }), sleep(9000).then(() => auto)]);
            if (ans) taken = o;
        }
        overlay.replaceChildren();
        Sound.cash();
        return taken;
    }

    // ------------------------------------------------------------ pick N of M (cards / flasks / cups)
    // The engine already decided the prizes; they are revealed in the order the player taps.
    async function pickN(p) {
        const grid = h("div.pickn-grid" + (p.panelCards ? ".cards" : ""));
        const left = h("small.pickn-left", `남은 선택 ${p.k}`);
        overlay.append(h("div.pickn-wrap", h("div.pickn-head", p.title), left, grid));
        let k = 0;
        const tiles = [];
        await new Promise(done => {
            for (let i = 0; i < p.n; i++) {
                const t = h("button.pn-tile", { style: { "--i": i } }, h("span.pn-back", p.icon || "❓"), h("b.pn-face"));
                t.onclick = async () => {
                    if (t.classList.contains("open") || k >= p.k) return;
                    const r = p.reveals[k++];
                    t.classList.add("open", "pn-" + (r.cls || "ok"));
                    t.querySelector(".pn-face").textContent = r.text;
                    left.textContent = `남은 선택 ${p.k - k}`;
                    r.cls === "bad" ? (Sound.boom?.(), api.shake(frame)) : r.cls === "jp" ? Sound.bonus() : Sound.coin();
                    if (k >= p.k) { await sleep(600); done(); }
                };
                tiles.push(t); grid.append(t);
            }
            (async () => { while (k < p.k) { await sleep(9000); if (k < p.k) tiles.find(x => !x.classList.contains("open"))?.click(); await sleep(700); } })();
        });
        // show what the other cards were
        let j = 0;
        for (const t of tiles.filter(x => !x.classList.contains("open"))) { t.classList.add("open", "pn-rest"); t.querySelector(".pn-face").textContent = p.rest?.[j++]?.text || ""; }
        await pace(p.rest ? 1300 : 500);
        overlay.replaceChildren();
    }

    // ------------------------------------------------------------ ladder (safe dial, nebula rings, pendulum…)
    async function ladder(p) {
        const steps = p.steps.map((s, i) => h("div.ld-step", { style: { "--i": i } }, h("span", p.icon || "⭐"), h("b", s)));
        const wrap = h("div.ladder-wrap", h("div.ladder-head", p.title), h("div.ladder", ...[...steps].reverse()));
        overlay.append(wrap);
        Sound.bonus();
        await pace(500);
        for (let i = 0; i <= p.reached; i++) { steps[i].classList.add("on"); Sound.coin(); await pace(i === p.reached ? 700 : 420); }
        steps[p.reached]?.classList.add("final");
        Sound.bonus();
        await pace(900);
        overlay.replaceChildren();
    }

    // ------------------------------------------------------------ Plinko tree (Pay Day)
    async function plinko(p) {
        const W = 9, ROWS = p.rows;
        const board = h("div.plk-board", { style: { "--rows": ROWS + 1 } });
        const pegs = [];
        for (let r = 0; r <= ROWS; r++) {
            const row = h("div.plk-row", { style: { "--n": r + 1 } });
            for (let c = 0; c <= r; c++) {
                const bp = p.bumps.find(b => b.row === r && b.col === c);
                const el = h("i.plk-peg" + (bp ? ".bump" + (bp.label.startsWith("x") ? ".mult" : ".jp") : ""), bp ? bp.label : "");
                row.append(el); pegs.push({ r, c, el });
            }
            board.append(row);
        }
        const slots = h("div.plk-slots", p.bottom.map(b => h("span", b)));
        const tally = h("div.plk-tally");
        overlay.append(h("div.plk-wrap", h("div.plk-head", p.title + " · 구슬 3개"), board, slots, tally));
        for (const [i, b] of p.balls.entries()) {
            const go = h("button.btn.gold", `${p.glyph} 구슬 ${i + 1} 떨어뜨리기`);
            tally.append(go);
            await Promise.race([new Promise(r => go.onclick = r), sleep(5000)]);
            go.remove();
            const ball = h("b.plk-ball", p.glyph);
            board.append(ball);
            let stopPeg = null;
            for (let r = 0; r < b.path.length; r++) {
                const peg = pegs.find(x => x.r === r && x.c === b.path[r]);
                if (!peg) continue;
                const box = board.getBoundingClientRect(), pb = peg.el.getBoundingClientRect();
                ball.style.left = (pb.left - box.left + pb.width / 2) + "px"; ball.style.top = (pb.top - box.top + pb.height / 2) + "px";
                const bp = p.bumps.find(x => x.row === r && x.col === b.path[r]);
                if (bp && b.stop) { stopPeg = peg.el; await pace(260); break; }
                Sound.tick();
                await pace(260);
            }
            let res;
            if (b.stop) {
                // the ball sticks to the bumper and cashes it in on the spot
                stopPeg.classList.remove("hit"); void stopPeg.offsetWidth; stopPeg.classList.add("hit", "won");
                ball.classList.add("stuck"); ball.textContent = b.tier ? `${p.glyph} JACKPOT!` : `${p.glyph} ${b.stop}!`;
                b.tier ? Sound.bonus() : Sound.cash();
                api.shake?.(frame);
                res = b.tier ? `${p.glyph} ${i + 1}: 💥 JACK 범퍼 즉시 당첨 → JACKPOT! ${fmt(b.amount || 0)} G` : `${p.glyph} ${i + 1}: 💥 ${b.stop} 범퍼 즉시 당첨 → ${fmt(b.value)} G`;
            } else {
                slots.children[b.slot]?.classList.add("hit");
                Sound.coin();
                res = `${p.glyph} ${i + 1}: ${p.bottom[b.slot]} = ${fmt(b.value)} G`;
            }
            tally.append(h("div.plk-res" + (b.stop ? ".big" : ""), res));
            await pace(b.stop ? 1200 : 700);
            ball.remove(); slots.children[b.slot]?.classList.remove("hit"); stopPeg?.classList.remove("won");
        }
        await pace(900);
        overlay.replaceChildren();
    }

    // ------------------------------------------------------------ Vampire Bingo: one called line, its bonus coins fire one by one
    async function bingoLine(p) {
        const ICON = { cash: "🪙", bat: "🦇", wheel: "🎡", fang: "🦷" };
        const toks = p.coins.map((c, i) => h("div.bl-tok.k-" + c.k, { style: { "--i": i } }, h("span", ICON[c.k]), h("b", c.v ? fmt(c.v) : c.k === "fang" ? "?" : "")));
        const tally = h("div.bl-tally", "0");
        const note = h("div.bl-note", "");
        const row = h("div.bl-row", toks);
        overlay.append(h("div.bl-wrap", h("div.bl-head", `🧛 ${p.label}! 🧛`), row, note, tally));
        Sound.bonus();
        await pace(700);
        let run = 0;
        // 1) cash coins count up
        for (const [i, c] of p.coins.entries()) {
            if (!c.v) continue;
            toks[i].classList.add("pop"); run += c.v; tally.textContent = fmt(run) + " G"; Sound.coin();
            await pace(260);
        }
        // 2) the bat swallows every coin on the line in one go
        if (p.bat >= 0) {
            note.textContent = "🦇 BAT SWARM! 줄의 코인이 박쥐에게 모인다!";
            Sound.whoosh?.();
            const bt = toks[p.bat], br = bt.getBoundingClientRect();
            for (const [i, t] of toks.entries()) {
                if (i === p.bat || !p.coins[i].v) continue;
                const r = t.getBoundingClientRect();
                t.style.setProperty("--dx", (br.left - r.left) + "px");
                t.classList.add("fly");
            }
            await pace(700);
            bt.classList.add("merged"); bt.querySelector("b").textContent = fmt(p.sum);
            Sound.cash(); api.shake?.(frame);
            await pace(900);
        }
        // 3) wheels pop out and multiply the line
        for (const w of p.wheels) {
            toks[w.at].classList.add("pop");
            note.textContent = "🎡 VAMPIRE WHEEL!";
            await api.wheelSpin(p.seg, w.idx, s => s, "🧛 VAMPIRE WHEEL 🧛");
            run = Math.round((run || p.sum) * w.x);
            toks[w.at].querySelector("b").textContent = "x" + w.x;
            tally.textContent = `${fmt(run)} G`; tally.classList.remove("boost"); void tally.offsetWidth; tally.classList.add("boost");
            Sound.bonus();
            await pace(700);
        }
        tally.textContent = fmt(p.total) + " G";
        // 4) fang coins keep flipping, slowing down, until a jackpot shows
        for (const fg of p.fangs) {
            const t = toks[fg.at], face = t.querySelector("b");
            note.textContent = "🦷 FANG COIN… 무슨 잭팟일까?";
            t.classList.add("flipping");
            const seq = ["MINI", "MINOR", "MAJOR", "MINI", "MAJOR", "MINOR", "GRAND", "MINI", "MINOR", "MAJOR"];
            let d = 70;
            for (let k = 0; k < 22; k++) { face.textContent = seq[k % seq.length]; Sound.tick(); await sleep(d); d *= 1.13; }
            face.textContent = fg.tier;
            t.classList.remove("flipping"); t.classList.add("landed");
            note.textContent = `🦷 ${fg.tier} JACKPOT · ${fmt(fg.amount)} G!`;
            Sound.bonus(); api.shake?.(frame);
            await pace(1100);
        }
        await pace(600);
        overlay.replaceChildren();
    }

    // ------------------------------------------------------------ claw machine (Coin Claw)
    async function claw(p) {
        const LABEL = { free: "FREE SPIN", wheel: "🎡 WHEEL", mystery: "❓", jackpot: "💰 JACKPOT" };
        const balls = h("div.claw-balls", p.balls.map((b, i) => h("i.claw-ball", { style: { "--i": i } }, "❓")));
        const arm = h("div.claw-arm", h("span", "🦾"));
        const btn = h("button.btn.gold.big", "🕹️ 집게 내리기!");
        const res = h("div.claw-res");
        overlay.append(h("div.claw-wrap", h("div.claw-head", p.title || "🦾 CLAW MACHINE · 버튼을 눌러 공을 뽑아라!"), h("div.claw-box", arm, balls), btn, res));
        await Promise.race([new Promise(r => btn.onclick = r), sleep(7000)]);
        btn.remove();
        const target = balls.children[Math.floor(Math.random() * balls.children.length)];
        arm.style.setProperty("--x", target.offsetLeft + target.offsetWidth / 2 + "px");
        arm.classList.add("down"); Sound.whoosh();
        await pace(900);
        target.classList.add("grabbed"); target.replaceChildren(h("small", LABEL[p.pick] || p.pick), p.prize ? h("b", p.prize) : "");
        arm.classList.remove("down"); arm.classList.add("up"); Sound.bonus();
        await pace(800);
        res.textContent = `🎉 ${LABEL[p.pick] || p.pick} 공!${p.prize ? " → " + p.prize : ""}`;
        await pace(1100);
        overlay.replaceChildren();
        api.reelsBox.querySelectorAll(".sp-focus").forEach(e => e.classList.remove("sp-focus"));
    }

    // ------------------------------------------------------------ Laser Grid Breach (pick until an alarm)
    async function laser(p) {
        const grid = h("div.laser-grid");
        const tally = h("div.laser-tally", "x0");
        overlay.append(h("div.laser-wrap", h("div.laser-head", "📘 레이저 노드를 해킹하라! 🚨 경보 = 종료 · 모든 안전 노드 = TIME VAULT"), tally, grid));
        let k = 0, mult = 0;
        await new Promise(done => {
            for (let i = 0; i < p.nodes; i++) {
                const n = h("button.lnode", "🔴");
                n.onclick = async () => {
                    if (n.classList.contains("open") || k >= p.picks.length) return;
                    const pk = p.picks[k++];
                    n.classList.add("open");
                    if (pk.alarm) { n.classList.add("alarm"); n.textContent = "🚨"; Sound.boom?.(); api.shake(frame); }
                    else if (pk.jp) { n.classList.add("jp"); n.textContent = pk.jp; Sound.bonus(); }
                    else { mult += pk.m; n.textContent = "x" + pk.m; Sound.coin(); tally.textContent = "x" + mult; }
                    if (k >= p.picks.length) { await sleep(700); done(); }
                };
                grid.append(n);
            }
            (async () => { while (k < p.picks.length) { await sleep(8000); if (k < p.picks.length) [...grid.children].find(x => !x.classList.contains("open"))?.click(); await sleep(600); } })();
        });
        [...grid.children].filter(x => !x.classList.contains("open")).forEach(x => x.classList.add("dim"));
        await pace(600);
        overlay.replaceChildren();
    }
}

// ---------------------------------------------------------------- top panels
// Built once per cabinet; `set(key, value, max)` updates them in place.
export function buildPanel(cfg, state = {}) {
    const E = cfg.engine;
    const el = h("div.sp-panel.spp-" + E.slice(3));
    const parts = {};
    const bar = (key, label, cls = "") => {
        const fill = h("i"), v = h("small");
        const b = h("div.spp-bar" + (cls ? "." + cls : ""), h("b", label), h("div.spp-track", fill), v);
        parts[key] = { b, fill, v };
        return b;
    };
    if (E === "sp_kitchen") el.append(h("span.spp-ico", "🦖"), bar("titan", "HUNGRY TITAN", "titan"));
    else if (E === "sp_pillars") {
        const names = { E1: "木", E2: "火", E3: "土", E4: "金", E5: "水" };
        el.append(h("span.spp-ico", "☯️"), ...Object.keys(names).map(k => bar(k, names[k], "el-" + k)));
    } else if (E === "sp_gift") {
        const gold = h("div.gift-gold", "❓");
        parts.heat = { gold };
        el.append(h("div.gift-row", Array.from({ length: 9 }, (_, i) => h("div.gift-box.g" + (i % 5), "🎁")), gold));
    } else if (E === "sp_orb") el.append(h("div.sp-aura", h("span.sun", "☀️"), h("span.vs", "SOL · UMBRA"), h("span.moon", "🌙")));
    else if (E === "sp_pod") el.append(h("div.sp-aura", h("span.hw", "🐹"), h("span.vs", "MEGA HAMSTER = 모든 잭팟 합계"), h("span.hw r", "🐹")));
    else if (E === "sp_heist") el.append(h("div.sp-aura", h("span.dial", "🔐"), h("span.vs", "TIME VAULT · 레이저를 모두 해제하라"), h("span.dial r", "⏱️")));
    else if (E === "sp_dj") el.append(h("div.sp-aura", h("span.disc", "💿"), h("span.vs", "DJ CRYPTO LIVE"), h("span.disc r", "💿")));
    // ---- the 15 theme machines
    const aura = (l, text, r = l) => el.append(h("div.sp-aura", h("span.aura-l", l), h("span.vs", text), h("span.aura-r", r)));
    const custom = (k, render) => { parts[k] = { render }; };
    if (E === "sp_clockwork") el.append(h("div.tp-gears", h("i.g1", "⚙️"), h("i.g2", "⚙️"), h("i.g3", "⚙️"), h("b", "THE CLOCKWORK VAULT"), h("i.g4", "🔒")));
    else if (E === "sp_alchemist") el.append(h("span.spp-ico", "⚗️"), bar("tube", "💧 DISTILLER", "tube"));
    else if (E === "sp_astral") aura("🌌", "STARLIGHT SYNDICATE · 별 4개 이상 = 별자리", "🔭");
    else if (E === "sp_neon") el.append(h("span.spp-ico.sparky", "🤖"), bar("battery", "🔋 SPARKY BATTERY", "battery"));
    else if (E === "sp_popcorn") {
        el.append(h("span.spp-ico", "🍿"), bar("red", "🔴 FREE GAMES", "red"), bar("blue", "🔵 MULTIPLIER", "blue"), bar("gold", "🟡 WILD REELS", "gold"));
        parts.red.fmt = v => `${v}회`; parts.blue.fmt = v => `x${v}`; parts.gold.fmt = v => `${Math.min(4, 1 + Math.floor(v / 5))}릴`;
    }
    else if (E === "sp_ouija") aura("🕯️", "MIDNIGHT OUIJA · 25 LINES", "🕯️");
    else if (E === "sp_tower") el.append(h("div.tp-guillotine", h("i.blade", "🔪"), h("b", "TOWER OF TERROR · 가운데 한 줄"), h("i.moon", "🌩️")));
    else if (E === "sp_bog") aura("🫧", "THE BOG · 늪의 마녀가 지켜본다", "🧙‍♀️");
    else if (E === "sp_cyberdial") el.append(h("div.tp-lcd", h("b", "CYBER-DIAL 2000"), h("span.lcd-blink", "▮ READY TO DIAL")));
    else if (E === "sp_sundrum") aura("☀️", "SUN-DRUM LEGACY · 3 RINGS", "🥁");
    else if (E === "sp_strikes") {
        const pins = h("div.lane-pins", Array.from({ length: 10 }, (_, i) => h("i", { style: { "--i": i } }, "🎳")));
        const marks = h("div.lane-strikes", h("small", "STRIKE"), [0, 1, 2].map(i => h("b", "✕")));
        el.append(h("div.tp-lane", h("div.lane-floor", pins), marks));
        custom("pins", v => { [...pins.children].forEach((p, i) => p.classList.toggle("on", i < v)); pins.classList.toggle("full", v >= 10); });
        custom("strikes", v => [...marks.querySelectorAll("b")].forEach((b, i) => b.classList.toggle("on", i < v)));
    } else if (E === "sp_vampire") {
        const cells = Array.from({ length: 25 }, () => h("i.bg-cell"));
        const vamp = h("span.bg-vamp", "🧛");
        el.append(h("div.tp-bingo", h("div.bg-head", "B I N G O"), h("div.bg-grid", cells), vamp));
        const ICON = { fang: "🦷", bat: "🦇", wheel: "🎡" };
        custom("bingo", (arr, hl) => {
            cells.forEach((c, i) => { const x = arr?.[i]; c.className = "bg-cell" + (x ? " on k-" + x.k : "") + (hl?.includes(i) ? " hl" : ""); c.textContent = !x ? "" : x.k === "cash" ? (x.v >= 1e4 ? Math.round(x.v / 1000) + "K" : x.v) : ICON[x.k]; });
            vamp.classList.remove("peek"); void vamp.offsetWidth; vamp.classList.add("peek");
        });
    } else if (E === "sp_payday") {
        const env = (g, k) => { const fill = h("i.env-fill"); const e = h("div.env", h("b", g), fill); custom(k, v => { fill.style.height = Math.min(100, v) + "%"; e.classList.toggle("full", v >= 100); }); return e; };
        el.append(h("div.tp-envs", env("福", "fu"), h("span.vs", "PAY DAY 💸"), env("到", "dao")));
    } else if (E === "sp_jokers") el.append(h("div.tp-cards", Array.from({ length: 5 }, (_, i) => h("i.tcard", { style: { "--i": i } }, "🂠"))));
    else if (E === "sp_cathedral") aura("🔔", "CATHEDRAL OF WINGS · 24 SHARDS", "🕊️");
    else if (E === "sp_velvet") aura("🎩", "THE VELVET TABLE · VIP VAULT", "💎");
    else if (E === "sp_astro") aura("🛸", "ASTRO-DINER 5099 · 20 WINDOWS", "🍔");
    else if (E === "sp_lilypad") aura("🐸", "LILYPAD LEAP · 19 PADS", "🪷");
    else if (E === "sp_gridlock") aura("🚦", "GRIDLOCK RUSH HOUR · 4-WAY", "🚕");
    else if (E === "sp_helm") {
        // two ships rocking on a rainy sea; each sail rises with every ⛵ thrown at it
        const ship = (label, k) => {
            const sail = h("i.hl-sail"), s = h("div.hl-ship.k-" + k, h("div.hl-mast", sail), h("div.hl-hull", h("b", label)));
            custom(k, (v, max) => { const f = Math.max(0, Math.min(1, v / (max || 10))); sail.style.setProperty("--f", f.toFixed(2)); s.classList.toggle("near", f >= 0.7 && f < 1); s.classList.toggle("full", f >= 1); });
            return s;
        };
        el.append(h("div.tp-sea", h("div.hl-rain"), ship("GROW REELS", "sailR"), ship("GROW CASH", "sailC"),
            h("div.hl-waves"), ...["🐟", "🐠", "🐡"].map((f, i) => h("i.hl-fish", { style: { "--i": i } }, f))));
    }
    else if (E === "sp_bricks") aura("🏗️", "SMASH THE BRICKS · 2x2 판을 드러내라!", "🔨");
    else if (E === "sp_classic") aura("7️⃣", "CLASSIC MANIA · 3 LINES", "🍒");
    else if (E === "sp_mimic") aura("🔥", "THE MIMIC'S LABYRINTH · 25 PLATES", "🔥");
    else if (E === "sp_abyss") aura("📡", "DEPTH 10,994 m · SONAR ONLINE", "🐙");
    else if (E === "sp_glacier") aura("🔨", "GLACIER FRACTURE · 18 FLOES", "🦣");
    else if (E === "sp_quantum") aura("🐈‍⬛", "|ψ⟩ = α|WIN⟩ + β|LOSE⟩", "⚛️");
    else if (E === "sp_kindness") aura("🏮", "KINDNESS · SOUP KITCHEN & SANCTUARY", "🥣");
    else if (E === "sp_coinclaw") el.append(h("div.tp-claw", h("span.tc-arm", "🦾"), h("div.tc-balls", ["❓", "🎡", "FREE", "💰", "❓", "🎡", "FREE", "❓"].map((b, i) => h("i", { style: { "--i": i } }, b))), h("span.tc-spark", "✨")));
    const set = (key, value, max) => {
        const p = parts[key]; if (!p) return;
        if (p.render) return p.render(value, max);
        const f = Math.max(0, Math.min(1, value / (max || 1)));
        if (p.gold) {
            p.gold.style.setProperty("--heat", f.toFixed(3));
            p.gold.classList.toggle("hot", f >= 0.5); p.gold.classList.toggle("bursting", f >= 0.8);
            return;
        }
        p.fill.style.width = f * 100 + "%";
        p.v.textContent = p.fmt ? p.fmt(value, max) : `${value}/${max}`;
        p.b.classList.toggle("full", f >= 1); p.b.classList.toggle("near", f >= 0.7 && f < 1);
        p.b.classList.remove("bump"); void p.b.offsetWidth; p.b.classList.add("bump");
    };
    // initial state
    if (E === "sp_kitchen") set("titan", state.titan || 0, cfg.titanMax || 25);
    if (E === "sp_pillars") for (const k of ["E1", "E2", "E3", "E4", "E5"]) set(k, state.yong?.[k] || 0, cfg.yong?.max || 8);
    if (E === "sp_gift") set("heat", state.heat || 0, 100);
    if (E === "sp_alchemist") set("tube", state.tube || 0, 12);
    if (E === "sp_neon") set("battery", state.battery || 0, 30);
    if (E === "sp_popcorn") { set("red", state.red ?? 8, 50); set("blue", state.blue ?? 2, 10); set("gold", state.gold || 0, 20); }
    if (E === "sp_strikes") { set("pins", state.pins ?? 1); set("strikes", state.strikes || 0); }
    if (E === "sp_vampire") set("bingo", state.board || []);
    if (E === "sp_payday") { set("fu", state.fu || 0, 100); set("dao", state.dao || 0, 100); }
    if (E === "sp_helm") { set("sailR", state.sailR || 0, 10); set("sailC", state.sailC || 0, 10); }
    return { el, set };
}
