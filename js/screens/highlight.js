// =====================================================================
// 🎬 Gamblers Highlight — a rest corner: press 감상하기, watch one random
// highlight moment (≤ 15 s) and get 1,000 ~ 10,000 G. Once per season.
//
// The moments are NOT videos: Store.recordHighlight() keeps a tiny replay
// record (who / what / how much — a few hundred bytes) the moment it
// happens, and this file re-plays it as an animated scene. 400 records
// ≈ 100 KB, so no cloud file storage is needed (settings key "highlights").
//   scene scripts: jackpot 30s · npc_kill 20s · battle 30s · death 20s · handpay 20s
//   beg 10s · champion 10s · lotto 20s · promo 20s · poop 15s · bunker 15s · kidnap 15s · arena 15s — all played back in ≤ 15 s (HL_MAX_SEC)
// =====================================================================
import * as RV from "../game/revival.js";
import { h, sleep, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import { avatar, displayName } from "../ui/profile.js";
import { SLOT_BY_ID } from "../slots/configs.js";
import { CASINO_BY_ID } from "../data/casino.js";
import { WEAPON_BY_ID, LOC_BY_ID } from "../data/catalog.js";

export const HL_REWARD = [1000, 10000];
// every replay lasts at most 15 s: longer scene scripts (written for `sec`) are played faster to fit
export const HL_MAX_SEC = 15;
export const clipSec = K => Math.min(K.sec, HL_MAX_SEC);
export const HL_KINDS = {
    jackpot: { sec: 30, emoji: "💰", label: "MAXI 이상 잭팟 당첨" },
    npc_kill: { sec: 20, emoji: "👹", label: "NPC 기습 즉사" },
    battle: { sec: 30, emoji: "⚔️", label: "플레이어 배틀" },
    death: { sec: 20, emoji: "☠️", label: "바로 사망" },
    handpay: { sec: 20, emoji: "🤲", label: "핸드페이" },
    beg: { sec: 10, emoji: "🥺", label: "구걸로 돈 벌기" },
    champion: { sec: 10, emoji: "👑", label: "최종 우승" },
    lotto: { sec: 20, emoji: "🎟️", label: "로또 당첨" },
    promo: { sec: 20, emoji: "🗳️", label: "홍보 프로필 당첨" },
    poop: { sec: 15, emoji: "💩", label: "돈벌기 똥 맞기" },
    bunker: { sec: 15, emoji: "🔐", label: "Bunker Key 금고" },
    kidnap: { sec: 15, emoji: "⛓️", label: "납치 공간 탈출" },
    starve: { sec: 15, emoji: "🍽️", label: "굶주림으로 사망" },
    arena: { sec: 15, emoji: "🏟️", label: "아레나 배틀" }
};
const nm = pid => displayName(Store.player(pid));
const list = () => (Store.highlights?.list || []).filter(x => HL_KINDS[x.kind] && (x.pid == null || Store.player(x.pid)) && (x.a == null || Store.player(x.a)));
const gameName = id => SLOT_BY_ID[id]?.name || CASINO_BY_ID[id]?.name || id || "";
const placeName = id => LOC_BY_ID[id] ? `${LOC_BY_ID[id].emoji || ""} ${LOC_BY_ID[id].name}` : "";
const watched = pid => !!G.S()?.ps?.[pid]?.hlWatched;

// ---------------------------------------------------------------- corner (turn tab)
export function highlightView(pid, { onChange = () => { }, hold = null } = {}) {
    const wrap = h("div.gh-corner");
    const draw = () => {
        const all = list(), counts = {};
        for (const x of all) counts[x.kind] = (counts[x.kind] || 0) + 1;
        const done = watched(pid);
        wrap.replaceChildren(
            h("div.gh-hero", h("div.gh-reel", "🎞️"), h("div",
                h("h3", "🎬 Gamblers Highlight"),
                h("p", "잠시 쉬어가세요! 지금까지 Gamblers에서 나온 하이라이트 순간 하나를 랜덤으로 감상하면 ", h("b", `${fmt(HL_REWARD[0])} ~ ${fmt(HL_REWARD[1])} G`), "를 드립니다."),
                h("small.muted", "시즌당 1회 · 감상하는 동안 턴 시간은 계속 흐릅니다 (NPC는 나타나지 않습니다)"),
                RV.inRevival(pid) ? h("p.notice.rv-reset", "🔄 패자부활전: 이번 시즌에 이미 감상했어도 패자부활전에서는 다시 감상할 수 있습니다! (끝나면 원래대로)") : null)),
            h("div.gh-kinds", Object.entries(HL_KINDS).map(([k, K]) => h("span" + (counts[k] ? ".on" : ""), `${K.emoji} ${K.label} ${counts[k] || 0}`))),
            done ? h("div.gh-done", "✅ 이번 시즌에 이미 감상했습니다. 다음 시즌에 또 만나요!")
                : !all.length ? h("div.gh-done", "🎞️ 아직 저장된 하이라이트가 없습니다. 시즌이 진행되면 하이라이트가 쌓입니다!")
                    : h("button.btn.gold.huge", { onclick: async () => {
                        const r = await watchHighlight(pid, hold);
                        if (r) onChange();
                        draw();
                    } }, "▶ 감상하기"));
    };
    draw();
    return wrap;
}

export async function watchHighlight(pid, hold = null) {
    const s = G.S(), ps = s?.ps?.[pid];
    const all = list();
    if (!ps || ps.hlWatched || !all.length) return null;
    const x = all[Math.floor(Math.random() * all.length)];
    x.plays = (x.plays || 0) + 1; Store.saveHighlights(); // play count → most-played replays are dropped first at the 400 cap
    const reward = Math.round((HL_REWARD[0] + Math.random() * (HL_REWARD[1] - HL_REWARD[0])) / 100) * 100;
    ps.hlWatched = true; // decided up front: one try per season
    Store.saveSeason();
    const release = hold ? hold() : () => { };
    const act = Activity.hold();
    try {
        await play(x);
        ps.money += reward;
        G.log(`🎬 ${G.name(pid)} Gamblers Highlight 감상 보상 +${fmt(reward)}G`);
        Store.saveSeason(true);
        await rewardPopup(pid, reward);
    } finally { act(); release(); }
    return reward;
}

// ---------------------------------------------------------------- player
// play(x): the TV overlay — header, the scene, captions, a progress bar
export async function play(x, { preview = false } = {}) {
    const K = HL_KINDS[x.kind];
    const screen = h("div.gh-screen.k-" + x.kind);
    const cap = h("div.gh-cap");
    const len = clipSec(K), speed = len / K.sec; // speed < 1 → the scene script runs faster
    const bar = h("i"), secs = h("small", `0 / ${len}s`);
    const ov = h("div.gh-ov",
        h("div.gh-tv",
            h("div.gh-top", h("b", "🎬 GAMBLERS HIGHLIGHT"), h("span", `${K.emoji} ${K.label}`), h("small", [x.season ? `SEASON ${x.season}` : "", x.round ? `ROUND ${x.round}` : "", x.at ? new Date(x.at).toLocaleDateString() : ""].filter(Boolean).join(" · "))),
            screen, cap,
            h("div.gh-prog", h("div.gh-bar", bar), secs),
            preview ? h("button.btn.small.ghost.gh-x", { onclick: () => { T.stop = true; } }, "닫기") : null));
    document.body.append(ov);
    const t0 = performance.now(), ms = len * 1000;
    const T = {
        stop: false,
        cap(text) { cap.replaceChildren(h("span", text)); },
        // wait until `sec` seconds into the clip
        async at(sec) { while (!T.stop && performance.now() - t0 < sec * speed * 1000) await sleep(60); }
    };
    const tick = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); bar.style.width = k * 100 + "%"; secs.textContent = `${Math.min(len, Math.floor(k * len))} / ${len}s`; }, 100);
    try {
        await (SCENES[x.kind] || (async () => { }))(screen, x, T);
        await T.at(K.sec);
    } catch (e) { console.warn("highlight", e); }
    clearInterval(tick);
    ov.classList.add("out"); await sleep(350); ov.remove();
}

const pic = (pid, size, cls = "") => h("div.gh-p" + (cls ? "." + cls : ""), avatar(pid, size, { effect: false }), h("b", nm(pid)));
const count = async (el, to, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { el.textContent = fmt(to * (1 - Math.pow(1 - (performance.now() - t0) / ms, 3))); await sleep(40); } el.textContent = fmt(to); };
const rain = (st, chars, n = 26) => st.append(h("div.gh-rain", Array.from({ length: n }, (_, i) => h("i", { style: { "--x": `${Math.random() * 100}%`, "--d": `${(Math.random() * 2).toFixed(2)}s` } }, chars[i % chars.length]))));
const SYMS = ["🍒", "💎", "7️⃣", "🔔", "⭐", "🍀", "🍋", "👑"];

const SCENES = {
    // 💰 30 s: intro → reels spin and stop one by one → suspense → JACKPOT banner + count-up
    async jackpot(st, x, T) {
        const cfg = SLOT_BY_ID[x.game];
        st.style.setProperty("--gh-bg", cfg?.theme?.bg || "linear-gradient(180deg,#3b0764,#0b0714)");
        const cells = Array.from({ length: 9 }, () => h("span", SYMS[Math.floor(Math.random() * SYMS.length)]));
        const reels = h("div.gh-reels", cells);
        st.append(h("div.gh-cab", h("div.gh-gname", gameName(x.game) || "SLOT"), reels), pic(x.pid, 84, "corner"));
        T.cap(`${nm(x.pid)}, ${gameName(x.game)}에서 스핀 중…`);
        await T.at(4);
        T.cap("🎰 릴이 돌아갑니다…");
        let spinning = [0, 1, 2];
        const spin = setInterval(() => { for (let i = 0; i < 9; i++) if (spinning.includes(i % 3)) cells[i].textContent = SYMS[Math.floor(Math.random() * SYMS.length)]; Sound.tick(); }, 90);
        for (const [sec, col] of [[9, 0], [12, 1], [17, 2]]) {
            await T.at(sec);
            spinning = spinning.filter(c => c !== col);
            for (let r = 0; r < 3; r++) cells[r * 3 + col].textContent = r === 1 ? "👑" : SYMS[Math.floor(Math.random() * SYMS.length)];
            Sound.stop();
            if (col === 1) { T.cap("두 개…! 마지막 릴은…?"); reels.classList.add("tease"); }
        }
        clearInterval(spin);
        reels.classList.remove("tease");
        Sound.boom();
        await T.at(18);
        const num = h("b", "0");
        st.append(h("div.gh-banner.b-jp", h("div", `${x.tier} JACKPOT`), h("div.gh-amt", num, " G")));
        rain(st, ["🪙", "💰", "✨"]);
        Sound.jackpot(); confetti(80, ["🪙", "💰", "✨"]);
        T.cap(`🎉 ${nm(x.pid)} — ${x.tier} 잭팟 당첨!`);
        await count(num, x.amount || 0, 5000);
        Sound.fanfare();
    },
    // 👹 20 s: calm play → warning → the NPC jumps in → instant death
    async npc_kill(st, x, T) {
        const me = pic(x.pid, 110);
        st.append(h("div.gh-place", placeName(x.loc) || "🎰 Casino"), me);
        T.cap(`${nm(x.pid)}, 평화롭게 플레이 중…`);
        for (let k = 0; k < 6; k++) { await T.at(0.8 + k * 0.7); Sound.tick(); }
        await T.at(5); st.classList.add("gh-shake"); Sound.tease(); T.cap("…!? 뭔가 다가온다!");
        await T.at(7);
        st.append(h("div.gh-npc", x.npc?.art || x.npc?.emoji || "👹"), h("div.gh-npcname", `${x.npc?.emoji || ""} ${x.npc?.name || "NPC"}`));
        Sound.scream?.();
        T.cap(`${x.npc?.name || "NPC"}의 기습 공격!!`);
        await T.at(9); st.classList.add("gh-flash"); Sound.boom(); me.classList.add("dead");
        await T.at(10.5); st.classList.remove("gh-shake");
        st.append(h("div.gh-banner.b-dead", "☠️ 즉사"));
        T.cap(`☠️ ${nm(x.pid)} ${x.why || "즉사"}${x.rank ? ` · 최종 ${x.rank}위` : ""}`);
        await T.at(13); st.append(h("div.gh-grave", "🪦"));
    },
    // ⚔️ 30 s: two fighters trade blows until the loser's HP hits 0
    async battle(st, x, T) {
        const w = (ids = []) => (ids.map(id => WEAPON_BY_ID[id]?.emoji).filter(Boolean).concat(["👊"]))[0];
        const side = (pid, flip) => { const hp = h("i", { style: { width: "100%" } }); const el = h("div.gh-fighter" + (flip ? ".r" : ""), h("div.gh-hp", hp), avatar(pid, 96, { effect: false }), h("b", nm(pid))); return { el, hp, v: 100 }; };
        const A = side(x.a, false), B = side(x.b, true);
        const fx = h("div.gh-hit");
        st.append(h("div.gh-arena", A.el, h("div.gh-vs", x.emo ? "🐾 VS" : "⚔️ VS"), B.el), fx);
        T.cap(`${x.final ? "🏁 결승 " : ""}${x.emo ? "EmoMon 배틀" : "무기 배틀"}: ${nm(x.a)} vs ${nm(x.b)}`);
        await T.at(3);
        const endHp = Math.max(8, Math.min(90, x.hpA ?? 40));
        const hits = 12;
        for (let k = 0; k < hits; k++) {
            await T.at(4 + k * 1.6);
            const aHits = k % 2 === 0, tgt = aHits ? B : A;
            const left = hits - k;
            tgt.v = aHits ? Math.max(0, tgt.v - Math.ceil(tgt.v / Math.ceil(left / 2))) : Math.max(endHp, tgt.v - Math.round((100 - endHp) / 6));
            tgt.hp.style.width = tgt.v + "%";
            fx.textContent = aHits ? w(x.weapons?.[0]) : w(x.weapons?.[1]);
            fx.className = "gh-hit " + (aHits ? "to-r" : "to-l");
            tgt.el.classList.remove("hurt"); void tgt.el.offsetWidth; tgt.el.classList.add("hurt");
            Sound.hit();
            if (k === hits - 3) T.cap("💥 접전! 누가 이길까…?");
        }
        B.v = 0; B.hp.style.width = "0%"; B.el.classList.add("dead"); Sound.boom();
        await T.at(24);
        st.append(h("div.gh-banner", "K.O.!"));
        A.el.classList.add("win");
        T.cap(`🏆 ${nm(x.winner ?? x.a)} 승리!`);
        Sound.fanfare(); confetti(50, ["⚔️", "🏆", "✨"]);
    },
    // 🏟️ 15 s: an arena EmoMon battle — my monster vs a random player's (or an NPC Battler's) monster
    async arena(st, x, T) {
        const side = (pid, label, mon, flip) => {
            const hp = h("i", { style: { width: "100%" } });
            const face = pid != null && Store.player(pid) ? avatar(pid, 88, { effect: false }) : h("div.gh-npc", "🤖");
            const el = h("div.gh-fighter" + (flip ? ".r" : ""), h("div.gh-hp", hp), face, h("b", label), mon ? h("small", `🐾 ${mon}`) : null);
            return { el, hp, v: 100 };
        };
        const A = side(x.pid, nm(x.pid), x.mon, false), B = side(x.foe, x.foe != null && Store.player(x.foe) ? nm(x.foe) : (x.foeLabel || "NPC Battler"), x.foeMon, true);
        const fx = h("div.gh-hit");
        st.append(h("div.gh-place", "🏟️ ARENA"), h("div.gh-arena", A.el, h("div.gh-vs", "🐾 VS"), B.el), fx);
        T.cap(`🏟️ 아레나: ${nm(x.pid)} vs ${x.foeLabel || "NPC Battler"}`);
        await T.at(2);
        const win = x.won ? A : B, lose = x.won ? B : A;
        for (let k = 0; k < 8; k++) {
            await T.at(2.5 + k * 1.2);
            const toB = k % 2 === 0, tgt = toB ? B : A;
            tgt.v = tgt === lose ? Math.max(0, Math.round(100 - (k + 2) * 12)) : Math.max(25, tgt.v - 9);
            tgt.hp.style.width = tgt.v + "%";
            fx.textContent = ["💥", "⚡", "🔥", "💫"][k % 4];
            fx.className = "gh-hit " + (toB ? "to-r" : "to-l");
            tgt.el.classList.remove("hurt"); void tgt.el.offsetWidth; tgt.el.classList.add("hurt");
            Sound.hit();
        }
        lose.v = 0; lose.hp.style.width = "0%"; lose.el.classList.add("dead"); Sound.boom();
        await T.at(12);
        st.append(h("div.gh-banner", x.won ? "WIN!" : "K.O."));
        win.el.classList.add("win");
        T.cap(x.won ? `🏆 ${nm(x.pid)} 아레나 승리!${x.gold ? ` +${fmt(x.gold)}G` : x.pts ? ` +${x.pts}P` : ""}` : `💥 ${nm(x.pid)} 아레나 패배…`);
        if (x.won) { Sound.fanfare(); confetti(40, ["🏟️", "🏆", "✨"]); } else Sound.lose();
    },
    // ☠️ 20 s
    async death(st, x, T) {
        const me = pic(x.pid, 120);
        st.append(h("div.gh-place", placeName(x.loc) || ""), me);
        T.cap(`${nm(x.pid)}…`);
        for (let k = 0; k < 8; k++) { await T.at(1 + k * 0.9); Sound.heartbeat(); }
        await T.at(8.5); st.classList.add("gh-flash"); Sound.boom(); me.classList.add("dead");
        st.append(h("div.gh-banner.b-dead", "☠️ 바로 사망"));
        T.cap(`☠️ ${x.why || "사망"}${x.rank ? ` · 최종 ${x.rank}위` : ""}`);
        await T.at(12); st.append(h("div.gh-grave", "🪦"));
    },
    // 🍽️ 15 s: the food gauge runs dry, the stomach growls, the HP drains → starved
    async starve(st, x, T) {
        const me = pic(x.pid, 120);
        const gauge = h("div.gh-food", h("i", { style: { width: "30%" } }), h("span", "🍚 FOOD"));
        st.append(h("div.gh-place", placeName(x.loc) || ""), me, gauge);
        T.cap(`${nm(x.pid)}… 배가 너무 고프다…`);
        for (let k = 0; k < 5; k++) { await T.at(0.6 + k * 0.8); gauge.querySelector("i").style.width = Math.max(0, 30 - k * 7.5) + "%"; Sound.tick(); }
        await T.at(4.6); st.append(h("div.gh-growl", "꼬르륵… 🌀")); Sound.heartbeat(); T.cap("🍽️ 식량 게이지 0 — 먹을 것이 없다!");
        for (let k = 0; k < 4; k++) { await T.at(5.6 + k * 0.8); Sound.heartbeat(); }
        await T.at(9); st.classList.add("gh-flash"); Sound.boom(); me.classList.add("dead");
        st.append(h("div.gh-banner.b-dead", "🍽️ 굶주림으로 바로 사망"));
        T.cap(`☠️ ${nm(x.pid)} 굶주림으로 바로 사망했습니다${x.rank ? ` · 최종 ${x.rank}위` : ""}`);
        await T.at(12); st.append(h("div.gh-grave", "🪦"));
    },
    // 🤲 20 s: a hand keeps bringing cash bundles
    async handpay(st, x, T) {
        const pile = h("div.gh-pile"), num = h("b", "0");
        st.append(pic(x.pid, 110), h("div.gh-hand", "🫴💵"), pile, h("div.gh-banner.b-hp", "HANDPAY ", num, " G"));
        T.cap(`🤲 ${nm(x.pid)}${x.game ? ` · ${gameName(x.game)}` : ""} — 직원이 직접 현금으로 지급합니다!`);
        count(num, x.amount || 0, 9000);
        for (let k = 0; k < 14; k++) { await T.at(1 + k * 1.1); pile.append(h("i", "💵")); Sound.cash(); if (k % 4 === 0) Sound.fanfare(); }
        confetti(60, ["💵", "🪙"]);
    },
    // 🥺 10 s
    async beg(st, x, T) {
        const bowl = h("div.gh-bowl", "🥣"), num = h("b", "+0 G");
        st.append(h("div.gh-place", placeName(x.loc) || "🥣 거지쉼터"), pic(x.pid, 100), bowl, h("div.gh-banner.b-beg", num));
        T.cap(`🥺 ${nm(x.pid)}: "한 푼만 줍쇼…"`);
        await T.at(2.5);
        rain(st, ["🪙", "🪙", "💵"], 16);
        for (let k = 0; k < 6; k++) { await T.at(3 + k * 0.6); Sound.coin(); }
        await count({ set textContent(v) { num.textContent = `+${v} G`; } }, x.amount || 0, 2500);
        T.cap(`💰 구걸로 ${fmt(x.amount)} G를 벌었다!`);
    },
    // 👑 10 s
    async champion(st, x, T) {
        const me = pic(x.pid, 140, "champ");
        st.append(h("div.gh-crown", "👑"), me, h("div.gh-banner", `SEASON ${x.season ?? ""} CHAMPION`));
        T.cap(`👑 시즌 ${x.season ?? ""} 최종 우승: ${nm(x.pid)}!`);
        Sound.fanfare(); confetti(120, ["👑", "🎉", "🏆", "✨"]);
        await T.at(4); Sound.jackpot(); rain(st, ["🎉", "✨", "🏆"]);
        if (x.runner != null) { await T.at(6); T.cap(`🥈 준우승 ${nm(x.runner)} · 🏆 ${nm(x.pid)} 축하합니다!`); }
    },
    // 🎟️ 20 s: the ball machine spins → the winning profile
    async lotto(st, x, T) {
        const drum = h("div.gh-drum", Array.from({ length: 8 }, (_, i) => h("i", { style: { "--i": i } }, "🎱")));
        st.append(drum, h("div.gh-place", `${x.emoji || "🎟️"} ${x.name || "로또"} · ${x.entries || "?"}자리`));
        T.cap(`${x.emoji || "🎟️"} ${x.name || "로또"} 추첨 중…`);
        for (let k = 0; k < 16; k++) { await T.at(0.5 + k * 0.5); Sound.heartbeat(); }
        await T.at(9); drum.remove(); Sound.boom();
        const num = h("b", "0");
        st.append(pic(x.pid, 130, "champ"), h("div.gh-banner.b-jp", h("div", "🎉 당첨!"), h("div.gh-amt", num, " G")));
        rain(st, ["🪙", "🎟️", "✨"]);
        T.cap(`🎉 ${nm(x.pid)} — ${x.name || "로또"} 당첨!`);
        Sound.jackpot(); confetti(80, ["🎟️", "🪙", "✨"]);
        await count(num, x.amount || 0, 4000);
    },
    // 🗳️ 20 s: spotlight on the promo profile, votes pour in, the gift box opens
    async promo(st, x, T) {
        const votes = h("b", "0");
        const card = h("div.gh-promo", avatar(x.pid, 110, { effect: false }), h("b", nm(x.pid)), h("small", "\"Gamblers의 빛이 되고 싶어요!\""), h("div.gh-votes", "🗳️ ", votes, " 표"));
        st.append(h("div.gh-spot"), card);
        T.cap("🗳️ 인기 투표 진행 중…");
        for (let k = 1; k <= 20; k++) { await T.at(0.5 + k * 0.4); votes.textContent = k; Sound.tick(); }
        await T.at(9.5); card.classList.add("win"); Sound.fanfare();
        T.cap(`🎉 ${nm(x.pid)}의 홍보 프로필이 당첨되었습니다!`);
        await T.at(12);
        const box = h("div.gh-gift", "🎁");
        st.append(box); Sound.tease();
        await T.at(15); box.textContent = x.emoji || "🎁"; box.classList.add("open"); Sound.cash(); confetti(60, ["🎁", "✨"]);
        T.cap(`🎁 선물: ${x.prize || "?"}`);
    },
    // 💩 15 s: poop flies in from every side, sewage pours, then the pay
    async poop(st, x, T) {
        const me = pic(x.pid, 120);
        const splats = h("div.gh-splats");
        me.append(splats);
        st.append(h("div.gh-place", placeName(x.loc) || "💪 돈벌기"), h("div.gh-flies", Array.from({ length: 5 }, (_, i) => h("i", { style: { "--i": i } }, "🪰"))), me);
        T.cap(`💩 ${nm(x.pid)}, 돈을 벌기 위해 10초 동안 똥을 맞기로 했다…`);
        await T.at(1.5);
        for (let k = 0; k < 14; k++) {
            await T.at(1.8 + k * 0.6);
            const p = h("i.gh-poop", { style: { "--sx": `${(Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 120)}px`, "--sy": `${Math.random() * 200 - 100}px` } }, "💩");
            st.append(p); setTimeout(() => p.remove(), 700);
            setTimeout(() => { splats.append(h("i", { style: { left: `${10 + Math.random() * 75}%`, top: `${5 + Math.random() * 70}%`, rotate: `${Math.random() * 60 - 30}deg` } }, "💩")); me.classList.remove("hurt"); void me.offsetWidth; me.classList.add("hurt"); }, 480);
            Sound.poop?.();
            if (k === 5) { st.append(h("div.gh-sewage")); Sound.splash?.(); T.cap("🚽 하수구 물까지 쏟아진다…!"); }
            if (k === 10) T.cap("😵 냄새가… 버텨라…!");
        }
        await T.at(11);
        const num = h("b", "0");
        st.append(h("div.gh-banner.b-beg", "💩 +", num, " G"));
        T.cap(`💰 ${nm(x.pid)}, 똥을 맞고 ${fmt(x.amount)} G를 벌었다… 씻고 오세요!`);
        Sound.cash();
        await count(num, x.amount || 0, 2500);
    },
    // 🔐 15 s: the key glints → the vault door opens → the picks come out one by one
    async bunker(st, x, T) {
        const key = h("div.gh-key", "🔑");
        st.append(h("div.gh-place", placeName(x.loc) || "🔐 Bunker"), pic(x.pid, 90, "corner"), key);
        T.cap(`🔦 ${nm(x.pid)}, 어두운 벙커를 뒤지는 중…`);
        for (let k = 0; k < 4; k++) { await T.at(0.6 + k * 0.6); Sound.tick(); }
        await T.at(3); key.classList.add("found"); Sound.bonus(); T.cap("🔑 Bunker Key 발견!!");
        await T.at(5.5);
        key.remove();
        const door = h("div.gh-vault", h("div.gh-vdoor", "🔒"));
        st.append(door); Sound.tease();
        T.cap("🔐 숨겨진 금고 문이 열린다…");
        await T.at(7.5); door.classList.add("open"); Sound.boom(); door.firstChild.textContent = "🔓";
        const items = x.items?.length ? x.items : [{ emoji: "💰", name: "금은보화" }];
        const row = h("div.gh-loot");
        st.append(row);
        T.cap(x.random ? "🎲 랜덤 코너에서 1개를 뽑는다…!" : `🎁 원하는 아이템 ${items.length}개를 골랐다!`);
        for (let k = 0; k < items.length; k++) {
            await T.at(9 + k * 1.3);
            row.append(h("div.gh-lootitem", h("span", items[k].emoji), h("small", items[k].name)));
            Sound.cash();
        }
        await T.at(9 + items.length * 1.3 + 0.3);
        confetti(60, ["💰", "🪙", "💎", "🔑"]); Sound.fanfare();
        T.cap(`🔐 ${nm(x.pid)} 획득: ${items.map(i => `${i.emoji} ${i.name}`).join(" · ")}`);
    },
    // ⛓️ 15 s: tied up in the dark room → the boss strikes → rats turn into gold → the escape
    async kidnap(st, x, T) {
        const me = pic(x.pid, 100);
        st.append(h("div.gh-place", "⛓️ 테러리스트 납치 공간"), h("div.gh-chains", "⛓️"), me);
        T.cap(`⛓️ ${nm(x.pid)}, 테러리스트에게 납치되었다…`);
        for (let k = 0; k < 3; k++) { await T.at(0.5 + k * 0.7); Sound.heartbeat(); }
        const hits = x.hits || [];
        if (hits.length) {
            const boss = h("div.gh-npc", "🦹");
            st.append(boss, h("div.gh-npcname", "🦹 Terrorist Boss"));
            Sound.boom();
            for (let k = 0; k < hits.length; k++) {
                await T.at(2.8 + k * 1.2);
                st.classList.add("gh-shake"); Sound.hit(); me.classList.remove("hurt"); void me.offsetWidth; me.classList.add("hurt");
                T.cap(`${hits[k].emoji || "🦹"} ${hits[k].npc || "Terrorist Boss"}: ${hits[k].what}`);
                setTimeout(() => st.classList.remove("gh-shake"), 400);
            }
            await T.at(2.8 + hits.length * 1.2 + 0.2); boss.remove();
            st.querySelector(".gh-npcname")?.remove();
        } else { await T.at(3); T.cap("🦹 Terrorist Boss가 노려보고 있다…"); }
        const t0 = hits.length ? 3 + hits.length * 1.2 : 4;
        if (x.rats > 0) {
            T.cap(`🐀 쥐들이 돌아다닌다! 잡으면 골드로 변한다…`);
            const rats = Array.from({ length: Math.min(5, x.rats) }, (_, i) => h("i.gh-rat", { style: { "--i": i, top: `${20 + Math.random() * 60}%` } }, "🐀"));
            st.append(...rats);
            for (let k = 0; k < rats.length; k++) { await T.at(t0 + 0.6 + k * 0.5); rats[k].textContent = "💰"; rats[k].classList.add("got"); Sound.coin(); }
            T.cap(`🐀 쥐 ${x.rats}마리 → 💰 +${fmt(x.ratGold || 0)} G`);
            await T.at(t0 + 1 + rats.length * 0.5 + 0.8);
            rats.forEach(r => r.remove());
        }
        const e = x.escape || {};
        T.cap(`🚪 탈출 시도!! …${e.label || ""}`);
        st.classList.add("gh-shake"); Sound.tease();
        await T.at(Math.max(11, t0 + 3)); st.classList.remove("gh-shake");
        if (e.dead) { st.classList.add("gh-flash"); Sound.boom(); me.classList.add("dead"); st.append(h("div.gh-banner.b-dead", "☠️ 처형")); }
        else if (e.freed) { st.querySelector(".gh-chains")?.remove(); me.classList.add("champ"); Sound.fanfare(); confetti(50, ["🕊️", "✨"]); st.append(h("div.gh-banner", "🕊️ 탈출 성공!")); }
        else { Sound.lose?.(); st.append(h("div.gh-banner.b-dead", "⛓️ 탈출 실패")); }
        T.cap(`${e.freed ? "🕊️" : e.dead ? "☠️" : "⛓️"} ${e.msg || ""}`);
    }
};

async function rewardPopup(pid, reward) {
    const num = h("b", "0");
    const btn = h("button.btn.gold.big", "받기");
    const ov = h("div.gh-ov.reward", h("div.gh-reward", h("div.gh-reel", "🎬"), h("h2", "감상 완료!"), avatar(pid, 100), h("div.gh-amt", "+", num, " G"), h("p.muted", "쉬어가기 보상이 지급되었습니다"), btn));
    document.body.append(ov);
    Sound.cash(); confetti(50, ["🪙", "🎬", "✨"]);
    await count(num, reward, 1500);
    await new Promise(r => btn.onclick = r);
    ov.classList.add("out"); await sleep(300); ov.remove();
    toast(`🎬 감상 보상 +${fmt(reward)} G`, "ok");
}
