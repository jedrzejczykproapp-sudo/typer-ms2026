"use client";

import { useEffect, useState } from "react";
import { getClubCrestUrl, getClubDisplayName, resolveClubName } from "@/lib/clubs";
import type { StandingRow } from "@/app/api/standings/route";

const DESC_COLORS: Record<string, string> = {
    "Champions League":            "bg-blue-500",
    "Europa League":               "bg-orange-400",
    "Europa Conference League":    "bg-green-500",
    "Relegation":                  "bg-red-500",
    "Promotion":                   "bg-green-500",
};

function descDot(description: string) {
    for (const [key, color] of Object.entries(DESC_COLORS)) {
        if (description.toLowerCase().includes(key.toLowerCase())) {
            return <span className={`inline-block size-1.5 rounded-full ${color} shrink-0`} />;
        }
    }
    return null;
}

interface Props {
    leagueId?: string;
    title?: string;
}

export function LiveStandings({ leagueId = "259", title = "Ekstraklasa PKO BP 2025/26" }: Props) {
    const [rows, setRows] = useState<StandingRow[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch(`/api/standings?league_id=${leagueId}`);
                if (!res.ok) { setError(true); return; }
                const data: StandingRow[] = await res.json();
                if (!cancelled) setRows(data);
            } catch {
                if (!cancelled) setError(true);
            }
        };

        load();
        // Refresh every 30 min (standings change rarely)
        const id = setInterval(load, 30 * 60_000);
        return () => { cancelled = true; clearInterval(id); };
    }, [leagueId]);

    if (error) {
        return (
            <p className="py-4 text-center text-sm text-tertiary">
                Nie udało się załadować tabeli.
            </p>
        );
    }

    if (!rows) {
        // Skeleton
        return (
            <div className="flex flex-col">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 border-b border-secondary px-3 py-2.5 last:border-b-0">
                        <div className="h-3 w-5 animate-pulse rounded bg-secondary" />
                        <div className="size-6 animate-pulse rounded bg-secondary" />
                        <div className="h-3 flex-1 animate-pulse rounded bg-secondary" />
                        <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
                    </div>
                ))}
            </div>
        );
    }

    const lastRound = rows[0] ? rows.reduce((max, r) => Math.max(max, r.played), 0) : 0;

    return (
        <div className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs">
            <div className="flex items-center justify-between border-b border-secondary px-4 py-2.5">
                <h3 className="text-sm font-bold text-primary">{title}</h3>
                {lastRound > 0 && (
                    <span className="text-xs text-tertiary">po {lastRound}. kolejce</span>
                )}
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[28px_1fr_28px_40px_24px_24px_24px_52px] items-center border-b border-secondary px-3 py-1.5">
                <span />
                <span className="text-xs font-medium uppercase tracking-wide text-quaternary">Drużyna</span>
                <span className="text-center text-xs font-medium uppercase tracking-wide text-quaternary">M</span>
                <span className="text-center text-xs font-medium uppercase tracking-wide text-quaternary">Pkt</span>
                <span className="text-center text-xs font-medium uppercase tracking-wide text-quaternary">Z</span>
                <span className="text-center text-xs font-medium uppercase tracking-wide text-quaternary">R</span>
                <span className="text-center text-xs font-medium uppercase tracking-wide text-quaternary">P</span>
                <span className="text-center text-xs font-medium uppercase tracking-wide text-quaternary">B</span>
            </div>

            {rows.map((row, idx) => {
                const dbName = resolveClubName(row.team_name);
                const crestUrl = getClubCrestUrl(dbName) ?? row.team_badge;
                const displayName = getClubDisplayName(dbName);
                // Abbreviation: first letters of each word, max 3 chars
                const abbr = displayName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 3);

                return (
                    <div
                        key={row.team_id}
                        className={`grid grid-cols-[28px_1fr_28px_40px_24px_24px_24px_52px] items-center px-3 py-2 ${
                            idx < rows.length - 1 ? "border-b border-secondary" : ""
                        }`}
                    >
                        {/* Position */}
                        <span className="text-center text-xs tabular-nums text-tertiary">{row.place}</span>

                        {/* Crest + name */}
                        <div className="flex min-w-0 items-center gap-2">
                            {crestUrl ? (
                                <img src={crestUrl} alt={abbr} className="size-6 shrink-0 rounded object-contain" />
                            ) : (
                                <div className="flex size-6 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-bold text-tertiary">
                                    {abbr.charAt(0)}
                                </div>
                            )}
                            <span className="text-sm font-semibold text-primary">{abbr}</span>
                            {descDot(row.description)}
                        </div>

                        {/* Played */}
                        <span className="text-center text-sm tabular-nums text-secondary">{row.played}</span>

                        {/* Points */}
                        <span className="text-center text-sm font-bold tabular-nums text-primary">{row.points}</span>

                        {/* W / D / L */}
                        <span className="text-center text-sm tabular-nums text-secondary">{row.won}</span>
                        <span className="text-center text-sm tabular-nums text-secondary">{row.drawn}</span>
                        <span className="text-center text-sm tabular-nums text-secondary">{row.lost}</span>

                        {/* Goals */}
                        <span className="text-center text-xs tabular-nums text-secondary">
                            {row.goals_for}:{row.goals_against}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
