// =====================================================================
// Gamblers — global settings.
// SUPABASE_URL / SUPABASE_KEY are public (publishable) values. Leave them
// empty to run fully offline (state is kept in this browser only).
// =====================================================================
export const CONFIG = {
    SUPABASE_URL: "https://doxdtjyhrbnaldtbnmnk.supabase.co",
    SUPABASE_KEY: "sb_publishable_Y4bd2iV6FwmRt4Zduc8GEg_2THg2siZ",
    SUPABASE_SCHEMA: "gamblers",

    SEASON_SIZE: 20,          // players picked per season
    FINALISTS: 2,             // players left for the final battle
    START_MONEY: 200000,      // gold each player starts a season with
    START_HP: 100,
    TURN_SECONDS: 600,        // 10 minutes per player turn
    EXTEND_SECONDS: 300,      // "+5 min" ticket
    MAX_WEAPONS: 6,
    CASINO_MAX_WIN: 300000,   // biggest single casino-game payout
    CASINO_POINT_CHANCE: 0.12, // chance a casino play also drops 1~10 points
    ROUND_CASINO_PLAYS: 5,    // casino games per player per round
    ROUND_SLOT_SPINS: 100,    // paid slot spins per player per round (free spins do not count)
    LOAN_MIN_ALIVE: 6,        // loans are closed once 5 or fewer players are alive
    LOAN_MAX_GOLD: 10000,     // only players holding this much gold or less may borrow
    SEASON_JOIN_BONUS: 200000 // extra gold every player gets once per season (on top of START_MONEY)
};
