// Admin: resource dashboard — how full the game's resources are (Supabase DB,
// GitHub repo / Cloudflare Pages limits, this browser), which one is the
// heaviest, and whether the system is overloaded overall.
//
// Everything here is read-only and uses public endpoints only. Secret-token
// metrics (Cloudflare analytics, Supabase egress / billing) cannot be read from
// a browser page safely — see the note rendered at the bottom.
import { h, fmt } from "../core/util.js";
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { LOCATIONS, ITEMS, WEAPONS, PETS, FRAMES, PROFILE_EFFECTS, REGIONS } from "../data/catalog.js";
import { SLOTS } from "../slots/configs.js";
import { CASINO_GAMES } from "../data/casino.js";

const TABLES = ["players", "seasons", "season_results", "hall_of_fame", "slot_jackpots", "jackpot_hits", "slot_machine_state", "settings"];
// free-plan limits (Supabase Free, GitHub, Cloudflare Pages Free)
const LIMIT = {
    db: 500 * 2 ** 20,            // Supabase Free database size
    json: 2 ** 20,                // one jsonb value re-sent on every save — keep under ~1 MB
    repo: 2 ** 30,                // GitHub recommended repo size
    ghFile: 50 * 2 ** 20,         // GitHub warns above 50 MB (hard limit 100 MB)
    cfFiles: 20000,               // Cloudflare Pages files per deployment
    cfFile: 25 * 2 ** 20,         // Cloudflare Pages max single file
    ls: 5 * 2 ** 20,              // localStorage per origin (most browsers)
    writesPerMin: 120,            // our own budget for cloud writes from one browser
    latency: 1500,                // ms for a simple count query
    dom: 6000                     // DOM nodes on this page before the UI gets sluggish
};
const bytes = n => n == null ? "—" : n < 1024 ? `${n} B` : n < 2 ** 20 ? `${(n / 1024).toFixed(1)} KB` : n < 2 ** 30 ? `${(n / 2 ** 20).toFixed(1)} MB` : `${(n / 2 ** 30).toFixed(2)} GB`;
const jsonSize = v => v == null ? 0 : new Blob([JSON.stringify(v)]).size;
const level = p => p == null ? "info" : p >= 0.85 ? "bad" : p >= 0.6 ? "warn" : "ok";
const LV = { ok: "🟢 정상", warn: "🟡 주의", bad: "🔴 과부하", info: "⚪ 참고" };

export function adminResourcesPage() {
    const body = h("div.res-body", h("p.muted.center", "측정 중…"));
    const page = h("div.page.admin-res",
        h("div.row.between", h("h2.page-title", "📊 리소스 대시보드"), h("div.row", h("a.btn.ghost", { href: "#/admin" }, "← 관리자"), h("button.btn.gold", { onclick: () => run(true) }, "🔄 다시 측정"))),
        h("p.muted", "Supabase DB · GitHub 저장소 · Cloudflare Pages 한도 · 이 브라우저의 사용량을 한도 대비 %로 보여줍니다. 60% 이상 주의, 85% 이상 과부하."),
        body);

    async function run(fresh = false) {
        body.replaceChildren(h("p.muted.center", "측정 중…"));
        const m = []; // { group, name, value, used, limit, note }
        // byte-sized metrics show their limit as "500.0 MB" instead of a raw number
        const add = (group, name, used, limit, value, note = "") => m.push({ group, name, used, limit, value: value ?? fmt(used), note, pct: limit ? used / limit : null, limitLabel: limit && /[KMG]?B$/.test(String(value)) ? bytes(limit) : null });
        const [sbRes, gh] = await Promise.all([supabaseMetrics(add), githubMetrics(add, fresh)]);
        browserMetrics(add);
        gameMetrics(add);
        render(m, sbRes, gh);
    }

    function render(m, sbRes, gh) {
        const ranked = m.filter(x => x.pct != null).sort((a, b) => b.pct - a.pct);
        const top = ranked[0];
        const overall = level(top?.pct ?? 0);
        const nBad = ranked.filter(x => level(x.pct) === "bad").length, nWarn = ranked.filter(x => level(x.pct) === "warn").length;
        const verdict = overall === "bad" ? "과부하 상태입니다 — 아래 🔴 항목부터 줄이세요." : overall === "warn" ? "전체적으로 정상이지만 한도에 다가가는 항목이 있습니다." : "전체적으로 여유가 있습니다 (과부하 아님).";
        const bar = x => h("div.res-bar.lv-" + level(x.pct), h("i", { style: `width:${Math.min(100, (x.pct ?? 0) * 100).toFixed(1)}%` }));
        const groups = [...new Set(m.map(x => x.group))];
        body.replaceChildren(
            h("div.res-summary." + overall,
                h("div.res-verdict", h("b", LV[overall]), h("span", verdict)),
                h("div.res-kpis",
                    h("div", h("small", "가장 부하가 큰 지표"), h("b", top ? `${top.group} · ${top.name}` : "—"), h("span", top ? `${(top.pct * 100).toFixed(1)}% (${top.value} / ${top.limitLabel || fmtLimit(top)})` : "")),
                    h("div", h("small", "🔴 과부하 / 🟡 주의"), h("b", `${nBad} / ${nWarn}`), h("span", `측정 지표 ${ranked.length}개`)),
                    h("div", h("small", "Supabase 응답"), h("b", sbRes.ok ? `${sbRes.avgMs} ms` : "연결 안 됨"), h("span", sbRes.ok ? `조회 ${sbRes.n}회 평균` : sbRes.msg)))),
            h("h3", "🏋️ 부하 순위 (한도 대비)"),
            h("div.res-rank", ranked.slice(0, 8).map((x, i) => h("div.res-rank-row", h("b", `${i + 1}`), h("span", `${x.group} · ${x.name}`), bar(x), h("small", `${(x.pct * 100).toFixed(1)}%`)))),
            ...groups.map(g => h("div.admin-card.res-group", h("h3", g),
                h("div.res-table", m.filter(x => x.group === g).map(x => h("div.res-row.lv-" + level(x.pct),
                    h("span.res-name", x.name, x.note ? h("small", x.note) : ""),
                    h("span.res-val", x.value, x.limit ? h("small", ` / ${fmtLimit(x)}`) : ""),
                    x.pct != null ? bar(x) : h("span"),
                    h("span.res-lv", x.pct != null ? `${LV[level(x.pct)]} ${(x.pct * 100).toFixed(1)}%` : LV.info)))))),
            sbRes.tables ? h("div.admin-card.res-group", h("h3", "🗄️ Supabase 테이블별"),
                h("div.res-table", sbRes.tables.map(t => h("div.res-row.lv-info",
                    h("span.res-name", t.name), h("span.res-val", `${fmt(t.rows)}행`), h("span", t.bytes != null ? bytes(t.bytes) : ""),
                    h("span.res-lv", t.writes != null ? `쓰기 ${fmt(t.writes)} · 풀스캔 ${fmt(t.seq_scans)}` : t.ms != null ? `${t.ms} ms` : ""))))) : "",
            h("div.admin-card.res-note", h("h3", "ℹ️ 측정할 수 없는 지표"),
                h("ul",
                    h("li", h("b", "Cloudflare"), " — 요청 수·대역폭·Workers 사용량은 API 토큰이 필요하고, Cloudflare API는 브라우저에서 직접 호출할 수 없습니다(CORS). 대신 Pages 배포 한도(파일 수·파일 크기)를 GitHub 저장소 기준으로 점검합니다. 실제 트래픽은 Cloudflare 대시보드 → Analytics에서 확인하세요."),
                    h("li", h("b", "Supabase 대역폭(egress)·MAU·청구"), " — 관리용 토큰(service key / PAT)이 필요해 웹페이지에 넣으면 안 됩니다. Supabase 대시보드 → Usage에서 확인하세요. 필요하면 토큰을 서버(Edge Function)에 두고 이 화면이 그 결과만 읽도록 만들 수 있습니다."),
                    !sbRes.rpc ? h("li", h("b", "DB 전체 크기·테이블 크기·연결 수"), " — supabase/schema.sql 맨 아래의 ", h("code", "gamblers.resource_stats()"), " 함수를 Supabase SQL Editor에서 한 번 실행하면 표시됩니다 (지금은 행 수만 표시).") : "")));
    }
    run();
    return page;
}
const fmtLimit = x => x.limitLabel || fmt(x.limit);

// ---------------------------------------------------------------- Supabase
async function supabaseMetrics(add) {
    const G = "Supabase DB";
    if (!Store.cloud) { add(G, "연결", 0, null, "로컬 모드"); return { ok: false, msg: "로컬 모드" }; }
    const times = [];
    const tables = await Promise.all(TABLES.map(async name => {
        const t0 = performance.now();
        const r = await Store.probe(sb => sb.from(name).select("*", { count: "exact", head: true }));
        const ms = Math.round(performance.now() - t0); times.push(ms);
        return { name, rows: r.count ?? 0, ms, err: r.error?.message };
    }));
    const avgMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const failed = tables.filter(t => t.err);
    let rpc = null;
    if (Store.user) { const r = await Store.probe(sb => sb.rpc("resource_stats")); if (!r.error) rpc = r.data; }
    if (rpc) {
        add(G, "DB 전체 크기", rpc.db_bytes, LIMIT.db, bytes(rpc.db_bytes));
        add(G, "DB 연결 수", rpc.connections, rpc.max_connections, `${rpc.connections}개`);
        for (const t of rpc.tables) { const x = tables.find(y => y.name === t.name); Object.assign(t, { ms: x?.ms }); }
    } else {
        // no size RPC: estimate the DB from the rows we know the size of
        const est = jsonSize(Store.season) + jsonSize(Store.catalog) + jsonSize(Store.games) + jsonSize(Store.maps) + jsonSize(Store.wallets) + jsonSize(Store.allPlayers) + jsonSize(Store.hall) + jsonSize(Store.jpLog);
        add(G, "DB 크기 (추정)", est, LIMIT.db, bytes(est), "resource_stats() 미설치 — 앱이 받은 데이터 기준 추정");
       
    }
    add(G, "조회 응답 시간", avgMs, LIMIT.latency, `${avgMs} ms`, `테이블 ${TABLES.length}개 count 조회 평균`);
    if (failed.length) add(G, "조회 실패", failed.length, TABLES.length, `${failed.length}개`, failed.map(t => `${t.name}: ${t.err}`).join(" · "));
    const rows = tables.reduce((a, t) => a + t.rows, 0);
    add(G, "전체 행 수", rows, null, `${fmt(rows)}행`);
    // the jsonb values rewritten on every save are the main egress / write cost
    const big = [["시즌 상태 (seasons.state)", Store.season], ["상품 설정 (settings.catalog)", Store.catalog], ["게임 설정 (settings.games)", Store.games], ["맵 설정 (settings.maps)", Store.maps], ["지갑 (settings.wallets)", Store.wallets]];
    for (const [name, v] of big) { const b = jsonSize(v); add(G, name, b, LIMIT.json, bytes(b), "저장할 때마다 통째로 전송"); }
    return { ok: !failed.length || failed.length < TABLES.length, avgMs, n: TABLES.length, msg: failed[0]?.err, rpc: !!rpc, tables: rpc?.tables || tables };
}

// ---------------------------------------------------------------- GitHub + Cloudflare Pages
async function githubMetrics(add, fresh) {
    const repo = CONFIG.GITHUB_REPO;
    const G = "GitHub 저장소", C = "Cloudflare Pages 배포";
    if (!repo) { add(G, "저장소", 0, null, "설정 안 됨 (config.js GITHUB_REPO)"); return null; }
    const KEY = "gamblers.res.gh";
    let d = null;
    try { const c = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (!fresh && c && Date.now() - c.at < 10 * 60e3) d = c; } catch { }
    if (!d) {
        try {
            const info = await (await fetch(`https://api.github.com/repos/${repo}`)).json();
            if (!info.size && info.message) throw new Error(info.message);
            const tree = await (await fetch(`https://api.github.com/repos/${repo}/git/trees/${info.default_branch}?recursive=1`)).json();
            const blobs = (tree.tree || []).filter(t => t.type === "blob");
            const biggest = blobs.reduce((a, b) => (b.size > (a?.size || 0) ? b : a), null);
            d = { at: Date.now(), sizeKB: info.size, files: blobs.length, total: blobs.reduce((a, b) => a + b.size, 0), biggest: biggest && { path: biggest.path, size: biggest.size }, truncated: !!tree.truncated, pushed: info.pushed_at };
            try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { }
        } catch (e) {
            add(G, "저장소 조회", 0, null, "실패", `${e.message} — 비공개 저장소이거나 GitHub API 한도(시간당 60회) 초과`);
            return null;
        }
    }
    add(G, "저장소 크기 (.git 포함)", d.sizeKB * 1024, LIMIT.repo, bytes(d.sizeKB * 1024), d.pushed ? `마지막 푸시 ${new Date(d.pushed).toLocaleString()}` : "");
    add(G, "가장 큰 파일", d.biggest?.size || 0, LIMIT.ghFile, bytes(d.biggest?.size), d.biggest?.path || "");
    add(C, "배포 파일 수", d.files, LIMIT.cfFiles, `${fmt(d.files)}개`, d.truncated ? "목록이 잘림 (매우 많음)" : "");
    add(C, "가장 큰 파일 (25MB 한도)", d.biggest?.size || 0, LIMIT.cfFile, bytes(d.biggest?.size), d.biggest?.path || "");
    add(C, "사이트 전체 크기", d.total, null, bytes(d.total));
    return d;
}

// ---------------------------------------------------------------- this browser
function browserMetrics(add) {
    const G = "이 브라우저";
    let ls = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls += (k.length + (localStorage.getItem(k) || "").length) * 2; } } catch { }
    add(G, "localStorage 사용량", ls, LIMIT.ls, bytes(ls), "로컬 저장 (시즌·잭팟·설정 사본)");
    const mem = performance.memory;
    if (mem) add(G, "JS 메모리", mem.usedJSHeapSize, mem.jsHeapSizeLimit, bytes(mem.usedJSHeapSize));
    const res = performance.getEntriesByType("resource");
    const xfer = res.reduce((a, r) => a + (r.transferSize || 0), 0);
    add(G, "불러온 파일", res.length, null, `${res.length}개 · ${bytes(xfer)} 전송`);
    const dom = document.getElementsByTagName("*").length;
    add(G, "화면 DOM 노드 수", dom, LIMIT.dom, `${fmt(dom)}개`);
    const now = Date.now(), last = Store.io.log.filter(t => now - t < 60e3).length;
    add(G, "클라우드 쓰기 (최근 1분)", last, LIMIT.writesPerMin, `${last}회/분`, `페이지 연 뒤 총 ${fmt(Store.io.writes)}회 · 실패 ${Store.io.errors}회`);
    const jpq = Object.values(Store._jpQueue || {}).length;
    if (jpq) add(G, "잭팟 적립 대기열", jpq, null, `${jpq}개 게임`);
}

// ---------------------------------------------------------------- game content
function gameMetrics(add) {
    const G = "게임 리소스";
    const custom = Object.values(Store.catalog?.custom || {}).reduce((a, l) => a + (l?.length || 0), 0);
    add(G, "지역 / 맵", REGIONS.length, null, `${REGIONS.length}개 지역 · ${LOCATIONS.length}개 맵`);
    add(G, "슬롯머신", SLOTS.length, null, `${SLOTS.length}개`, `맵 배치 ${LOCATIONS.reduce((a, l) => a + (l.slots?.length || 0), 0)}대`);
    add(G, "카지노 게임", CASINO_GAMES.length, null, `${CASINO_GAMES.length}개`);
    add(G, "상품", ITEMS.length, null, `아이템 ${ITEMS.length} · 무기 ${WEAPONS.length} · 펫 ${PETS.length} · 프레임 ${FRAMES.length} · 효과 ${PROFILE_EFFECTS.length}`, custom ? `관리자 추가 ${custom}개` : "");
    add(G, "플레이어", Store.allPlayers.length, null, `${Store.players.length}명 활성 / 전체 ${Store.allPlayers.length}명`);
    const machines = Object.keys(Store.machines || {}).length;
    add(G, "기계 상태 저장", machines, null, `${machines}대`, "슬롯별 진행 상태 (slot_machine_state)");
    add(G, "잭팟 기록", Store.jpLog.length, null, `${fmt(Store.jpLog.length)}건`, "MAXI 이상");
}
