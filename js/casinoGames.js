// =====================================================================
// Casino - 10 games (3 premium). A player can play 3 games a day in any
// mix. The server (emo_casino_play) decides the prize; the browser only
// animates it.
// =====================================================================
const Casino = {
    playerId: null,
    status: null,
    games: [],
    busy: false,

    async init() {
        this.playerId = UI.requireLogin();
        UI.nav("casino");
        SoundManager.startBgm("casino");
        SoundManager.preload(["tick", "casino_win", "casino_lose", "jackpot", "coin"]);
        await UI.rpc("emo_casino_visit", { p_player_id: String(this.playerId) }).catch(() => null);   // a new visit: one lottery ticket each
        await this.load();
    },

    async load() {
        try {
            const [status, games] = await Promise.all([
                UI.rpc("emo_casino_status", { p_player_id: String(this.playerId) }),
                UI.q(supabaseClient.from("casino_games").select("*").eq("is_active", true).order("sort_order"))
            ]);
            this.status = status;
            this.games = games || [];
            // survival casino tiles only have some of the games (?games=a,b,c)
            const only = new URLSearchParams(location.search).get("games");
            if (only) { const set = new Set(only.split(",")); this.games = this.games.filter(g => set.has(String(g.id))); }
            this.render();
            const want = new URLSearchParams(location.search).get("game");
            if (want && !this.autoOpened) { this.autoOpened = true; const g = this.games.find(x => String(x.id) === want); if (g) this.open(g); }
        } catch (e) { UI.error(e); }
    },

    renderHead() {
        const s = this.status;
        document.getElementById("casinoHead").innerHTML = `
            <div>
                <h1>🎰 Emo Casino</h1>
                <div class="muted small">Pick any games — <b>${s.limit} plays per day</b> in total (the same game many times is OK).</div>
            </div>
            <div class="stack" style="align-items:flex-end;gap:6px">
                <div class="plays">${Array.from({ length: s.limit }, (_, i) => `<div class="chip ${i < s.used ? "used" : ""}">${i < s.used ? "✓" : i + 1}</div>`).join("")}
                    <span class="small muted" style="margin-left:6px">${s.remaining} left today</span></div>
                <span class="badge gold">${UI.money(s.money)}</span>
            </div>`;
    },

    render() {
        this.renderHead();
        const grid = document.getElementById("gameGrid");
        grid.innerHTML = this.games.map((g, i) => {
            const top = this.topPrize(g);
            return `<div class="card game-card ${g.cost > 0 ? "premium" : ""}" data-i="${i}">
                <div class="icon">${UI.esc(g.icon || "🎲")}</div>
                <div class="gname">${UI.esc(g.name)}</div>
                <div class="gdesc">${UI.esc(g.description || "")}</div>
                <div class="row" style="justify-content:center;gap:6px;margin-top:8px">
                    ${g.cost > 0 ? `<span class="badge gold">${UI.money(g.cost)} / play</span>` : `<span class="badge good">FREE</span>`}
                </div>
                <div class="top-prize">Top prize: ${UI.esc(top)}</div>
            </div>`;
        }).join("") || `<div class="empty-note">The casino is closed.</div>`;
        grid.querySelectorAll("[data-i]").forEach(c => c.onclick = () => this.open(this.games[Number(c.dataset.i)]));
    },

    // ------------------------------------------------------------------
    label(p) {
        if (!p || p.t === "none") return "✖ Nothing";
        if (p.t === "money") return `${Number(p.v).toLocaleString()} G`;
        if (p.t === "monster") return `🐾 ${p.name || "Monster"} (Lv ${p.lv || 1})`;
        return `${p.item}${(p.q || 1) > 1 ? ` x${p.q}` : ""}`;
    },

    shortLabel(p) {
        if (!p || p.t === "none") return "✖";
        if (p.t === "money") return `${Number(p.v) >= 1000 ? `${Number(p.v) / 1000}K` : p.v}G`;
        if (p.t === "monster") return "🐾MON";
        return `🎁${(p.item || "").split(" ")[0]}`;
    },

    topPrize(g) {
        const money = (g.prizes || []).filter(p => p.t === "money").sort((a, b) => b.v - a.v)[0];
        if (!money) return "items";
        return g.cost > 0 ? `${Number(money.v).toLocaleString()} G (x${Math.round(money.v / g.cost)})` : `${Number(money.v).toLocaleString()} G`;
    },

    sameAs(a, b) {
        if (!a || !b || a.t !== b.t) return false;
        if (a.t === "money") return Number(a.v) === Number(b.v);
        if (a.t === "item") return String(a.item).toLowerCase() === String(b.item).toLowerCase();
        if (a.t === "monster") return String(a.m) === String(b.m);
        return true;
    },

    // a random prize label that is NOT the given one (for the other cards / chests)
    decoy(g, not) {
        const others = (g.prizes || []).filter(p => !this.sameAs(p, not));
        return others[Math.floor(Math.random() * others.length)] || { t: "none" };
    },

    // ------------------------------------------------------------------
    open(g) {
        if (this.status.remaining <= 0) return UI.toast(GameConfig.ERRORS.CASINO_LIMIT, "error", 4000);
        if (g.cost > 0 && this.status.money < g.cost) return UI.toast(GameConfig.ERRORS.NOT_ENOUGH_MONEY, "error");
        SoundManager.play("click");
        const prizes = (g.prizes || []).filter(p => p.t !== "none")
            .sort((a, b) => (b.t === "money" ? b.v : 0) - (a.t === "money" ? a.v : 0));
        this.played = false;
        return UI.modal({
            title: `${UI.esc(g.icon || "")} ${UI.esc(g.name)}`,
            wide: true,
            dismissable: false,
            html: `
                <div class="stage" id="stage"></div>
                <div class="result-line" id="resultLine"></div>
                <div class="small muted center" style="margin:6px 0 4px">Possible prizes</div>
                <div class="prize-list">${prizes.map(p => `<span>${UI.esc(this.label(p))}</span>`).join("")}</div>
                ${g.cost > 0 ? `<p class="small center gold" style="margin-top:8px">Premium game: ${UI.money(g.cost)} per play.</p>` : ""}`,
            buttons: [{ label: "Close", value: () => this.busy ? undefined : true }],
            onOpen: el => this.setupStage(g, el)
        }).then(() => this.load());
    },

    async play(g, choice) {
        if (this.busy) return null;
        if (this.played) return null;
        this.busy = true;
        try {
            const res = await UI.rpc("emo_casino_play", { p_player_id: String(this.playerId), p_game_id: g.id });
            this.played = true;
            this.status.used++;
            this.status.remaining = res.remaining;
            this.status.money = res.money;
            this.renderHead();
            return res;
        } catch (e) {
            UI.error(e);
            this.busy = false;
            return null;
        }
    },

    showResult(el, res) {
        this.busy = false;
        const line = el.querySelector("#resultLine");
        if (res.win) {
            const big = (res.multiplier && res.multiplier >= 10) || res.money_won >= 5000;
            SoundManager.play(big ? "jackpot" : "casino_win");
            line.className = "result-line win";
            line.innerHTML = `${big ? "🎉 JACKPOT! " : "🎉 "}${UI.esc(res.label)}${res.multiplier ? ` <span class="small">(x${res.multiplier})</span>` : ""}`;
            this.confetti(big ? 120 : 40);
        } else {
            SoundManager.play("casino_lose");
            line.className = "result-line lose";
            line.textContent = "No luck this time…";
        }
        const again = this.status.remaining > 0
            ? `<button class="small primary" id="againBtn">Play again (${this.status.remaining} left)</button>` : `<span class="small muted">No plays left today.</span>`;
        line.insertAdjacentHTML("afterend", `<div class="center" id="againBox" style="margin-top:6px">${again}</div>`);
        el.querySelector("#againBtn")?.addEventListener("click", () => {
            el.querySelector("#againBox").remove();
            line.textContent = "";
            line.className = "result-line";
            this.played = false;
            this.setupStage(this.currentGame, el);
        });
    },

    confetti(n) {
        const colors = ["#ffd166", "#ff5e8a", "#5fc8ff", "#46d39a", "#a77bff"];
        for (let i = 0; i < n; i++) {
            const c = document.createElement("div");
            c.className = "confetti";
            c.style.left = `${Math.random() * 100}vw`;
            c.style.background = colors[i % colors.length];
            c.style.animationDuration = `${1.6 + Math.random() * 1.8}s`;
            c.style.animationDelay = `${Math.random() * .4}s`;
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 4000);
        }
    },

    ticking(ms, from = 60, to = 260) {
        const start = performance.now();
        const step = () => {
            const k = (performance.now() - start) / ms;
            if (k >= 1) return;
            SoundManager.play("tick", { volume: .5 });
            setTimeout(step, from + (to - from) * k * k);
        };
        step();
    },

    wait(ms) { return new Promise(r => setTimeout(r, ms)); },

    // ------------------------------------------------------------------
    // stages
    // ------------------------------------------------------------------
    setupStage(g, el) {
        this.currentGame = g;
        const stage = el.querySelector("#stage");
        const kind = g.kind;
        if (kind === "roulette" || kind === "wheel") return this.stageWheel(g, el, stage, kind === "wheel");
        if (kind === "slots") return this.stageSlots(g, el, stage);
        if (kind === "cards") return this.stagePick(g, el, stage, "cards");
        if (kind === "chest") return this.stagePick(g, el, stage, "chest");
        if (kind === "dice") return this.stageDice(g, el, stage);
        if (kind === "coin") return this.stageCoin(g, el, stage);
        if (kind === "scratch") return this.stageScratch(g, el, stage);
        if (kind === "vault") return this.stageVault(g, el, stage);
        return this.stageWheel(g, el, stage, false);
    },

    playButton(text) { return `<button class="primary" id="playBtn" style="font-size:18px;padding:12px 28px">${text}</button>`; },

    // --- roulette / diamond wheel -------------------------------------
    stageWheel(g, el, stage, diamond) {
        // wheel segments: every prize once + extra "nothing" slots
        const segs = [];
        (g.prizes || []).forEach(p => { segs.push(p); if (p.t === "none") segs.push(p, p); });
        for (let i = segs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [segs[i], segs[j]] = [segs[j], segs[i]]; }
        const n = segs.length, step = 360 / n;
        const colors = diamond ? ["#bdf1ff", "#7fd8ff", "#e6fbff", "#a6c8ff"] : ["#ff6b6b", "#ffd166", "#5fe08a", "#5fc8ff", "#c18cff", "#ff9fd1"];
        const grad = segs.map((p, i) => `${p.t === "none" ? "#3a4266" : colors[i % colors.length]} ${i * step}deg ${(i + 1) * step}deg`).join(",");
        stage.innerHTML = `
            <div class="wheel-wrap">
                <div class="wheel-pointer">🔻</div>
                <div class="wheel ${diamond ? "diamond" : ""}" id="wheel" style="background:conic-gradient(${grad})">
                    ${segs.map((p, i) => `<div class="wheel-label" style="transform:rotate(${i * step + step / 2 - 90}deg) translate(46px,-6px);${p.t === "none" ? "color:#9aa4c8" : ""}">${UI.esc(this.shortLabel(p))}</div>`).join("")}
                </div>
                <div class="wheel-hub"></div>
            </div>
            ${this.playButton(g.cost > 0 ? `SPIN (${g.cost} G)` : "SPIN!")}`;
        el.querySelector("#playBtn").onclick = async () => {
            const res = await this.play(g);
            if (!res) return;
            el.querySelector("#playBtn").disabled = true;
            const idx = segs.findIndex(p => this.sameAs(p, res.prize));
            const target = idx >= 0 ? idx : segs.findIndex(p => p.t === "none");
            const angle = 360 * 6 + (360 - (target * step + step / 2)) + (Math.random() - .5) * step * .6;
            this.ticking(4000);
            el.querySelector("#wheel").style.transform = `rotate(${angle}deg)`;
            await this.wait(4300);
            this.showResult(el, res);
        };
    },

    // --- slot machines -------------------------------------------------
    stageSlots(g, el, stage) {
        const SYM = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣", "🍀"];
        stage.innerHTML = `
            <div class="slot-machine ${g.cost > 0 ? "gold" : ""}">
                <div class="reel" id="r0">7️⃣</div><div class="reel" id="r1">7️⃣</div><div class="reel" id="r2">7️⃣</div>
            </div>
            ${this.playButton(g.cost > 0 ? `PULL (${g.cost} G)` : "PULL!")}`;
        el.querySelector("#playBtn").onclick = async () => {
            const res = await this.play(g);
            if (!res) return;
            el.querySelector("#playBtn").disabled = true;
            let final;
            if (!res.win) {
                do { final = [0, 1, 2].map(() => SYM[Math.floor(Math.random() * SYM.length)]); }
                while (final[0] === final[1] && final[1] === final[2]);
            } else {
                const v = res.prize.t === "money" ? res.money_won : 0;
                const s = res.prize.t === "item" ? "🍀" : v >= 5000 ? "7️⃣" : v >= 1000 ? "💎" : v >= 400 ? "⭐" : v >= 150 ? "🔔" : "🍒";
                final = [s, s, s];
            }
            const reels = [0, 1, 2].map(i => el.querySelector(`#r${i}`));
            reels.forEach(r => r.classList.add("spinning"));
            const timer = setInterval(() => reels.forEach(r => { if (r.classList.contains("spinning")) r.textContent = SYM[Math.floor(Math.random() * SYM.length)]; }), 70);
            for (let i = 0; i < 3; i++) {
                await this.wait(i === 0 ? 1100 : 650);
                reels[i].classList.remove("spinning");
                reels[i].textContent = final[i];
                SoundManager.play("hit", { volume: .6 });
            }
            clearInterval(timer);
            await this.wait(300);
            this.showResult(el, res);
        };
    },

    // --- pick one of three (cards / chests) ----------------------------
    stagePick(g, el, stage, kind) {
        if (kind === "cards") {
            stage.innerHTML = `<div class="muted">Pick one card!</div>
                <div class="pick-row">${[0, 1, 2].map(i => `
                    <div class="pick-card" data-k="${i}"><div class="inner">
                        <div class="face back">❓</div><div class="face front" id="f${i}"></div>
                    </div></div>`).join("")}</div>`;
        } else {
            stage.innerHTML = `<div class="muted">Open one treasure chest!</div>
                <div class="pick-row">${[0, 1, 2].map(i => `
                    <div class="chest" data-k="${i}"><div class="chest-icon">🧰</div><div class="chest-label" id="f${i}"></div></div>`).join("")}</div>`;
        }
        const spots = [...stage.querySelectorAll("[data-k]")];
        spots.forEach(sp => sp.onclick = async () => {
            if (this.played || this.busy) return;
            const res = await this.play(g);
            if (!res) return;
            const k = Number(sp.dataset.k);
            SoundManager.play(kind === "cards" ? "click" : "shake");
            el.querySelector(`#f${k}`).textContent = res.win ? res.label : "✖ Nothing";
            if (kind === "cards") { sp.classList.add("flipped", "chosen"); }
            else { sp.classList.add("open"); await this.wait(300); sp.querySelector(".chest-icon").textContent = res.win ? "💰" : "🕸"; }
            await this.wait(700);
            spots.filter(x => x !== sp).forEach(x => {
                const d = this.decoy(g, res.prize);
                el.querySelector(`#f${x.dataset.k}`).textContent = this.label(d);
                if (kind === "cards") x.classList.add("flipped");
                else { x.querySelector(".chest-icon").textContent = d.t === "none" ? "🕸" : "💰"; x.style.opacity = .5; }
            });
            this.showResult(el, res);
        });
    },

    // --- dice ------------------------------------------------------------
    stageDice(g, el, stage) {
        const F = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
        stage.innerHTML = `<div class="dice-row" id="dice"><span class="die">⚅</span><span class="die">⚅</span></div>
            <div class="small muted">Doubles win! Higher doubles win bigger.</div>
            ${this.playButton("ROLL!")}`;
        el.querySelector("#playBtn").onclick = async () => {
            const res = await this.play(g);
            if (!res) return;
            el.querySelector("#playBtn").disabled = true;
            const box = el.querySelector("#dice"), dice = [...box.querySelectorAll(".die")];
            box.classList.add("rolling");
            const timer = setInterval(() => dice.forEach(d => d.textContent = F[Math.floor(Math.random() * 6)]), 80);
            SoundManager.play("shake");
            await this.wait(1400);
            clearInterval(timer);
            box.classList.remove("rolling");
            let a, b;
            if (res.win) {
                const v = res.prize.t === "money" ? res.money_won : 200;
                a = b = v >= 1000 ? 5 : v >= 300 ? 4 : v >= 150 ? 3 : res.prize.t === "item" ? 2 : Math.floor(Math.random() * 2);
            } else {
                a = Math.floor(Math.random() * 6);
                do { b = Math.floor(Math.random() * 6); } while (b === a);
            }
            dice[0].textContent = F[a];
            dice[1].textContent = F[b];
            SoundManager.play("hit");
            this.showResult(el, res);
        };
    },

    // --- coin flip -------------------------------------------------------
    stageCoin(g, el, stage) {
        stage.innerHTML = `
            <div class="coin" id="coin"><div class="side heads">👑</div><div class="side tails">🌙</div></div>
            <div class="small muted">Call it!</div>
            <div class="row"><button class="primary" data-call="heads">👑 Heads</button><button class="primary" data-call="tails">🌙 Tails</button></div>`;
        stage.querySelectorAll("[data-call]").forEach(b => b.onclick = async () => {
            const res = await this.play(g);
            if (!res) return;
            stage.querySelectorAll("[data-call]").forEach(x => x.disabled = true);
            const call = b.dataset.call;
            const land = res.win ? call : (call === "heads" ? "tails" : "heads");
            const coin = el.querySelector("#coin");
            coin.className = `coin flip-${land}`;
            this.ticking(1800, 90, 200);
            await this.wait(2100);
            this.showResult(el, res);
        });
    },

    // --- scratch card ----------------------------------------------------
    stageScratch(g, el, stage) {
        stage.innerHTML = `${this.playButton("Get a scratch card")}`;
        el.querySelector("#playBtn").onclick = async () => {
            const res = await this.play(g);
            if (!res) return;
            stage.innerHTML = `
                <div class="scratch"><div class="under">${res.win ? `🎉<div>${UI.esc(res.label)}</div>` : `<div>✖</div><div style="font-size:16px">Try again</div>`}</div>
                    <canvas id="scr" width="300" height="150"></canvas></div>
                <div class="row"><span class="small muted">Scratch with your mouse or finger</span><button class="small" id="revealBtn">Reveal</button></div>`;
            const cv = el.querySelector("#scr"), ctx = cv.getContext("2d");
            const grd = ctx.createLinearGradient(0, 0, 300, 150);
            grd.addColorStop(0, "#9aa3b5"); grd.addColorStop(.5, "#d7dce6"); grd.addColorStop(1, "#8890a3");
            ctx.fillStyle = grd; ctx.fillRect(0, 0, 300, 150);
            ctx.fillStyle = "#5a6275"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("SCRATCH HERE", 150, 82);
            let done = false, down = false, strokes = 0;
            const finish = () => { if (done) return; done = true; cv.style.transition = "opacity .4s"; cv.style.opacity = 0; this.showResult(el, res); };
            const scratch = e => {
                if (!down || done) return;
                const r = cv.getBoundingClientRect();
                const x = (e.clientX - r.left) * 300 / r.width, y = (e.clientY - r.top) * 150 / r.height;
                ctx.globalCompositeOperation = "destination-out";
                ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
                if (++strokes % 6 === 0) SoundManager.play("tick", { volume: .4 });
                if (strokes % 20 === 0) {
                    const d = ctx.getImageData(0, 0, 300, 150).data;
                    let clear = 0;
                    for (let i = 3; i < d.length; i += 16) if (d[i] === 0) clear++;
                    if (clear / (d.length / 16) > .55) finish();
                }
            };
            cv.onpointerdown = e => { down = true; cv.setPointerCapture(e.pointerId); scratch(e); };
            cv.onpointermove = scratch;
            cv.onpointerup = () => { down = false; };
            el.querySelector("#revealBtn").onclick = finish;
        };
    },

    // --- jackpot vault ---------------------------------------------------
    stageVault(g, el, stage) {
        stage.innerHTML = `
            <div class="vault-wrap">
                <div class="vault-inside" id="vaultInside"></div>
                <div class="vault" id="vault"><div class="dial" id="dial"></div></div>
            </div>
            ${this.playButton(`CRACK THE VAULT (${g.cost} G)`)}`;
        el.querySelector("#playBtn").onclick = async () => {
            const res = await this.play(g);
            if (!res) return;
            el.querySelector("#playBtn").disabled = true;
            el.querySelector("#vaultInside").innerHTML = res.win ? `💰<br>${UI.esc(res.label)}` : `🕸<br><span style="font-size:16px">empty…</span>`;
            el.querySelector("#dial").style.transform = `rotate(${720 + Math.random() * 360}deg)`;
            this.ticking(2400, 70, 220);
            await this.wait(2500);
            SoundManager.play("shake");
            el.querySelector("#vault").classList.add("open");
            await this.wait(800);
            this.showResult(el, res);
        };
    }
};
