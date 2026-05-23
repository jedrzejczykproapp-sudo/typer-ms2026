-- Match events (goals, cards)
create table if not exists match_events (
    id uuid default gen_random_uuid() primary key,
    match_id uuid references matches(id) on delete cascade not null,
    minute int not null,
    extra_minute int,
    event_type text not null check (event_type in ('goal','own_goal','penalty','yellow_card','red_card','yellow_red_card')),
    player_name text,
    team text not null check (team in ('home','away')),
    detail text,
    created_at timestamptz default now()
);

create index if not exists match_events_match_id_idx on match_events(match_id);
create index if not exists match_events_minute_idx on match_events(match_id, minute);

-- Match statistics (one row per match)
create table if not exists match_stats (
    match_id uuid references matches(id) on delete cascade primary key,
    home_possession int,
    away_possession int,
    home_shots int,
    away_shots int,
    home_shots_on_target int,
    away_shots_on_target int,
    home_corners int,
    away_corners int,
    home_fouls int,
    away_fouls int,
    updated_at timestamptz default now()
);

-- RLS: publicly readable, only service_role can write
alter table match_events enable row level security;
create policy "match_events_public_read" on match_events
    for select using (true);
create policy "match_events_service_write" on match_events
    for all using (auth.role() = 'service_role');

alter table match_stats enable row level security;
create policy "match_stats_public_read" on match_stats
    for select using (true);
create policy "match_stats_service_write" on match_stats
    for all using (auth.role() = 'service_role');
