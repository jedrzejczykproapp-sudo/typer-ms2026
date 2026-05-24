import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE = "https://apiv3.apifootball.com/";

/**
 * Debug: GET /api/debug/zaklad-fixture?zaklad_id=<zaklad_uuid>
 *   → lists all fixtures for that zakład with apifootball diagnosis
 * OR: GET /api/debug/zaklad-fixture?id=<fixture_uuid>
 *   → diagnoses a single fixture
 *
 * The zaklad_id is visible in the URL: /zaklady/<zaklad_id>
 */
export async function GET(req: NextRequest) {
    const zakladId = req.nextUrl.searchParams.get("zaklad_id");
    const fixtureId = req.nextUrl.searchParams.get("id");

    if (!zakladId && !fixtureId) {
        return NextResponse.json({ error: "pass ?zaklad_id=<uuid> (from /zaklady/<uuid> URL) or ?id=<fixture_uuid>" }, { status: 400 });
    }

    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" }, { status: 500 });

    const admin = createAdminClient();

    // If zaklad_id given, list all fixtures and pick the first started one
    let fixture: Record<string, unknown> | null = null;

    if (zakladId) {
        const { data: fixtures } = await admin
            .from("zaklad_fixtures")
            .select("id, match_id, league_id, match_date, home_name, away_name, match_status, home_score, away_score")
            .eq("zaklad_id", zakladId)
            .order("match_date", { ascending: true });

        if (!fixtures?.length) {
            return NextResponse.json({ error: "no fixtures for this zaklad_id" }, { status: 404 });
        }

        // Prefer a started (live/finished) fixture; fallback to first
        const now = Date.now();
        fixture = (fixtures.find((f) => new Date((f.match_date as string).replace(" ", "T")).getTime() <= now) ?? fixtures[0]) as Record<string, unknown>;

        // Also return the full list so user can pick a specific id
        const list = fixtures.map((f) => ({ id: f.id, home: f.home_name, away: f.away_name, date: f.match_date, status: f.match_status }));
        if (!fixture) return NextResponse.json({ fixtures: list });

        // Prepend the list for reference
        Object.assign(fixture, { _all_fixture_ids: list });
    } else {
        const { data, error } = await admin
            .from("zaklad_fixtures")
            .select("id, match_id, league_id, match_date, home_name, away_name, match_status, home_score, away_score")
            .eq("id", fixtureId!)
            .single();
        if (error || !data) {
            return NextResponse.json({ error: "fixture not found", detail: error?.message }, { status: 404 });
        }
        fixture = data as Record<string, unknown>;
    }

    const date = (fixture.match_date as string).slice(0, 10);
    const apifootball_id = parseInt(fixture.match_id as string);

    // ── Method A: league + date ───────────────────────────────────────────────
    let leagueResult: unknown = null;
    let leagueStatus = 0;
    let matchFoundInLeague = false;
    let matchStats: unknown = null;
    let matchEvents: unknown = null;

    if (fixture.league_id) {
        const urlA = `${BASE}?action=get_events&from=${date}&to=${date}&league_id=${fixture.league_id}&APIkey=${key}`;
        try {
            const resA = await fetch(urlA, { cache: "no-store" });
            leagueStatus = resA.status;
            if (resA.ok) {
                const dataA = await resA.json();
                if (Array.isArray(dataA)) {
                    leagueResult = { count: dataA.length, teams: dataA.map((m: Record<string,string>) => `${m.match_hometeam_name} vs ${m.match_awayteam_name}`) };
                    const found = dataA.find((m: Record<string, string>) => {
                        const hn = m.match_hometeam_name?.toLowerCase() ?? "";
                        const an = m.match_awayteam_name?.toLowerCase() ?? "";
                        const ourH = (fixture.home_name as string).toLowerCase();
                        const ourA = (fixture.away_name as string).toLowerCase();
                        return hn.includes(ourH.split(" ")[0]) || ourH.includes(hn.split(" ")[0]);
                    });
                    if (found) {
                        matchFoundInLeague = true;
                        matchStats = found.statistics;
                        matchEvents = found.goalscorer;
                    }
                } else {
                    leagueResult = dataA;
                }
            }
        } catch (e) {
            leagueResult = { fetchError: String(e) };
        }
    }

    // ── Method B: single match by match_id ────────────────────────────────────
    let matchIdResult: unknown = null;
    let matchIdStatus = 0;

    if (!isNaN(apifootball_id)) {
        const urlB = `${BASE}?action=get_events&match_id=${apifootball_id}&APIkey=${key}`;
        try {
            const resB = await fetch(urlB, { cache: "no-store" });
            matchIdStatus = resB.status;
            if (resB.ok) {
                const dataB = await resB.json();
                if (Array.isArray(dataB) && dataB.length > 0) {
                    const m = dataB[0] as Record<string, unknown>;
                    matchIdResult = {
                        match_id: m.match_id,
                        match_live: m.match_live,
                        match_status: m.match_status,
                        score: `${m.match_hometeam_score}:${m.match_awayteam_score}`,
                        statistics_type: typeof m.statistics,
                        statistics_is_array: Array.isArray(m.statistics),
                        statistics_length: Array.isArray(m.statistics) ? (m.statistics as unknown[]).length : m.statistics,
                        goalscorer_type: typeof m.goalscorer,
                        goalscorer_count: Array.isArray(m.goalscorer) ? (m.goalscorer as unknown[]).length : m.goalscorer,
                    };
                } else {
                    matchIdResult = { empty: true, raw: dataB };
                }
            }
        } catch (e) {
            matchIdResult = { fetchError: String(e) };
        }
    }

    return NextResponse.json({
        fixture: {
            id: fixture.id,
            match_id: fixture.match_id,
            league_id: fixture.league_id,
            match_date: fixture.match_date,
            home: fixture.home_name,
            away: fixture.away_name,
            status: fixture.match_status,
        },
        methodA_league_date: {
            status: leagueStatus,
            result: leagueResult,
            match_found: matchFoundInLeague,
            match_statistics_raw: matchStats,
            match_events_count: Array.isArray(matchEvents) ? matchEvents.length : matchEvents,
        },
        methodB_match_id: {
            status: matchIdStatus,
            result: matchIdResult,
        },
    });
}
