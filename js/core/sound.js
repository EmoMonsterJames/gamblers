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

export const Sound = {
    get muted() { return muted; },
    toggle() { muted = !muted; try { localStorage.setItem("gamblers.muted", muted ? "1" : "0"); } catch { } return muted; },
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
    whoosh() { noise(0.25, 0.06); }
};
