// =====================================================================
// 🍚 Life corners — screens:
//   vitals()          HP + 식량 gauges (heart / rice bowl icons)
//   foodCornerView()  a food corner (door · today's random goods · buy & eat)
//   lodgeView()       a lodging corner (door · rooms with the guests' profiles · random / direct pick · 1–3 rounds)
//   weatherHud()      the map's weather badge + its overlay
//   employView()      🏢 취업 corner (companies, applicants in progress, apply)
//   companyView()     the hired player's company corner (salary, pantry, colleagues)
//   employAtTurn()    results told at the start of the player's turn (+ joining: account code link)
//   starvePopup()     "굶주림으로 바로 사망했습니다"
//   lifeInventory()   🎒 food in the bag · 대부기록 삭제권
// =====================================================================
import { h, fmt, sleep, fmtTime } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, confetti, Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { LOC_BY_ID, ITEM_BY_ID } from "../data/catalog.js";
import * as L from "../data/life.js";
import * as LF from "../game/life.js";
import * as EP from "../game/employ.js";
import * as G from "../game/season.js";
import { account } from "../game/bank.js";
import { avatar, displayName } from "../ui/profile.js";
import { foodArt } from "../ui/foodArt.js";

const nm = pid => displayName(Store.player(pid));
const timeOk = t => !t || t.remaining > 0 || (toast("⏰ 플레이 시간이 끝났습니다", "warn"), false);

// ================================================================ ❤️ / 🍚 gauges
export function vitals(ps, { compact = false, mini = false } = {}) {
    const hp = Math.max(0, ps?.hp ?? CONFIG.START_HP), food = ps?.food ?? L.FOOD_START;
    const bar = (cls, icon, v, max, title) => {
        const pct = Math.max(0, Math.min(100, v / max * 100));
        return h("div.vbar." + cls + (pct <= 30 ? ".low" : "") + (pct <= 0 ? ".empty" : ""), { title: `${title} ${Math.round(v * 100) / 100} / ${max}` },
            h("i.vbar-ico", icon), h("div.vbar-track", h("u", { style: { width: pct + "%" } }), mini ? null : h("b", `${Math.round(v * 10) / 10}`)));
    };
    return h("div.vitals" + (compact ? ".compact" : "") + (mini ? ".mini" : ""), bar("hp", "❤️", hp, CONFIG.START_HP, "HP"), bar("food", "🍚", food, L.FOOD_MAX, "식량"));
}

// ================================================================ 🏪 food corner
// corner: a cornerCfg · key: unique per corner (doors / stock are kept per round)
export function foodCornerView(pid, corner, key, { turn = null, onChange = () => { }, note = null } = {}) {
    const wrap = h("div.fc-view", { style: { "--fc": corner.color || "#f59e0b" } });
    const ps = G.S().ps[pid], p = Store.player(pid);
    const render = () => {
        const door = LF.doorOf(pid, key);
        const left = corner.pantry ? LF.pantryLeft(pid) : LF.foodUsesLeft(pid);
        const head = h("div.fc-head", h("span.fc-ico", corner.emoji), h("div",
            h("h3", corner.name), h("small.muted", `${L.ENTRY_KINDS[corner.entry]}${corner.entry === "paid" && corner.fee ? ` ${fmt(corner.fee)}G` : ""} · ${corner.free ? "모두 무료" : "판매 상품은 라운드마다 랜덤"} · ${corner.pantry ? `라운드당 1회 무료 (남은 ${left})` : `푸드 코너 이용 라운드당 ${L.FOOD_USES_PER_ROUND}회 (남은 ${left})`}`)),
            h("div.fc-gauge", vitals(ps, { compact: true })));
        if (!door) {
            const label = corner.entry === "paid" && corner.fee ? `💰 입장료 ${fmt(corner.fee)}G 내고 입장` : corner.entry === "random" ? "🎲 입장 시도 (60%)" : "🚪 입장하기";
            wrap.replaceChildren(head, note ? h("p.notice", note) : null, h("div.fc-door", h("div.fc-door-ico", "🚪"), h("p", `${corner.name}에 오신 것을 환영합니다!`),
                h("button.btn.gold.big", { onclick: enter }, label)));
            return;
        }
        if (!door.in) { wrap.replaceChildren(head, h("div.fc-door.no", h("div.fc-door-ico", "🙅"), h("p", "입장 거절… 이번 라운드에는 이 코너에 들어갈 수 없습니다."))); return; }
        const stock = LF.stockOf(pid, key, corner);
        wrap.replaceChildren(head, note ? h("p.notice", note) : null,
            h("p.muted.small", "🎲 오늘의 판매 상품 (라운드마다 랜덤) · 사면 바로 먹고 식량 게이지가 올라갑니다"),
            h("div.fc-grid", stock.map(it => {
                const f = L.FOOD_BY_ID[it.id], price = LF.foodPrice(corner, it), raceOk = L.canEatRace(f, p?.ethnicity);
                const ok = left > 0 && raceOk && G.playMoney(pid) >= price;
                return h("div.fc-item" + (f.food < 0 ? ".bad" : "") + (raceOk ? "" : ".locked"),
                    foodArt(f.id, 64),
                    h("b.fc-name", f.name),
                    h("span.fc-food" + (f.food < 0 ? ".neg" : ""), `🍚 ${f.food >= 0 ? "+" : ""}${f.food}`),
                    f.races ? h("small.fc-race", `🧬 ${f.races.join(" · ")} 전용`) : f.desc ? h("small.fc-race", f.desc) : null,
                    h("button.btn.small" + (ok ? ".gold" : ".ghost"), { disabled: !ok, onclick: () => buy(it) }, !raceOk ? "먹을 수 없음" : left <= 0 ? "이용 끝" : price ? `${fmt(price)} G` : "무료"));
            })));
    };
    function enter() {
        if (!timeOk(turn)) return;
        const d = LF.foodDoor(pid, key, corner);
        if (d.short) return toast(d.why, "warn");
        d.in ? (Sound.coin(), d.rolled && toast("🙆 입장 허가!", "ok")) : (Sound.lose(), toast("🙅 입장 거절!", "warn"));
        onChange(); render();
    }
    async function buy(it) {
        if (!timeOk(turn)) return;
        const f = L.FOOD_BY_ID[it.id];
        if (f.food < 0 && !(await confirmBox(`${f.name}을(를) 먹으면 식량 게이지가 ${f.food} 줄어듭니다. 그래도 먹을까요?`, "먹기", "취소"))) return;
        const r = LF.buyFood(pid, key, corner, it);
        if (!r.ok) return toast(r.why, "warn");
        f.food >= 0 ? (Sound.coin(), confetti(16, [f.emoji, "✨"])) : Sound.lose();
        toast(`${f.emoji} ${f.name} 냠냠! 식량 ${r.got >= 0 ? "+" : ""}${r.got} → ${r.food}`, f.food >= 0 ? "ok" : "warn");
        onChange(); render();
    }
    render();
    return wrap;
}

// ================================================================ 🏨 lodging
export function lodgeView(pid, loc, lodge, { turn, onChange = () => { } } = {}) {
    const wrap = h("div.lg-view", { style: { "--lg": lodge.color || "#eab308" } });
    const ps = G.S().ps[pid];
    let rounds = 1, inner = null;
    const discount = lodge.id === "hotel" || lodge.k === "hotel" ? EP.hotelDiscount(pid) : 0;
    const render = () => {
        const door = LF.lodgeDoorOf(turn, loc.id, lodge);
        const stay = LF.stayOf(pid, loc.id), mine = stay && stay.k === lodge.k;
        const need = LF.lodgeNeed(pid, lodge);
        const head = h("div.lg-head", h("span.lg-ico", lodge.emoji), h("div",
            h("h3", lodge.name, lodge.reserve ? h("small.lg-tag", "📅 예약 가능 (1~3라운드)") : h("small.lg-tag.no", "예약 불가 · 이번 라운드만")),
            h("small.muted", `${L.ENTRY_KINDS[lodge.entry]}${lodge.entry === "paid" && lodge.fee ? ` ${fmt(lodge.fee)}G` : ""} · 머무는 동안 이 맵에서 🌦️ 날씨와 👹 NPC 공격을 막아 줍니다`),
            lodge.needTypes ? h("small.lg-need" + (need.ok ? ".ok" : ""), `🐾 ${lodge.needTypes.join(" / ")} 속성 이모몬스터 필요`) : null,
            lodge.freeTypes ? h("small.lg-need.ok", `🐾 ${lodge.freeTypes.join(" / ")} 속성 이모몬스터 보유자는 무료`) : null,
            discount ? h("small.lg-need.ok", `🏙️ HYHG Corp. 직원 할인 ${Math.round(discount * 100)}%`) : null,
            lodge.owner ? h("small.lg-need.ok", "🔑 이 맵의 Self-Business 오너 전용 · 시즌 내내 무료 (입장만 랜덤)") : null));
        const stayBox = stay ? h("div.lg-stay" + (mine ? ".mine" : ""), avatar(pid, 40, { effect: false }),
            h("div", h("b", mine ? "🛏️ 이 숙소에 머무는 중" : `🛏️ 이 맵의 ${stay.lodge || "숙소"}에 머무는 중`), h("small", `${stay.until >= 9999 ? "시즌 끝까지" : `ROUND ${stay.until}까지`} · 이 맵에서는 날씨 · NPC 공격을 받지 않습니다`))) : null;
        const kids = [head, stayBox];
        if (!need.ok) { wrap.replaceChildren(...kids, h("p.notice.warn", `🚫 ${need.why}`), roomBoard(false)); return; }
        if (!door) {
            const label = lodge.entry === "paid" && lodge.fee && !LF.freeStay(pid, lodge) ? `💰 입장료 ${fmt(lodge.fee)}G 내고 입장` : lodge.entry === "random" ? "🎲 입장 시도 (60%)" : "🚪 입장하기";
            wrap.replaceChildren(...kids, h("div.fc-door", h("div.fc-door-ico", lodge.emoji), h("button.btn.gold.big", { onclick: enter }, label)), roomBoard(false));
            return;
        }
        if (!door.in) { wrap.replaceChildren(...kids, h("div.fc-door.no", h("div.fc-door-ico", "🙅"), h("p", "입장 거절… 이번 턴에는 들어갈 수 없습니다.")), roomBoard(false)); return; }
        kids.push(!stay && lodge.reserve ? h("div.lg-rounds", h("small", "📅 예약할 라운드:"), [1, 2, 3].map(n => h("button.btn.small" + (rounds === n ? ".gold" : ".ghost"), { onclick: () => { rounds = n; render(); } }, `${n}라운드`))) : null);
        kids.push(roomBoard(!stay));
        // guests only: 🛎️ hotel mini shop · 🏧 cave vending machine · 🌇 penthouse restaurants
        const inners = [...(lodge.shop ? [lodge.shop] : []), ...(lodge.foods || [])];
        if (inners.length) {
            kids.push(h("div.lg-inner", h("b", "🔐 객실 손님 전용"), mine ? inners.map(k => { const c = LF.innerCorner(k); return h("button.btn.small" + (inner === k ? ".gold" : ""), { onclick: () => { inner = inner === k ? null : k; render(); } }, `${c.emoji} ${c.name}`); }) : h("small.muted", ` ${inners.map(k => LF.innerCorner(k)?.name).join(" · ")} — 이 숙소에 객실을 잡아야 이용할 수 있습니다`)));
            if (mine && inner) kids.push(foodCornerView(pid, LF.innerCorner(inner), `lodge:${loc.id}:${lodge.k}:${inner}`, { turn, onChange }));
        }
        wrap.replaceChildren(...kids);
    };
    // the rooms with their guests (a profile in every taken room)
    function roomBoard(active) {
        return h("div.lg-board", LF.roomsOf(loc.id, lodge).map(({ rt, rooms }) => {
            const price = LF.roomPrice(pid, lodge, rt, discount);
            const total = price * (lodge.reserve ? rounds : 1);
            const d = LF.drawOf(turn, loc.id, lodge, rt);
            const free = rooms.filter(r => !r.who).length;
            const rows = h("div.lg-rooms", rooms.map(r => {
                const pick = active && rt.pick === "direct" && !r.who;
                const drawn = d?.room === r.key;
                return h("button.lg-room" + (r.who ? ".taken" : "") + (pick ? ".pick" : "") + (drawn ? (d.taken != null ? ".drawn.bad" : ".drawn") : ""), { disabled: !pick, title: r.who ? `${nm(r.who.pid)} · ROUND ${r.who.until >= 9999 ? "시즌 끝" : r.who.until}까지` : "빈 자리", onclick: () => pick && take(rt, r.key) },
                    h("small.lg-no", `${r.i + 1}`), r.who ? avatar(r.who.pid, 34, { effect: false }) : h("span.lg-bed", rt.pick === "random" && !r.who ? "🚪" : "🛏️"), r.who ? h("small.lg-who", nm(r.who.pid)) : null);
            }));
            const drawBtn = active && rt.pick === "random" ? (d ? (d.taken == null
                ? h("div.lg-drawn", h("b", `🎉 ${d.i + 1}번 빈 방 당첨!`), h("button.btn.gold", { onclick: () => take(rt, d.room) }, total ? `💰 ${fmt(total)}G 내고 체크인` : "무료로 체크인"))
                : h("div.lg-drawn.bad", h("b", `😢 ${d.i + 1}번 방은 이미 ${nm(d.taken)}님이 사용 중 — 들어갈 수 없습니다`), h("small.muted", " (랜덤 뽑기는 방문마다 1번)")))
                : h("button.btn.gold", { disabled: !free, onclick: () => draw(rt) }, free ? "🎲 랜덤 객실 뽑기 (먼저 뽑고, 빈 방이면 결제)" : "만실")) : null;
            return h("div.lg-type",
                h("div.lg-type-head", h("b", rt.label), h("small", `${rt.n}자리 · ${price ? `${fmt(price)}G${lodge.reserve ? " / 라운드" : ""}` : "무료"} · ${rt.pick === "random" ? "🎲 랜덤 선택" : "👆 바로 선택 (먼저 결제)"} · 빈 자리 ${free}`)),
                rows, drawBtn);
        }));
    }
    function enter() {
        if (!timeOk(turn)) return;
        const d = LF.lodgeDoor(pid, turn, loc.id, lodge);
        if (d.why && !d.in && d.short) return toast(d.why, "warn");
        if (d.why && !d.in) return toast(d.why, "warn");
        d.in ? (Sound.coin(), d.rolled && toast("🙆 입장 허가!", "ok")) : (Sound.lose(), toast("🙅 입장 거절!", "warn"));
        onChange(); render();
    }
    async function draw(rt) {
        if (!timeOk(turn)) return;
        const done = Activity.hold();
        try {
            const r = LF.drawRoom(pid, turn, loc.id, lodge, rt);
            // a little roulette over the doors
            render();
            const btns = [...wrap.querySelectorAll(".lg-type")].find(el => el.querySelector(".lg-type-head b")?.textContent === rt.label)?.querySelectorAll(".lg-room") || [];
            for (let k = 0; k < 14 && btns.length; k++) { btns.forEach(b => b.classList.remove("hot")); btns[(r.i + k + 1) % btns.length]?.classList.add("hot"); Sound.tick(); await sleep(70 + k * 12); }
            btns.forEach(b => b.classList.remove("hot"));
            r.taken == null ? Sound.fanfare() : Sound.lose();
        } finally { done(); }
        render();
    }
    async function take(rt, key) {
        if (!timeOk(turn)) return;
        const n = lodge.reserve ? rounds : 1;
        const cost = LF.roomPrice(pid, lodge, rt, discount) * n;
        if (cost && !(await confirmBox(`${lodge.emoji} ${lodge.name} ${rt.label} ${key.split("-")[1]}번\n${lodge.reserve ? `${n}라운드 예약 · ` : ""}${fmt(cost)}G를 낼까요?`, "결제하고 체크인", "취소"))) return;
        const r = LF.checkIn(pid, turn, loc.id, lodge, rt, key, n, discount);
        if (!r.ok) return toast(r.why, "warn");
        Sound.fanfare(); confetti(30, ["🛏️", "🔑", "✨"]);
        toast(`🛏️ 체크인 완료! ${r.until >= 9999 ? "시즌 끝까지" : `ROUND ${r.until}까지`} 이 맵에서 날씨 · NPC 공격을 막아 줍니다`, "ok", 4000);
        onChange(); render();
    }
    render();
    return wrap;
}

// ================================================================ 🌦️ weather on the map
export function weatherHud(t) {
    const el = h("span.wx-badge");
    const update = () => {
        const w = LF.weatherAt(t.loc), sh = LF.sheltered(t.pid, t.loc), next = LF.weatherNextIn(t);
        el.className = "wx-badge wx-" + w.id + (sh ? " safe" : "");
        el.title = w.hp ? `${w.name}: 이 맵에서 1분이 지나면, 그 뒤로 3분마다 HP −${w.hp} (숙소에 머물면 무사)` : "맑음 — 날씨 피해 없음";
        el.replaceChildren(h("span", w.emoji), h("b", w.name), w.hp ? h("small", sh ? "🏨 숙소 보호 중" : `HP −${w.hp} · ${fmtTime(next ?? 0)}`) : null);
    };
    update();
    return { el, update };
}
export function weatherLayer(locId) {
    const w = LF.weatherAt(locId);
    if (w.id === "sun") return h("div.wx-layer.wx-sun");
    const ch = { rain: "│", storm: "│", snow: "❄", blizzard: "❄", hail: "●", heat: "" }[w.id] ?? "";
    const n = { rain: 40, storm: 70, snow: 30, blizzard: 60, hail: 30, heat: 0 }[w.id] || 0;
    return h("div.wx-layer.wx-" + w.id, Array.from({ length: n }, () => h("i", { style: { "--x": `${Math.random() * 100}%`, "--d": `${(Math.random() * 2).toFixed(2)}s`, "--t": `${(0.5 + Math.random() * (w.id.includes("snow") || w.id === "blizzard" ? 3 : 0.8)).toFixed(2)}s` } }, ch)));
}

// ================================================================ 🏢 employment corner
const coCard = (C, body) => h("div.ep-co", { style: { "--co": C.color } }, h("div.ep-co-head", h("span.ep-logo", C.emoji), h("div", h("b", C.name), h("small", `정원 ${C.cap}명 · 시즌당 최대 ${C.perSeason}명 채용 · 지원자 최대 ${L.APPLY_MAX}명`))), body);
export function employView(pid, { turn = null, onChange = () => { } } = {}) {
    const wrap = h("div.ep-view");
    const render = () => {
        const s = G.S(), mine = EP.appsOf(pid), acc = account(pid), offers = EP.offersOf(pid);
        wrap.replaceChildren(
            h("div.ep-head", h("span.ep-big", "🏢"), h("div", h("h3", "취업 코너"), h("small.muted", `은행 계좌가 있어야 지원할 수 있습니다 · 시즌당 최대 ${L.APPLY_PER_SEASON}곳 (동시 지원 가능) · 지원 취소 불가 · 지원자가 다 차면 심사 시작 → 라운드마다 결과 통보`))),
            !acc ? h("p.notice.warn", "🏦 Business Bank 계좌가 없습니다 — 은행에서 계좌를 먼저 만드세요 (TOP 15 경력자)") : h("p.notice", `🏦 내 계좌 ${acc.code} · 이번 시즌 지원 ${mine.length}/${L.APPLY_PER_SEASON}`),
            offers.length ? h("div.ep-offer", h("b", "🎉 최종 합격 통보가 있습니다!"), h("button.btn.gold", { onclick: async () => { await offerFlow(pid); onChange(); render(); } }, "입사 결정하기")) : null,
            arizalBox(pid, turn, () => { onChange(); render(); }),
            h("div.ep-list", L.COMPANY_LIST.map(C => {
                const st = EP.applyStatus(pid, C.id), c = EP.cohort(C.id), prog = EP.inProcess(C.id);
                const staff = EP.staffOf(C.id);
                return coCard(C, h("div.ep-co-body",
                    h("div.ep-req", h("small", "📋 지원자격"), h("span", C.reqText)),
                    h("div.ep-steps", C.stages.map((k, i) => h("span.ep-step", L.STAGE_LABEL(C, i)))),
                    h("ul.ep-perks", C.perks.map(x => h("li", x)), h("li.muted", C.promoText)),
                    h("div.ep-people", h("small", `🧑‍💼 진행 중인 지원자 ${prog.length}명${c ? ` (이번 시즌 ${c.list.length}/${L.APPLY_MAX}${c.started ? " · 심사 중" : ""})` : ""}`),
                        h("div.ep-faces", prog.length ? prog.map(a => h("span.ep-face" + (a.pid === +pid ? ".me" : ""), { title: `${nm(a.pid)} · S${a.season} · ${a.state === "offer" ? "최종 합격" : a.started ? L.STAGE_LABEL(C, Math.min(a.stage, C.stages.length - 1)) + " 진행 중" : "심사 대기"}` }, avatar(a.pid, 34, { effect: false }), h("small", a.state === "offer" ? "🎉" : a.started ? `${a.stage + 1}차` : "대기"))) : h("span.muted", "없음"))),
                    h("div.ep-people", h("small", `👔 직원 ${staff.length}/${C.cap}`), h("div.ep-faces", staff.slice(0, 12).map(x => h("span.ep-face", { title: `${nm(x.pid)}${x.manager ? " · 매니저" : ""}` }, avatar(x.pid, 28, { effect: false }), x.manager ? h("small", "👔") : null)), staff.length > 12 ? h("small", `+${staff.length - 12}`) : null)),
                    h("div.row.end", mine.includes(C.id) ? h("span.ep-applied", "✅ 지원 완료") : h("button.btn" + (st.ok ? ".gold" : ".ghost"), { disabled: !st.ok, title: st.why || "", onclick: () => apply(C) }, st.ok ? `지원하기${C.fee ? ` (${fmt(C.fee)}G)` : " (무료)"}` : `🚫 ${st.why}`))));
            })),
            notesBox(pid));
    };
    async function apply(C) {
        if (!timeOk(turn)) return;
        if (!(await confirmBox(`${C.emoji} ${C.name}에 지원할까요?\n${C.fee ? `지원료 ${fmt(C.fee)}G — ` : ""}지원은 취소할 수 없습니다.`, "지원하기", "취소"))) return;
        const r = EP.applyTo(pid, C.id);
        if (!r.ok) return toast(r.why, "warn");
        Sound.coin(); toast(r.full ? `📨 지원 완료! 지원자 ${L.APPLY_MAX}명이 모여 심사가 시작됩니다 (다음 라운드에 1차 결과)` : `📨 지원 완료! (지원자 ${r.n}/${L.APPLY_MAX} — 다 차면 심사 시작)`, "ok", 4200);
        onChange(); render();
    }
    render();
    return wrap;
}
function notesBox(pid) {
    const list = EP.notesOf(pid).slice(-12).reverse();
    if (!list.length) return null;
    return h("details.ep-notes", h("summary", `📬 채용 소식 (${list.length})`), list.map(n => h("div.ep-note." + n.kind, h("small.muted", new Date(n.at).toLocaleDateString()), h("span", n.text))));
}
// 🧪 Arizal Tech Test box (corner + turn HUD)
export function arizalBox(pid, t, onChange) {
    const a = EP.arizalPending(pid);
    if (!a || !t || t.pid !== +pid) return null;
    const run = t.arizal && !t.arizal.done;
    const box = h("div.ep-test",
        h("b", "🧪 Arizal Tech Test"), h("small", `제한 시간 1분 · 지금 맵의 슬롯 / 카지노에서 ${L.ARIZAL_TEST.min}~${L.ARIZAL_TEST.max}G 베팅으로 WIN 합계 ${fmt(L.ARIZAL_TEST.goal)}G 이상`),
        run ? h("span.ep-test-run", `⏱️ ${Math.max(0, Math.ceil((t.arizal.until - Date.now()) / 1000))}초 · WIN ${fmt(t.arizal.won || 0)} / ${fmt(L.ARIZAL_TEST.goal)}G`) :
            h("button.btn.gold.small", { onclick: () => { if (t.remaining <= 60) return toast("남은 플레이 시간이 1분 이상일 때 시작하세요", "warn"); if (EP.startArizalTest(pid)) { Sound.bonus(); toast("🧪 테스트 시작! 1분 안에 100~300G 베팅으로 10,000G 이상 WIN!", "ok", 4000); onChange?.(); } } }, "▶ 테스트 시작"));
    return box;
}
// HUD: test countdown (called every second by the turn screen) → finishes the test when the minute is over
export function arizalTick(pid, t) {
    if (!t?.arizal || t.arizal.done) return null;
    if (Date.now() < t.arizal.until) return { running: true };
    const r = EP.finishArizalTest(pid);
    if (r) { r.ok ? (Sound.fanfare(), confetti(50, ["🧪", "✨"])) : Sound.lose(); toast(`🧪 Arizal Tech Test ${r.ok ? "통과!" : "실패…"} WIN ${fmt(r.won)}G / ${fmt(L.ARIZAL_TEST.goal)}G`, r.ok ? "ok" : "warn", 5000); }
    return { finished: r };
}

// ================================================================ 🏢 the hired player's company corner
export function companyView(pid, { turn = null, onChange = () => { } } = {}) {
    const wrap = h("div.ep-view");
    let pantryOpen = false;
    const render = () => {
        const x = EP.employer(pid), C = EP.companyOf(pid);
        if (!x || !C) { wrap.replaceChildren(h("p.notice", "소속 회사가 없습니다.")); return; }
        const staff = EP.staffOf(C.id);
        wrap.replaceChildren(
            coCard(C, h("div.ep-co-body",
                h("div.ep-badge-big", companyMark(pid, 44), h("div", h("b", `${nm(pid)} — ${x.manager ? "👔 매니저" : x.promos ? `진급 ${x.promos}/3` : "사원"}`), h("small.muted", `입사 ${new Date(x.at).toLocaleDateString()}${x.season ? ` (시즌 ${x.season})` : ""} · 급여 계좌 ${x.code}`))),
                h("div.ep-pay", h("div", h("small", "라운드 급여"), h("b", `${fmt(x.pay)} G`)), C.pts ? h("div", h("small", "라운드 포인트"), h("b", `${C.pts} P`)) : null, h("div", h("small", "급여 입금"), h("b", `🏦 ${x.code}`))),
                h("ul.ep-perks", C.perks.map(p => h("li", p)), h("li.muted", C.promoText)),
                C.pantry ? h("div.row", h("button.btn" + (pantryOpen ? ".gold" : ".ghost"), { onclick: () => { pantryOpen = !pantryOpen; render(); } }, `🥤 HYHG Pantry (라운드당 1회 무료 · 남은 ${LF.pantryLeft(pid)})`)) : null,
                C.pantry && pantryOpen ? foodCornerView(pid, LF.innerCorner("hyhg_pantry"), "pantry", { turn, onChange }) : null,
                h("div.ep-people", h("small", `👥 동료 ${staff.length}/${C.cap}`), h("div.ep-faces", staff.map(s => h("span.ep-face" + (s.pid === +pid ? ".me" : ""), { title: `${nm(s.pid)}${s.manager ? " · 매니저" : ""}` }, avatar(s.pid, 30, { effect: false }), s.manager ? h("small", "👔") : null)))))),
            notesBox(pid));
    };
    render();
    return wrap;
}
// the small company mark next to a hired player's picture
export function companyMark(pid, size = 22) {
    const C = EP.companyOf(pid), x = EP.employer(pid);
    if (!C) return null;
    return h("span.co-mark", { style: { "--co": C.color, "--s": size + "px" }, title: `${C.name}${x?.manager ? " · 매니저" : ""}` }, C.emoji, x?.manager ? h("i", "👔") : null);
}

// ================================================================ 📬 results at the start of the turn
export async function employAtTurn(pid) {
    const fresh = EP.unseenNotes(pid);
    if (fresh.length) {
        const m = modal(h("div.ep-turn", avatar(pid, 90), h("h3", `📬 ${nm(pid)}님께 채용 소식이 도착했습니다`),
            fresh.map(n => h("div.ep-note." + n.kind, h("b", L.COMPANIES[n.co]?.emoji || "🏢"), h("span", n.text))),
            h("div.row.center", h("button.btn.gold.big", { onclick: () => m.close() }, "확인"))), { title: "🏢 취업 코너", closable: false });
        fresh.some(n => n.kind === "offer" || n.kind === "pass") ? (Sound.fanfare(), confetti(40, ["🎉", "🏢"])) : fresh.some(n => n.kind === "fail") ? Sound.lose() : Sound.bonus();
        await m.closed;
        EP.markSeen(pid);
    }
    if (EP.offersOf(pid).length && !EP.employer(pid)) await offerFlow(pid);
}
// final pass: choose the company (two offers → pick one) and link the 4-digit account code
async function offerFlow(pid) {
    const offers = EP.offersOf(pid);
    if (!offers.length) return;
    let co = offers[0].co;
    const input = h("input.bk-code-in", { maxlength: 4, placeholder: "ABCD", oninput: e => e.target.value = e.target.value.toUpperCase() });
    const pickRow = h("div.ep-pick");
    const drawPick = () => pickRow.replaceChildren(...offers.map(o => { const C = L.COMPANIES[o.co]; return h("button.ep-pick-btn" + (co === o.co ? ".on" : ""), { style: { "--co": C.color }, onclick: () => { co = o.co; drawPick(); } }, h("span.ep-logo", C.emoji), h("b", C.name), h("small", `급여 ${fmt(C.pay)}G`)); }));
    drawPick();
    const done = await new Promise(res => {
        const m = modal(h("div.ep-offer-pop", h("h3", "🎉 최종 합격을 축하합니다!"), offers.length > 1 ? h("p", "두 회사에 모두 합격했습니다! 입사할 회사를 하나 고르세요 (취업은 한 곳만).") : null, pickRow,
            h("p", "급여를 받을 본인 계좌 코드 4자리를 입력해 연동하세요."), input,
            h("div.row.end", h("button.btn.ghost", { onclick: () => { m.close(); res(false); } }, "나중에"),
                h("button.btn.gold", { onclick: () => {
                    const r = EP.acceptOffer(pid, co, input.value);
                    if (!r.ok) return toast(r.why, "warn");
                    m.close(); res({ co, gift: r.gift });
                } }, "✅ 계좌 연동하고 입사"))), { title: "🏢 입사 결정", closable: false });
        setTimeout(() => input.focus(), 60);
    });
    if (!done) return;
    const C = L.COMPANIES[done.co];
    Sound.fanfare(); confetti(120, [C.emoji, "🎉", "💼"]);
    const m = modal(h("div.ep-hired", { style: { "--co": C.color } }, h("div.ep-hired-logo", C.emoji), avatar(pid, 120), h("h2", `${C.name} 입사!`),
        h("p", `매 라운드 급여 ${fmt(C.pay)}G${C.pts ? ` + ${C.pts}P` : ""}가 계좌로 들어옵니다.`), done.gift ? h("p", `🎁 입사선물: ${done.gift}`) : null,
        h("button.btn.gold.big", { onclick: () => m.close() }, "출근하기 ▶")), { title: "💼 취업 성공", closable: false });
    await m.closed;
}

// ================================================================ 🍽️ starved to death
export async function starvePopup(pid) {
    const target = h("div.st-target", avatar(pid, 130, { effect: false }));
    const gauge = h("div.st-gauge", h("u"), h("span", "🍚 0"));
    const box = h("div.st-pop", h("div.st-plate", "🍽️"), target, gauge, h("div.st-growl", "꼬르륵… 꼬르르륵…"), h("h2.st-title", "굶주림으로 바로 사망했습니다"),
        h("p.muted.center", `${nm(pid)} — 식량 게이지가 0인 채로 턴이 끝나 HP가 바닥났습니다…`));
    const m = modal(box, { title: "🍽️ 굶주림", closable: false, cls: "st-modal" });
    Sound.heartbeat?.(); await sleep(700); Sound.heartbeat?.(); await sleep(700);
    target.classList.add("dead"); Sound.boom();
    box.append(h("button.btn.gold.big", { onclick: () => m.close() }, "확인"));
    await m.closed;
}
export async function starveHurtPopup(pid, hp) {
    const m = modal(h("div.st-pop.hurt", h("div.st-plate", "🍽️"), avatar(pid, 100, { effect: false }), h("h3", "배가 너무 고픕니다…"),
        h("p", `식량 게이지가 0이라 턴이 끝날 때 HP −${L.STARVE_HP}`), h("p", `남은 HP ❤️ ${Math.round(hp)}`),
        h("p.muted.small", "푸드 코너에서 음식을 사 먹거나 🎒 가방의 음식을 드세요"),
        h("button.btn.gold.big", { onclick: () => m.close() }, "확인")), { title: "🍚 굶주림", closable: false });
    Sound.lose();
    await m.closed;
}

// ================================================================ 🎒 inventory: food in the bag · loan record eraser
export function lifeInventory(pid, onChange = () => { }) {
    const wrap = h("div.life-inv");
    const render = () => {
        const ps = G.S().ps[pid];
        const foods = Object.entries(ps.items || {}).filter(([k, n]) => n > 0 && L.foodOfItem(k));
        const rows = [];
        if (foods.length) rows.push(h("h4", "🍚 음식", h("small.muted", ` · 식량 ${LF.foodOf(pid)} / ${L.FOOD_MAX}`)),
            h("div.fc-grid.small", foods.map(([k, n]) => { const f = L.foodOfItem(k); return h("div.fc-item" + (f.food < 0 ? ".bad" : ""), foodArt(f.id, 44), h("b.fc-name", `${f.name} ×${n}`), h("span.fc-food" + (f.food < 0 ? ".neg" : ""), `🍚 ${f.food >= 0 ? "+" : ""}${f.food}`),
                h("button.btn.small.gold", { onclick: () => { const r = LF.eatFromBag(pid, k); if (!r.ok) return toast(r.why, "warn"); Sound.coin(); toast(`${f.emoji} 냠냠! 식량 → ${r.food}`, "ok"); render(); onChange(); } }, "먹기")); })));
        if (ps.items.loan_erase > 0) rows.push(h("div.row", h("button.btn.small.gold", { onclick: async () => {
            if (!(await confirmBox("🧾 대부기록 삭제권을 사용해 대출 이용 기록을 삭제할까요? (계좌 개설 대출 심사에 영향을 주지 않게 됩니다)", "삭제하기", "취소"))) return;
            const r = EP.eraseLoanRecord(pid); if (!r.ok) return toast(r.why, "warn"); Sound.bonus(); toast("🧾 대출 이용 기록이 삭제되었습니다", "ok"); render(); onChange();
        } }, `🧾 대부기록 삭제권 사용 (${ps.items.loan_erase})`), EP.loanErased(pid) ? h("small.muted", " · 이미 삭제된 기록이 있습니다") : null));
        wrap.replaceChildren(...rows);
    };
    render();
    return wrap;
}
export { ITEM_BY_ID, LOC_BY_ID };
