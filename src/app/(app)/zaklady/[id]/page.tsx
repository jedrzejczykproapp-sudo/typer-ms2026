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

    // Fetch zakład with fixtures, members (with profiles), and user's predictions
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
            zaklad_members(
                user_id, joined_at,
                profiles(display_name, avatar_url)
            )
        `)
        .eq("id", id)
        .single();

    if (error || !zaklad) redirect("/zaklady");

    // Check if user is a member
    const isMember = (zaklad.zaklad_members as { user_id: string }[]).some(
        (m) => m.user_id === user.id,
    );
    if (!isMember) redirect("/zaklady");

    // Fetch all predictions for this zakład
    const { data: predictions } = await supabase
        .from("zaklad_predictions")
        .select("id, fixture_id, user_id, prediction, points")
        .eq("zaklad_id", id);

    return (
        <ZakladDetail
            zaklad={zaklad as any}
            userId={user.id}
            predictions={predictions ?? []}
        />
    );
}
