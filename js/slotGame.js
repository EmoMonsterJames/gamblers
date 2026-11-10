// =====================================================================
// Slot game page (pages/slot.html?game=<id>) - one script for every
// slot game. emo_slot_spin decides EVERYTHING in one call (base spin,
// meters, picks, wheel, free games, Hold & Spin, Grow Reels); this file
// only animates the result. The look comes from cfg.theme:
//   piggy (Coin-Pigglet's Luck), samurai (Samurai Cash),
//   leprechaun (Gold Chance), fufu (FuFu Firecracker, high limit).
// Grids are arrays of reels (columns); a reel can have 3-6 rows.
// =====================================================================
const SlotGame = {
    gameId: null,
    playerId: null,
    game: null,          // slot_games row
    status: null,        // emo_slot_status
    bet: 100,
    grid: [],
    busy: false,
    // jackpot tiers top to bottom (a machine may list its own, e.g. Bonanza Meter adds MAXI)
    get TIERS() { return this.game?.config?.tiers || ["GRAND", "MAJOR", "MINOR", "MINI"]; },
    CARDS: ["K", "Q", "J", "A"],
    BONUS_FEATURES: ["free", "hold", "piggy", "bag", "wheel", "pick", "grow"],
    THEME: {
        piggy:      { coin: "images/monsters/coin-pigglet.svg", luck: "🍀 Luck has arrived! 🍀" },
        samurai:    { coin: "images/slots/money-bag.svg", luck: "⚔️ The Sensei is watching… ⚔️" },
        leprechaun: { coin: "images/slots/lep-coin.svg", luck: "🍀 Luck has arrived! 🍀" },
        fufu:       { coin: "images/slots/fu.svg", luck: "🧨 福 has turned! 🧨" },
        bonanza:    { coin: "images/slots/snow-coin.svg", luck: "❄️ Luck has arrived! ❄️" }
    },
    // Bonanza Meter: the three thermometers (symbol, label, what its Hold & Spin icon does)
    THERMOS: {
        hot:   { sym: "TR", label: "SO HOT",   icon: "images/slots/thermo-red.svg",    hs: "RED",  what: "collects every coin on the board" },
        extra: { sym: "TY", label: "SO EXTRA", icon: "images/slots/thermo-yellow.svg", hs: "YEL",  what: "splits the coins next to it in two" },
        cold:  { sym: "TB", label: "SO COLD",  icon: "images/slots/thermo-blue.svg",   hs: "BLU",  what: "multiplies the coins next to it ×2–×5" }
    },
    PICK_TITLE: { piggy: "💥 PIGGY BREAK! 💥", bag: "💰 THE BAG BURST! 💰", pouch: "🍀 LEPRECHAUN'S POUCH 🍀" },

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
    $(id) { return document.getElementById(id); },

    async init() {
        this.playerId = UI.requireLogin();
        UI.nav("slots");
        SoundManager.startBgm("casino");
        SoundManager.preload(["tick", "click", "coin", "casino_win", "jackpot", "shake", "gift_open", "levelup", "victory", "crit", "hit"]);
        this.gameId = new URLSearchParams(location.search).get("game") || "coin_pigglet";
        try {
            const rows = await UI.q(supabaseClient.from("slot_games").select("*").eq("id", this.gameId).eq("is_active", true));
            this.game = rows?.[0];
            if (!this.game) throw new Error(GameConfig.ERRORS.GAME_NOT_FOUND);
            const saved = Number(localStorage.getItem(`slotBet:${this.gameId}`));
            this.bet = this.cfg.bets.includes(saved) ? saved : this.cfg.bets[0];
            document.body.classList.add(`theme-${this.theme}`);
            // every slot game has its own theme song (config.bgm = a SoundManager theme or "file:<mp3>" overrides it)
            const bgm = this.cfg.bgm || `slot_${this.theme}`;
            if (SoundManager.THEMES[bgm] || String(bgm).startsWith("file:")) SoundManager.startMapBgm(bgm);
            this.$("slotName").textContent = this.game.name;
            this.$("slotDesc").textContent = this.game.description || "";
            if (this.game.brand) this.$("machine").insertAdjacentHTML("afterbegin", `<div class="brand-plate">${SlotGame.brandImg(this.game.brand)}</div>`);
            this.$("backLink").href = `slots.html${this.game.room === "high" ? "#high" : ""}`;
            this.grid = Array.from({ length: 5 }, (_, r) => Array.from({ length: 3 }, () => this.randomSym(r)));
            this.buildDecor();
            this.drawGrid(this.grid);
            this.renderBets();
            this.renderPayTable();
            this.$("spinBtn").onclick = () => this.spin();
            document.addEventListener("keydown", e => { if (e.code === "Space" && e.target === document.body) { e.preventDefault(); this.spin(); } });
            await this.loadStatus();
            this.renderMeter(this.myState(), true);
            this.decorBuilt = true;
            this.initDemo().catch(e => console.warn("demo", e));
            setInterval(() => { if (!this.busy) this.loadStatus(); }, 10000);   // other players grow the jackpots too
        } catch (e) { UI.error(e); }
    },

    get cfg() { return this.game.config; },
    get theme() { return this.cfg.theme || "piggy"; },
    img(path) { return `../${path}`; },
    myState() { return this.status?.states?.[this.gameId] || {}; },

    // ------------------------------------------------------------------
    // status: jackpots, spins left, money, big wins
    // ------------------------------------------------------------------
    async loadStatus() {
        try {
            const before = JSON.stringify(this.myState());
            this.status = await UI.rpc("emo_slot_status", { p_player_id: String(this.playerId) });
            this.renderStatus();
            // the meters belong to the machine: another player may have moved them meanwhile
            if (!this.busy && this.decorBuilt && JSON.stringify(this.myState()) !== before) this.renderMeter(this.myState(), true);
        } catch (e) { console.error(e); }
    },

    renderStatus() {
        const s = this.status;
        this.$("slotChips").innerHTML = Array.from({ length: s.limit }, (_, i) => `<span class="${i < s.used ? "used" : ""}"></span>`).join("");
        this.$("slotLeft").textContent = `${s.remaining} / ${s.limit} slot spins left today`;
        this.$("slotMoney").textContent = UI.money(s.money);
        const jp = s.jackpots?.[this.gameId] || {};
        this.jpMeta = jp;
        this.renderJackpots(Object.fromEntries(Object.entries(jp).map(([t, v]) => [t, v.amount])));
        const t = this.$("ticker");
        if ((s.big_wins || []).length) {
            t.style.display = "";
            t.querySelector("span").innerHTML = s.big_wins.map(SlotGame.bigWinText).join(" &nbsp; ★ &nbsp; ");
        }
        const g = (s.games || []).find(x => x.id === this.gameId);
        if (g) { this.$("slotInfo").innerHTML = SlotGame.infoHtml(g); this.$("winners").innerHTML = SlotGame.winnersHtml(g); }
    },

    // machine maker logo (slot_games.brand, GameConfig.SLOT_BRANDS); pages live in pages/, so ../
    brandImg(brand, cls = "brand-logo") {
        const name = GameConfig.SLOT_BRANDS?.[brand];
        return name ? `<img class="${cls}" src="../images/slots/brands/${encodeURIComponent(brand)}.svg" alt="${UI.esc(name)}" title="${UI.esc(name)}">` : "";
    },
    brandHtml(brand) { return brand && GameConfig.SLOT_BRANDS?.[brand] ? `${SlotGame.brandImg(brand, "brand-logo small")} ` : ""; },

    // RTP, max win per spin and the machine note (shown under the description, also on the hall tiles)
    infoHtml(g) {
        const maxBet = Math.max(...(g.bets || [0]));
        return `${SlotGame.brandHtml(g.brand)}
            ${g.rtp ? `<span class="badge" title="Return to player: the share of all bets paid back over a very long time (simulated)">RTP ${g.rtp}%</span>` : ""}
            ${g.measured_rtp != null ? `<span class="badge" title="What this machine really paid back this year">This year ${g.measured_rtp}%</span>` : ""}
            <div class="muted" style="margin-top:4px">🏆 Max win per spin: <b class="gold">${UI.money(g.max_win)}</b>
                (max bet ${UI.money(maxBet)} × ${Number(g.max_x || 5000).toLocaleString()})${g.has_jackpot ? ` + jackpots${g.grand_cap ? ` (GRAND up to ${UI.money(g.grand_cap)})` : ""}` : ""}.
                🎰 The meters stay on this machine for the next player.</div>`;
    },

    // jackpot games: MAXI / MAJOR / GRAND winners; games without a jackpot: wins of 10,000x the bet or more. Cleared every new year.
    winnersHtml(g) {
        const list = g.winners || [];
        const title = g.has_jackpot ? "🏆 Jackpot winners (MAXI and up)" : "🏆 Big winners (10,000× the bet or more)";
        return `<div class="row between"><b>${title}</b><span class="small muted">${new Date().getFullYear()} · the board is cleared every new year</span></div>
            ${list.length ? `<table class="table" style="margin-top:6px"><tbody>${list.map((w, i) => `<tr>
                <td>${i + 1}</td><td><b>${UI.esc(w.player || "?")}</b></td>
                <td>${w.tier ? `<span class="badge gold">${UI.esc(w.tier)}</span>` : `${Math.round(w.win / Math.max(1, w.bet)).toLocaleString()}×`}</td>
                <td class="right gold"><b>${UI.money(w.win)}</b></td>
                <td class="small muted right">${new Date(w.at).toLocaleDateString()}</td></tr>`).join("")}</tbody></table>`
                : `<div class="small muted" style="margin-top:6px">No winners yet this year. Be the first!</div>`}`;
    },

    bigWinText(w) {
        const what = w.jackpot ? `<b class="gold">${UI.esc(w.jackpot)} JACKPOT</b>` : "a big win";
        return `🎰 <b>${UI.esc(w.player || "Someone")}</b> hit ${what} on ${UI.esc(w.game_name || w.game)} — ${UI.money(w.win)} (bet ${UI.money(w.bet)})`;
    },

    // MINI / MINOR are fixed bet multiples, MAJOR / GRAND are shared pools
    jpAmount(t, pools) {
        const x = this.cfg.jp?.[t]?.x;
        return x ? x * this.bet : Number(pools?.[t] ?? this.jpMeta?.[t]?.amount ?? this.cfg.jp?.[t]?.seed ?? 0);
    },

    renderJackpots(pools) {
        if (pools) this.pools = { ...(this.pools || {}), ...pools };
        const meta = this.jpMeta || {};
        const old = this.jpShown || {};
        const now = {};
        this.$("jpList").innerHTML = this.TIERS.map(t => {
            const v = UI.round10(this.jpAmount(t, this.pools));
            now[t] = v;
            const sub = this.cfg.jp?.[t]?.x ? `<div class="jp-cap">${this.cfg.jp[t].x}× bet</div>`
                : `${t === "GRAND" && this.cfg.jp?.GRAND?.cap ? `<div class="jp-cap">Must burst before ${UI.money(this.cfg.jp.GRAND.cap)}</div>` : ""}
                   ${meta[t]?.last_winner ? `<div class="jp-cap">Last: ${UI.esc(meta[t].last_winner)} ${UI.money(meta[t].last_amount)}</div>` : ""}`;
            return `<div class="jp ${t} ${old[t] !== undefined && old[t] !== v ? "bump" : ""}"><span>${t}${sub}</span><b>${UI.money(v)}</b></div>`;
        }).join("");
        this.jpShown = now;
    },

    // ------------------------------------------------------------------
    // symbols + reels
    // ------------------------------------------------------------------
    symName(s) { return this.cfg.names?.[s] || s; },

    symHtml(s) {
        const path = this.cfg.img?.[s];
        if (!path) {
            const kind = this.CARDS.includes(s) ? `card c-${s}` : "digit";
            return `<span class="sym-text ${kind}">${UI.esc(s)}</span>`;
        }
        const img = `<img src="${this.img(path)}" alt="${UI.esc(this.symName(s))}">`;
        // the slot-made wild art already says WILD; monster wilds get a tag
        return (this.cfg.wilds || ["W"]).includes(s) && path.includes("monsters/") ? `${img}<div class="tag wild">WILD</div>` : img;
    },

    // symbols for the blur while spinning (no scatters, so nothing fake looks like a near miss)
    randomSym(r, mode = "base") {
        if (!this.symPool) {
            const w = this.cfg.w?.base || {};
            const skip = new Set([...(this.cfg.bonus_syms || []), ...(this.cfg.once || [])]);
            this.symPool = Object.keys(w).filter(s => !skip.has(s) && !(this.cfg.wilds || []).includes(s));
            if (!this.symPool.length) this.symPool = ["K"];
        }
        return this.symPool[Math.floor(Math.random() * this.symPool.length)];
    },

    drawGrid(grid) {
        const reels = this.$("reels");
        reels.innerHTML = grid.map((col, r) => `<div class="reel" data-r="${r}">${col.map((s, y) =>
            `<div class="cell sym-${s}" data-r="${r}" data-y="${y}">${this.symHtml(s)}</div>`).join("")}</div>`).join("");
        this.reelEls = [...reels.querySelectorAll(".reel")];
        this.grid = grid.map(c => [...c]);
    },

    cellEl(r, y) { return this.reelEls[r]?.children[y]; },

    setReel(r, col, spinning = false) {
        const el = this.reelEls[r];
        if (el.children.length !== col.length) el.innerHTML = col.map((_, y) => `<div class="cell" data-r="${r}" data-y="${y}"></div>`).join("");
        col.forEach((s, y) => {
            const c = el.children[y];
            c.className = `cell sym-${s}${spinning ? " spin" : ""}`;
            c.innerHTML = this.symHtml(s);
        });
    },

    setWildCols(cols) {
        this.reelEls.forEach((el, r) => el.classList.toggle("wildcol", (cols || []).includes(r)));
    },

    // Spin until `getResult` returns a grid, then stop the reels left to right.
    // Two of a bonus symbol already showing makes the next reels TEASE (slow + glow).
    // opts.omen plays a pre-bonus omen before the reels stop.
    async animateReels(getResult, opts = {}) {
        this.setWildCols([]);
        const rowsNow = this.reelEls.map(el => el.children.length);
        const spinning = new Set([0, 1, 2, 3, 4]);
        const iv = setInterval(() => {
            spinning.forEach(r => this.setReel(r, Array.from({ length: rowsNow[r] }, () => this.randomSym(r)), true));
        }, 70);
        const result = await getResult();
        if (!result) { clearInterval(iv); this.drawGrid(this.grid); return null; }
        if (opts.omen) await this.playOmen(typeof opts.omen === "string" ? opts.omen : null);
        const bonus = opts.noTease ? [] : (this.cfg.bonus_syms || []);
        const count = {};
        for (let r = 0; r < 5; r++) {
            const tease = bonus.some(b => (count[b] || 0) >= 2);
            if (tease) { this.reelEls[r].classList.add("tease"); SoundManager.play("shake", { volume: .6 }); }
            await this.sleep(tease ? 1200 : r === 0 ? 150 : 220);
            this.reelEls[r].classList.remove("tease");
            spinning.delete(r);
            if (r === 4) clearInterval(iv);
            this.setReel(r, result[r]);
            result[r].forEach(s => { count[s] = (count[s] || 0) + 1; });
            const landed = bonus.filter(b => result[r].includes(b));
            landed.forEach(b => result[r].forEach((s, y) => { if (s === b) this.cellEl(r, y).classList.add("land"); }));
            SoundManager.play(landed.length ? "coin" : "tick", { volume: .5 });
        }
        clearInterval(iv);
        this.grid = result.map(c => [...c]);
        return result;
    },

    // light up the cells that make each winning way (wild columns count as every symbol)
    showWins(grid, wins, wildcols = []) {
        this.reelEls.forEach(el => [...el.children].forEach(c => c.classList.remove("hit", "dim")));
        if (!wins?.length) return;
        const wilds = this.cfg.wilds || ["W"];
        const hit = new Set();
        wins.forEach(w => grid.forEach((col, r) => {
            if (r >= w.n) return;
            col.forEach((s, y) => { if (s === w.sym || wilds.includes(s) || wildcols.includes(r)) hit.add(`${r}:${y}`); });
        }));
        this.reelEls.forEach((el, r) => [...el.children].forEach((c, y) => c.classList.add(hit.has(`${r}:${y}`) ? "hit" : "dim")));
    },

    // fly a small picture from one element to another (coins into the piggy, etc.)
    async fly(fromEl, toEl, html, ms = 650) {
        if (!fromEl || !toEl) return;
        const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
        const f = document.createElement("div");
        f.className = "flyer";
        f.innerHTML = html;
        f.style.left = `${a.left + a.width / 2 - 18}px`;
        f.style.top = `${a.top + a.height / 2 - 18}px`;
        document.body.appendChild(f);
        const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
        // the animation can stall in a background tab, so never wait longer than ms
        try {
            const anim = f.animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx / 2}px, ${dy / 2 - 80}px) scale(1.3)`, offset: .5 },
                { transform: `translate(${dx}px, ${dy}px) scale(.7)` }], { duration: ms, easing: "ease-in" });
            await Promise.race([anim.finished, this.sleep(ms + 50)]);
        } catch (e) { await this.sleep(ms); }
        f.remove();
    },

    cellsOf(sym, grid = this.grid) {
        const out = [];
        grid.forEach((col, r) => col.forEach((s, y) => { if (s === sym) out.push(this.cellEl(r, y)); }));
        return out.filter(Boolean);
    },

    // ------------------------------------------------------------------
    // theme decor: the meter that lives next to / above the reels
    // ------------------------------------------------------------------
    buildDecor() {
        const d = this.$("decor"), t = this.theme;
        if (t === "piggy") {
            d.innerHTML = `<div class="decor-label" id="meterLabel"></div>
                <div class="piggy" id="piggy"><img id="piggyImg" src="${this.img("images/monsters/coin-pigglet.svg")}" alt="Coin-Pigglet"></div>
                <div class="meter-dots" id="meterDots"></div>`;
        } else if (t === "samurai") {
            d.innerHTML = `<div class="decor-label" id="meterLabel"></div>
                <div class="sensei-stage"><img class="sensei" src="${this.img("images/monsters/sensei.svg")}" alt="Sensei">
                <div class="bag" id="bag"><img src="${this.img("images/slots/money-bag.svg")}" alt="Money bag"><div class="spill"></div></div></div>
                <div class="meter-dots" id="meterDots"></div>`;
        } else if (t === "leprechaun") {
            d.innerHTML = `<div class="decor-label" id="meterLabel">3 Leprechaun coins on a reel = WILD reel. Coins stay until you fill them!</div>
                <img class="lep-host" src="${this.img("images/slots/leprechaun.svg")}" alt="Leprechaun">`;
            this.$("coinRow").innerHTML = Array.from({ length: 5 }, (_, r) => `<div class="coin-col" data-r="${r}">${
                Array.from({ length: 3 }, () => `<span class="coin-slot"></span>`).join("")}</div>`).join("");
            this.$("coinRow").style.display = "";
        } else if (t === "fufu") {
            const str = (k, label) => `<div class="fuse fuse-${k}" id="fuse-${k}"><div class="fuse-name">${label}</div>
                <div class="crackers">${Array.from({ length: this.cfg.fuse?.max || 20 }, () => `<i></i>`).join("")}</div></div>`;
            d.innerHTML = `${str("grow", "GROW REELS")}<img class="fu-sign" id="fuSign" src="${this.img("images/slots/fu.svg")}" alt="福">${str("hold", "HOLD &amp; SPIN")}`;
        } else if (t === "bonanza") {
            // a snowfield with three thermometers stuck in it; penguins wander around behind
            d.innerHTML = `<div class="bz-snow" id="bzSnow"><div class="bz-flakes"></div>
                ${Object.entries(this.THERMOS).map(([k, x]) => `<div class="thermo t-${k}" id="thermo-${k}">
                    <div class="th-name">${x.label}</div>
                    <div class="th-tube"><div class="th-fill"></div><div class="th-ticks"></div></div>
                    <div class="th-bulb"></div><div class="th-count"></div></div>`).join("")}
                <div class="bz-drift"></div></div>`;
            this.thermo = { hot: 0, extra: 0, cold: 0 };
            clearInterval(this.penguinTimer);
            this.penguinTimer = setInterval(() => this.penguinRun(), 3500);
        }
    },

    // ---- Bonanza Meter decor -------------------------------------------
    penguinRun(n = 1, cls = "") {
        const snow = this.$("bzSnow");
        if (!snow || document.hidden) return;
        for (let k = 0; k < n; k++) {
            if (!cls && Math.random() < .45) continue;
            const p = document.createElement("img");
            const left = Math.random() < .5;
            p.className = `bz-penguin ${cls || ["walk", "hop", "slide"][Math.floor(Math.random() * 3)]} ${left ? "ltr" : "rtl"}`;
            p.src = this.img("images/slots/penguin.svg");
            p.style.bottom = `${4 + Math.random() * 18}%`;
            p.style.animationDelay = `${k * .15}s`;
            snow.appendChild(p);
            setTimeout(() => p.remove(), 6500);
        }
    },

    setThermos(t) {
        const max = this.cfg.thermo?.max || 8;
        this.thermo = { hot: 0, extra: 0, cold: 0, ...t };
        Object.keys(this.THERMOS).forEach(k => {
            const el = this.$(`thermo-${k}`);
            if (!el) return;
            const n = Math.min(max, this.thermo[k] || 0), p = n / max;
            el.querySelector(".th-fill").style.height = `${Math.round(8 + p * 92)}%`;
            el.querySelector(".th-count").textContent = `${n} / ${max}`;
            el.classList.toggle("hot", p >= .6 && p < 1);
            el.classList.toggle("full", p >= 1);
        });
    },

    // draw the meter for a saved state without animation
    renderMeter(st, initial = false) {
        const t = this.theme;
        if (t === "piggy") this.setPiggy(Number(st.piggy || 0));
        else if (t === "samurai") this.setBag(Number(st.bag || 0));
        else if (t === "leprechaun") this.setCoinCols(st.cols || [[], [], [], [], []]);
        else if (t === "fufu") { this.fuse = { grow: 0, hold: 0, ...(st.fuse || {}) }; this.setFuse(); }
        else if (t === "bonanza") this.setThermos(st.thermo || {});
    },

    // leftover "about to burst" effects after a bonus fired (the meter values come from meterAfter)
    resetMeterFx() {
        document.querySelectorAll("#coinRow .coin-col.full, .fuse.hot, .thermo.hot, .thermo.full").forEach(el => el.classList.remove("full", "hot"));
        document.querySelectorAll("#decor .shake1, #decor .shake2, #decor .shake3").forEach(el => el.classList.remove("shake1", "shake2", "shake3"));
        if (this.theme === "bonanza") this.setThermos(this.thermo || {});
    },

    dots(level, max) {
        this.$("meterDots").innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < level ? "on" : ""}"></span>`).join("");
    },

    setPiggy(level) {
        const max = this.cfg.piggy?.meter_max || 12, p = Math.min(1, level / max);
        const pig = this.$("piggy");
        pig.style.transform = `scale(${(0.62 + p * 0.5).toFixed(3)})`;
        pig.className = "piggy" + (p >= 1 ? " shake3" : p > .75 ? " shake2" : p > .5 ? " shake1" : "");
        this.$("piggyImg").src = this.img(p >= 1 ? "images/slots/piggy-full.svg" : "images/monsters/coin-pigglet.svg");
        this.$("meterLabel").textContent = p >= 1 ? "💥 Stuffed full… it could burst any moment!" : level === 0 ? "Coin-Pigglet is hungry (0% full)" : `Coin-Pigglet is ${Math.round(p * 100)}% full`;
        this.dots(level, max);
    },

    setBag(level) {
        const max = this.cfg.bag?.meter_max || 20, p = Math.min(1, level / max);
        const bag = this.$("bag");
        bag.style.transform = `scale(${(0.6 + p * 0.6).toFixed(3)})`;
        bag.classList.toggle("overflow", p >= 1);
        this.$("meterLabel").textContent = p >= 1 ? "💰 The bag is overflowing! 3 Sensei will burst it!" : `The Sensei's bag: ${level} / ${max} coins`;
        this.dots(level, max);
    },

    setCoinCols(cols) {
        document.querySelectorAll("#coinRow .coin-col").forEach((el, r) => {
            const c = cols[r] || [];
            [...el.children].forEach((s, i) => {
                s.className = "coin-slot" + (c[i] ? ` on ${c[i]}` : "");
                s.innerHTML = c[i] ? `<img src="${this.img(c[i] === "X" ? "images/slots/jp-coin.svg" : "images/slots/lep-coin.svg")}" alt="">` : "";
            });
        });
        this.cols = cols.map(c => [...c]);
    },

    setFuse() {
        const max = this.cfg.fuse?.max || 20;
        ["grow", "hold"].forEach(k => {
            const n = Math.min(max, this.fuse[k] || 0);
            const el = this.$(`fuse-${k}`);
            [...el.querySelectorAll(".crackers i")].forEach((c, i) => c.classList.toggle("lit", i < n));
            el.classList.toggle("hot", n >= max * .75);
            el.querySelector(".fuse-name").textContent = `${k === "grow" ? "GROW REELS" : "HOLD & SPIN"} ${n}/${max}`;
        });
    },

    // ------------------------------------------------------------------
    // meters during a spin
    // ------------------------------------------------------------------
    async playMeter(res) {
        const m = res.meter;
        if (!m) return;
        const t = this.theme;
        if (t === "piggy" || t === "samurai") {
            const sym = t === "piggy" ? "C" : "S";
            const target = t === "piggy" ? this.$("piggy") : this.$("bag");
            const set = l => (t === "piggy" ? this.setPiggy(l) : this.setBag(l));
            const src = this.cellsOf(sym);
            const coin = `<img src="${this.img(t === "piggy" ? "images/monsters/coin-pigglet.svg" : "images/slots/lep-coin.svg")}" alt="">`;
            let level = Number(m.from || 0);
            for (let i = 0; i < Number(m.added || 0); i++) {
                const from = src[i % Math.max(1, src.length)];
                if (from) from.classList.add("throw");
                await this.fly(from || this.$("reels"), target, coin, 520);
                level = Math.min(m.max, level + 1);
                set(level);
                target.classList.add("gulp");
                SoundManager.play("coin", { volume: .6 });
                setTimeout(() => target.classList.remove("gulp"), 300);
                await this.sleep(120);
            }
            if (Number(m.peak) > level) set(m.peak);
            this.meterAfter = () => set(Number(m.to || 0));
        } else if (t === "fufu") {
            this.fuse = { grow: 0, hold: 0, ...(m.from || {}) };
            this.setFuse();
            await this.playThrows(m.throws || []);
            this.meterAfter = () => { this.fuse = { ...this.fuse, ...(m.to || {}) }; this.setFuse(); };
        } else if (t === "leprechaun") {
            this.setCoinCols(m.from || [[], [], [], [], []]);
            this.meterAfter = () => this.setCoinCols(m.to || this.cols);
        } else if (t === "bonanza") {
            this.setThermos(m.from || {});
            await this.playThermos(m.add || {}, m.peak || {}, m.fire || []);
            this.meterAfter = () => this.setThermos(m.to || {});
        }
    },

    // Bonanza Meter: every thermometer icon flies into its thermometer; the ones that fire shake like they will burst
    async playThermos(add, peak, fire, grid = this.grid) {
        const t = { ...this.thermo };
        for (const [k, x] of Object.entries(this.THERMOS)) {
            const src = this.cellsOf(x.sym, grid), el = this.$(`thermo-${k}`);
            for (let i = 0; i < Number(add[k] || 0); i++) {
                await this.fly(src[i % Math.max(1, src.length)] || this.$("reels"), el, `<img src="${this.img(x.icon)}" alt="">`, 480);
                t[k] = Math.min(this.cfg.thermo?.max || 8, (t[k] || 0) + 1);
                this.setThermos(t);
                el.classList.add("gulp");
                SoundManager.play("coin", { volume: .5 });
                setTimeout(() => el.classList.remove("gulp"), 300);
            }
        }
        if (Object.keys(peak).length) this.setThermos(peak);
        if (!fire.length) return;
        // full thermometers tremble, then burst into their bonus (1 to 3 at once)
        fire.forEach(k => { this.$(`thermo-${k}`)?.classList.add("full", "bursting"); this.setThermos({ ...this.thermo, [k]: this.cfg.thermo?.max || 8 }); });
        SoundManager.play("shake");
        await this.sleep(1300);
        SoundManager.play("jackpot");
        fire.forEach(k => this.$(`thermo-${k}`)?.classList.add("pop"));
        await this.sleep(600);
        fire.forEach(k => this.$(`thermo-${k}`)?.classList.remove("bursting", "pop"));
    },

    // FuFu: firecracker icons are thrown at the two strings
    async playThrows(throws) {
        const src = this.cellsOf("Y");
        const max = this.cfg.fuse?.max || 20;
        for (let i = 0; i < throws.length; i++) {
            const th = throws[i];
            await this.fly(src[i % Math.max(1, src.length)] || this.$("reels"), this.$(`fuse-${th.to}`),
                `<img src="${this.img("images/slots/firecracker.svg")}" alt="">`, 560);
            this.fuse[th.to] = Math.min(max, (this.fuse[th.to] || 0) + Number(th.amt || 1));
            this.setFuse();
            SoundManager.play("hit", { volume: .5 });
        }
    },

    // Gold Chance: coins fill the 3 slots above each reel; 3 filled = WILD reel
    async playCoinFills(res) {
        const m = res.meter;
        if (!m?.fills?.length) return 0;
        let won = 0;
        const cols = (m.from || [[], [], [], [], []]).map(c => [...c]);
        for (const f of m.fills) {
            const col = document.querySelector(`#coinRow .coin-col[data-r="${f.r}"]`);
            for (const c of f.add) {
                const from = this.cellsOf(c).find(el => Number(el.dataset.r) === f.r) || this.reelEls[f.r];
                await this.fly(from, col, `<img src="${this.img(c === "X" ? "images/slots/jp-coin.svg" : "images/slots/lep-coin.svg")}" alt="">`, 520);
                cols[f.r] = [...(cols[f.r] || []), c].slice(0, 3);
                this.setCoinCols(cols);
                SoundManager.play("coin", { volume: .6 });
            }
            if (f.full) {
                col.classList.add("full");
                SoundManager.play("levelup");
                await this.sleep(700);
                if (f.jackpot) {
                    const pk = (res.picks || []).find(p => p.col === f.r) || (res.picks || [])[0];
                    if (pk) won += await this.playPick(pk);
                }
                this.reelEls[f.r].classList.add("wildcol");
                SoundManager.play("crit");
                col.classList.remove("full");
                cols[f.r] = [];
                this.setCoinCols(cols);
                await this.sleep(500);
            }
        }
        return won;
    },

    // ------------------------------------------------------------------
    // omens: something odd happens before the reels stop… then a bonus.
    // ------------------------------------------------------------------
    async playOmen(force = null) {
        const m = this.$("machine"), t = this.theme;
        const pickOne = a => a[Math.floor(Math.random() * a.length)];
        const kind = force || pickOne({
            piggy: ["luck", "pigs", "shake"], samurai: ["slash", "slash", "shake"],
            leprechaun: ["luck", "rainbow", "shake"], fufu: ["crackers", "flip", "shake"],
            bonanza: ["luck", "shake", "quake", "blizzard"]
        }[t] || ["shake"]);
        SoundManager.play("shake");
        const add = html => { const o = document.createElement("div"); o.className = "omen"; o.innerHTML = html; m.appendChild(o); return o; };
        let o;
        if (kind === "luck") o = add(`<div class="omen-text">${this.THEME[t].luck}</div>`);
        else if (kind === "pigs") o = add(Array.from({ length: 5 }, (_, i) =>
            `<img class="runner" style="top:${10 + i * 16}%;animation-delay:${i * .18}s" src="${this.img("images/monsters/pigglet.svg")}" alt="">`).join("") + `<div class="omen-text">${this.THEME.piggy.luck}</div>`);
        else if (kind === "rainbow") o = add(`<div class="rainbow"></div><img class="peek" src="${this.img("images/slots/leprechaun.svg")}" alt=""><div class="omen-text">${this.THEME.leprechaun.luck}</div>`);
        else if (kind === "slash") {
            o = add(`<img class="sensei-pop" src="${this.img("images/monsters/sensei.svg")}" alt=""><div class="slash"></div>`);
            setTimeout(() => SoundManager.play("crit"), 650);
        } else if (kind === "crackers") {
            o = add(Array.from({ length: 10 }, (_, i) =>
                `<span class="burst" style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${i * .12}s"></span>`).join(""));
            document.querySelector(".slot-page").classList.add("quake");
        } else if (kind === "flip") {
            this.$("fuSign")?.classList.add("flipped");
            o = add(`<div class="omen-text">福 is upside down… 福 has ARRIVED!</div>`);
            document.querySelector(".slot-page").classList.add("quake");
        } else if (kind === "quake") {
            // the whole screen shakes
            o = add(`<div class="omen-text">${this.THEME[t]?.luck || "Something is coming…"}</div>`);
            document.querySelector(".slot-page").classList.add("quake", "quake-big");
        } else if (kind === "blizzard") {
            // a sudden snowstorm sweeps over the machine
            o = add(`<div class="blizzard">${Array.from({ length: 70 }, () =>
                `<i style="top:${Math.random() * 100}%;animation-delay:${(Math.random() * 1.2).toFixed(2)}s;animation-duration:${(0.5 + Math.random() * .6).toFixed(2)}s;font-size:${10 + Math.random() * 16}px">❄</i>`).join("")}</div>
                <div class="omen-text">❄️ A blizzard of luck! ❄️</div>`);
        } else if (kind === "penguins") {
            // the penguins behind the reels jump out and throw the wheel in
            this.penguinRun(4, "rush");
            o = add(`${Array.from({ length: 3 }, (_, i) => `<img class="peng-throw" style="left:${18 + i * 30}%;animation-delay:${i * .15}s" src="${this.img("images/slots/penguin.svg")}" alt="">`).join("")}
                <img class="wheel-toss" src="${this.img("images/slots/wheel.svg")}" alt=""><div class="omen-text">🐧 The penguins threw a WHEEL! 🐧</div>`);
        }
        if (kind === "shake" || kind === "crackers") m.classList.add("rumble");
        await this.sleep(1800);
        m.classList.remove("rumble");
        document.querySelector(".slot-page").classList.remove("quake", "quake-big");
        o?.remove();
        // the blade mark stays a moment longer
        if (kind === "slash") { const mark = add(`<div class="blade-mark"></div>`); setTimeout(() => mark.remove(), 2600); }
    },

    // ------------------------------------------------------------------
    // controls
    // ------------------------------------------------------------------
    renderBets() {
        const box = this.$("bets");
        box.innerHTML = this.cfg.bets.map(b => `<button class="btn ${b === this.bet ? "active" : ""}" data-b="${b}">${UI.money(b)}</button>`).join("");
        box.querySelectorAll("button").forEach(btn => btn.onclick = () => {
            if (this.busy) return;
            this.bet = Number(btn.dataset.b);
            try { localStorage.setItem(`slotBet:${this.gameId}`, this.bet); } catch (e) { /* private mode */ }
            SoundManager.play("click");
            this.renderBets();
            this.renderJackpots();
            this.renderPayTable();
        });
    },

    setWin(amount, big = false) {
        this.$("winAmt").textContent = UI.money(amount);
        this.$("winBox").classList.toggle("big", big);
    },

    setWinLabel(text) { this.$("winLabel").textContent = text; },

    async countWin(from, to, ms = 900) {
        const steps = 20;
        for (let i = 1; i <= steps; i++) {
            this.setWin(Math.round(from + (to - from) * i / steps));
            if (i % 4 === 0) SoundManager.play("coin", { volume: .4 });
            await this.sleep(ms / steps);
        }
    },

    setBusy(b) {
        this.busy = b;
        this.$("spinBtn").disabled = b;
        document.querySelectorAll("#bets button").forEach(x => x.disabled = b);
    },

    // ------------------------------------------------------------------
    // one spin
    // ------------------------------------------------------------------
    async spin() {
        if (this.busy || !this.game || this.adminDemo) return;     // admins use the 전조 / 보너스 demo buttons
        if (this.status && this.status.remaining <= 0) return UI.toast(GameConfig.ERRORS.SLOT_LIMIT, "error", 4000);
        if (this.status && this.status.money < this.bet) return UI.toast(GameConfig.ERRORS.NOT_ENOUGH_MONEY, "error");
        this.setBusy(true);
        this.setWin(0);
        this.setWinLabel("WIN");
        this.showWins([], []);
        this.$("fuSign")?.classList.remove("flipped");
        this.meterAfter = null;
        SoundManager.play("click");
        let res = null;
        try {
            const call = UI.rpc("emo_slot_spin", { p_player_id: String(this.playerId), p_game: this.gameId, p_bet: this.bet });
            const [r] = await Promise.all([call.catch(e => { UI.error(e); return null; }), this.sleep(650)]);
            res = r;
            // most bonuses get an omen first; some arrive with no warning at all
            // a wheel thrown by the penguins (Bonanza Meter) always comes with its own omen
            const omen = (res?.features || []).includes("penguin") ? "penguins"
                : !!res && (res.features || []).some(f => this.BONUS_FEATURES.includes(f)) && Math.random() < .6;
            await this.playSpin(res, omen);
        } finally {
            this.setBusy(false);
            if (res?.jp) this.loadStatus();   // new "last winner" lines
        }
    },

    // ------------------------------------------------------------------
    // admin demo: replay only teasers / bonus triggers, nothing is saved.
    // The SPIN button is replaced by one button per teaser (omen) and per bonus this machine really has.
    // ------------------------------------------------------------------
    OMENS: { piggy: ["luck", "pigs", "shake"], samurai: ["slash", "shake"], leprechaun: ["luck", "rainbow", "shake"], fufu: ["crackers", "flip", "shake"],
             bonanza: ["luck", "shake", "quake", "blizzard", "penguins"] },
    OMEN_LABELS: { luck: "🍀 Lucky words", pigs: "🐷 Pig run", shake: "📳 Shake", rainbow: "🌈 Rainbow", slash: "⚔ Sensei slash", crackers: "🧨 Firecrackers", flip: "福 Flip",
                   quake: "🌋 Whole screen shake", blizzard: "❄ Blizzard", penguins: "🐧 Penguins throw a wheel" },
    BONUS_LABELS: { free: "🎰 Free games", hold: "🪙 Hold & Spin", piggy: "🐷 Piggy burst", bag: "💰 Bag", wheel: "🎡 Wheel", pick: "🃏 Pick", grow: "🌱 Grow (reel expand)", save: "🐷 Hold & Spin + SAVE coin", jackpot: "🏆 Jackpot",
                    hot: "🔴 So Hot (collect)", extra: "🟡 So Extra (split)", cold: "🔵 So Cold (multiply)", combo: "🌡 2–3 thermometers at once", penguin: "🐧 Penguin wheel" },

    // [want, label, omen kind or null]
    demoButtons() {
        const c = this.cfg;
        const teases = (this.OMENS[this.theme] || ["shake"]).map(k => [`omen:${k}`, `전조 · ${this.OMEN_LABELS[k] || k}`]);
        teases.push(["tease:2", "전조 · 👀 Reel tease"]);
        const has = f => f === "free" ? !!(c.free || c.free_spins) : f === "jackpot" ? !!c.jp : !!c[f];
        const extra = c.thermo ? ["hot", "extra", "cold", "combo", "penguin"] : [];
        const bonuses = this.BONUS_FEATURES.concat(c.hold?.save ? ["save"] : [], extra, "jackpot")
            .filter(f => f === "save" || extra.includes(f) || has(f)).map(f => [f, `보너스 · ${this.BONUS_LABELS[f] || f}`]);
        return [...teases, ...bonuses];
    },

    async initDemo() {
        const { data } = await supabaseClient.from("players").select("id,is_admin").eq("id", this.playerId).maybeSingle();
        if (!data || !(String(data.id) === "0" || data.is_admin === true)) return;
        this.adminDemo = true;
        const spin = this.$("spinBtn");
        spin.classList.add("hidden");
        const btns = this.demoButtons();
        spin.insertAdjacentHTML("afterend", `<div class="demo-count" id="demoCount">
            ${btns.map(([k, label]) => `<button class="btn ${k.startsWith("omen") || k.startsWith("tease") ? "" : "primary"}" data-demo="${k}">${label}</button>`).join("")}
            <div class="small muted" style="width:100%" id="demoNote">🧪 Admin: ${btns.filter(b => !b[0].startsWith("omen") && !b[0].startsWith("tease")).length} bonus feature(s) on this machine ·
                plays at the current bet · nothing is paid or saved</div></div>`);
        this.$("demoCount").querySelectorAll("[data-demo]").forEach(b => b.onclick = () => this.demo(b.dataset.demo));
    },

    async demo(want) {
        if (this.busy || !this.game) return;
        this.setBusy(true);
        const demoBtns = () => document.querySelectorAll("#demoCount button");
        demoBtns().forEach(x => x.disabled = true);
        this.setWin(0);
        this.setWinLabel("WIN");
        this.showWins([], []);
        this.$("fuSign")?.classList.remove("flipped");
        this.meterAfter = null;
        const note = this.$("demoNote");
        // an omen (전조) button plays that omen, then a bonus of this machine
        const omen = want.startsWith("omen:") ? want.slice(5) : null, ask = omen ? "bonus" : want;
        try {
            let res = null;
            const label = (this.demoButtons().find(([k]) => k === want) || [])[1] || want;
            for (let i = 0; i < 5 && !res; i++) {   // rare features can miss one batch of tries
                note.textContent = `Searching a "${label}" result… (${i + 1}/5)`;
                const r = await UI.rpc("emo_admin_slot_demo", { p_admin_id: String(this.playerId), p_game: this.gameId, p_bet: this.bet, p_want: ask, p_tries: 2000 });
                if (r?.ok === false && r.error !== "DEMO_NOT_FOUND") throw new Error(GameConfig.ERRORS[r.error] || r.error);
                if (r?.grid) res = r;
            }
            if (!res) { note.textContent = `No "${label}" result found (it is very rare on this machine).`; return UI.toast(GameConfig.ERRORS.DEMO_NOT_FOUND, "info", 4000); }
            note.textContent = `Demo "${label}" · found after ${Number(res.tries || 0).toLocaleString()} simulated spins · win ${UI.money(res.win)} (not paid)`;
            SoundManager.play("click");
            await this.playSpin(res, omen || ((res.features || []).includes("penguin") ? "penguins" : null)
                || (!want.startsWith("tease") && (res.features || []).some(f => this.BONUS_FEATURES.includes(f))));
        } catch (e) { UI.error(e); } finally {
            this.renderMeter(this.myState());   // put the real meters back
            this.setBusy(false);
            demoBtns().forEach(x => x.disabled = false);
        }
    },

    // reels, omen / teaser, meters and every bonus of one result (a real spin or an admin demo)
    async playSpin(res, omen) {
        {
            const grid = await this.animateReels(async () => res?.grid || null, { omen });
            if (!grid) return;
            this.total = 0;
            await this.playMeter(res);
            if (this.theme === "leprechaun") this.total += await this.playCoinFills(res);
            await this.playBase(res);
            for (const pk of res.picks || []) if (pk.col === undefined || this.theme !== "leprechaun") this.total += await this.playPick(pk);
            // progressive meters: as soon as any bonus fires, the swollen meter (pig, bag, fuses, coin columns…) goes back to its start look
            if ((res.picks || []).length || res.wheel || res.grow || res.hold || res.free) { this.meterAfter?.(); this.meterAfter = null; this.resetMeterFx?.(); }
            if (this.theme === "fufu" && (res.grow || res.hold)) this.applyFuseReset(res);
            if (res.wheel) this.total += await this.playWheel(res.wheel);
            if (res.grow) this.total += await this.playGrow(res.grow);
            if (res.hold) this.total += await this.playHold(res.hold);
            if (res.free) await this.playFree(res.free, res);
            this.meterAfter?.();
            this.setWinLabel(res.max_capped ? "MAX WIN" : "WIN");
            if (res.max_capped) UI.toast(`🏆 MAX WIN! One spin pays at most ${Number(this.cfg.max_x || 5000).toLocaleString()}× the bet (+ jackpots).`, "good", 6000);
            const big = res.win >= this.bet * 20;
            this.setWin(res.win, big);
            if (big) { SoundManager.play("jackpot"); this.confetti(); }
            if (res.demo) return;   // admin demo: money, spin count and meters stay untouched
            Object.assign(this.status, { money: res.money, used: res.used, remaining: res.remaining });
            this.status.states = { ...(this.status.states || {}), [this.gameId]: res.state };
            this.renderStatus();
            if (res.jackpots) this.renderJackpots(res.jackpots);
        }
    },

    async playBase(res) {
        const b = res.base || {};
        this.setWildCols(b.wildcols || []);
        if (b.win > 0) {
            this.showWins(this.grid, b.wins, b.wildcols || []);
            SoundManager.play("casino_win", { volume: .6 });
            await this.countWin(this.total, this.total + b.win, 600);
            this.total += b.win;
            if (b.capped) UI.toast(`Max win per spin reached (${this.cfg.cap_x || 1000}× bet)`, "info");
        }
    },

    applyFuseReset(res) {
        if (res.grow) this.fuse.grow = 0;
        if (res.hold) this.fuse.hold = 0;
        this.setFuse();
    },

    // ------------------------------------------------------------------
    // bonus overlays
    // ------------------------------------------------------------------
    layer(html, cls = "") {
        this.closeLayer();
        const l = document.createElement("div");
        l.className = `bonus-layer ${cls}`;
        l.innerHTML = html;
        this.$("machine").appendChild(l);
        return l;
    },

    closeLayer() { document.querySelector("#machine .bonus-layer")?.remove(); },

    // a button that continues; also continues by itself after `auto` ms
    waitButton(l, label, auto = 6000) {
        return new Promise(resolve => {
            const b = document.createElement("button");
            b.className = "btn primary";
            b.textContent = label;
            l.appendChild(b);
            const t = setTimeout(done, auto);
            function done() { clearTimeout(t); b.remove(); resolve(); }
            b.onclick = done;
        });
    },

    async banner(title, sub, ms = 3200, label = "Start ▶") {
        const l = this.layer(`<div class="bonus-title">${title}</div>${sub ? `<div class="bonus-sub">${sub}</div>` : ""}`);
        await this.waitButton(l, label, ms);
        this.closeLayer();
    },

    // ---- FREE GAMES (retrigger up to 50 in total) -------------------------
    async playFree(free, res) {
        const spins = free.spins || [];
        const added = spins.reduce((n, s) => n + Number(s.add || 0), 0);
        let total = spins.length - added;
        SoundManager.play("levelup");
        const sub = {
            piggy: `More WILD Pigglets · every win ×${free.mult}`,
            leprechaun: `Every free game turns 1 or more reels WILD! The coin slots come back afterwards.`,
            fufu: `More 福 WILDs · Grow Reels and Hold &amp; Spin can still light up!`,
            bonanza: `The thermometers keep filling · wheels and thermometer bonuses can still hit!`
        }[this.theme] || "";
        await this.banner(`${total} FREE GAMES!`, `${sub}<br><span class="small">Free games can retrigger (50 max).</span>`, 3500);
        const startGrid = this.grid;
        for (let i = 0; i < spins.length; i++) {
            const sp = spins[i];
            this.setWinLabel(`FREE GAME ${i + 1} / ${total}`);
            this.showWins([], []);
            await this.animateReels(async () => { await this.sleep(400); return sp.grid; }, { noTease: !(this.cfg.bonus_syms || []).length });
            if (sp.wildcols?.length) { this.setWildCols(sp.wildcols); SoundManager.play("crit"); await this.sleep(500); }
            if (sp.throws?.length) await this.playThrows(sp.throws);
            if (sp.win > 0) {
                this.showWins(sp.grid, sp.wins, sp.wildcols || []);
                SoundManager.play("casino_win", { volume: .5 });
                await this.countWin(this.total, this.total + sp.win, 500);
                this.total += sp.win;
            }
            if (sp.thermo) {
                await this.playThermos(sp.thermo.add || {}, sp.thermo.peak || {}, sp.thermo.fire || [], sp.grid);
                this.setThermos(sp.thermo.to || {});
            }
            if (sp.grow) { this.total += await this.playGrow(sp.grow); this.fuse.grow = 0; this.setFuse(); }
            if (sp.hold) { this.total += await this.playHold(sp.hold); if (this.fuse) { this.fuse.hold = 0; this.setFuse(); } }
            if (sp.wheel) this.total += await this.playWheel(sp.wheel);
            if (sp.add > 0) {
                total += Number(sp.add);
                SoundManager.play("levelup");
                const l = this.layer(`<div class="bonus-title">+${sp.add} FREE GAMES!</div>`);
                await this.sleep(1600);
                l.remove();
            }
            await this.sleep(sp.win > 0 ? 700 : 300);
        }
        this.setWildCols([]);
        const l = this.layer(`<div class="bonus-title">FREE GAMES WIN</div><div class="bonus-title" style="font-size:44px">${UI.money(free.win)}</div>`);
        SoundManager.play("victory");
        await this.waitButton(l, "Collect", 3500);
        this.closeLayer();
        this.drawGrid(startGrid);
    },

    // ---- GROW REELS (FuFu): reels grow and shrink for 6 spins ------------
    async playGrow(g) {
        SoundManager.play("levelup");
        await this.banner("GROW REELS!", `${g.spins.length} spins · reels grow up to ${this.cfg.grow?.max_rows || 6} rows and may stay big!`, 3000);
        let won = 0;
        const saved = this.grid;
        for (let i = 0; i < g.spins.length; i++) {
            const sp = g.spins[i];
            this.setWinLabel(`GROW REELS ${i + 1} / ${g.spins.length}`);
            this.showWins([], []);
            const grownBefore = this.reelEls.map(el => el.children.length);
            await this.animateReels(async () => { await this.sleep(350); return sp.grid; }, { noTease: true });
            this.reelEls.forEach((el, r) => {
                if (sp.grid[r].length > grownBefore[r]) { el.classList.add("grew"); setTimeout(() => el.classList.remove("grew"), 700); }
            });
            if (sp.win > 0) {
                this.showWins(sp.grid, sp.wins);
                SoundManager.play("casino_win", { volume: .5 });
                await this.countWin(this.total + won, this.total + won + sp.win, 500);
                won += sp.win;
            }
            await this.sleep(sp.win > 0 ? 700 : 350);
        }
        const l = this.layer(`<div class="bonus-title">GROW REELS WIN</div><div class="bonus-title" style="font-size:40px">${UI.money(g.win)}</div>`);
        await this.waitButton(l, "Collect", 3000);
        this.closeLayer();
        this.drawGrid(saved);
        return Number(g.win || 0);
    },

    // ---- HOLD & SPIN: coins stick, respins reset on every new coin -------
    coinLabel(c, v) {
        if (this.TIERS.includes(c)) return `<div style="font-size:11px">${c}</div><div>${UI.money(v)}</div>`;
        if (c === "SAVE") return `<img src="${this.img("images/slots/save-coin.svg")}" alt=""><div class="save-tag">SAVE</div><div class="save-amt">${UI.money(v)}</div>`;
        return `<img src="${this.img(this.THEME[this.theme].coin)}" alt=""><div>${UI.money(v)}</div>`;
    },

    // a random face that scrolls past in an empty Hold & Spin cell
    hsFiller() {
        const r = Math.random();
        if (r < .45) return `<div class="hs-item blank"></div>`;
        if (r < .85) return `<div class="hs-item coin"><img src="${this.img(this.THEME[this.theme].coin)}" alt=""></div>`;
        const t = ["MINI", "MINI", "MINOR", "MAJOR"][Math.floor(Math.random() * 4)];
        return `<div class="hs-item jp-${t}">${t}</div>`;
    },

    // Empty cells scroll top to bottom like little reels and stop column by column (left to right).
    // `land` = coins landing this respin; sometimes one empty cell teases a jackpot coin that slips past.
    async hsRoll(cells, land, placeFn, colOf = i => Math.floor((i - 1) / 3)) {
        const landing = new Map(land.map(c => [c.i, c]));
        const col = el => colOf(Number(el.dataset.i));
        let teaseEl = null;
        if (Math.random() < .22) {
            const free = cells.filter(el => !landing.has(Number(el.dataset.i)));
            teaseEl = free[Math.floor(Math.random() * free.length)] || null;
        }
        const rolling = new Set(cells);
        cells.forEach(el => { el.className = "hs-cell rolling"; el.innerHTML = ""; });
        const iv = setInterval(() => rolling.forEach(el => { el.innerHTML = this.hsFiller(); el.firstChild.classList.add("roll"); }), 90);
        SoundManager.play("tick", { volume: .4 });
        await this.sleep(520);
        for (let c = 0; c < 5; c++) {
            for (const el of cells.filter(e => col(e) === c)) {
                rolling.delete(el);
                const coin = landing.get(Number(el.dataset.i));
                if (coin) { placeFn(coin); el.animate?.([{ transform: "translateY(-70%)", opacity: .4 }, { transform: "translateY(0)", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.3,1.6,.6,1)" }); }
                else if (el !== teaseEl) { el.className = "hs-cell"; el.innerHTML = ""; }
            }
            await this.sleep(110);
        }
        clearInterval(iv);
        if (teaseEl) {
            // a jackpot coin creeps in… hangs there… and slides away
            const t = ["MINI", "MINI", "MINI", "MINOR", "MAJOR"][Math.floor(Math.random() * 5)];
            teaseEl.className = "hs-cell rolling teasing";
            teaseEl.innerHTML = `<div class="hs-item jp-${t}">${t}</div>`;
            const it = teaseEl.firstChild;
            SoundManager.play("shake", { volume: .5 });
            try {
                await it.animate([{ transform: "translateY(-110%)" }, { transform: "translateY(-38%)" }], { duration: 650, easing: "ease-out", fill: "forwards" }).finished;
                await this.sleep(650);
                await it.animate([{ transform: "translateY(-38%)" }, { transform: "translateY(-30%)" }, { transform: "translateY(115%)" }], { duration: 520, easing: "ease-in", fill: "forwards" }).finished;
            } catch (e) { await this.sleep(1200); }
            teaseEl.className = "hs-cell";
            teaseEl.innerHTML = "";
        }
    },

    // SAVE coin: every held cash coin (and earlier SAVE) pours into the piggy bank at once; the held coins stay
    async hsSave(l, s, v, cell) {
        const el = cell(s.i);
        el.classList.add("saving");
        const amt = el.querySelector(".save-amt");
        if (amt) amt.textContent = UI.money(0);
        const from = (s.from || []).map(cell).filter(Boolean);
        const sub = l.querySelector("#hsSum");
        if (sub) sub.innerHTML = `<b class="gold">🐷 SAVE!</b> ${from.length} coin(s) pour into the piggy bank…`;
        SoundManager.play("gift_open");
        from.forEach(f => f.classList.add("pour"));
        await Promise.all(from.map((f, k) => this.sleep(k * 40).then(() =>
            this.fly(f, el, `<img src="${this.img(this.THEME[this.theme].coin)}" alt="">`, 700))));
        from.forEach(f => f.classList.remove("pour"));
        SoundManager.play("coin");
        el.classList.add("gulp");
        const steps = 12;
        for (let k = 1; k <= steps; k++) { if (amt) amt.textContent = UI.money(UI.round10(v * k / steps)); await this.sleep(45); }
        setTimeout(() => el.classList.remove("gulp", "saving"), 400);
        if (sub) sub.innerHTML = `🐷 SAVE coin holds <b class="gold">${UI.money(v)}</b> — the other coins still pay too!`;
        await this.sleep(700);
    },

    async playHold(h) {
        if (this.theme === "bonanza") return this.playBzHold(h);
        const lives0 = this.cfg.hold?.hs_lives || 3;
        const val = Object.fromEntries((h.coins || []).map(c => [c.i, c]));
        SoundManager.play("gift_open");
        await this.banner("HOLD &amp; SPIN", `Coins stay put. A new coin resets the respins to ${lives0}. Fill all 15 for the GRAND!`
            + (this.cfg.hold?.save ? `<br>🐷 A <b>SAVE</b> coin collects every held coin's amount — again and again!` : ""), 2600);
        const l = this.layer(`<div class="bonus-title" style="font-size:24px">HOLD &amp; SPIN</div>
            <div class="respins" id="hsLives"></div>
            <div class="hs-grid">${Array.from({ length: 15 }, (_, k) => `<div class="hs-cell" data-i="${(k % 5) * 3 + Math.floor(k / 5) + 1}"></div>`).join("")}</div>
            <div class="bonus-sub" id="hsSum"></div>`);
        // shown row by row (5 wide); cell i is still reel*3 + row + 1
        const cell = i => l.querySelector(`.hs-cell[data-i="${i}"]`);
        const place = c => {
            const el = cell(c.i);
            el.className = `hs-cell coin ${this.TIERS.includes(c.c) ? `jp-${c.c}` : c.c === "SAVE" ? "save" : ""}`;
            el.innerHTML = this.coinLabel(c.c, val[c.i]?.v ?? 0);
        };
        const lives = n => { l.querySelector("#hsLives").innerHTML = Array.from({ length: lives0 }, (_, i) => `<span class="${i < n ? "on" : ""}"></span>`).join(""); };
        (h.start || []).forEach(place);
        let left = lives0;
        lives(left);
        await this.sleep(1200);
        for (const step of h.steps || []) {
            const empty = [...l.querySelectorAll(".hs-cell:not(.coin)")];
            await this.hsRoll(empty, step, place);
            if (step.length) { SoundManager.play("coin"); left = lives0; } else left--;
            lives(left);
            for (const s of step.filter(x => x.c === "SAVE")) await this.hsSave(l, s, val[s.i]?.v ?? 0, cell);
            await this.sleep(step.length ? 600 : 350);
        }
        const sum = l.querySelector("#hsSum");
        let got = 0;
        for (const c of h.coins || []) {
            cell(c.i).classList.add("counted");
            got += Number(c.v);
            sum.innerHTML = `Collected: <b class="gold">${UI.money(got)}</b>`;
            SoundManager.play(this.TIERS.includes(c.c) ? "jackpot" : "coin", { volume: .5 });
            await this.sleep(this.TIERS.includes(c.c) ? 900 : 160);
        }
        if (h.grand) {
            sum.insertAdjacentHTML("beforeend", `<div class="bonus-title">ALL 15! GRAND ${UI.money(h.grand_win)}</div>`);
            SoundManager.play("jackpot");
            this.confetti();
            await this.sleep(1500);
        }
        await this.countWin(this.total, this.total + h.win, 700);
        await this.waitButton(l, "Collect", 4000);
        this.closeLayer();
        return Number(h.win || 0);
    },

    // ---- BONANZA HOLD & SPIN: 7 high × 5 wide, only the lower 4 rows open at first ----
    // Hammers break the frozen rows from the bottom up; the thermometer icons of the bonuses that fired
    // land as coins: RED collects every coin so far, YELLOW splits the coins around it, BLUE multiplies them.
    async playBzHold(h) {
        const lives0 = this.cfg.hold?.lives || 3;
        const kinds = (h.kinds || []).filter(k => this.THERMOS[k]);
        const names = kinds.map(k => `<b class="bz-k k-${k}">${this.THERMOS[k].label}</b>`).join(" + ");
        SoundManager.play("gift_open");
        await this.banner(kinds.length > 1 ? `${kinds.length} THERMOMETERS AT ONCE!` : "HOLD &amp; SPIN",
            `${names || ""}<br>${kinds.map(k => `<img class="bz-ico" src="${this.img(this.THERMOS[k].icon)}" alt=""> ${this.THERMOS[k].what}`).join("<br>")}
             <br>🔨 Hammers break the frozen rows. Open all 7 rows and fill all 35 for the GRAND!`, 3400);
        let open = 3;
        const money = v => UI.money(UI.round10(Number(v) * this.bet));
        const l = this.layer(`<div class="bonus-title" style="font-size:22px">${names || "HOLD &amp; SPIN"}</div>
            <div class="respins" id="hsLives"></div>
            <div class="bz-collect" id="bzCol" hidden>🔴 Collected <b class="gold">0</b></div>
            <div class="hs-grid bz-grid">${Array.from({ length: 35 }, (_, k) =>
                `<div class="hs-cell${Math.floor(k / 5) < open ? " ice" : ""}" data-i="${k + 1}" data-row="${Math.floor(k / 5)}"></div>`).join("")}</div>
            <div class="bonus-sub" id="hsSum"></div>`);
        const cell = i => l.querySelector(`.hs-cell[data-i="${i}"]`);
        const cur = {};
        const coinHtml = c => this.TIERS.includes(c) ? `<div class="bz-tier">${c}</div>`
            : `<img src="${this.img(this.THEME.bonanza.coin)}" alt=""><div class="bz-amt">${money(c)}</div>`;
        const setCoin = (i, c, extra = "") => {
            cur[i] = c;
            const el = cell(i);
            el.className = `hs-cell coin ${this.TIERS.includes(c) ? `jp-${c}` : ""} ${extra}`;
            el.innerHTML = coinHtml(c);
        };
        const icon = { HAMMER: "images/slots/hammer.svg", RED: this.THERMOS.hot.icon, YEL: this.THERMOS.extra.icon, BLU: this.THERMOS.cold.icon };
        const place = ev => {
            if (icon[ev.c]) {
                cur[ev.i] = ev.v;
                const el = cell(ev.i);
                el.className = `hs-cell coin special s-${ev.c}`;
                el.innerHTML = `<img src="${this.img(icon[ev.c])}" alt="">`;
            } else setCoin(ev.i, ev.c);
        };
        const lives = n => { l.querySelector("#hsLives").innerHTML = Array.from({ length: lives0 }, (_, i) => `<span class="${i < n ? "on" : ""}"></span>`).join(""); };
        const sum = l.querySelector("#hsSum");
        let collected = 0;
        (h.start || []).forEach(c => setCoin(c.i, c.c));
        let left = lives0;
        lives(left);
        if (!h.steps?.length && (h.start || []).length >= 35) {
            // a GRAND that was due: every row is already open and full
            l.querySelectorAll(".ice").forEach(el => el.classList.remove("ice"));
            open = 0;
        }
        await this.sleep(1200);
        for (const step of h.steps || []) {
            const empty = [...l.querySelectorAll(".hs-cell:not(.coin):not(.ice)")];
            await this.hsRoll(empty, step, place, i => (i - 1) % 5);
            if (step.length) { SoundManager.play("coin"); left = lives0; } else left--;
            lives(left);
            for (const ev of step.filter(x => icon[x.c])) {
                const el = cell(ev.i);
                el.classList.add("act");
                if (ev.c === "HAMMER") {
                    // the hammer smashes the lowest frozen row
                    sum.innerHTML = `🔨 <b>HAMMER!</b> The ice cracks…`;
                    SoundManager.play("crit");
                    await this.sleep(500);
                    const row = [...l.querySelectorAll(`.hs-cell.ice[data-row="${ev.row}"]`)];
                    row.forEach(r => r.classList.add("shatter"));
                    SoundManager.play("shake");
                    await this.sleep(600);
                    row.forEach(r => r.classList.remove("ice", "shatter"));
                    open = ev.row;
                    sum.innerHTML = open > 0 ? `A new row is open! ${open} frozen row(s) left.` : `<b class="gold">All 7 rows are open!</b> Fill all 35 for the GRAND!`;
                } else if (ev.c === "RED") {
                    // every coin on the board pours its amount into the red thermometer, and stays
                    const from = Object.keys(cur).map(Number).filter(j => j !== ev.i && /^[0-9.]+$/.test(cur[j])).map(cell);
                    sum.innerHTML = `🔴 <b>SO HOT!</b> Every coin is collected…`;
                    SoundManager.play("gift_open");
                    from.forEach(f => f.classList.add("pour"));
                    await Promise.all(from.map((f, k) => this.sleep(k * 35).then(() =>
                        this.fly(f, el, `<img src="${this.img(this.THEME.bonanza.coin)}" alt="">`, 650))));
                    from.forEach(f => f.classList.remove("pour"));
                    el.classList.add("gulp");
                    const add = UI.round10(Number(ev.x) * this.bet), box = l.querySelector("#bzCol");
                    box.hidden = false;
                    const b0 = collected;
                    for (let k = 1; k <= 12; k++) { box.querySelector("b").textContent = UI.money(b0 + Math.round(add * k / 12)); await this.sleep(40); }
                    collected += add;
                    box.querySelector("b").textContent = UI.money(collected);
                    SoundManager.play("coin");
                    sum.innerHTML = `🔴 +${UI.money(add)} collected — the coins still pay too!`;
                    await this.sleep(500);
                    el.classList.remove("gulp");
                } else if (ev.c === "YEL") {
                    // each coin around it splits in two: one stays, the smaller one hops to an empty cell
                    sum.innerHTML = `🟡 <b>SO EXTRA!</b> The coins around it split in two!`;
                    SoundManager.play("gift_open");
                    for (const fx of ev.fx || []) {
                        const src = cell(fx.j);
                        src.classList.add("split");
                        setCoin(fx.j, fx.v, "split");
                        if (fx.to) {
                            await this.fly(src, cell(fx.to), `<img src="${this.img(this.THEME.bonanza.coin)}" alt="">`, 420);
                            setCoin(fx.to, fx.v2, "born");
                        }
                        SoundManager.play("coin", { volume: .5 });
                        await this.sleep(220);
                    }
                    if (!(ev.fx || []).length) sum.innerHTML = `🟡 No coins next to it this time.`;
                } else if (ev.c === "BLU") {
                    // each coin around it freezes and comes out multiplied
                    sum.innerHTML = `🔵 <b>SO COLD!</b> The coins around it are multiplied!`;
                    SoundManager.play("crit");
                    for (const fx of ev.fx || []) {
                        setCoin(fx.j, fx.v, "frozen");
                        cell(fx.j).insertAdjacentHTML("beforeend", `<div class="bz-mult">×${Number(fx.m)}</div>`);
                        SoundManager.play("coin", { volume: .5 });
                        await this.sleep(260);
                    }
                    if (!(ev.fx || []).length) sum.innerHTML = `🔵 No coins next to it this time.`;
                }
                await this.sleep(500);
                // the special icon becomes a coin itself
                setCoin(ev.i, ev.v, "born");
                await this.sleep(300);
            }
            await this.sleep(step.length ? 600 : 350);
        }
        // count every coin with its final amount
        let got = 0;
        for (const c of h.coins || []) {
            const el = cell(c.i);
            if (!el) continue;
            el.classList.add("counted");
            if (!this.TIERS.includes(c.c)) { const a = el.querySelector(".bz-amt"); if (a) a.textContent = UI.money(c.v); }
            else el.innerHTML = `<div class="bz-tier">${c.c}</div><div class="bz-amt">${UI.money(c.v)}</div>`;
            got += Number(c.v);
            sum.innerHTML = `Coins: <b class="gold">${UI.money(got)}</b>${h.collected ? ` + 🔴 collected <b class="gold">${UI.money(h.collected)}</b>` : ""}`;
            SoundManager.play(this.TIERS.includes(c.c) ? "jackpot" : "coin", { volume: .5 });
            await this.sleep(this.TIERS.includes(c.c) ? 900 : 120);
        }
        if (h.grand) {
            sum.insertAdjacentHTML("beforeend", `<div class="bonus-title">ALL 35! GRAND ${UI.money(h.grand_win)}</div>`);
            SoundManager.play("jackpot");
            this.confetti();
            await this.sleep(1500);
        }
        sum.insertAdjacentHTML("beforeend", `<div class="bonus-title" style="font-size:30px">${UI.money(h.win)}</div>`);
        await this.countWin(this.total, this.total + h.win, 700);
        await this.waitButton(l, "Collect", 4000);
        this.closeLayer();
        return Number(h.win || 0);
    },

    // ---- PICK: open coins until 3 of one jackpot match --------------------
    tierLabel(t) { return t.replace("_X2", " ×2"); },

    async playPick(pk) {
        const t = this.theme;
        const target = t === "piggy" ? this.$("piggy") : t === "samurai" ? this.$("bag") : null;
        if (target) {
            target.classList.add("shake3");
            SoundManager.play("shake");
            await this.sleep(1200);
            target.classList.add("burst");
            SoundManager.play("jackpot");
            await this.sleep(700);
        }
        await this.banner(this.PICK_TITLE[pk.kind] || "JACKPOT PICK!", "Pick coins — match 3 to win that jackpot.", 2600, "Pick ▶");
        const tiers = pk.tiers || this.TIERS;
        const tally = Object.fromEntries(tiers.map(x => [x, 0]));
        const size = Math.max(12, Math.ceil((pk.reveal.length + 4) / 4) * 4);
        const l = this.layer(`<div class="bonus-title" style="font-size:24px">Pick a coin!</div>
            <div class="pick-tally" id="pickTally"></div>
            <div class="pick-grid">${Array.from({ length: size }, (_, i) => `<div class="pick k-${pk.kind}" data-p="${i}">?</div>`).join("")}</div>
            <button class="btn small" id="autoPick">Auto pick</button>`);
        const cls = x => `t-${x.replace("_X2", "")}${x.endsWith("_X2") ? " x2" : ""}`;
        // one pill per jackpot with 3 big circles; the jackpot just picked flashes, 2 of 3 glows, 3 of 3 wins
        const showTally = (just = null) => {
            l.querySelector("#pickTally").innerHTML = tiers.map(x => `<span class="tally ${cls(x)}${tally[x] >= 3 ? " won" : tally[x] === 2 ? " hot" : ""}${x === just ? " just" : ""}">
                <b>${this.tierLabel(x)}</b>${[0, 1, 2].map(i => `<i class="${i < tally[x] ? "on" : ""}"></i>`).join("")}</span>`).join("");
        };
        showTally();
        const picks = [...l.querySelectorAll(".pick")];
        let n = 0, auto = false;
        await new Promise(resolve => {
            const open = el => {
                if (el.classList.contains("open") || n >= pk.reveal.length) return;
                const x = pk.reveal[n++];
                tally[x]++;
                el.className = `pick open ${cls(x)}`;
                el.textContent = this.tierLabel(x);
                SoundManager.play(n === pk.reveal.length ? "jackpot" : "coin");
                showTally(x);
                if (n === pk.reveal.length) {
                    picks.filter(p => p.textContent === this.tierLabel(x)).forEach(p => p.classList.add("win"));
                    resolve();
                }
            };
            picks.forEach(p => p.onclick = () => open(p));
            l.querySelector("#autoPick").onclick = async () => {
                if (auto) return;
                auto = true;
                for (const p of picks) { if (n >= pk.reveal.length) break; if (!p.classList.contains("open")) { open(p); await this.sleep(350); } }
            };
        });
        l.querySelector("#autoPick").remove();
        await this.sleep(600);
        picks.filter(p => !p.classList.contains("open")).forEach(p => {
            const x = tiers[Math.floor(Math.random() * tiers.length)];
            p.className = `pick open decoy ${cls(x)}`;
            p.textContent = this.tierLabel(x);
        });
        l.insertAdjacentHTML("beforeend", `<div class="bonus-title">${this.tierLabel(pk.tier)} JACKPOT<br>${UI.money(pk.win)}</div>`);
        this.confetti();
        await this.countWin(this.total, this.total + pk.win, 1200);
        await this.waitButton(l, "Collect", 6000);
        this.closeLayer();
        target?.classList.remove("burst", "shake3");
        return Number(pk.win || 0);
    },

    // ---- SAMURAI WHEEL: MINI, MINOR or a bet multiple ---------------------
    segLabel(s) { return this.TIERS.includes(s) ? s : UI.money(Number(s) * this.bet); },

    // ---- BONANZA WHEEL: amounts, MINI/MINOR, one thermometer bonus, or "+1 SPIN" (3 spins at most) ----
    async playBzWheel(w) {
        SoundManager.play("levelup");
        if (w.penguin) await this.banner("🐧 PENGUIN WHEEL!", "The penguins threw a wheel onto the snow. Spin it!", 2600, "Spin ▶");
        else await this.banner("🎡 BONANZA WHEEL!", "Amounts, jackpots, a thermometer bonus — or <b>+1 SPIN</b> (3 spins at most).", 2600, "Spin ▶");
        const n = w.seg.length, a = 360 / n;
        const kindOf = s => ({ HOT: "hot", EXTRA: "extra", COLD: "cold" })[s];
        const fill = (s, i) => kindOf(s) ? ({ hot: "#d8262e", extra: "#e8b400", cold: "#2a7ad8" })[kindOf(s)]
            : this.TIERS.includes(s) ? (s === "MINOR" ? "#6a3ac8" : "#1a9a5a")
            : s.endsWith("+") ? "#ff8a1a" : ["#eaf6ff", "#bfe0f8"][i % 2];
        const label = s => kindOf(s) ? this.THERMOS[kindOf(s)].label.replace("SO ", "")
            : this.TIERS.includes(s) ? s : s.endsWith("+") ? "+1 SPIN" : `×${s}`;
        const slices = w.seg.map((s, i) => {
            const a0 = (i * a - 90 - a / 2) * Math.PI / 180, a1 = ((i + 1) * a - 90 - a / 2) * Math.PI / 180;
            const x0 = 100 + 96 * Math.cos(a0), y0 = 100 + 96 * Math.sin(a0), x1 = 100 + 96 * Math.cos(a1), y1 = 100 + 96 * Math.sin(a1);
            const dark = kindOf(s) || this.TIERS.includes(s) || s.endsWith("+");
            return `<path d="M100 100 L${x0.toFixed(1)} ${y0.toFixed(1)} A96 96 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${fill(s, i)}" stroke="#2a4a6a"/>
                <text x="100" y="26" transform="rotate(${i * a} 100 100)" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="${label(s).length > 5 ? 9 : 11}" fill="${dark ? "#fff" : "#1a3a5a"}">${label(s)}</text>`;
        }).join("");
        const l = this.layer(`<div class="bonus-title" style="font-size:26px">${w.penguin ? "🐧 PENGUIN WHEEL" : "BONANZA WHEEL"}</div>
            <div class="respins" id="bzSpins"></div>
            <div class="wheel-wrap"><div class="wheel-pointer">▼</div>
            <svg class="wheel bz-wheel" id="wheel" viewBox="0 0 200 200"><circle cx="100" cy="100" r="99" fill="#dff2ff"/>${slices}<circle cx="100" cy="100" r="16" fill="#1a3a5a" stroke="#dff2ff" stroke-width="4"/></svg></div>
            <div class="bonus-sub" id="wheelPrize">Spin ${1} …</div>`);
        const wheel = l.querySelector("#wheel"), prize = l.querySelector("#wheelPrize");
        const max = this.cfg.wheel?.max_spins || 3;
        const dots = k => { l.querySelector("#bzSpins").innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < k ? "on" : ""}"></span>`).join(""); };
        const base = this.total;
        let got = 0, rot = 0;
        for (let s = 0; s < w.spins.length; s++) {
            const sp = w.spins[s];
            dots(s + 1);
            prize.innerHTML = `Spin ${s + 1} of up to ${max}…`;
            if (s > 0) await this.waitButton(l, "Spin again ▶", 2500);
            rot += 5 * 360 + ((360 - sp.index * a) - (rot % 360) + 360) % 360;
            wheel.style.transition = "transform 4.2s cubic-bezier(.15,.85,.25,1)";
            wheel.style.transform = `rotate(${rot}deg)`;
            for (let i = 0; i < 14; i++) setTimeout(() => SoundManager.play("tick", { volume: .4 }), i * i * 20);
            await this.sleep(4400);
            const k = sp.kind || kindOf(sp.prize);
            if (k) {
                SoundManager.play("jackpot");
                prize.innerHTML = `<img class="bz-ico" src="${this.img(this.THERMOS[k].icon)}" alt=""> <b class="gold" style="font-size:24px">${this.THERMOS[k].label}!</b>
                    ${w.hold ? "" : "<br><span class='small'>(only one thermometer bonus per wheel)</span>"}`;
                await this.sleep(1400);
            } else {
                SoundManager.play(this.TIERS.includes(sp.prize) ? "jackpot" : "casino_win");
                prize.innerHTML = `<b class="gold" style="font-size:28px">${this.TIERS.includes(sp.prize) ? `${sp.prize} ` : ""}${UI.money(sp.win)}</b>
                    ${String(sp.prize).endsWith("+") && s < max - 1 ? "<br><b>+1 SPIN!</b>" : ""}`;
                await this.countWin(base + got, base + got + Number(sp.win || 0), 700);
                got += Number(sp.win || 0);
                await this.sleep(900);
            }
        }
        if (w.hold) {
            this.closeLayer();
            const saved = this.total;
            this.total = base + got;
            got += await this.playBzHold(w.hold);
            this.total = saved;
            const l2 = this.layer(`<div class="bonus-title">WHEEL WIN</div><div class="bonus-title" style="font-size:40px">${UI.money(w.win)}</div>`);
            await this.waitButton(l2, "Collect", 3000);
        } else {
            prize.insertAdjacentHTML("beforeend", `<div class="bonus-title" style="font-size:30px">WHEEL WIN ${UI.money(w.win)}</div>`);
            await this.waitButton(l, "Collect", 4000);
        }
        this.closeLayer();
        return Number(w.win || got);
    },

    async playWheel(w) {
        if (this.theme === "bonanza") return this.playBzWheel(w);
        SoundManager.play("levelup");
        const n = w.seg.length, a = 360 / n;
        const colors = ["#c8102e", "#fff4d0"];
        const slices = w.seg.map((s, i) => {
            const a0 = (i * a - 90 - a / 2) * Math.PI / 180, a1 = ((i + 1) * a - 90 - a / 2) * Math.PI / 180;
            const x0 = 100 + 96 * Math.cos(a0), y0 = 100 + 96 * Math.sin(a0), x1 = 100 + 96 * Math.cos(a1), y1 = 100 + 96 * Math.sin(a1);
            const jp = this.TIERS.includes(s);
            return `<path d="M100 100 L${x0.toFixed(1)} ${y0.toFixed(1)} A96 96 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${jp ? (s === "MINOR" ? "#1a7ab0" : "#1a9a5a") : colors[i % 2]}" stroke="#7a4a00"/>
                <text x="100" y="26" transform="rotate(${i * a} 100 100)" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="${jp ? 11 : 12}" fill="${jp || i % 2 === 0 ? "#fff" : "#7a1a00"}">${jp ? s : `×${s}`}</text>`;
        }).join("");
        const l = this.layer(`<div class="bonus-title" style="font-size:26px">SAMURAI WHEEL</div>
            <div class="wheel-wrap"><div class="wheel-pointer">▼</div>
            <svg class="wheel" id="wheel" viewBox="0 0 200 200"><circle cx="100" cy="100" r="99" fill="#e8c050"/>${slices}<circle cx="100" cy="100" r="16" fill="#1a1a1a" stroke="#e8c050" stroke-width="4"/></svg></div>
            <div class="bonus-sub" id="wheelPrize">Spinning…</div>`);
        const wheel = l.querySelector("#wheel");
        await this.sleep(300);
        const turns = 5 * 360 + (360 - w.index * a);
        wheel.style.transition = "transform 4.2s cubic-bezier(.15,.85,.25,1)";
        wheel.style.transform = `rotate(${turns}deg)`;
        for (let i = 0; i < 14; i++) { setTimeout(() => SoundManager.play("tick", { volume: .4 }), i * i * 20); }
        await this.sleep(4400);
        SoundManager.play(this.TIERS.includes(w.prize) ? "jackpot" : "casino_win");
        l.querySelector("#wheelPrize").innerHTML = `<b class="gold" style="font-size:28px">${this.TIERS.includes(w.prize) ? `${w.prize} ` : ""}${UI.money(w.win)}</b>`;
        await this.countWin(this.total, this.total + w.win, 800);
        await this.waitButton(l, "Collect", 4000);
        this.closeLayer();
        return Number(w.win || 0);
    },

    confetti() {
        const colors = ["#ffd166", "#ff5a8a", "#5ad8ff", "#8affc0", "#c08aff"];
        for (let i = 0; i < 60; i++) {
            const c = document.createElement("div");
            c.className = "confetti";
            c.style.left = `${Math.random() * 100}vw`;
            c.style.background = colors[i % colors.length];
            c.style.animationDuration = `${1.8 + Math.random() * 1.8}s`;
            c.style.animationDelay = `${Math.random() * .6}s`;
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 4500);
        }
    },

    // ------------------------------------------------------------------
    renderPayTable() {
        const cfg = this.cfg, pay = cfg.pay || {}, k = cfg.pay_x || 1;
        const row = s => `<div>${this.symHtml(s)}<div><b>${UI.esc(this.symName(s))}</b><br>${[5, 4, 3].map(n =>
            `${n}× ${UI.money(UI.round10((pay[s]?.[n - 3] || 0) * this.bet * k))}`).join("<br>")}</div></div>`;
        const tile = (s, text) => (cfg.img?.[s] ? `<div>${this.symHtml(s)}<div><b>${UI.esc(this.symName(s))}</b><br>${text}</div></div>` : "");
        const bonus = ({
            piggy: () => tile("F", `3+: <b>${cfg.free_spins} free games</b>, wins ×${cfg.free_mult}, more wilds.`)
                + tile("C", `Every Coin-Pigglet feeds the piggy. 3+: <b>Hold &amp; Spin</b> — fill all 15 for GRAND. A stuffed piggy may burst into a jackpot pick.`)
                + (cfg.hold?.save ? `<div><img src="${this.img("images/slots/save-coin.svg")}" alt=""><div><b>SAVE coin</b> (Hold &amp; Spin)<br>When a piggy-bank <b>SAVE</b> coin lands, every held coin pours its amount into it — the held coins stay and still pay. It can land again and again; each SAVE takes everything held so far (earlier SAVE coins too). Jackpot coins keep their jackpot.</div></div>` : ""),
            samurai: () => tile("S", `1-2 Sensei throw coins into the bag. 3+ Sensei: the bag bursts into a jackpot pick (MINI ×2 / MINOR ×2 too).`)
                + tile("R", `3 wheels: the <b>Samurai Wheel</b> (MINI, MINOR or up to 50× bet).`),
            leprechaun: () => tile("G", `Fills a coin slot above its reel. 3 filled = that reel turns WILD.`)
                + tile("X", `Also fills a slot. 3 jackpot coins on one reel: a jackpot pick first, then a WILD reel.`)
                + tile("P", `3 Leprechauns: <b>${cfg.free?.spins || 8} free games</b>, 1 or more WILD reels every spin. The coin slots come back afterwards.`),
            fufu: () => tile("Y", `Thrown at the GROW (6 growing-reel spins) or HOLD &amp; SPIN firecracker string. A full string lights the bonus.`)
                + tile("B", `3 / 4 / 5 Lucky Pouches: ${(cfg.free?.spins || [8, 10, 12]).join(" / ")} free games. Grow or Hold can hit inside them.`),
            bonanza: () => Object.values(this.THERMOS).map(x => tile(x.sym, `Fills the <b>${x.label}</b> thermometer (${cfg.thermo?.max || 15} to fill). A full thermometer fires Hold &amp; Spin, where its icon ${x.what}. 2 or 3 thermometers can fire together.`)).join("")
                + `<div><img src="${this.img("images/slots/hammer.svg")}" alt=""><div><b>Hammer</b> (Hold &amp; Spin)<br>The board is 7 high × 5 wide but only the lower 4 rows start open. Each hammer breaks the next frozen row; 3 hammers open all 35. Fill all 35 for the GRAND.</div></div>`
                + tile("WH", `3 wheels (or the penguins throw one): the <b>Bonanza Wheel</b> — amounts, MINI / MINOR, one thermometer bonus, or <b>+1 SPIN</b> (3 spins at most).`)
                + tile("F", `3+: <b>${cfg.free_spins || 8} free games</b>. Thermometers, wheels and their bonuses can still hit.`)
        }[this.theme] || (() => ""))();
        const syms = Object.keys(pay).sort((a, b) => (pay[b][2] || 0) - (pay[a][2] || 0));
        this.$("payTable").innerHTML = `
            <p class="small">5 reels, <b>243 ways</b>: the same symbol on neighbouring reels from the left (any row). Pays shown for a <b>${UI.money(this.bet)}</b> bet.</p>
            <div class="pay-grid">${syms.map(row).join("")}</div>
            <div class="pay-grid" style="margin-top:8px">${tile("W", "Reels 2-4. Stands in for any normal symbol.")}${bonus}</div>
            <p class="small" style="margin-top:8px">Jackpots: MINI ${cfg.jp?.MINI?.x || 10}× bet · MINOR ${cfg.jp?.MINOR?.x || 25}× bet ·${cfg.jp?.MAXI ? ` MAXI ${cfg.jp.MAXI.x}× bet ·` : ""}
                MAJOR and GRAND are shared by every player and reset to their start amount when someone wins them. Free games can retrigger, 50 at most.
                One spin pays at most ${Number(cfg.max_x || 5000).toLocaleString()}× the bet, jackpots on top.${cfg.rtp ? ` RTP (return to player) ${cfg.rtp}%.` : ""}
                The machine keeps its meters (piggy, bag, coins, fuses) for the next player.</p>
            <p class="small muted">${this.status?.limit || 20} slot spins per day across all slot games (separate from casino plays).</p>`;
    }
};
