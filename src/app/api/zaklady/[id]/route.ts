import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/zaklady/[id] — anuluj zakład (tylko twórca)
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Tylko twórca może usunąć zakład
    const { data: zaklad } = await supabase
        .from("zaklady")
        .select("id, creator_id")
        .eq("id", id)
        .single();

    if (!zaklad) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (zaklad.creator_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase.from("zaklady").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
