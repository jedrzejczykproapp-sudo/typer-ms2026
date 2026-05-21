import { Trophy01 } from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import type { LeaderboardEntry } from "@/types/database";

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
        <div className="flex flex-col">
            {/* Column headers */}
            <div className="flex items-center gap-3 border-b border-secondary px-4 py-1.5">
                <div className="w-6 shrink-0" />
                <div className="size-8 shrink-0" />
                <span className="min-w-0 flex-1 text-xs text-quaternary">Gracz</span>
                <div className="flex shrink-0 items-center gap-3">
                    <span className="w-9 text-center text-xs text-quaternary">Dokł.</span>
                    <span className="w-9 text-center text-xs text-quaternary">Wyg.</span>
                    <span className="w-10 text-center text-xs font-semibold text-quaternary">Pkt</span>
                </div>
            </div>

            {/* Rows */}
            {entries.map((entry) => {
                const isMe = entry.user_id === currentUserId;
                const inits = (entry.display_name ?? "?")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                return (
                    <div
                        key={entry.user_id}
                        className="flex items-center gap-3 border-b border-secondary px-4 py-3 last:border-b-0"
                    >
                        <span className="w-6 shrink-0 text-center text-sm font-bold text-tertiary">
                            {entry.rank}
                        </span>

                        <Avatar initials={inits} size="sm" />

                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
                            {entry.display_name ?? "Anonim"}
                            {isMe && <span className="ml-1 text-xs font-normal text-tertiary">(Ty)</span>}
                        </p>

                        <div className="flex shrink-0 items-center gap-3">
                            <span className="w-9 text-center text-sm tabular-nums text-primary">
                                {entry.exact_scores}
                            </span>
                            <span className="w-9 text-center text-sm tabular-nums text-primary">
                                {entry.correct_results}
                            </span>
                            <span className="w-10 text-center text-base font-bold tabular-nums text-primary">
                                {entry.total_points}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
