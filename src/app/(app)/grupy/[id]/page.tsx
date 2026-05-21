import { notFound } from "next/navigation";
import { Copy01, Users01 } from "@untitledui/icons";
import { createClient } from "@/lib/supabase/server";
import { getMatchesWithPredictions, getLeaderboard } from "@/actions/prediction-actions";
import { PredictionCard } from "@/components/app/prediction-card";
import { LeaderboardTable } from "@/components/app/leaderboard-table";
import { BottomNav } from "@/components/app/bottom-nav";
import { CopyCodeButton } from "@/components/app/copy-code-button";
import type { Match } from "@/types/database";

const stageOrder = ["group", "round_of_32", "round_of_16", "quarter", "semi", "third_place", "final"] as const;
const stageLabels: Record<string, string> = {
    group: "Faza grupowa",
    round_of_32: "1/16 finału",
    round_of_16: "1/8 finału",
    quarter: "Ćwierćfinał",
    semi: "Półfinał",
    third_place: "Mecz o 3. miejsce",
    final: "Finał",
};

function groupMatchesByStage(matches: Match[]) {
    const grouped: Record<string, Match[]> = {};
    for (const match of matches) {
        const key = match.stage === "group" ? `group_${match.group_name}` : match.stage;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(match);
    }
    return grouped;
}

export default async function GroupPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const { id } = await params;
    const { tab = "typowania" } = await searchParams;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const [{ data: group }, { count: memberCount }] = await Promise.all([
        supabase.from("groups").select("*").eq("id", id).single(),
        supabase.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", id),
    ]);

    if (!group) notFound();

    const isMember = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", id)
        .eq("user_id", user!.id)
        .single()
        .then(({ data }) => !!data);

    if (!isMember) notFound();

    return (
        <>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-primary">{group.name}</h1>
                        <div className="mt-1 flex items-center gap-2">
                            <Users01 className="size-3.5 text-fg-quaternary" />
                            <span className="text-xs text-tertiary">{memberCount ?? 0} uczestników</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
                        <span className="text-xs text-tertiary">Kod zaproszenia:</span>
                        <code className="font-mono text-sm font-bold tracking-widest text-primary">{group.invite_code}</code>
                        <CopyCodeButton code={group.invite_code} />
                    </div>
                </div>

                <div className="flex gap-1 rounded-xl bg-secondary p-1">
                    {["typowania", "tabela"].map((t) => (
                        <a
                            key={t}
                            href={`/grupy/${id}?tab=${t}`}
                            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold capitalize transition ${
                                tab === t ? "bg-primary text-primary shadow-xs" : "text-tertiary hover:text-secondary"
                            }`}
                        >
                            {t === "typowania" ? "Typowania" : "Tabela"}
                        </a>
                    ))}
                </div>

                {tab === "typowania" ? (
                    <TypowaniaTab groupId={id} userId={user!.id} />
                ) : (
                    <TabelaTab groupId={id} userId={user!.id} />
                )}
            </div>

            <BottomNav groupId={id} />
        </>
    );
}

async function TypowaniaTab({ groupId, userId }: { groupId: string; userId: string }) {
    const { matches, predictions } = await getMatchesWithPredictions(groupId);

    const grouped = groupMatchesByStage(matches);

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const stageA = a.startsWith("group_") ? "group" : a;
        const stageB = b.startsWith("group_") ? "group" : b;
        const orderA = stageOrder.indexOf(stageA as any);
        const orderB = stageOrder.indexOf(stageB as any);
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    });

    return (
        <div className="flex flex-col gap-8">
            {sortedKeys.map((key) => {
                const sectionMatches = grouped[key];
                const isGroup = key.startsWith("group_");
                const groupLetter = isGroup ? key.replace("group_", "") : null;
                const label = isGroup ? `Grupa ${groupLetter}` : stageLabels[key];

                return (
                    <section key={key}>
                        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</h2>
                        <div className="flex flex-col gap-3">
                            {sectionMatches.map((match) => (
                                <PredictionCard
                                    key={match.id}
                                    match={match}
                                    groupId={groupId}
                                    prediction={predictions.get(match.id)}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

async function TabelaTab({ groupId, userId }: { groupId: string; userId: string }) {
    const entries = await getLeaderboard(groupId);

    return (
        <div className="rounded-xl border border-secondary bg-primary shadow-xs overflow-hidden">
            <div className="border-b border-secondary px-4 py-3">
                <h2 className="font-semibold text-primary">Ranking grupy</h2>
            </div>
            <LeaderboardTable entries={entries} currentUserId={userId} />
        </div>
    );
}
