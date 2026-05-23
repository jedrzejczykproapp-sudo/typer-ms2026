"use client";

import { useState, type ReactNode } from "react";

const TABS = [
    { key: "typowania", label: "Typowania" },
    { key: "statystyki", label: "Statystyki" },
    { key: "grupy", label: "Grupy" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface KontoTabPanelProps {
    defaultTab: string;
    hasTodayMatches: boolean;
    typowaniaContent: ReactNode;
    statystykiContent: ReactNode;
    grupyContent: ReactNode;
}

export function KontoTabPanel({
    defaultTab,
    hasTodayMatches,
    typowaniaContent,
    statystykiContent,
    grupyContent,
}: KontoTabPanelProps) {
    const isValid = TABS.some((t) => t.key === defaultTab);
    const [activeTab, setActiveTab] = useState<TabKey>(
        (isValid ? defaultTab : "typowania") as TabKey,
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
                                ? "border-primary font-bold text-primary"
                                : "border-secondary font-medium text-tertiary hover:text-secondary"
                        }`}
                    >
                        {label}
                        {key === "typowania" && hasTodayMatches && (
                            <span className="absolute right-3 top-1/2 size-1.5 -translate-y-1/2 animate-pulse rounded-full bg-brand-solid" />
                        )}
                    </button>
                ))}
            </div>

            {/* Panels — all pre-rendered server-side, toggled via CSS */}
            <div className={activeTab !== "typowania" ? "hidden" : undefined}>{typowaniaContent}</div>
            <div className={activeTab !== "statystyki" ? "hidden" : undefined}>{statystykiContent}</div>
            <div className={activeTab !== "grupy" ? "hidden" : undefined}>{grupyContent}</div>
        </div>
    );
}
