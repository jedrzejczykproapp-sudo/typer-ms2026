import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncMatchData } from "@/lib/api-football";

// How stale the data can be before we re-fetch from apifootball.com
const STALE_LIVE_MS = 55_000;       // ~55 s during live match (fires every 60 s from card)
const STALE_FINISHED_MS = 300_000;  // 5 min after finished (data rarely changes)

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
        .select("id, home_team, away_team, match_date, status, api_football_id, synced_at")
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

    // ── 2. Staleness check — use matches.synced_at (set on every successful sync) ─
    if (match.synced_at) {
        const age = Date.now() - new Date(match.synced_at).getTime();
        const threshold =
            match.status === "finished" ? STALE_FINISHED_MS : STALE_LIVE_MS;
        if (age < threshold) {
            return NextResponse.json({ skipped: "fresh", age });
        }
    }

    // ── 3. Fetch from apifootball.com ─────────────────────────────────────────
    console.log("[sync] fetching", { competitionType, matchDate: match.match_date, homeTeam: match.home_team, awayTeam: match.away_team });
    const result = await syncMatchData({
        competitionType,
        matchDate: match.match_date,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        cachedFixtureId: match.api_football_id ?? null,
    });

    if (!result) {
        console.error("[sync] syncMatchData returned null — check APIFOOTBALL_API_KEY, leagueId, team names");
        return NextResponse.json({ error: "apifootball sync failed", competitionType, homeTeam: match.home_team, awayTeam: match.away_team }, { status: 502 });
    }
    console.log("[sync] got result", { fixtureId: result.fixtureId, events: result.events.length, stats: !!result.stats, score: `${result.homeScore}:${result.awayScore}`, status: result.matchStatus });

    // ── 4. Update match scores, status, fixture ID and synced_at ─────────────
    {
        const now = new Date().toISOString();
        const updates: Record<string, unknown> = { synced_at: now };
        if (!match.api_football_id && result.fixtureId) updates.api_football_id = result.fixtureId;
        if (result.homeScore !== null) updates.home_score = result.homeScore;
        if (result.awayScore !== null) updates.away_score = result.awayScore;
        // Only advance status forward (upcoming → live → finished), never backward
        const rank = { upcoming: 0, live: 1, finished: 2 };
        if (rank[result.matchStatus] > rank[match.status as keyof typeof rank]) {
            updates.status = result.matchStatus;
        }
        await admin.from("matches").update(updates).eq("id", matchId);
    }

    // ── 5. Write events (replace all for this match) ──────────────────────────
    if (result.events.length > 0) {
        const { error: delErr } = await admin.from("match_events").delete().eq("match_id", matchId);
        if (delErr) console.error("[sync] delete events error", delErr);
        const { error: insErr } = await admin.from("match_events").insert(
            result.events.map((e) => ({ ...e, match_id: matchId })),
        );
        if (insErr) console.error("[sync] insert events error", insErr);
    }

    // ── 6. Upsert stats ────────────────────────────────────────────────────────
    if (result.stats) {
        const { error: stErr } = await admin.from("match_stats").upsert(
            { ...result.stats, match_id: matchId, updated_at: new Date().toISOString() },
            { onConflict: "match_id" },
        );
        if (stErr) console.error("[sync] upsert stats error", stErr);
    }

    return NextResponse.json({ ok: true, events: result.events.length, stats: !!result.stats });
}
