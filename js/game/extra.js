// =====================================================================
// 2026-11 additions — pure rules (screens/extraCorners.js draws them):
//   🤒 player diseases (flu / cancer)      🚧 restricted-zone doors
//   ⛓️ terrorist kidnap room               🍬 Sugar Level · 🌋 Magma · 🎡 Death Wheel
//   🏟️ Arena (1:1 EmoMon battle)           💬 Community board (persistent)
//   🧳 EmoMon slot tickets                  🔷 Type Casino / ⚔️ Battle Town doors
// State: ps.dis = { flu, cancer } · ps.kidnap = { round } · ps.arenaUsed · ps.cmPosted (season number)
//        t.sugar (0~100) · s.typeGate = { round, type }
// =====================================================================
import { CONFIG } from "../config.js";
import { Store } from "../core/store.js";
import { LOC_BY_ID, ITEM_BY_ID } from "../data/catalog.js";
import { KIDNAP_ROOM } from "../data/regions.js";
import { CM_BY_ID, COMMENT_FEE, COMMUNITY_OK } from "../data/community.js";
import { categoryOf } from "../data/races.js";
import { S, log, name, alive, killPlayer, setLocation, noteRefuse, emitEvent } from "./season.js";

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const ps_ = pid => S()?.ps?.[pid];

// ---------------------------------------------------------------- 🚧 restricted zone: who may walk in
const norm = v => String(v || "").trim().toLowerCase();
export const isVip = pid => Store.results.some(r => r.playerId === +pid && r.rank != null && r.rank <= 10);
export const isChampion = pid => Store.results.some(r => r.playerId === +pid && r.rank === 1);
export const WHO_TEXT = { baby: "Age가 Baby인 플레이어", female: "성별이 Female인 플레이어", male: "성별이 Male인 플레이어", senior: "Age가 Senior인 플레이어",
    lgbt: "Preference가 Straight가 아닌 플레이어", vip: "시즌 TOP 10 전적이 있는 플레이어", other: "종족이 Other Animal · Other Shape · Bug · Fruit · Veggie · Flower · Others 카테고리인 플레이어" };
// 👽 the race categories (data/races.js) that count as "Other" — every other category may not walk into the Other Casino
export const OTHER_RACE_CATS = ["Other Animal", "Other Shape", "Bug", "Fruit", "Veggie", "Flower", "Others"];
export function whoOk(pid, who) {
    const p = Store.player(pid);
    if (!p) return false;
    switch (who) {
        case "baby": return norm(p.age_group) === "baby";
        case "senior": return norm(p.age_group) === "senior";
        case "female": return genderLetter(p) === "F";
        case "male": return genderLetter(p) === "M";
        case "lgbt": return !!norm(p.preference) && norm(p.preference) !== "straight";
        case "vip": return isVip(pid);
        case "other": return OTHER_RACE_CATS.includes(categoryOf(p.ethnicity)); // 👽 Other Casino: only these race categories
    }
    return true;
}
// profile corner letters: gender F / M / O · handler D / J
export const genderLetter = p => { const g = norm(p?.gender); return ["female", "f", "여", "여성", "woman"].includes(g) ? "F" : ["male", "m", "남", "남성", "man"].includes(g) ? "M" : g ? "O" : ""; };
export const handlerLetter = p => { const x = norm(p?.handler); return x === "dylan" ? "D" : x === "james" ? "J" : ""; };

// ---------------------------------------------------------------- 🐾 EmoMon helpers (season state only — no import cycle)
const monsOf = pid => ps_(pid)?.emo?.mons || [];
// the EmoMon module fills these in (emomon/game.js → registerEmoHelpers) so this file never imports it at load time
let EM = null;
export function registerEmoHelpers(api) { EM = api; }
export const ownsMon = pid => monsOf(pid).length > 0;
export const ownsTypes = (pid, types) => !!EM && types.some(t => EM.ownsType(pid, t));

// 🔷 Type Casino: 3 random attributes per round (shown on the map) — owning a monster of any of them lets you in
export function typeGateTypes() {
    const s = S();
    if (!s) return ["Normal", "Fire", "Water"];
    if (s.typeGate?.round !== s.round || !Array.isArray(s.typeGate.types)) {
        const list = [...(EM?.TYPE_LIST || ["Normal", "Fire", "Water", "Grass", "Electric"])];
        const types = [];
        while (types.length < 3 && list.length) types.push(list.splice(Math.floor(Math.random() * list.length), 1)[0]);
        s.typeGate = { round: s.round, types };
        Store.saveSeason();
    }
    return s.typeGate.types;
}
export const typeGateType = () => typeGateTypes().join(" / ");
export const typeGateLabel = () => `이번 라운드 허용 속성 ${typeGateTypes().map(t => `'${t}'`).join(", ")}`;

// ---------------------------------------------------------------- 🧳 EmoMon slots: 3 free + tickets, max 10
export const EMO_FREE_SLOTS = 3, EMO_MAX_SLOTS = 10;
export const emoSlots = pid => Math.min(EMO_MAX_SLOTS, EMO_FREE_SLOTS + (ps_(pid)?.emo?.extraSlots || 0));
export function useSlotTicket(pid) {
    const ps = ps_(pid);
    if (!(ps?.items.emo_slot > 0)) return { ok: false, why: "이모몬스터 슬롯 확장권이 없습니다" };
    if (emoSlots(pid) >= EMO_MAX_SLOTS) return { ok: false, why: `슬롯은 최대 ${EMO_MAX_SLOTS}칸입니다` };
    ps.items.emo_slot--;
    (ps.emo ||= {}).extraSlots = (ps.emo.extraSlots || 0) + 1;
    log(`🧳 ${name(pid)} 이모몬스터 슬롯 확장 → ${emoSlots(pid)}칸`);
    Store.saveSeason(true);
    return { ok: true, slots: emoSlots(pid) };
}

// ---------------------------------------------------------------- 🤒 player diseases
export const DISEASES = {
    flu: { id: "flu", name: "독감", en: "Flu", emoji: "🤧", hp: 5, cure: "flu_cure" },
    cancer: { id: "cancer", name: "암", en: "Cancer", emoji: "🎗️", hp: 10, cure: "cancer_cure" }
};
// 🔔 the screens redraw the player's picture / side card when a disease comes or goes
const sickEvent = (pid, kind) => { try { document.dispatchEvent(new CustomEvent("gb:sick", { detail: { pid, kind } })); } catch { } };
export const diseasesOf = pid => Object.keys(ps_(pid)?.dis || {}).filter(k => ps_(pid).dis[k] && DISEASES[k]);
export const isSick = pid => diseasesOf(pid).length > 0;
export function infect(pid, kind, why = "") {
    const ps = ps_(pid);
    if (!ps || ps.out || !DISEASES[kind]) return false;
    if (ps.dis?.[kind]) return false; // already sick with it
    (ps.dis ||= {})[kind] = true;
    log(`${DISEASES[kind].emoji} ${name(pid)} ${DISEASES[kind].name}에 걸림${why ? ` (${why})` : ""}`);
    Store.saveSeason(true);
    sickEvent(pid, kind);
    return true;
}
export function cure(pid, kind, how = "") {
    const ps = ps_(pid);
    if (!ps?.dis?.[kind]) return false;
    delete ps.dis[kind];
    log(`💚 ${name(pid)} ${DISEASES[kind].name} 치료${how ? ` (${how})` : ""}`);
    Store.saveSeason(true);
    sickEvent(pid, kind);
    return true;
}
// 💉 / 💊 cure items (inventory)
export function useCureItem(pid, itemId) {
    const ps = ps_(pid), kind = ITEM_BY_ID[itemId]?.cure;
    if (!kind || !(ps?.items[itemId] > 0)) return { ok: false, why: "치료제가 없습니다" };
    if (!ps.dis?.[kind]) return { ok: false, why: `${DISEASES[kind].name}에 걸려 있지 않습니다` };
    ps.items[itemId]--;
    cure(pid, kind, ITEM_BY_ID[itemId].name);
    return { ok: true, kind };
}
// new round: every sick player loses HP (flu −5 · cancer −10); HP 0 → dead
export function diseaseTick() {
    const s = S(), out = [];
    for (const pid of alive()) {
        const list = diseasesOf(pid);
        if (!list.length) continue;
        const ps = s.ps[pid];
        const dmg = list.reduce((a, k) => a + DISEASES[k].hp, 0);
        ps.hp -= dmg;
        log(`🤒 ${name(pid)} ${list.map(k => DISEASES[k].name).join(" · ")} — HP −${dmg}`);
        if (ps.hp <= 0) {
            if (alive().length <= 1) { ps.hp = 1; continue; } // never kill the last one
            const rank = alive().length;
            Object.assign(ps, { out: true, outRound: s.round, rank, hp: 0 });
            s.history.push({ round: s.round, npcDeath: true, eliminated: pid, rank, why: `${list.map(k => DISEASES[k].name).join("·")}으로 사망` });
            log(`☠️ ${name(pid)} 질병으로 사망 (${rank}위)`);
            out.push({ pid, dmg, dead: true, list });
        } else out.push({ pid, dmg, list });
    }
    return out;
}
// a map's infection roll on arrival: Cursed Casino 30% flu · Radioactive Town 30% cancer · 북극 10% flu
export function arrivalInfection(pid, loc) {
    const got = [];
    const flu = loc.fluChance || (loc.region === "arctic" ? 0.1 : 0);
    if (flu && Math.random() < flu && infect(pid, "flu", loc.name)) got.push("flu");
    if (loc.cancerChance && Math.random() < loc.cancerChance && infect(pid, "cancer", loc.name)) got.push("cancer");
    return got;
}

// ---------------------------------------------------------------- 🎡 Death Door: the wheel of death
// HP −30 15% · 즉사 15% · HP −10 10% · HP −20 15% · 바로 입장 25% · HP −50 5% · (the last 15%: 10,000G 강탈)
export const DEATH_WHEEL = [
    { id: "hp30", label: "HP −30", hp: 30, w: 15, c: "#b91c1c" },
    { id: "kill", label: "☠️ 바로 사망", kill: true, w: 15, c: "#000" },
    { id: "hp10", label: "HP −10", hp: 10, w: 10, c: "#ef4444" },
    { id: "hp20", label: "HP −20", hp: 20, w: 15, c: "#dc2626" },
    { id: "free", label: "🚪 바로 입장", w: 25, c: "#16a34a" },
    { id: "hp50", label: "HP −50", hp: 50, w: 5, c: "#7f1d1d" },
    { id: "gold", label: "💸 10,000G 강탈", gold: 10000, w: 15, c: "#a16207" }
];
export function spinDeathWheel() {
    let x = Math.random() * DEATH_WHEEL.reduce((a, s) => a + s.w, 0);
    for (const sl of DEATH_WHEEL) { if ((x -= sl.w) < 0) return sl; }
    return DEATH_WHEEL[0];
}
// → { dead, hp, gold }
export function applyHarm(pid, { hp = 0, gold = 0, kill = false } = {}, place = "") {
    const ps = ps_(pid);
    // (🎭 death shield: killPlayer() → false, the player stays at HP 1)
    if (kill) { if (killPlayer(pid, `${place}에서 사망`) === false) return { hp: ps.hp, shield: true }; return { dead: true }; }
    let lost = 0;
    if (gold) { lost = Math.min(gold, Math.max(0, ps.money)); ps.money -= lost; log(`💸 ${name(pid)} ${place} ${lost.toLocaleString()}G 잃음`); }
    if (hp) {
        if (ps.hp <= hp) { if (killPlayer(pid, `${place}에서 HP가 바닥나 사망`) === false) return { hp: ps.hp, shield: true }; return { dead: true }; }
        ps.hp -= hp; log(`💔 ${name(pid)} ${place} HP −${hp}`);
    }
    Store.saveSeason(true);
    return { hp: ps.hp, gold: lost };
}

// ---------------------------------------------------------------- 🍬 Sugar Casino
// 🐛 a Bug-type EmoMonster in the party → every rise is only 0~15% (instead of 5~30 / 5~15)
export const SUGAR_PLAY = [5, 30], SUGAR_IDLE = [5, 15], SUGAR_BUG = [0, 15];
export const sugarBug = pid => ownsTypes(pid, ["Bug"]);
export function addSugar(pid, range) {
    const t = S()?.turn;
    if (!t || t.pid !== pid) return null;
    const [a, b] = sugarBug(pid) ? SUGAR_BUG : range;
    const add = rint(a, b);
    if (!add) return { add, level: t.sugar || 0 };
    t.sugar = Math.min(100, (t.sugar || 0) + add);
    t.stats.sugarMax = Math.max(t.stats.sugarMax || 0, t.sugar); // 🍬 sugar_max missions
    if (t.sugar >= 100) { killPlayer(pid, "🍬 설탕중독으로 사망"); return { add, level: 100, dead: true }; }
    Store.saveSeason();
    return { add, level: t.sugar };
}

// 🩸 혈당관리제: only inside Sugar Casino — Sugar Level −10~30%
export function useSugarCure(pid) {
    const ps = ps_(pid), t = S()?.turn;
    if (!(ps?.items.sugar_cure > 0)) return { ok: false, why: "혈당관리제가 없습니다" };
    if (!t || t.pid !== pid || !LOC_BY_ID[t.loc]?.sugar) return { ok: false, why: "🩸 혈당관리제는 Sugar Casino 안에서만 쓸 수 있습니다" };
    const down = Math.min(t.sugar || 0, rint(10, 30));
    ps.items.sugar_cure--;
    t.sugar = (t.sugar || 0) - down;
    log(`🩸 ${name(pid)} 혈당관리제 사용 → Sugar Level −${down}% (${t.sugar}%)`);
    Store.saveSeason(true);
    return { ok: true, down, level: t.sugar };
}

// ---------------------------------------------------------------- ⛓️ terrorist kidnap room
export const KIDNAP_ID = KIDNAP_ROOM.id;
export const isKidnapped = pid => !!ps_(pid)?.kidnap;
export function kidnap(pid) {
    const s = S(), ps = ps_(pid);
    ps.kidnap = { round: s.round };
    log(`🥷 ${name(pid)} 테러리스트에게 납치됨!`);
    if (s.turn?.pid === pid) { s.turn.npc = null; setLocation(KIDNAP_ID, { teleport: true }); s.turn.region = "kidnap"; s.turn.kidnapIn = s.turn.remaining; }
    Store.saveSeason(true);
}
// ⛓️ in the room: the turn can't end for the first 3 minutes there, and never before the escape was tried
export const KIDNAP_LOCK = 180;
export const kidnapLockLeft = t => Math.max(0, KIDNAP_LOCK - ((t?.kidnapIn ?? t?.remaining ?? 0) - (t?.remaining ?? 0)));
// 🐀 rats run around the room: click one → it turns into 100~1,000 G (at most RAT_MAX a turn, RAT_ON_SCREEN at once)
export const RAT_MAX = 15, RAT_ON_SCREEN = 4;
export function catchRat(pid) {
    const t = S()?.turn, ps = ps_(pid);
    if (!t || t.pid !== pid || t.loc !== KIDNAP_ID) return null;
    const L = (t.kidnapLog ||= { hits: [], rats: 0, ratGold: 0 });
    if (L.rats >= RAT_MAX) return null;
    const gold = rint(10, 100) * 10;
    ps.money += gold; L.rats++; L.ratGold += gold;
    log(`🐀 ${name(pid)} 납치 공간에서 쥐를 잡아 +${gold.toLocaleString()}G`);
    Store.saveSeason();
    return { gold, left: RAT_MAX - L.rats };
}
export const ratsLeft = () => RAT_MAX - (S()?.turn?.kidnapLog?.rats || 0);
// what happened in the room this turn (boss attacks · rats) → 🎬 a "kidnap" highlight once the escape is decided
export function noteKidnap(pid, { hit } = {}) {
    const t = S()?.turn;
    if (!t || t.pid !== pid) return;
    const L = (t.kidnapLog ||= { hits: [], rats: 0, ratGold: 0 });
    if (hit) L.hits.push(hit);
}
function kidnapHighlight(pid, escape) {
    const L = S()?.turn?.kidnapLog || { hits: [], rats: 0, ratGold: 0 };
    Store.recordHighlight("kidnap", { pid, hits: L.hits.slice(-3), rats: L.rats, ratGold: L.ratGold, escape });
}
// the 6 escape buttons (weights in %) — the outcome is drawn when a button is pressed
export const ESCAPE = [
    { id: "pay_gold", label: "100,000G 지불 후 탈출", w: 30 },
    { id: "pay_pts", label: "100P 지불 후 탈출", w: 25 },
    { id: "kill", label: "플레이어 바로 사망", w: 5 },
    { id: "hope", label: "희망이 보인다!!", w: 30 },
    { id: "attack", label: "테러리스트 공격 (HP −20)", w: 5 },
    { id: "rob", label: "테러리스트 돈뺏기 (−5,000G)", w: 5 }
];
export const HOPE_BOXES = [
    { id: "gold", label: "3,000G 획득", emoji: "💰" }, { id: "pts", label: "5P 획득", emoji: "💎" },
    { id: "free", label: "탈출하기", emoji: "🚪" }, { id: "hp", label: "HP +10 회복", emoji: "❤️" }
];
export const escapeTried = () => !!S()?.turn?.escapeTried;
// → { kind, freed, dead, msg, hope }
export function tryEscape(pid) {
    const s = S(), t = s.turn, ps = ps_(pid);
    if (!t || t.escapeTried) return null;
    t.escapeTried = true;
    let x = Math.random() * 100, pick = ESCAPE[0];
    for (const e of ESCAPE) { if ((x -= e.w) < 0) { pick = e; break; } }
    const out = { kind: pick.id, label: pick.label };
    if (pick.id === "pay_gold") {
        if (ps.money >= 100000) { ps.money -= 100000; out.freed = true; out.msg = "100,000G를 내고 풀려났다!"; }
        else out.msg = "100,000G가 없어 탈출에 실패했다…";
    } else if (pick.id === "pay_pts") {
        if (ps.points >= 100) { ps.points -= 100; out.freed = true; out.msg = "100P를 내고 풀려났다!"; }
        else out.msg = "100P가 없어 탈출에 실패했다…";
    } else if (pick.id === "kill") { out.dead = true; out.msg = "테러리스트에게 처형당했다…"; }
    else if (pick.id === "attack") { ps.hp = Math.max(1, ps.hp - 20); out.msg = "테러리스트의 공격! HP −20"; }
    else if (pick.id === "rob") { const g = Math.min(5000, Math.max(0, ps.money)); ps.money -= g; out.msg = `테러리스트가 ${g.toLocaleString()}G를 뺏어 갔다`; }
    else { out.hope = true; out.msg = "희망이 보인다!! 상자 4개 중 하나를 고르세요"; }
    log(`⛓️ ${name(pid)} 탈출 시도 → ${out.msg}`);
    if (!out.hope) kidnapHighlight(pid, { label: pick.label, msg: out.msg, freed: !!out.freed, dead: !!out.dead });
    if (out.freed) freeKidnap(pid);
    if (out.dead) { killPlayer(pid, "⛓️ 납치 공간에서 처형"); return out; }
    Store.saveSeason(true);
    return out;
}
export function openHopeBox(pid) {
    const ps = ps_(pid);
    const box = HOPE_BOXES[Math.floor(Math.random() * HOPE_BOXES.length)];
    if (box.id === "gold") ps.money += 3000;
    else if (box.id === "pts") ps.points += 5;
    else if (box.id === "hp") ps.hp = Math.min(CONFIG.START_HP, ps.hp + 10);
    else freeKidnap(pid);
    log(`🎁 ${name(pid)} 희망 상자 → ${box.label}`);
    kidnapHighlight(pid, { label: "희망이 보인다!!", msg: `희망 상자 → ${box.emoji} ${box.label}`, freed: box.id === "free", hope: true });
    Store.saveSeason(true);
    return box;
}
export function freeKidnap(pid) {
    const ps = ps_(pid);
    if (!ps?.kidnap) return;
    ps.kidnap = null;
    log(`🕊️ ${name(pid)} 납치 공간 탈출!`);
    const t = S()?.turn; if (t?.pid === pid) t.stats.kidnapFreed = true; // ⛓️ kidnap_freed missions
}

// ---------------------------------------------------------------- 🏟️ Arena: 1:1 EmoMon battle (2 per season)
export const ARENA_PER_SEASON = 2, ARENA_PRIZE = [8000, 30000], ARENA_PRIZE_PTS = [10, 50], ARENA_NPC = 0.3;
export const arenaLeft = pid => Math.max(0, ARENA_PER_SEASON - (ps_(pid)?.arenaUsed || 0));
// remember every season player's battle monster, so later seasons can meet it (persistent)
export function keepMons() {
    const s = S();
    if (!s || !EM || s.sandbox) return;
    let n = 0;
    for (const pid of s.roster || []) {
        const bm = EM.battleMon(pid), m = bm && !bm.rent ? bm : monsOf(pid).find(x => !x.rent); // 🏷️ rented monsters are not theirs
        if (!m) continue;
        const { uid, sid, nature, types, weapons, traits } = m;
        Store.emokeep[pid] = { uid, sid, nature, types, weapons: [...(weapons || [])], traits: [...(traits || [])], season: s.number };
        n++;
    }
    if (n) Store.saveEmokeep();
}
// a random opponent player — a season participant, or a NON-season player who owned a real EmoMonster in an earlier
// season (remembered in Store.emokeep). Non-season players without one never come up. Never the player themself.
// Season players with no monster yet get a generated one.
export function arenaPlayerPool(pid) {
    return Store.players.map(p => +p.id).filter(id => id !== +pid && (arenaInSeason(id) || Store.emokeep?.[id]?.sid != null));
}
export const arenaInSeason = foePid => (S()?.roster || []).some(id => +id === +foePid);
// the opponent's monster for the arena: a COPY at full HP / PP and no status — the real one is never touched
export function arenaFoeMon(foePid) {
    const live = S()?.ps?.[foePid] ? (EM?.battleMon(foePid) || monsOf(foePid)[0]) : null; // non-season players have no ps
    const src = live || Store.emokeep?.[foePid];
    if (!src) return null;
    return { ...structuredClone(src), uid: "arena-" + (src.uid || foePid), hp: null, pp: {}, diseases: [], from: "arena" };
}
export function useArena(pid) { const ps = ps_(pid); ps.arenaUsed = (ps.arenaUsed || 0) + 1; Store.saveSeason(true); }
// 🏆 a win pays EITHER a gold prize (8,000~30,000G) OR a point prize (10~50P) — 50 / 50 → { gold, pts }
export function arenaWin(pid, foeLabel) {
    const ps = ps_(pid);
    const gold = Math.random() < 0.5 ? Math.round(rint(...ARENA_PRIZE) / 100) * 100 : 0;
    const pts = gold ? 0 : rint(...ARENA_PRIZE_PTS);
    ps.money += gold; ps.points += pts;
    log(`🏟️ ${name(pid)} 아레나 승리 vs ${foeLabel} → ${gold ? `+${gold.toLocaleString()}G` : `+${pts}P`}`);
    const t = S()?.turn; if (t?.pid === pid) t.stats.arenaWin = (t.stats.arenaWin || 0) + 1; // 🏟️ arena_win missions
    emitEvent("emoWin", pid, { where: "arena" });
    Store.saveSeason(true);
    return { gold, pts };
}
export function arenaLose(pid, foeLabel) { log(`🏟️ ${name(pid)} 아레나 패 vs ${foeLabel}`); Store.saveSeason(true); }

// ---------------------------------------------------------------- 💬 Community (persistent board)
export const posts = () => (Store.community?.posts || []);
export const postedThisSeason = pid => (ps_(pid)?.cmPosted === S()?.number) || posts().some(p => +p.pid === +pid && p.season === S()?.number);
// the door: 60% in (kept for the round, so re-opening the tab doesn't re-roll)
// null = not tried this round yet (the player presses 입장하기 first — ui/doorGate.js)
export const communityDoorState = pid => { const d = ps_(pid)?.cmDoor; return d?.round === S().round ? d.ok : null; };
export function communityDoor(pid) {
    const ps = ps_(pid), s = S();
    if (ps.cmDoor?.round !== s.round) { ps.cmDoor = { round: s.round, ok: Math.random() < COMMUNITY_OK }; if (!ps.cmDoor.ok) noteRefuse(pid); Store.saveSeason(); }
    return ps.cmDoor.ok;
}
export const cmOwned = pid => Object.entries(ps_(pid)?.items || {}).filter(([k, n]) => n > 0 && CM_BY_ID[k]).map(([k, n]) => ({ ...CM_BY_ID[k], n }));
// style: { color, effect, font, bold, underline, anim } — each a cm_* item id that is used up
export function writePost(pid, text, style = {}) {
    const ps = ps_(pid), s = S();
    text = String(text || "").trim().slice(0, 200);
    if (!text) return { ok: false, why: "코멘트를 입력하세요" };
    if (postedThisSeason(pid)) return { ok: false, why: "이번 시즌에는 이미 코멘트를 남겼습니다 (시즌당 1회)" };
    const fee = s.turn?.glitchCom ? 5000 : COMMENT_FEE; // 💻 Cyber Town glitch: the post costs 5,000G
    if (ps.money < fee) return { ok: false, why: `골드가 부족합니다 (${fee}G)` };
    const used = {};
    for (const [k, id] of Object.entries(style)) {
        if (!id) continue;
        if (!(ps.items[id] > 0) || !CM_BY_ID[id]) return { ok: false, why: "가지고 있지 않은 꾸미기 아이템입니다" };
        used[k] = CM_BY_ID[id].ref;
    }
    for (const id of Object.values(style)) if (id) ps.items[id]--;
    ps.money -= fee;
    ps.cmPosted = s.number;
    const post = { id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), pid: +pid, season: s.number, text, style: used, at: new Date().toISOString() };
    (Store.community ||= { posts: [] }).posts = [post, ...(Store.community.posts || [])].slice(0, 2000);
    log(`💬 ${name(pid)} 커뮤니티에 코멘트 작성`);
    Store.saveSeason(true);
    Store.saveCommunity();
    return { ok: true, post };
}
export const COMMENT = { FEE: COMMENT_FEE, OK: COMMUNITY_OK };

// ---------------------------------------------------------------- map helpers
export const locOfTurn = () => LOC_BY_ID[S()?.turn?.loc] || null;
export const noPassHere = () => !!locOfTurn()?.noPass;
export const END_LOCK_LEFT = 300;
// ⏳ Dead Land Hell · Magma Town · Death Door · Dark Space + NPC Land Death Casino: at least 2 minutes on the map before the turn can end
export const MIN_STAY = { hell: 120, magma_town: 120, death_door: 120, dark_space: 120, death_casino: 120 };
// 2026-11: a map may carry its own minStay (s) — 🛗 elevator floors count from entering the elevator, 🏕️ hiding places from the campsite
export const minStayOf = loc => MIN_STAY[loc?.id] ?? loc?.minStay ?? 0;
const stayBase = (loc, t) => (loc?.sub === "elevator" ? t.elevIn : loc?.sub === "campsite" ? t.camp?.campIn : null) ?? t.locIn ?? t.remaining;
// 🧩 stay waivers from other modules: (loc, t) → true = the minimum stay does not apply (🏕️ Campsite keeps its own 5-minute / 3-kill lock)
export const stayWaivers = [];
export const stayLockLeft = (loc, t) => { const m = minStayOf(loc); if (!m || !((t?.remaining ?? 0) > 0) || stayWaivers.some(f => f(loc, t))) return 0; return Math.max(0, m - (stayBase(loc, t) - t.remaining)); };
// ⛓️ kidnap room: locked for its first 3 minutes and until the escape was tried
// 🧩 extra locks from other modules: (loc, t) → a text while the end is locked (🏕️ Campsite: the Masked Killer needs 2 kills first)
export const extraLocks = [];
const extraLock = (loc, t) => { for (const f of extraLocks) { const r = f(loc, t); if (r) return r; } return null; };
export const endLocked = (loc, t) => loc?.kidnap ? (kidnapLockLeft(t) > 0 && (t?.remaining ?? 0) > 0) || !t?.escapeTried : (!!loc?.endLock && (t?.remaining ?? 0) > END_LOCK_LEFT) || stayLockLeft(loc, t) > 0 || !!extraLock(loc, t);
export const endLockText = (loc, t) => !loc?.kidnap ? (!(stayLockLeft(loc, t) > 0) && !(loc?.endLock && (t?.remaining ?? 0) > END_LOCK_LEFT) && extraLock(loc, t) ? extraLock(loc, t) : stayLockLeft(loc, t) > 0 && !(loc?.endLock && (t?.remaining ?? 0) > END_LOCK_LEFT) ? `⏳ 이 맵에서는 들어온 뒤 최소 ${minStayOf(loc) / 60}분이 지나야 턴을 끝낼 수 있습니다 (${Math.ceil(stayLockLeft(loc, t))}초 남음)` : `🔒 이 맵에서는 남은 시간이 ${END_LOCK_LEFT / 60}분 이하일 때만 턴을 끝낼 수 있습니다`)
    : !t?.escapeTried ? "⛓️ 탈출을 반드시 시도해야 턴을 끝낼 수 있습니다" : `⛓️ 납치 공간에서는 3분 동안 턴을 끝낼 수 없습니다 (${Math.ceil(kidnapLockLeft(t))}초 남음)`;

// ---------------------------------------------------------------- 📣 홍보하기 · 인기 투표 (persistent, Store.community.promo)
//   6 profiles register (50P, once per season each) → 20 votes (free + 500G reward, once per season each):
//   votes 1~10 go to a random profile and are counted in the open · votes 11~20 are anonymous
//   (the voter picks; the board keeps showing the 10-vote count + "??") → after the 20th the winner
//   is shown and picks 1 of 3 random gift boxes (right away if it's them, otherwise at their next turn)
export const PROMO_SLOTS = 6, PROMO_VOTES = 20, PROMO_OPEN_VOTES = 10, PROMO_FEE = 50;
export const PROMO_VOTE_REWARD = 500; // voting is free — the voter gets 500G (once per season)
export const PROMO_TITLE = "Gamblers의 빛이 되고 싶어요!";
export const PROMO_PRIZES = [
    { id: "ball", label: "마스터볼", emoji: "🟣", emo: "ITEM004" },
    { id: "hpfull", label: "Full HP 약", emoji: "❤️‍🩹", emo: "EMO_HPFULL" },
    { id: "radar", label: "Legendary Monster Radar", emoji: "🌟", emo: "RADAR_4" },
    { id: "g50", label: "50,000G", emoji: "💰", gold: 50000 },
    { id: "g30", label: "30,000G", emoji: "💰", gold: 30000 },
    { id: "hit", label: "이모몬스터 무기 'Hit - Normal 속성'", emoji: "⚔️", weapon: "hit" },
    { id: "p100", label: "100P", emoji: "💎", pts: 100 }
];
const savePromo = () => { if (!S()?.sandbox) Store.saveCommunity(); };
export function promo() {
    const c = (Store.community ||= { posts: [] });
    return (c.promo ||= { cycle: 1, entries: [], votes: [], last: null, pending: {} });
}
export const promoPhase = () => { const p = promo(); return p.entries.length < PROMO_SLOTS ? "register" : "vote"; };
const seasonNo = () => S()?.number ?? 0;
export const promoUsed = (pid, kind) => !!S()?.ps?.[pid]?.[kind === "vote" ? "promoVoted" : "promoJoined"];
// counts: real (every vote) and shown (open votes only)
export function promoCounts() {
    const p = promo(), real = p.entries.map(() => 0), shown = p.entries.map(() => 0);
    p.votes.forEach((v, i) => { real[v.to]++; if (i < PROMO_OPEN_VOTES) shown[v.to]++; });
    return { real, shown, anon: p.votes.length >= PROMO_OPEN_VOTES };
}
export function promoRegister(pid, text) {
    const p = promo(), ps = S()?.ps?.[pid];
    text = String(text || "").trim().slice(0, 80);
    if (!ps) return { ok: false, why: "시즌 참가자만 할 수 있습니다" };
    if (promoPhase() !== "register") return { ok: false, why: "홍보 프로필 6칸이 모두 찼습니다 — 지금은 투표 기간입니다" };
    if (!text) return { ok: false, why: "홍보 문구를 입력하세요" };
    if (promoUsed(pid, "join")) return { ok: false, why: "이번 시즌에는 이미 홍보했습니다 (시즌당 1회)" };
    if (p.entries.some(e => +e.pid === +pid)) return { ok: false, why: "이미 홍보 게시판에 올라가 있습니다" };
    if (ps.points < PROMO_FEE) return { ok: false, why: `포인트가 부족합니다 (${PROMO_FEE}P)` };
    ps.points -= PROMO_FEE; ps.promoJoined = true;
    p.entries.push({ pid: +pid, text, season: seasonNo(), at: new Date().toISOString() });
    log(`📣 ${name(pid)} 홍보 등록 (${p.entries.length}/${PROMO_SLOTS})`);
    Store.saveSeason(true); savePromo();
    return { ok: true, full: p.entries.length >= PROMO_SLOTS };
}
// to: the chosen profile (anonymous votes) — ignored for the open votes, which are random
export function promoVote(pid, to = null) {
    const p = promo(), ps = S()?.ps?.[pid];
    if (!ps) return { ok: false, why: "시즌 참가자만 할 수 있습니다" };
    if (promoPhase() !== "vote") return { ok: false, why: "아직 투표 기간이 아닙니다 (홍보 프로필 6칸이 차야 합니다)" };
    if (promoUsed(pid, "vote")) return { ok: false, why: "이번 시즌에는 이미 투표했습니다 (시즌당 1회)" };
    const open = p.votes.length < PROMO_OPEN_VOTES;
    if (!open && (to == null || !p.entries[to])) return { ok: false, why: "투표할 프로필을 고르세요" };
    const idx = open ? Math.floor(Math.random() * p.entries.length) : to;
    ps.money += PROMO_VOTE_REWARD; ps.promoVoted = true;
    p.votes.push({ by: +pid, to: idx, anon: !open, at: new Date().toISOString() });
    log(`🗳️ ${name(pid)} 인기 투표 (${p.votes.length}/${PROMO_VOTES}) +${PROMO_VOTE_REWARD}G${open ? ` → ${name(p.entries[idx].pid)}` : " (익명)"}`);
    let finished = null;
    if (p.votes.length >= PROMO_VOTES) finished = promoFinish();
    Store.saveSeason(true); savePromo();
    return { ok: true, to: idx, open, finished };
}
function promoFinish() {
    const p = promo(), { real } = promoCounts();
    const top = Math.max(...real);
    const tied = real.map((n, i) => n === top ? i : -1).filter(i => i >= 0);
    const wi = tied[Math.floor(Math.random() * tied.length)];
    const winner = p.entries[wi].pid;
    const pool = [...PROMO_PRIZES].sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.id);
    p.last = { cycle: p.cycle, entries: p.entries, counts: real, winner, wi, offers: pool, at: new Date().toISOString(), season: seasonNo() };
    (p.pending ||= {})[winner] = { cycle: p.cycle, offers: pool };
    log(`🏆 인기 투표 종료 → ${name(winner)} (${top}표)`);
    // a new round of promotion opens at once
    p.cycle++; p.entries = []; p.votes = [];
    return p.last;
}
export const promoPending = pid => promo().pending?.[pid] || null;
// the winner opens one of the 3 boxes (needs to be in the running season)
export function promoClaim(pid, box) {
    const p = promo(), pend = p.pending?.[pid], ps = S()?.ps?.[pid];
    if (!pend || !ps) return null;
    const prize = PROMO_PRIZES.find(x => x.id === pend.offers[box]) || PROMO_PRIZES.find(x => x.id === pend.offers[0]);
    if (prize.gold) ps.money += prize.gold;
    if (prize.pts) ps.points += prize.pts;
    if (prize.emo && EM?.giveItem) EM.giveItem(pid, prize.emo, 1);
    if (prize.weapon && EM?.giveWeapon) {
        const w = (EM.cat?.()?.weapons || []).find(w => /^hit$/i.test(String(w.name).trim()) && String(w.attribute).toLowerCase() === "normal")
            || (EM.cat?.()?.weapons || []).find(w => /^hit\b/i.test(String(w.name)));
        EM.giveWeapon(pid, w ? w.id : 2, 1); // #2 = Hit (Normal) — used when the EmoMon catalog is not loaded yet
    }
    delete p.pending[pid];
    log(`🎁 ${name(pid)} 인기 투표 선물 → ${prize.label}`);
    Store.recordHighlight("promo", { pid, prize: prize.label, emoji: prize.emoji });
    Store.saveSeason(true); savePromo();
    return prize;
}
