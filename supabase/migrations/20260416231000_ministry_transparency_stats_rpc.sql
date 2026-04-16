-- Aggregate counts for the Support page transparency dashboard (no row data exposed).
create or replace function public.get_ministry_transparency_stats()
returns table (ai_prayers_answered bigint, users_reached bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.ai_logs),
    (select count(*) from public.profiles);
$$;

revoke all on function public.get_ministry_transparency_stats() from public;
grant execute on function public.get_ministry_transparency_stats() to anon, authenticated;
