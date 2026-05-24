"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getFlagUrl } from "@/lib/flags";

const LEAGUE_IDS: Record<string, string> = {
    mls_2026:        "332",
    ekstraklasa_2526: "259",
    wc_2026:         "28",
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

/** Parse WC match_round → { stage, matchday } */
function parseWcRound(matchRound: string): { stage: string; matchday: number | null } {
    const r = (matchRound ?? "").toLowerCase().trim();
    const num = parseInt(r);

    // Plain number (1, 2, 3 = group stage matchdays)
    if (!isNaN(num) && num <= 5) return { stage: "group", matchday: num };

    if (r.includes("group") || r.includes("matchday")) {
        const m = r.match(/\d+/);
        return { stage: "group", matchday: m ? parseInt(m[0]) : null };
    }
    if (r.includes("32") || r.includes("1/16")) return { stage: "round_of_32",  matchday: null };
    if (r.includes("16") || r.includes("1/8"))  return { stage: "round_of_16",  matchday: null };
    if (r.includes("quarter"))                   return { stage: "quarter",      matchday: null };
    if (r.includes("third") || r.includes("3rd")) return { stage: "third_place", matchday: null };
    if (r.includes("semi"))                      return { stage: "semi",         matchday: null };
    if (r.includes("final"))                     return { stage: "final",        matchday: null };

    return { stage: "group", matchday: null };
}

/**
 * Syncs upcoming fixtures from apifootball into the `matches` table.
 *
 * League comps (MLS, Ekstraklasa): runs when no upcoming matches exist.
 * WC 2026: runs when the table has zero WC matches at all.
 *
 * Safe to call on every page load — skips when data is already there.
 * Returns true if a sync was performed.
 */
export async function ensureUpcomingMatches(competitionType: string): Promise<boolean> {
    const leagueId = LEAGUE_IDS[competitionType];
    if (!leagueId) return false;

    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return false;

    const admin = createAdminClient();
    const isWC = competitionType === "wc_2026";

    // ── Skip check ────────────────────────────────────────────────────────────
    if (isWC) {
        // WC: only sync when the table is empty
        const { count } = await admin
            .from("matches")
            .select("id", { count: "exact", head: true })
            .eq("competition_type", "wc_2026");
        if ((count ?? 0) > 0) return false;
    } else {
        // League comps: sync when no upcoming matches
        const now = new Date().toISOString();
        const { count } = await admin
            .from("matches")
            .select("id", { count: "exact", head: true })
            .eq("competition_type", competitionType)
            .neq("status", "finished")
            .gte("match_date", now);
        if ((count ?? 0) > 0) return false;
    }

    // ── Fetch from apifootball ────────────────────────────────────────────────
    const days = isWC ? 50 : 21;            // WC group stage spans ~40 days
    const fromDate = dateStr(new Date());
    const toDate   = dateStr(new Date(Date.now() + days * 86_400_000));
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

    // ── Collect existing api_football_ids to skip duplicates ─────────────────
    const { data: existing } = await admin
        .from("matches")
        .select("api_football_id")
        .eq("competition_type", competitionType)
        .not("api_football_id", "is", null);

    const existingIds = new Set((existing ?? []).map((r) => Number(r.api_football_id)));

    // ── Build rows ────────────────────────────────────────────────────────────
    const rows = [];
    for (const ev of events) {
        const apiId = parseInt(ev.match_id);
        if (!apiId || existingIds.has(apiId)) continue;

        const matchDate = ev.match_date && ev.match_time
            ? `${ev.match_date}T${ev.match_time}:00`
            : ev.match_date ?? null;
        if (!matchDate) continue;

        let stage    = "group";
        let matchday: number | null = null;
        let groupName: string | null = null;

        if (isWC) {
            const parsed = parseWcRound(ev.match_round ?? "");
            stage    = parsed.stage;
            matchday = parsed.matchday;
            // league_group from standings — apifootball events may expose it
            const lg = (ev.league_group ?? ev.match_group ?? "").trim();
            groupName = lg ? lg.replace(/^group\s*/i, "").toUpperCase() || null : null;
            // For WC: store flagcdn.com flag URL (consistent with /zaklady)
            const homeFlag = getFlagUrl(ev.match_hometeam_name ?? "") ?? ev.team_home_badge ?? "";
            const awayFlag = getFlagUrl(ev.match_awayteam_name ?? "") ?? ev.team_away_badge ?? "";
            rows.push({
                competition_type: competitionType,
                api_football_id:  apiId,
                home_team:        ev.match_hometeam_name ?? "",
                away_team:        ev.match_awayteam_name ?? "",
                home_flag:        homeFlag,
                away_flag:        awayFlag,
                match_date:       matchDate,
                stage,
                group_name:       groupName,
                matchday,
                venue:            ev.match_stadium ?? null,
                home_score:       ev.match_hometeam_score !== "" ? parseInt(ev.match_hometeam_score) : null,
                away_score:       ev.match_awayteam_score !== "" ? parseInt(ev.match_awayteam_score) : null,
                status:           mapStatus(ev.match_live ?? "0", ev.match_status ?? ""),
            });
        } else {
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
    }

    if (rows.length === 0) return false;

    await admin.from("matches").insert(rows);
    console.log(`[sync-league] inserted ${rows.length} matches for ${competitionType}`);
    return true;
}
