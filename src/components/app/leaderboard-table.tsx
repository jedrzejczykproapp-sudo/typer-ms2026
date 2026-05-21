import { Trophy01 } from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import type { LeaderboardEntry } from "@/types/database";
import { cx } from "@/utils/cx";

export function LeaderboardTable({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string | null }) {
    if (!entries.length) {
        return (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Trophy01 className="size-10 text-fg-quaternary" />
                <p className="text-sm text-tertiary">Jeszcze nikt nie zdobył punktów.</p>
                <p className="text-xs text-quaternary">Punkty pojawią się po zakończeniu pierwszych meczów.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col divide-y divide-secondary">
            {entries.map((entry) => {
                const isMe = entry.user_id === currentUserId;
                const initials = (entry.display_name ?? "?")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                return (
                    <div
                        key={entry.user_id}
                        className="flex items-center gap-3 px-4 py-3 transition"
                    >
                        <span className="w-6 text-center text-sm font-bold text-tertiary">
                            {entry.rank}
                        </span>

                        <Avatar initials={initials} size="sm" />

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-primary">
                                {entry.display_name ?? "Anonim"}
                                {isMe && <span className="ml-1 text-xs font-normal text-tertiary">(Ty)</span>}
                            </p>
                            <p className="text-xs text-tertiary">
                                {entry.exact_scores} dokł. · {entry.correct_results} wyniki · {entry.predictions_count} typów
                            </p>
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="text-lg font-bold text-primary">{entry.total_points}</span>
                            <span className="text-xs text-tertiary">pkt</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
