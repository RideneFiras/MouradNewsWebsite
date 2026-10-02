#!/usr/bin/env bash
# Build and deploy the Worker without the local development secrets.
# OpenNext copies the values of .env files into the Worker bundle (server side). Wrangler
# secrets override them at runtime, but local dev values must not ship to Cloudflare at
# all, so .env.local is moved aside during the build. Public build-time values come from
# .env.production.local (see docs/DEPLOY.md §2).
set -euo pipefail
cd "$(dirname "$0")/.."

# Public values: .env.production.local on a laptop, environment variables in CI.
if [ -f .env.production.local ]; then
  # Values exported in the shell would win over the file.
  unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SITE_URL
elif [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "Missing .env.production.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SITE_URL). See docs/DEPLOY.md §2." >&2
  exit 1
fi

aside=""
if [ -f .env.local ]; then
  aside="$(mktemp -d)/env.local"
  mv .env.local "$aside"
  trap 'mv "$aside" .env.local' EXIT
fi

# Secrets live in Wrangler secrets only, never in the bundle.
unset SUPABASE_SERVICE_ROLE_KEY REVALIDATE_SECRET TRACKER_HMAC_SECRET

npx opennextjs-cloudflare build
for key in SUPABASE_SERVICE_ROLE_KEY REVALIDATE_SECRET TRACKER_HMAC_SECRET; do
  if grep -q "\"$key\"" .open-next/cloudflare/next-env.mjs; then
    echo "Refusing to deploy: $key was bundled into the Worker." >&2
    exit 1
  fi
done
npx opennextjs-cloudflare deploy
