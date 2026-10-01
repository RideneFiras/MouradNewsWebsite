#!/usr/bin/env bash
# LOCAL DEVELOPMENT ONLY. Fills the local database with ~45 days of simulated reader
# traffic so the statistics screens have something to show (screenshots, UI work).
# It writes raw analytics rows directly as the Postgres superuser, which is exactly what
# production forbids — so it refuses to run against anything but 127.0.0.1/localhost.
#   pnpm dev:traffic          # simulate
#   pnpm dev:traffic --clear  # remove all analytics rows again
set -euo pipefail
cd "$(dirname "$0")/.."
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
case "$DB_URL" in
  *@127.0.0.1:*|*@localhost:*) ;;
  *) echo "Refusing: simulate-traffic only runs against a local database." >&2; exit 1 ;;
esac
if [ "${1:-}" = "--clear" ]; then
  psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -c "truncate public.engagement_raw, public.pageviews_raw, public.analytics_daily, public.analytics_daily_article, public.analytics_monthly_uniques, public.rollup_runs"
  echo "Analytics tables emptied."
  exit 0
fi
psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -f scripts/simulate-traffic.sql
echo "Simulated traffic loaded and rolled up."
