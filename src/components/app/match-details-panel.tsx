"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchEvent, MatchStats } from "@/types/database";
import { getTeamNamePl } from "@/lib/flags";
import { getClubDisplayName } from "@/lib/clubs";
import { cx } from "@/utils/cx";

interface Props {
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    competitionType?: string;
    isLive?: boolean;
}

function displayName(team: string, ct?: string) {
    return ct === "ekstraklasa_2526" ? getClubDisplayName(team) : getTeamNamePl(team);
}

function EventMark({ type }: { type: string }) {
    if (type === "yellow_card") {
        return (
            <span className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] bg-yellow-400" />
        );
    }
    if (type === "red_card" || type === "yellow_red_card") {
        return (
            <span className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] bg-red-500" />
        );
    }
    // goal / own_goal / penalty
    return <span className="text-sm leading-none">⚽</span>;
}

function eventLabel(evt: MatchEvent) {
    if (evt.event_type === "own_goal") return `${evt.player_name ?? "?"} (własna)`;
    if (evt.event_type === "penalty") return `${evt.player_name ?? "?"} (k.)`;
    return evt.player_name ?? "?";
}

function StatBar({
    label,
    home,
    away,
    unit = "",
}: {
    label: string;
    home: number | null;
    away: number | null;
    unit?: string;
}) {
    const total = (home ?? 0) + (away ?? 0);
    const homePct = total > 0 ? ((home ?? 0) / total) * 100 : 50;
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
                <span className="w-8 font-semibold tabular-nums text-primary">
                    {home ?? "—"}{unit}
                </span>
                <span className="text-quaternary">{label}</span>
                <span className="w-8 text-right font-semibold tabular-nums text-primary">
                    {away ?? "—"}{unit}
                </span>
            </div>
            <div className="flex h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                    className="h-full rounded-full bg-brand-solid transition-all duration-500"
                    style={{ width: `${homePct}%` }}
                />
            </div>
        </div>
    );
}

export function MatchDetailsPanel({ matchId, homeTeam, awayTeam, competitionType, isLive }: Props) {
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [stats, setStats] = useState<MatchStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        let cancelled = false;

        async function load() {
            setLoading(true);
            const [{ data: evts }, { data: st }] = await Promise.all([
                supabase
                    .from("match_events")
                    .select("*")
                    .eq("match_id", matchId)
                    .order("minute", { ascending: true })
                    .order("extra_minute", { ascending: true }),
                supabase
                    .from("match_stats")
                    .select("*")
                    .eq("match_id", matchId)
                    .maybeSingle(),
            ]);
            if (!cancelled) {
                setEvents(evts ?? []);
                setStats(st ?? null);
                setLoading(false);
            }
        }

        load();

        // Poll every 60 s during live matches
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isLive) {
            interval = setInterval(load, 60_000);
        }

        return () => {
            cancelled = true;
            if (interval) clearInterval(interval);
        };
    }, [matchId, isLive]);

    if (loading) {
        return (
            <div className="flex flex-col gap-2 rounded-xl border border-secondary bg-secondary/40 p-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="h-3 w-8 animate-pulse rounded-full bg-secondary" />
                        <div className="h-3 flex-1 animate-pulse rounded-full bg-secondary" />
                        <div className="h-3 w-8 animate-pulse rounded-full bg-secondary" />
                    </div>
                ))}
            </div>
        );
    }

    const hasEvents = events.length > 0;
    const hasStats = stats !== null;

    if (!hasEvents && !hasStats) {
        return (
            <div className="rounded-xl border border-secondary bg-secondary/40 px-3 py-6 text-center text-xs text-quaternary">
                Brak szczegółów meczu
            </div>
        );
    }

    const homeName = displayName(homeTeam, competitionType);
    const awayName = displayName(awayTeam, competitionType);

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-secondary/40 p-3">
            {/* Header: team names */}
            <div className="grid grid-cols-[1fr_auto_1fr] text-center text-[10px] font-semibold uppercase tracking-wider text-quaternary">
                <span className="truncate text-left">{homeName}</span>
                <span className="px-2">·</span>
                <span className="truncate text-right">{awayName}</span>
            </div>

            {/* Events timeline */}
            {hasEvents && (
                <div className="flex flex-col gap-0">
                    {events.map((evt) => (
                        <div
                            key={evt.id}
                            className="grid grid-cols-[1fr_36px_1fr] items-center gap-1 py-[3px]"
                        >
                            {evt.team === "home" ? (
                                <>
                                    <div className="flex items-center justify-end gap-1.5 min-w-0">
                                        <span className="truncate text-right text-xs text-primary">
                                            {eventLabel(evt)}
                                        </span>
                                        <EventMark type={evt.event_type} />
                                    </div>
                                    <span className="text-center text-[11px] tabular-nums text-tertiary">
                                        {evt.minute}{evt.extra_minute ? `+${evt.extra_minute}` : ""}′
                                    </span>
                                    <div />
                                </>
                            ) : (
                                <>
                                    <div />
                                    <span className="text-center text-[11px] tabular-nums text-tertiary">
                                        {evt.minute}{evt.extra_minute ? `+${evt.extra_minute}` : ""}′
                                    </span>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <EventMark type={evt.event_type} />
                                        <span className="truncate text-xs text-primary">
                                            {eventLabel(evt)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Divider between events and stats */}
            {hasEvents && hasStats && <div className="h-px bg-secondary" />}

            {/* Statistics */}
            {hasStats && (
                <div className="flex flex-col gap-2.5">
                    {(
                        [
                            { label: "Posiadanie", home: stats.home_possession, away: stats.away_possession, unit: "%" },
                            { label: "Strzały", home: stats.home_shots, away: stats.away_shots },
                            { label: "Celne", home: stats.home_shots_on_target, away: stats.away_shots_on_target },
                            { label: "Rzuty rożne", home: stats.home_corners, away: stats.away_corners },
                            { label: "Faule", home: stats.home_fouls, away: stats.away_fouls },
                        ] as const
                    )
                        .filter((s) => s.home !== null || s.away !== null)
                        .map((s) => (
                            <StatBar key={s.label} {...s} />
                        ))}
                </div>
            )}
        </div>
    );
}
