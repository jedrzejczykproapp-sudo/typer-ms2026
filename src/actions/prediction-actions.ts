"use server";

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

    return { success: true };
}

export async function getMatchesWithPredictions(groupId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Resolve which competition this group tracks
    const { data: group } = await supabase
        .from("groups")
        .select("competition_type")
        .eq("id", groupId)
        .single();

    const competitionType = (group as { competition_type?: string } | null)?.competition_type ?? "wc_2026";

    const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .eq("competition_type", competitionType)
        .order("match_date", { ascending: true })
        .order("home_team", { ascending: true });

    const { data: predictions } = user
        ? await supabase.from("predictions").select("*").eq("group_id", groupId).eq("user_id", user.id)
        : { data: [] };

    const predictionMap = new Map((predictions ?? []).map((p) => [p.match_id, p]));

    return {
        matches: (matches ?? []) as Match[],
        predictions: predictionMap as Map<string, Prediction>,
        userId: user?.id ?? null,
        competitionType,
    };
}

export async function getLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
    const supabase = await createClient();

    const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

    if (!members?.length) return [];

    const userIds = members.map((m) => m.user_id);

    const [{ data: profiles }, { data: predictions }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds),
        supabase.from("predictions").select("*").eq("group_id", groupId),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const preds = predictions ?? [];

    const stats = members.map((member) => {
        const profile = profileMap.get(member.user_id);
        const userPreds = preds.filter((p) => p.user_id === member.user_id && p.points !== null);
        const totalPoints = userPreds.reduce((sum, p) => sum + (p.points ?? 0), 0);
        const exactScores = userPreds.filter((p) => p.points === 3).length;
        const correctResults = userPreds.filter((p) => p.points === 1).length;

        return {
            user_id: member.user_id,
            display_name: profile?.display_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
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

// Like getLeaderboard but adds provisional points for live matches
export async function getLeaderboardWithLive(groupId: string): Promise<LeaderboardEntry[]> {
    const supabase = await createClient();

    const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

    if (!members?.length) return [];

    const userIds = members.map((m) => m.user_id);

    const [{ data: profiles }, { data: predictions }, { data: liveMatches }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds),
        supabase.from("predictions").select("*").eq("group_id", groupId),
        supabase
            .from("matches")
            .select("id, home_score, away_score, status")
            .eq("status", "live")
            .not("home_score", "is", null),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const liveMap = new Map((liveMatches ?? []).map((m) => [m.id, m]));
    const preds = predictions ?? [];

    function calcProvisional(ph: number, pa: number, ah: number, aa: number): number {
        if (ph === ah && pa === aa) return 3;
        if (Math.sign(ph - pa) === Math.sign(ah - aa)) return 1;
        return 0;
    }

    const stats = members.map((member) => {
        const profile = profileMap.get(member.user_id);
        const userPreds = preds.filter((p) => p.user_id === member.user_id);

        let totalPoints = 0;
        let exactScores = 0;
        let correctResults = 0;

        for (const p of userPreds) {
            const live = liveMap.get(p.match_id);
            if (live && live.home_score !== null && live.away_score !== null) {
                // Live match — provisional points from current score
                const pts = calcProvisional(p.predicted_home, p.predicted_away, live.home_score as number, live.away_score as number);
                totalPoints += pts;
                if (pts === 3) exactScores++;
                else if (pts === 1) correctResults++;
            } else if (p.points !== null) {
                // Finished match — use stored points
                totalPoints += p.points;
                if (p.points === 3) exactScores++;
                else if (p.points === 1) correctResults++;
            }
        }

        return {
            user_id: member.user_id,
            display_name: profile?.display_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
            total_points: totalPoints,
            exact_scores: exactScores,
            correct_results: correctResults,
            predictions_count: userPreds.length,
            rank: 0,
        };
    });

    stats.sort((a, b) => b.total_points - a.total_points || b.exact_scores - a.exact_scores);
    stats.forEach((s, i) => (s.rank = i + 1));

    return stats;
}

export type MatchWithGroup = {
    match: Match;
    groupId: string;
    groupName: string;
    competitionType: string;
    prediction: Prediction | undefined;
};

export async function getAllGroupsMatchesWithPredictions(
    groups: { id: string; name: string; competition_type: string }[],
): Promise<MatchWithGroup[]> {
    if (!groups.length) return [];

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const competitionTypes = [...new Set(groups.map((g) => g.competition_type))];

    // map competition_type → groups that cover it
    const ctToGroups = new Map<string, { id: string; name: string }[]>();
    for (const g of groups) {
        if (!ctToGroups.has(g.competition_type)) ctToGroups.set(g.competition_type, []);
        ctToGroups.get(g.competition_type)!.push({ id: g.id, name: g.name });
    }

    // fetch relevant matches: today onwards (upcoming/live) + today's finished
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .in("competition_type", competitionTypes)
        .gte("match_date", todayStart.toISOString())
        .neq("status", "finished")
        .order("match_date", { ascending: true })
        .order("home_team", { ascending: true });

    if (!matches?.length) return [];

    // fetch predictions for all groups
    const groupIds = groups.map((g) => g.id);
    const { data: predictions } = user
        ? await supabase.from("predictions").select("*").in("group_id", groupIds).eq("user_id", user.id)
        : { data: [] };

    const predMap = new Map(
        (predictions ?? []).map((p) => [`${p.match_id}:${p.group_id}`, p as Prediction]),
    );

    const result: MatchWithGroup[] = [];
    for (const match of matches as (Match & { competition_type: string })[]) {
        const coveringGroups = ctToGroups.get(match.competition_type) ?? [];
        for (const g of coveringGroups) {
            result.push({
                match,
                groupId: g.id,
                groupName: g.name,
                competitionType: match.competition_type,
                prediction: predMap.get(`${match.id}:${g.id}`),
            });
        }
    }

    return result;
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
