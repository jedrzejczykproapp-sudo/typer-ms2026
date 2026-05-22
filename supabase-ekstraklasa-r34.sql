-- ============================================================
-- Ekstraklasa 2025/26 – Kolejka 34 (23 maja 2026, godz. 17:30)
-- Źródło: Transfermarkt
-- ============================================================
-- Jeśli wcześniej wgrałeś supabase-ekstraklasa-2526.sql,
-- usuń najpierw błędne mecze kolejki 34 z Bergera:
--
--   DELETE FROM matches
--   WHERE competition_type = 'ekstraklasa_2526' AND matchday = 34;
--
-- Następnie uruchom poniższe INSERT:
-- ============================================================

INSERT INTO matches
  (home_team, away_team, home_flag, away_flag, match_date, stage,
   group_name, matchday, venue, home_score, away_score, status, competition_type)
VALUES
  ('Bruk-Bet Termalica Nieciecza', 'Lechia Gdańsk',  '', '', '2026-05-23T17:30:00+02:00', 'group', NULL, 34, 'Stadion Bruk-Bet Termaliki, Nieciecza', NULL, NULL, 'upcoming', 'ekstraklasa_2526'),
  ('Cracovia',                     'Korona Kielce',  '', '', '2026-05-23T17:30:00+02:00', 'group', NULL, 34, 'Stadion im. J. Piłsudskiego, Kraków',  NULL, NULL, 'upcoming', 'ekstraklasa_2526'),
  ('Górnik Zabrze',                'Radomiak Radom', '', '', '2026-05-23T17:30:00+02:00', 'group', NULL, 34, 'Arena Zabrze, Zabrze',                 NULL, NULL, 'upcoming', 'ekstraklasa_2526'),
  ('Jagiellonia Białystok',        'Zagłębie Lubin', '', '', '2026-05-23T17:30:00+02:00', 'group', NULL, 34, 'Stadion Miejski, Białystok',            NULL, NULL, 'upcoming', 'ekstraklasa_2526'),
  ('Lech Poznań',                  'Wisła Płock',    '', '', '2026-05-23T17:30:00+02:00', 'group', NULL, 34, 'Enea Stadion, Poznań',                  NULL, NULL, 'upcoming', 'ekstraklasa_2526'),
  ('Legia Warszawa',               'Motor Lublin',   '', '', '2026-05-23T17:30:00+02:00', 'group', NULL, 34, 'Legia Stadium, Warszawa',               NULL, NULL, 'upcoming', 'ekstraklasa_2526'),
  ('Pogoń Szczecin',               'GKS Katowice',   '', '', '2026-05-23T17:30:00+02:00', 'group', NULL, 34, 'Stadion Floriana Krygiera, Szczecin',   NULL, NULL, 'upcoming', 'ekstraklasa_2526'),
  ('Raków Częstochowa',            'Arka Gdynia',    '', '', '2026-05-23T17:30:00+02:00', 'group', NULL, 34, 'Stadion Rakowa, Częstochowa',           NULL, NULL, 'upcoming', 'ekstraklasa_2526'),
  ('Widzew Łódź',                  'Piast Gliwice',  '', '', '2026-05-23T17:30:00+02:00', 'group', NULL, 34, 'Stadion Widzewa, Łódź',                 NULL, NULL, 'upcoming', 'ekstraklasa_2526')
;
