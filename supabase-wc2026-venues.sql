-- WC 2026 Group Stage Venues
-- Źródło: Wikipedia (en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_*)
-- Real draw: December 5, 2025
--
-- HOW TO RUN:
--   Paste into Supabase SQL Editor and execute.
--   Each UPDATE matches by home_team + away_team pair (order-independent).

-- ─── GRUPA A: Mexico, South Africa, South Korea, Czech Republic ────────────

UPDATE matches SET venue = 'Estadio Azteca, Mexico City'
WHERE (home_team = 'Mexico' AND away_team = 'South Africa') OR (home_team = 'South Africa' AND away_team = 'Mexico');

UPDATE matches SET venue = 'Estadio Akron, Zapopan'
WHERE (home_team = 'South Korea' AND away_team = 'Czech Republic') OR (home_team = 'Czech Republic' AND away_team = 'South Korea');

UPDATE matches SET venue = 'Mercedes-Benz Stadium, Atlanta'
WHERE (home_team = 'Czech Republic' AND away_team = 'South Africa') OR (home_team = 'South Africa' AND away_team = 'Czech Republic');

UPDATE matches SET venue = 'Estadio Akron, Zapopan'
WHERE (home_team = 'Mexico' AND away_team = 'South Korea') OR (home_team = 'South Korea' AND away_team = 'Mexico');

UPDATE matches SET venue = 'Estadio Azteca, Mexico City'
WHERE (home_team = 'Czech Republic' AND away_team = 'Mexico') OR (home_team = 'Mexico' AND away_team = 'Czech Republic');

UPDATE matches SET venue = 'Estadio BBVA, Guadalupe'
WHERE (home_team = 'South Africa' AND away_team = 'South Korea') OR (home_team = 'South Korea' AND away_team = 'South Africa');

-- ─── GRUPA B: Canada, Bosnia & Herzegovina, Qatar, Switzerland ─────────────

UPDATE matches SET venue = 'BMO Field, Toronto'
WHERE (home_team = 'Canada' AND away_team = 'Bosnia & Herzegovina') OR (home_team = 'Bosnia & Herzegovina' AND away_team = 'Canada');

UPDATE matches SET venue = 'Levi''s Stadium, Santa Clara'
WHERE (home_team = 'Qatar' AND away_team = 'Switzerland') OR (home_team = 'Switzerland' AND away_team = 'Qatar');

UPDATE matches SET venue = 'SoFi Stadium, Inglewood'
WHERE (home_team = 'Switzerland' AND away_team = 'Bosnia & Herzegovina') OR (home_team = 'Bosnia & Herzegovina' AND away_team = 'Switzerland');

UPDATE matches SET venue = 'BC Place, Vancouver'
WHERE (home_team = 'Canada' AND away_team = 'Qatar') OR (home_team = 'Qatar' AND away_team = 'Canada');

UPDATE matches SET venue = 'BC Place, Vancouver'
WHERE (home_team = 'Switzerland' AND away_team = 'Canada') OR (home_team = 'Canada' AND away_team = 'Switzerland');

UPDATE matches SET venue = 'Lumen Field, Seattle'
WHERE (home_team = 'Bosnia & Herzegovina' AND away_team = 'Qatar') OR (home_team = 'Qatar' AND away_team = 'Bosnia & Herzegovina');

-- ─── GRUPA C: Brazil, Morocco, Haiti, Scotland ─────────────────────────────

UPDATE matches SET venue = 'MetLife Stadium, East Rutherford'
WHERE (home_team = 'Brazil' AND away_team = 'Morocco') OR (home_team = 'Morocco' AND away_team = 'Brazil');

UPDATE matches SET venue = 'Gillette Stadium, Foxborough'
WHERE (home_team = 'Haiti' AND away_team = 'Scotland') OR (home_team = 'Scotland' AND away_team = 'Haiti');

UPDATE matches SET venue = 'Gillette Stadium, Foxborough'
WHERE (home_team = 'Scotland' AND away_team = 'Morocco') OR (home_team = 'Morocco' AND away_team = 'Scotland');

UPDATE matches SET venue = 'Lincoln Financial Field, Philadelphia'
WHERE (home_team = 'Brazil' AND away_team = 'Haiti') OR (home_team = 'Haiti' AND away_team = 'Brazil');

UPDATE matches SET venue = 'Hard Rock Stadium, Miami Gardens'
WHERE (home_team = 'Scotland' AND away_team = 'Brazil') OR (home_team = 'Brazil' AND away_team = 'Scotland');

UPDATE matches SET venue = 'Mercedes-Benz Stadium, Atlanta'
WHERE (home_team = 'Morocco' AND away_team = 'Haiti') OR (home_team = 'Haiti' AND away_team = 'Morocco');

-- ─── GRUPA D: USA, Paraguay, Australia, Turkey ─────────────────────────────

UPDATE matches SET venue = 'SoFi Stadium, Inglewood'
WHERE (home_team = 'USA' AND away_team = 'Paraguay') OR (home_team = 'Paraguay' AND away_team = 'USA');

UPDATE matches SET venue = 'BC Place, Vancouver'
WHERE (home_team = 'Australia' AND away_team = 'Turkey') OR (home_team = 'Turkey' AND away_team = 'Australia');

UPDATE matches SET venue = 'Lumen Field, Seattle'
WHERE (home_team = 'USA' AND away_team = 'Australia') OR (home_team = 'Australia' AND away_team = 'USA');

UPDATE matches SET venue = 'Levi''s Stadium, Santa Clara'
WHERE (home_team = 'Turkey' AND away_team = 'Paraguay') OR (home_team = 'Paraguay' AND away_team = 'Turkey');

UPDATE matches SET venue = 'SoFi Stadium, Inglewood'
WHERE (home_team = 'Turkey' AND away_team = 'USA') OR (home_team = 'USA' AND away_team = 'Turkey');

UPDATE matches SET venue = 'Levi''s Stadium, Santa Clara'
WHERE (home_team = 'Paraguay' AND away_team = 'Australia') OR (home_team = 'Australia' AND away_team = 'Paraguay');

-- ─── GRUPA E: Germany, Curaçao, Ivory Coast, Ecuador ──────────────────────

UPDATE matches SET venue = 'NRG Stadium, Houston'
WHERE (home_team = 'Germany' AND away_team = 'Curaçao') OR (home_team = 'Curaçao' AND away_team = 'Germany');

UPDATE matches SET venue = 'Lincoln Financial Field, Philadelphia'
WHERE (home_team = 'Ivory Coast' AND away_team = 'Ecuador') OR (home_team = 'Ecuador' AND away_team = 'Ivory Coast');

UPDATE matches SET venue = 'BMO Field, Toronto'
WHERE (home_team = 'Germany' AND away_team = 'Ivory Coast') OR (home_team = 'Ivory Coast' AND away_team = 'Germany');

UPDATE matches SET venue = 'Arrowhead Stadium, Kansas City'
WHERE (home_team = 'Ecuador' AND away_team = 'Curaçao') OR (home_team = 'Curaçao' AND away_team = 'Ecuador');

UPDATE matches SET venue = 'Lincoln Financial Field, Philadelphia'
WHERE (home_team = 'Curaçao' AND away_team = 'Ivory Coast') OR (home_team = 'Ivory Coast' AND away_team = 'Curaçao');

UPDATE matches SET venue = 'MetLife Stadium, East Rutherford'
WHERE (home_team = 'Ecuador' AND away_team = 'Germany') OR (home_team = 'Germany' AND away_team = 'Ecuador');

-- ─── GRUPA F: Netherlands, Japan, Sweden, Tunisia ──────────────────────────

UPDATE matches SET venue = 'AT&T Stadium, Arlington'
WHERE (home_team = 'Netherlands' AND away_team = 'Japan') OR (home_team = 'Japan' AND away_team = 'Netherlands');

UPDATE matches SET venue = 'Estadio BBVA, Guadalupe'
WHERE (home_team = 'Sweden' AND away_team = 'Tunisia') OR (home_team = 'Tunisia' AND away_team = 'Sweden');

UPDATE matches SET venue = 'NRG Stadium, Houston'
WHERE (home_team = 'Netherlands' AND away_team = 'Sweden') OR (home_team = 'Sweden' AND away_team = 'Netherlands');

UPDATE matches SET venue = 'Estadio BBVA, Guadalupe'
WHERE (home_team = 'Tunisia' AND away_team = 'Japan') OR (home_team = 'Japan' AND away_team = 'Tunisia');

UPDATE matches SET venue = 'AT&T Stadium, Arlington'
WHERE (home_team = 'Japan' AND away_team = 'Sweden') OR (home_team = 'Sweden' AND away_team = 'Japan');

UPDATE matches SET venue = 'Arrowhead Stadium, Kansas City'
WHERE (home_team = 'Tunisia' AND away_team = 'Netherlands') OR (home_team = 'Netherlands' AND away_team = 'Tunisia');

-- ─── GRUPA G: Belgium, Egypt, Iran, New Zealand ────────────────────────────

UPDATE matches SET venue = 'Lumen Field, Seattle'
WHERE (home_team = 'Belgium' AND away_team = 'Egypt') OR (home_team = 'Egypt' AND away_team = 'Belgium');

UPDATE matches SET venue = 'SoFi Stadium, Inglewood'
WHERE (home_team = 'Iran' AND away_team = 'New Zealand') OR (home_team = 'New Zealand' AND away_team = 'Iran');

UPDATE matches SET venue = 'SoFi Stadium, Inglewood'
WHERE (home_team = 'Belgium' AND away_team = 'Iran') OR (home_team = 'Iran' AND away_team = 'Belgium');

UPDATE matches SET venue = 'BC Place, Vancouver'
WHERE (home_team = 'New Zealand' AND away_team = 'Egypt') OR (home_team = 'Egypt' AND away_team = 'New Zealand');

UPDATE matches SET venue = 'Lumen Field, Seattle'
WHERE (home_team = 'Egypt' AND away_team = 'Iran') OR (home_team = 'Iran' AND away_team = 'Egypt');

UPDATE matches SET venue = 'BC Place, Vancouver'
WHERE (home_team = 'New Zealand' AND away_team = 'Belgium') OR (home_team = 'Belgium' AND away_team = 'New Zealand');

-- ─── GRUPA H: Spain, Cape Verde, Saudi Arabia, Uruguay ─────────────────────

UPDATE matches SET venue = 'Mercedes-Benz Stadium, Atlanta'
WHERE (home_team = 'Spain' AND away_team = 'Cape Verde') OR (home_team = 'Cape Verde' AND away_team = 'Spain');

UPDATE matches SET venue = 'Hard Rock Stadium, Miami Gardens'
WHERE (home_team = 'Saudi Arabia' AND away_team = 'Uruguay') OR (home_team = 'Uruguay' AND away_team = 'Saudi Arabia');

UPDATE matches SET venue = 'Mercedes-Benz Stadium, Atlanta'
WHERE (home_team = 'Spain' AND away_team = 'Saudi Arabia') OR (home_team = 'Saudi Arabia' AND away_team = 'Spain');

UPDATE matches SET venue = 'Hard Rock Stadium, Miami Gardens'
WHERE (home_team = 'Uruguay' AND away_team = 'Cape Verde') OR (home_team = 'Cape Verde' AND away_team = 'Uruguay');

UPDATE matches SET venue = 'NRG Stadium, Houston'
WHERE (home_team = 'Cape Verde' AND away_team = 'Saudi Arabia') OR (home_team = 'Saudi Arabia' AND away_team = 'Cape Verde');

UPDATE matches SET venue = 'Estadio Akron, Zapopan'
WHERE (home_team = 'Uruguay' AND away_team = 'Spain') OR (home_team = 'Spain' AND away_team = 'Uruguay');

-- ─── GRUPA I: France, Senegal, Iraq, Norway ────────────────────────────────

UPDATE matches SET venue = 'MetLife Stadium, East Rutherford'
WHERE (home_team = 'France' AND away_team = 'Senegal') OR (home_team = 'Senegal' AND away_team = 'France');

UPDATE matches SET venue = 'Gillette Stadium, Foxborough'
WHERE (home_team = 'Iraq' AND away_team = 'Norway') OR (home_team = 'Norway' AND away_team = 'Iraq');

UPDATE matches SET venue = 'Lincoln Financial Field, Philadelphia'
WHERE (home_team = 'France' AND away_team = 'Iraq') OR (home_team = 'Iraq' AND away_team = 'France');

UPDATE matches SET venue = 'MetLife Stadium, East Rutherford'
WHERE (home_team = 'Norway' AND away_team = 'Senegal') OR (home_team = 'Senegal' AND away_team = 'Norway');

UPDATE matches SET venue = 'Gillette Stadium, Foxborough'
WHERE (home_team = 'Norway' AND away_team = 'France') OR (home_team = 'France' AND away_team = 'Norway');

UPDATE matches SET venue = 'BMO Field, Toronto'
WHERE (home_team = 'Senegal' AND away_team = 'Iraq') OR (home_team = 'Iraq' AND away_team = 'Senegal');

-- ─── GRUPA J: Argentina, Algeria, Austria, Jordan ──────────────────────────

UPDATE matches SET venue = 'Arrowhead Stadium, Kansas City'
WHERE (home_team = 'Argentina' AND away_team = 'Algeria') OR (home_team = 'Algeria' AND away_team = 'Argentina');

UPDATE matches SET venue = 'Levi''s Stadium, Santa Clara'
WHERE (home_team = 'Austria' AND away_team = 'Jordan') OR (home_team = 'Jordan' AND away_team = 'Austria');

UPDATE matches SET venue = 'AT&T Stadium, Arlington'
WHERE (home_team = 'Argentina' AND away_team = 'Austria') OR (home_team = 'Austria' AND away_team = 'Argentina');

UPDATE matches SET venue = 'Levi''s Stadium, Santa Clara'
WHERE (home_team = 'Jordan' AND away_team = 'Algeria') OR (home_team = 'Algeria' AND away_team = 'Jordan');

UPDATE matches SET venue = 'Arrowhead Stadium, Kansas City'
WHERE (home_team = 'Algeria' AND away_team = 'Austria') OR (home_team = 'Austria' AND away_team = 'Algeria');

UPDATE matches SET venue = 'AT&T Stadium, Arlington'
WHERE (home_team = 'Jordan' AND away_team = 'Argentina') OR (home_team = 'Argentina' AND away_team = 'Jordan');

-- ─── GRUPA K: Portugal, DR Congo, Uzbekistan, Colombia ─────────────────────

UPDATE matches SET venue = 'NRG Stadium, Houston'
WHERE (home_team = 'Portugal' AND away_team = 'DR Congo') OR (home_team = 'DR Congo' AND away_team = 'Portugal');

UPDATE matches SET venue = 'Estadio Azteca, Mexico City'
WHERE (home_team = 'Uzbekistan' AND away_team = 'Colombia') OR (home_team = 'Colombia' AND away_team = 'Uzbekistan');

UPDATE matches SET venue = 'NRG Stadium, Houston'
WHERE (home_team = 'Portugal' AND away_team = 'Uzbekistan') OR (home_team = 'Uzbekistan' AND away_team = 'Portugal');

UPDATE matches SET venue = 'Estadio Akron, Zapopan'
WHERE (home_team = 'Colombia' AND away_team = 'DR Congo') OR (home_team = 'DR Congo' AND away_team = 'Colombia');

UPDATE matches SET venue = 'Hard Rock Stadium, Miami Gardens'
WHERE (home_team = 'Colombia' AND away_team = 'Portugal') OR (home_team = 'Portugal' AND away_team = 'Colombia');

UPDATE matches SET venue = 'Mercedes-Benz Stadium, Atlanta'
WHERE (home_team = 'DR Congo' AND away_team = 'Uzbekistan') OR (home_team = 'Uzbekistan' AND away_team = 'DR Congo');

-- ─── GRUPA L: England, Croatia, Ghana, Panama ──────────────────────────────

UPDATE matches SET venue = 'AT&T Stadium, Arlington'
WHERE (home_team = 'England' AND away_team = 'Croatia') OR (home_team = 'Croatia' AND away_team = 'England');

UPDATE matches SET venue = 'BMO Field, Toronto'
WHERE (home_team = 'Ghana' AND away_team = 'Panama') OR (home_team = 'Panama' AND away_team = 'Ghana');

UPDATE matches SET venue = 'Gillette Stadium, Foxborough'
WHERE (home_team = 'England' AND away_team = 'Ghana') OR (home_team = 'Ghana' AND away_team = 'England');

UPDATE matches SET venue = 'BMO Field, Toronto'
WHERE (home_team = 'Panama' AND away_team = 'Croatia') OR (home_team = 'Croatia' AND away_team = 'Panama');

UPDATE matches SET venue = 'MetLife Stadium, East Rutherford'
WHERE (home_team = 'Panama' AND away_team = 'England') OR (home_team = 'England' AND away_team = 'Panama');

UPDATE matches SET venue = 'Lincoln Financial Field, Philadelphia'
WHERE (home_team = 'Croatia' AND away_team = 'Ghana') OR (home_team = 'Ghana' AND away_team = 'Croatia');
