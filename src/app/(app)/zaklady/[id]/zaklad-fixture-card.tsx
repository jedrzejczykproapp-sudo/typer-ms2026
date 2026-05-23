"use client";

import { useState } from "react";
import { cx } from "@/utils/cx";

interface ZakladFixture {
    id: string;
    league_name: string;
    league_flag: string;
    match_date: string;
    home_name: string;
    home_badge: string;
    home_position: number | null;
    away_name: string;
    away_badge: string;
    away_position: number | null;
    home_score: string;
    away_score: string;
    match_status: string;
    odds_home: number | null;
    odds_draw: number | null;
    odds_away: number | null;
}

interface Props {
    fixture: ZakladFixture;
    myPrediction: "1" | "X" | "2" | null;
    myPoints: number | null;
    onPredict: (val: "1" | "X" | "2") => void;
}

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

function formatTime(dateStr: string) {
    const parts = dateStr.split(" ");
    return parts[1]?.slice(0, 5) ?? "";
}

export function ZakladFixtureCard({ fixture, myPrediction, myPoints, onPredict }: Props) {
    const now = new Date();
    const matchTime = new Date(fixture.match_date.replace(" ", "T"));
    const isStarted = matchTime <= now;
    const isFinished =
        fixture.match_status === "FT" ||
        fixture.match_status === "AET" ||
        fixture.match_status === "PEN" ||
        fixture.match_status === "Finished";
    const isLive =
        !isFinished &&
        isStarted &&
        fixture.match_status !== "" &&
        fixture.match_status !== "upcoming";
    const hasScore = fixture.home_score !== "" && fixture.away_score !== "";
    const isLocked = isStarted || isFinished;

    const options: { label: string; value: "1" | "X" | "2" }[] = [
        { label: "1", value: "1" },
        { label: "X", value: "X" },
        { label: "2", value: "2" },
    ];

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-4 shadow-xs">
            {/* League + time/status */}
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-tertiary">
                    <span>{fixture.league_flag}</span>
                    <span>{fixture.league_name}</span>
                </span>
                {isLive ? (
                    <span className="flex items-center gap-1 rounded-full bg-success-primary px-2 py-0.5 text-xs font-bold text-success-primary">
                        <span className="size-1.5 animate-pulse rounded-full bg-success-solid" />
                        {fixture.match_status}′
                    </span>
                ) : isFinished ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-tertiary">
                        Zakończony
                    </span>
                ) : (
                    <span className="text-xs font-medium text-tertiary">{formatTime(fixture.match_date)}</span>
                )}
            </div>

            {/* Teams */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                        <TeamLogo badge={fixture.home_badge} name={fixture.home_name} />
                        {fixture.home_position && (
                            <span className="absolute -right-1 -bottom-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-secondary bg-primary px-1 text-[10px] font-bold tabular-nums text-tertiary shadow-sm">
                                {fixture.home_position}
                            </span>
                        )}
                    </div>
                    <span className="line-clamp-2 w-full text-center text-xs font-semibold leading-tight text-primary">
                        {fixture.home_name}
                    </span>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                    {(isLive || isFinished) && hasScore ? (
                        <span className="text-xl font-bold tabular-nums text-primary">
                            {fixture.home_score}:{fixture.away_score}
                        </span>
                    ) : (
                        <span className="text-sm font-bold text-tertiary">vs</span>
                    )}
                </div>

                <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                        <TeamLogo badge={fixture.away_badge} name={fixture.away_name} />
                        {fixture.away_position && (
                            <span className="absolute -right-1 -bottom-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-secondary bg-primary px-1 text-[10px] font-bold tabular-nums text-tertiary shadow-sm">
                                {fixture.away_position}
                            </span>
                        )}
                    </div>
                    <span className="line-clamp-2 w-full text-center text-xs font-semibold leading-tight text-primary">
                        {fixture.away_name}
                    </span>
                </div>
            </div>

            {/* Odds row */}
            {(fixture.odds_home || fixture.odds_draw || fixture.odds_away) && (
                <div className="flex gap-2">
                    {[
                        { label: "1", value: fixture.odds_home },
                        { label: "X", value: fixture.odds_draw },
                        { label: "2", value: fixture.odds_away },
                    ].map(({ label, value }) =>
                        value ? (
                            <div
                                key={label}
                                className="flex flex-1 items-center justify-center gap-1 rounded-md border border-secondary py-1.5"
                            >
                                <span className="text-xs text-tertiary">{label}</span>
                                <span className="text-xs font-semibold tabular-nums text-primary">
                                    {value.toFixed(2)}
                                </span>
                            </div>
                        ) : null,
                    )}
                </div>
            )}

            {/* Prediction buttons / result */}
            <div className="border-t border-secondary pt-3">
                {isFinished && myPrediction ? (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-tertiary">Twój typ: <strong className="text-primary">{myPrediction}</strong></span>
                        {myPoints !== null ? (
                            <span className={cx(
                                "rounded-full px-2 py-0.5 text-xs font-bold",
                                myPoints > 0 ? "bg-success-primary text-success-primary" : "bg-secondary text-tertiary",
                            )}>
                                {myPoints > 0 ? `+${myPoints} pkt` : "0 pkt"}
                            </span>
                        ) : (
                            <span className="text-xs text-tertiary">wynik w trakcie obliczania</span>
                        )}
                    </div>
                ) : isLocked && myPrediction ? (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-tertiary">Twój typ</span>
                        <span className="rounded-xl bg-brand-secondary px-3 py-1 text-sm font-bold text-fg-brand-primary">
                            {myPrediction}
                        </span>
                    </div>
                ) : isLocked ? (
                    <p className="text-center text-xs text-tertiary">Mecz już się rozpoczął — typowanie zablokowane</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        <p className="text-center text-xs text-tertiary">Twój typ</p>
                        <div className="flex gap-2">
                            {options.map(({ label, value }) => (
                                <button
                                    key={value}
                                    onClick={() => onPredict(value)}
                                    className={cx(
                                        "flex flex-1 items-center justify-center rounded-xl border py-2 text-sm font-bold transition duration-100",
                                        myPrediction === value
                                            ? "border-brand-solid bg-brand-secondary text-fg-brand-primary"
                                            : "border-secondary bg-primary text-tertiary hover:border-brand-solid hover:bg-brand-secondary hover:text-fg-brand-primary",
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
