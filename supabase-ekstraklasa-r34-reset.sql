-- Reset kolejki 34 do statusu "do obstawienia"
-- Uruchom w Supabase SQL Editor
UPDATE matches
SET home_score = NULL,
    away_score = NULL,
    status     = 'upcoming'
WHERE matchday = 34
  AND competition_type = 'ekstraklasa_2526';
