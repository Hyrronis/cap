-- =============================================================================
-- Cap : schéma initial
-- Migration : 20261125000000_init.sql
--
-- Principes :
--   * Toutes les données appartiennent à un utilisateur (auth.users). Chaque
--     table porte un user_id (défaut auth.uid()) avec ON DELETE CASCADE.
--   * Les tables enfants référencent leur parent par une clé étrangère
--     composite (parent_id, user_id) : impossible de rattacher une ligne à un
--     objet appartenant à quelqu'un d'autre, même en connaissant son UUID.
--   * RLS activé partout ; politiques limitées à (select auth.uid()).
--   * Longueurs maximales alignées sur docs/securite.md §4 (mêmes bornes que zod).
--   * Fonctions security definer : uniquement dans le schéma « private »,
--     non exposé par l'API (docs/securite.md §2).
--   * Valeurs « métier » en text + CHECK (plus simples à faire évoluer que des
--     types ENUM). Codes en français sans accent, alignés sur l'interface.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Schéma privé (non exposé par PostgREST) pour les fonctions internes
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Met à jour updated_at à chaque UPDATE.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles : 1 ligne par utilisateur, créée automatiquement à l'inscription
-- -----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (display_name is null or char_length(display_name) between 1 and 80),
  timezone      text not null default 'Europe/Paris' check (char_length(timezone) between 1 and 64),
  locale        text not null default 'fr' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.profiles is 'Profil applicatif, lié 1-1 à auth.users.';

-- -----------------------------------------------------------------------------
-- goals : objectifs (Viser)
-- -----------------------------------------------------------------------------
create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  icon          text check (icon is null or char_length(icon) <= 32), -- emoji ou mot-clé
  why           text check (why is null or char_length(why) <= 1000), -- = « Pourquoi » du QQOQCCP
  domain        text not null default 'autre'
                check (domain in ('sante', 'argent', 'travail', 'relations', 'autre')),
  status        text not null default 'actif'
                check (status in ('actif', 'atteint', 'en_pause', 'abandonne')),
  -- SMART
  smart_specific    text check (smart_specific    is null or char_length(smart_specific)    <= 1000),
  smart_measurable  text check (smart_measurable  is null or char_length(smart_measurable)  <= 1000),
  smart_achievable  text check (smart_achievable  is null or char_length(smart_achievable)  <= 1000),
  smart_relevant    text check (smart_relevant    is null or char_length(smart_relevant)    <= 1000),
  smart_time_bound  text check (smart_time_bound  is null or char_length(smart_time_bound)  <= 1000),
  -- QQOQCCP (le « Pourquoi » est porté par la colonne why)
  qq_what       text check (qq_what     is null or char_length(qq_what)     <= 1000), -- Quoi
  qq_who        text check (qq_who      is null or char_length(qq_who)      <= 1000), -- Qui
  qq_where      text check (qq_where    is null or char_length(qq_where)    <= 1000), -- Où
  qq_when       text check (qq_when     is null or char_length(qq_when)     <= 1000), -- Quand
  qq_how        text check (qq_how      is null or char_length(qq_how)      <= 1000), -- Comment
  qq_how_much   text check (qq_how_much is null or char_length(qq_how_much) <= 1000), -- Combien
  -- Dates
  start_date    date not null default current_date,
  target_date   date,
  achieved_on   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint goals_target_after_start  check (target_date is null or target_date >= start_date),
  constraint goals_achieved_after_start check (achieved_on is null or achieved_on >= start_date),
  constraint goals_achieved_only_when_reached check (achieved_on is null or status = 'atteint'),
  constraint goals_id_user_unique unique (id, user_id)
);
comment on table public.goals is 'Objectifs de vie (étape « Viser »).';

create index goals_user_status_idx on public.goals (user_id, status);

-- -----------------------------------------------------------------------------
-- cycles : une semaine de travail sur un objectif (Planifier → Ajuster)
-- -----------------------------------------------------------------------------
create table public.cycles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id       uuid not null,
  week_start    date not null check (extract(isodow from week_start) = 1), -- toujours un lundi
  status        text not null default 'en_cours'
                check (status in ('en_cours', 'termine')),
  focus         text check (focus is null or char_length(focus) <= 500), -- intention de la semaine
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint cycles_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade,
  constraint cycles_goal_week_unique unique (goal_id, week_start),
  constraint cycles_id_user_unique unique (id, user_id)
);
comment on table public.cycles is 'Semaine (cycle hebdomadaire) d''un objectif ; week_start = lundi.';

create index cycles_user_week_idx on public.cycles (user_id, week_start desc);
-- (goal_id, week_start) est déjà indexé par la contrainte unique.

-- -----------------------------------------------------------------------------
-- planned_actions : 1 à 3 actions prévues par cycle (limite gérée par l'app)
-- -----------------------------------------------------------------------------
create table public.planned_actions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cycle_id         uuid not null,
  label            text not null check (char_length(btrim(label)) between 1 and 120),
  target_count     smallint not null default 1 check (target_count between 1 and 21), -- fois prévues dans la semaine
  days             smallint[] check (                                    -- jours suggérés, 1 = lundi … 7 = dimanche
                     days is null or (cardinality(days) <= 7 and days <@ array[1,2,3,4,5,6,7]::smallint[])
                   ),
  position         smallint not null default 0 check (position between 0 and 99),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint planned_actions_cycle_fk foreign key (cycle_id, user_id)
    references public.cycles (id, user_id) on delete cascade,
  constraint planned_actions_id_user_unique unique (id, user_id)
);
comment on table public.planned_actions is 'Actions planifiées pour une semaine (étape « Planifier »).';

create index planned_actions_cycle_idx on public.planned_actions (cycle_id, position);
create index planned_actions_user_idx  on public.planned_actions (user_id);

-- -----------------------------------------------------------------------------
-- action_logs : une coche = une action faite un jour donné (Agir)
-- -----------------------------------------------------------------------------
create table public.action_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  action_id   uuid not null,
  done_on     date not null default current_date,
  note        text check (note is null or char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  constraint action_logs_action_fk foreign key (action_id, user_id)
    references public.planned_actions (id, user_id) on delete cascade,
  constraint action_logs_action_day_unique unique (action_id, done_on)
);
comment on table public.action_logs is 'Journal des actions cochées (au plus une coche par action et par jour).';

create index action_logs_user_day_idx on public.action_logs (user_id, done_on desc);

-- -----------------------------------------------------------------------------
-- markers : repères chiffrés d'un objectif
-- -----------------------------------------------------------------------------
create table public.markers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid not null,
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  unit        text check (unit is null or char_length(unit) <= 20),
  baseline    numeric(12, 2) check (baseline is null or baseline between -1e9 and 1e9), -- valeur de départ
  target      numeric(12, 2) check (target   is null or target   between -1e9 and 1e9), -- valeur visée
  direction   text not null default 'plus_haut'
              check (direction in ('plus_haut', 'plus_bas')),
  -- Regroupement des saisies d'une semaine : somme, moyenne ou dernière valeur.
  aggregation text not null default 'sum'
              check (aggregation in ('sum', 'avg', 'last')),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint markers_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade,
  constraint markers_id_user_unique unique (id, user_id)
);
comment on table public.markers is 'Repères chiffrés d''un objectif ; direction = sens dans lequel « c''est mieux ».';

create index markers_goal_idx on public.markers (goal_id);
create index markers_user_idx on public.markers (user_id);

-- -----------------------------------------------------------------------------
-- marker_measurements : valeurs notées pour un repère
-- -----------------------------------------------------------------------------
create table public.marker_measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  marker_id    uuid not null,
  value        numeric(12, 2) not null check (value between -1e9 and 1e9),
  measured_on  date not null default current_date,
  created_at   timestamptz not null default now(),
  constraint marker_measurements_marker_fk foreign key (marker_id, user_id)
    references public.markers (id, user_id) on delete cascade
);
comment on table public.marker_measurements is 'Mesures d''un repère (plusieurs possibles le même jour).';

create index marker_measurements_marker_day_idx on public.marker_measurements (marker_id, measured_on);
create index marker_measurements_user_idx       on public.marker_measurements (user_id);

-- -----------------------------------------------------------------------------
-- weekly_reviews : bilan de la semaine (1 par cycle)
-- -----------------------------------------------------------------------------
create table public.weekly_reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cycle_id      uuid not null,
  what_worked   text check (what_worked  is null or char_length(what_worked)  <= 1000),
  what_blocked  text check (what_blocked is null or char_length(what_blocked) <= 1000),
  what_i_change text check (what_i_change is null or char_length(what_i_change) <= 1000),
  verdict       text not null check (verdict in ('avance', 'bloque')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint weekly_reviews_cycle_fk foreign key (cycle_id, user_id)
    references public.cycles (id, user_id) on delete cascade,
  constraint weekly_reviews_cycle_unique unique (cycle_id),
  constraint weekly_reviews_id_user_unique unique (id, user_id)
);
comment on table public.weekly_reviews is 'Bilan hebdo : 3 réponses + verdict (avance / bloque).';

create index weekly_reviews_user_idx on public.weekly_reviews (user_id);

-- -----------------------------------------------------------------------------
-- blocker_analyses : « Creuser la cause » d'un objectif qui bloque
-- -----------------------------------------------------------------------------
create table public.blocker_analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid not null,
  review_id   uuid, -- bilan « bloque » à l'origine de l'analyse (facultatif)
  problem     text not null check (char_length(btrim(problem)) between 1 and 1000),
  root_cause  text check (root_cause is null or char_length(root_cause) <= 1000),
  decision    text check (decision   is null or char_length(decision)   <= 1000), -- ce que je change
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint blocker_analyses_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade,
  constraint blocker_analyses_review_fk foreign key (review_id, user_id)
    references public.weekly_reviews (id, user_id) on delete set null (review_id),
  constraint blocker_analyses_id_user_unique unique (id, user_id)
);
comment on table public.blocker_analyses is 'Analyse d''un blocage : 5 pourquoi + tour des causes + ce qui pèse le plus.';

create index blocker_analyses_goal_idx  on public.blocker_analyses (goal_id, created_at desc);
create index blocker_analyses_user_idx  on public.blocker_analyses (user_id);
create index blocker_analyses_review_idx on public.blocker_analyses (review_id);

-- Les « 5 pourquoi », dans l'ordre (position 1 à 5).
create table public.blocker_whys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  analysis_id  uuid not null,
  position     smallint not null check (position between 1 and 5),
  answer       text not null check (char_length(btrim(answer)) between 1 and 1000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint blocker_whys_analysis_fk foreign key (analysis_id, user_id)
    references public.blocker_analyses (id, user_id) on delete cascade,
  constraint blocker_whys_position_unique unique (analysis_id, position)
);
comment on table public.blocker_whys is 'Réponses successives aux « pourquoi ? » (au plus 5, ordonnées).';

create index blocker_whys_user_idx on public.blocker_whys (user_id);

-- Le « tour des causes » (5 familles) avec un poids pour « ce qui pèse le plus ».
create table public.blocker_causes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  analysis_id  uuid not null,
  family       text not null
               check (family in ('moi', 'temps', 'environnement', 'moyens', 'methode')),
  label        text not null check (char_length(btrim(label)) between 1 and 120),
  weight       smallint not null default 1 check (weight between 1 and 5),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint blocker_causes_analysis_fk foreign key (analysis_id, user_id)
    references public.blocker_analyses (id, user_id) on delete cascade
);
comment on table public.blocker_causes is 'Causes classées par famille, pondérées de 1 (léger) à 5 (pèse lourd).';

create index blocker_causes_analysis_idx on public.blocker_causes (analysis_id, weight desc);
create index blocker_causes_user_idx     on public.blocker_causes (user_id);

-- -----------------------------------------------------------------------------
-- lessons : « Ce que j'en retiens » (REX)
-- -----------------------------------------------------------------------------
create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid,
  content     text not null check (char_length(btrim(content)) between 1 and 1000),
  position    smallint not null default 0 check (position between 0 and 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- goal_id facultatif : la leçon survit à l'objectif. FK composite pour
  -- garantir le même propriétaire ; SET NULL (goal_id) ne vide que goal_id (PG 15+).
  constraint lessons_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id)
);
comment on table public.lessons is 'Leçons tirées d''un objectif ; conservées si l''objectif est supprimé.';

create index lessons_user_idx on public.lessons (user_id, created_at desc);
create index lessons_goal_idx on public.lessons (goal_id);

-- -----------------------------------------------------------------------------
-- recipes : « Ma recette qui marche » (routine réutilisable)
-- -----------------------------------------------------------------------------
create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  trigger_cue text check (trigger_cue is null or char_length(trigger_cue) <= 1000), -- « Quand… »
  steps       text[] not null default '{}'
              check (
                cardinality(steps) <= 20
                and array_position(steps, null) is null
                and char_length(array_to_string(steps, '')) <= 2000  -- recette : 2 000 car. au total
              ),
  frequency   text check (frequency is null or char_length(frequency) <= 100),
  domain      text check (domain is null or domain in ('sante', 'argent', 'travail', 'relations', 'autre')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint recipes_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id)
);
comment on table public.recipes is 'Routines qui ont marché, réutilisables pour un autre objectif.';

create index recipes_user_idx on public.recipes (user_id, created_at desc);
create index recipes_goal_idx on public.recipes (goal_id);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'goals', 'cycles', 'planned_actions', 'markers',
    'weekly_reviews', 'blocker_analyses', 'blocker_whys', 'blocker_causes',
    'lessons', 'recipes'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function private.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS : activé sur toutes les tables, accès limité au propriétaire
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'goals', 'cycles', 'planned_actions', 'action_logs', 'markers',
    'marker_measurements', 'weekly_reviews', 'blocker_analyses',
    'blocker_whys', 'blocker_causes', 'lessons', 'recipes'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)', t || '_delete_own', t);
  end loop;
end;
$$;

-- Le rôle anon n'a rien à faire sur ces tables (défense en profondeur :
-- RLS bloque déjà tout, faute de politique pour anon).
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'goals', 'cycles', 'planned_actions', 'action_logs', 'markers',
    'marker_measurements', 'weekly_reviews', 'blocker_analyses',
    'blocker_whys', 'blocker_causes', 'lessons', 'recipes'
  ] loop
    execute format('revoke all on table public.%I from anon', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Création du profil à l'inscription
-- -----------------------------------------------------------------------------
-- security definer justifié : le trigger tourne pendant l'inscription (rôle
-- supabase_auth_admin) et doit écrire dans public.profiles.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- RGPD : export et suppression du compte
-- -----------------------------------------------------------------------------

-- Export de toutes mes données (security invoker : RLS s'applique).
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at',         now(),
    'profile',             (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'goals',               coalesce((select jsonb_agg(to_jsonb(x)) from public.goals x), '[]'),
    'cycles',              coalesce((select jsonb_agg(to_jsonb(x)) from public.cycles x), '[]'),
    'planned_actions',     coalesce((select jsonb_agg(to_jsonb(x)) from public.planned_actions x), '[]'),
    'action_logs',         coalesce((select jsonb_agg(to_jsonb(x)) from public.action_logs x), '[]'),
    'markers',             coalesce((select jsonb_agg(to_jsonb(x)) from public.markers x), '[]'),
    'marker_measurements', coalesce((select jsonb_agg(to_jsonb(x)) from public.marker_measurements x), '[]'),
    'weekly_reviews',      coalesce((select jsonb_agg(to_jsonb(x)) from public.weekly_reviews x), '[]'),
    'blocker_analyses',    coalesce((select jsonb_agg(to_jsonb(x)) from public.blocker_analyses x), '[]'),
    'blocker_whys',        coalesce((select jsonb_agg(to_jsonb(x)) from public.blocker_whys x), '[]'),
    'blocker_causes',      coalesce((select jsonb_agg(to_jsonb(x)) from public.blocker_causes x), '[]'),
    'lessons',             coalesce((select jsonb_agg(to_jsonb(x)) from public.lessons x), '[]'),
    'recipes',             coalesce((select jsonb_agg(to_jsonb(x)) from public.recipes x), '[]')
  );
$$;
revoke execute on function public.export_my_data() from public, anon;
grant  execute on function public.export_my_data() to authenticated;

-- Suppression du compte.
-- Chemin principal (docs/securite.md §8) : Server Action → getUser() →
-- auth.admin.deleteUser(user.id) avec la clé secrète. Le schéma garantit que
-- tout part en cascade depuis auth.users : aucun code applicatif à maintenir.
--
-- private.delete_user_account(uuid) sert aux tâches internes (purge des
-- comptes inactifs via pg_cron, demande RGPD traitée à la main). Elle n'est
-- pas exposée par l'API et n'est exécutable que par service_role / postgres.
-- security definer justifié : seul le propriétaire peut supprimer dans auth.users.
create or replace function private.delete_user_account(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted integer;
begin
  if target_user_id is null then
    raise exception 'target_user_id obligatoire' using errcode = '22004';
  end if;
  delete from auth.users where id = target_user_id;
  get diagnostics deleted = row_count;
  return deleted > 0;
end;
$$;
revoke execute on function private.delete_user_account(uuid) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema private to service_role;
    grant execute on function private.delete_user_account(uuid) to service_role;
  end if;
end;
$$;

commit;
