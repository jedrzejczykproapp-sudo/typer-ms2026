"use client";

import { useState, type ReactNode } from "react";

const TABS = [
    { key: "wydarzenia", label: "Wydarzenia" },
    { key: "zaklady",    label: "Zakłady"    },
    { key: "grupy",      label: "Grupy"      },
    { key: "statystyki", label: "Statystyki" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface KontoTabPanelProps {
    defaultTab: string;
    hasTodayMatches: boolean;
    wydarzeniaContent: ReactNode;
    zakladyContent: ReactNode;
    grupyContent: ReactNode;
    statystykiContent: ReactNode;
}

export function KontoTabPanel({
    defaultTab,
    hasTodayMatches,
    wydarzeniaContent,
    zakladyContent,
    grupyContent,
    statystykiContent,
}: KontoTabPanelProps) {
    const isValid = TABS.some((t) => t.key === defaultTab);
    const [activeTab, setActiveTab] = useState<TabKey>(
        (isValid ? defaultTab : "wydarzenia") as TabKey,
    );

    function switchTab(tab: TabKey) {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState(null, "", url.toString());
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Tab bar */}
            <div className="flex overflow-hidden rounded-xl bg-secondary">
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => switchTab(key)}
                        className={`relative flex-1 border-b-2 py-4 text-center text-sm transition ${
                            activeTab === key
                                ? "border-white font-bold text-white"
                                : "border-secondary/40 font-medium text-tertiary hover:text-secondary"
                        }`}
                    >
                        {label}
                        {key === "wydarzenia" && hasTodayMatches && (
                            <span className="absolute right-2 top-1/2 size-1.5 -translate-y-1/2 animate-pulse rounded-full bg-brand-solid" />
                        )}
                    </button>
                ))}
            </div>

            {/* Panels */}
            <div className={activeTab !== "wydarzenia"  ? "hidden" : undefined}>{wydarzeniaContent}</div>
            <div className={activeTab !== "zaklady"     ? "hidden" : undefined}>{zakladyContent}</div>
            <div className={activeTab !== "grupy"       ? "hidden" : undefined}>{grupyContent}</div>
            <div className={activeTab !== "statystyki"  ? "hidden" : undefined}>{statystykiContent}</div>
        </div>
    );
}
