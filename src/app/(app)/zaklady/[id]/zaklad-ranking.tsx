"use client";

import { useMemo } from "react";
import { cx } from "@/utils/cx";

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

function calcPoints(pred: Prediction, fixture: Fixture): number {
    const isFinished =
        fixture.match_status === "FT" ||
        fixture.match_status === "AET" ||
        fixture.match_status === "PEN" ||
        fixture.match_status === "Finished";
    if (!isFinished || fixture.home_score === "" || fixture.away_score === "") return 0;
    const ah = parseInt(fixture.home_score);
    const aa = parseInt(fixture.away_score);
    if (isNaN(ah) || isNaN(aa)) return 0;
    const ph = pred.predicted_home;
    const pa = pred.predicted_away;
    if (ph === ah && pa === aa) return 3;
    if (Math.sign(ph - pa) === Math.sign(ah - aa)) return 1;
    return 0;
}

export function ZakladRanking({ members, fixtures, predictions, userId }: Props) {
    const ranking = useMemo(() => {
        return members
            .map((m) => {
                const memberPreds = predictions.filter((p) => p.user_id === m.user_id);
                let points = 0;
                let typed = 0;

                for (const fixture of fixtures) {
                    const pred = memberPreds.find((p) => p.fixture_id === fixture.id);
                    if (!pred) continue;
                    typed++;

                    // Use stored points if available, otherwise calculate from score
                    if (pred.points !== null) {
                        points += pred.points;
                    } else {
                        points += calcPoints(pred, fixture);
                    }
                }

                const inits = (m.profiles?.display_name ?? "?")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                return {
                    userId: m.user_id,
                    name: m.profiles?.display_name ?? "Użytkownik",
                    avatarUrl: m.profiles?.avatar_url ?? null,
                    inits,
                    points,
                    typed,
                    total: fixtures.length,
                };
            })
            .sort((a, b) => b.points - a.points || b.typed - a.typed);
    }, [members, fixtures, predictions]);

    return (
        <div className="flex flex-col gap-2">
            {ranking.map((entry, i) => {
                const isMe = entry.userId === userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

                return (
                    <div
                        key={entry.userId}
                        className={cx(
                            "flex items-center gap-3 rounded-xl border px-4 py-3",
                            isMe ? "border-brand-solid bg-brand-secondary" : "border-secondary bg-primary",
                        )}
                    >
                        {/* Position */}
                        <span className="w-6 shrink-0 text-center text-sm font-bold text-tertiary">
                            {medal ?? `${i + 1}.`}
                        </span>

                        {/* Avatar */}
                        {entry.avatarUrl ? (
                            <img
                                src={entry.avatarUrl}
                                alt={entry.name}
                                className="size-8 shrink-0 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-tertiary">
                                {entry.inits}
                            </div>
                        )}

                        {/* Name */}
                        <div className="min-w-0 flex-1">
                            <p className={cx("truncate text-sm font-semibold", isMe ? "text-fg-brand-primary" : "text-primary")}>
                                {entry.name} {isMe && "(Ty)"}
                            </p>
                            <p className="text-xs text-tertiary">
                                {entry.typed}/{entry.total} typów
                            </p>
                        </div>

                        {/* Points */}
                        <span className={cx(
                            "shrink-0 text-lg font-bold tabular-nums",
                            isMe ? "text-fg-brand-primary" : "text-primary",
                        )}>
                            {entry.points}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
