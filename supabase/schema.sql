create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  phone text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.vocabulary_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '今日词汇',
  study_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.vocabulary_entries (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.vocabulary_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null,
  meaning text not null,
  phonetic text,
  part_of_speech text,
  synonyms text[] not null default '{}',
  example text,
  memory_tip text,
  created_at timestamptz not null default now()
);

create table if not exists public.study_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary_entries(id) on delete cascade,
  answer text not null,
  correct boolean not null,
  consecutive_correct integer not null default 0,
  status text not null default 'learning' check (status in ('new', 'learning', 'mastered')),
  answered_at timestamptz not null default now()
);

create table if not exists public.study_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null,
  energy_awarded integer not null default 20,
  created_at timestamptz not null default now(),
  primary key (user_id, study_date)
);

alter table public.profiles enable row level security;
alter table public.vocabulary_lists enable row level security;
alter table public.vocabulary_entries enable row level security;
alter table public.study_records enable row level security;
alter table public.study_days enable row level security;

create policy "profiles own data" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "lists own data" on public.vocabulary_lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "entries own data" on public.vocabulary_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "records own data" on public.study_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "days own data" on public.study_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1) || '_' || left(new.id::text, 8)),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
