// Admin: slot game generator — fills in a form and builds a prompt to
// hand to Claude, which then adds the slot to this project.
import { h } from "../core/util.js";
import { toast } from "../core/fx.js";
import { SLOTS, BRAND_LOGO } from "../slots/configs.js";
import { LOCATIONS } from "../data/catalog.js";

const JP_TIERS = ["MINI", "MINOR", "MAXI", "MAJOR", "GRAND"];
const BONUS_TYPES = ["free spins", "wheel", "hold and spin", "match 3", "pick one", "연속 bonus column", "others"];
const FREE_KINDS = ["just free spins", "double reels", "triple reels", "four times reels", "others"];
const HOLD_KINDS = ["just hold and spin", "with collect", "with multiplier", "with unlocking rows", "others"];
const OMEN_KINDS = ["Lucky has arrived", "릴 흔들기", "기타"];
const SIZES = ["프로그레시브 이미지 화면 + 기본릴", "기본릴", "더블릴", "기타"];

// theme keywords → background music
const BGM = [
    [/바다|해변|진주|ocean|sea|beach|pearl|섬|island/i, "파도 소리가 살짝 섞인 트로피컬 스틸드럼 + 우쿨렐레 루프 (BPM 100)"],
    [/유령|귀신|공포|호러|ghost|horror|haunt|좀비|zombie|할로윈|halloween/i, "파이프오르간과 낮은 현악이 깔리는 미스터리 왈츠, 가끔 오르골 효과음 (BPM 84)"],
    [/중국|설날|복|福|폭죽|firecracker|lunar|홍콩|panda|판다/i, "얼후·고쟁·징이 들어간 설날 페스티벌 루프 (BPM 120)"],
    [/일본|사무라이|닌자|samurai|ninja|사쿠라|sakura|japan/i, "샤미센 + 타이코 드럼의 빠른 사무라이 루프 (BPM 132)"],
    [/이집트|사막|피라미드|egypt|desert|pharaoh|아라비아|arab/i, "오우드 + 다르부카 핸드드럼의 중동풍 루프 (BPM 110)"],
    [/우주|은하|외계|space|galaxy|alien|로봇|robot|사이버|cyber|네온|neon/i, "신스웨이브 아르페지오 + 808 베이스 (BPM 118)"],
    [/정글|화산|티키|tiki|volcano|jungle|부족|tribal|폴리네시아/i, "트라이벌 퍼커션 + 마림바 루프 (BPM 116)"],
    [/농장|돼지|소|닭|farm|pig|cow|barn|시골|country/i, "경쾌한 밴조 + 휘파람 컨트리 루프 (BPM 124)"],
    [/클로버|아일랜드|레프리콘|leprechaun|clover|irish|무지개|rainbow/i, "아이리시 피들 + 틴휘슬 지그 (BPM 140)"],
    [/용|드래곤|dragon|황제|emperor/i, "웅장한 오케스트라 브라스 + 중국 타악 (BPM 104)"],
    [/사탕|캔디|candy|sweet|디저트|dessert|과자/i, "버블검 팝 칩튠 + 글로켄슈필 (BPM 128)"],
    [/겨울|눈|크리스마스|winter|snow|christmas|xmas|펭귄|penguin/i, "징글벨 + 오르골 + 슬레이벨 루프 (BPM 112)"],
    [/해적|보물|pirate|treasure|선장/i, "아코디언 + 바다 셰안티 합창풍 루프 (BPM 120)"],
    [/개미|곤충|벌레|ant|bug|insect|꿀|honey/i, "피치카토 현악 + 우드블록의 아기자기한 행진곡 (BPM 118)"],
    [/똥|응가|poop|dung|코믹|comic|웃긴/i, "튜바 + 슬라이드휘슬 코믹 폴카 (BPM 126)"],
    [/토끼|rabbit|bunny|귀여운|cute|emo/i, "토이피아노 + 핑거스냅 큐트 팝 (BPM 122)"],
    [/클래식|빈티지|레트로|라스베가스|vegas|retro|vintage|classic|7/i, "70년대 라스베가스 빅밴드 스윙 + 벨 효과음 (BPM 130)"],
    [/돈|부자|황금|gold|money|rich|코인|coin|jackpot|잭팟/i, "브라스 펑크 + 코인 효과음이 섞인 그루비 루프 (BPM 118)"]
];
export function pickBgm(theme) {
    for (const [re, m] of BGM) if (re.test(theme || "")) return m;
    return "업템포 카지노 라운지 재즈 루프 (BPM 120)";
}

export function slotGenPage() {
    const brands = [...new Set([...Object.keys(BRAND_LOGO), ...SLOTS.map(s => s.brand), "HYHG GAMING", "Classic Gaming"])].sort();
    const st = {
        name: "", progressive: true, bets: "100, 200, 300, 500, 800, 1000",
        jp: Object.fromEntries([...JP_TIERS, "SPECIAL"].map(t => [t, true])), specialJp: "",
        progUi: "", size: SIZES[0], sizeOther: "", theme: "", brand: brands[0], location: "",
        omens: [], bonuses: [], notes: ""
    };
    const form = h("div.slotgen-form");
    const out = h("textarea.prompt-out", { readonly: true, rows: 22, placeholder: "생성 버튼을 누르면 여기에 Claude에게 전달할 프롬프트가 만들어집니다." });
    const copyBtn = h("button.btn.ghost", { onclick: async () => { if (!out.value) return; try { await navigator.clipboard.writeText(out.value); toast("프롬프트를 복사했습니다", "ok"); } catch { out.select(); document.execCommand("copy"); toast("복사됨", "ok"); } } }, "📋 복사");

    const sec = (title, ...kids) => h("div.sg-sec", h("h4", title), ...kids);
    const text = (k, ph = "", rows = 0) => rows
        ? h("textarea", { rows, placeholder: ph, oninput: e => { st[k] = e.target.value; if (k === "theme") draw(false); } }, st[k])
        : h("input", { value: st[k], placeholder: ph, oninput: e => { st[k] = e.target.value; } });
    const radio = (name, opts, cur, set) => h("div.row.wrap", opts.map(([v, label]) => h("label.radio", h("input", { type: "radio", name, checked: v === cur, onchange: () => { set(v); draw(); } }), label)));

    let bgmEl = h("div.bgm");
    function draw(full = true) {
        bgmEl.replaceChildren("🎵 자동 선택된 배경음: ", h("b", pickBgm(st.theme)));
        if (!full) return;
        form.replaceChildren(
            sec("슬롯 이름 (선택)", text("name", "비우면 Claude가 테마에 맞게 지어줍니다")),
            sec("슬롯 종류", radio("kind", [[true, "프로그레시브"], [false, "논-프로그레시브"]], st.progressive, v => { st.progressive = v; })),
            sec("베팅 금액 (G, 쉼표로 구분)", text("bets")),
            st.progressive ? sec("잭팟 종류",
                h("div.row.wrap", [...JP_TIERS, "SPECIAL"].map(t => h("label.check", h("input", { type: "checkbox", checked: st.jp[t], onchange: e => { st.jp[t] = e.target.checked; draw(); } }), t === "SPECIAL" ? "특수잭팟" : t))),
                st.jp.SPECIAL ? text("specialJp", "특수잭팟 설명 (예: MEGA 잭팟 — 코인 15개 풀보드 시)") : null) : null,
            st.progressive ? sec("프로그레시브 UI", text("progUi", "잭팟 표시 화면을 설명해주세요 (예: 위쪽에 황금 용이 GRAND를 물고 있고, 금액이 네온으로 흐름)", 3)) : null,
            sec("슬롯 UI 크기", radio("size", SIZES.map(s => [s, s]), st.size, v => { st.size = v; }), st.size === "기타" ? text("sizeOther", "UI 크기/레이아웃 설명") : null),
            sec("슬롯 분위기 및 테마", text("theme", "예: 비 오는 밤의 홍콩 야시장, 네온 간판과 판다 상인", 3), bgmEl),
            sec("슬롯 브랜드", h("select", { onchange: e => { st.brand = e.target.value; } }, brands.map(b => h("option", { value: b, selected: b === st.brand }, b)))),
            sec("배치할 카지노 (선택)", h("select", { onchange: e => { st.location = e.target.value; } }, h("option", { value: "" }, "Claude가 결정"), LOCATIONS.map(l => h("option", { value: l.id, selected: l.id === st.location }, `${l.emoji} ${l.name}`)))),
            sec(`전조 (${st.omens.length}개)`,
                ...st.omens.map((o, i) => h("div.row.wrap.sg-item",
                    h("b", `#${i + 1}`),
                    h("select", { onchange: e => { o.kind = e.target.value; draw(); } }, OMEN_KINDS.map(k => h("option", { value: k, selected: k === o.kind }, k))),
                    h("input.sg-note", { value: o.text || "", placeholder: o.kind === "기타" ? "전조 설명" : "추가 설명 (선택)", oninput: e => { o.text = e.target.value; } }),
                    h("button.btn.ghost.small", { onclick: () => { st.omens.splice(i, 1); draw(); } }, "✕"))),
                h("button.btn.ghost.small", { onclick: () => { st.omens.push({ kind: OMEN_KINDS[0] }); draw(); } }, "＋ 전조 추가")),
            sec(`보너스 (${st.bonuses.length}개)`,
                ...st.bonuses.map((b, i) => h("div.sg-item",
                    h("div.row.wrap",
                        h("b", `#${i + 1}`),
                        h("select", { onchange: e => { b.type = e.target.value; draw(); } }, BONUS_TYPES.map(k => h("option", { value: k, selected: k === b.type }, k))),
                        h("input.sg-note", { value: (b.type === "others" ? b.text : b.note) || "", placeholder: b.type === "others" ? "보너스 설명" : "이 보너스에 대한 설명 (선택)", oninput: e => { if (b.type === "others") b.text = e.target.value; else b.note = e.target.value; } }),
                        h("button.btn.ghost.small", { onclick: () => { st.bonuses.splice(i, 1); draw(); } }, "✕")),
                    b.type === "free spins" ? h("div.row.wrap",
                        h("label", "무료 스핀 ", h("input.num", { type: "number", min: 1, value: b.count ?? 10, oninput: e => { b.count = +e.target.value; } }), " 회"),
                        h("select", { onchange: e => { b.sub = e.target.value; draw(); } }, FREE_KINDS.map(k => h("option", { value: k, selected: k === (b.sub || FREE_KINDS[0]) }, k))),
                        h("input.sg-note", { value: b.text || "", placeholder: b.sub === "others" ? "무료 스핀 방식 설명" : "무료 스핀 추가 설명 (선택)", oninput: e => { b.text = e.target.value; } })) : null,
                    b.type === "hold and spin" ? h("div.row.wrap",
                        h("select", { onchange: e => { b.sub = e.target.value; draw(); } }, HOLD_KINDS.map(k => h("option", { value: k, selected: k === (b.sub || HOLD_KINDS[0]) }, k))),
                        h("input.sg-note", { value: b.text || "", placeholder: b.sub === "others" ? "Hold & Spin 방식 설명" : "Hold & Spin 추가 설명 (선택)", oninput: e => { b.text = e.target.value; } })) : null,
                    b.type === "연속 bonus column" ? h("small.muted", "첫 컬럼에 보너스 컬럼이 나온 뒤 상금이 적힌 동전/아이콘이 연달아 나오면 그 금액을 모두 획득") : null)),
                h("button.btn.ghost.small", { onclick: () => { st.bonuses.push({ type: BONUS_TYPES[0], count: 10, sub: FREE_KINDS[0] }); draw(); } }, "＋ 보너스 추가")),
            sec("특이사항", text("notes", "기타 요구사항", 3)),
            h("div.row", h("button.btn.gold.big", { onclick: () => { out.value = buildPrompt(st); out.scrollIntoView({ behavior: "smooth", block: "center" }); } }, "✨ 프롬프트 생성"), copyBtn));
        bgmEl = form.querySelector(".bgm") || bgmEl;
    }
    draw();
    return h("div.page.slotgen",
        h("div.row.between", h("h2.page-title", "🎰 슬롯게임 생성기"), h("a.btn.ghost", { href: "#/admin" }, "← 관리자")),
        h("p.muted", "항목을 채우고 생성 버튼을 누르면 Claude에게 그대로 붙여넣을 수 있는 프롬프트가 만들어집니다."),
        h("div.slotgen-wrap", form, h("div.slotgen-out", out, copyBtn)));
}

function buildPrompt(st) {
    const bets = st.bets.split(/[,\s]+/).map(x => parseInt(x)).filter(n => n > 0);
    const jps = st.progressive ? [...JP_TIERS.filter(t => st.jp[t]), ...(st.jp.SPECIAL ? [`특수잭팟(${st.specialJp || "설명 없음 — 테마에 맞게 설계"})`] : [])] : [];
    const loc = LOCATIONS.find(l => l.id === st.location);
    const size = st.size === "기타" ? `기타: ${st.sizeOther || "(설명 없음)"}` : st.size;
    const omen = st.omens.length ? st.omens.map((o, i) => `  ${i + 1}. ${o.kind === "기타" ? `기타 — ${o.text || "(설명 없음)"}` : o.kind + (o.text?.trim() ? ` — ${o.text.trim()}` : "")}`).join("\n") : "  (없음)";
    const bonus = st.bonuses.length ? st.bonuses.map((b, i) => {
        let d = b.type;
        const extra = b.text?.trim() ? `: ${b.text.trim()}` : "";
        if (b.type === "free spins") d += ` — ${b.count ?? 10}회, ${b.sub === "others" ? `기타: ${b.text || ""}` : (b.sub || FREE_KINDS[0]) + extra}`;
        if (b.type === "hold and spin") d += ` — ${b.sub === "others" ? `기타: ${b.text || ""}` : (b.sub || HOLD_KINDS[0]) + extra}`;
        if (b.type === "연속 bonus column") d += " — 첫 컬럼(1번 릴)에 보너스 컬럼이 나오면, 이후 상금이 적힌 동전/아이콘이 연달아 나오고 적힌 금액을 모두 획득";
        if (b.type === "others") d = `기타 — ${b.text || "(설명 없음)"}`;
        else if (b.note?.trim()) d += ` — ${b.note.trim()}`;
        return `  ${i + 1}. ${d}`;
    }).join("\n") : "  (없음)";
    return `Gamblers 프로젝트(바닐라 JS, 빌드 없음)에 새 슬롯게임을 하나 추가해줘.

## 슬롯 정보
- 이름: ${st.name || "(테마에 어울리게 지어줘)"}
- 브랜드: ${st.brand}${BRAND_LOGO[st.brand] ? "" : " (로고 SVG가 없으면 images/slots/brands/ 에 새로 만들어 BRAND_LOGO에 등록)"}
- 종류: ${st.progressive ? "프로그레시브" : "논-프로그레시브"}
- 베팅 금액: ${bets.map(b => b.toLocaleString() + "G").join(", ")}
${st.progressive ? `- 잭팟: ${jps.join(", ") || "(없음)"}
- 프로그레시브 UI: ${st.progUi || "(테마에 맞게 디자인)"}
` : ""}- 슬롯 UI 크기: ${size}
- 분위기 및 테마: ${st.theme || "(자유)"}
- 배경음: ${pickBgm(st.theme)} — js/core/sound.js 의 WebAudio 합성으로 루프 재생 (오디오 파일 없이), 사운드 끄기 버튼을 따를 것
- 배치할 카지노: ${loc ? `${loc.name} (id: ${loc.id})` : "아직 슬롯이 적거나 테마가 어울리는 카지노를 골라줘"}

## 전조 (${st.omens.length}개)
${omen}

## 보너스 (${st.bonuses.length}개)
${bonus}

## 특이사항
${st.notes || "(없음)"}

## 구현 규칙 (기존 코드와 맞출 것)
- 설정은 js/slots/configs.js 의 SLOTS 배열에 추가하고, 엔진에 없는 기능은 js/slots/engine.js 에 feature-first 방식(먼저 기능 발동을 확률로 정하고 그리드를 만드는 방식)으로 추가.
- 화면 연출은 js/screens/slot.js, 스타일은 css/games.css. 기존 슬롯과 같은 cabinet / jp-bar / overlay 구조를 재사용.
- 모든 슬롯 공통: 티징(anticipation 릴 + near-miss), 펫 행운(win/bonus 확률) 적용, P 아이콘 포인트, 라운드당 스핀 횟수 제한(ctx.canPlay) 유지.
- 프로그레시브 잭팟은 시즌이 바뀌어도 이어지도록 Store.contribute / Store.hitJackpot 사용, MAXI 이상 당첨은 Store.logJackpot 로 기록.
- RTP는 85~90% 가 되도록 PX 보정값을 정하고, 브라우저 콘솔에서 engine.spin 을 15만 회 이상 시뮬레이션해서 결과를 알려줘.
- 다른 카지노와 슬롯이 겹치지 않게 js/data/catalog.js 의 LOCATIONS[].slots 에 추가.
- 완료 후 연습실(#/practice)에서 직접 돌려보고 각 보너스가 실제로 발동·정산되는지 확인해줘.`;
}
