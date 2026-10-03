-- Events calendar (أجندة) and the switch that hides the French interface from readers.
--
-- An event is a dated item on the public calendar: a festival night, a protest, a match, a
-- deadline, or a public holiday. It can link to the article that announced it; the event
-- then stays hidden until that article is public. Holidays are rows like any other
-- (kind 'holiday'); Islamic holidays are added as estimates (is_estimate) from the Hijri
-- calendar and confirmed by the editor after the official announcement.

create type public.event_kind as enum ('event', 'holiday');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  kind public.event_kind not null default 'event',
  title_ar text not null check (char_length(title_ar) between 1 and 300),
  title_fr text check (title_fr is null or char_length(title_fr) <= 300),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  start_time time,
  end_time time,
  place text check (place is null or char_length(place) <= 200),
  town_tag_id uuid references public.tags (id) on delete set null,
  article_id uuid references public.articles (id) on delete set null,
  is_estimate boolean not null default false,
  is_visible boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.events is 'Public calendar (أجندة): events and public holidays, optionally linked to an article.';
comment on column public.events.is_estimate is 'Date not confirmed yet (Islamic holidays before the official announcement).';

create index events_starts_on_idx on public.events (starts_on);
create index events_article_idx on public.events (article_id) where article_id is not null;
create index events_town_idx on public.events (town_tag_id) where town_tag_id is not null;
create index events_created_by_idx on public.events (created_by) where created_by is not null;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

-- Readers: visible events whose article (if any) is public.
create policy events_select on public.events for select to anon, authenticated
  using ((is_visible and (article_id is null or public.is_article_public(article_id))) or public.is_staff());
create policy events_write on public.events for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

-- Homepage builder: an "agenda" block (next events).
alter type public.homepage_section_type add value if not exists 'agenda';

-- Reader-facing languages. French off = no FR switch and no hreflang to /fr (the admin stays bilingual).
insert into public.site_settings (key, value, is_public)
values ('public_languages', '{"fr": false}'::jsonb, true)
on conflict (key) do nothing;
