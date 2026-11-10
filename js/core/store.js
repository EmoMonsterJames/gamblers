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

const LS = "gamblers.v1";
let sb = null; // supabase client

function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } }

export const Store = {
    mode: "local",
    user: null,
    players: [],
    decor: {},       // pid -> { frame, effect, ownedFrames:[], ownedEffects:[] }
    hall: [],        // [{ season, playerId, snapshot, at }]
    results: [],     // [{ season, playerId, rank }]
    jackpots: {},    // game -> tier -> amount
    machines: {},    // game -> state
    season: null,    // current season object (see game/season.js)
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
        this.season = L.season || null;
        this.seasonCount = L.seasonCount || 0;
        this.players = SEED_PLAYERS.map(p => ({ ...p }));
        this.ensureJackpots();
        if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) {
            try {
                const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
                sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, { db: { schema: CONFIG.SUPABASE_SCHEMA } });
                const { data: sess } = await sb.auth.getSession();
                this.user = sess?.session?.user || null;
                sb.auth.onAuthStateChange((_e, s) => { this.user = s?.user || null; document.dispatchEvent(new Event("auth")); });
                await this.pull();
                this.mode = "cloud";
            } catch (e) {
                console.warn("Supabase unavailable, running locally", e);
                toast("Supabase 연결 실패 — 로컬 모드로 실행합니다", "warn");
            }
        }
    },

    async pull() {
        const q = async (t, sel = "*") => { const { data, error } = await sb.from(t).select(sel); if (error) throw error; return data; };
        const [players, hall, results, jps, machines, seasons] = await Promise.all([
            q("players"), q("hall_of_fame"), q("season_results"), q("slot_jackpots"), q("slot_machine_state"),
            sb.from("seasons").select("*").order("number", { ascending: false }).limit(1).then(r => { if (r.error) throw r.error; return r.data; })
        ]);
        if (players?.length) {
            this.players = players.filter(p => p.is_active !== false).sort((a, b) => a.id - b.id);
            for (const p of players) this.decor[p.id] = { frame: p.frame, effect: p.profile_effect, ownedFrames: p.owned_frames || [], ownedEffects: p.owned_effects || [] };
        }
        this.hall = hall.map(r => ({ season: r.season_number, playerId: r.player_id, snapshot: r.snapshot, at: r.crowned_at })).sort((a, b) => b.season - a.season);
        this.results = results.map(r => ({ season: r.season_number, playerId: r.player_id, rank: r.rank }));
        for (const r of jps) { (this.jackpots[r.game] ||= {})[r.tier] = +r.amount; }
        for (const r of machines) this.machines[r.game] = r.state || {};
        const s = seasons?.[0];
        this.seasonCount = s?.number || 0;
        this.season = s && s.status !== "done" ? { ...s.state, dbId: s.id } : null;
        this.ensureJackpots();
        this.saveLocal();
    },

    saveLocal() {
        try {
            localStorage.setItem(LS, JSON.stringify({ decor: this.decor, hall: this.hall, results: this.results, jackpots: this.jackpots, machines: this.machines, season: this.season, seasonCount: this.seasonCount }));
        } catch (e) { console.warn(e); }
    },

    async write(fn) {
        if (!this.cloud) return;
        if (!this.user) { if (!this._warned) { toast("관리자 로그인 전이라 클라우드에 저장되지 않습니다 (이 브라우저에만 저장)", "warn", 4000); this._warned = true; } return; }
        try { const r = await fn(sb); if (r?.error) throw r.error; return r?.data; }
        catch (e) { console.error(e); toast("저장 실패: " + (e.message || e), "error"); }
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
            const jrows = [];
            for (const g of SLOTS) for (const [tier, j] of Object.entries(g.jp || {})) {
                if (j.x) continue;
                jrows.push({ game: g.id, tier, amount: this.jackpots[g.id]?.[tier] ?? j.seed, seed: j.seed, rate: g.progressive === false ? 0 : (j.rate || 0), cap: j.cap ?? null });
            }
            const { error } = await sb.from("slot_jackpots").upsert(jrows, { onConflict: "game,tier", ignoreDuplicates: true });
            if (error) throw error;
        } catch (e) { console.error(e); toast("초기 데이터 업로드 실패: " + (e.message || e), "error"); }
    },
    async logout() { await sb?.auth.signOut(); this.user = null; },

    // ------------------------------------------------------------ players
    player(id) { return this.players.find(p => p.id === +id); },
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
    saveSeason(immediate = false) {
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
        this.saveSeason(true);
        await this.write(sb => sb.from("season_results").insert(Object.entries(ranks).map(([pid, rank]) => ({ season_number: season.number, player_id: +pid, rank }))));
        await this.write(sb => sb.from("hall_of_fame").insert({ season_number: season.number, player_id: season.winnerId, snapshot: champSnapshot }));
    },
    endSeasonLocal() { this.season = null; this.saveLocal(); },

    // ------------------------------------------------------------ jackpots
    ensureJackpots() {
        for (const g of SLOTS) {
            if (!g.jp) continue;
            const row = this.jackpots[g.id] ||= {};
            for (const [tier, j] of Object.entries(g.jp)) if (!j.x && row[tier] == null) row[tier] = j.seed;
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
        await this.flushJackpots();
        this.jackpots[cfg.id][tier] = j.seed;
        this.saveLocal();
        await this.write(sb => sb.rpc("jp_hit", { p_game: cfg.id, p_tier: tier, p_winner: pid, p_amount: amount }));
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
