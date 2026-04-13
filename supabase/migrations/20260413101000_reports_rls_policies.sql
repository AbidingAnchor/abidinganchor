alter table public.reports enable row level security;

drop policy if exists "Users can insert reports" on public.reports;
create policy "Users can insert reports" on public.reports
for insert with check (auth.uid() = reported_by);

drop policy if exists "Admins can view reports" on public.reports;
create policy "Admins can view reports" on public.reports
for select using (auth.uid() = reported_by);
