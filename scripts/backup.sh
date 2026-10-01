#!/usr/bin/env bash
# Database backup (docs/08 "Operations"). The Supabase free plan has no downloadable
# backups, so run this weekly and keep the files somewhere private (not in Git).
#
#   SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres' \
#     bash scripts/backup.sh [output-dir]
#
# Where to find the URL: Supabase dashboard → Connect → "Session pooler" connection string
# (IPv4-friendly). Needs pg_dump 17 (same major version as Supabase's Postgres):
#   macOS: brew install postgresql@17   ·   Ubuntu: apt install postgresql-client-17
# Restore into a fresh project: psql "$NEW_DB_URL" -f <file>.sql
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (see the comment at the top of this script)}"
out="${1:-backups}"
mkdir -p "$out"
stamp=$(date -u +%Y%m%d-%H%M%S)
file="$out/elborj-$stamp.sql.gz"
# Application data only (schemas public, private, auth users) — Supabase-managed schemas
# are recreated by the platform. --no-owner/--no-privileges make the dump portable.
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges --quote-all-identifiers \
  --schema=public --schema=private --schema=auth \
  | gzip -9 > "$file"
echo "Backup written: $file ($(du -h "$file" | cut -f1))"
echo "Media files live in Supabase Storage (bucket 'media'): see docs/DEPLOY.md, 'Backups', to download them."
