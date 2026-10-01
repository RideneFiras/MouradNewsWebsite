-- El Borj — 19 stored HTML guard (defence in depth)
-- Article and page HTML is rendered from the editor JSON and sanitized on the server
-- when saved. This trigger additionally refuses dangerous markup written by any other
-- path (e.g. someone with an editor account calling the API directly), so the public
-- site can print stored HTML without re-sanitizing it on every render.

create or replace function public.html_is_safe(html text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select html is null or not (
    html ~* '<\s*(script|style|object|embed|form|input|button|textarea|select|link|meta|base|svg|math)\y'
    or html ~* '\son[a-z]+\s*='
    or html ~* '(href|src|srcset)\s*=\s*["'']?\s*(javascript|data|vbscript):'
    or html ~* '<iframe(?![^>]*\ssrc="https://(www\.youtube-nocookie\.com|www\.facebook\.com)/)'
  );
$$;

create or replace function public.html_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.html_is_safe(new.body_html) then
    raise exception 'unsafe_html: body_html contains markup that is not allowed' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger articles_html_guard before insert or update of body_html on public.articles
  for each row execute function public.html_guard();
create trigger pages_html_guard before insert or update of body_html on public.pages
  for each row execute function public.html_guard();
