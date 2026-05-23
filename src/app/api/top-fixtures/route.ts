import { NextResponse } from "next/server";
import { TOP_LEAGUES } from "@/lib/top-leagues";

const BASE = "https://apiv3.apifootball.com/";

export interface FixtureTeam {
    id: string;
    name: string;
    badge: string;
    position: number | null;
}

export interface Fixture {
    match_id: string;
    league_id: string;
    league_name: string;
    league_flag: string;
    match_date: string; // ISO "2026-05-24 18:00:00"
    home: FixtureTeam;
    away: FixtureTeam;
    status: string;
    home_score: string;
    away_score: string;
}

function norm(s: string) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[łŁ]/g, "l").toLowerCase().trim();
}

export async function GET() {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "no key" }, { status: 500 });

    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);

    // Fetch matches + standings for all leagues in parallel
    const results = await Promise.allSettled(
        TOP_LEAGUES.map(async (league) => {
            const [evRes, stRes] = await Promise.allSettled([
                fetch(`${BASE}?action=get_events&from=${from}&to=${to}&league_id=${league.id}&APIkey=${key}`, { next: { revalidate: 1800 } }),
                fetch(`${BASE}?action=get_standings&league_id=${league.id}&APIkey=${key}`, { next: { revalidate: 1800 } }),
            ]);

            const events = evRes.status === "fulfilled" && evRes.value.ok ? await evRes.value.json() : [];
            const standings = stRes.status === "fulfilled" && stRes.value.ok ? await stRes.value.json() : [];

            // Build team_name → position map from standings
            const posMap = new Map<string, { position: number; badge: string }>();
            if (Array.isArray(standings)) {
                for (const row of standings as Record<string, string>[]) {
                    const pos = parseInt(row.overall_league_position) || 0;
                    posMap.set(norm(row.team_name), { position: pos, badge: row.team_badge ?? "" });
                    // also index by team_id for more reliable lookup
                    if (row.team_id) posMap.set(`id:${row.team_id}`, { position: pos, badge: row.team_badge ?? "" });
                }
            }

            const fixtures: Fixture[] = [];
            if (Array.isArray(events)) {
                for (const e of events as Record<string, string>[]) {
                    const homeKey = norm(e.match_hometeam_name ?? "");
                    const awayKey = norm(e.match_awayteam_name ?? "");
                    const homeSt = posMap.get(homeKey) ?? posMap.get(`id:${e.match_hometeam_id}`) ?? null;
                    const awaySt = posMap.get(awayKey) ?? posMap.get(`id:${e.match_awayteam_id}`) ?? null;

                    fixtures.push({
                        match_id: e.match_id,
                        league_id: league.id,
                        league_name: league.name,
                        league_flag: league.flag,
                        match_date: e.match_date + " " + (e.match_time ?? "00:00"),
                        home: {
                            id: e.match_hometeam_id ?? "",
                            name: e.match_hometeam_name ?? "",
                            badge: homeSt?.badge ?? e.team_home_badge ?? "",
                            position: homeSt?.position ?? null,
                        },
                        away: {
                            id: e.match_awayteam_id ?? "",
                            name: e.match_awayteam_name ?? "",
                            badge: awaySt?.badge ?? e.team_away_badge ?? "",
                            position: awaySt?.position ?? null,
                        },
                        status: e.match_status ?? "",
                        home_score: e.match_hometeam_score ?? "",
                        away_score: e.match_awayteam_score ?? "",
                    });
                }
            }

            return fixtures;
        }),
    );

    const all: Fixture[] = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    // Sort by date
    all.sort((a, b) => a.match_date.localeCompare(b.match_date));

    return NextResponse.json(all, {
        headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
}
