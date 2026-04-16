-- Match PostgREST/JS client: single JSON object { ai_answers, users_reached }.
drop function if exists public.get_ministry_transparency_stats();

create function public.get_ministry_transparency_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'ai_answers', (select count(*) from public.ai_logs),
    'users_reached', (select count(*) from public.profiles)
  );
$$;

revoke all on function public.get_ministry_transparency_stats() from public;
grant execute on function public.get_ministry_transparency_stats() to anon, authenticated;
