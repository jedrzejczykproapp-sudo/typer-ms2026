// Club crests for Ekstraklasa PKO BP 2025/2026.
// URLs use English Wikipedia Special:FilePath — resolves files stored on either
// en.wikipedia.org OR Wikimedia Commons, so it works regardless of where each
// club's logo is hosted. Filenames confirmed from Wikipedia API thumbnail responses.
// If a URL returns 404 the TeamFlag component falls back to showing the team's initial letter.

const BASE = "https://en.wikipedia.org/wiki/Special:FilePath/";

const EKSTRAKLASA_CRESTS: Record<string, string> = {
    "Arka Gdynia":                  `${BASE}Arka_Gdynia_crest.svg`,
    "Bruk-Bet Termalica Nieciecza": `${BASE}Bruk-Bet_Termalica_Nieciecza_crest.svg`,
    "Cracovia":                     `${BASE}Cracovia_%28football_club%29_logo.svg`,
    "GKS Katowice":                 `${BASE}GKS_Katowice_crest.svg`,
    "Górnik Zabrze":                `${BASE}G%C3%B3rnik_Zabrze_crest.svg`,
    "Jagiellonia Białystok":        `${BASE}Jagiellonia_Bia%C5%82ystok_logo.svg`,
    "Korona Kielce":                `${BASE}Korona_Kielce_crest.png`,
    "Lech Poznań":                  `${BASE}KKS_Lech_Pozna%C5%84.svg`,
    "Lechia Gdańsk":                `${BASE}Lechia_Gda%C5%84sk_logo.svg`,
    "Legia Warszawa":               `${BASE}Legia_Warsaw_logo.svg`,
    "Motor Lublin":                 `${BASE}Motor_Lublin.svg`,
    "Piast Gliwice":                `${BASE}GKS_Piast_Gliwice.svg`,
    "Pogoń Szczecin":               `${BASE}Pogon_Szczecin_logo.svg`,
    "Radomiak Radom":               `${BASE}Herb_radomiaka_300dpi.png`,
    "Raków Częstochowa":            `${BASE}Rks_rakow_crest_ai.svg`,
    "Widzew Łódź":                  `${BASE}Widzew_Lodz.svg`,
    "Wisła Płock":                  `${BASE}Wisla_P%C5%82ock.png`,
    "Zagłębie Lubin":               `${BASE}Zag%C5%82%C4%99bie_Lubin_crest.svg`,
};

export function getClubCrestUrl(teamName: string): string | null {
    return EKSTRAKLASA_CRESTS[teamName] ?? null;
}
