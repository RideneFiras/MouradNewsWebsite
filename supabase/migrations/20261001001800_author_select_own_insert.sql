-- El Borj — 18 authors can read back the article they just created
-- INSERT ... RETURNING checks the SELECT policy against the new row; the helper
-- is_article_author() reads the table and can't see that row yet, so authors' inserts
-- through the API were refused. Check created_by directly first.

drop policy articles_select on public.articles;
create policy articles_select on public.articles for select to anon, authenticated
  using (
    (status = 'published' and published_at <= now())
    or public.is_editor_or_admin()
    or (public.is_staff() and (created_by = (select auth.uid()) or public.is_article_author(id)))
  );
