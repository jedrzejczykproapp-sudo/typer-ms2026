"use client";

import { useState, useRef, useCallback } from "react";
import { Check } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
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
    venue: string | null;
}

interface Props {
    fixture: ZakladFixture;
    zakladId: string;
    myPrediction: { home: number; away: number } | null;
    myPoints: number | null;
    onPredict?: (home: number, away: number) => void;
}

function TeamLogo({ badge, name }: { badge: string; name: string }) {
    const [err, setErr] = useState(false);
    if (!badge || err) {
        return (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-tertiary">
                {name.charAt(0)}
            </div>
        );
    }
    return (
        <img
            src={badge}
            alt={name}
            className="size-12 shrink-0 rounded-xl object-contain p-1"
            onError={() => setErr(true)}
        />
    );
}

function ScoreInput({
    value,
    onChange,
    disabled,
}: {
    value: number;
    onChange: (v: number) => void;
    disabled: boolean;
}) {
    const btnClass =
        "flex size-10 items-center justify-center rounded-xl border border-secondary bg-secondary text-2xl font-bold text-primary transition hover:bg-secondary_hover disabled:cursor-not-allowed disabled:opacity-40";
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                disabled={disabled || value <= 0}
                onClick={() => onChange(Math.max(0, value - 1))}
                className={btnClass}
            >
                −
            </button>
            <span className="w-8 text-center text-3xl font-bold tabular-nums text-primary">{value}</span>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(Math.min(20, value + 1))}
                className={btnClass}
            >
                +
            </button>
        </div>
    );
}

function formatMatchDate(dateStr: string) {
    const d = new Date(dateStr.replace(" ", "T"));
    return new Intl.DateTimeFormat("pl-PL", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}

function calcLiveState(matchDate: string): {
    minute: number;
    half: 1 | 2 | null;
    isHalftime: boolean;
    progress: number;
} {
    const start = new Date(matchDate.replace(" ", "T")).getTime();
    const elapsed = (Date.now() - start) / 60000;
    if (elapsed <= 45) {
        return { minute: Math.max(1, Math.floor(elapsed)), half: 1, isHalftime: false, progress: (elapsed / 90) * 100 };
    }
    if (elapsed <= 60) {
        return { minute: 45, half: null, isHalftime: true, progress: 50 };
    }
    const secondHalfMin = elapsed - 15;
    return {
        minute: Math.min(Math.floor(secondHalfMin), 90),
        half: 2,
        isHalftime: false,
        progress: Math.min((secondHalfMin / 90) * 100, 100),
    };
}

function calcProvisionalPoints(ph: number, pa: number, ah: number, aa: number): number {
    if (ph === ah && pa === aa) return 3;
    if (Math.sign(ph - pa) === Math.sign(ah - aa)) return 1;
    return 0;
}

export function ZakladFixtureCard({ fixture, zakladId, myPrediction, myPoints, onPredict }: Props) {
    // Current UI scores
    const [homeScore, setHomeScore] = useState(myPrediction?.home ?? 0);
    const [awayScore, setAwayScore] = useState(myPrediction?.away ?? 0);
    // Last saved values — used to detect unsaved changes
    const [savedHome, setSavedHome] = useState(myPrediction?.home ?? 0);
    const [savedAway, setSavedAway] = useState(myPrediction?.away ?? 0);
    const [hasSaved, setHasSaved] = useState(!!myPrediction);
    const [justSaved, setJustSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestScores = useRef({ home: myPrediction?.home ?? 0, away: myPrediction?.away ?? 0 });

    const now = new Date();
    const matchTime = new Date(fixture.match_date.replace(" ", "T"));
    const isStarted = matchTime <= now;
    const isFinished =
        fixture.match_status === "FT" ||
        fixture.match_status === "AET" ||
        fixture.match_status === "PEN" ||
        fixture.match_status === "Finished";
    const isLive = !isFinished && isStarted;
    const isLocked = isStarted;
    const hasScore = fixture.home_score !== "" && fixture.away_score !== "";
    const liveState = isLive ? calcLiveState(fixture.match_date) : null;
    const hasPrediction = myPrediction !== null || hasSaved;

    // Whether current scores differ from last saved
    const hasChanged = homeScore !== savedHome || awayScore !== savedAway;

    // Points display
    const displayPoints = (() => {
        if (myPoints !== null) return myPoints;
        if (isFinished && hasPrediction && hasScore) {
            const ah = parseInt(fixture.home_score);
            const aa = parseInt(fixture.away_score);
            if (!isNaN(ah) && !isNaN(aa)) return calcProvisionalPoints(homeScore, awayScore, ah, aa);
        }
        return null;
    })();

    const doSave = useCallback(async (home: number, away: number) => {
        setSaving(true);
        try {
            await fetch(`/api/zaklady/${zakladId}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fixture_id: fixture.id, predicted_home: home, predicted_away: away }),
            });
            setSavedHome(home);
            setSavedAway(away);
            setHasSaved(true);
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 2000);
        } catch {
            /* silent */
        }
        setSaving(false);
    }, [zakladId, fixture.id]);

    const scheduleAutoSave = useCallback((home: number, away: number) => {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(() => doSave(home, away), 700);
    }, [doSave]);

    function handleHomeChange(v: number) {
        setHomeScore(v);
        latestScores.current = { home: v, away: latestScores.current.away };
        onPredict?.(v, latestScores.current.away);
        scheduleAutoSave(v, latestScores.current.away);
    }

    function handleAwayChange(v: number) {
        setAwayScore(v);
        latestScores.current = { home: latestScores.current.home, away: v };
        onPredict?.(latestScores.current.home, v);
        scheduleAutoSave(latestScores.current.home, v);
    }

    function handleSave() {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        doSave(homeScore, awayScore);
    }

    return (
        <div
            className={cx(
                "flex flex-col gap-4 rounded-xl border bg-primary p-4 transition",
                isFinished ? "border-secondary" : "border-secondary shadow-xs",
            )}
        >
            {/* Header: liga (left) | live/finished badge (center) | data (right) */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-tertiary">
                    <span>{fixture.league_flag}</span>
                    <span className="truncate">{fixture.league_name}</span>
                </span>
                <div className="flex justify-center">
                    {isLive && (
                        <span className="flex items-center gap-1 rounded-full bg-success-primary px-2 py-0.5 text-xs font-bold text-success-primary">
                            <span className="size-1.5 animate-pulse rounded-full bg-success-solid" />
                            Trwa
                        </span>
                    )}
                    {isFinished && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-tertiary">
                            Zakończony
                        </span>
                    )}
                </div>
                <span className="text-right text-xs text-tertiary">{formatMatchDate(fixture.match_date)}</span>
            </div>

            {/* Venue */}
            {fixture.venue && (
                <p className="text-center text-[11px] font-medium uppercase tracking-wider text-quaternary">
                    {fixture.venue}
                </p>
            )}

            {/* Score row */}
            <div className="flex items-center gap-2">
                <div className="flex flex-1 justify-center">
                    {(isLive || isFinished) && hasScore ? (
                        <span className="text-4xl font-bold tabular-nums text-primary">{fixture.home_score}</span>
                    ) : (
                        <ScoreInput value={homeScore} onChange={handleHomeChange} disabled={isLocked} />
                    )}
                </div>
                <span className={cx("shrink-0 text-2xl font-bold", isLive ? "text-white" : "text-tertiary")}>:</span>
                <div className="flex flex-1 justify-center">
                    {(isLive || isFinished) && hasScore ? (
                        <span className="text-4xl font-bold tabular-nums text-primary">{fixture.away_score}</span>
                    ) : (
                        <ScoreInput value={awayScore} onChange={handleAwayChange} disabled={isLocked} />
                    )}
                </div>
            </div>

            {/* Teams row */}
            <div className="flex items-start gap-2">
                <div className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative">
                        <TeamLogo badge={fixture.home_badge} name={fixture.home_name} />
                        {fixture.home_position && (
                            <span className="absolute -right-1 -bottom-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-secondary bg-primary px-1 text-[10px] font-bold tabular-nums text-tertiary shadow-sm">
                                {fixture.home_position}
                            </span>
                        )}
                    </div>
                    <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-primary">
                        {fixture.home_name}
                    </span>
                </div>
                <div className="flex shrink-0 items-center justify-center pt-4">
                    <span className="text-xs font-medium text-quaternary">vs</span>
                </div>
                <div className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative">
                        <TeamLogo badge={fixture.away_badge} name={fixture.away_name} />
                        {fixture.away_position && (
                            <span className="absolute -right-1 -bottom-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-secondary bg-primary px-1 text-[10px] font-bold tabular-nums text-tertiary shadow-sm">
                                {fixture.away_position}
                            </span>
                        )}
                    </div>
                    <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-primary">
                        {fixture.away_name}
                    </span>
                </div>
            </div>

            {/* Live progress bar */}
            {isLive && liveState && (
                <div className="flex flex-col gap-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                            className="h-full rounded-full bg-success-solid transition-all duration-1000"
                            style={{ width: `${liveState.progress}%` }}
                        />
                    </div>
                    <p className="text-center text-xs font-medium text-tertiary">
                        {liveState.isHalftime
                            ? "Przerwa"
                            : liveState.half === 1
                              ? `1. połowa · ${liveState.minute}'`
                              : `2. połowa · ${liveState.minute}'`}
                    </p>
                </div>
            )}

            {/* Points badge after finished */}
            {isFinished && hasPrediction && (
                <div className="flex flex-col items-center gap-1">
                    <div
                        className={cx(
                            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                            displayPoints === 3
                                ? "bg-success-primary text-success-primary"
                                : displayPoints === 1
                                  ? "bg-brand-primary text-brand-primary"
                                  : "bg-secondary text-tertiary",
                        )}
                    >
                        {displayPoints === 3
                            ? "Dokładny wynik"
                            : displayPoints === 1
                              ? "Poprawny wynik"
                              : "0 pkt"}
                        {displayPoints !== null && ` · ${displayPoints} pkt`}
                    </div>
                    <p className="text-center text-xs text-tertiary">
                        Twój typ: {homeScore}:{awayScore}
                    </p>
                </div>
            )}

            {/* Odds row — only when upcoming */}
            {(fixture.odds_home || fixture.odds_draw || fixture.odds_away) && !isLocked && (
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
                                <span className="text-sm font-semibold tabular-nums text-primary">
                                    {value.toFixed(2)}
                                </span>
                            </div>
                        ) : null,
                    )}
                </div>
            )}

            {/* Save button — upcoming only */}
            {!isLocked && (
                hasSaved && !hasChanged ? (
                    <div className="flex h-9 w-full items-center justify-center gap-1.5 text-sm font-medium text-tertiary">
                        <Check className="size-4 shrink-0" />
                        Typ zapisany
                    </div>
                ) : (
                    <Button
                        size="sm"
                        color={justSaved ? "secondary" : "primary"}
                        isLoading={saving}
                        showTextWhileLoading
                        onClick={handleSave}
                        isDisabled={saving}
                        iconLeading={justSaved ? Check : undefined}
                        className="w-full"
                    >
                        {justSaved ? "Zapisano!" : "Zapisz typ"}
                    </Button>
                )
            )}

            {/* Locked but not finished — show user's prediction */}
            {isLocked && !isFinished && (
                hasPrediction ? (
                    <div className="flex items-center justify-between border-t border-secondary pt-3">
                        <span className="text-xs text-tertiary">Twój typ</span>
                        <span className="rounded-xl bg-brand-secondary px-3 py-1.5 text-sm font-bold text-fg-brand-primary">
                            {homeScore}:{awayScore}
                        </span>
                    </div>
                ) : (
                    <p className="border-t border-secondary pt-3 text-center text-xs text-tertiary">
                        Mecz już się rozpoczął — typowanie zablokowane
                    </p>
                )
            )}
        </div>
    );
}
