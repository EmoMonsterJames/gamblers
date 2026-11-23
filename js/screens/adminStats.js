// =====================================================================
// 📊 플레이어 통계 (admin): how many players per 국적 · 종족 (카테고리 › 서브) · 성별 · 학교 · 직업 · 성향 ·
// 연령대 · 전담자, plus 전담자 × 성별 / 국적 × 전담자 tables. Filters: 활성만 / 전체 · 전담자 · 성별.
// Click any bar to see who is in it. Read-only.
// =====================================================================
import { h, put } from "../core/util.js";
import { modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { categoryOf, RACE_CAT } from "../data/races.js";
import { avatar, displayName } from "../ui/profile.js";

const norm = s => String(s ?? "").trim();
const GENDER = { male: "남성", female: "여성" };
const gOf = p => { const g = norm(p.gender).toLowerCase(); return g === "male" || g === "m" ? "male" : g === "female" || g === "f" ? "female" : g || "—"; };
const hOf = p => norm(p.handler).toUpperCase() || "—";
// [key, title, value of a player, label of a value]
const FIELDS = [
    ["country", "🌍 국적", p => norm(p.country) || "—"],
    ["cat", "🧬 종족 카테고리", p => categoryOf(p.ethnicity), v => `${RACE_CAT[v]?.emoji || ""} ${v}`],
    ["eth", "🧬 종족 (서브카테고리)", p => norm(p.ethnicity) || "—", v => { const c = categoryOf(v); return c.toLowerCase() === v.toLowerCase() ? v : `${v} · ${c}`; }],
    ["gender", "⚧ 성별", gOf, v => GENDER[v] || v],
    ["age", "🎂 연령대", p => norm(p.age_group) || "—"],
    ["pref", "💞 성향 (Preference)", p => norm(p.preference) || "—"],
    ["handler", "🧑‍💼 전담자", hOf],
    ["school", "🎓 학교", p => norm(p.school) || "—"],
    ["job", "💼 직업", p => norm(p.job) || "—"]
];

export function adminStatsPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "📊 플레이어 통계"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    const f = { active: true, handler: "", gender: "" };
    const body = h("div.st-body");
    const chips = (key, opts) => h("div.st-filter", opts.map(([v, l]) => h("button.btn.small" + (f[key] === v ? ".gold" : ".ghost"), { onclick: () => { f[key] = v; draw(); } }, l)));
    const pool = () => (f.active ? Store.players : Store.allPlayers).filter(p => (!f.handler || hOf(p) === f.handler) && (!f.gender || gOf(p) === f.gender));
    const countBy = (list, fn) => { const m = new Map(); for (const p of list) { const k = fn(p); if (!m.has(k)) m.set(k, []); m.get(k).push(p); } return [...m].sort((a, b) => b[1].length - a[1].length || String(a[0]).localeCompare(String(b[0]))); };
    const who = (title, list) => modal(h("div.st-who", list.sort((a, b) => a.id - b.id).map(p => h("div.st-who-p", avatar(p.id, 34, { effect: false, frame: false }), h("div", h("b", displayName(p)), h("small", `#${p.id} · ${norm(p.country)} · ${norm(p.ethnicity)} · ${GENDER[gOf(p)] || gOf(p)} · ${hOf(p)}`))))), { title: `${title} — ${list.length}명` });

    function section([key, title, fn, label = v => v], list) {
        const rows = countBy(list, fn), max = rows[0]?.[1].length || 1;
        const LIMIT = 12, long = rows.length > LIMIT;
        let open = false;
        const box = h("div.st-card" + (["school", "job", "eth"].includes(key) ? ".wide" : ""));
        const render = () => put(box,
            h("div.st-head", h("h4", title), h("small.muted", `${rows.length}종`)),
            h("div.st-rows", (open || !long ? rows : rows.slice(0, LIMIT)).map(([v, ps]) => h("button.st-row", { onclick: () => who(`${title}: ${label(v)}`, [...ps]), title: "누가 있는지 보기" },
                h("span.st-lbl", label(v)),
                h("span.st-bar", h("i", { style: { width: Math.max(2, ps.length / max * 100) + "%" } })),
                h("b.st-n", `${ps.length}`), h("small.st-pct", `${Math.round(ps.length / list.length * 100)}%`)))),
            long ? h("button.btn.small.ghost.st-more", { onclick: () => { open = !open; render(); } }, open ? "접기" : `전체 ${rows.length}종 보기`) : null);
        render();
        return box;
    }
    // a cross table: rows × columns with totals
    function cross(title, list, rowFn, colFn, rowLabel = v => v, colLabel = v => v) {
        const rows = countBy(list, rowFn).map(([k]) => k), cols = countBy(list, colFn).map(([k]) => k);
        const n = (r, c) => list.filter(p => (r == null || rowFn(p) === r) && (c == null || colFn(p) === c));
        const cell = (r, c) => { const ps = n(r, c); return h("td" + (ps.length ? "" : ".zero"), ps.length ? h("button.st-cell", { onclick: () => who(`${title}: ${r != null ? rowLabel(r) : "전체"} × ${c != null ? colLabel(c) : "전체"}`, ps) }, ps.length) : "0"); };
        return h("div.st-card.wide", h("div.st-head", h("h4", title)),
            h("div.st-table-wrap", h("table.st-table",
                h("thead", h("tr", h("th", ""), cols.map(c => h("th", colLabel(c))), h("th", "합계"))),
                h("tbody", rows.map(r => h("tr", h("th", rowLabel(r)), cols.map(c => cell(r, c)), cell(r, null))),
                    h("tr.st-total", h("th", "합계"), cols.map(c => cell(null, c)), cell(null, null))))));
    }
    function draw() {
        const list = pool();
        const g = countBy(list, gOf), hd = countBy(list, hOf);
        put(body,
            h("div.st-filters",
                chips("active", [[true, "활성 플레이어만"], [false, "비활성 포함 전체"]]),
                chips("handler", [["", "전담자 전체"], ["DYLAN", "DYLAN"], ["JAMES", "JAMES"]]),
                chips("gender", [["", "성별 전체"], ["male", "남성"], ["female", "여성"]])),
            h("div.st-tiles",
                h("div.st-tile", h("b", list.length), h("small", "명")),
                ...g.map(([k, ps]) => h("div.st-tile", h("b", ps.length), h("small", GENDER[k] || k))),
                ...hd.map(([k, ps]) => h("div.st-tile", h("b", ps.length), h("small", `전담 ${k}`))),
                h("div.st-tile", h("b", new Set(list.map(p => norm(p.country))).size), h("small", "국적 수")),
                h("div.st-tile", h("b", new Set(list.map(p => norm(p.ethnicity).toLowerCase())).size), h("small", "종족 수"))),
            !list.length ? h("p.notice", "조건에 맞는 플레이어가 없습니다.") : h("div.st-grid",
                ...FIELDS.map(x => section(x, list)),
                cross("🧑‍💼 전담자 × ⚧ 성별", list, hOf, gOf, v => v, v => GENDER[v] || v),
                cross("🌍 국적 × 🧑‍💼 전담자", list, p => norm(p.country) || "—", hOf),
                cross("🌍 국적 × ⚧ 성별", list, p => norm(p.country) || "—", gOf, v => v, v => GENDER[v] || v)));
    }
    draw();
    return h("div.page.admin-stats",
        h("div.row.between", h("h2.page-title", "📊 플레이어 통계"), h("a.btn.ghost", { href: "#/admin" }, "← 관리자")),
        h("p.muted", "국적 · 종족 · 성별 · 연령대 · 성향 · 전담자 · 학교 · 직업별 인원. 막대를 누르면 해당 플레이어 목록이 나옵니다."),
        body);
}
