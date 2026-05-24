import { NextResponse } from "next/server";
import { getTeamNamePl, getFlagUrl } from "@/lib/flags";

const BASE = "https://apiv3.apifootball.com/";
const WC_LEAGUE_ID = "28";

export interface WcTeamRow {
    place: number;
    team_id: string;
    team_name: string;
    team_name_pl: string;
    team_badge: string;
    flag_url: string | null;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    goal_diff: number;
    points: number;
}

export interface WcGroupStandings {
    group: string;
    teams: WcTeamRow[];
}

export async function GET() {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" }, { status: 500 });

    const url = `${BASE}?action=get_standings&league_id=${WC_LEAGUE_ID}&APIkey=${key}`;
    const res = await fetch(url, { next: { revalidate: 300 } }); // 5-min cache
    if (!res.ok) return NextResponse.json({ error: "apifootball error", status: res.status }, { status: 502 });

    const data = await res.json();
    if (!Array.isArray(data)) {
        return NextResponse.json({ error: "unexpected response", raw: data }, { status: 502 });
    }

    // Group by league_group (e.g. "Group A", "Group B", ...)
    const groupMap = new Map<string, WcTeamRow[]>();

    for (const r of data as Record<string, string>[]) {
        const groupName: string = r.league_group || r.group_name || r.league_round || "Group A";

        const row: WcTeamRow = {
            place:        parseInt(r.overall_league_position) || 0,
            team_id:      r.team_id ?? "",
            team_name:    r.team_name ?? "",
            team_name_pl: getTeamNamePl(r.team_name ?? ""),
            team_badge:   r.team_badge ?? "",
            flag_url:     getFlagUrl(r.team_name ?? ""),
            played:       parseInt(r.overall_league_payed) || 0,
            won:          parseInt(r.overall_league_W) || 0,
            drawn:        parseInt(r.overall_league_D) || 0,
            lost:         parseInt(r.overall_league_L) || 0,
            goals_for:    parseInt(r.overall_league_GF) || 0,
            goals_against:parseInt(r.overall_league_GA) || 0,
            goal_diff:    (parseInt(r.overall_league_GF) || 0) - (parseInt(r.overall_league_GA) || 0),
            points:       parseInt(r.overall_league_PTS) || 0,
        };

        if (!groupMap.has(groupName)) groupMap.set(groupName, []);
        groupMap.get(groupName)!.push(row);
    }

    // Sort groups alphabetically, teams by place within group
    const groups: WcGroupStandings[] = Array.from(groupMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, teams]) => ({
            group,
            teams: teams.sort((a, b) => a.place - b.place),
        }));

    return NextResponse.json(groups, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
}
