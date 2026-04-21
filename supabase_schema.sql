-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists user_data (
  id text primary key default 'default',
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Allow all operations without authentication
alter table user_data enable row level security;

create policy "allow_all" on user_data
  for all
  using (true)
  with check (true);
