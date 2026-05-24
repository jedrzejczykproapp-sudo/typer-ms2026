import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ZakladDetail } from "./zaklad-detail";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ZakladPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/logowanie");

    // Fetch zakład with fixtures and members (no profiles join — no direct FK)
    const { data: zaklad, error } = await supabase
        .from("zaklady")
        .select(`
            id, number, invite_code, status, created_at, creator_id,
            zaklad_fixtures(
                id, match_id, league_id, league_name, league_flag,
                match_date, home_name, home_badge, home_position,
                away_name, away_badge, away_position,
                home_score, away_score, match_status,
                odds_home, odds_draw, odds_away
            ),
            zaklad_members(user_id, joined_at)
        `)
        .eq("id", id)
        .single();

    if (error || !zaklad) {
        console.error("Zaklad fetch error:", error);
        redirect("/zaklady");
    }

    // Check membership
    const members = zaklad.zaklad_members as { user_id: string; joined_at: string }[];
    const isMember = members.some((m) => m.user_id === user.id);
    if (!isMember) redirect("/zaklady");

    // Fetch profiles for all members separately
    const memberIds = members.map((m) => m.user_id);
    const { data: profiles } = memberIds.length
        ? await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .in("id", memberIds)
        : { data: [] };

    const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
    );

    // Merge members with profiles
    const membersWithProfiles = members.map((m) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        profiles: profileMap.get(m.user_id) ?? null,
    }));

    // Fetch all predictions for this zakład
    const { data: predictions } = await supabase
        .from("zaklad_predictions")
        .select("id, fixture_id, user_id, predicted_home, predicted_away, points")
        .eq("zaklad_id", id);

    const zakladWithProfiles = {
        ...zaklad,
        zaklad_members: membersWithProfiles,
    };

    return (
        <ZakladDetail
            zaklad={zakladWithProfiles as any}
            userId={user.id}
            predictions={predictions ?? []}
        />
    );
}
