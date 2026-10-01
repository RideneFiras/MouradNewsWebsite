#!/usr/bin/env bash
# Lighthouse mobile on the homepage and an article. Needs the app running (pnpm start).
# Usage: bash scripts/lighthouse.sh <label> [baseUrl]
set -euo pipefail
label="${1:-run}"; base="${2:-http://localhost:3000}"
CHROME_PATH="${CHROME_PATH:-$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)}"
export CHROME_PATH
article=$(curl -s "$base/ar/section/cap-bon" | grep -m1 -o '/ar/article/[0-9]*/[^"]*' | head -1 || true)
mkdir -p docs/lighthouse
for target in "home:$base/ar" "article:$base$article"; do
  name="${target%%:*}"; url="${target#*:}"
  npx -y lighthouse@12 "$url" --quiet --chrome-flags="--headless=new --no-sandbox" \
    --only-categories=performance,accessibility,seo,best-practices \
    --output=json --output-path="docs/lighthouse/$label-$name.json" >/dev/null 2>&1 || true
  node -e "const r=require('./docs/lighthouse/$label-$name.json');const c=r.categories;console.log('$name', Object.fromEntries(Object.entries(c).map(([k,v])=>[k,Math.round(v.score*100)])), 'LCP', r.audits['largest-contentful-paint'].displayValue, 'CLS', r.audits['cumulative-layout-shift'].displayValue, 'TBT', r.audits['total-blocking-time'].displayValue)"
done
