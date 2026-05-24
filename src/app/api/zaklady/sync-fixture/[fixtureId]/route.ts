import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncMatchData } from "@/lib/api-football";

const FINISHED_STATUSES = ["finished", "FT", "AET", "PEN", "Finished"];

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ fixtureId: string }> },
) {
    const { fixtureId } = await params;
    const admin = createAdminClient();

    // 1. Load fixture from DB
    const { data: fixture, error } = await admin
        .from("zaklad_fixtures")
        .select("id, match_id, league_id, match_date, home_name, away_name, match_status, home_score, away_score")
        .eq("id", fixtureId)
        .single();

    if (error || !fixture) {
        return NextResponse.json({ error: "fixture not found" }, { status: 404 });
    }

    // 2. Only sync once the match date has arrived.
    // Dates are stored as Poland local time (CET/CEST = UTC+1/+2) without timezone info.
    // To avoid false "not started" on a UTC server, compare only the date portion
    // (YYYY-MM-DD) so any match scheduled today-or-earlier will be synced.
    const matchDateStr = (fixture.match_date ?? "").slice(0, 10);          // "2026-05-24"
    const todayStr     = new Date().toISOString().slice(0, 10);             // UTC date
    if (matchDateStr > todayStr) {
        return NextResponse.json({ skipped: "not started yet" });
    }

    // 4. Fetch live data from apifootball using the stored apifootball match_id
    const apifootball_id = parseInt(fixture.match_id ?? "");
    if (isNaN(apifootball_id)) {
        return NextResponse.json({ error: "invalid match_id" }, { status: 400 });
    }

    const result = await syncMatchData({
        competitionType: "",
        leagueId: fixture.league_id ?? undefined,  // league+date search (richer live stats)
        matchDate: fixture.match_date ?? "",
        homeTeam: fixture.home_name ?? "",
        awayTeam: fixture.away_name ?? "",
        cachedFixtureId: apifootball_id,  // fallback if league search fails
    });

    if (!result) {
        console.error("[sync-fixture] syncMatchData returned null for fixture", fixtureId, "match_id", apifootball_id);
        return NextResponse.json({ error: "apifootball sync failed" }, { status: 502 });
    }

    // 5. Update zaklad_fixture in DB (score + status only)
    const rank: Record<string, number> = { upcoming: 0, live: 1, finished: 2 };
    const currRank = rank[fixture.match_status] ?? 0;
    const updates: Record<string, unknown> = {};
    if (result.homeScore !== null) updates.home_score = String(result.homeScore);
    if (result.awayScore !== null) updates.away_score = String(result.awayScore);
    if ((rank[result.matchStatus] ?? 0) > currRank) updates.match_status = result.matchStatus;

    if (Object.keys(updates).length > 0) {
        const { error: upErr } = await admin
            .from("zaklad_fixtures")
            .update(updates)
            .eq("id", fixtureId);
        if (upErr) console.error("[sync-fixture] update error", upErr);
    }

    return NextResponse.json({
        ok: true,
        matchStatus: result.matchStatus,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        events: result.events,
        stats: result.stats,
    });
}
