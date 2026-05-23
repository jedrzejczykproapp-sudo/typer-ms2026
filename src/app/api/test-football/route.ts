import { NextResponse } from "next/server";

const BASE = "https://apiv3.apifootball.com/";

export async function GET() {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" });

    const url = `${BASE}?action=get_standings&league_id=259&APIkey=${key}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    // Return raw first item so we can see exact field names
    const first = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ isArray: Array.isArray(data), count: Array.isArray(data) ? data.length : null, first });
}
