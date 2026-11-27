// ================================================================ 🎬 film sound (used by screens/vhs.js)
//   🌧️ ambience — a scene's background sounds (rain · wind · birds · crickets · traffic · a noisy audience …),
//      synthesized live; picked from the scene's set / place / effects, or named by the script (scene.amb · line meta.amb)
// =====================================================================
// ---------------------------------------------------------------- 🌧️ ambience
// set → sounds · a place name / the scene's effects can add to it · a dark scene trades birds for crickets
const BY_BG = {
    street: ["cars", "chatter"], night: ["cars", "crickets"], taxi: ["engine", "cars"], bank: ["room", "chatter"], hideout: ["room"], money: ["cars", "crowd"],
    home: ["room", "birds"], house: ["room"], room: ["room"], practice: ["room"], office: ["room", "chatter"], police: ["room"],
    forest: ["birds", "wind"], woods: ["wind", "crickets"], country: ["birds", "wind"], darkroad: ["crickets", "wind"], barnout: ["crickets", "wind"], barn: ["wind", "room"], moonhouse: ["wind", "crickets"],
    beach: ["waves", "birds"], space: ["drone"], castle: ["wind", "room"],
    stage: ["crowd"], seats: ["crowd"], ballroom: ["chatter"], hallway: ["chatter"], campus: ["chatter", "birds"], school: ["chatter"], classroom: ["chatter"],
    shower: ["water"], church: ["room"], funeral: ["room", "rain"], funeralout: ["rain", "wind"],
    agency: ["room", "cars"], bedroom: ["room", "crickets"], camp: ["crickets", "wind"], lake: ["water", "crickets", "wind"], hospital: ["room"]
};
export const AMB_KO = { rain: "🌧️ 비", wind: "🌬️ 바람", birds: "🐦 새소리", crickets: "🦗 풀벌레", cars: "🚗 차 소리", engine: "🚕 차 엔진", crowd: "📣 시끄러운 관객", chatter: "🗣️ 웅성웅성", room: "🏠 실내 소음", waves: "🌊 파도", water: "🚿 물소리", drone: "🛸 우주 웅웅", storm: "⛈️ 폭풍우", heartbeat: "💓 심장 소리" };
export function ambFor(sc) {
    if (Array.isArray(sc.amb)) return sc.amb;                       // the script names it (scene.amb: ["rain", "wind"] · [] = silence)
    if (typeof sc.amb === "string") return sc.amb ? sc.amb.split(/[ ,]+/) : [];
    const set = new Set(BY_BG[sc.bg || "street"] || ["room"]);
    const place = String(sc.place || "");
    if (/비 |비$|빗|폭우|장마|rain/i.test(place)) set.add("rain");
    if (/폭풍|태풍|storm/i.test(place)) { set.add("storm"); set.add("wind"); }
    if (/바람|언덕|옥상|wind/i.test(place)) set.add("wind");
    if (/바다|해변|beach/i.test(place)) set.add("waves");
    if (/무대|객석|경기장|콘서트/.test(place)) set.add("crowd");
    if (/꿈속|우주/.test(place)) { set.clear(); set.add("drone"); }
    if (/밤|night/i.test(place) || sc.dark) { if (set.delete("birds")) set.add("crickets"); }
    if (["clap", "spot", "disco", "rock"].includes(sc.fx)) set.add("crowd");
    if (sc.fx === "chase") set.add("cars");
    if (["moon", "mist", "howl", "shadow", "fog"].includes(sc.fx)) { set.add("wind"); if (set.delete("birds")) set.add("crickets"); }
    if (sc.fx === "steam") set.add("water");
    return [...set];
}

// the player: one bed per sound, faded in / out as the scene changes
export function ambience(getCtx) {
    let out = null, white = null, brown = null;
    const playing = new Map(); // kind → stop()
    const setup = () => {
        const a = getCtx(); if (!a) return null;
        if (!out) { out = a.createGain(); out.gain.value = 0.55; out.connect(a.destination); }
        if (!white) { white = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const d = white.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
        if (!brown) { brown = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const d = brown.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
        return a;
    };
    const start = kind => {
        const a = setup(); if (!a || !KINDS[kind]) return null;
        const bed = a.createGain(); bed.gain.value = 0.0001; bed.connect(out);
        bed.gain.setTargetAtTime(1, a.currentTime, 0.6);
        const env = { a, out: bed, white, brown, nodes: [], timers: [], live: true };
        env.src = (buf = white) => { const s = a.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); env.nodes.push(s); return s; };
        env.osc = (type, f) => { const o = a.createOscillator(); o.type = type; o.frequency.value = f; env.nodes.push(o); return o; };
        env.filt = (type, f, q = 1) => { const b = a.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
        env.gain = v => { const g = a.createGain(); g.gain.value = v; return g; };
        // a sound now and then (only while the film plays: a paused film's clock stands still)
        env.every = (fn, lo, hi) => { const go = () => { if (!env.live) return; const id = setTimeout(() => { if (!env.live) return; if (a.state === "running") fn(a.currentTime + 0.02); go(); }, lo + Math.random() * (hi - lo)); env.timers.push(id); }; go(); };
        KINDS[kind](env);
        env.nodes.forEach(n => { try { n.start(); } catch { } });
        return () => {
            env.live = false; env.timers.forEach(clearTimeout);
            try { bed.gain.setTargetAtTime(0.0001, a.currentTime, 0.35); } catch { }
            setTimeout(() => { env.nodes.forEach(n => { try { n.stop(); } catch { } }); try { bed.disconnect(); } catch { } }, 1800);
        };
    };
    return {
        set(kinds = []) {
            const want = new Set(kinds.filter(k => KINDS[k]));
            for (const [k, stop] of playing) if (!want.has(k)) { stop(); playing.delete(k); }
            for (const k of want) if (!playing.has(k)) { const stop = start(k); if (stop) playing.set(k, stop); }
        },
        get kinds() { return [...playing.keys()]; },
        stop() { this.set([]); }
    };
}
// one-shot helpers on the env
const blip = (e, t, f, dur, { type = "sine", vol = 0.03, to = 0, filter = null } = {}) => {
    const { a } = e, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o.connect(g); if (filter) n = n.connect(filter);
    n.connect(e.out); o.start(t); o.stop(t + dur + 0.05);
};
const swell = (e, t, buf, { type = "lowpass", f0 = 200, f1 = 900, vol = 0.1, up = 1.2, down = 1.4, q = 0.8 } = {}) => {
    const { a } = e, s = a.createBufferSource(), b = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; b.type = type; b.Q.value = q;
    b.frequency.setValueAtTime(f0, t); b.frequency.exponentialRampToValueAtTime(f1, t + up); b.frequency.exponentialRampToValueAtTime(f0, t + up + down);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + up); g.gain.exponentialRampToValueAtTime(0.0001, t + up + down);
    s.connect(b).connect(g).connect(e.out); s.start(t, Math.random()); s.stop(t + up + down + 0.1);
};
const lfo = (e, param, hz, depth) => { const o = e.osc("sine", hz), g = e.gain(depth); o.connect(g).connect(param); };
const KINDS = {
    // 🌧️ steady rain + drops ticking on things
    rain(e) {
        const s = e.src(), hp = e.filt("highpass", 900), lp = e.filt("lowpass", 7000), g = e.gain(0.075);
        s.connect(hp).connect(lp).connect(g).connect(e.out);
        e.every(t => blip(e, t, 2800 + Math.random() * 3500, 0.025, { vol: 0.012 + Math.random() * 0.012 }), 40, 140);
    },
    // ⛈️ heavier rain + far thunder
    storm(e) {
        KINDS.rain(e);
        const s = e.src(), bp = e.filt("bandpass", 1600, 0.5), g = e.gain(0.06); s.connect(bp).connect(g).connect(e.out);
        e.every(t => swell(e, t, e.brown, { f0: 60, f1: 260, vol: 0.5, up: 0.15, down: 2.6 }), 5000, 12000);
    },
    // 🌬️ wind: a band of noise that rises and falls
    wind(e) {
        const s = e.src(), bp = e.filt("bandpass", 520, 1.3), g = e.gain(0.07);
        lfo(e, bp.frequency, 0.07 + Math.random() * 0.05, 280); lfo(e, g.gain, 0.11, 0.05);
        s.connect(bp).connect(g).connect(e.out);
    },
    // 🐦 little birds: two to four quick chirps now and then
    birds(e) {
        e.every(t => {
            const n = 2 + Math.floor(Math.random() * 3), f = 2400 + Math.random() * 2200, kind = Math.random();
            for (let i = 0; i < n; i++) blip(e, t + i * (0.09 + Math.random() * 0.05), f + (Math.random() - 0.5) * 500, 0.07 + Math.random() * 0.05, { vol: 0.028, to: kind < 0.5 ? f * 1.4 : f * 0.7 });
        }, 700, 3200);
    },
    // 🦗 crickets at night: pulse trains
    crickets(e) {
        e.every(t => { const f = 4300 + Math.random() * 600; for (let i = 0; i < 4; i++) blip(e, t + i * 0.055, f, 0.03, { vol: 0.012, type: "triangle" }); }, 420, 1300);
    },
    // 🚗 traffic: a low rumble, cars passing by, a horn once in a while
    cars(e) {
        const s = e.src(e.brown), lp = e.filt("lowpass", 320), g = e.gain(0.09); s.connect(lp).connect(g).connect(e.out);
        e.every(t => swell(e, t, e.brown, { f0: 180, f1: 1100 + Math.random() * 600, vol: 0.22, up: 1.1 + Math.random(), down: 1.3 + Math.random() }), 2200, 6500);
        e.every(t => { if (Math.random() < 0.35) { const lp2 = e.a.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 1500; [415, 520].forEach(f => blip(e, t, f, 0.35, { type: "square", vol: 0.018, filter: lp2 })); lp2.connect(e.out); } }, 7000, 15000);
    },
    // 🚕 inside a car: the engine hum + the road
    engine(e) {
        const o = e.osc("sawtooth", 46), lp = e.filt("lowpass", 180), g = e.gain(0.07); lfo(e, o.frequency, 0.3, 3); o.connect(lp).connect(g).connect(e.out);
        const s = e.src(e.brown), lp2 = e.filt("lowpass", 520), g2 = e.gain(0.08); s.connect(lp2).connect(g2).connect(e.out);
    },
    // 📣 a loud, restless audience: murmur bands that keep moving + cheers and whistles
    crowd(e) {
        for (const [f, v] of [[420, 0.07], [780, 0.06], [1250, 0.05], [2300, 0.025]]) {
            const s = e.src(), bp = e.filt("bandpass", f, 2.2), g = e.gain(v); s.connect(bp).connect(g).connect(e.out);
            e.every(t => g.gain.setTargetAtTime(v * (0.5 + Math.random()), t, 0.12), 140, 380);
        }
        e.every(t => swell(e, t, e.white, { type: "bandpass", f0: 700, f1: 1800, vol: 0.12, up: 0.5, down: 1.6, q: 0.7 }), 3500, 9000);   // a cheer
        e.every(t => { if (Math.random() < 0.5) blip(e, t, 1900, 0.5, { type: "sine", vol: 0.02, to: 2600 }); }, 4000, 11000);       // a whistle
    },
    // 🗣️ people talking around (quieter than an audience)
    chatter(e) {
        for (const [f, v] of [[480, 0.035], [900, 0.03], [1500, 0.018]]) {
            const s = e.src(), bp = e.filt("bandpass", f, 3), g = e.gain(v); s.connect(bp).connect(g).connect(e.out);
            e.every(t => g.gain.setTargetAtTime(v * (0.3 + Math.random() * 1.1), t, 0.08), 120, 320);
        }
    },
    // 🏠 a quiet room: air + the hum of the lights
    room(e) {
        const s = e.src(e.brown), lp = e.filt("lowpass", 240), g = e.gain(0.035); s.connect(lp).connect(g).connect(e.out);
        const o = e.osc("sine", 60), g2 = e.gain(0.006); o.connect(g2).connect(e.out);
    },
    // 🌊 waves rolling in
    waves(e) {
        const s = e.src(), lp = e.filt("lowpass", 700), g = e.gain(0.05); lfo(e, g.gain, 0.09, 0.05); lfo(e, lp.frequency, 0.09, 350);
        s.connect(lp).connect(g).connect(e.out);
    },
    // 🚿 running water
    water(e) { const s = e.src(), bp = e.filt("bandpass", 3200, 0.6), g = e.gain(0.07); lfo(e, bp.frequency, 0.4, 500); s.connect(bp).connect(g).connect(e.out); },
    // 🛸 a deep space hum
    drone(e) { for (const [f, d] of [[55, 0], [82.6, 4]]) { const o = e.osc("sine", f), g = e.gain(0.03); o.detune.value = d; lfo(e, g.gain, 0.05, 0.015); o.connect(g).connect(e.out); } },
    // 💓 a slow heartbeat
    heartbeat(e) { e.every(t => { blip(e, t, 60, 0.14, { vol: 0.18, to: 45 }); blip(e, t + 0.2, 55, 0.16, { vol: 0.14, to: 40 }); }, 900, 950); }
};
