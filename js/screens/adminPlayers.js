// Admin: browse, edit, create and (de)activate players.
import { h } from "../core/util.js";
import { toast, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { COUNTRIES } from "../data/catalog.js";
import { avatar, displayName } from "../ui/profile.js";

const FIELDS = [
    ["login_id", "로그인 ID"], ["name_ko", "이름 (한글)"], ["player_name", "영문 이름"],
    ["country", "국가"], ["school", "학교"], ["job", "직업"], ["ethnicity", "종족"],
    ["age_group", "연령대"], ["gender", "성별"], ["preference", "성향"], ["handler", "전담자"]
];

export function adminPlayersPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🧑‍🤝‍🧑 플레이어 관리"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    let q = "", showOff = true;
    const list = h("div.ap-list");
    const search = h("input.input", { placeholder: "이름 / ID / 국가 검색", oninput: e => { q = e.target.value.trim().toLowerCase(); draw(); } });
    const offChk = h("label.check", h("input", { type: "checkbox", checked: true, onchange: e => { showOff = e.target.checked; draw(); } }), "비활성 포함");
    function draw() {
        const rows = Store.allPlayers.filter(p => (showOff || p.is_active !== false) &&
            (!q || `${p.id} ${p.login_id} ${p.name_ko} ${p.player_name} ${p.country}`.toLowerCase().includes(q)));
        list.replaceChildren(...rows.map(p => h("button.ap-row" + (p.is_active === false ? ".off" : ""), { onclick: () => editPlayer(p, draw) },
            avatar(p.id, 44, { effect: false }),
            h("div.ap-who", h("b", displayName(p)), h("small", `#${p.id} · ${p.player_name || ""} · ${p.login_id || ""}`)),
            h("small.ap-c", p.country || "-"), h("small.ap-c", p.handler ? `전담 ${p.handler}` : ""),
            p.is_active === false ? h("span.badge.off", "비활성") : null)));
    }
    draw();
    return h("div.page.admin-players",
        h("div.row.between", h("h2.page-title", "🧑‍🤝‍🧑 플레이어 관리"),
            h("div.row", h("a.btn.ghost", { href: "#/admin" }, "← 관리자"), h("button.btn.gold", { onclick: () => editPlayer(null, draw) }, "➕ 새 플레이어"))),
        h("p.muted", Store.cloud ? "변경 사항은 Supabase에 바로 저장됩니다." : "로컬 모드: 이 브라우저에만 저장됩니다."),
        h("div.row", search, offChk, h("small.muted", `전체 ${Store.allPlayers.length}명 · 활성 ${Store.players.length}명`)),
        list);
}

function editPlayer(p, onSaved) {
    const isNew = !p;
    const v = isNew ? { id: Store.nextPlayerId(), is_active: true, profile_image: "", country: COUNTRIES[0] } : { ...p };
    const images = [...new Set(Store.allPlayers.map(x => x.profile_image).filter(Boolean))].sort();
    const prev = h("img.ap-prev", { src: v.profile_image || "", alt: "" });
    const imgInput = h("input.input", { value: v.profile_image || "", placeholder: "images/players/xxx.svg 또는 https://…", oninput: e => { v.profile_image = e.target.value.trim(); prev.src = v.profile_image; } });
    const imgSel = h("select", { onchange: e => { if (!e.target.value) return; v.profile_image = e.target.value; imgInput.value = v.profile_image; prev.src = v.profile_image; } },
        h("option", { value: "" }, "기존 이미지에서 고르기…"), images.map(src => h("option", { value: src, selected: src === v.profile_image }, src.split("/").pop())));
    const inputs = FIELDS.map(([k, label]) => {
        const el = k === "country"
            ? h("select", { onchange: e => { v[k] = e.target.value; } }, [...new Set([...COUNTRIES, v.country].filter(Boolean))].map(c => h("option", { value: c, selected: c === v.country }, c)))
            : h("input.input", { value: v[k] ?? "", oninput: e => { v[k] = e.target.value; } });
        return h("label.cf", h("small", label), el);
    });
    const active = h("label.check", h("input", { type: "checkbox", checked: v.is_active !== false, onchange: e => { v.is_active = e.target.checked; } }), "활성 (시즌 선발 대상)");
    const m = modal(h("div.ap-form",
        h("div.ap-img", prev, h("div", h("small.muted", `ID #${v.id}`), imgSel, imgInput)),
        h("div.ap-grid", inputs),
        active,
        h("div.row", h("button.btn.gold", { onclick: async () => {
            if (!(v.name_ko || "").trim() && !(v.player_name || "").trim()) return toast("이름을 입력하세요", "warn");
            if (!v.profile_image) return toast("프로필 이미지를 지정하세요", "warn");
            const ok = await Store.savePlayer(v);
            if (ok === false) return;
            toast(isNew ? "플레이어를 추가했습니다" : "저장했습니다", "ok");
            m.close(); onSaved();
        } }, isNew ? "➕ 추가" : "💾 저장"), h("button.btn.ghost", { onclick: () => m.close() }, "취소"))),
        { title: isNew ? "➕ 새 플레이어" : `✏️ ${displayName(p)}`, wide: true });
}
