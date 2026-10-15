-- À exécuter dans Supabase > SQL Editor.

-- 1. Table des films
create table if not exists public.movies (
  id           text primary key,
  title        text not null,
  release_date date,
  overview     text,
  poster       text,
  backdrop     text,
  popularity   numeric,
  vote_average numeric,
  vote_count   int4,
  rarity       text,
  created_at   timestamptz not null default now()
);
alter table public.movies enable row level security;

-- 2. Inventaire utilisateur (stocke les cartes possédées et leur snapshot)
create table if not exists public.user_inventory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  card_type   text not null default 'movie',
  card_id     text not null references public.movies (id),
  rarity      text not null,
  snapshot    jsonb not null,
  acquired_at timestamptz not null default now()
);
alter table public.user_inventory enable row level security;
create policy "lecture de son inventaire" on public.user_inventory for select using (auth.uid() = user_id);

-- 3. Suivi des claims de boosters (cooldowns)
create table if not exists public.booster_claims (
  user_id        uuid primary key references auth.users on delete cascade,
  last_opened_at timestamptz not null default now()
);
alter table public.booster_claims enable row level security;

-- 4. Fonction RPC minimale pour gérer le cooldown et renvoyer les films (laissé au code Node.js pour le hasard)
drop function if exists open_booster_for(uuid, integer, integer);

create or replace function open_booster_for(
    p_user UUID,
    p_cooldown INT,
    p_size INT
)
RETURNS SETOF movies
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_opened TIMESTAMPTZ;
BEGIN
    -- Gestion du cooldown
    SELECT last_opened_at INTO v_last_opened
    FROM booster_claims
    WHERE user_id = p_user;

    IF FOUND AND p_cooldown > 0 AND v_last_opened + (p_cooldown || ' seconds')::INTERVAL > NOW() THEN
        RAISE EXCEPTION 'cooldown active';
    END IF;

    -- Mettre à jour ou insérer le claim du booster
    INSERT INTO booster_claims (user_id, last_opened_at)
    VALUES (p_user, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET last_opened_at = NOW();

    -- On renvoie l'ensemble des films de manière neutre à Node.js
    RETURN QUERY 
    SELECT * FROM movies;
END;
$$;

-- Sécurité sur la fonction RPC
revoke all on function open_booster_for(uuid, int, int) from public, anon, authenticated;
grant execute on function open_booster_for(uuid, int, int) to service_role, authenticated;
