"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FixtureCard } from "@/components/app/fixture-card";
import type { Fixture } from "@/app/api/top-fixtures/route";
import { TOP_LEAGUES } from "@/lib/top-leagues";
import { ShoppingCart01, X } from "@untitledui/icons";

function formatDay(dateStr: string) {
    const d = new Date(dateStr.replace(" ", "T"));
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return "Dziś";
    if (d.toDateString() === tomorrow.toDateString()) return "Jutro";
    return new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

const ALL = "all";

export default function MeczePage() {
    const router = useRouter();
    const [fixtures, setFixtures] = useState<Fixture[] | null>(null);
    const [error, setError] = useState(false);
    const [activeLeague, setActiveLeague] = useState(ALL);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetch("/api/top-fixtures")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) setFixtures(data);
                else setError(true);
            })
            .catch(() => setError(true));
    }, []);

    // Only upcoming fixtures (not started yet)
    const upcoming = useMemo(() => {
        if (!fixtures) return null;
        const now = new Date();
        return fixtures.filter((f) => {
            const matchTime = new Date(f.match_date.replace(" ", "T"));
            const isFinished = f.status === "FT" || f.status === "AET" || f.status === "PEN" || f.status === "Finished";
            return !isFinished && matchTime > now;
        });
    }, [fixtures]);

    const filtered = useMemo(() => {
        if (!upcoming) return null;
        if (activeLeague === ALL) return upcoming;
        return upcoming.filter((f) => f.league_id === activeLeague);
    }, [upcoming, activeLeague]);

    const grouped = useMemo(() => {
        if (!filtered) return null;
        const map = new Map<string, Fixture[]>();
        for (const f of filtered) {
            const day = f.match_date.slice(0, 10);
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push(f);
        }
        return map;
    }, [filtered]);

    const toggle = useCallback((matchId: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(matchId)) next.delete(matchId);
            else next.add(matchId);
            return next;
        });
    }, []);

    const clearCart = useCallback(() => setSelected(new Set()), []);

    const selectedFixtures = useMemo(
        () => (upcoming ?? []).filter((f) => selected.has(f.match_id)),
        [upcoming, selected],
    );

    async function createZaklad() {
        if (selectedFixtures.length === 0 || creating) return;
        setCreating(true);
        try {
            const res = await fetch("/api/zaklady", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fixtures: selectedFixtures }),
            });
            if (!res.ok) throw new Error("Błąd tworzenia zakładu");
            const { id } = await res.json();
            router.push(`/zaklady/${id}`);
        } catch {
            setCreating(false);
        }
    }

    return (
        <div className="flex flex-col gap-5 pb-20">
            <h1 className="text-lg font-bold text-primary">Wybierz mecze do zakładu</h1>

            {/* League filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                    onClick={() => setActiveLeague(ALL)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        activeLeague === ALL
                            ? "bg-brand-solid text-white"
                            : "bg-secondary text-tertiary hover:bg-secondary_hover"
                    }`}
                >
                    Wszystkie
                </button>
                {TOP_LEAGUES.map((l) => (
                    <button
                        key={l.id}
                        onClick={() => setActiveLeague(l.id)}
                        className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            activeLeague === l.id
                                ? "bg-brand-solid text-white"
                                : "bg-secondary text-tertiary hover:bg-secondary_hover"
                        }`}
                    >
                        <span>{l.flag}</span>
                        <span>{l.name}</span>
                    </button>
                ))}
            </div>

            {error && (
                <p className="rounded-xl border border-secondary bg-primary p-6 text-center text-sm text-tertiary">
                    Nie udało się pobrać meczów.
                </p>
            )}

            {!fixtures && !error && (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-36 animate-pulse rounded-xl bg-secondary" />
                    ))}
                </div>
            )}

            {grouped && grouped.size === 0 && (
                <p className="rounded-xl border border-secondary bg-primary p-6 text-center text-sm text-tertiary">
                    Brak nadchodzących meczów w najbliższych 7 dniach.
                </p>
            )}

            {grouped && Array.from(grouped.entries()).map(([day, dayFixtures]) => (
                <section key={day}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tertiary capitalize">
                        {formatDay(dayFixtures[0].match_date)}
                    </h2>
                    <div className="flex flex-col gap-3">
                        {dayFixtures.map((f) => (
                            <FixtureCard
                                key={f.match_id}
                                fixture={f}
                                selectable
                                selected={selected.has(f.match_id)}
                                onToggle={() => toggle(f.match_id)}
                            />
                        ))}
                    </div>
                </section>
            ))}

            {/* Cart bar — appears above bottom nav when items selected */}
            {selected.size > 0 && (
                <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-2 lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 lg:max-w-2xl lg:px-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-secondary bg-primary p-3 shadow-lg">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary">
                            <ShoppingCart01 className="size-5 text-fg-brand-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-primary">
                                {selected.size} {selected.size === 1 ? "mecz" : selected.size < 5 ? "mecze" : "meczów"}
                            </p>
                            <p className="text-xs text-tertiary">wybrano do zakładu</p>
                        </div>
                        <button
                            onClick={clearCart}
                            className="flex size-8 items-center justify-center rounded-lg text-tertiary transition hover:bg-secondary"
                        >
                            <X className="size-4" />
                        </button>
                        <button
                            onClick={createZaklad}
                            disabled={creating}
                            className="shrink-0 rounded-xl bg-brand-solid px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                        >
                            {creating ? "Tworzę…" : "Utwórz zakład"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
