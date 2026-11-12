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
import { slotdexPage } from "./screens/slotdex.js";
import { adminMapsPage } from "./screens/adminMaps.js";
import { adminSimPage } from "./screens/adminSim.js";
import { applyMaps } from "./data/mapAdmin.js";

const ROUTES = {
    "": homePage, "season": seasonScreen, "players": playersPage, "hall": hallPage,
    "map": mapPage, "practice": practicePage, "guide": guidePage, "admin": adminPage,
    "admin-catalog": adminCatalogPage, "slotgen": slotGenPage, "admin-players": adminPlayersPage, "admin-games": adminGamesPage,
    "slotdex": slotdexPage, "admin-maps": adminMapsPage, "admin-sim": adminSimPage
};

function nav(active) {
    const link = (id, label) => h("a" + (active === id ? ".on" : ""), { href: "#/" + id }, label);
    return h("nav.topnav",
        h("a.brand", { href: "#/" }, h("span", "🎰"), "GAMBLERS"),
        h("div.links", link("season", "시즌"), link("players", "플레이어"), link("map", "지도"), link("slotdex", "슬롯도감"), link("hall", "명예의 전당"), link("practice", "연습실"), link("guide", "방법"), link("admin", "⚙️")),
        h("div.navright",
            h("span.mode" + (Store.cloud ? (Store.user ? ".cloud" : ".ro") : ".local"), Store.cloud ? (Store.user ? "☁ 저장중" : "☁ 읽기전용") : "💾 로컬"),
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
    document.getElementById("boot")?.remove();
    window.addEventListener("hashchange", route);
    document.addEventListener("auth", () => route());
    route();
})();
