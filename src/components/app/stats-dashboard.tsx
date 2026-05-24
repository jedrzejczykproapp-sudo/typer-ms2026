"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart01, Target01, Trophy01, Users01 } from "@untitledui/icons";

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (value === 0) { setDisplay(0); return; }
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
        return () => { clearTimeout(timeout); cancelAnimationFrame(rafRef.current); };
    }, [value, delay]);

    return <>{display}</>;
}

// ─── Animated bar ─────────────────────────────────────────────────────────────

function HorizontalBar({
    label,
    count,
    pct,
    color,
    delay,
}: {
    label: string;
    count: number;
    pct: number;
    color: string;
    delay: number;
}) {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const t = setTimeout(() => setWidth(pct), delay);
        return () => clearTimeout(t);
    }, [pct, delay]);

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-secondary">{label}</span>
                <span className="text-sm font-bold tabular-nums text-primary">{count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${width}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
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
    groupWins: number;
    zakladWins: number;
}

// ─── Win tile ─────────────────────────────────────────────────────────────────

function WinTile({ label, sublabel, value, delay }: { label: string; sublabel: string; value: number; delay: number }) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-secondary bg-primary p-5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-warning-primary">
                <Trophy01 className="size-5 text-warning-primary" />
            </div>
            <p className="text-3xl font-bold tabular-nums text-primary">
                <AnimatedNumber value={value} delay={delay} />
            </p>
            <div>
                <p className="text-xs font-semibold text-primary">{label}</p>
                <p className="text-[11px] text-tertiary">{sublabel}</p>
            </div>
        </div>
    );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
    label,
    value,
    icon: Icon,
    delay,
}: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    delay: number;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-secondary bg-primary p-5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-secondary">
                <Icon className="size-5 text-fg-tertiary" />
            </div>
            <p className="text-3xl font-bold tabular-nums text-primary">
                <AnimatedNumber value={value} delay={delay} />
            </p>
            <p className="text-xs font-medium text-tertiary">{label}</p>
        </div>
    );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function StatsDashboard({ stats }: { stats: UserStats }) {
    const settled = stats.exact + stats.correct + stats.wrong;
    const accuracy = settled > 0 ? Math.round(((stats.exact + stats.correct) / settled) * 100) : 0;

    const barPct = (n: number) => (settled > 0 ? (n / settled) * 100 : 0);

    return (
        <div className="flex flex-col gap-3">

            {/* ── 1. Accuracy — hero card ─────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand-primary bg-brand-primary px-5 py-8 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-secondary">
                    Trafność typowań
                </p>
                <p className="text-7xl font-bold tabular-nums leading-none text-brand-primary">
                    <AnimatedNumber value={accuracy} delay={100} />
                    <span className="text-5xl">%</span>
                </p>
                <p className="text-sm text-brand-secondary">
                    {settled > 0
                        ? `${stats.exact + stats.correct} trafione z ${settled} rozegranych`
                        : "Brak zakończonych typowań"}
                </p>
            </div>

            {/* ── 2. Total points ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between rounded-2xl border border-secondary bg-primary px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-brand-solid/10">
                        <Trophy01 className="size-5 text-fg-brand-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-primary">Łączne punkty</p>
                        <p className="text-xs text-tertiary">Grupy + zakłady</p>
                    </div>
                </div>
                <p className="text-3xl font-bold tabular-nums text-fg-brand-primary">
                    <AnimatedNumber value={stats.totalPoints} delay={200} />
                </p>
            </div>

            {/* ── 3. Horizontal bars ──────────────────────────────────────── */}
            <div className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary px-5 py-5">
                <p className="text-sm font-semibold text-primary">Podział typowań</p>
                <HorizontalBar
                    label="Dokładny wynik (3 pkt)"
                    count={stats.exact}
                    pct={barPct(stats.exact)}
                    color="#8b5cf6"
                    delay={350}
                />
                <HorizontalBar
                    label="Trafiony wynik (1 pkt)"
                    count={stats.correct}
                    pct={barPct(stats.correct)}
                    color="#a78bfa"
                    delay={450}
                />
                <HorizontalBar
                    label="Błędny wynik (0 pkt)"
                    count={stats.wrong}
                    pct={barPct(stats.wrong)}
                    color="#d4d4d8"
                    delay={550}
                />
            </div>

            {/* ── 4. Win tiles ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
                <WinTile label="Wygrane rozgrywki" sublabel="grupy" value={stats.groupWins}  delay={300} />
                <WinTile label="Wygrane zakłady"   sublabel="zakłady" value={stats.zakladWins} delay={400} />
            </div>

            {/* ── 5. Stat tiles ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
                <StatTile label="Wszystkie typy"  value={stats.total}   icon={BarChart01} delay={0}   />
                <StatTile label="Oczekujące typy" value={stats.pending} icon={Target01}   delay={80}  />
                <StatTile label="Dokładne wyniki" value={stats.exact}   icon={Target01}   delay={160} />
                <StatTile label="Grupy"           value={stats.groups}  icon={Users01}    delay={240} />
            </div>

        </div>
    );
}
