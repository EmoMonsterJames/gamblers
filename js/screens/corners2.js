// =====================================================================
// More location corners:
//   🎧 음악 감상 / 🏝️ 서바이벌 (돈벌기 options)
//   💼 직업 — a random job, 10 s of work, the job's time comes off the turn
//   👹 NPC — 40~70% chance of 1~3 one-sided NPC attacks during a turn
// =====================================================================
import { h, sleep, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { confirmBox, confetti, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { WEAPON_BY_ID, CAREERS, NPCS, CURSES, ALPHABET } from "../data/catalog.js";
import * as G from "../game/season.js";
import { avatar, displayName } from "../ui/profile.js";

export const skewLow = (min, max, step, k = 3) => Math.max(min, Math.round((min + (max - min) * Math.pow(Math.random(), k)) / step) * step);
function taskOverlay(content) { const ov = h("div.task-ov", content); document.body.append(ov); return ov; }

// ------------------------------------------------------------------ 🎧 music listening
// Tracks come from audio/music/list.json: ["file.mp3", …] or [{ "file": …, "title": … }, …]
// (files in audio/music/). With no tracks a synthesized BGM plays instead.
let TRACKS = null;
async function loadTracks() {
    if (TRACKS) return TRACKS;
    try {
        const r = await fetch("audio/music/list.json", { cache: "no-store" });
        const j = r.ok ? await r.json() : [];
        TRACKS = (Array.isArray(j) ? j : j.tracks || []).map(t => typeof t === "string" ? { file: t, title: t.replace(/\.[^.]+$/, "") } : t).filter(t => t?.file);
    } catch { TRACKS = []; }
    return TRACKS;
}
const LISTEN = 30;
export async function musicCorner(pid, turn) {
    const tracks = await loadTracks();
    const tr = tracks.length ? tracks[Math.floor(Math.random() * tracks.length)] : null;
    const count = h("div.task-count", String(LISTEN));
    const bar = h("div.task-bar", h("i"));
    const notes = h("div.listen-notes", Array.from({ length: 8 }, (_, i) => h("span", { style: { "--i": i, left: 10 + i * 11 + "%" } }, ["🎵", "🎶", "♪", "♫"][i % 4])));
    const title = h("div.task-label", tr ? `🎧 ${tr.title}` : "🎧 Gamblers Radio (synth mix)");
    const ov = taskOverlay(h("div.task-scene.listen", notes, h("div.listener", avatar(pid, 170, { effect: false }), h("span.headphones", "🎧")), title, count, bar));
    bar.firstChild.style.transition = `width ${LISTEN}s linear`;
    let audio = null, synth = null;
    if (tr) {
        audio = new Audio("audio/music/" + tr.file);
        audio.muted = Sound.muted;
        audio.volume = 0.8;
        await new Promise(res => { audio.addEventListener("loadedmetadata", res, { once: true }); audio.addEventListener("error", res, { once: true }); setTimeout(res, 2500); });
        const d = audio.duration;
        if (isFinite(d) && d > LISTEN + 1) audio.currentTime = Math.random() * (d - LISTEN); // a random 30 s section
        audio.play().catch(() => { });
    } else {
        synth = ["lounge_jazz", "synthwave", "monkey_funk", "tropical_steel", "bigband_swing"][Math.floor(Math.random() * 5)];
        Sound.bgm(synth);
    }
    await sleep(50); bar.firstChild.style.width = "100%";
    for (let i = LISTEN; i > 0; i--) { count.textContent = i; await sleep(1000); }
    audio?.pause(); if (synth) Sound.bgmStop();
    // the 30 s are part of the turn's play time (taken off by hand if the clock was paused)
    if (turn && !turn.running) turn.remaining = Math.max(0, turn.remaining - LISTEN);
    ov.remove();
    return { gold: skewLow(100, 5000, 10), msg: "🎧 좋은 음악이었다!" };
}

// ------------------------------------------------------------------ 🏝️ survival
// the player + 9 players who are NOT in the season: 3 survive the first cut, 1 wins
export async function survivalCorner(pid) {
    const s = G.S();
    const outsiders = Store.players.filter(p => !s.roster.includes(p.id)).map(p => p.id);
    const others = outsiders.sort(() => Math.random() - 0.5).slice(0, 9);
    const ten = [pid, ...others].sort(() => Math.random() - 0.5);
    const cards = ten.map(id => h("div.surv-card" + (id === pid ? ".me" : ""), { "data-id": id }, avatar(id, 74, { effect: false }), h("small", displayName(Store.player(id)))));
    const label = h("div.surv-label", "🏝️ 10명 중 3명만 살아남는다…");
    const ov = taskOverlay(h("div.task-scene.survival", label, h("div.surv-grid", cards)));
    const byId = id => cards[ten.indexOf(id)];
    await sleep(1200);
    // round 1: 3 candidates
    const three = [...ten].sort(() => Math.random() - 0.5).slice(0, Math.min(3, ten.length));
    for (let k = 0; k < 18; k++) { cards.forEach(c => c.classList.remove("hot")); cards[Math.floor(Math.random() * cards.length)].classList.add("hot"); Sound.tick(); await sleep(70 + k * 8); }
    cards.forEach(c => c.classList.remove("hot"));
    for (const c of cards) if (!three.includes(+c.dataset.id)) c.classList.add("out");
    three.forEach(id => byId(id).classList.add("cand"));
    label.textContent = "🔥 최후의 3인! 우승자는 단 1명";
    Sound.boom(); await sleep(1600);
    // round 2: the winner
    const win = three[Math.floor(Math.random() * three.length)];
    for (let k = 0; k < 16; k++) { three.forEach(id => byId(id).classList.remove("hot")); byId(three[k % three.length]).classList.add("hot"); Sound.tick(); await sleep(90 + k * 14); }
    three.forEach(id => byId(id).classList.remove("hot"));
    for (const id of three) if (id !== win) byId(id).classList.add("out");
    byId(win).classList.add("winner");
    const gold = skewLow(1000, 5000, 100, 2);
    label.textContent = `👑 ${displayName(Store.player(win))} 생존! +${fmt(gold)}G`;
    Sound.fanfare(); confetti(50);
    await sleep(2200);
    ov.remove();
    if (win === pid) return { gold, msg: "🏝️ 서바이벌 우승!" };
    // an outsider won: they keep the money for when they join a season
    Store.wallets[win] = (Store.wallets[win] || 0) + gold;
    Store.saveWallets();
    G.log(`🏝️ 서바이벌: 시즌 밖의 ${displayName(Store.player(win))}이(가) ${gold.toLocaleString()}G 획득 (다음 시즌 참가 시 합류)`);
    return { lost: true, msg: `😢 ${displayName(Store.player(win))}이(가) 우승… (${fmt(gold)}G는 그 플레이어의 몫)` };
}

// ------------------------------------------------------------------ 💼 job corner
// One job per turn, picked at random among jobs that leave ≥30 s of play time.
// Wait 10 s, get paid (high pay is rare); the job's time comes off the timer.
export function jobView(pid, turn, onChange, payout) {
    const wrap = h("div.job-view");
    if (!G.canWork(pid)) { wrap.append(h("p.notice", "💼 이번 턴에는 이미 일했습니다.")); return wrap; }
    const ok = CAREERS.filter(c => turn.remaining - c.cut >= 30);
    wrap.append(
        h("p.muted", "버튼을 누르면 직업이 랜덤으로 정해집니다 (일한 뒤에도 플레이 시간이 30초 이상 남는 직업만). 10초 일하고 보수를 받으면, 그 직업의 시간만큼 플레이 시간이 줄어듭니다."),
        h("div.job-list", CAREERS.map(c => h("div.job-chip" + (ok.includes(c) ? "" : ".no"), h("span", c.emoji), h("b", c.name), h("small", `-${Math.round(c.cut / 60)}분 · ${fmt(c.min)}~${fmt(c.max)}G${c.card ? " 또는 알파벳 카드" : ""}`)))));
    if (!ok.length) { wrap.append(h("p.notice", "⏰ 남은 시간이 부족해 할 수 있는 직업이 없습니다.")); return wrap; }
    const btn = h("button.btn.gold.big", { onclick: async () => {
        btn.disabled = true;
        const chips = [...wrap.querySelectorAll(".job-chip:not(.no)")];
        const job = ok[Math.floor(Math.random() * ok.length)];
        for (let k = 0; k < 16; k++) { chips.forEach(c => c.classList.remove("hot")); chips[k % chips.length].classList.add("hot"); Sound.tick(); await sleep(70 + k * 12); }
        chips.forEach(c => c.classList.remove("hot"));
        chips[ok.indexOf(job)]?.classList.add("chosen");
        if (!(await confirmBox(`${job.emoji} ${job.name}\n플레이 시간 -${Math.round(job.cut / 60)}분 · 보수 ${fmt(job.min)}~${fmt(job.max)}G\n일할까요?`, "일하기", "그만두기"))) { btn.disabled = false; chips.forEach(c => c.classList.remove("chosen")); return; }
        const was = turn.running; turn.running = false;
        const count = h("div.task-count", "10"), bar = h("div.task-bar", h("i"));
        const ov = taskOverlay(h("div.task-scene.job", h("div.worker", avatar(pid, 150), h("span.pick", job.emoji)), h("div.task-label", `${job.emoji} ${job.name} 근무 중…`), count, bar));
        bar.firstChild.style.transition = "width 10s linear";
        await sleep(50); bar.firstChild.style.width = "100%";
        for (let i = 10; i > 0; i--) { count.textContent = i; Sound.click(); await sleep(1000); }
        ov.remove();
        const card = job.card && Math.random() < job.card ? ALPHABET[Math.floor(Math.random() * ALPHABET.length)] : null;
        const gold = card ? 0 : skewLow(job.min, job.max, 100, 2.5);
        G.payJob(pid, job, gold, card);
        turn.running = was;
        await payout(pid, gold, card ? `💼 보수 대신 알파벳 카드 ${card}를 받았다! (-${Math.round(job.cut / 60)}분)` : `💼 ${job.name} 보수 (-${Math.round(job.cut / 60)}분)`);
        onChange();
    } }, "💼 직업 뽑기");
    wrap.append(h("div.row.center", btn));
    return wrap;
}

// ------------------------------------------------------------------ 👹 NPC corner
// remaining-time thresholds (seconds) at which NPCs attack during this turn
export function scheduleNpc(remaining) {
    const p = 0.4 + Math.random() * 0.3;
    if (Math.random() >= p || remaining < 60) return [];
    const n = 1 + Math.floor(Math.random() * 3);
    return Array.from({ length: n }, () => 20 + Math.floor(Math.random() * (remaining - 40))).sort((a, b) => b - a);
}
const NPC_FX = { steal: "💸", give: "💰", hp: "💥", heal: "💖", curse: "🗯️", kill: "☠️", nomove: "🪄" };
export async function npcAttack(pid) {
    const npc = NPCS[Math.floor(Math.random() * NPCS.length)];
    const move = npc.moves[Math.floor(Math.random() * npc.moves.length)];
    const kind = move.steal ? "steal" : move.give ? "give" : move.hp ? (move.hp > 0 ? "heal" : "hp") : move.kill ? "kill" : move.nomove ? "nomove" : "curse";
    const art = h("div.npc-art", { style: { "--c": npc.color } }, h("span.npc-body", npc.emoji), h("span.npc-weapon", npc.art), h("small", npc.name));
    const target = h("div.npc-target", avatar(pid, 120, { effect: false }));
    const say = h("div.npc-say", `${npc.emoji} ${npc.name}이(가) 나타났다!`);
    const fxl = h("div.npc-fx");
    const res = h("div.npc-res");
    const box = h("div.npc-pop.k-" + kind, h("div.npc-arena", art, fxl, target), say, res);
    const m = modal(box, { title: "⚠️ NPC 습격!", closable: false });
    Sound.boom();
    await sleep(1100);
    // the NPC lunges and its weapon flies at the player
    art.classList.add("lunge");
    const proj = h("span.npc-proj", kind === "curse" ? "🗯️" : kind === "give" || kind === "heal" ? "✨" : npc.art);
    fxl.append(proj);
    Sound.whoosh();
    await sleep(650);
    proj.remove();
    const out = G.npcHit(pid, npc, move);
    fxl.append(h("span.npc-burst", NPC_FX[kind] || "💥"));
    if (kind === "hp" || kind === "kill" || kind === "steal") target.classList.add("hurt");
    if (kind === "kill") { Sound.boom(); target.classList.add("dead"); } else if (kind === "give" || kind === "heal") Sound.cash(); else Sound.hit();
    say.textContent = kind === "curse" ? `${npc.emoji} "${CURSES[Math.floor(Math.random() * CURSES.length)]}"` : `${npc.emoji} ${npc.name}의 공격!`;
    res.replaceChildren(h("b", out.kill ? "☠️ 즉사!!! 이번 시즌 탈락…" : out.none ? (kind === "steal" ? "가진 돈이 모자라 아무것도 뺏기지 않았다" : "무기가 없어 아무 일도 없었다") :
        out.gold ? (out.gold > 0 ? `💰 +${fmt(out.gold)}G 받았다!` : `💸 ${fmt(-out.gold)}G 뺏겼다!`) :
        out.hp != null ? (out.hp >= 0 ? `💖 HP +${out.hp}` : `💥 HP ${out.hp}`) :
        out.weapon ? `🪄 ${WEAPON_BY_ID[out.weapon]?.name || out.weapon} → 🫥 No Move` : "…저주만 퍼붓고 사라졌다"));
    box.append(h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
    setTimeout(() => m.close(), 7000);
    await m.closed;
    return out;
}
