// Official Ekstraklasa PKO BP 2025/26 standings.
// Source: ekstraklasa.org/tabela/sezon
//
// HOW TO UPDATE after each round:
//   1. Update STANDINGS_ROUND to the new round number.
//   2. Replace the STANDINGS array with the new data from ekstraklasa.org/tabela/sezon.
//      – team:   use the canonical DB name (same as in src/lib/clubs.ts)
//      – pts:    official points (including any point deductions, e.g. Lechia -5)
//      – played, gf, ga: directly from the official table

export const STANDINGS_ROUND = 33;

export type StandingRow = {
    team:   string;
    played: number;
    won:    number;
    drawn:  number;
    lost:   number;
    gf:     number;
    ga:     number;
    pts:    number;
    note?:  string;   // e.g. point-deduction info
};

// Standings after round 33 — sourced from ekstraklasa.org on 2026-05-23
// Note: Lechia Gdańsk started the season with a –5 point penalty (licensing decision).
export const EKSTRAKLASA_STANDINGS: StandingRow[] = [
    { team: "Lech Poznań",                  played: 33, won: 16, drawn: 11, lost:  6, gf: 60, ga: 43, pts: 59 },
    { team: "Górnik Zabrze",                played: 33, won: 15, drawn:  8, lost: 10, gf: 44, ga: 36, pts: 53 },
    { team: "Jagiellonia Białystok",        played: 33, won: 14, drawn: 11, lost:  8, gf: 55, ga: 41, pts: 53 },
    { team: "Raków Częstochowa",            played: 33, won: 15, drawn:  7, lost: 11, gf: 48, ga: 40, pts: 52 },
    { team: "GKS Katowice",                 played: 33, won: 14, drawn:  7, lost: 12, gf: 50, ga: 44, pts: 49 },
    { team: "Zagłębie Lubin",               played: 33, won: 13, drawn:  9, lost: 11, gf: 45, ga: 37, pts: 48 },
    { team: "Legia Warszawa",               played: 33, won: 11, drawn: 13, lost:  9, gf: 38, ga: 37, pts: 46 },
    { team: "Wisła Płock",                  played: 33, won: 12, drawn:  9, lost: 12, gf: 32, ga: 36, pts: 45 },
    { team: "Radomiak Radom",               played: 33, won: 11, drawn: 11, lost: 11, gf: 50, ga: 47, pts: 44 },
    { team: "Pogoń Szczecin",               played: 33, won: 13, drawn:  5, lost: 15, gf: 46, ga: 48, pts: 44 },
    { team: "Motor Lublin",                 played: 33, won: 10, drawn: 13, lost: 10, gf: 46, ga: 49, pts: 43 },
    { team: "Korona Kielce",                played: 33, won: 11, drawn:  9, lost: 13, gf: 39, ga: 39, pts: 42 },
    { team: "Piast Gliwice",                played: 33, won: 11, drawn:  8, lost: 14, gf: 41, ga: 44, pts: 41 },
    { team: "Cracovia",                     played: 33, won:  9, drawn: 14, lost: 10, gf: 38, ga: 41, pts: 41 },
    { team: "Widzew Łódź",                  played: 33, won: 11, drawn:  6, lost: 16, gf: 39, ga: 40, pts: 39 },
    { team: "Lechia Gdańsk",                played: 33, won: 12, drawn:  7, lost: 14, gf: 60, ga: 62, pts: 38, note: "−5 pkt (decyzja licencyjna)" },
    { team: "Arka Gdynia",                  played: 33, won:  9, drawn:  9, lost: 15, gf: 34, ga: 58, pts: 36 },
    { team: "Bruk-Bet Termalica Nieciecza", played: 33, won:  8, drawn:  7, lost: 18, gf: 40, ga: 63, pts: 31 },
];
