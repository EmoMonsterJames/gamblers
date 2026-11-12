// Admin: map simulation with the test player (see game/sandbox.js)
import { h } from "../core/util.js";
import { Store } from "../core/store.js";
import { MISSIONS, TIERS, COUNTRIES } from "../data/catalog.js";
import { startSandbox, exitSandbox, isSandbox } from "../game/sandbox.js";

export function adminSimPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🧪 맵 시뮬레이션"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    // battle / rank missions need several players, so they are left out
    const playable = MISSIONS.filter(m => m.type !== "battle" && m.type !== "rank");
    const country = h("select", COUNTRIES.map(c => h("option", { value: c }, c)));
    const mission = h("select", [0, 1, 2, 3, 4].map(t => h("optgroup", { label: `난이도 ${TIERS[t]}` },
        playable.filter(m => m.tier === t).map(m => h("option", { value: m.id }, m.text)))));
    const money = h("input.num", { type: "number", min: 0, step: 10000, value: 1000000 });
    const points = h("input.num", { type: "number", min: 0, step: 10, value: 500 });
    const kit = h("input", { type: "checkbox", checked: true });
    const go = () => {
        startSandbox({ country: country.value, mission: MISSIONS.find(m => m.id === mission.value), money: +money.value || 0, points: +points.value || 0, kit: kit.checked });
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
            h("label.am-tog", kit, "지역 입장 아이템 · 알파벳 카드 · 연장권 등 테스트 키트 지급"),
            h("div.row", h("button.btn.gold.big", { onclick: go }, "🧪 시뮬레이션 시작"))));
}
