-- WC 2026 Match Seed Data
-- Groups: A-L, 4 teams each, 6 matches per group = 72 group stage matches
-- Note: Draw order is illustrative. Update with official draw when confirmed.

insert into matches (home_team, away_team, home_flag, away_flag, match_date, stage, group_name, matchday, venue) values

-- GROUP A: USA, Brazil, Morocco, Australia
('USA', 'Brazil', '🇺🇸', '🇧🇷', '2026-06-11 21:00:00+00', 'group', 'A', 1, 'SoFi Stadium, Los Angeles'),
('Morocco', 'Australia', '🇲🇦', '🇦🇺', '2026-06-12 00:00:00+00', 'group', 'A', 1, 'Rose Bowl, Pasadena'),
('USA', 'Morocco', '🇺🇸', '🇲🇦', '2026-06-18 21:00:00+00', 'group', 'A', 2, 'MetLife Stadium, New York'),
('Brazil', 'Australia', '🇧🇷', '🇦🇺', '2026-06-19 00:00:00+00', 'group', 'A', 2, 'AT&T Stadium, Dallas'),
('USA', 'Australia', '🇺🇸', '🇦🇺', '2026-06-26 20:00:00+00', 'group', 'A', 3, 'Levi''s Stadium, San Jose'),
('Brazil', 'Morocco', '🇧🇷', '🇲🇦', '2026-06-26 20:00:00+00', 'group', 'A', 3, 'Hard Rock Stadium, Miami'),

-- GROUP B: Mexico, France, Senegal, Indonesia
('Mexico', 'France', '🇲🇽', '🇫🇷', '2026-06-12 21:00:00+00', 'group', 'B', 1, 'Estadio Azteca, Mexico City'),
('Senegal', 'Indonesia', '🇸🇳', '🇮🇩', '2026-06-12 18:00:00+00', 'group', 'B', 1, 'NRG Stadium, Houston'),
('Mexico', 'Senegal', '🇲🇽', '🇸🇳', '2026-06-19 21:00:00+00', 'group', 'B', 2, 'Estadio Guadalajara, Guadalajara'),
('France', 'Indonesia', '🇫🇷', '🇮🇩', '2026-06-20 00:00:00+00', 'group', 'B', 2, 'Lincoln Financial Field, Philadelphia'),
('Mexico', 'Indonesia', '🇲🇽', '🇮🇩', '2026-06-27 20:00:00+00', 'group', 'B', 3, 'Estadio BBVA, Monterrey'),
('France', 'Senegal', '🇫🇷', '🇸🇳', '2026-06-27 20:00:00+00', 'group', 'B', 3, 'Arrowhead Stadium, Kansas City'),

-- GROUP C: Canada, Germany, Japan, Bolivia
('Canada', 'Germany', '🇨🇦', '🇩🇪', '2026-06-13 00:00:00+00', 'group', 'C', 1, 'BC Place, Vancouver'),
('Japan', 'Bolivia', '🇯🇵', '🇧🇴', '2026-06-13 20:00:00+00', 'group', 'C', 1, 'BMO Field, Toronto'),
('Canada', 'Japan', '🇨🇦', '🇯🇵', '2026-06-20 21:00:00+00', 'group', 'C', 2, 'Stade Olympique, Montreal'),
('Germany', 'Bolivia', '🇩🇪', '🇧🇴', '2026-06-20 18:00:00+00', 'group', 'C', 2, 'Lumen Field, Seattle'),
('Canada', 'Bolivia', '🇨🇦', '🇧🇴', '2026-06-28 20:00:00+00', 'group', 'C', 3, 'BC Place, Vancouver'),
('Germany', 'Japan', '🇩🇪', '🇯🇵', '2026-06-28 20:00:00+00', 'group', 'C', 3, 'Gillette Stadium, Boston'),

-- GROUP D: Argentina, England, Egypt, Qatar
('Argentina', 'England', '🇦🇷', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '2026-06-13 21:00:00+00', 'group', 'D', 1, 'MetLife Stadium, New York'),
('Egypt', 'Qatar', '🇪🇬', '🇶🇦', '2026-06-14 00:00:00+00', 'group', 'D', 1, 'Allegiant Stadium, Las Vegas'),
('Argentina', 'Egypt', '🇦🇷', '🇪🇬', '2026-06-21 00:00:00+00', 'group', 'D', 2, 'SoFi Stadium, Los Angeles'),
('England', 'Qatar', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇶🇦', '2026-06-21 21:00:00+00', 'group', 'D', 2, 'Rose Bowl, Pasadena'),
('Argentina', 'Qatar', '🇦🇷', '🇶🇦', '2026-06-29 20:00:00+00', 'group', 'D', 3, 'AT&T Stadium, Dallas'),
('England', 'Egypt', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇪🇬', '2026-06-29 20:00:00+00', 'group', 'D', 3, 'Hard Rock Stadium, Miami'),

-- GROUP E: Spain, Colombia, Nigeria, Saudi Arabia
('Spain', 'Colombia', '🇪🇸', '🇨🇴', '2026-06-14 18:00:00+00', 'group', 'E', 1, 'NRG Stadium, Houston'),
('Nigeria', 'Saudi Arabia', '🇳🇬', '🇸🇦', '2026-06-14 21:00:00+00', 'group', 'E', 1, 'Arrowhead Stadium, Kansas City'),
('Spain', 'Nigeria', '🇪🇸', '🇳🇬', '2026-06-21 18:00:00+00', 'group', 'E', 2, 'Lincoln Financial Field, Philadelphia'),
('Colombia', 'Saudi Arabia', '🇨🇴', '🇸🇦', '2026-06-22 00:00:00+00', 'group', 'E', 2, 'Lumen Field, Seattle'),
('Spain', 'Saudi Arabia', '🇪🇸', '🇸🇦', '2026-06-30 20:00:00+00', 'group', 'E', 3, 'MetLife Stadium, New York'),
('Colombia', 'Nigeria', '🇨🇴', '🇳🇬', '2026-06-30 20:00:00+00', 'group', 'E', 3, 'AT&T Stadium, Dallas'),

-- GROUP F: Portugal, Netherlands, Cameroon, Costa Rica
('Portugal', 'Netherlands', '🇵🇹', '🇳🇱', '2026-06-15 00:00:00+00', 'group', 'F', 1, 'Gillette Stadium, Boston'),
('Cameroon', 'Costa Rica', '🇨🇲', '🇨🇷', '2026-06-14 18:00:00+00', 'group', 'F', 1, 'Allegiant Stadium, Las Vegas'),
('Portugal', 'Cameroon', '🇵🇹', '🇨🇲', '2026-06-22 21:00:00+00', 'group', 'F', 2, 'SoFi Stadium, Los Angeles'),
('Netherlands', 'Costa Rica', '🇳🇱', '🇨🇷', '2026-06-22 18:00:00+00', 'group', 'F', 2, 'Levi''s Stadium, San Jose'),
('Portugal', 'Costa Rica', '🇵🇹', '🇨🇷', '2026-07-01 20:00:00+00', 'group', 'F', 3, 'Rose Bowl, Pasadena'),
('Netherlands', 'Cameroon', '🇳🇱', '🇨🇲', '2026-07-01 20:00:00+00', 'group', 'F', 3, 'Hard Rock Stadium, Miami'),

-- GROUP G: Belgium, Italy, Uruguay, South Korea
('Belgium', 'Italy', '🇧🇪', '🇮🇹', '2026-06-15 18:00:00+00', 'group', 'G', 1, 'NRG Stadium, Houston'),
('Uruguay', 'South Korea', '🇺🇾', '🇰🇷', '2026-06-15 21:00:00+00', 'group', 'G', 1, 'Arrowhead Stadium, Kansas City'),
('Belgium', 'Uruguay', '🇧🇪', '🇺🇾', '2026-06-22 00:00:00+00', 'group', 'G', 2, 'Allegiant Stadium, Las Vegas'),
('Italy', 'South Korea', '🇮🇹', '🇰🇷', '2026-06-23 00:00:00+00', 'group', 'G', 2, 'AT&T Stadium, Dallas'),
('Belgium', 'South Korea', '🇧🇪', '🇰🇷', '2026-07-01 20:00:00+00', 'group', 'G', 3, 'MetLife Stadium, New York'),
('Italy', 'Uruguay', '🇮🇹', '🇺🇾', '2026-07-01 20:00:00+00', 'group', 'G', 3, 'Lincoln Financial Field, Philadelphia'),

-- GROUP H: Denmark, Croatia, Ghana, Ecuador
('Denmark', 'Croatia', '🇩🇰', '🇭🇷', '2026-06-15 21:00:00+00', 'group', 'H', 1, 'Lumen Field, Seattle'),
('Ghana', 'Ecuador', '🇬🇭', '🇪🇨', '2026-06-16 00:00:00+00', 'group', 'H', 1, 'BC Place, Vancouver'),
('Denmark', 'Ghana', '🇩🇰', '🇬🇭', '2026-06-23 18:00:00+00', 'group', 'H', 2, 'Gillette Stadium, Boston'),
('Croatia', 'Ecuador', '🇭🇷', '🇪🇨', '2026-06-23 21:00:00+00', 'group', 'H', 2, 'Rose Bowl, Pasadena'),
('Denmark', 'Ecuador', '🇩🇰', '🇪🇨', '2026-07-02 20:00:00+00', 'group', 'H', 3, 'SoFi Stadium, Los Angeles'),
('Croatia', 'Ghana', '🇭🇷', '🇬🇭', '2026-07-02 20:00:00+00', 'group', 'H', 3, 'NRG Stadium, Houston'),

-- GROUP I: Switzerland, Turkey, Algeria, Chile
('Switzerland', 'Turkey', '🇨🇭', '🇹🇷', '2026-06-16 18:00:00+00', 'group', 'I', 1, 'BMO Field, Toronto'),
('Algeria', 'Chile', '🇩🇿', '🇨🇱', '2026-06-16 21:00:00+00', 'group', 'I', 1, 'Stade Olympique, Montreal'),
('Switzerland', 'Algeria', '🇨🇭', '🇩🇿', '2026-06-23 21:00:00+00', 'group', 'I', 2, 'Arrowhead Stadium, Kansas City'),
('Turkey', 'Chile', '🇹🇷', '🇨🇱', '2026-06-24 00:00:00+00', 'group', 'I', 2, 'Allegiant Stadium, Las Vegas'),
('Switzerland', 'Chile', '🇨🇭', '🇨🇱', '2026-07-02 20:00:00+00', 'group', 'I', 3, 'Levi''s Stadium, San Jose'),
('Turkey', 'Algeria', '🇹🇷', '🇩🇿', '2026-07-02 20:00:00+00', 'group', 'I', 3, 'Lumen Field, Seattle'),

-- GROUP J: Serbia, Poland, Ivory Coast, Venezuela
('Serbia', 'Poland', '🇷🇸', '🇵🇱', '2026-06-16 18:00:00+00', 'group', 'J', 1, 'AT&T Stadium, Dallas'),
('Ivory Coast', 'Venezuela', '🇨🇮', '🇻🇪', '2026-06-17 00:00:00+00', 'group', 'J', 1, 'MetLife Stadium, New York'),
('Serbia', 'Ivory Coast', '🇷🇸', '🇨🇮', '2026-06-24 18:00:00+00', 'group', 'J', 2, 'Hard Rock Stadium, Miami'),
('Poland', 'Venezuela', '🇵🇱', '🇻🇪', '2026-06-24 21:00:00+00', 'group', 'J', 2, 'NRG Stadium, Houston'),
('Serbia', 'Venezuela', '🇷🇸', '🇻🇪', '2026-07-03 20:00:00+00', 'group', 'J', 3, 'Gillette Stadium, Boston'),
('Poland', 'Ivory Coast', '🇵🇱', '🇨🇮', '2026-07-03 20:00:00+00', 'group', 'J', 3, 'Rose Bowl, Pasadena'),

-- GROUP K: Austria, Czech Republic, Tunisia, Panama
('Austria', 'Czech Republic', '🇦🇹', '🇨🇿', '2026-06-17 21:00:00+00', 'group', 'K', 1, 'Levi''s Stadium, San Jose'),
('Tunisia', 'Panama', '🇹🇳', '🇵🇦', '2026-06-17 18:00:00+00', 'group', 'K', 1, 'BC Place, Vancouver'),
('Austria', 'Tunisia', '🇦🇹', '🇹🇳', '2026-06-24 00:00:00+00', 'group', 'K', 2, 'BMO Field, Toronto'),
('Czech Republic', 'Panama', '🇨🇿', '🇵🇦', '2026-06-25 00:00:00+00', 'group', 'K', 2, 'Stade Olympique, Montreal'),
('Austria', 'Panama', '🇦🇹', '🇵🇦', '2026-07-03 20:00:00+00', 'group', 'K', 3, 'Allegiant Stadium, Las Vegas'),
('Czech Republic', 'Tunisia', '🇨🇿', '🇹🇳', '2026-07-03 20:00:00+00', 'group', 'K', 3, 'Arrowhead Stadium, Kansas City'),

-- GROUP L: New Zealand, Iran, Uzbekistan, Jamaica
('New Zealand', 'Iran', '🇳🇿', '🇮🇷', '2026-06-17 00:00:00+00', 'group', 'L', 1, 'Allegiant Stadium, Las Vegas'),
('Uzbekistan', 'Jamaica', '🇺🇿', '🇯🇲', '2026-06-17 21:00:00+00', 'group', 'L', 1, 'SoFi Stadium, Los Angeles'),
('New Zealand', 'Uzbekistan', '🇳🇿', '🇺🇿', '2026-06-25 18:00:00+00', 'group', 'L', 2, 'Lincoln Financial Field, Philadelphia'),
('Iran', 'Jamaica', '🇮🇷', '🇯🇲', '2026-06-25 21:00:00+00', 'group', 'L', 2, 'AT&T Stadium, Dallas'),
('New Zealand', 'Jamaica', '🇳🇿', '🇯🇲', '2026-07-04 20:00:00+00', 'group', 'L', 3, 'MetLife Stadium, New York'),
('Iran', 'Uzbekistan', '🇮🇷', '🇺🇿', '2026-07-04 20:00:00+00', 'group', 'L', 3, 'Hard Rock Stadium, Miami');

-- Knockout stage placeholder matches (teams TBD after group stage)
insert into matches (home_team, away_team, home_flag, away_flag, match_date, stage, venue) values
-- Round of 32 (16 matches)
('TBD', 'TBD', '🏁', '🏁', '2026-07-06 18:00:00+00', 'round_of_32', 'AT&T Stadium, Dallas'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-06 22:00:00+00', 'round_of_32', 'NRG Stadium, Houston'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-07 18:00:00+00', 'round_of_32', 'Rose Bowl, Pasadena'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-07 22:00:00+00', 'round_of_32', 'MetLife Stadium, New York'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-08 18:00:00+00', 'round_of_32', 'SoFi Stadium, Los Angeles'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-08 22:00:00+00', 'round_of_32', 'Allegiant Stadium, Las Vegas'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-09 18:00:00+00', 'round_of_32', 'Hard Rock Stadium, Miami'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-09 22:00:00+00', 'round_of_32', 'Levi''s Stadium, San Jose'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-10 18:00:00+00', 'round_of_32', 'Lumen Field, Seattle'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-10 22:00:00+00', 'round_of_32', 'Arrowhead Stadium, Kansas City'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-11 18:00:00+00', 'round_of_32', 'Gillette Stadium, Boston'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-11 22:00:00+00', 'round_of_32', 'Lincoln Financial Field, Philadelphia'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-12 18:00:00+00', 'round_of_32', 'BC Place, Vancouver'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-12 22:00:00+00', 'round_of_32', 'BMO Field, Toronto'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-13 18:00:00+00', 'round_of_32', 'Stade Olympique, Montreal'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-13 22:00:00+00', 'round_of_32', 'Estadio Azteca, Mexico City'),
-- Round of 16 (8 matches)
('TBD', 'TBD', '🏁', '🏁', '2026-07-15 18:00:00+00', 'round_of_16', 'MetLife Stadium, New York'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-15 22:00:00+00', 'round_of_16', 'SoFi Stadium, Los Angeles'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-16 18:00:00+00', 'round_of_16', 'AT&T Stadium, Dallas'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-16 22:00:00+00', 'round_of_16', 'NRG Stadium, Houston'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-17 18:00:00+00', 'round_of_16', 'Rose Bowl, Pasadena'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-17 22:00:00+00', 'round_of_16', 'Hard Rock Stadium, Miami'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-18 18:00:00+00', 'round_of_16', 'Levi''s Stadium, San Jose'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-18 22:00:00+00', 'round_of_16', 'Allegiant Stadium, Las Vegas'),
-- Quarterfinals (4 matches)
('TBD', 'TBD', '🏁', '🏁', '2026-07-21 18:00:00+00', 'quarter', 'MetLife Stadium, New York'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-21 22:00:00+00', 'quarter', 'SoFi Stadium, Los Angeles'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-22 18:00:00+00', 'quarter', 'AT&T Stadium, Dallas'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-22 22:00:00+00', 'quarter', 'Hard Rock Stadium, Miami'),
-- Semifinals (2 matches)
('TBD', 'TBD', '🏁', '🏁', '2026-07-25 22:00:00+00', 'semi', 'MetLife Stadium, New York'),
('TBD', 'TBD', '🏁', '🏁', '2026-07-26 22:00:00+00', 'semi', 'SoFi Stadium, Los Angeles'),
-- Third place
('TBD', 'TBD', '🏁', '🏁', '2026-07-29 19:00:00+00', 'third_place', 'AT&T Stadium, Dallas'),
-- Final
('TBD', 'TBD', '🏁', '🏁', '2026-07-30 19:00:00+00', 'final', 'MetLife Stadium, New York');
