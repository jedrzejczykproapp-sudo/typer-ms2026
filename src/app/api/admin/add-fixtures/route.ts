/**
 * Admin endpoint — add fixtures from given apifootball league IDs to an existing zakład.
 *
 * GET /api/admin/add-fixtures?zaklad_id=<uuid>&league_ids=3,4,5&days=14
 *   → fetches upcoming fixtures for the next <days> days, inserts them (skips duplicates)
 *
 * GET /api/admin/add-fixtures?search=champions
 *   → lists matching leagues from apifootball so you can find the right league_id
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE = "https://apiv3.apifootball.com/";

function pad(n: number) {
    return String(n).padStart(2, "0");
}
function dateStr(d: Date) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// PATCH /api/admin/add-fixtures?match_id=X&league_name=Y&league_flag=Z&league_id=W
export async function PATCH(req: NextRequest) {
    const admin = createAdminClient();
    const { searchParams } = req.nextUrl;
    const matchId    = searchParams.get("match_id");
    const leagueName = searchParams.get("league_name");
    const leagueFlag = searchParams.get("league_flag");
    const leagueId   = searchParams.get("league_id");

    if (!matchId) return NextResponse.json({ error: "match_id required" }, { status: 400 });

    const updates: Record<string, string> = {};
    if (leagueName) updates.league_name = leagueName;
    if (leagueFlag) updates.league_flag = leagueFlag;
    if (leagueId)   updates.league_id   = leagueId;

    const { data, error } = await admin
        .from("zaklad_fixtures")
        .update(updates)
        .eq("match_id", matchId)
        .select("id, match_id, league_name, league_flag, league_id, home_name, away_name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: data });
}

export async function GET(req: NextRequest) {
    const key = process.env.APIFOOTBALL_API_KEY;
    if (!key) return NextResponse.json({ error: "APIFOOTBALL_API_KEY not set" }, { status: 500 });

    const { searchParams } = req.nextUrl;

    // ── Mode: update fixture league metadata ─────────────────────────────────
    if (searchParams.get("action") === "patch") {
        const matchId    = searchParams.get("match_id");
        const leagueName = searchParams.get("league_name");
        const leagueFlag = searchParams.get("league_flag");
        const leagueId   = searchParams.get("league_id");
        if (!matchId) return NextResponse.json({ error: "match_id required" }, { status: 400 });
        const updates: Record<string, string> = {};
        if (leagueName) updates.league_name = leagueName;
        if (leagueFlag) updates.league_flag = leagueFlag;
        if (leagueId)   updates.league_id   = leagueId;
        const admin = createAdminClient();
        const { data, error } = await admin
            .from("zaklad_fixtures")
            .update(updates)
            .eq("match_id", matchId)
            .select("id, match_id, league_name, league_flag, league_id, home_name, away_name");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ updated: data });
    }

    // ── Mode: search leagues by keyword ──────────────────────────────────────
    const searchQuery = searchParams.get("search");
    if (searchQuery) {
        const res = await fetch(`${BASE}?action=get_leagues&APIkey=${key}`, { cache: "no-store" });
        if (!res.ok) return NextResponse.json({ error: "apifootball leagues failed" }, { status: 502 });
        const leagues = await res.json();
        if (!Array.isArray(leagues)) return NextResponse.json({ raw: leagues });

        const q = searchQuery.toLowerCase();
        const matches = leagues.filter((l: Record<string, string>) =>
            (l.league_name ?? "").toLowerCase().includes(q) ||
            (l.country_name ?? "").toLowerCase().includes(q),
        );
        return NextResponse.json(
            matches.map((l: Record<string, string>) => ({
                league_id: l.league_id,
                league_name: l.league_name,
                country: l.country_name,
                season: l.league_season,
            })),
        );
    }

    // ── Mode: add fixtures to a zakład ────────────────────────────────────────
    const zakladId   = searchParams.get("zaklad_id");
    const leagueIds  = searchParams.get("league_ids")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    const days       = Math.min(parseInt(searchParams.get("days") ?? "21"), 60);

    if (!zakladId || !leagueIds.length) {
        return NextResponse.json({
            usage: [
                "Search leagues:  GET ?search=champions",
                "Add fixtures:    GET ?zaklad_id=<uuid>&league_ids=3,4,5&days=21",
            ],
        });
    }

    const admin = createAdminClient();

    // Verify zakład exists
    const { data: zaklad, error: zErr } = await admin.from("zaklady").select("id, status").eq("id", zakladId).single();
    if (zErr || !zaklad) return NextResponse.json({ error: "zakład not found" }, { status: 404 });

    const fromDate = dateStr(new Date());
    const toDate   = dateStr(new Date(Date.now() + days * 86_400_000));

    // Fetch existing match_ids so we can skip duplicates
    const { data: existing } = await admin
        .from("zaklad_fixtures")
        .select("match_id")
        .eq("zaklad_id", zakladId);
    const existingIds = new Set((existing ?? []).map((r) => String(r.match_id)));

    const inserted: unknown[] = [];
    const skipped:  unknown[] = [];
    const errors:   unknown[] = [];

    for (const leagueId of leagueIds) {
        const url = `${BASE}?action=get_events&from=${fromDate}&to=${toDate}&league_id=${leagueId}&APIkey=${key}`;
        let events: Record<string, string>[];
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) { errors.push({ leagueId, status: res.status }); continue; }
            const data = await res.json();
            if (!Array.isArray(data)) { errors.push({ leagueId, raw: data }); continue; }
            events = data;
        } catch (e) {
            errors.push({ leagueId, error: String(e) });
            continue;
        }

        for (const ev of events) {
            const matchId = String(ev.match_id ?? "");
            if (!matchId || existingIds.has(matchId)) {
                skipped.push({ matchId, reason: existingIds.has(matchId) ? "duplicate" : "no id" });
                continue;
            }

            const row = {
                zaklad_id:    zakladId,
                match_id:     matchId,
                league_id:    String(ev.league_id ?? leagueId),
                league_name:  ev.league_name ?? "",
                league_flag:  "🏆",
                match_date:   ev.match_date
                    ? `${ev.match_date} ${ev.match_time ?? "00:00"}`
                    : "",
                home_name:    ev.match_hometeam_name ?? "",
                home_badge:   ev.team_home_badge ?? "",
                home_position: null,
                away_name:    ev.match_awayteam_name ?? "",
                away_badge:   ev.team_away_badge ?? "",
                away_position: null,
                home_score:   ev.match_hometeam_score ?? "",
                away_score:   ev.match_awayteam_score ?? "",
                match_status: ev.match_status === "FT" ? "finished" : (ev.match_live === "1" ? "live" : "upcoming"),
                odds_home:    null,
                odds_draw:    null,
                odds_away:    null,
                venue:        ev.match_stadium ?? null,
            };

            const { error: insErr } = await admin.from("zaklad_fixtures").insert(row);
            if (insErr) {
                errors.push({ matchId, error: insErr.message });
            } else {
                existingIds.add(matchId);
                inserted.push({ matchId, home: row.home_name, away: row.away_name, date: row.match_date });
            }
        }
    }

    // Re-activate zakład if it was marked finished
    if (inserted.length > 0 && zaklad.status === "finished") {
        await admin.from("zaklady").update({ status: "active" }).eq("id", zakladId);
    }

    return NextResponse.json({ inserted, skipped: skipped.length, errors, fromDate, toDate });
}
