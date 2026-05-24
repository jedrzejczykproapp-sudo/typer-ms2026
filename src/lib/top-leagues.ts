export interface LeagueConfig {
    id: string;
    name: string;
    country: string;
    flag: string;
    oddsKey: string; // the-odds-api.com sport key
}

export const TOP_LEAGUES: LeagueConfig[] = [
    { id: "28",  name: "MŚ 2026",         country: "World",   flag: "🌍", oddsKey: "soccer_fifa_world_cup" },
    { id: "3",   name: "Liga Mistrzów",   country: "Europe",  flag: "⭐", oddsKey: "soccer_uefa_champs_league" },
    { id: "4",   name: "Liga Europy",     country: "Europe",  flag: "🟠", oddsKey: "soccer_uefa_europa_league" },
    { id: "683", name: "Liga Konferencji",country: "Europe",  flag: "🔵", oddsKey: "soccer_uefa_europa_conference_league" },
    { id: "152", name: "Premier League",  country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", oddsKey: "soccer_england_premier_league" },
    { id: "302", name: "La Liga",         country: "Spain",   flag: "🇪🇸", oddsKey: "soccer_spain_la_liga" },
    { id: "207", name: "Serie A",         country: "Italy",   flag: "🇮🇹", oddsKey: "soccer_italy_serie_a" },
    { id: "168", name: "Ligue 1",         country: "France",  flag: "🇫🇷", oddsKey: "soccer_france_ligue_one" },
    { id: "259", name: "Ekstraklasa",     country: "Poland",  flag: "🇵🇱", oddsKey: "soccer_poland_ekstraklasa" },
];

export const LEAGUE_BY_ID = new Map(TOP_LEAGUES.map((l) => [l.id, l]));
