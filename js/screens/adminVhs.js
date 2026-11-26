// ================================================================ 🎬 Admin · 영화 · 비디오 표지 생성기
//   compose a movie like 복덩이 사기단: titles · brand · nation · date · genres · rating · rarity · quality · cast (players + roles)
//   · cover (front layout / back stills / spine font) · the film (brand → title → cast → scenes with lines → The End)
//   live cover preview + ▶ preview playback · saved movies go to Store.vhs.movies (settings row "vhs") and appear in the VHS shops
import { h, fmt, put } from "../core/util.js";
import { toast, confirmBox } from "../core/fx.js";
import { Store } from "../core/store.js";
import { COUNTRIES } from "../data/catalog.js";
import * as D from "../data/vhs.js";
import { vhsBox, playMovie, dbCard, MUSIC_STYLES, BG_KO } from "./vhs.js";
import { EXPR_KO, POSE_KO, HOLD_KO } from "../ui/figure.js";

const DRAFT_KEY = "gamblers.vhsDraft";
const blank = () => ({
    id: "", en: "", ko: "", brand: "hyhg", nation: COUNTRIES[0], date: "0-01-01", genres: ["코미디"], rating: "white", stars: 1, quality: 4, lgbtq: false,
    cast: [], plot: "", tagline: "", music: "comic",
    cover: { spine: { font: "bold" }, front: {}, back: {} },
    script: [{ k: "brand", sec: 4 }, { k: "title", sec: 6, style: "bold" }, { k: "cast", sec: 6, parts: ["lead", "support"] }, { k: "scene", sec: 12, bg: "street", who: [], lines: [] }, { k: "end", sec: 5, text: "The End", credits: true }]
});
const PARTS = [["lead", "주연"], ["support", "조연"], ["extra", "엑스트라"]];
const MUSIC = MUSIC_STYLES;
const BGS = [["street", "🏙️ 거리"], ["bank", "🏦 은행"], ["hideout", "🕶️ 아지트"], ["taxi", "🚕 택시"], ["home", "🏠 집"], ["forest", "🌲 숲"], ["space", "🪐 우주"], ["castle", "🏰 성"], ["beach", "🏖️ 해변"], ["night", "🌙 밤"], ["stage", "🎤 무대"], ["office", "🖥️ 사무실"], ["campus", "🏫 대학교"], ["room", "🛏️ 방"], ["shower", "🚿 샤워실"], ["ballroom", "🪩 무도회장"]];
const FX = [["", "없음"], ["money", "💸 돈 휘날림"], ["chase", "🏃 추격"], ["sparkle", "✨ 반짝"], ["music", "🎵 음악"], ["hearts", "💗 하트"], ["fog", "🌫️ 커튼 열림 + 안개"], ["steam", "♨️ 김 (샤워)"], ["disco", "🪩 디스코 조명"], ["rock", "🎸 락 조명"]];

export function adminVhsPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🎬 영화 · 비디오 표지 생성기"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    let m;
    try { m = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { }
    if (!m || !m.script) m = blank();
    m.cover ||= {}; m.cover.spine ||= { font: "bold" }; m.cover.front ||= {}; m.cover.back ||= {};
    const keep = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(m)); } catch { } };
    const page = h("div.page.admin-vhs");
    const form = h("div.vg-form"), preview = h("div.vg-preview"), list = h("div.vg-list");
    const players = [...Store.allPlayers].sort((a, b) => String(a.name_ko).localeCompare(String(b.name_ko), "ko"));
    const roles = () => m.cast.map(c => c.role).filter(Boolean);
    const upd = () => { keep(); drawPreview(); };

    const inp = (label, get, set, o = {}) => { const el = h(o.area ? "textarea.input" : "input.input", { ...(o.area ? {} : { value: get() ?? "", type: o.type || "text" }), min: o.min, max: o.max, placeholder: o.ph || "", oninput: e => { set(o.type === "number" ? +e.target.value : e.target.value); upd(); } }); if (o.area) el.value = get() ?? ""; return h("label", label, el); };
    const sel = (label, opts, get, set, redraw = false) => h("label", label, h("select", { onchange: e => { set(e.target.value); upd(); if (redraw) drawForm(); } }, opts.map(([v, l]) => h("option", { value: v, selected: String(get()) === String(v) }, l))));
    const starOpts = [1, 2, 3, 4, 5, 6, 7].map(n => [n, "★".repeat(n)]);

    function drawForm() {
        const [y, mo, d] = (m.date || "0-1-1").split("-").map(Number);
        const setDate = (Y, M, Dd) => { m.date = `${Math.max(0, Math.min(10000, Y | 0))}-${String(Math.max(1, Math.min(12, M | 0))).padStart(2, "0")}-${String(Math.max(1, Math.min(31, Dd | 0))).padStart(2, "0")}`; };
        put(form,
            h("h3", "🎞️ 영화 정보"),
            h("div.vg-grid",
                inp("영어 제목 (원제)", () => m.en, v => m.en = v, { ph: "Fortune Swindlers" }),
                inp("한글 출시 제목", () => m.ko, v => m.ko = v, { ph: "복덩이 사기단" }),
                sel("영화사 (비디오 브랜드)", D.BRANDS.map(b => [b.id, b.name + (b.nation ? ` (${b.nation} 전용)` : b.genre ? ` (${b.genre} 전문)` : b.note ? ` (${b.note})` : b.bw ? " (흑백 전용)" : "")]), () => m.brand, v => { m.brand = v; m.bw = !!D.BRAND_BY_ID[v]?.bw; const n = D.BRAND_BY_ID[v]?.nation; if (n) m.nation = n; }, true),
                sel("제작국가", COUNTRIES.map(c => [c, c]), () => m.nation, v => m.nation = v),
                h("label", "제작년월일 (0년 1월 1일 ~ 10000년 12월 31일)", h("div.row",
                    h("input.input", { type: "number", min: 0, max: 10000, value: y, style: { width: "90px" }, oninput: e => { setDate(+e.target.value, mo, d); upd(); } }), "년",
                    h("input.input", { type: "number", min: 1, max: 12, value: mo, style: { width: "60px" }, oninput: e => { setDate(y, +e.target.value, d); upd(); } }), "월",
                    h("input.input", { type: "number", min: 1, max: 31, value: d, style: { width: "60px" }, oninput: e => { setDate(y, mo, +e.target.value); upd(); } }), "일")),
                sel("장르 1", D.GENRES.map(g => [g, `${D.GENRE_EMOJI[g]} ${g}`]), () => m.genres[0], v => m.genres = [v, ...(m.genres[1] && m.genres[1] !== v ? [m.genres[1]] : [])]),
                sel("장르 2 (선택)", [["", "없음"], ...D.GENRES.map(g => [g, `${D.GENRE_EMOJI[g]} ${g}`])], () => m.genres[1] || "", v => m.genres = [m.genres[0], ...(v && v !== m.genres[0] ? [v] : [])]),
                sel("등급 (띠)", D.RATINGS.map(r => [r.id, D.ratingText(r.id)]), () => m.rating, v => m.rating = v),
                sel("희귀도", starOpts, () => m.stars, v => m.stars = +v),
                sel("작품성", starOpts, () => m.quality, v => m.quality = +v),
                sel("배경음악", MUSIC, () => m.music, v => m.music = v),
                h("label", "🏳️‍🌈 LGBTQ 영화", h("input", { type: "checkbox", checked: !!m.lgbtq, onchange: e => { m.lgbtq = e.target.checked; upd(); } }))),
            inp("줄거리", () => m.plot, v => m.plot = v, { area: true }),
            inp("앞표지 홍보문구", () => m.tagline, v => m.tagline = v, { ph: "이들이 나타나면 온 세상의 배꼽이 뒤집어 진다!!" }),

            h("h3", "🎭 출연 배우"),
            ...m.cast.map((c, i) => h("div.vg-cast-row",
                h("select", { onchange: e => { const p = Store.player(e.target.value); c.pid = p?.id ?? null; c.ko = p?.name_ko || p?.player_name || ""; upd(); } }, h("option", { value: "" }, "플레이어…"), players.map(p => h("option", { value: p.id, selected: +c.pid === p.id }, `${p.name_ko || p.player_name} #${p.id}`))),
                h("input.input", { value: c.role || "", placeholder: "역할 (예: Jack, the Gang Boss)", oninput: e => { c.role = e.target.value; c.short = e.target.value.split(",")[0].trim(); upd(); } }),
                h("select", { onchange: e => { c.part = e.target.value; upd(); } }, PARTS.map(([v, l]) => h("option", { value: v, selected: c.part === v }, l))),
                h("label.check", h("input", { type: "checkbox", checked: !!c.nude, onchange: e => { c.nude = e.target.checked; upd(); } }), "Nudity"),
                h("label.check", h("input", { type: "checkbox", checked: !!c.sexy, onchange: e => { c.sexy = e.target.checked; upd(); } }), "Sexy"),
                h("button.btn.ghost.small", { onclick: () => { m.cast.splice(i, 1); upd(); drawForm(); } }, "✕"))),
            h("button.btn.ghost", { onclick: () => { m.cast.push({ pid: null, ko: "", role: "", part: "lead" }); upd(); drawForm(); } }, "➕ 배우 추가"),

            h("h3", "🖼️ 비디오 표지"),
            h("p.muted.small", `중간표지는 영화사마다 정해진 스타일로 그려집니다 (${D.BRAND_BY_ID[m.brand]?.name}: ${spineRule(m.brand)}). 앞표지 · 뒷표지는 아래에서 따로 주문하거나 영화사 기본 구성을 씁니다.`),
            h("div.vg-grid",
                sel("앞표지 · 뒷표지 제목 글꼴", [["bold", "굵게"], ["comic", "우스꽝스러운"], ["brush", "붓글씨"], ["neon", "네온"]], () => m.cover.spine.font, v => { m.cover.spine.font = v; const t = m.script.find(p => p.k === "title"); if (t) t.style = v; }),
                sel("앞표지 구성", D.FRONT_LAYOUTS, () => m.cover.front.layout || "", v => m.cover.front.layout = v || undefined, true),
                sel("뒷표지 구성", D.BACK_LAYOUTS, () => m.cover.back.layout || "", v => m.cover.back.layout = v || undefined),
                h("label", "앞표지 배경색", h("input", { type: "color", value: m.cover.front.bg || D.BRAND_BY_ID[m.brand]?.color || "#0ea5e9", oninput: e => { m.cover.front.bg = e.target.value; upd(); } }))),
            m.cover.front.layout === "money-burst" ? h("div.vg-grid",
                inp("돈뭉치 위 메인 역할 (쉼표 · 통쾌한 표정)", () => (m.cover.front.main || []).map(s => s.r || s).join(", "), v => m.cover.front.main = v.split(",").map(s => s.trim()).filter(Boolean).map(r => ({ r, expr: "excited", pose: "both", hold: "money" })), { ph: "Henry, Justin" }),
                inp("돈뭉치를 뚫고 나온 역할 (쉼표 · 못마땅한 표정)", () => (m.cover.front.back || []).map(s => s.r || s).join(", "), v => { const guns = gunRoles(); m.cover.front.back = v.split(",").map(s => s.trim()).filter(Boolean).map(r => ({ r, expr: "annoyed", ...(guns.includes(r) ? { pose: "point", hold: "gun" } : { pose: "hips" }) })); }, { ph: "Paul, Lily, Jack" }),
                inp("총을 든 역할 (쉼표)", () => gunRoles().join(", "), v => { const guns = v.split(",").map(s => s.trim()).filter(Boolean); m.cover.front.back = (m.cover.front.back || []).map(s => ({ ...s, ...(guns.includes(s.r) ? { pose: "point", hold: "gun" } : { pose: "hips", hold: undefined }) })); }, { ph: "Jack, Paul" })) : null,
            h("p.muted.small", `뒷표지 스틸컷은 아래 영화 구성의 앞 장면들로 만들어집니다 (배우는 대사에 맞는 표정 · 손짓). 역할 목록: ${roles().join(" · ") || "(배우를 먼저 추가)"}`),

            h("h3", `🎬 영화 구성 (${D.scriptSeconds(m)}초 — 60~180초)`),
            ...m.script.map((p, i) => partEditor(p, i)),
            h("div.row",
                h("button.btn.ghost", { onclick: () => { m.script.splice(m.script.length - 1, 0, { k: "scene", sec: 10, bg: "street", who: [], lines: [] }); upd(); drawForm(); } }, "➕ 장면 추가")));
    }
    const gunRoles = () => (m.cover.front.back || []).filter(s => s.hold === "gun").map(s => s.r);
    const spineRule = id => { const S = D.brandStyle(id); return [S.band ? "띠 표시" : "띠 없음", S.main === "en" ? "영어 원제 크게" : "한글 제목 크게 (세로 한 줄)", S.sub === "en" ? "영어 원제 작게" : S.sub === "ko" ? "한글 제목 작게" : S.sub === "row" ? "한글 제목 가로로 작게" : "", S.still === "none" ? "스틸컷 없음" : S.still === "under" ? "한글 제목 아래 작은 스틸컷" : "작은 스틸컷"].filter(Boolean).join(" · "); };
    // a line: "역할: 대사 [표정 손짓 소품 동작]" — e.g. "Jack: 잡아!! [angry point gun stomp]" (the bracket is optional)
    const ACTS = ["talk", "hop", "jump", "run", "stomp", "shake", "dance"];
    const parseLine = s => {
        const k = s.indexOf(":"); let who = k > 0 ? s.slice(0, k).trim() : "", text = k > 0 ? s.slice(k + 1).trim() : s;
        const mm = text.match(/\s*\[([^\]]*)\]\s*$/), meta = {};
        if (mm) { text = text.slice(0, mm.index).trim(); for (const t of mm[1].split(/[\s,]+/).filter(Boolean)) { if (t in EXPR_KO) meta.expr = t; else if (t in POSE_KO) meta.pose = t; else if (t in HOLD_KO) meta.hold = t; else if (ACTS.includes(t)) meta.act = t; } }
        return Object.keys(meta).length ? [who, text, meta] : [who, text];
    };
    const lineText = ([w, t, meta]) => `${w}: ${t}` + (meta ? ` [${[meta.expr, meta.pose, meta.hold, meta.act].filter(Boolean).join(" ")}]` : "");
    function partEditor(p, i) {
        const head = { brand: "① 도입부 — 영화사 브랜드", title: "② 제목 — 영어 원제 → 한글 제목", cast: "③ 출연 배우", scene: "🎞️ 장면", end: "🔚 엔딩" }[p.k];
        const secIn = h("input.input", { type: "number", min: 2, max: 60, value: p.sec, style: { width: "70px" }, oninput: e => { p.sec = +e.target.value || 2; upd(); } });
        if (p.k !== "scene") return h("div.vg-scene", h("div.row", h("b", head), secIn, "초",
            p.k === "cast" ? h("label.check", h("input", { type: "checkbox", checked: (p.parts || []).includes("extra"), onchange: e => { p.parts = e.target.checked ? ["lead", "support", "extra"] : ["lead", "support"]; upd(); } }), "엑스트라도 표시") : null,
            p.k === "end" ? [h("input.input", { value: p.text || "The End", style: { width: "120px" }, oninput: e => { p.text = e.target.value; upd(); } }), h("label.check", h("input", { type: "checkbox", checked: !!p.credits, onchange: e => { p.credits = e.target.checked; upd(); } }), "출연 배우 크레딧")] : null));
        const lines = h("textarea.input", { placeholder: "한 줄에 하나씩 — 역할: 대사 [표정 손짓 소품 동작] (대괄호는 선택)\nHenry: 거기 누구야?! [shock shrug]\nJustin: 튀어!! [scared both run]", oninput: e => { p.lines = e.target.value.split("\n").map(s => s.trim()).filter(Boolean).map(parseLine); upd(); } });
        lines.value = (p.lines || []).map(lineText).join("\n");
        return h("div.vg-scene",
            h("div.row", h("b", `${head} ${m.script.slice(0, i).filter(x => x.k === "scene").length + 1}`), secIn, "초",
                h("select", { onchange: e => { p.bg = e.target.value; upd(); } }, BGS.map(([v, l]) => h("option", { value: v, selected: p.bg === v }, l))),
                h("input.input", { value: p.place || "", placeholder: `장소 (${BG_KO[p.bg || "street"] || ""})`, style: { width: "130px" }, title: "장면 위에 표시되는 장소 (비우면 배경 이름)", oninput: e => { p.place = e.target.value || undefined; upd(); } }),
                h("select", { title: "이 장면의 배경음 (비우면 앞 장면 음악이 이어짐)", onchange: e => { p.music = e.target.value || undefined; upd(); } }, [["", "🎵 음악 이어짐"], ...MUSIC].map(([v, l]) => h("option", { value: v, selected: (p.music || "") === v }, l))),
                h("select", { onchange: e => { p.fx = e.target.value || undefined; upd(); } }, FX.map(([v, l]) => h("option", { value: v, selected: (p.fx || "") === v }, l))),
                h("button.btn.ghost.small", { disabled: i === 3, onclick: () => { [m.script[i - 1], m.script[i]] = [m.script[i], m.script[i - 1]]; upd(); drawForm(); } }, "⬆"),
                h("button.btn.ghost.small", { onclick: () => { m.script.splice(i, 1); upd(); drawForm(); } }, "✕")),
            h("div.row", h("small", "등장 역할:"), roles().map(r => h("label.check", h("input", { type: "checkbox", checked: (p.who || []).includes(r), onchange: e => { p.who = e.target.checked ? [...(p.who || []), r] : (p.who || []).filter(x => x !== r); upd(); } }), r))),
            h("div.row", h("small", "상반신 노출 (가리지 않음 · 춤추면 가슴이 흔들림):"), roles().map(r => h("label.check", h("input", { type: "checkbox", checked: (p.nude || []).includes(r), onchange: e => { p.nude = e.target.checked ? [...(p.nude || []), r] : (p.nude || []).filter(x => x !== r); upd(); } }), r))),
            h("input.input", { value: (p.props || []).join(" "), placeholder: "소품 이모지 (띄어쓰기) 예: 🧦 💰 🚕", oninput: e => { p.props = e.target.value.split(/\s+/).filter(Boolean); upd(); } }),
            lines,
            h("details.vg-help", h("summary", "😀 대괄호에 쓸 수 있는 말"),
                h("small", "표정: ", Object.entries(EXPR_KO).map(([k, v]) => `${k} ${v}`).join(" · ")), h("br"),
                h("small", "손짓: ", Object.entries(POSE_KO).map(([k, v]) => `${k} ${v}`).join(" · ")), h("br"),
                h("small", "소품: ", Object.entries(HOLD_KO).map(([k, v]) => `${k} ${v}`).join(" · ")), h("br"),
                h("small", "동작: talk 말하기 · hop 깡총 · jump 점프 · run 달리기 · stomp 발 구르기 · shake 덜덜 · dance 춤"), h("br"),
                h("small.muted", "대괄호가 없으면 대사 내용으로 표정 · 동작을 정합니다 (!! → 화남/신남, ? → 놀람, 튀어 → 달리기 …)")));
    }
    function drawPreview() {
        const ok = m.en && m.ko && m.cast.length;
        put(preview, h("h3", "👀 미리보기"), ok ? vhsBox(m) : h("p.notice", "영어 제목 · 한글 제목 · 배우 1명 이상을 입력하면 표지가 보입니다."),
            h("div.row",
                h("button.btn.ghost", { disabled: !ok, onclick: () => playMovie(m) }, "▶ 영화 미리보기 재생"),
                h("button.btn.gold", { disabled: !ok, onclick: save }, m.id && m.id.startsWith("a_") ? "💾 저장 (수정)" : "💾 영화DB에 저장")),
            ok ? h("details", h("summary", "🎞️ 영화DB 정보 미리보기"), dbCard(m)) : null);
    }
    async function save() {
        const secs = D.scriptSeconds(m);
        if (secs < 60 || secs > 180) return toast(`영화 길이는 60~180초여야 합니다 (지금 ${secs}초)`, "warn", 4000);
        if (!m.cast.some(c => c.part === "lead")) return toast("주연 배우가 1명 이상 필요합니다", "warn");
        Store.vhs ||= { own: {}, movies: [] };
        const movies = (Store.vhs.movies ||= []);
        if (!m.id || !m.id.startsWith("a_")) m.id = "a_" + Date.now().toString(36);
        m.updated = new Date().toISOString();
        const at = movies.findIndex(x => x.id === m.id);
        const rec = structuredClone(m);
        at >= 0 ? movies.splice(at, 1, rec) : movies.push(rec);
        await Store.saveKey("vhs");
        keep();
        toast(`🎬 ${m.ko} 저장 — 조건에 맞는 VHS 가게 진열대에 나옵니다`, "ok", 3500);
        drawList(); drawGallery();
        drawPreview();
    }
    function drawList() {
        const mine = Store.vhs?.movies || [];
        put(list, h("h3", "📚 저장된 영화"),
            ...D.builtinMovies().map(x => h("div.vg-list-row", h("b", `⭐ ${D.titleText(x)}`), h("small.muted", "기본 영화"), h("button.btn.ghost.small", { onclick: () => { m = { ...structuredClone(x), id: "", builtin: false }; keep(); drawForm(); drawPreview(); } }, "복사해서 편집"))),
            ...mine.map(x => h("div.vg-list-row", h("b", D.titleText(x)), h("small.muted", `${x.genres.join("·")} · ★${x.stars}`),
                h("button.btn.ghost.small", { onclick: () => { m = structuredClone(x); keep(); drawForm(); drawPreview(); } }, "편집"),
                h("button.btn.ghost.small", { onclick: async () => {
                    if (!(await confirmBox(`${x.ko}을(를) 영화DB에서 삭제할까요? (이미 산 플레이어의 VHS Collection에는 그대로 남습니다)`, "삭제", "취소"))) return;
                    Store.vhs.movies = mine.filter(y => y.id !== x.id); await Store.saveKey("vhs"); drawList(); drawGallery();
                } }, "삭제"))),
            h("div.row",
                h("button.btn.ghost", { onclick: () => { m = blank(); keep(); drawForm(); drawPreview(); } }, "🆕 새 영화")),
            giveBox());
    }
    // 🎁 put a copy of a movie into a player's VHS Collection (testing / events)
    function giveBox() {
        const all = [...D.builtinMovies(), ...(Store.vhs?.movies || [])];
        const ms = h("select", all.map(x => h("option", { value: x.id }, x.ko)));
        const ps = h("select", players.map(p => h("option", { value: p.id }, `${p.name_ko || p.player_name} #${p.id}`)));
        return h("details", h("summary", "🎁 플레이어 VHS Collection에 넣기"), h("div.row", ms, ps, h("button.btn.ghost.small", { onclick: async () => {
            const x = all.find(y => y.id === ms.value), pid = +ps.value;
            if (!x) return;
            Store.vhs ||= { own: {}, movies: [] };
            const own = (Store.vhs.own[pid] ||= []);
            if (own.some(y => y.id === x.id)) return toast("이미 가지고 있습니다", "warn");
            own.push({ id: x.id, at: new Date().toISOString(), season: Store.season?.number || 0, m: structuredClone(x), gift: true });
            await Store.saveKey("vhs");
            toast(`🎁 ${x.ko} → ${Store.player(pid)?.name_ko}`, "ok");
        } }, "넣기")));
    }
    // 📼 every video made so far: its three covers + ▶ play the film
    const gallery = h("div.vg-gallery");
    function drawGallery() {
        const all = [...D.builtinMovies(), ...(Store.vhs?.movies || []).filter(x => x && x.id)];
        put(gallery, h("h3", `📼 지금까지 만든 비디오 (${all.length}편)`),
            all.map(x => h("div.vg-video",
                h("div.vg-video-head",
                    h("b", D.titleText(x)),
                    h("small.muted", `${D.BRAND_BY_ID[x.brand]?.name || x.brand} · ${x.nation} · ${x.genres.join("·")} · ${D.RATING_BY_ID[x.rating]?.name || ""} · ★${x.stars} · ${Math.round(D.scriptSeconds(x) / 6) / 10}분${x.off ? " · 숨김" : ""}`),
                    h("button.btn.gold.small", { onclick: () => playMovie(x) }, "▶ 영화 재생"),
                    h("button.btn.ghost.small", { onclick: () => { m = x.builtin ? { ...structuredClone(x), id: "", builtin: false } : structuredClone(x); keep(); drawForm(); drawPreview(); window.scrollTo({ top: 0, behavior: "smooth" }); } }, x.builtin ? "복사해서 편집" : "편집")),
                vhsBox(x))));
    }
    drawForm(); drawPreview(); drawList(); drawGallery();
    put(page, h("h2.page-title", "🎬 영화 · 비디오 표지 생성기"),
        h("p.muted", "관리자가 주문한 영화만 만들어집니다. 영화 정보 · 출연 배우 · 비디오 표지 · 영화 구성을 만들어 영화DB에 저장하면 조건(장르 · 국가 · 희귀도)에 맞는 VHS 가게에 진열됩니다."),
        h("div.vg-wrap", form, h("div.vg-side", preview, list)),
        gallery);
    return page;
}
