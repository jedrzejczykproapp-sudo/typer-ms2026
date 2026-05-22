import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMatchesWithPredictions, getLeaderboard } from "@/actions/prediction-actions";
import { getOdds } from "@/lib/odds";
import { getFlagUrl, getTeamNamePl } from "@/lib/flags";
import { getClubCrestUrl } from "@/lib/clubs";
import { PredictionCard } from "@/components/app/prediction-card";
import { LeaderboardTable } from "@/components/app/leaderboard-table";
import { GroupSettingsMenu } from "@/components/app/group-settings-menu";
import { GroupSwitcherDrawer } from "@/components/app/group-switcher-drawer";
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
    { key: "tabela", label: "Ranking" },
    { key: "grupy", label: "Tabela" },
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

    const [{ data: group }, { count: memberCount }, memberCheck, { data: memberships }] = await Promise.all([
        supabase.from("groups").select("*").eq("id", id).single(),
        supabase.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", id),
        supabase.from("group_members").select("id").eq("group_id", id).eq("user_id", user!.id).single(),
        supabase
            .from("group_members")
            .select("group_id, groups(id, name, avatar_url)")
            .eq("user_id", user!.id)
            .order("joined_at", { ascending: false }),
    ]);

    if (!group) notFound();
    if (!memberCheck.data) notFound();

    const userGroups = (memberships?.map((m) => m.groups).filter(Boolean) ?? []) as unknown as {
        id: string;
        name: string;
        avatar_url: string | null;
    }[];

    return (
        <>
            <div className="flex flex-col gap-3">
                {/* Group header */}
                <div className="flex items-start justify-between gap-3">
                    <GroupSwitcherDrawer
                        currentGroupId={id}
                        currentGroupName={group.name}
                        currentGroupAvatar={group.avatar_url ?? null}
                        memberCount={memberCount ?? 0}
                        groups={userGroups}
                    />
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
                        <Link
                            key={key}
                            href={`/grupy/${id}?tab=${key}`}
                            scroll={false}
                            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
                                tab === key ? "bg-primary text-primary shadow-xs" : "text-tertiary hover:text-secondary"
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
                </div>

                {/* Tab content */}
                {tab === "typowania" ? (
                    <TypowaniaTab groupId={id} userId={user!.id} />
                ) : tab === "tabela" ? (
                    <TabelaTab groupId={id} userId={user!.id} />
                ) : (
                    <GrupyTab competitionType={group.competition_type ?? "wc_2026"} />
                )}
            </div>
        </>
    );
}

async function TypowaniaTab({ groupId, userId }: { groupId: string; userId: string }) {
    const { matches, predictions, competitionType } = await getMatchesWithPredictions(groupId);
    const oddsMap = await getOdds(competitionType);

    // Ekstraklasa: show last round (highest matchday) only
    let displayMatches = matches;
    if (competitionType === "ekstraklasa_2526") {
        const matchdays = matches.map((m) => m.matchday ?? 0).filter(Boolean);
        const lastRound = matchdays.length > 0 ? Math.max(...matchdays) : 0;
        displayMatches = lastRound > 0 ? matches.filter((m) => m.matchday === lastRound) : matches;
    }

    const grouped = groupMatchesByStage(displayMatches);

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
                                    competitionType={competitionType}
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
                <h2 className="font-semibold text-primary">Leaderboard</h2>
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

function applyResult(
    stats: Record<string, TeamStats>,
    homeTeam: string,
    awayTeam: string,
    hg: number,
    ag: number,
) {
    stats[homeTeam].played++;
    stats[homeTeam].gf += hg;
    stats[homeTeam].ga += ag;
    stats[awayTeam].played++;
    stats[awayTeam].gf += ag;
    stats[awayTeam].ga += hg;
    if (hg > ag) {
        stats[homeTeam].won++;
        stats[homeTeam].points += 3;
        stats[awayTeam].lost++;
    } else if (hg < ag) {
        stats[awayTeam].won++;
        stats[awayTeam].points += 3;
        stats[homeTeam].lost++;
    } else {
        stats[homeTeam].drawn++;
        stats[homeTeam].points += 1;
        stats[awayTeam].drawn++;
        stats[awayTeam].points += 1;
    }
}

function sortStandings(teams: TeamStats[]) {
    return [...teams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.gf - a.ga;
        const gdB = b.gf - b.ga;
        if (gdB !== gdA) return gdB - gdA;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team);
    });
}

async function GrupyTab({ competitionType = "wc_2026" }: { competitionType?: string }) {
    const supabase = await createClient();
    const isEkstraklasa = competitionType === "ekstraklasa_2526";

    const { data: matches } = await supabase
        .from("matches")
        .select("home_team, away_team, home_score, away_score, status, group_name")
        .eq("stage", "group")
        .eq("competition_type", competitionType)
        .order("group_name", { ascending: true });

    if (!matches?.length) return <p className="text-sm text-tertiary">Brak danych.</p>;

    // ── Ekstraklasa: single full league table ─────────────────────────────────
    if (isEkstraklasa) {
        const standings: Record<string, TeamStats> = {};

        for (const m of matches) {
            if (!standings[m.home_team]) standings[m.home_team] = { team: m.home_team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
            if (!standings[m.away_team]) standings[m.away_team] = { team: m.away_team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };

            if (m.status === "finished" && m.home_score !== null && m.away_score !== null) {
                applyResult(standings, m.home_team, m.away_team, m.home_score as number, m.away_score as number);
            }
        }

        const teams = sortStandings(Object.values(standings));

        return (
            <div className="overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs">
                <div className="border-b border-secondary px-4 py-2.5">
                    <h3 className="text-sm font-bold text-primary">Ekstraklasa PKO BP 2025/26</h3>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[20px_1fr_28px_28px_28px_32px] items-center border-b border-secondary px-3 py-1.5">
                    <span className="text-center text-xs text-quaternary">#</span>
                    <span className="pl-7 text-xs text-quaternary">Drużyna</span>
                    <span className="text-center text-xs text-quaternary">M</span>
                    <span className="text-center text-xs text-quaternary">G</span>
                    <span className="text-center text-xs text-quaternary">S</span>
                    <span className="text-center text-xs font-semibold text-quaternary">Pkt</span>
                </div>

                {/* Team rows */}
                {teams.map((team, idx) => {
                    const crestUrl = getClubCrestUrl(team.team);
                    return (
                        <div
                            key={team.team}
                            className={`grid grid-cols-[20px_1fr_28px_28px_28px_32px] items-center px-3 py-2 ${
                                idx < teams.length - 1 ? "border-b border-secondary" : ""
                            }`}
                        >
                            <span className="text-center text-xs tabular-nums text-tertiary">{idx + 1}</span>
                            <div className="flex min-w-0 items-center gap-2">
                                {crestUrl ? (
                                    <img src={crestUrl} alt={team.team} className="size-5 shrink-0 rounded object-contain" />
                                ) : (
                                    <div className="flex size-5 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-bold text-tertiary">
                                        {team.team.charAt(0)}
                                    </div>
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
    }

    // ── WC: group-by-group display ────────────────────────────────────────────
    const wcGroups: Record<string, Record<string, TeamStats>> = {};

    for (const m of matches) {
        const g = m.group_name as string;
        if (!wcGroups[g]) wcGroups[g] = {};
        if (!wcGroups[g][m.home_team]) wcGroups[g][m.home_team] = { team: m.home_team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
        if (!wcGroups[g][m.away_team]) wcGroups[g][m.away_team] = { team: m.away_team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };

        if (m.status === "finished" && m.home_score !== null && m.away_score !== null) {
            applyResult(wcGroups[g], m.home_team, m.away_team, m.home_score as number, m.away_score as number);
        }
    }

    const sortedGroupNames = Object.keys(wcGroups).sort();

    return (
        <div className="flex flex-col gap-3">
            {sortedGroupNames.map((groupName) => {
                const teams = sortStandings(Object.values(wcGroups[groupName]));

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
                                            <img src={flagUrl} alt={team.team} className="size-5 shrink-0 rounded" />
                                        ) : (
                                            <div className="size-5 shrink-0 rounded bg-secondary" />
                                        )}
                                        <span className="truncate text-sm text-primary">{getTeamNamePl(team.team)}</span>
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
