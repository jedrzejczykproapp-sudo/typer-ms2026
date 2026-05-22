-- Dodaj ON DELETE CASCADE do kluczy obcych grup
-- Dzięki temu usunięcie grupy automatycznie usuwa members i predictions
-- Uruchom w Supabase SQL Editor (jednorazowo)

-- group_members.group_id → groups.id
ALTER TABLE group_members
  DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;
ALTER TABLE group_members
  ADD CONSTRAINT group_members_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- predictions.group_id → groups.id
ALTER TABLE predictions
  DROP CONSTRAINT IF EXISTS predictions_group_id_fkey;
ALTER TABLE predictions
  ADD CONSTRAINT predictions_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
