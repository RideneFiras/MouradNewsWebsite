#!/usr/bin/env bash
# Local only: rebuild the local Supabase database from migrations + seed, load the demo
# content and create the three test users (admin/editor/author, password local-dev-password).
set -euo pipefail
cd "$(dirname "$0")/.."
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
npx supabase db reset
psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -f supabase/demo-seed.sql
pnpm -s dev:users
