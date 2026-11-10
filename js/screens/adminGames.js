// Admin: manage slot machines and casino games — switch games on/off,
// tune the slot pay scale / RTP (with a built-in simulator), change bonus
// probabilities, delete (switch off) single bonuses, casino RTP and max win.
import { h, fmt } from "../core/util.js";
import { toast, confirmBox } from "../core/fx.js";
import { Store } from "../core/store.js";
import { CONFIG } from "../config.js";
import { LOCATIONS } from "../data/catalog.js";
import { SLOTS } from "../slots/configs.js";
import { CASINO_GAMES, gameRtp, topMult } from "../data/casino.js";
import { applyGames, buildSlot, buildCasino, slotDefault, casinoDefault, defaultMaxWin, FEATURE_LABEL, METER_LABEL } from "../data/gameAdmin.js";
import { simulate, solvePx } from "../slots/sim.js";

const pct = (x, d = 1) => (x * 100).toFixed(d) + "%";
const KIND = { wheel: "휠", pick: "고르기", coinflip: "코인플립", dice: "주사위", hilo: "하이로우", scratch: "스크래치", gacha: "뽑기", plinko: "플링코", lottery: "로또", pension: "연금복권", roulette: "룰렛" };

export function adminGamesPage() {
    if (Store.cloud && !Store.user) return h("div.page", h("h2.page-title", "🎰 게임 관리"), h("p.notice", "관리자 로그인이 필요합니다 (⚙️ 관리자 페이지)."));
    const work = structuredClone(Store.games || {});
    work.slots ||= {}; work.casino ||= {};
    let tab = "slot", alive = true;
    const simCache = {}; // slotId -> last simulation (for the working settings)
    const tabs = h("div.tabs"), body = h("div.ag-body");
    const saveBtn = h("button.btn.gold", { onclick: save }, "💾 저장");
    const markDirty = () => { saveBtn.textContent = "💾 저장 *"; };
    const page = h("div.page.admin-games",
        h("div.row.between", h("h2.page-title", "🎰 게임 관리"), h("div.row", h("a.btn.ghost", { href: "#/admin" }, "← 관리자"), saveBtn)),
        h("p.muted", "슬롯: 배당 배율(RTP)·보너스 확률을 조정하고, 보너스를 삭제(끄기)하거나 슬롯 자체를 숨길 수 있습니다. 변경 후 '시뮬레이션'으로 실제 RTP를 확인하세요. 저장해야 게임에 적용됩니다."),
        tabs, body);
    window.addEventListener("hashchange", () => { alive = false; }, { once: true });

    const sed = id => (work.slots[id] ||= {});
    const ced = id => (work.casino[id] ||= {});
    const locOf = (kind, id) => LOCATIONS.find(l => l[kind].includes(id))?.name || "-";

    // ------------------------------------------------------------ slots
    function slotCard(def) {
        const id = def.id;
        const card = h("div.ag-card");
        function draw() {
            const ed = sed(id), cfg = buildSlot(id, ed), sim = simCache[id];
            const changed = !!(ed.off || ed.px || Object.values(ed.feat || {}).some(f => f.off || f.p != null) || ed.meter?.off || ed.meter?.p != null);
            // --- RTP
            const pxIn = h("input.num", { type: "number", step: 0.01, min: 0.05, value: +cfg.px.toFixed(3), onchange: e => { ed.px = +e.target.value || null; delete simCache[id]; markDirty(); draw(); } });
            const tgt = h("input.num", { type: "number", step: 0.5, min: 30, max: 99, value: ed._target || 90, onchange: e => { ed._target = +e.target.value; } });
            const out = h("div.ag-sim", sim ? simLine(sim) : h("small.muted", "시뮬레이션 전 — 기본 설정은 약 85~92%로 보정되어 있습니다."));
            const run = async (thenSolve) => {
                const btns = card.querySelectorAll(".ag-rtp button"); btns.forEach(b => b.disabled = true);
                const r = await simulate(buildSlot(id, ed), { spins: 200000, onProgress: p => { out.textContent = `시뮬레이션 중… ${Math.round(p * 100)}%`; }, alive: () => alive });
                if (!alive) return;
                simCache[id] = r;
                if (thenSolve) {
                    const px = solvePx(buildSlot(id, ed).px, r, (+tgt.value || 90) / 100);
                    if (px == null) toast("이 슬롯은 배당 배율로 RTP를 맞출 수 없습니다", "warn");
                    else { ed.px = +px.toFixed(3); ed._target = +tgt.value; markDirty(); simCache[id] = await simulate(buildSlot(id, ed), { spins: 200000, onProgress: p => { out.textContent = `보정 후 확인 중… ${Math.round(p * 100)}%`; }, alive: () => alive }); }
                }
                if (alive) draw();
            };
            // --- bonuses
            const rows = Object.entries(def.features || {}).map(([k, f0]) => {
                const fe = ((ed.feat ||= {})[k] ||= {});
                const off = !!fe.off;
                const hasP = f0.p != null && f0.p > 0;
                const cur = cfg.features[k];
                return h("div.ag-feat" + (off ? ".off" : ""),
                    h("b", FEATURE_LABEL[k] || k),
                    hasP ? h("label.cf", h("small", "발동 확률 %"), h("input.num", { type: "number", step: 0.05, min: 0, max: 100, disabled: off, value: +((fe.p ?? f0.p) * 100).toFixed(3), onchange: e => { fe.p = Math.max(0, +e.target.value / 100); delete simCache[id]; markDirty(); draw(); } }))
                        : h("small.muted", "미터가 가득 차면 발동"),
                    hasP && !off ? h("small.muted", cur.p > 0 ? `약 ${fmt(1 / cur.p)}스핀에 1번 (기본 ${+(f0.p * 100).toFixed(2)}%)` : "발동 안 함") : h("span"),
                    h("button.btn.small" + (off ? ".gold" : ".red"), { onclick: () => { fe.off = !off; delete simCache[id]; markDirty(); draw(); } }, off ? "↩ 복구" : "🗑 보너스 삭제"));
            });
            if (def.meter) {
                const me = (ed.meter ||= {}), off = !!me.off;
                rows.push(h("div.ag-feat" + (off ? ".off" : ""),
                    h("b", METER_LABEL[def.meter.kind] || "미터"),
                    h("label.cf", h("small", "미터 심볼 확률 %"), h("input.num", { type: "number", step: 0.5, min: 0, max: 100, disabled: off, value: +((me.p ?? def.meter.p) * 100).toFixed(2), onchange: e => { me.p = Math.max(0, +e.target.value / 100); delete simCache[id]; markDirty(); draw(); } })),
                    h("small.muted", `가득 = ${def.meter.max}칸 (기본 ${+(def.meter.p * 100).toFixed(1)}%)`),
                    h("button.btn.small" + (off ? ".gold" : ".red"), { onclick: () => { me.off = !off; delete simCache[id]; markDirty(); draw(); } }, off ? "↩ 복구" : "🗑 미터 삭제")));
            }
            card.className = "ag-card" + (ed.off ? " off" : "");
            card.replaceChildren(
                h("div.ag-head",
                    h("div", h("b.ag-name", def.name), h("small.muted", ` ${def.brand} · ${locOf("slots", id)} · BET ${def.bets[0]}~${fmt(def.bets[def.bets.length - 1])}`)),
                    h("div.row",
                        h("label.check", h("input", { type: "checkbox", checked: !ed.off, onchange: e => { ed.off = !e.target.checked; markDirty(); draw(); } }), "카지노에 노출"),
                        changed ? h("button.btn.ghost.small", { title: "이 슬롯을 기본값으로", onclick: () => { delete work.slots[id]; delete simCache[id]; markDirty(); draw(); } }, "↺ 기본값") : null)),
                h("div.ag-rtp",
                    h("label.cf", h("small", `배당 배율 (기본 ${slotDefault(id).px})`), pxIn),
                    h("label.cf", h("small", "목표 RTP %"), tgt),
                    h("button.btn.ghost.small", { onclick: () => run(false) }, "▶ 시뮬레이션"),
                    h("button.btn.gold.small", { onclick: () => run(true) }, "🎯 목표 RTP로 보정"),
                    out),
                h("div.ag-feats", rows));
        }
        draw();
        return card;
    }
    function simLine(s) {
        return h("div",
            h("b.ag-rtpv" + (s.rtp > 1 ? ".bad" : ""), `RTP ${pct(s.rtp)}`),
            h("small", ` = 라인·무료스핀 ${pct(s.ways)} + 보너스·잭팟 ${pct(s.other)} · 당첨률 ${pct(s.hit)} · 보너스 ${s.bonusEvery ? "약 " + fmt(s.bonusEvery) + "스핀에 1번" : "없음"} `),
            h("small.muted", `(${fmt(s.spins)}스핀 · BET ${fmt(s.bet)} · 잭팟 시드 기준, ±1~2% 오차)`),
            s.rtp > 1 ? h("small.bad", " ⚠ 100% 초과 — 플레이어가 장기적으로 이깁니다") : null);
    }

    // ------------------------------------------------------------ casino
    function casinoRow(def) {
        const id = def.id;
        const row = h("div.ag-crow");
        function draw() {
            const ed = ced(id), g = buildCasino(id, ed);
            row.className = "ag-crow" + (ed.off ? " off" : "");
            row.replaceChildren(
                h("span.ag-ico", def.icon),
                h("div", h("b", def.name), h("small.muted", ` ${KIND[def.kind] || def.kind} · ${locOf("casino", id)}`)),
                h("label.cf", h("small", `RTP % (기본 ${Math.round(def.rtp * 100)})`), h("input.num", { type: "number", step: 0.5, min: 30, max: 99.5, value: +(g.rtp * 100).toFixed(1), onchange: e => { ed.rtp = Math.min(0.995, Math.max(0.3, +e.target.value / 100)); markDirty(); draw(); } })),
                h("small.muted", `실제 ${pct(gameRtp(g))} · 최고 x${topMult(g)}`),
                h("label.check", h("input", { type: "checkbox", checked: !ed.off, onchange: e => { ed.off = !e.target.checked; markDirty(); draw(); } }), "노출"),
                (ed.off || ed.rtp) ? h("button.btn.ghost.small", { onclick: () => { delete work.casino[id]; markDirty(); draw(); } }, "↺") : h("span"));
        }
        draw();
        return row;
    }

    function draw() {
        tabs.replaceChildren(
            h("button.tab" + (tab === "slot" ? ".on" : ""), { onclick: () => { tab = "slot"; draw(); } }, `🎰 슬롯머신 ${SLOTS.length}`),
            h("button.tab" + (tab === "casino" ? ".on" : ""), { onclick: () => { tab = "casino"; draw(); } }, `🃏 카지노게임 ${CASINO_GAMES.length}`));
        if (tab === "slot") body.replaceChildren(...SLOTS.map(s => slotCard(slotDefault(s.id))));
        else body.replaceChildren(
            h("div.ag-card", h("div.ag-rtp",
                h("label.cf", h("small", `카지노게임 1회 최대 당첨금 (기본 ${fmt(defaultMaxWin())} G)`), h("input.num.wide", { type: "number", step: 10000, min: 1000, value: work.casinoMaxWin || CONFIG.CASINO_MAX_WIN, onchange: e => { work.casinoMaxWin = +e.target.value || null; markDirty(); } })),
                h("small.muted", "RTP를 바꾸면 '꽝' 확률이 자동으로 다시 계산됩니다. 당첨 배수표는 그대로입니다."))),
            h("div.ag-clist", CASINO_GAMES.map(g => casinoRow(casinoDefault(g.id)))),
            h("button.btn.red.small", { onclick: async () => { if (await confirmBox("카지노게임 설정을 모두 기본값으로 되돌릴까요?")) { work.casino = {}; work.casinoMaxWin = null; markDirty(); draw(); } } }, "카지노게임 전체 기본값"));
    }
    async function save() {
        // keep only real changes
        const clean = structuredClone(work);
        for (const [id, ed] of Object.entries(clean.slots)) {
            delete ed._target;
            for (const [k, fe] of Object.entries(ed.feat || {})) { if (!fe.off) delete fe.off; if (fe.p == null) delete fe.p; if (!Object.keys(fe).length) delete ed.feat[k]; }
            if (ed.feat && !Object.keys(ed.feat).length) delete ed.feat;
            if (ed.meter) { if (!ed.meter.off) delete ed.meter.off; if (ed.meter.p == null) delete ed.meter.p; if (!Object.keys(ed.meter).length) delete ed.meter; }
            if (!ed.off) delete ed.off; if (!ed.px) delete ed.px;
            if (!Object.keys(ed).length) delete clean.slots[id];
        }
        for (const [id, ed] of Object.entries(clean.casino)) { if (!ed.off) delete ed.off; if (!ed.rtp) delete ed.rtp; if (!Object.keys(ed).length) delete clean.casino[id]; }
        if (!clean.casinoMaxWin) delete clean.casinoMaxWin;
        await Store.saveGames(clean);
        applyGames();
        saveBtn.textContent = "💾 저장";
        toast("게임 설정을 저장했습니다", "ok");
    }
    draw();
    return page;
}
