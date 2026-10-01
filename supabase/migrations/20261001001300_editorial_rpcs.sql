-- El Borj — 13 editorial helpers used by the admin (all SECURITY INVOKER: RLS applies)

-- Move every article of a category to another one, then delete it (one transaction).
create or replace function public.delete_category_with_move(p_category_id uuid, p_target_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_editor_or_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if exists (select 1 from public.categories where parent_id = p_category_id) then
    raise exception 'has_children: move or delete the sub-sections first' using errcode = '23503';
  end if;
  if p_target_id is not null then
    if p_target_id = p_category_id then
      raise exception 'invalid_target' using errcode = '22023';
    end if;
    update public.articles set category_id = p_target_id where category_id = p_category_id;
    insert into public.article_categories (article_id, category_id)
      select article_id, p_target_id from public.article_categories where category_id = p_category_id
      on conflict do nothing;
    update public.homepage_sections set config = jsonb_set(config, '{category_id}', to_jsonb(p_target_id::text))
      where config ->> 'category_id' = p_category_id::text;
  end if;
  delete from public.article_categories where category_id = p_category_id;
  delete from public.categories where id = p_category_id;
end;
$$;

-- Reorder siblings: ids in their new order.
create or replace function public.reorder_categories(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_editor_or_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.categories c set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where c.id = o.id;
end;
$$;

create or replace function public.reorder_rows(p_table text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_editor_or_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_table not in ('categories', 'article_formats', 'homepage_sections', 'menu_items', 'pages') then
    raise exception 'invalid_table' using errcode = '22023';
  end if;
  execute format(
    'update public.%I t set position = o.ord from unnest($1) with ordinality as o(id, ord) where t.id = o.id',
    p_table) using p_ids;
end;
$$;

-- Merge tag "from" into tag "into": moves links, adds a redirect, deletes "from".
create or replace function public.merge_tags(p_from uuid, p_into uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  from_slug text;
  into_slug text;
begin
  if not public.is_editor_or_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_from = p_into then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  select slug into from_slug from public.tags where id = p_from;
  select slug into into_slug from public.tags where id = p_into;
  if from_slug is null or into_slug is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.article_tags (article_id, tag_id)
    select article_id, p_into from public.article_tags where tag_id = p_from
    on conflict do nothing;
  delete from public.article_tags where tag_id = p_from;
  insert into public.redirects (from_path, to_path) values
    ('/ar/topic/' || from_slug, '/ar/topic/' || into_slug),
    ('/fr/topic/' || from_slug, '/fr/topic/' || into_slug)
  on conflict (from_path) do update set to_path = excluded.to_path;
  delete from public.tags where id = p_from;
end;
$$;

-- Where is an image used? (delete is blocked while it is used)
create or replace function public.media_usage(p_media_id uuid)
returns table (kind text, ref_id uuid, label text)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'article_cover', a.id, a.title from public.articles a where a.cover_media_id = p_media_id or a.og_media_id = p_media_id
  union all
  select 'article_body', a.id, a.title from public.articles a where a.body_json::text like '%' || p_media_id::text || '%'
  union all
  select 'page_body', p.id, p.title from public.pages p where p.body_json::text like '%' || p_media_id::text || '%'
  union all
  select 'profile', p.id, p.display_name_ar from public.profiles p where p.avatar_media_id = p_media_id
  union all
  select 'tag', t.id, t.name_ar from public.tags t where t.image_media_id = p_media_id
  union all
  select 'ad_campaign', c.id, c.sponsor_name from public.ad_campaigns c
    where c.creative_desktop_media_id = p_media_id or c.creative_mobile_media_id = p_media_id
  union all
  select 'setting', null::uuid, s.key from public.site_settings s where s.value::text like '%' || p_media_id::text || '%';
$$;

-- Category article counts (incl. drafts) for the admin tree.
create or replace function public.category_article_counts()
returns table (category_id uuid, n bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select category_id, count(*) from public.articles group by category_id;
$$;

revoke all on function public.delete_category_with_move(uuid, uuid), public.reorder_categories(uuid[]),
  public.reorder_rows(text, uuid[]), public.merge_tags(uuid, uuid), public.media_usage(uuid),
  public.category_article_counts() from public, anon;
grant execute on function public.delete_category_with_move(uuid, uuid), public.reorder_categories(uuid[]),
  public.reorder_rows(text, uuid[]), public.merge_tags(uuid, uuid), public.media_usage(uuid),
  public.category_article_counts() to authenticated;
