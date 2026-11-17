// Admin: map simulation with the test player (see game/sandbox.js)
import { h } from "../core/util.js";
import { Store } from "../core/store.js";
import { MISSIONS, TIERS, COUNTRIES, REGIONS, LOCATIONS } from "../data/catalog.js";
import { startSandbox, exitSandbox, isSandbox, startTestSeason, TEST_SEASON_MAX } from "../game/sandbox.js";
import { toast } from "../core/fx.js";
import { avatar, displayName } from "../ui/profile.js";

export function adminSimPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🧪 맵 시뮬레이션"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    // battle / rank missions need several players, so they are left out
    const playable = MISSIONS.filter(m => m.type !== "battle" && m.type !== "rank");
    const country = h("select", COUNTRIES.map(c => h("option", { value: c }, c)));
    const mission = h("select", [0, 1, 2, 3, 4].map(t => h("optgroup", { label: `난이도 ${TIERS[t]}` },
        playable.filter(m => m.tier === t).map(m => h("option", { value: m.id }, m.text)))));
    const money = h("input.num", { type: "number", min: 0, step: 10000, value: 8000000 });
    const points = h("input.num", { type: "number", min: 0, step: 10, value: 2000 });
    const kit = h("input", { type: "checkbox", checked: true });
    // start map: pick a region + map, or leave it on the roulette
    const mapSel = h("select");
    const regSel = h("select", { onchange: () => fillMaps() }, h("option", { value: "" }, "🎯 룰렛으로 (선택 안 함)"), REGIONS.filter(r => !r.off).map(r => h("option", { value: r.id }, `${r.emoji} ${r.name}`)));
    const fillMaps = () => mapSel.replaceChildren(...(regSel.value ? LOCATIONS.filter(l => l.region === regSel.value && !l.off).map(l => h("option", { value: l.id }, `${l.emoji || ""} ${l.name}`)) : [h("option", { value: "" }, "—")]));
    fillMaps();
    const go = () => {
        startSandbox({ country: country.value, mission: MISSIONS.find(m => m.id === mission.value), money: +money.value || 0, points: +points.value || 0, kit: kit.checked, startLoc: mapSel.value || null });
        location.hash = "#/season";
    };
    return h("div.page.admin-sim",
        h("div.row.between", h("h2.page-title", "🧪 맵 시뮬레이션"), h("a.btn.ghost", { href: "#/admin" }, "← 관리자")),
        isSandbox() ? h("div.notice", "🧪 테스트 모드 진행 중입니다. ", h("a.btn.small.gold", { href: "#/season" }, "계속하기"), " ", h("button.btn.small.red", { onclick: exitSandbox }, "테스트 종료")) : null,
        h("p.muted", "테스트 플레이어로 실제 시즌과 똑같이 턴을 진행해 봅니다: 지역 룰렛 → 맵 룰렛 → 입장 조건 → 슬롯·카지노 → 상점·맵권 → 돈벌기·직업·구걸 → NPC 습격 → 미션 판정. 턴이 끝나면 바로 다음 턴(다음 라운드)이 시작됩니다."),
        h("p.notice", "⚠️ 테스트 중에는 아무것도 저장되지 않습니다 (시즌, 잭팟, 슬롯 미터, 관리자 설정 모두). 진행 중인 실제 시즌은 그대로 두었다가 '테스트 종료'를 누르면 원래대로 돌아옵니다. 관리자 설정은 테스트를 끝낸 뒤에 바꾸세요."),
        h("div.ag-card",
            h("div.am-grid",
                h("label.cf", h("small", "테스트 플레이어 국적 (국적 전용 맵 확인용)"), country),
                h("label.cf", h("small", "시작 골드"), money),
                h("label.cf", h("small", "시작 포인트"), points)),
            h("label.cf", h("small", "미션 (배틀·순위 미션은 여러 명이 필요해 제외)"), mission),
            h("div.am-grid", h("label.cf", h("small", "📍 체험할 지역"), regSel), h("label.cf", h("small", "📍 체험할 맵 (턴이 시작되면 이 맵으로 바로 들어갑니다 · 테스트 중에도 상단 바에서 바꿀 수 있어요)"), mapSel)),
            h("label.am-tog", kit, "지역 입장 아이템 · 알파벳 카드 · 연장권 등 테스트 키트 지급"),
            h("div.row", h("button.btn.gold.big", { onclick: go }, "🧪 시뮬레이션 시작"))),
        survivalCard(),
        testSeasonCard());
}

// 🧪 test season: up to 20 players, all starting from zero, nothing saved
export function adminTestPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🏁 테스트 시즌"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    return h("div.page.admin-sim",
        h("div.row.between", h("h2.page-title", "🏁 테스트 시즌"), h("a.btn.ghost", { href: "#/admin" }, "← 관리자")),
        isSandbox() ? h("div.notice", "🧪 테스트 진행 중입니다. ", h("a.btn.small.gold", { href: "#/season" }, "계속하기"), " ", h("button.btn.small.red", { onclick: exitSandbox }, "테스트 종료")) : null,
        testSeasonCard());
}
function testSeasonCard() {
    const picked = new Set();
    const count = h("b", "0");
    const list = Store.players.filter(p => !p._test);
    const sync = () => { count.textContent = `${picked.size} / ${TEST_SEASON_MAX}`; grid.querySelectorAll(".ts-pick").forEach(el => el.classList.toggle("on", picked.has(+el.dataset.id))); };
    const toggle = id => {
        if (picked.has(id)) picked.delete(id);
        else if (picked.size >= TEST_SEASON_MAX) return toast(`최대 ${TEST_SEASON_MAX}명까지 고를 수 있습니다`, "warn");
        else picked.add(id);
        sync();
    };
    const grid = h("div.ts-grid", list.map(p => h("button.ts-pick", { "data-id": p.id, onclick: () => toggle(p.id) }, avatar(p.id, 44, { effect: false }), h("small", displayName(p)))));
    const random = () => { picked.clear(); [...list].sort(() => Math.random() - 0.5).slice(0, TEST_SEASON_MAX).forEach(p => picked.add(p.id)); sync(); };
    const go = () => {
        const r = startTestSeason([...picked]);
        if (!r.ok) return toast(r.why, "warn");
        location.hash = "#/season";
    };
    sync();
    return h("div.ag-card.ts-card",
        h("h3", "🏁 테스트 시즌"),
        h("p.muted", `최대 ${TEST_SEASON_MAX}명을 골라 실제 시즌과 똑같이 진행합니다 (미션 룰렛 → 턴 → 판정 → 탈락 → 결승). 모든 플레이어는 지난 시즌 기록·지갑·은행·EmoMon 도감과 상관없이 완전히 초기화된 상태로 시작합니다.`),
        h("p.notice", "⚠️ 테스트 시즌은 종료하거나 끝까지 진행해도 아무것도 저장되지 않으며 실제 시즌 데이터에 영향을 주지 않습니다. '테스트 종료'를 누르면 원래대로 돌아옵니다."),
        h("div.row", h("span", "선택: ", count), h("button.btn.small.ghost", { onclick: random }, `🎲 랜덤 ${TEST_SEASON_MAX}명`), h("button.btn.small.ghost", { onclick: () => { picked.clear(); sync(); } }, "선택 해제")),
        grid,
        h("div.row", h("button.btn.gold.big", { onclick: go }, "🏁 테스트 시즌 시작")));
}

// 🏝 Survival Land (EmoMonster survival maps, public.maps): pick a map → test bots stand on it in a separate
// sim season (emo_sv_sim_start) and the real survival screen opens in a new window. Nothing counts.
const SV_GROUPS = [["normal", "🗺 일반 맵", m => !m.special], ["special", "⚠️ 특수 맵", m => m.special && m.special !== "attr"], ["attr", "✨ 속성 맵", m => m.special === "attr"]];
const SV_WIN = "emoSvSim";
let svSimId = null;
const svActor = () => { try { return localStorage.getItem("EMO_CURRENT_PLAYER") || "0"; } catch { return "0"; } };
const svUrl = id => `EmoMonster/pages/survival.html?sim=${encodeURIComponent(id)}`;
function survivalCard() {
    const pc = Store.publicClient();
    const card = h("div.ag-card.sv-sim-card", h("h3", "🏝 Survival Land 맵 체험"),
        h("p.muted", "EmoMonster 서바이벌 맵을 골라 테스트 봇들과 함께 실제 규칙 그대로 체험합니다. 별도의 시뮬레이션 시즌이 만들어지고 새 창에서 실제 맵 화면이 열립니다 — 봇들의 턴을 직접 플레이하고, 타일을 쓰고, 라운드를 넘겨 보세요. 랭킹·명예의 전당·기록에는 남지 않습니다."));
    if (!pc || !Store.user) return card.appendChild(h("p.notice", "클라우드 관리자 로그인이 필요합니다 (⚙️ 관리자 페이지).")), card;
    card.append(h("p.notice", "ℹ️ 시뮬레이션 창은 EmoMonster에 관리자 계정으로 로그인되어 있어야 봇 턴을 진행할 수 있습니다. 새 시뮬레이션을 시작하면 이전 시뮬레이션은 삭제됩니다."));
    let maps = [], sel = null;
    const info = h("div.sv-sim-info.muted", "맵을 고르세요.");
    const bots = h("input.num", { type: "number", min: 1, max: 10, value: 4 });
    const out = h("div.small");
    const runBtn = h("button.btn.gold.big", { disabled: true, onclick: () => run() }, "🏝 Survival 체험 시작");
    const stopBtn = h("button.btn.red", { disabled: !svSimId, onclick: () => stop() }, "⏹ 시뮬레이션 종료");
    const board = h("div.sv-sim-board", h("p.muted", "맵을 불러오는 중…"));
    const pickMap = m => {
        sel = m;
        board.querySelectorAll(".sv-sim-tile").forEach(el => el.classList.toggle("on", el.dataset.id === String(m.id)));
        info.replaceChildren(h("b", `#${m.map_no} ${m.name}`), ` · ${"★".repeat(m.difficulty || 1)} · 정원 ${m.capacity || "∞"}${m.special ? ` · ${m.special}` : ""}`);
        info.classList.remove("muted");
        bots.value = Math.min(10, Math.max(2, m.capacity || 4));
        runBtn.disabled = false;
    };
    const tile = m => h("button.sv-sim-tile", { "data-id": m.id, title: m.name, style: { "--bg": `url('${new URL(`EmoMonster/${m.image || "images/maps/forest.png"}`, location.href).href}')` }, onclick: () => pickMap(m) },
        h("span.sv-sim-no", `#${m.map_no}`), h("b", m.name), h("small", `${"★".repeat(m.difficulty || 1)}${m.capacity ? ` · 👥${m.capacity}` : ""}`));
    const draw = () => board.replaceChildren(...SV_GROUPS.map(([k, label, f]) => {
        const list = maps.filter(f);
        return list.length ? h("div.sv-sim-group", h("h4", `${label} (${list.length})`), h("div.sv-sim-grid", list.map(tile))) : null;
    }));
    pc.from("maps").select("id,map_no,name,kind,special,difficulty,capacity,image,active").eq("kind", "field").order("map_no").then(({ data, error }) => {
        if (error) return board.replaceChildren(h("p.notice", `맵을 불러오지 못했습니다: ${error.message}`));
        maps = (data || []).filter(m => m.active !== false);
        if (!maps.length) return board.replaceChildren(h("p.muted", "Survival 맵이 없습니다. EmoMonster 맵 생성기에서 만들어 주세요."));
        draw();
    });
    async function run() {
        if (!sel) return;
        const n = Math.min(10, Math.max(1, +bots.value || 4));
        const win = window.open("", SV_WIN, "width=1280,height=900");
        runBtn.disabled = true;
        const { data, error } = await pc.rpc("emo_sv_sim_start", { p_actor: svActor(), p_map: String(sel.id), p_bots: n });
        runBtn.disabled = false;
        if (error) { win?.close(); return toast(error.message === "ADMIN_ONLY" ? "EmoMonster 관리자 계정으로 로그인한 뒤 다시 시도하세요" : `시작 실패: ${error.message}`, "warn"); }
        svSimId = data.season_id;
        const url = svUrl(svSimId);
        if (win) win.location.href = url; else window.open(url, SV_WIN);
        stopBtn.disabled = false;
        out.replaceChildren(`✅ 테스트 봇 ${data.bots}명이 `, h("b", sel.name), "에 섰습니다 — ", h("a", { href: url, target: SV_WIN }, "시뮬레이션 창 열기"));
    }
    async function stop() {
        if (!svSimId) return;
        const { error } = await pc.rpc("emo_sv_sim_stop", { p_actor: svActor(), p_season: String(svSimId) });
        if (error) return toast(`종료 실패: ${error.message}`, "warn");
        svSimId = null; stopBtn.disabled = true; out.textContent = "시뮬레이션을 종료했습니다.";
    }
    card.append(board, info, h("div.am-grid", h("label.cf", h("small", "테스트 봇 수 (1~10)"), bots)), h("div.row", runBtn, stopBtn), out);
    return card;
}
