/**
 * API-Football integration (https://www.api-football.com)
 * Free tier: 100 requests/day
 * Register at: https://dashboard.api-football.com/register
 * Env var: FOOTBALL_API_KEY
 */

const BASE = "https://v3.football.api-sports.io";

const LEAGUE_IDS: Record<string, number> = {
    ekstraklasa_2526: 106,
    wc_2026: 1,
};

const SEASONS: Record<string, number> = {
    ekstraklasa_2526: 2025,
    wc_2026: 2026,
};

function norm(s: string) {
    return s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[łŁ]/g, "l")
        .toLowerCase()
        .trim();
}

function mapEventType(type: string, detail: string): string | null {
    if (type === "Goal") {
        if (detail.toLowerCase().includes("own")) return "own_goal";
        if (detail.toLowerCase().includes("penalty")) return "penalty";
        return "goal";
    }
    if (type === "Card") {
        if (detail.toLowerCase().includes("yellow red")) return "yellow_red_card";
        if (detail.toLowerCase().includes("red")) return "red_card";
        if (detail.toLowerCase().includes("yellow")) return "yellow_card";
    }
    return null; // substitutions, VAR etc. — skip
}

// Map API-Football fixture status → our DB status
function mapFixtureStatus(short: string): "upcoming" | "live" | "finished" {
    const finished = ["FT", "AET", "PEN", "AWD", "WO"];
    const live = ["1H", "HT", "2H", "ET", "P", "BT", "LIVE", "INT", "SUSP"];
    if (finished.includes(short)) return "finished";
    if (live.includes(short)) return "live";
    return "upcoming";
}

function parseStat(val: string | number | null): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") return val;
    return parseInt(val.replace("%", "")) || null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiFixtureItem {
    fixture: { id: number; status: { short: string } };
    teams: { home: { id: number; name: string }; away: { id: number; name: string } };
    goals: { home: number | null; away: number | null };
}

interface ApiEventItem {
    time: { elapsed: number; extra: number | null };
    team: { id: number; name: string };
    player: { id: number | null; name: string | null };
    type: string;
    detail: string;
    comments: string | null;
}

interface ApiStatItem {
    type: string;
    value: string | number | null;
}

interface ApiStatTeamItem {
    team: { id: number };
    statistics: ApiStatItem[];
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
}

export interface SyncResult {
    fixtureId: number;
    events: SyncedEvent[];
    stats: SyncedStats | null;
    homeScore: number | null;
    awayScore: number | null;
    matchStatus: "upcoming" | "live" | "finished";
}

// ─── Main sync function ───────────────────────────────────────────────────────

export async function syncMatchData(opts: {
    competitionType: string;
    matchDate: string;
    homeTeam: string;
    awayTeam: string;
    cachedFixtureId: number | null;
}): Promise<SyncResult | null> {
    const key = process.env.FOOTBALL_API_KEY;
    if (!key) return null;

    const { competitionType, matchDate, homeTeam, awayTeam, cachedFixtureId } = opts;
    const leagueId = LEAGUE_IDS[competitionType];
    const season = SEASONS[competitionType];
    if (!leagueId || !season) return null;

    const h = { "x-apisports-key": key };
    let fixtureId = cachedFixtureId;
    let homeTeamApiId: number | null = null;

    // ── Step 1: find fixture if not cached ────────────────────────────────────
    if (!fixtureId) {
        const date = matchDate.slice(0, 10);
        const res = await fetch(
            `${BASE}/fixtures?league=${leagueId}&season=${season}&from=${date}&to=${date}`,
            { headers: h },
        );
        if (!res.ok) return null;
        const data = await res.json();
        const fixtures: ApiFixtureItem[] = data.response ?? [];

        const found = fixtures.find((f) => {
            const hn = norm(f.teams.home.name);
            const an = norm(f.teams.away.name);
            const ourH = norm(homeTeam);
            const ourA = norm(awayTeam);
            // exact match or first-word match
            return (
                (hn === ourH || hn.includes(ourH.split(" ")[0])) &&
                (an === ourA || an.includes(ourA.split(" ")[0]))
            );
        });

        if (!found) return null;
        fixtureId = found.fixture.id;
        homeTeamApiId = found.teams.home.id;
    }

    // ── Step 2: fetch events + stats + fixture (always, for score/status/homeTeamId) ──
    const [evRes, stRes, fxRes] = await Promise.all([
        fetch(`${BASE}/fixtures/events?fixture=${fixtureId}`, { headers: h }),
        fetch(`${BASE}/fixtures/statistics?fixture=${fixtureId}`, { headers: h }),
        fetch(`${BASE}/fixtures?id=${fixtureId}`, { headers: h }),
    ]);

    let fixtureHomeScore: number | null = null;
    let fixtureAwayScore: number | null = null;
    let fixtureStatusShort = "NS";

    if (fxRes?.ok) {
        const d = await fxRes.json();
        const fx: ApiFixtureItem & { fixture: { status: { short: string } } } = d.response?.[0];
        if (fx) {
            if (homeTeamApiId == null) homeTeamApiId = fx.teams.home.id;
            fixtureHomeScore = fx.goals.home;
            fixtureAwayScore = fx.goals.away;
            fixtureStatusShort = fx.fixture.status.short;
        }
    }

    const evData = evRes.ok ? await evRes.json() : { response: [] };
    const stData = stRes.ok ? await stRes.json() : { response: [] };

    // ── Step 3: parse events ─────────────────────────────────────────────────
    const events: SyncedEvent[] = (evData.response as ApiEventItem[])
        .flatMap((e) => {
            const type = mapEventType(e.type, e.detail);
            if (!type) return [];
            return [{
                minute: e.time.elapsed,
                extra_minute: e.time.extra ?? null,
                event_type: type,
                player_name: e.player.name ?? null,
                team: (homeTeamApiId && e.team.id === homeTeamApiId ? "home" : "away") as "home" | "away",
                detail: e.comments,
            }];
        });

    // ── Step 4: parse stats ──────────────────────────────────────────────────
    const statTeams: ApiStatTeamItem[] = stData.response ?? [];
    const homeSt = statTeams.find((s) => homeTeamApiId && s.team.id === homeTeamApiId);
    const awaySt = statTeams.find((s) => homeTeamApiId && s.team.id !== homeTeamApiId);

    const getStat = (t: ApiStatTeamItem | undefined, name: string) =>
        t ? parseStat(t.statistics.find((s) => s.type === name)?.value ?? null) : null;

    const stats: SyncedStats | null =
        homeSt && awaySt
            ? {
                  home_possession: getStat(homeSt, "Ball Possession"),
                  away_possession: getStat(awaySt, "Ball Possession"),
                  home_shots: getStat(homeSt, "Total Shots"),
                  away_shots: getStat(awaySt, "Total Shots"),
                  home_shots_on_target: getStat(homeSt, "Shots on Goal"),
                  away_shots_on_target: getStat(awaySt, "Shots on Goal"),
                  home_corners: getStat(homeSt, "Corner Kicks"),
                  away_corners: getStat(awaySt, "Corner Kicks"),
                  home_fouls: getStat(homeSt, "Fouls"),
                  away_fouls: getStat(awaySt, "Fouls"),
              }
            : null;

    return {
        fixtureId,
        events,
        stats,
        homeScore: fixtureHomeScore,
        awayScore: fixtureAwayScore,
        matchStatus: mapFixtureStatus(fixtureStatusShort),
    };
}
