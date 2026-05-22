-- Public RPC function to fetch group preview (name + avatar) by invite code.
-- Uses SECURITY DEFINER so it works without authentication (e.g. for OG image bots).
--
-- HOW TO RUN: Paste into Supabase SQL Editor and execute.

create or replace function get_group_preview(p_code text)
returns table (name text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select name, avatar_url
  from groups
  where invite_code = upper(trim(p_code))
  limit 1;
$$;

-- Allow the anon role to call this function
grant execute on function get_group_preview(text) to anon;
