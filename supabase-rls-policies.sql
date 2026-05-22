-- Brakujące polityki DELETE dla RLS
-- Uruchom jednorazowo w Supabase SQL Editor (Dashboard → SQL Editor)

-- Groups: creator może usunąć swoją grupę (CASCADE usuwa members i predictions)
create policy "Group creator can delete group"
    on groups for delete
    using (auth.uid() = created_by);

-- Group members: użytkownik może opuścić grupę (usunąć swój wpis)
create policy "Users can leave groups"
    on group_members for delete
    using (auth.uid() = user_id);

-- Group members: admin może usuwać innych członków
create policy "Group creator can remove members"
    on group_members for delete
    using (
        exists (
            select 1 from groups
            where groups.id = group_members.group_id
            and groups.created_by = auth.uid()
        )
    );

-- Predictions: użytkownik może usunąć własne typy
create policy "Users can delete own predictions"
    on predictions for delete
    using (auth.uid() = user_id);
