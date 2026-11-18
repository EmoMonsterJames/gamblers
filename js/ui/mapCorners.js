// =====================================================================
// Every corner a player can use on a map — the same list (and order) as
// the in-game tabs. Used by the 지도 page pins and the admin map cards so
// they never fall behind what the map really has.
//   mapCorners(loc) → ["🏪 일반 상점", "💪 헌혈", "🔍 EmoMon Capture · Fire·Water · 출현 45% · 8종", …]
// =====================================================================
import { Store } from "../core/store.js";
import { SHOPS, earnKinds } from "../data/catalog.js";
import { locationShops, cardsAt } from "../data/catalogAdmin.js";
import { HONOR_KINDS, honorKinds } from "../data/honor.js";
import { BIZ_LIST, BIZ_TYPES, bizPriceText } from "../data/business.js";
import { activeBiz, stockLeft } from "../game/bank.js";
import { captureConfig, shopStock, labStock, emoItem, cat as emoCat } from "../emomon/data.js";
import { helpHere, friendsHere } from "../game/social.js";

export const EARN_TEXT = { blood: "🩸 헌혈", labor: "⛏️ 노동", poop: "💩 똥", sell: "🛍️ 팔기", music: "🎧 음악 감상", survival: "⚔️ 서바이벌", guess: "❓ 플레이어 이름 맞추기" };
const rankText = k => HONOR_KINDS[k].rank === 1 ? "우승" : `TOP ${HONOR_KINDS[k].rank}`;
const doorText = { fee: "입장료 1,000G", random: "랜덤 문 60%", free: "무료 입장" };

export function mapCorners(l, { detail = true } = {}) {
    const listed = BIZ_LIST.filter(T => T.listed.includes(l.id));
    const hub = !!l.bizhub || listed.length > 0;
    const cap = l.capture && emoCat() ? captureConfig(l) : null;
    const st = l.emoshop && emoCat() ? shopStock(l.id) : null;
    const lab = l.lab && emoCat() ? labStock(l.id) : null;
    const d = (base, extra) => detail && extra ? `${base} · ${extra}` : base;
    return [
        ...locationShops(l).map(k => `${SHOPS[k].icon} ${SHOPS[k].name}`),
        l.discount && "🏷️ 할인 상점",
        ...earnKinds(l).map(k => `💪 ${EARN_TEXT[k] || k}`),
        l.job && "💼 직업", l.beg && "🥺 구걸", l.spell && "🐝 Spelling Bee",
        ...honorKinds(l).map(k => d(`${HONOR_KINDS[k].emoji} ${HONOR_KINDS[k].name}`, `시즌 ${rankText(k)} 경력자 전용`)),
        l.bank && d("🏦 Business Bank", "TOP 10 경력자 전용"),
        hub && d("🏪 Self-Business", "TOP 10 경력자 전용"),
        ...listed.map(T => d(`🏷️ 매물: ${T.emoji} ${T.name}`, `${bizPriceText(T.price, T.pts || 0)} · 남은 ${Math.max(0, stockLeft(T.id))}/${T.max}`)),
        ...activeBiz().filter(b => b.loc === l.id).map(b => d(`${BIZ_TYPES[b.type].emoji} ${BIZ_TYPES[b.type].name}`, `Owner: ${Store.player(b.owner)?.name_ko || "?"}`)),
        l.capture && d("🔍 EmoMon Capture", cap && `${cap.types.slice(0, 3).join("·")}${cap.types.length > 3 ? ` 외 ${cap.types.length - 3}` : ""} · 출현 ${cap.chance}% · ${cap.mons.length}종 · ${doorText[cap.door]}`),
        l.hospital && "🏥 Monster Hospital",
        l.lab && d("🧪 Monster Lab", lab && `LAB 상점 ${lab.items.length}종`),
        l.emoshop && d("🛒 Monster Shop", st && `속성 볼 ${st.balls.map(id => emoItem(id)?.attr).filter(Boolean).join("·")} · 무기 ${st.weapons.length} · 특성 ${st.traits.length}`),
        l.community && d("💬 커뮤니티", "500G · 시즌당 1회 · 입장 60%"),
        helpHere(l) && d("🤝 도움주기", l.help ? "관리자 지정 · 항상" : "이번 시즌 랜덤 20곳 중 하나"),
        friendsHere(l) && "👫 내 친구",
        l.arena && d("🏟️ 아레나", "1:1 EmoMon 배틀 · 시즌당 2회"),
        l.lotto && d("🎟️ 로또", "시즌 · 비시즌 · 연금 로또 · 로또 판매점"),
        l.highlight && d("🎬 Highlight", "하이라이트 감상 · 시즌당 1회 보상"),
        l.dept && d("🏬 백화점", "몬스터 외 모든 상품 · 시즌당 1회 · 최대 3개"),
        l.gotcha && d("🎰 Monster Gotcha", "몬스터 뽑기 · 입장 60% · 라운드당 1회"),
        ...cardsAt(l.id).map(c => `🔤 알파벳 카드 ${c.letter} 판매 (${SHOPS[c.shop].name})`)
    ].filter(Boolean);
}
