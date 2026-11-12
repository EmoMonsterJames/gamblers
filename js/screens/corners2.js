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
import { WEAPON_BY_ID, CAREERS, NPCS, CURSES, ALPHABET, NPC_ALIGN, npcAlign, PEDDLER_STOCK, ITEM_BY_ID, catalogEntry } from "../data/catalog.js";
import { canPay, pay, priceLabel, checkGoods, giveGoods, art as shopArt, desc as shopDesc } from "./shop.js";
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
        audio.volume = 0.2; // a quarter of the old 0.8 — quiet background listening
        await new Promise(res => { audio.addEventListener("loadedmetadata", res, { once: true }); audio.addEventListener("error", res, { once: true }); setTimeout(res, 2500); });
        const d = audio.duration;
        if (isFinite(d) && d > LISTEN + 1) audio.currentTime = Math.random() * (d - LISTEN); // a random 30 s section
        audio.play().catch(() => { });
    } else {
        synth = ["lounge_jazz", "synthwave", "monkey_funk", "tropical_steel", "bigband_swing"][Math.floor(Math.random() * 5)];
        Sound.bgm(synth, 0.125); // a quarter of the normal BGM level
    }
    await sleep(50); bar.firstChild.style.width = "100%";
    for (let i = LISTEN; i > 0; i--) { count.textContent = i; await sleep(1000); }
    audio?.pause(); if (synth) Sound.bgmStop();
    // the 30 s are part of the turn's play time (taken off by hand if the clock was paused)
    if (turn && !turn.running) turn.remaining = Math.max(0, turn.remaining - LISTEN);
    ov.remove();
    return { gold: skewLow(100, 5000, 10), msg: "🎧 좋은 음악이었다!" };
}

// ------------------------------------------------------------------ ❓ guess the player
// A hidden profile; up to 3 facts can be opened (each one lowers the prize),
// then pick the right name out of 5. Wrong = 0 G.
export const GUESS_PRIZE = [[10000, 30000], [5000, 20000], [2000, 10000], [500, 1000]];
const GUESS_FIELDS = [["country", "국적"], ["job", "직업"], ["school", "학교"], ["ethnicity", "종족"], ["age_group", "나이대"], ["gender", "성별"], ["preference", "성향"]];
const GENDER_KO = { male: "남성", female: "여성" };
const shuffled = a => [...a].sort(() => Math.random() - 0.5);
export function guessCorner(pid) {
    const pool = Store.players.filter(p => p.id !== pid);
    if (pool.length < 5) return Promise.resolve(null);
    const target = pool[Math.floor(Math.random() * pool.length)];
    const facts = shuffled(GUESS_FIELDS.filter(([k]) => String(target[k] || "").trim())).slice(0, 3)
        .map(([k, label]) => ({ label, value: k === "gender" ? (GENDER_KO[target[k]] || target[k]) : target[k] }));
    const options = shuffled([target, ...shuffled(pool.filter(p => p.id !== target.id)).slice(0, 4)]);
    let opened = 0, done = false;
    const range = () => GUESS_PRIZE[Math.min(opened, 3)];
    const prizeEl = h("div.gp-prize");
    const factBox = h("div.gp-facts");
    const photo = h("div.gp-photo", h("span", "?"));
    const drawPrize = () => prizeEl.replaceChildren(h("small", `정보 ${opened}/3개 확인 · 맞히면`), h("b", `${fmt(range()[0])} ~ ${fmt(range()[1])} G`));
    const drawFacts = () => factBox.replaceChildren(...facts.map((f, i) => i < opened
        ? h("div.gp-fact.open", h("small", f.label), h("b", f.value))
        : h("button.gp-fact", { disabled: i !== opened, onclick: () => { if (done) return; opened++; Sound.click(); drawFacts(); drawPrize(); } },
            h("small", `정보 ${i + 1}`), h("b", i === opened ? `🔍 ${f.label} 확인하기` : "🔒"))));
    drawPrize(); drawFacts();
    return new Promise(resolve => {
        const answer = async (p, btn) => {
            if (done) return; done = true;
            const ok = p.id === target.id;
            m.box.querySelectorAll(".gp-opt").forEach(b => { b.disabled = true; if (+b.dataset.id === target.id) b.classList.add("right"); });
            if (!ok) btn.classList.add("wrong");
            photo.replaceChildren(avatar(target.id, 150, { effect: false }));
            photo.classList.add("shown");
            const [lo, hi] = range();
            const gold = ok ? Math.round((lo + Math.random() * (hi - lo)) / 100) * 100 : 0;
            ok ? (Sound.bonus(), confetti(40)) : Sound.lose();
            await sleep(2200);
            m.close();
            resolve(ok ? { gold, msg: `❓ 정답! ${displayName(target)} (정보 ${opened}개 확인)` } : { lost: true, msg: `❓ 오답… 정답은 ${displayName(target)}` });
        };
        const m = modal(h("div.guess-player",
            h("p.muted", "물음표 뒤의 플레이어는 누구일까요? 정보는 최대 3개까지 하나씩 볼 수 있지만, 볼 때마다 상금이 줄어듭니다. 준비되면 아래에서 정답을 고르세요."),
            h("div.gp-top", photo, h("div.gp-side", prizeEl, h("ul.gp-table", GUESS_PRIZE.map(([lo, hi], i) => h("li", h("span", i === 0 ? "확인 없이" : `${i}개 확인`), h("span", `${fmt(lo)}~${fmt(hi)} G`)))))),
            factBox,
            h("div.gp-opts", options.map(p => { const b = h("button.gp-opt", { "data-id": String(p.id), onclick: () => answer(p, b) }, displayName(p), h("small", p.player_name && p.name_ko ? p.player_name : "")); return b; }))),
            { title: "❓ 플레이어 이름 맞추기", closable: false, wide: true });
    });
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
const NPC_FX = { steal: "💸", give: "💰", hp: "💥", heal: "💖", curse: "🗯️", kill: "☠️", nomove: "🪄", idle: "💤", hope: "🌈", gift: "🎁", shop: "🧳", copy: "📋" };
const alignBadge = n => { const a = NPC_ALIGN[npcAlign(n)]; return h("span.npc-align." + a.cls, a.label); };
export async function npcAttack(pid) {
    const npc = NPCS[Math.floor(Math.random() * NPCS.length)];
    const move = npc.moves[Math.floor(Math.random() * npc.moves.length)];
    const kind = move.steal ? "steal" : move.give ? "give" : move.hp ? (move.hp > 0 ? "heal" : "hp") : move.kill ? "kill" : move.nomove ? "nomove"
        : move.idle ? "idle" : move.hope ? "hope" : move.gift ? "gift" : move.shop ? "shop" : move.copy ? "copy" : "curse";
    const friendly = ["give", "heal", "idle", "hope", "gift", "shop"].includes(kind);
    const art = h("div.npc-art", { style: { "--c": npc.color } }, h("span.npc-body", npc.emoji), h("span.npc-weapon", npc.art), h("small", npc.name, " ", alignBadge(npc)));
    const target = h("div.npc-target", avatar(pid, 120, { effect: false }));
    const say = h("div.npc-say", `${npc.emoji} ${npc.name}이(가) 나타났다!`);
    const fxl = h("div.npc-fx");
    const res = h("div.npc-res");
    const box = h("div.npc-pop.k-" + kind, h("div.npc-arena", art, fxl, target), say, res);
    const m = modal(box, { title: friendly ? "✨ NPC 등장!" : "⚠️ NPC 습격!", closable: false });
    friendly ? Sound.bonus() : Sound.boom();
    await sleep(1100);
    // the NPC lunges and its weapon flies at the player
    art.classList.add("lunge");
    const proj = h("span.npc-proj", kind === "curse" ? "🗯️" : friendly ? "✨" : npc.art);
    fxl.append(proj);
    Sound.whoosh();
    await sleep(650);
    proj.remove();
    const out = G.npcHit(pid, npc, move);
    if (out.blocked) {
        fxl.append(h("span.npc-burst", "🛡️"));
        Sound.stop();
        say.textContent = `${npc.emoji} ${npc.name}의 공격!`;
        res.replaceChildren(h("b", `🎫 NPC 공격 Block 권 발동! 공격을 막았다 (남은 Block ${out.left}회)`));
    } else {
        fxl.append(h("span.npc-burst", NPC_FX[kind] || "💥"));
        if (kind === "hp" || kind === "kill" || kind === "steal" || (kind === "copy" && out.hp)) target.classList.add("hurt");
        if (kind === "kill") { Sound.boom(); target.classList.add("dead"); } else if (kind === "give" || kind === "heal" || kind === "gift") Sound.cash(); else if (friendly) Sound.bonus(); else Sound.hit();
        say.textContent = kind === "curse" ? `${npc.emoji} "${CURSES[Math.floor(Math.random() * CURSES.length)]}"` : kind === "hope" ? `${npc.emoji} "${out.hope}"` : friendly ? `${npc.emoji} ${npc.name}` : `${npc.emoji} ${npc.name}의 공격!`;
        res.replaceChildren(h("b", out.kill ? "☠️ 즉사!!! 이번 시즌 탈락…" : out.none ? (kind === "steal" ? "가진 돈이 모자라 아무것도 뺏기지 않았다" : kind === "copy" ? "복사할 무기가 없어 아무 일도 없었다" : "무기가 없어 아무 일도 없었다") :
            out.idle ? (out.idle === "애교부리기" ? "🐹 애교를 부리고 갔다… 귀여워!" : "🤖 No Move — 아무것도 하지 않았다") :
            out.hope ? "🌈 희망의 메세지를 전해 주고 떠났다" :
            out.gift ? `🎁 ${ITEM_BY_ID[out.gift]?.name || out.gift} 선물을 받았다! (가방에 들어감)` :
            out.shop ? "🧳 보따리상점 OPEN! 싸게 팔아요~" :
            out.copied ? `📋 내 무기 ${WEAPON_BY_ID[out.weapon]?.emoji || ""} ${WEAPON_BY_ID[out.weapon]?.name}을(를) 복사해서 공격! ${out.hp ? `💥 HP ${out.hp}` : "(배틀 전용 무기라 효과 없음)"}` :
            out.gold ? (out.gold > 0 ? `💰 +${fmt(out.gold)}G 받았다!` : `💸 ${fmt(-out.gold)}G 뺏겼다!`) :
            out.hp != null ? (out.hp >= 0 ? `💖 HP +${out.hp}` : `💥 HP ${out.hp}`) :
            out.weapon ? `🪄 ${WEAPON_BY_ID[out.weapon]?.name || out.weapon} → 🫥 No Move` : "…저주만 퍼붓고 사라졌다"));
    }
    box.append(h("button.btn.gold.big", { onclick: () => m.close() }, out.shop ? "🧳 상점 보기" : "확인"));
    if (!out.shop) setTimeout(() => m.close(), 7000);
    await m.closed;
    if (out.shop) await peddlerShop(pid);
    return out;
}

// ------------------------------------------------------------------ 🧳 보따리상점 (peddler NPC)
// 5 random goods from PEDDLER_STOCK, cheap. One purchase per player per season.
export async function peddlerShop(pid) {
    const ps = G.S().ps[pid];
    const stock = [...PEDDLER_STOCK].sort(() => Math.random() - 0.5).slice(0, 5);
    const done = !!ps.peddlerBought;
    const grid = h("div.shop-grid");
    const m = modal(h("div.peddler",
        h("p.muted", done ? "🧳 이번 시즌에 이미 보따리상점에서 구매했습니다 (플레이어당 1회). 구경만 하세요~" : "🧳 보따리상인이 아무거나 5개를 싸게 팝니다! 플레이어당 딱 1번만 살 수 있어요."),
        h("p.wallet", `💰 ${fmt(ps.money)} G · 💎 ${fmt(ps.points)} P`),
        grid, h("div.row.center", h("button.btn.ghost", { onclick: () => m.close() }, "그냥 가기"))), { title: "🧳 보따리상점 OPEN", wide: true });
    const render = () => grid.replaceChildren(...stock.map(it => {
        const e = catalogEntry(it.cat, it.id);
        if (!e) return null;
        const cost = { pts: it.pts || 0, gold: it.gold || 0 };
        const ok = !ps.peddlerBought && canPay(ps, cost);
        return h("div.sitem" + (e.rare || e.kind === "special" ? ".rare" : ""),
            h("div.sitem-art", shopArt(it.cat, e)), h("div.sitem-name", e.name), h("div.sitem-desc", shopDesc(it.cat, e)),
            h("button.btn.small" + (ok ? ".gold" : ".ghost"), { disabled: !ok, onclick: async () => {
                if (ps.peddlerBought || !canPay(ps, cost)) return;
                if (!(await checkGoods(ps, it.cat, it.id, e))) return;
                pay(ps, cost); giveGoods(pid, it.cat, it.id);
                ps.peddlerBought = true;
                G.log(`🧳 ${G.name(pid)} 보따리상점에서 ${e.name} 구매`);
                Store.saveSeason(true);
                Sound.coin(); confetti(30, ["🧳", "✨"]);
                render();
            } }, priceLabel(cost)));
    }));
    render();
    await m.closed;
}

// ------------------------------------------------------------------ 👹 NPC info (map popup)
const moveText = m => m.steal ? `💸 골드 강탈 ${fmt(m.steal[0])}~${fmt(m.steal[1])}G (가진 돈이 부족하면 실패)`
    : m.give ? `💰 골드 선물 ${fmt(m.give[0])}~${fmt(m.give[1])}G`
    : m.hp ? (m.hp > 0 ? `💖 HP +${m.hp} 회복` : `💥 HP ${m.hp} 공격`)
    : m.curse ? "🗯️ 저주 (말뿐, 피해 없음)"
    : m.kill ? "☠️ 즉사 — 바로 탈락!"
    : m.nomove ? "🪄 무기 1개를 No Move로 바꿈"
    : m.idle ? (m.idle === "애교부리기" ? "🐹 애교부리기 (공격하지 않음)" : "🫥 No Move (공격하지 않음)")
    : m.copy ? "📋 COPY — 플레이어의 무기를 복사해서 공격"
    : m.hope ? "🌈 희망의 메세지 (\"잘될거에요\" · \"대박나세요\" · \"우승할거에요\")"
    : m.gift ? `🎁 ${ITEM_BY_ID[m.gift]?.name || m.gift} 선물`
    : m.shop ? "🧳 보따리상점 OPEN (랜덤 5개 할인 판매 · 플레이어당 1회 구매)" : "?";
// loc: the map · active: NPCs are out on this map this round (season only)
export function npcInfo(loc, { active = null } = {}) {
    const mapP = Math.round(G.npcMapChance(loc) * 100);
    const pct = x => (Math.round(x * 1000) / 10) + "%";
    modal(h("div.npc-info",
        h("div.npc-info-head",
            active == null ? null : h("p" + (active ? ".notice.warn" : ".notice"), active ? "⚠️ 이번 라운드에 이 맵에는 NPC가 출몰합니다!" : "🛡️ 이번 라운드에 이 맵에는 NPC가 나오지 않습니다."),
            h("ul.npc-rules",
                h("li", `NPC는 모든 맵에 나오지 않고, 라운드마다 무작위로 정해진 맵에만 나타납니다. 이 맵이 뽑힐 확률: `, h("b", mapP + "%")),
                h("li", "NPC가 있는 맵에서 플레이하면 턴마다 ", h("b", "40~70%"), " 확률로 습격을 받고, 습격은 플레이 중 무작위 시점에 ", h("b", "1~3회"), " 일어납니다."),
                h("li", `습격마다 아래 NPC ${NPCS.length}명 중 1명이 같은 확률(`, h("b", pct(1 / NPCS.length)), ")로 나오고, 그 NPC의 기술 중 하나를 같은 확률로 씁니다."),
                h("li", "NPC 종류: ", alignBadge({ align: "evil", moves: [] }), " 공격만 함 · ", alignBadge({ align: "neutral", moves: [] }), " 공격도 하고 돕기도 함 · ", alignBadge({ align: "good", moves: [] }), " 돕기만 함"),
                h("li", "🎫 NPC 공격 Block 권(일반 상점)이 있으면 해로운 공격을 자동으로 막아 줍니다."))),
        h("div.npc-cards", NPCS.map(n => h("div.npc-card", { style: { "--c": n.color } },
            h("div.npc-card-head", h("span.npc-card-ico", n.emoji), h("div", h("b", n.name, " ", alignBadge(n)), h("small", `무기: ${n.art} · 등장 ${pct(1 / NPCS.length)}`))),
            h("ul", n.moves.map(m => h("li" + (m.kill ? ".deadly" : m.give || m.hp > 0 || m.gift || m.hope || m.shop ? ".good" : ""), h("span", moveText(m)), h("small", pct(1 / n.moves.length))))),
            h("small.muted", `습격 1회당 이 NPC의 기술 확률 = ${pct(1 / NPCS.length)} × 기술별 확률`))))),
        { title: `👹 NPC 정보 · ${loc.emoji} ${loc.name}`, wide: true });
}
