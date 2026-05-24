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

    const now = new Date();
    const rawFixtures = zaklad.zaklad_fixtures as {
        id: string; league_id: string; match_date: string;
        home_name: string; home_badge: string; home_position: number | null;
        away_name: string; away_badge: string; away_position: number | null;
        odds_home: number | null; odds_draw: number | null; odds_away: number | null;
        venue: string | null;
        [key: string]: unknown;
    }[];

    // Normalise name: strip diacritics, lowercase, & → and
    function normForOdds(s: string) {
        return s
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[łŁ]/g, "l")
            .replace(/\s*&\s*/g, " and ")
            .toLowerCase()
            .trim();
    }

    // Expand common abbreviations so "Man Utd" == "Manchester United"
    function expandForOdds(s: string): string {
        return normForOdds(s)
            .replace(/\butd\b/g, "united")
            .replace(/\bman\b(?=\s)/g, "manchester")
            .replace(/\bspurs\b/g, "tottenham hotspur")
            .replace(/^tottenham$/, "tottenham hotspur")
            .replace(/\bwolves\b/g, "wolverhampton wanderers")
            .replace(/\bwolverhampton\b(?!\s+wanderers)/, "wolverhampton wanderers")
            .replace(/^brighton$/, "brighton and hove albion")
            .replace(/^leeds$/, "leeds united")
            .replace(/^newcastle$/, "newcastle united")
            .replace(/^west ham$/, "west ham united")
            .replace(/^nottm forest$/, "nottingham forest")
            .replace(/^nottingham$/, "nottingham forest")
            .replace(/^leicester$/, "leicester city")
            .replace(/^ipswich$/, "ipswich town")
            .replace(/\bparis\b.*\bsaint.germain\b/, "paris saint-germain")
            .replace(/^psg$/, "paris saint-germain")
            .replace(/\b(fc|cf|sc|ac|as|ss|us|rc|rcd|cd|ud|sd|ca|ra|afc|if)\b/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    // All unique league IDs across all fixtures (not just upcoming — standings needed for all)
    const allLeagueIds = [...new Set(rawFixtures.map((f) => f.league_id))];
    const upcomingLeagueIds = [
        ...new Set(
            rawFixtures
                .filter((f) => new Date(f.match_date.replace(" ", "T")) > now)
                .map((f) => f.league_id),
        ),
    ];

    const APIFOOTBALL_BASE = "https://apiv3.apifootball.com/";
    const afKey = process.env.APIFOOTBALL_API_KEY ?? "";

    // Fetch odds (upcoming leagues) + standings (all leagues) in parallel
    const [oddsResults, standingsResults] = await Promise.all([
        Promise.all(
            upcomingLeagueIds.map(async (leagueId) => {
                const league = LEAGUE_BY_ID.get(leagueId);
                if (!league) return { leagueId, map: new Map() };
                return { leagueId, map: await getOddsByKey(league.oddsKey) };
            }),
        ),
        Promise.all(
            allLeagueIds.map(async (leagueId) => {
                if (!afKey) return { leagueId, posMap: new Map<string, number>() };
                try {
                    const res = await fetch(
                        `${APIFOOTBALL_BASE}?action=get_standings&league_id=${leagueId}&APIkey=${afKey}`,
                        { next: { revalidate: 3600 } },
                    );
                    if (!res.ok) return { leagueId, posMap: new Map<string, number>() };
                    const rows = await res.json();
                    const posMap = new Map<string, number>();
                    if (Array.isArray(rows)) {
                        for (const row of rows as Record<string, string>[]) {
                            const pos = parseInt(row.overall_league_position) || 0;
                            if (!pos) continue;
                            posMap.set(normForOdds(row.team_name ?? ""), pos);
                            if (row.team_id) posMap.set(`id:${row.team_id}`, pos);
                        }
                    }
                    return { leagueId, posMap };
                } catch {
                    return { leagueId, posMap: new Map<string, number>() };
                }
            }),
        ),
    ]);

    const oddsByLeague  = new Map(oddsResults.map((r) => [r.leagueId, r.map]));
    const posByLeague   = new Map(standingsResults.map((r) => [r.leagueId, r.posMap]));

    // Enrich every fixture: live odds + venue fallback + fresh positions
    const enrichedFixtures = rawFixtures.map((f) => {
        const matchTime = new Date(f.match_date.replace(" ", "T"));
        const isUpcoming = matchTime > now;

        // Positions — always re-fetch from standings (covers past + future)
        const posMap   = posByLeague.get(f.league_id);
        const homePos  = posMap?.get(normForOdds(f.home_name)) ?? posMap?.get(`id:${f.home_badge}`) ?? f.home_position ?? null;
        const awayPos  = posMap?.get(normForOdds(f.away_name)) ?? posMap?.get(`id:${f.away_badge}`) ?? f.away_position ?? null;

        // Venue — always apply fallback
        const venue = (f.venue as string | null) || getStadium(f.home_name) || null;

        if (!isUpcoming) {
            return { ...f, home_position: homePos, away_position: awayPos, venue };
        }

        // Odds — only for upcoming
        const oddsMap  = oddsByLeague.get(f.league_id);
        const homeKey  = normForOdds(f.home_name);
        const awayKey  = normForOdds(f.away_name);
        const homeExp  = expandForOdds(f.home_name);
        const awayExp  = expandForOdds(f.away_name);
        const liveOdds =
            oddsMap?.get(`${homeKey}|${awayKey}`) ??
            oddsMap?.get(`${homeExp}|${awayExp}`) ??
            null;

        return {
            ...f,
            home_position: homePos,
            away_position: awayPos,
            venue,
            odds_home: liveOdds?.home ?? f.odds_home,
            odds_draw: liveOdds?.draw ?? f.odds_draw,
            odds_away: liveOdds?.away ?? f.odds_away,
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
