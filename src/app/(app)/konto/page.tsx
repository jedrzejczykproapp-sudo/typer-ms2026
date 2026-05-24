import { redirect } from "next/navigation";
import { CalendarCheck01, ChevronRight, Ticket01, Users01 } from "@untitledui/icons";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/base/avatar/avatar";
import { AccountSettingsMenu } from "@/components/app/account-settings-menu";
import { StatsDashboard, type UserStats } from "@/components/app/stats-dashboard";
import { getAllGroupsMatchesWithPredictions } from "@/actions/prediction-actions";
import { getOdds } from "@/lib/odds";
import { PredictionCard } from "@/components/app/prediction-card";
import { CreateGroupModal } from "@/components/app/group-modals";
import { JoinGroupModal } from "@/components/app/group-modals";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { KontoTabPanel } from "./tab-panel";
import { ZakladFixtureCard } from "@/app/(app)/zaklady/[id]/zaklad-fixture-card";
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
        const key = match.stage === "group" ? `matchday_${match.matchday}` : match.stage;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(match);
    }
    return grouped;
}

export default async function KontoPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const { tab = "wydarzenia" } = await searchParams;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/logowanie");

    // Fetch profile + groups in parallel
    const [{ data: profile }, { data: memberships }] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
        supabase
            .from("group_members")
            .select("group_id, groups(id, name, invite_code, created_at, avatar_url, competition_type)")
            .eq("user_id", user.id)
            .order("joined_at", { ascending: false }),
    ]);

    const displayName = profile?.display_name ?? "?";
    const profileInits = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

    const groups = (memberships?.map((m) => m.groups).filter(Boolean) ?? []) as unknown as {
        id: string;
        name: string;
        invite_code: string;
        created_at: string;
        avatar_url: string | null;
        competition_type: string;
    }[];

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
        <div className="flex flex-col gap-4">
            {/* Profile header */}
            <div className="flex items-center gap-3 px-1">
                <Avatar initials={profileInits} src={profile?.avatar_url ?? null} size="md" />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-primary">{displayName}</p>
                    <p className="truncate text-xs text-tertiary">{user.email}</p>
                </div>
                <AccountSettingsMenu
                    displayName={displayName}
                    avatarUrl={profile?.avatar_url ?? null}
                    email={user.email ?? ""}
                    userId={user.id}
                />
            </div>

            <KontoTabPanel
                defaultTab={tab}
                hasTodayMatches={hasTodayMatches}
                wydarzeniaContent={<WydarzeniaTab groups={groups} userId={user.id} />}
                statystykiContent={<StatystykiTab userId={user.id} groups={groups} />}
            />
        </div>
    );
}

// ─── Wydarzenia tab ───────────────────────────────────────────────────────────

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

type ZakladFixtureRow = {
    id: string;
    zaklad_id: string;
    league_name: string;
    league_flag: string;
    match_date: string;
    home_name: string;
    home_badge: string;
    home_position: number | null;
    away_name: string;
    away_badge: string;
    away_position: number | null;
    home_score: string;
    away_score: string;
    match_status: string;
    odds_home: number | null;
    odds_draw: number | null;
    odds_away: number | null;
    venue: string | null;
};

async function WydarzeniaTab({
    groups,
    userId,
}: {
    groups: { id: string; name: string; avatar_url: string | null; competition_type: string }[];
    userId: string;
}) {
    const supabase = await createClient();

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString().slice(0, 10) + " 00:00:00";

    // ── Fetch user's zaklad fixtures (upcoming/live from active zakłady) ──────
    const { data: memberRows } = await supabase
        .from("zaklad_members")
        .select("zaklad_id, zaklady(id, status)")
        .eq("user_id", userId);

    const activeZakladIds = (memberRows ?? [])
        .filter((m) => (m.zaklady as unknown as { status: string } | null)?.status === "active")
        .map((m) => m.zaklad_id);

    let zakladFixtures: ZakladFixtureRow[] = [];
    let predByFixtureId = new Map<string, { home: number; away: number; points: number | null }>();

    if (activeZakladIds.length) {
        const { data: fixtures } = await supabase
            .from("zaklad_fixtures")
            .select("id, zaklad_id, league_name, league_flag, match_date, home_name, home_badge, home_position, away_name, away_badge, away_position, home_score, away_score, match_status, odds_home, odds_draw, odds_away, venue")
            .in("zaklad_id", activeZakladIds)
            .gte("match_date", todayStr)
            .order("match_date", { ascending: true });

        const FINISHED = ["FT", "AET", "PEN", "Finished"];
        zakladFixtures = ((fixtures ?? []) as ZakladFixtureRow[]).filter(
            (f) => !FINISHED.includes(f.match_status),
        );

        const fixtureIds = zakladFixtures.map((f) => f.id);
        if (fixtureIds.length) {
            const { data: preds } = await supabase
                .from("zaklad_predictions")
                .select("fixture_id, predicted_home, predicted_away, points")
                .eq("user_id", userId)
                .in("fixture_id", fixtureIds);

            predByFixtureId = new Map(
                (preds ?? []).map((p) => [
                    p.fixture_id,
                    { home: p.predicted_home, away: p.predicted_away, points: p.points as number | null },
                ]),
            );
        }
    }

    // ── Fetch group matches ───────────────────────────────────────────────────
    const groupEntries = groups.length ? await getAllGroupsMatchesWithPredictions(groups) : [];

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!groupEntries.length && !zakladFixtures.length) {
        return (
            <EmptyState
                icon={CalendarCheck01 as Parameters<typeof FeaturedIcon>[0]["icon"]}
                title="Brak nadchodzących meczów"
                description="Dołącz do grupy lub zakładu, aby zacząć typować!"
            />
        );
    }

    // ── Fetch odds for group competition types ────────────────────────────────
    const uniqueCts = [...new Set(groups.map((g) => g.competition_type))];
    const oddsMaps = uniqueCts.length
        ? await Promise.all(uniqueCts.map((ct) => getOdds(ct)))
        : [];
    const combinedOdds = new Map<string, import("@/lib/odds").MatchOdds>();
    for (const m of oddsMaps) for (const [k, v] of m) combinedOdds.set(k, v);

    // ── Merge & sort all entries by match_date ────────────────────────────────
    type GroupItem = { kind: "group"; sortKey: string; entry: (typeof groupEntries)[0] };
    type ZakladItem = {
        kind: "zaklad";
        sortKey: string;
        fixture: ZakladFixtureRow;
        prediction: { home: number; away: number } | null;
        points: number | null;
    };
    type AnyItem = GroupItem | ZakladItem;

    const allItems: AnyItem[] = [
        ...groupEntries.map((e) => ({
            kind: "group" as const,
            sortKey: e.match.match_date,
            entry: e,
        })),
        ...zakladFixtures.map((f) => {
            const pred = predByFixtureId.get(f.id);
            return {
                kind: "zaklad" as const,
                sortKey: f.match_date.replace(" ", "T"),
                fixture: f,
                prediction: pred ? { home: pred.home, away: pred.away } : null,
                points: pred?.points ?? null,
            };
        }),
    ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // ── Group by day ──────────────────────────────────────────────────────────
    const sectionMap = new Map<string, AnyItem[]>();
    const sectionDateMap = new Map<string, string>();
    for (const item of allItems) {
        const label = dateLabel(item.sortKey.slice(0, 10));
        if (!sectionMap.has(label)) {
            sectionMap.set(label, []);
            sectionDateMap.set(label, item.sortKey.slice(0, 10));
        }
        sectionMap.get(label)!.push(item);
    }

    const sortedLabels = [...sectionMap.keys()].sort((a, b) =>
        (sectionDateMap.get(a) ?? "").localeCompare(sectionDateMap.get(b) ?? ""),
    );

    return (
        <div className="flex flex-col gap-8">
            {sortedLabels.map((label) => (
                <section key={label}>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tertiary">{label}</h2>
                    <div className="flex flex-col gap-3">
                        {sectionMap.get(label)!.map((item) =>
                            item.kind === "group" ? (
                                <PredictionCard
                                    key={`g-${item.entry.match.id}-${item.entry.groupId}`}
                                    match={item.entry.match}
                                    groupId={item.entry.groupId}
                                    groupName={groups.length > 1 ? item.entry.groupName : undefined}
                                    prediction={item.entry.prediction}
                                    odds={combinedOdds.get(
                                        `${item.entry.match.home_team}|${item.entry.match.away_team}`,
                                    )}
                                    competitionType={item.entry.competitionType}
                                />
                            ) : (
                                <ZakladFixtureCard
                                    key={`z-${item.fixture.id}`}
                                    fixture={item.fixture}
                                    zakladId={item.fixture.zaklad_id}
                                    userId={userId}
                                    myPrediction={item.prediction}
                                    myPoints={item.points}
                                />
                            ),
                        )}
                    </div>
                </section>
            ))}
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

// ─── Zakłady tab ─────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(dateStr),
    );
}

async function ZakladyTab({ userId }: { userId: string }) {
    const supabase = await createClient();

    const { data: memberships } = await supabase
        .from("zaklad_members")
        .select("zaklad_id, zaklady(id, number, status, created_at, zaklad_fixtures(id), zaklad_members(user_id))")
        .eq("user_id", userId)
        .order("joined_at", { ascending: false });

    type ZakladRow = {
        id: string;
        number: number;
        status: "active" | "finished";
        created_at: string;
        zaklad_fixtures: { id: string }[];
        zaklad_members: { user_id: string }[];
    };

    const zaklady = (memberships?.map((m) => m.zaklady).filter(Boolean) ?? []) as unknown as ZakladRow[];

    if (zaklady.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-secondary bg-primary py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-secondary">
                    <Ticket01 className="size-6 text-tertiary" />
                </div>
                <div>
                    <p className="font-semibold text-primary">Brak zakładów</p>
                    <p className="mt-1 text-sm text-tertiary">Wybierz mecze i utwórz swój pierwszy zakład.</p>
                </div>
                <Link
                    href="/mecze"
                    className="rounded-xl bg-brand-solid px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                    Przeglądaj mecze
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {zaklady.map((z) => (
                <Link
                    key={z.id}
                    href={`/zaklady/${z.id}`}
                    className="flex items-center gap-3 rounded-xl border border-secondary bg-primary px-4 py-3 shadow-xs transition hover:bg-primary_hover"
                >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary">
                        <Ticket01 className="size-5 text-fg-brand-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-primary">Zakład #{z.number}</p>
                            {z.status === "active" && (
                                <span className="rounded-full bg-success-secondary px-2 py-0.5 text-xs font-medium text-success-primary">
                                    Aktywny
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-tertiary">
                            <span>{z.zaklad_fixtures.length} {z.zaklad_fixtures.length === 1 ? "mecz" : "meczów"}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                                <Users01 className="size-3" />
                                {z.zaklad_members.length}
                            </span>
                            <span>·</span>
                            <span>{formatDate(z.created_at)}</span>
                        </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-fg-quaternary" />
                </Link>
            ))}
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
            <div className="flex flex-col gap-3 sm:flex-row">
                <CreateGroupModal buttonClassName="w-full sm:w-auto" />
                <JoinGroupModal buttonClassName="w-full sm:w-auto" />
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
                                <div className={`size-10 shrink-0 overflow-hidden rounded-lg ${group.avatar_url ? "bg-secondary" : "border border-secondary"}`}>
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
