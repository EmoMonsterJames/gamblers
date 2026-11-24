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
    const bar = (cls, icon, v, max, title, extra = null) => {
        const pct = Math.max(0, Math.min(100, v / max * 100));
        return h("div.vbar." + cls + (pct <= 30 ? ".low" : "") + (pct <= 0 ? ".empty" : ""), { title: `${title} ${Math.round(v * 100) / 100} / ${max}` },
            h("i.vbar-ico", icon), h("div.vbar-track", h("u", { style: { width: pct + "%" } }), mini ? null : h("b", `${Math.round(v * 10) / 10}`, extra)));
    };
    // ⓘ right next to the food number: how the gauge drains and what starving costs
    const info = mini ? null : h("button.vit-info", { title: "식량 게이지 정보", onclick: e => { e.stopPropagation(); foodGaugeInfo(); } }, "ⓘ");
    const fb = bar("food", "🍚", food, L.FOOD_MAX, "식량", info);
    if (ps?.starve) fb.classList.add("starving");
    return h("div.vitals" + (compact ? ".compact" : "") + (mini ? ".mini" : ""), bar("hp", "❤️", hp, CONFIG.START_HP, "HP"), fb);
}
export function foodGaugeInfo() {
    const m = modal(h("div.fg-info",
        h("p", `🍚 식량 게이지는 플레이 ${L.FOOD_DRAIN_SEC / 60}분마다 −${L.FOOD_DRAIN} 줄어듭니다 (최대 ${L.FOOD_MAX}).`),
        h("p", h("b", "게이지가 0이 되면 굶주림 시작"), ` — 게이지를 ${L.STARVE_EXIT} 이상으로 올리기 전까지 HP가 −${L.STARVE_HP}씩 줄어듭니다:`),
        h("table.fg-table",
            h("tr", h("th", "남은 게이지"), h("th", "HP −10까지")),
            h("tr", h("td", "계속 0"), h("td", "30초마다")),
            h("tr", h("td", "1 ~ 3"), h("td", "게이지를 다 쓰고 30초 뒤")),
            h("tr", h("td", "4 ~ 7"), h("td", "게이지를 다 쓰고 1분 뒤")),
            h("tr", h("td", "8 ~ 10"), h("td", "게이지를 다 쓰고 1분 30초 뒤"))),
        h("p.muted", `그 뒤로는 남은 게이지(0)에 따라 계속 줄어듭니다. 게이지를 ${L.STARVE_EXIT} 이상으로 올리면 굶주림이 끝나고, 다시 ${L.FOOD_DRAIN_SEC / 60}분 뒤부터 게이지가 −${L.FOOD_DRAIN}씩 줄어듭니다.`),
        h("p.muted", "HP가 0이 되면 굶주림으로 바로 사망합니다. (시간은 내 턴을 플레이하는 동안만 흐릅니다)"),
        h("button.btn.gold", { onclick: () => m.close() }, "확인")), { title: "🍚 식량 게이지 정보" });
}
// 🎡 the food corner entry roulette (a wheel cut by the odds; spinTo(i) lands on segment i)
const segLabel = s => s.kind === "free" ? "무료 입장" : s.kind === "paid" ? `${fmt(s.fee)}G` : "입장 거절";
const SEG_COLOR = s => s.kind === "free" ? "#22c55e" : s.kind === "no" ? "#ef4444" : ({ 1000: "#facc15", 3000: "#f59e0b", 5000: "#f97316", 10000: "#a855f7" }[s.fee] || "#eab308");
function entryWheelEl(wheel, landed = null) {
    const total = wheel.reduce((a, s) => a + s.w, 0);
    let a = 0;
    const segs = wheel.map(s => { const from = a / total * 360; a += s.w; return { s, from, to: a / total * 360 }; });
    const disc = h("div.fc-wheel-disc", { style: { background: `conic-gradient(${segs.map(g => `${SEG_COLOR(g.s)} ${g.from}deg ${g.to}deg`).join(", ")})` } },
        segs.map(g => h("span.fc-wheel-lbl" + (g.to - g.from < 25 ? ".tiny" : ""), { style: { transform: `rotate(${(g.from + g.to) / 2}deg)` } }, h("em", segLabel(g.s)))));
    const el = h("div.fc-wheel", h("i.fc-wheel-ptr", "▼"), disc);
    const angleOf = i => { const g = segs[i]; return g.from + (g.to - g.from) * (0.2 + Math.random() * 0.6); };
    if (landed != null && segs[landed]) disc.style.transform = `rotate(${-(segs[landed].from + segs[landed].to) / 2}deg)`;
    return {
        el,
        spinTo: i => new Promise(res => {
            const turns = 5 + Math.floor(Math.random() * 3);
            disc.style.transition = "transform 3.6s cubic-bezier(.12,.7,.15,1)";
            requestAnimationFrame(() => { disc.style.transform = `rotate(${turns * 360 - angleOf(i)}deg)`; });
            let ticks = 0; const tk = setInterval(() => { if (++ticks > 22) clearInterval(tk); else Sound.tick(); }, 60 + ticks * 8);
            setTimeout(() => { clearInterval(tk); res(); }, 3700);
        })
    };
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
            h("h3", corner.name, corner.races ? h("small.lg-tag", `🧬 ${corner.races.join(" · ")} 종족 전용`) : null), h("small.muted", `${corner.entry === "roulette" ? L.ROULETTE_LABEL : L.ENTRY_KINDS[corner.entry]}${corner.entry === "paid" && corner.fee ? ` ${fmt(corner.fee)}G` : ""} · ${corner.free ? "모두 무료" : "판매 상품은 라운드마다 랜덤"} · ${corner.pantry ? `라운드당 1회 무료 (남은 ${left})` : `푸드 코너 이용 라운드당 ${L.FOOD_USES_PER_ROUND}회 (남은 ${left})`}`)),
            h("div.fc-gauge", vitals(ps, { compact: true })));
        // 🎡 map food corners: the entry roulette
        if (corner.entry === "roulette") {
            if (!LF.cornerOpenTo(pid, corner)) { wrap.replaceChildren(head, h("div.fc-door.no", h("div.fc-door-ico", "🧬"), h("p", `${corner.name}은(는) ${corner.races.join(" · ")} 종족만 이용할 수 있습니다.`))); return; }
            const wheel = LF.entryWheel(pid, corner), home = LF.isHomeCorner(pid, corner);
            const wh = entryWheelEl(wheel, door?.i);
            const oddsNote = h("small.muted.fc-odds", home ? `🏠 ${corner.home} 출신 전용 룰렛 · ` : "", wheel.map(s => `${segLabel(s)} ${s.w}%`).join(" · "));
            if (!door) {
                wrap.replaceChildren(head, note ? h("p.notice", note) : null, h("div.fc-door.fc-wheel-box", wh.el, oddsNote,
                    h("button.btn.gold.big", { onclick: e => spin(e.currentTarget, wh) }, "🎡 입장 룰렛 돌리기")));
                return;
            }
            if (door.pay) {
                wrap.replaceChildren(head, h("div.fc-door.fc-wheel-box", wh.el, h("p", h("b", `💰 유료 입장 ${fmt(door.pay)}G`), " — 입장료를 내면 들어갈 수 있습니다"),
                    h("div.row.center", h("button.btn.gold.big", { onclick: payIn }, `💰 ${fmt(door.pay)}G 내고 입장`), h("button.btn.ghost", { onclick: giveUp }, "포기하기"))));
                return;
            }
            if (!door.in) { wrap.replaceChildren(head, h("div.fc-door.no.fc-wheel-box", wh.el, h("p", door.gaveUp ? "입장료를 내지 않고 돌아갔습니다 — 이번 라운드에는 들어갈 수 없습니다." : "🙅 입장 거절… 이번 라운드에는 이 코너에 들어갈 수 없습니다."))); return; }
        }
        if (!door) {
            const label = corner.entry === "paid" && corner.fee ? `💰 입장료 ${fmt(corner.fee)}G 내고 입장` : corner.entry === "random" ? "🎲 입장 시도 (60%)" : "🚪 입장하기";
            wrap.replaceChildren(head, note ? h("p.notice", note) : null, h("div.fc-door", h("div.fc-door-ico", "🚪"), h("p", `${corner.name}에 오신 것을 환영합니다!`),
                h("button.btn.gold.big", { onclick: enter }, label)));
            return;
        }
        if (!door.in) { wrap.replaceChildren(head, h("div.fc-door.no", h("div.fc-door-ico", "🙅"), h("p", "입장 거절… 이번 라운드에는 이 코너에 들어갈 수 없습니다."))); return; }
        const stock = LF.stockOf(pid, key, corner);
        // 🎲 the player does not choose: one button draws a random dish from the menu (one they may eat and can pay for)
        const pool = stock.filter(it => L.canEatRace(L.FOOD_BY_ID[it.id], p?.ethnicity) && G.playMoney(pid) >= LF.foodPrice(corner, it));
        const cards = new Map();
        wrap.replaceChildren(head, note ? h("p.notice", note) : null,
            h("p.muted.small", "🎲 오늘의 메뉴 (라운드마다 랜덤) · 메뉴는 직접 고를 수 없어요 — 버튼을 누르면 랜덤으로 골라 바로 먹고 식량 게이지가 올라갑니다"),
            h("div.fc-grid", stock.map(it => {
                const f = L.FOOD_BY_ID[it.id], price = LF.foodPrice(corner, it), raceOk = L.canEatRace(f, p?.ethnicity);
                const card = h("div.fc-item" + (f.food < 0 ? ".bad" : "") + (raceOk ? "" : ".locked"),
                    foodArt(f.id, 64),
                    h("b.fc-name", f.name),
                    h("span.fc-food" + (f.food < 0 ? ".neg" : ""), `🍚 ${f.food >= 0 ? "+" : ""}${f.food}${L.foodHp(f) ? ` ❤️ +${L.foodHp(f)}` : ""}`),
                    f.races ? h("small.fc-race", `🧬 ${f.races.join(" · ")} 전용`) : f.desc ? h("small.fc-race", f.desc) : null,
                    h("small.fc-price", !raceOk ? "먹을 수 없음" : price ? `${fmt(price)} G` : "무료"));
                cards.set(it.id, card);
                return card;
            })),
            h("div.fc-roll", h("button.btn.big" + (left > 0 && pool.length ? ".gold" : ".ghost"), { disabled: !(left > 0 && pool.length), onclick: e => roll(e.currentTarget, pool, cards) },
                left <= 0 ? "이용 끝" : pool.length ? "🎲 랜덤 메뉴 고르기" : "살 수 있는 메뉴가 없습니다")));
    };
    function enter() {
        if (!timeOk(turn)) return;
        const d = LF.foodDoor(pid, key, corner);
        if (d.short) return toast(d.why, "warn");
        d.in ? (Sound.coin(), d.rolled && toast("🙆 입장 허가!", "ok")) : (Sound.lose(), toast("🙅 입장 거절!", "warn"));
        onChange(); render();
    }
    let spinning = false;
    async function spin(btn, wh) {
        if (spinning || !timeOk(turn)) return;
        const d = LF.foodSpin(pid, key, corner);
        if (d.short) return toast(d.why, "warn");
        spinning = true; btn.disabled = true;
        const done = Activity.hold();
        try { Sound.tease?.(); await wh.spinTo(d.i); } finally { done(); spinning = false; }
        if (d.in) { Sound.coin(); toast("🙆 무료 입장!", "ok"); }
        else if (d.pay) { Sound.tick(); toast(`💰 유료 입장 ${fmt(d.pay)}G`, "info"); }
        else { Sound.lose(); toast("🙅 입장 거절!", "warn"); }
        onChange(); render();
    }
    function payIn() {
        if (!timeOk(turn)) return;
        const d = LF.foodPayEntry(pid, key, corner);
        if (d.short) return toast(d.why, "warn");
        Sound.coin(); toast("🙆 입장 완료!", "ok");
        onChange(); render();
    }
    function giveUp() { LF.foodGiveUp(pid, key, corner); Sound.lose(); onChange(); render(); }
    let rolling = false;
    async function roll(btn, pool, cards) {
        if (rolling || !pool.length || !timeOk(turn)) return;
        rolling = true; btn.disabled = true;
        const it = pool[Math.floor(Math.random() * pool.length)];
        // a short roulette over the dishes it can land on, slowing down onto the pick
        const steps = 14 + Math.floor(Math.random() * pool.length);
        let i = Math.floor(Math.random() * pool.length);
        for (let k = 0; k < steps; k++) {
            cards.forEach(c => c.classList.remove("hot"));
            const cur = k === steps - 1 ? it : pool[i++ % pool.length];
            cards.get(cur.id)?.classList.add("hot");
            Sound.tick();
            await sleep(60 + k * k * 1.6);
        }
        rolling = false;
        buy(it);
    }
    async function buy(it) {
        if (!timeOk(turn)) return render();
        const f = L.FOOD_BY_ID[it.id];
        const r = LF.buyFood(pid, key, corner, it);
        if (!r.ok) return toast(r.why, "warn");
        f.food >= 0 ? (Sound.coin(), confetti(16, [f.emoji, "✨"])) : Sound.lose();
        toast(`${f.emoji} ${f.name} 냠냠! 식량 ${r.got >= 0 ? "+" : ""}${r.got} → ${r.food}${r.hp ? ` · ❤️ HP +${Math.round(r.hp)}` : ""}`, f.food >= 0 ? "ok" : "warn");
        onChange(); render();
    }
    render();
    return wrap;
}

// ================================================================ 🏨 lodging
export function lodgeView(pid, loc, lodge, { turn, onChange = () => { } } = {}) {
    const wrap = h("div.lg-view", { style: { "--lg": lodge.color || "#eab308" } });
    let rounds = 1, inner = null, rolling = null; // rolling: the room type whose doors are being shuffled right now
    const discount = lodge.id === "hotel" || lodge.k === "hotel" ? EP.hotelDiscount(pid) : 0;
    // 🙈 a random (or free) door is rolled only when the player pays for a room — the result is not shown before that
    const hiddenDoor = lodge.entry !== "paid";
    const render = () => {
        const door = LF.lodgeDoorOf(turn, loc.id, lodge);
        const stay = LF.stayOf(pid, loc.id), mine = stay && stay.k === lodge.k;
        const need = LF.lodgeNeed(pid, lodge);
        const head = h("div.lg-head", h("span.lg-ico", lodge.emoji), h("div",
            h("h3", lodge.name, lodge.reserve ? h("small.lg-tag", "📅 예약 가능 (1~3라운드)") : h("small.lg-tag.no", "예약 불가 · 이번 라운드만")),
            h("small.muted", `${L.ENTRY_KINDS[lodge.entry]}${lodge.entry === "paid" && lodge.fee ? ` ${fmt(lodge.fee)}G` : ""} · 예약하면 ${lodge.name}이(가) 있는 모든 맵에서 🌦️ 날씨와 👹 NPC 공격을 막아 줍니다`),
            lodge.needTypes ? h("small.lg-need" + (need.ok ? ".ok" : ""), `🐾 ${lodge.needTypes.join(" / ")} 속성 이모몬스터 필요`) : null,
            lodge.freeTypes ? h("small.lg-need.ok", `🐾 ${lodge.freeTypes.join(" / ")} 속성 이모몬스터 보유자는 무료`) : null,
            discount ? h("small.lg-need.ok", `🏙️ HYHG Corp. 직원 할인 ${Math.round(discount * 100)}%`) : null,
            lodge.owner ? h("small.lg-need.ok", "🔑 이 맵의 Self-Business 오너 전용 · 시즌 내내 무료 (입장만 랜덤)") : null));
        const where = stay && stay.locId !== loc.id ? ` (${LOC_BY_ID[stay.locId]?.name || stay.locId}에서 예약)` : "";
        const stayBox = stay ? h("div.lg-stay" + (mine ? ".mine" : ""), avatar(pid, 40, { effect: false }),
            h("div", h("b", mine ? `🛏️ ${lodge.name} ${stay.key.split("-")[1]}번에 머무는 중${where}` : `🛏️ ${stay.lodge || "숙소"}에 머무는 중${where}`),
                h("small", `${stay.until >= 9999 ? "시즌 끝까지" : `ROUND ${stay.until}까지`} · ${stay.lodge || "그 숙소"}이(가) 있는 모든 맵에서 날씨 · NPC 공격을 받지 않습니다`)),
            mine ? h("button.btn.small.red.lg-out", { onclick: checkout }, "🧳 체크아웃") : null) : null;
        const kids = [head, stayBox];
        if (!need.ok) { wrap.replaceChildren(...kids, h("p.notice.warn", `🚫 ${need.why}`), roomBoard(false)); return; }
        if (!door && !hiddenDoor) {
            const label = lodge.fee && !LF.freeStay(pid, lodge) ? `💰 입장료 ${fmt(lodge.fee)}G 내고 입장` : "🚪 입장하기";
            wrap.replaceChildren(...kids, h("div.fc-door", h("div.fc-door-ico", lodge.emoji), h("button.btn.gold.big", { onclick: enter }, label)), roomBoard(false));
            return;
        }
        if (door && !door.in) { wrap.replaceChildren(...kids, h("div.fc-door.no", h("div.fc-door-ico", "🙅"), h("p", hiddenDoor ? "입장 거절… 결제는 취소되었습니다. 이번 턴에는 들어갈 수 없습니다." : "입장 거절… 이번 턴에는 들어갈 수 없습니다.")), roomBoard(false)); return; }
        kids.push(!stay && lodge.reserve ? h("div.lg-rounds", h("small", "📅 예약할 라운드:"), [1, 2, 3].map(n => h("button.btn.small" + (rounds === n ? ".gold" : ".ghost"), { onclick: () => { rounds = n; render(); } }, `${n}라운드`)), h("small.muted", ` (이번 라운드부터 · ${lodge.name}이(가) 있는 모든 맵)`)) : null);
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
                const drawn = d?.room === r.key && rolling !== rt.label; // not revealed while the doors are still shuffling
                return h("button.lg-room" + (r.who ? ".taken" : "") + (pick ? ".pick" : "") + (drawn ? (d.result === "taken" ? ".drawn.bad" : ".drawn") : ""), { disabled: !pick, title: r.who ? `${nm(r.who.pid)} · ROUND ${r.who.until >= 9999 ? "시즌 끝" : r.who.until}까지` : "빈 자리", onclick: () => pick && payFor(rt, r.key, true) },
                    h("small.lg-no", `${r.i + 1}`), r.who ? avatar(r.who.pid, 34, { effect: false }) : h("span.lg-bed", rt.pick === "random" && !r.who ? "🚪" : "🛏️"), r.who ? h("small.lg-who", nm(r.who.pid)) : null);
            }));
            let drawBtn = null;
            if (active && rt.pick === "random") {
                if (rolling === rt.label) drawBtn = h("div.lg-drawn.rolling", h("b", "🎲 객실을 고르는 중…"));
                else if (!d) drawBtn = h("button.btn.gold", { onclick: () => draw(rt) }, "🎲 객실 입장 시도 (랜덤 객실 뽑기)");
                else if (!d.result) drawBtn = h("div.lg-drawn", h("b", `🚪 ${d.i + 1}번 객실을 골랐습니다! ${total ? `숙박비 ${fmt(total)}G를 지불하세요` : "체크인하세요"}`),
                    h("button.btn.gold", { onclick: () => payFor(rt, d.room, false) }, total ? `💰 ${fmt(total)}G 지불하기` : "무료로 체크인"));
                else if (d.result === "taken") {
                    const who = rooms.find(x => x.key === d.room)?.who;
                    drawBtn = h("div.lg-drawn.bad", h("b", `😢 ${d.i + 1}번 객실은 이미 ${who ? nm(who.pid) + "님이" : "다른 손님이"} 사용 중 — 결제가 취소되었습니다`),
                        who && (G.S().ps[pid].items?.guest_swap || 0) > 0 ? h("button.btn.gold", { onclick: () => askSwap(rt, d.room, who.pid) }, "🔑 투숙객교체권 사용") : h("small.muted", " (랜덤 뽑기는 방문마다 1번)"));
                }
            }
            return h("div.lg-type",
                h("div.lg-type-head", h("b", rt.label), h("small", `${rt.n}자리 · ${price ? `${fmt(price)}G${lodge.reserve ? " / 라운드" : ""}` : "무료"} · ${rt.pick === "random" ? "🎲 랜덤 선택 (뽑고 결제한 뒤 결과 공개)" : "👆 바로 선택 (먼저 결제)"} · 빈 자리 ${free}`)),
                rows, drawBtn);
        }));
    }
    function enter() {
        if (!timeOk(turn)) return;
        const d = LF.lodgeDoor(pid, turn, loc.id, lodge);
        if (d.why && !d.in) return toast(d.why, "warn");
        d.in ? Sound.coin() : (Sound.lose(), toast("🙅 입장 거절!", "warn"));
        onChange(); render();
    }
    async function draw(rt) {
        if (!timeOk(turn)) return;
        const done = Activity.hold();
        let r;
        try {
            r = LF.drawRoom(pid, turn, loc.id, lodge, rt);
            // 🎲 1) the doors shuffle first (the pick stays hidden: "객실을 고르는 중…"),
            //    2) the light stops on the drawn room, 3) only then "N번 객실을 골랐습니다 → 지불하세요"
            rolling = rt.label; render();
            const btns = [...wrap.querySelectorAll(".lg-type")].find(el => el.querySelector(".lg-type-head b")?.textContent === rt.label)?.querySelectorAll(".lg-room") || [];
            const n = btns.length, steps = Math.max(18, n * 2 + 4);
            for (let k = 0; k < steps && n; k++) {
                btns.forEach(b => b.classList.remove("hot"));
                btns[((r.i - (steps - 1 - k)) % n + n * steps) % n]?.classList.add("hot"); // the last step lands on the drawn room
                Sound.tick(); await sleep(60 + Math.round(k * k * 0.5)); // slows down as it lands
            }
            Sound.coin(); await sleep(450);
        } finally { rolling = null; done(); }
        render();
        toast(`🚪 ${r.i + 1}번 객실을 골랐습니다 — 숙박비를 지불하세요`, "info", 3000);
    }
    // 💳 pay for the chosen room → only now: let in or not · the room free or taken (nothing is charged when it fails)
    async function payFor(rt, key, ask) {
        if (!timeOk(turn)) return;
        const n = lodge.reserve ? rounds : 1;
        const cost = LF.roomPrice(pid, lodge, rt, discount) * n;
        if (ask && cost && !(await confirmBox(`${lodge.emoji} ${lodge.name} ${rt.label} ${key.split("-")[1]}번\n${lodge.reserve ? `${n}라운드 예약 · ` : ""}${fmt(cost)}G를 낼까요?`, "결제하고 체크인", "취소"))) return;
        const r = LF.enterRoom(pid, turn, loc.id, lodge, rt, key, n, discount);
        if (r.ok) return checkedIn(r);
        if (r.refused) { Sound.lose(); toast("🙅 입장 거절! 결제가 취소되었습니다", "warn", 3500); onChange(); return render(); }
        if (r.taken != null) {
            Sound.lose(); onChange(); render();
            if (r.canSwap) return askSwap(rt, key, r.taken);
            return toast(`😢 이미 ${nm(r.taken)}님이 사용 중인 객실입니다 — 결제가 취소되었습니다`, "warn", 3500);
        }
        toast(r.why, "warn");
    }
    // 🔑 투숙객교체권: "해당 아이템을 사용하여 자리를 빼앗으시겠습니까?" (아니요 / 네)
    async function askSwap(rt, key, who) {
        const n = lodge.reserve ? rounds : 1, cost = LF.roomPrice(pid, lodge, rt, discount) * n;
        if (!(await confirmBox(`😢 ${key.split("-")[1]}번 객실은 이미 ${nm(who)}님이 사용 중입니다.\n\n🔑 해당 아이템(투숙객교체권)을 사용하여 자리를 빼앗으시겠습니까?${cost ? `\n(숙박비 ${fmt(cost)}G)` : ""}`, "네", "아니요"))) return;
        if (!timeOk(turn)) return;
        const r = LF.swapRoom(pid, turn, loc.id, lodge, rt, key, n, discount);
        if (!r.ok) return toast(r.why, "warn");
        checkedIn(r, `🔑 ${nm(who)}님을 내보내고 `);
    }
    function checkedIn(r, pre = "") {
        Sound.fanfare(); confetti(30, ["🛏️", "🔑", "✨"]);
        toast(`🛏️ ${pre}체크인 완료! ${r.until >= 9999 ? "시즌 끝까지" : `ROUND ${r.until}까지`} ${lodge.name}이(가) 있는 모든 맵에서 날씨 · NPC 공격을 막아 줍니다`, "ok", 4000);
        onChange(); render();
    }
    async function checkout() {
        if (!(await confirmBox(`🧳 ${lodge.name}에서 체크아웃할까요?\n지금 바로 방을 비웁니다 (남은 예약 기간은 환불되지 않습니다).`, "체크아웃", "취소"))) return;
        const r = LF.checkOut(pid, lodge.k);
        if (!r.ok) return toast(r.why, "warn");
        Sound.click?.(); toast("🧳 체크아웃했습니다", "ok");
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
        el.title = w.hp ? `${w.name}: 이 맵에서 1분마다 HP −${w.hp} (숙소에 머물면 무사) · 날씨는 라운드마다 랜덤` : "맑음 — 날씨 피해 없음";
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
const coCard = (C, body) => h("div.ep-co", { style: { "--co": C.color } }, h("div.ep-co-head", h("span.ep-logo", C.emoji), h("div", h("b", C.name), h("small", C.instant ? `정원 ${C.cap}명 · 시즌당 최대 ${C.perSeason}명 채용 (최소 ${C.minPerSeason}명) · 이번 시즌 ${EP.volHired()}/${C.perSeason}명` : `정원 ${C.cap}명 · 시즌당 최대 ${C.perSeason}명 채용 · 지원자 최대 ${L.APPLY_MAX}명`))), body);
export function employView(pid, { turn = null, onChange = () => { } } = {}) {
    const wrap = h("div.ep-view");
    const render = () => {
        const s = G.S(), mine = EP.appsOf(pid), acc = account(pid), offers = EP.offersOf(pid);
        wrap.replaceChildren(
            h("div.ep-head", h("span.ep-big", "🏢"), h("div", h("h3", "취업 코너"), h("small.muted", `은행 계좌가 있어야 지원할 수 있습니다 · 시즌당 최대 ${L.APPLY_PER_SEASON}곳 (동시 지원 가능) · 지원 취소 불가 · 지원자가 다 차면 심사 시작 → 라운드마다 결과 통보`))),
            EP.employFrozen() ? h("p.notice.warn", `🧊 최종 ${EP.EMPLOY_FREEZE_AT}명 이하 — 이번 시즌 취업 지원이 마감되었습니다. 진행 중인 심사는 다음 시즌에 이어집니다.`) : null,
            !acc ? h("p.notice.warn", "🏦 Business Bank 계좌가 없습니다 — 은행에서 계좌를 먼저 만드세요") : h("p.notice", `🏦 내 계좌 ${acc.code} · 이번 시즌 지원 ${mine.length}/${L.APPLY_PER_SEASON}`),
            offers.length ? h("div.ep-offer", h("b", "🎉 최종 합격 통보가 있습니다!"), h("button.btn.gold", { onclick: async () => { await offerFlow(pid); onChange(); render(); } }, "입사 결정하기")) : null,
            arizalBox(pid, turn, () => { onChange(); render(); }),
            h("div.ep-list", L.COMPANY_LIST.map(C => {
                const st = EP.applyStatus(pid, C.id), c = EP.cohort(C.id), prog = EP.inProcess(C.id);
                const staff = EP.staffOf(C.id);
                return coCard(C, h("div.ep-co-body",
                    h("div.ep-req", h("small", "📋 지원자격"), h("span", C.reqText)),
                    h("div.ep-steps", C.instant ? h("span.ep-step", `⏱️ 지원 → ${C.waitSec}초 뒤 결과`) : C.stages.map((k, i) => h("span.ep-step", L.STAGE_LABEL(C, i)))),
                    h("ul.ep-perks", C.perks.map(x => h("li", x)), h("li.muted", C.promoText)),
                    h("div.ep-people", h("small", `🧑‍💼 진행 중인 지원자 ${prog.length}명${c ? ` (이번 시즌 ${c.list.length}/${L.APPLY_MAX}${c.started ? " · 심사 중" : ""})` : ""}`),
                        h("div.ep-faces", prog.length ? prog.map(a => h("span.ep-face" + (a.pid === +pid ? ".me" : ""), { title: `${nm(a.pid)} · S${a.season} · ${a.state === "offer" ? "최종 합격" : a.started ? L.STAGE_LABEL(C, Math.min(a.stage, C.stages.length - 1)) + " 진행 중" : "심사 대기"}` }, avatar(a.pid, 34, { effect: false }), h("small", a.state === "offer" ? "🎉" : a.started ? `${a.stage + 1}차` : "대기"))) : h("span.muted", "없음"))),
                    h("div.ep-people", h("small", `👔 직원 ${staff.length}/${C.cap}`), h("div.ep-faces", staff.slice(0, 12).map(x => h("span.ep-face", { title: `${nm(x.pid)}${x.manager ? " · 매니저" : ""}` }, avatar(x.pid, 28, { effect: false }), x.manager ? h("small", "👔") : null)), staff.length > 12 ? h("small", `+${staff.length - 12}`) : null)),
                    h("div.row", h("button.btn.ghost.small", { onclick: () => showOrg(C.id, pid) }, `🗂️ 조직도 보기 (CEO 🤖 ${L.CEO_NAME[C.id] || "Robot"})`)),
                    hrBox(C.id),
                    h("div.row.end", mine.includes(C.id) && !C.instant ? h("span.ep-applied", "✅ 지원 완료") : h("button.btn" + (st.ok ? ".gold" : ".ghost"), { disabled: !st.ok, title: st.why || "", onclick: () => apply(C) }, st.ok ? `지원하기${C.fee ? ` (${fmt(C.fee)}G)` : " (무료)"}${C.instant ? ` · ${C.applyMax - st.left + 1}/${C.applyMax}회째` : ""}` : `🚫 ${st.why}`))));
            })),
            notesBox(pid));
    };
    async function apply(C) {
        if (!timeOk(turn)) return;
        if (!(await confirmBox(`${C.emoji} ${C.name}에 지원할까요?\n${C.fee ? `지원료 ${fmt(C.fee)}G — ` : ""}지원은 취소할 수 없습니다.`, "지원하기", "취소"))) return;
        const r = EP.applyTo(pid, C.id);
        if (!r.ok) return toast(r.why, "warn");
        if (r.instant) { Sound.coin(); await volWait(pid, C); onChange(); render(); return; }
        Sound.coin(); toast(r.full ? `📨 지원 완료! 지원자 ${L.APPLY_MAX}명이 모여 심사가 시작됩니다 (다음 라운드에 1차 결과)` : `📨 지원 완료! (지원자 ${r.n}/${L.APPLY_MAX} — 다 차면 심사 시작)`, "ok", 4200);
        onChange(); render();
    }
    render();
    return wrap;
}
// 🤲 Voluntary Inc.: the 30-second wait for the result — closing this window (or ending the turn) before it = 탈락
async function volWait(pid, C) {
    const left = () => Math.max(0, Math.ceil(((EP.volPending(pid)?.until || 0) - Date.now()) / 1000));
    const num = h("b.vol-sec", String(left())), bar = h("i"), body = h("div.vol-wait", avatar(pid, 84),
        h("p", `${C.emoji} ${C.name} 서류 심사 중…`), num, h("div.vol-bar", bar),
        h("p.muted.small", "⚠️ 결과가 나오기 전에 이 창을 닫거나 턴을 끝내면 탈락합니다"));
    const m = modal(body, { title: `${C.emoji} ${C.name} 심사 결과 대기` });
    let result = null;
    await new Promise(res => {
        const iv = setInterval(() => {
            const s = left();
            num.textContent = String(s); bar.style.width = `${100 - (s / C.waitSec) * 100}%`;
            if (s <= 0) { clearInterval(iv); result = EP.volResolve(pid); res(); }
        }, 250);
        m.closed.then(() => { if (result) return; clearInterval(iv); result = EP.volResolve(pid, { abandon: true }); res(); });
    });
    if (!result) return;
    if (result.left) { Sound.lose(); toast(`❌ ${C.name} 탈락 — 결과 발표 전에 자리를 떠났습니다`, "warn", 4000); return; }
    result.pass ? (Sound.fanfare(), confetti(60, ["🤲", "🎉", "✨"])) : Sound.lose();
    body.replaceChildren(avatar(pid, 84), h("h3", result.pass ? "🎉 최종 합격!" : "❌ 불합격"),
        h("div.co-promo-parts", ...result.why.map(w => h("span", w)), h("b", `= ${result.chance}%`)),
        h("p", result.pass ? "계좌 코드 4자리를 연동하면 입사합니다 (취업 코너의 '입사 결정하기')" : `심사 결과 ${result.roll} ≥ ${result.chance}`),
        h("div.row.end", h("button.btn.gold", { onclick: () => m.close() }, "확인")));
    await m.closed;
}
// 🧾 a company's HR record: who joined / was promoted / quit / was fired (and applied / passed), and when
const HR_ICON = { apply: "📨", pass: "✅", fail: "❌", hire: "🎉", decline: "🙅", promo: "📈", promo_fail: "📉", quit: "🚪", fire: "📭", gift: "🎁", seat: "🗂️", mission: "🎯", mission_fail: "⌛", warn: "⚠️" };
const HR_FILTERS = [["staff", "👔 직원 기록"], ["all", "📋 전체"]];
const HR_STAFF = new Set(["hire", "promo", "promo_fail", "quit", "fire", "gift", "seat", "mission", "mission_fail", "warn"]);
export function hrBox(co, { open = false } = {}) {
    let mode = "staff";
    const body = h("div.ep-hr-body");
    const draw = () => {
        const list = EP.hrOf(co).filter(r => mode === "all" || HR_STAFF.has(r.kind));
        body.replaceChildren(
            h("div.ep-hr-tabs", HR_FILTERS.map(([k, label]) => h("button.sub-tab" + (mode === k ? ".on" : ""), { onclick: e => { e.preventDefault(); mode = k; draw(); } }, label))),
            list.length ? h("div.ep-hr-list", list.slice(0, 60).map(r => h("div.ep-hr-row.k-" + r.kind,
                h("span.ep-hr-ico", HR_ICON[r.kind] || "•"), avatar(r.pid, 24, { effect: false }),
                h("b", nm(r.pid)), h("span.ep-hr-text", r.text),
                h("small.muted", `${new Date(r.t).toLocaleDateString()}${r.season ? ` · S${r.season}${r.round ? ` R${r.round}` : ""}` : ""}`))))
                : h("p.muted.small", "기록이 없습니다"));
    };
    draw();
    return h("details.ep-hr", open ? { open: true } : {}, h("summary", `🧾 인사기록 (${EP.hrOf(co).filter(r => HR_STAFF.has(r.kind)).length})`), body);
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
        EP.ensureOrg(C.id);
        const staff = EP.staffOf(C.id);
        wrap.replaceChildren(
            coCard(C, h("div.ep-co-body",
                h("div.ep-badge-big", companyMark(pid, 44), h("div", h("b", `${nm(pid)} — ${EP.teamOf(pid) ? `${EP.teamOf(pid).emoji} ${EP.teamOf(pid).name} ` : ""}${EP.roleLabel(x)}${x.promos ? ` · 호봉 ${x.promos}/3` : ""}${x.warns ? ` · ⚠️ 경고 ${x.warns}/${L.WARN_MAX}` : ""}`), h("small.muted", `입사 ${new Date(x.at).toLocaleDateString()}${x.season ? ` (시즌 ${x.season})` : ""} · 급여 계좌 ${x.code}`))),
                h("div.ep-pay", h("div", h("small", "라운드 급여"), h("b", `${fmt(x.pay)} G`)), C.pts ? h("div", h("small", "라운드 포인트"), h("b", `${C.pts} P`)) : null, h("div", h("small", "급여 입금"), h("b", `🏦 ${x.code}`))),
                h("ul.ep-perks", C.perks.map(p => h("li", p)), h("li.muted", C.promoText)),
                missionBox(pid),
                promoBox(pid, render),
                C.pantry ? h("div.row", h("button.btn" + (pantryOpen ? ".gold" : ".ghost"), { onclick: () => { pantryOpen = !pantryOpen; render(); } }, `🥤 HYHG Pantry (라운드당 1회 무료 · 남은 ${LF.pantryLeft(pid)})`)) : null,
                C.pantry && pantryOpen ? foodCornerView(pid, LF.innerCorner("hyhg_pantry"), "pantry", { turn, onChange }) : null,
                h("div.ep-people", h("small", `👥 동료 ${staff.length}/${C.cap}`), h("div.ep-faces", staff.map(s => h("span.ep-face" + (s.pid === +pid ? ".me" : ""), { title: `${nm(s.pid)}${s.manager ? " · 매니저" : ""}` }, avatar(s.pid, 30, { effect: false }), s.manager ? h("small", "👔") : null)))),
                h("details.org-wrap", { open: true }, h("summary", "🗂️ 조직도"), orgChartView(C.id, { me: pid })),
                hrBox(C.id, { open: true }),
                h("div.row.end", h("button.btn.ghost.ep-quit", { onclick: quit }, "🚪 자진 퇴사하기")))),
            notesBox(pid));
    };
    async function quit() {
        const x = EP.employer(pid), C = EP.companyOf(pid);
        if (!x || !C) return;
        if (!(await confirmBox(`${C.emoji} ${C.name}에서 정말 자진 퇴사할까요?\n• 급여 · 직원 혜택이 바로 끊깁니다${x.manager ? "\n• 매니저 직급도 사라집니다" : x.promos ? `\n• 호봉 ${x.promos}/3 기록도 사라집니다` : ""}\n• 회사 코너가 없어지고 취업 코너가 다시 생깁니다`, "퇴사하기", "취소"))) return;
        const r = EP.quitJob(pid);
        if (!r.ok) return toast(r.why, "warn");
        Sound.lose(); toast(`🚪 ${C.name} 퇴사 — 취업 코너가 다시 열렸습니다`, "info", 3500);
        onChange();
    }
    render();
    return wrap;
}
// 🗂️ a company's org chart: the robot CEO on top, then each team — manager seat (+ 부매니저 seats) + staff seats
export function orgChartView(co, { me = null } = {}) {
    const C = L.COMPANIES[co], o = EP.orgChart(co);
    const seat = (x, kind, T) => {
        const mgr = kind === "mgr", sub = kind === "sub", label = mgr ? (T.mgrLabel || "매니저") : sub ? "부매니저" : "";
        return x
            ? h("span.org-seat" + (mgr ? ".mgr" : sub ? ".sub" : "") + (+x.pid === +me ? ".me" : ""), { title: `${nm(x.pid)}${label ? " · " + label : ""}${x.warns ? ` · ⚠️ 경고 ${x.warns}` : ""}` }, avatar(x.pid, mgr ? 34 : sub ? 30 : 28, { effect: false }), h("small", mgr ? `👔 ${nm(x.pid)}` : sub ? `🎖️ ${nm(x.pid)}` : nm(x.pid)))
            : h("span.org-seat.empty" + (mgr ? ".mgr" : sub ? ".sub" : ""), h("i", mgr ? "👔" : sub ? "🎖️" : "🪑"), h("small", label ? `${label} 공석` : "공석"));
    };
    return h("div.org", { style: { "--co": C.color } },
        h("div.org-ceo", h("span.org-bot", "🤖"), h("div", h("small", `${C.emoji} ${C.name} CEO`), h("b", L.CEO_NAME[co] || "Robot CEO"))),
        h("div.org-line"),
        h("div.org-teams", o.teams.map(T => h("div.org-team" + (T.kind === "work" ? ".work" : ""),
            h("div.org-team-head", h("b", `${T.emoji} ${T.name}`), h("small", `${T.members.length}/${T.staff}${T.subs ? ` · 부 ${T.subList.length}/${T.subs}` : ""}`)),
            T.noMgr ? null : seat(T.manager, "mgr", T),
            T.subs ? h("div.org-staff.org-subs", Array.from({ length: T.subs }, (_, i) => seat(T.subList[i], "sub", T))) : null,
            h("div.org-staff", Array.from({ length: T.staff }, (_, i) => seat(T.members[i], "staff", T)))))),
        o.waiting.length ? h("p.muted.small", `🕓 배치 대기: ${o.waiting.map(x => nm(x.pid)).join(", ")}`) : null);
}
function showOrg(co, me) {
    const C = L.COMPANIES[co];
    modal(orgChartView(co, { me }), { title: `🗂️ ${C.emoji} ${C.name} 조직도`, wide: true });
}
// 🎯 my in-company mission (3 rounds of play to finish it) + ⚠️ warnings + 👔 promotion request
function missionBox(pid) {
    const x = EP.employer(pid), m = x?.mission, C = EP.companyOf(pid);
    if (!m) return null;
    const left = EP.missionRoundsLeft(m);
    const st = m.state === "active" ? `진행 중 · 남은 기한 ${left}라운드 (플레이한 라운드만 셉니다 · 탈락 중엔 멈춤)` : m.state === "done" ? "✅ 완료" : "⌛ 실패";
    const prog = EP.missionProgress(m), avg = EP.avgSinceHire(pid);
    return h("div",
        h("div.co-warns" + ((x.warns || 0) >= 2 ? ".hot" : ""), h("b", `⚠️ 경고 ${x.warns || 0}/${L.WARN_MAX}`),
            h("span", Array.from({ length: L.WARN_MAX }, (_, i) => h("i" + (i < (x.warns || 0) ? ".on" : ""), "⚠️"))),
            h("small.muted", `입사 후 평균 ${avg != null ? avg.toFixed(1) + "위" : "기록 없음"} · 평균 ${C.warnAvg}위 이하 / 사내 미션 실패 → 경고 · ${L.WARN_MAX}회면 해고`)),
        h("div.co-mission.s-" + m.state, h("small", "🎯 사내 미션"), h("b", EP.missionText(m)), prog ? h("span.co-mission-prog", prog) : null,
            h("small.muted", `${st} · 누적 완료 ${x.mdone || 0} · 실패 ${x.mfail || 0}`)));
}
function promoBox(pid, rerender) {
    const x = EP.employer(pid);
    if (!x || x.role === "manager" || EP.teamOf(pid)?.noPromo) return null;
    const st = EP.promoStatus(pid), ck = EP.promoCheck(pid), to = ck.seat?.label || "매니저";
    return h("div.co-promo",
        h("div.co-promo-head", h("b", `👔 진급 신청 (→ ${to})`), h("small.muted", `예상 확률 ${ck.chance}%`)),
        h("ul.co-promo-checks", ck.checks.map(c => h("li" + (c.ok ? ".ok" : ".no"), `${c.ok ? "✅" : "⬜"} ${c.label}`, h("small.muted", ` — ${c.text}`)))),
        h("div.co-promo-parts", ck.parts.map(([k, v]) => h("span" + (v > 0 ? ".on" : ""), `${k} ${v >= 0 ? "+" : ""}${v}%`)), h("b", `= ${ck.chance}%`)),
        h("p.muted.small", "진급은 확률 심사라 100% 보장되지 않습니다 · 불합격하면 사내 미션을 1회 더 성공해야 다시 신청할 수 있습니다"),
        h("div.row.end", h("button.btn" + (st.ok ? ".gold" : ".ghost"), { disabled: !st.ok, title: st.why || "", onclick: apply }, st.ok ? "📝 진급 신청하기" : `🔒 ${st.why}`)));
    async function apply() {
        const C = EP.companyOf(pid);
        if (!(await confirmBox(`${C.emoji} ${C.name} ${to} 진급을 신청할까요?\n• 예상 확률 ${ck.chance}% (보장되지 않음)\n• 불합격하면 사내 미션을 1회 더 성공해야 다시 신청할 수 있습니다`, "신청하기", "취소"))) return;
        const r = EP.applyPromotion(pid);
        if (!r.ok) return toast(r.why, "warn");
        r.promoted ? (Sound.fanfare(), confetti(60, ["👔", "🎉", "✨"])) : Sound.lose();
        modal(h("div.co-promo-result" + (r.promoted ? ".win" : ".lose"), avatar(pid, 96), h("h3", r.promoted ? `🎉 ${r.seat.label} 진급!` : "📉 진급 불합격"),
            h("ul.co-promo-checks", r.checks.map(c => h("li" + (c.ok ? ".ok" : ".no"), `${c.ok ? "✅" : "❌"} ${c.label}`, h("small.muted", ` — ${c.text}`)))),
            h("div.co-promo-parts", r.parts.map(([k, v]) => h("span", `${k} ${v >= 0 ? "+" : ""}${v}%`)), h("b", `= ${r.chance}%`)),
            h("p", r.promoted ? `급여 ${fmt(EP.employer(pid)?.pay || 0)}G` : r.basic ? `심사 결과 ${r.roll} ≥ ${r.chance} — 사내 미션을 1회 더 성공하면 다시 도전할 수 있습니다` : "기본 조건을 채우지 못했습니다")),
            { title: `${C.emoji} ${C.name} 진급 심사 결과` });
        rerender();
    }
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
            h("div.fc-grid.small", foods.map(([k, n]) => { const f = L.foodOfItem(k); return h("div.fc-item" + (f.food < 0 ? ".bad" : ""), foodArt(f.id, 44), h("b.fc-name", `${f.name} ×${n}`), h("span.fc-food" + (f.food < 0 ? ".neg" : ""), `🍚 ${f.food >= 0 ? "+" : ""}${f.food}${L.foodHp(f) ? ` ❤️ +${L.foodHp(f)}` : ""}`),
                h("button.btn.small.gold", { onclick: () => { const r = LF.eatFromBag(pid, k); if (!r.ok) return toast(r.why, "warn"); Sound.coin(); toast(`${f.emoji} 냠냠! 식량 → ${r.food}${r.hp ? ` · ❤️ HP +${Math.round(r.hp)}` : ""}`, "ok"); render(); onChange(); } }, "먹기")); })));
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
