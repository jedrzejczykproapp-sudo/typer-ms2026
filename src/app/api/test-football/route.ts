import { NextResponse } from "next/server";

export async function GET() {
    const key = process.env.FOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "FOOTBALL_API_KEY not set" });

    // Test 1: Check account status
    const statusRes = await fetch("https://v3.football.api-sports.io/status", {
        headers: { "x-apisports-key": key },
    });
    const status = await statusRes.json();

    // Test 2: Check league 106 season 2025 (Ekstraklasa)
    const fixturesRes = await fetch(
        "https://v3.football.api-sports.io/fixtures?league=106&season=2025&from=2026-05-23&to=2026-05-23",
        { headers: { "x-apisports-key": key } },
    );
    const fixtures = await fixturesRes.json();

    return NextResponse.json({
        accountStatus: status,
        fixturesCount: fixtures.response?.length ?? 0,
        fixturesErrors: fixtures.errors,
        firstFixture: fixtures.response?.[0] ?? null,
    });
}
