// Club crests for Ekstraklasa 2025/2026.
// URLs use Wikimedia Commons Special:FilePath redirect — stable regardless of internal path changes.
// If a URL fails to load, the TeamFlag component falls back to showing the team's initial letter.
// Update filenames here once Ekstraklasa matches are added to the DB.

const CREST_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/";

const EKSTRAKLASA_CRESTS: Record<string, string> = {
    "Jagiellonia Białystok": `${CREST_BASE}Jagiellonia_Białystok_logo.svg`,
    "Legia Warszawa":        `${CREST_BASE}Legia_Warszawa_logo.svg`,
    "Raków Częstochowa":     `${CREST_BASE}Raków_Częstochowa_logo.svg`,
    "Lech Poznań":           `${CREST_BASE}Lech_Poznań_logo.svg`,
    "Śląsk Wrocław":         `${CREST_BASE}Śląsk_Wrocław_logo.svg`,
    "Pogoń Szczecin":        `${CREST_BASE}Pogoń_Szczecin_logo.svg`,
    "Widzew Łódź":           `${CREST_BASE}Widzew_Łódź_logo.svg`,
    "Motor Lublin":          `${CREST_BASE}Motor_Lublin_logo.svg`,
    "Cracovia":              `${CREST_BASE}Cracovia_Kraków_logo.svg`,
    "Górnik Zabrze":         `${CREST_BASE}Górnik_Zabrze_logo.svg`,
    "Zagłębie Lubin":        `${CREST_BASE}Zagłębie_Lubin_logo.svg`,
    "Korona Kielce":         `${CREST_BASE}Korona_Kielce_logo.svg`,
    "Piast Gliwice":         `${CREST_BASE}Piast_Gliwice_logo.svg`,
    "GKS Katowice":          `${CREST_BASE}GKS_Katowice_logo.svg`,
    "Ruch Chorzów":          `${CREST_BASE}Ruch_Chorzów_logo.svg`,
    "Puszcza Niepołomice":   `${CREST_BASE}Puszcza_Niepołomice_logo.svg`,
    "Zagłębie Sosnowiec":    `${CREST_BASE}Zagłębie_Sosnowiec_logo.svg`,
    "Lechia Gdańsk":         `${CREST_BASE}Lechia_Gdańsk_logo.svg`,
    "Wisła Kraków":          `${CREST_BASE}Wisła_Kraków_logo.svg`,
    "Wisła Płock":           `${CREST_BASE}Wisła_Płock_logo.svg`,
    "ŁKS Łódź":              `${CREST_BASE}ŁKS_Łódź_logo.svg`,
    "Bruk-Bet Termalica":    `${CREST_BASE}Bruk-Bet_Termalica_Nieciecza_logo.svg`,
};

export function getClubCrestUrl(teamName: string): string | null {
    return EKSTRAKLASA_CRESTS[teamName] ?? null;
}
