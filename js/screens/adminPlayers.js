// Admin: browse, edit, create and (de)activate players. The edit form has
// dropdowns for the fixed profile fields and a player image generator.
import { h } from "../core/util.js";
import { toast, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { COUNTRIES } from "../data/catalog.js";
import { avatar, displayName } from "../ui/profile.js";
import { jobList, saveJobs } from "../data/jobs.js";
import {
    buildAvatar, toDataUri, parseGen, DEFAULTS, HUMAN_TYPES, SKIN_COLORS, HAIR_COLORS, SEASONS,
    HAIR_STYLES, HATS, GLASSES, SUNGLASSES, MAKEUPS, ACCS, outfitNames, NO_IMAGE_URI, isNoImage,
    EAR_SHAPES, EAR_SIZES, EAR_INNERS, JS_EARS, JS_FANGS, HALOS, ANGEL_WINGS, DEVIL_HORNS, DEVIL_TAILS, GOB_HORNS, GOB_TEETH, ANT_STYLES, WING_PATS, FUR_RACES
} from "../ui/avatarGen.js";
import { RACE_CATEGORIES, RACE_CAT, subsOf, categoryOf, drawRace, addCustomSub } from "../data/races.js";
import { EAR_DEFAULT, BUGS } from "../ui/avatarRaces.js";

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
    job: [], // 💼 filled from the managed job list (jobList)
    ethnicity: ["Human", "Rabbit", "Bunny", "Bear", "Ant", "Smile", "Cloud", "Kalisto", "Devil", "Angel", "Ghost", "Invisible", "Jiangshi", "Donglee", "Triangle", "Square", "Rectangle", "Trapezoid"]
};
const CUSTOM_OK = ["school", "ethnicity"]; // "직접 입력…" allowed
function choices(k, current) {
    const used = Store.allPlayers.map(p => p[k]).filter(Boolean);
    const base = k === "job" ? jobList() : CHOICES[k];
    if (k === "job") return [...new Set([...base, current].filter(Boolean))]; // managed list only (+ the current value)
    const extra = [...new Set(used)].filter(x => !base.includes(x)).sort((a, b) => a.localeCompare(b));
    return [...new Set([...base, ...extra, current].filter(Boolean))];
}

export function adminPlayersPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🧑‍🤝‍🧑 플레이어 관리"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    let q = "", showOff = true, onlyNo = false;
    const list = h("div.ap-list");
    const search = h("input.input", { placeholder: "이름 / ID / 국가 / 종족 검색", oninput: e => { q = e.target.value.trim().toLowerCase(); draw(); } });
    const offChk = h("label.check", h("input", { type: "checkbox", checked: true, onchange: e => { showOff = e.target.checked; draw(); } }), "비활성 포함");
    // 🚫 players set to No Image (to order their pictures all at once later)
    const noChk = h("label.check", h("input", { type: "checkbox", onchange: e => { onlyNo = e.target.checked; draw(); } }), "🚫 No Image만");
    const noCount = h("small.muted");
    function draw() {
        const rows = Store.allPlayers.filter(p => (showOff || p.is_active !== false) && (!onlyNo || isNoImage(p.profile_image)) &&
            (!q || `${p.id} ${p.login_id} ${p.name_ko} ${p.player_name} ${p.country} ${p.ethnicity} ${categoryOf(p.ethnicity)}`.toLowerCase().includes(q)));
        noCount.textContent = `No Image ${Store.allPlayers.filter(p => isNoImage(p.profile_image)).length}명`;
        list.replaceChildren(...rows.map(p => h("button.ap-row" + (p.is_active === false ? ".off" : ""), { onclick: () => editPlayer(p, draw) },
            avatar(p.id, 44, { effect: false }),
            h("div.ap-who", h("b", displayName(p)), h("small", `#${p.id} · ${p.player_name || ""} · ${p.login_id || ""}`)),
            h("small.ap-c", p.country || "-"), h("small.ap-c", (c => !p.ethnicity || c.toLowerCase() === String(p.ethnicity).toLowerCase() ? c : `${c} › ${p.ethnicity}`)(categoryOf(p.ethnicity))), h("small.ap-c", p.handler ? `전담 ${p.handler}` : ""),
            isNoImage(p.profile_image) ? h("span.badge.noimg", "No Image") : null,
            p.is_active === false ? h("span.badge.off", "비활성") : null)));
    }
    draw();
    return h("div.page.admin-players",
        h("div.row.between", h("h2.page-title", "🧑‍🤝‍🧑 플레이어 관리"),
            h("div.row", h("a.btn.ghost", { href: "#/admin" }, "← 관리자"), h("button.btn.ghost", { onclick: () => jobManager() }, "💼 직업 관리"), h("button.btn.gold", { onclick: () => editPlayer(null, draw) }, "➕ 새 플레이어"))),
        h("p.muted", Store.cloud ? "변경 사항은 Supabase에 바로 저장됩니다." : "로컬 모드: 이 브라우저에만 저장됩니다."),
        h("div.row", search, offChk, noChk, h("small.muted", `전체 ${Store.allPlayers.length}명 · 활성 ${Store.players.length}명 · `), noCount),
        list);
}

function editPlayer(p, onSaved) {
    const isNew = !p;
    const v = isNew ? { id: Store.nextPlayerId(), is_active: true, profile_image: "", country: COUNTRIES[0], gender: "male", ethnicity: "Human", age_group: "Young Adult", preference: "Straight" } : { ...p };
    const images = [...new Set(Store.allPlayers.map(x => x.profile_image).filter(s => s && !s.startsWith("data:")))].sort();
    const prev = h("img.ap-prev", { src: v.profile_image || "", alt: "" });
    const setImage = src => {
        v.profile_image = src; prev.src = src; imgInput.value = src.startsWith("data:") ? "" : src;
        imgInput.placeholder = isNoImage(src) ? "(No Image)" : src.startsWith("data:") ? "(생성기로 만든 이미지)" : "images/players/xxx.svg 또는 https://…";
        if (noChk) noChk.checked = isNoImage(src);
    };
    const imgInput = h("input.input", { value: (v.profile_image || "").startsWith("data:") ? "" : v.profile_image || "", placeholder: isNoImage(v.profile_image) ? "(No Image)" : "images/players/xxx.svg 또는 https://…", oninput: e => { gen.disable(); v.profile_image = e.target.value.trim(); prev.src = v.profile_image; noChk.checked = false; } });
    const imgSel = h("select", { onchange: e => { if (!e.target.value) return; gen.disable(); setImage(e.target.value); } },
        h("option", { value: "" }, "기존 이미지에서 고르기…"), images.map(src => h("option", { value: src, selected: src === v.profile_image }, src.split("/").pop())));
    // 🚫 No Image: shows the placeholder everywhere until the picture is ordered (unticking brings the old picture back)
    let beforeNo = isNoImage(v.profile_image) ? "" : v.profile_image;
    const noChk = h("input", { type: "checkbox", checked: isNoImage(v.profile_image), onchange: e => {
        if (e.target.checked) { if (!isNoImage(v.profile_image)) beforeNo = v.profile_image; gen.disable(); setImage(NO_IMAGE_URI); }
        else { setImage(beforeNo || ""); if (!beforeNo) toast("이미지를 지정하거나 오른쪽 생성기를 켜세요", "info"); }
    } });

    // image generator: on for new players, off for existing ones until asked for
    const saved = parseGen(v.profile_image);
    const dr = drawRace(v.ethnicity);
    const gen = generatorPanel(saved || { ...DEFAULTS, gender: v.gender === "female" ? "female" : "male", race: dr.race, sub: dr.sub || "", raceText: v.ethnicity || "", seed: 1 + Math.floor(Math.random() * 1e6) },
        isNew || !!saved, src => setImage(src), () => (c => !v.ethnicity || c.toLowerCase() === String(v.ethnicity).toLowerCase() ? c : `${c} › ${v.ethnicity}`)(categoryOf(v.ethnicity)));

    let raceCat = categoryOf(v.ethnicity);
    const inputs = FIELDS.map(([k, label]) => {
        let el;
        if (k === "ethnicity") {
            // 🧬 종족 = 카테고리 › 서브카테고리 (the subcategory is what the game uses)
            const wrap = h("div.ap-race");
            const setSub = s => { v.ethnicity = String(s || "").trim(); sync("ethnicity"); };
            const drawRaceField = () => {
                const C = RACE_CAT[raceCat], subs = subsOf(raceCat);
                const catSel = h("select", { onchange: e => {
                    raceCat = e.target.value;
                    const s2 = subsOf(raceCat);
                    setSub(s2.length ? s2[0] : RACE_CAT[raceCat].typed ? "" : raceCat);
                    drawRaceField();
                } }, RACE_CATEGORIES.map(x => h("option", { value: x.id, selected: x.id === raceCat }, `${x.emoji} ${x.id}`)));
                const typedBox = (val = "") => {
                    const inp = h("input.input", { value: val, placeholder: `새 ${raceCat} 종족 입력 (예: ${raceCat === "Other Animal" ? "Wolf" : raceCat === "Other Shape" ? "Star" : "…"})`, onchange: ev => setSub(ev.target.value) });
                    return inp;
                };
                let subEl;
                if (!subs.length && !C.typed) { if (v.ethnicity !== raceCat) setSub(raceCat); subEl = h("div.ap-nosub", `서브카테고리 없음 → 게임에서는 '${raceCat}' 으로 쓰입니다`); }
                else if (!subs.length) subEl = typedBox(v.ethnicity === raceCat ? "" : v.ethnicity);
                else {
                    const known = subs.some(s => s.toLowerCase() === String(v.ethnicity).toLowerCase());
                    const sel = h("select", { onchange: e => {
                        if (e.target.value === "__custom") { const inp = typedBox(); subBox.replaceChildren(inp); inp.focus(); return; }
                        setSub(e.target.value);
                    } },
                        !known ? h("option", { value: v.ethnicity, selected: true }, v.ethnicity ? `${v.ethnicity} (${v.ethnicity === raceCat ? "서브카테고리 미지정" : "직접 입력"})` : "선택…") : null,
                        subs.map(s => h("option", { value: s, selected: s.toLowerCase() === String(v.ethnicity).toLowerCase() }, s)),
                        C.typed ? h("option", { value: "__custom" }, "✏️ 직접 입력…") : null);
                    subEl = sel;
                }
                const subBox = h("div.ap-dd", subEl);
                wrap.replaceChildren(h("div.ap-dd", catSel), subBox);
            };
            drawRaceField();
            return h("label.cf.ap-race-f", h("small", "종족 (카테고리 › 서브카테고리)"), wrap);
        }
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
        if (k === "ethnicity") { const d = drawRace(v.ethnicity); gen.set({ race: d.race, sub: d.sub || "", raceText: v.ethnicity || "" }); }
    }
    const active = h("label.check", h("input", { type: "checkbox", checked: v.is_active !== false, onchange: e => { v.is_active = e.target.checked; } }), "활성 (시즌 선발 대상)");
    const m = modal(h("div.ap-form.with-gen",
        h("div.ap-left",
            h("div.ap-img", prev, h("div", h("small.muted", `ID #${v.id}`), imgSel, imgInput, h("label.check.ap-noimg", noChk, "🚫 No Image (나중에 이미지 주문)"))),
            h("div.ap-grid", inputs),
            active,
            h("div.row", h("button.btn.gold", { onclick: async () => {
                if (!(v.name_ko || "").trim() && !(v.player_name || "").trim()) return toast("이름을 입력하세요", "warn");
                if (!(v.ethnicity || "").trim()) return toast("종족(서브카테고리)을 입력하세요", "warn");
                if (!v.profile_image) return toast("프로필 이미지를 지정하세요 (오른쪽 생성기를 켜면 자동 등록 · 또는 No Image)", "warn");
                await addCustomSub(raceCat, v.ethnicity); // a typed-in subcategory is offered next time
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
function generatorPanel(initial, startOn, onImage, raceLabel = () => "") {
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
        if (o.race === "noimage") { // ❓ Others: no drawing until the picture is ordered
            body.replaceChildren(h("div.gen-sec", h("h5", "기본"), h("p.muted", `종족: ${raceLabel()}`),
                h("p.notice", "🚫 Others 종족은 이미지를 따로 주문할 종족이라 주문이 들어가기 전까지 No Image로 둡니다.")));
            return;
        }
        const bfly = o.race === "bug" && BUGS[o.sub]?.wings && ["butterfly", "moth"].includes(BUGS[o.sub].wings);
        // 🧬 race styles: shown only for the races they belong to (ui/avatarRaces.js)
        const styles = [
            o.race === "jiangshi" ? [L("귀 모양 (12종)", sel("jsEar", JS_EARS, { num: true })), L("이빨 (12종)", sel("jsFang", JS_FANGS, { num: true }))] : null,
            o.race === "angel" ? [L("Halo (12종)", sel("halo", HALOS, { num: true })), L("천사 날개 (12종)", sel("angelWing", ANGEL_WINGS, { num: true }))] : null,
            o.race === "devil" ? [L("머리뿔 (12종)", sel("horn", DEVIL_HORNS, { num: true })), L("악마 꼬리 (12종)", sel("devilTail", DEVIL_TAILS, { num: true }))] : null,
            o.race === "goblin" ? [L("머리뿔 1개 (12종)", sel("gobHorn", GOB_HORNS, { num: true })), L("이빨 (12종)", sel("gobTeeth", GOB_TEETH, { num: true }))] : null,
            EAR_DEFAULT[o.race] != null ? [L("귀 형태 (15종)", sel("earShape", EAR_SHAPES, { none: "종족 기본", num: true })), L("귀 크기", sel("earSize", EAR_SIZES, { num: true })), L("귀 안쪽 문양 (14종)", sel("earIn", EAR_INNERS, { num: true }))] : null,
            o.race === "ant" || o.race === "bug" ? [L("더듬이 (15종)", sel("antStyle", ANT_STYLES, { none: "종족 기본", num: true }))] : null,
            bfly ? [L("날개 문양 (14종)", sel("wingPat", WING_PATS, { num: true }))] : null
        ].filter(Boolean).flat();
        body.replaceChildren(
            h("div.gen-sec", h("h5", "기본"),
                h("p.muted.gen-race", `🧬 종족: ${raceLabel()} — 왼쪽 프로필의 종족을 따라 기본 형태가 정해집니다`),
                h("div.gen-grid",
                    L("성별", sel("gender", [["male", "남자"], ["female", "여자"]])),
                    ["other", "animal", "shape"].includes(o.race) ? L("종족 이름 (그림 아래 표시)", h("input.input", { value: o.raceText || "", placeholder: "예: Wolf", onchange: e => change("raceText", e.target.value) })) : null,
                    human ? L("인간 종류", sel("human", HUMAN_TYPES)) : null),
                L(black ? "피부색 — 흑인은 자동으로 검은색" : o.race === "flower" ? "꽃잎 색" : "피부색", swatches("skin", SKIN_COLORS, black), ".wide"),
                FUR_RACES.includes(o.race) ? L("피부 스타일", chk("curly", "🐑 곱슬 (곱슬털 외곽선)")) : null),
            styles.length || bfly ? h("div.gen-sec", h("h5", "종족 스타일"), h("div.gen-grid", styles),
                bfly ? L("나비 날개 색", swatches("wings", SKIN_COLORS.filter(c => c[0].startsWith("#"))), ".wide") : null) : null,
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

// ---------------------------------------------------------------- 💼 job list manager
// The 직업 dropdown in the player form only offers these jobs. Renaming a job renames it on every player too.
function jobManager() {
    let jobs = jobList();
    const list = h("div.jm-list");
    const count = j => Store.allPlayers.filter(p => (p.job || "").trim() === j).length;
    const addInp = h("input.input", { placeholder: "새 직업 이름", onkeydown: e => { if (e.key === "Enter") add(); } });
    function add() {
        const v = addInp.value.trim();
        if (!v) return;
        if (jobs.includes(v)) return toast("이미 있는 직업입니다", "warn");
        jobs = [...jobs, v].sort((a, b) => a.localeCompare(b)); addInp.value = ""; draw();
    }
    function draw() {
        list.replaceChildren(...jobs.map((j, i) => {
            const inp = h("input.input", { value: j });
            return h("div.jm-row", inp, h("small.muted", `${count(j)}명`),
                h("button.btn.small.ghost", { onclick: () => {
                    const v = inp.value.trim();
                    if (!v || v === j) return;
                    if (jobs.includes(v)) return toast("이미 있는 직업입니다", "warn");
                    jobs[i] = v; renames.push([j, v]); draw();
                } }, "✏️ 이름 변경"),
                h("button.btn.small.ghost", { onclick: () => { jobs.splice(i, 1); draw(); } }, "🗑️"));
        }));
    }
    const renames = [];
    draw();
    const m = modal(h("div.job-manager",
        h("p.muted", "플레이어 편집의 💼 직업 드롭다운에 나오는 목록입니다. 이름을 바꾸면 그 직업을 가진 플레이어들도 함께 바뀝니다. (삭제해도 플레이어의 기존 직업 값은 그대로 남습니다)"),
        h("div.row", addInp, h("button.btn.gold.small", { onclick: add }, "➕ 추가")),
        list,
        h("div.row", h("button.btn.gold", { onclick: async () => {
            await saveJobs(jobs);
            for (const [from, to] of renames) for (const p of Store.allPlayers.filter(x => (x.job || "").trim() === from)) await Store.savePlayer({ ...p, job: to });
            toast("💼 직업 목록을 저장했습니다", "ok"); m.close();
        } }, "💾 저장"), h("button.btn.ghost", { onclick: () => m.close() }, "취소"))),
        { title: "💼 직업 관리", wide: true });
}
