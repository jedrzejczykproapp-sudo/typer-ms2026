import { NextResponse } from "next/server";

const BASE = "https://apiv3.apifootball.com/";

export async function GET() {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" });

    // Search leagues by country name Poland
    const res = await fetch(`${BASE}?action=get_leagues&country_name=Poland&APIkey=${key}`);
    const leagues = await res.json();

    // Also test a known match today
    const evRes = await fetch(
        `${BASE}?action=get_events&from=2026-05-23&to=2026-05-23&APIkey=${key}`,
    );
    const events = await evRes.json();
    const polishEvents = Array.isArray(events)
        ? events.filter((e: { country_name?: string }) =>
              e.country_name?.toLowerCase().includes("pol"),
          )
        : events;

    return NextResponse.json({ leagues, polishEventsCount: Array.isArray(polishEvents) ? polishEvents.length : polishEvents, firstPolishEvent: Array.isArray(polishEvents) ? polishEvents[0] : null });
}
