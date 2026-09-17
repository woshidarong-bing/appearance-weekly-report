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
create policy "published reports are public"
  on public.weekly_reports for select
  to anon, authenticated
  using (status = 'published' or auth.role() = 'authenticated');

drop policy if exists "editors can insert reports" on public.weekly_reports;
create policy "editors can insert reports"
  on public.weekly_reports for insert
  to authenticated
  with check (true);

drop policy if exists "editors can update reports" on public.weekly_reports;
create policy "editors can update reports"
  on public.weekly_reports for update
  to authenticated
  using (true)
  with check (true);

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
