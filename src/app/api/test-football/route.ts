import { NextResponse } from "next/server";

const BASE = "https://apiv3.apifootball.com/";

export async function GET() {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" });

    // Find Poland leagues
    const res = await fetch(`${BASE}?action=get_leagues&country_id=166&APIkey=${key}`);
    const leagues = await res.json();

    // Also test today's events for any found league
    return NextResponse.json({ leagues });
}
