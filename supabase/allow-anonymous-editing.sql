-- Run this once in Supabase SQL Editor to allow the app to work without login.
-- Warning: anyone who knows the editor URL can read and change weekly reports.

alter table public.weekly_reports enable row level security;

drop policy if exists "published reports are public" on public.weekly_reports;
drop policy if exists "editors can insert reports" on public.weekly_reports;
drop policy if exists "editors can update reports" on public.weekly_reports;
drop policy if exists "reports can be read without login" on public.weekly_reports;
drop policy if exists "reports can be created without login" on public.weekly_reports;
drop policy if exists "reports can be updated without login" on public.weekly_reports;

create policy "reports can be read without login"
  on public.weekly_reports for select
  to anon, authenticated
  using (true);

create policy "reports can be created without login"
  on public.weekly_reports for insert
  to anon, authenticated
  with check (true);

create policy "reports can be updated without login"
  on public.weekly_reports for update
  to anon, authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
revoke all on table public.weekly_reports from anon, authenticated;
grant select, insert, update on table public.weekly_reports to anon, authenticated;
