// =====================================================================
// SpriteManager - plays sprite sheet animations.
//
// Sheets made with the Sprite Studio (admin) are a grid: one animation
// per row, all frames the same size. The layout is described by the
// `sprite_config` JSON stored next to the sheet URL:
//   {
//     "frameWidth": 160, "frameHeight": 140,
//     "animations": {
//        "idle":   { "row": 0, "frames": 8, "fps": 8 },
//        "action": { "row": 1, "frames": 6, "fps": 12 },
//        "hurt":   { "row": 2, "frames": 4, "fps": 10 },
//        "faint":  { "row": 3, "frames": 4, "fps": 6 }
//     }
//   }
// Weapons use: projectile, hit, charge, trail.
//
// Monsters without a sheet still animate (CSS lunge/shake/fade on the
// static image), so the game works while sprites are being added.
// =====================================================================
class SpriteActor {

    constructor(el, { sheet, config, image, size = 140, flip = false }) {
        this.el = el;
        this.sheet = sheet || null;
        this.config = SpriteManager.normalizeConfig(config);
        this.image = image || null;
        this.size = size;
        this.flip = flip;
        this.current = null;
        this.ready = this.#setup();
    }

    async #setup() {
        const el = this.el;
        el.classList.add("sprite-box");
        el.innerHTML = `<div class="sprite-inner"></div>`;
        this.inner = el.firstElementChild;
        if (this.flip) this.inner.style.transform = "scaleX(-1)";

        if (this.sheet && this.config) {
            const img = await SpriteManager.loadImage(this.sheet).catch(() => null);
            if (img) {
                const { frameWidth: fw, frameHeight: fh } = this.config;
                this.scale = this.size / Math.max(fw, fh);
                Object.assign(this.inner.style, {
                    width: `${fw * this.scale}px`,
                    height: `${fh * this.scale}px`,
                    backgroundImage: `url("${this.sheet}")`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${img.naturalWidth * this.scale}px ${img.naturalHeight * this.scale}px`
                });
                this.mode = "sheet";
                this.setFrame("idle", 0);
                return;
            }
        }
        // static image fallback
        this.mode = "static";
        Object.assign(this.inner.style, {
            width: `${this.size}px`, height: `${this.size}px`,
            backgroundImage: this.image ? `url("${this.image}")` : "none",
            backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center bottom"
        });
        if (!this.image) this.inner.classList.add("sprite-missing");
    }

    has(name) {
        return this.mode === "sheet" && !!this.config.animations[name];
    }

    setFrame(name, index) {
        if (this.mode !== "sheet") return;
        const a = this.config.animations[name] || this.config.animations.idle;
        if (!a) return;
        const { frameWidth: fw, frameHeight: fh } = this.config;
        const col = (a.col || 0) + (index % a.frames);
        this.inner.style.backgroundPosition = `-${col * fw * this.scale}px -${a.row * fh * this.scale}px`;
    }

    // play an animation. loop=true keeps going until another play()
    play(name, { loop = false, speed = 1, hold = false } = {}) {
        return this.ready.then(() => new Promise(resolve => {
            SpriteManager.unregister(this);
            if (this.current?.resolve) this.current.resolve();
            this.el.classList.remove("sprite-fainted");

            if (!this.has(name)) {
                // CSS fallback animations for static images
                const cls = { action: "anim-attack", hurt: "anim-hurt", faint: "anim-faint" }[name];
                this.current = null;
                if (!cls || loop) {
                    this.inner.classList.toggle("anim-idle-bob", name === "idle" && this.mode === "static");
                    resolve();
                    return;
                }
                this.inner.classList.remove("anim-idle-bob");
                this.inner.classList.remove(cls);
                void this.inner.offsetWidth;
                this.inner.classList.add(cls);
                setTimeout(() => {
                    if (name !== "faint") this.inner.classList.remove(cls);
                    else this.el.classList.add("sprite-fainted");
                    resolve();
                }, 520 / speed);
                return;
            }

            const a = this.config.animations[name];
            this.current = {
                name, loop, hold, resolve, frame: 0, frames: a.frames,
                interval: 1000 / ((a.fps || 10) * speed), last: performance.now()
            };
            this.setFrame(name, 0);
            SpriteManager.register(this);
        }));
    }

    idle() { return this.play("idle", { loop: true }); }

    tick(now) {
        const c = this.current;
        if (!c) return false;
        if (now - c.last < c.interval) return true;
        c.last = now;
        c.frame++;
        if (c.frame >= c.frames) {
            if (c.loop) {
                c.frame = 0;
            } else {
                if (c.hold) this.setFrame(c.name, c.frames - 1);
                else this.setFrame("idle", 0);
                this.current = null;
                c.resolve();
                return false;
            }
        }
        this.setFrame(c.name, c.frame);
        return true;
    }

    destroy() {
        SpriteManager.unregister(this);
        this.current?.resolve?.();
        this.current = null;
    }
}

class SpriteManager {

    static #actors = new Set();
    static #raf = null;
    static #images = new Map();

    static MONSTER_ANIMS = ["idle", "action", "hurt", "faint"];
    static WEAPON_ANIMS = ["projectile", "hit", "charge", "trail"];

    static loadImage(url) {
        if (!this.#images.has(url)) {
            this.#images.set(url, new Promise((res, rej) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => res(img);
                img.onerror = rej;
                img.src = url;
            }));
        }
        return this.#images.get(url);
    }

    static normalizeConfig(cfg) {
        if (!cfg) return null;
        if (typeof cfg === "string") {
            try { cfg = JSON.parse(cfg); } catch { return null; }
        }
        if (!cfg.animations || !cfg.frameWidth || !cfg.frameHeight) return null;
        const anims = {};
        for (const [k, a] of Object.entries(cfg.animations)) {
            if (a && Number(a.frames) > 0) {
                anims[k] = { row: Number(a.row) || 0, col: Number(a.col) || 0,
                             frames: Number(a.frames), fps: Number(a.fps) || 10 };
            }
        }
        return { frameWidth: Number(cfg.frameWidth), frameHeight: Number(cfg.frameHeight), animations: anims };
    }

    // config for sheets made by the old code (one row, 128px frames)
    static legacyMonsterConfig(m) {
        return {
            frameWidth: 128, frameHeight: 128,
            animations: {
                idle: { row: 0, frames: m.idle_frames || 8, fps: 8 },
                action: { row: 0, frames: m.action_frames || 6, fps: 12 },
                hurt: { row: 0, frames: m.hurt_frames || 4, fps: 10 },
                faint: { row: 0, frames: m.faint_frames || 4, fps: 6 }
            }
        };
    }

    static register(actor) {
        this.#actors.add(actor);
        if (!this.#raf) this.#raf = requestAnimationFrame(t => this.#loop(t));
    }

    static unregister(actor) { this.#actors.delete(actor); }

    static #loop(now) {
        for (const a of [...this.#actors]) {
            if (!a.el.isConnected) { this.#actors.delete(a); continue; }
            if (!a.tick(now)) this.#actors.delete(a);
        }
        this.#raf = this.#actors.size ? requestAnimationFrame(t => this.#loop(t)) : null;
    }

    // ------------------------------------------------------------------
    // monsters
    // ------------------------------------------------------------------
    static forMonster(el, monster, { size = 140, flip = false, autoIdle = true } = {}) {
        const config = monster.sprite_config || (monster.sprite_sheet ? this.legacyMonsterConfig(monster) : null);
        const actor = new SpriteActor(el, {
            sheet: monster.sprite_sheet ? UI.asset(monster.sprite_sheet) : null,
            config,
            image: UI.asset(monster.image),
            size, flip
        });
        if (autoIdle) actor.idle();
        return actor;
    }

    // ------------------------------------------------------------------
    // weapon effects (projectile flying from one point to another, hit)
    // layer: positioned container; from/to: {x, y} in layer pixels
    // ------------------------------------------------------------------
    static async playEffect(layer, weapon, anim, at, { size = 110, flip = false, speed = 1 } = {}) {
        const cfg = this.normalizeConfig(weapon.sprite_config);
        if (!weapon.sprite_sheet || !cfg || !cfg.animations[anim]) return false;
        const box = document.createElement("div");
        box.className = "fx";
        layer.appendChild(box);
        const actor = new SpriteActor(box, { sheet: UI.asset(weapon.sprite_sheet), config: cfg, size, flip });
        await actor.ready;
        box.style.left = `${at.x - box.offsetWidth / 2}px`;
        box.style.top = `${at.y - box.offsetHeight / 2}px`;
        await actor.play(anim, { speed });
        box.remove();
        return true;
    }

    static async projectile(layer, weapon, from, to, { size = 110, speed = 1, duration = 650 } = {}) {
        const flip = to.x < from.x;
        const cfg = this.normalizeConfig(weapon.sprite_config);
        const box = document.createElement("div");
        box.className = "fx";
        layer.appendChild(box);
        let actor = null;

        if (weapon.sprite_sheet && cfg && cfg.animations.projectile) {
            actor = new SpriteActor(box, { sheet: UI.asset(weapon.sprite_sheet), config: cfg, size, flip });
            await actor.ready;
            actor.play("projectile", { loop: true, speed });
        } else if (weapon.attribute) {
            // no sprite sheet: attribute-themed effect (physical / special, rare weapons bigger)
            box.remove();
            return this.themedFx(layer, weapon, from, to, speed);
        } else if (weapon.image) {
            // weapon picture flies to the target
            box.innerHTML = `<img class="fx-img" src="${UI.asset(weapon.image)}" style="--fx-color:${TYPE_COLORS[weapon.attribute] || "#fff"};${flip ? "transform:scaleX(-1)" : ""}">`;
            await new Promise(r => { const im = box.querySelector("img"); if (im.complete) r(); else { im.onload = r; im.onerror = r; } });
        } else {
            // no picture: glowing orb in the weapon's attribute color
            box.innerHTML = `<div class="fx-orb" style="--fx-color:${TYPE_COLORS[weapon.attribute] || "#fff"}"></div>`;
        }

        const t = duration / speed;
        const w = box.offsetWidth || 40, h = box.offsetHeight || 40;
        const anim = box.animate([
            { transform: `translate(${from.x - w / 2}px, ${from.y - h / 2}px) scale(.6)` },
            { transform: `translate(${to.x - w / 2}px, ${to.y - h / 2}px) scale(1)` }
        ], { duration: t, easing: "ease-in" });
        await anim.finished.catch(() => {});
        actor?.destroy();
        box.remove();

        const hit = await this.playEffect(layer, weapon, "hit", to, { size, speed });
        if (!hit) {
            const burst = document.createElement("div");
            burst.className = "fx fx-burst";
            burst.style.setProperty("--fx-color", TYPE_COLORS[weapon.attribute] || "#fff");
            burst.style.left = `${to.x - 40}px`;
            burst.style.top = `${to.y - 40}px`;
            layer.appendChild(burst);
            setTimeout(() => burst.remove(), 450 / speed);
            await new Promise(r => setTimeout(r, 300 / speed));
        }
    }

    // ------------------------------------------------------------------
    // attribute-themed attack effects (weapons without a sprite sheet)
    //   physical: a fast rush of attribute glyphs, then slash marks
    //   special:  a beam / rings / wave carrying the glyphs, then a burst
    //   rare (power 50+, signature or expensive weapons): more and bigger, screen shake + flash
    // ------------------------------------------------------------------
    static FX_GLYPHS = {
        Normal: ["⭐", "💥"], Abnormal: ["❓", "🌀", "❗"], Magic: ["✨", "🔮", "✴️"], Power: ["👊", "💢"],
        Water: ["💧", "🌊"], Fire: ["🔥"], Grass: ["🍃", "🌿", "🍂"], Electric: ["⚡"], Ice: ["❄️", "🧊"],
        Angel: ["🪽", "✨"], Evil: ["😈", "🌑"], Air: ["💨", "🌪️"], Fly: ["🪶"], Earth: ["🪨", "🟤"],
        Bug: ["🐛", "🦗"], Ghost: ["👻", "💀"], Steel: ["⚙️", "🔩"], Fairy: ["🌸", "✨", "🧚"], Space: ["🌠", "🪐", "⭐"],
        Robot: ["🤖", "🔧", "⚙️"], Light: ["🌟", "💡"], Mind: ["🧠", "🌀"], Pure: ["⚪", "✦"]
    };
    static FX_SHAPE = {
        Angel: "halo", Mind: "rings", Space: "rings", Abnormal: "rings", Magic: "rings", Fairy: "rings", Ghost: "rings",
        Light: "beam", Electric: "beam", Fire: "beam", Ice: "beam", Robot: "beam", Steel: "beam", Evil: "beam",
        Water: "wave", Air: "wave", Fly: "wave", Grass: "wave", Earth: "wave", Bug: "wave", Normal: "wave", Power: "wave", Pure: "wave"
    };

    static #el(layer, cls, color, html = "") {
        const el = document.createElement("div");
        el.className = `fx ${cls}`;
        el.style.setProperty("--fx-color", color);
        el.innerHTML = html;
        layer.appendChild(el);
        return el;
    }

    // power tier of a weapon: 0-10 → 0, 11-20 → 1 … 71-80 → 7, 81-100 → 8 (stronger = flashier)
    static fxTier(weapon) {
        const p = Math.max(0, Number(weapon?.power) || 0);
        return p <= 10 ? 0 : Math.min(8, Math.ceil(p / 10) - 1);
    }

    static async themedFx(layer, weapon, from, to, speed = 1) {
        const color = TYPE_COLORS[weapon.attribute] || "#fff";
        const glyphs = this.FX_GLYPHS[weapon.attribute] || ["✦"];
        const tier = weapon.fxTier ?? this.fxTier(weapon);
        const rare = !!weapon.rare || tier >= 6, phys = weapon.kind !== "special";
        const grow = 0.75 + tier * 0.12;                       // size of everything (tier 0 small … tier 8 huge)
        const dx = to.x - from.x, dy = to.y - from.y;
        const t = (phys ? 420 + tier * 20 : 620 + tier * 30) / speed;
        const jobs = [];
        const run = (el, frames, opts) => jobs.push(el.animate(frames, { fill: "backwards", ...opts }).finished.catch(() => {}).then(() => el.remove()));
        const at = (x, y, rest = "") => `translate(${x}px, ${y}px) translate(-50%, -50%) ${rest}`;
        const big = el => { el.style.scale = String(grow); return el; };

        if (!phys) {
            const shape = this.FX_SHAPE[weapon.attribute] || "rings";
            if (shape === "beam") {
                const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
                for (let b = 0; b < (tier >= 7 ? 2 : 1); b++) {          // tier 7+: a second, wider beam
                    const beam = this.#el(layer, `fx-beam${rare ? " rare" : ""}`, color);
                    const h = 8 + tier * 2 + b * 10;
                    beam.style.width = `${len}px`;
                    beam.style.height = `${h}px`;
                    beam.style.marginTop = `${-h / 2}px`;
                    if (b) beam.style.opacity = ".55";
                    run(beam, [
                        { transform: `translate(${from.x}px, ${from.y}px) rotate(${ang}deg) scaleX(0)`, opacity: 1 },
                        { transform: `translate(${from.x}px, ${from.y}px) rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: .55 },
                        { transform: `translate(${from.x}px, ${from.y}px) rotate(${ang}deg) scaleX(1) scaleY(.2)`, opacity: 0 }
                    ], { duration: t, delay: b * 90 / speed, easing: "ease-out" });
                }
            } else {
                const n = 2 + Math.ceil(tier / 2);
                for (let i = 0; i < n; i++) {
                    const cls = shape === "halo" ? "fx-ring halo" : shape === "wave" ? "fx-wave" : "fx-ring";
                    const el = this.#el(layer, `${cls}${rare ? " rare" : ""}`, color);
                    const turn = shape === "wave" ? Math.atan2(dy, dx) * 180 / Math.PI : 0;
                    run(el, [
                        { transform: at(from.x, from.y, `rotate(${turn}deg) scale(${.3 * grow})`), opacity: 0 },
                        { transform: at(from.x + dx * .5, from.y + dy * .5, `rotate(${turn}deg) scale(${grow})`), opacity: 1, offset: .5 },
                        { transform: at(to.x, to.y, `rotate(${turn}deg) scale(${(1.2 + tier * .08) * grow})`), opacity: 0 }
                    ], { duration: t, delay: i * 100 / speed, easing: "ease-in-out" });
                }
            }
        }

        // the attribute glyphs (a weapon picture leads them when it has one)
        const n = (phys ? 3 : 2) + tier + (rare ? 2 : 0);
        for (let i = 0; i < n; i++) {
            const html = i === 0 && weapon.image ? `<img class="fx-img" src="${UI.asset(weapon.image)}">` : glyphs[i % glyphs.length];
            const el = big(this.#el(layer, `fx-glyph${rare ? " rare" : ""}`, color, html));
            const spread = (phys ? 18 : 40) + tier * 4;
            const ox = (Math.random() - .5) * spread * 2, oy = (Math.random() - .5) * spread * 2;
            const mid = phys ? { x: from.x + dx * .5 + ox * .3, y: from.y + dy * .5 + oy * .3 }
                             : { x: from.x + dx * .5 + ox, y: from.y + dy * .5 - 50 + oy };
            run(el, [
                { transform: at(from.x, from.y, "scale(.4) rotate(0deg)"), opacity: 0 },
                { transform: at(mid.x, mid.y, `scale(1) rotate(${phys ? 360 : 60}deg)`), opacity: 1, offset: .5 },
                { transform: at(to.x + ox * .4, to.y + oy * .4, `scale(${1 + tier * .06}) rotate(${phys ? 720 : 120}deg)`), opacity: .9 }
            ], { duration: t, delay: i * (phys ? 35 : 80) / speed, easing: phys ? "ease-in" : "ease-in-out" });
        }
        await Promise.all(jobs);

        // impact: physical = slash marks (1 … 5), special = a burst (bigger each tier)
        const hits = [];
        if (phys) {
            const cuts = 1 + Math.floor(tier / 2);
            for (let i = 0; i < cuts; i++) {
                const el = this.#el(layer, "fx-slash", color);
                el.style.width = `${80 + tier * 10}px`;
                el.style.height = `${4 + Math.floor(tier / 2)}px`;
                const ang = cuts === 1 ? -35 : -40 + i * (80 / (cuts - 1)) + (i % 2 ? 90 : 0);
                hits.push(el.animate([
                    { transform: at(to.x, to.y, `rotate(${ang}deg) scaleX(0)`), opacity: 1 },
                    { transform: at(to.x, to.y, `rotate(${ang}deg) scaleX(${1 + tier * .06})`), opacity: 1, offset: .5 },
                    { transform: at(to.x, to.y, `rotate(${ang}deg) scaleX(1.2)`), opacity: 0 }
                ], { duration: 300 / speed, delay: i * 60 / speed, fill: "backwards" }).finished.catch(() => {}).then(() => el.remove()));
            }
        } else {
            const el = this.#el(layer, "fx-burst", color);
            el.style.left = `${to.x - 40}px`; el.style.top = `${to.y - 40}px`;
            el.style.scale = String(0.7 + tier * 0.15);
            hits.push(new Promise(r => setTimeout(() => { el.remove(); r(); }, 450 / speed)));
        }
        // a few glyphs scatter from the hit point
        for (let i = 0; i < 2 + tier; i++) {
            const el = this.#el(layer, "fx-glyph small", color, glyphs[i % glyphs.length]);
            const a = Math.random() * Math.PI * 2, d = 36 + tier * 6 + Math.random() * 40;
            hits.push(el.animate([
                { transform: at(to.x, to.y, "scale(.6)"), opacity: 1 },
                { transform: at(to.x + Math.cos(a) * d, to.y + Math.sin(a) * d, "scale(.9)"), opacity: 0 }
            ], { duration: 420 / speed, easing: "ease-out" }).finished.catch(() => {}).then(() => el.remove()));
        }
        // tier 4+: shockwave ring · 5+: screen flash · 6+: screen shake (harder at 8)
        if (tier >= 4) {
            const ring = this.#el(layer, "fx-ring rare", color);
            hits.push(ring.animate([{ transform: at(to.x, to.y, "scale(.4)"), opacity: 1 }, { transform: at(to.x, to.y, `scale(${2 + tier * .3})`), opacity: 0 }],
                                   { duration: 450 / speed, easing: "ease-out" }).finished.catch(() => {}).then(() => ring.remove()));
        }
        if (tier >= 5) {
            const flash = this.#el(layer, "fx-flash", color);
            hits.push(flash.animate([{ opacity: .35 + (tier - 5) * .15 }, { opacity: 0 }], { duration: 380 / speed }).finished.catch(() => {}).then(() => flash.remove()));
        }
        if (tier >= 6) {
            const k = tier >= 8 ? 2 : 1, stage = layer.parentElement;
            stage?.animate([{ transform: "translate(0,0)" }, { transform: `translate(${-6 * k}px,${3 * k}px)` }, { transform: `translate(${5 * k}px,${-4 * k}px)` },
                            { transform: `translate(${-3 * k}px,${2 * k}px)` }, { transform: "translate(0,0)" }], { duration: (320 + 80 * k) / speed });
        }
        await Promise.all(hits);
    }

    // ------------------------------------------------------------------
    // status effects of a weapon (shown on the monster that gets them):
    //   mode "one"     = a one-time status (stun): one big stamp
    //   mode "dot"     = works over several turns in the battle (poison, burn, sleep…): a cloud that pulses
    //   mode "lasting" = stays after the battle too (venom, cold, diseases): a dark sigil + chains
    // from far from to: it flies from the user to the target first (a debuff on the opponent)
    // ------------------------------------------------------------------
    static async statusFx(layer, icon, color, mode, from, to, speed = 1) {
        const at = (x, y, rest = "") => `translate(${x}px, ${y}px) translate(-50%, -50%) ${rest}`;
        const done = el => a => a.finished.catch(() => {}).then(() => el.remove());
        if (from && (Math.abs(from.x - to.x) > 4 || Math.abs(from.y - to.y) > 4)) {
            const orb = this.#el(layer, "fx-glyph rare", color, icon);
            await done(orb)(orb.animate([{ transform: at(from.x, from.y, "scale(.5)"), opacity: .2 },
                                         { transform: at((from.x + to.x) / 2, Math.min(from.y, to.y) - 60, "scale(1.2)"), opacity: 1, offset: .5 },
                                         { transform: at(to.x, to.y, "scale(1)"), opacity: 1 }], { duration: 520 / speed, easing: "ease-in-out" }));
        }
        const jobs = [];
        if (mode === "one") {
            const el = this.#el(layer, "fx-glyph rare fx-stamp", color, icon);
            jobs.push(done(el)(el.animate([{ transform: at(to.x, to.y - 30, "scale(2.6)"), opacity: 0 }, { transform: at(to.x, to.y - 30, "scale(1.2)"), opacity: 1, offset: .35 },
                                           { transform: at(to.x, to.y - 30, "scale(1.3)"), opacity: 1, offset: .75 }, { transform: at(to.x, to.y - 30, "scale(1.6)"), opacity: 0 }],
                                          { duration: 650 / speed, easing: "ease-out" })));
        } else if (mode === "dot") {
            for (let i = 0; i < 6; i++) {
                const el = this.#el(layer, "fx-glyph", color, icon);
                const a = i / 6 * Math.PI * 2;
                const p = k => at(to.x + Math.cos(a + k) * 40, to.y + Math.sin(a + k) * 22 - 10, `scale(${.7 + .3 * Math.sin(k * 3)})`);
                jobs.push(done(el)(el.animate([{ transform: p(0), opacity: 0 }, { transform: p(1.5), opacity: 1, offset: .3 }, { transform: p(3), opacity: 1, offset: .7 }, { transform: p(4.5), opacity: 0 }],
                                              { duration: 1000 / speed, delay: i * 30 / speed })));
            }
            const cloud = this.#el(layer, "fx-ring", color);
            jobs.push(done(cloud)(cloud.animate([0, 1, 2].flatMap(k => [{ transform: at(to.x, to.y, "scale(.8)"), opacity: .7, offset: k / 3 },
                                                                       { transform: at(to.x, to.y, "scale(1.5)"), opacity: 0, offset: (k + .9) / 3 }]),
                                                { duration: 1000 / speed })));
        } else {
            const sig = this.#el(layer, "fx-sigil", color, icon);
            jobs.push(done(sig)(sig.animate([{ transform: at(to.x, to.y, "scale(.2) rotate(0deg)"), opacity: 0 }, { transform: at(to.x, to.y, "scale(1) rotate(180deg)"), opacity: 1, offset: .4 },
                                             { transform: at(to.x, to.y, "scale(1) rotate(300deg)"), opacity: 1, offset: .8 }, { transform: at(to.x, to.y, "scale(.6) rotate(360deg)"), opacity: 0 }],
                                            { duration: 1300 / speed, easing: "ease-in-out" })));
            for (let i = 0; i < 4; i++) {
                const ch = this.#el(layer, "fx-glyph", color, "⛓");
                const a = i / 4 * Math.PI * 2 + .4;
                jobs.push(done(ch)(ch.animate([{ transform: at(to.x + Math.cos(a) * 70, to.y + Math.sin(a) * 70, "scale(.6)"), opacity: 0 },
                                               { transform: at(to.x + Math.cos(a) * 26, to.y + Math.sin(a) * 26, "scale(1)"), opacity: 1, offset: .5 },
                                               { transform: at(to.x + Math.cos(a) * 26, to.y + Math.sin(a) * 26, "scale(1)"), opacity: 0 }],
                                              { duration: 1200 / speed, delay: 200 / speed, fill: "backwards" })));
            }
        }
        await Promise.all(jobs);
    }

    // a buff the monster gives ITSELF (attack / defense / speed up, guard, regen, heal): an aura with rising arrows
    static async selfFx(layer, icon, color, at0, speed = 1) {
        const at = (x, y, rest = "") => `translate(${x}px, ${y}px) translate(-50%, -50%) ${rest}`;
        const jobs = [];
        const aura = this.#el(layer, "fx-aura", color);
        jobs.push(aura.animate([{ transform: at(at0.x, at0.y, "scale(.6)"), opacity: 0 }, { transform: at(at0.x, at0.y, "scale(1.1)"), opacity: .9, offset: .4 },
                                { transform: at(at0.x, at0.y, "scale(1.3)"), opacity: 0 }], { duration: 900 / speed }).finished.catch(() => {}).then(() => aura.remove()));
        for (let i = 0; i < 6; i++) {
            const el = this.#el(layer, "fx-glyph", color, i % 2 ? "▲" : icon);
            const x = at0.x - 45 + i * 18;
            jobs.push(el.animate([{ transform: at(x, at0.y + 40, "scale(.6)"), opacity: 0 }, { transform: at(x, at0.y - 10, "scale(1)"), opacity: 1, offset: .5 },
                                  { transform: at(x, at0.y - 60, "scale(.8)"), opacity: 0 }], { duration: 800 / speed, delay: i * 60 / speed, fill: "backwards" })
                .finished.catch(() => {}).then(() => el.remove()));
        }
        await Promise.all(jobs);
    }

    // an item is used in battle: a short "who used what" pop-up over the arena, then the item flies to its target
    // (its own monster or the opponent) and bursts there. Used by the 1:1 battle, team battle and Quest Battle.
    static async itemFx(layer, { text, icon = "🎒", from, to, foe = false, speed = 1 }) {
        if (!layer) return;
        const at = (x, y, rest = "") => `translate(${x}px, ${y}px) translate(-50%, -50%) ${rest}`;
        const pop = document.createElement("div");
        pop.className = "item-pop";
        pop.innerHTML = `<span class="ic">${icon}</span> ${text}`;
        layer.appendChild(pop);
        const color = foe ? "#c86ad8" : "#4cd964";
        const jobs = [this.sleep(1400 / speed).then(() => pop.remove())];
        const fly = this.#el(layer, "fx-glyph item-fly", color, icon);
        const p0 = foe ? from : { x: to.x, y: to.y - 70 };
        await fly.animate([{ transform: at(p0.x, p0.y, "scale(.6)"), opacity: 0 }, { transform: at((p0.x + to.x) / 2, Math.min(p0.y, to.y) - 50, "scale(1.4)"), opacity: 1, offset: .5 },
                           { transform: at(to.x, to.y, "scale(1)"), opacity: 1 }], { duration: 650 / speed, easing: "ease-in" }).finished.catch(() => {});
        fly.remove();
        const ring = this.#el(layer, "fx-aura", color);
        jobs.push(ring.animate([{ transform: at(to.x, to.y, "scale(.4)"), opacity: .9 }, { transform: at(to.x, to.y, "scale(1.5)"), opacity: 0 }],
            { duration: 600 / speed }).finished.catch(() => {}).then(() => ring.remove()));
        for (let i = 0; i < 8; i++) {
            const s = this.#el(layer, "fx-glyph", color, "✦"), a = i / 8 * Math.PI * 2;
            jobs.push(s.animate([{ transform: at(to.x, to.y, "scale(.5)"), opacity: 1 }, { transform: at(to.x + Math.cos(a) * 60, to.y + Math.sin(a) * 60, "scale(.9)"), opacity: 0 }],
                { duration: 650 / speed }).finished.catch(() => {}).then(() => s.remove()));
        }
        await Promise.all(jobs);
    }

    static sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}
