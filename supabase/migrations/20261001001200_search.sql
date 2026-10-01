-- El Borj — 12 search
-- Full text on normalize_ar()'d title/subtitle/body ('simple' config), with a
-- trigram fallback on the title for short or misspelled queries.

create or replace function public.search_articles(
  q text,
  lang public.content_language default null,
  "limit" int default 20,
  "offset" int default 0,
  category uuid default null,
  since timestamptz default null
)
returns table (id uuid, public_id bigint, rank real, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with nq as (
    select public.normalize_ar(btrim(coalesce(q, ''))) as t
  ), terms as (
    select string_agg(quote_literal(w) || ':*', ' & ') as tsq
    from nq, regexp_split_to_table(regexp_replace(nq.t, '[''"&|!():*<>\\,.؛،؟?«»]+', ' ', 'g'), '\s+') as w
    where length(w) > 0
  ), matches as (
    select a.id, a.public_id,
           greatest(
             case when terms.tsq is not null then ts_rank(a.search_vector, to_tsquery('simple', terms.tsq)) else 0 end,
             extensions.similarity(public.normalize_ar(a.title), nq.t) * 0.5
           )::real as rank,
           a.published_at
    from public.articles a, nq, terms
    where a.status = 'published' and a.published_at <= now()
      and length(nq.t) > 0
      and (lang is null or a.language = lang)
      and (category is null or a.category_id = category
           or a.category_id in (select c.id from public.categories c where c.parent_id = category))
      and (since is null or a.published_at >= since)
      and (
        (terms.tsq is not null and a.search_vector @@ to_tsquery('simple', terms.tsq))
        or extensions.similarity(public.normalize_ar(a.title), nq.t) > 0.3
        or (length(nq.t) >= 3 and public.normalize_ar(a.title) like '%' || nq.t || '%')
      )
  )
  select m.id, m.public_id, m.rank, count(*) over ()
  from matches m
  order by m.rank desc, m.published_at desc
  limit least(greatest("limit", 1), 50) offset greatest("offset", 0);
$$;

grant execute on function public.search_articles(text, public.content_language, int, int, uuid, timestamptz) to anon, authenticated;
