-- À exécuter dans Supabase > SQL Editor.
-- ATTENTION : supprime l'ancienne table `collection` (version précédente) et ses données.
drop table if exists public.collection;

-- Catalogue d'artistes (cache Last.fm). Aucune policy : accessible uniquement via la service role (serveur).
create table if not exists public.artists (
  id         text primary key,
  name       text not null,
  listeners  bigint not null default 0,
  playcount  bigint,
  rarity     text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  tags       text[] not null default '{}',
  bio        text,
  url        text,
  image      text,
  detailed   boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists artists_rarity_idx on public.artists (rarity);
alter table public.artists enable row level security;

-- Collection : lecture de ses propres cartes seulement. Aucune écriture possible depuis le navigateur.
create table public.collection (
  user_id    uuid not null references auth.users on delete cascade,
  artist_id  text not null references public.artists (id),
  copies     int  not null default 1 check (copies > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);
alter table public.collection enable row level security;
create policy "lecture de ses cartes" on public.collection for select using (auth.uid() = user_id);

create table if not exists public.player_state (
  user_id         uuid primary key references auth.users on delete cascade,
  last_booster_at timestamptz not null default now()
);
alter table public.player_state enable row level security;

-- Ajout atomique de cartes (renvoie le nombre d'exemplaires et si la carte est nouvelle)
create or replace function public.grant_cards(p_user uuid, p_ids text[])
returns table (artist_id text, copies int, is_new boolean)
language sql security definer set search_path = public as $$
  insert into public.collection as c (user_id, artist_id, copies)
  select p_user, unnest(p_ids), 1
  on conflict (user_id, artist_id) do update set copies = c.copies + 1, updated_at = now()
  returning c.artist_id, c.copies, (xmax = 0) as is_new;
$$;

-- Délai entre deux boosters (atomique). Renvoie false si le délai n'est pas écoulé.
create or replace function public.claim_booster_slot(p_user uuid, p_cooldown int)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into public.player_state as s (user_id, last_booster_at) values (p_user, now())
  on conflict (user_id) do update set last_booster_at = now()
    where s.last_booster_at <= now() - make_interval(secs => p_cooldown);
  return found;
end;
$$;

revoke all on function public.grant_cards(uuid, text[]) from public, anon, authenticated;
revoke all on function public.claim_booster_slot(uuid, int) from public, anon, authenticated;
grant execute on function public.grant_cards(uuid, text[]) to service_role;
grant execute on function public.claim_booster_slot(uuid, int) to service_role;
