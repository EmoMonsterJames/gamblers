// =====================================================================
// 2026-11 special maps — the screens (state: game/travel.js)
//   ✈️ Airport gates (🎫 ticket counter · 📋 accident reports · 🛎️ service · 🛋️ lounge) · boarding · the plane (🥤 food · 💆 VIP spa · crash)
//   🛗 Elevator (panel · floors · 3F shop · 6F floor passes · 7F exit / rescue · 9F flood)
//   🏕️ Campsite (campers · hiding place · Masked Killer · Slasher Body Count) · 🪆 Doll Factory (thunder · dolls · blackout · jack-in-the-box)
//   💻 Cyber Town glitches · 🍀 Good Luck Casino jobs · 🔪 Self-Harm · 🧩 map-only NPC moves
// seasonView.js calls: tabs · override · gameFilter · head · fx · endCheck · beforeEnd · arriveHook · afterRender · lockLabel
// =====================================================================
import { h, sleep, fmt, fmtTime } from "../core/util.js";
import { Sound, tone, noise } from "../core/sound.js";
import { toast, confetti, banner, confirmBox, modal, Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { LOC_BY_ID, ITEM_BY_ID, SHOPS, WEAPON_BY_ID } from "../data/catalog.js";
import * as G from "../game/season.js";
import * as TR from "../game/travel.js";
import * as SO from "../game/social.js";
import * as LF from "../game/life.js";
import * as LD from "../data/life.js";
import * as M from "../emomon/game.js";
import { applyHarm, extraLocks } from "../game/extra.js";
import { account } from "../game/bank.js";
import { avatar, displayName } from "../ui/profile.js";
import { customNpc } from "./corners2.js";
import { canPay, pay, priceLabel, checkGoods, giveGoods, art as shopArt, desc as shopDesc } from "./shop.js";
import { pointManiaView } from "./pointMania.js";

TR.setIntimacyFn(SO.intimacy);
const S = () => G.S();
const ps_ = pid => S()?.ps?.[pid];
const nm = pid => displayName(Store.player(pid)) || G.name(pid);
const rnd = () => Math.random();
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pickOne = a => a[Math.floor(rnd() * a.length)];
const r100 = n => Math.round(n / 100) * 100;
const wallet = ps => (ps?.money || 0) + (ps?.loanGold || 0);
const payGold = (ps, g) => { const fromLoan = Math.min(ps.loanGold || 0, g); ps.loanGold = (ps.loanGold || 0) - fromLoan; ps.money -= g - fromLoan; };
const pic = (pid, size = 56, extra = {}) => Store.player(pid) ? avatar(pid, size, { effect: false, ...extra }) : h("div.sm-nopic", "👤");
const alertPop = (title, body, { ms = 0, cls = "", btn = "확인" } = {}) => new Promise(res => {
    const m = modal(h("div.sm-pop " + cls, body, ms ? null : h("div.row.center", h("button.btn.gold.big", { onclick: () => m.close() }, btn))), { title, closable: false });
    if (ms) setTimeout(() => m.close(), ms);
    m.closed.then(res);
});
const hpCap = () => CONFIG.START_HP || 100;
const heal = (pid, n) => { const ps = ps_(pid); const before = ps.hp; ps.hp = Math.min(hpCap(), ps.hp + n); return ps.hp - before; };
const subOf = loc => loc?.sub || null;
const isFloor = loc => subOf(loc) === "elevator";
const isSpot = loc => subOf(loc) === "campsite";

// ================================================================ tabs (inserted before 🎒 인벤토리)
export function tabs(loc, t, pid) {
    const out = [];
    if (loc.gate) {
        out.push(["x:ticket", "🎫 티켓 카운터"], ["x:reports", "📋 사고 접수"]);
        if (loc.gate === 3) out.push(["x:lounge", "🛋️ 공항 라운지"]); else out.push(["x:service", "🛎️ 공항 서비스"]);
    }
    if (loc.plane) { out.push(["x:planefood", "🥤 기내식"]); if (TR.isVip(pid)) out.push(["x:spa", "💆 VIP 스파"]); }
    if (isFloor(loc)) {
        out.unshift(["x:panel", "🛗 계기판"]);
        if (loc.elevShop) out.push(["x:elevshop", "🛗 특별상점"]);
        if (loc.elevWeapons) out.push(["x:elevweapons", "⚔️ 무기상점"]);
        if (loc.elevPassShop) out.push(["x:passshop", "🎫 엘리베이터 상점"]);
        if (loc.elevExit) out.push(["x:exit", "🚪 탈출"], ["x:rescue", "🆘 구제"]);
    }
    if (isSpot(loc) && t.camp) out.push(["x:camp", "🏕️ 캠퍼 현황"]);
    if (loc.pointMania) out.push(["x:pointmania", "💎 Point Mania"]);
    return out;
}
// the first tab of a special map
export const firstTab = loc => isFloor(loc) ? "x:panel" : loc.gate ? "x:ticket" : null;

// ✈️ economy seats: only the plane's own machine + game (VIP 1등석: every game on board)
export function gameFilter(loc, pid, ids) {
    if (!loc?.plane || !loc.vipOnly?.length || TR.isVip(pid)) return ids;
    return ids.filter(id => !loc.vipOnly.includes(id));
}

// ================================================================ corners
// c: { pid, t, loc, refresh, tabBody, render, finish, payout, kill }
export function corner(id, c) {
    const { pid, t, loc } = c;
    switch (id) {
        case "x:ticket": return ticketView(c);
        case "x:reports": return reportsView();
        case "x:service": return serviceView(c);
        case "x:lounge": return loungeView(c);
        case "x:planefood": return planeFoodView(c);
        case "x:spa": return spaView(c);
        case "x:panel": return panelView(c);
        case "x:elevshop": return elevShopView(c);
        case "x:elevweapons": return elevWeaponView(c);
        case "x:passshop": return passShopView(c);
        case "x:exit": return exitView(c);
        case "x:rescue": return rescueView(c);
        case "x:camp": return campView(c);
        case "x:pointmania": return pointManiaView(pid, { turn: t, onChange: c.refresh });
    }
    return null;
}
// a normal corner replaced or changed here (🍀 jobs · 💻 glitches) → content, or null to show the normal corner
export function override(id, c) {
    const { loc } = c;
    if (id === "job" && loc.luckJobs) return luckJobsView(c);
    if (loc.glitch) return glitchCorner(id, c);
    return null;
}

// ================================================================ ✈️ AIRPORT
const legIcons = legs => h("span.sm-legs", (legs || []).map(l => h("span.sm-leg.k-" + l.k, { title: TR.legLabel(l) }, l.k === "plane" ? "✈️" : LOC_BY_ID[l.loc]?.emoji || "📍")));
const itineraryPop = (pid, legs, extra = "") => alertPop("🧾 여정", h("div.sm-itin", h("div.row", pic(pid, 48), h("b", nm(pid)), extra ? h("small", extra) : null),
    h("ol.sm-itin-list", (legs || []).map(l => h("li", TR.legLabel(l))))));
function ticketView(c) {
    const { pid, loc } = c, ps = ps_(pid);
    const gate = loc.gate, wrap = h("div.sm-tickets");
    const render = () => {
        const mine = TR.ticketOf(pid);
        let vip = false;
        const vipBox = h("label.sm-vip", h("input", { type: "checkbox", onchange: e => { vip = e.target.checked; } }), ` 👑 VIP 1등석 (+${fmt(TR.VIP_FEE)}G · 무료 티켓 제외)`);
        wrap.replaceChildren(
            h("div.sm-gatehead", h("b", `🛫 Airport Gate ${gate} · 티켓 카운터`), h("small", `탑승객 ${TR.waitingList().length} / ${TR.PAX_MAX}명 대기 중 · 티켓은 1번만 구입 (변경은 🛎️ 공항 서비스 · Gate 1·2)`)),
            mine ? h("div.sm-myticket", h("b", "🎫 내 티켓: "), TR.ticketLabel(mine.t), mine.vip ? h("span.sm-vipbadge", "👑 VIP") : null, " ", legIcons(mine.t.legs)) :
                h("p.notice.warn", `⚠️ 티켓을 구입하지 않고 턴이 끝나면 무료 티켓 (${TR.ticketLabel(TR.defaultTicket(gate))})이 자동으로 적용됩니다.`),
            mine ? null : vipBox,
            h("div.sm-ticket-list", TR.TICKETS[gate].map(tk => {
                const cost = TR.ticketPrice(tk);
                const ok = !mine && TR.canBuyTicket(pid, tk).ok;
                return h("div.sm-ticket" + (tk.free ? ".free" : "") + (mine?.id === tk.id ? ".mine" : ""),
                    h("div.sm-t-to", LOC_BY_ID[tk.to]?.emoji || "📍", " ", h("b", LOC_BY_ID[tk.to]?.name || tk.to), h("small.sm-kind", TR.ticketKind(tk))),
                    tk.via ? h("small", `경유: ${TR.locName(tk.via)}`) : null,
                    h("div.sm-t-legs", legIcons(tk.legs), h("small", ` 비행 ${tk.legs.filter(l => l.k === "plane").length}라운드`)),
                    h("div.sm-t-price", tk.free ? "무료 (기본 티켓)" : cost.pts ? `${cost.pts} P` : `${fmt(cost.gold)} G`),
                    h("button.btn.small" + (ok ? ".gold" : ".ghost"), { disabled: !ok, onclick: async () => {
                        const v = vip && !tk.free;
                        if (!(await confirmBox(`🎫 ${TR.ticketLabel(tk)}\n${TR.legsText(tk.legs)}\n가격: ${cost.pts ? `${cost.pts}P` : `${fmt(cost.gold)}G`}${v ? ` + VIP ${fmt(TR.VIP_FEE)}G` : ""}\n구입할까요? (1번만 구입 가능)`, "구입", "취소"))) return;
                        if (v && wallet(ps) < cost.gold + TR.VIP_FEE) return toast("VIP 요금까지 낼 골드가 부족합니다", "warn");
                        if (!TR.buyTicket(pid, tk.id, v)) return toast(TR.canBuyTicket(pid, tk).why || "구입할 수 없습니다", "warn");
                        Sound.cash(); toast(`🎫 티켓 구입 완료!${v ? " 👑 VIP 1등석" : ""}`, "ok"); c.refresh(); render();
                    } }, mine?.id === tk.id ? "보유" : "구입"));
            })));
    };
    render();
    return wrap;
}
function crashInfo() {
    return alertPop("ℹ️ 비행기 추락 확률", h("div.sm-info",
        h("table.sm-table", h("tr", h("th", "날씨"), h("th", "추락 확률")),
            Object.entries(TR.CRASH_WX).map(([w, p]) => h("tr", h("td", `${LD.WEATHERS?.[w]?.emoji || ""} ${{ sun: "해", rain: "비", storm: "폭우", snow: "눈", blizzard: "폭설", heat: "폭염", hail: "우박" }[w]}`), h("td", `${Math.round(p * 100)}%`)))),
        h("p", `+ 날씨와 상관없는 비행기 결함 ${Math.round(TR.CRASH_FAULT * 100)}% · 탑승객이 많을수록 추락 확률이 높아집니다 (6명 탑승 = 100%, 1명 = 약 58%)`),
        h("table.sm-table", h("tr", h("th", "추락 시 결과"), h("th", "확률")), TR.CRASH_FATE.map(f => h("tr", h("td", f.label), h("td", `${f.w}%`)))),
        h("p", `🌪️ Air 타입 이모몬스터 보유: 생존 확률 +${Math.round(TR.AIR_BONUS * 100)}% · 생존자: HP 절반, 목적지 → 🏝️ Island (콤보랜드)`),
        h("p.muted", "사망 순서(순위): 다음 도착지가 경유지인 사람 → 최종 목적지인 사람 순, 같으면 도착 맵 번호가 낮은 사람 → 플레이 순서가 빠른 사람이 먼저(낮은 순위)")));
}
function reportsView() {
    const list = TR.airReports();
    return h("div.sm-reports",
        h("div.sm-gatehead", h("b", "📋 사고 접수 코너"), h("button.btn.small.ghost", { onclick: crashInfo }, "ℹ️ 추락 확률 정보")),
        list.length ? list.map(r => h("div.sm-report",
            h("div.sm-r-head", h("b", `💥 시즌 ${r.season} · ${r.round}라운드`), h("small", new Date(r.at).toLocaleString()), h("small", ` · ${r.reason}`), h("small", ` · ${(TR.CRASH_FATE.find(f => f.id === r.fate) || {}).label || ""}`)),
            h("div.sm-r-pax", r.pax.map(p => h("div.sm-r-p.f-" + p.fate, { onclick: () => itineraryPop(p.pid, p.legs, `Gate ${p.gate}${p.vip ? " · 👑 VIP" : ""}`) },
                pic(p.pid, 44), h("small", nm(p.pid)), h("b", p.fate === "dead" ? "☠️ 사망" : p.fate === "out" ? "❌ 라운드 탈락" : "🩹 생존"), p.air ? h("small", "🌪️ Air") : null, legIcons(p.legs))))))
            : h("p.notice", "접수된 사고가 없습니다. 안전한 비행 되세요 ✈️"));
}
function serviceView(c) {
    const { pid, loc } = c, wrap = h("div.sm-service");
    const render = () => {
        const mine = TR.ticketOf(pid);
        if (!mine) { wrap.replaceChildren(h("p.notice", "🛎️ 먼저 🎫 티켓 카운터에서 티켓을 구입하세요.")); return; }
        wrap.replaceChildren(
            h("div.sm-myticket", h("b", "🎫 내 티켓: "), TR.ticketLabel(mine.t), mine.vip ? h("span.sm-vipbadge", "👑 VIP") : null),
            h("h4", `🔁 티켓 변경 (변경료 ${fmt(TR.CHANGE_FEE)}G + 새 티켓 가격 · 기존 티켓 환불 없음)`),
            h("div.sm-ticket-list.compact", TR.TICKETS[loc.gate].filter(tk => tk.id !== mine.id).map(tk => {
                const cost = TR.ticketPrice(tk);
                return h("button.btn.small.ghost", { onclick: async () => {
                    if (!(await confirmBox(`${TR.ticketLabel(tk)}(으)로 변경할까요?\n${fmt(TR.CHANGE_FEE + cost.gold)}G${cost.pts ? ` + ${cost.pts}P` : ""}`, "변경", "취소"))) return;
                    const r = TR.changeTicket(pid, tk.id);
                    if (!r.ok) return toast(r.why, "warn");
                    Sound.cash(); toast(`🔁 티켓 변경 완료${r.vipLost ? " (무료 티켓이라 VIP 해제)" : ""}`, "ok"); c.refresh(); render();
                } }, `${LOC_BY_ID[tk.to]?.emoji || ""} ${LOC_BY_ID[tk.to]?.name} ${TR.ticketKind(tk)} · ${tk.free ? "무료" : cost.pts ? cost.pts + "P" : fmt(cost.gold) + "G"}`);
            })),
            h("h4", "👑 좌석 업그레이드"),
            h("button.btn.gold", { disabled: mine.vip || mine.t.free, onclick: () => { const r = TR.upgradeSeat(pid); if (!r.ok) return toast(r.why, "warn"); Sound.bonus(); toast("👑 VIP 1등석으로 업그레이드!", "ok"); c.refresh(); render(); } },
                mine.vip ? "이미 VIP 1등석" : mine.t.free ? "무료 티켓은 업그레이드 불가" : `VIP 1등석으로 업그레이드 (${fmt(TR.UPGRADE_FEE)}G)`));
    };
    render();
    return wrap;
}
function loungeView(c) {
    const { pid } = c;
    return h("div.sm-lounge",
        h("p", `🛋️ 공항 라운지 — ${fmt(TR.LOUNGE_FEE)}G를 내면 아래 중 하나가 랜덤으로 나옵니다.`),
        h("ul", TR.LOUNGE.map(l => h("li", `${l.emoji} ${l.name} — ${l.desc}`))),
        h("button.btn.gold.big", { onclick: async () => {
            const r = TR.loungeTry(pid);
            if (!r.ok) return toast(r.why, "warn");
            const hold = Activity.hold();
            try {
                Sound.tease(); await banner(`${r.pick.emoji} ${r.pick.name}`, 1300, "loc");
                let line = "";
                if (r.pick.id === "massage") line = `💆 시원하다! HP FULL (+${Math.round(r.hp)})`;
                if (r.pick.id === "food") { const hp = heal(pid, 30); const f = LF.addFood(pid, 30); line = `🍱 HP +${Math.round(hp)} · 식량 +${f}`; }
                if (r.pick.id === "drink") { const e = LF.eat(pid, r.food, "공항 라운지"); line = `${LD.FOOD_BY_ID?.[r.food]?.emoji || "🥤"} ${LD.FOOD_BY_ID?.[r.food]?.name || r.food}을(를) 마셨다! ${e.ok ? `식량 ${e.got >= 0 ? "+" : ""}${e.got}` : e.why}`; }
                if (r.pick.id === "spa") { const list = M.mons(pid) || []; for (const m of list) m.hp = M.maxHp(m); line = list.length ? `🐾 이모몬스터 ${list.length}마리 모두 FULL HP!` : "🐾 이모몬스터가 없어서 아무 효과가 없었다…"; document.dispatchEvent(new Event("emo:change")); }
                Store.saveSeason(true); Sound.coin(); toast(line, "ok", 3500);
            } finally { hold(); }
            c.refresh();
        } }, `🛋️ 라운지 이용 (${fmt(TR.LOUNGE_FEE)}G)`));
}

// ---- gate end of turn: waiting popup / take-off (the 6th passenger sees everybody board)
async function gateEnd(pid, loc) {
    const r = TR.gateTurnEnd(pid, loc.gate);
    if (!r) return;
    if (r.waited != null) {
        Sound.chime();
        await alertPop("🛫 게이트 대기", h("div.sm-wait", h("div.sm-wait-ico", "🧳"), h("p", h("b", "탑승객이 모두 도착할때까지 게이트에서 대기해주세요")), h("small", `탑승객 ${r.waited} / ${r.target}명 · 다음 라운드도 Gate ${loc.gate}에서 시작합니다`)), { ms: 3200 });
    } else if (r.depart) await boarding(r.depart);
}
export async function boarding(pax) {
    const lane = h("div.sm-board-lane");
    const plane = h("div.sm-board-plane", "✈️");
    const box = h("div.sm-board", h("div.sm-board-sky"), plane, lane, h("div.sm-board-cap", "🛫 탑승객이 모두 도착했습니다! 탑승을 시작합니다"));
    const m = modal(box, { title: "✈️ 탑승", closable: false, wide: true });
    Sound.chime();
    for (const pid of pax) {
        const vip = TR.isVip(pid);
        const walker = h("div.sm-walker" + (vip ? ".vip" : ""), vip ? h("div.sm-carpet") : null, pic(pid, 54), h("small", (vip ? "👑 " : "") + nm(pid)));
        lane.append(walker);
        await sleep(30); walker.classList.add("go");
        vip ? Sound.bonus() : Sound.click();
        await sleep(vip ? 1300 : 800);
    }
    await sleep(700);
    plane.classList.add("off"); Sound.whoosh(); noise(1.4, 0.08);
    box.querySelector(".sm-board-cap").textContent = "🛫 이륙! 즐거운 여행 되세요 — Airport는 이번 시즌 동안 폐쇄됩니다";
    await sleep(2200);
    m.close();
}

// ================================================================ ✈️ THE PLANE
function planeFoodView(c) {
    const { pid, t } = c, vip = TR.isVip(pid), ps = ps_(pid);
    const wrap = h("div.sm-planefood");
    const got = (t.planeFood ||= {});
    const eatNow = (fid, how) => { const r = LF.eat(pid, fid, how); if (!r.ok) return toast(r.why, "warn"); Sound.coin(); toast(`${LD.FOOD_BY_ID?.[fid]?.emoji || "🍽️"} ${LD.FOOD_BY_ID?.[fid]?.name || fid} — 식량 ${r.got >= 0 ? "+" : ""}${r.got}${r.hp ? ` · HP +${Math.round(r.hp)}` : ""}`, "ok"); Store.saveSeason(); c.refresh(); render(); };
    const render = () => wrap.replaceChildren(
        h("div.sm-gatehead", h("b", vip ? "👑 VIP 1등석 기내식" : "🥤 이코노미 기내식")),
        h("div.sm-food-row",
            h("button.btn" + (got.water ? ".ghost" : ".gold"), { disabled: got.water, onclick: () => { got.water = true; eatNow("water", "기내 무료"); } }, got.water ? "💧 물 (받음)" : "💧 무료 물 받기"),
            vip ? h("button.btn" + (got.ice ? ".ghost" : ".gold"), { disabled: got.ice, onclick: () => { got.ice = true; eatNow("icecream", "VIP 무료"); } }, got.ice ? "🍦 아이스크림 (받음)" : "🍦 무료 아이스크림 받기") : null,
            h("button.btn.gold", { onclick: () => {
                if (wallet(ps) < 3000) return toast("골드가 부족합니다 (3,000G)", "warn");
                payGold(ps, 3000);
                eatNow(vip ? pickOne(["kkorong", "minichicken", "pinenoodle"]) : "bread", "기내식 3,000G");
            } }, vip ? "🍱 VIP 기내식 랜덤 (꼬롱살 · 미니닭고기 · 솔잎국수) 3,000G" : "🍞 빵 3,000G")));
    render();
    return wrap;
}
function spaView(c) {
    const { pid, t } = c;
    if (t.planeSpa) return h("p.notice", "💆 이번 비행에서 이미 VIP 스파를 이용했습니다.");
    const btn = h("button.btn.gold.big", { onclick: async () => {
        btn.disabled = true;
        const hold = Activity.hold();
        const was = t.running;
        try {
            const count = h("b.sm-count", "10");
            const m = modal(h("div.sm-spa", h("div.sm-spa-ico", "💆"), h("p", "VIP 스파에서 휴식 중…"), count), { title: "💆 VIP 스파", closable: false });
            for (let i = 10; i > 0; i--) { count.textContent = i; Sound.click(); await sleep(1000); }
            m.close();
            t.planeSpa = true;
            const hp = heal(pid, rint(10, 30));
            Store.saveSeason(true); Sound.bonus(); toast(`💆 개운하다! HP +${Math.round(hp)}`, "ok");
        } finally { hold(); t.running = was; }
        c.refresh(); c.tabBody("x:spa");
    } }, "💆 VIP 스파 이용 (10초 · HP +10~30)");
    return h("div.sm-spa-corner", h("p", "👑 VIP 1등석 전용 스파 — 10초 동안 쉬면 HP가 10~30 회복됩니다 (비행당 1회)."), btn);
}
// header: the passengers (name · gate · final destination · itinerary)
function paxBar(pid) {
    const list = TR.onBoard();
    return h("div.sm-pax",
        h("b.sm-pax-h", "🧑‍✈️ 탑승객"),
        list.map(p => {
            const out = !!ps_(p)?.out, tr = TR.tripOf(p);
            return h("div.sm-pax-p" + (out ? ".out" : "") + (p === pid ? ".me" : ""),
                h("div.sm-pax-pic", pic(p, 40), out ? h("span.sm-x", "✖") : null, TR.isVip(p) ? h("span.sm-vipsign", "👑 VIP") : null),
                h("small.sm-pax-n", nm(p)),
                h("small", `Gate ${tr?.gate || "?"} → ${TR.locName(TR.finalDest(p))}`),
                out ? h("small.sm-out", "라운드 탈락") : null,
                h("button.sm-itin-btn", { title: "여정 보기", onclick: () => itineraryPop(p, tr?.legs, `Gate ${tr?.gate}${tr?.vip ? " · 👑 VIP" : ""}`) }, "🧾"));
        }));
}
// 🔥 the crash: SOS (6 s) → oxygen masks (15 s) → 쾅 → who survives (one by one)
async function crashSequence(c) {
    const { pid, t } = c;
    const reason = TR.crashReason();
    const stage = document.querySelector(".location");
    stage?.classList.add("sm-crashing");
    const sos = h("div.sm-sos", h("b", "🆘 SOS 비상! 비상!"), h("p", `${reason} 이유로 비행기가 곧 추락합니다`));
    document.body.append(sos);
    for (let i = 0; i < 12; i++) { tone(i % 2 ? 660 : 880, 0.4, "square", 0.05); if (i % 3 === 0) noise(0.3, 0.12); await sleep(500); }
    sos.remove();
    const count = h("b.sm-count", "15");
    const mask = modal(h("div.sm-mask", h("div.sm-mask-ico", "😷"), h("p", h("b", "비행기가 추락중입니다")), h("small", "산소마스크를 착용하세요… 아무것도 할 수 없습니다"), count), { title: "⚠️ 추락중", closable: false, cls: "sm-mask-modal" });
    for (let i = 15; i > 0; i--) { count.textContent = i; Sound.heartbeat(); if (i % 4 === 0) noise(0.5, 0.06); await sleep(1000); }
    mask.close();
    stage?.classList.remove("sm-crashing");
    const flash = h("div.sm-boom", "쾅!!!");
    document.body.append(flash); Sound.boom(); noise(1.5, 0.3); await sleep(1600); flash.remove();
    // who lives
    const fate = TR.crashFate();
    const board = TR.onBoard();
    const cards = Object.fromEntries(board.map(p => [p, h("div.sm-fate-p" + (ps_(p)?.out ? ".out" : ""), pic(p, 64), h("small", nm(p)), h("b.sm-fate-mark", ps_(p)?.out ? "❌ 라운드 탈락" : "❔"))]));
    const cap = h("p.sm-fate-cap", "생존자를 확인하고 있습니다…");
    const m = modal(h("div.sm-fate", h("div.sm-fate-grid", Object.values(cards)), cap, h("small.muted", `결과: ${fate.fate.label}`)), { title: "💥 비행기 추락 — 생존자 확인", closable: false, wide: true });
    const live = board.filter(p => !ps_(p)?.out);
    const victims = TR.rankOrder(fate.victims);
    const spin = async target => {
        for (let k = 0; k < 14 + rint(0, 6); k++) {
            live.forEach(p => cards[p].classList.remove("hot"));
            const p = target != null && k >= 13 ? target : pickOne(live);
            cards[p].classList.add("hot"); Sound.tick(); await sleep(90 + k * 18);
            if (target != null && p === target && k >= 13) break;
        }
    };
    if (!victims.length) {
        await spin(null); live.forEach(p => cards[p].classList.remove("hot"));
        await sleep(600);
        live.forEach(p => { cards[p].querySelector(".sm-fate-mark").textContent = "🩹 생존"; cards[p].classList.add("live"); });
        cap.textContent = fate.fate.id === "all_live" ? "✨ 기적입니다. 전원이 모두 생존했습니다" : `🩹 생존자 ${live.length}명 — HP 절반 · 🏝️ Island로 표류합니다`; Sound.fanfare(); confetti(80);
    } else {
        for (const v of victims) {
            cap.textContent = "누가…?"; Sound.heartbeat();
            await spin(v);
            cards[v].classList.remove("hot"); cards[v].classList.add("dead"); cards[v].querySelector(".sm-fate-mark").textContent = "☠️ 사망";
            Sound.boom(); await sleep(1100);
        }
        for (const p of fate.survivors) { cards[p].querySelector(".sm-fate-mark").textContent = fate.spared.includes(p) ? "🌪️ 생존 (Air)" : "🩹 생존"; cards[p].classList.add("live"); }
        cap.textContent = fate.survivors.length ? `생존자 ${fate.survivors.length}명 — HP 절반 · 🏝️ Island로 표류합니다` : "생존자가 없습니다…";
    }
    m.box.append(h("div.row.center", h("button.btn.gold.big", { onclick: () => m.close() }, "확인")));
    await m.closed;
    TR.applyCrash(fate);
    // the turn player
    if (!S().turn || ps_(pid)?.out) { await c.dead(TR.CRASH_WHY); return; }
    TR.crashSurvivorLand(pid);
    t.xArrive = { kind: "land", leg: { k: "dest", loc: "island", crash: true }, crash: true, needArrive: true };
    G.setLocation("island", { teleport: true });
    t.region = "combo";
    t.running = true;
    Store.saveSeason(true);
    c.render();
}

// ================================================================ 🛗 ELEVATOR
function floorMap(pid, here) {
    return h("div.sm-floors", [...TR.FLOORS].reverse().map(f => {
        const who = TR.elevOccupants().filter(p => (ps_(p)?.elev?.floor || "elev_1") === f);
        return h("div.sm-floor" + (f === here ? ".here" : "") + (f === "elev_7" ? ".exit" : ""),
            h("b.sm-floor-n", TR.floorLabel(f)), h("small.sm-floor-name", (LOC_BY_ID[f]?.name || "").replace("엘리베이터 ", "").replace(TR.floorLabel(f), "").trim()),
            h("div.sm-floor-who", who.map(p => h("span.sm-fw" + (p === pid ? ".me" : ""), { title: nm(p) }, pic(p, 28)))));
    }));
}
function panelView(c) {
    const { pid, t, loc } = c, ps = ps_(pid);
    const passes = TR.FLOOR_PASSES.filter(f => ps.items[f.id] > 0);
    const go = async to => {
        const was = t.running; t.running = false;
        Sound.click();
        const ding = h("div.sm-elev-door", h("div.l"), h("div.r"), h("b", "🛗"));
        document.body.append(ding);
        await sleep(900); tone(1320, 0.25, "sine", 0.06); tone(990, 0.4, "sine", 0.06, 0.25);
        const dest = TR.moveFloor(pid, to);
        await sleep(700); ding.remove();
        t.running = was;
        if (!dest) return toast("이동 횟수를 모두 썼습니다", "warn");
        toast(`🛗 ${TR.floorLabel(dest)} 도착!`, "ok");
        c.render();
    };
    return h("div.sm-panel",
        h("div.sm-gatehead", h("b", `🛗 엘리베이터 계기판 — 지금 ${TR.floorLabel(loc.id)}`), h("small", `5분 안에 7층 출구로 탈출하세요! 탈출하지 못하면 다음 라운드도 이 층에서 시작합니다 · 남은 시간 ${fmtTime(t.remaining)}`)),
        h("div.row.center", h("button.btn.gold.big", { disabled: TR.movesLeft(pid) <= 0, onclick: () => go(null) }, `🎲 이동 (랜덤 층) · 이번 라운드 ${TR.movesLeft(pid)} / ${TR.ELEV_MOVES}회`)),
        passes.length ? h("div.sm-passes", h("b", "🎫 층권 사용 (이동 횟수 차감 없음): "), passes.map(f => h("button.btn.small.gold", { disabled: f.floor === loc.id, onclick: () => { ps.items[f.id]--; Store.saveSeason(true); go(f.floor); } }, `${TR.floorLabel(f.floor)} ×${ps.items[f.id]}`))) : null,
        floorMap(pid, loc.id));
}
// 3F: 3 uses a round — the 1st is your pick, the next 2 are random
const emoName = { ITEM002: "Super Ball", ITEM003: "Hyper Ball", EMO_HP50: "Monster HP +50" };
const entryOf = it => it.cat === "emo" ? { name: emoName[it.id] || it.id, emoji: "🐾" } : it.cat === "weapon" ? WEAPON_BY_ID[it.id] : ITEM_BY_ID[it.id];
function elevShopView(c) {
    const { pid } = c, ps = ps_(pid), wrap = h("div.sm-elevshop");
    const list = () => (SHOPS.elev_shop?.list || []).filter(it => entryOf(it));
    const buy = async it => {
        const e = entryOf(it), cost = { gold: it.price || 0, pts: 0 };
        if (!canPay(ps, cost)) return toast("골드가 부족합니다", "warn");
        if (it.cat !== "emo" && !(await checkGoods(ps, it.cat, it.id, e))) return;
        pay(ps, cost); G.noteBuy(pid, "elev_shop"); giveGoods(pid, it.cat, it.id);
        G.log(`🛗 ${G.name(pid)} 3층 특별상점: ${e.name} (${fmt(cost.gold)}G)`);
        Store.saveSeason(true); Sound.coin(); toast(`${e.emoji || "🎁"} ${e.name} 구입!`, "ok");
        c.refresh(); render();
    };
    const render = () => {
        const left = G.buysLeft(pid, "elev_shop"), used = G.shopLimit(pid, "elev_shop") - left;
        wrap.replaceChildren(
            h("div.sm-gatehead", h("b", "🛗 엘리베이터 특별상점"), h("small", `이번 라운드 ${left} / ${G.shopLimit(pid, "elev_shop")}회 남음 · 첫 번째는 직접 선택, 나머지 2번은 랜덤 · 💰 ${fmt(ps.money)}G`)),
            left <= 0 ? h("p.notice", "이번 라운드 이용 횟수를 모두 썼습니다.") :
                used === 0 ? h("div.shop-grid", list().map(it => { const e = entryOf(it); return h("div.sitem", h("div.sitem-art", it.cat === "emo" ? h("div.big-emoji", "🐾") : shopArt(it.cat, e)), h("div.sitem-name", e.name), it.cat === "emo" ? h("div.sitem-desc", "🐾 몬스터 아이템") : h("div.sitem-desc", shopDesc(it.cat, e)), h("button.btn.small.gold", { disabled: !canPay(ps, { gold: it.price }), onclick: () => buy(it) }, priceLabel({ gold: it.price }))); }))
                    : h("div.row.center", h("button.btn.gold.big", { onclick: async () => {
                        const pool = list().filter(it => canPay(ps, { gold: it.price }));
                        if (!pool.length) return toast("살 수 있는 상품이 없습니다 (골드 부족)", "warn");
                        Sound.tease(); const it = pickOne(pool); await banner(`🎲 ${entryOf(it).name}`, 1100, "loc"); buy(it);
                    } }, `🎲 랜덤 구매 (${used + 1}번째)`)));
    };
    render();
    return wrap;
}
// 6F: floor passes, once per round
function passShopView(c) {
    const { pid } = c, ps = ps_(pid), wrap = h("div.sm-passshop");
    const render = () => {
        const done = ps.elev?.passRound === S().round;
        wrap.replaceChildren(
            h("div.sm-gatehead", h("b", "🎫 엘리베이터 상점"), h("small", done ? "이번 라운드에 이미 구입했습니다 (라운드당 1회)" : "층권을 사면 계기판에서 그 층으로 바로 이동할 수 있습니다 · 라운드당 1회")),
            h("div.sm-pass-list", TR.FLOOR_PASSES.map(f => {
                const cost = { gold: f.price || 0, pts: f.pts || 0 };
                return h("button.btn" + (!done && canPay(ps, cost) ? ".gold" : ".ghost"), { disabled: done || !canPay(ps, cost), onclick: () => {
                    pay(ps, cost); ps.items[f.id] = (ps.items[f.id] || 0) + 1; (ps.elev ||= {}).passRound = S().round;
                    G.log(`🎫 ${G.name(pid)} ${f.name} 구입`); Store.saveSeason(true); Sound.coin(); toast(`🎫 ${f.name}!`, "ok"); c.refresh(); render();
                } }, `${f.name} · ${priceLabel(cost)}`);
            })));
    };
    render();
    return wrap;
}
// 4F: 무기상점 (punch · coin · spray · worm · devil's thunder) — 1 a round, prices editable in SHOPS.elev_weapon
function elevWeaponView(c) {
    const { pid } = c, ps = ps_(pid), wrap = h("div.sm-elevshop");
    const render = () => {
        const left = G.buysLeft(pid, "elev_weapon");
        wrap.replaceChildren(
            h("div.sm-gatehead", h("b", "⚔️ 엘리베이터 무기상점"), h("small", `이번 라운드 ${left} / ${G.shopLimit(pid, "elev_weapon")}회 · 💰 ${fmt(ps.money)}G`)),
            h("div.shop-grid", (SHOPS.elev_weapon?.list || []).filter(it => WEAPON_BY_ID[it.id]).map(it => {
                const e = WEAPON_BY_ID[it.id], cost = { gold: it.price || 0, pts: 0 }, ok = left > 0 && canPay(ps, cost);
                return h("div.sitem", h("div.sitem-art", shopArt("weapon", e)), h("div.sitem-name", e.name), h("div.sitem-desc", shopDesc("weapon", e)),
                    h("button.btn.small" + (ok ? ".gold" : ".ghost"), { disabled: !ok, onclick: async () => {
                        if (!(await checkGoods(ps, "weapon", it.id, e))) return;
                        pay(ps, cost); G.noteBuy(pid, "elev_weapon"); giveGoods(pid, "weapon", it.id);
                        G.log(`⚔️ ${G.name(pid)} 4층 무기상점: ${e.name} (${fmt(cost.gold)}G)`);
                        Store.saveSeason(true); Sound.coin(); toast(`${e.emoji} ${e.name} 구입!`, "ok"); c.refresh(); render();
                    } }, priceLabel(cost)));
            })));
    };
    render();
    return wrap;
}
function exitView(c) {
    const { pid } = c;
    return h("div.sm-exit", h("div.sm-exit-door", "🚪✨"), h("p", "7층 출구에 도착했습니다! 탈출하면 바로 턴이 끝나고, 다음 라운드부터는 평소처럼 플레이합니다."),
        h("button.btn.gold.huge", { onclick: async () => {
            TR.escapeElevator(pid);
            Sound.fanfare(); confetti(80);
            await alertPop("🛗 탈출", h("div.sm-escaped", h("div.sm-exit-door", "🏃‍♂️🚪"), h("h2", "엘리베이터 탈출 성공"), h("p", "다음 라운드는 정상적으로 진행됩니다.")), { btn: "턴 종료" });
            c.finish();
        } }, "🚪 엘리베이터 탈출"));
}
function rescueView(c) {
    const { pid } = c;
    const others = TR.trappedOthers(pid);
    return h("div.sm-rescue",
        h("p", `🆘 ${fmt(TR.RESCUE_FEE)}G를 내면 갇혀 있는 다른 플레이어 중 1명을 랜덤으로 구제합니다 (친밀도 +20).`),
        floorMap(pid, c.loc.id),
        h("button.btn.gold.big", { disabled: !others.length, onclick: async () => {
            if (!(await confirmBox(`${fmt(TR.RESCUE_FEE)}G로 갇힌 플레이어 1명을 랜덤 구제할까요?`, "구제", "취소"))) return;
            const r = TR.rescue(pid);
            if (!r.ok) return toast(r.why, "warn");
            const hold = Activity.hold();
            try {
                const cards = Object.fromEntries(r.list.map(p => [p, h("div.sm-fate-p", pic(p, 64), h("small", nm(p)), h("small", TR.floorLabel(ps_(p)?.elev?.floor || "elev_1")))]));
                const cap = h("p.sm-fate-cap", "누가 구제될까…?");
                const m = modal(h("div.sm-fate", h("div.sm-fate-grid", Object.values(cards)), cap), { title: "🆘 구제", closable: false, wide: true });
                for (let k = 0; k < 18; k++) { Object.values(cards).forEach(x => x.classList.remove("hot")); const p = k >= 17 ? r.who : pickOne(r.list); cards[p].classList.add("hot"); Sound.tick(); await sleep(90 + k * 22); }
                cards[r.who].classList.add("live"); cap.textContent = `🎉 ${nm(r.who)} 구제 성공! (친밀도 +20)`; Sound.fanfare();
                m.box.append(h("div.row.center", h("button.btn.gold", { onclick: () => m.close() }, "확인")));
                await m.closed;
            } finally { hold(); }
            c.refresh(); c.tabBody("x:rescue");
        } }, others.length ? `🆘 구제하기 (${fmt(TR.RESCUE_FEE)}G)` : "구제할 사람이 없습니다"));
}

// ================================================================ 🏕️ CAMPSITE
async function campsiteIntro(pid, t) {
    const campers = TR.drawCampers();
    // 1) the campers
    await alertPop("🏕️ Campsite", h("div.sm-camp-intro",
        h("p", "캠프장에 도착했습니다… 밤이 깊어지자 ", h("b", "🎭 Masked Killer"), "가 나타났다는 소문이 돕니다. 함께 온 캠퍼들:"),
        h("div.sm-campers", campers.map(cp => h("div.sm-camper", pic(cp.pid, 64), h("small", `${cp.gender === "f" ? "♀" : "♂"} ${nm(cp.pid)}`)))),
        h("p.muted", "캠퍼는 이번 시즌에 참가하지 않은 플레이어입니다 (기록에 영향 없음 · 살아남으면 다음 시즌에 쓸 수 있는 골드를 받습니다)")), { btn: "숨을 곳 찾기 ▶" });
    // 2) the hiding place
    const spot = await new Promise(res => {
        const m = modal(h("div.sm-spots", h("p", "어디에 숨을까? (Masked Killer에게 발견되면 바로 사망)"),
            h("div.sm-spot-grid", Object.entries(TR.CAMP_SPOTS).map(([k, sp]) => h("button.sm-spot", { onclick: () => { m.close(); res(k); } },
                h("span.sm-spot-ico", sp.emoji), h("b", sp.name), h("small", `발견 확률 ${Math.round(sp.found * 100)}%`))))), { title: "🔦 숨을 곳 고르기", closable: false, wide: true });
    });
    // 3) the campers run to theirs
    const plan = TR.campStart(t, spot, campers);
    const boxes = Object.fromEntries(Object.entries(TR.CAMP_SPOTS).map(([k, sp]) => [k, h("div.sm-hide" + (k === spot ? ".mine" : ""), h("b", `${sp.emoji} ${sp.name}`), h("div.sm-hide-who", k === spot ? pic(pid, 36) : null))]));
    const m = modal(h("div.sm-hides", h("div.sm-hide-grid", Object.values(boxes)), h("p.sm-fate-cap", "캠퍼들이 숨을 곳을 찾고 있다…")), { title: "🏕️ 다들 숨는 중…", closable: false, wide: true });
    for (const cp of plan.campers) { await sleep(700); boxes[cp.spot].querySelector(".sm-hide-who").append(pic(cp.pid, 36)); Sound.whoosh(); }
    await sleep(1200); m.close();
    G.setLocation(TR.CAMP_SPOTS[spot].loc, { teleport: true });
    t.camp.campIn = t.remaining;
    Store.saveSeason(true);
    return LOC_BY_ID[TR.CAMP_SPOTS[spot].loc];
}
function campView(c) {
    const { t } = c, cp = t.camp;
    return h("div.sm-campview",
        h("div.sm-gatehead", h("b", `🏕️ ${TR.CAMP_SPOTS[cp.spot].emoji} ${TR.CAMP_SPOTS[cp.spot].name}에 숨어 있음`), h("small", `🔪 희생자 ${cp.kills.length}명 · Masked Killer가 ${TR.CAMP_MIN_KILLS}명 이상 죽여야 턴을 끝낼 수 있습니다 (또는 5분)`)),
        h("div.sm-campers", cp.campers.map(x => h("div.sm-camper" + (x.dead ? ".dead" : ""), pic(x.pid, 56), h("small", nm(x.pid)), h("small", x.dead ? `☠️ ${x.how}` : "숨어 있음 🤫")))));
}
async function bodyCount(pid, t, playerDead, how = null) {
    const cp = t.camp; if (!cp || cp.counted) return;
    cp.counted = true;
    const pay = TR.campPayout(t, !playerDead);
    const order = [...cp.kills.map(k => ({ pid: k.pid, how: k.how })), ...(playerDead ? [{ pid, how: how || "Masked Killer에게 발견됨" }] : [])];
    const survivors = [...(playerDead ? [] : [pid]), ...cp.campers.filter(x => !x.dead).map(x => x.pid)];
    const ord = n => `${n}${["st", "nd", "rd"][n - 1] || "th"}`;
    Sound.scream();
    await alertPop("🔪 Slasher Body Count", h("div.sm-body",
        h("h3.sm-body-h", "🩸 SLASHER BODY COUNT"),
        h("div.sm-body-list", order.map((o, i) => h("div.sm-body-p", h("b", `${ord(i + 1)} Body Count`), pic(o.pid, 48), h("span", nm(o.pid), o.pid === pid ? " (플레이어)" : " (Camper)"), h("small", o.how)))),
        h("h4", "🩹 생존자"),
        h("div.sm-body-list", survivors.length ? survivors.map(s => h("div.sm-body-p.live", pic(s, 48), h("span", nm(s), s === pid ? " (플레이어)" : " (Camper)"), h("small", `+${fmt(pay.find(p => p.pid === s)?.gold || 0)}G`))) : h("p", "생존자가 없습니다…"))));
}
// 🧩 the end is locked until the Masked Killer has struck twice
extraLocks.push((loc, t) => isSpot(loc) && t?.camp && !t.camp.found && TR.campKillsLeft(t) > 0 && (t.remaining ?? 0) > 0 ? `🔪 Masked Killer가 아직 ${TR.CAMP_MIN_KILLS}명을 죽이지 않았습니다… (남은 ${TR.campKillsLeft(t)}명) 숨어서 기다리세요` : null);

// ================================================================ 💻 CYBER TOWN glitches
const GLITCH_SKIP = ["games", "inv", "card", "emo:dex", "loan", "friends"];
const glitchPop = text => { const m = modal(h("div.sm-glitch-pop", h("b", "⚠️ GLITCH"), h("p", text)), { title: "💻 SYSTEM ERROR", closable: false, cls: "sm-glitch-modal" }); tone(90, 0.4, "sawtooth", 0.06); noise(0.4, 0.1); setTimeout(() => m.close(), 3000); };
function glitchCorner(id, c) {
    const { pid, t } = c;
    if (GLITCH_SKIP.includes(id) || id.startsWith("x:")) return null;
    // the corner flags stay only while this corner is glitched
    if (id === "community") t.glitchCom = false;
    if (id.startsWith("shop:")) t.glitchShop = null;
    if (id === "food") t.glitchFood = null;
    if (!TR.glitch()) return null;
    const mult = +(1.5 + rnd() * 1.5).toFixed(2);
    switch (id) {
        case "community": t.glitchCom = true; glitchPop("커뮤니티 글리치! 코멘트 작성비가 5,000G로 · 하트가 취소 불가능한 싫어요로 바뀝니다"); return null;
        case "food": t.glitchFood = rnd() < 0.5 ? { mult } : { invert: true }; glitchPop(t.glitchFood.mult ? `푸드 글리치! 모든 음식 가격 ×${mult}` : "푸드 글리치! 식량 게이지가 거꾸로 움직입니다"); return h("div", h("p.notice.sm-glitch-note", t.glitchFood.mult ? `💻 글리치: 표시 가격의 ×${mult}로 결제됩니다` : "💻 글리치: 먹으면 식량 게이지가 반대로 움직입니다 (HP는 그대로 회복)"), c.normal());
        case "job": glitchPop("직업 글리치! 숨겨진 직업 'Cyber Hacking Work'"); return hackingView(c);
        case "highlight": glitchPop("하이라이트 글리치! 재생 오류…"); return hackerVideoView(c);
        case "help": glitchPop("도움주기 글리치! 도움 대신 갈취…"); return glitchHelpView(c);
        case "emo:capture": glitchPop("Capture 글리치! 몬스터가 튀어나와 공격합니다"); setTimeout(() => monsterAttack(c), 3100); return null;
        case "emo:hospital": glitchPop("Monster Hospital 글리치! 치료 시스템 오류"); return h("div.sm-glitch-box", h("b", "🏥 ERROR 500"), h("p", "치료 장비가 글리치에 걸려 이번에는 치료할 수 없습니다…"), h("button.btn.ghost", { onclick: () => { Sound.lose(); toast("❌ 치료 실패 — 글리치", "warn"); } }, "💉 치료 시도"));
    }
    if (id.startsWith("shop:")) { t.glitchShop = mult; glitchPop(`상점 글리치! 모든 가격 ×${mult}`); return null; }
    glitchPop("코너 글리치! 화면이 깨졌습니다");
    return h("div.sm-glitch-box", h("b", "💻 ERROR 404"), h("p", "이 코너가 글리치에 걸렸습니다. 다시 열어 보세요."), h("button.btn.small", { onclick: () => c.tabBody(id) }, "🔄 다시 열기"));
}
function hackingView(c) {
    const { pid, t } = c;
    if (!G.canWork(pid)) return h("p.notice", "💼 이번 턴에는 이미 일했습니다.");
    const btn = h("button.btn.gold.big", { onclick: async () => {
        btn.disabled = true;
        const hold = Activity.hold(), was = t.running; t.running = false;
        try {
            const targets = (S().roster || []).filter(p => p !== pid && !ps_(p)?.out);
            if (!targets.length) { toast("해킹할 대상이 없습니다", "warn"); return; }
            const who = pickOne(targets);
            const code = h("pre.sm-code"), m = modal(h("div.sm-hack", h("b", "👨‍💻 Cyber Hacking Work"), code), { title: "💻 HACKING…", closable: false });
            for (let i = 0; i < 20; i++) { code.textContent += `> ${Math.random().toString(16).slice(2, 10)} ${["ACCESS", "BYPASS", "INJECT", "DECRYPT"][i % 4]}…\n`; code.scrollTop = 1e6; Sound.tick(); await sleep(250); }
            m.close();
            G.payJob(pid, { id: "cyber_hack", name: "Cyber Hacking Work", cut: 60 }, 0);
            const r = TR.grabGold(pid, who, [10, 30], "Cyber Hacking Work");
            Sound.cash();
            await alertPop("💻 해킹 성공", h("div.sm-pop-row", pic(who, 64), h("p", `${nm(who)}의 골드 ${Math.round(r.pct)}% — `, h("b", `${fmt(r.gold)}G`), " 를 빼앗았다! (친밀도 절반)")));
        } finally { hold(); t.running = was; }
        c.refresh(); c.tabBody("job");
    } }, "💻 Cyber Hacking Work 시작");
    return h("div.sm-glitch-box", h("b", "👨‍💻 숨겨진 직업: Cyber Hacking Work"), h("p", "이번 시즌에 살아 있는 플레이어 1명의 골드 10~30%를 해킹합니다 (그 플레이어와의 친밀도 절반 · 플레이 시간 −1분)."), btn);
}
function hackerVideoView(c) {
    const { pid, t } = c;
    return h("div.sm-glitch-box", h("b", "🎬 Highlight — 재생 오류"), h("p", "알 수 없는 영상이 대기 중입니다…"), h("button.btn.gold", { onclick: async () => {
        const hold = Activity.hold(), was = t.running; t.running = false;
        try {
            const scr = h("div.sm-hackvid", h("div.sm-hv-hacker", "👨‍💻"), h("div.sm-hv-me", pic(pid, 90)), h("div.sm-hv-cap", "REC ●"));
            const m = modal(scr, { title: "🎬 ???", closable: false, wide: true, cls: "sm-hv-modal" });
            for (let i = 0; i < 6; i++) { scr.classList.toggle("flick"); tone(60 + i * 5, 0.5, "sawtooth", 0.04); await sleep(700); }
            scr.querySelector(".sm-hv-cap").textContent = "👨‍💻 \"찾았다… 다음은 너야\""; Sound.heartbeat(); await sleep(1500);
            scr.classList.add("kill"); Sound.boom(); scr.querySelector(".sm-hv-me").classList.add("dead"); await sleep(2000);
            m.close();
            const g = rint(0, 100); ps_(pid).money += g; G.log(`🎬 ${G.name(pid)} 해커 영상 시청 보상 ${g}G`); Store.saveSeason(true);
            toast(`🎬 …보상 ${g}G`, "info", 3000);
        } finally { hold(); t.running = was; }
        c.refresh();
    } }, "▶ 재생"));
}
function glitchHelpView(c) {
    const { pid, t } = c;
    return h("div.sm-glitch-box", h("b", "🤝 도움주기 — GLITCH"), h("p", "도움을 주려 했지만… 시스템이 거꾸로 돌아갑니다. 랜덤 플레이어(이번 시즌 · 오프시즌)의 골드 5~20%를 빼앗습니다 (친밀도 절반)."),
        h("button.btn.gold", { onclick: async () => {
            if (t.helpGlitched) return toast("이번 턴에는 이미 했습니다", "warn");
            const season = (S().roster || []).filter(p => p !== pid && !ps_(p)?.out);
            const off = (Store.players || []).map(p => +p.id).filter(p => !(S().roster || []).includes(p) && (Store.wallets?.[p] || 0) > 0);
            const who = pickOne([...season, ...off]);
            if (who == null) return toast("대상이 없습니다", "warn");
            t.helpGlitched = true;
            const r = TR.grabGold(pid, who, [5, 20], "도움주기 글리치");
            Sound.cash(); await alertPop("💻 도움주기 글리치", h("div.sm-pop-row", pic(who, 64), h("p", `${nm(who)}의 골드 ${fmt(r.gold)}G를 빼앗았다…`)));
            c.refresh(); c.tabBody("help");
        } }, "🤝 도움주기"));
}
async function monsterAttack(c) {
    const { pid } = c;
    const hold = Activity.hold();
    try {
        const mons = ["🐉", "👾", "🦖", "🐙", "🦂"], mon = pickOne(mons), dmg = rint(5, 15);
        const m = modal(h("div.sm-monatk", h("span.sm-mon", mon), h("span", "💥"), pic(pid, 90)), { title: "👾 몬스터의 습격!", closable: false });
        Sound.boom(); await sleep(1500);
        const r = applyHarm(pid, { hp: dmg }, "💻 글리치 몬스터");
        m.close();
        if (r.dead) { await c.dead("💻 글리치 몬스터에게 공격당해 사망"); return; }
        toast(`👾 글리치 몬스터의 공격! HP −${dmg}`, "warn", 3000);
    } finally { hold(); }
    c.refresh();
}
// 💻 slots at Cyber Town: 10% of spins glitch into a jackpot (MINI 60 · MINOR 35 · MAXI 5)
export function slotGlitch(pid, gameId, bet, cfg) {
    if (!LOC_BY_ID[S()?.turn?.loc]?.glitch || rnd() >= TR.SLOT_GLITCH) return null;
    const x = rnd(), tier = x < 0.6 ? "MINI" : x < 0.95 ? "MINOR" : "MAXI";
    const jp = cfg?.jp?.[tier], mult = jp?.x || { MINI: 10, MINOR: 25, MAXI: 50 }[tier];
    const amount = Math.round((jp?.seed && !jp.x ? jp.seed : bet * mult));
    ps_(pid).money += amount;
    Store.logJackpot?.(gameId, tier, pid, amount);
    G.log(`💻 ${G.name(pid)} 슬롯 글리치! ${tier} JACKPOT ${fmt(amount)}G`);
    Store.saveSeason(true);
    return { tier, amount };
}

// ================================================================ 🍀 GOOD LUCK CASINO jobs
const LUCK_JOBS = [
    { id: "lj_pouch", name: "복주머니 줍기", emoji: "🧧", desc: "떨어지는 복주머니를 클릭 (1,000~5,000G · Mini/Minor/Maxi 보너스) · 최대 100,000G" },
    { id: "lj_statue", name: "프리미엄 동상알바", emoji: "🗿", desc: "10초 동안 가만히 · 20,000~40,000G" },
    { id: "lj_pinata", name: "피냐타", emoji: "🪅", desc: "계속 클릭! 500~3,000G씩 · Mini/Minor/Maxi 보너스 · 최대 100,000G" },
    { id: "lj_dealer", name: "카지노 딜러", emoji: "🃏", desc: "흩어진 카드 뽑기: Joker 10,000 · K 8,000 · Q 6,000 · A 5,000 · 그 외 1,000G · 최대 50,000G" },
    { id: "lj_points", name: "포인트 줍줍", emoji: "💎", desc: "떨어지는 다이아몬드 클릭: 꽝 또는 1~3P · 최대 10P" }
];
const LJ_CUT = 60;
const BONUS = { Mini: 1000, Minor: 5000, Maxi: 10000 };
function luckJobsView(c) {
    const { pid, t } = c;
    const wrap = h("div.job-view.sm-luckjobs");
    if (!G.canWork(pid)) { wrap.append(h("p.notice", "💼 이번 턴에는 이미 일했습니다.")); return wrap; }
    wrap.append(h("p.muted", "🍀 Good Luck Casino 전용 알바! 버튼을 누르면 5개 중 하나가 랜덤으로 정해집니다 (플레이 시간 −1분)."),
        h("div.job-list", LUCK_JOBS.map(j => h("div.job-chip", h("span", j.emoji), h("b", j.name), h("small", j.desc)))));
    if (t.remaining - LJ_CUT < 30) { wrap.append(h("p.notice", "⏰ 남은 시간이 부족합니다.")); return wrap; }
    const btn = h("button.btn.gold.big", { onclick: async () => {
        btn.disabled = true;
        const hold = Activity.hold(), was = t.running;
        try {
            const chips = [...wrap.querySelectorAll(".job-chip")];
            const job = pickOne(LUCK_JOBS);
            for (let k = 0; k < 16; k++) { chips.forEach(x => x.classList.remove("hot")); chips[k % chips.length].classList.add("hot"); Sound.tick(); await sleep(70 + k * 12); }
            chips.forEach(x => x.classList.remove("hot")); chips[LUCK_JOBS.indexOf(job)].classList.add("chosen");
            await sleep(500);
            t.running = false;
            const r = await GAMES[job.id](pid);
            G.payJob(pid, { id: job.id, name: job.name, cut: LJ_CUT }, r.gold || 0);
            if (r.pts) { ps_(pid).points += r.pts; G.log(`💎 ${G.name(pid)} 포인트 줍줍 +${r.pts}P`); Store.saveSeason(true); }
            t.running = was;
            await c.payout(pid, r.gold || 0, `${job.emoji} ${job.name}${r.pts ? ` · +${r.pts}P` : ""} (-1분)`);
        } finally { hold(); t.running = was; }
        c.refresh(); c.tabBody("job");
    } }, "🍀 알바 뽑기");
    wrap.append(h("div.row.center", btn));
    return wrap;
}
// a 10-second mini game window → { gold, pts }
function gameWindow(title, sub) {
    const field = h("div.sm-field"), count = h("b.sm-count", "10"), total = h("b.sm-total", "0");
    const m = modal(h("div.sm-minigame", h("div.sm-mg-head", h("span", sub), h("span", "⏱️ ", count), h("span", "💰 ", total)), field), { title, closable: false, wide: true });
    return { m, field, count, total };
}
async function runClock(w, secs = 10, onTick = null) { for (let i = secs; i > 0; i--) { w.count.textContent = i; onTick?.(i); await sleep(1000); } w.count.textContent = "0"; }
const floatIn = (field, x, y, text, cls = "") => { const f = h("span.sm-float" + (cls ? "." + cls : ""), { style: { left: x + "px", top: y + "px" } }, text); field.append(f); setTimeout(() => f.remove(), 900); };
const GAMES = {
    async lj_pouch(pid) {
        const w = gameWindow("🧧 복주머니 줍기", "떨어지는 복주머니를 클릭!");
        let gold = 0, on = true; const CAP = 100000;
        const spawn = () => {
            if (!on) return;
            const tag = rnd() < 0.015 ? "Maxi" : rnd() < 0.05 ? "Minor" : rnd() < 0.1 ? "Mini" : null;
            const p = h("button.sm-drop.pouch" + (tag ? ".tag-" + tag.toLowerCase() : ""), { style: { left: rint(5, 85) + "%", animationDuration: (1.8 + rnd() * 1.4) + "s" } }, "🧧", tag ? h("small", tag) : null);
            p.onclick = e => { if (!on) return; const g = Math.min(CAP - gold, r100(rint(1000, 5000)) + (tag ? BONUS[tag] : 0)); gold += g; w.total.textContent = fmt(gold); tag ? Sound.bonus() : Sound.coin(); floatIn(w.field, e.offsetX + p.offsetLeft, p.offsetTop, `+${fmt(g)}${tag ? " " + tag : ""}`, tag ? "big" : ""); p.remove(); };
            p.addEventListener("animationend", () => p.remove());
            w.field.append(p);
        };
        const iv = setInterval(spawn, 330);
        await runClock(w); on = false; clearInterval(iv);
        await sleep(500); w.m.close();
        return { gold: Math.min(CAP, gold) };
    },
    async lj_statue(pid) {
        const w = gameWindow("🗿 프리미엄 동상알바", "10초 동안 가만히 서 있으세요…");
        w.field.append(h("div.sm-statue", pic(pid, 140), h("div.sm-pedestal", "🗿 PREMIUM STATUE")));
        await runClock(w, 10, () => Sound.click());
        const gold = r100(rint(20000, 40000)); w.total.textContent = fmt(gold); Sound.cash();
        await sleep(900); w.m.close();
        return { gold };
    },
    async lj_pinata(pid) {
        const w = gameWindow("🪅 피냐타", "피냐타를 계속 클릭!");
        let gold = 0, on = true; const CAP = 100000;
        const pin = h("button.sm-pinata", "🪅");
        pin.onclick = e => {
            if (!on || gold >= CAP) return;
            pin.classList.remove("hit"); void pin.offsetWidth; pin.classList.add("hit");
            const x = rnd(), tag = x < 0.005 ? "Maxi" : x < 0.025 ? "Minor" : x < 0.075 ? "Mini" : null;
            const g = Math.min(CAP - gold, r100(rint(500, 3000)) + (tag ? BONUS[tag] : 0)); gold += g; w.total.textContent = fmt(gold);
            tag ? Sound.bonus() : Sound.coin();
            floatIn(w.field, rint(60, 320), rint(30, 180), `+${fmt(g)}${tag ? " " + tag + "!" : ""}`, tag ? "big" : "");
        };
        w.field.append(pin);
        await runClock(w); on = false;
        await sleep(500); w.m.close();
        return { gold };
    },
    async lj_dealer(pid) {
        const w = gameWindow("🃏 카지노 딜러", "흩어진 카드를 뽑으세요!");
        let gold = 0, on = true; const CAP = 50000;
        const draw = () => { const x = rnd(); return x < 0.05 ? ["🃏 Joker", 10000] : x < 0.13 ? ["K", 8000] : x < 0.23 ? ["Q", 6000] : x < 0.35 ? ["A", 5000] : [String(rint(2, 10)), 1000]; };
        const place = () => {
            const cd = h("button.sm-card", { style: { left: rint(3, 88) + "%", top: rint(5, 78) + "%", transform: `rotate(${rint(-30, 30)}deg)` } }, "🂠");
            cd.onclick = () => { if (!on) return; const [face, g0] = draw(); const g = Math.min(CAP - gold, g0); gold += g; w.total.textContent = fmt(gold); cd.textContent = face; cd.classList.add("open"); g0 >= 5000 ? Sound.bonus() : Sound.coin(); cd.onclick = null; setTimeout(() => { cd.remove(); if (on) place(); }, 450); };
            w.field.append(cd);
        };
        for (let i = 0; i < 9; i++) place();
        await runClock(w); on = false;
        await sleep(500); w.m.close();
        return { gold };
    },
    async lj_points(pid) {
        const w = gameWindow("💎 포인트 줍줍", "떨어지는 다이아몬드를 클릭! (꽝 또는 1~3P · 최대 10P)");
        let pts = 0, on = true; const CAP = 10;
        w.total.textContent = "0P";
        const spawn = () => {
            if (!on) return;
            const d = h("button.sm-drop.dia", { style: { left: rint(5, 85) + "%", animationDuration: (1.6 + rnd() * 1.2) + "s" } }, "💎");
            d.onclick = e => { if (!on) return; const p = rnd() < 0.55 ? 0 : rint(1, 3); const g = Math.min(CAP - pts, p); pts += g; w.total.textContent = pts + "P"; g ? Sound.coin() : Sound.miss(); floatIn(w.field, d.offsetLeft, d.offsetTop, g ? `+${g}P` : "꽝"); d.remove(); };
            d.addEventListener("animationend", () => d.remove());
            w.field.append(d);
        };
        const iv = setInterval(spawn, 420);
        await runClock(w); on = false; clearInterval(iv);
        await sleep(500); w.m.close();
        return { gold: 0, pts };
    }
};

// ================================================================ 🧩 map-only NPC moves
const blocked = (pid, npc) => { const ps = ps_(pid); if (G.useNpcBlock(ps)) { G.log(`🎫 ${G.name(pid)} NPC 공격 Block! (${npc.emoji} ${npc.name})`); Store.saveSeason(true); toast(`🎫 NPC 공격 Block 권으로 ${npc.name}의 공격을 막았다! (남은 ${G.npcBlocksLeft(ps)}회)`, "ok", 3200); return true; } return false; };
async function npcPop(pid, npc, title, line, ico) {
    const box = h("div.npc-pop", h("div.npc-arena", h("div.npc-art.lunge", { style: { "--c": npc.color } }, h("span.npc-body", npc.emoji), h("span.npc-weapon", npc.art), h("small", npc.name)), h("div.npc-fx", h("span.npc-burst", ico)), h("div.npc-target.hurt", avatar(pid, 110, { effect: false }))), h("div.npc-say", title), h("div.npc-res", h("b", line)));
    const m = modal(box, { title: "⚠️ NPC 습격!", closable: false });
    Sound.boom();
    box.append(h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
    setTimeout(() => m.close(), 7000);
    await m.closed;
}
customNpc.hack = async (pid, npc) => {
    if (blocked(pid, npc)) return { blocked: true };
    const acct = account(pid);
    if (!acct || !(acct.bgold > 0)) { await npcPop(pid, npc, `${npc.emoji} Hacker의 해킹 시도!`, "🔒 Business Gold가 없어서 해킹할 것이 없었다", "💻"); return { none: true }; }
    const pct = rint(30, 100), amt = Math.floor(acct.bgold * pct / 100);
    acct.bgold -= amt; Store.saveBank?.();
    G.log(`👨‍💻 ${G.name(pid)} Hacker에게 Business Gold ${pct}% (${fmt(amt)} BG) 해킹당함`);
    await npcPop(pid, npc, `${npc.emoji} Hacker의 해킹!`, `💻 Business Gold ${pct}% — ${fmt(amt)} BG를 해킹당했다!`, "💻");
    return { bgold: -amt };
};
customNpc.dollCurse = async (pid, npc) => {
    if (blocked(pid, npc)) return { blocked: true };
    const r = TR.dollCurse(pid);
    await npcPop(pid, npc, `${npc.emoji} Evil Doll의 Doll Curse!`, `🪆 펫이 'Evil Doll'로 바뀌었다… 슬롯 당첨 · 보너스가 20% 확률로 사라집니다 (🔁 펫 교체권으로만 해제)${r.had && r.had !== "evil_doll" ? "" : ""}`, "🪆");
    return { curse: "doll" };
};
customNpc.clownCurse = async (pid, npc) => {
    if (blocked(pid, npc)) return { blocked: true };
    TR.clownCurse(pid);
    await npcPop(pid, npc, `${npc.emoji} Clown Doll의 Clown Curse!`, "🔪 'Self-Harm' 무기가 강제로 심어졌다! 가끔 나 자신을 공격합니다 (HP −10 · 명중 80% · 🗑️ 무기삭제권으로만 제거)", "🤡");
    return { curse: "clown" };
};
customNpc.flyBite = async (pid, npc, move) => {
    const out = G.npcHit(pid, npc, move);
    if (out.blocked) toast(`🎫 Fly를 NPC Block 권으로 쫓아냈다 (남은 ${out.left}회)`, "ok", 2400);
    else { toast(`🪰 Fly가 물어서 HP −${Math.abs(move.hp || 2)}`, "warn", 2400); Sound.buzz(); }
    return out;
};

// ================================================================ header bars
export function head(loc, t, pid) {
    if (loc.plane) return paxBar(pid);
    if (isFloor(loc)) return h("div.sm-elevbar", h("b", `🛗 ${TR.floorLabel(loc.id)}`), h("small", ` · 갇힌 사람 ${TR.elevOccupants().length} / ${TR.ELEV_CAP} · 이동 ${TR.movesLeft(pid)}회 남음`),
        h("div.sm-elevbar-who", TR.elevOccupants().map(p => h("span.sm-fw" + (p === pid ? ".me" : ""), { title: `${nm(p)} · ${TR.floorLabel(ps_(p)?.elev?.floor || "elev_1")}` }, pic(p, 26), h("small", TR.floorLabel(ps_(p)?.elev?.floor || "elev_1"))))));
    if (loc.gate) return h("div.sm-gatebar", h("b", `🛫 Gate ${loc.gate}`), h("small", ` · 탑승 대기 ${TR.waitingList().length} / ${TR.PAX_MAX}명`),
        h("div.sm-elevbar-who", TR.waitingList().map(p => h("span.sm-fw", { title: `${nm(p)} · Gate ${TR.air().waiting[p]}` }, pic(p, 26), h("small", `G${TR.air().waiting[p]}`)))));
    if (isSpot(loc) && t.camp) return h("div.sm-campbar", h("b", `🏕️ ${TR.CAMP_SPOTS[t.camp.spot].emoji} ${TR.CAMP_SPOTS[t.camp.spot].name}`), h("small", ` · 🔪 ${t.camp.kills.length}명 희생`),
        h("div.sm-elevbar-who", t.camp.campers.map(x => h("span.sm-fw" + (x.dead ? ".dead" : ""), { title: nm(x.pid) }, pic(x.pid, 26)))));
    return null;
}
export const rootCls = loc => [loc.plane ? "sm-plane" : "", isFloor(loc) ? "sm-elev" : "", loc.flooded ? "sm-flooded" : "", isSpot(loc) ? "sm-camp sm-spot-" + loc.spot : "", loc.dollFactory ? "sm-doll" : "", loc.glitch ? "sm-cyber" : "", loc.gate ? "sm-gate" : ""].filter(Boolean).join(" ");

// ================================================================ effects (one tick a second while the clock runs)
// c: as corner() + root (the .location element getter)
export function fx(loc, t, pid, c) {
    const hud = h("div.sm-fx");
    let busy = false, sec = 0, stopped = false;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => { if (!stopped) fn(); }, ms));
    const pause = async fn => { if (busy) return; busy = true; const was = t.running; t.running = false; const hold = Activity.hold(); try { await fn(); } finally { hold(); busy = false; if (S().turn === t && !stopped) t.running = was; } };
    const rootEl = () => document.querySelector(".location");
    // ✈️ turbulence (stronger when the crash odds are higher)
    const odds = loc.plane ? TR.crashOdds() : null;
    // 🌊 9F: oxygen
    if (loc.flooded) {
        hud.append(h("div.sm-flood", Array.from({ length: 7 }, (_, i) => h("span.sm-fish", { style: { "--i": i, top: rint(10, 85) + "%" } }, pickOne(["🐟", "🐠", "🐡", "🦈"])))));
        if (!t.oxy9?.[loc.id]) {
            const ps = ps_(pid);
            (t.oxy9 ||= {})[loc.id] = ps.items.oxygen > 0 ? "tank" : "none";
            if (ps.items.oxygen > 0) { ps.items.oxygen--; Store.saveSeason(true); later(() => toast("🫧 산소통 사용! 9층 물속에서도 숨을 쉴 수 있습니다", "ok", 3200), 600); }
            else later(() => toast("🌊 9층이 물에 잠겼다! 산소통이 없어 1분마다 HP −10", "warn", 3800), 600);
        }
    }
    // 🪆 the jack-in-the-box
    let box = null, boxGrow = 0;
    if (loc.dollFactory) { box = h("div.sm-jack", h("span", "🎁")); hud.append(box); }
    const tick = () => {
        if (stopped || busy || !S().turn || S().turn !== t) return;
        sec++;
        // 🔪 Self-Harm (any map): every 2 min of play
        if (TR.hasSelfHarm(pid) && sec % 120 === 60) {
            if (rnd() < 0.8) { const r = applyHarm(pid, { hp: 10 }, "🔪 Self-Harm"); Sound.hit(); toast("🔪 Self-Harm! 나 자신을 공격했다 — HP −10", "warn", 3000); rootEl()?.classList.add("sm-selfhit"); later(() => rootEl()?.classList.remove("sm-selfhit"), 700); if (r.dead) return c.dead("🔪 Self-Harm으로 사망"); c.refresh(); }
            else toast("🔪 Self-Harm… 빗나갔다", "info", 2000);
        }
        if (loc.plane) {
            if (TR.crashDue(t)) return pause(() => crashSequence(c));
            const p = odds?.p || 0.1;
            if (rnd() < 0.06 + p * 0.4) { const el = rootEl(); el?.classList.add(p > 0.25 ? "sm-turb-hard" : "sm-turb"); noise(0.5, 0.03 + p * 0.1); later(() => el?.classList.remove("sm-turb", "sm-turb-hard"), 1200 + p * 2000); if (rnd() < 0.3) toast(p > 0.25 ? "⚠️ 심한 난기류! 좌석벨트를 매세요" : "🌀 난기류…", "info", 1800); }
        }
        if (loc.flooded && t.oxy9?.[loc.id] === "none" && sec % 60 === 0) {
            const r = applyHarm(pid, { hp: 10 }, "🌊 9층 물속 (산소 부족)"); Sound.splash(); toast("🫧 숨이 막힌다… HP −10", "warn", 2600);
            if (r.dead) return c.dead("🌊 엘리베이터 9층에서 산소 부족으로 사망"); c.refresh();
        }
        if (loc.dollFactory) dollTick();
        if (isSpot(loc) && t.camp) campTick();
        if (loc.glitch && rnd() < 0.04) { const el = rootEl(); el?.classList.add("sm-glitching"); tone(rint(80, 400), 0.15, "square", 0.03); later(() => el?.classList.remove("sm-glitching"), 400); }
    };
    // ---- 🪆 Doll Factory
    function dollTick() {
        if (rnd() < 1 / 25) { const fl = h("div.sm-thunder"); document.body.append(fl); noise(1.2, 0.18); tone(50, 0.9, "sine", 0.15); later(() => fl.remove(), 700); }
        if (rnd() < 1 / 30) laugh();
        if (rnd() < 1 / 35) ghostDolls();
        if (rnd() < 1 / 70) blackout();
        // the box grows on its own (≈ 2~4 min) → the Clown Doll jumps out
        boxGrow += 1 + rnd();
        box.style.setProperty("--s", (1 + boxGrow / 60).toFixed(2));
        if (boxGrow > 60 + rint(0, 120) && rnd() < 0.08) { boxGrow = 0; box.style.setProperty("--s", 1); pause(clownPop); }
    }
    const laugh = () => { for (let i = 0; i < 5; i++) tone(500 + rnd() * 300, 0.15, "triangle", 0.04, i * 0.17, -200); toast("🪆 히히히히…", "info", 1500); };
    function ghostDolls() {
        const g = h("div.sm-ghostdolls", Array.from({ length: rint(3, 6) }, () => h("span", { style: { left: rint(5, 85) + "%", top: rint(10, 75) + "%" } }, pickOne(["🪆", "🧸", "🎎", "👻"]))));
        document.body.append(g); tone(220, 0.6, "sawtooth", 0.03, 0, -100);
        g.onclick = () => g.remove();
        later(() => g.remove(), 3000);
    }
    function blackout() {
        const d = h("div.sm-blackout");
        const mv = e => { d.style.setProperty("--x", e.clientX + "px"); d.style.setProperty("--y", e.clientY + "px"); };
        document.addEventListener("mousemove", mv);
        document.body.append(d); d.classList.add("flicker"); noise(0.2, 0.08);
        later(() => d.classList.remove("flicker"), 900);
        later(() => d.classList.add("relight"), 6500);
        later(() => { d.remove(); document.removeEventListener("mousemove", mv); }, 9000);
    }
    async function clownPop() {
        const clown = h("div.sm-clownpop", h("span.sm-cp-box", "📦"), h("span.sm-cp-clown", "🤡"));
        document.body.append(clown); tone(800, 0.2, "square", 0.06); await sleep(200); clown.classList.add("pop"); Sound.scream();
        await sleep(1200); clown.remove();
        const r = applyHarm(pid, { hp: rint(10, 20) }, "🤡 잭인더박스 Clown Doll");
        if (r.dead) return c.dead("🤡 잭인더박스에서 튀어나온 Clown Doll에게 사망");
        toast(`🤡 잭인더박스! Clown Doll의 기습 — HP 남음 ${Math.round(r.hp)}`, "warn", 3200);
        c.refresh();
    }
    // ---- 🏕️ Campsite
    function campTick() {
        const cp = t.camp;
        for (const k of cp.plan) if (!k.done && t.remaining <= k.at) {
            k.done = true;
            const cm = cp.campers.find(x => x.pid === k.pid);
            if (!cm || cm.dead) continue;
            cm.dead = true; cm.how = TR.killText(cm.spot);
            cp.kills.push({ pid: cm.pid, how: cm.how, spot: cm.spot });
            Store.saveSeason();
            Sound.scream();
            const a = h("div.sm-campalarm", pic(cm.pid, 44), h("b", `🔪 ${TR.CAMP_SPOTS[cm.spot].name}에 숨어있던 Camper ${nm(cm.pid)} 살해당함`), h("small", cm.how));
            document.body.append(a); later(() => a.remove(), 4500);
            c.refresh();
            return;
        }
        if (cp.foundAt != null && !cp.found && t.remaining <= cp.foundAt) { cp.found = true; return pause(caught); }
        if (rnd() < 1 / 40) creep();
        if (loc.spot === "trash" && rnd() < 1 / 15) Sound.buzz();
        if (loc.spot === "forest" && rnd() < 1 / 20) { const q = h("div.sm-mosq", "🦟"); document.body.append(q); tone(2400, 0.4, "sine", 0.015); later(() => q.remove(), 2600); }
    }
    function creep() {
        const sh = h("div.sm-shadow"), msg = h("div.sm-creep", "누군가가 다가오고 있다...!!");
        document.body.append(sh, msg);
        for (let i = 0; i < 6; i++) tone(70, 0.12, "sine", 0.12, i * 0.55);
        later(() => { msg.textContent = "발걸음이 더 이상 들리지 않는다..."; }, 3600);
        later(() => { sh.remove(); msg.remove(); }, 6000);
    }
    async function caught() {
        const split = h("div.sm-split", h("div.sm-split-a"), h("div.sm-split-b"), h("div.sm-killer", "🎭🔪"));
        document.body.append(split);
        for (let i = 0; i < 8; i++) { noise(0.12, 0.2); tone(140 + rnd() * 60, 0.12, "sawtooth", 0.08); await sleep(120); }
        split.classList.add("go"); Sound.scream(); await sleep(1800); split.remove();
        const why = `🔪 ${TR.CAMP_SPOTS[t.camp.spot].name}에서 Masked Killer에게 발견되어 사망`;
        if (G.killPlayer(pid, why, { quiet: true }) === false) { toast("🎭 보호 효과로 간신히 살아남았다! (HP 1)", "ok", 3500); c.refresh(); return; }
        await bodyCount(pid, t, true, TR.killText(t.camp.spot));
        await c.dead(why, { skipPopup: true });
    }
    return {
        hud,
        tick,
        stop() { stopped = true; timers.forEach(clearTimeout); document.querySelectorAll(".sm-ghostdolls,.sm-blackout,.sm-shadow,.sm-creep,.sm-campalarm,.sm-mosq,.sm-thunder,.sm-sos").forEach(e => e.remove()); },
        busy: () => busy
    };
}

// ================================================================ the end of a turn
// before the "턴을 종료할까요?" question → false = stay
export async function endCheck(loc, t, pid, c) {
    if (loc.gate && TR.airportOpen() && !TR.ticketOf(pid)) {
        const ok = await confirmBox(`🎫 아직 티켓을 구입하지 않았습니다!\n지금 턴을 끝내면 Gate ${loc.gate} 무료 티켓 (${TR.ticketLabel(TR.defaultTicket(loc.gate))})이 자동으로 적용됩니다.\n그래도 턴을 끝낼까요?`, "그대로 종료", "티켓 사러 가기");
        if (!ok) { c.tabBody("x:ticket"); return false; }
    }
    return true;
}
// after the turn result, before the next player
export async function beforeEnd(pid, loc, t) {
    if (!loc || ps_(pid)?.out) return;
    if (loc.gate) await gateEnd(pid, loc);
    if (isSpot(loc) && t.camp && !t.camp.counted) await bodyCount(pid, t, false);
    if (isFloor(loc) && ps_(pid)?.elev) { ps_(pid).elev.floor = loc.id; Store.saveSeason(true); toast(`🛗 탈출하지 못했습니다 — 다음 라운드도 ${TR.floorLabel(loc.id)}에서 시작합니다`, "warn", 3500); }
}
// the end button's label while a module lock holds it
export const lockLabel = (loc, t) => isSpot(loc) && t?.camp && TR.campKillsLeft(t) > 0 ? `🔒 턴 종료 (🔪 ${TR.campKillsLeft(t)}명 남음)` : null;

// ================================================================ arrivals
// a map just reached (roulette · pass · ticket landing) → the map actually played (🛗 into the elevator · 🏕️ into a hiding place)
export async function arriveHook(s, loc) {
    const t = s.turn, pid = t?.pid;
    if (!pid) return loc;
    if (loc.elevator) {
        if (!TR.elevatorOpen()) { const to = LOC_BY_ID[TR.elevatorRedirect("elevator")]; G.setLocation(to.id, { teleport: true }); toast(`🛗 엘리베이터 정원 초과! ${to.name}(으)로 이동합니다`, "warn", 3500); return to; }
        TR.enterElevator(pid, t);
        Sound.boom();
        await alertPop("🛗 Elevator", h("div.sm-trapped", h("div.sm-elev-ico", "🛗"), h("h3", "엘리베이터에 갇혔습니다!"), h("p", "1층에서 시작합니다. 계기판으로 층을 옮겨 다니며 5분 안에 7층 출구를 찾으세요 (라운드당 이동 3회)."), h("p.muted", "탈출하지 못하면 다음 라운드도 그 층에서 시작합니다 · 최소 2분이 지나야 턴을 끝낼 수 있습니다")));
        return LOC_BY_ID[t.loc];
    }
    if (loc.campsite && !t.camp) return await campsiteIntro(pid, t);
    return loc;
}
// popups the turn start left behind (t.xArrive) — run once when the map screen is first shown
let xBusy = false;
export async function afterRender(s, c) {
    const t = s.turn, x = t?.xArrive;
    if (!x || xBusy) return;
    xBusy = true;
    delete t.xArrive; Store.saveSeason();
    const was = t.running; t.running = false;
    try {
        const pid = t.pid;
        if (x.kind === "board") {
            const tr = TR.tripOf(pid);
            Sound.chime();
            await alertPop("✈️ 비행 중", h("div.sm-flying", h("div.sm-fly-plane", "✈️"), h("p", "비행기 안에서 이번 라운드를 플레이합니다 (5분 · 2분이 지나야 턴 종료 가능)."),
                h("p", tr?.vip ? "👑 VIP 1등석 — 모든 게임 · 스파 이용 가능" : "💺 이코노미석 — 기내 슬롯 1개 · 카지노게임 1개만 이용 가능"), tr ? h("div", legIcons(tr.legs)) : null), { ms: 3500 });
        } else if (x.kind === "land") {
            const to = LOC_BY_ID[x.leg.loc];
            Sound.enter();
            await alertPop(x.crash ? "🏝️ 표류" : x.leg.k === "stop" ? "🛬 경유지 도착" : "🏁 최종 목적지 도착", h("div.sm-landed", h("div.sm-fly-plane.land", x.crash ? "🏝️" : "🛬"),
                h("h3", `${to?.emoji || ""} ${to?.name || x.leg.loc}`), x.crash ? h("p", "비행기 추락에서 살아남아 콤보랜드 Island로 표류했습니다… (HP 절반)") : null), { ms: 3000 });
            if (x.needArrive && to) { t.running = was || true; await c.arrive(s, to); c.render(); return; }
        } else if (x.kind === "gateWait") {
            await alertPop("🛫 게이트 대기", h("div.sm-wait", h("div.sm-wait-ico", "🧳"), h("p", h("b", "탑승객이 모두 도착할때까지 게이트에서 대기해주세요")), h("small", `탑승객 ${TR.waitingList().length} / ${TR.PAX_MAX}명 · 이번 라운드도 Gate ${x.gate}에서 플레이합니다`)), { ms: 3200 });
        } else if (x.kind === "gatePlaced") {
            Sound.chime();
            await alertPop("✈️ Airport", h("div.sm-wait", h("div.sm-wait-ico", "🛫"), h("h3", `Airport Gate ${x.gate}에 배치되었습니다!`), h("p", "🎫 티켓 카운터에서 티켓을 사세요. 탑승객 6명이 모이면 비행기가 출발합니다."), h("small", "티켓 없이 턴이 끝나면 이 게이트의 무료 티켓이 자동 적용됩니다")));
        } else if (x.kind === "elevTrapped") {
            Sound.boom();
            await alertPop("🛗 Elevator", h("div.sm-trapped", h("div.sm-elev-ico", "🛗"), h("h3", `아직 엘리베이터에 갇혀 있습니다 — ${TR.floorLabel(t.loc)}`), h("p", "이번 라운드도 5분 안에 7층 출구를 찾으세요!")), { ms: 3200 });
        } else if (x.kind === "elevPlaced") {
            Sound.boom();
            await alertPop("🛗 Elevator", h("div.sm-trapped", h("div.sm-elev-ico", "🛗"), h("h3", "엘리베이터 빈자리에 배정되어 갇혔습니다!"), h("p", "1층에서 시작합니다. 5분 안에 7층 출구를 찾으세요!")));
        }
    } finally { xBusy = false; if (S().turn === t) t.running = was || true; }
}
