import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: zakladId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fixture_id, prediction } = await req.json();
    if (!fixture_id || !["1", "X", "2"].includes(prediction)) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Verify user is a member of this zakład
    const { data: member } = await supabase
        .from("zaklad_members")
        .select("user_id")
        .eq("zaklad_id", zakladId)
        .eq("user_id", user.id)
        .single();

    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    // Verify fixture belongs to this zakład
    const { data: fixture } = await supabase
        .from("zaklad_fixtures")
        .select("id, match_date, home_score, away_score, match_status")
        .eq("id", fixture_id)
        .eq("zaklad_id", zakladId)
        .single();

    if (!fixture) return NextResponse.json({ error: "Fixture not found" }, { status: 404 });

    // Check if match already started (lock predictions)
    const matchTime = new Date(fixture.match_date.replace(" ", "T"));
    if (matchTime <= new Date()) {
        return NextResponse.json({ error: "Match already started" }, { status: 400 });
    }

    // Upsert prediction
    const { data, error } = await supabase
        .from("zaklad_predictions")
        .upsert(
            { zaklad_id: zakladId, fixture_id, user_id: user.id, prediction },
            { onConflict: "fixture_id,user_id" },
        )
        .select("id, prediction, points")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
}
