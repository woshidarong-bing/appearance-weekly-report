create extension if not exists pgcrypto;

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_id text not null unique,
  period_start date not null,
  period_end date not null,
  title text not null default '外观小组周工作汇报',
  report_data jsonb not null default '{"results":[],"issues":[],"nextWeek":[],"risks":[]}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weekly_reports enable row level security;

drop policy if exists "published reports are public" on public.weekly_reports;
drop policy if exists "reports can be read without login" on public.weekly_reports;
create policy "reports can be read without login"
  on public.weekly_reports for select
  to anon, authenticated
  using (true);

drop policy if exists "editors can insert reports" on public.weekly_reports;
drop policy if exists "reports can be created without login" on public.weekly_reports;
create policy "reports can be created without login"
  on public.weekly_reports for insert
  to anon, authenticated
  with check (true);

drop policy if exists "editors can update reports" on public.weekly_reports;
drop policy if exists "reports can be updated without login" on public.weekly_reports;
create policy "reports can be updated without login"
  on public.weekly_reports for update
  to anon, authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
revoke all on table public.weekly_reports from anon, authenticated;
grant select, insert, update on table public.weekly_reports to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists weekly_reports_set_updated_at on public.weekly_reports;
create trigger weekly_reports_set_updated_at
before update on public.weekly_reports
for each row execute function public.set_updated_at();
