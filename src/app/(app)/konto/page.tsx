import { redirect } from "next/navigation";
import { CalendarCheck01, ChevronRight, Users01 } from "@untitledui/icons";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatsDashboard, type UserStats } from "@/components/app/stats-dashboard";
import { getAllGroupsMatchesWithPredictions } from "@/actions/prediction-actions";
import { getOdds } from "@/lib/odds";
import { PredictionCard } from "@/components/app/prediction-card";
import { CreateGroupModal } from "@/components/app/group-modals";
import { JoinGroupModal } from "@/components/app/group-modals";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { Match } from "@/types/database";

const TABS = [
    { key: "statystyki", label: "Statystyki" },
    { key: "typowania", label: "Typowania" },
    { key: "grupy", label: "Grupy" },
] as const;

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
        const key = match.stage === "group" ? `matchday_${match.matchday}` : match.stage;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(match);
    }
    return grouped;
}

export default async function KontoPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; group?: string }>;
}) {
    const { tab = "statystyki", group: groupParam } = await searchParams;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/logowanie");

    // Fetch user's groups
    const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, invite_code, created_at, avatar_url, competition_type)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

    const groups = (memberships?.map((m) => m.groups).filter(Boolean) ?? []) as unknown as {
        id: string;
        name: string;
        invite_code: string;
        created_at: string;
        avatar_url: string | null;
        competition_type: string;
    }[];

    const activeGroup = groups.length > 0
        ? (groupParam ? groups.find((g) => g.id === groupParam) ?? groups[0] : groups[0])
        : null;

    // Check if there are matches today (upcoming or live) for the pulsing dot
    const todayUtc = new Date().toISOString().slice(0, 10);
    const { count: todayMatchCount } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .gte("match_date", `${todayUtc}T00:00:00`)
        .lte("match_date", `${todayUtc}T23:59:59`)
        .in("status", ["upcoming", "live"]);
    const hasTodayMatches = (todayMatchCount ?? 0) > 0;

    return (
        <div className="flex flex-col gap-3">
            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-secondary p-1">
                {TABS.map(({ key, label }) => (
                    <a
                        key={key}
                        href={`/konto?tab=${key}`}
                        className={`relative flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
                            tab === key ? "bg-primary text-primary shadow-xs" : "text-tertiary hover:text-secondary"
                        }`}
                    >
                        {label}
                        {key === "typowania" && hasTodayMatches && (
                            <span className="absolute right-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand-solid animate-pulse" />
                        )}
                    </a>
                ))}
            </div>

            {tab === "statystyki" ? (
                <StatystykiTab userId={user.id} groups={groups} />
            ) : tab === "typowania" ? (
                <TypowaniaTab groups={groups} />
            ) : (
                <GrupyTab groups={groups} />
            )}
        </div>
    );
}

// ─── Typowania tab ────────────────────────────────────────────────────────────

function dateLabel(dateStr: string): string {
    const day = dateStr.slice(0, 10);
    const todayUtc = new Date().toISOString().slice(0, 10);
    const tomorrowUtc = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    if (day === todayUtc) return "Dziś";
    if (day === tomorrowUtc) return "Jutro";
    return new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "short" })
        .format(new Date(dateStr))
        .replace(".", "")
        .replace(".", "");
}

async function TypowaniaTab({
    groups,
}: {
    groups: { id: string; name: string; avatar_url: string | null; competition_type: string }[];
}) {
    // ── No groups at all ──────────────────────────────────────────────────────
    if (!groups.length) {
        return <EmptyState icon={Users01 as Parameters<typeof FeaturedIcon>[0]["icon"]} title="Brak grup" description="Utwórz grupę lub dołącz do istniejącej, aby zacząć typować." />;
    }

    const allEntries = await getAllGroupsMatchesWithPredictions(groups);

    // ── No upcoming matches ───────────────────────────────────────────────────
    if (!allEntries.length) {
        return <EmptyState icon={CalendarCheck01 as Parameters<typeof FeaturedIcon>[0]["icon"]} title="Brak nadchodzących meczów" description="Zaproś znajomych i typujcie razem!" />;
    }

    // Fetch odds for each unique competition type
    const uniqueCts = [...new Set(groups.map((g) => g.competition_type))];
    const oddsMaps = await Promise.all(uniqueCts.map((ct) => getOdds(ct)));
    const combinedOdds = new Map<string, import("@/lib/odds").MatchOdds>();
    for (const m of oddsMaps) for (const [k, v] of m) combinedOdds.set(k, v);

    // Group by date label, preserving order (allEntries already sorted by match_date)
    const sectionMap = new Map<string, typeof allEntries>();
    const sectionDateMap = new Map<string, string>(); // label → YYYY-MM-DD for sort
    for (const entry of allEntries) {
        const label = dateLabel(entry.match.match_date);
        if (!sectionMap.has(label)) {
            sectionMap.set(label, []);
            sectionDateMap.set(label, entry.match.match_date.slice(0, 10));
        }
        sectionMap.get(label)!.push(entry);
    }

    const sortedLabels = [...sectionMap.keys()].sort((a, b) =>
        (sectionDateMap.get(a) ?? "").localeCompare(sectionDateMap.get(b) ?? ""),
    );

    return (
        <div className="flex flex-col gap-8">
            {sortedLabels.map((label) => {
                const entries = sectionMap.get(label)!;
                return (
                    <section key={label}>
                        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</h2>
                        <div className="flex flex-col gap-3">
                            {entries.map((entry) => (
                                <PredictionCard
                                    key={`${entry.match.id}-${entry.groupId}`}
                                    match={entry.match}
                                    groupId={entry.groupId}
                                    groupName={groups.length > 1 ? entry.groupName : undefined}
                                    prediction={entry.prediction}
                                    odds={combinedOdds.get(`${entry.match.home_team}|${entry.match.away_team}`)}
                                    competitionType={entry.competitionType}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

function EmptyState({ icon, title, description }: { icon: Parameters<typeof FeaturedIcon>[0]["icon"]; title: string; description: string }) {
    return (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-secondary bg-primary px-6 py-16 text-center">
            <FeaturedIcon icon={icon} color="brand" theme="light" size="lg" />
            <div className="flex flex-col gap-1.5">
                <p className="text-base font-semibold text-primary">{title}</p>
                <p className="text-sm text-tertiary">{description}</p>
            </div>
            <CreateGroupModal />
        </div>
    );
}

// ─── Statystyki tab ───────────────────────────────────────────────────────────

async function StatystykiTab({ userId, groups }: { userId: string; groups: { id: string }[] }) {
    const supabase = await createClient();

    const { data: predictions } = await supabase
        .from("predictions")
        .select("points")
        .eq("user_id", userId);

    const preds = predictions ?? [];
    const total   = preds.length;
    const exact   = preds.filter((p) => p.points === 3).length;
    const correct = preds.filter((p) => p.points === 1).length;
    const wrong   = preds.filter((p) => p.points === 0).length;
    const pending = preds.filter((p) => p.points === null).length;

    const stats: UserStats = {
        total,
        exact,
        correct,
        wrong,
        pending,
        totalPoints: exact * 3 + correct * 1,
        groups: groups.length,
    };

    return <StatsDashboard stats={stats} />;
}

// ─── Grupy tab ────────────────────────────────────────────────────────────────

async function GrupyTab({
    groups,
}: {
    groups: { id: string; name: string; invite_code: string; avatar_url: string | null }[];
}) {
    // Fetch member counts for all groups in one query
    const supabase = await createClient();
    const { data: memberRows } = groups.length
        ? await supabase.from("group_members").select("group_id").in("group_id", groups.map((g) => g.id))
        : { data: [] };

    const countMap = new Map<string, number>();
    (memberRows ?? []).forEach((r) => countMap.set(r.group_id, (countMap.get(r.group_id) ?? 0) + 1));

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-3">
                <CreateGroupModal />
                <JoinGroupModal />
            </div>

            {groups.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-secondary bg-primary py-16 text-center">
                    <FeaturedIcon icon={Users01} color="brand" theme="light" size="lg" />
                    <div>
                        <p className="font-semibold text-primary">Brak grup</p>
                        <p className="mt-1 text-sm text-tertiary">
                            Utwórz nową grupę lub dołącz do istniejącej.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {groups.map((group) => {
                        const memberCount = countMap.get(group.id) ?? 0;
                        return (
                            <Link
                                key={group.id}
                                href={`/grupy/${group.id}`}
                                className="flex items-center gap-3 rounded-xl border border-secondary bg-primary px-4 py-3 shadow-xs transition hover:bg-primary_hover"
                            >
                                <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
                                    {group.avatar_url ? (
                                        <img src={group.avatar_url} alt={group.name} className="size-full object-cover" />
                                    ) : (
                                        <div className="flex size-full items-center justify-center text-lg font-bold text-tertiary">
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-primary">{group.name}</p>
                                    <p className="text-xs text-tertiary">
                                        {memberCount} {memberCount === 1 ? "uczestnik" : memberCount < 5 ? "uczestników" : "uczestników"}
                                    </p>
                                </div>
                                <ChevronRight className="size-4 text-fg-quaternary" />
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
