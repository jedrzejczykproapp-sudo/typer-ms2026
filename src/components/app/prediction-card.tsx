"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, Lock01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Avatar } from "@/components/base/avatar/avatar";
import { upsertPrediction } from "@/actions/prediction-actions";
import { getFlagUrl, getTeamNamePl } from "@/lib/flags";
import { getClubCrestUrl } from "@/lib/clubs";
import { createClient } from "@/lib/supabase/client";
import type { Match, Prediction } from "@/types/database";
import type { MatchOdds } from "@/lib/odds";
import { cx } from "@/utils/cx";

interface PredictionCardProps {
    match: Match;
    groupId: string;
    prediction?: Prediction;
    odds?: MatchOdds;
    competitionType?: string;
}

const stageLabels: Record<string, string> = {
    group: "Faza grupowa",
    round_of_32: "1/16 finału",
    round_of_16: "1/8 finału",
    quarter: "Ćwierćfinał",
    semi: "Półfinał",
    third_place: "Mecz o 3. miejsce",
    final: "Finał",
};

function formatMatchDate(dateStr: string) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("pl-PL", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function calcLiveState(matchDate: string): { minute: number; isHalftime: boolean; progress: number } {
    const start = new Date(matchDate).getTime();
    const elapsed = (Date.now() - start) / 60000; // elapsed minutes

    let minute: number;
    let isHalftime: boolean;
    let progress: number;

    if (elapsed <= 45) {
        minute = Math.max(1, Math.floor(elapsed));
        isHalftime = false;
        progress = (elapsed / 90) * 100;
    } else if (elapsed <= 60) {
        // Approximate halftime window (~15 min break)
        minute = 45;
        isHalftime = true;
        progress = 50;
    } else {
        // Second half (subtract ~15 min halftime)
        const secondHalfMin = elapsed - 15;
        minute = Math.min(Math.floor(secondHalfMin), 90);
        isHalftime = false;
        progress = Math.min((secondHalfMin / 90) * 100, 100);
    }

    return { minute, isHalftime, progress };
}

function calcProvisionalPoints(ph: number, pa: number, ah: number, aa: number): number {
    if (ph === ah && pa === aa) return 3;
    if (Math.sign(ph - pa) === Math.sign(ah - aa)) return 1;
    return 0;
}

type MemberPrediction = {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    predicted_home: number;
    predicted_away: number;
    points: number | null;
};

function ScoreInput({
    value,
    onChange,
    disabled,
}: {
    value: number;
    onChange: (v: number) => void;
    disabled: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                disabled={disabled || value <= 0}
                onClick={() => onChange(Math.max(0, value - 1))}
                className="flex size-11 items-center justify-center rounded-xl bg-secondary text-2xl font-bold text-primary transition hover:bg-secondary_hover disabled:cursor-not-allowed disabled:opacity-40"
            >
                −
            </button>
            <span className="w-10 text-center text-3xl font-bold tabular-nums text-primary">{value}</span>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(Math.min(20, value + 1))}
                className="flex size-11 items-center justify-center rounded-xl bg-secondary text-2xl font-bold text-primary transition hover:bg-secondary_hover disabled:cursor-not-allowed disabled:opacity-40"
            >
                +
            </button>
        </div>
    );
}

function TeamFlag({ teamName, competitionType }: { teamName: string; competitionType?: string }) {
    const [imgError, setImgError] = useState(false);
    const isEkstraklasa = competitionType === "ekstraklasa_2526";
    const url = isEkstraklasa ? getClubCrestUrl(teamName) : getFlagUrl(teamName);

    if (!url || imgError) {
        if (isEkstraklasa) {
            // Club initial fallback
            return (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-tertiary">
                    {teamName.charAt(0)}
                </div>
            );
        }
        return <div className="size-8 shrink-0 rounded-lg bg-secondary" />;
    }

    return (
        <img
            src={url}
            alt={teamName}
            className={`size-8 shrink-0 rounded-lg ${isEkstraklasa ? "object-contain p-0.5" : "object-cover"}`}
            onError={() => setImgError(true)}
        />
    );
}

export function PredictionCard({ match, groupId, prediction, odds, competitionType }: PredictionCardProps) {
    const isLocked = match.status !== "upcoming";
    const isFinished = match.status === "finished";
    const isLive = match.status === "live";
    const isTbd = match.home_team === "TBD";

    const [homeScore, setHomeScore] = useState(prediction?.predicted_home ?? 0);
    const [awayScore, setAwayScore] = useState(prediction?.predicted_away ?? 0);
    const [localPrediction, setLocalPrediction] = useState(prediction);
    const [saved, setSaved] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Live state
    const [liveState, setLiveState] = useState(() =>
        isLive ? calcLiveState(match.match_date) : null,
    );

    // "Zobacz typy" expansion
    const [isExpanded, setIsExpanded] = useState(false);
    const [memberPreds, setMemberPreds] = useState<MemberPrediction[]>([]);
    const [isLoadingPreds, setIsLoadingPreds] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (prediction && !saved) {
            setLocalPrediction(prediction);
            setHomeScore(prediction.predicted_home);
            setAwayScore(prediction.predicted_away);
        }
    }, [prediction?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update live minute/progress every 30s
    useEffect(() => {
        if (!isLive) return;
        const tick = () => setLiveState(calcLiveState(match.match_date));
        tick();
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, [isLive, match.match_date]);

    const fetchMemberPredictions = useCallback(async () => {
        setIsLoadingPreds(true);
        const supabase = createClient();

        const { data: preds } = await supabase
            .from("predictions")
            .select("user_id, predicted_home, predicted_away, points")
            .eq("match_id", match.id)
            .eq("group_id", groupId);

        if (!preds?.length) {
            setMemberPreds([]);
            setIsLoadingPreds(false);
            return;
        }

        const userIds = preds.map((p) => p.user_id);
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", userIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

        const result: MemberPrediction[] = preds.map((p) => ({
            user_id: p.user_id,
            display_name: profileMap.get(p.user_id)?.display_name ?? null,
            avatar_url: profileMap.get(p.user_id)?.avatar_url ?? null,
            predicted_home: p.predicted_home,
            predicted_away: p.predicted_away,
            points: p.points,
        }));

        setMemberPreds(result);
        setIsLoadingPreds(false);
    }, [match.id, groupId]);

    // Fetch predictions when expanded; poll every 30s during live
    useEffect(() => {
        if (!isExpanded) {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return;
        }

        fetchMemberPredictions();

        if (isLive) {
            pollRef.current = setInterval(fetchMemberPredictions, 30_000);
        }

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [isExpanded, isLive, fetchMemberPredictions]);

    function handleSave() {
        startTransition(async () => {
            const result = await upsertPrediction(match.id, groupId, homeScore, awayScore);
            if (!result?.error) {
                setLocalPrediction({
                    id: localPrediction?.id ?? "",
                    user_id: localPrediction?.user_id ?? "",
                    match_id: match.id,
                    group_id: groupId,
                    predicted_home: homeScore,
                    predicted_away: awayScore,
                    points: localPrediction?.points ?? null,
                    created_at: localPrediction?.created_at ?? new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        });
    }

    const hasPrediction = localPrediction !== undefined;
    const hasChanged = localPrediction
        ? homeScore !== localPrediction.predicted_home || awayScore !== localPrediction.predicted_away
        : true;

    const isSavedDisabled = hasPrediction && !hasChanged && !saved;

    // Sorted member predictions for display
    const sortedMemberPreds = [...memberPreds].sort((a, b) => {
        const getDisplayPoints = (p: MemberPrediction) => {
            if (isFinished) return p.points ?? -1;
            if (isLive && match.home_score !== null && match.away_score !== null) {
                return calcProvisionalPoints(
                    p.predicted_home, p.predicted_away,
                    match.home_score!, match.away_score!,
                );
            }
            return -1;
        };
        return getDisplayPoints(b) - getDisplayPoints(a);
    });

    return (
        <div
            className={cx(
                "flex flex-col gap-4 rounded-xl border bg-primary p-4 transition",
                isFinished ? "border-secondary" : "border-secondary shadow-xs",
                isLocked && "opacity-90",
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-tertiary">
                        {match.group_name ? `Grupa ${match.group_name} · Kolejka ${match.matchday}` : stageLabels[match.stage]}
                    </span>
                    {isLive && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-error-primary px-1.5 py-0.5 text-xs font-bold text-error-primary">
                            <span className="size-1.5 animate-pulse rounded-full bg-error-solid" />
                            NA ŻYWO
                        </span>
                    )}
                </div>
                <span className="shrink-0 text-xs text-tertiary">{formatMatchDate(match.match_date)}</span>
            </div>

            {isTbd ? (
                <p className="py-2 text-center text-sm text-tertiary">Mecz do ustalenia po fazie grupowej</p>
            ) : (
                <>
                    {/* Score row */}
                    {isFinished ? (
                        <div className="flex items-center gap-3">
                            <div className="flex flex-1 justify-center">
                                <span className="text-4xl font-bold tabular-nums text-primary">{match.home_score}</span>
                            </div>
                            <div className="flex w-8 shrink-0 justify-center">
                                <span className="text-2xl text-tertiary">:</span>
                            </div>
                            <div className="flex flex-1 justify-center">
                                <span className="text-4xl font-bold tabular-nums text-primary">{match.away_score}</span>
                            </div>
                        </div>
                    ) : isLive ? (
                        <div className="flex flex-col gap-3">
                            {/* Live score */}
                            <div className="flex items-center gap-3">
                                <div className="flex flex-1 justify-center">
                                    <span className="text-4xl font-bold tabular-nums text-primary">
                                        {match.home_score ?? 0}
                                    </span>
                                </div>
                                <div className="flex w-8 shrink-0 justify-center">
                                    <span className="text-2xl text-error-primary">:</span>
                                </div>
                                <div className="flex flex-1 justify-center">
                                    <span className="text-4xl font-bold tabular-nums text-primary">
                                        {match.away_score ?? 0}
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar + minute */}
                            {liveState && (
                                <div className="flex flex-col gap-1.5">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                        <div
                                            className="h-full rounded-full bg-error-solid transition-all duration-1000"
                                            style={{ width: `${liveState.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-center text-xs font-medium text-error-primary">
                                        {liveState.isHalftime ? "Przerwa" : `${liveState.minute}'`}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex flex-1 justify-center">
                                <ScoreInput value={homeScore} onChange={setHomeScore} disabled={false} />
                            </div>
                            <div className="flex w-8 shrink-0 justify-center">
                                <span className="text-2xl font-bold text-tertiary">:</span>
                            </div>
                            <div className="flex flex-1 justify-center">
                                <ScoreInput value={awayScore} onChange={setAwayScore} disabled={false} />
                            </div>
                        </div>
                    )}

                    {/* Teams row */}
                    <div className="flex items-center gap-3">
                        {/* Home — name right-aligned, flag inner */}
                        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                            <span className="line-clamp-2 min-w-0 text-right text-sm font-semibold leading-tight text-primary">
                                {getTeamNamePl(match.home_team)}
                            </span>
                            <TeamFlag teamName={match.home_team} competitionType={competitionType} />
                        </div>
                        <div className="flex w-6 shrink-0 justify-center">
                            <span className="text-xs font-medium text-tertiary">vs</span>
                        </div>
                        {/* Away — flag inner, name left-aligned */}
                        <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
                            <TeamFlag teamName={match.away_team} competitionType={competitionType} />
                            <span className="line-clamp-2 min-w-0 text-sm font-semibold leading-tight text-primary">
                                {getTeamNamePl(match.away_team)}
                            </span>
                        </div>
                    </div>

                    {/* Points badge after finished */}
                    {isFinished && hasPrediction && (
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cx(
                                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                    localPrediction!.points === 3
                                        ? "bg-success-primary text-success-primary"
                                        : localPrediction!.points === 1
                                          ? "bg-brand-primary text-brand-primary"
                                          : "bg-secondary text-tertiary",
                                )}
                            >
                                {localPrediction!.points === 3 ? "Dokładny wynik" : localPrediction!.points === 1 ? "Poprawny wynik" : "0 pkt"}
                                {localPrediction!.points !== null && ` · ${localPrediction!.points} pkt`}
                            </div>
                            <div className="text-center text-xs text-tertiary">
                                Twój typ: {localPrediction!.predicted_home}:{localPrediction!.predicted_away}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Odds row — upcoming only */}
            {odds && !isTbd && !isLocked && (
                <div className="flex gap-2 border-t border-secondary pt-3">
                    {[
                        { label: "1", value: odds.home },
                        { label: "X", value: odds.draw },
                        { label: "2", value: odds.away },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-secondary py-1">
                            <span className="text-xs text-tertiary">{label}</span>
                            <span className="text-xs font-semibold tabular-nums text-primary">{value.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Save button — upcoming only */}
            {!isLocked && !isTbd && (
                <Button
                    size="sm"
                    color={saved || isSavedDisabled ? "secondary" : "primary"}
                    isLoading={isPending}
                    showTextWhileLoading
                    onClick={handleSave}
                    isDisabled={isSavedDisabled || isPending}
                    iconLeading={saved || isSavedDisabled ? Check : undefined}
                    className="w-full"
                >
                    {saved ? "Zapisano!" : isSavedDisabled ? "Zapisane" : "Zapisz typ"}
                </Button>
            )}

            {/* "Zobacz typy" button — live & finished */}
            {isLocked && !isTbd && (
                <div className="border-t border-secondary pt-1">
                    <button
                        type="button"
                        onClick={() => setIsExpanded((v) => !v)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-secondary transition hover:text-primary"
                    >
                        {isExpanded ? (
                            <>
                                Ukryj typy
                                <ChevronUp className="size-4" />
                            </>
                        ) : (
                            <>
                                Zobacz typy
                                <ChevronDown className="size-4" />
                            </>
                        )}
                    </button>

                    {/* Expanded predictions list */}
                    {isExpanded && (
                        <div className="mt-2 flex flex-col gap-1">
                            {isLoadingPreds ? (
                                <div className="flex flex-col gap-2 py-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="size-7 animate-pulse rounded-full bg-secondary" />
                                            <div className="h-3 flex-1 animate-pulse rounded-full bg-secondary" />
                                            <div className="h-3 w-10 animate-pulse rounded-full bg-secondary" />
                                        </div>
                                    ))}
                                </div>
                            ) : sortedMemberPreds.length === 0 ? (
                                <p className="py-2 text-center text-xs text-quaternary">Brak typów w tej grupie</p>
                            ) : (
                                sortedMemberPreds.map((mp) => {
                                    const isCurrentUser = mp.user_id === localPrediction?.user_id;
                                    const inits = (mp.display_name ?? "?")
                                        .split(" ")
                                        .map((w) => w[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase();

                                    const displayPoints = isFinished
                                        ? mp.points
                                        : isLive && match.home_score !== null && match.away_score !== null
                                          ? calcProvisionalPoints(
                                                mp.predicted_home,
                                                mp.predicted_away,
                                                match.home_score!,
                                                match.away_score!,
                                            )
                                          : null;

                                    return (
                                        <div
                                            key={mp.user_id}
                                            className={cx(
                                                "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                                                isCurrentUser && "bg-secondary",
                                            )}
                                        >
                                            <Avatar
                                                initials={inits}
                                                src={mp.avatar_url ?? undefined}
                                                size="xs"
                                            />
                                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-primary">
                                                {mp.display_name ?? "Anonim"}
                                                {isCurrentUser && (
                                                    <span className="ml-1 font-normal text-tertiary">(Ty)</span>
                                                )}
                                            </span>
                                            <span className="shrink-0 text-xs font-semibold tabular-nums text-secondary">
                                                {mp.predicted_home}:{mp.predicted_away}
                                            </span>
                                            {displayPoints !== null && (
                                                <span
                                                    className={cx(
                                                        "shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
                                                        displayPoints === 3
                                                            ? "bg-success-primary text-success-primary"
                                                            : displayPoints === 1
                                                              ? "bg-brand-primary text-brand-primary"
                                                              : "bg-secondary text-quaternary",
                                                    )}
                                                >
                                                    {displayPoints} pkt
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
