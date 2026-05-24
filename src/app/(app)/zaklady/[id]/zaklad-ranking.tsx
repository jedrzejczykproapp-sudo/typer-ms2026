"use client";

import { useMemo } from "react";
import { Trophy01 } from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";

interface Member {
    user_id: string;
    profiles: { display_name: string; avatar_url: string | null } | null;
}

interface Fixture {
    id: string;
    home_score: string;
    away_score: string;
    match_status: string;
}

interface Prediction {
    fixture_id: string;
    user_id: string;
    predicted_home: number;
    predicted_away: number;
    points: number | null;
}

interface Props {
    members: Member[];
    fixtures: Fixture[];
    predictions: Prediction[];
    userId: string;
}

const FINISHED_STATUSES = new Set(["finished", "FT", "AET", "PEN", "Finished"]);

function calcPoints(pred: Prediction, fixture: Fixture): { points: number; isExact: boolean } {
    const isFinished = FINISHED_STATUSES.has(fixture.match_status);
    if (!isFinished || fixture.home_score === "" || fixture.away_score === "") {
        return { points: 0, isExact: false };
    }
    const ah = parseInt(fixture.home_score);
    const aa = parseInt(fixture.away_score);
    if (isNaN(ah) || isNaN(aa)) return { points: 0, isExact: false };
    const ph = pred.predicted_home;
    const pa = pred.predicted_away;
    if (ph === ah && pa === aa) return { points: 3, isExact: true };
    if (Math.sign(ph - pa) === Math.sign(ah - aa)) return { points: 1, isExact: false };
    return { points: 0, isExact: false };
}

export function ZakladRanking({ members, fixtures, predictions, userId }: Props) {
    const ranking = useMemo(() => {
        return members
            .map((m) => {
                const memberPreds = predictions.filter((p) => p.user_id === m.user_id);
                let points = 0;
                let exact = 0;
                let correct = 0;

                for (const fixture of fixtures) {
                    const pred = memberPreds.find((p) => p.fixture_id === fixture.id);
                    if (!pred) continue;

                    if (pred.points !== null) {
                        points += pred.points;
                        if (pred.points === 3) exact++;
                        if (pred.points === 1) correct++;
                    } else {
                        const result = calcPoints(pred, fixture);
                        points += result.points;
                        if (result.isExact) exact++;
                        else if (result.points === 1) correct++;
                    }
                }

                const name = m.profiles?.display_name ?? "Użytkownik";
                const inits = name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                return {
                    userId: m.user_id,
                    name,
                    avatarUrl: m.profiles?.avatar_url ?? null,
                    inits,
                    points,
                    exact,
                    correct,
                };
            })
            .sort((a, b) => b.points - a.points || b.exact - a.exact || b.correct - a.correct);
    }, [members, fixtures, predictions]);

    return (
        <div className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs">
            {/* Header */}
            <div className="border-b border-secondary px-4 py-3">
                <h2 className="font-semibold text-primary">Ranking</h2>
            </div>

            {ranking.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Trophy01 className="size-10 text-fg-quaternary" />
                    <p className="text-sm text-tertiary">Jeszcze nikt nie zdobył punktów.</p>
                    <p className="text-xs text-quaternary">Punkty pojawią się po zakończeniu meczów.</p>
                </div>
            ) : (
                <>
                    {/* Column headers */}
                    <div className="flex items-center gap-3 border-b border-secondary px-4 py-1.5">
                        <div className="w-6 shrink-0" />
                        <span className="min-w-0 flex-1 text-xs text-quaternary">Gracz</span>
                        <div className="flex shrink-0 items-center gap-3">
                            <span className="w-9 text-center text-xs text-quaternary">Dokł.</span>
                            <span className="w-9 text-center text-xs text-quaternary">Wyg.</span>
                            <span className="w-10 text-center text-xs font-semibold text-quaternary">Pkt</span>
                        </div>
                    </div>

                    {/* Rows */}
                    {ranking.map((entry, i) => {
                        const isMe = entry.userId === userId;
                        const rank = i + 1;

                        return (
                            <div
                                key={entry.userId}
                                className="flex items-center gap-3 border-b border-secondary px-4 py-3 last:border-b-0"
                            >
                                <span className="w-6 shrink-0 text-center text-sm font-bold text-tertiary">
                                    {rank}
                                </span>

                                <Avatar
                                    initials={entry.inits}
                                    src={entry.avatarUrl ?? undefined}
                                    size="sm"
                                />

                                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
                                    {entry.name}
                                    {isMe && (
                                        <span className="ml-1 text-xs font-normal text-tertiary">(Ty)</span>
                                    )}
                                </p>

                                <div className="flex shrink-0 items-center gap-3">
                                    <span className="w-9 text-center text-sm tabular-nums text-primary">
                                        {entry.exact}
                                    </span>
                                    <span className="w-9 text-center text-sm tabular-nums text-primary">
                                        {entry.correct}
                                    </span>
                                    <span className="w-10 text-center text-base font-bold tabular-nums text-primary">
                                        {entry.points}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}
