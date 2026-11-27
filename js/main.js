// App entry: load data, then route by URL hash.
import { h } from "./core/util.js";
import { Store } from "./core/store.js";
import { Sound } from "./core/sound.js";
import { CONFIG } from "./config.js";
import { applyCatalog } from "./data/catalogAdmin.js";
import { applyGames } from "./data/gameAdmin.js";
import { adminGamesPage } from "./screens/adminGames.js";
import { seasonScreen } from "./screens/seasonView.js";
import { homePage, playersPage, hallPage, mapPage, practicePage, guidePage, adminPage } from "./screens/pages.js";
import { adminCatalogPage } from "./screens/adminCatalog.js";
import { slotGenPage } from "./screens/slotGen.js";
import { adminPlayersPage } from "./screens/adminPlayers.js";
import { adminStatsPage } from "./screens/adminStats.js";
import { slotdexPage } from "./screens/slotdex.js";
import { adminMapsPage } from "./screens/adminMaps.js";
import { adminSimPage, adminTestPage } from "./screens/adminSim.js";
import { adminResourcesPage } from "./screens/adminResources.js";
import { adminBankPage } from "./screens/adminBank.js";
import { adminEmoPage } from "./screens/adminEmo.js";
import { adminMovieDbPage } from "./screens/adminMovieDb.js";
import { adminMoviePromptPage } from "./screens/adminMoviePrompt.js";
import { rankingPage } from "./screens/ranking.js";
import { applyMaps } from "./data/mapAdmin.js";
import { fillEmptyBizCorners } from "./data/business.js";
import { seasonSummaryPage } from "./screens/seasonSummary.js";
import { lang, setLang, startI18n } from "./core/i18n.js";
import { REGIONS, LOCATIONS } from "./data/catalog.js";
import { installScrollFab } from "./ui/scrollFab.js";
import "./data/life.js"; // 🍚 food items join the item list before any screen is drawn

const ROUTES = {
    "": homePage, "season": seasonScreen, "players": playersPage, "hall": hallPage, "ranking": rankingPage, "summary": seasonSummaryPage,
    "map": mapPage, "practice": practicePage, "guide": guidePage, "admin": adminPage,
    "admin-catalog": adminCatalogPage, "slotgen": slotGenPage, "admin-players": adminPlayersPage, "admin-stats": adminStatsPage, "admin-games": adminGamesPage,
    "slotdex": slotdexPage, "admin-maps": adminMapsPage, "admin-sim": adminSimPage, "admin-test": adminTestPage, "admin-resources": adminResourcesPage, "admin-bank": adminBankPage, "admin-emo": adminEmoPage, "admin-moviedb": adminMovieDbPage, "admin-movieprompt": adminMoviePromptPage
};

function nav(active) {
    const link = (id, label) => h("a" + (active === id ? ".on" : ""), { href: "#/" + id }, label);
    return h("nav.topnav",
        h("a.brand", { href: "#/" }, h("span", "🎰"), "GAMBLERS"),
        h("div.links", link("season", "시즌"), link("players", "플레이어"), link("map", "지도"), link("slotdex", "슬롯도감"), link("hall", "명예의 전당"), link("ranking", "랭킹"), link("summary", "시즌 요약"), link("practice", "연습실"), link("guide", "방법"), link("admin", "⚙️")),
        h("div.navright",
            h("span.mode" + (Store.cloud ? (Store.user ? ".cloud" : ".ro") : ".local"), Store.cloud ? (Store.user ? "☁ 저장중" : "☁ 읽기전용") : "💾 로컬"),
            h("button.icon-btn.lang-toggle", { "data-no-i18n": "", onclick: () => setLang(lang() === "en" ? "ko" : "en"), title: "Language / 언어" }, lang() === "en" ? "🌐 KO" : "🌐 EN"),
            h("button.icon-btn", { onclick: e => { e.currentTarget.textContent = Sound.toggle() ? "🔇" : "🔊"; }, title: "사운드" }, Sound.muted ? "🔇" : "🔊")));
}

function route() {
    const id = location.hash.replace(/^#\/?/, "").split("?")[0];
    const page = ROUTES[id] || homePage;
    const app = document.getElementById("app");
    document.body.dataset.page = id || "home";
    app.replaceChildren(nav(id), h("main", page()));
    window.scrollTo(0, 0);
}

(async function boot() {
    const saved = +localStorage.getItem("gamblers.turnSeconds");
    if (saved >= 30) CONFIG.TURN_SECONDS = saved;
    await Store.init();
    applyCatalog();
    applyGames();
    applyMaps();
    fillEmptyBizCorners(LOCATIONS); // 🏪 empty Self-Business corners get a business
    document.getElementById("boot")?.remove();
    await startI18n([...REGIONS.map(r => [r.name, r.en]), ...LOCATIONS.map(l => [l.name, l.en])]);
    window.addEventListener("hashchange", route);
    installScrollFab(); // ⬆️⬇️ admin pages: jump to the top / bottom
    // never tear down an open game (a slot bonus in progress): re-render once it is closed
    let authWait = null;
    document.addEventListener("auth", () => {
        if (!document.querySelector(".game-layer")) return route();
        if (authWait) return;
        authWait = setInterval(() => { if (!document.querySelector(".game-layer")) { clearInterval(authWait); authWait = null; route(); } }, 1000);
    });
    route();
})();
