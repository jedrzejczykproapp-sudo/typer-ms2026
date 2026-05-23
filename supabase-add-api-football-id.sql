-- Cache API-Football fixture ID so we don't re-lookup on every sync
ALTER TABLE matches ADD COLUMN IF NOT EXISTS api_football_id integer;
