"use client";

import { useEffect, useState, useCallback } from "react";
import type { WcGroupStandings } from "@/app/api/wc-standings/route";

function TeamFlag({ flagUrl, badge, name }: { flagUrl: string | null; badge: string; name: string }) {
    const [err, setErr] = useState(false);
    const src = flagUrl && !err ? flagUrl : badge;
    if (!src) {
        return (
            <div className="flex size-6 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-bold text-tertiary">
                {name.charAt(0)}
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={name}
            className="size-6 shrink-0 rounded object-contain"
            onError={() => setErr(true)}
        />
    );
}

export function WcGroupTable() {
    const [groups, setGroups] = useState<WcGroupStandings[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchStandings = useCallback(async () => {
        try {
            const res = await fetch("/api/wc-standings");
            if (!res.ok) throw new Error("fetch failed");
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setGroups(data);
                setLastUpdated(new Date());
                setError(false);
            } else {
                // No data yet — tournament hasn't started
                setGroups([]);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStandings();
        // Refresh every 5 minutes
        const id = setInterval(fetchStandings, 5 * 60 * 1000);
        return () => clearInterval(id);
    }, [fetchStandings]);

    if (loading) {
        return (
            <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-xl bg-secondary" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-secondary bg-primary p-6 text-center text-sm text-tertiary">
                Nie udało się pobrać tabeli grup.
            </div>
        );
    }

    if (!groups || groups.length === 0) {
        return (
            <div className="rounded-xl border border-secondary bg-primary p-6 text-center">
                <p className="text-sm font-semibold text-primary">Tabela grup będzie dostępna po starcie turnieju</p>
                <p className="mt-1 text-xs text-tertiary">MŚ 2026 rozpoczyna się 11 czerwca 2026</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {lastUpdated && (
                <p className="text-right text-[10px] text-quaternary">
                    Aktualizacja: {lastUpdated.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                </p>
            )}

            {groups.map((g) => (
                <div key={g.group} className="overflow-hidden rounded-xl border border-secondary bg-primary">
                    {/* Group header */}
                    <div className="border-b border-secondary bg-secondary/40 px-4 py-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary">{g.group}</h3>
                    </div>

                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_repeat(5,auto)] items-center gap-x-3 border-b border-secondary px-3 py-1.5">
                        <span className="text-[10px] text-quaternary">Drużyna</span>
                        <span className="w-6 text-center text-[10px] text-quaternary">M</span>
                        <span className="w-6 text-center text-[10px] text-quaternary">W</span>
                        <span className="w-6 text-center text-[10px] text-quaternary">R</span>
                        <span className="w-6 text-center text-[10px] text-quaternary">P</span>
                        <span className="w-8 text-center text-[10px] font-semibold text-quaternary">Pkt</span>
                    </div>

                    {/* Rows */}
                    {g.teams.map((team, idx) => {
                        const isQualified = idx < 2; // top 2 qualify from group stage
                        return (
                            <div
                                key={team.team_id || team.team_name}
                                className={`grid grid-cols-[1fr_repeat(5,auto)] items-center gap-x-3 border-b border-secondary px-3 py-2.5 last:border-b-0 ${isQualified ? "bg-success-primary/20" : ""}`}
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <TeamFlag
                                        flagUrl={team.flag_url}
                                        badge={team.team_badge}
                                        name={team.team_name_pl}
                                    />
                                    <span className="truncate text-xs font-semibold text-primary">
                                        {team.team_name_pl}
                                    </span>
                                </div>
                                <span className="w-6 text-center text-xs tabular-nums text-tertiary">{team.played}</span>
                                <span className="w-6 text-center text-xs tabular-nums text-tertiary">{team.won}</span>
                                <span className="w-6 text-center text-xs tabular-nums text-tertiary">{team.drawn}</span>
                                <span className="w-6 text-center text-xs tabular-nums text-tertiary">{team.lost}</span>
                                <span className="w-8 text-center text-sm font-bold tabular-nums text-primary">
                                    {team.points}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
