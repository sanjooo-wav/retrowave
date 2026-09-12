create table if not exists public.retrowave_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 80),
  tracks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.retrowave_playlists enable row level security;
create policy "Owners can view their Retrowave playlists" on public.retrowave_playlists for select using (auth.uid() = user_id);
create policy "Owners can create Retrowave playlists" on public.retrowave_playlists for insert with check (auth.uid() = user_id);
create policy "Owners can update their Retrowave playlists" on public.retrowave_playlists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owners can delete their Retrowave playlists" on public.retrowave_playlists for delete using (auth.uid() = user_id);