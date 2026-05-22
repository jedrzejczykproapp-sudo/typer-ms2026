"use client";

import { useState, type ReactNode } from "react";

const TABS = [
    { key: "typowania", label: "Typowania" },
    { key: "tabela", label: "Ranking" },
    { key: "grupy", label: "Tabela" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface GroupTabPanelProps {
    defaultTab: string;
    typowaniaContent: ReactNode;
    tabelaContent: ReactNode;
    grupyContent: ReactNode;
}

export function GroupTabPanel({
    defaultTab,
    typowaniaContent,
    tabelaContent,
    grupyContent,
}: GroupTabPanelProps) {
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
            <div className="flex gap-1 rounded-xl bg-secondary p-1">
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => switchTab(key)}
                        className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
                            activeTab === key
                                ? "bg-primary text-primary shadow-xs"
                                : "text-tertiary hover:text-secondary"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Panels — all pre-rendered server-side, toggled via CSS */}
            <div className={activeTab !== "typowania" ? "hidden" : undefined}>{typowaniaContent}</div>
            <div className={activeTab !== "tabela" ? "hidden" : undefined}>{tabelaContent}</div>
            <div className={activeTab !== "grupy" ? "hidden" : undefined}>{grupyContent}</div>
        </div>
    );
}
