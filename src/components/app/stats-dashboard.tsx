"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { BarChart01, CheckCircle, Target01, Trophy01, Users01 } from "@untitledui/icons";

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (value === 0) return;
            const duration = 900;
            let startTs: number | null = null;

            const step = (ts: number) => {
                if (!startTs) startTs = ts;
                const prog = Math.min((ts - startTs) / duration, 1);
                const eased = 1 - Math.pow(1 - prog, 3);
                setDisplay(Math.round(eased * value));
                if (prog < 1) rafRef.current = requestAnimationFrame(step);
            };
            rafRef.current = requestAnimationFrame(step);
        }, delay);

        return () => {
            clearTimeout(timeout);
            cancelAnimationFrame(rafRef.current);
        };
    }, [value, delay]);

    return <>{display}</>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserStats {
    total: number;
    exact: number;
    correct: number;
    wrong: number;
    pending: number;
    totalPoints: number;
    groups: number;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
    label,
    value,
    icon: Icon,
    delay,
    accent,
}: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    delay: number;
    accent?: boolean;
}) {
    return (
        <div className={`flex flex-col gap-3 rounded-2xl border p-5 ${accent ? "border-brand-primary bg-brand-primary" : "border-secondary bg-primary"}`}>
            <div className={`flex size-9 items-center justify-center rounded-xl ${accent ? "bg-brand-solid/20" : "bg-secondary"}`}>
                <Icon className={`size-5 ${accent ? "text-fg-brand-primary" : "text-fg-tertiary"}`} />
            </div>
            <p className={`text-3xl font-bold tabular-nums ${accent ? "text-brand-primary" : "text-primary"}`}>
                <AnimatedNumber value={value} delay={delay} />
            </p>
            <p className={`text-xs font-medium ${accent ? "text-brand-secondary" : "text-tertiary"}`}>{label}</p>
        </div>
    );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function StatsDashboard({ stats }: { stats: UserStats }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const settled = stats.exact + stats.correct + stats.wrong;
    const accuracy = settled > 0 ? Math.round(((stats.exact + stats.correct) / settled) * 100) : 0;

    // Neutral colors adapt to theme — dark gray in dark mode, light gray in light mode
    const colorWrong   = isDark ? "#3f3f46" : "#d4d4d8";
    const colorPending = isDark ? "#27272a" : "#e4e4e7";
    const colorEmpty   = isDark ? "#27272a" : "#e4e4e7";

    // Donut chart — always 4 segments so the chart never looks empty
    const chartData = [
        { name: "Dokładne",   value: Math.max(stats.exact, 0),   color: "#8b5cf6" },
        { name: "Wygrane",    value: Math.max(stats.correct, 0),  color: "#a78bfa" },
        { name: "Błędne",     value: Math.max(stats.wrong, 0),    color: colorWrong },
        { name: "Oczekujące", value: Math.max(stats.pending, 0),  color: colorPending },
    ];
    const hasData = chartData.some((d) => d.value > 0);
    const displayData = hasData ? chartData.filter((d) => d.value > 0) : [{ name: "Brak", value: 1, color: colorEmpty }];

    return (
        <div className="flex flex-col gap-3">
            {/* Donut + accuracy card */}
            <div className="overflow-hidden rounded-2xl border border-secondary bg-primary">
                <div className="px-5 pt-5">
                    <p className="text-sm font-semibold text-primary">Trafność typowań</p>
                    <p className="mt-0.5 text-xs text-tertiary">Wszystkie Twoje typy we wszystkich grupach</p>
                </div>

                <div className="relative mx-auto h-52 w-full max-w-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={displayData}
                                cx="50%"
                                cy="50%"
                                innerRadius={68}
                                outerRadius={90}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                                animationBegin={300}
                                animationDuration={1100}
                                strokeWidth={0}
                                paddingAngle={hasData ? 2 : 0}
                            >
                                {displayData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center text */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-bold tabular-nums text-primary">
                            <AnimatedNumber value={accuracy} delay={400} />%
                        </p>
                        <p className="text-xs text-tertiary">trafność</p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 px-5 pb-5 pt-1">
                    {[
                        { label: "Dokładne wyniki", color: "#8b5cf6",    count: stats.exact },
                        { label: "Trafiony wynik",  color: "#a78bfa",    count: stats.correct },
                        { label: "Błędne",          color: colorWrong,   count: stats.wrong },
                        { label: "Oczekujące",      color: colorPending, count: stats.pending },
                    ].map(({ label, color, count }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <div className="size-2.5 shrink-0 rounded-full border border-white/10" style={{ background: color }} />
                            <span className="text-xs text-tertiary">
                                {label} <span className="font-semibold text-primary">({count})</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4 stat tiles */}
            <div className="grid grid-cols-2 gap-3">
                <StatTile label="Obstawione mecze"   value={stats.total}       icon={BarChart01}    delay={0}   />
                <StatTile label="Dokładne wyniki"    value={stats.exact}       icon={Target01}      delay={80}  />
                <StatTile label="Trafione wyniki"    value={stats.correct}     icon={CheckCircle}   delay={160} />
                <StatTile label="Grupy"              value={stats.groups}      icon={Users01}       delay={240} />
            </div>

            {/* Total points banner */}
            <div className="flex items-center justify-between rounded-2xl border border-secondary bg-primary px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-brand-solid/10">
                        <Trophy01 className="size-5 text-fg-brand-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-primary">Łączne punkty</p>
                        <p className="text-xs text-tertiary">Suma ze wszystkich grup</p>
                    </div>
                </div>
                <p className="text-3xl font-bold tabular-nums text-fg-brand-primary">
                    <AnimatedNumber value={stats.totalPoints} delay={320} />
                </p>
            </div>
        </div>
    );
}
