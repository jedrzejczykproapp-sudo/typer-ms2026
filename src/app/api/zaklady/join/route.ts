import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { kod } = await req.json();
    if (!kod) return NextResponse.json({ error: "No code" }, { status: 400 });

    // Find zakład by invite code
    const { data: zaklad } = await supabase
        .from("zaklady")
        .select("id, number")
        .eq("invite_code", kod.trim())
        .single();

    if (!zaklad) return NextResponse.json({ error: "Zakład not found" }, { status: 404 });

    // Check if already a member
    const { data: existing } = await supabase
        .from("zaklad_members")
        .select("user_id")
        .eq("zaklad_id", zaklad.id)
        .eq("user_id", user.id)
        .single();

    if (existing) {
        return NextResponse.json({ id: zaklad.id, number: zaklad.number, alreadyMember: true });
    }

    // Join
    const { error } = await supabase
        .from("zaklad_members")
        .insert({ zaklad_id: zaklad.id, user_id: user.id });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ id: zaklad.id, number: zaklad.number, alreadyMember: false });
}
