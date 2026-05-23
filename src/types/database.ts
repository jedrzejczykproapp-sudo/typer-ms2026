export type MatchStage = "group" | "round_of_32" | "round_of_16" | "quarter" | "semi" | "third_place" | "final";
export type MatchStatus = "upcoming" | "live" | "finished";

export interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
}

export interface Group {
    id: string;
    name: string;
    invite_code: string;
    created_by: string;
    created_at: string;
    avatar_url: string | null;
    competition_type: string;
}

export interface GroupMember {
    id: string;
    group_id: string;
    user_id: string;
    joined_at: string;
    profiles?: Profile;
}

export interface Match {
    id: string;
    home_team: string;
    away_team: string;
    home_flag: string;
    away_flag: string;
    match_date: string;
    stage: MatchStage;
    group_name: string | null;
    matchday: number | null;
    venue: string | null;
    home_score: number | null;
    away_score: number | null;
    status: MatchStatus;
}

export interface Prediction {
    id: string;
    user_id: string;
    match_id: string;
    group_id: string;
    predicted_home: number;
    predicted_away: number;
    points: number | null;
    created_at: string;
    updated_at: string;
}

export type MatchEventType = "goal" | "own_goal" | "penalty" | "yellow_card" | "red_card" | "yellow_red_card";

export interface MatchEvent {
    id: string;
    match_id: string;
    minute: number;
    extra_minute: number | null;
    event_type: MatchEventType;
    player_name: string | null;
    team: "home" | "away";
    detail: string | null;
    created_at: string;
}

export interface MatchStats {
    match_id: string;
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
    updated_at: string;
}

export interface LeaderboardEntry {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    total_points: number;
    exact_scores: number;
    correct_results: number;
    predictions_count: number;
    rank: number;
}
