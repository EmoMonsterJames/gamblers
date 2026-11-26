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
            h("p.muted.small", "진열대에서 비디오를 꺼내 보세요. 연령에 맞지 않는 비디오는 표지를 보기 전에 VHS 띠 이용권이 필요합니다."),
            list.length ? h("div.vhs-shelf", list.map(m => spine(m, { onclick: () => pull(m) }))) : h("p.notice", "오늘은 진열된 비디오가 없습니다."),
            h("p.muted.small", `💰 보유 ${fmt(G.S().ps[pid].money)}G`));
    }
    async function pull(m) {
        if (!(await ageGate(pid, m, "shop"))) return;
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
        h("dt", "출연 배우"), h("dd", h("ul", m.cast.map(c => h("li", `${V.PART_KO[c.part]} · ${c.ko} — ${c.role}${c.nude ? " (Nudity)" : c.sexy ? " (Sexy)" : ""}`)))),
        h("dt", "줄거리"), h("dd", m.plot)));

// ---------------------------------------------------------------- 🎬 영화관 (under 💰 Money)
export function cinemaView(pid, { turn = null, onChange = () => { } } = {}) {
    const wrap = h("div.vhs-cinema");
    let sel = null;
    const draw = () => {
        const own = V.collection(pid).map(x => x.m), left = V.cinemaLeft(pid);
        const m = own.find(x => x.id === sel) || null;
        put(wrap,
            h("div.vhs-head", h("div.big", "🎬"), h("div", h("h3", "영화관"), h("p.muted.small", `내 VHS를 넣어 재생합니다 (시즌당 ${V.CINEMA_PER_SEASON}회 · 남은 상영 ${left}회). 감상하는 동안 플레이 시간은 멈춥니다. 끝나면 관람 보상 ${fmt(V.VIEWER_PAY[0])}~${fmt(V.VIEWER_PAY[1])}G + 출연 배우들도 보상을 받습니다.`))),
            h("div.vhs-player-deck", h("div.vhs-slot" + (m ? ".in" : ""), m ? spine(m, { small: true }) : h("span", "📼 비디오를 넣어 주세요")),
                h("button.btn.gold.big", { disabled: !m || left <= 0, onclick: () => play(m) }, left <= 0 ? "이번 시즌 상영을 모두 썼습니다" : "▶ 재생")),
            own.length ? h("div.vhs-shelf", own.map(x => spine(x, { onclick: () => { sel = x.id; Sound.click(); draw(); } }))) : h("p.notice", "VHS Collection에 비디오가 없습니다."));
    };
    async function play(m) {
        if (!(await ageGate(pid, m, "view"))) return;
        if (!(await confirmBox(`${m.ko}을(를) 재생할까요? (${Math.round(D.scriptSeconds(m) / 6) / 10}분)\n이번 시즌 남은 상영 ${V.cinemaLeft(pid)}회 → ${V.cinemaLeft(pid) - 1}회`, "▶ 재생", "취소"))) return;
        const r = V.cinemaPay(pid, m);
        if (!r.ok) return toast(r.why, "warn");
        const was = turn?.running;
        if (turn) turn.running = false;
        const done = Activity.hold();
        try { await playMovie(m); } finally { done(); if (turn) turn.running = was; }
        Sound.cash(); confetti(50, ["🎬", "🪙", "✨"]);
        const pm = modal(h("div.vhs-pay", h("div.big", "🎬"), h("h3", `${m.ko} 상영 종료`), h("div.vhs-pay-amt", `+${fmt(r.viewer)} G`), h("p.muted", "관람 보상"),
            h("div.vhs-pay-list", r.actors.map(a => h("div.vhs-pay-row", face(a, 34), h("b", a.ko), h("small", `${V.PART_KO[a.part]} · ${a.role}`), h("span", a.here ? `+${fmt(a.pay)}G` : a.wallet ? `+${fmt(a.pay)}G 👛 (시즌 참가 때 합류)` : "-")))),
            h("button.btn.gold.big", { onclick: () => pm.close() }, "확인")), { title: "🎬 영화관 보상", cls: "vhs-modal" });
        await pm.closed;
        onChange(); draw();
    }
    draw();
    return wrap;
}

// ---------------------------------------------------------------- 🎵 little sound engine: background music + mumbled lines
let ac = null;
const actx = () => { try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); return ac; } catch { return null; } };
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
const NOTE = n => 220 * Math.pow(2, n / 12);
const STYLES = {
    comic: { bpm: 168, scale: [0, 2, 4, 5, 7, 9, 12], bass: [0, 7, 5, 7], wave: "square", hop: true },
    action: { bpm: 150, scale: [0, 3, 5, 7, 10, 12], bass: [0, 0, 3, 5], wave: "sawtooth" },
    horror: { bpm: 60, scale: [0, 1, 6, 7, 11], bass: [0, 1, 0, 6], wave: "sine", low: true },
    tense: { bpm: 96, scale: [0, 1, 3, 7, 8], bass: [0, 0, 1, 0], wave: "triangle" },
    smooth: { bpm: 84, scale: [0, 4, 7, 11, 14], bass: [0, 5, 7, 4], wave: "sine" },
    happy: { bpm: 132, scale: [0, 2, 4, 7, 9, 12], bass: [0, 5, 7, 5], wave: "square" },
    sad: { bpm: 70, scale: [0, 3, 7, 8, 10], bass: [0, 8, 3, 7], wave: "triangle" },
    space: { bpm: 100, scale: [0, 2, 7, 9, 14], bass: [0, 7, 2, 9], wave: "sine" },
    fantasy: { bpm: 110, scale: [0, 2, 4, 6, 9, 11], bass: [0, 4, 9, 7], wave: "triangle" }
};
function music(style) {
    const S = STYLES[style] || STYLES.comic;
    const beat = 60 / S.bpm;
    let i = 0, alive = true;
    const step = () => {
        if (!alive) return;
        const b = S.bass[Math.floor(i / 2) % S.bass.length];
        if (i % 2 === 0) tone(NOTE(b - (S.low ? 24 : 12)), beat * 0.9, { type: S.low ? "sine" : "triangle", vol: 0.05 });
        if (S.hop || Math.random() < 0.7) tone(NOTE(S.scale[Math.floor(Math.random() * S.scale.length)] + 12), beat * (S.hop ? 0.35 : 0.8), { type: S.wave, vol: S.low ? 0.025 : 0.022 });
        i++;
    };
    const id = setInterval(step, beat * 1000);
    return () => { alive = false; clearInterval(id); };
}

// ---------------------------------------------------------------- 🎞️ the film
export function playMovie(m) {
    return new Promise(resolve => {
        const screen = h("div.vhs-screen" + (m.bw ? ".bw" : ""));
        const bar = h("div.vhs-progress", h("i"));
        let skip = false, stopMusic = () => { };
        const pm = modal(h("div.vhs-theater", screen, bar, h("div.row.center", h("button.btn.ghost.small", { onclick: () => { skip = true; } }, "⏭ 끝까지 건너뛰기"))), { title: `🎬 ${D.titleText(m)}`, closable: false, wide: true, cls: "vhs-modal.theater" });
        const total = D.scriptSeconds(m);
        let elapsed = 0;
        const wait = async sec => { for (let t = 0; t < sec * 10 && !skip; t++) { await sleep(100); elapsed += 0.1; bar.firstChild.style.width = Math.min(100, elapsed / total * 100) + "%"; } };
        const b = brandOf(m);
        (async () => {
            try {
                for (const part of m.script || []) {
                    if (skip) break;
                    if (part.k === "brand") {
                        put(screen, h("div.vp-brand", brandLogo(b, 120), h("b", b.name), h("small", "presents")));
                        tone(NOTE(12), 0.4, { type: "sine", vol: 0.06 }); tone(NOTE(19), 0.6, { type: "sine", vol: 0.05, at: 0.35 });
                    } else if (part.k === "title") {
                        stopMusic(); stopMusic = music(m.music);
                        const ko = h("div.vp-ko.f-" + (part.style || "bold"), m.ko);
                        put(screen, h("div.vp-title.s-" + (part.style || "bold"), h("div.vp-en", m.en), ko));
                        setTimeout(() => ko.classList.add("show"), Math.min(2500, part.sec * 400));
                    } else if (part.k === "cast") {
                        const list = m.cast.filter(c => (part.parts || ["lead", "support"]).includes(c.part));
                        const box = h("div.vp-cast");
                        put(screen, box);
                        const each = part.sec / Math.max(1, list.length);
                        const big = Math.round(Math.min(220, screen.clientHeight * 0.52));
                        for (const c of list) { if (skip) break; put(box, h("div.vp-cast-card", figure(c, { expr: "happy", pose: "wave", size: big }), h("b", c.ko), h("small", `as ${c.role}`), h("i", V.PART_KO[c.part]))); Sound.click(); await wait(each); }
                        continue;
                    } else if (part.k === "scene") {
                        await scene(part);
                        continue;
                    } else if (part.k === "end") {
                        put(screen, h("div.vp-end", h("b", part.text || "The End"), part.credits ? h("div.vp-credits", m.cast.map(c => h("div", `${c.role} ····· ${c.ko}`)), h("div", brandOf(m).name)) : null));
                        tone(NOTE(12), 0.5, { type: "sine", vol: 0.05 }); tone(NOTE(7), 0.5, { type: "sine", vol: 0.05, at: 0.4 }); tone(NOTE(0), 0.9, { type: "sine", vol: 0.05, at: 0.8 });
                    }
                    await wait(part.sec);
                }
            } finally { stopMusic(); pm.close(); resolve(); }
        })();
        async function scene(sc) {
            const people = (sc.who || []).map(r => roleCast(m, r)).filter(Boolean);
            const nude = new Set(sc.nude || []);
            // how each actor starts the scene (scene.cast) · topless when the scene says so (a dancer's chest bounces)
            const base = people.map(c => { const o = { expr: "happy", pose: "down", ...(sc.cast?.[c.role] || sc.cast?.[c.short] || {}) }; if (nude.has(c.role) || nude.has(c.short)) { o.nude = true; o.jiggle = o.act === "dance"; } return o; });
            const W = screen.clientWidth || 800, H = screen.clientHeight || 450;
            const size = Math.round(Math.min(H * 0.62, (W * 0.9) / Math.max(1, people.length)));
            const figs = people.map((c, i) => figure(c, { ...base[i], size }));
            const actors = people.map((c, i) => h("div.vp-actor", { style: { "--i": i } }, figs[i], h("small", c.short || c.role)));
            const pose = (i, o) => setFigure(figs[i], people[i], { ...o, size, jiggle: o.nude && o.act === "dance" });
            const sub = h("div.vp-sub");
            const fx = sc.fx === "money" || sc.fx === "sparkle" || sc.fx === "music" ? h("div.vp-fx", ...Array.from({ length: 16 }, (_, i) => h("i", { style: { "--x": (i * 6.7 % 100) + "%", "--d": (i % 6) * 0.35 + "s" } }, sc.fx === "money" ? "💸" : sc.fx === "music" ? "🎵" : "✨"))) : null;
            put(screen, h("div.vp-scene.bg-" + (sc.bg || "street") + (sc.fx === "chase" ? ".chase" : ""), h("div.vp-deco"), (sc.props || []).length ? h("div.vp-props", sc.props.map(p => h("span", p))) : null, fx, h("div.vp-actors", actors), sub));
            const lines = sc.lines || [];
            const per = sc.sec / Math.max(1, lines.length);
            if (!lines.length) return wait(sc.sec);
            for (const [who, text, meta] of lines) {
                if (skip) return;
                const ci = people.findIndex(c => c.role === who || c.short === who || c.role.startsWith(who + ","));
                actors.forEach((a, i) => a.classList.toggle("talk", i === ci));
                // the speaker: the line's face / hands / feet (or what the words suggest) · the others go back to how they started
                people.forEach((_, i) => pose(i, i === ci ? { ...base[i], expr: D.lineMood(text), act: D.lineAct(text), ...(meta || {}) } : base[i]));
                put(sub, h("b", `${who}: `), text);
                mumble(text, ci + 3);
                await wait(per);
            }
        }
    });
}
