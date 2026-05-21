"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry, Match, Prediction } from "@/types/database";

export async function upsertPrediction(matchId: string, groupId: string, predictedHome: number, predictedAway: number) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Nie jesteś zalogowany" };

    const { error } = await supabase.from("predictions").upsert(
        {
            user_id: user.id,
            match_id: matchId,
            group_id: groupId,
            predicted_home: predictedHome,
            predicted_away: predictedAway,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,match_id,group_id" },
    );

    if (error) return { error: error.message };

    revalidatePath(`/grupy/${groupId}`);
    return { success: true };
}

export async function getMatchesWithPredictions(groupId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: matches } = await supabase.from("matches").select("*").order("match_date", { ascending: true });

    const { data: predictions } = user
        ? await supabase.from("predictions").select("*").eq("group_id", groupId).eq("user_id", user.id)
        : { data: [] };

    const predictionMap = new Map((predictions ?? []).map((p) => [p.match_id, p]));

    return {
        matches: (matches ?? []) as Match[],
        predictions: predictionMap as Map<string, Prediction>,
        userId: user?.id ?? null,
    };
}

export async function getLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
    const supabase = await createClient();

    const { data: members } = await supabase
        .from("group_members")
        .select("user_id, profiles(id, display_name)")
        .eq("group_id", groupId);

    if (!members?.length) return [];

    const { data: predictions } = await supabase.from("predictions").select("*").eq("group_id", groupId);

    const preds = predictions ?? [];

    const stats = members.map((member) => {
        const userPreds = preds.filter((p) => p.user_id === member.user_id && p.points !== null);
        const totalPoints = userPreds.reduce((sum, p) => sum + (p.points ?? 0), 0);
        const exactScores = userPreds.filter((p) => p.points === 3).length;
        const correctResults = userPreds.filter((p) => p.points === 1).length;

        return {
            user_id: member.user_id,
            display_name: (member.profiles as any)?.display_name ?? null,
            total_points: totalPoints,
            exact_scores: exactScores,
            correct_results: correctResults,
            predictions_count: preds.filter((p) => p.user_id === member.user_id).length,
            rank: 0,
        };
    });

    stats.sort((a, b) => b.total_points - a.total_points || b.exact_scores - a.exact_scores);
    stats.forEach((s, i) => (s.rank = i + 1));

    return stats;
}

export async function getAllPredictionsForMatch(matchId: string, groupId: string) {
    const supabase = await createClient();

    const { data } = await supabase
        .from("predictions")
        .select("*, profiles(display_name)")
        .eq("match_id", matchId)
        .eq("group_id", groupId);

    return data ?? [];
}
