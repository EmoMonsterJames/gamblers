// ================================================================ 📼 동행 · VHS Collection · 🎞️ 영화DB · 🎬 영화관 (screens)
//   covers: 뒷표지 | 중간표지 (spine — what you pull off the shelf) | 앞표지, drawn from the movie data + player pictures
//   the cinema plays a movie's script: brand → title → cast → story scenes (mumbled subtitles) → The End
import { h, fmt, sleep, put } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, modal, confetti, Activity } from "../core/fx.js";
import { Store } from "../core/store.js";
import * as G from "../game/season.js";
import * as V from "../game/vhs.js";
import * as D from "../data/vhs.js";
import { makeBattler } from "../emomon/game.js";
import { emoFight } from "./emoCorners.js";

import { spine, front, back, vhsBox, brandLogo } from "./vhsCover.js";
import { figure, setFigure } from "../ui/figure.js";
import { ambience, ambFor } from "./vhsAudio.js";
export { spine, front, back, vhsBox, brandLogo };

const pimg = pid => (pid != null ? Store.player(pid)?.profile_image : "") || "";
const stars = n => "★".repeat(n) + "☆".repeat(Math.max(0, 7 - n));
const brandOf = m => D.BRAND_BY_ID[m.brand] || D.BRANDS[0];
const rateOf = m => D.RATING_BY_ID[m.rating] || D.RATINGS[0];
const roleCast = (m, role) => D.castOf(m, role);
// a small round profile picture (lists — not the covers / the film)
const face = (c, size) => h("div.vc-face", { style: { width: size + "px", height: size + "px" } }, c?.pid != null && pimg(c.pid) ? h("img", { src: pimg(c.pid), alt: c.ko, draggable: "false" }) : h("span.vc-noimg", "👤"));

// ---------------------------------------------------------------- 🔞 age gate (a VHS 띠 이용권)
async function ageGate(pid, m, where) {
    if (where === "shop" ? V.unlocked(pid, m) : V.ageOk(pid, m)) return true;
    const r = rateOf(m), have = V.passCount(pid, m);
    if (!have) { toast(`🔞 ${r.name} 비디오입니다 (${D.AGE_ORDER[r.age]}부터) — VHS ${r.name} 이용권이 필요합니다 (🏪 일반 상점)`, "warn", 4500); return false; }
    if (!(await confirmBox(`🔞 ${r.name} 등급 (${D.AGE_ORDER[r.age]}부터) 비디오입니다.\nVHS ${r.name} 이용권 1장을 사용할까요? (보유 ${have}장)`, "이용권 사용", "취소"))) return false;
    const u = V.usePass(pid, m, where);
    if (!u.ok) { toast(u.why, "warn"); return false; }
    return true;
}

// ---------------------------------------------------------------- 📼 동행 (the VHS map of this location)
export function donghaengView(pid, loc, { turn, onChange = () => { } } = {}) {
    const wrap = h("div.vhs-dh");
    const draw = () => {
        const map = V.vhsMap(loc.id), v = V.visitOf(pid);
        const here = v && v.loc === loc.id ? map.nodes[v.i] : null;
        if (v && v.status === "in" && here) return put(wrap, shopInside(here));
        const cols = Math.max(...map.nodes.map(n => n.step)) + 1, W = Math.max(560, 150 * cols), rowH = 104;
        const X = s => 40 + s * ((W - 80) / Math.max(1, cols - 1));
        const Y = r => 50 + r * rowH;
        const pos = n => [X(n.step), Y(n.road)];
        const H = Y(map.roads - 1) + 60;
        const lines = map.nodes.map(n => { const [x2, y2] = pos(n); const p = n.from >= 0 ? map.nodes[n.from] : null; const [x1, y1] = p ? pos(p) : [X(0), Y(0)]; return [x1, y1, x2, y2, n]; });
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.classList.add("vhs-map-svg");
        for (const [x1, y1, x2, y2, n] of lines) {
            const ln = document.createElementNS(svgNS, "path");
            ln.setAttribute("d", `M${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`); ln.setAttribute("class", "vm-road");
            svg.append(ln);
            const tx = document.createElementNS(svgNS, "text");
            tx.setAttribute("x", (x1 + x2) / 2); tx.setAttribute("y", (y1 + y2) / 2 - 6); tx.setAttribute("class", "vm-sec"); tx.textContent = `${n.sec}초`;
            svg.append(tx);
        }
        const pin = h("div.vm-pin", h("img", { src: pimg(pid), alt: "" }), h("i", "📍"));
        const place = (x, y) => { pin.style.left = (x / W * 100) + "%"; pin.style.top = (y / H * 100) + "%"; };
        const start = h("div.vm-start", { style: { left: (X(0) / W * 100) + "%", top: (Y(0) / H * 100) + "%" } }, h("img", { src: pimg(pid), alt: "" }), h("small", "출발"));
        const nodes = map.nodes.map((n, i) => {
            const [x, y] = pos(n), k = D.SHOP_BY_ID[n.kind];
            return h("button.vm-node.k-" + n.kind + (here?.i === i ? ".here" : ""), { style: { left: (x / W * 100) + "%", top: (y / H * 100) + "%" }, disabled: !!v, title: `${D.shopRule(k)}\n${D.shopDoor(k)}`, onclick: () => go(i) },
                h("b", `${n.n}. ${n.name}`), h("small", `🕒 ${n.total}초`), h("i.vm-ico", k.gear ? { wings: "🪽", oxygen: "🤿", space_suit: "🧑‍🚀" }[k.gear] : k.fee || k.feePts ? "💰" : k.battle ? "⚔" : k.resident ? "🛂" : k.chance ? "🎲" : "📼"));
        });
        if (here) { const [x, y] = pos(here); place(x, y); } else place(X(0), Y(0));
        const board = h("div.vhs-map-scroll", h("div.vhs-map", { style: { aspectRatio: `${W} / ${H}`, minWidth: `${Math.min(W, 1200)}px` } }, svg, start, ...nodes, pin));
        const legend = h("div.vhs-legend", map.nodes.slice().sort((a, b) => a.n - b.n).map(n => { const k = D.SHOP_BY_ID[n.kind]; return h("div.vl-row", h("b", `${n.n}. ${n.name}`), h("small", `${D.shopRule(k)} · ${D.shopDoor(k)} · 🕒 ${n.total}초`)); }));
        put(wrap,
            h("div.vhs-head", h("div.big", "📼"), h("div", h("h3", `동행 · ${loc.name}의 VHS 비디오 가게`), h("p.muted.small", "가게를 누르면 프로필 PIN이 그 가게로 이동합니다. 가는 길의 시간(초)만큼 플레이 시간이 줄어듭니다 · 라운드당 1곳만 선택해서 입장할 수 있습니다."))),
            v ? h("p.notice" + (v.status === "no" ? ".warn" : ""), v.status === "no" ? `🚫 이번 라운드에 ${map.nodes[v.i]?.name || "비디오 가게"} 입장에 실패했습니다. 다음 라운드에 다시 오세요.` : v.loc !== loc.id ? `이번 라운드에는 이미 ${V.locName(v.loc)}의 ${vhsMapName(v)}에 다녀왔습니다.` : "가게 앞입니다.") : null,
            v && v.status === "walk" && here ? doorBox(here) : null,
            board, h("details.vhs-legend-d", h("summary", `🗺️ 가게 목록 (${map.nodes.length})`), legend));
        async function go(i) {
            const n = map.nodes[i], k = D.SHOP_BY_ID[n.kind];
            if (!(await confirmBox(`${n.n}. ${n.name}(으)로 갈까요?\n가는 데 ${n.total}초가 걸리고 플레이 시간에서 차감됩니다.\n${D.shopRule(k)}\n🚪 ${D.shopDoor(k)}\n\n(라운드당 1곳만 선택할 수 있습니다)`, "🚶 출발", "취소"))) return;
            const r = V.goTo(pid, loc.id, i, turn);
            if (!r.ok) return toast(r.why, "warn");
            const done = Activity.hold();
            try {
                const path = V.pathTo(map, i);
                for (const p of path) { const [x, y] = pos(p); place(x, y); Sound.tick(); await sleep(650); }
            } finally { done(); }
            onChange(); draw();
        }
    };
    const vhsMapName = v => V.vhsMap(v.loc).nodes[v.i]?.name || "비디오 가게";
    function doorBox(n) {
        const k = D.SHOP_BY_ID[n.kind];
        return h("div.vhs-door", h("div.big", "🚪"), h("div", h("b", `${n.n}. ${n.name}`), h("small", D.shopRule(k)), h("small", `🚪 ${D.shopDoor(k)}`)),
            h("button.btn.gold.big", { onclick: async e => {
                e.target.disabled = true;
                const r = V.knock(pid);
                if (!r.ok) { toast(r.why, "warn"); draw(); return; }
                if (r.battle) {
                    const foe = makeBattler();
                    const f = await emoFight(pid, { mon: foe }, { title: `⚔ Battle VHS — ${foe.trainer}`, foeLabel: foe.trainer });
                    V.settleBattle(pid, !!f.won);
                    f.won ? (Sound.fanfare(), toast("⚔ 승리! Battle VHS에 입장합니다", "ok")) : (Sound.lose(), toast("💥 패배… 입장하지 못했습니다 (이모몬스터 HP · 질병은 그대로)", "warn", 4000));
                } else { Sound.tease(); await sleep(700); r.in ? (Sound.win(), toast(`🚪 입장! ${r.why}`, "ok")) : (Sound.lose(), toast(`🚫 ${r.why}`, "warn")); }
                onChange(); draw();
            } }, k.battle ? "⚔ 배틀하고 입장" : "🚪 들어가기"));
    }
    function shopInside(n) {
        const k = D.SHOP_BY_ID[n.kind], list = V.shelf(loc.id, n.i);
        return h("div.vhs-shop.k-" + n.kind,
            h("div.vhs-shop-sign", h("span", "📼"), h("b", n.name), h("small", D.shopRule(k))),
            h("p.muted.small", `진열대에서 비디오를 꺼내 보세요 (표지 꺼내기 ${fmt(D.COVER_FEE[0])}~${fmt(D.COVER_FEE[1])}G · 구입 ${fmt(D.BUY_PRICE[0])}~${fmt(D.BUY_PRICE[1])}G — 희귀도가 높을수록 · 작품성이 낮을수록 · 코미디/공포/성인 장르일수록 · 높은 등급일수록 비쌉니다). 연령에 맞지 않는 비디오는 표지를 보기 전에 VHS 띠 이용권이 필요합니다.`),
            list.length ? h("div.vhs-shelf", list.map(m => spine(m, { onclick: () => pull(m) }))) : h("p.notice", "오늘은 진열된 비디오가 없습니다."),
            h("p.muted.small", `💰 보유 ${fmt(G.S().ps[pid].money)}G`));
    }
    async function pull(m) {
        // 🔞 first the age (or a 띠 이용권) · then the fee to pull the cover off the shelf
        if (!(await ageGate(pid, m, "shop"))) return;
        if (!V.coverPaid(pid, m)) {
            const fee = V.coverFee(m);
            if (!(await confirmBox(`📼 ${m.ko} — 비디오 표지를 꺼내 볼까요?\n표지 꺼내기 비용 ${fmt(fee)}G (이번 방문 동안 다시 볼 때는 무료)\n💰 보유 ${fmt(G.S().ps[pid].money)}G`, `💰 ${fmt(fee)}G 내고 꺼내기`, "취소"))) return;
            const r = V.payCover(pid, m);
            if (!r.ok) return toast(r.why, "warn");
            Sound.cash();
            onChange();
        }
        Sound.click();
        const owned = V.owns(pid, m.id), price = V.priceOf(m);
        const pm = modal(h("div.vhs-pull", vhsBox(m),
            h("div.vhs-pull-info", h("b", D.titleText(m)), h("small", `${m.genres.join(" · ")} · 희귀도 ${stars(m.stars)} · ${D.ratingText(m.rating)}`),
                h("button.btn.gold.big", { disabled: owned, onclick: async () => {
                    if (!(await confirmBox(`${m.ko}을(를) ${fmt(price)}G에 살까요?`, "구입", "취소"))) return;
                    const r = V.buy(pid, m);
                    if (!r.ok) return toast(r.why, "warn");
                    Sound.cash(); confetti(30, ["📼", "✨"]); toast(`📼 ${m.ko} — VHS Collection에 꽂았습니다!`, "ok", 3500);
                    pm.close(); onChange(); draw();
                } }, owned ? "✅ 이미 소장 중" : `🛒 ${fmt(price)}G에 구입`))), { title: `📼 ${n0()}`, wide: true, cls: "vhs-modal" });
    }
    const n0 = () => { const v = V.visitOf(pid); return v ? V.vhsMap(v.loc).nodes[v.i]?.name : "VHS"; };
    draw();
    return wrap;
}

// ---------------------------------------------------------------- 📚 VHS Collection (a cabinet per player)
export function collectionView(pid, { onWatch = null } = {}) {
    const wrap = h("div.vhs-col");
    let by = "genre";
    const draw = () => {
        const own = V.collection(pid);
        const groups = {};
        for (const x of own) { const m = x.m; const key = by === "genre" ? m.genres[0] : `★${m.stars}`; (groups[key] ||= []).push(m); }
        const keys = Object.keys(groups).sort((a, b) => by === "genre" ? D.GENRES.indexOf(a) - D.GENRES.indexOf(b) : b.localeCompare(a));
        put(wrap,
            h("div.vhs-head", h("div.big", "📚"), h("div", h("h3", "VHS Collection"), h("p.muted.small", `소장 비디오 ${own.length}개 · 비디오를 눌러 꺼내면 앞표지 → 뒷표지 순서로 볼 수 있습니다 (시즌이 바뀌어도 계속 보관됩니다)`))),
            h("div.bk-tabs", [["genre", "🎭 장르별"], ["stars", "⭐ 희귀도별"]].map(([k, l]) => h("button.bk-tab" + (k === by ? ".on" : ""), { onclick: () => { by = k; draw(); } }, l))),
            own.length ? h("div.vhs-cabinet", keys.map(k => h("div.vhs-cab-row", h("div.vhs-cab-label", by === "genre" ? `${D.GENRE_EMOJI[k] || ""} ${k}` : k), h("div.vhs-shelf", groups[k].sort((a, b) => b.stars - a.stars).map(m => spine(m, { onclick: () => look(m) }))))))
                : h("p.notice", "아직 비디오가 없습니다. 📼 동행 코너에서 비디오 가게를 찾아 보세요."));
    };
    async function look(m) {
        if (!(await ageGate(pid, m, "view"))) return;
        Sound.click();
        const stage = h("div.vhs-flip");
        let side = "front";
        const show = () => { put(stage, side === "front" ? front(m) : back(m)); btn.textContent = side === "front" ? "🔄 뒷표지 보기" : "🔄 앞표지 보기"; };
        const btn = h("button.btn.ghost", { onclick: () => { side = side === "front" ? "back" : "front"; Sound.whoosh(); stage.classList.remove("turn"); void stage.offsetWidth; stage.classList.add("turn"); show(); } });
        const pm = modal(h("div.vhs-look", stage, h("div.row.center", btn, onWatch ? h("button.btn.gold", { onclick: () => { pm.close(); onWatch(m); } }, "🎬 영화관에서 보기") : null)), { title: `📼 ${D.titleText(m)}`, cls: "vhs-modal" });
        show();
    }
    draw();
    return wrap;
}

export const dbCard = m => h("div.vhs-db-card",
    h("h4", m.ko, h("small", ` ${m.en}`)),
    h("dl",
        h("dt", "희귀도"), h("dd.st", stars(m.stars)),
        h("dt", "장르"), h("dd", m.genres.join(" · ") + (m.lgbtq ? " · 🏳️‍🌈 LGBTQ" : "")),
        h("dt", "작품성"), h("dd.st", stars(m.quality)),
        h("dt", "영화 원제"), h("dd", m.en),
        h("dt", "한글 출시명"), h("dd", m.ko),
        h("dt", "제작년월일"), h("dd", m.date.replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, mo, d) => `${+y}년 ${+mo}월 ${+d}일`)),
        h("dt", "제작국가"), h("dd", m.nation),
        h("dt", "비디오브랜드"), h("dd", brandOf(m).name),
        h("dt", "등급"), h("dd", D.ratingText(m.rating)),
        h("dt", "출연 배우"), h("dd", h("ul", m.cast.map(c => h("li", h("b.mdb-part-tag.p-" + c.part, V.PART_KO[c.part]), ` · ${c.ko} — ${c.role}${c.nude ? " (Nudity)" : c.sexy ? " (Sexy)" : ""}`)))),
        h("dt", "Body Count"), h("dd", (d => d.length ? `💀 총 ${d.length}명 — ${d.map(c => `${c.ko} (${c.role})`).join(", ")}` : "0명")(D.bodyCountOf(m))),
        h("dt", "줄거리"), h("dd", m.plot)));

// ---------------------------------------------------------------- 🎬 영화관 (under 💰 Money)
export function cinemaView(pid, { turn = null, onChange = () => { } } = {}) {
    const wrap = h("div.vhs-cinema");
    let sel = null;
    const draw = () => {
        const own = V.collection(pid).map(x => x.m), left = V.cinemaLeft(pid);
        const m = own.find(x => x.id === sel) || null;
        put(wrap,
            h("div.vhs-head", h("div.big", "🎬"), h("div", h("h3", "영화관"), h("p.muted.small", `내 VHS를 넣어 재생합니다 (시즌당 ${V.CINEMA_PER_SEASON}회 · 남은 상영 ${left}회). 감상하는 동안 플레이 시간은 멈춥니다. 끝나면 관람 보상 ${fmt(V.VIEWER_PAY[0])}~${fmt(V.VIEWER_PAY[1])}G (희귀도가 높을수록 · 작품성이 낮을수록 큼) + 출연 배우들도 보상을 받습니다 (🔞 Nudity +${fmt(V.ROLE_BONUS.nude)}G · 💋 Sexy +${fmt(V.ROLE_BONUS.sexy)}G · 💀 Body Count +${fmt(V.ROLE_BONUS.body)}G 추가). 재생 중 ⏸ 일시정지를 눌러도 플레이 시간에는 영향이 없습니다.`))),
            h("div.vhs-player-deck", h("div.vhs-slot" + (m ? ".in" : ""), m ? spine(m, { small: true }) : h("span", "📼 비디오를 넣어 주세요")),
                h("button.btn.gold.big", { disabled: !m || left <= 0, onclick: () => play(m) }, left <= 0 ? "이번 시즌 상영을 모두 썼습니다" : "▶ 재생")),
            own.length ? h("div.vhs-shelf", own.map(x => spine(x, { onclick: () => { sel = x.id; Sound.click(); draw(); } }))) : h("p.notice", "VHS Collection에 비디오가 없습니다."));
    };
    async function play(m) {
        if (!(await ageGate(pid, m, "view"))) return;
        if (!(await confirmBox(`${m.ko}을(를) 재생할까요? (${Math.round(D.scriptSeconds(m) / 6) / 10}분 · 관람 보상 ${fmt(V.viewerPay(m))}G)\n이번 시즌 남은 상영 ${V.cinemaLeft(pid)}회 → ${V.cinemaLeft(pid) - 1}회`, "▶ 재생", "취소"))) return;
        const r = V.cinemaPay(pid, m);
        if (!r.ok) return toast(r.why, "warn");
        const was = turn?.running;
        if (turn) turn.running = false;
        const done = Activity.hold();
        try { await playMovie(m); } finally { done(); if (turn) turn.running = was; }
        Sound.cash(); confetti(50, ["🎬", "🪙", "✨"]);
        const pm = modal(h("div.vhs-pay", h("div.big", "🎬"), h("h3", `${m.ko} 상영 종료`), h("div.vhs-pay-amt", `+${fmt(r.viewer)} G`), h("p.muted", "관람 보상"),
            h("div.vhs-pay-list", r.actors.map(a => {
                const extra = [a.bonus?.nude ? `🔞 Nudity +${fmt(a.bonus.nude)}` : "", a.bonus?.sexy ? `💋 Sexy +${fmt(a.bonus.sexy)}` : "", a.bonus?.body ? `💀 Body Count +${fmt(a.bonus.body)}` : ""].filter(Boolean);
                return h("div.vhs-pay-row", face(a, 34), h("b", a.ko), h("small", `${V.PART_KO[a.part]} · ${a.role}`, extra.length ? h("i.vhs-pay-bonus", ` (출연료 ${fmt(a.base)} · ${extra.join(" · ")})`) : null),
                    h("span", a.here ? `+${fmt(a.pay)}G` : a.wallet ? `+${fmt(a.pay)}G 👛 (시즌 참가 때 합류)` : "-"));
            })),
            h("button.btn.gold.big", { onclick: () => pm.close() }, "확인")), { title: "🎬 영화관 보상", cls: "vhs-modal" });
        await pm.closed;
        onChange(); draw();
    }
    draw();
    return wrap;
}

// ---------------------------------------------------------------- 🎵 little sound engine: background music + mumbled lines
let ac = null;
const actx = () => { try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended" && !filmPaused) ac.resume(); return ac; } catch { return null; } };
function tone(f, dur, { type = "square", vol = 0.04, at = 0, glide = 0 } = {}) {
    if (Sound.muted) return;
    const a = actx(); if (!a) return;
    const t0 = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (glide) o.frequency.linearRampToValueAtTime(f + glide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
// "웅얼웅얼" — a syllable blip per two characters, pitched by the speaker
export function mumble(text, seed = 0) {
    const n = Math.min(16, Math.max(3, Math.ceil(String(text).length / 2)));
    const base = 150 + (seed % 7) * 25;
    for (let i = 0; i < n; i++) tone(base + Math.random() * 90, 0.08 + Math.random() * 0.05, { type: "triangle", vol: 0.06, at: i * 0.13, glide: (Math.random() - 0.5) * 80 });
}
// scene sets → the place name shown at the top of a scene
export const BG_KO = { street: "거리", bank: "은행", hideout: "아지트", taxi: "택시 안", home: "집", forest: "숲", space: "우주", castle: "성", beach: "해변", night: "밤거리", stage: "무대", office: "사무실", campus: "대학교", room: "방", shower: "샤워실", ballroom: "무도회장",
    practice: "연습실", hallway: "복도", seats: "객석", country: "시골길", darkroad: "어두운 시골길", barnout: "헛간 앞", barn: "헛간", police: "경찰조사실",
    woods: "밤의 숲속", house: "하우스", school: "학교", classroom: "교실", moonhouse: "보름달 뜬 집 밖", church: "성당", funeral: "장례식장", funeralout: "장례식장 밖",
    agency: "탐정사무소", bedroom: "침실", camp: "숲속 파티", lake: "숲속 호숫가", hospital: "병원",
    jungle: "정글", junglenight: "정글 · 밤", village: "Nuka 부족 마을", hut: "부족의 집" };
const NOTE = n => 220 * Math.pow(2, n / 12);
// 🥁 a short noise hit (snare / hi-hat) and a kick
let noiseBuf = null;
function drum(kind, at = 0) {
    if (Sound.muted) return;
    const a = actx(); if (!a) return;
    const t0 = a.currentTime + at;
    if (kind === "k") { // kick
        const o = a.createOscillator(), g = a.createGain();
        o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.14);
        g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + 0.18); return;
    }
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = kind === "h" ? "highpass" : "bandpass"; f.frequency.value = kind === "h" ? 7000 : 1800;
    const len = kind === "h" ? 0.04 : 0.12, vol = kind === "h" ? 0.03 : 0.06;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t0); s.stop(t0 + len + 0.02);
}
// 🎼 background tunes — each mood has its own melody, bass line, tempo, sound and drums (one step = an 8th note)
//   mel: semitones from A3 (null = rest) · bass: one note per bar half · drums: a 8-step pattern (k kick · s snare · h hi-hat)
const _ = null;
const STYLES = {
    comic:   { ko: "🤡 우스꽝스러운", bpm: 168, wave: "square", mel: [12, _, 16, _, 19, 16, 12, _, 14, _, 17, 14, 11, _, 7, _], bass: [0, 7, 5, 7], drums: "k_s_k_s_" },
    market:  { ko: "🧦 신나는 장터", bpm: 150, wave: "square", mel: [19, 19, 16, 19, 21, _, 19, _, 16, 16, 14, 16, 12, _, _, _], bass: [0, 5, 7, 0], drums: "khshkhsh" },
    chase:   { ko: "🏃 추격전", bpm: 200, wave: "sawtooth", mel: [12, 13, 12, 13, 15, 13, 12, 10, 12, 13, 12, 13, 17, 15, 13, 12], bass: [0, 0, 1, 0], drums: "kskskkss", vol: 0.016 },
    lounge:  { ko: "🍸 라운지 재즈", bpm: 96, wave: "sine", mel: [16, _, 19, 23, _, 21, 19, _, 14, _, 17, 21, _, 19, 16, _], bass: [0, 5, 2, 7], drums: "h_hhh_hh", swing: true },
    mystery: { ko: "🔍 미스터리", bpm: 110, wave: "triangle", mel: [12, _, 15, _, 18, _, 17, _, 12, _, 15, _, 20, _, 19, _], bass: [0, 0, 3, 6], drums: "k___h___" },
    club:    { ko: "🍾 클럽", bpm: 124, wave: "sawtooth", mel: [_, 12, _, 12, _, 15, _, 12, _, 17, _, 15, _, 12, _, 10], bass: [0, 0, 3, 5], drums: "khskkhsh", vol: 0.014 },
    noir:    { ko: "🕶️ 갱스터 느와르", bpm: 80, wave: "triangle", mel: [7, _, _, 8, 7, _, 3, _, 5, _, _, 3, 2, _, _, _], bass: [0, 0, 8, 7], drums: "k_h_s_h_", low: true },
    happy:   { ko: "😊 밝은", bpm: 132, wave: "square", mel: [12, 16, 19, 16, 21, 19, 16, 12, 14, 17, 21, 17, 19, _, _, _], bass: [0, 5, 7, 5], drums: "k_s_k_s_" },
    victory: { ko: "🎉 승리의 팡파르", bpm: 140, wave: "square", mel: [12, 12, 12, 16, _, 12, 16, 19, _, _, 24, _, 19, _, 24, _], bass: [0, 0, 5, 7], drums: "kkshkksh" },
    road:    { ko: "🚕 드라이브", bpm: 120, wave: "triangle", mel: [16, 19, 21, 19, 16, 14, 12, _, 14, 16, 19, 16, 14, 12, 9, _], bass: [0, 9, 5, 7], drums: "k_hsk_hs" },
    campus:  { ko: "🏫 캠퍼스", bpm: 126, wave: "triangle", mel: [12, _, 14, 16, _, 19, _, 16, 17, _, 16, 14, _, 12, _, _], bass: [0, 5, 9, 7], drums: "k_h_s_h_" },
    lullaby: { ko: "💤 자장가", bpm: 70, wave: "sine", mel: [19, _, 16, _, 14, _, 16, _, 12, _, _, _, 14, _, 16, _], bass: [0, 5, 0, 7] },
    romance: { ko: "💗 로맨스", bpm: 76, wave: "sine", mel: [16, _, 19, _, 23, _, 21, 19, 18, _, 19, _, 16, _, _, _], bass: [0, 9, 5, 7], drums: "____s___" },
    sexy:    { ko: "💋 섹시 색소폰", bpm: 84, wave: "sawtooth", mel: [12, _, 15, 17, _, 15, 12, _, 10, _, 12, _, _, _, _, _], bass: [0, 0, 5, 3], drums: "k__hs__h", swing: true, vol: 0.013 },
    bubbly:  { ko: "🫧 보글보글", bpm: 112, wave: "sine", mel: [24, 28, 31, 28, 26, 29, 33, 29, 24, 28, 31, 36, _, 31, _, _], bass: [0, 5, 0, 7], drums: "h_h_h_hh" },
    bitchy:  { ko: "💅 새침한", bpm: 104, wave: "square", mel: [15, _, 14, 15, _, 12, _, _, 15, _, 17, 15, 14, _, _, _], bass: [0, 0, 3, 3], drums: "k_s__ks_" },
    march:   { ko: "📢 안내 방송", bpm: 116, wave: "square", mel: [12, _, 12, 12, 16, _, 19, _, 17, _, 16, _, 14, _, 12, _], bass: [0, 7, 0, 7], drums: "k_s_k_ss" },
    sneaky:  { ko: "🤫 살금살금", bpm: 100, wave: "triangle", mel: [0, _, 2, _, 3, _, 5, _, 6, _, 5, _, 3, _, _, _], bass: [0, _, 0, _], drums: "h___h___", low: true },
    action:  { ko: "💥 액션", bpm: 150, wave: "sawtooth", mel: [12, 12, 15, 12, 17, 12, 15, 12, 19, 17, 15, 17, 12, _, 10, _], bass: [0, 0, 3, 5], drums: "kskskkss", vol: 0.015 },
    horror:  { ko: "👻 공포", bpm: 60, wave: "sine", mel: [0, _, _, 1, _, _, 6, _, _, _, 7, _, 6, _, 1, _], bass: [0, 1, 0, 6], low: true },
    tense:   { ko: "🔪 긴장", bpm: 96, wave: "triangle", mel: [12, 13, 12, 13, 12, 13, 12, 13, 15, 16, 15, 16, 15, 16, 15, 16], bass: [0, 0, 1, 0], drums: "k___k_k_" },
    smooth:  { ko: "🎷 부드러운", bpm: 84, wave: "sine", mel: [16, _, 19, _, 23, _, 26, _, 23, _, 19, _, 21, _, _, _], bass: [0, 5, 7, 4], drums: "h_h_s_h_", swing: true },
    sad:     { ko: "😢 슬픈", bpm: 70, wave: "triangle", mel: [12, _, 15, _, 19, _, 17, 15, 14, _, 12, _, 10, _, _, _], bass: [0, 8, 3, 7] },
    space:   { ko: "🛸 우주", bpm: 100, wave: "sine", mel: [24, _, 31, _, 26, _, 33, _, 24, _, 29, _, 31, _, _, _], bass: [0, 7, 2, 9] },
    fantasy: { ko: "🧚 판타지", bpm: 110, wave: "triangle", mel: [12, 16, 18, 21, 23, 21, 18, 16, 14, 18, 21, 25, 23, _, _, _], bass: [0, 4, 9, 7] },
    // 앙클베리: the bouncy 'Hurry Kid Me' chorus tune
    hurrykid: { ko: "🎤 Hurry Kid Me 합창", bpm: 152, wave: "square", mel: [12, 12, 16, 19, 21, 19, 16, _, 17, 17, 21, 24, 23, 21, 19, _, 12, 16, 19, 24, 21, 19, 16, 14, 12, 14, 16, 12, 19, _, 24, _], bass: [0, 5, 7, 0, 5, 7, 0, 7], drums: "khshkhsh" },
    // 헛간: a slow, out-of-tune music box · a lone heartbeat
    musicbox: { ko: "🎠 오르골 (으스스)", bpm: 76, wave: "sine", mel: [24, _, 31, _, 30, _, 24, _, 27, _, 26, _, 23, _, _, _], bass: [0, _, 6, _], low: true },
    heartbeat: { ko: "💓 심장 소리", bpm: 70, wave: "sine", mel: [_, _, _, _, _, _, 1, _, _, _, _, _, _, _, 0, _], bass: [0, _, _, _], drums: "kk______", low: true },
    // 늑대인간의 밤: a cosy morning · a church organ · a funeral dirge · the full-moon dread
    morning: { ko: "🌅 화목한 아침", bpm: 118, wave: "triangle", mel: [12, 16, 19, 16, 17, 21, 19, _, 14, 17, 21, 17, 16, _, 12, _], bass: [0, 5, 7, 0], drums: "k_h_k_h_" },
    organ: { ko: "⛪ 성당 오르간", bpm: 64, wave: "sine", mel: [12, _, 15, _, 19, _, 17, _, 15, _, 14, _, 12, _, _, _], bass: [0, 5, 3, 7], low: true },
    funeral: { ko: "⚱️ 장송곡", bpm: 54, wave: "sine", mel: [7, _, 7, 7, 10, _, 8, 8, 7, _, 7, 6, 7, _, _, _], bass: [0, 0, 5, 7], drums: "k_______", low: true },
    fullmoon: { ko: "🌕 보름달의 공포", bpm: 84, wave: "triangle", mel: [12, _, 13, _, 12, _, 18, _, 17, _, 13, _, 12, _, 11, _], bass: [0, 1, 6, 1], drums: "k__kk___", low: true }
};
// 🔊 one-shot sound effects a line can ask for (meta.sfx)
function sfx(kind) {
    if (Sound.muted) return;
    if (kind === "scream") { for (let i = 0; i < 3; i++) tone(1300 - i * 60, 0.9, { type: "sawtooth", vol: 0.035, at: i * 0.04, glide: -700 }); drum("s"); }
    else if (kind === "sting") { [0, 1, 6, 11].forEach(n => tone(NOTE(n - 12), 1.1, { type: "sawtooth", vol: 0.022 })); drum("k"); drum("s", 0.02); }
    else if (kind === "ring") { for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) tone(i % 2 ? 1180 : 1420, 0.05, { type: "square", vol: 0.025, at: r * 0.9 + i * 0.05 }); }
    else if (kind === "clap") { for (let i = 0; i < 26; i++) drum(i % 3 ? "s" : "h", i * 0.07 + Math.random() * 0.04); }
    else if (kind === "cough") { [0, 0.28, 0.5].forEach(t => { drum("s", t); tone(180, 0.12, { type: "sawtooth", vol: 0.03, at: t, glide: -60 }); }); }
    else if (kind === "sob") { for (let i = 0; i < 4; i++) tone(520 - i * 20, 0.28, { type: "triangle", vol: 0.04, at: i * 0.42, glide: -140 }); }
    else if (kind === "laugh") { for (let i = 0; i < 9; i++) tone(880 + (i % 2) * 120, 0.12, { type: "triangle", vol: 0.05, at: i * 0.16, glide: -90 }); tone(NOTE(-11), 1.8, { type: "sine", vol: 0.05 }); }
    // 🐺 a wolf's howl: rises, holds, falls away (two voices, a little apart)
    else if (kind === "howl") { tone(330, 0.9, { type: "sine", vol: 0.07, glide: 260 }); tone(590, 1.8, { type: "sine", vol: 0.07, at: 0.85, glide: -40 }); tone(550, 1.2, { type: "sine", vol: 0.06, at: 2.6, glide: -300 }); tone(220, 2.6, { type: "triangle", vol: 0.025, at: 0.3, glide: 160 }); }
    else if (kind === "growl") { for (let i = 0; i < 10; i++) tone(70 + Math.random() * 30, 0.14, { type: "sawtooth", vol: 0.04, at: i * 0.1 }); }
    else if (kind === "slash") { [0, 0.12, 0.24].forEach(t => { tone(2400, 0.12, { type: "sawtooth", vol: 0.03, at: t, glide: -1800 }); drum("h", t); }); }
    else if (kind === "shot") { drum("k"); drum("s"); drum("s", 0.01); tone(90, 0.4, { type: "sawtooth", vol: 0.06, glide: -50 }); }
    // 🌊 something dragged under the water: a deep gulp + a spray of noise
    else if (kind === "splash") { tone(160, 0.5, { type: "sine", vol: 0.08, glide: -110 }); for (let i = 0; i < 8; i++) drum(i % 2 ? "h" : "s", i * 0.05 + Math.random() * 0.03); }
    else if (kind === "drum") { [0, 0.28, 0.56, 0.7, 0.98, 1.26, 1.4].forEach((t, i) => drum(i % 3 === 2 ? "s" : "k", t)); } // 🥁 tribal drums
    else if (kind === "bell") { [0, 1.4].forEach(t => { tone(NOTE(-5), 2.2, { type: "sine", vol: 0.06, at: t }); tone(NOTE(7), 1.6, { type: "sine", vol: 0.025, at: t }); }); }
}
export const MUSIC_STYLES = Object.entries(STYLES).map(([k, s]) => [k, s.ko]);
// ⏸ the film is paused: the synth tunes stop stepping and the music files pause until it plays again
let filmPaused = false;
const filmAudios = new Set();
function setFilmPaused(on) {
    filmPaused = on;
    for (const a of filmAudios) { if (on) a.pause(); else a.play().catch(() => { }); }
    // the film's own synth sounds + ambience stand still
    try { if (ac) on ? ac.suspend() : ac.resume(); } catch { }
}
function music(style) {
    const S = STYLES[style] || STYLES.comic;
    const step8 = 60 / S.bpm / 2;
    let i = 0, alive = true;
    const step = () => {
        if (!alive || filmPaused) return;
        const at = S.swing && i % 2 ? step8 * 0.33 : 0;
        // bass: a long note at the start of each bar half (4 steps)
        if (i % 4 === 0) { const b = S.bass[Math.floor(i / 4) % S.bass.length]; if (b != null) tone(NOTE(b - (S.low ? 24 : 12)), step8 * 3.6, { type: S.low ? "sine" : "triangle", vol: 0.05 }); }
        const n = S.mel[i % S.mel.length];
        if (n != null) tone(NOTE(n), step8 * (S.wave === "sine" ? 1.8 : 0.9), { type: S.wave, vol: S.vol || (S.wave === "sine" ? 0.04 : 0.022), at });
        const d = S.drums?.[i % 8];
        if (d && d !== "_") drum(d, at);
        i++;
    };
    step();
    const id = setInterval(step, step8 * 1000);
    return () => { alive = false; clearInterval(id); };
}
// a movie's own music file (audio/movies/…) — loops until the next music starts · a synth tune if it can't play
function musicFile(url, fallback) {
    if (Sound.muted) return () => { };
    const a = new Audio(url);
    a.loop = true; a.volume = 0.55;
    let stopSynth = null, alive = true;
    filmAudios.add(a);
    if (!filmPaused) a.play().catch(() => { if (alive) { filmAudios.delete(a); stopSynth = music(fallback); } });
    return () => { alive = false; filmAudios.delete(a); a.pause(); a.src = ""; stopSynth?.(); };
}
// what a part asks for: a file ("audio/…"), a synth style, "stop", or nothing (keep what's playing)
const startMusic = (want, m) => /\.(mp3|ogg|m4a|wav)$/i.test(want) ? musicFile(want, m.music) : want === "stop" ? () => { } : music(want || m.music);

// ---------------------------------------------------------------- 🎞️ the film
export function playMovie(m) {
    return new Promise(resolve => {
        const screen = h("div.vhs-screen" + (m.bw ? ".bw" : ""));
        const bar = h("div.vhs-progress", h("i"));
        let skip = false, paused = false, stopMusic = () => { };
        // 🎬 the film has the room: every game sound (BGM · weather · map loops · music corner) pauses until it ends
        Sound.hold(true);
        // 🌧️ scene ambience
        const amb = ambience(actx);
        const setAmb = kinds => amb.set(Sound.muted ? [] : kinds);
        // ⏸ Pause: the film (scenes · lines · music · animations) stops where it is — the play time was already stopped for the film
        const pauseBtn = h("button.btn.ghost.small.vp-pause-btn", { onclick: () => setPause(!paused) }, "⏸ 일시정지");
        function setPause(on) {
            paused = on;
            setFilmPaused(on);
            screen.classList.toggle("paused", on);
            pauseBtn.textContent = on ? "▶ 재생" : "⏸ 일시정지";
            // (no PAUSE sign over the picture — the ▶ 재생 button brings it back)
        }
        const pm = modal(h("div.vhs-theater", screen, bar, h("div.row.center", pauseBtn, h("button.btn.ghost.small", { onclick: () => { skip = true; setPause(false); } }, "⏭ 끝까지 건너뛰기"))), { title: `🎬 ${D.titleText(m)}`, closable: false, wide: true, cls: "vhs-modal.theater" });
        // 💀 Body Count roll after The End (a few seconds more)
        const deaths = D.bodyCountInfo(m);
        const bcSec = deaths.length ? 4 + deaths.length * 2 : 0;
        const total = D.scriptSeconds(m) + bcSec;
        let elapsed = 0;
        const wait = async sec => { for (let t = 0; t < sec * 10 && !skip; t++) { await sleep(100); while (paused && !skip) await sleep(100); elapsed += 0.1; bar.firstChild.style.width = Math.min(100, elapsed / total * 100) + "%"; } };
        const b = brandOf(m);
        (async () => {
            try {
                for (const part of m.script || []) {
                    if (skip) break;
                    if (part.k !== "scene") setAmb([]); // titles · cast · The End: just the music
                    if (part.k === "brand") {
                        put(screen, h("div.vp-brand", brandLogo(b, 120), h("b", b.name), h("small", "presents")));
                        tone(NOTE(12), 0.4, { type: "sine", vol: 0.06 }); tone(NOTE(19), 0.6, { type: "sine", vol: 0.05, at: 0.35 });
                    } else if (part.k === "title") {
                        stopMusic(); stopMusic = startMusic(part.music, m);
                        // koImg: the Korean title is a picture (the movie's own title art)
                        const ko = h("div.vp-ko.f-" + (part.font || part.style || "bold") + (part.koImg ? ".img" : ""), part.koImg ? h("img", { src: part.koImg, alt: m.ko, draggable: "false" }) : m.ko);
                        // 🚀 "rockets": rockets fly over a pink screen, lip prints are stamped on it, then the Korean title comes in
                        const deco = part.style === "rockets" ? [
                            ...Array.from({ length: 7 }, (_, i) => h("i.vp-rk", { style: { "--y": (8 + i * 13) + "%", "--d": (i * 0.55) + "s", "--t": (2.4 + (i % 3) * 0.7) + "s", "--s": (i % 2 ? 1 : -1) } }, "🚀")),
                            ...Array.from({ length: 9 }, (_, i) => h("i.vp-lip", { style: { "--x": [12, 80, 30, 66, 88, 8, 50, 22, 74][i] + "%", "--y": [18, 14, 70, 76, 48, 46, 88, 34, 30][i] + "%", "--d": (0.8 + i * 0.45) + "s", "--r": [-20, 15, 30, -10, 25, -30, 5, 18, -24][i] + "deg" } }, "💋"))]
                            // 🎵 "fade": music notes float up a bright screen · the English title lights up, then dims
                            : part.style === "fade" ? Array.from({ length: 12 }, (_, i) => h("i.vp-note", { style: { "--x": (4 + i * 8) + "%", "--d": (i % 5) * 0.6 + "s", "--t": (3 + (i % 3)) + "s" } }, ["🎵", "🎶", "♪", "♫"][i % 4]))
                            // 🔥 "fire": a dark screen lit by a flickering fire · a heap of skulls shows faintly for a moment
                            : part.style === "fire" ? [h("div.vp-skulls", Array.from({ length: 4 }, (_, r) => h("div", "💀".repeat(5 + r * 2)))), h("i.vp-flame")]
                            // 🌕 "moon": a dark forest under a huge full moon — the camera looks up at it, the titles glow in its light
                            : part.style === "moon" ? [h("i.vp-moon"), h("i.vp-trees"), h("i.vp-clouds")]
                            // 🩸 "blood": a black screen, blood runs down from the top over the English title
                            : part.style === "blood" ? [h("div.vp-blood", Array.from({ length: 14 }, (_, i) => h("i", { style: { "--x": (i * 7.3 + 1) + "%", "--w": (8 + (i * 37) % 22) + "px", "--h": (30 + (i * 53) % 55) + "%", "--d": ((i * 0.37) % 1.6).toFixed(2) + "s" } })))]
                            // 🌴 "jungle": a plane flies over the jungle · through its window someone (part.peek) looks down · the English title, then the Korean title art spins in
                            : part.style === "jungle" ? [h("div.vp-canopy"), h("i.vp-plane", "✈️"),
                                part.peek && roleCast(m, part.peek) ? h("div.vp-porthole", h("div.vp-porthole-in", figure(roleCast(m, part.peek), { ...(roleCast(m, part.peek).look || {}), expr: "blank", pose: "down", upper: true, size: 420 }))) : null] : [];
                        const titleEl = h("div.vp-title.s-" + (part.style || "bold"), ...deco, h("div.vp-en", m.en), ko);
                        put(screen, titleEl);
                        // koClaw: a wolf's claw tears across the screen as the Korean title comes in
                        setTimeout(() => {
                            ko.classList.add("show"); titleEl.classList.add("ko-in"); if (part.koSfx) sfx(part.koSfx);
                            if (part.koClaw) { const c = h("div.vp-claw", h("i"), h("i"), h("i"), h("i")); titleEl.append(c); }
                        }, part.koAt ?? Math.min(2500, part.sec * 400));
                    } else if (part.k === "cast") {
                        // only: just these roles (in this order) · bg: the cast cards over a set (e.g. "jungle")
                        const list = part.only ? part.only.map(r => roleCast(m, r)).filter(Boolean) : m.cast.filter(c => (part.parts || ["lead", "support"]).includes(c.part));
                        const box = h("div.vp-cast" + (part.bg ? ".on-" + part.bg : ""));
                        put(screen, box);
                        const each = part.sec / Math.max(1, list.length);
                        const big = Math.round(Math.min(220, screen.clientHeight * 0.52));
                        for (const c of list) { if (skip) break; put(box, h("div.vp-cast-card", figure(c, { ...(c.look || {}), expr: "happy", pose: "wave", size: big }), h("b", c.ko), h("small", `as ${c.role}`), h("i", V.PART_KO[c.part]))); Sound.click(); await wait(each); }
                        continue;
                    } else if (part.k === "scene") {
                        await scene(part);
                        continue;
                    } else if (part.k === "end") {
                        if (part.music) { stopMusic(); stopMusic = startMusic(part.music, m); }
                        put(screen, h("div.vp-end", h("b", part.text || "The End"), part.credits ? h("div.vp-credits", m.cast.map(c => h("div", `${c.role} ····· ${c.ko}`)), h("div", brandOf(m).name)) : null));
                        tone(NOTE(12), 0.5, { type: "sine", vol: 0.05 }); tone(NOTE(7), 0.5, { type: "sine", vol: 0.05, at: 0.4 }); tone(NOTE(0), 0.9, { type: "sine", vol: 0.05, at: 0.8 });
                    }
                    await wait(part.sec);
                }
                // 💀 after The End and the credits: the Body Count, in the order they died
                if (!skip && deaths.length) {
                    put(screen, h("div.vp-end.vp-bodycount", h("b", "💀 Body Count"), h("div.vp-bc-total", `Body Count: 총 ${deaths.length}명`),
                        h("div.vp-bc-list", deaths.map((d, i) => h("div.vp-bc-row", { style: { "--d": (0.6 + i * 0.9) + "s" } },
                            d.scene ? h("span.vp-bc-scene", `'${d.scene}', `) : null, h("b", d.c.role), ` (${d.c.ko}) `, h("span.vp-bc-dots", "......."),
                            h("span", d.how || "사망."), d.off ? h("i.vp-bc-off", " (Off Screen)") : null)))));
                    sfx("sting");
                    await wait(bcSec);
                }
            } finally { stopMusic(); amb.stop(); setFilmPaused(false); Sound.hold(false); pm.close(); resolve(); }
        })();
        async function scene(sc) {
            const people = (sc.who || []).map(r => roleCast(m, r)).filter(Boolean);
            const nude = new Set(sc.nude || []), fullNude = new Set(sc.fullNude || []);   // fullNude: nothing on at all
            // how each actor starts the scene (scene.cast) · topless when the scene says so (a dancer's chest bounces)
            const base = people.map(c => { const o = { expr: "happy", pose: "down", ...(c.look || {}), ...(sc.cast?.[c.role] || sc.cast?.[c.short] || {}) }; if (fullNude.has(c.role) || fullNude.has(c.short)) o.nude = "full"; else if (nude.has(c.role) || nude.has(c.short)) o.nude = true; if (o.nude) o.jiggle = o.act === "dance"; return o; });
            const W = screen.clientWidth || 800, H = screen.clientHeight || 450;
            // a crowd (more than 7 on screen) stands in two rows, the back row a little higher
            const rows = people.length > 7 ? 2 : 1, perRow = Math.ceil(people.length / rows);
            //   (a grid of half-figure columns: the front row is shifted half a figure, so everyone in the back row still shows)
            const COL = 0.36;
            // 🔍 close: a close-up — one face and chest fills the screen
            if (sc.close) base.forEach(o => { o.upper = true; });
            const size = Math.round(sc.close ? H * 1.6 : rows > 1 ? Math.min(H * 0.42, (W * 0.96) / ((perRow * 2 + 1) * COL)) : Math.min(H * 0.62, (W * (0.94 - 0.03 * Math.max(0, people.length - 1))) / Math.max(1, people.length)));   // (the 3% gaps between actors count too)
            const figs = people.map((c, i) => figure(c, { ...base[i], size }));
            const actors = people.map((c, i) => h("div.vp-actor", { style: { "--i": i } }, figs[i], h("small", c.short || c.role)));
            if (rows > 1) actors.forEach((a, i) => {
                const r = i < perRow ? 0 : 1, j = r ? i - perRow : i, start = r ? 2 + (perRow - (people.length - perRow)) : 1;
                Object.assign(a.style, { gridRow: String(r + 1), gridColumn: `${start + j * 2} / span 2`, marginTop: r ? `-${Math.round(size * 0.5)}px` : "0" });
            });
            // extras around the actors: a framed photo on a table · someone on the phone (a bubble) · a role holding another's head
            const photoC = sc.photo ? D.castOf(m, sc.photo.r) : null;
            const photo = photoC ? h("div.vp-photo", h("div.vp-frame", figure(photoC, { expr: sc.photo.expr || "happy", size: Math.round(H * 0.22), upper: true })), h("i.vp-table")) : null;
            const callC = sc.call ? D.castOf(m, sc.call) : null;
            const callFig = callC ? figure(callC, { ...(callC.look || {}), expr: "happy", hold: "phone", pose: "wave", upper: true, size: Math.round(H * 0.42) }) : null;
            const call = callC ? h("div.vp-call", h("div.vp-call-in", callFig), h("small", `📞 ${callC.short || callC.role}`)) : null;
            // held: { r, expr, nude, baby } — "baby": a baby cradled in the arms (not swinging by the hand)
            const putHeld = (k, o) => {
                actors[k].querySelector(".vp-held")?.remove();
                const hc = o ? D.castOf(m, o.r) : null;
                if (hc) actors[k].append(h("div.vp-held" + (o.baby ? ".baby" : ""), figure(hc, { ...(hc.look || {}), expr: o.expr || "dizzy", nude: !!o.nude, swaddle: !!o.baby, size: Math.round(size * (o.baby ? 0.62 : 0.62)), upper: !o.baby })));
            };
            for (const [r, o] of Object.entries(sc.held || {})) {
                const k = people.findIndex(c => c.role === r || c.short === r);
                if (k >= 0) putHeld(k, o);
            }
            const pose = (i, o) => setFigure(figs[i], people[i], { ...o, size, jiggle: (o.nude || o.outfit === "bikini") && o.act === "dance" });
            const sub = h("div.vp-sub");
            const idxOf = r => people.findIndex(c => c.role === r || c.short === r || c.role.startsWith(r + ","));
            // a scene's music: a file, a synth style or "stop" (nothing = the music keeps going)
            if (sc.music) { stopMusic(); stopMusic = startMusic(sc.music, m); }
            // 🌧️ the scene's background sounds (rain · wind · birds · traffic · audience …) — scene.amb names them, else the set decides
            setAmb(ambFor(sc));
            const rain = (n, emo) => h("div.vp-fx", ...Array.from({ length: n }, (_, i) => h("i", { style: { "--x": (i * 6.7 % 100) + "%", "--d": (i % 6) * 0.35 + "s" } }, Array.isArray(emo) ? emo[i % emo.length] : emo)));
            const FX = {
                money: () => rain(16, "💸"), sparkle: () => rain(16, "✨"), music: () => rain(16, "🎵"), hearts: () => rain(14, ["💗", "💕", "💓"]),
                rock: () => h("div.vp-fx.rock", rain(12, ["🎸", "🎵", "🤘"]), h("i.vp-beam.a"), h("i.vp-beam.b")),
                fog: () => h("div.vp-fog", h("i.l"), h("i.r"), h("b.c")),                       // curtains open and the fog clears
                steam: () => h("div.vp-steam", Array.from({ length: 9 }, (_, i) => h("i", { style: { "--x": (i * 11.5 + 3) + "%", "--d": (i % 4) * 0.7 + "s" } }))),
                disco: () => h("div.vp-fx.disco", h("i.vp-ball", "🪩"), h("i.vp-spot.a"), h("i.vp-spot.b"), h("i.vp-spot.c")),
                spot: () => h("div.vp-fx", h("i.vp-spot.a"), h("i.vp-spot.b"), h("i.vp-spot.c"), rain(10, ["🎵", "🎶"])),
                clap: () => rain(16, ["👏", "🎉", "👏", "✨"]),
                mist: () => h("div.vp-mist", h("i"), h("i"), h("i")),                          // low fog crawling along the ground
                candle: () => h("i.vp-candle"),                                                   // the dark, but for a candle's light
                moon: () => h("div.vp-fx.moon", h("i.vp-bigmoon"), h("i.vp-mist-band")),         // 🌕 a huge full moon over the set
                shadow: () => h("div.vp-fx.shadow", h("i.vp-bigmoon.small"), h("i.vp-shadow")),  // 👤 a shadow slides past behind someone
                wake: () => h("i.vp-wake"),                                                       // 👁️ waking up: blurred, blinking, then clear
                camp: () => h("div.vp-fx.camp", h("i.vp-fire"), h("i.vp-bike.a"), h("i.vp-bike.b")), // 🔥 a campfire · motorbikes parked in the dark
                bonfire: () => h("div.vp-fx.camp", h("i.vp-fire"), h("i.vp-tent.a"), h("i.vp-tent.b")),  // ⛺ a campfire between two tents
                // 🐷 the tribe's ritual: a pig's head on a stake in the middle of a ring of fires
                ritual: () => h("div.vp-fx.camp.ritual", h("i.vp-fire.r1"), h("i.vp-fire.r2"), h("i.vp-fire.r3"), h("i.vp-fire.r4"), h("i.vp-pig", "🐷"))
            };
            // pop: { e: emoji, at: role, fly } — something turns up by an actor (a snake behind someone · an arrow flying in)
            const popAt = p => {
                const k = idxOf(p.at); if (k < 0) return;
                const el = h("i.vp-pop" + (p.fly ? ".fly" : "") + (p.cls ? "." + p.cls : ""), p.e);
                actors[k].append(el);
                if (!p.stay) setTimeout(() => el.remove(), p.fly ? 1400 : 3200);
            };
            // 🩸 claw marks torn across the screen (a line can ask for them: meta.claw)
            const clawMarks = () => { const c = h("div.vp-claw", h("i"), h("i"), h("i"), h("i")); sceneEl.append(c); setTimeout(() => c.remove(), 1800); };
            const fx = FX[sc.fx]?.() || null;
            const sceneEl = h("div.vp-scene.bg-" + (sc.bg || "street") + (sc.fx ? ".fx-" + sc.fx : "") + (sc.fx === "chase" ? ".chase" : "") + (sc.dark ? ".dark" : "") + (sc.close ? ".close" : "") + (sc.footage ? ".footage" : ""), h("div.vp-deco"), (sc.props || []).length ? h("div.vp-props", sc.props.map(p => h("span", p))) : null, photo, fx, h("div.vp-actors" + (rows > 1 ? ".crowd" : ""), { style: rows > 1 ? { gridTemplateColumns: `repeat(${perRow * 2 + 1}, ${Math.round(size * COL)}px)` } : {} }, actors), h("i.vp-shade"), call, sub);
            // 🎬 the scene number and place, at the top
            const no = sc.n ?? ((m.script || []).filter(p => p.k === "scene").indexOf(sc) + 1 || 1);
            sceneEl.append(h("div.vp-place", h("b", `Scene ${no}`), sc.place || BG_KO[sc.bg || "street"] || ""));
            put(screen, sceneEl);
            const lines = sc.lines || [];
            const per = sc.sec / Math.max(1, lines.length);
            if (!lines.length) return wait(sc.sec);
            for (const [who, text, meta = {}] of lines) {
                if (skip) return;
                const ci = idxOf(who);
                // 💡 the lights · 🎵 music change at this line · set: how other actors look from now on ({ role: { expr, act, outfit … } })
                if (meta.light) { sceneEl.classList.toggle("dark", meta.light === "off"); sceneEl.classList.toggle("black", meta.light === "black"); }
                if (meta.music) { stopMusic(); stopMusic = startMusic(meta.music, m); }
                if (meta.amb !== undefined) setAmb(ambFor({ amb: meta.amb })); // 🌧️ the weather / noise changes at this line
                // ⚡ a flash of light · a sound effect (scream, sting, phone ring, applause, ghost laugh …)
                if (meta.flash) { const fl = h("i.vp-flash" + (meta.flash === "red" ? ".red" : "")); sceneEl.append(fl); setTimeout(() => fl.remove(), 600); }
                if (meta.claw) clawMarks();
                if (meta.sfx) sfx(meta.sfx);
                if (meta.pop) [].concat(meta.pop).forEach(popAt);
                // the one on the phone talks in the bubble
                const onCall = callC && who && D.castOf(m, who) === callC;
                call?.classList.toggle("talk", !!onCall);
                if (onCall) setFigure(callFig, callC, { ...(callC.look || {}), hold: "phone", pose: "wave", expr: D.lineMood(text), ...meta, upper: true, act: "", size: Math.round(H * 0.42) });
                for (const [r, o] of Object.entries(meta.set || {})) { const k = idxOf(r); if (k >= 0) { base[k] = { ...base[k], ...o }; if (o.nude !== undefined || o.outfit !== undefined) base[k].nude = (o.nude ?? base[k].nude) || false; if (o.held !== undefined) putHeld(k, o.held); } }
                // to: the actor this line is aimed at — a slap / kiss / push leans that way
                const ti = meta.to ? idxOf(meta.to) : -1;
                actors.forEach((a, i) => { a.classList.toggle("talk", i === ci); a.style.setProperty("--dir", i === ci && ti >= 0 ? Math.sign(ti - ci) || 1 : i < (people.length - 1) / 2 ? 1 : -1); });
                // the speaker: the line's face / hands / feet (or what the words suggest) · the others go back to how they are
                const { light, music: _m, set, to, claw: _c, flash: _f, sfx: _s, amb: _a, pop: _p, ...look } = meta;
                people.forEach((_, i) => pose(i, i === ci ? { ...base[i], expr: D.lineMood(text), act: D.lineAct(text), ...look } : base[i]));
                // anon: the name tag under the actor is hidden (the monster nobody knows yet)
                actors.forEach((a, i) => { a.classList.toggle("gone", !!base[i].gone); a.classList.toggle("hid", !!base[i].hid); a.classList.toggle("anon", !!base[i].anon); });
                put(sub, who ? h("b", `${who}: `) : null, who ? text : h("i.vp-narr", text));
                if (who && !/^[♪…!?.\s]+$/.test(text)) mumble(text, (ci < 0 ? people.length : ci) + 3);
                await wait(per);
            }
        }
    });
}
