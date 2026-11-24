// =====================================================================
// 🏷️ EmoMonster Rent Shop (a 🐾 monster corner on the maps with loc.emorent)
//   · the door: random entry — 60% in / 40% refused (one roll per player per map per round)
//   · once per season per player: pick a grade (일반 / 프리미엄 / 럭셔리) and 1~6 rounds, pay gold OR points
//     per round → a random monster of that grade joins the party, marked "대여중" (mon.rent)
//   · 8 players or fewer left: every rental costs +10P per round on top · 6 or fewer: no rentals at all
//   · renting at least 5 (일반) / 3 (프리미엄) / 2 (럭셔리) rounds → one spin of the weapon roulette
//     (꽝 40% · 10 weapons 6% each) — a won weapon comes with the monster;
//     one the monster cannot learn is swapped for Brace (Normal), which every monster gets
//   · when the rental runs out (round start after the last rented round) the monster is taken back
//   · 📖 Dex: a rented species is listed as found, labelled "Rented"
// Admin (🌍 지역·맵 관리 → a rent-shop map → 🏷️ 대여샵 관리): monsters per grade · prices · roulette.
// Settings: Store.maps.emoRent = { tiers: [{ id, mons: [name | speciesId], gold, pts, minRounds }], weapons: [[name, type, pct]] }
// =====================================================================
import { Store } from "../core/store.js";
import { S, log, name, alive, roundHooks, emitEvent } from "./season.js";
import { emoSlots } from "./extra.js";
import * as M from "../emomon/game.js";
import { cat, species } from "../emomon/data.js";

export const RENT_DOOR_OK = 0.6, RENT_MAX_ROUNDS = 6, RENT_LATE_ALIVE = 8, RENT_LATE_PTS = 10, RENT_CLOSED_ALIVE = 6;
// 🚫 6 players or fewer left: no more rentals at all
export const rentClosed = () => alive().length <= RENT_CLOSED_ALIVE;
export const RENT_TIERS = [
    { id: "normal", name: "일반", emoji: "🥉", gold: 15000, pts: 15, minRounds: 5, mons: ["Poopi", "Fishy", "Mago", "Epie", "Eggie"] },
    { id: "premium", name: "프리미엄", emoji: "🥈", gold: 20000, pts: 20, minRounds: 3, mons: ["Flamo", "Leafy", "Galaxyon", "Hearty", "Droppie"] },
    { id: "luxury", name: "럭셔리", emoji: "🥇", gold: 30000, pts: 30, minRounds: 2, mons: ["Bolty", "Kitzy", "Dolharu", "Ghast", "X-Deer"] }
];
// 🎡 weapon roulette: [weapon name, attribute, chance %] — whatever is left over is 꽝
export const RENT_WEAPONS = [
    ["Light Tap", "Normal", 6], ["Bubble", "Water", 6], ["Twinkle", "Fairy", 6], ["Sleepy Seed", "Grass", 6], ["Breeze", "Air", 6],
    ["Energy Field", "Robot", 6], ["Ghost Wall", "Ghost", 6], ["Psy Dart", "Mind", 6], ["Snow Veil", "Ice", 6], ["Zap", "Electric", 6]
];

const low = s => String(s ?? "").trim().toLowerCase();
// the admin's settings over the defaults
export function rentCfg() {
    const a = Store.maps?.emoRent || {};
    const tiers = RENT_TIERS.map(t => ({ ...t, ...(a.tiers?.find(x => x.id === t.id) || {}) }));
    return { tiers, weapons: Array.isArray(a.weapons) && a.weapons.length ? a.weapons : RENT_WEAPONS };
}
export const tierOf = id => rentCfg().tiers.find(t => t.id === id) || null;
// a grade's monsters → species rows (by id, else by name); names the catalog doesn't know are skipped
export function speciesOfRef(ref) {
    if (!cat()) return null;
    if (typeof ref === "number" || /^\d+$/.test(String(ref))) return species(+ref) || null;
    return cat().mons.find(m => low(m.name) === low(ref)) || null;
}
export const tierSpecies = t => (t?.mons || []).map(speciesOfRef).filter(Boolean);
export const weaponByName = n => cat() ? Object.values(cat().weapon).find(w => low(w.name) === low(n)) || null : null;

const rentState = pid => (M.emo(pid).rent ||= {});
export const rentedThisSeason = pid => !!rentState(pid).used;
export const lateFee = () => alive().length <= RENT_LATE_ALIVE;
// the price of a rental: gold OR points per round (+10P per round with 8 or fewer players left)
export function rentPrice(tier, rounds, payWith = "gold") {
    const late = lateFee() ? RENT_LATE_PTS * rounds : 0;
    return payWith === "pts" ? { pts: (tier.pts || 0) * rounds + late } : { gold: (tier.gold || 0) * rounds, ...(late ? { pts: late } : {}) };
}

// 🚪 random entry: 60% in / 40% refused — rolled once per player per map per round
export function rentDoor(pid, locId) {
    const st = rentState(pid), r = S().round;
    const key = `${r}:${locId}`;
    if (st.door?.key !== key) { st.door = { key, ok: Math.random() < RENT_DOOR_OK }; Store.saveSeason(true); return { ...st.door, rolled: true }; }
    return { ...st.door, rolled: false };
}
export const doorOf = (pid, locId) => { const d = rentState(pid).door; return d?.key === `${S().round}:${locId}` ? d : null; };

export function rent(pid, tierId, rounds, payWith = "gold", locId = null) {
    const s = S(), ps = s.ps[pid], t = tierOf(tierId);
    rounds = Math.round(+rounds);
    if (!t) return { ok: false, why: "없는 등급입니다" };
    if (rentClosed()) return { ok: false, why: `참가자가 ${RENT_CLOSED_ALIVE}명 이하로 남아 이모몬스터를 대여할 수 없습니다` };
    if (rentedThisSeason(pid)) return { ok: false, why: "이모몬스터 대여는 시즌당 1회만 할 수 있습니다" };
    if (locId != null && !doorOf(pid, locId)?.ok) return { ok: false, why: "대여샵에 입장하지 못했습니다" };
    if (!(rounds >= 1 && rounds <= RENT_MAX_ROUNDS)) return { ok: false, why: `대여 기간은 1~${RENT_MAX_ROUNDS}라운드입니다` };
    if (M.mons(pid).length >= emoSlots(pid)) return { ok: false, why: "몬스터 슬롯이 꽉 찼습니다 — 빈 슬롯이 있어야 대여할 수 있습니다" };
    const pool = tierSpecies(t);
    if (!pool.length) return { ok: false, why: `${t.name} 등급에 대여할 수 있는 몬스터가 없습니다` };
    const price = rentPrice(t, rounds, payWith);
    if ((price.gold || 0) > ps.money || (price.pts || 0) > ps.points) return { ok: false, why: "돈 · 포인트가 부족합니다" };
    ps.money -= price.gold || 0; ps.points -= price.pts || 0;
    const sp = pool[Math.floor(Math.random() * pool.length)];
    const mon = M.newMon(sp.id, { from: "rent" });
    mon.rent = { tier: t.id, rounds, from: s.round, until: s.round + rounds - 1, season: s.number, spin: rounds >= (t.minRounds || 99) ? "ready" : null };
    if (!M.addMon(pid, mon)) { ps.money += price.gold || 0; ps.points += price.pts || 0; return { ok: false, why: "몬스터를 받을 수 없습니다" }; }
    rentState(pid).used = { season: s.number, sid: sp.id, tier: t.id, rounds };
    const cost = [price.gold ? `${price.gold.toLocaleString()}G` : null, price.pts ? `${price.pts}P` : null].filter(Boolean).join(" + ");
    log(`🏷️ ${name(pid)} 이모몬스터 대여 — ${t.name} ${sp.name} ${rounds}라운드 (라운드 ${mon.rent.until}까지 · ${cost})`);
    Store.saveSeason(true);
    return { ok: true, mon, species: sp, price, spin: mon.rent.spin === "ready" };
}

// 🎡 the weapon roulette (once, only for a rental long enough for its grade) → { ok, idx, weapon|null, won, swapped }
// idx: the roulette segment — 0 = 꽝, 1.. = RENT weapons in order. The admin's chances are scaled so all weapons
// together come out 60% (꽝 40%). A weapon the monster cannot learn → Brace (Normal) instead.
export const RENT_WEAPON_TOTAL = 60, RENT_FALLBACK = "Brace";
export function spinWeapon(pid, uid) {
    const m = M.monByUid(pid, uid);
    if (!m?.rent || m.rent.spin !== "ready") return { ok: false, why: "룰렛 찬스가 없습니다" };
    const list = rentCfg().weapons, sum = list.reduce((a, w) => a + (+w[2] || 0), 0) || 1;
    let x = Math.random() * 100, idx = 0;
    for (let i = 0; i < list.length; i++) { x -= (+list[i][2] || 0) * RENT_WEAPON_TOTAL / sum; if (x < 0) { idx = i + 1; break; } }
    const won = idx ? weaponByName(list[idx - 1][0]) : null;
    let w = won, swapped = false;
    if (won && !M.canLearn(m, won)) { w = weaponByName(RENT_FALLBACK); swapped = true; }
    m.rent.spin = idx ? (swapped ? RENT_FALLBACK : list[idx - 1][0]) : "miss";
    if (w && !(m.weapons || []).map(String).includes(String(w.id))) (m.weapons ||= []).push(w.id);
    log(`🎡 ${name(pid)} 대여 무기 룰렛 → ${idx ? `${list[idx - 1][0]} (${list[idx - 1][1]})${swapped ? ` — 배울 수 없어 ${RENT_FALLBACK} (Normal) 지급` : w ? "" : " — 카탈로그에 없는 무기"}` : "꽝"}`);
    if (w) emitEvent("rentWeapon", pid, { weapon: w.name });
    Store.saveSeason(true);
    return { ok: true, idx, name: idx ? list[idx - 1][0] : null, weapon: w, won, swapped };
}
export const roundsLeft = m => m?.rent ? Math.max(0, m.rent.until - (S()?.round || 0) + 1) : 0;

// ⏳ round start: rentals that ran out go back to the shop
roundHooks.push(s => {
    for (const [pid, ps] of Object.entries(s.ps || {})) {
        const e = ps.emo;
        if (!e?.mons?.some(m => m.rent && s.round > m.rent.until)) continue;
        for (const m of e.mons.filter(m => m.rent && s.round > m.rent.until)) log(`🏷️ ${name(+pid)} 대여한 ${species(m.sid)?.name || "이모몬스터"} 반납 (대여 기간 종료)`);
        e.mons = e.mons.filter(m => !(m.rent && s.round > m.rent.until));
        if (!e.mons.some(m => m.uid === e.battle)) e.battle = e.mons[0]?.uid || null;
    }
});
