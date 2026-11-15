// 🔐 Bunker (restricted zone)
//  · door: a 🪪 Access Card is sold for 10,000G — no card → a random map in Dead Land / Difficult Land / NPC Land
//  · while playing here, within the first 6 minutes of play time, a 🔑 Bunker Key turns up 20% of the time (once per turn)
//  · the key opens the dark vault: pick 3 treasures you want — or 1 from the random corner
import { h, sleep, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { LOCATIONS } from "../data/catalog.js";
import * as G from "../game/season.js";
import * as M from "../emomon/game.js";
import { avatar, displayName } from "../ui/profile.js";

export const ACCESS_CARD_PRICE = 10000;
export const BUNKER_KEY_WINDOW = 360;   // first 6 minutes of play in the Bunker
export const BUNKER_KEY_CHANCE = 0.2;
const FALLBACK_REGIONS = ["deadland", "difficult", "npcland"];

// no Access Card: off to a random Dead Land / Difficult Land / NPC Land map
export function bunkerFallback() {
    const pool = LOCATIONS.filter(l => FALLBACK_REGIONS.includes(l.region) && !l.off && !l.kidnap && !l.crazy);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// 💰 Rich Land: a refused / unpaid entry fee → 40% 거지쉼터 · 30% a random Dead Land map · 30% a random Difficult Land map
export const RICH_FALLBACK_TEXT = "🥣 40%: 거지쉼터\n☠️ 30%: Dead Land (랜덤 맵)\n🧗 30%: Difficult Land (랜덤 맵)";
export function richFallback() {
    const r = Math.random();
    const shelter = LOCATIONS.find(l => l.id === "beggar_shelter" && !l.off);
    const region = r < 0.4 && shelter ? null : r < 0.7 ? "deadland" : "difficult";
    if (!region) return shelter;
    const pool = LOCATIONS.filter(l => l.region === region && !l.off && !l.kidnap && !l.crazy);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : shelter;
}

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const S = () => G.S();
const ps = pid => S().ps[pid];
const item = (id, n = 1) => pid => { ps(pid).items[id] = (ps(pid).items[id] || 0) + n; };
const emoItem = (id, n = 1) => pid => M.giveItem(pid, id, n);
const gold = n => pid => { ps(pid).money += n; };
const points = n => pid => { ps(pid).points += n; };
const card = L => pid => { ps(pid).items["card_" + L] = (ps(pid).items["card_" + L] || 0) + 1; };

// 🎁 pick 3
export const BUNKER_PICK = [
    { id: "crazy_ball", emoji: "🌀", name: "Crazy Ball", give: emoItem("ITEM008") },
    { id: "g30000", emoji: "💰", name: "30,000 G", give: gold(30000) },
    { id: "weapon_del", emoji: "🗑️", name: "무기삭제권", give: item("weapon_del") },
    { id: "pet_swap", emoji: "🔁", name: "펫 교체권", give: item("pet_swap") },
    { id: "card_G", emoji: "🔤", name: "알파벳 카드 G", give: card("G") },
    { id: "card_R", emoji: "🔤", name: "알파벳 카드 R", give: card("R") },
    { id: "card_S", emoji: "🔤", name: "알파벳 카드 S", give: card("S") },
    { id: "remote_bank", emoji: "📲", name: "Remote 은행 이용권", give: item("remote_bank") },
    { id: "flu_cure", emoji: "💉", name: "독감치료제", give: item("flu_cure") },
    { id: "radar2", emoji: "📡", name: "Super Monster Radar", give: emoItem("RADAR_2") },
    { id: "orb_normal", emoji: "⚪", name: "Normal Orb", give: emoItem("ITEM_NORMAL_ORB") },
    { id: "orb_water", emoji: "💧", name: "Water Orb", give: emoItem("ITEM_WATER_ORB") },
    { id: "orb_bug", emoji: "🐛", name: "Bug Orb", give: emoItem("ITEM_BUG_ORB") },
    { id: "p30", emoji: "💎", name: "30 P", give: points(30) }
];
// 🎲 random 1
export const BUNKER_RANDOM = [
    { id: "p100", emoji: "💎", name: "100 P", give: points(100) },
    { id: "master", emoji: "🟣", name: "Master Ball", give: emoItem("ITEM004") },
    { id: "radar4", emoji: "🌟", name: "Legendary Monster Radar", give: emoItem("RADAR_4") },
    { id: "dna", emoji: "🧬", name: "Monster DNA", give: emoItem("MAT_MONSTER_DNA") },
    { id: "g200000", emoji: "💰", name: "200,000 G", give: gold(200000) },
    { id: "oxy_cap", emoji: "🫧", name: "Oxygen Capsule", give: emoItem("MIX_OXYGEN_CAPSULE") },
    { id: "hp_full", emoji: "❤️‍🩹", name: "FULL HP약", give: item("hp_full") },
    { id: "emo_hpfull", emoji: "❤️‍🩹", name: "몬스터 FULL HP 약", give: emoItem("EMO_HPFULL") },
    { id: "cancer_cure", emoji: "💊", name: "암치료제", give: item("cancer_cure") },
    { id: "emo_cure", emoji: "💊", name: "몬스터 만능 치료제", give: emoItem("EMO_CURE") },
    { id: "emo_slot", emoji: "🧳", name: "이모몬스터 슬롯 확장권", give: item("emo_slot") },
    { id: "npc_block10", emoji: "🎫", name: "NPC 공격 Block 권 (10회)", give: item("npc_block10") },
    { id: "mission_pass", emoji: "🎫", name: "미션완료권", give: item("mission_pass") }
];

// once per turn: decide on arrival whether (and when) the key turns up
export function bunkerArm(t) {
    if (t.bunker) return t.bunker;
    const win = Math.min(BUNKER_KEY_WINDOW, t.remaining);
    t.bunker = { keyAt: win > 5 && Math.random() < BUNKER_KEY_CHANCE ? t.remaining - rint(3, win - 1) : null, found: false, used: false };
    Store.saveSeason();
    return t.bunker;
}
export const bunkerKeyDue = t => !!t.bunker && t.bunker.keyAt != null && !t.bunker.found && t.remaining <= t.bunker.keyAt;

function claim(pid, list) {
    for (const r of list) r.give(pid);
    G.log(`🔐 ${displayName(Store.player(pid))} Bunker 금고 → ${list.map(r => r.name).join(" · ")}`);
    Store.saveSeason(true);
}

// 🔑 key found → (button) → the dark vault. Resolves once the player leaves the vault.
export async function bunkerKeyFound(pid, t) {
    t.bunker.found = true; Store.saveSeason();
    Sound.bonus();
    await new Promise(res => {
        const m = modal(h("div.bk-found",
            h("div.bk-key", "🔑"),
            h("h2", "Bunker Key 발견!"),
            h("p", "벙커 구석에서 녹슨 열쇠를 발견했습니다… 숨겨진 금고로 들어갈 수 있을 것 같습니다."),
            h("button.btn.gold.big", { onclick: () => { m.close(); res(); } }, "🔐 Bunker 입장하기")), { title: "🔑 Bunker Key", closable: false, cls: "bk-modal" });
    });
    await openVault(pid, t);
}

async function openVault(pid, t) {
    const chosen = new Set();
    let done = false;
    const pickBtn = h("button.btn.gold.big", { disabled: true }, "🎁 선택한 3개 가져가기 (0/3)");
    const grid = h("div.bk-grid", BUNKER_PICK.map(r => {
        const b = h("button.bk-item", { onclick: () => {
            if (done) return;
            if (chosen.has(r)) chosen.delete(r); else if (chosen.size < 3) chosen.add(r); else return toast("3개까지만 고를 수 있습니다", "warn");
            b.classList.toggle("on", chosen.has(r));
            pickBtn.disabled = chosen.size !== 3;
            pickBtn.textContent = `🎁 선택한 3개 가져가기 (${chosen.size}/3)`;
        } }, h("span.bk-ico", r.emoji), h("b", r.name));
        return b;
    }));
    const randStrip = h("div.bk-rand", BUNKER_RANDOM.map(r => h("span", { title: r.name }, r.emoji)));
    const randBtn = h("button.btn.big.bk-randbtn", "🎲 랜덤 1개 뽑기");
    const result = h("div.bk-result");
    const leave = h("button.btn.ghost.big", { style: { display: "none" } }, "🚪 벙커에서 나가기");
    const body = h("div.bk-vault",
        h("div.bk-door", avatar(pid, 96), h("div", h("b", displayName(Store.player(pid))), h("small", "숨겨진 벙커 금고에 들어왔습니다"))),
        h("p.bk-rule", "금은보화와 아이템이 숨겨져 있습니다. ", h("b", "원하는 아이템 3개"), "를 고르거나, ", h("b", "랜덤 코너에서 1개"), "를 뽑으세요. (둘 중 하나만)"),
        h("div.bk-cols",
            h("section", h("h3", "🎁 원하는 아이템 3개 고르기"), grid, pickBtn),
            h("section", h("h3", "🎲 랜덤 아이템 코너 (1개)"), randStrip, h("p.small.muted", "100P · 200,000G · 마스터볼 · Legendary Radar · 미션완료권 등 13가지 중 1개"), randBtn)),
        result, leave);
    const m = modal(body, { title: "🔐 BUNKER", closable: false, wide: true, cls: "bk-modal" });
    const finish = list => {
        done = true; t.bunker.used = true;
        claim(pid, list);
        pickBtn.disabled = randBtn.disabled = true;
        result.replaceChildren(h("h3", "획득!"), h("div.bk-got", list.map(r => h("div.bk-item.on", h("span.bk-ico", r.emoji), h("b", r.name)))));
        leave.style.display = "";
        Sound.fanfare(); confetti(70, ["💰", "🪙", "💎", "🔑"]);
    };
    pickBtn.onclick = () => { if (!done && chosen.size === 3) finish([...chosen]); };
    randBtn.onclick = async () => {
        if (done) return; done = true; randBtn.disabled = pickBtn.disabled = true;
        const spans = [...randStrip.children];
        const win = Math.floor(Math.random() * BUNKER_RANDOM.length);
        const steps = BUNKER_RANDOM.length * 2 + win;
        for (let i = 0; i <= steps; i++) {
            spans.forEach((s, k) => s.classList.toggle("on", k === i % spans.length));
            Sound.tick?.();
            await sleep(35 + i * 3);
        }
        finish([BUNKER_RANDOM[win]]);
    };
    leave.onclick = () => m.close();
    await m.closed;
    document.dispatchEvent(new Event("emo:change"));
}
export const accessCardText = loc => `${loc.emoji} ${loc.name} 입구에서 🪪 Access Card(출입증)를 ${fmt(ACCESS_CARD_PRICE)} G에 판매합니다.\n구입하고 입장할까요?\n(사지 않으면 ☠️ Dead Land · 🧗 Difficult Land · 👹 NPC Land 중 랜덤 맵으로 보내집니다)`;
// the door question — buttons only (a click outside must not count as "no")
export function askAccessCard(loc) {
    return new Promise(res => {
        const m = modal(h("div.confirm.bk-door-ask",
            h("div.bk-key", "🪪"),
            ...accessCardText(loc).split("\n").map(t => h("p", t)),
            h("div.row.end",
                h("button.btn.ghost", { onclick: () => { m.close(); res(false); } }, "안 산다"),
                h("button.btn.gold", { onclick: () => { m.close(); res(true); } }, `🪪 ${fmt(ACCESS_CARD_PRICE)} G에 구입하고 입장`))), { title: "🔐 Bunker 출입증", closable: false });
    });
}
