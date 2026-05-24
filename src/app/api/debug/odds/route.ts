import { NextResponse } from "next/server";
import { LEAGUE_BY_ID } from "@/lib/top-leagues";
import { createClient } from "@/lib/supabase/server";

/**
 * Debug endpoint: shows odds API team names vs fixture team names for a zakład.
 * Usage: GET /api/debug/odds?zaklad_id=<id>
 * Also accepts: GET /api/debug/odds?league_id=152  (just fetch raw odds map)
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const zakladId = searchParams.get("zaklad_id");
    const leagueId = searchParams.get("league_id") ?? "152";

    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ODDS_API_KEY not set" });

    const league = LEAGUE_BY_ID.get(leagueId);
    if (!league) return NextResponse.json({ error: `League ${leagueId} not in LEAGUE_BY_ID` });

    // Fetch raw odds for this league
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/${league.oddsKey}/odds/?apiKey=${apiKey}&regions=eu,uk&markets=h2h&oddsFormat=decimal`;
    const oddsRes = await fetch(oddsUrl, { cache: "no-store" });
    const oddsStatus = oddsRes.status;
    const oddsData = oddsRes.ok ? await oddsRes.json() : await oddsRes.text();

    const events = Array.isArray(oddsData)
        ? oddsData.map((e: { home_team: string; away_team: string; commence_time: string; bookmakers: unknown[] }) => ({
              home_team: e.home_team,
              away_team: e.away_team,
              commence_time: e.commence_time,
              bookmaker_count: e.bookmakers?.length ?? 0,
          }))
        : [];

    // If zaklad_id provided, also show fixture team names and lookup result
    let fixtureInfo: unknown[] = [];
    if (zakladId) {
        const supabase = await createClient();
        const { data: fixtures } = await supabase
            .from("zaklad_fixtures")
            .select("id, home_name, away_name, league_id, match_date, odds_home, odds_draw, odds_away")
            .eq("zaklad_id", zakladId);

        fixtureInfo = (fixtures ?? []).map((f) => {
            function norm(s: string) {
                return s
                    .normalize("NFD")
                    .replace(/[̀-ͯ]/g, "")
                    .replace(/[łŁ]/g, "l")
                    .replace(/\s*&\s*/g, " and ")
                    .toLowerCase()
                    .trim();
            }
            const homeNorm = norm(f.home_name);
            const awayNorm = norm(f.away_name);
            const oddsEvent = Array.isArray(oddsData)
                ? oddsData.find((e: { home_team: string; away_team: string }) =>
                      norm(e.home_team) === homeNorm && norm(e.away_team) === awayNorm,
                  )
                : null;
            return {
                home_name: f.home_name,
                away_name: f.away_name,
                home_name_norm: homeNorm,
                away_name_norm: awayNorm,
                league_id: f.league_id,
                match_date: f.match_date,
                stored_odds: { home: f.odds_home, draw: f.odds_draw, away: f.odds_away },
                odds_match_found: !!oddsEvent,
                odds_match_home: oddsEvent ? (oddsEvent as { home_team: string }).home_team : null,
            };
        });
    }

    return NextResponse.json({
        league: { id: leagueId, name: league.name, oddsKey: league.oddsKey },
        oddsApiStatus: oddsStatus,
        eventsCount: events.length,
        events,
        fixtures: fixtureInfo,
    });
}
