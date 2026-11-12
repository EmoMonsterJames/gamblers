// =====================================================================
// Renderer for the special machines (specialEngine.js). Plays a result's
// `phases` script on the shared slot cabinet (slot.js passes `api`).
// Returns { total, jpWins } — the actual paid amount (interactive bonuses
// like Top Offer / Food Critic may differ from the engine's assumption).
// =====================================================================
import { h, sleep, fmt, countUp } from "../core/util.js";

const FX = {
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
    replay: { icon: "🌀⏩", text: "TIME-LOOP REPLAY!", snd: "bonus", cls: "glitch" }
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
                    api.showGrid(p.grid);
                    const cells = p.pop || p.cells || [];
                    for (const [c, r] of cells) cellsEl(c, r)?.classList.add("pop");
                    if (cells.length) Sound.coin();
                    await pace(p.t === "land" ? 380 : 300);
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
                case "tease": msgEl.innerHTML = `<span class="tease">아깝다!! 😱</span>`; break;
            }
        }
    } finally {
        hud.remove();
        setRows(cfg.rows || 3);
        api.reelsBox.querySelectorAll(".sp-held,.sp-frozen").forEach(e => e.classList.remove("sp-held", "sp-frozen"));
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
        if (p.name === "rewind" && p.grids?.length) {
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
    const set = (key, value, max) => {
        const p = parts[key]; if (!p) return;
        const f = Math.max(0, Math.min(1, value / (max || 1)));
        if (p.gold) {
            p.gold.style.setProperty("--heat", f.toFixed(3));
            p.gold.classList.toggle("hot", f >= 0.5); p.gold.classList.toggle("bursting", f >= 0.8);
            return;
        }
        p.fill.style.width = f * 100 + "%";
        p.v.textContent = `${value}/${max}`;
        p.b.classList.toggle("full", f >= 1); p.b.classList.toggle("near", f >= 0.7 && f < 1);
        p.b.classList.remove("bump"); void p.b.offsetWidth; p.b.classList.add("bump");
    };
    // initial state
    if (E === "sp_kitchen") set("titan", state.titan || 0, cfg.titanMax || 25);
    if (E === "sp_pillars") for (const k of ["E1", "E2", "E3", "E4", "E5"]) set(k, state.yong?.[k] || 0, cfg.yong?.max || 8);
    if (E === "sp_gift") set("heat", state.heat || 0, 100);
    return { el, set };
}
