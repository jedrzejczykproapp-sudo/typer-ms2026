import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMatchesWithPredictions, getLeaderboard } from "@/actions/prediction-actions";
import { getWcOdds } from "@/lib/odds";
import { getFlagUrl } from "@/lib/flags";
import { PredictionCard } from "@/components/app/prediction-card";
import { LeaderboardTable } from "@/components/app/leaderboard-table";
import { BottomNav } from "@/components/app/bottom-nav";
import { GroupSettingsMenu } from "@/components/app/group-settings-menu";
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

const TABS = [
    { key: "typowania", label: "Typowania" },
    { key: "tabela", label: "Tabela" },
    { key: "grupy", label: "Grupy MŚ" },
] as const;

function groupMatchesByStage(matches: Match[]) {
    const grouped: Record<string, Match[]> = {};
    for (const match of matches) {
        const key = match.stage === "group" ? `matchday_${match.matchday}` : match.stage;
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

    const [{ data: group }, { count: memberCount }, memberCheck] = await Promise.all([
        supabase.from("groups").select("*").eq("id", id).single(),
        supabase.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", id),
        supabase.from("group_members").select("id").eq("group_id", id).eq("user_id", user!.id).single(),
    ]);

    if (!group) notFound();
    if (!memberCheck.data) notFound();

    return (
        <>
            <div className="flex flex-col gap-3">
                {/* Group header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                            {group.avatar_url ? (
                                <img src={group.avatar_url} alt={group.name} className="size-full object-cover" />
                            ) : (
                                <div className="flex size-full items-center justify-center text-xl font-bold text-tertiary">
                                    {group.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-primary">{group.name}</h1>
                            <p className="mt-0.5 text-xs text-tertiary">{memberCount ?? 0} uczestników</p>
                        </div>
                    </div>
                    <GroupSettingsMenu
                        groupId={id}
                        inviteCode={group.invite_code}
                        groupName={group.name}
                        currentAvatarUrl={group.avatar_url ?? null}
                        isAdmin={group.created_by === user!.id}
                        currentUserId={user!.id}
                        createdBy={group.created_by}
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-1 rounded-xl bg-secondary p-1">
                    {TABS.map(({ key, label }) => (
                        <a
                            key={key}
                            href={`/grupy/${id}?tab=${key}`}
                            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
                                tab === key ? "bg-primary text-primary shadow-xs" : "text-tertiary hover:text-secondary"
                            }`}
                        >
                            {label}
                        </a>
                    ))}
                </div>

                {/* Tab content */}
                {tab === "typowania" ? (
                    <TypowaniaTab groupId={id} userId={user!.id} />
                ) : tab === "tabela" ? (
                    <TabelaTab groupId={id} userId={user!.id} />
                ) : (
                    <GrupyTab />
                )}
            </div>

            <BottomNav groupId={id} />
        </>
    );
}

async function TypowaniaTab({ groupId, userId }: { groupId: string; userId: string }) {
    const [{ matches, predictions }, oddsMap] = await Promise.all([
        getMatchesWithPredictions(groupId),
        getWcOdds(),
    ]);

    const grouped = groupMatchesByStage(matches);

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const stageA = a.startsWith("matchday_") ? "group" : a;
        const stageB = b.startsWith("matchday_") ? "group" : b;
        const orderA = stageOrder.indexOf(stageA as any);
        const orderB = stageOrder.indexOf(stageB as any);
        if (orderA !== orderB) return orderA - orderB;
        if (a.startsWith("matchday_") && b.startsWith("matchday_")) {
            return parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]);
        }
        return a.localeCompare(b);
    });

    return (
        <div className="flex flex-col gap-8">
            {sortedKeys.map((key) => {
                const sectionMatches = grouped[key];
                const isMatchday = key.startsWith("matchday_");
                const matchdayNum = isMatchday ? key.split("_")[1] : null;
                const label = isMatchday ? `Kolejka ${matchdayNum}` : stageLabels[key];

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
                                    odds={oddsMap.get(`${match.home_team}|${match.away_team}`)}
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
        <div className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs">
            <div className="border-b border-secondary px-4 py-3">
                <h2 className="font-semibold text-primary">Ranking grupy</h2>
            </div>
            <LeaderboardTable entries={entries} currentUserId={userId} />
        </div>
    );
}

type TeamStats = {
    team: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    points: number;
};

async function GrupyTab() {
    const supabase = await createClient();

    const { data: matches } = await supabase
        .from("matches")
        .select("home_team, away_team, home_score, away_score, status, group_name")
        .eq("stage", "group")
        .order("group_name", { ascending: true });

    if (!matches?.length) return <p className="text-sm text-tertiary">Brak danych.</p>;

    // Build standings from finished matches
    const groups: Record<string, Record<string, TeamStats>> = {};

    for (const match of matches) {
        const g = match.group_name as string;
        if (!groups[g]) groups[g] = {};

        const ensure = (team: string) => {
            if (!groups[g][team]) {
                groups[g][team] = { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
            }
        };

        ensure(match.home_team);
        ensure(match.away_team);

        if (match.status === "finished" && match.home_score !== null && match.away_score !== null) {
            const hg = match.home_score as number;
            const ag = match.away_score as number;

            groups[g][match.home_team].played++;
            groups[g][match.home_team].gf += hg;
            groups[g][match.home_team].ga += ag;

            groups[g][match.away_team].played++;
            groups[g][match.away_team].gf += ag;
            groups[g][match.away_team].ga += hg;

            if (hg > ag) {
                groups[g][match.home_team].won++;
                groups[g][match.home_team].points += 3;
                groups[g][match.away_team].lost++;
            } else if (hg < ag) {
                groups[g][match.away_team].won++;
                groups[g][match.away_team].points += 3;
                groups[g][match.home_team].lost++;
            } else {
                groups[g][match.home_team].drawn++;
                groups[g][match.home_team].points += 1;
                groups[g][match.away_team].drawn++;
                groups[g][match.away_team].points += 1;
            }
        }
    }

    const sortedGroupNames = Object.keys(groups).sort();

    return (
        <div className="flex flex-col gap-3">
            {sortedGroupNames.map((groupName) => {
                const teams = Object.values(groups[groupName]).sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    const gdA = a.gf - a.ga;
                    const gdB = b.gf - b.ga;
                    if (gdB !== gdA) return gdB - gdA;
                    if (b.gf !== a.gf) return b.gf - a.gf;
                    return a.team.localeCompare(b.team);
                });

                return (
                    <div key={groupName} className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs">
                        {/* Group header */}
                        <div className="border-b border-secondary px-4 py-2.5">
                            <h3 className="text-sm font-bold text-primary">Grupa {groupName}</h3>
                        </div>

                        {/* Column headers */}
                        <div className="grid grid-cols-[1fr_28px_28px_28px_32px] items-center border-b border-secondary px-4 py-1.5">
                            <span className="text-xs text-quaternary">Drużyna</span>
                            <span className="text-center text-xs text-quaternary">M</span>
                            <span className="text-center text-xs text-quaternary">G</span>
                            <span className="text-center text-xs text-quaternary">S</span>
                            <span className="text-center text-xs font-semibold text-quaternary">Pkt</span>
                        </div>

                        {/* Team rows */}
                        {teams.map((team, idx) => {
                            const flagUrl = getFlagUrl(team.team);
                            return (
                                <div
                                    key={team.team}
                                    className={`grid grid-cols-[1fr_28px_28px_28px_32px] items-center px-4 py-2 ${
                                        idx < teams.length - 1 ? "border-b border-secondary" : ""
                                    }`}
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        {flagUrl ? (
                                            <img
                                                src={flagUrl}
                                                alt={team.team}
                                                className="size-5 shrink-0 rounded"
                                            />
                                        ) : (
                                            <div className="size-5 shrink-0 rounded bg-secondary" />
                                        )}
                                        <span className="truncate text-sm text-primary">{team.team}</span>
                                    </div>
                                    <span className="text-center text-sm tabular-nums text-primary">{team.played}</span>
                                    <span className="text-center text-sm tabular-nums text-primary">{team.gf}</span>
                                    <span className="text-center text-sm tabular-nums text-primary">{team.ga}</span>
                                    <span className="text-center text-sm font-bold tabular-nums text-primary">{team.points}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
