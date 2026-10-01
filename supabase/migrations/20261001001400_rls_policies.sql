-- El Borj — 14 row level security
-- Roles: anon (public site), authenticated (+ profiles.role: author/editor/admin),
-- service_role (server only: analytics ingestion, ad counters, invites).

-- Enable RLS everywhere.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.article_formats enable row level security;
alter table public.tags enable row level security;
alter table public.media enable row level security;
alter table public.articles enable row level security;
alter table public.article_authors enable row level security;
alter table public.article_categories enable row level security;
alter table public.article_tags enable row level security;
alter table public.article_revisions enable row level security;
alter table public.pages enable row level security;
alter table public.menu_items enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.redirects enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.ad_slots enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_daily_stats enable row level security;
alter table public.analytics_salts enable row level security;
alter table public.pageviews_raw enable row level security;
alter table public.engagement_raw enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.analytics_daily_article enable row level security;
alter table public.analytics_monthly_uniques enable row level security;
alter table public.rollup_runs enable row level security;
alter table public.social_stats enable row level security;

-- ---------------------------------------------------------------------------
-- Statistics can't be written by any human. Remove the privileges themselves
-- (not only the policies) from every API role, admins included.
revoke all on public.analytics_salts, public.pageviews_raw, public.engagement_raw from anon, authenticated;
revoke insert, update, delete, truncate on public.analytics_daily, public.analytics_daily_article,
  public.analytics_monthly_uniques, public.rollup_runs, public.ad_daily_stats from anon, authenticated;
revoke all on public.analytics_daily, public.analytics_daily_article, public.analytics_monthly_uniques,
  public.rollup_runs, public.ad_daily_stats from anon;

-- Read-only views for the public site. Simple views are auto-updatable, so remove
-- write privileges explicitly.
revoke all on public.public_authors, public.public_ad_slots, public.active_ad_campaigns from anon, authenticated;
grant select on public.public_authors, public.public_ad_slots, public.active_ad_campaigns to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles (anon uses the public_authors view)
create policy profiles_select_staff on public.profiles for select to authenticated
  using (public.is_staff() or id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- categories / formats / tags
create policy categories_select on public.categories for select to anon, authenticated
  using (is_active or public.is_staff());
create policy categories_write on public.categories for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

create policy formats_select on public.article_formats for select to anon, authenticated
  using (is_active or public.is_staff());
create policy formats_write on public.article_formats for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

create policy tags_select on public.tags for select to anon, authenticated using (true);
create policy tags_write on public.tags for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
-- Authors can create new tags from the editor (typeahead "create new").
create policy tags_author_insert on public.tags for insert to authenticated
  with check (public.is_staff());

-- media
create policy media_select on public.media for select to anon, authenticated using (true);
create policy media_insert on public.media for insert to authenticated
  with check (public.is_editor_or_admin() or (public.is_staff() and uploaded_by = auth.uid()));
create policy media_update on public.media for update to authenticated
  using (public.is_editor_or_admin() or (public.is_staff() and uploaded_by = auth.uid()))
  with check (public.is_editor_or_admin() or (public.is_staff() and uploaded_by = auth.uid()));
create policy media_delete on public.media for delete to authenticated
  using (public.is_editor_or_admin() or (public.is_staff() and uploaded_by = auth.uid()));

-- articles
create policy articles_select on public.articles for select to anon, authenticated
  using (
    (status = 'published' and published_at <= now())
    or public.is_editor_or_admin()
    or (public.is_staff() and public.is_article_author(id))
  );
create policy articles_insert on public.articles for insert to authenticated
  with check (
    public.is_editor_or_admin()
    or (public.current_role_name() = 'author' and created_by = auth.uid() and status in ('draft', 'in_review'))
  );
create policy articles_update_editor on public.articles for update to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
create policy articles_update_author on public.articles for update to authenticated
  using (public.current_role_name() = 'author' and public.is_article_author(id) and status in ('draft', 'in_review'))
  with check (public.current_role_name() = 'author' and status in ('draft', 'in_review'));
create policy articles_delete_admin on public.articles for delete to authenticated
  using (public.is_admin());
create policy articles_delete_editor_drafts on public.articles for delete to authenticated
  using (public.current_role_name() = 'editor' and status = 'draft');

-- article join tables
create policy article_authors_select on public.article_authors for select to anon, authenticated
  using (public.is_article_public(article_id) or public.is_editor_or_admin() or public.is_article_author(article_id));
create policy article_authors_write on public.article_authors for all to authenticated
  using (public.can_edit_article(article_id)) with check (public.can_edit_article(article_id));

create policy article_categories_select on public.article_categories for select to anon, authenticated
  using (public.is_article_public(article_id) or public.is_editor_or_admin() or public.is_article_author(article_id));
create policy article_categories_write on public.article_categories for all to authenticated
  using (public.can_edit_article(article_id)) with check (public.can_edit_article(article_id));

create policy article_tags_select on public.article_tags for select to anon, authenticated
  using (public.is_article_public(article_id) or public.is_editor_or_admin() or public.is_article_author(article_id));
create policy article_tags_write on public.article_tags for all to authenticated
  using (public.can_edit_article(article_id)) with check (public.can_edit_article(article_id));

create policy article_revisions_select on public.article_revisions for select to authenticated
  using (public.is_editor_or_admin() or public.is_article_author(article_id));
create policy article_revisions_insert on public.article_revisions for insert to authenticated
  with check (public.can_edit_article(article_id));
create policy article_revisions_delete on public.article_revisions for delete to authenticated
  using (public.is_admin());

-- pages, menus, homepage, redirects
create policy pages_select on public.pages for select to anon, authenticated
  using (status = 'published' or public.is_staff());
create policy pages_write on public.pages for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

create policy menu_items_select on public.menu_items for select to anon, authenticated
  using (is_active or public.is_staff());
create policy menu_items_write on public.menu_items for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

create policy homepage_sections_select on public.homepage_sections for select to anon, authenticated
  using (is_active or public.is_staff());
create policy homepage_sections_write on public.homepage_sections for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

create policy redirects_select on public.redirects for select to anon, authenticated using (true);
create policy redirects_write on public.redirects for all to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

-- settings
create policy site_settings_select on public.site_settings for select to anon, authenticated
  using (is_public or public.is_editor_or_admin());
create policy site_settings_insert on public.site_settings for insert to authenticated
  with check (public.is_admin() or (public.is_editor_or_admin() and not public.is_sensitive_setting(key)));
create policy site_settings_update on public.site_settings for update to authenticated
  using (public.is_admin() or (public.is_editor_or_admin() and not public.is_sensitive_setting(key)))
  with check (public.is_admin() or (public.is_editor_or_admin() and not public.is_sensitive_setting(key)));
create policy site_settings_delete on public.site_settings for delete to authenticated
  using (public.is_admin());

-- contact messages: inserted by the server (service role) only
create policy contact_messages_staff on public.contact_messages for select to authenticated
  using (public.is_editor_or_admin());
create policy contact_messages_update on public.contact_messages for update to authenticated
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
create policy contact_messages_delete on public.contact_messages for delete to authenticated
  using (public.is_editor_or_admin());
revoke insert on public.contact_messages from anon, authenticated;

-- ads
create policy ad_slots_select on public.ad_slots for select to authenticated
  using (public.is_editor_or_admin());
create policy ad_slots_admin on public.ad_slots for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy ad_campaigns_select on public.ad_campaigns for select to authenticated
  using (public.is_editor_or_admin());
create policy ad_campaigns_admin on public.ad_campaigns for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy ad_daily_stats_select on public.ad_daily_stats for select to authenticated
  using (public.is_editor_or_admin());

-- analytics rollups: read-only for editors/admins (authors go through RPCs)
create policy analytics_daily_select on public.analytics_daily for select to authenticated
  using (public.is_editor_or_admin());
create policy analytics_daily_article_select on public.analytics_daily_article for select to authenticated
  using (public.is_editor_or_admin());
create policy analytics_monthly_uniques_select on public.analytics_monthly_uniques for select to authenticated
  using (public.is_editor_or_admin());
create policy rollup_runs_select on public.rollup_runs for select to authenticated
  using (public.is_admin());

-- manual social stats (human data, labeled as such everywhere)
create policy social_stats_select on public.social_stats for select to authenticated
  using (public.is_editor_or_admin());
create policy social_stats_insert on public.social_stats for insert to authenticated
  with check (public.is_editor_or_admin() and entered_by = auth.uid());
create policy social_stats_update_own on public.social_stats for update to authenticated
  using (public.is_admin() or (public.is_editor_or_admin() and entered_by = auth.uid() and created_at > now() - interval '24 hours'))
  with check (public.is_admin() or (public.is_editor_or_admin() and entered_by = auth.uid()));
create policy social_stats_delete on public.social_stats for delete to authenticated
  using (public.is_admin());
