import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ZakladDetail } from "./zaklad-detail";
import { getOddsByKey } from "@/lib/odds";
import { LEAGUE_BY_ID } from "@/lib/top-leagues";
import { getStadium } from "@/lib/stadiums";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ZakladPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/logowanie");

    // Fetch zakład with fixtures and members (no profiles join — no direct FK)
    const { data: zaklad, error } = await supabase
        .from("zaklady")
        .select(`
            id, number, invite_code, status, created_at, creator_id,
            zaklad_fixtures(
                id, match_id, league_id, league_name, league_flag,
                match_date, home_name, home_badge, home_position,
                away_name, away_badge, away_position,
                home_score, away_score, match_status,
                odds_home, odds_draw, odds_away, venue
            ),
            zaklad_members(user_id, joined_at)
        `)
        .eq("id", id)
        .single();

    if (error || !zaklad) {
        console.error("Zaklad fetch error:", error);
        redirect("/zaklady");
    }

    // Check membership
    const members = zaklad.zaklad_members as { user_id: string; joined_at: string }[];
    const isMember = members.some((m) => m.user_id === user.id);
    if (!isMember) redirect("/zaklady");

    // Fetch profiles for all members separately
    const memberIds = members.map((m) => m.user_id);
    const { data: profiles } = memberIds.length
        ? await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .in("id", memberIds)
        : { data: [] };

    const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
    );

    // Merge members with profiles
    const membersWithProfiles = members.map((m) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        profiles: profileMap.get(m.user_id) ?? null,
    }));

    // Fetch all predictions for this zakład
    const { data: predictions } = await supabase
        .from("zaklad_predictions")
        .select("id, fixture_id, user_id, predicted_home, predicted_away, points")
        .eq("zaklad_id", id);

    // Fetch live odds for upcoming fixtures (per league, parallel)
    const now = new Date();
    const rawFixtures = zaklad.zaklad_fixtures as {
        id: string; league_id: string; match_date: string;
        home_name: string; away_name: string;
        odds_home: number | null; odds_draw: number | null; odds_away: number | null;
        venue: string | null;
        [key: string]: unknown;
    }[];

    const upcomingLeagueIds = [
        ...new Set(
            rawFixtures
                .filter((f) => new Date(f.match_date.replace(" ", "T")) > now)
                .map((f) => f.league_id),
        ),
    ];

    // Fetch odds for all relevant leagues in parallel
    const oddsResults = await Promise.all(
        upcomingLeagueIds.map(async (leagueId) => {
            const league = LEAGUE_BY_ID.get(leagueId);
            if (!league) return { leagueId, map: new Map() };
            return { leagueId, map: await getOddsByKey(league.oddsKey) };
        }),
    );
    const oddsByLeague = new Map(oddsResults.map((r) => [r.leagueId, r.map]));

    function normForOdds(s: string) {
        return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[łŁ]/g, "l").toLowerCase().trim();
    }

    function expandForOdds(s: string): string {
        return normForOdds(s)
            .replace(/\butd\b/g, "united")
            .replace(/\bman\b(?=\s)/g, "manchester")
            .replace(/\bspurs\b/g, "tottenham hotspur")
            .replace(/\bwolves\b/g, "wolverhampton wanderers")
            .replace(/^leeds$/, "leeds united")
            .replace(/^newcastle$/, "newcastle united")
            .replace(/^west ham$/, "west ham united")
            .replace(/^nottm forest$/, "nottingham forest")
            .replace(/\b(fc|cf|sc|ac|as|ss|us|rc|rcd|cd|ud|sd|ca|ra|afc|if)\b/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    // Enrich fixtures: inject live odds + venue fallback
    const enrichedFixtures = rawFixtures.map((f) => {
        const matchTime = new Date(f.match_date.replace(" ", "T"));
        const isUpcoming = matchTime > now;

        if (!isUpcoming) return f;

        const oddsMap = oddsByLeague.get(f.league_id);
        const homeKey = normForOdds(f.home_name);
        const awayKey = normForOdds(f.away_name);
        const homeExp = expandForOdds(f.home_name);
        const awayExp = expandForOdds(f.away_name);
        const liveOdds =
            oddsMap?.get(`${homeKey}|${awayKey}`) ??
            oddsMap?.get(`${homeExp}|${awayExp}`) ??
            null;

        return {
            ...f,
            odds_home: liveOdds?.home ?? f.odds_home,
            odds_draw: liveOdds?.draw ?? f.odds_draw,
            odds_away: liveOdds?.away ?? f.odds_away,
            venue: f.venue || getStadium(f.home_name) || null,
        };
    });

    const zakladWithProfiles = {
        ...zaklad,
        zaklad_fixtures: enrichedFixtures,
        zaklad_members: membersWithProfiles,
    };

    return (
        <ZakladDetail
            zaklad={zakladWithProfiles as any}
            userId={user.id}
            predictions={predictions ?? []}
        />
    );
}
