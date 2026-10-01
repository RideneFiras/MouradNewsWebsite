#!/usr/bin/env bash
# Runs the SQL test suite in supabase/tests against a database where the
# migrations and seed.sql are applied (default: the local Supabase from
# `supabase start` + `supabase db reset`). Each file runs in a transaction that
# is rolled back, so the database is left untouched.
set -euo pipefail
cd "$(dirname "$0")/../supabase/tests"
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
fail=0
for f in [0-9][0-9]_*.test.sql; do
  echo "== $f"
  if ! out=$( { echo 'begin;'; echo '\set ON_ERROR_STOP on'; cat "$f"; echo 'rollback;'; } \
       | sed "s#^\\\\ir 00_setup.sql#\\\\i 00_setup.sql#" \
       | psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 2>&1 ); then
    echo "$out" | grep -E "FAIL|ERROR|ok -" | tail -5
    fail=1
  else
    echo "$out" | grep -c "ok -" | xargs -I{} echo "   {} assertions passed"
  fi
done
exit $fail
