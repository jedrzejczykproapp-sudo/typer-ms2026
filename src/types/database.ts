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

export interface LeaderboardEntry {
    user_id: string;
    display_name: string | null;
    total_points: number;
    exact_scores: number;
    correct_results: number;
    predictions_count: number;
    rank: number;
}
