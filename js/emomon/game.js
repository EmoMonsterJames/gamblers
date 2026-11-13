// =====================================================================
// 🐾 EmoMon rules inside a Gamblers season (state: ps.emo)
//   ps.emo = { mons: [mon], battle: uid, finds, bag: {itemId:n}, wbag: {weaponId:n}, tbag: {traitId:n}, hospRound }
//   mon    = { uid, sid, nature, hp (null = full), types (null = the species' own), weapons: [weaponId],
//              traits: [traitId], diseases: [], from, at, line: [earlier species ids] }
// No levels / EXP: stats are EmoMonster's StatCalculator at a fixed level, nature and traits included.
// Battles run on EmoMonster's own BattleEngine (game/emomon/engine.js).
// =====================================================================
import { CONFIG } from "../config.js";
import { cardId } from "../data/catalog.js";
import { Store } from "../core/store.js";
import { S, log, name } from "../game/season.js";
import { E } from "./engine.js";
import { EMO, cat, species, typesOfSpecies, emoItem, captureConfig, isFirstStage, isFinalStage, hasEvolution, monOn, weaponOn, traitOn } from "./data.js";

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const uid = () => "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function emo(pid) {
    const ps = S().ps[pid];
    const e = (ps.emo ||= {});
    e.mons ||= []; e.bag ||= {}; e.wbag ||= {}; e.tbag ||= {}; e.finds ||= 0;
    return e;
}
export const mons = pid => emo(pid).mons;
export const monByUid = (pid, u) => mons(pid).find(m => m.uid === u) || null;
export const randomNature = () => pickOne(Object.keys(E.cfg.NATURES).filter(n => n !== "Default"));

// ---------------------------------------------------------------- monster numbers
export const sp = m => species(m.sid);
export const typesOf = m => (m.types?.length ? m.types : typesOfSpecies(sp(m))).slice(0, EMO.MAX_TYPES);
export const traitRows = m => (m.traits || []).map(id => cat()?.trait[String(id)]).filter(Boolean);
export const weaponRows = m => (m.weapons || []).map(id => cat()?.weapon[String(id)]).filter(Boolean);
export function statsOf(m) {
    const s = sp(m);
    if (!s) return { maxHp: 100, physAttack: 20, physDefense: 20, specAttack: 20, specDefense: 20, speed: 20, accuracy: 90 };
    const st = E.stats.compute({ ...s, type1: typesOf(m)[0] || s.type1 }, EMO.LEVEL, traitRows(m), m.nature);
    return { ...st, maxHp: EMO.HP };            // every monster has 100 HP (no levels in Gamblers)
}
export const maxHp = m => statsOf(m).maxHp;
export const hpOf = m => m.hp == null ? maxHp(m) : Math.max(0, Math.min(maxHp(m), m.hp));
export const fainted = m => hpOf(m) <= 0;
export const blocked = m => (m.diseases || []).some(d => E.cfg.DISEASES[d]?.noBattle);
export const evolvedMon = m => !!(m.line?.length) || !isFirstStage(m.sid);

export function newMon(sid, { nature = randomNature(), from = "capture" } = {}) {
    return { uid: uid(), sid: +sid, nature, hp: null, types: null, weapons: [], traits: [], diseases: [], from, at: Date.now(), line: [] };
}
// the battle monster: the chosen one, else the first; a fainted / sick one is skipped
export function battleMon(pid) {
    const list = mons(pid);
    const chosen = list.find(m => m.uid === emo(pid).battle) || list[0];
    if (chosen && !fainted(chosen) && !blocked(chosen)) return chosen;
    return list.find(m => !fainted(m) && !blocked(m)) || null;
}
export function setBattle(pid, u) { emo(pid).battle = u; Store.saveSeason(); }

// ---------------------------------------------------------------- combatants
const usesOf = w => Number(w.max_uses ?? E.cfg.DEFAULT_WEAPON_USES);
// ⚔ PP (weapon uses) do NOT refill after a battle: m.pp = { weaponId: usesLeft } (missing = full) — PP 회복약 refills
export const ppMax = w => usesOf(w);
export const ppLeft = (m, w) => { const v = m.pp?.[String(w.id)]; return v == null ? usesOf(w) : Math.max(0, Math.min(usesOf(w), v)); };
function combatant(m, side, { full = false } = {}) {
    const s = sp(m), stats = statsOf(m), traits = traitRows(m);
    return {
        side, name: s?.name || "?", level: EMO.LEVEL, rarity: s?.rarity || 1, types: typesOf(m),
        trait: traits[0] || null, trait2: traits[1] || null, stats, hp: full ? stats.maxHp : hpOf(m),
        weapons: weaponRows(m).map(w => ({ ...w, uses_max: usesOf(w), uses_left: full ? usesOf(w) : ppLeft(m, w) })),
        revive: false, held: null, diseases: full ? [] : (m.diseases || []), chronic: [], npcItems: m.npcItems || null
    };
}
// 🤖 EmoMon Battlebot (#219): fights for players without a monster; its two weapons hit only 30%
export function botMon() {
    const m = newMon(EMO.BOT_ID, { nature: "Default", from: "bot" });
    m.weapons = (cat()?.weapons || []).filter(w => (w.allowed_monster_ids || []).map(Number).includes(EMO.BOT_ID)).map(w => w.id);
    m.bot = true;
    return m;
}
function botCombatant(side) {
    const c = combatant(botMon(), side, { full: true });
    c.weapons = c.weapons.map(w => ({ ...w, accuracy: EMO.BOT_ACC }));
    return c;
}
export const fighterOf = pid => battleMon(pid) || null; // null → the Battlebot
export function sideFor(pid, side) {
    const m = fighterOf(pid);
    return m ? { mon: m, c: combatant(m, side) } : { mon: null, bot: true, c: botCombatant(side) };
}

// ---------------------------------------------------------------- wild EmoMon Battler (any monster, any stage)
export function makeBattler() {
    const pool = (cat()?.mons || []).filter(m => m.id !== EMO.BOT_ID && monOn(m.id));
    const s = pickOne(pool);
    const m = newMon(s.id, { from: "battler" });
    const fit = r => E.traits.allowedFor(r, { id: s.id, types: typesOfSpecies(s) }) && (cat().weapon[String(r.id)] === r ? weaponOn(r.id) : traitOn(r.id));
    const ws = (cat().weapons || []).filter(w => fit(w) && !(w.allowed_monster_ids || []).map(Number).includes(EMO.BOT_ID) && (Number(w.power) || 0) <= 70 + (s.rarity || 1) * 5);
    m.weapons = [...new Set(Array.from({ length: rint(2, 4) }, () => pickOne(ws)?.id).filter(Boolean))];
    if (Math.random() < 0.45) { const t = pickOne(cat().traits.filter(fit)); if (t) m.traits = [t.id]; }
    // some battlers carry potions (used by the engine when HP gets low)
    if (Math.random() < 0.4) m.npcItems = Array.from({ length: rint(1, 2) }, () => pickOne([{ name: "몬스터 HP 약", pct: 25 }, { name: "Super Potion", pct: 40 }]));
    m.trainer = pickOne(["EmoMon Battler 진", "EmoMon Battler 루나", "EmoMon Battler 토토", "EmoMon Battler 미키", "EmoMon Battler 보리", "EmoMon Battler 하루"]);
    return m;
}

// one fight. A = the player (their battle monster or the Battlebot), B = a wild battler / another player.
// The player's monster keeps its HP and diseases afterwards.
export function fight(pidA, foe) {
    const a = sideFor(pidA, "A");
    const b = foe.pid != null ? sideFor(foe.pid, "B") : { mon: foe.mon, c: combatant(foe.mon, "B", { full: true }) };
    const sim = E.battle.simulate(a.c, b.c);
    const won = sim.winner === "A";
    apply(a.mon, sim.final.A);
    if (foe.pid != null) apply(b.mon, sim.final.B);
    return { sim, a, b, won, draw: !sim.winner };
}
function apply(m, fin) {
    if (!m || !fin) return;
    m.hp = Math.max(0, Math.round(fin.hp));
    m.diseases = [...new Set(fin.diseases || [])];
    if (fin.weaponUses) { m.pp ||= {}; for (const [id, n] of Object.entries(fin.weaponUses)) if (n != null && m.weapons.map(String).includes(id)) m.pp[id] = n; }
}

// ---------------------------------------------------------------- 📖 dex (persistent, per player)
export const DEX_HOW = { capture: "🔍 Capture에서 만남", caught: "🎯 직접 포획", battler: "⚔️ EmoMon Battler와 싸움", pvp: "🤺 다른 플레이어와 배틀", evolve: "✨ 진화로 얻음", own: "🐾 보유" };
export function seen(pid, sid, how) {
    if (pid == null || sid == null) return;
    const d = (Store.emodex[pid] ||= {});
    const cur = d[sid];
    const rank = ["capture", "battler", "pvp", "evolve", "caught"];
    if (cur && rank.indexOf(cur.how) >= rank.indexOf(how)) return;
    d[sid] = { how, at: new Date().toISOString(), season: S()?.number ?? null };
    Store.saveEmodex();
}
export const dexOf = pid => Store.emodex[pid] || {};

// ---------------------------------------------------------------- bag
export const bagN = (pid, id) => emo(pid).bag[id] || 0;
export function giveItem(pid, id, n = 1) { const b = emo(pid).bag; b[id] = (b[id] || 0) + n; if (b[id] <= 0) delete b[id]; }
export function useItem(pid, id) { if (bagN(pid, id) <= 0) return false; giveItem(pid, id, -1); return true; }
export function giveWeapon(pid, wid, n = 1) { const b = emo(pid).wbag; b[wid] = (b[wid] || 0) + n; if (b[wid] <= 0) delete b[wid]; }
export function giveTrait(pid, tid, n = 1) { const b = emo(pid).tbag; b[tid] = (b[tid] || 0) + n; if (b[tid] <= 0) delete b[tid]; }

// ---------------------------------------------------------------- 🔍 capture corner
export const findsLeft = pid => EMO.CAPTURES_PER_SEASON - (emo(pid).finds || 0);
// a Find press: monster (map chance) · or battler / nothing / gold / item
export function find(pid, locId) {
    const cfg = captureConfig(locId);
    if (!cfg || findsLeft(pid) <= 0) return null;
    emo(pid).finds++;
    let out;
    if (Math.random() * 100 < cfg.chance) {
        const s = pickByRarity(cfg.mons.map(species).filter(Boolean));
        out = { kind: "monster", mon: newMon(s.id) };
        seen(pid, s.id, "capture");
    } else {
        const sp = EMO.MISS_SPLIT, tot = Object.values(sp).reduce((a, b) => a + b, 0);
        let x = Math.random() * tot, kind = "nothing";
        for (const [k, v] of Object.entries(sp)) { if ((x -= v) < 0) { kind = k; break; } }
        if (kind === "battler") { const m = makeBattler(); out = { kind, mon: m }; seen(pid, m.sid, "battler"); }
        else if (kind === "gold") { const g = Math.round(rint(...EMO.FIND_GOLD) / 10) * 10; S().ps[pid].money += g; out = { kind, gold: g }; }
        else if (kind === "item") { const it = findItem(); if (it.card) { const ps = S().ps[pid]; ps.items[it.id] = (ps.items[it.id] || 0) + 1; } else giveItem(pid, it.id); out = { kind, item: it }; }
        else out = { kind: "nothing" };
    }
    log(`🔍 ${name(pid)} Capture Find → ${out.kind === "monster" ? species(out.mon.sid)?.name : out.kind === "battler" ? "EmoMon Battler!" : out.kind === "gold" ? `${out.gold}G` : out.kind === "item" ? out.item.name : "아무것도 없음"}`);
    Store.saveSeason();
    return out;
}
// ★ shares: 60 · 25 · 8 · 4 · 1.8 · 0.9 (only the rarities this map has, scaled up)
function pickByRarity(list) {
    const byR = {};
    for (const m of list) (byR[m.rarity || 1] ||= []).push(m);
    const rs = Object.keys(byR).map(Number);
    const tot = rs.reduce((a, r) => a + EMO.RARITY_WEIGHT[r], 0);
    let x = Math.random() * tot;
    for (const r of rs) { if ((x -= EMO.RARITY_WEIGHT[r]) < 0) return pickOne(byR[r]); }
    return pickOne(list);
}
// placeholder finds (the real list comes later): a ball or a lab material
function findItem() {
    const tot = EMO.FIND_ITEMS.reduce((a, [, w]) => a + w, 0);
    let x = Math.random() * tot, id = "ITEM001";
    for (const [k, w] of EMO.FIND_ITEMS) { if ((x -= w) < 0) { id = k; break; } }
    if (id.startsWith("card:")) { const L = id.slice(5); return { id: cardId(L), card: L, name: `알파벳 카드 ${L}`, emoji: "🔤" }; }
    return emoItem(id);
}
export const BASE_CATCH = [0, 55, 40, 28, 18, 10, 5];
export function catchChance(sid, ballId) {
    const s = species(sid), b = emoItem(ballId);
    if (!s || !b) return 0;
    if (b.bonus >= 100) return 100;
    let bonus = b.bonus || 0;
    if (b.attr) bonus = typesOfSpecies(s).some(t => t.toLowerCase() === b.attr.toLowerCase()) ? b.bonus : 0;
    return Math.min(99, BASE_CATCH[s.rarity || 1] + bonus);
}
// → { ok, caught, roll, chance }
export function throwBall(pid, wild, ballId) {
    const b = emoItem(ballId);
    if (!b || !useItem(pid, ballId)) return { ok: false, why: "볼이 없습니다" };
    let chance = catchChance(wild.sid, ballId);
    if (b.crazy) chance = Math.min(99, BASE_CATCH[species(wild.sid)?.rarity || 1] + (Math.random() < 0.5 ? 75 : 0));
    const caught = Math.random() * 100 < chance;
    log(`🎯 ${name(pid)} ${b.name} → ${species(wild.sid)?.name} ${caught ? "포획 성공!" : "놓침"}`);
    Store.saveSeason();
    return { ok: true, caught, chance };
}
export function addMon(pid, mon) {
    if (mons(pid).length >= EMO.MAX_MONS) return false;
    mons(pid).push(mon);
    if (!emo(pid).battle) emo(pid).battle = mons(pid)[0].uid;
    seen(pid, mon.sid, mon.from === "evolve" ? "evolve" : "caught");
    Store.saveSeason(true);
    return true;
}
export function release(pid, u, { item = true } = {}) {
    const e = emo(pid), m = monByUid(pid, u);
    if (!m) return false;
    // players can never just let a monster go: only with all slots full and a Release ticket
    if (item && mons(pid).length < EMO.MAX_MONS) return false;
    if (item && !useItem(pid, "EMO_MON_DEL")) return false;
    e.mons = e.mons.filter(x => x !== m);
    if (e.battle === u) e.battle = e.mons[0]?.uid || null;
    log(`🚮 ${name(pid)} ${sp(m)?.name} 놓아 줌`);
    Store.saveSeason(true);
    return true;
}
// battler win: 1,000~10,000G or 1~10P
export function battlerReward(pid) {
    const ps = S().ps[pid];
    if (Math.random() < 0.5) { const g = Math.round(rint(...EMO.BATTLER_GOLD) / 100) * 100; ps.money += g; return { gold: g }; }
    const p = rint(...EMO.BATTLER_PTS); ps.points += p; return { pts: p };
}

// ---------------------------------------------------------------- care
export function usePotion(pid, u, id) {
    const m = monByUid(pid, u), it = emoItem(id);
    if (!m || !it || bagN(pid, id) <= 0) return { ok: false, why: "아이템이 없습니다" };
    if (it.kind === "potion") {
        const before = hpOf(m), max = maxHp(m);
        if (before >= max) return { ok: false, why: "HP가 이미 가득 찼습니다" };
        m.hp = it.hp === "full" ? max : Math.min(max, before + it.hp);
        useItem(pid, id); Store.saveSeason();
        return { ok: true, healed: m.hp - before };
    }
    if (it.kind === "pp") {
        const ws = weaponRows(m);
        if (!ws.length) return { ok: false, why: "무기가 없습니다" };
        if (ws.every(w => ppLeft(m, w) >= ppMax(w))) return { ok: false, why: "PP가 이미 가득 찼습니다" };
        m.pp = {}; useItem(pid, id); Store.saveSeason();
        return { ok: true, pp: true };
    }
    if (it.kind === "cure") {
        if (!m.diseases?.length) return { ok: false, why: "치료할 질병·상태이상이 없습니다" };
        m.diseases = []; useItem(pid, id); Store.saveSeason();
        return { ok: true, cured: true };
    }
    return { ok: false, why: "여기서 쓸 수 없는 아이템입니다" };
}
// 🏥 Monster Hospital: once per round, 1,000G → every monster full HP, every disease / status gone
export const hospitalUsed = pid => emo(pid).hospRound === S().round;
export function hospital(pid) {
    const ps = S().ps[pid];
    if (hospitalUsed(pid)) return { ok: false, why: "병원은 라운드당 1번만 이용할 수 있습니다" };
    if (ps.money < EMO.HOSPITAL_FEE) return { ok: false, why: "골드가 부족합니다" };
    if (!mons(pid).length) return { ok: false, why: "치료할 몬스터가 없습니다" };
    ps.money -= EMO.HOSPITAL_FEE;
    emo(pid).hospRound = S().round;
    for (const m of mons(pid)) { m.hp = null; m.diseases = []; }
    log(`🏥 ${name(pid)} 몬스터 병원 (전원 회복)`);
    Store.saveSeason(true);
    return { ok: true };
}

// ---------------------------------------------------------------- weapons / traits / breakers
export const canLearn = (m, row) => E.traits.allowedFor(row, { id: m.sid, types: typesOf(m) });
export function learnWeapon(pid, u, wid, { breaker = false } = {}) {
    const m = monByUid(pid, u), w = cat()?.weapon[String(wid)];
    if (!m || !w) return { ok: false, why: "없는 무기입니다" };
    if ((emo(pid).wbag[wid] || 0) <= 0) return { ok: false, why: "가방에 그 무기가 없습니다" };
    if (m.weapons.includes(w.id)) return { ok: false, why: "이미 가진 무기입니다" };
    if (m.weapons.length >= EMO.MAX_WEAPONS) return { ok: false, why: `무기는 최대 ${EMO.MAX_WEAPONS}개 — 무기 삭제권으로 먼저 비우세요` };
    const fits = canLearn(m, w);
    if (!fits && !breaker) return { ok: false, why: "이 몬스터는 이 무기를 배울 수 없습니다 (무기 Breaker 필요)", needBreaker: true };
    if (!fits && !useItem(pid, "ITEM_WEAPON_BREAKER")) return { ok: false, why: "무기 Breaker가 없습니다" };
    giveWeapon(pid, w.id, -1);
    m.weapons.push(w.id);
    log(`⚔️ ${name(pid)} ${sp(m)?.name}에게 ${w.name}${fits ? "" : " (무기 Breaker)"}`);
    Store.saveSeason();
    return { ok: true };
}
export function forgetWeapon(pid, u, wid) {
    const m = monByUid(pid, u);
    if (!m || !useItem(pid, "EMO_WEAPON_DEL")) return { ok: false, why: "몬스터 무기 삭제권이 없습니다" };
    m.weapons = m.weapons.filter(x => x !== wid);
    Store.saveSeason();
    return { ok: true };
}
// traits: up to 2. Replacing one, or a trait it can't learn, uses a 특성 Breaker.
export function learnTrait(pid, u, tid, { replace = null } = {}) {
    const m = monByUid(pid, u), t = cat()?.trait[String(tid)];
    if (!m || !t) return { ok: false, why: "없는 특성입니다" };
    if ((emo(pid).tbag[tid] || 0) <= 0) return { ok: false, why: "가방에 그 특성이 없습니다" };
    if (m.traits.includes(t.id)) return { ok: false, why: "이미 가진 특성입니다" };
    const fits = canLearn(m, t), full = m.traits.length >= EMO.MAX_TRAITS;
    if (full && replace == null) return { ok: false, why: "특성은 최대 2개 — 바꿀 특성을 고르세요 (특성 Breaker 사용)", needReplace: true };
    const need = !fits || replace != null;
    if (need && !useItem(pid, "ITEM_TRAIT_BREAKER")) return { ok: false, why: !fits ? "이 몬스터가 못 배우는 특성입니다 (특성 Breaker 필요)" : "특성을 바꾸려면 특성 Breaker가 필요합니다", needBreaker: true };
    giveTrait(pid, t.id, -1);
    if (replace != null) m.traits = m.traits.filter(x => x !== replace);
    m.traits.push(t.id);
    log(`🧬 ${name(pid)} ${sp(m)?.name} 특성 ${t.name}${need ? " (특성 Breaker)" : ""}`);
    Store.saveSeason();
    return { ok: true };
}
export function changeTypes(pid, u, { add = null, from = null, to = null }) {
    const m = monByUid(pid, u);
    if (!m) return { ok: false };
    const cur = typesOf(m);
    let next;
    if (add) { if (cur.length >= EMO.MAX_TYPES) return { ok: false, why: "속성은 최대 3개입니다" }; if (cur.includes(add)) return { ok: false, why: "이미 있는 속성입니다" }; next = [...cur, add]; }
    else { if (!from || !to || cur.includes(to)) return { ok: false, why: "바꿀 속성을 고르세요" }; next = cur.map(t => t === from ? to : t); }
    if (!useItem(pid, "EMO_TYPE_BREAKER")) return { ok: false, why: "속성 Breaker가 없습니다" };
    m.types = next;
    log(`🔷 ${name(pid)} ${sp(m)?.name} 속성 → ${next.join("/")}`);
    Store.saveSeason();
    return { ok: true };
}
export function changeNature(pid, u, nature) {
    const m = monByUid(pid, u);
    if (!m || !E.cfg.NATURES[nature]) return { ok: false };
    if (!useItem(pid, "EMO_NATURE_BREAKER")) return { ok: false, why: "Nature Breaker가 없습니다" };
    m.nature = nature; Store.saveSeason();
    return { ok: true };
}

// ---------------------------------------------------------------- 🧪 lab: evolution + mixing
export function evoOptions(pid, m) {
    return (cat()?.evoFrom(m.sid) || []).map(e => {
        const need = [e.required_item_id, e.required_item2_id].filter(Boolean);
        const have = need.every(id => bagN(pid, id) > 0);
        const gold = Number(e.required_money) || 0;
        const wNeed = e.required_weapon_id ? m.weapons.includes(Number(e.required_weapon_id)) : true;
        return { e, to: species(e.target_monster_id), need, have, gold, chance: e.evolve_chance ?? 100, wNeed, ok: have && wNeed && S().ps[pid].money >= gold };
    }).filter(o => o.to);
}
export function evolve(pid, u, evoId) {
    const m = monByUid(pid, u);
    const o = m && evoOptions(pid, m).find(x => x.e.id === evoId);
    if (!o) return { ok: false, why: "진화할 수 없습니다" };
    if (!o.ok) return { ok: false, why: "재료 · 골드 · 필요한 무기가 부족합니다" };
    for (const id of o.need) useItem(pid, id);
    S().ps[pid].money -= o.gold;
    if (Math.random() * 100 >= o.chance) { log(`🧪 ${name(pid)} ${sp(m)?.name} 진화 실패`); Store.saveSeason(true); return { ok: true, failed: true }; }
    const before = sp(m), max0 = maxHp(m), hp0 = hpOf(m);
    m.line = [...(m.line || []), m.sid];
    m.sid = o.to.id;
    if (m.types) m.types = null;                       // the new form has its own attributes
    m.hp = Math.round(hp0 / Math.max(1, max0) * maxHp(m)) >= maxHp(m) ? null : Math.round(hp0 / Math.max(1, max0) * maxHp(m));
    seen(pid, o.to.id, "evolve");
    log(`✨ ${name(pid)} ${before?.name} → ${o.to.name} 진화!`);
    Store.saveSeason(true);
    return { ok: true, from: before, to: o.to };
}
export function canMix(pid, r) { return (r.ingredients || []).every(x => bagN(pid, x.id) >= (x.qty || 1)) && S().ps[pid].money >= (r.cost || 0); }
export function mix(pid, r) {
    if (!canMix(pid, r)) return { ok: false, why: "재료 또는 골드가 부족합니다" };
    for (const x of r.ingredients || []) giveItem(pid, x.id, -(x.qty || 1));
    S().ps[pid].money -= r.cost || 0;
    giveItem(pid, r.result_item_id, r.result_qty || 1);
    log(`🧪 ${name(pid)} LAB 조합: ${r.name}`);
    Store.saveSeason(true);
    return { ok: true };
}

// ---------------------------------------------------------------- mission helpers
export const monsOf = pid => (S().ps[pid]?.emo?.mons || []);
export const ownsType = (pid, t) => monsOf(pid).some(m => typesOf(m).some(x => x.toLowerCase() === t.toLowerCase()));
export const ownsRarity = (pid, r, exact = false) => monsOf(pid).some(m => exact ? (sp(m)?.rarity || 1) === r : (sp(m)?.rarity || 1) >= r);
export const totalWeapons = pid => monsOf(pid).reduce((a, m) => a + (m.weapons?.length || 0), 0);
export const totalTraits = pid => monsOf(pid).reduce((a, m) => a + (m.traits?.length || 0), 0);
export const distinctTypes = pid => new Set(monsOf(pid).flatMap(typesOf)).size;
export const START_HP = CONFIG.START_HP;

// 🐾 "emo_has" missions: does this player own such a monster? (no → candidate)
export function emoHas(pid, m) {
    const list = monsOf(pid);
    switch (m.what) {
        case "type": return (m.types || []).some(t => ownsType(pid, t));
        case "rarity": return ownsRarity(pid, m.v);
        case "rarity1": return ownsRarity(pid, 1, true);
        case "weapons2": return list.some(x => (x.weapons?.length || 0) >= 2);
        case "trait": return list.some(x => (x.traits?.length || 0) > 0);
        case "noevo": return list.some(x => !hasEvolution(x.sid));
        case "nature": return list.some(x => x.nature === m.nature);
        case "evolved": return list.some(evolvedMon);
        case "multitype": return list.some(x => typesOf(x).length >= (m.v || 2));
        case "mono": return list.some(x => typesOf(x).length === 1);
        case "final": return list.some(x => isFinalStage(x.sid));
    }
    return false;
}
export function randomNatureSafe() {
    try { return randomNature(); } catch { return pickOne(["Brave", "Calm", "Timid", "Jolly", "Modest", "Bold", "Adamant", "Hasty"]); }
}
