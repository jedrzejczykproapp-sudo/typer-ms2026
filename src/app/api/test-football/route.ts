import { NextResponse } from "next/server";

const BASE = "https://apiv3.apifootball.com/";

export async function GET() {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" });

    // Get all countries to find Poland's ID
    const countriesRes = await fetch(`${BASE}?action=get_countries&APIkey=${key}`);
    const countries = await countriesRes.json();
    const poland = Array.isArray(countries)
        ? countries.filter((c: { country_name: string }) =>
              c.country_name.toLowerCase().includes("pol"),
          )
        : countries;

    return NextResponse.json({ poland, rawSample: Array.isArray(countries) ? countries.slice(0, 5) : countries });
}
