import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE = "https://apiv3.apifootball.com/";

/**
 * Debug: GET /api/debug/zaklad-fixture?id=<fixture_uuid>
 * Shows exactly what apifootball returns for a zaklad fixture.
 * Tests both: league+date query AND match_id query.
 */
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "pass ?id=<fixture_uuid>" }, { status: 400 });

    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" }, { status: 500 });

    const admin = createAdminClient();
    const { data: fixture, error } = await admin
        .from("zaklad_fixtures")
        .select("id, match_id, league_id, match_date, home_name, away_name, match_status, home_score, away_score")
        .eq("id", id)
        .single();

    if (error || !fixture) {
        return NextResponse.json({ error: "fixture not found", detail: error?.message }, { status: 404 });
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
