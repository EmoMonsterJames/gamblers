// Home, players, hall of fame, world map, practice room and admin pages.
import { h, fmt, esc } from "../core/util.js";
import { toast, modal, confirmBox } from "../core/fx.js";
import { Sound } from "../core/sound.js";
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { LOCATIONS, SHOPS, MISSIONS, TIERS, PETS, PET_EFFECTS, WEAPONS, FRAME_BY_ID, PEFFECT_BY_ID, REGIONS, REGION_BY_ID, ITEM_BY_ID, earnKinds } from "../data/catalog.js";
import { CASINO_GAMES, CASINO_BY_ID, gameRtp } from "../data/casino.js";
import { SLOTS, SLOT_BY_ID } from "../slots/configs.js";
import { avatar, playerCard, displayName, petView, weaponChip } from "../ui/profile.js";
import { worldMap } from "../ui/map.js";
import { openSlot } from "./slot.js";
import { openCasino } from "./casino.js";
import { locationShops } from "../data/catalogAdmin.js";
import { npcMapChance } from "../game/season.js";
import { npcInfo } from "./corners2.js";

// ------------------------------------------------------------ home
export function homePage() {
    const s = Store.season;
    const champ = Store.hall[0];
    return h("div.home",
        h("div.hero",
            h("div.hero-lights"),
            h("div.logo-big", "GAMBLERS"),
            h("p.tagline", "20명의 갬블러 · 하나의 왕좌 · 미션에 실패하면 탈락!"),
            h("div.row.center",
                h("a.btn.gold.huge", { href: "#/season" }, s && s.status !== "done" ? `▶ 시즌 ${s.number} 계속하기` : s ? `🏆 시즌 ${s.number} 결과 보기` : "🎰 새 시즌 시작"),
                h("a.btn.ghost.big", { href: "#/practice" }, "🎮 게임 연습실"))),
        h("div.home-grid",
            h("a.hcard", { href: "#/players" }, h("span", "🧑‍🤝‍🧑"), h("b", "플레이어"), h("small", `${Store.players.length}명 등록`)),
            h("a.hcard", { href: "#/map" }, h("span", "🗺️"), h("b", "월드 맵"), h("small", `카지노 ${LOCATIONS.length}곳`)),
            h("a.hcard", { href: "#/hall" }, h("span", "🏆"), h("b", "명예의 전당"), h("small", champ ? `최근 우승: ${champ.snapshot?.name || displayName(Store.player(champ.playerId))}` : "아직 우승자 없음")),
            h("a.hcard", { href: "#/guide" }, h("span", "📖"), h("b", "게임 방법"), h("small", "미션 · 펫 · 무기 · 상점")),
            h("a.hcard", { href: "#/admin" }, h("span", "⚙️"), h("b", "관리자"), h("small", Store.cloud ? (Store.user ? "클라우드 저장 중" : "로그인 필요") : "로컬 모드"))));
}

// ------------------------------------------------------------ players
export function playersPage() {
    let q = "", country = "";
    const list = h("div.player-grid");
    const render = () => {
        const s = Store.season;
        const items = Store.players.filter(p => (!country || p.country === country) && (!q || `${p.name_ko} ${p.player_name} ${p.job} ${p.handler}`.toLowerCase().includes(q)));
        list.replaceChildren(...items.map(p => {
            const rec = Store.record(p.id);
            const inSeason = s?.ps?.[p.id];
            return h("button.pgrid-card" + (inSeason ? ".in" : ""), { onclick: () => modal(playerCard(p.id, inSeason || null), { title: displayName(p), wide: true }) },
                avatar(p.id, 84), h("b", displayName(p)), h("small", p.player_name), h("small.muted", p.country),
                rec.avg ? h("span.badge.rec", `평균 ${rec.avg.toFixed(1)}위`) : null, inSeason ? h("span.badge.handler", "시즌 참가") : null);
        }));
    };
    const countries = [...new Set(Store.players.map(p => p.country))].filter(Boolean);
    render();
    return h("div.page",
        h("h2.page-title", `🧑‍🤝‍🧑 플레이어 ${Store.players.length}명`),
        h("div.filters",
            h("input", { placeholder: "이름 / 직업 / 전담자 검색", oninput: e => { q = e.target.value.toLowerCase(); render(); } }),
            h("select", { onchange: e => { country = e.target.value; render(); } }, h("option", { value: "" }, "전체 국가"), countries.map(c => h("option", { value: c }, c)))),
        list);
}

// ------------------------------------------------------------ hall of fame
export function hallPage() {
    const rows = Store.hall;
    return h("div.page.hall",
        h("h2.page-title", "🏆 명예의 전당"),
        rows.length ? h("div.hall-grid", rows.map(r => {
            const sn = r.snapshot || {};
            const p = Store.player(r.playerId);
            return h("div.hall-card",
                h("div.hall-season", `SEASON ${r.season}`),
                h("div.hall-crown", "👑"),
                avatar(r.playerId, 140),
                h("b", sn.name || displayName(p)), h("small", sn.player_name || p?.player_name || ""),
                h("div.hall-stats", h("span", `💰 ${fmt(sn.money)} G`), h("span", `💎 ${fmt(sn.points)} P`)),
                sn.pet ? petView(sn.pet, sn.petEffect, 56) : null,
                sn.weapons?.length ? h("div.wlist.small", sn.weapons.map(weaponChip)) : null,
                h("small.muted", r.at ? new Date(r.at).toLocaleDateString() : ""));
        })) : h("div.center-card", h("p", "아직 우승자가 없습니다. 첫 시즌의 왕좌는 누구에게?")));
}

// ------------------------------------------------------------ map
const reqText = r => !r ? "누구나 입장 가능"
    : r.points != null ? `🔒 ${r.points} 포인트 이상 보유 시 입장`
    : r.country ? `🔒 ${r.country} 국적 전용 (맵권으로 입장 가능)`
    : r.fee != null ? `💰 입장료 ${fmt(r.fee)}G`
    : r.feePts != null ? `💎 입장료 ${r.feePts}P`
    : r.random ? `🎲 랜덤 입장 (50%)${r.races?.length ? ` · ${r.races.join(", ")} 종족은 프리패스` : ""}` : "누구나 입장 가능";
const EARN_NAME = { blood: "헌혈", labor: "노동", poop: "똥", sell: "팔기", music: "음악 감상", survival: "서바이벌" };

export function mapPage() {
    let region = REGIONS.find(r => !r.off)?.id || "cl1";
    const info = h("div.loc-info", h("p.muted", "핀을 눌러 카지노 정보를 확인하세요."));
    const tabs = h("div.tabs.region-tabs"), holder = h("div.map-holder");
    const corners = l => [...(l.job ? ["💼 직업"] : []), ...(l.beg ? ["🥺 구걸"] : []), ...(l.discount ? ["🏷️ 할인 상점"] : []), ...earnKinds(l).map(k => "💪 " + EARN_NAME[k])];
    const pick = l => info.replaceChildren(
        h("h3", l.emoji, " ", l.name),
        h("p", reqText(l.req)),
        h("p.npc-line", `👹 NPC 출몰 확률 (라운드마다 무작위): ${Math.round(npcMapChance(l) * 100)}% `, h("button.btn.small.ghost", { onclick: () => npcInfo(l) }, "NPC 정보")),
        h("h4", "슬롯"), h("ul", (l.slots || []).filter(id => SLOT_BY_ID[id] && !SLOT_BY_ID[id].off).map(id => h("li", `${SLOT_BY_ID[id].name} — ${SLOT_BY_ID[id].brand}`))),
        h("h4", "카지노 게임"), h("ul", (l.casino || []).filter(id => CASINO_BY_ID[id] && !CASINO_BY_ID[id].off).map(id => h("li", `${CASINO_BY_ID[id].icon} ${CASINO_BY_ID[id].name}`))),
        h("h4", "상점"), h("ul", locationShops(l).map(id => h("li", `${SHOPS[id].icon} ${SHOPS[id].name}`))),
        ...(corners(l).length ? [h("h4", "코너"), h("ul", corners(l).map(c => h("li", c)))] : []));
    const draw = () => {
        const R = REGION_BY_ID[region];
        tabs.replaceChildren(...REGIONS.filter(r => !r.off).map(r => h("button.tab" + (r.id === region ? ".on" : ""), { onclick: () => { region = r.id; draw(); } }, `${r.emoji} ${r.name}`)));
        holder.replaceChildren(
            ...(R?.need ? [h("p.notice", `${R.emoji} ${R.name}에 들어가려면 ${ITEM_BY_ID[R.need]?.emoji || ""} ${ITEM_BY_ID[R.need]?.name || R.need}이(가) 필요합니다 (입장 시 소모).`)] : []),
            worldMap({ region, onPick: pick }).el);
        info.replaceChildren(h("p.muted", "핀을 눌러 카지노 정보를 확인하세요."));
    };
    draw();
    return h("div.page", h("h2.page-title", "🗺️ 월드 맵"), tabs, h("div.map-page", holder, info));
}

// ------------------------------------------------------------ practice room
export function practicePage() {
    let money = 200000;
    const layer = h("div.practice-layer");
    const ctx = kind => ({
        pid: null, test: true, luck: { win: 0, bonus: 0 },
        money: () => money,
        canPlay: () => ({ ok: true }),
        record(bet, win, points, extra = {}) { if (extra.pending) money -= bet; if (extra.settle) money += win; },
        close() { layer.replaceChildren(); list.hidden = false; }
    });
    const open = (kind, id) => { list.hidden = true; layer.replaceChildren(kind === "slot" ? openSlot(SLOT_BY_ID[id], ctx()) : openCasino(CASINO_BY_ID[id], ctx())); };
    const list = h("div",
        h("p.muted", "시즌과 무관한 연습용 지갑(200,000G)으로 모든 게임을 테스트합니다. 프로그레시브 잭팟은 실제로 쌓입니다."),
        h("h3", "🎰 슬롯"),
        h("div.game-list", SLOTS.map(c => h("button.gcard.slot", { style: { "--bg": c.theme.bg, "--accent": c.theme.accent }, onclick: () => open("slot", c.id) },
            h("div.gc-kind", `${c.off ? "🚫 숨김 · " : ""}${c.progressive === false ? "CLASSIC" : "PROGRESSIVE"} · ${LOCATIONS.find(l => l.slots.includes(c.id))?.name || ""}`), h("div.gc-name", c.name), h("div.gc-brand", c.brand)))),
        h("h3", "🃏 카지노 게임"),
        h("div.game-list", CASINO_GAMES.map(g => h("button.gcard.casino", { onclick: () => open("casino", g.id) },
            h("div.gc-kind", `${g.off ? "🚫 숨김 · " : ""}RTP ${(gameRtp(g) * 100).toFixed(1)}% · ${LOCATIONS.find(l => l.casino.includes(g.id))?.name || ""}`), h("div.gc-ico", g.icon), h("div.gc-name", g.name)))));
    return h("div.page", h("h2.page-title", "🎮 게임 연습실"), list, layer);
}

// ------------------------------------------------------------ guide
export function guidePage() {
    const tierBlocks = [0, 1, 2, 3, 4].map(t => h("div.tier-block", h("b.tier.t" + t, `난이도 ${TIERS[t]}`), h("ul", MISSIONS.filter(m => m.tier === t).map(m => h("li", m.text)))));
    return h("div.page.guide",
        h("h2.page-title", "📖 게임 방법"),
        h("div.guide-sec", h("h3", "진행"), h("ol",
            h("li", "관리자가 SPIN을 눌러 등록된 플레이어 중 20명을 슬롯 릴로 선발합니다 (SKIP = 즉시 20명)."),
            h("li", "라운드마다 공통 미션이 랜덤으로 뽑힙니다. 탈락자가 늘수록 미션 난이도가 최하 → 최상으로 올라갑니다."),
            h("li", `시즌이 시작될 때 참가자 전원이 시작 금액 ${fmt(CONFIG.START_MONEY)}G를 한 번 받습니다 (라운드마다 지급되지 않음).`),
            h("li", `생존자 전원이 차례대로 ${CONFIG.TURN_SECONDS / 60}분씩 플레이합니다. 턴 시작 시 먼저 지역 룰렛(하늘나라·우주·카지노 랜드 1/2·판타지·지하세계·스푸키·심해·북극)을 돌리고, 그 지역 안에서 맵 룰렛으로 카지노가 정해집니다. 하늘나라·우주·심해는 날개·우주복·산소통이 있어야 하며 입장 시 소모됩니다.`),
            h("li", "맵마다 입장 조건이 있습니다: 국적 전용 · 랜덤 입장(거절되면 다른 맵을 다시 뽑음) · 입장료(G/P) · 포인트 보유. 맵권을 쓰면 룰렛 없이 그 맵으로 바로 순간이동합니다 (하늘·우주 50,000G, 나머지 45,000G)."),
            h("li", "슬롯 스핀·카지노 플레이마다 아주 낮은 확률(슬롯 약 0.8%, 카지노 약 1%)로 알파벳 카드(G·A·M·B·L·E·R·S)를 얻습니다. 카드 미션과 맵 입장에 1회 사용할 수 있습니다."),
            h("li", "맵에 따라 직업 코너·돈벌기(음악·서바이벌 포함)·구걸·할인 상점이 있고, NPC가 출몰하는 맵에서는 플레이 중 NPC가 갑자기 습격할 수 있습니다."),
            h("li", "상점은 라운드당 구매 제한이 있습니다: 무기 1 · 아이템 5 · 펫/프레임 1 · 그 외 1."),
            h("li", "미션에 실패한 플레이어들이 탈락 후보가 되고, 탈락 릴로 한 명이 탈락합니다 (모두 성공 시 손익 하위 3명이 후보)."),
            h("li", `라운드마다 플레이어당 슬롯 ${CONFIG.ROUND_SLOT_SPINS}회 · 카지노게임 ${CONFIG.ROUND_CASINO_PLAYS}회까지 (일반 상점의 추가권으로 늘릴 수 있음). 무료 스핀은 횟수에 포함되지 않습니다.`),
            h("li", "보유 골드가 10,000G 이하가 되면 대출(럭키대부 10%/라운드·5라운드, 크레이지대부 20%/라운드·3라운드)을 받을 수 있습니다. 대출금은 게임에만 쓸 수 있고, 기한 안에 못 갚으면 다음 라운드에 사망! 생존자 5명 이하에서는 대출 불가."),
            h("li", "최종 2인은 무기 배틀! 보유금액이 많은 쪽이 선공 (같으면 포인트). 승자는 명예의 전당에 등극합니다."))),
        h("div.guide-sec", h("h3", "미션"), h("div.tiers", tierBlocks)),
        h("div.guide-sec", h("h3", "펫 & 펫효과 (승률 / 보너스 확률 증가)"),
            h("p.muted", "일반펫·일반효과: 돈을 딸 확률만 +5~15%. 특수펫·특수효과: 돈을 딸 확률 + 보너스 확률까지. 펫+효과 합산 최대 +30%. 효과는 펫이 있을 때만 적용."),
            h("div.pet-grid", PETS.map(p => h("div.pet-cell", petView(p.id, null, 60), h("small", p.name), h("b", `${p.kind === "special" ? "특수" : "일반"} +${p.boost}%`))))),
        h("div.guide-sec", h("h3", "무기 (최대 6개, 배틀 시 랜덤 사용)"), h("div.wlist", WEAPONS.map(w => weaponChip(w.id)), weaponChip("basic"))),
        h("div.guide-sec", h("h3", "포인트"), h("p", "슬롯의 P 아이콘(개수에 따라 1/3/6/10/20P — 최저 베팅 약 1.5%, 최고 베팅 약 5%로 베팅이 높을수록 잘 나옴)과 카지노 게임(랜덤 1~10P)으로 획득. 포인트 미션, Twins Wins(100P)·Dung Dung(50P) 입장, 포인트 상점에서 사용합니다.")));
}

// ------------------------------------------------------------ admin
export function adminPage() {
    const status = Store.cloud ? (Store.user ? `✅ 클라우드 연결됨 · ${esc(Store.user.email)}` : "☁️ 클라우드 연결됨 · 읽기 전용 (로그인하면 저장)") : "💾 로컬 모드 — js/config.js에 Supabase URL/KEY를 넣으면 클라우드 저장";
    const email = h("input", { type: "email", placeholder: "관리자 이메일", autocomplete: "username" });
    const pw = h("input", { type: "password", placeholder: "비밀번호", autocomplete: "current-password" });
    let turnSec = +(localStorage.getItem("gamblers.turnSeconds") || CONFIG.TURN_SECONDS);
    return h("div.page.admin",
        h("h2.page-title", "⚙️ 관리자"),
        h("div.admin-card", h("h3", "저장소"), h("p", status),
            Store.cloud && !Store.user ? h("form.login", { onsubmit: async e => { e.preventDefault(); try { await Store.login(email.value, pw.value); toast("로그인 성공", "ok"); location.reload(); } catch (err) { toast(err.message, "error"); } } }, email, pw, h("button.btn.gold", "로그인")) : null,
            Store.user ? h("button.btn.ghost", { onclick: async () => { await Store.logout(); location.reload(); } }, "로그아웃") : null),
        h("div.admin-card", h("h3", "🧑‍🤝‍🧑 플레이어 관리"), h("p.muted", `플레이어 정보 수정, 새 플레이어 생성, 활성/비활성 전환 (현재 ${Store.players.length}명 활성).`), h("a.btn.gold", { href: "#/admin-players" }, "관리하기")),
        h("div.admin-card", h("h3", "🛒 상품·상점 관리"), h("p.muted", "무기·아이템·펫·펫효과·프레임·프레임효과의 능력치, 판매 상점, 가격, 판매 카지노를 조정하고 새 상품을 추가합니다."), h("a.btn.gold", { href: "#/admin-catalog" }, "관리하기")),
        h("div.admin-card", h("h3", "🎰 슬롯·카지노게임 관리"), h("p.muted", "슬롯머신의 RTP(배당 배율)·보너스 확률 조정, 보너스 삭제, RTP 시뮬레이션, 카지노게임 RTP·노출 여부·최대 당첨금을 관리합니다."), h("a.btn.gold", { href: "#/admin-games" }, "관리하기")),
        h("div.admin-card", h("h3", "🌍 지역·맵 관리"), h("p.muted", "지역·맵 켜기/끄기, 이름·입장 조건·소속 지역 변경, 맵별 슬롯/카지노 게임 배치와 코너(직업·구걸·할인·NPC·돈벌기)를 관리합니다."), h("a.btn.gold", { href: "#/admin-maps" }, "관리하기")),
        h("div.admin-card", h("h3", "🎰 슬롯게임 생성기"), h("p.muted", "새 슬롯의 사양을 입력하면 Claude에게 전달할 프롬프트를 만들어 줍니다."), h("a.btn.gold", { href: "#/slotgen" }, "열기")),
        h("div.admin-card", h("h3", "턴 시간"),
            h("p.muted", "기본 10분(600초). 리허설용으로 줄일 수 있습니다 (이 브라우저에만 적용)."),
            h("div.row", h("input", { type: "number", min: 30, step: 30, value: turnSec, onchange: e => { localStorage.setItem("gamblers.turnSeconds", e.target.value); CONFIG.TURN_SECONDS = +e.target.value; toast("저장됨", "ok"); } }), h("span", "초"))),
        h("div.admin-card", h("h3", "사운드"), h("button.btn.ghost", { onclick: e => { const m = Sound.toggle(); e.target.textContent = m ? "🔇 꺼짐" : "🔊 켜짐"; } }, Sound.muted ? "🔇 꺼짐" : "🔊 켜짐")),
        h("div.admin-card", h("h3", "시즌"),
            Store.season ? h("button.btn.red", { onclick: async () => { if (await confirmBox(`진행 중인 시즌 ${Store.season.number}을(를) 중단하고 삭제할까요? (되돌릴 수 없음)`)) { Store.season.status = "done"; Store.season.aborted = true; await Store.pushSeason(); Store.endSeasonLocal(); toast("시즌을 중단했습니다", "ok"); location.hash = "#/"; } } }, "진행 중인 시즌 중단") : h("p.muted", "진행 중인 시즌 없음"),
            !Store.cloud ? h("button.btn.ghost", { onclick: async () => { if (await confirmBox("이 브라우저의 모든 로컬 데이터(시즌·전적·명예의 전당·잭팟)를 지울까요?")) Store.resetAllLocal(); } }, "로컬 데이터 초기화") : null),
        h("div.admin-card", h("h3", "프로그레시브 잭팟 현황"),
            h("table.jp-table", h("tr", h("th", "게임"), h("th", "MAJOR"), h("th", "GRAND")),
                SLOTS.filter(c => c.progressive !== false).map(c => h("tr", h("td", c.name), h("td", fmt(Store.pool(c.id).MAJOR)), h("td", fmt(Store.pool(c.id).GRAND)))))));
}
