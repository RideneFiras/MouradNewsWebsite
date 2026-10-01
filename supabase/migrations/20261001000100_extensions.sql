-- El Borj — 01 extensions
-- Supabase keeps extensions in the "extensions" schema. pg_cron always lives in
-- its own "cron" schema; pg_net creates the "net" schema.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Private schema: never exposed through the Data API (not in the API "exposed schemas").
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
