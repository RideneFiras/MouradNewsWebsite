-- El Borj — 16 scheduled jobs (pg_cron) and optional cache revalidation (pg_net)

-- Optional: lets the database ask the site to refresh its cache right after a
-- scheduled article goes live. Fill it in with supabase/APPLY.md step 8; while it
-- is empty, pages simply refresh within 60 seconds.
create table private.app_config (
  key text primary key,
  value text not null
);
revoke all on private.app_config from public, anon, authenticated;

create or replace function public.publish_scheduled()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
  url text;
  secret text;
begin
  update public.articles
     set status = 'published',
         published_at = scheduled_for,
         first_published_at = coalesce(first_published_at, scheduled_for),
         scheduled_for = null
   where status = 'scheduled' and scheduled_for <= now();
  get diagnostics n = row_count;

  if n > 0 then
    select value into url from private.app_config where key = 'revalidate_url';
    select value into secret from private.app_config where key = 'revalidate_secret';
    if url is not null and secret is not null then
      begin
        perform net.http_post(
          url := url,
          body := jsonb_build_object('tags', jsonb_build_array('articles')),
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-revalidate-secret', secret)
        );
      exception when others then
        null; -- revalidation is best effort; time-based revalidation still applies
      end;
    end if;
  end if;
  return n;
end;
$$;

create or replace function public.expire_breaking()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.articles set is_breaking = false
   where is_breaking and breaking_until < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.publish_scheduled(), public.expire_breaking() from public, anon, authenticated;
grant execute on function public.publish_scheduled(), public.expire_breaking() to service_role;

-- Schedules are in UTC. Tunisia is UTC+1 all year (no DST), so 02:15 Africa/Tunis = 01:15 UTC.
select cron.schedule('publish_scheduled', '* * * * *', $$select public.publish_scheduled()$$);
select cron.schedule('expire_breaking', '*/5 * * * *', $$select public.expire_breaking()$$);
select cron.schedule('rollup_hourly', '5 * * * *', $$select public.rollup_hourly()$$);
select cron.schedule('rollup_nightly', '15 1 * * *', $$select public.rollup_nightly()$$);
select cron.schedule('rotate_salt', '5 0 1 * *', $$select public.rotate_salt()$$);
-- Keep pg_cron's own history small on the free plan.
select cron.schedule('purge_cron_history', '30 3 * * *', $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);

-- Create this month's and next month's salt right away.
select public.rotate_salt();
