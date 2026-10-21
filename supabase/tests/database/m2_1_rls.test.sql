-- pgTAP version of the M2.1 RLS proof, for `supabase test db` against a local stack
-- (the same checks run in CI via story-mode/src/test/supabase-rls.test.js on PGlite).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, aud, role, email, is_anonymous)
values ('00000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', null, true),
       ('00000000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', null, true);

-- Player A writes their rows
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
insert into public.profiles (id, handle) values ('00000000-0000-4000-8000-00000000000a', 'Tomato_Ann');
insert into public.cloud_gardens (user_id, schema_version, envelope)
values ('00000000-0000-4000-8000-00000000000a', 1, '{"v":1,"label":"A"}');

-- Player B writes their rows
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
insert into public.profiles (id, handle) values ('00000000-0000-4000-8000-00000000000b', 'Basil_Bob');
insert into public.cloud_gardens (user_id, schema_version, envelope)
values ('00000000-0000-4000-8000-00000000000b', 1, '{"v":1,"label":"B"}');

-- B looks at A's data
select is((select count(*)::int from public.cloud_gardens), 1, 'B sees exactly one garden');
select is((select envelope->>'label' from public.cloud_gardens), 'B', 'and it is B''s own');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-00000000000a'), 0, 'B cannot read A''s profile');
select is_empty($$ update public.cloud_gardens set envelope = '{"v":1,"label":"hacked"}', revision = 2
                   where user_id = '00000000-0000-4000-8000-00000000000a' returning 1 $$, 'B cannot update A''s garden');
select is_empty($$ delete from public.cloud_gardens where user_id = '00000000-0000-4000-8000-00000000000a' returning 1 $$, 'B cannot delete A''s garden');
select throws_ok($$ insert into public.cloud_gardens (user_id, schema_version, envelope)
                    values ('00000000-0000-4000-8000-00000000000a', 1, '{"v":1}') $$, '42501', null, 'B cannot insert as A');
select throws_ok($$ update public.profiles set handle = 'xX_4dm1n_Xx' where id = '00000000-0000-4000-8000-00000000000b' $$,
                 '22023', null, 'reserved handle rejected');
select throws_ok($$ update public.cloud_gardens set revision = 5 where user_id = '00000000-0000-4000-8000-00000000000b' $$,
                 '40001', null, 'revision must advance by one');

-- A still has their untouched garden
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select is((select envelope->>'label' from public.cloud_gardens), 'A', 'A''s garden is untouched');

-- No session at all
set local role anon;
select throws_ok($$ select * from public.cloud_gardens $$, '42501', null, 'anon has no access');

select * from finish();
rollback;
