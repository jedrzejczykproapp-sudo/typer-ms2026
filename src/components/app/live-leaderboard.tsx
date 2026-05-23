"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLeaderboardWithLive } from "@/actions/prediction-actions";
import { LeaderboardTable } from "./leaderboard-table";
import type { LeaderboardEntry } from "@/types/database";

interface Props {
    groupId: string;
    initialEntries: LeaderboardEntry[];
    currentUserId?: string | null;
}

export function LiveLeaderboard({ groupId, initialEntries, currentUserId }: Props) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);

    useEffect(() => {
        const supabase = createClient();
        let cancelled = false;

        const refresh = async () => {
            const fresh = await getLeaderboardWithLive(groupId);
            if (!cancelled) setEntries(fresh);
        };

        // Subscribe to score changes on matches — fires when sync updates a live match
        const channel = supabase
            .channel(`leaderboard:${groupId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "matches" },
                () => { refresh(); },
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "predictions" },
                () => { refresh(); },
            )
            .subscribe();

        // Fallback poll every 60 s (covers Realtime outages)
        const id = setInterval(refresh, 60_000);

        return () => {
            cancelled = true;
            clearInterval(id);
            supabase.removeChannel(channel);
        };
    }, [groupId]);

    return <LeaderboardTable entries={entries} currentUserId={currentUserId} />;
}
