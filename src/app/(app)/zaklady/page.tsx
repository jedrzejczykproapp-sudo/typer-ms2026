"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Ticket01, Users01 } from "@untitledui/icons";

interface ZakladItem {
    id: string;
    number: number;
    invite_code: string;
    status: "active" | "finished";
    created_at: string;
    zaklad_fixtures: { id: string }[];
    zaklad_members: { user_id: string }[];
}

const TABS = ["aktywne", "zakończone"] as const;
type Tab = (typeof TABS)[number];

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(dateStr),
    );
}

export default function ZakladyPage() {
    const [zaklady, setZaklady] = useState<ZakladItem[] | null>(null);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState<Tab>("aktywne");

    useEffect(() => {
        fetch("/api/zaklady")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) setZaklady(data);
                else setError(true);
            })
            .catch(() => setError(true));
    }, []);

    const filtered = zaklady?.filter((z) =>
        tab === "aktywne" ? z.status === "active" : z.status === "finished",
    );

    return (
        <div className="flex flex-col gap-5">
            <h1 className="text-lg font-bold text-primary">Zakłady</h1>

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
                        {t === "aktywne" ? "Aktywne" : "Zakończone"}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {!zaklady && !error && (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <p className="rounded-xl border border-secondary bg-primary p-6 text-center text-sm text-tertiary">
                    Nie udało się pobrać zakładów.
                </p>
            )}

            {/* Empty state */}
            {filtered?.length === 0 && (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-secondary bg-primary py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-secondary">
                        <Ticket01 className="size-6 text-tertiary" />
                    </div>
                    <div>
                        <p className="font-semibold text-primary">
                            {tab === "aktywne" ? "Brak aktywnych zakładów" : "Brak zakończonych zakładów"}
                        </p>
                        <p className="mt-1 text-sm text-tertiary">
                            {tab === "aktywne"
                                ? "Wybierz mecze na stronie Mecze i utwórz zakład."
                                : "Zakończone zakłady pojawią się tutaj."}
                        </p>
                    </div>
                    {tab === "aktywne" && (
                        <Link
                            href="/mecze"
                            className="rounded-xl bg-brand-solid px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                        >
                            Przeglądaj mecze
                        </Link>
                    )}
                </div>
            )}

            {/* List */}
            {filtered && filtered.length > 0 && (
                <div className="flex flex-col gap-2">
                    {filtered.map((z) => (
                        <Link
                            key={z.id}
                            href={`/zaklady/${z.id}`}
                            className="flex items-center gap-3 rounded-xl border border-secondary bg-primary px-4 py-3 shadow-xs transition hover:bg-primary_hover"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary">
                                <Ticket01 className="size-5 text-fg-brand-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-primary">Zakład #{z.number}</p>
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
            )}
        </div>
    );
}
