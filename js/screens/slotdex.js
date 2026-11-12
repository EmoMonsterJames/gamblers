// 슬롯도감 — every slot machine and casino game: type, name, brand, RTP,
// where it lives (region / map) and who hit its jackpots.
import { h, fmt } from "../core/util.js";
import { Store } from "../core/store.js";
import { REGIONS, REGION_BY_ID } from "../data/catalog.js";
import { CASINO_GAMES, gameRtp } from "../data/casino.js";
import { SLOTS } from "../slots/configs.js";
import { slotHomes, casinoHomes } from "../data/mapAdmin.js";
import { simulate } from "../slots/sim.js";
import { showJackpotWinners } from "../ui/jackpotList.js";

// measured with ≥150k browser spins at the shipped px
const MEASURED = { monster_kitchen: 0.892, dj_crypto: 0.878, sol_umbra: 0.894, neon_cadets: 0.87, four_pillars: 0.852, gift: 0.872, chrono_heist: 0.887 };
const CACHE = "gamblers.rtpCache";
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE) || "{}"); } catch { return {}; } };
const writeCache = c => { try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* storage off */ } };
const pct = x => (x * 100).toFixed(1) + "%";
const slotType = c => c.engine?.startsWith("sp_") ? "SPECIAL" : c.progressive === false ? "CLASSIC" : "PROGRESSIVE";
const KIND = { wheel: "휠", pick: "고르기", coinflip: "코인플립", dice: "주사위", hilo: "하이로우", scratch: "스크래치", gacha: "뽑기", plinko: "플링코", lottery: "로또", pension: "연금복권", roulette: "룰렛" };

export function slotdexPage() {
    let kind = "all", region = "", q = "";
    const cache = readCache();
    const body = h("div.dex-list");
    let alive = true;
    window.addEventListener("hashchange", () => { alive = false; }, { once: true });

    const where = homes => homes.length
        ? homes.map(l => h("span.dex-loc", { style: { "--c": REGION_BY_ID[l.region]?.color || "#888" } }, `${REGION_BY_ID[l.region]?.emoji || ""} ${REGION_BY_ID[l.region]?.name || "?"} › ${l.emoji} ${l.name}`))
        : h("span.muted", "배치된 맵 없음");

    const winners = (id, name) => {
        const rows = Store.jackpotWinners(id);
        return h("button.btn.ghost.small", { onclick: () => showJackpotWinners(id, name), disabled: !rows.length }, rows.length ? `🏆 ${rows.length}명 · 최근 ${rows[0].tier}` : "🏆 없음");
    };

    function slotRtp(c) {
        const key = `${c.id}@${(+c.px || 1).toFixed(3)}`;
        if (cache[key]) return h("b.dex-rtp", pct(cache[key]));
        if (MEASURED[c.id]) return h("b.dex-rtp", pct(MEASURED[c.id]));
        const btn = h("button.btn.small.ghost", { onclick: async () => {
            btn.disabled = true;
            const r = await simulate(c, { spins: 60000, alive: () => alive, onProgress: p => { btn.textContent = `측정 중 ${Math.round(p * 100)}%`; } });
            if (!alive) return;
            cache[key] = r.rtp; writeCache(cache);
            btn.replaceWith(h("b.dex-rtp", pct(r.rtp)));
        } }, "📊 RTP 측정");
        return btn;
    }

    function render() {
        const ql = q.toLowerCase();
        const slotRows = kind === "casino" ? [] : SLOTS.filter(c => !c.off).map(c => ({ c, homes: slotHomes(c.id) }))
            .filter(r => (!region || r.homes.some(l => l.region === region)) && (!ql || `${r.c.name} ${r.c.brand}`.toLowerCase().includes(ql)));
        const casRows = kind === "slot" ? [] : CASINO_GAMES.filter(g => !g.off).map(g => ({ g, homes: casinoHomes(g.id) }))
            .filter(r => (!region || r.homes.some(l => l.region === region)) && (!ql || r.g.name.toLowerCase().includes(ql)));
        body.replaceChildren(...[
            slotRows.length ? h("h3", `🎰 슬롯머신 ${slotRows.length}`) : null,
            slotRows.length ? h("table.dex-table",
                h("tr", h("th", "종류"), h("th", "이름"), h("th", "브랜드"), h("th", "RTP"), h("th", "위치"), h("th", "잭팟 수령자")),
                slotRows.map(({ c, homes }) => h("tr",
                    h("td", h("span.dex-type.t-" + slotType(c).toLowerCase(), slotType(c))),
                    h("td", h("b", c.name)), h("td.muted", c.brand || "-"),
                    h("td", slotRtp(c)), h("td", where(homes)), h("td", winners(c.id, c.name))))) : null,
            casRows.length ? h("h3", `🃏 카지노 게임 ${casRows.length}`) : null,
            casRows.length ? h("table.dex-table",
                h("tr", h("th", "종류"), h("th", "이름"), h("th", "게임"), h("th", "RTP"), h("th", "위치"), h("th", "최고상 수령자")),
                casRows.map(({ g, homes }) => h("tr",
                    h("td", h("span.dex-type.t-casino", "CASINO")),
                    h("td", h("b", `${g.icon} ${g.name}`)), h("td.muted", KIND[g.kind] || g.kind),
                    h("td", h("b.dex-rtp", pct(gameRtp(g)))), h("td", where(homes)), h("td", winners(g.id, g.name))))) : null,
            !slotRows.length && !casRows.length ? h("p.muted", "조건에 맞는 게임이 없습니다.") : null].filter(Boolean));
    }
    render();
    return h("div.page.slotdex",
        h("h2.page-title", "📚 슬롯도감"),
        h("p.muted", "모든 슬롯머신·카지노 게임의 종류, RTP, 위치(지역 › 맵), MAXI 이상 잭팟 수령자를 확인합니다."),
        h("div.filters",
            h("select", { onchange: e => { kind = e.target.value; render(); } }, h("option", { value: "all" }, "전체"), h("option", { value: "slot" }, "슬롯만"), h("option", { value: "casino" }, "카지노 게임만")),
            h("select", { onchange: e => { region = e.target.value; render(); } }, h("option", { value: "" }, "전체 지역"), REGIONS.filter(r => !r.off).map(r => h("option", { value: r.id }, `${r.emoji} ${r.name}`))),
            h("input", { placeholder: "이름 / 브랜드 검색", oninput: e => { q = e.target.value; render(); } })),
        body);
}
