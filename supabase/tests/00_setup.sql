-- Shared test helpers, created inside each test transaction (rolled back at the end).
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create or replace function tests.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FAIL: %', msg;
  end if;
  raise notice 'ok - %', msg;
end $$;

-- Runs a statement and returns the number of rows it affected.
create or replace function tests.affected(stmt text) returns int language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end $$;

-- Expects a statement to fail (permission denied, RLS violation, guard trigger, ...).
create or replace function tests.fails(stmt text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok - % (refused: %)', msg, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % (statement succeeded: %)', msg, stmt;
end $$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

create or replace function tests.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

-- Start from an empty newsroom (everything here is rolled back after the file), so the
-- tests give the same result on a fresh database and on one with demo content.
delete from public.articles;
delete from public.contact_messages;
delete from public.social_stats;
delete from auth.users;

-- Staff users (ids are fixed so tests can refer to them).
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '{"display_name":"مدير"}', now(), now(), '', '', '', ''),
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor@test.local', '{"display_name":"محرر"}', now(), now(), '', '', '', ''),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'author1@test.local', '{"display_name":"كاتب أول"}', now(), now(), '', '', '', ''),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'author2@test.local', '{"display_name":"كاتب ثان"}', now(), now(), '', '', '', '');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000a1';
update public.profiles set role = 'editor' where id = '00000000-0000-4000-8000-0000000000e1';
