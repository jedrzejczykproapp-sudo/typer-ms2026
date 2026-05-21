export interface MatchOdds {
    home: number;
    draw: number;
    away: number;
}

export async function getWcOdds(): Promise<Map<string, MatchOdds>> {
    const key = process.env.ODDS_API_KEY;
    if (!key) return new Map();

    try {
        const res = await fetch(
            `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${key}&regions=eu&markets=h2h&oddsFormat=decimal`,
            { next: { revalidate: 3600 } },
        );
        if (!res.ok) return new Map();

        const data = await res.json();
        const map = new Map<string, MatchOdds>();

        for (const event of data) {
            const homeTeam: string = event.home_team;
            const awayTeam: string = event.away_team;
            const bookie = event.bookmakers?.[0];
            const h2h = bookie?.markets?.find((m: { key: string }) => m.key === "h2h");
            if (!h2h) continue;

            const homeOdds = h2h.outcomes.find((o: { name: string; price: number }) => o.name === homeTeam)?.price;
            const awayOdds = h2h.outcomes.find((o: { name: string; price: number }) => o.name === awayTeam)?.price;
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
