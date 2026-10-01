#!/usr/bin/env bash
# Lighthouse mobile (default simulated throttling), median of N runs, home + an article.
# Usage: bash scripts/lighthouse-median.sh [baseUrl] [runs]
set -euo pipefail
base="${1:-http://localhost:3000}"; runs="${2:-3}"
CHROME_PATH="${CHROME_PATH:-$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)}"
export CHROME_PATH
article=$(curl -s "$base/ar/section/cap-bon" | grep -m1 -o '/ar/article/[0-9]*/[^"]*' | head -1 || true)
tmp=$(mktemp -d)
for target in "home:$base/ar" "article:$base$article"; do
  name="${target%%:*}"; url="${target#*:}"
  for i in $(seq 1 "$runs"); do
    npx -y lighthouse@12 "$url" --quiet --chrome-flags="--headless=new --no-sandbox" \
      --only-categories=performance,accessibility,seo,best-practices --output=json --output-path="$tmp/$name-$i.json" >/dev/null 2>&1 || true
  done
  node -e "
    const fs=require('fs'); const rs=fs.readdirSync('$tmp').filter(f=>f.startsWith('$name-')).map(f=>JSON.parse(fs.readFileSync('$tmp/'+f)));
    const med=(xs)=>xs.sort((a,b)=>a-b)[Math.floor(xs.length/2)];
    const cat=(k)=>med(rs.map(r=>Math.round(r.categories[k].score*100)));
    const au=(k)=>med(rs.map(r=>r.audits[k].numericValue));
    console.log('$name', 'perf', cat('performance'), 'a11y', cat('accessibility'), 'bp', cat('best-practices'), 'seo', cat('seo'),
      'LCP', (au('largest-contentful-paint')/1000).toFixed(1)+'s', 'FCP', (au('first-contentful-paint')/1000).toFixed(1)+'s', 'TBT', Math.round(au('total-blocking-time'))+'ms', 'CLS', au('cumulative-layout-shift').toFixed(3), '(median of', rs.length+')');
  "
done
rm -rf "$tmp"
