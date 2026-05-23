"use client";

import { useEffect, useState, useMemo } from "react";
import { FixtureCard } from "@/components/app/fixture-card";
import type { Fixture } from "@/app/api/top-fixtures/route";
import { TOP_LEAGUES } from "@/lib/top-leagues";

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
    const [fixtures, setFixtures] = useState<Fixture[] | null>(null);
    const [error, setError] = useState(false);
    const [activeLeague, setActiveLeague] = useState(ALL);

    useEffect(() => {
        fetch("/api/top-fixtures")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) setFixtures(data);
                else setError(true);
            })
            .catch(() => setError(true));
    }, []);

    const filtered = useMemo(() => {
        if (!fixtures) return null;
        if (activeLeague === ALL) return fixtures;
        return fixtures.filter((f) => f.league_id === activeLeague);
    }, [fixtures, activeLeague]);

    // Group by day
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

    return (
        <div className="flex flex-col gap-5 pb-20">
            <h1 className="text-lg font-bold text-primary">Najbliższe mecze</h1>

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
                    Brak meczów w najbliższych 7 dniach.
                </p>
            )}

            {grouped && Array.from(grouped.entries()).map(([day, dayFixtures]) => (
                <section key={day}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tertiary capitalize">
                        {formatDay(dayFixtures[0].match_date)}
                    </h2>
                    <div className="flex flex-col gap-3">
                        {dayFixtures.map((f) => (
                            <FixtureCard key={f.match_id} fixture={f} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
