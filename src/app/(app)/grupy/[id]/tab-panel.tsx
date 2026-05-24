"use client";

import { useState, type ReactNode } from "react";

const TABS = [
    { key: "wydarzenia", label: "Wydarzenia" },
    { key: "tabela",     label: "Ranking"    },
    { key: "grupy",      label: "Tabela"     },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface GroupTabPanelProps {
    defaultTab: string;
    wydarzeniaContent: ReactNode;
    tabelaContent: ReactNode;
    grupyContent: ReactNode;
}

export function GroupTabPanel({
    defaultTab,
    wydarzeniaContent,
    tabelaContent,
    grupyContent,
}: GroupTabPanelProps) {
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
                        className={`flex-1 border-b-2 py-4 text-center text-sm transition ${
                            activeTab === key
                                ? "border-white font-bold text-white"
                                : "border-secondary/40 font-medium text-tertiary hover:text-secondary"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Panels — all pre-rendered server-side, toggled via CSS */}
            <div className={activeTab !== "wydarzenia" ? "hidden" : undefined}>{wydarzeniaContent}</div>
            <div className={activeTab !== "tabela"     ? "hidden" : undefined}>{tabelaContent}</div>
            <div className={activeTab !== "grupy"      ? "hidden" : undefined}>{grupyContent}</div>
        </div>
    );
}
