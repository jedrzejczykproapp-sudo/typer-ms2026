import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { kod } = await req.json();
    if (!kod) return NextResponse.json({ error: "No code" }, { status: 400 });

    // Admin client — nowy uczestnik nie jest jeszcze memberem, RLS blokuje SELECT
    const admin = createAdminClient();
    const { data: zaklad } = await admin
        .from("zaklady")
        .select("id, number")
        .eq("invite_code", kod.trim())
        .single();

    if (!zaklad) return NextResponse.json({ error: "Zakład not found" }, { status: 404 });

    // Check if already a member (admin, bo RLS może blokować SELECT zanim join)
    const { data: existing } = await admin
        .from("zaklad_members")
        .select("user_id")
        .eq("zaklad_id", zaklad.id)
        .eq("user_id", user.id)
        .single();

    if (existing) {
        return NextResponse.json({ id: zaklad.id, number: zaklad.number, alreadyMember: true });
    }

    // Join — admin insert, user_id ustawiony explicite na zalogowanego użytkownika
    const { error } = await admin
        .from("zaklad_members")
        .insert({ zaklad_id: zaklad.id, user_id: user.id });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ id: zaklad.id, number: zaklad.number, alreadyMember: false });
}
