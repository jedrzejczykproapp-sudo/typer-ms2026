import { NextResponse } from "next/server";

const BASE = "https://apiv3.apifootball.com/";

export async function GET() {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" });

    const today = new Date().toISOString().slice(0, 10);
    const url = `${BASE}?action=get_events&from=${today}&to=${today}&league_id=259&APIkey=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json({
        date: today,
        count: Array.isArray(data) ? data.length : 0,
        matches: Array.isArray(data)
            ? data.map((m: Record<string, unknown>) => ({
                  id: m.match_id,
                  home: m.match_hometeam_name,
                  away: m.match_awayteam_name,
                  score: `${m.match_hometeam_score}:${m.match_awayteam_score}`,
                  status: m.match_status,
                  live: m.match_live,
              }))
            : data,
    });
}
