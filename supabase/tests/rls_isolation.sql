-- =============================================================================
-- Test d'isolation A/B (docs/securite.md §2 « Test obligatoire »).
-- À lancer après la migration, sur la base locale :
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/rls_isolation.sql
-- Tout se passe dans une transaction annulée à la fin : aucune donnée ne reste.
-- Le script s'arrête sur la première assertion fausse (exception).
-- =============================================================================
begin;

-- Deux utilisateurs (le trigger crée leur profil).
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', '{"display_name":"A"}'),
  ('00000000-0000-4000-8000-00000000000b', '{}');

do $$ begin
  assert (select count(*) from public.profiles
          where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b')) = 2,
         'profils non créés à l''inscription';
end $$;

-- ---------------------------------------------------------------- A crée tout
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

insert into public.goals (id, title, domain) values ('10000000-0000-4000-8000-000000000001', 'Courir 5 km', 'sante');
insert into public.cycles (id, goal_id, week_start) values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '2026-11-23');
insert into public.planned_actions (id, cycle_id, label, target_count, days) values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Courir 20 min', 3, '{1,3,5}');
insert into public.action_logs (action_id, done_on) values ('30000000-0000-4000-8000-000000000001', '2026-11-24');
insert into public.markers (id, goal_id, name, unit, target, aggregation) values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Distance', 'km', 5, 'sum');
insert into public.marker_measurements (marker_id, value) values ('40000000-0000-4000-8000-000000000001', 2.5);
insert into public.weekly_reviews (id, cycle_id, what_worked, verdict) values ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Le matin', 'bloque');
insert into public.blocker_analyses (id, goal_id, review_id, problem) values ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Pas couru');
insert into public.blocker_whys (analysis_id, position, answer) values ('60000000-0000-4000-8000-000000000001', 1, 'Fatigue');
insert into public.blocker_causes (analysis_id, family, label, weight) values ('60000000-0000-4000-8000-000000000001', 'temps', 'Réunions tardives', 4);
insert into public.lessons (goal_id, content) values ('10000000-0000-4000-8000-000000000001', 'Le matin, ça marche');
insert into public.recipes (goal_id, title, steps) values ('10000000-0000-4000-8000-000000000001', 'Course du matin', array['Tenue prête la veille', 'Réveil 6 h 30']);

do $$ begin
  assert (select user_id from public.goals limit 1) = '00000000-0000-4000-8000-00000000000a', 'user_id par défaut ≠ auth.uid()';
  assert (select count(*) from jsonb_object_keys(public.export_my_data())) = 14, 'export incomplet';
end $$;

-- ---------------------------------------------------------------- B attaque
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

do $$
declare
  t text;
  n integer;
begin
  -- 1. B ne voit rien
  foreach t in array array['goals','cycles','planned_actions','action_logs','markers','marker_measurements',
                           'weekly_reviews','blocker_analyses','blocker_whys','blocker_causes','lessons','recipes'] loop
    execute format('select count(*) from public.%I', t) into n;
    assert n = 0, format('B voit %s ligne(s) de %s', n, t);
    -- 2. B ne modifie ni ne supprime rien
    execute format('update public.%I set created_at = created_at', t);
    get diagnostics n = row_count;
    assert n = 0, format('B a modifié %s', t);
    execute format('delete from public.%I', t);
    get diagnostics n = row_count;
    assert n = 0, format('B a supprimé dans %s', t);
  end loop;
  select count(*) into n from public.profiles;
  assert n = 1, 'B voit d''autres profils';

  -- 3. B ne peut pas écrire au nom de A (RLS)
  begin
    insert into public.goals (user_id, title) values ('00000000-0000-4000-8000-00000000000a', 'usurpation');
    raise exception 'ÉCHEC : insert avec user_id de A accepté';
  exception when insufficient_privilege then null;
  end;

  -- 4. B ne peut pas rattacher ses lignes aux objets de A (clé composite)
  begin
    insert into public.cycles (goal_id, week_start) values ('10000000-0000-4000-8000-000000000001', '2026-11-30');
    raise exception 'ÉCHEC : cycle rattaché à l''objectif de A';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.lessons (goal_id, content) values ('10000000-0000-4000-8000-000000000001', 'vol');
    raise exception 'ÉCHEC : leçon rattachée à l''objectif de A';
  exception when foreign_key_violation then null;
  end;

  -- 5. B n'a pas accès aux fonctions internes
  begin
    perform private.delete_user_account('00000000-0000-4000-8000-00000000000a');
    raise exception 'ÉCHEC : private.delete_user_account accessible';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- anon
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.goals;
    raise exception 'ÉCHEC : anon lit goals';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- suppression
reset role;
do $$ begin
  assert private.delete_user_account('00000000-0000-4000-8000-00000000000a'), 'suppression de A échouée';
  assert not exists (select 1 from public.goals where user_id = '00000000-0000-4000-8000-00000000000a'), 'données de A restantes';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-00000000000a'), 'profil de A restant';
  assert exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-00000000000b'), 'profil de B supprimé à tort';
end $$;

select 'rls_isolation : OK' as resultat;
rollback;
