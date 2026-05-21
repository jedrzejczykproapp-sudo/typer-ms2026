"use client";

import { useState, useTransition } from "react";
import { Check, Lock01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { upsertPrediction } from "@/actions/prediction-actions";
import type { Match, Prediction } from "@/types/database";
import { cx } from "@/utils/cx";

interface PredictionCardProps {
    match: Match;
    groupId: string;
    prediction?: Prediction;
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
        <div className="flex items-center gap-1">
            <button
                type="button"
                disabled={disabled || value <= 0}
                onClick={() => onChange(Math.max(0, value - 1))}
                className="flex size-8 items-center justify-center rounded-lg bg-secondary text-lg font-bold text-primary transition hover:bg-secondary_hover disabled:cursor-not-allowed disabled:opacity-40"
            >
                −
            </button>
            <span className="w-8 text-center text-2xl font-bold tabular-nums text-primary">{value}</span>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(Math.min(20, value + 1))}
                className="flex size-8 items-center justify-center rounded-lg bg-secondary text-lg font-bold text-primary transition hover:bg-secondary_hover disabled:cursor-not-allowed disabled:opacity-40"
            >
                +
            </button>
        </div>
    );
}

export function PredictionCard({ match, groupId, prediction }: PredictionCardProps) {
    const isLocked = match.status !== "upcoming";
    const isFinished = match.status === "finished";
    const isTbd = match.home_team === "TBD";

    const [homeScore, setHomeScore] = useState(prediction?.predicted_home ?? 0);
    const [awayScore, setAwayScore] = useState(prediction?.predicted_away ?? 0);
    const [saved, setSaved] = useState(false);
    const [isPending, startTransition] = useTransition();

    function handleSave() {
        startTransition(async () => {
            await upsertPrediction(match.id, groupId, homeScore, awayScore);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        });
    }

    const hasPrediction = prediction !== undefined;
    const hasChanged = prediction ? homeScore !== prediction.predicted_home || awayScore !== prediction.predicted_away : true;

    return (
        <div
            className={cx(
                "flex flex-col gap-3 rounded-xl border bg-primary p-4 transition",
                isFinished ? "border-secondary" : "border-secondary shadow-xs",
                isLocked && "opacity-80",
            )}
        >
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-tertiary">
                    {match.group_name ? `Grupa ${match.group_name} · Kolejka ${match.matchday}` : stageLabels[match.stage]}
                </span>
                <span className="text-xs text-tertiary">{formatMatchDate(match.match_date)}</span>
            </div>

            {isTbd ? (
                <p className="py-2 text-center text-sm text-tertiary">Mecz do ustalenia po fazie grupowej</p>
            ) : (
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                        <span className="text-2xl">{match.home_flag}</span>
                        <span className="text-center text-sm font-semibold text-primary leading-tight">{match.home_team}</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        {isFinished ? (
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-bold text-primary">{match.home_score}</span>
                                <span className="text-lg text-tertiary">:</span>
                                <span className="text-2xl font-bold text-primary">{match.away_score}</span>
                            </div>
                        ) : isLocked ? (
                            <div className="flex items-center gap-1.5 text-tertiary">
                                <Lock01 className="size-4" />
                                <span className="text-sm">W trakcie</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <ScoreInput value={homeScore} onChange={setHomeScore} disabled={isLocked} />
                                <span className="text-lg font-bold text-tertiary">:</span>
                                <ScoreInput value={awayScore} onChange={setAwayScore} disabled={isLocked} />
                            </div>
                        )}

                        {isFinished && hasPrediction && (
                            <div
                                className={cx(
                                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                    prediction.points === 3
                                        ? "bg-success-primary text-success-primary"
                                        : prediction.points === 1
                                          ? "bg-brand-primary text-brand-primary"
                                          : "bg-secondary text-tertiary",
                                )}
                            >
                                {prediction.points === 3 ? "Dokładny wynik" : prediction.points === 1 ? "Poprawny wynik" : "0 pkt"}
                                {prediction.points !== null && ` · ${prediction.points} pkt`}
                            </div>
                        )}

                        {isFinished && hasPrediction && (
                            <div className="text-center text-xs text-tertiary">
                                Twój typ: {prediction.predicted_home}:{prediction.predicted_away}
                            </div>
                        )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                        <span className="text-2xl">{match.away_flag}</span>
                        <span className="text-center text-sm font-semibold text-primary leading-tight">{match.away_team}</span>
                    </div>
                </div>
            )}

            {!isLocked && !isTbd && (
                <Button
                    size="sm"
                    color={saved ? "secondary" : "primary"}
                    isLoading={isPending}
                    showTextWhileLoading
                    onClick={handleSave}
                    isDisabled={!hasChanged && hasPrediction}
                    iconLeading={saved ? Check : undefined}
                    className="w-full"
                >
                    {saved ? "Zapisano!" : hasPrediction && !hasChanged ? "Zapisane" : "Zapisz typ"}
                </Button>
            )}
        </div>
    );
}
