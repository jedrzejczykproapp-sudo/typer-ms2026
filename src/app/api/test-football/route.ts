import { NextResponse } from "next/server";

const BASE = "https://apiv3.apifootball.com/";

// Find correct league IDs for top 5 leagues
export async function GET() {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" });

    const res = await fetch(`${BASE}?action=get_leagues&APIkey=${key}`, { cache: "no-store" });
    const data = await res.json();

    const keywords = ["premier league", "ligue 1", "serie a", "la liga", "ekstraklasa", "primera division"];
    const found = Array.isArray(data)
        ? data.filter((l: Record<string, string>) =>
              keywords.some((kw) => l.league_name?.toLowerCase().includes(kw))
          ).map((l: Record<string, string>) => ({
              league_id: l.league_id,
              league_name: l.league_name,
              country_name: l.country_name,
          }))
        : data;

    return NextResponse.json({ found });
}
