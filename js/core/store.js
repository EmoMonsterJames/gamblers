// =====================================================================
// Store — all persistent data. Always keeps a copy in localStorage; when
// Supabase is configured (js/config.js) it also loads from / saves to the
// `gamblers` schema. Writes to Supabase need the admin to be logged in
// (RLS: anyone can read, only admins can write).
// =====================================================================
import { CONFIG } from "../config.js";
import { SEED_PLAYERS } from "../data/players.js";
import { SLOTS } from "../slots/configs.js";
import { toast } from "./fx.js";
import { buildAvatar, parseGen, toDataUri, raceFromEthnicity, RACES, isNoImage } from "../ui/avatarGen.js";

// 🎨 pictures made with the player image generator carry their options: they are redrawn with the
// current generator on load (same colours / face / makeup / clothes — only the drawing rules change)
// 🐜 Ant / 🐰 Dungi players are always drawn in their own race's form (Dark Ant style · Jiggly Wobbly Dungi style),
// whatever race the picture was first made with — the colours stay.
const FORCED_RACE = new Set(["ant", "dungi"]);
const regenCache = new Map();
function freshAvatar(src, ethnicity = "", extras = null) {
    if (!String(src || "").startsWith("data:image/svg+xml")) return src;
    const key = src + "|" + ethnicity + "|" + (extras ? JSON.stringify(extras) : "");
    if (!regenCache.has(key)) {
        let out = src;
        try {
            const o = parseGen(src);
            if (o) {
                const r = raceFromEthnicity(ethnicity);
                if (FORCED_RACE.has(r) && o.race !== r && o.race !== "noimage") {
                    if (!o.skin || o.skin === "auto") o.skin = RACES.find(x => x[0] === o.race)?.[3] || "auto";
                    o.race = r;
                }
                if (extras) Object.assign(o, extras);
                out = toDataUri(buildAvatar(o));
            }
        } catch (e) { console.warn(e); }
        regenCache.set(key, out);
    }
    return regenCache.get(key);
}
// 🖌️ hand-drawn pictures for players whose picture was made with the generator (a file or URL the admin sets later wins)
export const PLAYER_ART = {
    275: "images/players/linda_jones.svg",          // 린다존스 — a Human turned Dungi by surgery
    276: "images/players/ddongzzi.svg",             // 똥찌
    277: "images/players/movie_cash_dungi.svg",     // 무비캐시덩이
    278: "images/players/bobbling_puppy.svg",       // 머리흔드는강아지
    282: "images/players/odongtong_dungdung.svg",   // 오동통덩덩
    285: "images/players/kanzi_ant.svg",            // 간지나는개미
    180: "images/players/baezzi_bear.svg",          // 배찌 — bear boy, pilot cap + goggles
    440: "images/players/ice_boy.svg",              // 아이스보이 — snowman with a scarf
    441: "images/players/turtle.svg",               // 거북이 — shell poking out of his clothes
    442: "images/players/stock_emobu.svg",          // 주식투자이모부 — blond/purple hair, sunglasses, cigar
    443: "images/players/one_ear_rabbit.svg",       // 한귀토끼 — one big ear
    444: "images/players/siamese_dungi.svg",        // 샴쌍덩이 — two Dungi heads on one body
    445: "images/players/tinky_winky.svg",          // 보라돌이
    446: "images/players/dipsy.svg",                // 뚜비
    447: "images/players/naa_naa.svg",              // 나나
    448: "images/players/po.svg",                   // 뽀 — LUX dress
    450: "images/players/uni.svg",                  // 우니
    451: "images/players/kepi_red.svg",             // 케피 — red pig
    452: "images/players/ettie.svg",                // 에띠
    453: "images/players/mos.svg",                  // 모스
    454: "images/players/shiro.svg",                // 흰둥이 — white curly puppy
    498: "images/players/oopsy_daisy.svg",          // 웁시데이지 — bald baby doll in a blue dress
    512: "images/players/siamese_jiangshi.svg"      // 샴강시 — two jiangshi faces on one body (hat · talisman)
};
// 🎨 extras added on top of a generated picture (generator options — see extrasBack / extrasFront in ui/avatarGen.js)
export const PLAYER_EXTRAS = {
    274: { eyeColor: "#8fd3ff" },                                                         // 파란눈동자세모 — light blue eyes
    280: { tail: "#ff9ec4", cheekFluff: true },  // 다람쥐토끼 — white cheek fluff + a big pink squirrel tail
    283: { logo: "LUX" },                         // 깜지 — LUX logo on the clothes
    286: { wings: "#e11d2e", antennae: "#3a2a24", ribbon: "#ff4f8b" },                    // 꽃나비 — big red butterfly wings
    499: { bt: "fat" }                            // 만두덩이 — 과체중 체형
};
// 🚫 "No Image" (admin → 플레이어 관리) wins over the hand-drawn pictures too
// 📦 ordered pictures that have been delivered: these players were saved as "No Image" while waiting, their art wins now
const ART_DELIVERED = new Set([440, 441, 442, 443, 444, 445, 446, 447, 448, 450, 451, 452, 453, 454, 498, 512]);
const playerImage = p => isNoImage(p.profile_image) && !ART_DELIVERED.has(p.id) ? p.profile_image : ART_DELIVERED.has(p.id) && isNoImage(p.profile_image) ? PLAYER_ART[p.id] : PLAYER_ART[p.id] && (!p.profile_image || String(p.profile_image).startsWith("data:")) ? PLAYER_ART[p.id] : freshAvatar(p.profile_image, p.ethnicity, { ...(PLAYER_EXTRAS[p.id] || {}), baby: String(p.age_group || "").trim().toLowerCase() === "baby" }); // 👶 Baby players are drawn smaller

const LS = "gamblers.v1";
let sb = null; // supabase client

function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } }
// ⚡ player pictures cache (IndexedDB — the ~6 MB of pictures don't fit in localStorage):
// the page starts from the cached pictures + a light player query (no pictures), and checks the
// pictures against the server in the background (only changed ones are redrawn).
const PLAYER_COLS_LIGHT = "id,login_id,name_ko,player_name,country,school,job,ethnicity,age_group,gender,preference,handler,frame,profile_effect,owned_frames,owned_effects,is_active,created_at";
const IMG_KEY = "player-images";
function idb() {
    return new Promise((res, rej) => {
        const r = indexedDB.open("gamblers-cache", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("kv");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
}
async function idbGet(key) {
    try {
        const db = await idb();
        return await new Promise((res) => { const t = db.transaction("kv").objectStore("kv").get(key); t.onsuccess = () => res(t.result ?? null); t.onerror = () => res(null); });
    } catch { return null; }
}
async function idbSet(key, val) {
    try {
        const db = await idb();
        await new Promise((res) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(val, key); tx.oncomplete = res; tx.onerror = res; tx.onabort = res; });
    } catch { }
}
const imgMap = rows => Object.fromEntries((rows || []).map(r => [r.id, r.profile_image ?? null]));

export const Store = {
    mode: "local",
    user: null,
    players: [],     // active players (selection pool)
    allPlayers: [],  // including deactivated ones (old seasons still reference them)
    playerEdits: {}, // local-mode admin edits: id -> full record
    decor: {},       // pid -> { frame, effect, ownedFrames:[], ownedEffects:[] }
    hall: [],        // [{ season, playerId, snapshot, at }]
    results: [],     // [{ season, playerId, rank }]
    jackpots: {},    // game -> tier -> amount
    machines: {},    // game -> state
    jpLog: [],       // [{ game, tier, playerId, amount, season, at }] MAXI+ jackpots
    catalog: {},     // admin overrides for shop items: see data/catalogAdmin.js
    games: {},       // admin overrides for slots / casino games: see data/gameAdmin.js
    maps: {},        // admin overrides for regions / maps: see data/mapAdmin.js
    wallets: {},     // pid -> gold won outside a season (survival corner), added when they join one
    bank: {},        // 🏦 accounts, 🏪 businesses, pending transfers, trend reports: see game/bank.js
    emodex: {},      // 📖 EmoMon dex per player: { <pid>: { <speciesId>: { how, at, season } } } (persistent)
    community: { posts: [] }, // 💬 community board (persistent across seasons): { posts: [{ id, pid, season, text, style, at }] }
    stash: {},       // 🎒 every player's belongings carried between seasons: { <pid>: { season, items, pet, petEffect, weapons, emo, lotto } } (game/season.js)
    highlights: { list: [], seen: {} }, // 🎬 Gamblers Highlight replays (screens/highlight.js) + who watched in which season
    residency: {},  // 🪪 영주권: { pid: [country, …] } (settings key "residency")
    vhs: { own: {}, movies: [] }, // 📼 동행 VHS: { own: { pid: [{ id, at, season }] }, movies: [admin-made movies] } (settings key "vhs")
    lotto: {},       // 🎟️ lotto corner (persistent across seasons): see game/lotto.js
    gameplays: { counts: {}, seasons: [] }, // 🔥 all-time plays per game of finished seasons ("slot:<id>" / "casino:<id>": n) — Hot badges (game/gameBadges.js)
    emokeep: {},     // 🏟️ every player's last battle monster (persistent) — arena opponents outside the season
    emomon: null,    // 🐾 EmoMonster catalog snapshot (settings "emomon", loaded on demand: emomon/data.js)
    season: null,    // current season object (see game/season.js)
    sandbox: null,   // test mode: { real } while an admin tries the maps with the test player
    seasonCount: 0,
    _saveTimer: null,
    _jpQueue: {},

    get cloud() { return this.mode === "cloud"; },
    get canWrite() { return !this.cloud || !!this.user; },

    async init() {
        const L = load();
        this.decor = L.decor || {};
        this.hall = L.hall || [];
        this.results = L.results || [];
        this.jackpots = L.jackpots || {};
        this.machines = L.machines || {};
        this.jpLog = L.jpLog || [];
        this.catalog = L.catalog || {};
        this.games = L.games || {};
        this.maps = L.maps || {};
        this.wallets = L.wallets || {};
        this.bank = L.bank || {};
        this.gameplays = L.gameplays || { counts: {}, seasons: [] };
        this.emodex = L.emodex || {};
        this.community = L.community || { posts: [] };
        this.emokeep = L.emokeep || {};
        this.lotto = L.lotto || {};
        this.stash = L.stash || {};
        this.highlights = L.highlights || { list: [], seen: {} };
        this.residency = L.residency || {};
        this.vhs = L.vhs || { own: {}, movies: [] };
        this.season = L.season || null;
        this.fillHandlers();
        this.seasonCount = L.seasonCount || 0;
        this.playerEdits = L.playerEdits || {};
        this.archive = L.archive || []; // finished seasons (local mode): { number, status, winnerId, round, roster, history, ps }
        const base = new Map(SEED_PLAYERS.map(p => [p.id, { ...p }]));
        for (const [id, p] of Object.entries(this.playerEdits)) base.set(+id, { ...base.get(+id), ...p });
        this.setPlayers([...base.values()]);
        this.ensureJackpots();
        if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) {
            try {
                const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
                sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, { db: { schema: CONFIG.SUPABASE_SCHEMA } });
                const { data: sess } = await sb.auth.getSession();
                this.user = sess?.session?.user || null;
                // only a real sign-in / sign-out re-renders the page: TOKEN_REFRESHED (hourly) and the
                // SIGNED_IN that supabase-js re-fires when the tab regains focus used to rebuild the
                // season screen mid-spin (a slot bonus vanished → back to the games tab, bet lost)
                sb.auth.onAuthStateChange((_e, s) => {
                    const was = this.user?.id || null;
                    this.user = s?.user || null;
                    if ((this.user?.id || null) !== was) document.dispatchEvent(new Event("auth"));
                });
                await this.pull();
                this.mode = "cloud";
                if (this.user) this.seedJackpotRows(); // rows for newly added slots
            } catch (e) {
                console.warn("Supabase unavailable, running locally", e);
                toast("Supabase 연결 실패 — 로컬 모드로 실행합니다", "warn");
            }
        }
    },

    async pull() {
        const q = async (t, sel = "*") => { const { data, error } = await sb.from(t).select(sel); if (error) throw error; return data; };
        // ⚡ players: with cached pictures, only the light columns (+ the pictures of players new to this browser);
        // without a cache (first visit), the whole table — and the pictures are cached for next time
        let usedCache = false;
        const playersQ = idbGet(IMG_KEY).then(async cache => {
            if (!cache || !Object.keys(cache).length) { const rows = await q("players"); idbSet(IMG_KEY, imgMap(rows)); return rows; }
            const rows = await q("players", PLAYER_COLS_LIGHT);
            const miss = rows.filter(p => !(p.id in cache)).map(p => p.id);
            if (miss.length) {
                const { data, error } = await sb.from("players").select("id,profile_image").in("id", miss);
                if (error) throw error;
                Object.assign(cache, imgMap(data));
                idbSet(IMG_KEY, cache);
            }
            usedCache = true;
            return rows.map(p => ({ ...p, profile_image: cache[p.id] ?? null }));
        });
        const [players, hall, results, jps, machines, seasons, hits, settings] = await Promise.all([
            playersQ, q("hall_of_fame"), q("season_results"), q("slot_jackpots"), q("slot_machine_state"),
            sb.from("seasons").select("*").order("number", { ascending: false }).limit(1).then(r => { if (r.error) throw r.error; return r.data; }),
            q("jackpot_hits"), sb.from("settings").select("*").neq("key", "emomon").then(r => { if (r.error) throw r.error; return r.data; })
        ]);
        if (players?.length) {
            const stale = players.filter(p => p.handler); // read before setPlayers turns handler into the live season getter
            this.setPlayers(players);
            // 🧑‍💼 old stored handlers are cleared once (전담자 now only exists inside a running season)
            if (stale.length && this.user) this.write(sb => sb.from("players").update({ handler: null }).in("id", stale.map(p => p.id)));
            for (const p of players) this.decor[p.id] = { frame: p.frame, effect: p.profile_effect, ownedFrames: p.owned_frames || [], ownedEffects: p.owned_effects || [] };
            if (usedCache) setTimeout(() => this.checkPlayerImages(players), 1500); // after the first screen is up
        }
        this.hall = hall.map(r => ({ season: r.season_number, playerId: r.player_id, snapshot: r.snapshot, at: r.crowned_at })).sort((a, b) => b.season - a.season);
        this.results = results.map(r => ({ season: r.season_number, playerId: r.player_id, rank: r.rank }));
        for (const r of jps) { (this.jackpots[r.game] ||= {})[r.tier] = +r.amount; }
        this.machines = {}; // cloud is the source of truth (a reset deletes the rows)
        for (const r of machines) this.machines[r.game] = r.state || {};
        this.jpLog = hits.map(r => ({ game: r.game, tier: r.tier, playerId: r.player_id, amount: +r.amount, season: r.season_number, at: r.hit_at }));
        const cat = settings.find(r => r.key === "catalog");
        if (cat) this.catalog = cat.value || {};
        const gm = settings.find(r => r.key === "games");
        if (gm) this.games = gm.value || {};
        const mp = settings.find(r => r.key === "maps");
        if (mp) this.maps = mp.value || {};
        const wl = settings.find(r => r.key === "wallets");
        this.wallets = wl?.value || {}; // cloud is the source of truth (a reset leaves no row)
        const bk = settings.find(r => r.key === "bank");
        this.bank = bk?.value || {};
        this.emodex = settings.find(r => r.key === "emodex")?.value || {};
        this.community = settings.find(r => r.key === "community")?.value || { posts: [] };
        this.emokeep = settings.find(r => r.key === "emokeep")?.value || {};
        this.gameplays = settings.find(r => r.key === "gameplays")?.value || { counts: {}, seasons: [] };
        this.lotto = settings.find(r => r.key === "lotto")?.value || {};
        this.stash = settings.find(r => r.key === "stash")?.value || {};
        this.highlights = settings.find(r => r.key === "highlights")?.value || { list: [], seen: {} };
        this.residency = settings.find(r => r.key === "residency")?.value || {};
        this.vhs = settings.find(r => r.key === "vhs")?.value || { own: {}, movies: [] };
        const s = seasons?.[0];
        this.seasonCount = s?.number || 0;
        this.season = s && s.status !== "done" ? { ...s.state, dbId: s.id } : null;
        this.fillHandlers();
        this.ensureJackpots();
        this.saveLocal();
    },

    saveLocal() {
        if (this.sandbox) return; // test mode (game/sandbox.js): nothing is saved
        try {
            localStorage.setItem(LS, JSON.stringify({ decor: this.decor, hall: this.hall, results: this.results, jackpots: this.jackpots, machines: this.machines, season: this.season, seasonCount: this.seasonCount, jpLog: this.jpLog.slice(-500), catalog: this.catalog, games: this.games, maps: this.maps, wallets: this.wallets, bank: this.bank, emodex: this.emodex, community: this.community, emokeep: this.emokeep, lotto: this.lotto, stash: this.stash, highlights: this.highlights, residency: this.residency, vhs: this.vhs, gameplays: this.gameplays, playerEdits: this.playerEdits, archive: this.archive }));
        } catch (e) { console.warn(e); }
    },

    async write(fn) {
        if (this.sandbox) return;
        if (!this.cloud) return;
        if (!this.user) { if (!this._warned) { toast("관리자 로그인 전이라 클라우드에 저장되지 않습니다 (이 브라우저에만 저장)", "warn", 4000); this._warned = true; } return; }
        this.io.writes++; this.io.log.push(Date.now()); if (this.io.log.length > 500) this.io.log.shift();
        try { const r = await fn(sb); if (r?.error) throw r.error; return r?.data; }
        catch (e) { this.io.errors++; console.error(e); toast("저장 실패: " + (e.message || e), "error"); }
    },
    // cloud writes made by this browser since the page loaded (resource dashboard)
    io: { writes: 0, errors: 0, log: [], since: Date.now() },
    // read-only query for the admin resource dashboard: fn(sb) → { data, error, count }
    async probe(fn) {
        if (!sb) return { error: { message: "로컬 모드 (Supabase 미설정)" } };
        try { return await fn(sb); } catch (e) { return { error: e }; }
    },

    // ------------------------------------------------------------ auth
    async login(email, password) {
        if (!sb) throw new Error("Supabase가 설정되지 않았습니다 (js/config.js)");
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.user = data.user;
        const { data: ok } = await sb.rpc("is_admin");
        if (!ok) toast("이 계정은 관리자 목록(gamblers.admins)에 없습니다. 저장이 거부될 수 있어요.", "warn", 5000);
        else await this.seedCloud();
        await this.pull();
        return data.user;
    },
    // First admin login on an empty database: upload the player list and
    // create the progressive jackpot rows (existing rows are left alone).
    async seedCloud() {
        try {
            const { count } = await sb.from("players").select("id", { count: "exact", head: true });
            if (!count) {
                const cols = ["id", "login_id", "name_ko", "player_name", "profile_image", "country", "school", "job", "ethnicity", "age_group", "gender", "preference", "handler"];
                const rows = SEED_PLAYERS.map(p => Object.fromEntries(cols.map(c => [c, p[c] ?? null])));
                for (let i = 0; i < rows.length; i += 100) {
                    const { error } = await sb.from("players").insert(rows.slice(i, i + 100));
                    if (error) throw error;
                }
                toast(`플레이어 ${rows.length}명을 Supabase에 등록했습니다`, "ok");
            }
            await this.seedJackpotRows(true);
        } catch (e) { console.error(e); toast("초기 데이터 업로드 실패: " + (e.message || e), "error"); }
    },
    async seedJackpotRows(throwErr = false) {
        const jrows = [];
        for (const g of SLOTS) for (const [tier, j] of Object.entries(g.jp || {})) {
            if (j.x || j.sum) continue;
            jrows.push({ game: g.id, tier, amount: this.jackpots[g.id]?.[tier] ?? j.seed, seed: j.seed, rate: g.progressive === false ? 0 : (j.rate || 0), cap: j.cap ?? null });
        }
        for (let i = 0; i < jrows.length; i += 200) {
            const { error } = await sb.from("slot_jackpots").upsert(jrows.slice(i, i + 200), { onConflict: "game,tier", ignoreDuplicates: true });
            if (error) { if (throwErr) throw error; console.warn(error); return; }
        }
    },
    async saveMaps(maps) {
        this.maps = maps;
        this.saveLocal();
        await this.write(sb => sb.from("settings").upsert({ key: "maps", value: maps, updated_at: new Date().toISOString() }));
    },
    async saveWallets() {
        this.saveLocal();
        await this.write(sb => sb.from("settings").upsert({ key: "wallets", value: this.wallets, updated_at: new Date().toISOString() }));
    },
    async saveBank() {
        this.saveLocal();
        await this.write(sb => sb.from("settings").upsert({ key: "bank", value: this.bank, updated_at: new Date().toISOString() }));
    },
    async saveCommunity() {
        if (this.sandbox) return;
        this.saveLocal();
        await this.write(sb => sb.from("settings").upsert({ key: "community", value: this.community, updated_at: new Date().toISOString() }));
    },
    // 🪪 영주권 · 📼 VHS (settings rows, same as the other keys)
    async saveKey(key) {
        if (this.sandbox) return;
        this.saveLocal();
        await this.write(sb => sb.from("settings").upsert({ key, value: this[key], updated_at: new Date().toISOString() }));
    },
    async saveStash() {
        if (this.sandbox) return;
        this.saveLocal();
        await this.write(sb => sb.from("settings").upsert({ key: "stash", value: this.stash, updated_at: new Date().toISOString() }));
    },
    saveHighlights() {
        if (this.sandbox) return;
        this.saveLocal();
        clearTimeout(this._hlTimer);
        this._hlTimer = setTimeout(() => this.write(sb => sb.from("settings").upsert({ key: "highlights", value: this.highlights, updated_at: new Date().toISOString() })), 1500);
    },
    async saveLotto() {
        if (this.sandbox) return;
        this.saveLocal();
        await this.write(sb => sb.from("settings").upsert({ key: "lotto", value: this.lotto, updated_at: new Date().toISOString() }));
    },
    async saveEmokeep() {
        if (this.sandbox) return;
        this.saveLocal();
        clearTimeout(this._keepTimer);
        this._keepTimer = setTimeout(() => this.write(sb => sb.from("settings").upsert({ key: "emokeep", value: this.emokeep, updated_at: new Date().toISOString() })), 1500);
    },
    async saveEmodex() {
        this.saveLocal();
        clearTimeout(this._dexTimer);
        this._dexTimer = setTimeout(() => this.write(sb => sb.from("settings").upsert({ key: "emodex", value: this.emodex, updated_at: new Date().toISOString() })), 1500);
    },
    // 🐾 EmoMonster catalog: cached in this browser, re-downloaded only when the cloud copy is newer
    async loadEmomon() {
        if (this.emomon) return this.emomon;
        let cache = null;
        try { cache = JSON.parse(localStorage.getItem(LS + ".emomon") || "null"); } catch { }
        if (this.cloud && sb) {
            try {
                const { data: head } = await sb.from("settings").select("updated_at").eq("key", "emomon").maybeSingle();
                if (head && (!cache || cache.updated_at !== head.updated_at)) {
                    const { data } = await sb.from("settings").select("value,updated_at").eq("key", "emomon").maybeSingle();
                    if (data?.value) { cache = { ...data.value, updated_at: data.updated_at }; try { localStorage.setItem(LS + ".emomon", JSON.stringify(cache)); } catch (e) { console.warn(e); } }
                }
            } catch (e) { console.warn("emomon load", e); }
        }
        this.emomon = cache;
        return cache;
    },
    async saveEmomon(value) {
        const updated_at = new Date().toISOString();
        this.emomon = { ...value, updated_at };
        try { localStorage.setItem(LS + ".emomon", JSON.stringify(this.emomon)); } catch (e) { console.warn(e); }
        await this.write(sb => sb.from("settings").upsert({ key: "emomon", value, updated_at }));
        return this.emomon;
    },
    // the same Supabase project, public schema (EmoMonster tables) — needs the admin sign-in
    publicClient() { return sb ? sb.schema("public") : null; },
    async logout() { await sb?.auth.signOut(); this.user = null; },

    // ------------------------------------------------------------ players
    player(id) { return this.allPlayers.find(p => p.id === +id); },
    setPlayers(list) {
        this.allPlayers = [...list].sort((a, b) => a.id - b.id).map(p => { const img = playerImage(p); return img === p.profile_image ? p : { ...p, profile_image: img }; });
        // 🧑‍💼 전담자 is no longer stored on the player: it is drawn (D / J) when the player joins a season
        // (season.handlers) and only exists while that season runs — p.handler reads it live.
        for (const p of this.allPlayers) Object.defineProperty(p, "handler", { get() { const s = Store.season; return s && s.status !== "done" && s.handlers?.[this.id] || ""; }, set() {}, enumerable: true, configurable: true });
        this.players = this.allPlayers.filter(p => p.is_active !== false);
    },
    // a season started before 전담자 became per-season: draw D / J for its roster once (5 + 5 per gender)
    fillHandlers() {
        const s = this.season;
        if (!s || s.status === "done" || !s.roster?.length || !this.allPlayers?.length) return;
        s.handlers ||= {};
        const miss = s.roster.filter(id => !s.handlers[id]);
        if (!miss.length) return;
        const g = id => String(this.player(id)?.gender || "").trim().toLowerCase() === "female" ? "F" : "M";
        for (const sex of ["M", "F"]) {
            const ids = miss.filter(id => g(id) === sex).sort(() => Math.random() - 0.5);
            const cnt = k => s.roster.filter(id => s.handlers[id] === k && g(id) === sex).length;
            for (const id of ids) { const d = cnt("DYLAN"), j = cnt("JAMES"); s.handlers[id] = d < j ? "DYLAN" : j < d ? "JAMES" : Math.random() < 0.5 ? "DYLAN" : "JAMES"; }
        }
    },
    nextPlayerId() { return Math.max(0, ...this.allPlayers.map(p => p.id)) + 1; },
    // Admin: create or update a player (cloud: insert / update; local: kept in this browser)
    // 👥 several admins adding players at the same time: a NEW player never reuses an id another admin already
    // took — the id is checked against the server right before the insert, and an insert that still collides
    // (somebody saved in the same second) simply takes the next free id. Existing players are updated by id only.
    async savePlayer(p, { isNew = false } = {}) {
        const rec = { ...p, id: +p.id };
        const cols = ["id", "login_id", "name_ko", "player_name", "profile_image", "country", "school", "job", "ethnicity", "age_group", "gender", "preference", "handler", "is_active"];
        const rowOf = r => Object.fromEntries(cols.map(c => [c, c === "handler" ? null : r[c] ?? (c === "is_active" ? true : null)]));
        if (this.cloud && isNew) {
            if (!this.user) { toast("관리자 로그인이 필요합니다", "warn"); return false; }
            await this.refreshPlayers({ newOnly: true }); // other admins' new players first (so the list and the next id are current)
            let lastErr = null;
            for (let tries = 0; tries < 8; tries++) {
                const { data: top, error: e1 } = await sb.from("players").select("id").order("id", { ascending: false }).limit(1);
                if (e1) { lastErr = e1; break; }
                rec.id = Math.max(top?.[0]?.id || 0, ...this.allPlayers.map(x => x.id), 0) + 1 + tries;
                const { error } = await sb.from("players").insert(rowOf(rec));
                if (!error) { lastErr = null; break; }
                lastErr = error;
                if (error.code !== "23505") break; // only an id clash is retried
            }
            if (lastErr) { console.error(lastErr); toast("저장 실패: " + (lastErr.message || lastErr), "error"); return false; }
            this.io.writes++;
            this.allPlayers.push(rec);
            this.setPlayers(this.allPlayers);
            this.saveLocal();
            return rec.id;
        }
        if (!this.cloud && isNew) rec.id = this.nextPlayerId(); // local mode: one browser, the next free id
        const i = this.allPlayers.findIndex(x => x.id === rec.id);
        if (i >= 0) this.allPlayers[i] = { ...this.allPlayers[i], ...rec }; else this.allPlayers.push(rec);
        this.setPlayers(this.allPlayers);
        if (this.cloud) {
            const { id, ...row } = rowOf(rec);
            await this.write(sb => sb.from("players").update(row).eq("id", id));
            if (!this.user) return false;
        } else {
            this.playerEdits[rec.id] = rec;
        }
        this.saveLocal();
        return rec.id;
    },
    // 🎲 전담자 랜덤 지정: every player gets DYLAN or JAMES at random — balanced inside each gender
    // (and each country), so a season can always draw 10 + 10 with 5 men + 5 women per handler.
    async randomizeHandlers() {
        const g = p => String(p.gender || "").trim().toLowerCase() === "female" ? "F" : "M";
        const groups = {};
        for (const p of this.allPlayers) (groups[`${g(p)}|${String(p.country || "").toLowerCase()}`] ||= []).push(p);
        const next = {};
        let flip = Math.random() < 0.5;
        for (const list of Object.values(groups)) {
            const sh = [...list].sort(() => Math.random() - 0.5);
            sh.forEach((p, i) => { next[p.id] = (i % 2 === 0) === flip ? "DYLAN" : "JAMES"; });
            if (sh.length % 2) flip = !flip; // odd groups alternate which handler gets the extra one
        }
        this.allPlayers = this.allPlayers.map(p => ({ ...p, handler: next[p.id] || p.handler }));
        this.setPlayers(this.allPlayers);
        if (this.cloud) {
            if (!this.user) { toast("관리자 로그인이 필요합니다", "warn"); return false; }
            const rows = Object.entries(next).map(([id, handler]) => ({ id: +id, handler }));
            for (let i = 0; i < rows.length; i += 200) {
                await this.write(sb => sb.from("players").upsert(rows.slice(i, i + 200), { onConflict: "id" }));
            }
        } else for (const p of this.allPlayers) this.playerEdits[p.id] = { ...(this.playerEdits[p.id] || {}), handler: p.handler };
        this.saveLocal();
        return true;
    },
    // 🔄 reload the player list from the server (players added / edited by another admin show up)
    //   newOnly: only players this browser doesn't have yet (ids + names first, then the full rows of the new ones) —
    //   the whole table is ~6 MB of pictures, so adding a player no longer downloads everything (twice)
    // 🖼️ background check of the cached pictures (another admin may have changed some): changed ones are
    // swapped in and the page is redrawn (main.js skips the redraw while a game or an admin page is open)
    async checkPlayerImages(rows) {
        if (!sb) return;
        const list = this.allPlayers;
        try {
            const { data, error } = await sb.from("players").select("id,profile_image");
            if (error) throw error;
            const fresh = imgMap(data);
            idbSet(IMG_KEY, fresh);
            const changed = rows.filter(p => p.id in fresh && fresh[p.id] !== p.profile_image);
            if (!changed.length || this.allPlayers !== list) return; // nothing new · or the list was already reloaded / edited
            const byId = new Map(this.allPlayers.map(p => [p.id, p]));
            for (const p of changed) { const cur = byId.get(p.id); if (cur) byId.set(p.id, { ...cur, profile_image: fresh[p.id] }); }
            this.setPlayers([...byId.values()]);
            document.dispatchEvent(new Event("players-updated"));
        } catch (e) { console.warn(e); }
    },
    async refreshPlayers({ newOnly = false } = {}) {
        if (!this.cloud || !sb) return false;
        if (newOnly && this.allPlayers?.length) try {
            const { data: ids, error: e1 } = await sb.from("players").select("id");
            if (e1) throw e1;
            const have = new Set(this.allPlayers.map(p => p.id));
            const miss = (ids || []).map(r => r.id).filter(id => !have.has(id));
            if (!miss.length) return true;
            const { data, error } = await sb.from("players").select("*").in("id", miss);
            if (error) throw error;
            this.setPlayers([...this.allPlayers, ...(data || [])]);
            for (const p of data || []) this.decor[p.id] ||= { frame: p.frame, effect: p.profile_effect, ownedFrames: p.owned_frames || [], ownedEffects: p.owned_effects || [] };
            return true;
        } catch (e) { console.warn(e); return false; }
        try {
            const { data, error } = await sb.from("players").select("*");
            if (error) throw error;
            if (data?.length) idbSet(IMG_KEY, imgMap(data));
            if (data?.length) { this.setPlayers(data); for (const p of data) this.decor[p.id] ||= { frame: p.frame, effect: p.profile_effect, ownedFrames: p.owned_frames || [], ownedEffects: p.owned_effects || [] }; }
            return true;
        } catch (e) { console.warn(e); return false; }
    },
    getDecor(pid) { return this.decor[pid] || (this.decor[pid] = { frame: null, effect: null, ownedFrames: [], ownedEffects: [] }); },
    setDecor(pid, patch) {
        const d = Object.assign(this.getDecor(pid), patch);
        this.saveLocal();
        this.write(s => s.from("players").update({ frame: d.frame, profile_effect: d.effect, owned_frames: d.ownedFrames, owned_effects: d.ownedEffects }).eq("id", pid));
    },
    record(pid) {
        const rs = this.results.filter(r => r.playerId === pid);
        if (!rs.length) return { seasons: 0, avg: null, wins: 0 };
        return { seasons: rs.length, avg: rs.reduce((s, r) => s + r.rank, 0) / rs.length, wins: rs.filter(r => r.rank === 1).length };
    },

    // ------------------------------------------------------------ season
    beforeSave: [], // hooks run before every season save (game/revival.js: 패자부활전 inventory bookkeeping)
    saveSeason(immediate = false) {
        for (const f of this.beforeSave) try { f(); } catch (e) { console.error(e); }
        this.saveLocal();
        clearTimeout(this._saveTimer);
        const go = () => this.pushSeason();
        if (immediate) return go();
        this._saveTimer = setTimeout(go, 1500);
    },
    async pushSeason() {
        const s = this.season;
        if (!s || !this.cloud || !this.user) return;
        const row = { number: s.number, status: s.status, state: { ...s, dbId: undefined }, started_at: s.startedAt, ended_at: s.endedAt || null, winner_id: s.winnerId ?? null };
        if (s.dbId) await this.write(sb => sb.from("seasons").update(row).eq("id", s.dbId));
        else {
            const data = await this.write(sb => sb.from("seasons").insert(row).select("id").single());
            if (data?.id) { s.dbId = data.id; this.saveLocal(); }
        }
    },
    async finishSeason(season, ranks, champSnapshot) {
        this.seasonCount = Math.max(this.seasonCount, season.number);
        for (const [pid, rank] of Object.entries(ranks)) this.results.push({ season: season.number, playerId: +pid, rank });
        this.hall.unshift({ season: season.number, playerId: season.winnerId, snapshot: champSnapshot, at: new Date().toISOString() });
        this.archive = [...(this.archive || []).filter(d => d.number !== season.number), this.seasonDigest(season)];
        this.addGameplays(season);
        this.saveSeason(true);
        await this.write(sb => sb.from("season_results").insert(Object.entries(ranks).map(([pid, rank]) => ({ season_number: season.number, player_id: +pid, rank }))));
        await this.write(sb => sb.from("hall_of_fame").insert({ season_number: season.number, player_id: season.winnerId, snapshot: champSnapshot }));
    },
    // 🔥 a finished season's per-game plays join the all-time counts (once per season number)
    addGameplays(season) {
        const g = (this.gameplays ||= { counts: {}, seasons: [] });
        if (!season?.gamePlays || g.seasons.includes(season.number)) return;
        for (const [k, n] of Object.entries(season.gamePlays)) g.counts[k] = (g.counts[k] || 0) + n;
        g.seasons.push(season.number);
        this.write(sb => sb.from("settings").upsert({ key: "gameplays", value: g, updated_at: new Date().toISOString() }));
    },
    endSeasonLocal() { this.season = null; this.saveLocal(); },

    // ------------------------------------------------------------ season summaries (📜 시즌 요약)
    // the slim part of a season state the summary page needs
    seasonDigest(s) {
        if (!s) return null;
        const ps = {};
        for (const pid of s.roster || []) { const p = s.ps?.[pid] || {}; ps[pid] = { rank: p.rank ?? null, out: !!p.out, outRound: p.outRound ?? null, money: p.money || 0, points: p.points || 0, hp: p.hp ?? 0 }; }
        return { number: s.number, status: s.status, special: s.special ? { id: s.special.id, name: s.special.name } : null, winnerId: s.winnerId ?? null, round: s.round || 0, roster: [...(s.roster || [])], history: structuredClone(s.history || []), ps };
    },
    // every season (newest first). Cloud: read from the seasons table; local: the archive + the current one.
    async seasonDigests() {
        if (this.cloud && sb) {
            const { data, error } = await sb.from("seasons")
                .select("number,status,winner_id,round:state->round,special:state->special,roster:state->roster,history:state->history,ps:state->ps")
                .order("number", { ascending: false });
            if (error) throw error;
            return (data || []).map(r => this.seasonDigest({ number: r.number, status: r.status, special: r.special, winnerId: r.winner_id, round: r.round, roster: r.roster, history: r.history, ps: r.ps }));
        }
        const list = [...this.archive];
        if (this.season && !list.some(d => d.number === this.season.number)) list.push(this.seasonDigest(this.season));
        return list.sort((a, b) => b.number - a.number);
    },

    // ------------------------------------------------------------ jackpots
    ensureJackpots() {
        for (const g of SLOTS) {
            if (!g.jp) continue;
            const row = this.jackpots[g.id] ||= {};
            for (const [tier, j] of Object.entries(g.jp)) if (!j.x && !j.sum && row[tier] == null) row[tier] = j.seed;
        }
    },
    pool(gameId) { return this.jackpots[gameId] || {}; },
    contribute(cfg, bet) {
        if (!cfg.jp || cfg.progressive === false) return;
        const row = this.jackpots[cfg.id] ||= {};
        for (const [tier, j] of Object.entries(cfg.jp)) {
            if (j.x || !j.rate) continue;
            row[tier] = Math.min(j.cap || Infinity, (row[tier] ?? j.seed) + bet * j.rate);
        }
        this._jpQueue[cfg.id] = (this._jpQueue[cfg.id] || 0) + bet;
        clearTimeout(this._jpTimer);
        this._jpTimer = setTimeout(() => this.flushJackpots(), 2500);
        this.saveLocal();
    },
    async flushJackpots() {
        const q = this._jpQueue; this._jpQueue = {};
        for (const [game, bets] of Object.entries(q)) await this.write(sb => sb.rpc("jp_contribute", { p_game: game, p_bet: bets }));
    },
    async hitJackpot(cfg, tier, pid, amount) {
        const j = cfg.jp?.[tier];
        if (!j || j.x) return;
        if (j.sum) { // MEGA = every progressive tier at once → reset them all
            for (const [t, jj] of Object.entries(cfg.jp)) if (!jj.x && !jj.sum) await this.hitJackpot(cfg, t, pid, this.jackpots[cfg.id]?.[t] ?? jj.seed);
            return;
        }
        await this.flushJackpots();
        this.jackpots[cfg.id][tier] = j.seed;
        this.saveLocal();
        await this.write(sb => sb.rpc("jp_hit", { p_game: cfg.id, p_tier: tier, p_winner: pid ?? null, p_amount: amount, p_season: this.season?.number ?? null }));
    },

    // MAXI+ jackpot winners (slots) and top-prize winners (casino).
    // Progressive slot tiers are already logged server-side by jp_hit.
    // 🎬 Gamblers Highlight: a highlight moment is kept as a tiny replay record (not a video) — screens/highlight.js plays it back
    recordHighlight(kind, data = {}) {
        const s = this.season;
        if (this.sandbox || s?.sandbox || s?.testSeason) return;
        const hl = (this.highlights ||= { list: [], seen: {} });
        hl.list ||= [];
        hl.list.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, season: s?.number ?? null, round: s?.round ?? null, at: new Date().toISOString(), ...data });
        this.trimKind(hl, kind);
        this.trimHighlights(hl);
        this.saveHighlights();
    },
    // 🎬 every category keeps at most HL_PER_KIND replays. When a new one overflows it, 5 random older ones of that
    // category (whatever their date) are dropped at once — so the next new ones come in without another drop.
    HL_PER_KIND: 50, HL_SWAP: 5,
    trimKind(hl = this.highlights, kind) {
        const L = hl.list, mine = L.filter(x => x.kind === kind);
        if (mine.length <= this.HL_PER_KIND) return;
        const old = mine.slice(1); // never the record just added
        for (let i = 0; i < this.HL_SWAP && old.length; i++) {
            const x = old.splice(Math.floor(Math.random() * old.length), 1)[0];
            L.splice(L.indexOf(x), 1);
        }
    },
    // keep ≤ 400 replays: drop the most-played first (ties → random); when none of the rest were played, drop a random one.
    // The record just added is never the one dropped.
    trimHighlights(hl = this.highlights, max = 400) {
        const L = hl.list;
        while (L.length > max) {
            const pool = L.slice(1), top = Math.max(0, ...pool.map(x => x.plays || 0));
            const cand = pool.filter(x => (x.plays || 0) === top);
            L.splice(L.indexOf(cand[Math.floor(Math.random() * cand.length)]), 1);
        }
    },
    logJackpot(game, tier, pid, amount, { serverLogged = false } = {}) {
        if (pid == null) return; // practice room
        const season = this.season?.number ?? null;
        if (["MAXI", "EGG", "MONKEY", "MAJOR", "GRAND", "MEGA", "VAULT"].includes(tier)) this.recordHighlight("jackpot", { pid, game, tier, amount });
        this.jpLog.push({ game, tier, playerId: pid, amount, season, at: new Date().toISOString() });
        this.saveLocal();
        if (!serverLogged) this.write(sb => sb.from("jackpot_hits").insert({ game, tier, player_id: pid, amount, season_number: season }));
    },
    jackpotWinners(game) {
        const R = { MAXI: 3, EGG: 3, MONKEY: 3.5, MAJOR: 4, GRAND: 5, MEGA: 6, VAULT: 6, JACKPOT: 3 };
        return this.jpLog.filter(r => r.game === game && r.playerId != null && (R[r.tier] || 0) >= 3).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    },

    // ------------------------------------------------------------ admin catalog overrides
    async saveCatalog(catalog) {
        this.catalog = catalog;
        this.saveLocal();
        await this.write(sb => sb.from("settings").upsert({ key: "catalog", value: catalog, updated_at: new Date().toISOString() }));
    },

    async saveGames(games) {
        this.games = games;
        this.saveLocal();
        await this.write(sb => sb.from("settings").upsert({ key: "games", value: games, updated_at: new Date().toISOString() }));
    },

    // ------------------------------------------------------------ machine meters
    machine(id) { return this.machines[id] || {}; },
    setMachine(id, state, pid) {
        this.machines[id] = state;
        this.saveLocal();
        clearTimeout(this._mTimer?.[id]);
        (this._mTimer ||= {})[id] = setTimeout(() => this.write(sb => sb.from("slot_machine_state").upsert({ game: id, state, last_player: pid ?? null, updated_at: new Date().toISOString() })), 2000);
    },

    resetAllLocal() { localStorage.removeItem(LS); location.reload(); }
};
