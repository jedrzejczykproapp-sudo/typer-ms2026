"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const LEAGUE_IDS: Record<string, string> = {
    mls_2026: "332",
    ekstraklasa_2526: "259",
};

const BASE = "https://apiv3.apifootball.com/";

function pad(n: number) {
    return String(n).padStart(2, "0");
}
function dateStr(d: Date) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function mapStatus(live: string, status: string): "upcoming" | "live" | "finished" {
    if (live === "1") return "live";
    if (status === "FT" || status === "AET" || status === "PEN" || status === "Finished") return "finished";
    return "upcoming";
}

/**
 * Syncs upcoming fixtures from apifootball into the `matches` table for
 * league-based competitions (MLS, Ekstraklasa).
 *
 * Safe to call on every page load — skips if upcoming matches already exist.
 * Returns true if a sync was performed, false if skipped.
 */
export async function ensureUpcomingMatches(competitionType: string): Promise<boolean> {
    const leagueId = LEAGUE_IDS[competitionType];
    if (!leagueId) return false; // WC uses its own system

    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return false;

    const admin = createAdminClient();

    // ── Check if we already have upcoming matches ─────────────────────────────
    const now = new Date().toISOString();
    const { count } = await admin
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("competition_type", competitionType)
        .neq("status", "finished")
        .gte("match_date", now);

    if ((count ?? 0) > 0) return false; // already populated

    // ── Fetch next 21 days from apifootball ───────────────────────────────────
    const fromDate = dateStr(new Date());
    const toDate   = dateStr(new Date(Date.now() + 21 * 86_400_000));
    const url = `${BASE}?action=get_events&from=${fromDate}&to=${toDate}&league_id=${leagueId}&APIkey=${key}`;

    let events: Record<string, string>[];
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return false;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return false;
        events = data;
    } catch {
        return false;
    }

    // ── Fetch existing api_football_ids to skip duplicates ────────────────────
    const { data: existing } = await admin
        .from("matches")
        .select("api_football_id")
        .eq("competition_type", competitionType)
        .not("api_football_id", "is", null);

    const existingIds = new Set((existing ?? []).map((r) => Number(r.api_football_id)));

    // ── Insert new fixtures ───────────────────────────────────────────────────
    const rows = [];
    for (const ev of events) {
        const apiId = parseInt(ev.match_id);
        if (!apiId || existingIds.has(apiId)) continue;

        const matchDate = ev.match_date && ev.match_time
            ? `${ev.match_date}T${ev.match_time}:00`
            : ev.match_date ?? null;
        if (!matchDate) continue;

        const round = parseInt(ev.match_round ?? "");

        rows.push({
            competition_type: competitionType,
            api_football_id:  apiId,
            home_team:        ev.match_hometeam_name ?? "",
            away_team:        ev.match_awayteam_name ?? "",
            home_flag:        ev.team_home_badge ?? "",
            away_flag:        ev.team_away_badge ?? "",
            match_date:       matchDate,
            stage:            "group",
            group_name:       null,
            matchday:         isNaN(round) ? null : round,
            venue:            ev.match_stadium ?? null,
            home_score:       ev.match_hometeam_score !== "" ? parseInt(ev.match_hometeam_score) : null,
            away_score:       ev.match_awayteam_score !== "" ? parseInt(ev.match_awayteam_score) : null,
            status:           mapStatus(ev.match_live ?? "0", ev.match_status ?? ""),
        });
    }

    if (rows.length === 0) return false;

    await admin.from("matches").insert(rows);
    console.log(`[sync-league] inserted ${rows.length} matches for ${competitionType}`);
    return true;
}
