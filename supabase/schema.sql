-- =====================================================================
-- Gamblers — Supabase schema (separate `gamblers` schema).
-- Anyone can READ (the site is public); only users listed in
-- gamblers.admins can WRITE.
-- After applying: Dashboard → Project Settings → API → Exposed schemas
-- → add `gamblers`.
-- =====================================================================
create schema if not exists gamblers;

create table if not exists gamblers.admins (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists gamblers.players (
    id integer primary key,
    login_id text,
    name_ko text,
    player_name text,
    profile_image text,
    country text,
    school text,
    job text,
    ethnicity text,
    age_group text,
    gender text,
    preference text,
    handler text,
    frame text,
    profile_effect text,
    owned_frames text[] not null default '{}',
    owned_effects text[] not null default '{}',
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists gamblers.seasons (
    id bigint generated always as identity primary key,
    number integer not null unique,
    status text not null,
    state jsonb not null default '{}',
    started_at timestamptz,
    ended_at timestamptz,
    winner_id integer references gamblers.players (id)
);

create table if not exists gamblers.season_results (
    id bigint generated always as identity primary key,
    season_number integer not null,
    player_id integer not null references gamblers.players (id),
    rank integer not null,
    unique (season_number, player_id)
);
create index if not exists season_results_player_idx on gamblers.season_results (player_id);

create table if not exists gamblers.hall_of_fame (
    id bigint generated always as identity primary key,
    season_number integer not null unique,
    player_id integer not null references gamblers.players (id),
    snapshot jsonb not null default '{}',
    crowned_at timestamptz not null default now()
);
create index if not exists hall_of_fame_player_idx on gamblers.hall_of_fame (player_id);

-- progressive jackpots persist across seasons
create table if not exists gamblers.slot_jackpots (
    game text not null,
    tier text not null,
    amount numeric not null,
    seed numeric not null,
    rate numeric not null default 0,
    cap numeric,
    updated_at timestamptz not null default now(),
    primary key (game, tier)
);

create table if not exists gamblers.jackpot_hits (
    id bigint generated always as identity primary key,
    game text not null,
    tier text not null,
    player_id integer references gamblers.players (id),
    amount numeric not null,
    hit_at timestamptz not null default now()
);
create index if not exists jackpot_hits_player_idx on gamblers.jackpot_hits (player_id);

-- persistent machine meters (piggy bank, money bag, fuse, ...)
create table if not exists gamblers.slot_machine_state (
    game text primary key,
    state jsonb not null default '{}',
    last_player integer references gamblers.players (id),
    updated_at timestamptz not null default now()
);
create index if not exists slot_machine_state_player_idx on gamblers.slot_machine_state (last_player);
create index if not exists seasons_winner_idx on gamblers.seasons (winner_id);

-- ---------------------------------------------------------------- functions
create or replace function gamblers.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from gamblers.admins a where a.user_id = (select auth.uid()));
$$;

create or replace function gamblers.jp_contribute(p_game text, p_bet numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
    if not gamblers.is_admin() then raise exception 'admin only'; end if;
    update gamblers.slot_jackpots
       set amount = least(coalesce(cap, 'infinity'::numeric), amount + p_bet * rate),
           updated_at = now()
     where game = p_game and rate > 0;
end $$;

create or replace function gamblers.jp_hit(p_game text, p_tier text, p_winner integer, p_amount numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
    if not gamblers.is_admin() then raise exception 'admin only'; end if;
    insert into gamblers.jackpot_hits (game, tier, player_id, amount) values (p_game, p_tier, p_winner, p_amount);
    update gamblers.slot_jackpots set amount = seed, updated_at = now() where game = p_game and tier = p_tier;
end $$;

revoke all on function gamblers.jp_contribute(text, numeric) from public, anon;
revoke all on function gamblers.jp_hit(text, text, integer, numeric) from public, anon;
grant execute on function gamblers.is_admin() to anon, authenticated;
grant execute on function gamblers.jp_contribute(text, numeric) to authenticated;
grant execute on function gamblers.jp_hit(text, text, integer, numeric) to authenticated;

-- ---------------------------------------------------------------- RLS
grant usage on schema gamblers to anon, authenticated;
grant select on all tables in schema gamblers to anon, authenticated;
grant insert, update, delete on all tables in schema gamblers to authenticated;

do $$
declare t text;
begin
    foreach t in array array['players','seasons','season_results','hall_of_fame','slot_jackpots','jackpot_hits','slot_machine_state'] loop
        execute format('alter table gamblers.%I enable row level security', t);
        execute format('drop policy if exists "%s read" on gamblers.%I', t, t);
        execute format('create policy "%s read" on gamblers.%I for select to anon, authenticated using (true)', t, t);
        execute format('drop policy if exists "%s admin insert" on gamblers.%I', t, t);
        execute format('create policy "%s admin insert" on gamblers.%I for insert to authenticated with check ((select gamblers.is_admin()))', t, t);
        execute format('drop policy if exists "%s admin update" on gamblers.%I', t, t);
        execute format('create policy "%s admin update" on gamblers.%I for update to authenticated using ((select gamblers.is_admin())) with check ((select gamblers.is_admin()))', t, t);
        execute format('drop policy if exists "%s admin delete" on gamblers.%I', t, t);
        execute format('create policy "%s admin delete" on gamblers.%I for delete to authenticated using ((select gamblers.is_admin()))', t, t);
    end loop;
end $$;

-- admins table: a user may only see whether they themselves are admin; no client writes
alter table gamblers.admins enable row level security;
drop policy if exists "admins self read" on gamblers.admins;
create policy "admins self read" on gamblers.admins for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on gamblers.admins from anon, authenticated;

-- ---------------------------------------------------------------- v2
alter table gamblers.jackpot_hits add column if not exists season_number integer;
create index if not exists jackpot_hits_game_idx on gamblers.jackpot_hits (game);

create or replace function gamblers.jp_hit(p_game text, p_tier text, p_winner integer, p_amount numeric, p_season integer default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
    if not gamblers.is_admin() then raise exception 'admin only'; end if;
    insert into gamblers.jackpot_hits (game, tier, player_id, amount, season_number) values (p_game, p_tier, p_winner, p_amount, p_season);
    update gamblers.slot_jackpots set amount = seed, updated_at = now() where game = p_game and tier = p_tier;
end $$;
drop function if exists gamblers.jp_hit(text, text, integer, numeric);
revoke all on function gamblers.jp_hit(text, text, integer, numeric, integer) from public, anon;
grant execute on function gamblers.jp_hit(text, text, integer, numeric, integer) to authenticated;

-- admin-editable game settings (catalog / shop overrides)
create table if not exists gamblers.settings (
    key text primary key,
    value jsonb not null default '{}',
    updated_at timestamptz not null default now()
);
alter table gamblers.settings enable row level security;
grant select on gamblers.settings to anon, authenticated;
grant insert, update, delete on gamblers.settings to authenticated;
drop policy if exists "settings read" on gamblers.settings;
create policy "settings read" on gamblers.settings for select to anon, authenticated using (true);
drop policy if exists "settings admin insert" on gamblers.settings;
create policy "settings admin insert" on gamblers.settings for insert to authenticated with check ((select gamblers.is_admin()));
drop policy if exists "settings admin update" on gamblers.settings;
create policy "settings admin update" on gamblers.settings for update to authenticated using ((select gamblers.is_admin())) with check ((select gamblers.is_admin()));
drop policy if exists "settings admin delete" on gamblers.settings;
create policy "settings admin delete" on gamblers.settings for delete to authenticated using ((select gamblers.is_admin()));
