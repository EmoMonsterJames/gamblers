// =====================================================================
// Game catalog: missions, pets, pet effects, weapons, frames, profile
// effects, shop items and map locations. Add new entries here — every
// screen reads from these lists.
// =====================================================================

import { REGIONS, NEW_MAPS, CL1_PATCH, REGION_ITEMS, mapSlots, mapCasinos, slotIdOf, casinoIdOf, KIDNAP_ROOM } from "./regions.js";
import { CM_GOODS } from "./community.js";
import { THEME_HOME } from "../slots/themeConfigs.js";
import { SKY_HOME } from "../slots/skyConfigs.js";
import { REALM_HOME } from "../slots/realmConfigs.js";
import { WONDER_HOME } from "../slots/wonderConfigs.js";
import { MYTH_HOME } from "../slots/mythConfigs.js";
export { REGIONS, REGION_ITEMS };
export const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// ---------------------------------------------------------------- missions
// type: bonus | slot_net | casino_net | points | jackpot | battle
// battle rule: random | even | odd (roster number) | poor | rich (money) | lowpts | highpts (points)
//   — two players fight, the loser is eliminated, the winner keeps their damaged HP
// jackpot `min` is the lowest tier that counts (MINI < MINOR < MAXI < MAJOR < GRAND)
export const TIERS = ["최하", "하", "중", "상", "최상"];
export const JACKPOT_RANK = { MINI: 1, MINOR: 2, MAXI: 3, EGG: 3, MONKEY: 3.5, JOKER: 3.5, MAJOR: 4, STRIKE: 4.5, LOTUS: 4.7, GRAND: 5, MEGA: 6, VAULT: 6 };

export const MISSIONS = [
    // Mission kinds (game/season.js missionMet / missionProgress / battlePair / judge):
    //   goals (pass = done in the turn): bonus (v = slot bonuses) · slot_net · casino_net · points · jackpot (min · n = count)
    //     combo (c casino · s slot · p points) · five · freespin · slot_wins (bw = wins per bonus) · bonus_in (v spins · n bonuses)
    //     brand_win · bet_win (bets | minBet) · job_done · home_map · region_map · pts_spent · arena_win · kidnap_freed · spell
    //   "… 플레이어 중 1명 탈락" (fail = candidate): beg_max · has · emo_has (invert: owners are the candidates) · card (letter
    //     "?" = 알파벳 카드 G·A·M·B·L·E·R·S · "*" = 알파벳 권, drawn when picked) · card2 (letters drawn: mode any = both needed ·
    //     none = one is enough) · money_end (gold ends with d) · pts_have · food_eats (season) · wx_hit (this turn's weather HP:
    //     plain = the hit ones are candidates · v = less than v are candidates) · lodge_in (mode none / some) · npc_harm ·
    //     job_total · earn_total (season) · spell_ever · cm_react · arena_any
    //   rank (the judge picks the group): fewmaps_round · refused_most · refused_least · emoitems_few · shops_few
    //   battle (rule = who fights · emo = EmoMon battle · both = weapon + EmoMon battle, 1 : 1 → random)

    // ================================================================ 최하
    { id: "t0_bonus8", tier: 0, type: "bonus", v: 8, text: "슬롯 게임에서 아무 보너스 8개 이상 터뜨리기" },
    { id: "t0_slot", tier: 0, type: "slot_net", v: 10000, text: "슬롯 게임으로 10,000G 이상 벌기" },
    { id: "t0_casino", tier: 0, type: "casino_net", v: 7000, text: "카지노 게임으로 7,000G 이상 벌기" },
    { id: "t0_points", tier: 0, type: "points", v: 15, text: "15 포인트 이상 획득하기" },
    { id: "t0_wx", tier: 0, type: "wx_hit", text: "날씨로 인해 HP가 차감된 플레이어 중 1명 탈락" },
    { id: "t0_food1", tier: 0, type: "food_eats", v: 1, text: "식량을 1회 이상 소비하지 않는 플레이어 중 랜덤 1명 탈락" },
    { id: "t0_b_random", tier: 0, type: "battle", rule: "random", text: "⚔️ 랜덤 2인 무기 배틀 (진 사람 탈락)" },
    { id: "t0_b_even", tier: 0, type: "battle", rule: "even", text: "⚔️ 짝수 번호 플레이어 중 랜덤 2인 무기 배틀 (진 사람 탈락)" },
    { id: "t0_b_odd", tier: 0, type: "battle", rule: "odd", text: "⚔️ 홀수 번호 플레이어 중 랜덤 2인 무기 배틀 (진 사람 탈락)" },
    { id: "t0_combo", tier: 0, type: "combo", c: 500, s: 7000, text: "카지노 게임으로 500G 이상, 슬롯 게임으로 7,000G 이상 얻기" },
    { id: "t0_five3", tier: 0, type: "five", v: 3, text: "슬롯 게임에서 5 of a kind 3번 이상 달성하기" },
    { id: "t0_free2", tier: 0, type: "freespin", v: 2, text: "슬롯 게임에서 무료 스핀(Free Spin) 보너스 2회 이상 진입하기" },
    { id: "t0_beg", tier: 0, type: "beg_max", v: 500, text: "구걸로 번 돈이 500G 이하인 플레이어 중 한 명 탈락" },
    { id: "t0_bonus50", tier: 0, type: "bonus_in", v: 50, text: "슬롯 게임으로 50번 스핀 안에 보너스 터뜨리기" },
    { id: "t0_blk", tier: 0, type: "brand_win", brand: "BLK", v: 3000, text: "슬롯 브랜드 BLK 게임에서 1회 스핀으로 3,000G 이상 벌기" },
    { id: "t0_hyhg", tier: 0, type: "brand_win", brand: "HYHG GAMING", v: 3000, text: "슬롯 브랜드 HYHG Gaming 게임에서 1회 스핀으로 3,000G 이상 벌기" },
    { id: "t0_job", tier: 0, type: "job_done", v: 1, text: "직업 1회 이상 수행하기" },
    { id: "t0_refused", tier: 0, type: "rank", rule: "refused_most", text: "맵을 포함한 각종 코너에서 입장 거절 기록이 가장 많은 사람 탈락" },
    { id: "t0_bet100", tier: 0, type: "bet_win", bets: [100], v: 2000, text: "슬롯게임에서 100G 베팅으로 1회 스핀에 2,000G 이상 벌기" },
    { id: "t0_card", tier: 0, type: "card", letter: "?", text: "랜덤으로 정해지는 알파벳 카드 없는 플레이어 탈락 (G·A·M·B·L·E·R·S 중 하나)" },
    { id: "t0_ticket", tier: 0, type: "card", letter: "*", text: "랜덤으로 정해지는 알파벳 권이 없는 플레이어 탈락 (A~Z 중 하나)" },
    { id: "t0_b_items", tier: 0, type: "battle", rule: "fewitems", text: "⚔️ Bag에 소유한 아이템이 가장 적은 후보들 중 랜덤 2인 무기 배틀" },
    { id: "t0_gold77", tier: 0, type: "money_end", d: 77, text: "보유한 골드의 끝자리 수가 77로 끝나지 않은 플레이어 중 1명 탈락" },
    { id: "t0_e_random", tier: 0, type: "battle", emo: true, rule: "random", text: "🐾 랜덤 2인 이모몬스터(EmoMonster) 배틀 (진 사람 탈락)" },
    { id: "t0_e_poor2", tier: 0, type: "battle", emo: true, rule: "poor2", text: "🐾 골드가 가장 적은 2인 이모몬스터(EmoMonster) 배틀 (진 사람 탈락)" },
    { id: "t0_e_types", tier: 0, type: "emo_has", what: "type", types: ["Fire", "Water", "Ice", "Earth", "Grass", "Electric", "Normal"], text: "🐾 불·물·얼음·땅·Grass·전기·노멀 중 아무 속성 이모몬스터(EmoMonster)도 없는 플레이어 중 1명 탈락" },
    { id: "t0_e_none", tier: 0, type: "emo_has", what: "has_mon", text: "🐾 이모몬스터(EmoMonster)를 가지고 있지 않은 플레이어 중 1명 탈락" },
    { id: "t0_e_weap", tier: 0, type: "emo_has", what: "weapons1", text: "🐾 이모몬스터(EmoMonster)에 무기가 1개 이상 넣어져 있지 않은 플레이어 중 1명 탈락" },

    // ================================================================ 하
    { id: "t1_jp", tier: 1, type: "jackpot", min: "MINI", text: "슬롯 게임에서 MINI 잭팟 WIN 하기" },
    { id: "t1_slot", tier: 1, type: "slot_net", v: 20000, text: "슬롯 게임으로 20,000G 이상 벌기" },
    { id: "t1_casino", tier: 1, type: "casino_net", v: 12000, text: "카지노 게임으로 12,000G 이상 벌기" },
    { id: "t1_points", tier: 1, type: "points", v: 30, text: "30 포인트 이상 획득하기" },
    { id: "t1_b_wx", tier: 1, type: "battle", rule: "wxhit", text: "⚔️ 날씨로 인해 HP가 차감된 플레이어 중에서 랜덤 2인 무기 배틀" },
    { id: "t1_food2", tier: 1, type: "food_eats", v: 2, text: "식량을 2회 이상 소비하지 않는 플레이어 중 랜덤 1명 탈락" },
    { id: "t1_b_88", tier: 1, type: "battle", rule: "not88", text: "⚔️ 보유한 골드의 끝자리 수가 88로 끝나지 않은 플레이어 중에서 랜덤 2인 무기 배틀" },
    { id: "t1_b_poor", tier: 1, type: "battle", rule: "poor", text: "⚔️ 돈이 가장 적은 사람들 중에서 랜덤 2인 무기 배틀" },
    { id: "t1_combo", tier: 1, type: "combo", c: 1000, s: 15000, text: "카지노 게임으로 1,000G 이상, 슬롯 게임으로 15,000G 이상 벌기" },
    { id: "t1_wins", tier: 1, type: "slot_wins", v: 35, bw: 3, text: "슬롯 게임 Win 횟수 35번 이상 달성하기 (보너스는 최소 3 Win)" },
    { id: "t1_pet", tier: 1, type: "has", what: "petgear", text: "펫이나 펫 효과가 없는 플레이어 중에서 1명 탈락" },
    { id: "t1_card", tier: 1, type: "card", letter: "?", text: "랜덤으로 정해지는 알파벳 카드 없는 플레이어 탈락 (G·A·M·B·L·E·R·S 중 하나)" },
    { id: "t1_ticket", tier: 1, type: "card", letter: "*", text: "랜덤으로 정해지는 알파벳 권이 없는 플레이어 탈락 (A~Z 중 하나)" },
    { id: "t1_b_poor2", tier: 1, type: "battle", rule: "poor2", text: "⚔️ 가장 돈이 적은 사람 두 명 배틀로 1명 탈락" },
    { id: "t1_b_nopet", tier: 1, type: "battle", rule: "nopet", text: "⚔️ 펫 또는 펫 효과를 보유하지 않은 후보들 중 랜덤 2인 무기 배틀" },
    { id: "t1_b_weap", tier: 1, type: "battle", rule: "fewweapons", text: "⚔️ 무기 보유 개수가 가장 적은 사람 중 랜덤 2인 무기 배틀" },
    { id: "t1_b_lowhp", tier: 1, type: "battle", rule: "lowhp", text: "⚔️ HP가 가장 적은 후보들 중 랜덤 2인 무기 배틀" },
    { id: "t1_bonus30x2", tier: 1, type: "bonus_in", v: 30, n: 2, text: "슬롯게임으로 30번 스핀 안에 보너스 2회 이상 터뜨리기" },
    { id: "t1_home", tier: 1, type: "home_map", text: "플레이어 본인 국적에 맞는 맵 방문하기 (Emo World · MJ World · Polynesia · Ground Town · Foggy Nation · Dung Town)" },
    { id: "t1_cloud", tier: 1, type: "brand_win", brand: "CLOUD GAMING", v: 15000, text: "슬롯 브랜드 CLOUD GAMING 게임에서 1회 스핀으로 15,000G 이상 벌기" },
    { id: "t1_ipex", tier: 1, type: "brand_win", brand: "IPEX", v: 15000, text: "슬롯 브랜드 IPEX 게임에서 1회 스핀으로 15,000G 이상 벌기" },
    { id: "t1_bet200", tier: 1, type: "bet_win", bets: [200, 300], v: 5000, text: "슬롯게임에서 200G 또는 300G 베팅으로 1회 스핀에 5,000G 이상 벌기" },
    { id: "t1_refused", tier: 1, type: "rank", rule: "refused_most", text: "맵을 포함한 각종 코너에서 입장 거절 기록이 가장 많은 사람 탈락" },
    { id: "t1_comment", tier: 1, type: "cm_react", text: "💬 커뮤니티에 코멘트를 작성하지 않았거나 남들의 코멘트에 좋아요 또는 싫어요를 표시하지 않은 플레이어 중 1명 탈락" },
    { id: "t1_e_random", tier: 1, type: "battle", emo: true, rule: "random", text: "🐾 랜덤 2인 이모몬스터(EmoMonster) 배틀 (진 사람 탈락)" },
    { id: "t1_e_lowpts2", tier: 1, type: "battle", emo: true, rule: "lowpts2", text: "🐾 포인트가 가장 적은 2인 이모몬스터(EmoMonster) 배틀 (진 사람 탈락)" },
    { id: "t1_e_types", tier: 1, type: "emo_has", what: "type", types: ["Abnormal", "Magic", "Power", "Bug", "Air", "Fly", "Steel"], text: "🐾 Abnormal·Magic·Power·Bug·Air·Fly·Steel 중 아무 속성 이모몬스터(EmoMonster)도 없는 플레이어 중 1명 탈락" },
    { id: "t1_e_r2evo", tier: 1, type: "emo_has", what: "r2_or_noevo", text: "🐾 ★2 이상 또는 진화형이 없는 이모몬스터(EmoMonster)를 소유하지 않은 플레이어 중 1명 탈락" },
    { id: "t1_e_items", tier: 1, type: "rank", rule: "emoitems_few", text: "🐾 이모몬스터(EmoMonster) 아이템이 가장 적은 플레이어 1명 탈락" },
    { id: "t1_e_arena", tier: 1, type: "arena_any", text: "🐾 이모몬스터(EmoMonster) 아레나에 참여하지 않은 플레이어 중 1명 탈락" },

    // ================================================================ 중
    { id: "t2_jp", tier: 2, type: "jackpot", min: "MINOR", text: "MINOR 잭팟 WIN 하기" },
    { id: "t2_slot", tier: 2, type: "slot_net", v: 40000, text: "슬롯게임으로 40,000G 이상 벌기" },
    { id: "t2_casino", tier: 2, type: "casino_net", v: 30000, text: "카지노게임으로 30,000G 이상 벌기" },
    { id: "t2_refused", tier: 2, type: "rank", rule: "refused_least", text: "맵을 포함한 각종 코너에서 입장 거절 기록이 가장 적은 사람 탈락" },
    { id: "t2_b_both", tier: 2, type: "battle", both: true, rule: "random", text: "⚔️ 랜덤 2인 무기 배틀 및 이모몬스터(EmoMonster) 배틀 (무승부 시 랜덤 탈락)" },
    { id: "t2_b_poor", tier: 2, type: "battle", rule: "poor", text: "⚔️ 보유한 골드가 가장 적은 사람들 중 랜덤 2인 무기 배틀" },
    { id: "t2_b_nowx", tier: 2, type: "battle", rule: "wxnone", text: "⚔️ 날씨로 인해 HP가 차감되지 않은 플레이어 중에서 랜덤 2인 무기 배틀" },
    { id: "t2_food3", tier: 2, type: "food_eats", v: 3, text: "식량을 3회 이상 소비하지 않는 플레이어 중 랜덤 1명 탈락" },
    { id: "t2_lodge", tier: 2, type: "lodge_in", mode: "none", text: "숙소에 입장한 기록이 없는 플레이어 중 랜덤 1명 탈락" },
    { id: "t2_five6", tier: 2, type: "five", v: 6, text: "슬롯 게임에서 5 of a kind 6번 이상 달성하기" },
    { id: "t2_job", tier: 2, type: "job_total", v: 15000, text: "직업과 취업으로 15,000G 이상 벌지 못한 플레이어 중 한 명 탈락" },
    { id: "t2_card", tier: 2, type: "card", letter: "?", text: "랜덤으로 정해지는 알파벳 카드 없는 플레이어 탈락 (G·A·M·B·L·E·R·S 중 하나)" },
    { id: "t2_ticket", tier: 2, type: "card", letter: "*", text: "랜덤으로 정해지는 알파벳 권이 없는 플레이어 탈락 (A~Z 중 하나)" },
    { id: "t2_b_lowpts2", tier: 2, type: "battle", rule: "lowpts2", text: "⚔️ 가장 포인트가 적은 사람 2명 무기 배틀로 1명 탈락" },
    { id: "t2_b_noframe", tier: 2, type: "battle", rule: "noframe", text: "⚔️ 프레임 또는 프레임 효과를 보유하지 않은 후보들 중 랜덤 2인 무기 배틀" },
    { id: "t2_b_lowmap", tier: 2, type: "battle", rule: "lowmapno", text: "⚔️ 가장 낮은 번호의 맵을 방문한 사람 중 랜덤 2인 무기 배틀" },
    { id: "t2_b_highmap", tier: 2, type: "battle", rule: "highmapno", text: "⚔️ 가장 높은 번호의 맵을 방문한 사람 중 랜덤 2인 무기 배틀" },
    { id: "t2_b_items", tier: 2, type: "battle", rule: "fewitems", text: "⚔️ Bag에 소유한 아이템이 가장 적은 후보들 중 랜덤 2인 무기 배틀" },
    { id: "t2_b_spins2", tier: 2, type: "battle", rule: "fewspins2", text: "⚔️ 시즌 전체 슬롯 플레이 횟수가 가장 적은 최하위 2인 랜덤 무기 배틀" },
    { id: "t2_special", tier: 2, type: "has", what: "special", text: "특수프레임 또는 특수프레임 효과를 보유하지 않은 플레이어 중에서 랜덤 1명 탈락" },
    { id: "t2_bank", tier: 2, type: "has", what: "bank", text: "본인 소유의 은행 계좌가 없는 후보들 중에서 한 명 탈락" },
    { id: "t2_bonus25", tier: 2, type: "bonus_in", v: 25, text: "슬롯게임으로 25번 스핀 안에 보너스 1회 이상 터뜨리기" },
    { id: "t2_far", tier: 2, type: "region_map", regions: ["space", "deepsea", "sky"], text: "우주 또는 심해 또는 하늘나라 지역에 있는 카지노 맵 방문하기" },
    { id: "t2_clover", tier: 2, type: "brand_win", brand: "CLOVER-TECH", v: 20000, text: "슬롯 브랜드 CLOVER TECH 게임에서 1회 스핀으로 20,000G 이상 벌기" },
    { id: "t2_rabbit", tier: 2, type: "brand_win", brand: "Rabbit-Gaming", v: 20000, text: "슬롯 브랜드 Rabbit Gaming 게임에서 1회 스핀으로 20,000G 이상 벌기" },
    { id: "t2_yg", tier: 2, type: "brand_win", brand: "YG GAMING", v: 25000, text: "슬롯 브랜드 YG Gaming 게임에서 1회 스핀으로 25,000G 이상 벌기" },
    { id: "t2_hyhg", tier: 2, type: "brand_win", brand: "HYHG GAMING", v: 25000, text: "슬롯 브랜드 HYHG Gaming 게임에서 1회 스핀으로 25,000G 이상 벌기" },
    { id: "t2_bet500", tier: 2, type: "bet_win", bets: [500], v: 12000, text: "슬롯게임에서 500G 베팅으로 1회 스핀에 12,000G 이상 벌기" },
    { id: "t2_card2", tier: 2, type: "card2", mode: "any", text: "랜덤으로 정해지는 알파벳 카드(G·A·M·B·L·E·R·S 중 하나)와 랜덤으로 정해지는 알파벳 권 (A~Z 중 하나)이 모두 없거나 하나밖에 없는 플레이어 중에서 1명 탈락" },
    { id: "t2_arena", tier: 2, type: "arena_win", text: "🏟️ 아레나 1:1 배틀에서 승리하지 못한 플레이어 중 1명 탈락" },
    { id: "t2_e_owners", tier: 2, type: "emo_has", what: "has_mon", invert: true, text: "🐾 이모몬스터(EmoMonster)를 가지고 있는 플레이어 중 1명 탈락" },
    { id: "t2_e_random", tier: 2, type: "battle", emo: true, rule: "random", text: "🐾 랜덤 2인 이모몬스터(EmoMonster) 배틀 (진 사람 탈락)" },
    { id: "t2_e_fewmons", tier: 2, type: "battle", emo: true, rule: "fewmons", text: "🐾 이모몬스터(EmoMonster) 수가 가장 적은 플레이어 중 랜덤 2인 이모몬스터(EmoMonster) 배틀" },
    { id: "t2_e_types", tier: 2, type: "emo_has", what: "type", types: ["Angel", "Evil", "Ghost"], text: "🐾 Angel·Evil·Ghost 중 아무 속성 이모몬스터(EmoMonster)도 없는 플레이어 중 1명 탈락" },
    { id: "t2_e_r2", tier: 2, type: "emo_has", what: "rarity", v: 2, text: "🐾 ★2 이상 이모몬스터(EmoMonster)가 없는 플레이어 중 1명 탈락" },
    { id: "t2_e_nature", tier: 2, type: "emo_has", what: "nature", nature: "?", text: "🐾 랜덤으로 정해지는 Nature(성격)의 이모몬스터(EmoMonster)가 없는 플레이어 중 1명 탈락" },
    { id: "t2_e_evolved", tier: 2, type: "emo_has", what: "evolved", text: "🐾 진화시킨 이모몬스터(EmoMonster)가 없는 플레이어 중 랜덤 1명 탈락" },
    { id: "t2_e_multi", tier: 2, type: "emo_has", what: "multitype", v: 2, text: "🐾 속성이 2개 이상인 이모몬스터(EmoMonster)가 없는 플레이어 중 랜덤 1명 탈락" },

    // ================================================================ 상
    { id: "t3_jp", tier: 3, type: "jackpot", min: "MAXI", text: "Maxi 또는 Major 잭팟 WIN 하기" },
    { id: "t3_slot", tier: 3, type: "slot_net", v: 50000, text: "슬롯 게임으로 50,000G 이상 벌기" },
    { id: "t3_combo", tier: 3, type: "combo", c: 10000, s: 35000, text: "카지노 게임으로 10,000G 이상, 슬롯 게임으로 35,000G 이상 벌기" },
    { id: "t3_pts100", tier: 3, type: "pts_have", v: 100, text: "보유한 포인트가 100P 이상이 아닌 플레이어 중 랜덤 1명 탈락" },
    { id: "t3_b_lab", tier: 3, type: "battle", rule: "fewlab", text: "⚔️ Lab 상점에서 아이템을 구매한 횟수가 가장 적은 후보들 중에서 랜덤 2인 무기 배틀" },
    { id: "t3_b_rich", tier: 3, type: "battle", rule: "rich", text: "⚔️ 돈이 가장 많은 사람들 중 랜덤 2인 무기 배틀" },
    { id: "t3_lodge", tier: 3, type: "lodge_in", mode: "some", text: "숙소에 입장한 기록이 있는 플레이어 중 랜덤 1명 탈락" },
    { id: "t3_b_wx20", tier: 3, type: "battle", rule: "wx20", text: "⚔️ 날씨로 인해 HP가 -20 이상 차감된 플레이어 중에서 랜덤 2인 무기 배틀" },
    { id: "t3_food5", tier: 3, type: "food_eats", v: 5, text: "식량을 5회 이상 소비하지 않는 플레이어 중 랜덤 1명 탈락" },
    { id: "t3_five10", tier: 3, type: "five", v: 10, text: "슬롯 게임에서 5 of a kind 10번 이상 달성하기" },
    { id: "t3_free4", tier: 3, type: "freespin", v: 4, text: "슬롯 게임에서 무료 스핀(Free Spin) 보너스 4회 이상 진입하기" },
    { id: "t3_card", tier: 3, type: "card", letter: "?", text: "랜덤으로 정해지는 알파벳 카드 없는 플레이어 탈락 (G·A·M·B·L·E·R·S 중 하나)" },
    { id: "t3_ticket", tier: 3, type: "card", letter: "*", text: "랜덤으로 정해지는 알파벳 권이 없는 플레이어 탈락 (A~Z 중 하나)" },
    { id: "t3_b_poor", tier: 3, type: "battle", rule: "poor", text: "⚔️ 돈이 적은 사람들 중 랜덤 2인 무기 배틀" },
    { id: "t3_b_net2", tier: 3, type: "battle", rule: "netlow2", text: "⚔️ 카지노+슬롯 손익이 0이거나 손익 합산 금액이 최하위인 2인 무기 배틀" },
    { id: "t3_b_highhp", tier: 3, type: "battle", rule: "highhp", text: "⚔️ HP가 가장 많은 후보들 중 랜덤 2인 무기 배틀" },
    { id: "t3_b_lowmap", tier: 3, type: "battle", rule: "lowmapno", text: "⚔️ 가장 낮은 번호의 맵을 방문한 사람 중 랜덤 2인 무기 배틀" },
    { id: "t3_b_highmap", tier: 3, type: "battle", rule: "highmapno", text: "⚔️ 가장 높은 번호의 맵을 방문한 사람 중 랜덤 2인 무기 배틀" },
    { id: "t3_battler", tier: 3, type: "has", what: "battler", text: "몬스터 Capture에서 나오는 Battler와 대결해 Lose한 플레이어들 중에 1명 탈락. (Battler도 못 만난 경우에는 자동으로 탈락 후보)" },
    { id: "t3_b_gear3", tier: 3, type: "battle", rule: "gear3", text: "⚔️ 펫, 펫 효과, 프레임, 프레임 효과 중 3개 이상 보유하지 않은 후보들 중에서 랜덤 2인 무기 배틀" },
    { id: "t3_bonus10", tier: 3, type: "bonus_in", v: 10, text: "슬롯 게임으로 10번 스핀 안에 보너스 터뜨리기" },
    { id: "t3_wx10", tier: 3, type: "wx_hit", v: 10, text: "날씨로 인해 HP가 10 이상 차감되지 않는 플레이어 중 1명 탈락" },
    { id: "t3_npc1", tier: 3, type: "npc_harm", v: 1, text: "맵에서 등장하는 NPC한테 공격을 당하지 않은 플레이어 중에서 랜덤 1명 탈락" },
    { id: "t3_classic", tier: 3, type: "brand_win", brand: "Classic Gaming", v: 30000, text: "슬롯 브랜드 Classic Gaming 게임에서 1회 스핀으로 30,000G 이상 벌기" },
    { id: "t3_scrooge", tier: 3, type: "brand_win", brand: "Scrooge-Slots", v: 30000, text: "슬롯 브랜드 Scrooge Slots 게임에서 1회 스핀으로 30,000G 이상 벌기" },
    { id: "t3_bet1000", tier: 3, type: "bet_win", bets: [1000], v: 30000, text: "슬롯 게임에서 1,000G 베팅으로 1회 스핀에 30,000G 이상 벌기" },
    { id: "t3_card2", tier: 3, type: "card2", mode: "none", text: "랜덤으로 정해지는 알파벳 카드(G·A·M·B·L·E·R·S 중 하나)와 랜덤으로 정해지는 알파벳 권 (A~Z 중 하나)이 모두 없는 플레이어 중에서 1명 탈락" },
    { id: "t3_difficult", tier: 3, type: "region_map", regions: ["difficult"], text: "🧗 Difficult Land 맵을 방문하지 않은 플레이어 중 1명 탈락" },
    { id: "t3_deadland", tier: 3, type: "region_map", regions: ["deadland"], text: "☠️ Dead Land 맵을 방문하지 않은 플레이어 중 1명 탈락" },
    { id: "t3_b_beg", tier: 3, type: "battle", rule: "fewbeg", text: "⚔️ 구걸 횟수가 가장 적은 후보 중 랜덤 2인 무기 배틀" },
    { id: "t3_spell", tier: 3, type: "spell", text: "Spelling Bee에 성공하지 못한 플레이어 중 랜덤 1명 탈락" },
    { id: "t3_maps", tier: 3, type: "rank", rule: "fewmaps_round", text: "이번 라운드에 방문한 맵 종류가 가장 적은 플레이어(들)가 탈락 후보" },
    { id: "t3_e_random", tier: 3, type: "battle", emo: true, rule: "random", text: "🐾 랜덤 2인 이모몬스터(EmoMonster) 배틀 (진 사람 탈락)" },
    { id: "t3_e_hosp", tier: 3, type: "battle", emo: true, rule: "fewhospital", text: "🐾 이모몬스터(EmoMonster) 병원 이용 횟수가 가장 적은 후보 중 랜덤 2인 이모몬스터(EmoMonster) 배틀" },
    { id: "t3_e_types", tier: 3, type: "emo_has", what: "type", types: ["Fairy", "Light", "Robot"], text: "🐾 Fairy·Light·Robot 중 아무 속성 이모몬스터(EmoMonster)도 없는 플레이어 중 1명 탈락" },
    { id: "t3_e_two", tier: 3, type: "emo_has", what: "has_mon", v: 2, text: "🐾 이모몬스터(EmoMonster)를 2마리 이상 소유하지 않은 플레이어 중 1명 탈락" },
    { id: "t3_e_r3", tier: 3, type: "emo_has", what: "rarity", v: 3, text: "🐾 ★3 이상 이모몬스터(EmoMonster)가 없는 플레이어 중 1명 탈락" },
    { id: "t3_e_nature", tier: 3, type: "emo_has", what: "nature", nature: "?", text: "🐾 랜덤으로 정해지는 Nature(성격)의 이모몬스터(EmoMonster)가 없는 플레이어 중 1명 탈락" },
    { id: "t3_e_mono", tier: 3, type: "emo_has", what: "mono", text: "🐾 단일 속성 이모몬스터(EmoMonster)가 없는 플레이어 중 랜덤 1명 탈락" },

    // ================================================================ 최상
    { id: "t4_jp4", tier: 4, type: "jackpot", min: "MINI", n: 4, text: "MINI 이상 잭팟 4번 이상 WIN 하기" },
    { id: "t4_slot", tier: 4, type: "slot_net", v: 100000, text: "슬롯 게임으로 100,000G 이상 벌기" },
    { id: "t4_combo", tier: 4, type: "combo", s: 50000, c: 20000, p: 30, text: "슬롯 게임으로 50,000G 이상, 카지노 게임으로 20,000G 이상, 30포인트 이상 벌기" },
    { id: "t4_spend", tier: 4, type: "pts_spent", v: 100, text: "100 포인트 이상 사용하기" },
    { id: "t4_b_lodge", tier: 4, type: "battle", rule: "lodgeminmax", text: "⚔️ 숙소에 입장한 기록이 가장 적거나 많은 플레이어끼리 2인 무기 배틀" },
    { id: "t4_b_wx", tier: 4, type: "battle", rule: "wxhit", text: "⚔️ 날씨로 인해 HP가 차감된 기록이 있는 플레이어 중에서 랜덤 2인 무기 배틀" },
    { id: "t4_b_food5", tier: 4, type: "battle", rule: "foodlt5", text: "⚔️ 식량을 5회 이상 소비하지 않는 플레이어 중 랜덤 2인 무기 배틀" },
    { id: "t4_b_highpts", tier: 4, type: "battle", rule: "highpts", text: "⚔️ 포인트가 가장 많은 사람들 중 랜덤 2인 무기 배틀" },
    { id: "t4_b_shops", tier: 4, type: "battle", rule: "fewshops", text: "⚔️ Lab 상점, 몬스터 상점, 일반 상점, 할인 상점에서 아이템을 구매한 횟수의 총합이 가장 적은 후보들 중에서 랜덤 2인 무기 배틀" },
    { id: "t4_shops", tier: 4, type: "rank", rule: "shops_few", text: "Lab 상점, 몬스터 상점, 일반 상점, 할인 상점에서 아이템을 구매한 횟수의 총합이 가장 적은 후보들 중에서 랜덤 1명 탈락" },
    { id: "t4_b_rich", tier: 4, type: "battle", rule: "rich", text: "⚔️ 돈이 가장 많은 사람들 중 랜덤 2인 무기 배틀" },
    { id: "t4_card", tier: 4, type: "card", letter: "?", text: "랜덤으로 정해지는 알파벳 카드 없는 플레이어 탈락 (G·A·M·B·L·E·R·S 중 하나)" },
    { id: "t4_ticket", tier: 4, type: "card", letter: "*", text: "랜덤으로 정해지는 알파벳 권이 없는 플레이어 탈락 (A~Z 중 하나)" },
    { id: "t4_b_card", tier: 4, type: "battle", rule: "nocard", letter: "?", text: "⚔️ 랜덤으로 정해지는 알파벳 카드 없는 후보 중 랜덤 2인 무기 배틀 (G·A·M·B·L·E·R·S 중 하나)" },
    { id: "t4_b_ticket", tier: 4, type: "battle", rule: "nocard", letter: "*", text: "⚔️ 랜덤으로 정해지는 알파벳 권이 없는 후보 중 랜덤 2인 무기 배틀 (A~Z 중 하나)" },
    { id: "t4_b_highpts2", tier: 4, type: "battle", rule: "highpts2", text: "⚔️ 가장 포인트가 많은 사람 두 명 무기 배틀" },
    { id: "t4_bonus1", tier: 4, type: "bonus_in", v: 1, text: "슬롯 게임에서 첫 스핀으로 보너스 터뜨리기" },
    { id: "t4_npc2", tier: 4, type: "npc_harm", v: 2, text: "맵에서 등장하는 NPC한테 공격을 2번 이상 당하지 않은 플레이어 중에서 랜덤 1명 탈락" },
    { id: "t4_daebak", tier: 4, type: "brand_win", brand: "DAEBAK", v: 8000, text: "슬롯 브랜드 DAEBAK 게임에서 1회 스핀으로 8,000G 이상 벌기" },
    { id: "t4_yg", tier: 4, type: "brand_win", brand: "YG GAMING", v: 10000, text: "슬롯 브랜드 YG Gaming 게임에서 1회 스핀으로 10,000G 이상 벌기" },
    { id: "t4_bet1200", tier: 4, type: "bet_win", minBet: 1200, v: 40000, text: "슬롯 게임에서 1,200G 이상 베팅으로 1회 스핀에 40,000G 이상 벌기" },
    { id: "t4_card2", tier: 4, type: "card2", mode: "none", text: "랜덤으로 정해지는 알파벳 카드(G·A·M·B·L·E·R·S 중 하나)와 랜덤으로 정해지는 알파벳 권 (A~Z 중 하나)이 모두 없는 플레이어 중에서 1명 탈락" },
    { id: "t4_hard", tier: 4, type: "region_map", regions: ["difficult", "deadland"], text: "🧗 Difficult Land 맵 또는 ☠️ Dead Land 맵을 방문하지 않은 플레이어 중 1명 탈락" },
    { id: "t4_wx20", tier: 4, type: "wx_hit", v: 20, text: "날씨로 인해 HP가 20 이상 차감되지 않는 플레이어 중 1명 탈락" },
    { id: "t4_kidnap", tier: 4, type: "kidnap_freed", text: "⛓️ Terror Casino에서 테러리스트에게 납치된 후 풀려난 플레이어만 성공 — 나머지는 탈락 후보" },
    { id: "t4_b_food", tier: 4, type: "battle", rule: "fewfood", text: "⚔️ 식량 소비 횟수가 가장 적은 후보 중 랜덤 2인 무기 배틀" },
    { id: "t4_card2b", tier: 4, type: "card2", mode: "none", text: "랜덤으로 정해지는 알파벳 카드(G·A·M·B·L·E·R·S 중 하나)와 랜덤으로 정해지는 알파벳 권 (A~Z 중 하나)이 모두 없는 플레이어 중에서 1명 탈락" },
    { id: "t4_spell", tier: 4, type: "spell_ever", text: "이전에 Spelling Bee에 성공하지 못한 플레이어 중 랜덤 1명 탈락" },
    { id: "t4_job", tier: 4, type: "job_total", v: 60000, text: "취업이나 직업을 통해서 번 돈이 60,000G 미만인 플레이어 중 1명 탈락" },
    { id: "t4_earn", tier: 4, type: "earn_total", v: 15000, text: "돈벌기 코너를 통해서 누적으로 번 돈이 15,000G 미만인 플레이어 탈락" },
    { id: "t4_maps", tier: 4, type: "rank", rule: "fewmaps_round", text: "이번 라운드에 방문한 맵 종류가 가장 적은 플레이어 중에서 1명 탈락" },
    { id: "t4_biz", tier: 4, type: "has", what: "biz", text: "본인 소유의 Self-Business가 없는 후보들 중에서 한 명 탈락" },
    { id: "t4_e_random", tier: 4, type: "battle", emo: true, rule: "random", text: "🐾 랜덤 2인 이모몬스터(EmoMonster) 배틀 (진 사람 탈락)" },
    { id: "t4_e_traits", tier: 4, type: "battle", emo: true, rule: "fewemotraits", text: "🐾 몬스터 특성 총 개수가 가장 적은 플레이어 중 랜덤 2인 이모몬스터(EmoMonster) 배틀" },
    { id: "t4_e_types", tier: 4, type: "emo_has", what: "type", types: ["Space", "Mind"], text: "🐾 Space·Mind 중 아무 속성 이모몬스터(EmoMonster)도 없는 플레이어 중 1명 탈락" },
    { id: "t4_e_r4", tier: 4, type: "emo_has", what: "rarity", v: 4, text: "🐾 ★4 이모몬스터(EmoMonster)가 없는 플레이어 중 1명 탈락" },
    { id: "t4_e_orb", tier: 4, type: "emo_has", what: "orb", text: "🐾 보유한 이모몬스터(EmoMonster) orb가 1개 이상이 아닌 플레이어 중 랜덤 1명 탈락" },
    { id: "t4_e_tri", tier: 4, type: "emo_has", what: "multitype", v: 3, text: "🐾 속성이 3개인 이모몬스터(EmoMonster)가 없는 플레이어 중 랜덤 1명 탈락" }
];
// brand names are compared loosely ("CLOVER TECH" = "CLOVER-TECH", "YG Gaming" = "YG GAMING")
export const brandKey = b => String(b || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// alphabet cards (G A M B L E R S): dropped by slot reels, sold in the shops,
// used up by card missions and to force a refused random entry
export const ALPHABET = ["G", "A", "M", "B", "L", "E", "R", "S"];
export const cardId = l => "card_" + l;
// the other 18 letters (알파벳권 C D F H …): sold in shops, used at the 🐝 Spelling Bee corner
export const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const EXTRA_LETTERS = ALL_LETTERS.filter(l => !ALPHABET.includes(l));
export const circled = l => String.fromCodePoint(0x24B6 + l.charCodeAt(0) - 65); // Ⓐ … Ⓩ
// H · Q = 5 P (point shop) · X Y Z = 3,000 G · the rest 1,000 G
export const letterSale = l => (l === "H" || l === "Q") ? { shop: "point", price: 5 } : { shop: "general", price: "XYZ".includes(l) ? 3000 : 1000 };

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
    { id: "no_move",    name: "No Move",         emoji: "🫥", type: "nomove", atk: 0,  acc: 100, anim: "nomove", hidden: true },
    // copy: uses one random weapon of the opponent against them (point shop)
    { id: "copy",       name: "복사",            emoji: "📋", type: "copy",   atk: 0,  acc: 80.4, anim: "copy", rare: true },
    // surprise: one use — swaps itself for one of the opponent's weapons for good;
    // the opponent is left with "You Got Suprised!" (a No Move). big = the attacker picks which one
    { id: "surprise",   name: "서프라이즈",      emoji: "🎁", type: "surprise", atk: 0, acc: 100, anim: "surprise", rare: true, uses: 1 },
    { id: "big_surprise", name: "빅서프라이즈",  emoji: "🎉", type: "surprise", choose: true, atk: 0, acc: 100, anim: "surprise", rare: true, uses: 1 },
    // only from the 보따리상인 NPC's shop
    { id: "rocket_punch", name: "로켓펀치",      emoji: "🚀", type: "attack", atk: 35, acc: 60, anim: "rocket", noShop: true },
    // not for sale — what a surprise leaves behind (does nothing, like No Move)
    { id: "got_surprised", name: "You Got Suprised!", emoji: "😜", type: "nomove", atk: 0, acc: 100, anim: "nomove", hidden: true }
];
// weapons a magic spell / surprise / NPC can take or turn into nothing (already-dead weapons are skipped)
export const isDeadWeapon = id => id === "no_move" || id === "got_surprised";

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
    ...ALPHABET.map(l => ({ id: cardId(l), name: `알파벳 카드 ${l}`, emoji: "🔤", letter: l, desc: "미션·맵 입장·Spelling Bee에 1번 쓰고 사라집니다." })),
    ...EXTRA_LETTERS.map(l => ({ id: cardId(l), name: `알파벳권 ${l}`, emoji: circled(l), letter: l, extra: true, desc: "🐝 Spelling Bee 코너에서 단어를 만들 때 1번 쓰고 사라집니다." })),
    { id: "turn_end",     name: "턴 종료권",          emoji: "⏹️", desc: "사용하면 턴 종료 제약(🔒 5분 이하부터 · 납치 공간 등)에 상관없이 지금 바로 턴을 끝냅니다 (1회용 · 🔄 Survival Land에서도 사용 가능)." },
    { id: "map_random",   name: "랜덤 맵권",          emoji: "🗺️", desc: "사용하면 지금 입장 가능한 모든 지역의 모든 맵 중 한 곳으로 바로 이동합니다 (턴 시작 때나 턴 도중, 남은 시간은 그대로)." },
    { id: "gotcha_blank", name: "꽝 캡슐", emoji: "🥚", desc: "Monster Gotcha에서 나온 꽝 캡슐입니다. Monster Gotcha 코너의 ♻️ 꽝 캡슐 수거에서 한꺼번에 반납하면 100~1,000G를 받습니다 (많이 모을수록 더 많이)." },
    { id: "slot_boost",   name: "슬롯 보너스 당첨 UP", emoji: "🎰", boost: "slot",   desc: "사용 후 30초 동안 모든 슬롯에서 보너스가 터질 확률이 최대 50%로! (베팅이 높을수록 확률이 줄어듭니다 · 1회용)" },
    { id: "casino_boost", name: "카지노게임 상금 당첨 UP", emoji: "🃏", boost: "casino", desc: "사용 후 30초 동안 모든 카지노게임에서 상금이 터질 확률이 최대 50%로! (베팅이 높을수록 확률이 줄어듭니다 · 1회용)" },
    { id: "random_letter", name: "랜덤알파벳권",      emoji: "❓", desc: "사용하면 알파벳권 A~Z 중 하나를 랜덤으로 받습니다." },
    { id: "super_letter", name: "슈퍼랜덤알파벳권",   emoji: "❓", superLetter: true, desc: "사용하면 알파벳 카드 G·A·M·B·L·E·R·S 중 하나를 랜덤으로 받습니다." },
    { id: "npc_block1",  name: "NPC 공격 Block 권 (1회)",  emoji: "🎫", npcBlock: 1,  desc: "NPC의 공격(골드 강탈·HP 공격·즉사·무기 봉인 등)을 1회 막아 줍니다. NPC가 공격할 때 자동으로 사용됩니다." },
    { id: "npc_block5",  name: "NPC 공격 Block 권 (5회)",  emoji: "🎫", npcBlock: 5,  desc: "NPC의 공격을 5회 막아 줍니다. NPC가 공격할 때 자동으로 사용됩니다." },
    { id: "npc_block10", name: "NPC 공격 Block 권 (10회)", emoji: "🎫", npcBlock: 10, desc: "NPC의 공격을 10회 막아 줍니다. NPC가 공격할 때 자동으로 사용됩니다." },
    // 🏦 Business Bank shop
    { id: "fast_transfer",  name: "빠른 송금 서비스",   emoji: "⚡", bank: true, desc: "Business Gold 송금 1회를 기다림 없이 바로 입금합니다 (송금 화면에서 넣어서 사용 · 1회용)." },
    { id: "extra_transfer", name: "추가 송금권",        emoji: "➕", bank: true, desc: "시즌당 1회인 Business Gold 송금을 1번 더 할 수 있습니다 (추가 송금은 시즌당 최대 3회)." },
    { id: "remote_bank",    name: "Remote 은행 이용권", emoji: "📲", bank: true, desc: "은행이 없는 맵에서도 팝업으로 Business Gold 송금 · 은행 상점을 이용합니다 (계좌 개설 제외 · 1회용)." },
    // 🏪 Self-Business shop
    { id: "biz_move",   name: "매물 지역 바꾸기 권",   emoji: "🚚", biz: true, desc: "Owner Admin에서 운영 중인 비즈니스를 다른 오픈 가능 지역/맵으로 1회 옮깁니다 (지역세 별도)." },
    { id: "biz_trend",  name: "매출 트렌드 보기권",    emoji: "📊", biz: true, desc: "Owner Admin에서 매출 트렌드 대시보드를 30초 동안 봅니다. 리포트는 인벤토리에 저장됩니다." },
    { id: "biz_remote", name: "Remote Business 관리권", emoji: "🛰️", biz: true, desc: "비즈니스가 있는 맵에 가지 않아도 Owner Admin을 팝업으로 1회 엽니다." },
    { id: "biz_close",  name: "폐업권",               emoji: "🪧", biz: true, desc: "Owner Admin에서 비즈니스를 폐업합니다. 남은 Business Gold는 소멸되니 먼저 은행에서 송금하세요." },
    // 🤒 player diseases (game/extra.js)
    // ☔ weather gear (game/life.js weatherGuard): wx = weathers it keeps off · once = 1회용 (auto-used when the weather hits, lasts until the round ends)
    { id: "umbrella",   name: "우산",       emoji: "☂️", wx: ["rain", "snow"], desc: "비 · 눈을 피하는 영구 아이템입니다 (갖고만 있으면 자동으로 막아 줍니다)." },
    { id: "umbrella_1", name: "1회용우산",  emoji: "🌂", wx: ["rain", "snow"], once: true, desc: "비 · 눈을 피하는 1회용 아이템입니다. 날씨가 닥치면 자동으로 사용되고, 그 라운드가 끝날 때까지 지속됩니다." },
    { id: "raincoat",   name: "우비",       emoji: "🧥", wx: ["rain", "snow", "storm", "blizzard", "hail"], desc: "비 · 눈 · 폭우 · 폭설 · 우박을 피하는 영구 아이템입니다 (갖고만 있으면 자동으로 막아 줍니다)." },
    { id: "raincoat_1", name: "1회용우비",  emoji: "🥼", wx: ["rain", "snow", "storm", "blizzard", "hail"], once: true, desc: "비 · 눈 · 폭우 · 폭설 · 우박을 피하는 1회용 아이템입니다. 날씨가 닥치면 자동으로 사용되고, 그 라운드가 끝날 때까지 지속됩니다." },
    { id: "parasol",    name: "양산",       emoji: "⛱️", wx: ["heat"], desc: "폭염을 피하는 영구 아이템입니다 (갖고만 있으면 자동으로 막아 줍니다)." },
    { id: "parasol_1",  name: "1회용양산",  emoji: "🏖️", wx: ["heat"], once: true, desc: "폭염을 피하는 1회용 아이템입니다. 폭염이 닥치면 자동으로 사용되고, 그 라운드가 끝날 때까지 지속됩니다." },
    // 🔑 투숙객교체권 (10P · 20 point shops): a random room comes up already taken → take it over (the guest there is moved out)
    { id: "guest_swap", name: "투숙객교체권", emoji: "🔑", desc: "숙소에서 랜덤으로 뽑힌 객실에 이미 다른 플레이어가 있을 때, 이 권을 써서 그 자리를 빼앗습니다 (원래 손님은 퇴실)." },
    { id: "final_shield", name: "최종후보선택제외권", emoji: "🛡️", desc: "미션에 실패해 최종 탈락후보가 되었을 때 70% 확률로 탈락후보(집게 프로필공)에서 빠집니다 (100%는 아님). 발동하면 1개가 사용되고, 미션 성공자와 따로 \"🛡️ 제외\"로 분류됩니다. 본인 포함 남은 플레이어가 6명 이하이면 발동하지 않습니다." },
    { id: "flu_cure",    name: "독감치료제", emoji: "💉", cure: "flu",    desc: "플레이어가 걸린 독감을 바로 치료합니다." },
    { id: "cancer_cure", name: "암치료제",   emoji: "💊", cure: "cancer", desc: "플레이어가 걸린 암을 바로 치료합니다." },
    // 🐾 EmoMon slots: 3 free, +1 per ticket up to 10
    { id: "emo_slot",    name: "이모몬스터 슬롯 확장권", emoji: "🧳", desc: "이모몬스터를 가질 수 있는 슬롯을 1칸 늘립니다 (기본 3칸 · 최대 10칸 · 인벤토리에서 사용)." },
    { id: "sugar_cure",  name: "혈당관리제", emoji: "🩸", desc: "Sugar Casino에서만 사용 · 설탕중독 수치(Sugar Level)를 10~30% 낮춥니다 (인벤토리에서 사용)." },
    // 💬 community shop goods (one comment each)
    ...CM_GOODS.map(g => ({ id: g.id, name: g.name, emoji: g.emoji, desc: g.desc, cm: g.kind }))
];
// 30 s boosters: the chance is at most 50% at the lowest bet and shrinks as the bet grows (→ 20% at the top bet)
export const BOOST_SECONDS = 30;
export function boostChance(bet, bets) {
    const list = [...new Set(bets || [bet])].sort((a, b) => a - b);
    const i = Math.max(0, list.findIndex(b => b >= bet));
    const r = list.length > 1 ? i / (list.length - 1) : 0;
    return 0.5 - 0.3 * r;
}

// ---------------------------------------------------------------- shops
// Prices assume a 200,000 G bankroll and are set slightly high on purpose.
// cat: item | pet | effect | weapon | frame | peffect ; cur: G | P
const petPriceG = { 5: 45000, 10: 90000, 15: 160000 };
const specialPetPriceG = { 5: 80000, 10: 150000 };
const fxPriceG = { 5: 30000, 10: 65000, 15: 120000 };
const specialFxPriceG = { 5: 60000, 10: 120000 };
const weaponPriceG = { spray: 35000, magic: 500000, punch: 12000, guard: 25000, tongue: 28000, kick: 12000, rock: 45000, ghost_punch: 65000, ko_punch: 55000, holo_ball: 80000, sleep_flute: 70000, coin_throw: 30000 };

// 🧳 이모몬스터 슬롯 확장권 100P · 🩸 혈당관리제 30P — the point shops that sell them (picked at random once, fixed)
export const EMO_SLOT_PT_MAPS = ["gamblers", "dungtown", "cloud", "stars", "fantasy", "spooky", "bubble", "igloo", "plaza", "riches", "npc_town", "desert_casino"];
export const SUGAR_CURE_MAPS = ["cany", "seaside", "twins", "oink", "emo", "foggy", "sky_casino", "balloon", "cosmic", "ribbit", "downtown", "magic", "ghost", "dungeon", "penguin_casino"];

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
            ...ALPHABET.map(l => ({ cat: "item", id: cardId(l), price: 50000 })),
            { cat: "item", id: "map_random", price: 50000 },
            { cat: "item", id: "random_letter", price: 15000 },
            { cat: "item", id: "super_letter", price: 35000 },
            { cat: "item", id: "npc_block1", price: 10000 },
            { cat: "item", id: "npc_block5", price: 45000 },
            { cat: "item", id: "npc_block10", price: 95000 },
            { cat: "item", id: "flu_cure", price: 30000 },
            { cat: "item", id: "cancer_cure", price: 80000 },
            { cat: "item", id: "emo_slot", price: 300000 },
            // 알파벳권 (each letter only at a few maps — see cardHomes() in catalogAdmin.js)
            ...EXTRA_LETTERS.filter(l => letterSale(l).shop === "general").map(l => ({ cat: "item", id: cardId(l), price: letterSale(l).price }))
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
        list: WEAPONS.filter(w => !w.rare && !w.hidden && !w.noShop).map(w => ({ cat: "weapon", id: w.id, price: weaponPriceG[w.id] }))
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
            ...WEAPONS.filter(w => w.rare).map(w => ({ cat: "weapon", id: w.id, price: { thunder: 70, dragon_breath: 90, gold_storm: 80, copy: 200, surprise: 300, big_surprise: 500 }[w.id] })),
            ...FRAMES.filter(f => f.rare).map(f => ({ cat: "frame", id: f.id, price: 60 })),
            ...PROFILE_EFFECTS.filter(f => f.rare).map(f => ({ cat: "peffect", id: f.id, price: 50 })),
            { cat: "item", id: "slot_boost", price: 200 },
            { cat: "item", id: "casino_boost", price: 100 },
            // 🧳 also 100P, but only at these 12 point shops (alt listing) · 🩸 혈당관리제 30P at 15 point shops (never Sugar Casino)
            { cat: "item", id: "emo_slot", price: 100, alt: true, locs: EMO_SLOT_PT_MAPS },
            { cat: "item", id: "sugar_cure", price: 30, locs: SUGAR_CURE_MAPS },
            ...EXTRA_LETTERS.filter(l => letterSale(l).shop === "point").map(l => ({ cat: "item", id: cardId(l), price: letterSale(l).price })),
            ...ALPHABET.map(l => ({ cat: "item", id: cardId(l), price: 300, alt: true }))
        ]
    },
    // points AND gold: special frames / special frame effects (+ a few P+G frames), one product per map
    pointgold: { name: "포인트+골드 상점", icon: "💠", cur: "PG", list: [] },
    // 10~20% off a rotating handful of G-shop goods (see discountItems() in data/catalogAdmin.js)
    discount: { name: "디스카운트 상점", icon: "🏷️", cur: "G", list: [] }
};
// per-round purchase limits by shop (아이템 상점 5회 · 무기/펫·프레임/기타 1회)
export const SHOP_LIMIT = { general: 5, weapon: 1, pet: 1, decor: 1, point: 1, pointgold: 1, discount: 1 };
export const SHOP_LIMIT_LABEL = { general: "아이템 상점", weapon: "무기 상점", pet: "펫 상점", decor: "프레임/효과 상점", point: "포인트 상점", pointgold: "포인트+골드 상점", discount: "디스카운트 상점" };

// ---------------------------------------------------------------- new frames / frame effects
// Each one is sold at exactly ONE map (no map sells two of them).
// deco: extra layers drawn by ui/profile.js (frameDeco) · reveal: the picture is covered until clicked
// special: 특수프레임 / 특수프레임효과 — each lowers the chance of becoming an elimination
//          candidate after a failed mission by 10% (both = 20%; not when there are 4 or fewer candidates)
const NEW_FRAMES = [
    { id: "frame_poop",    name: "똥프레임",         cls: "fr-poop",    deco: "poop",    sale: ["decor", 30000, 0, "dungdung"] },
    { id: "frame_eyeball", name: "눈알프레임",       cls: "fr-eyeball", deco: "eyeball", sale: ["decor", 70000, 0, "noluck"] },
    { id: "frame_blood",   name: "블러드프레임",     cls: "fr-blood",   deco: "blood",   sale: ["decor", 70000, 0, "coffin"] },
    { id: "frame_mosaic",  name: "모자이크프레임",   cls: "fr-mosaic",  deco: "mosaic",  reveal: true, sale: ["decor", 80000, 0, "downtown"] },
    { id: "frame_leafy",   name: "나뭇잎프레임",     cls: "fr-leafy",   deco: "leafy",   reveal: true, sale: ["decor", 80000, 0, "fantasy"] },
    { id: "frame_door",    name: "도어프레임",       cls: "fr-door",    deco: "door",    reveal: true, sale: ["decor", 80000, 0, "blackout"] },
    { id: "frame_revolve", name: "회전프레임",       cls: "fr-revolve", sale: ["pointgold", 100, 100000, "seaside"] },
    { id: "frame_antenna", name: "더듬이프레임",     cls: "fr-antenna", deco: "antenna", sale: ["decor", 90000, 0, "lucky"] },
    { id: "frame_angel",   name: "천사프레임",       cls: "fr-angel",   deco: "angel",   sale: ["point", 150, 0, "winners"] },
    { id: "frame_devil",   name: "악마프레임",       cls: "fr-devil",   deco: "devil",   sale: ["point", 150, 0, "dracula"] },
    { id: "frame_shape",   name: "도형프레임",       cls: "fr-shape",   deco: "shape",   sale: ["pointgold", 100, 100000, "rainbow"] },
    { id: "frame_ghost",   name: "고스트프레임",     cls: "fr-ghosty",  deco: "ghost",   sale: ["point", 200, 0, "dungeon"] },
    { id: "frame_cloud",   name: "구름프레임",       cls: "fr-cloud",   deco: "cloud",   sale: ["point", 100, 0, "zodiac"] },
    { id: "frame_bunny",   name: "토끼귀프레임",     cls: "fr-bunny",   deco: "bunny",   sale: ["point", 100, 0, "twins"] },
    { id: "frame_bear",    name: "곰돌이귀프레임",   cls: "fr-bear",    deco: "bear",    sale: ["point", 100, 0, "oink"] },
    { id: "frame_pippi",   name: "삐삐머리프레임",   cls: "fr-pippi",   deco: "pippi",   sale: ["decor", 90000, 0, "cany"] },
    { id: "frame_cap",     name: "야구모자프레임",   cls: "fr-cap",     deco: "cap",     sale: ["point", 100, 0, "western"] },
    // 특수프레임 — 포인트+골드 상점 only
    { id: "sframe_lucky",   name: "LUCKY 프레임",    cls: "fr-slucky",  deco: "slucky",  special: true, sale: ["pointgold", 500, 700000, "super"] },
    { id: "sframe_crazy",   name: "Crazy 프레임",    cls: "fr-crazy",   deco: "crazy",   special: true, sale: ["pointgold", 500, 800000, "ribbit"] },
    { id: "sframe_slot",    name: "Slot 프레임",     cls: "fr-slotm",   deco: "slotm",   special: true, sale: ["pointgold", 500, 900000, "eastern"] },
    { id: "sframe_rocket",  name: "로켓프레임",      cls: "fr-rocket",  deco: "rocket",  special: true, sale: ["pointgold", 500, 800000, "spacetown"] },
    { id: "sframe_winners", name: "Winners 프레임",  cls: "fr-winners", deco: "winners", special: true, sale: ["pointgold", 500, 700000, "celebrity"] },
    { id: "sframe_cupid",   name: "천사큐피드",      cls: "fr-cupid",   deco: "cupid",   special: true, sale: ["pointgold", 500, 1000000, "dove"] },
    { id: "sframe_ufo",     name: "우주선프레임",    cls: "fr-ufo",     deco: "ufo",     special: true, sale: ["pointgold", 500, 900000, "stars"] },
    { id: "sframe_mummy",   name: "미이라프레임",    cls: "fr-mummy",   deco: "mummy",   special: true, sale: ["pointgold", 500, 1000000, "graveyard"] }
];
const NEW_EFFECTS = [
    { id: "pe_flies",    name: "파리효과",       fx: { chars: ["🪰"], mode: "buzz", n: 6, size: 13 }, sale: ["decor", 22000, 0, "gamblers"] },
    { id: "pe_rain",     name: "비",             fx: { chars: ["💧"], mode: "rain", n: 14, size: 11, cls: "fx-drizzle" }, sale: ["decor", 22000, 0, "sky_casino"] },
    { id: "pe_rainbow",  name: "레인보우",       fx: { chars: [], mode: "rainbow", n: 0 }, sale: ["decor", 30000, 0, "balloon"] },
    { id: "pe_luxury",   name: "LUXURY효과",     fx: { chars: ["L", "U", "X", "U", "R", "Y"], mode: "float", n: 6, size: 15, cls: "fx-luxury" }, sale: ["point", 100, 0, "cosmic"] },
    { id: "pe_devilhand", name: "악마의손효과",  fx: { chars: ["🫱", "🫲"], mode: "hands", n: 2, size: 26 }, sale: ["point", 150, 0, "magic"] },
    { id: "pe_thunder",  name: "천둥번개효과",   fx: { chars: ["⚡"], mode: "thunder", n: 3, size: 22 }, sale: ["point", 150, 0, "deepsea_casino"] },
    { id: "pe_leaves",   name: "나뭇잎",         fx: { chars: ["🍃", "🍂", "🍃"], mode: "rain", n: 10, size: 14, cls: "fx-sway" }, sale: ["decor", 30000, 0, "spooky"] },
    // 특수프레임효과 — 포인트+골드 상점 only
    { id: "spe_tnt",     name: "TNT 다이나마이트", special: true, fx: { chars: ["💰", "🪙", "💵", "🪙", "💎", "💵"], mode: "tnt", n: 10, size: 14 }, sale: ["pointgold", 300, 90000, "underground"] },
    { id: "spe_koi",     name: "잉어연못효과",   special: true, fx: { chars: ["🐟", "💦", "🐠", "💦", "🐡", "💦"], mode: "koipond", n: 8, size: 15 }, sale: ["pointgold", 300, 80000, "bubble"] },
    { id: "spe_monggi",  name: "몽이주름효과",   special: true, fx: { chars: ["'( - )'"], mode: "monggi", n: 6, size: 9 }, sale: ["pointgold", 300, 1000000, "igloo"] },
    { id: "spe_diamond", name: "다이아몬드효과", special: true, fx: { chars: ["💎"], mode: "rain", n: 12, size: 15, cls: "fx-colorful" }, sale: ["pointgold", 300, 70000, "shipwreck"] },
    { id: "spe_chick",   name: "병아리효과",     special: true, fx: { chars: ["🐥", "🐤", "🐣"], mode: "chicks", n: 6, size: 15 }, sale: ["pointgold", 300, 90000, "ice"] },
    { id: "spe_jackpot", name: "GRAND JACKPOT 효과", special: true, fx: { chars: ["GRAND JACKPOT", "🎆", "GRAND JACKPOT", "🎇"], mode: "firework", n: 10, size: 9, cls: "fx-gj" }, sale: ["pointgold", 300, 1000000, "gambleables"] }
];
for (const [list, cat, items] of [[FRAMES, "frame", NEW_FRAMES], [PROFILE_EFFECTS, "peffect", NEW_EFFECTS]]) {
    for (const { sale, ...e } of items) {
        const [shop, price, gold, loc] = sale;
        list.push({ ...e, home: loc });
        SHOPS[shop].list.push({ cat, id: e.id, price, gold: gold || 0, locs: [loc] });
    }
}
export const isSpecialFrame = id => !!FRAMES.find(f => f.id === id)?.special;
export const isSpecialEffect = id => !!PROFILE_EFFECTS.find(f => f.id === id)?.special;

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
    const { slot, casino, slots, casinos, ...loc } = m;
    LOCATIONS.push({ ...loc, slots: mapSlots(m).map((_, i) => slotIdOf(m, i)), casino: mapCasinos(m).map((_, i) => casinoIdOf(m, i)) });
}
// ⛓️ the kidnap room (no region roulette ever lands here)
LOCATIONS.push({ ...KIDNAP_ROOM, slots: [], casino: [] });
// the 7 special slots
const SPECIAL_HOME = { monster_kitchen: "ground", dj_crypto: "poly", sol_umbra: "foggy", neon_cadets: "twins", four_pillars: "mj", gift: "balloon", chrono_heist: "oink" };
for (const [sid, lid] of Object.entries(SPECIAL_HOME)) LOCATIONS.find(l => l.id === lid)?.slots.push(sid);
// the 15 theme machines (round 4) — js/slots/themeConfigs.js
for (const [sid, lid] of Object.entries(THEME_HOME)) { const l = LOCATIONS.find(x => x.id === lid); if (l && !l.slots.includes(sid)) l.slots.push(sid); }
// the 11 sky / space / arena machines (round 7) — js/slots/skyConfigs.js
for (const [sid, lid] of Object.entries(SKY_HOME)) { const l = LOCATIONS.find(x => x.id === lid); if (l && !l.slots.includes(sid)) l.slots.push(sid); }
// the 10 round-8 machines — js/slots/realmConfigs.js
for (const [sid, lid] of Object.entries(REALM_HOME)) { const l = LOCATIONS.find(x => x.id === lid); if (l && !l.slots.includes(sid)) l.slots.push(sid); }
for (const [sid, lid] of Object.entries(WONDER_HOME)) { const l = LOCATIONS.find(x => x.id === lid); if (l && !l.slots.includes(sid)) l.slots.push(sid); }
// the 11 round-10 machines — js/slots/mythConfigs.js
for (const [sid, lid] of Object.entries(MYTH_HOME)) { const l = LOCATIONS.find(x => x.id === lid); if (l && !l.slots.includes(sid)) l.slots.push(sid); }

// earn corners: `earn: true` (old saves) = the classic four
export const EARN_ALL = ["blood", "labor", "poop", "sell", "music", "survival", "guess"];
export const earnKinds = loc => !loc?.earn ? [] : Array.isArray(loc.earn) ? loc.earn : ["blood", "labor", "poop", "sell", "guess"];

// map passes: one per map. A pass lets its holder in (nationals-only maps)
// AND teleports straight to that map when used at the start of a turn.
export const passIdOf = loc => loc.req?.pass || "pass_" + loc.id;
// Sale: every pass is sold at exactly ONE other map's general shop (no duplicates),
// each map sells at most 2 passes, spread over the regions; price 45,000~50,000 G.
const passRnd = (() => { let h = 2166136261; for (const c of "gamblers-map-passes") { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; })();
const passSellers = LOCATIONS.filter(l => l.shops.includes("general") && l.region !== "survival"); // 🔄 Survival Land shops sell only Survival Land passes
const passLoad = {};
// pass prices: the new regions 45,000G · ☠️ Dead Land 10,000G · 🧗 Difficult Land 35,000G · 👹 NPC Land 40,000G (💀 Death Casino 35,000G) · older maps 45,000~50,000G
const NEW_PASS_REGIONS = ["restricted", "desert", "emoland"];
export const SURVIVAL_PASS_PRICE = 45000;
// 🏬 백화점 maps: their passes cost more
const PASS_PRICE_BY_ID = { riches: 100000, goldbar: 100000, diamond_casino: 100000, lgbt_nation: 100000, combo_town: 100000, hurry_town: 100000, terror_casino: 55000, magma_town: 55000, death_door: 55000, radioactive: 55000 };
function passPrice(l) {
    if (PASS_PRICE_BY_ID[l.id]) return PASS_PRICE_BY_ID[l.id];
    if (l.region === "deadland") return 10000;
    if (l.region === "difficult") return 35000;
    if (l.region === "npcland") return l.id === "death_casino" ? 35000 : 40000;
    if (NEW_PASS_REGIONS.includes(l.region)) return 45000;
    return null;
}
for (const l of LOCATIONS) {
    if (l.kidnap) continue;
    const id = passIdOf(l);
    const ex = ITEMS.find(i => i.id === id);
    if (ex) { ex.name = `${l.name} 맵권`; ex.loc = l.id; }
    else ITEMS.push({ id, name: `${l.name} 맵권`, emoji: "🎟️", loc: l.id, desc: "사용하면 이 맵으로 바로 이동합니다 — 턴 시작 때나 턴 도중 언제든 (남은 시간은 그대로). 국적 전용 맵 입장 가능. 입장 조건(장비·입장료)이 있는 맵은 그 조건을 갖춰야 이동할 수 있습니다." });
    // 🔄 Survival Land passes: 45,000G, sold only at the other Survival Land maps, usable only during the 패자부활전
    if (l.region === "survival") {
        const it = ITEMS.find(i => i.id === id);
        it.survival = true; it.emoji = "🔄";
        it.desc = "🔄 패자부활전 전용 · 사용하면 Survival Land의 이 맵으로 바로 이동합니다 (남은 시간은 그대로). 패자부활전 동안에만 쓸 수 있습니다.";
        SHOPS.general.list.push({ cat: "item", id, price: SURVIVAL_PASS_PRICE, locs: LOCATIONS.filter(x => x.region === "survival" && x.id !== l.id).map(x => x.id) });
        continue;
    }
    // least-loaded sellers first, preferably in another region
    let cand = passSellers.filter(s => s.id !== l.id && (passLoad[s.id] || 0) < 2);
    const min = Math.min(...cand.map(s => passLoad[s.id] || 0));
    cand = cand.filter(s => (passLoad[s.id] || 0) === min);
    const other = cand.filter(s => s.region !== l.region);
    if (other.length) cand = other;
    const seller = cand[Math.floor(passRnd() * cand.length)];
    if (!seller) continue;
    passLoad[seller.id] = (passLoad[seller.id] || 0) + 1;
    const rndPrice = 45000 + Math.round(passRnd() * 10) * 500; // drawn for every map so older maps keep their prices
    SHOPS.general.list.push({ cat: "item", id, price: passPrice(l) ?? rndPrice, locs: [seller.id] });
}
export const isPass = id => !!ITEMS.find(i => i.id === id)?.loc;
export const isSurvivalPass = id => !!ITEM_BY_ID[id]?.survival;

// ⏹️ 턴 종료권: 20 random maps (fixed, seeded) among those with an 일반 상점 or a 포인트 상점 —
// 25,000G at an 일반 상점 · 40P at a 포인트 상점 (a map that has both sells it in one of them)
export const TURN_END_GOLD = 25000, TURN_END_PTS = 40, TURN_END_MAPS = 20;
{
    const rnd = (() => { let h = 2166136261; for (const c of "gamblers-turn-end-pass") { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; })();
    const pool = LOCATIONS.filter(l => !l.kidnap && l.region !== "survival" && (l.shops.includes("general") || l.shops.includes("point")));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const gold = [], pts = [];
    for (const l of pool.slice(0, TURN_END_MAPS)) {
        const g = l.shops.includes("general"), p = l.shops.includes("point");
        (p && (!g || rnd() < 0.4) ? pts : gold).push(l.id);
    }
    if (gold.length) SHOPS.general.list.push({ cat: "item", id: "turn_end", price: TURN_END_GOLD, locs: gold });
    if (pts.length) SHOPS.point.list.push({ cat: "item", id: "turn_end", price: TURN_END_PTS, locs: pts, ...(gold.length ? { alt: true } : {}) });
}

// the map that sells a new frame / effect must have that shop (adds 💠 포인트+골드 상점 where needed)
for (const [shopId, shop] of Object.entries(SHOPS)) for (const it of shop.list) for (const lid of it.locs || []) {
    const l = LOCATIONS.find(x => x.id === lid);
    if (l && !l.shops.includes(shopId)) l.shops = [...l.shops, shopId];
}


// ☔ weather gear: 20 point shops sell 우산 300P · 우비 500P · 양산 150P,
// 20 discount shops (every one there is, if fewer) sell 1회용우산 4,000G · 1회용우비 8,000G · 1회용양산 2,000G (fixed, seeded)
export const WX_GEAR_MAPS = 20;
{
    const rnd = (() => { let h = 2166136261; for (const c of "gamblers-weather-gear") { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; })();
    const pick = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, WX_GEAR_MAPS).map(l => l.id); };
    const ok = l => !l.kidnap && l.region !== "survival";
    const pts = pick(LOCATIONS.filter(l => ok(l) && l.shops.includes("point")));
    for (const [id, price] of [["umbrella", 300], ["raincoat", 500], ["parasol", 150]]) SHOPS.point.list.push({ cat: "item", id, price, locs: pts });
    // 🔑 투숙객교체권 10P: 20 other random point-shop maps (its own draw)
    { const r2 = (() => { let h = 2166136261; for (const c of "gamblers-guest-swap") { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; })();
      const a = LOCATIONS.filter(l => ok(l) && l.shops.includes("point")); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r2() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      SHOPS.point.list.push({ cat: "item", id: "guest_swap", price: 10, locs: a.slice(0, 20).map(l => l.id) }); }
    // 🛡️ 최종후보선택제외권 100,000G: 20 random maps that have a 일반 상점 *now* (admin map edits can add / remove shops,
    // so the list is worked out live — same seeded order every time, cached until the set of general-shop maps changes)
    { let cache = null; const shieldLocs = () => { const pool = LOCATIONS.filter(l => ok(l) && !l.off && l.shops.includes("general")), key = pool.map(l => l.id).join(","); if (cache?.key === key) return cache.locs;
      const r3 = (() => { let h = 2166136261; for (const c of "gamblers-final-shield") { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; })();
      const a = [...pool].sort((x, y) => x.id < y.id ? -1 : 1); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r3() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      cache = { key, locs: a.slice(0, 20).map(l => l.id) }; return cache.locs; };
      SHOPS.general.list.push({ cat: "item", id: "final_shield", price: 100000, get locs() { return shieldLocs(); } }); }
    for (const [id, price] of [["umbrella_1", 4000], ["raincoat_1", 8000], ["parasol_1", 2000]]) SHOPS.discount.list.push({ cat: "item", id, price }); // which 20 discount maps: wxGearDiscountMaps() in catalogAdmin.js (the admin can move discount shops)
}
// 🐝 Spelling Bee corner: one map in each of these (randomly chosen) regions
// 🏬 백화점 corner (screens/dept.js) — admin can move it in 🌍 지역·맵 관리
export const DEPT_MAPS = ["riches", "goldbar", "diamond_casino", "lgbt_nation", "combo_town", "terror_casino", "magma_town", "death_door", "hurry_town", "radioactive"];
for (const id of DEPT_MAPS) { const l = LOCATIONS.find(x => x.id === id); if (l) l.dept = true; }

export const SPELL_MAPS = ["oink", "gambleables", "cany", "coffin", "blackout", "bubble", "igloo", "zodiac",
    // +10 spread over the other regions (18 maps in all)
    "lucky", "eastern", "magic", "dungeon", "shipwreck", "plaza", "beggar_shelter", "games_only", "npc_town", "island"];
for (const id of SPELL_MAPS) { const l = LOCATIONS.find(x => x.id === id); if (l) l.spell = true; }

// 🏦 Business Bank / 🏪 Self-Business corners (admin can move them in 🌍 지역·맵 관리)
export const BANK_MAPS = ["highlimit", "highroller", "wealthy", "space_lake", "star_sky", "sky_pond", "dungdung", "downtown", "dungeon", "ghost", "winners", "celebrity", "crazy_casino", "picky", "ocean_town", "npc_town"];
export const BIZHUB_MAPS = ["riches", "diamond_casino", "goldbar", "sky_tower", "death_casino", "combo_town", "wingers", "spacetown", "shipwreck", "space_center", "western", "twins"];
// 🐾 EmoMon corners: 🔍 Capture on (almost) every map, 🏥 Monster Hospital / 🧪 Monster Lab on a few (admin can change each map)
export const EMO_HOSPITAL_MAPS = ["cloud", "stars", "seaside", "downtown", "magic", "underground", "graveyard", "bubble", "igloo", "plaza", "wealthy", "games_only", "slots_only", "npc_town", "island"];
export const EMO_LAB_MAPS = ["zodiac", "emo", "fantasy", "dungeon", "coffin", "rtp_town", "diamond_casino", "colosseum"];
export const EMO_NO_CAPTURE_REGIONS = [];
// 💬 Community / 🏟️ Arena corners: none by default — the admin places them (🌍 지역·맵 관리)
export const COMMUNITY_MAPS = [];
export const ARENA_MAPS = [];
// maps without an EmoMon Capture corner (admin can still turn it on per map)
export const EMO_NO_CAPTURE_MAPS = ["sky_casino", "balloon", "celebrity", "cosmic", "oink", "noluck", "downtown", "super", "rainbow", "fantasy", "underground", "spooky", "coffin", "bubble", "igloo", "plaza", "rtp_town", "beggar_shelter", "wealthy", "games_only", "noslot_casino", "slots_only", "noc_casino", "npc_casino", "npc_town"];
// 🛒 Monster Shop corner (balls · potions · tickets · weapons · traits)
export const EMO_SHOP_MAPS = ["dove", "winners", "spacetown", "lucky", "gamblers", "emo2", "eastern", "magic", "blackout", "ghost", "deepsea_casino", "ice", "random_casino", "highroller", "picky", "redblue", "evil_town", "island"];
for (const l of LOCATIONS) {
    if (!EMO_NO_CAPTURE_REGIONS.includes(l.region) && !EMO_NO_CAPTURE_MAPS.includes(l.id) && !l.kidnap && !l.bare) l.capture = true;
    if (EMO_SHOP_MAPS.includes(l.id)) l.emoshop = true;
    if (EMO_HOSPITAL_MAPS.includes(l.id)) l.hospital = true;
    if (EMO_LAB_MAPS.includes(l.id)) l.lab = true;
}
// 🏷️ EmoMonster Rent Shop: 25 random maps among every map with a 🐾 monster corner (Capture · Hospital · Lab · Shop).
// "Random" but stable (the same 25 on every device): ordered by a hash of the map id. The admin can turn it on / off per map.
export const EMO_RENT_COUNT = 25;
{
    const hash = s => { let x = 2166136261; for (const ch of s + "#rent") x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0; return x; };
    LOCATIONS.filter(l => (l.capture || l.hospital || l.lab || l.emoshop) && !l.kidnap)
        .sort((a, b) => hash(a.id) - hash(b.id)).slice(0, EMO_RENT_COUNT).forEach(l => { l.emorent = true; });
}
for (const id of BANK_MAPS) { const l = LOCATIONS.find(x => x.id === id); if (l) l.bank = true; }
for (const id of COMMUNITY_MAPS) { const l = LOCATIONS.find(x => x.id === id); if (l) l.community = true; }
for (const id of ARENA_MAPS) { const l = LOCATIONS.find(x => x.id === id); if (l) l.arena = true; }
for (const id of BIZHUB_MAPS) { const l = LOCATIONS.find(x => x.id === id); if (l) l.bizhub = true; }

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
//   idle: does nothing (No Move / 애교) · copy: attacks with a copy of one of the player's weapons
//   hope: a kind message · gift: an item for the bag · shop: opens the 보따리상점 (PEDDLER)
// align: evil 악 (only harmful moves) · neutral 중립 (harmful + helpful) · good 선 (only helpful)
export const NPC_ALIGN = { evil: { label: "악", cls: "evil" }, neutral: { label: "중립", cls: "neutral" }, good: { label: "선", cls: "good" } };
export const NPCS = [
    { id: "beggar",  name: "거지",       emoji: "🧎", art: "🥣", color: "#a16207", moves: [{ steal: [500, 1000] }, { hp: -5 }, { hp: -10 }] },
    { id: "angel",   name: "엔젤",       emoji: "👼", art: "✨", color: "#fde68a", moves: [{ give: [500, 1000] }, { hp: 5 }, { hp: 10 }] },
    { id: "samurai", name: "사무라이",   emoji: "🥷", art: "⚔️", color: "#dc2626", moves: [{ hp: -5 }, { hp: -10 }, { hp: -15 }] },
    { id: "granny",  name: "할머니",     emoji: "👵", art: "🦯", color: "#a78bfa", moves: [{ steal: [100, 500] }, { hp: -5 }, { curse: true }] },
    { id: "reaper",  name: "죽음의 사신", emoji: "💀", art: "🪦", color: "#0f172a", moves: [{ steal: [1000, 5000] }, { hp: -10 }, { hp: -15 }, { hp: -20 }, { hp: -30 }, { hp: -50 }, { kill: true }] },
    { id: "wizard",  name: "마법사",     emoji: "🧙", art: "🪄", color: "#7c3aed", moves: [{ steal: [500, 3000] }, { give: [500, 3000] }, { hp: -10 }, { hp: -15 }, { hp: -20 }, { nomove: true }] },
    { id: "robot",   name: "로봇",       emoji: "🤖", art: "📋", color: "#64748b", align: "evil", moves: [{ hp: -10 }, { idle: "No Move" }, { copy: true }] },
    { id: "hamster", name: "햄스터",     emoji: "🐹", art: "💛", color: "#fbbf24", moves: [{ idle: "애교부리기" }, { hp: 5 }, { give: [100, 500] }, { hope: true }] },
    { id: "croc",    name: "악어",       emoji: "🐊", art: "🦷", color: "#15803d", moves: [{ hp: -5 }, { hp: -10 }, { hp: -15 }, { hp: -20 }] },
    { id: "peddler", name: "보따리상인", emoji: "🧳", art: "🎒", color: "#b45309", moves: [{ hp: -10 }, { gift: "hp_10" }, { hp: -5 }, { shop: true }] },
    // ☠️ Dead Land only (deadOnly: never shows up anywhere else) — `w` = the move's weight
    { id: "space_monster", name: "우주괴물", emoji: "👾", art: "🛸", color: "#4c1d95", align: "evil", deadOnly: true,
      moves: [{ hp: -20 }, { hp: -15 }, { hp: -30 }, { breakWeapon: true }, { kill: true }] },
    { id: "evil_kid", name: "사악한 꼬마", emoji: "😈", art: "🧸", color: "#be123c", align: "evil", deadOnly: true,
      moves: [{ stealPet: "fx", w: 10 }, { stealPet: "pet", w: 10 }, { stealPet: "sfx", w: 10 }, { stealPet: "spet", w: 10 }, { hp: -10, w: 60 }] },
    { id: "death_hand", name: "죽음의손", emoji: "🫳", art: "🖤", color: "#111827", align: "evil", deadOnly: true,
      moves: [{ kill: true, w: 10 }, { disease: "cancer", w: 20 }, { disease: "flu", w: 20 }, { stealAll: "gold", w: 10 }, { stealAll: "points", w: 10 }, { stealAll: "items", w: 10 }, { stealMon: true, w: 20 }] },
    { id: "beggar_family", name: "거지가족", emoji: "👨‍👩‍👧‍👦", art: "🥫", color: "#78716c", align: "evil", deadOnly: true,
      moves: [{ steal: [10000, 10000] }, { steal: [20000, 20000] }, { steal: [50000, 50000] }, { steal: [30000, 30000] }, { stealPts: 50 }, { stealPts: 100 }, { stealPts: 10 }, { steal: [5000, 5000] }, { stealAll: "bizGold" }, { stealAll: "loanGold" }] },
    { id: "terrorist", name: "Terrorist", emoji: "🥷", art: "💣", color: "#3f3f46", align: "evil", deadOnly: true,
      moves: [{ kill: true, w: 10 }, { hp: -15, w: 30 }, { kidnap: true, w: 40 }, { hp: -20, steal: [10000, 10000], w: 20 }] },
    // ⛪ Foggy Church (Survival Land) only: sermon = 30 s of hymns (play time keeps running) · donation = give real gold or get hurt
    { id: "priest", name: "Priest", emoji: "🧑‍⚖️", art: "📖", color: "#1f2937", align: "evil", churchOnly: true,
      moves: [{ sermon: 30 }, { donation: true }] },
    // 🧊 Icy Castle (Survival Land) only: freeze = Icy Breath (the whole play screen frozen for 30 s, the clock keeps running)
    { id: "ice_queen", name: "Ice Queen", emoji: "👸", art: "❄️", color: "#0ea5e9", align: "evil", survivalOnly: true,
      moves: [{ hp: -20, w: 10 }, { hp: -30, w: 10 }, { kill: true, w: 5 }, { freeze: 30, name: "Icy Breath", w: 75 }] },
    // 🦋 Decalcomania Casino (Survival Land) only: profileCopy = a devil copy of the player plays for them for 60 s
    { id: "fake_profile", name: "Fake Profile", emoji: "🎭", art: "😈", color: "#a21caf", align: "evil", survivalOnly: true,
      moves: [{ profileCopy: 60, name: "Profile Copy" }] },
    // 🦟 모기 숲 (Survival Land) only: tiny bites come often and quietly (an alarm under the pet, no attack screen) ·
    //    only the cancer bite gets the attack popup · the big one always starts a battle (screens/survivalMosquito.js)
    { id: "tiny_mosquito", name: "Tiny Mosquito", emoji: "🦟", art: "🩸", color: "#4d7c0f", align: "evil", survivalOnly: true,
      moves: [{ hp: -5, bite: true, name: "물기", w: 95 }, { disease: "cancer", w: 5 }] },
    { id: "monster_mosquito", name: "Monster Mosquito", emoji: "🦟", art: "💉", color: "#14532d", align: "evil", survivalOnly: true, big: true,
      moves: [{ battle: "mosquito", name: "Battle" }] },
    // 🎅 arctic (빙하) region only · 🦹 terrorist kidnap room only (always there)
    { id: "santa", name: "산타크로스", emoji: "🎅", art: "🎁", color: "#dc2626", align: "good", arcticOnly: true,
      moves: [{ hp: 10 }, { give: [1000, 1000] }, { give: [2000, 2000] }, { hp: 20 }, { cureFlu: true }, { giftBox: true }] },
    { id: "terror_boss", name: "Terrorist Boss", emoji: "🦹", art: "🧨", color: "#18181b", align: "evil", kidnapOnly: true,
      moves: [{ hp: -10 }, { hp: -20 }, { hp: -30 }, { kill: true }, { steal: [10000, 10000], rob: true }, { steal: [5000, 5000], rob: true }, { steal: [3000, 3000], rob: true }, { steal: [1000, 1000], rob: true }, { stealItem: true }] }
];
// Dead Land maps (deadNpc): only these NPCs come — the four Dead Land NPCs + the reaper and the crocodile
export const DEAD_NPC_IDS = ["space_monster", "reaper", "evil_kid", "death_hand", "croc", "beggar_family"];
// 🎅 Santa: arctic maps only (with the normal NPCs) · 🦹 Terrorist Boss: the kidnap room only (npcOnly)
// 🎁 Santa's gift box: one of these (w = weight %)
export const SANTA_GIFTS = [
    { item: "sugar_cure", w: 11.125 }, { item: "flu_cure", w: 11.125 }, { emo: "ITEM001", name: "몬스터볼", emoji: "⚪", w: 11.125 }, { emo: "BALL_DUNG", name: "똥볼", emoji: "💩", w: 11.125 },
    { item: "hp_10", w: 11.125 }, { item: "hp_50", w: 11.125 }, { emo: "EMO_HP10", name: "+10 HP 이모몬스터약", emoji: "🧪", w: 11.125 }, { emo: "EMO_HP50", name: "+50 HP 이모몬스터약", emoji: "💉", w: 11.125 },
    { mon: 85, name: "X-Deer 이모몬스터", emoji: "🦌", w: 1 }, { emo: "ITEM_ANGEL_ORB", name: "Angel Orb", emoji: "😇", w: 5 }, { emo: "ITEM_ICE_ORB", name: "Ice Orb", emoji: "🧊", w: 5 }
];
// who can show up on this map: npcOnly → that one · Dead Land → DEAD_NPC_IDS · anywhere else → the normal NPCs
export function npcPool(loc) {
    if (loc?.npcOnly) { const n = NPCS.find(x => x.id === loc.npcOnly); if (n) return [n]; }
    // a map with its own NPC list (🦟 모기 숲: Tiny Mosquito · Monster Mosquito)
    if (loc?.npcList) { const l = loc.npcList.map(id => NPCS.find(x => x.id === id)).filter(Boolean); if (l.length) return l; }
    // ⛪ Foggy Church: only the Priest comes
    if (loc?.church) { const pr = NPCS.find(n => n.id === "priest"); if (pr) return [pr]; }
    if (loc?.deadNpc) return DEAD_NPC_IDS.map(id => NPCS.find(n => n.id === id)).filter(Boolean);
    return NPCS.filter(n => !n.deadOnly && !n.kidnapOnly && !n.churchOnly && !n.survivalOnly && (!n.arcticOnly || loc?.region === "arctic"));
}
// a move by its weight (w, default 1)
export const moveChance = (npc, m) => (m.w ?? 1) / npc.moves.reduce((a, x) => a + (x.w ?? 1), 0);
export function pickNpcMove(npc) {
    let x = Math.random();
    for (const m of npc.moves) { if ((x -= moveChance(npc, m)) < 0) return m; }
    return npc.moves[npc.moves.length - 1];
}
export const HOPE_MESSAGES = ["잘될거에요", "대박나세요", "우승할거에요"];
// a move is "harmful" when it can hurt the player (NPC 공격 Block 권 blocks these)
export const npcHarmful = m => !!(m.battle || m.freeze || m.profileCopy || m.sermon || m.donation || m.stealItem || m.steal || (m.hp && m.hp < 0) || m.kill || m.nomove || m.copy || m.curse || m.breakWeapon || m.stealPet || m.disease || m.stealAll || m.stealMon || m.stealPts || m.kidnap);
// evil = harmful moves only · good = helpful only · neutral = both (curses / idling count as neither)
export function npcAlign(n) {
    if (n.align) return n.align;
    const bad = n.moves.some(m => m.steal || (m.hp && m.hp < 0) || m.kill || m.nomove || m.copy);
    const good = n.moves.some(m => m.give || (m.hp && m.hp > 0) || m.gift || m.shop || m.hope);
    return bad && good ? "neutral" : good ? "good" : "evil";
}
// 🧳 보따리상점: 5 random goods, cheap — one purchase per player per season
// cur: G | P | PG (points + gold)
export const PEDDLER_STOCK = [
    { cat: "weapon", id: "holo_ball", gold: 100000 },
    { cat: "weapon", id: "sleep_flute", gold: 200000 },
    { cat: "weapon", id: "copy", pts: 100 },
    { cat: "weapon", id: "rocket_punch", pts: 200 },
    { cat: "weapon", id: "surprise", pts: 150 },
    { cat: "weapon", id: "big_surprise", pts: 250 },
    { cat: "item", id: "map_random", gold: 20000 },
    { cat: "item", id: "mission_pass", pts: 100, gold: 10000 },
    { cat: "item", id: "hp_full", gold: 50000 },
    { cat: "item", id: "random_letter", gold: 20000 },
    { cat: "pet", id: "poop", gold: 25000 },
    { cat: "pet", id: "dove_trio", pts: 250 },
    { cat: "effect", id: "fx_clover", gold: 100000 },
    { cat: "effect", id: "fx_moneyfire", pts: 250 },
    // 🐾 EmoMon goods (emo = monster item · emoweapon = EmoMonster weapon id)
    { cat: "emo", id: "EMO_HP10", gold: 5940 },
    { cat: "emo", id: "EMO_HP50", gold: 21670 },
    { cat: "emoweapon", id: 2, gold: 100978 }   // 무기 Hit
];
export const CURSES = ["저주받아라!", "죽어라!", "돈 다 날려라!", "평생 꽝만 나와라!", "잭팟은 꿈도 꾸지 마라!", "네 펫이 도망갈 거다!", "다음 스핀은 무조건 꽝이다!", "가진 돈 전부 잃을 거다!"];

// ---------------------------------------------------------------- lookups
export const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
export const PET_BY_ID = byId(PETS);
export const PETFX_BY_ID = byId(PET_EFFECTS);
export const WEAPON_BY_ID = byId(WEAPONS);
// attack weapons = the ones that lower HP (type "attack"); at most CONFIG.MAX_ATTACK_WEAPONS of them
export const isAttackWeapon = id => WEAPON_BY_ID[id]?.type === "attack";
export const attackCount = weapons => (weapons || []).filter(isAttackWeapon).length;
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
