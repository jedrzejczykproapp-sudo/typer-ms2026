-- Add synced_at column to matches for reliable sync deduplication
ALTER TABLE matches ADD COLUMN IF NOT EXISTS synced_at timestamptz;
