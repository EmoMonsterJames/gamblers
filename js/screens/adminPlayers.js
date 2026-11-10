// Admin: browse, edit, create and (de)activate players. The edit form has
// dropdowns for the fixed profile fields and a player image generator.
import { h } from "../core/util.js";
import { toast, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { COUNTRIES } from "../data/catalog.js";
import { avatar, displayName } from "../ui/profile.js";
import {
    buildAvatar, toDataUri, parseGen, raceFromEthnicity, DEFAULTS, RACES, HUMAN_TYPES, SKIN_COLORS, HAIR_COLORS, SEASONS,
    HAIR_STYLES, HATS, GLASSES, SUNGLASSES, MAKEUPS, ACCS, outfitNames
} from "../ui/avatarGen.js";

const FIELDS = [
    ["login_id", "로그인 ID"], ["name_ko", "이름 (한글)"], ["player_name", "영문 이름"],
    ["country", "국가"], ["school", "학교"], ["job", "직업"], ["ethnicity", "종족"],
    ["age_group", "연령대"], ["gender", "성별"], ["preference", "성향"], ["handler", "전담자"]
];
// dropdown fields: fixed choices + whatever values the players already use
const CHOICES = {
    country: COUNTRIES,
    age_group: ["Baby", "Young Adult", "Adult", "Middle-Aged", "Senior"],
    gender: ["male", "female", "trans", "fluid"],
    preference: ["Straight", "Gay", "Bi", "Bi-Curious", "Tran-Curious"],
    school: [],
    ethnicity: ["Human", "Rabbit", "Bear", "Ant", "Smile", "Cloud", "Kalisto", "Devil", "Angel", "Ghost", "Invisible", "Jiangshi", "Donglee", "Triangle", "Square", "Rectangle", "Trapezoid"]
};
const CUSTOM_OK = ["school", "ethnicity"]; // "직접 입력…" allowed
function choices(k, current) {
    const used = Store.allPlayers.map(p => p[k]).filter(Boolean);
    const base = CHOICES[k];
    const extra = [...new Set(used)].filter(x => !base.includes(x)).sort((a, b) => a.localeCompare(b));
    return [...new Set([...base, ...extra, current].filter(Boolean))];
}

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
    const v = isNew ? { id: Store.nextPlayerId(), is_active: true, profile_image: "", country: COUNTRIES[0], gender: "male", ethnicity: "Human", age_group: "Young Adult", preference: "Straight" } : { ...p };
    const images = [...new Set(Store.allPlayers.map(x => x.profile_image).filter(s => s && !s.startsWith("data:")))].sort();
    const prev = h("img.ap-prev", { src: v.profile_image || "", alt: "" });
    const setImage = src => { v.profile_image = src; prev.src = src; imgInput.value = src.startsWith("data:") ? "" : src; imgInput.placeholder = src.startsWith("data:") ? "(생성기로 만든 이미지)" : "images/players/xxx.svg 또는 https://…"; };
    const imgInput = h("input.input", { value: (v.profile_image || "").startsWith("data:") ? "" : v.profile_image || "", placeholder: "images/players/xxx.svg 또는 https://…", oninput: e => { gen.disable(); v.profile_image = e.target.value.trim(); prev.src = v.profile_image; } });
    const imgSel = h("select", { onchange: e => { if (!e.target.value) return; gen.disable(); setImage(e.target.value); } },
        h("option", { value: "" }, "기존 이미지에서 고르기…"), images.map(src => h("option", { value: src, selected: src === v.profile_image }, src.split("/").pop())));

    // image generator: on for new players, off for existing ones until asked for
    const saved = parseGen(v.profile_image);
    const gen = generatorPanel(saved || { ...DEFAULTS, gender: v.gender === "female" ? "female" : "male", race: raceFromEthnicity(v.ethnicity), raceText: v.ethnicity || "", seed: 1 + Math.floor(Math.random() * 1e6) },
        isNew || !!saved, src => setImage(src));

    const inputs = FIELDS.map(([k, label]) => {
        let el;
        if (CHOICES[k]) {
            const draw = () => {
                const sel = h("select", { onchange: e => {
                    if (e.target.value === "__custom") { // swap to a text box for a brand-new value
                        const inp = h("input.input", { placeholder: `새 ${label} 입력`, onchange: ev => { v[k] = ev.target.value.trim(); sync(k); wrap.replaceChildren(draw()); }, onblur: ev => { if (!ev.target.value.trim()) wrap.replaceChildren(draw()); } });
                        wrap.replaceChildren(inp); inp.focus(); return;
                    }
                    v[k] = e.target.value; sync(k);
                } },
                    h("option", { value: "", selected: !v[k] }, "선택…"),
                    choices(k, v[k]).map(c => h("option", { value: c, selected: c === v[k] }, c)),
                    CUSTOM_OK.includes(k) ? h("option", { value: "__custom" }, "✏️ 직접 입력…") : null);
                return sel;
            };
            const wrap = h("div.ap-dd", draw());
            el = wrap;
        } else el = h("input.input", { value: v[k] ?? "", oninput: e => { v[k] = e.target.value; } });
        return h("label.cf", h("small", label), el);
    });
    // profile → generator: gender and race follow the profile dropdowns
    function sync(k) {
        if (k === "gender" && (v.gender === "male" || v.gender === "female")) gen.set({ gender: v.gender });
        if (k === "ethnicity") gen.set({ race: raceFromEthnicity(v.ethnicity), raceText: v.ethnicity || "" });
    }
    const active = h("label.check", h("input", { type: "checkbox", checked: v.is_active !== false, onchange: e => { v.is_active = e.target.checked; } }), "활성 (시즌 선발 대상)");
    const m = modal(h("div.ap-form.with-gen",
        h("div.ap-left",
            h("div.ap-img", prev, h("div", h("small.muted", `ID #${v.id}`), imgSel, imgInput)),
            h("div.ap-grid", inputs),
            active,
            h("div.row", h("button.btn.gold", { onclick: async () => {
                if (!(v.name_ko || "").trim() && !(v.player_name || "").trim()) return toast("이름을 입력하세요", "warn");
                if (!v.profile_image) return toast("프로필 이미지를 지정하세요 (오른쪽 생성기를 켜면 자동 등록)", "warn");
                const ok = await Store.savePlayer(v);
                if (ok === false) return;
                toast(isNew ? "플레이어를 추가했습니다 (이미지 포함)" : "저장했습니다", "ok");
                m.close(); onSaved();
            } }, isNew ? "➕ 추가" : "💾 저장"), h("button.btn.ghost", { onclick: () => m.close() }, "취소"))),
        gen.el),
        { title: isNew ? "➕ 새 플레이어" : `✏️ ${displayName(p)}`, wide: true, cls: "xwide" });
    if (isNew || saved) gen.emit();
}

// ---------------------------------------------------------------- image generator panel
function generatorPanel(initial, startOn, onImage) {
    const o = { ...DEFAULTS, ...initial };
    let on = startOn;
    const view = h("div.gen-view");
    const body = h("div.gen-body");
    const onChk = h("input", { type: "checkbox", checked: on, onchange: e => { on = e.target.checked; draw(); if (on) emit(); } });
    const el = h("div.gen-panel",
        h("div.gen-head", h("b", "🎨 플레이어 이미지 생성기"), h("label.check", onChk, "사용 (프로필 이미지로 자동 등록)")),
        h("div.gen-top", view, h("div.gen-btns",
            h("button.btn.gold", { onclick: () => { if (!on) { on = true; onChk.checked = true; } o.seed = 1 + Math.floor(Math.random() * 1e9); draw(); emit(); } }, "🎲 다시 생성"),
            h("small.muted", "같은 선택으로 표정·눈·포즈·배경만 바꿔서 다시 그립니다."))),
        body);
    function emit() {
        const svg = buildAvatar(o);
        view.innerHTML = svg;
        if (on) onImage(toDataUri(svg));
    }
    const change = (k, val) => { o[k] = val; draw(); emit(); };
    const L = (label, control, cls = "") => h("label.cf" + cls, h("small", label), control);
    const sel = (k, opts, { none = null, num = false } = {}) => h("select", { onchange: e => change(k, num ? +e.target.value : e.target.value) },
        none ? h("option", { value: -1, selected: o[k] === -1 }, none) : null,
        opts.map((x, i) => { const [val, text] = Array.isArray(x) ? x : [i, x]; return h("option", { value: val, selected: String(o[k]) === String(val) }, num ? `${i + 1}. ${text}` : text); }));
    const swatches = (k, colors, locked = false) => h("div.sw-row" + (locked ? ".locked" : ""),
        colors.map(([c, name]) => h("button.sw" + (o[k] === c ? ".on" : "") + (c === "rainbow" ? ".rainbow" : "") + (c === "auto" ? ".auto" : ""), { type: "button", title: name, disabled: locked, style: c.startsWith("#") ? { background: c } : {}, onclick: () => change(k, c) }, c === "auto" ? "기본" : "")),
        h("input.sw-pick", { type: "color", title: "직접 고르기", disabled: locked, value: /^#[0-9a-f]{6}$/i.test(o[k]) ? o[k] : "#888888", onchange: e => change(k, e.target.value) }));
    const chk = (k, label) => h("label.check", h("input", { type: "checkbox", checked: !!o[k], onchange: e => change(k, e.target.checked) }), label);
    function draw() {
        el.classList.toggle("off", !on);
        const g = o.gender === "female" ? "female" : "male";
        const human = o.race === "human", black = human && o.human === "black";
        // keep indexes inside their lists when the gender changes
        for (const [k, n] of [["hairStyle", 15], ["wig", 15], ["hat", 20], ["acc", 20], ["outfit", 20]]) if (o[k] >= n) o[k] = n - 1;
        body.replaceChildren(
            h("div.gen-sec", h("h5", "기본"),
                h("div.gen-grid",
                    L("성별", sel("gender", [["male", "남자"], ["female", "여자"]])),
                    L("인종", sel("race", RACES.map(r => [r[0], r[1]]))),
                    o.race === "other" ? L("인종 이름 (타이핑)", h("input.input", { value: o.raceText || "", placeholder: "예: Dungi", onchange: e => change("raceText", e.target.value) })) : null,
                    human ? L("인간 종류", sel("human", HUMAN_TYPES)) : null),
                L(black ? "피부색 — 흑인은 자동으로 검은색" : "피부색", swatches("skin", SKIN_COLORS, black), ".wide")),
            human
                ? h("div.gen-sec", h("h5", "머리"),
                    L("머리색", swatches("hair", HAIR_COLORS), ".wide"),
                    h("div.gen-grid", L(`머리 스타일 (${g === "female" ? "여" : "남"} 15종)`, sel("hairStyle", HAIR_STYLES[g], { num: true }))))
                : h("div.gen-sec", h("h5", "가발"),
                    h("div.gen-grid", L(`가발 스타일 (${g === "female" ? "여" : "남"} 15종)`, sel("wig", HAIR_STYLES[g], { none: "가발 없음", num: true }))),
                    o.wig >= 0 ? L("가발색", swatches("wigColor", HAIR_COLORS), ".wide") : null),
            h("div.gen-sec", h("h5", "얼굴"),
                h("div.gen-grid",
                    L("안경 (20종)", sel("glasses", GLASSES, { none: "없음", num: true })),
                    L("선글래스 (20종)", sel("sun", SUNGLASSES, { none: "없음", num: true })),
                    L("화장 (15종)", sel("makeup", MAKEUPS, { none: "없음", num: true }))),
                h("div.row.wrap", chk("mouthLines", "몽이주름 ( - )"), chk("eyeWrinkle", "눈 주름"), chk("leprosy", "나병"))),
            h("div.gen-sec", h("h5", "착용"),
                h("div.gen-grid",
                    L(`모자 (${g === "female" ? "여" : "남"} 20종)`, sel("hat", HATS[g], { none: "없음", num: true })),
                    L(g === "female" ? "악세사리 세트 (귀걸이·목걸이·팔찌 20종)" : "악세사리 세트 (시계·남성 목걸이 20종)", sel("acc", ACCS[g], { none: "없음", num: true })),
                    L("옷 — 계절", sel("season", SEASONS)),
                    L("옷 — 상의/하의 세트 (20종)", sel("outfit", outfitNames(g, o.season), { num: true })))));
    }
    draw();
    view.innerHTML = buildAvatar(o);
    return {
        el, emit,
        set(patch) { Object.assign(o, patch); draw(); emit(); },
        disable() { if (!on) return; on = false; onChk.checked = false; draw(); }
    };
}
