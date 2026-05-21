-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    avatar_url text,
    created_at timestamptz default now() not null
);

-- Groups
create table if not exists groups (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    invite_code text unique not null default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz default now() not null
);

-- Group members
create table if not exists group_members (
    id uuid primary key default gen_random_uuid(),
    group_id uuid references groups(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    joined_at timestamptz default now() not null,
    unique(group_id, user_id)
);

-- Matches
create table if not exists matches (
    id uuid primary key default gen_random_uuid(),
    home_team text not null,
    away_team text not null,
    home_flag text not null,
    away_flag text not null,
    match_date timestamptz not null,
    stage text not null check (stage in ('group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final')),
    group_name text,
    matchday integer,
    venue text,
    home_score integer,
    away_score integer,
    status text not null default 'upcoming' check (status in ('upcoming', 'live', 'finished'))
);

-- Predictions
create table if not exists predictions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    match_id uuid references matches(id) on delete cascade not null,
    group_id uuid references groups(id) on delete cascade not null,
    predicted_home integer not null check (predicted_home >= 0),
    predicted_away integer not null check (predicted_away >= 0),
    points integer,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    unique(user_id, match_id, group_id)
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
    insert into profiles (id, display_name)
    values (new.id, split_part(new.email, '@', 1));
    return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure handle_new_user();

-- Function to calculate points after match result
create or replace function calculate_prediction_points(
    p_predicted_home integer,
    p_predicted_away integer,
    p_actual_home integer,
    p_actual_away integer
) returns integer as $$
begin
    -- Exact score: 3 points
    if p_predicted_home = p_actual_home and p_predicted_away = p_actual_away then
        return 3;
    end if;
    -- Correct result (win/draw/loss): 1 point
    if sign(p_predicted_home - p_predicted_away) = sign(p_actual_home - p_actual_away) then
        return 1;
    end if;
    return 0;
end;
$$ language plpgsql immutable;

-- Function to update prediction points when a match result is set
create or replace function update_match_predictions()
returns trigger as $$
begin
    if new.status = 'finished' and new.home_score is not null and new.away_score is not null then
        update predictions
        set points = calculate_prediction_points(predicted_home, predicted_away, new.home_score, new.away_score)
        where match_id = new.id;
    end if;
    return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_match_finished
    after update on matches
    for each row execute procedure update_match_predictions();

-- Row Level Security
alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;

-- Profiles policies
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Groups policies
create policy "Authenticated users can view groups" on groups for select using (auth.uid() is not null);
create policy "Authenticated users can create groups" on groups for insert with check (auth.uid() = created_by);

-- Group members policies
create policy "Authenticated users can view members" on group_members for select using (auth.uid() is not null);
create policy "Users can join groups" on group_members for insert with check (auth.uid() = user_id);

-- Matches policies
create policy "Anyone can view matches" on matches for select using (true);

-- Predictions policies
create policy "Users can view all predictions in their groups" on predictions for select
    using (
        auth.uid() is not null and
        exists (
            select 1 from group_members
            where group_members.group_id = predictions.group_id
            and group_members.user_id = auth.uid()
        )
    );
create policy "Users can insert own predictions" on predictions for insert
    with check (auth.uid() = user_id);
create policy "Users can update own predictions" on predictions for update
    using (auth.uid() = user_id);
