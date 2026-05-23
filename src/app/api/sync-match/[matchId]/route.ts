import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncMatchData } from "@/lib/api-football";

// How stale the data can be before we re-fetch from API-Football
const STALE_LIVE_MS = 60_000;      // 1 min during live match
const STALE_FINISHED_MS = 300_000; // 5 min after finished (data rarely changes)

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ matchId: string }> },
) {
    const { matchId } = await params;
    const body = await req.json().catch(() => ({}));
    const competitionType: string = body.competitionType ?? "";

    const admin = createAdminClient();

    // ── 1. Load match row ──────────────────────────────────────────────────────
    const { data: match, error: matchErr } = await admin
        .from("matches")
        .select("id, home_team, away_team, match_date, status, api_football_id")
        .eq("id", matchId)
        .single();

    if (matchErr || !match) {
        return NextResponse.json({ error: "match not found" }, { status: 404 });
    }

    // Only sync once the match has started
    const started = Date.now() >= new Date(match.match_date).getTime();
    if (!started) {
        return NextResponse.json({ skipped: "not started yet" });
    }

    // ── 2. Check staleness using match_stats.updated_at as last-sync timestamp ─
    const { data: existingSt } = await admin
        .from("match_stats")
        .select("updated_at")
        .eq("match_id", matchId)
        .maybeSingle();

    if (existingSt?.updated_at) {
        const age = Date.now() - new Date(existingSt.updated_at).getTime();
        const threshold =
            match.status === "finished" ? STALE_FINISHED_MS : STALE_LIVE_MS;
        if (age < threshold) {
            return NextResponse.json({ skipped: "fresh", age });
        }
    }

    // ── 3. Fetch from API-Football ─────────────────────────────────────────────
    const result = await syncMatchData({
        competitionType,
        matchDate: match.match_date,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        cachedFixtureId: match.api_football_id ?? null,
    });

    if (!result) {
        return NextResponse.json({ error: "api-football sync failed" }, { status: 502 });
    }

    // ── 4. Update match scores, status and cache fixture ID ───────────────────
    {
        const updates: Record<string, unknown> = {};
        if (!match.api_football_id && result.fixtureId) updates.api_football_id = result.fixtureId;
        if (result.homeScore !== null) updates.home_score = result.homeScore;
        if (result.awayScore !== null) updates.away_score = result.awayScore;
        // Only advance status forward (upcoming → live → finished), never backward
        const rank = { upcoming: 0, live: 1, finished: 2 };
        if (rank[result.matchStatus] > rank[match.status as keyof typeof rank]) {
            updates.status = result.matchStatus;
        }
        if (Object.keys(updates).length > 0) {
            await admin.from("matches").update(updates).eq("id", matchId);
        }
    }

    // ── 5. Write events (replace all for this match) ──────────────────────────
    if (result.events.length > 0) {
        await admin.from("match_events").delete().eq("match_id", matchId);
        await admin.from("match_events").insert(
            result.events.map((e) => ({ ...e, match_id: matchId })),
        );
    }

    // ── 6. Upsert stats ────────────────────────────────────────────────────────
    if (result.stats) {
        await admin.from("match_stats").upsert(
            { ...result.stats, match_id: matchId, updated_at: new Date().toISOString() },
            { onConflict: "match_id" },
        );
    }

    return NextResponse.json({ ok: true, events: result.events.length, stats: !!result.stats });
}
