// WC 2026 Group Stage venues — hardcoded fallback.
// Used when the `venue` column in the DB is NULL.
// Keys are "home_team|away_team" using canonical English team names (from flags.ts).
// Source: en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_*

const VENUES: Record<string, string> = {
    // ── GROUP A ──────────────────────────────────────────────────────────────
    "Mexico|South Africa":     "Estadio Azteca, Mexico City",
    "South Korea|Czech Republic": "Estadio Akron, Zapopan",
    "Czech Republic|South Africa": "Mercedes-Benz Stadium, Atlanta",
    "Mexico|South Korea":      "Estadio Akron, Zapopan",
    "Czech Republic|Mexico":   "Estadio Azteca, Mexico City",
    "South Africa|South Korea": "Estadio BBVA, Guadalupe",

    // ── GROUP B ──────────────────────────────────────────────────────────────
    "Canada|Bosnia & Herzegovina": "BMO Field, Toronto",
    "Qatar|Switzerland":       "Levi's Stadium, Santa Clara",
    "Switzerland|Bosnia & Herzegovina": "SoFi Stadium, Inglewood",
    "Canada|Qatar":            "BC Place, Vancouver",
    "Switzerland|Canada":      "BC Place, Vancouver",
    "Bosnia & Herzegovina|Qatar": "Lumen Field, Seattle",

    // ── GROUP C ──────────────────────────────────────────────────────────────
    "Brazil|Morocco":          "MetLife Stadium, East Rutherford",
    "Haiti|Scotland":          "Gillette Stadium, Foxborough",
    "Scotland|Morocco":        "Gillette Stadium, Foxborough",
    "Brazil|Haiti":            "Lincoln Financial Field, Philadelphia",
    "Scotland|Brazil":         "Hard Rock Stadium, Miami Gardens",
    "Morocco|Haiti":           "Mercedes-Benz Stadium, Atlanta",

    // ── GROUP D ──────────────────────────────────────────────────────────────
    "USA|Paraguay":            "SoFi Stadium, Inglewood",
    "Australia|Turkey":        "BC Place, Vancouver",
    "USA|Australia":           "Lumen Field, Seattle",
    "Turkey|Paraguay":         "Levi's Stadium, Santa Clara",
    "Turkey|USA":              "SoFi Stadium, Inglewood",
    "Paraguay|Australia":      "Levi's Stadium, Santa Clara",

    // ── GROUP E ──────────────────────────────────────────────────────────────
    "Germany|Curaçao":         "NRG Stadium, Houston",
    "Ivory Coast|Ecuador":     "Lincoln Financial Field, Philadelphia",
    "Germany|Ivory Coast":     "BMO Field, Toronto",
    "Ecuador|Curaçao":         "Arrowhead Stadium, Kansas City",
    "Curaçao|Ivory Coast":     "Lincoln Financial Field, Philadelphia",
    "Ecuador|Germany":         "MetLife Stadium, East Rutherford",

    // ── GROUP F ──────────────────────────────────────────────────────────────
    "Netherlands|Japan":       "AT&T Stadium, Arlington",
    "Sweden|Tunisia":          "Estadio BBVA, Guadalupe",
    "Netherlands|Sweden":      "NRG Stadium, Houston",
    "Tunisia|Japan":           "Estadio BBVA, Guadalupe",
    "Japan|Sweden":            "AT&T Stadium, Arlington",
    "Tunisia|Netherlands":     "Arrowhead Stadium, Kansas City",

    // ── GROUP G ──────────────────────────────────────────────────────────────
    "Belgium|Egypt":           "Lumen Field, Seattle",
    "Iran|New Zealand":        "SoFi Stadium, Inglewood",
    "Belgium|Iran":            "SoFi Stadium, Inglewood",
    "New Zealand|Egypt":       "BC Place, Vancouver",
    "Egypt|Iran":              "Lumen Field, Seattle",
    "New Zealand|Belgium":     "BC Place, Vancouver",

    // ── GROUP H ──────────────────────────────────────────────────────────────
    "Spain|Cape Verde":        "Mercedes-Benz Stadium, Atlanta",
    "Saudi Arabia|Uruguay":    "Hard Rock Stadium, Miami Gardens",
    "Spain|Saudi Arabia":      "Mercedes-Benz Stadium, Atlanta",
    "Uruguay|Cape Verde":      "Hard Rock Stadium, Miami Gardens",
    "Cape Verde|Saudi Arabia": "NRG Stadium, Houston",
    "Uruguay|Spain":           "Estadio Akron, Zapopan",

    // ── GROUP I ──────────────────────────────────────────────────────────────
    "France|Senegal":          "MetLife Stadium, East Rutherford",
    "Iraq|Norway":             "Gillette Stadium, Foxborough",
    "France|Iraq":             "Lincoln Financial Field, Philadelphia",
    "Norway|Senegal":          "MetLife Stadium, East Rutherford",
    "Norway|France":           "Gillette Stadium, Foxborough",
    "Senegal|Iraq":            "BMO Field, Toronto",

    // ── GROUP J ──────────────────────────────────────────────────────────────
    "Argentina|Algeria":       "Arrowhead Stadium, Kansas City",
    "Austria|Jordan":          "Levi's Stadium, Santa Clara",
    "Argentina|Austria":       "AT&T Stadium, Arlington",
    "Jordan|Algeria":          "Levi's Stadium, Santa Clara",
    "Algeria|Austria":         "Arrowhead Stadium, Kansas City",
    "Jordan|Argentina":        "AT&T Stadium, Arlington",

    // ── GROUP K ──────────────────────────────────────────────────────────────
    "Portugal|DR Congo":       "NRG Stadium, Houston",
    "Uzbekistan|Colombia":     "Estadio Azteca, Mexico City",
    "Portugal|Uzbekistan":     "NRG Stadium, Houston",
    "Colombia|DR Congo":       "Estadio Akron, Zapopan",
    "Colombia|Portugal":       "Hard Rock Stadium, Miami Gardens",
    "DR Congo|Uzbekistan":     "Mercedes-Benz Stadium, Atlanta",

    // ── GROUP L ──────────────────────────────────────────────────────────────
    "England|Croatia":         "AT&T Stadium, Arlington",
    "Ghana|Panama":            "BMO Field, Toronto",
    "England|Ghana":           "Gillette Stadium, Foxborough",
    "Panama|Croatia":          "BMO Field, Toronto",
    "Panama|England":          "MetLife Stadium, East Rutherford",
    "Croatia|Ghana":           "Lincoln Financial Field, Philadelphia",
};

/**
 * Returns the WC 2026 venue for a match, or null if unknown.
 * Falls back gracefully when the DB venue column is NULL.
 */
export function getWcVenue(homeTeam: string, awayTeam: string): string | null {
    return (
        VENUES[`${homeTeam}|${awayTeam}`] ??
        VENUES[`${awayTeam}|${homeTeam}`] ??
        null
    );
}
