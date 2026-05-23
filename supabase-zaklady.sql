-- ================================================================
-- Zakłady (bet slips created from top-league fixtures)
-- Run this in the Supabase SQL editor
-- ================================================================

CREATE TABLE IF NOT EXISTS zaklady (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    number      INT     GENERATED ALWAYS AS IDENTITY,
    creator_id  UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT    NOT NULL UNIQUE DEFAULT substr(md5(random()::text || gen_random_uuid()::text), 1, 8),
    status      TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zaklad_fixtures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zaklad_id       UUID NOT NULL REFERENCES zaklady(id) ON DELETE CASCADE,
    match_id        TEXT NOT NULL,
    league_id       TEXT,
    league_name     TEXT,
    league_flag     TEXT,
    match_date      TEXT,
    home_name       TEXT,
    home_badge      TEXT,
    home_position   INT,
    away_name       TEXT,
    away_badge      TEXT,
    away_position   INT,
    home_score      TEXT DEFAULT '',
    away_score      TEXT DEFAULT '',
    match_status    TEXT DEFAULT 'upcoming',
    odds_home       NUMERIC(5,2),
    odds_draw       NUMERIC(5,2),
    odds_away       NUMERIC(5,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zaklad_members (
    zaklad_id   UUID NOT NULL REFERENCES zaklady(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (zaklad_id, user_id)
);

CREATE TABLE IF NOT EXISTS zaklad_predictions (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    zaklad_id   UUID    NOT NULL REFERENCES zaklady(id) ON DELETE CASCADE,
    fixture_id  UUID    NOT NULL REFERENCES zaklad_fixtures(id) ON DELETE CASCADE,
    user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction  TEXT    CHECK (prediction IN ('1', 'X', '2')),
    points      INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(fixture_id, user_id)
);

-- Row Level Security
ALTER TABLE zaklady             ENABLE ROW LEVEL SECURITY;
ALTER TABLE zaklad_fixtures     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zaklad_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zaklad_predictions  ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member or creator of zakład?
CREATE OR REPLACE FUNCTION is_zaklad_member(p_zaklad_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM zaklady WHERE id = p_zaklad_id AND creator_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM zaklad_members WHERE zaklad_id = p_zaklad_id AND user_id = auth.uid()
    );
$$;

-- zaklady
CREATE POLICY "zaklady_select" ON zaklady FOR SELECT
    USING (creator_id = auth.uid() OR id IN (SELECT zaklad_id FROM zaklad_members WHERE user_id = auth.uid()));
CREATE POLICY "zaklady_insert" ON zaklady FOR INSERT
    WITH CHECK (creator_id = auth.uid());
CREATE POLICY "zaklady_update" ON zaklady FOR UPDATE
    USING (creator_id = auth.uid());

-- zaklad_fixtures
CREATE POLICY "zaklad_fixtures_select" ON zaklad_fixtures FOR SELECT
    USING (is_zaklad_member(zaklad_id));
CREATE POLICY "zaklad_fixtures_insert" ON zaklad_fixtures FOR INSERT
    WITH CHECK (zaklad_id IN (SELECT id FROM zaklady WHERE creator_id = auth.uid()));
CREATE POLICY "zaklad_fixtures_update" ON zaklad_fixtures FOR UPDATE
    USING (zaklad_id IN (SELECT id FROM zaklady WHERE creator_id = auth.uid()));

-- zaklad_members
CREATE POLICY "zaklad_members_select" ON zaklad_members FOR SELECT
    USING (is_zaklad_member(zaklad_id));
CREATE POLICY "zaklad_members_insert" ON zaklad_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- zaklad_predictions
CREATE POLICY "zaklad_predictions_select" ON zaklad_predictions FOR SELECT
    USING (is_zaklad_member(zaklad_id));
CREATE POLICY "zaklad_predictions_insert" ON zaklad_predictions FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY "zaklad_predictions_update" ON zaklad_predictions FOR UPDATE
    USING (user_id = auth.uid());
