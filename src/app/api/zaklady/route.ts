import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Fixture } from "@/app/api/top-fixtures/route";

// POST /api/zaklady — create a new zakład with selected fixtures
export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const fixtures: Fixture[] = body.fixtures ?? [];
    if (!fixtures.length) return NextResponse.json({ error: "No fixtures" }, { status: 400 });

    // Create the zakład
    const { data: zaklad, error: zErr } = await supabase
        .from("zaklady")
        .insert({ creator_id: user.id })
        .select("id, number, invite_code")
        .single();

    if (zErr || !zaklad) return NextResponse.json({ error: zErr?.message }, { status: 500 });

    // Insert fixtures
    const fixtureRows = fixtures.map((f) => ({
        zaklad_id: zaklad.id,
        match_id: f.match_id,
        league_id: f.league_id,
        league_name: f.league_name,
        league_flag: f.league_flag,
        match_date: f.match_date,
        home_name: f.home.name,
        home_badge: f.home.badge,
        home_position: f.home.position,
        away_name: f.away.name,
        away_badge: f.away.badge,
        away_position: f.away.position,
        home_score: f.home_score ?? "",
        away_score: f.away_score ?? "",
        match_status: f.status ?? "upcoming",
    }));

    const { error: fErr } = await supabase.from("zaklad_fixtures").insert(fixtureRows);
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

    // Auto-join creator as member
    await supabase.from("zaklad_members").insert({ zaklad_id: zaklad.id, user_id: user.id });

    return NextResponse.json({ id: zaklad.id, number: zaklad.number, invite_code: zaklad.invite_code });
}

// GET /api/zaklady — list user's zakłady
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
        .from("zaklady")
        .select(`
            id, number, invite_code, status, created_at,
            zaklad_fixtures(id),
            zaklad_members(user_id)
        `)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
}
