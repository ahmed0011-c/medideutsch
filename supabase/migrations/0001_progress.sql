-- Documentation only. The app does not connect to Supabase until the env vars
-- in .env.local.example are set and the store in lib/storage.ts is implemented.
-- Apply this in the Supabase SQL editor when you are ready.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  step_index int not null default 0,
  points jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

create table if not exists word_seen (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  glossary_key text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, lesson_id, glossary_key)
);

alter table profiles enable row level security;
alter table lesson_progress enable row level security;
alter table word_seen enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own lesson progress" on lesson_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own words" on word_seen
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
