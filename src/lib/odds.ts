export interface MatchOdds {
    home: number;
    draw: number;
    away: number;
}

const SPORT_KEYS: Record<string, string> = {
    wc_2026: "soccer_fifa_world_cup",
    ekstraklasa_2526: "soccer_poland_ekstraklasa",
    mls_2026: "soccer_usa_mls",
};

// Normalise: strip diacritics + lowercase so API names match our DB names
// e.g. "Gornik Zabrze" → "gornik zabrze" == norm("Górnik Zabrze")
function norm(s: string) {
    return s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")   // strip combining diacritics (ą→a, ę→e, ó→o …)
        .replace(/[łŁ]/g, "l")    // ł/Ł don't decompose under NFD, handle manually
        .replace(/\s*&\s*/g, " and ")  // "Brighton & Hove Albion" == "Brighton and Hove Albion"
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
    // Cracovia variants from odds APIs
    "ks cracovia": "Cracovia",
    "ks cracovia 1906": "Cracovia",
    "cracovia 1906": "Cracovia",
    "cracovia krakow": "Cracovia",
    "cracovia krakow 1906": "Cracovia",
    "mks cracovia": "Cracovia",
    // Korona variants
    "korona": "Korona Kielce",
    "mks korona kielce": "Korona Kielce",
    "korona kielce ksa": "Korona Kielce",
};

function resolveTeamName(apiName: string): string {
    const n = norm(apiName);
    return EXPLICIT_MAP[n] ?? EKSTRAKLASA_NORM_MAP.get(n) ?? apiName;
}

export type OddsMapByTeams = Map<string, MatchOdds>;

/** Fetch odds by the-odds-api.com sport key, keyed by "normHome|normAway" */
export async function getOddsByKey(oddsKey: string): Promise<OddsMapByTeams> {
    const key = process.env.ODDS_API_KEY;
    if (!key) return new Map();
    try {
        const res = await fetch(
            `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds/?apiKey=${key}&regions=eu,uk&markets=h2h&oddsFormat=decimal`,
            { next: { revalidate: 900 } }, // 15 min cache
        );
        if (!res.ok) return new Map();
        const data = await res.json();
        const map: OddsMapByTeams = new Map();
        for (const event of data) {
            // Scan all bookmakers for first one that has h2h (not just [0])
            type Outcome = { name: string; price: number };
            type Market = { key: string; outcomes: Outcome[] };
            type Bookie = { markets: Market[] };
            let h2h: Market | undefined;
            for (const bk of (event.bookmakers ?? []) as Bookie[]) {
                h2h = bk.markets?.find((m) => m.key === "h2h");
                if (h2h) break;
            }
            if (!h2h) continue;
            const homeOdds = h2h.outcomes.find((o) => o.name === event.home_team)?.price;
            const drawOdds = h2h.outcomes.find((o) => o.name === "Draw")?.price;
            const awayOdds = h2h.outcomes.find((o) => o.name === event.away_team)?.price;
            if (homeOdds && drawOdds && awayOdds) {
                const entry: MatchOdds = { home: homeOdds, draw: drawOdds, away: awayOdds };
                const rawKey = `${norm(event.home_team)}|${norm(event.away_team)}`;
                const expKey = `${expandName(event.home_team)}|${expandName(event.away_team)}`;
                map.set(rawKey, entry);
                if (expKey !== rawKey) map.set(expKey, entry);
            }
        }
        return map;
    } catch {
        return new Map();
    }
}

function expandName(s: string): string {
    return norm(s)
        .replace(/\butd\b/g, "united")
        .replace(/\bman\b(?=\s)/g, "manchester")
        .replace(/\bspurs\b/g, "tottenham hotspur")
        .replace(/^tottenham$/, "tottenham hotspur")
        .replace(/\bwolves\b/g, "wolverhampton wanderers")
        .replace(/\bwolverhampton\b(?!\s+wanderers)/, "wolverhampton wanderers")
        .replace(/^brighton$/, "brighton and hove albion")
        .replace(/^leeds$/, "leeds united")
        .replace(/^newcastle$/, "newcastle united")
        .replace(/^west ham$/, "west ham united")
        .replace(/^nottm forest$/, "nottingham forest")
        .replace(/^nottingham$/, "nottingham forest")
        .replace(/^leicester$/, "leicester city")
        .replace(/^ipswich$/, "ipswich town")
        .replace(/\b(fc|cf|sc|ac|as|ss|us|rc|rcd|cd|ud|sd|ca|ra|afc|if)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export async function getOdds(competitionType: string): Promise<Map<string, MatchOdds>> {
    const key = process.env.ODDS_API_KEY;
    if (!key) return new Map();

    const sportKey = SPORT_KEYS[competitionType];
    if (!sportKey) return new Map();

    const isEkstraklasa = competitionType === "ekstraklasa_2526";

    try {
        const res = await fetch(
            `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${key}&regions=eu,uk&markets=h2h&oddsFormat=decimal`,
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

            // Scan all bookmakers for first one that has h2h
            type Outcome = { name: string; price: number };
            type Market = { key: string; outcomes: Outcome[] };
            type Bookie = { markets: Market[] };
            let h2h: Market | undefined;
            for (const bk of (event.bookmakers ?? []) as Bookie[]) {
                h2h = bk.markets?.find((m) => m.key === "h2h");
                if (h2h) break;
            }
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
