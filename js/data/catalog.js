// =====================================================================
// Game catalog: missions, pets, pet effects, weapons, frames, profile
// effects, shop items and map locations. Add new entries here — every
// screen reads from these lists.
// =====================================================================

import { REGIONS, NEW_MAPS, CL1_PATCH, REGION_ITEMS } from "./regions.js";
export { REGIONS, REGION_ITEMS };
export const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// ---------------------------------------------------------------- missions
// type: bonus | slot_net | casino_net | points | jackpot | battle
// battle rule: random | even | odd (roster number) | poor | rich (money) | lowpts | highpts (points)
//   — two players fight, the loser is eliminated, the winner keeps their damaged HP
// jackpot `min` is the lowest tier that counts (MINI < MINOR < MAXI < MAJOR < GRAND)
export const TIERS = ["최하", "하", "중", "상", "최상"];
export const JACKPOT_RANK = { MINI: 1, MINOR: 2, MAXI: 3, EGG: 3, MONKEY: 3.5, MAJOR: 4, GRAND: 5, MEGA: 6, VAULT: 6 };

export const MISSIONS = [
    // 최하
    { id: "t0_bonus",  tier: 0, type: "bonus",      text: "슬롯게임에서 아무 보너스나 터뜨리기" },
    { id: "t0_slot",   tier: 0, type: "slot_net",   v: 5000,  text: "슬롯게임으로 5,000G 이상 벌기" },
    { id: "t0_casino", tier: 0, type: "casino_net", v: 5000,  text: "카지노게임으로 5,000G 이상 벌기" },
    { id: "t0_points", tier: 0, type: "points",     v: 10,    text: "10 포인트 이상 획득하기" },
    { id: "t0_battle", tier: 0, type: "battle", rule: "random", text: "⚔️ 랜덤 2인 배틀" },
    { id: "t0_battle_even", tier: 0, type: "battle", rule: "even", text: "⚔️ 짝수 번호 플레이어 중 랜덤 2인 배틀" },
    { id: "t0_battle_odd", tier: 0, type: "battle", rule: "odd", text: "⚔️ 홀수 번호 플레이어 중 랜덤 2인 배틀" },
    // 하
    { id: "t1_jp",     tier: 1, type: "jackpot", min: "MINI", text: "MINI 잭팟 WIN 하기" },
    { id: "t1_slot",   tier: 1, type: "slot_net",   v: 10000, text: "슬롯게임으로 10,000G 이상 벌기" },
    { id: "t1_casino", tier: 1, type: "casino_net", v: 10000, text: "카지노게임으로 10,000G 이상 벌기" },
    { id: "t1_points", tier: 1, type: "points",     v: 30,    text: "30 포인트 이상 획득하기" },
    { id: "t1_battle", tier: 1, type: "battle", rule: "random", text: "⚔️ 랜덤 2인 배틀" },
    { id: "t1_battle_poor", tier: 1, type: "battle", rule: "poor", text: "⚔️ 돈이 가장 적은 사람들 중 랜덤 2인 배틀" },
    // 중
    { id: "t2_jp",     tier: 2, type: "jackpot", min: "MINOR", text: "MINOR 잭팟 WIN 하기" },
    { id: "t2_slot",   tier: 2, type: "slot_net",   v: 30000, text: "슬롯게임으로 30,000G 이상 벌기" },
    { id: "t2_casino", tier: 2, type: "casino_net", v: 30000, text: "카지노게임으로 30,000G 이상 벌기" },
    { id: "t2_points", tier: 2, type: "points",     v: 50,    text: "50 포인트 이상 획득하기" },
    { id: "t2_battle", tier: 2, type: "battle", rule: "random", text: "⚔️ 랜덤 2인 배틀" },
    { id: "t2_battle_lowpts", tier: 2, type: "battle", rule: "lowpts", text: "⚔️ 포인트가 가장 적은 사람들 중 랜덤 2인 배틀" },
    // 상
    { id: "t3_jp",     tier: 3, type: "jackpot", min: "MINOR", text: "MINOR 잭팟 WIN 하기" },
    { id: "t3_slot",   tier: 3, type: "slot_net",   v: 50000, text: "슬롯게임으로 50,000G 이상 벌기" },
    { id: "t3_casino", tier: 3, type: "casino_net", v: 50000, text: "카지노게임으로 50,000G 이상 벌기" },
    { id: "t3_points", tier: 3, type: "points",     v: 80,    text: "80 포인트 이상 획득하기" },
    { id: "t3_battle", tier: 3, type: "battle", rule: "random", text: "⚔️ 랜덤 2인 배틀" },
    { id: "t3_battle_rich", tier: 3, type: "battle", rule: "rich", text: "⚔️ 돈이 가장 많은 사람들 중 랜덤 2인 배틀" },
    // 최상
    { id: "t4_jp",     tier: 4, type: "jackpot", min: "MAXI",  text: "MAXI 이상 잭팟 WIN 하기" },
    { id: "t4_slot",   tier: 4, type: "slot_net",   v: 100000, text: "슬롯게임으로 100,000G 이상 벌기" },
    { id: "t4_casino", tier: 4, type: "casino_net", v: 100000, text: "카지노게임으로 100,000G 이상 벌기" },
    { id: "t4_points", tier: 4, type: "points",     v: 100,    text: "100 포인트 이상 획득하기" },
    { id: "t4_battle", tier: 4, type: "battle", rule: "random", text: "⚔️ 랜덤 2인 배틀" },
    { id: "t4_battle_highpts", tier: 4, type: "battle", rule: "highpts", text: "⚔️ 포인트가 가장 많은 사람들 중 랜덤 2인 배틀" },

    // ---- added missions ------------------------------------------------
    // combo: casino_net ≥ c AND slot_net ≥ s · slot_wins: winning spins (a bonus = 1 win)
    // five: spins with a 5-of-a-kind · freespin: free-spin bonus entries
    // beg_max: round begging total ≤ v → candidate · job_min: round job pay < v → candidate
    // card: players without that alphabet card (or who keep it) are candidates
    // has: players without the thing are candidates · rank: a group is drawn by rule
    { id: "n0_combo", tier: 0, type: "combo", c: 100, s: 1000, text: "카지노 게임으로 100G 이상, 슬롯 게임으로 1,000G 이상 얻기" },
    { id: "n0_five1", tier: 0, type: "five", v: 1, text: "슬롯 게임에서 5 of a kind 1번 이상 달성하기" },
    { id: "n0_free", tier: 0, type: "freespin", v: 1, text: "무료스핀(Free Spin) 보너스 1회 진입하기" },
    { id: "n0_beg", tier: 0, type: "beg_max", v: 500, text: "구걸로 번 돈이 500G 이하인 플레이어 중 한 명 탈락" },
    { id: "n1_combo", tier: 1, type: "combo", c: 300, s: 3000, text: "카지노 게임으로 300G 이상, 슬롯 게임으로 3,000G 이상 얻기" },
    { id: "n1_wins", tier: 1, type: "slot_wins", v: 30, text: "슬롯 게임 Win 횟수 30번 이상 달성하기 (보너스는 1 Win)" },
    { id: "n1_pet", tier: 1, type: "has", what: "pet", text: "펫 없는 플레이어 한 명 탈락" },
    { id: "n1_card_G", tier: 1, type: "card", letter: "G", text: "알파벳 카드 G 없는 플레이어 탈락" },
    { id: "n1_card_A", tier: 1, type: "card", letter: "A", text: "알파벳 카드 A 없는 플레이어 탈락" },
    { id: "n1_b_poor2", tier: 1, type: "battle", rule: "poor2", text: "⚔️ 가장 돈이 적은 사람 두 명 배틀로 1명 탈락" },
    { id: "n1_b_nopet", tier: 1, type: "battle", rule: "nopet", text: "⚔️ 펫 또는 펫 효과를 보유하지 않은 후보들 중 랜덤 2인 배틀" },
    { id: "n1_b_weap", tier: 1, type: "battle", rule: "fewweapons", text: "⚔️ 무기 보유 개수가 가장 적은 사람 중 랜덤 2인 배틀" },
    { id: "n1_b_lowhp", tier: 1, type: "battle", rule: "lowhp", text: "⚔️ HP가 가장 적은 후보들 중 랜덤 2인 배틀" },
    { id: "n2_five3", tier: 2, type: "five", v: 3, text: "슬롯 게임에서 5 of a kind 3번 이상 달성하기" },
    { id: "n2_job", tier: 2, type: "job_min", v: 20000, text: "직업으로 20,000G 이상 벌지 못한 플레이어 중 한 명 탈락" },
    { id: "n2_card_M", tier: 2, type: "card", letter: "M", text: "알파벳 카드 M 없는 플레이어 탈락" },
    { id: "n2_card_B", tier: 2, type: "card", letter: "B", text: "알파벳 카드 B 없는 플레이어 탈락" },
    { id: "n2_b_lowpts2", tier: 2, type: "battle", rule: "lowpts2", text: "⚔️ 가장 포인트가 적은 사람 두 명 배틀로 1명 탈락" },
    { id: "n2_b_noframe", tier: 2, type: "battle", rule: "noframe", text: "⚔️ 프레임 또는 프레임 효과를 보유하지 않은 후보들 중 랜덤 2인 배틀" },
    { id: "n2_b_maps", tier: 2, type: "battle", rule: "fewmaps", text: "⚔️ 가장 적은 수의 맵을 방문한 사람 중 랜덤 2인 배틀" },
    { id: "n2_b_items", tier: 2, type: "battle", rule: "fewitems", text: "⚔️ Bag에 소유한 아이템이 가장 적은 후보들 중 랜덤 2인 배틀" },
    { id: "n2_b_spins2", tier: 2, type: "battle", rule: "fewspins2", text: "⚔️ 시즌 전체 슬롯 플레이 횟수가 가장 적은 최하위 2인 랜덤 배틀" },
    { id: "n2_r_spins", tier: 2, type: "rank", rule: "fewspins", text: "시즌 전체 슬롯 플레이 횟수가 가장 적은 사람 중에서 랜덤 탈락" },
    { id: "n3_five5", tier: 3, type: "five", v: 5, text: "슬롯 게임에서 5 of a kind 5번 이상 달성하기" },
    { id: "n3_card_L", tier: 3, type: "card", letter: "L", text: "알파벳 카드 L 없는 플레이어 탈락" },
    { id: "n3_card_E", tier: 3, type: "card", letter: "E", text: "알파벳 카드 E 없는 플레이어 탈락" },
    { id: "n3_b_rich2", tier: 3, type: "battle", rule: "rich2", text: "⚔️ 가장 돈이 많은 사람 두 명 배틀로 1명 탈락" },
    { id: "n3_b_net2", tier: 3, type: "battle", rule: "netlow2", text: "⚔️ 카지노+슬롯 손익 순위 최하위 2인 배틀" },
    { id: "n3_b_highhp", tier: 3, type: "battle", rule: "highhp", text: "⚔️ HP가 가장 많은 후보들 중 랜덤 2인 배틀" },
    { id: "n3_r_poor", tier: 3, type: "rank", rule: "fewspins_poor", text: "슬롯 플레이 횟수가 가장 적으면서 보유한 골드가 가장 적은 사람 랜덤 탈락" },
    { id: "n3_nogear", tier: 3, type: "has", what: "gear", text: "펫, 펫 효과, 프레임, 프레임 효과를 보유하지 않은 후보들 중에서 랜덤 탈락" },
    { id: "n4_card_R", tier: 4, type: "card", letter: "R", text: "알파벳 카드 R 없는 플레이어 탈락" },
    { id: "n4_card_S", tier: 4, type: "card", letter: "S", text: "알파벳 카드 S 없는 플레이어 탈락" },
    { id: "n4_b_highpts2", tier: 4, type: "battle", rule: "highpts2", text: "⚔️ 가장 포인트가 많은 사람 두 명 배틀로 1명 탈락" }
];

// alphabet cards (G A M B L E R S): dropped by slot reels, sold in the shops,
// used up by card missions and to force a refused random entry
export const ALPHABET = ["G", "A", "M", "B", "L", "E", "R", "S"];
export const cardId = l => "card_" + l;

// ---------------------------------------------------------------- pets
// art: emoji layers rendered by ui/pets.js. `boost` is in percent.
export const PETS = [
    // 일반펫 — only raises the chance to win money
    { id: "poop",        kind: "normal", boost: 5,  name: "귀여운 응가",                art: { a: "💩", anim: "bounce" } },
    { id: "lucky_pig",   kind: "normal", boost: 5,  name: "통통한 복돼지",              art: { a: "🐷", anim: "wobble" } },
    { id: "puppy",       kind: "normal", boost: 5,  name: "귀여운 강아지",              art: { a: "🐶", anim: "wag" } },
    { id: "coin_frog",   kind: "normal", boost: 10, name: "동전을 물고 있는 개구리",    art: { a: "🐸", b: "🪙", anim: "hop", bpos: "mouth" } },
    { id: "eyeball",     kind: "normal", boost: 10, name: "움직이면서 깜빡이는 눈알",    art: { a: "👁️", anim: "blinkroll" } },
    { id: "atm_walker",  kind: "normal", boost: 10, name: "발이 달린채 움직이는 돈자판기", art: { a: "🏧", b: "🦶🦶", anim: "walk", bpos: "feet" } },
    { id: "clover_dove", kind: "normal", boost: 15, name: "네잎클로버를 물고 날라다니는 비둘기", art: { a: "🕊️", b: "🍀", anim: "fly", bpos: "beak" } },
    { id: "pig_tower",   kind: "normal", boost: 15, name: "통통한 복돼지 3마리 탑",      art: { stack: ["🐷", "🐷", "🐷"], anim: "towerwobble" } },
    { id: "gold_fish",   kind: "normal", boost: 15, name: "점프하는 황금 금붕어",        art: { a: "🐠", b: "🌊", anim: "fishjump", bpos: "water", gold: true } },
    // 특수펫 — raises win chance AND bonus chance
    { id: "lucky_pouch", kind: "special", boost: 5,  name: "돈을 쏟아내는 복주머니",      art: { a: "👝", anim: "pour", drops: "🪙" } },
    { id: "gold_zebra",  kind: "special", boost: 5,  name: "황금 무늬 얼룩말",            art: { a: "🦓", anim: "prance", gold: true } },
    { id: "dollar_monkey", kind: "special", boost: 5, name: "달러 눈 원숭이",             art: { a: "🐵", b: "$ $", anim: "wobble", bpos: "eyes" } },
    { id: "koi_pond",    kind: "special", boost: 10, name: "돈을 문 잉어들의 연못",       art: { pond: true, anim: "pond" } },
    { id: "magic_hand",  kind: "special", boost: 10, name: "돈뭉치를 뿌리는 마법의 손",   art: { a: "🫴", anim: "scatter", drops: "💸" } },
    { id: "glass_hamster", kind: "special", boost: 10, name: "볼 빵빵 투명 햄스터",       art: { a: "🐹", b: "🪙🪙", anim: "chew", bpos: "cheeks", ghost: true } },
    { id: "dove_trio",   kind: "special", boost: 15, name: "네잎클로버를 문 비둘기 3마리", art: { trio: "🕊️", b: "🍀", anim: "trio" } },
    { id: "red_eye_rabbit", kind: "special", boost: 15, name: "큰 동전을 쥔 빨간눈 토끼", art: { a: "🐇", b: "🪙", anim: "hug", bpos: "hug", redeye: true } },
    { id: "money_dragon", kind: "special", boost: 15, name: "돈을 문 커다란 용",          art: { a: "🐉", b: "💰", anim: "dragon", bpos: "mouth" } }
];

// Pet effects. fx = particle preset used by ui/fx.js (see FX_PRESETS)
export const PET_EFFECTS = [
    // 일반펫효과
    { id: "fx_poop",    kind: "normal", boost: 5,  name: "똥무늬 효과",              fx: { chars: ["💩"], mode: "float", n: 8, size: 14 } },
    { id: "fx_shine",   kind: "normal", boost: 5,  name: "반짝이는 행운의 빛",        fx: { chars: ["✨", "⭐"], mode: "twinkle", n: 12, size: 14 } },
    { id: "fx_fu",      kind: "normal", boost: 5,  name: "움직이는 '福'",             fx: { chars: ["福"], mode: "orbit", n: 4, size: 18, cls: "fx-fu" } },
    { id: "fx_lucky",   kind: "normal", boost: 10, name: "움직이는 LUCKY 글자",       fx: { chars: ["L", "U", "C", "K", "Y"], mode: "wave", n: 5, size: 18, cls: "fx-lucky" } },
    { id: "fx_heart",   kind: "normal", boost: 10, name: "사랑스러운 하트",           fx: { chars: ["💖", "💕", "💗"], mode: "rise", n: 10, size: 16 } },
    { id: "fx_clover",  kind: "normal", boost: 10, name: "네잎클로버",               fx: { chars: ["🍀"], mode: "float", n: 9, size: 16 } },
    { id: "fx_koi",     kind: "normal", boost: 15, name: "주변을 도는 잉어들",        fx: { chars: ["🐟", "🐠", "🐡"], mode: "orbit", n: 6, size: 18, cls: "fx-koi" } },
    { id: "fx_piglet",  kind: "normal", boost: 15, name: "황금빛 아기돼지",           fx: { chars: ["🐖"], mode: "jump", n: 5, size: 16, cls: "fx-gold" } },
    { id: "fx_coin",    kind: "normal", boost: 15, name: "황금빛 코인",              fx: { chars: ["🪙"], mode: "orbit", n: 8, size: 16 } },
    // 특수펫효과
    { id: "fx_oil",     kind: "special", boost: 5,  name: "땅에서 뿜어지는 오일머니", fx: { chars: ["💵", "🛢️", "💵"], mode: "fountain", n: 14, size: 16 } },
    { id: "fx_gdove",   kind: "special", boost: 5,  name: "황금빛 비둘기 떼",         fx: { chars: ["🕊️"], mode: "swoop", n: 6, size: 18, cls: "fx-gold" } },
    { id: "fx_gfrog",   kind: "special", boost: 5,  name: "뛰어오르는 황금 미니 개구리", fx: { chars: ["🐸"], mode: "jump", n: 7, size: 15, cls: "fx-gold" } },
    { id: "fx_animals", kind: "special", boost: 10, name: "돈을 문 동물들이 떨어짐",   fx: { chars: ["🐸", "🐷", "🐹", "💵"], mode: "rain", n: 12, size: 17 } },
    { id: "fx_dovedrop", kind: "special", boost: 10, name: "돈 뿌리고 사라지는 비둘기", fx: { chars: ["🕊️"], mode: "flyby", n: 1, size: 26, trail: "💸" } },
    { id: "fx_coinwater", kind: "special", boost: 10, name: "동전 물이 차오름",        fx: { chars: ["🪙"], mode: "flood", n: 12, size: 13 } },
    { id: "fx_moneyrain", kind: "special", boost: 15, name: "우수수 돈비",             fx: { chars: ["💸", "💵", "💴", "💶"], mode: "rain", n: 18, size: 17 } },
    { id: "fx_moneyfire", kind: "special", boost: 15, name: "돈폭죽",                  fx: { chars: ["💵", "🪙", "✨"], mode: "firework", n: 18, size: 15 } },
    { id: "fx_dragons", kind: "special", boost: 15, name: "돈 뿌리는 용들",           fx: { chars: ["🐉", "🐲"], mode: "orbit", n: 3, size: 24, trail: "💸" } }
];

// ---------------------------------------------------------------- weapons
// type: attack | block (blocks the next hit) | sleep (opponent skips 1~3 turns)
//       magic (random spell) | nomove (does nothing — not sold, only from a magic spell)
export const BASIC_ATTACK = { id: "basic", name: "기본 공격", emoji: "✊", type: "attack", atk: 5, acc: 30, anim: "punch" };
export const WEAPONS = [
    { id: "punch",      name: "펀치",            emoji: "👊", type: "attack", atk: 5,  acc: 70, anim: "punch" },
    { id: "guard",      name: "방어",            emoji: "🛡️", type: "block",  atk: 0,  acc: 75, anim: "shield" },
    { id: "tongue",     name: "혀 공격",         emoji: "👅", type: "attack", atk: 10, acc: 80, anim: "tongue" },
    { id: "kick",       name: "발차기",          emoji: "🦶", type: "attack", atk: 5,  acc: 70, anim: "kick" },
    { id: "rock",       name: "돌 떨어뜨리기",    emoji: "🪨", type: "attack", atk: 20, acc: 75, anim: "drop" },
    { id: "ghost_punch", name: "고스트 더블 펀치", emoji: "👻", type: "attack", atk: 25, acc: 65, anim: "ghost" },
    { id: "ko_punch",   name: "K.O 펀치",        emoji: "🥊", type: "attack", atk: 80, acc: 10, anim: "ko" },
    { id: "holo_ball",  name: "홀로그램볼",      emoji: "🔮", type: "attack", atk: 30, acc: 70, anim: "orb" },
    { id: "sleep_flute", name: "수면피리",       emoji: "🪈", type: "sleep",  atk: 0,  acc: 60, anim: "sleep" },
    { id: "coin_throw", name: "동전던지기",      emoji: "🪙", type: "attack", atk: 10, acc: 90, anim: "coin" },
    // rare (point shop)
    { id: "thunder",    name: "번개 해머",       emoji: "⚡", type: "attack", atk: 40, acc: 65, anim: "thunder", rare: true },
    { id: "dragon_breath", name: "드래곤 브레스", emoji: "🐲", type: "attack", atk: 50, acc: 55, anim: "fire", rare: true },
    { id: "gold_storm", name: "황금 동전 폭풍",  emoji: "🌪️", type: "attack", atk: 25, acc: 90, anim: "storm", rare: true },
    // magic: one of five random spells on a hit (see battle.js MAGIC_SPELLS)
    { id: "magic",      name: "마법",            emoji: "🪄", type: "magic",  atk: 0,  acc: 80, anim: "magic" },
    // spray: the target's weapon accuracy is −10% for their next 3 turns (never stacks)
    { id: "spray",      name: "스프레이",        emoji: "🧴", type: "spray",  atk: 0,  acc: 80, anim: "spray", turns: 3, accDown: 10 },
    // not for sale — what a magic spell turns an opponent's weapon into
    { id: "no_move",    name: "No Move",         emoji: "🫥", type: "nomove", atk: 0,  acc: 100, anim: "nomove", hidden: true }
];

// ---------------------------------------------------------------- decorations (no skills)
export const FRAMES = [
    { id: "frame_silver",  name: "실버 프레임",     cls: "fr-silver" },
    { id: "frame_gold",    name: "골드 프레임",     cls: "fr-gold" },
    { id: "frame_neon",    name: "네온 핑크",       cls: "fr-neon" },
    { id: "frame_ice",     name: "얼음 크리스탈",   cls: "fr-ice" },
    { id: "frame_fire",    name: "불꽃 프레임",     cls: "fr-fire" },
    { id: "frame_rainbow", name: "레인보우",        cls: "fr-rainbow" },
    { id: "frame_casino",  name: "카지노 전구",     cls: "fr-bulbs" },
    // rare
    { id: "frame_diamond", name: "다이아몬드",      cls: "fr-diamond", rare: true },
    { id: "frame_dragon",  name: "황금 용 프레임",  cls: "fr-dragon",  rare: true },
    { id: "frame_galaxy",  name: "갤럭시",          cls: "fr-galaxy",  rare: true }
];
export const PROFILE_EFFECTS = [
    { id: "pe_sparkle", name: "반짝반짝",     fx: { chars: ["✨"], mode: "twinkle", n: 10, size: 13 } },
    { id: "pe_hearts",  name: "하트 뿅뿅",    fx: { chars: ["❤️", "💕"], mode: "rise", n: 8, size: 13 } },
    { id: "pe_snow",    name: "눈송이",       fx: { chars: ["❄️"], mode: "rain", n: 10, size: 12 } },
    { id: "pe_flame",   name: "불꽃",         fx: { chars: ["🔥"], mode: "rise", n: 9, size: 14 } },
    { id: "pe_music",   name: "음표",         fx: { chars: ["🎵", "🎶"], mode: "float", n: 7, size: 14 } },
    { id: "pe_bubbles", name: "비눗방울",     fx: { chars: ["🫧"], mode: "rise", n: 9, size: 14 } },
    // rare
    { id: "pe_crown",   name: "왕관 후광",    fx: { chars: ["👑"], mode: "halo", n: 1, size: 26 }, rare: true },
    { id: "pe_stars",   name: "별똥별",       fx: { chars: ["🌠", "⭐"], mode: "rain", n: 10, size: 15 }, rare: true },
    { id: "pe_aurora",  name: "오로라",       fx: { chars: [], mode: "aurora", n: 0 }, rare: true }
];

// ---------------------------------------------------------------- consumable items
export const ITEMS = [
    { id: "time_ext",    name: "플레이 시간 5분 연장권", emoji: "⏱️", desc: "현재 턴의 남은 시간을 5분 늘립니다." },
    { id: "weapon_del",  name: "무기삭제권",            emoji: "🗑️", desc: "보유 무기 1개를 삭제해 슬롯을 비웁니다." },
    { id: "mission_pass", name: "미션완료권",          emoji: "🎫", desc: "이번 라운드 미션을 그냥 통과합니다." },
    { id: "casino_plus1", name: "카지노게임 1회 추가권", emoji: "🃏", desc: "이번 라운드 카지노게임 가능 횟수 +1" },
    { id: "slot_plus5",  name: "슬롯게임 5회 추가권",   emoji: "🎰", desc: "이번 라운드 슬롯 스핀 가능 횟수 +5" },
    { id: "pet_swap",    name: "펫 교체권",             emoji: "🔁", desc: "이미 펫이 있을 때 다른 펫으로 바꾸려면 필요합니다. (기존 펫은 사라지고 펫효과는 유지)" },
    { id: "hp_10",      name: "HP약",       emoji: "🧪", desc: "HP +10 회복", hp: 10 },
    { id: "hp_50",      name: "+50 HP약",   emoji: "💊", desc: "HP +50 회복", hp: 50 },
    { id: "hp_full",    name: "FULL HP약",  emoji: "❤️‍🩹", desc: "HP 전체 회복", hp: 999 },
    { id: "pass_emo",    name: "Emo World Casino 출입권",    emoji: "🎟️", loc: "emo" },
    { id: "pass_poly",   name: "Polynesia Casino 출입권",    emoji: "🎟️", loc: "poly" },
    { id: "pass_ground", name: "Ground Town Casino 출입권",  emoji: "🎟️", loc: "ground" },
    { id: "pass_foggy",  name: "Foggy Nation Casino 출입권", emoji: "🎟️", loc: "foggy" },
    { id: "pass_mj",     name: "MJ World Casino 출입권",     emoji: "🎟️", loc: "mj" },
    { id: "pass_dung",   name: "Dung Town Casino 출입권",    emoji: "🎟️", loc: "dungtown" },
    ...REGION_ITEMS.map(r => ({ id: r.id, name: r.name, emoji: r.emoji, desc: r.desc, region: r.region })),
    ...ALPHABET.map(l => ({ id: cardId(l), name: `알파벳 카드 ${l}`, emoji: "🔤", letter: l, desc: "미션·맵 입장에 1번 쓰고 사라집니다." }))
];

// ---------------------------------------------------------------- shops
// Prices assume a 200,000 G bankroll and are set slightly high on purpose.
// cat: item | pet | effect | weapon | frame | peffect ; cur: G | P
const petPriceG = { 5: 45000, 10: 90000, 15: 160000 };
const specialPetPriceG = { 5: 80000, 10: 150000 };
const fxPriceG = { 5: 30000, 10: 65000, 15: 120000 };
const specialFxPriceG = { 5: 60000, 10: 120000 };
const weaponPriceG = { spray: 35000, magic: 500000, punch: 12000, guard: 25000, tongue: 28000, kick: 12000, rock: 45000, ghost_punch: 65000, ko_punch: 55000, holo_ball: 80000, sleep_flute: 70000, coin_throw: 30000 };

export const SHOPS = {
    general: {
        name: "일반 상점", icon: "🏪", cur: "G",
        list: [
            { cat: "item", id: "time_ext", price: 30000 },
            { cat: "item", id: "weapon_del", price: 15000 },
            { cat: "item", id: "casino_plus1", price: 300 },
            { cat: "item", id: "slot_plus5", price: 1000 },
            { cat: "item", id: "pet_swap", price: 20000 },
            { cat: "item", id: "hp_10", price: 10000 },
            { cat: "item", id: "hp_50", price: 45000 },
            { cat: "item", id: "hp_full", price: 95000 },
            ...REGION_ITEMS.map(r => ({ cat: "item", id: r.id, price: r.price })),
            ...ALPHABET.map(l => ({ cat: "item", id: cardId(l), price: 50000 }))
            // map passes are appended below LOCATIONS (one per map)
        ]
    },
    pet: {
        name: "펫 상점", icon: "🐾", cur: "G",
        list: [
            ...PETS.filter(p => p.kind === "normal").map(p => ({ cat: "pet", id: p.id, price: petPriceG[p.boost] })),
            ...PETS.filter(p => p.kind === "special" && p.boost < 15).map(p => ({ cat: "pet", id: p.id, price: specialPetPriceG[p.boost] })),
            ...PET_EFFECTS.filter(e => e.kind === "normal").map(e => ({ cat: "effect", id: e.id, price: fxPriceG[e.boost] })),
            ...PET_EFFECTS.filter(e => e.kind === "special" && e.boost < 15).map(e => ({ cat: "effect", id: e.id, price: specialFxPriceG[e.boost] }))
        ]
    },
    weapon: {
        name: "무기 상점", icon: "⚔️", cur: "G",
        list: WEAPONS.filter(w => !w.rare && !w.hidden).map(w => ({ cat: "weapon", id: w.id, price: weaponPriceG[w.id] }))
    },
    decor: {
        name: "프레임/효과 상점", icon: "🖼️", cur: "G",
        list: [
            ...FRAMES.filter(f => !f.rare).map((f, i) => ({ cat: "frame", id: f.id, price: 20000 + i * 8000 })),
            ...PROFILE_EFFECTS.filter(f => !f.rare).map((f, i) => ({ cat: "peffect", id: f.id, price: 18000 + i * 6000 }))
        ]
    },
    point: {
        name: "포인트 상점", icon: "💎", cur: "P",
        list: [
            { cat: "item", id: "mission_pass", price: 150 },
            ...PETS.filter(p => p.kind === "special" && p.boost === 15).map(p => ({ cat: "pet", id: p.id, price: 130 })),
            ...PET_EFFECTS.filter(e => e.kind === "special" && e.boost === 15).map(e => ({ cat: "effect", id: e.id, price: 110 })),
            ...WEAPONS.filter(w => w.rare).map(w => ({ cat: "weapon", id: w.id, price: { thunder: 70, dragon_breath: 90, gold_storm: 80 }[w.id] })),
            ...FRAMES.filter(f => f.rare).map(f => ({ cat: "frame", id: f.id, price: 60 })),
            ...PROFILE_EFFECTS.filter(f => f.rare).map(f => ({ cat: "peffect", id: f.id, price: 50 })),
            ...ALPHABET.map(l => ({ cat: "item", id: cardId(l), price: 300, alt: true }))
        ]
    },
    // 10~20% off a rotating handful of G-shop goods (see discountItems() in data/catalogAdmin.js)
    discount: { name: "디스카운트 상점", icon: "🏷️", cur: "G", list: [] }
};
// per-round purchase limits by shop (아이템 상점 5회 · 무기/펫·프레임/기타 1회)
export const SHOP_LIMIT = { general: 5, weapon: 1, pet: 1, decor: 1, point: 1, discount: 1 };
export const SHOP_LIMIT_LABEL = { general: "아이템 상점", weapon: "무기 상점", pet: "펫 상점", decor: "프레임/효과 상점", point: "포인트 상점", discount: "디스카운트 상점" };

// ---------------------------------------------------------------- map
// x/y are percentages on the world map. req: points (have at least) or
// country (nationals only; others need the matching pass item).
export const LOCATIONS = [
    { id: "lucky",    name: "Lucky Casino",       emoji: "🍀", x: 46, y: 46, color: "#3ddc84", shops: ["general", "pet", "decor"],
      slots: ["clover_luck", "monkey_drop", "five_cats"], casino: ["lucky_wheel", "clover_scratch"] },
    { id: "seaside",  name: "Seaside Casino",     emoji: "🏖️", x: 80, y: 74, color: "#38bdf8", shops: ["general", "weapon", "point"], beg: true,
      slots: ["pearl_tide", "niagara"], casino: ["shell_cups", "sea_dice"] },
    { id: "twins",    name: "Twins Wins",         emoji: "👯", x: 56, y: 22, color: "#f472b6", shops: ["general", "pet", "weapon", "point"], req: { points: 100 },
      slots: ["fufu", "lucky_boxes"], casino: ["twin_flip", "royal_cards"] },
    { id: "gamblers", name: "Gamblers Casino",    emoji: "🎰", x: 34, y: 62, color: "#facc15", shops: ["general", "decor"], earn: true,
      slots: ["money_mesh", "cat_mouse"], casino: ["gamblers_roulette", "pension_ticket"] },
    { id: "dungdung", name: "Dung Dung Casino",   emoji: "💩", x: 64, y: 54, color: "#a16207", shops: ["general", "weapon", "decor", "pet"], req: { points: 50 }, earn: true, beg: true,
      slots: ["golden_dung"], casino: ["dung_gacha", "dung_plinko"] },
    { id: "noluck",   name: "No Luck Casino",     emoji: "🐈‍⬛", x: 28, y: 36, color: "#94a3b8", shops: ["decor"], beg: true,
      slots: ["bonanza"], casino: ["unlucky_chest", "black_cat_hilo"] },
    { id: "oink",     name: "Oink Oink Town",     emoji: "🐷", x: 70, y: 36, color: "#fb7185", shops: ["general", "weapon", "point"], earn: true,
      slots: ["coin_pigglet"], casino: ["piggy_bank_break", "oink_lottery"] },
    { id: "emo",      name: "Emo World Casino",   emoji: "🐰", x: 30, y: 16, color: "#c084fc", shops: ["general", "pet", "weapon"], req: { country: "Emo World", pass: "pass_emo" },
      slots: ["rabbit_rush"], casino: ["emo_capsule"] },
    { id: "poly",     name: "Polynesia Casino",   emoji: "🔺", x: 88, y: 46, color: "#f97316", shops: ["general", "pet", "weapon"], req: { country: "Polynesia", pass: "pass_poly" },
      slots: ["tiki_volcano"], casino: ["shape_wheel"] },
    { id: "ground",   name: "Ground Town Casino", emoji: "🐜", x: 12, y: 58, color: "#84cc16", shops: ["general", "pet", "weapon"], req: { country: "Ground Town", pass: "pass_ground" },
      slots: ["ant_hill"], casino: ["ant_dig"] },
    { id: "foggy",    name: "Foggy Nation Casino", emoji: "👻", x: 14, y: 84, color: "#64748b", shops: ["general", "pet", "weapon"], earn: true, req: { country: "Foggy Nation", pass: "pass_foggy" },
      slots: ["ghost_vault", "froggie"], casino: ["ghost_scratch"] },
    { id: "mj",       name: "MJ World Casino",    emoji: "🐱", x: 86, y: 14, color: "#2dd4bf", shops: ["general", "pet", "weapon"], req: { country: "MJ World", pass: "pass_mj" },
      slots: ["samurai_cash"], casino: ["mj_coin_flip"] },
    { id: "dungtown", name: "Dung Town Casino",   emoji: "🏘️", x: 50, y: 84, color: "#eab308", shops: ["general", "pet", "weapon"], earn: true, beg: true, req: { country: "Dung Town", pass: "pass_dung" },
      slots: ["dragon_hoard", "crack_or_not"], casino: ["dungtown_dice"] }
];

// every original map lives in Casino Land 1; then the new regions' maps
for (const l of LOCATIONS) Object.assign(l, { region: "cl1" }, CL1_PATCH[l.id] || {});
for (const m of NEW_MAPS) {
    const { slot, casino, ...loc } = m;
    LOCATIONS.push({ ...loc, slots: ["rs_" + m.id], casino: ["rc_" + m.id] });
}
// the 7 special slots
const SPECIAL_HOME = { monster_kitchen: "ground", dj_crypto: "poly", sol_umbra: "foggy", neon_cadets: "twins", four_pillars: "mj", gift: "balloon", chrono_heist: "oink" };
for (const [sid, lid] of Object.entries(SPECIAL_HOME)) LOCATIONS.find(l => l.id === lid)?.slots.push(sid);

// earn corners: `earn: true` (old saves) = the classic four
export const EARN_ALL = ["blood", "labor", "poop", "sell", "music", "survival"];
export const earnKinds = loc => !loc?.earn ? [] : Array.isArray(loc.earn) ? loc.earn : ["blood", "labor", "poop", "sell"];

// map passes: one per map. A pass lets its holder in (nationals-only maps)
// AND teleports straight to that map when used at the start of a turn.
export const passIdOf = loc => loc.req?.pass || "pass_" + loc.id;
export const passPrice = loc => (loc.region === "sky" || loc.region === "space") ? 50000 : 45000;
for (const l of LOCATIONS) {
    const id = passIdOf(l);
    const ex = ITEMS.find(i => i.id === id);
    if (ex) { ex.name = `${l.name} 맵권`; ex.loc = l.id; }
    else ITEMS.push({ id, name: `${l.name} 맵권`, emoji: "🎟️", loc: l.id, desc: "사용하면 턴 시작 시 이 맵으로 바로 이동합니다 (국적 전용 맵 입장 가능)." });
    SHOPS.general.list.push({ cat: "item", id, price: passPrice(l) });
}
export const isPass = id => !!ITEMS.find(i => i.id === id)?.loc;

export const COUNTRIES = ["Emo World", "Polynesia", "Ground Town", "Foggy Nation", "MJ World", "Dung Town"];

// ---------------------------------------------------------------- jobs (직업 코너)
// cut = seconds taken off the turn timer. Pay is skewed low (high pay is rare).
export const CAREERS = [
    { id: "cleaner",   name: "카지노 청소부",  emoji: "🧹", cut: 180, min: 10000, max: 30000 },
    { id: "dungsweep", name: "똥쓸이",          emoji: "💩", cut: 180, min: 5000,  max: 20000 },
    { id: "hotel",     name: "호텔 카운터",     emoji: "🛎️", cut: 300, min: 20000, max: 40000 },
    { id: "secretary", name: "형용형근 비서",   emoji: "💼", cut: 480, min: 20000, max: 100000, card: 0.15 },
    { id: "cashier",   name: "카지노 캐셔",     emoji: "💵", cut: 180, min: 3000,  max: 10000 },
    { id: "statue",    name: "동상알바",        emoji: "🗽", cut: 240, min: 10000, max: 25000 },
    { id: "volunteer", name: "봉사활동알바",    emoji: "🤝", cut: 180, min: 1000,  max: 6000 }
];

// ---------------------------------------------------------------- NPCs (NPC 코너)
// A visit has a 40~70% chance of 1~3 NPC attacks at random moments.
// Every attack picks one of the NPC's moves at random.
//   steal: [min,max] gold taken (nothing if the player has less) · give: gold
//   hp: ±HP · curse: just insults · kill: instant death · nomove: weapon → No Move
export const NPCS = [
    { id: "beggar",  name: "거지",       emoji: "🧎", art: "🥣", color: "#a16207", moves: [{ steal: [500, 1000] }, { hp: -5 }, { hp: -10 }] },
    { id: "angel",   name: "엔젤",       emoji: "👼", art: "✨", color: "#fde68a", moves: [{ give: [500, 1000] }, { hp: 5 }, { hp: 10 }] },
    { id: "samurai", name: "사무라이",   emoji: "🥷", art: "⚔️", color: "#dc2626", moves: [{ hp: -5 }, { hp: -10 }, { hp: -15 }] },
    { id: "granny",  name: "할머니",     emoji: "👵", art: "🦯", color: "#a78bfa", moves: [{ steal: [100, 500] }, { hp: -5 }, { curse: true }] },
    { id: "reaper",  name: "죽음의 사신", emoji: "💀", art: "🪦", color: "#0f172a", moves: [{ steal: [1000, 5000] }, { hp: -10 }, { hp: -15 }, { hp: -20 }, { hp: -30 }, { hp: -50 }, { kill: true }] },
    { id: "wizard",  name: "마법사",     emoji: "🧙", art: "🪄", color: "#7c3aed", moves: [{ steal: [500, 3000] }, { give: [500, 3000] }, { hp: -10 }, { hp: -15 }, { hp: -20 }, { nomove: true }] }
];
export const CURSES = ["저주받아라!", "죽어라!", "돈 다 날려라!", "평생 꽝만 나와라!", "잭팟은 꿈도 꾸지 마라!", "네 펫이 도망갈 거다!", "다음 스핀은 무조건 꽝이다!", "가진 돈 전부 잃을 거다!"];

// ---------------------------------------------------------------- lookups
export const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
export const PET_BY_ID = byId(PETS);
export const PETFX_BY_ID = byId(PET_EFFECTS);
export const WEAPON_BY_ID = byId(WEAPONS);
export const FRAME_BY_ID = byId(FRAMES);
export const PEFFECT_BY_ID = byId(PROFILE_EFFECTS);
export const ITEM_BY_ID = byId(ITEMS);
export const LOC_BY_ID = byId(LOCATIONS);

export function catalogEntry(cat, id) {
    return { item: ITEM_BY_ID, pet: PET_BY_ID, effect: PETFX_BY_ID, weapon: WEAPON_BY_ID, frame: FRAME_BY_ID, peffect: PEFFECT_BY_ID }[cat]?.[id];
}

// ---------------------------------------------------------------- loans
// Only for players whose gold has run out. Loan gold can only be bet on
// slots / casino games; winnings become normal gold. `owed` grows by
// `rate` at the start of every new round; unpaid after `rounds` rounds →
// the player dies (eliminated) at the start of the next round.
export const LOANS = {
    lucky: { id: "lucky", name: "럭키대부", emoji: "🍀", amounts: [20000, 50000, 100000], rounds: 5, rate: 0.10 },
    crazy: { id: "crazy", name: "크레이지대부", emoji: "🤪", amounts: [200000, 300000, 500000], rounds: 3, rate: 0.20 }
};
