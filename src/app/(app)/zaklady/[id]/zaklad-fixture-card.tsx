"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Check, ChevronDown, ChevronUp } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Avatar } from "@/components/base/avatar/avatar";
import { createClient } from "@/lib/supabase/client";
import { cx } from "@/utils/cx";
import type { SyncedEvent, SyncedStats } from "@/lib/api-football";

interface ZakladFixture {
    id: string;
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

interface MemberPred {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    predicted_home: number;
    predicted_away: number;
    points: number | null;
}

interface Props {
    fixture: ZakladFixture;
    zakladId: string;
    userId?: string;
    myPrediction: { home: number; away: number } | null;
    myPoints: number | null;
    onPredict?: (home: number, away: number) => void;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function TeamLogo({ badge, name }: { badge: string; name: string }) {
    const [err, setErr] = useState(false);
    if (!badge || err) {
        return (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-tertiary">
                {name.charAt(0)}
            </div>
        );
    }
    return (
        <img
            src={badge}
            alt={name}
            className="size-12 shrink-0 rounded-xl object-contain p-1"
            onError={() => setErr(true)}
        />
    );
}

function ScoreInput({
    value,
    onChange,
    disabled,
}: {
    value: number;
    onChange: (v: number) => void;
    disabled: boolean;
}) {
    const btnClass =
        "flex size-10 items-center justify-center rounded-xl border border-secondary bg-secondary text-2xl font-bold text-primary transition hover:bg-secondary_hover disabled:cursor-not-allowed disabled:opacity-40";
    return (
        <div className="flex items-center gap-2">
            <button type="button" disabled={disabled || value <= 0}
                onClick={() => onChange(Math.max(0, value - 1))} className={btnClass}>−</button>
            <span className="w-8 text-center text-3xl font-bold tabular-nums text-primary">{value}</span>
            <button type="button" disabled={disabled}
                onClick={() => onChange(Math.min(20, value + 1))} className={btnClass}>+</button>
        </div>
    );
}

function formatMatchDate(dateStr: string) {
    const d = new Date(dateStr.replace(" ", "T"));
    return new Intl.DateTimeFormat("pl-PL", {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
    }).format(d);
}

function calcLiveState(matchDate: string) {
    const start = new Date(matchDate.replace(" ", "T")).getTime();
    const elapsed = (Date.now() - start) / 60000;
    if (elapsed <= 45) {
        return { minute: Math.max(1, Math.floor(elapsed)), half: 1 as 1 | 2 | null, isHalftime: false, progress: (elapsed / 90) * 100 };
    }
    if (elapsed <= 60) {
        return { minute: 45, half: null as 1 | 2 | null, isHalftime: true, progress: 50 };
    }
    const s = elapsed - 15;
    return { minute: Math.min(Math.floor(s), 90), half: 2 as 1 | 2 | null, isHalftime: false, progress: Math.min((s / 90) * 100, 100) };
}

function calcPoints(ph: number, pa: number, ah: number, aa: number): number {
    if (ph === ah && pa === aa) return 3;
    if (Math.sign(ph - pa) === Math.sign(ah - aa)) return 1;
    return 0;
}

// ─── Event mark (goals / cards) ───────────────────────────────────────────────

function EventMark({ type }: { type: string }) {
    if (type === "yellow_card")
        return <span className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] bg-yellow-400" />;
    if (type === "red_card" || type === "yellow_red_card")
        return <span className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] bg-red-500" />;
    return <span className="text-sm leading-none">⚽</span>;
}

function eventLabel(evt: SyncedEvent) {
    if (evt.event_type === "own_goal") return `${evt.player_name ?? "?"} (własna)`;
    if (evt.event_type === "penalty")  return `${evt.player_name ?? "?"} (k.)`;
    return evt.player_name ?? "?";
}

// ─── Stat bar ────────────────────────────────────────────────────────────────

function StatBar({ label, home, away, unit = "" }: {
    label: string; home: number | null; away: number | null; unit?: string;
}) {
    const total = (home ?? 0) + (away ?? 0);
    const homePct = total > 0 ? ((home ?? 0) / total) * 100 : 50;
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
                <span className="w-8 font-semibold tabular-nums text-primary">{home ?? "—"}{unit}</span>
                <span className="text-quaternary">{label}</span>
                <span className="w-8 text-right font-semibold tabular-nums text-primary">{away ?? "—"}{unit}</span>
            </div>
            <div className="flex h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-brand-solid transition-all duration-500"
                    style={{ width: `${homePct}%` }} />
            </div>
        </div>
    );
}

// ─── Inline match details (events + stats) ───────────────────────────────────

function MatchDetails({ events, stats, homeName, awayName, loading }: {
    events: SyncedEvent[];
    stats: SyncedStats | null;
    homeName: string;
    awayName: string;
    loading: boolean;
}) {
    if (loading) {
        return (
            <div className="flex flex-col gap-2 rounded-xl border border-secondary bg-secondary/40 p-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="h-3 w-8 animate-pulse rounded-full bg-secondary" />
                        <div className="h-3 flex-1 animate-pulse rounded-full bg-secondary" />
                        <div className="h-3 w-8 animate-pulse rounded-full bg-secondary" />
                    </div>
                ))}
            </div>
        );
    }

    const hasEvents = events.length > 0;
    const hasStats = stats !== null;

    if (!hasEvents && !hasStats) {
        return (
            <div className="rounded-xl border border-secondary bg-secondary/40 px-3 py-6 text-center text-xs text-quaternary">
                Brak szczegółów meczu
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-secondary/40 p-3">
            {/* Teams header */}
            <div className="grid grid-cols-[1fr_auto_1fr] text-center text-[10px] font-semibold uppercase tracking-wider text-quaternary">
                <span className="truncate text-left">{homeName}</span>
                <span className="px-2">·</span>
                <span className="truncate text-right">{awayName}</span>
            </div>

            {/* Events timeline */}
            {hasEvents && (
                <div className="flex flex-col gap-0">
                    {events.map((evt, i) => (
                        <div key={i} className="grid grid-cols-[1fr_36px_1fr] items-center gap-1 py-[3px]">
                            {evt.team === "home" ? (
                                <>
                                    <div className="flex items-center justify-end gap-1.5 min-w-0">
                                        <span className="truncate text-right text-xs text-primary">{eventLabel(evt)}</span>
                                        <EventMark type={evt.event_type} />
                                    </div>
                                    <span className="text-center text-[11px] tabular-nums text-tertiary">
                                        {evt.minute}{evt.extra_minute ? `+${evt.extra_minute}` : ""}′
                                    </span>
                                    <div />
                                </>
                            ) : (
                                <>
                                    <div />
                                    <span className="text-center text-[11px] tabular-nums text-tertiary">
                                        {evt.minute}{evt.extra_minute ? `+${evt.extra_minute}` : ""}′
                                    </span>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <EventMark type={evt.event_type} />
                                        <span className="truncate text-xs text-primary">{eventLabel(evt)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {hasEvents && hasStats && <div className="h-px bg-secondary" />}

            {/* Stats */}
            {hasStats && (
                <div className="flex flex-col gap-2.5">
                    {([
                        { label: "Posiadanie", home: stats.home_possession, away: stats.away_possession, unit: "%" },
                        { label: "Strzały", home: stats.home_shots, away: stats.away_shots },
                        { label: "Celne", home: stats.home_shots_on_target, away: stats.away_shots_on_target },
                        { label: "Rzuty rożne", home: stats.home_corners, away: stats.away_corners },
                        { label: "Faule", home: stats.home_fouls, away: stats.away_fouls },
                    ] as const)
                        .filter((s) => s.home !== null || s.away !== null)
                        .map((s) => <StatBar key={s.label} {...s} />)
                    }
                </div>
            )}
        </div>
    );
}

// ─── Member predictions panel ────────────────────────────────────────────────

function MemberPredsPanel({ preds, loading, userId, homeScore, awayScore, isLive, isFinished }: {
    preds: MemberPred[];
    loading: boolean;
    userId?: string;
    homeScore: string;
    awayScore: string;
    isLive: boolean;
    isFinished: boolean;
}) {
    const hs = parseInt(homeScore);
    const as = parseInt(awayScore);
    const hasScore = !isNaN(hs) && !isNaN(as);

    const computePoints = (mp: MemberPred): number | null => {
        if (!hasScore) return null;
        if (isFinished) {
            if (mp.points !== null) return mp.points;
            return calcPoints(mp.predicted_home, mp.predicted_away, hs, as);
        }
        if (isLive) return calcPoints(mp.predicted_home, mp.predicted_away, hs, as);
        return null;
    };

    const sorted = [...preds].sort((a, b) => (computePoints(b) ?? -1) - (computePoints(a) ?? -1));

    return (
        <div className="flex flex-col gap-1 rounded-xl border border-secondary bg-secondary/40 p-2">
            {loading ? (
                <div className="flex flex-col gap-2 px-1 py-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="size-7 animate-pulse rounded-full bg-secondary" />
                            <div className="h-3 flex-1 animate-pulse rounded-full bg-secondary" />
                            <div className="h-3 w-10 animate-pulse rounded-full bg-secondary" />
                        </div>
                    ))}
                </div>
            ) : sorted.length === 0 ? (
                <p className="py-2 text-center text-xs text-quaternary">Brak typów dla tego meczu</p>
            ) : (
                sorted.map((mp) => {
                    const isMe = userId && mp.user_id === userId;
                    const inits = (mp.display_name ?? "?")
                        .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                    const pts = computePoints(mp);

                    return (
                        <div key={mp.user_id}
                            className={cx(
                                "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                                isMe && "bg-secondary",
                            )}>
                            <Avatar initials={inits} src={mp.avatar_url ?? undefined} size="xs" />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-primary">
                                {mp.display_name ?? "Anonim"}
                                {isMe && <span className="ml-1 font-normal text-tertiary">(Ty)</span>}
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-secondary">
                                {mp.predicted_home}:{mp.predicted_away}
                            </span>
                            {pts !== null && (
                                <span className={cx(
                                    "shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
                                    pts === 3 ? "bg-success-primary text-success-primary"
                                        : pts === 1 ? "bg-brand-primary text-brand-primary"
                                            : "bg-secondary text-quaternary",
                                )}>
                                    {pts} pkt
                                </span>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ZakladFixtureCard({ fixture, zakladId, userId, myPrediction, myPoints, onPredict }: Props) {
    // Prediction input state
    const [homeScore, setHomeScore] = useState(myPrediction?.home ?? 0);
    const [awayScore, setAwayScore] = useState(myPrediction?.away ?? 0);
    const [savedHome, setSavedHome] = useState(myPrediction?.home ?? 0);
    const [savedAway, setSavedAway] = useState(myPrediction?.away ?? 0);
    const [hasSaved, setHasSaved] = useState(!!myPrediction);
    const [justSaved, setJustSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    // Live / sync state
    const [liveScore, setLiveScore] = useState({ home: fixture.home_score, away: fixture.away_score });
    const [liveStatus, setLiveStatus] = useState(fixture.match_status);
    const [events, setEvents] = useState<SyncedEvent[]>([]);
    const [stats, setStats] = useState<SyncedStats | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Panels & member predictions
    const [panel, setPanel] = useState<"szczegoly" | "typy" | null>(null);
    const [memberPreds, setMemberPreds] = useState<MemberPred[]>([]);
    const [loadingPreds, setLoadingPreds] = useState(false);

    // Live ticker
    const [liveState, setLiveState] = useState<ReturnType<typeof calcLiveState> | null>(null);

    const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestScores = useRef({ home: myPrediction?.home ?? 0, away: myPrediction?.away ?? 0 });
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Derived state
    const now = new Date();
    const matchTime = new Date(fixture.match_date.replace(" ", "T"));
    const isStarted = matchTime <= now;
    const FINISHED_STATUSES = ["finished", "FT", "AET", "PEN", "Finished"];
    const isFinished = FINISHED_STATUSES.includes(liveStatus);
    const isLive = isStarted && !isFinished;
    const isLocked = isStarted;
    const hasScore = liveScore.home !== "" && liveScore.away !== "";
    const hasPrediction = myPrediction !== null || hasSaved;
    const hasChanged = homeScore !== savedHome || awayScore !== savedAway;

    // ── Live minute ticker ────────────────────────────────────────────────────
    useEffect(() => {
        if (!isLive) return;
        setLiveState(calcLiveState(fixture.match_date));
        const id = setInterval(() => setLiveState(calcLiveState(fixture.match_date)), 30_000);
        return () => clearInterval(id);
    }, [isLive, fixture.match_date]);

    // ── Sync with apifootball via our sync-fixture route ─────────────────────
    useEffect(() => {
        if (!isStarted) return;
        let cancelled = false;

        const doSync = async () => {
            try {
                const res = await fetch(`/api/zaklady/sync-fixture/${fixture.id}`, { method: "POST" });
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                if (data.matchStatus) setLiveStatus(data.matchStatus);
                if (data.homeScore !== null && data.homeScore !== undefined) {
                    setLiveScore({
                        home: String(data.homeScore),
                        away: String(data.awayScore ?? 0),
                    });
                }
                if (Array.isArray(data.events)) setEvents(data.events);
                if (data.stats !== undefined) setStats(data.stats);
            } catch { /* silent */ }
        };

        doSync();
        const id = isLive ? setInterval(doSync, 60_000) : null;
        return () => { cancelled = true; if (id) clearInterval(id); };
    }, [fixture.id, isStarted, isLive]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Realtime subscription to zaklad_fixtures for instant score updates ───
    useEffect(() => {
        if (!isStarted || isFinished) return;
        const supabase = createClient();

        const channel = supabase
            .channel(`zaklad-fixture:${fixture.id}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "zaklad_fixtures", filter: `id=eq.${fixture.id}` },
                (payload) => {
                    const row = payload.new as Record<string, string>;
                    if (row.home_score !== undefined) setLiveScore({ home: row.home_score, away: row.away_score });
                    if (row.match_status) setLiveStatus(row.match_status);
                },
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fixture.id, isStarted, isFinished]);

    // ── Fetch member predictions when panel opens ─────────────────────────────
    const fetchMemberPreds = useCallback(async () => {
        setLoadingPreds(true);
        const supabase = createClient();
        const { data: preds } = await supabase
            .from("zaklad_predictions")
            .select("user_id, predicted_home, predicted_away, points")
            .eq("fixture_id", fixture.id);

        if (!preds?.length) {
            setMemberPreds([]);
            setLoadingPreds(false);
            return;
        }

        const userIds = preds.map((p) => p.user_id);
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", userIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
        setMemberPreds(preds.map((p) => ({
            user_id: p.user_id,
            display_name: profileMap.get(p.user_id)?.display_name ?? null,
            avatar_url: profileMap.get(p.user_id)?.avatar_url ?? null,
            predicted_home: p.predicted_home,
            predicted_away: p.predicted_away,
            points: p.points as number | null,
        })));
        setLoadingPreds(false);
    }, [fixture.id]);

    useEffect(() => {
        if (panel !== "typy") {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            return;
        }
        fetchMemberPreds();
        if (isLive) pollRef.current = setInterval(fetchMemberPreds, 30_000);
        return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    }, [panel, isLive, fetchMemberPreds]);

    // When details panel opens, trigger a sync to get fresh events/stats
    useEffect(() => {
        if (panel !== "szczegoly") return;
        setLoadingDetails(true);
        fetch(`/api/zaklady/sync-fixture/${fixture.id}`, { method: "POST" })
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (!data) return;
                if (Array.isArray(data.events)) setEvents(data.events);
                if (data.stats !== undefined) setStats(data.stats);
                if (data.matchStatus) setLiveStatus(data.matchStatus);
                if (data.homeScore !== null && data.homeScore !== undefined) {
                    setLiveScore({ home: String(data.homeScore), away: String(data.awayScore ?? 0) });
                }
            })
            .catch(() => { /* silent */ })
            .finally(() => setLoadingDetails(false));
    }, [panel, fixture.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-save prediction ──────────────────────────────────────────────────
    const doSave = useCallback(async (home: number, away: number) => {
        setSaving(true);
        try {
            await fetch(`/api/zaklady/${zakladId}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fixture_id: fixture.id, predicted_home: home, predicted_away: away }),
            });
            setSavedHome(home);
            setSavedAway(away);
            setHasSaved(true);
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 2000);
        } catch { /* silent */ }
        setSaving(false);
    }, [zakladId, fixture.id]);

    const scheduleAutoSave = useCallback((home: number, away: number) => {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(() => doSave(home, away), 700);
    }, [doSave]);

    function handleHomeChange(v: number) {
        setHomeScore(v);
        latestScores.current = { home: v, away: latestScores.current.away };
        onPredict?.(v, latestScores.current.away);
        scheduleAutoSave(v, latestScores.current.away);
    }

    function handleAwayChange(v: number) {
        setAwayScore(v);
        latestScores.current = { home: latestScores.current.home, away: v };
        onPredict?.(latestScores.current.home, v);
        scheduleAutoSave(latestScores.current.home, v);
    }

    // ── Points display ────────────────────────────────────────────────────────
    const displayPoints = (() => {
        if (myPoints !== null) return myPoints;
        if (isFinished && hasPrediction && hasScore) {
            const ah = parseInt(liveScore.home);
            const aa = parseInt(liveScore.away);
            if (!isNaN(ah) && !isNaN(aa)) return calcPoints(homeScore, awayScore, ah, aa);
        }
        return null;
    })();

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className={cx(
            "flex flex-col gap-4 rounded-xl border bg-primary p-4 transition",
            isFinished ? "border-secondary" : "border-secondary shadow-xs",
        )}>
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-tertiary">
                    <span>{fixture.league_flag}</span>
                    <span className="truncate">{fixture.league_name}</span>
                </span>
                <div className="flex justify-center">
                    {isLive && (
                        <span className="flex items-center gap-1 rounded-full bg-success-primary px-2 py-0.5 text-xs font-bold text-success-primary">
                            <span className="size-1.5 animate-pulse rounded-full bg-success-solid" />
                            Trwa
                        </span>
                    )}
                    {isFinished && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-tertiary">
                            Zakończony
                        </span>
                    )}
                </div>
                <span className="text-right text-xs text-tertiary">{formatMatchDate(fixture.match_date)}</span>
            </div>

            {/* Venue */}
            {fixture.venue && (
                <p className="text-center text-[11px] font-medium uppercase tracking-wider text-quaternary">
                    {fixture.venue}
                </p>
            )}

            {/* Score row */}
            <div className="flex items-center gap-2">
                <div className="flex flex-1 justify-center">
                    {isStarted ? (
                        <span className="text-4xl font-bold tabular-nums text-primary">
                            {liveScore.home !== "" ? liveScore.home : "0"}
                        </span>
                    ) : (
                        <ScoreInput value={homeScore} onChange={handleHomeChange} disabled={false} />
                    )}
                </div>
                <span className={cx("shrink-0 text-2xl font-bold", isLive ? "text-white" : "text-tertiary")}>:</span>
                <div className="flex flex-1 justify-center">
                    {isStarted ? (
                        <span className="text-4xl font-bold tabular-nums text-primary">
                            {liveScore.away !== "" ? liveScore.away : "0"}
                        </span>
                    ) : (
                        <ScoreInput value={awayScore} onChange={handleAwayChange} disabled={false} />
                    )}
                </div>
            </div>

            {/* Teams row */}
            <div className="flex items-start gap-2">
                <div className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative">
                        <TeamLogo badge={fixture.home_badge} name={fixture.home_name} />
                        {fixture.home_position && (
                            <span className="absolute -right-1 -bottom-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-secondary bg-primary px-1 text-[10px] font-bold tabular-nums text-tertiary shadow-sm">
                                {fixture.home_position}
                            </span>
                        )}
                    </div>
                    <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-primary">
                        {fixture.home_name}
                    </span>
                </div>
                <div className="flex shrink-0 items-center justify-center pt-4">
                    <span className="text-xs font-medium text-quaternary">vs</span>
                </div>
                <div className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative">
                        <TeamLogo badge={fixture.away_badge} name={fixture.away_name} />
                        {fixture.away_position && (
                            <span className="absolute -right-1 -bottom-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-secondary bg-primary px-1 text-[10px] font-bold tabular-nums text-tertiary shadow-sm">
                                {fixture.away_position}
                            </span>
                        )}
                    </div>
                    <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-primary">
                        {fixture.away_name}
                    </span>
                </div>
            </div>

            {/* Live progress bar */}
            {isLive && liveState && (
                <div className="flex flex-col gap-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-success-solid transition-all duration-1000"
                            style={{ width: `${liveState.progress}%` }} />
                    </div>
                    <p className="text-center text-xs font-medium text-tertiary">
                        {liveState.isHalftime ? "Przerwa"
                            : liveState.half === 1 ? `1. połowa · ${liveState.minute}′`
                                : `2. połowa · ${liveState.minute}′`}
                    </p>
                </div>
            )}

            {/* Points badge after finished */}
            {isFinished && hasPrediction && displayPoints !== null && (
                <div className="flex justify-center">
                    <div className={cx(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                        displayPoints === 3 ? "bg-success-primary text-success-primary"
                            : displayPoints === 1 ? "bg-brand-primary text-brand-primary"
                                : "bg-secondary text-tertiary",
                    )}>
                        {displayPoints === 3 ? "Dokładny wynik"
                            : displayPoints === 1 ? "Poprawny wynik"
                                : "0 pkt"}
                        {` · ${displayPoints} pkt`}
                    </div>
                </div>
            )}

            {/* Odds row — upcoming only */}
            {(fixture.odds_home || fixture.odds_draw || fixture.odds_away) && !isLocked && (
                <div className="flex gap-2">
                    {[
                        { label: "1", value: fixture.odds_home },
                        { label: "X", value: fixture.odds_draw },
                        { label: "2", value: fixture.odds_away },
                    ].map(({ label, value }) =>
                        value ? (
                            <div key={label} className="flex flex-1 items-center justify-center gap-1 rounded-md border border-secondary py-1.5">
                                <span className="text-xs text-tertiary">{label}</span>
                                <span className="text-sm font-semibold tabular-nums text-primary">{value.toFixed(2)}</span>
                            </div>
                        ) : null,
                    )}
                </div>
            )}

            {/* Save button — upcoming only */}
            {!isLocked && (
                hasSaved && !hasChanged ? (
                    <div className="flex h-9 w-full items-center justify-center gap-1.5 text-sm font-medium text-tertiary">
                        <Check className="size-4 shrink-0" />
                        Typ zapisany
                    </div>
                ) : (
                    <Button size="sm" color={justSaved ? "secondary" : "primary"} isLoading={saving}
                        showTextWhileLoading onClick={() => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); doSave(homeScore, awayScore); }}
                        isDisabled={saving} iconLeading={justSaved ? Check : undefined} className="w-full">
                        {justSaved ? "Zapisano!" : "Zapisz typ"}
                    </Button>
                )
            )}

            {/* Action buttons — shown when match started (live or finished) */}
            {isStarted && (
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Button color="secondary" size="sm"
                            iconTrailing={panel === "szczegoly" ? ChevronUp : ChevronDown}
                            onClick={() => setPanel(panel === "szczegoly" ? null : "szczegoly")}
                            className="flex-1">
                            Statystyki
                        </Button>
                        <Button color="secondary" size="sm"
                            iconTrailing={panel === "typy" ? ChevronUp : ChevronDown}
                            onClick={() => setPanel(panel === "typy" ? null : "typy")}
                            className="flex-1">
                            Typy
                        </Button>
                    </div>

                    {/* Statystyki panel */}
                    {panel === "szczegoly" && (
                        <MatchDetails
                            events={events}
                            stats={stats}
                            homeName={fixture.home_name}
                            awayName={fixture.away_name}
                            loading={loadingDetails}
                        />
                    )}

                    {/* Typy panel */}
                    {panel === "typy" && (
                        <MemberPredsPanel
                            preds={memberPreds}
                            loading={loadingPreds}
                            userId={userId}
                            homeScore={liveScore.home}
                            awayScore={liveScore.away}
                            isLive={isLive}
                            isFinished={isFinished}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
