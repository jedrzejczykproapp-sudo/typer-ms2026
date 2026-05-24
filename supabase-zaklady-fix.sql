-- ================================================================
-- FIX: Drop circular RLS policies and recreate without circular refs
-- Run this in Supabase SQL Editor AFTER supabase-zaklady.sql
-- ================================================================

-- Drop potentially circular function and policies
DROP POLICY IF EXISTS "zaklady_select" ON zaklady;
DROP POLICY IF EXISTS "zaklady_insert" ON zaklady;
DROP POLICY IF EXISTS "zaklady_update" ON zaklady;
DROP POLICY IF EXISTS "zaklad_fixtures_select" ON zaklad_fixtures;
DROP POLICY IF EXISTS "zaklad_fixtures_insert" ON zaklad_fixtures;
DROP POLICY IF EXISTS "zaklad_fixtures_update" ON zaklad_fixtures;
DROP POLICY IF EXISTS "zaklad_members_select" ON zaklad_members;
DROP POLICY IF EXISTS "zaklad_members_insert" ON zaklad_members;
DROP POLICY IF EXISTS "zaklad_predictions_select" ON zaklad_predictions;
DROP POLICY IF EXISTS "zaklad_predictions_insert" ON zaklad_predictions;
DROP POLICY IF EXISTS "zaklad_predictions_update" ON zaklad_predictions;
DROP FUNCTION IF EXISTS is_zaklad_member(UUID);

-- ── zaklady ───────────────────────────────────────────────────────────────────
-- creator can see + anyone who is in zaklad_members
-- subquery on zaklad_members filtered only by user_id (no back-ref to zaklady)
CREATE POLICY "zaklady_select" ON zaklady FOR SELECT USING (
    creator_id = auth.uid()
    OR id IN (
        SELECT zaklad_id FROM zaklad_members WHERE user_id = auth.uid()
    )
);
CREATE POLICY "zaklady_insert" ON zaklady FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "zaklady_update" ON zaklady FOR UPDATE USING (creator_id = auth.uid());

-- ── zaklad_members ────────────────────────────────────────────────────────────
-- KEY: policy does NOT reference zaklady (breaks circular ref)
-- Users can see all members of zakłady they're in (by their own membership row)
-- We allow: your own row OR any row where your user_id also has a row in same zaklad_id
CREATE POLICY "zaklad_members_select" ON zaklad_members FOR SELECT USING (
    user_id = auth.uid()
    OR zaklad_id IN (
        SELECT z.id FROM zaklady z WHERE z.creator_id = auth.uid()
    )
    OR zaklad_id IN (
        SELECT zm2.zaklad_id FROM zaklad_members zm2 WHERE zm2.user_id = auth.uid()
    )
);
CREATE POLICY "zaklad_members_insert" ON zaklad_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── SECURITY DEFINER helper (bypasses RLS — safe for server-side checks) ──────
CREATE OR REPLACE FUNCTION is_zaklad_member_safe(p_zaklad_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT
        EXISTS(SELECT 1 FROM zaklady WHERE id = p_zaklad_id AND creator_id = auth.uid())
        OR
        EXISTS(SELECT 1 FROM zaklad_members WHERE zaklad_id = p_zaklad_id AND user_id = auth.uid())
$$;

-- ── zaklad_fixtures ───────────────────────────────────────────────────────────
CREATE POLICY "zaklad_fixtures_select" ON zaklad_fixtures FOR SELECT
    USING (is_zaklad_member_safe(zaklad_id));
CREATE POLICY "zaklad_fixtures_insert" ON zaklad_fixtures FOR INSERT
    WITH CHECK (zaklad_id IN (SELECT id FROM zaklady WHERE creator_id = auth.uid()));
CREATE POLICY "zaklad_fixtures_update" ON zaklad_fixtures FOR UPDATE
    USING (zaklad_id IN (SELECT id FROM zaklady WHERE creator_id = auth.uid()));

-- ── zaklad_predictions ────────────────────────────────────────────────────────
CREATE POLICY "zaklad_predictions_select" ON zaklad_predictions FOR SELECT
    USING (is_zaklad_member_safe(zaklad_id));
CREATE POLICY "zaklad_predictions_insert" ON zaklad_predictions FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_zaklad_member_safe(zaklad_id));
CREATE POLICY "zaklad_predictions_update" ON zaklad_predictions FOR UPDATE
    USING (user_id = auth.uid());
