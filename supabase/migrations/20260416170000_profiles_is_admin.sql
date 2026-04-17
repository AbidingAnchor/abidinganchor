-- Admin flag: bypass username change limits and similar in app logic.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Mark founder account (by auth email). Safe if user does not exist yet (updates 0 rows).
update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and lower(trim(u.email)) = 'andrewnegron95@gmail.com';
