#!/usr/bin/env bash
# Proves that supabase/ALL_MIGRATIONS.sql (the file the owner pastes into the SQL
# editor) builds the same database: resets local Supabase using only that file,
# runs seed.sql, the SQL tests, demo-seed.sql and demo-clear.sql, then restores
# the normal numbered migrations.
set -euo pipefail
cd "$(dirname "$0")/.."
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
tmp=$(mktemp -d)
mv supabase/migrations "$tmp/migrations"
restore() { rm -rf supabase/migrations; mv "$tmp/migrations" supabase/migrations; }
trap restore EXIT
mkdir supabase/migrations
cp supabase/ALL_MIGRATIONS.sql supabase/migrations/20261001000000_all.sql
npx supabase db reset >/dev/null
bash scripts/db-test.sh
if [ -f supabase/demo-seed.sql ]; then
  psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -f supabase/demo-seed.sql
  echo "demo-seed.sql: $(psql "$DB_URL" -X -A -t -c 'select count(*) from articles where is_demo') demo articles"
  psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -f supabase/demo-clear.sql
  echo "demo-clear.sql: $(psql "$DB_URL" -X -A -t -c 'select count(*) from articles where is_demo') demo articles left"
fi
