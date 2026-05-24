"use client";

import { useState, useCallback, useMemo } from "react";
import { Users01 } from "@untitledui/icons";
import { ZakladFixtureCard } from "./zaklad-fixture-card";
import { ZakladRanking } from "./zaklad-ranking";
import { ZakladSettingsMenu } from "./zaklad-settings-menu";
import { WcGroupTable } from "./wc-group-table";

const FINISHED_STATUSES = ["finished", "FT", "AET", "PEN", "Finished"];

interface ZakladFixture {
    id: string;
    match_id: string;
    league_id: string;
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
}

interface ZakladMember {
    user_id: string;
    joined_at: string;
    profiles: { display_name: string; avatar_url: string | null } | null;
}

interface ZakladData {
    id: string;
    number: number;
    invite_code: string;
    status: "active" | "finished";
    created_at: string;
    creator_id: string;
    zaklad_fixtures: ZakladFixture[];
    zaklad_members: ZakladMember[];
}

interface Prediction {
    id: string;
    fixture_id: string;
    user_id: string;
    predicted_home: number;
    predicted_away: number;
    points: number | null;
}

interface Props {
    zaklad: ZakladData;
    userId: string;
    predictions: Prediction[];
}

const WC_LEAGUE_ID = "28";

const TABS = ["typowania", "ranking", "grupy"] as const;
type Tab = (typeof TABS)[number];

export function ZakladDetail({ zaklad, userId, predictions: initialPredictions }: Props) {
    const [tab, setTab] = useState<Tab>("typowania");
    const [predictions, setPredictions] = useState<Prediction[]>(initialPredictions);

    // Live fixture data propagated back from ZakladFixtureCard syncs
    const [liveFixtureData, setLiveFixtureData] = useState<
        Map<string, { home_score: string; away_score: string; match_status: string }>
    >(new Map());

    const isCreator = zaklad.creator_id === userId;
    const hasWcFixtures = zaklad.zaklad_fixtures.some((f) => f.league_id === WC_LEAGUE_ID);
    const memberCount = zaklad.zaklad_members.length;

    const handlePrediction = useCallback(
        (fixtureId: string, home: number, away: number) => {
            // Optimistic update — API call is handled inside ZakladFixtureCard (auto-save)
            setPredictions((prev) => {
                const existing = prev.find((p) => p.fixture_id === fixtureId && p.user_id === userId);
                if (existing) {
                    return prev.map((p) =>
                        p.fixture_id === fixtureId && p.user_id === userId
                            ? { ...p, predicted_home: home, predicted_away: away }
                            : p,
                    );
                }
                return [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        fixture_id: fixtureId,
                        user_id: userId,
                        predicted_home: home,
                        predicted_away: away,
                        points: null,
                    },
                ];
            });
        },
        [userId],
    );

    const handleFixtureUpdate = useCallback(
        (fixtureId: string, homeScore: string, awayScore: string, matchStatus: string) => {
            setLiveFixtureData((prev) =>
                new Map(prev).set(fixtureId, { home_score: homeScore, away_score: awayScore, match_status: matchStatus }),
            );
        },
        [],
    );

    // Sort fixtures by date
    const sortedFixtures = [...zaklad.zaklad_fixtures].sort((a, b) =>
        a.match_date.localeCompare(b.match_date),
    );

    // Merge original fixtures with live data for ranking calculation
    const rankingFixtures = useMemo(
        () =>
            sortedFixtures.map((f) => {
                const live = liveFixtureData.get(f.id);
                return live ? { ...f, ...live } : f;
            }),
        [sortedFixtures, liveFixtureData],
    );

    // Derive whether the whole zakład is finished (all fixtures done)
    const zakladIsFinished = useMemo(() => {
        if (sortedFixtures.length === 0) return false;
        return sortedFixtures.every((f) => {
            const status = liveFixtureData.get(f.id)?.match_status ?? f.match_status;
            return FINISHED_STATUSES.includes(status);
        });
    }, [sortedFixtures, liveFixtureData]);

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-primary">Zakład #{zaklad.number}</h1>
                        {zakladIsFinished && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-tertiary">
                                Zakończony
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-tertiary">
                        <Users01 className="size-3.5" />
                        <span>{memberCount} {memberCount === 1 ? "uczestnik" : "uczestników"}</span>
                        <span>·</span>
                        <span>{zaklad.zaklad_fixtures.length} {zaklad.zaklad_fixtures.length === 1 ? "mecz" : "meczów"}</span>
                    </div>
                </div>

                <ZakladSettingsMenu
                    zakladId={zaklad.id}
                    zakladNumber={zaklad.number}
                    inviteCode={zaklad.invite_code}
                    memberCount={memberCount}
                    isCreator={isCreator}
                />
            </div>

            {/* Tabs */}
            <div className="flex overflow-hidden rounded-xl bg-secondary">
                {TABS.filter((t) => t !== "grupy" || hasWcFixtures).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`flex-1 border-b-2 py-3 text-center text-sm capitalize transition ${
                            tab === t
                                ? "border-white font-bold text-white"
                                : "border-secondary/40 font-medium text-tertiary hover:text-secondary"
                        }`}
                    >
                        {t === "typowania" ? "Wydarzenia" : t === "ranking" ? "Ranking" : "Grupy MŚ"}
                    </button>
                ))}
            </div>

            {/* Typowania tab */}
            {tab === "typowania" && (
                <div className="flex flex-col gap-4">
                    {sortedFixtures.map((fixture) => {
                        const myPred = predictions.find(
                            (p) => p.fixture_id === fixture.id && p.user_id === userId,
                        );
                        return (
                            <ZakladFixtureCard
                                key={fixture.id}
                                fixture={fixture}
                                zakladId={zaklad.id}
                                userId={userId}
                                myPrediction={
                                    myPred
                                        ? { home: myPred.predicted_home, away: myPred.predicted_away }
                                        : null
                                }
                                myPoints={myPred?.points ?? null}
                                onPredict={(home, away) => handlePrediction(fixture.id, home, away)}
                                onFixtureUpdate={handleFixtureUpdate}
                            />
                        );
                    })}
                </div>
            )}

            {/* Ranking tab */}
            {tab === "ranking" && (
                <ZakladRanking
                    members={zaklad.zaklad_members}
                    fixtures={rankingFixtures}
                    predictions={predictions}
                    userId={userId}
                />
            )}

            {/* Grupy MŚ tab */}
            {tab === "grupy" && hasWcFixtures && <WcGroupTable />}
        </div>
    );
}
