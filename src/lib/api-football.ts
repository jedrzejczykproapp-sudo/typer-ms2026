/**
 * apifootball.com integration (https://apifootball.com)
 * Free tier: supports current seasons including Ekstraklasa 2025/26
 * Register at: https://apifootball.com/documentation/
 * Env var: APIFOOTBALL_API_KEY
 */

const BASE = "https://apiv3.apifootball.com/";

const LEAGUE_IDS: Record<string, string> = {
    ekstraklasa_2526: "259",
    wc_2026: "28",
};

function norm(s: string) {
    return s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[łŁ]/g, "l")
        .toLowerCase()
        .trim();
}

function parseMinute(time: string): { minute: number; extra_minute: number | null } {
    const parts = time.split("+");
    const minute = parseInt(parts[0]) || 0;
    const extra_minute = parts[1] ? parseInt(parts[1]) || null : null;
    return { minute, extra_minute };
}

function mapCardType(card: string): string | null {
    const c = card.toLowerCase();
    if (c.includes("yellow/red") || c.includes("yellow red")) return "yellow_red_card";
    if (c.includes("red")) return "red_card";
    if (c.includes("yellow")) return "yellow_card";
    return null;
}

function mapGoalInfo(info: string): string {
    const i = info.toLowerCase();
    if (i.includes("own")) return "own_goal";
    if (i.includes("penalty") || i.includes("pen")) return "penalty";
    return "goal";
}

function parseStat(val: string | null | undefined): number | null {
    if (val === null || val === undefined || val === "") return null;
    const n = parseInt(val.replace("%", "").trim());
    return isNaN(n) ? null : n;
}

function mapStatus(match_live: string, match_status: string): "upcoming" | "live" | "finished" {
    if (match_live === "1") return "live";
    if (match_status === "FT" || match_status === "AET" || match_status === "PEN" || match_status === "Finished") return "finished";
    return "upcoming";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiGoalscorer {
    time: string;
    home_scorer: string;
    away_scorer: string;
    info: string;
    score: string;
}

interface ApiCard {
    time: string;
    home_fault: string;
    card: string;
    away_fault: string;
    info?: string;
}

interface ApiStatItem {
    type: string;
    home: string;
    away: string;
}

interface ApiMatch {
    match_id: string;
    match_hometeam_name: string;
    match_awayteam_name: string;
    match_hometeam_score: string;
    match_awayteam_score: string;
    match_status: string;
    match_live: string;
    goalscorer: ApiGoalscorer[] | "" | null;
    cards: ApiCard[] | "" | null;
    statistics: ApiStatItem[] | "" | null;
}

export interface SyncedEvent {
    minute: number;
    extra_minute: number | null;
    event_type: string;
    player_name: string | null;
    team: "home" | "away";
    detail: string | null;
}

export interface SyncedStats {
    home_possession: number | null;
    away_possession: number | null;
    home_shots: number | null;
    away_shots: number | null;
    home_shots_on_target: number | null;
    away_shots_on_target: number | null;
    home_corners: number | null;
    away_corners: number | null;
    home_fouls: number | null;
    away_fouls: number | null;
    // optional — not stored in DB, only used for in-memory zaklad display
    home_attacks?: number | null;
    away_attacks?: number | null;
    home_dangerous_attacks?: number | null;
    away_dangerous_attacks?: number | null;
    home_yellow_cards?: number | null;
    away_yellow_cards?: number | null;
}

export interface SyncResult {
    fixtureId: number;
    events: SyncedEvent[];
    stats: SyncedStats | null;
    homeScore: number | null;
    awayScore: number | null;
    matchStatus: "upcoming" | "live" | "finished";
    /** Raw apifootball match_status: minute string ("35", "45+2"), "HT", "FT", etc. */
    rawStatus: string;
}

// ─── Main sync function ───────────────────────────────────────────────────────

export async function syncMatchData(opts: {
    competitionType: string;
    /** Direct apifootball league_id — bypasses LEAGUE_IDS lookup (used by zaklad sync) */
    leagueId?: string;
    matchDate: string;
    homeTeam: string;
    awayTeam: string;
    cachedFixtureId: number | null;
}): Promise<SyncResult | null> {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) {
        console.error("[apifootball] APIFOOTBALL_API_KEY is not set");
        return null;
    }

    const { competitionType, leagueId: directLeagueId, matchDate, homeTeam, awayTeam, cachedFixtureId } = opts;

    // ── Resolve league ID: direct override → LEAGUE_IDS lookup ───────────────
    const resolvedLeagueId = directLeagueId ?? LEAGUE_IDS[competitionType];

    // ── Primary: search by date + league (returns full live stats) ───────────
    // This is the proven approach used for Ekstraklasa/WC syncing.
    // Even when cachedFixtureId is available, the league query returns richer
    // live statistics than the single-match endpoint on the free tier.
    if (resolvedLeagueId) {
        const date = matchDate.slice(0, 10);
        const url = `${BASE}?action=get_events&from=${date}&to=${date}&league_id=${resolvedLeagueId}&APIkey=${key}`;
        console.log("[apifootball] fixture lookup by league:", url);
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const matches: ApiMatch[] = data;
                const found = matches.find((m) => {
                    const hn = norm(m.match_hometeam_name);
                    const an = norm(m.match_awayteam_name);
                    const ourH = norm(homeTeam);
                    const ourA = norm(awayTeam);
                    return (
                        (hn === ourH || hn.includes(ourH.split(" ")[0]) || ourH.includes(hn.split(" ")[0])) &&
                        (an === ourA || an.includes(ourA.split(" ")[0]) || ourA.includes(an.split(" ")[0]))
                    );
                });
                if (found) {
                    console.log("[apifootball] match found by league lookup:", found.match_id);
                    return parseMatch(found, cachedFixtureId ?? (parseInt(found.match_id) || null));
                }
                console.warn("[apifootball] match not found in league results:", homeTeam, "vs", awayTeam, "on", date);
            }
        } else {
            console.error("[apifootball] league lookup failed:", res.status, res.statusText);
        }
    }

    // ── Fallback: fetch by match_id directly (if we have it) ─────────────────
    if (cachedFixtureId) {
        const url = `${BASE}?action=get_events&match_id=${cachedFixtureId}&APIkey=${key}`;
        console.log("[apifootball] fallback fetch by id:", url);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
            console.error("[apifootball] fetch by id failed:", res.status);
            return null;
        }
        const data = await res.json();
        const matches: ApiMatch[] = Array.isArray(data) ? data : [];
        const match = matches[0];
        if (!match) {
            console.error("[apifootball] match not found by id:", cachedFixtureId);
            return null;
        }
        return parseMatch(match, cachedFixtureId);
    }

    // ── No usable data source ─────────────────────────────────────────────────
    console.error("[apifootball] no leagueId and no cachedFixtureId for", homeTeam, "vs", awayTeam);
    return null;
}

function parseMatch(match: ApiMatch, knownId: number | null): SyncResult {
    const fixtureId = knownId ?? parseInt(match.match_id);

    const homeScore = match.match_hometeam_score !== ""
        ? parseInt(match.match_hometeam_score)
        : null;
    const awayScore = match.match_awayteam_score !== ""
        ? parseInt(match.match_awayteam_score)
        : null;

    const matchStatus = mapStatus(match.match_live, match.match_status);

    // ── Parse events (goals + cards) ──────────────────────────────────────────
    const events: SyncedEvent[] = [];

    const goalscorers: ApiGoalscorer[] = Array.isArray(match.goalscorer) ? match.goalscorer : [];
    for (const g of goalscorers) {
        const isHome = g.home_scorer !== "";
        const playerName = isHome ? g.home_scorer : g.away_scorer;
        if (!playerName) continue;
        const { minute, extra_minute } = parseMinute(g.time);
        events.push({
            minute,
            extra_minute,
            event_type: mapGoalInfo(g.info ?? ""),
            player_name: playerName || null,
            team: isHome ? "home" : "away",
            detail: g.score || null,
        });
    }

    const cards: ApiCard[] = Array.isArray(match.cards) ? match.cards : [];
    for (const c of cards) {
        const cardType = mapCardType(c.card);
        if (!cardType) continue;
        const isHome = c.home_fault !== "";
        const playerName = isHome ? c.home_fault : c.away_fault;
        const { minute, extra_minute } = parseMinute(c.time);
        events.push({
            minute,
            extra_minute,
            event_type: cardType,
            player_name: playerName || null,
            team: isHome ? "home" : "away",
            detail: null,
        });
    }

    // Sort by minute, then extra_minute
    events.sort((a, b) => a.minute - b.minute || (a.extra_minute ?? 0) - (b.extra_minute ?? 0));

    // ── Parse statistics ──────────────────────────────────────────────────────
    const statistics: ApiStatItem[] = Array.isArray(match.statistics) ? match.statistics : [];

    // Use last occurrence — apifootball sometimes sends duplicate entries (e.g. Ball Possession)
    // where the first entry is 0%/0% and the correct value is the last one.
    const getStat = (name: string, side: "home" | "away") => {
        let st: ApiStatItem | undefined;
        for (let i = statistics.length - 1; i >= 0; i--) {
            if (statistics[i].type === name) { st = statistics[i]; break; }
        }
        return st ? parseStat(side === "home" ? st.home : st.away) : null;
    };

    const hasStats = statistics.length > 0;
    const stats: SyncedStats | null = hasStats
        ? {
              home_possession: getStat("Ball Possession", "home"),
              away_possession: getStat("Ball Possession", "away"),
              home_shots: getStat("Shots Total", "home"),
              away_shots: getStat("Shots Total", "away"),
              home_shots_on_target: getStat("Shots On Goal", "home"),
              away_shots_on_target: getStat("Shots On Goal", "away"),
              home_corners: getStat("Corners", "home"),
              away_corners: getStat("Corners", "away"),
              home_fouls: getStat("Fouls", "home"),
              away_fouls: getStat("Fouls", "away"),
              home_attacks: getStat("Attacks", "home"),
              away_attacks: getStat("Attacks", "away"),
              home_dangerous_attacks: getStat("Dangerous Attacks", "home"),
              away_dangerous_attacks: getStat("Dangerous Attacks", "away"),
              home_yellow_cards: getStat("Yellow Cards", "home"),
              away_yellow_cards: getStat("Yellow Cards", "away"),
          }
        : null;

    return {
        fixtureId,
        events,
        stats,
        homeScore: isNaN(homeScore as number) ? null : homeScore,
        awayScore: isNaN(awayScore as number) ? null : awayScore,
        matchStatus,
        rawStatus: match.match_status ?? "",
    };
}
