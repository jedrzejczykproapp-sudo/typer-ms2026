import { NextRequest, NextResponse } from "next/server";

const BASE = "https://apiv3.apifootball.com/";

export interface StandingRow {
    place: number;
    team_id: string;
    team_name: string;
    team_badge: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    points: number;
    description: string; // e.g. "Champions League", "Relegation"
}

export async function GET(req: NextRequest) {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get("league_id") ?? "259";

    const url = `${BASE}?action=get_standings&league_id=${leagueId}&APIkey=${key}`;
    const res = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min
    if (!res.ok) return NextResponse.json({ error: "API error" }, { status: 502 });

    const data = await res.json();
    if (!Array.isArray(data)) {
        return NextResponse.json({ error: "unexpected response", raw: data }, { status: 502 });
    }

    const rows: StandingRow[] = data.map((r: Record<string, string>) => ({
        place: parseInt(r.overall_league_position) || 0,
        team_id: r.team_id,
        team_name: r.team_name,
        team_badge: r.team_badge ?? "",
        played: parseInt(r.overall_league_payed) || 0,
        won: parseInt(r.overall_league_W) || 0,
        drawn: parseInt(r.overall_league_D) || 0,
        lost: parseInt(r.overall_league_L) || 0,
        goals_for: parseInt(r.overall_league_GF) || 0,
        goals_against: parseInt(r.overall_league_GA) || 0,
        points: parseInt(r.overall_league_PTS) || 0,
        description: r.overall_promotion ?? "",
    }));

    rows.sort((a, b) => a.place - b.place);

    return NextResponse.json(rows, {
        headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
}
