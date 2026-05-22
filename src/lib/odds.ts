export interface MatchOdds {
    home: number;
    draw: number;
    away: number;
}

const SPORT_KEYS: Record<string, string> = {
    wc_2026: "soccer_fifa_world_cup",
    ekstraklasa_2526: "soccer_poland_ekstraklasa",
};

// Normalise: strip diacritics + lowercase so API names match our DB names
// e.g. "Gornik Zabrze" → "gornik zabrze" == norm("Górnik Zabrze")
function norm(s: string) {
    return s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")   // strip combining diacritics (ą→a, ę→e, ó→o …)
        .replace(/[łŁ]/g, "l")    // ł/Ł don't decompose under NFD, handle manually
        .toLowerCase()
        .trim();
}

// Canonical Polish names used in our DB
const EKSTRAKLASA_CANONICAL = [
    "Arka Gdynia",
    "Bruk-Bet Termalica Nieciecza",
    "Cracovia",
    "GKS Katowice",
    "Górnik Zabrze",
    "Jagiellonia Białystok",
    "Korona Kielce",
    "Lech Poznań",
    "Lechia Gdańsk",
    "Legia Warszawa",
    "Motor Lublin",
    "Piast Gliwice",
    "Pogoń Szczecin",
    "Radomiak Radom",
    "Raków Częstochowa",
    "Widzew Łódź",
    "Wisła Płock",
    "Zagłębie Lubin",
];

// norm(canonical) → canonical  (used to resolve API names → DB names)
const EKSTRAKLASA_NORM_MAP = new Map(EKSTRAKLASA_CANONICAL.map((t) => [norm(t), t]));

// Explicit overrides for names that don't resolve via normalisation alone
// (e.g. "Legia Warsaw" → "Legia Warszawa")
const EXPLICIT_MAP: Record<string, string> = {
    "legia warsaw": "Legia Warszawa",
    "jagiellonia": "Jagiellonia Białystok",
    "nieciecza": "Bruk-Bet Termalica Nieciecza",
    "bruk-bet nieciecza": "Bruk-Bet Termalica Nieciecza",
    "termalica nieciecza": "Bruk-Bet Termalica Nieciecza",
    "bruk-bet termalica": "Bruk-Bet Termalica Nieciecza",
    "gks katowice": "GKS Katowice",
    "radomiak": "Radomiak Radom",
};

function resolveTeamName(apiName: string): string {
    const n = norm(apiName);
    return EXPLICIT_MAP[n] ?? EKSTRAKLASA_NORM_MAP.get(n) ?? apiName;
}

export async function getOdds(competitionType: string): Promise<Map<string, MatchOdds>> {
    const key = process.env.ODDS_API_KEY;
    if (!key) return new Map();

    const sportKey = SPORT_KEYS[competitionType];
    if (!sportKey) return new Map();

    const isEkstraklasa = competitionType === "ekstraklasa_2526";

    try {
        const res = await fetch(
            `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${key}&regions=eu&markets=h2h&oddsFormat=decimal`,
            { next: { revalidate: 3600 } },
        );
        if (!res.ok) return new Map();

        const data = await res.json();
        const map = new Map<string, MatchOdds>();

        for (const event of data) {
            const homeTeamApi: string = event.home_team;
            const awayTeamApi: string = event.away_team;

            // For Ekstraklasa resolve API name → our DB name; for WC use as-is
            const homeTeam = isEkstraklasa ? resolveTeamName(homeTeamApi) : homeTeamApi;
            const awayTeam = isEkstraklasa ? resolveTeamName(awayTeamApi) : awayTeamApi;

            const bookie = event.bookmakers?.[0];
            const h2h = bookie?.markets?.find((m: { key: string }) => m.key === "h2h");
            if (!h2h) continue;

            // Outcomes use the original API names
            const homeOdds = h2h.outcomes.find((o: { name: string; price: number }) => o.name === homeTeamApi)?.price;
            const awayOdds = h2h.outcomes.find((o: { name: string; price: number }) => o.name === awayTeamApi)?.price;
            const drawOdds = h2h.outcomes.find((o: { name: string; price: number }) => o.name === "Draw")?.price;

            if (homeOdds && awayOdds && drawOdds) {
                map.set(`${homeTeam}|${awayTeam}`, { home: homeOdds, draw: drawOdds, away: awayOdds });
            }
        }

        return map;
    } catch {
        return new Map();
    }
}

// Backward-compat alias
export const getWcOdds = () => getOdds("wc_2026");
