// ================================================================ 📝 Admin · 영화 프롬트 생성기 (for Claude)
//   fill in a movie the way the admin usually writes it to Claude — 기본 정보 · 배우 (주연/조연/엑스트라 · 역할 · Nudity/Sexy/Body Count)
//   · 구성 (길이 · 제목 · 배우 소개 · Scene · 엔딩 · Body Count, each with its own note and music) · 비디오 표지 (중간/앞/뒷)
//   → one Korean prompt text to copy. The draft stays in this browser (localStorage) until 🗑️ 새로 쓰기.
//   Attached files (music · cover images) can't be sent from here: their names go into the prompt, the admin attaches them to Claude.
import { h, put } from "../core/util.js";
import { Store } from "../core/store.js";
import * as D from "../data/vhs.js";
import { toast, confirmBox } from "../core/fx.js";

const KEY = "gamblers.moviePromptDraft";
const PARTS = [["lead", "주연"], ["support", "조연"], ["extra", "엑스트라"]];
const LENGTHS = ["약 1분", "약 2분", "약 3분", "약 4분", "5분 이상"];
const SEC_TYPES = { title: "🎬 타이틀", cast: "🧑‍🤝‍🧑 배우 정보 소개", scene: "🎞️ Scene", end: "🔚 엔딩씬", bodycount: "💀 Body Count" };
const FONTS = ["기본", "굵은 고딕", "명조 (클래식)", "손글씨", "피 흘리는 공포체", "돌 · 바위 글씨", "구름 글씨", "네온사인", "레트로 VHS", "만화체", "타자기체"];
const FXS = ["없음", "흔들거림", "부르르 떨림", "깜빡임", "은은하게 빛남", "물결치듯", "통통 튀기", "피가 흘러내림", "빙글 회전", "확대되며 등장"];
const SIZES = ["크게", "중간", "작게"];
const DIRS = ["가로", "세로"];
const COVERS = [["spine", "중간표지"], ["front", "앞표지"], ["back", "뒷표지"]];

const textStyle = (dir = "가로", size = "크게") => ({ show: true, dir, size, font: "기본", fx: "없음" });
const blankCover = k => ({
    img: "", imgNote: "", logo: true, ko: textStyle(k === "spine" ? "세로" : "가로", "크게"), en: { ...textStyle(k === "spine" ? "세로" : "가로", "작게") },
    stills: k === "back" ? 2 : 1, text: "",
    cast: { show: k !== "spine", text: "" }, plot: { show: k === "back" }, year: { show: k === "back" },
    promo: { show: false, text: "", font: "기본", fx: "없음" }
});
const blank = () => ({
    creator: Object.keys(D.CREATOR_CODES)[0] || "James", en: "", ko: "", brand: D.BRANDS[0]?.id || "", nation: "Emo World", yy: "", mm: "", dd: "",
    genres: [], rating: D.RATINGS[0]?.id || "", stars: 3, quality: 3, plot: "", length: "약 3분",
    actors: [{ part: "lead", name: "", role: "", nude: false, sexy: false, dead: false, how: "" }],
    secs: [{ type: "title", place: "", text: "", music: "claude", file: "" }, { type: "cast", place: "", text: "", music: "keep", file: "" },
        { type: "scene", place: "", text: "", music: "claude", file: "" }, { type: "end", place: "", text: "The End", music: "keep", file: "" }],
    covers: { spine: blankCover("spine"), front: blankCover("front"), back: blankCover("back") }
});
const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY) || "null"); return d ? { ...blank(), ...d, covers: { ...blank().covers, ...(d.covers || {}) } } : blank(); } catch { return blank(); } };

export function adminMoviePromptPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "📝 영화 프롬트 생성기"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    let st = load();
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { } };
    const body = h("div.mp-body");
    const out = h("textarea.input.mp-out", { rows: 18, readonly: true, placeholder: "🪄 프롬트 만들기를 누르면 여기에 나옵니다." });

    // ---- small form helpers (each writes straight into st and saves)
    const inp = (obj, k, attrs = {}) => h("input.input", { value: obj[k] ?? "", ...attrs, oninput: e => { obj[k] = attrs.type === "number" ? +e.target.value : e.target.value; save(); } });
    const area = (obj, k, ph, rows = 3) => { const t = h("textarea.input", { rows, placeholder: ph, oninput: e => { obj[k] = e.target.value; save(); } }); t.value = obj[k] || ""; return t; };
    const sel = (obj, k, opts, redraw = false) => h("select.input", { onchange: e => { obj[k] = isNaN(+e.target.value) || e.target.value === "" ? e.target.value : (typeof obj[k] === "number" ? +e.target.value : e.target.value); save(); if (redraw) draw(); } },
        opts.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return h("option", { value: v, selected: String(obj[k]) === String(v) }, t); }));
    const chk = (obj, k, label, redraw = false) => h("label.check", h("input", { type: "checkbox", checked: !!obj[k], onchange: e => { obj[k] = e.target.checked; save(); if (redraw) draw(); } }), label);
    const field = (label, ...kids) => h("label.mp-field", h("span", label), ...kids);
    // 📎 a file to attach to Claude: only its name is kept (the file itself is attached to the chat)
    const attach = (obj, k, accept, label) => h("div.mp-attach",
        h("label.btn.ghost.small", label, h("input", { type: "file", accept, hidden: true, onchange: e => { obj[k] = e.target.files?.[0]?.name || ""; save(); draw(); } })),
        obj[k] ? [h("small", ` 📎 ${obj[k]} `), h("button.btn.ghost.small", { onclick: () => { obj[k] = ""; save(); draw(); } }, "✕")] : h("small.muted", " 첨부 없음"));
    const textStyleRow = (o, label) => h("div.mp-style",
        chk(o, "show", label, true),
        o.show ? [sel(o, "dir", DIRS), sel(o, "size", SIZES), field("글꼴", sel(o, "font", FONTS)), field("효과", sel(o, "fx", FXS))] : null);

    function basics() {
        const players = h("datalist#mp-players", Store.allPlayers.map(p => h("option", { value: p.name_ko || p.player_name })));
        const nations = h("datalist#mp-nations", [...new Set([...D.builtinMovies(), ...(Store.vhs?.movies || [])].map(m => m?.nation).filter(Boolean))].map(n => h("option", { value: n })));
        return h("section.mp-sec", h("h3", "① 기본 정보"), players, nations,
            h("div.mp-grid",
                field("CREATOR", sel(st, "creator", [...new Set([...Object.keys(D.CREATOR_CODES), st.creator])])),
                field("영어 원제", inp(st, "en", { placeholder: "Moonchild 3: Werewolf" })),
                field("한글 출시 제목", inp(st, "ko", { placeholder: "늑대인간" })),
                field("영화사", sel(st, "brand", D.BRANDS.map(b => [b.id, b.name]))),
                field("제작국가", inp(st, "nation", { list: "mp-nations" })),
                field("제작년월일", h("div.mp-date", inp(st, "yy", { placeholder: "년", size: 3 }), "년", inp(st, "mm", { placeholder: "월", size: 2 }), "월", inp(st, "dd", { placeholder: "일", size: 2 }), "일")),
                field("등급", sel(st, "rating", D.RATINGS.map(r => [r.id, D.ratingText ? D.ratingText(r.id) : r.name]))),
                field("희귀도", sel(st, "stars", [1, 2, 3, 4, 5, 6, 7].map(n => [n, "★".repeat(n)]))),
                field("작품성", sel(st, "quality", [1, 2, 3, 4, 5, 6, 7].map(n => [n, "★".repeat(n)])))),
            field("장르", h("div.mp-genres", [...D.GENRES, "LGBTQ"].map(g => h("label.check", h("input", { type: "checkbox", checked: st.genres.includes(g), onchange: e => { st.genres = e.target.checked ? [...st.genres, g] : st.genres.filter(x => x !== g); save(); } }), `${D.GENRE_EMOJI[g] || "🏳️‍🌈"} ${g}`)))),
            field("줄거리", area(st, "plot", "비디오 뒷표지와 DB에 들어갈 줄거리", 3)));
    }

    function actors() {
        const row = (a, i) => h("div.mp-actor",
            sel(a, "part", PARTS),
            inp(a, "name", { list: "mp-players", placeholder: "배우 (플레이어 이름)" }),
            inp(a, "role", { placeholder: "역할 (예: Jimmy)" }),
            chk(a, "nude", "🔞 Nudity"), chk(a, "sexy", "💋 Sexy"), chk(a, "dead", "💀 Body Count", true),
            h("button.btn.ghost.small", { title: "위로", onclick: () => { if (i) { [st.actors[i - 1], st.actors[i]] = [st.actors[i], st.actors[i - 1]]; save(); draw(); } } }, "▲"),
            h("button.btn.ghost.small", { title: "삭제", onclick: () => { st.actors.splice(i, 1); save(); draw(); } }, "✕"));
        return h("section.mp-sec", h("h3", "② 출연 배우"),
            h("p.muted.small", "배우를 고르고 역할을 적으세요. 같은 구분(주연/조연/엑스트라)끼리 나열 순서대로 들어갑니다."),
            st.actors.map(row),
            h("div.row", PARTS.map(([p, t]) => h("button.btn.ghost.small", { onclick: () => { st.actors.push({ part: p, name: "", role: "", nude: false, sexy: false, dead: false, how: "" }); save(); draw(); } }, `➕ ${t} 추가`))));
    }

    function structure() {
        let sceneNo = 0;
        const sec = (s, i) => {
            const no = s.type === "scene" ? ++sceneNo : 0;
            const dead = st.actors.filter(a => a.dead);
            return h("div.mp-part",
                h("div.mp-part-head", h("b", SEC_TYPES[s.type] + (no ? ` ${no}` : "")),
                    s.type === "scene" ? inp(s, "place", { placeholder: "장소 (예: 하우스 · 정글)" }) : null,
                    h("span.mp-grow"),
                    h("button.btn.ghost.small", { onclick: () => { if (i) { [st.secs[i - 1], st.secs[i]] = [st.secs[i], st.secs[i - 1]]; save(); draw(); } } }, "▲"),
                    h("button.btn.ghost.small", { onclick: () => { if (i < st.secs.length - 1) { [st.secs[i + 1], st.secs[i]] = [st.secs[i], st.secs[i + 1]]; save(); draw(); } } }, "▼"),
                    h("button.btn.ghost.small", { onclick: () => { st.secs.splice(i, 1); save(); draw(); } }, "✕")),
                s.type === "bodycount"
                    ? h("div.mp-bc", dead.length ? dead.map(a => field(`${a.name || "?"} (${a.role || "역할"})`, inp(a, "how", { placeholder: "어떻게 죽는지 (예: 늑대인간에게 습격당함)" }))) : h("small.muted", "② 출연 배우에서 💀 Body Count를 체크하면 여기에 나옵니다 (죽는 순서대로 배우를 정렬하세요)."))
                    : null,
                area(s, "text", { title: "제목이 어떻게 나오는지 (배경 · 연출 · 효과)", cast: "어떤 배우가 어떤 배경에서 소개되는지", scene: "이 장면에서 일어나는 일과 대사", end: "엔딩 화면 (예: The End)", bodycount: "Body Count 화면에 대한 추가 설명 (선택)" }[s.type], s.type === "scene" ? 4 : 2),
                s.type === "bodycount" ? null : h("div.mp-music", h("span", "🎵 음악"),
                    sel(s, "music", [["keep", "이어서 (앞의 음악 그대로)"], ["claude", "Claude가 만들어 주기"], ["file", "내 음악 첨부"], ["none", "음악 없음"]], true),
                    s.music === "file" ? attach(s, "file", "audio/*", "📎 음악 파일 선택") : null));
        };
        return h("section.mp-sec", h("h3", "③ 구성"),
            field("대략적인 길이", sel(st, "length", LENGTHS)),
            st.secs.map(sec),
            h("div.row", Object.entries(SEC_TYPES).map(([k, t]) => h("button.btn.ghost.small", { onclick: () => { st.secs.push({ type: k, place: "", text: k === "end" ? "The End" : "", music: k === "title" ? "claude" : "keep", file: "" }); save(); draw(); } }, `➕ ${t}`))));
    }

    let coverTab = "front";
    function covers() {
        const c = st.covers[coverTab];
        const front = coverTab !== "spine";
        return h("section.mp-sec", h("h3", "④ 비디오 표지"),
            h("div.mp-tabs", COVERS.map(([k, t]) => h("button.btn.small" + (k === coverTab ? ".gold" : ".ghost"), { onclick: () => { coverTab = k; draw(); } }, t))),
            h("div.mp-cover",
                field("🖼️ 첨부 이미지", attach(c, "img", "image/*", "📎 이미지 선택"), c.img ? inp(c, "imgNote", { placeholder: "이미지를 어디에 · 어떻게 쓸지 (예: 한글 제목 그림 · 배경)" }) : null),
                chk(c, "logo", "🏷️ 영화사 로고"),
                textStyleRow(c.ko, "한글 제목"),
                textStyleRow(c.en, "영어 원제"),
                field("🎞️ 스틸컷", sel(c, "stills", [0, 1, 2, 3, 4].map(n => [n, n ? `${n}장` : "없음"]))),
                front ? [
                    h("div.mp-style", chk(c.cast, "show", "🧑‍🤝‍🧑 배우 정보", true), c.cast.show ? inp(c.cast, "text", { placeholder: "예: 주연만 · 이름만" }) : null),
                    h("div.mp-style", chk(c.plot, "show", "📖 줄거리")),
                    h("div.mp-style", chk(c.year, "show", "📅 년도 (제작년월일)")),
                    h("div.mp-style", chk(c.promo, "show", "📣 홍보문구", true), c.promo.show ? [inp(c.promo, "text", { placeholder: "예: 충.격.공.포!!" }), field("글꼴", sel(c.promo, "font", FONTS)), field("효과", sel(c.promo, "fx", FXS))] : null)
                ] : null,
                field("✍️ 원하는 스타일 설명", area(c, "text", "이 표지를 어떻게 꾸밀지 자유롭게 적어주세요 (배경 · 그림 · 배치 · 분위기)", 3))));
    }

    // ---------------------------------------------------------------- the prompt
    function build() {
        const b = D.BRAND_BY_ID[st.brand]?.name || st.brand;
        const r = D.RATINGS.find(x => x.id === st.rating);
        const date = [st.yy && `${st.yy}년`, st.mm && `${st.mm}월`, st.dd && `${st.dd}일`].filter(Boolean).join(" ");
        const L = [];
        L.push("아래의 영화를 만들어주세요:", "");
        L.push(`CREATOR: ${st.creator}`, `영어 제목: ${st.en}`, `한글 출시 제목: ${st.ko}`, `영화사: ${b}`, `제작국가: ${st.nation}`, `제작년월일: ${date || "-"}`,
            `장르: ${st.genres.join(", ") || "-"}`, `등급: ${r ? r.name : st.rating}`, `희귀도: ★${st.stars}`, `작품성: ★${st.quality}`, `길이: ${st.length}`, "");
        for (const [p, t] of PARTS) {
            const list = st.actors.filter(a => a.part === p && (a.name || a.role));
            if (!list.length) continue;
            L.push(`${t}:`);
            for (const a of list) L.push(`- ${a.name || "?"} - ${a.role || "?"}${[a.nude && "Nudity", a.sexy && "Sexy"].filter(Boolean).map(x => ` (${x})`).join("")}`);
        }
        const nude = st.actors.filter(a => a.nude), sexy = st.actors.filter(a => a.sexy);
        if (nude.length) L.push(`NUDITY: ${nude.map(a => a.role || a.name).join(", ")}`);
        if (sexy.length) L.push(`SEXY: ${sexy.map(a => a.role || a.name).join(", ")}`);
        L.push("");
        if (st.plot) L.push(`줄거리: "${st.plot}"`, "");
        L.push("[구성]");
        const files = [];
        const music = s => s.music === "claude" ? " (음악: Claude가 분위기에 맞게 만들어주세요)" : s.music === "file" ? (s.file ? (files.push(s.file), ` (음악: 첨부한 '${s.file}' 사용)`) : " (음악: 첨부 예정)") : s.music === "none" ? " (음악 없음)" : "";
        let n = 0;
        for (const s of st.secs) {
            if (s.type === "title") L.push(`- 제목: ${s.text || "-"}${music(s)}`);
            else if (s.type === "cast") L.push(`- 배우 정보: ${s.text || "-"}${music(s)}`);
            else if (s.type === "scene") L.push(`- Scene ${++n}${s.place ? ` (${s.place})` : ""}: ${s.text || "-"}${music(s)}`);
            else if (s.type === "end") L.push(`- 엔딩: ${s.text || "The End"}${music(s)}`);
            else if (s.type === "bodycount") {
                const dead = st.actors.filter(a => a.dead);
                L.push(`- Body Count (죽는 순서대로)${s.text ? `: ${s.text}` : ""}`);
                dead.forEach((a, i) => L.push(`  ${i + 1}. ${a.role || a.name} (${a.name || "?"})${a.how ? ` — ${a.how}` : ""}`));
            }
        }
        if (!st.secs.some(s => s.type === "bodycount") && st.actors.some(a => a.dead)) L.push(`- bodyCount: ${st.actors.filter(a => a.dead).map(a => a.role || a.name).join(", ")}`);
        L.push("", "[비디오 표지]");
        const ts = (o, what) => !o.show ? `${what} 없음` : `${what} (${o.dir} · ${o.size}${o.font !== "기본" ? ` · 글꼴: ${o.font}` : ""}${o.fx !== "없음" ? ` · 효과: ${o.fx}` : ""})`;
        for (const [k, t] of COVERS) {
            const c = st.covers[k];
            const bits = [];
            if (c.img) { files.push(c.img); bits.push(`첨부 이미지 '${c.img}'${c.imgNote ? ` — ${c.imgNote}` : ""}`); }
            bits.push(c.logo ? "영화사 로고" : "로고 없음", ts(c.ko, "한글 제목"), ts(c.en, "영어 원제"), c.stills ? `스틸컷 ${c.stills}장` : "스틸컷 없음");
            if (k !== "spine") {
                bits.push(c.cast.show ? `배우 정보${c.cast.text ? ` (${c.cast.text})` : ""}` : "배우 정보 없음");
                bits.push(c.plot.show ? "줄거리" : "줄거리 없음");
                if (c.year.show) bits.push("제작년월일");
                bits.push(c.promo.show && c.promo.text ? `홍보문구 '${c.promo.text}'${c.promo.font !== "기본" ? ` (글꼴: ${c.promo.font})` : ""}${c.promo.fx !== "없음" ? ` (효과: ${c.promo.fx})` : ""}` : "홍보문구 없음");
            }
            L.push(`- ${t}: ${bits.join(", ")}${c.text ? `. ${c.text}` : ""}`);
        }
        if (files.length) L.push("", `첨부 파일: ${[...new Set(files)].join(", ")} (이 프롬트와 함께 첨부합니다)`);
        return L.join("\n");
    }

    function draw() {
        put(body, basics(), actors(), structure(), covers());
    }
    draw();
    return h("div.page.admin-mprompt",
        h("h2.page-title", "📝 영화 프롬트 생성기"),
        h("p.muted.small", "Claude에게 영화를 만들어 달라고 할 때 쓰는 프롬트를 만듭니다. 쓰는 중인 내용은 이 브라우저에 저장됩니다. 음악 · 이미지는 파일 이름만 프롬트에 들어가니, 만든 프롬트와 함께 Claude에게 첨부해주세요."),
        h("p.row", h("a.btn.ghost.small", { href: "#/admin" }, "← 관리자 페이지"), h("a.btn.ghost.small", { href: "#/admin-moviedb" }, "🎞️ 영화DB"),
            h("button.btn.ghost.small", { onclick: async () => { if (await confirmBox("지금까지 쓴 내용을 지우고 새로 쓸까요?", "새로 쓰기", "취소")) { st = blank(); save(); out.value = ""; draw(); } } }, "🗑️ 새로 쓰기")),
        body,
        h("section.mp-sec.mp-result", h("h3", "⑤ 프롬트"),
            h("div.row", h("button.btn.gold", { onclick: () => { out.value = build(); out.scrollIntoView({ behavior: "smooth", block: "center" }); } }, "🪄 프롬트 만들기"),
                h("button.btn.ghost", { onclick: async () => { if (!out.value) out.value = build(); try { await navigator.clipboard.writeText(out.value); toast("📋 프롬트를 복사했습니다", "ok"); } catch { out.select(); toast("복사가 막혀 있어요 — 선택된 글을 Ctrl+C로 복사하세요", "warn"); } } }, "📋 복사")),
            out));
}
