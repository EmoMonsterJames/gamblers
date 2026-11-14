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
        testSeasonCard());
}

// 🧪 test season: up to 20 players, all starting from zero, nothing saved
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
