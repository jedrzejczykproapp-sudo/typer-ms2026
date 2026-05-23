"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, Lock01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Avatar } from "@/components/base/avatar/avatar";
import { upsertPrediction } from "@/actions/prediction-actions";
import { getFlagUrl, getTeamNamePl } from "@/lib/flags";
import { getClubCrestUrl, getClubDisplayName } from "@/lib/clubs";
import { getWcVenue } from "@/lib/wc2026-venues";
import { createClient } from "@/lib/supabase/client";
import { MatchDetailsPanel } from "@/components/app/match-details-panel";
import type { Match, Prediction } from "@/types/database";
import type { MatchOdds } from "@/lib/odds";
import { cx } from "@/utils/cx";

interface PredictionCardProps {
    match: Match;
    groupId: string;
    prediction?: Prediction;
    odds?: MatchOdds;
    competitionType?: string;
    groupName?: string;
}

const stageLabels: Record<string, string> = {
    group: "Faza grupowa",
    round_of_32: "1/16 finału",
    round_of_16: "1/8 finału",
    quarter: "Ćwierćfinał",
    semi: "Półfinał",
    third_place: "Mecz o 3. miejsce",
    final: "Finał",
};

function formatMatchDate(dateStr: string) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("pl-PL", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function calcLiveState(matchDate: string): { minute: number; half: 1 | 2 | null; isHalftime: boolean; progress: number } {
    const start = new Date(matchDate).getTime();
    const elapsed = (Date.now() - start) / 60000; // elapsed minutes

    if (elapsed <= 45) {
        return {
            minute: Math.max(1, Math.floor(elapsed)),
            half: 1,
            isHalftime: false,
            progress: (elapsed / 90) * 100,
        };
    }
    if (elapsed <= 60) {
        // Approximate halftime window (~15 min break)
        return { minute: 45, half: null, isHalftime: true, progress: 50 };
    }
    // Second half (subtract ~15 min halftime)
    const secondHalfMin = elapsed - 15;
    return {
        minute: Math.min(Math.floor(secondHalfMin), 90),
        half: 2,
        isHalftime: false,
        progress: Math.min((secondHalfMin / 90) * 100, 100),
    };
}

function calcProvisionalPoints(ph: number, pa: number, ah: number, aa: number): number {
    if (ph === ah && pa === aa) return 3;
    if (Math.sign(ph - pa) === Math.sign(ah - aa)) return 1;
    return 0;
}

type MemberPrediction = {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    predicted_home: number;
    predicted_away: number;
    points: number | null;
};

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
                onClick={() => onChange(Math.max(0, value - 1))} className={btnClass}>
                −
            </button>
            <span className="w-8 text-center text-3xl font-bold tabular-nums text-primary">{value}</span>
            <button type="button" disabled={disabled}
                onClick={() => onChange(Math.min(20, value + 1))} className={btnClass}>
                +
            </button>
        </div>
    );
}

function TeamFlag({ teamName, competitionType, size = "md" }: { teamName: string; competitionType?: string; size?: "sm" | "md" }) {
    const [imgError, setImgError] = useState(false);
    const isEkstraklasa = competitionType === "ekstraklasa_2526";
    const url = isEkstraklasa ? getClubCrestUrl(teamName) : getFlagUrl(teamName);
    const sizeClass = size === "md" ? "size-12" : "size-8";

    if (!url || imgError) {
        if (isEkstraklasa) {
            return (
                <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-tertiary`}>
                    {teamName.charAt(0)}
                </div>
            );
        }
        return <div className={`${sizeClass} shrink-0 rounded-xl bg-secondary`} />;
    }

    return (
        <img
            src={url}
            alt={teamName}
            className={`${sizeClass} shrink-0 rounded-xl ${isEkstraklasa ? "object-contain p-1" : "object-cover"}`}
            onError={() => setImgError(true)}
        />
    );
}

export function PredictionCard({ match, groupId, prediction, odds, competitionType, groupName }: PredictionCardProps) {
    // Polled live match data — refreshed every 30 s so score stays current
    const [liveStatus, setLiveStatus] = useState(match.status);
    const [liveScore, setLiveScore] = useState({ home: match.home_score, away: match.away_score });
    const isFinished = liveStatus === "finished";
    const isDbLive = liveStatus === "live";
    const isTbd = match.home_team === "TBD";

    const [homeScore, setHomeScore] = useState(prediction?.predicted_home ?? 0);
    const [awayScore, setAwayScore] = useState(prediction?.predicted_away ?? 0);
    const [localPrediction, setLocalPrediction] = useState(prediction);
    const [saved, setSaved] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Client-side time detection: true from kick-off until ~130 min after start
    // (covers 90 min + ~15 min halftime + ~25 min extra time buffer)
    const matchInProgress = () => {
        const elapsed = (Date.now() - new Date(match.match_date).getTime()) / 60_000;
        return elapsed >= 0 && elapsed <= 130;
    };
    const [isClientStarted, setIsClientStarted] = useState(() =>
        !isFinished && matchInProgress(),
    );
    const isLive = isDbLive || isClientStarted;
    const isLocked = isFinished || isLive;

    // Live state (minute + half + progress)
    const [liveState, setLiveState] = useState(() =>
        (isDbLive || isClientStarted) ? calcLiveState(match.match_date) : null,
    );

    // Panel expansion: null | 'typy' | 'szczegoly'
    const [panel, setPanel] = useState<"typy" | "szczegoly" | null>(null);
    const [memberPreds, setMemberPreds] = useState<MemberPrediction[]>([]);
    const [isLoadingPreds, setIsLoadingPreds] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-save refs
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasUserChangedRef = useRef(false);
    const latestScores = useRef({ home: homeScore, away: awayScore });
    const prevIsLockedRef = useRef(isLocked);

    // Keep latest scores in sync (always reflects current render values)
    latestScores.current = { home: homeScore, away: awayScore };

    useEffect(() => {
        if (prediction && !saved) {
            setLocalPrediction(prediction);
            setHomeScore(prediction.predicted_home);
            setAwayScore(prediction.predicted_away);
        }
    }, [prediction?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update live minute/progress every 30s; also detect when match time passes
    useEffect(() => {
        if (isFinished) return;
        const startMs = new Date(match.match_date).getTime();
        const tick = () => {
            const elapsed = (Date.now() - startMs) / 60_000;
            const inProgress = elapsed >= 0 && elapsed <= 130;
            setIsClientStarted(inProgress);
            if (inProgress || isDbLive) {
                setLiveState(calcLiveState(match.match_date));
            }
        };
        tick();
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, [isDbLive, isFinished, match.match_date]);

    // Background sync for live matches — pushes fresh score into DB so Realtime picks it up
    useEffect(() => {
        if (!isLive || isFinished) return;

        const doSync = () => {
            fetch(`/api/sync-match/${match.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ competitionType: competitionType ?? "" }),
            }).catch(() => null);
        };

        doSync(); // natychmiastowy sync przy starcie
        const id = setInterval(doSync, 60_000);
        return () => clearInterval(id);
    }, [isLive, isFinished, match.id, competitionType]); // eslint-disable-line react-hooks/exhaustive-deps

    // Realtime subscription + 5 s fallback poll — instant score updates during live
    useEffect(() => {
        const supabase = createClient();

        const apply = (row: { home_score: number | null; away_score: number | null; status: string }) => {
            setLiveScore({ home: row.home_score, away: row.away_score });
            setLiveStatus(row.status as typeof match.status);
        };

        if (isFinished) return;

        // Initial fetch
        supabase
            .from("matches")
            .select("home_score, away_score, status")
            .eq("id", match.id)
            .single()
            .then(({ data }) => { if (data) apply(data); });

        // Realtime channel — fires instantly when DB row changes
        const channel = supabase
            .channel(`match-score:${match.id}`)
            .on<{ home_score: number | null; away_score: number | null; status: string }>(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${match.id}` },
                (payload) => apply(payload.new),
            )
            .subscribe();

        // 5 s fallback poll — covers cases where Realtime isn't enabled on the table
        const id = setInterval(() => {
            supabase
                .from("matches")
                .select("home_score, away_score, status")
                .eq("id", match.id)
                .single()
                .then(({ data }) => { if (data) apply(data); });
        }, 5_000);

        return () => {
            clearInterval(id);
            supabase.removeChannel(channel);
        };
    }, [isFinished, match.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Auto-save helper ────────────────────────────────────────────────────
    function scheduleAutoSave() {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
            const { home, away } = latestScores.current;
            await upsertPrediction(match.id, groupId, home, away);
            // localPrediction already set optimistically in handleHomeChange / handleAwayChange
        }, 700);
    }

    // ─── Auto-save 0:0 when match transitions to locked ─────────────────────
    useEffect(() => {
        const wasLocked = prevIsLockedRef.current;
        prevIsLockedRef.current = isLocked;
        if (!wasLocked && isLocked && !localPrediction && !isTbd) {
            upsertPrediction(match.id, groupId, 0, 0).catch(() => {/* silent */});
        }
    }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchMemberPredictions = useCallback(async () => {
        setIsLoadingPreds(true);
        const supabase = createClient();

        const { data: preds } = await supabase
            .from("predictions")
            .select("user_id, predicted_home, predicted_away, points")
            .eq("match_id", match.id)
            .eq("group_id", groupId);

        if (!preds?.length) {
            setMemberPreds([]);
            setIsLoadingPreds(false);
            return;
        }

        const userIds = preds.map((p) => p.user_id);
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", userIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

        const result: MemberPrediction[] = preds.map((p) => ({
            user_id: p.user_id,
            display_name: profileMap.get(p.user_id)?.display_name ?? null,
            avatar_url: profileMap.get(p.user_id)?.avatar_url ?? null,
            predicted_home: p.predicted_home,
            predicted_away: p.predicted_away,
            points: p.points,
        }));

        setMemberPreds(result);
        setIsLoadingPreds(false);
    }, [match.id, groupId]);

    // Fetch predictions when expanded; poll every 30s during live
    useEffect(() => {
        if (panel !== "typy") {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return;
        }

        fetchMemberPredictions();

        if (isLive) {
            pollRef.current = setInterval(fetchMemberPredictions, 30_000);
        }

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [panel, isLive, fetchMemberPredictions]);

    function handleSave() {
        // Cancel any pending auto-save before manual save
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
        }
        startTransition(async () => {
            const result = await upsertPrediction(match.id, groupId, homeScore, awayScore);
            if (!result?.error) {
                setLocalPrediction({
                    id: localPrediction?.id ?? "",
                    user_id: localPrediction?.user_id ?? "",
                    match_id: match.id,
                    group_id: groupId,
                    predicted_home: homeScore,
                    predicted_away: awayScore,
                    points: localPrediction?.points ?? null,
                    created_at: localPrediction?.created_at ?? new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        });
    }

    function handleHomeChange(v: number) {
        hasUserChangedRef.current = true;
        setHomeScore(v);
        // Optimistic update → "Typ zapisany" visible immediately
        setLocalPrediction((prev) => ({
            id: prev?.id ?? "",
            user_id: prev?.user_id ?? "",
            match_id: match.id,
            group_id: groupId,
            predicted_home: v,
            predicted_away: latestScores.current.away,
            points: prev?.points ?? null,
            created_at: prev?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }));
        scheduleAutoSave();
    }

    function handleAwayChange(v: number) {
        hasUserChangedRef.current = true;
        setAwayScore(v);
        // Optimistic update → "Typ zapisany" visible immediately
        setLocalPrediction((prev) => ({
            id: prev?.id ?? "",
            user_id: prev?.user_id ?? "",
            match_id: match.id,
            group_id: groupId,
            predicted_home: latestScores.current.home,
            predicted_away: v,
            points: prev?.points ?? null,
            created_at: prev?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }));
        scheduleAutoSave();
    }

    const hasPrediction = localPrediction !== undefined;
    const hasChanged = localPrediction
        ? homeScore !== localPrediction.predicted_home || awayScore !== localPrediction.predicted_away
        : true;

    const isSavedDisabled = hasPrediction && !hasChanged && !saved;

    // Compute points for a member — DB value preferred, fallback to provisional from live score
    const computePoints = (p: MemberPrediction): number | null => {
        const hs = liveScore.home;
        const as = liveScore.away;
        if (isFinished) {
            if (p.points !== null) return p.points;
            if (hs !== null && as !== null)
                return calcProvisionalPoints(p.predicted_home, p.predicted_away, hs, as);
            return null;
        }
        if (isLive && hs !== null && as !== null)
            return calcProvisionalPoints(p.predicted_home, p.predicted_away, hs, as);
        return null;
    };

    // Sorted member predictions for display
    const sortedMemberPreds = [...memberPreds].sort((a, b) =>
        (computePoints(b) ?? -1) - (computePoints(a) ?? -1),
    );

    return (
        <div
            className={cx(
                "flex flex-col gap-4 rounded-xl border bg-primary p-4 transition",
                isFinished ? "border-secondary" : "border-secondary shadow-xs",
                isLocked && "opacity-90",
            )}
        >
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span className="text-xs font-medium text-tertiary">
                    {groupName
                        ? groupName
                        : match.group_name
                          ? `Grupa ${match.group_name} · Kolejka ${match.matchday}`
                          : competitionType === "ekstraklasa_2526" && match.matchday
                            ? `Kolejka ${match.matchday}`
                            : stageLabels[match.stage]}
                </span>
                <div className="flex justify-center">
                    {isLive && (
                        <span className="flex items-center gap-1 rounded-full bg-success-primary px-2 py-0.5 text-xs font-bold text-success-primary">
                            <span className="size-1.5 animate-pulse rounded-full bg-success-solid" />
                            Trwa
                        </span>
                    )}
                </div>
                <span className="text-right text-xs text-tertiary">{formatMatchDate(match.match_date)}</span>
            </div>

            {isTbd ? (
                <p className="py-2 text-center text-sm text-tertiary">Mecz do ustalenia po fazie grupowej</p>
            ) : (
                <>
                    {/* Venue */}
                    {(() => {
                        const venue =
                            match.venue ??
                            (competitionType !== "ekstraklasa_2526"
                                ? getWcVenue(match.home_team, match.away_team)
                                : null);
                        return venue ? (
                            <p className="text-center text-[11px] font-medium uppercase tracking-wider text-quaternary">
                                {venue}
                            </p>
                        ) : null;
                    })()}

                    {/* Wiersz 1: wynik — [:] wyrównany do cyfr */}
                    <div className="flex items-center gap-2">
                        <div className="flex flex-1 justify-center">
                            {isFinished ? (
                                <span className="text-4xl font-bold tabular-nums text-primary">{liveScore.home}</span>
                            ) : isLive ? (
                                <span className="text-4xl font-bold tabular-nums text-primary">{liveScore.home ?? 0}</span>
                            ) : (
                                <ScoreInput value={homeScore} onChange={handleHomeChange} disabled={false} />
                            )}
                        </div>
                        <span className={cx("shrink-0 text-2xl font-bold", isLive ? "text-white" : "text-tertiary")}>:</span>
                        <div className="flex flex-1 justify-center">
                            {isFinished ? (
                                <span className="text-4xl font-bold tabular-nums text-primary">{liveScore.away}</span>
                            ) : isLive ? (
                                <span className="text-4xl font-bold tabular-nums text-primary">{liveScore.away ?? 0}</span>
                            ) : (
                                <ScoreInput value={awayScore} onChange={handleAwayChange} disabled={false} />
                            )}
                        </div>
                    </div>

                    {/* Wiersz 2: herb/flaga + nazwa — wyśrodkowane pod wynikiem */}
                    <div className="flex items-center gap-2">
                        <div className="flex flex-1 flex-col items-center gap-2">
                            <TeamFlag teamName={match.home_team} competitionType={competitionType} />
                            <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-primary">
                                {competitionType === "ekstraklasa_2526"
                                    ? getClubDisplayName(match.home_team)
                                    : getTeamNamePl(match.home_team)}
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center justify-center">
                            <span className="text-xs font-medium text-quaternary">vs</span>
                        </div>
                        <div className="flex flex-1 flex-col items-center gap-2">
                            <TeamFlag teamName={match.away_team} competitionType={competitionType} />
                            <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-primary">
                                {competitionType === "ekstraklasa_2526"
                                    ? getClubDisplayName(match.away_team)
                                    : getTeamNamePl(match.away_team)}
                            </span>
                        </div>
                    </div>

                    {/* Live progress bar + minute */}
                    {isLive && liveState && (
                        <div className="flex flex-col gap-1.5">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                    className="h-full rounded-full bg-success-solid transition-all duration-1000"
                                    style={{ width: `${liveState.progress}%` }}
                                />
                            </div>
                            <p className="text-center text-xs font-medium text-white">
                                {liveState.isHalftime
                                    ? "Przerwa"
                                    : liveState.half === 1
                                      ? `1. połowa · ${liveState.minute}'`
                                      : `2. połowa · ${liveState.minute}'`}
                            </p>
                        </div>
                    )}

                    {/* Points badge after finished */}
                    {isFinished && hasPrediction && (
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cx(
                                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                    localPrediction!.points === 3
                                        ? "bg-success-primary text-success-primary"
                                        : localPrediction!.points === 1
                                          ? "bg-brand-primary text-brand-primary"
                                          : "bg-secondary text-tertiary",
                                )}
                            >
                                {localPrediction!.points === 3 ? "Dokładny wynik" : localPrediction!.points === 1 ? "Poprawny wynik" : "0 pkt"}
                                {localPrediction!.points !== null && ` · ${localPrediction!.points} pkt`}
                            </div>
                            <div className="text-center text-xs text-tertiary">
                                Twój typ: {localPrediction!.predicted_home}:{localPrediction!.predicted_away}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Odds row — upcoming only */}
            {odds && !isTbd && !isLocked && (
                <div className="flex gap-2">
                    {[
                        { label: "1", value: odds.home },
                        { label: "X", value: odds.draw },
                        { label: "2", value: odds.away },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex flex-1 items-center justify-center gap-1 rounded-md border border-secondary py-1">
                            <span className="text-xs text-tertiary">{label}</span>
                            <span className="text-xs font-semibold tabular-nums text-primary">{value.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Save button — upcoming only */}
            {!isLocked && !isTbd && (
                isSavedDisabled ? (
                    /* "Zapisane" — no border, no interaction */
                    <div className="flex h-9 w-full items-center justify-center gap-1.5 text-sm font-medium text-tertiary">
                        <Check className="size-4 shrink-0" />
                        Typ zapisany
                    </div>
                ) : (
                    <Button
                        size="sm"
                        color={saved ? "secondary" : "primary"}
                        isLoading={isPending}
                        showTextWhileLoading
                        onClick={handleSave}
                        isDisabled={isPending}
                        iconLeading={saved ? Check : undefined}
                        className="w-full"
                    >
                        {saved ? "Zapisano!" : "Zapisz typ"}
                    </Button>
                )
            )}

            {/* Przyciski akcji — live & finished */}
            {isLocked && !isTbd && (
                <div className="flex flex-col gap-2">
                    {/* Two action buttons side by side */}
                    <div className="flex gap-2">
                        <Button
                            color="secondary"
                            size="sm"
                            iconTrailing={panel === "szczegoly" ? ChevronUp : ChevronDown}
                            onClick={() => setPanel(panel === "szczegoly" ? null : "szczegoly")}
                            className="flex-1"
                        >
                            Statystyki
                        </Button>
                        <Button
                            color="secondary"
                            size="sm"
                            iconTrailing={panel === "typy" ? ChevronUp : ChevronDown}
                            onClick={() => setPanel(panel === "typy" ? null : "typy")}
                            className="flex-1"
                        >
                            Typy
                        </Button>
                    </div>

                    {/* Panel: szczegóły — events + stats */}
                    {panel === "szczegoly" && (
                        <MatchDetailsPanel
                            matchId={match.id}
                            homeTeam={match.home_team}
                            awayTeam={match.away_team}
                            competitionType={competitionType}
                            isLive={isLive}
                        />
                    )}

                    {/* Panel: typy — member predictions */}
                    {panel === "typy" && (
                        <div className="flex flex-col gap-1 rounded-xl border border-secondary bg-secondary/40 p-2">
                            {isLoadingPreds ? (
                                <div className="flex flex-col gap-2 px-1 py-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="size-7 animate-pulse rounded-full bg-secondary" />
                                            <div className="h-3 flex-1 animate-pulse rounded-full bg-secondary" />
                                            <div className="h-3 w-10 animate-pulse rounded-full bg-secondary" />
                                        </div>
                                    ))}
                                </div>
                            ) : sortedMemberPreds.length === 0 ? (
                                <p className="py-2 text-center text-xs text-quaternary">Brak typów w tej grupie</p>
                            ) : (
                                sortedMemberPreds.map((mp) => {
                                    const isCurrentUser = mp.user_id === localPrediction?.user_id;
                                    const inits = (mp.display_name ?? "?")
                                        .split(" ")
                                        .map((w) => w[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase();

                                    const displayPoints = computePoints(mp);

                                    return (
                                        <div
                                            key={mp.user_id}
                                            className={cx(
                                                "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                                                isCurrentUser && "bg-secondary",
                                            )}
                                        >
                                            <Avatar
                                                initials={inits}
                                                src={mp.avatar_url ?? undefined}
                                                size="xs"
                                            />
                                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-primary">
                                                {mp.display_name ?? "Anonim"}
                                                {isCurrentUser && (
                                                    <span className="ml-1 font-normal text-tertiary">(Ty)</span>
                                                )}
                                            </span>
                                            <span className="shrink-0 text-xs font-semibold tabular-nums text-secondary">
                                                {mp.predicted_home}:{mp.predicted_away}
                                            </span>
                                            {displayPoints !== null && (
                                                <span
                                                    className={cx(
                                                        "shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
                                                        displayPoints === 3
                                                            ? "bg-success-primary text-success-primary"
                                                            : displayPoints === 1
                                                              ? "bg-brand-primary text-brand-primary"
                                                              : "bg-secondary text-quaternary",
                                                    )}
                                                >
                                                    {displayPoints} pkt
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
