// Tiny WebAudio synth — no sound files needed.
let ctx = null, muted = false;
try { muted = localStorage.getItem("gamblers.muted") === "1"; } catch { }
function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; }

function tone(freq, dur = 0.1, type = "square", vol = 0.06, when = 0, slide = 0) {
    if (muted) return;
    try {
        const a = ac(), t = a.currentTime + when;
        const o = a.createOscillator(), g = a.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch { }
}
function noise(dur = 0.2, vol = 0.08, when = 0) {
    if (muted) return;
    try {
        const a = ac(), t = a.currentTime + when;
        const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; g.gain.value = vol;
        s.connect(g).connect(a.destination); s.start(t);
    } catch { }
}

// ---------------------------------------------------------------- BGM loops
// Step sequencer (16th notes) scheduled slightly ahead of the audio clock.
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
let bgm = null; // { timer, gain, step, next, song }
function bgmVoice(a, out, t, { freq, type = "sawtooth", dur = 0.2, vol = 0.1, cut = 1800, cutEnd = 400, detune = 0, attack = 0.01 }) {
    const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    f.type = "lowpass"; f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, cutEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.03);
}
function bgmNoise(a, out, t, { dur = 0.05, vol = 0.1, hp = 6000 }) {
    const b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = "highpass"; f.frequency.value = hp; g.gain.value = vol;
    s.connect(f).connect(g).connect(out); s.start(t);
}
function kick(a, out, t, vol = 0.5) {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.25);
}
const SONGS = {
    // Monkey Drop: brass-funk groove, E minor, 118 BPM, 2-bar loop + coin sparkles
    monkey_funk: {
        bpm: 118, steps: 32,
        play(a, out, s, t, len) {
            const bar = s >> 4;
            if ([0, 7, 10, 16, 23, 26, 29].includes(s)) kick(a, out, t, 0.45);
            if (s % 8 === 4) { bgmNoise(a, out, t, { dur: 0.16, vol: 0.22, hp: 1500 }); bgmVoice(a, out, t, { freq: 190, type: "triangle", dur: 0.08, vol: 0.12, cut: 900, cutEnd: 300 }); }
            if (s === 15 || s === 30) bgmNoise(a, out, t, { dur: 0.06, vol: 0.06, hp: 1800 }); // ghost snare
            bgmNoise(a, out, t, { dur: s % 2 ? 0.03 : 0.05, vol: s % 4 === 2 ? 0.07 : 0.035, hp: 7000 }); // hats
            const BASS = { 0: 40, 3: 40, 6: 52, 7: 50, 8: 40, 10: 43, 11: 45, 14: 47, 16: 40, 19: 40, 22: 52, 23: 50, 24: 47, 26: 45, 27: 43, 30: 38 };
            if (BASS[s] != null) bgmVoice(a, out, t, { freq: midi(BASS[s]), dur: len * 1.6, vol: 0.2, cut: 1100, cutEnd: 180 });
            // brass stabs: Em9 on bar 1 off-beats, A9 push on bar 2
            const STAB = { 2: [64, 67, 71, 74, 78], 6: [64, 67, 71, 74, 78], 13: [64, 67, 71, 74], 18: [69, 73, 76, 79, 83], 22: [69, 73, 76, 79], 24: [71, 74, 78, 81], 25: [71, 74, 78, 81] };
            if (STAB[s]) for (const n of STAB[s]) for (const dt of [-9, 9]) bgmVoice(a, out, t, { freq: midi(n - 12), dur: s === 25 ? len * 3 : len * 1.4, vol: 0.022, cut: 3200, cutEnd: 700, detune: dt, attack: 0.02 });
            // horn riff answer at the end of bar 2
            const RIFF = { 28: 74, 29: 76, 30: 79, 31: 78 };
            if (RIFF[s]) bgmVoice(a, out, t, { freq: midi(RIFF[s] - 12), type: "square", dur: len * 0.9, vol: 0.03, cut: 2600, cutEnd: 900 });
            // coin sparkles
            if (s === 31 || (bar === 0 && s === 11)) { bgmVoice(a, out, t, { freq: 1318, type: "square", dur: 0.06, vol: 0.03, cut: 9000, cutEnd: 6000 }); bgmVoice(a, out, t + 0.05, { freq: 1760, type: "square", dur: 0.12, vol: 0.03, cut: 9000, cutEnd: 6000 }); }
        }
    },
    // 5 Cats: fast samurai loop — shamisen plucks (D miyako-bushi scale) over taiko drums, 132 BPM
    samurai_taiko: {
        bpm: 132, steps: 32,
        play(a, out, s, t, len) {
            // taiko: deep hits + rim clicks
            if ([0, 6, 8, 16, 22, 24, 27, 30].includes(s)) taiko(a, out, t, s % 16 === 0 ? 0.55 : 0.38);
            if (s % 4 === 2) bgmNoise(a, out, t, { dur: 0.03, vol: 0.09, hp: 3500 });
            if (s === 12 || s === 28) { bgmNoise(a, out, t, { dur: 0.18, vol: 0.12, hp: 900 }); } // shime-daiko roll
            if (s === 13 || s === 29) bgmNoise(a, out, t, { dur: 0.08, vol: 0.08, hp: 1400 });
            // shamisen: bright, fast-decaying plucks
            const SHAM = { 0: 62, 2: 63, 3: 62, 4: 67, 6: 69, 7: 70, 8: 69, 10: 67, 12: 63, 14: 62, 16: 74, 18: 70, 19: 69, 20: 67, 22: 69, 23: 70, 24: 69, 26: 63, 28: 62, 30: 63, 31: 67 };
            if (SHAM[s] != null) {
                bgmVoice(a, out, t, { freq: midi(SHAM[s]), type: "sawtooth", dur: len * 1.3, vol: 0.06, cut: 5200, cutEnd: 700, attack: 0.002 });
                bgmVoice(a, out, t, { freq: midi(SHAM[s] + 12), type: "triangle", dur: len * 0.6, vol: 0.02, cut: 7000, cutEnd: 2000, attack: 0.002 });
            }
            // drone
            if (s === 0 || s === 16) bgmVoice(a, out, t, { freq: midi(38), type: "triangle", dur: len * 14, vol: 0.08, cut: 600, cutEnd: 200, attack: 0.05 });
            if (s === 8 || s === 24) bgmVoice(a, out, t, { freq: midi(45), type: "triangle", dur: len * 6, vol: 0.05, cut: 600, cutEnd: 200, attack: 0.05 });
            // "yo-oh!" style shout stab on the turnaround
            if (s === 31) bgmVoice(a, out, t, { freq: midi(74), type: "square", dur: len * 1.5, vol: 0.02, cut: 2000, cutEnd: 800 });
        }
    },
    // Froggie / Crack or Not / Niagara / Lucky Boxes: up-tempo casino lounge jazz, 120 BPM
    // (Gm7 – C7 – Fmaj7 – D7, swing ride, walking bass, rhodes comping, vibes)
    lounge_jazz: {
        bpm: 120, steps: 32,
        play(a, out, s, t, len) {
            const sw = s % 4 === 3 ? len * 0.33 : 0; // swing the off-beat
            if (s % 8 === 0 || s % 8 === 4 || s % 8 === 7) bgmNoise(a, out, t + sw, { dur: s % 8 === 7 ? 0.05 : 0.12, vol: 0.05, hp: 8000 }); // ride
            if (s % 8 === 4) bgmNoise(a, out, t, { dur: 0.09, vol: 0.05, hp: 2500 }); // brush on 2 & 4
            if (s === 0 || s === 18) kick(a, out, t, 0.22);
            // walking bass (quarter notes)
            const BASS = [43, 46, 48, 40, 41, 45, 38, 42];
            if (s % 4 === 0) bgmVoice(a, out, t, { freq: midi(BASS[s / 4]), type: "triangle", dur: len * 3.6, vol: 0.2, cut: 900, cutEnd: 250, attack: 0.008 });
            // rhodes comping
            const CH = [[55, 58, 62, 65], [52, 58, 60, 64], [53, 57, 60, 64], [54, 57, 60, 62]];
            const ci = s >> 3;
            if (s % 8 === 0 || s % 8 === 3 || (s % 8 === 6 && ci % 2)) for (const n of CH[ci]) bgmVoice(a, out, t + sw, { freq: midi(n), type: "sine", dur: s % 8 === 0 ? len * 3 : len * 1.4, vol: 0.035, cut: 3000, cutEnd: 1200, detune: 6, attack: 0.01 });
            // vibraphone lick
            const VIB = { 2: 74, 3: 77, 10: 76, 11: 72, 19: 72, 20: 69, 26: 74, 27: 72, 28: 69, 30: 66 };
            if (VIB[s]) bgmVoice(a, out, t + sw, { freq: midi(VIB[s]), type: "sine", dur: len * 2.5, vol: 0.04, cut: 6000, cutEnd: 3000, attack: 0.004 });
        }
    },
    // Cat and Mouse: synthwave arpeggios + 808 bass, 118 BPM (Am – F – C – G)
    synthwave: {
        bpm: 118, steps: 64,
        play(a, out, s, t, len) {
            const bar = s >> 4, st = s % 16;
            if (st % 4 === 0) kick(a, out, t, 0.42);
            if (st === 4 || st === 12) { bgmNoise(a, out, t, { dur: 0.2, vol: 0.2, hp: 1200 }); bgmVoice(a, out, t, { freq: 200, type: "triangle", dur: 0.1, vol: 0.1, cut: 1000, cutEnd: 300 }); }
            if (st % 2 === 0) bgmNoise(a, out, t, { dur: 0.03, vol: st % 4 === 2 ? 0.06 : 0.03, hp: 9000 });
            // 808 bass with a pitch drop
            const ROOT = [33, 29, 36, 31][bar];
            if ([0, 3, 8, 11, 14].includes(st)) eight08(a, out, t, midi(ROOT), st === 0 ? len * 3 : len * 1.8);
            // arpeggio
            const CH = [[57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]][bar];
            const ARP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 3, 2, 1, 2, 3, 2];
            bgmVoice(a, out, t, { freq: midi(CH[ARP[st]] + 12), type: "sawtooth", dur: len * 0.9, vol: 0.026, cut: 3200, cutEnd: 900, detune: st % 2 ? 7 : -7, attack: 0.004 });
            // pad
            if (st === 0) for (const n of CH) for (const dt of [-10, 10]) bgmVoice(a, out, t, { freq: midi(n), type: "sawtooth", dur: len * 15, vol: 0.01, cut: 1400, cutEnd: 700, detune: dt, attack: 0.25 });
            // neon lead hook on the last bar
            const LEAD = { 48: 74, 50: 72, 52: 71, 54: 67, 56: 69, 60: 71, 62: 72 };
            if (LEAD[s]) bgmVoice(a, out, t, { freq: midi(LEAD[s]), type: "square", dur: len * 1.8, vol: 0.025, cut: 4000, cutEnd: 1500, attack: 0.01 });
        }
    },
    // Monster Kitchen: shamisen + taiko street-stall jam, 132 BPM (A minor pentatonic, sizzling hats)
    kitchen_taiko: {
        bpm: 132, steps: 32,
        play(a, out, s, t, len) {
            if ([0, 3, 6, 8, 16, 19, 22, 24, 28].includes(s)) taiko(a, out, t, s % 8 === 0 ? 0.55 : 0.36);
            if (s % 2 === 1) bgmNoise(a, out, t, { dur: 0.04, vol: 0.05, hp: 6500 }); // grill sizzle
            if (s === 14 || s === 30) bgmNoise(a, out, t, { dur: 0.2, vol: 0.12, hp: 1000 });
            const SHAM = { 0: 69, 1: 72, 2: 74, 4: 76, 5: 74, 6: 72, 8: 69, 10: 67, 12: 69, 16: 81, 17: 79, 18: 76, 20: 74, 22: 76, 24: 72, 26: 74, 28: 69, 30: 67, 31: 69 };
            if (SHAM[s] != null) {
                bgmVoice(a, out, t, { freq: midi(SHAM[s] - 12), type: "sawtooth", dur: len * 1.2, vol: 0.06, cut: 5000, cutEnd: 600, attack: 0.002 });
                bgmVoice(a, out, t, { freq: midi(SHAM[s]), type: "triangle", dur: len * 0.5, vol: 0.02, cut: 7000, cutEnd: 2000, attack: 0.002 });
            }
            if (s % 8 === 0) bgmVoice(a, out, t, { freq: midi([45, 45, 43, 40][s >> 3]), type: "triangle", dur: len * 6, vol: 0.12, cut: 700, cutEnd: 200, attack: 0.01 });
            if (s === 15 || s === 31) bgmVoice(a, out, t, { freq: midi(76), type: "square", dur: len * 1.2, vol: 0.02, cut: 2400, cutEnd: 800 }); // "hai!"
        }
    },
    // Sol & Umbra: orchestral brass fanfare + Chinese percussion (gong, woodblock), 104 BPM (D minor – B♭ – C – A)
    celestial_brass: {
        bpm: 104, steps: 64,
        play(a, out, s, t, len) {
            const bar = s >> 4, st = s % 16;
            if (s === 0) { bgmNoise(a, out, t, { dur: 1.6, vol: 0.12, hp: 300 }); bgmVoice(a, out, t, { freq: 98, type: "sine", dur: 1.8, vol: 0.12, cut: 900, cutEnd: 200 }); } // gong
            if (st === 0 || st === 10) taiko(a, out, t, 0.45);
            if (st % 4 === 2) bgmVoice(a, out, t, { freq: 1200, type: "square", dur: 0.03, vol: 0.04, cut: 4000, cutEnd: 2000, attack: 0.001 }); // woodblock
            if (st === 6 || st === 14) bgmNoise(a, out, t, { dur: 0.12, vol: 0.06, hp: 4000 }); // cymbal
            const CH = [[50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60], [45, 49, 52, 57]][bar];
            if (st === 0 || st === 8) for (const n of CH) for (const dt of [-6, 6]) bgmVoice(a, out, t, { freq: midi(n), type: "sawtooth", dur: len * 7, vol: 0.016, cut: 1800, cutEnd: 600, detune: dt, attack: 0.06 }); // brass pads
            if (st % 4 === 0) bgmVoice(a, out, t, { freq: midi(CH[0] - 12), type: "triangle", dur: len * 3.5, vol: 0.16, cut: 800, cutEnd: 200 });
            const FAN = { 0: 74, 3: 74, 4: 77, 6: 81, 8: 79, 12: 77, 16: 74, 20: 72, 24: 70, 28: 69, 32: 72, 35: 72, 36: 76, 38: 79, 40: 81, 44: 79, 48: 77, 52: 76, 56: 73, 60: 69 };
            if (FAN[s]) for (const dt of [-8, 8]) bgmVoice(a, out, t, { freq: midi(FAN[s]), type: "sawtooth", dur: len * 3, vol: 0.022, cut: 3000, cutEnd: 1200, detune: dt, attack: 0.03 });
        }
    },
    // 4 Pillars: tropical steel drum + ukulele strums + ocean waves, 100 BPM (C – Am – F – G)
    tropical_steel: {
        bpm: 100, steps: 64,
        play(a, out, s, t, len) {
            const bar = s >> 4, st = s % 16;
            if (st === 0 || st === 10) kick(a, out, t, 0.3);
            if (st % 4 === 2) bgmNoise(a, out, t, { dur: 0.05, vol: 0.06, hp: 5000 }); // shaker
            if (s === 0 || s === 32) bgmNoise(a, out, t, { dur: 2.2, vol: 0.05, hp: 400 }); // waves
            const CH = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]][bar];
            if ([0, 3, 6, 8, 11, 14].includes(st)) CH.forEach((n, i) => bgmVoice(a, out, t + i * 0.012, { freq: midi(n), type: "triangle", dur: len * 1.5, vol: 0.03, cut: 4000, cutEnd: 1500, attack: 0.002 })); // ukulele strum
            if (st % 8 === 0) bgmVoice(a, out, t, { freq: midi(CH[0] - 24), type: "sine", dur: len * 6, vol: 0.18, cut: 600, cutEnd: 200 });
            const PAN = { 0: 76, 2: 79, 4: 84, 6: 79, 8: 81, 10: 79, 12: 76, 14: 74, 18: 72, 20: 76, 22: 81, 24: 79, 28: 76, 34: 77, 36: 81, 38: 84, 40: 81, 44: 77, 48: 79, 50: 83, 52: 86, 54: 83, 56: 79, 60: 74 };
            if (PAN[s]) { bgmVoice(a, out, t, { freq: midi(PAN[s]), type: "sine", dur: len * 2.4, vol: 0.06, cut: 8000, cutEnd: 3000, attack: 0.002 }); bgmVoice(a, out, t, { freq: midi(PAN[s]) * 2.76, type: "sine", dur: len * 0.8, vol: 0.012, cut: 9000, cutEnd: 4000, attack: 0.002 }); }
        }
    },
    // Chrono-Heist: 70s big-band swing with walking bass, brass hits and bells, 130 BPM (Fm – B♭m – C7 – Fm)
    bigband_swing: {
        bpm: 130, steps: 64,
        play(a, out, s, t, len) {
            const bar = s >> 4, st = s % 16;
            const sw = st % 4 === 2 ? len * 0.35 : 0;
            if (st % 4 === 0 || st % 4 === 2) bgmNoise(a, out, t + sw, { dur: st % 4 ? 0.05 : 0.14, vol: 0.05, hp: 8000 }); // ride
            if (st === 4 || st === 12) bgmNoise(a, out, t, { dur: 0.1, vol: 0.09, hp: 2000 });
            if (st === 0 || st === 14) kick(a, out, t, 0.3);
            const WALK = [[41, 44, 48, 46], [46, 49, 53, 51], [48, 52, 55, 46], [41, 43, 44, 40]][bar];
            if (st % 4 === 0) bgmVoice(a, out, t, { freq: midi(WALK[st / 4] - 12), type: "triangle", dur: len * 3.4, vol: 0.2, cut: 900, cutEnd: 250 });
            const CH = [[65, 68, 72, 75], [65, 70, 73, 77], [64, 67, 70, 72], [65, 68, 72, 75]][bar];
            if (st === 3 || st === 10) for (const n of CH) for (const dt of [-8, 8]) bgmVoice(a, out, t + sw, { freq: midi(n - 12), type: "sawtooth", dur: len * 1.3, vol: 0.02, cut: 3400, cutEnd: 900, detune: dt, attack: 0.01 }); // brass hits
            if (bar === 3 && st === 12) for (const n of [77, 80, 84]) bgmVoice(a, out, t, { freq: midi(n), type: "square", dur: len * 4, vol: 0.02, cut: 4000, cutEnd: 1200, attack: 0.02 });
            if (st === 15) bgmVoice(a, out, t, { freq: midi(96), type: "sine", dur: 0.5, vol: 0.04, cut: 9000, cutEnd: 6000 }); // bell
        }
    }
};
function taiko(a, out, t, vol = 0.5) {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.5);
    bgmNoise(a, out, t, { dur: 0.05, vol: vol * 0.3, hp: 600 });
}
function eight08(a, out, t, freq, dur) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(freq * 2, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.03);
}
function bgmStop() {
    if (!bgm) return;
    clearInterval(bgm.timer);
    try { bgm.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08); const g = bgm.gain; setTimeout(() => g.disconnect(), 600); } catch { }
    bgm = null;
}
function bgmStart(name) {
    bgmStop();
    const song = SONGS[name];
    if (!song) return;
    try {
        const a = ac(), gain = a.createGain();
        gain.gain.value = muted ? 0 : 0.5; gain.connect(a.destination);
        const len = 60 / song.bpm / 4;
        const b = bgm = { gain, step: 0, next: a.currentTime + 0.1, song, name };
        b.timer = setInterval(() => {
            if (bgm !== b) return;
            if (b.next < a.currentTime) b.next = a.currentTime + 0.05; // tab was throttled: skip, don't burst
            while (b.next < a.currentTime + 0.25) {
                if (!muted) song.play(a, gain, b.step, b.next, len);
                b.step = (b.step + 1) % song.steps; b.next += len;
            }
        }, 60);
    } catch { }
}

export const Sound = {
    get muted() { return muted; },
    toggle() {
        muted = !muted; try { localStorage.setItem("gamblers.muted", muted ? "1" : "0"); } catch { }
        if (bgm) try { bgm.gain.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.05); } catch { }
        return muted;
    },
    bgm: bgmStart, bgmStop,
    get bgmPlaying() { return bgm?.name || null; },
    tick() { tone(880 + Math.random() * 200, 0.03, "square", 0.025); },
    click() { tone(520, 0.05, "triangle", 0.05); },
    stop() { tone(180, 0.08, "square", 0.06); noise(0.05, 0.03); },
    heartbeat() { tone(70, 0.12, "sine", 0.25); tone(60, 0.14, "sine", 0.22, 0.18); },
    tease() { tone(300, 0.6, "sawtooth", 0.035, 0, 500); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "triangle", 0.07, i * 0.07)); },
    bigWin() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.2, "square", 0.06, i * 0.09)); },
    jackpot() { for (let i = 0; i < 12; i++) tone([784, 988, 1175, 1568][i % 4], 0.15, "square", 0.06, i * 0.08); },
    coin() { tone(1300, 0.05, "square", 0.04); tone(1750, 0.08, "square", 0.04, 0.05); },
    lose() { tone(300, 0.2, "sawtooth", 0.04, 0, -150); },
    bonus() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, "square", 0.06, i * 0.1)); },
    hit() { noise(0.15, 0.15); tone(120, 0.15, "square", 0.08, 0, -60); },
    miss() { tone(600, 0.25, "sine", 0.05, 0, -400); },
    boom() { noise(0.6, 0.25); tone(60, 0.5, "sine", 0.2, 0, -30); },
    fanfare() { [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "square", 0.06, i * 0.15)); },
    whoosh() { noise(0.25, 0.06); },
    // 뿌직뿌직: wet low burst + falling squelch
    poop() { noise(0.18, 0.14); tone(140 + Math.random() * 40, 0.16, "sawtooth", 0.07, 0, -90); tone(90, 0.12, "square", 0.05, 0.12, -40); noise(0.1, 0.1, 0.14); },
    splash() { noise(0.5, 0.12); tone(220, 0.35, "sine", 0.05, 0, -160); },
    buzz() { tone(190 + Math.random() * 30, 0.5, "sawtooth", 0.012, 0, 25); },
    cash() { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.09, "square", 0.05, i * 0.06)); }
};
