// ================================================================ 🎞️ Admin · 영화DB
//   search every movie (English title · Korean title · actor · studio) → the movie's info card
//   every value on a card can be clicked: 영화사 · 제작국가 · 장르 · 등급 · 희귀도 · 작품성 → the movies that share it,
//   an actor → their filmography (by 제작년월일, split into 주연 / 조연 / 엑스트라, Nudity · Sexy marked)
import { h, put } from "../core/util.js";
import { Store } from "../core/store.js";
import * as D from "../data/vhs.js";
import { PART_KO, stockPlan, viewerPay } from "../game/vhs.js";
import { modal, toast } from "../core/fx.js";
import { vhsBox, playMovie } from "./vhs.js";

const stars = n => "★".repeat(n) + "☆".repeat(Math.max(0, 7 - n));
const dateKo = d => String(d || "").replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, mo, dd) => `${+y}년 ${+mo}월 ${+dd}일`);
const brandName = id => D.BRAND_BY_ID[id]?.name || id;
const actorName = c => Store.player(c.pid)?.name_ko || c.ko || "?";
const PART_ORDER = ["lead", "support", "extra"];
const allMovies = () => [...D.builtinMovies(), ...(Store.vhs?.movies || []).filter(x => x && x.id)]
    .sort((a, b) => String(a.date).localeCompare(String(b.date), undefined, { numeric: true }) || a.ko.localeCompare(b.ko, "ko"));
const tags = c => [c.nude ? h("span.mdb-tag.nude", "🔞 Nudity") : null, c.sexy ? h("span.mdb-tag.sexy", "💋 Sexy") : null];

// the facets a card links to: kind → [label, value of a movie, text of a value]
const FACETS = {
    brand: ["영화사", m => [m.brand], brandName],
    nation: ["제작국가", m => [m.nation], v => v],
    genre: ["장르", m => [...m.genres, ...(m.lgbtq ? ["LGBTQ"] : [])], v => v === "LGBTQ" ? "🏳️‍🌈 LGBTQ" : `${D.GENRE_EMOJI[v] || ""} ${v}`],
    rating: ["등급", m => [m.rating], D.ratingText],
    stars: ["희귀도", m => [m.stars], stars],
    quality: ["작품성", m => [m.quality], stars]
};

export function adminMovieDbPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🎞️ 영화DB"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    const body = h("div.mdb-body");
    const trail = []; // the views clicked through, for ← 뒤로
    let q = "";
    const go = view => { trail.push(view); draw(); window.scrollTo({ top: 0 }); };
    const back = () => { trail.pop(); draw(); };
    const link = (text, view, cls = "") => h("a.mdb-link" + cls, { href: "javascript:void 0", onclick: e => { e.preventDefault(); go(view); } }, text);
    const facetLinks = (kind, m) => { const [, vals, txt] = FACETS[kind]; return vals(m).map((v, i) => [i ? " · " : null, link(txt(v), { k: kind, v })]); };

    // 🔑 영화확인: the video covers and the film open only after the movie's Creator Code is typed in
    //   the login lasts for this browser tab's session (sessionStorage) · 'James Creator 코드 로그아웃' ends it, so another code can be typed
    const SESSION_KEY = "gamblers.creatorSession";
    const loadOpened = () => { try { return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]")); } catch { return new Set(); } };
    const saveOpened = () => { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify([...opened])); } catch { } };
    const opened = loadOpened();  // creators whose code was entered in this session
    const sessionBar = h("div.mdb-session");
    function drawSession() {
        put(sessionBar, opened.size ? [h("small.muted", "🔓 로그인된 Creator: "), [...opened].map(who => h("button.btn.ghost.small.mdb-logout", { onclick: () => {
            opened.delete(who); saveOpened(); drawSession();
            toast(`🔒 ${who} Creator 코드에서 로그아웃했습니다 — 다른 Creator 코드를 입력할 수 있습니다`, "ok", 3500);
        } }, `🔒 ${who} Creator 코드 로그아웃`))] : null);
    }
    drawSession();
    function checkMovie(m) {
        const who = D.creatorOf(m), code = D.CREATOR_CODES[who];
        const show = () => {
            const pm = modal(h("div.mdb-box", vhsBox(m), h("button.btn.gold", { onclick: () => { pm.close(); playMovie(m); } }, "▶ 비디오 감상")), { title: `📼 ${D.titleText(m)}`, wide: true, cls: "vhs-modal" });
        };
        if (opened.has(who)) return show();
        if (!code) return toast(`${who}의 Creator Code가 아직 정해지지 않았습니다`, "warn");
        const inp = h("input.input", { type: "password", inputmode: "numeric", autocomplete: "off", placeholder: "Creator Code", onkeydown: e => { if (e.key === "Enter") ok(); } });
        const pm = modal(h("div.mdb-code", h("p", `Creator: `, h("b", who)), h("p.muted.small", "Creator Code를 입력해야 비디오 표지와 영화를 볼 수 있습니다."), inp,
            h("div.row.end", h("button.btn.ghost", { onclick: () => pm.close() }, "취소"), h("button.btn.gold", { onclick: () => ok() }, "확인"))), { title: "🔑 영화확인" });
        setTimeout(() => inp.focus(), 50);
        function ok() {
            if (inp.value.trim() !== code) { toast("Creator Code가 맞지 않습니다", "warn"); inp.select(); return; }
            opened.add(who); saveOpened(); drawSession(); pm.close(); show();
        }
    }
    const placed = m => { const c = stockPlan().count[m.id]; return c ? `${c.maps}개 맵 · ${c.shops}곳${c.shops < m.stock.shops ? ` (목표 ${m.stock.maps}개 맵 · ${m.stock.shops}곳 — 비치 가능한 가게가 ${c.room}곳뿐)` : ""}` : "모든 맞는 가게 (무작위)"; };
    // 💀 Body Count: how many die in the film, and who (actor — role)
    const bodyCount = m => { const dead = D.bodyCountOf(m); return dead.length ? [`💀 총 ${dead.length}명 — `, dead.map((c, i) => [i ? ", " : null, c.pid != null ? link(actorName(c), { k: "actor", pid: c.pid }) : actorName(c), ` (${c.role})`])] : "0명"; };
    const card = m => h("div.vhs-db-card.mdb-card",
        h("h4", link(m.ko, { k: "movie", id: m.id }), h("small", ` ${m.en}`), m.off ? h("span.mdb-tag", "판매 중지") : null,
            h("button.btn.ghost.small.mdb-check", { onclick: () => checkMovie(m) }, "🎬 영화확인")),
        h("dl",
            h("dt", "희귀도"), h("dd.st", facetLinks("stars", m)),
            h("dt", "장르"), h("dd", facetLinks("genre", m)),
            h("dt", "작품성"), h("dd.st", facetLinks("quality", m)),
            h("dt", "영화 원제"), h("dd", m.en),
            h("dt", "한글 출시명"), h("dd", m.ko),
            h("dt", "제작년월일"), h("dd", dateKo(m.date)),
            h("dt", "제작국가"), h("dd", facetLinks("nation", m)),
            h("dt", "영화사"), h("dd", facetLinks("brand", m)),
            h("dt", "등급"), h("dd", facetLinks("rating", m)),
            h("dt", "출연 배우"), h("dd", h("ul", [...m.cast].sort((a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part)).map(c =>
                h("li", `${PART_KO[c.part] || c.part} · `, c.pid != null ? link(actorName(c), { k: "actor", pid: c.pid }) : actorName(c), ` — ${c.role}`, ...tags(c))))),
            h("dt", "Body Count"), h("dd", bodyCount(m)),
            h("dt", "줄거리"), h("dd", m.plot),
            h("dt", "Creator"), h("dd", D.creatorOf(m)),
            h("dt", "관람 보상"), h("dd", `${viewerPay(m).toLocaleString()}G`),
            h("dt", "가격"), h("dd", `표지 꺼내기 ${D.coverFeeOf(m).toLocaleString()}G · 구입 ${D.buyPriceOf(m).toLocaleString()}G`),
            h("dt", "비디오 가게 비치"), h("dd", placed(m))));

    const row = m => h("div.mdb-row", link(m.ko, { k: "movie", id: m.id }), h("small.muted", ` ${m.en}`), h("span.mdb-meta", `${dateKo(m.date)} · ${brandName(m.brand)} · ${stars(m.stars)}`));

    function searchView() {
        const out = h("div.mdb-out");
        const run = () => {
            const s = q.trim().toLowerCase(), movies = allMovies();
            const hit = movies.filter(m => m.en.toLowerCase().includes(s) || m.ko.toLowerCase().includes(s) || brandName(m.brand).toLowerCase().includes(s) || m.cast.some(c => actorName(c).toLowerCase().includes(s)));
            put(out, !s ? h("p.muted.small", "검색어를 입력하면 영화가 나옵니다.") : !hit.length ? h("p.notice", "검색 결과가 없습니다.") : hit.map(card));
        };
        const inp = h("input.input", { value: q, placeholder: "영어 원제 · 한글 출시명 · 배우 · 영화사 검색 (예: Fortune Swindlers / 복덩이 사기단 / 짱구)", oninput: e => { q = e.target.value; run(); } });
        const browse = h("div.mdb-browse", Object.entries(FACETS).map(([k, [label]]) => link(`${label}별 보기`, { k: "list", facet: k }, ".sq")));
        run();
        return [inp, browse, out];
    }
    // every value of a facet, with how many movies have it
    function listView(kind) {
        const [label, vals, txt] = FACETS[kind], count = new Map();
        for (const m of allMovies()) for (const v of vals(m)) count.set(v, (count.get(v) || 0) + 1);
        const order = kind === "brand" ? D.BRANDS.map(b => b.id) : kind === "rating" ? D.RATINGS.map(r => r.id) : kind === "genre" ? [...D.GENRES, "LGBTQ"] : [...count.keys()].sort((a, b) => typeof a === "number" ? b - a : String(a).localeCompare(String(b)));
        return [h("h3", `${label}별 보기`), h("div.mdb-facets", order.filter(v => count.has(v)).map(v => h("div.mdb-facet", link(txt(v), { k: kind, v }), h("small.muted", ` ${count.get(v)}편`))))];
    }
    function facetView(kind, v) {
        const [label, vals, txt] = FACETS[kind], list = allMovies().filter(m => vals(m).includes(v));
        return [h("h3", `${label}: `, h("span.mdb-val", txt(v)), h("small.muted", ` · ${list.length}편 (제작년월일 순)`)), list.length ? list.map(row) : h("p.notice", "영화가 없습니다.")];
    }
    function movieView(id) {
        const m = allMovies().find(x => x.id === id);
        if (!m) return h("p.notice", "영화를 찾을 수 없습니다.");
        return [card(m)];
    }
    function actorView(pid) {
        const p = Store.player(pid);
        const films = [];
        for (const m of allMovies()) for (const c of m.cast) if (c.pid === pid) films.push({ m, c });
        const img = p?.profile_image;
        return [
            h("div.mdb-actor-head", img ? h("img", { src: img, alt: "" }) : null, h("div", h("h3", p?.name_ko || films[0] && actorName(films[0].c) || "?", h("small.muted", ` ${p?.player_name || ""}`)),
                h("p.muted.small", `출연 ${films.length}편 · 주연 ${films.filter(f => f.c.part === "lead").length} · 조연 ${films.filter(f => f.c.part === "support").length} · 엑스트라 ${films.filter(f => f.c.part === "extra").length}` +
                    (films.some(f => f.c.nude || f.c.sexy) ? ` · 🔞/💋 ${films.filter(f => f.c.nude || f.c.sexy).length}편` : "")))),
            PART_ORDER.map(part => {
                const fs = films.filter(f => f.c.part === part);
                return fs.length ? h("div.mdb-part", h("h4", `${PART_KO[part]} (${fs.length})`),
                    h("table.mdb-films", h("tbody", fs.map(({ m, c }) => h("tr",
                        h("td.muted", dateKo(m.date)),
                        h("td", link(m.ko, { k: "movie", id: m.id }), h("small.muted", ` ${m.en}`)),
                        h("td", c.role),
                        h("td", ...tags(c), D.bodyCountOf(m).includes(c) ? h("span.mdb-tag.dead", "💀 Body Count") : null)))))) : null;
            }),
            films.length ? null : h("p.notice", "아직 출연한 영화가 없습니다.")
        ];
    }

    function draw() {
        const v = trail[trail.length - 1];
        const content = !v ? searchView() : v.k === "list" ? listView(v.facet) : v.k === "movie" ? movieView(v.id) : v.k === "actor" ? actorView(v.pid) : facetView(v.k, v.v);
        put(body, v ? h("div.mdb-nav", h("button.btn.ghost.small", { onclick: back }, "← 뒤로"), h("button.btn.ghost.small", { onclick: () => { trail.length = 0; draw(); } }, "🔎 검색으로")) : null, content);
    }
    draw();
    return h("div.page.admin-mdb",
        h("h2.page-title", "🎞️ 영화DB"),
        h("p.muted.small", "영화를 검색합니다 (검색어를 입력해야 결과가 나옵니다). 영화사 · 제작국가 · 장르 · 등급 · 희귀도 · 작품성 · 출연 배우를 누르면 모아진 정보를 볼 수 있습니다."),
        h("p", h("a.btn.ghost.small", { href: "#/admin" }, "← 관리자 페이지")),
        sessionBar,
        body);
}
