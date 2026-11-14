// =====================================================================
// Per-game audio: every slot machine and every casino game gets its OWN
// background loop and its OWN sound-effect palette, themed to the game.
//
// A game's theme (horror, space, ocean, …) is read from its id / name /
// icon. The theme picks a musical style (genre, meter, scale, drums, bass,
// comping, lead instruments); a seeded RNG from the game id then picks the
// key, tempo, chord progression, instruments and writes an 8-bar melody.
// The SFX palette is built from the same song (its key, scale, lead
// timbre and the opening notes of its melody), so effects match the music.
// 15 hand-written loops in sound.js are each kept for exactly one slot.
// No two games share a loop or a palette (see auditAudio()).
// =====================================================================
import { midi, bgmVoice, bgmNoise, kick, taiko, eight08, tone, noise } from "./sound.js";

// ---------------------------------------------------------------- rng
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngOf(seed) { let a = hash(seed) || 1; return () => { a ^= a << 13; a >>>= 0; a ^= a >> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; }
const pickR = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, lo, hi) => Math.round(lo + r() * (hi - lo));

// ---------------------------------------------------------------- music theory
const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], harm: [0, 2, 3, 5, 7, 8, 11],
    phryg: [0, 1, 3, 5, 7, 8, 10], mixo: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], penta: [0, 2, 4, 7, 9],
    mpenta: [0, 3, 5, 7, 10], blues: [0, 3, 5, 6, 7, 10], insen: [0, 1, 5, 7, 10], hira: [0, 2, 3, 7, 8], whole: [0, 2, 4, 6, 8, 10],
    hungar: [0, 2, 3, 6, 7, 8, 11]
};
const PROGS7 = [[0, 5, 3, 4], [0, 3, 4, 0], [0, 4, 5, 3], [0, 3, 0, 4], [0, 6, 5, 4], [0, 1, 4, 0], [0, 5, 1, 4], [0, 2, 3, 4], [0, 3, 6, 4], [5, 3, 0, 4]];
const PROGS5 = [[0, 3, 0, 4], [0, 2, 3, 0], [0, 4, 3, 2], [0, 1, 3, 4], [0, 3, 1, 0]];
const deg2semi = (sc, d) => { const n = sc.length, o = Math.floor(d / n); return sc[((d % n) + n) % n] + 12 * o; };

// ---------------------------------------------------------------- instruments
// play(a, out, t, note, dur, vol)
const INST = {
    pluck: (a, o, t, n, d, v) => bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: Math.min(d, 0.5), vol: v, cut: 5000, cutEnd: 700, attack: 0.002 }),
    guitar: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "triangle", dur: Math.min(d * 1.2, 0.7), vol: v, cut: 3200, cutEnd: 600, attack: 0.003 }); bgmVoice(a, o, t, { freq: midi(n + 12), type: "sawtooth", dur: 0.12, vol: v * 0.25, cut: 4000, cutEnd: 900, attack: 0.002 }); },
    bell: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "sine", dur: Math.max(d, 0.5), vol: v, cut: 9000, cutEnd: 5000, attack: 0.002 }); bgmVoice(a, o, t, { freq: midi(n) * 2.76, type: "sine", dur: 0.25, vol: v * 0.3, cut: 9000, cutEnd: 6000, attack: 0.002 }); },
    musicbox: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n + 12), type: "sine", dur: 0.6, vol: v, cut: 9000, cutEnd: 7000, attack: 0.001 }); bgmVoice(a, o, t, { freq: midi(n + 24), type: "triangle", dur: 0.15, vol: v * 0.25, cut: 9000, cutEnd: 7000, attack: 0.001 }); },
    glock: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n + 12), type: "triangle", dur: 0.45, vol: v, cut: 9000, cutEnd: 6000, attack: 0.001 }); bgmVoice(a, o, t, { freq: midi(n + 12) * 3.9, type: "sine", dur: 0.1, vol: v * 0.3, cut: 9000, cutEnd: 8000, attack: 0.001 }); },
    organ: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "square", dur: d, vol: v * 0.7, cut: 2400, cutEnd: 1500, attack: 0.02 }); bgmVoice(a, o, t, { freq: midi(n + 12), type: "sine", dur: d, vol: v * 0.6, cut: 4000, cutEnd: 2000, attack: 0.02 }); },
    calliope: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "sine", dur: d, vol: v, cut: 6000, cutEnd: 3000, detune: 12, attack: 0.015 }); bgmVoice(a, o, t, { freq: midi(n + 12), type: "square", dur: d, vol: v * 0.35, cut: 3000, cutEnd: 2000, detune: -10, attack: 0.015 }); },
    brass: (a, o, t, n, d, v) => { for (const dt of [-8, 8]) bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: d, vol: v * 0.6, cut: 2600, cutEnd: 900, detune: dt, attack: 0.03 }); },
    horn: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: d, vol: v * 0.8, cut: 1400, cutEnd: 700, attack: 0.05 }); bgmVoice(a, o, t, { freq: midi(n - 12), type: "triangle", dur: d, vol: v * 0.4, cut: 900, cutEnd: 500, attack: 0.05 }); },
    flute: (a, o, t, n, d, v) => { for (const dt of [-6, 6]) bgmVoice(a, o, t, { freq: midi(n), type: "sine", dur: d, vol: v * 0.7, cut: 7000, cutEnd: 4000, detune: dt, attack: 0.05 }); bgmNoise(a, o, t, { dur: 0.05, vol: v * 0.3, hp: 5000 }); },
    whistle: (a, o, t, n, d, v) => bgmVoice(a, o, t, { freq: midi(n + 12), type: "sine", dur: d, vol: v, cut: 8000, cutEnd: 5000, detune: 9, attack: 0.03 }),
    square: (a, o, t, n, d, v) => bgmVoice(a, o, t, { freq: midi(n), type: "square", dur: d * 0.9, vol: v * 0.8, cut: 7000, cutEnd: 3500, attack: 0.002 }),
    pulse: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "square", dur: d * 0.6, vol: v * 0.6, cut: 4500, cutEnd: 1200, attack: 0.002 }); bgmVoice(a, o, t, { freq: midi(n + 7), type: "square", dur: d * 0.3, vol: v * 0.25, cut: 4500, cutEnd: 1200, attack: 0.002 }); },
    synth: (a, o, t, n, d, v) => { for (const dt of [-11, 11]) bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: d, vol: v * 0.55, cut: 4200, cutEnd: 1300, detune: dt, attack: 0.01 }); },
    pad: (a, o, t, n, d, v) => { for (const dt of [-14, 14]) bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: d, vol: v * 0.5, cut: 1300, cutEnd: 700, detune: dt, attack: Math.min(0.25, d * 0.3) }); },
    choir: (a, o, t, n, d, v) => { for (const dt of [-9, 0, 9]) bgmVoice(a, o, t, { freq: midi(n), type: "triangle", dur: d, vol: v * 0.45, cut: 2200, cutEnd: 1400, detune: dt, attack: Math.min(0.3, d * 0.35) }); },
    marimba: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "sine", dur: 0.3, vol: v, cut: 6000, cutEnd: 2000, attack: 0.001 }); bgmVoice(a, o, t, { freq: midi(n) * 4, type: "sine", dur: 0.05, vol: v * 0.25, cut: 9000, cutEnd: 6000, attack: 0.001 }); },
    steel: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "triangle", dur: 0.5, vol: v, cut: 5000, cutEnd: 1800, attack: 0.003 }); bgmVoice(a, o, t, { freq: midi(n) * 2.01, type: "sine", dur: 0.3, vol: v * 0.45, cut: 7000, cutEnd: 3000, attack: 0.003 }); },
    violin: (a, o, t, n, d, v) => { for (const dt of [-7, 7]) bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: d, vol: v * 0.5, cut: 3000, cutEnd: 1600, detune: dt, attack: 0.06 }); },
    erhu: (a, o, t, n, d, v) => { for (const dt of [-12, 4]) bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: d, vol: v * 0.5, cut: 2400, cutEnd: 1500, detune: dt, attack: 0.08 }); },
    koto: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: 0.6, vol: v, cut: 4200, cutEnd: 500, attack: 0.001 }); bgmVoice(a, o, t + 0.02, { freq: midi(n), type: "triangle", dur: 0.3, vol: v * 0.4, cut: 3000, cutEnd: 800, detune: 20, attack: 0.001 }); },
    harpsi: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "square", dur: 0.35, vol: v * 0.7, cut: 6500, cutEnd: 1400, attack: 0.001 }); bgmVoice(a, o, t, { freq: midi(n + 12), type: "sawtooth", dur: 0.15, vol: v * 0.2, cut: 7000, cutEnd: 2000, attack: 0.001 }); },
    harp: (a, o, t, n, d, v) => bgmVoice(a, o, t, { freq: midi(n), type: "triangle", dur: 0.9, vol: v, cut: 5000, cutEnd: 1500, attack: 0.002 }),
    accordion: (a, o, t, n, d, v) => { for (const dt of [-6, 6]) bgmVoice(a, o, t, { freq: midi(n), type: dt < 0 ? "square" : "sawtooth", dur: d, vol: v * 0.45, cut: 2600, cutEnd: 1600, detune: dt, attack: 0.03 }); },
    harmonica: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "square", dur: d, vol: v * 0.6, cut: 1900, cutEnd: 1100, detune: 5, attack: 0.04 }); bgmVoice(a, o, t, { freq: midi(n + 12), type: "sawtooth", dur: d, vol: v * 0.15, cut: 2500, cutEnd: 1200, attack: 0.04 }); },
    rhodes: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "sine", dur: Math.max(d, 0.4), vol: v, cut: 3000, cutEnd: 900, attack: 0.004 }); bgmVoice(a, o, t, { freq: midi(n + 12), type: "triangle", dur: 0.2, vol: v * 0.3, cut: 4000, cutEnd: 1200, attack: 0.002 }); },
    piano: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "triangle", dur: Math.max(d, 0.5), vol: v, cut: 4000, cutEnd: 800, attack: 0.002 }); bgmVoice(a, o, t, { freq: midi(n + 12), type: "sine", dur: 0.3, vol: v * 0.3, cut: 6000, cutEnd: 2000, attack: 0.002 }); },
    kazoo: (a, o, t, n, d, v) => { for (const dt of [-15, 15]) bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: d, vol: v * 0.5, cut: 1500, cutEnd: 1100, detune: dt, attack: 0.02 }); },
    theremin: (a, o, t, n, d, v) => { const f = midi(n); for (const dt of [-25, 25]) bgmVoice(a, o, t, { freq: f, type: "sine", dur: d * 1.3, vol: v * 0.6, cut: 5000, cutEnd: 3000, detune: dt, attack: 0.12 }); },
    sitar: (a, o, t, n, d, v) => { bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: 0.7, vol: v, cut: 6000, cutEnd: 1200, detune: 15, attack: 0.001 }); bgmVoice(a, o, t, { freq: midi(n + 19), type: "sine", dur: 0.4, vol: v * 0.2, cut: 7000, cutEnd: 3000, attack: 0.001 }); },
    banjo: (a, o, t, n, d, v) => bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: 0.22, vol: v, cut: 6000, cutEnd: 900, attack: 0.001 }),
    tuba: (a, o, t, n, d, v) => bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: Math.min(d, 0.45), vol: v, cut: 700, cutEnd: 250, attack: 0.02 }),
    sub: (a, o, t, n, d, v) => bgmVoice(a, o, t, { freq: midi(n), type: "triangle", dur: d, vol: v, cut: 900, cutEnd: 200 }),
    synbass: (a, o, t, n, d, v) => bgmVoice(a, o, t, { freq: midi(n), type: "sawtooth", dur: Math.min(d, 0.4), vol: v, cut: 1400, cutEnd: 160 }),
    upright: (a, o, t, n, d, v) => bgmVoice(a, o, t, { freq: midi(n), type: "triangle", dur: Math.min(d, 0.5), vol: v, cut: 1100, cutEnd: 300, attack: 0.004 }),
    b808: (a, o, t, n, d) => eight08(a, o, t, midi(n), Math.min(d, 0.6))
};

// ---------------------------------------------------------------- drums
// (a, out, t, sb = step in bar, B = steps per beat, nb = beats per bar, bar, R = per-song flags)
const hat = (a, o, t, v = 0.04, d = 0.03) => bgmNoise(a, o, t, { dur: d, vol: v, hp: 7500 });
const snare = (a, o, t, v = 0.16) => bgmNoise(a, o, t, { dur: 0.14, vol: v, hp: 1500 });
const rim = (a, o, t, v = 0.08) => bgmVoice(a, o, t, { freq: 1700, type: "square", dur: 0.025, vol: v * 0.4, cut: 4000, cutEnd: 2000, attack: 0.001 });
const wood = (a, o, t, f = 1150, v = 0.06) => bgmVoice(a, o, t, { freq: f, type: "sine", dur: 0.06, vol: v, cut: 6000, cutEnd: 3000, attack: 0.001 });
const bongo = (a, o, t, f, v = 0.1) => { const g = a.createGain(), s = a.createOscillator(); s.frequency.setValueAtTime(f * 1.5, t); s.frequency.exponentialRampToValueAtTime(f, t + 0.04); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); s.connect(g).connect(o); s.start(t); s.stop(t + 0.2); };
const shaker = (a, o, t, v = 0.025) => bgmNoise(a, o, t, { dur: 0.05, vol: v, hp: 5500 });
const gong = (a, o, t, v = 0.05) => { bgmVoice(a, o, t, { freq: 98, type: "sine", dur: 2.2, vol: v * 2, cut: 3000, cutEnd: 400, attack: 0.005 }); bgmVoice(a, o, t, { freq: 98 * 2.41, type: "sine", dur: 1.6, vol: v, cut: 3000, cutEnd: 600, attack: 0.005 }); };
const chipKick = (a, o, t) => bgmVoice(a, o, t, { freq: 160, type: "square", dur: 0.07, vol: 0.12, cut: 900, cutEnd: 120, attack: 0.001 });

const DRUMS = {
    none() { },
    rock(a, o, t, sb, B, nb) { if (sb === 0 || sb === 2 * B || (sb === 2 * B + 2 && nb === 4)) kick(a, o, t, 0.4); if (sb % B === 0 && (sb / B) % 2 === 1) snare(a, o, t); if (sb % 2 === 0) hat(a, o, t, sb % B === 0 ? 0.05 : 0.03); },
    four(a, o, t, sb, B) { if (sb % B === 0) kick(a, o, t, 0.42); if (sb % B === 0 && (sb / B) % 2) bgmNoise(a, o, t, { dur: 0.1, vol: 0.13, hp: 2200 }); if (sb % B === B / 2) hat(a, o, t, 0.06, 0.09); else if (sb % 2 === 1) hat(a, o, t, 0.02); },
    swing(a, o, t, sb, B, nb) { const q = sb % B; if (q === 0) bgmNoise(a, o, t, { dur: 0.18, vol: 0.05, hp: 6500 }); if (q === 3 && (sb / B | 0) % 2) bgmNoise(a, o, t, { dur: 0.07, vol: 0.04, hp: 6500 }); if (q === 0 && (sb / B) % 2 === 1) hat(a, o, t, 0.05, 0.04); if (sb === 0) kick(a, o, t, 0.22); if (sb === (nb - 1) * B + 3) snare(a, o, t, 0.05); },
    bossa(a, o, t, sb, B, nb) { if ([0, 6, 8, 14].includes(sb)) kick(a, o, t, 0.25); if ([0, 3, 6, 10, 12].includes(sb)) rim(a, o, t, 0.2); shaker(a, o, t, sb % 2 ? 0.015 : 0.025); },
    latin(a, o, t, sb) { if ([0, 8].includes(sb)) kick(a, o, t, 0.3); if ([3, 11].includes(sb)) bongo(a, o, t, 320); if ([6, 7, 14].includes(sb)) bongo(a, o, t, 220); if (sb % 4 === 2) bgmVoice(a, o, t, { freq: 800, type: "square", dur: 0.05, vol: 0.02, cut: 3000, cutEnd: 2000, attack: 0.001 }); shaker(a, o, t, 0.018); },
    reggae(a, o, t, sb) { if (sb === 8) { kick(a, o, t, 0.4); rim(a, o, t, 0.25); } if (sb % 4 === 2) hat(a, o, t, 0.05, 0.06); if (sb === 15) hat(a, o, t, 0.03); },
    march(a, o, t, sb, B, nb) { if (sb % B === 0) kick(a, o, t, (sb / B) % 2 ? 0.25 : 0.4); if (sb % B === 0 && (sb / B) % 2) snare(a, o, t, 0.15); if (sb >= (nb - 1) * B) snare(a, o, t, 0.05); },
    waltz(a, o, t, sb, B) { if (sb === 0) kick(a, o, t, 0.32); else if (sb % B === 0) bgmNoise(a, o, t, { dur: 0.06, vol: 0.05, hp: 3500 }); },
    polka(a, o, t, sb, B) { if (sb % (2 * B) === 0) kick(a, o, t, 0.38); if (sb % (2 * B) === B) { snare(a, o, t, 0.12); bgmNoise(a, o, t, { dur: 0.1, vol: 0.04, hp: 6000 }); } },
    taiko(a, o, t, sb, B, nb) { if ([0, 6, 8, 11].includes(sb % 16) && sb < nb * B) taiko(a, o, t, sb === 0 ? 0.5 : 0.32); if (sb % 4 === 2) rim(a, o, t, 0.15); },
    chip(a, o, t, sb, B) { if (sb % (2 * B) === 0) chipKick(a, o, t); if (sb % (2 * B) === B) bgmNoise(a, o, t, { dur: 0.06, vol: 0.09, hp: 3000 }); if (sb % 2 === 0) bgmNoise(a, o, t, { dur: 0.015, vol: 0.03, hp: 9000 }); },
    jig(a, o, t, sb) { if (sb % 6 === 0) taiko(a, o, t, 0.3); if (sb % 6 === 3) bgmNoise(a, o, t, { dur: 0.05, vol: 0.06, hp: 1200 }); if (sb % 2 === 0) shaker(a, o, t, 0.015); },
    shuffle(a, o, t, sb, B) { if (sb % (2 * B) === 0) kick(a, o, t, 0.35); if (sb % (2 * B) === B) snare(a, o, t, 0.12); if (sb % B === 0 || sb % B === 3) hat(a, o, t, sb % B ? 0.025 : 0.045); },
    soft(a, o, t, sb, B) { if (sb === 0) kick(a, o, t, 0.18); if (sb % 2 === 0) shaker(a, o, t, sb % B ? 0.012 : 0.02); },
    tango(a, o, t, sb) { if ([0, 6, 8].includes(sb)) kick(a, o, t, 0.35); if ([12].includes(sb)) snare(a, o, t, 0.12); if ([14, 15].includes(sb)) snare(a, o, t, 0.05); },
    ska(a, o, t, sb, B) { if (sb % (2 * B) === 0) kick(a, o, t, 0.35); if (sb % (2 * B) === B) snare(a, o, t, 0.13); if (sb % B === B / 2) hat(a, o, t, 0.06, 0.08); },
    heart(a, o, t, sb) { if (sb === 0 || sb === 8) kick(a, o, t, 0.28); if (sb === 2 || sb === 10) kick(a, o, t, 0.18); },
    wood(a, o, t, sb, B) { if (sb === 0) kick(a, o, t, 0.2); if (sb % B === 0) wood(a, o, t, 1150, 0.05); if (sb % B === B / 2 + 1) wood(a, o, t, 1550, 0.03); },
    funk(a, o, t, sb) { if ([0, 7, 10].includes(sb)) kick(a, o, t, 0.4); if ([4, 12].includes(sb)) snare(a, o, t, 0.15); if (sb === 15) snare(a, o, t, 0.04); hat(a, o, t, sb % 2 ? 0.015 : 0.035); },
    epic(a, o, t, sb, B, nb, bar) { if ([0, 3, 8, 10, 11].includes(sb)) taiko(a, o, t, sb === 0 ? 0.5 : 0.28); if (sb === 0 && bar % 4 === 0) gong(a, o, t, 0.03); if (sb === 12) snare(a, o, t, 0.08); },
    trap(a, o, t, sb) { if ([0, 10].includes(sb)) kick(a, o, t, 0.4); if (sb === 8) bgmNoise(a, o, t, { dur: 0.12, vol: 0.14, hp: 2000 }); hat(a, o, t, 0.025, 0.02); if (sb >= 12 && sb % 1 === 0) hat(a, o, t + 0.03, 0.015, 0.015); },
    frame(a, o, t, sb, B) { if (sb === 0) taiko(a, o, t, 0.25); if (sb % B === B / 2) bgmNoise(a, o, t, { dur: 0.05, vol: 0.05, hp: 1300 }); if (sb % 2 === 1) shaker(a, o, t, 0.012); }
};

// ---------------------------------------------------------------- styles
// meter: 4 (4/4, 16 steps), 3 (3/4, 12 steps), 6 (6/8, 12 steps, beat = 6)
// bass: boom | rootfifth | walking | eighths | octave | offbeat | drone | tango | bossa | arp
// comp: stab | oompah | arp16 | arp8 | pad | strum | sweep | roll | block | none
// fx: extra ear candy (sparkle | wind | waves | bubbles | gong | sleigh | coins | creak | laser | birds | crowd | fart | clock)
const S = (o) => ({ meter: 4, density: 0.5, leadOct: 0, ...o });
const THEMES = {
    horror: {
        re: /ghost|haunt|grave|coffin|dracula|vampire|blood|crimson|ouija|death|nightmare|evil|devil|pumpkin|spooky|skull|manor|bone|cryptb|fate|tomb|curse|blackout|lights out|bad dream|terror|phantom|zombie|witch|breath|rest in|sleepless|reaper|bog|count's|☠|👻|🎃|🪦|⚰|😈|😱|🩸|🔮/,
        styles: [
            S({ name: "haunt waltz", meter: 3, bpm: [76, 96], scales: ["harm", "minor"], drums: ["waltz"], bass: ["drone", "boom"], comp: ["oompah"], compInst: ["organ", "harpsi"], lead: ["organ", "theremin", "violin"], bassInst: ["sub"], fx: ["creak", "wind"] }),
            S({ name: "music-box creep", bpm: [66, 84], scales: ["minor", "phryg", "harm"], drums: ["heart", "none"], bass: ["drone"], comp: ["arp8"], compInst: ["musicbox", "glock"], lead: ["theremin", "musicbox", "choir"], bassInst: ["sub"], density: 0.3, fx: ["wind"] }),
            S({ name: "vampire tango", bpm: [100, 116], scales: ["harm", "hungar"], drums: ["tango"], bass: ["tango"], comp: ["stab"], compInst: ["harpsi", "accordion"], lead: ["violin", "accordion", "harpsi"], bassInst: ["upright"], fx: ["creak"] }),
            S({ name: "graveyard swing", bpm: [118, 136], scales: ["blues", "minor"], drums: ["swing"], bass: ["walking"], comp: ["stab"], compInst: ["organ"], lead: ["theremin", "harmonica", "brass"], bassInst: ["upright"], fx: ["wind"] })
        ]
    },
    dung: {
        re: /bdungb|dung(?!eon)|poop|💩|toilet|stink/,
        styles: [
            S({ name: "tuba polka", bpm: [128, 148], scales: ["major", "mixo"], drums: ["polka"], bass: ["rootfifth"], comp: ["stab"], compInst: ["accordion"], lead: ["kazoo", "tuba", "accordion"], bassInst: ["tuba"], fx: ["fart"] }),
            S({ name: "swamp shuffle", bpm: [92, 108], scales: ["blues", "mpenta"], drums: ["shuffle"], bass: ["walking"], comp: ["stab"], compInst: ["harmonica", "piano"], lead: ["harmonica", "kazoo"], bassInst: ["tuba"], fx: ["fart"] })
        ]
    },
    ice: {
        re: /\bice|igloo|penguin|snow|glacier|frozen|frost|❄|⛄|🐧|polar|blue ice|crystal/,
        styles: [
            S({ name: "glockenspiel waltz", meter: 3, bpm: [100, 124], scales: ["major", "lydian"], drums: ["waltz"], bass: ["boom"], comp: ["oompah"], compInst: ["musicbox", "glock"], lead: ["bell", "glock", "flute"], bassInst: ["upright"], fx: ["sleigh", "sparkle"] }),
            S({ name: "sleigh polka", bpm: [120, 140], scales: ["major"], drums: ["polka"], bass: ["rootfifth"], comp: ["stab"], compInst: ["pluck"], lead: ["flute", "glock", "whistle"], bassInst: ["tuba", "upright"], fx: ["sleigh"] }),
            S({ name: "crystal cave", bpm: [88, 104], scales: ["lydian", "penta"], drums: ["soft"], bass: ["drone"], comp: ["arp16"], compInst: ["bell", "glock"], lead: ["flute", "choir"], bassInst: ["sub"], density: 0.35, fx: ["sparkle", "wind"] })
        ]
    },
    space: {
        re: /space|cosmic|\bstars?\b|star |rocket|orbit|galax|nebula|alien|launch|meteor|astro|zodiac|constellation|mission|planet|\bmoon|comet|shooting|wish|neon space|cadet|ufo|🚀|🪐|🌌|☄|🌠|♈|📡/,
        styles: [
            S({ name: "synth arps", bpm: [108, 126], scales: ["minor", "dorian"], drums: ["four", "rock"], bass: ["eighths"], comp: ["arp16"], compInst: ["pulse", "synth"], lead: ["synth", "square"], bassInst: ["synbass"], fx: ["laser"] }),
            S({ name: "space ambient", bpm: [80, 96], scales: ["lydian", "major", "penta"], drums: ["soft"], bass: ["drone"], comp: ["pad"], compInst: ["pad", "choir"], lead: ["bell", "theremin", "flute"], bassInst: ["sub"], density: 0.35, fx: ["sparkle", "laser"] }),
            S({ name: "chip cosmos", bpm: [128, 148], scales: ["minor", "mixo"], drums: ["chip"], bass: ["octave"], comp: ["arp16"], compInst: ["pulse"], lead: ["square", "pulse"], bassInst: ["synbass"], density: 0.6, fx: ["laser"] }),
            S({ name: "retro sci-fi", bpm: [96, 112], scales: ["whole", "lydian"], drums: ["rock"], bass: ["octave"], comp: ["stab"], compInst: ["organ"], lead: ["theremin", "synth"], bassInst: ["synbass"], fx: ["laser"] })
        ]
    },
    asian: {
        re: /eastern|dragon|samurai|koi|mahjong|lunar|fufu|firecracker|pillar|zen|\bcats?\b|neko|🀄|🐉|🏮|jade|panda|pagoda|cherry blossom/,
        styles: [
            S({ name: "koto garden", bpm: [88, 108], scales: ["insen", "hira"], drums: ["wood"], bass: ["drone"], comp: ["sweep"], compInst: ["koto"], lead: ["erhu", "koto", "flute"], bassInst: ["sub"], fx: ["gong"] }),
            S({ name: "dragon festival", bpm: [120, 138], scales: ["penta"], drums: ["taiko"], bass: ["boom"], comp: ["stab"], compInst: ["koto", "pluck"], lead: ["flute", "erhu", "whistle"], bassInst: ["sub"], fx: ["gong"] }),
            S({ name: "shamisen dash", bpm: [132, 150], scales: ["insen", "mpenta"], drums: ["taiko"], bass: ["drone"], comp: ["roll"], compInst: ["koto"], lead: ["koto", "flute"], bassInst: ["sub"], density: 0.65, fx: ["gong"] })
        ]
    },
    tropical: {
        re: /island|aloha|tiki|coconut|sandy|poly|volcano|tropic|lily|frog|ribbit|beach|🏝|🥥|🗿|🐸|lilypad|palm/,
        styles: [
            S({ name: "steel calypso", bpm: [100, 118], scales: ["major", "mixo"], drums: ["latin"], bass: ["bossa"], comp: ["strum"], compInst: ["pluck"], lead: ["steel", "marimba"], bassInst: ["upright"], fx: ["waves", "birds"] }),
            S({ name: "ukulele reggae", bpm: [84, 100], scales: ["major", "penta"], drums: ["reggae"], bass: ["offbeat"], comp: ["stab"], compInst: ["guitar", "organ"], lead: ["whistle", "steel", "marimba"], bassInst: ["upright"], fx: ["waves"] }),
            S({ name: "tiki exotica", bpm: [96, 112], scales: ["dorian", "mixo"], drums: ["latin"], bass: ["walking"], comp: ["arp8"], compInst: ["marimba"], lead: ["flute", "bell"], bassInst: ["upright"], fx: ["birds"] })
        ]
    },
    ocean: {
        re: /\bsea\b|sea |ocean|pearl|coral|ship|pirate|kraken|abyss|deep|bubble|galleon|tide|shell|wave|fish|pond|leviathan|trench|water|helm|sunken|🐙|🌊|🫧|🦪|🐚|🏴|💧|rain/,
        styles: [
            S({ name: "sea shanty", meter: 6, bpm: [100, 120], scales: ["dorian", "minor"], drums: ["jig"], bass: ["rootfifth"], comp: ["oompah"], compInst: ["accordion"], lead: ["accordion", "whistle", "violin"], bassInst: ["upright"], fx: ["waves", "creak"] }),
            S({ name: "deep blue", bpm: [72, 90], scales: ["dorian", "minor", "lydian"], drums: ["soft"], bass: ["drone"], comp: ["pad"], compInst: ["pad"], lead: ["bell", "theremin", "choir"], bassInst: ["sub"], density: 0.3, fx: ["bubbles", "waves"] }),
            S({ name: "aquarium swing", bpm: [110, 126], scales: ["mixo", "major"], drums: ["swing", "bossa"], bass: ["walking"], comp: ["arp8"], compInst: ["marimba", "harp"], lead: ["glock", "flute", "rhodes"], bassInst: ["upright"], fx: ["bubbles"] })
        ]
    },
    western: {
        re: /western|saloon|gold rush|cowboy|\bmine|miner|underground|mole|\bdig\b|\bant\b|ant |ground|claw|canyon|sheriff|⛏|🐜|🤠/,
        styles: [
            S({ name: "banjo hoedown", bpm: [120, 140], scales: ["major", "mixo"], drums: ["polka"], bass: ["rootfifth"], comp: ["roll"], compInst: ["banjo"], lead: ["whistle", "harmonica", "violin"], bassInst: ["upright"], fx: ["coins"] }),
            S({ name: "saloon ragtime", bpm: [100, 120], scales: ["major", "mixo"], drums: ["shuffle"], bass: ["rootfifth"], comp: ["stab"], compInst: ["piano"], lead: ["piano", "harpsi"], bassInst: ["upright"], density: 0.65, fx: ["crowd"] }),
            S({ name: "mine-cart blues", bpm: [96, 112], scales: ["blues", "mixo"], drums: ["shuffle", "march"], bass: ["walking"], comp: ["stab"], compInst: ["guitar"], lead: ["harmonica", "guitar"], bassInst: ["tuba", "upright"], fx: ["clock"] })
        ]
    },
    epic: {
        re: /gladiator|colosseum|arena|lion|\bwar\b|aero|squadron|\bsol\b|umbra|cathedral|temple|strike|champion|winner|sun-drum|sun drum|\bace\b|⚔|🦁|knight|legend|god/,
        styles: [
            S({ name: "brass fanfare", bpm: [96, 112], scales: ["minor", "major"], drums: ["epic"], bass: ["boom"], comp: ["pad"], compInst: ["choir", "pad"], lead: ["brass", "horn"], bassInst: ["sub"], fx: ["gong"] }),
            S({ name: "war drums", bpm: [110, 126], scales: ["phryg", "harm"], drums: ["epic", "taiko"], bass: ["eighths"], comp: ["stab"], compInst: ["brass"], lead: ["horn", "violin"], bassInst: ["synbass"], fx: ["crowd"] }),
            S({ name: "cathedral", bpm: [78, 94], scales: ["lydian", "major"], drums: ["soft"], bass: ["drone"], comp: ["pad"], compInst: ["organ"], lead: ["choir", "bell", "organ"], bassInst: ["sub"], density: 0.3, fx: ["gong"] })
        ]
    },
    luxury: {
        re: /wealth|riches|\bvip|yacht|diamond|\bgem|gold|vault|platinum|champagne|bank|high roller|highroller|high limit|black card|money|cash|penthouse|velvet|royal|crown|top hat|bullion|heist|pay ?day|💎|💸|🏦|🍾|💳|💍|🔐|🧱|mesh|treasury/,
        styles: [
            S({ name: "lounge jazz", bpm: [108, 126], scales: ["dorian", "mixo"], drums: ["swing"], bass: ["walking"], comp: ["stab"], compInst: ["rhodes"], lead: ["bell", "brass", "rhodes"], bassInst: ["upright"], fx: ["coins"] }),
            S({ name: "bossa nova", bpm: [120, 138], scales: ["major", "lydian"], drums: ["bossa"], bass: ["bossa"], comp: ["arp8"], compInst: ["guitar", "rhodes"], lead: ["flute", "whistle", "rhodes"], bassInst: ["upright"], fx: ["coins"] }),
            S({ name: "big band", bpm: [132, 152], scales: ["mixo", "blues"], drums: ["swing"], bass: ["walking"], comp: ["stab"], compInst: ["brass"], lead: ["brass", "piano"], bassInst: ["upright"], density: 0.6, fx: ["crowd"] }),
            S({ name: "velvet r&b", bpm: [84, 98], scales: ["dorian", "minor"], drums: ["trap", "funk"], bass: ["eighths"], comp: ["pad"], compInst: ["rhodes", "pad"], lead: ["rhodes", "synth"], bassInst: ["b808"], fx: ["coins"] })
        ]
    },
    retro: {
        re: /neon|cyber|retro|\bdj\b|crypto|blitz|arcade|combo|chain|pixel|robot|\bnpc|quantum|2000|super|reel|triple bar|cherry|fruit|classic|bonanza|mania|grid|smash|brick|polarity|\bbot|🤖|🔴|🟢|payphone|dial/,
        styles: [
            S({ name: "chiptune", bpm: [132, 152], scales: ["major", "minor"], drums: ["chip"], bass: ["octave"], comp: ["arp16"], compInst: ["pulse"], lead: ["square", "pulse"], bassInst: ["synbass"], density: 0.65, fx: ["laser"] }),
            S({ name: "synthwave", bpm: [98, 116], scales: ["minor", "dorian"], drums: ["four"], bass: ["eighths"], comp: ["arp16"], compInst: ["synth"], lead: ["synth", "pad"], bassInst: ["synbass"], fx: ["laser"] }),
            S({ name: "electro funk", bpm: [108, 122], scales: ["dorian", "mpenta"], drums: ["funk"], bass: ["eighths"], comp: ["stab"], compInst: ["synth", "organ"], lead: ["square", "synth"], bassInst: ["synbass"], fx: ["laser"] }),
            S({ name: "fruit machine", bpm: [118, 134], scales: ["major", "mixo"], drums: ["rock"], bass: ["octave"], comp: ["stab"], compInst: ["organ"], lead: ["pulse", "organ", "glock"], bassInst: ["synbass"], fx: ["coins"] })
        ]
    },
    fantasy: {
        re: /wizard|magic|potion|alchem|fantasy|quest|dungeon|mimic|labyrinth|prism|astral|curio|cabinet|weaver|kingdom|tavern|idle|treasure|unicorn|fairy|🧪|🦄|🧰|castle/,
        styles: [
            S({ name: "medieval lute", meter: 3, bpm: [96, 116], scales: ["dorian", "mixo"], drums: ["frame"], bass: ["drone"], comp: ["arp8"], compInst: ["guitar", "harp"], lead: ["flute", "harpsi"], bassInst: ["sub"], fx: ["crowd"] }),
            S({ name: "celtic harp", meter: 6, bpm: [108, 128], scales: ["major", "mixo", "dorian"], drums: ["jig"], bass: ["drone"], comp: ["arp8"], compInst: ["harp"], lead: ["violin", "whistle"], bassInst: ["sub"], fx: ["birds"] }),
            S({ name: "arcane", bpm: [82, 98], scales: ["harm", "whole", "lydian"], drums: ["soft", "frame"], bass: ["drone"], comp: ["arp16"], compInst: ["bell", "harp"], lead: ["choir", "theremin", "sitar"], bassInst: ["sub"], density: 0.35, fx: ["sparkle"] })
        ]
    },
    circus: {
        re: /crazy|madness|chaos|random|weird|wobbly|upside|joker|clown|possibility|maybe|chance|percent|\bstat|rtp|return to player|picky|fussy|choosy|which eye|time bomb|\bodd|curiosit|🤪|🙃|🔀|🧦|🃏|👁/,
        styles: [
            S({ name: "calliope march", bpm: [138, 158], scales: ["major"], drums: ["march"], bass: ["rootfifth"], comp: ["stab"], compInst: ["calliope"], lead: ["calliope", "glock"], bassInst: ["tuba"], fx: ["crowd"] }),
            S({ name: "carnival waltz", meter: 3, bpm: [140, 170], scales: ["harm", "major"], drums: ["waltz"], bass: ["boom"], comp: ["oompah"], compInst: ["calliope", "accordion"], lead: ["calliope", "accordion"], bassInst: ["tuba"], fx: ["crowd"] }),
            S({ name: "zany jazz", bpm: [122, 138], scales: ["whole", "blues"], drums: ["swing"], bass: ["walking"], comp: ["stab"], compInst: ["piano"], lead: ["kazoo", "square", "brass"], bassInst: ["upright"], fx: ["clock"] })
        ]
    },
    sky: {
        re: /\bsky|cloud|wind|feather|wing|bridge|cumulus|fog|mist|float|balloon|tower|dove|🌬|🌤|☁|🌀|🪶|🪺|🌫/,
        styles: [
            S({ name: "airy harp waltz", meter: 3, bpm: [94, 112], scales: ["lydian", "major"], drums: ["soft"], bass: ["boom"], comp: ["arp8"], compInst: ["harp"], lead: ["flute", "whistle"], bassInst: ["sub"], fx: ["wind", "birds"] }),
            S({ name: "breezy pop", bpm: [112, 126], scales: ["major", "penta"], drums: ["rock"], bass: ["eighths"], comp: ["strum"], compInst: ["guitar"], lead: ["whistle", "glock"], bassInst: ["upright"], fx: ["birds"] }),
            S({ name: "dream drift", bpm: [76, 92], scales: ["penta", "lydian"], drums: ["soft"], bass: ["drone"], comp: ["pad"], compInst: ["choir", "pad"], lead: ["bell", "flute"], bassInst: ["sub"], density: 0.3, fx: ["wind"] })
        ]
    },
    town: {
        re: /town|plaza|office|kitchen|diner|downtown|city|fountain|square|hall|shelter|beggar|empty pockets|last coin|\bcan\b|karma|crossing|rush hour|gridlock|traffic|festival|⛲|🏘|🥫|market|street/,
        styles: [
            S({ name: "ragtime", bpm: [104, 122], scales: ["major"], drums: ["shuffle"], bass: ["rootfifth"], comp: ["stab"], compInst: ["piano"], lead: ["piano", "glock"], bassInst: ["upright"], density: 0.65, fx: ["crowd"] }),
            S({ name: "cafe bossa", bpm: [118, 134], scales: ["dorian", "major"], drums: ["bossa"], bass: ["bossa"], comp: ["arp8"], compInst: ["guitar"], lead: ["accordion", "flute", "whistle"], bassInst: ["upright"], fx: ["birds"] }),
            S({ name: "ska pep", bpm: [140, 160], scales: ["major", "mixo"], drums: ["ska"], bass: ["walking"], comp: ["stab"], compInst: ["organ", "guitar"], lead: ["brass", "whistle"], bassInst: ["upright"], fx: ["crowd"] })
        ]
    },
    cute: {
        re: /candy|rainbow|unicorn|\bemo\b|emo |capsule|gacha|rabbit|\bpig|piggy|oink|clover|lucky|\bpop\b|pop |kindness|gift|popcorn|egg|crack|froggie|cute|bunny|heart|giving|charity|donat|lollipop|sweet|🐰|🍬|🌈|🎈|🐖|🍀|💊|🥚|🎁/,
        styles: [
            S({ name: "bubblegum pop", bpm: [116, 132], scales: ["major", "penta"], drums: ["rock"], bass: ["eighths"], comp: ["strum"], compInst: ["guitar", "pluck"], lead: ["square", "glock", "bell"], bassInst: ["synbass"], fx: ["sparkle"] }),
            S({ name: "toy box", bpm: [104, 120], scales: ["major", "lydian"], drums: ["wood"], bass: ["boom"], comp: ["arp8"], compInst: ["marimba", "musicbox"], lead: ["marimba", "musicbox", "glock"], bassInst: ["upright"], fx: ["sparkle"] }),
            S({ name: "kazoo parade", bpm: [132, 148], scales: ["major"], drums: ["polka", "march"], bass: ["rootfifth"], comp: ["stab"], compInst: ["accordion", "pluck"], lead: ["kazoo", "whistle"], bassInst: ["tuba"], fx: ["crowd"] })
        ]
    },
    casino: {
        re: /./,
        styles: [
            S({ name: "casino swing", bpm: [124, 144], scales: ["mixo", "dorian"], drums: ["swing"], bass: ["walking"], comp: ["stab"], compInst: ["piano", "rhodes"], lead: ["brass", "bell", "piano"], bassInst: ["upright"], fx: ["coins"] }),
            S({ name: "card-room tango", bpm: [104, 120], scales: ["harm", "minor"], drums: ["tango"], bass: ["tango"], comp: ["stab"], compInst: ["accordion", "piano"], lead: ["violin", "accordion"], bassInst: ["upright"], fx: ["coins"] }),
            S({ name: "gypsy jazz", bpm: [150, 176], scales: ["harm", "hungar"], drums: ["swing"], bass: ["rootfifth"], comp: ["stab"], compInst: ["guitar"], lead: ["violin", "guitar"], bassInst: ["upright"], density: 0.6, fx: ["crowd"] }),
            S({ name: "cha-cha", bpm: [112, 126], scales: ["major", "dorian"], drums: ["latin"], bass: ["bossa"], comp: ["stab"], compInst: ["piano", "organ"], lead: ["brass", "flute", "marimba"], bassInst: ["upright"], fx: ["coins"] })
        ]
    }
};
const THEME_ORDER = ["horror", "dung", "ice", "space", "asian", "tropical", "ocean", "western", "epic", "luxury", "retro", "fantasy", "circus", "sky", "town", "cute", "casino"];
export function themeOf(g) {
    const txt = `${g.id} ${g.name || ""} ${g.icon || ""} ${g.brand || ""}`.toLowerCase().replace(/_/g, " ");
    return THEME_ORDER.find(k => THEMES[k].re.test(txt));
}

// ---------------------------------------------------------------- song generator
function makeSpec(g, salt = 0) {
    const theme = themeOf(g), T = THEMES[theme];
    const r = rngOf(`${g.id}#${salt}`);
    const st = T.styles[(hash(g.id) + salt) % T.styles.length];
    const scaleName = pickR(r, st.scales), sc = SCALES[scaleName];
    const meter = st.meter, B = meter === 6 ? 6 : 4, nb = meter === 6 ? 2 : meter === 3 ? 3 : 4, bs = B * nb;
    const prog = (sc.length >= 7 ? pickR(r, PROGS7) : pickR(r, PROGS5)).slice();
    if (r() < 0.5) prog.push(...pickR(r, sc.length >= 7 ? PROGS7 : PROGS5)); else prog.push(...prog.slice(0, 3), prog[0]);
    const root = Math.floor(r() * 12);
    const spec = {
        id: g.id, theme, style: st.name, scaleName, sc, meter, B, nb, bs, bars: 8, prog, root,
        bpm: between(r, st.bpm[0], st.bpm[1]),
        drums: pickR(r, st.drums), bass: pickR(r, st.bass), comp: pickR(r, st.comp),
        compInst: pickR(r, st.compInst), lead: pickR(r, st.lead), bassInst: pickR(r, st.bassInst),
        fx: pickR(r, st.fx || ["sparkle"]), density: st.density + (r() - 0.5) * 0.2,
        lift: r() < 0.5, // bar 3 rises (else falls)
    };
    spec.mel = writeMelody(spec, r);
    return spec;
}
// melody: per step → { d: scale degree, len: steps } | undefined. Motif A (2 bars), A' (moved), B, A'' with cadence.
function writeMelody(sp, r) {
    const { B, nb, bs, sc, prog, density } = sp, n = sc.length;
    const SUB4 = [[0], [0, 2], [0, 3], [0, 1, 2, 3], [0, 2, 3], [0, 1, 2], [], [0]];
    const SUB6 = [[0], [0, 2, 4], [0, 4], [0, 3], [], [0, 2]];
    const rhythm = () => {
        const out = [];
        for (let b = 0; b < nb * 2; b++) {
            const pool = B === 6 ? SUB6 : SUB4;
            let sub = pool[Math.floor(r() * pool.length)];
            if (r() > density && sub.length > 1) sub = sub.slice(0, 1);
            if (b === 0 && !sub.length) sub = [0];
            for (const s of sub) out.push(b * B + s);
        }
        return out;
    };
    const chordDegs = bar => { const c = prog[bar % prog.length]; return [c, c + 2, c + 4]; };
    const near = (prev, opts) => opts.flatMap(o => [o - n, o, o + n]).filter(x => x >= -2 && x <= n + 5).sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev))[0];
    const phrase = (startBar, rh, prevStart) => {
        const notes = []; let prev = prevStart;
        for (const p of rh) {
            const bar = startBar + Math.floor(p / bs), strong = (p % bs) % B === 0;
            let d;
            if (strong) d = near(prev + (r() < 0.5 ? 1 : -1), chordDegs(bar));
            else { const stp = r() < 0.2 ? (r() < 0.5 ? 2 : -2) : (r() < 0.5 ? 1 : -1); d = Math.max(-2, Math.min(n + 5, prev + stp)); }
            notes.push({ p: startBar * bs + p, d }); prev = d;
        }
        return notes;
    };
    const rhA = rhythm(), rhB = rhythm();
    const A = phrase(0, rhA, 2);
    const shift = sp.lift ? 2 : -1;
    const A2 = A.map(x => ({ p: x.p + 2 * bs, d: x.d + shift }));
    const Bp = phrase(4, rhB, A2.at(-1)?.d ?? 2);
    const A3 = A.map(x => ({ p: x.p + 6 * bs, d: x.d }));
    // cadence: last note of the loop lands on the tonic and is held
    const last = A3.filter(x => x.p < 8 * bs - B); if (last.length) last.at(-1).d = near(last.at(-1).d, [0]);
    const all = [...A, ...A2, ...Bp, ...last].sort((x, y) => x.p - y.p);
    const steps = new Array(8 * bs);
    all.forEach((x, i) => { const nx = all[i + 1]?.p ?? 8 * bs; steps[x.p] = { d: x.d, len: Math.max(1, Math.min(nx - x.p, B * 2)) }; });
    return steps;
}

const FX = {
    sparkle(a, o, t, sp, s) { if (s % (sp.bs * 2) === sp.bs * 2 - 2) for (let i = 0; i < 3; i++) INST.bell(a, o, t + i * 0.07, 84 + sp.root + deg2semi(sp.sc, i * 2), 0.3, 0.012); },
    wind(a, o, t, sp, s) { if (s === 0 || s === sp.bs * 4) bgmNoise(a, o, t, { dur: 1.6, vol: 0.012, hp: 2500 }); },
    waves(a, o, t, sp, s) { if (s % (sp.bs * 2) === 0) bgmNoise(a, o, t, { dur: 2.2, vol: 0.018, hp: 600 }); },
    bubbles(a, o, t, sp, s) { if (s % sp.bs === sp.bs - 3 && Math.random() < 0.6) bgmVoice(a, o, t, { freq: 500 + Math.random() * 500, type: "sine", dur: 0.08, vol: 0.02, cut: 9000, cutEnd: 9000, attack: 0.001 }); },
    gong(a, o, t, sp, s) { if (s === 0) gong(a, o, t, 0.035); },
    sleigh(a, o, t, sp, s) { if (s % 2 === 0) bgmNoise(a, o, t, { dur: 0.04, vol: 0.012, hp: 9000 }); },
    coins(a, o, t, sp, s) { if (s === sp.bs * 8 - 3) { bgmVoice(a, o, t, { freq: 1318, type: "square", dur: 0.06, vol: 0.02, cut: 9000, cutEnd: 6000 }); bgmVoice(a, o, t + 0.06, { freq: 1760, type: "square", dur: 0.1, vol: 0.02, cut: 9000, cutEnd: 6000 }); } },
    creak(a, o, t, sp, s) { if (s === sp.bs * 4 + 2) bgmVoice(a, o, t, { freq: 180, type: "sawtooth", dur: 0.6, vol: 0.012, cut: 700, cutEnd: 400, attack: 0.2 }); },
    laser(a, o, t, sp, s) { if (s === sp.bs * 8 - 2) { const g = a.createGain(), x = a.createOscillator(); x.type = "square"; x.frequency.setValueAtTime(1800, t); x.frequency.exponentialRampToValueAtTime(200, t + 0.25); g.gain.setValueAtTime(0.012, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); x.connect(g).connect(o); x.start(t); x.stop(t + 0.3); } },
    birds(a, o, t, sp, s) { if (s === sp.bs * 3 + 1 || s === sp.bs * 7 + 3) for (let i = 0; i < 3; i++) bgmVoice(a, o, t + i * 0.08, { freq: 2600 + i * 300, type: "sine", dur: 0.05, vol: 0.012, cut: 9000, cutEnd: 9000, attack: 0.002 }); },
    crowd(a, o, t, sp, s) { if (s === sp.bs * 8 - sp.B) bgmNoise(a, o, t, { dur: 0.5, vol: 0.012, hp: 1200 }); },
    fart(a, o, t, sp, s) { if (s === sp.bs * 8 - 2) bgmVoice(a, o, t, { freq: 90, type: "sawtooth", dur: 0.25, vol: 0.03, cut: 600, cutEnd: 200, attack: 0.01 }); },
    clock(a, o, t, sp, s) { if (s % sp.B === 0) wood(a, o, t, s % (sp.B * 2) ? 1900 : 1500, 0.015); }
};

function songFrom(sp) {
    const { B, nb, bs, sc, root } = sp, n = sc.length;
    const step = sp.meter === 6 ? 60 / sp.bpm / 6 : 60 / sp.bpm / 4;
    const lead = INST[sp.lead], comp = INST[sp.compInst], bassI = INST[sp.bassInst], drum = DRUMS[sp.drums], fx = FX[sp.fx];
    const LEADV = { brass: 0.045, horn: 0.05, synth: 0.04, pad: 0.04, choir: 0.05, organ: 0.035, accordion: 0.04, violin: 0.045, erhu: 0.045, kazoo: 0.045, square: 0.035, pulse: 0.04, harmonica: 0.045, theremin: 0.05 }[sp.lead] || 0.06;
    const COMPV = { pad: 0.03, choir: 0.03, organ: 0.02, brass: 0.022, synth: 0.02, accordion: 0.022, calliope: 0.02, pulse: 0.02 }[sp.compInst] || 0.028;
    const leadBase = 72 + root - (root > 6 ? 12 : 0) + (["tuba", "horn"].includes(sp.lead) ? -12 : 0);
    const chordBase = 60 + root - (root > 6 ? 12 : 0), bassBase = 36 + root - (root > 7 ? 12 : 0);
    const chordNotes = bar => { const c = sp.prog[bar % sp.prog.length]; return [0, 2, 4].map(k => chordBase + deg2semi(sc, c + k)); };
    const bassNote = (bar, k = 0) => bassBase + deg2semi(sc, sp.prog[bar % sp.prog.length] + k);
    return {
        name: "gen:" + sp.id, bpm: sp.bpm, steps: bs * 8, step,
        play(a, out, s, t, len) {
            const bar = Math.floor(s / bs), sb = s % bs, q = sb % B, beat = Math.floor(sb / B);
            drum(a, out, t, sb, B, nb, bar);
            // bass
            const bn = bassNote(bar), bv = sp.bassInst === "tuba" ? 0.12 : 0.17;
            switch (sp.bass) {
                case "boom": if (sb === 0) bassI(a, out, t, bn, len * B * 1.5, bv); else if (q === 0 && beat === Math.floor(nb / 2) + (nb === 3 ? 0 : 0)) bassI(a, out, t, bn + 7, len * B, bv * 0.8); break;
                case "rootfifth": if (q === 0 && (sp.meter === 3 ? beat === 0 : beat % 2 === 0)) bassI(a, out, t, beat % 4 === 0 || sp.meter !== 4 ? bn : bassNote(bar, 4) - 12 + (bassNote(bar, 4) - 12 < bn - 5 ? 12 : 0), len * B, bv); break;
                case "walking": if (q === 0) bassI(a, out, t, beat === 0 ? bn : bassBase + deg2semi(sc, sp.prog[bar % sp.prog.length] + [0, 2, 4, 5, 3, 1][beat % 6]), len * B * 0.95, bv); break;
                case "eighths": if (sb % 2 === 0) bassI(a, out, t, bn + (sb % 8 === 6 ? 12 : 0), len * 1.8, bv * 0.8); break;
                case "octave": if (sb % 2 === 0) bassI(a, out, t, bn + (sb % 4 === 2 ? 12 : 0), len * 1.6, bv * 0.75); break;
                case "offbeat": if (q === B / 2) bassI(a, out, t, bn + (beat === 2 ? 7 : 0), len * 1.5, bv); if (sb === 0) bassI(a, out, t, bn, len * 3, bv); break;
                case "drone": if (sb === 0 && bar % 2 === 0) bassI(a, out, t, bn, len * bs * 2, bv * 0.7); break;
                case "tango": if ([0, 6, 8, 12].includes(sb)) bassI(a, out, t, sb === 12 ? bn + 7 : bn, len * 2, bv); break;
                case "bossa": if ([0, 6, 8, 14].includes(sb)) bassI(a, out, t, sb >= 8 ? bn + 7 - (sb === 14 ? 12 : 0) : bn, len * 2.5, bv); break;
                case "arp": if (sb % 2 === 0) bassI(a, out, t, bassBase + deg2semi(sc, sp.prog[bar % sp.prog.length] + [0, 2, 4, 2][(sb / 2) % 4]), len * 1.8, bv * 0.8); break;
            }
            // comping
            const ch = chordNotes(bar);
            switch (sp.comp) {
                case "stab": if (q === B / 2 || (B === 6 && q === 3)) ch.forEach(x => comp(a, out, t, x, len * 1.4, COMPV)); break;
                case "oompah": if (q === 0 && beat > 0) ch.forEach(x => comp(a, out, t, x, len * B * 0.8, COMPV)); break;
                case "arp16": comp(a, out, t, ch[[0, 1, 2, 1][sb % 4]] + (sb % 8 >= 4 ? 12 : 0), len * 1.5, COMPV * 1.2); break;
                case "arp8": if (sb % 2 === 0) comp(a, out, t, ch[[0, 1, 2, 1, 2, 0][(sb / 2) % 6]] + (sb % 8 === 6 ? 12 : 0), len * 2.2, COMPV * 1.2); break;
                case "pad": if (sb === 0) ch.forEach(x => comp(a, out, t, x, len * bs * 0.95, COMPV)); break;
                case "strum": if ([0, 3, 6, 10, 12].includes(sb) && sb < bs) ch.forEach((x, i) => comp(a, out, t + i * 0.012, x, len * 1.6, COMPV)); break;
                case "sweep": if (sb === 0) [...ch, ch[0] + 12, ch[1] + 12].forEach((x, i) => comp(a, out, t + i * 0.05, x, 0.6, COMPV * 1.3)); break;
                case "roll": if (sb % 1 === 0) comp(a, out, t, ch[[0, 1, 2, 0, 1, 2, 0, 1][sb % 8]] + 12, len, COMPV * 1.1); break;
                case "block": if (q === 0) ch.forEach(x => comp(a, out, t, x, len * B * 0.7, COMPV)); break;
            }
            // lead
            const m = sp.mel[s];
            if (m) lead(a, out, t, leadBase + deg2semi(sc, m.d), len * m.len * 0.95, LEADV);
            fx?.(a, out, t, sp, s);
        }
    };
}

// ---------------------------------------------------------------- SFX palette
function sfxFrom(sp) {
    const sc = sp.sc, n = sc.length, base = 72 + sp.root - (sp.root > 6 ? 12 : 0);
    const N = d => midi(base + deg2semi(sc, d));
    const motif = sp.mel.filter(Boolean).slice(0, 6).map(x => x.d);
    while (motif.length < 6) motif.push(motif.length * 2);
    const WAVE = { pluck: "sawtooth", guitar: "triangle", bell: "sine", musicbox: "sine", glock: "triangle", organ: "square", calliope: "sine", brass: "sawtooth", horn: "sawtooth", flute: "sine", whistle: "sine", square: "square", pulse: "square", synth: "sawtooth", pad: "sawtooth", choir: "triangle", marimba: "sine", steel: "triangle", violin: "sawtooth", erhu: "sawtooth", koto: "sawtooth", harpsi: "square", harp: "triangle", accordion: "square", harmonica: "square", rhodes: "sine", piano: "triangle", kazoo: "sawtooth", theremin: "sine", sitar: "sawtooth", banjo: "sawtooth", tuba: "sawtooth" };
    const w = WAVE[sp.lead] || "triangle", w2 = WAVE[sp.compInst] || "square";
    const v = { sine: 0.09, triangle: 0.08, square: 0.05, sawtooth: 0.045 }[w];
    const bright = ["bell", "glock", "musicbox", "marimba", "steel", "harp", "koto"].includes(sp.lead);
    const partial = bright ? 2.76 : w === "sine" ? 2 : 0;
    const gap = Math.max(0.05, Math.min(0.12, 60 / sp.bpm / 4 * 1.1));
    const play = (f, d, when = 0, vol = v, wave = w, slide = 0) => { tone(f, d, wave, vol, when, slide); if (partial) tone(f * partial, d * 0.5, "sine", vol * 0.25, when); };
    const perc = {
        horror: () => { tone(N(-7) / 2, 0.18, "sawtooth", 0.05, 0, -40); noise(0.08, 0.04); },
        dung: () => { tone(90 + sp.root * 3, 0.14, "sawtooth", 0.07, 0, -40); noise(0.08, 0.06); },
        ice: () => { tone(N(7), 0.05, "triangle", 0.05); tone(N(11), 0.08, "sine", 0.04, 0.03); },
        space: () => { tone(N(0), 0.09, "square", 0.04, 0, -N(0) * 0.6); },
        asian: () => { tone(N(0) / 2, 0.12, "sine", 0.1, 0, -30); tone(1150 + sp.root * 20, 0.04, "sine", 0.05); },
        tropical: () => { tone(N(0) / 2, 0.1, "sine", 0.12, 0, -N(0) / 4); },
        ocean: () => { noise(0.1, 0.05); tone(N(-3) / 2, 0.12, "sine", 0.08, 0, -30); },
        western: () => { tone(N(0) / 2, 0.07, "triangle", 0.08); noise(0.05, 0.04); },
        epic: () => { tone(N(-7) / 2, 0.2, "sine", 0.14, 0, -N(-7) / 4); noise(0.06, 0.05); },
        luxury: () => { tone(N(4), 0.04, "sine", 0.04); tone(N(0) / 2, 0.08, "triangle", 0.06); },
        retro: () => { tone(N(0), 0.06, "square", 0.05, 0, -N(0) / 2); },
        fantasy: () => { tone(N(2), 0.06, "triangle", 0.05); tone(N(0) / 2, 0.1, "sine", 0.06); },
        circus: () => { tone(N(0) / 2, 0.06, "square", 0.05, 0, N(0) / 4); },
        sky: () => { noise(0.08, 0.03); tone(N(4), 0.06, "sine", 0.05); },
        town: () => { tone(N(0) / 2, 0.06, "triangle", 0.07); tone(1600 + sp.root * 15, 0.02, "square", 0.02); },
        cute: () => { tone(N(4), 0.05, "square", 0.04, 0, 120); },
        casino: () => { tone(N(0) / 2, 0.07, "triangle", 0.07); noise(0.04, 0.03); }
    }[sp.theme];
    return {
        id: sp.id,
        tick() { tone(N(n + motif[Math.floor(Math.random() * motif.length)]), 0.03, w2, 0.025); },
        click() { play(N(n), 0.05, 0, v * 0.6); },
        stop() { perc(); },
        tease() { play(N(0), 0.6, 0, v * 0.5, w, N(4) - N(0)); },
        heartbeat() { tone(55 + sp.root * 2, 0.12, "sine", 0.25); tone(48 + sp.root * 2, 0.14, "sine", 0.22, 0.18); },
        win() { motif.slice(0, 4).forEach((d, i) => play(N(d + n), 0.13, i * gap)); },
        bigWin() { motif.forEach((d, i) => play(N(d + n), 0.2, i * gap * 1.3)); [0, 2, 4].forEach(k => play(N(n * 2 + k), 0.5, motif.length * gap * 1.3, v * 0.6)); },
        jackpot() { for (let i = 0; i < 12; i++) play(N(motif[i % motif.length] + n + (i >= 6 ? n : 0)), 0.15, i * gap); },
        coin() { play(N(n + 4), 0.05, 0, v * 0.6); play(N(n + 6), 0.08, 0.05, v * 0.6); },
        cash() { [0, 2, 4, 7].forEach((d, i) => play(N(n + d), 0.09, i * 0.06, v * 0.7)); },
        lose() { play(N(motif[0]), 0.16, 0, v * 0.6); play(N(-1), 0.25, 0.14, v * 0.6, w, -N(-1) * 0.3); },
        bonus() { [0, 2, 4, n, n + 2, n + 4].forEach((d, i) => play(N(d), 0.14, i * gap * 1.1)); play(N(n + motif[0]), 0.3, 6 * gap * 1.1); },
        fanfare() { [motif[0], motif[0], motif[0], motif[1], motif[2], motif[1], motif[2], n].forEach((d, i) => play(N(d + n), 0.18, i * 0.15)); },
        whoosh() { noise(0.25, 0.05); tone(N(0) / 2, 0.25, "sine", 0.02, 0, N(0) / 2); },
        hit() { perc(); noise(0.12, 0.1); },
        miss() { play(N(n), 0.25, 0, v * 0.5, w, -N(n) * 0.5); },
        boom() { noise(0.6, 0.22); tone(N(-n) / 4, 0.5, "sine", 0.2, 0, -N(-n) / 8); }
    };
}

// ---------------------------------------------------------------- registry
// The hand-written loops in sound.js — each one now belongs to exactly one slot.
const KEEP = {
    monkey_drop: "monkey_funk", five_cats: "samurai_taiko", midnight_ouija: "organ_waltz", coin_claw: "banjo_country", froggie: "lounge_jazz",
    cat_mouse: "synthwave", monster_kitchen: "kitchen_taiko", sol_umbra: "celestial_brass", four_pillars: "tropical_steel", chrono_heist: "bigband_swing",
    glacier_fracture: "pizzicato_march", kindness: "jingle_box", the_crossing: "irish_jig", karma_fountain: "shanty_accordion", mission_control: "lunar_festival"
};
const cache = new Map();
const melKey = sp => sp.mel.map((m, i) => m ? `${i}:${m.d}` : "").join(",");
const taken = new Map();
function specFor(g) {
    if (cache.has(g.id)) return cache.get(g.id);
    let sp, salt = 0;
    // a (vanishingly unlikely) identical loop elsewhere → reseed
    do { sp = makeSpec(g, salt++); } while (taken.has(`${sp.style}|${sp.root}|${sp.bpm}|${melKey(sp)}`) && taken.get(`${sp.style}|${sp.root}|${sp.bpm}|${melKey(sp)}`) !== g.id && salt < 8);
    taken.set(`${sp.style}|${sp.root}|${sp.bpm}|${melKey(sp)}`, g.id);
    cache.set(g.id, sp);
    return sp;
}
// g: a slot config or a casino game ({ id, name, icon })
export function gameAudio(g) {
    const sp = specFor(g);
    return { song: KEEP[g.id] || songFrom(sp), sfx: sfxFrom(sp), spec: sp };
}
export const describeAudio = g => { const sp = specFor(g); return KEEP[g.id] ? `${KEEP[g.id]} (hand-written)` : `${sp.style} · ${sp.scaleName} · ${sp.bpm} BPM · ${sp.lead}/${sp.compInst}/${sp.bassInst} · ${sp.drums}`; };
// dev check: every game has its own loop and palette
export function auditAudio(games) {
    const loops = new Map(), pals = new Map(), dup = [];
    for (const g of games) {
        const sp = specFor(g);
        const lk = KEEP[g.id] || `${sp.style}|${sp.root}|${sp.bpm}|${sp.lead}|${melKey(sp)}`;
        const pk = `${sp.theme}|${sp.root}|${sp.scaleName}|${sp.lead}|${sp.compInst}|${sp.bpm}|${sp.mel.filter(Boolean).slice(0, 6).map(x => x.d).join(",")}`;
        if (loops.has(lk)) dup.push(["loop", g.id, loops.get(lk)]); else loops.set(lk, g.id);
        if (pals.has(pk)) dup.push(["sfx", g.id, pals.get(pk)]); else pals.set(pk, g.id);
    }
    return { games: games.length, loops: loops.size, palettes: pals.size, dup };
}
