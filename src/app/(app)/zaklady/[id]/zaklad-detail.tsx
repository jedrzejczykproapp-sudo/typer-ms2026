"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Copy01, Users01, CheckCircle, Trash01 } from "@untitledui/icons";
import { ZakladFixtureCard } from "./zaklad-fixture-card";
import { ZakladRanking } from "./zaklad-ranking";
import { cx } from "@/utils/cx";

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://typerek.com";
const TABS = ["typowania", "ranking"] as const;
type Tab = (typeof TABS)[number];

export function ZakladDetail({ zaklad, userId, predictions: initialPredictions }: Props) {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>("typowania");
    const [predictions, setPredictions] = useState<Prediction[]>(initialPredictions);
    const [copied, setCopied] = useState(false);
    const [cancelStep, setCancelStep] = useState<"idle" | "confirm" | "loading">("idle");
    const [cancelError, setCancelError] = useState<string | null>(null);

    const isCreator = zaklad.creator_id === userId;
    const memberCount = zaklad.zaklad_members.length;
    const inviteLink = `${APP_URL}/dolacz-zaklad?kod=${zaklad.invite_code}`;

    const copyInvite = useCallback(() => {
        navigator.clipboard.writeText(inviteLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [inviteLink]);

    const handleCancelClick = useCallback(() => {
        if (memberCount > 1) {
            setCancelStep("confirm");
        } else {
            doCancel();
        }
    }, [memberCount]);

    const doCancel = useCallback(async () => {
        setCancelStep("loading");
        setCancelError(null);
        try {
            const res = await fetch(`/api/zaklady/${zaklad.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                setCancelError(data?.error ?? "Błąd serwera");
                setCancelStep("confirm");
                return;
            }
            router.push("/zaklady");
        } catch {
            setCancelError("Błąd połączenia");
            setCancelStep("confirm");
        }
    }, [zaklad.id, router]);

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

    // Sort fixtures by date
    const sortedFixtures = [...zaklad.zaklad_fixtures].sort((a, b) =>
        a.match_date.localeCompare(b.match_date),
    );

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-primary">Zakład #{zaklad.number}</h1>
                    <div className="flex items-center gap-1.5 text-xs text-tertiary">
                        <Users01 className="size-3.5" />
                        <span>{memberCount} {memberCount === 1 ? "uczestnik" : "uczestników"}</span>
                        <span>·</span>
                        <span>{zaklad.zaklad_fixtures.length} {zaklad.zaklad_fixtures.length === 1 ? "mecz" : "meczów"}</span>
                    </div>
                </div>

                {/* Akcje: Zaproś + Anuluj */}
                <div className="flex shrink-0 items-center gap-2">
                    <button
                        onClick={copyInvite}
                        className={cx(
                            "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                            copied
                                ? "border-success-solid bg-success-primary text-success-primary"
                                : "border-secondary bg-primary text-secondary hover:bg-secondary",
                        )}
                    >
                        {copied ? (
                            <><CheckCircle className="size-4" /> Skopiowano</>
                        ) : (
                            <><Copy01 className="size-4" /> Zaproś</>
                        )}
                    </button>

                    {isCreator && (
                        <button
                            onClick={handleCancelClick}
                            className="flex items-center gap-1.5 rounded-xl border border-error-solid px-4 py-2 text-sm font-semibold text-error-primary transition hover:bg-error-primary"
                        >
                            <Trash01 className="size-4" />
                            Anuluj
                        </button>
                    )}
                </div>
            </div>

            {/* Dialog potwierdzenia anulowania */}
            {cancelStep === "confirm" && (
                <div className="rounded-xl border border-error-solid bg-error-primary p-4">
                    <p className="text-sm font-semibold text-error-primary">Anulować zakład?</p>
                    <p className="mt-0.5 text-xs text-error-secondary">
                        Zakład ma {memberCount} uczestników. Wszyscy stracą dostęp i typy zostaną usunięte.
                    </p>
                    {cancelError && (
                        <p className="mt-2 text-xs text-error-primary">{cancelError}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={() => setCancelStep("idle")}
                            className="flex-1 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary"
                        >
                            Nie, wróć
                        </button>
                        <button
                            onClick={doCancel}
                            className="flex-1 rounded-lg bg-error-solid px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                        >
                            Tak, anuluj zakład
                        </button>
                    </div>
                </div>
            )}

            {cancelStep === "loading" && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-secondary py-4 text-sm text-tertiary">
                    <div className="size-4 animate-spin rounded-full border-2 border-brand-solid border-t-transparent" />
                    Anuluję zakład…
                </div>
            )}

            {/* Tabs */}
            <div className="flex overflow-hidden rounded-xl bg-secondary">
                {TABS.map((t) => (
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
                        {t === "typowania" ? "Wydarzenia" : "Ranking"}
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
                                myPrediction={
                                    myPred
                                        ? { home: myPred.predicted_home, away: myPred.predicted_away }
                                        : null
                                }
                                myPoints={myPred?.points ?? null}
                                onPredict={(home, away) => handlePrediction(fixture.id, home, away)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Ranking tab */}
            {tab === "ranking" && (
                <ZakladRanking
                    members={zaklad.zaklad_members}
                    fixtures={sortedFixtures}
                    predictions={predictions}
                    userId={userId}
                />
            )}
        </div>
    );
}
