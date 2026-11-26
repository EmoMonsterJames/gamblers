// =====================================================================
// 🛂 Passport book · visa center · all-maps reward (state: game/passport.js)
//   passportSection(pid, onChange) — 🛎️ 공항 서비스: 여권 발급 + 🏆 모든 맵 방문 보상
//   visaShop(pid, onChange)        — 🛎️ 공항 서비스: 비자 센터
//   openPassport(pid)              — the book: bio page → visa pages → visited maps (by region), page by page
//   passportChip(pid)              — 🎒 인벤토리: the passport (click → the book)
// =====================================================================
import { h, fmt, sleep } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confetti, confirmBox, modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { LOC_BY_ID } from "../data/catalog.js";
import * as PP from "../game/passport.js";
import { residencyOf } from "../game/nation.js";
import { avatar, displayName } from "../ui/profile.js";

const nm = pid => displayName(Store.player(pid));
const day = iso => iso ? new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "-";
const genderKo = g => { const x = String(g || "").toLowerCase(); return x === "female" ? "여 / F" : x === "male" ? "남 / M" : "기타 / X"; };

// ---------------------------------------------------------------- 🎒 the bag chip
export function passportChip(pid) {
    const pp = PP.passportOf(pid);
    if (!pp) return null;
    return h("button.pp-chip", { title: "여권 — 눌러서 펼쳐 보기 (신분증: 삭제 · 도난 불가)", onclick: () => openPassport(pid) },
        h("span.pp-chip-cover", "🛂"), h("span", h("b", "여권"), h("small", ` ${pp.no}`)), h("small.pp-chip-lock", "🔒 귀속"));
}

// ---------------------------------------------------------------- 🛎️ 여권 발급 + 🏆 보상
export function passportSection(pid, onChange = () => {}) {
    const wrap = h("div.pp-sec");
    const draw = () => {
        const pp = PP.passportOf(pid), st = PP.visitStats(pid);
        wrap.replaceChildren(
            h("h4", "🛂 여권 발급 · 🏆 모든 맵 방문 보상"),
            h("div.pp-row",
                pp ? h("div.pp-mini", { onclick: () => openPassport(pid) }, h("div.pp-mini-cover", h("small", "GAMBLERS"), h("b", "PASSPORT"), h("span", "🛂")), h("small", pp.no))
                    : h("div.pp-mini.none", h("div.pp-mini-cover", h("small", "GAMBLERS"), h("b", "?"), h("span", "🛂")), h("small", "미발급")),
                h("div.pp-actions",
                    pp ? h("p", "✅ 여권 발급 완료 — 🎒 인벤토리에 보관됩니다 (삭제 · 도난 불가)") : h("p.notice.warn", "✈️ 티켓을 사려면 여권이 있어야 합니다. 발급은 무료!"),
                    pp ? h("button.btn.small.ghost", { onclick: () => openPassport(pid) }, "📖 여권 펼쳐 보기")
                        : h("button.btn.gold", { onclick: async () => {
                            const r = PP.issuePassport(pid);
                            if (!r.ok) return toast(r.why, "warn");
                            Sound.bonus(); confetti(30, ["🛂", "✈️"]);
                            await openPassport(pid, { fresh: true });
                            draw(); onChange();
                        } }, "🛂 여권 발급 (무료)"),
                    h("div.pp-reward",
                        h("div.pp-bar", h("i", { style: { width: `${st.total ? Math.round(st.n / st.total * 100) : 0}%` } })),
                        h("small", `방문한 맵 ${st.n} / ${st.total} · 모두 방문하면 ${fmt(PP.VISIT_REWARD)}G (평생 1회)`),
                        pp?.reward ? h("button.btn.small.ghost", { disabled: true }, `🏆 보상 수령 완료 (${day(pp.reward)})`)
                            : h("button.btn.small" + (st.all && pp ? ".gold" : ".ghost"), { onclick: async () => {
                                const r = PP.claimReward(pid);
                                if (!r.ok) { Sound.lose?.(); return toast(r.why, "warn", 3500); }
                                Sound.fanfare(); confetti(120, ["💰", "🏆", "✈️"]);
                                toast(`🏆 모든 맵 방문 보상 +${fmt(r.gold)}G!`, "ok", 5000);
                                draw(); onChange();
                            } }, "🏆 모든 맵 방문 보상 받기")))));
    };
    draw();
    return wrap;
}

// ---------------------------------------------------------------- 🛂 비자 센터
export function visaShop(pid, onChange = () => {}) {
    const wrap = h("div.pp-sec.pp-visa");
    const draw = () => {
        const has = PP.hasPassport(pid), ps = Store.season?.ps?.[pid];
        const groups = [[8000, "국가 카지노"], [9000, "국가 카지노 2"], [10000, "제한구역"]];
        wrap.replaceChildren(
            h("h4", "🛂 비자 센터"),
            h("p.muted.small", "비자는 1회용입니다. 국적 · 연령 · 성별 · 전적 제한이 있는 맵은 맵권만으로는 갈 수 없고, 그 맵의 비자가 같이 있어야 맵권(랜덤 맵권 포함)을 쓸 수 있습니다. 맵권을 쓰면 비자도 함께 사용됩니다. 비자는 맵권이 아닙니다."),
            has ? null : h("p.notice.warn", "🛂 여권이 있어야 비자를 살 수 있습니다."),
            ...groups.map(([price, label]) => h("div.pp-visa-group",
                h("b", `${label} · ${fmt(price)}G`),
                h("div.pp-visa-list", PP.VISAS.filter(v => v.price === price).map(v => {
                    const own = PP.validVisa(pid, v.loc), need = LOC_BY_ID[v.loc] ? PP.needsVisa(pid, LOC_BY_ID[v.loc]) : true;
                    return h("button.pp-visa-card" + (own ? ".own" : "") + (!need ? ".free" : ""), {
                        disabled: !has || !!own,
                        title: need ? "" : "이 플레이어는 원래 들어갈 수 있는 맵입니다 (비자 없이도 맵권 사용 가능)",
                        onclick: async () => {
                            if (!(await confirmBox(`${PP.visaEmoji(v)} ${PP.visaName(v)} 비자\n가격: ${fmt(v.price)}G (1회용)${need ? "" : "\n\n※ 이 맵은 원래 들어갈 수 있어서 비자가 꼭 필요하지는 않습니다."}\n구입할까요?`, "구입", "취소"))) return;
                            const r = PP.buyVisa(pid, v.id);
                            if (!r.ok) return toast(r.why, "warn");
                            Sound.cash?.(); toast(`🛂 ${PP.visaName(v)} 비자 구입 — 여권 비자 페이지에 찍혔습니다`, "ok", 3500);
                            draw(); onChange();
                        } },
                        h("span.pp-visa-emoji", PP.visaEmoji(v)), h("b", PP.visaName(v)),
                        h("small", own ? "✅ 보유 (미사용)" : !need ? "원래 입장 가능" : `${fmt(v.price)}G`));
                })))),
            ps ? h("small.muted", `보유 골드 ${fmt(ps.money)}G`) : null);
    };
    draw();
    return wrap;
}

// ---------------------------------------------------------------- 📖 the book
const stamp = (v, i) => {
    const loc = LOC_BY_ID[v.loc], used = !!v.used;
    const rot = ((i * 37) % 24) - 12, col = ["#b91c1c", "#1d4ed8", "#047857", "#7c3aed", "#c2410c"][i % 5];
    return h("div.pp-stamp" + (used ? ".used" : ""), { style: { "--rot": rot + "deg", "--c": col } },
        h("span.pp-stamp-ico", loc?.emoji || "🛂"),
        h("b", PP.visaName(PP.VISA_BY_ID[v.id] || v)),
        h("small", `VISA · ${day(v.at)}`),
        h("small", used ? `USED ${day(v.used)}` : "SINGLE ENTRY · VALID"));
};
function pagesFor(pid) {
    const p = Store.player(pid), pp = PP.passportOf(pid), st = PP.visitStats(pid);
    const pages = [];
    // 1) bio page
    pages.push(h("div.pp-page.bio",
        h("div.pp-page-h", h("b", "GAMBLERS · PASSPORT"), h("small", "여권 / PASSPORT")),
        h("div.pp-bio",
            h("div.pp-photo", avatar(pid, 118, { effect: false })),
            h("dl.pp-fields",
                h("dt", "성명 / Name"), h("dd", nm(pid)),
                h("dt", "영문 / Given name"), h("dd", p?.player_name || "-"),
                h("dt", "국가 / Nationality"), h("dd", p?.country || "-"),
                residencyOf(pid).length ? [h("dt", "영주권 / PR"), h("dd", residencyOf(pid).join(", "))] : null,
                h("dt", "성별 / Sex"), h("dd", genderKo(p?.gender)),
                h("dt", "종족 / Race"), h("dd", p?.ethnicity || "-"),
                h("dt", "연령대 / Age group"), h("dd", p?.age_group || "-"),
                h("dt", "여권 번호 / No."), h("dd.mono", pp.no),
                h("dt", "발급일 / Issued"), h("dd", day(pp.issued)))),
        h("div.pp-mrz", `P<GMB${String(p?.player_name || nm(pid)).toUpperCase().replace(/[^A-Z]/g, "<").slice(0, 26).padEnd(26, "<")}<<${pp.no}`)));
    // 2) visa pages (8 stamps a page)
    const visas = pp.visas || [];
    const vchunks = visas.length ? Array.from({ length: Math.ceil(visas.length / 8) }, (_, i) => visas.slice(i * 8, i * 8 + 8)) : [[]];
    vchunks.forEach((list, k) => pages.push(h("div.pp-page.visa",
        h("div.pp-page-h", h("b", `VISAS · 비자${vchunks.length > 1 ? ` (${k + 1}/${vchunks.length})` : ""}`), h("small", `${visas.filter(v => !v.used).length}개 사용 가능`)),
        list.length ? h("div.pp-stamps", list.map((v, i) => stamp(v, k * 8 + i))) : h("p.pp-empty", "아직 비자가 없습니다.", h("br"), "🛎️ 공항 서비스 → 🛂 비자 센터에서 살 수 있습니다."))));
    // 3) visited maps, region by region (2 regions per page)
    const head = h("div.pp-visit-sum", h("b", `${st.n} / ${st.total}`), h("small", `${st.n}곳 방문 · 모든 지역 · 모든 맵 (Survival Land 포함)`),
        h("div.pp-bar", h("i", { style: { width: `${st.total ? Math.round(st.n / st.total * 100) : 0}%` } })),
        pp.reward ? h("small.pp-done", `🏆 모든 맵 방문 보상 수령 (${day(pp.reward)})`) : st.all ? h("small.pp-done", "🏆 모든 맵 방문! 🛎️ 공항 서비스에서 보상을 받으세요") : null);
    const regs = st.byRegion;
    for (let i = 0; i < regs.length; i += 2) {
        pages.push(h("div.pp-page.visits",
            h("div.pp-page-h", h("b", "방문한 맵 / VISITED"), h("small", `${Math.floor(i / 2) + 1} / ${Math.ceil(regs.length / 2)}`)),
            i === 0 ? head : null,
            regs.slice(i, i + 2).map(({ r, maps, seen }) => h("div.pp-region",
                h("div.pp-region-h", h("span.pp-r-ico", r.emoji), h("b", r.name), h("small", `${seen.length} / ${maps.length}`)),
                h("div.pp-maps", maps.map(l => { const ok = seen.includes(l); return h("span.pp-map" + (ok ? ".on" : ""), { title: ok ? "방문" : "아직 방문하지 않음" }, h("i", l.emoji || "📍"), l.name, ok ? h("em", "✔") : null); }))))));
    }
    return pages;
}
export async function openPassport(pid, { fresh = false } = {}) {
    if (!PP.hasPassport(pid)) return toast("여권이 없습니다", "warn");
    const pages = pagesFor(pid);
    let at = 0;
    const leaf = h("div.pp-leaf");
    const no = h("small.pp-no");
    const prev = h("button.btn.small.ghost", { onclick: () => go(-1) }, "◀ 이전 장");
    const next = h("button.btn.small.gold", { onclick: () => go(1) }, "다음 장 ▶");
    const show = () => { leaf.replaceChildren(pages[at]); no.textContent = `${at + 1} / ${pages.length}`; prev.disabled = at === 0; next.disabled = at === pages.length - 1; };
    let busy = false;
    async function go(d) {
        const to = at + d;
        if (busy || to < 0 || to >= pages.length) return;
        busy = true;
        leaf.classList.add(d > 0 ? "turn-next" : "turn-prev"); Sound.tick?.();
        await sleep(260);
        at = to; show();
        leaf.classList.remove("turn-next", "turn-prev"); leaf.classList.add(d > 0 ? "in-next" : "in-prev");
        await sleep(260);
        leaf.classList.remove("in-next", "in-prev");
        busy = false;
    }
    // the cover first (click to open)
    const cover = h("div.pp-cover", { onclick: () => openBook() }, h("small", "GAMBLERS"), h("div.pp-cover-emb", "🛂"), h("b", "PASSPORT"), h("small", "여 권"), h("em", fresh ? "✨ 새 여권 — 눌러서 펼치기" : "눌러서 펼치기"));
    const book = h("div.pp-book", cover);
    function openBook() {
        cover.classList.add("open");
        setTimeout(() => { book.replaceChildren(leaf, h("div.pp-nav", prev, no, next)); show(); }, 380);
    }
    const onKey = e => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    document.addEventListener("keydown", onKey);
    let sx = null;
    book.addEventListener("pointerdown", e => { sx = e.clientX; });
    book.addEventListener("pointerup", e => { if (sx != null && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1); sx = null; });
    const m = modal(h("div.pp-wrap", book), { title: `🛂 ${nm(pid)}의 여권`, cls: "pp-modal" });
    await m.closed;
    document.removeEventListener("keydown", onKey);
}
