"use client";

import { useState } from "react";
import { CheckCircle, PlusCircle } from "@untitledui/icons";
import type { Fixture } from "@/app/api/top-fixtures/route";
import { cx } from "@/utils/cx";
import { getTeamNamePl, getFlagUrl } from "@/lib/flags";

function TeamLogo({ badge, name }: { badge: string; name: string }) {
    const [err, setErr] = useState(false);
    if (!badge || err) {
        return (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-tertiary">
                {name.charAt(0)}
            </div>
        );
    }
    return (
        <img
            src={badge}
            alt={name}
            className="size-10 shrink-0 rounded-xl object-contain p-0.5"
            onError={() => setErr(true)}
        />
    );
}

function PositionBadge({ pos }: { pos: number | null }) {
    if (!pos) return null;
    return (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold tabular-nums text-tertiary">
            {pos}
        </span>
    );
}

function formatTime(dateStr: string) {
    // dateStr: "2026-05-24 18:00:00" or "2026-05-24 18:00"
    const parts = dateStr.split(" ");
    return parts[1]?.slice(0, 5) ?? "";
}

function formatDay(dateStr: string) {
    const d = new Date(dateStr.replace(" ", "T"));
    return new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "short" }).format(d);
}

interface OddsRow {
    home: number;
    draw: number;
    away: number;
}

interface Props {
    fixture: Fixture;
    odds?: OddsRow;
    selectable?: boolean;
    selected?: boolean;
    onToggle?: () => void;
}

export function FixtureCard({ fixture, odds, selectable, selected, onToggle }: Props) {
    const isWC = fixture.league_id === "28";
    const homeName  = isWC ? getTeamNamePl(fixture.home.name) : fixture.home.name;
    const awayName  = isWC ? getTeamNamePl(fixture.away.name) : fixture.away.name;
    const homeBadge = isWC ? (getFlagUrl(fixture.home.name) ?? fixture.home.badge) : fixture.home.badge;
    const awayBadge = isWC ? (getFlagUrl(fixture.away.name) ?? fixture.away.badge) : fixture.away.badge;

    const time = formatTime(fixture.match_date);
    const isLive = fixture.status === "1" || fixture.match_id && parseInt(fixture.status) > 0 && fixture.status !== "FT" && fixture.status !== "";
    const isFinished = fixture.status === "FT" || fixture.status === "AET" || fixture.status === "PEN" || fixture.status === "Finished";
    const hasScore = fixture.home_score !== "" && fixture.away_score !== "";

    return (
        <div
            className={cx(
                "flex flex-col gap-3 rounded-xl border bg-primary p-4 shadow-xs transition duration-100",
                selected ? "border-brand-solid ring-2 ring-brand-solid/20" : "border-secondary",
                selectable && "cursor-pointer",
            )}
            onClick={selectable ? onToggle : undefined}
        >
            {/* League + time */}
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-tertiary">
                    <span>{fixture.league_flag}</span>
                    <span>{fixture.league_name}</span>
                </span>
                <div className="flex items-center gap-2">
                    {isLive ? (
                        <span className="flex items-center gap-1 rounded-full bg-success-primary px-2 py-0.5 text-xs font-bold text-success-primary">
                            <span className="size-1.5 animate-pulse rounded-full bg-success-solid" />
                            {fixture.status}′
                        </span>
                    ) : isFinished ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-tertiary">Zakończony</span>
                    ) : (
                        <span className="text-xs font-medium text-tertiary">{time}</span>
                    )}
                    {selectable && (
                        selected
                            ? <CheckCircle className="size-5 text-fg-brand-primary" />
                            : <PlusCircle className="size-5 text-fg-quaternary" />
                    )}
                </div>
            </div>

            {/* Teams row */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                {/* Home */}
                <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                        <TeamLogo badge={homeBadge} name={homeName} />
                        {fixture.home.position && (
                            <span className="absolute -right-1 -bottom-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary border border-secondary px-1 text-[10px] font-bold tabular-nums text-tertiary shadow-sm">
                                {fixture.home.position}
                            </span>
                        )}
                    </div>
                    <span className="line-clamp-2 w-full text-center text-xs font-semibold leading-tight text-primary">
                        {homeName}
                    </span>
                </div>

                {/* Score / VS */}
                <div className="flex flex-col items-center gap-0.5">
                    {(isLive || isFinished) && hasScore ? (
                        <span className="text-xl font-bold tabular-nums text-primary">
                            {fixture.home_score}:{fixture.away_score}
                        </span>
                    ) : (
                        <span className="text-sm font-bold text-tertiary">vs</span>
                    )}
                </div>

                {/* Away */}
                <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                        <TeamLogo badge={awayBadge} name={awayName} />
                        {fixture.away.position && (
                            <span className="absolute -right-1 -bottom-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary border border-secondary px-1 text-[10px] font-bold tabular-nums text-tertiary shadow-sm">
                                {fixture.away.position}
                            </span>
                        )}
                    </div>
                    <span className="line-clamp-2 w-full text-center text-xs font-semibold leading-tight text-primary">
                        {awayName}
                    </span>
                </div>
            </div>

            {/* Odds */}
            {odds && (
                <div className="flex gap-2">
                    {[
                        { label: "1", value: odds.home },
                        { label: "X", value: odds.draw },
                        { label: "2", value: odds.away },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex flex-1 items-center justify-center gap-1 rounded-md border border-secondary py-1.5">
                            <span className="text-xs text-tertiary">{label}</span>
                            <span className="text-xs font-semibold tabular-nums text-primary">{value.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
