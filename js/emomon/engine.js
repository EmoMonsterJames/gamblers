// =====================================================================
// 🐾 EmoMonster engine inside Gamblers.
// The EmoMonster folder's own scripts are loaded as they are (classic
// scripts, global classes): GameConfig · type chart · StatCalculator ·
// TraitManager · BattleEngine · SpriteManager. They need a tiny `UI`
// (asset paths, escaping) and a `MonsterService` stub, set up here first.
// Everything else in Gamblers waits for emoReady() before touching them.
// =====================================================================
const BASE = "EmoMonster/";
const FILES = ["gameConfig.js", "typeChart.js", "statCalculator.js", "traitManager.js", "battleEngine.js", "spriteManager.js"];
let ready = null;

function shim() {
    if (window.UI) return;
    window.UI = {
        base: BASE,
        asset(path) {
            if (!path) return "";
            if (/^(https?:|data:|blob:)/.test(path)) return path;
            return BASE + String(path).replace(/^\.?\.?\//, "");
        },
        esc: s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
    };
    window.MonsterService ||= { spriteOf: m => m.species || m };
}
const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = false;
    s.onload = res; s.onerror = () => rej(new Error("EmoMonster script failed: " + src));
    document.head.append(s);
});

export function emoReady() {
    if (!ready) ready = (async () => {
        shim();
        for (const f of FILES) await loadScript(BASE + "js/" + f);
        return true;
    })();
    return ready;
}
// global classes (they are lexical globals, so they are read through eval-free getters)
/* global GameConfig, BattleEngine, StatCalculator, SpriteManager, TraitManager, TYPE_COLORS, TYPE_CHART, ALL_TYPES, getMonsterTypes */
export const E = {
    get cfg() { return GameConfig; },
    get battle() { return BattleEngine; },
    get stats() { return StatCalculator; },
    get sprite() { return SpriteManager; },
    get traits() { return TraitManager; },
    get colors() { return TYPE_COLORS; },
    get chart() { return TYPE_CHART; },
    get types() { return ALL_TYPES; },
    typesOf: m => getMonsterTypes(m)
};
export const asset = p => window.UI ? window.UI.asset(p) : BASE + p;
