// Club crests for Ekstraklasa PKO BP 2025/2026.
// URLs use Wikimedia Commons Special:FilePath redirect — stable regardless of internal path changes.
// If a URL returns 404 the TeamFlag component falls back to showing the team's initial letter.

const BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/";

const EKSTRAKLASA_CRESTS: Record<string, string> = {
    "Arka Gdynia":                  `${BASE}Arka_Gdynia_logo.svg`,
    "Bruk-Bet Termalica Nieciecza": `${BASE}Bruk-Bet_Termalica_Nieciecza_logo.svg`,
    "Cracovia":                     `${BASE}Cracovia_Kraków_logo.svg`,
    "GKS Katowice":                 `${BASE}GKS_Katowice_logo.svg`,
    "Górnik Zabrze":                `${BASE}Górnik_Zabrze_logo.svg`,
    "Jagiellonia Białystok":        `${BASE}Jagiellonia_Białystok_logo.svg`,
    "Korona Kielce":                `${BASE}Korona_Kielce_logo.svg`,
    "Lech Poznań":                  `${BASE}Lech_Poznań_logo.svg`,
    "Lechia Gdańsk":                `${BASE}Lechia_Gdańsk_logo.svg`,
    "Legia Warszawa":               `${BASE}Legia_Warszawa_logo.svg`,
    "Motor Lublin":                 `${BASE}Motor_Lublin_logo.svg`,
    "Piast Gliwice":                `${BASE}Piast_Gliwice_logo.svg`,
    "Pogoń Szczecin":               `${BASE}Pogoń_Szczecin_logo.svg`,
    "Radomiak Radom":               `${BASE}Radomiak_Radom_logo.svg`,
    "Raków Częstochowa":            `${BASE}Raków_Częstochowa_logo.svg`,
    "Widzew Łódź":                  `${BASE}Widzew_Łódź_logo.svg`,
    "Wisła Płock":                  `${BASE}Wisła_Płock_logo.svg`,
    "Zagłębie Lubin":               `${BASE}Zagłębie_Lubin_logo.svg`,
};

export function getClubCrestUrl(teamName: string): string | null {
    return EKSTRAKLASA_CRESTS[teamName] ?? null;
}
